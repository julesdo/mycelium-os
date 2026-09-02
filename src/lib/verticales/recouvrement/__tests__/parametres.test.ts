import { describe, it, expect } from 'vitest';
import {
	PARAMETRES,
	exiger,
	estUtilisable,
	parametresManquants,
	tousLesParametres
} from '../parametres';

/**
 * Le garde-fou de la règle 0.1 du brief de remodelage : aucune valeur juridique
 * n'est écrite en dur dans la logique métier, et **aucune valeur non vérifiée
 * ne peut servir sans erreur explicite**.
 *
 * Ce test ne vérifie pas que les valeurs sont JUSTES — ça, seul un avocat le
 * dit. Il vérifie qu'une valeur absente ou non validée ne peut pas se glisser
 * dans un décompte en se faisant passer pour zéro.
 */

describe('structure des paramètres juridiques', () => {
	const entrees = tousLesParametres();

	it('porte au moins les paramètres énumérés par le brief', () => {
		expect(entrees.length).toBeGreaterThanOrEqual(8);
	});

	it.each(entrees)('« $cle » cite sa source et sa date de vérification', (parametre) => {
		expect(parametre.source.length).toBeGreaterThan(0);
		expect(parametre.verifieLe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(parametre.note.length).toBeGreaterThan(0);
	});

	it('ne déclare jamais vérifiée une entrée sans valeur', () => {
		// L'incohérence inverse est permise : une valeur peut être connue et
		// attendre encore sa validation par un avocat.
		const incoherentes = entrees.filter((p) => p.verifie && p.valeur === null);
		expect(incoherentes.map((p) => p.cle)).toEqual([]);
	});
});

describe('exiger — la barrière avant tout calcul', () => {
	it('rend la valeur d’un paramètre vérifié', () => {
		expect(exiger(PARAMETRES.indemniteForfaitaire)).toBe(4000n);
	});

	it('refuse un paramètre sans valeur, en le nommant', () => {
		expect(() => exiger(PARAMETRES.tauxInteretLegalDefaut)).toThrowError(
			/tauxInteretLegalDefaut/
		);
	});

	it('refuse un paramètre dont la valeur est connue mais non validée', () => {
		const provisoire = {
			cle: 'essai',
			valeur: 42n,
			unite: 'centimes',
			source: 'article X',
			verifieLe: '2026-09-02',
			verifie: false,
			note: 'valeur relevée, pas encore validée'
		} as const;
		expect(() => exiger(provisoire)).toThrowError(/essai/);
	});

	it('l’erreur dit quoi faire, pas seulement ce qui manque', () => {
		expect(() => exiger(PARAMETRES.tauxInteretLegalDefaut)).toThrowError(/avocat|valider|fourni/i);
	});
});

describe('inspection sans lever — pour les écrans et les modules de procédure', () => {
	it('dit si un paramètre est utilisable sans jeter d’exception', () => {
		expect(estUtilisable(PARAMETRES.indemniteForfaitaire)).toBe(true);
		expect(estUtilisable(PARAMETRES.tauxInteretLegalDefaut)).toBe(false);
	});

	it('énumère ce qui manque, pour qu’un module se déclare indisponible', () => {
		const manquants = parametresManquants();
		expect(manquants).toContain('tauxInteretLegalDefaut');
		expect(manquants).not.toContain('indemniteForfaitaire');
	});
});
