# Pivot EGalim — tri de la base et Moulinette Audit

**Date : 15 août 2026 · Statut : validé · Auteur : Jules + Claude**

Spec de conception pour la transformation de la plateforme Mycelium Fleet OS en plateforme
d'opérateur de la conformité EGalim en restauration collective.

Référence métier : [`docs/agri/business-plan/`](../../agri/business-plan/00-README.md) (révision du
15 août 2026) et [`docs/agri/playbook-90-jours-restauration-collective.md`](../../agri/playbook-90-jours-restauration-collective.md).

---

## 1. Contexte et décisions de cadrage

Le produit Fleet OS est **définitivement arrêté** : aucun client, aucune démo, aucun engagement.
La plateforme est transformée **sur place**, dans le même dépôt, pour réutiliser la plomberie déjà
déployée (auth, multi-tenant, stockage, emails, facturation) plutôt que de repartir de zéro.

Quatre décisions prises en amont de cette spec :

| Décision | Choix retenu |
|---|---|
| Dépôt | Transformation in-place, pas de nouveau dépôt |
| Profondeur du tri | **Suppression franche** du métier Fleet, pas de parking |
| Forme du produit V0 | **Client-facing et multi-tenant dès le départ** |
| Périmètre V0 | Coquille client minimale + Moulinette Audit complète (approche A) |

Le repère produit reste l'échelle de valeur en 6 étages du doc 03. Seuls les **étages 0 à 2**
(diagnostic, déclaration assistée, abonnement Conformité) justifient du code en année 1.

### Contrainte calendaire

La gate du playbook est **fin août 2026** : la Moulinette doit produire un ratio juste, vérifié à la
main, avec moins de 5 % d'erreur sur 100 lignes. Tant que cette gate n'est pas franchie, la
prospection ne démarre pas. Le playbook alloue la semaine du 22-28 août au développement de la
Moulinette ; le tri s'insère dans la semaine du 15-21, en parallèle du travail commercial non-dev.

---

## 2. Le tri

### 2.1 Principe

On ne classe pas par « ça pourrait resservir » — tout peut resservir, c'est ainsi qu'on accumule
66 tables. On classe par : **est-ce que ça sert un étage commercial ouvert ou sur le point de
l'être ?**

`git tag fleet-os-final` est posé avant toute suppression. Rien n'est jamais perdu : le moteur de
réservations et de calendrier, dont le doc 05 prévoit la réutilisation à l'étage 5 (année 2-3,
« peut-être jamais »), reste intégralement récupérable depuis l'historique.

### 2.2 Tables conservées (16)

| Table | Traitement |
|---|---|
| `organizations` | **Retypée** — voir 2.5 |
| `organizationMembers` | Tel quel |
| `organizationInvitations` | Tel quel |
| `userProfiles` | Tel quel |
| `myceliumStaff` | **Retypée** — `staffRole`, `specialty` |
| `staffInvitations` | **Retypée** — `staffRole` |
| `conciergeOrgAccess` | Tel quel |
| `notifications` | **Retypée** — types métier |
| `emailEvents` | Tel quel |
| `adminAuditLogs` | Tel quel (traçabilité : utile sur un produit de conformité) |
| `adminSettings` | Tel quel |
| `clientTimelineEvents` | **Retypée** — types d'événements |
| `conciergeTickets` | **Retypée** — `sourceType` |
| `conciergeTicketMessages` | Tel quel |
| `humanAssistRequests` | Tel quel |
| `humanAssistMessages` | Tel quel |

Le trio `myceliumStaff` + `staffInvitations` + `conciergeOrgAccess` est la brique la plus précieuse
du legacy : il implémente déjà « un opérateur Mycelium travaille dans les organisations de ses
clients », qui est exactement le modèle d'accès dont l'activité EGalim a besoin. Le doc 05 ne le
mentionne pas.

### 2.3 Tables supprimées (50)

**Métier flotte (22)** — `vehicles`, `maintenanceSchedules`, `garages`, `maintenanceRecords`,
`vehicleMaintenanceConfig`, `reservations`, `userIntegrations`, `driverProfiles`,
`driverRestrictions`, `vehicleInspections`, `trafficViolations`, `costs`, `optimizerReports`,
`mileageRateConfigs`, `mileageExpenses`, `smartcarConnections`, `incidents`, `fuelImports`,
`fuelAnomalies`, `vehicleAssignments`, `carbonReports`, `complianceAlerts`

**Intégrations comptables et API publique (7)** — `accountingIntegrations`,
`accountingCategoryMappings`, `accountingSyncLogs`, `oauthStates`, `apiKeys`, `webhookEndpoints`,
`webhookDeliveries`

**Commercial et démo (9)** — `salesGamification`, `salesBadges`, `salesChallenges`, `salesSignals`,
`salesProspects`, `salesConciergeThreads`, `salesConciergeMessages`, `demoVehiclePositions`,
`demoAccessTokens`

