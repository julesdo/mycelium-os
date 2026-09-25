import { describe, it, expect } from 'vitest';
import { estJourOuvrable, finDeDelai, joursFeries, paques } from '../delais';

/**
 * LE CALCUL DES DÉLAIS — CPC 641 et 642.
 *
 * Chaque date attendue est vérifiée au calendrier dans son commentaire : le
 * 1er janvier 2026 est un jeudi, et Pâques 2026 tombe le 5 avril.
 */

describe('Pâques', () => {
	it('tombe aux dates publiées', () => {
		expect(paques(2024)).toBe('2024-03-31');
		expect(paques(2025)).toBe('2025-04-20');
		expect(paques(2026)).toBe('2026-04-05');
		expect(paques(2027)).toBe('2027-03-28');
	});
});

describe('les onze fêtes légales d’une année', () => {
	it('placent les fêtes mobiles par rapport à Pâques', () => {
		const feries = joursFeries(2026);
		expect(feries).toHaveLength(11);
		// Lundi de Pâques = Pâques + 1 ; Ascension = + 39 ; lundi de Pentecôte = + 50.
		expect(feries).toContain('2026-04-06');
		expect(feries).toContain('2026-05-14');
		expect(feries).toContain('2026-05-25');
		expect(feries).toContain('2026-07-14');
		expect(feries).toContain('2026-12-25');
	});
});

describe('le jour ouvrable', () => {
	it('écarte le samedi, le dimanche et les fêtes légales', () => {
		expect(estJourOuvrable('2026-02-28')).toBe(false); // samedi
		expect(estJourOuvrable('2026-03-01')).toBe(false); // dimanche
		expect(estJourOuvrable('2026-05-14')).toBe(false); // Ascension, un jeudi
		expect(estJourOuvrable('2026-03-02')).toBe(true); // lundi
	});

	it('refuse une date qui n’existe pas', () => {
		expect(() => estJourOuvrable('2026-02-30')).toThrow();
	});
});

describe('la fin d’un délai', () => {
	it('ne compte pas le jour du départ, pour un délai en jours', () => {
		// 2 mars + 15 jours = 17 mars.
		expect(
			finDeDelai('2026-03-02', { valeur: 15, unite: 'jours' }, { reporterJourNonOuvrable: false })
		).toEqual({ fin: '2026-03-17', reporteeDe: null });
	});

	it('finit le dernier jour du mois quand le quantième manque (641, al. 2)', () => {
		expect(
			finDeDelai('2026-01-31', { valeur: 1, unite: 'mois' }, { reporterJourNonOuvrable: false })
		).toEqual({ fin: '2026-02-28', reporteeDe: null });
	});

	it('reporte au lundi un délai qui finit un samedi (642)', () => {
		// Le 28 février 2026 est un samedi : le délai court jusqu'au lundi 2 mars.
		expect(
			finDeDelai('2026-01-31', { valeur: 1, unite: 'mois' }, { reporterJourNonOuvrable: true })
		).toEqual({ fin: '2026-03-02', reporteeDe: '2026-02-28' });
	});

	it('reporte par-dessus une fête légale', () => {
		// 14 février + 3 mois = jeudi 14 mai 2026, jour de l'Ascension : vendredi 15.
		expect(
			finDeDelai('2026-02-14', { valeur: 3, unite: 'mois' }, { reporterJourNonOuvrable: true })
		).toEqual({ fin: '2026-05-15', reporteeDe: '2026-05-14' });
	});

	it('enchaîne plusieurs jours non ouvrables', () => {
		// Noël 2026 est un vendredi, suivi du week-end : lundi 28 décembre.
		expect(
			finDeDelai('2026-11-25', { valeur: 1, unite: 'mois' }, { reporterJourNonOuvrable: true })
		).toEqual({ fin: '2026-12-28', reporteeDe: '2026-12-25' });
	});

	it('ne reporte rien quand l’appelant ne le demande pas — la prescription', () => {
		// Le 1er novembre 2026 est un dimanche et la Toussaint : pas de report demandé.
		expect(
			finDeDelai('2021-11-01', { valeur: 5, unite: 'annees' }, { reporterJourNonOuvrable: false })
		).toEqual({ fin: '2026-11-01', reporteeDe: null });
	});

	it('refuse une durée négative ou fractionnaire', () => {
		expect(() =>
			finDeDelai('2026-03-02', { valeur: -1, unite: 'jours' }, { reporterJourNonOuvrable: false })
		).toThrow();
		expect(() =>
			finDeDelai('2026-03-02', { valeur: 1.5, unite: 'mois' }, { reporterJourNonOuvrable: false })
		).toThrow();
	});
});
