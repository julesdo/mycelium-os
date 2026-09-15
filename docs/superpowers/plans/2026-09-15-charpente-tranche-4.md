# Charpente, tranche 4 : le retour qui ramène d'où l'on vient

Spec : `docs/superpowers/specs/2026-09-14-charpente-navigation-design.md`, § 6. Brouillon :
`docs/superpowers/notes/DESIGN-TRANCHE-4.md`. Faits : `docs/superpowers/notes/SYNTHESE.md`,
section « Tranche 4 ». Branche `chantier/charpente-tranche-4`, partie de `f507a00`.

⚠️ La tranche 3 (deux volets) avance en même temps sur une autre branche partie du même commit.
Elle renomme les routes de la créance, du débiteur, des imports et des réglages, et ajoute
`masqueEnVolets` au retour. Cette tranche ne renomme donc aucune route et n'ajoute pas ce drapeau.
La fusion croisera les mêmes objets `retour` : conflits d'une ligne, attendus.

## Vérifié au code avant d'écrire

1. `useCanGoBack()` lit `router.stores.location` (`useCanGoBack.js`) ; `stores.location` est
   public (`router.d.ts`, ligne 651), avec `get()` et `subscribe()` (`@tanstack/store` 0.9.3).
2. `Link` est `LinkComponent<'a'>` (`link.d.ts`, ligne 79). `useHydrated` existe mais la tâche
   demande `useSyncExternalStore` avec un instantané serveur nul.
3. Le bouton `Button` du kit tronque sur une ligne sans `multiline`, dimensionne l'icône enfant,
   et `md` vaut 48 px par `tokens.css`.
4. Sous 1024 px, `preuveOuverte` des débiteurs vaut déjà `choisi !== null`, lu dans `?d=`
   (`screens/debiteurs.tsx`, ligne 176) : `back()` comme le repli rouvrent la bonne feuille.
5. Une seule navigation impérative vise une page poussée : `navigate` vers la créance après
   `constituer()` (`routes/app/debiteurs.tsx`, ligne 405). Les autres restent sur leur écran
   (`?d=`, `?p=`) ou sortent de l'espace.
6. Titres d'onglet et libellés de retour divergent aujourd'hui : « Vos débiteurs » contre le nom
   du débiteur (habitude, pièces), « Équipe » contre « Votre équipe », « Importer vos factures »
   contre « Importer ».

## Décisions

**D1. Le titre voyage dans l'état de la navigation.** `declare module '@tanstack/react-router'`
augmente `HistoryState` de `titreDeProvenance?: string`, dans `src/ui/lien.tsx`.

**D2. `PageEcran` publie son titre** par un contexte `TitreEcran`, fourni autour de tout ce qu'il
rend (en-tête, volets, feuille). Le genre `aucun` porte désormais un `titre` : l'accueil publie
« Accueil » sans le dessiner. Le titre publié est le `titre` de l'en-tête, jamais l'élément
sélectionné : la créance ouverte depuis le volet d'un débiteur dit « Vos débiteurs ».

