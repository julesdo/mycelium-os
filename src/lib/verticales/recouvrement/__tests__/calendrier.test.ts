import { describe, it, expect } from 'vitest';
import { ajouterJours, ajouterMois, dernierJourDuMois, estDateReelle } from '../calendrier';

/**
 * UNE DATE QUI PASSE LE FORMAT N'EST PAS UNE DATE.
 *
 * `^\d{4}-\d{2}-\d{2}$` accepte `2026-13-45` et `2026-02-30`. Ce module en
 * faisait la seule vérification, et les trois conséquences étaient toutes
 * silencieuses ou obscures :
 *
 *   · `ajouterMois('2026-13-01', 1)` rendait `2027-02-01` — le mois 13 était
 *     reporté sur l'année suivante par l'arithmétique en mois absolus. Aucune
 *     erreur, une date fausse.
 *   · `ajouterMois('2026-02-30', 0)` rendait `2026-02-28` — la borne du mois
 *     rabotait le quantième impossible. Deux jours de prescription perdus, sans
 *     que rien ne le dise.
 *   · `ajouterJours('2026-02-30', 10)` levait `RangeError: Invalid time value`,
 *     depuis `Date.prototype.toISOString`, à trois appels de la cause.
 *
 * ⚠️ CE MODULE PORTE L'ÉCHÉANCE LA PLUS DANGEREUSE DU PRODUIT : les trois mois
 * pour signifier une ordonnance d'injonction de payer, sous peine de caducité.
 * Un décalage muet de deux jours y est pire qu'une exception, parce qu'une
 * exception se voit.
 */

describe('estDateReelle', () => {
	it('accepte une date qui existe', () => {
		expect(estDateReelle('2026-09-09')).toBe(true);
		expect(estDateReelle('2026-01-01')).toBe(true);
		expect(estDateReelle('2026-12-31')).toBe(true);
	});

	it('accepte le 29 février d’une année bissextile, refuse celui des autres', () => {
		// La règle grégorienne complète, pas « divisible par quatre » : 2000 est
		// bissextile, 1900 ne l'est pas, et un produit qui calcule des délais de
		// cinq ans traversera 2100.
		expect(estDateReelle('2024-02-29')).toBe(true);
		expect(estDateReelle('2000-02-29')).toBe(true);
		expect(estDateReelle('2025-02-29')).toBe(false);
		expect(estDateReelle('1900-02-29')).toBe(false);
		expect(estDateReelle('2100-02-29')).toBe(false);
	});

	it('refuse un mois hors de 1..12', () => {
		expect(estDateReelle('2026-00-15')).toBe(false);
		expect(estDateReelle('2026-13-15')).toBe(false);
		expect(estDateReelle('2026-99-15')).toBe(false);
	});

	it('refuse un quantième qui n’existe pas dans son mois', () => {
		expect(estDateReelle('2026-01-00')).toBe(false);
		expect(estDateReelle('2026-01-32')).toBe(false);
		expect(estDateReelle('2026-04-31')).toBe(false); // avril compte 30 jours
		expect(estDateReelle('2026-02-30')).toBe(false);
		expect(estDateReelle('2026-13-45')).toBe(false);
	});

	it('refuse ce qui n’a pas la forme AAAA-MM-JJ', () => {
		expect(estDateReelle('')).toBe(false);
		expect(estDateReelle('09/09/2026')).toBe(false);
		expect(estDateReelle('2026-9-9')).toBe(false);
		expect(estDateReelle('2026-09-09T00:00:00Z')).toBe(false);
		expect(estDateReelle('pas une date')).toBe(false);
	});

	it('refuse l’année zéro', () => {
		// `ajouterMois` raisonne en mois absolus depuis l'an 0 ; une année nulle
		// n'est jamais une date réelle, et l'accepter ferait passer une faute de
		// saisie pour un point de départ de prescription.
		expect(estDateReelle('0000-01-01')).toBe(false);
	});
});

describe('dernierJourDuMois', () => {
	it('rend la longueur de chaque mois', () => {
		expect(dernierJourDuMois(2026, 1)).toBe(31);
		expect(dernierJourDuMois(2026, 2)).toBe(28);
		expect(dernierJourDuMois(2024, 2)).toBe(29);
		expect(dernierJourDuMois(2026, 4)).toBe(30);
		expect(dernierJourDuMois(2026, 12)).toBe(31);
	});
});

describe('ajouterMois — les dates impossibles lèvent, elles ne se corrigent pas', () => {
	it('refuse un mois hors bornes au lieu de le reporter sur l’année suivante', () => {
		// C'était le pire des trois : aucune erreur, et une date fausse rendue.
		expect(() => ajouterMois('2026-13-01', 1)).toThrow(/2026-13-01/);
	});

	it('refuse un quantième impossible au lieu de le raboter', () => {
		expect(() => ajouterMois('2026-02-30', 0)).toThrow(/2026-02-30/);
		expect(() => ajouterMois('2025-02-29', 12)).toThrow(/2025-02-29/);
	});

	it('nomme le format attendu dans son message', () => {
		expect(() => ajouterMois('09/09/2026', 1)).toThrow(/AAAA-MM-JJ/);
	});

	it('continue de calculer de quantième à quantième sur les dates réelles', () => {
		expect(ajouterMois('2026-09-01', 3)).toBe('2026-12-01');
		expect(ajouterMois('2026-01-31', 1)).toBe('2026-02-28');
		expect(ajouterMois('2024-01-31', 1)).toBe('2024-02-29');
		expect(ajouterMois('2026-11-30', 3)).toBe('2027-02-28');
	});

	it('recule aussi bien qu’il avance', () => {
		expect(ajouterMois('2026-03-31', -1)).toBe('2026-02-28');
		expect(ajouterMois('2026-01-15', -1)).toBe('2025-12-15');
	});
});

describe('ajouterJours — la même exigence, le même message', () => {
	it('refuse une date impossible plutôt que de lever un RangeError obscur', () => {
		expect(() => ajouterJours('2026-02-30', 10)).toThrow(/2026-02-30/);
		expect(() => ajouterJours('2026-13-45', 1)).toThrow(/2026-13-45/);
	});

	it('ajoute des jours calendaires sur les dates réelles', () => {
		expect(ajouterJours('2026-09-09', 1)).toBe('2026-09-10');
		expect(ajouterJours('2026-02-28', 1)).toBe('2026-03-01');
		expect(ajouterJours('2024-02-28', 1)).toBe('2024-02-29');
		expect(ajouterJours('2026-12-31', 1)).toBe('2027-01-01');
	});

	it('recule aussi', () => {
		expect(ajouterJours('2026-01-01', -1)).toBe('2025-12-31');
	});
});
