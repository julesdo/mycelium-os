---
priority: 11
feature: Gestion des conducteurs — Profils, permis, formations, restrictions
sprint: S9 (V1.5)
version: V1.5 — Premiers payants
effort: 3 jours
depends_on: P01 (véhicules), P02 (réservations), P06 (notifications)
blocks: P12 (état des lieux), P15 (sinistres), P17 (compliance officer), P19 (IK)
model_recommended: claude-sonnet-4-6
pricing_tier: Starter (290€/mois)
---

# P11 — Gestion des conducteurs & conformité permis

## 🎯 Mission
Permettre au gestionnaire de fleet de voir qui conduit quoi, avec quels permis, et d'empêcher automatiquement les réservations si le permis d'un conducteur est expiré ou incompatible avec le véhicule. C'est le premier garde-fou légal du produit — une entreprise qui laisse conduire un salarié avec un permis expiré engage sa responsabilité pénale.

**Exemple de valeur :**
> Le RH configure que Jean-Pierre (permis B uniquement) ne peut pas réserver d'utilitaires > 3,5T. Quand Jean-Pierre essaie via le Concierge ou le formulaire, la réservation est refusée avec explication.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Table `organizationMembers` avec les rôles (ORG_ADMIN/ORG_MANAGER/ORG_MEMBER)
- Table `userProfiles` avec `currentOrganizationId`
- Table `vehicles` avec `category` (PASSENGER/UTILITY/TRUCK) et `assignedDriverId`
- Pattern `authedMutation`, `getUserOrg`, `requireOrgAdmin` dans `/src/lib/convex/functions.ts`
- Infrastructure Convex Storage (P08 upload factures)
- Notifications infrastructure (P06)

