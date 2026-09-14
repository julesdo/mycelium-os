# Charpente, tranche 2 : la coquille PageEcran et les 27 écrans. Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** chaque écran de `src/routes/app/` délègue son dessin à `src/screens/`, dans une coquille unique `PageEcran` qui porte l'en-tête, la largeur et trois états visibles (attente, vide, erreur), et la salle d'exposition montre ces écrans-là, dans chacun de leurs états.

**Architecture:** `src/ui/page-ecran.tsx` rend `Page`, l'en-tête (onglet, page poussée, ou aucun), puis soit la colonne de lecture, soit les deux volets, soit l'état qui les remplace. Chaque écran reçoit une `Lecture<T>` (`attente`, `erreur`, ou `pret` avec sa valeur) et ne sait pas interroger Convex. Chaque route garde ses requêtes, ses mutations, ses états et ses gestionnaires, construit la `Lecture`, et déclare un `errorComponent` qui rend le même écran en erreur.

**Tech Stack:** React 19, TanStack Router 1.170.31 (routes de fichiers, `errorComponent`), Convex `useQuery`, Cladd 0.18.5, Tailwind v4, Vitest 4.1.5 (jsdom, `react-dom/server`).

Spec : `docs/superpowers/specs/2026-09-14-charpente-navigation-design.md`, § 4. Tranche 1 livrée en production (`3bc34e2`).

---

## Ce que ce plan a vérifié au code avant d'être écrit

1. **`errorComponent` voit les paramètres de sa route.** `node_modules/@tanstack/react-router/dist/esm/Match.js` rend la `CatchBoundary` À L'INTÉRIEUR de `matchContext.Provider` (lignes 44 à 50) : `Route.useParams()` et `Route.useSearch()` fonctionnent dans un `errorComponent`. Le type est `ErrorRouteComponent` (`route.d.ts`, ligne 13).
2. **Le rendu serveur marche sous Vitest.** Un essai jetable a rendu `PageHeader`, `Surface`, `List`, `ListItem` et `EmptyState` par `renderToStaticMarkup` sous jsdom : deux tests verts, fichier supprimé. Aucun test du dépôt ne rendait encore de composant ; `@testing-library` n'est pas installé.
3. **Le générateur ignore ce qui commence par `-`.** `router-generator/dist/esm/config.js` : `routeFileIgnorePrefix` vaut `"-"` par défaut, et `getRouteNodes.js` filtre fichiers ET dossiers. Il n'y a pas de `tsr.config.json`. Un dossier `src/routes/-salle/` n'est donc pas une route, et reste balayé par `lignes-rouges` et `verre`.
4. **Cladd n'a pas de squelette.** `search("skeleton")` rend une liste vide. Les rangées de substitution se construisent dans `src/ui/`, sur `List` et `ListItem`.
5. **`tsconfig.json`** : `strict` et `noUncheckedIndexedAccess`, sans `exactOptionalPropertyTypes`. Passer `undefined` à une prop facultative compile.
6. **La barrière n° 1 attrape aussi `<PageEcran`.** Le motif de la spec est `<Page` en préfixe. Une route ne rend donc jamais `PageEcran` elle-même, même pour son erreur : elle rend l'écran, qui rend la coquille.
7. **Les destinations écrites en objet sont toutes valides aujourd'hui** (`to: '…'`, `vers: '…'` dans `barre.tsx`, `ce-qui-manque.tsx`, `veilleur.tsx`, `accueil.tsx`, les `navigate`). Étendre `destinations-existent` à cette forme ne fait tomber aucune ligne existante.
8. **Le nom `Donnees` est pris.** `src/screens/donnees/donnees.tsx` exporte un composant `Donnees` ; un type importé du même nom y serait refusé (TS2440). Le type générique s'appelle donc `Lecture<T>`.

---

## Les décisions de forme, fixées ici

**D1. Le contrat d'un écran.**

```ts
export type Lecture<T> =
	| { readonly etat: 'attente' }
	| { readonly etat: 'erreur' }
	| { readonly etat: 'pret'; readonly valeur: T };
```

Un écran reçoit `donnees: Lecture<…>`. **Tout ce dont il n'a besoin qu'une fois prêt voyage dans `valeur`**, gestionnaires compris. Hors de `valeur`, une seule prop est admise : `identifiant`, quand l'en-tête en a besoin dans tous les états pour construire son retour. Un `errorComponent` s'écrit donc toujours en une ligne, sans fonction vide.

**D2. Ce qui reste dans la route, ce qui descend dans l'écran.** La route garde, sans les réécrire, ses `useQuery`, `useMutation`, `useAction`, `useState`, ses valeurs dérivées et ses gestionnaires (`async function …`). Descendent dans l'écran : le JSX, les sous-composants de présentation (`Reglage`, `EtatCourant`, `FeuilleDeclaration`, `VoletDossier`), les tables d'affichage (`AILLEURS`, `CHEMINS`, `NOMBRE`), et les commentaires qui parlent du dessin. Les commentaires qui parlent d'une requête ou d'un gestionnaire restent à côté de lui.

**D3. L'attente.** Une route passe `{ etat: 'attente' }` tant que manque ce qu'elle attendait déjà pour afficher son contenu. Trois écrans attendent en plus une requête qu'ils affichaient à tort pendant qu'elle chargeait. Chaque cas est nommé dans sa tâche : la créance (`suivi` et `dernier`), le décompte (« Aucun décompte arrêté » pendant le chargement), la procédure (« Aucune procédure engagée » pendant le chargement).

**D4. L'erreur.** Chaque route déclare `errorComponent: <Nom>EnErreur`, qui rend l'écran avec `{ etat: 'erreur' }`. La coquille garde l'en-tête et son retour, dit « Cet écran n’a pas pu s’afficher. », propose une issue (l'accueil par défaut), puis le rechargement en second.

**D5. La largeur.** La coquille pose la colonne `mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs`. Un écran dont le rythme était autre (`gap-cladd-2xs`, `gap-cladd-3xs`) enveloppe son contenu dans UN `div className="flex flex-col gap-…"`. Trois largeurs d'exception rejoignent la colonne : `abonnement` (`max-w-200`, non centrée), `parametres` (`max-w-160`). `Equipe` et `Donnees` gardent leur `max-w-180` interne, sans effet dans une colonne de 672 px.

**D6. Le vide.** Il passe par `etat={{ vide: {…} }}`, rendu par `EmptyState`. Les réponses `null` des requêtes d'établissement (« Aucun établissement actif », jusqu'ici un paragraphe sans issue, ou un « Chargement… » éternel) deviennent un vide qui mène à `/bienvenue`.

**D7. L'en-tête garde son genre.** Un écran à `PageHeader` reste `onglet`, un écran à `EnteteDetail` reste `poussee`, l'accueil reste sans en-tête. Les retours changent en tranche 4, pas ici.

**D8. La salle d'exposition.** Un registre, `src/routes/-salle/ecrans.tsx`, liste les écrans du produit : leur route telle que `createFileRoute` la déclare, un libellé, s'ils ont un vide, et une fonction de rendu. La salle offre pour chacun Prêt, Vide (s'il en a un), Attente et Erreur. Les données de démonstration qu'il emploie vivent dans `src/routes/-salle/donnees.tsx`. Chaque démo qui imite l'en-tête d'un des 27 écrans est retirée par la tâche qui migre cet écran ; les démos de composants restent.

**D9. Le texte ne change pas**, à une exception près : le sous-titre de l'équipe dit encore « aux factures et aux taux » (reste d'EGalim) et devient « aux factures et aux créances », comme la salle d'exposition le disait déjà.

---

## Carte des fichiers

| Route (`src/routes/app/`) | Écran | Composant | Tâche |
| --- | --- | --- | --- |
| `index.tsx` | `src/screens/accueil.tsx` (modifié) | `EcranAccueil` | 2 |
| `procedures.tsx` | `src/screens/procedures.tsx` (modifié) | `EcranProcedures` | 2 |
| `creance.$id.tsx` | `src/screens/creance.tsx` (modifié) | `EcranCreance` | 2 |
| `creance_.$id.decompte.tsx` | `src/screens/analyses/decompte.tsx` | `EcranDecompte` | 3 |
| `creance_.$id.litige.tsx` | `src/screens/analyses/litige.tsx` | `EcranLitige` | 3 |
| `creance_.$id.relances.tsx` | `src/screens/analyses/relances.tsx` | `EcranRelances` | 3 |
| `creance_.$id.risques.tsx` | `src/screens/analyses/risques.tsx` | `EcranRisques` | 3 |
| `creance_.$id.solidite.tsx` | `src/screens/analyses/solidite.tsx` | `EcranSolidite` | 3 |
| `creance_.$id.procedure.tsx` | `src/screens/analyses/procedure.tsx` | `EcranProcedure` | 4 |
| `debiteurs.tsx` | `src/screens/debiteurs.tsx` | `EcranDebiteurs` | 5 |
| `debiteurs_.$id.habitude.tsx` | `src/screens/debiteur/habitude.tsx` | `EcranHabitude` | 5 |
| `debiteurs_.$id.pieces.tsx` | `src/screens/debiteur/pieces.tsx` | `EcranPieces` | 5 |
| `parametres.tsx` | `src/screens/parametres/reglages.tsx` | `EcranReglages` | 6 |
| `parametres_.creancier.tsx` | `src/screens/parametres/creancier.tsx` (ajout) | `EcranCreancier` | 6 |
| `parametres_.etablissement.tsx` | `src/screens/parametres/etablissement.tsx` (ajout) | `EcranEtablissement` | 6 |
| `abonnement.tsx` | `src/screens/abonnement/abonnement.tsx` | `EcranAbonnement` | 6 |
| `abonnement_.premier-bilan.tsx` | `src/screens/abonnement/premier-bilan.tsx` | `EcranPremierBilan` | 6 |
| `abonnement_.suivi.tsx` | `src/screens/abonnement/suivi.tsx` | `EcranSuiviOffre` | 6 |
| `equipe.tsx` | `src/screens/equipe/equipe.tsx` (ajout) | `EcranEquipe` | 7 |
| `equipe_.inviter.tsx` | `src/screens/equipe/inviter.tsx` | `EcranInviter` | 7 |
| `donnees.tsx` | `src/screens/donnees/donnees.tsx` (ajout) | `EcranDonnees` | 7 |
| `donnees_.export.tsx` | `src/screens/donnees/export.tsx` | `EcranExport` | 7 |
| `donnees_.supprimer-compte.tsx` | `src/screens/donnees/supprimer-compte.tsx` | `EcranSupprimerCompte` | 7 |
| `donnees_.supprimer-etablissement.tsx` | `src/screens/donnees/supprimer-etablissement.tsx` | `EcranSupprimerEtablissement` | 7 |
| `import-factures.tsx` | `src/screens/import/depots.tsx` | `EcranImport` | 8 |
| `import-factures_.$id.tsx` | `src/screens/import/depot.tsx` | `EcranDepot` | 8 |
| `revelation.tsx` | `src/screens/revelation.tsx` | `EcranRevelation` | 8 |

Autres fichiers :

- Créés : `src/ui/page-ecran.tsx`, `src/ui/__tests__/page-ecran.test.tsx` (tâche 1) ; `src/routes/-salle/demo.ts`, `communes.ts`, `onglets.tsx`, `creance.tsx`, `ecrans.tsx` (tâche 2 et ses correctifs), `debiteurs.tsx` (tâche 5), `reglages.tsx` (tâche 6), `import.tsx` (tâche 8) ; `src/screens/sans-etablissement.tsx` (tâche 6) ; `src/ui/__tests__/routes-lisent.test.ts`, `src/ui/__tests__/attente-visible.test.ts`, `src/ui/__tests__/salle-complete.test.ts`, `src/ui/__tests__/salle-etats.test.tsx` (tâche 9).
- Modifiés : `src/ui/index.ts` et `src/ui/__tests__/destinations-existent.test.ts` (tâche 1) ; `src/routes/showroom.tsx` (tâches 2 à 8).

Les numéros de ligne cités renvoient aux fichiers tels qu'ils sont au commit `3bc34e2`. Chaque route n'est touchée que par sa tâche : ses numéros restent valables jusque-là. Dans `showroom.tsx`, qui change à chaque tâche, les démos se désignent par leur NOM.

---

## Règles communes à toutes les tâches

1. **Commits par chemin, jamais `git add -A`.** Un fichier neuf s'ajoute par son chemin, puis `git commit --no-verify -m "…" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -- <chemins…>`. Pas de `git stash`, `git reset`, `git checkout --`.
2. **Formater avant de committer** : `bunx prettier --write <fichiers touchés>`.
3. **Vérifier par la suite entière**, jamais par un dossier : `bun run test:unit`, puis `bun run check`, puis `bun run lint`. Les trois verts avant le commit.
4. **Aucun hook après un `return` anticipé.** Un écran qui a des `useState` les déclare avant de tester `donnees.etat`.
5. **Pas de `setState` dans un effet.** On dérive au rendu, ou on remet à zéro dans le gestionnaire.
6. **Cladd** : les classes de mise en page d'une `Surface` vont sur `contentClassName`. Toute `Surface` porte `variant="transparent"` (barrière `verre.test.ts`).
7. **Texte** : français, pas de « — » dans un texte neuf, jamais « garantie ». Un commentaire qui cite une formule interdite (« engagez une injonction de payer ») reste un commentaire : `lignes-rouges` ne lit pas les commentaires, et lit tout le reste.
8. **Un fichier qui contient des barres obliques inverses s'écrit avec l'outil d'écriture de fichiers**, pas par un heredoc Bash, qui les avale.
9. **Contrôle de migration**, à la fin de chaque tâche 2 à 8, sur les routes de la tâche :

```bash
grep -nE "<Page|<EnteteDetail|sr-only\">Chargement" src/routes/app/<routes de la tâche>
```

Attendu : aucune sortie.

10. **Le regard.** Si le panneau de navigation intégré est disponible, ouvrir `/showroom` et regarder chaque écran migré, dans chacun de ses états, à 375 et 1280 px. Sinon, le dire dans le rapport : la tâche 10 regarde tout aux quatre largeurs.

## Tâche 0 : préparation

**Files:** aucun fichier de code.

- [ ] **Step 1 : ouvrir la branche**

```bash
git switch -c chantier/charpente-tranche-2
```

- [ ] **Step 2 : constater la base verte**

```bash
bun run test:unit
bun run check
bun run lint
```

Attendu : tout vert. Noter le nombre de tests : c'est la référence de la tâche 10.

- [ ] **Step 3 : committer le plan**

```bash
git add docs/superpowers/plans/2026-09-14-charpente-tranche-2.md
git commit --no-verify -m "docs(plan): tranche 2 de la charpente, la coquille et les 27 ecrans" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -- docs/superpowers/plans/2026-09-14-charpente-tranche-2.md
```

---

## Tâche 1 : la coquille `PageEcran`

**Files:**
- Create: `src/ui/page-ecran.tsx`
- Create: `src/ui/__tests__/page-ecran.test.tsx`
- Modify: `src/ui/index.ts` (ligne 16, à côté de `page`)
- Modify: `src/ui/__tests__/destinations-existent.test.ts` (lignes 77 à 106)

- [ ] **Step 1 : écrire le test qui échoue**

`src/ui/__tests__/page-ecran.test.tsx` :

```tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PageEcran } from '../page-ecran';

/**
 * LA COQUILLE D'ÉCRAN, DANS SES QUATRE ÉTATS.
 *
 * Ces tests RENDENT le composant, ils ne lisent pas sa source : un état se juge
 * à ce qu'il affiche. Aucun ne rend de `Link`, qui exige un routeur ; l'issue
 * par défaut, elle, se vérifie dans la source (dernier test).
 */

const ONGLET = { genre: 'onglet', titre: 'Vos débiteurs' } as const;
const COLONNE = 'mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs';

describe('la coquille d’écran', () => {
	it('garde l’en-tête pendant l’attente, et l’annonce par aria-busy', () => {
		const html = renderToStaticMarkup(
			<PageEcran entete={ONGLET} etat="attente">
				<p>contenu prêt</p>
			</PageEcran>
		);
		expect(html).toContain('Vos débiteurs');
		expect(html).toContain('aria-busy="true"');
		expect(html).not.toContain('contenu prêt');
		expect(html).not.toContain('sr-only');
	});

	it('rend le contenu dans la colonne de lecture une fois prêt', () => {
		const html = renderToStaticMarkup(
			<PageEcran entete={ONGLET}>
				<p>contenu prêt</p>
			</PageEcran>
		);
		expect(html).toContain('contenu prêt');
		expect(html).toContain(COLONNE);
		expect(html).not.toContain('aria-busy');
	});

	it('montre le chemin quand il n’y a rien', () => {
		const html = renderToStaticMarkup(
			<PageEcran
				entete={ONGLET}
				etat={{
					vide: {
						titre: 'Aucun débiteur pour l’instant',
						explication: 'Ils apparaissent à l’import.'
					}
				}}
			>
				<p>contenu prêt</p>
			</PageEcran>
		);
		expect(html).toContain('Aucun débiteur pour l’instant');
		expect(html).not.toContain('contenu prêt');
	});

	it('garde l’en-tête en erreur, dit ce qui s’est passé, et place l’issue avant le rechargement', () => {
		const html = renderToStaticMarkup(
			<PageEcran
				entete={ONGLET}
				etat="erreur"
				issue={<a href="/app/debiteurs">Voir mes débiteurs</a>}
			/>
		);
		expect(html).toContain('Vos débiteurs');
		expect(html).toContain('Cet écran n’a pas pu s’afficher.');
		expect(html).toContain('role="alert"');
		expect(html.indexOf('Voir mes débiteurs')).toBeGreaterThan(-1);
		expect(html.indexOf('Voir mes débiteurs')).toBeLessThan(html.indexOf('Recharger la page'));
	});

	it('dégage la barre flottante quand l’écran n’a pas d’en-tête', () => {
		const html = renderToStaticMarkup(<PageEcran entete={{ genre: 'aucun' }} etat="attente" />);
		expect(html).toContain('pt-barre-app');
	});

	it('pose les deux volets à la place de la colonne quand l’écran en a', () => {
		const html = renderToStaticMarkup(
			<PageEcran
				entete={ONGLET}
				volets={{
					liste: <p>la liste</p>,
					preuve: <p>la preuve</p>,
					preuveOuverte: false,
					onFermerPreuve: () => undefined
				}}
			/>
		);
		expect(html).toContain('la liste');
		expect(html).toContain('la preuve');
		expect(html).not.toContain(COLONNE);
	});

	it('retombe sur l’accueil quand l’écran ne nomme pas d’issue', () => {
		const source = readFileSync(join(process.cwd(), 'src', 'ui', 'page-ecran.tsx'), 'utf8');
		expect(source).toContain('<BoutonPrincipal as={Link} to="/app">');
	});
});
```

- [ ] **Step 2 : le lancer, et le voir échouer**

Run: `bunx vitest --run src/ui/__tests__/page-ecran.test.tsx`
Expected: FAIL, `Failed to resolve import "../page-ecran"`.

- [ ] **Step 3 : écrire la coquille**

`src/ui/page-ecran.tsx` :

```tsx
import type { ReactNode } from 'react';
import { Link, type LinkProps } from '@tanstack/react-router';
import { List, ListItem, Surface } from '@cladd-ui/react';
import { BoutonPrincipal, BoutonSecondaire } from './bouton';
import { cn } from './cn';
import { EmptyState } from './empty-state';
import { EnteteDetail } from './navigation';
import { Page, PageBody, PageHeader } from './page';
import { TwoPane } from './two-pane';

/**
 * LA COQUILLE D'UN ÉCRAN : SON EN-TÊTE, SA LARGEUR, ET CE QUI S'AFFICHE QUAND
 * LE CONTENU N'EST PAS LÀ.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI ELLE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Vingt-huit écrans rejouaient `Page`, leur en-tête et leur `PageBody` à la
 * main. Onze d'entre eux annonçaient leur chargement par un paragraphe
 * `sr-only`, lisible par un lecteur d'écran et invisible pour tous les autres :
 * le gérant voyait un corps vide, et croyait l'écran cassé. Aucun ne savait
 * s'afficher en erreur, et vingt-et-un posaient la même colonne recopiée.
 *
 * Une règle tenue à vingt-huit endroits se perd au vingt-neuvième. Elle se
 * tient ici, à un seul.
 */

/**
 * CE QU'UN ÉCRAN REÇOIT : SA LECTURE.
 *
 * ⚠️ TROIS ÉTATS, ET AUCUN N'EST FACULTATIF. Un écran qui recevait « la donnée,
 * ou `undefined` » oubliait l'erreur à chaque fois ; celui qui reçoit ce type ne
 * compile pas sans décider quoi montrer dans les trois cas.
 *
 * Tout ce dont l'écran n'a besoin qu'une fois prêt voyage dans `valeur`,
 * gestionnaires compris : un écran en erreur n'a rien à déclencher.
 */
export type Lecture<T> =
	| { readonly etat: 'attente' }
	| { readonly etat: 'erreur' }
	| { readonly etat: 'pret'; readonly valeur: T };

/** Le retour d'une page poussée : où il mène, et le nom qu'il porte. */
export interface RetourEcran {
	readonly vers: LinkProps['to'];
	readonly parametres?: LinkProps['params'];
	/** La sélection à rendre au retour, comme `?d=` sur les débiteurs. */
	readonly recherche?: LinkProps['search'];
	readonly libelle: string;
}

/**
 * LES TROIS GENRES D'EN-TÊTE.
 *
 * `onglet` : un écran qu'on atteint par la barre, titre et actions. `poussee` :
 * une page de détail, avec son retour. `aucun` : l'accueil, dont le hero porte
 * lui-même le dégagement de la barre flottante.
 */
export type EnteteEcran =
	| {
			readonly genre: 'onglet';
			readonly titre: string;
			readonly sousTitre?: string;
			readonly actions?: ReactNode;
	  }
	| {
			readonly genre: 'poussee';
			readonly retour: RetourEcran;
			readonly titre: string;
			readonly sousTitre?: string;
	  }
	| { readonly genre: 'aucun' };

/** Ce que dit un écran vide. Règle d'écran n° 4 : il montre le chemin. */
export interface VideEcran {
	readonly illustration?: string;
	readonly titre: string;
	readonly explication: string;
	readonly etapes?: readonly string[];
	readonly action?: ReactNode;
}

export type EtatEcran = 'pret' | 'attente' | 'erreur' | { readonly vide: VideEcran };

/** La liste à gauche, la preuve à droite. Voir `TwoPane`. */
export interface VoletsEcran {
	readonly liste: ReactNode;
	readonly preuve: ReactNode;
	readonly preuveOuverte: boolean;
	readonly onFermerPreuve: () => void;
}

/** Assez pour lire « une liste arrive », pas assez pour annoncer combien. */
const RANGEES_D_ATTENTE = 4;

export function PageEcran({
	entete,
	etat = 'pret',
	issue,
	volets,
	children
}: {
	entete: EnteteEcran;
	etat?: EtatEcran;
	/** L'issue de l'état d'erreur. Par défaut, l'accueil. */
	issue?: ReactNode;
	/** Les deux volets, à la place de la colonne. Ignoré tant que l'écran n'est pas prêt. */
	volets?: VoletsEcran;
	children?: ReactNode;
}) {
	const sansEntete = entete.genre === 'aucun';

	return (
		<Page>
			<Entete entete={entete} />
			{etat === 'pret' && volets !== undefined ? (
				// `min-h-0 flex-1` : `TwoPane` se dimensionne en `h-full`, il lui faut
				// une hauteur à remplir sous l'en-tête, sans quoi les deux volets
				// débordent par le bas.
				<div className="min-h-0 flex-1">
					<TwoPane
						liste={volets.liste}
						preuve={volets.preuve}
						preuveOuverte={volets.preuveOuverte}
						onFermerPreuve={volets.onFermerPreuve}
					/>
				</div>
			) : (
				<PageBody>
					{etat === 'pret' ? (
						<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs">{children}</div>
					) : etat === 'attente' ? (
						<Attente sansEntete={sansEntete} />
					) : etat === 'erreur' ? (
						<Erreur sansEntete={sansEntete} issue={issue} />
					) : (
						<EmptyState {...etat.vide} />
					)}
				</PageBody>
			)}
		</Page>
	);
}

function Entete({ entete }: { entete: EnteteEcran }) {
	if (entete.genre === 'aucun') return null;
	if (entete.genre === 'onglet') {
		return <PageHeader titre={entete.titre} sousTitre={entete.sousTitre} actions={entete.actions} />;
	}
	return (
		<EnteteDetail
			retourVers={entete.retour.vers}
			retourParametres={entete.retour.parametres}
			retourRecherche={entete.retour.recherche}
			retourLibelle={entete.retour.libelle}
			titre={entete.titre}
			sousTitre={entete.sousTitre}
		/>
	);
}

/**
 * L'ATTENTE : LE SQUELETTE DE LA VRAIE PAGE.
 *
 * ⚠️ `aria-busy` SUR LA ZONE QUI CHARGE, JAMAIS UN PARAGRAPHE `sr-only` SEUL.
 * Les rangées de substitution sont masquées aux lecteurs d'écran : elles ne
 * disent rien, et l'en-tête reste lisible au-dessus.
 *
 * ⚠️ `List` ET `ListItem`, PAS DES `div` STYLÉS. Les rangées d'attente prennent
 * ainsi le rythme vertical exact des vraies rangées : la page ne saute pas
 * quand le contenu arrive.
 */
function Attente({ sansEntete }: { sansEntete: boolean }) {
	return (
		<div
			aria-busy="true"
			className={cn('mx-auto flex w-full max-w-2xl flex-col', sansEntete && 'pt-barre-app')}
		>
			<div aria-hidden="true">
				<Surface
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="p-0"
				>
					<List>
						{Array.from({ length: RANGEES_D_ATTENTE }, (_, rang) => (
							<ListItem key={rang}>
								<span className="size-5 shrink-0 rounded-full bg-cladd-fg/10 motion-safe:animate-pulse" />
								<span className="h-3 w-2/5 rounded-full bg-cladd-fg/10 motion-safe:animate-pulse" />
								<span className="ml-auto h-3 w-1/6 rounded-full bg-cladd-fg/10 motion-safe:animate-pulse" />
							</ListItem>
						))}
					</List>
				</Surface>
			</div>
		</div>
	);
}

/**
 * L'ERREUR : L'EN-TÊTE RESTE, L'ISSUE PASSE AVANT LE RECHARGEMENT.
 *
 * ⚠️ RECHARGER N'EST JAMAIS LA SEULE SORTIE. Sur un lien de créance périmé,
 * recharger refait l'erreur à l'identique. L'issue principale mène ailleurs ;
 * le rechargement reste possible, en second, pour la panne passagère.
 */
function Erreur({ sansEntete, issue }: { sansEntete: boolean; issue: ReactNode }) {
	return (
		<div
			role="alert"
			className={cn(
				'mx-auto flex w-full max-w-2xl flex-col items-start gap-cladd-3xs',
				sansEntete && 'pt-barre-app'
			)}
		>
			<h2 className="text-cladd-md font-semibold">Cet écran n’a pas pu s’afficher.</h2>
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Vos créances et vos décomptes sont intacts : c’est l’affichage qui a échoué, pas la mesure.
			</p>
			{issue ?? (
				<BoutonPrincipal as={Link} to="/app">
					Revenir à l’accueil
				</BoutonPrincipal>
			)}
			<BoutonSecondaire onClick={() => window.location.reload()}>Recharger la page</BoutonSecondaire>
		</div>
	);
}
```

