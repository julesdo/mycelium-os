# Phase 0 — Tri de la base pour le pivot EGalim

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ramener la base Mycelium de 66 tables et ~36 000 lignes Convex à 16 tables et ~13 000 lignes, en supprimant intégralement le métier Fleet OS et en retypant la plomberie conservée vers le vocabulaire EGalim, sans casser l'auth, le multi-tenant, le stockage ni les emails.

**Architecture:** Suppression en cascade dirigée des consommateurs vers les producteurs — routes SvelteKit et composants d'abord, puis points d'entrée Convex (crons, routes HTTP), puis modules métier, puis tables du schéma. Les quatre modules identifiés comme gabarits réutilisables sont archivés dans `docs/superpowers/references/` avant suppression. Les retypages viennent en dernier, sur une base déjà nette.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes) · Convex 1.37 (déploiement local `mycelium`, fonctions dans `src/lib/convex/`) · Better Auth · Tailwind v4 · Tolgee i18n (`src/i18n/*.json`) · bun · Vitest · Playwright

**Spec de référence :** [`docs/superpowers/specs/2026-08-15-pivot-egalim-tri-et-moulinette-design.md`](../specs/2026-08-15-pivot-egalim-tri-et-moulinette-design.md)

**Pré-requis déjà en place :** branche `pivot-egalim` active, tag `fleet-os-final` posé sur `main`.

---

## Commandes de vérification utilisées dans ce plan

| Commande | Rôle |
|---|---|
| `bun run check:convex` | Typecheck du backend Convex seul (rapide, ~10 s) |
| `bun run check` | `svelte-check` sur tout le projet (lent, ~60 s) |
| `bunx convex dev --once` | Pousse le schéma et les fonctions sur le déploiement local |
| `bun run build` | Build de production Vite |
| `bun run test:unit` | Vitest |

**Sur les commits :** les hooks pre-commit (husky + `static-checks`) dépassent régulièrement 2 minutes sur ce dépôt. Tous les commits de ce plan utilisent `--no-verify` ; les vérifications sont faites explicitement à chaque tâche.

**Sur les données du déploiement Convex :** supprimer une table du schéma alors qu'elle contient des documents fait échouer `bunx convex dev --once` avec un message nommant la table fautive. Le produit Fleet est mort et aucune donnée n'a de valeur. Face à une telle erreur : ouvrir `bunx convex dashboard`, aller dans Data, sélectionner la table nommée dans l'erreur, « Clear table », puis relancer la commande.

---

## Structure des fichiers

**Archivés avant suppression** (nouveaux, en lecture seule pour la phase 1) :
- `docs/superpowers/references/gabarit-import-pipeline.md` — le pipeline d'import, d'anomalies et de revue humaine, extrait de `fuelImport.ts` / `fuelParsers.ts`
- `docs/superpowers/references/gabarit-wizard-import-csv.md` — le wizard CSV 3 étapes, extrait de `ImportFleetModal` / `ImportCostsModal`
- `docs/superpowers/references/gabarit-agent-claude-convex.md` — le pattern d'appel Claude par lots avec `cache_control`, extrait de `agents/concierge.ts` et `agents/prompts.ts`
- `docs/superpowers/references/gabarit-surveillance-seuils.md` — la surveillance de seuils et les alertes proactives, extrait de `agents/compliance.ts`

**Modifiés :**
- `src/lib/convex/schema.ts` — 66 tables → 16
- `src/lib/convex/crons.ts` — 18 crons → 2
- `src/lib/convex/http.ts` — 20 routes → 2
- `src/lib/convex/notifications.ts` — types métier
- `src/lib/convex/billing.ts` — matrice `PLAN_FEATURES`
- `src/lib/convex/organizations.ts` — champs cantine
- `src/lib/i18n/languages.ts` — `fr` seul
- `src/i18n/fr.json` — nettoyage des clés mortes

**Renommés :**
- `src/routes/[[lang]]/concierge/` → `src/routes/[[lang]]/ops/`

**Supprimés :** détaillés tâche par tâche.

---

## Task 1: Archiver les quatre gabarits avant toute suppression

C'est la seule tâche irréversible si elle est oubliée. Elle passe en premier.

**Files:**
- Create: `docs/superpowers/references/gabarit-import-pipeline.md`
- Create: `docs/superpowers/references/gabarit-wizard-import-csv.md`
- Create: `docs/superpowers/references/gabarit-agent-claude-convex.md`
- Create: `docs/superpowers/references/gabarit-surveillance-seuils.md`

- [ ] **Step 1: Créer le répertoire d'archives**

```bash
mkdir -p docs/superpowers/references
```

- [ ] **Step 2: Archiver le pipeline d'import**

Lire `src/lib/convex/fuelImport.ts` et `src/lib/convex/fuelParsers.ts` en entier, puis écrire `docs/superpowers/references/gabarit-import-pipeline.md` avec cette structure :

```markdown
# Gabarit — pipeline d'import avec revue humaine

Extrait de `fuelImport.ts` et `fuelParsers.ts` (Mycelium Fleet OS, supprimés le 15/08/2026).
Transposition EGalim : « relevé carburant » → « facture fournisseur », « anomalie » → « ligne
sous seuil de confiance ».

## 1. Détection automatique de format
[coller la fonction de détection de provider, avec son code]

## 2. Normalisation des lignes
[coller la logique de parsing et de normalisation]

## 3. Règles d'anomalie
[coller les 3 règles et leur structure de retour]

## 4. internalAction asynchrone auto-replanifiée
[coller le squelette de processFuelImport : découpage en lots, re-planification, idempotence]

## 5. File de revue Accept/Reject
[coller les mutations d'acceptation et de rejet]

## Ce qu'on garde pour la Moulinette
[3 à 6 puces : ce qui se transpose tel quel, ce qui change]
```

- [ ] **Step 3: Archiver le wizard d'import CSV**

Lire `src/lib/components/fleet/ImportFleetModal.svelte` et `src/lib/components/finance/ImportCostsModal.svelte`, puis écrire `docs/superpowers/references/gabarit-wizard-import-csv.md` : les trois étapes (dépôt → mapping de colonnes → validation), la gestion de l'état avec les runes Svelte 5, le parsing côté client, l'affichage des erreurs de ligne.

- [ ] **Step 4: Archiver le pattern d'appel Claude**

Lire `src/lib/convex/agents/concierge.ts` et `src/lib/convex/agents/prompts.ts`, puis écrire `docs/superpowers/references/gabarit-agent-claude-convex.md` : l'action Convex qui appelle l'API Anthropic, la structure `cache_control: { type: 'ephemeral' }` sur le system prompt, le traitement par lots, la sortie structurée, la gestion des erreurs et des retries.

- [ ] **Step 5: Archiver la surveillance de seuils**

Lire `src/lib/convex/agents/compliance.ts`, puis écrire `docs/superpowers/references/gabarit-surveillance-seuils.md` : la collecte périodique, le calcul d'écart à un seuil, le dédoublonnage d'alertes, la génération de notification.

- [ ] **Step 6: Vérifier que les quatre fichiers existent et sont non vides**

```bash
wc -l docs/superpowers/references/*.md
```

Attendu : quatre fichiers, chacun d'au moins 60 lignes.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/references && git commit --no-verify -m "docs: archiver les 4 gabarits Fleet avant suppression"
```

---

## Task 2: Supprimer les routes SvelteKit du métier Fleet

On retire les consommateurs avant les producteurs : supprimer les routes en premier évite que `svelte-check` remonte des centaines d'erreurs sur des pages orphelines.

**Files:**
- Delete: 29 répertoires de routes

- [ ] **Step 1: Supprimer les routes admin, app et api mortes**

```bash
git rm -r --quiet \
  "src/routes/[[lang]]/admin/fleet" \
  "src/routes/[[lang]]/admin/reservations" \
  "src/routes/[[lang]]/admin/maintenance" \
  "src/routes/[[lang]]/admin/drivers" \
  "src/routes/[[lang]]/admin/incidents" \
  "src/routes/[[lang]]/admin/violations" \
  "src/routes/[[lang]]/admin/finance" \
  "src/routes/[[lang]]/admin/expenses" \
  "src/routes/[[lang]]/admin/sustainability" \
  "src/routes/[[lang]]/admin/compliance" \
  "src/routes/[[lang]]/admin/support" \
  "src/routes/[[lang]]/app/reservations" \
  "src/routes/[[lang]]/app/incidents" \
  "src/routes/[[lang]]/app/fleet-care" \
  "src/routes/[[lang]]/app/expenses" \
  "src/routes/[[lang]]/app/concierge" \
  "src/routes/api/concierge" \
  "src/routes/[[lang]]/sales" \
  "src/routes/[[lang]]/demo" \
  "src/routes/[[lang]]/concierge/demos" \
  "src/routes/[[lang]]/shadcn-demo" \
  "src/routes/api/smartcar" \
  "src/routes/api/google-calendar" \
  "src/routes/api/microsoft-calendar" \
  "src/routes/api/manager" \
  "src/routes/api/compliance" \
  "src/routes/api/sales" \
  "src/routes/api/v1" \
  "src/routes/api/webhooks" \
  "src/routes/sidebar-07" \
  "src/routes/_dev"
