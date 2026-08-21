import { v, ConvexError } from 'convex/values';
import { authedQuery, authedMutation } from '../functions';
import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { getUserOrg } from '../lib/auth';
import { REFERENTIEL_VERSION } from '../../egalim/referentiel';
import type { Famille, Label } from '../../egalim/types';
import { deriverVerdict, motifRevue } from './verdict';
import { vFamille, vLabel } from './tables';

/**
 * La file de confirmation du gérant.
 *
 * Elle travaille par LIBELLÉ distinct, jamais par ligne ni par facture. Une
 * cantine achète les mêmes 300 à 500 produits toute l'année : confirmer par
 * facture ferait revoir le même cabillaud quarante fois. Une décision règle
 * toutes les occurrences du libellé chez ce client, et fait avancer le
 * consensus pour tous les autres.
 */

const vMotif = v.union(
	v.literal('NON_CLASSE'),
	v.literal('VIANDE_POISSON'),
	v.literal('REGULARISATION'),
	v.literal('CONFIANCE_BASSE')
);

const vProposition = v.object({
	isFood: v.boolean(),
	family: vFamille,
	qualifyingLabels: v.array(vLabel),
	justification: v.string(),
	confidence: v.number()
});

const vLibelleAConfirmer = v.object({
	normalizedLabel: v.string(),
	rawLabelExemple: v.string(),
	occurrences: v.number(),
	montantCumuleHT: v.number(),
	motif: vMotif,
	proposition: v.union(vProposition, v.null()),
	/** Le document qui porte ce libellé : c'est la PREUVE affichée à droite. */
	documentId: v.union(v.id('invoiceDocuments'), v.null())
});

/**
 * Les libellés en attente de confirmation, toutes années confondues, triés par
 * MONTANT CUMULÉ décroissant en valeur absolue.
 *
 * L'ordre n'est pas cosmétique : un libellé à 150 € vu une fois pèse plus sur
 * le ratio qu'un libellé à 2 € vu quarante fois, et un avoir de -400 € se
 * trompe aussi cher qu'un achat de 400 €.
 */
export const listerAConfirmer = authedQuery({
	args: {},
	returns: v.object({
		libelles: v.array(vLibelleAConfirmer),
		montantTotalEnJeu: v.number()
	}),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);

		const enAttente = await ctx.db
			.query('invoiceLines')
			.withIndex('by_org_and_review', (q) =>
				q.eq('organizationId', organizationId).eq('reviewStatus', 'PENDING_REVIEW')
			)
			.collect();

		const groupes = new Map<
			string,
			{
				rawLabelExemple: string;
				occurrences: number;
				montantCumuleHT: number;
				ligne: (typeof enAttente)[number];
			}
		>();

		for (const ligne of enAttente) {
			const existant = groupes.get(ligne.normalizedLabel);
			if (existant) {
				existant.occurrences += 1;
				existant.montantCumuleHT += ligne.amountHT;
			} else {
				groupes.set(ligne.normalizedLabel, {
					rawLabelExemple: ligne.rawLabel,
					occurrences: 1,
					montantCumuleHT: ligne.amountHT,
					ligne
				});
			}
		}

		const libelles = [...groupes.entries()]
			.map(([normalizedLabel, g]) => ({
				normalizedLabel,
				rawLabelExemple: g.rawLabelExemple,
				occurrences: g.occurrences,
				montantCumuleHT: g.montantCumuleHT,
				motif: motifRevue({
					normalizedLabel,
					isFood: g.ligne.isFood,
					family: g.ligne.family,
					confidence: g.ligne.confidence
				}),
				proposition:
					g.ligne.isFood !== undefined && g.ligne.family !== undefined
						? {
								isFood: g.ligne.isFood,
								family: g.ligne.family,
								qualifyingLabels: g.ligne.qualifyingLabels ?? [],
								justification: g.ligne.justification ?? '',
								confidence: g.ligne.confidence ?? 0
							}
						: null,
				documentId: g.ligne.documentId
			}))
			.sort((a, b) => Math.abs(b.montantCumuleHT) - Math.abs(a.montantCumuleHT));

		return {
			libelles,
			montantTotalEnJeu: libelles.reduce((s, l) => s + Math.abs(l.montantCumuleHT), 0)
		};
	}
});

/**
 * Combien de produits attendent, et pour quel montant.
 *
 * Requête séparée de `listerAConfirmer` alors qu'elle lit exactement les mêmes
 * lignes, et c'est délibéré : la pastille de la barre de navigation est
 * affichée sur TOUS les écrans, alors que la file complète — ses propositions,
 * ses justifications, ses identifiants de document — n'est utile que sur un
 * seul. Faire porter la pastille par la grosse requête abonnerait chaque écran
 * du produit à un objet vingt fois plus lourd que le nombre qu'il affiche.
 */
export const compterAConfirmer = authedQuery({
	args: {},
	returns: v.object({ produits: v.number(), montant: v.number() }),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);

		const enAttente = await ctx.db
			.query('invoiceLines')
			.withIndex('by_org_and_review', (q) =>
				q.eq('organizationId', organizationId).eq('reviewStatus', 'PENDING_REVIEW')
			)
			.collect();

		// En LIBELLÉS distincts, comme la file elle-même : c'est l'unité de
		// travail du gérant. Annoncer « 2 840 » lignes puis lui en présenter 62
		// serait deux mensonges pour le prix d'un.
		const distincts = new Set<string>();
		let montant = 0;
		for (const ligne of enAttente) {
			distincts.add(ligne.normalizedLabel);
			montant += Math.abs(ligne.amountHT);
		}

		return { produits: distincts.size, montant };
	}
});

