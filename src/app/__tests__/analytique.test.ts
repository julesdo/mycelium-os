import { describe, it, expect } from 'vitest';
import { AMORCE_ANALYTIQUE } from '../analytique';

/**
 * Le garde d'Umami tourne dans le `<head>` : on l'exécute dans un faux navigateur,
 * avec ce qu'il lit (`location`, `URL`), et on regarde ce qu'il laisse partir.
 */
function garde(chemin: string, url: string, referrer = '') {
	const fenetre: Record<string, unknown> = {};
	new Function('window', 'location', AMORCE_ANALYTIQUE)(fenetre, {
		pathname: chemin,
		origin: 'https://www.letikette.com'
	});
	const f = fenetre.__gardeUmami as (t: string, p: { url: string; referrer: string }) => unknown;
	return f('pageview', { url, referrer });
}

describe('le garde d’Umami', () => {
	it('laisse partir une page du site, l’identifiant remplacé', () => {
		expect(garde('/tarifs', '/tarifs')).toEqual({ url: '/tarifs', referrer: '' });
	});

	it('annule l’envoi sur la page où le client paie', () => {
		expect(garde('/p/abc', '/p/abc')).toBe(false);
	});

	it('annule l’envoi sur la page de désinscription d’un prospect', () => {
		expect(garde('/desinscription/9b2f-41c1', '/desinscription/9b2f-41c1')).toBe(false);
	});

	it('annule l’envoi sur la page de confirmation de la liste d’attente', () => {
		expect(garde('/attente/9b2f-41c1', '/attente/9b2f-41c1')).toBe(false);
	});
});
