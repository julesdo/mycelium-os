---
priority: 17
feature: Finance avancée — Import relevés carburant + détection anomalies
sprint: S12 (V2)
version: V2 — Indispensable au DAF
effort: 4 jours
depends_on: P08 (tracking financier de base)
blocks: P18 (optimisation fiscale utilise les coûts carburant)
model_recommended: claude-haiku-4-5-20251001
pricing_tier: Pro (590€/mois) et supérieur
---

# P17 — Finance avancée : import relevés carburant + détection anomalies

## 🎯 Mission

Permettre au DAF d'**importer les relevés mensuels des cartes carburant** (Total Cards, BP Plus, Shell Fleet) pour alimenter automatiquement les coûts par véhicule. L'IA détecte les **anomalies** : plein en dehors des heures de travail, volume aberrant, lieu inhabituel, doublon. Résultat : plus de saisie manuelle, moins de fraude carburant.

**Exemple de valeur :**
> Le DAF importe le relevé Total Cards de mai (450 lignes). Mycelium matche automatiquement 438 lignes sur les 47 véhicules via l'immatriculation. Détecte 3 anomalies : 1 plein de 120L un dimanche soir, 1 doublon le même jour/heure, 1 station à 300km du siège. Le DAF valide ou écarte chaque alerte en 5 minutes.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Table `costs` avec catégories incluant `CARBURANT` (P08)
- Import CSV bulk avec validation côté Convex (P08 `bulkImportCosts`)
- Pattern upload Convex Storage pour les fichiers
- Table `vehicles` avec `registration` pour le matching

**Ce qui manque :**
- Parsers spécialisés pour Total Cards, BP Plus, Shell Fleet (formats CSV différents)
- Logique de matching immatriculation → vehicleId
- Moteur de détection d'anomalies (5 règles)
- Table `fuelImports` pour tracer les imports et leurs anomalies
- UI `/admin/finance/fuel-import` : wizard 3 étapes
- Rapport anomalies avec workflow de validation

---

## 🔒 Contraintes absolues

1. **Matching immatriculation tolérant** : normaliser les immatriculations avant matching (`AB-123-CD` = `AB123CD` = `ab-123-cd`). Un véhicule non matché = ligne "non identifiée" à résoudre manuellement.
2. **Transactions idempotentes** : si on importe deux fois le même fichier, ne pas doubler les coûts. Vérifier les doublons via `(date, vehicleId, amount, fuelStation)`.
3. **Anomalies non-bloquantes** : les anomalies sont des signaux, pas des blocages. Le DAF peut importer quand même et traiter les anomalies après.
4. **Coûts créés en statut PENDING** si anomalie détectée sur la ligne — le DAF doit valider.
5. **Détection IA optionnelle** : les 5 règles déterministes sont obligatoires. L'enrichissement IA (Claude Haiku pour classifier les anomalies ambiguës) est optionnel et ne bloque pas l'import.

---

## 📊 Nouveaux schémas Convex

### `fuelImports`

```typescript
fuelImports: defineTable({
  organizationId: v.id('organizations'),
  provider: v.union(
    v.literal('TOTAL_CARDS'),
    v.literal('BP_PLUS'),
    v.literal('SHELL_FLEET'),
    v.literal('GENERIC')
  ),
  fileName: v.string(),
  fileStorageId: v.string(),
  periodStart: v.string(),   // ISO date
  periodEnd: v.string(),
  totalLines: v.number(),
  matchedLines: v.number(),
  unmatchedLines: v.number(),
  anomalyCount: v.number(),
  totalAmount: v.number(),   // total en €
  status: v.union(
    v.literal('PROCESSING'),
    v.literal('REVIEW'),      // anomalies à valider
    v.literal('COMPLETED'),
    v.literal('FAILED')
  ),
  importedBy: v.string(),
  createdAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_org_and_created', ['organizationId', 'createdAt'])
```

### `fuelAnomalies`

