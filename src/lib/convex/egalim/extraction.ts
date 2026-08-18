'use node';

import { v } from 'convex/values';
import { getDocumentProxy, extractText, renderPageAsImage } from 'unpdf';
import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import type { ActionCtx } from '../_generated/server';
import type { Doc } from '../_generated/dataModel';
import { decoderTexte, detecterColonnes, parseCsv, type LigneBrute } from './parsers/csv';
import { extraireAvecClaude, type ContenuDocument, type UsageExtraction } from './extracteurClaude';
import { verifierExtraction } from './verification';
import type { DocumentExtrait } from './extractionSchema';

/**
 * L'orchestration d'extraction — un document, un chemin déterministe (CSV)
 * ou probabiliste (Claude), jamais les deux. Un document qui échoue ne doit
 * jamais bloquer le lot : chaque sortie d'erreur passe par `marquerEchec`,
 * jamais par une exception qui remonterait à l'appelant.
 *
 * "use node" parce que le rendu PDF (`unpdf`, via `@napi-rs/canvas`) exige le
 * runtime Node — jamais dans un fichier qui exporte aussi des query/mutation
 * (voir `extractionMutations.ts`, qui vit à côté sans cette directive).
 */

const CAP_EUR = 10;
/** En plus de la tentative initiale : 3 appels Claude maximum par document. */
const RELANCES_MAX = 2;
const PAGES_PAR_APPEL = 10;
const SEUIL_DECOUPAGE_PAGES = 20;
/** Vise une résolution proche du maximum accepté par Opus 5 (2576 px sur le grand côté) sans le dépasser largement. */
const ECHELLE_RENDU_PDF = 3;
const SEUIL_CARACTERES_COUCHE_TEXTE = 20;

// Prix Opus 5 (liste), en dollars ; traités comme des euros dans `costEur` —
// c'est un budget indicatif de pilotage, pas une facture, donc pas de
// conversion de change ici.
const PRIX_INPUT_PAR_TOKEN = 5 / 1_000_000;
const PRIX_OUTPUT_PAR_TOKEN = 25 / 1_000_000;
const FACTEUR_CACHE = 0.1;

function estimerCout(usage: UsageExtraction): number {
	return (
		usage.tokensIn * PRIX_INPUT_PAR_TOKEN +
		usage.cacheReadTokens * PRIX_INPUT_PAR_TOKEN * FACTEUR_CACHE +
		usage.tokensOut * PRIX_OUTPUT_PAR_TOKEN
	);
}

type Nature = 'CSV' | 'PDF' | 'IMAGE' | 'TEXTE';

const EXTENSIONS_IMAGE = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp']);

function extension(filename: string): string {
	const point = filename.lastIndexOf('.');
	return point === -1 ? '' : filename.slice(point + 1).toLowerCase();
}

/** Un `.txt` peut être un export CSV comme un texte OCR brut : on ne devine jamais, on sniffe. */
function ressembleACsv(texte: string): boolean {
	const premiereLigne = texte.split(/\r\n|\r|\n/).find((l) => l.trim() !== '');
	if (premiereLigne === undefined) return false;
	for (const separateur of [';', ',', '\t'] as const) {
		const entetes = premiereLigne.split(separateur).map((h) => h.trim());
		if (entetes.length < 2) continue;
		const mapping = detecterColonnes(entetes);
		if (mapping.label !== null && mapping.amountHT !== null) return true;
	}
	return false;
}

/** Détermine la nature du document à partir de l'extension ET du contenu — jamais de l'extension seule. */
function determinerNature(filename: string, mimeType: string, buffer: Buffer): Nature {
	const ext = extension(filename);
	if (mimeType.startsWith('image/') || EXTENSIONS_IMAGE.has(ext)) return 'IMAGE';
	if (mimeType === 'application/pdf' || ext === 'pdf') return 'PDF';
	const texte = decoderTexte(buffer);
	return ressembleACsv(texte) ? 'CSV' : 'TEXTE';
}

