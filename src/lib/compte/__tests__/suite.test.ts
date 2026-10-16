import { describe, it, expect } from 'vitest';
import { suiteSure } from '../suite';

describe('suiteSure', () => {
	it('garde un retour vers l’admin ou l’application', () => {
		expect(suiteSure('/admin')).toBe('/admin');
		expect(suiteSure('/admin/prospects')).toBe('/admin/prospects');
		expect(suiteSure('/app/compte')).toBe('/app/compte');
	});

	it('refuse tout le reste, à commencer par un autre site', () => {
		expect(suiteSure('https://exemple.fr/admin')).toBeUndefined();
		expect(suiteSure('//exemple.fr/admin')).toBeUndefined();
		expect(suiteSure('/administration')).toBeUndefined();
		expect(suiteSure('/p/abc')).toBeUndefined();
		expect(suiteSure(42)).toBeUndefined();
		expect(suiteSure(undefined)).toBeUndefined();
	});
});