**Ce qui manque :**
- Table `driverProfiles` : numéro permis, catégories, expiration, upload photo recto/verso
- Table `driverRestrictions` : restrictions par conducteur (pas d'utilitaire, max km/mois, etc.)
- Validation du permis lors de la création d'une réservation
- Cron quotidien d'alerte d'expiration de permis
- Pages admin `/admin/drivers` et `/admin/drivers/[id]`
- Wizard d'onboarding conducteur (premier login dans `/app`)

---

## 🔒 Contraintes absolues

1. **Validation à la réservation** : `createReservation` doit vérifier `driverProfile.licenseExpiryDate` et `licenseCategories` AVANT d'insérer. Lancer une `ConvexError` explicite si invalide.
2. **Upload sécurisé** : les photos de permis sont stockées dans Convex Storage et jamais exposées publiquement (URL temporaire via `ctx.storage.getUrl`).
3. **Guard multi-tenant strict** : toute query sur `driverProfiles` et `driverRestrictions` filtre par `organizationId`.
4. **Validation admin** : seul un ORG_ADMIN peut valider (`licenseValidated: true`) un permis. Le conducteur peut uploader, pas valider.
5. **Blocage non-destructif** : si le permis expire, on crée une notification et on met `isBlocked: true` sur `driverProfile`. On ne supprime pas les réservations futures — on les signale.
6. **Nouveaux types de notification** à ajouter au schema : `LICENSE_EXPIRING` et `LICENSE_EXPIRED` dans l'enum `notifications.type`.

---

## 📊 Nouveaux schémas Convex

### `driverProfiles`

```typescript
driverProfiles: defineTable({
  organizationId: v.id('organizations'),
  userId: v.string(), // Better Auth string ID
  // Permis
  licenseNumber: v.optional(v.string()),
  licenseCategories: v.optional(v.array(v.string())), // ['B', 'BE', 'C', 'CE', 'D']
  licenseIssuedDate: v.optional(v.string()),   // ISO date
  licenseExpiryDate: v.optional(v.string()),   // ISO date
  licenseFrontStorageId: v.optional(v.string()),
  licenseBackStorageId: v.optional(v.string()),
  licenseValidated: v.optional(v.boolean()),
  licenseValidatedBy: v.optional(v.string()),  // userId admin
  licenseValidatedAt: v.optional(v.number()),
  // Formations (FIMO, FCO, ADR, CACES, etc.)
  formations: v.optional(v.array(v.object({
    type: v.string(),
    obtainedDate: v.string(),  // ISO date
    expiryDate: v.optional(v.string()),
    certificateStorageId: v.optional(v.string())
  }))),
  // État
  isBlocked: v.optional(v.boolean()), // true si permis expiré/invalide
  blockReason: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_user', ['userId'])
  .index('by_org_and_user', ['organizationId', 'userId'])
  .index('by_org_and_blocked', ['organizationId', 'isBlocked'])
```

### `driverRestrictions`

```typescript
driverRestrictions: defineTable({
  organizationId: v.id('organizations'),
  userId: v.string(),
  type: v.union(
    v.literal('NO_LONG_DISTANCE'),    // pas de trajet > 300km
    v.literal('NO_UTILITY'),          // pas d'utilitaire
    v.literal('NO_TRUCK'),            // pas de camion
    v.literal('MAX_KM_PER_MONTH'),    // valeur = km max
    v.literal('SITE_ONLY')            // valeur = siteId ou nom de site
  ),
  value: v.optional(v.string()),
  reason: v.optional(v.string()),
  addedBy: v.string(),     // userId admin
  createdAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_user', ['userId'])
  .index('by_org_and_user', ['organizationId', 'userId'])
```

**⚠️ Schema change requise** : dans `notifications`, ajouter à l'union des types :
```typescript
v.literal('LICENSE_EXPIRING'),
v.literal('LICENSE_EXPIRED'),
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/schema.ts                    → ajouter driverProfiles, driverRestrictions, 2 notif types
src/lib/convex/drivers.ts                   → NOUVEAU : queries + mutations conducteurs
src/lib/convex/reservations.ts              → MODIFIER : ajouter validation permis dans createReservation
src/lib/convex/crons.ts                     → ajouter cron quotidien checkLicenseExpiry
src/routes/[[lang]]/admin/drivers/
  +page.svelte                              → liste conducteurs
  [userId]/+page.svelte                     → profil conducteur détaillé
src/routes/[[lang]]/app/onboarding/
  driver/+page.svelte                       → wizard onboarding conducteur
src/lib/components/drivers/
  driver-table.svelte
  driver-profile-form.svelte
  license-upload.svelte
  restriction-badge.svelte
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Mutations essentielles dans `drivers.ts`

```typescript
// src/lib/convex/drivers.ts

// Upsert du profil conducteur (appelé par l'admin OU le conducteur lui-même)
export const upsertDriverProfile = authedMutation({
  args: {
    targetUserId: v.optional(v.string()), // admin peut cibler un autre user
    licenseNumber: v.optional(v.string()),
    licenseCategories: v.optional(v.array(v.string())),
    licenseIssuedDate: v.optional(v.string()),
    licenseExpiryDate: v.optional(v.string()),
    licenseFrontStorageId: v.optional(v.string()),
    licenseBackStorageId: v.optional(v.string()),
    formations: v.optional(v.array(v.any())),
    notes: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getUserOrg(ctx);
    const targetUserId = args.targetUserId ?? ctx.user._id;

    // Seul un admin peut modifier le profil d'un autre user
    if (args.targetUserId && args.targetUserId !== ctx.user._id) {
      await requireOrgAdmin(ctx, organizationId);
    }

    const existing = await ctx.db
      .query('driverProfiles')
      .withIndex('by_org_and_user', q =>
        q.eq('organizationId', organizationId).eq('userId', targetUserId)
      )
      .unique();

    const now = Date.now();
    const data = {
      organizationId,
      userId: targetUserId,
      licenseNumber: args.licenseNumber,
      licenseCategories: args.licenseCategories,
      licenseIssuedDate: args.licenseIssuedDate,
      licenseExpiryDate: args.licenseExpiryDate,
      licenseFrontStorageId: args.licenseFrontStorageId,
      licenseBackStorageId: args.licenseBackStorageId,
      formations: args.formations,
      notes: args.notes,
      updatedAt: now
    };

    if (existing) {
      // Reset validation si les données permis changent
      const licenseChanged =
        args.licenseNumber !== existing.licenseNumber ||
        args.licenseExpiryDate !== existing.licenseExpiryDate;
      await ctx.db.patch(existing._id, {
        ...data,
        licenseValidated: licenseChanged ? false : existing.licenseValidated,
        licenseValidatedBy: licenseChanged ? undefined : existing.licenseValidatedBy,
        licenseValidatedAt: licenseChanged ? undefined : existing.licenseValidatedAt
      });
      return existing._id;
    }

    return ctx.db.insert('driverProfiles', { ...data, createdAt: now });
  }
});

// Validation du permis par un admin
export const validateDriverLicense = authedMutation({
  args: { targetUserId: v.string() },
  handler: async (ctx, { targetUserId }) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);

    const profile = await ctx.db
      .query('driverProfiles')
      .withIndex('by_org_and_user', q =>
        q.eq('organizationId', organizationId).eq('userId', targetUserId)
      )
      .unique();
    if (!profile) throw new ConvexError('Profil conducteur introuvable');

    await ctx.db.patch(profile._id, {
      licenseValidated: true,
      licenseValidatedBy: ctx.user._id,
      licenseValidatedAt: Date.now(),
      isBlocked: false,
      blockReason: undefined,
      updatedAt: Date.now()
    });
  }
});

