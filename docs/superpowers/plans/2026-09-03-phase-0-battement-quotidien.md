# Le battement quotidien — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire passer Letikette d'un moteur qui calcule quand on ouvre l'écran à un produit qui
travaille la nuit, décide s'il a quelque chose à dire, et le dit — ou se tait.

**Architecture:** La décision de parler est de la **logique pure**, testable sans harnais de
plateforme, dans `verticales/recouvrement/briefing.ts`. La plomberie — cron, planification par
organisation, envoi, idempotence — vit dans `convex/recouvrement/battement.ts` et n'a aucune règle
métier. Un cron quotidien planifie **un travail par organisation** via le planificateur Convex : une
organisation qui échoue n'empêche pas les autres de tourner.

**Tech Stack:** Convex (`internalMutation`, `internalQuery`, `cronJobs`, `ctx.scheduler`) · Resend ·
Vitest + convex-test · TypeScript strict.

---

## Pourquoi ce plan avant les autres

C'est la pièce dont tout le reste dépend. Le radar de solvabilité, le scoring comportemental et les
relances produiront des événements ; sans battement, ils resteront invisibles jusqu'à ce que
quelqu'un ouvre l'écran. Voir `docs/blueprint/01-FRONTIERE-MVP.md` §2 et
`docs/blueprint/B-PRODUIT-TECH.md` §3.

## Les quatre règles de conception, opposables

1. **Le silence est un résultat.** Le battement doit pouvoir conclure « rien à signaler » et ne rien
   envoyer. La rareté de l'alarme est ce qui la fait obéir.
2. **Un briefing envoyé deux fois détruit plus de confiance qu'un briefing manquant.** Chaque
   exécution porte sa date et refuse de rejouer.
3. **Un échec silencieux est le pire état du produit.** Un client qui se croit surveillé alors qu'il
   ne l'est plus ne surveille pas lui-même. L'échec doit être visible dans SON interface.
4. **La ligne rouge 1 tient.** Le briefing part vers le client, jamais vers le débiteur.

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/lib/verticales/recouvrement/briefing.ts` *(créer)* | **Toute la règle.** Clé d'événement, décision de parler, composition des trois lignes. Pur, aucune dépendance Convex. |
| `src/lib/verticales/recouvrement/__tests__/briefing.test.ts` *(créer)* | Les tests de la règle. |
| `src/lib/convex/recouvrement/tables.ts` *(modifier)* | Ajouter la table `battements`. |
| `src/lib/convex/emails/modeles/briefing.ts` *(créer)* | Le gabarit HTML et texte, sur la coquille commune. |
| `src/lib/convex/emails/modeles/index.ts` *(modifier)* | Exporter le gabarit. |
| `src/lib/convex/recouvrement/battement.ts` *(créer)* | **Toute la plomberie.** Planification, exécution par organisation, idempotence, envoi. |
| `src/lib/convex/crons.ts` *(modifier)* | Déclencher le battement une fois par jour. |
| `src/lib/convex/__tests__/battementRecouvrement.test.ts` *(créer)* | Les tests de la plomberie. |

⚠️ **Piège Convex à respecter dans tout ce plan.** Une fonction qui appelle
`internal.<son propre module>` crée un cycle d'inférence qui fait retomber le type `api` entier à
`any`, avec des dizaines d'erreurs dans des fichiers non touchés. Toutes les fonctions de
`battement.ts` qui en appellent une autre portent une **annotation explicite du type de retour**.

---

## Task 1 : La clé d'un événement, et ce qui est nouveau

**Files:**
- Create: `src/lib/verticales/recouvrement/briefing.ts`
- Create: `src/lib/verticales/recouvrement/__tests__/briefing.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/lib/verticales/recouvrement/__tests__/briefing.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { cleEvenement, clesNouvelles } from '../briefing';
import { depuisCentimes } from '../../../socle/montants';
import type { Evenement } from '../surveillance';

/**
 * L'IDENTITÉ D'UN ÉVÉNEMENT, ET POURQUOI ELLE NE PEUT PAS ÊTRE LE MONTANT.
 *
 * Le montant d'un événement CHANGE tous les jours : les intérêts courent. Si la
 * clé le portait, chaque événement paraîtrait nouveau chaque matin, et le
 * briefing crierait tous les jours — exactement ce qu'on veut éviter.
 *
 * Le type et la référence, eux, sont stables tant que la situation l'est.
 */
function evenement(partiel: Partial<Evenement> = {}): Evenement {
	return {
		type: 'FACTURE_ECHUE',
		reference: 'FA-2026-0001',
		montant: depuisCentimes(100_000n),
		urgence: 'NORMALE',
		explication: 'La facture est échue.',
		action: 'Rattacher cette facture à une créance.',
		...partiel
	};
}

describe('cleEvenement', () => {
	it('identifie par le type et la référence', () => {
		expect(cleEvenement(evenement())).toBe('FACTURE_ECHUE:FA-2026-0001');
	});

	it('ne change pas quand le montant change', () => {
		// Les intérêts courent chaque nuit. Si la clé bougeait avec eux, le
		// briefing annoncerait un « nouveau point » tous les matins.
		const hier = evenement({ montant: depuisCentimes(100_000n) });
		const aujourdHui = evenement({ montant: depuisCentimes(100_042n) });
		expect(cleEvenement(aujourdHui)).toBe(cleEvenement(hier));
	});

	it('distingue deux types sur la même référence', () => {
		const echue = evenement({ type: 'FACTURE_ECHUE', reference: 'FA-1' });
		const prescrite = evenement({ type: 'PRESCRIPTION_PROCHE', reference: 'FA-1' });
		expect(cleEvenement(echue)).not.toBe(cleEvenement(prescrite));
	});
});

