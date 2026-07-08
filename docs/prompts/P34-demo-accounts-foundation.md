---
priority: 34
feature: Comptes démo commerciaux — schema + wizard création + générateur flotte 7 templates
sprint: Commercial S2
version: V3 — Commercial
effort: 4 jours
depends_on: P27 (dashboard concierge), P31 (sidebar), staffRole 'sales' (P36 — peut démarrer en parallèle)
blocks: P35
model_recommended: claude-sonnet-5 (génération noms réalistes + données historique)
pricing_tier: outil interne commercial — pas de feature gating
---

# P34 — Comptes Démo Commerciaux — Foundation

## 🎯 Mission

Le commercial doit pouvoir créer un compte démo hyper-réaliste pour un prospect en moins de 3 minutes. Ce prompt crée les fondations : le schema, le wizard de création 4 étapes, et le **générateur de flotte** qui instancie une organisation démo avec des véhicules, des conducteurs fictifs, et un historique de 30 jours simulé.

**Ce que ce prompt livre :**
- Extension de `organizations` (champs `isDemo` + `demoConfig`)
- Tables `demoVehiclePositions` + `demoAccessTokens`
- Wizard 4 étapes à `/concierge/demos/new` (accessible aussi depuis `/sales/demos/new` en P36)
- `demo/generator.ts` — génération complète de flotte par template
- Route publique `/demo/[token]` — session auto pour le prospect
- Bandeau démo discret dans l'interface

**Ce prompt ne livre PAS :**
- L'engine de simulation temps réel (cron 5min) → P35
- La modale de conversion → P35
- Le dashboard commercial `/concierge/demos` → P35
- Les emails Resend → P35

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Table `organizations` dans `schema.ts` — multi-tenant, champs `isDemo`/`demoConfig` absents
- Auth Better Auth — `getMyOrgMembership` pour les membres client
- Concierge : `conciergeQuery`/`conciergeMutation` guards + `getMyAccessibleOrgs`
- `/onboarding/organization` — wizard existant qu'on peut s'inspirer pour le wizard démo
- Paddle : `organizations.paddlePlanTier` — à forcer sur `'professional'` pour les démos

**Ce qui manque :**
- Champs `isDemo` + `demoConfig` sur `organizations`
- Tables `demoVehiclePositions` + `demoAccessTokens`
- Logique de génération de flotte par template
- Route `/concierge/demos/new` + `/demo/[token]`
- `staffRole: 'sales'` (P36 en parallèle) — le wizard est accessible concierge + super_admin dans ce sprint

---

## 🔒 Contraintes absolues

1. **Multi-tenant strict** — une org démo est une vraie org Convex, isolée par `organizationId`. Même isolation que les orgs réelles.
2. **Plaques fictives distinctes** — format `DM-[3 chiffres]-[2 lettres]` pour les véhicules démo. Ne jamais utiliser de vraies immatriculations.
3. **Noms fictifs pour les conducteurs** — patterns réalistes par locale, jamais des vrais noms.
4. **Token démo sécurisé** — 24 bytes crypto-random → 48 hex chars. Pas d'expiration propre au token, c'est `demoConfig.expiresAt` qui contrôle.
5. **Génération asynchrone** — la création de flotte (50+ véhicules + historique 30j) est une `action` Convex, pas une mutation directe. Le wizard affiche un état "Génération en cours".
6. **Plan forcé Professional** — toutes les orgs démo ont `paddlePlanTier: 'professional'` pour montrer le maximum de features.

---

## 📊 Schema changes requises

### Extension de `organizations`

```typescript
// src/lib/convex/schema.ts — dans la table organizations, ajouter :
isDemo: v.optional(v.boolean()),
demoConfig: v.optional(v.object({
  templateId: v.union(
    v.literal('services'), v.literal('btp'), v.literal('distribution'),
    v.literal('sante'), v.literal('commerce'), v.literal('vtc'), v.literal('public')
  ),
  createdBy: v.string(),                          // staffUserId
  commercialName: v.string(),
  commercialPhone: v.string(),
  commercialCalendlyUrl: v.optional(v.string()),
  prospectName: v.string(),
  prospectEmail: v.optional(v.string()),
  prospectCity: v.optional(v.string()),           // pour centrer la simulation géo
  notes: v.optional(v.string()),
  expiresAt: v.number(),
  extendedCount: v.number(),
  isExpired: v.boolean(),
  convertedAt: v.optional(v.number()),
  conversionSource: v.optional(v.union(
    v.literal('call'), v.literal('calendly'), v.literal('self_serve')
  ))
}))
```

