import { v } from 'convex/values';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { vFamille, vLabel } from './tables';

/**
 * Le catalogue des produits achetés, et le moyen de revenir sur une décision.
 *
 * LE MANQUE QUE CE FICHIER COMBLE. Jusqu'ici, un produit ne se voyait qu'une
 * fois : dans la file de confirmation. Une fois confirmé, il disparaissait de
 * l'interface — alors qu'il continue de peser sur les trois taux toute
 * l'année. Un gérant qui se rendait compte en juin qu'il avait validé un
 * emmental « hors barème » alors qu'il est AOP n'avait aucun chemin pour le
 * corriger. C'est un défaut d'auditabilité autant que d'ergonomie : une mesure
 * qu'on ne peut pas reprendre n'est pas défendable, elle est subie.
 *
 * BORNÉ À UN EXERCICE, TOUJOURS. Toutes les lectures passent par
 * `by_org_and_date` sur une plage d'un an. Une cantine achète ~3 000 lignes par
 * an ; sans cette borne, la cinquième année de factures cumulées ferait franchir
 * le plafond de lectures de Convex et l'écran se mettrait à échouer sur une
 * erreur technique illisible pour le gérant. C'est aussi la bonne sémantique :
 * EGalim se déclare par année civile, et un produit se juge dans son exercice.
 */

const vProduit = v.object({
	normalizedLabel: v.string(),
	rawLabelExemple: v.string(),
	occurrences: v.number(),
	montantHT: v.number(),
	isFood: v.union(v.boolean(), v.null()),
	family: v.union(vFamille, v.null()),
	qualifyingLabels: v.array(vLabel),
	justification: v.string(),
	confidence: v.union(v.number(), v.null()),
	reviewStatus: v.union(
		v.literal('AUTO'),
		v.literal('PENDING_REVIEW'),
		v.literal('CONFIRMED'),
		v.literal('CORRECTED')
	),
	/** Un document qui porte ce libellé : la preuve à ouvrir. */
	documentId: v.union(v.id('invoiceDocuments'), v.null())
});

/** Le plafond de résultats rendus. Au-delà, on affine la recherche. */
const MAX_RESULTATS = 200;

/**
 * Réduit un libellé à sa forme comparable : majuscules, sans accent.
 *
 * Volontairement plus permissif que `normalisation.ts`, qui sert à FUSIONNER
 * deux écritures d'un même produit et doit donc être prudent. Ici on ne fusionne
 * rien, on cherche : « crème » doit trouver « CREME FRAICHE », et rater une
 * correspondance coûte plus cher qu'en proposer une de trop.
 */
function comparable(texte: string): string {
	return texte
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toUpperCase();
}

function bornesAnnee(annee: string): { debut: string; fin: string } {
	return { debut: `${annee}-01-01`, fin: `${annee}-12-31` };
}

/**
 * Les produits achetés sur un exercice, du plus lourd au plus léger.
 *
 * L'ordre est celui du montant, comme dans la file de confirmation et pour la
 * même raison : c'est ce qui pèse sur le taux qui mérite d'être regardé, pas ce
 * qui revient le plus souvent.
 */
