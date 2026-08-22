/**
 * Vérifie que le dossier Convex se déploiera : tout est versionné, tout se
 * regroupe.
 *
 * POURQUOI CE SCRIPT EXISTE, et ce qu'il a fallu se tromper pour l'écrire.
 * Un déploiement a échoué sur `Could not resolve "./_generated/index.js"`. La
 * première explication semblait évidente : une extension `.js` sur un fichier
 * `.ts`, que TypeScript remappe et qu'esbuild prendrait au mot.
 *
 * **C'était faux.** Mesuré en réintroduisant exactement cet import : esbuild
 * applique lui aussi le remappage TypeScript, et le regroupement passe sans
 * broncher. La cause unique était ailleurs — le dossier était GITIGNORÉ. Il
 * existait sur la machine qui l'avait généré, nulle part ailleurs, et le script
 * qui le générait avait été supprimé des mois plus tôt avec le frontend Svelte.
 *
 * D'où deux contrôles, dans cet ordre d'importance :
 *
 *   1. **Tout module Convex est-il suivi par git ?** C'est le contrôle qui
 *      aurait attrapé le bug, et aucune compilation ne peut le faire à sa
 *      place : en local le fichier est là, il compile, il se regroupe. Seul git
 *      sait qu'il ne partira pas.
 *   2. **Tout import se résout-il ?** Moins probable, mais gratuit une fois le
 *      premier écrit, et il attrape un chemin cassé avant le build distant.
 *
 * Quelques secondes en local contre un aller-retour de déploiement.
 *
 * Usage : bun scripts/verifier-bundle-convex.ts
 */

import { spawnSync } from 'node:child_process';
import { readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, sep } from 'node:path';
import { tmpdir } from 'node:os';

const RACINE = 'src/lib/convex';

/** Ce que Convex ne déploie pas : le code généré et les tests. */
const IGNORES = new Set(['_generated', '__tests__']);

function modulesConvex(dossier: string, acc: string[] = []): string[] {
	for (const entree of readdirSync(dossier, { withFileTypes: true })) {
		if (IGNORES.has(entree.name)) continue;
		const chemin = join(dossier, entree.name);
		if (entree.isDirectory()) {
			modulesConvex(chemin, acc);
		} else if (
			entree.name.endsWith('.ts') &&
			!entree.name.endsWith('.d.ts') &&
			!entree.name.includes('.test.')
		) {
			acc.push(chemin);
		}
	}
	return acc;
}

const fichiers = modulesConvex(RACINE);
if (fichiers.length === 0) {
	console.error(`Aucun module trouvé sous ${RACINE} — le chemin a-t-il changé ?`);
	process.exit(1);
}

// ── 1. Tout est-il versionné ? ────────────────────────────────────────────
// Le contrôle qui compte. Un fichier gitignoré se compile parfaitement ici et
// manque à chaque construction propre : c'est invisible partout ailleurs.
const inventaire = spawnSync('git', ['ls-files', RACINE], { encoding: 'utf8' });

// Là où git n'existe pas — un environnement de construction distant qui ne
// reçoit qu'une copie des fichiers — la question « ce fichier est-il versionné »
// n'a pas de sens, et y répondre « non » accuserait tout le dossier. On
// l'annonce et on passe au contrôle suivant : mieux vaut un contrôle en moins
// qu'un contrôle qui ment.
const gitDisponible = inventaire.status === 0 && (inventaire.stdout ?? '').trim() !== '';

const suivis = new Set(
	(inventaire.stdout ?? '')
		.split(/\r?\n/)
		.map((ligne) => ligne.trim().replaceAll('/', sep))
		.filter(Boolean)
);

if (!gitDisponible) {
	console.log('git indisponible ici : contrôle de versionnement ignoré.');
}

const absents = gitDisponible ? fichiers.filter((f) => !suivis.has(f)) : [];
if (absents.length > 0) {
	console.error(
		`\n${absents.length} module(s) Convex ne sont pas versionnés. Ils existent ici et`
	);
	console.error('manqueront à la construction :\n');
	for (const f of absents) console.error(`  ${f}`);
	console.error(
		"\nVérifier .gitignore. Un dossier « généré » dont le générateur a disparu n'est"
	);
	console.error("plus généré : c'est devenu une source, et elle doit être versionnée.\n");
	process.exit(1);
}

// ── 2. Tout se résout-il ? ────────────────────────────────────────────────
const sortie = mkdtempSync(join(tmpdir(), 'verif-convex-'));

try {
	// `platform=node` pour que la résolution des paquets se comporte comme celle
	// du regroupeur de Convex. Un `platform=neutral` fait échouer chaque import
	// de dépendance et noie les vraies erreurs sous des fausses — c'est l'erreur
	// que j'ai commise en écrivant ce contrôle la première fois.
	const resultat = spawnSync(
		'bunx',
		[
			'esbuild',
			...fichiers,
			'--bundle',
			'--platform=node',
			'--format=esm',
			`--outdir=${sortie}`,
			'--log-level=error'
		],
		{ encoding: 'utf8', shell: process.platform === 'win32' }
	);

	const journal = `${resultat.stdout ?? ''}${resultat.stderr ?? ''}`;
	const irresolubles = journal.split('\n').filter((ligne) => ligne.includes('Could not resolve'));

	if (irresolubles.length > 0) {
		console.error(`\n${irresolubles.length} import(s) que Convex ne saura pas résoudre :\n`);
		console.error(journal.trim());
		process.exit(1);
	}

	if (resultat.status !== 0) {
		console.error(journal.trim() || 'esbuild a échoué sans message.');
		process.exit(1);
	}

	console.log(`${fichiers.length} modules Convex : tous versionnés, tous regroupables.`);
} finally {
	rmSync(sortie, { recursive: true, force: true });
}
