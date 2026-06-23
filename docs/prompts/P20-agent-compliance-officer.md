---
priority: 20
feature: Agent Compliance Officer — Surveillance réglementaire automatique (Agent 4)
sprint: S14 (V2)
version: V2 — Indispensable au DAF
effort: 3 jours
depends_on: P11 (conducteurs/permis), P09 (maintenance CT), P01 (véhicules)
blocks: —
model_recommended: claude-haiku-4-5-20251001
pricing_tier: Business (990€/mois) — inclus comme agent IA différenciant
---

# P20 — Agent Compliance Officer (Agent 4)

## 🎯 Mission

L'Agent Compliance Officer tourne **en arrière-plan** et surveille automatiquement toutes les obligations réglementaires de la flotte : contrôles techniques, assurances, permis conducteurs, validité des cartes grises. Il envoie des alertes proactives **au bon moment** (30j, 7j, échéance) sans que personne ne le demande. Résultat : zéro véhicule sans assurance valide, zéro conducteur avec permis expiré sans le savoir.

**Exemple de valeur :**
> L'agent tourne chaque matin. Détecte que l'assurance du Renault Master AB-456 expire dans 28 jours. Envoie une notification à l'ORG_ADMIN : "L'assurance du Master AB-456 expire le 15/07/2026. 28 jours pour renouveler." L'admin n'avait rien à faire pour être alerté.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Table `vehicles` avec champs existants (pas encore `insuranceExpiryDate`, `registrationExpiryDate`)
- Table `driverProfiles` avec `licenseExpiryDate` + cron `checkLicenseExpiry` (P11)
- Table `maintenanceRecords` avec `scheduledDate` et type (P09)
- Infrastructure notifications (P06) + emails Resend
- Cron infrastructure dans `crons.ts`
- Pattern `internalAction` + boucle par organisation

**Ce qui manque :**
- Champs compliance dans `vehicles` : `insuranceExpiryDate`, `registrationExpiryDate`, `ctExpiryDate` (contrôle technique)
- Table `complianceAlerts` pour dédoublonnage et historique
- `internalAction checkComplianceForAllOrgs` : surveille tout en parallèle
- Cron quotidien 7h UTC
- Email de synthèse hebdomadaire des alertes compliance (pas une alerte par item — un digest)

---

## 🔒 Contraintes absolues

1. **Modèle Claude Haiku uniquement** : les règles compliance sont déterministes (date < date + 30j). Pas besoin de Sonnet. Haiku = 10x moins cher pour des règles fixes.
2. **Dédoublonnage strict** : une alerte d'expiration pour un véhicule/conducteur/type ne doit être envoyée qu'une fois par palier (30j, 7j, expiré). Vérifier `complianceAlerts` avant d'envoyer.
3. **Isolation multi-tenant** : chaque organisation ne voit que ses propres alertes. Jamais de données cross-orgs.
4. **Pas d'action automatique** : l'agent détecte et alerte. Il ne renouvelle rien, ne contacte personne automatiquement.
5. **Digest hebdomadaire** : le lundi matin, envoyer un email récapitulatif de toutes les alertes actives (pas une alerte par item pour éviter le spam).

---

## 📊 Schema changes requises

### Ajouter à `vehicles` :

```typescript
// Dans vehicles, ajouter ces champs optionnels :
insuranceExpiryDate: v.optional(v.string()),      // ISO date "2026-12-31"
ctExpiryDate: v.optional(v.string()),              // date contrôle technique
registrationExpiryDate: v.optional(v.string()),   // validité carte grise (rare mais réglementaire)
insurerName: v.optional(v.string()),
policyNumber: v.optional(v.string()),
```

### Nouvelle table `complianceAlerts`

