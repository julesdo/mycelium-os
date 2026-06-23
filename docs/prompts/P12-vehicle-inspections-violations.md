---
priority: 12
feature: État des lieux véhicule + Gestion des contraventions
sprint: S9 (V1.5)
version: V1.5 — Premiers payants
effort: 3 jours
depends_on: P01 (véhicules), P02 (réservations), P06 (notifications), P11 (conducteurs)
blocks: P15 (sinistres — liens avec inspections)
model_recommended: claude-sonnet-4-6
pricing_tier: Starter (290€/mois)
---

# P12 — État des lieux véhicule & Contraventions

## 🎯 Mission
Permettre aux salariés de photographier le véhicule au départ et au retour de chaque réservation, et permettre au gestionnaire de gérer les contraventions reçues en identifiant le conducteur automatiquement via le planning. Ce sont deux des principales sources de litiges dans les pools de véhicules d'entreprise — les résoudre documente tout et protège l'entreprise.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Table `reservations` avec statuts PENDING/CONFIRMED/IN_PROGRESS/COMPLETED/CANCELLED
- Table `vehicles` avec `status`
- Convex Storage déjà utilisé (P08 factures)
- Infrastructure notifications (P06)

**Ce qui manque :**
- Table `vehicleInspections` : photos guidées, relevé km, dommages
- Table `trafficViolations` : contraventions avec workflow
- UI conducteur : flow de départ/retour depuis `/app/reservations/[id]`
- UI admin : liste contraventions + workflow d'identification + prise en charge

---

## 🔒 Contraintes absolues

1. **Photos stockées dans Convex Storage** : jamais en base. Retourner des URLs temporaires via `ctx.storage.getUrl()`.
2. **Inspection liée à une réservation** : une inspection DEPARTURE doit correspondre à une réservation IN_PROGRESS. Une inspection RETURN à une réservation IN_PROGRESS ou COMPLETED.
3. **Identification conducteur** : pour une contravention, chercher la réservation active sur le véhicule à la date de la contravention — c'est ainsi qu'on identifie automatiquement le conducteur.
4. **Guard** : créer une inspection = conducteur de la réservation ou ORG_ADMIN. Gérer une contravention = ORG_ADMIN uniquement.
5. **Nouveaux types de notification** à ajouter au schema : `VIOLATION_RECEIVED`, `INSPECTION_REQUIRED`.

---

## 📊 Nouveaux schémas Convex

### `vehicleInspections`

```typescript
vehicleInspections: defineTable({
  organizationId: v.id('organizations'),
  vehicleId: v.id('vehicles'),
  reservationId: v.optional(v.id('reservations')),
  type: v.union(v.literal('DEPARTURE'), v.literal('RETURN'), v.literal('PERIODIC')),
  inspectedBy: v.string(), // userId conducteur ou admin
  kmAtInspection: v.optional(v.number()),
  fuelLevelPercent: v.optional(v.number()), // 0-100
  photos: v.array(v.object({
    angle: v.union(
      v.literal('FRONT'), v.literal('BACK'),
      v.literal('LEFT'), v.literal('RIGHT'),
      v.literal('INTERIOR'), v.literal('DASHBOARD')
    ),
    storageId: v.string()
  })),
  damages: v.optional(v.array(v.object({
    location: v.string(),        // 'pare-chocs avant', 'portière gauche'...
    description: v.string(),
    severity: v.union(
      v.literal('MINOR'), v.literal('MODERATE'), v.literal('MAJOR')
    ),
    isNew: v.boolean()           // true = dommage constaté sur RETURN absent au DEPARTURE
  }))),
  notes: v.optional(v.string()),
  createdAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_vehicle', ['vehicleId'])
  .index('by_reservation', ['reservationId'])
  .index('by_vehicle_and_type', ['vehicleId', 'type'])
  .index('by_org_and_created', ['organizationId', 'createdAt'])
```

### `trafficViolations`

```typescript
trafficViolations: defineTable({
  organizationId: v.id('organizations'),
  vehicleId: v.id('vehicles'),
  driverUserId: v.optional(v.string()),         // identifié automatiquement ou manuel
  reservationId: v.optional(v.id('reservations')),
  violationDate: v.number(),                    // timestamp de l'infraction
  amount: v.number(),                           // montant en euros
  description: v.string(),                      // type d'infraction
  reference: v.optional(v.string()),            // numéro de PV
  paymentDecision: v.optional(v.union(
    v.literal('COMPANY'),
    v.literal('DRIVER'),
    v.literal('PENDING')
  )),
  status: v.union(
    v.literal('RECEIVED'),
    v.literal('IDENTIFIED'),
    v.literal('NOTIFIED'),
    v.literal('PAID'),
    v.literal('CONTESTED'),
    v.literal('CLOSED')
  ),
  documentStorageId: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdBy: v.string(),  // admin qui a saisi
  createdAt: v.number(),
  updatedAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_vehicle', ['vehicleId'])
  .index('by_driver', ['driverUserId'])
  .index('by_org_and_status', ['organizationId', 'status'])
  .index('by_org_and_date', ['organizationId', 'violationDate'])
```

