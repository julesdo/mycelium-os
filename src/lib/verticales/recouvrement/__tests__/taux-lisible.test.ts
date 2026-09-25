import { describe, it, expect } from 'vitest';
import { fraction } from '../../../socle/montants';
import { tauxLisible } from '../taux-lisible';

describe('le taux imprimé', () => {
	it('garde deux décimales au minimum', () => {
		expect(tauxLisible(fraction(1240n, 10000n))).toBe('12,40 %');
		expect(tauxLisible(fraction(500n, 10000n))).toBe('5,00 %');
		expect(tauxLisible(fraction(0n, 10000n))).toBe('0,00 %');
	});

	it('ne tronque plus la troisième décimale', () => {
		// 12,345 % s'imprimait « 12,34 % » : le lecteur qui refait le calcul
		// n'aurait pas retrouvé les intérêts du décompte.
		expect(tauxLisible(fraction(12345n, 100000n))).toBe('12,345 %');
	});

	it('signale un taux qui ne s’écrit pas exactement', () => {
		// Un tiers : le calcul reste exact en fraction, l'affichage le dit.
		expect(tauxLisible(fraction(1n, 3n))).toBe('33,333333… %');
	});
});
