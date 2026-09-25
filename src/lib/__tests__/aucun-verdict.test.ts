import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { sansCommentaires } from './source-lisible';

/**
 * AUCUN VERDICT JURIDIQUE DANS CE QUE LE GÉRANT LIT.
 *
 * La relecture juridique du 25/09/2026 l'a posé : un logiciel payant qui dit
 * qu'une créance « remplit les conditions », qu'elle est « éligible » ou
 * « mûre », ou qui pèse la force d'une pièce, donne très probablement une
 * consultation juridique. Le logiciel lit, calcule et montre ; le gérant
 * qualifie, choisit et signe.
 *
 * ⚠️ LE BALAYAGE PORTE AUSSI SUR LE DOMAINE ET SUR CONVEX, pas seulement sur les
 * écrans : les phrases qui arrivent à l'écran y sont composées. Les
 * commentaires sont retirés, pour que le produit puisse expliquer POURQUOI ces
 * mots sont interdits sans déclencher l'interdit.
 */

const SURFACES = [
	join('src', 'ui'),
	join('src', 'screens'),
	join('src', 'routes'),
	join('src', 'marketing'),
	join('src', 'lib', 'config'),
	join('src', 'lib', 'convex'),
	join('src', 'lib', 'verticales')
];

/** Les verdicts, tels qu'ils s'écrivaient. Aucun ne doit plus s'afficher. */
const VERDICTS: readonly RegExp[] = [
	/\bremplit\b[^'"`]{0,40}\bcondition/i,
	/remplit ou ne remplit pas/i,
	/n[’']est pas remplie?\b/i,
	/\bremplies?\b[^'"`]{0,20}\bconditions?\b/i,
	/éligible/i,
	/\bmûres?\b/i,
	/créance qualifiée/i,
	/points? sur 20/i,
	/le plus lourd qui manque/i,
	/score de solidité/i
];

/**
 * Le seul fichier exempté, nommément : celui qui DÉFINIT les verdicts que le
 * compagnon refuse de rendre. Ses motifs contiennent les mots qu'il interdit.
 */
const LISTE_DES_INTERDITS = join('compagnon', 'question-de-droit.ts');

function fichiers(dossier: string): string[] {
	if (!existsSync(dossier)) return [];
	const trouves: string[] = [];
	for (const entree of readdirSync(dossier)) {
		const chemin = join(dossier, entree);
		if (statSync(chemin).isDirectory()) {
			if (entree === '__tests__' || entree === '_generated') continue;
			trouves.push(...fichiers(chemin));
			continue;
		}
		if (!/\.tsx?$/.test(entree) || entree.includes('.test.')) continue;
		trouves.push(chemin);
	}
	return trouves;
}

describe('aucun verdict juridique dans ce que le gérant lit', () => {
	const tous = SURFACES.flatMap((surface) => fichiers(join(process.cwd(), surface)));

	it('le balayage voit bien le produit', () => {
		expect(tous.length).toBeGreaterThanOrEqual(100);
	});

	it('sait reconnaître un verdict quand il en voit un', () => {
		const fautifs = [
			"const t = 'La créance remplit les quatre conditions.';",
			"const t = `${x} n'est pas rempli.`;",
			'<Chip>Mûre pour une procédure</Chip>',
			'<p>3 points sur 20</p>'
		];
		for (const fautif of fautifs) {
			expect(
				VERDICTS.some((v) => v.test(sansCommentaires(fautif))),
				fautif
			).toBe(true);
		}
		const legitime = '// Plus de « créance mûre » depuis le 25/09.\nconst x = 1;';
		expect(VERDICTS.some((v) => v.test(sansCommentaires(legitime)))).toBe(false);
	});

	it('aucun écran, aucune alerte, aucune phrase du domaine ne qualifie une créance', () => {
		const trouves: string[] = [];
		for (const chemin of tous.filter((c) => !c.endsWith(LISTE_DES_INTERDITS))) {
			const lisible = sansCommentaires(readFileSync(chemin, 'utf8'));
			for (const [index, ligne] of lisible.split('\n').entries()) {
				if (VERDICTS.some((v) => v.test(ligne))) {
					trouves.push(`${relative(process.cwd(), chemin)}:${index + 1} — ${ligne.trim()}`);
				}
			}
		}
		expect(
			trouves,
			'Une phrase qualifie une créance au regard du droit. Montrer ce que dit la loi, ce ' +
				'qu’il y a dans le dossier et ce que le gérant a répondu ; ne jamais conclure.'
		).toEqual([]);
	});
});
