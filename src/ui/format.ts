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

/**
 * Le même montant, mais DÉCOUPÉ, pour qu'un écran puisse porter ses centimes
 * dans un corps plus petit que ses unités.
 *
 * POURQUOI CETTE FONCTION EXISTE. Le produit a une exigence non négociable —
 * tout montant réclamé s'affiche au centime — et un écran d'accueil qui pose
 * ce montant en soixante-douze pixels. Les deux se contredisent : « 48 320,00 »
 * en corps plein déborde un téléphone, et le rendre plus petit pour qu'il tienne
 * ferait perdre au seul chiffre qui compte l'autorité qu'il doit avoir.
 *
 * La référence résout ça en posant les centimes à environ la moitié du corps
 * des unités. On lit le montant d'un coup d'œil, et le centime reste écrit noir
 * sur blanc pour qui le cherche. RIEN N'EST ARRONDI NI OMIS : c'est un découpage
 * d'affichage, pas une simplification du chiffre.
 *
 * Le découpage se fait ICI, et pas dans l'écran, pour la raison qui ouvre ce
 * fichier : un montant formaté à deux endroits est un montant qu'on finit par
 * afficher de deux façons.
 */
export function partsEurosCentimes(centimes: bigint): {
	signe: string;
	entiers: string;
	centimes: string;
} {
	const negatif = centimes < 0n;
	const absolu = negatif ? -centimes : centimes;

	const entiers = (absolu / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

	return {
		signe: negatif ? '−' : '',
		entiers,
		centimes: (absolu % 100n).toString().padStart(2, '0')
	};
}

/** Une date ISO `AAAA-MM-JJ` telle qu'un gérant la lit. */
const DATE_COURTE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

export function dateCourte(iso: string): string {
	const [annee, mois, jour] = iso.split('-').map(Number);
	if (annee === undefined || mois === undefined || jour === undefined) return iso;
	return DATE_COURTE.format(new Date(Date.UTC(annee, mois - 1, jour)));
}

/**
 * UNE DATE DITE PAR RAPPORT À AUJOURD'HUI — « dans 41 j », « il y a 12 j » —,
 * et la date exacte au-delà de quatre-vingt-dix jours.
 *
 * ⚠️ POURQUOI (relevé du 07/10/2026). Revolut Business écrit « Due in 2 days »
 * sur ses factures, pas « 9 oct. 2026 » : une échéance se lit en distance, et
 * « 27 oct. 2026 » oblige à compter de tête. Au-delà de trois mois la distance
 * ne dit plus rien d'utile (« dans 4 ans ») et la date exacte revient. Sur une
 * carte seulement : la page du dossier garde toujours la date exacte, et c'est
 * elle qui fait foi.
 *
 * ⚠️ SANS HORLOGE : \`aujourdHui\` est un argument, comme partout dans le produit.
 * Les deux dates sont des jours (AAAA-MM-JJ), comptés en UTC : aucune heure
 * d'été ne décale un jour.
 */
export function dateRelative(iso: string, aujourdHui: string): string {
	const jour = (texte: string): number | null => {
		const [annee, mois, j] = texte.split('-').map(Number);
		if (annee === undefined || mois === undefined || j === undefined) return null;
		const t = Date.UTC(annee, mois - 1, j);
		return Number.isNaN(t) ? null : t;
	};
	const cible = jour(iso);
	const base = jour(aujourdHui);
	if (cible === null || base === null) return dateCourte(iso);
	const ecart = Math.round((cible - base) / 86_400_000);
	if (Math.abs(ecart) > 90) return dateCourte(iso);
	if (ecart === 0) return 'aujourd’hui';
	if (ecart === 1) return 'demain';
	if (ecart === -1) return 'hier';
	return ecart > 0 ? `dans ${ecart} j` : `il y a ${-ecart} j`;
}

/**
 * Le jour `jours` jours après (ou avant) `iso`, en `AAAA-MM-JJ`. Compté en UTC,
 * comme `dateRelative` : aucune heure d'été ne fait sauter ni doubler un jour.
 */
export function jourDecale(iso: string, jours: number): string {
	const [annee, mois, jour] = iso.split('-').map(Number);
	if (annee === undefined || mois === undefined || jour === undefined) return iso;
	return new Date(Date.UTC(annee, mois - 1, jour + jours)).toISOString().slice(0, 10);
}

/*
  ⚠️ `dateLongue` — « jeudi 30 septembre 2026 » — A ÉTÉ RETIRÉE LE 30/09/2026.
  Elle n'existait que pour le sous-titre de l'écran du jour, que le fondateur a
  fait enlever avec son grand titre (« on s'en fout »). Le produit n'écrit plus
  que `dateCourte` : la date du jour vit désormais sous le chiffre qu'elle date.
*/

/**
 * Un taux, rendu lisible. LA DIVISION N'A LIEU QU'ICI.
 *
 * Les taux du décompte sont des fractions exactes — le taux BCE majoré de dix
 * points ne tombe pas juste en décimal. Tout le produit les transporte sous
 * cette forme, du paramètre juridique jusqu'à l'écran, précisément pour que
 * l'arrondi n'entre jamais dans un chiffre qu'on réclame.
 *
 * Cette fonction ne rend qu'une chaîne : on ne peut pas recalculer avec son
 * résultat, et c'est voulu.
 */
export { tauxLisible } from '../lib/verticales/recouvrement/taux-lisible';

/**
 * Un montant en centimes, sans ses centimes QUAND ILS SONT NULS.
 *
 * POUR L'AFFICHAGE SEULEMENT, et jamais sur un décompte. `eurosCentimes` garde
 * toujours ses deux décimales parce que le centime affiché est celui qu'on
 * réclame, et que le débiteur le refera à la main. Mais un montant légal rond,
 * posé en corps de soixante-dix pixels sur la page d'accueil, n'a pas de
 * centimes à montrer : « 40,00 € » y déborde sa colonne pour ne rien ajouter.
 *
 * LA RÈGLE EST STRICTE. On ne raccourcit QUE si les centimes valent zéro :
 * 40,50 € reste 40,50 €. Il n'y a pas d'arrondi ici, seulement l'omission d'un
 * zéro qui ne dit rien.
 */
export function eurosCentimesCourts(centimes: bigint): string {
	const long = eurosCentimes(centimes);
	return centimes % 100n === 0n ? long.replace(',00', '') : long;
}
