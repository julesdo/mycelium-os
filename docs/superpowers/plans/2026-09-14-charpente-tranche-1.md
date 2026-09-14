# Charpente de navigation, tranche 1 : plan d'implémentation

> **Pour les agents :** SOUS-SKILL REQUISE. Utiliser `superpowers:subagent-driven-development`
> (recommandé) ou `superpowers:executing-plans` pour exécuter ce plan tâche par tâche.
> Les étapes sont en cases à cocher (`- [ ]`).

**But :** les deux écrans de passage (page introuvable, écran d'erreur) deviennent regardables et
proposent un chemin vers l'accueil, et le vocabulaire d'avant le pivot disparaît de l'interface,
tenu par une barrière qui lit enfin `src/router.tsx`.

**Architecture :** les deux écrans quittent les options de `createRouter` pour `src/screens/passage.tsx`,
d'où le routeur ET la salle d'exposition les importent. Un test lit le source des deux côtés pour
qu'ils ne divergent jamais. La barrière `lignes-rouges.test.ts` reçoit une liste de fichiers isolés,
parce qu'un fichier posé dans sa liste de dossiers serait ignoré sans erreur.

**Pile :** React 19, TanStack Router 1.170.31, Cladd, Vitest 4.1.5, bun.

**Spec :** `docs/superpowers/specs/2026-09-14-charpente-navigation-design.md`, § 3 (commit `b597fa2`).

**Commandes utiles**

```bash
bunx vitest --run <chemin-du-test> --reporter=dot
```

```bash
bun run test:unit
```

```bash
bun run check
```

---

## Fichiers touchés

| Fichier | Rôle |
| --- | --- |
| `src/screens/passage.tsx` | nouveau : `EcranIntrouvable` et `EcranEnErreur` |
| `src/router.tsx` | modifié : importe les deux écrans au lieu de les écrire en ligne |
| `src/routes/showroom.tsx` | modifié : montre les deux écrans |
| `src/ui/__tests__/ecrans-de-passage.test.ts` | nouveau : le routeur et la salle d'exposition montrent les mêmes écrans |
| `src/ui/__tests__/lignes-rouges.test.ts` | modifié : fichiers isolés, preuve de lecture, vocabulaire d'avant le pivot |
| `src/routes/app/route.tsx` | modifié : une phrase |
| `src/routes/nouveau-mot-de-passe.tsx` | modifié : une phrase |
| `src/screens/abonnement/offre.tsx` | modifié : une phrase |

---

## Tâche 0 : préparer sans rien emporter

L'arbre de travail porte du travail non commité qui n'appartient pas à cette tranche (la
fonctionnalité de notifications). Au chantier 1, un commit par chemin a quand même emporté les
appels de cette fonctionnalité sans ses définitions, parce que le fichier était partagé. Cette
tranche ne partage aucun fichier avec ce travail : l'étape 3 le vérifie avant de commencer.

- [ ] **Étape 1 : créer la branche**

```bash
git switch -c chantier/charpente-tranche-1
```

- [ ] **Étape 2 : sauvegarder le travail en cours sans le toucher**

```bash
git tag sauvegarde/avant-tranche-1-2026-09-14 "$(git stash create)"
```

`git stash create` fabrique un commit du travail en cours sans modifier ni l'index ni l'arbre.

- [ ] **Étape 3 : vérifier qu'aucun fichier de la tranche ne porte déjà du travail non commité**

```bash
git status --porcelain | grep -E "router\.tsx|app/route\.tsx|nouveau-mot-de-passe|abonnement/offre|showroom|lignes-rouges|passage" || echo "aucun chevauchement"
```

Attendu : `aucun chevauchement`. Si une ligne sort, **arrêter et rendre compte** : le commit de
cette tranche emporterait le travail d'autrui présent dans ce fichier.

⚠️ **Règles git pour toute la tranche.** JAMAIS `git add -A`, `git add .`, `git checkout`,
`git restore`, `git stash`, `git reset`. Toujours un commit par chemin explicite :
`git commit --no-verify -m "..." -- <chemins>`. `--no-verify` parce que les hooks de pré-commit
dépassent deux minutes.

---

## Tâche 1 : les écrans de passage deviennent regardables

**Fichiers :**
- Créer : `src/ui/__tests__/ecrans-de-passage.test.ts`
- Créer : `src/screens/passage.tsx`
- Modifier : `src/router.tsx` (entier)
- Modifier : `src/routes/showroom.tsx` (trois ajouts)

- [ ] **Étape 1 : écrire le test qui échoue**

Créer `src/ui/__tests__/ecrans-de-passage.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * LES ÉCRANS DE PASSAGE : CEUX QU'ON MONTRE SONT CEUX QU'ON AFFICHE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE TEST EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La page introuvable et l'écran d'erreur étaient écrits en ligne dans les
 * options de `createRouter`, et exportés nulle part. Aucun écran ne pouvait donc
 * les importer, pas même la salle d'exposition : personne ne les avait jamais
 * regardés aux quatre largeurs. Ils disaient encore « vos taux » et « tableau de
 * bord », le vocabulaire d'avant le pivot.
 *
 * Les déplacer ne suffit pas. La salle d'exposition a déjà montré des pages que
 * le produit n'affiche pas (`DemoLitige`, `DemoHabitude`, qui portaient d'autres
 * titres que les vrais écrans). Ce test tient les deux bouts : le routeur
 * affiche CES écrans, et la salle d'exposition montre CES écrans.
 */

const RACINE = join(process.cwd(), 'src');
const lire = (chemin: string) => readFileSync(join(RACINE, chemin), 'utf8');

describe('les écrans de passage', () => {
	it('sont ceux que le routeur affiche vraiment', () => {
		const routeur = lire('router.tsx');
		expect(routeur).toMatch(/defaultNotFoundComponent:\s*\(\)\s*=>\s*<EcranIntrouvable\s*\/>/);
		expect(routeur).toMatch(/defaultErrorComponent:\s*\(\)\s*=>\s*<EcranEnErreur\s*\/>/);
	});

	it('sont ceux que la salle d’exposition montre', () => {
		const salle = lire('routes/showroom.tsx');
		expect(salle).toMatch(
			/import \{ EcranIntrouvable, EcranEnErreur \} from '\.\.\/screens\/passage';/
		);
		expect(salle).toMatch(/ecran === 'introuvable' \? <EcranIntrouvable \/>/);
		expect(salle).toMatch(/ecran === 'erreur' \? <EcranEnErreur \/>/);
	});

	it('offrent chacun un chemin vers l’accueil, en action principale', () => {
		const ecrans = lire('screens/passage.tsx');
		const versAccueil = ecrans.match(/<BoutonPrincipal as=\{Link\} to="\/app">/g) ?? [];
		expect(versAccueil).toHaveLength(2);
	});

	it('ne font jamais du rechargement l’issue principale', () => {
		// Sur un lien de créance périmé, recharger refait l'erreur à l'identique.
		// Le rechargement reste possible, en second, et à un seul endroit.
		const ecrans = lire('screens/passage.tsx');
		expect(ecrans.match(/reload\(\)/g) ?? []).toHaveLength(1);
		expect(ecrans).toMatch(/<BoutonSecondaire onClick=\{\(\) => window\.location\.reload\(\)\}>/);
	});
});
```

- [ ] **Étape 2 : lancer le test pour vérifier qu'il échoue**

```bash
bunx vitest --run src/ui/__tests__/ecrans-de-passage.test.ts --reporter=dot
```

Attendu : ÉCHEC sur les quatre tests. Les deux derniers lèvent `ENOENT` sur
`screens/passage.tsx`, qui n'existe pas encore ; les deux premiers échouent sur leurs motifs.

- [ ] **Étape 3 : créer les deux écrans**

Créer `src/screens/passage.tsx` :

```tsx
import { Link } from '@tanstack/react-router';
import { BoutonPrincipal, BoutonSecondaire } from '../ui';

/**
 * LES ÉCRANS DE PASSAGE : la page introuvable et l'écran d'erreur.
 *
 * ⚠️ ILS ÉTAIENT ÉCRITS EN LIGNE DANS `src/router.tsx`, exportés nulle part, et
 * c'est pour ça que personne ne les avait regardés : aucun écran ne pouvait les
 * importer, pas même la salle d'exposition. Ils parlaient encore la langue
 * d'avant le pivot, et rien ne le signalait.
 *
 * Le produit est en français : un écran d'erreur en anglais serait la seule
 * chose que le gérant verrait dans une autre langue, au pire moment.
 */

/**
 * La page introuvable.
 *
 * ⚠️ ELLE PROPOSE UN CHEMIN, et elle ne le faisait pas. Elle disait « revenez au
 * tableau de bord » sans offrir de lien : le gérant devait deviner comment.
 */
export function EcranIntrouvable() {
	return (
		<div className="flex flex-col items-start gap-cladd-3xs p-cladd-xs">
			<h1 className="text-cladd-md font-semibold">Cette page n&rsquo;existe pas.</h1>
			<p className="text-cladd-xs text-cladd-fg-soft">
				Le lien est peut-être ancien. Revenez à l&rsquo;accueil pour retrouver vos créances.
			</p>
			<BoutonPrincipal as={Link} to="/app">
				Revenir à l&rsquo;accueil
			</BoutonPrincipal>
		</div>
	);
}

/**
 * L'écran d'erreur.
 *
 * Le message technique par défaut de TanStack (« Something went wrong! » suivi
 * d'une trace Convex) est la pire chose qu'un dirigeant puisse lire : il est en
 * anglais, il ne dit pas quoi faire, et il donne l'impression que sa mesure est
 * perdue. Elle ne l'est jamais : les données sont dans Convex, l'écran seul a
 * échoué.
 *
 * ⚠️ RECHARGER N'EST PAS L'ISSUE PRINCIPALE. Sur un lien de créance périmé,
 * recharger refait l'erreur à l'identique, et « rechargez la page » était la
 * seule issue proposée. L'issue principale ramène à l'accueil ; le rechargement
 * reste possible, en second.
 */
export function EcranEnErreur() {
	return (
		<div className="flex h-dvh flex-col items-center justify-center gap-cladd-3xs p-cladd-xs text-center">
			<h1 className="text-cladd-md font-semibold">Cet écran n&rsquo;a pas pu s&rsquo;afficher.</h1>
			<p className="max-w-sm text-cladd-xs text-cladd-fg-soft">
				Vos créances et vos décomptes sont intacts : c&rsquo;est l&rsquo;affichage qui a échoué,
				pas la mesure.
			</p>
			<BoutonPrincipal as={Link} to="/app">
				Revenir à l&rsquo;accueil
			</BoutonPrincipal>
			<BoutonSecondaire onClick={() => window.location.reload()}>Recharger la page</BoutonSecondaire>
		</div>
	);
}
```

⚠️ Les classes reprennent exactement celles des composants d'origine dans `src/router.tsx`. La
hauteur de l'écran d'erreur (`h-dvh`) est conservée : la coquille de la tranche 2 prendra en charge
les erreurs de page, et cette tranche ne change pas la géométrie.

- [ ] **Étape 4 : faire importer les deux écrans par le routeur**

Remplacer `src/router.tsx` entier par :

```tsx
import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { EcranIntrouvable, EcranEnErreur } from './screens/passage';

/**
 * Le point d'entrée du routeur, appelé par TanStack Start côté serveur comme
 * côté client. `routeTree.gen.ts` est généré depuis `src/routes/**` : il n'est
 * jamais édité à la main et n'est pas relu en revue de code.
 */
export function getRouter() {
	return createRouter({
		routeTree,
		defaultPreload: 'intent',
		// Les deux écrans de passage vivent dans `src/screens/passage.tsx`, pour que
		// la salle d'exposition puisse les rendre. Écrits ici en ligne, ils étaient
		// impossibles à regarder. `ecrans-de-passage.test.ts` vérifie que le routeur
		// affiche bien ceux-là, et pas une copie.
		defaultNotFoundComponent: () => <EcranIntrouvable />,
		defaultErrorComponent: () => <EcranEnErreur />
	});
}

declare module '@tanstack/react-router' {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
```

- [ ] **Étape 5 : montrer les deux écrans dans la salle d'exposition**

Dans `src/routes/showroom.tsx`, trois ajouts.

Après la ligne `import { DetailDebiteur } from '../screens/debiteur-detail';` :

```tsx
import { EcranIntrouvable, EcranEnErreur } from '../screens/passage';
```

Dans le tableau `ECRANS`, remplacer :

```tsx
	'muette',
	'coquille'
] as const;
```

par :

```tsx
	'muette',
	'introuvable',
	'erreur',
	'coquille'
] as const;
```

Dans le rendu, juste après la ligne `{ecran === 'muette' ? <DemoSurveillanceMuette /> : null}` :

```tsx
				{ecran === 'introuvable' ? <EcranIntrouvable /> : null}
				{ecran === 'erreur' ? <EcranEnErreur /> : null}
