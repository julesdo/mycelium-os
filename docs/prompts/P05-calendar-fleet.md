---
priority: 5
feature: Calendrier flotte — Vue resource view admin
sprint: S5
version: V1 MVP
effort: 3 jours
depends_on: P01 (véhicules), P02 (réservations avec mutations)
blocks: —
---

# P05 — Calendrier flotte (resource view)

## 🎯 Mission
Vue calendrier dans `/admin/reservations` où chaque ligne = un véhicule, chaque colonne = un créneau horaire. L'admin voit en un coup d'œil qui utilise quoi et quand, peut créer/déplacer des réservations directement depuis la vue.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Route `/admin/reservations/+page.svelte` (probablement shell)
- Toutes les mutations réservations (P02)
- Données véhicules + réservations en base

**Ce qui manque :**
- Composant calendrier resource view
- Query `getFleetCalendar(startDate, endDate)` qui retourne véhicules + réservations
- Interactions : clic sur créneau vide → modale création, clic sur réservation → détail

---

## 🔒 Contraintes absolues

1. **Pas de lib externe de calendrier** (FullCalendar, DHTMLX, etc.) — trop lourdes, trop de config, CSS incompatible avec Tailwind v4. Construire en SVG/CSS grid.
2. **Performance** : ne charger que la semaine/période visible (pas toutes les réservations)
3. **Guard admin** : page réservée ORG_ADMIN et ORG_MANAGER
4. **Responsive** : vue semaine sur desktop, vue jour sur mobile
5. **Pas de drag & drop pour le MVP** — interaciton click-to-create uniquement

---

## 📊 Query Convex `getFleetCalendar`

```typescript
// src/lib/convex/reservations.ts — ajouter cette query
export const getFleetCalendar = authedQuery({
  args: {
    startDate: v.number(),   // timestamp début de la période visible
    endDate: v.number()      // timestamp fin de la période visible
  },
  handler: async (ctx, { startDate, endDate }) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdminOrManager(ctx, organizationId);
    
    const [vehicles, reservations] = await Promise.all([
      ctx.db.query('vehicles')
        .withIndex('by_org_and_status', q =>
          q.eq('organizationId', organizationId).eq('status', 'AVAILABLE')
        )
        .collect(),
      ctx.db.query('reservations')
        .withIndex('by_org', q => q.eq('organizationId', organizationId))
        .filter(q =>
          q.and(
            q.lt(q.field('startDate'), endDate),
            q.gt(q.field('endDate'), startDate),
            q.neq(q.field('status'), 'CANCELLED')
          )
        )
        .collect()
    ]);
    
    // Inclure aussi les véhicules IN_USE et MAINTENANCE pour la vue complète
    const allVehicles = await ctx.db
      .query('vehicles')
      .withIndex('by_org', q => q.eq('organizationId', organizationId))
      .filter(q => q.neq(q.field('status'), 'RETIRED'))
      .collect();
    
    return {
      vehicles: allVehicles.map(v => ({
        _id: v._id,
        label: `${v.brand} ${v.model}`,
        registration: v.registration,
        status: v.status,
        energy: v.energy
      })),
      reservations: reservations.map(r => ({
        _id: r._id,
        vehicleId: r.vehicleId,
        userId: r.userId,
        startDate: r.startDate,
        endDate: r.endDate,
        status: r.status,
        purpose: r.purpose
      }))
    };
  }
});
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/reservations.ts                  → ajouter getFleetCalendar
src/routes/[[lang]]/admin/reservations/+page.svelte
src/lib/components/calendar/
  fleet-calendar.svelte                         → composant principal
  calendar-header.svelte                        → navigation semaine + switcher vue
  calendar-vehicle-row.svelte                   → ligne par véhicule
  reservation-block.svelte                      → bloc coloré pour une réservation
  create-reservation-modal.svelte               → modale création rapide
```

---

## 🔨 Architecture du composant calendrier

### Principe de rendu

Le calendrier est une grille CSS :
- Colonne 1 fixe : label véhicule (120px)
- Colonnes 2..N : créneaux temporels (heures ou jours selon la vue)
- Chaque ligne : un véhicule
- Les réservations sont des blocs positionnés en `position: absolute` dans leur cellule parent

### Structure HTML/CSS