**⚠️ Schema change** : ajouter à `notifications.type` :
```typescript
v.literal('VIOLATION_RECEIVED'),
v.literal('INSPECTION_REQUIRED'),
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/schema.ts                            → 2 nouvelles tables + 2 notif types
src/lib/convex/inspections.ts                       → NOUVEAU
src/lib/convex/violations.ts                        → NOUVEAU
src/routes/[[lang]]/app/reservations/[id]/
  inspect/+page.svelte                              → état des lieux conducteur
src/routes/[[lang]]/admin/violations/
  +page.svelte                                      → liste contraventions
src/lib/components/inspections/
  inspection-photos.svelte                          → upload guidé 6 angles
  inspection-damages.svelte                         → signalement dommages
src/lib/components/violations/
  violation-form.svelte
  violation-table.svelte
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Mutations `inspections.ts`

```typescript
// Créer une inspection (départ ou retour)
export const createInspection = authedMutation({
  args: {
    reservationId: v.id('reservations'),
    type: v.union(v.literal('DEPARTURE'), v.literal('RETURN')),
    kmAtInspection: v.optional(v.number()),
    fuelLevelPercent: v.optional(v.number()),
    photos: v.array(v.object({
      angle: v.union(
        v.literal('FRONT'), v.literal('BACK'), v.literal('LEFT'),
        v.literal('RIGHT'), v.literal('INTERIOR'), v.literal('DASHBOARD')
      ),
      storageId: v.string()
    })),
    damages: v.optional(v.array(v.any())),
    notes: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getUserOrg(ctx);

    const reservation = await ctx.db.get(args.reservationId);
    if (!reservation || reservation.organizationId !== organizationId)
      throw new ConvexError('Réservation introuvable');

    // Vérifier que le user est le conducteur ou un admin
    const isDriver = reservation.userId === ctx.user._id;
    if (!isDriver) await requireOrgAdmin(ctx, organizationId);

    const now = Date.now();
    const inspectionId = await ctx.db.insert('vehicleInspections', {
      organizationId,
      vehicleId: reservation.vehicleId,
      reservationId: args.reservationId,
      type: args.type,
      inspectedBy: ctx.user._id,
      kmAtInspection: args.kmAtInspection,
      fuelLevelPercent: args.fuelLevelPercent,
      photos: args.photos,
      damages: args.damages,
      notes: args.notes,
      createdAt: now
    });

    // Si RETURN et dommages nouveaux → notification admin
    if (args.type === 'RETURN' && args.damages?.some(d => d.isNew)) {
      const members = await ctx.db
        .query('organizationMembers')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .filter(q => q.eq(q.field('role'), 'ORG_ADMIN'))
        .collect();
      for (const admin of members) {
        await ctx.db.insert('notifications', {
          organizationId,
          userId: admin.userId,
          type: 'CONFLICT_DETECTED', // réutiliser en attendant le nouveau type
          title: 'Nouveau dommage signalé',
          message: `Un dommage a été constaté lors du retour de la réservation.`,
          link: `/admin/reservations/${args.reservationId}`,
          isRead: false,
          createdAt: now
        });
      }
    }

    return inspectionId;
  }
});

// Query: inspections d'une réservation
export const getInspectionsForReservation = authedQuery({
  args: { reservationId: v.id('reservations') },
  handler: async (ctx, { reservationId }) => {
    const { organizationId } = await getUserOrg(ctx);
    const inspections = await ctx.db
      .query('vehicleInspections')
      .withIndex('by_reservation', q => q.eq('reservationId', reservationId))
      .collect();

    // Enrichir avec URLs photos
    return Promise.all(inspections.map(async (inspection) => ({
      ...inspection,
      photosWithUrls: await Promise.all(
        inspection.photos.map(async (p) => ({
          ...p,
          url: await ctx.storage.getUrl(p.storageId)
        }))
      )
    })));
  }
});
```

### Étape 2 — Mutations `violations.ts`

```typescript
export const createViolation = authedMutation({
  args: {
    vehicleId: v.id('vehicles'),
    violationDate: v.number(),
    amount: v.number(),
    description: v.string(),
    reference: v.optional(v.string()),
    documentStorageId: v.optional(v.string()),
    notes: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle || vehicle.organizationId !== organizationId)
      throw new ConvexError('Véhicule introuvable');

    // Identification automatique du conducteur via les réservations
    const reservation = await ctx.db
      .query('reservations')
      .withIndex('by_vehicle', q => q.eq('vehicleId', args.vehicleId))
      .filter(q =>
        q.and(
          q.lte(q.field('startDate'), args.violationDate),
          q.gte(q.field('endDate'), args.violationDate),
          q.neq(q.field('status'), 'CANCELLED')
        )
      )
      .first();

    const now = Date.now();
    const violationId = await ctx.db.insert('trafficViolations', {
      organizationId,
      vehicleId: args.vehicleId,
      driverUserId: reservation?.userId,
      reservationId: reservation?._id,
      violationDate: args.violationDate,
      amount: args.amount,
      description: args.description,
      reference: args.reference,
      documentStorageId: args.documentStorageId,
      notes: args.notes,
      status: reservation ? 'IDENTIFIED' : 'RECEIVED',
      paymentDecision: 'PENDING',
      createdBy: ctx.user._id,
      createdAt: now,
      updatedAt: now
    });

    return { violationId, identifiedDriver: reservation?.userId };
  }
});