```typescript
fuelAnomalies: defineTable({
  organizationId: v.id('organizations'),
  fuelImportId: v.id('fuelImports'),
  vehicleId: v.optional(v.id('vehicles')),
  type: v.union(
    v.literal('WEEKEND_FILL'),        // plein samedi/dimanche
    v.literal('ABNORMAL_VOLUME'),     // > 120L ou > capacité réservoir théorique
    v.literal('SUSPICIOUS_LOCATION'), // station > 100km du siège
    v.literal('DUPLICATE'),           // même véhicule + même montant ± 30min
    v.literal('NO_ACTIVE_RESERVATION')// plein quand véhicule pas en réservation
  ),
  severity: v.union(v.literal('HIGH'), v.literal('MEDIUM'), v.literal('LOW')),
  rawLine: v.string(),          // ligne CSV originale pour audit
  date: v.number(),
  amount: v.number(),
  liters: v.optional(v.number()),
  station: v.optional(v.string()),
  resolution: v.optional(v.union(
    v.literal('ACCEPTED'),       // DAF valide : coût créé
    v.literal('REJECTED'),       // DAF rejette : coût pas créé
    v.literal('PENDING')
  )),
  resolvedBy: v.optional(v.string()),
  resolvedAt: v.optional(v.number()),
  notes: v.optional(v.string()),
  createdAt: v.number()
})
  .index('by_import', ['fuelImportId'])
  .index('by_org_and_pending', ['organizationId', 'resolution'])
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/
  fuel-parsers.ts              → NOUVEAU : parsers Total Cards / BP Plus / Shell Fleet
  fuel-import.ts               → NOUVEAU : action import + détection anomalies
  schema.ts                    → ajouter fuelImports + fuelAnomalies

src/routes/[[lang]]/admin/finance/
  fuel-import/+page.svelte     → wizard import 3 étapes

src/lib/components/finance/
  fuel-import-wizard.svelte    → composant wizard
  fuel-anomaly-card.svelte     → card anomalie avec actions Accept/Reject
  fuel-match-review.svelte     → tableau lignes non matchées
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Parsers CSV `fuel-parsers.ts`

```typescript
// src/lib/convex/fuel-parsers.ts

export interface FuelTransaction {
  rawLine: string;
  date: Date;
  registration: string;     // immatriculation brute depuis le CSV
  liters: number;
  amount: number;           // TTC en €
  station: string;
  driverName?: string;
}

// Format Total Cards (séparateur ;)
// Date;Heure;Carte;Véhicule;Immat;Produit;Litres;Montant HT;TVA;Montant TTC;Station
export function parseTotalCards(csv: string): FuelTransaction[] {
  const lines = csv.split('\n').slice(1); // skip header
  return lines.filter(l => l.trim()).map(line => {
    const cols = line.split(';');
    return {
      rawLine: line,
      date: parseDate(cols[0], 'DD/MM/YYYY'),
      registration: normalizeRegistration(cols[4]),
      liters: parseFloat(cols[6].replace(',', '.')),
      amount: parseFloat(cols[9].replace(',', '.')),
      station: cols[10]?.trim() ?? ''
    };
  }).filter(t => !isNaN(t.amount) && t.amount > 0);
}

