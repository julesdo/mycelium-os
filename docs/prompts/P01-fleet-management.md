---
priority: 1
feature: Gestion flotte véhicules — CRUD + Import CSV
sprint: S2
version: V1 MVP
effort: 3 jours
depends_on: schema.ts (vehicles table complète), organizations (fait)
blocks: P02 (réservations), P03 (concierge), P04 (dashboard)
---

# P01 — Gestion flotte véhicules (CRUD + Import CSV)

## 🎯 Mission
Permettre à un ORG_ADMIN d'importer sa flotte via CSV et de gérer chaque véhicule (ajout, modification, changement de statut). C'est la fondation de tout le produit — sans données véhicules, rien d'autre ne fonctionne.

---

## 📍 État actuel du codebase

**Ce qui existe déjà (ne pas recréer) :**
- `src/lib/convex/schema.ts` → table `vehicles` complète avec tous les champs
- `src/lib/convex/vehicles.ts` → fonctions `listVehicles`, `getFleetLocations` présentes, helpers `getUserOrg`, `requireOrgAdmin` importés
- Routes créées (probablement shells vides) : `/admin/fleet`, `/admin/fleet/new`, `/admin/fleet/[vehicleId]`

**Ce qui manque :**
- Mutations Convex : `createVehicle`, `updateVehicle`, `updateVehicleStatus`, `importVehiclesFromCSV`, `deleteVehicle`
- UI `/admin/fleet` : tableau avec filtres, recherche, empty state
- UI `/admin/fleet/new` : formulaire d'ajout manuel
- UI `/admin/fleet/[vehicleId]` : fiche détail + édition
- Modal import CSV en 3 étapes (upload → preview/mapping → import)

---

## 🔒 Contraintes absolues

1. **Multi-tenancy** : chaque mutation commence par `getUserOrg(ctx)` pour récupérer `organizationId`
2. **Guard admin** : créer/modifier/importer = `requireOrgAdmin(ctx)`, lire = tous les membres
3. **Svelte 5 runes** : `$state`, `$derived`, `$effect` — jamais `let x = 0; $: y = x`
4. **TypeScript strict** : pas de `any`, interfaces explicites
5. **Pas de console.log** en production
6. **Import Convex dans SvelteKit** : `useQuery` / `useMutation` de `convex-svelte`

---

## 📊 Schéma Convex exact — table `vehicles`

```typescript
vehicles: defineTable({
  organizationId: v.id('organizations'),
  registration: v.string(),       // immatriculation, ex: "AB-123-CD"
  brand: v.string(),
  model: v.string(),
  year: v.number(),
  energy: v.union(v.literal('THERMAL'), v.literal('HYBRID'), v.literal('ELECTRIC')),
  category: v.union(v.literal('PASSENGER'), v.literal('UTILITY'), v.literal('TRUCK')),
  kilometers: v.optional(v.number()),
  purchaseDate: v.optional(v.string()),    // ISO date "2023-01-15"
  leaseEndDate: v.optional(v.string()),    // ISO date
  maintenanceKmThreshold: v.optional(v.number()),
  maintenanceDueDate: v.optional(v.string()),
  assignedDriverId: v.optional(v.string()),
  status: v.union(
    v.literal('AVAILABLE'), v.literal('IN_USE'),
    v.literal('MAINTENANCE'), v.literal('RETIRED')
  ),
  location: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_org_and_status', ['organizationId', 'status'])
  .searchIndex('search_by_org', {
    searchField: 'registration',
    filterFields: ['organizationId', 'status', 'energy']
  })
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/vehicles.ts          → ajouter mutations (ne pas écraser les queries existantes)
src/routes/[[lang]]/admin/fleet/+page.svelte
src/routes/[[lang]]/admin/fleet/+page.ts (load function si nécessaire)
src/routes/[[lang]]/admin/fleet/new/+page.svelte
src/routes/[[lang]]/admin/fleet/[vehicleId]/+page.svelte
src/lib/components/fleet/            → nouveau dossier
  vehicle-table.svelte
  vehicle-form.svelte
  csv-import-modal.svelte
  vehicle-status-badge.svelte
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Mutations Convex dans `vehicles.ts`

**`createVehicle`** : valider immatriculation (regex `/^[A-Z0-9][A-Z0-9 \-]{0,10}[A-Z0-9]$/i`), vérifier doublon par `registration` dans l'org, insérer.

**`updateVehicle`** : vérifier que le véhicule appartient à l'org via `getVehicleOrThrow()` helper interne.

**`updateVehicleStatus`** : changer uniquement le champ `status`, logger dans activity feed (notifications).

**`importVehiclesFromCSV`** :
```typescript
// Args
args: {
  vehicles: v.array(v.object({
    registration: v.string(),
    brand: v.string(),
    model: v.string(),
    year: v.number(),
    energy: energyValidator,
    category: categoryValidator,
    kilometers: v.optional(v.number()),
    purchaseDate: v.optional(v.string()),
    leaseEndDate: v.optional(v.string()),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
  }))
}
// Handler : dédoublonner par registration dans l'org, insérer en batch
// Retourner { imported: number, skipped: number, errors: string[] }
```

**`deleteVehicle`** : soft delete → passer `status` à `'RETIRED'` (jamais supprimer physiquement, historique réservations).

### Étape 2 — Page `/admin/fleet` (liste)

Structure UI :
```
[Titre "Ma flotte" + bouton "Importer CSV" + bouton "Ajouter un véhicule"]
[Barre de filtres : statut (chips) | énergie (chips) | site (select) | recherche texte]
[Tableau ou cards selon viewport]
[Empty state si aucun véhicule]
```

Tableau colonnes : Immat | Marque/Modèle | Année | Énergie | Statut | Site | Kilométrage | Actions

Code pattern :
```svelte
<script lang="ts">
  import { useQuery } from 'convex-svelte';
  import { api } from '$lib/convex/_generated/api';

  let statusFilter = $state<string | undefined>(undefined);
  let searchQuery = $state('');

  const vehicles = useQuery(api.vehicles.listVehicles, {
    status: statusFilter as 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED' | undefined
  });