export const listerProduits = authedQuery({
	args: {
		annee: v.string(),
		recherche: v.optional(v.string()),
		/** Ne garder que ce qui n'est pas encore passé devant le gérant. */
		seulementNonConfirmes: v.optional(v.boolean())
	},
	returns: v.object({
		produits: v.array(vProduit),
		total: v.number(),
		tronque: v.boolean(),
		montantTotalHT: v.number()
	}),
	handler: async (ctx, { annee, recherche, seulementNonConfirmes }) => {
		const { organizationId } = await getUserOrg(ctx);
		const { debut, fin } = bornesAnnee(annee);

		const lignes = await ctx.db
			.query('invoiceLines')
			.withIndex('by_org_and_date', (q) =>
				q.eq('organizationId', organizationId).gte('invoiceDate', debut).lte('invoiceDate', fin)
			)
			.collect();

		const groupes = new Map<
			string,
			{
				rawLabelExemple: string;
				occurrences: number;
				montantHT: number;
				ligne: (typeof lignes)[number];
			}
		>();

		for (const ligne of lignes) {
			const existant = groupes.get(ligne.normalizedLabel);
			if (existant) {
				existant.occurrences += 1;
				existant.montantHT += ligne.amountHT;
				// La ligne retenue est celle qui PORTE une classification, à défaut
				// la première vue. Sans ça, une occurrence non classée d'un produit
				// par ailleurs tranché ferait afficher « non classé » sur la carte.
				if (existant.ligne.family === undefined && ligne.family !== undefined) {
					existant.ligne = ligne;
				}
			} else {
				groupes.set(ligne.normalizedLabel, {
					rawLabelExemple: ligne.rawLabel,
					occurrences: 1,
					montantHT: ligne.amountHT,
					ligne
				});
			}
		}

		const terme = recherche ? comparable(recherche.trim()) : '';

		let produits = [...groupes.entries()]
			.filter(([normalizedLabel, g]) => {
				if (
					seulementNonConfirmes &&
					(g.ligne.reviewStatus === 'CONFIRMED' || g.ligne.reviewStatus === 'CORRECTED')
				) {
					return false;
				}
				if (terme === '') return true;
				return (
					comparable(normalizedLabel).includes(terme) ||
					comparable(g.rawLabelExemple).includes(terme)
				);
			})
			.map(([normalizedLabel, g]) => ({
				normalizedLabel,
				rawLabelExemple: g.rawLabelExemple,
				occurrences: g.occurrences,
				montantHT: g.montantHT,
				isFood: g.ligne.isFood ?? null,
				family: g.ligne.family ?? null,
				qualifyingLabels: g.ligne.qualifyingLabels ?? [],
				justification: g.ligne.justification ?? '',
				confidence: g.ligne.confidence ?? null,
				reviewStatus: g.ligne.reviewStatus,
				documentId: g.ligne.documentId
			}))
			.sort((a, b) => Math.abs(b.montantHT) - Math.abs(a.montantHT));

		const total = produits.length;
		const montantTotalHT = produits.reduce((s, p) => s + p.montantHT, 0);
		const tronque = total > MAX_RESULTATS;
		if (tronque) produits = produits.slice(0, MAX_RESULTATS);

		return { produits, total, tronque, montantTotalHT };
	}
});

/**
 * Le détail d'un produit : chaque ligne de facture qui le porte.
 *
 * C'est l'écran de preuve. Un gérant qui hésite sur une classification veut
 * voir ce qu'il a réellement acheté, quand, à qui, et pour combien — pas la
 * moyenne. Les lignes sont rendues avec le nom de leur fichier source, pour
 * qu'il puisse remonter à la facture d'un doigt.
 */
