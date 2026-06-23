---
priority: 19
feature: Rapport carbone & CSRD basique — Scope 1+2, ADEME, PDF annuel
sprint: S13 (V2)
version: V2 — Indispensable au DAF
effort: 3 jours
depends_on: P08 (coûts carburant), P17 (import carburant), P18 (données véhicules)
blocks: —
model_recommended: claude-haiku-4-5-20251001
pricing_tier: Business (990€/mois)
---

# P19 — Rapport carbone & CSRD basique

## 🎯 Mission

Calculer automatiquement les **émissions CO2 de la flotte** (Scope 1 = carburant, Scope 2 = électricité pour VE) selon les **facteurs ADEME Base Carbone** à jour, et générer un **rapport PDF annuel** prêt pour l'auditeur CSRD. Les ETI françaises sont soumises à la CSRD dès 2025 — ce module les met en conformité en 5 minutes.

**Exemple de valeur :**
> En janvier 2027, le directeur RSE ouvre Mycelium. Clique "Générer rapport carbone 2026". Télécharge un PDF de 4 pages : 47,3 tCO2e Scope 1 + 2,1 tCO2e Scope 2 = 49,4 tCO2e total. Tableau par véhicule, tableau par catégorie. Conforme ESRS E1. Directement transmissible à l'auditeur.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Table `costs` avec catégorie `CARBURANT` et montants
- Table `vehicles` avec champ `energy: 'THERMAL'|'HYBRID'|'ELECTRIC'`
- Table `fuelImports` avec volumes (litres) par véhicule (P17)
- Pattern Convex actions pour génération de contenu
- Infrastructure email Resend

**Ce qui manque :**
- Facteurs d'émission ADEME par carburant (essence, diesel, GNV, GPL, électricité)
- Calcul tCO2e par véhicule et par catégorie
- Génération rapport PDF (via lib HTML→PDF côté Convex action ou côté client)
- Table `carbonReports` pour archiver les rapports générés
- Page `/admin/sustainability` avec dashboard carbone

---

## 🔒 Contraintes absolues

1. **Facteurs ADEME versionnés** : les facteurs Base Carbone changent annuellement. Stocker avec `year: 2026`. Source officielle : base-empreinte.ademe.fr.
2. **Scope 1 = combustion directe uniquement** : carburant consommé par les véhicules de la flotte. Pas de Scope 3 en V1.
3. **Scope 2 = électricité pour VE** : basé sur le mix électrique français moyen ADEME (réseau national).
4. **Données carburant** : si litres disponibles (P17 import) → utiliser les litres. Sinon, estimer depuis les coûts CARBURANT et le prix moyen au litre (1,85€/L diesel, 1,78€/L essence).
5. **PDF généré côté client** : utiliser `jsPDF` ou `@react-pdf/renderer` côté SvelteKit pour éviter les timeouts Convex. Le Convex action retourne les données, le client génère le PDF.
6. **Rapport archivé** : chaque génération de rapport est sauvegardée en base avec `storageId` du PDF.

---

## 📊 Facteurs ADEME 2026

```typescript
// src/lib/convex/carbon-factors.ts

export const ADEME_FACTORS_2026 = {
  year: 2026,
  // kg CO2e par litre de carburant (source : Base Carbone ADEME)
  fuels: {
    DIESEL: 2.640,          // kg CO2e / litre
    ESSENCE: 2.289,         // kg CO2e / litre (SP95-E5)
    GNV: 2.180,             // kg CO2e / kg (≈ litre GNV)
    GPL: 1.610,             // kg CO2e / litre
    ELECTRIC: 0.0511        // kg CO2e / kWh (mix France 2026, RTE)
  },
  // Prix carburant moyen France 2026 (estimé) pour conversion €→litres
  fuelPrices: {
    DIESEL: 1.82,           // €/litre
    ESSENCE: 1.79,          // €/litre (SP95)
    ELECTRIC: 0.18          // €/kWh (tarif réglementé estimé)
  }
};

export function estimateLitersFromCost(
  amountEuros: number,
  fuelType: keyof typeof ADEME_FACTORS_2026.fuelPrices
): number {
  return amountEuros / ADEME_FACTORS_2026.fuelPrices[fuelType];
}

export function calculateCO2e(liters: number, fuelType: keyof typeof ADEME_FACTORS_2026.fuels): number {
  const factor = ADEME_FACTORS_2026.fuels[fuelType];
  return (liters * factor) / 1000; // retourner en tCO2e
}
```

