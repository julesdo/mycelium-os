---
priority: 36
feature: Espace /sales — rôle sales + layout mobile-first + pipeline prospects + chat concierge
sprint: Commercial S2
version: V3 — Commercial
effort: 4 jours
depends_on: P27 (dashboard concierge multi-org, pour le pattern staffRole)
blocks: P37
model_recommended: — (UI mobile-first, pas de LLM dans ce prompt)
pricing_tier: outil interne commercial
---

# P36 — Espace Sales — Fondations

## 🎯 Mission

Les commerciaux n'ont pas leur place dans `/admin` (outil client) ni dans `/concierge` (outil opérationnel). Ce prompt crée le troisième espace — **`/sales`** — avec un nouveau `staffRole: 'sales'`, un layout mobile-first avec bottom tab bar, le pipeline de prospects Kanban/liste, et le chat bidirectionnel avec les concierges.

**Ce que ce prompt livre :**
- Extension `myceliumStaff.staffRole` → `'sales'` (+ système d'invitation identique au concierge)
- Tables `salesProspects` + `salesConciergeThreads` + `salesConciergeMessages`
- Layout `/sales` — bottom tab bar (mobile) / sidebar (desktop ≥ 1024px)
- Page `/sales` — Accueil avec pipeline résumé et défi en cours
- Page `/sales/pipeline` — Vue Kanban (5 colonnes) + liste mobile
- Page `/sales/chat` — Threads avec concierges
- Guard server-side pour `/sales/*`

**Ce prompt ne livre PAS :**
- La gamification (P37)
- L'Agent Commercial IA (P37)
- Les signaux upsell (P37)

---

## 📍 État actuel du codebase

**Pattern staffRole existant :**
```typescript
// Dans schema.ts :
myceliumStaff: defineTable({
  userId: v.string(),
  staffRole: v.union(v.literal('super_admin'), v.literal('concierge')),  // ← ajouter 'sales'
  ...
})

// Guards disponibles :
conciergeQuery, conciergeMutation    // concierge + super_admin
superAdminQuery, superAdminMutation  // super_admin uniquement

// Il faut créer :
salesQuery, salesMutation            // sales + super_admin
```

**Système d'invitation** dans `src/lib/convex/concierge/staff.ts` — réutiliser pour le rôle sales.

**Layout concierge** dans `src/routes/[[lang]]/concierge/+layout.svelte` — s'en inspirer pour le layout sales.

---

## 🔒 Contraintes absolues

1. **Isolation complète** — le commercial ne voit jamais les données flotte des clients. Ses queries sont scopées à `salesUserId`. Il ne peut pas appeler les queries `organizations.*` ou `vehicles.*` directement.
2. **Mobile-first** — touch targets min 44×44px, safe area iOS `env(safe-area-inset-bottom)`, bottom tab bar fixe sur mobile.
3. **Guard server-side** — `/sales/+layout.server.ts` doit vérifier le JWT Better Auth et le `staffRole`. Pas de guard uniquement client-side.
4. **Pas de duplication de code wizard démo** — `/sales/demos/new` est un lien vers le wizard de P34 (même composant, accessible depuis `/sales` avec guard sales).
5. **Glass-metal sur toutes les cards** — `relative overflow-hidden` + inset shadow + gradient-top, identique au reste de Mycelium.

---

## 📊 Schema changes requises

### Extension `myceliumStaff`

```typescript
// src/lib/convex/schema.ts — modifier staffRole :
staffRole: v.union(
  v.literal('super_admin'),
  v.literal('concierge'),
  v.literal('sales')          // ← nouveau
)
```

### Nouvelles tables

```typescript
// src/lib/convex/schema.ts — ajouter après salesChallenges (ou avant)

salesProspects: defineTable({
  salesUserId: v.string(),
  companyName: v.string(),
  sector: v.string(),
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
  demoOrgId: v.optional(v.id('organizations')),
  realOrgId: v.optional(v.id('organizations')),
  notes: v.optional(v.string()),
  lastActivityAt: v.number(),
  createdAt: v.number()
})
  .index('by_sales', ['salesUserId'])
  .index('by_stage', ['salesUserId', 'stage'])
  .index('by_demo_org', ['demoOrgId']),

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
  .index('by_thread_and_time', ['threadId', 'createdAt'])
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/schema.ts                               → MODIFIER : staffRole + 3 nouvelles tables
src/lib/convex/functions.ts                            → MODIFIER : ajouter salesQuery + salesMutation
src/lib/convex/sales/prospects.ts                      → CRÉER : CRUD prospects + pipeline
src/lib/convex/sales/chat.ts                           → CRÉER : threads + messages sales↔concierge

src/routes/[[lang]]/sales/+layout.svelte               → CRÉER : layout mobile-first
src/routes/[[lang]]/sales/+layout.server.ts            → CRÉER : guard server-side
src/routes/[[lang]]/sales/+page.svelte                 → CRÉER : accueil briefing
src/routes/[[lang]]/sales/pipeline/+page.svelte        → CRÉER : Kanban/liste prospects
src/routes/[[lang]]/sales/pipeline/[id]/+page.svelte   → CRÉER : fiche prospect détaillée
src/routes/[[lang]]/sales/chat/+page.svelte            → CRÉER : liste threads
src/routes/[[lang]]/sales/chat/[threadId]/+page.svelte → CRÉER : thread individuel

src/lib/components/sales/ProspectCard.svelte           → CRÉER : carte prospect mobile
src/lib/components/sales/StageColumn.svelte            → CRÉER : colonne kanban
src/lib/components/sales/SalesChatBubble.svelte        → CRÉER : bulle de message
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Guards `salesQuery` + `salesMutation`

```typescript
// src/lib/convex/functions.ts — ajouter après conciergeQuery/conciergeMutation

import { customQuery, customMutation } from 'convex-helpers/server/customFunctions';

export const salesQuery = customQuery(query, {
  args: {},
  input: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError('Non authentifié');
    const user = await ctx.db.query('myceliumStaff')
      .filter((q) => q.eq(q.field('userId'), identity.subject))
      .first();
    if (!user || (user.staffRole !== 'sales' && user.staffRole !== 'super_admin')) {
      throw new ConvexError('Accès réservé à l\'équipe commerciale');
    }
    return { ctx: { ...ctx, user, staffRole: user.staffRole } };
  }
});

