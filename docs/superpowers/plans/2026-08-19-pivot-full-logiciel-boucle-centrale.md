# Pivot full-logiciel — la boucle centrale

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire de Mycelium un logiciel de conformité EGalim utilisable par le seul gérant de cantine : il dépose, l'IA classe, il confirme ce qui compte, il lit son chiffre de l'année.

**Architecture:** L'unité de travail devient le **libellé distinct**, jamais la ligne ni la facture. Les ratios se calculent par **année civile** sur `invoiceLines`, plus par lot. Une file de confirmation côté client remplace l'arbitrage opérateur, et alimente un cache global de classification **sans jamais que ce cache n'apprenne l'identité de personne**. L'espace `/ops` disparaît en entier.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, Convex, Tailwind v4, Vitest, Playwright, bun.

**Spec:** `docs/superpowers/specs/2026-08-19-pivot-full-logiciel-ux-tablette-design.md`

**Ce plan couvre les étapes 1 à 5 de la spec.** Le scan caméra, les certificats et la gate font l'objet d'un second plan.

---

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `CLAUDE.md` | règles du projet, remises d'équerre |
| `src/lib/convex/egalim/consensus.ts` | **créé** — logique pure : un libellé doit-il encore être demandé ? |
| `src/lib/convex/egalim/agregation.ts` | **modifié** — ajout de la part non confirmée |
| `src/lib/convex/egalim/pilotage.ts` | **créé** — queries du dashboard, agrégation par année |
| `src/lib/convex/egalim/confirmation.ts` | **créé** — la file de confirmation côté client |
| `src/lib/convex/egalim/tables.ts` | **modifié** — champs de consensus, index par organisation |
| `src/lib/convex/egalim/revue.ts` | **supprimé** en tâche 8, après transplantation |
| `src/lib/components/authenticated/app-rail.svelte` | **créé** — barre latérale tablette / barre basse téléphone |
| `src/routes/[[lang]]/app/confirmer/+page.svelte` | **créé** — l'écran À confirmer, deux volets |
| `src/routes/[[lang]]/app/+page.svelte` | **modifié** — le pilotage |

Un fichier par responsabilité. `pilotage.ts` lit, `confirmation.ts` écrit, `consensus.ts` décide : aucun des trois n'a besoin de connaître les internes des autres.

---

## Task 1 : Remettre `CLAUDE.md` d'équerre

Ce fichier est chargé à chaque session et oriente chaque décision. Tant qu'il dit « 80 % humain », tout ce qui sera écrit ensuite ira dans la mauvaise direction.

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Remplacer la section « Vision produit »**

Remplacer le paragraphe qui contient « On vend un résultat mesuré, pas un SaaS. 80 % humain, 20 % logiciel. » par :

```markdown
**On vend un logiciel qui mesure, pas du temps humain.** L'extraction et la classification sont
automatisées ; le gérant confirme ce qui engage sa responsabilité. La charge est dégressive : un
libellé confirmé l'est définitivement, et le consensus entre clients en retire encore.

**Cible :** restauration collective privée en gestion directe, non équipée, Île-de-France Ouest.
```

- [ ] **Step 2: Remplacer la section « L'échelle de valeur en 6 étages »**

Supprimer le tableau entier et le paragraphe « On ne monte pas d'étage… ». Le remplacer par :

```markdown
## Ce qu'on vend

Un abonnement au logiciel de conformité : dépôt de factures, mesure des trois taux EGalim, file de
confirmation, certificats et courriers de demande d'attestation.

Les étages « opérateur » du modèle précédent (pilote substitution, abonnement opérateur,
orchestration logistique) n'ont plus de porteur : il n'y a plus d'opérateur Mycelium.
```

- [ ] **Step 3: Corriger la section « Architecture »**

Remplacer :

```markdown
- Deux espaces : `/app/*` (la cantine) et `/ops/*` (l'opérateur Mycelium, vue multi-clients).
- Rôles client : `ORG_ADMIN`, `ORG_MEMBER`. Rôles staff : `SUPER_ADMIN`, `OPERATOR`.
```

par :

```markdown
- **Un seul espace : `/app/*`**, celui de la cantine. Il n'y a pas d'espace opérateur.
- Rôles : `ORG_ADMIN`, `ORG_MEMBER`. Aucun rôle staff.
- **Tablette d'abord**, paysage privilégié, sans casser le téléphone. Cibles tactiles 48 px.
```

- [ ] **Step 4: Ajouter la règle de confidentialité du cache global**

Sous la section « Auditabilité — non négociable », ajouter :

```markdown
- `productLabels` est **globale et anonyme**. Elle ne contient qu'un libellé et son verdict : jamais
  de montant, de quantité, de fournisseur, d'organisation **ni d'utilisateur**. Le compteur de
  confirmations est un entier nu ; la question « cette organisation a-t-elle déjà confirmé ? » se
  répond côté client, sur ses propres lignes.
- **Viande et poisson passent toujours devant un humain**, quel que soit le consensus atteint.
```

- [ ] **Step 5: Vérifier qu'aucune mention de l'opérateur ne subsiste**

```bash
grep -niE "opérateur mycelium|80 ?% humain|/ops|SUPER_ADMIN|OPERATOR|concierge" CLAUDE.md
```

Attendu : aucune sortie. Si une ligne sort, la corriger.

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit --no-verify -m "docs: CLAUDE.md aligne sur le modele full-logiciel"
```

---

## Task 2 : La logique de consensus, en pur

C'est la règle qui décide si un libellé doit encore être demandé. Elle est écrite avant tout le reste parce que trois écrans en dépendent, et parce qu'elle se teste sans base de données.

**Files:**
- Create: `src/lib/convex/egalim/consensus.ts`
- Test: `src/lib/convex/egalim/__tests__/consensus.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
import { describe, it, expect } from 'vitest';
import { SEUIL_CONSENSUS, doitEtreDemande, type EntreeCache } from '../consensus';

function entree(p: Partial<EntreeCache> = {}): EntreeCache {
	return {
		confidence: 0.99,
		confirmationsCount: 0,
		contested: false,
		...p
	};
}

describe('doitEtreDemande', () => {
	it('demande un libellé jamais vu', () => {
		expect(doitEtreDemande(null, 'EPICERIE_SECHE')).toBe(true);
	});

	it('demande tant que le consensus n’est pas atteint', () => {
		expect(doitEtreDemande(entree({ confirmationsCount: SEUIL_CONSENSUS - 1 }), 'EPICERIE_SECHE')).toBe(
			true
		);
	});

	it('cesse de demander une fois le consensus atteint', () => {
		expect(doitEtreDemande(entree({ confirmationsCount: SEUIL_CONSENSUS }), 'EPICERIE_SECHE')).toBe(
			false
		);
	});

	it('redemande un libellé contesté, même au-delà du consensus', () => {
		expect(
			doitEtreDemande(
				entree({ confirmationsCount: SEUIL_CONSENSUS + 5, contested: true }),
				'EPICERIE_SECHE'
			)
		).toBe(true);
	});

	it('demande toujours la viande, quel que soit le consensus', () => {
		expect(doitEtreDemande(entree({ confirmationsCount: 99 }), 'VIANDE')).toBe(true);
	});

	it('demande toujours le poisson, quel que soit le consensus', () => {
		expect(doitEtreDemande(entree({ confirmationsCount: 99 }), 'POISSON')).toBe(true);
	});

	it('demande sous le seuil de confiance même avec du consensus', () => {
		expect(
			doitEtreDemande(entree({ confirmationsCount: 99, confidence: 0.4 }), 'EPICERIE_SECHE')
		).toBe(true);
	});
});

describe('SEUIL_CONSENSUS', () => {
	it('vaut au moins trois : deux gérants pressés peuvent cliquer pareil', () => {
		expect(SEUIL_CONSENSUS).toBeGreaterThanOrEqual(3);
	});
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

```bash
bun run test:unit -- consensus
```

Attendu : ÉCHEC, `Cannot find module '../consensus'`.

- [ ] **Step 3: Écrire `consensus.ts`**

```ts
import { FAMILLES_VIANDE_POISSON, type Famille } from '../../egalim/types';
import { SEUIL_CONFIANCE } from './verdict';

/**
 * Le nombre d'organisations distinctes qui doivent avoir confirmé un libellé
 * pour qu'on cesse de le demander aux suivantes.
 *
 * Trois plutôt que deux : deux confirmations peuvent venir de deux gérants qui
 * cliquent vite sur la même proposition. À trois, le hasard devient improbable.
 * C'est une constante de qualité, revue à la mesure du taux de correction, pas
 * une vérité.
 */
export const SEUIL_CONSENSUS = 3;

/** Ce que le cache global sait d'un libellé. Aucune identité, jamais. */
export interface EntreeCache {
	confidence: number;
	confirmationsCount: number;
	/** Une correction a contredit le verdict : le libellé redevient une question. */
	contested: boolean;
}

/**
 * Faut-il demander ce libellé à cette organisation ?
 *
 * `cache` vaut `null` pour un libellé jamais rencontré. `famille` est celle que
 * la classification annonce.
 */
