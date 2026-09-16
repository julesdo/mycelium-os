# Tranche 5 : la recherche (plan court)

Spec : `docs/superpowers/specs/2026-09-14-charpente-navigation-design.md` § 7. Décisions de départ :
`notes/DESIGN-TRANCHE-5.md`, relevés : `notes/SYNTHESE-TRANCHE-5.md` et `notes/SYNTHESE.md`, affinés
par la synthèse de design Mobbin (huit motifs, reportés ci-dessous là où ils tranchent).

Hors de cette tranche : aucune route renommée, ni le retour (tranche 4), ni la disposition des volets
(tranche 3).

## Décisions

**Serveur**

1. Schéma, par AJOUT seulement : `debiteurs.searchIndex('recherche_denomination', { searchField:
'denominationNormalisee', filterFields: ['organizationId'] })` et `facturesVente.searchIndex(
'recherche_reference', { searchField: 'reference', filterFields: ['organizationId'] })`.
2. Module `src/lib/convex/recouvrement/recherche.ts` : `recherche` (`authedQuery`) et son jumeau
   `rechercheInterne` (`internalQuery`, `organizationId` en argument). Handlers au type de retour
   annoté. Arguments : `terme`, `deplier?` (une famille), `recents?` (identifiants tirés du flux).
3. Terme blanc : aucune famille ; `recents` résolus en débiteurs de l'établissement (un identifiant
   d'un autre établissement ne rend rien) ; `etablissementVide` dit s'il existe au moins un débiteur.
4. Débiteurs : SIREN exact d'abord (`normaliserSiren`, sinon `sirenDepuisSiret` : un SIRET collé
   trouve), par `by_org_and_siren` ; puis plein texte sur `normaliserFournisseur(terme)`.
5. Factures : référence exacte d'abord (`by_org_and_reference`), puis plein texte (`FA-2026-0311` y
   devient trois jetons en OU : l'exacte passe devant).
6. Procédures : créances ENGAGEE (`by_org_and_statut`) dont le débiteur a été trouvé, ou qui portent
   une facture trouvée. Titre : nom de la procédure ; pied : débiteur et prochaine échéance
   (`lireSuivi`, exporté).
7. Chaque famille : `total`, `borne`, `premiers`. Lecture bornée à 51 (`take`) : au-delà de 50, la
   puce dit « 50 et plus », jamais un total inventé. Trois rangées enrichies, cinquante pour la
   famille dépliée. Montants en centimes : encours du débiteur, reste dû de la facture (`resteDu`
   de `lecture.ts`, exporté plutôt que recopié).
8. Chaque résultat est aussi refiltré sur `organizationId` au point d'usage.

**Interface**

9. `src/ui/palette-recherche.tsx`, présentation pure (aucun Convex) : `Popup` contrôlé,
   `closeButton={false}`, `header={false}`, colonne ancrée en haut (`self-start`, `justify-start`),
   pleine largeur sous 1024 px, largeur par défaut au-delà. En tête, une `Surface` transparente en
   verre, collante : `SearchField` taille `md`, `autoFocus`, `enterKeyHint="search"`, placeholder
   « Durand, FA-2026-0311… », `Spinner` `xs` en suffixe pendant la lecture ; puis « Annuler » à
   toutes les largeurs (seule sortie visible).
10. Avant la frappe : « Ce qui a bougé », les trois débiteurs du flux (pied : type d'événement et
    référence ; le flux ne porte pas de date, on n'en invente pas). Aucun débiteur : une seule
    rangée « Importer des factures ». Flux calme : rien sous le champ.
11. Pendant la frappe : une carte par famille, ordre fixe, familles vides masquées ; `SectionTitle`
    avec le nom, une `Chip` neutre du total, et « Voir tout » (`md`) seulement au-delà de trois.
    Dépliée, la famille prend la colonne, les autres se réduisent à leur titre et leur puce, et le
    bouton devient « Réduire ». Rangée : `ListButton`, icône de famille, nom en titre, ce qui
    distingue deux homonymes en pied, montant à droite sans couleur de seuil.
12. Le dernier résultat reste affiché jusqu'au suivant (état dérivé au rendu, pas d'effet) ; « Rien
    pour « X » dans les débiteurs, les factures et les procédures. » seulement quand la réponse du
    terme courant est arrivée vide. Entrée ouvre la première rangée affichée.
13. Toucher referme et ouvre : débiteur et facture → `/app/debiteurs?d=` ; procédure →
    `/app/procedures?p=` ; import → `/app/import-factures`.
14. `src/app/barre.tsx` : `Recherche()` devient un déclencheur en pilule de verre (plus d'`<input>`,
    plus d'état `terme`, plus de navigation qui jetait le terme). La palette branchée est remontée à
    chaque ouverture (clé), entourée d'un `CatchBoundary` qui la referme si une requête lève (salle
    sans session). `flux` et `recherche` sont en `'skip'` tant qu'elle est fermée.

**Salle d'exposition**

15. Deux entrées, `recherche` et `recherche-vide`, qui rendent la vraie palette. Les réponses sont
    calculées par les fonctions du domaine (`normaliserFournisseur`, `normaliserSiren`,
    `sirenDepuisSiret`) sur une petite base de démonstration, et les récents par la même fonction
    que la barre appliquée à `EVENEMENTS_DEMO`.

**Barrière (seule exception aux tests, règle de sécurité)**

16. `src/lib/convex/__tests__/recherche-cloisonnee.test.ts` : par `convex-test`, deux établissements
    aux mêmes noms, SIREN, références et dossiers ; chacun ne voit que les siens, `recents`
    compris. Par lecture de `schema.tables[*].export().searchIndexes`, chaque index de recherche
    filtre `organizationId` ; par balayage de `src/lib/convex`, chaque `withSearchIndex(` porte
    `.eq('organizationId'` dans ses parenthèses. Les deux vérifications sont éprouvées sur des cas
    fautifs écrits dans le test. Le faux moteur de `convex-test` ne découpe pas comme Convex : le
    test le dit et ne prétend pas vérifier le découpage de `FA-2026-0311`.

## Fichiers

- `src/lib/convex/recouvrement/tables.ts` (deux index), `recherche.ts` (neuf),
  `lecture.ts` (`resteDu` exporté), `apresProcedure.ts` (`lireSuivi` exporté).
- `src/ui/palette-recherche.tsx` (neuf), `src/ui/index.ts`.
- `src/app/barre.tsx`.
- `src/routes/-salle/recherche.ts` (neuf), `src/routes/showroom.tsx`.
- `src/lib/convex/__tests__/recherche-cloisonnee.test.ts` (neuf).

## Ordre

1. Ce plan.
2. Schéma et requête, avec la barrière de cloisonnement.
3. Palette, barre et salle, dans le même commit que l'appel de la requête publique
   (`fonctions-appelees`).
4. Vérification unique : `bun run check`, `bun run lint`, `bun run test:unit`, puis
   `bun scripts/verifier-bundle-convex.ts`. Rien n'est déployé.

## Ce qui reste au regard

Ancrage en haut et plein écran sous 1024 px, clavier ouvert au toucher sur Safari iPad (`autoFocus`
monté dans le geste), placeholder à 375 px, en-tête collant quand « Voir tout » déplie cinquante
rangées : à ouvrir dans la salle aux quatre largeurs.
