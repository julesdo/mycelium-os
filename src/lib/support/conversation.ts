import { jourDeParis } from '../admin/dates';

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
 * webhook ne suffit donc pas : il faut que `RELANCES_EMAIL` soit sur un autre domaine.
 */
export function receptionOuverte(env: {
	readonly secret: string | undefined;
	readonly domaine: string | undefined;
	readonly relancesEmail: string | undefined;
	readonly authEmail: string | undefined;
}): boolean {
	if (!env.secret || !env.domaine) return false;
	const relances = domaineDe(env.relancesEmail);
	const letikette = domaineDe(env.authEmail);
	return relances !== null && letikette !== null && relances !== letikette;
}
