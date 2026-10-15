import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * La croissance ne connaît ni la loi ni la plateforme : elle se teste en une
 * seconde, et la décision (étapes, score, conseils) ne dépend d'aucun backend.
 * Même règle que le socle (`socle/__tests__/frontiere.test.ts`).
 */
const RACINE = join(process.cwd(), 'src', 'lib', 'croissance');

function fichiers(dossier: string): string[] {
	return readdirSync(dossier).flatMap((nom) => {
		const chemin = join(dossier, nom);
		if (statSync(chemin).isDirectory()) return nom === '__tests__' ? [] : fichiers(chemin);
		return chemin.endsWith('.ts') ? [chemin] : [];
	});
}

describe('la frontière de la croissance', () => {
	it('n’importe ni verticales/ ni convex/', () => {
		const fautifs = fichiers(RACINE).filter((f) =>
			/from\s+'[^']*(verticales\/|\/convex\/)/.test(readFileSync(f, 'utf8'))
		);
		expect(fautifs.map((f) => relative(process.cwd(), f))).toEqual([]);
	});
});
