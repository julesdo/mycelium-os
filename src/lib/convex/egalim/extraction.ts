'use node';

import { v } from 'convex/values';
import { getDocumentProxy, extractText, renderPageAsImage } from 'unpdf';
import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import type { ActionCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { decoderTexte, detecterColonnes, parseCsv, type LigneBrute } from './parsers/csv';
import { extraireAvecClaude, type ContenuDocument, type UsageExtraction } from './extracteurClaude';
import { verifierExtraction } from './verification';
import type { DocumentExtrait } from './extractionSchema';
import { CAP_EUR, estimerCout, usageDeLErreur, ErreurAppelClaude } from './cout';

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

/** En plus de la tentative initiale : 3 appels Claude maximum par document. */
const RELANCES_MAX = 2;
const PAGES_PAR_APPEL = 10;
const SEUIL_DECOUPAGE_PAGES = 20;
/** Vise une résolution proche du maximum accepté par Opus 5 (2576 px sur le grand côté) sans le dépasser largement. */
const ECHELLE_RENDU_PDF = 3;
const SEUIL_CARACTERES_COUCHE_TEXTE = 20;

type Nature = 'CSV' | 'PDF' | 'IMAGE' | 'TEXTE';

/**
 * Ce que l'orchestration a réellement besoin de savoir d'un document — et
 * rien de plus. `obtenirDocument` ne renvoie que ces champs : élargir ce type
 * oblige à élargir le validateur de retour en face, ce qui est le geste
 * délibéré recherché.
 */
type DocumentPourExtraction = {
	_id: Id<'invoiceDocuments'>;
	organizationId: Id<'organizations'>;
	batchId: Id<'invoiceBatches'>;
	storageId: Id<'_storage'>;
	filename: string;
	mimeType: string;
};

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
	const mediaType = correspondance?.[1];
	const base64 = correspondance?.[2];
	if (mediaType === undefined || base64 === undefined) {
		throw new Error('Rendu de page PDF dans un format inattendu (pas une data URL base64).');
	}
	return { mediaType, base64 };
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
	document: DocumentPourExtraction,
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

		let doc: DocumentExtrait;
		let usage: UsageExtraction;
		try {
			({ doc, usage } = await extraireAvecClaude({
				contenu: { type: 'images', images: morceau },
				messageRelance
			}));
		} catch (erreur) {
			// L'usage des morceaux DÉJÀ traités doit survivre à l'échec du
			// morceau suivant. Sans ça, un PDF de 40 pages qui casse au
			// cinquième appel perdait quatre appels Opus 5 sur des pages
			// entières rendues en images : jamais comptés, jamais plafonnés.
			const perdu = usageDeLErreur(erreur);
			throw new ErreurAppelClaude(
				erreur instanceof Error ? erreur.message : 'Échec de l’appel à Claude.',
				{
					tokensIn: usageTotal.tokensIn + perdu.tokensIn,
					tokensOut: usageTotal.tokensOut + perdu.tokensOut,
					cacheReadTokens: usageTotal.cacheReadTokens + perdu.cacheReadTokens
				}
			);
		}

		usageTotal.tokensIn += usage.tokensIn;
		usageTotal.tokensOut += usage.tokensOut;
		usageTotal.cacheReadTokens += usage.cacheReadTokens;

		lignes.push(...doc.lignes);
		if (doc.illisible) {
			illisible = true;
			if (doc.raisonIllisible) raisonsIllisibles.push(doc.raisonIllisible);
		}
		// Le DERNIER morceau qui porte un total l'emporte : sur une facture
		// multi-pages, le total HT et les bases de TVA sont imprimés en pied de
		// document, pas en pied de page. Retenir le premier reviendrait à
		// comparer toutes les lignes à un sous-total de page — la vérification
		// échouerait systématiquement et brûlerait les deux relances.
		if (doc.totaux.totalHT !== null) {
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

	// Une ventilation par taux n'a de sens que si TOUTES les lignes portent un
	// taux : sinon la somme des bases ne peut pas retomber sur le total, et on
	// stockerait une ventilation incohérente qui piégerait qui l'utilise.
	if (lignes.some((l) => l.vatRate === undefined)) {
		return { totalHT, basesParTaux: [] };
	}

	const parTaux = new Map<number, number>();
	for (const ligne of lignes) {
		const taux = ligne.vatRate as number;
		parTaux.set(taux, (parTaux.get(taux) ?? 0) + ligne.amountHT);
	}
	return { totalHT, basesParTaux: Array.from(parTaux, ([taux, baseHT]) => ({ taux, baseHT })) };
}

/** CSV/Excel : parseur déterministe, jamais Claude — pas d'incertitude à vérifier, pas de coût. */
async function traiterCsv(
	ctx: ActionCtx,
	document: DocumentPourExtraction,
	buffer: Buffer
): Promise<void> {
	await etape(ctx, document._id, 'Lecture du tableau');
	const resultat = parseCsv(decoderTexte(buffer));

	if (resultat.erreur) {
		await ctx.runMutation(internal.egalim.extractionMutations.marquerEchec, {
			documentId: document._id,
			erreur: resultat.erreur
		});
		return;
	}

	// `parseCsv` n'invente jamais un montant : une ligne dont le montant est
	// illisible atterrit dans `lignesIgnorees` plutôt que d'être devinée. La
	// jeter ici reviendrait à amputer le dénominateur en silence — exactement
	// ce que la conception du parseur cherche à éviter. On la remonte donc à
	// l'opérateur, en gardant le document exploitable.
	let avertissement: string | undefined;
	if (resultat.lignesIgnorees.length > 0) {
		const apercu = resultat.lignesIgnorees.slice(0, 5).join(' | ');
		const reste =
			resultat.lignesIgnorees.length > 5 ? ` (+${resultat.lignesIgnorees.length - 5} autres)` : '';
		avertissement = `${resultat.lignesIgnorees.length} ligne(s) au montant illisible, non comptées : ${apercu}${reste}`;
	}

	const { totalHT, basesParTaux } = agregerLignesBrutes(resultat.lignes);

	await enregistrerDocumentExtrait(ctx, document, {
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
		invoiceNumber: null,
		avertissement
	});
}


/** Lignes insérées par transaction. Bien en deçà du plafond d'écritures de Convex. */
const LIGNES_PAR_TRANCHE = 500;

interface LigneAEnregistrer {
	rawLabel: string;
	amountHT: number;
	quantity?: number;
	unit?: string;
	unitPrice?: number;
	vatRate?: number;
}

/**
 * Enregistre un document extrait, par TRANCHES.
 *
 * Un export comptable annuel porte facilement plus de 10 000 lignes : les
 * insérer d'un bloc franchissait à la fois le plafond d'écritures par
 * transaction et la limite de taille des arguments, et faisait perdre le
 * fichier entier. Le document ne passe à DONE qu'après la dernière tranche,
 * donc un échec en cours laisse un document PENDING, pas un document
 * faussement complet.
 */
async function enregistrerDocumentExtrait(
	ctx: ActionCtx,
	document: DocumentPourExtraction,
	donnees: {
		lignes: LigneAEnregistrer[];
		totalHT: number | null;
		basesParTaux: Array<{ taux: number; baseHT: number }>;
		invoiceDate: string | null;
		invoiceNumber: string | null;
		supplierName?: string | null;
		avertissement?: string;
	}
): Promise<void> {
	const ouverture = await ctx.runMutation(
		internal.egalim.extractionMutations.ouvrirEnregistrement,
		{
			documentId: document._id,
			organizationId: document.organizationId,
			invoiceDate: donnees.invoiceDate,
			invoiceNumber: donnees.invoiceNumber,
			totalHT: donnees.totalHT,
			supplierName: donnees.supplierName
		}
	);
	if (!ouverture) return;

	// CETTE FACTURE A DÉJÀ ÉTÉ LUE. On s'arrête ici, avant la première ligne :
	// un doublon n'a AUCUNE ligne en base, et c'est ce qui garantit qu'aucun
	// calcul — aujourd'hui, ni dans deux ans quand on ajoutera un rapport — n'a
	// à penser à l'exclure. Une exclusion qu'il faut se rappeler d'écrire est
	// une exclusion qu'on oubliera quelque part.
	if (ouverture.doublonDe) {
		await ctx.runMutation(internal.egalim.extractionMutations.marquerDoublon, {
			documentId: document._id,
			doublonDe: ouverture.doublonDe,
			supplierId: ouverture.supplierId,
			invoiceDate: donnees.invoiceDate,
			invoiceNumber: donnees.invoiceNumber,
			totalHT: donnees.totalHT
		});
		return;
	}

	for (let debut = 0; debut < donnees.lignes.length; debut += LIGNES_PAR_TRANCHE) {
		await ctx.runMutation(internal.egalim.extractionMutations.enregistrerLignes, {
			documentId: document._id,
			organizationId: document.organizationId,
			batchId: document.batchId,
			lignes: donnees.lignes.slice(debut, debut + LIGNES_PAR_TRANCHE),
			invoiceDate: ouverture.invoiceDate,
			supplierId: ouverture.supplierId ?? undefined
		});
	}

	await ctx.runMutation(internal.egalim.extractionMutations.cloturerDocument, {
		documentId: document._id,
		supplierId: ouverture.supplierId,
		totalHT: donnees.totalHT,
		basesParTaux: donnees.basesParTaux,
		invoiceDate: donnees.invoiceDate,
		invoiceNumber: donnees.invoiceNumber,
		linesCount: donnees.lignes.length,
		avertissement: donnees.avertissement
	});
}

/**
 * Publie une étape à l'écran, sans jamais faire échouer l'extraction.
 *
 * L'affichage est secondaire par construction : si cette écriture échoue, la
 * lecture du document continue. L'inverse — une facture perdue parce qu'un
 * libellé d'étape n'a pas pu s'écrire — serait absurde.
 */
async function etape(
	ctx: ActionCtx,
	documentId: Id<'invoiceDocuments'>,
	texte: string
): Promise<void> {
	try {
		await ctx.runMutation(internal.egalim.extractionMutations.noterEtape, {
			documentId,
			etape: texte
		});
	} catch {
		/* l'affichage n'interrompt rien */
	}
}

/** PDF / image / photo / texte brut : Claude, avec vérification et jusqu'à 2 relances. */
async function traiterAvecClaude(
	ctx: ActionCtx,
	document: DocumentPourExtraction,
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

	await etape(ctx, document._id, 'Préparation du fichier');
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

		await etape(
			ctx,
			document._id,
			tentative === 0
				? "Lecture de la facture par l'IA"
				: `Relecture des lignes douteuses (passe ${tentative + 1})`
		);

		let resultat: { doc: DocumentExtrait; usage: UsageExtraction };
		try {
			resultat = await extraireDocumentAvecClaude(contenu, messageRelance);
		} catch (erreur) {
			// Un appel émis est facturé, même si sa réponse est inexploitable.
			// On le compte avant de renoncer, sans quoi le plafond ne se
			// déclencherait jamais sur le chemin d'échec.
			const perdu = usageDeLErreur(erreur);
			if (perdu.tokensIn > 0 || perdu.tokensOut > 0) {
				await ctx.runMutation(internal.egalim.extractionMutations.accumulerCout, {
					jobId: job._id,
					tokensIn: perdu.tokensIn,
					tokensOut: perdu.tokensOut,
					cacheReadTokens: perdu.cacheReadTokens,
					coutEur: estimerCout(perdu),
					capEur: CAP_EUR
				});
			}
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

		await etape(ctx, document._id, `Vérification des totaux — ${resultat.doc.lignes.length} lignes lues`);
		const verif = verifierExtraction(resultat.doc);
		if (verif.ok) {
			await enregistrerDocumentExtrait(ctx, document, {
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
				invoiceNumber: resultat.doc.invoiceNumber,
				supplierName: resultat.doc.supplierName
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

		// Réussite comme échec, le lot avance : deux fichiers illisibles sur
		// quarante ne doivent pas empêcher le diagnostic sur les trente-huit
		// autres.
		await ctx.runMutation(internal.egalim.extractionMutations.enchainerSiLotTermine, {
			batchId: document.batchId
		});
		return null;
	}
});
