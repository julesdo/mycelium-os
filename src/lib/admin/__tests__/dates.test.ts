import { describe, it, expect } from 'vitest';
import {
	bornesDuJourDeParis,
	echeanceDeTache,
	grouperParJour,
	heureDeParis,
	libelleDuJour
} from '../dates';

/** 16/10/2026 à 9 h 30 à Paris (heure d'été : UTC+2). */
const MAINTENANT = Date.UTC(2026, 9, 16, 7, 30);
const HEURE = 3_600_000;
const JOUR = 24 * HEURE;

describe('bornesDuJourDeParis', () => {
	it('rend minuit à Paris, pas minuit UTC', () => {
		const { debut, fin } = bornesDuJourDeParis(MAINTENANT);
		expect(debut).toBe(Date.UTC(2026, 9, 15, 22, 0));
		expect(fin).toBe(Date.UTC(2026, 9, 16, 22, 0));
	});

	it('suit l’heure d’hiver', () => {
		const { debut } = bornesDuJourDeParis(Date.UTC(2026, 11, 3, 12));
		expect(debut).toBe(Date.UTC(2026, 11, 2, 23, 0));
	});
});

describe('echeanceDeTache', () => {
	it('dit le retard en jours, à l’encre', () => {
		expect(echeanceDeTache(MAINTENANT - 2 * JOUR, MAINTENANT)).toEqual({
			texte: 'en retard de 2 j',
			enRetard: true
		});
	});

	it('dit aujourd’hui, demain, puis la distance', () => {
		expect(echeanceDeTache(MAINTENANT + 3 * HEURE, MAINTENANT).texte).toBe('aujourd’hui');
		expect(echeanceDeTache(MAINTENANT + JOUR, MAINTENANT).texte).toBe('demain');
		expect(echeanceDeTache(MAINTENANT + 5 * JOUR, MAINTENANT).texte).toBe('dans 5 j');
	});

	it('une tâche due hier à 23 h, à Paris, est en retard d’un jour', () => {
		const hierSoir = Date.UTC(2026, 9, 15, 21, 0);
		expect(echeanceDeTache(hierSoir, MAINTENANT)).toEqual({
			texte: 'en retard de 1 j',
			enRetard: true
		});
	});
});

describe('libelleDuJour et heureDeParis', () => {
	it('nomme aujourd’hui, hier, puis le jour en toutes lettres', () => {
		expect(libelleDuJour(MAINTENANT, MAINTENANT)).toBe('Aujourd’hui');
		expect(libelleDuJour(MAINTENANT - JOUR, MAINTENANT)).toBe('Hier');
		expect(libelleDuJour(MAINTENANT - 4 * JOUR, MAINTENANT)).toBe('Lundi 12 octobre');
	});

	it('donne l’heure de Paris', () => {
		expect(heureDeParis(MAINTENANT)).toBe('09:30');
	});
});

describe('grouperParJour', () => {
	it('groupe par jour de Paris, dans l’ordre reçu', () => {
		const groupes = grouperParJour(
			[
				{ id: 'a', le: MAINTENANT },
				{ id: 'b', le: MAINTENANT - HEURE },
				{ id: 'c', le: MAINTENANT - JOUR }
			],
			MAINTENANT
		);
		expect(groupes.map((g) => [g.jour, g.elements.map((e) => e.id)])).toEqual([
			['Aujourd’hui', ['a', 'b']],
			['Hier', ['c']]
		]);
	});
});
