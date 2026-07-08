---
priority: 32
feature: Inbox concierge unifiée — tickets + Human Assist + SLA + vue thread 3 colonnes
sprint: Commercial S1
version: V3 — Service Fleet Care
effort: 4 jours
depends_on: P26 (concierge_tasks), P27 (dashboard concierge multi-org)
blocks: P33
model_recommended: — (logique métier, pas d'appel LLM dans ce prompt)
pricing_tier: infrastructure interne — non facturé, sous-tend le service Fleet Care
---

# P32 — Inbox Concierge Unifiée

## 🎯 Mission

Le concierge gère aujourd'hui des communications éparpillées : Human Assist Requests dans la fiche org, tickets support dans `/admin/support`, tâches urgentes dans `concierge_tasks`. Pour gérer 20 clients en parallèle, c'est ingérable.

Ce prompt crée la **page `/concierge/inbox`** : un hub de communication centralisé inspiré de Zendesk, mais dans la DA Mycelium. Toutes les demandes entrantes convergent ici avec priorité automatique, SLA, et vue thread 3 colonnes (desktop) / scroll (mobile).

**Ce que ce prompt livre :**
- Table `conciergeTickets` (unification des sources)
- Page `/concierge/inbox` avec filtres (Toutes / Non assignées / Les miennes)
- Vue thread ticket : fil chronologique + zone réponse + contexte client
- Compteur SLA temps réel (vert/orange/rouge)
- Prise en charge et assignation d'un ticket

**Ce prompt ne construit PAS :**
- Le Fleet Observer (P33)
- La Timeline client (P33)
- L'intégration `salesConciergeThreads` dans l'inbox (P33 aussi)

---

## 📍 État actuel du codebase

**Ce qui existe (à connecter à l'inbox) :**

- `humanAssistRequests` table — demandes d'escalade depuis le Copilot IA (`/app`)
- Tickets support : `/admin/support` (table `supportThreads` dans `src/lib/convex/support/`)
- `concierge_tasks` (P26) — tâches CRITICAL peuvent remonter dans l'inbox
- `conciergeOrgAccess` — contrôle quelles orgs un concierge peut voir

**Ce qui manque :**
- Table unifiée `conciergeTickets` qui agrège tout
- Page `/concierge/inbox` (n'existe pas)
- Notion de SLA / temps de réponse
- Assignation d'un ticket à un concierge spécifique

**Pattern concierge existant :**
```typescript
// Guards Convex disponibles
conciergeQuery    // staffRole === 'concierge' || 'super_admin'
conciergeMutation
superAdminQuery
superAdminMutation

// Helpers auth
import { conciergeQuery, conciergeMutation } from '../functions';
```

---

## 🔒 Contraintes absolues

1. **Isolation multi-tenant** — chaque ticket référence un `organizationId`. Un concierge ne voit que les tickets des orgs qui lui sont assignées (via `conciergeOrgAccess`) sauf super_admin.
2. **Idempotence à la création** — un même `sourceType`+`sourceId` ne génère pas deux tickets ouverts. Vérifier avant insertion.
3. **Pas de suppression des sources** — `conciergeTickets` est une couche d'agrégation. Les `humanAssistRequests` et tickets support restent dans leurs tables d'origine.
4. **SLA non bloquant** — le compteur SLA est informatif. Dépasser le SLA n'empêche pas une action.
5. **Read-only pour les concierges sur orgs non assignées** — si un super_admin voit tous les tickets, un concierge ne voit que ses orgs.

---

## 📊 Schema changes requises

### Nouvelle table `conciergeTickets`

```typescript
// src/lib/convex/schema.ts — ajouter après conciergeOrgAccess

conciergeTickets: defineTable({
  organizationId: v.id('organizations'),
  sourceType: v.union(
    v.literal('HUMAN_ASSIST'),       // humanAssistRequests
    v.literal('SUPPORT_TICKET'),     // supportThreads
    v.literal('CONCIERGE_TASK'),     // concierge_tasks CRITICAL/URGENT
    v.literal('SALES_MESSAGE'),      // salesConciergeThreads (P36)
    v.literal('MANUAL')              // créé directement par un concierge
  ),
  sourceId: v.optional(v.string()),  // _id de la source (string générique)
  status: v.union(
    v.literal('NEW'),
    v.literal('IN_PROGRESS'),
    v.literal('WAITING_CLIENT'),
    v.literal('RESOLVED'),
    v.literal('CLOSED')
  ),
  priority: v.union(
    v.literal('URGENT'),
    v.literal('HIGH'),
    v.literal('NORMAL'),
    v.literal('LOW')
  ),
  title: v.string(),
  summary: v.string(),               // résumé court (1–2 phrases)
  assignedTo: v.optional(v.string()), // Better Auth string ID concierge
  firstResponseAt: v.optional(v.number()),
  resolvedAt: v.optional(v.number()),
  slaDeadline: v.optional(v.number()), // timestamp calculé à la création
  satisfactionEmoji: v.optional(
    v.union(v.literal('good'), v.literal('neutral'), v.literal('bad'))
  ),
  createdAt: v.number(),
  updatedAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_status', ['status', 'priority'])
  .index('by_assigned', ['assignedTo', 'status'])
  .index('by_source', ['sourceType', 'sourceId'])
  .index('by_org_and_status', ['organizationId', 'status'])
```

### Table `conciergeTicketMessages`

```typescript
// Messages dans un ticket (fil de conversation)
conciergeTicketMessages: defineTable({
  ticketId: v.id('conciergeTickets'),
  authorId: v.string(),              // Better Auth user ID
  authorRole: v.union(
    v.literal('concierge'),
    v.literal('super_admin'),
    v.literal('client')              // message venant du client (ORG_ADMIN)
  ),
  content: v.string(),
  attachmentIds: v.optional(v.array(v.string())), // Convex Storage IDs
  isInternal: v.boolean(),           // note interne concierge (non visible client)
  createdAt: v.number()
})
  .index('by_ticket', ['ticketId'])
  .index('by_ticket_and_time', ['ticketId', 'createdAt'])
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/schema.ts                          → ajouter conciergeTickets + conciergeTicketMessages

src/lib/convex/concierge/tickets.ts               → CRÉER : mutations/queries tickets
src/lib/convex/concierge/staff.ts                 → MODIFIER : brancher humanAssistRequests → tickets

src/routes/[[lang]]/concierge/+layout.svelte      → MODIFIER : ajouter entrée "Inbox" dans nav
src/routes/[[lang]]/concierge/inbox/+page.svelte  → CRÉER : page inbox principale
src/routes/[[lang]]/concierge/inbox/[ticketId]/+page.svelte → CRÉER : vue thread

src/lib/components/concierge/TicketRow.svelte     → CRÉER : ligne ticket dans la liste
src/lib/components/concierge/SlaTimer.svelte      → CRÉER : compteur SLA temps réel
src/lib/components/concierge/TicketThread.svelte  → CRÉER : fil de conversation
src/lib/components/concierge/TicketContext.svelte → CRÉER : panneau contexte client (colonne droite)
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Queries/mutations dans `concierge/tickets.ts`

```typescript
// src/lib/convex/concierge/tickets.ts
import { v } from 'convex/values';
import { conciergeQuery, conciergeMutation, superAdminMutation } from '../functions';
import { internal } from '../_generated/api';

// SLA en millisecondes selon priorité
const SLA_FIRST_RESPONSE_MS = {
  URGENT: 15 * 60 * 1000,      // 15 min
  HIGH: 60 * 60 * 1000,         // 1h
  NORMAL: 4 * 60 * 60 * 1000,  // 4h
  LOW: 24 * 60 * 60 * 1000     // 24h
};

export const listInboxTickets = conciergeQuery({
  args: {
    filter: v.union(v.literal('all'), v.literal('unassigned'), v.literal('mine')),
    status: v.optional(v.union(v.literal('NEW'), v.literal('IN_PROGRESS'), v.literal('WAITING_CLIENT'), v.literal('RESOLVED'), v.literal('CLOSED')))
  },
  handler: async (ctx, { filter, status }) => {
    // Concierge : filtre par orgs accessibles
    let allowedOrgIds: Set<string> | null = null;
    if (ctx.staffRole === 'concierge') {
      const accesses = await ctx.db.query('conciergeOrgAccess')
        .withIndex('by_concierge', (q) => q.eq('conciergeUserId', ctx.user._id))
        .collect();
      allowedOrgIds = new Set(accesses.map((a) => a.organizationId));
    }

    let tickets = await ctx.db.query('conciergeTickets')
      .withIndex('by_status')
      .filter((q) => q.neq(q.field('status'), 'CLOSED'))
      .collect();

    if (allowedOrgIds) {
      tickets = tickets.filter((t) => allowedOrgIds!.has(t.organizationId));
    }
    if (status) {
      tickets = tickets.filter((t) => t.status === status);
    }
    if (filter === 'unassigned') {
      tickets = tickets.filter((t) => !t.assignedTo);
    } else if (filter === 'mine') {
      tickets = tickets.filter((t) => t.assignedTo === ctx.user._id);
    }

    // Enrichir avec le nom de l'org
    const orgIds = [...new Set(tickets.map((t) => t.organizationId))];
    const orgs = await Promise.all(orgIds.map((id) => ctx.db.get(id)));
    const orgMap = new Map(orgs.filter(Boolean).map((o) => [o!._id, o!.name]));

    return tickets
      .sort((a, b) => {
        const priorityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
        if (a.priority !== b.priority) return priorityOrder[a.priority] - priorityOrder[b.priority];
        return b.createdAt - a.createdAt;
      })
      .map((t) => ({ ...t, orgName: orgMap.get(t.organizationId) ?? 'Organisation inconnue' }));
  }
});

export const getTicket = conciergeQuery({
  args: { ticketId: v.id('conciergeTickets') },
  handler: async (ctx, { ticketId }) => {
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) return null;

    // Vérification accès
    if (ctx.staffRole === 'concierge') {
      const access = await ctx.db.query('conciergeOrgAccess')
        .withIndex('by_concierge_and_org', (q) =>
          q.eq('conciergeUserId', ctx.user._id).eq('organizationId', ticket.organizationId))
        .first();
      if (!access) return null;
    }

    const org = await ctx.db.get(ticket.organizationId);
    const messages = await ctx.db.query('conciergeTicketMessages')
      .withIndex('by_ticket_and_time', (q) => q.eq('ticketId', ticketId))
      .collect();

    return { ...ticket, orgName: org?.name, messages };
  }
});

export const takeTicket = conciergeMutation({
  args: { ticketId: v.id('conciergeTickets') },
  handler: async (ctx, { ticketId }) => {
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) throw new Error('Ticket introuvable');
    await ctx.db.patch(ticketId, {
      assignedTo: ctx.user._id,
      status: ticket.status === 'NEW' ? 'IN_PROGRESS' : ticket.status,
      updatedAt: Date.now()
    });
  }
});

export const sendTicketMessage = conciergeMutation({
  args: {
    ticketId: v.id('conciergeTickets'),
    content: v.string(),
    isInternal: v.boolean()
  },
  handler: async (ctx, { ticketId, content, isInternal }) => {
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) throw new Error('Ticket introuvable');

    // Si première réponse, enregistrer le timestamp
    if (!ticket.firstResponseAt && !isInternal) {
      await ctx.db.patch(ticketId, {
        firstResponseAt: Date.now(),
        status: 'IN_PROGRESS',
        updatedAt: Date.now()
      });
    }

    await ctx.db.insert('conciergeTicketMessages', {
      ticketId,
      authorId: ctx.user._id,
      authorRole: ctx.staffRole === 'super_admin' ? 'super_admin' : 'concierge',
      content,
      isInternal,
      createdAt: Date.now()
    });
  }
});