</script>
```

### Étape 3 — Page `/admin/fleet/new` (formulaire ajout)

Champs requis : immatriculation, marque, modèle, année, énergie (radio), catégorie (radio)
Champs optionnels : kilométrage, date achat, date fin leasing, site, notes

Validation côté client avant envoi.

### Étape 4 — Page `/admin/fleet/[vehicleId]` (détail)

Onglets :
- Informations → affichage + bouton "Modifier"
- Réservations → liste des réservations passées/futures (query `listReservations` avec `vehicleId`)
- Entretiens → liste maintenance records (sprint suivant, afficher placeholder pour MVP)

Boutons d'action : "Mettre en maintenance" | "Disponible" | "Retirer"

### Étape 5 — Modal import CSV (3 étapes)

**Étape 1/3 — Upload** :
```svelte
<input type="file" accept=".csv" onchange={handleFile} />
```
Parser CSV en JS (pas de lib externe, `File.text()` + split par ligne/virgule).

**Étape 2/3 — Mapping** :
Afficher les 5 premières lignes. Dropdowns pour mapper chaque colonne du CSV vers les champs Mycelium.
Mapping suggéré automatiquement si les headers correspondent (case-insensitive).
Colonnes obligatoires : immatriculation, marque, modèle, année, énergie.

**Étape 3/3 — Preview + Import** :
Afficher le nombre de véhicules valides / invalides.
Bouton "Importer N véhicules".
Progress indicator pendant l'import.
Résumé final : X importés, Y ignorés (doublons), Z erreurs.

---

## ✅ Critères d'acceptation

- [ ] Import de 50 véhicules via CSV en moins de 10 secondes
- [ ] Impossible d'importer deux fois la même immatriculation dans la même org
- [ ] Filtres statut/énergie/site fonctionnels et cumulables
- [ ] Recherche par immatriculation ou modèle temps réel
- [ ] Changement de statut d'un véhicule depuis la page détail
- [ ] Empty state avec CTA "Importer votre flotte" si aucun véhicule
- [ ] Responsive (mobile : cards, desktop : tableau)
- [ ] Tout ORG_MEMBER peut voir la flotte, seul ORG_ADMIN peut modifier

---

## 🚫 NE PAS FAIRE

- Ne pas utiliser `v.any()` dans les validators Convex
- Ne pas supprimer physiquement un véhicule (utiliser `status: 'RETIRED'`)
- Ne pas utiliser de librairies CSV externes (papaparse, etc.) — parser natif suffisant
- Ne pas oublier `organizationId` dans chaque query/mutation
- Ne pas utiliser `$:` (ancienne syntaxe Svelte 4) pour la réactivité
- Ne pas créer un store global pour les véhicules — Convex est la source de vérité
- Ne pas créer de routes sans guard multi-tenant
- Ne pas afficher les données d'une autre org même accidentellement

---

## 🧪 Tests requis

```typescript
// Playwright E2E — src/tests/fleet.spec.ts
test('import CSV avec mapping', async ({ page }) => { ... });
test('filtre par statut AVAILABLE', async ({ page }) => { ... });
test('changement statut véhicule', async ({ page }) => { ... });
test('isolation multi-tenant : org A ne voit pas les véhicules de org B', async ({ page }) => { ... });
```

---

## 💡 Données de référence

Marques courantes en flotte pro FR : Renault, Peugeot, Citroën, Volkswagen, Toyota, Ford, Mercedes, BMW
Catégories CSV → Mycelium : "Tourisme" → PASSENGER, "Utilitaire" → UTILITY, "Camion" → TRUCK
Énergies CSV → Mycelium : "Thermique" → THERMAL, "Hybride" → HYBRID, "Électrique" → ELECTRIC
