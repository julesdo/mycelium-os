import { describe, it, expect } from 'vitest';
import { PLAN_FEATURES, PLAN_SEATS, planHasFeature } from '../billing';

describe('PLAN_FEATURES', () => {
	it('donne le diagnostic à tous les étages payants', () => {
		expect(planHasFeature('diagnostic', 'diagnostic')).toBe(true);
		expect(planHasFeature('conformite', 'diagnostic')).toBe(true);
		expect(planHasFeature('operateur', 'diagnostic')).toBe(true);
	});

	it('réserve le suivi mensuel aux étages conformite et operateur', () => {
		expect(planHasFeature('diagnostic', 'suiviMensuel')).toBe(false);
		expect(planHasFeature('conformite', 'suiviMensuel')).toBe(true);
		expect(planHasFeature('operateur', 'suiviMensuel')).toBe(true);
	});

	it('réserve le sourcing à l’étage operateur', () => {
		expect(planHasFeature('conformite', 'sourcing')).toBe(false);
		expect(planHasFeature('operateur', 'sourcing')).toBe(true);
	});

	it('définit un quota de sièges pour chaque étage', () => {
		expect(PLAN_SEATS.diagnostic).toBeGreaterThan(0);
		expect(PLAN_SEATS.conformite).toBeGreaterThan(0);
		expect(PLAN_SEATS.operateur).toBeGreaterThan(0);
	});

	it('n’expose que les features EGalim', () => {
		expect(Object.keys(PLAN_FEATURES.operateur).sort()).toEqual([
			'declaration',
			'depotFactures',
			'diagnostic',
			'sourcing',
			'suiviMensuel',
			'veilleReglementaire'
		]);
	});
});