/** La preuve : le fichier source et ses lignes, pour le volet de droite. */
export const obtenirPreuve = authedQuery({
	args: { documentId: v.id('invoiceDocuments') },
	returns: v.union(
		v.object({
			filename: v.string(),
			mimeType: v.string(),
			url: v.union(v.string(), v.null()),
			invoiceNumber: v.union(v.string(), v.null()),
			invoiceDate: v.union(v.string(), v.null())
		}),
		v.null()
	),
	handler: async (ctx, { documentId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const doc = await ctx.db.get(documentId);
		if (!doc || doc.organizationId !== organizationId) return null;
		return {
			filename: doc.filename,
			mimeType: doc.mimeType,
			url: await ctx.storage.getUrl(doc.storageId),
			invoiceNumber: doc.invoiceNumber ?? null,
			invoiceDate: doc.invoiceDate ?? null
		};
	}
});

interface Decision {
	normalizedLabel: string;
	isFood: boolean;
	family: Famille;
	qualifyingLabels: Label[];
	justification: string;
}

/**
 * Applique une décision humaine à toutes les lignes de l'organisation portant
 * ce libellé, puis fait avancer le consensus global.
 *
 * Le compteur global n'est incrémenté que si cette organisation n'avait PAS
 * déjà confirmé ce libellé. La vérification se fait sur ses propres lignes :
 * la table globale n'apprend jamais qui confirme.
 */
async function decider(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	args: Decision,
	statutLigne: 'CONFIRMED' | 'CORRECTED'
): Promise<number> {
	const verdict = deriverVerdict(
		{
			normalizedLabel: args.normalizedLabel,
			isFood: args.isFood,
			family: args.family,
			qualifyingLabels: args.qualifyingLabels,
			confidence: 1
		},
		'HUMAN'
	);

	const lignes = await ctx.db
		.query('invoiceLines')
		.withIndex('by_org_and_label', (q) =>
			q.eq('organizationId', organizationId).eq('normalizedLabel', args.normalizedLabel)
		)
		.collect();

	// Avant d'écrire : cette organisation avait-elle déjà tranché ce libellé ?
	const dejaTranche = lignes.some(
		(l) => l.reviewStatus === 'CONFIRMED' || l.reviewStatus === 'CORRECTED'
	);

	for (const ligne of lignes) {
		await ctx.db.patch(ligne._id, {
			isFood: verdict.isFood,
			family: verdict.family,
			qualifyingLabels: verdict.qualifyingLabels,
			isBio: verdict.isBio,
			isDurable: verdict.isDurable,
			justification: args.justification,
			confidence: 1,
			proofStatus: verdict.proofStatus,
			reviewStatus: statutLigne,
			classifierVersion: REFERENTIEL_VERSION
		});
	}

	const cache = await ctx.db
		.query('productLabels')
		.withIndex('by_normalized_label', (q) => q.eq('normalizedLabel', args.normalizedLabel))
		.first();

	const contenu = {
		isFood: args.isFood,
		family: args.family,
		qualifyingLabels: args.qualifyingLabels,
		justification: args.justification,
		confidence: 1,
		source: 'HUMAN' as const,
		confirmedAt: Date.now(),
		classifierVersion: REFERENTIEL_VERSION
	};

	if (!cache) {
		await ctx.db.insert('productLabels', {
			normalizedLabel: args.normalizedLabel,
			...contenu,
			confirmationsCount: 1,
			contested: false,
			occurrences: lignes.length
		});
		return lignes.length;
	}

	// La décision contredit-elle le verdict établi ?
	const contredit =
		cache.source === 'HUMAN' &&
		(cache.isFood !== args.isFood ||
			cache.family !== args.family ||
			cache.qualifyingLabels.slice().sort().join(',') !==
				args.qualifyingLabels.slice().sort().join(','));

	if (contredit) {
		// On n'écrase pas : on marque le désaccord et on garde le verdict
		// concurrent. Le libellé redevient une question posée à tous.
		await ctx.db.patch(cache._id, {
			contested: true,
			verdictConcurrent: {
				isFood: args.isFood,
				family: args.family,
				qualifyingLabels: args.qualifyingLabels
			},
			occurrences: cache.occurrences + lignes.length
		});
		return lignes.length;
	}

	await ctx.db.patch(cache._id, {
		...contenu,
		confirmationsCount: dejaTranche ? cache.confirmationsCount : cache.confirmationsCount + 1,
		occurrences: cache.occurrences + lignes.length
	});

	return lignes.length;
}

/** Confirme la proposition du classifieur, telle quelle. */
export const confirmer = authedMutation({
	args: {
		normalizedLabel: v.string(),
		isFood: v.boolean(),
		family: vFamille,
		qualifyingLabels: v.array(vLabel),
		justification: v.string()
	},
	returns: v.number(),
	handler: async (ctx, args) => {
		const { organizationId } = await getUserOrg(ctx);
		return await decider(ctx, organizationId, args, 'CONFIRMED');
	}
});

/**
 * Corrige la classification d'un libellé.
 *
 * La distinction CONFIRMED / CORRECTED n'est pas cosmétique : le taux de
 * correction est l'indicateur de qualité du classifieur. S'il monte, c'est le
 * prompt ou le référentiel qu'il faut reprendre, pas le seuil de confiance.
 */
export const corriger = authedMutation({
	args: {
		normalizedLabel: v.string(),
		isFood: v.boolean(),
		family: vFamille,
		qualifyingLabels: v.array(vLabel),
		justification: v.string()
	},
	returns: v.number(),
	handler: async (ctx, args) => {
		const { organizationId } = await getUserOrg(ctx);
		if (args.justification.trim() === '') {
			throw new ConvexError('Une classification sans justification est inutilisable en contrôle.');
		}
		return await decider(ctx, organizationId, args, 'CORRECTED');
	}
});