// Ajouter une restriction
export const addDriverRestriction = authedMutation({
  args: {
    targetUserId: v.string(),
    type: v.union(
      v.literal('NO_LONG_DISTANCE'), v.literal('NO_UTILITY'),
      v.literal('NO_TRUCK'), v.literal('MAX_KM_PER_MONTH'), v.literal('SITE_ONLY')
    ),
    value: v.optional(v.string()),
    reason: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);

    return ctx.db.insert('driverRestrictions', {
      organizationId,
      userId: args.targetUserId,
      type: args.type,
      value: args.value,
      reason: args.reason,
      addedBy: ctx.user._id,
      createdAt: Date.now()
    });
  }
});
```

### Étape 2 — Query liste conducteurs

```typescript
export const listDriversForOrg = authedQuery({
  args: {
    filter: v.optional(v.union(
      v.literal('all'), v.literal('blocked'), v.literal('expiring_soon'),
      v.literal('not_validated')
    ))
  },
  handler: async (ctx, { filter = 'all' }) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);

    const members = await ctx.db
      .query('organizationMembers')
      .withIndex('by_organization', q => q.eq('organizationId', organizationId))
      .collect();

    const profiles = await ctx.db
      .query('driverProfiles')
      .withIndex('by_org', q => q.eq('organizationId', organizationId))
      .collect();

    const profileByUser = new Map(profiles.map(p => [p.userId, p]));
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    return members
      .map(member => {
        const profile = profileByUser.get(member.userId);
        const expiryTs = profile?.licenseExpiryDate
          ? new Date(profile.licenseExpiryDate).getTime()
          : null;
        const isExpiringSoon = expiryTs !== null && expiryTs - now < thirtyDaysMs && expiryTs > now;
        const isExpired = expiryTs !== null && expiryTs < now;

        return { member, profile, isExpiringSoon, isExpired };
      })
      .filter(({ profile, isExpiringSoon }) => {
        if (filter === 'blocked') return profile?.isBlocked;
        if (filter === 'expiring_soon') return isExpiringSoon;
        if (filter === 'not_validated') return profile && !profile.licenseValidated;
        return true;
      });
  }
});
```

### Étape 3 — Validation dans `createReservation` (modifier `reservations.ts`)

```typescript
// Ajouter au début du handler createReservation, après getUserOrg :

// Vérification du permis conducteur
const driverProfile = await ctx.db
  .query('driverProfiles')
  .withIndex('by_org_and_user', q =>
    q.eq('organizationId', organizationId).eq('userId', ctx.user._id)
  )
  .unique();

if (driverProfile?.isBlocked) {
  throw new ConvexError(
    driverProfile.blockReason ?? 'Votre permis de conduire est bloqué. Contactez votre gestionnaire.'
  );
}

if (driverProfile?.licenseExpiryDate) {
  const expiryDate = new Date(driverProfile.licenseExpiryDate);
  if (expiryDate < new Date()) {
    throw new ConvexError(
      `Votre permis de conduire a expiré le ${expiryDate.toLocaleDateString('fr-FR')}. Mettez-le à jour avant de réserver.`
    );
  }
}

// Vérifier la catégorie si utilitaire/camion
const vehicle = await ctx.db.get(args.vehicleId);
if (vehicle?.category === 'UTILITY' && driverProfile) {
  const hasUtilityLicense =
    !driverProfile.licenseCategories ||
    driverProfile.licenseCategories.some(c => ['BE', 'C', 'CE'].includes(c));
  if (!hasUtilityLicense && driverProfile.licenseCategories?.length) {
    throw new ConvexError(
      'Ce véhicule utilitaire requiert un permis BE, C ou CE. Votre permis B ne suffit pas.'
    );
  }
}

// Vérifier les restrictions
const restrictions = await ctx.db
  .query('driverRestrictions')
  .withIndex('by_org_and_user', q =>
    q.eq('organizationId', organizationId).eq('userId', ctx.user._id)
  )
  .collect();

for (const restriction of restrictions) {
  if (restriction.type === 'NO_UTILITY' && vehicle?.category === 'UTILITY') {
    throw new ConvexError('Une restriction vous interdit de réserver des véhicules utilitaires.');
  }
  if (restriction.type === 'NO_TRUCK' && vehicle?.category === 'TRUCK') {
    throw new ConvexError('Une restriction vous interdit de réserver des camions.');
  }
}
```

### Étape 4 — Cron quotidien d'alerte d'expiration

```typescript
// src/lib/convex/crons.ts
crons.daily('license-expiry-check', { hourUTC: 6, minuteUTC: 0 },
  internal.drivers.checkLicenseExpiry
);