// Notifier le conducteur et définir la prise en charge
export const processViolation = authedMutation({
  args: {
    violationId: v.id('trafficViolations'),
    paymentDecision: v.union(v.literal('COMPANY'), v.literal('DRIVER')),
    notes: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);

    const violation = await ctx.db.get(args.violationId);
    if (!violation || violation.organizationId !== organizationId)
      throw new ConvexError('Contravention introuvable');

    await ctx.db.patch(args.violationId, {
      paymentDecision: args.paymentDecision,
      status: 'NOTIFIED',
      notes: args.notes ?? violation.notes,
      updatedAt: Date.now()
    });

    // Notifier le conducteur si à sa charge
    if (args.paymentDecision === 'DRIVER' && violation.driverUserId) {
      await ctx.db.insert('notifications', {
        organizationId,
        userId: violation.driverUserId,
        type: 'VIOLATION_RECEIVED',
        title: `Contravention de ${violation.amount}€ à votre charge`,
        message: `Une contravention du ${new Date(violation.violationDate).toLocaleDateString('fr-FR')} vous est imputée. Contactez votre gestionnaire.`,
        link: '/app/profile',
        isRead: false,
        createdAt: Date.now()
      });
    }
  }
});
```

### Étape 3 — UI conducteur : état des lieux

Route : `/app/reservations/[id]/inspect` — accessible uniquement si réservation IN_PROGRESS ou CONFIRMED.

```
┌────────────────────────────────────────────────┐
│  État des lieux — Départ            Étape 1/3  │
├────────────────────────────────────────────────┤
│  📷 Photos obligatoires (6)                     │
│  [AVANT] [ARRIÈRE] [GAUCHE] [DROITE]            │
│  [INTÉRIEUR] [TABLEAU DE BORD]                  │
│                                                 │
│  Kilométrage au départ : [_____] km             │
│  Niveau carburant : [●●●●○○] 60%               │
├────────────────────────────────────────────────┤
│  [Annuler]                    [Suivant →]       │
└────────────────────────────────────────────────┘
```

Étape 2 : signalement de dommages pré-existants (optionnel).
Étape 3 : récapitulatif + confirmation.

### Étape 4 — UI admin : `/admin/violations`

```
┌──────────────────────────────────────────────────────────────┐
│  Contraventions (12)                [+ Saisir une contrav.]  │
├──────────────────────────────────────────────────────────────┤
│  Filtres: [Statut ▾] [Véhicule ▾] [Période ▾]               │
│  VÉHICULE       DATE       MONTANT  CONDUCTEUR   STATUT      │
│  Clio AB-123    12/05/26   90€      Jean D.      Notifié     │
│  308 CD-456     03/04/26   135€     ?            À identifier │
└──────────────────────────────────────────────────────────────┘
```

---

## ✅ Critères d'acceptation

- [ ] Conducteur peut photographier le véhicule (6 angles) au départ et retour d'une réservation
- [ ] Upload photos fonctionne via Convex Storage (pas de taille limite raisonnable dépassée)
- [ ] Dommage nouveau au retour → notification admin
- [ ] Admin peut saisir une contravention et le conducteur est identifié automatiquement via le planning
- [ ] Admin peut décider qui paie (entreprise ou conducteur)
- [ ] Si à charge du conducteur → notification in-app au conducteur
- [ ] Liste contraventions avec filtres statut/véhicule/période

---

## 🚫 NE PAS FAIRE

- Ne pas obliger les photos pour valider une réservation (pas encore MVP strict) — les rendre fortement recommandées
- Ne pas stocker les images en base64 — toujours Convex Storage
- Ne pas supprimer les inspections — elles servent de preuve légale, toujours archiver
- Ne pas tenter d'OCR des PV automatiquement (hors scope) — saisie manuelle uniquement
