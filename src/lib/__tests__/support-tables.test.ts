import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * LA BARRIÈRE DU SUPPORT — Plume support et l'équipe ne lisent jamais un dossier
 * (spec du service client, § 2.1 et § 12).
 *
 * Chaque `query('<table>')` d'un fichier de `convex/support/` doit nommer une table du
 * support. Un seul fichier compte au-delà, `contexte.ts`, et il ne rend que des
 * scalaires (son validateur de retour, et le test sentinelle de `support.test.ts`).
 * Une fonction nouvelle qui lirait `facturesVente` ou `echangesCompagnon` fait tomber
 * ce test.
 */

const RACINE = join(process.cwd(), 'src', 'lib', 'convex', 'support');

const TABLES_DU_SUPPORT = new Set([
	'conversationsSupport',
	'messagesSupport',
	'compteursSupport',
	'reglagesSupport',
	'reponsesEnregistrees',
	'emailsEntrants',
	'mesuresSupport',
	// L'appartenance de l'auteur, revérifiée à chaque lecture ; les prénoms de l'équipe.
	'organizationMembers',
	'equipe',
	// Un e-mail entrant d'un prospect se range sur sa fiche (données de Letikette).
	'prospects'
]);

/** Ce que `contexte.ts` compte, et seulement lui. */
const TABLES_DU_CONTEXTE = new Set([
	'organizationMembers',
	'pilotes',
	'creances',
	'envois',
	'profilsCreancier',
	'connexionsQonto',
	'connexionsNango',
	'importsRecouvrement'
]);

/**
 * LES MODULES CONVEX QU'UN FICHIER DU SUPPORT PEUT IMPORTER (27/10/2026). Le balayage
 * des \`query('<table>')\` ne voit pas une fonction importée : une aide de
 * \`recouvrement/\` qui lit les factures passerait à travers. Chaque module Convex
 * importé est donc nommé ici, avec ce qu'il apporte.
 */
const MODULES_DU_SUPPORT = new Set([
	'../functions', // les enveloppes d'authentification
	'../lib/auth',
	'../emails/resend',
	'../emails/helpers',
	'../emails/modeles/support'
]);
/** Ce que `contexte.ts` importe en plus, et seulement lui. */
const MODULES_DU_CONTEXTE = new Set([
	'../billing', // la formule effective de l'établissement
	// Les dossiers à démarrer, définis comme sur les écrans du gérant : l'aide lit les
	// factures et les règlements pour écarter un dossier soldé, il n'en sort qu'un nombre.
	'../recouvrement/prepares'
]);

function modulesConvex(fichier: string): string[] {
	return [...readFileSync(join(RACINE, fichier), 'utf8').matchAll(/from '(\.\.\/[^.'][^']*)'/g)]
		.map((m) => m[1] ?? '')
		.filter((chemin) => !chemin.startsWith('../_generated/'));
}

function lectures(fichier: string): string[] {
	return [...readFileSync(join(RACINE, fichier), 'utf8').matchAll(/query\(\s*'(\w+)'/g)].map(
		(m) => m[1] ?? ''
	);
}

describe('la barrière des tables du support', () => {
	const fichiers = readdirSync(RACINE).filter((nom) => nom.endsWith('.ts'));

	it('trouve bien les fichiers et leurs lectures', () => {
		expect(fichiers.length).toBeGreaterThan(4);
		expect(fichiers.flatMap(lectures).length).toBeGreaterThan(5);
	});

	it('ne lit que ses tables, hors du contexte du compte', () => {
		const interdites = fichiers
			.filter((f) => f !== 'contexte.ts')
			.flatMap((f) => lectures(f).filter((t) => !TABLES_DU_SUPPORT.has(t)).map((t) => `${f} lit ${t}`));
		expect(interdites).toEqual([]);
	});

	it('le contexte ne compte que ce que la spec nomme', () => {
		const interdites = lectures('contexte.ts').filter((t) => !TABLES_DU_CONTEXTE.has(t));
		expect(interdites).toEqual([]);
	});

	it('n’importe que les modules Convex nommés', () => {
		expect(modulesConvex('contexte.ts')).toContain('../recouvrement/prepares');
		const interdits = fichiers.flatMap((f) =>
			modulesConvex(f)
				.filter(
					(m) => !MODULES_DU_SUPPORT.has(m) && !(f === 'contexte.ts' && MODULES_DU_CONTEXTE.has(m))
				)
				.map((m) => `${f} importe ${m}`)
		);
		expect(interdits).toEqual([]);
	});
});
