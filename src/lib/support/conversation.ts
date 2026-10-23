import { jourDeParis } from '../admin/dates';
import { lireDomaine } from '../verticales/recouvrement/expediteur';

/**
 * CE QUI RÈGLE UNE CONVERSATION DE SUPPORT, HORS DE CONVEX (16/10/2026).
 */

/** Les réponses de Plume support, par établissement et par mois. Au-delà, l'équipe répond. */
export const PLAFOND_SUPPORT_MENSUEL = 150;
/** Les réponses de Plume support, par mois, tous établissements : la queue, pas la moyenne. */
export const PLAFOND_SUPPORT_GLOBAL = 4000;
/** Les messages d'un même compte en une heure. Au-delà, un refus daté, sans passage. */
export const MESSAGES_PAR_HEURE = 30;
/** Plume a quarante-cinq secondes pour répondre ; au-delà, la conversation passe (`PANNE`). */
export const DELAI_DE_PLUME_MS = 45_000;
export const LONGUEUR_MAX_MESSAGE = 4000;

/** La question en une phrase : la carte de l'accueil, la file de l'équipe. */
export function titreDe(texte: string): string {
	const net = texte.replace(/\s+/g, ' ').trim();
	if (net === '') return 'Question sans texte';
	const phrase = /^(.+?[.?!])(?:\s|$)/.exec(net)?.[1] ?? net;
	if (phrase.length <= 80) return phrase;
	const coupe = phrase.slice(0, 80);
	const espace = coupe.lastIndexOf(' ');
	return `${(espace > 40 ? coupe.slice(0, espace) : coupe).trimEnd()}…`;
}

/** `AAAA-MM`, à l'heure de Paris : le budget de Plume se compte au mois. */
export function moisDe(instant: number): string {
	return jourDeParis(instant).slice(0, 7);
}

function domaineDe(adresse: string | undefined): string | null {
	if (adresse === undefined) return null;
	const nue = /<([^>]+)>/.exec(adresse)?.[1] ?? adresse;
	const domaine = nue.trim().split('@')[1];
	return domaine === undefined || domaine === '' ? null : domaine.toLowerCase();
}

/**
 * LA RÉCEPTION DES E-MAILS S'OUVRE PAR LE CODE, PAS PAR LA CONFIGURATION (spec § 5.2).
 *
 * ⚠️ TANT QUE LES RELANCES PARTENT DU DOMAINE DE LETIKETTE, ELLE RESTE FERMÉE. Un
 * débiteur qui répond à une relance écrirait alors à l'équipe — et Letikette « ne
 * reçoit ni fonds ni réponse du débiteur » (ligne rouge n° 1). Poser le secret du
 * webhook ne suffit donc pas : il faut que les relances partent d'un autre domaine —
 * le domaine neutre (`RELANCES_DOMAINE`, une adresse par établissement, 23/10/2026), à
 * défaut `RELANCES_EMAIL`. Un sous-domaine de Letikette reste Letikette.
 */
export function receptionOuverte(env: {
	readonly secret: string | undefined;
	readonly domaine: string | undefined;
	readonly relancesEmail: string | undefined;
	readonly relancesDomaine?: string | undefined;
	readonly authEmail: string | undefined;
}): boolean {
	if (!env.secret || !env.domaine) return false;
	const relances = lireDomaine(env.relancesDomaine) ?? domaineDe(env.relancesEmail);
	const letikette = domaineDe(env.authEmail);
	if (relances === null || letikette === null) return false;
	const memeFamille =
		relances === letikette ||
		relances.endsWith(`.${letikette}`) ||
		letikette.endsWith(`.${relances}`);
	return !memeFamille;
}