### Nouvelles tables

```typescript
// src/lib/convex/schema.ts — ajouter après demoConfig

demoVehiclePositions: defineTable({
  vehicleId: v.id('vehicles'),
  organizationId: v.id('organizations'),
  lat: v.number(),
  lng: v.number(),
  speed: v.number(),               // km/h (0 si garé)
  heading: v.number(),             // 0–360°
  status: v.union(
    v.literal('moving'),
    v.literal('parked'),
    v.literal('charging'),
    v.literal('idle')
  ),
  fuelOrSocPercent: v.number(),    // 0–100
  odometerKm: v.number(),
  updatedAt: v.number()
})
  .index('by_vehicle', ['vehicleId'])
  .index('by_org', ['organizationId']),

demoAccessTokens: defineTable({
  token: v.string(),               // 48 hex chars (24 bytes)
  organizationId: v.id('organizations'),
  createdAt: v.number(),
  lastUsedAt: v.optional(v.number()),
  usedCount: v.number()
})
  .index('by_token', ['token'])
  .index('by_org', ['organizationId'])
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/schema.ts                              → MODIFIER : isDemo + demoConfig + 2 nouvelles tables

src/lib/convex/demo/generator.ts                      → CRÉER : generateDemoOrg (action), templates
src/lib/convex/demo/templates.ts                      → CRÉER : définitions des 7 templates de flotte
src/lib/convex/demo/demoAccess.ts                     → CRÉER : query getByToken + mutation markUsed

src/routes/[[lang]]/concierge/demos/new/+page.svelte  → CRÉER : wizard 4 étapes création démo
src/routes/[[lang]]/concierge/demos/new/+page.ts      → CRÉER : guard concierge server-side

src/routes/[[lang]]/demo/[token]/+page.svelte         → CRÉER : accès prospect (session auto)
src/routes/[[lang]]/demo/[token]/+page.server.ts      → CRÉER : résolution token + redirect

src/lib/components/demo/DemoBanner.svelte             → CRÉER : bandeau discret dans l'interface démo
src/routes/[[lang]]/admin/+layout.svelte              → MODIFIER : afficher DemoBanner si isDemo
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Templates de flotte (`demo/templates.ts`)

```typescript
// src/lib/convex/demo/templates.ts

export type DemoTemplateId =
  | 'services' | 'btp' | 'distribution' | 'sante' | 'commerce' | 'vtc' | 'public';

export type VehicleSpec = {
  brand: string;
  model: string;
  category: 'PASSENGER' | 'UTILITY' | 'TRUCK';
  energy: 'THERMAL' | 'HYBRID' | 'ELECTRIC';
  weight: number; // probabilité relative (sum = 100 par template)
};

export type DemoTemplate = {
  id: DemoTemplateId;
  label: string;
  description: string;
  fleetRange: [number, number]; // [min, max] vehicules
  vehicleSpecs: VehicleSpec[];
  // Profils de conducteurs fictifs : préfixes pour noms réalistes
  conductorFirstNames: string[];
  conductorLastNames: string[];
  // KPIs simulés
  utilizationRate: number; // 0–1
  avgKmPerVehiclePerMonth: number;
  avgCostPerKm: number;
};

