import { normaliserEmail } from './empreinte';
import { CONSERVATION_MS } from './consentement';

/**
 * LA LISTE D'ATTENTE DE LA PROCÉDURE SANS JUGE (19/10/2026, audit stratégique, décision 16).
 *
 * Une adresse s'inscrit pour être prévenue le jour où la voie s'ouvre. DOUBLE
 * CONFIRMATION : rien n'est gardé comme inscrit avant que la personne ait cliqué le lien
 * reçu, puis le bouton de la page (un lien ouvert par l'antivirus d'une messagerie ne
 * confirme rien). L'état de la voie se lit au registre (`PROCEDURES[…].peutEvaluer()`),
 * jamais ici.
 */

/** La seule liste, pour l'instant. */
export const LISTE_SANS_JUGE = 'procedure-sans-juge';

/** Le lien de confirmation vaut sept jours ; au-delà, l'inscription non confirmée s'efface. */
export const CONFIRMATION_VALABLE_MS = 7 * 24 * 60 * 60 * 1000;

/** Une inscription confirmée se garde trois ans au plus, comme un contact venu du prospect. */
export const CONSERVATION_INSCRIPTION_MS = CONSERVATION_MS;

export interface Inscription {
	readonly email: string;
	readonly entreprise?: string;
}

export type LectureDInscription =
	| { readonly ok: true; readonly inscription: Inscription }
	| { readonly ok: false; readonly robot: true }
	| { readonly ok: false; readonly robot?: false; readonly erreur: string };

const FORME_D_ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Ce que le formulaire envoie, lu sans rien croire : nettoyé, borné, validé. */
export function lireInscription(brute: {
	readonly email: unknown;
	readonly entreprise?: unknown;
	/** Le champ invisible : un humain le laisse vide. */
	readonly piege?: unknown;
}): LectureDInscription {
	if (typeof brute.piege === 'string' && brute.piege.trim() !== '')
		return { ok: false, robot: true };
	const email = typeof brute.email === 'string' ? normaliserEmail(brute.email).slice(0, 200) : '';
	if (!FORME_D_ADRESSE.test(email))
		return { ok: false, erreur: 'Cette adresse e-mail ne semble pas complète.' };
	const entreprise =
		typeof brute.entreprise === 'string'
			? brute.entreprise.replace(/\s+/g, ' ').trim().slice(0, 200)
			: '';
	return { ok: true, inscription: { email, ...(entreprise === '' ? {} : { entreprise }) } };
}

/** Une inscription à effacer : non confirmée passé son lien, ou confirmée depuis trop longtemps. */
export function estEchue(
	inscription: { readonly creeLe: number; readonly confirmeeLe?: number },
	maintenant: number
): boolean {
	if (inscription.confirmeeLe === undefined)
		return maintenant - inscription.creeLe > CONFIRMATION_VALABLE_MS;
	return maintenant - inscription.confirmeeLe > CONSERVATION_INSCRIPTION_MS;
}