export const salesMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError('Non authentifié');
    const user = await ctx.db.query('myceliumStaff')
      .filter((q) => q.eq(q.field('userId'), identity.subject))
      .first();
    if (!user || (user.staffRole !== 'sales' && user.staffRole !== 'super_admin')) {
      throw new ConvexError('Accès réservé à l\'équipe commerciale');
    }
    return { ctx: { ...ctx, user, staffRole: user.staffRole } };
  }
});
```

### Étape 2 — Guard server-side `/sales/+layout.server.ts`

```typescript
// src/routes/[[lang]]/sales/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, params }) => {
  const lang = params.lang ?? '';
  const session = locals.session; // Better Auth session
  if (!session?.user) {
    throw redirect(307, `/${lang}/signin?return_to=/${lang}/sales`);
  }
  // La vérification du staffRole 'sales' est faite par salesQuery/salesMutation côté Convex
  // Le layout se charge de rediriger si pas auth, Convex gère l'autorisation fine
  return { userId: session.user.id };
};
```

### Étape 3 — Queries/mutations prospects (`sales/prospects.ts`)

```typescript
// src/lib/convex/sales/prospects.ts
import { v } from 'convex/values';
import { salesQuery, salesMutation } from '../functions';

export const listMyProspects = salesQuery({
  args: { stage: v.optional(v.string()) },
  handler: async (ctx, { stage }) => {
    let prospects = await ctx.db.query('salesProspects')
      .withIndex('by_sales', (q) => q.eq('salesUserId', ctx.user.userId))
      .order('desc')
      .collect();
    if (stage) {
      prospects = prospects.filter((p) => p.stage === stage);
    }
    return prospects;
  }
});

export const getProspect = salesQuery({
  args: { prospectId: v.id('salesProspects') },
  handler: async (ctx, { prospectId }) => {
    const prospect = await ctx.db.get(prospectId);
    if (!prospect) return null;
    if (prospect.salesUserId !== ctx.user.userId && ctx.staffRole !== 'super_admin') {
      return null; // isolation par commercial
    }
    return prospect;
  }
});

