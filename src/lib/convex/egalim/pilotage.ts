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

/**
 * Les années pour lesquelles cette organisation a des achats, la plus récente d'abord.
 *
 * Deux lectures, pas un balayage. L'index `by_org_and_date` étant ordonné par
 * date croissante, la première et la dernière ligne de l'organisation encadrent
 * toutes les années présentes. Lire les ~3 000 lignes de chaque exercice pour
 * n'en extraire que quatre caractères aurait fait tomber le plafond des 16 000
 * lectures vers la cinquième année de factures cumulées — et comme c'est cette
 * query qui alimente le sélecteur, l'écran entier serait tombé avec elle.
 *
 * Deux comportements dégradés, assumés :
 *
 * 1. Une année sans le moindre achat entre les deux bornes apparaît quand même
 *    dans le sélecteur. Une cantine achetant tous les mois, le trou est
 *    théorique ; et s'il se produit, `tableauDeBord` répond `aDesDonnees: false`
 *    et l'écran affiche l'amorçage. Dégradé, pas faux.
 *
 * 2. `invoiceDate` vaut la chaîne vide quand l'extraction n'a pas su lire la
 *    date. Les bornes de l'index écartent ces lignes par construction : une
 *    chaîne vide trie avant `1000-01-01`, et un « N/A » après `9999-12-31`,
 *    les lettres triant après les chiffres. Sans ces bornes, une seule date
 *    illisible — qui trie en tête — aurait masqué du sélecteur tous les
 *    exercices antérieurs au plus récent.
 */
export const listerAnnees = authedQuery({
	args: {},
	returns: v.array(v.string()),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);

		const borne = (ordre: 'asc' | 'desc') =>
			ctx.db
				.query('invoiceLines')
				.withIndex('by_org_and_date', (q) =>
					q
						.eq('organizationId', organizationId)
						.gte('invoiceDate', '1000-01-01')
						.lte('invoiceDate', '9999-12-31')
				)
				.order(ordre)
				.first();

		const plusAncienne = await borne('asc');
		const plusRecente = await borne('desc');

		const annee = (date: string | undefined): number | null => {
			if (date === undefined) return null;
			const quatre = date.slice(0, 4);
			return /^\d{4}$/.test(quatre) ? Number(quatre) : null;
		};

		// Aucune ligne, ou deux bornes illisibles : rien à proposer au sélecteur.
		const premiere = annee(plusAncienne?.invoiceDate);
		const derniere = annee(plusRecente?.invoiceDate);
		if (premiere === null || derniere === null) return [];

		// Une date aberrante sortie de l'OCR (« 2205 » pour « 2025 ») ne doit ni
		// produire un sélecteur de cent quatre-vingts entrées, ni dépasser la taille
		// maximale d'un tableau Convex et faire échouer l'écran entier.
		const plancher = Math.max(premiere, derniere - 30);

		const annees: string[] = [];
		for (let a = derniere; a >= plancher; a--) annees.push(String(a));
		return annees;
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
