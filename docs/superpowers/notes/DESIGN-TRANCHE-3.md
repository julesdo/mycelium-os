# Tranche 3 (les deux volets) : décisions de conception à porter dans le plan

Brouillon d'orchestrateur, 14 septembre 2026. À écrire en plan UNE FOIS la tranche 2 livrée, sur le code tel qu'il sera (écrans `src/screens/analyses/*`, `debiteurs.tsx`, `debiteur/*`, `parametres/*`, `abonnement/*`, `equipe/*`, `donnees/*`, `import/*`). Faits prouvés : `SYNTHESE.md`, section « Seconde enquête ».

## 1. La disposition maître/détail : une primitive neuve, le détail rendu UNE fois

- `TwoPane` rend `preuve` deux fois (volet + feuille mobile) : il ne peut pas recevoir un `<Outlet />`. Il reste pour les SÉLECTIONS par paramètre (`?d=`, `?p=`), où la feuille mobile a du sens.
- Nouvelle primitive dans `src/ui/` (nom de travail `MaitreDetail`) : deux conteneurs côte à côte à partir de 1024 px, le détail rendu une fois ; sous 1024 px, UN seul visible, choisi par `detailOuvert` (dérivé de l'URL, donc identique serveur/client) : maître `detailOuvert ? 'hidden lg:flex' : 'flex'`, détail `detailOuvert ? 'flex' : 'hidden lg:flex'`.
- Chaque volet est une page entière (`PageEcran`, `h-full`, son propre `PageBody` qui défile) : le maître garde son en-tête, le détail a le sien.
- Largeurs à trancher (et à regarder à 1024 et 1280) : maître étroit, détail large pour les tableaux du décompte ? Par défaut proposer maître `w-2/5 max-w-xl`, détail `flex-1`. ⚠️ Une colonne de lecture `max-w-2xl` centrée dans le détail reste lisible.
- Les écrans maîtres reçoivent `detail: ReactNode` et `detailOuvert: boolean` en props : la route passe `<Outlet />`, la salle d'exposition passe un vrai écran de détail. La salle peut ainsi montrer les deux volets.

## 2. Le retour dans un volet

- Règle de la spec : pas de retour quand le volet gauche montre déjà la destination ; un retour quand le volet droit a remplacé un détail devenu invisible.
- Proposition : `RetourEcran.masqueEnVolets?: boolean` → le lien reçoit `lg:hidden`. Vrai pour les six analyses de la créance, les sections des réglages (établissement, créancier, abonnement, équipe, données) et le bilan d'un dépôt. Faux (retour visible) pour habitude et pièces (elles remplacent la fiche du débiteur), et pour inviter, premier bilan, suivi, export (ils remplacent leur section).
- ⚠️ La tranche 4 refera le retour par l'historique : garder ce drapeau simple, il y survivra.

## 3. Écran par écran

### Créance
- Renommer `creance_.$id.{decompte,litige,procedure,relances,risques,solidite}.tsx` → `creance.$id.*` (le générateur réécrit les chaînes de `createFileRoute`).
- `creance.$id.tsx` rend `EcranCreance` en maître et `<Outlet />` en détail ; `detailOuvert` = `useChildMatches()` contient un `routeId` qui ne finit pas par `/`.
- Ajouter `creance.$id.index.tsx` : le volet droit par défaut à `/app/creance/$id`, sans réécrire l'adresse. Il ouvre la PREMIÈRE rangée marquée `attention` (aujourd'hui : litige quand `aDemander > 0`), sinon le décompte. Sous 1024 px il est masqué (`detailOuvert` faux), mais reste monté : ses requêtes tournent (même `creanceComplete`, en cache).
- ⚠️ Les routes d'analyse lisent `useParams({ from: '/app/creance/$id' })`, JAMAIS `Route.useParams()` : l'index rend leur composant hors de leur propre appariement (sinon « Invariant failed »). Extraire chaque composant de route (`PageDecompte`…) en export nommé pour que l'index l'importe.
- Rangée active dans la liste de gauche : `LigneAnalyse` gagne un état `selectionnee` (anneau du kit `selected`), dérivé du `routeId` de l'enfant.

