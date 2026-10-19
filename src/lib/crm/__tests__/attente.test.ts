import { describe, it, expect } from 'vitest';
import {
	CONFIRMATION_VALABLE_MS,
	CONSERVATION_INSCRIPTION_MS,
	estEchue,
	lireInscription
} from '../attente';

/**
 * LA LISTE D'ATTENTE DE LA PROCÉDURE SANS JUGE (19/10/2026, audit, décision 16) : une
 * adresse, l'entreprise si on veut, et une double confirmation. Rien n'est cru de ce
 * que le formulaire envoie.
 */
describe('l’inscription à la liste d’attente', () => {
	it('nettoie l’adresse et l’entreprise', () => {
		expect(
			lireInscription({ email: ' Lea@Transports-Morel.fr ', entreprise: '  Transports  Morel ' })
		).toEqual({
			ok: true,
			inscription: { email: 'lea@transports-morel.fr', entreprise: 'Transports Morel' }
		});
	});

	it('accepte une inscription sans entreprise', () => {
		expect(lireInscription({ email: 'lea@morel.fr', entreprise: ' ' })).toEqual({
			ok: true,
			inscription: { email: 'lea@morel.fr' }
		});
	});

	it('refuse une adresse sans forme', () => {
		expect(lireInscription({ email: 'lea.morel' }).ok).toBe(false);
	});

	it('reconnaît un robot au champ piège, sans le lui dire', () => {
		expect(lireInscription({ email: 'lea@morel.fr', piege: 'x' })).toEqual({
			ok: false,
			robot: true
		});
	});
});

describe('ce qui s’efface', () => {
	const maintenant = Date.UTC(2026, 9, 19);

	it('une inscription non confirmée, passé le délai du lien', () => {
		expect(estEchue({ creeLe: maintenant - CONFIRMATION_VALABLE_MS - 1 }, maintenant)).toBe(true);
		expect(estEchue({ creeLe: maintenant - CONFIRMATION_VALABLE_MS + 1 }, maintenant)).toBe(false);
	});

	it('une inscription confirmée, passé le délai de conservation depuis la confirmation', () => {
		const confirmeeLe = maintenant - CONSERVATION_INSCRIPTION_MS - 1;
		expect(estEchue({ creeLe: confirmeeLe - 1000, confirmeeLe }, maintenant)).toBe(true);
		expect(estEchue({ creeLe: 0, confirmeeLe: maintenant - 1000 }, maintenant)).toBe(false);
	});
});
