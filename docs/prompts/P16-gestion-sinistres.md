---
priority: 16
feature: Gestion des sinistres — Déclaration guidée + workflow assureur
sprint: S12 (V2)
version: V2 — Indispensable au DAF
effort: 3 jours
depends_on: P01 (véhicules), P02 (réservations), P06 (notifications), P12 (inspections photos)
blocks: P18 (optimisation fiscale — franchise = coût véhicule)
model_recommended: claude-sonnet-4-6
pricing_tier: Pro (590€/mois) et supérieur
---

# P16 — Gestion des sinistres

## 🎯 Mission

Permettre à un salarié de **déclarer un sinistre en moins de 5 minutes** depuis son mobile : photos guidées, description de l'accident, constat amiable assisté. L'admin suit le dossier (statut, franchise, assureur) depuis l'espace admin. Le tout sans email manuel ni papier.

**Exemple de valeur :**
> Jean-Pierre accroche un pilier de parking avec le Clio AB-123. Il ouvre Mycelium, clique "Déclarer un sinistre", prend 4 photos guidées, remplit le constat en 3 minutes. L'admin reçoit immédiatement une notification, voit les photos, contacte l'assureur avec le dossier complet. La franchise de 500€ est automatiquement enregistrée comme coût du véhicule.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Table `vehicles` avec statuts
- Table `vehicleInspections` avec photos Convex Storage (P12)
- Infrastructure notifications (P06)
- Table `costs` pour imputer la franchise (P08)
- Pattern upload Convex Storage déjà utilisé

**Ce qui manque :**
- Table `incidents` : déclaration sinistre complète
- Workflow statuts : DECLARED → EXPERTISE → REPAIR → CLOSED / CONTESTED
- Page salarié `/app/incidents/new` : déclaration guidée
- Page admin `/admin/incidents` : liste + suivi dossiers
- Email automatique vers assureur (template formaté)
- Imputation automatique franchise dans `costs`

---

## 🔒 Contraintes absolues

1. **Photos Convex Storage uniquement** : jamais de base64. Max 10 photos par sinistre.
2. **Déclaration par le conducteur OU un admin** : vérifier que le déclarant est soit `reservation.userId` soit ORG_ADMIN.
3. **Imputation franchise** : à la clôture du sinistre avec `franchiseAmount > 0`, créer automatiquement un `cost` de catégorie `SINISTRE` lié au véhicule.
4. **Email assureur** : envoi via Resend avec template HTML. L'admin configure l'email assureur dans les settings de l'organisation ou dans le formulaire sinistre.
5. **Guard multi-tenant** : toutes les queries filtrent par `organizationId`.
6. **Nouveau type notification** : `INCIDENT_DECLARED` à ajouter au schema `notifications.type`.

---

## 📊 Nouveau schéma Convex

### `incidents`

```typescript
incidents: defineTable({
  organizationId: v.id('organizations'),
  vehicleId: v.id('vehicles'),
  reportedBy: v.string(),                // userId conducteur ou admin
  reservationId: v.optional(v.id('reservations')),
  
  // Circonstances
  incidentDate: v.number(),              // timestamp
  location: v.string(),                  // lieu de l'accident
  description: v.string(),              // description libre
  thirdPartyInvolved: v.boolean(),
  thirdPartyInfo: v.optional(v.string()),// nom, plaque, assurance tiers
  
  // Photos & documents
  photos: v.array(v.object({
    label: v.string(),  // 'Dommage avant', 'Vue générale', etc.
    storageId: v.string()
  })),
  documentsStorageIds: v.optional(v.array(v.string())),  // constat PDF, etc.
  
  // Gestion assurantielle
  insurerEmail: v.optional(v.string()),  // email assureur
  insurerReference: v.optional(v.string()),
  franchiseAmount: v.optional(v.number()),
  estimatedRepairCost: v.optional(v.number()),
  
  // Statut
  status: v.union(
    v.literal('DECLARED'),
    v.literal('SENT_TO_INSURER'),
    v.literal('EXPERTISE'),
    v.literal('REPAIR'),
    v.literal('CLOSED'),
    v.literal('CONTESTED')
  ),
  closedAt: v.optional(v.number()),
  closingNotes: v.optional(v.string()),
  
  createdAt: v.number(),
  updatedAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_vehicle', ['vehicleId'])
  .index('by_reporter', ['reportedBy'])
  .index('by_org_and_status', ['organizationId', 'status'])
  .index('by_org_and_date', ['organizationId', 'incidentDate'])
```