export const DEMO_TEMPLATES: Record<DemoTemplateId, DemoTemplate> = {
  services: {
    id: 'services',
    label: 'Services B2B / Conseil',
    description: 'ESN, cabinets de conseil, agences, assureurs',
    fleetRange: [20, 80],
    vehicleSpecs: [
      { brand: 'Peugeot', model: '408', category: 'PASSENGER', energy: 'HYBRID', weight: 25 },
      { brand: 'Renault', model: 'Mégane E-Tech', category: 'PASSENGER', energy: 'ELECTRIC', weight: 20 },
      { brand: 'Peugeot', model: '3008', category: 'PASSENGER', energy: 'HYBRID', weight: 20 },
      { brand: 'Renault', model: 'Arkana', category: 'PASSENGER', energy: 'HYBRID', weight: 15 },
      { brand: 'Renault', model: 'Express Van', category: 'UTILITY', energy: 'THERMAL', weight: 10 },
      { brand: 'BMW', model: 'Série 3', category: 'PASSENGER', energy: 'HYBRID', weight: 5 },
      { brand: 'Tesla', model: 'Model 3', category: 'PASSENGER', energy: 'ELECTRIC', weight: 5 },
    ],
    conductorFirstNames: ['Thomas', 'Sophie', 'Lucas', 'Emma', 'Hugo', 'Camille', 'Nicolas', 'Léa', 'Antoine', 'Marie'],
    conductorLastNames: ['Martin', 'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefevre', 'Garcia', 'David'],
    utilizationRate: 0.72,
    avgKmPerVehiclePerMonth: 2800,
    avgCostPerKm: 0.42
  },
  btp: {
    id: 'btp',
    label: 'BTP / Construction',
    description: 'Entreprises générales, électriciens, HVAC',
    fleetRange: [25, 120],
    vehicleSpecs: [
      { brand: 'Renault', model: 'Master', category: 'UTILITY', energy: 'THERMAL', weight: 40 },
      { brand: 'Mercedes', model: 'Sprinter', category: 'UTILITY', energy: 'THERMAL', weight: 20 },
      { brand: 'Renault', model: 'Express', category: 'UTILITY', energy: 'THERMAL', weight: 25 },
      { brand: 'Toyota', model: 'Hilux', category: 'UTILITY', energy: 'THERMAL', weight: 10 },
      { brand: 'Peugeot', model: '308', category: 'PASSENGER', energy: 'HYBRID', weight: 5 },
    ],
    conductorFirstNames: ['Franck', 'David', 'Julien', 'Pierre', 'Sébastien', 'Laurent', 'Christophe', 'Stéphane'],
    conductorLastNames: ['Petit', 'Robert', 'Richard', 'Durand', 'Girard', 'Bonneau', 'Lambert', 'Fontaine'],
    utilizationRate: 0.84,
    avgKmPerVehiclePerMonth: 4200,
    avgCostPerKm: 0.38
  },
  distribution: {
    id: 'distribution',
    label: 'Distribution / Livraison',
    description: 'Logistique last-mile, e-commerce, grossistes',
    fleetRange: [30, 150],
    vehicleSpecs: [
      { brand: 'Renault', model: 'Master', category: 'UTILITY', energy: 'ELECTRIC', weight: 30 },
      { brand: 'Citroën', model: 'Jumper', category: 'UTILITY', energy: 'THERMAL', weight: 25 },
      { brand: 'Renault', model: 'Kangoo E-Tech', category: 'UTILITY', energy: 'ELECTRIC', weight: 30 },
      { brand: 'VW', model: 'Caddy', category: 'UTILITY', energy: 'THERMAL', weight: 10 },
      { brand: 'Toyota', model: 'Yaris Cross', category: 'PASSENGER', energy: 'HYBRID', weight: 5 },
    ],
    conductorFirstNames: ['Mehdi', 'Kevin', 'Théo', 'Samy', 'Bryan', 'Kévin', 'Romain', 'Alexis'],
    conductorLastNames: ['Dupont', 'Leroy', 'Moreau', 'Chevalier', 'Perrin', 'Colin', 'Mercier', 'Roux'],
    utilizationRate: 0.91,
    avgKmPerVehiclePerMonth: 5100,
    avgCostPerKm: 0.31
  },
  sante: {
    id: 'sante',
    label: 'Santé / Médico-social',
    description: 'Cliniques, SSIAD, HAD, aide à domicile',
    fleetRange: [15, 60],
    vehicleSpecs: [
      { brand: 'Renault', model: 'Clio E-Tech', category: 'PASSENGER', energy: 'HYBRID', weight: 35 },
      { brand: 'Peugeot', model: '208', category: 'PASSENGER', energy: 'ELECTRIC', weight: 25 },
      { brand: 'Renault', model: 'Kangoo Maxi', category: 'UTILITY', energy: 'HYBRID', weight: 25 },
      { brand: 'Toyota', model: 'Yaris Cross', category: 'PASSENGER', energy: 'HYBRID', weight: 15 },
    ],
    conductorFirstNames: ['Isabelle', 'Nathalie', 'Sylvie', 'Valérie', 'Christine', 'Sandrine', 'Laure', 'Julie'],
    conductorLastNames: ['Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Lefèvre', 'Simon', 'Michel'],
    utilizationRate: 0.68,
    avgKmPerVehiclePerMonth: 1900,
    avgCostPerKm: 0.29
  },
  commerce: {
    id: 'commerce',
    label: 'Commerce / VRP',
    description: 'Représentants, négoce, distribution non-alimentaire',
    fleetRange: [20, 80],
    vehicleSpecs: [
      { brand: 'Peugeot', model: '308', category: 'PASSENGER', energy: 'HYBRID', weight: 30 },
      { brand: 'VW', model: 'Passat', category: 'PASSENGER', energy: 'HYBRID', weight: 20 },
      { brand: 'VW', model: 'Tiguan', category: 'PASSENGER', energy: 'HYBRID', weight: 20 },
      { brand: 'Renault', model: 'Kangoo', category: 'UTILITY', energy: 'ELECTRIC', weight: 20 },
      { brand: 'Renault', model: 'Express', category: 'UTILITY', energy: 'THERMAL', weight: 10 },
    ],
    conductorFirstNames: ['Marc', 'Philippe', 'François', 'Jean-Pierre', 'Éric', 'Olivier', 'Pascal', 'Thierry'],
    conductorLastNames: ['Lambert', 'Rousseau', 'Morin', 'Girard', 'André', 'Lefebvre', 'Simon', 'Blanc'],
    utilizationRate: 0.76,
    avgKmPerVehiclePerMonth: 3600,
    avgCostPerKm: 0.44
  },
  vtc: {
    id: 'vtc',
    label: 'VTC Premium / Chauffeurs',
    description: 'VTC B2B, chauffeurs d\'affaires, shuttles aéroport',
    fleetRange: [10, 50],
    vehicleSpecs: [
      { brand: 'Tesla', model: 'Model 3', category: 'PASSENGER', energy: 'ELECTRIC', weight: 30 },
      { brand: 'BMW', model: 'i5', category: 'PASSENGER', energy: 'ELECTRIC', weight: 20 },
      { brand: 'Mercedes', model: 'Classe E PHEV', category: 'PASSENGER', energy: 'HYBRID', weight: 25 },
      { brand: 'Mercedes', model: 'Classe V', category: 'UTILITY', energy: 'THERMAL', weight: 15 },
      { brand: 'BMW', model: 'X5', category: 'PASSENGER', energy: 'HYBRID', weight: 10 },
    ],
    conductorFirstNames: ['Karim', 'Samir', 'Youssef', 'Mohamed', 'Ali', 'Hassan', 'Rachid', 'Nabil'],
    conductorLastNames: ['Benali', 'Kader', 'Mansouri', 'Bouali', 'Hamdi', 'Saidani', 'Bouzid', 'Lazreg'],
    utilizationRate: 0.89,
    avgKmPerVehiclePerMonth: 7200,
    avgCostPerKm: 0.52
  },
  public: {
    id: 'public',
    label: 'Secteur Public / Collectivités',
    description: 'Mairies, intercommunalités, offices HLM',
    fleetRange: [15, 60],
    vehicleSpecs: [
      { brand: 'Peugeot', model: 'Partner', category: 'UTILITY', energy: 'ELECTRIC', weight: 30 },
      { brand: 'Renault', model: 'Express', category: 'UTILITY', energy: 'ELECTRIC', weight: 20 },
      { brand: 'Renault', model: 'Clio', category: 'PASSENGER', energy: 'ELECTRIC', weight: 20 },
      { brand: 'Peugeot', model: '208', category: 'PASSENGER', energy: 'HYBRID', weight: 15 },
      { brand: 'Peugeot', model: '3008', category: 'PASSENGER', energy: 'HYBRID', weight: 15 },
    ],
    conductorFirstNames: ['Alain', 'Michel', 'Gérard', 'Bernard', 'Claude', 'Jean', 'Pierre', 'Paul'],
    conductorLastNames: ['Gilles', 'Adam', 'Renard', 'Charpentier', 'Chevallier', 'Brun', 'Colin', 'Denis'],
    utilizationRate: 0.65,
    avgKmPerVehiclePerMonth: 1800,
    avgCostPerKm: 0.33
  }
};

