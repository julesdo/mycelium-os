import { describe, expect, it } from 'vitest';
import { absenceAssezLongue, composerLeReveil, quelqueChoseDeVrai } from '../reveil';

/**
 * LE RÉVEIL UTILE (21/10/2026, le parcours de l'habitude, moment 8) : quatorze jours sans
 * visite ET quelque chose de vrai depuis, un e-mail ; rien de vrai, le silence.
 */
const JOUR = 24 * 60 * 60 * 1000;
const RIEN = {
	paiements: 0,
	clientsQuiOntPaye: 0,
	rentre: 0n,
	relancesParties: 0,
	dateLimiteDansJours: null
};

describe('le réveil utile', () => {
	it('attend quatorze jours d’absence', () => {
		expect(absenceAssezLongue(0, 13 * JOUR)).toBe(false);
		expect(absenceAssezLongue(0, 14 * JOUR)).toBe(true);
	});

	it('se tait quand rien de vrai ne s’est passé', () => {
		expect(quelqueChoseDeVrai(RIEN)).toBe(false);
		expect(quelqueChoseDeVrai({ ...RIEN, dateLimiteDansJours: 45 })).toBe(false);
		expect(quelqueChoseDeVrai({ ...RIEN, dateLimiteDansJours: 12 })).toBe(true);
		expect(quelqueChoseDeVrai({ ...RIEN, relancesParties: 1 })).toBe(true);
		expect(
			quelqueChoseDeVrai({ ...RIEN, paiements: 1, clientsQuiOntPaye: 1, rentre: 50_000n })
		).toBe(true);
	});

	it('dit ce qui s’est passé pendant l’absence, sans reproche ni compteur à zéro', () => {
		const r = composerLeReveil({
			paiements: 3,
			clientsQuiOntPaye: 2,
			rentre: 412_000n,
			relancesParties: 0,
			dateLimiteDansJours: 12
		});
		expect(r.phrase).toBe('Pendant votre absence : 2 clients ont payé, une date limite approche.');
		expect(r.rangees.map((l) => l.libelle)).toEqual([
			'Rentré',
			'Clients qui ont payé',
			'Date limite la plus proche'
		]);
		expect(`${r.phrase} ${r.rangees.map((l) => l.valeur).join(' ')}`).not.toMatch(
			/garanti|grâce à|n’êtes pas venu|depuis 14 jours/i
		);
	});

	it('nomme les relances parties quand personne n’a payé', () => {
		expect(composerLeReveil({ ...RIEN, relancesParties: 3 }).phrase).toBe(
			'Pendant votre absence : 3 relances sont parties.'
		);
	});
});
