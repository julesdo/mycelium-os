import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FORME_D_ADRESSE, LONGUEUR_MINIMALE_DU_MOT_DE_PASSE, messagerieDe } from '../regles';

/**
 * LES RÈGLES DU COMPTE (28/10/2026) : la longueur du mot de passe que le serveur exige et que les
 * jauges lisent, et la messagerie qu'on ouvre après l'envoi d'un lien.
 */
describe('les règles du compte', () => {
	it('exigent la même longueur que le serveur', () => {
		const auth = readFileSync(join(import.meta.dirname, '..', '..', 'convex', 'auth.ts'), 'utf8');
		expect(auth).toContain('minPasswordLength: LONGUEUR_MINIMALE_DU_MOT_DE_PASSE');
		expect(LONGUEUR_MINIMALE_DU_MOT_DE_PASSE).toBe(12);
	});

	it('reconnaissent une adresse qui en a la forme', () => {
		expect(FORME_D_ADRESSE.test('claire@menuiserie-laurent.fr')).toBe(true);
		expect(FORME_D_ADRESSE.test('claire@menuiserie')).toBe(false);
	});

	it('ouvrent la messagerie d’une adresse connue, et aucune pour une adresse d’entreprise', () => {
		expect(messagerieDe('Claire@Gmail.com')?.nom).toBe('Gmail');
		expect(messagerieDe('jean@orange.fr')?.nom).toBe('Mail Orange');
		expect(messagerieDe('claire@menuiserie-laurent.fr')).toBeNull();
		expect(messagerieDe('pas-une-adresse')).toBeNull();
	});
});
