import { describe, it, expect } from 'vitest';
import { enumererAnnees } from '../pilotage';

/**
 * Le sélecteur d'année du tableau de bord est alimenté par les deux bornes de
 * l'index `by_org_and_date`. Ces sept cas sont exactement ceux qui ont failli
 * partir en production : chacun rendait le sélecteur vide, faux, ou assez gros
 * pour faire tomber l'écran entier.
 */
describe('enumererAnnees', () => {
	it('rend une seule année quand les deux bornes tombent dedans', () => {
		expect(enumererAnnees('2025-03-04', '2025-11-30')).toEqual(['2025']);
	});

	it('rend les années de la plus récente à la plus ancienne', () => {
		expect(enumererAnnees('2024-01-05', '2026-02-02')).toEqual(['2026', '2025', '2024']);
	});

	/**
	 * Une borne illisible ne dit rien de la profondeur de l'historique : on ne
	 * peut ni l'inventer, ni la déduire. Se réduire à l'année lisible est
	 * acceptable parce que c'est le seul fait établi, et que c'est l'exercice
	 * courant — celui que le gérant vient déclarer. Rendre `[]` serait pire :
	 * le sélecteur disparaîtrait alors qu'il existe des achats mesurables.
	 */
	it('se réduit à l’année lisible quand la borne ancienne ne l’est pas', () => {
		expect(enumererAnnees('', '2026-02-02')).toEqual(['2026']);
	});

	it('se réduit à l’année lisible quand la borne récente ne l’est pas', () => {
		expect(enumererAnnees('2024-01-05', '')).toEqual(['2024']);
	});

	it('ne propose rien quand les deux bornes sont illisibles', () => {
		expect(enumererAnnees('', '')).toEqual([]);
	});

	it('ne propose rien quand la table est vide', () => {
		expect(enumererAnnees(null, null)).toEqual([]);
	});

	/**
	 * « 9999 » sorti d'un OCR ne doit ni produire un sélecteur de milliers
	 * d'entrées, ni dépasser la taille maximale d'un tableau Convex.
	 */
	it('borne la liste quand une date est aberrante', () => {
		const annees = enumererAnnees('2024-01-01', '9999-12-31');
		expect(annees.length).toBeLessThanOrEqual(31);
		expect(annees[0]).toBe('9999');
	});

	it('termine et reste sensé quand les bornes sont inversées', () => {
		expect(enumererAnnees('2026-01-01', '2024-01-01')).toEqual(['2026', '2025', '2024']);
	});
});