```

- [ ] **Étape 6 : lancer le test pour vérifier qu'il passe**

```bash
bunx vitest --run src/ui/__tests__/ecrans-de-passage.test.ts --reporter=dot
```

Attendu : 4 tests passent.

- [ ] **Étape 7 : mettre en forme, et vérifier les types et le lint**

```bash
bunx prettier --write src/screens/passage.tsx src/router.tsx src/routes/showroom.tsx src/ui/__tests__/ecrans-de-passage.test.ts
```

```bash
bun run check
```

```bash
bunx eslint src/screens/passage.tsx src/router.tsx src/routes/showroom.tsx src/ui/__tests__/ecrans-de-passage.test.ts
```

Attendu : aucune erreur. Deux effets de prettier sont normaux, et aucun test n'en dépend. Le
greffon `prettier-plugin-tailwindcss` réordonne les classes des `className`. Et la ligne du bouton
« Recharger la page » dépasse les 100 colonnes de `.prettierrc` (les tabulations y comptent pour
2) : prettier passe son texte à la ligne, mais laisse intacte la balise ouvrante, qui est ce que le
test lit. Relancer quand même l'étape 6 : la vérification coûte trois secondes.

- [ ] **Étape 8 : commit**

```bash
git add -- src/screens/passage.tsx src/ui/__tests__/ecrans-de-passage.test.ts
git commit --no-verify -m "feat(passage): la page introuvable et l'ecran d'erreur deviennent regardables, et proposent un chemin" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -- src/screens/passage.tsx src/ui/__tests__/ecrans-de-passage.test.ts src/router.tsx src/routes/showroom.tsx
```

```bash
git show --stat HEAD
```

Attendu : exactement les quatre fichiers.

---

## Tâche 2 : la barrière du vocabulaire, qui lit enfin le routeur

**Fichiers :**
- Modifier : `src/ui/__tests__/lignes-rouges.test.ts`
- Modifier : `src/routes/app/route.tsx:30`
- Modifier : `src/routes/nouveau-mot-de-passe.tsx:58`
- Modifier : `src/screens/abonnement/offre.tsx:175`

**Dépend de la tâche 1.** Sans elle, la barrière trouve cinq lignes au lieu de trois.

- [ ] **Étape 1 : déclarer les fichiers isolés**

⚠️ **POURQUOI UNE LISTE À PART.** `ZONES` contient des dossiers, et `fichiers()` fait un
`readdirSync` sur chacun. Sur un fichier, `readdirSync` lève, l'erreur est avalée par le `catch`
(« une zone peut ne pas exister »), et le fichier n'est pas lu. Poser `src/router.tsx` dans
`ZONES` ferait passer la barrière au vert sans rien lire.

Dans `src/ui/__tests__/lignes-rouges.test.ts`, remplacer :

```ts
	join(RACINE, 'lib', 'convex', 'emails')
];
```

par :

```ts
	join(RACINE, 'lib', 'convex', 'emails')
];

