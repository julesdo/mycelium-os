/**
 * LES RAPPELS D'ABONNEMENT — quand prévenir, et quoi dire.
 *
 * Le prélèvement ne surprend jamais (`docs/superpowers/specs/2026-10-14-pricing-abonnements.md`) :
 *
 *   · J-7 avant la fin de l'essai, Plume fait le point : ce qui est parti, ce
 *     qui est rentré sur les dossiers suivis, la date et le montant ;
 *   · J-2, l'e-mail et la notification : la date, le montant, comment annuler ;
 *   · trente jours avant un renouvellement annuel, l'e-mail : la date, le
 *     montant, comment passer au mois ou résilier.
 *
 * Module PUR : aucune base, aucun envoi. `convex/abonnementRappels.ts` lit,
 * envoie et note ce qui est parti (`rappelsAbonnement`) : jamais deux fois.
 */
import {
	GRILLE,
	RAPPELS_AVANT_PRELEVEMENT_JOURS,
	RAPPEL_RENOUVELLEMENT_JOURS,
	type Formule,
	type Rythme
} from '../config/tarifs';
import { montantPreleve } from './paddle';

const JOUR = 24 * 60 * 60 * 1000;

export interface EtatPourRappels {
	readonly statut: string | null;
	readonly formule: Formule | null;
	readonly rythme: Rythme | null;
	readonly essaiFinLe: number | null;
	readonly prochainPrelevementLe: number | null;
	readonly resiliationLe: number | null;
	/** Les clés des rappels déjà envoyés. */
	readonly deja: readonly string[];
}

export interface RappelDu {
	/** « essai-7:2026-11-13 » : un rappel par échéance, jamais deux fois. */
	readonly cle: string;
	readonly genre: 'point' | 'essai' | 'renouvellement';
	/** Les jours qui restent avant le prélèvement. */
	readonly jours: number;
	readonly date: number;
	/** L'e-mail part en plus de la notification. */
	readonly email: boolean;
}

/**
 * Les rappels dus aujourd'hui, du plus urgent au moins urgent. Une résiliation
 * programmée les éteint tous : rien ne sera prélevé, il n'y a rien à annoncer.
 */
export function rappelsDus(etat: EtatPourRappels, maintenant: number): RappelDu[] {
	if (etat.resiliationLe !== null) return [];
	const dus: RappelDu[] = [];

	if (etat.statut === 'trialing' && etat.essaiFinLe !== null) {
		const reste = joursAvant(etat.essaiFinLe, maintenant);
		const [point, avant] = RAPPELS_AVANT_PRELEVEMENT_JOURS;
		for (const [seuil, genre] of [
			[avant, 'essai'],
			[point, 'point']
		] as const) {
			const cle = `essai-${seuil}:${jourISO(etat.essaiFinLe)}`;
			if (reste > 0 && reste <= seuil && !etat.deja.includes(cle)) {
				dus.push({ cle, genre, jours: reste, date: etat.essaiFinLe, email: genre === 'essai' });
			}
		}
	}

	if (etat.statut === 'active' && etat.rythme === 'annuel' && etat.prochainPrelevementLe !== null) {
		const reste = joursAvant(etat.prochainPrelevementLe, maintenant);
		const cle = `renouvellement-${RAPPEL_RENOUVELLEMENT_JOURS}:${jourISO(etat.prochainPrelevementLe)}`;
		if (reste > 0 && reste <= RAPPEL_RENOUVELLEMENT_JOURS && !etat.deja.includes(cle)) {
			dus.push({
				cle,
				genre: 'renouvellement',
				jours: reste,
				date: etat.prochainPrelevementLe,
				email: true
			});
		}
	}

	return dus;
}

/** Ce que l'établissement a vu se passer depuis le début de l'essai. */
export interface Bilan {
	readonly relancesParties: number;
	/** En centimes. */
	readonly rentre: bigint;
}

export interface TexteDuRappel {
	readonly titre: string;
	readonly message: string;
}

/**
 * Le texte d'un rappel, le même dans la notification et dans l'e-mail.
 *
 * ⚠️ « RENTRÉ SUR LES DOSSIERS SUIVIS », JAMAIS « GRÂCE À LETIKETTE ». Le
 * logiciel relance ; ce qui rentre ne dépend pas de lui, et dire le contraire
 * serait une promesse de résultat.
 */
export function texteDuRappel(
	rappel: RappelDu,
	formule: Formule,
	rythme: Rythme,
	bilan: Bilan,
	/** Le montant du prix souscrit (`prixPaddle.montant`) : ce que Paddle prélève vraiment. */
	montantDuPrixSouscrit?: string | null,
	/**
	 * Le prochain prélèvement tel que Paddle l'a calculé pour ce client, TVA comprise
	 * (`paddleProchainHT`, `paddleProchainTTC`). Sans lui, le hors taxes et « TVA en plus ».
	 */
	prochain?: { readonly ht: number; readonly ttc: number } | null
): TexteDuRappel {
	const date = dateEnLettres(rappel.date);
	const montant =
		prochain === undefined || prochain === null
			? `${euros(montantPreleve(montantDuPrixSouscrit, formule, rythme))} HT, TVA en plus`
			: `${euros(prochain.ttc)} TTC (${euros(prochain.ht)} HT)`;
	const nom = GRILLE[formule].nom;

	if (rappel.genre === 'point') {
		const fait =
			bilan.relancesParties === 0
				? 'Aucune relance n’est encore partie : démarrez un dossier pour que je m’y mette.'
				: `Depuis le début de l’essai : ${bilan.relancesParties} relance${bilan.relancesParties > 1 ? 's' : ''} partie${bilan.relancesParties > 1 ? 's' : ''}, ${euros(Number(bilan.rentre))} rentrés sur les dossiers suivis.`;
		return {
			titre: `Votre essai se termine le ${date}`,
			message: `${fait} Premier prélèvement le ${date} : ${montant}. Rien à faire pour continuer.`
		};
	}

	if (rappel.genre === 'essai') {
		return {
			titre: `Premier prélèvement le ${date}`,
			message: `${montant}, pour ${nom}, ${rythme === 'annuel' ? 'à l’année' : 'au mois'}. Pour continuer, rien à faire. Pour annuler ou changer de formule : Compte, puis Abonnement, jusqu’à la veille.`
		};
	}

	return {
		titre: `Renouvellement le ${date}`,
		message: `Votre formule ${nom} à l’année se renouvelle le ${date} : ${montant}. Pour passer au mois ou résilier : Compte, puis Abonnement.`
	};
}

function joursAvant(echeance: number, maintenant: number): number {
	return Math.ceil((echeance - maintenant) / JOUR);
}

function jourISO(ms: number): string {
	return new Date(ms).toISOString().slice(0, 10);
}

function dateEnLettres(ms: number): string {
	return new Date(ms).toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'long',
		timeZone: 'Europe/Paris'
	});
}

const EUROS_RONDS = new Intl.NumberFormat('fr-FR', {
	style: 'currency',
	currency: 'EUR',
	maximumFractionDigits: 0
});
const EUROS_CENTIMES = new Intl.NumberFormat('fr-FR', {
	style: 'currency',
	currency: 'EUR',
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

/** Un montant porté en centimes : « 390 € », mais « 32,50 € ». */
function euros(centimes: number): string {
	return (centimes % 100 === 0 ? EUROS_RONDS : EUROS_CENTIMES).format(centimes / 100);
}