```svelte
<!-- fleet-calendar.svelte -->
<script lang="ts">
  import type { CalendarData } from './types';

  let { data }: { data: CalendarData } = $props();

  // Vue semaine : 7 jours × 24h → simplifier en vue journée par défaut pour MVP
  let viewMode = $state<'week' | 'day'>('week');
  let currentDate = $state(new Date());

  // Calculer les jours visibles
  let visibleDays = $derived(() => {
    if (viewMode === 'week') {
      // Lundi de la semaine courante
      const monday = new Date(currentDate);
      monday.setDate(currentDate.getDate() - currentDate.getDay() + 1);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return d;
      });
    } else {
      return [currentDate];
    }
  });

  function getReservationsForVehicleAndDay(vehicleId: string, day: Date) {
    const dayStart = new Date(day).setHours(0, 0, 0, 0);
    const dayEnd = new Date(day).setHours(23, 59, 59, 999);
    return data.reservations.filter(r =>
      r.vehicleId === vehicleId &&
      r.startDate < dayEnd &&
      r.endDate > dayStart
    );
  }
</script>

<div class="fleet-calendar">
  <!-- Header navigation -->
  <div class="flex items-center gap-4 mb-4">
    <button onclick={() => navigate(-1)}>←</button>
    <span class="font-medium">{formatPeriodLabel(currentDate, viewMode)}</span>
    <button onclick={() => navigate(1)}>→</button>
    <button onclick={() => currentDate = new Date()}>Aujourd'hui</button>
    <div class="ml-auto flex gap-2">
      <button class:active={viewMode === 'week'} onclick={() => viewMode = 'week'}>Semaine</button>
      <button class:active={viewMode === 'day'} onclick={() => viewMode = 'day'}>Jour</button>
    </div>
  </div>

  <!-- Grille -->
  <div class="overflow-x-auto">
    <div class="min-w-[800px]">
      <!-- Ligne en-tête des jours -->
      <div class="grid" style="grid-template-columns: 160px repeat({visibleDays.length}, 1fr)">
        <div class="p-2 text-sm text-muted-foreground">Véhicule</div>
        {#each visibleDays as day}
          <div class="p-2 text-center text-sm font-medium border-l">
            {day.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
          </div>
        {/each}
      </div>

      <!-- Ligne par véhicule -->
      {#each data.vehicles as vehicle}
        <div class="grid border-t" style="grid-template-columns: 160px repeat({visibleDays.length}, 1fr)">
          <div class="p-2 text-sm flex items-center gap-2">
            <span class="font-medium">{vehicle.label}</span>
            <span class="text-xs text-muted-foreground">{vehicle.registration}</span>
          </div>
          {#each visibleDays as day}
            {@const reservations = getReservationsForVehicleAndDay(vehicle._id, day)}
            <div
              class="relative min-h-[48px] border-l p-1 cursor-pointer hover:bg-muted/30"
              onclick={() => handleCellClick(vehicle._id, day)}
            >
              {#each reservations as reservation}
                <ReservationBlock {reservation} />
              {/each}
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </div>
</div>
```

### Couleurs des réservations par statut

```typescript
const STATUS_COLORS = {
  CONFIRMED: 'bg-blue-500/20 border-blue-500 text-blue-700',
  IN_PROGRESS: 'bg-green-500/20 border-green-500 text-green-700',
  COMPLETED: 'bg-gray-500/20 border-gray-500 text-gray-600',
  PENDING: 'bg-yellow-500/20 border-yellow-500 text-yellow-700',
  CANCELLED: 'bg-red-500/20 border-red-500 text-red-600'
} as const;
```

### Modale création rapide (clic sur créneau vide)

```svelte
<!-- create-reservation-modal.svelte -->
<!-- Champs : véhicule (pre-rempli), date/heure début, date/heure fin, motif -->
<!-- Bouton "Créer la réservation" → mutation createReservation -->
<!-- Afficher les erreurs de conflit inline -->
```

---

## ✅ Critères d'acceptation

- [ ] Vue semaine avec 7 colonnes (un jour chacune) et une ligne par véhicule
- [ ] Les réservations s'affichent avec couleur par statut
- [ ] Clic sur un créneau vide ouvre la modale de création
- [ ] Clic sur une réservation ouvre le détail (lien vers `/admin/reservations/[id]`)
- [ ] Navigation semaine précédente / suivante / aujourd'hui
- [ ] Filtres : par site, par énergie (chips au-dessus du calendrier)
- [ ] Skeleton loader pendant le chargement initial
- [ ] Accessible uniquement aux ORG_ADMIN et ORG_MANAGER

---

## 🚫 NE PAS FAIRE

- Ne pas installer FullCalendar, DHTMLX, Bryntum ou tout autre calendrier tiers
- Ne pas charger TOUTES les réservations de l'org — filtrer par la période visible uniquement
- Pas de drag & drop pour le MVP (trop complexe, peu de valeur immédiate)
- Ne pas oublier les véhicules MAINTENANCE et IN_USE dans la vue (les afficher grisés)
- Ne pas faire une vue responsive complexe — vue semaine desktop, vue jour mobile

---

## 🧪 Tests requis

```typescript
test('vue semaine affiche les 7 jours', ...);
test('réservation apparaît sur le bon créneau', ...);
test('clic créneau vide ouvre modale', ...);
test('navigation semaine précédente/suivante', ...);
```
