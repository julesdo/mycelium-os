import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * LES REQUÊTES DE L'INTERFACE PASSENT PAR LE CACHE (`app/donnees.ts`).
 *
 * Un `useQuery` importé de `convex/react` ferme son abonnement quand l'écran se
 * démonte : revenir sur cet écran relance tout depuis zéro et repasse par son
 * squelette. Celui du cache garde l'abonnement ouvert, vivant, cinq minutes.
 * Une seule importation directe suffit à faire clignoter un écran : la règle
 * s'exécute ici, pas en relecture.
 */
const RACINE = join(__dirname, '..', '..');

function fichiers(dossier: string): string[] {
	return readdirSync(dossier).flatMap((nom) => {
		const chemin = join(dossier, nom);
		if (statSync(chemin).isDirectory()) {
			if (nom === '__tests__' || nom === 'convex' || nom === 'node_modules') return [];
			return fichiers(chemin);
		}
		return /\.tsx?$/.test(nom) ? [chemin] : [];
	});
}

describe('les requêtes vivantes', () => {
	it('aucun écran n’importe useQuery de convex/react', () => {
		const fautifs = fichiers(RACINE).filter((chemin) => {
			const texte = readFileSync(chemin, 'utf8');
			return /import \{[^}]*\buseQuery\b[^}]*\} from 'convex\/react'/.test(texte);
		});
		expect(fautifs).toEqual([]);
	});
});