```typescript
complianceAlerts: defineTable({
  organizationId: v.id('organizations'),
  entityType: v.union(
    v.literal('VEHICLE'),
    v.literal('DRIVER')
  ),
  entityId: v.string(),      // vehicleId ou userId
  alertType: v.union(
    v.literal('INSURANCE_EXPIRING'),
    v.literal('INSURANCE_EXPIRED'),
    v.literal('CT_EXPIRING'),       // Contrôle Technique
    v.literal('CT_EXPIRED'),
    v.literal('LICENSE_EXPIRING'),  // Migrer depuis drivers.ts
    v.literal('LICENSE_EXPIRED'),
    v.literal('REGISTRATION_EXPIRING')
  ),
  horizon: v.union(
    v.literal('30_DAYS'),
    v.literal('7_DAYS'),
    v.literal('EXPIRED')
  ),
  expiryDate: v.string(),    // date d'expiration concernée
  notificationSentAt: v.optional(v.number()),
  resolvedAt: v.optional(v.number()),  // null = alerte active
  createdAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_entity', ['entityType', 'entityId'])
  .index('by_org_and_type', ['organizationId', 'alertType'])
  .index('by_org_and_active', ['organizationId', 'resolvedAt'])
  // Index de dédoublonnage
  .index('by_entity_type_horizon', ['entityId', 'alertType', 'horizon'])
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/schema.ts                    → vehicles (3 champs) + complianceAlerts
src/lib/convex/compliance.ts               → NOUVEAU : internalAction + queries
src/lib/convex/crons.ts                    → ajouter daily 7h + weekly digest
src/lib/convex/drivers.ts                  → MODIFIER : migrer LICENSE_ alerts vers complianceAlerts

src/routes/[[lang]]/admin/compliance/
  +page.svelte                              → tableau de bord compliance

src/lib/components/compliance/
  compliance-alert-row.svelte               → ligne d'alerte avec sévérité
  compliance-filters.svelte                 → filtres type / statut / véhicule
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Logique détection `compliance.ts`

```typescript
// src/lib/convex/compliance.ts

// Seuils d'alerte en jours
const THRESHOLDS = [
  { days: 30, horizon: '30_DAYS' as const },
  { days: 7,  horizon: '7_DAYS' as const }
];

export const checkComplianceForOrg = internalAction({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, { organizationId }) => {
    const now = Date.now();
    const alerts: Array<{
      entityType: 'VEHICLE' | 'DRIVER';
      entityId: string;
      alertType: string;
      horizon: '30_DAYS' | '7_DAYS' | 'EXPIRED';
      expiryDate: string;
      label: string;        // ex: "Assurance Renault Master AB-456"
    }> = [];

    // 1. Contrôles techniques et assurances véhicules
    const vehicles = await ctx.runQuery(internal.vehicles.listVehiclesInternal, { organizationId });

    for (const vehicle of vehicles) {
      if (vehicle.status === 'RETIRED') continue;

      const label = `${vehicle.brand} ${vehicle.model} (${vehicle.registration})`;

      // Contrôle technique
      if (vehicle.ctExpiryDate) {
        const daysLeft = daysUntil(vehicle.ctExpiryDate, now);
        if (daysLeft < 0) {
          await maybeCreateAlert(ctx, { organizationId, entityType: 'VEHICLE', entityId: vehicle._id, alertType: 'CT_EXPIRED', horizon: 'EXPIRED', expiryDate: vehicle.ctExpiryDate });
          alerts.push({ entityType: 'VEHICLE', entityId: vehicle._id, alertType: 'CT_EXPIRED', horizon: 'EXPIRED', expiryDate: vehicle.ctExpiryDate, label: `CT — ${label}` });
        } else {
          for (const { days, horizon } of THRESHOLDS) {
            if (daysLeft <= days) {
              await maybeCreateAlert(ctx, { organizationId, entityType: 'VEHICLE', entityId: vehicle._id, alertType: 'CT_EXPIRING', horizon, expiryDate: vehicle.ctExpiryDate });
              alerts.push({ entityType: 'VEHICLE', entityId: vehicle._id, alertType: 'CT_EXPIRING', horizon, expiryDate: vehicle.ctExpiryDate, label: `CT — ${label}` });
              break; // prendre le seuil le plus proche uniquement
            }
          }
        }
      }

      // Assurance
      if (vehicle.insuranceExpiryDate) {
        const daysLeft = daysUntil(vehicle.insuranceExpiryDate, now);
        if (daysLeft < 0) {
          await maybeCreateAlert(ctx, { organizationId, entityType: 'VEHICLE', entityId: vehicle._id, alertType: 'INSURANCE_EXPIRED', horizon: 'EXPIRED', expiryDate: vehicle.insuranceExpiryDate });
          alerts.push({ entityType: 'VEHICLE', entityId: vehicle._id, alertType: 'INSURANCE_EXPIRED', horizon: 'EXPIRED', expiryDate: vehicle.insuranceExpiryDate, label: `Assurance — ${label}` });
        } else {
          for (const { days, horizon } of THRESHOLDS) {
            if (daysLeft <= days) {
              await maybeCreateAlert(ctx, { organizationId, entityType: 'VEHICLE', entityId: vehicle._id, alertType: 'INSURANCE_EXPIRING', horizon, expiryDate: vehicle.insuranceExpiryDate });
              alerts.push({ entityType: 'VEHICLE', entityId: vehicle._id, alertType: 'INSURANCE_EXPIRING', horizon, expiryDate: vehicle.insuranceExpiryDate, label: `Assurance — ${label}` });
              break;
            }
          }
        }
      }
    }

    // 2. Permis conducteurs (déjà dans drivers.ts mais unifier ici)
    const driverProfiles = await ctx.runQuery(internal.drivers.getAllProfilesForExpiry, { organizationId });
    for (const profile of driverProfiles) {
      if (!profile.licenseExpiryDate) continue;
      const daysLeft = daysUntil(profile.licenseExpiryDate, now);
      if (daysLeft < 0) {
        alerts.push({ entityType: 'DRIVER', entityId: profile.userId, alertType: 'LICENSE_EXPIRED', horizon: 'EXPIRED', expiryDate: profile.licenseExpiryDate, label: `Permis conducteur` });
      } else {
        for (const { days, horizon } of THRESHOLDS) {
          if (daysLeft <= days) {
            alerts.push({ entityType: 'DRIVER', entityId: profile.userId, alertType: 'LICENSE_EXPIRING', horizon, expiryDate: profile.licenseExpiryDate, label: `Permis conducteur` });
            break;
          }
        }
      }
    }

    return alerts;
  }
});