```

- [ ] **Step 2: Vérifier qu'aucune de ces routes ne subsiste**

```bash
ls "src/routes/[[lang]]/admin" "src/routes/[[lang]]/app" src/routes/api
```

Attendu — `admin` : `+layout.server.ts`, `+layout.svelte`, `+page.server.ts`, `+page.svelte`, `dashboard`, `settings`. `app` : `+layout.svelte`, `+page.server.ts`, `+page.svelte`, `profile`, `settings`. `api` : `auth`, `org`.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit --no-verify -m "chore: supprimer les routes SvelteKit du metier Fleet"
```

---

## Task 3: Supprimer les composants du métier Fleet

**Files:**
- Delete: 16 répertoires de composants + 3 fichiers isolés

- [ ] **Step 1: Supprimer les répertoires de composants métier**

```bash
git rm -r --quiet \
  src/lib/components/fleet \
  src/lib/components/maintenance \
  src/lib/components/reservations \
  src/lib/components/drivers \
  src/lib/components/inspections \
  src/lib/components/violations \
  src/lib/components/finance \
  src/lib/components/expenses \
  src/lib/components/sustainability \
  src/lib/components/calendar \
  src/lib/components/sales \
  src/lib/components/demo \
  src/lib/components/fleet-care \
  src/lib/components/manager-agent \
  src/lib/components/customer-support \
  src/lib/components/integrations
```

- [ ] **Step 2: Supprimer les composants Fleet isolés**

```bash
git rm --quiet \
  src/lib/components/admin/FleetTabNav.svelte \
  src/lib/components/admin/FinanceTabNav.svelte \
  src/lib/components/admin/ConformiteTabNav.svelte \
  src/lib/components/concierge/FleetObserver.svelte \
  src/lib/components/app/app-autumn-provider.svelte
```

- [ ] **Step 3: Retirer les trois références Fleet résiduelles**

Trois fichiers hors des répertoires supprimés consomment encore l'API Fleet.

Dans `src/lib/components/global-search/command-menu.svelte` : supprimer toutes les entrées de recherche pointant vers `/admin/fleet`, `/admin/reservations`, `/admin/maintenance`, `/admin/drivers`, `/admin/incidents`, `/admin/violations`, `/admin/finance`, `/admin/expenses`, `/admin/sustainability`, `/admin/compliance`, ainsi que les imports `api.vehicles`, `api.reservations`, `api.maintenance`, `api.drivers`, `api.costs`, `api.incidents` devenus inutilisés.

`src/lib/components/chat/ConciergeChat.svelte` est entièrement dédié à la réservation de véhicules, et tout `src/lib/components/copilot/` appelle les endpoints `/api/concierge` et `/api/manager` supprimés à la tâche 2. Les deux disparaissent :

```bash
git rm -r --quiet src/lib/components/chat/ConciergeChat.svelte src/lib/components/copilot
```

Puis retirer l'import et le rendu de `CopilotFab` / `CopilotPanel` des layouts qui les montent :

```bash
grep -rln "CopilotFab\|CopilotPanel\|copilot" src/routes src/lib/components
```

Dans `src/routes/[[lang]]/app/+page.svelte` : remplacer intégralement le contenu par une page d'accueil cantine minimale. Texte en dur — l'interface passe en français seul à la tâche 14, et cette page est remplacée en phase 1.

```svelte
<div class="mx-auto w-full max-w-4xl px-4 py-10">
	<h1 class="text-2xl font-semibold tracking-tight">Votre conformité EGalim</h1>
	<p class="text-muted-foreground mt-2 text-sm">
		Déposez vos factures fournisseurs, nous calculons votre ratio réel.
	</p>
</div>
```

- [ ] **Step 4: Vérifier qu'aucune référence Fleet ne subsiste dans les composants**

```bash
grep -rn "api\.vehicles\|api\.reservations\|api\.maintenance\|api\.drivers\|api\.costs\|api\.incidents\|api\.violations\|api\.smartcar" src/lib/components src/routes || echo "AUCUNE REFERENCE — OK"
```

Attendu : `AUCUNE REFERENCE — OK`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit --no-verify -m "chore: supprimer les composants du metier Fleet"
```

---

## Task 4: Vider les crons et les routes HTTP Convex

Ce sont les points d'entrée. Les vider avant de supprimer les modules évite que Convex refuse de charger un cron pointant vers une fonction disparue.

**Files:**
- Modify: `src/lib/convex/crons.ts` (remplacement intégral)
- Modify: `src/lib/convex/http.ts` (remplacement intégral)

- [ ] **Step 1: Remplacer intégralement `src/lib/convex/crons.ts`**

```ts
import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// See the docs at https://docs.convex.dev/agents/files
crons.interval('deleteUnusedFiles', { hours: 1 }, internal.files.vacuum.deleteUnusedFiles, {});

// Clean up expired uploads/download grants/files from files-control
crons.interval('cleanupExpiredFiles', { hours: 1 }, internal.files.cleanup.cleanupExpiredFiles, {});

export default crons;
```

- [ ] **Step 2: Remplacer intégralement `src/lib/convex/http.ts`**

```ts
import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { authComponent, createAuth } from './auth';
import { resend } from './emails/resend';
import { webhookHandler as paddleWebhookHandler } from './paddle';

const http = httpRouter();

// Better Auth routes
authComponent.registerRoutes(http, createAuth);

// Resend webhook endpoint
// Configure this URL in your Resend dashboard: https://your-deployment.convex.site/resend-webhook
http.route({
	path: '/resend-webhook',
	method: 'POST',
	handler: httpAction(async (ctx, req) => {
		return await resend.handleResendEventWebhook(ctx, req);
	})
});

// Paddle webhook — https://your-deployment.convex.site/paddle-webhook
// Configure in Paddle Dashboard → Notifications
http.route({ path: '/paddle-webhook', method: 'POST', handler: paddleWebhookHandler });

export default http;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/convex/crons.ts src/lib/convex/http.ts && git commit --no-verify -m "chore: vider crons et routes HTTP du metier Fleet"
```

---

## Task 5: Supprimer les modules Convex du métier flotte

**Files:**
- Delete: 30 fichiers racine + 3 répertoires

- [ ] **Step 1: Supprimer les modules racine**

```bash
git rm --quiet \
  src/lib/convex/vehicles.ts \
  src/lib/convex/reservations.ts \
  src/lib/convex/maintenance.ts \
  src/lib/convex/garages.ts \
  src/lib/convex/drivers.ts \
  src/lib/convex/inspections.ts \
  src/lib/convex/violations.ts \
  src/lib/convex/incidents.ts \
  src/lib/convex/costs.ts \
  src/lib/convex/expenses.ts \
  src/lib/convex/fuelImport.ts \
  src/lib/convex/fuelParsers.ts \
  src/lib/convex/smartcar.ts \
  src/lib/convex/optimizer.ts \
  src/lib/convex/carbon.ts \
  src/lib/convex/carbonFactors.ts \
  src/lib/convex/bik.ts \
  src/lib/convex/bikRates.ts \
  src/lib/convex/fiscal.ts \
  src/lib/convex/fiscalRates.ts \
  src/lib/convex/ikRates.ts \
  src/lib/convex/mileageRates.ts \
  src/lib/convex/alerts.ts \
  src/lib/convex/compliance.ts \
  src/lib/convex/dashboard.ts \
  src/lib/convex/messages.ts \
  src/lib/convex/comms.ts \
  src/lib/convex/conversations.ts \
  src/lib/convex/reminderTemplates.ts \
  src/lib/convex/tests.ts \
  src/lib/convex/autumn.ts
```

`tests.ts` (468 lignes) contient les helpers de seed du jeu de démonstration flotte. Il n'a pas d'équivalent EGalim.

- [ ] **Step 2: Supprimer les répertoires flotte**

```bash
git rm -r --quiet \
  src/lib/convex/maintenance \
  src/lib/convex/seeds \
  src/lib/convex/lib/reservations.ts \
  src/lib/convex/exports/financial.ts
