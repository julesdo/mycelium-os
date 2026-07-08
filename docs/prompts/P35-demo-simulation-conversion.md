---
priority: 35
feature: Démo simulation temps réel + modale de conversion + dashboard commercial démos
sprint: Commercial S3
version: V3 — Commercial
effort: 4 jours
depends_on: P34
blocks: —
model_recommended: — (simulation déterministe, pas de LLM)
pricing_tier: outil interne commercial
---

# P35 — Démo Simulation & Conversion

## 🎯 Mission

Les comptes démo créés en P34 sont statiques. Ce prompt les rend **vivants** : positions de véhicules mises à jour toutes les 5 minutes, événements automatiques (maintenances, alertes, contraventions), et la **modale de conversion infranchissable** qui s'affiche quand la démo expire.

**Ce que ce prompt livre :**
- `demo/simulation.ts` — engine de simulation positions (algorithme journalier réaliste)
- Cron toutes les 5 minutes → `updateAllDemoPositions`
- Cron quotidien 6h UTC → `generateDailyDemoEvents`
- Dashboard `/concierge/demos` — liste démos actives/expirées avec métriques
- Modale de conversion bloquante (`pointer-events: none` + `filter: blur(8px)`) avec 3 CTAs
- Emails Resend : création + relances J+3 / J-3 / J-0

---

## 📍 État actuel du codebase

**Ce qui existe (P34) :**
- `organizations.isDemo`, `organizations.demoConfig`
- `demoVehiclePositions`, `demoAccessTokens`
- Action `generateDemoOrg` + templates 7 secteurs
- Route `/demo/[token]`

**Ce qui existe (codebase) :**
- `crons.ts` — fichier centralisé des crons Convex
- Emails via `@convex-dev/resend` — pattern dans `notifications.ts` et `optimizer.ts`
- Paddle checkout — `getPortalUrl` dans `paddle.ts`

---

## 🔒 Contraintes absolues

1. **Simulation déterministe** — pas de LLM pour calculer les positions. Algorithme pur TypeScript basé sur l'heure locale et le template.
2. **Cron non bloquant** — le cron 5min traite les orgs démo par batch. Si une org échoue, les autres continuent.
3. **Modale infranchissable** — `pointer-events: none` + `filter: blur(8px)` + `z-index: 9999` sur toute l'app. Pas de bouton Fermer. Pas d'Échap.
4. **Scale cron** — avec 50 démos actives × 80 véhicules = 4000 updates/5min. Convex peut gérer, mais grouper en batches de 10 orgs par cron execution.
5. **Email opt-out respecté** — si le commercial a désactivé les emails prospect dans les paramètres démo, ne pas envoyer.

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/demo/simulation.ts                      → CRÉER : engine positions + events
src/lib/convex/crons.ts                                → MODIFIER : ajouter 2 crons démo
src/lib/convex/demo/demoEmails.ts                      → CRÉER : emails Resend démo

src/routes/[[lang]]/concierge/demos/+page.svelte       → CRÉER : dashboard liste démos
src/routes/[[lang]]/concierge/demos/+page.ts           → CRÉER : guard concierge
src/lib/components/demo/DemoConversionModal.svelte     → CRÉER : modale bloquante
src/routes/[[lang]]/admin/+layout.svelte               → MODIFIER : afficher DemoConversionModal
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Engine de simulation (`demo/simulation.ts`)

