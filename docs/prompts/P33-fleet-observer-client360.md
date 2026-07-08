---
priority: 33
feature: Fleet Observer (admin read-only) + Client 360 (5 onglets /concierge/[orgId])
sprint: Commercial S2
version: V3 — Service Fleet Care
effort: 4–5 jours
depends_on: P27 (dashboard concierge), P31 (sidebar), P32 (inbox)
blocks: —
model_recommended: — (composants UI, pas d'appel LLM)
pricing_tier: infrastructure interne — non facturé
---

# P33 — Fleet Observer + Client 360

## 🎯 Mission

Quand un client appelle pour signaler un problème sur une réservation, le concierge est aujourd'hui aveugle — il doit demander des screenshots. Ce prompt change ça radicalement avec deux features liées :

1. **Fleet Observer** — Le concierge peut voir en read-only tout ce que le client voit dans son espace `/admin`, dans un composant intégré à la fiche client. Plus besoin de screenshots.

2. **Client 360** — La page `/concierge/[orgId]` devient un hub à 5 onglets : Vue d'ensemble · Inbox · Fleet Observer · Timeline · Signaux. C'est la fiche client de référence pour tout le service Fleet Care.

**Valeur immédiate :** Réduire le temps de résolution des tickets de 10–15 min à 3–5 min grâce à la visibilité directe sur le compte client.

---

## 📍 État actuel du codebase

**Page `/concierge/[orgId]/+page.svelte` (existante P27) :**
- Affiche KPIs de la org (activité queue, santé)
- `humanAssistThread` si demande active
- Quelques métriques basiques
- Pas d'onglets, pas de Fleet Observer, pas de timeline

**Composants admin existants (cibles du Fleet Observer) :**
- `src/routes/[[lang]]/admin/fleet/+page.svelte` — liste véhicules
- `src/routes/[[lang]]/admin/reservations/+page.svelte` — calendrier + liste
- `src/routes/[[lang]]/admin/maintenance/+page.svelte` — maintenance
- `src/routes/[[lang]]/admin/dashboard/+page.svelte` — KPIs
- Ces pages utilisent `getUserOrg(ctx)` pour l'isolation multi-tenant

**Queries admin utilisées par le Fleet Observer :**
- `api.vehicles.listVehicles` — les vehicles d'une org
- `api.reservations.listReservations` — réservations
- `api.dashboard.getFleetStats` — KPIs
- `api.maintenance.listMaintenance` — entretiens
- Ces queries filtrent par `organizationId` du user connecté — il faut une query staff équivalente avec `organizationId` explicite.

---

## 🔒 Contraintes absolues

1. **Read-only strict** — aucune mutation ne peut être déclenchée depuis Fleet Observer. Les composants admin reçoivent `readonly={true}` et désactivent tous les boutons d'action (créer, modifier, supprimer, import CSV).
2. **Isolation multi-tenant** — le Fleet Observer utilise des queries spécifiques à scope explicite (`organizationId` paramètre) autorisées uniquement par `conciergeQuery`. Un concierge ne peut pas voir une org non assignée.
3. **Pas de duplication de code** — réutiliser les composants visuels admin existants (VehicleTable, FleetCalendar, etc.) via le prop `readonly`. Ne pas réécrire la logique d'affichage.
4. **Timeline non bloquante** — si une source d'événements est absente ou renvoie une erreur, la timeline affiche ce qu'elle a. Pas de hard crash.
5. **Signaux sans effet de bord** — "Alerter le commercial" crée un `salesSignal` (P37) mais n'envoie pas d'email directement dans ce prompt.

---

## 📊 Schema changes requises

### Nouvelle table `clientTimelineEvents`

```typescript
// src/lib/convex/schema.ts — ajouter

clientTimelineEvents: defineTable({
  organizationId: v.id('organizations'),
  type: v.union(
    v.literal('ONBOARDING'),
    v.literal('PLAN_CHANGE'),
    v.literal('INCIDENT'),
    v.literal('MAINTENANCE'),
    v.literal('TICKET_CREATED'),
    v.literal('TICKET_RESOLVED'),
    v.literal('PAYMENT'),
    v.literal('ALERT_COMPLIANCE'),
    v.literal('CONCIERGE_NOTE')    // note manuelle du concierge
  ),
  title: v.string(),
  description: v.optional(v.string()),
  severity: v.optional(v.union(v.literal('info'), v.literal('warning'), v.literal('critical'))),
  sourceId: v.optional(v.string()),  // _id de l'entité source
  createdBy: v.optional(v.string()), // staffUserId si manuel
  occurredAt: v.number()             // timestamp réel de l'événement
})
  .index('by_org', ['organizationId'])
  .index('by_org_and_time', ['organizationId', 'occurredAt'])
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/schema.ts                                → ajouter clientTimelineEvents

src/lib/convex/concierge/fleetObserver.ts              → CRÉER : queries admin avec orgId explicite
src/lib/convex/concierge/timeline.ts                   → CRÉER : query getTimeline + mutation addNote

src/routes/[[lang]]/concierge/[orgId]/+page.svelte     → MODIFIER : 5 onglets hub Client 360
src/lib/components/concierge/FleetObserver.svelte      → CRÉER : wrapper read-only des composants admin
src/lib/components/concierge/ClientTimeline.svelte     → CRÉER : timeline chronologique
src/lib/components/concierge/ClientSignals.svelte      → CRÉER : onglet signaux upsell/churn
src/lib/components/concierge/OrgOverview.svelte        → CRÉER : vue d'ensemble KPIs (tab 1)
src/lib/components/concierge/ClientInboxTab.svelte     → CRÉER : tickets liés à l'org (tab 2)
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Queries Fleet Observer (`concierge/fleetObserver.ts`)

```typescript
// src/lib/convex/concierge/fleetObserver.ts
import { v } from 'convex/values';
import { conciergeQuery } from '../functions';

// Helper : vérifie que le concierge a accès à l'org
async function assertConciergeOrgAccess(
  ctx: any,
  organizationId: string
) {
  if (ctx.staffRole === 'super_admin') return; // accès total
  const access = await ctx.db.query('conciergeOrgAccess')
    .withIndex('by_concierge_and_org', (q: any) =>
      q.eq('conciergeUserId', ctx.user._id).eq('organizationId', organizationId))
    .first();
  if (!access) throw new Error('Accès refusé à cette organisation');
}

export const getOrgVehicles = conciergeQuery({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, { organizationId }) => {
    await assertConciergeOrgAccess(ctx, organizationId);
    return await ctx.db.query('vehicles')
      .withIndex('by_org', (q) => q.eq('organizationId', organizationId))
      .collect();
  }
});

