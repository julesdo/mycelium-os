import { describe, expect, it } from 'vitest';
import {
	avancement,
	decalerJour,
	fusionner,
	jourDeParis,
	paroleDeLaJourneeBouclee,
	rangDansLaSemaine,
	semaineEnCours,
	serieDeJours,
	serieEnMots,
	titreDeLaJournee
} from '../journee';

/** Le mardi 13 octobre 2026, à Paris. */
const MARDI = '2026-10-13';

describe('La journée de Plume', () => {
	it('se compte à Paris : 23 h 30 UTC le 13 est déjà le 14 à Paris', () => {
		expect(jourDeParis(Date.UTC(2026, 9, 13, 23, 30))).toBe('2026-10-14');
		expect(jourDeParis(Date.UTC(2026, 9, 13, 12, 0))).toBe(MARDI);
	});

	it('connaît le lundi et le dimanche', () => {
		expect(rangDansLaSemaine('2026-10-12')).toBe(0);
		expect(rangDansLaSemaine('2026-10-18')).toBe(6);
		expect(decalerJour(MARDI, -2)).toBe('2026-10-11');
	});

	it('garde le plus haut relevé : ce qui est fait ne se retire pas du total', () => {
		const matin = fusionner(null, { demarrer: 3, relire: 1, repondre: 0 });
		const midi = fusionner(matin, { demarrer: 1, relire: 2, repondre: 0 });
		expect(midi).toEqual({ demarrer: 3, relire: 2, repondre: 0 });
		const avance = avancement(midi, { demarrer: 1, relire: 2, repondre: 0 });
		expect(avance.faits).toBe(2);
		expect(avance.total).toBe(5);
		expect(avance.defis.map((d) => d.genre)).toEqual(['demarrer', 'relire']);
	});

	it('compte la série sans que le week-end la casse', () => {
		const tenues = new Map([
			['2026-10-13', true],
			['2026-10-12', true],
			// samedi et dimanche : pas ouvert
			['2026-10-09', true],
			['2026-10-08', false]
		]);
		expect(serieDeJours(tenues, MARDI)).toBe(3);
	});

	it('ne casse pas la série tant qu’aujourd’hui n’est pas fini', () => {
		const tenues = new Map([
			['2026-10-13', false],
			['2026-10-12', true],
			['2026-10-09', true]
		]);
		expect(serieDeJours(tenues, MARDI)).toBe(2);
	});

	it('casse la série sur un jour de semaine manqué', () => {
		const tenues = new Map([
			['2026-10-13', true],
			['2026-10-09', true]
		]);
		// Le lundi 12 manque.
		expect(serieDeJours(tenues, MARDI)).toBe(1);
	});

	it('dessine la semaine du lundi au dimanche', () => {
		const semaine = semaineEnCours(new Map([['2026-10-12', true]]), MARDI);
		expect(semaine.map((j) => j.lettre).join('')).toBe('LMMJVSD');
		expect(semaine.map((j) => j.etat)).toEqual([
			'TENUE',
			'AUJOURDHUI',
			'AVENIR',
			'AVENIR',
			'AVENIR',
			'AVENIR',
			'AVENIR'
		]);
	});

	it('fête la journée bouclée, et la série à partir de deux jours', () => {
		expect(paroleDeLaJourneeBouclee(MARDI, 1).texte).toContain('première journée bouclée');
		expect(paroleDeLaJourneeBouclee(MARDI, 4).texte).toContain('4 jours d’affilée');
		expect(paroleDeLaJourneeBouclee(MARDI, 4).humeur).toBe('fete');
		expect(serieEnMots(1)).toBeNull();
		expect(serieEnMots(3)).toBe('3 jours d’affilée');
	});

	it('titre la journée sans promettre quand rien n’attend', () => {
		const vide = avancement(
			{ demarrer: 0, relire: 0, repondre: 0 },
			{ demarrer: 0, relire: 0, repondre: 0 }
		);
		expect(titreDeLaJournee(vide, true)).toBe('Rien ne vous attend aujourd’hui');
		const avance = avancement(
			{ demarrer: 2, relire: 0, repondre: 1 },
			{ demarrer: 1, relire: 0, repondre: 1 }
		);
		expect(titreDeLaJournee(avance, false)).toBe('1 sur 3 aujourd’hui');
	});
});