```typescript
// src/lib/convex/demo/simulation.ts
import { internalAction, internalMutation, internalQuery } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';

// Waypoints pré-calculés par région (lat/lng approximatifs)
const REGION_CENTERS: Record<string, { lat: number; lng: number }> = {
  FR: { lat: 48.85, lng: 2.35 },    // Paris
  GB: { lat: 51.50, lng: -0.12 },   // London
  SE: { lat: 57.71, lng: 11.97 },   // Gothenburg
  NO: { lat: 59.91, lng: 10.75 },   // Oslo
  DK: { lat: 55.68, lng: 12.57 },   // Copenhagen
  DE: { lat: 52.52, lng: 13.40 },   // Berlin
  NL: { lat: 52.37, lng: 4.89 }     // Amsterdam
};

// Calcule la position simulée d'un véhicule à l'instant T selon le template
function simulateVehiclePosition(params: {
  vehicleIndex: number;
  templateId: string;
  country: string;
  now: number;
  currentOdometer: number;
}) {
  const center = REGION_CENTERS[params.country] ?? REGION_CENTERS['FR'];
  const hour = new Date(params.now).getHours();
  const minuteOffset = (params.vehicleIndex * 7) % 60; // décalage par véhicule

  // Rayon max de déplacement selon le template
  const radiusKm = {
    btp: 0.4, distribution: 0.3, vtc: 0.5, services: 0.6, commerce: 0.8, sante: 0.25, public: 0.2
  }[params.templateId] ?? 0.4;

  // Détermine si actif ou garé selon l'heure
  const isBusinessHours = hour >= 7 && hour < 19;
  const isActive = isBusinessHours && Math.sin(params.vehicleIndex + hour) > 0; // pseudo-aléatoire déterministe

  if (!isActive) {
    // Garé : position fixe proche du dépôt (légère variation par véhicule)
    const depotOffset = params.vehicleIndex * 0.001;
    return {
      lat: center.lat + depotOffset,
      lng: center.lng + depotOffset * 0.5,
      speed: 0,
      heading: (params.vehicleIndex * 45) % 360,
      status: 'parked' as const,
      fuelOrSocPercent: Math.min(100, 70 + (params.vehicleIndex % 30)),
      odometerKm: params.currentOdometer
    };
  }

  // En mouvement : position sur un cercle autour du centre
  const angle = ((params.now / 60000 + params.vehicleIndex * 37) % 360) * (Math.PI / 180);
  const dist = radiusKm * (0.3 + 0.7 * Math.abs(Math.sin(params.vehicleIndex)));
  const KM_TO_LAT = 1 / 111;
  const KM_TO_LNG = 1 / (111 * Math.cos(center.lat * Math.PI / 180));

  const lat = center.lat + dist * Math.cos(angle) * KM_TO_LAT;
  const lng = center.lng + dist * Math.sin(angle) * KM_TO_LNG;
  const speed = 30 + Math.abs(Math.sin(params.vehicleIndex + hour)) * 80; // 30–110 km/h
  const heading = (angle * 180 / Math.PI + 90) % 360;

  // Décroissance carburant/SoC (simple modèle)
  const kmTraveled = speed * 5 / 60; // km parcourus en 5 min
  const consumption = 0.15 + Math.random() * 0.05; // L ou % par km

  return {
    lat, lng, speed, heading,
    status: 'moving' as const,
    fuelOrSocPercent: Math.max(15, 80 - kmTraveled * consumption),
    odometerKm: params.currentOdometer + kmTraveled
  };
}

// Récupère toutes les orgs démo actives
export const getActiveDemoOrgs = internalQuery({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query('organizations')
      .filter((q) => q.eq(q.field('isDemo'), true))
      .collect();
    return orgs.filter((o) => o.demoConfig && !o.demoConfig.isExpired && o.demoConfig.expiresAt > Date.now());
  }
});

// Met à jour les positions de tous les véhicules d'une org démo
export const updateDemoOrgPositions = internalMutation({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, { organizationId }) => {
    const org = await ctx.db.get(organizationId);
    if (!org?.demoConfig) return;

    const vehicles = await ctx.db.query('vehicles')
      .withIndex('by_org', (q) => q.eq('organizationId', organizationId))
      .collect();

    const now = Date.now();

    for (let i = 0; i < vehicles.length; i++) {
      const vehicle = vehicles[i];

      // Récupérer la position actuelle (odomètre)
      const currentPos = await ctx.db.query('demoVehiclePositions')
        .withIndex('by_vehicle', (q) => q.eq('vehicleId', vehicle._id))
        .first();

      const simResult = simulateVehiclePosition({
        vehicleIndex: i,
        templateId: org.demoConfig!.templateId,
        country: org.country ?? 'FR',
        now,
        currentOdometer: currentPos?.odometerKm ?? vehicle.kilometers ?? 30000
      });

      if (currentPos) {
        await ctx.db.patch(currentPos._id, { ...simResult, updatedAt: now });
      } else {
        await ctx.db.insert('demoVehiclePositions', {
          vehicleId: vehicle._id,
          organizationId,
          ...simResult,
          updatedAt: now
        });
      }
    }
  }
});

// Génère des événements automatiques (maintenance, alerte, contravention)
export const generateDailyDemoEvents = internalMutation({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, { organizationId }) => {
    const org = await ctx.db.get(organizationId);
    if (!org?.demoConfig) return;

    const vehicles = await ctx.db.query('vehicles')
      .withIndex('by_org', (q) => q.eq('organizationId', organizationId))
      .collect();

    if (vehicles.length === 0) return;

    // 1 alerte maintenance par semaine (probabilité journalière ~14%)
    if (Math.random() < 0.14 && vehicles.length > 0) {
      const vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
      await ctx.db.insert('maintenanceRecords', {
        organizationId,
        vehicleId: vehicle._id,
        type: 'SCHEDULED',
        description: 'Révision annuelle (démo simulée)',
        scheduledDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // dans 7 jours
        status: 'SCHEDULED',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    // 1 alerte compliance par mois (~3% journalier)
    if (Math.random() < 0.03) {
      await ctx.scheduler.runAfter(0, internal.concierge.tasks.upsertTaskFromSource, {
        organizationId,
        sourceType: 'COMPLIANCE_ALERT',
        sourceId: `demo-compliance-${organizationId}-${Date.now()}`,
        title: 'Permis conducteur proche expiration (démo)',
        description: 'Un conducteur de la flotte démo a un permis expirant dans 30 jours.',
        dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
        isRegulatory: true
      });
    }
  }
});

// Point d'entrée cron — traite toutes les orgs démo par batch
export const updateAllDemoPositions = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.demo.simulation.getActiveDemoOrgs, {});
    for (const org of orgs) {
      await ctx.runMutation(internal.demo.simulation.updateDemoOrgPositions, {
        organizationId: org._id
      });
    }
  }
});

export const generateAllDailyDemoEvents = internalAction({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.runQuery(internal.demo.simulation.getActiveDemoOrgs, {});
    for (const org of orgs) {
      await ctx.runMutation(internal.demo.simulation.generateDailyDemoEvents, {
        organizationId: org._id
      });
    }
    // Vérifier les expirations
    await ctx.runMutation(internal.demo.simulation.checkDemoExpirations, {});
  }
});

export const checkDemoExpirations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const orgs = await ctx.db.query('organizations')
      .filter((q) => q.eq(q.field('isDemo'), true))
      .collect();

    for (const org of orgs) {
      if (!org.demoConfig || org.demoConfig.isExpired) continue;
      if (org.demoConfig.expiresAt < now) {
        await ctx.db.patch(org._id, {
          demoConfig: { ...org.demoConfig, isExpired: true }
        });
      }
    }
  }
});
```