**Boilerplate SaaS de template (10)** — `supportThreads`, `internalUserNotes`,
`pendingAdminNotifications`, `adminNotificationPreferences`, `adminProfiles`,
`founderWelcomeEmails`, `dashboardCounters`, `aiChatThreads`, `fileMetadata`, `commsIntegrations`

**Divers (2)** — `messages` (table de démo), `conversations` (historique de chat des agents Fleet)

`fileMetadata` n'est consommé que par `aiChat/` et `support/`, tous deux supprimés ; `storage.ts`
n'en dépend pas. Sa suppression n'affecte donc pas le téléversement de factures.

### 2.4 Fichiers et routes supprimés

**Convex — racine :** `vehicles.ts`, `reservations.ts`, `maintenance.ts`, `garages.ts`, `drivers.ts`,
`inspections.ts`, `violations.ts`, `incidents.ts`, `costs.ts`, `expenses.ts`, `fuelImport.ts`,
`fuelParsers.ts`, `smartcar.ts`, `optimizer.ts`, `carbon.ts`, `carbonFactors.ts`, `bik.ts`,
`bikRates.ts`, `fiscal.ts`, `fiscalRates.ts`, `ikRates.ts`, `mileageRates.ts`, `alerts.ts`,
`compliance.ts`, `dashboard.ts`, `messages.ts`, `comms.ts`, `conversations.ts`,
`reminderTemplates.ts`, `autumn.ts`

**Convex — répertoires :** `maintenance/`, `sales/`, `demo/`, `seeds/`, `support/`, `aiChat/`,
`admin/support/`, `admin/founderWelcome/`, `admin/notificationPreferences/`, `admin/counters.ts`,
`integrations/` (intégralité), `exports/financial.ts`, `agents/` (intégralité — voir 2.6),
`concierge/demos.ts`, `concierge/fleetObserver.ts`, `concierge/health.ts`, `concierge/tasks.ts`

Les modules `concierge/` restants (`mutations.ts`, `queries.ts`, `staff.ts`, `tickets.ts`,
`timeline.ts`, `humanAssist.ts`, `clientPortal.ts`, `sla.ts`, `priority.ts`) sont **conservés et
retypés**. Règle d'arbitrage : toute fonction qui référence une table supprimée est retirée ; le
reste est adapté au vocabulaire EGalim.

**Routes SvelteKit :** `admin/fleet`, `admin/reservations`, `admin/maintenance`, `admin/drivers`,
`admin/incidents`, `admin/violations`, `admin/finance`, `admin/expenses`, `admin/sustainability`,
`admin/compliance`, `admin/support`, `app/reservations`, `app/incidents`, `app/fleet-care`,
`app/expenses`, `sales/`, `demo/`, `concierge/demos`, `api/smartcar`, `api/google-calendar`,
`api/microsoft-calendar`, `api/manager`, `api/compliance`, `api/sales`, `api/v1`, `api/webhooks`,
`sidebar-07`, `shadcn-demo`, `_dev`

**Composants :** `components/fleet`, `maintenance`, `reservations`, `drivers`, `inspections`,
`violations`, `finance`, `expenses`, `sustainability`, `calendar`, `sales`, `demo`, `fleet-care`,
`manager-agent`, `customer-support`, `integrations`

**i18n :** suppression des messages `en`, `de`, `es`. Seul `fr` est conservé.

### 2.5 Retypages

**`organizations`** — les champs `sector` et `size` deviennent des champs cantine :
`etablissementType` (RIE · CLINIQUE · EHPAD · CRECHE · ECOLE_PRIVEE · AUTRE), `couvertsJour`
(nombre), `gestionDirecte` (booléen), `siret` (optionnel). `distanceUnit` est supprimé.
`country`, `currency`, `timezone` et `locale` sont conservés mais figés sur FR / EUR /
Europe-Paris / fr — les supprimer imposerait une migration sans bénéfice.

**`notifications`** — nouveaux types : `FACTURES_RECUES`, `DIAGNOSTIC_PRET`, `LIGNES_A_ARBITRER`,
`RATIO_EN_DERIVE`, `DECLARATION_A_FAIRE`, `ATTESTATION_MANQUANTE`.

**`myceliumStaff`** — `staffRole` réduit à `SUPER_ADMIN | OPERATOR` ; `specialty` supprimé.
**`staffInvitations`** — même réduction de `staffRole`.

**`clientTimelineEvents`** — nouveaux types : `ONBOARDING`, `FACTURES_DEPOSEES`,
`DIAGNOSTIC_REMIS`, `RATIO_MESURE`, `DECLARATION_DEPOSEE`, `ABONNEMENT`, `NOTE_OPERATEUR`.

**`conciergeTickets`** — `sourceType` réduit à `HUMAN_ASSIST | REVUE_LIGNES | MANUAL`.

**`billing.ts` → `PLAN_FEATURES`** — les paliers Fleet (essential / professional / business /
enterprise) sont remplacés par les étages commerciaux : `DIAGNOSTIC` (one-shot), `CONFORMITE`
(190–390 €/mois), `OPERATEUR` (450–900 €/mois). Le mécanisme `resolveEffectivePlan()`, le bypass
dev et le quota de sièges sont conservés tels quels.

