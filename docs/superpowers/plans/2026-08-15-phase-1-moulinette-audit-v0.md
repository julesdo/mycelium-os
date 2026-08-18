# Phase 1 — Moulinette Audit V0

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produire un diagnostic EGalim de bout en bout — la cantine dépose ses factures fournisseurs, la Moulinette extrait les lignes, classe chaque libellé distinct via Claude, route les cas douteux vers une revue humaine, agrège les trois ratios légaux et restitue un rapport auditable.

**Architecture:** Sept étapes en chaîne (dépôt → extraction → normalisation → classification → revue → agrégation → rapport), chacune écrivant dans une table dédiée et reprenable indépendamment. Le nerf économique du produit : classer des **libellés distincts** plutôt que des lignes, et mutualiser ces classifications entre clients dans une table `productLabels` globale. Le barème EGalim est du code versionné, jamais des données.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes) · Convex 1.37 (`src/lib/convex/`) · `@anthropic-ai/sdk` (Claude Opus 5) · `papaparse` · `unpdf` · `zod` · Vitest

**Spec de référence :** [`2026-08-15-pivot-egalim-tri-et-moulinette-design.md`](../specs/2026-08-15-pivot-egalim-tri-et-moulinette-design.md) — sections 3 (domaine), 4 (pipeline), 4.6 (décisions d'API).

**Pré-requis :** phase 0 fusionnée dans `main`. 15 tables, `check:convex` propre, `test:unit` 404/404.

---

## Commandes de vérification

| Commande | Rôle |
|---|---|
| `bun run check:convex` | Typecheck backend seul (~10 s) |
| `bun run test:unit` | Vitest |
| `bunx convex dev --once` | Pousse schéma et fonctions |
| `bun run build` | Build de production |

**Commits :** `--no-verify` sur tous — les hooks pre-commit dépassent 2 minutes.

**Branche :** créer `moulinette-v0` depuis `main` avant la tâche 1.

**Données Convex :** modifier un `v.union` de littéraux fait échouer `bunx convex dev --once` si des documents portent l'ancienne valeur. Le déploiement local `mycelium` ne contient que des données de test — vider la table nommée dans l'erreur via `bunx convex dashboard` → Data → Clear table, puis relancer.

---

## Structure des fichiers

**Domaine EGalim (créés) :**

| Fichier | Responsabilité |
|---|---|
| `src/lib/egalim/types.ts` | Unions partagées : familles, labels, statuts |
| `src/lib/egalim/referentiel.ts` | Le barème, versionné. **Du code, jamais des données.** |
| `src/lib/convex/egalim/tables.ts` | Les 8 tables, importées par `schema.ts` |
| `src/lib/convex/egalim/parsers/csv.ts` | Parsing CSV + mapping de colonnes |
| `src/lib/convex/egalim/parsers/pdfText.ts` | Extraction PDF texte |
| `src/lib/convex/egalim/extraction.ts` | Orchestration document → `invoiceLines` |
| `src/lib/convex/egalim/normalisation.ts` | Libellés distincts, fournisseurs dédupliqués |
| `src/lib/convex/egalim/prompt.ts` | Prompt système (référentiel, mis en cache) |
| `src/lib/convex/egalim/classification.ts` | Action Claude par lots + `productLabels` |
| `src/lib/convex/egalim/agregation.ts` | Les trois ratios, l'écart en euros |
| `src/lib/convex/egalim/batches.ts` | Mutations et queries des lots |
| `src/lib/convex/egalim/revue.ts` | File d'arbitrage |
| `src/lib/convex/egalim/diagnostics.ts` | Production et gel du diagnostic |
| `scripts/generate-fixtures.ts` | Générateur de factures synthétiques |

**Routes (créées) :** `app/factures`, `app/diagnostic/[id]`, `ops/revue/[batchId]`

**Modifiés :** `src/lib/convex/schema.ts` (15 → 23 tables), `package.json`, `app-sidebar-config.ts`

---

## Task 1: Dépendances et référentiel EGalim

Le référentiel porte le risque maximal du produit : une règle de dérivation fausse contamine tous les rapports **silencieusement** et engage la responsabilité de conseil. C'est le seul endroit où la couverture doit être exhaustive. TDD strict.

**Files:**
- Create: `src/lib/egalim/types.ts`, `src/lib/egalim/referentiel.ts`
- Test: `src/lib/egalim/__tests__/referentiel.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Branche et dépendances**

```bash
git checkout main && git checkout -b moulinette-v0 && bun add @anthropic-ai/sdk unpdf
```

- [ ] **Step 2: Écrire `src/lib/egalim/types.ts`**

```ts
/** Familles de produits alimentaires, au sens du diagnostic EGalim. */
export const FAMILLES = [
	'VIANDE',
	'POISSON',
	'FRUITS_LEGUMES',
	'LAITIERS',
	'EPICERIE_SECHE',
	'EPICERIE_APPERTISEE',
	'BOISSONS',
	'AUTRE'
] as const;
export type Famille = (typeof FAMILLES)[number];

/** Les familles qui portent le seuil des 60 % de durable. */
export const FAMILLES_VIANDE_POISSON: readonly Famille[] = ['VIANDE', 'POISSON'];

/** Labels reconnus par le barème EGalim. */
export const LABELS = [
	'AB',
	'CONVERSION',
	'LABEL_ROUGE',
	'AOP_AOC_IGP_STG',
	'HVE3',
	'FERMIER',
	'PECHE_DURABLE',
	'COMMERCE_EQUITABLE',
	'RUP',
	'CYCLE_DE_VIE'
] as const;
export type Label = (typeof LABELS)[number];

export type ProofStatus = 'PROVEN' | 'TO_JUSTIFY' | 'NONE';
export type ReviewStatus = 'AUTO' | 'PENDING_REVIEW' | 'CONFIRMED' | 'CORRECTED';
```

- [ ] **Step 3: Écrire le test qui échoue**

Créer `src/lib/egalim/__tests__/referentiel.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { REFERENTIEL_VERSION, SEUILS, estBio, estDurable, LABELS_QUALIFIANTS } from '../referentiel';
import { LABELS } from '../types';

describe('REFERENTIEL_VERSION', () => {
	it('est versionnée au format AAAA-MM', () => {
		expect(REFERENTIEL_VERSION).toMatch(/^\d{4}-\d{2}$/);
	});
});

describe('SEUILS', () => {
	it('porte les trois seuils légaux', () => {
		expect(SEUILS.durable).toBe(0.5);
		expect(SEUILS.bio).toBe(0.2);
		expect(SEUILS.viandePoissonDurable).toBe(0.6);
	});
});

describe('estBio — seuls le bio et la conversion comptent', () => {
	it('AB compte en bio', () => expect(estBio(['AB'])).toBe(true));
	it('la conversion compte en bio', () => expect(estBio(['CONVERSION'])).toBe(true));

	it.each([
		'LABEL_ROUGE',
		'AOP_AOC_IGP_STG',
		'HVE3',
		'FERMIER',
		'PECHE_DURABLE',
		'COMMERCE_EQUITABLE',
		'RUP',
		'CYCLE_DE_VIE'
	] as const)('%s ne compte PAS en bio', (label) => {
		expect(estBio([label])).toBe(false);
	});

	it('aucun label ne donne pas bio', () => expect(estBio([])).toBe(false));
});

describe('estDurable — tous les labels du barème comptent', () => {
	it.each(LABELS)('%s compte en durable', (label) => {
		expect(estDurable([label])).toBe(true);
	});
	it('aucun label ne donne pas durable', () => expect(estDurable([])).toBe(false));
});

describe('bio implique durable', () => {
	it('AB est durable', () => expect(estDurable(['AB'])).toBe(true));
	it('la conversion est durable', () => expect(estDurable(['CONVERSION'])).toBe(true));
});

describe('LABELS_QUALIFIANTS couvre exactement le barème', () => {
	it('couvre les 10 labels et rien d’autre', () => {
		expect(Object.keys(LABELS_QUALIFIANTS).sort()).toEqual([...LABELS].sort());
	});
});
```

- [ ] **Step 4: Lancer, vérifier l'échec**

```bash
bun run test:unit -- referentiel
```

Attendu : ÉCHEC, le module `../referentiel` n'existe pas.

- [ ] **Step 5: Écrire `src/lib/egalim/referentiel.ts`**

```ts
import type { Label } from './types';

/**
 * Version du barème, enregistrée sur chaque classification produite.
 *
 * À revérifier contre « ma cantine » AVANT toute production de rapport client,
 * et à incrémenter à chaque évolution réglementaire.
 * Source : docs/agri/business-plan/10-fiche-egalim-1page.md
 */
export const REFERENTIEL_VERSION = '2026-08';

/** Les trois seuils légaux, en fraction de la valeur d'achat HT. */
export const SEUILS = {
	/** ≥ 50 % de durable, sur la totalité des achats alimentaires. */
	durable: 0.5,
	/** ≥ 20 % de bio. */
	bio: 0.2,
	/** ≥ 60 % de durable sur les familles viande et poisson. */
	viandePoissonDurable: 0.6
} as const;

/**
 * Le barème de qualification. `bio: true` implique toujours `durable: true` :
 * un produit bio compte dans les deux ratios.
 */
export const LABELS_QUALIFIANTS: Record<
	Label,
	{ durable: boolean; bio: boolean; libelle: string }
> = {
	AB: { durable: true, bio: true, libelle: 'Agriculture biologique (AB, Eurofeuille)' },
	CONVERSION: { durable: true, bio: true, libelle: 'En conversion vers le bio' },
	LABEL_ROUGE: { durable: true, bio: false, libelle: 'Label Rouge' },
	AOP_AOC_IGP_STG: { durable: true, bio: false, libelle: 'AOP / AOC / IGP / STG' },
	HVE3: { durable: true, bio: false, libelle: 'Haute Valeur Environnementale niveau 3' },
	FERMIER: { durable: true, bio: false, libelle: 'Mention fermier / produit de la ferme' },
	PECHE_DURABLE: { durable: true, bio: false, libelle: 'Pêche durable (MSC, écolabel pêche)' },
	COMMERCE_EQUITABLE: { durable: true, bio: false, libelle: 'Commerce équitable' },
	RUP: { durable: true, bio: false, libelle: 'Régions ultrapériphériques' },
	CYCLE_DE_VIE: { durable: true, bio: false, libelle: 'Acquis selon le coût du cycle de vie' }
};

/**
 * Mentions fréquentes sur les factures qui ne qualifient RIEN au sens de la loi.
 * Le code de la commande publique interdit la préférence géographique directe :
 * « local » n'est pas un critère légal. C'est l'erreur la plus répandue chez les
 * gestionnaires, et la première que le diagnostic corrige.
 */
export const MENTIONS_NON_QUALIFIANTES = [
	'local',
	'circuit court',
	'de saison',
	'fait maison',
	'artisanal',
	'de qualité',
	'traditionnel',
	'régional'
] as const;

/** Un produit est bio s'il porte AB ou la mention de conversion. */
export function estBio(labels: readonly Label[]): boolean {
	return labels.some((l) => LABELS_QUALIFIANTS[l].bio);
}

/** Un produit est durable s'il porte au moins un label du barème. */
export function estDurable(labels: readonly Label[]): boolean {
	return labels.some((l) => LABELS_QUALIFIANTS[l].durable);
}
```

- [ ] **Step 6: Lancer, vérifier le succès**

```bash
bun run test:unit -- referentiel
```

Attendu : tous PASS.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit --no-verify -m "feat(egalim): referentiel versionne + bareme teste exhaustivement"
```

---

## Task 2: Les 8 tables du domaine

**Files:**
- Create: `src/lib/convex/egalim/tables.ts`
- Modify: `src/lib/convex/schema.ts`

- [ ] **Step 1: Écrire `src/lib/convex/egalim/tables.ts`**

```ts
import { defineTable } from 'convex/server';
import { v } from 'convex/values';

const vFamille = v.union(
	v.literal('VIANDE'),
	v.literal('POISSON'),
	v.literal('FRUITS_LEGUMES'),
	v.literal('LAITIERS'),
	v.literal('EPICERIE_SECHE'),
	v.literal('EPICERIE_APPERTISEE'),
	v.literal('BOISSONS'),
	v.literal('AUTRE')
);

const vLabel = v.union(
	v.literal('AB'),
	v.literal('CONVERSION'),
	v.literal('LABEL_ROUGE'),
	v.literal('AOP_AOC_IGP_STG'),
	v.literal('HVE3'),
	v.literal('FERMIER'),
	v.literal('PECHE_DURABLE'),
	v.literal('COMMERCE_EQUITABLE'),
	v.literal('RUP'),
	v.literal('CYCLE_DE_VIE')
);

export const egalimTables = {
	// Un dépôt de factures : « factures 2025 — Clinique X »
	invoiceBatches: defineTable({
		organizationId: v.id('organizations'),
		label: v.string(),
		periodStart: v.string(), // AAAA-MM-JJ
		periodEnd: v.string(),
		status: v.union(
			v.literal('DRAFT'),
			v.literal('EXTRACTING'),
			v.literal('CLASSIFYING'),
			v.literal('REVIEW'),
			v.literal('READY'),
			v.literal('FAILED')
		),
		uploadedBy: v.string(),
		documentsTotal: v.number(),
		linesTotal: v.number(),
		labelsPendingReview: v.number(),
		createdAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_status', ['organizationId', 'status']),

	// Un fichier déposé
	invoiceDocuments: defineTable({
		organizationId: v.id('organizations'),
		batchId: v.id('invoiceBatches'),
		storageId: v.id('_storage'),
		filename: v.string(),
		mimeType: v.string(),
		sourceType: v.union(
			v.literal('CSV'),
			v.literal('PDF_TEXT'),
			v.literal('PDF_SCAN'),
			v.literal('PHOTO')
		),
		extractionStatus: v.union(v.literal('PENDING'), v.literal('DONE'), v.literal('FAILED')),
		extractionError: v.optional(v.string()),
		supplierId: v.optional(v.id('suppliers')),
		invoiceDate: v.optional(v.string()),
		invoiceNumber: v.optional(v.string()),
		totalHT: v.optional(v.number()),
		linesCount: v.number()
	})
		.index('by_batch', ['batchId'])
		.index('by_org', ['organizationId'])
		.index('by_batch_and_status', ['batchId', 'extractionStatus']),

	// LA table centrale — ~3 000 lignes par cantine et par an
	invoiceLines: defineTable({
		organizationId: v.id('organizations'),
		batchId: v.id('invoiceBatches'),
		documentId: v.id('invoiceDocuments'),
		// La source, jamais modifiée
		rawLabel: v.string(),
		normalizedLabel: v.string(),
		quantity: v.optional(v.number()),
		unit: v.optional(v.string()),
		unitPrice: v.optional(v.number()),
		amountHT: v.number(),
		invoiceDate: v.string(),
		supplierId: v.optional(v.id('suppliers')),
		// Le verdict — renseigné à la classification
		isFood: v.optional(v.boolean()),
		family: v.optional(vFamille),
		qualifyingLabels: v.optional(v.array(vLabel)),
		isBio: v.optional(v.boolean()),
		isDurable: v.optional(v.boolean()),
		justification: v.optional(v.string()),
		confidence: v.optional(v.number()),
		reviewStatus: v.union(
			v.literal('AUTO'),
			v.literal('PENDING_REVIEW'),
			v.literal('CONFIRMED'),
			v.literal('CORRECTED')
		),
		proofStatus: v.optional(
			v.union(v.literal('PROVEN'), v.literal('TO_JUSTIFY'), v.literal('NONE'))
		),
		classifierVersion: v.optional(v.string())
	})
		.index('by_batch', ['batchId'])
		.index('by_org_and_date', ['organizationId', 'invoiceDate'])
		.index('by_batch_and_review', ['batchId', 'reviewStatus'])
		.index('by_normalized_label', ['normalizedLabel']),

	// Cache global de classification par libellé distinct.
	// ⚠️ SANS organizationId — voir la garde-fou multi-tenant en spec §3.3.
	// Ne contient QUE la chaîne de libellé et sa classification : jamais de
	// montant, de quantité, de fournisseur ni de lien vers une organisation.
	productLabels: defineTable({
		normalizedLabel: v.string(),
		isFood: v.boolean(),
		family: vFamille,
		qualifyingLabels: v.array(vLabel),
		justification: v.string(),
		confidence: v.number(),
		source: v.union(v.literal('AUTO'), v.literal('HUMAN')),
		confirmedBy: v.optional(v.string()),
		confirmedAt: v.optional(v.number()),
		classifierVersion: v.string(),
		occurrences: v.number()
	})
		.index('by_normalized_label', ['normalizedLabel'])
		.index('by_source', ['source']),

	suppliers: defineTable({
		organizationId: v.id('organizations'),
		name: v.string(),
		rawNames: v.array(v.string()),
		siret: v.optional(v.string()),
		type: v.union(v.literal('GROSSISTE'), v.literal('PRODUCTEUR'), v.literal('AUTRE')),
		attestationStatus: v.union(
			v.literal('NONE'),
			v.literal('REQUESTED'),
			v.literal('RECEIVED'),
			v.literal('REFUSED')
		)
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_name', ['organizationId', 'name']),

	// Le rapport FIGÉ. Les ratios sont stockés calculés, jamais recalculés.
	diagnostics: defineTable({
		organizationId: v.id('organizations'),
		batchId: v.id('invoiceBatches'),
		periodStart: v.string(),
		periodEnd: v.string(),
		computedAt: v.number(),
		classifierVersion: v.string(),
		ratios: v.object({
			durable: v.number(),
			bio: v.number(),
			meatFishDurable: v.number(),
			totalFoodHT: v.number(),
			totalHT: v.number()
		}),
		byFamily: v.array(
			v.object({
				family: vFamille,
				totalHT: v.number(),
				durableHT: v.number(),
				bioHT: v.number()
			})
		),
		bySupplier: v.array(
			v.object({
				supplierName: v.string(),
				totalHT: v.number(),
				durableHT: v.number(),
				bioHT: v.number()
			})
		),
		gapEuros: v.object({
			toDurable50: v.number(),
			toBio20: v.number(),
			toMeatFish60: v.number()
		}),
		status: v.union(v.literal('DRAFT'), v.literal('DELIVERED')),
		deliveredAt: v.optional(v.number()),
		tier: v.optional(v.union(v.literal('S'), v.literal('M'), v.literal('L')))
	})
		.index('by_org', ['organizationId'])
		.index('by_batch', ['batchId']),

	// Les courriers de demande de justificatif — le point 6 du livrable
	attestationRequests: defineTable({
		organizationId: v.id('organizations'),
		supplierId: v.id('suppliers'),
		diagnosticId: v.id('diagnostics'),
		lineIds: v.array(v.id('invoiceLines')),
		amountAtStake: v.number(),
		status: v.union(
			v.literal('DRAFT'),
			v.literal('SENT'),
			v.literal('RECEIVED'),
			v.literal('REFUSED')
		),
		sentAt: v.optional(v.number())
	})
		.index('by_org', ['organizationId'])
		.index('by_diagnostic', ['diagnosticId']),

	// Suivi et contrôle de coût de la classification
	classificationJobs: defineTable({
		organizationId: v.id('organizations'),
		batchId: v.id('invoiceBatches'),
		status: v.union(
			v.literal('RUNNING'),
			v.literal('DONE'),
			v.literal('FAILED'),
			v.literal('CAPPED')
		),
		labelsTotal: v.number(),
		labelsDone: v.number(),
		labelsFailed: v.number(),
		tokensIn: v.number(),
		tokensOut: v.number(),
		cacheReadTokens: v.number(),
		costEur: v.number(),
		startedAt: v.number(),
		finishedAt: v.optional(v.number()),
		error: v.optional(v.string())
	}).index('by_batch', ['batchId'])
};
```

- [ ] **Step 2: Brancher dans `schema.ts`**

Ajouter l'import en tête et étaler les tables dans `defineSchema` :

```ts
import { egalimTables } from './egalim/tables';

export default defineSchema({
	// ... les 15 tables existantes, inchangées
	...egalimTables
});
```

- [ ] **Step 3: Vérifier le décompte**

```bash
grep -cE "^\s*[a-zA-Z]+: defineTable" src/lib/convex/schema.ts src/lib/convex/egalim/tables.ts
```

Attendu : `schema.ts:15` et `tables.ts:8`.

- [ ] **Step 4: Typecheck et push**

```bash
bun run check:convex && bunx convex dev --once
```

Attendu : aucune erreur, `Convex functions ready`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit --no-verify -m "feat(egalim): 8 tables du domaine (15 -> 23)"
```

---

## Task 3: Générateur de fixtures synthétiques

Les fixtures valident le **code** ; la gate valide le **classifieur face au réel**. Elles doivent reproduire les pathologies du terrain, pas des factures propres — une fixture propre ne teste rien d'intéressant.

**Files:**
- Create: `scripts/generate-fixtures.ts`
- Create: `src/lib/fixtures/factures/` (sorties commitées)

- [ ] **Step 1: Écrire le générateur**

`scripts/generate-fixtures.ts` produit trois fichiers CSV dans `src/lib/fixtures/factures/`, avec une vérité terrain connue au centime dans un `.expected.json` associé. Pathologies obligatoires, une au moins par fichier :

| Pathologie | Exemple |
|---|---|
| Libellés tronqués ou codés | `CAR RD 4/4 AB 2K5`, `REF 88213` |
| **Avoirs** (lignes négatives) | `AVOIR CAROTTE BIO` à `-45.20` |
| Frais de port, consignes, emballages | `FRAIS DE PORT`, `CONSIGNE PALETTE` — non alimentaires |
| Totaux intermédiaires de bas de page | `TOTAL PAGE 1` — ressemble à une ligne produit |
| Remises de ligne | `REMISE 5% EPICERIE` |
| Unités hétérogènes | kg, pièce, colis, litre |
| Label tantôt en libellé, tantôt en colonne, tantôt absent | colonne `LABEL` vide alors que le produit est bio |

Le `.expected.json` porte les ratios attendus, calculés à la main dans le générateur :

```ts
export interface ExpectedRatios {
	totalHT: number;
	totalFoodHT: number;
	durableHT: number;
	bioHT: number;
	meatFishTotalHT: number;
	meatFishDurableHT: number;
	ratios: { durable: number; bio: number; meatFishDurable: number };
}
```

**Un avoir réduit numérateur ET dénominateur.** C'est la règle la plus facile à rater : une ligne à `-45.20` sur un produit bio doit retrancher 45,20 € du total alimentaire *et* du total bio. Le générateur doit produire au moins un avoir sur un produit qualifiant et un sur un produit non qualifiant.

- [ ] **Step 2: Générer et commiter les fixtures**

```bash
bun scripts/generate-fixtures.ts && ls src/lib/fixtures/factures/
```

Attendu : 3 paires `.csv` / `.expected.json`.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit --no-verify -m "test(egalim): generateur de fixtures avec les pathologies du terrain"
```

---

## Task 4: Agrégation des trois ratios (TDD)

Placée avant l'extraction et la classification : c'est la logique qui transforme des lignes en chiffre vendu au client, et les fixtures de la tâche 3 lui donnent déjà une vérité terrain exacte.

**Files:**
- Create: `src/lib/convex/egalim/agregation.ts`
- Test: `src/lib/convex/egalim/__tests__/agregation.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
import { describe, it, expect } from 'vitest';
import { calculerRatios, type LignePourAgregation } from '../agregation';

const ligne = (o: Partial<LignePourAgregation>): LignePourAgregation => ({
	amountHT: 100,
	isFood: true,
	family: 'EPICERIE_SECHE',
	isDurable: false,
	isBio: false,
	...o
});

describe('calculerRatios', () => {
	it('exclut le non-alimentaire du dénominateur', () => {
		const r = calculerRatios([
			ligne({ amountHT: 100, isFood: true, isDurable: true, isBio: true }),
			ligne({ amountHT: 100, isFood: false }) // frais de port
		]);
		expect(r.totalFoodHT).toBe(100);
		expect(r.durable).toBe(1);
		expect(r.bio).toBe(1);
	});

	it('calcule le ratio durable sur la totalité des achats alimentaires', () => {
		const r = calculerRatios([
			ligne({ amountHT: 300, isDurable: true, isBio: true }),
			ligne({ amountHT: 700 })
		]);
		expect(r.durable).toBeCloseTo(0.3, 10);
		expect(r.bio).toBeCloseTo(0.3, 10);
	});

	it('distingue durable et bio', () => {
		const r = calculerRatios([
			ligne({ amountHT: 200, isDurable: true, isBio: true }), // AB
			ligne({ amountHT: 300, isDurable: true, isBio: false }), // Label Rouge
			ligne({ amountHT: 500 })
		]);
		expect(r.durable).toBeCloseTo(0.5, 10);
		expect(r.bio).toBeCloseTo(0.2, 10);
	});

	it('calcule le ratio viande/poisson sur ces deux familles seulement', () => {
		const r = calculerRatios([
			ligne({ amountHT: 600, family: 'VIANDE', isDurable: true }),
			ligne({ amountHT: 400, family: 'POISSON' }),
			ligne({ amountHT: 1000, family: 'EPICERIE_SECHE', isDurable: true })
		]);
		expect(r.meatFishDurable).toBeCloseTo(0.6, 10);
	});

	it('renvoie 0 sur le ratio viande/poisson quand il n’y a ni viande ni poisson', () => {
		const r = calculerRatios([ligne({ amountHT: 100, family: 'EPICERIE_SECHE' })]);
		expect(r.meatFishDurable).toBe(0);
	});

	it('renvoie des ratios à 0 sur un lot vide', () => {
		const r = calculerRatios([]);
		expect(r.durable).toBe(0);
		expect(r.bio).toBe(0);
		expect(r.totalFoodHT).toBe(0);
	});

	it('un avoir réduit numérateur ET dénominateur', () => {
		const r = calculerRatios([
			ligne({ amountHT: 300, isDurable: true, isBio: true }),
			ligne({ amountHT: -100, isDurable: true, isBio: true }), // avoir sur bio
			ligne({ amountHT: 700 })
		]);
		// 200 de bio sur 900 d'alimentaire
		expect(r.totalFoodHT).toBe(900);
		expect(r.bio).toBeCloseTo(200 / 900, 10);
	});
});

describe('écart en euros', () => {
	it('chiffre ce qu’il faut basculer pour atteindre chaque seuil', () => {
		const r = calculerRatios([
			ligne({ amountHT: 100, isDurable: true, isBio: true }),
			ligne({ amountHT: 900 })
		]);
		// durable 10 % sur 1 000 → il manque 400 € pour atteindre 50 %
		expect(r.gapEuros.toDurable50).toBeCloseTo(400, 6);
		// bio 10 % → il manque 100 € pour atteindre 20 %
		expect(r.gapEuros.toBio20).toBeCloseTo(100, 6);
	});

	it('renvoie 0 quand le seuil est déjà atteint', () => {
		const r = calculerRatios([ligne({ amountHT: 1000, isDurable: true, isBio: true })]);
		expect(r.gapEuros.toDurable50).toBe(0);
		expect(r.gapEuros.toBio20).toBe(0);
	});
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

```bash
bun run test:unit -- agregation
```

- [ ] **Step 3: Écrire `agregation.ts`**

```ts
import { SEUILS } from '$lib/egalim/referentiel';
import { FAMILLES_VIANDE_POISSON, type Famille } from '$lib/egalim/types';

/**
 * Une ligne PRÊTE à agréger : tous les champs de classification sont renseignés.
 * Dans le schéma, `isFood`/`family`/`isDurable`/`isBio` sont optionnels tant que
 * la ligne n'est pas classée — l'appelant doit donc écarter les lignes non
 * classées AVANT d'appeler `calculerRatios`, jamais les traiter comme non
 * qualifiantes. Une ligne non classée silencieusement comptée comme non durable
 * fausse le ratio vers le bas sans qu'aucun test ne le voie.
 */
export interface LignePourAgregation {
	amountHT: number;
	isFood: boolean;
	family: Famille;
	isDurable: boolean;
	isBio: boolean;
}

export interface Ratios {
	durable: number;
	bio: number;
	meatFishDurable: number;
	totalFoodHT: number;
	totalHT: number;
	gapEuros: { toDurable50: number; toBio20: number; toMeatFish60: number };
}

/** Combien d'euros basculer pour amener `actuel / base` au seuil visé. */
function ecartVersSeuil(actuelHT: number, baseHT: number, seuil: number): number {
	const manque = seuil * baseHT - actuelHT;
	return manque > 0 ? manque : 0;
}

export function calculerRatios(lignes: readonly LignePourAgregation[]): Ratios {
	let totalHT = 0;
	let totalFoodHT = 0;
	let durableHT = 0;
	let bioHT = 0;
	let meatFishHT = 0;
	let meatFishDurableHT = 0;

	for (const l of lignes) {
		totalHT += l.amountHT;
		if (!l.isFood) continue;

		// Un avoir porte un montant négatif : il retranche du dénominateur
		// comme du numérateur, sans traitement particulier.
		totalFoodHT += l.amountHT;
		if (l.isDurable) durableHT += l.amountHT;
		if (l.isBio) bioHT += l.amountHT;

		if (FAMILLES_VIANDE_POISSON.includes(l.family)) {
			meatFishHT += l.amountHT;
			if (l.isDurable) meatFishDurableHT += l.amountHT;
		}
	}

	const ratio = (num: number, den: number) => (den > 0 ? num / den : 0);

	return {
		durable: ratio(durableHT, totalFoodHT),
		bio: ratio(bioHT, totalFoodHT),
		meatFishDurable: ratio(meatFishDurableHT, meatFishHT),
		totalFoodHT,
		totalHT,
		gapEuros: {
			toDurable50: ecartVersSeuil(durableHT, totalFoodHT, SEUILS.durable),
			toBio20: ecartVersSeuil(bioHT, totalFoodHT, SEUILS.bio),
			toMeatFish60: ecartVersSeuil(meatFishDurableHT, meatFishHT, SEUILS.viandePoissonDurable)
		}
	};
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

```bash
bun run test:unit -- agregation
```

Attendu : tous PASS.

- [ ] **Step 5: Test d'intégration contre les fixtures**

Ajouter au fichier de test un bloc qui charge chaque `.csv` de `src/lib/fixtures/factures/`, applique `calculerRatios` sur les lignes attendues, et compare aux ratios du `.expected.json` correspondant.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit --no-verify -m "feat(egalim): agregation des 3 ratios + ecart en euros, testee sur fixtures"
```

---

## Task 5: Extraction CSV

**Files:**
- Create: `src/lib/convex/egalim/parsers/csv.ts`
- Test: `src/lib/convex/egalim/__tests__/csv.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

Couvrir : détection du séparateur (`,` / `;` / tabulation), encodages (UTF-8, ISO-8859-1 — les exports comptables français sont souvent en latin-1), montants à virgule décimale (`45,20`), colonnes manquantes, lignes vides, et le rejet des lignes de total intermédiaire.

```ts
import { describe, it, expect } from 'vitest';
import { parseCsv, detecterColonnes } from '../parsers/csv';

describe('detecterColonnes', () => {
	it('reconnaît les en-têtes français usuels', () => {
		const m = detecterColonnes(['Désignation', 'Qté', 'PU HT', 'Montant HT', 'Date']);
		expect(m.label).toBe('Désignation');
		expect(m.amountHT).toBe('Montant HT');
	});

	it('reconnaît les variantes majuscules et sans accent', () => {
		const m = detecterColonnes(['LIBELLE', 'QUANTITE', 'PRIX UNITAIRE', 'TOTAL HT']);
		expect(m.label).toBe('LIBELLE');
		expect(m.amountHT).toBe('TOTAL HT');
	});

	it('renvoie null sur le libellé quand aucune colonne ne correspond', () => {
		const m = detecterColonnes(['A', 'B', 'C']);
		expect(m.label).toBeNull();
	});
});

describe('parseCsv', () => {
	it('lit les montants à virgule décimale', () => {
		const lignes = parseCsv('Libelle;Montant HT\nCAROTTE BIO;45,20\n');
		expect(lignes[0]!.amountHT).toBeCloseTo(45.2, 6);
	});

	it('conserve les montants négatifs des avoirs', () => {
		const lignes = parseCsv('Libelle;Montant HT\nAVOIR CAROTTE BIO;-45,20\n');
		expect(lignes[0]!.amountHT).toBeCloseTo(-45.2, 6);
	});

	it('écarte les lignes de total intermédiaire', () => {
		const lignes = parseCsv('Libelle;Montant HT\nCAROTTE;10,00\nTOTAL PAGE 1;10,00\n');
		expect(lignes).toHaveLength(1);
	});

	it('ignore les lignes vides', () => {
		const lignes = parseCsv('Libelle;Montant HT\nCAROTTE;10,00\n\n\n');
		expect(lignes).toHaveLength(1);
	});
});
```

- [ ] **Step 2: Lancer, vérifier l'échec, puis écrire `parsers/csv.ts`**

Le module expose `detecterColonnes(headers)` (mapping heuristique) et `parseCsv(contenu)` (lignes brutes normalisées), en s'appuyant sur `papaparse` déjà présent. Un montant est parsé en remplaçant la virgule décimale par un point et en retirant les espaces insécables. Une ligne dont le libellé correspond à `/^(total|sous.?total|report)/i` est écartée.

- [ ] **Step 3: Lancer, vérifier le succès**

```bash
bun run test:unit -- csv
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit --no-verify -m "feat(egalim): extraction CSV avec detection de colonnes"
```

---

## Task 6: Extraction PDF texte

**Files:**
- Create: `src/lib/convex/egalim/parsers/pdfText.ts`
- Create: `src/lib/convex/egalim/extraction.ts`

- [ ] **Step 1: Écrire `parsers/pdfText.ts`**

Utiliser `unpdf` (compatible runtime serverless) pour extraire le texte brut. La structuration en lignes de facture est ensuite confiée à Claude en sortie typée — les formats de grossistes sont trop hétérogènes pour un parseur d'expressions régulières, et une mauvaise heuristique produit des lignes fausses **silencieusement**.

- [ ] **Step 2: Écrire `extraction.ts` — l'orchestration**

Une `internalAction` par document :

1. Lit le fichier depuis Convex Storage
2. Aiguille selon `sourceType` : `CSV` → `parseCsv`, `PDF_TEXT` → `unpdf` puis structuration Claude
3. Écrit les `invoiceLines` avec `reviewStatus: 'AUTO'` et aucun champ de classification
4. Met à jour `extractionStatus` du document et les compteurs du lot

**Règle non négociable :** un document en échec passe en `extractionStatus: 'FAILED'` avec sa raison, **et le lot continue**. Sans cette règle, un seul PDF corrompu dans un dépôt de quarante fichiers bloque le premier diagnostic réel.

- [ ] **Step 3: Vérifier et commiter**

```bash
bun run check:convex && bunx convex dev --once
git add -A && git commit --no-verify -m "feat(egalim): extraction PDF texte + orchestration par document"
```

---

## Task 7: Normalisation des libellés et des fournisseurs

C'est l'étape qui fait l'économie du produit : 3 000 lignes deviennent 300 à 500 libellés distincts.

**Files:**
- Create: `src/lib/convex/egalim/normalisation.ts`
- Test: `src/lib/convex/egalim/__tests__/normalisation.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
import { describe, it, expect } from 'vitest';
import { normaliserLibelle, normaliserFournisseur } from '../normalisation';

describe('normaliserLibelle', () => {
	it('met en majuscules et écrase les espaces multiples', () => {
		expect(normaliserLibelle('  carotte   rondelle  ')).toBe('CAROTTE RONDELLE');
	});

	it('retire les accents pour que les variantes se rejoignent', () => {
		expect(normaliserLibelle('Pâtes complètes')).toBe(normaliserLibelle('Pates completes'));
	});

	it('conserve les mentions de conditionnement — elles portent du sens', () => {
		expect(normaliserLibelle('CAROTTE RONDELLE 4/4 BIO 2.5KG')).toContain('4/4');
		expect(normaliserLibelle('CAROTTE RONDELLE 4/4 BIO 2.5KG')).toContain('2.5KG');
	});

	it('rapproche deux écritures du même produit', () => {
		expect(normaliserLibelle('CAROTTE  RONDELLE 4/4 BIO')).toBe(
			normaliserLibelle('carotte rondelle 4/4 bio')
		);
	});
});

describe('normaliserFournisseur', () => {
	it('retire les formes juridiques', () => {
		expect(normaliserFournisseur('TRANSGOURMET SAS')).toBe('TRANSGOURMET');
		expect(normaliserFournisseur('Pomona S.A.')).toBe('POMONA');
	});
});
```

- [ ] **Step 2: Écrire `normalisation.ts`, vérifier que les tests passent**

`normaliserLibelle` : majuscules, suppression des accents (`normalize('NFD')` puis retrait des diacritiques), écrasement des espaces. **Ne retire pas** les chiffres, les unités ni les mentions de conditionnement — `4/4` et `2.5KG` distinguent des produits réellement différents.

`normaliserFournisseur` : mêmes règles, plus le retrait des formes juridiques (`SAS`, `SARL`, `SA`, `S.A.`, `EURL`, `SASU`).

- [ ] **Step 3: Commit**

```bash
bun run test:unit -- normalisation
git add -A && git commit --no-verify -m "feat(egalim): normalisation des libelles et des fournisseurs"
```

---

## Task 8: Classification par lots via Claude

Le cœur du produit. Décisions d'API figées en spec §4.6 — les relire avant d'écrire une ligne.

**Files:**
- Create: `src/lib/convex/egalim/prompt.ts`
- Create: `src/lib/convex/egalim/classification.ts`

- [ ] **Step 1: Écrire `prompt.ts` — le prompt système, stable et donc cacheable**

```ts
import { LABELS_QUALIFIANTS, MENTIONS_NON_QUALIFIANTES, REFERENTIEL_VERSION } from '$lib/egalim/referentiel';
import { FAMILLES } from '$lib/egalim/types';

/**
 * Prompt système de classification. DOIT être déterministe — aucune date,
 * aucun identifiant de lot, aucun `Date.now()`. La moindre variation invalide
 * le cache et multiplie le coût par diagnostic.
 */
export function construirePromptSysteme(): string {
	const bareme = Object.entries(LABELS_QUALIFIANTS)
		.map(([code, v]) => `- ${code} (${v.libelle}) : durable ${v.durable ? 'oui' : 'non'}, bio ${v.bio ? 'oui' : 'non'}`)
		.join('\n');

	return `Tu classes des libellés de produits issus de factures fournisseurs de restauration collective française, selon le barème de la loi EGalim (référentiel version ${REFERENTIEL_VERSION}).

Pour chaque libellé, tu détermines :
1. S'il s'agit d'un produit ALIMENTAIRE. Les frais de port, consignes, emballages, produits d'entretien et petit équipement ne le sont pas et sortent du calcul.
2. Sa famille parmi : ${FAMILLES.join(', ')}.
3. Les labels qualifiants que le libellé permet d'établir, parmi : ${Object.keys(LABELS_QUALIFIANTS).join(', ')}.
4. Une justification en une phrase, en français, citant ce qui dans le libellé fonde ta décision.
5. Un indice de confiance entre 0 et 1.

BARÈME
${bareme}

NE QUALIFIENT RIEN
Les mentions suivantes ne comptent ni en durable ni en bio : ${MENTIONS_NON_QUALIFIANTES.join(', ')}. Le code de la commande publique interdit la préférence géographique : « local » n'est pas un critère légal.

RÈGLES
- N'attribue un label que si le libellé l'établit. N'infère jamais un label depuis le nom du fournisseur ou la seule nature du produit.
- Un libellé ambigu reçoit une confiance basse plutôt qu'une décision assurée. Un arbitrage humain suit.
- Aucune classification sans justification. Une classification non justifiable est inutilisable en contrôle.`;
}
```

- [ ] **Step 2: Écrire `classification.ts` — l'action Convex**

Points imposés :

| Point | Mise en œuvre |
|---|---|
| Modèle | `claude-opus-5` |
| Sortie typée | `output_config.format` avec un `json_schema` (**pas de prefill : 400 sur Opus 5**) |
| Effort | `output_config.effort = 'low'`, thinking laissé actif |
| Échantillonnage | **aucun** paramètre (`temperature`/`top_p`/`top_k` → 400) |
| Cache | `cache_control: { type: 'ephemeral' }` sur le bloc système |
| `max_tokens` | 8 000 |
| Lot | 50 libellés distincts par appel |

Le prompt système va dans `system` avec le point de cache ; les libellés à classer vont dans `messages`, **après**. Placés avant, chaque lot réécrirait le cache au lieu de le lire.

Idempotence : un libellé déjà présent dans `productLabels` avec le `REFERENTIEL_VERSION` courant n'est pas reclassé. Relancer un lot est donc toujours sûr.

Découpage : l'action traite un lot puis **se re-planifie** via `ctx.scheduler.runAfter(0, ...)` pour le suivant. Ce mécanisme est du **travail neuf** — contrairement à ce que supposait la première rédaction de la spec, `processFuelImport` traitait son fichier en un seul appel.

Robustesse : 3 tentatives avec backoff exponentiel sur chaque appel, puis le lot bascule en revue manuelle. **Aucun code du legacy n'implémentait de retry** — c'est également du travail neuf.

Routage vers la revue humaine :

```ts
const SEUIL_CONFIANCE = 0.85;

function doitPasserEnRevue(c: { confidence: number; family: Famille }): boolean {
	// Systématiquement viande et poisson : ces familles portent le seuil des
	// 60 %, où une erreur coûte le plus cher.
	if (FAMILLES_VIANDE_POISSON.includes(c.family)) return true;
	return c.confidence < SEUIL_CONFIANCE;
}
```

- [ ] **Step 3: Garde-fou de coût**

`classificationJobs` accumule `tokensIn`, `tokensOut`, `cacheReadTokens` et `costEur` à chaque appel. **Plafond dur de 10 € par lot** : au-delà, le job passe en `CAPPED`, la re-planification s'arrête et une notification `LIGNES_A_ARBITRER` part vers l'opérateur.

- [ ] **Step 4: Vérifier que le cache prend**

Après un premier lot réel :

```bash
bunx convex logs | grep cache_read
```

Attendu : `cacheReadTokens` **non nul** dès le deuxième appel. S'il reste à zéro, le prompt système varie d'un appel à l'autre — chercher une date ou un identifiant qui s'y serait glissé. Ce contrôle n'est pas optionnel : sans cache, le coût par diagnostic sort du budget de 0,50 à 2 €.

- [ ] **Step 5: Commit**

```bash
bun run check:convex && bunx convex dev --once
git add -A && git commit --no-verify -m "feat(egalim): classification par lots avec referentiel en cache"
```

---

## Task 9: File de revue humaine

**Files:**
- Create: `src/lib/convex/egalim/revue.ts`
- Create: `src/routes/[[lang]]/ops/revue/[batchId]/+page.svelte`

- [ ] **Step 1: Écrire `revue.ts`**

- `listerLibellesEnRevue(batchId)` — les libellés distincts en `PENDING_REVIEW`, avec leur nombre d'occurrences et le montant HT cumulé, triés par montant décroissant (arbitrer d'abord ce qui pèse le plus)
- `confirmerLibelle(normalizedLabel)` — écrit dans `productLabels` avec `source: 'HUMAN'`, propage à toutes les `invoiceLines` du lot en `CONFIRMED`
- `corrigerLibelle(normalizedLabel, classification)` — idem en `CORRECTED`

**L'arbitrage se fait par libellé, jamais par ligne.** Une décision règle toutes ses occurrences, chez ce client et chez tous les suivants.

- [ ] **Step 2: Écrire l'écran `/ops/revue/[batchId]`**

Un tableau dense : libellé source, occurrences, montant cumulé, classification proposée, justification, confiance. Deux actions par ligne — Confirmer, Corriger. Raccourcis clavier pour enchaîner (c'est l'écran où l'opérateur passera le plus de temps).

- [ ] **Step 3: Commit**

```bash
bun run check:convex && git add -A && git commit --no-verify -m "feat(egalim): file de revue par libelle cote operateur"
```

---

## Task 10: Dépôt de factures côté cantine

**Files:**
- Create: `src/routes/[[lang]]/app/factures/+page.svelte`
- Create: `src/lib/convex/egalim/batches.ts`
- Modify: `src/lib/components/authenticated/configs/app-sidebar-config.ts`

- [ ] **Step 1: Écrire `batches.ts`** — création d'un lot, génération d'URL d'upload, enregistrement des documents, suivi d'avancement

- [ ] **Step 2: Écrire l'écran de dépôt**

Trois états : dépôt (glisser-déposer multi-fichiers), traitement (avancement par document, les échecs visibles et nommés), terminé (lien vers le diagnostic). Le parcours reprend le gabarit archivé en `docs/superpowers/references/gabarit-wizard-import-csv.md`.

**Message d'accueil :** demander en priorité l'export comptable ou le fichier du grossiste. Le doc 05 chiffre le gain à 80 % du travail d'extraction — c'est une consigne d'interface autant que de script commercial.

- [ ] **Step 3: Ajouter « Factures » à la nav cantine**

- [ ] **Step 4: Commit**

```bash
bun run check:convex && git add -A && git commit --no-verify -m "feat(egalim): depot de factures cote cantine"
```

---

## Task 11: Le rapport de diagnostic

**Files:**
- Create: `src/lib/convex/egalim/diagnostics.ts`
- Create: `src/routes/[[lang]]/app/diagnostic/[id]/+page.svelte`

- [ ] **Step 1: Écrire `diagnostics.ts`**

`produireDiagnostic(batchId)` agrège, **fige** les ratios dans la table et passe le lot en `READY`.

**Un diagnostic livré est figé, définitivement.** Les ratios sont stockés calculés, jamais recalculés à la volée. Un arbitrage postérieur ne doit pas altérer un rapport déjà remis au client ; une nouvelle mesure produit un **nouveau** diagnostic daté.

- [ ] **Step 2: Écrire l'écran du rapport**

Contenu, dans l'ordre du doc 03 :

1. Les trois ratios, avec l'écart au seuil
2. La décomposition par famille et par fournisseur
3. L'écart chiffré en euros
4. Le plan de comblement — les familles classées par coût d'accès croissant
5. Les lignes `TO_JUSTIFY` et les courriers d'attestation à envoyer
6. Le fichier de saisie « ma cantine »

Cartes au pattern glass-metal du projet : `relative overflow-hidden`, reflet blanc inset en haut, bordure sobre.

- [ ] **Step 3: Les courriers d'attestation — le point qui rembourse la prestation**

Le doc 03 est explicite : les lignes `proofStatus: 'TO_JUSTIFY'` — des produits vraisemblablement labellisés dont la facture ne porte pas la mention — rapportent souvent 3 à 8 points de ratio, gratuitement, en réclamant simplement les certificats. C'est ce qui rend le diagnostic immédiatement rentable pour le client, et ça ne doit pas se limiter à une ligne dans le rapport.

Ajouter à `diagnostics.ts` une fonction qui, à la production du diagnostic :

1. Regroupe les lignes `TO_JUSTIFY` **par fournisseur**
2. Somme le montant HT en jeu par fournisseur (`amountAtStake`)
3. Crée une `attestationRequests` par fournisseur, en `DRAFT`
4. Génère le corps du courrier : identité de la cantine, fournisseur, période, liste des produits concernés, montant en jeu, et la demande d'attestation de label

Le rapport affiche ces courriers avec un bouton de copie. L'envoi reste manuel en V0 — c'est un mail que le gestionnaire signe, pas un envoi automatique en notre nom.

- [ ] **Step 4: Feuille de style d'impression**

Une vraie feuille `@media print` — pas un `window.print()` brut. C'est le document que l'opérateur laisse après la restitution d'une heure.

- [ ] **Step 5: Commit**

```bash
bun run check:convex && git add -A && git commit --no-verify -m "feat(egalim): rapport de diagnostic fige + feuille d'impression"
```

---

## Task 12: Vérification finale et gate

**Files:** aucun (vérification seule)

- [ ] **Step 1: La chaîne complète**

```bash
bun run check:convex
bun run test:unit
bunx convex dev --once
bun run build
```

Attendu : `check:convex` 0 erreur, tous les tests PASS, `Convex functions ready`, build réussi.

- [ ] **Step 2: Parcours de bout en bout sur fixtures**

Depuis `bun run dev` : créer une organisation, déposer les 3 CSV de fixtures, laisser tourner la classification, arbitrer la file de revue, produire le diagnostic. **Comparer les ratios obtenus aux `.expected.json`.** Ils doivent correspondre au centime — les fixtures ont une vérité terrain exacte.

- [ ] **Step 3: 🚪 La gate — sur un VRAI jeu de factures**

C'est la seule étape que les fixtures ne peuvent pas couvrir. Elles valident le code ; la gate valide le classifieur face au réel.

1. Déposer un vrai jeu de factures fournisseurs
2. Produire le diagnostic
3. **Vérifier 100 lignes à la main, une par une**
4. Compter les erreurs

**Si le taux d'erreur dépasse 5 %, on ne prospecte pas — on corrige.** Un rapport faux détruit la crédibilité pour de bon et engage la responsabilité de conseil.

- [ ] **Step 4: Revue du référentiel par Jules**

Relecture ligne à ligne de `src/lib/egalim/referentiel.ts` contre la fiche EGalim (doc 10) et contre « ma cantine ». **Avant le premier rapport client, pas après.** C'est le seul endroit du code où une erreur se propage silencieusement dans tous les livrables.

- [ ] **Step 5: Commit final**

```bash
git add -A && git commit --no-verify -m "chore: phase 1 terminee — Moulinette Audit V0"
```

---

## Ce que cette phase ne fait pas

- **Pas d'OCR.** Les PDF scannés et les photos sont hors périmètre. Le doc 05 le reporte explicitement, et sans OCR le POC couvre l'écrasante majorité des cas si la demande client est bien formulée.
- **Pas d'API Batches.** Elle donnerait -50 % sur les tokens (spec §4.6) mais ajoute une machine à états là où des appels synchrones suffisent à prouver le produit. Optimisation de phase 2.
- **Pas de générateur PDF serveur.** Feuille d'impression seulement, jusqu'à demande client explicite.
- **Pas de simulateur public.** C'est la phase 2, en octobre, avec la refonte de la landing.
- **Pas d'historique de ratios ni d'alertes de dérive.** C'est la phase 3, en décembre, avec le portail Conformité — et on ne construit pas une alerte de dérive avant d'avoir un seul mois de données réelles à faire dériver.
- **Pas de catalogue, de commandes, de producteurs ni de tournées.** Étages 3 à 5.
