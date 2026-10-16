import { describe, it, expect } from 'vitest';
import { toucheAuDernierFondateur, verdictDAcces, type EntreeAcces } from '../acces';

/**
 * LE VERDICT D'ACCÈS À L'ADMIN — appliqué par l'enveloppe à chaque appel serveur.
 * Un membre retiré ou dont la double authentification est coupée perd l'accès au
 * prochain appel, même avec un onglet resté ouvert.
 */

const valide: EntreeAcces = {
	utilisateur: { email: 'jules@exemple.fr', emailVerified: true, twoFactorEnabled: true },
	membre: { role: 'FONDATEUR' }
};

describe('verdictDAcces', () => {
	it('accepte un fondateur vérifié et protégé', () => {
		expect(verdictDAcces(valide, 'FONDATEUR')).toEqual({ ok: true, role: 'FONDATEUR' });
	});

	it('accepte un rôle plus haut que celui qu’exige le geste', () => {
		expect(verdictDAcces({ ...valide, membre: { role: 'SUPPORT' } }, 'LECTURE')).toEqual({
			ok: true,
			role: 'SUPPORT'
		});
	});

	it('refuse sans session', () => {
		expect(verdictDAcces({ utilisateur: null, membre: null }, 'LECTURE')).toMatchObject({
			ok: false,
			raison: 'SESSION'
		});
	});

	it('refuse une adresse non vérifiée, hors équipe, ou un membre retiré', () => {
		const nonVerifie = { ...valide, utilisateur: { ...valide.utilisateur!, emailVerified: false } };
		expect(verdictDAcces(nonVerifie, 'LECTURE')).toMatchObject({ raison: 'HORS_EQUIPE' });
		expect(verdictDAcces({ ...valide, membre: null }, 'LECTURE')).toMatchObject({
			raison: 'HORS_EQUIPE'
		});
		expect(
			verdictDAcces({ ...valide, membre: { role: 'FONDATEUR', retireLe: 1 } }, 'LECTURE')
		).toMatchObject({ raison: 'HORS_EQUIPE' });
	});

	it('refuse sans double authentification, en le disant', () => {
		const sans = { ...valide, utilisateur: { ...valide.utilisateur!, twoFactorEnabled: false } };
		expect(verdictDAcces(sans, 'LECTURE')).toEqual({
			ok: false,
			raison: 'DOUBLE_AUTH',
			message: 'Activez la double authentification dans votre profil.'
		});
	});

	it('refuse un rôle insuffisant', () => {
		expect(verdictDAcces({ ...valide, membre: { role: 'LECTURE' } }, 'SUPPORT')).toMatchObject({
			ok: false,
			raison: 'ROLE'
		});
	});
});

describe('toucheAuDernierFondateur', () => {
	const equipe = [
		{ email: 'a@x.fr', role: 'FONDATEUR' as const },
		{ email: 'b@x.fr', role: 'SUPPORT' as const },
		{ email: 'c@x.fr', role: 'FONDATEUR' as const, retireLe: 1 }
	];
	it('refuse de retirer ou de rétrograder le dernier fondateur actif', () => {
		expect(toucheAuDernierFondateur(equipe, 'a@x.fr', 'RETIRE')).toBe(true);
		expect(toucheAuDernierFondateur(equipe, 'a@x.fr', 'SUPPORT')).toBe(true);
	});
	it('laisse faire quand un autre fondateur reste, ou pour un autre membre', () => {
		expect(
			toucheAuDernierFondateur(
				[...equipe, { email: 'd@x.fr', role: 'FONDATEUR' }],
				'a@x.fr',
				'RETIRE'
			)
		).toBe(false);
		expect(toucheAuDernierFondateur(equipe, 'b@x.fr', 'RETIRE')).toBe(false);
		expect(toucheAuDernierFondateur(equipe, 'a@x.fr', 'FONDATEUR')).toBe(false);
	});
});