export const getOrgReservations = conciergeQuery({
  args: { organizationId: v.id('organizations'), limit: v.optional(v.number()) },
  handler: async (ctx, { organizationId, limit }) => {
    await assertConciergeOrgAccess(ctx, organizationId);
    const reservations = await ctx.db.query('reservations')
      .withIndex('by_org', (q) => q.eq('organizationId', organizationId))
      .order('desc')
      .take(limit ?? 50);
    return reservations;
  }
});

export const getOrgFleetStats = conciergeQuery({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, { organizationId }) => {
    await assertConciergeOrgAccess(ctx, organizationId);
    const vehicles = await ctx.db.query('vehicles')
      .withIndex('by_org', (q) => q.eq('organizationId', organizationId))
      .collect();
    const total = vehicles.length;
    const available = vehicles.filter((v) => v.status === 'AVAILABLE').length;
    const inUse = vehicles.filter((v) => v.status === 'IN_USE').length;
    const maintenance = vehicles.filter((v) => v.status === 'MAINTENANCE').length;
    return { total, available, inUse, maintenance, utilizationRate: total > 0 ? Math.round((inUse / total) * 100) : 0 };
  }
});

export const getOrgMaintenanceRecords = conciergeQuery({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, { organizationId }) => {
    await assertConciergeOrgAccess(ctx, organizationId);
    return await ctx.db.query('maintenanceRecords')
      .withIndex('by_org', (q) => q.eq('organizationId', organizationId))
      .filter((q) => q.eq(q.field('status'), 'SCHEDULED'))
      .order('asc')
      .take(20);
  }
});
```

### Étape 2 — Timeline (`concierge/timeline.ts`)

```typescript
// src/lib/convex/concierge/timeline.ts
import { v } from 'convex/values';
import { conciergeQuery, conciergeMutation } from '../functions';

