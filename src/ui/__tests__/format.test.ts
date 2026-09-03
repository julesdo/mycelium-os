import { describe, it, expect } from 'vitest';
import { tauxLisible, eurosCentimesCourts } from '../format';
import { fraction } from '../../lib/socle/montants';

/**
 * LE TAUX, RENDU LISIBLE SANS JAMAIS ÊTRE DIVISÉ AVANT L'AFFICHAGE.
 *
 * Un taux de pénalité est une fraction exacte : le taux BCE majoré de dix
 * points ne tombe pas juste en décimal. Le convertir en `number` pour
 * l'afficher, puis le réutiliser pour calculer, c'est faire entrer une erreur
 * d'arrondi dans un chiffre que le débiteur refera à la main.
 *
 * Cette fonction est le SEUL endroit du produit où la division a lieu, et elle
 * ne rend qu'une chaîne — impossible de recalculer avec son résultat.
 */
describe('tauxLisible', () => {
	it('rend un taux de pénalité au centième de point', () => {
		// 2,40 % de BCE + 10 points = 12,40 %.
		expect(tauxLisible(fraction(1240n, 10000n))).toBe('12,40 %');
	});

	it('conserve les deux décimales même quand elles sont nulles', () => {
		// « 5 % » et « 5,00 % » ne disent pas la même chose sur un décompte :
		// le second dit que la précision a été vérifiée.
		expect(tauxLisible(fraction(500n, 10000n))).toBe('5,00 %');
	});

	it('ne perd pas la seconde décimale d’un taux légal publié', () => {
		// Les arrêtés semestriels publient trois chiffres après la virgule sur le
		// taux légal ; tronquer au dixième ferait diverger le décompte du barème.
		expect(tauxLisible(fraction(371n, 10000n))).toBe('3,71 %');
	});

	it('rend un taux nul sans signe ni artefact', () => {
		expect(tauxLisible(fraction(0n, 10000n))).toBe('0,00 %');
	});
});

/**
 * LE MONTANT D'AFFICHAGE, QUAND LES CENTIMES NE DISENT RIEN.
 *
 * `eurosCentimes` garde toujours ses deux décimales, et c'est non négociable
 * sur un décompte : le centime affiché est celui qu'on réclame. Mais un montant
 * légal rond, posé en corps de soixante-dix pixels sur une page d'accueil, n'a
 * pas de centimes à montrer — « 40,00 € » y déborde sa colonne pour ne rien
 * ajouter.
 *
 * LA RÈGLE EST STRICTE : on ne raccourcit QUE si les centimes valent zéro.
 * 40,50 € reste 40,50 €. Un arrondi d'affichage sur un montant qui en a
 * mentirait, et c'est exactement ce que tout ce produit évite.
 */
describe('eurosCentimesCourts', () => {
	it('retire les centimes quand ils sont nuls', () => {
		expect(eurosCentimesCourts(4000n)).toBe('40\u00A0€');
	});

	it('les garde dès qu’ils portent une information', () => {
		expect(eurosCentimesCourts(4050n)).toBe('40,50\u00A0€');
		expect(eurosCentimesCourts(4001n)).toBe('40,01\u00A0€');
	});

	it('groupe les milliers comme le format long', () => {
		expect(eurosCentimesCourts(1_234_500n)).toBe('12\u00A0345\u00A0€');
	});

	it('conserve le signe d’un montant négatif', () => {
		expect(eurosCentimesCourts(-4000n)).toBe('−40\u00A0€');
	});
});
