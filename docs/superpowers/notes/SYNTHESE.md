# Synthèse de la recherche (14 septembre 2026), pour les plans des tranches 3 à 5

Preuves complètes : fichiers du même dossier (`run-generator.cjs`, `generator-output.txt`, `cas/`, `q3-types/`, `q3-navigateur/`, `convex-text-search.md`, `convex-backend-*.rs`).

## Tranche 3 : imbrication et mise en page sans chemin

- **Retirer le `_` final suffit à imbriquer, sans changer d'URL.** `debiteurs.$id.habitude.tsx` (sans `debiteurs.$id.tsx`) devient enfant direct de `debiteurs.tsx` : id `/app/debiteurs/$id/habitude`, path `/$id/habitude`, fullPath inchangé. Le `$id` appartient au chemin de l'enfant.
- **Ne PAS créer `debiteurs.$id.tsx`** : cela ajouterait l'URL `/app/debiteurs/$id`.
- **Créance** : `creance.$id.decompte.tsx` devient enfant de `creance.$id.tsx`, fullPath `/app/creance/$id/decompte`. Le parent doit rendre `<Outlet />`.
- **Le générateur réécrit la chaîne de `createFileRoute`** au renommage (`transform.cjs:43-56`).
- **Mise en page sans chemin `_reglages`** : forme plate (`_reglages.tsx`, `_reglages.parametres.tsx`…) ou dossier (`_reglages/route.tsx`). Id `/app/_reglages`, fullPath `/app`. Les enfants gardent leurs URL.
  - `_reglages.parametres.creancier.tsx` s'imbrique DANS `parametres` (Outlet requis dans parametres).
  - `_reglages.parametres_.creancier.tsx` est enfant direct de la mise en page, même URL.
  - **Il faut SUPPRIMER l'ancien fichier** : `donnees.tsx` à côté de `_reglages.donnees.tsx` fait échouer la génération (« Conflicting configuration paths »), aucun arbre écrit.
  - `donnees_.supprimer-compte.tsx` et `donnees_.supprimer-etablissement.tsx` restent enfants de `/app`, hors mise en page, URL inchangées, sans conflit.
  - Les ids changent (`/app/_reglages/parametres`). Aucun `from: '/app/…'` ni `getRouteApi(` dans `src`.
- ⚠️ **`src/ui/__tests__/aucun-ecran-orphelin.test.ts:72-76` casse** : sa conversion id → URL (`replace(/_(?=\/)/g, '')`) ne retire que le `_` final ; il garderait `/_reglages/` et déclarerait `/app/_reglages/parametres` orpheline. Retirer aussi les segments sans chemin (`/_[^/]+`).
- `destinations-existent` lit ids ET fullPaths : les ids en plus ne gênent pas.
- ⚠️ `salle-complete.test.ts` (tranche 2) compare les chaînes de `createFileRoute` au registre : chaque renommage réécrit la chaîne, le registre doit suivre. Et ce test ne lit que `src/routes/app/*.tsx` au premier niveau : un dossier `_reglages/` ne serait pas lu.

### Seconde enquête (volets maître/détail), preuves dans `../recherche-volets/`

Mesuré sur le vrai routeur du dépôt, rendu serveur ET client comparés (identiques, sauf les clés aléatoires de `location.state`).

- **Savoir quel enfant est ouvert, depuis le parent** : `useChildMatches()` (le plus direct). `<Outlet />` rend `null` sans enfant (`Match.js:155`). Un enfant index a un `routeId` qui finit par `/` (`/app/creance/$id/`). `matchRoute({ to: '/app/creance/$id' })` exact : vrai à l'index, faux sur `/decompte`. `useMatch({ strict: false })` rend le match du parent lui-même : inutile ici.
- **Index sous `creance.$id`** : `creance.$id.index.tsx` → id `/app/creance/$id/`, fullPath `/app/creance/$id/`. `FileRoutesByTo` n'a que `/app/creance/$id` (pointe l'index). `<Link to="/app/creance/$id">` → `href="/app/creance/c1"`, sans avertissement. `trailingSlash` vaut `'never'` ; le serveur redirige `/app/creance/c1/` en 307. `routesDeclarees()` de la barrière des orphelins retire la barre finale : pas de faux orphelin.
- **Paramètres** : dans un enfant ou l'index, `useParams({ from: '/app/creance/$id' })` marche. Dans le PARENT `/app/debiteurs`, `useParams({ strict: false })` lit le `$id` de l'enfant (`string | undefined`). ⚠️ Rendre le composant d'une route enfant NON appariée lève « Invariant failed: Could not find an active match from "…" » : le contenu d'une analyse rendu par défaut doit lire les paramètres du PARENT, jamais `Route.useParams()` de sa propre route.
- **`?d=` et l'enfant imbriqué** : un `<Link>` avec seulement `params` perd `d` (`search` absent → `{}`). `search={(prev) => prev}` ou `search={true}` le garde (`…/habitude?d=x`), typé. Le `validateSearch` du parent tourne aussi pour l'URL de l'enfant ; `useSearch()` rend la recherche fusionnée, clés inconnues comprises.
- **`_reglages`** : chaînes actives mesurées (`/app/parametres` → `_reglages` + `_reglages/parametres` ; `/app/donnees/supprimer-compte` hors mise en page). La mise en page lit la FEUILLE par `useChildMatches()` ; `matchRoute` flou est un préfixe et ne distingue pas `/app/parametres` de `/app/parametres/creancier`. ⚠️ `_reglages.index.tsx` entre en conflit avec `app/index.tsx` (tous deux `/app/`) : la liste vit DANS la mise en page, et `_reglages.parametres.tsx` rend la section par défaut.
- **SSR** : ces lectures ne dérivent que de l'URL (`pathname`, `search`) ; rendus serveur et client identiques sur les 18 URL mesurées.
- **Réactif sans JavaScript** : aucun crochet de point de rupture dans `src` ; pas de `--breakpoint-*` redéfini (lg = 64rem = 1024 px). Des classes calculées depuis l'URL (liste `enfantOuvert ? 'hidden lg:block' : 'block'`, détail l'inverse) donnent un volet sous 1024 px, deux à partir de 1024 px. Mesuré à 375, 768, 1023, 1024, 1280.
  - Un volet masqué reste MONTÉ (ses requêtes Convex tournent).
  - ⚠️ **Deux `<Outlet />` montent l'enfant deux fois.** `TwoPane` rend `preuve` deux fois (volet `aside` + feuille mobile, `two-pane.tsx:33-50`) : il ne peut pas recevoir un `<Outlet />` tel quel. Les écrans maîtres imbriqués ont besoin d'une disposition qui rend le détail UNE fois et bascule par classes CSS (dans `src/ui/**`, à cause de la muselière).