export const createProspect = salesMutation({
  args: {
    companyName: v.string(),
    sector: v.string(),
    estimatedFleetSize: v.number(),
    country: v.string(),
    contactName: v.string(),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    notes: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('salesProspects', {
      ...args,
      salesUserId: ctx.user.userId,
      stage: 'discovery',
      lastActivityAt: Date.now(),
      createdAt: Date.now()
    });
  }
});

export const updateProspectStage = salesMutation({
  args: {
    prospectId: v.id('salesProspects'),
    stage: v.union(
      v.literal('discovery'), v.literal('demo'), v.literal('negotiation'),
      v.literal('won'), v.literal('lost')
    ),
    lostReason: v.optional(v.string())
  },
  handler: async (ctx, { prospectId, stage, lostReason }) => {
    const prospect = await ctx.db.get(prospectId);
    if (!prospect || prospect.salesUserId !== ctx.user.userId) throw new Error('Prospect non trouvé');
    await ctx.db.patch(prospectId, { stage, lostReason, lastActivityAt: Date.now() });
  }
});

export const addProspectNote = salesMutation({
  args: { prospectId: v.id('salesProspects'), note: v.string() },
  handler: async (ctx, { prospectId, note }) => {
    const prospect = await ctx.db.get(prospectId);
    if (!prospect || prospect.salesUserId !== ctx.user.userId) throw new Error('Prospect non trouvé');
    const currentNotes = prospect.notes ?? '';
    const timestamp = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    await ctx.db.patch(prospectId, {
      notes: `[${timestamp}] ${note}\n\n${currentNotes}`.trim(),
      lastActivityAt: Date.now()
    });
  }
});
```

### Étape 4 — Layout `/sales/+layout.svelte`

```svelte
<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { localizedHref } from '$lib/utils/i18n';
  import { cn } from '$lib/utils.js';
  import type { Snippet } from 'svelte';
  import Logo from '$lib/components/icons/logo.svelte';
  import HomeIcon from '@lucide/svelte/icons/home';
  import ListIcon from '@lucide/svelte/icons/layout-list';
  import TrophyIcon from '@lucide/svelte/icons/trophy';
  import MessageCircleIcon from '@lucide/svelte/icons/message-circle';

  let { children }: { children: Snippet } = $props();

  const NAV_TABS = [
    { href: localizedHref('/sales'), label: 'Accueil', icon: HomeIcon, match: /\/sales\/?$/ },
    { href: localizedHref('/sales/pipeline'), label: 'Pipeline', icon: ListIcon, match: /\/sales\/pipeline/ },
    { href: localizedHref('/sales/challenges'), label: 'Défis', icon: TrophyIcon, match: /\/sales\/challenges/ },
    { href: localizedHref('/sales/chat'), label: 'Chat', icon: MessageCircleIcon, match: /\/sales\/chat/ }
  ];

  const currentPath = $derived(page.url.pathname);
</script>

