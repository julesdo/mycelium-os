---
priority: 8
feature: Tracking financier — Saisie des coûts + Dashboard financier
sprint: S7 (V2)
version: V2 — Indispensable au DAF
effort: 4 jours
depends_on: P01 (véhicules), schema.ts (costs table complète)
blocks: P10 (Optimiseur utilise les coûts)
pricing_tier: Pro (590€/mois) et au-dessus
---

# P08 — Tracking financier (coûts + dashboard)

## 🎯 Mission
Donner au DAF une vue complète des dépenses flotte : saisie manuelle d'un coût, import de relevés carburant, et dashboard financier avec ventilation par catégorie et par véhicule. C'est le module qui justifie de passer de 290€ à 590€/mois.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Table `costs` complète dans schema.ts (9 catégories, montant TTC, TVA, etc.)
- Routes `/admin/finance` et `/admin/finance/costs` (shells)
- `src/lib/convex/costs.ts` (vérifier le contenu)

**Ce qui manque :**
- Mutations `createCost`, `updateCost`, `deleteCost`, `importCostsFromCSV`
- Queries analytics : total par catégorie, par véhicule, par période
- UI page `/admin/finance` : dashboard avec KPIs financiers
- UI page `/admin/finance/costs` : liste + formulaire de saisie + import CSV

---

## 🔒 Contraintes absolues

1. **Guard ORG_ADMIN** : saisir un coût = ORG_ADMIN uniquement. Voir le dashboard = ORG_ADMIN et ORG_MANAGER.
2. **Montants en euros** : `amount` est en centimes d'euro dans la DB (×100) OU en euros avec 2 décimales — **choisir une convention et s'y tenir dans toute la codebase**. Recommandé : euros en float (ex: 150.50).
3. **Periode** : le `date` d'un coût est un timestamp Unix ms (date de la dépense, pas de la saisie).
4. **Source** : toujours renseigner `source: 'MANUAL'` pour la saisie, `'IMPORT'` pour CSV.
5. **Pas de suppression physique** : les coûts ne se suppriment pas, ils se marquent comme `deleted: true` (à ajouter au schema si nécessaire, ou utiliser une mutation qui les archive).

---

## 📊 Schéma Convex exact — table `costs`

```typescript
costs: defineTable({
  organizationId: v.id('organizations'),
  vehicleId: v.optional(v.id('vehicles')),  // null = coût global org
  category: v.union(
    v.literal('LEASING'), v.literal('CARBURANT'), v.literal('ENTRETIEN'),
    v.literal('ASSURANCE'), v.literal('TAXES'), v.literal('SINISTRE'),
    v.literal('PARKING'), v.literal('TELEPEAGE'), v.literal('AUTRE')
  ),
  amount: v.number(),             // montant TTC en euros
  vatAmount: v.optional(v.number()),   // montant TVA
  date: v.number(),               // timestamp ms de la dépense
  description: v.string(),
  invoiceUrl: v.optional(v.string()),
  invoiceStorageId: v.optional(v.string()),
  source: v.union(v.literal('MANUAL'), v.literal('IMPORT'), v.literal('API')),
  createdBy: v.string(),          // Better Auth user ID
  createdAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_vehicle', ['vehicleId'])
  .index('by_org_date', ['organizationId', 'date'])
  .index('by_category', ['organizationId', 'category'])
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/costs.ts                     → mutations + queries analytics
src/routes/[[lang]]/admin/finance/+page.svelte           → dashboard financier
src/routes/[[lang]]/admin/finance/costs/+page.svelte     → liste + saisie + import
src/lib/components/finance/
  cost-form.svelte
  cost-table.svelte
  cost-category-chart.svelte     → donut par catégorie
  cost-vehicle-chart.svelte      → bar chart par véhicule
  csv-import-costs-modal.svelte
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Mutations dans `costs.ts`

```typescript
export const createCost = authedMutation({
  args: {
    vehicleId: v.optional(v.id('vehicles')),
    category: categoryValidator,
    amount: v.number(),
    vatAmount: v.optional(v.number()),
    date: v.number(),
    description: v.string(),
    invoiceStorageId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);
    
    if (args.amount <= 0) throw new ConvexError('Le montant doit être positif');
    
    // Vérifier que le véhicule appartient à l'org si spécifié
    if (args.vehicleId) {
      const vehicle = await ctx.db.get(args.vehicleId);
      if (!vehicle || vehicle.organizationId !== organizationId)
        throw new ConvexError('Véhicule introuvable');
    }
    
    return ctx.db.insert('costs', {
      organizationId,
      ...args,
      source: 'MANUAL',
      createdBy: ctx.user._id,
      createdAt: Date.now()
    });
  }
});
```

### Étape 2 — Query analytics `getFinancialDashboard`

```typescript
export const getFinancialDashboard = authedQuery({
  args: {
    period: v.union(
      v.literal('this_month'), v.literal('last_month'),
      v.literal('this_quarter'), v.literal('this_year')
    )
  },
  handler: async (ctx, { period }) => {
    const { organizationId } = await getUserOrg(ctx);
    const { startDate, endDate } = getPeriodBounds(period);
    
    const costs = await ctx.db
      .query('costs')
      .withIndex('by_org_date', q =>
        q.eq('organizationId', organizationId).gte('date', startDate).lte('date', endDate)
      )
      .collect();
    
    // Total général
    const totalAmount = costs.reduce((sum, c) => sum + c.amount, 0);
    
    // Par catégorie
    const byCategory = costs.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] ?? 0) + c.amount;
      return acc;
    }, {} as Record<string, number>);
    
    // Par véhicule (top 10)
    const byVehicle = costs
      .filter(c => c.vehicleId)
      .reduce((acc, c) => {
        const key = c.vehicleId!;
        acc[key] = (acc[key] ?? 0) + c.amount;
        return acc;
      }, {} as Record<string, number>);
    
    // Coût par km (si kilométrage dispo) → calculer approximatif
    
    return { totalAmount, byCategory, byVehicle, period, startDate, endDate };
  }
});