**D3. Un seul composant de lien, `Lien`** (`src/ui/lien.tsx`), mêmes props que `Link`, qui écrit
`state` depuis le contexte. `useProvenance()` rend le même état pour la seule navigation
impérative : le volet du débiteur le passe à `onConstituer`, la route le met dans `navigate`.
Tous les `Link` de `src/ui` et `src/screens` deviennent `Lien`, `LigneAnalyse` compris.
Barrière exécutable : `bun run lint` refuse `Link` et `useNavigate` importés du routeur dans
`src/ui` et `src/screens`. Seule exception, écrite au point d'usage : le repli d'`EnteteDetail`,
qui ne transmet aucune provenance (sinon la créance rouverte depuis une analyse reviendrait à
l'analyse, en boucle).

**D4. `EnteteDetail` choisit sa branche, jamais un mélange.**

- `useCanGoBack()` ET un titre de provenance : `Button` qui fait `router.history.back()`, libellé
  = titre de provenance.
- sinon : `Button as={Link}` vers le parent de l'adresse, libellé = `retour.libelle`.
- Le titre se lit par `useSyncExternalStore` sur `router.stores.location` (la source même de
  `useCanGoBack`, validée à la fin d'une navigation et non à son départ), instantané serveur
  `null` : le serveur et l'hydratation rendent le repli, le client bascule ensuite.
- Même pastille dans les deux branches : `Button` `rounded`, `md`, `variant="transparent"`,
  `outline={false}`, `hoverable={false}`, classe `verre-bouton`, `ChevronLeftIcon` en enfant
  sans taille. On retire `min-h-12` et `size-4`. Un titre long se tronque, le h1 ne bouge pas.

**D5. Le nom connu du parent a une seule source.** `src/screens/titres.ts` porte les titres des
écrans qu'une page poussée nomme en repli ; le parent en tire son `titre`, l'enfant son
`retour.libelle`. Les analyses gardent le nom du débiteur, qui est déjà le titre de la créance.
Habitude et pièces perdent le nom du débiteur dans la pastille : il passe en sous-titre, pour que
la page s'identifie seule.

**D6. La créance passe en `poussee`.** Retour vers `/app/debiteurs?d=<son débiteur>`, libellé
« Vos débiteurs ». En attente et en erreur, l'identifiant du débiteur n'est pas connu : repli
vers `/app/debiteurs` sans `?d=`, même libellé.

**D7. Une seule sortie par page poussée en erreur.** Sans `issue` nommée, l'erreur d'une page
poussée ne rajoute plus « Revenir à l'accueil » sous la pastille : la pastille est l'issue,
« Recharger la page » reste en second. Un onglet garde l'accueil par défaut.

**D8. Hors de cette tranche.** La barre d'onglets reste déduite de l'adresse. La feuille de
`TwoPane` et sa fermeture : tranche 3. La requête dans l'adresse : tranche 5.

## Fichiers

- Créés : `src/ui/lien.tsx`, `src/screens/titres.ts`.
- `src/ui/` : `page-ecran.tsx`, `navigation.tsx`, `index.ts`, `flux-evenements.tsx`,
  `veilleur.tsx`, `ce-qui-manque.tsx`, `actions.tsx`.
- `src/screens/` : `accueil`, `creance`, `debiteurs`, `debiteur-detail`, `procedures`,
  `revelation`, `passage`, `sans-etablissement`, `parametres/reglages`, `parametres/creancier`,
  `parametres/etablissement`, `abonnement/abonnement`, `abonnement/offre`,
  `abonnement/premier-bilan`, `abonnement/suivi`, `equipe/equipe`, `equipe/inviter`,
  `donnees/donnees`, `donnees/export`, `donnees/supprimer-compte`,
  `donnees/supprimer-etablissement`, `import/depots`, `import/depot`, `debiteur/habitude`,
  `debiteur/pieces`.
- `src/routes/app/debiteurs.tsx` (la provenance dans `navigate`), `eslint.config.js`.
- Test existant ajusté seulement s'il casse : `src/ui/__tests__/page-ecran.test.tsx` (le genre
  `aucun` prend un titre ; le routeur simulé gagne `useRouter` et `useCanGoBack`).
- Aucune route renommée ni ajoutée : `routeTree.gen.ts` et la salle d'exposition ne bougent pas.

## Ordre des commits

1. Ce plan.
2. La provenance : `lien.tsx`, le contexte publié par `PageEcran`, tous les liens, la navigation
   après `constituer()`, la barrière de lint.
3. Le retour : `EnteteDetail` à deux branches, l'erreur d'une page poussée.
4. Les titres à une source, et la créance poussée.
5. Vérification unique : `bun run check`, `bun run lint`, `bun run test:unit`.

## Ce qui reste au regard

Pas de navigateur dans cette tranche. À ouvrir aux quatre largeurs : la hauteur de la pastille
(48 px attendus), son alignement sous la barre, la troncature d'un titre long ; puis ouvrir une
créance depuis l'accueil, les débiteurs et les procédures, revenir, recharger, et vérifier que le
repli dit « Vos débiteurs » et rouvre le bon débiteur.
