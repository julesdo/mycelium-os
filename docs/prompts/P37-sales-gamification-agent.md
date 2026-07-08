---
priority: 37
feature: Sales gamification + Agent Commercial IA (Agent 7) + signaux upsell
sprint: Commercial S3
version: V3 — Commercial
effort: 4–5 jours
depends_on: P36 (espace sales fondations), P33 (Fleet Observer pour les signaux client)
blocks: —
model_recommended: claude-sonnet-5 (Agent Commercial IA)
pricing_tier: outil interne commercial
---

# P37 — Sales Gamification & Agent Commercial IA

## 🎯 Mission

Ce prompt ferme la boucle commerciale avec deux features clés :

1. **Système de gamification** — Défis hebdomadaires personnalisés, streaks quotidiens, badges permanents, leaderboard, 5 niveaux de progression. Crée des comportements commerciaux vertueux et de l'émulation saine.

2. **Agent Commercial IA (Agent 7)** — Sixième homme du commercial. Connaît son pipe, ses démos, les signaux client. Aide à prioriser, préparer les appels, détecter les upsells, et générer du contenu. Pattern SSE identique aux agents existants (Concierge P03, Manager P07, Optimizer P10).

**Ce que ce prompt livre :**
- Tables `salesGamification` + `salesBadges` + `salesChallenges` + `salesSignals`
- Page `/sales/challenges` — défis + leaderboard + badges
- Crons : streaks quotidien, défis hebdomadaire, détection signaux
- `httpAction POST /api/sales/agent` — SSE streaming Agent Commercial IA
- Proxy SvelteKit `/api/sales/[...path]`
- FAB Agent Commercial sur toutes les pages `/sales/*`

---

## 📍 État actuel du codebase

**Pattern agent IA existant (à répliquer) :**
- `src/lib/convex/concierge.ts` — Agent Concierge (P03)
- `src/lib/convex/manager.ts` — Agent Manager (P07)
- `httpAction` + SSE streaming + boucle agentique + système prompt
- Proxy SvelteKit dans `src/routes/api/concierge/+server.ts`

**Crons existants dans `crons.ts` :**
- Pattern `crons.daily`, `crons.weekly`, `crons.interval` — réutiliser

**Composant chat existant :**
- `src/lib/components/concierge/ConciergeChat.svelte` — bulle SSE streaming
- Réutiliser le pattern (streaming, tool_call indicators, markdown)

---

## 🔒 Contraintes absolues

1. **Agent Commercial read-only sur données client** — les outils de l'agent peuvent appeler `listMyProspects`, `getDemoActivity`, mais jamais les queries `vehicles.*` ou données flotte directement. L'agent opère dans le périmètre du commercial uniquement.
2. **Streaks non punitifs** — un streak brisé remet le compteur à 0 silencieusement, sans notification négative. Pas de "vous avez perdu votre streak".
3. **Défis personnalisés** — le cron hebdomadaire analyse le pipe du commercial pour générer 3 défis adaptés (pas des défis génériques identiques pour tous).
4. **Pas de données réelles client dans les prompts LLM** — l'agent peut recevoir des statistiques agrégées (nombre de réservations, taux d'utilisation) mais jamais des noms de salariés ou des données financières détaillées des clients.
5. **SSE streaming** — l'agent doit streamer sa réponse caractère par caractère (même pattern que P03/P07).

---

## 📊 Schema changes requises