### Étape 2 — Crons (`crons.ts`)

```typescript
// Dans src/lib/convex/crons.ts, ajouter :

// Simulation démo : toutes les 5 minutes
crons.interval('simulateDemoFleets', { minutes: 5 }, internal.demo.simulation.updateAllDemoPositions, {});

// Événements démo : quotidien à 6h UTC
crons.daily('generateDemoEvents', { hourUTC: 6, minuteUTC: 0 }, internal.demo.simulation.generateAllDailyDemoEvents, {});
```

### Étape 3 — Modale de conversion (`DemoConversionModal.svelte`)

```svelte
<!-- src/lib/components/demo/DemoConversionModal.svelte -->
<script lang="ts">
  import { useQuery } from '@mmailaender/convex-svelte';
  import { api } from '$lib/convex/_generated/api';
  import Logo from '$lib/components/icons/logo.svelte';
  import { Button } from '$lib/components/ui/button';
  import PhoneIcon from '@lucide/svelte/icons/phone';
  import CalendarIcon from '@lucide/svelte/icons/calendar';
  import CheckCircleIcon from '@lucide/svelte/icons/check-circle';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = useQuery((api as any).organizations.getMyOrg, {});

  const isExpiredDemo = $derived(
    org.data?.isDemo === true &&
    org.data?.demoConfig?.isExpired === true
  );

  const config = $derived(org.data?.demoConfig ?? null);
  const orgName = $derived(org.data?.name ?? '');

  // Stats simulées (à remplacer par vraie query en V2)
  const stats = $derived({
    kmTraveled: Math.floor(Math.random() * 15000 + 10000),
    alertsHandled: Math.floor(Math.random() * 30 + 15),
    estimatedSavings: Math.floor(Math.random() * 2000 + 1000)
  });
</script>

{#if isExpiredDemo && config}
  <!-- Overlay flou -->
  <div
    class="fixed inset-0 z-[9999] flex items-center justify-center"
    style="backdrop-filter: blur(8px); background: oklch(0 0 0 / 0.6);"
    onkeydown={(e) => e.preventDefault()}
    role="dialog"
    aria-modal="true"
    aria-label="Votre démo a expiré"
  >
    <div class="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl mx-4"
      style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.08), 0 24px 64px oklch(0 0 0 / 0.4)">
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

      <div class="p-8 space-y-6">
        <!-- Logo + titre -->
        <div class="text-center space-y-3">
          <div class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[var(--brand)]"
            style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.25)">
            <Logo class="size-8 text-[var(--brand-foreground)]" />
          </div>
          <div>
            <h2 class="text-xl font-semibold">Votre essai Mycelium est terminé.</h2>
            <p class="text-sm text-muted-foreground mt-1">{orgName}</p>
          </div>
        </div>

        <!-- Stats démo -->
        <div class="grid grid-cols-3 gap-3">
          {#each [
            { label: 'Km parcourus', value: stats.kmTraveled.toLocaleString('fr-FR') },
            { label: 'Alertes traitées', value: stats.alertsHandled },
            { label: 'Économies estimées', value: `${stats.estimatedSavings.toLocaleString('fr-FR')} €` }
          ] as stat}
            <div class="relative overflow-hidden rounded-xl border border-border bg-muted/40 p-3 text-center"
              style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.04)">
              <p class="text-lg font-bold">{stat.value}</p>
              <p class="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          {/each}
        </div>

        <!-- 3 CTAs -->
        <div class="space-y-3">
          <a
            href="tel:{config.commercialPhone}"
            class="flex w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--brand)] bg-[var(--brand)]/10 px-4 py-3 text-sm font-medium text-[var(--brand-foreground)] transition-colors hover:bg-[var(--brand)]/20"
          >
            <PhoneIcon class="size-4" />
            Appeler {config.commercialName}
          </a>

          {#if config.commercialCalendlyUrl}
            <a
              href={config.commercialCalendlyUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <CalendarIcon class="size-4" />
              Prendre rendez-vous
            </a>
          {/if}

          <!-- Paddle checkout → Essential -->
          <button
            type="button"
            class="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-[var(--brand-foreground)] transition-colors hover:opacity-90"
            style="box-shadow: 0 1px 3px oklch(0.92 0.23 103 / 0.3), inset 0 1px 0 oklch(1 0 0 / 0.25)"
            onclick={() => {
              // Paddle checkout — price ID Essential
              if (typeof window !== 'undefined' && (window as any).Paddle) {
                (window as any).Paddle.Checkout.open({ items: [{ priceId: 'pri_essential', quantity: 1 }] });
              }
            }}
          >
            <CheckCircleIcon class="size-4" />
            S'abonner maintenant
          </button>
        </div>

        <p class="text-center text-xs text-muted-foreground">
          Des questions ? <a href="mailto:demo@mycelium.io" class="underline">demo@mycelium.io</a>
        </p>
      </div>
    </div>
  </div>
{/if}
```

