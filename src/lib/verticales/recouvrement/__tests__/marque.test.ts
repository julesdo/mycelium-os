import { describe, expect, it } from 'vitest';
import { contraste } from '../../../socle/couleurs';
import {
	COULEURS_DE_MARQUE,
	nomDeCouleur,
	resumeDeLaMarque,
	tailleDuLogo,
	teintesDuCourriel
} from '../marque';

describe('la palette proposée', () => {
	it('ne propose que des couleurs qui portent un texte blanc et se lisent sur le blanc', () => {
		for (const { hex } of COULEURS_DE_MARQUE) {
			expect(contraste(hex, '#ffffff')).toBeGreaterThanOrEqual(3);
		}
	});
});

describe('le nom d’une couleur', () => {
	it('nomme une couleur de la palette par son nom', () => {
		expect(nomDeCouleur('#1E3A5F')).toBe('Bleu nuit');
	});

	it('nomme une autre couleur par sa famille', () => {
		expect(nomDeCouleur('#d32f2f')).toBe('Rouge');
		expect(nomDeCouleur('#1565c0')).toBe('Bleu');
		expect(nomDeCouleur('#2e7d32')).toBe('Vert');
		expect(nomDeCouleur('#555555')).toBe('Gris');
	});
});

describe('les teintes de l’e-mail', () => {
	it('ne teinte rien sans couleur : la lettre reste grise', () => {
		expect(teintesDuCourriel(undefined)).toBeNull();
	});

	it('garde une couleur foncée telle quelle pour les liens', () => {
		const t = teintesDuCourriel('#1e3a5f')!;
		expect(t.accent).toBe('#1e3a5f');
		expect(t.texte).toBe('#1e3a5f');
		expect(t.ajustee).toBe(false);
	});

	it('assombrit une couleur trop claire pour le texte, et le dit', () => {
		const t = teintesDuCourriel('#ffd400')!;
		expect(t.accent).toBe('#ffd400');
		expect(t.ajustee).toBe(true);
		expect(contraste(t.texte, t.panneau)).toBeGreaterThanOrEqual(4.5);
		expect(contraste(t.texte, '#ffffff')).toBeGreaterThanOrEqual(4.5);
	});
});

describe('la taille du logo dans la lettre', () => {
	it('tient dans 180 × 48 en gardant ses proportions', () => {
		expect(tailleDuLogo(600, 200)).toEqual({ largeur: 144, hauteur: 48 });
		expect(tailleDuLogo(100, 100)).toEqual({ largeur: 48, hauteur: 48 });
		expect(tailleDuLogo(800, 100)).toEqual({ largeur: 180, hauteur: 23 });
	});

	it('ne grossit pas un petit logo', () => {
		expect(tailleDuLogo(40, 20)).toEqual({ largeur: 40, hauteur: 20 });
	});
});

describe('ce que dit la rangée du compte', () => {
	it('dit ce qui est posé, en mots', () => {
		expect(resumeDeLaMarque({ logo: false, couleur: null })).toBe('Par défaut');
		expect(resumeDeLaMarque({ logo: true, couleur: null })).toBe('Votre logo');
		expect(resumeDeLaMarque({ logo: false, couleur: '#1e3a5f' })).toBe('Bleu nuit');
		expect(resumeDeLaMarque({ logo: true, couleur: '#1e3a5f' })).toBe('Logo, bleu nuit');
	});
});