export const obtenirProduit = authedQuery({
	args: { normalizedLabel: v.string(), annee: v.string() },
	returns: v.union(
		v.object({
			produit: vProduit,
			lignes: v.array(
				v.object({
					ligneId: v.id('invoiceLines'),
					rawLabel: v.string(),
					invoiceDate: v.string(),
					amountHT: v.number(),
					quantity: v.union(v.number(), v.null()),
					unit: v.union(v.string(), v.null()),
					documentId: v.union(v.id('invoiceDocuments'), v.null()),
					filename: v.union(v.string(), v.null()),
					supplierName: v.union(v.string(), v.null())
				})
			)
		}),
		v.null()
	),
	handler: async (ctx, { normalizedLabel, annee }) => {
		const { organizationId } = await getUserOrg(ctx);
		const { debut, fin } = bornesAnnee(annee);

		// L'index par libellé n'est pas borné par date : on filtre l'exercice
		// après coup. C'est le bon compromis — un libellé donné pèse quelques
		// dizaines de lignes, là où l'exercice entier en pèse trois mille.
		const toutes = await ctx.db
			.query('invoiceLines')
			.withIndex('by_org_and_label', (q) =>
				q.eq('organizationId', organizationId).eq('normalizedLabel', normalizedLabel)
			)
			.collect();

		const lignes = toutes
			.filter((l) => l.invoiceDate >= debut && l.invoiceDate <= fin)
			.sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate));

		if (lignes.length === 0) return null;

		// La ligne de référence pour la classification : celle qui en porte une.
		const reference = lignes.find((l) => l.family !== undefined) ?? lignes[0]!;

		// Les fichiers et fournisseurs, résolus une seule fois chacun : sans ce
		// cache, un produit vu quarante fois sur la même facture relirait
		// quarante fois le même document.
		const fichiers = new Map<string, string | null>();
		const fournisseurs = new Map<string, string | null>();

		const detail = [];
		for (const l of lignes) {
			if (!fichiers.has(l.documentId)) {
				const doc = await ctx.db.get(l.documentId);
				fichiers.set(l.documentId, doc?.filename ?? null);
			}
			if (l.supplierId && !fournisseurs.has(l.supplierId)) {
				const f = await ctx.db.get(l.supplierId);
				fournisseurs.set(l.supplierId, f?.name ?? null);
			}
			detail.push({
				ligneId: l._id,
				rawLabel: l.rawLabel,
				invoiceDate: l.invoiceDate,
				amountHT: l.amountHT,
				quantity: l.quantity ?? null,
				unit: l.unit ?? null,
				documentId: l.documentId,
				filename: fichiers.get(l.documentId) ?? null,
				supplierName: l.supplierId ? (fournisseurs.get(l.supplierId) ?? null) : null
			});
		}

		return {
			produit: {
				normalizedLabel,
				rawLabelExemple: reference.rawLabel,
				occurrences: lignes.length,
				montantHT: lignes.reduce((s, l) => s + l.amountHT, 0),
				isFood: reference.isFood ?? null,
				family: reference.family ?? null,
				qualifyingLabels: reference.qualifyingLabels ?? [],
				justification: reference.justification ?? '',
				confidence: reference.confidence ?? null,
				reviewStatus: reference.reviewStatus,
				documentId: reference.documentId
			},
			lignes: detail
		};
	}
});

/**
 * Le détail d'une facture : ses lignes, telles qu'elles ont été extraites.
 *
 * L'autre moitié du « voir le détail » : on peut partir d'un produit et
 * remonter aux factures, ou partir d'une facture et descendre à ses lignes.
 * C'est aussi le seul écran qui permet de vérifier une extraction — de
 * constater que la ligne « REMISE -10% » a bien été lue en négatif, par
 * exemple, ce qu'aucun taux ne dira jamais tout seul.
 */