async function maybeCreateAlert(ctx: ActionCtx, params: {
  organizationId: Id<'organizations'>;
  entityType: 'VEHICLE' | 'DRIVER';
  entityId: string;
  alertType: string;
  horizon: '30_DAYS' | '7_DAYS' | 'EXPIRED';
  expiryDate: string;
}) {
  // Dédoublonnage : ne pas recréer si une alerte non-résolue existe déjà pour ce triplet
  const existing = await ctx.runQuery(internal.compliance.getActiveAlert, {
    entityId: params.entityId,
    alertType: params.alertType,
    horizon: params.horizon
  });
  if (existing) return;

  await ctx.runMutation(internal.compliance.createAlert, params);
}

function daysUntil(isoDate: string, nowMs: number): number {
  return Math.floor((new Date(isoDate).getTime() - nowMs) / (1000 * 60 * 60 * 24));
}
```

### Étape 2 — Email digest hebdomadaire (lundi 7h)

```typescript
export const sendWeeklyComplianceDigest = internalAction({
  args: {},
  handler: async (ctx) => {
    // Pour toutes les orgs, collecter les alertes actives et envoyer un email de synthèse
    const orgs = await ctx.runQuery(internal.organizations.getAllActiveOrgs, {});

    for (const org of orgs) {
      const activeAlerts = await ctx.runQuery(internal.compliance.getActiveAlertsForOrg, {
        organizationId: org._id
      });

      if (activeAlerts.length === 0) continue;

      const expired = activeAlerts.filter(a => a.horizon === 'EXPIRED');
      const critical = activeAlerts.filter(a => a.horizon === '7_DAYS');
      const warning = activeAlerts.filter(a => a.horizon === '30_DAYS');

      const admins = await ctx.runQuery(internal.organizations.getOrgAdmins, { organizationId: org._id });

      const html = buildComplianceDigestEmail({
        orgName: org.name,
        expired, critical, warning,
        appUrl: process.env.APP_URL ?? ''
      });

      for (const admin of admins) {
        if (!admin.email) continue;
        await resend.sendEmail(ctx, {
          from: 'Mycelium Compliance <compliance@mycelium-fleet.com>',
          to: admin.email,
          subject: `[Compliance] ${expired.length + critical.length} alerte(s) urgente(s) — ${org.name}`,
          html
        });
      }
    }
  }
});