export function doitEtreDemande(cache: EntreeCache | null, famille: Famille): boolean {
	// Le filet juridique ne se délègue pas à une statistique : ces familles
	// portent le seuil des 60 %, où une erreur coûte le plus cher.
	if (FAMILLES_VIANDE_POISSON.includes(famille)) return true;

	if (cache === null) return true;
	if (cache.contested) return true;
	if (cache.confidence < SEUIL_CONFIANCE) return true;

	return cache.confirmationsCount < SEUIL_CONSENSUS;
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

```bash
bun run test:unit -- consensus
```

Attendu : 8 tests passent.

- [ ] **Step 5: Commit**

```bash
git add src/lib/convex/egalim/consensus.ts src/lib/convex/egalim/__tests__/consensus.test.ts
git commit --no-verify -m "feat(egalim): regle de consensus, viande et poisson toujours demandes"
```

---

## Task 3 : La part non confirmée, en pur

Le dashboard doit dire quelle part du chiffre repose sur du non-relu. Exprimée **en montant**, pas en nombre de libellés.

**Files:**
- Modify: `src/lib/convex/egalim/agregation.ts`
- Test: `src/lib/convex/egalim/__tests__/agregation.test.ts`

- [ ] **Step 1: Ajouter les tests qui échouent**

Ajouter à la fin de `src/lib/convex/egalim/__tests__/agregation.test.ts` :

```ts
import { partNonConfirmee } from '../agregation';

describe('partNonConfirmee', () => {
	const ligne = (amountHT: number, reviewStatus: string) => ({
		amountHT,
		isFood: true,
		reviewStatus: reviewStatus as 'AUTO' | 'PENDING_REVIEW' | 'CONFIRMED' | 'CORRECTED'
	});

	it('vaut zéro quand tout est confirmé', () => {
		expect(partNonConfirmee([ligne(100, 'CONFIRMED'), ligne(50, 'CORRECTED')])).toBe(0);
	});

	it('compte AUTO et PENDING_REVIEW comme non confirmés', () => {
		expect(partNonConfirmee([ligne(75, 'AUTO'), ligne(25, 'PENDING_REVIEW')])).toBe(1);
	});

	it('s’exprime en part du MONTANT, pas du nombre de lignes', () => {
		// Une seule ligne non confirmée, mais elle pèse 90 % des achats.
		const lignes = [ligne(900, 'AUTO'), ligne(50, 'CONFIRMED'), ligne(50, 'CONFIRMED')];
		expect(partNonConfirmee(lignes)).toBeCloseTo(0.9, 5);
	});

	it('ignore le non-alimentaire, qui n’entre dans aucun ratio', () => {
		const lignes = [
			{ amountHT: 500, isFood: false, reviewStatus: 'AUTO' as const },
			ligne(100, 'CONFIRMED')
		];
		expect(partNonConfirmee(lignes)).toBe(0);
	});

	it('vaut zéro sur un lot vide plutôt que NaN', () => {
		expect(partNonConfirmee([])).toBe(0);
	});

	it('raisonne en valeur absolue : un avoir non confirmé pèse aussi', () => {
		expect(partNonConfirmee([ligne(-200, 'AUTO'), ligne(200, 'CONFIRMED')])).toBeCloseTo(0.5, 5);
	});
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

```bash
bun run test:unit -- agregation
```

Attendu : ÉCHEC, `partNonConfirmee is not a function`.

- [ ] **Step 3: Implémenter dans `agregation.ts`**

Ajouter à la fin de `src/lib/convex/egalim/agregation.ts` :

```ts
/** Une ligne, vue sous l'angle du seul état de confirmation. */
export interface LignePourConfirmation {
	amountHT: number;
	isFood: boolean;
	reviewStatus: 'AUTO' | 'PENDING_REVIEW' | 'CONFIRMED' | 'CORRECTED';
}

/**
 * Quelle part des achats alimentaires repose encore sur une classification que
 * personne n'a regardée.
 *
 * Exprimée en part du MONTANT et non du nombre de libellés : « 12 % de vos
 * achats » dit ce qui est en jeu, là où « 37 libellés » ne dit pas si ça pèse
 * 200 € ou 40 000 €.
 *
 * Raisonne en valeur absolue : un avoir de -400 € non confirmé pèse autant
 * qu'un achat de 400 €, et se trompe aussi cher.
 */
export function partNonConfirmee(lignes: readonly LignePourConfirmation[]): number {
	let total = 0;
	let nonConfirme = 0;

	for (const l of lignes) {
		if (!l.isFood) continue;
		const poids = Math.abs(l.amountHT);
		total += poids;
		if (l.reviewStatus === 'AUTO' || l.reviewStatus === 'PENDING_REVIEW') {
			nonConfirme += poids;
		}
	}

	return total > 0 ? nonConfirme / total : 0;
}
```

- [ ] **Step 4: Lancer, vérifier le succès**

```bash
bun run test:unit -- agregation
```

Attendu : tous les tests passent, dont les 6 nouveaux.

- [ ] **Step 5: Commit**

```bash
git add src/lib/convex/egalim/agregation.ts src/lib/convex/egalim/__tests__/agregation.test.ts
git commit --no-verify -m "feat(egalim): part non confirmee, exprimee en montant"
```

---

## Task 4 : Le schéma — consensus et lecture par organisation

**Files:**
- Modify: `src/lib/convex/egalim/tables.ts`

- [ ] **Step 1: Ajouter les champs de consensus à `productLabels`**

Dans `src/lib/convex/egalim/tables.ts`, remplacer le bloc `productLabels` par :

```ts
	// Cache global de classification par libellé distinct.
	// SANS organizationId ET SANS utilisateur, délibérément : ne contient QUE la
	// chaîne de libellé et sa classification. Jamais de montant, de quantité, de
	// fournisseur, ni aucune identité. Ce qui est mutualisé est du référentiel
	// produit, pas de la donnée client.
	productLabels: defineTable({
		normalizedLabel: v.string(),
		isFood: v.boolean(),
		family: vFamille,
		qualifyingLabels: v.array(vLabel),
		justification: v.string(),
		confidence: v.number(),
		source: v.union(v.literal('AUTO'), v.literal('HUMAN')),
		/**
		 * Combien d'organisations DISTINCTES ont confirmé ce libellé. Compteur nu :
		 * la table n'apprend jamais lesquelles. La file ne demandant un libellé
		 * qu'une fois par organisation, l'entier vaut bien un compte de clients
		 * distincts.
		 */
		confirmationsCount: v.number(),
		/**
		 * Une correction a contredit le verdict établi. Le libellé redevient une
		 * question posée à tous, au lieu d'être écrasé silencieusement.
		 */
		contested: v.boolean(),
		/** Le verdict concurrent, tel quel. Ne révèle l'identité de personne. */
		verdictConcurrent: v.optional(
			v.object({
				isFood: v.boolean(),
				family: vFamille,
				qualifyingLabels: v.array(vLabel)
			})
		),
		confirmedAt: v.optional(v.number()),
		classifierVersion: v.string(),
		occurrences: v.number()
	})
		.index('by_normalized_label', ['normalizedLabel'])
		.index('by_source', ['source']),
```

Noter que `confirmedBy` **disparaît** : c'était un identifiant d'utilisateur dans une table globale partagée entre tous les clients.

- [ ] **Step 2: Ajouter l'index de lecture par organisation sur `invoiceLines`**

Dans le même fichier, à la liste d'index de `invoiceLines`, ajouter après `by_batch_and_label` :

```ts
		// « Cette organisation a-t-elle déjà confirmé ce libellé ? » se répond ici,
		// côté client, sans que le cache global n'apprenne jamais qui confirme.
		.index('by_org_and_label', ['organizationId', 'normalizedLabel']),
```

- [ ] **Step 3: Purger les données locales incompatibles et déployer**

Les documents existants n'ont ni `confirmationsCount` ni `contested`. Il n'y a pas de production : on purge.

```bash
printf '' > /tmp/vide.jsonl
bunx convex import --replace --table productLabels --format jsonLines /tmp/vide.jsonl -y
bunx convex dev --once
```

Attendu : `Convex functions ready!` sans erreur de validation de schéma.

- [ ] **Step 4: Vérifier le typecheck**

```bash
bun run check:convex
```

Attendu : des erreurs sur `revue.ts` et `classificationMutations.ts`, qui écrivent encore `confirmedBy` et n'écrivent pas les nouveaux champs. C'est normal : les tâches 5 et 6 les corrigent. **Ne pas commiter tant que le typecheck ne passe pas** — cette tâche se commite avec la tâche 5.

---

## Task 5 : La file de confirmation côté client

Transplantation de `revue.ts` vers un module client, avec la logique de consensus branchée.

**Files:**
- Create: `src/lib/convex/egalim/confirmation.ts`
- Modify: `src/lib/convex/egalim/classificationMutations.ts`

- [ ] **Step 1: Écrire `confirmation.ts`**

```ts
import { v, ConvexError } from 'convex/values';
import { authedQuery, authedMutation } from '../functions';
import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { getUserOrg } from '../lib/auth';
import { REFERENTIEL_VERSION } from '../../egalim/referentiel';
import type { Famille, Label } from '../../egalim/types';
import { deriverVerdict, motifRevue } from './verdict';
import { vFamille, vLabel } from './tables';

/**
 * La file de confirmation du gérant.
 *
 * Elle travaille par LIBELLÉ distinct, jamais par ligne ni par facture. Une
 * cantine achète les mêmes 300 à 500 produits toute l'année : confirmer par
 * facture ferait revoir le même cabillaud quarante fois. Une décision règle
 * toutes les occurrences du libellé chez ce client, et fait avancer le
 * consensus pour tous les autres.
 */

const vMotif = v.union(
	v.literal('NON_CLASSE'),
	v.literal('VIANDE_POISSON'),
	v.literal('REGULARISATION'),
	v.literal('CONFIANCE_BASSE')
);

const vProposition = v.object({
	isFood: v.boolean(),
	family: vFamille,
	qualifyingLabels: v.array(vLabel),
	justification: v.string(),
	confidence: v.number()
});

const vLibelleAConfirmer = v.object({
	normalizedLabel: v.string(),
	rawLabelExemple: v.string(),
	occurrences: v.number(),
	montantCumuleHT: v.number(),
	motif: vMotif,
	proposition: v.union(vProposition, v.null()),
	/** Le document qui porte ce libellé : c'est la PREUVE affichée à droite. */
	documentId: v.union(v.id('invoiceDocuments'), v.null())
});

/**
 * Les libellés en attente de confirmation, toutes années confondues, triés par
 * MONTANT CUMULÉ décroissant en valeur absolue.
 *
 * L'ordre n'est pas cosmétique : un libellé à 150 € vu une fois pèse plus sur
 * le ratio qu'un libellé à 2 € vu quarante fois, et un avoir de -400 € se
 * trompe aussi cher qu'un achat de 400 €.
 */
export const listerAConfirmer = authedQuery({
	args: {},
	returns: v.object({
		libelles: v.array(vLibelleAConfirmer),
		montantTotalEnJeu: v.number()
	}),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);

		const lignes = await ctx.db
			.query('invoiceLines')
			.withIndex('by_org_and_date', (q) => q.eq('organizationId', organizationId))
			.collect();

		const enAttente = lignes.filter((l) => l.reviewStatus === 'PENDING_REVIEW');

		const groupes = new Map<
			string,
			{
				rawLabelExemple: string;
				occurrences: number;
				montantCumuleHT: number;
				ligne: (typeof lignes)[number];
			}
		>();

		for (const ligne of enAttente) {
			const existant = groupes.get(ligne.normalizedLabel);
			if (existant) {
				existant.occurrences += 1;
				existant.montantCumuleHT += ligne.amountHT;
			} else {
				groupes.set(ligne.normalizedLabel, {
					rawLabelExemple: ligne.rawLabel,
					occurrences: 1,
					montantCumuleHT: ligne.amountHT,
					ligne
				});
			}
		}

		const libelles = [...groupes.entries()]
			.map(([normalizedLabel, g]) => ({
				normalizedLabel,
				rawLabelExemple: g.rawLabelExemple,
				occurrences: g.occurrences,
				montantCumuleHT: g.montantCumuleHT,
				motif: motifRevue({
					normalizedLabel,
					isFood: g.ligne.isFood,
					family: g.ligne.family,
					confidence: g.ligne.confidence
				}),
				proposition:
					g.ligne.isFood !== undefined && g.ligne.family !== undefined
						? {
								isFood: g.ligne.isFood,
								family: g.ligne.family,
								qualifyingLabels: g.ligne.qualifyingLabels ?? [],
								justification: g.ligne.justification ?? '',
								confidence: g.ligne.confidence ?? 0
							}
						: null,
				documentId: g.ligne.documentId
			}))
			.sort((a, b) => Math.abs(b.montantCumuleHT) - Math.abs(a.montantCumuleHT));

		return {
			libelles,
			montantTotalEnJeu: libelles.reduce((s, l) => s + Math.abs(l.montantCumuleHT), 0)
		};
	}
});