function mediaTypeImage(filename: string, mimeType: string): string {
	if (mimeType.startsWith('image/')) return mimeType;
	switch (extension(filename)) {
		case 'jpg':
		case 'jpeg':
			return 'image/jpeg';
		case 'gif':
			return 'image/gif';
		case 'webp':
			return 'image/webp';
		default:
			return 'image/png';
	}
}

function depuisDataUrl(dataUrl: string): { mediaType: string; base64: string } {
	const correspondance = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl);
	if (!correspondance) {
		throw new Error('Rendu de page PDF dans un format inattendu (pas une data URL base64).');
	}
	return { mediaType: correspondance[1], base64: correspondance[2] };
}

/** PDF avec couche texte → texte. PDF scanné → une image par page (haute résolution, jamais réduite). */
async function construireContenuPdf(buffer: Buffer): Promise<ContenuDocument> {
	const pdf = await getDocumentProxy(buffer);
	const { text } = await extractText(pdf, { mergePages: true });

	if (text.trim().length >= SEUIL_CARACTERES_COUCHE_TEXTE) {
		return { type: 'texte', texte: text };
	}

	const images: Array<{ mediaType: string; base64: string }> = [];
	for (let page = 1; page <= pdf.numPages; page++) {
		const dataUrl = await renderPageAsImage(pdf, page, {
			scale: ECHELLE_RENDU_PDF,
			toDataURL: true
		});
		images.push(depuisDataUrl(dataUrl));
	}
	return { type: 'images', images };
}

async function construireContenu(
	nature: Exclude<Nature, 'CSV'>,
	document: Doc<'invoiceDocuments'>,
	buffer: Buffer
): Promise<ContenuDocument> {
	switch (nature) {
		case 'PDF':
			return construireContenuPdf(buffer);
		case 'IMAGE':
			return {
				type: 'images',
				images: [
					{
						mediaType: mediaTypeImage(document.filename, document.mimeType),
						base64: buffer.toString('base64')
					}
				]
			};
		case 'TEXTE':
			return { type: 'texte', texte: decoderTexte(buffer) };
	}
}

/**
 * Un document de plus de 20 pages est découpé en appels de 10 pages, les
 * lignes concaténées. Les totaux imprimés n'apparaissent en général que sur
 * un des morceaux (le premier qui en porte l'emporte) ; illisible si l'un
 * des morceaux l'est.
 */
async function extraireDocumentAvecClaude(
	contenu: ContenuDocument,
	messageRelance: string | undefined
): Promise<{ doc: DocumentExtrait; usage: UsageExtraction }> {
	if (contenu.type !== 'images' || contenu.images.length <= SEUIL_DECOUPAGE_PAGES) {
		return extraireAvecClaude({ contenu, messageRelance });
	}

	const lignes: DocumentExtrait['lignes'] = [];
	let totaux: DocumentExtrait['totaux'] = { totalHT: null, basesParTaux: [] };
	let illisible = false;
	const raisonsIllisibles: string[] = [];
	let supplierName: string | null = null;
	let invoiceNumber: string | null = null;
	let invoiceDate: string | null = null;
	const usageTotal: UsageExtraction = { tokensIn: 0, tokensOut: 0, cacheReadTokens: 0 };

	for (let debut = 0; debut < contenu.images.length; debut += PAGES_PAR_APPEL) {
		const morceau = contenu.images.slice(debut, debut + PAGES_PAR_APPEL);
		const { doc, usage } = await extraireAvecClaude({
			contenu: { type: 'images', images: morceau },
			messageRelance
		});

		usageTotal.tokensIn += usage.tokensIn;
		usageTotal.tokensOut += usage.tokensOut;
		usageTotal.cacheReadTokens += usage.cacheReadTokens;

		lignes.push(...doc.lignes);
		if (doc.illisible) {
			illisible = true;
			if (doc.raisonIllisible) raisonsIllisibles.push(doc.raisonIllisible);
		}
		if (doc.totaux.totalHT !== null && totaux.totalHT === null) {
			totaux = doc.totaux;
		}
		supplierName ??= doc.supplierName;
		invoiceNumber ??= doc.invoiceNumber;
		invoiceDate ??= doc.invoiceDate;
	}

	return {
		doc: {
			supplierName,
			invoiceNumber,
			invoiceDate,
			lignes,
			totaux,
			illisible,
			raisonIllisible: raisonsIllisibles.length > 0 ? raisonsIllisibles.join(' ') : null
		},
		usage: usageTotal
	};
}

