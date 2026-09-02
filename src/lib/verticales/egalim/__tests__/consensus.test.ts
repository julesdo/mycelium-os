import { describe, it, expect } from 'vitest';
import { SEUIL_CONSENSUS, doitEtreDemande, type EntreeCache } from '../consensus';

function entree(p: Partial<EntreeCache> = {}): EntreeCache {
	return {
		confidence: 0.99,
		confirmationsCount: 0,
		contested: false,
		...p
	};
}

describe('doitEtreDemande', () => {
	it('demande un libellé jamais vu', () => {
		expect(doitEtreDemande(null, 'EPICERIE_SECHE')).toBe(true);
	});

	it('demande tant que le consensus n’est pas atteint', () => {
		expect(doitEtreDemande(entree({ confirmationsCount: SEUIL_CONSENSUS - 1 }), 'EPICERIE_SECHE')).toBe(
			true
		);
	});

	it('cesse de demander une fois le consensus atteint', () => {
		expect(doitEtreDemande(entree({ confirmationsCount: SEUIL_CONSENSUS }), 'EPICERIE_SECHE')).toBe(
			false
		);
	});

	it('redemande un libellé contesté, même au-delà du consensus', () => {
		expect(
			doitEtreDemande(
				entree({ confirmationsCount: SEUIL_CONSENSUS + 5, contested: true }),
				'EPICERIE_SECHE'
			)
		).toBe(true);
	});

	it('demande toujours la viande, quel que soit le consensus', () => {
		expect(doitEtreDemande(entree({ confirmationsCount: 99 }), 'VIANDE')).toBe(true);
	});

	it('demande toujours le poisson, quel que soit le consensus', () => {
		expect(doitEtreDemande(entree({ confirmationsCount: 99 }), 'POISSON')).toBe(true);
	});

	it('demande sous le seuil de confiance même avec du consensus', () => {
		expect(
			doitEtreDemande(entree({ confirmationsCount: 99, confidence: 0.4 }), 'EPICERIE_SECHE')
		).toBe(true);
	});
});

describe('SEUIL_CONSENSUS', () => {
	it('vaut au moins trois : deux gérants pressés peuvent cliquer pareil', () => {
		expect(SEUIL_CONSENSUS).toBeGreaterThanOrEqual(3);
	});
});
