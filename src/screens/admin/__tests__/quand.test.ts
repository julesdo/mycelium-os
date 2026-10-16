import { describe, it, expect } from 'vitest';
import { quandInscrit } from '../aujourdhui';

const MAINTENANT = Date.UTC(2026, 9, 16, 8, 30);
const JOUR = 24 * 60 * 60 * 1000;

describe('quandInscrit', () => {
	it('dit la distance jusqu’à trois mois, puis la date', () => {
		expect(quandInscrit(MAINTENANT, MAINTENANT)).toBe('aujourd’hui');
		expect(quandInscrit(MAINTENANT - JOUR, MAINTENANT)).toBe('hier');
		expect(quandInscrit(MAINTENANT - 4 * JOUR, MAINTENANT)).toBe('il y a 4 j');
		expect(quandInscrit(MAINTENANT - 120 * JOUR, MAINTENANT)).toBe('18 juin 2026');
	});
});
