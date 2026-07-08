# Vision Commerciale Mycelium — Document Complet

> **Synthèse des 3 axes stratégiques** : Réorganisation UX (admin + concierge), Comptes Démo, Espace Commercial Sales. Ces trois chantiers forment un cycle vertueux : le concierge opère mieux (UX) → le commercial démontre mieux (démo) → le commercial vend mieux (espace sales) → le client adopte mieux (admin simplifié).

---

## Sommaire

1. [La Boucle Commerciale Complète](#1-la-boucle-commerciale-complète)
2. [Axe 1 — Réorganisation UX Admin + Concierge](#2-axe-1--réorganisation-ux-admin--concierge)
3. [Axe 2 — Comptes Démo Commerciaux](#3-axe-2--comptes-démo-commerciaux)
4. [Axe 3 — Espace Commercial Sales](#4-axe-3--espace-commercial-sales)
5. [Schéma Technique Consolidé](#5-schéma-technique-consolidé)
6. [Roadmap Unifiée](#6-roadmap-unifiée)
7. [KPIs de Succès Global](#7-kpis-de-succès-global)

---

## 1. La Boucle Commerciale Complète

```
[PROSPECT]
    │
    ▼
Commercial crée un compte démo (/sales ou /concierge)
    │
    ▼
Prospect explore la plateforme avec sa flotte simulée (/demo/[token])
    │
    ▼
Commercial suit l'activité en temps réel (/sales/pipeline)
Agent IA signale les moments chauds (login prospect, démo expire)
    │
    ▼
Démo expirée → Modale de conversion infranchissable
    │
    ├──→ Appel click-to-call  →  Commercial reçoit l'appel
    ├──→ Calendly             →  RDV planifié
    └──→ Paddle checkout      →  Souscription autonome
                                      │
                                      ▼
                              Org démo → Vraie org
                              Concierge assigné automatiquement
                                      │
                                      ▼
                              Inbox concierge reçoit le nouveau client
                              Fleet Observer disponible dès J1
```

Les 3 espaces — `/admin` (client), `/concierge` (interne), `/sales` (commercial) — sont 3 facettes du même produit, reliées par les même données Convex et le même design system.

---

## 2. Axe 1 — Réorganisation UX Admin + Concierge

### 2.1 Diagnostic du problème

**`/admin` (espace client) :** 30 routes, 10 sections en sidebar. Un DAF qui ouvre Mycelium pour la première fois est perdu. La règle UX : max 6–7 entrées principales.

**`/concierge` (espace interne) :** 3 pages seulement. Pour gérer 20+ clients en parallèle, c'est embryonnaire. Absence de : hub de communication, Fleet Observer, SLA, timeline client.

### 2.2 Nouvelle Architecture `/admin` — 6 sections

**AVANT :** Dashboard · Flotte · Réservations · Maintenance · Conducteurs · Finance · Fiscal · BIK · Frais · Durabilité · Infractions · Sinistres · Conformité · Support · Paramètres

**APRÈS :**

```
📊 Dashboard
🚗 Flotte          → onglets : Véhicules · Réservations · Maintenance · Conducteurs
💶 Finance         → onglets : Vue d'ensemble · Coûts · Frais IK · Carburant · Fiscal
🛡️ Conformité      → onglets : Infractions · Sinistres · Compliance · BiK UK · Durabilité
🔗 Intégrations    → onglets : Connecteurs · API & Webhooks · Calendriers · SmartCar
⚙️ Paramètres      → onglets : Organisation · Équipe · Notifications · Plans
```

**Ce qui disparaît de la sidebar (reste en onglet) :** Fiscal, BIK, Sustainability, Fuel Import.
**Ce qui est supprimé :** `/admin/support` (route gardée, redirige vers le Copilot IA).

### 2.3 Nouvelle Architecture `/concierge` — Hub Zendesk

```
📥 Inbox           → Toutes les communications (Human Assist + tickets + escalades auto)
🏢 Clients         → Grille santé + liste (vue enrichie)
👁 Fleet Observer  → Vue read-only de l'admin client (accès direct depuis Clients)
✅ File de tâches   → concierge_tasks agrégées (existant, enrichi)
📊 Reporting       → Métriques équipe SLA (super_admin)
👥 Équipe          → Gestion staff (super_admin)
```

### 2.4 Inbox Unifiée (cœur du nouveau concierge)

**Sources d'entrée :**
| Source | Priorité auto |
|--------|--------------|
| Human Assist (Copilot client clique "Parler à un humain") | Haute |
| Alerte critique `concierge_task` CRITICAL | Haute |
| Ticket support (`/admin/support` pendant dépreciation) | Moyenne |
| Signal upsell vers commercial | Basse |
| Message commercial (`salesConciergeThreads`) | Normale |

**Statuts ticket :** NOUVEAU → EN_COURS → EN_ATTENTE_CLIENT → RÉSOLU → FERMÉ

**SLA par priorité :**
| Priorité | Première réponse | Résolution |
|----------|-----------------|-----------|
| 🔴 URGENT | 15 min | 2h |
| 🟡 HAUTE | 1h | 8h |
| 🟢 NORMALE | 4h | 24h |
| ⚪ BASSE | 24h | 72h |

**Table `conciergeTickets` :**
```typescript
conciergeTickets: defineTable({
  organizationId: v.id('organizations'),
  sourceType: v.union(
    v.literal('HUMAN_ASSIST'),
    v.literal('SUPPORT_TICKET'),
    v.literal('CONCIERGE_TASK'),
    v.literal('SALES_MESSAGE'),
    v.literal('MANUAL')
  ),
  sourceId: v.optional(v.string()),
  status: v.union(
    v.literal('NEW'),
    v.literal('IN_PROGRESS'),
    v.literal('WAITING_CLIENT'),
    v.literal('RESOLVED'),
    v.literal('CLOSED')
  ),
  priority: v.union(v.literal('URGENT'), v.literal('HIGH'), v.literal('NORMAL'), v.literal('LOW')),
  assignedTo: v.optional(v.string()),         // staffUserId du concierge
  title: v.string(),
  firstResponseAt: v.optional(v.number()),
  resolvedAt: v.optional(v.number()),
  satisfactionEmoji: v.optional(v.union(v.literal('good'), v.literal('neutral'), v.literal('bad'))),
  createdAt: v.number(),
  updatedAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_status_and_priority', ['status', 'priority'])
  .index('by_assigned', ['assignedTo', 'status'])
  .index('by_source', ['sourceType', 'sourceId'])
```

### 2.5 Fleet Observer

Quand un concierge ouvre la fiche d'un client, un bouton "Ouvrir Fleet Observer" charge une vue read-only identique à `/admin` de ce client.

**Implementation :** Les composants admin existants reçoivent un prop `readonly={true}`. Les mutations sont désactivées côté UI. Les queries admin sont appelées avec l'`organizationId` du client (autorisé par le rôle concierge).

**Ce que le concierge peut faire :**
- ✅ Voir toutes les pages admin du client en temps réel
- ✅ Créer une `concierge_task` manuellement depuis Fleet Observer
- ❌ Modifier les données (sauf permission explicite `concierge_write`)
- ❌ Accéder aux données financières sans flag `finance_access`

### 2.6 Client 360 — `/concierge/[orgId]` en 5 onglets

| Onglet | Contenu |
|--------|---------|
| **① Vue d'ensemble** | Score santé, KPIs flotte, alertes récentes, plan, concierge + commercial assignés |
| **② Inbox client** | Tous les tickets liés à cette org (historique complet) |
| **③ Fleet Observer** | Vue admin read-only directement intégrée |
| **④ Timeline** | Chronologie : incidents, maintenances, paiements, messages, changements plan |
| **⑤ Signaux** | Upsell + churn + bouton "Alerter le commercial" → crée `salesSignal` |

---

## 3. Axe 2 — Comptes Démo Commerciaux

### 3.1 Vision

Le compte démo est l'**arme de conversion #1**. Cible : compte opérationnel en < 3 minutes, avec une flotte simulée vivante adaptée au secteur du prospect.

### 3.2 7 Templates de Flotte

| Template | Secteur | % Véhicules clés | Énergie dominante | Flotte |
|----------|---------|------------------|-------------------|--------|
| **services** | ESN, conseil, assurance | 45% berlines compactes, 10% premium direction | 40% hybride, 30% électrique | 20–80 veh |
| **btp** | Construction, facilities | 40% fourgons L2H2, 35% utilitaires compacts | 75% diesel | 25–120 veh |
| **distribution** | Logistique, e-commerce | 55% fourgons L2-L3, 30% fourgonnettes | 50% électrique | 30–150 veh |
| **sante** | Cliniques, HAD, SSIAD | 35% berlines compactes, 30% monospaces | 50% hybride | 15–60 veh |
| **commerce** | VRP, négoce, distribution | 45% berlines commerciales, 25% SUV | 40% hybride | 20–80 veh |
| **vtc** | VTC B2B, chauffeurs d'affaires | 50% berlines premium électriques | 55% électrique | 10–50 veh |
| **public** | Collectivités, mairies | 40% utilitaires légers, 30% berlines pool | 60% électrique | 15–60 veh |

### 3.3 Schema Technique

**Extensions de `organizations` :**
```typescript
isDemo: v.optional(v.boolean()),
demoConfig: v.optional(v.object({
  templateId: v.string(),
  createdBy: v.string(),
  commercialName: v.string(),
  commercialPhone: v.string(),
  commercialCalendlyUrl: v.optional(v.string()),
  prospectName: v.string(),
  prospectEmail: v.optional(v.string()),
  notes: v.optional(v.string()),
  expiresAt: v.number(),
  extendedCount: v.number(),       // max 3 prolongations
  isExpired: v.boolean(),
  convertedAt: v.optional(v.number()),
  conversionSource: v.optional(v.union(v.literal('call'), v.literal('calendly'), v.literal('self_serve')))
}))
```

**Nouvelles tables :**
```typescript
demoVehiclePositions: defineTable({
  vehicleId: v.id('vehicles'),
  organizationId: v.id('organizations'),
  lat: v.number(),
  lng: v.number(),
  speed: v.number(),
  heading: v.number(),
  status: v.union(v.literal('moving'), v.literal('parked'), v.literal('charging'), v.literal('idle')),
  fuelOrSocPercent: v.number(),
  odometerKm: v.number(),
  updatedAt: v.number()
})
  .index('by_vehicle', ['vehicleId'])
  .index('by_org', ['organizationId']),

demoAccessTokens: defineTable({
  token: v.string(),               // 48 hex chars
  organizationId: v.id('organizations'),
  createdAt: v.number(),
  lastUsedAt: v.optional(v.number()),
  usedCount: v.number()
})
  .index('by_token', ['token'])
  .index('by_org', ['organizationId'])
```

### 3.4 UX Flows

**Création (wizard 4 étapes à `/concierge/demos/new` ou `/sales/demos/new`) :**
1. **Infos prospect** — Nom entreprise, secteur (→ template), pays, taille flotte estimée, contact
2. **Paramètres démo** — Date expiration (J+14 défaut, max J+30), infos commercial, notes internes
3. **Prévisualisation** — Aperçu véhicules générés + dashboard KPIs + carte géo
4. **Création** — Génération asynchrone (~10s), lien magique `/demo/[token]` copiable

**Accès prospect (`/demo/[token]`) :**
- Session auto sans mot de passe (ou création compte basique)
- Interface identique à un vrai compte Professional
- Bandeau discret : `"Démo Mycelium · Expire le [date] · Des questions ? [Prénom commercial]"`
- Agent Concierge IA répond avec données de la flotte simulée

**Simulation engine :**
```
Cron 5min → updateAllDemoPositions
  Pour chaque org isDemo=true :
    Pour chaque véhicule :
      Calcule position selon séquence journalière (6h30–19h) + variabilité ±15%
      Décroît carburant/batterie proportionnellement aux km
      Si SoC < 20% → statut 'charging'

Cron daily 6h UTC → generateDailyDemoEvents
  Alerte maintenance (1/semaine par template)
  Contravention aléatoire (1/mois)
  Permis proche expiration (1/mois)
```

**Modale de conversion (quand `now > expiresAt`) :**
- App entière floue (`filter: blur(8px)`, `pointer-events: none`)
- Résumé statistiques : km parcourus, alertes traitées, économies estimées
- 3 CTAs : `📞 Appeler [commercial]` (click-to-call) · `📅 Prendre RDV` (Calendly) · `✅ S'abonner` (Paddle)
- Infranchissable : pas de bouton Fermer, Échap désactivé
- Déverouillage uniquement depuis `/concierge/demos` (commercial)

### 3.5 Emails automatiques (Resend)

| Moment | Sujet |
|--------|-------|
| Création | "Votre accès démo Mycelium Fleet OS est prêt" |
| J+3 | "Vous avez découvert Mycelium ? Votre flotte a parcouru X km" |
| J-3 | "Votre démo expire dans 3 jours" |
| J-0 | "Votre démo Mycelium a expiré · Continuez avec un vrai compte" |

---

## 4. Axe 3 — Espace Commercial Sales

### 4.1 Rôle Technique

Nouveau `staffRole: 'sales'` dans `myceliumStaff`. Même système d'invitation par lien. Accès limité à `/sales/*`.

### 4.2 Navigation Mobile-First

**Bottom tab bar fixe (mobile) / sidebar gauche (desktop ≥ 1024px) :**

| Tab | Route | Description |
|-----|-------|-------------|
| 🏠 Accueil | `/sales` | Briefing quotidien IA |
| 📋 Pipeline | `/sales/pipeline` | Prospects + clients + démos |
| 🎯 Défis | `/sales/challenges` | Gamification + leaderboard |
| 💬 Chat | `/sales/chat` | Messages avec les concierges |

**Accès secondaires :** `/sales/demos/new` · `/sales/agent` · `/sales/profile`

### 4.3 Pipeline Prospects

5 étapes fixes :
```
DISCOVERY → DEMO → NEGOTIATION → WON → LOST
```

**Table `salesProspects` :**
```typescript
salesProspects: defineTable({
  salesUserId: v.string(),
  companyName: v.string(),
  sector: v.string(),
  estimatedFleetSize: v.number(),
  country: v.string(),
  contactName: v.string(),
  contactEmail: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  stage: v.union(v.literal('discovery'), v.literal('demo'), v.literal('negotiation'), v.literal('won'), v.literal('lost')),
  lostReason: v.optional(v.string()),
  demoOrgId: v.optional(v.id('organizations')),
  realOrgId: v.optional(v.id('organizations')),
  notes: v.optional(v.string()),
  lastActivityAt: v.number(),
  createdAt: v.number()
})
  .index('by_sales', ['salesUserId'])
  .index('by_stage', ['salesUserId', 'stage'])
  .index('by_demo_org', ['demoOrgId'])
```

### 4.4 Chat Commercial ↔ Concierge

Tables `salesConciergeThreads` + `salesConciergeMessages` :
```typescript
salesConciergeThreads: defineTable({
  organizationId: v.optional(v.id('organizations')),
  prospectId: v.optional(v.id('salesProspects')),
  salesUserId: v.string(),
  conciergeUserIds: v.array(v.string()),
  lastMessageAt: v.number(),
  unreadBySales: v.boolean(),
  unreadByConcierge: v.boolean()
})
  .index('by_sales', ['salesUserId'])
  .index('by_org', ['organizationId']),

salesConciergeMessages: defineTable({
  threadId: v.id('salesConciergeThreads'),
  authorId: v.string(),
  authorRole: v.union(v.literal('sales'), v.literal('concierge'), v.literal('super_admin')),
  content: v.string(),
  taggedEntityId: v.optional(v.string()),
  taggedEntityName: v.optional(v.string()),
  createdAt: v.number()
})
  .index('by_thread', ['threadId'])
```

### 4.5 Agent Commercial IA (Agent 7)

**Accès :** FAB sur toutes les pages `/sales/*` + onglet `/sales/agent`

**Capacités :**
- **Signaux de timing** : "Bouygues Immo s'est connectée hier soir à 21h, démo expire J-2 → appeler maintenant"
- **Préparation d'appel** : Brief complet (contact, usage démo, hooks recommandés, objections probables)
- **Détection upsell** : "Delipap utilise 48/50 sièges → fenêtre idéale pour Pro"
- **Génération de contenu** : emails de relance, réponses aux objections, résumés post-appel

**Outils disponibles pour l'agent :**
```typescript
getMyPipeline()            // Tous ses prospects + statuts
getDemoActivity(demoId)    // Activité prospect dans sa démo
getClientHealthSignals()   // Signaux upsell clients convertis
getProspectNotes(prospectId)
generateFollowUpEmail(prospectId, context)
createProspectNote(prospectId, content)
```

### 4.6 Gamification

**Défis hebdomadaires** (3 par commercial, assignés chaque lundi) :
| Difficulté | Exemple | Points |
|------------|---------|--------|
| 🟢 Facile | Connecter 2 prospects à leur démo | 50 pts |
| 🟡 Moyen | Créer 3 nouvelles démos prospects | 150 pts |
| 🔴 Hard | Convertir 1 prospect en client payant | 500 pts |

**Streaks :** 1 action commerciale/jour ouvré (note, appel loggé, message, démo créée)

**Badges permanents :**
| Badge | Condition |
|-------|-----------|
| 🥇 Première Conversion | Premier prospect converti |
| 🚀 Demo Launcher | 10 démos créées |
| ⚡ Speed Deal | Conversion < 7 jours après démo |
| 🏆 Revenue King | 100k€ ARR généré |
| 🔥 Unstoppable | Streak 42 jours |

**Niveaux :** Prospecteur → Chasseur → Négociateur → Closer → Elite (5 niveaux, 0–40k+ pts)

**Tables :**
```typescript
salesGamification: defineTable({
  salesUserId: v.string(),
  totalPoints: v.number(),
  level: v.number(),
  currentStreakDays: v.number(),
  longestStreakDays: v.number(),
  lastActivityDate: v.string(),     // YYYY-MM-DD
  weeklyPoints: v.number(),
  monthlyPoints: v.number()
}).index('by_user', ['salesUserId']),

salesBadges: defineTable({
  salesUserId: v.string(),
  badgeId: v.string(),
  earnedAt: v.number(),
  context: v.optional(v.string())
}).index('by_user', ['salesUserId']),

salesChallenges: defineTable({
  salesUserId: v.string(),
  weekStartDate: v.string(),
  challenges: v.array(v.object({
    id: v.string(),
    title: v.string(),
    difficulty: v.union(v.literal('easy'), v.literal('medium'), v.literal('hard')),
    targetValue: v.number(),
    currentValue: v.number(),
    points: v.number(),
    completed: v.boolean(),
    completedAt: v.optional(v.number())
  }))
}).index('by_user_and_week', ['salesUserId', 'weekStartDate']),

salesSignals: defineTable({
  salesUserId: v.string(),
  prospectId: v.optional(v.id('salesProspects')),
  organizationId: v.optional(v.id('organizations')),
  type: v.union(
    v.literal('demo_login'), v.literal('demo_expiring'), v.literal('demo_expired'),
    v.literal('upsell_seat_limit'), v.literal('upsell_feature_request'),
    v.literal('churn_risk'), v.literal('renewal_approaching')
  ),
  title: v.string(),
  body: v.string(),
  priority: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
  readAt: v.optional(v.number()),
  dismissedAt: v.optional(v.number()),
  createdAt: v.number()
})
  .index('by_sales', ['salesUserId'])
  .index('by_sales_unread', ['salesUserId', 'readAt'])
```

---

## 5. Schéma Technique Consolidé

### Tables nouvelles (dans l'ordre de dépendance)

```
Sprint Commercial A (P31-P32) :
  conciergeTickets         → Inbox unifiée

Sprint Commercial B (P33-P34-P36) :
  demoVehiclePositions     → Positions simulées démo
  demoAccessTokens         → Liens magiques démo
  salesProspects           → Pipeline commercial
  salesConciergeThreads    → Chat commercial↔concierge
  salesConciergeMessages   → Messages chat
  + extensions organizations (isDemo, demoConfig)
  + extension myceliumStaff staffRole: 'sales'

Sprint Commercial C (P35-P37) :
  salesGamification        → Points, streaks, niveaux
  salesBadges              → Badges permanents
  salesChallenges          → Défis hebdomadaires
  salesSignals             → Signaux upsell/churn
```

### Règles multi-tenancy

Toutes les tables ont `organizationId` ou `salesUserId`/`conciergeUserId` pour l'isolation. Aucune donnée client n'est accessible au rôle `sales` directement — uniquement via les queries spécifiques `sales.*`.

### Guards

```typescript
// /concierge/* — concierge + super_admin
conciergeQuery / conciergeMutation

// /sales/* — sales + super_admin
salesQuery / salesMutation       ← à créer (pattern identique à concierge)

// Super admin seulement
superAdminQuery / superAdminMutation
```

---

## 6. Roadmap Unifiée

### Sprint Commercial A (4–5 jours)

- **P31** — Sidebar admin simplifiée (10 → 6 sections, onglets)
- **P32** — Inbox concierge unifiée (`conciergeTickets` + UI 3 colonnes + SLA)

### Sprint Commercial B (8–10 jours)

- **P33** — Fleet Observer + Client 360 (5 onglets `/concierge/[orgId]`)
- **P34** — Comptes démo fondation (schema + wizard + générateur flotte 7 templates)
- **P36** — Espace Sales fondation (layout mobile + pipeline + chat concierge)

### Sprint Commercial C (8–10 jours)

- **P35** — Démo simulation & conversion (engine + modale blocker + dashboard + emails)
- **P37** — Sales gamification & Agent Commercial IA

---

## 7. KPIs de Succès Global

| Métrique | Axe | Cible M+3 |
|----------|-----|-----------|
| Démos créées/mois | Commercial | 20+ |
| Taux de conversion démo → payant | Commercial | >25% |
| Délai moyen avant conversion | Commercial | < 10 jours |
| Temps de première réponse concierge | Concierge | < 1h (99th pctile) |
| % tickets résolus dans SLA | Concierge | >85% |
| DAU commerciaux sur /sales | Commercial | >80% des sales actifs/j |
| Taux completion défis hebdo | Commercial | >60% |
| Satisfaction post-ticket | Concierge | >80% 😊 |
| Nombre de routes admin sidebar | UX | ≤ 6 (vs 10 actuel) |
| Sessions Fleet Observer/semaine/concierge | Concierge | >10 |

---

*Specs détaillées par domaine : `demo-accounts.md` · `sales-role.md` · `ux-reorganisation-admin-concierge.md`*
*Prompts d'implémentation : P31 → P37 dans `docs/prompts/`*
