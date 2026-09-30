import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * LE PLANCHER TACTILE NE SE LAISSE PAS ANNULER EN SILENCE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉFAUT QUI A RENDU CE TEST NÉCESSAIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `tokens.css` décale toute l'échelle d'espacement de Cladd pour qu'un contrôle
 * `md` tombe sur 48 px — le plancher tactile du produit, écrit une fois, hérité
 * partout. C'est la barrière la plus économique du système visuel : personne
 * n'écrit de hauteur à la main, donc personne ne peut se tromper.
 *
 * Sauf par `h-auto`. On le pose pour qu'un intitulé long revienne à la ligne au
 * lieu de déborder, ce qui est juste — et il annule AUSSI le plancher, ce qui ne
 * se voit nulle part. Les neuf rangées de la page dossier sont ainsi retombées
 * à 34 px de haut : sous les 44 pt d'Apple, sous les 48 px du produit, et sans
 * qu'aucun test ne bronche.
 *
 * Le terrain l'a nommé avant nous, le 30 septembre 2026 : « tout est trop petit
 * et galère à manipuler ».
 *
 * ⚠️ CE TEST NE MESURE PAS DES PIXELS, ET C'EST VOLONTAIRE. Une hauteur rendue
 * demande un navigateur, donc un harnais qu'on ne fait pas tourner à chaque
 * commit. Ce qu'il vérifie est plus étroit et plus sûr : qu'on n'ait jamais
 * annulé le plancher sans en reposer un.
 */

const UI = join(import.meta.dirname, '..');

/**
 * ⚠️ `aspect-` EST LA SEULE DISPENSE, ET ELLE EST STRUCTURELLE. Une tuile carrée
 * tient sa hauteur de son rapport et de sa largeur : lui poser un `min-h-`
 * casserait le carré au lieu de le garantir. Toute autre raison de poser
 * `h-auto` s'accompagne d'un plancher.
 */
const DISPENSE = /\baspect-/;

function fichiers(dossier: string, trouves: string[] = []): string[] {
	for (const entree of readdirSync(dossier)) {
		if (entree === '__tests__') continue;
		const chemin = join(dossier, entree);
		if (statSync(chemin).isDirectory()) fichiers(chemin, trouves);
		else if (/\.tsx$/.test(entree)) trouves.push(chemin);
	}
	return trouves;
}

/**
 * Les valeurs de `className` qui posent `h-auto`.
 *
 * On lit la chaîne ENTIÈRE, guillemets compris, parce que le plancher peut être
 * écrit avant ou après — et un `cn(...)` sur plusieurs lignes garde ses deux
 * morceaux dans la même expression.
 */
function classesAvecHauteurLibre(source: string): readonly string[] {
	const trouvees: string[] = [];
	for (const [, valeur] of source.matchAll(/className=(?:"([^"]*)"|\{([\s\S]{0,400}?)\}\n)/g)) {
		if (valeur !== undefined && /\bh-auto\b/.test(valeur)) trouvees.push(valeur);
	}
	for (const [, valeur] of source.matchAll(/className=\{([\s\S]{0,400}?)\}\n/g)) {
		if (valeur !== undefined && /\bh-auto\b/.test(valeur) && !trouvees.includes(valeur)) {
			trouvees.push(valeur);
		}
	}
	return trouvees;
}

describe('le plancher tactile', () => {
	it('n’est jamais annulé par `h-auto` sans être reposé', () => {
		const fautifs: string[] = [];
		for (const fichier of fichiers(UI)) {
			const source = readFileSync(fichier, 'utf8');
			for (const classes of classesAvecHauteurLibre(source)) {
				if (/\bmin-h-/.test(classes) || DISPENSE.test(classes)) continue;
				fautifs.push(`${fichier.slice(fichier.indexOf('src'))} — ${classes.trim().slice(0, 80)}`);
			}
		}

		expect(
			fautifs,
			[
				'`h-auto` annule la hauteur héritée de l’échelle, donc le plancher',
				'tactile de 48 px. Chaque emploi doit reposer un `min-h-` :',
				...fautifs.map((f) => `  ${f}`)
			].join('\n')
		).toEqual([]);
	});

	/**
	 * ⚠️ LE CORPS DU PRODUIT EST CELUI D'iOS, ET IL SE VÉRIFIE ICI.
	 *
	 * Quatre-vingt-deux pour cent du texte de l'application tombait sur 12 ou
	 * 14 px, c'est-à-dire sur la LÉGENDE de l'échelle d'Apple, alors que son
	 * corps est à 17. Une échelle ne se décale qu'une fois ; ce test dit qu'elle
	 * ne se redescendra pas par inadvertance.
	 */
	it('écrit le produit au corps d’iOS, pas à sa légende', () => {
		const tokens = readFileSync(join(UI, '..', 'styles', 'tokens.css'), 'utf8');
		const lu = (nom: string): number => {
			const trouve = tokens.match(new RegExp(`--text-cladd-${nom}:\\s*(\\d+)px`));
			if (trouve === null) throw new Error(`--text-cladd-${nom} introuvable dans tokens.css`);
			return Number(trouve[1]);
		};

		// `xs` est le cheval de trait : c'est lui que la bibliothèque impose au
		// texte des boutons, et lui que l'écran emploie deux cents fois.
		expect(lu('xs'), 'Le corps du produit doit valoir celui d’iOS : 17px.').toBe(17);
		expect(lu('2xs'), 'La sous-ligne doit valoir 15px, pas une légende.').toBeGreaterThanOrEqual(15);
		expect(lu('3xs'), 'La note de bas de page ne descend pas sous 13px.').toBeGreaterThanOrEqual(13);
	});
});
