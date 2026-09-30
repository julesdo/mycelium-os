import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FAMILLES } from '../familles';

/**
 * LA TEINTE DIT DE QUOI IL S'AGIT, JAMAIS SI C'EST GRAVE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CETTE BARRIÈRE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le produit tient deux systèmes de couleur sur le même écran, et ils ne
 * doivent jamais se croiser :
 *
 *   · LES SEUILS — vert, ambre, rouge. Ils ne disent qu'une chose : au-dessus
 *     du seuil, tout près, en dessous. C'est la seule couleur du produit qui
 *     porte une information, et un gérant doit pouvoir lire une jauge d'un coup
 *     d'œil sans se demander si la teinte veut dire autre chose ailleurs.
 *   · LES FAMILLES — de l'argent, du temps, des papiers, ce qui part, ce qu'on
 *     vous demande, la machine. Elles disent la NATURE d'une rangée, pour que
 *     l'œil la trouve sans lire.
 *
 * Le jour où une famille emprunte une teinte de seuil, les deux systèmes se
 * contaminent : l'ambre cesse de vouloir dire « tout près » et se met à vouloir
 * dire « une date », et plus aucune jauge du produit ne se lit. C'est le genre
 * de dérive qui arrive par une seule ligne, dans une seule revue, parce que le
 * rouge « allait bien » sur une rangée.
 *
 * ⚠️ IL BALAIE AUSSI LES ÉCRANS. Le registre peut rester propre pendant qu'un
 * écran pose `color="red"` à la main sur une vignette : la barrière serait
 * verte et la règle défaite.
 */

const RESERVEES = ['red', 'orange', 'yellow', 'lime', 'green'] as const;

describe('les familles de rangées', () => {
	it('n’empruntent aucune teinte de seuil', () => {
		const fautives = Object.entries(FAMILLES)
			.filter(([, famille]) => (RESERVEES as readonly string[]).includes(famille.teinte))
			.map(([nom, famille]) => `${nom} → ${famille.teinte}`);

		expect(
			fautives,
			[
				'Familles qui empruntent une teinte réservée aux seuils :',
				...fautives.map((f) => `  ${f}`),
				'',
				'Le vert, l’ambre et le rouge ne disent qu’une chose dans ce produit :',
				'au-dessus du seuil, tout près, en dessous. Une famille qui les emprunte',
				'vole leur sens aux jauges, à deux écrans d’ici.'
			].join('\n')
		).toEqual([]);
	});

	it('sont six, et chacune nomme ce qu’elle désigne', () => {
		const noms = Object.keys(FAMILLES);
		expect(noms.length, 'Une septième famille est le signe qu’il faut relire le domaine.').toBe(6);
		for (const [nom, famille] of Object.entries(FAMILLES)) {
			expect(famille.quoi.length, `${nom} ne dit pas ce qu’elle désigne`).toBeGreaterThan(3);
		}
	});

	it('gardent leur teinte : aucun écran n’en impose une autre à la vignette', () => {
		const racine = join(import.meta.dirname, '..', '..');
		const fautifs: string[] = [];

		function balayer(dossier: string) {
			for (const entree of readdirSync(dossier)) {
				if (entree === '__tests__' || entree === '_generated' || entree === 'node_modules')
					continue;
				const chemin = join(dossier, entree);
				if (statSync(chemin).isDirectory()) {
					balayer(chemin);
					continue;
				}
				if (!/\.tsx$/.test(entree)) continue;
				const source = readFileSync(chemin, 'utf8');
				for (const [balise] of source.matchAll(/<VignetteRangee\b[^>]*>/g)) {
					if (/\bcolor=/.test(balise)) {
						fautifs.push(`${chemin.slice(chemin.indexOf('src'))} — ${balise.slice(0, 70)}`);
					}
				}
			}
		}
		balayer(join(racine, 'ui'));
		balayer(join(racine, 'screens'));

		expect(
			fautifs,
			[
				'Une vignette dont la teinte est forcée par l’écran :',
				...fautifs.map((f) => `  ${f}`),
				'',
				'La teinte vient de la FAMILLE, jamais de l’écran. Sinon deux rangées',
				'de même nature se peignent différemment selon l’endroit, et la',
				'convention qu’on vient d’apprendre ne tient plus.'
			].join('\n')
		).toEqual([]);
	});
});
