---
priority: 15
feature: Notes de frais IK — Indemnités kilométriques véhicule personnel
sprint: S11 (V1.5)
version: V1 — MVP Pool Sharing Light
effort: 3 jours
depends_on: P02 (réservations), P11 (conducteurs)
blocks: —
model_recommended: —
pricing_tier: Starter (290€/mois) — feature RH/salarié basique
---

# P15 — Notes de frais IK (Indemnités Kilométriques)

## 🎯 Mission

Permettre aux salariés d'enregistrer leurs trajets professionnels effectués avec **leur véhicule personnel** (pas un véhicule de pool) et de générer automatiquement la note de frais IK selon le **barème fiscal URSSAF en vigueur**. Le RH/DAF valide, exporte en CSV pour la paie, et l'URSSAF est couvert.

**Exemple de valeur :**
> Sophie utilise sa propre voiture (5CV fiscaux) pour aller chez un client à 45km. Elle saisit le trajet dans Mycelium. Le système calcule 45km × 0,636 €/km = 28,62€ IK. Le RH valide en un clic et exporte pour Silae.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Table `organizationMembers` avec rôles
- Pattern `authedMutation`, `getUserOrg` dans `functions.ts`
- Infrastructure export CSV (P08)
- Page `/app/reservations` comme référence UX salarié

**Ce qui manque :**
- Table `mileageExpenses` : trajets + calcul IK
- Barème fiscal IK 2026 (5 tranches de CV fiscaux)
- Page salarié `/app/expenses` : liste + formulaire de saisie
- Page admin `/admin/expenses` : validation + export
- Génération justificatif PDF

---

## 🔒 Contraintes absolues

1. **Barème fiscal hardcodé et versionné** : le barème IK change chaque année (arrêté ministériel). Stocker en constante avec année de référence. Ne jamais calculer à la main dans le composant UI — toujours via la fonction `calculateIK(cv, km, year)`.
2. **Validation admin obligatoire** : aucun IK n'est payé sans `status: 'APPROVED'` par un ORG_ADMIN ou ORG_MANAGER. Le salarié ne peut pas s'auto-valider.
3. **Multi-tenant strict** : toutes les queries filtrent par `organizationId`.
4. **Immutabilité post-approbation** : un IK approuvé ne peut plus être modifié (seulement annulé avec motif).
5. **Pas de géolocalisation MVP** : saisie manuelle km uniquement. La géoloc (capteurs smartphone) est V3.

---

## 📊 Barème IK 2026 (arrêté du 7 avril 2026)

```typescript
// src/lib/convex/ik-rates.ts

export const IK_RATES_2026 = {
  year: 2026,
  bands: [
    // { cv, upTo5000km, from5001to20000km, above20000km }
    { cv: 3, d: 0.502, base: 0.273, excess: 2143 },  // tarif = d si ≤5000, sinon (km × 0.273) + 2143
    { cv: 4, d: 0.575, base: 0.323, excess: 2760 },
    { cv: 5, d: 0.636, base: 0.359, excess: 3385 },
    { cv: 6, d: 0.665, base: 0.374, excess: 3645 },
    { cv: 7, d: 0.697, base: 0.394, excess: 4170 }
    // 7+ CV : même barème que 7 CV
  ]
};

export function calculateIK(
  fiscalPower: number,      // CV fiscaux du véhicule personnel
  km: number,               // kilomètres du trajet
  yearKmTotal: number = 0,  // km déjà parcourus cette année (pour la tranche)
  year: number = 2026
): number {
  const rates = IK_RATES_2026;
  const cv = Math.min(fiscalPower, 7); // plafond 7 CV
  const band = rates.bands.find(b => b.cv === cv) ?? rates.bands[rates.bands.length - 1];

  const totalKm = yearKmTotal + km;

  if (totalKm <= 5000) {
    return Math.round(km * band.d * 100) / 100;
  } else if (yearKmTotal >= 20000) {
    // Déjà au-delà de 20 000 km → tarif plat
    return Math.round(km * band.base * 100) / 100;
  } else if (yearKmTotal < 5000 && totalKm > 5000) {
    // Trajet à cheval sur deux tranches
    const kmAt5000 = 5000 - yearKmTotal;
    const kmAbove5000 = km - kmAt5000;
    const part1 = kmAt5000 * band.d;
    const part2 = kmAbove5000 * band.base + band.excess; // formule tranche 5001-20000
    return Math.round((part1 + part2) * 100) / 100;
  } else {
    // Tranche 5001-20000 km
    return Math.round((km * band.base + band.excess) * 100) / 100;
  }
}
```

---

## 📊 Nouveau schéma Convex

### `mileageExpenses`