// Weighted random pick selon les weight des vehicleSpecs
export function pickVehicleSpec(specs: VehicleSpec[]): VehicleSpec {
  const total = specs.reduce((sum, s) => sum + s.weight, 0);
  let rand = Math.random() * total;
  for (const spec of specs) {
    rand -= spec.weight;
    if (rand <= 0) return spec;
  }
  return specs[specs.length - 1];
}
```

### Étape 2 — Générateur de flotte (`demo/generator.ts`)

```typescript
// src/lib/convex/demo/generator.ts
import { v } from 'convex/values';
import { action, internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';
import { DEMO_TEMPLATES, pickVehicleSpec, type DemoTemplateId } from './templates';
import crypto from 'node:crypto'; // disponible dans Convex

export const generateDemoOrg = action({
  args: {
    orgName: v.string(),
    templateId: v.string(),
    fleetSize: v.number(),
    country: v.string(),
    createdBy: v.string(),
    commercialName: v.string(),
    commercialPhone: v.string(),
    commercialCalendlyUrl: v.optional(v.string()),
    prospectName: v.string(),
    prospectEmail: v.optional(v.string()),
    prospectCity: v.optional(v.string()),
    notes: v.optional(v.string()),
    expiresAt: v.number()
  },
  handler: async (ctx, args) => {
    const template = DEMO_TEMPLATES[args.templateId as DemoTemplateId];
    if (!template) throw new Error(`Template inconnu : ${args.templateId}`);

    // 1. Créer l'organisation démo
    const orgId = await ctx.runMutation(internal.demo.generator.createDemoOrgInternal, {
      name: args.orgName,
      country: args.country,
      templateId: args.templateId,
      createdBy: args.createdBy,
      commercialName: args.commercialName,
      commercialPhone: args.commercialPhone,
      commercialCalendlyUrl: args.commercialCalendlyUrl,
      prospectName: args.prospectName,
      prospectEmail: args.prospectEmail,
      prospectCity: args.prospectCity,
      notes: args.notes,
      expiresAt: args.expiresAt
    });

    // 2. Générer les véhicules
    const vehicleIds: string[] = [];
    const clampedFleet = Math.max(template.fleetRange[0], Math.min(args.fleetSize, template.fleetRange[1]));

    for (let i = 0; i < clampedFleet; i++) {
      const spec = pickVehicleSpec(template.vehicleSpecs);
      const plateNum = String(Math.floor(Math.random() * 900) + 100);
      const plateSuffix = String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
      const registration = `DM-${plateNum}-${plateSuffix}`;
      const year = 2021 + Math.floor(Math.random() * 4);

      const vehicleId = await ctx.runMutation(internal.demo.generator.createDemoVehicleInternal, {
        organizationId: orgId,
        brand: spec.brand,
        model: spec.model,
        registration,
        year,
        energy: spec.energy,
        category: spec.category
      });
      vehicleIds.push(vehicleId);
    }

    // 3. Générer le token d'accès
    const token = crypto.randomBytes(24).toString('hex');
    await ctx.runMutation(internal.demo.generator.createDemoTokenInternal, { token, organizationId: orgId });

    // 4. Générer l'historique 30j (réservations passées, coûts)
    await ctx.runMutation(internal.demo.generator.generateDemoHistoryInternal, {
      organizationId: orgId,
      vehicleIds,
      template: args.templateId,
      conductorFirstNames: template.conductorFirstNames,
      conductorLastNames: template.conductorLastNames
    });

    return { orgId, token };
  }
});

export const createDemoOrgInternal = internalMutation({
  args: {
    name: v.string(),
    country: v.string(),
    templateId: v.string(),
    createdBy: v.string(),
    commercialName: v.string(),
    commercialPhone: v.string(),
    commercialCalendlyUrl: v.optional(v.string()),
    prospectName: v.string(),
    prospectEmail: v.optional(v.string()),
    prospectCity: v.optional(v.string()),
    notes: v.optional(v.string()),
    expiresAt: v.number()
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('organizations', {
      name: args.name,
      country: args.country,
      currency: args.country === 'GB' ? 'GBP' : args.country === 'SE' || args.country === 'NO' || args.country === 'DK' ? 'EUR' : 'EUR',
      locale: args.country === 'GB' ? 'en-GB' : 'fr-FR',
      timezone: args.country === 'GB' ? 'Europe/London' : 'Europe/Paris',
      distanceUnit: args.country === 'GB' ? 'miles' : 'km',
      paddlePlanTier: 'professional',   // toujours Professional pour les démos
      isDemo: true,
      demoConfig: {
        templateId: args.templateId as DemoTemplateId,
        createdBy: args.createdBy,
        commercialName: args.commercialName,
        commercialPhone: args.commercialPhone,
        commercialCalendlyUrl: args.commercialCalendlyUrl,
        prospectName: args.prospectName,
        prospectEmail: args.prospectEmail,
        prospectCity: args.prospectCity,
        notes: args.notes,
        expiresAt: args.expiresAt,
        extendedCount: 0,
        isExpired: false
      },
      createdAt: Date.now()
    });
  }
});

export const createDemoVehicleInternal = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    brand: v.string(),
    model: v.string(),
    registration: v.string(),
    year: v.number(),
    energy: v.union(v.literal('THERMAL'), v.literal('HYBRID'), v.literal('ELECTRIC')),
    category: v.union(v.literal('PASSENGER'), v.literal('UTILITY'), v.literal('TRUCK'))
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('vehicles', {
      ...args,
      status: Math.random() > 0.1 ? 'AVAILABLE' : 'MAINTENANCE',
      kilometers: Math.floor(20000 + Math.random() * 80000),
      createdAt: Date.now()
    });
  }
});

