---
priority: 18
feature: Optimisation fiscale — Avantage en nature, TVS, TVA récupérable, exports comptabilité
sprint: S13 (V2)
version: V2 — Indispensable au DAF
effort: 4 jours
depends_on: P08 (coûts), P11 (conducteurs), P17 (carburant)
blocks: P19 (rapport carbone utilise les données de consommation)
model_recommended: —
pricing_tier: Business (990€/mois) — module DAF avancé
---

# P18 — Optimisation fiscale

## 🎯 Mission

Calculer automatiquement les **obligations fiscales liées à la flotte** : avantage en nature (AEN) par véhicule et par salarié, Taxe sur les Véhicules de Sociétés (TVS 2026), récupération de TVA optimale sur les coûts, et générer les **exports multi-formats** compatibles avec les logiciels comptables (Pennylane, Cegid, Sage). Résultat : le DAF prépare sa déclaration fiscale annuelle en 15 minutes au lieu d'une journée.

**Exemple de valeur :**
> En décembre, le DAF ouvre le module fiscal. Mycelium a déjà calculé : AEN total = 48 200€ (à déclarer en DSN), TVS = 12 800€ (à payer en janvier), TVA récupérable = 6 400€. Il exporte le tableau récapitulatif en format Pennylane et l'envoie à son expert-comptable.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Table `costs` avec catégories (LEASING, CARBURANT, ASSURANCE, etc.)
- Table `vehicles` avec `energy: 'THERMAL'|'HYBRID'|'ELECTRIC'`
- Table `organizationMembers` avec userId
- Table `driverProfiles` (P11)
- Pattern queries Convex avec `getUserOrg`

**Ce qui manque :**
- Table `vehicleAssignments` : attribution véhicule de fonction à un salarié
- Calcul AEN (2 méthodes légales : réel ou forfaitaire)
- Calcul TVS 2026 (barème émissions CO2 + taux malus)
- Calcul TVA récupérable par catégorie de coût
- Export Excel multi-onglets
- Page `/admin/finance/fiscal` avec dashboard fiscal annuel

---

## 🔒 Contraintes absolues

1. **Barèmes 2026 hardcodés et versionnés** : TVS et AEN changent chaque année. Stocker dans des constantes versionées avec `year: 2026`. Jamais dans la DB.
2. **Deux méthodes AEN** : méthode forfaitaire (9% ou 6% selon véhicule perso/leasing × coût annuel) ET méthode réelle (km privés × coût total / km totaux). Proposer les deux, laisser le DAF choisir.
3. **TVA récupérable par catégorie** : règles fixes DROIT FR 2026 — carburant diesel = 80%, essence = 0%, électricité VP = 100%, entretien = 100%, assurance = 0%, parking = 100%.
4. **Export non-bloquant** : la génération d'export (CSV/Excel) ne doit jamais bloquer l'UI — utiliser un download direct avec `Blob`.
5. **Les calculs sont consultatifs** : ils ne remplacent pas un expert-comptable. Afficher un disclaimer légal.

---

## 📊 Barèmes 2026

### Avantage en nature (arrêté du 2 janvier 2025, applicable 2026)

```typescript
// src/lib/convex/fiscal-rates.ts

export const AEN_RATES_2026 = {
  year: 2026,
  // Méthode forfaitaire
  forfaitaire: {
    // Véhicule appartenant à l'entreprise :
    companyOwned: {
      withFuelPaid: 0.12,      // 12% du prix d'achat TTC (neuf ou catalogue)
      withoutFuelPaid: 0.09    // 9% du prix d'achat TTC
    },
    // Véhicule loué / leasing :
    leased: {
      withFuelPaid: 1.20,      // 120% du coût annuel (loyer + entretien + assurance)
      withoutFuelPaid: 1.00    // 100% du coût annuel
    }
  },
  // Méthode réelle : (km privés / km totaux) × coût total annuel
  // + coût carburant personnel si payé par l'entreprise
};

// TVS 2026 — Composante CO2 (g/km)
// Source : article 1010 CGI + LFI 2026
export const TVS_CO2_RATES_2026 = {
  year: 2026,
  tarif_annuel: [
    { min: 0,   max: 20,  rate: 0 },      // ≤ 20 g/km : exonéré (EV)
    { min: 21,  max: 60,  rate: 1 },      // 21-60 : EV range
    { min: 61,  max: 100, rate: 2 },
    { min: 101, max: 120, rate: 4.5 },
    { min: 121, max: 140, rate: 6.5 },
    { min: 141, max: 160, rate: 13 },
    { min: 161, max: 200, rate: 19.5 },
    { min: 201, max: 250, rate: 23.5 },
    { min: 251, max: Infinity, rate: 29 }  // €/g/km/an
  ]
};

// TVA récupérable par catégorie de coût véhicule VP
export const TVA_RECOVERY_RATES_2026: Record<string, number> = {
  CARBURANT_DIESEL: 0.80,
  CARBURANT_ESSENCE: 0.00,
  CARBURANT_ELECTRIC: 1.00,
  ENTRETIEN: 1.00,
  ASSURANCE: 0.00,
  LEASING: 0.00,     // véhicule de tourisme
  PARKING: 1.00,
  TELEPEAGE: 1.00,
  AUTRE: 0.50        // par défaut conservateur
};

export function calculateTVS(co2Gkm: number): number {
  const band = TVS_CO2_RATES_2026.tarif_annuel.find(
    b => co2Gkm >= b.min && co2Gkm <= b.max
  );
  return band ? co2Gkm * band.rate : 0;
}

export function calculateAEN_Forfaitaire(
  vehicleAnnualCost: number,   // prix achat ou loyer annuel en €
  ownership: 'company' | 'leased',
  fuelPaidByCompany: boolean
): number {
  const rates = AEN_RATES_2026.forfaitaire;
  if (ownership === 'company') {
    return vehicleAnnualCost * (fuelPaidByCompany ? rates.companyOwned.withFuelPaid : rates.companyOwned.withFuelPaid);
  }
  return vehicleAnnualCost * (fuelPaidByCompany ? rates.leased.withFuelPaid : rates.leased.withoutFuelPaid);
}
```

