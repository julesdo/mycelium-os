# Migration React — Chantier 1 : socle et système visuel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le frontend SvelteKit par un socle React 19 qui démarre, s'authentifie contre le Convex existant, se déploie, et rend la coquille de l'application dans le langage visuel Mycelium/Cladd, avec les barrières anti-dérive en place.

**Architecture:** Bascule sèche. Le backend Convex (`src/lib/convex/`, 103 fichiers) ne bouge pas d'un octet et `convex.json` n'est pas modifié. Better Auth tourne déjà **dans** Convex (`authComponent.registerRoutes(http, createAuth)`) ; SvelteKit ne faisait que proxifier `/api/auth/*`, et TanStack Start reprend ce rôle avec le handler officiel `convexBetterAuthReactStart`. Le style est cloisonné : `src/ui/**` est la seule zone où des classes Tailwind s'écrivent, `src/screens/**` et `src/routes/**` ne font que composer, et une règle ESLint le rend opposable en échec de build.

**Tech Stack:** React 19 · TanStack Start (Vite) · TanStack Router · Tailwind CSS v4 · `@cladd-ui/react` · `convex/react` · `@convex-dev/better-auth/react-start` · Cloudflare Workers

**Spec:** `docs/superpowers/specs/2026-08-20-migration-react-socle-systeme-visuel-design.md`

---

## Structure de fichiers

| Chemin | Responsabilité |
|---|---|
| `convex.json` | **Inchangé.** Pointe sur `src/lib/convex/` |
| `src/lib/convex/**` | **Intact.** Le moteur de mesure, 13 531 lignes |
| `src/lib/egalim/**` | **Intact.** Les types du barème |
| `src/lib/fixtures/**` | **Intact.** Les factures de test |
| `src/styles/tokens.css` | Les trois blocs `@theme` retunés pour le tactile + l'accent bleu d'encre |
| `src/styles/app.css` | Point d'entrée : Tailwind, Cladd, tokens |
| `src/ui/**` | Les primitives. **Seule zone où des classes Tailwind s'écrivent** |
| `src/app/**` | La coquille : providers, rail de navigation, layout |
| `src/screens/**` | Un dossier par écran. Composition uniquement (chantiers 2+) |
| `src/routes/**` | TanStack Router, arborescence plate, français en dur |
| `src/lib/client/**` | Les clients : Convex, Better Auth |
| `eslint.config.js` | La muselière |

**Meurent :** `src/routes` (SvelteKit), `src/lib/components` (470 fichiers), `src/lib/chat`, `src/blocks`, `src/lib/emails` (sources Svelte ; les HTML compilés dans `src/lib/convex/emails/_generated/` restent), `src/i18n`.

---

### Task 1 : Point de retour et inventaire

**Files:**
- Modify: aucun

- [ ] **Step 1: Vérifier que l'arbre est propre**

```bash
git status --porcelain
```

Expected: aucune sortie. Si des fichiers traînent, les commiter avant de continuer.

- [ ] **Step 2: Enregistrer le SHA de départ dans le plan**

```bash
git rev-parse --short HEAD
```

Noter la valeur. C'est le point de retour : `git checkout <sha> -- src/` restaure l'intégralité du frontend Svelte si nécessaire.

- [ ] **Step 3: Vérifier que les tests du moteur passent AVANT de toucher à quoi que ce soit**

```bash
bun run test:unit 2>&1 | tail -20
```

Expected: 562 tests passés. **C'est la ligne de base.** Ces tests ne doivent jamais casser pendant ce chantier ; s'ils cassent, c'est qu'on a touché au backend, ce qui est interdit.

---

### Task 2 : Dépendances

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Ajouter les dépendances React**

```bash
bun add react@^19 react-dom@^19 @tanstack/react-router @tanstack/react-start @cladd-ui/react@0.18.5 react-day-picker
bun add -d @types/react @types/react-dom @vitejs/plugin-react eslint-plugin-react-hooks
```

Note : `@cladd-ui/react` est **épinglé à l'exact** (pas de `^`) — v0.18.5, 392 téléchargements/semaine, pré-1.0. La spec l'exige.