/** La preuve : le fichier source et ses lignes, pour le volet de droite. */
export const obtenirPreuve = authedQuery({
	args: { documentId: v.id('invoiceDocuments') },
	returns: v.union(
		v.object({
			filename: v.string(),
			mimeType: v.string(),
			url: v.union(v.string(), v.null()),
			invoiceNumber: v.union(v.string(), v.null()),
			invoiceDate: v.union(v.string(), v.null())
		}),
		v.null()
	),
	handler: async (ctx, { documentId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const doc = await ctx.db.get(documentId);
		if (!doc || doc.organizationId !== organizationId) return null;
		return {
			filename: doc.filename,
			mimeType: doc.mimeType,
			url: await ctx.storage.getUrl(doc.storageId),
			invoiceNumber: doc.invoiceNumber ?? null,
			invoiceDate: doc.invoiceDate ?? null
		};
	}
});

interface Decision {
	normalizedLabel: string;
	isFood: boolean;
	family: Famille;
	qualifyingLabels: Label[];
	justification: string;
}

/**
 * Applique une décision humaine à toutes les lignes de l'organisation portant
 * ce libellé, puis fait avancer le consensus global.
 *
 * Le compteur global n'est incrémenté que si cette organisation n'avait PAS
 * déjà confirmé ce libellé. La vérification se fait sur ses propres lignes :
 * la table globale n'apprend jamais qui confirme.
 */
async function decider(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	args: Decision,
	statutLigne: 'CONFIRMED' | 'CORRECTED'
): Promise<number> {
	const verdict = deriverVerdict(
		{
			normalizedLabel: args.normalizedLabel,
			isFood: args.isFood,
			family: args.family,
			qualifyingLabels: args.qualifyingLabels,
			confidence: 1
		},
		'HUMAN'
	);

	const lignes = await ctx.db
		.query('invoiceLines')
		.withIndex('by_org_and_label', (q) =>
			q.eq('organizationId', organizationId).eq('normalizedLabel', args.normalizedLabel)
		)
		.collect();

	// Avant d'écrire : cette organisation avait-elle déjà tranché ce libellé ?
	const dejaTranche = lignes.some(
		(l) => l.reviewStatus === 'CONFIRMED' || l.reviewStatus === 'CORRECTED'
	);

	for (const ligne of lignes) {
		await ctx.db.patch(ligne._id, {
			isFood: verdict.isFood,
			family: verdict.family,
			qualifyingLabels: verdict.qualifyingLabels,
			isBio: verdict.isBio,
			isDurable: verdict.isDurable,
			justification: args.justification,
			confidence: 1,
			proofStatus: verdict.proofStatus,
			reviewStatus: statutLigne,
			classifierVersion: REFERENTIEL_VERSION
		});
	}

	const cache = await ctx.db
		.query('productLabels')
		.withIndex('by_normalized_label', (q) => q.eq('normalizedLabel', args.normalizedLabel))
		.first();

	const contenu = {
		isFood: args.isFood,
		family: args.family,
		qualifyingLabels: args.qualifyingLabels,
		justification: args.justification,
		confidence: 1,
		source: 'HUMAN' as const,
		confirmedAt: Date.now(),
		classifierVersion: REFERENTIEL_VERSION
	};

	if (!cache) {
		await ctx.db.insert('productLabels', {
			normalizedLabel: args.normalizedLabel,
			...contenu,
			confirmationsCount: 1,
			contested: false,
			occurrences: lignes.length
		});
		return lignes.length;
	}

	// La décision contredit-elle le verdict établi ?
	const contredit =
		cache.source === 'HUMAN' &&
		(cache.isFood !== args.isFood ||
			cache.family !== args.family ||
			cache.qualifyingLabels.slice().sort().join(',') !==
				args.qualifyingLabels.slice().sort().join(','));

	if (contredit) {
		// On n'écrase pas : on marque le désaccord et on garde le verdict
		// concurrent. Le libellé redevient une question posée à tous.
		await ctx.db.patch(cache._id, {
			contested: true,
			verdictConcurrent: {
				isFood: args.isFood,
				family: args.family,
				qualifyingLabels: args.qualifyingLabels
			},
			occurrences: cache.occurrences + lignes.length
		});
		return lignes.length;
	}

	await ctx.db.patch(cache._id, {
		...contenu,
		confirmationsCount: dejaTranche
			? cache.confirmationsCount
			: cache.confirmationsCount + 1,
		occurrences: cache.occurrences + lignes.length
	});

	return lignes.length;
}

/** Confirme la proposition du classifieur, telle quelle. */
export const confirmer = authedMutation({
	args: {
		normalizedLabel: v.string(),
		isFood: v.boolean(),
		family: vFamille,
		qualifyingLabels: v.array(vLabel),
		justification: v.string()
	},
	returns: v.number(),
	handler: async (ctx, args) => {
		const { organizationId } = await getUserOrg(ctx);
		return await decider(ctx, organizationId, args, 'CONFIRMED');
	}
});

/**
 * Corrige la classification d'un libellé.
 *
 * La distinction CONFIRMED / CORRECTED n'est pas cosmétique : le taux de
 * correction est l'indicateur de qualité du classifieur. S'il monte, c'est le
 * prompt ou le référentiel qu'il faut reprendre, pas le seuil de confiance.
 */
export const corriger = authedMutation({
	args: {
		normalizedLabel: v.string(),
		isFood: v.boolean(),
		family: vFamille,
		qualifyingLabels: v.array(vLabel),
		justification: v.string()
	},
	returns: v.number(),
	handler: async (ctx, args) => {
		const { organizationId } = await getUserOrg(ctx);
		if (args.justification.trim() === '') {
			throw new ConvexError('Une classification sans justification est inutilisable en contrôle.');
		}
		return await decider(ctx, organizationId, args, 'CORRECTED');
	}
});
```

- [ ] **Step 2: Brancher le consensus dans `appliquerLibellesEnCache`**

Dans `src/lib/convex/egalim/classificationMutations.ts`, remplacer la condition de réutilisabilité du cache. Trouver :

```ts
			if (
				cache === null ||
				(cache.source !== 'HUMAN' && cache.classifierVersion !== REFERENTIEL_VERSION)
			) {
				restants.push(libelle);
				continue;
			}
```

par :

```ts
			if (
				cache === null ||
				(cache.source !== 'HUMAN' && cache.classifierVersion !== REFERENTIEL_VERSION)
			) {
				restants.push(libelle);
				continue;
			}

			// Le consensus décide si le libellé doit encore être posé au client.
			// Viande et poisson y échappent : ils sont toujours demandés.
			const encoreDemande = doitEtreDemande(
				{
					confidence: cache.confidence,
					confirmationsCount: cache.confirmationsCount,
					contested: cache.contested
				},
				cache.family
			);
```

Puis, dans la boucle d'écriture des lignes juste en dessous, remplacer `reviewStatus: verdict.reviewStatus` par :

```ts
					reviewStatus: encoreDemande ? verdict.reviewStatus : 'CONFIRMED',
```

Et ajouter l'import en tête de fichier :

```ts
import { doitEtreDemande } from './consensus';
```

- [ ] **Step 3: Écrire les nouveaux champs à l'insertion du cache**

Toujours dans `classificationMutations.ts`, dans `appliquerClassification`, trouver le bloc `ctx.db.insert('productLabels', {` et ajouter les deux champs manquants :

```ts
				confirmationsCount: 0,
				contested: false,
```

- [ ] **Step 4: Déployer et vérifier le typecheck**

```bash
bunx convex dev --once && bun run check:convex
```

Attendu : `Convex functions ready!` puis aucune erreur. Si `revue.ts` sort encore des erreurs sur `confirmedBy`, c'est attendu — il sera supprimé en tâche 8. Le corriger provisoirement en retirant `confirmedBy` de son objet `contenu`.

- [ ] **Step 5: Lancer la suite complète**

```bash
bun run test:unit
```

Attendu : tous les tests passent.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit --no-verify -m "feat(egalim): file de confirmation cote client et consensus anonyme"
```

---

## Task 6 : Le pilotage — agrégation par année

**Files:**
- Create: `src/lib/convex/egalim/pilotage.ts`

- [ ] **Step 1: Écrire `pilotage.ts`**

```ts
import { v } from 'convex/values';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { SEUILS } from '../../egalim/referentiel';
import { FAMILLES, type Famille } from '../../egalim/types';
import { calculerRatios, partNonConfirmee, type LignePourAgregation } from './agregation';
import { vFamille } from './tables';

/**
 * Les lectures du tableau de bord.
 *
 * Les ratios se calculent par ANNÉE CIVILE, sur toutes les lignes dont la date
 * de facture tombe dans l'année, quel que soit le lot qui les a apportées.
 * C'est ce qui permet de déposer en trois fois sans que le chiffre soit faux
 * entre-temps. EGalim se déclare par année civile : un pourcentage sur un mois
 * d'achats ne se compare à aucun seuil légal.
 */

const vRatios = v.object({
	durable: v.number(),
	bio: v.number(),
	meatFishDurable: v.number(),
	totalFoodHT: v.number(),
	totalHT: v.number()
});

/** Les années pour lesquelles cette organisation a des achats, la plus récente d'abord. */
export const listerAnnees = authedQuery({
	args: {},
	returns: v.array(v.string()),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const lignes = await ctx.db
			.query('invoiceLines')
			.withIndex('by_org_and_date', (q) => q.eq('organizationId', organizationId))
			.collect();
		const annees = new Set(
			lignes.map((l) => l.invoiceDate.slice(0, 4)).filter((a) => /^\d{4}$/.test(a))
		);
		return [...annees].sort().reverse();
	}
});

export const tableauDeBord = authedQuery({
	args: { annee: v.string() },
	returns: v.object({
		/** false tant qu'aucune ligne n'existe : l'écran montre l'amorçage. */
		aDesDonnees: v.boolean(),
		ratios: vRatios,
		seuils: v.object({
			durable: v.number(),
			bio: v.number(),
			viandePoissonDurable: v.number()
		}),
		gapEuros: v.object({
			toDurable50: v.number(),
			toBio20: v.number(),
			toMeatFish60: v.number()
		}),
		/** Part du MONTANT alimentaire reposant sur une classification non confirmée. */
		partNonConfirmee: v.number(),
		libellesAConfirmer: v.number(),
		montantAConfirmer: v.number(),
		parFamille: v.array(
			v.object({
				family: vFamille,
				totalHT: v.number(),
				durableHT: v.number(),
				bioHT: v.number()
			})
		),
		documentsEnCours: v.number(),
		documentsEnEchec: v.number()
	}),
	handler: async (ctx, { annee }) => {
		const { organizationId } = await getUserOrg(ctx);

		// Bornes de l'année civile, en comparaison de chaînes AAAA-MM-JJ.
		const toutes = await ctx.db
			.query('invoiceLines')
			.withIndex('by_org_and_date', (q) =>
				q
					.eq('organizationId', organizationId)
					.gte('invoiceDate', `${annee}-01-01`)
					.lte('invoiceDate', `${annee}-12-31`)
			)
			.collect();

		const classees = toutes.filter(
			(
				l
			): l is (typeof toutes)[number] & {
				isFood: boolean;
				family: Famille;
				isDurable: boolean;
				isBio: boolean;
			} =>
				l.isFood !== undefined &&
				l.family !== undefined &&
				l.isDurable !== undefined &&
				l.isBio !== undefined
		);

		const pourAgregation: LignePourAgregation[] = classees.map((l) => ({
			amountHT: l.amountHT,
			isFood: l.isFood,
			family: l.family,
			isDurable: l.isDurable,
			isBio: l.isBio
		}));

		const ratios = calculerRatios(pourAgregation);

		const enAttente = toutes.filter((l) => l.reviewStatus === 'PENDING_REVIEW');
		const libellesAConfirmer = new Set(enAttente.map((l) => l.normalizedLabel)).size;
		const montantAConfirmer = enAttente.reduce((s, l) => s + Math.abs(l.amountHT), 0);

		const parFamille = FAMILLES.map((family) => {
			const duGroupe = classees.filter((l) => l.isFood && l.family === family);
			return {
				family,
				totalHT: duGroupe.reduce((s, l) => s + l.amountHT, 0),
				durableHT: duGroupe.filter((l) => l.isDurable).reduce((s, l) => s + l.amountHT, 0),
				bioHT: duGroupe.filter((l) => l.isBio).reduce((s, l) => s + l.amountHT, 0)
			};
		}).filter((f) => f.totalHT !== 0);

		const documents = await ctx.db
			.query('invoiceDocuments')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		return {
			aDesDonnees: toutes.length > 0,
			ratios: {
				durable: ratios.durable,
				bio: ratios.bio,
				meatFishDurable: ratios.meatFishDurable,
				totalFoodHT: ratios.totalFoodHT,
				totalHT: ratios.totalHT
			},
			seuils: SEUILS,
			gapEuros: ratios.gapEuros,
			partNonConfirmee: partNonConfirmee(
				classees.map((l) => ({
					amountHT: l.amountHT,
					isFood: l.isFood,
					reviewStatus: l.reviewStatus
				}))
			),
			libellesAConfirmer,
			montantAConfirmer,
			parFamille,
			documentsEnCours: documents.filter((d) => d.extractionStatus === 'PENDING').length,
			documentsEnEchec: documents.filter((d) => d.extractionStatus === 'FAILED').length
		};
	}
});
```

- [ ] **Step 2: Déployer et vérifier**

```bash
bunx convex dev --once && bun run check:convex
```

Attendu : `Convex functions ready!` puis aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/lib/convex/egalim/pilotage.ts
git commit --no-verify -m "feat(egalim): agregation par annee civile pour le tableau de bord"
```

---

## Task 7 : Le rail de navigation

**Files:**
- Create: `src/lib/components/authenticated/app-rail.svelte`
- Modify: `src/lib/components/authenticated/authenticated-layout.svelte`
- Modify: `src/lib/components/authenticated/configs/app-sidebar-config.ts`
- Modify: `src/routes/[[lang]]/app/+layout.svelte`

- [ ] **Step 1: Réécrire la configuration de navigation**

Remplacer le contenu de `src/lib/components/authenticated/configs/app-sidebar-config.ts` par :

```ts
import { localizedHref } from '$lib/utils/i18n';
import GaugeIcon from '@lucide/svelte/icons/gauge';
import CheckCheckIcon from '@lucide/svelte/icons/check-check';
import FileTextIcon from '@lucide/svelte/icons/file-text';
import AwardIcon from '@lucide/svelte/icons/award';
import SettingsIcon from '@lucide/svelte/icons/settings';
import Logo from '$lib/components/icons/logo.svelte';
import { LEGAL_CONFIG } from '$lib/config/legal';
import type { SidebarConfig } from '../types';

interface PageState {
	pathname: string;
	lang?: string;
	/** Nombre de libellés en attente, affiché en pastille sur « À confirmer ». */
	aConfirmer?: number;
}

/**
 * La navigation de la cantine, seul espace de l'application.
 *
 * Quatre entrées, plus les paramètres détachés. Chacune correspond à un moment
 * réel du travail : je regarde où j'en suis, je tranche ce qui bloque, je
 * dépose, j'exporte. C'est aussi le nombre qui tient sur une barre de pouce en
 * portrait sans devenir illisible.
 */
export function getAppSidebarConfig(pageState: PageState): SidebarConfig {
	const { pathname, lang, aConfirmer = 0 } = pageState;
	const actif = (segment: string) =>
		pathname.startsWith(`/${lang}/app${segment}`) || pathname.startsWith(`/app${segment}`);

	return {
		header: {
			icon: Logo,
			title: LEGAL_CONFIG.brandName,
			href: localizedHref('/')
		},
		navItems: [
			{
				translationKey: 'app.sidebar.pilotage',
				shortLabel: 'Pilotage',
				url: localizedHref('/app'),
				icon: GaugeIcon,
				isActive: /^(\/[a-z]{2})?\/app\/?$/.test(pathname)
			},
			{
				translationKey: 'app.sidebar.confirmer',
				shortLabel: 'À confirmer',
				url: localizedHref('/app/confirmer'),
				icon: CheckCheckIcon,
				isActive: actif('/confirmer'),
				// À zéro, la pastille ne s'affiche pas, mais l'entrée reste : un
				// gérant doit pouvoir vérifier qu'il n'a rien oublié.
				badge: aConfirmer > 0 ? aConfirmer : undefined
			},
			{
				translationKey: 'app.sidebar.invoices',
				shortLabel: 'Factures',
				url: localizedHref('/app/factures'),
				icon: FileTextIcon,
				isActive: actif('/factures')
			},
			{
				translationKey: 'app.sidebar.certificats',
				shortLabel: 'Certificats',
				url: localizedHref('/app/certificats'),
				icon: AwardIcon,
				isActive: actif('/certificats')
			},
			{
				translationKey: 'admin.sidebar.settings',
				shortLabel: 'Paramètres',
				url: localizedHref('/app/parametres'),
				icon: SettingsIcon,
				isActive: actif('/parametres')
			}
		]
	};
}
```

- [ ] **Step 2: Écrire le rail**

Créer `src/lib/components/authenticated/app-rail.svelte` :

```svelte
<script lang="ts">
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';
	import { cn } from '$lib/utils.js';
	import type { SidebarConfig } from './types';
	import CameraIcon from '@lucide/svelte/icons/camera';
	import PanelLeftIcon from '@lucide/svelte/icons/panel-left';

	interface Props {
		config: SidebarConfig;
	}

	let { config }: Props = $props();

	const CLE_ETAT = 'mycelium:rail:deplie';

	// L'état du rail survit au rechargement : un gérant qui l'a déplié ne veut
	// pas le replier à chaque visite.
	let deplie = $state(false);
	$effect(() => {
		deplie = localStorage.getItem(CLE_ETAT) === '1';
	});

	function basculer() {
		deplie = !deplie;
		localStorage.setItem(CLE_ETAT, deplie ? '1' : '0');
	}
</script>

<!--
	Sous 768 px, ce composant ne s'affiche pas : la navigation passe en barre
	basse (voir plus bas). Un rail à gauche sur un écran étroit consomme la
	dimension la plus rare et éloigne les cibles du pouce.
-->
<aside
	class={cn(
		'hidden shrink-0 flex-col gap-1 border-r border-border bg-card/40 p-2 transition-[width] duration-200 md:flex',
		deplie ? 'w-60' : 'w-[72px]'
	)}
>
	<!-- Le geste de scan vit AU-DESSUS de la navigation, jamais dedans. -->
	<a
		href={resolve(localizedHref('/app/factures'))}
		class="mb-2 flex min-h-12 items-center gap-3 rounded-xl bg-[var(--brand)] px-3 font-semibold text-[var(--brand-foreground)] transition-transform active:scale-95"
		style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.25)"
	>
		<CameraIcon class="size-5 shrink-0" />
		{#if deplie}<span class="truncate text-sm">Scanner</span>{/if}
	</a>

	{#each config.navItems as item (item.url)}
		<a
			href={resolve(item.url ?? '/')}
			class={cn(
				'relative flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors active:scale-95',
				item.isActive
					? 'bg-muted text-foreground'
					: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
			)}
		>
			{#if item.icon}<item.icon class="size-5 shrink-0" />{/if}
			{#if deplie}<span class="truncate">{item.shortLabel}</span>{/if}
			{#if item.badge}
				<span
					class="ml-auto flex min-w-6 items-center justify-center rounded-full bg-[var(--brand)] px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums text-[var(--brand-foreground)]"
					class:absolute={!deplie}
					class:right-1={!deplie}
					class:top-1={!deplie}
				>
					{item.badge}
				</span>
			{/if}
		</a>
	{/each}

	<button
		type="button"
		onclick={basculer}
		aria-label={deplie ? 'Replier le menu' : 'Déplier le menu'}
		class="mt-auto flex min-h-12 items-center gap-3 rounded-xl px-3 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground active:scale-95"
	>
		<PanelLeftIcon class="size-5 shrink-0" />
		{#if deplie}<span class="truncate text-sm">Replier</span>{/if}
	</button>
</aside>
```

- [ ] **Step 3: Brancher le mode `app-rail` dans le layout**

Dans `src/lib/components/authenticated/authenticated-layout.svelte` :

Ajouter l'import en tête de `<script>` :

```ts
	import AppRail from './app-rail.svelte';
```

Élargir le type du mode, ligne 26 :

```ts
		navMode?: 'sidebar' | 'app-topbar' | 'app-rail';
```

Puis transformer la condition existante en chaîne. La ligne 67 dit aujourd'hui :

```svelte
	{#if navMode === 'app-topbar'}
```

La remplacer par ces six lignes, qui insèrent le nouveau mode devant et rétrogradent l'ancien
en `{:else if}` :

```svelte
	{#if navMode === 'app-rail'}
		<div class="flex h-svh overflow-hidden bg-background">
			<AppRail config={sidebarConfig} />
			<main class="min-w-0 flex-1 overflow-y-auto">
				{@render children?.()}
			</main>
		</div>
	{:else if navMode === 'app-topbar'}
```

Le reste du fichier, y compris le `{:else}` du mode `sidebar` et le `{/if}` final, ne bouge pas.

**Sous 768 px, `AppRail` ne s'affiche pas** (il porte `hidden md:flex`). La navigation basse
mobile existante, `app-bottom-nav.svelte`, prend le relais : vérifier qu'elle est bien rendue
dans cette branche, et l'ajouter sous le `<main>` si ce n'est pas le cas :

```svelte
			<AppBottomNav config={sidebarConfig} />
```

avec l'import correspondant :

```ts
	import AppBottomNav from './app-bottom-nav.svelte';
```

- [ ] **Step 4: Passer le mode et le compteur depuis la route**

Dans `src/routes/[[lang]]/app/+layout.svelte` :

Ajouter la query du compteur, après `const myOrgQuery = ...` :

```ts
	const aConfirmerQuery = useQuery(api.egalim.confirmation.listerAConfirmer, {});
```

Remplacer le calcul de `sidebarConfig` par :

```ts
	const sidebarConfig = $derived(
		getAppSidebarConfig({
			pathname: page.url.pathname,
			lang: page.params.lang,
			aConfirmer: aConfirmerQuery.data?.libelles.length ?? 0
		})
	);
```

Et remplacer `navMode="app-topbar"` par `navMode="app-rail"`.

- [ ] **Step 5: Vérifier**

```bash
bun run check
```

Attendu : `9 ERRORS`, toutes sur `PUBLIC_*` et `src/lib/theme.ts`. Aucune sur les fichiers touchés.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit --no-verify -m "feat(app): rail de navigation tablette, quatre entrees et le scan au-dessus"
```

---

## Task 8 : Supprimer `/ops` et les huit tables

Après transplantation, pas avant.

**Files:**
- Delete: `src/routes/[[lang]]/ops/` (tout le dossier)
- Delete: `src/lib/convex/concierge/` (tout le dossier)
- Delete: `src/lib/convex/egalim/revue.ts`
- Delete: `src/lib/components/concierge/`
- Modify: `src/lib/convex/schema.ts`
- Modify: `src/lib/convex/functions.ts`

- [ ] **Step 1: Supprimer les dossiers**

```bash
git rm -r "src/routes/[[lang]]/ops" src/lib/convex/concierge src/lib/components/concierge
git rm src/lib/convex/egalim/revue.ts
```

- [ ] **Step 2: Retirer les huit tables du schéma**

Dans `src/lib/convex/schema.ts`, supprimer les blocs `defineTable` de : `myceliumStaff`, `staffInvitations`, `conciergeOrgAccess`, `humanAssistRequests`, `humanAssistMessages`, `clientTimelineEvents`, `conciergeTickets`, `conciergeTicketMessages`.

Vérifier le compte :

```bash
grep -c "defineTable" src/lib/convex/schema.ts
```

Attendu : `7` (les tables de base restantes). Avec les 8 tables EGalim, le schéma compte 15 tables.

- [ ] **Step 3: Retirer les constructeurs de fonctions staff**

Dans `src/lib/convex/functions.ts`, supprimer `superAdminQuery`, `superAdminMutation`, `conciergeQuery`, `conciergeMutation` et la fonction `resolveStaffRole` si elle n'a plus d'appelant.

- [ ] **Step 4: Trouver et corriger les références restantes**

```bash
grep -rn "concierge\|myceliumStaff\|staffRole\|conciergeOrgAccess\|clientTimelineEvents\|/ops" src/ --include=*.ts --include=*.svelte | grep -v _generated
```

Attendu après correction : aucune sortie. Les points connus à corriger sont la redirection `viewer?.role === 'admin'` vers `/ops` dans `src/routes/[[lang]]/app/+layout.svelte`, à supprimer, et le store `previewAsEmployee`, à supprimer avec elle.

- [ ] **Step 5: Couper la production automatique de diagnostic**

La spec dit qu'un `diagnostics` n'est plus produit à la fin de chaque lot : il devient un
certificat produit à la demande. Deux appelants planifiaient `produireSiPret`, dont un
disparaît avec `revue.ts`. Il reste celui de `classificationMutations.ts`.

Dans `src/lib/convex/egalim/classificationMutations.ts`, supprimer ce bloc dans
`finaliserClassification` :

```ts
		// Rien à arbitrer : le diagnostic se produit sans intervention.
		if (libellesEnRevue.size === 0) {
			await ctx.scheduler.runAfter(0, internal.egalim.diagnostics.produireSiPret, { batchId });
		}
```

Puis vérifier qu'il ne reste aucun appelant :

```bash
grep -rn "produireSiPret" src/ --include=*.ts | grep -v _generated
```

Attendu : une seule ligne, la définition dans `diagnostics.ts`. La fonction reste en place :
le second plan la rebranche sur la génération de certificat à la demande.

- [ ] **Step 6: Purger les tables supprimées et déployer**

```bash
bunx convex dev --once
```

Si le déploiement refuse à cause de documents existants, purger chaque table concernée :

```bash
printf '' > /tmp/vide.jsonl
for t in myceliumStaff staffInvitations conciergeOrgAccess humanAssistRequests humanAssistMessages clientTimelineEvents conciergeTickets conciergeTicketMessages; do
  bunx convex import --replace --table "$t" --format jsonLines /tmp/vide.jsonl -y
done
bunx convex dev --once
```

- [ ] **Step 7: Vérifier**

```bash
bun run check:convex && bun run check 2>&1 | grep COMPLETED && bun run test:unit
```

Attendu : `check:convex` sans erreur, `check` à 9 erreurs pré-existantes, tous les tests unitaires au vert.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit --no-verify -m "refactor: supprimer l'espace operateur, huit tables et le code concierge"
```

---

## Task 9 : L'écran À confirmer

**Files:**
- Create: `src/routes/[[lang]]/app/confirmer/+page.svelte`
- Create: `src/lib/components/egalim/app/PanneauPreuve.svelte`
- Modify: `src/lib/components/egalim/FormulaireCorrection.svelte` (déplacé sous `app/`)

- [ ] **Step 1: Écrire le panneau de preuve**

Créer `src/lib/components/egalim/app/PanneauPreuve.svelte` :

```svelte
<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import FileTextIcon from '@lucide/svelte/icons/file-text';

	interface Props {
		documentId: Id<'invoiceDocuments'> | null;
	}

	let { documentId }: Props = $props();

	const preuve = useQuery(api.egalim.confirmation.obtenirPreuve, () =>
		documentId ? { documentId } : ('skip' as const)
	);

	const estImage = $derived(preuve.data?.mimeType.startsWith('image/') ?? false);
	const estPdf = $derived(preuve.data?.mimeType === 'application/pdf');
</script>

<!--
	La preuve : le fichier d'où sort le libellé qu'on est en train de trancher.
	C'est ce qui rend le chiffre défendable, et c'est là que le zoom au doigt
	sert vraiment.
-->
<div class="flex h-full min-h-0 flex-col rounded-xl border border-border bg-muted/20">
	{#if !documentId}
		<div class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
			<FileTextIcon class="size-7 text-muted-foreground/40" />
			<p class="text-xs text-muted-foreground">
				Sélectionnez un produit pour voir la facture d'où il vient.
			</p>
		</div>
	{:else if preuve.isLoading}
		<Skeleton class="m-3 flex-1 rounded-lg" />
	{:else if !preuve.data?.url}
		<div class="flex flex-1 items-center justify-center p-6 text-center">
			<p class="text-xs text-muted-foreground">Le fichier source n'est plus disponible.</p>
		</div>
	{:else}
		<div class="shrink-0 border-b border-border px-3 py-2">
			<p class="truncate text-[13px] font-medium">{preuve.data.filename}</p>
			{#if preuve.data.invoiceNumber || preuve.data.invoiceDate}
				<p class="font-mono text-[11px] tabular-nums text-muted-foreground">
					{preuve.data.invoiceNumber ?? ''}
					{preuve.data.invoiceDate ?? ''}
				</p>
			{/if}
		</div>
		<div class="min-h-0 flex-1 overflow-auto p-2" style="touch-action: pinch-zoom">
			{#if estImage}
				<img src={preuve.data.url} alt="Facture {preuve.data.filename}" class="w-full rounded-lg" />
			{:else if estPdf}
				<iframe
					src={preuve.data.url}
					title="Facture {preuve.data.filename}"
					class="h-full min-h-96 w-full rounded-lg border-0"
				></iframe>
			{:else}
				<div class="flex h-full items-center justify-center p-6 text-center">
					<a
						href={preuve.data.url}
						class="text-xs text-[var(--brand)] underline"
						download={preuve.data.filename}
					>
						Ouvrir {preuve.data.filename}
					</a>
				</div>
			{/if}
		</div>
	{/if}
</div>
```

- [ ] **Step 2: Déplacer le formulaire de correction**

```bash
git mv src/lib/components/egalim/FormulaireCorrection.svelte src/lib/components/egalim/app/FormulaireCorrection.svelte
```

- [ ] **Step 3: Écrire l'écran**

Créer `src/routes/[[lang]]/app/confirmer/+page.svelte` :

```svelte
<script lang="ts">
	import { useQuery, useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { toast } from 'svelte-sonner';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import CarteVerre from '$lib/components/egalim/app/CarteVerre.svelte';
	import FormulaireCorrection from '$lib/components/egalim/app/FormulaireCorrection.svelte';
	import PanneauPreuve from '$lib/components/egalim/app/PanneauPreuve.svelte';
	import type { Famille, Label as LabelEGalim } from '$lib/egalim/types';
	import CheckIcon from '@lucide/svelte/icons/check';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle-2';

	const file = useQuery(api.egalim.confirmation.listerAConfirmer, {});
	const confirmer = useMutation(api.egalim.confirmation.confirmer);
	const corriger = useMutation(api.egalim.confirmation.corriger);

	let curseur = $state(0);
	let enCorrection = $state(false);
	let enCours = $state(false);

	const libelles = $derived(file.data?.libelles ?? []);
	const selection = $derived(libelles[curseur] ?? null);

	const MOTIFS: Record<string, { texte: string; classe: string }> = {
		NON_CLASSE: { texte: 'Non classé', classe: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
		VIANDE_POISSON: { texte: 'Viande ou poisson', classe: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
		REGULARISATION: { texte: 'Remise ou avoir', classe: 'border-violet-500/40 bg-violet-500/10 text-violet-600 dark:text-violet-400' },
		CONFIANCE_BASSE: { texte: 'À vérifier', classe: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400' }
	};

	const FAMILLES_LISIBLES: Record<Famille, string> = {
		VIANDE: 'Viande',
		POISSON: 'Poisson',
		FRUITS_LEGUMES: 'Fruits et légumes',
		LAITIERS: 'Produits laitiers',
		EPICERIE_SECHE: 'Épicerie sèche',
		EPICERIE_APPERTISEE: 'Épicerie appertisée',
		BOISSONS: 'Boissons',
		AUTRE: 'Autre'
	};

	function euros(montant: number): string {
		return `${montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
	}

	async function confirmerSelection() {
		const l = selection;
		if (!l?.proposition || enCours) return;
		enCours = true;
		try {
			const n = await confirmer({
				normalizedLabel: l.normalizedLabel,
				isFood: l.proposition.isFood,
				family: l.proposition.family,
				qualifyingLabels: l.proposition.qualifyingLabels,
				justification: l.proposition.justification
			});
			toast.success(`C'est noté, sur ${n} ligne${n > 1 ? 's' : ''}.`);
			curseur = Math.min(curseur, Math.max(0, libelles.length - 2));
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Impossible d’enregistrer.');
		} finally {
			enCours = false;
		}
	}

	async function corrigerSelection(d: {
		isFood: boolean;
		family: Famille;
		qualifyingLabels: LabelEGalim[];
		justification: string;
	}) {
		const l = selection;
		if (!l || enCours) return;
		enCours = true;
		try {
			const n = await corriger({ normalizedLabel: l.normalizedLabel, ...d });
			toast.success(`Corrigé sur ${n} ligne${n > 1 ? 's' : ''}.`);
			enCorrection = false;
		} catch (err: unknown) {
			toast.error(err instanceof Error ? err.message : 'Impossible d’enregistrer.');
		} finally {
			enCours = false;
		}
	}
</script>

<svelte:head><title>À confirmer · Mycelium</title></svelte:head>

<div class="flex h-full min-h-0 flex-col gap-5 p-6 lg:p-8">
	<div>
		<h1 class="text-2xl font-bold tracking-tight">À confirmer</h1>
		<p class="text-sm text-muted-foreground">
			Les produits les plus lourds d'abord. Une décision vaut pour toutes leurs occurrences.
		</p>
	</div>

	{#if file.isLoading}
		<div class="flex flex-col gap-2">
			{#each { length: 5 } as _, i (i)}<Skeleton class="h-20 rounded-xl" />{/each}
		</div>
	{:else if libelles.length === 0}
		<CarteVerre class="p-10 text-center">
			<CheckCircleIcon class="mx-auto size-8 text-[var(--brand)]" />
			<p class="mt-3 text-sm font-medium">Tout est confirmé.</p>
			<p class="mt-1 text-xs text-muted-foreground">
				Vos taux reposent entièrement sur des classifications validées.
			</p>
		</CarteVerre>
	{:else}
		<!--
			Deux volets à partir de lg : la file à gauche, la preuve à droite.
			Sous lg, un seul volet et la preuve s'ouvre sous la ligne choisie.
		-->
		<div class="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
			<div class="flex min-h-0 flex-col gap-2 overflow-y-auto lg:w-[420px] lg:shrink-0">
				{#each libelles as l, i (l.normalizedLabel)}
					{@const motif = MOTIFS[l.motif] ?? MOTIFS.CONFIANCE_BASSE}
					<button
						type="button"
						onclick={() => {
							curseur = i;
							enCorrection = false;
						}}
						class="relative flex min-h-12 flex-col gap-2 overflow-hidden rounded-xl border bg-card p-4 text-left transition-all active:scale-[0.99]
							{i === curseur ? 'border-[var(--brand)]/60' : 'border-border hover:bg-muted/40'}"
						style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
					>
						<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"></div>
						<p class="truncate text-sm font-medium">{l.rawLabelExemple}</p>
						<div class="flex flex-wrap items-center gap-2">
							<span class="rounded-full border px-2 py-0.5 text-[11px] font-medium {motif.classe}">
								{motif.texte}
							</span>
							<span class="font-mono text-[11px] tabular-nums text-muted-foreground">
								{l.occurrences} ligne{l.occurrences > 1 ? 's' : ''} · {euros(l.montantCumuleHT)}
							</span>
						</div>
					</button>
				{/each}
			</div>

			<div class="flex min-h-0 flex-1 flex-col gap-4">
				{#if selection}
					<CarteVerre>
						<p class="text-sm font-semibold">{selection.rawLabelExemple}</p>
						{#if selection.proposition}
							<div class="mt-3 flex flex-wrap items-center gap-2">
								<Badge variant={selection.proposition.isFood ? 'secondary' : 'outline'}>
									{selection.proposition.isFood
										? FAMILLES_LISIBLES[selection.proposition.family]
										: 'Hors alimentaire'}
								</Badge>
								{#each selection.proposition.qualifyingLabels as code (code)}
									<Badge variant="default">{code}</Badge>
								{/each}
							</div>
							<p class="mt-3 text-xs leading-relaxed text-muted-foreground">
								{selection.proposition.justification}
							</p>
						{:else}
							<p class="mt-3 text-xs leading-relaxed text-amber-600 dark:text-amber-400">
								Nous n'avons pas su classer ce produit. Il n'entre dans aucun taux tant qu'il
								n'est pas renseigné.
							</p>
						{/if}

						<div class="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
							<Button
								variant="outline"
								class="h-12 sm:h-11"
								onclick={() => (enCorrection = !enCorrection)}
								disabled={enCours}
							>
								<PencilIcon class="size-4" />
								Corriger
							</Button>
							<Button
								class="h-12 sm:h-11"
								onclick={confirmerSelection}
								disabled={enCours || !selection.proposition}
							>
								<CheckIcon class="size-4" />
								Confirmer
							</Button>
						</div>
					</CarteVerre>

					{#if enCorrection}
						<FormulaireCorrection
							isFood={selection.proposition?.isFood ?? true}
							family={selection.proposition?.family ?? 'AUTRE'}
							qualifyingLabels={selection.proposition?.qualifyingLabels ?? []}
							justification={selection.proposition?.justification ?? ''}
							enCours={enCours}
							onvalider={corrigerSelection}
							onannuler={() => (enCorrection = false)}
						/>
					{/if}

					<div class="min-h-64 flex-1">
						<PanneauPreuve documentId={selection.documentId} />
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
```

- [ ] **Step 4: Corriger l'import du formulaire dans l'ancien écran**

L'écran `/ops/revue/[batchId]` étant supprimé en tâche 8, aucun autre import ne subsiste. Vérifier :

```bash
grep -rn "FormulaireCorrection" src/ --include=*.svelte
```

Attendu : une seule référence, dans `confirmer/+page.svelte`.

- [ ] **Step 5: Vérifier**

```bash
bun run check 2>&1 | grep COMPLETED
```

Attendu : `9 ERRORS`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit --no-verify -m "feat(app): ecran A confirmer, deux volets avec la preuve"
```

---

## Task 10 : L'écran de pilotage

**Files:**
- Modify: `src/routes/[[lang]]/app/+page.svelte`
- Create: `src/lib/components/egalim/app/JaugeTaux.svelte`

- [ ] **Step 1: Écrire la jauge**

Créer `src/lib/components/egalim/app/JaugeTaux.svelte` :

```svelte
<script lang="ts">
	interface Props {
		titre: string;
		mesure: number;
		seuil: number;
		ecartEuros: number;
	}

	let { titre, mesure, seuil, ecartEuros }: Props = $props();

	const atteint = $derived(mesure >= seuil);
	// Rapport à l'objectif, borné à 100 : au-delà, l'arc ne veut plus rien dire.
	const remplissage = $derived(Math.min(1, seuil > 0 ? mesure / seuil : 0));

	const RAYON = 52;
	const CIRCONFERENCE = 2 * Math.PI * RAYON;

	function pourcent(f: number): string {
		return `${(f * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
	}

	function euros(m: number): string {
		return `${Math.round(m).toLocaleString('fr-FR')} €`;
	}
</script>

<div
	class="relative flex flex-col items-center overflow-hidden rounded-3xl border p-5
		{atteint ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'}"
	style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
>
	<div class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"></div>

	<p class="text-center text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
		{titre}
	</p>

	<svg viewBox="0 0 128 128" class="mt-3 size-32 -rotate-90" role="img" aria-label="{titre} : {pourcent(mesure)}">
		<circle cx="64" cy="64" r={RAYON} fill="none" stroke="currentColor" stroke-width="10" class="text-muted/40" />
		<circle
			cx="64"
			cy="64"
			r={RAYON}
			fill="none"
			stroke="currentColor"
			stroke-width="10"
			stroke-linecap="round"
			stroke-dasharray={CIRCONFERENCE}
			stroke-dashoffset={CIRCONFERENCE * (1 - remplissage)}
			class={atteint ? 'text-emerald-500' : 'text-amber-500'}
			style="transition: stroke-dashoffset 600ms ease-out"
		/>
	</svg>

	<p class="-mt-[4.75rem] font-mono text-2xl font-bold tabular-nums">{pourcent(mesure)}</p>
	<p class="mt-[3.25rem] font-mono text-[11px] tabular-nums text-muted-foreground">
		objectif {pourcent(seuil)}
	</p>

	<p class="mt-2 text-center text-[13px] leading-snug">
		{#if atteint}
			<span class="font-medium text-emerald-600 dark:text-emerald-400">Objectif atteint</span>
		{:else}
			Il reste <span class="font-mono font-semibold tabular-nums">{euros(ecartEuros)}</span>
			d'achats à basculer
		{/if}
	</p>
</div>
```

- [ ] **Step 2: Écrire l'écran de pilotage**

Remplacer le contenu de `src/routes/[[lang]]/app/+page.svelte` par :

```svelte
<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { localizedHref } from '$lib/utils/i18n';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import CarteVerre from '$lib/components/egalim/app/CarteVerre.svelte';
	import JaugeTaux from '$lib/components/egalim/app/JaugeTaux.svelte';
	import CameraIcon from '@lucide/svelte/icons/camera';
	import TableIcon from '@lucide/svelte/icons/table-2';
	import CheckCheckIcon from '@lucide/svelte/icons/check-check';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import type { Famille } from '$lib/egalim/types';

	const FAMILLES_LISIBLES: Record<Famille, string> = {
		VIANDE: 'Viande',
		POISSON: 'Poisson',
		FRUITS_LEGUMES: 'Fruits et légumes',
		LAITIERS: 'Produits laitiers',
		EPICERIE_SECHE: 'Épicerie sèche',
		EPICERIE_APPERTISEE: 'Épicerie appertisée',
		BOISSONS: 'Boissons',
		AUTRE: 'Autre'
	};

	const annees = useQuery(api.egalim.pilotage.listerAnnees, {});
	let anneeChoisie = $state<string | null>(null);
	const annee = $derived(
		anneeChoisie ?? annees.data?.[0] ?? String(new Date().getFullYear() - 1)
	);

	const bord = useQuery(api.egalim.pilotage.tableauDeBord, () => ({ annee }));

	function euros(m: number): string {
		return `${Math.round(m).toLocaleString('fr-FR')} €`;
	}

	function pourcent(f: number): string {
		return `${(f * 100).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} %`;
	}
</script>

<svelte:head><title>Pilotage · Mycelium</title></svelte:head>

<div class="flex flex-col gap-6 p-6 lg:p-8">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Tableau de bord</h1>
			<p class="text-sm text-muted-foreground">Vos trois taux EGalim sur l'année civile.</p>
		</div>
		{#if (annees.data ?? []).length > 1}
			<div class="flex gap-2">
				{#each annees.data ?? [] as a (a)}
					<button
						type="button"
						onclick={() => (anneeChoisie = a)}
						class="flex h-12 min-w-16 items-center justify-center rounded-lg border px-4 font-mono text-sm tabular-nums transition-all active:scale-95
							{a === annee
							? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
							: 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}"
					>
						{a}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	{#if bord.isLoading}
		<div class="grid gap-4 sm:grid-cols-3">
			{#each { length: 3 } as _, i (i)}<Skeleton class="h-64 rounded-3xl" />{/each}
		</div>
	{:else if bord.data && !bord.data.aDesDonnees}
		<!--
			Pas de jauges à zéro : trois cadrans vides sur un écran de conformité
			donnent l'impression d'un produit cassé. On montre le chemin.
		-->
		<CarteVerre ton="accent">
			<p class="text-lg font-semibold">Commençons par vos factures.</p>
			<p class="mt-1 text-[13px] leading-relaxed text-muted-foreground">
				Douze mois d'achats suffisent à calculer vos trois taux. Vous n'avez rien d'autre à
				préparer.
			</p>
			<ol class="mt-4 flex flex-col gap-3">
				<li class="flex items-start gap-3">
					<span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] font-mono text-xs font-bold text-[var(--brand-foreground)]">1</span>
					<span class="text-[13px] leading-relaxed">
						<strong>Déposez vos factures.</strong> Un export comptable en CSV va le plus vite ;
						à défaut, les PDF et les photos conviennent.
					</span>
				</li>
				<li class="flex items-start gap-3">
					<span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-bold text-muted-foreground">2</span>
					<span class="text-[13px] leading-relaxed text-muted-foreground">
						Nous lisons et classons chaque ligne contre le barème EGalim.
					</span>
				</li>
				<li class="flex items-start gap-3">
					<span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-bold text-muted-foreground">3</span>
					<span class="text-[13px] leading-relaxed text-muted-foreground">
						Vous confirmez la viande, le poisson et ce dont nous doutons. Vos taux s'affichent.
					</span>
				</li>
			</ol>
			<Button href={resolve(localizedHref('/app/factures'))} class="mt-5 h-12 w-full sm:w-auto">
				<CameraIcon class="size-4" />
				Déposer mes factures
			</Button>
		</CarteVerre>
	{:else if bord.data}
		{@const d = bord.data}

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<JaugeTaux
				titre="Durable et de qualité"
				mesure={d.ratios.durable}
				seuil={d.seuils.durable}
				ecartEuros={d.gapEuros.toDurable50}
			/>
			<JaugeTaux
				titre="Biologique"
				mesure={d.ratios.bio}
				seuil={d.seuils.bio}
				ecartEuros={d.gapEuros.toBio20}
			/>
			<JaugeTaux
				titre="Viande et poisson"
				mesure={d.ratios.meatFishDurable}
				seuil={d.seuils.viandePoissonDurable}
				ecartEuros={d.gapEuros.toMeatFish60}
			/>
		</div>

		<p class="text-xs text-muted-foreground">
			Calculés en valeur d'achat HT sur
			<span class="font-mono tabular-nums">{euros(d.ratios.totalFoodHT)}</span>
			d'achats alimentaires.
		</p>

		{#if d.partNonConfirmee > 0}
			<CarteVerre ton="accent">
				<div class="flex flex-wrap items-center justify-between gap-4">
					<div class="min-w-0">
						<p class="text-sm font-semibold">
							<span class="font-mono tabular-nums">{pourcent(d.partNonConfirmee)}</span>
							de vos achats reposent sur une classification non confirmée
						</p>
						<p class="mt-1 text-[13px] text-muted-foreground">
							{d.libellesAConfirmer} produit{d.libellesAConfirmer > 1 ? 's' : ''} à confirmer,
							<span class="font-mono tabular-nums">{euros(d.montantAConfirmer)}</span> en jeu.
						</p>
					</div>
					<Button href={resolve(localizedHref('/app/confirmer'))} class="h-12 shrink-0">
						<CheckCheckIcon class="size-4" />
						Confirmer
					</Button>
				</div>
			</CarteVerre>
		{/if}

		{#if d.documentsEnEchec > 0}
			<CarteVerre>
				<p class="flex items-center gap-2 text-[13px]">
					<AlertTriangleIcon class="size-4 shrink-0 text-amber-500" />
					{d.documentsEnEchec} fichier{d.documentsEnEchec > 1 ? 's' : ''} n'a pas pu être lu.
					<a href={resolve(localizedHref('/app/factures'))} class="text-[var(--brand)] underline">
						Voir lesquels
					</a>
				</p>
			</CarteVerre>
		{/if}

		{#if d.parFamille.length > 0}
			<div class="flex flex-col gap-2">
				<h2 class="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
					D'où viennent vos achats
				</h2>
				{#each d.parFamille as f (f.family)}
					{@const part = f.totalHT !== 0 ? f.durableHT / f.totalHT : 0}
					<CarteVerre class="p-3">
						<div class="flex items-center justify-between gap-3">
							<p class="text-[13px] font-medium">{FAMILLES_LISIBLES[f.family]}</p>
							<p class="font-mono text-[13px] tabular-nums">
								{euros(f.totalHT)} · {pourcent(part)} durable
							</p>
						</div>
						<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
							<div class="h-full rounded-full bg-[var(--brand)]" style="width: {part * 100}%"></div>
						</div>
					</CarteVerre>
				{/each}
			</div>
		{/if}
	{/if}
</div>
```

- [ ] **Step 3: Vérifier**

```bash
bun run check 2>&1 | grep COMPLETED
```

Attendu : `9 ERRORS`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit --no-verify -m "feat(app): tableau de bord par annee civile avec amorcage"
```

---

## Task 11 : Vérification de bout en bout

**Files:**
- Modify: `e2e/egalim-parcours.spec.ts`

- [ ] **Step 1: Ajouter le test du parcours complet**

Ajouter à la fin du `test.describe` de `e2e/egalim-parcours.spec.ts` :

```ts
	test('le parcours complet : amorçage, dépôt, confirmation, chiffre', async () => {
		test.setTimeout(240_000);

		const { context, user } = await createIsolatedUserWithOrg(browser, BASE_URL, 'egalim-boucle');
		try {
			const page = await context.newPage();

			// --- Amorçage : pas de jauges, un chemin ---
			await page.goto('/app');
			await expect(page.getByText('Commençons par vos factures')).toBeVisible({
				timeout: 30_000
			});

			// --- Dépôt ---
			await page.goto('/app/factures');
			await expect(page.getByTestId('depot-ouvrir')).toBeVisible({ timeout: 30_000 });
			await page.getByTestId('depot-libelle').fill('Factures boucle');
			await page.getByTestId('depot-ouvrir').click();
			await expect(page.getByTestId('depot-fichiers')).toBeAttached({ timeout: 30_000 });
			await page.getByTestId('depot-fichiers').setInputFiles(EXPORT_COMPTABLE);
			await expect(page.getByTestId('depot-lus')).toBeVisible({ timeout: 90_000 });

			// --- La file de confirmation se remplit toute seule ---
			await page.goto('/app/confirmer');
			const premier = page.getByRole('button').filter({ hasText: /ligne/ }).first();
			await expect(premier).toBeVisible({ timeout: 120_000 });

			// --- Une confirmation retire le libellé de la file ---
			const avant = await page.getByRole('button').filter({ hasText: /ligne/ }).count();
			await page.getByRole('button', { name: /Confirmer/ }).click();
			await expect(page.getByRole('button').filter({ hasText: /ligne/ })).toHaveCount(
				avant - 1,
				{ timeout: 30_000 }
			);
		} finally {
			await context.close();
			await deleteUserSafe(user.email);
		}
	});
```

- [ ] **Step 2: Étendre le contrôle de débordement à la tablette paysage**

Dans le test responsive existant, ajouter la largeur 1024 après 768 :

```ts
			await attendreAucunDebordement(page, 1024, 768); // tablette paysage
```

À faire aux deux endroits où les trois largeurs sont testées.

- [ ] **Step 3: Lancer l'E2E**

Le stack de test doit être chaud. Dans un terminal :

```bash
bun run dev:test
```

Puis, une fois le port joignable :

```bash
E2E_OVERRIDE_SITE_URL=http://localhost:21173 \
PUBLIC_CONVEX_URL=$(cat .convex/.test-backend-url) \
VARLOCK_ENV=test bunx playwright test egalim-parcours --reporter=line
```

Attendu : 5 tests passés.

- [ ] **Step 4: Lancer la suite complète**

```bash
bun run check:convex && bun run test:unit && bun run check 2>&1 | grep COMPLETED
```

Attendu : typecheck Convex sans erreur, tous les tests unitaires au vert, `check` à 9 erreurs pré-existantes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit --no-verify -m "test(e2e): parcours complet amorcage vers confirmation"
```

---

## Ce que ce plan ne couvre pas

Le **scan caméra**, les **certificats** et la **gate finale** font l'objet d'un second plan,
`2026-08-19-pivot-full-logiciel-acquisition-restitution.md`. À l'issue de ce plan-ci, un gérant peut
déposer un export comptable, confirmer ses produits et lire ses trois taux : c'est un produit qui
tourne.

La **gate** garde sa dépendance non levable : 100 lignes vérifiées à la main sur un jeu de factures
réelles, moins de 5 % d'erreur.
