/**
 * LES RUBRIQUES DE LA PAGE D'UN DOSSIER, ADRESSABLES (`?ouvrir=…`).
 *
 * ⚠️ DANS UN MODULE À PART, ET C'EST UNE MESURE (09/10/2026). La route du dossier
 * les lit pour valider son adresse, et cette partie d'une route se charge avec
 * l'application, avant même qu'on ouvre un dossier. Elles vivaient dans
 * `screens/creance.tsx` : l'écran entier, et avec lui les courriers, la défense
 * et les avatars, partait dans le paquet d'entrée de chaque page.
 */
export const SECTIONS_CREANCE = [
	'courriers',
	'decompte',
	'pieces',
	'litige',
	'voies',
	'suivi'
] as const;
export type SectionCreance = (typeof SECTIONS_CREANCE)[number];
