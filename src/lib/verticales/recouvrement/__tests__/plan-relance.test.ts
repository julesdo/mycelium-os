import { describe, expect, it } from 'vitest';
import { prochainCreneauDEnvoi, prochaineEtape, suiteDuPlan } from '../plan-relance';

describe('le plan de relance', () => {
	it('commence par le rappel, trois jours après la plus ancienne échéance', () => {
		const p = prochaineEtape({ ancre: '2026-10-01', faites: [], aujourdHui: '2026-10-02' });
		expect(p?.etape.cle).toBe('RAPPEL');
		expect(p?.le).toBe('2026-10-04');
		expect(p?.due).toBe(false);
	});

	it('ne lance jamais la lettre officielle d’emblée sur un vieux retard', () => {
		// Deux cents jours de retard : le rappel est dû AUJOURD'HUI, pas la lettre
		// officielle. Un premier contact ne menace jamais.
		const p = prochaineEtape({ ancre: '2026-03-20', faites: [], aujourdHui: '2026-10-08' });
		expect(p?.etape.cle).toBe('RAPPEL');
		expect(p?.le).toBe('2026-10-08');
		expect(p?.due).toBe(true);
	});

	it('fait partir chaque étape du jour où la précédente a été faite', () => {
		const p = prochaineEtape({
			ancre: '2026-03-20',
			faites: [{ cle: 'RAPPEL', le: '2026-10-08' }],
			aujourdHui: '2026-10-09'
		});
		expect(p?.etape.cle).toBe('SECOND_RAPPEL');
		expect(p?.le).toBe('2026-10-18');
	});

	it('tient une étape plus avancée, faite à la main, pour les précédentes', () => {
		const p = prochaineEtape({
			ancre: '2026-09-01',
			faites: [{ cle: 'LETTRE_OFFICIELLE', le: '2026-10-01' }],
			aujourdHui: '2026-10-08'
		});
		expect(p?.etape.cle).toBe('CONSEIL');
		expect(p?.etape.automatique).toBe(false);
	});

	it('s’arrête au bout du plan', () => {
		expect(
			prochaineEtape({
				ancre: '2026-09-01',
				faites: [{ cle: 'CONSEIL', le: '2026-10-01' }],
				aujourdHui: '2026-10-08'
			})
		).toBeNull();
	});

	it('projette la suite au futur, chaque date après la précédente', () => {
		const suite = suiteDuPlan({ ancre: '2026-10-01', faites: [], aujourdHui: '2026-10-02' });
		expect(suite.map((e) => [e.etape.cle, e.le])).toEqual([
			['RAPPEL', '2026-10-04'],
			['SECOND_RAPPEL', '2026-10-14'],
			['LETTRE_OFFICIELLE', '2026-10-24'],
			['CONSEIL', '2026-11-08']
		]);
	});
});

describe('le créneau d’envoi', () => {
	it('garde l’heure quand elle est ouvrable', () => {
		// Mercredi 7 octobre 2026, 10 h 00 à Paris (8 h 00 UTC).
		const t = Date.UTC(2026, 9, 7, 8, 0);
		expect(prochainCreneauDEnvoi(t)).toBe(t);
	});

	it('repousse un soir de semaine au lendemain, 9 h', () => {
		// Mercredi 7 octobre 2026, 20 h 00 à Paris → jeudi 9 h 00 (7 h 00 UTC).
		const t = Date.UTC(2026, 9, 7, 18, 0);
		expect(prochainCreneauDEnvoi(t)).toBe(Date.UTC(2026, 9, 8, 7, 0));
	});

	it('repousse un samedi au lundi, 9 h', () => {
		// Samedi 10 octobre 2026, 11 h 00 à Paris → lundi 12 octobre, 9 h 00.
		const t = Date.UTC(2026, 9, 10, 9, 0);
		expect(prochainCreneauDEnvoi(t)).toBe(Date.UTC(2026, 9, 12, 7, 0));
	});
});
