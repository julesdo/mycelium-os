import { describe, expect, it } from 'vitest';
import { relanceHtml } from '../courriel-relance';
import { CLIENT_D_EXEMPLE, relanceDExemple } from '../exemple-de-relance';

describe('la relance d’exemple', () => {
	it('est le vrai premier rappel, au nom du gérant, pour un client fictif', () => {
		const { objet, corps } = relanceDExemple('Durand BTP', '2026-10-23');
		expect(objet.length).toBeGreaterThan(0);
		expect(corps).toContain('Durand BTP');
		expect(corps).toContain('FA-2026-0142');
		expect(`${objet} ${corps}`.toLowerCase()).not.toContain('letikette');
		expect(CLIENT_D_EXEMPLE).toBe('Atelier Martin');
	});
});

const CORPS = [
	'Madame, Monsieur,',
	'Sauf erreur de notre part, les factures suivantes restent à régler :',
	'— facture FA-12 du 3 septembre 2026 : 1 200,00 €\n— facture FA-14 du 18 septembre 2026 : 640,00 €',
	'Pour toute question : compta@durand-btp.fr',
	'Marie Durand'
].join('\n\n');

describe('la relance, sans image posée', () => {
	const html = relanceHtml(CORPS, 'Durand BTP');

	it('porte le nom du créancier en tête, et aucune image', () => {
		expect(html).toContain('Durand BTP');
		expect(html).not.toContain('<img');
	});

	it('ne nomme jamais le logiciel', () => {
		expect(html.toLowerCase()).not.toContain('letikette');
	});
});

describe('la relance, avec le logo et la couleur du gérant', () => {
	const html = relanceHtml(CORPS, 'Durand BTP', {
		logo: { src: 'cid:logo', largeur: 600, hauteur: 200 },
		couleur: '#ffd400'
	});

	it('pose le logo en tête, à une taille écrite, dans l’e-mail lui-même', () => {
		expect(html).toContain('src="cid:logo"');
		expect(html).toContain('width="144"');
		expect(html).toContain('height="48"');
		expect(html).toContain('alt="Durand BTP"');
	});

	it('n’héberge aucune image : rien ne se charge depuis un serveur', () => {
		expect(html).not.toMatch(/<img[^>]+src="https?:/);
	});

	it('pose la couleur en bande, et une nuance lisible sur les liens', () => {
		expect(html).toContain('border-top:4px solid #ffd400');
		expect(html).not.toMatch(/<a [^>]*color:#ffd400/);
		expect(html).toMatch(/<a href="mailto:compta@durand-btp\.fr" style="color:#[0-9a-f]{6}/);
	});

	it('ne change pas un mot du texte', () => {
		for (const mot of ['Madame, Monsieur,', 'Facture FA-12 du 3 septembre 2026', 'Marie Durand']) {
			expect(html).toContain(mot);
		}
	});

	it('ne nomme toujours pas le logiciel', () => {
		expect(html.toLowerCase()).not.toContain('letikette');
	});
});
