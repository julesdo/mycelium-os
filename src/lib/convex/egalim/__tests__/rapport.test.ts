import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
	MENTION_RESPONSABILITE,
	MENTION_FIGE,
	MENTION_OBLIGATION_DE_MOYENS
} from '../mentions';

/**
 * La ligne rouge juridique du modèle : Letikette ne garantit jamais la
 * conformité, il la MESURE, la fait progresser et la prouve. La déclaration
 * reste signée par la cantine.
 *
 * Ce test peut sembler excessif. Il ne l'est pas : la ligne se franchit en une
 * phrase bien intentionnée, et personne ne relit un rapport avant de l'envoyer
 * à un client.
 *
 * Il balaie désormais **toute l'interface**, par parcours de dossier, au lieu
 * de viser trois fichiers nommés. La version précédente listait des chemins en
 * dur : elle passait au vert le jour où quelqu'un ajoutait un écran, ce qui est
 * exactement le moment où elle aurait dû mordre.
 */

const RACINES = [
	'src/routes',
	'src/screens',
	'src/ui',
	'src/app',
	'src/marketing',
	'src/lib/convex/egalim'
];
const EXTENSIONS = /\.(ts|tsx)$/;
const IGNORES = /(__tests__|routeTree\.gen|\.test\.)/;

function fichiersSources(racine: string): string[] {
	let entrees: string[];
	try {
		entrees = readdirSync(racine);
	} catch {
		// Une racine peut ne pas encore exister (src/screens avant le chantier 2).
		return [];
	}
	return entrees.flatMap((nom) => {
		const chemin = join(racine, nom);
		if (IGNORES.test(chemin)) return [];
		if (statSync(chemin).isDirectory()) return fichiersSources(chemin);
		return EXTENSIONS.test(nom) ? [chemin] : [];
	});
}

const SOURCES = RACINES.flatMap(fichiersSources);

/**
 * Le code débarrassé de ses commentaires.
 *
 * La règle vise ce qu'un client peut LIRE, pas ce qu'un développeur écrit en
 * marge. Le backend emploie légitimement « garanti » au sens technique (« le
 * seul champ garanti est le montant HT », « la garantie la plus importante du
 * module ») : ces phrases ne quittent jamais le dépôt. Les compter comme des
 * violations aurait forcé à réécrire des commentaires justes, et surtout aurait
 * appris à contourner le test au lieu de le respecter.
 */
function sansCommentaires(chemin: string): string {
	return readFileSync(chemin, 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, ' ')
		.replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('l’interface et le rapport ne promettent rien', () => {
	it('le balayage trouve bien des fichiers à inspecter', () => {
		// Garde-fou : si le parcours renvoie une liste vide, tous les tests
		// ci-dessous passeraient à vide sans rien prouver.
		expect(SOURCES.length).toBeGreaterThan(5);
	});

	it('aucun texte affichable n’emploie « garanti »', () => {
		const fautifs = SOURCES.filter((c) => /garanti/i.test(sansCommentaires(c)));
		expect(fautifs).toEqual([]);
	});

	it('aucun texte affichable ne promet la conformité au futur', () => {
		// « vous serez conforme », « vous seriez conforme », « rendra conforme ».
		const promesse = /(ser[ao][a-z]*|rendr[a-z]+|deviendr[a-z]+)\s+conforme/i;
		const fautifs = SOURCES.filter((c) => promesse.test(sansCommentaires(c)));
		expect(fautifs).toEqual([]);
	});
});

describe('les mentions obligatoires de la restitution', () => {
	it('disent que la déclaration reste signée par l’établissement', () => {
		expect(MENTION_RESPONSABILITE).toMatch(/signée par votre établissement/);
		expect(MENTION_RESPONSABILITE).toMatch(/responsable de l’exactitude/);
	});

	it('disent qu’un diagnostic est figé à sa date', () => {
		const mention = MENTION_FIGE('12 mars 2027');
		expect(mention).toMatch(/figé à sa date/);
		expect(mention).toMatch(/12 mars 2027/);
		expect(mention).toMatch(/nouveau diagnostic/);
	});

	it('énoncent une obligation de moyens, jamais de résultat', () => {
		expect(MENTION_OBLIGATION_DE_MOYENS).toMatch(/obligation de moyens/);
		expect(MENTION_OBLIGATION_DE_MOYENS).not.toMatch(/garanti/i);
	});
});