```typescript
// src/lib/convex/schema.ts — ajouter

salesGamification: defineTable({
  salesUserId: v.string(),
  totalPoints: v.number(),
  level: v.number(),                      // 1–5
  currentStreakDays: v.number(),
  longestStreakDays: v.number(),
  lastActivityDate: v.string(),           // YYYY-MM-DD (pour calcul streak)
  weeklyPoints: v.number(),
  monthlyPoints: v.number(),
  weekResetAt: v.number(),
  monthResetAt: v.number()
})
  .index('by_user', ['salesUserId'])
  .index('by_weekly_points', ['weeklyPoints']),    // pour leaderboard

salesBadges: defineTable({
  salesUserId: v.string(),
  badgeId: v.string(),
  earnedAt: v.number(),
  context: v.optional(v.string())         // ex: "Converti Bouygues Immo"
})
  .index('by_user', ['salesUserId']),

salesChallenges: defineTable({
  salesUserId: v.string(),
  weekStartDate: v.string(),              // ISO YYYY-MM-DD du lundi
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

salesSignals: defineTable({
  salesUserId: v.string(),
  prospectId: v.optional(v.id('salesProspects')),
  organizationId: v.optional(v.id('organizations')),
  type: v.union(
    v.literal('demo_login'),
    v.literal('demo_expiring'),
    v.literal('demo_expired'),
    v.literal('upsell_seat_limit'),
    v.literal('upsell_feature_request'),
    v.literal('churn_risk'),
    v.literal('renewal_approaching')
  ),
  title: v.string(),
  body: v.string(),
  priority: v.union(v.literal('low'), v.literal('medium'), v.literal('high')),
  readAt: v.optional(v.number()),
  dismissedAt: v.optional(v.number()),
  createdAt: v.number()
})
  .index('by_sales', ['salesUserId'])
  .index('by_sales_and_priority', ['salesUserId', 'priority'])
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/schema.ts                            → MODIFIER : 4 nouvelles tables

src/lib/convex/sales/gamification.ts                → CRÉER : queries/mutations points/streaks/badges
src/lib/convex/sales/challenges.ts                  → CRÉER : génération défis + progression
src/lib/convex/sales/signals.ts                     → CRÉER : détection signaux upsell/churn
src/lib/convex/sales/agent.ts                       → CRÉER : httpAction SSE Agent Commercial

src/lib/convex/crons.ts                             → MODIFIER : + 4 crons sales

src/routes/[[lang]]/sales/challenges/+page.svelte   → CRÉER : défis + leaderboard + badges
src/routes/api/sales/[...path]/+server.ts           → CRÉER : proxy SvelteKit → Convex httpAction
src/lib/components/sales/SalesAgentFab.svelte       → CRÉER : FAB Agent Commercial
src/routes/[[lang]]/sales/+layout.svelte            → MODIFIER : ajouter SalesAgentFab
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Gamification (`sales/gamification.ts`)

```typescript
// src/lib/convex/sales/gamification.ts
import { v } from 'convex/values';
import { salesQuery, salesMutation } from '../functions';
import { internalMutation } from '../_generated/server';

const LEVEL_THRESHOLDS = [0, 1000, 5000, 15000, 40000]; // seuils niveaux 1–5

function computeLevel(totalPoints: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalPoints >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return Math.min(level, 5);
}

export const getMyGamification = salesQuery({
  args: {},
  handler: async (ctx) => {
    const gam = await ctx.db.query('salesGamification')
      .withIndex('by_user', (q) => q.eq('salesUserId', ctx.user.userId))
      .first();
    if (!gam) return {
      totalPoints: 0, level: 1, currentStreakDays: 0, longestStreakDays: 0,
      weeklyPoints: 0, monthlyPoints: 0
    };
    return gam;
  }
});

export const getMyBadges = salesQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('salesBadges')
      .withIndex('by_user', (q) => q.eq('salesUserId', ctx.user.userId))
      .collect();
  }
});

export const getLeaderboard = salesQuery({
  args: {},
  handler: async (ctx) => {
    const allGam = await ctx.db.query('salesGamification')
      .withIndex('by_weekly_points')
      .order('desc')
      .take(20);

    return allGam.map((g, i) => ({
      rank: i + 1,
      salesUserId: g.salesUserId,
      weeklyPoints: g.weeklyPoints,
      level: g.level,
      isMe: g.salesUserId === ctx.user.userId
    }));
  }
});

