import { describe, it, expect } from 'vitest';
import { estPublie } from '../publication';

/**
 * LA PUBLICATION DATÉE DU BLOG (19/10/2026, audit, lot 6) : un article par semaine, écrit
 * d'avance. Un article daté du futur attend son jour, à Paris ; un brouillon ne sort
 * jamais. En développement, tout se lit, pour la relecture.
 */
describe('la publication d’un article', () => {
	const article = { date: '2026-10-27', brouillon: false };

	it('attend son jour, à Paris', () => {
		// Le 26 octobre à 23 h 30 UTC, il est déjà le 27 à Paris (heure d'hiver, UTC+1).
		expect(estPublie(article, Date.UTC(2026, 9, 26, 23, 30), false)).toBe(true);
		expect(estPublie(article, Date.UTC(2026, 9, 26, 22, 30), false)).toBe(false);
	});

	it('ne sort jamais en brouillon', () => {
		expect(estPublie({ ...article, brouillon: true }, Date.UTC(2027, 0, 1), false)).toBe(false);
	});

	it('se lit tout entier en développement', () => {
		expect(estPublie({ date: '2027-01-01', brouillon: true }, Date.UTC(2026, 9, 19), true)).toBe(
			true
		);
	});
});
