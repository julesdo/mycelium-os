// Régénère src/routeTree.gen.ts sans lancer Vite (node scripts/outils/generer-routes.mjs).
//
// Le générateur seul ne connaît pas TanStack Start : il lui arrive de perdre le bloc
// `declare module '@tanstack/react-start'` qui type les routes serveur (sitemap, llms,
// api/auth). Ce script le remet, une fois et une seule.
import { readFileSync, writeFileSync } from 'node:fs';
import { Generator, getConfig } from '@tanstack/router-generator';

const FICHIER = './src/routeTree.gen.ts';
const BLOC = readFileSync(new URL('./fin-start.txt', import.meta.url), 'utf8').trim();

const config = getConfig(
	{
		routesDirectory: './src/routes',
		generatedRouteTree: FICHIER,
		target: 'react',
		verboseFileRoutes: false
	},
	process.cwd()
);
await new Generator({ config, root: process.cwd() }).run();

let arbre = readFileSync(FICHIER, 'utf8');
const marque = "declare module '@tanstack/react-start'";
const premier = arbre.indexOf(marque);
if (premier === -1) {
	arbre = `${arbre.trimEnd()}\n\n${BLOC}\n`;
} else if (arbre.indexOf(marque, premier + 1) !== -1) {
	throw new Error('Le bloc TanStack Start apparaît deux fois : à corriger à la main.');
}
writeFileSync(FICHIER, arbre);
console.log('routeTree.gen.ts régénéré');