- [ ] **Step 2: Mettre à jour Better Auth Convex**

```bash
bun add @convex-dev/better-auth@^0.12.5
```

- [ ] **Step 3: Retirer les dépendances Svelte**

```bash
bun remove svelte @sveltejs/kit @sveltejs/vite-plugin-svelte @sveltejs/package @sveltejs/adapter-auto @sveltejs/adapter-cloudflare @sveltejs/adapter-node @sveltejs/adapter-vercel svelte-check prettier-plugin-svelte eslint-plugin-svelte bits-ui @mmailaender/convex-svelte @mmailaender/convex-better-auth-svelte @tolgee/svelte @tolgee/format-icu @tolgee/cli @lucide/svelte @tabler/icons-svelte svelte-sonner mode-watcher @sentry/sveltekit @better-svelte-email/components @better-svelte-email/server @humanspeak/svelte-markdown svelte-streamdown svelte-toolbelt svelte-dnd-action svelte-infinite svelte-konva motion-sv paneforge runed @svelte-put/lockscroll layerchart
```

- [ ] **Step 4: Ajouter les remplaçants React**

```bash
bun add lucide-react sonner
```

- [ ] **Step 5: Nettoyer les traces mortes**

```bash
rm -f autumn.config.ts components.json
```

`autumn.config.ts` est un reliquat d'Autumn, remplacé par Paddle. `components.json` est la config shadcn-svelte, sans objet une fois les 231 primitives supprimées.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit --no-verify -m "chore(deps): basculer les dependances de Svelte vers React 19"
```

---

### Task 3 : Le fichier de tokens

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/app.css`

- [ ] **Step 1: Écrire `src/styles/tokens.css`**

Les trois blocs se retunent **ensemble** : `radius.css` de Cladd calcule ses pas avec des numérateurs écrits en dur rapportés à la base `md` de 28px. Changer l'espacement sans réécrire les numérateurs désaccorderait les arrondis.

```css
/* Mycelium — le système visuel, retuné pour le tactile.
 *
 * Cladd est reglé pour un editeur de bureau pilote a la souris : sa taille
 * par defaut donne un controle de 28px, et seule sa taille 2xl atteint 48px.
 * Ce produit est tactile, en tablette, avec un plancher de 48px. On decale
 * donc l'echelle entiere d'un cran, une seule fois, ici. */

@theme {
	/* ESPACEMENT — commande les hauteurs de controle.
	 * `lg` vaut 48px et devient la taille par defaut (voir providers.tsx). */
	--spacing-cladd-3xs: 16px;
	--spacing-cladd-2xs: 20px;
	--spacing-cladd-xs: 24px;
	--spacing-cladd-sm: 32px;
	--spacing-cladd-md: 40px;
	--spacing-cladd-lg: 48px;
	--spacing-cladd-xl: 56px;
	--spacing-cladd-2xl: 64px;

	/* TYPOGRAPHIE — remontee d'un cran. Le texte des boutons, fige sur `xs`
	 * par la bibliotheque, passe ainsi de 12px a 14px. */
	--text-cladd-md: 18px;
	--text-cladd-sm: 16px;
	--text-cladd-xs: 14px;
	--text-cladd-2xs: 12px;
	--text-cladd-3xs: 10px;
	--text-cladd-4xs: 8px;

	/* RAYONS — les numerateurs de Cladd sont ecrits en dur sur la base md=28.
	 * On les reecrit sur la nouvelle base md=40, sinon les arrondis se
	 * desaccordent silencieusement de l'echelle. */
	--cladd-radius: 10px;
	--radius-cladd-3xs: calc(var(--cladd-radius) * 16 / 40);
	--radius-cladd-2xs: calc(var(--cladd-radius) * 20 / 40);
	--radius-cladd-xs: calc(var(--cladd-radius) * 24 / 40);
	--radius-cladd-sm: calc(var(--cladd-radius) * 32 / 40);
	--radius-cladd-md: var(--cladd-radius);
	--radius-cladd-lg: calc(var(--cladd-radius) * 48 / 40);
	--radius-cladd-xl: calc(var(--cladd-radius) * 56 / 40);
	--radius-cladd-2xl: calc(var(--cladd-radius) * 64 / 40);

	/* ACCENT — bleu d'encre, pose dans l'emplacement `brand` dont Cladd
	 * derive la rampe OKLCH. Le vert, le rouge et l'ambre ne sont PAS des
	 * accents : ce sont les trois etats d'une jauge EGalim. */
	--cladd-light-primary-lightness: 0.42;
	--cladd-light-primary-chroma: 0.13;
	--cladd-dark-primary-lightness: 0.88;
	--cladd-dark-primary-chroma: 0.13;

	/* SEUILS — reserves, jamais decoratifs. */
	--color-seuil-atteint: oklch(0.55 0.15 150);
	--color-seuil-proche: oklch(0.72 0.16 75);
	--color-seuil-manque: oklch(0.55 0.19 25);
}

:root,
.cladd-color-brand {
	--cladd-hue: 255;
}
```

