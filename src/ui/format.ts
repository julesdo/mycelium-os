/**
 * Le formatage des chiffres, au même endroit pour tout le produit.
 *
 * Un taux EGalim et un écart en euros sont les deux seules données que le
 * gérant retiendra de l'écran. Les formater à trois endroits différemment,
 * c'est lui faire croire à trois chiffres différents.
 */

const EUROS = new Intl.NumberFormat('fr-FR', {
	style: 'currency',
	currency: 'EUR',
	maximumFractionDigits: 0
});

const POURCENT = new Intl.NumberFormat('fr-FR', {
	style: 'percent',
	maximumFractionDigits: 0
});

/** Un montant en euros, arrondi à l'unité. Les centimes n'aident personne ici. */
export const euros = (montant: number): string => EUROS.format(montant);

/** Une fraction (0 à 1) en pourcentage entier. */
export const pourcent = (fraction: number): string => POURCENT.format(fraction);

/** Le pluriel français, pour ne pas écrire « 1 produits ». */
export const pluriel = (n: number): string => (Math.abs(n) > 1 ? 's' : '');

/**
 * Les huit familles du barème. Le type est écrit ici, une fois, plutôt que
 * réimporté du backend : c'est un vocabulaire d'écran, et l'interface doit
 * pouvoir se rendre — dans le showroom notamment — sans que Convex existe.
 */
export type Famille =
	| 'VIANDE'
	| 'POISSON'
	| 'FRUITS_LEGUMES'
	| 'LAITIERS'
	| 'EPICERIE_SECHE'
	| 'EPICERIE_APPERTISEE'
	| 'BOISSONS'
	| 'AUTRE';

/** Les familles de produits, telles qu'un gérant les nomme. */
export const FAMILLES: Record<Famille, string> = {
	VIANDE: 'Viande',
	POISSON: 'Poisson',
	FRUITS_LEGUMES: 'Fruits et légumes',
	LAITIERS: 'Produits laitiers',
	EPICERIE_SECHE: 'Épicerie sèche',
	EPICERIE_APPERTISEE: 'Épicerie appertisée',
	BOISSONS: 'Boissons',
	AUTRE: 'Autre'
};
