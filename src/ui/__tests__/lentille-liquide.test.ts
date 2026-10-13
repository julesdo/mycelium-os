import { describe, expect, it } from 'vitest';
import {
	ETIREMENT_MAX,
	RESSORT_DERRIERE,
	RESSORT_DEVANT,
	amincissement,
	pasDeRessort
} from '../lentille-liquide';

/**
 * LA LENTILLE LIQUIDE, SANS ÉCRAN — la physique qui fait la déformation.
 *
 * Le mouvement se regarde dans la salle (« Barre + compagnon », la lentille à
 * manipuler) ; ici, on tient ce que les yeux ne mesurent pas : que la goutte
 * s'étire en partant, se pose sans osciller indéfiniment, et ne devient jamais un
 * fil.
 */

const BASE = 58.75;

function sauter(onglets: number) {
	let gauche = 0;
	let droite = BASE;
	let vGauche = 0;
	let vDroite = 0;
	const cibleGauche = onglets * BASE;
	const cibleDroite = (onglets + 1) * BASE;
	let pic = 0;
	for (let i = 0; i < 90; i++) {
		const g = pasDeRessort(gauche, vGauche, cibleGauche, RESSORT_DERRIERE, 1 / 60);
		const d = pasDeRessort(droite, vDroite, cibleDroite, RESSORT_DEVANT, 1 / 60);
		gauche = g.x;
		vGauche = g.v;
		droite = d.x;
		vDroite = d.v;
		if (droite - gauche > BASE * ETIREMENT_MAX) {
			gauche = droite - BASE * ETIREMENT_MAX;
			vGauche = Math.max(vGauche, vDroite * 0.9);
		}
		pic = Math.max(pic, (droite - gauche) / BASE);
	}
	return { pic, gauche, droite, cibleGauche, cibleDroite };
}

describe('La lentille liquide de la barre', () => {
	it('s’étire en partant, et plus loin elle va, plus elle s’étire', () => {
		const un = sauter(1);
		const deux = sauter(2);
		expect(un.pic).toBeGreaterThan(1.2);
		expect(deux.pic).toBeGreaterThan(un.pic);
	});

	it('ne devient jamais un fil', () => {
		expect(sauter(3).pic).toBeLessThanOrEqual(ETIREMENT_MAX + 1e-9);
	});

	it('se pose exactement sur son onglet', () => {
		const saut = sauter(2);
		expect(saut.gauche).toBeCloseTo(saut.cibleGauche, 0);
		expect(saut.droite).toBeCloseTo(saut.cibleDroite, 0);
	});

	it('s’amincit en s’étirant, et gagne un rien de hauteur en se ramassant', () => {
		expect(amincissement(BASE, BASE)).toBe(1);
		expect(amincissement(BASE * 1.5, BASE)).toBeLessThan(1);
		expect(amincissement(BASE * 3, BASE)).toBeGreaterThanOrEqual(0.76);
		expect(amincissement(BASE * 0.9, BASE)).toBeGreaterThan(1);
		expect(amincissement(BASE * 0.5, BASE)).toBeLessThanOrEqual(1.08);
	});
});