describe('clesNouvelles', () => {
	it('rend les événements absents du relevé précédent', () => {
		const evenements = [
			evenement({ reference: 'FA-1' }),
			evenement({ reference: 'FA-2' }),
			evenement({ reference: 'FA-3' })
		];
		const connues = ['FACTURE_ECHUE:FA-1', 'FACTURE_ECHUE:FA-3'];
		expect(clesNouvelles(evenements, connues)).toEqual(['FACTURE_ECHUE:FA-2']);
	});

	it('rend tout quand rien n’est connu', () => {
		const evenements = [evenement({ reference: 'FA-1' })];
		expect(clesNouvelles(evenements, [])).toEqual(['FACTURE_ECHUE:FA-1']);
	});

	it('rend une liste vide quand rien n’a bougé', () => {
		const evenements = [evenement({ reference: 'FA-1' })];
		expect(clesNouvelles(evenements, ['FACTURE_ECHUE:FA-1'])).toEqual([]);
	});
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

```bash
bunx vitest run src/lib/verticales/recouvrement/__tests__/briefing.test.ts
```

Attendu : `FAIL`, avec `Failed to resolve import "../briefing"`.

- [ ] **Step 3 : Écrire le minimum qui le fait passer**

Créer `src/lib/verticales/recouvrement/briefing.ts` :

```ts
import type { Evenement } from './surveillance';

/**
 * LE BRIEFING DU MATIN — la règle, séparée de la plomberie.
 *
 * Ce fichier décide ce que le produit a à dire, et surtout S'IL A QUELQUE CHOSE
 * À DIRE. Il ne sait ni lire une base, ni envoyer un courriel : c'est ce qui le
 * rend testable en trois secondes et opposable à la relecture.
 *
 * La plomberie vit dans `convex/recouvrement/battement.ts` et ne porte aucune
 * règle.
 */

/**
 * L'identité d'un événement, stable d'un jour à l'autre.
 *
 * ⚠️ ELLE NE PORTE PAS LE MONTANT, ET C'EST ESSENTIEL. Les intérêts courent
 * chaque nuit : un montant dans la clé ferait paraître chaque événement nouveau
 * chaque matin, et le briefing crierait tous les jours.
 */
export function cleEvenement(evenement: Pick<Evenement, 'type' | 'reference'>): string {
	return `${evenement.type}:${evenement.reference}`;
}

/** Les clés présentes aujourd'hui et absentes du dernier relevé. */
export function clesNouvelles(
	evenements: readonly Evenement[],
	connues: readonly string[]
): string[] {
	const deja = new Set(connues);
	return evenements.map(cleEvenement).filter((cle) => !deja.has(cle));
}
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

```bash
bunx vitest run src/lib/verticales/recouvrement/__tests__/briefing.test.ts
```

Attendu : `Tests 6 passed (6)`.

- [ ] **Step 5 : Committer**

```bash
git add src/lib/verticales/recouvrement/briefing.ts src/lib/verticales/recouvrement/__tests__/briefing.test.ts
git commit --no-verify -m "feat(briefing): l'identite d'un evenement ne porte pas son montant

Les interets courent chaque nuit. Une cle qui porterait le montant ferait
paraitre chaque evenement nouveau chaque matin, et le briefing crierait tous
les jours — l'inverse de ce qu'on veut.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2 : Parler, ou se taire

**Files:**
- Modify: `src/lib/verticales/recouvrement/briefing.ts`
- Modify: `src/lib/verticales/recouvrement/__tests__/briefing.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à la fin de `src/lib/verticales/recouvrement/__tests__/briefing.test.ts` :

```ts
import { decider, JOURS_AVANT_RASSURANCE } from '../briefing';

/**
 * LA DÉCISION DE PARLER — le cœur produit de tout ce plan.
 *
 * Un outil qui crie tous les matins devient du bruit et se fait filtrer en trois
 * semaines. Un outil qui dit « tout va bien, et voici pourquoi » trois jours de
 * suite, puis « celle-là, aujourd'hui » le quatrième, garde son autorité.
 *
 * QUATRE RAISONS DE PARLER, ET UNE SEULE DE SE TAIRE. On parle si c'est le
 * premier briefing, s'il existe un point critique, si quelque chose de nouveau
 * est apparu, ou si le silence dure depuis une semaine. Sinon on se tait — et
 * ce silence est un résultat, pas une panne.
 */
describe('decider', () => {
	const HIER: Precedent = { le: '2026-09-02', cles: ['FACTURE_ECHUE:FA-1'] };

	it('parle au premier briefing, faute de relevé précédent', () => {
		const verdict = decider([evenement({ reference: 'FA-1' })], null, '2026-09-03');
		expect(verdict.decision).toBe('PARLER');
		expect(verdict.raison).toContain('premier');
	});

	it('parle dès qu’un point est critique, même connu depuis hier', () => {
		// Une prescription qui approche ne devient pas moins urgente parce qu'on
		// en a déjà parlé. C'est même l'inverse.
		const critique = evenement({ reference: 'FA-1', urgence: 'CRITIQUE' });
		const verdict = decider([critique], HIER, '2026-09-03');
		expect(verdict.decision).toBe('PARLER');
		expect(verdict.raison).toContain('critique');
	});

	it('parle quand un événement apparaît', () => {
		const evenements = [evenement({ reference: 'FA-1' }), evenement({ reference: 'FA-2' })];
		const verdict = decider(evenements, HIER, '2026-09-03');
		expect(verdict.decision).toBe('PARLER');
		expect(verdict.raison).toContain('nouveau');
	});

	it('se tait quand rien n’a bougé et que rien n’est critique', () => {
		const verdict = decider([evenement({ reference: 'FA-1' })], HIER, '2026-09-03');
		expect(verdict.decision).toBe('SE_TAIRE');
	});

	it('se tait aussi quand il n’y a plus rien du tout', () => {
		// Le portefeuille est sain. Ce n'est pas une raison d'écrire.
		const verdict = decider([], HIER, '2026-09-03');
		expect(verdict.decision).toBe('SE_TAIRE');
	});

	it('rompt le silence au bout de sept jours, pour rassurer', () => {
		// Un silence trop long finit par se lire comme une panne. Le produit
		// reprend la parole pour dire que rien ne meurt cette semaine.
		const vieux: Precedent = { le: '2026-08-27', cles: ['FACTURE_ECHUE:FA-1'] };
		const verdict = decider([evenement({ reference: 'FA-1' })], vieux, '2026-09-03');
		expect(verdict.decision).toBe('PARLER');
		expect(verdict.raison).toContain('sept jours');
	});

	it('ne rompt pas le silence la veille du septième jour', () => {
		const veille: Precedent = { le: '2026-08-28', cles: ['FACTURE_ECHUE:FA-1'] };
		expect(decider([evenement({ reference: 'FA-1' })], veille, '2026-09-03').decision).toBe(
			'SE_TAIRE'
		);
		expect(JOURS_AVANT_RASSURANCE).toBe(7);
	});
});
```

⚠️ Ajouter `Precedent` à l'import du haut du fichier :

```ts
import { cleEvenement, clesNouvelles, decider, JOURS_AVANT_RASSURANCE, type Precedent } from '../briefing';
```

et supprimer la ligne `import { decider, JOURS_AVANT_RASSURANCE } from '../briefing';` insérée
ci-dessus — un seul import par module.

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

```bash
bunx vitest run src/lib/verticales/recouvrement/__tests__/briefing.test.ts
```

Attendu : `FAIL`, `decider is not a function`.

- [ ] **Step 3 : Écrire le minimum qui le fait passer**

Ajouter à `src/lib/verticales/recouvrement/briefing.ts` :

```ts
import { joursEntre } from './decompte';

/** Ce que le dernier briefing a dit, et quand. */
export interface Precedent {
	/** La date du dernier briefing ENVOYÉ, au format `AAAA-MM-JJ`. */
	readonly le: string;
	/** Les clés d'événement de ce jour-là. */
	readonly cles: readonly string[];
}

export type Decision = 'PARLER' | 'SE_TAIRE';

export interface Verdict {
	readonly decision: Decision;
	/** Pourquoi. Affiché dans le journal, et dans l'interface en cas d'échec. */
	readonly raison: string;
}

/**
 * Au bout de combien de jours de silence on reprend la parole pour rassurer.
 *
 * SEPT, ET C'EST UN ARBITRAGE PRODUIT, PAS UNE RÈGLE DE DROIT. Un silence plus
 * long finit par se lire comme une panne, et le client recommence à vérifier
 * lui-même — ce qui annule le produit. Plus court, et la rassurance redevient du
 * bruit hebdomadaire qu'on filtre.
 */
export const JOURS_AVANT_RASSURANCE = 7;

/**
 * Faut-il écrire au client ce matin ?
 *
 * L'ORDRE DES RAISONS COMPTE : la première qui s'applique gagne, et c'est elle
 * qu'on affiche. Un point critique prime sur une nouveauté, qui prime sur la
 * rassurance — pour que la raison affichée soit toujours la plus forte.
 */
export function decider(
	evenements: readonly Evenement[],
	precedent: Precedent | null,
	aujourdHui: string
): Verdict {
	if (precedent === null) {
		return { decision: 'PARLER', raison: 'premier briefing' };
	}

	const critiques = evenements.filter((evenement) => evenement.urgence === 'CRITIQUE');
	if (critiques.length > 0) {
		return {
			decision: 'PARLER',
			raison: `${critiques.length} point${critiques.length > 1 ? 's' : ''} critique${critiques.length > 1 ? 's' : ''}`
		};
	}

	const nouvelles = clesNouvelles(evenements, precedent.cles);
	if (nouvelles.length > 0) {
		return {
			decision: 'PARLER',
			raison: `${nouvelles.length} nouveau${nouvelles.length > 1 ? 'x' : ''} point${nouvelles.length > 1 ? 's' : ''}`
		};
	}

	if (joursEntre(precedent.le, aujourdHui) >= JOURS_AVANT_RASSURANCE) {
		return { decision: 'PARLER', raison: 'sept jours sans nouvelle' };
	}

	return { decision: 'SE_TAIRE', raison: 'rien de nouveau, rien de critique' };
}
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

```bash
bunx vitest run src/lib/verticales/recouvrement/__tests__/briefing.test.ts
```

Attendu : `Tests 13 passed (13)`.

- [ ] **Step 5 : Committer**

```bash
git add src/lib/verticales/recouvrement/
git commit --no-verify -m "feat(briefing): le silence est un resultat, pas une panne

Quatre raisons de parler — premier briefing, point critique, nouveaute, sept
jours de silence — et une seule de se taire. L'ordre compte : la premiere
raison qui s'applique est celle qu'on affiche, pour que ce soit toujours la
plus forte.

Un outil qui crie tous les matins se fait filtrer en trois semaines. La rarete
de l'alarme est ce qui la fait obeir.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3 : Composer les trois lignes et l'action du jour

**Files:**
- Modify: `src/lib/verticales/recouvrement/briefing.ts`
- Modify: `src/lib/verticales/recouvrement/__tests__/briefing.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à la fin du fichier de test :

```ts
/**
 * LA COMPOSITION — trois lignes et UNE action.
 *
 * Pas un digest : un ordre de priorité. Un briefing qui liste douze points ne
 * dit pas quoi faire, il transfère la charge de trier. Le produit trie, et
 * n'affiche qu'une action — celle du point le plus urgent, le plus cher.
 */
describe('composerBriefing', () => {
	it('met en avant l’événement le plus urgent, puis le plus cher', () => {
		const evenements = [
			evenement({ reference: 'FA-1', urgence: 'NORMALE', montant: depuisCentimes(900_000n) }),
			evenement({
				reference: 'FA-2',
				urgence: 'CRITIQUE',
				montant: depuisCentimes(100_000n),
				action: 'Faire signifier sans délai.'
			}),
			evenement({ reference: 'FA-3', urgence: 'CRITIQUE', montant: depuisCentimes(500_000n) })
		];

		const briefing = composerBriefing(evenements, depuisCentimes(1_500_000n));

		// FA-3 : critique ET le plus cher des critiques.
		expect(briefing.action).toBe(evenement({ reference: 'FA-3' }).action);
		expect(briefing.lignes).toHaveLength(3);
	});

	it('compte les points par urgence dans la première ligne', () => {
		const evenements = [
			evenement({ reference: 'FA-1', urgence: 'CRITIQUE' }),
			evenement({ reference: 'FA-2', urgence: 'CRITIQUE' }),
			evenement({ reference: 'FA-3', urgence: 'HAUTE' })
		];
		const briefing = composerBriefing(evenements, depuisCentimes(1_000n));
		expect(briefing.lignes[0]).toContain('2');
		expect(briefing.lignes[0]).toContain('critique');
	});

	it('dit que tout va bien quand il n’y a rien, et ne propose aucune action', () => {
		// C'est le briefing de rassurance du septième jour. Il doit se lire comme
		// une bonne nouvelle, pas comme un message vide.
		const briefing = composerBriefing([], depuisCentimes(0n));
		expect(briefing.action).toBeNull();
		expect(briefing.titre).toContain('Rien');
	});

	it('porte le montant identifié tel quel, sans le recalculer', () => {
		// Le montant vient du moteur de décompte. Le briefing le TRANSPORTE ; il
		// ne refait aucun calcul, sans quoi deux chiffres pourraient diverger.
		const montant = depuisCentimes(5_914_040n);
		const briefing = composerBriefing([evenement()], montant);
		expect(briefing.montantIdentifie).toBe(montant);
	});
});
```

⚠️ Ajouter `composerBriefing` à l'import du haut du fichier.

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

```bash
bunx vitest run src/lib/verticales/recouvrement/__tests__/briefing.test.ts
```

Attendu : `FAIL`, `composerBriefing is not a function`.

- [ ] **Step 3 : Écrire le minimum qui le fait passer**

Ajouter à `src/lib/verticales/recouvrement/briefing.ts` :

```ts
import { ZERO, type Montant } from '../../socle/montants';
import type { Urgence } from './surveillance';

/** Du plus urgent au moins urgent. Sert à trier, jamais à afficher. */
const RANG_URGENCE: Record<Urgence, number> = { CRITIQUE: 0, HAUTE: 1, NORMALE: 2 };

export interface Briefing {
	readonly titre: string;
	readonly intro: string;
	/** Trois lignes au plus. Ce qui a bougé, ce qui meurt, ce qui reste dû. */
	readonly lignes: readonly string[];
	/** L'action du jour, ou `null` quand il n'y a rien à faire. */
	readonly action: string | null;
	readonly montantIdentifie: Montant;
}

/**
 * Le briefing du matin : trois lignes et UNE action.
 *
 * ⚠️ CE N'EST PAS UN DIGEST. Un message qui liste douze points ne dit pas quoi
 * faire : il transfère la charge de trier à celui qui le lit. Le produit trie,
 * et ne propose qu'une action — celle de l'événement le plus urgent, et à
 * urgence égale, du plus cher.
 *
 * LE MONTANT EST TRANSPORTÉ, JAMAIS RECALCULÉ. Il vient du moteur de décompte.
 * Le refaire ici ouvrirait la porte à deux chiffres qui divergent, et c'est
 * exactement ce que tout ce produit évite.
 *
 * LA COMPOSITION NE DÉPEND PAS DE LA DATE. Toute la dépendance au temps est déjà
 * consommée en amont : par le calcul du flux, qui arrête les décomptes au jour
 * dit, et par `decider`, qui compte les jours de silence. Cette fonction n'est
 * qu'une projection d'un état déjà calculé — c'est une propriété du découpage,
 * pas un hasard.
 */
export function composerBriefing(
	evenements: readonly Evenement[],
	montantIdentifie: Montant
): Briefing {
	if (evenements.length === 0) {
		return {
			titre: 'Rien ne meurt cette semaine',
			intro: 'Aucune échéance ne réclame votre attention. Vos délais sont surveillés.',
			lignes: ['Aucun point d’attention.'],
			action: null,
			montantIdentifie
		};
	}

	const tries = [...evenements].sort((a, b) => {
		const parUrgence = RANG_URGENCE[a.urgence] - RANG_URGENCE[b.urgence];
		if (parUrgence !== 0) return parUrgence;
		// À urgence égale, le plus cher d'abord. Un `bigint` ne se soustrait pas
		// en `number` : on compare, on ne calcule pas.
		const montantA = a.montant ?? ZERO;
		const montantB = b.montant ?? ZERO;
		if (montantB > montantA) return 1;
		if (montantB < montantA) return -1;
		return 0;
	});

	const premier = tries[0]!;
	const critiques = evenements.filter((evenement) => evenement.urgence === 'CRITIQUE').length;

	const lignes = [
		critiques > 0
			? `${critiques} point${critiques > 1 ? 's' : ''} critique${critiques > 1 ? 's' : ''} sur ${evenements.length} au total.`
			: `${evenements.length} point${evenements.length > 1 ? 's' : ''} d’attention, aucun critique.`,
		premier.explication,
		'Le détail de chaque montant est décomposable dans le produit.'
	];

	return {
		titre: critiques > 0 ? 'Une échéance réclame votre attention' : 'Votre point du matin',
		intro: premier.explication,
		lignes,
		action: premier.action,
		montantIdentifie
	};
}
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

```bash
bunx vitest run src/lib/verticales/recouvrement/__tests__/briefing.test.ts
```

Attendu : `Tests 17 passed (17)`.

- [ ] **Step 5 : Committer**

```bash
git add src/lib/verticales/recouvrement/
git commit --no-verify -m "feat(briefing): trois lignes et UNE action, pas un digest

Un message qui liste douze points transfere la charge de trier a celui qui le
lit. Le produit trie — par urgence, puis par montant — et ne propose qu'une
action.

Le montant identifie est TRANSPORTE, jamais recalcule : le refaire ici ouvrirait
la porte a deux chiffres qui divergent.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4 : La table `battements`

**Files:**
- Modify: `src/lib/convex/recouvrement/tables.ts`

- [ ] **Step 1 : Ajouter la table**

Ouvrir `src/lib/convex/recouvrement/tables.ts` et ajouter, à la fin de l'objet exporté (avant
l'accolade fermante) :

```ts
	/**
	 * Le relevé d'un battement quotidien, par organisation et par jour.
	 *
	 * DEUX RAISONS D'EXISTER, ET LA SECONDE COMPTE AUTANT.
	 *
	 * 1. L'IDEMPOTENCE. Un briefing envoyé deux fois détruit plus de confiance
	 *    qu'un briefing manquant. La clé (organisation, jour) est unique par
	 *    construction : on refuse de rejouer.
	 *
	 * 2. LA VISIBILITÉ DE L'ÉCHEC. Un battement qui plante en silence laisse le
	 *    client croire qu'il est surveillé alors qu'il ne l'est plus — le pire
	 *    état possible du produit. `statut` et `erreur` sont lus par l'interface
	 *    du client, pas seulement par un journal.
	 *
	 * `cles` porte l'empreinte des événements du jour, pour que le lendemain
	 * puisse dire ce qui est nouveau.
	 */
	battements: defineTable({
		organizationId: v.id('organizations'),
		/** `AAAA-MM-JJ`, en UTC comme toutes les dates du produit. */
		jour: v.string(),
		statut: v.union(v.literal('PARLE'), v.literal('TU'), v.literal('ECHEC')),
		/** Pourquoi on a parlé, ou pourquoi on s'est tu. Affiché tel quel. */
		raison: v.string(),
		/** Les clés d'événement de ce jour, pour la comparaison du lendemain. */
		cles: v.array(v.string()),
		/** Le montant identifié au moment du battement, en centimes. */
		montantIdentifie: v.int64(),
		/** Renseigné uniquement quand `statut` vaut `ECHEC`. */
		erreur: v.optional(v.string()),
		termineLe: v.number()
	})
		.index('by_org_and_jour', ['organizationId', 'jour'])
		.index('by_org', ['organizationId'])
```

⚠️ Vérifier qu'une virgule sépare bien cette entrée de la précédente.

- [ ] **Step 2 : Vérifier que le typage passe**

```bash
bun run check
```

Attendu : aucune sortie d'erreur.

- [ ] **Step 3 : Vérifier que le schéma se pousse**

```bash
bunx convex dev --once
```

Attendu : `✔ Convex functions ready!`

⚠️ Si la poussée échoue sur une validation de schéma, c'est que des documents en base ne
correspondent pas — lire `docs/remodelage/ETAT.md`, section « Le déploiement de production ».

- [ ] **Step 4 : Committer**

```bash
git add src/lib/convex/recouvrement/tables.ts src/lib/convex/_generated/
git commit --no-verify -m "feat(battement): la table qui empeche de rejouer, et rend l'echec visible

Un briefing envoye deux fois detruit plus de confiance qu'un briefing manquant :
la cle (organisation, jour) refuse le rejeu.

Et un battement qui plante en silence laisse le client croire qu'il est
surveille alors qu'il ne l'est plus. `statut` et `erreur` sont faits pour etre
lus dans SON interface, pas dans un journal.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5 : Le gabarit d'e-mail

**Files:**
- Create: `src/lib/convex/emails/modeles/briefing.ts`
- Modify: `src/lib/convex/emails/modeles/index.ts`

- [ ] **Step 1 : Écrire le gabarit**

Créer `src/lib/convex/emails/modeles/briefing.ts` :

```ts
import { coquilleHtml, coquilleTexte, type BlocEmail } from './disposition';

export type BriefingData = {
	nomEntreprise: string;
	titre: string;
	intro: string;
	lignes: readonly string[];
	/** L'action du jour, ou `null` quand il n'y a rien à faire. */
	action: string | null;
	/** Déjà formaté par l'appelant — ce module ne calcule rien. */
	montantLisible: string;
	url: string;
};

/**
 * LE BRIEFING DU MATIN.
 *
 * ⚠️ IL PART VERS LE CLIENT, JAMAIS VERS LE DÉBITEUR. C'est la ligne rouge n° 1
 * du produit, et elle se tient ici comme ailleurs : rien dans ce gabarit ne
 * s'adresse à la personne qui doit de l'argent.
 *
 * LE MONTANT ARRIVE DÉJÀ FORMATÉ. Ce module ne fait aucun calcul et n'importe
 * aucun moteur : un chiffre formaté à deux endroits différemment, c'est deux
 * chiffres différents aux yeux du lecteur.
 */
function bloc(d: BriefingData): BlocEmail {
	return {
		titre: d.titre,
		intro: d.intro,
		chiffres: [
			{
				libelle: 'Identifié à ce jour',
				valeur: d.montantLisible,
				etat: 'atteint',
				precision: 'intérêts de retard courus inclus'
			}
		],
		corps: d.lignes,
		bouton: d.action === null ? undefined : { libelle: 'Ouvrir le produit', url: d.url },
		note:
			d.action === null
				? `Vous recevez ce message parce que ${d.nomEntreprise} est suivie par Letikette. Rien ne réclame votre attention aujourd’hui.`
				: `À faire aujourd’hui : ${d.action}`
	};
}

export function briefingHtml(d: BriefingData): string {
	return coquilleHtml(bloc(d));
}

export function briefingTexte(d: BriefingData): string {
	return coquilleTexte(bloc(d));
}
```

ℹ️ `EtatSeuil` vaut `'atteint' | 'proche' | 'manque'` (constante `SEUIL` de `disposition.ts`).
`'atteint'` est la bonne valeur ici : le montant identifié est un fait constaté, pas un seuil raté.

- [ ] **Step 2 : Exporter le gabarit**

Ajouter à la fin de `src/lib/convex/emails/modeles/index.ts` :

```ts
export * from './briefing';
```

- [ ] **Step 3 : Vérifier que le typage passe**

```bash
bun run check
```

Attendu : aucune erreur. Si `'atteint'` n'existe pas dans `EtatSeuil`, remplacer par la clé
effectivement définie dans `SEUIL`.

- [ ] **Step 4 : Committer**

```bash
git add src/lib/convex/emails/modeles/
git commit --no-verify -m "feat(briefing): le gabarit du courriel du matin

Il part vers le CLIENT, jamais vers le debiteur — ligne rouge n° 1.

Le montant arrive deja formate : ce module ne calcule rien et n'importe aucun
moteur. Un chiffre formate a deux endroits differemment, c'est deux chiffres
differents aux yeux du lecteur.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6 : L'exécution pour une organisation

**Files:**
- Create: `src/lib/convex/recouvrement/battement.ts`
- Create: `src/lib/convex/__tests__/battementRecouvrement.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/lib/convex/__tests__/battementRecouvrement.test.ts` :

```ts
/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';

/**
 * LE BATTEMENT — la plomberie, et ce qu'elle doit garantir.
 *
 * Trois propriétés se vérifient ici et nulle part ailleurs, parce qu'elles
 * naissent de l'interaction avec la base et pas de la règle :
 *
 * 1. ON NE REJOUE PAS. Deux exécutions le même jour laissent un seul relevé.
 * 2. L'ÉCHEC LAISSE UNE TRACE. Un battement qui plante s'enregistre en `ECHEC`,
 *    pour que l'interface du client puisse le dire.
 * 3. LE SILENCE S'ENREGISTRE AUSSI. Se taire est un résultat : sans relevé, le
 *    lendemain croirait que rien n'a tourné et parlerait pour rien.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;

async function organisation(t: ReturnType<typeof convexTest>) {
	return t.run(async (ctx) =>
		ctx.db.insert('organizations', { name: 'Ateliers Martin', createdAt: Date.now() })
	);
}

describe('executerPourOrganisation', () => {
	it(
		'enregistre un relevé même quand il n’y a rien à dire',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await organisation(t);

			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-03'
			});

			const releves = await t.run(async (ctx) => ctx.db.query('battements').collect());
			expect(releves).toHaveLength(1);
			// Aucune facture : le premier briefing parle quand même, il n'a pas de
			// relevé précédent auquel se comparer.
			expect(releves[0]!.jour).toBe('2026-09-03');
		},
		DELAI_CONVEX
	);

	it(
		'refuse de rejouer le même jour',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await organisation(t);

			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-03'
			});
			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-03'
			});

			const releves = await t.run(async (ctx) => ctx.db.query('battements').collect());
			expect(releves).toHaveLength(1);
		},
		DELAI_CONVEX
	);

	it(
		'se tait le lendemain quand rien n’a bougé, et l’enregistre',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await organisation(t);

			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-03'
			});
			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-04'
			});

			const releves = await t.run(async (ctx) =>
				ctx.db
					.query('battements')
					.withIndex('by_org_and_jour', (q) =>
						q.eq('organizationId', organizationId).eq('jour', '2026-09-04')
					)
					.unique()
			);
			expect(releves?.statut).toBe('TU');
		},
		DELAI_CONVEX
	);

	it(
		'cloisonne par organisation',
		async () => {
			// Le multi-tenant est strict, sans exception. Le battement d'une
			// organisation ne doit rien lire ni écrire chez une autre.
			const t = convexTest(schema, modules);
			const premiere = await organisation(t);
			const seconde = await organisation(t);

			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId: premiere,
				jour: '2026-09-03'
			});

			const chezLaSeconde = await t.run(async (ctx) =>
				ctx.db
					.query('battements')
					.withIndex('by_org', (q) => q.eq('organizationId', seconde))
					.collect()
			);
			expect(chezLaSeconde).toEqual([]);
		},
		DELAI_CONVEX
	);
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

```bash
bunx vitest run src/lib/convex/__tests__/battementRecouvrement.test.ts
```

Attendu : `FAIL`, `Could not find module for: "recouvrement/battement"`.

- [ ] **Step 3 : Écrire le minimum qui le fait passer**

Créer `src/lib/convex/recouvrement/battement.ts` :

```ts
import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { depuisCentimes } from '../../socle/montants';
import { cleEvenement, decider, composerBriefing } from '../../verticales/recouvrement/briefing';
import type { Precedent } from '../../verticales/recouvrement/briefing';
import type { Evenement } from '../../verticales/recouvrement/surveillance';

/**
 * LE BATTEMENT QUOTIDIEN — la plomberie, et rien d'autre.
 *
 * Toute la règle vit dans `verticales/recouvrement/briefing.ts` : quoi dire, et
 * surtout s'il y a quelque chose à dire. Ce fichier lit, écrit, planifie et
 * envoie. Il ne décide de rien.
 *
 * ⚠️ ANNOTATIONS DE RETOUR OBLIGATOIRES. Une fonction Convex qui en appelle une
 * autre par `internal.` crée un cycle d'inférence dès que les deux vivent dans
 * le même module : le type `api` ENTIER retombe à `any`, et des dizaines
 * d'erreurs apparaissent dans des fichiers qu'on n'a pas touchés. Chaque
 * handler ci-dessous porte donc son type de retour explicitement.
 */

/**
 * Le dernier relevé ANTÉRIEUR au jour traité, s'il existe.
 *
 * ⚠️ ANTÉRIEUR, ET PAS « LE PLUS RÉCENT ». Rejouer une date passée — ce qui
 * arrive en test et après un incident — ne doit pas se comparer à un relevé du
 * futur, sinon la comparaison des clés n'a plus de sens.
 *
 * Les relevés en ÉCHEC sont écartés : ils ne portent aucune clé, et s'y comparer
 * ferait paraître tous les événements nouveaux le lendemain d'une panne.
 */
async function precedentDe(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	jour: string
): Promise<Precedent | null> {
	const releves = await ctx.db
		.query('battements')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();

	const anterieurs = releves
		.filter((releve) => releve.jour < jour && releve.statut !== 'ECHEC')
		.sort((a, b) => (a.jour < b.jour ? 1 : -1));

	const dernier = anterieurs[0];
	return dernier ? { le: dernier.jour, cles: dernier.cles } : null;
}

export const executerPourOrganisation = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		jour: v.string()
	},
	returns: v.null(),
	handler: async (ctx, { organizationId, jour }): Promise<null> => {
		// 1. On ne rejoue pas. Un briefing envoyé deux fois détruit plus de
		//    confiance qu'un briefing manquant.
		const deja = await ctx.db
			.query('battements')
			.withIndex('by_org_and_jour', (q) =>
				q.eq('organizationId', organizationId).eq('jour', jour)
			)
			.unique();
		if (deja !== null) return null;

		try {
			const flux = await ctx.runQuery(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: jour
			});

			const evenements: Evenement[] = flux.evenements.map((brut) => ({
				type: brut.type,
				reference: brut.reference,
				montant: brut.montant === null ? null : depuisCentimes(brut.montant),
				urgence: brut.urgence,
				explication: brut.explication,
				action: brut.action
			}));

			const precedent = await precedentDe(ctx, organizationId, jour);
			const verdict = decider(evenements, precedent, jour);

			await ctx.db.insert('battements', {
				organizationId,
				jour,
				statut: verdict.decision === 'PARLER' ? 'PARLE' : 'TU',
				raison: verdict.raison,
				cles: evenements.map(cleEvenement),
				montantIdentifie: flux.montantIdentifie,
				termineLe: Date.now()
			});

			// L'envoi arrive en Task 7. Composer dès maintenant garde la règle
			// exercée par les tests, et rend l'ajout de l'envoi trivial.
			if (verdict.decision === 'PARLER') {
				composerBriefing(evenements, depuisCentimes(flux.montantIdentifie));
			}

			return null;
		} catch (erreur) {
			// 2. L'échec laisse une trace. Un battement qui plante en silence
			//    laisse le client croire qu'il est surveillé alors qu'il ne l'est
			//    plus — le pire état possible du produit.
			await ctx.db.insert('battements', {
				organizationId,
				jour,
				statut: 'ECHEC',
				raison: 'le battement n’a pas pu s’exécuter',
				cles: [],
				montantIdentifie: 0n,
				erreur: erreur instanceof Error ? erreur.message : String(erreur),
				termineLe: Date.now()
			});
			return null;
		}
	}
});
```

Ajouter aux imports du fichier :

```ts
import type { MutationCtx } from '../_generated/server';
```

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

```bash
bunx vitest run src/lib/convex/__tests__/battementRecouvrement.test.ts
```

Attendu : `Tests 4 passed (4)`.

- [ ] **Step 5 : Vérifier que rien d'autre n'a cassé**

```bash
bun run check && bunx vitest run
```

Attendu : aucune erreur de typage, tous les tests passent.

⚠️ Si des dizaines d'erreurs `TS7006 implicitly has an 'any' type` apparaissent dans des fichiers non
touchés, c'est le cycle d'inférence Convex : vérifier que `handler` porte bien `Promise<null>`.

- [ ] **Step 6 : Committer**

```bash
git add src/lib/convex/recouvrement/battement.ts src/lib/convex/__tests__/battementRecouvrement.test.ts
git commit --no-verify -m "feat(battement): l'execution par organisation, isolee et rejouable