export const getOrgTimeline = conciergeQuery({
  args: { organizationId: v.id('organizations'), limit: v.optional(v.number()) },
  handler: async (ctx, { organizationId, limit }) => {
    // Vérification accès (même helper)
    if (ctx.staffRole === 'concierge') {
      const access = await ctx.db.query('conciergeOrgAccess')
        .withIndex('by_concierge_and_org', (q) =>
          q.eq('conciergeUserId', ctx.user._id).eq('organizationId', organizationId))
        .first();
      if (!access) return [];
    }

    // Événements de la table timeline
    const timelineEvents = await ctx.db.query('clientTimelineEvents')
      .withIndex('by_org_and_time', (q) => q.eq('organizationId', organizationId))
      .order('desc')
      .take(limit ?? 50);

    return timelineEvents;
  }
});

export const addConciergeNote = conciergeMutation({
  args: { organizationId: v.id('organizations'), note: v.string() },
  handler: async (ctx, { organizationId, note }) => {
    await ctx.db.insert('clientTimelineEvents', {
      organizationId,
      type: 'CONCIERGE_NOTE',
      title: 'Note concierge',
      description: note,
      createdBy: ctx.user._id,
      occurredAt: Date.now()
    });
  }
});
```

### Étape 3 — Refonte `/concierge/[orgId]/+page.svelte` en 5 onglets

```svelte
<script lang="ts">
  import { page } from '$app/state';
  import { useQuery } from '@mmailaender/convex-svelte';
  import { api } from '$lib/convex/_generated/api';
  import * as Tabs from '$lib/components/ui/tabs';
  import OrgOverview from '$lib/components/concierge/OrgOverview.svelte';
  import ClientInboxTab from '$lib/components/concierge/ClientInboxTab.svelte';
  import FleetObserver from '$lib/components/concierge/FleetObserver.svelte';
  import ClientTimeline from '$lib/components/concierge/ClientTimeline.svelte';
  import ClientSignals from '$lib/components/concierge/ClientSignals.svelte';
  import { Badge } from '$lib/components/ui/badge';
  import BuildingIcon from '@lucide/svelte/icons/building-2';

  const orgId = $derived(page.params.orgId as any);
  const org = useQuery(api.organizations.getOrganizationById, { organizationId: orgId });

  let activeTab = $state('overview');

  const TIER_LABEL: Record<string, string> = {
    essential: 'Essential', professional: 'Professional',
    business: 'Business', enterprise: 'Enterprise'
  };
</script>