export const recordActivity = salesMutation({
  args: { activityType: v.string() }, // 'note', 'demo_created', 'prospect_added', etc.
  handler: async (ctx, { activityType }) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const gam = await ctx.db.query('salesGamification')
      .withIndex('by_user', (q) => q.eq('salesUserId', ctx.user.userId))
      .first();

    if (!gam) {
      await ctx.db.insert('salesGamification', {
        salesUserId: ctx.user.userId,
        totalPoints: 0, level: 1,
        currentStreakDays: 1, longestStreakDays: 1,
        lastActivityDate: today,
        weeklyPoints: 0, monthlyPoints: 0,
        weekResetAt: Date.now(), monthResetAt: Date.now()
      });
      return;
    }

    // Mise à jour streak
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = gam.currentStreakDays;
    if (gam.lastActivityDate === yesterday) {
      newStreak += 1;
    } else if (gam.lastActivityDate !== today) {
      newStreak = 1; // reset discret (pas de notification)
    }

    await ctx.db.patch(gam._id, {
      currentStreakDays: newStreak,
      longestStreakDays: Math.max(newStreak, gam.longestStreakDays),
      lastActivityDate: today
    });
  }
});

// Appelé par les crons et mutations internes pour ajouter des points
export const addPoints = internalMutation({
  args: { salesUserId: v.string(), points: v.number(), reason: v.string() },
  handler: async (ctx, { salesUserId, points }) => {
    const gam = await ctx.db.query('salesGamification')
      .withIndex('by_user', (q) => q.eq('salesUserId', salesUserId))
      .first();

    if (!gam) return;

    const newTotal = gam.totalPoints + points;
    await ctx.db.patch(gam._id, {
      totalPoints: newTotal,
      level: computeLevel(newTotal),
      weeklyPoints: gam.weeklyPoints + points,
      monthlyPoints: gam.monthlyPoints + points
    });
  }
});

// Vérifie et attribue des badges
export const checkAndAwardBadges = internalMutation({
  args: { salesUserId: v.string() },
  handler: async (ctx, { salesUserId }) => {
    const [gam, badges, prospects] = await Promise.all([
      ctx.db.query('salesGamification').withIndex('by_user', (q) => q.eq('salesUserId', salesUserId)).first(),
      ctx.db.query('salesBadges').withIndex('by_user', (q) => q.eq('salesUserId', salesUserId)).collect(),
      ctx.db.query('salesProspects').withIndex('by_sales', (q) => q.eq('salesUserId', salesUserId)).collect()
    ]);

    if (!gam) return;
    const earnedIds = new Set(badges.map((b) => b.badgeId));

    const toAward: Array<{ id: string; context?: string }> = [];

    const wonCount = prospects.filter((p) => p.stage === 'won').length;
    if (wonCount >= 1 && !earnedIds.has('first_conversion')) toAward.push({ id: 'first_conversion', context: 'Première conversion !' });

    const demoCount = prospects.filter((p) => p.demoOrgId).length;
    if (demoCount >= 10 && !earnedIds.has('demo_launcher')) toAward.push({ id: 'demo_launcher', context: `${demoCount} démos créées` });

    if (gam.currentStreakDays >= 42 && !earnedIds.has('unstoppable')) toAward.push({ id: 'unstoppable', context: '42 jours de streak !' });

    for (const badge of toAward) {
      await ctx.db.insert('salesBadges', {
        salesUserId,
        badgeId: badge.id,
        earnedAt: Date.now(),
        context: badge.context
      });
    }
  }
});
```

### Étape 2 — Défis hebdomadaires (`sales/challenges.ts`)

```typescript
// src/lib/convex/sales/challenges.ts
import { v } from 'convex/values';
import { salesQuery, salesMutation } from '../functions';
import { internalMutation } from '../_generated/server';

export const getMyCurrentChallenges = salesQuery({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split('T')[0];
    const monday = getMonday(today);
    return await ctx.db.query('salesChallenges')
      .withIndex('by_user_and_week', (q) => q.eq('salesUserId', ctx.user.userId).eq('weekStartDate', monday))
      .first();
  }
});

