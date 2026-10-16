import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Le support ne connaît ni la plateforme ni l'écran : ses règles (passage à l'équipe,
 * masquage, horaires, tri de l'entrant, filtres de Plume support) se testent en une seconde.
 * Il peut lire le référentiel (jours fériés) et le socle (IBAN), jamais `convex/` ni `ui/`.
 */
const RACINE = join(process.cwd(), 'src', 'lib', 'support');

function fichiers(dossier: string): string[] {
	return readdirSync(dossier).flatMap((nom) => {
		const chemin = join(dossier, nom);
		if (statSync(chemin).isDirectory()) return nom === '__tests__' ? [] : fichiers(chemin);
		return chemin.endsWith('.ts') ? [chemin] : [];
	});
}

describe('la frontière du support', () => {
	it('n’importe ni convex/, ni ui/, ni screens/', () => {
		const fautifs = fichiers(RACINE).filter((f) =>
			/from\s+'[^']*(\/convex\/|\/ui\/|\/screens\/|\/app\/)/.test(readFileSync(f, 'utf8'))
		);
		expect(fautifs.map((f) => relative(process.cwd(), f))).toEqual([]);
	});
});