---

## 📊 Nouveau schéma Convex

### `vehicleAssignments`

```typescript
vehicleAssignments: defineTable({
  organizationId: v.id('organizations'),
  vehicleId: v.id('vehicles'),
  userId: v.string(),            // salarié ayant le véhicule de fonction
  startDate: v.string(),         // ISO date début attribution
  endDate: v.optional(v.string()),
  fuelPaidByCompany: v.boolean(),
  privateUseAllowed: v.boolean(),
  privateKmPerYear: v.optional(v.number()),  // km privés déclarés/estimés
  aenMethod: v.union(v.literal('FORFAITAIRE'), v.literal('REEL')),
  notes: v.optional(v.string()),
  createdBy: v.string(),
  createdAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_vehicle', ['vehicleId'])
  .index('by_user', ['userId'])
  .index('by_org_and_active', ['organizationId', 'endDate'])
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/fiscal-rates.ts              → NOUVEAU : barèmes + fonctions calcul
src/lib/convex/fiscal.ts                    → NOUVEAU : queries calcul + export
src/lib/convex/schema.ts                    → ajouter vehicleAssignments
src/lib/convex/vehicles.ts                  → MODIFIER : ajouter champ co2Gkm

src/routes/[[lang]]/admin/finance/
  fiscal/+page.svelte                       → dashboard fiscal annuel

src/lib/components/finance/
  fiscal-dashboard.svelte                   → KPIs AEN + TVS + TVA
  aen-table.svelte                          → table AEN par salarié
  tvs-table.svelte                          → table TVS par véhicule
  export-modal.svelte                       → sélection format + download
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Ajouter `co2Gkm` à la table vehicles

```typescript
// Schema : ajouter à vehicles
co2Gkm: v.optional(v.number()),           // émissions CO2 en g/km (WLTP)
purchasePrice: v.optional(v.number()),    // prix d'achat TTC en €
```

### Étape 2 — Query calcul fiscal annuel

```typescript
// src/lib/convex/fiscal.ts

export const getFiscalSummary = authedQuery({
  args: { year: v.number() },
  handler: async (ctx, { year }) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);

    const vehicles = await ctx.db
      .query('vehicles')
      .withIndex('by_organization', q => q.eq('organizationId', organizationId))
      .filter(q => q.neq(q.field('status'), 'RETIRED'))
      .collect();

    const assignments = await ctx.db
      .query('vehicleAssignments')
      .withIndex('by_org', q => q.eq('organizationId', organizationId))
      .filter(q => {
        const yearStart = `${year}-01-01`;
        const yearEnd = `${year}-12-31`;
        return q.and(
          q.lte(q.field('startDate'), yearEnd),
          q.or(q.gte(q.field('endDate'), yearStart), q.eq(q.field('endDate'), undefined))
        );
      })
      .collect();

    const yearStart = new Date(year, 0, 1).getTime();
    const yearEnd = new Date(year, 11, 31, 23, 59, 59).getTime();

    const costs = await ctx.db
      .query('costs')
      .withIndex('by_org', q => q.eq('organizationId', organizationId))
      .filter(q =>
        q.and(
          q.gte(q.field('createdAt'), yearStart),
          q.lte(q.field('createdAt'), yearEnd)
        )
      )
      .collect();

    // Calcul TVS
    const tvsPerVehicle = vehicles.map(v => ({
      vehicleId: v._id,
      label: `${v.brand} ${v.model} (${v.registration})`,
      co2Gkm: v.co2Gkm ?? 0,
      tvsAnnuel: v.co2Gkm ? calculateTVS(v.co2Gkm) : 0
    }));
    const totalTVS = tvsPerVehicle.reduce((s, v) => s + v.tvsAnnuel, 0);

    // Calcul AEN
    const aenPerAssignment = assignments.map(a => {
      const vehicle = vehicles.find(v => v._id === a.vehicleId);
      const vehicleCosts = costs.filter(c => c.vehicleId === a.vehicleId);
      const annualCost = vehicleCosts.reduce((s, c) => s + c.amount, 0);

      const aen = calculateAEN_Forfaitaire(
        vehicle?.purchasePrice ?? annualCost,
        vehicle?.purchasePrice ? 'company' : 'leased',
        a.fuelPaidByCompany
      );

      return {
        userId: a.userId,
        vehicleId: a.vehicleId,
        vehicleLabel: vehicle ? `${vehicle.brand} ${vehicle.model}` : '—',
        aenAnnuel: Math.round(aen * 100) / 100,
        method: a.aenMethod
      };
    });
    const totalAEN = aenPerAssignment.reduce((s, a) => s + a.aenAnnuel, 0);

    // Calcul TVA récupérable
    const tvaRecovery = costs.reduce((total, cost) => {
      const category = cost.category;
      const isElectric = vehicles.find(v => v._id === cost.vehicleId)?.energy === 'ELECTRIC';
      const key = category === 'CARBURANT'
        ? (isElectric ? 'CARBURANT_ELECTRIC' : 'CARBURANT_DIESEL')
        : category;
      const rate = TVA_RECOVERY_RATES_2026[key] ?? TVA_RECOVERY_RATES_2026.AUTRE;
      const vatAmount = cost.vatAmount ?? cost.amount * 0.2; // TVA estimée 20%
      return total + vatAmount * rate;
    }, 0);

    return {
      year,
      totalTVS: Math.round(totalTVS),
      totalAEN: Math.round(totalAEN),
      totalTVARecovery: Math.round(tvaRecovery),
      tvsPerVehicle,
      aenPerAssignment
    };
  }
});
```

### Étape 3 — Export Excel multi-onglets

```typescript
// src/lib/convex/fiscal.ts — action export CSV (format Excel-compatible)