function getMonday(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

// Génération de défis personnalisés basée sur l'état du pipeline
export const generateWeeklyChallengesForUser = internalMutation({
  args: { salesUserId: v.string() },
  handler: async (ctx, { salesUserId }) => {
    const today = new Date().toISOString().split('T')[0];
    const monday = getMonday(today);

    // Éviter les doublons
    const existing = await ctx.db.query('salesChallenges')
      .withIndex('by_user_and_week', (q) => q.eq('salesUserId', salesUserId).eq('weekStartDate', monday))
      .first();
    if (existing) return;

    // Analyser le pipeline pour personnaliser
    const prospects = await ctx.db.query('salesProspects')
      .withIndex('by_sales', (q) => q.eq('salesUserId', salesUserId))
      .collect();

    const demoCount = prospects.filter((p) => p.stage === 'demo').length;
    const inactiveDemos = prospects.filter((p) =>
      p.stage === 'demo' && p.lastActivityAt < Date.now() - 5 * 86400000
    ).length;

    // 3 défis : 1 facile, 1 moyen, 1 difficile (personnalisés)
    const challenges = [
      {
        id: 'easy_note',
        title: 'Prise de notes active',
        description: 'Ajouter une note sur 2 prospects existants',
        difficulty: 'easy' as const,
        targetValue: 2,
        currentValue: 0,
        points: 50,
        completed: false
      },
      inactiveDemos > 0
        ? {
            id: 'medium_reactivate',
            title: 'Réactiver les prospects',
            description: `Faire revenir ${Math.min(inactiveDemos, 3)} prospects inactifs sur leur démo`,
            difficulty: 'medium' as const,
            targetValue: Math.min(inactiveDemos, 3),
            currentValue: 0,
            points: 150,
            completed: false
          }
        : {
            id: 'medium_demos',
            title: 'Créer des démos',
            description: 'Créer 2 nouvelles démos prospects',
            difficulty: 'medium' as const,
            targetValue: 2,
            currentValue: 0,
            points: 150,
            completed: false
          },
      {
        id: 'hard_conversion',
        title: 'Conversion de la semaine',
        description: 'Convertir 1 prospect en client payant',
        difficulty: 'hard' as const,
        targetValue: 1,
        currentValue: 0,
        points: 500,
        completed: false
      }
    ];

    await ctx.db.insert('salesChallenges', { salesUserId, weekStartDate: monday, challenges });
  }
});
```

### Étape 3 — Signaux upsell (`sales/signals.ts`)

```typescript
// src/lib/convex/sales/signals.ts
import { v } from 'convex/values';
import { salesQuery, salesMutation } from '../functions';
import { internalMutation, internalAction } from '../_generated/server';
import { internal } from '../_generated/api';

export const listMySignals = salesQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('salesSignals')
      .withIndex('by_sales', (q) => q.eq('salesUserId', ctx.user.userId))
      .filter((q) => q.eq(q.field('dismissedAt'), undefined))
      .order('desc')
      .take(20);
  }
});

export const dismissSignal = salesMutation({
  args: { signalId: v.id('salesSignals') },
  handler: async (ctx, { signalId }) => {
    const signal = await ctx.db.get(signalId);
    if (!signal || signal.salesUserId !== ctx.user.userId) return;
    await ctx.db.patch(signalId, { dismissedAt: Date.now() });
  }
});

// Appel depuis /concierge/[orgId] onglet Signaux (P33)
export const createSignalFromConcierge = internalMutation({
  args: {
    salesUserId: v.string(),
    organizationId: v.id('organizations'),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    priority: v.union(v.literal('low'), v.literal('medium'), v.literal('high'))
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('salesSignals', {
      ...args as any,
      createdAt: Date.now()
    });
  }
});

