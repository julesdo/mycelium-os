import { v, ConvexError } from 'convex/values';
import { conciergeQuery, conciergeMutation } from '../functions';
import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { REFERENTIEL_VERSION } from '../../egalim/referentiel';
import type { Famille, Label } from '../../egalim/types';
import { deriverVerdict, motifRevue } from './verdict';
import { vFamille, vLabel } from './tables';

/**
 * La file d'arbitrage humain, côté opérateur Mycelium.
 *
 * Elle travaille par LIBELLÉ, jamais par ligne. Une décision règle toutes les
 * occurrences du libellé dans le lot, et toutes celles à venir chez tous les
 * clients via le cache global. C'est ce rapport de un à plusieurs qui rend le
 * diagnostic rentable : arbitrer 40 libellés couvre 3 000 lignes.
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

const vLibelleAArbitrer = v.object({
	normalizedLabel: v.string(),
	rawLabelExemple: v.string(),
	occurrences: v.number(),
	montantCumuleHT: v.number(),
	motif: vMotif,
	proposition: v.union(vProposition, v.null())
});

/**
 * Les libellés du lot en attente d'arbitrage, triés par MONTANT CUMULÉ
 * décroissant.
 *
 * L'ordre n'est pas cosmétique : un libellé à 150 € vu une fois pèse plus sur
 * le ratio qu'un libellé à 2 € vu quarante fois. Trier par occurrences ferait
 * commencer l'opérateur par ce qui ne change rien.
 */
export const listerLibellesEnRevue = conciergeQuery({
	args: { batchId: v.id('invoiceBatches') },
	returns: v.object({
		libelles: v.array(vLibelleAArbitrer),
		montantTotalEnJeu: v.number()
	}),
	handler: async (ctx, { batchId }) => {
		const lignes = await ctx.db
			.query('invoiceLines')
			.withIndex('by_batch_and_review', (q) =>
				q.eq('batchId', batchId).eq('reviewStatus', 'PENDING_REVIEW')
			)
			.collect();

		const groupes = new Map<
			string,
			{
				rawLabelExemple: string;
				occurrences: number;
				montantCumuleHT: number;
				ligne: (typeof lignes)[number];
			}
		>();

		for (const ligne of lignes) {
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
						: null
			}))
			// Tri sur la valeur ABSOLUE : un avoir de -400 € pèse autant qu'un
			// achat de 400 €, et se trompe tout aussi cher.
			.sort((a, b) => Math.abs(b.montantCumuleHT) - Math.abs(a.montantCumuleHT));

		return {
			libelles,
			montantTotalEnJeu: libelles.reduce((s, l) => s + Math.abs(l.montantCumuleHT), 0)
		};
	}
});

/**
 * Applique une décision humaine à un libellé : le cache global, toutes les
 * lignes du lot, et le compteur du lot.
 *
 * `productLabels` s'écrit en `patch` sur le document existant s'il y en a un,
 * JAMAIS en `insert` aveugle : deux opérateurs arbitrant le même libellé en
 * même temps laisseraient sinon deux entrées pour une seule clé, et la
 * lecture de cache deviendrait non déterministe.
 */
interface DecisionArbitrage {
	batchId: Id<'invoiceBatches'>;
	normalizedLabel: string;
	isFood: boolean;
	family: Famille;
	qualifyingLabels: Label[];
	justification: string;
}

async function arbitrer(
	ctx: MutationCtx,
	args: DecisionArbitrage,
	statutLigne: 'CONFIRMED' | 'CORRECTED',
	userId: string
): Promise<number> {
	const { batchId } = args;
	const batch = await ctx.db.get(batchId);
	if (!batch) throw new ConvexError('Lot introuvable');

	// Une décision humaine est certaine par construction : elle ne repassera
	// jamais sous le seuil de confiance qui l'avait fait remonter.
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
		.withIndex('by_batch_and_label', (q) =>
			q.eq('batchId', batchId).eq('normalizedLabel', args.normalizedLabel)
		)
		.collect();

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

	const existant = await ctx.db
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
		confirmedBy: userId,
		confirmedAt: Date.now(),
		classifierVersion: REFERENTIEL_VERSION
	};

	if (existant) {
		await ctx.db.patch(existant._id, contenu);
	} else {
		await ctx.db.insert('productLabels', {
			normalizedLabel: args.normalizedLabel,
			...contenu,
			occurrences: lignes.length
		});
	}

	// Recompté depuis les lignes plutôt que décrémenté : un compteur qu'on
	// décrémente finit toujours par diverger de ce qu'il compte.
	const restantes = await ctx.db
		.query('invoiceLines')
		.withIndex('by_batch_and_review', (q) =>
			q.eq('batchId', batchId).eq('reviewStatus', 'PENDING_REVIEW')
		)
		.collect();
	const libellesRestants = new Set(restantes.map((l) => l.normalizedLabel));

	await ctx.db.patch(batchId, {
		labelsPendingReview: libellesRestants.size,
		status: libellesRestants.size === 0 ? 'READY' : batch.status
	});

	return lignes.length;
}

