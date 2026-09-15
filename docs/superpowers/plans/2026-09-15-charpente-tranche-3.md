# Charpente, tranche 3 : les deux volets. Plan court

Spec : `docs/superpowers/specs/2026-09-14-charpente-navigation-design.md`, § 5. Décisions de départ :
`docs/superpowers/notes/DESIGN-TRANCHE-3.md`. Faits prouvés : `docs/superpowers/notes/SYNTHESE.md`,
« Seconde enquête ». Branche `chantier/charpente-tranche-3`, partie de `f507a00`. La tranche 4
refait le retour en même temps sur une autre branche partie du même commit : ce plan ne touche ni
à la logique du retour ni aux composants de lien, sauf `selectionnee` sur `LigneAnalyse`.

## Décisions

**D1. `MaitreDetail`, dans `src/ui/maitre-detail.tsx`.** Deux conteneurs frères, le détail rendu
UNE fois (il peut donc recevoir un `<Outlet />`). Sous 1024 px, un seul visible, choisi par
`detailOuvert`, dérivé de l'adresse : maître `hidden lg:flex` ou `flex`, détail l'inverse. Chaque
volet est une page entière (`PageEcran`, son en-tête, son `PageBody` qui défile, son propre
squelette). Un détail `null` rend le maître seul, pleine largeur.

- Largeur (motif Mobbin 2) : maître FIXE proche d'un téléphone, `lg:w-[26rem]` (416 px, en rem pour
  échapper à l'échelle d'espacement décalée de `tokens.css`), détail `flex-1`. Pas de `w-2/5`.
- `useDeuxVolets()` : `useSyncExternalStore` sur `matchMedia('(min-width: 1024px)')`, instantané
  serveur `false`. Il ne sert qu'à la sélection PAR DÉFAUT (anneau fantôme sous 1024 px).

**D2. Le retour masqué en volets.** `RetourEcran.masqueEnVolets?: boolean` : `EnteteDetail` ajoute
`lg:hidden` au lien, rien d'autre. Vrai pour les six analyses, l'établissement, le créancier et le
bilan d'un dépôt. Faux (visible) pour habitude, pièces, inviter, premier bilan, suivi, export.

