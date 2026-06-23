---
priority: 2
feature: Système de réservations — Logique complète + détection de conflits
sprint: S3
version: V1 MVP
effort: 3 jours
depends_on: P01 (véhicules en base), schema.ts (reservations table complète)
blocks: P03 (Concierge a besoin des mutations), P05 (calendrier)
---

# P02 — Système de réservations (logique + conflits)

## 🎯 Mission
Implémenter la logique complète de réservation : création, modification, annulation, détection de conflits, et les vues côté salarié (/app) et côté admin (/admin/reservations). C'est le cœur métier du produit.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- `src/lib/convex/schema.ts` → table `reservations` complète
- `src/lib/convex/reservations.ts` → `listReservations` avec scope/status/date filters
- Routes créées : `/app/reservations`, `/app/reservations/new`, `/app/reservations/[id]`, `/admin/reservations`, `/admin/reservations/[id]`

**Ce qui manque :**
- Mutations Convex : `createReservation`, `updateReservation`, `cancelReservation`, `updateReservationStatus`
- Helper de détection de conflits (existe peut-être en `src/lib/convex/lib/reservations.ts`)
- UI côté salarié : créer / voir ses réservations
- UI côté admin : vue tableau de toutes les réservations
- Query `getAvailableVehicles(startDate, endDate, requirements)` pour le Concierge

---

## 🔒 Contraintes absolues

1. **Détection de conflits obligatoire** : avant chaque `createReservation` et `updateReservation`, vérifier qu'aucune réservation active (statuts PENDING, CONFIRMED, IN_PROGRESS) ne chevauche la même période sur le même véhicule
2. **Multi-tenancy** : `getUserOrg(ctx)` en premier dans chaque handler
3. **Scope** : un ORG_MEMBER ne peut voir que SES réservations, un ORG_ADMIN voit tout
4. **Timestamps** : `startDate` et `endDate` sont des timestamps Unix en millisecondes
5. **Auto-confirm** : pour le MVP, toute réservation créée passe directement à `CONFIRMED`

---

## 📊 Schéma Convex exact — table `reservations`

