import { describe, expect, it } from 'vitest';
import { ajusterDans, cadreDuContenu } from '../cadrage';

type Rgba = readonly [number, number, number, number];

/** Une image `largeur × hauteur` d'un fond, et un pavé d'une autre couleur. */
function image(
	largeur: number,
	hauteur: number,
	fond: Rgba,
	pave?: { x: number; y: number; l: number; h: number; couleur: Rgba }
): Uint8ClampedArray {
	const pixels = new Uint8ClampedArray(largeur * hauteur * 4);
	for (let y = 0; y < hauteur; y++) {
		for (let x = 0; x < largeur; x++) {
			const dedans =
				pave !== undefined &&
				x >= pave.x &&
				x < pave.x + pave.l &&
				y >= pave.y &&
				y < pave.y + pave.h;
			pixels.set(dedans ? pave.couleur : fond, (y * largeur + x) * 4);
		}
	}
	return pixels;
}

const TRANSPARENT: Rgba = [0, 0, 0, 0];
const BLANC: Rgba = [255, 255, 255, 255];
const ROUGE: Rgba = [211, 47, 47, 255];

describe('le cadre du contenu d’un logo', () => {
	it('rogne les marges transparentes', () => {
		const pixels = image(10, 6, TRANSPARENT, { x: 3, y: 2, l: 4, h: 2, couleur: ROUGE });
		expect(cadreDuContenu(pixels, 10, 6)).toEqual({ x: 3, y: 2, largeur: 4, hauteur: 2 });
	});

	it('rogne un fond blanc uni', () => {
		const pixels = image(12, 8, BLANC, { x: 2, y: 1, l: 5, h: 6, couleur: ROUGE });
		expect(cadreDuContenu(pixels, 12, 8)).toEqual({ x: 2, y: 1, largeur: 5, hauteur: 6 });
	});

	it('laisse entière une image sans fond uni', () => {
		const pixels = image(4, 4, BLANC);
		pixels.set(ROUGE, 0);
		expect(cadreDuContenu(pixels, 4, 4)).toEqual({ x: 0, y: 0, largeur: 4, hauteur: 4 });
	});

	it('ne rend rien pour une image vide', () => {
		expect(cadreDuContenu(image(5, 5, TRANSPARENT), 5, 5)).toBeNull();
	});
});

describe('ajuster dans un cadre', () => {
	it('réduit en gardant les proportions, sans jamais agrandir', () => {
		expect(ajusterDans(1200, 400, 600, 200)).toEqual({ largeur: 600, hauteur: 200 });
		expect(ajusterDans(1000, 1000, 600, 200)).toEqual({ largeur: 200, hauteur: 200 });
		expect(ajusterDans(120, 40, 600, 200)).toEqual({ largeur: 120, hauteur: 40 });
	});
});