**⚠️ Schema changes requises :**

```typescript
// Dans notifications.type, ajouter :
v.literal('INCIDENT_DECLARED'),

// Dans vehicles, ajouter :
activeIncidentId: v.optional(v.id('incidents')),
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/schema.ts                          → incidents + 1 notif type + vehicles.activeIncidentId
src/lib/convex/incidents.ts                       → NOUVEAU : mutations + queries + action email
src/lib/convex/costs.ts                           → MODIFIER : ajouter createCostFromIncident (internal)

src/routes/[[lang]]/app/incidents/
  new/+page.svelte                                → wizard déclaration 3 étapes
src/routes/[[lang]]/admin/incidents/
  +page.svelte                                    → liste sinistres + KPIs
  [id]/+page.svelte                               → détail dossier sinistre

src/lib/components/incidents/
  incident-declaration-wizard.svelte              → wizard 3 étapes
  incident-photos-upload.svelte                   → upload guidé avec labels
  incident-status-badge.svelte                    → badge coloré par statut
  incident-timeline.svelte                        → timeline dossier admin
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Mutations `incidents.ts`

```typescript
// src/lib/convex/incidents.ts

export const declareIncident = authedMutation({
  args: {
    vehicleId: v.id('vehicles'),
    reservationId: v.optional(v.id('reservations')),
    incidentDate: v.number(),
    location: v.string(),
    description: v.string(),
    thirdPartyInvolved: v.boolean(),
    thirdPartyInfo: v.optional(v.string()),
    photos: v.array(v.object({ label: v.string(), storageId: v.string() }))
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getUserOrg(ctx);

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle || vehicle.organizationId !== organizationId)
      throw new ConvexError('Véhicule introuvable');

    // Vérifier que le déclarant conduit ce véhicule (ou est admin)
    if (args.reservationId) {
      const reservation = await ctx.db.get(args.reservationId);
      const isDriver = reservation?.userId === ctx.user._id;
      if (!isDriver) await requireOrgAdmin(ctx, organizationId);
    }

    const now = Date.now();
    const incidentId = await ctx.db.insert('incidents', {
      organizationId,
      vehicleId: args.vehicleId,
      reportedBy: ctx.user._id,
      reservationId: args.reservationId,
      incidentDate: args.incidentDate,
      location: args.location,
      description: args.description,
      thirdPartyInvolved: args.thirdPartyInvolved,
      thirdPartyInfo: args.thirdPartyInfo,
      photos: args.photos,
      status: 'DECLARED',
      createdAt: now,
      updatedAt: now
    });

    // Mettre le véhicule en MAINTENANCE
    await ctx.db.patch(args.vehicleId, { status: 'MAINTENANCE', activeIncidentId: incidentId });

    // Notifier les admins
    const admins = await ctx.db
      .query('organizationMembers')
      .withIndex('by_organization', q => q.eq('organizationId', organizationId))
      .filter(q => q.eq(q.field('role'), 'ORG_ADMIN'))
      .collect();

    for (const admin of admins) {
      await ctx.db.insert('notifications', {
        organizationId,
        userId: admin.userId,
        type: 'INCIDENT_DECLARED',
        title: `Sinistre déclaré — ${vehicle.brand} ${vehicle.model}`,
        message: `${args.location} · ${new Date(args.incidentDate).toLocaleDateString('fr-FR')}`,
        link: `/admin/incidents/${incidentId}`,
        isRead: false,
        createdAt: now
      });
    }

    return incidentId;
  }
});