```typescript
reservations: defineTable({
  organizationId: v.id('organizations'),
  vehicleId: v.id('vehicles'),
  userId: v.string(),          // Better Auth string ID
  startDate: v.number(),       // timestamp ms
  endDate: v.number(),         // timestamp ms
  purpose: v.string(),         // motif du trajet
  status: v.union(
    v.literal('PENDING'),
    v.literal('CONFIRMED'),
    v.literal('IN_PROGRESS'),
    v.literal('COMPLETED'),
    v.literal('CANCELLED')
  ),
  notes: v.optional(v.string()),
  googleCalendarEventId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_vehicle', ['vehicleId'])
  .index('by_user', ['userId'])
  .index('by_vehicle_and_dates', ['vehicleId', 'startDate', 'endDate'])
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/reservations.ts              → ajouter mutations + query availableVehicles
src/lib/convex/lib/reservations.ts          → helper hasConflict (existe peut-être déjà)
src/routes/[[lang]]/app/reservations/+page.svelte
src/routes/[[lang]]/app/reservations/new/+page.svelte
src/routes/[[lang]]/app/reservations/[id]/+page.svelte
src/routes/[[lang]]/admin/reservations/+page.svelte
src/routes/[[lang]]/admin/reservations/[id]/+page.svelte
src/lib/components/reservations/
  reservation-card.svelte
  reservation-form.svelte
  reservation-status-badge.svelte
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Helper de détection de conflits

```typescript
// src/lib/convex/lib/reservations.ts
export function hasConflict(
  existing: { startDate: number; endDate: number; status: string },
  newStart: number,
  newEnd: number
): boolean {
  // Statuts actifs qui bloquent
  const activeStatuses = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];
  if (!activeStatuses.includes(existing.status)) return false;
  // Chevauchement : les périodes se croisent si startA < endB ET endA > startB
  return existing.startDate < newEnd && existing.endDate > newStart;
}
```

### Étape 2 — Query `getAvailableVehicles` (nécessaire pour le Concierge P03)

```typescript
export const getAvailableVehicles = authedQuery({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    category: v.optional(v.union(v.literal('PASSENGER'), v.literal('UTILITY'), v.literal('TRUCK'))),
    energy: v.optional(v.union(v.literal('THERMAL'), v.literal('HYBRID'), v.literal('ELECTRIC')))
  },
  handler: async (ctx, { startDate, endDate, category, energy }) => {
    const { organizationId } = await getUserOrg(ctx);
    
    // 1. Tous les véhicules disponibles de l'org
    let vehicles = await ctx.db
      .query('vehicles')
      .withIndex('by_org_and_status', q => q.eq('organizationId', organizationId).eq('status', 'AVAILABLE'))
      .collect();
    
    // 2. Filtres optionnels
    if (category) vehicles = vehicles.filter(v => v.category === category);
    if (energy) vehicles = vehicles.filter(v => v.energy === energy);
    
    // 3. Exclure ceux qui ont une réservation active qui chevauche la période
    const available = await Promise.all(vehicles.map(async (vehicle) => {
      const conflicts = await ctx.db
        .query('reservations')
        .withIndex('by_vehicle', q => q.eq('vehicleId', vehicle._id))
        .collect();
      
      const hasActiveConflict = conflicts.some(r => hasConflict(r, startDate, endDate));
      return hasActiveConflict ? null : vehicle;
    }));
    
    return available.filter((v): v is NonNullable<typeof v> => v !== null);
  }
});
```

### Étape 3 — Mutation `createReservation`

```typescript
export const createReservation = authedMutation({
  args: {
    vehicleId: v.id('vehicles'),
    startDate: v.number(),
    endDate: v.number(),
    purpose: v.string(),
    notes: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getUserOrg(ctx);
    
    if (args.startDate >= args.endDate) throw new ConvexError('La date de fin doit être après la date de début');
    if (args.startDate < Date.now()) throw new ConvexError('Impossible de réserver dans le passé');
    
    // Vérifier que le véhicule appartient à l'org
    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle || vehicle.organizationId !== organizationId) throw new ConvexError('Véhicule introuvable');
    if (vehicle.status !== 'AVAILABLE') throw new ConvexError(`Ce véhicule est ${vehicle.status}`);
    
    // Vérifier les conflits
    const existingReservations = await ctx.db
      .query('reservations')
      .withIndex('by_vehicle', q => q.eq('vehicleId', args.vehicleId))
      .collect();
    
    const conflict = existingReservations.find(r => hasConflict(r, args.startDate, args.endDate));
    if (conflict) throw new ConvexError('Ce véhicule est déjà réservé sur cette période');
    
    const now = Date.now();
    const reservationId = await ctx.db.insert('reservations', {
      organizationId,
      vehicleId: args.vehicleId,
      userId: ctx.user._id,
      startDate: args.startDate,
      endDate: args.endDate,
      purpose: args.purpose,
      notes: args.notes,
      status: 'CONFIRMED', // Auto-confirm MVP
      createdAt: now,
      updatedAt: now
    });
    
    // Déclencher notification de confirmation (appel interne)
    await ctx.scheduler.runAfter(0, internal.notifications.sendReservationConfirmed, {
      reservationId,
      userId: ctx.user._id,
      organizationId
    });
    
    return reservationId;
  }
});
```

### Étape 4 — Mutation `cancelReservation`

```typescript
export const cancelReservation = authedMutation({
  args: { reservationId: v.id('reservations') },
  handler: async (ctx, { reservationId }) => {
    const { organizationId } = await getUserOrg(ctx);
    const reservation = await ctx.db.get(reservationId);
    
    if (!reservation || reservation.organizationId !== organizationId)
      throw new ConvexError('Réservation introuvable');
    
    // Un salarié ne peut annuler que les siennes, un admin peut tout annuler
    const membership = await ctx.db.query('organizationMembers')
      .withIndex('by_org_and_user', q => q.eq('organizationId', organizationId).eq('userId', ctx.user._id))
      .unique();
    
    const isAdmin = membership?.role === 'ORG_ADMIN' || membership?.role === 'ORG_MANAGER';
    if (!isAdmin && reservation.userId !== ctx.user._id)
      throw new ConvexError('Accès refusé');
    
    if (reservation.status === 'IN_PROGRESS')
      throw new ConvexError('Impossible d\'annuler une réservation en cours');
    
    await ctx.db.patch(reservationId, { status: 'CANCELLED', updatedAt: Date.now() });
  }
});
```

### Étape 5 — Vue salarié `/app/reservations`

Onglets : "À venir" | "En cours" | "Passées" | "Annulées"

Card de réservation :
```
[Véhicule : Renault Clio — AB-123-CD]
[Du 14 jan. 09:00 → au 14 jan. 18:00]
[Motif : Rendez-vous client Lyon]
[Statut : CONFIRMED (badge vert)]
[Bouton "Annuler" si statut CONFIRMED et date > now]
```

### Étape 6 — Vue admin `/admin/reservations`

Tableau avec colonnes : Véhicule | Salarié | Du | Au | Motif | Statut | Actions
Filtres : statut, véhicule, date range, salarié
Bouton "Créer une réservation" pour admin

---

## ✅ Critères d'acceptation

- [ ] Impossible de créer deux réservations qui se chevauchent sur le même véhicule
- [ ] Un salarié ne voit que ses réservations dans `/app/reservations`
- [ ] Un ORG_ADMIN voit toutes les réservations dans `/admin/reservations`
- [ ] Annulation impossible si réservation IN_PROGRESS
- [ ] Un salarié ne peut pas annuler la réservation d'un autre
- [ ] `getAvailableVehicles(startDate, endDate)` retourne uniquement les véhicules sans conflit
- [ ] Les timestamps sont correctement interprétés en timezone Europe/Paris (affichage seulement)

---

## 🚫 NE PAS FAIRE

- Ne pas permettre de modifier les dates d'une réservation `IN_PROGRESS` ou `COMPLETED`
- Ne pas supprimer physiquement les réservations (status `CANCELLED`)
- Ne pas bypass la détection de conflits dans le Concierge
- Ne pas exposer les réservations des autres orgs
- Ne pas stocker les dates en string ISO — utiliser les timestamps Unix (`.number()`)
- Ne pas négliger le check `organizationId` sur le vehicleId (un user pourrait soumettre un vehicleId d'une autre org)

---

## 🧪 Tests requis

```typescript
// src/tests/reservations.spec.ts
test('créer une réservation sur un véhicule disponible', ...);
test('conflit détecté sur même véhicule même créneau', ...);
test('annulation par le propriétaire', ...);
test('annulation refusée si IN_PROGRESS', ...);
test('salarié ne peut pas voir les réservations des autres', ...);
test('getAvailableVehicles exclut les véhicules conflictuels', ...);
```