- [ ] **Step 4 : l'exporter**

Dans `src/ui/index.ts`, sous la ligne 16 (`export { Page, PageHeader, PageBody, PageHero } from './page';`), ajouter :

```ts
export {
	PageEcran,
	type Lecture,
	type EnteteEcran,
	type EtatEcran,
	type RetourEcran,
	type VideEcran,
	type VoletsEcran
} from './page-ecran';
```

- [ ] **Step 5 : relancer le test, le voir passer**

Run: `bunx prettier --write src/ui/page-ecran.tsx src/ui/__tests__/page-ecran.test.tsx src/ui/index.ts && bunx vitest --run src/ui/__tests__/page-ecran.test.tsx`
Expected: PASS, 7 tests. Si Prettier a replié `<BoutonPrincipal as={Link} to="/app">` différemment, garder la balise ouvrante sur une ligne : le dernier test la cherche telle quelle.

- [ ] **Step 6 : faire lire la forme objet à `destinations-existent`**

Les retours vont s'écrire `retour: { vers: '/app/creance/$id', … }` au lieu de `retourVers="/app/creance/$id"`. Sans ce pas, vingt retours sortiraient du balayage sans qu'aucun test ne tombe.

Dans `src/ui/__tests__/destinations-existent.test.ts`, remplacer les lignes 77 à 106 (le `describe` entier) par :

```ts
/**
 * Toutes les destinations littérales, avec leur place.
 *
 * ⚠️ LA FORME OBJET COMPTE AUTANT QUE L'ATTRIBUT. Depuis la coquille `PageEcran`,
 * un retour s'écrit `retour: { vers: '/app/creance/$id', … }` et non plus
 * `retourVers="/app/creance/$id"`. Ne lire que les attributs aurait retiré les
 * retours du balayage, en silence.
 */
function destinationsEcrites(): { fichier: string; ligne: number; destination: string }[] {
	const trouvees: { fichier: string; ligne: number; destination: string }[] = [];
	for (const fichier of fichiersDuProduit(RACINE)) {
		const lignes = readFileSync(fichier, 'utf8').split('\n');
		lignes.forEach((texte, index) => {
			for (const [, , destination] of texte.matchAll(
				/\b(to|vers|retourVers)(?:=|:\s*)["'](\/[^"']*)["']/g
			)) {
				if (destination === undefined) continue;
				trouvees.push({
					fichier: fichier.slice(RACINE.length + 1).split(sep).join('/'),
					ligne: index + 1,
					destination
				});
			}
		});
	}
	return trouvees;
}

describe('les destinations écrites dans le produit', () => {
	it('mènent toutes à une route déclarée', () => {
		const declarees = routesDeclarees();
		expect(declarees.size).toBeGreaterThan(10);

		const morts = destinationsEcrites()
			// Les routes d'API ne sont pas servies par le routeur de pages.
			.filter((d) => !d.destination.startsWith('/api/'))
			.filter((d) => !declarees.has(normaliser(d.destination)))
			.map((d) => `${d.fichier}:${d.ligne} → ${d.destination}`);

		expect(morts, `Destinations qui ne mènent à aucune route :\n${morts.join('\n')}`).toEqual([]);
	});

	it('lit aussi les destinations écrites en objet', () => {
		// `ui/ce-qui-manque.tsx` écrit `vers: '/app/parametres/creancier'`. Si la
		// forme objet cessait d'être lue, ce test tomberait avant que les retours
		// ne disparaissent du balayage.
		const lues = destinationsEcrites().map((d) => `${d.fichier} ${d.destination}`);
		expect(lues).toContain('ui/ce-qui-manque.tsx /app/parametres/creancier');
	});
});
```

- [ ] **Step 7 : la suite entière**

Run: `bunx prettier --write src/ui/__tests__/destinations-existent.test.ts && bun run test:unit && bun run check && bun run lint`
Expected: tout vert, avec les 7 tests de la coquille et le nouveau test des destinations en plus.

- [ ] **Step 8 : committer**

```bash
git add src/ui/page-ecran.tsx src/ui/__tests__/page-ecran.test.tsx
git commit --no-verify -m "feat(coquille): PageEcran porte l'en-tete, la largeur et trois etats visibles" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -- src/ui/page-ecran.tsx src/ui/__tests__/page-ecran.test.tsx src/ui/index.ts src/ui/__tests__/destinations-existent.test.ts
```

### Correctifs de la revue de qualité (appliqués après la tâche 1, AVANT la tâche 2)

La revue a accepté la coquille, et relevé deux décisions d'API que les tâches 2 à 8 auraient recopiées. Les tâches suivantes de ce plan tiennent compte de ce qui suit ; le code ci-dessus est la première version, le code livré est celui du commit de correctifs.

1. **L'attente se dit.** `aria-busy` seul ne s'annonce pas sur une zone qui disparaît. La coquille ajoute, dans la zone qui charge, `<p role="status" className="sr-only">Chargement de l’écran…</p>` : ce n'est pas un `sr-only` SEUL, le squelette se voit dessous. La barrière de la tâche 9 ne balaie que `src/routes` et `src/screens`.
2. **Un écran à deux volets attend en deux volets.** Nouvelle prop `disposition?: 'colonne' | 'volets'`. Avec `'volets'` (ou `volets` fourni), l'attente se rend dans `TwoPane` : le squelette dans la liste, la preuve vide. Le vide et l'erreur restent en colonne : ils remplacent l'écran de travail. **Les écrans des procédures (tâche 2) et des débiteurs (tâche 5) passent `disposition="volets"` dans leur état non prêt.**
3. **`children` et `volets` s'excluent**, par le type.
4. **L'erreur ne promet que ce qu'elle sait** : « Rien de ce qui est enregistré n’est touché par cet échec. » `role="alert"` n'enveloppe plus que le titre et la phrase ; sans en-tête, le titre est un `h1`.
5. **Le squelette réutilise `ListeAnalyses`**, et respire au rythme `animate-pouls`, jeton existant de `tokens.css`.
6. **Types resserrés** : `RetourEcran.vers` en `NonNullable<LinkProps['to']>`, `VideEcran` égal aux props d'`EmptyState`, `EtatEcran` bâti sur `Lecture<unknown>['etat']`.
7. **Tests** : `Link` est remplacé par un lien nu dans le test de la coquille, ce qui rend réellement l'en-tête poussé et l'issue par défaut. `destinations-existent` teste sa lecture sur des lignes écrites dans le test (`destinationsDansLigne`), et ne dépend plus d'un écran du produit.
8. **Seconde relecture** : le statut sort de la zone `aria-busy` (portée par le squelette masqué), le squelette prend la largeur de la liste en deux volets, `disposition="volets"` est toléré à côté de `volets`, et les tests vérifient que le vide et l'erreur restent en colonne et que le retour transmet ses paramètres (`?d=`). Douze tests pour la coquille.
9. **Tâche 10** : la mesure au DOM exclut le statut de la coquille des « attentes cachées ».

### Correctifs de la revue de la tâche 2 (appliqués AVANT la tâche 3), et ce qu'ils changent pour les tâches 3 à 8

1. **La salle vit par famille.** `src/routes/-salle/donnees.tsx` n'existe plus. Les fichiers :
   - `demo.ts` : `EtatDemo`, `EcranDuProduit` et `lectureDemo`. `route` est typée par le routeur (une faute ne compile pas) ; `lectureDemo` LÈVE si on demande le vide d'un écran sans valeur vide.
   - `communes.ts` : les données partagées avec les démos de composants de `showroom.tsx` (`EVENEMENTS_DEMO`, `RAIL_DEMO`). Une donnée qu'une seule famille montre vit dans sa famille.
   - `onglets.tsx` : accueil, procédures (avec `DOSSIERS_DEMO`, qu'eux seuls montrent) ; la tâche 8 y ajoute la révélation.
   - `creance.tsx` : la créance ; les tâches 3 et 4 y ajoutent les analyses.
   - `debiteurs.tsx` (à créer par la tâche 5), `reglages.tsx` (à créer par la tâche 6, complété par la tâche 7), `import.tsx` (à créer par la tâche 8, pour l'import et le dépôt).
   - `ecrans.tsx` ne fait que réunir les tableaux de familles (`ECRANS_ONGLETS`, `ECRANS_CREANCE`…) dans `ECRANS_DU_PRODUIT`.
   **Partout où une tâche 3 à 8 dit « `src/routes/-salle/donnees.tsx` » ou « ajouter à `ecrans.tsx` », lire : le fichier de SA famille**, et, pour une famille neuve, l'ajout de son tableau dans `ecrans.tsx`.
2. **Une entrée est un composant** : `Demo: ({ etat }) => <EcranX … />`, ou un composant à état nommé (`Demo: ProceduresDemo`). Plus de `rendre`, plus de `<Shell>` dans les entrées : la salle pose la coquille une fois, et remonte la démo par sa `key` quand on change d'écran. Les tableaux des tâches 3 à 8 qui disent « rendues dans `<Shell>` » se lisent sans cette mention.
3. **Les libellés des états** sont « prêt », « sans données », « en attente », « en erreur » (distincts des démos de composants `vide` et `erreur`) ; le groupe des états reste affiché, désactivé, quand une démo de composant est choisie.
4. **Un en-tête s'écrit une fois** : quand il ne dépend pas de la valeur prête, `const entete` avant les retours anticipés, comme `EcranImport` (tâche 8) le fait déjà.
5. **La créance** porte `identifiant` dans sa valeur (`CreanceOuverte`), pas en prop ; `CreanceEnErreur` n'a plus besoin des paramètres.

### Correctifs de la revue de la tâche 3 (appliqués AVANT la tâche 4), et ce qu'ils changent pour les tâches 4 à 10

1. **Les données de la salle se CALCULENT par les fonctions du domaine**, depuis des entrées communes à la famille, jamais en recopiant une phrase ou un chiffre. La tâche 3 avait livré une question inventée, un litige « sans constat » que le produit ne peut pas produire, deux risques que `creanceComplete` ne rend jamais et un segment de décompte faux de 80,18 € ; le regard avait même tiré un faux défaut de la donnée impossible. Pour les tâches 4 à 8 : une valeur de démonstration vient de la fonction que la requête appelle (`lireLitige`, `questionsRestantes`, `qualifier`, `pyramideDePreuves`, `composerRelance`, et pour la procédure la machine à états de `apres-procedure.ts`) ; à défaut, son commentaire cite la ligne du produit qu'elle reproduit.
2. **Une entrée peut porter des variantes nommées** : `variantes?: readonly string[]` sur `EcranDuProduit`, et `Demo` reçoit `variante?: string`. La salle les offre dans l'état prêt, dans un troisième groupe de boutons. Elles gardent visibles les formes réelles qu'une ancienne démo montrait côte à côte (relances suspendues, litige litigieux, pyramide à 0 et à 4 sur 4). **La procédure (tâche 4) en porte plusieurs** : voir sa tâche.
3. **La procédure a son propre fichier de salle**, `src/routes/-salle/procedure.tsx` (tableau `ECRANS_PROCEDURE`, réuni dans `ecrans.tsx`) : `creance.tsx` dépasse déjà 300 lignes.
4. **Le long commentaire qui justifie une page se pose au-dessus de la fonction `Ecran…`**, pas au-dessus de l'interface de ses données, qui reçoit un commentaire d'une ligne.
5. **Un type d'élément se nomme** plutôt que de s'écrire en ligne dans un tableau (`readonly ConditionAConfirmer[]`) : la règle `array-type` d'oxlint le signale sinon.

### Correctifs de la seconde revue de la tâche 3 (appliqués AVANT la tâche 4), et ce qu'ils changent pour les tâches 4 à 8

1. **Une famille déclare ses entrées d'abord.** En tête de son fichier de salle viennent le nom du débiteur (une seule constante), sa santé, les réponses déclarées, les pièces, les factures et la date du jour figée. Toutes les données de ses écrans en DÉRIVENT, y compris la rangée d'un écran qui résume les autres. La rangée de la créance affichait 65 % là où `qualifier` ne sait rendre que 15, 30, 45, 60 ou 75 %, « 1 prêt » pour un débiteur en liquidation, et « À produire » à côté d'une page de décompte.
2. **Deux pages d'une même famille ne se contredisent pas.** Quand une page a besoin d'une autre forme pour se montrer utilement (les relances d'un débiteur sain, pour voir leurs brouillons), cette forme dérive des mêmes entrées avec une seule entrée changée, et un commentaire d'une ligne le dit. Une page qui a besoin d'une autre créance entière (la procédure, tâche 4) a sa propre famille, sous un autre nom de débiteur.
3. **Les variantes se lisent par `formeDemo(variante, principale, formes)`** (`demo.ts`), et l'entrée déclare `variantes: Object.keys(formes)`. Un nom mal écrit lève, au lieu de rendre la forme principale en silence.
4. **Un bouton de variante ne s'allume que dans l'état prêt** (`active={etat === 'pret' && …}`) : il ne montre jamais un choix que la démonstration ne reçoit pas.

### Correctifs de la revue de la tâche 4 (appliqués AVANT la tâche 5), et ce qu'ils changent pour les tâches 5 à 8

1. **Une famille ne réemploie pas le nom d'un débiteur qu'une autre famille montre autrement.** La procédure montrait « Ateliers Martin » engagé le 15/12/2025. La rangée de l'onglet des procédures, qui mène à cette page, montre le même « Ateliers Martin » engagé le 04/06/2026 avec un autre intervenant : c'est la contradiction entre une rangée et sa page, par-dessus la frontière des familles. Chaque famille nomme ses débiteurs d'un nom qu'aucune autre donnée de la salle n'emploie (le vérifier par une recherche dans `src/routes/-salle` et `src/routes/showroom.tsx`). La seule exception est une famille qui dérive ses données de celle qui porte déjà ce nom.
2. **La salle remonte la démonstration à chaque changement d'écran, d'état ou de variante** (`key` sur les trois). Une feuille ouverte dans « sans données » restait ouverte par-dessus la forme prête, qui n'a pas de quoi l'ouvrir.
3. **Une lecture dont dépend un texte visible de l'écran prêt entre dans l'attente.** La procédure attendait la créance et le suivi, pas le carnet, alors que la rangée « Qui fait l'acte » en tire le nom : elle affichait « Moi-même » le temps que le carnet arrive. Pour les tâches 5 à 8, là où le plan écrit `x ?? []` ou `x ?? null` pour une lecture en cours, regarder ce que l'écran affiche avec cette valeur de repli. S'il affirme quelque chose de faux (« 0 pièce », « Moi-même »), le signaler dans le rapport, et ne corriger dans la tâche que si le correctif tient en une condition d'attente.
4. **Le jour de la démonstration commande aussi les champs.** Un champ de date se remplit depuis la date que la page reçoit (`aujourdHui`), pas depuis l'horloge : la salle, figée, ne change pas chaque matin.

### Correctifs de la revue de la tâche 5 (appliqués AVANT la tâche 6), et la tâche 5 bis

1. **Une remise à zéro se déclare dans l'écran, pas par accident.** La fiche d'un débiteur ne se vidait entre deux débiteurs que parce qu'elle se démonte le temps que les factures du suivant arrivent. La salle masquait la question avec une `key` qui n'existe pas en production. `DetailDebiteur` reçoit `key={detail.debiteurId}` dans l'écran, et la clé de la salle disparaît. Pour les tâches 6 à 8 : un état tapé dans un volet qui change de sujet se remonte par une `key` posée dans l'écran.
2. **La salle trie comme la requête.** Les pièces de la salle suivaient l'ordre de dépôt, alors que `listerPiecesDuDebiteur` trie de la plus récente à la plus ancienne. Une dérivation reproduit aussi l'ORDRE que la requête rend.
3. **Une forme d'attente d'un volet se montre, et ne dit rien de faux.** Pendant la lecture d'un débiteur choisi, la fiche disait « Choisissez un débiteur… ». Elle dit maintenant qu'elle se lit, et la salle en fait une variante nommée (« fiche en lecture »).
4. **Aucune démonstration ne montre `SAINE`**, que le produit n'écrit jamais : la santé d'un débiteur sans annonce est `INCONNUE`.

**Tâche 5 bis : ce qu'on a posé pour un débiteur ne passe plus au suivant.** Relevé par la revue de la tâche 5 : le défaut est antérieur à la migration, et en production. `src/routes/app/debiteurs.tsx` garde dans des `useState` de la route des états propres au débiteur ouvert, que rien ne remet à zéro quand on en change. Un clic ne vide que `selection`, et le retour du navigateur ne vide rien. Les états en cause :
- `recherche`, les candidats du registre ;
- `erreurSiren` ;
- `montantCherche` et `dateReglement`, du lettrage ;
- `erreurLettrage` ;
- `erreur` ;
- `selection`.

Conséquences :
- « Retenir » écrit sur B le SIREN trouvé pour A, et le radar surveille la mauvaise entreprise ;
- la fiche de B peut proposer « Solder ces factures » pour le virement de A ;
- après un retour, « Constituer une créance » peut viser une facture de A.

Le commentaire des lignes 166-167, qui affirme une remise à zéro au changement de débiteur, est faux.

Correctif : le motif que la route emploie déjà pour `constatPose` (lignes 134-138). Chaque état porte l'identifiant du débiteur pour lequel il a été posé, et se dérive au rendu : la valeur si l'identifiant est celui du débiteur choisi, l'état de repos sinon. Une seule fonction pure fait la dérivation, avec un test. Aucun `useEffect`. Le commentaire faux se corrige. La salle ne peut pas le vérifier (la route lit la base) : la relecture de code tranche, et un essai réel suit si le déploiement de développement est accessible.

---

## Tâche 2 : la salle montre les écrans du produit, en commençant par les trois qui ont déjà un fichier d'écran

Cette tâche éprouve le patron de bout en bout sur l'accueil, les procédures et la créance, et pose le registre que les tâches 3 à 8 compléteront.

**Files:**
- Create: `src/routes/-salle/donnees.tsx`
- Create: `src/routes/-salle/ecrans.tsx`
- Modify: `src/screens/accueil.tsx`, `src/screens/procedures.tsx`, `src/screens/creance.tsx`
- Modify: `src/routes/app/index.tsx`, `src/routes/app/procedures.tsx`, `src/routes/app/creance.$id.tsx`
- Modify: `src/routes/showroom.tsx`

- [ ] **Step 1 : déplacer les données de démonstration**

Créer `src/routes/-salle/donnees.tsx` et y DÉPLACER depuis `src/routes/showroom.tsx`, avec leurs commentaires et en les exportant : `EVENEMENTS_DEMO`, `RAIL_DEMO`, `DOSSIERS_DEMO`, `ACCUEIL_DEMO`, `ACCUEIL_VIERGE`. Y ajouter `CREANCE_DEMO`, qui est l'objet passé à `creance={…}` dans `DemoCreance`, avec son commentaire sur la procédure collective :

```tsx
export const CREANCE_DEMO: CreanceAffichee = {
	debiteur: 'Fournitures Durand',
	// … l'objet de `DemoCreance`, à l'identique, jusqu'à `regimePrescriptionNote`
};
```

Ses imports viennent avec lui (`pyramideDePreuves`, `questionsRestantes`, `travauxDuVeilleur`, `ceQuiManque`, les types). `showroom.tsx` importe de `./-salle/donnees` celles de ces constantes qu'il utilise encore (`EVENEMENTS_DEMO` pour `DemoFlux` et `DemoSurveillanceMuette`, `RAIL_DEMO` pour `DemoRail`).

- [ ] **Step 2 : `EcranAccueil` reçoit une lecture**

Dans `src/screens/accueil.tsx` :

1. Imports : retirer `Page` et `PageBody` ; ajouter `BoutonPrincipal`, `PageEcran` et `type Lecture` à l'import de `'../ui'`.
2. Remplacer la signature (ligne 165) et le début du corps :

```tsx
export function EcranAccueil({ donnees }: { donnees: Lecture<AccueilAffiche> }) {
	/**
	 * ⚠️ L'ISSUE N'EST PAS L'ACCUEIL, PUISQU'ON Y EST. Un lien vers `/app` depuis
	 * `/app` ne mène nulle part : l'accueil en erreur ouvre les débiteurs, le
	 * premier écran de travail.
	 */
	if (donnees.etat !== 'pret') {
		return (
			<PageEcran
				entete={{ genre: 'aucun' }}
				etat={donnees.etat}
				issue={
					<BoutonPrincipal as={Link} to="/app/debiteurs">
						Voir mes débiteurs
					</BoutonPrincipal>
				}
			/>
		);
	}

	const vue = donnees.valeur;
```

Les lignes 166 à 191 (`rienASurveiller`, `rienDeChiffre`, `debute`, `actions`) ne changent pas.

3. Remplacer `<Page>` + `<PageBody>` (lignes 194 et 195) par `<PageEcran entete={{ genre: 'aucun' }}>` suivi d'un `<div>`, et `</PageBody>` + `</Page>` (lignes 391 et 392) par `</div>` suivi de `</PageEcran>`. Tout ce qui est entre les deux (le `PageHero` et la colonne qui le suit, lignes 196 à 390) ne change pas. Le `<div>` unique garde l'espacement actuel : sans lui, la colonne de la coquille ajouterait `gap-cladd-xs` entre le hero et la suite.

- [ ] **Step 3 : `EcranProcedures` reçoit une lecture**

Dans `src/screens/procedures.tsx` : imports, retirer `Page` et `PageHeader` (garder `PageBody`, qui enveloppe la liste) ; ajouter `PageEcran` et `type Lecture`. Remplacer les lignes 53 à 135 par :

```tsx
export interface ProceduresAffichees {
	readonly dossiers: readonly DossierAffiche[];
	/** Le dossier ouvert, lu dans l'adresse (`?p=`). */
	readonly ouvertId: string | null;
	readonly onFermer: () => void;
}

export function EcranProcedures({ donnees }: { donnees: Lecture<ProceduresAffichees> }) {
	if (donnees.etat !== 'pret') {
		// `disposition="volets"` : l'attente se dessine déjà en deux volets, et la
		// page ne saute pas quand les dossiers arrivent. Voir `PageEcran`.
		return (
			<PageEcran
				entete={{ genre: 'onglet', titre: 'Procédures' }}
				etat={donnees.etat}
				disposition="volets"
			/>
		);
	}

	const { dossiers, ouvertId, onFermer } = donnees.valeur;
	const ouvert = dossiers.find((d) => d.creanceId === ouvertId) ?? null;

	if (dossiers.length === 0) {
		return (
			<PageEcran
				entete={{ genre: 'onglet', titre: 'Procédures' }}
				etat={{
					vide: {
						/*
						  ⚠️ AUCUNE VOIE N'EST PROPOSÉE ICI. (le commentaire des lignes 70 à 73,
						  à l'identique, en commentaire de bloc)
						*/
						illustration: '⚖️',
						titre: 'Rien d’engagé aujourd’hui',
						explication:
							'Le jour où vous engagerez une voie, c’est ici que seront comptés les délais qui en découlent, et ceux dont l’oubli fait tout reprendre.',
						etapes: [
							'Vous déclarez ce que vous avez engagé, et à quelle date.',
							'Le logiciel compte les délais qui en découlent, et nomme ceux qu’il ne sait pas compter.',
							'Vous consignez ce qui se passe ; le rail avance tout seul.'
						],
						action: (
							<BoutonPrincipal as={Link} to="/app/debiteurs">
								Voir mes débiteurs
							</BoutonPrincipal>
						)
					}
				}}
			/>
		);
	}

	return (
		<PageEcran
			entete={{
				genre: 'onglet',
				titre: 'Procédures',
				sousTitre: `${dossiers.length} engagée${dossiers.length > 1 ? 's' : ''}`
			}}
			volets={{
				liste: (
					<PageBody>
						{/* les lignes 111 à 127 (`<ListeAnalyses>` et ses rangées), à l'identique */}
					</PageBody>
				),
				preuve: ouvert === null ? null : <VoletDossier dossier={ouvert} />,
				preuveOuverte: ouvert !== null,
				onFermerPreuve: onFermer
			}}
		/>
	);
}
```

Le commentaire des lignes 101 à 104 (`min-h-0 flex-1`) disparaît : cette géométrie vit maintenant dans la coquille, qui porte le même commentaire. `VoletDossier` ne change pas.

- [ ] **Step 4 : `EcranCreance` reçoit une lecture**

Dans `src/screens/creance.tsx` : imports, retirer `Page`, `PageHeader`, `PageBody` ; ajouter `PageEcran` et `type Lecture`. Remplacer les lignes 88 à 115 et 242 à 245 pour obtenir :

```tsx
export interface CreanceOuverte {
	readonly creance: CreanceAffichee;
	/** Le libellé de l'état de la procédure engagée, ou `null`. */
	readonly etatProcedure: string | null;
	/** Le total du dernier décompte arrêté, ou `null` s'il n'y en a pas. */
	readonly totalDecompte: bigint | null;
}

export function EcranCreance({
	identifiant,
	donnees
}: {
	/** L'identifiant de la créance, pour construire les liens de détail. */
	identifiant: string;
	donnees: Lecture<CreanceOuverte>;
}) {
	if (donnees.etat !== 'pret') {
		return <PageEcran entete={{ genre: 'onglet', titre: 'Créance' }} etat={donnees.etat} />;
	}

	const { creance, etatProcedure, totalDecompte } = donnees.valeur;
	const aDemander = creance.litige.questions.length + creance.questions.length;
	const relancesPretes = creance.relances.filter((r) => r.disponible).length;
	const voies = creance.procedures.filter((p) => p.disponible).length;

	return (
		<PageEcran
			entete={{
				genre: 'onglet',
				titre: creance.debiteur,
				sousTitre: `${creance.factures.length} facture${pluriel(creance.factures.length)} · ${eurosCentimes(
					creance.principalRestantDu
				)} restant dû`
			}}
		>
			{/* les lignes 116 à 241 (score, débiteur, analyses, note de prescription), à l'identique */}
		</PageEcran>
	);
}
```

La colonne des lignes 115 et 242 disparaît : c'est exactement celle de la coquille.

- [ ] **Step 5 : les trois routes**

`src/routes/app/index.tsx` :

1. Ligne 5 : l'import de `'../../ui'` ne garde que `aujourdHuiISO, travauxDuVeilleur, ceQuiManque`.
2. Ligne 10 : `export const Route = createFileRoute('/app/')({ component: Accueil, errorComponent: AccueilEnErreur });`, puis, juste après :

```tsx
function AccueilEnErreur() {
	return <EcranAccueil donnees={{ etat: 'erreur' }} />;
}
```

3. Lignes 78 à 86 : le bloc `if (flux === undefined || revelation === undefined)` rend désormais `return <EcranAccueil donnees={{ etat: 'attente' }} />;`.
4. Lignes 145 et 146 : `vue={{` devient `donnees={{ etat: 'pret', valeur: {`, et la fermeture des lignes 208 et 209 (`}}` puis `/>`) prend une accolade de plus (`} }}`). L'objet entre les deux ne change pas.

`src/routes/app/procedures.tsx`, en entier :

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EcranProcedures, type DossierAffiche } from '../../screens/procedures';
import { parcoursDeLaVoie } from '../../lib/verticales/recouvrement/apres-procedure';

/**
 * (le commentaire des lignes 8 à 13, à l'identique)
 */
export const Route = createFileRoute('/app/procedures')({
	component: Procedures,
	errorComponent: ProceduresEnErreur,
	validateSearch: (recherche: Record<string, unknown>): { p?: string } => {
		const p = recherche.p;
		return typeof p === 'string' && p.length > 0 ? { p } : {};
	}
});

function ProceduresEnErreur() {
	return <EcranProcedures donnees={{ etat: 'erreur' }} />;
}

function Procedures() {
	const { p } = Route.useSearch();
	const navigate = useNavigate();
	const dossiers = useQuery(api.recouvrement.apresProcedure.dossiersEngages, {});

	return (
		<EcranProcedures
			donnees={
				dossiers === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								dossiers: dossiers.map(
									(d): DossierAffiche => ({
										// les lignes 42 à 60, à l'identique, commentaire compris
									})
								),
								ouvertId: p ?? null,
								onFermer: () => void navigate({ to: '/app/procedures', search: {} })
							}
						}
			}
		/>
	);
}
```

`src/routes/app/creance.$id.tsx` : ligne 5 supprimée (plus rien d'`'../../ui'`) ; ligne 8 devient

```tsx
export const Route = createFileRoute('/app/creance/$id')({
	component: Creance,
	errorComponent: CreanceEnErreur
});

