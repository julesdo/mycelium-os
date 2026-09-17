import type { KnipConfig } from 'knip';

/**
 * Ce fichier a passé des semaines à ne rien mesurer : ses `entry` visaient
 * `src/routes/**\/+page.svelte`, et le dépôt ne porte plus un seul `.svelte`
 * depuis la migration React de août 2026. Knip ne trouvait donc aucun point
 * d'entrée sous `src/routes/`, ne traçait rien, et ne nommait aucun fichier
 * orphelin — en rendant vert, ce qui est la pire façon d'échouer.
 *
 * ⚠️ C'est le SEUL outil qui voit les fichiers d'écran sans importeur :
 * `aucun-ecran-orphelin.test.ts` ne lit que des routes, et le compilateur ne
 * se plaint jamais d'un fichier que personne n'importe.
 */
export default {
	entry: [
		// TanStack Start : tout part de `router.tsx`, qui monte `routeTree.gen.ts`,
		// lui-même généré depuis `src/routes/**`. L'arbre généré n'est PAS ignoré :
		// c'est lui qui relie les routes au reste du graphe.
		'src/router.tsx',
		// Convex : chaque export est appelé par le runtime, jamais importé d'ici.
		'src/lib/convex/**/*.ts',
		'!src/lib/convex/_generated/**',
		// Outils, harnais et configuration
		'scripts/**/*.ts',
		'e2e/**/*.ts',
		'*.config.{ts,js}'
	],
	project: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts', 'e2e/**/*.ts'],
	ignore: ['src/lib/convex/_generated/**'],
	ignoreDependencies: [
		// Greffons Tailwind v4 — référencés par `@plugin` dans le CSS, pas en JS
		'@tailwindcss/forms',
		'@tailwindcss/typography',
		'tw-animate-css',
		// Utilisé à l'intérieur du composant @convex-dev/resend
		'resend',
		// Compat ESLint — nommés en chaîne de caractères dans eslint.config.js
		'@typescript-eslint/eslint-plugin',
		'@typescript-eslint/parser',
		// Polices chargées par `@import` dans `src/styles/app.css` et par le
		// générateur d'images sociales : knip ne lit pas le CSS.
		'@fontsource-variable/newsreader',
		'@fontsource-variable/plus-jakarta-sans',
		'@fontsource/caveat-brush',
		// Tailwind v4 s'invoque par `@import 'tailwindcss'` dans le CSS
		'tailwindcss',
		// Le CLI Vercel, appelé par `scripts/deploy/`
		'vercel'
	],
	ignoreExportsUsedInFile: true,
	rules: {
		// Le signal qu'on cherche est le FICHIER sans importeur. Les exports d'un
		// baril (`src/ui/index.ts`) sont une surface d'API assumée.
		exports: 'warn',
		types: 'warn'
	}
} satisfies KnipConfig;