function agregerLignesBrutes(lignes: readonly LigneBrute[]): {
	totalHT: number;
	basesParTaux: Array<{ taux: number; baseHT: number }>;
} {
	const totalHT = lignes.reduce((s, l) => s + l.amountHT, 0);
	const parTaux = new Map<number, number>();
	for (const ligne of lignes) {
		if (ligne.vatRate === undefined) continue;
		parTaux.set(ligne.vatRate, (parTaux.get(ligne.vatRate) ?? 0) + ligne.amountHT);
	}
	return { totalHT, basesParTaux: Array.from(parTaux, ([taux, baseHT]) => ({ taux, baseHT })) };
}

/** CSV/Excel : parseur déterministe, jamais Claude — pas d'incertitude à vérifier, pas de coût. */
async function traiterCsv(
	ctx: ActionCtx,
	document: Doc<'invoiceDocuments'>,
	buffer: Buffer
): Promise<void> {
	const resultat = parseCsv(decoderTexte(buffer));

	if (resultat.erreur) {
		await ctx.runMutation(internal.egalim.extractionMutations.marquerEchec, {
			documentId: document._id,
			erreur: resultat.erreur
		});
		return;
	}

	const { totalHT, basesParTaux } = agregerLignesBrutes(resultat.lignes);

	await ctx.runMutation(internal.egalim.extractionMutations.marquerReussite, {
		documentId: document._id,
		organizationId: document.organizationId,
		batchId: document.batchId,
		lignes: resultat.lignes.map((l) => ({
			// La mention de label d'une colonne dédiée rejoint le libellé, comme
			// pour une ligne de continuation côté Claude — même sort en aval.
			rawLabel: l.labelMention ? `${l.rawLabel} (${l.labelMention})` : l.rawLabel,
			amountHT: l.amountHT,
			quantity: l.quantity,
			unit: l.unit,
			unitPrice: l.unitPrice,
			vatRate: l.vatRate
		})),
		totalHT,
		basesParTaux,
		invoiceDate: null,
		invoiceNumber: null
	});
}

