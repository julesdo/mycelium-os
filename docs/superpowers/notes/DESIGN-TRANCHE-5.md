# Tranche 5 (la recherche) : décisions de conception à porter dans le plan

Brouillon d'orchestrateur, 14 septembre 2026. À écrire en plan après la tranche 4. Faits prouvés : `SYNTHESE.md` (analyseur Convex) et `SYNTHESE-TRANCHE-5.md` (schéma, normalisation, barre, barrières).

## Serveur (Convex)

1. **Deux index de recherche**, filtrés par établissement :
   - `debiteurs` : `.searchIndex('recherche_denomination', { searchField: 'denominationNormalisee', filterFields: ['organizationId'] })`.
   - `facturesVente` : `.searchIndex('recherche_reference', { searchField: 'reference', filterFields: ['organizationId'] })`.
   - Un changement de schéma Convex se DÉPLOIE. **Vérifié le 14/09** : `vercel.json` lance `bunx varlock run -- bun scripts/deploy.ts`, qui fait dans l'ordre `verifierBundleConvex()` → `validateConvexEnv()` (production) → `deployConvex()` → construction → `verifierEntreeVercel()`. La poussée sur `main` déploie donc le schéma et les fonctions Convex de production (`insightful-crow-128`) AVANT l'application : l'index et la requête arrivent avec l'interface qui les appelle. Un index de recherche neuf se construit côté Convex au déploiement : vérifier dans les journaux Vercel que `convex deploy` a fini, et lancer `bun scripts/verifier-bundle-convex.ts` en local avant de pousser.
2. **Une requête publique `recherche`** (`authedQuery`, `args: { terme: v.string() }`), dans un module de `src/lib/convex/recouvrement/`, avec son jumeau interne à `organizationId` pour les tests :
   - Terme vide ou blanc → sections vides.
   - SIREN : `normaliserSiren(terme)` non nul → `by_org_and_siren` exact, AVANT le plein texte.
   - Référence exacte : `by_org_and_reference` avec `terme.trim()` → en tête des factures si trouvée.
   - Débiteurs : `withSearchIndex('recherche_denomination', q => q.search('denominationNormalisee', normaliserFournisseur(terme)).eq('organizationId', organizationId))` (l'analyseur Convex met en minuscules mais ne retire pas les accents : la normalisation est obligatoire).
   - Factures : `withSearchIndex('recherche_reference', q => q.search('reference', terme).eq('organizationId', organizationId))`. `FA-2026-0311` devient `fa`, `2026`, `0311` en OU : l'exacte passe devant, le plein texte complète.
   - Procédures : `creances` par `by_org_and_statut` ENGAGEE, filtrées sur les `debiteurId` trouvés (zéro index de plus). `dossiersEngages` ne rend pas `debiteurId` : ne pas s'en servir pour ce croisement.
   - Chaque section : `total` vrai et les `premiers` (3). Limites Convex : 1024 documents parcourus au plus par recherche (au-delà, erreur) → borner par `.take(…)` et dire « plus de N » si la borne est atteinte, jamais un total inventé.
   - « Voir tout » : même requête avec `limite` plus grande (argument `limite?`), déplié dans la palette.
3. **Avant la frappe** : les trois débiteurs dont quelque chose a bougé = `flux` (`{}`, cache partagé avec l'accueil), `cible.genre === 'DEBITEUR'`, dédoublonnés, dans l'ordre du flux ; leurs noms via une lecture existante (`listerDebiteurs`) ou un champ ajouté à la requête. Pas de `localStorage`.

## Barrière du cloisonnement (spec § 7.4)

- Lire `schema.export().searchIndexes` (clé distincte de `indexes`) : chaque index de recherche déclare `organizationId` dans `filterFields`.
- Balayer `src/lib/convex/**` : tout `withSearchIndex(` est suivi d'un `.eq('organizationId'` dans le même appel.
- La faire mordre (index sans filtre, appel sans `.eq`).

## Interface

- Composant unique dans `src/ui/` (la palette), deux rendus : plein écran avec « Annuler » sous 1024 px ; palette centrée sur fond assombri à partir de 1024 px. `Popup` du kit n'a ni placement ni plein écran : partir de `Popup` (piège à focus, Échap, fond) et régler `wrapClassName`/`contentClassName` si ça suffit, sinon une primitive dans `src/ui/` bâtie sur les surfaces du kit. Vérifier avec le serveur MCP de Cladd (`get_component('popup')`, `pitfalls`).
- Barre : `Recherche()` de `src/app/barre.tsx` ouvre la palette (au toucher / au focus) ; marque-page « Rechercher « Durand, FA-2026-0311… » ».
- Trois sections dans l'ordre fixe (débiteurs, factures, procédures), « Débiteurs · 3 sur 17 », « Voir tout » qui déplie.
- Aucun résultat : dire ce qui a été cherché et dans quelles familles.
- Toucher un résultat referme et ouvre : débiteur → `/app/debiteurs?d=<id>` ; facture → `/app/debiteurs?d=<son debiteurId>` ; procédure → `/app/procedures?p=<creanceId>`.
- La palette s'ouvre aussi dans la salle d'exposition, avec des résultats de démonstration.

## Tests

- `convex-test` : ⚠️ son faux moteur découpe sur les espaces et compare en préfixe, sans vérifier la déclaration de l'index. Tester le cloisonnement (deux établissements, jamais les résultats de l'autre), le SIREN exact, la référence exacte, le croisement procédures, les totaux. Ne PAS prétendre tester le découpage de `FA-2026-0311` : le dire dans le test.
- `fonctions-appelees` : la requête publique doit être appelée par l'interface dans le même changement.
- Regard : taper « Durand » et « FA-2026-0311 » sur la vraie base de développement si possible (le déploiement `dev:cloud`), sinon dans la salle.
