# Mycelium Fleet OS — Contexte projet

## Vision produit — Fleet OS du futur

Mycelium est le **premier Fleet OS (Fleet Operating System)** pour PME et ETI. Nous ne sommes pas un car sharing pur (Mobeelity). Nous ne sommes pas un fleet management classique (Ubiwan). Nous sommes la plateforme qui unifie l'expérience salarié et l'automatisation de gestion via une couche d'**agents IA spécialisés**.

**Cible géographique :** Royaume-Uni + pays nordiques en priorité (lancement Global Day-1). France maintenue mais non priorisée avant M12.

**Cible client :** PME et ETI 50-500 salariés avec flotte de 15-150 véhicules d'entreprise.

**Promesse :** Remplacer les Excel et outils dispersés par un système opérationnel unifié où les salariés réservent en parlant à un agent IA, et où le CFO/RH pilote sa flotte avec des insights automatiques.

**Notre différenciation : 6 agents IA spécialisés (aucun concurrent n'a cette architecture)**

1. **Concierge** (salarié) — réservation conversationnelle en langage naturel
2. **Assistant Gestionnaire** (CFO) — interface NL pour interroger la flotte
3. **Optimiseur de flotte** (background) — insights hebdomadaires proactifs
4. **Compliance Officer** (background) — surveillance réglementaire (BiK UK, CSRD Nordiques, conformité auto)
5. **Négociateur de coûts** (proactif) — opportunités d'économie identifiées
6. **Coach conducteurs** (salariés + RH) — éco-conduite et sécurité

**Pricing par palier de valeur (facturation via Paddle — MoR international) :**

- **Essential (490€ / £420/mois)** : 50 conducteurs — Concierge + gestion flotte de base
- **Professional (890€ / £750/mois)** : 150 conducteurs — + sync Xero/QuickBooks + Compliance Officer + BiK UK/CSRD lite
- **Business (1 490€ / £1 250/mois)** : 300 conducteurs — + Optimiseur + Négociateur + Coach + BiK conseils IA
- **Enterprise** : sur devis, >300 conducteurs
- **Overage** : 5€–8€/conducteur au-delà du quota

**Distribution :** Xero App Marketplace + QuickBooks App Store + Odoo Community (canaux #1/#2/#3). Pennylane maintenu mais non prioritaire.

## ⚠️ Scope strict — Ce qu'on NE FAIT PAS

- Pas de mode marque blanche pour leasers (Arval, ALD, etc.)
- Pas de marketplace de partage entre entreprises
- Pas de procurement automatisé (négociation multi-leasers)
- Pas de remarketing (revente véhicules)
- Pas d'expansion vers autres types de véhicules (trottinettes, camions, maritime)
- Pas de cible particuliers ou auto-entrepreneurs
- Pas d'app mobile native (PWA suffit, Capacitor seulement si demandé par 3+ clients)
- Pas d'IoT, pas de capteurs, pas de hardware (jamais)
- Pas de vision macro-prédictive avant 10 000 clients actifs (ne pas pitcher)

Les idées hors scope vont dans /docs/ideas-parking-lot.md, on n'y touche pas avant M12.

## Stack technique

- Frontend : SvelteKit 2.x + Svelte 5 (runes)
- Backend : Convex (réactif temps réel)
- Auth : Better Auth (local Convex install)
- UI : Tailwind CSS v4 + Mycelium UI (composants custom shadcn-style)
- Tests : Playwright pour E2E, Vitest pour unit
- IA : Claude API (Anthropic) via Convex actions
- Déploiement : Cloudflare Workers
- Package manager : bun

## Architecture

- Multi-tenant strict (chaque entreprise isolée par organizationId)
- Convex schemas dans /src/lib/convex/schema.ts
- Composants UI dans /src/lib/components/
- Pages dans /src/routes/
- Actions/queries/mutations Convex dans /src/lib/convex/

## Règles pour les subagents

Les agents custom dans `.claude/agents/*.md` tournent en mode "text generation only". Leurs tool calls ne sont PAS exécutés. Ils servent uniquement à la réflexion/analyse, pas à l'implémentation. Toujours implémenter directement dans le contexte principal (Write/Edit).

## Conventions de code

- TypeScript strict mode, pas de any
- Composants Svelte avec runes ($state, $derived, $effect)
- Convex : queries pour lecture, mutations pour écriture, actions pour appels externes
- Tests E2E Playwright pour chaque page utilisateur
- Pas de console.log en production

## Conventions de nommage

- Composants : PascalCase (VehicleCard.svelte)
- Fonctions Convex : camelCase
- Routes : kebab-case
- Tables Convex : pluriel

## Deux environnements utilisateurs (MVP)

1. Admin entreprise : /admin/\* — DAF, RH, gestionnaire flotte
2. Salarié : /app/\* — utilisateur qui réserve un véhicule

## Trois rôles

- ORG_ADMIN : gère l'entreprise, voit tout
- ORG_MANAGER : gère un département (futur, post-MVP)
- ORG_MEMBER : salarié, voit ses propres réservations

## État d'avancement actuel

### ✅ Fait

- Page /admin/settings/organization : formulaire avec validation, guard ORG_ADMIN, toast succès
- Mutation updateOrganization dans /src/lib/convex/organizations.ts
- **P01 — Gestion flotte** : CRUD complet (createVehicle, updateVehicle, deleteVehicle, bulkCreateVehicles), pages /admin/fleet + /admin/fleet/new + /admin/fleet/[vehicleId], import CSV 3 étapes, composants VehicleTable/VehicleForm/VehicleFilters/VehicleStatusBadge/ImportFleetModal
- **P02 — Réservations** : mutations createReservation/updateReservation/cancelReservation + hasConflict helper + searchAvailableVehicles, pages /app/reservations + /app/reservations/new (wizard 4 étapes) + /app/reservations/[id], vue admin /admin/reservations (FleetCalendar) + /admin/reservations/[id], cron auto-transition CONFIRMED→IN_PROGRESS→COMPLETED
- **P03 — Concierge IA** : httpAction SSE streaming + boucle agentique 10 itérations + 4 outils (searchVehicles/createReservation/listReservations/cancelReservation) + system prompt anti-hallucination + UI chat complète (ConciergeChat, widgets vehicle_proposal/reservation_confirmed, BookingStepper, NLP date parser)
- **P04 — Dashboard admin** : queries getFleetStats/getUsageOverTime/getAttentionNeeded/getAvailableSites/getRecentActivity, page /admin/dashboard avec KPI cards + graphique activité (SVG D3) + donut répartition + liste attention + feed activité temps réel, filtres période et sites
- **P05 — Calendrier flotte** : composants FleetCalendar/CalendarHeader/WeekGrid/DayGrid/MonthGrid/ReservationBlock/DayReservationBlock, vues semaine+jour+mois, drag-to-create/move/resize, filtres site+catégorie+énergie+statut, modale création rapide, sheet édition, menu contextuel, local-first optimistic state, 10 tests unitaires utils.ts
- **P06 — Notifications** : queries listMyNotifications/getUnreadCount + mutations markAsRead/markAllAsRead/createNotification (internal), emails transactionnels via @convex-dev/resend (confirmation/annulation/rappel), cron sendDailyReminders 17h UTC, NotificationCenter (sheet, groupé par date, badge réactif), NotificationItem (8 types avec icônes/couleurs), buildNotificationContent helper, 10 tests unitaires
- **P07 — Agent Gestionnaire DAF** : httpAction SSE `/api/manager/chat` + guard ORG_ADMIN/ORG_MANAGER + 6 outils read-only (getFleetUtilizationStats/getCostBreakdown/getReservationActivity/getMaintenanceOverview/getComplianceStatus/getFleetSummary) + system prompt analytique + conversations namespaced `:manager` + proxy SvelteKit `/api/manager` + ManagerChat (bouton flottant, quick prompts, streaming SSE) + ManagerMessage (rendu markdown)
- **P08 — Tracking financier** : mutations createCost/updateCost/deleteCost/bulkImportCosts + queries getFinancialKPIs/getCostsByCategory/getCostsByVehicle/listCosts + pages /admin/finance (KPI cards + donut catégories + table véhicules + export) + /admin/finance/costs (liste filtrée + formulaire + import CSV 2 étapes) + composants FinancialKPIs/CategoryBreakdown/VehicleCostsTable/CostsTable/CostFormModal/ImportCostsModal/ExportModal/PeriodSelector + upload factures Convex Storage
- **P09 — Maintenance & alertes conformité** : mutations scheduleMaintenance/completeMaintenance/cancelMaintenance/updateMaintenanceStatus + scheduleMaintenanceAndNotify (email garage + notif conducteur) + cron checkMaintenanceDue 5h UTC (detector.ts) avec analyse sévérité NORMAL/URGENT/CRITIQUE + dédoublonnage 24h + pages /admin/maintenance (tabs planifié/en cours/historique, vue liste + calendrier) + /admin/maintenance/[id] (timeline, cards véhicule/garage/coûts, dialogues complétion/annulation) + composants MaintenanceCard/MaintenanceCalendar/MaintenanceFilters/MaintenanceStatusBadge/ScheduleMaintenanceModal/GarageSelector
- **P10 — Agent Optimiseur de flotte** : internalAction runFleetOptimizerForAllOrgs (entry cron) + runFleetOptimizerForOrg (collecte données 90j → Claude Sonnet avec prompt cache_control ephemeral → parse JSON → saveReport → schedule email) + collectFleetDataForOrg (utilisation %, coûts par catégorie, leasing expirant, maintenance en retard) + sendOptimizerReportEmail (HTML branded email → ORG_ADMINs via Resend) + table optimizerReports (by_org_and_week pour dédoublonnage) + cron weekly lundi 8h UTC
- **P11 — Gestion conducteurs & conformité permis** : tables driverProfiles + driverRestrictions + types notif LICENSE_EXPIRING/LICENSE_EXPIRED + drivers.ts (upsertDriverProfile/validateDriverLicense/addDriverRestriction/removeDriverRestriction/listDriversForOrg/getDriverProfile/getDriverRestrictions/generateLicenseUploadUrl + checkLicenseExpiry internalAction cron daily 6h UTC) + validation permis dans createReservation (isBlocked + expiryDate + catégories utilitaire + restrictions NO_UTILITY/NO_TRUCK) + pages /admin/drivers + /admin/drivers/[userId] (5 onglets : Profil/Permis/Formations/Restrictions/Historique) + composants DriverTable/DriverProfileForm/LicenseUpload/RestrictionBadge + entrée sidebar Conducteurs
- **P12 — États des lieux & contraventions** : tables vehicleInspections + trafficViolations + types notif VIOLATION_RECEIVED/INSPECTION_REQUIRED + inspections.ts (createInspection/getInspectionsForReservation/getInspectionsForVehicle/generateInspectionUploadUrl) + violations.ts (createViolation/processViolation/updateViolationStatus/listViolations/getViolation/generateViolationUploadUrl) + auto-identification conducteur via planning + notification conducteur si charge DRIVER + page /app/reservations/[id]/inspect (wizard 3 étapes : photos 6 angles/dommages/recap) + page /admin/violations (KPIs + filtres statut + table + modales traitement/statut) + composants InspectionPhotos/InspectionDamages/ViolationForm/ViolationTable + bouton "État des lieux" sur page réservation + entrée sidebar Contraventions
- **P13 — Copilote IA flottant** : store global CopilotStore ($state, open/close/toggle) + CopilotFab (FAB --brand coin inf. droit, Cmd+K/Ctrl+K global, Échap) + CopilotPanel (panneau 420px, SSE streaming /api/concierge + /api/manager, quick prompts, tool*call indicators, markdown, mobile full-screen) + agent concierge par défaut sur /app/*, manager sur /admin/\_ + remplacement ManagerChat existant + teaser page /app transformé en bouton fonctionnel

- **P15 — Notes de frais IK (refactoré post-pivot)** : grille `mileageRateConfigs` paramétrable par org (ELECTRIC/HYBRID/THERMAL/UTILITY) + defaults par pays (FR/GB/SE/NO/DK) via `mileageRates.ts` + `resolveRate()` (config org → defaults pays → fallback FR) + champs `distance`/`distanceUnit`/`vehicleCategory`/`ratePerUnit` (remplace `distanceKm`/`fiscalPower`) + mutations getMileageRateConfig/updateMileageRateConfig + expense-form.svelte (sélecteur catégorie, calcul live multi-devise, 100% FR) + export CSV international + accounting.ts/publicApi.ts mis à jour

- **P23 — Intégration comptable Pennylane (AXE DISTRIBUTION DNVB)** : interface `AccountingConnector` provider-agnostic (port.ts) + moteur de sync idempotent (sync-engine.ts) + connecteur Pennylane (push coûts/IK → compta avec catégorie/analytique/TVA, sync paiements entrants, mapping PCG) + tables accountingIntegrations/accountingCategoryMappings/accountingSyncLogs + OAuth2 callback + cron syncAccountingForAllOrgs + page /admin/settings/integrations (cartes providers, mappings, logs) + cartes Sage/EBP/Odoo/QuickBooks "Bientôt disponible"
- **P24 — Connecteurs Sage/EBP/Odoo + API publique & Webhooks (AXE DISTRIBUTION)** : registre multi-provider (AccountingConnector port + sageConnector + ebpConnector dans accounting.ts), module Odoo community (/integrations/odoo-mycelium/ LGPL-3, consomme l'API publique), API REST v1 Convex httpActions (/api/v1/costs GET+POST, /vehicles, /expenses, /webhooks), tables apiKeys/webhookEndpoints/webhookDeliveries, clés scopées hashedKey+prefix `myc_live_`, webhooks signés HMAC SHA-256 + retries x5 backoff, proxy SvelteKit /api/v1/[...path], onglet Développeurs dans /admin/settings/integrations (CRUD clés + webhooks). Sécurité : chiffrement AES-256-GCM secrets webhook (SvelteKit server route /api/webhooks/create), rate limiting 100 req/min par clé API (@convex-dev/rate-limiter), note sécurité Odoo sur stockage plaintext PostgreSQL.
- **P14 — Google Calendar & Outlook sync** : déjà entièrement implémenté (OAuth Google/Microsoft, actions Convex de sync, composants UI, hooks dans reservations.ts)
- **P16 — Gestion des sinistres** : table incidents (6 statuts DECLARED→CLOSED/CONTESTED) + activeIncidentId sur vehicles + 8 fonctions Convex (declareIncident/updateIncidentStatus/triggerSendToInsurer/getIncident/listIncidents/listMyIncidents/getIncidentStats + sendIncidentEmailAction internalAction email assureur Resend) + pages /app/incidents (liste) + /app/incidents/new (wizard 3 étapes photos Convex Storage) + /app/incidents/[id] (suivi salarié) + /admin/incidents (liste KPIs) + /admin/incidents/[id] (timeline + envoi assureur + mise à jour statut + imputation franchise automatique) + entrées sidebar admin+app

- **P17 — Import relevés carburant** : parsers Total Cards/BP Plus/Shell Fleet (fuelParsers.ts), détection provider automatique, matching immatriculations tolérant, 3 règles anomalies (week-end/volume>120L/doublon±30min), internalAction async processFuelImport + idempotence coûts, wizard 3 étapes /admin/finance/fuel-import, FuelAnomalyCard Accept/Reject, historique imports, bouton "Import Carburant" sur page finance

### ✅ Sprint 1 livré (juin 2026 — fondations internationales)

- **P_I18N** ✅ — `organizations` schema : +`country`, +`currency`, +`distanceUnit`, +`timezone`, +`locale` (tous optionnels, jamais hardcodés). `updateOrganization` accepte ces champs. Page `/admin/settings/organization` : nouvelle card "Localisation & Currency" (pays/devise/unité/fuseau).
- **P15 refactor** ✅ — `mileageRates.ts` (defaults FR/GB/SE/NO/DK par catégorie ELECTRIC/HYBRID/THERMAL/UTILITY). Table `mileageRateConfigs`. Champs `mileageExpenses` refactorisés (`distance`+`distanceUnit`+`vehicleCategory`+`ratePerUnit`). `expense-form.svelte` : sélecteur catégorie, calcul live multi-devise, 100% FR, `h-10` touch-friendly. Export CSV international.

### ✅ Sprint 2 livré (juin 2026 — monétisation + distribution UK)

- **P_PADDLE** ✅ — `paddle.ts` Convex : webhooks Paddle, provisioning auto `organizationId` + seats + modules à réception paiement. Page `/admin/settings/plans` avec paliers Essential/Professional/Business.
- **P25** ✅ — `integrations/xeroConnector.ts` + `integrations/quickbooksConnector.ts` : connecteurs natifs Xero et QuickBooks (sync coûts/IK → compta, OAuth, mapping catégories), réutilisent la couche `AccountingConnector` de P23.
- **P_BIK** ✅ — `bik.ts` + `bikRates.ts` (barèmes HMRC par catégorie/liste price) + page `/admin/finance/bik/` : calcul avantage en nature UK par salarié et véhicule, affichage Essential/Pro, export.

### ✅ Sprint 3 livré (juin 2026 — nordiques + conformité)

- **P19** ✅ — `carbon.ts` + `carbonFactors.ts` (facteurs ADEME/IEA/DEFRA par pays/énergie) + page `/admin/sustainability/` (dashboard Scope 1-2-3) + page `/admin/sustainability/esrs-e1/` (rapport PDF ESRS E1 conforme CSRD).
- **P22** ✅ — `smartcar.ts` : intégration Smartcar API v3 M2M, web-flow autorisation par véhicule, sync odomètre/SoC batterie/localisation — zéro hardware.
- **P20** ✅ — `compliance.ts` + page `/admin/compliance/` : Agent Compliance Officer (Agent 4), surveillance BiK UK + CSRD nordiques + conformité auto, alertes proactives.
- **P21** ✅ — page `/admin/settings/members/` + route `/join/[token]/` : gestion membres org, invitations par email avec lien token, rôles ORG_ADMIN/ORG_MEMBER.
- **P18** ✅ — `fiscal.ts` + `fiscalRates.ts` + page `/admin/finance/fiscal/` : TVS, AEN, TVA France, tableau récapitulatif liasse fiscale.

### ✅ Fonctionnalités supplémentaires livrées (hors roadmap initiale)

- **Support interne** ✅ — `src/lib/convex/support/` (threads, messages, agents, ownership) + page `/admin/support/` : système de tickets support interne.
- **Settings notifications** ✅ — page `/admin/settings/notifications/` : configuration des destinataires et préférences de notifications par org.
- **Profil utilisateur app** ✅ — page `/app/profile/` : profil salarié (photo, infos perso, permis).
- **Vue admin dépenses** ✅ — page `/admin/expenses/` : vue agrégée des notes de frais de tous les salariés pour les ORG_ADMIN.

### ✅ Sprint 4 livré (juin 2026 — polish & beta)

- **P_PADDLE_NATIVE** ✅ — `autumn.ts` vidé (stub commenté), toutes références `@useautumn/convex` / `autumn-js` supprimées. `paddle.ts` : webhooks Paddle, provisioning auto org+seats+modules, `getMySubscription` query, `getPortalUrl` action (portal Paddle natif). Page `/admin/settings/plans` : checkout Paddle.js overlay, portal billing, affichage tier/seats/date renouvellement.
- **Polish onboarding** ✅ — Wizard 4 étapes `/onboarding/organization` : (1) Org info name/SIREN/sector/size → `createOrganization`, (2) Localisation pays/devise/unité/fuseau → `updateOrganization` (7 pays pré-configurés GB/FR/SE/NO/DK/DE/NL), (3) Inviter l'équipe emails+rôles → `inviteOrganizationMember`, (4) Écran succès avec liens rapides. Query `getOnboardingProgress` + composant `GettingStartedCard` dans dashboard (checklist 4 étapes, disparaît quand tout est fait, dismissable localStorage).
- **Billing system complet** ✅ — `billing.ts` module central : `resolveEffectivePlan()` (dev bypass si PADDLE_API_KEY absent, devPlan flag, trial actif, subscription Paddle, none), `PLAN_FEATURES` matrix (essential/professional/business/enterprise), `planHasFeature()`, `assertFeatureAccess()`, `assertSeatAvailable()` (quota conducteurs). Schema : +`freeTrialEndsAt`, +`devPlan`. Mutations : `startFreeTrial` (15 jours Professional), `activateDevPlan` (dev uniquement, seatsIncluded=9999). Query `getBillingStatus` (tier, isDev, seatsUsed/Allowed, trialDaysLeft). Frontend : `TrialBanner` (admin layout, countdown urgence), `SubscriptionGate` (wrapper feature-gating avec CTA upgrade/trial), `DevPlanActivator` (banner page plans). Pages gated : BiK UK (professional+), Sustainability/CSRD (professional+), Compliance (professional+). Quota siège branché sur `inviteOrganizationMember`. Onboarding step 4 : offre trial (prod) ou devPlan (dev auto-détecté via VITE_PADDLE_CLIENT_TOKEN absent).
- **P_SMARTCAR_SYNC** ✅ — Cron daily `smartcarSync` déjà en place dans `crons.ts` → `internal.smartcar.syncSmartcarForAllOrgs`.

### 🔄 Prochains (sprint 5)

- **P_CSRD_PDF** — Export PDF ESRS E1 signable (actuellement `window.print()` — remplacer par PDF généré côté client avec métadonnées conformes CSRD).
- **Polish & beta** — Lighthouse 80+, 0 bug critique, 3 clients beta actifs.

### 📋 Backlog MVP (8 semaines — référence historique)

- S1 : Setup et auth multi-tenant ✅
- S2 : Onboarding entreprise et import flotte CSV ✅
- S3 : Dashboard entreprise basique ✅
- S4 : Agent Concierge IA + réservation côté salarié ✅
- S5 : Logique réservation et calendrier ✅
- S6 : Notifications et intégrations calendaires ✅
- S7 : Polish UX/UI complet — en cours
- S8 : Bug fixing et premier client beta — en cours

## Décisions architecturales clés

- Multi-tenant par organizationId, jamais sortir de ce pattern
- PWA only, pas de native
- Import manuel CSV pour la flotte (Smartcar API en P22 pour télématique sans hardware)
- Devise/distanceUnit/timezone abstraites dans l'objet `organization` — jamais hardcodées
- **Facturation via Paddle (MoR) — Stripe non retenu**
- Distribution via app stores (Xero, QuickBooks, Odoo) — pas de sales outbound
- ⚠️ **`autumn.ts` présent dans le code mais NON RETENU** — Autumn doit être supprimé et remplacé par l'intégration Paddle native. Ne pas étendre autumn.ts ni l'utiliser dans de nouveaux fichiers.

## Liens utiles

- **Prompts d'implémentation** : /docs/prompts/ — à utiliser pour chaque session de dev
- Specs détaillées : /docs/specs/
- Vision produit complète : /docs/specs/product-vision.md
- Stratégie agents IA : /docs/specs/ai-agent-strategy.md
- Roadmap produit complète : /docs/specs/product-roadmap.md
- **Stratégie de distribution Global Day-1 : /docs/specs/distribution-integrations-strategy.md** — axe d'acquisition prioritaire
- Architecture : /docs/architecture.md
- Parking lot des idées hors scope : /docs/ideas-parking-lot.md
