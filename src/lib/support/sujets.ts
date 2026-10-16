/**
 * LES SUJETS D'UNE CONVERSATION DE SUPPORT (16/10/2026) — une liste FERMÉE, la même pour le
 * gérant (un sujet en mots sur sa carte), pour Plume (qui en propose un) et pour la mesure de
 * l'équipe (le tableau par sujet). Une liste ouverte ne se compte pas.
 */

import type { Acte } from './passage';

export const SUJETS = [
	'RELANCES',
	'FACTURES_DOCUMENTS',
	'CONNEXIONS',
	'ABONNEMENT',
	'COMPTE_ACCES',
	'PLUME',
	'DONNEES_PERSONNELLES',
	'BUG',
	'AUTRE'
] as const;
export type Sujet = (typeof SUJETS)[number];

export const LIBELLES_DES_SUJETS: Record<Sujet, string> = {
	RELANCES: 'Relances',
	FACTURES_DOCUMENTS: 'Factures et documents',
	CONNEXIONS: 'Logiciels branchés',
	ABONNEMENT: 'Abonnement',
	COMPTE_ACCES: 'Compte et accès',
	PLUME: 'Plume',
	DONNEES_PERSONNELLES: 'Données personnelles',
	BUG: 'Un problème technique',
	AUTRE: 'Autre question'
};

/** Le sujet que porte une demande d'acte (`passage.ts`). */
export const SUJET_DE_L_ACTE = {
	REMBOURSEMENT: 'ABONNEMENT',
	PRELEVEMENT: 'ABONNEMENT',
	TITULAIRE: 'COMPTE_ACCES',
	ACCES_PERDU: 'COMPTE_ACCES',
	COMPROMISSION: 'COMPTE_ACCES',
	DONNEES_PERSONNELLES: 'DONNEES_PERSONNELLES'
} as const satisfies Record<Acte, Sujet>;

/** Un compte compromis et l'exercice d'un droit sur ses données vont au seul FONDATEUR. */
export function acteReserveAuFondateur(acte: Acte): boolean {
	return acte === 'DONNEES_PERSONNELLES' || acte === 'COMPROMISSION';
}

/**
 * Les données personnelles se traitent à part : jamais par Plume, directement au rôle
 * FONDATEUR, et le délai de réponse se compte en jours calendaires (un mois).
 */
export function sujetReserveAuFondateur(sujet: Sujet): boolean {
	return sujet === 'DONNEES_PERSONNELLES';
}