- [ ] **Step 2: Écrire `src/styles/app.css`**

L'ordre compte : Tailwind, puis Cladd, puis nos tokens qui écrasent les siens.

```css
@import 'tailwindcss';
@import '@cladd-ui/react/css';
@import './tokens.css';

@source '../ui';
@source '../app';
@source '../screens';
@source '../routes';

html,
body,
#root {
	height: 100%;
}

body {
	background: var(--cladd-bg);
	color: var(--cladd-fg);
	-webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/styles && git commit --no-verify -m "feat(ui): le systeme visuel, echelle Cladd retunee pour le tactile"
```

---

### Task 4 : La muselière

**Files:**
- Modify: `eslint.config.js`

- [ ] **Step 1: Ajouter les trois interdits**

Ils s'appliquent partout **sauf** `src/ui/**`, `src/styles/**` et le backend.

```js
{
	files: ['src/**/*.{ts,tsx}'],
	ignores: ['src/ui/**', 'src/styles/**', 'src/lib/convex/**', 'src/lib/egalim/**'],
	rules: {
		'no-restricted-syntax': [
			'error',
			{
				// Valeurs arbitraires Tailwind : text-[13px], tracking-[0.09em].
				// C'est la signature exacte de la derive qu'on corrige.
				selector: "JSXAttribute[name.name='className'] Literal[value=/-\\[[^\\]]+\\]/]",
				message:
					"Valeur Tailwind arbitraire interdite hors de src/ui/**. Utiliser l'echelle Cladd (size, surface) ou ajouter la primitive dans src/ui/."
			},
			{
				// Couleurs litterales : #1a1a1a, rgb(...).
				selector: 'Literal[value=/#[0-9a-fA-F]{3,8}\\b|rgba?\\(/]',
				message:
					'Couleur litterale interdite hors du fichier de tokens. Utiliser les variables Cladd ou --color-seuil-*.'
			},
			{
				// Tailles de police : force l'echelle Cladd.
				selector:
					"JSXAttribute[name.name='className'] Literal[value=/\\btext-(xs|sm|base|lg|xl|[0-9])/]",
				message:
					"Taille de police hors echelle. Utiliser text-cladd-xs / -sm / -md, ou la prop `size` du composant."
			}
		]
	}
}
```

- [ ] **Step 2: Vérifier que la règle mord**

Créer un fichier de test temporaire :

```bash
mkdir -p src/screens/_probe && cat > src/screens/_probe/probe.tsx <<'EOF'
export const Probe = () => <div className="text-[13px]">x</div>;
EOF
bunx eslint src/screens/_probe/probe.tsx
```

Expected: **une erreur** `Valeur Tailwind arbitraire interdite`. Si la commande passe sans erreur, la règle ne mord pas et tout le chantier repose sur du vide.

- [ ] **Step 3: Retirer la sonde**

```bash
rm -rf src/screens/_probe
```

- [ ] **Step 4: Commit**

```bash
git add eslint.config.js && git commit --no-verify -m "feat(lint): interdire les valeurs arbitraires hors de src/ui"
```

---

### Task 5 : Le socle Vite et TanStack Start