Ajouter `<DemoConversionModal />` dans `src/routes/[[lang]]/admin/+layout.svelte` juste avant `{@render children()}`.

### Étape 4 — Dashboard `/concierge/demos`

```svelte
<!-- /concierge/demos/+page.svelte -->
<script lang="ts">
  import { useQuery, useMutation } from '@mmailaender/convex-svelte';
  import { api } from '$lib/convex/_generated/api';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import { resolve } from '$app/paths';
  import { localizedHref } from '$lib/utils/i18n';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const demos = useQuery((api as any)['concierge/demos'].listDemos, {});

  const stats = $derived.by(() => {
    const data = demos.data ?? [];
    return {
      active: data.filter((d: any) => !d.demoConfig?.isExpired).length,
      expired: data.filter((d: any) => d.demoConfig?.isExpired && !d.demoConfig?.convertedAt).length,
      converted: data.filter((d: any) => d.demoConfig?.convertedAt).length
    };
  });
</script>

<div class="p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-semibold">Comptes démo</h1>
      <p class="text-sm text-muted-foreground">{demos.data?.length ?? 0} démos créées</p>
    </div>
    <Button href={resolve(localizedHref('/concierge/demos/new'))} class="bg-[var(--brand)] text-[var(--brand-foreground)]">
      <PlusIcon class="size-4 mr-1.5" />
      Nouvelle démo
    </Button>
  </div>

  <!-- KPIs -->
  <div class="grid grid-cols-3 gap-4">
    {#each [
      { label: 'Démos actives', value: stats.active, color: 'text-emerald-500' },
      { label: 'Expirées (à relancer)', value: stats.expired, color: 'text-red-500' },
      { label: 'Converties', value: stats.converted, color: 'text-[var(--brand-foreground)]' }
    ] as kpi}
      <div class="relative overflow-hidden rounded-xl border border-border bg-card p-4"
        style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)">
        <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        <p class="text-2xl font-bold {kpi.color}">{kpi.value}</p>
        <p class="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
      </div>
    {/each}
  </div>

  <!-- Liste démos -->
  <div class="rounded-xl border border-border overflow-hidden">
    <table class="w-full">
      <thead class="border-b border-border bg-muted/30">
        <tr>
          {#each ['Prospect', 'Template', 'Flotte', 'Créée le', 'Expire', 'Statut', 'Actions'] as h}
            <th class="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{h}</th>
          {/each}
        </tr>
      </thead>
      <tbody class="divide-y divide-border/60">
        {#each demos.data ?? [] as demo}
          {@const cfg = demo.demoConfig}
          {@const daysLeft = cfg ? Math.ceil((cfg.expiresAt - Date.now()) / 86400000) : 0}
          <tr class="hover:bg-muted/30 transition-colors">
            <td class="px-4 py-3">
              <p class="text-sm font-medium">{demo.name}</p>
              <p class="text-xs text-muted-foreground">{cfg?.prospectName ?? ''}</p>
            </td>
            <td class="px-4 py-3 text-sm text-muted-foreground capitalize">{cfg?.templateId ?? '—'}</td>
            <td class="px-4 py-3 text-sm text-muted-foreground">—</td>
            <td class="px-4 py-3 text-xs text-muted-foreground">
              {demo.createdAt ? new Date(demo.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
            </td>
            <td class="px-4 py-3">
              {#if cfg?.isExpired}
                <Badge class="bg-red-500/10 text-red-500 border-red-500/20 text-[10px]">Expirée</Badge>
              {:else if daysLeft <= 3}
                <Badge class="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">J-{daysLeft}</Badge>
              {:else}
                <span class="text-xs text-muted-foreground">J-{daysLeft}</span>
              {/if}
            </td>
            <td class="px-4 py-3">
              {#if cfg?.convertedAt}
                <Badge class="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Converti</Badge>
              {:else if cfg?.isExpired}
                <Badge class="bg-red-500/10 text-red-500 border-red-500/20 text-[10px]">Expiré</Badge>
              {:else}
                <Badge class="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">Actif</Badge>
              {/if}
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-1.5">
                <Button size="sm" variant="ghost" class="h-7 text-xs" href={resolve(localizedHref(`/admin/dashboard`))}>
                  Voir
                </Button>
                {#if !cfg?.isExpired}
                  <Button size="sm" variant="outline" class="h-7 text-xs">Prolonger</Button>
                {/if}
              </div>
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="7" class="py-12 text-center text-sm text-muted-foreground">
              Aucune démo créée. <a href={resolve(localizedHref('/concierge/demos/new'))} class="underline">Créer la première</a>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
```

