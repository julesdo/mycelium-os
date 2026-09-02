import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * La frontière entre le socle et les verticales, rendue opposable.
 *
 * POURQUOI UN TEST ET PAS UNE CONVENTION. Le critère d'acceptation n° 7 du
 * brief de remodelage dit qu'« un nouveau pays ou une nouvelle procédure
 * s'ajoute sans toucher au socle ». Une arborescence bien rangée ne garantit
 * pas ça une semaine : il suffit d'un `import { SEUILS } from
 * '../verticales/egalim/referentiel'` glissé dans le socle pour qu'il cesse
 * d'être réutilisable, et rien ne le signale — le code compile, les tests
 * passent, et la dépendance ne se découvre qu'en écrivant la deuxième
 * verticale, quand il est cher de la défaire.
 *
 * CE QUE CE TEST INTERDIT EXACTEMENT. Un fichier de `src/lib/socle/` ne peut
 * importer ni `verticales/`, ni `convex/`. Les deux interdits ont des raisons
 * différentes :
 *
 *   - `verticales/` : c'est la définition même du socle. Il sert une loi qu'il
 *     ne connaît pas.
 *   - `convex/` : le socle doit rester testable sans harnais de plateforme, et
 *     réutilisable si le backend change un jour. C'est aussi ce qui permet à
 *     ses tests de tourner en 3 secondes.
 *
 * L'INVERSE EST AUTORISÉ, et c'est tout l'intérêt : une verticale importe le
 * socle librement, et deux verticales peuvent importer le même socle sans se
 * connaître.
 */

const RACINE_SOCLE = join(process.cwd(), 'src', 'lib', 'socle');

/** Les imports interdits au socle, avec la raison affichée quand ça tombe. */
const INTERDITS: ReadonlyArray<{ motif: RegExp; raison: string }> = [
	{
		motif: /from\s+'[^']*verticales\//,
		raison: "le socle sert une loi qu'il ne connaît pas"
	},
	{
		motif: /from\s+'[^']*\/convex\//,
		raison: 'le socle doit rester testable sans harnais de plateforme'
	}
];

function fichiersTypeScript(dossier: string): string[] {
	const trouves: string[] = [];
	for (const entree of readdirSync(dossier)) {
		const chemin = join(dossier, entree);
		if (statSync(chemin).isDirectory()) {
			trouves.push(...fichiersTypeScript(chemin));
		} else if (entree.endsWith('.ts') && !entree.endsWith('.test.ts')) {
			trouves.push(chemin);
		}
	}
	return trouves;
}

describe('frontière socle / verticales', () => {
	const fichiers = fichiersTypeScript(RACINE_SOCLE);

	it('le socle contient bien des modules à surveiller', () => {
		// Garde-fou du garde-fou : si la découverte de fichiers casse, les
		// assertions ci-dessous passeraient sur une liste vide, et ce test
		// deviendrait un mensonge silencieux.
		expect(fichiers.length).toBeGreaterThanOrEqual(9);
	});

	it.each(INTERDITS)('aucun fichier du socle n\'importe $raison', ({ motif, raison }) => {
		const fautifs: string[] = [];

		for (const chemin of fichiers) {
			const contenu = readFileSync(chemin, 'utf8');
			for (const ligne of contenu.split('\n')) {
				if (motif.test(ligne)) {
					fautifs.push(`${relative(process.cwd(), chemin)} → ${ligne.trim()}`);
				}
			}
		}

		expect(fautifs, `Interdit : ${raison}.\n${fautifs.join('\n')}`).toEqual([]);
	});
});