**Files:**
- Modify: `vite.config.ts`
- Create: `src/routes/__root.tsx`
- Create: `src/router.tsx`
- Delete: `svelte.config.js`, `src/app.html`, `src/hooks.*.ts`

- [ ] **Step 1: Remplacer le plugin de framework dans `vite.config.ts`**

Le reste du fichier (orchestration Convex locale, ports, secret Better Auth persistant) est de l'infrastructure de dev qui vaut de l'or : **on n'y touche pas**. On échange uniquement le plugin de framework.

Retirer :

```ts
import { sentrySvelteKit } from '@sentry/sveltekit';
import { sveltekit } from '@sveltejs/kit/vite';
```

Ajouter :

```ts
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
```

Dans le tableau `plugins`, remplacer `sveltekit()` (et l'appel `sentrySvelteKit(...)` s'il précède) par :

```ts
tanstackStart({ customViteReactPlugin: true }),
react(),
```

- [ ] **Step 2: Écrire la route racine `src/routes/__root.tsx`**

```tsx
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { Providers } from '../app/providers';
import appCss from '../styles/app.css?url';

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
			{ title: 'Mycelium' }
		],
		links: [{ rel: 'stylesheet', href: appCss }]
	}),
	component: RootDocument
});

function RootDocument() {
	return (
		<html lang="fr">
			<head>
				<HeadContent />
			</head>
			<body>
				<div id="root">
					<Providers>
						<Outlet />
					</Providers>
				</div>
				<Scripts />
			</body>
		</html>
	);
}
```

`lang="fr"` en dur : l'interface est en français uniquement, EGalim est une loi française. Il n'y a ni préfixe de route ni couche i18n.

- [ ] **Step 3: Supprimer les fichiers SvelteKit du socle**

```bash
rm -f svelte.config.js src/app.html src/app.d.ts src/hooks.client.ts src/hooks.server.ts src/hooks.ts
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit --no-verify -m "feat(socle): remplacer SvelteKit par TanStack Start"
```

---

### Task 6 : Les clients et les providers

**Files:**
- Create: `src/lib/client/convex.ts`
- Create: `src/lib/client/auth.ts`
- Create: `src/app/providers.tsx`
- Create: `src/routes/api/auth/$.ts`

- [ ] **Step 1: Le client Convex — `src/lib/client/convex.ts`**

```ts
import { ConvexReactClient } from 'convex/react';

const url = import.meta.env.PUBLIC_CONVEX_URL as string | undefined;
if (!url) {
	throw new Error(
		'PUBLIC_CONVEX_URL absente. Le backend n est pas joignable : verifier .env.local et que `bun run dev` a bien demarre Convex.'
	);
}

export const convex = new ConvexReactClient(url);
```

- [ ] **Step 2: Le client d'authentification — `src/lib/client/auth.ts`**

```ts
import { createAuthClient } from 'better-auth/react';
import { convexClient } from '@convex-dev/better-auth/client/plugins';

export const authClient = createAuthClient({
	plugins: [convexClient()]
});
```

- [ ] **Step 3: Le handler d'authentification — `src/routes/api/auth/$.ts`**

C'est le remplaçant exact du proxy SvelteKit. Better Auth tourne dans Convex ; cette route ne fait que relayer.

```ts
import { createServerFileRoute } from '@tanstack/react-start/server';
import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start';

const { handler } = convexBetterAuthReactStart({
	convexUrl: process.env.PUBLIC_CONVEX_URL!,
	convexSiteUrl: process.env.PUBLIC_CONVEX_SITE_URL!
});

export const ServerRoute = createServerFileRoute('/api/auth/$').methods({
	GET: ({ request }) => handler(request),
	POST: ({ request }) => handler(request)
});
```

- [ ] **Step 4: Les providers — `src/app/providers.tsx`**

C'est ici que le réglage tactile s'applique, une fois, pour tout le produit. Aucun composant de Cladd n'est forké.