// Détecte les signaux sur les orgs converties (cron quotidien)
export const detectUpsellSignals = internalAction({
  args: {},
  handler: async (ctx) => {
    // Récupérer les orgs non-démo avec un commercial assigné
    const prospects = await ctx.runQuery(internal.sales.signals.getWonProspectsWithSales, {});

    for (const prospect of prospects) {
      if (!prospect.realOrgId || !prospect.salesUserId) continue;

      // Check quota sièges
      const org = await ctx.runQuery(internal.sales.signals.getOrgPlanInfo, { orgId: prospect.realOrgId });
      if (!org) continue;

      const seatsUsed = org.seatsUsed ?? 0;
      const seatsIncluded = org.seatsIncluded ?? 50;

      if (seatsUsed >= seatsIncluded * 0.9) {
        await ctx.runMutation(internal.sales.signals.createSignalFromConcierge, {
          salesUserId: prospect.salesUserId,
          organizationId: prospect.realOrgId,
          type: 'upsell_seat_limit',
          title: `${org.name} — Quota presque atteint`,
          body: `${seatsUsed}/${seatsIncluded} sièges utilisés. Fenêtre idéale pour proposer le plan supérieur.`,
          priority: 'high'
        });
      }
    }
  }
});

export const getWonProspectsWithSales = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('salesProspects')
      .filter((q) => q.eq(q.field('stage'), 'won'))
      .collect();
  }
});

export const getOrgPlanInfo = internalMutation({
  args: { orgId: v.id('organizations') },
  handler: async (ctx, { orgId }) => {
    const org = await ctx.db.get(orgId);
    if (!org) return null;
    const members = await ctx.db.query('organizationMembers')
      .withIndex('by_org', (q) => q.eq('organizationId', orgId))
      .collect();
    return { name: org.name, seatsUsed: members.length, seatsIncluded: org.seatsIncluded ?? 50 };
  }
});
```

### Étape 4 — Crons dans `crons.ts`

```typescript
// Dans src/lib/convex/crons.ts, ajouter :

// Streaks : quotidien 23h55 UTC
crons.daily('updateSalesStreaks', { hourUTC: 23, minuteUTC: 55 }, internal.sales.gamification.checkDailyStreaks, {});

// Défis hebdomadaires : lundi 7h UTC
crons.weekly('generateWeeklySalesChallenges', { dayOfWeek: 'monday', hourUTC: 7 }, internal.sales.challenges.generateAllWeeklyChallenges, {});

// Signaux upsell : quotidien 6h UTC
crons.daily('detectSalesUpsellSignals', { hourUTC: 6, minuteUTC: 30 }, internal.sales.signals.detectUpsellSignals, {});

// Reset points hebdo : lundi 0h UTC
crons.weekly('resetWeeklySalesPoints', { dayOfWeek: 'monday', hourUTC: 0 }, internal.sales.gamification.resetWeeklyPoints, {});
```

### Étape 5 — Agent Commercial IA (`sales/agent.ts`)

```typescript
// src/lib/convex/sales/agent.ts
// Pattern identique à concierge.ts et manager.ts

import { httpAction } from '../_generated/server';
import { internal } from '../_generated/api';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SALES_AGENT_SYSTEM_PROMPT = `Tu es l'Agent Commercial de Mycelium Fleet OS — le sixième homme de l'équipe commerciale.

Tu connais le pipeline du commercial, l'état de ses démos en cours, et les signaux de ses clients. Tu l'aides à :
- Prioriser ses actions du jour (timing signals)
- Préparer ses appels et RDV (brief contextuel)
- Détecter les opportunités d'upsell et de rétention
- Rédiger des emails de relance personnalisés

Règles absolues :
- Tu n'as JAMAIS accès aux données flotte opérationnelles des clients (réservations, véhicules, incidents)
- Tu n'affiches jamais de noms de salariés clients, seulement des métriques agrégées
- Tu réponds en français par défaut, en anglais si le commercial écrit en anglais
- Tu es concis, direct, actionnable. Pas de texte inutile.
- Chaque recommandation est justifiée par une donnée concrète (ex: "Marie D. s'est connectée hier soir à 21h")`;