/**
 * Les fichiers qui parlent à l'utilisateur sans vivre dans une zone.
 *
 * ⚠️ UN FICHIER NE SE POSE PAS DANS `ZONES`. `fichiers()` y fait un `readdirSync`,
 * qui lève sur un fichier ; le `catch` avale l'erreur comme une zone absente, et
 * le fichier n'est jamais lu. La barrière passerait au vert sans rien vérifier.
 *
 * `src/router.tsx` vit à la racine de `src/`, hors de toute zone. Il portait deux
 * des cinq phrases d'avant le pivot, et ce balayage ne les voyait pas.
 */
const FICHIERS_ISOLES = [join(RACINE, 'router.tsx')];
```

- [ ] **Étape 2 : balayer zones et fichiers isolés par un seul chemin**

Remplacer la fonction `violations` entière :

```ts
function violations(motif: RegExp): { fichier: string; extrait: string }[] {
	const trouvees: { fichier: string; extrait: string }[] = [];

	for (const zone of ZONES) {
		for (const fichier of fichiers(zone)) {
			const propre = sansCommentaires(readFileSync(fichier, 'utf8'));
			for (const ligne of propre.split('\n')) {
				const trouve = motif.exec(ligne);
				if (trouve !== null) {
					trouvees.push({
						fichier: fichier.slice(RACINE.length + 1),
						extrait: ligne.trim().slice(0, 120)
					});
				}
			}
		}
	}

	return trouvees;
}
```

par :

```ts
/** Tout ce qui est balayé : les fichiers des zones, puis les fichiers isolés. */
function aBalayer(): string[] {
	return [...ZONES.flatMap((zone) => fichiers(zone)), ...FICHIERS_ISOLES];
}