<div class="flex h-screen flex-col overflow-hidden bg-background">
  <!-- Topbar minimal -->
  <header class="flex h-[56px] shrink-0 items-center justify-between border-b border-border px-4">
    <a href={resolve(localizedHref('/sales'))} class="flex items-center gap-2">
      <span class="flex size-7 items-center justify-center rounded-lg bg-[var(--brand)]"
        style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.25)">
        <Logo class="size-7 text-[var(--brand-foreground)]" />
      </span>
      <span class="text-sm font-semibold">Sales</span>
    </a>
    <!-- Notifications icon (placeholder pour P37) -->
    <button type="button" class="size-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
      <svg class="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    </button>
  </header>

  <!-- Contenu principal (avec padding-bottom pour la bottom nav mobile) -->
  <main class="flex-1 overflow-auto pb-[calc(env(safe-area-inset-bottom)+56px)] lg:pb-0">
    {@render children()}
  </main>

  <!-- Bottom tab bar (mobile) -->
  <nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm lg:hidden"
    style="padding-bottom: env(safe-area-inset-bottom)">
    <div class="flex items-center justify-around h-14">
      {#each NAV_TABS as tab}
        {@const isActive = tab.match.test(currentPath)}
        <a
          href={resolve(tab.href)}
          class="flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center transition-colors
            {isActive ? 'text-[var(--brand-foreground)]' : 'text-muted-foreground'}"
        >
          <tab.icon class="size-5 {isActive ? 'opacity-100' : 'opacity-60'}" />
          <span class="text-[10px] font-medium">{tab.label}</span>
        </a>
      {/each}
    </div>
  </nav>

  <!-- Sidebar (desktop ≥ 1024px) -->
  <aside class="fixed left-0 top-[56px] bottom-0 w-56 border-r border-border bg-background hidden lg:flex flex-col">
    <nav class="p-2 space-y-0.5">
      {#each NAV_TABS as tab}
        {@const isActive = tab.match.test(currentPath)}
        <a
          href={resolve(tab.href)}
          class={cn(
            'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all',
            isActive
              ? 'topbar-nav-pill-active'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
          )}
        >
          <tab.icon class="size-4" />
          {tab.label}
        </a>
      {/each}
    </nav>
    <!-- Lien démonstration -->
    <div class="mt-auto p-2 border-t border-border">
      <a href={resolve(localizedHref('/sales/demos/new'))}
        class="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-[var(--brand-foreground)] transition-colors hover:opacity-90 min-h-[44px]"
        style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.25)">
        + Nouvelle démo
      </a>
    </div>
  </aside>

  <!-- Décalage sidebar desktop -->
  <style>
    @media (min-width: 1024px) {
      main { margin-left: 14rem; }
    }
  </style>
</div>
```

### Étape 5 — Page accueil `/sales/+page.svelte`

```svelte
<script lang="ts">
  import { useQuery } from '@mmailaender/convex-svelte';
  import { api } from '$lib/convex/_generated/api';
  import { resolve } from '$app/paths';
  import { localizedHref } from '$lib/utils/i18n';
  import { Button } from '$lib/components/ui/button';
  import PlusIcon from '@lucide/svelte/icons/plus';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prospects = useQuery((api as any)['sales/prospects'].listMyProspects, {});

  const pipelineSummary = $derived.by(() => {
    const data = prospects.data ?? [];
    return {
      demos: data.filter((p: any) => p.stage === 'demo').length,
      negotiation: data.filter((p: any) => p.stage === 'negotiation').length,
      wonThisMonth: data.filter((p: any) => p.stage === 'won' &&
        p.lastActivityAt > Date.now() - 30 * 24 * 60 * 60 * 1000).length
    };
  });
</script>

<div class="p-4 space-y-4 max-w-lg mx-auto lg:max-w-none">
  <!-- Salutation -->
  <div class="pt-2">
    <h1 class="text-xl font-semibold">Bonjour 👋</h1>
    <p class="text-sm text-muted-foreground">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
  </div>

  <!-- Pipeline rapide -->
  <div class="relative overflow-hidden rounded-2xl border border-border bg-card p-4 space-y-3"
    style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06), 0 2px 8px oklch(0 0 0 / 0.06)">
    <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
    <h2 class="text-sm font-semibold">Pipeline</h2>
    <div class="grid grid-cols-3 gap-3">
      {#each [
        { label: 'Démos actives', value: pipelineSummary.demos, color: 'text-amber-500' },
        { label: 'En négociation', value: pipelineSummary.negotiation, color: 'text-blue-500' },
        { label: 'Gagnés ce mois', value: pipelineSummary.wonThisMonth, color: 'text-emerald-500' }
      ] as stat}
        <div class="text-center">
          <p class="text-2xl font-bold {stat.color}">{stat.value}</p>
          <p class="text-[11px] text-muted-foreground">{stat.label}</p>
        </div>
      {/each}
    </div>
    <a href={resolve(localizedHref('/sales/pipeline'))} class="text-xs text-[var(--brand-foreground)] font-medium hover:underline">
      Voir le pipeline →
    </a>
  </div>

  <!-- Défi en cours (placeholder, P37 le remplira) -->
  <div class="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
    style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)">
    <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
    <div class="flex items-center justify-between mb-3">
      <h2 class="text-sm font-semibold">Défi de la semaine</h2>
      <span class="text-xs text-orange-500 font-medium">🔥 Streak : 0j</span>
    </div>
    <p class="text-xs text-muted-foreground">Démarrez un défi pour suivre votre progression.</p>
    <a href={resolve(localizedHref('/sales/challenges'))} class="text-xs text-[var(--brand-foreground)] font-medium hover:underline mt-2 block">
      Voir les défis →
    </a>
  </div>

  <!-- CTA créer démo -->
  <Button
    href={resolve(localizedHref('/concierge/demos/new'))}
    class="w-full min-h-[44px] bg-[var(--brand)] text-[var(--brand-foreground)]"
    style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.25)"
  >
    <PlusIcon class="size-4 mr-2" />
    Créer une démo prospect
  </Button>
