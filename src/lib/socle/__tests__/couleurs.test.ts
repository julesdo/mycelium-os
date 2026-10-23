import { describe, expect, it } from 'vitest';
import {
	assombrirJusquA,
	contraste,
	lireCouleur,
	melanger,
	teintesDominantes,
	versHex
} from '../couleurs';

/** Une image de `n` pixels d'une même couleur, en RGBA. */
function pixels(...zones: readonly (readonly [string, number, number?])[]): Uint8ClampedArray {
	const valeurs: number[] = [];
	for (const [hex, n, alpha = 255] of zones) {
		const c = lireCouleur(hex)!;
		for (let i = 0; i < n; i++) valeurs.push(c.r, c.g, c.b, alpha);
	}
	return new Uint8ClampedArray(valeurs);
}

describe('lire une couleur', () => {
	it('lit les six et les trois chiffres, sans tenir compte de la casse', () => {
		expect(lireCouleur('#1A2B3C')).toEqual({ r: 26, g: 43, b: 60 });
		expect(lireCouleur('#abc')).toEqual({ r: 170, g: 187, b: 204 });
		expect(versHex({ r: 26, g: 43, b: 60 })).toBe('#1a2b3c');
	});

	it('refuse ce qui n’est pas une couleur, au lieu de deviner', () => {
		expect(lireCouleur('bleu')).toBeNull();
		expect(lireCouleur('#12345')).toBeNull();
		expect(lireCouleur('123456')).toBeNull();
	});
});

describe('le contraste', () => {
	it('vaut 21 entre le noir et le blanc, 1 entre deux couleurs égales', () => {
		expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 1);
		expect(contraste('#2451b7', '#2451b7')).toBeCloseTo(1, 5);
	});

	it('assombrit une couleur trop claire jusqu’à se lire sur le blanc, et pas plus', () => {
		const lisible = assombrirJusquA('#ffd400', '#ffffff', 4.5);
		expect(lisible).not.toBe('#ffd400');
		expect(contraste(lisible, '#ffffff')).toBeGreaterThanOrEqual(4.5);
		expect(contraste(lisible, '#ffffff')).toBeLessThan(5.5);
	});

	it('laisse telle quelle une couleur qui se lit déjà', () => {
		expect(assombrirJusquA('#1e3a5f', '#ffffff', 4.5)).toBe('#1e3a5f');
	});

	it('mélange deux couleurs dans la part demandée', () => {
		expect(melanger('#ffffff', '#000000', 0.5)).toBe('#808080');
		expect(melanger('#ffffff', '#2451b7', 0)).toBe('#ffffff');
	});
});

describe('les teintes d’un logo', () => {
	it('rend les couleurs franches, de la plus présente à la moins présente', () => {
		const image = pixels(['#ffffff', 700], ['#d32f2f', 200], ['#1565c0', 100]);
		const teintes = teintesDominantes(image);
		expect(teintes).toHaveLength(2);
		expect(contraste(teintes[0]!, '#d32f2f')).toBeLessThan(1.15);
		expect(contraste(teintes[1]!, '#1565c0')).toBeLessThan(1.15);
	});

	it('ignore le transparent, le blanc, le noir et les gris', () => {
		const image = pixels(
			['#d32f2f', 300, 0],
			['#ffffff', 300],
			['#0a0a0a', 300],
			['#8a8a8a', 300],
			['#1f5f4a', 50]
		);
		const teintes = teintesDominantes(image);
		expect(teintes).toHaveLength(1);
		expect(contraste(teintes[0]!, '#1f5f4a')).toBeLessThan(1.15);
	});

	it('ne rend rien pour un logo noir et blanc', () => {
		expect(teintesDominantes(pixels(['#ffffff', 500], ['#000000', 500]))).toEqual([]);
	});

	it('fond deux nuances voisines en une seule teinte', () => {
		const image = pixels(['#d32f2f', 200], ['#d63434', 200], ['#1565c0', 100]);
		expect(teintesDominantes(image)).toHaveLength(2);
	});
});