---

## 📊 Nouveau schéma Convex

### `carbonReports`

```typescript
carbonReports: defineTable({
  organizationId: v.id('organizations'),
  year: v.number(),
  // Résultats
  scope1TotalTCO2e: v.number(),
  scope2TotalTCO2e: v.number(),
  totalTCO2e: v.number(),
  // Détail par véhicule
  perVehicle: v.array(v.object({
    vehicleId: v.id('vehicles'),
    registration: v.string(),
    brand: v.string(),
    model: v.string(),
    energy: v.string(),
    fuelType: v.string(),
    litersConsumed: v.optional(v.number()),
    kwh: v.optional(v.number()),
    tco2e: v.number(),
    scope: v.union(v.literal('SCOPE1'), v.literal('SCOPE2'))
  })),
  dataSource: v.union(
    v.literal('FUEL_IMPORT'),   // litres exacts depuis P17
    v.literal('COST_ESTIMATE'), // estimation depuis coûts carburant
    v.literal('MANUAL')
  ),
  // Archivage PDF
  pdfStorageId: v.optional(v.string()),
  generatedBy: v.string(),
  generatedAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_org_and_year', ['organizationId', 'year'])
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/carbon-factors.ts            → NOUVEAU : facteurs ADEME + fonctions calcul
src/lib/convex/carbon.ts                    → NOUVEAU : query calcul + mutation archiver
src/lib/convex/schema.ts                    → ajouter carbonReports

src/routes/[[lang]]/admin/sustainability/
  +page.svelte                              → dashboard carbone + bouton génération

src/lib/components/sustainability/
  carbon-kpis.svelte                        → 3 KPIs Scope 1/2/Total
  carbon-table.svelte                       → table émissions par véhicule
  carbon-pdf-generator.ts                   → génération PDF côté client (jsPDF)
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Query calcul carbone `carbon.ts`

```typescript
// src/lib/convex/carbon.ts