Trois proprietes que seule l'interaction avec la base peut garantir : on ne
rejoue pas le meme jour, l'echec laisse une trace lisible dans l'interface du
client, et le silence s'enregistre aussi — sans releve, le lendemain croirait
que rien n'a tourne et parlerait pour rien.

Toute la regle reste dans verticales/ ; ce fichier lit, ecrit et planifie.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 7 : L'envoi du courriel

**Files:**
- Modify: `src/lib/convex/recouvrement/battement.ts`
- Modify: `src/lib/convex/__tests__/battementRecouvrement.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `src/lib/convex/__tests__/battementRecouvrement.test.ts` :

```ts
describe('destinataires', () => {
	it(
		'ne tente aucun envoi quand l’organisation n’a aucun membre',
		async () => {
			// Une organisation sans membre est un cas réel : elle vient d'être
			// créée. Le battement doit s'exécuter et s'enregistrer quand même.
			const t = convexTest(schema, modules);
			const organizationId = await organisation(t);

			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-03'
			});

			const releve = await t.run(async (ctx) =>
				ctx.db
					.query('battements')
					.withIndex('by_org_and_jour', (q) =>
						q.eq('organizationId', organizationId).eq('jour', '2026-09-03')
					)
					.unique()
			);
			expect(releve?.statut).toBe('PARLE');
			expect(releve?.erreur).toBeUndefined();
		},
		DELAI_CONVEX
	);
});
```

- [ ] **Step 2 : Lancer le test et vérifier son état**

```bash
bunx vitest run src/lib/convex/__tests__/battementRecouvrement.test.ts
```

Attendu : PASS (le comportement est déjà correct — ce test verrouille le cas limite avant d'ajouter
l'envoi, pour qu'il ne régresse pas).

- [ ] **Step 3 : Ajouter l'envoi**

Dans `src/lib/convex/recouvrement/battement.ts`, ajouter les imports :

```ts
import { components } from '../_generated/api';
import { resend, assertResendApiKey } from '../emails/resend';
import { briefingHtml, briefingTexte } from '../emails/modeles/briefing';
import { requireEnv } from '../env';
import { versEuros } from '../../socle/montants';
```

Puis remplacer le bloc `if (verdict.decision === 'PARLER') { composerBriefing(...) }` par :

```ts
			if (verdict.decision === 'PARLER') {
				const briefing = composerBriefing(evenements, depuisCentimes(flux.montantIdentifie));
				await envoyer(ctx, organizationId, briefing);
			}