/** PDF / image / photo / texte brut : Claude, avec vérification et jusqu'à 2 relances. */
async function traiterAvecClaude(
	ctx: ActionCtx,
	document: Doc<'invoiceDocuments'>,
	nature: Exclude<Nature, 'CSV'>,
	buffer: Buffer
): Promise<void> {
	const job = await ctx.runMutation(internal.egalim.extractionMutations.obtenirOuCreerJob, {
		organizationId: document.organizationId,
		batchId: document.batchId
	});

	if (job.status === 'CAPPED') {
		await ctx.runMutation(internal.egalim.extractionMutations.marquerEchec, {
			documentId: document._id,
			erreur: `Budget de traitement du lot atteint (${CAP_EUR} €) — extraction interrompue.`
		});
		return;
	}

	const contenu = await construireContenu(nature, document, buffer);

	let messageRelance: string | undefined;
	let dernierMessage = 'Extraction non vérifiable après plusieurs tentatives.';

	for (let tentative = 0; tentative <= RELANCES_MAX; tentative++) {
		// Un document voisin du même lot a pu faire basculer le job en CAPPED
		// entre-temps : on revérifie avant chaque appel, pas seulement au début.
		const jobActuel = await ctx.runQuery(internal.egalim.extractionMutations.obtenirJob, {
			jobId: job._id
		});
		if (jobActuel?.status === 'CAPPED') {
			await ctx.runMutation(internal.egalim.extractionMutations.marquerEchec, {
				documentId: document._id,
				erreur: `Budget de traitement du lot atteint (${CAP_EUR} €) — extraction interrompue.`
			});
			return;
		}

		let resultat: { doc: DocumentExtrait; usage: UsageExtraction };
		try {
			resultat = await extraireDocumentAvecClaude(contenu, messageRelance);
		} catch (erreur) {
			dernierMessage = erreur instanceof Error ? erreur.message : 'Échec de l’appel à Claude.';
			break;
		}

		const capAtteint = await ctx.runMutation(internal.egalim.extractionMutations.accumulerCout, {
			jobId: job._id,
			tokensIn: resultat.usage.tokensIn,
			tokensOut: resultat.usage.tokensOut,
			cacheReadTokens: resultat.usage.cacheReadTokens,
			coutEur: estimerCout(resultat.usage),
			capEur: CAP_EUR
		});

		const verif = verifierExtraction(resultat.doc);
		if (verif.ok) {
			await ctx.runMutation(internal.egalim.extractionMutations.marquerReussite, {
				documentId: document._id,
				organizationId: document.organizationId,
				batchId: document.batchId,
				lignes: resultat.doc.lignes.map((l) => ({
					rawLabel: l.rawLabel,
					amountHT: l.amountHT,
					quantity: l.quantity ?? undefined,
					unit: l.unit ?? undefined,
					unitPrice: l.unitPrice ?? undefined,
					vatRate: l.vatRate ?? undefined
				})),
				totalHT: resultat.doc.totaux.totalHT,
				basesParTaux: resultat.doc.totaux.basesParTaux,
				invoiceDate: resultat.doc.invoiceDate,
				invoiceNumber: resultat.doc.invoiceNumber
			});
			return;
		}

		dernierMessage = capAtteint
			? `Budget de traitement du lot atteint (${CAP_EUR} €) après cette tentative.`
			: verif.ecarts.map((e) => e.detail).join(' ');
		messageRelance = verif.messageRelance;

		// Le plafond vient d'être franchi : inutile de retenter, l'écart ne
		// grossira pas moins pour un document pathologique.
		if (capAtteint) break;
	}

	await ctx.runMutation(internal.egalim.extractionMutations.marquerEchec, {
		documentId: document._id,
		erreur: dernierMessage
	});
}

export const traiterDocument = internalAction({
	args: { documentId: v.id('invoiceDocuments') },
	returns: v.null(),
	handler: async (ctx, { documentId }) => {
		const document = await ctx.runQuery(internal.egalim.extractionMutations.obtenirDocument, {
			documentId
		});
		if (!document) return null;

		try {
			const blob = await ctx.storage.get(document.storageId);
			if (!blob) {
				await ctx.runMutation(internal.egalim.extractionMutations.marquerEchec, {
					documentId,
					erreur: 'Fichier introuvable dans le stockage Convex.'
				});
				return null;
			}
			const buffer = Buffer.from(await blob.arrayBuffer());
			const nature = determinerNature(document.filename, document.mimeType, buffer);

			if (nature === 'CSV') {
				await traiterCsv(ctx, document, buffer);
			} else {
				await traiterAvecClaude(ctx, document, nature, buffer);
			}
		} catch (erreur) {
			// Non négociable : un document qui échoue ne bloque jamais le lot.
			// Tout est capturé ici plutôt que de laisser l'action lever.
			await ctx.runMutation(internal.egalim.extractionMutations.marquerEchec, {
				documentId,
				erreur: erreur instanceof Error ? erreur.message : 'Erreur inattendue pendant l’extraction.'
			});
		}
		return null;
	}
});
