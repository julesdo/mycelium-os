---
priority: 4
feature: Dashboard admin — KPIs réels + graphiques
sprint: S3
version: V1 MVP
effort: 2 jours
depends_on: P01 (véhicules), P02 (réservations), schema complet
blocks: —
---

# P04 — Dashboard admin (KPIs réels + graphiques)

## 🎯 Mission
Donner au DAF/ORG_ADMIN une vision instantanée de sa flotte sur `/admin/dashboard`. Remplace les 4 captures d'écran de spreadsheet qu'il envoie par email le lundi matin. Valeur perçue immédiate, crucial pour la rétention.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Route `/admin/dashboard/+page.svelte` (probablement shell vide)
- `src/lib/convex/dashboard.ts` (existe, vérifier le contenu)
- Tables `vehicles`, `reservations`, `costs`, `notifications` complètes

**Ce qui manque :**
- Queries Convex pour les 4 KPIs (ou à compléter dans `dashboard.ts`)
- Query pour l'activité des 14 derniers jours (par jour)
- Query pour la liste "véhicules nécessitant attention"
- Query pour le feed d'activité récent
- UI avec les KPI cards, graphiques, listes

---

## 🔒 Contraintes absolues

1. **Guard ORG_ADMIN** : cette page n'est visible que par ORG_ADMIN et ORG_MANAGER
2. **Performance** : max 3 queries Convex pour charger tout le dashboard (pas 20 queries individuelles)
3. **Temps réel** : le feed d'activité doit se mettre à jour sans refresh (Convex reactive)
4. **Charts** : utiliser `layerchart` (lib recommandée pour Svelte) ou SVG inline simple si layerchart non installé — vérifier `package.json` avant
5. **Design** : sobriété maximale, cards `rounded-xl`, accent jaune `--brand` pour la 1ère KPI card

---

## 📊 Queries Convex à implémenter dans `dashboard.ts`

### Query `getDashboardKPIs`

```typescript
export const getDashboardKPIs = authedQuery({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getUserOrg(ctx);
    // Guard : ORG_ADMIN ou ORG_MANAGER uniquement
    await requireOrgAdminOrManager(ctx, organizationId);
    
    const [vehicles, reservations] = await Promise.all([
      ctx.db.query('vehicles').withIndex('by_org', q => q.eq('organizationId', organizationId)).collect(),
      ctx.db.query('reservations').withIndex('by_org', q => q.eq('organizationId', organizationId)).collect()
    ]);
    
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    // KPI 1 : total véhicules (non RETIRED)
    const activeVehicles = vehicles.filter(v => v.status !== 'RETIRED');
    
    // KPI 2 : taux d'utilisation sur 7 jours
    // Nombre de jours-véhicule utilisés / (nombre véhicules actifs × 7 jours)
    const recentReservations = reservations.filter(r =>
      r.endDate >= sevenDaysAgo &&
      (r.status === 'CONFIRMED' || r.status === 'IN_PROGRESS' || r.status === 'COMPLETED')
    );
    const utilizationRate = activeVehicles.length > 0
      ? Math.min(100, Math.round((recentReservations.length / (activeVehicles.length * 7)) * 100 * 10))
      : 0;
    
    // KPI 3 : véhicules en maintenance
    const inMaintenance = vehicles.filter(v => v.status === 'MAINTENANCE').length;
    
    // KPI 4 : alertes ouvertes (leasing expirant dans 90j + entretien proche)
    const ninetyDaysFromNow = now + 90 * 24 * 60 * 60 * 1000;
    const leasingExpiring = vehicles.filter(v =>
      v.leaseEndDate && new Date(v.leaseEndDate).getTime() < ninetyDaysFromNow
    ).length;
    
    return {
      totalVehicles: activeVehicles.length,
      utilizationRate,
      inMaintenance,
      openAlerts: leasingExpiring
    };
  }
});
```

### Query `getActivityTimeline` (14 derniers jours)

```typescript
export const getActivityTimeline = authedQuery({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getUserOrg(ctx);
    const fourteenDaysAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
    
    const reservations = await ctx.db
      .query('reservations')
      .withIndex('by_org', q => q.eq('organizationId', organizationId))
      .filter(q => q.gte(q.field('createdAt'), fourteenDaysAgo))
      .collect();
    
    // Grouper par jour (format "DD/MM")
    const byDay: Record<string, number> = {};
    for (let i = 0; i < 14; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      byDay[key] = 0;
    }
    
    reservations.forEach(r => {
      const key = new Date(r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      if (key in byDay) byDay[key]++;
    });
    
    return Object.entries(byDay).reverse().map(([date, count]) => ({ date, count }));
  }
});
```

### Query `getAttentionList` (véhicules nécessitant attention)