function buildComplianceDigestEmail({ orgName, expired, critical, warning, appUrl }: DigestEmailParams): string {
  const section = (title: string, items: ComplianceAlert[], color: string) => {
    if (!items.length) return '';
    return `
      <h3 style="color: ${color}; margin: 20px 0 10px;">${title} (${items.length})</h3>
      <ul style="margin: 0; padding-left: 20px;">
        ${items.map(a => `
          <li style="margin-bottom: 6px;">
            <strong>${a.label}</strong> — expire le ${new Date(a.expiryDate).toLocaleDateString('fr-FR')}
          </li>
        `).join('')}
      </ul>`;
  };

  return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #0f0f0f; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
    <h1 style="color: #f5e642; margin: 0; font-size: 18px;">🛡️ Mycelium Compliance</h1>
    <p style="color: #888; margin: 6px 0 0; font-size: 13px;">${orgName} — Digest hebdomadaire</p>
  </div>
  ${section('🔴 Éléments expirés', expired, '#dc2626')}
  ${section('🟠 Expiration dans 7 jours', critical, '#d97706')}
  ${section('🟡 Expiration dans 30 jours', warning, '#ca8a04')}
  <p style="margin-top: 24px;">
    <a href="${appUrl}/admin/compliance" style="background: #f5e642; color: #000; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
      Gérer les alertes →
    </a>
  </p>
  <p style="color: #888; font-size: 11px; margin-top: 24px;">Mycelium Fleet OS — Compliance Officer automatique</p>
</body>
</html>`;
}
```

### Étape 3 — Crons dans `crons.ts`

```typescript
// Vérification quotidienne à 7h UTC
crons.daily('compliance-check', { hourUTC: 7, minuteUTC: 0 },
  internal.compliance.checkComplianceForAllOrgs
);

// Digest hebdomadaire — lundi 8h UTC (après le check)
crons.weekly('compliance-digest', { dayOfWeek: 'monday', hourUTC: 8, minuteUTC: 30 },
  internal.compliance.sendWeeklyComplianceDigest
);
```

### Étape 4 — UI `/admin/compliance`

```
┌──────────────────────────────────────────────────────────────────┐
│  Tableau de bord Compliance                  [Filtres]           │
├──────────────────────────────────────────────────────────────────┤
│  🔴 2 expirés      🟠 3 critiques (7j)     🟡 8 avertissements  │
├──────────────────────────────────────────────────────────────────┤
│  TYPE          ENTITÉ                   EXPIRATION    STATUT     │
│  Assurance     Renault Master AB-456    01/06/26 ←   🔴 EXPIRÉ  │
│  Permis        Jean Dupont              05/06/26      🔴 EXPIRÉ  │
│  CT            Peugeot 308 CD-789       18/06/26      🟠 7 jours │
│  Assurance     Clio EF-012             25/06/26      🟠 7 jours │
│  CT            Ford Transit GH-345     12/07/26      🟡 30 jours │
├──────────────────────────────────────────────────────────────────┤
│  [Marquer comme résolu]  [Voir historique]                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## ✅ Critères d'acceptation

- [ ] Cron quotidien détecte les CT, assurances et permis expirant dans ≤30j et ≤7j
- [ ] Pas de doublon d'alerte pour le même véhicule/type/horizon sur la même semaine
- [ ] Email digest envoyé chaque lundi matin aux ORG_ADMINs
- [ ] Page `/admin/compliance` affiche toutes les alertes actives avec filtres
- [ ] Admin peut marquer une alerte comme résolue (mise à jour `resolvedAt`)
- [ ] Si assurance expirée → alerte HIGH sévérité, notification in-app en plus de l'email
- [ ] Agent utilise Claude Haiku (pas Sonnet/Opus)

---

## 🚫 NE PAS FAIRE

- Ne pas utiliser Claude pour les règles déterministes (date < date + 30j) — logique pure TypeScript
- Ne pas envoyer une alerte par email pour chaque item individuellement — digest uniquement
- Ne pas recréer l'alerte si une alerte non-résolue du même type existe pour la même entité
- Ne pas bloquer les réservations si le CT est expiré (alerte uniquement, pas blocage en V2)
- Ne pas appeler l'assureur automatiquement — humain in the loop requis