/**
 * Confirme la proposition du classifieur pour un libellé. La décision ne sera
 * plus jamais reposée, chez AUCUN client.
 */
export const confirmerLibelle = conciergeMutation({
	args: {
		batchId: v.id('invoiceBatches'),
		normalizedLabel: v.string(),
		isFood: v.boolean(),
		family: vFamille,
		qualifyingLabels: v.array(vLabel),
		justification: v.string()
	},
	returns: v.number(),
	handler: async (ctx, args) => arbitrer(ctx, args, 'CONFIRMED', ctx.user._id)
});

/**
 * Corrige la classification d'un libellé.
 *
 * La distinction CONFIRMED / CORRECTED n'est pas cosmétique : le taux de
 * correction est l'indicateur de qualité du classifieur. S'il monte, c'est le
 * prompt ou le référentiel qu'il faut reprendre, pas le seuil de confiance.
 */
export const corrigerLibelle = conciergeMutation({
	args: {
		batchId: v.id('invoiceBatches'),
		normalizedLabel: v.string(),
		isFood: v.boolean(),
		family: vFamille,
		qualifyingLabels: v.array(vLabel),
		justification: v.string()
	},
	returns: v.number(),
	handler: async (ctx, args) => arbitrer(ctx, args, 'CORRECTED', ctx.user._id)
});

/**
 * Les lots de toutes les organisations qui attendent quelque chose de
 * l'opérateur, les plus chargés d'abord.
 *
 * C'est la porte d'entrée du travail d'arbitrage : sans elle, l'écran de
 * revue n'est atteignable que par une URL devinée.
 */
export const listerLotsAArbitrer = conciergeQuery({
	args: {},
	returns: v.array(
		v.object({
			batchId: v.id('invoiceBatches'),
			label: v.string(),
			organizationName: v.string(),
			periodStart: v.string(),
			periodEnd: v.string(),
			status: v.string(),
			linesTotal: v.number(),
			labelsPendingReview: v.number()
		})
	),
	handler: async (ctx) => {
		const lots = await ctx.db.query('invoiceBatches').collect();
		const enCours = lots.filter(
			(l) => l.status === 'REVIEW' || l.status === 'CLASSIFYING' || l.status === 'EXTRACTING'
		);

		const nomsParOrg = new Map<string, string>();
		const resultats = [];
		for (const lot of enCours) {
			let nom = nomsParOrg.get(lot.organizationId);
			if (nom === undefined) {
				const org = await ctx.db.get(lot.organizationId);
				nom = org?.name ?? 'Organisation inconnue';
				nomsParOrg.set(lot.organizationId, nom);
			}
			resultats.push({
				batchId: lot._id,
				label: lot.label,
				organizationName: nom,
				periodStart: lot.periodStart,
				periodEnd: lot.periodEnd,
				status: lot.status,
				linesTotal: lot.linesTotal,
				labelsPendingReview: lot.labelsPendingReview
			});
		}

		return resultats.sort((a, b) => b.labelsPendingReview - a.labelsPendingReview);
	}
});

/** L'en-tête de l'écran : de quel lot il s'agit, et combien il reste. */
export const obtenirEnteteRevue = conciergeQuery({
	args: { batchId: v.id('invoiceBatches') },
	returns: v.union(
		v.object({
			label: v.string(),
			organizationName: v.string(),
			periodStart: v.string(),
			periodEnd: v.string(),
			status: v.string(),
			linesTotal: v.number(),
			labelsPendingReview: v.number()
		}),
		v.null()
	),
	handler: async (ctx, { batchId }) => {
		const batch = await ctx.db.get(batchId);
		if (!batch) return null;
		const org = await ctx.db.get(batch.organizationId);
		return {
			label: batch.label,
			organizationName: org?.name ?? 'Organisation inconnue',
			periodStart: batch.periodStart,
			periodEnd: batch.periodEnd,
			status: batch.status,
			linesTotal: batch.linesTotal,
			labelsPendingReview: batch.labelsPendingReview
		};
	}
});