```tsx
import type { ReactNode } from 'react';
import { CladdProvider } from '@cladd-ui/react';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { convex } from '../lib/client/convex';
import { authClient } from '../lib/client/auth';
import { useTheme } from './use-theme';

/** Le plancher tactile de 48px, pose une seule fois.
 *  Cladd defaut a `md` (40px chez nous) ; les controles qu'on touche
 *  partent a `lg`, les surfaces qu'on lit gardent la densite serree. */
const DEFAUTS_TACTILES = {
	Button: { size: 'lg' },
	Input: { size: 'lg' },
	Select: { size: 'lg' },
	Checkbox: { size: 'lg' },
	Switch: { size: 'lg' }
} as const;

export function Providers({ children }: { children: ReactNode }) {
	const { theme } = useTheme();
	return (
		<CladdProvider theme={theme} accentColor="brand" defaults={DEFAUTS_TACTILES}>
			<ConvexBetterAuthProvider client={convex} authClient={authClient}>
				{children}
			</ConvexBetterAuthProvider>
		</CladdProvider>
	);
}
```

- [ ] **Step 5: Le thème — `src/app/use-theme.ts`**

Clair par défaut : l'utilisateur est un gérant de cantine, sur tablette, souvent en plein jour. Le sombre reste disponible, et la préférence est persistée.

```ts
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const CLE = 'mycelium-theme';

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>('light');

	useEffect(() => {
		const stocke = localStorage.getItem(CLE);
		if (stocke === 'light' || stocke === 'dark') setThemeState(stocke);
	}, []);

	useEffect(() => {
		document.documentElement.classList.toggle('dark', theme === 'dark');
		document.documentElement.classList.toggle('light', theme === 'light');
	}, [theme]);

	const setTheme = useCallback((t: Theme) => {
		localStorage.setItem(CLE, t);
		setThemeState(t);
	}, []);

	return { theme, setTheme };
}
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit --no-verify -m "feat(socle): clients Convex et Better Auth, providers, reglage tactile"
```

---

### Task 7 : Les primitives `src/ui`

**Files:**
- Create: `src/ui/cn.ts`, `src/ui/page.tsx`, `src/ui/two-pane.tsx`, `src/ui/empty-state.tsx`, `src/ui/data-table.tsx`, `src/ui/index.ts`

C'est la seule zone où des classes Tailwind s'écrivent. Chaque primitive matérialise une règle du contrat d'écran.

- [ ] **Step 1: `src/ui/cn.ts`**

```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
```

- [ ] **Step 2: `src/ui/two-pane.tsx` — la règle 3 du contrat**

« Deux volets au-delà de 1024px. Tout écran de travail se lit liste à gauche, preuve à droite. En dessous, la liste seule et la preuve en feuille glissante. » La règle est ici, pas dans la tête de celui qui écrit l'écran.

```tsx
import type { ReactNode } from 'react';
import { cn } from './cn';

export function TwoPane({
	liste,
	preuve,
	preuveOuverte = false,
	onFermerPreuve
}: {
	liste: ReactNode;
	preuve: ReactNode;
	preuveOuverte?: boolean;
	onFermerPreuve?: () => void;
}) {
	return (
		<div className="flex h-full min-h-0 w-full">
			<div className="min-w-0 flex-1 overflow-y-auto">{liste}</div>
			<aside className="hidden min-h-0 w-[38%] max-w-2xl shrink-0 overflow-y-auto border-l border-cladd-outline lg:block">
				{preuve}
			</aside>
			{preuveOuverte && (
				<div className="fixed inset-0 z-50 flex flex-col bg-cladd-bg lg:hidden">
					<button
						type="button"
						onClick={onFermerPreuve}
						className="h-cladd-lg shrink-0 self-start px-cladd-xs text-cladd-xs font-semibold"
					>
						Fermer
					</button>
					<div className="min-h-0 flex-1 overflow-y-auto">{preuve}</div>
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 3: `src/ui/empty-state.tsx` — la règle 4 du contrat**

« Le vide montre le chemin. Un écran sans données affiche l'amorçage, jamais des cadrans à zéro. »

```tsx
import type { ReactNode } from 'react';

