import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { calculerRatios, partNonConfirmee, type LignePourAgregation } from '../agregation';

const ligne = (o: Partial<LignePourAgregation>): LignePourAgregation => ({
	amountHT: 100,
	isFood: true,
	family: 'EPICERIE_SECHE',
	isDurable: false,
	isBio: false,
	...o
});

describe('calculerRatios', () => {
	it('exclut le non-alimentaire du dénominateur', () => {
		const r = calculerRatios([
			ligne({ amountHT: 100, isFood: true, isDurable: true, isBio: true }),
			ligne({ amountHT: 100, isFood: false })
		]);
		expect(r.totalFoodHT).toBe(100);
		expect(r.durable).toBe(1);
		expect(r.bio).toBe(1);
	});

	it('calcule le ratio durable sur la totalité des achats alimentaires', () => {
		const r = calculerRatios([
			ligne({ amountHT: 300, isDurable: true, isBio: true }),
			ligne({ amountHT: 700 })
		]);
		expect(r.durable).toBeCloseTo(0.3, 10);
		expect(r.bio).toBeCloseTo(0.3, 10);
	});

	it('distingue durable et bio', () => {
		const r = calculerRatios([
			ligne({ amountHT: 200, isDurable: true, isBio: true }),
			ligne({ amountHT: 300, isDurable: true, isBio: false }),
			ligne({ amountHT: 500 })
		]);
		expect(r.durable).toBeCloseTo(0.5, 10);
		expect(r.bio).toBeCloseTo(0.2, 10);
	});

	it('calcule le ratio viande/poisson sur ces deux familles seulement', () => {
		const r = calculerRatios([
			ligne({ amountHT: 600, family: 'VIANDE', isDurable: true }),
			ligne({ amountHT: 400, family: 'POISSON' }),
			ligne({ amountHT: 1000, family: 'EPICERIE_SECHE', isDurable: true })
		]);
		expect(r.meatFishDurable).toBeCloseTo(0.6, 10);
	});

	it('renvoie 0 sur le ratio viande/poisson quand il n’y a ni viande ni poisson', () => {
		const r = calculerRatios([ligne({ amountHT: 100, family: 'EPICERIE_SECHE' })]);
		expect(r.meatFishDurable).toBe(0);
	});

	it('renvoie des ratios à 0 sur un lot vide', () => {
		const r = calculerRatios([]);
		expect(r.durable).toBe(0);
		expect(r.bio).toBe(0);
		expect(r.totalFoodHT).toBe(0);
	});

	it('un avoir réduit numérateur ET dénominateur', () => {
		const r = calculerRatios([
			ligne({ amountHT: 300, isDurable: true, isBio: true }),
			ligne({ amountHT: -100, isDurable: true, isBio: true }),
			ligne({ amountHT: 700 })
		]);
		expect(r.totalFoodHT).toBe(900);
		expect(r.bio).toBeCloseTo(200 / 900, 10);
	});
});

describe('écart en euros', () => {
	it('chiffre ce qu’il faut basculer pour atteindre chaque seuil', () => {
		const r = calculerRatios([
			ligne({ amountHT: 100, isDurable: true, isBio: true }),
			ligne({ amountHT: 900 })
		]);
		expect(r.gapEuros.toDurable50).toBeCloseTo(400, 6);
		expect(r.gapEuros.toBio20).toBeCloseTo(100, 6);
	});

	it('renvoie 0 quand le seuil est déjà atteint', () => {
		const r = calculerRatios([ligne({ amountHT: 1000, isDurable: true, isBio: true })]);
		expect(r.gapEuros.toDurable50).toBe(0);
		expect(r.gapEuros.toBio20).toBe(0);
	});
});

describe('contre les fixtures — vérité terrain exacte', () => {
	it.each(['grossiste-ocr-01', 'export-comptable-01', 'grossiste-sale-01'])(
		'%s : les trois ratios correspondent au centime',
		(nom) => {
			const attendu = JSON.parse(
				readFileSync(`src/lib/fixtures/factures/${nom}.expected.json`, 'utf8')
			);
			const lignes: LignePourAgregation[] = attendu.lines.map(
				(l: {
					amountHT: number;
					isFood: boolean;
					family: LignePourAgregation['family'];
					qualifyingLabels: string[];
				}) => ({
					amountHT: l.amountHT,
					isFood: l.isFood,
					family: l.family,
					isDurable: l.qualifyingLabels.length > 0,
					isBio: l.qualifyingLabels.some((q) => q === 'AB' || q === 'CONVERSION')
				})
			);
			const r = calculerRatios(lignes);
			expect(r.totalHT).toBeCloseTo(attendu.totalHT, 2);
			expect(r.totalFoodHT).toBeCloseTo(attendu.totalFoodHT, 2);
			expect(r.durable).toBeCloseTo(attendu.ratios.durable, 10);
			expect(r.bio).toBeCloseTo(attendu.ratios.bio, 10);
			expect(r.meatFishDurable).toBeCloseTo(attendu.ratios.meatFishDurable, 10);
		}
	);
});

describe('partNonConfirmee', () => {
	const ligne = (amountHT: number, reviewStatus: string) => ({
		amountHT,
		isFood: true,
		reviewStatus: reviewStatus as 'AUTO' | 'PENDING_REVIEW' | 'CONFIRMED' | 'CORRECTED'
	});

	it('vaut zéro quand tout est confirmé', () => {
		expect(partNonConfirmee([ligne(100, 'CONFIRMED'), ligne(50, 'CORRECTED')])).toBe(0);
	});

	it('compte AUTO et PENDING_REVIEW comme non confirmés', () => {
		expect(partNonConfirmee([ligne(75, 'AUTO'), ligne(25, 'PENDING_REVIEW')])).toBe(1);
	});

	it('s’exprime en part du MONTANT, pas du nombre de lignes', () => {
		// Une seule ligne non confirmée, mais elle pèse 90 % des achats.
		const lignes = [ligne(900, 'AUTO'), ligne(50, 'CONFIRMED'), ligne(50, 'CONFIRMED')];
		expect(partNonConfirmee(lignes)).toBeCloseTo(0.9, 5);
	});

	it('ignore le non-alimentaire, qui n’entre dans aucun ratio', () => {
		const lignes = [
			{ amountHT: 500, isFood: false, reviewStatus: 'AUTO' as const },
			ligne(100, 'CONFIRMED')
		];
		expect(partNonConfirmee(lignes)).toBe(0);
	});

	it('vaut zéro sur un lot vide plutôt que NaN', () => {
		expect(partNonConfirmee([])).toBe(0);
	});

	it('raisonne en valeur absolue : un avoir non confirmé pèse aussi', () => {
		expect(partNonConfirmee([ligne(-200, 'AUTO'), ligne(200, 'CONFIRMED')])).toBeCloseTo(0.5, 5);
	});
});
