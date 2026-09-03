import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { sansCommentaires } from './source-lisible';

/**
 * LE MOT « GARANTIE », BALAYÉ SUR TOUTE L'INTERFACE.
 *
 * POURQUOI C'EST UN TEST ET PAS UNE CONSIGNE. `CLAUDE.md` porte cette règle
 * depuis le premier jour — « le mot "garantie" est interdit, et un test balaie
 * toute l'interface » — et le test, lui, n'existait pas. Une règle qu'aucun code
 * ne tient est une règle qu'on croit tenue : c'est pire que pas de règle, parce
 * qu'on cesse de la vérifier à la relecture.
 *
 * CE QUE LE MOT ENGAGE. On ne garantit aucun recouvrement. Un impayé se mesure,
 * se surveille et se chiffre ; qu'il rentre ou non ne dépend pas de nous, et
 * dépend beaucoup de la solvabilité du débiteur. Promettre un résultat sur une
 * page publique, c'est vendre une obligation de résultat qu'on ne peut pas
 * tenir — et l'écrire une fois suffit.
 *
 * ON NE BALAIE QUE CE QUE LE LECTEUR VOIT. Les commentaires sont retirés avant
 * la recherche : ce fichier lui-même écrit le mot une dizaine de fois, et les
 * commentaires du produit doivent pouvoir expliquer POURQUOI il est interdit
 * sans déclencher l'interdit. Un test qui ne peut pas se documenter finit
 * contourné.
 */

/** Les surfaces que le lecteur voit : écrans, page publique, courriels. */
const SURFACES = [
	join('src', 'ui'),
	join('src', 'app'),
	join('src', 'routes'),
	join('src', 'marketing'),
	join('src', 'lib', 'config'),
	join('src', 'lib', 'convex', 'emails')
];

const MOT_INTERDIT = /garanti/i;

function fichiersDInterface(dossier: string): string[] {
	if (!existsSync(dossier)) return [];
	const trouves: string[] = [];
	for (const entree of readdirSync(dossier)) {
		const chemin = join(dossier, entree);
		if (statSync(chemin).isDirectory()) {
			trouves.push(...fichiersDInterface(chemin));
			continue;
		}
		if (!/\.tsx?$/.test(entree) || entree.includes('.test.')) continue;
		trouves.push(chemin);
	}
	return trouves;
}

describe('le mot « garantie » est interdit dans l’interface', () => {
	const fichiers = SURFACES.flatMap((surface) => fichiersDInterface(join(process.cwd(), surface)));

	it('le balayage voit bien l’interface', () => {
		// Garde-fou du garde-fou : sur une liste vide, l'assertion ci-dessous
		// passerait toujours et ce test deviendrait un mensonge silencieux.
		expect(fichiers.length).toBeGreaterThanOrEqual(20);
	});

	it('sait reconnaître une promesse quand il en voit une', () => {
		// Contre-épreuve : sans elle, on ne saurait pas distinguer « aucune
		// occurrence » de « le détecteur ne détecte rien ».
		const fautif = 'export const promesse = <p>Recouvrement garanti sous 60 jours.</p>;';
		expect(MOT_INTERDIT.test(sansCommentaires(fautif))).toBe(true);

		// Et il laisse passer le commentaire qui explique l'interdit.
		const legitime = '// On ne garantit aucun recouvrement.\nconst x = 1;';
		expect(MOT_INTERDIT.test(sansCommentaires(legitime))).toBe(false);
	});

	it('aucun écran, aucune page, aucun courriel ne promet un résultat', () => {
		const fautifs: string[] = [];

		for (const chemin of fichiers) {
			const lisible = sansCommentaires(readFileSync(chemin, 'utf8'));
			for (const [index, ligne] of lisible.split('\n').entries()) {
				if (MOT_INTERDIT.test(ligne)) {
					fautifs.push(`${relative(process.cwd(), chemin)}:${index + 1} → ${ligne.trim()}`);
				}
			}
		}

		expect(
			fautifs,
			`On ne garantit aucun recouvrement : on le mesure, on le surveille, on le chiffre.\n${fautifs.join('\n')}`
		).toEqual([]);
	});
});