export const resolveTicket = conciergeMutation({
  args: {
    ticketId: v.id('conciergeTickets'),
    closingNote: v.optional(v.string())
  },
  handler: async (ctx, { ticketId, closingNote }) => {
    await ctx.db.patch(ticketId, {
      status: 'RESOLVED',
      resolvedAt: Date.now(),
      updatedAt: Date.now()
    });
    if (closingNote) {
      await ctx.db.insert('conciergeTicketMessages', {
        ticketId,
        authorId: ctx.user._id,
        authorRole: ctx.staffRole === 'super_admin' ? 'super_admin' : 'concierge',
        content: closingNote,
        isInternal: true,
        createdAt: Date.now()
      });
    }
  }
});

// Point d'entrée interne — appelé depuis humanAssistRequests, concierge_tasks, etc.
export const upsertTicketFromSource = conciergeMutation({
  // Pour usage interne uniquement via ctx.scheduler.runAfter(0, ...)
  args: {
    organizationId: v.id('organizations'),
    sourceType: v.union(
      v.literal('HUMAN_ASSIST'), v.literal('SUPPORT_TICKET'),
      v.literal('CONCIERGE_TASK'), v.literal('SALES_MESSAGE'), v.literal('MANUAL')
    ),
    sourceId: v.string(),
    title: v.string(),
    summary: v.string(),
    priority: v.union(v.literal('URGENT'), v.literal('HIGH'), v.literal('NORMAL'), v.literal('LOW'))
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('conciergeTickets')
      .withIndex('by_source', (q) => q.eq('sourceType', args.sourceType).eq('sourceId', args.sourceId))
      .filter((q) => q.neq(q.field('status'), 'CLOSED'))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { title: args.title, summary: args.summary, updatedAt: Date.now() });
      return existing._id;
    }

    const slaMs = SLA_FIRST_RESPONSE_MS[args.priority];
    return await ctx.db.insert('conciergeTickets', {
      ...args,
      status: 'NEW',
      slaDeadline: Date.now() + slaMs,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }
});
```

### Étape 2 — Brancher `humanAssistRequests` → inbox

Dans `src/lib/convex/concierge/staff.ts` (ou où `humanAssistRequests` est créé), après l'insertion d'une nouvelle demande Human Assist :

```typescript
// Après await ctx.db.insert('humanAssistRequests', { ... })
await ctx.scheduler.runAfter(0, internal.concierge.tickets.upsertTicketFromSource, {
  organizationId: args.organizationId,
  sourceType: 'HUMAN_ASSIST',
  sourceId: requestId,
  title: `Human Assist — ${args.userName ?? 'Utilisateur'}`,
  summary: args.message?.slice(0, 150) ?? 'Demande d\'assistance',
  priority: 'HIGH'
});
```

### Étape 3 — Page `/concierge/inbox/+page.svelte`

```svelte
<script lang="ts">
  import { useQuery, useMutation } from '@mmailaender/convex-svelte';
  import { api } from '$lib/convex/_generated/api';
  import TicketRow from '$lib/components/concierge/TicketRow.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import InboxIcon from '@lucide/svelte/icons/inbox';

  type Filter = 'all' | 'unassigned' | 'mine';
  let activeFilter = $state<Filter>('all');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tickets = useQuery((api as any)['concierge/tickets'].listInboxTickets, {
    filter: activeFilter
  });

  const urgentCount = $derived(
    (tickets.data ?? []).filter((t) => t.priority === 'URGENT' && t.status === 'NEW').length
  );
