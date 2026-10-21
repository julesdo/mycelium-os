import { describe, expect, it } from 'vitest';
import { peutParler, type PriseDeParole } from '../attention';

/**
 * LE BUDGET D'ATTENTION (21/10/2026, le parcours de l'habitude) : une prise de parole
 * marketing par jour dans l'application, un e-mail tous les deux jours et deux par
 * semaine, le silence après deux paroles ignorées, et « ne plus me le proposer ».
 */
const HEURE = 60 * 60 * 1000;
const JOUR = 24 * HEURE;
// Mercredi 21 octobre 2026, 15 h à Paris (UTC+2).
const MAINTENANT = Date.parse('2026-10-21T13:00:00Z');

function prise(
	champs: Partial<PriseDeParole> & Pick<PriseDeParole, 'canal' | 'le'>
): PriseDeParole {
	return { genre: 'jalon', cle: `c-${champs.le}`, ouverteLe: null, expireeLe: null, ...champs };
}

const AUCUNE: ReadonlySet<string> = new Set();

describe('le budget d’attention', () => {
	it('se tait sur ce que la personne a coupé', () => {
		const refus = peutParler(
			[],
			{ canal: 'APP', genre: 'recommandation' },
			MAINTENANT,
			new Set(['marketing:recommandation'])
		);
		expect(refus).toEqual({ ok: false, raison: 'COUPE' });
	});

	it('ne parle qu’une fois par jour dans l’application', () => {
		const ceMatin = prise({
			canal: 'APP',
			le: MAINTENANT - 5 * HEURE,
			ouverteLe: MAINTENANT - 5 * HEURE
		});
		expect(peutParler([ceMatin], { canal: 'APP', genre: 'semaine' }, MAINTENANT, AUCUNE)).toEqual({
			ok: false,
			raison: 'DEJA_AUJOURDHUI'
		});
		const hier = prise({ canal: 'APP', le: MAINTENANT - JOUR, ouverteLe: MAINTENANT - JOUR });
		expect(peutParler([hier], { canal: 'APP', genre: 'semaine' }, MAINTENANT, AUCUNE)).toEqual({
			ok: true
		});
	});

	it('laisse deux jours entre deux e-mails, et deux e-mails par semaine au plus', () => {
		const il36h = prise({ canal: 'EMAIL', le: MAINTENANT - 36 * HEURE });
		expect(peutParler([il36h], { canal: 'EMAIL', genre: 'semaine' }, MAINTENANT, AUCUNE)).toEqual({
			ok: false,
			raison: 'CADENCE'
		});
		const il49h = prise({ canal: 'EMAIL', le: MAINTENANT - 49 * HEURE });
		expect(peutParler([il49h], { canal: 'EMAIL', genre: 'semaine' }, MAINTENANT, AUCUNE)).toEqual({
			ok: true
		});
		// Mercredi : lundi 9 h et le dimanche d'avant ; lundi compte, dimanche est l'autre semaine.
		const lundi = prise({ canal: 'EMAIL', le: Date.parse('2026-10-19T07:00:00Z') });
		const dimanche = prise({ canal: 'EMAIL', le: Date.parse('2026-10-18T07:00:00Z') });
		expect(
			peutParler([lundi, dimanche], { canal: 'EMAIL', genre: 'reveil' }, MAINTENANT, AUCUNE)
		).toEqual({ ok: true });
		const mardi = prise({ canal: 'EMAIL', le: Date.parse('2026-10-19T08:00:00Z') });
		expect(
			peutParler([lundi, mardi], { canal: 'EMAIL', genre: 'reveil' }, MAINTENANT, AUCUNE)
		).toEqual({ ok: false, raison: 'SEMAINE_PLEINE' });
	});

	it('se tait quatorze jours après deux paroles ignorées dans l’application', () => {
		const ignoree = (ilYA: number) =>
			prise({ canal: 'APP', le: MAINTENANT - ilYA, expireeLe: MAINTENANT - ilYA + HEURE });
		expect(
			peutParler(
				[ignoree(3 * JOUR), ignoree(5 * JOUR)],
				{ canal: 'APP', genre: 'semaine' },
				MAINTENANT,
				AUCUNE
			)
		).toEqual({ ok: false, raison: 'IGNORE' });
		expect(
			peutParler(
				[ignoree(15 * JOUR), ignoree(17 * JOUR)],
				{ canal: 'APP', genre: 'semaine' },
				MAINTENANT,
				AUCUNE
			)
		).toEqual({ ok: true });
		const ouverte = prise({
			canal: 'APP',
			le: MAINTENANT - 2 * JOUR,
			ouverteLe: MAINTENANT - 2 * JOUR
		});
		expect(
			peutParler(
				[ouverte, ignoree(3 * JOUR)],
				{ canal: 'APP', genre: 'semaine' },
				MAINTENANT,
				AUCUNE
			)
		).toEqual({ ok: true });
	});
});