export const createDemoTokenInternal = internalMutation({
  args: { token: v.string(), organizationId: v.id('organizations') },
  handler: async (ctx, args) => {
    await ctx.db.insert('demoAccessTokens', {
      token: args.token,
      organizationId: args.organizationId,
      createdAt: Date.now(),
      usedCount: 0
    });
  }
});

export const generateDemoHistoryInternal = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    vehicleIds: v.array(v.string()),
    template: v.string(),
    conductorFirstNames: v.array(v.string()),
    conductorLastNames: v.array(v.string())
  },
  handler: async (ctx, { organizationId, vehicleIds, conductorFirstNames, conductorLastNames }) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Générer 4–8 réservations par véhicule sur 30j
    for (const vehicleId of vehicleIds) {
      const reservationCount = 4 + Math.floor(Math.random() * 5);
      for (let r = 0; r < reservationCount; r++) {
        const startOffset = Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000;
        const startDate = thirtyDaysAgo + startOffset;
        const duration = (2 + Math.floor(Math.random() * 6)) * 60 * 60 * 1000; // 2–8h
        const firstName = conductorFirstNames[Math.floor(Math.random() * conductorFirstNames.length)];
        const lastName = conductorLastNames[Math.floor(Math.random() * conductorLastNames.length)];

        await ctx.db.insert('reservations', {
          organizationId: organizationId as any,
          vehicleId: vehicleId as any,
          userId: `demo-user-${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
          startDate,
          endDate: startDate + duration,
          purpose: ['Visite client', 'Déplacement siège', 'Formation', 'Rendez-vous fournisseur'][Math.floor(Math.random() * 4)],
          status: 'COMPLETED',
          createdAt: startDate - 3600000,
          updatedAt: startDate + duration
        });
      }

      // 1–2 coûts par véhicule (carburant + entretien)
      await ctx.db.insert('costs', {
        organizationId: organizationId as any,
        vehicleId: vehicleId as any,
        category: 'FUEL',
        amount: 60 + Math.floor(Math.random() * 120),
        date: thirtyDaysAgo + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000,
        description: 'Carburant démo',
        source: 'MANUAL',
        createdBy: 'demo-system',
        createdAt: Date.now()
      });
    }
  }
});
```

### Étape 3 — Wizard de création (`/concierge/demos/new/+page.svelte`)

Le wizard suit le même pattern que `/onboarding/organization` (4 étapes, progress bar, état local).

**Structure du wizard :**

```
Étape 1 : Infos prospect
  - Nom entreprise (string, required)
  - Secteur → 7 cards cliquables avec icône + description (radio)
  - Pays (select : FR / GB / SE / NO / DK / DE / NL)
  - Taille flotte estimée (slider 15–150, pas de 5)
  - Nom contact + email + téléphone

Étape 2 : Paramètres démo
  - Date d'expiration (date picker, J+14 défaut, max J+30)
  - Infos commercial (pré-remplies depuis le profil du concierge connecté)
    → Nom commercial, téléphone direct, lien Calendly (optionnel)
  - Notes internes (textarea, non visibles du prospect)
  - Toggle : "Notifier le prospect par email à la création"

Étape 3 : Prévisualisation
  - Aperçu 5 véhicules exemple (générés côté client selon le template)
  - Métriques attendues (taux utilisation, km moyen, coût/km du template)
  - Pays + devise + langue

Étape 4 : Génération
  - Bouton "Créer le compte démo" → appelle generateDemoOrg (action Convex)
  - Spinner pendant génération (~5–10s)
  - Succès : affiche lien magique + bouton "Copier le lien" + bouton "Ouvrir la démo"
```

```svelte
<!-- Extrait clé : section template selector (étape 1) -->
<div class="grid grid-cols-2 md:grid-cols-3 gap-3">
  {#each Object.values(TEMPLATE_PREVIEW) as tpl}
    <button
      type="button"
      onclick={() => form.templateId = tpl.id}
      class="relative overflow-hidden rounded-xl border p-4 text-left transition-all
        {form.templateId === tpl.id
          ? 'border-[var(--brand)] bg-[var(--brand)]/5 ring-1 ring-[var(--brand)]'
          : 'border-border bg-card hover:border-border/80'}"
      style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
    >
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      <span class="text-2xl">{tpl.emoji}</span>
      <p class="mt-2 text-sm font-medium">{tpl.label}</p>
      <p class="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
    </button>
  {/each}
</div>
```

### Étape 4 — Route publique `/demo/[token]`

```typescript
// src/routes/[[lang]]/demo/[token]/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  // Résoudre le token → orgId via Convex HTTP client
  // Rediriger vers /admin/dashboard avec session démo auto
  // Pour le MVP : rediriger vers /signin avec le lien démo en return_to
  // et afficher le bandeau "Vous accédez à une démo Mycelium"
  
  // À implémenter : session sans mot de passe via Better Auth
  // Pour ce sprint : afficher une page "Accéder à votre démo" avec email optionnel
  return { token: params.token };
};
```

```svelte
<!-- /demo/[token]/+page.svelte — page d'accueil démo -->
<div class="min-h-screen flex items-center justify-center bg-background p-6">
  <div class="w-full max-w-sm space-y-6">
    <div class="text-center space-y-2">
      <Logo class="mx-auto size-10" />
      <h1 class="text-xl font-semibold">Votre démo Mycelium</h1>
      <p class="text-sm text-muted-foreground">
        {orgName} · Expire le {expiryDate}
      </p>
    </div>
    
    <!-- Si pas connecté → créer un compte démo ou se connecter -->
    <div class="relative overflow-hidden rounded-2xl border border-border bg-card p-6 space-y-4"
      style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06), 0 4px 16px oklch(0 0 0 / 0.08)">
      <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      <Button class="w-full bg-[var(--brand)] text-[var(--brand-foreground)]"
        href="/signup?demo_token={token}&return_to=/admin/dashboard">
        Accéder à ma démo
      </Button>
      <p class="text-center text-xs text-muted-foreground">
        Déjà un compte ? <a href="/signin?demo_token={token}" class="underline">Se connecter</a>
      </p>
    </div>
  </div>
</div>
```

### Étape 5 — Bandeau démo (`DemoBanner.svelte`)

```svelte
<!-- src/lib/components/demo/DemoBanner.svelte -->
<script lang="ts">
  import { useQuery } from '@mmailaender/convex-svelte';
  import { api } from '$lib/convex/_generated/api';
  import PhoneIcon from '@lucide/svelte/icons/phone';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membership = useQuery((api as any).organizations.getMyOrg, {});

  const isDemo = $derived(membership.data?.isDemo === true);
  const config = $derived(membership.data?.demoConfig ?? null);
  const daysLeft = $derived.by(() => {
    if (!config) return null;
    return Math.ceil((config.expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
  });
</script>

{#if isDemo && config}
  <div class="flex items-center justify-between border-b border-amber-500/20 bg-amber-500/5 px-4 py-2">
    <span class="text-xs text-amber-700 dark:text-amber-400">
      Démo Mycelium
      {#if daysLeft !== null && daysLeft > 0}
        · Expire dans {daysLeft} jour{daysLeft > 1 ? 's' : ''}
      {:else}
        · Expirée
      {/if}
    </span>
    <a
      href="tel:{config.commercialPhone}"
      class="flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-800 dark:text-amber-400"
    >
      <PhoneIcon class="size-3" />
      Des questions ? {config.commercialName}
    </a>
  </div>
{/if}
```

Ajouter `<DemoBanner />` en haut du layout `/admin/+layout.svelte` (avant le contenu principal).

---

## ✅ Critères d'acceptation

- [ ] Champs `isDemo` et `demoConfig` présents dans le schema `organizations`
- [ ] Tables `demoVehiclePositions` et `demoAccessTokens` créées avec tous les index
- [ ] Action `generateDemoOrg` crée une org + N véhicules + historique 30j en < 15s
- [ ] Véhicules générés avec registration format `DM-[3chiffres]-[2lettres]`
- [ ] Org démo a `paddlePlanTier: 'professional'` automatiquement
- [ ] Wizard `/concierge/demos/new` — 4 étapes, progress indicator, validation par étape
- [ ] Étape 1 : les 7 templates sont sélectionnables avec leur description
- [ ] Étape 4 : lien `/demo/[token]` affiché avec bouton "Copier" fonctionnel
- [ ] Route `/demo/[token]` accessible sans authentification
- [ ] `DemoBanner` visible sur les pages `/admin/*` si l'org est `isDemo: true`
- [ ] `DemoBanner` non visible pour les orgs réelles (`isDemo` absent ou false)
- [ ] Glass-metal sur toutes les cards du wizard (pattern obligatoire)

---

## 🚫 NE PAS FAIRE

- Ne pas utiliser de vraies immatriculations dans les véhicules démo (format DM- uniquement)
- Ne pas partager les queries admin normales (`getUserOrg`) avec la génération démo — utiliser les mutations internes dédiées
- Ne pas créer les crons de simulation dans ce prompt (P35)
- Ne pas créer la modale de conversion dans ce prompt (P35)
- Ne pas créer le dashboard `/concierge/demos` dans ce prompt (P35)
- Ne pas bloquer la mutation de création en attendant la génération complète — utiliser `action` Convex asynchrone
- Ne pas créer de vrais comptes Better Auth pour les conducteurs fictifs — les `userId` de réservations démo sont des strings fictifs (`demo-user-*`)
- Ne pas exposer `demoConfig.notes` (notes internes) dans l'interface prospect
