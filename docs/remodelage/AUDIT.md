# AUDIT — état des lieux du code de Letikette

**Livrable de la Phase 0** du [brief de remodelage](00-brief-remodelage.md).
Constat uniquement : aucune architecture n'est proposée ici, aucun fichier n'a été modifié.

Établi le 2 septembre 2026, sur `main` à `3d0ccf4`.
Ligne de base des tests au moment de l'audit : **438 tests passent, 3 ignorés, 35 fichiers**
(`bun run test:unit`, 37 s).

---

## Avertissement préalable — `CLAUDE.md` est périmé sur un point majeur

`CLAUDE.md` annonce `src/lib/egalim/referentiel.ts` comme étant « à construire en phase 1 ».
**Il est construit, testé et en service.** Plus largement, le brief a été écrit en supposant un
moteur d'extraction existant : cette supposition est **correcte, et même en-deçà de la réalité**.
Le moteur est complet, instrumenté et documenté.

Ce décalage a une conséquence directe sur le brief : la Phase 1 (« rendre le moteur indépendant du
domaine ») n'est pas un travail d'extraction depuis un magma, mais un travail de **déplacement et de
renommage** sur du code déjà largement découplé. C'est une bonne nouvelle, et elle change l'ordre de
grandeur du risque.

---

## 1. Structure réelle du projet

Monorepo unique, pas de packages. Frontend et backend cohabitent sous `src/`.

| Dossier | Rôle | LOC |
|---|---|---|
| `src/lib/convex/` | Backend Convex complet (hors `_generated`) | ~6 900 + domaine |
| `src/lib/convex/egalim/` | Le moteur + la verticale EGalim | 7 084 (+1 411 de tests) |
| `src/lib/egalim/` | Barème EGalim pur, sans Convex | 286 (+214 de tests) |
| `src/lib/config/` | Identité légale, tarifs | ~200 |
| `src/routes/` | Routage TanStack Router (fichiers = routes) | 7 746 |
| `src/screens/` | Logique d'écran extraite des routes | 2 751 |
| `src/ui/` | Système visuel maison par-dessus Cladd | 2 891 |
| `src/marketing/` | Page d'accueil publique | 2 359 |
| `e2e/` | Playwright — **utilitaires seulement, aucun `.spec.ts`** | — |

**Total `src/` hors `_generated` : 31 455 LOC.**

Particularité à connaître : le backend Convex ne vit **pas** dans `convex/` à la racine mais dans
`src/lib/convex/`, via `convex.json`. Les imports internes au backend sont donc relatifs
(`../../egalim/referentiel`), pas aliasés.

Séparation nette et respectée entre :

- `'use node'` — fichiers qui appellent le SDK Anthropic ou `unpdf` (`extraction.ts`,
  `classification.ts`, `extracteurClaude.ts`, `classificateurClaude.ts`, `reprise.ts`) ;
- runtime Convex par défaut — tout ce qui exporte `query` / `mutation`
  (`extractionMutations.ts`, `classificationMutations.ts` vivent à côté précisément pour ça).

---

## 2. Schéma de données actuel

Défini dans `src/lib/convex/schema.ts`, qui étale `egalimTables` importé de
`src/lib/convex/egalim/tables.ts`. Better Auth gère ses propres tables via son composant.

### Tables transverses (8)

| Table | Champs clés | Index |
|---|---|---|
| `emailEvents` | `emailId`, `eventType`, `timestamp`, `data` | 3 |
| `adminAuditLogs` | `adminUserId`, `action` (6 littéraux), `targetUserId`, `metadata` typée | 3 |
| `organizations` | `name`, `siret`, `etablissementType`, `couvertsJour`, `gestionDirecte`, bloc Paddle (`paddleSubscriptionId`, `paddlePlanTier: 'diagnostic' \| 'conformite'`, `paddleStatus`, …), `country`/`currency`/`timezone`/`locale` | 3 |
| `organizationMembers` | `organizationId`, `userId`, `role: ORG_ADMIN \| ORG_MEMBER` | 4 |
| `organizationInvitations` | `token`, `email`, `expiresAt`, `acceptedAt` | 4 |
| `userProfiles` | `userId`, `currentOrganizationId`, `hasUsedFreeTrial` | 1 |
| `notifications` | `type` (7 littéraux, tous EGalim), `title`, `message`, `link`, `isRead` | 4 |

### Tables du domaine EGalim (9)