function getPeriodBounds(period: string): { startDate: number; endDate: number } {
  const now = new Date();
  switch (period) {
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: start.getTime(), endDate: now.getTime() };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { startDate: start.getTime(), endDate: end.getTime() };
    }
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      return { startDate: start.getTime(), endDate: now.getTime() };
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { startDate: start.getTime(), endDate: now.getTime() };
    }
    default:
      return { startDate: now.getTime() - 30 * 24 * 60 * 60 * 1000, endDate: now.getTime() };
  }
}
```

### Étape 3 — Import CSV relevés carburant (format Total Cards)

Format CSV Total Cards typique :
```
Date;Immatriculation;Volume(L);Prix unitaire;Montant TTC;Site
15/01/2026;AB-123-CD;42.5;1.89;80.33;Total Bordeaux Mériadeck
```

Parser : détecter le format (Total, BP, générique), mapper les colonnes, matcher le véhicule par immatriculation, créer les coûts avec `source: 'IMPORT'`, catégorie `CARBURANT`.

```typescript
export const importFuelCosts = authedMutation({
  args: {
    rows: v.array(v.object({
      registration: v.string(),
      date: v.string(),   // "DD/MM/YYYY"
      amount: v.number(),
      liters: v.optional(v.number()),
      location: v.optional(v.string())
    }))
  },
  handler: async (ctx, { rows }) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);
    
    // Charger tous les véhicules de l'org pour le matching
    const vehicles = await ctx.db.query('vehicles')
      .withIndex('by_org', q => q.eq('organizationId', organizationId))
      .collect();
    
    const vehicleByReg = new Map(vehicles.map(v => [v.registration.toUpperCase(), v]));
    
    let imported = 0;
    const errors: string[] = [];
    
    for (const row of rows) {
      const vehicle = vehicleByReg.get(row.registration.toUpperCase());
      if (!vehicle) {
        errors.push(`Immatriculation non trouvée : ${row.registration}`);
        continue;
      }
      
      const [day, month, year] = row.date.split('/');
      const dateTs = new Date(+year, +month - 1, +day).getTime();
      
      await ctx.db.insert('costs', {
        organizationId,
        vehicleId: vehicle._id,
        category: 'CARBURANT',
        amount: row.amount,
        date: dateTs,
        description: row.location ? `Carburant — ${row.location}` : 'Import relevé carburant',
        source: 'IMPORT',
        createdBy: ctx.user._id,
        createdAt: Date.now()
      });
      imported++;
    }
    
    return { imported, errors };
  }
});
```

### Étape 4 — Dashboard financier layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Finance flotte    [Ce mois ▾]  [Ce trimestre]  [Cette année]   │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│ Total dépenses│ Carburant    │ Entretien    │ Leasing            │
│ 8 450 €      │ 1 200 €      │ 650 €        │ 5 800 €            │
├──────────────────────────────┬──────────────────────────────────┤
│  Répartition par catégorie   │  Top 5 véhicules les plus coûteux│
│  [Donut chart]               │  [Bar chart horizontal]          │
├──────────────────────────────┴──────────────────────────────────┤
│  Dernières dépenses saisies                 [+ Saisir un coût]  │
│  [Table : date | véhicule | catégorie | montant | source]       │
└────────────────────────────────────────────────────────────────┘
```

---

## ✅ Critères d'acceptation

- [ ] Saisir un coût manuellement avec tous les champs
- [ ] Importer un CSV de relevé carburant Total Cards
- [ ] Dashboard avec les KPIs financiers pour la période sélectionnée
- [ ] Ventilation par catégorie (donut)
- [ ] Top 5 véhicules les plus coûteux (bar)
- [ ] Filtre par période (ce mois, trimestre, année)
- [ ] Export CSV de la liste des coûts sur une période

---

## 🚫 NE PAS FAIRE

- Ne pas permettre les montants négatifs (les remboursements seront gérés plus tard)
- Ne pas exposer les coûts d'autres orgs
- Ne pas inventer des agrégations — tout vient des vraies données en base
- Ne pas oublier de matcher les immatriculations de manière case-insensitive lors de l'import
- Ne pas tronquer les imports CSV à moins de 500 lignes (une carte Total peut avoir 200 lignes/mois × 3 mois)

---

## 🧪 Tests requis

```typescript
test('créer un coût manuel', ...);
test('import CSV carburant avec matching immatriculation', ...);
test('import CSV avec immatriculation inconnue → erreur non bloquante', ...);
test('dashboard financier avec période this_month', ...);
test('ORG_MEMBER ne peut pas accéder aux finances', ...);
```

---

## 💡 Labels français pour les catégories

```typescript
export const COST_CATEGORY_LABELS: Record<string, string> = {
  LEASING: 'Leasing / LOA',
  CARBURANT: 'Carburant',
  ENTRETIEN: 'Entretien',
  ASSURANCE: 'Assurance',
  TAXES: 'Taxes (TVS, etc.)',
  SINISTRE: 'Sinistre',
  PARKING: 'Parking',
  TELEPEAGE: 'Télépéage',
  AUTRE: 'Autre'
};
```