export const updateIncidentStatus = authedMutation({
  args: {
    incidentId: v.id('incidents'),
    status: v.union(
      v.literal('SENT_TO_INSURER'), v.literal('EXPERTISE'),
      v.literal('REPAIR'), v.literal('CLOSED'), v.literal('CONTESTED')
    ),
    insurerReference: v.optional(v.string()),
    franchiseAmount: v.optional(v.number()),
    estimatedRepairCost: v.optional(v.number()),
    closingNotes: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);

    const incident = await ctx.db.get(args.incidentId);
    if (!incident || incident.organizationId !== organizationId)
      throw new ConvexError('Sinistre introuvable');

    const now = Date.now();
    await ctx.db.patch(args.incidentId, {
      status: args.status,
      insurerReference: args.insurerReference ?? incident.insurerReference,
      franchiseAmount: args.franchiseAmount ?? incident.franchiseAmount,
      estimatedRepairCost: args.estimatedRepairCost ?? incident.estimatedRepairCost,
      closingNotes: args.closingNotes,
      closedAt: args.status === 'CLOSED' ? now : undefined,
      updatedAt: now
    });

    // À la clôture, imputer la franchise dans les coûts
    if (args.status === 'CLOSED' && args.franchiseAmount && args.franchiseAmount > 0) {
      await ctx.db.insert('costs', {
        organizationId,
        vehicleId: incident.vehicleId,
        category: 'SINISTRE',
        amount: args.franchiseAmount,
        date: new Date().toISOString().slice(0, 10),
        description: `Franchise sinistre — ${incident.location}`,
        source: 'MANUAL',
        createdBy: ctx.user._id,
        createdAt: now
      });

      // Remettre le véhicule disponible
      await ctx.db.patch(incident.vehicleId, { status: 'AVAILABLE', activeIncidentId: undefined });
    }
  }
});
```

### Étape 2 — Action email assureur

```typescript
// src/lib/convex/incidents.ts