```typescript
export const getAttentionList = authedQuery({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getUserOrg(ctx);
    const now = Date.now();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    
    const vehicles = await ctx.db
      .query('vehicles')
      .withIndex('by_org', q => q.eq('organizationId', organizationId))
      .collect();
    
    const attention = vehicles
      .filter(v => v.status !== 'RETIRED')
      .flatMap(v => {
        const items: Array<{ vehicleId: string; label: string; reason: string; urgency: 'high' | 'medium' }> = [];
        
        if (v.leaseEndDate) {
          const daysLeft = (new Date(v.leaseEndDate).getTime() - now) / (1000 * 60 * 60 * 24);
          if (daysLeft < 90) {
            items.push({
              vehicleId: v._id,
              label: `${v.brand} ${v.model} — ${v.registration}`,
              reason: `Leasing expire dans ${Math.round(daysLeft)} jours`,
              urgency: daysLeft < 30 ? 'high' : 'medium'
            });
          }
        }
        
        if (v.maintenanceDueDate) {
          const daysLeft = (new Date(v.maintenanceDueDate).getTime() - now) / (1000 * 60 * 60 * 24);
          if (daysLeft < 30) {
            items.push({
              vehicleId: v._id,
              label: `${v.brand} ${v.model} — ${v.registration}`,
              reason: `Entretien dû dans ${Math.round(daysLeft)} jours`,
              urgency: daysLeft < 7 ? 'high' : 'medium'
            });
          }
        }
        
        return items;
      })
      .sort((a, b) => (b.urgency === 'high' ? 1 : 0) - (a.urgency === 'high' ? 1 : 0))
      .slice(0, 8);
    
    return attention;
  }
});
```

### Query `getRecentActivity` (feed temps réel)

```typescript
export const getRecentActivity = authedQuery({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getUserOrg(ctx);
    
    const reservations = await ctx.db
      .query('reservations')
      .withIndex('by_org', q => q.eq('organizationId', organizationId))
      .order('desc')
      .take(10);
    
    return reservations.map(r => ({
      _id: r._id,
      type: 'reservation' as const,
      status: r.status,
      vehicleId: r.vehicleId,
      userId: r.userId,
      date: r.createdAt
    }));
  }
});
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/dashboard.ts                → compléter avec les queries ci-dessus
src/routes/[[lang]]/admin/dashboard/+page.svelte
src/lib/components/ui/metric-card.svelte   → vérifier si existe déjà (git status le montre modifié)
src/lib/components/dashboard/
  activity-chart.svelte
  attention-list.svelte
  activity-feed.svelte
  fleet-donut.svelte
```

---

## 🔨 Layout de la page dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard                                    [Période ▾]        │
├────────────┬──────────────┬──────────────┬──────────────────────┤
│ 📦 Flotte  │ 📊 Utilisation│ 🔧 Maintenance│ ⚠️ Alertes           │
│ 42 véhicules│ 73%          │ 3            │ 5                    │
│ (accent jaune)│            │             │                      │
├────────────────────────────┬────────────────────────────────────┤
│  Activité 14 jours (chart) │  Répartition par statut (donut)    │
│  [graphique ligne]         │  ● Dispo: 35  ● Utilisés: 4       │
│                            │  ● Mainten: 3                      │
├────────────────────────────┴────────────────────────────────────┤
│  Véhicules nécessitant attention                                 │
│  ⚠️ Renault Clio AB-123-CD — Leasing expire dans 15 jours        │
│  ⚠️ Peugeot 308 ZZ-789-AB — Entretien dû dans 8 jours            │
├────────────────────────────────────────────────────────────────┤
│  Activité récente (temps réel)                                   │
│  🔵 Réservation créée — Alice M. — Clio AB-123-CD — il y a 5min │
└────────────────────────────────────────────────────────────────┘
```

### Code pattern pour la page

```svelte
<script lang="ts">
  import { useQuery } from 'convex-svelte';
  import { api } from '$lib/convex/_generated/api';
  import MetricCard from '$lib/components/ui/metric-card.svelte';
  import ActivityChart from '$lib/components/dashboard/activity-chart.svelte';

  const kpis = useQuery(api.dashboard.getDashboardKPIs, {});
  const timeline = useQuery(api.dashboard.getActivityTimeline, {});
  const attention = useQuery(api.dashboard.getAttentionList, {});
  const activity = useQuery(api.dashboard.getRecentActivity, {});
</script>

{#if kpis.data}
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
    <MetricCard title="Flotte" value={kpis.data.totalVehicles} unit="véhicules" accent />
    <MetricCard title="Utilisation" value={kpis.data.utilizationRate} unit="%" />
    <MetricCard title="En maintenance" value={kpis.data.inMaintenance} />
    <MetricCard title="Alertes" value={kpis.data.openAlerts} variant="warning" />
  </div>
{/if}
```

---

## ✅ Critères d'acceptation

- [ ] 4 KPI cards avec les vraies données (pas de mock)
- [ ] Graphique d'activité basé sur les vraies réservations des 14 derniers jours
- [ ] Donut chart de répartition par statut avec les vrais chiffres
- [ ] Liste d'attention avec les véhicules dont le leasing expire dans 90j
- [ ] Feed d'activité mis à jour en temps réel sans refresh (Convex reactive)
- [ ] Skeleton loader pendant le chargement
- [ ] Page accessible uniquement aux ORG_ADMIN et ORG_MANAGER
- [ ] Responsive (2 colonnes mobile, 4 colonnes desktop pour les KPIs)

---

## 🚫 NE PAS FAIRE

- Ne pas utiliser de données mockées — toutes les valeurs viennent de Convex
- Ne pas charger les données véhicule par véhicule dans le frontend (tout agréger côté Convex)
- Ne pas oublier le guard ORG_ADMIN/MANAGER (un ORG_MEMBER ne doit pas voir ce dashboard)
- Ne pas utiliser un graphique tiers lourd — SVG inline ou layerchart si déjà installé
- Ne pas polluer les queries avec `console.log`

---

## 🧪 Tests requis

```typescript
// src/tests/dashboard.spec.ts
test('dashboard KPIs chargent avec vraies données', ...);
test('ORG_MEMBER redirigé depuis /admin/dashboard', ...);
test('activité récente s\'update sans refresh', ...);
```