// src/lib/convex/drivers.ts
export const checkLicenseExpiry = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    const allProfiles = await ctx.runQuery(internal.drivers.getAllProfilesForExpiry, {});

    for (const profile of allProfiles) {
      if (!profile.licenseExpiryDate) continue;
      const expiryTs = new Date(profile.licenseExpiryDate).getTime();
      const daysUntilExpiry = (expiryTs - now) / (24 * 60 * 60 * 1000);

      if (expiryTs < now) {
        // Permis expiré → bloquer le conducteur
        await ctx.runMutation(internal.drivers.blockDriver, {
          profileId: profile._id,
          reason: `Permis expiré le ${new Date(expiryTs).toLocaleDateString('fr-FR')}`
        });
        // Notification conducteur
        await ctx.runMutation(internal.notifications.createNotification, {
          organizationId: profile.organizationId,
          userId: profile.userId,
          type: 'LICENSE_EXPIRED',
          title: 'Permis de conduire expiré',
          message: 'Votre permis a expiré. Mettez-le à jour pour pouvoir réserver à nouveau.',
          link: '/app/profile'
        });
      } else if (daysUntilExpiry <= 7) {
        // Alerte urgente
        await ctx.runMutation(internal.notifications.createNotification, {
          organizationId: profile.organizationId,
          userId: profile.userId,
          type: 'LICENSE_EXPIRING',
          title: `Permis expire dans ${Math.ceil(daysUntilExpiry)} jour(s)`,
          message: 'Renouvelez votre permis en urgence.',
          link: '/app/profile'
        });
      } else if (daysUntilExpiry <= 30) {
        // Alerte préventive — max 1 fois tous les 7 jours
        const recentAlerts = await ctx.runQuery(internal.notifications.getRecentByType, {
          userId: profile.userId,
          type: 'LICENSE_EXPIRING',
          since: now - sevenDaysMs
        });
        if (recentAlerts.length === 0) {
          await ctx.runMutation(internal.notifications.createNotification, {
            organizationId: profile.organizationId,
            userId: profile.userId,
            type: 'LICENSE_EXPIRING',
            title: `Permis expire dans ${Math.ceil(daysUntilExpiry)} jours`,
            message: 'Pensez à renouveler votre permis avant qu\'il expire.',
            link: '/app/profile'
          });
        }
      }
    }
  }
});
```

### Étape 5 — UI `/admin/drivers`

Layout :
```
┌──────────────────────────────────────────────────────────────────┐
│  Conducteurs (24)        [Filtres ▾]   [+ Inviter un conducteur] │
├──────────────────────────────────────────────────────────────────┤
│  ⚠️ 3 conducteurs avec permis expirant dans 30 jours             │
│  🔴 1 conducteur bloqué (permis expiré)                          │
├──────────────────────────────────────────────────────────────────┤
│  NOM          EMAIL          PERMIS        EXPIRATION  STATUT    │
│  Jean D.      jean@...       B, BE         12/2025     ⚠️ Bientôt│
│  Marie L.     marie@...      B             03/2027     ✅ Valide  │
│  Pierre M.    pierre@...     —             —           📋 Incomplet│
└──────────────────────────────────────────────────────────────────┘
```

### Étape 6 — UI `/admin/drivers/[userId]`

5 onglets : **Profil** | **Permis** | **Formations** | **Restrictions** | **Historique**

- Onglet Permis : aperçu photo recto/verso + bouton "Valider" (admin)
- Onglet Restrictions : liste + bouton "Ajouter une restriction"
- Onglet Historique : liste des réservations passées du conducteur

---

## ✅ Critères d'acceptation

- [ ] Conducteur avec permis expiré ne peut pas créer de réservation (ConvexError explicite)
- [ ] Conducteur avec restriction NO_UTILITY ne peut pas réserver un utilitaire
- [ ] Admin peut uploader et valider le permis d'un conducteur
- [ ] Alerte LICENSE_EXPIRING envoyée 30j et 7j avant expiration (sans doublon)
- [ ] Conducteur bloqué automatiquement quand son permis expire
- [ ] Page /admin/drivers filtre par statut (bloqué, expirant, incomplet)
- [ ] Page /admin/drivers/[id] affiche les 5 onglets avec données réelles

---

## 🚫 NE PAS FAIRE

- Ne pas bloquer une réservation si le conducteur n'a pas encore de profil (cas onboarding) — seulement si le profil existe ET que le permis est expiré
- Ne pas stocker les photos de permis en base — uniquement des storageIds Convex Storage
- Ne pas exposer des URLs permanentes de photos — utiliser `ctx.storage.getUrl(storageId)` avec TTL
- Ne pas valider automatiquement un permis — toujours requérir validation manuelle admin
- Ne pas envoyer des alertes d'expiration à l'infini — vérifier le doublon sur 7 jours
