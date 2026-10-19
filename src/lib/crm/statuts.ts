/**
 * LES STATUTS D'UN PROSPECT, ET LEURS NOMS (16/10/2026).
 *
 * Huit statuts, dans l'ordre du pipeline. « Stop » est l'opposition : le prospect
 * ne veut plus être contacté, ses coordonnées sont effacées.
 */

export const STATUTS_PROSPECT = [
	'A_CONTACTER',
	'CONTACTE',
	'RELANCE',
	'A_REPONDU',
	'INTERESSE',
	'INSCRIT',
	'GAGNE',
	'PERDU',
	'STOP'
] as const;
export type StatutProspect = (typeof STATUTS_PROSPECT)[number];

export const LIBELLES_DES_STATUTS: Record<StatutProspect, string> = {
	A_CONTACTER: 'À contacter',
	CONTACTE: 'Contacté',
	RELANCE: 'Relancé',
	A_REPONDU: 'A répondu',
	INTERESSE: 'Intéressé',
	INSCRIT: 'Inscrit',
	GAGNE: 'Gagné',
	PERDU: 'Perdu',
	STOP: 'Stop'
};

export const CIBLES = ['PME', 'CABINET', 'AUTRE'] as const;
export type Cible = (typeof CIBLES)[number];

export const LIBELLES_DES_CIBLES: Record<Cible, string> = {
	PME: 'PME',
	CABINET: 'Cabinet comptable',
	AUTRE: 'Autre'
};

/** Un statut qui ne se travaille plus : il ne demande pas de prochaine action. */
export function statutClos(statut: StatutProspect): boolean {
	return statut === 'INSCRIT' || statut === 'GAGNE' || statut === 'PERDU' || statut === 'STOP';
}