```

- [ ] **Step 3: Nettoyer les helpers de développement**

`src/lib/convex/localDev.ts`, `src/lib/convex/previewDev.ts` et `src/lib/convex/i18n/translations.ts` sont conservés mais peuvent référencer des tables supprimées.

```bash
grep -n "vehicle\|reservation\|maintenance\|driver\|fuel\|smartcar\|sales\|demo" src/lib/convex/localDev.ts src/lib/convex/previewDev.ts src/lib/convex/i18n/translations.ts
```

Supprimer chaque ligne, fonction ou clé remontée par cette commande.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit --no-verify -m "chore: supprimer les modules Convex du metier flotte"
```

---

## Task 6: Supprimer les intégrations, l'API publique, le commercial et les démos

**Files:**
- Delete: `src/lib/convex/integrations/`, `src/lib/convex/sales/`, `src/lib/convex/demo/`, `src/lib/convex/agents/`, 4 modules `concierge/`

- [ ] **Step 1: Supprimer les répertoires**

```bash
git rm -r --quiet \
  src/lib/convex/integrations \
  src/lib/convex/sales \
  src/lib/convex/demo \
  src/lib/convex/agents
```

- [ ] **Step 2: Supprimer les modules concierge spécifiques à la flotte**

```bash
git rm --quiet \
  src/lib/convex/concierge/demos.ts \
  src/lib/convex/concierge/fleetObserver.ts \
  src/lib/convex/concierge/health.ts \
  src/lib/convex/concierge/tasks.ts
```

- [ ] **Step 3: Nettoyer les modules concierge conservés**

Les modules `concierge/` restants (`mutations.ts`, `queries.ts`, `staff.ts`, `tickets.ts`, `timeline.ts`, `humanAssist.ts`, `clientPortal.ts`, `sla.ts`, `priority.ts`) sont conservés. Dans chacun, supprimer toute fonction, tout import et tout type qui référence une table ou un module supprimé (`vehicles`, `reservations`, `maintenance`, `costs`, `incidents`, `demoAccessTokens`, `demoVehiclePositions`, `sales*`, `fleetObserver`, `health`, `tasks`).

Vérification :

```bash
grep -rn "vehicles\|reservations\|maintenance\|demoVehicle\|demoAccess\|fleetObserver\|salesGamification" src/lib/convex/concierge/ || echo "CONCIERGE PROPRE — OK"
```

Attendu : `CONCIERGE PROPRE — OK`

- [ ] **Step 4: Commit**

```bash
git add -A && git commit --no-verify -m "chore: supprimer integrations, API publique, sales et demos"
```

---

## Task 7: Supprimer le boilerplate SaaS de template

**Files:**
- Delete: `src/lib/convex/support/`, `src/lib/convex/aiChat/`, 3 sous-modules `admin/`

- [ ] **Step 1: Supprimer les répertoires**

```bash
git rm -r --quiet \
  src/lib/convex/support \
  src/lib/convex/aiChat \
  src/lib/convex/admin/support \
  src/lib/convex/admin/founderWelcome \
  src/lib/convex/admin/notificationPreferences
```

- [ ] **Step 2: Supprimer le module de compteurs**

```bash
git rm --quiet src/lib/convex/admin/counters.ts
```

- [ ] **Step 3: Nettoyer les modules admin conservés**

Dans `src/lib/convex/admin/queries.ts`, `mutations.ts`, `seeds.ts` et `types.ts`, supprimer toute fonction et tout type référençant `supportThreads`, `internalUserNotes`, `adminProfiles`, `adminNotificationPreferences`, `pendingAdminNotifications`, `founderWelcomeEmails`, `dashboardCounters`, `aiChatThreads` ou `fileMetadata`.

Dans `src/lib/convex/schema.ts`, retirer l'import devenu inutile :

```ts
import { supportThreadFields } from './support/supportThreadFields';
```

- [ ] **Step 4: Vérifier**

```bash
grep -rn "supportThread\|founderWelcome\|dashboardCounters\|aiChatThreads\|fileMetadata\|adminProfiles" src/lib/convex/ --include="*.ts" | grep -v "_generated" || echo "BOILERPLATE SUPPRIME — OK"
```

Attendu : `BOILERPLATE SUPPRIME — OK`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit --no-verify -m "chore: supprimer le boilerplate SaaS de template"
```

---

## Task 8: Réduire le schéma à 16 tables

C'est la tâche pivot. Après elle, le schéma est net.

**Files:**
- Modify: `src/lib/convex/schema.ts`

- [ ] **Step 1: Supprimer les 50 définitions de tables**

Dans `src/lib/convex/schema.ts`, supprimer les blocs `defineTable` de :

`messages`, `conversations`, `internalUserNotes`, `supportThreads`, `pendingAdminNotifications`, `adminNotificationPreferences`, `adminProfiles`, `fileMetadata`, `dashboardCounters`, `founderWelcomeEmails`, `aiChatThreads`, `vehicles`, `maintenanceSchedules`, `garages`, `maintenanceRecords`, `vehicleMaintenanceConfig`, `reservations`, `userIntegrations`, `driverProfiles`, `driverRestrictions`, `vehicleInspections`, `trafficViolations`, `costs`, `optimizerReports`, `mileageRateConfigs`, `mileageExpenses`, `accountingIntegrations`, `accountingCategoryMappings`, `accountingSyncLogs`, `commsIntegrations`, `oauthStates`, `smartcarConnections`, `apiKeys`, `webhookEndpoints`, `webhookDeliveries`, `incidents`, `fuelImports`, `fuelAnomalies`, `vehicleAssignments`, `carbonReports`, `complianceAlerts`, `demoVehiclePositions`, `demoAccessTokens`, `salesGamification`, `salesBadges`, `salesChallenges`, `salesSignals`, `salesProspects`, `salesConciergeThreads`, `salesConciergeMessages`

- [ ] **Step 2: Vérifier qu'il reste exactement 16 tables**

```bash
grep -cE "^\s*[a-zA-Z]+: defineTable" src/lib/convex/schema.ts
```

Attendu : `16`

- [ ] **Step 3: Vérifier la liste exacte des tables restantes**

```bash
grep -oE "^\s*[a-zA-Z]+: defineTable" src/lib/convex/schema.ts | tr -d ' ' | sed 's/:defineTable//' | sort
```

Attendu, dans cet ordre alphabétique :

```
adminAuditLogs
adminSettings
clientTimelineEvents
conciergeOrgAccess
conciergeTicketMessages
conciergeTickets
emailEvents
humanAssistMessages
humanAssistRequests
myceliumStaff
notifications
organizationInvitations
organizationMembers
organizations
staffInvitations
userProfiles
```

- [ ] **Step 4: Typecheck du backend**

```bash
bun run check:convex
```

Attendu : aucune erreur. Si des erreurs subsistent, elles pointent vers des fonctions oubliées dans les tâches 5 à 7 — les supprimer.

- [ ] **Step 5: Pousser le schéma**

```bash
bunx convex dev --once
```

Attendu : `Convex functions ready`. En cas d'échec pour cause de documents existants, ouvrir `bunx convex dashboard`, vider les tables nommées dans l'erreur, relancer.

- [ ] **Step 6: Commit**

```bash
git add src/lib/convex/schema.ts && git commit --no-verify -m "chore: reduire le schema Convex de 66 a 16 tables"
```

---

## Task 9: Retyper les notifications vers le vocabulaire EGalim

**Files:**
- Modify: `src/lib/convex/schema.ts` (table `notifications`)
- Modify: `src/lib/convex/notifications.ts`
- Test: `src/lib/convex/__tests__/notifications.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/convex/__tests__/notifications.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { buildNotificationContent } from '../notifications';

