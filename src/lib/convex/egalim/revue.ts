import { v, ConvexError } from 'convex/values';
import { conciergeQuery, conciergeMutation } from '../functions';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { internal } from '../_generated/api';
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

/**
 * `conciergeQuery` et `conciergeMutation` n'établissent que le rôle staff, pas
 * le PÉRIMÈTRE. Un `OPERATOR` n'a accès qu'aux organisations qui lui sont
 * assignées dans `conciergeOrgAccess` ; un `SUPER_ADMIN` les voit toutes.
 *
 * Sans ce garde, la file d'arbitrage exposait à tout opérateur les libellés
 * produits et les montants cumulés HT de n'importe quel client, et lui
 * permettait d'en modifier les classifications. C'est le garde de
 * `concierge/timeline.ts`, appliqué ici sur l'organisation du lot.
 */
async function dansLePerimetre(
	ctx: QueryCtx,
	staffRole: string,
	userId: string,
	organizationId: Id<'organizations'>
): Promise<boolean> {
	if (staffRole !== 'OPERATOR') return true;
	const acces = await ctx.db
		.query('conciergeOrgAccess')
		.withIndex('by_concierge_and_org', (q) =>
			q.eq('conciergeUserId', userId).eq('organizationId', organizationId)
		)
		.first();
	return acces !== null;
}

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
		const batch = await ctx.db.get(batchId);
		if (!batch || !(await dansLePerimetre(ctx, ctx.staffRole, ctx.user._id, batch.organizationId))) {
			return { libelles: [], montantTotalEnJeu: 0 };
		}

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
	userId: string,
	staffRole: string
): Promise<number> {
	const { batchId } = args;
	const batch = await ctx.db.get(batchId);
	if (!batch) throw new ConvexError('Lot introuvable');
	if (!(await dansLePerimetre(ctx, staffRole, userId, batch.organizationId))) {
		throw new ConvexError("Acces refuse : cette organisation ne vous est pas assignee");
	}

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
		// `confirmedBy` a disparu du cache global : c'était un identifiant
		// d'utilisateur dans une table partagée entre tous les clients.
		confirmedAt: Date.now(),
		classifierVersion: REFERENTIEL_VERSION
	};

	if (existant) {
		await ctx.db.patch(existant._id, contenu);
	} else {
		await ctx.db.insert('productLabels', {
			normalizedLabel: args.normalizedLabel,
			...contenu,
			confirmationsCount: 1,
			contested: false,
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

	// Le lot ne devient PRÊT que si la classification est TERMINÉE.
	//
	// Sans cette condition, un opérateur qui vide la file pendant que la
	// classification tourne encore ferait passer le lot à READY sur une
	// fraction des libellés, et le diagnostic serait figé sur cette fraction.
	// Un rapport faux, et crédible, remis à une cantine.
	const classificationFinie = batch.status === 'REVIEW';
	const pretAPublier = libellesRestants.size === 0 && classificationFinie;

	await ctx.db.patch(batchId, {
		labelsPendingReview: libellesRestants.size,
		status: pretAPublier ? 'READY' : batch.status
	});

	// Dernier libellé arbitré : le diagnostic se produit sans qu'on le
	// demande. Le client voit son chiffre apparaître, il n'a pas à savoir
	// qu'une file d'arbitrage existait.
	if (pretAPublier) {
		await ctx.scheduler.runAfter(0, internal.egalim.diagnostics.produireSiPret, { batchId });
	}

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
	handler: async (ctx, args) => arbitrer(ctx, args, 'CONFIRMED', ctx.user._id, ctx.staffRole)
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
	handler: async (ctx, args) => arbitrer(ctx, args, 'CORRECTED', ctx.user._id, ctx.staffRole)
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
		// Uniquement les lots REVIEW. Exposer un lot encore en EXTRACTING ou en
		// CLASSIFYING inviterait l'opérateur à vider une file qui n'est pas
		// close : il ferait passer le lot pour prêt sur une fraction des
		// libellés, et le diagnostic serait figé sur cette fraction.
		//
		// Passe par l'index `by_status` : sans lui, c'était un scan complet de
		// `invoiceBatches`, toutes organisations confondues, à chaque ouverture.
		const enCours = await ctx.db
			.query('invoiceBatches')
			.withIndex('by_status', (q) => q.eq('status', 'REVIEW'))
			.collect();

		const nomsParOrg = new Map<string, string>();
		const resultats = [];
		for (const lot of enCours) {
			if (!(await dansLePerimetre(ctx, ctx.staffRole, ctx.user._id, lot.organizationId))) {
				continue;
			}
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
		if (!(await dansLePerimetre(ctx, ctx.staffRole, ctx.user._id, batch.organizationId))) return null;
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
