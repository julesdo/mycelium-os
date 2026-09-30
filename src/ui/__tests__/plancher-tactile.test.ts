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
	 * ⚠️ LE CORPS DU PRODUIT EST CALÉ SUR LES RÉFÉRENCES, PAR MESURE, DANS LES
	 * DEUX SENS.
	 *
	 * Le 30/09/2026 au matin : quatre-vingt-deux pour cent du texte tombait sur
	 * 12 ou 14 px, la LÉGENDE de l'échelle d'Apple. On l'avait remonté aux points
	 * d'iOS. L'après-midi, mesuré au navigateur sur les captures de Claude et de
	 * Revolut — la taille à laquelle notre police rend les mêmes chaînes à la
	 * même largeur —, le corps s'est révélé juste à un pixel près, et la
	 * sous-ligne trop grosse de deux (`docs/superpowers/specs/2026-09-30-codes-des-references.md`).
	 *
	 * Ce test tient donc une FOURCHETTE, pas un nombre : il refuse qu'on
	 * redescende à la légende, et il refuse qu'on remonte au-dessus de ce que
	 * les références rendent. Une échelle qui a bougé deux fois dans la même
	 * journée est une échelle qu'on bougera encore ; la fourchette dit où.
	 */
	it('écrit le produit au corps des références, ni plus bas ni plus haut', () => {
		const tokens = readFileSync(join(UI, '..', 'styles', 'tokens.css'), 'utf8');
		const lu = (nom: string): number => {
			const trouve = tokens.match(new RegExp(`--text-cladd-${nom}:\\s*(\\d+)px`));
			if (trouve === null) throw new Error(`--text-cladd-${nom} introuvable dans tokens.css`);
			return Number(trouve[1]);
		};

		// `xs` est le cheval de trait : c'est lui que la bibliothèque impose au
		// texte des boutons, et lui que l'écran emploie deux cents fois. Claude
		// rend ses rangées à 16,4–17,1 px équivalents, Revolut à 15,7.
		expect(lu('xs'), 'Le corps : entre 16 et 17 px, comme les références.').toBeGreaterThanOrEqual(
			16
		);
		expect(lu('xs'), 'Le corps : entre 16 et 17 px, comme les références.').toBeLessThanOrEqual(17);
		// La sous-ligne : Claude 13,3, Revolut 12,3. En dessous de 13, c'est la
		// légende ; au-dessus de 14, elle concurrence le titre qu'elle accompagne.
		expect(lu('2xs'), 'La sous-ligne : entre 13 et 14 px.').toBeGreaterThanOrEqual(13);
		expect(lu('2xs'), 'La sous-ligne : entre 13 et 14 px.').toBeLessThanOrEqual(14);
		expect(lu('3xs'), 'La note de bas de page ne descend pas sous 12 px.').toBeGreaterThanOrEqual(
			12
		);
	});
});
