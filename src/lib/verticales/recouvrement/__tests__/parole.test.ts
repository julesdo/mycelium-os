import { describe, expect, it } from 'vitest';
import { lireEcheancier, lirePromesse, pauseDuPlan } from '../parole';
import { prochaineEtape } from '../plan-relance';

/**
 * LA PAROLE DU CLIENT FAIT TAIRE LE PLAN — et seulement tant qu'elle court.
 *
 * Ce qui est tenu ici, c'est ce qu'un pilote qui relance seul ne doit jamais
 * faire : relancer à son nom un client qui vient de dire quand il paierait.
 */
describe('une promesse', () => {
	const promesse = { noteeLe: '2026-10-08', pour: '2026-10-20', montant: 120_000n };

	it('fait taire le plan jusqu’à son jour, plus trois jours de grâce', () => {
		expect(
			pauseDuPlan({
				promesses: [promesse],
				echeanciers: [],
				reglements: [],
				aujourdHui: '2026-10-09',
				resteDu: 300_000n
			})
		).toEqual({ jusquAu: '2026-10-23', raison: 'PROMESSE', le: '2026-10-20', montant: 120_000n });
	});

	it('ne se dit jamais « tenue » ni « non tenue » à la place du gérant', () => {
		const couverte = lirePromesse(promesse, [{ le: '2026-10-19', montant: 120_000n }], '2026-10-30', 180_000n);
		expect(couverte.couverte).toBe(true);
		expect(couverte.etat).toBe('ECHUE');
		expect(lirePromesse({ ...promesse, issue: 'NON_TENUE' }, [], '2026-10-30', 0n).etat).toBe('NON_TENUE');
	});

	it('se tait encore quand l’argent arrive avant le jour promis : personne n’est relancé avant', () => {
		const pause = pauseDuPlan({
			promesses: [promesse],
			echeanciers: [],
			reglements: [{ le: '2026-10-10', montant: 120_000n }],
			aujourdHui: '2026-10-12',
			resteDu: 180_000n
		});
		expect(pause?.jusquAu).toBe('2026-10-23');
	});

	it('ne suspend plus rien une fois son délai passé, ni une fois tranchée', () => {
		const base = { echeanciers: [], reglements: [], resteDu: 300_000n };
		expect(pauseDuPlan({ ...base, promesses: [promesse], aujourdHui: '2026-10-24' })).toBeNull();
		expect(
			pauseDuPlan({ ...base, promesses: [{ ...promesse, issue: 'NON_TENUE' }], aujourdHui: '2026-10-10' })
		).toBeNull();
	});
});

describe('un échéancier', () => {
	const echeancier = {
		accordeLe: '2026-10-01',
		echeances: [
			{ le: '2026-10-15', montant: 100_000n },
			{ le: '2026-11-15', montant: 100_000n },
			{ le: '2026-12-15', montant: 100_001n }
		]
	};

	it('verse les règlements reçus depuis l’accord sur les échéances, dans l’ordre', () => {
		const lu = lireEcheancier(
			echeancier,
			[
				{ le: '2026-09-20', montant: 50_000n }, // avant l'accord : ne compte pas
				{ le: '2026-10-14', montant: 130_000n }
			],
			'2026-10-20'
		);
		expect(lu.echeances.map((e) => e.etat)).toEqual(['PAYEE', 'PARTIELLE', 'A_VENIR']);
		expect(lu.payees).toBe(1);
		expect(lu.prochaine).toBe(1);
		expect(lu.etat).toBe('EN_COURS');
	});

	it('se tait jusqu’au prochain versement tant qu’il arrive à l’heure', () => {
		const pause = pauseDuPlan({
			promesses: [],
			echeanciers: [echeancier],
			reglements: [{ le: '2026-10-15', montant: 100_000n }],
			aujourdHui: '2026-10-20',
			resteDu: 200_001n
		});
		expect(pause).toEqual({
			jusquAu: '2026-11-18',
			raison: 'ECHEANCIER',
			le: '2026-11-15',
			montant: 100_000n
		});
	});

	it('rend la main au plan dès qu’un versement passe son délai de grâce', () => {
		const lu = lireEcheancier(echeancier, [], '2026-10-19');
		expect(lu.etat).toBe('EN_RETARD');
		expect(
			pauseDuPlan({
				promesses: [],
				echeanciers: [echeancier],
				reglements: [],
				aujourdHui: '2026-10-19',
				resteDu: 300_001n
			})
		).toBeNull();
	});
});

describe('le plan, suspendu', () => {
	it('ne reprend pas avant le lendemain de la pause, et n’est pas dû d’ici là', () => {
		const prochaine = prochaineEtape({
			ancre: '2026-09-01',
			faites: [],
			aujourdHui: '2026-10-09',
			pasAvant: '2026-10-24'
		});
		expect(prochaine?.le).toBe('2026-10-24');
		expect(prochaine?.due).toBe(false);
	});
});
