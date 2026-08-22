import prettier from 'eslint-config-prettier';
import path from 'node:path';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import convexPlugin from '@convex-dev/eslint-plugin';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

/**
 * LA MUSELIÈRE
 *
 * Trois interdits, en échec de `bun run lint`, jamais en pre-commit (les hooks
 * dépassent déjà deux minutes). Ils ne s'appliquent PAS à `src/ui/**`, qui est
 * la seule zone du produit où des classes Tailwind s'écrivent à la main.
 *
 * Pourquoi ces trois-là précisément : l'interface précédente comptait 67
 * valeurs Tailwind arbitraires semées à la main dans quatre écrans
 * (`text-[13px]`, `tracking-[0.09em]`, `rounded-3xl`). C'est la signature
 * exacte de la dérive qu'on corrige, et une convention qu'on se rappelle ne
 * suffit pas : il faut que le build refuse.
 */
const MUSELIERE = [
	{
		selector: "JSXAttribute[name.name='className'] Literal[value=/-\\[[^\\]]+\\]/]",
		message:
			"Valeur Tailwind arbitraire interdite hors de src/ui/. Utiliser l'échelle Cladd (props size, surface, variant), ou ajouter la primitive manquante dans src/ui/."
	},
	{
		selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b|rgba?\\(/]',
		message:
			'Couleur littérale interdite hors du fichier de tokens. Utiliser les variables Cladd (cladd-fg, cladd-surface…) ou --color-seuil-* pour les trois états de seuil.'
	},
	{
		selector: "JSXAttribute[name.name='className'] Literal[value=/\\btext-(xs|sm|base|lg|xl|2xl|3xl)\\b/]",
		message:
			"Taille de police hors échelle. Utiliser text-cladd-xs / -sm / -md, ou la prop `size` du composant Cladd."
	}
];

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	{
		ignores: [
			'**/_generated/**',
			'src/env.d.ts',
			'src/lib/convex/convex-env.d.ts',
			'src/routeTree.gen.ts',
			'.output/**',
			'.tanstack/**'
		]
	},
	js.configs.recommended,
	...ts.configs.recommended,
	prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint déconseille no-undef sur un projet TypeScript.
			'no-undef': 'off'
		}
	},
	// React
	{
		files: ['src/**/*.{ts,tsx}'],
		ignores: ['src/lib/convex/**'],
		plugins: { 'react-hooks': reactHooks },
		languageOptions: {
			parserOptions: { ecmaFeatures: { jsx: true } }
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			'@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: true }]
		}
	},
	// La muselière.
	{
		files: ['src/**/*.{ts,tsx}'],
		ignores: ['src/ui/**', 'src/styles/**', 'src/lib/convex/**', 'src/lib/egalim/**'],
		rules: {
			'no-restricted-syntax': ['error', ...MUSELIERE]
		}
	},
	// Pas de barrel import sur lucide-react : casse le tree-shaking.
	{
		files: ['src/**/*.{ts,tsx}'],
		rules: {
			'@typescript-eslint/no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: 'lucide-react',
							importNames: ['default'],
							message: 'Importer les icônes nommément : import { CameraIcon } from "lucide-react".'
						}
					]
				}
			]
		}
	},
	// Pas de console.log en production.
	{
		files: ['src/**/*.{ts,tsx}'],
		ignores: ['src/lib/convex/**'],
		rules: {
			'no-console': ['error', { allow: ['warn', 'error'] }]
		}
	},
	// Convex : les règles type-checked ne s'appliquent pas aux patterns de handler.
	{
		files: ['**/src/lib/convex/**/*.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/require-await': 'off',
			'@typescript-eslint/prefer-promise-reject-errors': 'off',
			'@typescript-eslint/await-thenable': 'off',
			// Les handlers Convex et les types generes en font un usage legitime.
			'@typescript-eslint/no-explicit-any': 'off'
		}
	},
	// La config Vite manipule des types de plugins heterogenes.
	{
		files: ['vite.config.ts'],
		rules: { '@typescript-eslint/no-explicit-any': 'off' }
	},
	// Les modeles d'e-mail sont du HTML entier, dans des chaines.
	//
	// Ils portent des espaces insecables — 1438, comptees — parce qu'un e-mail
	// s'en sert pour empecher une coupure de ligne la ou aucune feuille de style
	// ne peut intervenir. La regle a raison partout ailleurs, ou une espace
	// invisible dans du code est une coquille ; ici elle serait une regression.
	//
	// Elle est desactivee sur ces fichiers SEULEMENT, jamais globalement : c'est
	// elle qui a rattrape une espace fine ecrite a la main dans le module PDF.
	{
		files: ['src/lib/convex/emails/modeles/**/*.ts'],
		rules: { 'no-irregular-whitespace': 'off' }
	},
	...convexPlugin.configs.recommended.map((config) => ({
		...config,
		files: ['**/src/lib/convex/**/*.ts']
	}))
);
