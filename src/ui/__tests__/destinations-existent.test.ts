import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * TOUTE DESTINATION ÉCRITE MÈNE QUELQUE PART.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI LE TYPAGE DU ROUTEUR NE SUFFIT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * TanStack type `to` par l'arbre des routes, et c'est vrai — tant qu'on écrit
 * `<Link to="…">`. Mais le produit n'écrit presque jamais ça : il écrit
 * `<Button as={Link} to="…">`, `<ListButton as={Link} …>`, et chaque
 * composant POLYMORPHE efface le générique du routeur en passant par
 * `ElementType`. La destination redevient une chaîne libre, et le compilateur
 * accepte n'importe quoi.
 *
 * Ce n'est pas une hypothèse. `/app/factures` n'a JAMAIS été une route
 * déclarée. Elle a été retirée de la barre de navigation — dont le commentaire
 * affirme que le typage empêche désormais la récidive — et elle a survécu dans
 * le bouton principal de l'écran d'abonnement, où `as={Link}` rouvrait
 * exactement le même trou. Le lien menait à une page d'erreur.
 *
 * La leçon est celle qui est déjà écrite ailleurs dans ce dépôt : une barrière
 * s'exécute, elle ne se convient pas. Un typage qu'une seule prop désactive
 * n'est pas une barrière, c'est une habitude.
 *
 * ⚠️ CE TEST NE REGARDE QUE LES LITTÉRAUX, et c'est assumé. Une destination
 * calculée (`vers={…}`) est hors de portée d'un balayage de texte — mais elle
 * est aussi celle qui passe par une prop typée par nous (`LinkProps['to']`),
 * donc celle que le compilateur tient déjà. Les deux moitiés se complètent :
 * le compilateur tient ce qui est calculé, ce test tient ce qui est écrit.
 */

const RACINE = join(import.meta.dirname, '..', '..');

/** Les chemins que le routeur sert réellement, lus dans l'arbre généré. */
function routesDeclarees(): ReadonlySet<string> {
	const genere = readFileSync(join(RACINE, 'routeTree.gen.ts'), 'utf8');
	const chemins = new Set<string>();
	for (const [, chemin] of genere.matchAll(/^\s+'(\/[^']*)':\s*typeof/gm)) {
		if (chemin === undefined) continue;
		// `/app/` (l'index) et `/app` désignent le même écran pour un auteur.
		chemins.add(normaliser(chemin));
	}
	return chemins;
}

/** Tous les `.ts`/`.tsx` du produit, sauf les tests et le code généré. */
function fichiersDuProduit(dossier: string, trouves: string[] = []): string[] {
	for (const entree of readdirSync(dossier)) {
		if (entree === '__tests__' || entree === '_generated' || entree === 'node_modules') continue;
		const chemin = join(dossier, entree);
		if (statSync(chemin).isDirectory()) {
			fichiersDuProduit(chemin, trouves);
		} else if (/\.tsx?$/.test(entree) && !entree.endsWith('routeTree.gen.ts')) {
			trouves.push(chemin);
		}
	}
	return trouves;
}

/**
 * Une destination littérale, ramenée à sa forme comparable.
 *
 * Les segments dynamiques sont normalisés : le routeur déclare `$id`, et c'est
 * ce que les auteurs écrivent aussi, donc rien à traduire. En revanche une
 * destination portant une ancre ou une recherche (`?`, `#`) est tronquée à son
 * chemin — c'est lui seul qui doit exister.
 */
function normaliser(destination: string): string {
	const chemin = destination.split(/[?#]/)[0] ?? destination;
	return chemin.length > 1 ? chemin.replace(/\/$/, '') : chemin;
}

describe('les destinations écrites dans le produit', () => {
	it('mènent toutes à une route déclarée', () => {
		const declarees = routesDeclarees();
		expect(declarees.size).toBeGreaterThan(10);

		const morts: string[] = [];

		for (const fichier of fichiersDuProduit(RACINE)) {
			const source = readFileSync(fichier, 'utf8');
			const lignes = source.split('\n');

			lignes.forEach((ligne, index) => {
				// Uniquement les props de destination, et uniquement en littéral :
				// `to="/x"`, `vers="/x"`, `retourVers="/x"`.
				for (const [, , destination] of ligne.matchAll(
					/\b(to|vers|retourVers)=["'](\/[^"']*)["']/g
				)) {
					if (destination === undefined) continue;
					// Les routes d'API ne sont pas servies par le routeur de pages.
					if (destination.startsWith('/api/')) continue;
					if (declarees.has(normaliser(destination))) continue;
					morts.push(
						`${fichier.slice(RACINE.length + 1).split(sep).join('/')}:${index + 1} → ${destination}`
					);
				}
			});
		}

		expect(morts, `Destinations qui ne mènent à aucune route :\n${morts.join('\n')}`).toEqual([]);
	});
});
