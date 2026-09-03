/**
 * Le formatage des chiffres, au même endroit pour tout le produit.
 *
 * Un montant réclamé est la donnée que le gérant retiendra de l'écran. Le
 * formater à trois endroits différemment, c'est lui faire croire à trois
 * chiffres différents.
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
 * Un montant de recouvrement, porté en CENTIMES.
 *
 * POURQUOI IL NE PASSE PAS PAR `euros()`. Celui-ci prend un `number` et arrondit
 * à l'unité, ce qui convient à un ordre de grandeur. Un décompte de créance ne
 * s'arrondit jamais : le centime affiché est celui qui sera réclamé, et c'est
 * celui que le débiteur refera à la main.
 *
 * Le `bigint` arrive tel quel de Convex (`v.int64()`) et n'est JAMAIS converti
 * en `number` au passage : c'est précisément ce que toute la chaîne évite
 * depuis le parseur jusqu'ici.
 */
export function eurosCentimes(centimes: bigint): string {
	const negatif = centimes < 0n;
	const absolu = negatif ? -centimes : centimes;

	const entiers = (absolu / 100n).toString();
	const cents = (absolu % 100n).toString().padStart(2, '0');
	const groupes = entiers.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');

	return `${negatif ? '−' : ''}${groupes},${cents}\u00A0€`;
}

/** Une date ISO `AAAA-MM-JJ` telle qu'un gérant la lit. */
const DATE_COURTE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

export function dateCourte(iso: string): string {
	const [annee, mois, jour] = iso.split('-').map(Number);
	if (annee === undefined || mois === undefined || jour === undefined) return iso;
	return DATE_COURTE.format(new Date(Date.UTC(annee, mois - 1, jour)));
}