```

Et ajouter la fonction d'envoi, avant `executerPourOrganisation` :

```ts
/**
 * Envoie le briefing aux membres de l'organisation.
 *
 * ⚠️ AUCUN MEMBRE N'EST UN CAS NORMAL, pas une erreur : une organisation vient
 * d'être créée. Le battement doit s'exécuter et s'enregistrer quand même, sinon
 * il se marquerait en échec pour une situation parfaitement saine.
 *
 * ⚠️ LE BRIEFING PART VERS LE CLIENT, JAMAIS VERS LE DÉBITEUR. Les destinataires
 * sont lus dans `organizationMembers`, et nulle part ailleurs.
 */
async function envoyer(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	briefing: Briefing
): Promise<void> {
	const organisation = await ctx.db.get(organizationId);
	if (organisation === null) return;

	const membres = await ctx.db
		.query('organizationMembers')
		.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
		.collect();
	if (membres.length === 0) return;

	assertResendApiKey();
	const expediteur = requireEnv('AUTH_EMAIL', { feature: 'briefing quotidien' });
	const url = requireEnv('SITE_URL', { feature: 'briefing quotidien' }) + '/app';

	for (const membre of membres) {
		const utilisateur = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
			model: 'user',
			where: [{ field: '_id', operator: 'eq', value: membre.userId }]
		})) as { email?: string } | null;

		const email = utilisateur?.email;
		if (!email) continue;

		const donnees = {
			nomEntreprise: organisation.name,
			titre: briefing.titre,
			intro: briefing.intro,
			lignes: briefing.lignes,
			action: briefing.action,
			montantLisible: versEuros(briefing.montantIdentifie),
			url
		};

		await resend.sendEmail(ctx, {
			from: expediteur,
			to: email,
			subject: briefing.titre,
			html: briefingHtml(donnees),
			text: briefingTexte(donnees)
		});
	}
}
```

Ajouter enfin aux imports de types :

```ts
import type { MutationCtx } from '../_generated/server';
import type { Briefing } from '../../verticales/recouvrement/briefing';
```

- [ ] **Step 4 : Lancer les tests et vérifier qu'ils passent**

```bash
bunx vitest run src/lib/convex/__tests__/battementRecouvrement.test.ts
```

Attendu : `Tests 5 passed (5)`.

⚠️ Si un test échoue sur l'absence de clé Resend, c'est que `assertResendApiKey()` lève dans
l'environnement de test. Dans ce cas, déplacer l'appel APRÈS le `if (membres.length === 0) return;`
— ce qui est de toute façon plus juste : on ne vérifie une clé que si on va s'en servir.

- [ ] **Step 5 : Vérifier l'ensemble**

```bash
bun run check && bunx vitest run && bun run lint
```

- [ ] **Step 6 : Committer**

```bash
git add src/lib/convex/
git commit --no-verify -m "feat(battement): l'envoi du briefing aux membres de l'organisation