function CreanceEnErreur() {
	const { id } = Route.useParams();
	return <EcranCreance identifiant={id} donnees={{ etat: 'erreur' }} />;
}
```

et les lignes 31 à 49 (le `if` et le `return`) deviennent :

```tsx
	/**
	 * ⚠️ ON ATTEND AUSSI LE SUIVI ET LE DERNIER DÉCOMPTE. L'écran s'affichait dès
	 * la créance lue, et pendant l'aller-retour des deux autres il annonçait
	 * « Aucune voie » et un décompte « À produire » qui existaient peut-être.
	 */
	return (
		<EcranCreance
			identifiant={id}
			donnees={
				creance === undefined || suivi === undefined || dernier === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								creance,
								etatProcedure: suivi?.libelle ?? null,
								totalDecompte: dernier?.total ?? null
							}
						}
			}
		/>
	);
```

- [ ] **Step 6 : le registre des écrans**

`src/routes/-salle/ecrans.tsx` :

```tsx
import { useState, type ReactNode } from 'react';
import type { Lecture } from '../../ui';
import { Shell } from '../../app/shell';
import { EcranAccueil } from '../../screens/accueil';
import { EcranCreance } from '../../screens/creance';
import { EcranProcedures } from '../../screens/procedures';
import { ACCUEIL_DEMO, ACCUEIL_VIERGE, CREANCE_DEMO, DOSSIERS_DEMO } from './donnees';

/**
 * LES ÉCRANS DU PRODUIT, TELS QU'IL LES AFFICHE.
 *
 * ⚠️ LA SALLE MONTRAIT D'AUTRES PAGES QUE CELLES DU PRODUIT. Ses démonstrations
 * recomposaient un en-tête autour d'un composant : « Son habitude de paiement »
 * là où l'écran dit « Comment il paie d'habitude ». On y vérifiait une page que
 * personne ne verrait.
 *
 * Chaque entrée rend ici le VRAI écran, importé de `src/screens/`, dans chacun
 * de ses états. `salle-complete.test.ts` échoue si une route de `src/routes/app/`
 * n'y figure pas.
 */

/** Les états qu'on vient regarder. `vide` n'existe que pour les écrans qui en ont un. */
export type EtatDemo = 'pret' | 'vide' | 'attente' | 'erreur';

export interface EcranDuProduit {
	/** La route, écrite exactement comme `createFileRoute` la déclare. */
	readonly route: string;
	readonly libelle: string;
	/** Vrai si l'écran a une forme vide à regarder. */
	readonly vide: boolean;
	readonly rendre: (etat: EtatDemo) => ReactNode;
}

/** La lecture d'un état de démonstration. Hors du vide, `pret` et `vide` portent la même valeur. */
export function lectureDemo<T>(etat: EtatDemo, pret: T, vide?: T): Lecture<T> {
	if (etat === 'attente' || etat === 'erreur') return { etat };
	return { etat: 'pret', valeur: etat === 'vide' && vide !== undefined ? vide : pret };
}

/**
 * ⚠️ LE DOSSIER EST OUVERT D'EMBLÉE, et c'est ce qu'on vient regarder : sous
 * 1024 px la preuve est une feuille plein écran, au-dessus c'est le volet droit.
 */
function ProceduresDemo({ etat }: { etat: EtatDemo }) {
	const [ouvert, setOuvert] = useState<string | null>(DOSSIERS_DEMO[0]?.creanceId ?? null);
	const fermer = () => setOuvert(null);

	return (
		<EcranProcedures
			donnees={lectureDemo(
				etat,
				{ dossiers: DOSSIERS_DEMO, ouvertId: ouvert, onFermer: fermer },
				{ dossiers: [], ouvertId: null, onFermer: fermer }
			)}
		/>
	);
}

export const ECRANS_DU_PRODUIT: readonly EcranDuProduit[] = [
	{
		route: '/app/',
		libelle: 'accueil',
		vide: true,
		rendre: (etat) => (
			<Shell>
				<EcranAccueil donnees={lectureDemo(etat, ACCUEIL_DEMO, ACCUEIL_VIERGE)} />
			</Shell>
		)
	},
	{
		route: '/app/procedures',
		libelle: 'procédures',
		vide: true,
		rendre: (etat) => (
			<Shell>
				<ProceduresDemo etat={etat} />
			</Shell>
		)
	},
	{
		route: '/app/creance/$id',
		libelle: 'créance',
		vide: false,
		rendre: (etat) => (
			<Shell>
				<EcranCreance
					identifiant="demo"
					donnees={lectureDemo(etat, {
						creance: CREANCE_DEMO,
						etatProcedure: null,
						totalDecompte: null
					})}
				/>
			</Shell>
		)
	}
];
```

- [ ] **Step 7 : brancher la salle sur le registre**

Dans `src/routes/showroom.tsx` :

1. Supprimer `DemoAccueil`, `DemoAccueilVierge`, `DemoProcedures`, `DemoProceduresVide`, `DemoCreance`, leurs clés dans `ECRANS` (`'accueil'`, `'accueil-vierge'`, `'procedures'`, `'procedures-vide'`, `'creance'`) et leurs lignes de rendu. Retirer les imports devenus inutiles (`EcranAccueil`, `EcranProcedures`, `EcranCreance`, `AccueilAffiche`, `DossierAffiche`, `questionsRestantes` et `pyramideDePreuves` s'ils ne servent plus, etc. : `bun run lint` les nomme).
2. Ajouter l'import `import { ECRANS_DU_PRODUIT, type EtatDemo } from './-salle/ecrans';`.
3. Remplacer la fonction `Showroom` par :

```tsx
const LIBELLE_ETAT: Record<EtatDemo, string> = {
	pret: 'prêt',
	vide: 'vide',
	attente: 'attente',
	erreur: 'erreur'
};

function Showroom() {
	const [ecran, setEcran] = useState<Ecran>('veilleur');
	const [produit, setProduit] = useState<string | null>(ECRANS_DU_PRODUIT[0]?.route ?? null);
	const [etat, setEtat] = useState<EtatDemo>('pret');

	const choisi = ECRANS_DU_PRODUIT.find((e) => e.route === produit) ?? null;
	const etats: readonly EtatDemo[] =
		choisi === null ? [] : choisi.vide ? ['pret', 'vide', 'attente', 'erreur'] : ['pret', 'attente', 'erreur'];

	return (
		<div className="flex h-dvh flex-col">
			{/* UNE SEULE RANGÉE, et c'est voulu : les écrans se rendent dans leur
			    coquille, barres comprises, et chaque rangée de plus repousserait la
			    barre basse du téléphone hors de l'écran qu'on vient regarder. */}
			<div className="shrink-0 overflow-x-auto border-b border-cladd-bg-outline p-cladd-3xs">
				<Toolbar>
					{choisi === null ? null : (
						<Segmented activeColor="brand" activeVariant="solid">
							{etats.map((e) => (
								<SegmentedButton key={e} active={etat === e} onClick={() => setEtat(e)}>
									{LIBELLE_ETAT[e]}
								</SegmentedButton>
							))}
						</Segmented>
					)}
					<Segmented activeColor="neutral" activeVariant="solid">
						{ECRANS_DU_PRODUIT.map((e) => (
							<SegmentedButton
								key={e.route}
								active={produit === e.route}
								onClick={() => {
									setProduit(e.route);
									setEtat('pret');
								}}
							>
								{e.libelle}
							</SegmentedButton>
						))}
						{ECRANS.map((e) => (
							<SegmentedButton
								key={e}
								active={produit === null && ecran === e}
								onClick={() => {
									setProduit(null);
									setEcran(e);
								}}
							>
								{e}
							</SegmentedButton>
						))}
					</Segmented>
				</Toolbar>
			</div>

			<div className="min-h-0 flex-1">
				{choisi !== null ? (
					choisi.rendre(etat)
				) : (
					<>
						{/* les lignes de rendu des démos de composants qui restent, à
						    l'identique ; `ecran === 'introuvable' ? <EcranIntrouvable />`
						    et `ecran === 'erreur' ? <EcranEnErreur />` restent écrites
						    telles quelles, `ecrans-de-passage.test.ts` les lit */}
					</>
				)}
			</div>
		</div>
	);
}
```

- [ ] **Step 8 : vérifier**

```bash
grep -nE "<Page|<EnteteDetail|sr-only\">Chargement" src/routes/app/index.tsx src/routes/app/procedures.tsx src/routes/app/creance.\$id.tsx
bunx prettier --write src/routes/-salle src/screens/accueil.tsx src/screens/procedures.tsx src/screens/creance.tsx src/routes/app/index.tsx src/routes/app/procedures.tsx src/routes/app/creance.\$id.tsx src/routes/showroom.tsx
bun run test:unit
bun run check
bun run lint
```

Attendu : le `grep` ne sort rien, les trois commandes sont vertes.

- [ ] **Step 9 : regarder (règle commune n° 10)** l'accueil, les procédures et la créance, dans leurs états.

- [ ] **Step 10 : committer**

```bash
git add src/routes/-salle/donnees.tsx src/routes/-salle/ecrans.tsx
git commit --no-verify -m "feat(salle): la salle montre les ecrans du produit, et l'accueil, les procedures et la creance passent dans la coquille" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -- src/routes/-salle src/screens/accueil.tsx src/screens/procedures.tsx src/screens/creance.tsx src/routes/app/index.tsx src/routes/app/procedures.tsx "src/routes/app/creance.\$id.tsx" src/routes/showroom.tsx
```

---

## Tâche 3 : cinq analyses de la créance (décompte, litige, relances, risques, solidité)

Les cinq pages poussées sous `/app/creance/$id/…`, sauf la procédure (tâche 4). Toutes ont le même en-tête : un retour vers la créance, dont le libellé est le nom du débiteur une fois lu, « Créance » avant.

**Files:**
- Create: `src/screens/analyses/decompte.tsx`, `litige.tsx`, `relances.tsx`, `risques.tsx`, `solidite.tsx`
- Modify: `src/routes/app/creance_.$id.decompte.tsx`, `creance_.$id.litige.tsx`, `creance_.$id.relances.tsx`, `creance_.$id.risques.tsx`, `creance_.$id.solidite.tsx`
- Modify: le fichier de la famille dans `src/routes/-salle/` (voir « Correctifs de la revue de la tâche 2 »), `src/routes/-salle/communes.ts` pour les données partagées avec les démos de composants, `src/routes/-salle/ecrans.tsx` si la famille est neuve, `src/routes/showroom.tsx`

**Patron commun des cinq routes.** Chaque route garde son commentaire de tête réduit à une phrase (« Branchée sur la base ; le dessin vit dans `screens/analyses/<nom>.tsx`. »), le long commentaire qui justifie la page descendant en tête de l'écran. Elle déclare :

```tsx
export const Route = createFileRoute('/app/creance_/$id/<nom>')({
	component: Page<Nom>,
	errorComponent: <Nom>EnErreur
});

function <Nom>EnErreur() {
	const { id } = Route.useParams();
	return <Ecran<Nom> identifiant={id} donnees={{ etat: 'erreur' }} />;
}
```

Et chaque écran commence par :

```tsx
const pret = donnees.etat === 'pret' ? donnees.valeur : null;
```

puis rend `<PageEcran entete={…} etat={donnees.etat}>{pret === null ? null : …}</PageEcran>`, avec :

```tsx
retour: {
	vers: '/app/creance/$id',
	parametres: { id: identifiant },
	libelle: pret?.debiteur ?? 'Créance'
}
```

- [ ] **Step 1 : les relances**

`src/screens/analyses/relances.tsx` :

```tsx
import { PageEcran, Relances, type Lecture, type NiveauAffiche } from '../../ui';

/**
 * (le commentaire des lignes 9 à 27 de la route, à l'identique)
 */
export interface RelancesDeLaCreance {
	readonly debiteur: string;
	readonly niveaux: readonly NiveauAffiche[];
}

export function EcranRelances({
	identifiant,
	donnees
}: {
	identifiant: string;
	donnees: Lecture<RelancesDeLaCreance>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					vers: '/app/creance/$id',
					parametres: { id: identifiant },
					libelle: pret?.debiteur ?? 'Créance'
				},
				titre: 'Ce que vous pouvez lui écrire',
				sousTitre: 'Des brouillons, à envoyer depuis votre messagerie.'
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : <Relances niveaux={pret.niveaux} />}
		</PageEcran>
	);
}
```

Route `creance_.$id.relances.tsx`, corps de `PageRelances` après les deux premières lignes et la requête :

```tsx
	return (
		<EcranRelances
			identifiant={id}
			donnees={
				creance === undefined
					? { etat: 'attente' }
					: { etat: 'pret', valeur: { debiteur: creance.debiteur, niveaux: creance.relances } }
			}
		/>
	);
```

- [ ] **Step 2 : la solidité**

`src/screens/analyses/solidite.tsx` : même forme que les relances, avec

```tsx
import { PageEcran, Solidite, type Lecture, type SoliditeAffichee } from '../../ui';

export interface SoliditeDeLaCreance {
	readonly debiteur: string;
	readonly solidite: SoliditeAffichee;
}
```

l'en-tête `titre: 'Ce que les pièces établissent'` sans `sousTitre` (le commentaire des lignes 41 à 43 de la route vient au-dessus du titre), et le corps `<Solidite solidite={pret.solidite} />`. Route : `valeur: { debiteur: creance.debiteur, solidite: creance.solidite }`.

- [ ] **Step 3 : les risques**

`src/screens/analyses/risques.tsx` :

```tsx
import { Surface } from '@cladd-ui/react';
import { AlertTriangleIcon } from 'lucide-react';
import { PageEcran, type Lecture } from '../../ui';

/**
 * (le commentaire des lignes 11 à 22 de la route, à l'identique)
 */
export interface RisqueAffiche {
	readonly type: string;
	readonly description: string;
	readonly gravite: string;
}

export interface RisquesDeLaCreance {
	readonly debiteur: string;
	readonly risques: readonly RisqueAffiche[];
}

export function EcranRisques({
	identifiant,
	donnees
}: {
	identifiant: string;
	donnees: Lecture<RisquesDeLaCreance>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					vers: '/app/creance/$id',
					parametres: { id: identifiant },
					libelle: pret?.debiteur ?? 'Créance'
				},
				titre: 'Ce qui affaiblit ce dossier',
				sousTitre: pret === null ? undefined : `${pret.risques.length} relevé(s)`
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<div className="flex flex-col gap-cladd-3xs">
					{/* les lignes 41 à 76 de la route, à l'identique, en remplaçant
					    `creance.risques` par `pret.risques` (deux occurrences) */}
				</div>
			)}
		</PageEcran>
	);
}
```

« Rien de relevé sur ce dossier » reste la carte qu'elle est, et ne devient pas un état vide : c'est un constat (« une absence de risque CONNU »), pas un chemin. Route : `valeur: { debiteur: creance.debiteur, risques: creance.risques }`.

- [ ] **Step 4 : le décompte**

`src/screens/analyses/decompte.tsx` :

```tsx
import { Button, Surface } from '@cladd-ui/react';
import { FileDownIcon } from 'lucide-react';
import { BoutonPrincipal, Decompte, PageEcran, type DecompteAffiche, type Lecture } from '../../ui';

/**
 * (le commentaire des lignes 13 à 28 de la route, à l'identique)
 */
export interface DecompteDeLaCreance {
	readonly debiteur: string;
	/** Le dernier décompte arrêté, ou `null` s'il n'y en a pas encore. */
	readonly dernier: DecompteAffiche | null;
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onArreter: () => void;
	readonly onTelecharger: () => void;
}

export function EcranDecompte({
	identifiant,
	donnees
}: {
	identifiant: string;
	donnees: Lecture<DecompteDeLaCreance>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					vers: '/app/creance/$id',
					parametres: { id: identifiant },
					libelle: pret?.debiteur ?? 'Créance'
				},
				titre: 'Décompte',
				// ⚠️ PAS DE SOUS-TITRE PENDANT L'ATTENTE. Il disait « Aucun décompte
				// arrêté » le temps que la requête revienne, y compris sur une créance
				// qui en portait trois.
				sousTitre:
					pret === null
						? undefined
						: pret.dernier
							? `Arrêté au ${pret.dernier.arreteAu}`
							: 'Aucun décompte arrêté'
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<>
					{/* les lignes 129 à 172 de la route, à l'identique, avec :
					    `dernier` → `pret.dernier` (quatre occurrences) ;
					    `erreur` → `pret.erreur` (deux) ;
					    `enCours` → `pret.enCours` (deux) ;
					    `() => void produireDecompte()` → `pret.onArreter` ;
					    `() => void telecharger()` → `pret.onTelecharger` */}
				</>
			)}
		</PageEcran>
	);
}
```

Route `creance_.$id.decompte.tsx` : les lignes 29 à 116 (requêtes, états, `telecharger`, `produireDecompte`) restent ; les imports perdent `Button`, `Surface`, `FileDownIcon`, `BoutonPrincipal`, `Decompte`, `EnteteDetail`, `Page`, `PageBody` et gagnent `EcranDecompte`. Le `return` des lignes 118 à 176 devient :

```tsx
	return (
		<EcranDecompte
			identifiant={id}
			donnees={
				creance === undefined || dernier === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								debiteur: creance.debiteur,
								dernier,
								enCours,
								erreur,
								onArreter: () => void produireDecompte(),
								onTelecharger: () => void telecharger()
							}
						}
			}
		/>
	);
