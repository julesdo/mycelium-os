# Espace Commercial Mycelium — Spec Produit

> **Objectif :** Donner à nos commerciaux un outil natif Mycelium — mobile-first, temps réel, IA-assisté — pour gérer leur pipe de prospection, piloter leurs démos, communiquer avec les concierges en charge de leurs clients, et progresser grâce à un système de challenges gamifié.

---

## 1. Vision & Positionnement

### Pourquoi un espace dédié

Les commerciaux n'ont pas leur place dans `/admin` (outil client) ni dans `/concierge` (outil opérationnel interne). Ils ont besoin d'un troisième espace — **`/sales`** — taillé pour :

- Un usage **mobile en déplacement** (RDV, salons, télétravail)
- Un accès **centré sur leur portefeuille** (pas sur les opérations flotte)
- Une **collaboration fluide** avec les concierges qui accompagnent leurs clients
- Un **agent IA** qui les aide à prioriser, préparer et saisir les opportunités

### Ce que le commercial ne voit PAS
- Les données flotte des clients (c'est le domaine du concierge)
- Les comptes d'autres commerciaux (sauf super_admin)
- Les outils internes (staff, invitations, config système)

### Rôle technique
Nouveau `staffRole: 'sales'` dans la table `myceliumStaff` — même système d'invitation par lien que concierge et super_admin. Accès limité à `/sales/*`.

---

## 2. Navigation Mobile-First

```
┌─────────────────────────────────┐
│  [Logo]  Mycelium Sales    [🔔] │  ← Topbar minimaliste
├─────────────────────────────────┤
│                                 │
│         [Contenu principal]     │
│                                 │
│                                 │
├─────────────────────────────────┤
│  🏠       📋       🎯       💬  │  ← Bottom nav (tab bar)
│ Accueil Pipeline Défis   Chat   │
└─────────────────────────────────┘
```

**Bottom tab bar fixe (mobile) / sidebar gauche (desktop ≥ 1024px) :**

| Tab | Route | Description |
|-----|-------|-------------|
| 🏠 Accueil | `/sales` | Briefing du jour par l'IA |
| 📋 Pipeline | `/sales/pipeline` | Prospects + clients + démos |
| 🎯 Défis | `/sales/challenges` | Gamification + leaderboard |
| 💬 Chat | `/sales/chat` | Messages avec les concierges |

**Accès secondaires (depuis l'accueil ou profil) :**
- `/sales/demos/new` — Créer une démo prospect
- `/sales/agent` — Conversation libre avec l'Agent Commercial IA
- `/sales/profile` — Profil + stats personnelles

---

## 3. Écran Accueil — Briefing Quotidien

**Philosophie :** L'accueil ne liste pas tout. Il dit au commercial **quoi faire aujourd'hui**.

```
┌─────────────────────────────────┐
│  Bonjour Thomas 👋              │
│  Mardi 7 janvier                │
│                                 │
│  ┌──── Votre focus du jour ───┐ │
│  │ 🤖 Agent Commercial        │ │
│  │ "3 priorités pour vous     │ │
│  │  aujourd'hui :             │ │
│  │  1. Relancer Bouygues Immo │ │
│  │     (démo expire dans 2j)  │ │
│  │  2. Préparer appel 14h     │ │
│  │     avec TotalEnergies     │ │
│  │  3. Delipap vient de       │ │
│  │     dépasser 50 réservations│ │
│  │     → signal upsell Pro"   │ │
│  └────────────────────────────┘ │
│                                 │
│  ┌─── Pipeline rapide ────────┐ │
│  │ 4 démos actives            │ │
│  │ 2 en négociation           │ │
│  │ 1 conversion ce mois       │ │
│  └────────────────────────────┘ │
│                                 │
│  ┌─── Défi en cours ──────────┐ │
│  │ 🔥 Streak : 8 jours        │ │
│  │ Semaine : 2/3 démos créées │ │
│  │ [████████░░] 67%           │ │
│  └────────────────────────────┘ │
│                                 │
│  [+ Créer une démo prospect]    │  ← CTA principal
└─────────────────────────────────┘
```

---

## 4. Pipeline Prospects & Clients

### 4.1 Structure du Pipeline

5 étapes fixes (Kanban horizontal sur desktop, liste avec badges sur mobile) :

```
DÉCOUVERTE → DÉMO EN COURS → NÉGOCIATION → GAGNÉ → PERDU
```

| Étape | Description | Actions disponibles |
|-------|-------------|---------------------|
| **Découverte** | Premier contact, besoin qualifié | Créer démo · Ajouter note · Rappel |
| **Démo en cours** | Compte démo actif | Voir démo · Prolonger · Message concierge |
| **Négociation** | Post-démo, discussion tarif/conditions | Envoyer devis · Escalade super_admin |
| **Gagné** 🏆 | Converti en client payant | Voir compte client · Suivre satisfaction |
| **Perdu** | Archivé avec raison de perte | Réactiver dans 90j · Export feedback |

### 4.2 Carte Prospect (mobile)

```
┌──────────────────────────────────┐
│ 🏢 Bouygues Immobilier           │
│ BTP · 45 véhicules estimés       │
│ Contact : Marie Dupont           │
│                                  │
│ 🟠 DÉMO EN COURS — expire J-2   │
│                                  │
│ ⚡ Signal : dernier login hier   │
│                                  │
│ [Voir démo]  [Message]  [···]    │
└──────────────────────────────────┘
```

**Signaux visuels sur les cartes :**
- 🔴 Démo expire dans < 3 jours
- 🟡 Pas de login prospect depuis > 5 jours
- 🟢 Login prospect aujourd'hui (chaud !)
- ⚡ Signal upsell détecté
- 💬 Nouveau message concierge

### 4.3 Ajouter un Prospect

Formulaire rapide mobile (< 30s) :
- Nom entreprise + secteur
- Nom/prénom contact + tel + email
- Taille flotte estimée
- Pays cible
- Note rapide vocale ou texte (transcription auto via API)
- Optionnel : créer la démo maintenant ou plus tard

### 4.4 Vue Client Converti

Pour les prospects devenus clients, le commercial voit :
- Plan souscrit + date renouvellement
- Nombre de véhicules actifs
- Dernière interaction concierge
- Score de santé client (calculé par l'IA)
- Opportunités d'upsell identifiées (ex : "utilise 48/50 sièges → proche du palier Pro")
- Bouton "Contacter le concierge assigné"

---

## 5. Chat avec les Concierges

### 5.1 Philosophie

Le commercial et le concierge partagent des clients — ils doivent pouvoir se coordonner sans sortir de Mycelium (pas de WhatsApp, pas d'email).

**Ce que le commercial peut faire :**
- Envoyer un message texte à un concierge à propos d'un client spécifique
- Taguer un prospect/client dans un message (`@Bouygues Immo`)
- Recevoir des alertes du concierge ("le client demande une fonctionnalité, c'est une opportunité")
- Voir l'historique des échanges par client

**Ce que le concierge peut faire (côté `/concierge`) :**
- Répondre aux messages du commercial
- Initier une conversation sur un client ("attention, ce client est mécontent")
- Partager des notes d'appel avec le commercial

### 5.2 Structure des Tables

```typescript
// Thread par client/prospect (commercial + concierge(s) assignés)
salesConciergeThreads: defineTable({
  organizationId: v.optional(v.id('organizations')), // null si prospect pas encore converti
  prospectId: v.optional(v.id('salesProspects')),    // lien prospect
  salesUserId: v.string(),                            // commercial
  conciergeUserIds: v.array(v.string()),              // concierges participants
  lastMessageAt: v.number(),
  unreadBySales: v.boolean(),
  unreadByConcierge: v.boolean()
})
  .index('by_sales', ['salesUserId'])
  .index('by_org', ['organizationId'])

// Messages dans un thread
salesConciergeMessages: defineTable({
  threadId: v.id('salesConciergeThreads'),
  authorId: v.string(),
  authorRole: v.union(v.literal('sales'), v.literal('concierge'), v.literal('super_admin')),
  content: v.string(),
  taggedEntityId: v.optional(v.string()),   // ID org/prospect tagué
  taggedEntityName: v.optional(v.string()),
  createdAt: v.number()
})
  .index('by_thread', ['threadId'])
```

### 5.3 UX Chat Mobile

```
┌─────────────────────────────────┐
│  ← Messages          [+ Nouveau]│
│                                 │
│  ┌──────────────────────────┐   │
│  │ 💬 Bouygues Immo         │   │
│  │ Sophie (concierge)       │   │
│  │ "Le client a posé une q…"│   │
│  │                      14h │   │
│  └──────────────────────────┘   │
│                                 │
│  ┌──────────────────────────┐   │
│  │ 💬 Delipap SAS          │   │
│  │ Marc (concierge)         │   │
│  │ "Vous avez regardé le…"  │   │
│  │                     hier │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘

Dans un thread :

│  [Sophie — Concierge]     14:32 │
│  Le client Bouygues vient de    │
│  signaler un problème de sync   │
│  calendrier. J'ai ouvert un     │
│  ticket. À suivre de votre côté │
│  pour le renouvellement.        │
│                                 │
│            [Thomas — Commercial]│
│          Merci, je les rappelle │
│              demain matin 9h 👍 │
│                                 │
│  ┌──────────────────────┐  [➤] │
│  │ Votre message…       │       │
│  └──────────────────────┘       │
```

---

## 6. Agent Commercial IA (Agent 7)

### 6.1 Positionnement

L'Agent Commercial est le **sixième homme** du commercial. Il connaît tout son pipe, les données de ses clients, et l'aide à prioriser, préparer et agir — sans jamais l'exposer à des données flotte opérationnelles.

**Accès depuis :**
- Bouton flottant sur toutes les pages `/sales/*` (même pattern que le Copilot client)
- Onglet dédié `/sales/agent` pour des conversations longues

### 6.2 Capacités

#### Signaux de timing
```
User: "Qui devrais-je rappeler en premier aujourd'hui ?"

Agent: "Je recommande Bouygues Immo en priorité :
— Marie Dupont s'est connectée à la démo hier soir à 21h
  (signe d'intérêt fort, elle explore hors bureau)
— La démo expire dans 2 jours
— Leur démo montre 94% du tableau de bord visité
— Template BTP : leur pain point principal = maintenance préventive
  (2 alertes générées hier dans leur démo)

Script d'appel suggéré : commencez par les 2 alertes de maintenance
qu'ils ont vues — c'est leur douleur immédiate."
```

#### Préparation d'appel / RDV
```
User: "Brief pour mon appel TotalEnergies à 14h"

Agent: "Brief TotalEnergies (15 véhicules estimés, Services B2B) :
— Contact : Jean-Marc Leblanc, DSI
— Démo créée il y a 5 jours, 0 login prospect → relance nécessaire
— Secteur : énergie, forte sensibilité ESG/CSRD
— Hook recommandé : dashboard Scope 1-2-3 + rapport ESRS E1 (différenciateur fort)
— Leur concurrent Fleet XP vient d'être racheté par Arval → incertitude produit
— Prix cible estimé : Essential à 490€/mois (50 conducteurs)
— Objection probable : 'on a déjà Excel' → réponse suggérée : [...]"
```

#### Détection upsell
```
[Notification push]
Agent: "⚡ Signal upsell — Delipap SAS
Ils utilisent 48/50 sièges (palier Essential presque atteint).
Les 2 derniers mois, +18% de réservations.
Fenêtre idéale pour proposer le passage en Professional (+360€/mois).
Voulez-vous que je prépare un email de proposition ?"
```

#### Génération de contenu
- Email de relance personnalisé (ton + accroche adaptés au contexte)
- Réponse à une objection détectée dans les notes
- Résumé post-appel à partir d'une note vocale
- Proposition de valeur customisée par template de flotte

### 6.3 Outils disponibles pour l'Agent

```typescript
// Outils read-only sur le périmètre du commercial
getMyPipeline()           // Tous ses prospects + statuts
getDemoActivity(demoId)   // Activité du prospect dans sa démo
getClientHealthSignals()  // Signaux upsell sur clients convertis
getProspectNotes(prospectId)
getCompetitorIntel()      // Base de connaissance concurrentielle statique
generateFollowUpEmail(prospectId, context)
createProspectNote(prospectId, content)
```

---

## 7. Système de Challenges Gamifié

### 7.1 Philosophie

La gamification n'est pas du gadget — elle structure les bons comportements commerciaux et crée une saine émulation. Elle doit être **motivante, pas punitive**.

### 7.2 Défis Hebdomadaires

Chaque lundi, 3 défis sont assignés (mix de faciles, moyens, ambitieux) :

| Difficulté | Exemple | Points |
|------------|---------|--------|
| 🟢 Facile | Connecter 2 prospects à leur démo cette semaine | 50 pts |
| 🟡 Moyen | Créer 3 nouvelles démos prospects | 150 pts |
| 🔴 Hard | Convertir 1 prospect en client payant | 500 pts |

Les défis sont **personnalisés selon le contexte** :
- Si le commercial a 5 démos actives sans login → défi "Faire revenir 3 prospects"
- Si il a beaucoup de démos expirées → défi "Nettoyer le pipe : 2 décisions go/no-go"
- Si bonne semaine → défi "Challenger" pour pousser plus loin

### 7.3 Streaks

- **Streak actif** = au moins 1 action commerciale par jour ouvré (note, appel loggé, message, démo créée)
- Streak affiché en flamme 🔥 sur l'écran d'accueil
- Paliers : 5j · 10j · 21j · 42j (avec badge spécial)
- Perte de streak → pas de punition, juste reset discret

### 7.4 Badges Permanents

| Badge | Condition | Rare ? |
|-------|-----------|--------|
| 🥇 Première Conversion | Premier prospect converti | Non |
| 🚀 Demo Launcher | 10 démos créées | Non |
| 💎 Pipeline Pro | 5 prospects en Négociation simultanément | Moyen |
| ⚡ Speed Deal | Conversion < 7 jours après démo | Rare |
| 🏆 Revenue King | 100k€ ARR généré cumulé | Rare |
| 🔥 Unstoppable | Streak 42 jours | Très rare |
| 🤝 Team Player | 10 messages concierge utiles (rated by concierge) | Non |
| 🌍 Global Closer | Conversion dans 3 pays différents | Rare |

### 7.5 Leaderboard

Visible dans l'onglet Défis :
- Classement hebdomadaire parmi les commerciaux (prénom + initiale NOM)
- Classement mensuel (cumul de points)
- Son propre rang toujours visible (même hors top 10)
- Médailles podium 🥇🥈🥉 pour les 3 premiers du mois

**Optionnel (activable par super_admin) :**
- Challenge équipe mensuel : "L'équipe atteint 10 conversions → journée offsite"

### 7.6 Niveaux

```
Niveau 1 — Prospecteur    0 – 999 pts
Niveau 2 — Chasseur       1 000 – 4 999 pts
Niveau 3 — Négociateur    5 000 – 14 999 pts
Niveau 4 — Closer         15 000 – 39 999 pts
Niveau 5 — Elite          40 000+ pts
```

Le niveau débloque des **avantages concrets** :
- Niveau 3+ → accès à la préparation d'appel IA avancée
- Niveau 4+ → extension de démo jusqu'à 45 jours (vs 30j par défaut)
- Niveau 5 → badge "Elite" visible sur les messages chat concierge + rapport mensuel dédié du super_admin

---

## 8. Notifications Push Commerciales

Le commercial reçoit des notifications push (PWA) pour :

| Événement | Urgence | Message |
|-----------|---------|---------|
| Prospect connecté à la démo | 🟢 Info | "Marie D. vient de se connecter à la démo Bouygues" |
| Démo expire dans 48h | 🟡 Moyen | "⏰ Démo Delipap expire demain — relancez !" |
| Démo expirée sans conversion | 🔴 Urgent | "Démo Bouygues expirée — décision requise" |
| Signal upsell détecté | 🟡 Moyen | "⚡ Delipap proche du palier Pro" |
| Nouveau message concierge | 🟢 Info | "Sophie : message sur Bouygues Immo" |
| Défi complété | 🎉 Célébration | "Défi 'Créer 3 démos' terminé — +150 pts !" |
| Nouveau record streak | 🔥 Célébration | "10 jours de suite — badge débloqué !" |

---

## 9. Schema Technique

### Nouveaux tables

```typescript
// Prospects dans le pipeline commercial
salesProspects: defineTable({
  salesUserId: v.string(),              // commercial propriétaire
  companyName: v.string(),
  sector: v.string(),                   // template BTP, services, etc.
  estimatedFleetSize: v.number(),
  country: v.string(),
  contactName: v.string(),
  contactEmail: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  stage: v.union(
    v.literal('discovery'),
    v.literal('demo'),
    v.literal('negotiation'),
    v.literal('won'),
    v.literal('lost')
  ),
  lostReason: v.optional(v.string()),
  demoOrgId: v.optional(v.id('organizations')),  // org démo associée
  realOrgId: v.optional(v.id('organizations')),  // org réelle si converti
  notes: v.optional(v.string()),
  lastActivityAt: v.number(),
  createdAt: v.number()
})
  .index('by_sales', ['salesUserId'])
  .index('by_stage', ['salesUserId', 'stage'])
  .index('by_demo_org', ['demoOrgId']),

// Gamification — points et streaks
salesGamification: defineTable({
  salesUserId: v.string(),
  totalPoints: v.number(),
  level: v.number(),                     // 1–5
  currentStreakDays: v.number(),
  longestStreakDays: v.number(),
  lastActivityDate: v.string(),          // YYYY-MM-DD pour calcul streak
  weeklyPoints: v.number(),
  monthlyPoints: v.number(),
  weekResetAt: v.number(),
  monthResetAt: v.number()
})
  .index('by_user', ['salesUserId']),

// Badges gagnés
salesBadges: defineTable({
  salesUserId: v.string(),
  badgeId: v.string(),                   // 'first_conversion', 'demo_launcher', etc.
  earnedAt: v.number(),
  context: v.optional(v.string())        // ex: "Converti Bouygues Immo"
})
  .index('by_user', ['salesUserId']),

// Défis hebdomadaires
salesChallenges: defineTable({
  salesUserId: v.string(),
  weekStartDate: v.string(),             // ISO YYYY-MM-DD du lundi
  challenges: v.array(v.object({
    id: v.string(),
    title: v.string(),
    description: v.string(),
    difficulty: v.union(v.literal('easy'), v.literal('medium'), v.literal('hard')),
    targetValue: v.number(),
    currentValue: v.number(),
    points: v.number(),
    completed: v.boolean(),
    completedAt: v.optional(v.number())
  }))
})
  .index('by_user_and_week', ['salesUserId', 'weekStartDate']),

// Signaux upsell (générés par cron ou concierge)
salesSignals: defineTable({
  salesUserId: v.string(),
  prospectId: v.optional(v.id('salesProspects')),
  organizationId: v.optional(v.id('organizations')),
  type: v.union(
    v.literal('demo_login'),             // prospect actif sur démo
    v.literal('demo_expiring'),          // démo expire bientôt
    v.literal('demo_expired'),           // démo expirée sans conversion
    v.literal('upsell_seat_limit'),      // proche du plafond de sièges
    v.literal('upsell_feature_request'), // client demande feature du plan sup.
    v.literal('churn_risk'),             // faible utilisation client
    v.literal('renewal_approaching')     // renouvellement dans 60j
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

### Modification `myceliumStaff`

```typescript
staffRole: v.union(
  v.literal('super_admin'),
  v.literal('concierge'),
  v.literal('sales')         // ← nouveau rôle
)
```

---

## 10. Routes & Guards

```
/sales                     → salesQuery guard (staffRole === 'sales' || 'super_admin')
/sales/pipeline            → liste prospects par stage
/sales/pipeline/[id]       → fiche prospect détaillée
/sales/demos               → démos actives (vue commercial)
/sales/demos/new           → wizard création démo (même composant que /concierge/demos/new)
/sales/chat                → liste threads avec concierges
/sales/chat/[threadId]     → thread individuel
/sales/challenges          → défis + leaderboard + badges
/sales/agent               → conversation Agent Commercial IA
/sales/profile             → profil + stats + niveaux
```

**Server-side guard** (`/sales/+layout.server.ts`) :
```typescript
const role = decodeJwtRole(locals.token);
if (role !== 'admin') redirect(307, `/${lang}/signin`);
// puis DB check pour staffRole 'sales' ou 'super_admin'
```

---

## 11. Design System — Règles Spécifiques Sales

L'espace Sales utilise exactement les mêmes tokens que `/admin` et `/concierge` :
- `--brand` (jaune Mycelium) pour les CTAs et accents
- `glass-metal` sur toutes les cards (pattern obligatoire)
- `rounded-2xl` pour les cards mobiles
- `shadow-glass-card` systématique

**Spécificités mobile :**
- Touch targets min 44×44px sur tous les éléments interactifs
- Bottom safe area `env(safe-area-inset-bottom)` pour iPhone
- Swipe horizontal sur le Kanban pipeline (iOS-natif feeling)
- Pull-to-refresh sur les listes
- FAB `+` jaune `--brand` en bas à droite (créer prospect/démo)

**Palette gamification :**
- Points : `text-amber-500` (même couleur que `--brand`)
- Streaks : `text-orange-500` + émoji 🔥
- Badges rare : `text-violet-500`
- Succès/conversion : `text-emerald-500`
- Alertes : rouge/orange selon sévérité (patterns existants)

**Composants réutilisés :**
- `Button`, `Badge`, `Card`, `Dialog`, `Input`, `Label`, `Skeleton` — inchangés
- `MetricCard` adapté → `SalesMetricCard` (avec delta semaine/mois)
- Chat : même pattern que `HumanAssistThread.svelte` (bulles gauche/droite)
- Notifications : même `NotificationItem` avec type `sales_signal`

---

## 12. Crons & Automatisations

| Cron | Fréquence | Action |
|------|-----------|--------|
| `checkDemoLogins` | Toutes les 30min | Détecte connexions prospects → signal `demo_login` |
| `checkDemoExpiry` | Quotidien 8h | Génère alertes J-3 et J-0 sur les démos |
| `detectUpsellSignals` | Quotidien 6h | Analyse usage clients → signaux upsell |
| `generateWeeklyChallenges` | Lundi 7h | Génère défis personnalisés par commercial |
| `updateStreaks` | Quotidien 23h55 | Vérifie activité du jour → update streaks |
| `resetWeeklyPoints` | Lundi 0h | Reset `weeklyPoints` + archive leaderboard |
| `agentSalesBriefing` | Quotidien 7h30 | Pré-calcule briefing IA (contexte + priorisation) |

---

## 13. Roadmap d'Implémentation

### Sprint A — Fondations (3 jours)
- [ ] `staffRole: 'sales'` dans schema + guard `/sales`
- [ ] Layout mobile bottom nav
- [ ] Table `salesProspects` + CRUD (pipeline)
- [ ] Vue Pipeline liste + kanban simplifié mobile

### Sprint B — Démos & Chat (2 jours)
- [ ] Réutilisation wizard démo dans `/sales/demos/new`
- [ ] Tables chat + composant fil de discussion
- [ ] Intégration côté `/concierge` (voir messages du commercial)

### Sprint C — Gamification (2 jours)
- [ ] Tables `salesGamification` + `salesBadges` + `salesChallenges`
- [ ] Écran Défis + leaderboard
- [ ] Crons streaks + défis hebdomadaires
- [ ] Notifications push badges/défis

### Sprint D — Agent IA & Signaux (2–3 jours)
- [ ] Table `salesSignals` + crons de détection
- [ ] Agent Commercial (httpAction SSE, outils pipeline read-only)
- [ ] Briefing quotidien pré-calculé
- [ ] Notifications push signaux

### Sprint E — Polish Mobile (1–2 jours)
- [ ] Safe area iOS, pull-to-refresh, swipe pipeline
- [ ] PWA manifest + icons pour add-to-homescreen
- [ ] Tests Playwright `/sales/*`

---

## 14. KPIs de Succès

| Métrique | Cible M+3 |
|----------|-----------|
| DAU commerciaux (mobile) | >80% des sales actifs/jour |
| Temps moyen premier login après création démo | < 48h |
| Taux de completion des défis hebdomadaires | >60% |
| Taux d'utilisation Agent IA | >3 conversations/commercial/semaine |
| Taux de conversion pipe → client (avec outil) | >30% vs baseline |
| NPS commercial interne | >50 |