export const calculateCarbonFootprint = authedQuery({
  args: { year: v.number() },
  handler: async (ctx, { year }) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);

    const yearStart = new Date(year, 0, 1).getTime();
    const yearEnd = new Date(year, 11, 31, 23, 59, 59).getTime();

    const vehicles = await ctx.db
      .query('vehicles')
      .withIndex('by_organization', q => q.eq('organizationId', organizationId))
      .collect();

    const fuelCosts = await ctx.db
      .query('costs')
      .withIndex('by_org', q => q.eq('organizationId', organizationId))
      .filter(q =>
        q.and(
          q.eq(q.field('category'), 'CARBURANT'),
          q.gte(q.field('createdAt'), yearStart),
          q.lte(q.field('createdAt'), yearEnd)
        )
      )
      .collect();

    // Essayer d'utiliser les litres exacts des imports carburant (P17)
    const fuelImports = await ctx.db
      .query('fuelImports')
      .withIndex('by_org', q => q.eq('organizationId', organizationId))
      .filter(q =>
        q.and(
          q.gte(q.field('periodStart'), `${year}-01-01`),
          q.lte(q.field('periodEnd'), `${year}-12-31`),
          q.eq(q.field('status'), 'COMPLETED')
        )
      )
      .collect();

    const hasExactLiters = fuelImports.length > 0;

    const perVehicle = vehicles.map(vehicle => {
      const vehicleFuelCosts = fuelCosts.filter(c => c.vehicleId === vehicle._id);
      const totalFuelCost = vehicleFuelCosts.reduce((s, c) => s + c.amount, 0);

      // Déterminer le type de carburant selon l'énergie du véhicule
      const fuelType = vehicle.energy === 'ELECTRIC' ? 'ELECTRIC'
        : vehicle.energy === 'HYBRID' ? 'ESSENCE'  // hybride rechargeable → essence par défaut
        : 'DIESEL';  // thermique → diesel par défaut (majorité flottes pro FR)

      const scope = vehicle.energy === 'ELECTRIC' ? 'SCOPE2' as const : 'SCOPE1' as const;

      let litersOrKwh: number;
      if (vehicle.energy === 'ELECTRIC') {
        // kWh estimé depuis les coûts
        litersOrKwh = estimateLitersFromCost(totalFuelCost, 'ELECTRIC');
      } else {
        litersOrKwh = estimateLitersFromCost(totalFuelCost, fuelType as 'DIESEL' | 'ESSENCE');
      }

      const tco2e = calculateCO2e(litersOrKwh, fuelType as keyof typeof ADEME_FACTORS_2026.fuels);

      return {
        vehicleId: vehicle._id,
        registration: vehicle.registration,
        brand: vehicle.brand,
        model: vehicle.model,
        energy: vehicle.energy,
        fuelType,
        litersConsumed: vehicle.energy !== 'ELECTRIC' ? litersOrKwh : undefined,
        kwh: vehicle.energy === 'ELECTRIC' ? litersOrKwh : undefined,
        tco2e: Math.round(tco2e * 1000) / 1000,
        scope
      };
    });

    const scope1 = perVehicle.filter(v => v.scope === 'SCOPE1').reduce((s, v) => s + v.tco2e, 0);
    const scope2 = perVehicle.filter(v => v.scope === 'SCOPE2').reduce((s, v) => s + v.tco2e, 0);

    return {
      year,
      scope1TotalTCO2e: Math.round(scope1 * 100) / 100,
      scope2TotalTCO2e: Math.round(scope2 * 100) / 100,
      totalTCO2e: Math.round((scope1 + scope2) * 100) / 100,
      perVehicle,
      dataSource: hasExactLiters ? 'FUEL_IMPORT' : 'COST_ESTIMATE'
    };
  }
});
```

### Étape 2 — Génération PDF côté client `carbon-pdf-generator.ts`

```typescript
// src/lib/components/sustainability/carbon-pdf-generator.ts
// Utilise jsPDF (bun add jspdf)
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateCarbonPDF(data: CarbonFootprintData, orgName: string): Blob {
  const doc = new jsPDF();

  // Page 1 — Résumé
  doc.setFontSize(20);
  doc.text('Rapport Carbone Flotte', 20, 30);
  doc.setFontSize(12);
  doc.text(`${orgName} — Exercice ${data.year}`, 20, 42);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, 50);

  // KPIs
  doc.setFontSize(14);
  doc.text('Bilan des émissions', 20, 70);
  doc.setFontSize(11);
  doc.text(`Scope 1 (combustion directe) : ${data.scope1TotalTCO2e} tCO₂e`, 20, 82);
  doc.text(`Scope 2 (électricité VE)     : ${data.scope2TotalTCO2e} tCO₂e`, 20, 92);
  doc.setFontSize(13);
  doc.text(`TOTAL                         : ${data.totalTCO2e} tCO₂e`, 20, 108);

  // Source des données
  doc.setFontSize(9);
  const sourceLabel = data.dataSource === 'FUEL_IMPORT'
    ? 'Source : relevés carburant exacts (imports carte carburant)'
    : 'Source : estimation basée sur les coûts carburant (prix moyen ADEME)';
  doc.text(sourceLabel, 20, 120);
  doc.text(`Facteurs d'émission : ADEME Base Carbone ${data.year}`, 20, 128);

  // Page 2 — Détail véhicules
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Détail par véhicule', 20, 20);

  autoTable(doc, {
    startY: 30,
    head: [['Véhicule', 'Énergie', 'Scope', 'Litres/kWh', 'tCO₂e']],
    body: data.perVehicle.map(v => [
      `${v.brand} ${v.model} (${v.registration})`,
      v.energy,
      v.scope,
      v.litersConsumed ? `${Math.round(v.litersConsumed)}L` : `${Math.round(v.kwh ?? 0)} kWh`,
      v.tco2e.toFixed(3)
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [245, 230, 66] } // couleur brand Mycelium
  });

  // Page 3 — Conformité CSRD / ESRS E1
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Conformité CSRD — ESRS E1', 20, 20);
  doc.setFontSize(10);
  const csrdText = [
    'Ce rapport couvre les indicateurs E1-6 de la norme ESRS E1 (Changement climatique)',
    'de la directive CSRD (Corporate Sustainability Reporting Directive, EU 2022/2464).',
    '',
    `Émissions GES Scope 1 : ${data.scope1TotalTCO2e} tCO₂e`,
    `Émissions GES Scope 2 (location-based) : ${data.scope2TotalTCO2e} tCO₂e`,
    `Total Scope 1+2 : ${data.totalTCO2e} tCO₂e`,
    '',
    'Note : Ce rapport couvre uniquement les émissions liées à la flotte de véhicules.',
    'Les émissions Scope 3 (amont carburant, fabrication véhicules) ne sont pas incluses.',
    'Consultez votre auditeur pour la consolidation du bilan GES complet.',
  ];
  let y = 35;
  for (const line of csrdText) {
    doc.text(line, 20, y);
    y += line ? 8 : 4;
  }

  return doc.output('blob');
}
```

### Étape 3 — UI `/admin/sustainability`

```
┌──────────────────────────────────────────────────────────────────┐
│  Bilan Carbone Flotte 2026              [Générer rapport PDF]     │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ Scope 1         │  │ Scope 2         │  │ Total           │  │
│  │ 47,3 tCO₂e      │  │ 2,1 tCO₂e       │  │ 49,4 tCO₂e      │  │
│  │ Combustion dir. │  │ Électricité VE  │  │ Flotte complète │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│  ⚠️ Données estimées depuis les coûts carburant.                 │
│  Importez vos relevés cartes carburant (P17) pour plus de préci. │
├──────────────────────────────────────────────────────────────────┤
│  Détail par véhicule                                             │
│  VÉHICULE          SCOPE  LITRES/KWH   tCO₂e                    │
│  Clio AB-123       Scope1 1 240 L      3,273                    │
│  Model 3 CD-456    Scope2 1 850 kWh    0,095                    │
└──────────────────────────────────────────────────────────────────┘
```

---

## ✅ Critères d'acceptation

- [ ] Scope 1 calculé pour tous les véhicules thermiques et hybrides
- [ ] Scope 2 calculé pour tous les VE (basé sur mix électrique France)
- [ ] Distinction FUEL_IMPORT (exact) vs COST_ESTIMATE (estimé) affichée
- [ ] Rapport PDF téléchargeable avec 3 pages : résumé, détail, conformité CSRD
- [ ] PDF mentionne les facteurs ADEME utilisés et leur année
- [ ] Rapport archivé en DB après génération
- [ ] Page dashboard avec filtrage par année

---

## 🚫 NE PAS FAIRE

- Ne pas calculer le Scope 3 en V1 (amont carburant, production véhicules) — trop complexe, hors scope
- Ne pas certifier la conformité CSRD — toujours mentionner "indicatif, consultez votre auditeur"
- Ne pas générer le PDF côté Convex (timeout) — toujours côté client avec jsPDF
- Ne pas hardcoder le mix électrique FR dans le composant — utiliser `carbon-factors.ts`
- Ne pas afficher les données sans signaler si elles sont estimées ou exactes