```

- [ ] **Step 5 : le litige**

`src/screens/analyses/litige.tsx` :

```tsx
import { Button, Surface } from '@cladd-ui/react';
import {
	BoutonPrincipal,
	PageEcran,
	QuestionnaireLitige,
	SectionEcran,
	type Lecture,
	type QuestionLitige,
	type ReponseFait
} from '../../ui';

/**
 * (le commentaire des lignes 19 à 34 de la route, à l'identique)
 */
export interface LitigeDeLaCreance {
	readonly debiteur: string;
	readonly questions: readonly QuestionLitige[];
	readonly constats: readonly string[];
	readonly litigieux: boolean;
	/** Les conditions légales que le logiciel n'a pas pu déduire. */
	readonly conditions: readonly { readonly condition: string; readonly libelle: string }[];
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onDeclarer: (cle: string, reponse: ReponseFait) => void;
	readonly onRepondre: (condition: string, reponse: 'ok' | 'ko') => void;
}

export function EcranLitige({
	identifiant,
	donnees
}: {
	identifiant: string;
	donnees: Lecture<LitigeDeLaCreance>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					vers: '/app/creance/$id',
					parametres: { id: identifiant },
					libelle: pret?.debiteur ?? 'Créance'
				},
				titre: 'Ce que vous seul pouvez dire',
				sousTitre: 'Des faits, pas une appréciation juridique.'
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<>
					{/* les lignes 73 à 131 de la route, à l'identique, avec :
					    `creance.litige.questions` → `pret.questions` ;
					    `creance.litige.constats` → `pret.constats` ;
					    `creance.litige.litigieux` → `pret.litigieux` ;
					    `enCours` → `pret.enCours` ;
					    `(cle, reponse) => void declarer(cle, reponse)` → `pret.onDeclarer` ;
					    `creance.questions` → `pret.conditions` (deux occurrences) ;
					    le `onClick` du bouton Oui → `() => pret.onRepondre(question.condition, 'ok')` ;
					    le `onClick` du bouton Non → `() => pret.onRepondre(question.condition, 'ko')` ;
					    `erreur` → `pret.erreur` (deux) */}
				</>
			)}
		</PageEcran>
	);
}
```

Route `creance_.$id.litige.tsx` : les lignes 35 à 56 restent ; le `return` des lignes 58 à 137 devient :

```tsx
	return (
		<EcranLitige
			identifiant={id}
			donnees={
				creance === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								debiteur: creance.debiteur,
								questions: creance.litige.questions,
								constats: creance.litige.constats,
								litigieux: creance.litige.litigieux,
								conditions: creance.questions,
								enCours,
								erreur,
								onDeclarer: (cle, reponse) => void declarer(cle, reponse),
								onRepondre: (condition, reponse) =>
									void repondre({ creanceId, reponses: { [condition]: reponse } })
							}
						}
			}
		/>
	);
```

- [ ] **Step 6 : la salle**

1. Dans `src/routes/-salle/creance.tsx`, déplacer depuis `showroom.tsx` les données de `DemoLitige`, `DemoRelances`, `DemoSolidite`, `DemoDecompte` et `DemoDetail` (dont `DECOMPTE_DEMO`, `QUESTIONS_LITIGE_DEMO`), sous des noms en `…_DEMO`. Une donnée qu'une démo de composant restante utilise encore va dans `communes.ts`.
2. Supprimer de `showroom.tsx` `DemoLitige`, `DemoRelances`, `DemoSolidite`, `DemoDecompte`, `DemoDetail`, leurs clés (`'litige'`, `'relances'`, `'solidite'`, `'decompte'`, `'detail'`) et leurs lignes de rendu.
3. Ajouter à `ECRANS_CREANCE` (dans `src/routes/-salle/creance.tsx`) cinq entrées `Demo`, avec `identifiant="demo"` et des gestionnaires vides (`() => undefined`), qui ne servent qu'à la salle :

| `route` | `libelle` | `vide` | Prêt | Vide |
| --- | --- | --- | --- | --- |
| `/app/creance_/$id/decompte` | `décompte` | oui | `dernier: DECOMPTE_DEMO` | `dernier: null` |
| `/app/creance_/$id/litige` | `litige` | oui | les questions et constats de `DemoLitige`, une condition à confirmer, `erreur: null` | `questions: []`, `conditions: []` |
| `/app/creance_/$id/relances` | `relances` | non | les niveaux de `DemoRelances` | |
| `/app/creance_/$id/risques` | `risques` | oui | deux risques, dont un `gravite: 'BLOQUANTE'` | `risques: []` |
| `/app/creance_/$id/solidite` | `solidité` | non | la solidité de `DemoSolidite` | |

`debiteur: 'Fournitures Durand'` partout.

- [ ] **Step 7 : vérifier**

```bash
grep -nE "<Page|<EnteteDetail|sr-only\">Chargement" src/routes/app/creance_.\$id.decompte.tsx src/routes/app/creance_.\$id.litige.tsx src/routes/app/creance_.\$id.relances.tsx src/routes/app/creance_.\$id.risques.tsx src/routes/app/creance_.\$id.solidite.tsx
bunx prettier --write src/screens/analyses src/routes/app/creance_.\$id.decompte.tsx src/routes/app/creance_.\$id.litige.tsx src/routes/app/creance_.\$id.relances.tsx src/routes/app/creance_.\$id.risques.tsx src/routes/app/creance_.\$id.solidite.tsx src/routes/-salle src/routes/showroom.tsx
bun run test:unit
bun run check
bun run lint
```

Attendu : le `grep` ne sort rien, les trois commandes sont vertes.

- [ ] **Step 8 : regarder (règle commune n° 10)** les cinq pages, dans leurs états.

- [ ] **Step 9 : committer**

```bash
git add src/screens/analyses
git commit --no-verify -m "feat(analyses): decompte, litige, relances, risques et solidite passent dans la coquille" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -- src/screens/analyses "src/routes/app/creance_.\$id.decompte.tsx" "src/routes/app/creance_.\$id.litige.tsx" "src/routes/app/creance_.\$id.relances.tsx" "src/routes/app/creance_.\$id.risques.tsx" "src/routes/app/creance_.\$id.solidite.tsx" src/routes/-salle src/routes/showroom.tsx
```

---

## Tâche 4 : la procédure

La route la plus lourde du produit (706 lignes). Elle reste **entièrement contrôlée** : ses trois feuilles, ses deux recherches et tous leurs états restent dans la route, parce que ses gestionnaires les referment en cas de succès (`setDeclaree(null)`, `setCarnetOuvert(false)`, `setRechercheOuverte(false)`…). Les faire descendre dans l'écran obligerait à réécrire ces gestionnaires ; ce chantier déplace le dessin, il ne réécrit pas la logique.

**Files:**
- Create: `src/screens/analyses/procedure.tsx`
- Modify: `src/routes/app/creance_.$id.procedure.tsx`
- Modify: le fichier de la famille dans `src/routes/-salle/` (voir « Correctifs de la revue de la tâche 2 »), `src/routes/-salle/communes.ts` pour les données partagées avec les démos de composants, `src/routes/-salle/ecrans.tsx` si la famille est neuve, `src/routes/showroom.tsx`

- [ ] **Step 1 : l'écran, et la feuille de déclaration qui descend avec lui**

`src/screens/analyses/procedure.tsx` contient, dans cet ordre :

1. Le commentaire des lignes 33 à 55 de la route (« LA PROCÉDURE, ce qui court… »).
2. Le type `ChoixDeclare` et son commentaire (lignes 57 à 68), **exporté**, avec des identifiants en `string` : la salle n'a pas d'`Id<'intervenants'>`, et la route convertit au moment d'écrire.

```tsx
export type ChoixDeclare = { readonly id: string | null } | null;
```

3. `FeuilleDeclaration` et son commentaire (lignes 81 à 239), à l'identique, sauf ses types : `carnet: readonly FicheIntervenant<string>[]` et `onOublier: (intervenantId: string) => void`. Elle importe `aujourdHuiISO` de `'../../ui'` comme avant : c'est la valeur initiale d'un champ, pas une lecture de données.
4. L'interface et l'écran :

```tsx
export interface ProcedureDeLaCreance {
	readonly debiteur: string;
	/** Ce qui court, ou `null` quand aucune voie n'est engagée. */
	readonly suivi: SuiviAffiche | null;
	readonly procedures: readonly VoieAffichee[];
	readonly carnet: readonly FicheIntervenant<string>[];
	/** L'intervenant rattaché au dossier, relu par identifiant. `null` : moi-même. */
	readonly intervenantChoisi: string | null;
	readonly nomIntervenant: string | null;
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly aujourdHui: string;
	// Les feuilles, et ce qu'elles montrent.
	readonly voieOuverte: VoieAffichee | null;
	readonly voieDeclaree: VoieAffichee | null;
	readonly carnetOuvert: boolean;
	readonly rechercheOuverte: boolean;
	readonly etatRecherche: EtatRechercheCommissaire;
	readonly rechercheAvocatOuverte: boolean;
	readonly repertoire: RepertoireAffiche | null;
	readonly barreau: string;
	readonly specialite: string;
	readonly etatAvocats: EtatRechercheAvocat;
	// Les gestes.
	readonly onOuvrirVoie: (cle: string) => void;
	readonly onFermerVoie: () => void;
	readonly onDeclarerVoie: () => void;
	readonly onFermerDeclaration: () => void;
	readonly onDeclarer: (procedure: string, engageeLe: string, choix: ChoixDeclare) => void;
	readonly onConsigner: (cle: string, survenuLe: string) => void;
	readonly onOuvrirCarnet: () => void;
	readonly onFermerCarnet: () => void;
	readonly onRattacher: (intervenantId: string | null) => void;
	readonly onAjouter: (fiche: FicheASaisir) => void;
	readonly onOublier: (intervenantId: string) => void;
	readonly onOuvrirRechercheCommissaire: () => void;
	readonly onFermerRechercheCommissaire: () => void;
	readonly onChercherCommissaire: (departement: string) => void;
	readonly onRetenirEtude: (etude: EtudeAffichee) => void;
	readonly onOuvrirRechercheAvocat: () => void;
	readonly onFermerRechercheAvocat: () => void;
	readonly onChoisirBarreau: (barreau: string) => void;
	readonly onChoisirSpecialite: (specialite: string) => void;
	readonly onRetenirAvocat: (avocat: AvocatAffiche) => void;
}

export function EcranProcedure({
	identifiant,
	donnees
}: {
	identifiant: string;
	donnees: Lecture<ProcedureDeLaCreance>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					vers: '/app/creance/$id',
					parametres: { id: identifiant },
					libelle: pret?.debiteur ?? 'Créance'
				},
				titre: 'Procédure',
				// ⚠️ PAS DE SOUS-TITRE PENDANT L'ATTENTE. Il disait « Aucune procédure
				// engagée » le temps que le suivi revienne, sur un dossier peut-être
				// engagé depuis des mois.
				sousTitre: pret === null ? undefined : (pret.suivi?.libelle ?? 'Aucune procédure engagée')
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : <ContenuProcedure pret={pret} />}
		</PageEcran>
	);
}
```

5. `ContenuProcedure({ pret }: { pret: ProcedureDeLaCreance })`, qui rend un fragment : le contenu des lignes 557 à 612 de la route (la section « Ce qui court », l'erreur, les voies), puis les feuilles des lignes 616 à 703, avec leurs commentaires. Les feuilles sont des `Popup` du kit, rendues dans la racine de superposition : leur place dans l'arbre ne change pas la mise en page.

Le ternaire des lignes 581 à 612 perd sa branche d'attente, que la coquille porte : `creance === undefined || suivi === undefined ? <p className="sr-only">…` disparaît, et il reste `pret.suivi === null ? (<SectionEcran titre="Les voies envisageables">…) : null`.

Substitutions, dans cet ordre de lecture :

| Dans la route | Dans `ContenuProcedure` |
| --- | --- |
| `suivi ?` (ligne 557), `suivi={suivi}` | `pret.suivi ?`, `suivi={pret.suivi}` |
| `aujourdHui={aujourdHuiISO()}` | `aujourdHui={pret.aujourdHui}` |
| `enCours` (partout) | `pret.enCours` |
| `(cle, survenuLe) => void consigner(cle, survenuLe)` | `pret.onConsigner` |
| `nomIntervenant ?? 'Moi-même'` | `pret.nomIntervenant ?? 'Moi-même'` |
| `() => setCarnetOuvert(true)` | `pret.onOuvrirCarnet` |
| `erreur` (ligne 579) | `pret.erreur` |
| `procedures.map(` | `pret.procedures.map(` |
| `() => setVoieOuverte(procedure.cle)` | `() => pret.onOuvrirVoie(procedure.cle)` |
| `voie={voie}`, `ouverte={voie !== null}` | `voie={pret.voieOuverte}`, `ouverte={pret.voieOuverte !== null}` |
| `onFermer={() => setVoieOuverte(null)}` | `onFermer={pret.onFermerVoie}` |
| `onDeclarer={() => setDeclaree(voie?.cle ?? null)}` | `onDeclarer={pret.onDeclarerVoie}` |
| `voieDeclaree === null ? null : (` | `pret.voieDeclaree === null ? null : (` |
| `key={voieDeclaree.cle}`, `voie={voieDeclaree}` | `key={pret.voieDeclaree.cle}`, `voie={pret.voieDeclaree}` |
| `carnet={fiches}` (deux fois) | `carnet={pret.carnet}` |
| `onFermer={() => setDeclaree(null)}` | `onFermer={pret.onFermerDeclaration}` |
| `onAjouter={(fiche) => void ajouter(fiche)}` (deux fois) | `onAjouter={pret.onAjouter}` |
| `onOublier={(intervenantId) => void oublier(intervenantId)}` (deux fois) | `onOublier={pret.onOublier}` |
| `onChercherUnCommissaire={() => setRechercheOuverte(true)}` (deux fois) | `onChercherUnCommissaire={pret.onOuvrirRechercheCommissaire}` |
| `onChercherUnAvocat={() => setRechercheAvocatOuverte(true)}` (deux fois) | `onChercherUnAvocat={pret.onOuvrirRechercheAvocat}` |
| `onDeclarer={(engageeLe, choix) => void declarer(voieDeclaree.cle, engageeLe, choix)}` | `onDeclarer={(engageeLe, choix) => pret.onDeclarer(voieDeclaree.cle, engageeLe, choix)}`, avec `const voieDeclaree = pret.voieDeclaree;` en tête de la branche |
| `choisi={intervenantChoisi}`, `ouverte={carnetOuvert}` | `choisi={pret.intervenantChoisi}`, `ouverte={pret.carnetOuvert}` |
| `onFermer={() => setCarnetOuvert(false)}` | `onFermer={pret.onFermerCarnet}` |
| `onChoisir={(intervenantId) => void rattacher(intervenantId)}` | `onChoisir={pret.onRattacher}` |
| `ouverte={rechercheOuverte}`, `etat={etatRecherche}` | `ouverte={pret.rechercheOuverte}`, `etat={pret.etatRecherche}` |
| `onFermer={() => setRechercheOuverte(false)}` | `onFermer={pret.onFermerRechercheCommissaire}` |
| `onChercher={(departement) => void chercher(departement)}` | `onChercher={pret.onChercherCommissaire}` |
| `onRetenir={(etude) => void retenir(etude)}` | `onRetenir={pret.onRetenirEtude}` |
| `ouverte={rechercheAvocatOuverte}`, `repertoire={repertoire ?? null}` | `ouverte={pret.rechercheAvocatOuverte}`, `repertoire={pret.repertoire}` |
| `barreau={barreauChoisi}`, `specialite={specialiteChoisie}`, `etat={etatAvocats}` | `barreau={pret.barreau}`, `specialite={pret.specialite}`, `etat={pret.etatAvocats}` |
| `onFermer={() => setRechercheAvocatOuverte(false)}` | `onFermer={pret.onFermerRechercheAvocat}` |
| `onChoisirBarreau={(choisi) => { … }}` | `onChoisirBarreau={pret.onChoisirBarreau}` (le commentaire des lignes 685 à 688 reste au-dessus) |
| `onChoisirSpecialite={setSpecialiteChoisie}` | `onChoisirSpecialite={pret.onChoisirSpecialite}` |
| `onRetenir={(avocat) => void retenirUnAvocat(avocat)}` | `onRetenir={pret.onRetenirAvocat}` |

Imports de l'écran : `useState` (pour `FeuilleDeclaration`), `Input, Popup, PopupContent, SectionTitle` de Cladd, et de `'../../ui'` : `BoutonPrincipal, ChoixIntervenant, FeuilleVoie, LigneBouton, ListeAnalyses, PageEcran, RechercheAvocat, RechercheCommissaire, SectionEcran, SuiviProcedure, aujourdHuiISO, dateCourte`, et les types `AvocatAffiche, EtatRechercheAvocat, EtatRechercheCommissaire, EtudeAffichee, FicheASaisir, FicheIntervenant, Lecture, RepertoireAffiche, SuiviAffiche, VoieAffichee`.

- [ ] **Step 2 : la route**

Dans `src/routes/app/creance_.$id.procedure.tsx` :

1. Supprimer les lignes 33 à 68 (commentaire et `ChoixDeclare`, descendus) et 81 à 239 (`FeuilleDeclaration`, descendue). `messageDuRefus` (lignes 70 à 79) reste.
2. Imports : de Cladd, plus rien ; de `'../../ui'`, garder `aujourdHuiISO` et les types `AvocatAffiche, EtatRechercheAvocat, EtatRechercheCommissaire, EtudeAffichee, FicheASaisir` ; ajouter `import { EcranProcedure, type ChoixDeclare } from '../../screens/analyses/procedure';`.
3. `Route` et l'erreur :

```tsx
export const Route = createFileRoute('/app/creance_/$id/procedure')({
	component: PageProcedure,
	errorComponent: ProcedureEnErreur
});

function ProcedureEnErreur() {
	const { id } = Route.useParams();
	return <EcranProcedure identifiant={id} donnees={{ etat: 'erreur' }} />;
}
```

4. Dans `declarer` (ligne 382), l'identifiant de la fiche se convertit au moment d'écrire : `rattacherIntervenant({ creanceId, intervenantId: choix.id as Id<'intervenants'> | null })`.
5. Le `return` des lignes 546 à 705 devient :

```tsx
	return (
		<EcranProcedure
			identifiant={id}
			donnees={
				creance === undefined || suivi === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								debiteur: creance.debiteur,
								suivi,
								procedures,
								carnet: fiches,
								intervenantChoisi,
								nomIntervenant,
								enCours,
								erreur,
								aujourdHui: aujourdHuiISO(),
								voieOuverte: voie,
								voieDeclaree,
								carnetOuvert,
								rechercheOuverte,
								etatRecherche,
								rechercheAvocatOuverte,
								repertoire: repertoire ?? null,
								barreau: barreauChoisi,
								specialite: specialiteChoisie,
								etatAvocats,
								onOuvrirVoie: (cle) => setVoieOuverte(cle),
								onFermerVoie: () => setVoieOuverte(null),
								onDeclarerVoie: () => setDeclaree(voie?.cle ?? null),
								onFermerDeclaration: () => setDeclaree(null),
								onDeclarer: (procedure, engageeLe, choix: ChoixDeclare) =>
									void declarer(procedure, engageeLe, choix),
								onConsigner: (cle, survenuLe) => void consigner(cle, survenuLe),
								onOuvrirCarnet: () => setCarnetOuvert(true),
								onFermerCarnet: () => setCarnetOuvert(false),
								onRattacher: (intervenantId) =>
									void rattacher(intervenantId as Id<'intervenants'> | null),
								onAjouter: (fiche) => void ajouter(fiche),
								onOublier: (intervenantId) => void oublier(intervenantId as Id<'intervenants'>),
								onOuvrirRechercheCommissaire: () => setRechercheOuverte(true),
								onFermerRechercheCommissaire: () => setRechercheOuverte(false),
								onChercherCommissaire: (departement) => void chercher(departement),
								onRetenirEtude: (etude) => void retenir(etude),
								onOuvrirRechercheAvocat: () => setRechercheAvocatOuverte(true),
								onFermerRechercheAvocat: () => setRechercheAvocatOuverte(false),
								onChoisirBarreau: (choisi) => {
									setBarreauChoisi(choisi);
									setSpecialiteChoisie('');
								},
								onChoisirSpecialite: (choisie) => setSpecialiteChoisie(choisie),
								onRetenirAvocat: (avocat) => void retenirUnAvocat(avocat)
							}
						}
			}
		/>
	);
```

Le carnet n'entre pas dans l'attente : il se chargeait déjà progressivement (`fiches = carnet ?? []`), et une feuille fermée n'a rien à en montrer.

- [ ] **Step 3 : la salle**

1. Créer `src/routes/-salle/procedure.tsx` (tableau `ECRANS_PROCEDURE`, à réunir dans `ecrans.tsx`) et y déplacer le suivi de `DemoSuivi`, RECALCULÉ par les fonctions du domaine quand elles existent (voir « Correctifs de la revue de la tâche 3 ») ; `VOIE_DEMO`, `CARNET_DEMO`, `ETUDES_DEMO`, `BARREAUX_DEMO`, `AVOCATS_DEMO` vont dans `src/routes/-salle/communes.ts`, et `showroom.tsx` importe de `communes.ts` celles que `DemoVoie`, `DemoIntervenant`, `DemoCommissaire` et `DemoAvocat` utilisent encore.
2. Supprimer `DemoSuivi`, sa clé `'suivi'` et sa ligne de rendu.
3. Ajouter à `src/routes/-salle/procedure.tsx` un composant `ProcedureDemo({ etat, variante })` qui tient dans des `useState` les feuilles et les recherches (comme la route), toutes FERMÉES au départ, et l'entrée, dans `ECRANS_PROCEDURE` :

```tsx
{
	route: '/app/creance_/$id/procedure',
	libelle: 'procédure',
	vide: true,
	variantes: ['voie terminée'],
	Demo: ProcedureDemo
}
```

Chaque donnée se CALCULE comme la requête qui l'alimente (voir « Correctifs de la revue de la tâche 3 »). Relevé au code le 14/09/2026, au commit `8a5f840` :

- **Le suivi** est ce que `lireSuivi` rend (`src/lib/convex/recouvrement/apresProcedure.ts`, lignes 83 à 103) : `suivreProcedure(cle, journal, engageeLe)` recopié champ par champ, et un `journal` dont chaque ligne prend son libellé par `libelleEvenement(cle, e.cle) ?? e.cle`. Une seule fonction de la famille le fait, pour les deux formes qui ont un suivi.
- **Prêt** : `suivreProcedure('injonction-de-payer', [{ cle: 'ordonnance-rendue', survenuLe: '2026-01-10' }], '2025-12-15')`, avec `aujourdHui: '2026-03-02'`, la date figée de `DemoSuivi` (un « dans N jours » qui bouge chaque matin ne se compare plus d'une capture à l'autre). Au relevé, ce calcul redonne exactement ce que `DemoSuivi` recopiait : « Ordonnance rendue », la signification avant le 10/04/2026, gravité `CADUCITE`.
- **Variante « voie terminée »** : le même journal, suivi de `ordonnance-signifiee` le 2026-01-20 et de `absence-opposition-constatee` le 2026-02-25. La machine arrive à `TITRE_EXECUTOIRE`, terminal : aucune échéance, aucune suite, un angle mort.
- **Vide** : `suivi: null`.
- **Les voies**, dans les trois formes : `Object.values(PROCEDURES)` transformé comme `creanceComplete` le fait (`src/lib/convex/recouvrement/lecture.ts`, lignes 606 à 633). `disponible` vaut `clesEnvisageables.has(cle) && procedure.peutEvaluer()`, où `clesEnvisageables` vient de `proceduresEnvisageables({ ...conditions, piecesFournies: [] })` (ligne 516) et `conditions` des quatre critères de la créance (lignes 475 à 480). **Ces quatre critères sont acquis (`'ok'`)** : c'est l'état d'une créance qu'on a pu engager. Ce ne sont pas ceux de la créance de `creance.tsx`, qui attend la confirmation de la qualité de commerçant : relevé au code, `entreCommercants: 'unknown'` rend l'injonction non envisageable, et plus aucune voie suivie n'offrirait « Je l'ai engagée ». **La procédure montre donc une autre créance que la famille créance** : `debiteur: 'Ateliers Martin'` (le débiteur de `DemoVoie`), déclaré sain, avec ses propres entrées en tête de `procedure.tsx`. Montrer « Fournitures Durand » engagée en injonction contredirait sa rangée, qui demande encore de confirmer la qualité de commerçant : la seconde revue de la tâche 3 a relevé ce genre de contradiction entre une rangée et ses pages. Avec les quatre critères acquis, le domaine rend l'injonction disponible et suivie, avec un blocage (`mentionsObligatoiresInjonction`, qui empêche de produire l'acte sans empêcher d'évaluer), L.126 indisponible (son décret n'est pas publié), et la relance amiable disponible et non suivie. `suivie`, `blocages` et `etapes` se calculent de même. Jamais `disponible: true` ni `blocages: []` écrits à la main : `VOIE_DEMO` écrit aujourd'hui `blocages: []` dans `showroom.tsx` et cache ainsi le blocage réel ; elle suit la même règle en descendant dans `communes.ts`.
- Les recherches répondent avec `ETUDES_DEMO` et `AVOCATS_DEMO`, comme leurs démos de composant.

**Les numéros de ligne de cette tâche ont glissé** depuis l'écriture du plan. Au commit `8a5f840`, dans la route : le commentaire « LA PROCÉDURE » ligne 34, `ChoixDeclare` 68, `messageDuRefus` 75, `FeuilleDeclaration` 108, `PageProcedure` 241, `declarer` 377, le `return` 546, l'attente `sr-only` 582, `FeuilleVoie` 616, `onChoisirBarreau` 697. Repérer par le contenu, pas par le numéro.

- [ ] **Step 4 : vérifier**

```bash
grep -nE "<Page|<EnteteDetail|sr-only\">Chargement" src/routes/app/creance_.\$id.procedure.tsx
bunx prettier --write src/screens/analyses/procedure.tsx src/routes/app/creance_.\$id.procedure.tsx src/routes/-salle src/routes/showroom.tsx
bun run test:unit
bun run check
bun run lint
```

Attendu : le `grep` ne sort rien, les trois commandes sont vertes.

- [ ] **Step 5 : regarder (règle commune n° 10)**, et ouvrir chaque feuille : le déroulé d'une voie, « Je l'ai engagée », le carnet, la recherche d'un commissaire, celle d'un avocat.

- [ ] **Step 6 : committer**

```bash
git add src/screens/analyses/procedure.tsx
git commit --no-verify -m "feat(analyses): la procedure passe dans la coquille, ses feuilles restent pilotees par la route" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -- src/screens/analyses/procedure.tsx "src/routes/app/creance_.\$id.procedure.tsx" src/routes/-salle src/routes/showroom.tsx
```

---

## Tâche 5 : les débiteurs, leur habitude, leurs pièces

**Files:**
- Create: `src/screens/debiteurs.tsx`, `src/screens/debiteur/habitude.tsx`, `src/screens/debiteur/pieces.tsx`
- Modify: `src/routes/app/debiteurs.tsx`, `debiteurs_.$id.habitude.tsx`, `debiteurs_.$id.pieces.tsx`
- Modify: le fichier de la famille dans `src/routes/-salle/` (voir « Correctifs de la revue de la tâche 2 »), `src/routes/-salle/communes.ts` pour les données partagées avec les démos de composants, `src/routes/-salle/ecrans.tsx` si la famille est neuve, `src/routes/showroom.tsx`

- [ ] **Step 1 : la liste des débiteurs**

`src/screens/debiteurs.tsx` :

```tsx
import type { ComponentProps } from 'react';
import { Link } from '@tanstack/react-router';
import { Chip, ListButton } from '@cladd-ui/react';
import { UploadIcon } from 'lucide-react';
import {
	Avatar,
	BoutonPrincipal,
	CarteListe,
	PageEcran,
	eurosCentimes,
	pluriel,
	type Lecture
} from '../ui';
import { DetailDebiteur } from './debiteur-detail';

/**
 * (le commentaire des lignes 100 à 111 de la route : « Les débiteurs, et leurs
 * factures », à l'identique)
 */
export interface LigneDebiteur {
	readonly _id: string;
	readonly denomination: string;
	readonly encours: bigint;
	readonly facturesEchues: number;
	readonly santeFinanciere: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
	readonly secteurDetermine: boolean;
}

export interface DebiteursAffiches {
	readonly debiteurs: readonly LigneDebiteur[];
	/** Le débiteur ouvert, lu dans l'adresse (`?d=`). */
	readonly choisi: string | null;
	/** Ouvrir une fiche, c'est naviguer, et vider la sélection de factures. */
	readonly onOuvrir: (debiteurId: string) => void;
	readonly onFermer: () => void;
	/** Le volet de preuve, tel que `DetailDebiteur` le reçoit. */
	readonly detail: ComponentProps<typeof DetailDebiteur>;
}

export function EcranDebiteurs({ donnees }: { donnees: Lecture<DebiteursAffiches> }) {
	if (donnees.etat !== 'pret') {
		// `disposition="volets"` : l'attente se dessine déjà en deux volets. Voir `PageEcran`.
		return (
			<PageEcran
				entete={{ genre: 'onglet', titre: 'Vos débiteurs' }}
				etat={donnees.etat}
				disposition="volets"
			/>
		);
	}

	const { debiteurs, choisi, onOuvrir, onFermer, detail } = donnees.valeur;

	if (debiteurs.length === 0) {
		return (
			<PageEcran
				entete={{ genre: 'onglet', titre: 'Vos débiteurs' }}
				etat={{
					vide: {
						illustration: '🧾',
						titre: 'Aucun débiteur pour l’instant',
						explication:
							'Les débiteurs apparaissent tout seuls quand vous importez vos factures : le logiciel les rapproche par leur raison sociale, quelle que soit la graphie.',
						etapes: [
							'Importez un export comptable ou vos factures de vente.',
							'Le logiciel crée un débiteur par client et calcule son encours.',
							'Sélectionnez les factures d’un même débiteur pour en faire une créance.'
						],
						action: (
							<BoutonPrincipal as={Link} to="/app/import-factures">
								<UploadIcon />
								Importer mes factures
							</BoutonPrincipal>
						)
					}
				}}
			/>
		);
	}

	/**
	 * (le commentaire des lignes 450 à 471 : « LA LISTE DES DÉBITEURS », à l'identique)
	 */
	const liste = (
		// les lignes 473 à 524 de la route, à l'identique, sauf le `onClick` du
		// `ListButton`, qui devient `onClick={() => onOuvrir(debiteur._id)}`
	);

	/**
	 * (le commentaire des lignes 527 à 534 : « LE VOLET DE PREUVE », à l'identique)
	 */
	return (
		<PageEcran
			entete={{ genre: 'onglet', titre: 'Vos débiteurs', sousTitre: 'Le plus gros encours d’abord' }}
			volets={{
				liste,
				preuve: <DetailDebiteur {...detail} />,
				preuveOuverte: choisi !== null,
				onFermerPreuve: onFermer
			}}
		/>
	);
}
```

`const liste = (…)` reçoit le `<div className="flex flex-col gap-cladd-3xs p-cladd-3xs">` des lignes 473 à 524 : le commentaire ci-dessus décrit où il vient, il ne reste pas dans le code.

- [ ] **Step 2 : la route des débiteurs**

Dans `src/routes/app/debiteurs.tsx` :

1. Les lignes 1 à 411 restent (tables de secteurs, `Route`, requêtes, états, gestionnaires), à ceci près : `Route` gagne `errorComponent: DebiteursEnErreur`, et les imports de `'../../ui'` perdent `BoutonPrincipal, Page, PageHeader, TwoPane, EmptyState, eurosCentimes, Avatar, CarteListe` ; ceux de Cladd, de `lucide-react` et `DetailDebiteur` partent aussi. `Link` quitte l'import du routeur.
2. Ajouter :

```tsx
function DebiteursEnErreur() {
	return <EcranDebiteurs donnees={{ etat: 'erreur' }} />;
}
```

3. Les lignes 413 à 585 (les deux `if` et tout ce qui suit) deviennent :

```tsx
	return (
		<EcranDebiteurs
			donnees={
				debiteurs === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								debiteurs,
								choisi,
								onOuvrir: (id) => {
									setChoisi(id as Id<'debiteurs'>);
									setSelection(new Set());
								},
								onFermer: () => setChoisi(null),
								detail: {
									debiteurId: choisi ?? '',
									denomination: debiteurChoisi?.denomination ?? '',
									etatRecherche: recherche,
									onChercherAuRegistre: () => void chercherAuRegistreDuDebiteur(),
									onRetenirEtablissement: (etablissement) =>
										void retenirEtablissement(etablissement),
									debiteur: choisi === null || debiteurChoisi === undefined ? null : debiteurChoisi,
									factures: choisi === null || factures === undefined ? null : factures,
									// (le commentaire des lignes 544 à 546, à l'identique)
									creances: (creances ?? []).filter((creance) => creance.debiteurId === choisi),
									optionsSecteur: SECTEURS,
									erreurSiren,
									tauxStipule,
									constatTaux,
									pieces: pieces ?? [],
									habitude: comportement?.habitude ?? null,
									ruptures: comportement?.ruptures ?? [],
									propositionLettrage: proposition ?? null,
									lettrageEnCours: montantCherche !== null && proposition === undefined,
									erreurLettrage,
									selection,
									erreur,
									onEnregistrerSiren: (saisi) => void enregistrerSiren(saisi),
									onChoisirSecteur: (cle) => {
										if (choisi === null) return;
										void renseignerSecteur({ debiteurId: choisi, secteur: cle as 'GENERAL' });
									},
									onEnregistrerTaux: (p) => void enregistrerTaux(p),
									onChercherLettrage: chercherLettrage,
									onAppliquerLettrage: (references, total) =>
										void soldeLesFactures(references, total),
									onBasculerFacture: basculer,
									onConstituer: () => void constituer()
								}
							}
						}
			}
		/>
	);
