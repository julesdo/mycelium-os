import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { paroleDePlume } from '../parole-de-plume';

/**
 * UNE SEULE FÊTE PAR PAIEMENT (21/10/2026, le parcours de l'habitude). Un paiement qui
 * fait franchir un jalon se fête par la célébration à la visite suivante, pas par la
 * bulle. Le relevé des jalons suit le paiement de quelques instants : la bulle attend
 * de le savoir avant de parler.
 */
describe('la fête d’un paiement dans la bulle', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('se tait pour un paiement qui fait franchir un jalon, même su après lui', () => {
		// À l'ouverture, ce qui est déjà là ne s'annonce pas.
		paroleDePlume.annoncerPaiement(null, null);
		const paiement = { id: 'r1', client: 'Garage Martin', creeLe: 10 };
		paroleDePlume.annoncerPaiement({ ...paiement, porteUnJalon: false }, '1 240 €');
		paroleDePlume.annoncerPaiement({ ...paiement, porteUnJalon: true }, '1 240 €');
		vi.advanceTimersByTime(5000);
		expect(paroleDePlume.lire().aDire).toBe(0);
	});

	it('fête un paiement ordinaire, une fois le relevé passé', () => {
		paroleDePlume.annoncerPaiement(
			{ id: 'r2', client: 'Garage Martin', creeLe: 20, porteUnJalon: false },
			'500 €'
		);
		expect(paroleDePlume.lire().aDire).toBe(0);
		vi.advanceTimersByTime(5000);
		expect(paroleDePlume.lire().aDire).toBe(1);
	});
});
