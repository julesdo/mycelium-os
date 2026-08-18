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
| `src/lib/convex/egalim/extractionSchema.ts` | Contrat de sortie typée de l'extraction |
| `src/lib/convex/egalim/extracteurClaude.ts` | Extraction universelle : PDF, image, photo, texte |
| `src/lib/convex/egalim/verification.ts` | Contrôle arithmétique contre les totaux du document |
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

## Ce qu'impose une vraie facture

Une facture fournisseur réelle a été analysée le 15/08/2026. Elle invalide plusieurs hypothèses de la première rédaction et fixe le niveau d'exigence de l'extraction. **Le fichier source n'est pas versionné** — il porte un SIRET, un nom de fournisseur et un nom de client réels. Seule une fixture anonymisée qui en reproduit la structure entre dans le dépôt.

### 1. Les factures arrivent océrisées, pas en texte propre

Le fichier est une sortie d'OCR, avec des substitutions systématiques :

| Écrit | Lire | Exemples relevés |
|---|---|---|
| `0` | `O` | `CAR0TTES`, `P0MME`, `T0TAL` |
| `!` | `I` ou `L` | `S!RET`, `CAB!LLAUD`, `DES!GNATION`, `Te!`, `FR!GO`, `L!VRAISON` |
| `3` | `E` | `L3S` |
| `8` | `B` | `8RETONNES` |

**Conséquence directe :** sans normalisation de ces substitutions, `CAR0TTES SABLES VRAC` et `CAROTTES SABLES VRAC` sont deux libellés distincts. Le cache `productLabels` se fragmente, chaque variante repart en classification, et l'économie du produit s'effondre en silence. Traité en tâche 7.

### 2. Le code TVA est un contrôle arithmétique gratuit

Le pied de facture porte les bases par taux :

```
Code 1 (5.5%) : 290.00 EUR
Code 2 (20.0%) : 22.00 EUR
Total H.T. : 312.00 EUR
```

En France, l'alimentaire est à 5,5 % ou 10 %, le non-alimentaire à 20 %. Sur cette facture, les deux lignes à 20 % — une éponge à 7,00 € et un forfait de livraison frigorifique à 15,00 € — font exactement 22,00 €, et les six lignes alimentaires exactement 290,00 €.

**La facture porte donc sa propre vérification.** Si la somme des lignes classées `isFood: true` ne retombe pas sur la base au taux réduit, la classification est fausse. C'est un contrôle qui ne coûte rien et qui attrape la classe d'erreur la plus coûteuse : un non-alimentaire compté au dénominateur tire tous les ratios vers le bas. Traité en tâche 6.

### 3. Le label qualifiant vit sur une ligne de continuation

```
5      KG     FILET DE CAB!LLAUD           ATL. N.E 12.40     62.00   1
              (Certifié Peche durable MSC)
```

La ligne produit ne porte aucun label ; le seul label qualifiant du poisson est sur la ligne suivante, sans montant. Un parseur qui traite les lignes indépendamment perd 62 € de durable — sur une facture à 290 € d'alimentaire, c'est 21 points de ratio.

Même mécanique en sens inverse : `-> (Cartons de 3kg)` et `* REMISE PROMO ETE -10%` sont aussi des lignes de continuation. La première ne doit pas devenir une ligne ; la seconde si, avec un montant négatif.

**Règle :** une ligne sans quantité ni prix unitaire est une continuation. Elle se rattache à la ligne produit précédente, dont elle enrichit le libellé (si elle porte un label) ou qu'elle corrige (si elle porte un montant).

### 4. Trois faux amis qu'un classifieur naïf qualifierait

| Mention sur la facture | Ce que c'est réellement | EGalim |
|---|---|---|
| `V.B.F.` | Viande Bovine Française — une **origine** | ❌ ne qualifie rien |
| `POULE PLEIN AIR`, `Code 1` | Mode d'élevage des poules pondeuses | ❌ ne qualifie rien |
| `FR`, `FRANCE`, `ATL. N.E` | Origine géographique | ❌ « local ne compte pas » |

Et deux vrais labels, **tous deux durables sans être bio** : `H.V.E 3` sur les pommes (44,00 €) et `Peche durable MSC` sur le cabillaud (62,00 €).

Ces faux amis entrent dans le prompt système en tant que contre-exemples explicites (tâche 8). C'est exactement le genre d'erreur qu'un modèle commet sans hésiter si on ne le prévient pas : `V.B.F.` *ressemble* à un label, et il est apposé sur la ligne la plus chère de la facture.

### 5. La mise en page est en colonnes de largeur fixe

Les tuyaux `|` n'apparaissent que dans l'en-tête ; les données sont alignées à l'espace. Ce n'est ni du CSV, ni un tableau exploitable par un séparateur. L'extraction doit traiter ce format en plus du CSV. Traité en tâche 6.

### 6. Conséquence architecturale : Claude extrait, il ne fait pas que classer

Les factures arrivent en **PDF texte, PDF scanné, image, photo, CSV, Excel et texte brut**, avec une **disposition différente par fournisseur**, des erreurs de reconnaissance et des mises en forme cassées. Un parseur par forme ne survit pas à cette diversité : chaque nouveau fournisseur demande une heuristique de plus, chaque heuristique casse sur le suivant, et elle casse **silencieusement** — elle produit des lignes fausses plutôt qu'une erreur.

Le découpage retenu tient en deux chemins :

| Entrée | Traitement | Justification |
|---|---|---|
| **CSV, Excel** | Parseur déterministe (tâche 5) | Déjà structuré. Exact, gratuit, instantané. Aucune raison de payer des tokens pour lire un tableau. |
| **PDF texte, PDF scanné, image, photo, texte brut** | **Claude en extracteur**, sortie typée (tâche 6) | Un seul chemin pour N dispositions. Absorbe les formats inconnus sans code nouveau. |

**Claude Opus 5 lit les images de documents nativement** — 2 576 px sur le grand côté, coordonnées à l'échelle 1:1. Une photo de facture, une page scannée et un texte océrisé passent par le même appel.

**Le contrôle TVA devient la boucle de vérification de l'extraction**, pas seulement une validation d'après-coup. Une facture porte plusieurs points de contrôle arithmétiques — bases par taux, total HT, net à payer. Si la somme des lignes extraites ne retombe pas dessus, l'extraction est fausse et on la relance en le signalant au modèle. C'est ce qui rend une extraction par LLM fiable : elle n'est pas crue sur parole, elle est vérifiée contre des invariants que le document porte lui-même.