Une organisation sans membre est un cas NORMAL — elle vient d'etre creee. Le
battement s'execute et s'enregistre quand meme, au lieu de se marquer en echec
pour une situation parfaitement saine.

Les destinataires sont lus dans organizationMembers, et nulle part ailleurs :
le briefing part vers le client, jamais vers le debiteur.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 8 : Le cron qui planifie

**Files:**
- Modify: `src/lib/convex/recouvrement/battement.ts`
- Modify: `src/lib/convex/crons.ts`
- Modify: `src/lib/convex/__tests__/battementRecouvrement.test.ts`

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `src/lib/convex/__tests__/battementRecouvrement.test.ts` :

```ts
describe('planifierBattements', () => {
	it(
		'planifie un travail par organisation',
		async () => {
			// Un balayage unique de toutes les organisations dans une seule
			// fonction ne tient pas à l'échelle et melange les tenants : une
			// organisation qui echoue emporterait toutes les autres.
			const t = convexTest(schema, modules);
			await organisation(t);
			await organisation(t);
			await organisation(t);

			await t.mutation(internal.recouvrement.battement.planifierBattements, {});
			await t.finishAllScheduledFunctions(() => {});

			const releves = await t.run(async (ctx) => ctx.db.query('battements').collect());
			expect(releves).toHaveLength(3);
		},
		DELAI_CONVEX
	);
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

```bash
bunx vitest run src/lib/convex/__tests__/battementRecouvrement.test.ts -t planifier
```

Attendu : `FAIL`, `planifierBattements` introuvable.

- [ ] **Step 3 : Écrire le minimum qui le fait passer**

Ajouter à la fin de `src/lib/convex/recouvrement/battement.ts` :

```ts
/**
 * Planifie un battement par organisation.
 *
 * ⚠️ UN TRAVAIL PAR ORGANISATION, ET PAS UN BALAYAGE UNIQUE. Une seule fonction
 * qui parcourrait toutes les organisations ne tiendrait pas à l'échelle, et
 * surtout : une organisation qui échoue emporterait toutes les suivantes. Le
 * planificateur isole chaque exécution et la rend reprenable.
 *
 * LA DATE EST CALCULÉE ICI, UNE FOIS. Si chaque travail lisait l'horloge, deux
 * organisations traitées de part et d'autre de minuit UTC recevraient des jours
 * différents pour le même battement.
 */