describe('buildNotificationContent', () => {
	it('produit un titre et un message pour FACTURES_RECUES', () => {
		const result = buildNotificationContent('FACTURES_RECUES', { count: 12 });
		expect(result.title).toBe('Factures reçues');
		expect(result.message).toContain('12');
	});

	it('produit un titre et un message pour DIAGNOSTIC_PRET', () => {
		const result = buildNotificationContent('DIAGNOSTIC_PRET', { ratioDurable: 23.4 });
		expect(result.title).toBe('Votre diagnostic EGalim est prêt');
		expect(result.message).toContain('23.4');
	});

	it('produit un titre et un message pour LIGNES_A_ARBITRER', () => {
		const result = buildNotificationContent('LIGNES_A_ARBITRER', { count: 37 });
		expect(result.title).toBe('Lignes à arbitrer');
		expect(result.message).toContain('37');
	});
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

```bash
bun run test:unit -- notifications
```

Attendu : ÉCHEC, `buildNotificationContent` ne connaît pas ces types.

- [ ] **Step 3: Retyper la table dans `schema.ts`**

Remplacer le bloc `notifications: defineTable({ ... })` par :

```ts
	notifications: defineTable({
		organizationId: v.id('organizations'),
		userId: v.string(), // destinataire (Better Auth string ID)
		type: v.union(
			v.literal('FACTURES_RECUES'),
			v.literal('DIAGNOSTIC_PRET'),
			v.literal('LIGNES_A_ARBITRER'),
			v.literal('RATIO_EN_DERIVE'),
			v.literal('DECLARATION_A_FAIRE'),
			v.literal('ATTESTATION_MANQUANTE'),
			v.literal('HUMAN_ASSIST_REPLY')
		),
		title: v.string(),
		message: v.string(),
		link: v.optional(v.string()),
		isRead: v.boolean(),
		createdAt: v.number()
	})
		.index('by_user', ['userId'])
		.index('by_user_unread', ['userId', 'isRead'])
		.index('by_user_and_created', ['userId', 'createdAt'])
		.index('by_org', ['organizationId']),
```

Le champ `vehicleId` est supprimé.

- [ ] **Step 4: Réécrire `buildNotificationContent` dans `notifications.ts`**

```ts
export type NotificationType =
	| 'FACTURES_RECUES'
	| 'DIAGNOSTIC_PRET'
	| 'LIGNES_A_ARBITRER'
	| 'RATIO_EN_DERIVE'
	| 'DECLARATION_A_FAIRE'
	| 'ATTESTATION_MANQUANTE'
	| 'HUMAN_ASSIST_REPLY';

export function buildNotificationContent(
	type: NotificationType,
	data: Record<string, string | number>
): { title: string; message: string } {
	switch (type) {
		case 'FACTURES_RECUES':
			return {
				title: 'Factures reçues',
				message: `${data.count} document(s) déposé(s), traitement en cours.`
			};
		case 'DIAGNOSTIC_PRET':
			return {
				title: 'Votre diagnostic EGalim est prêt',
				message: `Ratio durable mesuré : ${data.ratioDurable} %.`
			};
		case 'LIGNES_A_ARBITRER':
			return {
				title: 'Lignes à arbitrer',
				message: `${data.count} libellé(s) attendent un arbitrage humain.`
			};
		case 'RATIO_EN_DERIVE':
			return {
				title: 'Ratio en dérive',
				message: `Le ratio ${data.seuil} est passé sous le seuil légal ce mois-ci.`
			};
		case 'DECLARATION_A_FAIRE':
			return {
				title: 'Télédéclaration à faire',
				message: `La campagne « ma cantine » ferme le 31 mars. Votre dossier est prêt.`
			};
		case 'ATTESTATION_MANQUANTE':
			return {
				title: 'Attestation manquante',
				message: `${data.count} ligne(s) qualifiante(s) sans justificatif fournisseur.`
			};
		case 'HUMAN_ASSIST_REPLY':
			return {
				title: 'Nouvelle réponse',
				message: `Vous avez reçu une réponse de votre interlocuteur Mycelium.`
			};
	}
}
```

Puis supprimer du reste de `notifications.ts` toute fonction liée aux rappels de réservation (`sendDailyReminders` notamment, dont le cron a disparu) et tout usage de `vehicleId`.

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

```bash
bun run test:unit -- notifications
```

Attendu : 3 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit --no-verify -m "feat: retyper les notifications vers le vocabulaire EGalim"
```

---

## Task 10: Retyper `organizations` en cantine

**Files:**
- Modify: `src/lib/convex/schema.ts` (table `organizations`)
- Modify: `src/lib/convex/organizations.ts`

- [ ] **Step 1: Remplacer le bloc `organizations` dans `schema.ts`**

```ts
	// Organizations — une cantine cliente = une organisation
	organizations: defineTable({
		name: v.string(),
		siret: v.optional(v.string()),
		// Profil cantine
		etablissementType: v.optional(
			v.union(
				v.literal('RIE'),
				v.literal('CLINIQUE'),
				v.literal('EHPAD'),
				v.literal('CRECHE'),
				v.literal('ECOLE_PRIVEE'),
				v.literal('AUTRE')
			)
		),
		couvertsJour: v.optional(v.number()),
		gestionDirecte: v.optional(v.boolean()),
		logoUrl: v.optional(v.string()),
		logoStorageId: v.optional(v.id('_storage')),
		// Localisation — figée FR pour la phase POC
		country: v.optional(v.string()), // ISO 3166-1 alpha-2
		currency: v.optional(v.string()),
		timezone: v.optional(v.string()), // IANA
		locale: v.optional(v.string()), // BCP 47
		// Paddle billing — étages commerciaux EGalim
		paddleSubscriptionId: v.optional(v.string()),
		paddleCustomerId: v.optional(v.string()),
		paddlePlanTier: v.optional(
			v.union(v.literal('diagnostic'), v.literal('conformite'), v.literal('operateur'))
		),
		paddleStatus: v.optional(
			v.union(
				v.literal('active'),
				v.literal('trialing'),
				v.literal('paused'),
				v.literal('past_due'),
				v.literal('canceled')
			)
		),
		paddleCurrentPeriodEnd: v.optional(v.number()),
		seatsIncluded: v.optional(v.number()),
		freeTrialEndsAt: v.optional(v.number()),
		devPlan: v.optional(v.boolean()),
		simulatedTier: v.optional(v.string()),
		createdAt: v.number()
	})
		.index('by_name', ['name'])
		.index('by_paddle_subscription', ['paddleSubscriptionId'])
		.index('by_paddle_customer', ['paddleCustomerId']),
```

Supprimés : `siren`, `sector`, `size`, `plan`, `distanceUnit`, `isDemo`, `demoConfig`, l'index `by_plan`.

- [ ] **Step 2: Réduire les rôles dans `organizationMembers`**

Remplacer la ligne `role:` par :

```ts
		role: v.union(v.literal('ORG_ADMIN'), v.literal('ORG_MEMBER')),
```

Faire la même substitution dans `organizationInvitations`.

- [ ] **Step 3: Adapter `organizations.ts`**

Dans `src/lib/convex/organizations.ts` : retirer les arguments `siren`, `sector`, `size`, `plan`, `distanceUnit` de `createOrganization` et `updateOrganization` ; ajouter `siret`, `etablissementType`, `couvertsJour`, `gestionDirecte`. Retirer toute référence à `ORG_MANAGER`, `isDemo` et `demoConfig`. Retirer `getOnboardingProgress` de toute étape liée à la flotte (import de véhicules).

- [ ] **Step 4: Vérifier qu'aucune référence morte ne subsiste**

```bash
grep -rn "ORG_MANAGER\|demoConfig\|isDemo\|distanceUnit" src/lib/convex src/lib/components src/routes --include="*.ts" --include="*.svelte" | grep -v "_generated" || echo "PROPRE — OK"
```

Attendu : `PROPRE — OK`

- [ ] **Step 5: Typecheck et push du schéma**

```bash
bun run check:convex && bunx convex dev --once
```

Attendu : aucune erreur, `Convex functions ready`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit --no-verify -m "feat: retyper organizations en cantine EGalim"
```

---

## Task 11: Retyper la matrice de facturation

**Files:**
- Modify: `src/lib/convex/billing.ts`
- Test: `src/lib/convex/__tests__/billing.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/lib/convex/__tests__/billing.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { PLAN_FEATURES, PLAN_SEATS, planHasFeature } from '../billing';

describe('PLAN_FEATURES', () => {
	it('donne le diagnostic à tous les étages payants', () => {
		expect(planHasFeature('diagnostic', 'diagnostic')).toBe(true);
		expect(planHasFeature('conformite', 'diagnostic')).toBe(true);
		expect(planHasFeature('operateur', 'diagnostic')).toBe(true);
	});

	it('réserve le suivi mensuel aux étages conformite et operateur', () => {
		expect(planHasFeature('diagnostic', 'suiviMensuel')).toBe(false);
		expect(planHasFeature('conformite', 'suiviMensuel')).toBe(true);
		expect(planHasFeature('operateur', 'suiviMensuel')).toBe(true);
	});

	it('réserve le sourcing à l’étage operateur', () => {
		expect(planHasFeature('conformite', 'sourcing')).toBe(false);
		expect(planHasFeature('operateur', 'sourcing')).toBe(true);
	});

	it('définit un quota de sièges pour chaque étage', () => {
		expect(PLAN_SEATS.diagnostic).toBeGreaterThan(0);
		expect(PLAN_SEATS.conformite).toBeGreaterThan(0);
		expect(PLAN_SEATS.operateur).toBeGreaterThan(0);
	});

	it('n’expose que les features EGalim', () => {
		expect(Object.keys(PLAN_FEATURES.operateur).sort()).toEqual([
			'declaration',
			'depotFactures',
			'diagnostic',
			'sourcing',
			'suiviMensuel',
			'veilleReglementaire'
		]);
	});
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

```bash
bun run test:unit -- billing
```

Attendu : ÉCHEC, les étages `diagnostic` / `conformite` / `operateur` n'existent pas.

- [ ] **Step 3: Remplacer `PLAN_FEATURES`, `PlanTier` et `PLAN_SEATS` dans `billing.ts`**

```ts
export const PLAN_FEATURES = {
	none: {
		depotFactures: false,
		diagnostic: false,
		declaration: false,
		suiviMensuel: false,
		veilleReglementaire: false,
		sourcing: false
	},
	diagnostic: {
		depotFactures: true,
		diagnostic: true,
		declaration: false,
		suiviMensuel: false,
		veilleReglementaire: false,
		sourcing: false
	},
	conformite: {
		depotFactures: true,
		diagnostic: true,
		declaration: true,
		suiviMensuel: true,
		veilleReglementaire: true,
		sourcing: false
	},
	operateur: {
		depotFactures: true,
		diagnostic: true,
		declaration: true,
		suiviMensuel: true,
		veilleReglementaire: true,
		sourcing: true
	},
	dev: {
		depotFactures: true,
		diagnostic: true,
		declaration: true,
		suiviMensuel: true,
		veilleReglementaire: true,
		sourcing: true
	}
} as const;

export type PlanFeature = keyof (typeof PLAN_FEATURES)['operateur'];
export type PlanTier = 'none' | 'diagnostic' | 'conformite' | 'operateur' | 'dev';

// Nombre d'utilisateurs autorisés par étage (une cantine = 1 à 3 personnes)
export const PLAN_SEATS: Record<string, number> = {
	none: 0,
	diagnostic: 2,
	conformite: 3,
	operateur: 5,
	dev: 9999
};
```

Puis, dans le reste de `billing.ts`, adapter `resolveEffectivePlan()` : la valeur de repli du plan d'essai gratuit passe de `'professional'` à `'conformite'`, et toute occurrence de `'essential'`, `'professional'`, `'business'`, `'enterprise'` ou `'free'` est remplacée par l'étage EGalim correspondant.

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

```bash
bun run test:unit -- billing
```

Attendu : 5 tests PASS.

- [ ] **Step 5: Vérifier qu'aucun ancien palier ne subsiste**

```bash
grep -rn "'essential'\|'professional'\|'business'\|'enterprise'" src/lib/convex src/routes src/lib/components --include="*.ts" --include="*.svelte" | grep -v "_generated" || echo "PALIERS NETTOYES — OK"
```

Attendu : `PALIERS NETTOYES — OK`

- [ ] **Step 6: Commit**

```bash
git add -A && git commit --no-verify -m "feat: retyper la matrice de facturation vers les etages EGalim"
```

---

## Task 12: Retyper le staff, la timeline et les tickets

**Files:**
- Modify: `src/lib/convex/schema.ts` (`myceliumStaff`, `staffInvitations`, `clientTimelineEvents`, `conciergeTickets`, `conciergeTicketMessages`)
- Modify: `src/lib/convex/concierge/staff.ts`, `timeline.ts`, `tickets.ts`

- [ ] **Step 1: Remplacer `myceliumStaff` dans `schema.ts`**

```ts
	myceliumStaff: defineTable({
		userId: v.string(), // Better Auth user ID
		staffRole: v.union(v.literal('SUPER_ADMIN'), v.literal('OPERATOR')),
		email: v.string(), // dénormalisé pour affichage
		name: v.string(), // dénormalisé pour affichage
		addedBy: v.string(),
		addedAt: v.number(),
		avatarUrl: v.optional(v.string()),
		avatarStorageId: v.optional(v.id('_storage')),
		availabilityStatus: v.optional(
			v.union(v.literal('online'), v.literal('busy'), v.literal('offline'))
		),
		bio: v.optional(v.string())
	})
		.index('by_userId', ['userId'])
		.index('by_role', ['staffRole'])
		.index('by_availability', ['availabilityStatus']),
```

Le champ `specialty` est supprimé.

- [ ] **Step 2: Aligner `staffInvitations`**

Remplacer la ligne `staffRole:` par :

```ts
		staffRole: v.union(v.literal('SUPER_ADMIN'), v.literal('OPERATOR')),
```

- [ ] **Step 3: Remplacer le `type` de `clientTimelineEvents`**

```ts
		type: v.union(
			v.literal('ONBOARDING'),
			v.literal('FACTURES_DEPOSEES'),
			v.literal('DIAGNOSTIC_REMIS'),
			v.literal('RATIO_MESURE'),
			v.literal('DECLARATION_DEPOSEE'),
			v.literal('ABONNEMENT'),
			v.literal('NOTE_OPERATEUR')
		),
```

- [ ] **Step 4: Remplacer le `sourceType` de `conciergeTickets`**

```ts
		sourceType: v.union(
			v.literal('HUMAN_ASSIST'),
			v.literal('REVUE_LIGNES'),
			v.literal('MANUAL')
		),
```

- [ ] **Step 5: Aligner `authorRole` de `conciergeTicketMessages`**

```ts
		authorRole: v.union(
			v.literal('operator'),
			v.literal('super_admin'),
			v.literal('client')
		),
```

- [ ] **Step 6: Propager les renommages dans le code**

Dans `src/lib/convex/concierge/staff.ts`, `timeline.ts`, `tickets.ts`, `queries.ts`, `mutations.ts` et dans `src/lib/components/concierge/`, remplacer `'concierge'` par `'OPERATOR'` et `'super_admin'` par `'SUPER_ADMIN'` partout où il s'agit du `staffRole`. Supprimer toute référence à `'sales'` et à `specialty`.

- [ ] **Step 7: Vérifier**

```bash
grep -rn "'sales'\|specialty\|SALES_MESSAGE\|CONCIERGE_TASK" src/lib/convex src/lib/components --include="*.ts" --include="*.svelte" | grep -v "_generated" || echo "STAFF PROPRE — OK"
```

Attendu : `STAFF PROPRE — OK`

- [ ] **Step 8: Typecheck et push**

```bash
bun run check:convex && bunx convex dev --once
```

Attendu : aucune erreur, `Convex functions ready`.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit --no-verify -m "feat: retyper staff, timeline et tickets vers le vocabulaire EGalim"
```

---

## Task 13: Renommer `/concierge` en `/ops` et restructurer `/app`

**Files:**
- Rename: `src/routes/[[lang]]/concierge/` → `src/routes/[[lang]]/ops/`
- Delete: `src/routes/[[lang]]/admin/`
- Modify: `src/routes/[[lang]]/app/+layout.svelte`

- [ ] **Step 1: Renommer l'espace opérateur**

```bash
git mv "src/routes/[[lang]]/concierge" "src/routes/[[lang]]/ops"
```

- [ ] **Step 2: Déplacer les réglages d'organisation vers `/app`**

L'espace `/admin` disparaît. La seule page qu'il conserve d'utile est le réglage d'organisation.

```bash
git mv "src/routes/[[lang]]/admin/settings/organization" "src/routes/[[lang]]/app/parametres"
git rm -r --quiet "src/routes/[[lang]]/admin"
```

- [ ] **Step 3: Mettre à jour tous les liens internes**

```bash
grep -rln "/concierge\|/admin/" src/routes src/lib/components --include="*.svelte" --include="*.ts"
```

Dans chaque fichier listé, remplacer `/concierge` par `/ops` et supprimer ou rediriger les liens `/admin/...` : `/admin/settings/organization` devient `/app/parametres`, tous les autres sont supprimés.

- [ ] **Step 4: Vérifier qu'aucun lien mort ne subsiste**

```bash
grep -rn "href=\"/admin\|href={.*'/admin\|goto('/admin\|/concierge" src/routes src/lib/components || echo "LIENS PROPRES — OK"
```

Attendu : `LIENS PROPRES — OK`

- [ ] **Step 5: Vérifier la structure finale des routes**

```bash
find src/routes -maxdepth 3 -type d | sort
```

Attendu, sous `src/routes/[[lang]]/` : `(auth)`, `(marketing)`, `[...path]`, `app`, `join`, `onboarding`, `ops`, `staff-join`. Sous `src/routes/api/` : `auth`, `concierge`, `org`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit --no-verify -m "refactor: renommer /concierge en /ops et supprimer /admin"
```

---

## Task 14: Passer l'interface en français seul

**Files:**
- Modify: `src/lib/i18n/languages.ts`
- Delete: `src/i18n/en.json`, `src/i18n/de.json`, `src/i18n/es.json`
- Delete: `src/lib/components/LanguageSwitcher.svelte`

- [ ] **Step 1: Remplacer intégralement `src/lib/i18n/languages.ts`**

```ts
/**
 * Supported languages configuration for i18n.
 * EGalim est une loi française : l'interface est monolingue.
 */

export interface Language {
	/** Language code (ISO 639-1) */
	code: string;
	/** Display name in the language itself (native name) */
	name: string;
	/** Display name in English */
	nameEn: string;
	/** Flag emoji */
	flag: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
	{
		code: 'fr',
		name: 'Français',
		nameEn: 'French',
		flag: '🇫🇷'
	}
];

/** Default language code */
export const DEFAULT_LANGUAGE = 'fr';

/** Map of language codes for quick lookup */
export const LANGUAGE_CODES = new Set(SUPPORTED_LANGUAGES.map((lang) => lang.code));

/**
 * Check if a language code is supported
 */
export function isSupportedLanguage(code: string | undefined): code is string {
	return code !== undefined && LANGUAGE_CODES.has(code);
}

/**
 * Get language by code or return default.
 * Le paramètre est conservé pour la compatibilité des appelants ; une seule
 * langue étant supportée, il est ignoré.
 */
export function getLanguage(_code?: string): Language {
	return SUPPORTED_LANGUAGES[0]!;
}
```

- [ ] **Step 2: Supprimer les fichiers de messages et le sélecteur de langue**

```bash
git rm --quiet src/i18n/en.json src/i18n/de.json src/i18n/es.json src/lib/components/LanguageSwitcher.svelte
```

- [ ] **Step 3: Retirer les usages du sélecteur**

```bash
grep -rln "LanguageSwitcher" src/routes src/lib/components
```

Dans chaque fichier listé, supprimer l'import et le rendu du composant.

- [ ] **Step 4: Purger les clés mortes de `fr.json`**

Les clés des modules supprimés (flotte, réservations, maintenance, conducteurs, sinistres, contraventions, finance, carburant, durabilité, commercial, démos, support) n'ont plus de consommateur.

```bash
grep -oE '"(fleet|reservation|maintenance|driver|incident|violation|finance|expense|fuel|sustainability|carbon|bik|fiscal|smartcar|sales|demo|support|manager|compliance)[^"]*"' src/i18n/fr.json | sort -u | head -50
```

Supprimer de `src/i18n/fr.json` toutes les clés listées par cette commande.

- [ ] **Step 5: Vérifier**

```bash
ls src/i18n/ && grep -rn "LanguageSwitcher" src/routes src/lib/components || echo "I18N PROPRE — OK"
```

Attendu : seul `fr.json` est listé, puis `I18N PROPRE — OK`.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit --no-verify -m "refactor: interface en francais seul"
```

---

## Task 15: Dépublier la landing Fleet

**Files:**
- Delete: 20 composants `marketing/landing/`
- Delete: `src/lib/components/marketing/simulator/`, `src/routes/[[lang]]/(marketing)/simulator/`
- Modify: `src/routes/[[lang]]/(marketing)/+page.svelte`
- Modify: `src/lib/components/marketing/landing/landing-data.ts`

- [ ] **Step 1: Supprimer les sections et maquettes Fleet**

```bash
git rm --quiet \
  src/lib/components/marketing/landing/agent-card.svelte \
  src/lib/components/marketing/landing/agentic-demo-section.svelte \
  src/lib/components/marketing/landing/agents-section.svelte \
  src/lib/components/marketing/landing/feature-showcase.svelte \
  src/lib/components/marketing/landing/features-section.svelte \
  src/lib/components/marketing/landing/how-it-works-section.svelte \
  src/lib/components/marketing/landing/human-concierge-section.svelte \
  src/lib/components/marketing/landing/integrations-marquee.svelte \
  src/lib/components/marketing/landing/mockup-compliance.svelte \
  src/lib/components/marketing/landing/mockup-concierge-animated.svelte \
  src/lib/components/marketing/landing/mockup-concierge.svelte \
  src/lib/components/marketing/landing/mockup-dashboard.svelte \
  src/lib/components/marketing/landing/mockup-fleet-table.svelte \
  src/lib/components/marketing/landing/module-card.svelte \
  src/lib/components/marketing/landing/modules-section.svelte \
  src/lib/components/marketing/landing/proof-section.svelte \
  src/lib/components/marketing/landing/proof-stat.svelte \
  src/lib/components/marketing/landing/simulator-teaser-section.svelte \
  src/lib/components/marketing/landing/step-card.svelte
```

```bash
git rm -r --quiet \
  src/lib/components/marketing/simulator \
  "src/routes/[[lang]]/(marketing)/simulator" \
  "src/routes/[[lang]]/(marketing)/pricing"
```

Conservés : `hero-section.svelte`, `cta-section.svelte`, `faq-section.svelte`, `landing-section.svelte`, `section-heading.svelte`, `pricing-card.svelte`, `pricing-section.svelte`, `reveal.ts`, `index.ts`, `landing-data.ts`, `marketing-header.svelte`, `marketing-footer.svelte`, `cookie-banner.svelte`.

- [ ] **Step 2: Réécrire `landing-data.ts` avec le contenu EGalim**

Remplacer intégralement le contenu par les données de la fiche EGalim (doc 10) :

```ts
export const HERO = {
	title: 'Vous ne connaissez pas votre taux EGalim. Personne ne le connaît.',
	subtitle:
		'Depuis 2024, toute cantine — privée comprise — doit servir 50 % de produits durables dont 20 % de bio, et le déclarer chaque année. Nous calculons votre chiffre réel à partir de vos factures, et nous chiffrons l’écart en euros.',
	cta: 'Demander un diagnostic'
};

export const PROOF_STATS = [
	{ value: '85 %', label: 'des cantines déclarantes ne sont pas conformes' },
	{ value: '79 %', label: 'des sites concernés ne déclarent rien du tout' },
	{ value: '31 mars', label: 'date limite de la télédéclaration annuelle' }
];

export const FAQ = [
	{
		q: 'Le « local » compte-t-il dans le calcul ?',
		a: 'Non. Le code de la commande publique interdit la préférence géographique directe. Seuls comptent le bio et les labels officiels : Label Rouge, AOP, AOC, IGP, STG, HVE niveau 3, pêche durable, commerce équitable. Beaucoup de gestionnaires se croient conformes et ne le sont pas.'
	},
	{
		q: 'Le HVE compte-t-il dans les 20 % de bio ?',
		a: 'Non. Le HVE niveau 3 compte dans les 50 % de produits durables, mais pas dans les 20 % de bio, qui exigent le label AB ou son équivalent européen.'
	},
	{
		q: 'Comment le ratio se calcule-t-il ?',
		a: 'En valeur d’achat HT, ligne à ligne, sur douze mois de factures fournisseurs. Pour 300 couverts, cela représente 2 000 à 5 000 lignes par an. C’est la raison pour laquelle presque personne ne le fait à la main.'
	},
	{
		q: 'Garantissez-vous la conformité ?',
		a: 'Non, et personne ne le peut honnêtement : le dénominateur inclut la totalité de vos achats alimentaires, y compris ceux qu’un prestataire extérieur ne maîtrise pas. Nous mesurons votre ratio, nous le faisons progresser, et nous en produisons la preuve. La déclaration reste signée par vous.'
	}
];
```

- [ ] **Step 3: Réécrire `+page.svelte` de la landing**

Remplacer intégralement `src/routes/[[lang]]/(marketing)/+page.svelte` :

```svelte
<script lang="ts">
	import SEOHead from '$lib/components/SEOHead.svelte';
	import LandingSection from '$lib/components/marketing/landing/landing-section.svelte';
	import SectionHeading from '$lib/components/marketing/landing/section-heading.svelte';
	import HeroSection from '$lib/components/marketing/landing/hero-section.svelte';
	import FaqSection from '$lib/components/marketing/landing/faq-section.svelte';
	import CtaSection from '$lib/components/marketing/landing/cta-section.svelte';
	import { HERO, PROOF_STATS, FAQ } from '$lib/components/marketing/landing/landing-data';
</script>

<SEOHead
	title="Mycelium — conformité EGalim en restauration collective"
	description="Nous calculons le taux EGalim réel de votre cantine à partir de vos factures, et nous chiffrons l'écart en euros."
/>

<HeroSection title={HERO.title} subtitle={HERO.subtitle} cta={HERO.cta} />

<LandingSection>
	<SectionHeading title="La réalité du secteur" />
	<div class="grid gap-6 sm:grid-cols-3">
		{#each PROOF_STATS as stat (stat.label)}
			<div
				class="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-6
				       shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
			>
				<div
					class="pointer-events-none absolute inset-x-0 top-0 h-px
					       bg-gradient-to-r from-transparent via-white/20 to-transparent"
				></div>
				<p class="text-3xl font-semibold tracking-tight">{stat.value}</p>
				<p class="text-muted-foreground mt-2 text-sm">{stat.label}</p>
			</div>
		{/each}
	</div>
</LandingSection>

<FaqSection items={FAQ} />

<CtaSection />
```

Si les props de `HeroSection`, `FaqSection` ou `CtaSection` diffèrent de celles utilisées ici, adapter l'appel aux signatures réelles de ces composants plutôt que de les modifier — ils sont conservés tels quels.

- [ ] **Step 4: Vérifier qu'aucun import mort ne subsiste**

```bash
grep -rn "agents-section\|modules-section\|integrations-marquee\|mockup-\|feature-showcase\|human-concierge\|simulator-teaser\|proof-stat\|step-card\|how-it-works" src/routes src/lib/components || echo "LANDING PROPRE — OK"
```

Attendu : `LANDING PROPRE — OK`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit --no-verify -m "refactor: depublier la landing Fleet, contenu EGalim minimal"
```

---

## Task 16: Réduire l'onboarding à une étape

**Files:**
- Modify: `src/routes/[[lang]]/onboarding/organization/+page.svelte`

- [ ] **Step 1: Fixer la localisation FR côté serveur**

Dans `src/lib/convex/organizations.ts`, `createOrganization` ne prend plus de paramètres de localisation : elle les fixe elle-même.

```ts
		const organizationId = await ctx.db.insert('organizations', {
			name: args.name,
			siret: args.siret,
			etablissementType: args.etablissementType,
			couvertsJour: args.couvertsJour,
			gestionDirecte: args.gestionDirecte,
			country: 'FR',
			currency: 'EUR',
			timezone: 'Europe/Paris',
			locale: 'fr-FR',
			createdAt: Date.now()
		});
```

- [ ] **Step 2: Remplacer le wizard 4 étapes par un formulaire unique**

Remplacer intégralement `src/routes/[[lang]]/onboarding/organization/+page.svelte` :

```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import { useConvexClient } from 'convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	const client = useConvexClient();

	const TYPES = [
		{ value: 'RIE', label: "Restaurant d'entreprise" },
		{ value: 'CLINIQUE', label: 'Clinique' },
		{ value: 'EHPAD', label: 'EHPAD' },
		{ value: 'CRECHE', label: 'Crèche' },
		{ value: 'ECOLE_PRIVEE', label: 'École privée' },
		{ value: 'AUTRE', label: 'Autre' }
	] as const;

	let name = $state('');
	let etablissementType = $state<(typeof TYPES)[number]['value']>('RIE');
	let couvertsJour = $state<number | null>(null);
	let siret = $state('');
	let submitting = $state(false);
	let error = $state('');

	const canSubmit = $derived(
		name.trim().length > 1 && couvertsJour !== null && couvertsJour > 0 && !submitting
	);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSubmit) return;
		submitting = true;
		error = '';
		try {
			await client.mutation(api.organizations.createOrganization, {
				name: name.trim(),
				etablissementType,
				couvertsJour: couvertsJour!,
				gestionDirecte: true,
				siret: siret.trim() || undefined
			});
			await goto('/app');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Création impossible.';
			submitting = false;
		}
	}
