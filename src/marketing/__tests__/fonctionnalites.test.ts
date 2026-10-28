import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FONCTIONNALITES, LOGICIELS_BRANCHES, TUILES_DU_SITE } from '../fonctionnalites';
import { LOGOS_DES_SERVICES } from '../../ui/logos-services';

/**
 * LE REGISTRE DE CE QUE FAIT LETIKETTE MÈNE QUELQUE PART (14/10/2026).
 *
 * Le menu « Logiciel », la grille et le pied lisent `FONCTIONNALITES` : chaque
 * entrée y est un lien. Un lien vers une ancre que la page ne pose pas ne casse
 * rien au compilateur et dépose le visiteur en haut de la page, sans un mot.
 * Ce test le rattrape, comme une capture ou un logo que `public/` n'a plus.
 */
const MARKETING = join(import.meta.dirname, '..');
const PUBLIC = join(import.meta.dirname, '..', '..', '..', 'public');

describe('le registre des fonctions', () => {
	it('mène chaque entrée, son menu et sa tuile à une section de l’accueil', () => {
		const dossier = join(MARKETING, 'site');
		const ids = new Set<string>();
		for (const fichier of readdirSync(dossier).filter((nom) => nom.endsWith('.tsx'))) {
			const source = readFileSync(join(dossier, fichier), 'utf8');
			for (const [, id] of source.matchAll(/\bid="([a-z-]+)"/g)) if (id !== undefined) ids.add(id);
		}
		for (const { cle, ancre: deLAccueil, menu, carte } of FONCTIONNALITES) {
			for (const ancre of [deLAccueil.slice(1), menu?.ancre, carte?.ancre]) {
				if (ancre === undefined) continue;
				expect(ids.has(ancre.slice(1)), `aucune section du site ne pose ${ancre} (${cle})`).toBe(
					true
				);
			}
		}
		for (const cle of TUILES_DU_SITE)
			expect(FONCTIONNALITES.find((f) => f.cle === cle)?.carte, cle).toBeDefined();
	});

	it('donne à chaque fonction un nom de cinq mots au plus', () => {
		for (const { cle, nom } of FONCTIONNALITES) {
			expect(nom.split(/\s+/).length, cle).toBeLessThanOrEqual(5);
		}
	});

	it('montre des écrans et des logos qui existent', () => {
		for (const { cle, capture } of FONCTIONNALITES) {
			if (capture === undefined) continue;
			for (const largeur of [393, 786]) {
				expect(
					existsSync(join(PUBLIC, 'ecrans', `${capture}-${largeur}.png`)),
					`${cle} ${largeur}`
				).toBe(true);
			}
		}
		for (const { nom, logo } of LOGICIELS_BRANCHES) {
			if ('fichier' in logo)
				expect(existsSync(join(PUBLIC, logo.fichier.slice(1))), nom).toBe(true);
			else expect(LOGOS_DES_SERVICES[logo.dessin], nom).toBeDefined();
		}
	});
});
