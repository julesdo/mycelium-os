import type { DepotAffiche } from '../../ui';

/** Un dépôt de la salle, avec sa date de dépôt, que `listerImports` rend toujours. */
export type DepotDemo = DepotAffiche & { readonly deposeLe: number };

/**
 * LES QUATRE ÉTATS D'UN DÉPÔT.
 *
 * C'est la seule façon de vérifier que la règle tient : « un import qui annonce
 * 198 factures sans mentionner les deux lignes écartées ment par omission ».
 * Les nombres doivent être lisibles sans geste sur les quatre, et seules les
 * RAISONS ligne à ligne ont le droit de se replier.
 *
 * Deux lecteurs, d'où ce fichier hors de `communes.ts` : la démonstration des
 * quatre états côte à côte (`showroom.tsx`), et la famille de l'import
 * (`import.tsx`), qui les montre sur sa liste et sur la page d'un dépôt. Un
 * dépôt est une donnée, pas un calcul : ils restent écrits.
 */

export const DEPOT_A_ECARTS_DEMO: DepotDemo = {
	id: 'd1',
	filename: 'FEC-2026-exercice.txt',
	statut: 'TERMINE',
	etape: 'Lecture terminée.',
	// Le cas qui compte : un import largement réussi, MAIS deux lignes
	// perdues. Elles doivent crever les yeux au milieu du succès.
	bilan: {
		facturesCreees: 198,
		reglementsCrees: 142,
		debiteursCrees: 37,
		facturesDejaConnues: 12,
		horsPerimetre: 486,
		reglementsOrphelins: 3,
		ignoreesTotal: 2,
		ignorees: [
			{ texte: 'l1', raison: 'Ligne 4128 : montant illisible (« 1 2З0,00 » — un З cyrillique).' },
			{ texte: 'l2', raison: 'Ligne 4310 : aucune date d’échéance, et aucun délai au contrat.' }
		]
	},
	deposeLe: Date.parse('2026-09-09T08:12:00Z')
};

export const DEPOT_PARFAIT_DEMO: DepotDemo = {
	id: 'd2',
	filename: 'export-ventes-aout.csv',
	statut: 'TERMINE',
	etape: 'Lecture terminée.',
	// Un import parfait : aucun dépliant ne doit s'ouvrir, et le
	// hors-périmètre reste en gris — ce n'est pas une anomalie.
	bilan: {
		facturesCreees: 41,
		reglementsCrees: 0,
		debiteursCrees: 4,
		facturesDejaConnues: 0,
		horsPerimetre: 96,
		reglementsOrphelins: 0,
		ignoreesTotal: 0,
		ignorees: []
	},
	deposeLe: Date.parse('2026-09-08T16:40:00Z')
};

export const DEPOT_EN_COURS_DEMO: DepotDemo = {
	id: 'd3',
	filename: 'FA-2026-0412.pdf',
	statut: 'EN_COURS',
	etape: 'Extraction des lignes par le modèle…',
	deposeLe: Date.parse('2026-09-09T09:02:00Z')
};

export const DEPOT_EN_ECHEC_DEMO: DepotDemo = {
	id: 'd4',
	filename: 'scan-caisse.jpg',
	statut: 'ECHOUE',
	erreur: 'Le fichier n’est pas une facture de vente : aucun montant ni référence trouvés.',
	deposeLe: Date.parse('2026-09-07T11:20:00Z')
};

export const DEPOTS_DEMO: readonly DepotDemo[] = [
	DEPOT_A_ECARTS_DEMO,
	DEPOT_PARFAIT_DEMO,
	DEPOT_EN_COURS_DEMO,
	DEPOT_EN_ECHEC_DEMO
];