</script>

<div class="flex h-full flex-col">
  <!-- Header -->
  <div class="flex items-center justify-between border-b border-border px-6 py-4">
    <div class="flex items-center gap-3">
      <InboxIcon class="size-5 text-muted-foreground" />
      <h1 class="text-lg font-semibold">Inbox</h1>
      {#if urgentCount > 0}
        <Badge class="bg-red-500/10 text-red-500 border-red-500/20">
          {urgentCount} urgent{urgentCount > 1 ? 's' : ''}
        </Badge>
      {/if}
    </div>
    <Button variant="outline" size="sm" href="/concierge/inbox/new">
      Nouveau ticket
    </Button>
  </div>

  <!-- Filtres -->
  <div class="flex gap-0.5 border-b border-border px-6 py-2">
    {#each ([['all', 'Toutes'], ['unassigned', 'Non assignées'], ['mine', 'Les miennes']] as const) as [filter, label]}
      <button
        type="button"
        onclick={() => activeFilter = filter}
        class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {activeFilter === filter ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}"
      >
        {label}
        {#if filter === 'all' && tickets.data}
          <span class="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold">
            {tickets.data.length}
          </span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Liste tickets -->
  <div class="flex-1 overflow-y-auto divide-y divide-border/60">
    {#if tickets.isLoading}
      {#each { length: 5 } as _}
        <div class="animate-pulse p-4 flex gap-3">
          <div class="size-2 mt-2 rounded-full bg-muted shrink-0"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-muted rounded w-3/4"></div>
            <div class="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      {/each}
    {:else if (tickets.data ?? []).length === 0}
      <div class="flex flex-col items-center justify-center py-24 gap-3">
        <InboxIcon class="size-10 text-muted-foreground/40" />
        <p class="text-sm text-muted-foreground">Aucun ticket {activeFilter === 'mine' ? 'assigné' : ''}</p>
      </div>
    {:else}
      {#each tickets.data ?? [] as ticket (ticket._id)}
        <TicketRow {ticket} />
      {/each}
    {/if}
  </div>
</div>
```

### Étape 4 — Composant `TicketRow.svelte`

```svelte
<script lang="ts">
  import { resolve } from '$app/paths';
  import { localizedHref } from '$lib/utils/i18n';
  import SlaTimer from './SlaTimer.svelte';
  import BuildingIcon from '@lucide/svelte/icons/building-2';

  let { ticket }: { ticket: any } = $props();

  const PRIORITY_DOT: Record<string, string> = {
    URGENT: 'bg-red-500',
    HIGH: 'bg-orange-400',
    NORMAL: 'bg-blue-400',
    LOW: 'bg-muted-foreground/40'
  };

  const SOURCE_LABEL: Record<string, string> = {
    HUMAN_ASSIST: 'Human Assist',
    SUPPORT_TICKET: 'Support',
    CONCIERGE_TASK: 'Tâche auto',
    SALES_MESSAGE: 'Commercial',
    MANUAL: 'Manuel'
  };
</script>

<a
  href={resolve(localizedHref(`/concierge/inbox/${ticket._id}`))}
  class="flex items-start gap-3 px-6 py-3.5 transition-colors hover:bg-muted/40"
>
  <!-- Indicateur priorité -->
  <span class="mt-2 size-2 shrink-0 rounded-full {PRIORITY_DOT[ticket.priority] ?? 'bg-muted'}"></span>

  <div class="min-w-0 flex-1 space-y-0.5">
    <div class="flex items-center gap-2">
      <span class="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {SOURCE_LABEL[ticket.sourceType] ?? ticket.sourceType}
      </span>
      <span class="text-muted-foreground/40">·</span>
      <span class="flex items-center gap-1 text-[11px] text-muted-foreground">
        <BuildingIcon class="size-3" />
        {ticket.orgName}
      </span>
    </div>
    <p class="truncate text-sm font-medium text-foreground">{ticket.title}</p>
    <p class="truncate text-xs text-muted-foreground">{ticket.summary}</p>
  </div>

  <div class="shrink-0 flex flex-col items-end gap-1">
    {#if ticket.slaDeadline && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED'}
      <SlaTimer deadline={ticket.slaDeadline} firstResponseAt={ticket.firstResponseAt} />
    {/if}
    {#if !ticket.assignedTo}
      <span class="rounded-md border border-border/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
        Non assigné
      </span>
    {/if}
  </div>
</a>
```

### Étape 5 — Composant `SlaTimer.svelte`

```svelte
<script lang="ts">
  let { deadline, firstResponseAt }: { deadline: number; firstResponseAt?: number } = $props();

  const now = $state(Date.now());
  // Met à jour chaque minute
  $effect(() => {
    const id = setInterval(() => (now = Date.now()), 60_000);
    return () => clearInterval(id);
  });

  const remainingMs = $derived(deadline - now);
  const isBreached = $derived(remainingMs < 0);
  const alreadyResponded = $derived(!!firstResponseAt && firstResponseAt < deadline);

  const label = $derived.by(() => {
    if (alreadyResponded) return null; // SLA respecté, pas d'affichage
    const absMs = Math.abs(remainingMs);
    const mins = Math.floor(absMs / 60_000);
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h`;
  });

  const colorClass = $derived.by(() => {
    if (alreadyResponded || label === null) return '';
    if (isBreached) return 'text-red-500';
    if (remainingMs < 30 * 60_000) return 'text-orange-500';
    return 'text-muted-foreground';
  });
</script>

{#if label !== null}
  <span class="text-[10px] font-medium tabular-nums {colorClass}">
    {isBreached ? '+' : ''}{label}
  </span>
{/if}
```

### Étape 6 — Vue thread `/concierge/inbox/[ticketId]/+page.svelte`

Structure 3 colonnes desktop (fil + réponse + contexte) :

```svelte
<script lang="ts">
  import { page } from '$app/state';
  import { useQuery, useMutation } from '@mmailaender/convex-svelte';
  import { api } from '$lib/convex/_generated/api';
  import TicketThread from '$lib/components/concierge/TicketThread.svelte';
  import TicketContext from '$lib/components/concierge/TicketContext.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Badge } from '$lib/components/ui/badge';
  import { resolve } from '$app/paths';
  import { localizedHref } from '$lib/utils/i18n';

  const ticketId = $derived(page.params.ticketId as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ticket = useQuery((api as any)['concierge/tickets'].getTicket, { ticketId });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const takeTicket = useMutation((api as any)['concierge/tickets'].takeTicket);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sendMessage = useMutation((api as any)['concierge/tickets'].sendTicketMessage);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resolveTicket = useMutation((api as any)['concierge/tickets'].resolveTicket);

  let replyContent = $state('');
  let isInternal = $state(false);
  let sending = $state(false);

  async function handleSend() {
    if (!replyContent.trim() || sending) return;
    sending = true;
    try {
      await sendMessage({ ticketId, content: replyContent.trim(), isInternal });
      replyContent = '';
    } finally {
      sending = false;
    }
  }
</script>

<div class="flex h-full flex-col">
  <!-- Barre titre -->
  <div class="flex items-center gap-3 border-b border-border px-6 py-3.5">
    <a href={resolve(localizedHref('/concierge/inbox'))} class="text-muted-foreground hover:text-foreground">←</a>
    <span class="text-sm font-medium truncate">{ticket.data?.title ?? '…'}</span>
    {#if ticket.data?.status === 'NEW'}
      <Badge class="bg-blue-500/10 text-blue-500 border-blue-500/20 ml-auto">Nouveau</Badge>
      <Button size="sm" onclick={() => takeTicket({ ticketId })}>Prendre en charge</Button>
    {:else if ticket.data?.status === 'IN_PROGRESS'}
      <Badge class="bg-amber-500/10 text-amber-600 border-amber-500/20 ml-auto">En cours</Badge>
      <Button size="sm" variant="outline" onclick={() => resolveTicket({ ticketId })}>Résoudre</Button>
    {/if}
  </div>

  <!-- Corps 3 colonnes -->
  <div class="flex flex-1 overflow-hidden">
    <!-- Fil conversation + zone réponse -->
    <div class="flex flex-1 flex-col overflow-hidden border-r border-border">
      {#if ticket.data}
        <TicketThread messages={ticket.data.messages} />
      {/if}

      <!-- Zone réponse -->
      <div class="border-t border-border p-4 space-y-3">
        <div class="flex gap-2">
          <button
            type="button"
            onclick={() => isInternal = false}
            class="rounded-lg px-3 py-1 text-xs font-medium transition-colors {!isInternal ? 'bg-[var(--brand)]/10 text-[var(--brand-foreground)]' : 'text-muted-foreground hover:text-foreground'}"
          >
            Répondre au client
          </button>
          <button
            type="button"
            onclick={() => isInternal = true}
            class="rounded-lg px-3 py-1 text-xs font-medium transition-colors {isInternal ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}"
          >
            Note interne
          </button>
        </div>
        <Textarea
          bind:value={replyContent}
          placeholder={isInternal ? 'Note visible uniquement par l\'équipe…' : 'Répondre au client…'}
          class="min-h-[80px] resize-none text-sm {isInternal ? 'bg-amber-500/5 border-amber-500/20' : ''}"
        />
        <div class="flex justify-end">
          <Button onclick={handleSend} disabled={!replyContent.trim() || sending}>
            {sending ? 'Envoi…' : 'Envoyer'}
          </Button>
        </div>
      </div>
    </div>

    <!-- Panneau contexte client (desktop uniquement) -->
    <div class="hidden lg:block w-72 shrink-0 overflow-y-auto p-4 space-y-4">
      {#if ticket.data}
        <TicketContext organizationId={ticket.data.organizationId} />
      {/if}
    </div>
  </div>
</div>
```

### Étape 7 — Ajouter "Inbox" dans le layout concierge

Dans `src/routes/[[lang]]/concierge/+layout.svelte`, ajouter dans `navItems` :

```typescript
import InboxIcon from '@lucide/svelte/icons/inbox';

// Dans navItems (avant LayoutListIcon / File de tâches) :
{
  href: localizedHref('/concierge/inbox'),
  label: 'Inbox',
  icon: InboxIcon,
  active: page.url.pathname.includes('/concierge/inbox')
},
```

---

## ✅ Critères d'acceptation

- [ ] Table `conciergeTickets` créée avec tous les index
- [ ] Table `conciergeTicketMessages` créée
- [ ] Une demande Human Assist crée automatiquement un ticket dans `conciergeTickets`
- [ ] Page `/concierge/inbox` accessible par concierge + super_admin
- [ ] Concierge voit uniquement les tickets de ses orgs assignées
- [ ] Filtre "Les miennes" / "Non assignées" / "Toutes" fonctionnel
- [ ] Bouton "Prendre en charge" assigne le ticket au concierge connecté et passe le statut à `IN_PROGRESS`
- [ ] `SlaTimer` affiche rouge si deadline dépassée, orange si < 30min, gris sinon
- [ ] Zone réponse : toggle "Répondre" vs "Note interne" (note interne fond ambré)
- [ ] Vue 3 colonnes sur desktop (fil + réponse + contexte)
- [ ] `TicketContext` affiche au minimum : nom org, plan, concierge(s) assigné(s), lien Fleet Observer (lien placeholder P33)
- [ ] Aucun ticket dupliqué si la même source déclenche `upsertTicketFromSource` deux fois

---

## 🚫 NE PAS FAIRE

- Ne pas remplacer la table `humanAssistRequests` — `conciergeTickets` est une couche d'agrégation par-dessus
- Ne pas appeler `upsertTicketFromSource` de façon bloquante dans une mutation utilisateur — toujours via `ctx.scheduler.runAfter(0, ...)`
- Ne pas afficher les notes internes aux clients ORG_ADMIN (champ `isInternal: true` = invisible côté `/app`)
- Ne pas construire le Fleet Observer ici (P33) — le lien dans `TicketContext` reste un placeholder href
- Ne pas créer un système d'email transactionnel pour les tickets dans ce prompt — livrer la UI d'abord, les emails dans un sprint ultérieur
- Ne pas utiliser `useQuery` à l'intérieur d'un `$derived` ou d'une fonction — appels uniquement au top-level du composant