**Rôles client** — `ORG_MANAGER` est supprimé (il était déjà marqué « post-MVP »). Restent
`ORG_ADMIN` et `ORG_MEMBER`.

### 2.6 Les quatre gabarits à lire avant suppression

Ces quatre modules implémentent déjà, sur un autre métier, la mécanique dont la Moulinette a
besoin. Ils sont lus et transposés **avant** d'être supprimés — pas de `git rm` à l'aveugle.

| Module | Ce qu'il apporte |
|---|---|
| `fuelImport.ts` + `fuelParsers.ts` + wizard `/admin/finance/fuel-import` | Le pipeline : parsing multi-format, détection automatique de provider, normalisation, **règles d'anomalie → file de revue humaine Accept/Reject**, écriture idempotente |
| `ImportFleetModal` / `ImportCostsModal` | Wizard d'import CSV en 3 étapes (dépôt → mapping de colonnes → validation) → devient le parcours de dépôt de factures |
| `maintenance/detector.ts` | Surveillance de seuils, **dédoublonnage d'alertes**, génération de notification → mécanique de l'étage 2 |
| `agents/concierge.ts` + `agents/prompts.ts` + `optimizer.ts` | Pattern d'appel Claude depuis une action Convex : `cache_control`, sortie structurée |

> **Correction du 15/08/2026, après lecture effective des sources.** Trois attributions de ce
> tableau étaient fausses et sont rectifiées ci-dessus :
>
> 1. `processFuelImport` **ne découpe pas en lots et ne se re-planifie pas** — il traite le fichier
>    entier en un seul appel d'action, une mutation par ligne. Le découpage en lots auto-replanifiés
>    est donc du **travail neuf** pour la Moulinette, pas une transposition.
> 2. `agents/compliance.ts` est un **agent de questions-réponses en lecture seule** sur une table
>    alimentée ailleurs. Le dédoublonnage et la génération d'alertes sont dans
>    `maintenance/detector.ts`.
> 3. **Aucun chemin d'appel à Claude n'implémente de retry ni de backoff** (`concierge.ts`,
>    `compliance.ts`, `optimizer.ts` abandonnent tous sur `fetch` en échec). La robustesse décrite
>    en 4.3 est intégralement à construire.

### 2.7 La landing publique

La landing actuelle vend du fleet management. Des prospects cantine y seront envoyés dès septembre,
après un appel dont l'accroche porte sur leur chiffre EGalim. Elle est donc **dépubliée dans le
cadre du tri** : les sections Fleet (agents IA, marquee d'intégrations, concierge humain, preuve
chiffrée flotte) sont supprimées, il reste une page sobre — pitch EGalim, chiffres du doc 10,
formulaire de contact.

La structure est conservée : header, footer, tokens de design, effet glass-metal, composants
marketing génériques. La refonte complète de la landing est en phase 2 (octobre), avec le
simulateur public.

### 2.8 Marque

**« Mycelium » est conservé, « Fleet OS » est supprimé partout.** Le nom convient mieux à un
opérateur qui relie cantines et producteurs qu'il ne convenait à de la gestion de flotte. Domaine,
logo et favicon sont inchangés.

### 2.9 Critère de fin du tri

Le tri est terminé quand, et seulement quand :

1. `bun run build` passe sans erreur ;
2. `bunx tsc --noEmit` passe sans erreur ;
3. le déploiement Convex passe (schéma cohérent, aucune référence orpheline) ;
4. un utilisateur peut s'inscrire, créer une organisation et téléverser un fichier ;
5. un compte `myceliumStaff` peut se connecter et voir la liste des organisations.

---

## 3. Le modèle de domaine EGalim

### 3.1 Le barème, source de vérité

Source : [`docs/agri/business-plan/10-fiche-egalim-1page.md`](../../agri/business-plan/10-fiche-egalim-1page.md).

**Trois seuils légaux**, tous calculés **en valeur d'achat HT** :

- ≥ **50 %** de produits durables et de qualité (global)
- ≥ **20 %** de produits bio (global)
- ≥ **60 %** de durable sur les familles **viande et poisson**

**Dénominateur : la totalité des achats alimentaires.** La première question posée à chaque ligne
est donc « est-ce de l'alimentaire ? » — un produit d'entretien sorti du dénominateur, et tous les
ratios sont faussés vers le bas.

**Barème de qualification :**

| Label | Durable | Bio |
|---|---|---|
| Bio (AB, Eurofeuille) | ✅ | ✅ |
| En conversion vers le bio | ✅ | ✅ |
| Label Rouge | ✅ | ❌ |
| AOP / AOC / IGP / STG | ✅ | ❌ |
| HVE niveau 3 | ✅ | ❌ |
| Mention « fermier » | ✅ | ❌ |
| Pêche durable (MSC, écolabel) | ✅ | ❌ |
| Commerce équitable | ✅ | ❌ |
| Régions ultrapériphériques (RUP) | ✅ | ❌ |
| Coût du cycle de vie | ✅ | ❌ |
| « Local », « circuit court », « de saison » | ❌ | ❌ |
| « Fait maison », « artisanal », « de qualité » | ❌ | ❌ |

