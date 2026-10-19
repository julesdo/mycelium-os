import type { DatesDesEtapes, Etape } from './etapes';
import { JOURS_OFFRE_DE_BIENVENUE } from '../config/tarifs';

/**
 * LES CONSEILS DE PLUME : QUOI ENVOYER, ET QUAND (16/10/2026).
 *
 * Des messages attachés chacun à une étape de départ, avec un délai et une fenêtre de
 * validité. ⚠️ LA FENÊTRE EST CE QUI PROTÈGE LES COMPTES ANCIENS : à la mise en service,
 * un établissement inscrit il y a deux mois ne reçoit pas une « bienvenue ». La cadence
 * (deux jours au moins entre deux conseils) se compte pour tout l'établissement. Le
 * créneau (semaine, 9 h-18 h) est appliqué par l'appelant, qui connaît le calendrier.
 *
 * L'OFFRE DE BIENVENUE (19/10/2026, audit, lot 7) : après un diagnostic, deux rappels
 * pendant les jours de l'offre (`JOURS_OFFRE_DE_BIENVENUE`). La garde est PAR RÈGLE : les
 * conseils d'accueil restent bornés aux premières semaines du compte, ceux du diagnostic
 * par leur propre fenêtre (un compte ancien qui lance un diagnostic reçoit ses rappels,
 * jamais la « bienvenue »). Ils parlent d'un achat : aux administrateurs seulement, et
 * l'abonnement se relit avant l'envoi (`convex/croissance/conseils.ts`).
 *
 * Le rapport du diagnostic (`rapport-diagnostic`) n'est pas une règle : c'est un e-mail
 * transactionnel, envoyé à la fin de la lecture, hors créneau. Il se note comme un
 * conseil, et la cadence des rappels compte à partir de lui.
 */

export const CLES_CONSEILS = [
	'bienvenue',
	'il-manque-vos-factures',
	'ce-qui-vous-est-du',
	'ce-qui-partirait',
	'rapport-diagnostic',
	'offre-de-bienvenue',
	'offre-de-bienvenue-fin'
] as const;
export type CleConseil = (typeof CLES_CONSEILS)[number];

/** Les conseils qui partent par le circuit des conseils ; le rapport a son propre modèle. */
export type CleConseilEnvoye = Exclude<CleConseil, 'rapport-diagnostic'>;
export const CLES_CONSEILS_ENVOYES = CLES_CONSEILS.filter(
	(c): c is CleConseilEnvoye => c !== 'rapport-diagnostic'
);

const JOUR = 24 * 60 * 60 * 1000;
export const ECART_MINIMAL_MS = 2 * JOUR;

/**
 * LES CONSEILS D'ACCUEIL NE VALENT QUE POUR LES PREMIÈRES SEMAINES DU COMPTE. ⚠️ C'est ce
 * qui protège les clients anciens : à leur premier relevé, une étape comme « montant
 * révélé » est datée du jour où on la remarque, et sans cette borne un compte inscrit
 * depuis un an recevrait « Ce qu'on vous doit » comme un nouvel inscrit.
 */
export const PREMIERES_SEMAINES_MS = 30 * JOUR;

interface Regle {
	readonly cle: CleConseilEnvoye;
	readonly depart: Etape;
	readonly delai: number;
	/** Au-delà de `départ + validité`, le conseil ne part plus. Couvre un week-end. */
	readonly validite: number;
	/** Des étapes dont une seule, franchie, rend le conseil inutile. */
	readonly sauf?: readonly Etape[];
	/** Borné aux premières semaines du compte (les conseils d'accueil). */
	readonly accueil: boolean;
	/** Il parle d'un achat : aux administrateurs seulement. */
	readonly administrateurs?: boolean;
}

const REGLES: readonly Regle[] = [
	{ cle: 'bienvenue', depart: 'INSCRIT', delai: 0, validite: 4 * JOUR, accueil: true },
	{
		cle: 'il-manque-vos-factures',
		depart: 'INSCRIT',
		delai: JOUR,
		validite: 7 * JOUR,
		sauf: ['FACTURES_DEPOSEES'],
		accueil: true
	},
	{
		cle: 'ce-qui-vous-est-du',
		depart: 'MONTANT_REVELE',
		delai: 0,
		validite: 4 * JOUR,
		// Le rapport du diagnostic le dit déjà, chiffres compris.
		sauf: ['DIAGNOSTIC_RENDU'],
		accueil: true
	},
	{
		cle: 'ce-qui-partirait',
		depart: 'MONTANT_REVELE',
		delai: 3 * JOUR,
		validite: 10 * JOUR,
		sauf: ['RELANCES_ACTIVEES'],
		accueil: true
	},
	{
		cle: 'offre-de-bienvenue',
		depart: 'DIAGNOSTIC_RENDU',
		delai: 7 * JOUR,
		validite: (JOURS_OFFRE_DE_BIENVENUE - 3) * JOUR,
		sauf: ['ESSAI', 'ABONNE'],
		accueil: false,
		administrateurs: true
	},
	{
		cle: 'offre-de-bienvenue-fin',
		depart: 'DIAGNOSTIC_RENDU',
		delai: (JOURS_OFFRE_DE_BIENVENUE - 3) * JOUR,
		validite: (JOURS_OFFRE_DE_BIENVENUE - 1) * JOUR,
		sauf: ['ESSAI', 'ABONNE'],
		accueil: false,
		administrateurs: true
	}
];

/** Les conseils qui ne partent qu'aux administrateurs de l'établissement. */
export const CONSEILS_DES_ADMINS: ReadonlySet<CleConseil> = new Set(
	REGLES.filter((r) => r.administrateurs === true).map((r) => r.cle)
);

export function prochainConseil(
	etapes: DatesDesEtapes,
	envoyes: readonly { readonly cle: CleConseil; readonly le: number }[],
	maintenant: number
): { cle: CleConseilEnvoye; des: number } | null {
	const inscrit = etapes.INSCRIT;
	if (inscrit === undefined) return null;
	const nouveau = maintenant - inscrit <= PREMIERES_SEMAINES_MS;
	const dernier = envoyes.reduce((m, x) => Math.max(m, x.le), 0);
	let meilleur: { cle: CleConseilEnvoye; des: number } | null = null;
	for (const r of REGLES) {
		if (r.accueil && !nouveau) continue;
		if (envoyes.some((x) => x.cle === r.cle)) continue;
		const depart = etapes[r.depart];
		if (depart === undefined) continue;
		if (r.sauf?.some((e) => etapes[e] !== undefined)) continue;
		const fin = depart + r.validite;
		const des = Math.max(depart + r.delai, dernier === 0 ? 0 : dernier + ECART_MINIMAL_MS);
		if (maintenant > fin || des > fin) continue;
		if (meilleur === null || des < meilleur.des) meilleur = { cle: r.cle, des };
	}
	return meilleur;
}
