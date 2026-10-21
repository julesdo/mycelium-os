import { describe, expect, it } from 'vitest';
import {
	bornesDeLaSemaineEcoulee,
	composerLaSemaine,
	delaiLisible,
	phraseDeLaSemaine
} from '../votre-semaine';

/**
 * « VOTRE SEMAINE » (21/10/2026, le parcours de l'habitude) : la semaine écoulée, du
 * lundi au dimanche à Paris, ses chiffres lus en base, et rien quand elle est vide.
 */
const SEMAINES = [
	'2026-10-05',
	'2026-09-28',
	'2026-09-21',
	'2026-09-14',
	'2026-09-07',
	'2026-08-31',
	'2026-08-24'
];

const BASE = {
	debut: '2026-10-12',
	fin: '2026-10-18',
	paiements: [
		{ date: '2026-10-13', montant: 30_000n, debiteurId: 'garage' },
		{ date: '2026-10-16', montant: 20_000n, debiteurId: 'garage' },
		{ date: '2026-10-17', montant: 50_000n, debiteurId: 'boulangerie' }
	],
	relancesParties: 3,
	dateLimiteDansJours: 45,
	historique: [10_000n, 10_000n, 10_000n, 10_000n, 10_000n, 10_000n, 900_000n],
	datesDesSemaines: SEMAINES,
	arriveeLe: '2026-06-02'
};

describe('les bornes de la semaine écoulée', () => {
	it('va du lundi au dimanche d’avant, à Paris', () => {
		// Mercredi 21 et jeudi 22 octobre 2026, à midi.
		expect(bornesDeLaSemaineEcoulee(Date.UTC(2026, 9, 21, 10))).toEqual({
			debut: '2026-10-12',
			fin: '2026-10-18'
		});
		expect(bornesDeLaSemaineEcoulee(Date.UTC(2026, 9, 22, 10))).toEqual({
			debut: '2026-10-12',
			fin: '2026-10-18'
		});
		// Dimanche 18 octobre à 23 h 30 à Paris : encore la semaine d'avant.
		expect(bornesDeLaSemaineEcoulee(Date.UTC(2026, 9, 18, 21, 30))).toEqual({
			debut: '2026-10-05',
			fin: '2026-10-11'
		});
	});
});

describe('la semaine composée', () => {
	it('compte ce qui est rentré, les relances et les clients qui ont payé', () => {
		const s = composerLaSemaine(BASE);
		expect(s?.rentre).toBe(100_000n);
		expect(s?.relancesParties).toBe(3);
		expect(s?.clientsQuiOntPaye).toBe(2);
		expect(s?.huitSemaines).toEqual([
			900_000n,
			10_000n,
			10_000n,
			10_000n,
			10_000n,
			10_000n,
			10_000n,
			100_000n
		]);
	});

	it('se tait sur une semaine vide', () => {
		expect(
			composerLaSemaine({ ...BASE, paiements: [], relancesParties: 0, dateLimiteDansJours: 45 })
		).toBeNull();
		expect(
			composerLaSemaine({ ...BASE, paiements: [], relancesParties: 0, dateLimiteDansJours: 12 })
		).not.toBeNull();
	});

	it('dit la meilleure semaine depuis la dernière qui la dépassait', () => {
		expect(composerLaSemaine(BASE)?.meilleureDepuis).toBe('2026-08-24');
	});

	it('dit « depuis votre arrivée » quand elle dépasse tout ce qui précède', () => {
		const s = composerLaSemaine({
			...BASE,
			historique: BASE.historique.slice(0, 6),
			datesDesSemaines: SEMAINES.slice(0, 6),
			arriveeLe: '2026-09-01'
		});
		expect(s?.meilleureDepuis).toBe('arrivee');
	});

	it('ne dit rien quand elle ne dépasse pas les quatre dernières', () => {
		const s = composerLaSemaine({
			...BASE,
			historique: [10_000n, 10_000n, 500_000n, 10_000n, 10_000n, 10_000n, 10_000n]
		});
		expect(s?.meilleureDepuis).toBeNull();
	});
});

describe('les mots de la semaine (relecture du 21/10/2026)', () => {
	const SEMAINE = {
		debut: '2026-10-12',
		fin: '2026-10-18',
		rentre: 0n,
		relancesParties: 0,
		clientsQuiOntPaye: 0,
		dateLimiteDansJours: 1,
		huitSemaines: [],
		meilleureDepuis: null
	};

	it('accorde les jours et dit « aujourd’hui » plutôt que « dans 0 jours »', () => {
		expect(phraseDeLaSemaine(SEMAINE)).toBe('Une date limite pour agir dans 1 jour.');
		expect(phraseDeLaSemaine({ ...SEMAINE, dateLimiteDansJours: 0 })).toBe(
			'Une date limite pour agir tombe aujourd’hui.'
		);
		expect(delaiLisible(0)).toBe('aujourd’hui');
		expect(delaiLisible(12)).toBe('dans 12 j');
	});

	it('dit l’argent rentré quand il y en a', () => {
		expect(
			phraseDeLaSemaine({ ...SEMAINE, rentre: 412_000n, clientsQuiOntPaye: 1 })
		).toMatch(/^4 120\s€ rentrés, 1 client a payé\.$/);
	});
});
