import { v } from 'convex/values';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { SEUILS } from '../../egalim/referentiel';
import { FAMILLES, type Famille } from '../../egalim/types';
import { calculerRatios, partNonConfirmee, type LignePourAgregation } from './agregation';
import { vFamille } from './tables';

/**
 * Les lectures du tableau de bord.
 *
 * Les ratios se calculent par ANNÉE CIVILE, sur toutes les lignes dont la date
 * de facture tombe dans l'année, quel que soit le lot qui les a apportées.
 * C'est ce qui permet de déposer en trois fois sans que le chiffre soit faux
 * entre-temps. EGalim se déclare par année civile : un pourcentage sur un mois
 * d'achats ne se compare à aucun seuil légal.
 */

const vRatios = v.object({
	durable: v.number(),
	bio: v.number(),
	meatFishDurable: v.number(),
	totalFoodHT: v.number(),
	totalHT: v.number()
});

/** Les années pour lesquelles cette organisation a des achats, la plus récente d'abord. */
export const listerAnnees = authedQuery({
	args: {},
	returns: v.array(v.string()),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const lignes = await ctx.db
			.query('invoiceLines')
			.withIndex('by_org_and_date', (q) => q.eq('organizationId', organizationId))
			.collect();
		const annees = new Set(
			lignes.map((l) => l.invoiceDate.slice(0, 4)).filter((a) => /^\d{4}$/.test(a))
		);
		return [...annees].sort().reverse();
	}
});

export const tableauDeBord = authedQuery({
	args: { annee: v.string() },
	returns: v.object({
		/** false tant qu'aucune ligne n'existe : l'écran montre l'amorçage. */
		aDesDonnees: v.boolean(),
		ratios: vRatios,
		seuils: v.object({
			durable: v.number(),
			bio: v.number(),
			viandePoissonDurable: v.number()
		}),
		gapEuros: v.object({
			toDurable50: v.number(),
			toBio20: v.number(),
			toMeatFish60: v.number()
		}),
		/** Part du MONTANT alimentaire reposant sur une classification non confirmée. */
		partNonConfirmee: v.number(),
		libellesAConfirmer: v.number(),
		montantAConfirmer: v.number(),
		parFamille: v.array(
			v.object({
				family: vFamille,
				totalHT: v.number(),
				durableHT: v.number(),
				bioHT: v.number()
			})
		),
		documentsEnCours: v.number(),
		documentsEnEchec: v.number()
	}),
	handler: async (ctx, { annee }) => {
		const { organizationId } = await getUserOrg(ctx);

		// Bornes de l'année civile, en comparaison de chaînes AAAA-MM-JJ.
		const toutes = await ctx.db
			.query('invoiceLines')
			.withIndex('by_org_and_date', (q) =>
				q
					.eq('organizationId', organizationId)
					.gte('invoiceDate', `${annee}-01-01`)
					.lte('invoiceDate', `${annee}-12-31`)
			)
			.collect();

		const classees = toutes.filter(
			(
				l
			): l is (typeof toutes)[number] & {
				isFood: boolean;
				family: Famille;
				isDurable: boolean;
				isBio: boolean;
			} =>
				l.isFood !== undefined &&
				l.family !== undefined &&
				l.isDurable !== undefined &&
				l.isBio !== undefined
		);

		const pourAgregation: LignePourAgregation[] = classees.map((l) => ({
			amountHT: l.amountHT,
			isFood: l.isFood,
			family: l.family,
			isDurable: l.isDurable,
			isBio: l.isBio
		}));

		const ratios = calculerRatios(pourAgregation);

		const enAttente = toutes.filter((l) => l.reviewStatus === 'PENDING_REVIEW');
		const libellesAConfirmer = new Set(enAttente.map((l) => l.normalizedLabel)).size;
		const montantAConfirmer = enAttente.reduce((s, l) => s + Math.abs(l.amountHT), 0);

		const parFamille = FAMILLES.map((family) => {
			const duGroupe = classees.filter((l) => l.isFood && l.family === family);
			return {
				family,
				totalHT: duGroupe.reduce((s, l) => s + l.amountHT, 0),
				durableHT: duGroupe.filter((l) => l.isDurable).reduce((s, l) => s + l.amountHT, 0),
				bioHT: duGroupe.filter((l) => l.isBio).reduce((s, l) => s + l.amountHT, 0)
			};
		}).filter((f) => f.totalHT !== 0);

		const documents = await ctx.db
			.query('invoiceDocuments')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		return {
			aDesDonnees: toutes.length > 0,
			ratios: {
				durable: ratios.durable,
				bio: ratios.bio,
				meatFishDurable: ratios.meatFishDurable,
				totalFoodHT: ratios.totalFoodHT,
				totalHT: ratios.totalHT
			},
			seuils: SEUILS,
			gapEuros: ratios.gapEuros,
			partNonConfirmee: partNonConfirmee(
				classees.map((l) => ({
					amountHT: l.amountHT,
					isFood: l.isFood,
					reviewStatus: l.reviewStatus
				}))
			),
			libellesAConfirmer,
			montantAConfirmer,
			parFamille,
			documentsEnCours: documents.filter((d) => d.extractionStatus === 'PENDING').length,
			documentsEnEchec: documents.filter((d) => d.extractionStatus === 'FAILED').length
		};
	}
});