function violations(motif: RegExp): { fichier: string; extrait: string }[] {
	const trouvees: { fichier: string; extrait: string }[] = [];

	for (const fichier of aBalayer()) {
		const propre = sansCommentaires(readFileSync(fichier, 'utf8'));
		for (const ligne of propre.split('\n')) {
			const trouve = motif.exec(ligne);
			if (trouve !== null) {
				trouvees.push({
					fichier: fichier.slice(RACINE.length + 1),
					extrait: ligne.trim().slice(0, 120)
				});
			}
		}
	}

	return trouvees;
}
```

Puis, dans le test « balaie un nombre plausible de fichiers », remplacer :

```ts
		const total = ZONES.reduce((somme, zone) => somme + fichiers(zone).length, 0);
```

par :

```ts
		const total = aBalayer().length;
```

- [ ] **Étape 3 : écrire les deux tests**

À la fin du fichier, remplacer :

```ts
	});
});
```

(la toute dernière occurrence, qui ferme le dernier test puis le `describe`) par :

```ts
	});

	it('lit bien les fichiers isolés, et pas seulement leur nom', () => {
		// Le garde-fou sur le garde-fou, pour les fichiers hors zone. Un nom dans une
		// liste ne prouve pas que le fichier est lu : on y cherche un mot qui s'y
		// trouve forcément, par la même machinerie que les lignes rouges.
		const lus = violations(/createRouter/).map((v) => v.fichier);
		expect(lus).toContain('router.tsx');
	});

	it('ne parle plus la langue d’avant le pivot', () => {
		// En recouvrement, le seul taux est celui de la BCE : on ne le « retrouve »
		// pas et on ne le « mesure » pas. « Vos taux » et « tableau de bord » sont
		// des restes d'EGalim, retiré du produit le 3 septembre 2026. Ils ont
		// survécu sur des écrans de passage et sur l'offre d'abonnement, parce qu'un
		// pivot se balaie avec les mots dont on se souvient.
		const fautes = violations(/\bvos taux\b|tableau de bord/i);

		expect(
			fautes,
			`Le vocabulaire d’avant le pivot apparaît ici :\n` +
				fautes.map((f) => `  ${f.fichier} — ${f.extrait}`).join('\n')
		).toEqual([]);
	});
});
```

- [ ] **Étape 4 : lancer la barrière pour la voir échouer**

```bash
bunx vitest --run src/ui/__tests__/lignes-rouges.test.ts --reporter=dot
```

Attendu : 5 tests passent, dont « lit bien les fichiers isolés », et **1 échoue**, « ne parle plus
la langue d'avant le pivot », sur **exactement ces trois lignes** (les séparateurs de chemin
peuvent être des antislashs sous Windows) :

```
routes/app/route.tsx — Reconnectez-vous pour retrouver vos taux et vos factures. Rien n&rsquo;est perdu.
routes/nouveau-mot-de-passe.tsx — explication="Choisissez-en un, et vous retrouverez vos taux et vos factures."
screens/abonnement/offre.tsx — ouvert sans limite et sans carte bancaire : déposez vos factures, mesurez vos taux, et nous
```

⚠️ **Si une quatrième ligne sort, arrêter et rendre compte.** Ne pas l'ajouter en exception, ne pas
élargir la tranche sans le dire. Une ligne de plus est une trouvaille, et sa correction se décide.

⚠️ **Si « lit bien les fichiers isolés » échoue**, la liste n'est pas lue : ne pas continuer, la
barrière serait décorative.

- [ ] **Étape 5 : remplacer les trois phrases**

Dans `src/routes/app/route.tsx`, remplacer :

```tsx
					Reconnectez-vous pour retrouver vos taux et vos factures. Rien n&rsquo;est perdu.
