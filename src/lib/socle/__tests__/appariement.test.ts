import { describe, it, expect } from 'vitest';
import { rapprocher } from '../appariement';

const c = (normalizedLabel: string, marque = '') => ({ normalizedLabel, marque });

describe('rapprocher', () => {
	it('rend chaque classification en face de son libellé', () => {
		const { appariees, manquants } = rapprocher(
			['THON', 'CAROTTE'],
			[c('CAROTTE', 'b'), c('THON', 'a')]
		);
		expect(appariees.map((x) => x.normalizedLabel)).toEqual(['THON', 'CAROTTE']);
		expect(manquants).toEqual([]);
	});

	it('signale un libellé resté sans réponse au lieu de décaler les suivants', () => {
		// Le cas qui justifie tout ce module : par position, SERVIETTES aurait
		// hérité de la classification du thon.
		const { appariees, manquants } = rapprocher(
			['THON', 'SERVIETTES'],
			[c('SERVIETTES', 'papier')]
		);
		expect(appariees).toEqual([c('SERVIETTES', 'papier')]);
		expect(manquants).toEqual(['THON']);
	});

	it('jette une réponse portant un libellé jamais demandé', () => {
		const { appariees, manquants } = rapprocher(['THON'], [c('SAUMON'), c('THON')]);
		expect(appariees).toEqual([c('THON')]);
		expect(manquants).toEqual([]);
	});

	it('retient la première de deux réponses contradictoires', () => {
		const { appariees } = rapprocher(['THON'], [c('THON', 'premier'), c('THON', 'second')]);
		expect(appariees).toEqual([c('THON', 'premier')]);
	});

	it('rend tous les libellés manquants quand la réponse est vide', () => {
		const { appariees, manquants } = rapprocher(['A', 'B', 'C'], []);
		expect(appariees).toEqual([]);
		expect(manquants).toEqual(['A', 'B', 'C']);
	});

	it('ne rapproche pas deux libellés à la casse près — la clé est exacte', () => {
		const { appariees, manquants } = rapprocher(['THON'], [c('Thon')]);
		expect(appariees).toEqual([]);
		expect(manquants).toEqual(['THON']);
	});
});