### Étape 5 — Query `listDemos` + mutation `extendDemo`

```typescript
// src/lib/convex/concierge/demos.ts
import { v } from 'convex/values';
import { conciergeQuery, conciergeMutation } from '../functions';

export const listDemos = conciergeQuery({
  args: {},
  handler: async (ctx) => {
    const orgs = await ctx.db.query('organizations')
      .filter((q) => q.eq(q.field('isDemo'), true))
      .order('desc')
      .collect();

    // Concierge : filtre par orgs accessibles
    if (ctx.staffRole === 'concierge') {
      const accesses = await ctx.db.query('conciergeOrgAccess')
        .withIndex('by_concierge', (q) => q.eq('conciergeUserId', ctx.user._id))
        .collect();
      const allowedIds = new Set(accesses.map((a) => a.organizationId));
      return orgs.filter((o) => allowedIds.has(o._id));
    }
    return orgs;
  }
});

export const extendDemo = conciergeMutation({
  args: { organizationId: v.id('organizations'), extraDays: v.number() },
  handler: async (ctx, { organizationId, extraDays }) => {
    const org = await ctx.db.get(organizationId);
    if (!org?.demoConfig) throw new Error('Pas une org démo');
    if (org.demoConfig.extendedCount >= 3) throw new Error('Maximum 3 prolongations atteint');
    if (extraDays < 1 || extraDays > 14) throw new Error('extraDays doit être entre 1 et 14');

    await ctx.db.patch(organizationId, {
      demoConfig: {
        ...org.demoConfig,
        expiresAt: org.demoConfig.expiresAt + extraDays * 24 * 60 * 60 * 1000,
        isExpired: false,
        extendedCount: org.demoConfig.extendedCount + 1
      }
    });
  }
});
```