// Format BP Plus (séparateur ,)
// "Transaction Date","Time","Card Number","Vehicle Reg","Fuel Type","Volume","Net Amount","VAT","Gross Amount","Site Name"
export function parseBPPlus(csv: string): FuelTransaction[] {
  const lines = csv.split('\n').slice(1);
  return lines.filter(l => l.trim()).map(line => {
    const cols = line.split(',').map(c => c.replace(/"/g, ''));
    return {
      rawLine: line,
      date: parseDate(cols[0], 'YYYY-MM-DD'),
      registration: normalizeRegistration(cols[3]),
      liters: parseFloat(cols[5]),
      amount: parseFloat(cols[8]),
      station: cols[9]?.trim() ?? ''
    };
  }).filter(t => !isNaN(t.amount) && t.amount > 0);
}

// Format Shell Fleet (séparateur \t)
// Date\tHeure\tImmatriculation\tProduit\tQuantite\tMontant_HT\tTVA\tMontant_TTC\tStation
export function parseShellFleet(csv: string): FuelTransaction[] {
  const lines = csv.split('\n').slice(1);
  return lines.filter(l => l.trim()).map(line => {
    const cols = line.split('\t');
    return {
      rawLine: line,
      date: parseDate(cols[0], 'DD/MM/YYYY'),
      registration: normalizeRegistration(cols[2]),
      liters: parseFloat(cols[4].replace(',', '.')),
      amount: parseFloat(cols[7].replace(',', '.')),
      station: cols[8]?.trim() ?? ''
    };
  }).filter(t => !isNaN(t.amount) && t.amount > 0);
}

function normalizeRegistration(raw: string): string {
  return raw.toUpperCase().replace(/[\s\-\.]/g, '');
}

function parseDate(str: string, format: string): Date {
  if (format === 'DD/MM/YYYY') {
    const [d, m, y] = str.split('/');
    return new Date(`${y}-${m}-${d}`);
  }
  return new Date(str);
}

export function detectProvider(csv: string): 'TOTAL_CARDS' | 'BP_PLUS' | 'SHELL_FLEET' | 'GENERIC' {
  const firstLine = csv.split('\n')[0].toLowerCase();
  if (firstLine.includes('montant ttc') && firstLine.includes('carte')) return 'TOTAL_CARDS';
  if (firstLine.includes('gross amount') && firstLine.includes('vehicle reg')) return 'BP_PLUS';
  if (firstLine.includes('quantite') && firstLine.split('\t').length > 5) return 'SHELL_FLEET';
  return 'GENERIC';
}
```

### Étape 2 — Action d'import avec détection anomalies

```typescript
// src/lib/convex/fuel-import.ts

export const processFuelImport = internalAction({
  args: {
    organizationId: v.id('organizations'),
    fileStorageId: v.string(),
    fileName: v.string(),
    importedBy: v.string()
  },
  handler: async (ctx, args) => {
    // 1. Lire le fichier depuis Convex Storage
    const blob = await ctx.storage.get(args.fileStorageId);
    if (!blob) throw new ConvexError('Fichier introuvable');
    const csv = await blob.text();

    // 2. Détecter le provider et parser
    const provider = detectProvider(csv);
    const transactions = provider === 'TOTAL_CARDS' ? parseTotalCards(csv)
      : provider === 'BP_PLUS' ? parseBPPlus(csv)
      : provider === 'SHELL_FLEET' ? parseShellFleet(csv)
      : parseTotalCards(csv); // fallback générique

    // 3. Matching immatriculations → vehicleIds
    const vehicles = await ctx.runQuery(internal.vehicles.listVehiclesInternal, {
      organizationId: args.organizationId
    });
    const vehicleByRegistration = new Map(
      vehicles.map(v => [normalizeRegistration(v.registration), v])
    );

    const matched: Array<{ transaction: FuelTransaction; vehicleId: Id<'vehicles'> }> = [];
    const unmatched: FuelTransaction[] = [];

    for (const t of transactions) {
      const vehicle = vehicleByRegistration.get(t.registration);
      if (vehicle) matched.push({ transaction: t, vehicleId: vehicle._id });
      else unmatched.push(t);
    }

    // 4. Créer l'import en base
    const importId = await ctx.runMutation(internal.fuelImport.createFuelImport, {
      organizationId: args.organizationId,
      provider,
      fileName: args.fileName,
      fileStorageId: args.fileStorageId,
      totalLines: transactions.length,
      matchedLines: matched.length,
      unmatchedLines: unmatched.length,
      totalAmount: transactions.reduce((s, t) => s + t.amount, 0),
      importedBy: args.importedBy,
      periodStart: new Date(Math.min(...transactions.map(t => t.date.getTime()))).toISOString().slice(0, 10),
      periodEnd: new Date(Math.max(...transactions.map(t => t.date.getTime()))).toISOString().slice(0, 10)
    });

    // 5. Détection anomalies sur les lignes matchées
    const anomalies: Array<{ transaction: FuelTransaction; vehicleId: Id<'vehicles'>; type: string; severity: string }> = [];

    for (const { transaction: t, vehicleId } of matched) {
      // Règle 1 : plein le week-end
      const day = t.date.getDay();
      if (day === 0 || day === 6) {
        anomalies.push({ transaction: t, vehicleId, type: 'WEEKEND_FILL', severity: 'MEDIUM' });
        continue;
      }

      // Règle 2 : volume anormal (> 120L)
      if (t.liters > 120) {
        anomalies.push({ transaction: t, vehicleId, type: 'ABNORMAL_VOLUME', severity: 'HIGH' });
        continue;
      }

      // Règle 3 : doublon (même véhicule, même montant ± 2€, ± 30 min)
      const isDuplicate = matched.some(({ transaction: other, vehicleId: otherId }) =>
        other !== t &&
        otherId === vehicleId &&
        Math.abs(other.amount - t.amount) < 2 &&
        Math.abs(other.date.getTime() - t.date.getTime()) < 30 * 60 * 1000
      );
      if (isDuplicate) {
        anomalies.push({ transaction: t, vehicleId, type: 'DUPLICATE', severity: 'HIGH' });
        continue;
      }
    }

    // 6. Sauvegarder anomalies et créer coûts PENDING pour les lignes anormales
    const anomalyIds = new Set<string>();
    for (const a of anomalies) {
      const key = `${a.vehicleId}-${a.transaction.date.getTime()}`;
      if (anomalyIds.has(key)) continue;
      anomalyIds.add(key);

      await ctx.runMutation(internal.fuelImport.createAnomaly, {
        organizationId: args.organizationId,
        fuelImportId: importId,
        vehicleId: a.vehicleId,
        type: a.type as any,
        severity: a.severity as any,
        rawLine: a.transaction.rawLine,
        date: a.transaction.date.getTime(),
        amount: a.transaction.amount,
        liters: a.transaction.liters,
        station: a.transaction.station
      });
    }

    // 7. Créer les coûts pour les lignes sans anomalie
    const anomalyLineKeys = new Set(anomalies.map(a => a.transaction.rawLine));
    for (const { transaction: t, vehicleId } of matched) {
      if (anomalyLineKeys.has(t.rawLine)) continue;
      await ctx.runMutation(internal.costs.createCostInternal, {
        organizationId: args.organizationId,
        vehicleId,
        category: 'CARBURANT',
        amount: t.amount,
        date: t.date.toISOString().slice(0, 10),
        description: `${t.liters}L — ${t.station}`,
        source: 'IMPORT',
        createdBy: args.importedBy
      });
    }

    // 8. Mettre à jour le statut de l'import
    await ctx.runMutation(internal.fuelImport.updateImportStatus, {
      importId,
      status: anomalies.length > 0 ? 'REVIEW' : 'COMPLETED',
      anomalyCount: anomalies.length
    });

    return { importId, matched: matched.length, unmatched: unmatched.length, anomalies: anomalies.length };
  }
});
```

### Étape 3 — UI wizard `/admin/finance/fuel-import`

```
Étape 1 — Upload fichier
  Drag & drop ou click to upload
  Détection automatique provider (Total Cards / BP Plus / Shell Fleet / Générique)
  Aperçu : "450 lignes détectées · Format Total Cards identifié"

Étape 2 — Résultat matching (après processing)
  ✅ 438 lignes matchées sur 47 véhicules
  ⚠️  8 lignes non identifiées (immatriculations inconnues)
    → Table des non-matchées avec suggestion de matching manuel
  🚨 3 anomalies détectées
    → Cards anomalies avec Accept/Reject

Étape 3 — Confirmation
  Total : 12 450,30 €
  Période : 01/05/2026 → 31/05/2026
  438 coûts créés · 3 anomalies en attente
  [Terminer l'import]
```

---

## ✅ Critères d'acceptation

- [ ] Parser Total Cards : importe correctement un fichier sample de 100 lignes
- [ ] Parser BP Plus : importe correctement un fichier sample
- [ ] Parser Shell Fleet : importe correctement un fichier sample
- [ ] Matching immatriculation tolérant aux variantes de format (tirets, espaces, casse)
- [ ] Doublon détecté si même véhicule + même montant ± 30min
- [ ] Volume anormal détecté si > 120L
- [ ] Plein week-end détecté (samedi/dimanche)
- [ ] Import idempotent : réimporter le même fichier ne crée pas de doublons
- [ ] Les coûts des lignes anormales ne sont créés qu'après validation admin

---

## 🚫 NE PAS FAIRE

- Ne pas appeler Claude pour parser les CSV déterministes — règles fixes, pas de LLM
- Ne pas bloquer l'import si des anomalies existent — toujours avancer
- Ne pas créer de coûts pour les lignes non matchées — les ignorer jusqu'à résolution manuelle
- Ne pas supprimer les fichiers importés de Convex Storage — garder pour audit
- Ne pas faire le parsing dans le composant Svelte — toujours dans une Convex action