export const obtenirFacture = authedQuery({
	args: { documentId: v.id('invoiceDocuments') },
	returns: v.union(
		v.object({
			filename: v.string(),
			mimeType: v.string(),
			url: v.union(v.string(), v.null()),
			invoiceNumber: v.union(v.string(), v.null()),
			invoiceDate: v.union(v.string(), v.null()),
			supplierName: v.union(v.string(), v.null()),
			totalHT: v.union(v.number(), v.null()),
			extractionStatus: v.union(v.literal('PENDING'), v.literal('DONE'), v.literal('FAILED')),
			extractionError: v.union(v.string(), v.null()),
			lignes: v.array(
				v.object({
					ligneId: v.id('invoiceLines'),
					rawLabel: v.string(),
					normalizedLabel: v.string(),
					amountHT: v.number(),
					quantity: v.union(v.number(), v.null()),
					unit: v.union(v.string(), v.null()),
					isFood: v.union(v.boolean(), v.null()),
					family: v.union(vFamille, v.null()),
					qualifyingLabels: v.array(vLabel),
					justification: v.string(),
					reviewStatus: v.union(
						v.literal('AUTO'),
						v.literal('PENDING_REVIEW'),
						v.literal('CONFIRMED'),
						v.literal('CORRECTED')
					)
				})
			)
		}),
		v.null()
	),
	handler: async (ctx, { documentId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const doc = await ctx.db.get(documentId);
		// Le cloisonnement est vérifié AVANT toute lecture de ligne : un
		// identifiant deviné ne doit pas révéler l'existence du document.
		if (!doc || doc.organizationId !== organizationId) return null;

		const lignes = await ctx.db
			.query('invoiceLines')
			.withIndex('by_batch', (q) => q.eq('batchId', doc.batchId))
			.collect();

		const supplier = doc.supplierId ? await ctx.db.get(doc.supplierId) : null;

		return {
			filename: doc.filename,
			mimeType: doc.mimeType,
			url: await ctx.storage.getUrl(doc.storageId),
			invoiceNumber: doc.invoiceNumber ?? null,
			invoiceDate: doc.invoiceDate ?? null,
			supplierName: supplier?.name ?? null,
			totalHT: doc.totalHT ?? null,
			extractionStatus: doc.extractionStatus,
			extractionError: doc.extractionError ?? null,
			lignes: lignes
				.filter((l) => l.documentId === documentId)
				.map((l) => ({
					ligneId: l._id,
					rawLabel: l.rawLabel,
					normalizedLabel: l.normalizedLabel,
					amountHT: l.amountHT,
					quantity: l.quantity ?? null,
					unit: l.unit ?? null,
					isFood: l.isFood ?? null,
					family: l.family ?? null,
					qualifyingLabels: l.qualifyingLabels ?? [],
					justification: l.justification ?? '',
					reviewStatus: l.reviewStatus
				}))
		};
	}
});

/** Les factures d'un exercice, avec leur état de lecture. */
export const listerFactures = authedQuery({
	args: { annee: v.string() },
	returns: v.array(
		v.object({
			documentId: v.id('invoiceDocuments'),
			filename: v.string(),
			invoiceDate: v.union(v.string(), v.null()),
			invoiceNumber: v.union(v.string(), v.null()),
			supplierName: v.union(v.string(), v.null()),
			totalHT: v.union(v.number(), v.null()),
			linesCount: v.number(),
			extractionStatus: v.union(v.literal('PENDING'), v.literal('DONE'), v.literal('FAILED')),
			extractionError: v.union(v.string(), v.null())
		})
	),
	handler: async (ctx, { annee }) => {
		const { organizationId } = await getUserOrg(ctx);

		const documents = await ctx.db
			.query('invoiceDocuments')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const fournisseurs = new Map<string, string | null>();
		const resultats = [];

		for (const d of documents) {
			// Un document dont la date est encore inconnue — extraction en cours,
			// ou échouée — reste visible sur l'exercice courant : c'est justement
			// celui sur lequel le gérant a besoin d'agir.
			if (d.invoiceDate && !d.invoiceDate.startsWith(annee)) continue;

			if (d.supplierId && !fournisseurs.has(d.supplierId)) {
				const f = await ctx.db.get(d.supplierId);
				fournisseurs.set(d.supplierId, f?.name ?? null);
			}

			resultats.push({
				documentId: d._id,
				filename: d.filename,
				invoiceDate: d.invoiceDate ?? null,
				invoiceNumber: d.invoiceNumber ?? null,
				supplierName: d.supplierId ? (fournisseurs.get(d.supplierId) ?? null) : null,
				totalHT: d.totalHT ?? null,
				linesCount: d.linesCount,
				extractionStatus: d.extractionStatus,
				extractionError: d.extractionError ?? null
			});
		}

		return resultats.sort((a, b) => (b.invoiceDate ?? '').localeCompare(a.invoiceDate ?? ''));
	}
});

