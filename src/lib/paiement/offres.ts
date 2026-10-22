import { JOURS_OFFRE_DE_BIENVENUE, OFFRES } from '../config/tarifs';
import { bornesDuJourDeParis, jourDeParis } from '../admin/dates';
import type { PrixAttendu } from './paddle';

/**
 * LES OFFRES QUI PASSENT PAR PADDLE (19/10/2026, audit stratégique, décision 4, lot 8).
 *
 * Ce sont des abonnements, donc Paddle les encaisse :
 *
 * - LE PRIX FONDATEURS : Pro à l'année au prix de l'offre (`OFFRES.fondateurs`), compté
 *   (les places), daté (le dernier jour, à Paris), JAMAIS MIGRÉ. Son étiquette ne porte
 *   pas la version de la grille : une nouvelle grille ne le recrée pas, et l'abonné garde
 *   le prix qu'il a souscrit (`montantPreleve` lit le prix, jamais la grille). Changer de
 *   formule le quitte sans retour : `changerDeFormule` le refuse sans accord exprès.
 * - LA REMISE DE BIENVENUE : après un diagnostic, une remise à usage unique créée par
 *   l'API de Paddle pour l'établissement, sur ses premiers mois des prix au mois,
 *   valable jusqu'à minuit (Paris) le dernier jour de l'offre. « Écrit "prix bloqué à
 *   vie", jamais le mot interdit. »
 */

/** L'étiquette du prix fondateurs, sans version de grille : il n'est jamais migré. */
export const ETIQUETTE_FONDATEURS = 'pro-annuel-fondateurs';

/** Le prix fondateurs tel que le catalogue le crée chez Paddle. */
export function prixFondateursAttendu(): PrixAttendu {
	const f = OFFRES.fondateurs;
	return {
		etiquette: ETIQUETTE_FONDATEURS,
		formule: f.formule,
		rythme: f.rythme,
		essai: false,
		nom: 'Pro, à l’année · offre fondateurs',
		montant: String(f.prixCentimes),
		devise: 'EUR',
		cycle: { interval: 'year', frequency: 1 },
		essaiJours: null,
		fondateurs: true
	};
}

/** Les places qui restent, et si l'offre s'ouvre encore ce jour-là (à Paris). */
export function placesFondateurs(
	jour: string,
	prises: number
): { ouverte: boolean; restantes: number } {
	const restantes = Math.max(0, OFFRES.fondateurs.places - prises);
	return { ouverte: jour <= OFFRES.fondateurs.jusquAu && restantes > 0, restantes };
}

export interface OffreDeBienvenue {
	readonly pourcent: number;
	readonly mois: number;
	/** Le dernier jour de l'offre, `AAAA-MM-JJ`, à Paris. */
	readonly dernierJour: string;
	/** Minuit à Paris, à la fin du dernier jour : l'expiration de la remise chez Paddle. */
	readonly expireLe: number;
}

const JOUR = 24 * 60 * 60 * 1000;

/**
 * L'offre de bienvenue d'un établissement, d'après ses étapes : ouverte pendant
 * `JOURS_OFFRE_DE_BIENVENUE` jours à partir du jour où le diagnostic est rendu, éteinte
 * dès un essai ou un abonnement.
 */
export function offreDeBienvenue(
	etapes: {
		readonly DIAGNOSTIC_RENDU?: number;
		readonly ESSAI?: number;
		readonly ABONNE?: number;
	},
	maintenant: number
): OffreDeBienvenue | null {
	const rendu = etapes.DIAGNOSTIC_RENDU;
	if (rendu === undefined || etapes.ESSAI !== undefined || etapes.ABONNE !== undefined) return null;
	// Midi du jour du rendu, plus les jours de l'offre moins un : son dernier jour.
	const { debut } = bornesDuJourDeParis(rendu);
	const dernier = debut + 12 * 60 * 60 * 1000 + (JOURS_OFFRE_DE_BIENVENUE - 1) * JOUR;
	const expireLe = bornesDuJourDeParis(dernier).fin;
	if (maintenant >= expireLe) return null;
	return {
		pourcent: OFFRES.diagnosticComplet.remiseBienvenuePourcent,
		mois: OFFRES.diagnosticComplet.remiseBienvenueMois,
		dernierJour: jourDeParis(dernier),
		expireLe
	};
}

/**
 * Le corps de `POST /discounts` (API Paddle Billing) : un pourcentage, appliqué aux
 * premiers prélèvements (`maximum_recurring_intervals`), une seule fois
 * (`usage_limit`), sur les seuls prix au mois, jusqu'à la fin de l'offre. L'établissement
 * est noté dans les données libres, pour le retrouver dans le tableau de bord.
 */
/**
 * LE MOIS OFFERT D'UNE RECOMMANDATION (21/10/2026, moment 7) : une remise unique, d'un
 * montant fixe — le prix mensuel HT de la formule —, sur la prochaine échéance de
 * l'abonnement, jamais proposée au paiement.
 */
export function corpsDeLaRecompense({
	organisationId,
	montantCentimes
}: {
	readonly organisationId: string;
	readonly montantCentimes: number;
}): Record<string, unknown> {
	return {
		amount: String(montantCentimes),
		description: 'Recommandation · un mois offert',
		type: 'flat',
		currency_code: 'EUR',
		enabled_for_checkout: false,
		recur: false,
		usage_limit: 1,
		custom_data: { letikette_organisation: organisationId }
	};
}

export function corpsDeLaRemise({
	organisationId,
	nomEtablissement,
	prixIds,
	expireLe
}: {
	readonly organisationId: string;
	readonly nomEtablissement: string;
	readonly prixIds: readonly string[];
	readonly expireLe: number;
}): Record<string, unknown> {
	const o = OFFRES.diagnosticComplet;
	return {
		amount: String(o.remiseBienvenuePourcent),
		description: `Offre de bienvenue · ${nomEtablissement}`.slice(0, 500),
		type: 'percentage',
		enabled_for_checkout: true,
		recur: true,
		maximum_recurring_intervals: o.remiseBienvenueMois,
		usage_limit: 1,
		restrict_to: [...prixIds],
		expires_at: new Date(expireLe).toISOString(),
		custom_data: { letikette_organisation: organisationId }
	};
}
