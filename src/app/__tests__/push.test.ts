import { describe, expect, it } from 'vitest';
import { etatDuPush, nomDeLAppareil, type EnvironnementPush } from '../push';

/**
 * CE QUE L'APPAREIL PERMET (21/10/2026). Sur iPhone, le push ne vit que dans
 * l'application ajoutée à l'écran d'accueil ; un navigateur sans service worker n'en
 * reçoit pas ; une permission refusée ne se redemande pas.
 */
const CHROME =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36';
const IPHONE =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1';

function environnement(champs: Partial<EnvironnementPush> = {}): EnvironnementPush {
	return {
		agent: CHROME,
		serviceWorker: true,
		pushManager: true,
		permission: 'default',
		installee: false,
		...champs
	};
}

describe('ce que l’appareil permet', () => {
	it('propose le push dans un navigateur qui le sait', () => {
		expect(etatDuPush(environnement(), false)).toBe('POSSIBLE');
		expect(etatDuPush(environnement({ permission: 'granted' }), true)).toBe('ACTIF');
	});

	it('demande d’installer sur iPhone hors de l’écran d’accueil', () => {
		expect(etatDuPush(environnement({ agent: IPHONE, pushManager: false }), false)).toBe(
			'A_INSTALLER'
		);
		expect(etatDuPush(environnement({ agent: IPHONE, installee: true }), false)).toBe('POSSIBLE');
	});

	it('dit indisponible sans service worker, et refusé quand la permission l’est', () => {
		expect(etatDuPush(environnement({ serviceWorker: false }), false)).toBe('INDISPONIBLE');
		expect(etatDuPush(environnement({ permission: 'denied' }), false)).toBe('REFUSE');
	});

	it('nomme l’appareil comme la personne le reconnaît', () => {
		expect(nomDeLAppareil(IPHONE)).toBe('iPhone');
		expect(nomDeLAppareil(CHROME)).toBe('Ordinateur Windows');
	});
});