<div class="flex h-full flex-col">
  <!-- Header org -->
  <div class="border-b border-border px-6 py-4">
    <div class="flex items-center gap-3">
      <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-bold uppercase">
        {org.data?.name?.slice(0, 2) ?? '??'}
      </div>
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <h1 class="text-base font-semibold truncate">{org.data?.name ?? '…'}</h1>
          {#if org.data?.paddlePlanTier}
            <Badge variant="outline" class="text-[10px]">
              {TIER_LABEL[org.data.paddlePlanTier] ?? org.data.paddlePlanTier}
            </Badge>
          {/if}
        </div>
        <p class="text-xs text-muted-foreground">
          {org.data?.country ?? ''} {org.data?.sector ? `· ${org.data.sector}` : ''}
        </p>
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="border-b border-border px-6">
    <Tabs.Root bind:value={activeTab}>
      <Tabs.List class="h-10 gap-0 rounded-none border-none bg-transparent p-0">
        {#each [['overview','Vue d\'ensemble'],['inbox','Inbox'],['observer','Fleet Observer'],['timeline','Timeline'],['signals','Signaux']] as [val, label]}
          <Tabs.Trigger
            value={val}
            class="rounded-none border-b-2 border-transparent px-4 text-sm data-[state=active]:border-[var(--brand)] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {label}
          </Tabs.Trigger>
        {/each}
      </Tabs.List>
    </Tabs.Root>
  </div>

  <!-- Contenu onglets -->
  <div class="flex-1 overflow-y-auto">
    {#if activeTab === 'overview'}
      <OrgOverview {orgId} />
    {:else if activeTab === 'inbox'}
      <ClientInboxTab {orgId} />
    {:else if activeTab === 'observer'}
      <FleetObserver {orgId} readonly={true} />
    {:else if activeTab === 'timeline'}
      <ClientTimeline {orgId} />
    {:else if activeTab === 'signals'}
      <ClientSignals {orgId} />
    {/if}
  </div>
</div>
```

### Étape 4 — `FleetObserver.svelte`

Le Fleet Observer réutilise les queries concierge de `fleetObserver.ts` pour afficher un mini-dashboard read-only. Ne pas réimporter les composants admin complets pour ce sprint — afficher des résumés propres.

```svelte
<script lang="ts">
  import { useQuery } from '@mmailaender/convex-svelte';
  import { api } from '$lib/convex/_generated/api';
  import VehicleStatusBadge from '$lib/components/VehicleStatusBadge.svelte';
  import * as Tabs from '$lib/components/ui/tabs';
  import CarIcon from '@lucide/svelte/icons/car';
  import CalendarIcon from '@lucide/svelte/icons/calendar';
  import WrenchIcon from '@lucide/svelte/icons/wrench';

  let { orgId, readonly = true }: { orgId: any; readonly?: boolean } = $props();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vehicles = useQuery((api as any)['concierge/fleetObserver'].getOrgVehicles, { organizationId: orgId });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reservations = useQuery((api as any)['concierge/fleetObserver'].getOrgReservations, { organizationId: orgId, limit: 20 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats = useQuery((api as any)['concierge/fleetObserver'].getOrgFleetStats, { organizationId: orgId });

  let subTab = $state('vehicles');
</script>

<div class="p-6 space-y-4">
  {#if readonly}
    <div class="flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-3 py-2 text-xs text-muted-foreground">
      <span class="size-1.5 rounded-full bg-[var(--brand)]"></span>
      Vue lecture seule — Données du client en temps réel
    </div>
  {/if}

  <!-- Stats rapides -->
  {#if stats.data}
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      {#each [
        { label: 'Total', value: stats.data.total },
        { label: 'Disponibles', value: stats.data.available, color: 'text-emerald-500' },
        { label: 'En utilisation', value: stats.data.inUse, color: 'text-amber-500' },
        { label: 'Taux utilisation', value: `${stats.data.utilizationRate}%` }
      ] as stat}
        <div class="relative overflow-hidden rounded-xl border border-border bg-card p-3"
          style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06), 0 1px 3px oklch(0 0 0 / 0.08)">
          <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          <p class="text-[10px] text-muted-foreground uppercase tracking-wide">{stat.label}</p>
          <p class="text-xl font-bold {stat.color ?? ''}">{stat.value}</p>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Sous-tabs véhicules / réservations -->
  <Tabs.Root bind:value={subTab}>
    <Tabs.List class="h-8">
      <Tabs.Trigger value="vehicles" class="text-xs">
        <CarIcon class="size-3 mr-1" /> Véhicules ({vehicles.data?.length ?? '…'})
      </Tabs.Trigger>
      <Tabs.Trigger value="reservations" class="text-xs">
        <CalendarIcon class="size-3 mr-1" /> Réservations récentes
      </Tabs.Trigger>
    </Tabs.List>
    <Tabs.Content value="vehicles" class="mt-3">
      <div class="divide-y divide-border/60 rounded-xl border border-border overflow-hidden">
        {#each vehicles.data ?? [] as v}
          <div class="flex items-center gap-3 px-3 py-2.5">
            <CarIcon class="size-4 text-muted-foreground shrink-0" />
            <span class="flex-1 text-sm font-medium">{v.brand} {v.model}</span>
            <span class="text-xs text-muted-foreground">{v.registration}</span>
            <VehicleStatusBadge status={v.status} />
          </div>
        {:else}
          <p class="py-6 text-center text-sm text-muted-foreground">Aucun véhicule</p>
        {/each}
      </div>
    </Tabs.Content>
    <Tabs.Content value="reservations" class="mt-3">
      <div class="divide-y divide-border/60 rounded-xl border border-border overflow-hidden">
        {#each reservations.data ?? [] as r}
          <div class="flex items-center gap-3 px-3 py-2.5">
            <span class="flex-1 text-sm">{r.purpose ?? 'Réservation'}</span>
            <span class="text-xs text-muted-foreground">
              {new Date(r.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </span>
            <span class="rounded-md px-1.5 py-0.5 text-[10px] font-medium
              {r.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}">
              {r.status}
            </span>
          </div>
        {:else}
          <p class="py-6 text-center text-sm text-muted-foreground">Aucune réservation récente</p>
        {/each}
      </div>
    </Tabs.Content>
  </Tabs.Root>
</div>
```

### Étape 5 — `ClientTimeline.svelte`

```svelte
<script lang="ts">
  import { useQuery, useMutation } from '@mmailaender/convex-svelte';
  import { api } from '$lib/convex/_generated/api';
  import { Button } from '$lib/components/ui/button';
  import { Textarea } from '$lib/components/ui/textarea';

  let { orgId }: { orgId: any } = $props();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeline = useQuery((api as any)['concierge/timeline'].getOrgTimeline, { organizationId: orgId, limit: 50 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addNote = useMutation((api as any)['concierge/timeline'].addConciergeNote);

  let noteContent = $state('');
  let addingNote = $state(false);

  const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
    ONBOARDING: { label: 'Onboarding', color: 'bg-emerald-500' },
    PLAN_CHANGE: { label: 'Changement plan', color: 'bg-blue-500' },
    INCIDENT: { label: 'Sinistre', color: 'bg-red-500' },
    MAINTENANCE: { label: 'Maintenance', color: 'bg-orange-400' },
    TICKET_CREATED: { label: 'Ticket créé', color: 'bg-amber-400' },
    TICKET_RESOLVED: { label: 'Ticket résolu', color: 'bg-emerald-400' },
    PAYMENT: { label: 'Paiement', color: 'bg-indigo-500' },
    ALERT_COMPLIANCE: { label: 'Alerte conformité', color: 'bg-red-400' },
    CONCIERGE_NOTE: { label: 'Note concierge', color: 'bg-muted-foreground' }
  };

  async function handleAddNote() {
    if (!noteContent.trim() || addingNote) return;
    addingNote = true;
    try {
      await addNote({ organizationId: orgId, note: noteContent.trim() });
      noteContent = '';
    } finally {
      addingNote = false;
    }
  }
</script>

<div class="p-6 space-y-4">
  <!-- Ajouter une note -->
  <div class="rounded-xl border border-border bg-card p-4 space-y-3"
    style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)">
    <p class="text-xs font-medium text-muted-foreground">Ajouter une note</p>
    <Textarea bind:value={noteContent} placeholder="Note concierge (visible équipe interne)…" class="resize-none text-sm min-h-[60px]" />
    <Button size="sm" onclick={handleAddNote} disabled={!noteContent.trim() || addingNote}>
      {addingNote ? 'Ajout…' : 'Ajouter'}
    </Button>
  </div>

  <!-- Timeline -->
  <div class="relative space-y-0">
    {#each timeline.data ?? [] as event, i}
      {@const config = TYPE_CONFIG[event.type] ?? { label: event.type, color: 'bg-muted-foreground' }}
      <div class="flex gap-4 pb-4">
        <!-- Ligne verticale -->
        <div class="flex flex-col items-center">
          <span class="size-2.5 rounded-full {config.color} shrink-0 mt-1.5"></span>
          {#if i < (timeline.data?.length ?? 0) - 1}
            <div class="w-px flex-1 bg-border/60 mt-1"></div>
          {/if}
        </div>
        <div class="min-w-0 pb-1">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-xs font-medium text-foreground">{event.title}</span>
            <span class="text-[10px] text-muted-foreground">
              {new Date(event.occurredAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
            </span>
          </div>
          {#if event.description}
            <p class="text-xs text-muted-foreground">{event.description}</p>
          {/if}
        </div>
      </div>
    {:else}
      <p class="text-center text-sm text-muted-foreground py-8">Aucun événement enregistré</p>
    {/each}
  </div>
</div>
```

### Étape 6 — `ClientSignals.svelte`

```svelte
<script lang="ts">
  import { useMutation } from '@mmailaender/convex-svelte';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';
  import ZapIcon from '@lucide/svelte/icons/zap';
  import TrendingDownIcon from '@lucide/svelte/icons/trending-down';

  let { orgId }: { orgId: any } = $props();

  // Signals sont calculés dynamiquement (pas de table dédiée dans ce sprint)
  // Placeholder pour les signals statiques ou calculés par les queries existantes

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alertCommercial = useMutation((api as any)['concierge/tickets'].upsertTicketFromSource);

  // Signaux fictifs (remplacer par query réelle en P37 quand salesSignals existe)
  const signals = $state([
    {
      id: 'upsell-seats',
      type: 'upsell',
      title: 'Quota sièges presque atteint',
      body: 'L\'organisation utilise 48/50 sièges — proche du plafond Essential.',
      priority: 'high' as const
    }
  ]);
</script>

<div class="p-6 space-y-3">
  {#if signals.length === 0}
    <div class="flex flex-col items-center py-16 gap-3">
      <ZapIcon class="size-10 text-muted-foreground/30" />
      <p class="text-sm text-muted-foreground">Aucun signal détecté</p>
    </div>
  {:else}
    {#each signals as signal}
      <div class="relative overflow-hidden rounded-xl border border-border bg-card p-4 space-y-2"
        style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)">
        <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        <div class="flex items-start gap-2">
          {#if signal.type === 'upsell'}
            <ZapIcon class="size-4 text-amber-500 mt-0.5 shrink-0" />
          {:else}
            <TrendingDownIcon class="size-4 text-red-500 mt-0.5 shrink-0" />
          {/if}
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium">{signal.title}</p>
            <p class="text-xs text-muted-foreground mt-0.5">{signal.body}</p>
          </div>
          <Badge class="{signal.priority === 'high' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-muted text-muted-foreground'} text-[10px] shrink-0">
            {signal.priority === 'high' ? 'Haute' : 'Normale'}
          </Badge>
        </div>
        <div class="flex justify-end">
          <Button size="sm" variant="outline" class="text-xs h-7">
            Alerter le commercial →
          </Button>
        </div>
      </div>
    {/each}
  {/if}
</div>
```

---

## ✅ Critères d'acceptation

- [ ] `/concierge/[orgId]` affiche exactement 5 onglets : Vue d'ensemble · Inbox · Fleet Observer · Timeline · Signaux
- [ ] Onglet Fleet Observer affiche les véhicules et réservations du client en temps réel
- [ ] Un concierge ne peut pas accéder au Fleet Observer d'une org non assignée (erreur d'accès)
- [ ] Aucun bouton de modification dans Fleet Observer (`readonly={true}`)
- [ ] Onglet Timeline affiche les événements dans l'ordre chronologique inverse
- [ ] Bouton "Ajouter une note" dans Timeline crée un événement `CONCIERGE_NOTE`
- [ ] Onglet Signaux affiche les signaux détectés (upsell, churn)
- [ ] Onglet Inbox affiche les tickets `conciergeTickets` filtrés par `organizationId`
- [ ] Stats Fleet Observer (total, disponibles, en utilisation, taux) correctes et réactives
- [ ] Glass-metal sur toutes les cards (relative overflow-hidden + inset shadow + gradient-top)

---

## 🚫 NE PAS FAIRE

- Ne pas copier-coller le code des pages admin dans le Fleet Observer — réutiliser les composants avec `readonly`
- Ne pas appeler les mutations admin depuis le Fleet Observer — le prop `readonly` doit les désactiver
- Ne pas créer un iframe — le Fleet Observer est un composant Svelte qui utilise les queries concierge
- Ne pas construire les signaux automatiques dans ce prompt (P37 le fait) — afficher un état placeholder propre
- Ne pas construire le système de notifications pour "Alerter le commercial" dans ce prompt — le bouton crée juste l'entrée `salesSignals` via mutation (P37)
- Ne pas utiliser `useQuery` dans un `$derived` ou une fonction — toujours au top-level ou dans des composants enfants avec les props nécessaires
