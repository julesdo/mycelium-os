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

/** Le compagnon, qui compose les phrases lues par le gérant (B15). */
const RACINE_COMPAGNON = join(
	process.cwd(),
	'src',
	'lib',
	'verticales',
	'recouvrement',
	'compagnon'
);

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

	it.each(INTERDITS)("aucun fichier du socle n'importe $raison", ({ motif, raison }) => {
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

	/**
	 * LA MÊME FRONTIÈRE, UN CRAN PLUS BAS : LE COMPAGNON ET LE PAYS (B15).
	 *
	 * Elle vit ici plutôt que dans un fichier neuf parce que c'est LA MÊME
	 * RÈGLE, appliquée à un autre couple : un module qui ne doit pas connaître
	 * la juridiction qu'il sert. Le socle ne sait pas quelle loi il sert ; le
	 * compagnon ne sait pas quel PAYS il sert.
	 *
	 * POURQUOI LUI, ET POURQUOI MAINTENANT. Le pays est aujourd'hui choisi par
	 * le chemin d'import, à dix-huit endroits du dépôt. Chacun de ces dix-huit
	 * est une ligne à relire le jour d'un second pays, et c'est acceptable : ce
	 * sont des calculs. Un compagnon qui deviendrait le dix-neuvième serait
	 * autre chose, parce que ce qu'il produit est du TEXTE : il faudrait le
	 * réécrire phrase par phrase, et rien ne dirait lesquelles.
	 *
	 * CE QUI REMPLACE L'IMPORT : le registre. `parametres.ts` porte la clé, et
	 * c'est lui qui nomme le module de pays dans `resoluPar`. Le compagnon cite
	 * une clé, jamais un chemin.
	 */
	it('aucun fichier du compagnon n’importe un module de pays', () => {
		const duCompagnon = fichiersTypeScript(RACINE_COMPAGNON);

		// Garde-fou du garde-fou : sur une liste vide, l'assertion qui suit
		// passerait au vert sans avoir rien lu.
		expect(duCompagnon.length).toBeGreaterThanOrEqual(2);

		const motif = /from\s+'[^']*pays\//;
		const fautifs: string[] = [];

		for (const chemin of duCompagnon) {
			const contenu = readFileSync(chemin, 'utf8');
			for (const ligne of contenu.split('\n')) {
				if (motif.test(ligne)) {
					fautifs.push(`${relative(process.cwd(), chemin)} → ${ligne.trim()}`);
				}
			}
		}

		expect(
			fautifs,
			'Interdit : le compagnon ne choisit pas un pays par un chemin d’import. ' +
				'Le droit se résout par une clé de parametres.ts, qui nomme lui-même le module ' +
				`de pays dans resoluPar.\n${fautifs.join('\n')}`
		).toEqual([]);
	});
});
