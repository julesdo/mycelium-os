# Relevés pour la tranche 5 (la recherche), 14 septembre 2026, au commit 4b3aa35

## Schéma (`src/lib/convex/recouvrement/tables.ts`)

- **Aucun `searchIndex` ni `withSearchIndex` dans `src`.**
- `debiteurs` (L208-304) : `denominationNormalisee: v.string()` requis (L226) ; `siren?` (L229) ; index `by_org` (L289), `by_org_and_siren` (L290), `by_org_and_denomination` [organizationId, denominationNormalisee] (L291), `by_siren` (L304, tous établissements, réservé à l'interne).
- `facturesVente` (L310-388) : `debiteurId: v.id('debiteurs')` (L312), `reference: v.string()` (L313), `creanceId?` (L375) ; index `by_org_and_reference` (L383), `by_debiteur` [debiteurId] SANS organizationId (L381).
- `creances` (L492-557) : `debiteurId` (L494), `statut` BROUILLON|QUALIFIEE|ENGAGEE|CLOSE (L495-500), `procedureEngagee?` (L540), `engageeLe?` (L541) ; index `by_org_and_statut` (L557), `by_debiteur` SANS organizationId (L556).
- Pas de table « dossiers » : engagé = `creances.statut === 'ENGAGEE'` + `procedureEngagee` + `engageeLe`, écrits par `engager()` (`apresProcedure.ts` L125-129).

## Normalisation

- `normaliserFournisseur(nom): string` (`src/lib/socle/normalisation.ts` L146-161) : majuscules, ligatures, apostrophes, **suppression des diacritiques**, espaces, réparation OCR, **suppression des points et des formes juridiques** (SAS, SARL…). Garde tirets, virgules, `&`, `/`, `'`.
  - Seul écrivain de `denominationNormalisee` : `import.ts` L80 et L111-122 (`trouverOuCreerDebiteur`) ; jamais repatché ensuite.
  - ⚠️ L'analyseur Convex met en minuscules mais NE retire PAS les accents : le terme saisi doit passer par `normaliserFournisseur` (ce que dit la spec).
- `normaliserSiren(brut): string | null` (`pays/france/siren.ts` L78-81) : ne garde que les chiffres, 9 chiffres avec clé de Luhn, sinon `null` ; ne lève jamais. Un SIRET rend `null` (voir `sirenDepuisSiret`). Tous les écrivains de `siren` normalisent : 9 chiffres nus en base.
- `facturesVente.reference` : seulement `.trim()` à l'import (`import.ts` L195) ; dédoublonnage par égalité exacte (`import.ts` L133-144).

## Lectures existantes

- `dossiersEngages` (`apresProcedure.ts` L334-341) : `creances` par `by_org_and_statut` ENGAGEE ; rend `creanceId`, `debiteur` (le NOM), `procedure`, `libelle`, `prochaineEcheance`… ⚠️ **PAS de `debiteurId`**. Jumeau interne `dossiersInterne` (L327-332).
  - Conséquence : croiser « débiteurs trouvés » et « dossiers engagés » passe par une lecture de `creances` (`by_org_and_statut` ENGAGEE, filtre sur `debiteurId`), côté serveur. Zéro index de plus.
- `flux` (`surveillance.ts` L468-505), args `{ aujourdHui? }` ; appelé avec `{}` par l'accueil (cache partagé) : `evenements[].cible?: { genre: 'DEBITEUR' | 'CREANCE', id: string }`. `reference` n'est PAS le nom du débiteur (souvent la référence de facture). « Trois débiteurs qui ont bougé » : dédoublonner les `cible.id` de genre DEBITEUR, puis retrouver les noms.
- `listerDebiteurs` (`lecture.ts` L136-178) : `_id`, `denomination`, `siren?`… (pas `denominationNormalisee`), triés par encours. `listerCreances` (L678-728) rend `debiteurId` et `statut`.
- Organisation : `getUserOrg(ctx)` (`lib/auth.ts` L9-18) → `{ user, org, organizationId }` ; `authedQuery` n'ajoute que `user`. Appartenance d'un document : vérif en ligne (`suivreImport` L197-204), `mienne()` (`apresProcedure.ts` L195-205).

## La barre aujourd'hui (`src/app/barre.tsx`)

- `Recherche()` L112-136, non exportée : `useState` `terme` L114, lu L121 seulement ; `<input type="search">` natif dans un `label.verre` (`lg:max-w-80`), `placeholder` et `aria-label` « Rechercher un débiteur » (L123-124) ; Entrée → `navigate({ to: '/app/debiteurs' })` sans le terme (L129-132). Pas de `SearchField` Cladd (fond opaque sur verre, L105-111).
- `Barre` L269-297 : avatar, veilleur, Recherche, capsule d'onglets (`hidden md:flex`), sélecteur d'établissement ; `Facultatif` = `CatchBoundary` qui rend `null` (la salle rend la coquille sans session).
- `Shell` : barre en `absolute` (pas `fixed`, pour rester sous les dialogues du kit rendus dans `#root`) ; `BarreBasse` `md:hidden fixed bottom-0`.
- Destinations prêtes : `/app/debiteurs` `validateSearch { d? }`, `/app/procedures` `{ p? }`.

## Cladd

- `Popup` / `PopupContent` (déjà employés : `feuille-voie`, `recherche-avocat` avec `List > ListTitle > ListButton`) : props `open`, `onOpenChange`, `headerLeft/Right`, `contentClassName`, `wrapClassName`, `backdrop`, `root` (`'#app, #__next, #root'`)… **aucune prop de placement ni de plein écran**.
- Pas de composant Command ni Combobox dans Cladd 0.18.5. `Shortcut` jamais importé ; `SearchField` seulement sur la page marketing.

## Barrières qui contraindront la tranche 5

- `fonctions-appelees.test.ts` : toute requête publique neuve doit être appelée par l'interface dans le même changement (les `internalQuery` ne sont pas vérifiées).
- `champs-alimentes.test.ts` : un champ neuf doit être écrit ET lu (`.champ`) ; un usage par index seul ne compte pas (`denominationNormalisee` est déjà admis).
- `declare-jamais-alimente.test.ts`, `tables.test.ts` (ne lit que `indexes` ; les `searchIndexes` sont une clé à part de `export()` : c'est ce que la barrière § 7.4 devra lire).
- `radarRecouvrement.test.ts` L241-272 : un fichier Convex qui contient le littéral `'by_siren'` ET un `authedQuery(` échoue (`'by_org_and_siren'` ne déclenche pas).
- `rgpd.test.ts` L508-546 : pas de `.currentOrganizationId` hors `lib/auth.ts`.
- `verre.test.ts` : toute `<Surface` de `src/{routes,screens,ui}` en `variant="transparent"` (`src/app` n'est pas balayé).
- Tests Convex : `convex-test` 0.0.54, jumeaux internes avec `organizationId` (aucun test ne se connecte). ⚠️ Son faux moteur de recherche découpe sur les espaces et compare en préfixe, sans vérifier que l'index est déclaré : `FA-2026-0311` y est UN jeton, alors que Convex en fait trois. Un test vert ne prouve pas le comportement en production.