### 3.2 Le référentiel est du code, pas des données

`src/lib/egalim/referentiel.ts` exporte : les labels qualifiants et leur mapping durable/bio, les
familles de produits, les trois seuils, les règles de dérivation, les sources officielles, et une
constante `REFERENTIEL_VERSION` (valeur initiale `'2026-08'`).

Justification : la fiche EGalim impose de revérifier le barème *avant toute production de rapport
client*. Un fichier versionné passe en revue de code et se tague ; une table éditable en production
laisse une faute de frappe casser silencieusement tous les rapports. Ce fichier est également
envoyé en `cache_control` dans le prompt de classification — stable, donc quasi gratuit sur les
appels suivants.

Chaque classification enregistre le `classifierVersion` avec lequel elle a été produite.

### 3.3 Les huit tables du domaine

**`invoiceBatches`** — un dépôt de factures.
`organizationId` · `label` · `periodStart` · `periodEnd` · `status` (`DRAFT` → `EXTRACTING` →
`CLASSIFYING` → `REVIEW` → `READY` → `FAILED`) · `uploadedBy` · `documentsTotal` · `linesTotal` ·
`linesPendingReview` · `createdAt`.
Index : `by_org`, `by_org_and_status`.

**`invoiceDocuments`** — un fichier déposé.
`organizationId` · `batchId` · `storageId` · `filename` · `mimeType` · `sourceType`
(`CSV | PDF_TEXT | PDF_SCAN | PHOTO`) · `extractionStatus` (`PENDING | DONE | FAILED`) ·
`extractionError` · `supplierId?` · `invoiceDate?` · `invoiceNumber?` · `totalHT?` · `linesCount`.
Index : `by_batch`, `by_org`, `by_batch_and_status`.

**`invoiceLines`** — la table centrale. Volume attendu : ~3 000 lignes par cantine et par an.

| Champ | Rôle |
|---|---|
| `organizationId`, `batchId`, `documentId` | Rattachement |
| `rawLabel`, `normalizedLabel` | Le libellé source et sa forme normalisée |
| `quantity`, `unit`, `unitPrice`, `amountHT` | Les montants source, jamais modifiés |
| `invoiceDate`, `supplierId` | Contexte |
| `isFood` | Entre ou non dans le dénominateur |
| `family` | `VIANDE` · `POISSON` · `FRUITS_LEGUMES` · `LAITIERS` · `EPICERIE_SECHE` · `EPICERIE_APPERTISEE` · `BOISSONS` · `AUTRE` |
| `qualifyingLabels[]` | `AB` · `CONVERSION` · `LABEL_ROUGE` · `AOP_AOC_IGP_STG` · `HVE3` · `FERMIER` · `PECHE_DURABLE` · `COMMERCE_EQUITABLE` · `RUP` · `CYCLE_DE_VIE` |
| `isBio`, `isDurable` | **Dérivés** de `qualifyingLabels`, jamais saisis directement |
| `justification` | **Obligatoire.** Aucune classification sans phrase justificative |
| `confidence` | 0–1 |
| `reviewStatus` | `AUTO` · `PENDING_REVIEW` · `CONFIRMED` · `CORRECTED` |
| `proofStatus` | `PROVEN` · `TO_JUSTIFY` · `NONE` |
| `classifierVersion` | Version du référentiel ayant produit la classification |

Index : `by_batch`, `by_org_and_date`, `by_batch_and_review_status`, `by_normalized_label`.

`proofStatus = TO_JUSTIFY` identifie les produits vraisemblablement labellisés dont la facture ne
porte pas la mention. C'est le gisement du point 6 du livrable diagnostic (doc 03), qui rapporte
3 à 8 points de ratio et rembourse souvent la prestation à lui seul.

**`productLabels`** — le cache de classification par libellé distinct. **Table globale, sans
`organizationId`.**
`normalizedLabel` (clé) · `isFood` · `family` · `qualifyingLabels[]` · `justification` ·
`confidence` · `source` (`AUTO | HUMAN`) · `confirmedBy?` · `confirmedAt?` · `classifierVersion` ·
`occurrences`.
Index : `by_normalized_label`, `by_source`.

> **Garde-fou multi-tenant.** Cette table ne stocke **que** la chaîne de libellé et sa
> classification. Jamais de montant, de quantité, de fournisseur ni de rattachement à une
> organisation. Ce qui est mutualisé est du référentiel produit, pas de la donnée client. La règle
> d'isolation par `organizationId` reste intacte sur toutes les autres tables.

**`suppliers`** — normalisation des fournisseurs.
`organizationId` · `name` (normalisé) · `rawNames[]` (variantes rencontrées) · `siret?` · `type`
(`GROSSISTE | PRODUCTEUR | AUTRE`) · `attestationStatus` (`NONE | REQUESTED | RECEIVED | REFUSED`).
Index : `by_org`, `by_org_and_name`.

