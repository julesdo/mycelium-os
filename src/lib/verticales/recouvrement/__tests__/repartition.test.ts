import { describe, it, expect } from 'vitest';
import { depuisEuros, versEuros } from '../../../socle/montants';
import { repartirSelonLaLoi } from '../lettrage';

describe('la répartition d’un versement selon l’article 1342-10', () => {
	const factures = [
		{ reference: 'F-3', resteDu: depuisEuros('300,00'), dateEcheance: '2026-12-01' },
		{ reference: 'F-1', resteDu: depuisEuros('1000,00'), dateEcheance: '2026-03-01' },
		{ reference: 'F-2', resteDu: depuisEuros('500,00'), dateEcheance: '2026-06-01' }
	];

	it('solde d’abord les échues, la plus ancienne en premier', () => {
		const r = repartirSelonLaLoi(factures, depuisEuros('1200,00'), '2026-09-25');
		expect(r.lignes.map((l) => [l.reference, versEuros(l.montant), l.solde])).toEqual([
			['F-1', '1 000,00', true],
			['F-2', '200,00', false]
		]);
		expect(versEuros(r.nonAffecte)).toBe('0,00');
	});

	it('partage au prorata des factures de même échéance, au centime près', () => {
		const r = repartirSelonLaLoi(
			[
				{ reference: 'A', resteDu: depuisEuros('100,00'), dateEcheance: '2026-01-01' },
				{ reference: 'B', resteDu: depuisEuros('200,00'), dateEcheance: '2026-01-01' }
			],
			depuisEuros('100,00'),
			'2026-09-25'
		);
		// 100 × 1/3 = 33,33… → 33,33 + reliquat 0,01 ; 100 × 2/3 = 66,66.
		expect(r.lignes.map((l) => versEuros(l.montant))).toEqual(['33,34', '66,66']);
	});

	it('dit ce qui dépasse le total dû', () => {
		const r = repartirSelonLaLoi(factures, depuisEuros('2000,00'), '2026-09-25');
		expect(versEuros(r.nonAffecte)).toBe('200,00');
		expect(r.lignes.every((l) => l.solde)).toBe(true);
	});
});
