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

/**
 * LES GESTES DU DOSSIER, ADRESSABLES (`?faire=…`, 23/10/2026) : un lien ouvre la
 * conversation du dossier déjà répondue — « La relire » sous le mot de Plume, une
 * notification, un geste confirmé dans la conversation libre.
 */
export const GESTES_ADRESSABLES = [
	'ECRIRE',
	'RELIRE',
	'REPONSE',
	'QUESTIONS',
	'RAPPEL',
	'CONSEIL',
	'CLASSER',
	'PROMESSE',
	'RAPPEL_DU_JOUR',
	'PROCEDURE',
	'ETAPE'
] as const;
export type GesteAdressable = (typeof GESTES_ADRESSABLES)[number];
