import { describe, it, expect } from 'vitest';
import { AMORCE_SOURCE } from '../source-visite';

/**
 * L'amorce tourne dans le `<head>`, avant l'application : on l'exécute ici dans
 * un faux navigateur, avec juste ce qu'elle lit (`location`, `document.referrer`,
 * `sessionStorage`).
 */
function executer(chemin: string, href: string, referent: string, deja?: string) {
	const stock = new Map<string, string>();
	if (deja !== undefined) stock.set('letikette.source', deja);
	const sessionStorage = {
		getItem: (k: string) => stock.get(k) ?? null,
		setItem: (k: string, val: string) => void stock.set(k, val)
	};
	new Function('location', 'document', 'sessionStorage', AMORCE_SOURCE)(
		{ pathname: chemin, href },
		{ referrer: referent },
		sessionStorage
	);
	return stock.get('letikette.source');
}

describe('l’amorce de la source', () => {
	it('note la première page de la visite et son site d’origine', () => {
		const lu = executer(
			'/',
			'https://www.letikette.com/?utm_source=manuel',
			'https://www.google.fr/'
		);
		expect(JSON.parse(lu ?? '{}')).toEqual({
			url: 'https://www.letikette.com/?utm_source=manuel',
			referent: 'https://www.google.fr/'
		});
	});

	it('ne remplace pas une source déjà notée dans la visite', () => {
		const deja = JSON.stringify({ url: 'https://www.letikette.com/tarifs', referent: '' });
		expect(executer('/blog', 'https://www.letikette.com/blog', '', deja)).toBe(deja);
	});

	it('ne note rien sur la page où le client paie', () => {
		expect(
			executer('/p/abc123', 'https://www.letikette.com/p/abc123', 'https://mail.exemple.fr/')
		).toBeUndefined();
	});

	it('ne note rien sur la page de désinscription : son adresse porte un jeton', () => {
		expect(
			executer(
				'/desinscription/9b2f-41c1',
				'https://www.letikette.com/desinscription/9b2f-41c1',
				'https://mail.exemple.fr/'
			)
		).toBeUndefined();
	});

	it('ne note rien sur la confirmation de la liste d’attente : son adresse porte un jeton', () => {
		expect(
			executer(
				'/attente/9b2f-41c1',
				'https://www.letikette.com/attente/9b2f-41c1',
				'https://mail.exemple.fr/'
			)
		).toBeUndefined();
	});
});