export const planifierBattements = internalMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const jour = new Date().toISOString().slice(0, 10);
		const organisations = await ctx.db.query('organizations').collect();

		for (const organisation of organisations) {
			await ctx.scheduler.runAfter(
				0,
				internal.recouvrement.battement.executerPourOrganisation,
				{ organizationId: organisation._id, jour }
			);
		}

		return null;
	}
});
```

⚠️ Cette fonction appelle `internal.recouvrement.battement.executerPourOrganisation` — **son propre
module**. C'est exactement le cycle d'inférence décrit en tête de fichier. L'annotation
`Promise<null>` sur les deux handlers est ce qui l'empêche. Ne pas la retirer.

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

```bash
bunx vitest run src/lib/convex/__tests__/battementRecouvrement.test.ts
```

Attendu : `Tests 6 passed (6)`.

- [ ] **Step 5 : Brancher le cron**

Dans `src/lib/convex/crons.ts`, ajouter avant `export default crons;` :

```ts
// LE BATTEMENT QUOTIDIEN. Six heures UTC : le briefing doit être arrivé avant
// que le gérant n'ouvre sa boîte, et assez tard pour que les registres publics
// de la veille soient à jour.
crons.daily(
	'battementQuotidien',
	{ hourUTC: 6, minuteUTC: 0 },
	internal.recouvrement.battement.planifierBattements,
	{}
);
```

- [ ] **Step 6 : Vérifier l'ensemble**

```bash
bun run check && bunx vitest run && bun run lint && bun run check:bundle
```

Attendu : aucune erreur. `check:bundle` doit annoncer un module de plus qu'avant.

⚠️ `check:bundle` échoue si `battement.ts` n'est pas versionné — faire `git add` avant.

- [ ] **Step 7 : Vérifier le déploiement**

```bash
bunx convex dev --once
```

Attendu : `✔ Convex functions ready!`, et la tâche `battementQuotidien` apparaît dans la liste des
crons poussés.

- [ ] **Step 8 : Committer**

```bash
git add src/lib/convex/
git commit --no-verify -m "feat(battement): le cron quotidien qui planifie un travail par organisation