const SALES_TOOLS: Anthropic.Tool[] = [
  {
    name: 'getMyPipeline',
    description: 'Récupère tous les prospects du commercial avec leur statut, template de démo, et dernière activité.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'getDemoActivity',
    description: 'Récupère l\'activité d\'un prospect sur sa démo (logins, pages visitées, temps passé).',
    input_schema: {
      type: 'object',
      properties: { demoOrgId: { type: 'string', description: 'ID de l\'org démo' } },
      required: ['demoOrgId']
    }
  },
  {
    name: 'getMySignals',
    description: 'Liste les signaux non lus (upsell, relance, churn risk) pour le commercial.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'createProspectNote',
    description: 'Ajoute une note à un prospect (résumé d\'appel, next step, etc.).',
    input_schema: {
      type: 'object',
      properties: {
        prospectId: { type: 'string' },
        note: { type: 'string', description: 'Contenu de la note' }
      },
      required: ['prospectId', 'note']
    }
  }
];

export const salesAgentChat = httpAction(async (ctx, request) => {
  // Vérification auth + staffRole sales
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return new Response('Non autorisé', { status: 401 });

  const body = await request.json();
  const { messages, salesUserId } = body;

  const responseBody = new ReadableStream({
    async start(controller) {
      const encode = (text: string) => new TextEncoder().encode(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);

      try {
        let iteration = 0;
        let currentMessages = [...messages];

        while (iteration < 8) {
          iteration++;
          const response = await client.messages.create({
            model: 'claude-sonnet-5-20251101',
            max_tokens: 1024,
            system: SALES_AGENT_SYSTEM_PROMPT,
            tools: SALES_TOOLS,
            messages: currentMessages,
            stream: true
          });

          let hasToolUse = false;
          const toolCalls: Anthropic.ToolUseBlock[] = [];
          let textContent = '';

          for await (const chunk of response) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text;
              textContent += text;
              controller.enqueue(encode(text));
            }
            if (chunk.type === 'content_block_start' && chunk.content_block.type === 'tool_use') {
              hasToolUse = true;
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'tool_call', name: chunk.content_block.name })}\n\n`));
            }
            if (chunk.type === 'content_block_stop') {
              // Collect tool calls
            }
            if (chunk.type === 'message_stop') break;
          }

          if (!hasToolUse) break;

          // Exécuter les outils (lecture only)
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const tool of toolCalls) {
            let result = '';
            if (tool.name === 'getMyPipeline') {
              const prospects = await ctx.runQuery(internal.sales.prospects.listMyProspects, { salesUserId });
              result = JSON.stringify(prospects);
            } else if (tool.name === 'getMySignals') {
              const signals = await ctx.runQuery(internal.sales.signals.listMySignals, { salesUserId });
              result = JSON.stringify(signals);
            } else if (tool.name === 'createProspectNote') {
              await ctx.runMutation(internal.sales.prospects.addProspectNote, {
                salesUserId,
                prospectId: (tool.input as any).prospectId,
                note: (tool.input as any).note
              });
              result = 'Note ajoutée avec succès';
            }
            toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: result });
          }

          currentMessages = [...currentMessages, { role: 'assistant', content: textContent }, { role: 'user', content: toolResults }];
        }
      } catch (e) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'error', content: 'Erreur agent' })}\n\n`));
      } finally {
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      }
    }
  });

  return new Response(responseBody, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    }
  });
});
```

### Étape 6 — Page `/sales/challenges/+page.svelte`

```svelte
<script lang="ts">
  import { useQuery } from '@mmailaender/convex-svelte';
  import { api } from '$lib/convex/_generated/api';
  import { Badge } from '$lib/components/ui/badge';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gam = useQuery((api as any)['sales/gamification'].getMyGamification, {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const badges = useQuery((api as any)['sales/gamification'].getMyBadges, {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const challenges = useQuery((api as any)['sales/challenges'].getMyCurrentChallenges, {});
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leaderboard = useQuery((api as any)['sales/gamification'].getLeaderboard, {});

  const LEVELS = ['Prospecteur', 'Chasseur', 'Négociateur', 'Closer', 'Elite'];
  const BADGE_CONFIG: Record<string, { emoji: string; label: string }> = {
    first_conversion: { emoji: '🥇', label: 'Première Conversion' },
    demo_launcher: { emoji: '🚀', label: 'Demo Launcher' },
    speed_deal: { emoji: '⚡', label: 'Speed Deal' },
    revenue_king: { emoji: '🏆', label: 'Revenue King' },
    unstoppable: { emoji: '🔥', label: 'Unstoppable' },
    team_player: { emoji: '🤝', label: 'Team Player' },
    pipeline_pro: { emoji: '💎', label: 'Pipeline Pro' },
    global_closer: { emoji: '🌍', label: 'Global Closer' }
  };

  const DIFFICULTY_COLOR: Record<string, string> = {
    easy: 'text-emerald-500',
    medium: 'text-amber-500',
    hard: 'text-red-500'
  };
</script>

<div class="p-4 space-y-5 max-w-lg mx-auto">
  <!-- Niveau + streak -->
  {#if gam.data}
    <div class="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
      style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)">
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      <div class="flex items-center justify-between mb-3">
        <div>
          <span class="text-xs text-muted-foreground uppercase tracking-wide">Niveau {gam.data.level}</span>
          <p class="text-base font-bold">{LEVELS[gam.data.level - 1] ?? 'Elite'}</p>
        </div>
        <div class="text-right">
          <p class="text-2xl font-bold text-orange-500">🔥 {gam.data.currentStreakDays}j</p>
          <p class="text-[10px] text-muted-foreground">Streak actuel</p>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            class="h-full bg-[var(--brand)] transition-all"
            style="width: {Math.min(100, (gam.data.weeklyPoints / 500) * 100)}%"
          ></div>
        </div>
        <span class="text-xs font-medium text-muted-foreground tabular-nums">
          {gam.data.weeklyPoints} pts cette semaine
        </span>
      </div>
    </div>
  {/if}

  <!-- Défis de la semaine -->
  <div>
    <h2 class="text-sm font-semibold mb-3">Défis de la semaine</h2>
    {#if challenges.data?.challenges}
      <div class="space-y-3">
        {#each challenges.data.challenges as challenge}
          {@const progress = Math.min(1, challenge.currentValue / challenge.targetValue)}
          <div class="relative overflow-hidden rounded-xl border border-border bg-card p-4 {challenge.completed ? 'opacity-75' : ''}"
            style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)">
            <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <div class="flex items-start justify-between gap-2 mb-2">
              <div>
                <p class="text-sm font-medium {challenge.completed ? 'line-through text-muted-foreground' : ''}">{challenge.title}</p>
                <p class="text-xs text-muted-foreground">{challenge.description}</p>
              </div>
              <div class="shrink-0 text-right">
                <p class="text-sm font-bold text-amber-500">+{challenge.points} pts</p>
                <p class="text-[10px] {DIFFICULTY_COLOR[challenge.difficulty]} capitalize">{challenge.difficulty}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <div class="h-full bg-[var(--brand)] transition-all" style="width: {progress * 100}%"></div>
              </div>
              <span class="text-[11px] font-medium tabular-nums text-muted-foreground">
                {challenge.currentValue}/{challenge.targetValue}
              </span>
              {#if challenge.completed}
                <span class="text-emerald-500">✓</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="rounded-xl border border-border bg-muted/30 p-6 text-center">
        <p class="text-sm text-muted-foreground">Défis générés chaque lundi matin.</p>
      </div>
    {/if}
  </div>

  <!-- Badges -->
  {#if (badges.data ?? []).length > 0}
    <div>
      <h2 class="text-sm font-semibold mb-3">Badges obtenus</h2>
      <div class="flex flex-wrap gap-2">
        {#each badges.data ?? [] as badge}
          {@const cfg = BADGE_CONFIG[badge.badgeId] ?? { emoji: '🏅', label: badge.badgeId }}
          <div class="relative overflow-hidden rounded-xl border border-border bg-card px-3 py-2 flex items-center gap-2"
            style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)">
            <span class="text-xl">{cfg.emoji}</span>
            <span class="text-xs font-medium">{cfg.label}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Leaderboard -->
  {#if (leaderboard.data ?? []).length > 1}
    <div>
      <h2 class="text-sm font-semibold mb-3">Classement de la semaine</h2>
      <div class="rounded-xl border border-border overflow-hidden">
        {#each (leaderboard.data ?? []).slice(0, 5) as entry}
          <div class="flex items-center gap-3 px-4 py-2.5 {entry.isMe ? 'bg-[var(--brand)]/5 font-medium' : ''} border-b border-border/60 last:border-0">
            <span class="text-sm font-bold w-5 text-center {entry.rank <= 3 ? 'text-amber-500' : 'text-muted-foreground'}">
              {entry.rank <= 3 ? ['🥇','🥈','🥉'][entry.rank - 1] : entry.rank}
            </span>
            <span class="flex-1 text-sm">{entry.isMe ? 'Vous' : `Commercial #${entry.rank}`}</span>
            <span class="text-sm font-bold text-amber-500">{entry.weeklyPoints} pts</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
```

### Étape 7 — Proxy SvelteKit + FAB Agent

```typescript
// src/routes/api/sales/[...path]/+server.ts
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch, params }) => {
  const path = params.path;
  const convexUrl = `${import.meta.env.VITE_CONVEX_URL}/api/sales/${path}`;
  return fetch(convexUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...Object.fromEntries(request.headers) },
    body: await request.text()
  });
};
```

**FAB Agent** (`SalesAgentFab.svelte`) — même pattern que `CopilotFab.svelte` mais endpoint `/api/sales/agent`. Ajouter dans le layout `/sales/+layout.svelte` après `{@render children()}`.

---

## ✅ Critères d'acceptation

- [ ] Tables `salesGamification`, `salesBadges`, `salesChallenges`, `salesSignals` créées
- [ ] `recordActivity` met à jour le streak (incrémente si jour consécutif, reset si gap)
- [ ] Streak brisé → reset silencieux, aucune notification "perdu"
- [ ] Page `/sales/challenges` affiche les 3 défis de la semaine avec barre de progression
- [ ] Leaderboard classe par `weeklyPoints` (desc), `isMe` mis en surbrillance
- [ ] `generateWeeklyChallengesForUser` ne crée pas de doublons si appelé deux fois le même lundi
- [ ] Cron `generateWeeklySalesChallenges` s'exécute le lundi à 7h UTC
- [ ] `detectUpsellSignals` crée un signal `upsell_seat_limit` si sièges > 90%
- [ ] Agent Commercial SSE stream la réponse caractère par caractère
- [ ] L'agent ne retourne jamais de données flotte opérationnelles des clients
- [ ] FAB Agent visible sur toutes les pages `/sales/*`
- [ ] Glass-metal sur toutes les cards (pattern obligatoire)

---

## 🚫 NE PAS FAIRE

- Ne pas appeler les queries `vehicles.*`, `reservations.*` depuis l'Agent Commercial — son périmètre est strictement `sales.*`
- Ne pas envoyer de données personnelles de salariés clients dans le prompt système de l'agent
- Ne pas créer une notification "Vous avez perdu votre streak" — reset discret uniquement
- Ne pas faire du drag-and-drop sur les défis — statique dans ce sprint
- Ne pas générer plus de 3 défis par semaine — la lisibilité prime sur l'exhaustivité
- Ne pas utiliser `useQuery` dans un `$derived` ou une fonction — appels uniquement au top-level
- Ne pas implémenter les emails de challenge dans ce sprint — ce sera un sprint E ultérieur