export const sendIncidentToInsurer = internalAction({
  args: {
    incidentId: v.id('incidents'),
    insurerEmail: v.string()
  },
  handler: async (ctx, { incidentId, insurerEmail }) => {
    const incident = await ctx.runQuery(internal.incidents.getIncidentInternal, { incidentId });
    const vehicle = await ctx.runQuery(internal.vehicles.getVehicleInternal, { vehicleId: incident.vehicleId });
    const org = await ctx.runQuery(internal.organizations.getOrgInternal, { organizationId: incident.organizationId });

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Déclaration de sinistre — ${org.name}</h2>
  <table style="width:100%; border-collapse: collapse; margin-bottom: 20px;">
    <tr><td style="padding:8px; border:1px solid #eee; background:#f9f9f9; font-weight:bold;">Véhicule</td>
        <td style="padding:8px; border:1px solid #eee;">${vehicle.brand} ${vehicle.model} — ${vehicle.registration}</td></tr>
    <tr><td style="padding:8px; border:1px solid #eee; background:#f9f9f9; font-weight:bold;">Date</td>
        <td style="padding:8px; border:1px solid #eee;">${new Date(incident.incidentDate).toLocaleDateString('fr-FR')}</td></tr>
    <tr><td style="padding:8px; border:1px solid #eee; background:#f9f9f9; font-weight:bold;">Lieu</td>
        <td style="padding:8px; border:1px solid #eee;">${incident.location}</td></tr>
    <tr><td style="padding:8px; border:1px solid #eee; background:#f9f9f9; font-weight:bold;">Tiers impliqué</td>
        <td style="padding:8px; border:1px solid #eee;">${incident.thirdPartyInvolved ? 'Oui' : 'Non'}${incident.thirdPartyInfo ? ' — ' + incident.thirdPartyInfo : ''}</td></tr>
  </table>
  <h3>Description</h3>
  <p style="background:#f5f5f5; padding:12px; border-radius:6px;">${incident.description}</p>
  <p style="color:#888; font-size:12px;">Dossier généré automatiquement par Mycelium Fleet OS — ${org.name}</p>
</body>
</html>`;

    await resend.sendEmail(ctx, {
      from: 'Mycelium Fleet OS <sinistres@mycelium-fleet.com>',
      to: insurerEmail,
      subject: `Déclaration sinistre — ${vehicle.registration} — ${new Date(incident.incidentDate).toLocaleDateString('fr-FR')}`,
      html
    });

    await ctx.runMutation(internal.incidents.markSentToInsurer, { incidentId, insurerEmail });
  }
});
```

### Étape 3 — UI wizard déclaration salarié (3 étapes)

```
Étape 1 — Circonstances
  Date et heure de l'accident
  Lieu (saisie texte libre)
  Tiers impliqué ? Oui/Non
  → Si Oui : infos tiers (nom, plaque, assureur)

Étape 2 — Photos (jusqu'à 10)
  Labels prédéfinis : "Dommage principal", "Vue d'ensemble", "Plaque", "Contexte", "Autre"
  Upload depuis appareil photo (input type="file" accept="image/*" capture="environment")
  Minimum 1 photo obligatoire

Étape 3 — Description
  Textarea "Décrivez l'accident en quelques lignes"
  Récapitulatif avant envoi
  Bouton "Déclarer le sinistre"
```

### Étape 4 — UI admin `/admin/incidents/[id]`

```
┌──────────────────────────────────────────────────────────────────┐
│  Sinistre #001 — Peugeot 308 AB-123-CD                          │
│  Déclaré le 12/06/2026 · 14h32 · par Jean Dupont               │
├──────────────────────────────────────────────────────────────────┤
│  Timeline :                                                      │
│  ● 12/06 14h32  Déclaré                                         │
│  ○ Envoyé assureur                                              │
│  ○ Expertise                                                    │
│  ○ Réparation                                                   │
│  ○ Clos                                                         │
├──────────────────────────────────────────────────────────────────┤
│  Lieu : Parking Carrefour Cergy                                  │
│  Tiers : Non                                                     │
│  Description : Accrochage pilier en marche arrière...           │
├──────────────────────────────────────────────────────────────────┤
│  Photos (3)     [●][●][●]                                        │
├──────────────────────────────────────────────────────────────────┤
│  [Envoyer à l'assureur]   Email : [assureur@axa.fr      ]       │
│  [Mettre à jour le statut]                                       │
│  Franchise : [500  ] €                                           │
│  Ref. assureur : [SIN-2026-XXXXX         ]                      │
│  [Clore le dossier]                                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## ✅ Critères d'acceptation

- [ ] Salarié peut déclarer un sinistre en < 5 minutes depuis mobile
- [ ] Minimum 1 photo obligatoire, jusqu'à 10 acceptées
- [ ] Notification admin immédiate à la déclaration
- [ ] Le véhicule passe automatiquement en MAINTENANCE à la déclaration
- [ ] Admin peut envoyer l'email assureur depuis l'interface
- [ ] À la clôture avec franchise > 0 → coût SINISTRE créé automatiquement dans P08
- [ ] Le véhicule repasse AVAILABLE à la clôture du sinistre
- [ ] Timeline des statuts visible côté admin

---

## 🚫 NE PAS FAIRE

- Ne pas implémenter l'OCR du constat amiable — hors scope, saisie manuelle
- Ne pas appeler automatiquement l'assureur à la déclaration — action manuelle admin requise
- Ne pas supprimer les photos après clôture — archivage légal permanent
- Ne pas permettre à un salarié de modifier une déclaration après envoi à l'assureur
- Ne pas créer une API directe avec les assureurs — email manuel formaté suffit en V1