**`diagnostics`** — le rapport figé.
`organizationId` · `batchId` · `periodStart` · `periodEnd` · `computedAt` · `classifierVersion` ·
`ratios` (`durable`, `bio`, `meatFishDurable`, `totalFoodHT`, `totalHT`) · `byFamily[]` ·
`bySupplier[]` · `byMonth[]` · `gapEuros` (`toDurable50`, `toBio20`, `toMeatFish60`) ·
`plan[]` (familles prioritaires par coût d'accès croissant) · `status` (`DRAFT | DELIVERED`) ·
`deliveredAt?` · `tier` (`S | M | L`) · `pricePaid?`.
Index : `by_org`, `by_org_and_period`.

> **Règle d'auditabilité : un diagnostic livré est figé, définitivement.** Les ratios sont stockés
> calculés, jamais recalculés à la volée. Un arbitrage postérieur qui modifie une ligne ne doit pas
> altérer un rapport déjà remis au client. Une nouvelle mesure produit un **nouveau** diagnostic
> daté — c'est aussi ce qui rend la progression mesurable pour l'abonnement Conformité.

**`attestationRequests`** — les courriers de demande de justificatif.
`organizationId` · `supplierId` · `diagnosticId` · `lineIds[]` · `amountAtStake` · `status`
(`DRAFT | SENT | RECEIVED | REFUSED`) · `sentAt?` · `letterStorageId?`.
Index : `by_org`, `by_diagnostic`, `by_supplier`.

**`classificationJobs`** — suivi et contrôle de coût.
`organizationId` · `batchId` · `status` · `labelsTotal` · `labelsDone` · `labelsFailed` ·
`tokensIn` · `tokensOut` · `costEur` · `startedAt` · `finishedAt?` · `error?`.
Index : `by_batch`.

### 3.4 Ce qui n'est pas construit

Pas de table catalogue produit, pas de commandes, pas de producteurs, pas de tournées. Ce sont les
étages 3 à 5. Le POC s'arrête au papier.

### 3.5 Bilan

| | Avant | Après |
|---|---|---|
| Tables | 66 | **24** (16 conservées + 8 nouvelles) |
| Lignes Convex | ~36 300 | ~16 000 |
| Routes | ~50 | ~22 |

---

## 4. Le pipeline de la Moulinette Audit

### 4.1 Le principe économique : classer des libellés, pas des lignes

Sur ~3 000 lignes de facture annuelles, il n'y a que **300 à 500 libellés distincts** —
`CAROTTE RONDELLE 4/4 BIO 2.5KG` revient quarante fois dans l'année.

Conséquences :

1. **Coût divisé par 6 à 10.**
2. **Cohérence garantie** — le même produit ne peut pas être bio en mars et conventionnel en juin.
3. **Effet cumulatif** — `productLabels` étant partagé entre clients, et les grossistes de la
   restauration collective étant peu nombreux, le coût marginal du n-ième diagnostic tend vers zéro.

### 4.2 Les sept étapes

```
1. DÉPÔT (côté cantine)            fichiers → invoiceDocuments
2. EXTRACTION                       document → invoiceLines brutes
3. NORMALISATION                    libellés distincts + fournisseurs dédupliqués
4. CLASSIFICATION                   libellés inconnus → Claude par lots → productLabels
5. REVUE HUMAINE (côté Mycelium)    libellés sous seuil → arbitrage par libellé
6. AGRÉGATION                       3 ratios + décompositions + écart en euros
7. RAPPORT                          page client + plan de comblement + courriers d'attestation
```

**Étape 2 — Extraction.** Trois chemins par ordre de préférence : **CSV / export comptable** (le
chemin royal, réclamé en priorité par le script commercial), **PDF texte** (extraction du texte puis
structuration par Claude en sortie typée), **PDF scanné / photo** (OCR).

> **Révision du 15/08/2026, après analyse d'une vraie facture.** Le périmètre initial — « CSV et PDF
> texte uniquement, OCR reporté » — ne tient pas. Les factures arrivent en **PDF texte, PDF scanné,
> image, photo, CSV, Excel et texte brut**, avec une **disposition différente par fournisseur** et
> des erreurs de reconnaissance. Un parseur par forme ne survit pas à cette diversité : chaque
> nouvelle disposition demande une heuristique de plus, et elle casse **silencieusement** — elle
> produit des lignes fausses plutôt qu'une erreur.
>
> **Deux chemins remplacent la famille de parseurs :**
>
> | Entrée | Traitement |
> |---|---|
> | CSV, Excel | Parseur déterministe — déjà structuré, exact, gratuit |
> | PDF, image, photo, texte brut | **Claude en extracteur**, sortie typée |
>
> Claude Opus 5 lit les images de documents nativement (2 576 px sur le grand côté). Une photo, une
> page scannée et un texte océrisé passent par le même appel.
>
> **L'extraction n'est pas crue sur parole : elle est vérifiée.** Une facture porte ses propres
> invariants — total HT, bases de TVA par taux. Si la somme des lignes extraites n'y retombe pas,
> l'extraction est relancée en signalant l'écart, deux fois au maximum, puis le document part en
> revue humaine. C'est ce qui rend une extraction par LLM fiable.
>
> **Conséquence de coût :** extraire coûte des tokens **par document**, là où classer coûte par
> libellé distinct. Un dossier de quarante pages scannées pousse au-delà de la fourchette de 0,50 à
> 2 € du doc 05. Trois leviers, dans l'ordre : réclamer l'export comptable (le chemin CSV est
> gratuit), l'API Batches (−50 %), un modèle moins cher sur la seule extraction.

**Étape 4 — Classification.** Lots d'environ 50 libellés par appel Claude, référentiel en
`cache_control`, sortie structurée. L'action Convex traite un lot puis **se re-planifie** pour le
suivant. Idempotent : un libellé déjà présent dans `productLabels` avec le `REFERENTIEL_VERSION`
courant n'est pas reclassé, donc relancer un lot est toujours sûr.

> Le découpage en lots auto-replanifiés est **à construire** : contrairement à ce que supposait la
> première rédaction, `processFuelImport` traite son fichier en un seul appel. Compter une
> demi-journée de plus au jour 3 de la phase 1.

**Étape 5 — Revue humaine.** Partent en file d'arbitrage :

- les libellés dont la `confidence` est sous le seuil (valeur initiale : **0,85**) ;
- **systématiquement** les libellés classés `VIANDE` ou `POISSON`, parce que ces familles portent
  le seuil des 60 % où une erreur coûte le plus cher.

L'arbitrage se fait **par libellé, pas par ligne** : une décision règle toutes ses occurrences. Un
arbitrage humain écrit dans `productLabels` avec `source = HUMAN` et n'est plus jamais reposé, chez
aucun client.

**Étape 6 — Agrégation.** Somme des `amountHT` où `isFood = true`, ventilée par famille, par
fournisseur et par mois. Les trois ratios, puis l'écart en euros vers chaque seuil.

**Étape 7 — Rapport.** Contenu, dans l'ordre du doc 03 : le ratio réel (3 seuils) → décomposition
par famille et par fournisseur → écart chiffré en euros → plan de comblement par coût d'accès
croissant → simulation à budget constant → lignes `TO_JUSTIFY` et courriers d'attestation → fichier
de saisie « ma cantine ».

### 4.3 Robustesse

> **Un document illisible ne bloque jamais le lot.**

Un document en échec passe en `extractionStatus = FAILED` avec sa raison ; le lot continue.
L'opérateur le voit dans son espace et le traite à part. Sans cette règle, un unique PDF corrompu
dans un dépôt de quarante fichiers bloque le premier diagnostic réel.

Même logique sur les appels Claude : 3 tentatives avec backoff exponentiel, puis le lot bascule en
revue manuelle. Jamais d'échec silencieux, jamais de blocage global.

Aucun code existant ne fait ça : les trois chemins d'appel à Claude du legacy abandonnent sur un
`fetch` en échec, sans retry. C'est donc du travail neuf, et il compte d'autant plus que la
Moulinette appelle Claude bien plus souvent que ne le faisaient les agents Fleet.

### 4.4 Garde-fou de coût

`classificationJobs` comptabilise tokens et euros par lot, avec un **plafond dur par lot** (valeur
initiale : **10 €**) qui met le traitement en pause et notifie l'opérateur. Le doc 05 budgète 0,50
à 2 € par diagnostic ; un lot qui dérive signale une anomalie (dump massif, boucle) qui doit être
connue avant la facture, pas après.

### 4.5 Le rapport comme livrable

Le livrable client est **une page web dans son espace** — cohérent avec le choix client-facing, et
supérieur à un PDF pour la restitution d'une heure sur site (on déroule, on filtre, on montre le
détail d'une famille à la demande).

Pour le document à laisser : **une feuille de style d'impression soignée**. Un générateur PDF
serveur coûte une journée et ne se justifie que sur demande client explicite.

---

### 4.6 Décisions d'API Claude

Vérifiées le 15/08/2026 contre la référence API. Elles conditionnent le coût et la fiabilité de
la classification, et plusieurs corrigent une hypothèse fausse.

| Sujet | Décision | Raison |
|---|---|---|
| SDK | **`@anthropic-ai/sdk`** (officiel, à installer) | Le projet n'a que `ai` (Vercel) + `@openrouter/ai-sdk-provider`. Le `cache_control` et les sorties typées passent par le SDK natif. |
| Modèle | **`claude-opus-5`** | Défaut. Un modèle moins cher est un arbitrage de Jules, pas un choix par défaut. |
| Sortie typée | **`output_config.format`** (`json_schema`) | **Le prefill assistant renvoie une 400 sur Opus 5.** La technique classique du `{"` en amorce est morte. |
| Effort | `output_config: { effort: 'low' }`, thinking laissé actif | La classification n'est pas un raisonnement profond. Sur Opus 5, `low` reste excellent. |
| Thinking | **ne pas désactiver** | Désactivé, Opus 5 peut faire fuiter des balises `<thinking>` dans la réponse. `effort: low` coûte moins cher sans ce risque. |
| Échantillonnage | **aucun paramètre** | `temperature`, `top_p`, `top_k` renvoient une **400** sur Opus 5. |
| Cache | `cache_control: { type: 'ephemeral' }` sur le dernier bloc système | Le référentiel y va en entier. Minimum cacheable : **512 tokens** sur Opus 5 — le référentiel les dépasse largement. |
| `max_tokens` | 8 000 par lot de 50 libellés | Sous le seuil de 16 000 où le streaming devient nécessaire. |

**Ordre de rendu du prompt : `tools` puis `system` puis `messages`.** Le référentiel est stable et va
donc en premier, dans `system`, avec le point de cache sur son dernier bloc. Les libellés à classer
partent dans `messages`, **après** le point de cache — sinon chaque lot réécrit le cache au lieu de
le lire.

**Vérification obligatoire :** `usage.cache_read_input_tokens`. S'il reste à zéro sur des lots
successifs, le cache ne prend pas et le coût par diagnostic explose. Cause la plus probable : une
date, un identifiant de lot ou un `Date.now()` glissé dans le prompt système.

**Piste de phase 2 : l'API Batches** (`/v1/messages/batches`) donne **-50 % sur tous les tokens**,
avec un traitement sous 24 h. Un diagnostic n'est pas sensible à la latence — le client dépose ses
factures et reçoit son rapport plus tard. Ça diviserait le coût d'API par deux. Non retenu en V0
parce que ça ajoute une machine à états (soumission, sondage, reprise) là où des appels synchrones
par lots suffisent à prouver le produit.

## 5. Les deux espaces

Fleet avait trois espaces (`/admin` DAF, `/app` salarié, `/concierge` staff). Une cantine n'a
qu'une population d'utilisateurs : son gestionnaire. Un espace entier disparaît.

| Espace | Qui | Route |
|---|---|---|
| La cantine | Le gestionnaire du client | `/app/*` |
| Mycelium | L'opérateur, en vue multi-clients | `/ops/*` (renommage de `/concierge`) |

**Espace cantine — 4 routes**

| Route | Contenu |
|---|---|
| `/app` | Statut du diagnostic en cours, dernier ratio mesuré |
| `/app/factures` | Dépôt de fichiers, historique des dépôts, avancement du traitement |
| `/app/diagnostic/[id]` | Le rapport |
| `/app/parametres` | Couverts/jour, type d'établissement, SIRET |

**Espace Mycelium — 5 routes**

| Route | Contenu |
|---|---|
| `/ops` | Lots en cours, arbitrages en attente, diagnostics à remettre |
| `/ops/cantines` | Liste des clients et étage atteint par chacun |
| `/ops/cantines/[orgId]` | Fiche client : dépôts, diagnostics, timeline |
| `/ops/revue/[batchId]` | **File d'arbitrage par libellé** |
| `/ops/referentiel` | Consultation du référentiel et des libellés confirmés |

**Onboarding** — le wizard passe de 4 étapes à **une** : nom de la cantine, type d'établissement,
couverts/jour.

**Langue** — français uniquement. Les messages `en`, `de` et `es` sont supprimés. Le segment de
route `[[lang]]` est **conservé** : optionnel et sans effet fonctionnel, le retirer imposerait de
toucher chaque fichier de route pour un gain cosmétique.

---

## 6. Tests

L'effort de test suit la distribution du risque, il n'est pas uniforme.

| Cible | Type | Contenu |
|---|---|---|
| `referentiel.ts` | Unitaire, exhaustif | Chaque ligne du barème : `AB` → bio **et** durable · `HVE3` → durable seul · `LABEL_ROUGE` → durable seul · « local » → rien · « fait maison » → rien |
| Agrégation | Unitaire | Jeu de lignes fabriqué aux ratios connus d'avance, incluant le seuil 60 % viande/poisson et l'exclusion du non-alimentaire du dénominateur |
| Extraction CSV et PDF | Unitaire | Fixtures synthétiques (6.1), colonnes manquantes, montants malformés, encodages |
| Classification par Claude | **Aucun test unitaire** | Non déterministe. Sa validation est la gate : 100 lignes vérifiées à la main sur un **vrai** jeu de factures, < 5 % d'erreur |
| Parcours dépôt → rapport | Playwright E2E | **Phase 2**, pas en V0 |

### 6.1 Fixtures synthétiques

Un générateur de factures fournisseurs synthétiques est construit **au jour 1 de la phase 1**, et
ses sorties sont commitées comme fixtures. Elles sont reproductibles, exemptes de donnée client, et
leur vérité terrain est connue au centime — ce qui rend les tests d'agrégation exacts plutôt
qu'approximatifs.

Le générateur produit délibérément les pathologies du terrain, pas des factures propres :

- libellés tronqués ou codés (`CAR RD 4/4 AB 2K5`, `REF 88213`)
- **avoirs** : lignes négatives, qui doivent réduire numérateur **et** dénominateur
- frais de port, consignes et emballages : non-alimentaire mêlé aux denrées
- totaux intermédiaires de bas de page ressemblant à des lignes produit
- remises de ligne, unités hétérogènes (kg, pièce, colis, litre)
- mention de label tantôt dans le libellé, tantôt en colonne séparée, tantôt absente

### 6.2 Pourquoi les fixtures ne remplacent pas la gate

Les fixtures valident le **code**. La gate valide le **classifieur face au réel**. Ce sont deux
choses différentes, et la seconde ne peut pas être simulée : des fixtures écrites par l'auteur du
classifieur héritent de ses angles morts. En particulier, le gisement `proofStatus = TO_JUSTIFY` —
les produits réellement labellisés dont la facture ne porte pas la mention — est par construction
impossible à générer, puisqu'il faudrait connaître d'avance la réponse que l'on cherche à détecter.
Or c'est le point 6 du livrable diagnostic, celui qui rembourse la prestation.

Les jeux de factures publics (SROIE, CORD et assimilés) sont des benchmarks d'OCR génériques : ni
format de grossiste alimentaire français, ni label EGalim. Ils ne conviennent pas.

**Un seul vrai jeu de factures suffit pour la gate.** Un restaurant a exactement les mêmes factures
fournisseurs qu'une cantine.

Le référentiel porte le risque maximal : une règle de dérivation fausse contamine tous les rapports
silencieusement, et engage la responsabilité de conseil. C'est le seul endroit où la couverture doit
être exhaustive.

---

## 7. Roadmap

| Phase | Quand | Effort | Livrable |
|---|---|---|---|
| **0 — Le tri** | Semaine du 15-21 août 2026 | ~1 j | Base nette : 16 tables, build vert, auth/org/upload fonctionnels |
| **1 — Moulinette V0** | Semaine du 22-28 août 2026 | 5 j | Diagnostic produit de bout en bout |
| **🚪 Gate** | **Fin août 2026** | — | **100 lignes vérifiées à la main, < 5 % d'erreur** |
| 2 — Simulateur public + refonte landing | Octobre 2026 | 2 j | Aimant à prospects pour la fenêtre de janvier |
| 3 — Portail Conformité V1 | Déc. 2026 – janv. 2027 | 5 j | Historique des ratios, alertes de dérive, export « ma cantine » |
| 4 — Prise de commande | Printemps 2027 | — | **Uniquement si le journal de friction le désigne** |

**Découpage de la phase 1** — chaque jour produit quelque chose de vérifiable :

1. Schéma EGalim + `referentiel.ts` + **générateur de fixtures (6.1)** + extraction CSV
2. Extraction PDF texte + normalisation des libellés et des fournisseurs
3. Classification par lots + `productLabels` + garde-fou de coût
4. File de revue `/ops/revue` + agrégation des trois ratios
5. Rapport (page client + feuille d'impression) + dépôt côté cantine

### Découpage en plans d'implémentation

Cette spec couvre **deux chantiers distincts**. Ils reçoivent deux plans séparés :

1. **Le tri** — exécutable immédiatement, vérifiable en fin de journée sur les cinq critères du 2.9.
2. **La Moulinette V0** — planifiée une fois le terrain net.

Même règle que l'échelle de valeur commerciale : on ne monte pas d'étage tant que le précédent ne
tourne pas.

---

## 8. Risques

| Risque | Gravité | Parade |
|---|---|---|
| **Absence de jeu de factures réel** | Élevée — **sur la gate uniquement**, le développement n'est pas bloqué | Fixtures synthétiques (6.1) pour tout le développement et les tests unitaires. Pour la gate, un seul vrai jeu suffit : un restaurateur du réseau est le chemin le plus court. À demander avant le 28 août, sans urgence de calendrier |
| Référentiel erroné | Élevée — contamine tous les rapports, engage la responsabilité de conseil | Revue de code explicite par Jules avant le premier rapport client · tests unitaires exhaustifs · version tracée sur chaque classification |
| Hétérogénéité des PDF fournisseurs | Moyenne | Parade d'abord commerciale : le script d'appel réclame l'export comptable ou l'accès au portail du grossiste (80 % du travail d'extraction économisé, doc 05) |
| Dérive de coût API | Faible | Plafond dur par lot + suivi dans `classificationJobs` |
| Suppression d'un module encore utile | Faible | `git tag fleet-os-final` avant toute suppression · lecture des quatre gabarits (2.6) avant `git rm` |
| Reprise du développement hors cadre | Moyenne | Après la phase 1, aucune ligne de code sans entrée chronométrée dans le journal de friction (principe anti-dérive, doc 05 §5) |

---

## 9. Ce que cette spec ne couvre pas

- La refonte complète de la landing publique (phase 2)
- L'apprentissage de la disposition propre à chaque fournisseur (chaque facture est relue de zéro)
- La correction manuelle, ligne à ligne, d'une extraction en échec
- Le générateur PDF serveur
- Les étages 3, 4 et 5 : sourcing, producteurs, commandes, mandat de facturation, tournées
- Le multi-sites du palier tarifaire L
- Le renommage éventuel du dépôt Git