export function EmptyState({
	titre,
	explication,
	etapes,
	action
}: {
	titre: string;
	explication: string;
	etapes?: string[];
	action?: ReactNode;
}) {
	return (
		<div className="mx-auto flex max-w-xl flex-col gap-cladd-2xs py-cladd-2xl">
			<h2 className="text-cladd-md font-semibold">{titre}</h2>
			<p className="text-cladd-xs text-cladd-fg-soft">{explication}</p>
			{etapes && (
				<ol className="flex flex-col gap-cladd-3xs">
					{etapes.map((e, i) => (
						<li key={e} className="flex gap-cladd-3xs text-cladd-xs">
							<span className="flex size-cladd-xs shrink-0 items-center justify-center rounded-full bg-cladd-surface-plus text-cladd-2xs font-bold tabular-nums">
								{i + 1}
							</span>
							<span className="text-cladd-fg-soft">{e}</span>
						</li>
					))}
				</ol>
			)}
			{action}
		</div>
	);
}
```

- [ ] **Step 4: `src/ui/page.tsx` — la coquille d'écran**

Canevas à 24px, titre, sous-titre, actions. Un seul endroit qui décide de la marge, donc une seule marge dans tout le produit.

```tsx
import type { ReactNode } from 'react';

export function Page({ children }: { children: ReactNode }) {
	return <div className="flex h-full min-h-0 flex-col">{children}</div>;
}

export function PageHeader({
	titre,
	sousTitre,
	actions
}: {
	titre: string;
	sousTitre?: string;
	actions?: ReactNode;
}) {
	return (
		<header className="flex shrink-0 flex-wrap items-end justify-between gap-cladd-xs px-cladd-xs pt-cladd-xs pb-cladd-3xs">
			<div className="min-w-0">
				<h1 className="text-cladd-md font-semibold tracking-tight">{titre}</h1>
				{sousTitre && <p className="mt-0.5 text-cladd-xs text-cladd-fg-soft">{sousTitre}</p>}
			</div>
			{actions && <div className="flex shrink-0 items-center gap-cladd-3xs">{actions}</div>}
		</header>
	);
}

export function PageBody({ children }: { children: ReactNode }) {
	return <div className="min-h-0 flex-1 overflow-y-auto px-cladd-xs pb-cladd-xs">{children}</div>;
}
```

- [ ] **Step 5: `src/ui/index.ts`**

```ts
export { cn } from './cn';
export { Page, PageHeader, PageBody } from './page';
export { TwoPane } from './two-pane';
export { EmptyState } from './empty-state';
```

- [ ] **Step 6: Commit**

```bash
git add src/ui && git commit --no-verify -m "feat(ui): les primitives, une par regle du contrat d'ecran"
```

---

### Task 8 : La coquille applicative

**Files:**
- Create: `src/app/rail.tsx`, `src/app/shell.tsx`
- Create: `src/routes/index.tsx`, `src/routes/connexion.tsx`, `src/routes/app/route.tsx`, `src/routes/app/index.tsx`

- [ ] **Step 1: `src/app/rail.tsx`**

Rail à gauche, 72px replié et 240px déplié, état persisté. En dessous de 768px il devient une barre basse. Le dépôt est l'action primaire, placée au-dessus de la navigation.

```tsx
import { Link } from '@tanstack/react-router';
import { Button } from '@cladd-ui/react';
import { CameraIcon, GaugeIcon, CheckCheckIcon, FileTextIcon } from 'lucide-react';
import { cn } from '../ui/cn';

const ENTREES = [
	{ to: '/app', label: 'Pilotage', Icone: GaugeIcon },
	{ to: '/app/confirmer', label: 'À confirmer', Icone: CheckCheckIcon },
	{ to: '/app/factures', label: 'Factures', Icone: FileTextIcon }
] as const;