**D3. La rangée ouverte.** `LigneAnalyse.selectionnee?: boolean` passe `selected` au `ListButton`
du kit. Définie (vraie ou fausse), elle dit que la rangée sert de maître : son chevron devient
`lg:hidden` (motif 3 : pas de chevron et d'anneau sur la même rangée). Une rangée explicitement
ouverte est sélectionnée ; la rangée par défaut ne l'est qu'avec `useDeuxVolets()`.

**D4. La feuille de `TwoPane`** (motif 7 b) : le `<button>` « Fermer » écrit à la main devient un
`Button` du kit, icône croix seule, `aria-label="Fermer"`, en haut à gauche.

**D5. Une route qui rend le composant d'une autre** lit les paramètres du PARENT
(`useParams({ from: '/app/creance/$id' })`), jamais `Route.useParams()` : sinon « Invariant failed ».
Les composants partagés sont des exports nommés du fichier de route.

## Écrans, dans l'ordre de livraison

1. **Primitive** (`src/ui/`) : `maitre-detail.tsx`, export dans `index.ts`, `navigation.tsx`
   (D2, D3), `page-ecran.tsx` (D2), `two-pane.tsx` (D4).
2. **Créance.** `git mv creance_.$id.*.tsx` vers `creance.$id.*.tsx` (six). `creance.$id.tsx`
   rend `EcranCreance` avec `detail={<Outlet />}` et l'analyse ouverte, lue par
   `useChildMatches()` (feuille dont le `routeId` ne finit pas par `/`). Nouveau
   `creance.$id.index.tsx` : l'analyse par défaut, sans réécrire l'adresse, par
   `analyseParDefaut()` (dans `screens/creance.tsx`, partagée avec l'écran) : la première rangée
   `attention` (le litige quand il reste à confirmer), sinon le décompte. En attente, un squelette
   d'analyse. Salle : le maître montre l'analyse par défaut, chaque analyse montre le maître.
3. **Débiteur.** `git mv debiteurs_.$id.{habitude,pieces}.tsx` vers `debiteurs.$id.*`, sans
   `debiteurs.$id.tsx`. `debiteurs.tsx` : enfant apparié, `MaitreDetail` avec `<Outlet />` ; sinon
   `TwoPane` et `DetailDebiteur` comme aujourd'hui. Sélection : `d ?? useParams({ strict: false }).id`,
   puis, à partir de 1024 px seulement, le premier débiteur du tri (motif 4), jamais écrit dans
   l'adresse. Liens vers habitude et pièces : `recherche={true}` pour garder `?d=`.
4. **Imports.** `git mv import-factures_.$id.tsx import-factures.$id.tsx`. Enfant apparié :
   `MaitreDetail` ; sinon le maître seul, pleine largeur (le volet droit ne montre rien, sans
   laisser 60 % d'écran mort). Rangée du dépôt ouvert sélectionnée.
5. **Réglages**, en dernier. Mise en page sans chemin, forme plate : `parametres.tsx` devient
   `_reglages.tsx` (la liste garde son histoire), et `_reglages.parametres.tsx`, neuf, rend
   l'établissement par défaut. Par `git mv` : `_reglages.parametres_.etablissement`,
   `_reglages.parametres_.creancier`, `_reglages.abonnement`, `_reglages.abonnement_.premier-bilan`,
   `_reglages.abonnement_.suivi`, `_reglages.equipe`, `_reglages.equipe_.inviter`,
   `_reglages.donnees`, `_reglages.donnees_.export`. `donnees_.supprimer-*`
   restent dehors, pleine largeur. La liste vit dans `_reglages.tsx` ; section ouverte par le
   `routeId` de la feuille. `EcranReglages` (motif 8) : groupes « Recouvrement » (établissement,
   créancier) et « Compte » (abonnement, équipe, vos données), Apparence en `ListItem` avec son
   `Segmented`, Se déconnecter en rangée seule, sans chevron. Corriger
   `aucun-ecran-orphelin.test.ts` : la conversion id vers URL retire les segments sans chemin.

Après chaque renommage : `bun run build` régénère `src/routeTree.gen.ts`, committé avec le lot.
Le registre de la salle (`src/routes/-salle/*.tsx`) suit les nouvelles chaînes dans le même lot.

## Hors de ce plan, nommé

- Recherche, filtres en chips, `?q=` (motif 1) : tranche 5.
- Rangées groupées avec total, tri déclaré (motif 2), détail qui commence par son verdict et bloc
  d'attention unique (motifs 5 et 6) : une tranche de contenu, pas de charpente.
- Titre du détail en h2 à partir de 1024 px (motif 7 a) : il vit dans `EnteteDetail`, que la
  tranche 4 réécrit en même temps. À reprendre après la fusion des deux.
- Valeurs en trois mots sur les rangées abonnement et équipe : il faudrait deux lectures de plus
  dans la mise en page des réglages.

## Vérification, une fois, à la fin

`bun run check`, `bun run lint`, `bun run test:unit`. Aucun test neuf. Regard au navigateur à
1023 et 1024 px (anneau `selected` sous `verre-bouton`, largeur du maître) : à faire par Jules ou
une session suivante, pas dans cette tranche.

## État (15 septembre 2026)

Les cinq lots sont committés : primitive `553a16b`, créance `f3b9bd1`, débiteur `fd12747`, imports
`a50661d`, réglages `57fb69f`. Rien n'est poussé. Restent :

- le regard au navigateur ci-dessus, et le h2 du détail en volets après la fusion avec la tranche 4 ;
- `PageDecompte`, `PageLitige` et `PageEtablissement` sont exportées de leur fichier de route : le
  plugin prévient qu'elles ne sont plus découpées. Les déplacer hors des routes si le poids compte.