```typescript
mileageExpenses: defineTable({
  organizationId: v.id('organizations'),
  userId: v.string(),           // Better Auth string ID du salarié
  date: v.string(),             // ISO date "2026-06-15"
  purpose: v.string(),          // objet du déplacement professionnel
  departureLocation: v.string(),
  arrivalLocation: v.string(),
  roundTrip: v.boolean(),
  distanceKm: v.number(),       // km saisis manuellement
  fiscalPower: v.number(),      // CV fiscaux véhicule perso
  vehicleDescription: v.optional(v.string()),  // ex: "Renault Clio 2019"
  calculatedAmount: v.number(), // montant calculé en €
  status: v.union(
    v.literal('DRAFT'),
    v.literal('SUBMITTED'),
    v.literal('APPROVED'),
    v.literal('REJECTED'),
    v.literal('PAID')
  ),
  approvedBy: v.optional(v.string()),  // userId admin
  approvedAt: v.optional(v.number()),
  rejectionReason: v.optional(v.string()),
  paidAt: v.optional(v.number()),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_user', ['userId'])
  .index('by_org_and_user', ['organizationId', 'userId'])
  .index('by_org_and_status', ['organizationId', 'status'])
  .index('by_org_and_date', ['organizationId', 'date'])
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/ik-rates.ts                  → NOUVEAU : barème + fonction calculateIK
src/lib/convex/expenses.ts                  → NOUVEAU : queries + mutations
src/lib/convex/schema.ts                    → ajouter mileageExpenses

src/routes/[[lang]]/app/expenses/
  +page.svelte                              → liste mes IK + bouton "Nouvelle note"
  new/+page.svelte                          → formulaire saisie trajet

src/routes/[[lang]]/admin/expenses/
  +page.svelte                              → liste toutes les notes IK + validation + export

src/lib/components/expenses/
  expense-form.svelte                       → formulaire avec calcul IK live
  expense-table.svelte                      → table avec filtres statut/période/user
  expense-status-badge.svelte               → badge coloré par statut
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Mutations `expenses.ts`

```typescript
// src/lib/convex/expenses.ts
import { calculateIK } from './ik-rates';

export const createExpense = authedMutation({
  args: {
    date: v.string(),
    purpose: v.string(),
    departureLocation: v.string(),
    arrivalLocation: v.string(),
    roundTrip: v.boolean(),
    distanceKm: v.number(),
    fiscalPower: v.union(v.literal(3), v.literal(4), v.literal(5), v.literal(6), v.literal(7)),
    vehicleDescription: v.optional(v.string()),
    notes: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getUserOrg(ctx);

    const km = args.roundTrip ? args.distanceKm * 2 : args.distanceKm;

    // Calculer le total km de l'année pour cet utilisateur (tranche progressive)
    const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime();
    const yearExpenses = await ctx.db
      .query('mileageExpenses')
      .withIndex('by_org_and_user', q =>
        q.eq('organizationId', organizationId).eq('userId', ctx.user._id)
      )
      .filter(q =>
        q.and(
          q.gte(q.field('createdAt'), startOfYear),
          q.neq(q.field('status'), 'REJECTED')
        )
      )
      .collect();

    const yearKmTotal = yearExpenses.reduce((sum, e) => sum + e.distanceKm, 0);
    const calculatedAmount = calculateIK(args.fiscalPower, km, yearKmTotal);

    const now = Date.now();
    return ctx.db.insert('mileageExpenses', {
      organizationId,
      userId: ctx.user._id,
      date: args.date,
      purpose: args.purpose,
      departureLocation: args.departureLocation,
      arrivalLocation: args.arrivalLocation,
      roundTrip: args.roundTrip,
      distanceKm: km,
      fiscalPower: args.fiscalPower,
      vehicleDescription: args.vehicleDescription,
      calculatedAmount,
      status: 'SUBMITTED',
      notes: args.notes,
      createdAt: now,
      updatedAt: now
    });
  }
});

export const approveExpense = authedMutation({
  args: { expenseId: v.id('mileageExpenses') },
  handler: async (ctx, { expenseId }) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);

    const expense = await ctx.db.get(expenseId);
    if (!expense || expense.organizationId !== organizationId)
      throw new ConvexError('Note de frais introuvable');
    if (expense.status !== 'SUBMITTED')
      throw new ConvexError('Seules les notes en attente peuvent être approuvées');

    await ctx.db.patch(expenseId, {
      status: 'APPROVED',
      approvedBy: ctx.user._id,
      approvedAt: Date.now(),
      updatedAt: Date.now()
    });
  }
});

