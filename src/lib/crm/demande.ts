import { normaliserEmail } from './empreinte';
import type { Parcours } from './parcours';
import type { Cible } from './statuts';
import { OFFRES, PARTENARIAT_CABINET } from '../config/tarifs';

/**
 * UNE OFFRE DEMANDÉE SUR LE SITE (19/10/2026, audit stratégique, lot 6).
 *
 * Le diagnostic complet, la réclamation clé en main et le pilote se vendent SUR
 * DEMANDE (décision 3 : devis et facture du fondateur, hors Paddle) ; l'offre fondateurs
 * passera par Paddle, mais se demande d'abord. Le formulaire crée le prospect au CRM avec
 * le parcours de l'offre et sa source, et une tâche pour lui répondre.
 *
 * ⚠️ LA PERSONNE A ÉCRIT LA PREMIÈRE : elle est informée (elle a lu la mention du
 * formulaire) et son contact compte comme venu d'elle. Rien n'est vendu en ligne.
 */

export const OFFRES_DEMANDABLES = [
	'diagnosticComplet',
	'reclamation',
	'pilote',
	'fondateurs',
	'partenariat'
] as const;
export type OffreDemandable = (typeof OFFRES_DEMANDABLES)[number];

/** Le parcours de vente de chaque offre, au CRM. */
export const PARCOURS_DE_L_OFFRE: Readonly<Record<OffreDemandable, Parcours>> = {
	diagnosticComplet: 'PME_LOGICIEL',
	reclamation: 'FOURNISSEUR_PUBLIC',
	pilote: 'PILOTE',
	fondateurs: 'PME_LOGICIEL',
	partenariat: 'EXPERT_COMPTABLE'
};

/** Le nom de l'offre, lu dans la grille. */
export function nomDeLOffre(offre: OffreDemandable): string {
	return offre === 'partenariat' ? PARTENARIAT_CABINET.nom : OFFRES[offre].nom;
}

/** Un cabinet comptable qui demande le partenariat ; une entreprise sinon. */
export function cibleDeLOffre(offre: OffreDemandable): Cible {
	return offre === 'partenariat' ? 'CABINET' : 'PME';
}

export interface Demande {
	readonly offre: OffreDemandable;
	readonly nom?: string;
	readonly entreprise: string;
	readonly email: string;
	readonly telephone?: string;
	readonly message?: string;
}

export type LectureDeDemande =
	| { readonly ok: true; readonly demande: Demande }
	| { readonly ok: false; readonly robot: true }
	| { readonly ok: false; readonly robot?: false; readonly erreur: string };

const FORME_D_ADRESSE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function propre(valeur: unknown, longueur: number): string | undefined {
	if (typeof valeur !== 'string') return undefined;
	const net = valeur.replace(/\s+/g, ' ').trim().slice(0, longueur);
	return net === '' ? undefined : net;
}

/** Ce que le formulaire envoie, lu sans rien croire : nettoyé, borné, validé. */
export function lireDemande(brute: {
	readonly offre: unknown;
	readonly nom?: unknown;
	readonly entreprise: unknown;
	readonly email: unknown;
	readonly telephone?: unknown;
	readonly message?: unknown;
	/** Le champ invisible : un humain le laisse vide. */
	readonly piege?: unknown;
}): LectureDeDemande {
	if (typeof brute.piege === 'string' && brute.piege.trim() !== '')
		return { ok: false, robot: true };
	const offre = OFFRES_DEMANDABLES.find((o) => o === brute.offre);
	if (offre === undefined) return { ok: false, erreur: 'Cette offre n’existe pas.' };
	const entreprise = propre(brute.entreprise, 200);
	if (entreprise === undefined) return { ok: false, erreur: 'Le nom de votre entreprise manque.' };
	const email = typeof brute.email === 'string' ? normaliserEmail(brute.email) : '';
	if (!FORME_D_ADRESSE.test(email) || email.length > 200) {
		return { ok: false, erreur: 'Cette adresse e-mail n’a pas la forme d’une adresse.' };
	}
	const nom = propre(brute.nom, 120);
	const telephone = propre(brute.telephone, 40);
	const message =
		typeof brute.message === 'string' && brute.message.trim() !== ''
			? brute.message.trim().slice(0, 2000)
			: undefined;
	return {
		ok: true,
		demande: {
			offre,
			...(nom === undefined ? {} : { nom }),
			entreprise,
			email,
			...(telephone === undefined ? {} : { telephone }),
			...(message === undefined ? {} : { message })
		}
	};
}