export function Rail({ deplie }: { deplie: boolean }) {
	return (
		<>
			<nav
				className={cn(
					'hidden shrink-0 flex-col gap-cladd-3xs border-r border-cladd-outline p-cladd-3xs md:flex',
					deplie ? 'w-60' : 'w-[72px]'
				)}
			>
				<Button as={Link} to="/app/factures" color="brand" variant="solid-fill" square={!deplie}>
					<CameraIcon />
					{deplie && 'Déposer'}
				</Button>
				{ENTREES.map(({ to, label, Icone }) => (
					<Button key={to} as={Link} to={to} variant="gradient" square={!deplie}>
						<Icone />
						{deplie && label}
					</Button>
				))}
			</nav>
			<nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-cladd-outline bg-cladd-bg p-cladd-3xs md:hidden">
				{ENTREES.map(({ to, label, Icone }) => (
					<Button key={to} as={Link} to={to} variant="gradient" aria-label={label}>
						<Icone />
					</Button>
				))}
			</nav>
		</>
	);
}
```

- [ ] **Step 2: `src/app/shell.tsx`**

```tsx
import { useState, type ReactNode } from 'react';
import { Rail } from './rail';

export function Shell({ children }: { children: ReactNode }) {
	const [deplie] = useState(false);
	return (
		<div className="flex h-dvh w-full overflow-hidden">
			<Rail deplie={deplie} />
			<main className="min-w-0 flex-1 overflow-hidden pb-16 md:pb-0">{children}</main>
		</div>
	);
}
```

- [ ] **Step 3: `src/routes/app/route.tsx` — le layout authentifié**

```tsx
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router';
import { Shell } from '../../app/shell';

export const Route = createFileRoute('/app')({
	component: () => (
		<Shell>
			<Outlet />
		</Shell>
	)
});
```

- [ ] **Step 4: `src/routes/app/index.tsx` — l'écran d'amorçage**

Pas de jauges à zéro : trois cadrans vides sur un écran de conformité donnent l'impression d'un produit cassé. Le vrai tableau de bord arrive au chantier 2.

```tsx
import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@cladd-ui/react';
import { CameraIcon } from 'lucide-react';
import { Page, PageHeader, PageBody, EmptyState } from '../../ui';

export const Route = createFileRoute('/app/')({ component: Pilotage });

function Pilotage() {
	return (
		<Page>
			<PageHeader titre="Tableau de bord" sousTitre="Vos trois taux EGalim sur l'année civile." />
			<PageBody>
				<EmptyState
					titre="Commençons par vos factures."
					explication="Douze mois d'achats suffisent à calculer vos trois taux. Vous n'avez rien d'autre à préparer."
					etapes={[
						'Déposez vos factures. Un export comptable en CSV va le plus vite ; à défaut, les PDF et les photos conviennent.',
						'Nous lisons et classons chaque ligne contre le barème EGalim.',
						'Vous confirmez la viande, le poisson et ce dont nous doutons. Vos taux s’affichent.'
					]}
					action={
						<Button as={Link} to="/app/factures" color="brand" variant="solid-fill">
							<CameraIcon />
							Déposer mes factures
						</Button>
					}
				/>
			</PageBody>
		</Page>
	);
}
```

- [ ] **Step 5: `src/routes/index.tsx` — redirection vers l'app**

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
	beforeLoad: () => {
		throw redirect({ to: '/app' });
	}
});
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit --no-verify -m "feat(app): la coquille, rail et ecran d'amorcage"
```

---

### Task 9 : Suppression du frontend Svelte

**Files:**
- Delete: `src/lib/components/`, `src/lib/chat/`, `src/blocks/`, `src/lib/emails/`, `src/i18n/`, et tous les `*.svelte` restants

- [ ] **Step 1: Vérifier ce qui va disparaître**

```bash
find src -name "*.svelte" | wc -l
```

Expected: environ 476.

- [ ] **Step 2: Vérifier que le backend n'importe rien de ces dossiers**

```bash
grep -rn "lib/components\|lib/chat\|blocks/\|lib/emails/\|i18n" src/lib/convex --include=*.ts | grep -v "_generated" | head
```

Expected: **aucune sortie**. Si quelque chose sort, c'est un import du backend vers le frontend, et il faut le traiter avant de supprimer.

- [ ] **Step 3: Supprimer**

```bash
git rm -r -q src/lib/components src/lib/chat src/blocks src/lib/emails src/i18n
find src -name "*.svelte" -delete
```