```

Ce sont les props du `<DetailDebiteur … />` des lignes 536 à 570, écrites en objet, sans en changer une seule valeur.

**Une seule exception, par la règle 3 des correctifs de la revue de la tâche 4.** Relevé au code le 14/09/2026 : `pieces: pieces ?? []` fait lire « Aucune » à la rangée « Les pièces du dossier » tant que les pièces se lisent (`src/screens/debiteur-detail.tsx`, ligne 309), une affirmation fausse. La fiche attend déjà les factures (`debiteur === null || factures === null`, ligne 196). Elle attend donc aussi les pièces : `factures: choisi === null || factures === undefined || pieces === undefined ? null : factures`, avec un commentaire d'une ligne qui dit pourquoi. Les autres replis (`habitude ?? null`, `ruptures ?? []`, `creances ?? []`) masquent une rangée au lieu de la fausser : ils restent.

- [ ] **Step 3 : l'habitude**

`src/screens/debiteur/habitude.tsx` :

```tsx
import {
	HabitudePaiement,
	PageEcran,
	type HabitudeAffichee,
	type Lecture,
	type RuptureAffichee
} from '../../ui';

/**
 * (le commentaire des lignes 9 à 21 de la route, à l'identique)
 */
export interface HabitudeDuDebiteur {
	/** Le nom, une fois la liste des débiteurs arrivée ; `null` avant. */
	readonly denomination: string | null;
	readonly habitude: HabitudeAffichee;
	readonly ruptures: readonly RuptureAffichee[];
}

export function EcranHabitude({
	identifiant,
	donnees
}: {
	identifiant: string;
	donnees: Lecture<HabitudeDuDebiteur>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					vers: '/app/debiteurs',
					recherche: { d: identifiant },
					libelle: pret?.denomination ?? 'Débiteurs'
				},
				titre: 'Comment il paie d’habitude'
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<HabitudePaiement habitude={pret.habitude} ruptures={pret.ruptures} />
			)}
		</PageEcran>
	);
}
```

Route `debiteurs_.$id.habitude.tsx` : `errorComponent: HabitudeEnErreur` (qui rend `<EcranHabitude identifiant={id} donnees={{ etat: 'erreur' }} />`), les requêtes des lignes 23 à 32 restent, et le `return` devient :

```tsx
	return (
		<EcranHabitude
			identifiant={id}
			donnees={
				comportement === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								denomination: debiteur?.denomination ?? null,
								habitude: comportement.habitude,
								ruptures: comportement.ruptures
							}
						}
			}
		/>
	);
```

- [ ] **Step 4 : les pièces**

`src/screens/debiteur/pieces.tsx` :

```tsx
import { PageEcran, Pieces, type Lecture, type PieceAffichee } from '../../ui';
import { TYPES_PIECE } from '../debiteur-detail';

/**
 * (le commentaire des lignes 11 à 22 de la route, à l'identique)
 */
export interface PiecesDuDebiteur {
	readonly denomination: string | null;
	readonly pieces: readonly PieceAffichee[];
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onDeposer: (fichiers: File[]) => void;
	readonly onClasser: (pieceId: string, type: string) => void;
	readonly onRetirer: (pieceId: string) => void;
}

export function EcranPieces({
	identifiant,
	donnees
}: {
	identifiant: string;
	donnees: Lecture<PiecesDuDebiteur>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					vers: '/app/debiteurs',
					recherche: { d: identifiant },
					libelle: pret?.denomination ?? 'Débiteurs'
				},
				titre: 'Les pièces du dossier',
				sousTitre:
					pret === null
						? undefined
						: `${pret.pieces.length} document${pret.pieces.length > 1 ? 's' : ''}`
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<>
					<Pieces
						pieces={pret.pieces}
						optionsType={TYPES_PIECE}
						enCours={pret.enCours}
						onDeposer={pret.onDeposer}
						onClasser={pret.onClasser}
						onRetirer={pret.onRetirer}
					/>
					{pret.erreur ? <p className="text-cladd-xs text-cladd-fg">{pret.erreur}</p> : null}
				</>
			)}
		</PageEcran>
	);
}
```

Route `debiteurs_.$id.pieces.tsx` : `errorComponent: PiecesEnErreur`, les lignes 24 à 73 restent (`deposerPieces` compris), l'import de `TYPES_PIECE` part, et le `return` devient :

```tsx
	return (
		<EcranPieces
			identifiant={id}
			donnees={
				pieces === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								denomination: debiteur?.denomination ?? null,
								pieces,
								enCours,
								erreur,
								onDeposer: (fichiers) => void deposerPieces(fichiers),
								onClasser: (pieceId, type) => {
									void classerPiece({
										pieceId: pieceId as Id<'pieces'>,
										type: type as 'BON_DE_LIVRAISON'
									});
								},
								onRetirer: (pieceId) => void retirerPiece({ pieceId: pieceId as Id<'pieces'> })
							}
						}
			}
		/>
	);
```

La page attend désormais la liste des pièces : elle affichait « 0 document » implicite et une liste vide le temps de l'aller-retour.

- [ ] **Step 5 : la salle**

1. Créer `src/routes/-salle/debiteurs.tsx` (tableau `ECRANS_DEBITEURS`, à réunir dans `ecrans.tsx`) et y déplacer les données de `DemoDebiteurDetail`, `DemoHabitude` (`HABITUDE_DEMO`) et `DemoPieces` (les pièces). `SECTEURS_DEMO`, que `DemoIdentite` utilise aussi, va dans `communes.ts`.

   **Ces données se calculent** (voir « Correctifs de la revue de la tâche 3 »). Relevé au code le 14/09/2026, au commit `8a5f840` :
   - **Les secteurs portent des valeurs juridiques.** `SECTEURS_DEMO` recopie « Prescription : 5 ans », « 1 an », « 2 ans » : une seconde vérité sur `REGIMES_PRESCRIPTION`, que la règle la plus stricte du projet interdit, salle comprise. `LIBELLE_SECTEUR` et `optionsSecteur()` (lignes 31 à 75 de `src/routes/app/debiteurs.tsx`, avec leur commentaire) descendent dans `src/screens/debiteur-detail.tsx`, exportés à côté de `TYPES_PIECE`. La route les importe et garde son appel ; `communes.ts` écrit `export const SECTEURS_DEMO = optionsSecteur();`.
   - **Les types de pièce** : `TYPES_PIECE_DEMO` disparaît. La salle importe `TYPES_PIECE` de `src/screens/debiteur-detail.tsx`, comme l'écran des pièces.
   - **L'habitude** : `HABITUDE_DEMO` se calcule par `habitudeDePaiement(PAIEMENTS_DEMO)` (`src/lib/verticales/recouvrement/comportement.ts`), sur au moins `ECHANTILLON_MINIMAL` paiements observés (`{ reference, dateExigibilite, datePaiement }`), choisis pour donner une habitude connue.
   - **Les ruptures** se calculent par `lireRupture(habitude, retardJours)`, filtrées et transformées comme `lireComportement` le fait (`src/lib/convex/recouvrement/comportement.ts`, lignes 132 à 158 : seules les lectures `RUPTURE`, triées par écart décroissant), depuis un `aujourdHui` figé.
   - **Le constat du taux** est ce que `poserLeTaux` rend (`src/lib/convex/recouvrement/tauxContractuel.ts`, lignes 62 à 135) pour des factures non soldées, c'est-à-dire le constat de `controlerTauxContractuel(tauxDepuisPourcentage(taux), jour)`. `DemoDebiteurDetail` écrit « … au-dessus du plancher de 10,26 % constaté au 2026-03-15 » : une valeur juridique recopiée.
   - **Les factures de la fiche** : `datePrescription` par `prescriptionDe([dateExigibilite, dateEcheance], secteur).datePrescription`, `dansUneCreance` par le rattachement à une créance, comme `listerFacturesDuDebiteur` (`src/lib/convex/recouvrement/lecture.ts`, lignes 198 à 226).
   - **Les créances du débiteur** : `principalRestantDu` et `nombreFactures` tirés des factures qui leur sont rattachées, comme `listerCreances` (même fichier, vers les lignes 700 à 724). `DemoDebiteurDetail` montre aujourd'hui une créance de deux factures pour 12 000,00 € qu'aucune de ses factures ne compose.
   - **Les rangées de la liste** : `encours` et `facturesEchues` tirés des factures non soldées de chaque débiteur, comme `listerDebiteurs` (même fichier, lignes 136 à 178).
   - **Les noms** : les débiteurs de la famille portent des noms qu'aucune autre famille n'emploie (règle 1 des correctifs de la revue de la tâche 4). Dans le tableau ci-dessous, « celui de `DemoDebiteurDetail` » désigne sa forme, pas son nom.
   - Une donnée qu'aucune fonction du domaine ne produit (un encours, une dénomination) reste écrite ; une donnée que le serveur calcule sans fonction exportée porte un commentaire qui cite la ligne du produit qu'elle reproduit.
2. Supprimer `DemoDebiteurDetail`, `DemoHabitude`, `DemoPieces`, leurs clés (`'debiteur'`, `'habitude'`, `'pieces'`) et leurs lignes de rendu. `DemoLettrage` et `DemoIdentite` restent : ce sont des démos de composants.
3. Ajouter à `ECRANS_DEBITEURS` :

| `route` | `libelle` | `vide` | Démo |
| --- | --- | --- | --- |
| `/app/debiteurs` | `débiteurs` | oui | `DebiteursDemo({ etat })`, qui tient `choisi` et la sélection dans des `useState` ; Prêt : trois débiteurs dont celui de `DemoDebiteurDetail`, ouvert d'emblée, avec le `detail` de cette démo ; Vide : `debiteurs: []` |
| `/app/debiteurs_/$id/habitude` | `habitude` | non | `denomination: 'Fournitures Durand'`, `HABITUDE_DEMO` |
| `/app/debiteurs_/$id/pieces` | `pièces` | oui | les pièces de `DemoPieces` ; Vide : `pieces: []` |

- [ ] **Step 6 : vérifier**

```bash
grep -nE "<Page|<EnteteDetail|sr-only\">Chargement" src/routes/app/debiteurs.tsx src/routes/app/debiteurs_.\$id.habitude.tsx src/routes/app/debiteurs_.\$id.pieces.tsx
bunx prettier --write src/screens/debiteurs.tsx src/screens/debiteur src/routes/app/debiteurs.tsx src/routes/app/debiteurs_.\$id.habitude.tsx src/routes/app/debiteurs_.\$id.pieces.tsx src/routes/-salle src/routes/showroom.tsx
bun run test:unit
bun run check
bun run lint
```

Attendu : le `grep` ne sort rien, les trois commandes sont vertes.

- [ ] **Step 7 : regarder (règle commune n° 10)**. À 1280 px, la liste et la fiche côte à côte ; à 375 px, la fiche en feuille, qui se referme.

- [ ] **Step 8 : committer**

```bash
git add src/screens/debiteurs.tsx src/screens/debiteur
git commit --no-verify -m "feat(debiteurs): la liste, l'habitude et les pieces passent dans la coquille" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -- src/screens/debiteurs.tsx src/screens/debiteur src/routes/app/debiteurs.tsx "src/routes/app/debiteurs_.\$id.habitude.tsx" "src/routes/app/debiteurs_.\$id.pieces.tsx" src/routes/-salle src/routes/showroom.tsx
```

---

## Tâche 6 : les réglages et l'abonnement

**Files:**
- Create: `src/screens/sans-etablissement.tsx`
- Create: `src/screens/parametres/reglages.tsx`
- Create: `src/screens/abonnement/abonnement.tsx`, `premier-bilan.tsx`, `suivi.tsx`
- Modify: `src/screens/parametres/creancier.tsx`, `src/screens/parametres/etablissement.tsx` (ajout d'un écran à chacun)
- Modify: `src/routes/app/parametres.tsx`, `parametres_.creancier.tsx`, `parametres_.etablissement.tsx`, `abonnement.tsx`, `abonnement_.premier-bilan.tsx`, `abonnement_.suivi.tsx`
- Modify: le fichier de la famille dans `src/routes/-salle/` (voir « Correctifs de la revue de la tâche 2 »), `src/routes/-salle/communes.ts` pour les données partagées avec les démos de composants, `src/routes/-salle/ecrans.tsx` si la famille est neuve, `src/routes/showroom.tsx`

- [ ] **Step 1 : le vide « aucun établissement »**

`src/screens/sans-etablissement.tsx` :

```tsx
import { Link } from '@tanstack/react-router';
import { BoutonPrincipal, type VideEcran } from '../ui';

/**
 * AUCUN ÉTABLISSEMENT ACTIF.
 *
 * ⚠️ PRESQUE INATTEIGNABLE, ET C'EST POUR ÇA QU'IL DOIT ÊTRE JUSTE. La coquille
 * authentifiée envoie déjà un compte sans établissement vers `/bienvenue`. Cet
 * état ne survient que si l'établissement disparaît pendant la session : il
 * s'affichait alors en paragraphe sans issue, ou en « Chargement… » éternel.
 *
 * Il mène là où un établissement se crée.
 */
export function sansEtablissement(explication: string): { readonly vide: VideEcran } {
	return {
		vide: {
			illustration: '🏢',
			titre: 'Aucun établissement actif',
			explication,
			action: (
				<BoutonPrincipal as={Link} to="/bienvenue">
					Créer votre entreprise
				</BoutonPrincipal>
			)
		}
	};
}
```

- [ ] **Step 2 : l'écran des réglages**

`src/screens/parametres/reglages.tsx` contient :

1. `AILLEURS` et son commentaire (lignes 28 à 54 de la route), et `Reglage` avec le sien (lignes 58 à 80), à l'identique.
2. L'écran :

```tsx
export interface ReglagesAffiches {
	/** L'établissement actif, ou `null`. */
	readonly org: { readonly name?: string; readonly siret?: string } | null;
	/** `undefined` tant que le profil se lit : la rangée montre alors un tiret, sans reproche. */
	readonly profil: { readonly siren?: string; readonly estCommercant?: EtatCritere } | null | undefined;
	readonly theme: Theme;
	readonly onChoisirTheme: (theme: Theme) => void;
	readonly onSeDeconnecter: () => void;
}