- **Recommandations par écran** :
  - Créance : `creance_.$id.*` → `creance.$id.*` ; le parent rend la liste et UN `<Outlet />` ; « analyse ouverte » = `useChildMatches()` contient autre chose que l'index ; `creance.$id.index.tsx` rend l'analyse par défaut sans réécrire l'adresse ; retour masqué à partir de 1024 px (`lg:hidden`).
  - Débiteur : `debiteurs_.$id.*` → `debiteurs.$id.*`, sans `debiteurs.$id.tsx` ; volet droit = `<Outlet />` si un enfant est apparié, sinon `DetailDebiteur` ; sélection = `d ?? useParams({ strict: false }).id` ; liens vers habitude et pièces avec `search={(prev) => prev}` ; sous 1024 px, masquer la liste en CSS.
  - Réglages : `_reglages` avec les noms relevés, anciens fichiers supprimés, `donnees_.supprimer-*` dehors ; section active par `routeId` de la feuille ; `_reglages.parametres.tsx` rend l'établissement ; corriger la conversion id → URL de `aucun-ecran-orphelin` (segments `/_x`).
  - Imports : `import-factures_.$id.tsx` → `import-factures.$id.tsx` ; sans index, l'`Outlet` est `null` sur `/app/import-factures` : le parent fournit ce que montre le volet droit.
- **Non établi** : l'hydratation réelle de TanStack Start et le découpage de code du plugin Vite ; les routes avec requêtes Convex (attente, abonnement d'un volet masqué) ; le défilement et le focus quand le volet droit change ; les types rendus par `useChildMatches()`.

## Tranche 4 : le retour par l'historique

- `useCanGoBack()` exporté, booléen, calculé `location.state.__TSR_index !== 0` (`useCanGoBack.js:7-8`). Expérimental d'après la doc ; l'index repart à 0 après un `reloadDocument`.
- `HistoryState` s'augmente : `declare module '@tanstack/react-router' { interface HistoryState { … } }` (tsc vérifié).
- `<Link state={…}>` : objet, fonction de mise à jour, ou `true` pour garder l'état courant. **Sans `state`, la navigation met `{}`** : le titre ne se transmet pas tout seul.
- Lecture : `useLocation().state` ou `useRouterState({ select: s => s.location.state })`, identiques.
- Sonde au navigateur : l'état survit au rechargement réel ; `history.back()` restaure l'état de l'entrée précédente ; clés internes `key`, `__TSR_key`, `__TSR_index`, `__hashScrollIntoViewOptions`.
- ⚠️ **SSR** : le serveur rend depuis une mémoire qui n'a que l'URL (`createRequestHandler.js:60`). Un titre lu dans l'état au premier rendu après rechargement diffère entre serveur et client : désaccord d'hydratation. Lire l'état après montage (sans `setState` dans un effet : `useSyncExternalStore` avec un instantané serveur de repli), ou rendre le libellé de repli des deux côtés au premier rendu.

## Tranche 5 : la recherche Convex

- Analyseur Tantivy `SimpleTokenizer` + suppression des jetons ≥ 32 octets + minuscules. Coupe sur tout caractère non alphanumérique : `FA-2026-0311` → `fa`, `2026`, `0311`.
- Termes combinés en OU, classés par pertinence ; **préfixe sur le DERNIER jeton seulement** ; pas de flou (déprécié depuis 2025-01-15).
- `FA-2026` ramène aussi tout ce qui contient `fa` ; `fa` ramène `facture`… ; `311` et `FA2026` ne trouvent pas `FA-2026-0311`.
- Filtres : `.eq` seulement (terme exact obligatoire), 16 champs de filtre, 8 expressions ; 16 termes de requête (le reste ignoré en silence) ; 1024 documents parcourus au plus (au-delà, erreur) ; ordre de pertinence seulement.
- **Conséquence** : une référence tapée en entier se résout d'abord par l'index ordinaire `by_org_and_reference` (égalité), la recherche plein texte ne sert qu'au partiel. Le « total vrai » d'une section ne peut pas venir de la recherche plein texte au-delà de 1024 : le borner et le dire.

## Environnement

- `C:\Users\jules\node_modules` contient React 18.2.0 : tout script résolu hors du dépôt le prend.