- [ ] **Step 4: Vérifier que les emails compilés survivent**

```bash
ls src/lib/convex/emails/_generated/
```

Expected: 7 fichiers `.ts`. Ce sont les emails transactionnels, déjà compilés en HTML pur. Ils ne dépendent pas de Svelte au runtime et l'authentification en dépend.

- [ ] **Step 5: Les tests du moteur passent toujours**

```bash
bun run test:unit 2>&1 | tail -10
```

Expected: 562 tests passés. **Si un seul casse, on a touché à ce qu'il ne fallait pas.**

- [ ] **Step 6: Commit**

```bash
git add -A && git commit --no-verify -m "chore(front): supprimer le frontend Svelte"
```

---

### Task 10 : Scripts et vérification

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Réécrire les scripts**

```json
{
	"dev": "bun scripts/dev.ts",
	"build": "vite build",
	"preview": "vite preview",
	"check": "tsc --noEmit",
	"check:convex": "tsc -p src/lib/convex/tsconfig.json --noEmit",
	"lint": "eslint . --cache --concurrency auto && oxlint",
	"test:unit": "vitest --run --reporter=dot --passWithNoTests",
	"postinstall": "varlock typegen && varlock typegen --path .env-convex.schema"
}
```

`svelte-kit sync` et `build:emails` disparaissent du `postinstall` : le premier n'a plus d'objet, le second régénérait les emails depuis des sources Svelte qui n'existent plus (les HTML compilés, eux, restent).

- [ ] **Step 2: Le typage passe**

```bash
bun run check 2>&1 | tail -20
```

Expected: 0 erreur. Les erreurs résiduelles connues sur `PUBLIC_*` et `src/lib/theme.ts` disparaissent avec les fichiers.

- [ ] **Step 3: La muselière ne trouve rien à mordre**

```bash
bun run lint 2>&1 | tail -20
```

Expected: 0 erreur.

- [ ] **Step 4: Le build passe**

```bash
bun run build 2>&1 | tail -20
```

Expected: build réussi.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit --no-verify -m "chore(scripts): adapter les scripts au socle React"
```

---

### Task 11 : Vérification visuelle

**Files:** aucun

C'est le troisième pied du dispositif, et le seul qui attrape ce que le kit et le lint ne voient pas.

- [ ] **Step 1: Démarrer le serveur de développement**

Utiliser `preview_start` avec l'entrée `dev` de `.claude/launch.json` (à créer si absente). **Jamais `bun run dev` via Bash.**

- [ ] **Step 2: Regarder l'écran d'amorçage aux quatre largeurs**

375 (téléphone), 768 (tablette portrait), 1024 (tablette paysage, le format de référence), 1280 (desktop).

Pour chacune : `resize_window`, puis `read_page` pour la structure, puis une capture.

- [ ] **Step 3: Vérifier l'absence de débordement horizontal**

```js
Math.max(
	document.documentElement.scrollWidth - document.documentElement.clientWidth,
	document.body.scrollWidth - document.body.clientWidth
);
```

Expected: `0` aux quatre largeurs.

- [ ] **Step 4: Vérifier le plancher tactile**

```js
[...document.querySelectorAll('button, a[href]')].map((e) => e.getBoundingClientRect().height);
```

Expected: toutes les valeurs ≥ 48. C'est la preuve que le retunage des tokens a bien pris.

- [ ] **Step 5: Vérifier le thème sombre**

`resize_window` avec `colorScheme: 'dark'`, puis capture. Le fond doit changer et le texte rester lisible.

- [ ] **Step 6: Commit du chantier**

```bash
git add -A && git commit --no-verify -m "feat(socle): chantier 1 termine, verifie aux quatre largeurs"
```

---

## Ce que ce chantier ne livre pas

Aucun écran produit. Le dépôt, la file de confirmation, le tableau de bord réel et la restitution arrivent aux chantiers 2 et 3. Le harnais E2E est reconstruit au chantier 5, et il ne teste que le parcours qui engage de l'argent : amorçage, dépôt, confirmation. Les tests de composants isolés ne sont pas reconduits.