### Étape 6 — Ajouter "Demos" dans le nav concierge

```typescript
// Dans concierge/+layout.svelte navItems :
import PlayCircleIcon from '@lucide/svelte/icons/play-circle';

// Ajouter (visible super_admin + concierge) :
{
  href: localizedHref('/concierge/demos'),
  label: 'Démos',
  icon: PlayCircleIcon,
  active: page.url.pathname.includes('/concierge/demos')
},
```

---

## ✅ Critères d'acceptation

- [ ] Cron toutes les 5min tourne et met à jour `demoVehiclePositions` pour chaque org démo active
- [ ] `demoVehiclePositions` a des valeurs différentes entre deux exécutions de 5min (simulation non statique)
- [ ] Cron quotidien 6h UTC génère des événements pour les orgs démo actives
- [ ] `checkDemoExpirations` passe `isExpired: true` quand `now > expiresAt`
- [ ] La modale `DemoConversionModal` apparaît sur `/admin/*` quand l'org est `isDemo && isExpired`
- [ ] La modale est infranchissable (pas de bouton fermer, les éléments derrière ne sont pas cliquables)
- [ ] Les 3 CTAs fonctionnent : call (tel:), Calendly (href), Paddle (overlay)
- [ ] Dashboard `/concierge/demos` affiche les KPIs (actives, expirées, converties)
- [ ] Bouton "Prolonger" incrémente `extendedCount` et recule `expiresAt`
- [ ] Maximum 3 prolongations (erreur au-delà)
- [ ] `extendDemo` passe `isExpired: false` si prolongation d'une démo expirée

---

## 🚫 NE PAS FAIRE

- Ne pas utiliser d'API GPS externe pour la simulation — algorithme déterministe uniquement
- Ne pas créer des positions parfaitement circulaires (trop artificiel) — ajouter de la variabilité via `Math.sin(vehicleIndex + hour)`
- Ne pas faire boucler le cron 5min sur des orgs non-démo — filtrer dès le début par `isDemo: true`
- Ne pas afficher de chiffres de stats inventés dans la modale — les stats doivent venir de vraies queries (km réservations, alertes concierge_tasks) ou afficher "N/A" si non disponibles
- Ne pas permettre de fermer la modale par Échap ou clic en dehors — `onkeydown={(e) => e.preventDefault()}` sur le conteneur
- Ne pas créer les emails Resend dans ce sprint si le template ne correspond pas à ceux déjà existants dans `notifications.ts` — créer un issue pour le sprint D uniquement
