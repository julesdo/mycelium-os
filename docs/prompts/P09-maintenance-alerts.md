---
priority: 9
feature: Maintenance & alertes conformité — Entretiens + alertes automatiques
sprint: S7 (V1.5)
version: V1.5 — Premiers payants
effort: 3 jours
depends_on: P01 (véhicules), P06 (notifications), schema.ts (maintenanceRecords complet)
blocks: P10 (Optimiseur utilise les données maintenance)
---

# P09 — Maintenance & alertes conformité

## 🎯 Mission
Donner au gestionnaire un carnet d'entretien numérique par véhicule et générer automatiquement les alertes de maintenance (kilométrage, date), contrôles techniques et leasing expirants. C'est ce qui justifie l'abonnement même "quand le produit marche tout seul" — les alertes arrivent sans action de l'admin.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Tables `maintenanceRecords`, `maintenanceSchedules`, `vehicleMaintenanceConfig`, `garages` complètes
- `src/lib/convex/maintenance.ts` (vérifier le contenu)
- Routes `/admin/maintenance` et `/admin/maintenance/[id]` (shells)
- Notifications table + infrastructure (P06)

**Ce qui manque :**
- Mutations `createMaintenanceRecord`, `updateMaintenanceRecord`, `completeMaintenanceRecord`
- Cron `checkMaintenanceDue` tournant une fois par jour
- Query `getMaintenanceDashboard`
- UI `/admin/maintenance` : tableau + alertes
- Génération automatique de notifications MAINTENANCE_DUE et LEASE_EXPIRING

---

## 🔒 Contraintes absolues

1. **Crons** : `checkMaintenanceDue` tourne une fois par jour à 8h00 Paris (UTC+1/2 selon saison). Utiliser `crons.daily` de Convex.
2. **Pas de doublon d'alerte** : vérifier qu'une notification MAINTENANCE_DUE pour un véhicule donné n'a pas déjà été envoyée dans les 7 derniers jours avant d'en créer une nouvelle.
3. **Seuils d'alerte** par défaut (configurables par vehicle) :
   - Entretien : 30 jours ou kilométrage < 2000km du prochain entretien
   - Leasing : 90 jours avant expiration
   - CT : 60 jours avant expiration (futur champ)
4. **Guard** : saisir/modifier maintenance = ORG_ADMIN. Voir la liste = ORG_ADMIN + ORG_MANAGER.

---

## 📊 Schémas Convex exacts

### `maintenanceRecords`

```typescript
maintenanceRecords: defineTable({
  organizationId: v.id('organizations'),
  vehicleId: v.id('vehicles'),
  maintenanceType: v.union(
    v.literal('REVISION'), v.literal('VIDANGE'), v.literal('PNEUS'),
    v.literal('FREINS'), v.literal('AUTRE')
  ),
  scheduledDate: v.number(),          // timestamp ms date planifiée
  completedDate: v.optional(v.number()),
  garageId: v.optional(v.id('garages')),
  costEstimate: v.optional(v.number()),
  costActual: v.optional(v.number()),
  invoiceStorageId: v.optional(v.string()),
  notes: v.optional(v.string()),
  status: v.union(
    v.literal('SCHEDULED'), v.literal('IN_PROGRESS'),
    v.literal('COMPLETED'), v.literal('CANCELLED')
  ),
  scheduledBy: v.string(),           // userId
  createdAt: v.number(),
  updatedAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_org_and_status', ['organizationId', 'status'])
  .index('by_vehicle', ['vehicleId'])
  .index('by_org_and_scheduled', ['organizationId', 'scheduledDate'])
```

### `vehicleMaintenanceConfig`

```typescript
vehicleMaintenanceConfig: defineTable({
  vehicleId: v.id('vehicles'),
  organizationId: v.id('organizations'),
  lastRevisionKm: v.optional(v.number()),
  lastRevisionDate: v.optional(v.number()),
  lastVidangeKm: v.optional(v.number()),
  lastVidangeDate: v.optional(v.number()),
  lastPneusDate: v.optional(v.number()),
  lastFreinsDate: v.optional(v.number()),
  customIntervalKm: v.optional(v.number()),      // override règle générique km
  customIntervalMonths: v.optional(v.number()),  // override règle générique mois
  updatedAt: v.number()
})
  .index('by_vehicle', ['vehicleId'])
  .index('by_org', ['organizationId'])
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/maintenance.ts                → mutations + queries + cron handler
src/lib/convex/crons.ts                      → ajouter daily check maintenance
src/routes/[[lang]]/admin/maintenance/+page.svelte
src/routes/[[lang]]/admin/maintenance/[id]/+page.svelte
src/lib/components/maintenance/
  maintenance-table.svelte
  maintenance-form.svelte
  maintenance-status-badge.svelte
  vehicle-maintenance-card.svelte             → résumé entretien par véhicule
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Mutations essentielles

```typescript
// createMaintenanceRecord
export const createMaintenanceRecord = authedMutation({
  args: {
    vehicleId: v.id('vehicles'),
    maintenanceType: maintenanceTypeValidator,
    scheduledDate: v.number(),
    garageId: v.optional(v.id('garages')),
    costEstimate: v.optional(v.number()),
    notes: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);
    
    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle || vehicle.organizationId !== organizationId)
      throw new ConvexError('Véhicule introuvable');
    
    const now = Date.now();
    return ctx.db.insert('maintenanceRecords', {
      organizationId,
      ...args,
      status: 'SCHEDULED',
      scheduledBy: ctx.user._id,
      createdAt: now,
      updatedAt: now
    });
  }
});