</div>
```

### Étape 6 — Pipeline `/sales/pipeline/+page.svelte`

```svelte
<script lang="ts">
  import { useQuery } from '@mmailaender/convex-svelte';
  import { api } from '$lib/convex/_generated/api';
  import ProspectCard from '$lib/components/sales/ProspectCard.svelte';
  import { Button } from '$lib/components/ui/button';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { resolve } from '$app/paths';
  import { localizedHref } from '$lib/utils/i18n';

  type ViewMode = 'list' | 'kanban';
  let viewMode = $state<ViewMode>('list');

  const STAGES = [
    { id: 'discovery', label: 'Découverte', color: 'text-muted-foreground' },
    { id: 'demo', label: 'Démo en cours', color: 'text-amber-500' },
    { id: 'negotiation', label: 'Négociation', color: 'text-blue-500' },
    { id: 'won', label: 'Gagné 🏆', color: 'text-emerald-500' },
    { id: 'lost', label: 'Perdu', color: 'text-red-400' }
  ] as const;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prospects = useQuery((api as any)['sales/prospects'].listMyProspects, {});

  const byStage = $derived.by(() => {
    const data = prospects.data ?? [];
    return Object.fromEntries(STAGES.map((s) => [s.id, data.filter((p: any) => p.stage === s.id)]));
  });
</script>