</script>

<div class="mx-auto w-full max-w-lg px-4 py-12">
	<h1 class="text-2xl font-semibold tracking-tight">Votre cantine</h1>
	<p class="text-muted-foreground mt-2 text-sm">
		Trois informations suffisent pour démarrer.
	</p>

	<form class="mt-8 space-y-5" onsubmit={submit}>
		<div class="space-y-2">
			<Label for="name">Nom de l'établissement</Label>
			<Input id="name" bind:value={name} required class="h-10" />
		</div>

		<div class="space-y-2">
			<Label for="type">Type d'établissement</Label>
			<select
				id="type"
				bind:value={etablissementType}
				class="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
			>
				{#each TYPES as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>

		<div class="space-y-2">
			<Label for="couverts">Couverts servis par jour</Label>
			<Input id="couverts" type="number" min="1" bind:value={couvertsJour} required class="h-10" />
		</div>

		<div class="space-y-2">
			<Label for="siret">SIRET <span class="text-muted-foreground">(optionnel)</span></Label>
			<Input id="siret" bind:value={siret} class="h-10" />
		</div>

		{#if error}
			<p class="text-destructive text-sm">{error}</p>
		{/if}

		<Button type="submit" disabled={!canSubmit} class="w-full">
			{submitting ? 'Création…' : 'Créer mon espace'}
		</Button>
	</form>
</div>
```

- [ ] **Step 3: Vérifier qu'aucune référence aux étapes supprimées ne subsiste**

```bash
grep -rn "distanceUnit\|inviteOrganizationMember\|step === 2\|step === 3\|step === 4" "src/routes/[[lang]]/onboarding" || echo "ONBOARDING PROPRE — OK"
```

Attendu : `ONBOARDING PROPRE — OK`

- [ ] **Step 4: Commit**

```bash
git add -A && git commit --no-verify -m "refactor: onboarding en une seule etape"
```

---

## Task 17: Purger la marque « Fleet OS » et réécrire les instructions projet

Spec §2.8 : « Mycelium » est conservé, « Fleet OS » disparaît partout. Cette tâche couvre aussi
`CLAUDE.md`, qui décrit encore intégralement le produit Fleet et induirait en erreur toute session
de développement ultérieure.

**Files:**
- Modify: `CLAUDE.md` (réécriture intégrale)
- Modify: `README.md`, `src/lib/components/SEOHead.svelte`, `src/routes/llms.txt`, `src/lib/convex/emails/templates.ts`
- Delete: `docs/BUSINESS-PLAN-FLEET-CARE.md`, `docs/ROADMAP-CONCIERGE.md`, `docs/prompts/`, `docs/specs/`

- [ ] **Step 1: Repérer toutes les occurrences de la marque**

```bash
grep -rln "Fleet OS\|Fleet Care\|fleet management\|gestion de flotte" \
  src README.md CLAUDE.md --include="*.ts" --include="*.svelte" --include="*.md" --include="*.txt" --include="*.json"
```

Dans chaque fichier listé, remplacer par la formulation EGalim. Les trois formulations de référence :

- Nom du produit : **Mycelium**
- Baseline courte : **la conformité EGalim de votre cantine, mesurée et prouvée**
- Description longue : **Mycelium calcule le taux EGalim réel des cantines à partir de leurs factures fournisseurs, chiffre l'écart en euros et en produit la preuve chaque mois.**

- [ ] **Step 2: Supprimer la documentation produit obsolète**

```bash
git rm -r --quiet docs/BUSINESS-PLAN-FLEET-CARE.md docs/ROADMAP-CONCIERGE.md docs/prompts docs/specs docs/vision-ux-unified-assist.md docs/integrations-library.md
```

`docs/agri/` et `docs/superpowers/` sont conservés — ce sont les seules sources produit valides.

- [ ] **Step 3: Réécrire `CLAUDE.md`**

Remplacer intégralement le contenu par :

```markdown
# Mycelium — Contexte projet

## Vision produit

Mycelium est l'**opérateur de la conformité EGalim en restauration collective**. La loi impose à
toutes les cantines, publiques depuis 2022 et **privées depuis 2024**, de servir ≥ 50 % de produits
durables dont ≥ 20 % de bio (et ≥ 60 % de durable sur la viande et le poisson), et de le déclarer
chaque année avant le 31 mars sur « ma cantine ».

~85 % des cantines déclarantes n'y arrivent pas, et **la plupart ne connaissent même pas leur
chiffre**, parce qu'il se calcule en valeur d'achat, ligne à ligne, sur douze mois de factures.

**On vend un résultat mesuré, pas un SaaS.** 80 % humain, 20 % logiciel.

**Cible :** restauration collective privée en gestion directe, non équipée, Île-de-France Ouest.

## L'échelle de valeur en 6 étages

| Étage | Ce qu'on vend | Prix |
|---|---|---|
| 0 | Diagnostic EGalim | 690–1 900 € one-shot |
| 1 | Déclaration assistée | 290–690 € |
| 2 | Abonnement Conformité | 190–390 €/mois |
| 3 | Pilote Substitution | 0–500 € |
| 4 | Abonnement Opérateur | 450–900 €/mois + commission |
| 5 | Orchestration logistique | sous condition stricte |

On ne monte pas d'étage tant que le précédent ne tourne pas. Seuls les **étages 0 à 2** justifient
du code en année 1.

## ⚠️ Les deux lignes rouges

1. **On ne prend jamais la propriété des denrées.** Le producteur facture et livre en direct.
2. **On n'organise jamais le transport en notre nom propre.** (statut de commissionnaire de
   transport, réglementé)

Et un mot interdit : **« garantie »**. On ne garantit jamais la conformité. On la **mesure**, on la
**fait progresser**, on la **prouve**. La déclaration reste signée par la cantine.

## Principe anti-dérive

**On ne construit que ce que le journal de friction du terrain désigne**, chronométré. Chaque
fonctionnalité doit répondre à deux questions : quelle tâche manuelle répétée elle supprime, et
quel étage commercial déjà vendu elle débloque. Sans réponse chiffrée aux deux, on ne la construit
pas.

Unique exception assumée : la **Moulinette Audit**, parce que c'est le produit facturé lui-même.

## Stack technique

- Frontend : SvelteKit 2 + Svelte 5 (runes)
- Backend : Convex (fonctions dans `src/lib/convex/`)
- Auth : Better Auth (install Convex locale)
- UI : Tailwind CSS v4 + composants custom shadcn-style
- IA : Claude API via actions Convex
- Facturation : Paddle · Emails : Resend · Déploiement : Cloudflare Workers
- Package manager : bun · Tests : Vitest (unit), Playwright (E2E)

## Architecture

- **Multi-tenant strict par `organizationId`** — une cantine = une organisation.
  Unique exception délibérée : `productLabels`, table globale de classification de libellés, qui ne
  contient jamais de montant, de quantité, de fournisseur ni de lien vers une organisation.
- Interface **en français uniquement** (EGalim est une loi française).
- Deux espaces : `/app/*` (la cantine) et `/ops/*` (l'opérateur Mycelium, vue multi-clients).
- Trois rôles client : `ORG_ADMIN`, `ORG_MEMBER`. Deux rôles staff : `SUPER_ADMIN`, `OPERATOR`.

## Le référentiel EGalim

`src/lib/egalim/referentiel.ts` est **du code, jamais des données**. Il est versionné
(`REFERENTIEL_VERSION`), passe en revue de code, et chaque classification enregistre la version qui
l'a produite. Le barème doit être revérifié **avant** toute production de rapport client.

Rappel du barème : bio et conversion comptent dans les deux ratios ; Label Rouge, AOP/AOC/IGP/STG,
HVE 3, fermier, pêche durable, commerce équitable, RUP et coût du cycle de vie comptent en durable
seul ; **« local », « circuit court », « de saison », « fait maison » ne comptent pas**.

## Auditabilité — non négociable

- Chaque ligne de facture conserve son libellé source, sa classification, **sa justification** et un
  indice de confiance. Aucune classification sans phrase justificative.
- Les lignes sous le seuil de confiance, et **systématiquement** celles classées viande ou poisson,
  partent en revue humaine.
- **Un diagnostic livré est figé, définitivement.** Une nouvelle mesure produit un nouveau
  diagnostic daté.

## Conventions

- TypeScript strict, pas de `any`
- Composants Svelte avec runes (`$state`, `$derived`, `$effect`)
- Convex : `query` pour lire, `mutation` pour écrire, `action` pour les appels externes
- Composants PascalCase · fonctions Convex camelCase · routes kebab-case · tables au pluriel
- Pas de `console.log` en production

## Règles pour les subagents

Les agents custom dans `.claude/agents/*.md` tournent en mode « text generation only ». Leurs tool
calls ne sont **pas** exécutés. Toujours implémenter directement dans le contexte principal.

## Liens utiles

- Business plan : `/docs/agri/business-plan/00-README.md`
- Playbook 90 jours : `/docs/agri/playbook-90-jours-restauration-collective.md`
- Fiche EGalim (barème) : `/docs/agri/business-plan/10-fiche-egalim-1page.md`
- Spec du pivot : `/docs/superpowers/specs/2026-08-15-pivot-egalim-tri-et-moulinette-design.md`
- Gabarits extraits de Fleet : `/docs/superpowers/references/`

Ce projet utilise [Convex](https://convex.dev). Lire
`src/lib/convex/_generated/ai/guidelines.md` avant tout travail sur le backend.
```

- [ ] **Step 4: Vérifier qu'aucune trace de la marque Fleet ne subsiste**

```bash
grep -rn "Fleet OS\|Fleet Care\|fleet management\|gestion de flotte" src README.md CLAUDE.md || echo "MARQUE PURGEE — OK"
```

Attendu : `MARQUE PURGEE — OK`

- [ ] **Step 5: Commit**

```bash
git add -A && git commit --no-verify -m "docs: purger la marque Fleet OS et reecrire CLAUDE.md"
```

---

## Task 18: Vérification finale (les 5 critères du §2.9 de la spec)

**Files:** aucun (vérification seule)

- [ ] **Step 1: Typecheck du backend Convex**

```bash
bun run check:convex
```

Attendu : aucune erreur.

- [ ] **Step 2: Typecheck du projet complet**

```bash
bun run check
```

Attendu : `0 errors`. Les avertissements d'accessibilité sont tolérés à ce stade.

- [ ] **Step 3: Déploiement Convex**

```bash
bunx convex dev --once
```

Attendu : `Convex functions ready`.

- [ ] **Step 4: Tests unitaires**

```bash
bun run test:unit
```

Attendu : tous les tests PASS, y compris `notifications` (3) et `billing` (5).

- [ ] **Step 5: Build de production**

```bash
bun run build
```

Attendu : build réussi, aucune erreur Vite.

- [ ] **Step 6: Vérifier le décompte final**

```bash
echo "Tables : $(grep -cE '^\s*[a-zA-Z]+: defineTable' src/lib/convex/schema.ts)" && \
echo "Lignes Convex : $(find src/lib/convex -name '*.ts' -not -path '*_generated*' | xargs wc -l | tail -1)" && \
echo "Routes : $(find src/routes -maxdepth 3 -type d | wc -l)"
```

Attendu : 16 tables, environ 13 000 lignes Convex, environ 18 répertoires de routes.

- [ ] **Step 7: Vérification fonctionnelle manuelle**

Démarrer l'application :

```bash
bun run dev
```

Vérifier dans le navigateur, dans cet ordre :

1. `/` affiche la landing EGalim, sans mention de flotte, de véhicule ni de réservation
2. `/signup` permet de créer un compte
3. `/onboarding/organization` affiche un formulaire d'une seule étape et crée l'organisation
4. `/app` s'affiche sans erreur console
5. `/app/parametres` permet de modifier le nom et le profil de la cantine
6. Un compte `myceliumStaff` accède à `/ops` et voit la liste des organisations

Ces six points correspondent exactement aux cinq critères de fin du §2.9 de la spec.

- [ ] **Step 8: Commit final et bilan**

```bash
git add -A && git commit --no-verify -m "chore: phase 0 terminee — base nette a 16 tables" && git log --oneline main..HEAD
```

Attendu : l'historique de la branche `pivot-egalim` liste les commits des tâches 1 à 18.

---

## Ce que cette phase ne fait pas

- Aucune table du domaine EGalim n'est créée (`invoiceLines`, `productLabels`, `diagnostics`…) — c'est la phase 1
- Aucune route `/app/factures`, `/app/diagnostic/[id]`, `/ops/revue/[batchId]` n'est créée — phase 1
- `src/lib/egalim/referentiel.ts` n'est pas écrit — phase 1, jour 1
- La landing n'est pas refondue, seulement dépubliée — phase 2, octobre
- Le segment de route `[[lang]]` est conservé (décision §5 de la spec)
- **Il ne reste aucune interface de facturation.** `/admin/settings/plans` (checkout Paddle, portail
  client) disparaît avec l'espace `/admin`. La plomberie `paddle.ts` et `billing.ts` reste en place
  et fonctionnelle, mais aucune page ne l'expose. C'est volontaire : les étages 0 et 1 sont
  facturés à la main sur devis, et l'abonnement Conformité (étage 2) n'ouvre qu'en phase 3.