export const rejectExpense = authedMutation({
  args: { expenseId: v.id('mileageExpenses'), reason: v.string() },
  handler: async (ctx, { expenseId, reason }) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);

    const expense = await ctx.db.get(expenseId);
    if (!expense || expense.organizationId !== organizationId)
      throw new ConvexError('Note de frais introuvable');

    await ctx.db.patch(expenseId, {
      status: 'REJECTED',
      rejectionReason: reason,
      updatedAt: Date.now()
    });
  }
});
```

### Étape 2 — Queries

```typescript
export const listMyExpenses = authedQuery({
  args: {
    year: v.optional(v.number()),
    status: v.optional(v.string())
  },
  handler: async (ctx, { year, status }) => {
    const { organizationId } = await getUserOrg(ctx);
    const expenses = await ctx.db
      .query('mileageExpenses')
      .withIndex('by_org_and_user', q =>
        q.eq('organizationId', organizationId).eq('userId', ctx.user._id)
      )
      .order('desc')
      .collect();

    return expenses.filter(e => {
      const matchYear = !year || new Date(e.date).getFullYear() === year;
      const matchStatus = !status || e.status === status;
      return matchYear && matchStatus;
    });
  }
});

export const listOrgExpenses = authedQuery({
  args: {
    status: v.optional(v.string()),
    year: v.optional(v.number())
  },
  handler: async (ctx, { status, year }) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);

    const expenses = await ctx.db
      .query('mileageExpenses')
      .withIndex('by_org', q => q.eq('organizationId', organizationId))
      .order('desc')
      .collect();

    return expenses.filter(e => {
      const matchYear = !year || new Date(e.date).getFullYear() === year;
      const matchStatus = !status || e.status === status;
      return matchYear && matchStatus;
    });
  }
});
```

### Étape 3 — UI formulaire `expense-form.svelte`

Calcul IK en temps réel lors de la saisie :

```
┌──────────────────────────────────────────────────────────┐
│  Nouvelle note de frais IK                               │
├──────────────────────────────────────────────────────────┤
│  Date du trajet        [12/06/2026         ]             │
│  Objet professionnel   [Visite client Dupont SAS  ]      │
│  Départ                [Paris 8e                  ]      │
│  Arrivée               [Versailles                ]      │
│  Distance (km)         [24               ] km            │
│  Aller-retour ?        ○ Oui  ● Non     → 24 km total   │
│  CV fiscaux véhicule   [5 CV ▾]                          │
├──────────────────────────────────────────────────────────┤
│  💰 Indemnité calculée : 24 km × 0,636 €/km = 15,26 €   │
│     Barème URSSAF 2026 · 5 CV · Tranche <5 000 km/an    │
├──────────────────────────────────────────────────────────┤
│  [Annuler]                          [Soumettre la note →]│
└──────────────────────────────────────────────────────────┘
```

Le calcul live se fait **côté client** avec la même fonction `calculateIK` importée — ne pas appeler Convex pour un simple calcul.

### Étape 4 — UI admin `/admin/expenses`

```
┌─────────────────────────────────────────────────────────────────┐
│  Notes de frais IK (38)      [Filtres ▾]  [Exporter CSV]        │
├─────────────────────────────────────────────────────────────────┤
│  ⏳ 7 notes en attente d'approbation                             │
│                                                                 │
│  SALARIÉ      DATE       TRAJET                KM     MONTANT  STATUT │
│  J. Dupont    12/06/26   Paris → Versailles    24km   15,26€  ⏳ En attente │
│  M. Martin    10/06/26   Lyon → Grenoble       56km   35,62€  ✅ Approuvé  │
├─────────────────────────────────────────────────────────────────┤
│  Actions groupées : [Approuver la sélection] [Rejeter]          │
└─────────────────────────────────────────────────────────────────┘
```

**Export CSV** (format compatible Silae/Sage) :
```
Salarié;Date;Objet;Départ;Arrivée;KM;CV;Montant;Statut
Jean Dupont;2026-06-12;Visite client;Paris;Versailles;24;5;15.26;APPROVED
```

---

## ✅ Critères d'acceptation

- [ ] Salarié peut saisir un trajet et voir l'IK calculé live (barème 2026)
- [ ] Le calcul aller-retour double bien les km
- [ ] L'IK tient compte des km annuels pour la tranche progressive
- [ ] Seul un ORG_ADMIN/ORG_MANAGER peut approuver ou rejeter
- [ ] Export CSV admin compatible Silae/Sage
- [ ] Note approuvée n'est plus modifiable par le salarié
- [ ] Page admin filtre par statut, par salarié, par année

---

## 🚫 NE PAS FAIRE

- Ne pas appeler Convex pour calculer l'IK côté client — faire le calcul JS local
- Ne pas permettre l'auto-approbation (salarié = son propre manager)
- Ne pas hardcoder le barème directement dans les composants — utiliser `ik-rates.ts`
- Ne pas oublier la tranche progressive (le calcul n'est pas linéaire > 5 000 km/an)
- Ne pas implémenter la géolocalisation GPS en V1 — saisie manuelle uniquement
- Ne pas générer de PDF en V1 — export CSV suffit (PDF en V2)