<div class="flex flex-col h-full">
  <!-- Header -->
  <div class="flex items-center justify-between p-4 border-b border-border">
    <h1 class="text-base font-semibold">Pipeline</h1>
    <div class="flex items-center gap-2">
      <!-- Toggle vue (desktop) -->
      <div class="hidden md:flex rounded-lg border border-border p-0.5 bg-muted/30">
        {#each (['list', 'kanban'] as const) as mode}
          <button
            type="button"
            onclick={() => viewMode = mode}
            class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors
              {viewMode === mode ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}"
          >
            {mode === 'list' ? 'Liste' : 'Kanban'}
          </button>
        {/each}
      </div>
      <Button size="sm" href={resolve(localizedHref('/sales/pipeline/new'))} class="min-h-[44px] md:min-h-[36px] bg-[var(--brand)] text-[var(--brand-foreground)]">
        <PlusIcon class="size-4" />
        <span class="hidden md:inline ml-1.5">Prospect</span>
      </Button>
    </div>
  </div>

  <!-- Vue liste (mobile par défaut) -->
  {#if viewMode === 'list'}
    <div class="flex-1 overflow-y-auto divide-y divide-border/60">
      {#each STAGES as stage}
        {@const stageProspects = byStage[stage.id] ?? []}
        {#if stageProspects.length > 0}
          <div>
            <div class="px-4 py-2 bg-muted/30">
              <span class="text-xs font-semibold {stage.color} uppercase tracking-wide">
                {stage.label} · {stageProspects.length}
              </span>
            </div>
            {#each stageProspects as prospect}
              <ProspectCard {prospect} />
            {/each}
          </div>
        {/if}
      {/each}

      {#if (prospects.data ?? []).length === 0}
        <div class="flex flex-col items-center justify-center py-24 gap-4">
          <p class="text-sm text-muted-foreground">Aucun prospect. Commencez par en ajouter un.</p>
          <Button href={resolve(localizedHref('/sales/pipeline/new'))} class="min-h-[44px] bg-[var(--brand)] text-[var(--brand-foreground)]">
            Ajouter un prospect
          </Button>
        </div>
      {/if}
    </div>

  <!-- Vue Kanban (desktop) -->
  {:else}
    <div class="flex-1 overflow-x-auto">
      <div class="flex gap-4 p-4 min-w-[900px] h-full">
        {#each STAGES as stage}
          {@const stageProspects = byStage[stage.id] ?? []}
          <div class="flex flex-col w-56 shrink-0">
            <div class="flex items-center gap-2 mb-3">
              <span class="text-xs font-semibold {stage.color} uppercase tracking-wide">{stage.label}</span>
              <span class="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {stageProspects.length}
              </span>
            </div>
            <div class="flex-1 space-y-2 overflow-y-auto">
              {#each stageProspects as prospect}
                <ProspectCard {prospect} compact={true} />
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
```

### Étape 7 — `ProspectCard.svelte`

```svelte
<!-- src/lib/components/sales/ProspectCard.svelte -->
<script lang="ts">
  import { resolve } from '$app/paths';
  import { localizedHref } from '$lib/utils/i18n';
  import { Badge } from '$lib/components/ui/badge';
  import BuildingIcon from '@lucide/svelte/icons/building-2';

  let { prospect, compact = false }: { prospect: any; compact?: boolean } = $props();

  const STAGE_BADGE: Record<string, string> = {
    discovery: 'bg-muted text-muted-foreground',
    demo: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    negotiation: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    won: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    lost: 'bg-red-500/10 text-red-500 border-red-500/20'
  };

  const daysAgo = $derived(Math.floor((Date.now() - prospect.lastActivityAt) / 86400000));
</script>

<a
  href={resolve(localizedHref(`/sales/pipeline/${prospect._id}`))}
  class="relative overflow-hidden block rounded-xl border border-border bg-card p-3.5 transition-all hover:border-border/80 hover:shadow-sm min-h-[44px]"
  style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
>
  <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

  <div class="flex items-start justify-between gap-2">
    <div class="min-w-0">
      <p class="text-sm font-semibold truncate">{prospect.companyName}</p>
      {#if !compact}
        <p class="text-xs text-muted-foreground truncate">{prospect.contactName}</p>
        <p class="text-[11px] text-muted-foreground capitalize mt-1">{prospect.sector} · {prospect.estimatedFleetSize} veh. estimés</p>
      {/if}
    </div>
    <Badge class="{STAGE_BADGE[prospect.stage] ?? ''} text-[10px] shrink-0">
      {prospect.stage}
    </Badge>
  </div>

  {#if !compact}
    <div class="mt-2 flex items-center justify-between">
      <span class="text-[10px] text-muted-foreground/60">
        {daysAgo === 0 ? 'Aujourd\'hui' : `Il y a ${daysAgo}j`}
      </span>
    </div>
  {/if}
</a>
```

---

## ✅ Critères d'acceptation

- [ ] `staffRole: 'sales'` ajouté dans le schema `myceliumStaff`
- [ ] Tables `salesProspects`, `salesConciergeThreads`, `salesConciergeMessages` créées
- [ ] Guards `salesQuery` + `salesMutation` fonctionnels (test : appel avec un user non-sales → erreur)
- [ ] Guard server-side `/sales/+layout.server.ts` redirige vers `/signin` si non authentifié
- [ ] Layout `/sales` avec bottom tab bar (mobile) et sidebar (desktop ≥ 1024px)
- [ ] Touch targets ≥ 44px sur tous les éléments interactifs de la bottom nav
- [ ] `env(safe-area-inset-bottom)` appliqué sur la bottom nav (iPhone notch)
- [ ] Page `/sales` affiche le pipeline résumé (3 KPIs) et le placeholder défi
- [ ] Page `/sales/pipeline` affiche les prospects en liste et en kanban (toggle)
- [ ] `ProspectCard` affiche : nom entreprise, stage, contact, secteur, taille flotte, dernière activité
- [ ] `createProspect` crée un prospect lié au `salesUserId` du commercial connecté
- [ ] Un commercial ne peut pas voir les prospects d'un autre commercial
- [ ] Glass-metal sur toutes les cards (`relative overflow-hidden` + inset shadow + gradient-top)

---

## 🚫 NE PAS FAIRE

- Ne pas laisser le commercial accéder aux queries `vehicles.*`, `reservations.*`, `organizations.*` directement
- Ne pas utiliser `useQuery` dans un `$derived` ou une fonction — uniquement au top-level du composant Svelte
- Ne pas créer un système de chat en temps réel avec WebSocket — Convex réactif suffit (`useQuery` sur les messages)
- Ne pas implémenter la gamification dans ce prompt (P37)
- Ne pas implémenter l'Agent Commercial IA dans ce prompt (P37)
- Ne pas créer les signaux upsell dans ce prompt (P37)
- Ne pas oublier `env(safe-area-inset-bottom)` — c'est critique pour l'UX iPhone
- Ne pas faire du Kanban drag-and-drop dans ce sprint — trop complexe, garder pour une iteration future