### Débiteur
- Renommer `debiteurs_.$id.{habitude,pieces}.tsx` → `debiteurs.$id.*` ; NE PAS créer `debiteurs.$id.tsx`.
- `debiteurs.tsx` : si un enfant est apparié, le volet droit est `<Outlet />` (disposition maître/détail, retour visible) ; sinon, la disposition actuelle `TwoPane` avec `DetailDebiteur` et la feuille mobile.
- Sélection : `d ?? useParams({ strict: false }).id`.
- Liens vers habitude et pièces (dans `DetailDebiteur`) : `search={(prev) => prev}` pour garder `?d=`. Le retour d'habitude/pièces garde `recherche: { d }`.

### Réglages
- Mise en page sans chemin `_reglages.tsx`, forme PLATE (la barrière `salle-complete` ne lit que `src/routes/app/*.tsx` au premier niveau) :
  `_reglages.parametres.tsx`, `_reglages.parametres_.etablissement.tsx`, `_reglages.parametres_.creancier.tsx`, `_reglages.abonnement.tsx`, `_reglages.abonnement_.premier-bilan.tsx`, `_reglages.abonnement_.suivi.tsx`, `_reglages.equipe.tsx`, `_reglages.equipe_.inviter.tsx`, `_reglages.donnees.tsx`, `_reglages.donnees_.export.tsx`. SUPPRIMER les anciens fichiers (sinon conflit de chemins, aucun arbre écrit). `donnees_.supprimer-compte.tsx` et `donnees_.supprimer-etablissement.tsx` restent dehors, pleine largeur.
- La liste des réglages vit DANS `_reglages.tsx` (un `_reglages.index.tsx` entrerait en conflit avec `app/index.tsx`). `_reglages.parametres.tsx` rend la section par défaut (établissement) ; à `/app/parametres`, `detailOuvert` est faux (la feuille est la liste elle-même).
- Section active : `routeId` de la feuille par `useChildMatches()`, pas `matchRoute` flou.
- ⚠️ Corriger `src/ui/__tests__/aucun-ecran-orphelin.test.ts` : la conversion id → URL doit retirer les segments sans chemin (`/_reglages`), en plus du `_` final.
- ⚠️ Le registre de la salle (`src/routes/-salle/ecrans.tsx`) suit les nouvelles chaînes `/app/_reglages/…`.
- Question ouverte : l'écran `EcranReglages` porte aujourd'hui Apparence et Se déconnecter en plus des cinq sections : ils restent dans la liste de gauche.

### Imports
- Renommer `import-factures_.$id.tsx` → `import-factures.$id.tsx`.
- Sans dépôt ouvert, l'`Outlet` est `null` : le volet droit montre… à trancher (proposition : rien, comme les procédures sans dossier ouvert ; la spec n'impose pas de défaut pour les imports).

## 4. Ce qui garde une colonne (spec § 5.3)
- La révélation ; les suppressions de compte et d'établissement (hors `_reglages`) ; inviter, premier bilan, suivi, export s'ouvrent dans le volet droit à leur largeur de lecture.

## 5. Barrières et tests à prévoir
- `aucun-ecran-orphelin` : segments sans chemin.
- `salle-complete` : nouvelles chaînes de route ; peut-être lire aussi les index (`creance.$id.index.tsx` déclare `/app/creance/$id/` : l'exclure ou l'inscrire au registre ?).
- Un test de la primitive maître/détail (rendu serveur : deux conteneurs, classes selon `detailOuvert`, détail rendu une fois).
- Regard aux quatre largeurs : 1023 vs 1024 px est la frontière à vérifier.
