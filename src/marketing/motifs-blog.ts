/**
 * Les motifs des couvertures illustrées du blog, et les catégories.
 *
 * Un module sans JSX : la configuration de content-collections le lit au build
 * pour valider l'en-tête des articles, et les pages le lisent pour dessiner.
 */
export const ILLUSTRATIONS = [
	'facture',
	'decompte',
	'indemnites',
	'calendrier',
	'relance',
	'paiement',
	'sceau',
	'horloge',
	'declaration',
	'echeancier',
	'loupe'
] as const;
export type Illustration = (typeof ILLUSTRATIONS)[number];

export const CATEGORIES = ['La loi', 'Procédures', 'Trésorerie', 'Méthode', 'Letikette'] as const;
export type CategorieBlog = (typeof CATEGORIES)[number];

/**
 * LES QUATRE PILIERS DE LA LIGNE ÉDITORIALE (19/10/2026, audit stratégique) : ce dont le
 * blog parle, à côté de la catégorie qui dit quel genre d'article c'est. Facultatif : un
 * article qui ne relève d'aucun pilier n'en porte pas.
 */
export const PILIERS = [
	'L’argent oublié',
	'Le secteur public',
	'Le transport',
	'Les règles qui changent'
] as const;
export type PilierBlog = (typeof PILIERS)[number];
