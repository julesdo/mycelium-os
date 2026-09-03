import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { sansCommentaires } from '../../../__tests__/source-lisible';

/**
 * AUCUNE RÈGLE DE DROIT HORS DU REGISTRE.
 *
 * POURQUOI CE TEST. Le critère d'acceptation n° 2 du brief dit qu'« aucune
 * valeur juridique n'est écrite en dur hors du fichier de paramètres ». Le
 * risque n'est pas théorique : la page publique citait « art. L441-10 et
 * L110-4 » à la main, à côté d'un taux de 12,40 % recopié un jour où il valait
 * ça. Le taux se réancre deux fois par an ; la page, elle, ne bougeait plus.
 *
 * CE QU'ON CHERCHE, ET POURQUOI C'EST LE BON SIGNAL. Une référence d'article —
 * `L441-10`, `L110-4`, `D441-5` — est la SIGNATURE d'une règle de droit. Quand
 * elle apparaît ailleurs que dans le registre ou dans un module de pays, c'est
 * qu'une règle a été recopiée au lieu d'être lue, et une règle recopiée diverge
 * en silence.
 *
 * CE QUE CE TEST NE VOIT PAS, ET IL FAUT LE DIRE. Un délai écrit `5` ou un taux
 * écrit `0.1240` sans citation lui échappent : rien ne les distingue d'un
 * nombre ordinaire. Ce garde-fou attrape la faute LISIBLE, pas toutes les
 * fautes. Prétendre l'inverse ferait exactement le tort qu'on essaie
 * d'empêcher : croire une règle tenue parce qu'un test porte son nom.
 *
 * OÙ LES ARTICLES ONT LE DROIT D'ÊTRE :
 *
 *   - `parametres.ts` — le registre. C'est sa définition : chaque paramètre y
 *     porte sa source, et un paramètre sans source y vaut `null`.
 *   - `pays/**` — les modules de droit national, qui résolvent les séries
 *     (taux semestriels, régimes de prescription) et citent chacun leur texte.
 *
 * Partout ailleurs — décompte, contrôle, qualification, écrans, page publique,
 * courriels — on LIT le registre, on ne le recopie pas.
 */

/** La signature d'une référence d'article : `L441-10`, `L. 110-4`, `D441-5`. */
const REFERENCE_ARTICLE = /\b[LRD]\.? ?\d{3}-\d+/;

const RACINE = join(process.cwd(), 'src');

/** Les deux seuls endroits autorisés à citer un texte. */
const AUTORISES = [
	join('src', 'lib', 'verticales', 'recouvrement', 'parametres.ts'),
	join('src', 'lib', 'verticales', 'recouvrement', 'pays') + sep
];

function estAutorise(cheminRelatif: string): boolean {
	return AUTORISES.some((autorise) => cheminRelatif.startsWith(autorise));
}

function fichiersSources(dossier: string): string[] {
	const trouves: string[] = [];
	for (const entree of readdirSync(dossier)) {
		const chemin = join(dossier, entree);
		if (statSync(chemin).isDirectory()) {
			trouves.push(...fichiersSources(chemin));
			continue;
		}
		// Les fichiers générés par Convex ne sont pas écrits à la main, et les
		// tests ont le droit de citer ce qu'ils vérifient.
		if (!/\.tsx?$/.test(entree) || entree.includes('.test.')) continue;
		if (chemin.includes(`${sep}_generated${sep}`)) continue;
		trouves.push(chemin);
	}
	return trouves;
}

describe('les règles de droit ne vivent que dans le registre', () => {
	const fichiers = fichiersSources(RACINE);

	it('le balayage voit bien les sources du produit', () => {
		// Garde-fou du garde-fou : sur une liste vide, l'assertion suivante
		// passerait toujours.
		expect(fichiers.length).toBeGreaterThanOrEqual(50);
	});

	it('sait reconnaître une citation quand il en voit une', () => {
		// Contre-épreuve : sans elle, « aucune occurrence » et « le détecteur ne
		// détecte rien » sont indiscernables.
		expect(REFERENCE_ARTICLE.test('art. L441-10 II du code de commerce')).toBe(true);
		expect(REFERENCE_ARTICLE.test('Article L. 110-4')).toBe(true);
		expect(REFERENCE_ARTICLE.test('décret n° 2012-1115')).toBe(false);
	});

	it('les deux emplacements autorisés existent et citent vraiment des textes', () => {
		// Si le registre était vidé ou déplacé, le test ci-dessous passerait sans
		// rien garder — et on croirait la règle tenue.
		const citants = fichiers.filter(
			(chemin) =>
				estAutorise(relative(process.cwd(), chemin)) &&
				REFERENCE_ARTICLE.test(sansCommentaires(readFileSync(chemin, 'utf8')))
		);
		// Deux : le registre `parametres.ts` et `pays/france/prescription.ts`. Le
		// module des taux, lui, ne cite ses articles que dans ses commentaires.
		expect(citants.length).toBeGreaterThanOrEqual(2);
	});

	it('aucun autre fichier ne cite un article du code', () => {
		const fautifs: string[] = [];

		for (const chemin of fichiers) {
			const relatif = relative(process.cwd(), chemin);
			if (estAutorise(relatif)) continue;

			const lisible = sansCommentaires(readFileSync(chemin, 'utf8'));
			for (const [index, ligne] of lisible.split('\n').entries()) {
				if (REFERENCE_ARTICLE.test(ligne)) {
					fautifs.push(`${relatif}:${index + 1} → ${ligne.trim()}`);
				}
			}
		}

		expect(
			fautifs,
			'Une règle de droit se lit dans le registre, elle ne se recopie pas : ' +
				'une copie diverge en silence le jour où la source est corrigée.\n' +
				fautifs.join('\n')
		).toEqual([]);
	});
});