export function EcranReglages({ donnees }: { donnees: Lecture<ReglagesAffiches> }) {
	if (donnees.etat !== 'pret') {
		return <PageEcran entete={{ genre: 'onglet', titre: 'Réglages' }} etat={donnees.etat} />;
	}

	const { org, profil, theme, onChoisirTheme, onSeDeconnecter } = donnees.valeur;

	return (
		<PageEcran
			entete={{ genre: 'onglet', titre: 'Réglages', sousTitre: 'Votre établissement et votre compte.' }}
		>
			<div className="flex flex-col gap-cladd-2xs">
				{/* les lignes 104 à 228 de la route, à l'identique, avec :
				    `setTheme('dark')` → `onChoisirTheme('dark')` ;
				    `setTheme('light')` → `onChoisirTheme('light')` ;
				    le `onClick` du bouton « Se déconnecter » → `onClick={onSeDeconnecter}` */}
			</div>
		</PageEcran>
	);
}
```

Imports : `ReactNode` ; `Link` ; de Cladd `Button, ListButton, Surface, SectionTitle, Segmented, SegmentedButton` ; de `lucide-react` les neuf icônes de la route ; `type Theme` de `'../../app/use-theme'` ; de `'../../ui'` `CarteListe, LigneAnalyse, ListeAnalyses, PageEcran, type Lecture` ; `type EtatCritere` de `'./creancier'`.

La colonne `max-w-160` de la ligne 103 rejoint la largeur de la coquille (décision D5).

Route `parametres.tsx`, en entier :

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { authClient } from '../../lib/client/auth';
import { useTheme } from '../../app/use-theme';
import { EcranReglages } from '../../screens/parametres/reglages';

export const Route = createFileRoute('/app/parametres')({
	component: Parametres,
	errorComponent: ReglagesEnErreur
});

function ReglagesEnErreur() {
	return <EcranReglages donnees={{ etat: 'erreur' }} />;
}

/** Les réglages, branchés sur la base ; le dessin vit dans `screens/parametres/reglages.tsx`. */
function Parametres() {
	const navigate = useNavigate();
	const org = useQuery(api.organizations.getMyOrg, {});
	const profil = useQuery(api.recouvrement.profil.monProfil, {});
	const { theme, setTheme } = useTheme();

	return (
		<EcranReglages
			donnees={
				org === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								org,
								profil,
								theme,
								onChoisirTheme: setTheme,
								onSeDeconnecter: () =>
									void authClient.signOut().then(() => navigate({ to: '/connexion' }))
							}
						}
			}
		/>
	);
}
```

- [ ] **Step 3 : le créancier et l'établissement**

À la fin de `src/screens/parametres/creancier.tsx`, ajouter (imports : `ComponentProps` de React, `PageEcran` et `type Lecture` de `'../../ui'`) :

```tsx
export interface CreancierAffiche {
	readonly initial: ComponentProps<typeof FormulaireCreancier>['initial'];
	/** Remonte le formulaire quand le serveur change la dénomination. Voir la route. */
	readonly cle: string;
	readonly onEnregistrer: ComponentProps<typeof FormulaireCreancier>['onEnregistrer'];
}

export function EcranCreancier({ donnees }: { donnees: Lecture<CreancierAffiche> }) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: { vers: '/app/parametres', libelle: 'Réglages' },
				titre: 'Votre entreprise sur un décompte',
				sousTitre: 'Ce qui sera cité sur les pièces qui partent chez un tiers.'
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<FormulaireCreancier key={pret.cle} initial={pret.initial} onEnregistrer={pret.onEnregistrer} />
			)}
		</PageEcran>
	);
}
```

Route `parametres_.creancier.tsx` : `errorComponent: CreancierEnErreur` ; le commentaire de tête (lignes 9 à 21) reste, il parle de la `key` que la route choisit ; le `return` devient :

```tsx
	return (
		<EcranCreancier
			donnees={
				profil === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								cle: profil?.denomination ?? 'vide',
								initial: {
									denomination: profil?.denomination ?? org?.name ?? '',
									siren: profil?.siren ?? '',
									adresse: profil?.adresse ?? '',
									estCommercant: profil?.estCommercant ?? 'unknown'
								},
								onEnregistrer: enregistrer
							}
						}
			}
		/>
	);
```

À la fin de `src/screens/parametres/etablissement.tsx`, ajouter (imports : `ComponentProps`, `PageEcran`, `type Lecture`, et `sansEtablissement` de `'../sans-etablissement'`) :

```tsx
export interface EtablissementAffiche {
	readonly nom: string | undefined;
	readonly initial: ComponentProps<typeof FormulaireEtablissement>['initial'];
	/** L'identifiant de l'établissement : il remonte le formulaire quand on en change. */
	readonly cle: string;
	readonly onEnregistrer: ComponentProps<typeof FormulaireEtablissement>['onEnregistrer'];
}

export function EcranEtablissement({ donnees }: { donnees: Lecture<EtablissementAffiche | null> }) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: { vers: '/app/parametres', libelle: 'Réglages' },
				titre: 'Votre établissement',
				sousTitre: pret?.nom
			}}
			etat={
				donnees.etat === 'pret' && pret === null
					? sansEtablissement('Créez-en un pour le régler.')
					: donnees.etat
			}
		>
			{pret === null ? null : (
				<FormulaireEtablissement key={pret.cle} initial={pret.initial} onEnregistrer={pret.onEnregistrer} />
			)}
		</PageEcran>
	);
}
```

Route `parametres_.etablissement.tsx` : `errorComponent: EtablissementEnErreur` ; le commentaire de tête reste ; le `return` devient :

```tsx
	return (
		<EcranEtablissement
			donnees={
				org === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur:
								org === null
									? null
									: {
											nom: org.name ?? undefined,
											cle: org._id,
											initial: {
												nom: org.name ?? '',
												factures: org.facturesParAn ? String(org.facturesParAn) : '',
												siret: org.siret ?? ''
											},
											onEnregistrer: mettreAJour
										}
						}
			}
		/>
	);
```

- [ ] **Step 4 : l'abonnement**

`src/screens/abonnement/abonnement.tsx` contient le commentaire de tête de la route (lignes 19 à 39), `EtatCourant` (lignes 141 à 182) à l'identique, et :

```tsx
export interface AbonnementAffiche {
	readonly tier: string;
	readonly isDev: boolean;
	readonly palier: PalierTaille;
	readonly bornesPalier: string;
	readonly facturesParAn: number | null;
	readonly tarifs: { readonly bilan: number; readonly abonnementMensuel: number };
	readonly seatsAllowed: number;
	readonly paddleStatus: string | null;
	readonly paddleConfigure: boolean;
	readonly essaiFiniLe: number | null;
}

export function EcranAbonnement({ donnees }: { donnees: Lecture<AbonnementAffiche | null> }) {
	if (donnees.etat !== 'pret') {
		return <PageEcran entete={{ genre: 'onglet', titre: 'Abonnement' }} etat={donnees.etat} />;
	}

	const etat = donnees.valeur;
	if (etat === null) {
		return (
			<PageEcran
				entete={{ genre: 'onglet', titre: 'Abonnement' }}
				etat={sansEtablissement('Créez-en un pour voir votre offre.')}
			/>
		);
	}

	const abonne = etat.paddleStatus === 'active' || etat.paddleStatus === 'trialing';

	return (
		<PageEcran
			entete={{
				genre: 'onglet',
				titre: 'Abonnement',
				sousTitre: 'Votre offre, calculée sur la taille de votre établissement.'
			}}
		>
			<div className="flex flex-col gap-cladd-2xs">
				{/* les lignes 77 à 134 de la route, à l'identique */}
			</div>
		</PageEcran>
	);
}
```

Imports : `Link` ; `Surface, Chip` ; `FileSearchIcon, RefreshCwIcon` ; de `'../../ui'` `LigneAnalyse, ListeAnalyses, PageEcran, SectionEcran, euros, type Lecture` ; `OuvertureEnCours, EssaiEnCours` de `'./offre'` ; `type PalierTaille` de `'../../lib/config/tarifs'` ; `sansEtablissement` de `'../sans-etablissement'`.

`src/screens/abonnement/premier-bilan.tsx` :

```tsx
import { PageEcran, euros, type Lecture } from '../../ui';
import { sansEtablissement } from '../sans-etablissement';
import type { AbonnementAffiche } from './abonnement';
import { Offre } from './offre';

/**
 * (le commentaire des lignes 9 à 20 de la route, à l'identique)
 */
export function EcranPremierBilan({ donnees }: { donnees: Lecture<AbonnementAffiche | null> }) {
	const etat = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: { vers: '/app/abonnement', libelle: 'Abonnement' },
				titre: 'Le premier bilan',
				sousTitre: etat ? `Palier ${etat.palier} — ${etat.bornesPalier}` : undefined
			}}
			etat={
				donnees.etat === 'pret' && etat === null
					? sansEtablissement('Créez-en un pour voir votre offre.')
					: donnees.etat
			}
		>
			{etat === null ? null : (
				<Offre
					titre="Le premier bilan"
					prix={euros(etat.tarifs.bilan)}
					cadence="une fois"
					description="Douze mois de factures lus en une fois. Vous saurez où vous en êtes, et ce qu’il manque, en euros."
					colonne="bilan"
					actif={etat.tier === 'suivi'}
				/>
			)}
		</PageEcran>
	);
}
```

`src/screens/abonnement/suivi.tsx` : `EcranSuiviOffre`, même forme, avec le commentaire des lignes 9 à 15 de sa route, `titre: 'L’abonnement'`, et l'`Offre` des lignes 32 à 40 (`prix={euros(etat.tarifs.abonnementMensuel)}`, `cadence="par mois"`, sa description, `colonne="abonnement"`, `actif={etat.tier === 'procedures'}`, `recommande`).

Le « — » des deux sous-titres est du texte existant (décision D9) : il ne change pas ici.

Les trois routes d'abonnement lisent `const etat = useQuery(api.billing.etatAbonnement, {});`, déclarent leur `errorComponent`, et rendent :

```tsx
	return <EcranAbonnement donnees={etat === undefined ? { etat: 'attente' } : { etat: 'pret', valeur: etat }} />;
```

(`EcranPremierBilan` et `EcranSuiviOffre` pour les deux autres.) `abonnement_.premier-bilan` et `abonnement_.suivi` montraient « Chargement… » pour toujours quand `etat` valait `null` : c'est maintenant le vide.

- [ ] **Step 5 : la salle**