// completeMaintenanceRecord
export const completeMaintenanceRecord = authedMutation({
  args: {
    recordId: v.id('maintenanceRecords'),
    costActual: v.optional(v.number()),
    notes: v.optional(v.string()),
    invoiceStorageId: v.optional(v.string())
  },
  handler: async (ctx, { recordId, costActual, notes, invoiceStorageId }) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);
    
    const record = await ctx.db.get(recordId);
    if (!record || record.organizationId !== organizationId)
      throw new ConvexError('Enregistrement introuvable');
    
    await ctx.db.patch(recordId, {
      status: 'COMPLETED',
      completedDate: Date.now(),
      costActual,
      notes: notes ?? record.notes,
      invoiceStorageId: invoiceStorageId ?? record.invoiceStorageId,
      updatedAt: Date.now()
    });
    
    // Mettre à jour le véhicule si entretien relevé kilométrage
    // (mettre à jour vehicleMaintenanceConfig.lastRevisionDate etc.)
  }
});
```

### Étape 2 — Cron quotidien de détection des alertes

```typescript
// src/lib/convex/crons.ts
crons.daily('maintenance-check', { hourUTC: 7, minuteUTC: 0 }, internal.maintenance.checkAllMaintenanceDue);
crons.daily('leasing-check', { hourUTC: 7, minuteUTC: 30 }, internal.maintenance.checkAllLeasingExpiring);
```

```typescript
// internal action checkAllMaintenanceDue
export const checkAllMaintenanceDue = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    
    // Charger tous les véhicules actifs (par organisation)
    // Pour chaque véhicule avec maintenanceDueDate proche :
    //   1. Vérifier si une notif MAINTENANCE_DUE a été créée dans les 7 derniers jours
    //   2. Si non → créer la notification via internal.notifications.createNotification
    
    // Note : Convex actions ne peuvent pas faire de queries directement sur toutes les orgs
    // Utiliser ctx.runQuery(internal.maintenance.getVehiclesNeedingMaintenance, {})
  }
});
```

### Étape 3 — Query `getMaintenanceDashboard`

```typescript
export const getMaintenanceDashboard = authedQuery({
  args: {},
  handler: async (ctx) => {
    const { organizationId } = await getUserOrg(ctx);
    const now = Date.now();
    
    const [upcomingRecords, overdueVehicles] = await Promise.all([
      // Entretiens planifiés dans les 30 prochains jours
      ctx.db.query('maintenanceRecords')
        .withIndex('by_org_and_scheduled', q =>
          q.eq('organizationId', organizationId)
           .gte('scheduledDate', now)
           .lte('scheduledDate', now + 30 * 24 * 60 * 60 * 1000)
        )
        .filter(q => q.eq(q.field('status'), 'SCHEDULED'))
        .collect(),
      // Véhicules avec maintenanceDueDate dépassée
      ctx.db.query('vehicles')
        .withIndex('by_org', q => q.eq('organizationId', organizationId))
        .filter(q => q.lt(q.field('maintenanceDueDate'), new Date(now).toISOString().split('T')[0]))
        .collect()
    ]);
    
    return { upcomingRecords, overdueVehicles };
  }
});
```

### Étape 4 — UI `/admin/maintenance`

Layout :
```
┌─────────────────────────────────────────────────────────────────┐
│  Maintenance & Conformité           [+ Planifier un entretien]  │
├─────────────────────────────────────────────────────────────────┤
│  🔴 Alertes (3)                                                  │
│  ⚠️ Renault Clio AB-123-CD — Entretien en retard de 5 jours     │
│  ⚠️ Peugeot 308 ZZ-789-AB — Leasing expire dans 18 jours        │
├─────────────────────────────────────────────────────────────────┤
│  Entretiens planifiés (7)           Filtres: [Statut ▾][Type ▾] │
│  [Tableau : véhicule | type | date | statut | coût estimé | ⚙️] │
├─────────────────────────────────────────────────────────────────┤
│  Historique récent (10 derniers)                                 │
│  [Tableau compact]                                               │
└────────────────────────────────────────────────────────────────┘
```

---

## ✅ Critères d'acceptation

- [ ] Planifier un entretien depuis la page maintenance
- [ ] Compléter un entretien avec coût réel et notes
- [ ] Alertes MAINTENANCE_DUE et LEASE_EXPIRING générées automatiquement quotidiennement
- [ ] Pas de doublon d'alerte si l'entretien a déjà été notifié dans les 7 derniers jours
- [ ] Vue dashboard avec les entretiens à venir (30 jours) et les alertes actives
- [ ] Accessible ORG_ADMIN + ORG_MANAGER, modification ORG_ADMIN uniquement

---

## 🚫 NE PAS FAIRE

- Ne pas générer des alertes en boucle (vérifier les doublons avant)
- Ne pas tenter de supprimer physiquement les records d'entretien (historique précieux)
- Ne pas oublier le guard organizationId sur chaque query
- Ne pas confondre `scheduledDate` (timestamp) et `maintenanceDueDate` dans vehicles (ISO string)

---

## 🧪 Tests requis

```typescript
test('créer un entretien planifié', ...);
test('compléter un entretien', ...);
test('cron génère une alerte si leasing expire dans 30 jours', ...);
test('pas de doublon d\'alerte sur 7 jours', ...);
```

---

## 💡 Types d'entretien — Labels français

```typescript
export const MAINTENANCE_TYPE_LABELS = {
  REVISION: 'Révision générale',
  VIDANGE: 'Vidange',
  PNEUS: 'Pneumatiques',
  FREINS: 'Freins',
  AUTRE: 'Autre entretien'
};
```