**Coût.** Extraire par Claude coûte des tokens **par document** (jusqu'à ~4 800 tokens pour une image pleine résolution), là où classer coûte par libellé distinct. Un dossier de quarante pages scannées pousse le coût par diagnostic vers le haut de la fourchette du doc 05, voire au-delà. Trois leviers, dans cet ordre de préférence :

1. **Réclamer l'export comptable** — le chemin CSV ne coûte rien. C'est la consigne d'interface de la tâche 10 et le script commercial du doc 05.
2. **L'API Batches** — −50 % sur tous les tokens, traitement sous 24 h. Un diagnostic n'est pas sensible à la latence.
3. **Un modèle moins cher sur la seule extraction** — arbitrage de Jules, pas décision par défaut.

Le garde-fou de coût de la tâche 8 couvre les deux étapes, pas seulement la classification.

### 7. Vérité terrain de cette facture

Elle sert de référence à la fixture anonymisée de la tâche 3 :

| | Montant HT | Détail |
|---|---|---|
| Total facture | 312,00 € | |
| **Total alimentaire** | **290,00 €** | 13,75 + 150,00 + 22,50 − 2,25 + 44,00 + 62,00 |
| Non alimentaire | 22,00 € | éponge 7,00 + forfait livraison 15,00 |
| **Durable** | **106,00 €** | pomme HVE 3 (44,00) + cabillaud MSC (62,00) |
| **Bio** | **0,00 €** | aucun produit bio |
| Viande + poisson | 212,00 € | steak 150,00 + cabillaud 62,00 |
| dont durable | 62,00 € | cabillaud MSC seul |

| Ratio | Valeur | Seuil | Verdict |
|---|---|---|---|
| Durable | **36,55 %** | 50 % | ❌ |
| Bio | **0,00 %** | 20 % | ❌ |
| Viande-poisson durable | **29,25 %** | 60 % | ❌ |

Les trois seuils sont manqués. C'est le cas typique du prospect, et un excellent jeu de test : il exerce les trois ratios à la fois, dont un à zéro et un sur un sous-ensemble de familles.

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

/**
 * Faux amis relevés sur de vraies factures : des sigles et mentions qui
 * RESSEMBLENT à un label officiel mais n'en sont pas. Ils sont injectés comme
 * contre-exemples explicites dans le prompt de classification — un modèle non
 * prévenu les qualifie sans hésiter, et ils sont souvent apposés sur les lignes
 * les plus chères de la facture.
 */
export const FAUX_AMIS: ReadonlyArray<{ mention: string; nature: string }> = [
	{ mention: 'VBF / V.B.F.', nature: 'Viande Bovine Française — une origine, pas un label' },
	{ mention: 'VPF / V.P.F.', nature: 'Viande Porcine Française — une origine, pas un label' },
	{ mention: 'plein air', nature: "mode d'élevage des volailles, pas un label EGalim" },
	{ mention: 'Code 0 / 1 / 2 / 3', nature: "code d'élevage des poules pondeuses" },
	{ mention: 'FR, FRANCE, origine France', nature: 'origine géographique' },
	{ mention: 'ATL. N.E, FAO 27', nature: 'zone de pêche, pas un écolabel' },
	{ mention: 'HVE niveau 1, HVE niveau 2', nature: 'seul le niveau 3 qualifie' },
	{ mention: 'sans OGM, sans antibiotique', nature: 'allégation produit, pas un label EGalim' }
];

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

- [ ] **Step 1: La fixture de référence — décalquée de la vraie facture**

Écrire à la main `src/lib/fixtures/factures/grossiste-ocr-01.txt`, qui reproduit **exactement la structure** de la facture réelle analysée plus haut, avec des noms inventés. Toutes les pathologies de la section « Ce qu'impose une vraie facture » y sont, aux mêmes montants — c'est ce qui permet de vérifier les ratios au centime.

```
S.A.R.L. L3S C0MPT0IRS DU N0RD
ZI. Est, 59000 LILL3
Te! : 03.20.00.00.00  S!RET: 000000000 00000

FACTURE N. F24-0001a       Date : 12 /09 /2026
Cl!ent : CUISINE CENTRALE DEM0 (C-0001)

QTE | UNITE | DES!GNATION | ORIG./LAB. | P.U. HT | T0TAL HT |TVA

12.5   KG     CAR0TTES SABLES VRAC         FR       1.10      13.75   1
10     COLIS  STEAK H. BOEUF V.B.F.        FRANCE   15.00     150.00  1
              -> (Cartons de 3kg)
5      Plaq   OEUF POULE PLEIN AIR         Code 1   4.50      22.50   1
              * REMISE PROMO ETE -10%                         -2.25   1
20     KG     P0MME GALA H.V.E 3           FR       2.20      44.00   1
5      KG     FILET DE CAB!LLAUD           ATL. N.E 12.40     62.00   1
              (Certifié Peche durable MSC)
2      U      LAVETTE Eponge BLEUE         -        3.50      7.00    2
1      F      FORFAIT FR!GO L!VRAISON      -        15.00     15.00   2

------------------------------------------------------
BASES T.V.A :
Code 1 (5.5%) : 290.00 EUR  -> TVA : 15.95 EUR
Code 2 (20.0%) : 22.00 EUR  -> TVA : 4.40 EUR

Total H.T. : 312.00 EUR
NET A PAYER TTC : 332.35 EUR
```

Sa vérité terrain, dans `grossiste-ocr-01.expected.json` :

```json
{
  "totalHT": 312.00,
  "totalFoodHT": 290.00,
  "durableHT": 106.00,
  "bioHT": 0.00,
  "meatFishTotalHT": 212.00,
  "meatFishDurableHT": 62.00,
  "ratios": { "durable": 0.3655172413793103, "bio": 0, "meatFishDurable": 0.29245283018867924 },
  "vatCrossCheck": { "reducedRateBase": 290.00, "standardRateBase": 22.00 },
  "lines": [
    { "rawLabel": "CAR0TTES SABLES VRAC", "amountHT": 13.75, "isFood": true, "family": "FRUITS_LEGUMES", "qualifyingLabels": [] },
    { "rawLabel": "STEAK H. BOEUF V.B.F.", "amountHT": 150.00, "isFood": true, "family": "VIANDE", "qualifyingLabels": [] },
    { "rawLabel": "OEUF POULE PLEIN AIR", "amountHT": 22.50, "isFood": true, "family": "LAITIERS", "qualifyingLabels": [] },
    { "rawLabel": "REMISE PROMO ETE -10%", "amountHT": -2.25, "isFood": true, "family": "LAITIERS", "qualifyingLabels": [] },
    { "rawLabel": "P0MME GALA H.V.E 3", "amountHT": 44.00, "isFood": true, "family": "FRUITS_LEGUMES", "qualifyingLabels": ["HVE3"] },
    { "rawLabel": "FILET DE CAB!LLAUD (Certifié Peche durable MSC)", "amountHT": 62.00, "isFood": true, "family": "POISSON", "qualifyingLabels": ["PECHE_DURABLE"] },
    { "rawLabel": "LAVETTE Eponge BLEUE", "amountHT": 7.00, "isFood": false, "family": "AUTRE", "qualifyingLabels": [] },
    { "rawLabel": "FORFAIT FR!GO L!VRAISON", "amountHT": 15.00, "isFood": false, "family": "AUTRE", "qualifyingLabels": [] }
  ]
}
```

Points de vigilance encodés dans ce fichier attendu, chacun correspondant à une erreur que le pipeline peut commettre :

| Ligne attendue | Ce qu'elle teste |
|---|---|
| `STEAK ... V.B.F.` avec `qualifyingLabels: []` | Le faux ami `V.B.F.` n'est pas un label |
| `OEUF POULE PLEIN AIR` avec `[]` | Le faux ami « plein air » n'est pas un label |
| `REMISE PROMO ETE` à `-2.25`, `isFood: true`, famille `LAITIERS` | La remise hérite de la famille du produit qu'elle corrige, et reste alimentaire |
| `FILET DE CAB!LLAUD (Certifié Peche durable MSC)` en **un seul** `rawLabel` | La ligne de continuation a bien été fusionnée |
| `-> (Cartons de 3kg)` **absent** de la liste | La continuation sans montant n'a pas produit de ligne |
| `LAVETTE` et `FORFAIT FR!GO` en `isFood: false` | Le non-alimentaire est exclu du dénominateur |
| `vatCrossCheck` | La somme des lignes `isFood` retombe sur la base à 5,5 % |

- [ ] **Step 2: Écrire le générateur pour les variantes**

`scripts/generate-fixtures.ts` produit **deux fixtures CSV** supplémentaires, cette fois générées, pour couvrir les formats que la fixture OCR n'exerce pas :

| Fixture | Ce qu'elle ajoute |
|---|---|
| `export-comptable-01.csv` | Le chemin royal : export comptable propre, séparateur `;`, montants à virgule décimale, encodage ISO-8859-1, une colonne `LABEL` dédiée |
| `grossiste-sale-01.csv` | Séparateur `,`, colonnes dans un ordre inhabituel, lignes vides, `TOTAL PAGE 1` en milieu de fichier, deux **avoirs** (un sur un produit bio, un sur un conventionnel), unités hétérogènes (kg, pièce, colis, litre) |

Chacune avec son `.expected.json` au même format.

**Un avoir réduit numérateur ET dénominateur.** C'est la règle la plus facile à rater : une ligne à `-45,20` sur un produit bio doit retrancher 45,20 € du total alimentaire *et* du total bio. `grossiste-sale-01.csv` doit donc porter un avoir sur un produit qualifiant et un sur un produit non qualifiant — les deux cas ne se comportent pas pareil au numérateur.

- [ ] **Step 3: Générer, vérifier l'arithmétique**

```bash
bun scripts/generate-fixtures.ts && ls src/lib/fixtures/factures/
```

Attendu : 3 paires (1 écrite à la main, 2 générées).

Puis contrôler que chaque `.expected.json` est cohérent avec lui-même :

```bash
bun -e "
for (const f of ['grossiste-ocr-01','export-comptable-01','grossiste-sale-01']) {
  const e = require('./src/lib/fixtures/factures/'+f+'.expected.json');
  const somme = e.lines.filter(l=>l.isFood).reduce((s,l)=>s+l.amountHT,0);
  const ok = Math.abs(somme - e.totalFoodHT) < 0.005;
  console.log(f, ok ? 'OK' : 'INCOHERENT: '+somme+' != '+e.totalFoodHT);
}"
```

Attendu : `OK` sur les trois. Une fixture dont la vérité terrain est fausse est pire qu'aucune fixture — elle valide un bug.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit --no-verify -m "test(egalim): fixtures decalquees d'une vraie facture ocerisee"
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

## Task 6: Extraction universelle par Claude

Le chemin qui absorbe tous les formats non structurés : PDF texte, PDF scanné, image, photo, texte océrisé — avec une disposition différente par fournisseur. Un seul appel, une sortie typée, et une vérification arithmétique contre les totaux que le document porte lui-même.

C'est la tâche la plus délicate de la phase. Une extraction fausse ne lève aucune erreur : elle produit des lignes plausibles et fausses, et tout le diagnostic en découle.

**Files:**
- Create: `src/lib/convex/egalim/extractionSchema.ts`
- Create: `src/lib/convex/egalim/extracteurClaude.ts`
- Create: `src/lib/convex/egalim/verification.ts`
- Create: `src/lib/convex/egalim/extraction.ts`
- Test: `src/lib/convex/egalim/__tests__/verification.test.ts`

- [ ] **Step 1: Définir le schéma de sortie typée**

`extractionSchema.ts` — le contrat que Claude doit remplir. Il porte les lignes **et** les totaux du document, parce que ce sont les totaux qui permettent de vérifier les lignes.

```ts
import { z } from 'zod';

export const ligneExtraiteSchema = z.object({
	rawLabel: z.string().describe(
		'Le libellé du produit tel qu’il apparaît, y compris toute mention de label figurant sur une ligne de continuation rattachée à ce produit.'
	),
	quantity: z.number().nullable(),
	unit: z.string().nullable(),
	unitPrice: z.number().nullable(),
	amountHT: z.number().describe(
		'Montant HT de la ligne. NÉGATIF pour un avoir, une remise ou un rabais.'
	),
	vatRate: z.number().nullable().describe(
		'Taux de TVA de la ligne en pourcentage (5.5, 10, 20). null si absent.'
	)
});

export const documentExtraitSchema = z.object({
	supplierName: z.string().nullable(),
	invoiceNumber: z.string().nullable(),
	invoiceDate: z.string().nullable().describe('Format AAAA-MM-JJ.'),
	lignes: z.array(ligneExtraiteSchema),
	totaux: z.object({
		totalHT: z.number().nullable(),
		basesParTaux: z
			.array(z.object({ taux: z.number(), baseHT: z.number() }))
			.describe('Bases de TVA par taux, telles qu’imprimées en pied de facture.')
	}),
	illisible: z.boolean().describe(
		'true si le document n’est pas exploitable : trop flou, tronqué, ou ce n’est pas une facture.'
	),
	raisonIllisible: z.string().nullable()
});

export type DocumentExtrait = z.infer<typeof documentExtraitSchema>;
```

`illisible` est un champ de sortie délibéré : sans lui, un modèle à qui l'on demande des lignes en invente plutôt que d'admettre qu'il ne voit rien. Lui donner une porte de sortie explicite est ce qui évite les hallucinations sur une photo floue.

- [ ] **Step 2: Écrire le prompt d'extraction**

Il ne décrit **aucune disposition** — c'est tout l'intérêt. Il décrit ce qu'est une ligne de facture et les pièges observés.

```
Tu extrais les lignes d'une facture fournisseur de restauration collective française.
La disposition varie d'un fournisseur à l'autre : colonnes, tableaux, texte libre,
largeurs fixes. N'attends aucun format particulier.

RÈGLES D'EXTRACTION
- Une ligne de facture porte un libellé produit et un montant HT. Elle peut aussi
  porter une quantité, une unité, un prix unitaire et un taux de TVA.
- LIGNES DE CONTINUATION : une ligne sans montant qui suit un produit le complète.
  Si elle porte une mention de label ou de certification, RATTACHE-LA au libellé
  du produit précédent. Si elle ne porte qu'un conditionnement, ignore-la.
- AVOIRS ET REMISES : un montant négatif reste une ligne, avec son montant négatif.
- N'EXTRAIS PAS : les en-têtes de tableau, les totaux intermédiaires, les sous-totaux,
  les récapitulatifs de TVA, le total HT, le net à payer, les mentions légales.
- ERREURS DE RECONNAISSANCE : le texte peut venir d'un OCR (0 pour O, ! pour I ou L,
  3 pour E). Restitue le libellé tel que tu le lis, sans le corriger — la
  normalisation est faite ailleurs.
- TOTAUX : relève le total HT et les bases de TVA par taux telles qu'imprimées.
  Ils servent à vérifier ton extraction.
- Si le document est illisible ou n'est pas une facture, mets illisible à true et
  explique pourquoi. N'invente jamais de lignes.
```

- [ ] **Step 3: Écrire `extracteurClaude.ts`**

Une action Convex qui aiguille selon la nature du document :

| Entrée | Envoi à Claude |
|---|---|
| PDF avec couche texte | Texte extrait par `unpdf`, en bloc `text` |
| PDF sans couche texte | Chaque page rendue en image via `unpdf`, en blocs `image` |
| Image, photo (`png`, `jpg`, `webp`) | Le fichier, en bloc `image` |
| Texte brut, `.txt` | Le contenu, en bloc `text` |

Paramètres d'appel, alignés sur la spec §4.6 :

| Paramètre | Valeur |
|---|---|
| Modèle | `claude-opus-5` |
| Sortie | `output_config.format` construit depuis `documentExtraitSchema` |
| Effort | `'low'` — lire un tableau n'est pas un raisonnement profond |
| Échantillonnage | **aucun** (400 sur Opus 5) |
| `max_tokens` | 16 000 — une facture dense peut porter 200 lignes |
| Cache | `cache_control` sur le prompt d'extraction (stable) |

**Images :** ne pas redimensionner en amont. Opus 5 accepte 2 576 px sur le grand côté et les gains de lecture sur un document dense justifient les tokens. Un document de plus de 20 pages est découpé en appels de 10 pages, et les lignes concaténées.

- [ ] **Step 4: Écrire les tests de vérification**

```ts
import { describe, it, expect } from 'vitest';
import { verifierExtraction } from '../verification';

const extrait = (lignes: Array<{ amountHT: number; vatRate: number | null }>, totaux: unknown) => ({
	supplierName: null,
	invoiceNumber: null,
	invoiceDate: null,
	lignes: lignes.map((l, i) => ({
		rawLabel: `P${i}`,
		quantity: null,
		unit: null,
		unitPrice: null,
		...l
	})),
	totaux,
	illisible: false,
	raisonIllisible: null
});

describe('verifierExtraction', () => {
	it('valide une extraction dont la somme retombe sur le total HT', () => {
		const r = verifierExtraction(
			extrait([{ amountHT: 100, vatRate: 5.5 }, { amountHT: 22, vatRate: 20 }], {
				totalHT: 122,
				basesParTaux: [
					{ taux: 5.5, baseHT: 100 },
					{ taux: 20, baseHT: 22 }
				]
			})
		);
		expect(r.ok).toBe(true);
		expect(r.ecarts).toHaveLength(0);
	});

	it('détecte une ligne manquante par l’écart au total HT', () => {
		const r = verifierExtraction(
			extrait([{ amountHT: 100, vatRate: 5.5 }], { totalHT: 122, basesParTaux: [] })
		);
		expect(r.ok).toBe(false);
		expect(r.ecarts[0]!.nature).toBe('TOTAL_HT');
		expect(r.ecarts[0]!.ecart).toBeCloseTo(22, 2);
	});

	it('détecte une ligne mal ventilée par l’écart sur une base de TVA', () => {
		const r = verifierExtraction(
			extrait([{ amountHT: 100, vatRate: 20 }, { amountHT: 22, vatRate: 20 }], {
				totalHT: 122,
				basesParTaux: [
					{ taux: 5.5, baseHT: 100 },
					{ taux: 20, baseHT: 22 }
				]
			})
		);
		// Le total tombe juste, mais la ventilation par taux est fausse.
		expect(r.ok).toBe(false);
		expect(r.ecarts.some((e) => e.nature === 'BASE_TVA')).toBe(true);
	});

	it('tolère un centime d’arrondi', () => {
		const r = verifierExtraction(
			extrait([{ amountHT: 100.005, vatRate: 5.5 }], { totalHT: 100, basesParTaux: [] })
		);
		expect(r.ok).toBe(true);
	});

	it('ne peut pas vérifier un document sans totaux, et le dit', () => {
		const r = verifierExtraction(
			extrait([{ amountHT: 100, vatRate: null }], { totalHT: null, basesParTaux: [] })
		);
		expect(r.ok).toBe(false);
		expect(r.ecarts[0]!.nature).toBe('NON_VERIFIABLE');
	});

	it('rejette un document déclaré illisible', () => {
		const d = extrait([], { totalHT: null, basesParTaux: [] });
		const r = verifierExtraction({ ...d, illisible: true, raisonIllisible: 'photo floue' });
		expect(r.ok).toBe(false);
	});
});
```

- [ ] **Step 5: Écrire `verification.ts`**

```ts
const TOLERANCE_EUR = 0.01;
const TAUX_ALIMENTAIRES = new Set([5.5, 10]);

export type NatureEcart = 'TOTAL_HT' | 'BASE_TVA' | 'NON_VERIFIABLE';

export interface Ecart {
	nature: NatureEcart;
	attendu: number | null;
	obtenu: number;
	ecart: number;
	detail: string;
}

export interface ResultatVerification {
	ok: boolean;
	ecarts: Ecart[];
}
```

Trois contrôles, du plus fort au plus faible :

1. **Somme des lignes contre le total HT.** Attrape une ligne oubliée ou dupliquée.
2. **Somme par taux contre chaque base de TVA.** Attrape une ligne mal ventilée — le cas où le total tombe juste mais la répartition est fausse, invisible autrement. C'est aussi ce qui donne gratuitement le signal alimentaire / non-alimentaire : les taux réduits sont alimentaires, 20 % ne l'est pas.
3. **Aucun total exploitable** → `NON_VERIFIABLE`. Le document part en revue humaine plutôt qu'en confiance aveugle. **Une extraction non vérifiable n'est pas une extraction réussie.**

- [ ] **Step 6: Écrire `extraction.ts` — l'orchestration et la boucle de reprise**

Par document :

1. Détermine la nature (extension **et** contenu — un `.txt` peut être un CSV comme une facture océrisée)
2. CSV / Excel → `parseCsv` (tâche 5). Sinon → `extracteurClaude`
3. `verifierExtraction`
4. **Si `ok`** → écrit les `invoiceLines`, `extractionStatus: 'DONE'`
5. **Si non `ok`** → relance l'extraction en joignant les écarts constatés :

```
Ta précédente extraction ne retombe pas sur les totaux de la facture :
- Somme des lignes : 268,00 € — total HT imprimé : 290,00 € — écart : 22,00 €
Relis le document et corrige. Une ligne a probablement été omise.
```

6. **Deux reprises au maximum.** Au-delà, le document passe en `extractionStatus: 'FAILED'` avec les écarts, **et le lot continue**. L'opérateur voit le document, l'écart chiffré et les lignes extraites — il tranche à la main.

**Règle non négociable :** un document en échec ne bloque jamais le lot. Deux fichiers illisibles sur quarante ne doivent pas empêcher le diagnostic sur les trente-huit autres.

**Le garde-fou de coût couvre l'extraction.** `classificationJobs` accumule les tokens des deux étapes. La boucle de reprise est bornée à deux essais précisément pour qu'une facture pathologique ne consomme pas le plafond du lot à elle seule.

- [ ] **Step 7: Vérifier sur les fixtures**

```bash
bun run test:unit -- verification && bun run check:convex && bunx convex dev --once
```

Puis, sur la fixture océrisée `grossiste-ocr-01.txt`, contrôler que l'extraction produit **8 lignes**, que le cabillaud porte bien la mention MSC fusionnée depuis sa ligne de continuation, que `-> (Cartons de 3kg)` n'a produit aucune ligne, que la remise est à −2,25 €, et que `verifierExtraction` retourne `ok: true` — la somme doit retomber sur 312,00 € et les bases sur 290,00 € et 22,00 €.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit --no-verify -m "feat(egalim): extraction universelle par Claude + verification arithmetique"
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

describe('normaliserLibelle — substitutions d’OCR', () => {
	it('rapproche une variante océrisée de sa forme propre', () => {
		expect(normaliserLibelle('CAR0TTES SABLES VRAC')).toBe(
			normaliserLibelle('CAROTTES SABLES VRAC')
		);
	});

	it.each([
		['P0MME GALA', 'POMME GALA'],
		['CAB!LLAUD', 'CABILLAUD'],
		['FR!GO L!VRAISON', 'FRIGO LIVRAISON'],
		['L3S HALLES', 'LES HALLES'],
		['8RETONNES', 'BRETONNES']
	])('%s se normalise comme %s', (ocr, propre) => {
		expect(normaliserLibelle(ocr)).toBe(normaliserLibelle(propre));
	});

	it('ne casse PAS un chiffre légitime dans un conditionnement', () => {
		// 2.5KG, 4/4 et H.V.E 3 portent des chiffres qui sont de vrais chiffres.
		expect(normaliserLibelle('P0MME GALA H.V.E 3')).toContain('3');
		expect(normaliserLibelle('CAROTTE 4/4 2.5KG')).toContain('2.5KG');
		expect(normaliserLibelle('CAROTTE 4/4 2.5KG')).toContain('4/4');
	});

	it('ne casse pas un code produit numérique', () => {
		expect(normaliserLibelle('REF 88213')).toContain('88213');
	});
});

describe('normaliserFournisseur', () => {
	it('retire les formes juridiques', () => {
		expect(normaliserFournisseur('TRANSGOURMET SAS')).toBe('TRANSGOURMET');
		expect(normaliserFournisseur('Pomona S.A.')).toBe('POMONA');
	});

	it('applique aussi les substitutions d’OCR', () => {
		expect(normaliserFournisseur('S.A.R.L. L3S C0MPT0IRS')).toBe(
			normaliserFournisseur('SARL LES COMPTOIRS')
		);
	});
});
```

- [ ] **Step 2: Lancer, vérifier l'échec, puis écrire `normalisation.ts`**

```bash
bun run test:unit -- normalisation
```

Le point délicat est la **désambiguïsation des substitutions d'OCR**. `0` peut être un vrai zéro (`2.5KG`, `REF 88213`, `H.V.E 3`) ou un `O` mal reconnu (`CAR0TTES`). Une substitution aveugle casse les conditionnements et les codes produit, qui sont précisément ce qui distingue deux références.

**La règle : ne substituer un chiffre que lorsqu'il est entouré de lettres.**

```ts
/**
 * Substitutions d'OCR observées sur de vraies factures fournisseurs.
 * Appliquées UNIQUEMENT à l'intérieur d'un mot alphabétique — un chiffre
 * bordé de lettres est presque toujours une erreur de reconnaissance, un
 * chiffre isolé ou bordé de chiffres est presque toujours un vrai chiffre.
 *
 * Contre-exemples que cette règle protège :
 *   « 2.5KG », « 4/4 », « REF 88213 », « H.V.E 3 », « Code 1 »
 */
const SUBSTITUTIONS_OCR: ReadonlyArray<[RegExp, string]> = [
	[/(?<=[A-Z])0(?=[A-Z])/g, 'O'], // CAR0TTES -> CAROTTES
	[/(?<=[A-Z])3(?=[A-Z])/g, 'E'], // L3S -> LES
	[/(?<=[A-Z])1(?=[A-Z])/g, 'I'], // PR1X -> PRIX
	[/(?<=[A-Z])5(?=[A-Z])/g, 'S'], // CA5SE -> CASSE
	[/(?<=^|[^A-Z0-9])8(?=[A-Z]{2})/g, 'B'], // 8RETONNES -> BRETONNES
	[/!/g, 'I'] // CAB!LLAUD -> CABILLAUD, S!RET -> SIRET
];
```

Le `!` se substitue sans condition : il n'apparaît jamais légitimement dans un libellé produit. Il vaut tantôt `I`, tantôt `L` (`FR!GO` → `FRIGO`, `L!VRAISON` → `LIVRAISON`) — on retient `I` uniformément, ce qui suffit puisque la normalisation ne sert qu'à **rapprocher deux écritures du même produit**, pas à produire un français correct. La forme lisible par l'humain reste `rawLabel`, conservé intact.

Ordre des opérations dans `normaliserLibelle` :

1. Majuscules
2. Suppression des accents (`normalize('NFD')` puis retrait des diacritiques)
3. Substitutions d'OCR
4. Écrasement des espaces multiples et trim

**Ne retire pas** les chiffres, les unités ni les mentions de conditionnement : `4/4` et `2.5KG` distinguent des produits réellement différents, et les fusionner ferait classer une conserve comme un sac de 25 kg.

`normaliserFournisseur` : mêmes étapes, plus le retrait des formes juridiques (`SAS`, `SARL`, `S.A.R.L.`, `SA`, `S.A.`, `EURL`, `SASU`, `SNC`) après les substitutions.

- [ ] **Step 3: Mesurer le gain de déduplication sur les fixtures**

```bash
bun -e "
const { normaliserLibelle } = await import('./src/lib/convex/egalim/normalisation.ts');
const e = require('./src/lib/fixtures/factures/grossiste-ocr-01.expected.json');
const brut = new Set(e.lines.map(l => l.rawLabel));
const norm = new Set(e.lines.map(l => normaliserLibelle(l.rawLabel)));
console.log('libelles bruts:', brut.size, '-> normalises:', norm.size);
"
```

Sur les fixtures actuelles le gain est faible (peu de doublons), c'est normal — la déduplication paie sur douze mois de factures, pas sur une. Ce contrôle sert à vérifier que la normalisation **ne fusionne pas à tort** : le nombre de libellés normalisés ne doit jamais descendre en dessous du nombre de produits réellement distincts.

- [ ] **Step 4: Commit**

```bash
bun run test:unit -- normalisation
git add -A && git commit --no-verify -m "feat(egalim): normalisation avec desambiguisation des substitutions OCR"
```

---

## Task 8: Classification par lots via Claude

Le cœur du produit. Décisions d'API figées en spec §4.6 — les relire avant d'écrire une ligne.

**Files:**
- Create: `src/lib/convex/egalim/prompt.ts`
- Create: `src/lib/convex/egalim/classification.ts`

- [ ] **Step 1: Écrire `prompt.ts` — le prompt système, stable et donc cacheable**

```ts
import {
	LABELS_QUALIFIANTS,
	MENTIONS_NON_QUALIFIANTES,
	FAUX_AMIS,
	REFERENTIEL_VERSION
} from '$lib/egalim/referentiel';
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

FAUX AMIS — ces mentions ressemblent à des labels mais n'en sont pas
${FAUX_AMIS.map((f) => `- ${f.mention} : ${f.nature}. N'attribue AUCUN label.`).join('\n')}

RÈGLES
- N'attribue un label que si le libellé l'établit. N'infère jamais un label depuis le nom du fournisseur, l'origine géographique, ni la seule nature du produit.
- Les libellés viennent d'OCR et peuvent contenir des erreurs de reconnaissance (0 pour O, ! pour I ou L, 3 pour E). Lis à travers : « CAR0TTES » est « CAROTTES », « CAB!LLAUD » est « CABILLAUD ».
- Un libellé ambigu reçoit une confiance basse plutôt qu'une décision assurée. Un arbitrage humain suit.
- Aucune classification sans justification. Une classification non justifiable est inutilisable en contrôle.`;
}
```

**Le prompt doit rester déterministe.** Aucune date, aucun identifiant de lot, aucun `Date.now()`. `FAUX_AMIS`, `MENTIONS_NON_QUALIFIANTES` et `LABELS_QUALIFIANTS` sont des constantes ordonnées — leur sérialisation est stable d'un appel à l'autre, ce qui est la condition du cache.

**Test de déterminisme, à ajouter :**

```ts
import { describe, it, expect } from 'vitest';
import { construirePromptSysteme } from '../prompt';

describe('construirePromptSysteme', () => {
	it('produit exactement le même texte à chaque appel', () => {
		expect(construirePromptSysteme()).toBe(construirePromptSysteme());
	});

	it('dépasse le minimum cacheable de 512 tokens (~2 000 caractères)', () => {
		expect(construirePromptSysteme().length).toBeGreaterThan(2000);
	});

	it('cite les faux amis relevés sur de vraies factures', () => {
		const p = construirePromptSysteme();
		expect(p).toContain('V.B.F.');
		expect(p).toContain('plein air');
	});
});
```

Le second test est un garde-fou économique : sous le minimum cacheable, `cache_control` est accepté sans erreur mais **ne cache rien**, et le coût par diagnostic sort du budget sans aucun signal.

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

- [ ] **Step 1: Écrire la query d'agrégation de la file**

`listerLibellesEnRevue(batchId)` regroupe les `invoiceLines` en `PENDING_REVIEW` **par `normalizedLabel`**, et trie par montant cumulé décroissant — on arbitre d'abord ce qui pèse le plus sur le ratio. Un libellé à 150 € vu une fois compte davantage qu'un libellé à 2 € vu quarante fois.

```ts
export interface LibelleARbitrer {
	normalizedLabel: string;
	rawLabelExemple: string; // la forme lisible, montrée à l'opérateur
	occurrences: number;
	montantCumuleHT: number;
	propose: {
		isFood: boolean;
		family: Famille;
		qualifyingLabels: Label[];
		justification: string;
		confidence: number;
	};
	motifRevue: 'CONFIANCE_BASSE' | 'VIANDE_POISSON' | 'ECART_TVA';
}
```

`motifRevue` compte pour l'opérateur : un libellé en `VIANDE_POISSON` avec une confiance de 0,97 se confirme d'un coup d'œil, alors qu'un `CONFIANCE_BASSE` à 0,4 demande de réfléchir. Sans ce champ, les deux se ressemblent et l'opérateur ralentit sur tout.

- [ ] **Step 2: Écrire les mutations d'arbitrage**

```ts
/**
 * Confirme la classification proposée pour un libellé.
 *
 * Trois écritures, dans cet ordre :
 *  1. productLabels : source 'HUMAN', confirmedBy, confirmedAt.
 *     La décision ne sera plus jamais reposée, chez AUCUN client.
 *  2. Toutes les invoiceLines du lot portant ce normalizedLabel -> CONFIRMED.
 *  3. Le compteur labelsPendingReview du lot.
 */
export const confirmerLibelle = mutation({ ... });

/**
 * Corrige la classification d'un libellé. Même chemin que confirmerLibelle,
 * avec la classification fournie par l'opérateur et reviewStatus CORRECTED.
 *
 * La distinction CONFIRMED / CORRECTED n'est pas cosmétique : le taux de
 * correction est l'indicateur de qualité du classifieur. S'il monte, c'est
 * le prompt ou le referentiel qu'il faut reprendre, pas le seuil de confiance.
 */
export const corrigerLibelle = mutation({ ... });
```

**L'arbitrage se fait par libellé, jamais par ligne.** Une décision règle toutes ses occurrences dans le lot, et toutes celles à venir chez tous les clients.

**Piège de concurrence :** deux opérateurs peuvent arbitrer le même libellé simultanément. `productLabels` doit être écrit en `patch` sur le document existant s'il y en a un, jamais en `insert` aveugle — sinon le cache se retrouve avec deux entrées pour le même `normalizedLabel` et la lecture devient non déterministe.

- [ ] **Step 3: Écrire l'écran `/ops/revue/[batchId]`**

Un tableau dense, une ligne par libellé, dans l'ordre de la query :

| Colonne | Contenu |
|---|---|
| Libellé | `rawLabelExemple` — la forme lisible, pas la normalisée |
| Poids | `occurrences` × et `montantCumuleHT` |
| Motif | Badge `CONFIANCE_BASSE` / `VIANDE_POISSON` / `ECART_TVA` |
| Proposition | Famille, labels, alimentaire ou non |
| Justification | La phrase produite par le classifieur |
| Confiance | Barre ou pourcentage |
| Actions | **Confirmer** · **Corriger** |

Cartes et badges au pattern glass-metal du projet : `relative overflow-hidden`, reflet blanc inset en haut.

**Raccourcis clavier obligatoires.** C'est l'écran où l'opérateur passera le plus de temps, et c'est ce temps qui fait la marge du diagnostic. `A` confirme et descend d'une ligne, `C` ouvre la correction, `↑`/`↓` naviguent, `Échap` ferme la correction. Un compteur « 37 restants · 1 240 € en jeu » en tête donne l'avancement réel.

L'écran de correction est un formulaire compact : famille (sélecteur), labels (cases à cocher sur les 10 du barème), alimentaire (bascule), et un champ de justification **pré-rempli avec celle du classifieur**, modifiable. L'opérateur corrige rarement tout — le plus souvent un seul label.

- [ ] **Step 4: Vérifier le comportement**

Depuis `bun run dev`, sur un lot issu des fixtures :

1. La file liste bien les libellés, pas les lignes
2. Le cabillaud MSC apparaît en `VIANDE_POISSON` même avec une confiance haute
3. Confirmer un libellé fait disparaître **toutes** ses occurrences de la file
4. Le compteur du lot décroît du bon nombre

- [ ] **Step 5: Commit**

```bash
bun run check:convex && git add -A && git commit --no-verify -m "feat(egalim): file de revue par libelle, triee par montant en jeu"
```

---

## Task 10: Dépôt de factures côté cantine

**Files:**
- Create: `src/routes/[[lang]]/app/factures/+page.svelte`
- Create: `src/lib/convex/egalim/batches.ts`
- Modify: `src/lib/components/authenticated/configs/app-sidebar-config.ts`

- [ ] **Step 1: Écrire `batches.ts`**

Quatre fonctions, toutes scopées par `organizationId` via le helper d'auth existant :

```ts
/** Crée un lot en DRAFT pour une période. Un seul lot ouvert par org à la fois. */
export const creerLot = mutation({ ... });

/** URL d'upload Convex Storage, une par fichier. */
export const genererUrlDepot = mutation({ ... });

/**
 * Enregistre un fichier déposé et lance son extraction.
 * Déduit sourceType de l'extension ET du contenu : un .txt peut être un CSV
 * comme une facture océrisée, et se tromper ici fait échouer l'extraction
 * pour une raison qui n'a rien à voir avec le fichier.
 */
export const enregistrerDocument = mutation({ ... });

/** Avancement du lot pour l'écran de suivi. */
export const suivreLot = query({ ... });
```

`suivreLot` renvoie de quoi peindre l'écran sans second aller-retour :

```ts
export interface AvancementLot {
	status: 'DRAFT' | 'EXTRACTING' | 'CLASSIFYING' | 'REVIEW' | 'READY' | 'FAILED';
	documents: Array<{
		filename: string;
		extractionStatus: 'PENDING' | 'DONE' | 'FAILED';
		extractionError?: string;
		linesCount: number;
	}>;
	linesTotal: number;
	labelsPendingReview: number;
	diagnosticId?: Id<'diagnostics'>;
}
```

- [ ] **Step 2: Écrire l'écran de dépôt**

Quatre états, dans l'ordre du parcours :

**1. Accueil et consigne.** Avant même la zone de dépôt, une consigne courte :

> **Ce qui accélère tout : l'export comptable.** Si votre logiciel de comptabilité ou le portail de votre grossiste permet d'exporter les factures en CSV ou Excel, déposez ce fichier plutôt que les PDF. Le traitement est plus rapide et le résultat plus fiable.
>
> À défaut, les PDF conviennent. Les photos et les scans ne sont pas encore pris en charge.

Le doc 05 chiffre le gain à **80 % du travail d'extraction**. C'est une consigne d'interface autant que de script commercial, et elle doit être lue avant le dépôt, pas après.

**2. Dépôt.** Glisser-déposer multi-fichiers, ou sélection classique. Accepte `.csv`, `.xlsx`, `.pdf`, `.txt`. Affiche chaque fichier ajouté avec sa taille et un bouton de retrait. Le parcours reprend le gabarit archivé en `docs/superpowers/references/gabarit-wizard-import-csv.md`.

**3. Traitement.** Une ligne par document, avec son état. **Les échecs sont visibles et nommés**, jamais masqués :

| État | Affichage |
|---|---|
| `PENDING` | « En cours… » |
| `DONE` | « 214 lignes extraites » |
| `FAILED` | Le message de `extractionError` en clair, avec ce qu'il faut faire |

Pour un PDF sans couche texte, le message est actionnable : *« PDF scanné — nous ne savons pas encore lire les scans. Demandez à votre fournisseur le fichier d'origine ou l'export de votre portail client. »* Un message d'erreur technique (`unpdf: no text layer`) ferait appeler l'opérateur pour rien.

**Le lot continue malgré les échecs.** Deux fichiers illisibles sur quarante ne doivent pas empêcher le diagnostic sur les trente-huit autres.

**4. Terminé.** Lien vers le diagnostic, et le rappel que le rapport est figé à sa remise.

- [ ] **Step 3: Ajouter « Factures » à la nav cantine**

Dans `app-sidebar-config.ts`, entre « Accueil » et « Paramètres ». La nav de la cantine compte alors trois entrées, ce qui est le bon nombre pour un POC — chaque entrée en plus est une occasion de se perdre.

- [ ] **Step 4: Vérifier le parcours**

Depuis `bun run dev` : déposer les trois fixtures d'un coup, vérifier que les trois s'extraient, qu'un fichier volontairement corrompu passe en `FAILED` **sans bloquer les autres**, et que le compteur de lignes correspond à la somme attendue.

- [ ] **Step 5: Commit**

```bash
bun run check:convex && git add -A && git commit --no-verify -m "feat(egalim): depot de factures cote cantine, echecs visibles et actionnables"
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

Sept sections, dans l'ordre exact de la restitution du doc 09 — cet ordre est un outil de vente autant qu'un plan de document. Le client voit son chiffre avant d'entendre quoi que ce soit d'autre.

**1. Le chiffre.** Les trois ratios en grand, chacun avec son seuil et son écart. Vert si atteint, ambre sinon — **jamais rouge** : le rapport constate, il n'accuse pas. Sur la facture de référence, la section afficherait :

| Ratio | Mesuré | Seuil | Écart |
|---|---|---|---|
| Durable | 36,55 % | 50 % | −13,45 pts |
| Bio | 0,00 % | 20 % | −20,00 pts |
| Viande-poisson | 29,25 % | 60 % | −30,75 pts |

**2. D'où ça vient.** Décomposition par famille puis par fournisseur, en valeur et en part. C'est souvent la première fois que le gestionnaire voit sa structure d'achats ainsi.

**3. L'écart en euros.** `gapEuros` traduit en une phrase par seuil : *« pour atteindre 50 % de durable, il faut basculer 41 000 € d'achats annuels. »* Le pourcentage ne parle pas, l'euro parle.

**4. Les points gratuits.** Les lignes `TO_JUSTIFY`, groupées par fournisseur, avec les points de ratio récupérables. Cette section vient **avant** toute proposition commerciale — la réciprocité fait le reste (doc 09 §7).

**5. Le plan de comblement.** Les trois familles prioritaires, classées par **coût d'accès croissant** : points de ratio gagnés par euro de surcoût. Pas par volume, pas par montant — par rendement.

**6. La simulation à budget constant.** La réponse à l'objection numéro un (« le bio, c'est plus cher »), avec les quatre leviers du doc 03 §5.4.

**7. Le fichier de saisie « ma cantine ».** Export des montants agrégés au format de la télédéclaration.

Cartes au pattern glass-metal du projet : `relative overflow-hidden`, reflet blanc inset en haut, bordure sobre.

**Le mot interdit.** Aucune occurrence de « garantie » ni de « conforme » au futur nulle part dans le rapport ni dans le code qui le génère. Le rapport **mesure**, il ne promet pas. Ajouter un test qui échoue si le mot apparaît :

```ts
it('n’emploie jamais le mot « garantie »', () => {
	const source = readFileSync('src/routes/[[lang]]/app/diagnostic/[id]/+page.svelte', 'utf8');
	expect(source.toLowerCase()).not.toMatch(/garanti/);
});
```

Ce test peut sembler excessif. Il ne l'est pas : c'est la ligne rouge juridique du modèle, elle se franchit en une phrase bien intentionnée, et personne ne la relit avant l'envoi.

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

- **Pas d'apprentissage de disposition par fournisseur.** Chaque facture est relue de zéro. Mémoriser la mise en page d'un fournisseur pour accélérer et fiabiliser ses factures suivantes est la même idée compositive que `productLabels` — mais elle attend d'avoir des fournisseurs récurrents à mémoriser. Phase 2.
- **Pas de correction manuelle des lignes extraites.** Un document dont la vérification échoue après deux reprises part en `FAILED` : l'opérateur le traite hors outil. Un éditeur de lignes ligne à ligne est du travail que le journal de friction n'a pas encore désigné.
- **Pas d'API Batches.** Elle donnerait -50 % sur les tokens (spec §4.6) mais ajoute une machine à états là où des appels synchrones suffisent à prouver le produit. Optimisation de phase 2.
- **Pas de générateur PDF serveur.** Feuille d'impression seulement, jusqu'à demande client explicite.
- **Pas de simulateur public.** C'est la phase 2, en octobre, avec la refonte de la landing.
- **Pas d'historique de ratios ni d'alertes de dérive.** C'est la phase 3, en décembre, avec le portail Conformité — et on ne construit pas une alerte de dérive avant d'avoir un seul mois de données réelles à faire dériver.
- **Pas de catalogue, de commandes, de producteurs ni de tournées.** Étages 3 à 5.