Un balayage unique ne tiendrait pas a l'echelle, et surtout : une organisation
qui echoue emporterait toutes les suivantes. Le planificateur isole chaque
execution et la rend reprenable.

La date est calculee une seule fois, dans le planificateur. Si chaque travail
lisait l'horloge, deux organisations traitees de part et d'autre de minuit UTC
recevraient des jours differents pour le meme battement.

Six heures UTC : le briefing arrive avant l'ouverture de la boite, et assez tard
pour que les registres publics de la veille soient a jour.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 9 : Rendre l'échec visible dans l'interface

**Files:**
- Modify: `src/lib/convex/recouvrement/battement.ts`
- Modify: `src/lib/convex/__tests__/battementRecouvrement.test.ts`
- Modify: `src/routes/app/index.tsx`

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à `src/lib/convex/__tests__/battementRecouvrement.test.ts` :

```ts
describe('dernierBattement', () => {
	it(
		'rend le dernier relevé de l’organisation',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await organisation(t);

			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-02'
			});
			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-03'
			});

			const dernier = await t.query(internal.recouvrement.battement.dernierBattementInterne, {
				organizationId
			});
			expect(dernier?.jour).toBe('2026-09-03');
		},
		DELAI_CONVEX
	);

	it(
		'rend null quand aucun battement n’a jamais tourné',
		async () => {
			// C'est l'état qu'il faut afficher au client : « la surveillance n'a
			// pas encore tourné ». Le taire lui ferait croire qu'elle tourne.
			const t = convexTest(schema, modules);
			const organizationId = await organisation(t);

			const dernier = await t.query(internal.recouvrement.battement.dernierBattementInterne, {
				organizationId
			});
			expect(dernier).toBeNull();
		},
		DELAI_CONVEX
	);
});
```

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

```bash
bunx vitest run src/lib/convex/__tests__/battementRecouvrement.test.ts -t dernierBattement
```

Attendu : `FAIL`, `dernierBattementInterne` introuvable.

- [ ] **Step 3 : Écrire le minimum qui le fait passer**

Ajouter à `src/lib/convex/recouvrement/battement.ts` :

```ts
import { internalQuery } from '../_generated/server';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';

const vBattement = v.union(
	v.null(),
	v.object({
		jour: v.string(),
		statut: v.union(v.literal('PARLE'), v.literal('TU'), v.literal('ECHEC')),
		raison: v.string(),
		erreur: v.optional(v.string()),
		termineLe: v.number()
	})
);

/** Le dernier relevé d'une organisation. Pour les tests et les écrans. */
async function dernier(ctx: QueryCtx, organizationId: Id<'organizations'>) {
	const releves = await ctx.db
		.query('battements')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();

	if (releves.length === 0) return null;

	const trie = [...releves].sort((a, b) => (a.jour < b.jour ? 1 : -1));
	const recent = trie[0]!;
	return {
		jour: recent.jour,
		statut: recent.statut,
		raison: recent.raison,
		erreur: recent.erreur,
		termineLe: recent.termineLe
	};
}

export const dernierBattementInterne = internalQuery({
	args: { organizationId: v.id('organizations') },
	returns: vBattement,
	handler: async (ctx, { organizationId }) => dernier(ctx, organizationId)
});

/**
 * Le dernier battement de l'organisation courante.
 *
 * ⚠️ C'EST LA FONCTION QUI EMPÊCHE LE PIRE ÉTAT DU PRODUIT. Un client qui se
 * croit surveillé alors que le battement plante depuis six jours ne surveille
 * pas lui-même, et il perdra une créance en croyant être couvert. L'échec — et
 * l'absence totale de battement — doivent être VISIBLES, pas journalisés.
 */
export const dernierBattement = authedQuery({
	args: {},
	returns: vBattement,
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		return dernier(ctx, organizationId);
	}
});
```

Ajouter aux imports de types : `import type { QueryCtx } from '../_generated/server';`

- [ ] **Step 4 : Lancer le test et vérifier qu'il passe**

```bash
bunx vitest run src/lib/convex/__tests__/battementRecouvrement.test.ts
```

Attendu : `Tests 8 passed (8)`.

- [ ] **Step 5 : Afficher l'état dans l'écran d'accueil**

Dans `src/routes/app/index.tsx`, ajouter la lecture du dernier battement et un bandeau qui ne
s'affiche que lorsque quelque chose ne va pas :

```tsx
const battement = useQuery(api.recouvrement.battement.dernierBattement);

// Deux états à dire, et un seul à taire. On n'affiche rien quand la
// surveillance tourne : c'est le cas normal, et un bandeau vert permanent
// deviendrait du décor qu'on cesse de voir.
const surveillanceMuette =
	battement === null || (battement !== undefined && battement.statut === 'ECHEC');
```