```

par :

```tsx
					Reconnectez-vous pour retrouver vos créances et vos décomptes. Rien n&rsquo;est perdu.
```

Dans `src/routes/nouveau-mot-de-passe.tsx`, remplacer :

```tsx
			explication="Choisissez-en un, et vous retrouverez vos taux et vos factures."
```

par :

```tsx
			explication="Choisissez-en un, et vous retrouverez vos créances et vos décomptes."
```

Dans `src/screens/abonnement/offre.tsx`, remplacer :

```tsx
				ouvert sans limite et sans carte bancaire : déposez vos factures, mesurez vos taux, et nous
```

par :

```tsx
				ouvert sans limite et sans carte bancaire : déposez vos factures, voyez ce qui vous est dû, et nous
```

- [ ] **Étape 6 : mettre en forme**

```bash
bunx prettier --write src/routes/app/route.tsx src/routes/nouveau-mot-de-passe.tsx src/screens/abonnement/offre.tsx src/ui/__tests__/lignes-rouges.test.ts
```

La nouvelle ligne de `offre.tsx` fait 107 colonnes (quatre tabulations à 2 colonnes, plus 99
caractères), au-delà des 100 de `.prettierrc` : prettier la replie. C'est attendu, et la barrière
ne dépend pas du découpage des lignes, puisque « vos taux » a disparu.

- [ ] **Étape 7 : relancer la barrière**

```bash
bunx vitest --run src/ui/__tests__/lignes-rouges.test.ts --reporter=dot
```

Attendu : 6 tests passent.

- [ ] **Étape 8 : commit**

```bash
git commit --no-verify -m "feat(vocabulaire): la barriere des lignes rouges lit enfin le routeur, et le pivot finit de se balayer" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>" -- src/ui/__tests__/lignes-rouges.test.ts src/routes/app/route.tsx src/routes/nouveau-mot-de-passe.tsx src/screens/abonnement/offre.tsx
```

```bash
git show --stat HEAD
```

Attendu : exactement les quatre fichiers.

---

## Tâche 3 : vérifier la tranche entière

- [ ] **Étape 1 : toute la suite, pas deux dossiers**

```bash
bun run test:unit
```

Attendu : tout passe, avec un fichier et six tests de plus qu'avant la tranche (89 fichiers et
1 050 tests au dernier passage complet). Au chantier 1, une barrière est restée rouge une tâche
entière parce qu'elle vivait hors des dossiers relancés : on relance tout.

- [ ] **Étape 2 : les types**

```bash
bun run check
```

Attendu : aucune erreur.

- [ ] **Étape 3 : le lint des fichiers touchés**

```bash
bunx eslint src/screens/passage.tsx src/router.tsx src/routes/showroom.tsx src/ui/__tests__/ecrans-de-passage.test.ts src/ui/__tests__/lignes-rouges.test.ts src/routes/app/route.tsx src/routes/nouveau-mot-de-passe.tsx src/screens/abonnement/offre.tsx
```

Attendu : aucune sortie. `bun run lint` compte quatre erreurs `convex(no-invalid-module-path)`
antérieures à cette tranche, dans `src/lib/convex/__tests__/` : elles ne la concernent pas.

- [ ] **Étape 4 : le regard, fait par le coordinateur au navigateur**

Ouvrir `http://localhost:20173/showroom`, écrans `introuvable` puis `erreur`, à 375 et 1280 px.
Mesurer au DOM : pas de débordement horizontal, et chaque bouton d'au moins 48 px de haut, le
plancher tactile du projet. Un agent sans navigateur ne fait pas cette étape.

- [ ] **Étape 5 : les critères de la tranche**

1. `lignes-rouges.test.ts` est vert et lit `src/router.tsx`, preuve à l'appui.
2. La page introuvable et l'écran d'erreur s'ouvrent dans la salle d'exposition.
3. Tous deux proposent l'accueil en action principale ; l'erreur garde le rechargement en second.

La fusion vers `main` et la poussée se décident avec l'utilisateur, pas dans ce plan.
