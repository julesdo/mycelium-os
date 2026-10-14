import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FONCTIONNALITES, LOGICIELS_BRANCHES } from '../fonctionnalites';
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

/** Tous les `id="…"` écrits en clair dans les sections du site. */
function identifiantsEcrits(): Set<string> {
	const ids = new Set<string>();
	for (const fichier of readdirSync(MARKETING).filter((nom) => nom.endsWith('.tsx'))) {
		const source = readFileSync(join(MARKETING, fichier), 'utf8');
		for (const [, id] of source.matchAll(/\bid="([a-z-]+)"/g)) if (id !== undefined) ids.add(id);
	}
	return ids;
}

describe('le registre des fonctions', () => {
	it('mène chaque entrée à une section de la page d’accueil', () => {
		const ids = identifiantsEcrits();
		const tuiles = readFileSync(join(MARKETING, 'tout.tsx'), 'utf8');
		for (const fonctionnalite of FONCTIONNALITES) {
			const id = fonctionnalite.ancre.slice(2);
			if (fonctionnalite.tuile) {
				// Une tuile porte la clé de sa fonction comme identifiant.
				expect(id, fonctionnalite.cle).toBe(fonctionnalite.cle);
				expect(tuiles).toContain('id={fonctionnalite.cle}');
			} else {
				expect(ids.has(id), `aucune section ne pose id="${id}" (${fonctionnalite.cle})`).toBe(true);
			}
		}
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