1. Supprimer `DemoCreancier` et `DemoAbonnement`, leurs clés (`'creancier'`, `'abonnement'`) et leurs lignes de rendu ; retirer les imports devenus inutiles (`Offre`, `OuvertureEnCours`, `EssaiEnCours`, `PALIERS`, `BORNES_PALIER`, `TARIFS`, `FormulaireCreancier`, `FIN_ESSAI_DEMO` s'il ne sert plus).
2. Créer `src/routes/-salle/reglages.tsx` (tableau `ECRANS_REGLAGES`, à réunir dans `ecrans.tsx`) avec un `ABONNEMENT_DEMO: AbonnementAffiche` : palier `'M'`, `bornesPalier: BORNES_PALIER.M`, `tarifs: TARIFS.M`, `facturesParAn: 420`, `tier: 'aucun'`, `isDev: false`, `seatsAllowed: 3`, `paddleStatus: null`, `paddleConfigure: false`, `essaiFiniLe` à douze jours.

   **Amendements du 14/09, relevés au code. Ils l'emportent sur la ligne ci-dessus, sur le tableau qui suit et sur le code de l'étape 3.**
   - **Le palier se calcule** comme `etatAbonnement` le fait (`src/lib/convex/billing.ts`, lignes 223 à 231) : `palier: palierDeTaille(facturesParAn)`, puis `bornesPalier: BORNES_PALIER[palier]` et `tarifs: TARIFS[palier]`. Seul `facturesParAn` reste écrit.
   - **L'établissement de la salle est UN, et ce n'est pas un débiteur.** Le tableau le nomme « Fournitures Durand », qui est le débiteur de la famille créance : la salle montrerait le client du gérant comme sa propre entreprise. L'établissement est le créancier que la famille créance nomme déjà (`CREANCIER_DEMO`, « Thumbbb Agency »). Le déclarer une fois dans `src/routes/-salle/communes.ts` (`ETABLISSEMENT_DEMO` : nom, SIREN, adresse, qualité de commerçant, factures par an), et le faire importer par `creance.tsx` et par la famille des réglages. Le profil du créancier (`DemoCreancier`) en reprend les valeurs.
   - **La page du créancier attend aussi l'établissement** (règle 3 des correctifs de la revue de la tâche 4). Sa dénomination initiale se replie sur `org?.name` : si le profil arrive avant l'établissement, le formulaire part vide, et sa `key` (la dénomination du profil) ne le remonte pas quand l'établissement arrive. La condition d'attente du `return` de `parametres_.creancier.tsx` est donc `org === undefined || profil === undefined`, et non `profil === undefined` seul.
3. Ajouter à `ECRANS_REGLAGES` :

| `route` | `libelle` | `vide` | Prêt | Vide |
| --- | --- | --- | --- | --- |
| `/app/parametres` | `réglages` | non | `org: { name: 'Fournitures Durand', siret: undefined }`, `profil: { siren: undefined, estCommercant: 'unknown' }`, un thème tenu par `useState` | |
| `/app/parametres_/creancier` | `créancier` | non | l'`initial` de `DemoCreancier` | |
| `/app/parametres_/etablissement` | `établissement` | oui | `nom: 'Fournitures Durand'`, `initial: { nom: 'Fournitures Durand', factures: '420', siret: '' }` | `null` |
| `/app/abonnement` | `abonnement` | oui | `ABONNEMENT_DEMO` | `null` |
| `/app/abonnement_/premier-bilan` | `premier bilan` | oui | `ABONNEMENT_DEMO` | `null` |
| `/app/abonnement_/suivi` | `offre suivi` | oui | `ABONNEMENT_DEMO` | `null` |

Les `onEnregistrer` de la salle rendent `Promise.resolve()`.

- [ ] **Step 6 : vérifier**

```bash
grep -nE "<Page|<EnteteDetail|sr-only\">Chargement" src/routes/app/parametres.tsx src/routes/app/parametres_.creancier.tsx src/routes/app/parametres_.etablissement.tsx src/routes/app/abonnement.tsx src/routes/app/abonnement_.premier-bilan.tsx src/routes/app/abonnement_.suivi.tsx
bunx prettier --write src/screens/sans-etablissement.tsx src/screens/parametres src/screens/abonnement src/routes/app/parametres.tsx src/routes/app/parametres_.creancier.tsx src/routes/app/parametres_.etablissement.tsx src/routes/app/abonnement.tsx src/routes/app/abonnement_.premier-bilan.tsx src/routes/app/abonnement_.suivi.tsx src/routes/-salle src/routes/showroom.tsx
bun run test:unit
bun run check
bun run lint
```

Attendu : le `grep` ne sort rien, les trois commandes sont vertes.

- [ ] **Step 7 : regarder (règle commune n° 10)** les six écrans. Sur l'abonnement, la colonne est désormais centrée comme les autres.

- [ ] **Step 8 : committer**

```bash
git add src/screens/sans-etablissement.tsx src/screens/parametres/reglages.tsx src/screens/abonnement/abonnement.tsx src/screens/abonnement/premier-bilan.tsx src/screens/abonnement/suivi.tsx
git commit --no-verify -m "feat(reglages): les reglages et l'abonnement passent dans la coquille, et l'etablissement absent mene quelque part" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -- src/screens/sans-etablissement.tsx src/screens/parametres src/screens/abonnement src/routes/app/parametres.tsx src/routes/app/parametres_.creancier.tsx src/routes/app/parametres_.etablissement.tsx src/routes/app/abonnement.tsx src/routes/app/abonnement_.premier-bilan.tsx src/routes/app/abonnement_.suivi.tsx src/routes/-salle src/routes/showroom.tsx
```

---

## Tâche 7 : l'équipe et vos données

**Files:**
- Create: `src/screens/equipe/inviter.tsx`, `src/screens/donnees/export.tsx`, `src/screens/donnees/supprimer-compte.tsx`, `src/screens/donnees/supprimer-etablissement.tsx`
- Modify: `src/screens/equipe/equipe.tsx`, `src/screens/donnees/donnees.tsx` (ajout d'un écran à chacun)
- Modify: `src/routes/app/equipe.tsx`, `equipe_.inviter.tsx`, `donnees.tsx`, `donnees_.export.tsx`, `donnees_.supprimer-compte.tsx`, `donnees_.supprimer-etablissement.tsx`
- Modify: le fichier de la famille dans `src/routes/-salle/` (voir « Correctifs de la revue de la tâche 2 »), `src/routes/-salle/communes.ts` pour les données partagées avec les démos de composants, `src/routes/-salle/ecrans.tsx` si la famille est neuve, `src/routes/showroom.tsx`

- [ ] **Step 1 : l'équipe**

À la fin de `src/screens/equipe/equipe.tsx`, ajouter (imports : `ComponentProps` de React, `PageEcran` et `type Lecture` de `'../../ui'`) :

```tsx
export function EcranEquipe({ donnees }: { donnees: Lecture<ComponentProps<typeof Equipe>> }) {
	return (
		<PageEcran
			entete={{
				genre: 'onglet',
				titre: 'Équipe',
				// ⚠️ « ET AUX CRÉANCES », PLUS « ET AUX TAUX ». Le sous-titre parlait
				// encore la langue d'EGalim, que la salle d'exposition avait déjà
				// corrigée de son côté.
				sousTitre: 'Qui accède aux factures et aux créances de cet établissement.'
			}}
			etat={donnees.etat}
		>
			{donnees.etat === 'pret' ? <Equipe {...donnees.valeur} /> : null}
		</PageEcran>
	);
}
```

Route `equipe.tsx` : `errorComponent: EquipeEnErreur` ; les requêtes, les mutations, `versMembre` et `versInvitation` restent ; le `return` des lignes 43 à 77 devient :

```tsx
	return (
		<EcranEquipe
			donnees={
				enAttente
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								membres: membres.map(versMembre),
								invitations: invitations.map(versInvitation),
								estAdmin: monRole?.role === 'ORG_ADMIN',
								siegesUtilises: membres.length,
								siegesAutorises: facturation?.seatsAllowed ?? membres.length,
								// les quatre gestionnaires des lignes 59 à 72, à l'identique,
								// écrits `onChangerRole: async (membreId, role) => { … }`, etc.
							}
						}
			}
		/>
	);
```

- [ ] **Step 2 : inviter**

`src/screens/equipe/inviter.tsx` :

```tsx
import { PageEcran, type Lecture } from '../../ui';
import { FormulaireInvitation, type RoleEquipe } from './equipe';

/**
 * (le commentaire des lignes 9 à 29 de la route, à l'identique)
 */
export interface InvitationAffichee {
	readonly estAdmin: boolean;
	/** Plus aucune place : invitations en attente comprises. */
	readonly complet: boolean;
	readonly places: number;
	readonly onInviter: (email: string, role: RoleEquipe) => Promise<void>;
}

export function EcranInviter({ donnees }: { donnees: Lecture<InvitationAffichee> }) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: { vers: '/app/equipe', libelle: 'Votre équipe' },
				titre: 'Inviter un collègue',
				sousTitre: 'Il recevra un lien valable sept jours, et créera son mot de passe lui-même.'
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : pret.estAdmin ? (
				<FormulaireInvitation onInviter={pret.onInviter} complet={pret.complet} places={pret.places} />
			) : (
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Seul un administrateur de l’établissement peut inviter quelqu’un. Demandez-le à l’une des
					personnes marquées « Administrateur » sur l’écran précédent.
				</p>
			)}
		</PageEcran>
	);
}
```

Route `equipe_.inviter.tsx` : `errorComponent: InviterEnErreur` ; les lignes 31 à 41 restent ; le `return` devient :

```tsx
	return (
		<EcranInviter
			donnees={
				chargement
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								estAdmin,
								complet: siegesUtilises + enAttente >= siegesAutorises,
								places: siegesAutorises,
								onInviter: async (email, role) => {
									await inviter({ email, role });
								}
							}
						}
			}
		/>
	);
```

- [ ] **Step 3 : vos données**

À la fin de `src/screens/donnees/donnees.tsx`, ajouter (imports : `PageEcran` et `type Lecture` de `'../../ui'`, `sansEtablissement` de `'../sans-etablissement'`) :

```tsx
export function EcranDonnees({ donnees }: { donnees: Lecture<ApercuDonnees | null> }) {
	const apercu = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'onglet',
				titre: 'Vos données',
				sousTitre:
					apercu === null
						? undefined
						: 'Ce que nous détenons, ce que vous pouvez en emporter, ce que vous pouvez en effacer.'
			}}
			etat={
				donnees.etat === 'pret' && apercu === null
					? sansEtablissement('Créez-en un pour voir ce que nous détenons.')
					: donnees.etat
			}
		>
			{apercu === null ? null : <Donnees apercu={apercu} />}
		</PageEcran>
	);
}
```

Route `donnees.tsx` : `errorComponent: DonneesEnErreur` ; la fonction `EcranDonnees` de la route (ligne 26) se renomme `PageDonnees` (le nom passe à l'écran importé) ; son corps devient :

```tsx
	const apercu = useQuery(api.rgpd.apercuDeMesDonnees, {});
	return (
		<EcranDonnees
			donnees={apercu === undefined ? { etat: 'attente' } : { etat: 'pret', valeur: apercu }}
		/>
	);
```

- [ ] **Step 4 : emporter vos données**

`src/screens/donnees/export.tsx` :

```tsx
import { Button, Surface } from '@cladd-ui/react';
import { DownloadIcon } from 'lucide-react';
import { BoutonPrincipal, PageEcran, type Lecture } from '../../ui';
import { poids, type FichierExport } from './types';

const NOMBRE = new Intl.NumberFormat('fr-FR');

/**
 * (le commentaire des lignes 15 à 27 de la route, à l'identique)
 */
export interface ExportAffiche {
	/** Vrai quand un établissement existe et que la personne n'en est pas administratrice. */
	readonly reserveAAdmin: boolean;
	readonly fichier: FichierExport | null;
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onPreparer: () => void;
}

export function EcranExport({ donnees }: { donnees: Lecture<ExportAffiche> }) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: { vers: '/app/donnees', libelle: 'Vos données' },
				titre: 'Emporter vos données',
				sousTitre: 'Un fichier JSON, lisible par n’importe quel tableur ou logiciel'
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<div className="flex flex-col gap-cladd-2xs">
					{/* les lignes 58 à 112 de la route, à l'identique, avec :
					    `apercu !== undefined && apercu !== null && !apercu.estAdmin` → `pret.reserveAAdmin` ;
					    `erreur` → `pret.erreur` (deux) ;
					    `fichier` → `pret.fichier` (sept) ;
					    `enCours` → `pret.enCours` (trois) ;
					    `() => void preparer()` → `pret.onPreparer` */}
				</div>
			)}
		</PageEcran>
	);
}
```

Route `donnees_.export.tsx` : `errorComponent: ExportEnErreur` ; les lignes 29 à 46 restent ; `NOMBRE`, `poids`, `Button`, `Surface`, `DownloadIcon` quittent ses imports ; le `return` devient :

```tsx
	return (
		<EcranExport
			donnees={
				apercu === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								reserveAAdmin: apercu !== null && !apercu.estAdmin,
								fichier,
								enCours,
								erreur,
								onPreparer: () => void preparer()
							}
						}
			}
		/>
	);
```

- [ ] **Step 5 : supprimer mon compte**

`src/screens/donnees/supprimer-compte.tsx` :

```tsx
import { Button, Dialog, DialogRoot, DialogTrigger } from '@cladd-ui/react';
import { UserXIcon } from 'lucide-react';
import { PageEcran, type Lecture } from '../../ui';

/**
 * (le commentaire des lignes 15 à 28 de la route, à l'identique)
 */
export interface SuppressionDuCompte {
	/** L'adresse à saisir pour confirmer. Vide si le compte n'en porte pas. */
	readonly email: string;
	readonly erreur: string | null;
	readonly onConfirmer: () => void;
}

export function EcranSupprimerCompte({ donnees }: { donnees: Lecture<SuppressionDuCompte> }) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: { vers: '/app/donnees', libelle: 'Vos données' },
				titre: 'Supprimer mon compte',
				sousTitre: pret !== null && pret.email.length > 0 ? pret.email : undefined
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<div className="flex flex-col gap-cladd-2xs">
					{/* les lignes 47 à 88 de la route, à l'identique, avec :
					    `erreur` → `pret.erreur` (deux) ;
					    `email` → `pret.email` (trois) ;
					    le corps entier de `onConfirm={() => { … }}` → `onConfirm={pret.onConfirmer}` */}
				</div>
			)}
		</PageEcran>
	);
}
```

Route `donnees_.supprimer-compte.tsx` : `errorComponent: SupprimerCompteEnErreur` ; les lignes 30 à 35 restent ; le `return` devient :

```tsx
	return (
		<EcranSupprimerCompte
			donnees={
				compte === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								email,
								erreur,
								onConfirmer: () => {
									setErreur(null);
									void supprimer({ confirmation: email })
										.then(async () => {
											await authClient.signOut();
											await navigate({ to: '/' });
										})
										.catch((e: unknown) => setErreur(messageDErreur(e)));
								}
							}
						}
			}
		/>
	);
```

⚠️ Cette page attend désormais le compte. Elle s'affichait avant de connaître l'adresse : ouvrir la confirmation à ce moment-là demandait de saisir une chaîne vide.

- [ ] **Step 6 : supprimer l'établissement**

`src/screens/donnees/supprimer-etablissement.tsx` :

```tsx
import { Button, Dialog, DialogRoot, DialogTrigger } from '@cladd-ui/react';
import { TrashIcon } from 'lucide-react';
import { PageEcran, pluriel, type EnteteEcran, type Lecture } from '../../ui';
import type { ApercuDonnees } from './types';

const NOMBRE = new Intl.NumberFormat('fr-FR');

/**
 * (le commentaire des lignes 16 à 36 de la route, à l'identique)
 */
export interface SuppressionDeLEtablissement {
	readonly apercu: ApercuDonnees;
	readonly erreur: string | null;
	readonly onConfirmer: () => void;
}

export function EcranSupprimerEtablissement({
	donnees
}: {
	donnees: Lecture<SuppressionDeLEtablissement | null>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;
	const entete: EnteteEcran = {
		genre: 'poussee',
		retour: { vers: '/app/donnees', libelle: 'Vos données' },
		titre: 'Supprimer l’établissement',
		sousTitre: pret?.apercu.nomEtablissement
	};

	if (donnees.etat !== 'pret') return <PageEcran entete={entete} etat={donnees.etat} />;
	if (pret === null) {
		// Sans établissement, il n'y a rien à supprimer : le retour de l'en-tête
		// est la seule issue qui ait un sens, et proposer d'en créer un ici n'en
		// aurait aucun.
		return (
			<PageEcran
				entete={entete}
				etat={{
					vide: {
						illustration: '🏢',
						titre: 'Aucun établissement actif',
						explication: 'Il n’y a rien à supprimer sur ce compte.'
					}
				}}
			/>
		);
	}

	const { apercu, erreur, onConfirmer } = pret;

	return (
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-2xs">
				{/* le contenu du fragment des lignes 57 à 97 de la route, à l'identique,
				    sauf le corps de `onConfirm={() => { … }}`, qui devient `onConfirm={onConfirmer}` */}
			</div>
		</PageEcran>
	);
}
```

Route `donnees_.supprimer-etablissement.tsx` : `errorComponent: SupprimerEtablissementEnErreur` ; les lignes 38 à 41 restent ; `NOMBRE`, `pluriel`, `Button`, `Dialog*`, `TrashIcon` quittent ses imports ; le `return` devient :

```tsx
	return (
		<EcranSupprimerEtablissement
			donnees={
				apercu === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur:
								apercu === null
									? null
									: {
											apercu,
											erreur,
											onConfirmer: () => {
												setErreur(null);
												void supprimer({ confirmation: apercu.nomEtablissement })
													.then(() => navigate({ to: '/bienvenue' }))
													.catch((e: unknown) => setErreur(messageDErreur(e)));
											}
										}
						}
			}
		/>
	);
```

- [ ] **Step 7 : la salle**

1. Déplacer `MEMBRES` et `INVITATIONS` dans `src/routes/-salle/reglages.tsx`, avec un `APERCU_DEMO: ApercuDonnees` repris de `DemoDonnees`.

   **Amendements du 14/09, relevés au code. Ils l'emportent sur le code des étapes 1 et 2 et sur le tableau qui suit.**
   - **L'équipe et l'invitation attendent aussi la facturation** (règle 3 des correctifs de la revue de la tâche 4). Les deux routes lisent `api.billing.getBillingStatus`, mais leur attente ne porte que sur les membres, les invitations et le rôle. Tant que la facturation se lit, `siegesAutorises` se replie sur le nombre de membres : l'équipe se dit complète, et l'invitation refuse d'inviter, à tort. `enAttente` (`equipe.tsx`, ligne 41) et `chargement` (`equipe_.inviter.tsx`, ligne 37) portent donc aussi `facturation === undefined`. Le repli sur `null` (aucune facturation) reste tel quel.
   - **Le compte et l'établissement de la salle sont ceux du gérant, pas du débiteur.** Le tableau donne à « supprimer compte » l'adresse `claire.martin@fournitures-durand.fr`, chez le débiteur de la famille créance. Or l'équipe et les données de la salle sont celles de « Thumbbb Agency ». L'adresse du compte est celle du membre connecté de `MEMBRES`, et `APERCU_DEMO.nomEtablissement` vient de `ETABLISSEMENT_DEMO` (`communes.ts`, tâche 6) : une seule source pour chacun.
2. Supprimer `DemoEquipe` et `DemoDonnees`, leurs clés (`'equipe'`, `'donnees'`) et leurs lignes de rendu.
3. Ajouter à `ECRANS_REGLAGES` :

| `route` | `libelle` | `vide` | Prêt | Vide |
| --- | --- | --- | --- | --- |
| `/app/equipe` | `équipe` | non | les props de `DemoEquipe` (`MEMBRES`, `INVITATIONS`, `estAdmin: true`…) | |
| `/app/equipe_/inviter` | `inviter` | non | `estAdmin: true`, `complet: false`, `places: 3` | |
| `/app/donnees` | `données` | oui | `APERCU_DEMO` | `null` |
| `/app/donnees_/export` | `export` | non | `reserveAAdmin: false`, `fichier: null`, `enCours: false`, `erreur: null` | |
| `/app/donnees_/supprimer-compte` | `supprimer compte` | non | `email: 'claire.martin@fournitures-durand.fr'` | |
| `/app/donnees_/supprimer-etablissement` | `supprimer établissement` | oui | `apercu: APERCU_DEMO` | `null` |

Les gestionnaires asynchrones de la salle rendent `Promise.resolve()`.

- [ ] **Step 8 : vérifier**

```bash
grep -nE "<Page|<EnteteDetail|sr-only\">Chargement" src/routes/app/equipe.tsx src/routes/app/equipe_.inviter.tsx src/routes/app/donnees.tsx src/routes/app/donnees_.export.tsx src/routes/app/donnees_.supprimer-compte.tsx src/routes/app/donnees_.supprimer-etablissement.tsx
bunx prettier --write src/screens/equipe src/screens/donnees src/routes/app/equipe.tsx src/routes/app/equipe_.inviter.tsx src/routes/app/donnees.tsx src/routes/app/donnees_.export.tsx src/routes/app/donnees_.supprimer-compte.tsx src/routes/app/donnees_.supprimer-etablissement.tsx src/routes/-salle src/routes/showroom.tsx
bun run test:unit
bun run check
bun run lint
```

Attendu : le `grep` ne sort rien, les trois commandes sont vertes.

- [ ] **Step 9 : regarder (règle commune n° 10)** les six écrans. Ouvrir les deux confirmations destructrices sans les valider.

- [ ] **Step 10 : committer**

```bash
git add src/screens/equipe/inviter.tsx src/screens/donnees/export.tsx src/screens/donnees/supprimer-compte.tsx src/screens/donnees/supprimer-etablissement.tsx
git commit --no-verify -m "feat(donnees): l'equipe et vos donnees passent dans la coquille, et l'equipe ne parle plus de taux" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -- src/screens/equipe src/screens/donnees src/routes/app/equipe.tsx src/routes/app/equipe_.inviter.tsx src/routes/app/donnees.tsx src/routes/app/donnees_.export.tsx src/routes/app/donnees_.supprimer-compte.tsx src/routes/app/donnees_.supprimer-etablissement.tsx src/routes/-salle src/routes/showroom.tsx
```

---

## Tâche 8 : l'import, le bilan d'un dépôt, la révélation

**Files:**
- Create: `src/screens/import/depots.tsx`, `src/screens/import/depot.tsx`, `src/screens/revelation.tsx`
- Modify: `src/routes/app/import-factures.tsx`, `import-factures_.$id.tsx`, `revelation.tsx`
- Modify: le fichier de la famille dans `src/routes/-salle/` (voir « Correctifs de la revue de la tâche 2 »), `src/routes/-salle/communes.ts` pour les données partagées avec les démos de composants, `src/routes/-salle/ecrans.tsx` si la famille est neuve, `src/routes/showroom.tsx`

- [ ] **Step 1 : l'import**

`src/screens/import/depots.tsx` contient le commentaire des lignes 23 à 55 de la route (« L'IMPORT DE FACTURES DE VENTE »), `CHEMINS` (lignes 58 à 77) à l'identique, et :

```tsx
export type ModeDepot = 'EXPORT_COMPTABLE' | 'FACTURE_DEPOSEE';

/** Un dépôt, tel que sa rangée le résume. */
export interface LigneDepot {
	readonly _id: string;
	readonly filename: string;
	readonly statut: string;
	readonly etape?: string;
	readonly erreur?: string;
	readonly bilan?: BilanDepotAffiche;
	readonly deposeLe: number;
}

export interface ImportAffiche {
	readonly imports: readonly LigneDepot[];
	readonly mode: ModeDepot;
	readonly onChoisirMode: (mode: ModeDepot) => void;
	readonly envoiEnCours: boolean;
	readonly erreur: string | null;
	readonly onDeposer: (fichiers: File[]) => void;
}

export function EcranImport({ donnees }: { donnees: Lecture<ImportAffiche> }) {
	const entete: EnteteEcran = {
		genre: 'onglet',
		titre: 'Importer vos factures',
		sousTitre: 'Vos factures de vente, et les règlements déjà reçus'
	};

	if (donnees.etat !== 'pret') return <PageEcran entete={entete} etat={donnees.etat} />;

	const { imports, mode, onChoisirMode, envoiEnCours, erreur, onDeposer } = donnees.valeur;
	const chemin = CHEMINS.find((c) => c.mode === mode) ?? CHEMINS[0]!;

	return (
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-2xs">
				{/* les lignes 126 à 221 de la route, à l'identique, avec :
				    `onClick={() => setMode(m)}` → `onClick={() => onChoisirMode(m)}` ;
				    `onFichiers={deposer}` → `onFichiers={onDeposer}` ;
				    `imports && imports.length > 0 ?` → `imports.length > 0 ?` */}
			</div>
		</PageEcran>
	);
}
```

Imports : `ListButton` ; `ChevronRightIcon, FileSpreadsheetIcon, FileTextIcon, UploadIcon` ; de `'../../ui'` `Bandeau, CarteListe, LigneAnalyse, ListeAnalyses, PageEcran, ZoneDepot, dateCourte, pluriel`, et les types `BilanDepotAffiche, EnteteEcran, Lecture`.

⚠️ La zone de dépôt attend maintenant la liste des dépôts pour s'afficher : l'écran prêt, c'est la zone ET la liste. L'attente dure un aller-retour.

Route `import-factures.tsx`, en entier :

```tsx
import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranImport, type ModeDepot } from '../../screens/import/depots';

export const Route = createFileRoute('/app/import-factures')({
	component: ImportFactures,
	errorComponent: ImportEnErreur
});

function ImportEnErreur() {
	return <EcranImport donnees={{ etat: 'erreur' }} />;
}

/** L'import, branché sur la base ; le dessin vit dans `screens/import/depots.tsx`. */
function ImportFactures() {
	const [mode, setMode] = useState<ModeDepot>('EXPORT_COMPTABLE');
	const [envoiEnCours, setEnvoiEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	const imports = useQuery(api.recouvrement.depotMutations.listerImports, {});
	const genererUrl = useMutation(api.recouvrement.depotMutations.genererUrlDepot);
	const enregistrer = useMutation(api.recouvrement.depotMutations.enregistrerFichier);

	// la fonction `deposer` des lignes 90 à 116, à l'identique

	return (
		<EcranImport
			donnees={
				imports === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								imports,
								mode,
								onChoisirMode: setMode,
								envoiEnCours,
								erreur,
								onDeposer: (fichiers) => void deposer(fichiers)
							}
						}
			}
		/>
	);
}
```

- [ ] **Step 2 : le bilan d'un dépôt**

`src/screens/import/depot.tsx` :

```tsx
import { BilanImport, PageEcran, type DepotAffiche, type Lecture } from '../../ui';

/**
 * (le commentaire des lignes 9 à 29 de la route, à l'identique)
 */
export function EcranDepot({ donnees }: { donnees: Lecture<DepotAffiche> }) {
	const depot = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: { vers: '/app/import-factures', libelle: 'Importer' },
				titre: depot?.filename ?? 'Dépôt',
				sousTitre: depot?.etape ?? undefined
			}}
			etat={donnees.etat}
		>
			{depot === null ? null : <BilanImport depot={depot} />}
		</PageEcran>
	);
}
```

Route `import-factures_.$id.tsx` : `errorComponent: DepotEnErreur` (qui rend `<EcranDepot donnees={{ etat: 'erreur' }} />`) ; le `return` devient :

```tsx
	return (
		<EcranDepot
			donnees={
				depot === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								id,
								filename: depot.filename,
								statut: depot.statut,
								etape: depot.etape,
								erreur: depot.erreur,
								// (le commentaire des lignes 55 à 57 sur la date de dépôt, à l'identique)
								bilan: depot.bilan
							}
						}
			}
		/>
	);
```

Un dépôt d'un autre établissement, ou supprimé, fait lever `suivreImport` (« Dépôt introuvable ») : c'est désormais l'écran en erreur, avec son retour vers l'import, au lieu de l'écran d'erreur plein écran du routeur.

- [ ] **Step 3 : la révélation**

`src/screens/revelation.tsx` :

```tsx
import { Link } from '@tanstack/react-router';
import { UploadIcon } from 'lucide-react';
import {
	BilanPertes,
	BoutonPrincipal,
	ChocRevelation,
	PageEcran,
	SectionEcran,
	type BilanPertesAffiche,
	type Lecture,
	type RevelationAffichee
} from '../ui';

/**
 * (le commentaire des lignes 19 à 40 de la route, à l'identique)
 */
export interface RevelationDuJour {
	readonly revelation: RevelationAffichee;
	/** Ce qui s'est éteint, une fois sa lecture arrivée ; `null` avant. */
	readonly bilan: BilanPertesAffiche | null;
}

const TITRE = 'Ce que vos factures portent';

export function EcranRevelation({ donnees }: { donnees: Lecture<RevelationDuJour> }) {
	if (donnees.etat !== 'pret') {
		return <PageEcran entete={{ genre: 'onglet', titre: TITRE }} etat={donnees.etat} />;
	}

	const { revelation, bilan } = donnees.valeur;

	// (le commentaire des lignes 58 à 60, à l'identique)
	const rienARevelrer = revelation.nombreFactures === 0 && revelation.nonChiffrees.length === 0;

	if (rienARevelrer) {
		return (
			<PageEcran
				entete={{ genre: 'onglet', titre: TITRE }}
				etat={{
					vide: {
						illustration: '🧾',
						titre: 'Rien à chiffrer pour l’instant',
						explication:
							'Trois choses sont dues de plein droit sur une facture payée en retard, et presque jamais réclamées : les intérêts de retard, l’indemnité forfaitaire de 40 € par facture, et ce que le délai de prescription laisse encore le temps de demander. Le logiciel les calcule sur vos propres factures.',
						etapes: [
							'Importez un export comptable — c’est le plus complet : il porte vos factures, vos règlements et vos clients d’un coup.',
							'À défaut, déposez vos factures de vente en PDF ou en photo.',
							'Le chiffre apparaît dès le premier dépôt, décomposé facture par facture.'
						],
						action: (
							<BoutonPrincipal as={Link} to="/app/import-factures">
								<UploadIcon />
								Importer mes factures
							</BoutonPrincipal>
						)
					}
				}}
			/>
		);
	}

	return (
		<PageEcran entete={{ genre: 'onglet', titre: TITRE, sousTitre: 'Relevé au jour d’aujourd’hui' }}>
			{/* (le commentaire des lignes 89 à 102, à l'identique) */}
			<ChocRevelation revelation={revelation} />

			{bilan === null ? null : (
				<SectionEcran titre="Ce qui s’est éteint">
					<BilanPertes bilan={bilan} />
				</SectionEcran>
			)}
		</PageEcran>
	);
}
```

Le texte des étapes est recopié tel quel, « — » compris (décision D9). La variable `rienARevelrer` recopie une faute de frappe du code d'origine (ligne 61 de la route) : dans l'écran, elle se nomme `rienAReveler`.

Route `revelation.tsx` : garder l'import de `aujourdHuiISO` seul depuis `'../../ui'`, ajouter `errorComponent: RevelationEnErreur`, et :

```tsx
function Revelation() {
	const arreteAu = aujourdHuiISO();
	const revelation = useQuery(api.recouvrement.revelation.revelation, { arreteAu });
	const bilan = useQuery(api.recouvrement.revelation.bilan, { aujourdHui: arreteAu });

	return (
		<EcranRevelation
			donnees={
				revelation === undefined
					? { etat: 'attente' }
					: { etat: 'pret', valeur: { revelation, bilan: bilan ?? null } }
			}
		/>
	);
}
```

- [ ] **Step 4 : la salle**

1. Déplacer `REVELATION_DEMO` dans `src/routes/-salle/onglets.tsx` ; `BILAN_DEMO` et `DEPOTS_DEMO`, que `DemoBilan` et `DemoBilanImport` utilisent encore, dans `communes.ts`. Créer `src/routes/-salle/import.tsx` (tableau `ECRANS_IMPORT`, à réunir dans `ecrans.tsx`).

   **La révélation et le bilan se calculent** (voir « Correctifs de la revue de la tâche 3 »). Relevé au code le 14/09/2026 : `REVELATION_DEMO` et `BILAN_DEMO` sont écrits à la main. Ils deviennent le résultat de `reveler(factures, arreteAu, 'ACT_365')` et de `bilanDesPertes(factures, depuis, arreteAu)` (`src/lib/verticales/recouvrement/revelation.ts`), sur des factures de démonstration préparées comme `facturesPour` le fait (`src/lib/convex/recouvrement/revelation.ts`, lignes 100 à 155 : `periodesDeTauxParDefaut(depart, arreteAu)`, `prescriptionDe([exigibilite, echeance], secteur)`, les règlements), puis transformés comme `composerRevelation` et `composerBilan` (lignes 177 à 207 et 223 à 256, `interetsCourusDepuisHier` compris). `arreteAu: '2026-09-09'` et `depuis: '2026-01-01'` sont figés. Essai au relevé : trois factures impayées sans règlement donnent une révélation chiffrée sans lever (42 480,00 € de principal, 11 492,65 € d'intérêts, là où `REVELATION_DEMO` écrivait 7 312,40 €), et le bilan compte 251 jours de surveillance. Pour montrer ce que `BILAN_DEMO` montrait (des créances éteintes avant l'arrivée, une facture non surveillée), les factures de démonstration en comportent : c'est le domaine qui dit si elles s'éteignent, pas la salle. `DEPOTS_DEMO` reste écrit : un dépôt est une donnée, pas un calcul.

   **Les références de facture suivent la règle des noms de débiteur** (règle 1 des correctifs de la revue de la tâche 4). Relevé le 14/09 : `FA-2021-0087` et `FA-2026-0311` figurent à la fois dans `REVELATION_DEMO` et dans les événements de l'accueil (`src/routes/-salle/communes.ts`, lignes 46 à 99 ; `onglets.tsx`, ligne 118). Une facture de démonstration dont une autre famille montre la référence est soit le MÊME objet, déclaré une fois dans `communes.ts` et lu par les deux familles, soit renommée d'une référence que personne n'emploie. Sinon, la même référence afficherait deux montants ou deux échéances.
2. Supprimer `DemoDepot` et `DemoRevelation`, leurs clés (`'depot'`, `'revelation'`) et leurs lignes de rendu. `DemoBilanImport` (les quatre états d'un dépôt côte à côte) et `DemoBilan` restent : ce sont des démos de composants.
3. Ajouter la révélation à `ECRANS_ONGLETS`, l'import et le dépôt à `ECRANS_IMPORT` :

| `route` | `libelle` | `vide` | Prêt | Vide |
| --- | --- | --- | --- | --- |
| `/app/import-factures` | `import` | oui | `imports` tirés de `DEPOTS_DEMO` (`_id: depot.id`, `deposeLe` du dépôt ou `Date.UTC(2026, 8, 2)`), `mode` tenu par `useState` | `imports: []` |
| `/app/import-factures_/$id` | `dépôt` | non | le premier de `DEPOTS_DEMO` | |
| `/app/revelation` | `révélation` | oui | `REVELATION_DEMO`, `BILAN_DEMO` | une révélation à `nombreFactures: 0`, `nonChiffrees: []` |

- [ ] **Step 5 : vérifier**

```bash
grep -nE "<Page|<EnteteDetail|sr-only\">Chargement" src/routes/app/import-factures.tsx src/routes/app/import-factures_.\$id.tsx src/routes/app/revelation.tsx
grep -rnE "<Page|<EnteteDetail|sr-only\">Chargement" src/routes/app
bunx prettier --write src/screens/import src/screens/revelation.tsx src/routes/app/import-factures.tsx src/routes/app/import-factures_.\$id.tsx src/routes/app/revelation.tsx src/routes/-salle src/routes/showroom.tsx
bun run test:unit
bun run check
bun run lint
```

Attendu : les deux `grep` ne sortent rien (le second prouve que les 27 routes sont migrées), les trois commandes sont vertes.

- [ ] **Step 6 : regarder (règle commune n° 10)** les trois écrans.

- [ ] **Step 7 : committer**

```bash
git add src/screens/import src/screens/revelation.tsx
git commit --no-verify -m "feat(import): l'import, le bilan d'un depot et la revelation passent dans la coquille" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -- src/screens/import src/screens/revelation.tsx src/routes/app/import-factures.tsx "src/routes/app/import-factures_.\$id.tsx" src/routes/app/revelation.tsx src/routes/-salle src/routes/showroom.tsx
```

---

## Tâche 9 : les barrières

Les deux barrières de la spec (§ 4.3), et la vérification que la salle montre bien chaque écran (§ 11, critère 1). Elles s'écrivent après les migrations : écrites avant, elles auraient laissé la suite rouge pendant sept tâches.

**Files:**
- Create: `src/ui/__tests__/routes-lisent.test.ts`
- Create: `src/ui/__tests__/attente-visible.test.ts`
- Create: `src/ui/__tests__/salle-complete.test.ts`
- Create: `src/ui/__tests__/salle-etats.test.tsx`
- Modify: `src/lib/convex/__tests__/declare-jamais-alimente.test.ts` (`sourcesHorsSchema`, lignes 75 à 82)

- [ ] **Step 1 : les routes lisent, les écrans dessinent**

`src/ui/__tests__/routes-lisent.test.ts` :

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * LES ROUTES LISENT, LES ÉCRANS DESSINENT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE TEST EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un écran qui vit dans `src/routes/` ne peut pas s'ouvrir dans la salle
 * d'exposition, qui rend sans backend ni authentification. Onze routes
 * dessinaient au lieu de déléguer : onze écrans que personne ne pouvait
 * regarder aux quatre largeurs, et qui n'ont jamais été regardés.
 *
 * ⚠️ AUCUNE LISTE D'EXEMPTIONS. Une barrière qui exempte dix-sept pages est une
 * barrière qui exemptera la dix-huitième. La coquille authentifiée
 * (`route.tsx`) passe sans exception : elle ne dessine rien, elle pose `Shell`.
 *
 * ⚠️ `<Page` EST UN PRÉFIXE, ET C'EST VOULU. Il attrape `<PageHeader`,
 * `<PageBody`, `<PageHero` et `<PageEcran` : une route ne rend pas la coquille
 * elle-même, pas même pour son erreur. Elle rend l'écran, qui rend la coquille.
 */

const RACINE = join(process.cwd(), 'src');
const ROUTES = join(RACINE, 'routes', 'app');
const DESSIN = /<Page|<EnteteDetail/;

function fichiers(dossier: string, trouves: string[] = []): string[] {
	for (const entree of readdirSync(dossier)) {
		const chemin = join(dossier, entree);
		if (statSync(chemin).isDirectory()) fichiers(chemin, trouves);
		else if (/\.tsx?$/.test(entree)) trouves.push(chemin);
	}
	return trouves;
}

describe('les routes lisent, les écrans dessinent', () => {
	it('lit toutes les routes de l’espace connecté', () => {
		// Vingt-sept écrans et la coquille. Si les chemins changeaient et que le
		// balayage ne trouvait plus rien, il passerait au vert sans rien vérifier.
		expect(fichiers(ROUTES).length).toBeGreaterThanOrEqual(28);
	});

	it('reconnaît un dessin sous toutes ses formes, et rien d’autre', () => {
		expect(DESSIN.test('<Page>')).toBe(true);
		expect(DESSIN.test('<PageHeader titre="Vos débiteurs" />')).toBe(true);
		expect(DESSIN.test('<PageBody>')).toBe(true);
		expect(DESSIN.test('<PageEcran entete={entete} />')).toBe(true);
		expect(DESSIN.test('<EnteteDetail retourVers="/app" />')).toBe(true);
		expect(DESSIN.test('<EcranCreance identifiant={id} donnees={lecture} />')).toBe(false);
	});

	it('aucune route de src/routes/app ne dessine', () => {
		const fautes = fichiers(ROUTES)
			.filter((fichier) => DESSIN.test(readFileSync(fichier, 'utf8')))
			.map((fichier) => fichier.slice(RACINE.length + 1));

		expect(
			fautes,
			`Ces routes dessinent au lieu de passer leurs données à un écran de src/screens/ :\n${fautes.join('\n')}`
		).toEqual([]);
	});

	it('chaque écran déclare l’erreur qui garde son en-tête', () => {
		// Décision D4. Sans `errorComponent`, une panne retombe sur l'écran
		// d'erreur générique du routeur, qui perd l'en-tête et son retour. La
		// coquille authentifiée (`route.tsx`) n'est pas un écran : elle pose `Shell`.
		const sansErreur = fichiers(ROUTES)
			.filter((fichier) => basename(fichier) !== 'route.tsx')
			.filter((fichier) => !/errorComponent:/.test(readFileSync(fichier, 'utf8')))
			.map((fichier) => fichier.slice(RACINE.length + 1));

		expect(sansErreur, `Ces écrans n’ont pas d’errorComponent :\n${sansErreur.join('\n')}`).toEqual([]);
	});
});
```

- [ ] **Step 2 : aucune attente invisible**

`src/ui/__tests__/attente-visible.test.ts` :

```ts
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * AUCUNE ATTENTE INVISIBLE.
 *
 * Onze écrans annonçaient leur chargement par `<p className="sr-only">Chargement…</p>` :
 * lisible par un lecteur d'écran, invisible pour tous les autres. L'accueil, les
 * débiteurs, les procédures et la créance montraient un corps vide le temps de
 * l'aller-retour, et un corps vide se lit comme une panne. Règle d'écran n° 2 :
 * tout traitement se voit sans qu'on le demande.
 *
 * L'attente se dit par `PageEcran`, qui rend le squelette de la page sous
 * `aria-busy`, et place à côté un statut qui le dit. Ce statut-là n'est pas
 * seul : le squelette se voit dessous. C'est pour ça que la coquille, dans
 * `src/ui/`, n'est pas balayée ici.
 */

const RACINE = join(process.cwd(), 'src');
const ZONES = [join(RACINE, 'routes'), join(RACINE, 'screens')];
const ATTENTE_INVISIBLE = /sr-only["']>\s*Chargement/;

function fichiers(dossier: string, trouves: string[] = []): string[] {
	for (const entree of readdirSync(dossier)) {
		if (entree === '__tests__') continue;
		const chemin = join(dossier, entree);
		if (statSync(chemin).isDirectory()) fichiers(chemin, trouves);
		else if (/\.tsx?$/.test(entree)) trouves.push(chemin);
	}
	return trouves;
}

describe('aucune attente invisible', () => {
	it('balaie un nombre plausible de fichiers', () => {
		expect(ZONES.flatMap((zone) => fichiers(zone)).length).toBeGreaterThan(40);
	});

	it('reconnaît une attente cachée, et laisse passer une attente visible', () => {
		expect(ATTENTE_INVISIBLE.test('<p className="sr-only">Chargement…</p>')).toBe(true);
		expect(ATTENTE_INVISIBLE.test('<p className="text-cladd-xs">Chargement…</p>')).toBe(false);
	});

	it('aucun écran n’annonce son chargement aux seuls lecteurs d’écran', () => {
		const fautes = ZONES.flatMap((zone) => fichiers(zone))
			.filter((fichier) => ATTENTE_INVISIBLE.test(readFileSync(fichier, 'utf8')))
			.map((fichier) => fichier.slice(RACINE.length + 1));

		expect(fautes, `Attente invisible ici :\n${fautes.join('\n')}`).toEqual([]);
	});
});
```

- [ ] **Step 3 : la salle montre chaque écran**

`src/ui/__tests__/salle-complete.test.ts` :

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ECRANS_DU_PRODUIT } from '../../routes/-salle/ecrans';

/**
 * LA SALLE D'EXPOSITION MONTRE CHAQUE ÉCRAN DU PRODUIT.
 *
 * C'est le premier critère de fin du chantier : « chaque écran du produit
 * s'ouvre dans la salle d'exposition, dans chacun de ses états, tel que
 * l'utilisateur le voit ». Les états viennent de la salle elle-même, qui offre
 * Prêt, Attente et Erreur à chaque entrée. Ce test tient l'autre moitié : que
 * chaque route ait son entrée.
 *
 * ⚠️ IL COMPARE LE REGISTRE IMPORTÉ, PAS LE TEXTE DES FICHIERS. Un tableau de
 * famille oublié dans `ecrans.tsx`, ou une entrée mise en commentaire, manque
 * au registre réel, alors qu'un balayage du texte l'aurait encore trouvée : la
 * barrière passerait au vert sur un écran construit et injoignable.
 * `salle-etats.test.tsx` rend ensuite chaque entrée dans chacun de ses états.
 */

const RACINE = join(process.cwd(), 'src');
const ROUTES = join(RACINE, 'routes', 'app');

function ecransDuRouteur(): string[] {
	return readdirSync(ROUTES)
		.filter((fichier) => fichier.endsWith('.tsx'))
		.map((fichier) => {
			const route = /createFileRoute\('([^']+)'\)/.exec(readFileSync(join(ROUTES, fichier), 'utf8'))?.[1];
			if (route === undefined) throw new Error(`${fichier} ne déclare aucune route lisible`);
			return route;
		})
		// La coquille authentifiée pose `<Outlet />` : ce n'est pas un écran.
		.filter((route) => route !== '/app');
}

function ecransDeLaSalle(): string[] {
	return ECRANS_DU_PRODUIT.map((ecran) => ecran.route);
}

describe('la salle d’exposition', () => {
	it('lit bien les deux listes', () => {
		expect(ecransDuRouteur()).toContain('/app/creance_/$id/procedure');
		expect(ecransDeLaSalle()).toContain('/app/');
		expect(ecransDuRouteur().length).toBeGreaterThanOrEqual(27);
	});

	it('montre chaque écran que le routeur sert', () => {
		const salle = new Set(ecransDeLaSalle());
		const absents = ecransDuRouteur().filter((route) => !salle.has(route));
		expect(absents, `Écrans absents de la salle (src/routes/-salle/) :\n${absents.join('\n')}`).toEqual([]);
	});

	it('ne montre aucun écran qui n’existe plus', () => {
		const routeur = new Set(ecransDuRouteur());
		const perimes = ecransDeLaSalle().filter((route) => !routeur.has(route));
		expect(perimes, `Entrées sans route : ${perimes.join(', ')}`).toEqual([]);
	});
});
```

- [ ] **Step 3 bis : la salle rend chaque écran dans chacun de ses états**

`salle-complete` vérifie la liste ; ce test-ci REND chaque entrée. Il attrape une démonstration qui plante, un vide qui montrerait l'écran prêt (`lectureDemo` lève alors), et un écran branché sur le mauvais état.

`src/ui/__tests__/salle-etats.test.tsx` :

```tsx
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { EtatDemo } from '../../routes/-salle/demo';
import { ECRANS_DU_PRODUIT } from '../../routes/-salle/ecrans';

/**
 * CHAQUE ÉCRAN DE LA SALLE S'AFFICHE DANS CHACUN DE SES ÉTATS.
 *
 * C'est le premier critère de fin du chantier, exécuté : « chaque écran du
 * produit s'ouvre dans la salle d'exposition, dans chacun de ses états ».
 *
 * ⚠️ `Link` EST REMPLACÉ PAR UN LIEN NU, comme dans `page-ecran.test.tsx` : le
 * vrai exige un routeur. Les entrées ne posent pas la coquille (la salle le
 * fait), donc rien d'autre n'est à remplacer.
 */
vi.mock('@tanstack/react-router', async (importOriginal) => {
	const original = await importOriginal<object>();
	const { createElement } = await import('react');
	return {
		...original,
		Link: ({ to, className, children }: { to?: string; className?: string; children?: ReactNode }) =>
			createElement('a', { href: to, className }, children)
	};
});

const ETATS_AVEC_VIDE: readonly EtatDemo[] = ['pret', 'vide', 'attente', 'erreur'];
const ETATS_SANS_VIDE: readonly EtatDemo[] = ['pret', 'attente', 'erreur'];

const cas = ECRANS_DU_PRODUIT.flatMap((ecran) =>
	(ecran.vide ? ETATS_AVEC_VIDE : ETATS_SANS_VIDE).map((etat) => [ecran.route, etat, ecran] as const)
);

describe('la salle rend chaque écran dans chacun de ses états', () => {
	it('a de quoi rendre : vingt-sept écrans, trois états au moins', () => {
		expect(cas.length).toBeGreaterThanOrEqual(27 * 3);
	});

	it.each(cas)('%s, %s', (_route, etat, ecran) => {
		const { Demo } = ecran;
		const html = renderToStaticMarkup(<Demo etat={etat} />);

		if (etat === 'attente') {
			expect(html).toContain('aria-busy="true"');
			expect(html).toContain('role="status"');
		} else {
			expect(html).not.toContain('aria-busy="true"');
		}

		if (etat === 'erreur') expect(html).toContain('role="alert"');
		else expect(html).not.toContain('Cet écran n’a pas pu s’afficher.');
	});

	it.each(ECRANS_DU_PRODUIT.filter((ecran) => ecran.vide).map((ecran) => [ecran.route, ecran] as const))(
		'%s : le vide ne montre pas l’écran prêt',
		(_route, ecran) => {
			const { Demo } = ecran;
			expect(renderToStaticMarkup(<Demo etat="vide" />)).not.toEqual(
				renderToStaticMarkup(<Demo etat="pret" />)
			);
		}
	);

	it.each(
		ECRANS_DU_PRODUIT.flatMap((ecran) =>
			(ecran.variantes ?? []).map((variante) => [ecran.route, variante, ecran] as const)
		)
	)('%s, variante « %s » : prête, et autre chose que la forme principale', (_route, variante, ecran) => {
		const { Demo } = ecran;
		const html = renderToStaticMarkup(<Demo etat="pret" variante={variante} />);
		expect(html).not.toContain('aria-busy="true"');
		expect(html).not.toContain('Cet écran n’a pas pu s’afficher.');
		expect(html).not.toEqual(renderToStaticMarkup(<Demo etat="pret" />));
	});
});
```

Si une démonstration ne peut pas se rendre côté serveur (une feuille `Popup` ouverte d'emblée, par exemple), ne pas l'exclure du test : la rendre fermée par défaut dans la salle, et le dire dans le rapport.

- [ ] **Step 3 quater : la rangée de la créance s'accorde avec ses pages**

La seconde revue de la tâche 3 a trouvé une rangée qui contredisait les pages vers lesquelles elle mène : 65 % de solidité, « 1 risque » là où la page en montrait deux, « 1 prêt » pour des relances suspendues. La dérivation par le domaine l'a corrigée, mais rien n'échoue si elle se perd : `salle-etats` vérifie les états, pas l'accord.

Dans `src/ui/__tests__/salle-etats.test.tsx`, ajouter un `describe` « la famille créance s’accorde avec elle-même ». Il importe les données de `src/routes/-salle/creance.tsx`, en les exportant sans rien changer d'autre, et vérifie sur les VALEURS, pas sur le HTML, que :

- les pièces établies de la rangée égalent celles de la page de solidité ;
- les risques de la rangée égalent ceux de la forme principale de la page des risques ;
- l'état des relances de la rangée égale celui de la variante « suspendues » de la page des relances, qui porte la santé de la famille ;
- le nombre « à confirmer » de la rangée égale les questions de la page du litige plus ses conditions à confirmer ;
- le total du décompte de la rangée égale le total de la page du décompte.

Faire mordre : changer temporairement une valeur de la rangée, voir l'échec qui la nomme, puis rétablir.

- [ ] **Step 3 ter : la salle n'alimente aucun champ**

La barrière `declare-jamais-alimente` compte comme ÉCRITURE tout `champ:` d'objet littéral, et comme EMPLOI toute valeur d'union citée, partout dans `src` sauf le schéma. Les données de démonstration de la salle en portent des dizaines, et en porteront davantage à chaque écran : un champ que seule la salle « alimente » passerait pour alimenté, alors que le produit ne l'écrit pas.

Dans `src/lib/convex/__tests__/declare-jamais-alimente.test.ts`, remplacer `sourcesHorsSchema` (lignes 75 à 82, commentaire compris) par :

```ts
/**
 * Tout le code SAUF les déclarations de schéma, qui ne sont pas des écritures,
 * et SAUF la salle d'exposition.
 *
 * ⚠️ LA SALLE ÉCRIT DES DONNÉES INVENTÉES. Ses démonstrations portent des objets
 * littéraux et des valeurs d'union qui passeraient pour des écritures et des
 * emplois : un champ que seul un écran de démonstration « alimente » est un
 * champ que le produit n'alimente pas.
 */
function fichiersHorsSchema(): string[] {
	const exclus = [sep + 'tables.ts', sep + 'schema.ts', sep + 'showroom.tsx'];
	const salle = `${sep}routes${sep}-salle${sep}`;
	return fichiersSources(RACINE)
		.filter((f) => !exclus.some((x) => f.endsWith(x)))
		.filter((f) => !f.includes(salle));
}

function sourcesHorsSchema(): string {
	return fichiersHorsSchema()
		.map((f) => readFileSync(f, 'utf8'))
		.join('\n');
}
```

Et ajouter, à la fin du `describe` :

```ts
	it('ne compte pas la salle d’exposition comme une écriture', () => {
		// ⚠️ ON LIT LA LISTE DES FICHIERS, PAS LEUR CONTENU. Le corpus contient ce
		// fichier-ci, qui cite forcément ce qu'il cherche : un balayage du contenu
		// se trouverait lui-même, et accuserait la salle à tort.
		const fichiers = fichiersHorsSchema();
		expect(fichiers.some((f) => f.endsWith(`${sep}showroom.tsx`))).toBe(false);
		expect(fichiers.some((f) => f.includes(`${sep}routes${sep}-salle${sep}`))).toBe(false);
		// Et le corpus reste le produit : exclure la salle n'a pas vidé la barrière.
		expect(fichiers.some((f) => f.endsWith(`${sep}recouvrement${sep}import.ts`))).toBe(true);
	});
```

Vérifier que les deux balayages restent verts sans la salle : la revue de la tâche 2 l'a rejoué au commit `54e5e29`, aucun champ ni aucune valeur n'en dépendait. S'ils tombent maintenant, c'est qu'une donnée de la salle masquait un vrai défaut : le nommer dans le rapport, ne pas le tolérer en silence.

- [ ] **Step 4 : les lancer**

Run: `bunx vitest --run src/ui/__tests__/routes-lisent.test.ts src/ui/__tests__/attente-visible.test.ts src/ui/__tests__/salle-complete.test.ts src/ui/__tests__/salle-etats.test.tsx src/lib/convex/__tests__/declare-jamais-alimente.test.ts`
Expected: PASS : 10 tests de barrières, 4 de la barrière des champs, et pour la salle 1 test plus un cas par écran et par état, plus un cas par écran qui a un vide.

- [ ] **Step 5 : les faire mordre**

Une barrière se vérifie en la faisant échouer. Dans `src/routes/app/revelation.tsx`, ajouter temporairement en fin de fichier :

```tsx
export const Essai = () => <Page><p className="sr-only">Chargement…</p></Page>;
```

Relancer la commande du Step 4. Attendu : FAIL sur « aucune route de src/routes/app ne dessine » et sur « aucun écran n’annonce son chargement aux seuls lecteurs d’écran », chacun nommant `routes/app/revelation.tsx`. Retirer la ligne avec l'outil d'édition (pas de `git checkout`), puis relancer : PASS.

Dans `src/routes/-salle/ecrans.tsx`, retirer temporairement `...ECRANS_ONGLETS` de `ECRANS_DU_PRODUIT`. Relancer : FAIL sur « montre chaque écran que le routeur sert », qui nomme `/app/`, `/app/procedures` et `/app/revelation`. Rétablir, relancer : PASS.

Dans `src/routes/app/revelation.tsx`, retirer temporairement `errorComponent: RevelationEnErreur,`. Relancer : FAIL sur « chaque écran déclare l’erreur qui garde son en-tête », qui nomme `routes/app/revelation.tsx`. Rétablir, relancer : PASS.

- [ ] **Step 6 : la suite entière, et committer**

```bash
bunx prettier --write src/ui/__tests__/routes-lisent.test.ts src/ui/__tests__/attente-visible.test.ts src/ui/__tests__/salle-complete.test.ts src/ui/__tests__/salle-etats.test.tsx src/lib/convex/__tests__/declare-jamais-alimente.test.ts
bun run test:unit
bun run check
bun run lint
git status --short
git add src/ui/__tests__/routes-lisent.test.ts src/ui/__tests__/attente-visible.test.ts src/ui/__tests__/salle-complete.test.ts src/ui/__tests__/salle-etats.test.tsx
git commit --no-verify -m "test(barrieres): les routes lisent et declarent leur erreur, aucune attente n'est invisible, la salle rend chaque ecran dans chaque etat" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -- src/ui/__tests__/routes-lisent.test.ts src/ui/__tests__/attente-visible.test.ts src/ui/__tests__/salle-complete.test.ts src/ui/__tests__/salle-etats.test.tsx src/lib/convex/__tests__/declare-jamais-alimente.test.ts
```

Attendu : `git status --short` ne montre que ces cinq fichiers (les essais du Step 5 sont bien retirés).

---

## Tâche 10 : regarder, livrer, vérifier la production

Menée par la session qui orchestre, pas par un sous-agent : elle demande le panneau de navigation intégré et la poussée vers la production.

**Files:** aucun fichier de code, sauf correction révélée par le regard.

- [ ] **Step 1 : la suite, les types, le lint, la construction**

```bash
bun run test:unit
bun run check
bun run lint
bun run build
```

Attendu : tout vert ; le nombre de tests dépasse celui de la tâche 0 d'au moins 105 (12 de la coquille, 1 des destinations, 10 des barrières, et pour la salle 1 test plus au moins 81 cas d'écran et d'état), aucun n'ayant été retiré.

- [ ] **Step 2 : le regard, aux quatre largeurs**

Démarrer ou rattacher le serveur de développement (`preview_start`, configuration `dev:attacher` si un serveur tourne déjà sur 20173, sinon `dev:cloud`), ouvrir `/showroom`.

1. Pour les 27 écrans : l'état Prêt à 375 et à 1280 px.
2. Pour l'accueil, les débiteurs, la créance, le décompte, la procédure et l'import : les quatre états, aux quatre largeurs (375, 768, 1024, 1280). Pour chaque écran qui en porte, ses variantes nommées à 375 et 1280 px.
3. À chaque vue, mesurer au DOM, par `javascript_tool` :

```js
({
	debordeEnLargeur: document.documentElement.scrollWidth > window.innerWidth,
	attenteAnnoncee: document.querySelectorAll('[aria-busy="true"]').length,
	// Le statut de la coquille (`role="status"`) est exclu : il accompagne un
	// squelette visible, il n'est pas une attente cachée.
	attenteCachee: [...document.querySelectorAll('.sr-only:not([role="status"])')].filter((n) =>
		/Chargement/.test(n.textContent ?? '')
	).length,
	statutAttente: document.querySelectorAll('[role="status"]').length
})
```

Attendu : `debordeEnLargeur` faux partout ; `attenteAnnoncee` et `statutAttente` à 1 dans l'état Attente et à 0 ailleurs ; `attenteCachee` à 0 partout.

Tout défaut vu se corrige dans l'écran ou dans la coquille, se vérifie à nouveau, et se committe par chemin avant d'aller plus loin.

- [ ] **Step 3 : relever l'empreinte AVANT de pousser**

La classe `animate-pouls` n'est employée que par le squelette de la coquille. La production actuelle définit la variable `--animate-pouls`, jamais la classe : c'est le sélecteur `.animate-pouls` qu'on cherche. Vérifier qu'il est absent de la production actuelle :

```bash
curl -s https://www.letikette.com/ | grep -oE '/assets/[^"]+\.(js|css)' | sort -u | while read -r actif; do curl -s "https://www.letikette.com$actif"; done | grep -c '\.animate-pouls'
```

Attendu : `0`. Si le résultat n'est pas zéro, choisir une autre chaîne propre à cette tranche et absente de la production (par exemple `Créer votre entreprise`), et le noter.

- [ ] **Step 4 : fusionner et pousser**

```bash
git switch main
git merge --ff-only chantier/charpente-tranche-2
git push origin main
git branch -d chantier/charpente-tranche-2
```

- [ ] **Step 5 : vérifier le déploiement, pas la poussée**

Interroger `https://api.github.com/repos/julesdo/mycelium-os/commits/<sha poussé>/status` jusqu'à ce que le statut Vercel quitte `pending`. ⚠️ Le premier champ `description` de la réponse peut être celui du dépôt : lire le statut dont le `context` est Vercel. Attendu : `success`, « Deployment has completed ».

Puis relancer la commande du Step 3. Attendu : un nombre supérieur à `0`, et `https://www.letikette.com/` répond 200.

- [ ] **Step 6 : rendre compte**

Dire ce qui est livré, le nombre de tests, ce que le regard a trouvé et corrigé, l'empreinte avant et après, et ce qui reste pour la tranche 3.

---

## Auto-relecture du plan contre la spec

| Spec | Où c'est fait |
| --- | --- |
| § 4.1 `PageEcran` dans `src/ui/`, en-tête onglet ou page poussée, l'accueil sans en-tête | Tâche 1 (`EnteteEcran`), tâche 2 (accueil `aucun`) |
| § 4.1 la largeur, colonne de lecture ou deux volets | Tâche 1 (colonne, `volets`), décision D5 |
| § 4.1 l'attente en squelette, `aria-busy`, jamais un `sr-only` seul | Tâche 1 (`Attente`, test), tâche 9 (barrière) |
| § 4.1 le vide par `EmptyState` | Tâche 1 (`etat={{ vide }}`), décision D6 |
| § 4.1 l'erreur garde l'en-tête et son retour, dit ce qui s'est passé, propose une issue | Tâche 1 (`Erreur`, test), décision D4, `errorComponent` des tâches 2 à 8 |
| § 4.2 les 27 routes délèguent à `src/screens/`, qui reçoit ses données en props | Tâches 2 à 8, décisions D1 et D2 |
| § 4.2 la salle rend ces écrans, dans chacun de leurs états | Tâche 2 (registre), tâches 3 à 8 (entrées), tâche 9 (`salle-complete`) |
| § 4.2 `DemoLitige` et `DemoHabitude` supprimées | Tâche 3, tâche 5 |
| § 4.3 les deux barrières, sans exemption | Tâche 9 |
| § 8 les barrières existantes restent vertes, vérifiées par `bun run test:unit` | Règle commune n° 3, à chaque tâche |
| § 11, critères 1 et 2 | Tâches 9 et 10 |

Hors de cette tranche, et c'est voulu : les deux volets des écrans maîtres et l'imbrication des routes (tranche 3), le retour par l'historique (tranche 4), la recherche (tranche 5). Les quatre points du § 9 concernent ces tranches-là.