export const exportFiscalCSV = authedQuery({
  args: { year: v.number() },
  handler: async (ctx, args) => {
    // Retourner les données structurées pour génération côté client
    // La génération du fichier se fait dans le composant Svelte avec une lib légère
    const summary = await getFiscalSummaryData(ctx, args);
    return summary;
  }
});

// Côté client (composant export-modal.svelte) :
// function exportToCSV(data: FiscalSummary) {
//   const rows = data.aenPerAssignment.map(a => [a.userId, a.vehicleLabel, a.aenAnnuel]);
//   const csv = [['Salarié','Véhicule','AEN Annuel (€)'], ...rows]
//     .map(r => r.join(';')).join('\n');
//   const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
//   const url = URL.createObjectURL(blob);
//   const a = document.createElement('a'); a.href = url;
//   a.download = `mycelium-fiscal-${data.year}.csv`;
//   a.click();
// }
```

### Étape 4 — UI `/admin/finance/fiscal`

```
┌──────────────────────────────────────────────────────────────────┐
│  Bilan fiscal flotte 2026                      [Exporter Excel]  │
├──────────────────────────────────────────────────────────────────┤
│  KPIs annuels                                                    │
│  ┌──────────────────┐ ┌──────────────────┐ ┌─────────────────┐  │
│  │ TVS à payer      │ │ AEN total        │ │ TVA récupérable │  │
│  │ 12 800 €         │ │ 48 200 €         │ │ 6 400 €         │  │
│  │ (à déclarer jan) │ │ (à déclarer DSN) │ │ (sur déclaration│  │
│  └──────────────────┘ └──────────────────┘ └─────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│  TVS par véhicule                                                │
│  VÉHICULE              CO2 (g/km)   TVS ANNUEL                  │
│  Renault Clio AB-123   112 g/km     504 €                       │
│  Tesla Model 3 CD-456  0 g/km       0 € (exonéré EV)           │
├──────────────────────────────────────────────────────────────────┤
│  Avantage en nature par salarié                                  │
│  SALARIÉ        VÉHICULE            MÉTHODE      AEN ANNUEL     │
│  Jean Dupont    308 AB-123           Forfaitaire  4 200 €       │
│                                                                 │
│  ⚠️ Disclaimer : Ces calculs sont indicatifs. Consultez votre   │
│  expert-comptable pour la déclaration officielle.               │
└──────────────────────────────────────────────────────────────────┘
```

---

## ✅ Critères d'acceptation

- [ ] TVS calculée pour chaque véhicule selon barème CO2 2026
- [ ] AEN calculée pour chaque attribution active, méthode forfaitaire
- [ ] TVA récupérable estimée selon catégorie de coût et type d'énergie
- [ ] Export CSV multi-onglets téléchargeable (AEN + TVS + TVA)
- [ ] Disclaimer légal affiché sur la page
- [ ] Véhicule électrique = TVS = 0€ (exonération correcte)
- [ ] Pas de calcul si `co2Gkm` non renseigné → afficher "données manquantes"

---

## 🚫 NE PAS FAIRE

- Ne pas calculer la TVA sur les assurances (exonération légale)
- Ne pas utiliser l'IA pour calculer la TVS ou l'AEN — barèmes déterministes uniquement
- Ne pas afficher ces données sans le disclaimer légal
- Ne pas créer des exports PDF en V1 — CSV suffit (PDF en V2 avec une lib)
- Ne pas implémenter le calcul AEN méthode réelle sans données km privés validées