| Table | Rôle | Remarque d'audit |
|---|---|---|
| `invoiceBatches` | Un dépôt de factures | `status` : `DRAFT → EXTRACTING → CLASSIFYING → REVIEW → READY \| FAILED` |
| `invoiceDocuments` | Un fichier déposé | `contentHash` SHA-256 côté navigateur, `doublonDe`, `doublonIgnore`, `basesParTaux`, `extractionEtape` (texte d'écran) |
| `invoiceLines` | **La table centrale**, ~3 000 lignes/cantine/an | `rawLabel` jamais modifié, `normalizedLabel`, `justification`, `confidence`, `reviewStatus`, `proofStatus`, `classifierVersion` |
| `productLabels` | Cache global de classification par libellé | **Sans `organizationId` ni `userId`, délibérément.** `confirmationsCount` entier nu, `contested`, `verdictConcurrent` |
| `suppliers` | Fournisseur par organisation | `rawNames: string[]` — c'est là que vit la réconciliation d'identité |
| `diagnostics` | Le rapport **figé** | `ratios` stockés calculés, jamais recalculés ; `byFamily`, `bySupplier`, `gapEuros`, `status: DRAFT \| DELIVERED` |
| `bilanSignatures` | Signature électronique simple eIDAS | `empreinte` SHA-256, heure **serveur**, `mention` + `mentionVersion`, révocation par ajout jamais par réécriture |
| `attestationRequests` | Courriers de demande de justificatif | Pas de tableau d'IDs (plafond Convex 8 192) |
| `classificationJobs` | Coût et progression | `tokensIn/Out`, `costEur`, `recents` (12 dernières décisions, pour l'écran) |

**Multi-tenant strict** par `organizationId` sur toutes les tables métier, avec l'unique exception
assumée et documentée de `productLabels`.

---

## 3. Ingestion de documents

**Pipeline** : navigateur → Convex `_storage` → `internalAction` d'extraction.

Formats acceptés (`sourceType`) : `CSV`, `EXCEL`, `PDF_TEXT`, `PDF_SCAN`, `IMAGE`, `TEXTE`.

La nature est déterminée dans `extraction.ts:determinerNature()` **par l'extension ET le contenu**,
jamais par l'extension seule — un `.txt` est reniflé pour savoir s'il est en réalité un CSV
(`ressembleACsv()` teste `;`, `,`, `\t` et vérifie qu'un mapping de colonnes tient).

Deux chemins mutuellement exclusifs :

1. **Déterministe (CSV)** → `parsers/csv.ts`. Détection de colonnes par synonymes
   (`'MONTANT HT'`, `'TOTAL HT'`, `'MT HT'`, `'PRIX TOTAL'`), lecture de montants à la française
   (espaces insécables, virgule décimale), recollage des nombres scindés par certains exports.
   Les lignes dont le montant est illisible sont **conservées comme rejets**, jamais inventées ni
   perdues silencieusement.
2. **Probabiliste (PDF / image / texte)** → `extracteurClaude.ts`.
   - PDF avec couche texte (≥ 20 caractères) → texte envoyé tel quel ;
   - PDF scanné → une image par page, `unpdf` + `renderPageAsImage`, échelle 3 ;
   - découpage en tranches de 10 pages au-delà de 20 pages ;
   - **2 relances maximum** en plus de la tentative initiale.

**Bibliothèques** : `unpdf` (rendu et extraction PDF), `papaparse` (déclaré, `@types/papaparse`),
`exceljs`, `@anthropic-ai/sdk`, `zod` v4 (schémas de sortie du modèle).

---

## 4. Où se trouve l'extraction ligne à ligne — et est-elle couplée à EGalim ?

**Fichiers** : `egalim/extraction.ts` (575), `egalim/extracteurClaude.ts` (186),
`egalim/extractionSchema.ts` (41), `egalim/promptExtraction.ts` (52), `egalim/parsers/csv.ts` (304).

**Réponse : elle est déjà découplée, en substance, mais mal rangée et mal nommée.**

C'est le constat le plus important de cet audit. `extractionSchema.ts` — le contrat de sortie de
l'extraction — ne contient **aucune notion EGalim** :

```ts
ligneExtraiteSchema = { rawLabel, quantity, unit, unitPrice, amountHT, vatRate }
documentExtraitSchema = { supplierName, invoiceNumber, invoiceDate, lignes, totaux, illisible, … }
```

Ce sont les champs d'une facture, pas ceux d'une cantine. Aucune famille, aucun label, aucun ratio.

Les seuls points de contact avec le domaine, tous **superficiels** :

| Point de contact | Fichier | Nature |
|---|---|---|
| Le prompt dit « restauration collective française » | `promptExtraction.ts` | Une phrase de contexte, pas une règle |
| `TAUX_ALIMENTAIRES = {5.5, 10}` | `verification.ts:6` | Heuristique de vérification FR-alimentaire |
| Le dossier s'appelle `egalim/` | — | Rangement, pas couplage |

**Le couplage réel commence après l'extraction**, à la classification.

---

## 5. Où se trouve la normalisation des libellés

**Fichier unique : `egalim/normalisation.ts` (161 LOC), entièrement générique.** Zéro import du
domaine EGalim. Deux fonctions exportées :

- `normaliserLibelle(rawLabel)` — majuscules, ligatures (`Œ→OE`, `Æ→AE`), apostrophes
  typographiques, retrait des diacritiques via NFD, **réparation d'OCR jeton par jeton**
  (`CAR0TTES→CAROTTES`, `L3S→LES`, `PR1X→PRIX`, `!→I`), écrasement des espaces.
- `normaliserFournisseur(nom)` — même socle, plus retrait des points d'acronyme (`S.A.R.L.→SARL`)
  et des 15 formes juridiques (`SAS`, `SARL`, `EARL`, `GAEC`, `SCEA`…).

La finesse à ne pas casser : les jetons qui se lisent comme une **mesure** (`2.5KG`, `4X1KG`,
`4/4`, `88213`) sont exclus de la réparation d'OCR — sinon une conserve `4/4` deviendrait un sac de
25 kg. L'arbitrage est explicitement documenté : « fusionner à tort fausse le diagnostic ; ne pas
fusionner coûte un appel ». Tout penche du côté de la sous-fusion.

**Effet économique** : ~3 000 lignes → 300–500 libellés distincts. C'est cette réduction qui fait
tenir le coût du produit.

---

## 6. Où se trouve la réconciliation d'une référence dans le temps

Trois mécanismes distincts, à trois endroits :

1. **Réconciliation de libellé produit** — `productLabels`, indexée `by_normalized_label`.
   Cache global inter-clients. Un libellé tranché n'est plus redemandé, sous conditions
   (voir `consensus.ts`).
2. **Réconciliation de fournisseur** — `suppliers.rawNames: string[]` + index
   `by_org_and_name` sur le nom normalisé. Plusieurs écritures brutes se rattachent à une entité.
3. **Réconciliation de document (dédoublonnage)** — `egalim/doublons.ts` (159 LOC), générique.
   Trois niveaux, du plus certain au plus faillible :
   - empreinte SHA-256 du fichier (certitude absolue, coût nul, avant tout appel modèle) ;
   - fournisseur + numéro de facture ;
   - fournisseur + date + total (repli faillible).

   Arbitrage documenté : on détecte **largement**, parce qu'un faux positif est visible et
   réversible (`doublonIgnore`) alors qu'un faux négatif produit un taux faux et crédible.

**Il n'existe aucune réconciliation d'entité par identifiant externe** (pas de SIREN sur
`suppliers` au-delà d'un champ optionnel jamais alimenté automatiquement, aucun appel à
`recherche-entreprises.api.gouv.fr` dans le code applicatif).

---

## 7. Le score de confiance

**Production.** Le modèle le rend, par libellé, dans `classificationSchema.ts`. Il n'est ni
calculé ni recalculé côté serveur : c'est une sortie du modèle, prise telle quelle.

**Seuil.** `SEUIL_CONFIANCE = 0.85`, déclaré une fois dans `egalim/verdict.ts:22`.

**Usages — exactement deux, plus le stockage :**

| Lieu | Question posée |
|---|---|
| `verdict.ts:124` (`deriverVerdict`) | Ce verdict part-il en arbitrage humain ? |
| `consensus.ts:44` (`doitEtreDemande`) | Faut-il redemander ce libellé à cette organisation ? |
| `invoiceLines.confidence`, `productLabels.confidence` | Stockage |

**Ce qui déclenche l'arbitrage humain** (`deriverVerdict`), par OU logique :

1. famille annoncée ∈ {`VIANDE`, `POISSON`} — **systématiquement, quel que soit le score** ;
2. `confidence < 0.85` ;
3. régularisation (remise/avoir/ristourne) classée hors alimentaire.

Le point 1 est doublé volontairement dans `consensus.ts:36` avec un commentaire expliquant le
doublon : l'invariant est jugé trop coûteux pour ne tenir qu'à un endroit. Les deux gardes lisent
la **même** constante `FAMILLES_VIANDE_POISSON`.

**Propagation.** Le score ne se propage pas : il n'y a pas d'agrégation de confiance vers le
diagnostic. Ce qui remonte au niveau du rapport, c'est `partNonConfirmee()` dans `agregation.ts` —
**la part du montant** (et non du nombre de libellés) qui repose sur une classification que
personne n'a regardée.

**Point d'architecture notable et sain** : le modèle ne dit jamais qu'un produit est bio ou
durable. Il **relève des labels** ; c'est `verdict.ts` — du code versionné, relu, testé — qui en
tire `isBio` / `isDurable` via le barème. Un contrôleur peut remonter du chiffre au texte de loi
sans jamais repasser par un modèle.

---

## 8. Quelle part du code est spécifique à EGalim

Méthode : classement fichier par fichier de `src/lib/convex/egalim/` (hors tests) en trois
catégories, puis rattachement du reste de `src/`.

### Le moteur (`src/lib/convex/egalim/`, 7 084 LOC hors tests)

| Catégorie | LOC | Part |
|---|---|---|
| **Socle** — aucune notion métier | 1 582 | 22 % |
| **Mixte** — mécanisme générique, types ou règles EGalim dedans | 2 660 | 38 % |
| **Verticale** — EGalim pur | 2 842 | 40 % |

**Socle (déplaçable presque tel quel) :** `extraction.ts`, `extracteurClaude.ts`,
`extractionSchema.ts`, `parsers/csv.ts`, `normalisation.ts`, `appariement.ts`, `reprise.ts`,
`cout.ts`, `doublons.ts`.

**Mixte (à découper) :** `extractionMutations.ts`, `batches.ts`, `lot.ts`, `classification.ts`,
`classificateurClaude.ts`, `classificationMutations.ts`, `confirmation.ts`, `consensus.ts`,
`verification.ts`, `promptExtraction.ts`.

**Verticale EGalim :** `verdict.ts`, `prompt.ts`, `agregation.ts`, `diagnostics.ts`, `produits.ts`,
`attestations.ts`, `courrier.ts`, `mentions.ts`, `signature.ts`, `rappels.ts`, `pilotage.ts`,
`tables.ts`, `classificationSchema.ts`.

### Le reste du dépôt

| Zone | LOC | Statut |
|---|---|---|
| `src/lib/egalim/` | 286 | 100 % verticale (barème pur) |
| `src/ui/` — composants EGalim | 1 185 | Verticale (`taux-egalim`, `verdict`, `repartition`, `carte-produit`, `ou-agir`, `lexique`, `pave-signature`, `egalim.ts`) |
| `src/ui/` — composants génériques | 1 706 | Socle (`page`, `section`, `two-pane`, `tableau`, `zone-depot`, `empty-state`…) |
| `src/screens/` | 2 751 | Verticale (diagnostic, confirmer, factures) |
| `src/routes/app/` | 2 965 | Verticale (12 routes, toutes EGalim) |
| `src/marketing/` | 2 359 | Verticale (discours EGalim intégral) |

### Chiffre de synthèse

- **EGalim pur : ~12 600 LOC, soit 40 % de `src/`.**
- **EGalim touché (pur + mixte) : ~15 300 LOC, soit 49 %.**
- **Socle déjà isolé et réutilisable tel quel : ~3 300 LOC, soit 10 %.**

Autrement dit : la moitié du code ne connaît pas EGalim, mais **seul un dixième est déjà rangé
comme du socle**. L'écart entre les deux est le travail de la Phase 1.

---

## 9. Tests existants

**37 fichiers, 441 tests (438 passent, 3 ignorés), ~37 s.** Vitest uniquement.

| Zone | Fichiers | Ce qui est couvert |
|---|---|---|
| `convex/egalim/__tests__/` | 15 | `agregation`, `appariement`, `consensus`, `courrier`, `csv`, `doublons`, `normalisation`, `pilotage`, `prompt`, `promptExtraction`, `rapport`, `verdict`, `verification` + 2 tests d'intégration modèle (`classificateurClaude`, `extracteurClaude`) |
| `lib/egalim/__tests__/` | 2 | `referentiel` (le barème), `empreinte` |
| `convex/__tests__/` | 4 | `billing`, `cheminArgent`, `notifications`, `rgpd` |
| `convex/emails/__tests__/` | 2 | `produit`, `sendHelpers` |
| Divers | 14 | `password`, `auth-messages`, `url`, `anonymousUser`, `env`, `lexique` (balaie l'interface pour le mot « garantie »), `pdf`, `notice` |

**Trous identifiés :**

- **Aucun test E2E.** `playwright.config.ts` et `e2e/utils/**` existent, mais il n'y a **pas un
  seul fichier `.spec.ts`**. Le harnais est là, la suite est vide.
- Les deux tests marqués `integration` appellent réellement l'API Anthropic — ce sont les
  2 fichiers ignorés en run standard.
- Aucun test sur `diagnostics.ts` (680 LOC, le plus gros fichier du domaine) autre qu'au travers
  de `rapport.test.ts`.
- Aucun test de charge ni de plafond Convex, alors que plusieurs commentaires du schéma indiquent
  que les limites (16 000 lectures, 8 192 entrées de tableau) ont déjà été rencontrées.

---

## 10. Dépendances externes

**Modèles et IA**

- `@anthropic-ai/sdk` ^0.117.1 — extraction et classification. **Opus 5** (tarif codé dans
  `cout.ts` : 5 $/M en entrée, 25 $/M en sortie, facteur cache 0,1).
- `ai` ^6 et `@openrouter/ai-sdk-provider` ^2.9 — présents, usage à confirmer (voir § 12).
- Plafond dur **10 € par lot** (`CAP_EUR`), partagé extraction + classification. Au-delà : plus
  aucun appel payant, le reste part en arbitrage humain.

**Plateforme**

- **Convex** 1.37.0 — backend, avec les composants `@convex-dev/better-auth`, `@convex-dev/agent`,
  `@convex-dev/resend`, `@convex-dev/rate-limiter`, `@gilhrpenner/convex-files-control`.
- **Better Auth** ~1.6.9 + `@better-auth/passkey`.
- **Resend** ^6.5.2 — e-mails transactionnels.
- **Paddle** — facturation (Merchant of Record), via `convex/paddle.ts` et webhooks HTTP.
- **PostHog** — analytique produit.
- Déploiement : **Vercel** (`vercel.json`, `scripts/verifier-entree-vercel.ts`) — noter que
  `CLAUDE.md` annonce Cloudflare Workers, ce qui **ne correspond plus** au dépôt.

**Traitement documentaire**

- `unpdf` ^1.8.1 (+ `@napi-rs/canvas` transitif) — impose `'use node'`.
- `exceljs`, `papaparse`, `jspdf` + `jspdf-autotable` (génération du PDF de bilan),
  `isomorphic-dompurify`.

**Aucune bibliothèque d'arithmétique décimale.** Ni `decimal.js`, ni `big.js`, ni `dinero.js`.
Tous les montants sont des `number` JavaScript, en euros, en virgule flottante — y compris dans
`agregation.ts` où ils s'additionnent en boucle. Voir § 11.

---

## 11. Trois constats qui engagent la suite

Ils sont ici parce qu'ils sont **factuels**, pas parce qu'ils proposent une architecture.

### 11.1 Les montants sont des flottants, partout

`amountHT: v.number()` dans le schéma, `totalHT += l.amountHT` dans `agregation.ts`,
`parseMontant()` qui rend un `Number`. Aucune arithmétique décimale nulle part.

Pour EGalim, c'est tolérable : on produit un **ratio**, et l'erreur de représentation est très
inférieure au bruit de classification.

Pour le recouvrement, le brief exige (§ 4.3) « une arithmétique décimale exacte, jamais de
flottants sur des montants » et « le même dossier rejoué donne le même résultat au centime ».
**Le socle actuel ne satisfait pas cette exigence** et aucune brique existante ne peut y être
réutilisée telle quelle sur ce point précis.

### 11.2 La piste d'audit s'arrête au libellé, pas au document

Le brief demande (§ 2) que « chaque valeur produite soit traçable jusqu'à sa source
documentaire ». Aujourd'hui : `invoiceLines` porte `documentId`, `rawLabel`, `justification`,
`confidence`, `classifierVersion`. **La chaîne est complète pour une ligne.**

Ce qui manque : rien ne relie une **valeur agrégée** (un ratio, un `gapEuros`) à l'ensemble des
lignes qui l'ont produite autrement qu'en rejouant la requête. `diagnostics` stocke les ratios
figés, mais pas la liste des `invoiceLines` retenues. Pour un décompte de créance opposable en
justice, cette indirection ne suffira pas.

### 11.3 Le vocabulaire du socle est en français et orienté facture d'achat

`invoiceBatches`, `invoiceLines`, `suppliers`, `rawLabel`, `normalizedLabel`. Le socle parle de
**fournisseurs** et d'**achats**. Le recouvrement parle de **clients** et de **ventes** : la même
facture, vue de l'autre côté. Ce n'est pas un obstacle technique, mais tout renommage
« neutre » touchera le schéma Convex, donc les données de production.

---

## 12. Ce que je ne sais pas

Liste des ambiguïtés qui subsistent après lecture complète. Aucune n'a été tranchée par
supposition.

1. ~~**`ai` et `@openrouter/ai-sdk-provider` sont-ils réellement utilisés ?**~~ **Résolu.** Ils ne
   sont consommés que par `scripts/model-eval/**` (banc d'essai de modèles via OpenRouter), jamais
   par `src/`. Ce ne sont pas des reliquats, mais ils sont **mal classés** : déclarés en
   `dependencies` alors qu'ils relèvent de `devDependencies`. Correction cosmétique, hors périmètre
   de cet audit.

2. **Cloudflare ou Vercel ?** `CLAUDE.md` dit Cloudflare Workers, le dépôt contient
   `vercel.json`, la dépendance `vercel`, et deux scripts de vérification Vercel. La mémoire
   projet dit Vercel. **Je pars du principe que c'est Vercel**, mais `CLAUDE.md` doit être
   corrigé.

3. **Y a-t-il des données de production dans la base Convex ?** Cela conditionne entièrement la
   stratégie de renommage du schéma (§ 11.3). La mémoire projet dit « base Fleet vidée » au
   24/08/2026, mais ne dit rien des dépôts EGalim depuis.

4. ~~**Le composant `@convex-dev/agent` sert-il encore ?**~~ **Résolu, et c'est un mort-vivant.**
   Il est enregistré dans `convex.config.ts` et ses tables sont documentées en commentaire dans
   `schema.ts`, mais **aucun code applicatif ne l'importe**. Il provisionne des tables et fait
   tourner une tâche horaire (§ 5) pour un support client qui n'existe pas dans l'interface.

5. ~~**Quelle est la politique de rétention des `invoiceDocuments` ?**~~ **Résolu, et rassurant.**
   `files/vacuum.ts` n'interroge que `components.agent.files` — les fichiers du composant *agent*,
   pas le `_storage` applicatif. **Les `invoiceDocuments` ne sont touchés par aucune tâche
   planifiée.** Ils ne sont supprimés que par les chemins RGPD explicites (`rgpd.ts`). Le seuil de
   24 h de `vacuum.ts` ne les concerne pas.

6. **Le recouvrement s'ajoute-t-il à EGalim, ou le remplace-t-il commercialement ?** Le brief dit
   que la verticale EGalim doit continuer à fonctionner (§ 2, § 10), ce qui est un critère
   **technique**. Il ne dit pas si Letikette continue à la **vendre**. La réponse change le
   traitement de `src/marketing/` (2 359 LOC de discours EGalim) et de `paddlePlanTier`, qui ne
   connaît que `'diagnostic' | 'conformite'`.

7. **Une créance porte-t-elle une seule devise ?** `organizations` a un champ `currency` mais
   `country`/`currency` sont décrits comme « figés FR pour la phase POC ». Le brief évoque
   d'autres pays en Phase 5. Je ne sais pas si le multi-devise est dans le périmètre.

8. **Quel est le statut juridique de Letikette vis-à-vis du recouvrement ?** Le brief exclut
   l'envoi de relances au nom du client (§ 8) parce que c'est une activité encadrée. Il ne dit
   pas si la **génération** d'un acte destiné à être signifié par un commissaire de justice pose
   la même question. C'est hors de ma compétence et ça doit être tranché avant la Phase 5.

9. **Les valeurs juridiques listées comme « à fournir » le seront quand ?** Huit paramètres
   (§ 4.1 du brief) sont annoncés `null`. Le module `l126-creances-commerciales` doit se déclarer
   indisponible tant qu'ils ne sont pas `verified` — mais `injonction-de-payer`, prévu comme
   opérationnel en premier, a besoin d'au moins le taux d'intérêt légal et le délai de
   prescription. **Sans ces deux valeurs, la Phase 3 produit un décompte non chiffrable.**

---

## Ce que cet audit ne dit pas

Aucune architecture n'est proposée. La frontière socle/verticale, l'interface d'injection d'un
référentiel, la liste des déplacements et les risques de régression sont l'objet du livrable de la
Phase 1, `ARCHITECTURE.md`.
