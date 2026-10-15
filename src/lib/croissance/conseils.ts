import type { DatesDesEtapes, Etape } from './etapes';

/**
 * LES CONSEILS DE PLUME : QUOI ENVOYER, ET QUAND (16/10/2026).
 *
 * Quatre messages, chacun attaché à une étape de départ, avec un délai et une
 * fenêtre de validité. ⚠️ LA FENÊTRE EST CE QUI PROTÈGE LES COMPTES ANCIENS : à la
 * mise en service, un établissement inscrit il y a deux mois ne reçoit pas une
 * « bienvenue ». La cadence (deux jours au moins entre deux conseils) se compte
 * pour tout l'établissement. Le créneau (semaine, 9 h-18 h) est appliqué par
 * l'appelant, qui connaît le calendrier.
 */

export const CLES_CONSEILS = [
	'bienvenue',
	'il-manque-vos-factures',
	'ce-qui-vous-est-du',
	'ce-qui-partirait'
] as const;
export type CleConseil = (typeof CLES_CONSEILS)[number];

const JOUR = 24 * 60 * 60 * 1000;
export const ECART_MINIMAL_MS = 2 * JOUR;

interface Regle {
	readonly cle: CleConseil;
	readonly depart: Etape;
	readonly delai: number;
	/** Au-delà de `départ + validité`, le conseil ne part plus. Couvre un week-end. */
	readonly validite: number;
	/** Une étape qui, franchie, rend le conseil inutile. */
	readonly sauf?: Etape;
}

const REGLES: readonly Regle[] = [
	{ cle: 'bienvenue', depart: 'INSCRIT', delai: 0, validite: 4 * JOUR },
	{
		cle: 'il-manque-vos-factures',
		depart: 'INSCRIT',
		delai: JOUR,
		validite: 7 * JOUR,
		sauf: 'FACTURES_DEPOSEES'
	},
	{ cle: 'ce-qui-vous-est-du', depart: 'MONTANT_REVELE', delai: 0, validite: 4 * JOUR },
	{
		cle: 'ce-qui-partirait',
		depart: 'MONTANT_REVELE',
		delai: 3 * JOUR,
		validite: 10 * JOUR,
		sauf: 'RELANCES_ACTIVEES'
	}
];

export function prochainConseil(
	etapes: DatesDesEtapes,
	envoyes: readonly { readonly cle: CleConseil; readonly le: number }[],
	maintenant: number
): { cle: CleConseil; des: number } | null {
	const dernier = envoyes.reduce((m, x) => Math.max(m, x.le), 0);
	let meilleur: { cle: CleConseil; des: number } | null = null;
	for (const r of REGLES) {
		if (envoyes.some((x) => x.cle === r.cle)) continue;
		const depart = etapes[r.depart];
		if (depart === undefined) continue;
		if (r.sauf !== undefined && etapes[r.sauf] !== undefined) continue;
		const fin = depart + r.validite;
		const des = Math.max(depart + r.delai, dernier === 0 ? 0 : dernier + ECART_MINIMAL_MS);
		if (maintenant > fin || des > fin) continue;
		if (meilleur === null || des < meilleur.des) meilleur = { cle: r.cle, des };
	}
	return meilleur;
}
