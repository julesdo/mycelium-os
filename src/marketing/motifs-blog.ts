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