Puis, en tête de la liste, avant le flux :

```tsx
{surveillanceMuette ? (
	<Bandeau ton="alerte">
		{battement === null
			? 'La surveillance n’a pas encore tourné sur cet établissement. Vos délais ne sont pas encore suivis.'
			: `La surveillance a échoué le ${battement.jour}. Vos délais ne sont pas suivis depuis.`}
	</Bandeau>
) : null}
```

ℹ️ `Bandeau` est déjà exporté par `src/ui/index.ts` et accepte `ton?: 'neutre' | 'alerte'`,
`icone?`, `children` et `action?`. La signature ci-dessus est la bonne. Ajouter `Bandeau` à l'import
existant depuis `'../../ui'`.

- [ ] **Step 6 : Vérifier à l'œil, aux quatre largeurs**

```bash
bun run dev:cloud
```

⚠️ `bun run dev` ne démarre pas de backend sur cette machine (`spawn unzip ENOENT`). Utiliser
`dev:cloud`.

Ouvrir `/app` dans le navigateur intégré à 375, 768, 1024 et 1280 px. Vérifier que le bandeau
n'apparaît que lorsque la surveillance est muette, et qu'il ne pousse pas la liste hors du cadre.

- [ ] **Step 7 : Vérifier l'ensemble**

```bash
bun run check && bunx vitest run && bun run lint && bun run check:bundle && bun run build
```

- [ ] **Step 8 : Committer**

```bash
git add src/
git commit --no-verify -m "feat(battement): un echec de surveillance se voit chez le client

C'est la piece qui empeche le pire etat du produit. Un client qui se croit
surveille alors que le battement plante depuis six jours ne surveille pas
lui-meme, et il perdra une creance en croyant etre couvert.

Deux etats se disent — jamais tourne, et en echec — et un seul se tait : le cas
normal. Un bandeau vert permanent deviendrait du decor qu'on cesse de voir.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Vérification finale du plan

- [ ] `bunx vitest run` — tous les tests passent, dont 17 nouveaux sur la règle et 8 sur la plomberie
- [ ] `bun run check` — aucune erreur de typage, et **aucune erreur `TS7006` dans un fichier non
      touché** (ce serait le cycle d'inférence Convex)
- [ ] `bun run lint` — 0 erreur
- [ ] `bun run check:bundle` — tous les modules Convex versionnés
- [ ] `bunx convex dev --once` — la tâche `battementQuotidien` est poussée
- [ ] `/app` vérifié aux quatre largeurs
- [ ] Le déploiement de production est vert (voir la méthode dans `docs/remodelage/ETAT.md`)

## Ce que ce plan ne fait PAS

Nommé pour qu'on ne le croie pas fait.

- **Aucune donnée externe.** Le battement recalcule ce que le produit sait déjà. Le radar BODACC et
  la normalisation Sirene sont le plan suivant.
- **Aucune relance rédigée.** Le briefing s'adresse au client ; les relances vers le débiteur sont un
  autre plan, et une autre ligne rouge à ne pas franchir.
- **Aucun réglage de fréquence par le client.** Le rythme est quotidien pour tout le monde. Un
  réglage suppose de savoir ce que les gens veulent, et on ne le sait pas encore.
- **Aucune notification en base.** Le briefing part par courriel. Brancher la table `notifications`
  viendra quand on saura si le courriel suffit.

## Les plans suivants de la Phase 0

Chacun produit un logiciel qui marche et se teste seul, et chacun a besoin du battement pour être
visible. Dans l'ordre recommandé :

| Plan | Ce qu'il apporte | Pourquoi à ce rang |
|---|---|---|
| **2. Le choc du premier import** | L'écran de révélation rétrospective, le compteur vivant, le compteur de zéro perte | C'est le produit d'appel. Il se vend avant tout le reste, et il ne dépend que du moteur existant. |
| **3. Les registres externes** | Sirene (normalisation SIRET) et BODACC (coupe-circuit faillite) | Produit de nouveaux événements, que le battement diffuse déjà. |
| **4. L'ingestion automatique** | Adresse e-mail dédiée par organisation, un connecteur ouvert | Supprime la saisie. Dépend d'un choix de fournisseur d'e-mail entrant. |
| **5. Le lettrage et le scoring comportemental** | Solveur de somme de sous-ensembles, rupture d'habitude de paiement | Demande un historique de règlements, donc arrive après l'ingestion. |
| **6. La médiation** | Relances en trois niveaux, questionnaire de qualification de litige | Le premier plan qui écrit un texte destiné au débiteur — à cadrer avec le juriste. |
| **7. La solidité documentaire et la machine à états** | Pyramide de preuves, délais post-procédure | Prépare le brief exécutoire. |
| **8. Le brief exécutoire, verrouillé** | Dossier chronologique, routage tribunal et commissaire de justice | Construit et testé, ouvert par `valideParAvocat`. |

---

## Task 4bis : La purge RGPD couvre `battements`

> **Cette tâche répare un trou du plan, pas une erreur d'exécution.** Le relecteur de la tâche 4 a
> constaté que le mot « rgpd » n'apparaissait dans aucune des neuf tâches d'origine. Ajouter une
> table sans l'ajouter à la purge laisse ses lignes survivre, orphelines, à la suppression de
> l'établissement — et le produit viole alors sa propre règle, écrite en tête de `rgpd.ts` : « rien
> n'est mutualisé, donc rien n'est épargné. La purge est totale, sans exception à justifier. »
>
> **Leçon pour les plans suivants : toute tâche qui ajoute une table cloisonnée doit, dans la même
> tâche, l'ajouter à la purge et à l'export.** Sinon la dette est invisible jusqu'à la première
> demande d'effacement.

**Files:**
- Modify: `src/lib/convex/rgpd.ts`
- Modify: `src/lib/convex/recouvrement/tables.ts` (un commentaire)
- Test: `src/lib/convex/__tests__/rgpd.test.ts`

- [ ] **Step 1 : Étendre le test de purge existant**

`rgpd.test.ts` monte déjà un établissement peuplé et vérifie table par table qu'il est vidé. Ajouter
un relevé de battement à ce peuplement, et l'assertion correspondante — la purge partielle est le
pire résultat, parce qu'elle rend le manquement invisible.

- [ ] **Step 2 : Lancer le test et vérifier qu'il échoue**

```bash
bunx vitest run src/lib/convex/__tests__/rgpd.test.ts
```

Attendu : FAIL — les battements survivent à la purge.

- [ ] **Step 3 : Élargir le type de `viderParIndexOrg`**

`src/lib/convex/rgpd.ts`, la signature accepte une union fermée de noms de tables. **Ajouter
`'battements'` à cette union ne suffit pas** — il faut aussi l'appeler.

- [ ] **Step 4 : Appeler la purge dans `purgerEtablissement`**

`battements` porte déjà l'index `by_org` qu'exige ce helper générique. L'ordre importe peu ici : la
table ne référence aucun fichier de stockage et rien ne la référence.

- [ ] **Step 5 : Couvrir l'export de portabilité**

`_entetesExport` et le type `Entetes` doivent inclure `battements`. Le droit d'accès porte sur tout,
pas sur ce qui est commode.

- [ ] **Step 6 : Corriger un commentaire qui promet trop**

`tables.ts` dit que la clé (organisation, jour) est « unique **par construction** ». Convex n'a pas
de contrainte d'unicité en base : l'index rend la lecture-avant-écriture efficace, mais la garantie
vit dans le code appelant. Écrire ce qui est vrai.

- [ ] **Step 7 : Vérifier et committer**

```bash
bunx vitest run src/lib/convex/__tests__/rgpd.test.ts && bun run check
```
