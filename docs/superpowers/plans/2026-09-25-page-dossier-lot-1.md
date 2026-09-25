# Page dossier — Lot 1 : le référentiel et le calcul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre au gérant le choix de l'ordre d'imputation des paiements (et chiffrer les deux variantes tant qu'il n'a pas choisi), calculer les délais de procédure selon le code de procédure civile (fériés, report au premier jour ouvrable), et imprimer les taux exacts — avec les seules entrées du référentiel que ce lot emploie.

**Architecture:** Tout le droit reste dans `src/lib/verticales/recouvrement/` (registre `parametres.ts`, calcul pur `decompte.ts`, nouveau module pur `delais.ts`, formatage pur `taux-lisible.ts`). Convex (`src/lib/convex/recouvrement/`) stocke le choix du gérant sur la créance et fige avec chaque décompte l'ordre employé. Les écrans (`src/ui/`, `src/screens/`, `src/routes/`) montrent l'ordre, la variante, et un `Segmented` Cladd pour choisir.

**Tech Stack:** TypeScript strict, React 19, TanStack Router, Convex (`convex-test` pour les tests d'intégration), Vitest, Cladd (`@cladd-ui/react`), bun.

**Spec:** `docs/superpowers/specs/2026-09-25-page-dossier-design.md` (section 0 « le logiciel montre, le gérant qualifie » ; § 2 « Calcul des délais » ; § 4.6 ; § 5 « Lot 1 »). Relevé source des valeurs : `docs/superpowers/specs/2026-09-25-relecture-juridique.md`, § 4.1, 4.2, 4.9.

## Global Constraints

- **Aucune valeur juridique écrite en dur hors de `parametres.ts` et de `pays/**`** : un test (`valeurs-juridiques.test.ts`) refuse toute référence `L…`, `R…`, `D…` suivie d'un numéro d'article ailleurs (hors commentaires).
- **Chaque entrée du référentiel porte** `valeur`, `source`, `verifieLe`, `verifie`, `valideParAvocat: false`. `verifie: true` seulement quand l'extrait exact est recopié dans `note`. Aucune entrée n'est déclarée sans être lue par le code dans ce même lot.
- **`sourceValableJusqua` n'est posé que s'il a été LU sur la source** ; `sources-encore-en-vigueur.test.ts` fige la liste des entrées datées.
- **Montants en entiers de centimes** (`Montant`, `bigint`) du domaine à l'écran, `v.int64()` en base. Jamais un flottant.
- **Un décompte figé ne se réécrit jamais.** Les champs ajoutés aux tables sont `v.optional` : Convex valide la base existante.
- **Le doute ne profite jamais au produit** : sans choix confirmé du gérant, le décompte retient le total le plus bas des deux ordres, et le dit.
- **Le logiciel montre, le gérant qualifie** : l'ordre d'imputation est un choix du gérant ; aucune option n'est présentée comme recommandée.
- **Handlers Convex** : annoter le type de retour quand un handler appelle `internal.<son propre module>` (cycle d'inférence, voir CLAUDE.md).
- **Tailwind** : hors `src/ui/**`, pas de valeur arbitraire `-[...]`, pas de couleur littérale, pas de taille de police hors échelle (`bun run lint` échoue sinon). Les contrôles viennent de Cladd (`Segmented`, `SegmentedButton`, `SurfaceCut`), jamais d'un `div` qui les imite.
- **Interface en français**, mots du gérant : « pénalités de retard », « frais de recouvrement », « date limite pour agir en justice ». Le mot « garantie » est interdit partout.
- **Tests** : seulement là où une erreur coûte de l'argent, un délai ou une ligne rouge. Chaque attendu chiffré est calculé à la main dans son commentaire.
- **Commits** : `git commit --no-verify`, message qui se termine par la ligne d'attribution `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Mise en production** : le fondateur pousse lui-même (`git push origin <sha>:main`) ; ensuite, statut Vercel via `curl -s "https://api.github.com/repos/julesdo/mycelium-os/commits/<sha>/status"`, puis empreinte du contenu servi.

## File Structure

| Fichier | Rôle dans ce lot |
|---|---|
| `src/lib/verticales/recouvrement/parametres.ts` | +5 entrées (point de départ des pénalités, indemnité par facture, calcul des délais en mois, report au jour ouvrable, fêtes légales) ; source de `indemniteForfaitaire` corrigée |
| `src/lib/verticales/recouvrement/delais.ts` (nouveau) | Pâques, fêtes légales d'une année, jour ouvrable, fin d'un délai avec ou sans report (CPC 641, 642) |
| `src/lib/verticales/recouvrement/procedures.ts` | `Echeance.reporteeDe` (facultatif) |
| `src/lib/verticales/recouvrement/apres-procedure.ts` | l'échéance de signification passe par `finDeDelai` avec report |
| `src/lib/verticales/recouvrement/taux-lisible.ts` (nouveau) | `tauxLisible` exact, seule implémentation |
| `src/ui/format.ts` | réexporte `tauxLisible` au lieu de le réimplémenter |
| `src/lib/verticales/recouvrement/decompte.ts` | `OrdreImputation`, `ChoixImputation`, `ImputationDuDecompte` ; `decompterFacture(…, ordre)` ; `decompterCreance(…, choix)` |
| `src/lib/verticales/recouvrement/controle.ts` | accepte un décompte sans `imputation` (décomptes figés anciens) |
| `src/lib/verticales/recouvrement/revelation.ts` | passe l'ordre prudent `PRINCIPAL_DABORD` |
| `src/lib/verticales/recouvrement/piece.ts` | fondements selon l'ordre ; indemnité citée par `indemniteParFacture` ; `tauxLisible` importé |
| `src/lib/convex/recouvrement/tables.ts` | `vOrdreImputation`, `vImputationDuDecompte` ; `creances.ordreImputation*` ; `decomptes.imputation` |
| `src/lib/convex/recouvrement/creances.ts` | mutation publique `choisirOrdreImputation` |
| `src/lib/convex/recouvrement/decompte.ts` | `projeterDecompte` passe le choix ; `figerDecompte` fige `imputation` ; validateurs de retour |
| `src/lib/convex/recouvrement/arret.ts` | la projection rend `imputation` |
| `src/ui/decompte.tsx` | ligne « Les paiements sont imputés… », variante, `Segmented` de choix |
| `src/screens/creance.tsx`, `src/routes/app/creance.$id.tsx` | branchement du choix |
| `src/routes/app/decompte.$id.tsx` | la pièce reçoit `imputation` |
| `src/routes/-salle/*.tsx`, `src/marketing/etapes.tsx` | appels du domaine mis à jour |

---

### Task 1 : Les entrées du référentiel que ce lot emploie

**Files:**
- Modify: `src/lib/verticales/recouvrement/parametres.ts` (entrée `indemniteForfaitaire` ; nouvelle section avant `// ── Relecture du 25 septembre 2026`)
- Modify: `src/lib/verticales/recouvrement/__tests__/parametres.test.ts`
- Modify: `src/lib/verticales/recouvrement/__tests__/sources-encore-en-vigueur.test.ts:104`

**Interfaces:**
- Produces: `PARAMETRES.pointDepartPenalitesRetard` (`ParametreLegal<'LENDEMAIN_ECHEANCE'>`), `PARAMETRES.indemniteParFacture` (`ParametreLegal<boolean>`), `PARAMETRES.computationDelaisMois` (`ParametreLegal<'MEME_QUANTIEME_SINON_DERNIER_JOUR'>`), `PARAMETRES.reportDelaiJourNonOuvrable` (`ParametreLegal<boolean>`), `PARAMETRES.joursFeriesLegaux` (`ParametreLegal<readonly string[]>`, règles `'MM-JJ'` ou `'PAQUES+n'`).

- [ ] **Step 1 : Écrire le test qui échoue**

Ajouter à la fin de `src/lib/verticales/recouvrement/__tests__/parametres.test.ts` :

```ts
describe('les entrées du lot 1 de la page dossier (relecture du 25/09/2026)', () => {
	const CLES = [
		'pointDepartPenalitesRetard',
		'indemniteParFacture',
		'computationDelaisMois',
		'reportDelaiJourNonOuvrable',
		'joursFeriesLegaux'
	] as const;

	it('sont relevées sur leur source, datées du relevé, et non validées par un avocat', () => {
		for (const cle of CLES) {
			const parametre = PARAMETRES[cle];
			expect(parametre.verifie, cle).toBe(true);
			expect(parametre.valideParAvocat, cle).toBe(false);
			expect(parametre.verifieLe, cle).toBe('2026-09-25');
		}
	});

	it('porte les onze fêtes légales, et rien d’autre', () => {
		// L3133-1 du code du travail : 1er janvier, lundi de Pâques, 1er mai, 8 mai,
		// Ascension, lundi de Pentecôte, 14 juillet, Assomption, Toussaint,
		// 11 novembre, Noël.
		expect(exiger(PARAMETRES.joursFeriesLegaux)).toHaveLength(11);
	});

	it('cite pour l’indemnité la version du décret en vigueur', () => {
		expect(PARAMETRES.indemniteForfaitaire.source).toMatch(/27 février 2021/);
	});
});
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run : `bunx vitest run src/lib/verticales/recouvrement/__tests__/parametres.test.ts`
Expected : FAIL — `PARAMETRES.pointDepartPenalitesRetard` est `undefined` (erreur TypeScript à la transformation, ou `Cannot read properties of undefined`).

- [ ] **Step 3 : Corriger la source de l'indemnité**

Dans `src/lib/verticales/recouvrement/parametres.ts`, entrée `indemniteForfaitaire`, remplacer :

```ts
		source:
			'Article D441-5 du code de commerce, issu du décret n° 2012-1115 du 2 octobre 2012 ' +
			'(pris pour l’application de L441-10)',
		verifieLe: LE,
```

par :

```ts
		// Relu le 25/09/2026 : la version citée jusqu'ici n'était plus celle en
		// vigueur. La valeur, elle, n'a pas bougé.
		source:
			'Article D441-5 du code de commerce, version en vigueur depuis le 27 février 2021 ' +
			'(décret n° 2021-211, art. 3)',
		verifieLe: LE_25,
```

- [ ] **Step 4 : Ajouter les cinq entrées**

Dans le même fichier, juste avant la ligne `	// ── Relecture du 25 septembre 2026 ──────────────────────────────────────`, insérer :

```ts
	// ── Lot 1 de la page dossier (relecture du 25 septembre 2026, § 4.2 et 4.9) ──

	pointDepartPenalitesRetard: {
		cle: 'pointDepartPenalitesRetard',
		nature: 'CONSTANTE',
		valeur: 'LENDEMAIN_ECHEANCE',
		unite: 'sans',
		source: 'Article L441-10 II du code de commerce',
		verifieLe: LE_25,
		// Même page que `tauxInteretLegalDefaut`, relue avec sa version du 1er janvier 2027.
		sourceValableJusqua: '2027-01-01',
		verifie: true,
		valideParAvocat: false,
		note:
			'« exigibles le jour suivant la date de règlement figurant sur la facture ». Le décompte ' +
			'compte les jours de l’échéance incluse à l’arrêté exclu : c’est exactement le même NOMBRE ' +
			'de jours que du lendemain de l’échéance à l’arrêté inclus, donc aucun jour n’est compté ' +
			'en trop. Les deux conventions ne diffèrent que par le taux d’un seul jour, quand ' +
			`l’échéance et l’arrêté tombent dans deux semestres différents. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<'LENDEMAIN_ECHEANCE'>,

	indemniteParFacture: {
		cle: 'indemniteParFacture',
		nature: 'CONSTANTE',
		valeur: true,
		unite: 'sans',
		source: 'Service-Public Entreprendre, fiche F23211 (lecture de l’administration)',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Elle s’applique à chaque facture qui n’a pas été payée dans les délais. » Une indemnité ' +
			'par facture payée en retard, une seule fois. C’est la lecture de l’administration, pas un ' +
			'texte : elle fonde le « par facture » du décompte, que l’article du montant ne dit pas. ' +
			AVOCAT_ATTENDU
	} satisfies ParametreLegal<boolean>,

	computationDelaisMois: {
		cle: 'computationDelaisMois',
		nature: 'CONSTANTE',
		valeur: 'MEME_QUANTIEME_SINON_DERNIER_JOUR',
		unite: 'sans',
		source: 'Article 641, alinéa 2, du code de procédure civile',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« A défaut d’un quantième identique, le délai expire le dernier jour du mois. » ' +
			'`ajouterMois` (calendrier.ts) l’applique : un mois à compter du 31 janvier finit le 28 ou ' +
			`le 29 février, jamais le 3 mars. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<'MEME_QUANTIEME_SINON_DERNIER_JOUR'>,

	reportDelaiJourNonOuvrable: {
		cle: 'reportDelaiJourNonOuvrable',
		nature: 'CONSTANTE',
		valeur: true,
		unite: 'sans',
		source: 'Article 642 du code de procédure civile',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'Le délai qui expirerait un samedi, un dimanche ou un jour férié ou chômé « est prorogé ' +
			'jusqu’au premier jour ouvrable suivant ». Il vaut aussi en procédure collective (R662-1 ' +
			'du code de commerce). Ce logiciel ne l’applique qu’aux délais de procédure, sur demande ' +
			'expresse de l’appelant ; son application à la prescription n’a pas été relevée, et il ne ' +
			`la prolonge donc pas. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<boolean>,

	joursFeriesLegaux: {
		cle: 'joursFeriesLegaux',
		nature: 'CONSTANTE',
		valeur: [
			'01-01',
			'PAQUES+1',
			'05-01',
			'05-08',
			'PAQUES+39',
			'PAQUES+50',
			'07-14',
			'08-15',
			'11-01',
			'11-11',
			'12-25'
		],
		unite: 'sans',
		source: 'Article L3133-1 du code du travail',
		verifieLe: LE_25,
		verifie: true,
		valideParAvocat: false,
		note:
			'« Les fêtes légales ci-après désignées sont des jours fériés » : le 1er janvier, le lundi ' +
			'de Pâques, le 1er mai, le 8 mai, l’Ascension, le lundi de Pentecôte, le 14 juillet, ' +
			'l’Assomption, la Toussaint, le 11 novembre et le jour de Noël. Leur effet sur l’article 642 ' +
			'du code de procédure civile : Cass. 3e civ., 21 janv. 2021 (publié). Les fêtes mobiles sont ' +
			'données par rapport au dimanche de Pâques, que `delais.ts` calcule. Les jours fériés ' +
			'locaux (Alsace-Moselle, outre-mer) ne sont pas employés : leur effet sur l’article 642 ' +
			`n’est pas jugé. ${AVOCAT_ATTENDU}`
	} satisfies ParametreLegal<readonly string[]>,

```

- [ ] **Step 5 : Déclarer la nouvelle entrée datée**

Dans `src/lib/verticales/recouvrement/__tests__/sources-encore-en-vigueur.test.ts`, remplacer :

```ts
		).toEqual(['tauxInteretLegalDefaut', 'tauxInteretMinimalLegal']);
```

par :

```ts
		).toEqual(['pointDepartPenalitesRetard', 'tauxInteretLegalDefaut', 'tauxInteretMinimalLegal']);
```

Et, dans le commentaire au-dessus du `it`, remplacer la phrase `UNE SEULE porte une version postérieure. Ce test fige ce compte.` par `UNE SEULE page porte une version postérieure (L441-10), citée par trois entrées. Ce test fige ce compte.`

- [ ] **Step 6 : Lancer les tests du référentiel**

Run : `bunx vitest run src/lib/verticales/recouvrement/__tests__/parametres.test.ts src/lib/verticales/recouvrement/__tests__/sources-encore-en-vigueur.test.ts src/lib/verticales/recouvrement/__tests__/valeurs-juridiques.test.ts`
Expected : PASS (tous).

- [ ] **Step 7 : Commit**

```bash
git add src/lib/verticales/recouvrement/parametres.ts src/lib/verticales/recouvrement/__tests__/parametres.test.ts src/lib/verticales/recouvrement/__tests__/sources-encore-en-vigueur.test.ts
git commit --no-verify -m "feat(referentiel): les cinq entrees du lot 1, et la version en vigueur du decret de l'indemnite" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2 : Le calcul des délais (CPC 641 et 642)

**Files:**
- Create: `src/lib/verticales/recouvrement/delais.ts`
- Test: `src/lib/verticales/recouvrement/__tests__/delais.test.ts`

**Interfaces:**
- Consumes : `ajouterJours(date, jours)`, `ajouterMois(date, mois)`, `estDateReelle(date)` de `./calendrier` ; `PARAMETRES.joursFeriesLegaux`, `PARAMETRES.computationDelaisMois`, `PARAMETRES.reportDelaiJourNonOuvrable` (Task 1).
- Produces :
  - `type UniteDelai = 'jours' | 'mois' | 'annees'`
  - `interface Duree { readonly valeur: number; readonly unite: UniteDelai }`
  - `interface FinDeDelai { readonly fin: string; readonly reporteeDe: string | null }`
  - `paques(annee: number): string`
  - `joursFeries(annee: number): readonly string[]`
  - `estJourOuvrable(date: string): boolean`
  - `finDeDelai(depart: string, duree: Duree, options: { readonly reporterJourNonOuvrable: boolean }): FinDeDelai`

- [ ] **Step 1 : Écrire les tests qui échouent**

Créer `src/lib/verticales/recouvrement/__tests__/delais.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { estJourOuvrable, finDeDelai, joursFeries, paques } from '../delais';

/**
 * LE CALCUL DES DÉLAIS — CPC 641 et 642.
 *
 * Chaque date attendue est vérifiée au calendrier dans son commentaire : le
 * 1er janvier 2026 est un jeudi, et Pâques 2026 tombe le 5 avril.
 */

describe('Pâques', () => {
	it('tombe aux dates publiées', () => {
		expect(paques(2024)).toBe('2024-03-31');
		expect(paques(2025)).toBe('2025-04-20');
		expect(paques(2026)).toBe('2026-04-05');
		expect(paques(2027)).toBe('2027-03-28');
	});
});

describe('les onze fêtes légales d’une année', () => {
	it('placent les fêtes mobiles par rapport à Pâques', () => {
		const feries = joursFeries(2026);
		expect(feries).toHaveLength(11);
		// Lundi de Pâques = Pâques + 1 ; Ascension = + 39 ; lundi de Pentecôte = + 50.
		expect(feries).toContain('2026-04-06');
		expect(feries).toContain('2026-05-14');
		expect(feries).toContain('2026-05-25');
		expect(feries).toContain('2026-07-14');
		expect(feries).toContain('2026-12-25');
	});
});

describe('le jour ouvrable', () => {
	it('écarte le samedi, le dimanche et les fêtes légales', () => {
		expect(estJourOuvrable('2026-02-28')).toBe(false); // samedi
		expect(estJourOuvrable('2026-03-01')).toBe(false); // dimanche
		expect(estJourOuvrable('2026-05-14')).toBe(false); // Ascension, un jeudi
		expect(estJourOuvrable('2026-03-02')).toBe(true); // lundi
	});

	it('refuse une date qui n’existe pas', () => {
		expect(() => estJourOuvrable('2026-02-30')).toThrow();
	});
});

describe('la fin d’un délai', () => {
	it('ne compte pas le jour du départ, pour un délai en jours', () => {
		// 2 mars + 15 jours = 17 mars.
		expect(
			finDeDelai('2026-03-02', { valeur: 15, unite: 'jours' }, { reporterJourNonOuvrable: false })
		).toEqual({ fin: '2026-03-17', reporteeDe: null });
	});

	it('finit le dernier jour du mois quand le quantième manque (641, al. 2)', () => {
		expect(
			finDeDelai('2026-01-31', { valeur: 1, unite: 'mois' }, { reporterJourNonOuvrable: false })
		).toEqual({ fin: '2026-02-28', reporteeDe: null });
	});

	it('reporte au lundi un délai qui finit un samedi (642)', () => {
		// Le 28 février 2026 est un samedi : le délai court jusqu'au lundi 2 mars.
		expect(
			finDeDelai('2026-01-31', { valeur: 1, unite: 'mois' }, { reporterJourNonOuvrable: true })
		).toEqual({ fin: '2026-03-02', reporteeDe: '2026-02-28' });
	});

	it('reporte par-dessus une fête légale', () => {
		// 14 février + 3 mois = jeudi 14 mai 2026, jour de l'Ascension : vendredi 15.
		expect(
			finDeDelai('2026-02-14', { valeur: 3, unite: 'mois' }, { reporterJourNonOuvrable: true })
		).toEqual({ fin: '2026-05-15', reporteeDe: '2026-05-14' });
	});

	it('enchaîne plusieurs jours non ouvrables', () => {
		// Noël 2026 est un vendredi, suivi du week-end : lundi 28 décembre.
		expect(
			finDeDelai('2026-11-25', { valeur: 1, unite: 'mois' }, { reporterJourNonOuvrable: true })
		).toEqual({ fin: '2026-12-28', reporteeDe: '2026-12-25' });
	});

	it('ne reporte rien quand l’appelant ne le demande pas — la prescription', () => {
		// Le 1er novembre 2026 est un dimanche et la Toussaint : pas de report demandé.
		expect(
			finDeDelai('2021-11-01', { valeur: 5, unite: 'annees' }, { reporterJourNonOuvrable: false })
		).toEqual({ fin: '2026-11-01', reporteeDe: null });
	});

	it('refuse une durée négative ou fractionnaire', () => {
		expect(() =>
			finDeDelai('2026-03-02', { valeur: -1, unite: 'jours' }, { reporterJourNonOuvrable: false })
		).toThrow();
		expect(() =>
			finDeDelai('2026-03-02', { valeur: 1.5, unite: 'mois' }, { reporterJourNonOuvrable: false })
		).toThrow();
	});
});
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run : `bunx vitest run src/lib/verticales/recouvrement/__tests__/delais.test.ts`
Expected : FAIL — `Failed to resolve import "../delais"`.

- [ ] **Step 3 : Écrire le module**

Créer `src/lib/verticales/recouvrement/delais.ts` :

```ts
import { ajouterJours, ajouterMois, estDateReelle } from './calendrier';
import { PARAMETRES, exiger } from './parametres';

/**
 * LE CALCUL DES DÉLAIS — code de procédure civile, articles 641 et 642.
 *
 * ⚠️ CE MODULE NE DIT PAS QUEL DÉLAI S'APPLIQUE. Il sait seulement où finit un
 * délai donné : la durée vient du référentiel, et c'est l'appelant qui dit si
 * le report au premier jour ouvrable s'applique. Il s'applique aux délais de
 * procédure (`PARAMETRES.reportDelaiJourNonOuvrable`) ; pour la prescription,
 * son application n'a pas été relevée, et l'appelant ne le demande pas.
 *
 * ⚠️ LES FÊTES LÉGALES VIENNENT DU REGISTRE. Seul le dimanche de Pâques se
 * calcule ici : c'est de l'astronomie calendaire, pas du droit.
 */

export type UniteDelai = 'jours' | 'mois' | 'annees';

export interface Duree {
	readonly valeur: number;
	readonly unite: UniteDelai;
}

export interface FinDeDelai {
	/** Le dernier jour utile. */
	readonly fin: string;
	/** Le jour où le délai aurait fini sans report, quand il a été reporté. */
	readonly reporteeDe: string | null;
}

function deuxChiffres(nombre: number): string {
	return nombre.toString().padStart(2, '0');
}

/** Le dimanche de Pâques du calendrier grégorien (algorithme anonyme, dit de Meeus). */
export function paques(annee: number): string {
	const a = annee % 19;
	const b = Math.floor(annee / 100);
	const c = annee % 100;
	const d = Math.floor(b / 4);
	const e = b % 4;
	const f = Math.floor((b + 8) / 25);
	const g = Math.floor((b - f + 1) / 3);
	const h = (19 * a + b - d - g + 15) % 30;
	const i = Math.floor(c / 4);
	const k = c % 4;
	const l = (32 + 2 * e + 2 * i - h - k) % 7;
	const m = Math.floor((a + 11 * h + 22 * l) / 451);
	const mois = Math.floor((h + l - 7 * m + 114) / 31);
	const jour = ((h + l - 7 * m + 114) % 31) + 1;
	return `${annee}-${deuxChiffres(mois)}-${deuxChiffres(jour)}`;
}

/** Les onze fêtes légales d'une année, en dates ISO. */
export function joursFeries(annee: number): readonly string[] {
	const dimancheDePaques = paques(annee);
	return exiger(PARAMETRES.joursFeriesLegaux).map((regle) => {
		const mobile = /^PAQUES\+(\d+)$/.exec(regle);
		if (mobile !== null) return ajouterJours(dimancheDePaques, Number(mobile[1]));
		if (!/^\d{2}-\d{2}$/.test(regle)) {
			throw new Error(`Règle de jour férié illisible au référentiel : « ${regle} ».`);
		}
		return `${annee}-${regle}`;
	});
}

/** Ni samedi, ni dimanche, ni fête légale. */
export function estJourOuvrable(date: string): boolean {
	if (!estDateReelle(date)) {
		throw new Error(`Date attendue au format AAAA-MM-JJ et existante, reçue : ${JSON.stringify(date)}`);
	}
	const jourDeLaSemaine = new Date(`${date}T00:00:00Z`).getUTCDay();
	if (jourDeLaSemaine === 0 || jourDeLaSemaine === 6) return false;
	return !joursFeries(Number.parseInt(date.slice(0, 4), 10)).includes(date);
}

/**
 * Le dernier jour d'un délai.
 *
 * En jours, le jour du départ ne compte pas : un délai de 15 jours ouvert le 2
 * finit le 17. En mois ou en années, le délai finit le même quantième, ou le
 * dernier jour du mois quand ce quantième n'existe pas (641, al. 2).
 */
export function finDeDelai(
	depart: string,
	duree: Duree,
	options: { readonly reporterJourNonOuvrable: boolean }
): FinDeDelai {
	if (!Number.isInteger(duree.valeur) || duree.valeur < 0) {
		throw new Error(`Durée de délai invalide : ${duree.valeur} ${duree.unite}.`);
	}

	let fin: string;
	if (duree.unite === 'jours') {
		fin = ajouterJours(depart, duree.valeur);
	} else {
		exiger(PARAMETRES.computationDelaisMois);
		fin = ajouterMois(depart, duree.unite === 'mois' ? duree.valeur : duree.valeur * 12);
	}

	if (!options.reporterJourNonOuvrable) return { fin, reporteeDe: null };

	exiger(PARAMETRES.reportDelaiJourNonOuvrable);
	let reportee = fin;
	while (!estJourOuvrable(reportee)) reportee = ajouterJours(reportee, 1);
	return { fin: reportee, reporteeDe: reportee === fin ? null : fin };
}
```

- [ ] **Step 4 : Lancer les tests**

Run : `bunx vitest run src/lib/verticales/recouvrement/__tests__/delais.test.ts`
Expected : PASS (10 tests).

- [ ] **Step 5 : Commit**

```bash
git add src/lib/verticales/recouvrement/delais.ts src/lib/verticales/recouvrement/__tests__/delais.test.ts
git commit --no-verify -m "feat(delais): la fin d'un delai de procedure, feries et report au premier jour ouvrable" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3 : L'échéance de signification suit le report au jour ouvrable

**Files:**
- Modify: `src/lib/verticales/recouvrement/procedures.ts:44-56` (interface `Echeance`)
- Modify: `src/lib/verticales/recouvrement/apres-procedure.ts` (import ; échéance `signification`, vers la ligne 183)
- Test: `src/lib/verticales/recouvrement/__tests__/apres-procedure.test.ts:177-191`

**Interfaces:**
- Consumes : `finDeDelai` (Task 2) ; `dateLisible(date)` de `./calendrier`.
- Produces : `Echeance.reporteeDe?: string` — la date où le délai aurait fini sans report.

- [ ] **Step 1 : Écrire le test qui échoue**

Dans `src/lib/verticales/recouvrement/__tests__/apres-procedure.test.ts`, dans le test `'fait basculer le jour même, pas le lendemain'`, remplacer :

```ts
		expect(laVeille!.dateLimite).toBe('2027-02-28');
```

par :

```ts
		// Six mois (ancien régime) depuis le 31 août 2026 : le 28 février 2027, par le
		// dernier jour du mois (641, al. 2). C'est un dimanche : le délai court
		// jusqu'au lundi 1er mars (642).
		expect(laVeille!.dateLimite).toBe('2027-03-01');
		expect(laVeille!.reporteeDe).toBe('2027-02-28');
		expect(laVeille!.consequence).toMatch(/premier jour ouvrable/);
```

Et, juste après `expect(leJour!.dateLimite).toBe('2026-12-01');`, ajouter :

```ts
		// Le mardi 1er décembre 2026 est ouvrable : aucun report.
		expect(leJour!.reporteeDe).toBeUndefined();
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run : `bunx vitest run src/lib/verticales/recouvrement/__tests__/apres-procedure.test.ts`
Expected : FAIL — `expected '2027-02-28' to be '2027-03-01'`.

- [ ] **Step 3 : Ajouter le champ à `Echeance`**

Dans `src/lib/verticales/recouvrement/procedures.ts`, dans `export interface Echeance`, après `readonly dateLimite: string;`, ajouter :

```ts
	/**
	 * Le jour où le délai aurait fini sans le report au premier jour ouvrable
	 * (code de procédure civile, 642). Absent quand il n'y a pas eu de report.
	 */
	readonly reporteeDe?: string;
```

- [ ] **Step 4 : Brancher la signification sur `finDeDelai`**

Dans `src/lib/verticales/recouvrement/apres-procedure.ts`, remplacer la première ligne :

```ts
import { ajouterJours, ajouterMois } from './calendrier';
```

par :

```ts
import { ajouterJours, ajouterMois, dateLisible } from './calendrier';
import { finDeDelai } from './delais';
```

Puis, dans l'échéance `signification`, remplacer :

```ts
				return [
					{
						cle: 'signification',
						libelle: 'Signification de l’ordonnance',
						dateLimite: ajouterMois(depuisLe, mois),
						gravite: 'CADUCITE',
						consequence:
							`Passé ce délai de ${mois} mois, l’ordonnance est caduque. La créance n’est ` +
							'pas éteinte, mais la procédure est à reprendre depuis le début, et le temps ' +
							'écoulé rapproche la prescription.'
					}
				];
```

par :

```ts
				// Un délai de procédure : il finit le dernier jour du mois quand le
				// quantième manque, et il est reporté au premier jour ouvrable (642).
				const { fin, reporteeDe } = finDeDelai(
					depuisLe,
					{ valeur: mois, unite: 'mois' },
					{ reporterJourNonOuvrable: true }
				);
				return [
					{
						cle: 'signification',
						libelle: 'Signification de l’ordonnance',
						dateLimite: fin,
						...(reporteeDe === null ? {} : { reporteeDe }),
						gravite: 'CADUCITE',
						consequence:
							`Passé ce délai de ${mois} mois, l’ordonnance est caduque. La créance n’est ` +
							'pas éteinte, mais la procédure est à reprendre depuis le début, et le temps ' +
							'écoulé rapproche la prescription.' +
							(reporteeDe === null
								? ''
								: ` Le délai finissait le ${dateLisible(reporteeDe)}, un jour non ouvrable : ` +
									'il est reporté au premier jour ouvrable suivant.')
					}
				];
```

Si `ajouterMois` n'est plus employé ailleurs dans le fichier, l'import reste nécessaire pour la procédure L.126 (ligne `ajouterMois(depuisLe, moisContestation)`) : ne pas le retirer.

- [ ] **Step 5 : Lancer les tests de la procédure et de la surveillance**

Run : `bunx vitest run src/lib/verticales/recouvrement/__tests__/apres-procedure.test.ts src/lib/verticales/recouvrement/__tests__/surveillance.test.ts src/lib/convex/__tests__/apresProcedure.test.ts`
Expected : PASS. Si un autre attendu de date de signification change, vérifier au calendrier que la date d'origine tombe un samedi, un dimanche ou une fête légale, puis mettre l'attendu à jour avec un commentaire qui nomme ce jour.

- [ ] **Step 6 : Commit**

```bash
git add src/lib/verticales/recouvrement/procedures.ts src/lib/verticales/recouvrement/apres-procedure.ts src/lib/verticales/recouvrement/__tests__/apres-procedure.test.ts
git commit --no-verify -m "feat(procedure): l'echeance de signification reportee au premier jour ouvrable" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4 : Le taux imprimé exact, et une seule implémentation

**Files:**
- Create: `src/lib/verticales/recouvrement/taux-lisible.ts`
- Test: `src/lib/verticales/recouvrement/__tests__/taux-lisible.test.ts`
- Modify: `src/lib/verticales/recouvrement/piece.ts` (fonction locale `tauxLisible`, vers la ligne 191)
- Modify: `src/ui/format.ts:100-113`

**Interfaces:**
- Produces : `tauxLisible(taux: { numerateur: bigint; denominateur: bigint }): string` — au moins deux décimales, jusqu'à six, « … » quand le taux ne s'écrit pas exactement.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `src/lib/verticales/recouvrement/__tests__/taux-lisible.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { fraction } from '../../../socle/montants';
import { tauxLisible } from '../taux-lisible';

describe('le taux imprimé', () => {
	it('garde deux décimales au minimum', () => {
		expect(tauxLisible(fraction(1240n, 10000n))).toBe('12,40 %');
		expect(tauxLisible(fraction(500n, 10000n))).toBe('5,00 %');
		expect(tauxLisible(fraction(0n, 10000n))).toBe('0,00 %');
	});

	it('ne tronque plus la troisième décimale', () => {
		// 12,345 % s'imprimait « 12,34 % » : le lecteur qui refait le calcul
		// n'aurait pas retrouvé les intérêts du décompte.
		expect(tauxLisible(fraction(12345n, 100000n))).toBe('12,345 %');
	});

	it('signale un taux qui ne s’écrit pas exactement', () => {
		// Un tiers : le calcul reste exact en fraction, l'affichage le dit.
		expect(tauxLisible(fraction(1n, 3n))).toBe('33,333333… %');
	});
});
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run : `bunx vitest run src/lib/verticales/recouvrement/__tests__/taux-lisible.test.ts`
Expected : FAIL — `Failed to resolve import "../taux-lisible"`.

- [ ] **Step 3 : Écrire le module**

Créer `src/lib/verticales/recouvrement/taux-lisible.ts` :

```ts
/**
 * Le taux annuel en pourcentage, pour l'œil.
 *
 * ⚠️ LA SEULE IMPLÉMENTATION DU PRODUIT. La pièce et l'écran avaient chacun la
 * leur, et les deux tronquaient à deux décimales : un taux de 12,345 %
 * s'imprimait 12,34 %, et le débiteur qui refaisait le calcul ne retrouvait pas
 * les intérêts réclamés. Le taux reste une fraction exacte partout ailleurs ; la
 * division n'a lieu qu'ici.
 */

const DECIMALES_MINIMUM = 2;
const DECIMALES_MAXIMUM = 6;

export function tauxLisible(taux: { numerateur: bigint; denominateur: bigint }): string {
	const centieme = taux.numerateur * 100n;
	const entier = centieme / taux.denominateur;
	let reste = centieme % taux.denominateur;

	let decimales = '';
	while (decimales.length < DECIMALES_MAXIMUM && (reste !== 0n || decimales.length < DECIMALES_MINIMUM)) {
		reste *= 10n;
		decimales += (reste / taux.denominateur).toString();
		reste %= taux.denominateur;
	}

	return `${entier},${decimales}${reste === 0n ? '' : '…'} %`;
}
```

- [ ] **Step 4 : Lancer le test**

Run : `bunx vitest run src/lib/verticales/recouvrement/__tests__/taux-lisible.test.ts`
Expected : PASS (3 tests).

- [ ] **Step 5 : Faire lire cette implémentation par la pièce et par l'écran**

Dans `src/lib/verticales/recouvrement/piece.ts`, supprimer la fonction locale :

```ts
/**
 * Le taux en pourcentage. **La division n'a lieu qu'ici**, pour l'œil.
 *
 * Il arrive en fraction exacte et le reste partout ailleurs : le convertir plus
 * tôt réintroduirait un flottant dans une chaîne qui n'en contient aucun.
 */
function tauxLisible(taux: { numerateur: bigint; denominateur: bigint }): string {
	const pourMille = (taux.numerateur * 10_000n) / taux.denominateur;
	return `${pourMille / 100n},${(pourMille % 100n).toString().padStart(2, '0')} %`;
}
```

et ajouter en tête du fichier, après l'import de `./calendrier` :

```ts
import { tauxLisible } from './taux-lisible';
```

Dans `src/ui/format.ts`, remplacer la fonction `export function tauxLisible(...) { ... }` (son commentaire au-dessus reste) par :

```ts
export { tauxLisible } from '../lib/verticales/recouvrement/taux-lisible';
```

- [ ] **Step 6 : Lancer les tests de l'écran et de la pièce**

Run : `bunx vitest run src/ui/__tests__/format.test.ts src/lib/verticales/recouvrement/__tests__/piece.test.ts src/lib/verticales/recouvrement/__tests__/taux-lisible.test.ts`
Expected : PASS.

- [ ] **Step 7 : Commit**

```bash
git add src/lib/verticales/recouvrement/taux-lisible.ts src/lib/verticales/recouvrement/__tests__/taux-lisible.test.ts src/lib/verticales/recouvrement/piece.ts src/ui/format.ts
git commit --no-verify -m "fix(decompte): le taux imprime exact, et une seule facon de l'ecrire" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5 : L'ordre d'imputation dans le calcul

**Files:**
- Modify: `src/lib/verticales/recouvrement/decompte.ts` (types, `decompterFacture`, `decompterCreance`)
- Modify: `src/lib/verticales/recouvrement/controle.ts` (type de `ArgumentsControle.decompte`)
- Modify: `src/lib/verticales/recouvrement/revelation.ts` (appel de `decompterFacture`)
- Modify (appels mis à jour) : `src/lib/convex/recouvrement/decompte.ts` (`projeterDecompte`, provisoirement), `src/marketing/etapes.tsx`, `src/routes/-salle/creance.tsx`, `src/routes/-salle/piece.tsx`, `src/routes/-salle/revelation.ts`
- Test: `src/lib/verticales/recouvrement/__tests__/decompte.test.ts`, et appels mis à jour dans `controle.test.ts`, `pays/france/__tests__/taux.test.ts`, `import/__tests__/exportComptable.test.ts`

**Interfaces:**
- Produces :
  - `type OrdreImputation = 'PENALITES_DABORD' | 'PRINCIPAL_DABORD'`
  - `type ChoixImputation = OrdreImputation | 'A_CONFIRMER'`
  - `interface ImputationDuDecompte { readonly ordre: OrdreImputation; readonly confirme: boolean; readonly totalAutreOrdre: Montant | null }`
  - `decompterFacture(facture: FacturePourDecompte, arreteAu: string, convention: ConventionJours, ordre: OrdreImputation): LigneDecompte`
  - `decompterCreance(factures: readonly FacturePourDecompte[], arreteAu: string, convention: ConventionJours, choix: ChoixImputation): DecompteCreance`
  - `DecompteCreance.imputation: ImputationDuDecompte`

- [ ] **Step 1 : Écrire les tests qui échouent**

Dans `src/lib/verticales/recouvrement/__tests__/decompte.test.ts`, remplacer l'import :

```ts
import { decompterFacture, decompterCreance, joursEntre } from '../decompte';
```

par :

```ts
import { decompterFacture, decompterCreance, joursEntre } from '../decompte';
import { PARAMETRES, exiger } from '../parametres';
```

puis ajouter à la fin du fichier :

```ts
describe('l’ordre d’imputation — un choix du gérant', () => {
	const AVEC_PAIEMENT = facture({
		reglements: [{ date: '2025-07-01', montant: depuisEuros('4000,00'), nature: 'PAIEMENT' }]
	});

	it('impute un paiement d’abord sur le principal quand c’est l’ordre choisi', () => {
		// Paiement de 4 000,00 € le 2025-07-01, principal d'abord.
		//   segment 1 : 181 j sur 10 000,00 € → 49 589 c courus
		//   le paiement va entier au principal : 1 000 000 − 400 000 = 600 000 c
		//   segment 2 : 184 j sur 6 000,00 € → 600 000 × 10 × 184 / 36 500 = 30 246,57… → 30 247 c
		//   intérêts = 49 589 + 30 247 = 79 836 c ; total = 600 000 + 79 836 + 4 000 = 683 836 c
		const d = decompterFacture(AVEC_PAIEMENT, '2026-01-01', 'ACT_365', 'PRINCIPAL_DABORD');
		expect(versEuros(d.principalRestantDu)).toBe('6 000,00');
		expect(versEuros(d.interets)).toBe('798,36');
		expect(versEuros(d.total)).toBe('6 838,36');
		expect(versEuros(d.imputations[0]!.surInterets)).toBe('0,00');
	});

	it('retient le total le plus bas tant que le gérant n’a pas choisi, et chiffre l’autre', () => {
		// Pénalités d'abord : 6 863,35 € (voir plus haut). Principal d'abord : 6 838,36 €.
		// Le doute ne profite jamais au produit : c'est le second qui est retenu.
		const d = decompterCreance([AVEC_PAIEMENT], '2026-01-01', 'ACT_365', 'A_CONFIRMER');
		expect(versEuros(d.total)).toBe('6 838,36');
		expect(d.imputation.ordre).toBe('PRINCIPAL_DABORD');
		expect(d.imputation.confirme).toBe(false);
		expect(versEuros(d.imputation.totalAutreOrdre!)).toBe('6 863,35');
	});

	it('applique l’ordre confirmé, sans chiffrer d’autre variante', () => {
		const d = decompterCreance([AVEC_PAIEMENT], '2026-01-01', 'ACT_365', 'PENALITES_DABORD');
		expect(versEuros(d.total)).toBe('6 863,35');
		expect(d.imputation).toEqual({ ordre: 'PENALITES_DABORD', confirme: true, totalAutreOrdre: null });
	});

	it('ne demande rien quand les deux ordres donnent le même total', () => {
		// Aucun paiement : l'ordre ne change rien, il n'y a pas de variante à montrer.
		const d = decompterCreance([facture()], '2026-01-01', 'ACT_365', 'A_CONFIRMER');
		expect(d.imputation.totalAutreOrdre).toBeNull();
	});
});

describe('aucun jour de pénalité compté en trop', () => {
	it('compte exactement les jours de retard, de l’échéance à l’arrêté', () => {
		// Échéance le 2025-01-01, arrêté le 2025-01-31 : 30 jours de retard. Que l'on
		// compte de l'échéance incluse à l'arrêté exclu, ou du lendemain de
		// l'échéance à l'arrêté inclus (L441-10 II), c'est le même nombre.
		expect(exiger(PARAMETRES.pointDepartPenalitesRetard)).toBe('LENDEMAIN_ECHEANCE');
		const d = decompterFacture(facture(), '2025-01-31', 'ACT_365', 'PENALITES_DABORD');
		expect(d.segments.reduce((jours, s) => jours + s.jours, 0)).toBe(30);
	});
});
```

- [ ] **Step 2 : Mettre à jour les appels existants dans les tests**

Chaque appel existant `decompterFacture(<facture>, '<date>', '<convention>')` reçoit le quatrième argument `'PENALITES_DABORD'` (la règle qu'appliquaient ces tests depuis le 25/09), et chaque `decompterCreance(<factures>, '<date>', '<convention>')` reçoit `'PENALITES_DABORD'`. Les appels multi-lignes se terminent par `'ACT_365'\n\t\t)` ou `'ACT_ACT'\n\t\t)`.

Run :

```bash
perl -0pi -e "s/(decompter(?:Facture|Creance)\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*?'ACT_(?:365|ACT)')(\s*)\)/\$1,\$2'PENALITES_DABORD'\$2)/g" src/lib/verticales/recouvrement/__tests__/decompte.test.ts src/lib/verticales/recouvrement/__tests__/controle.test.ts src/lib/verticales/recouvrement/pays/france/__tests__/taux.test.ts src/lib/verticales/recouvrement/import/__tests__/exportComptable.test.ts
```

Le compilateur est la vérification : après l'étape 6, `bun run check` signale tout appel qui n'a pas exactement quatre arguments (`Expected 4 arguments`). Les appels écrits à l'étape 1 portent déjà leur ordre : si le remplacement leur en a ajouté un cinquième, le retirer à la main.

- [ ] **Step 3 : Lancer les tests pour les voir échouer**

Run : `bunx vitest run src/lib/verticales/recouvrement/__tests__/decompte.test.ts`
Expected : FAIL — `d.imputation` est `undefined`, et `PRINCIPAL_DABORD` impute encore le paiement sur les pénalités.

- [ ] **Step 4 : Écrire les types**

Dans `src/lib/verticales/recouvrement/decompte.ts`, juste avant `export interface DecompteCreance`, ajouter :

```ts
/**
 * L'ordre dans lequel un PAIEMENT éteint ce qui est dû sur une facture.
 *
 * ⚠️ C'EST UN CHOIX JURIDIQUE, ET IL REVIENT AU GÉRANT. Le code civil pose « les
 * intérêts d'abord » (`PARAMETRES.imputationPaiementPartiel`), mais la règle cède
 * devant le contrat, et ce logiciel ne lit pas encore les conditions générales.
 * Il chiffre donc les deux ordres tant que le gérant n'a pas choisi, et retient
 * le plus bas : le doute ne profite jamais au produit. Un avoir, ou un crédit de
 * nature inconnue, va toujours au principal, quel que soit l'ordre.
 */
export type OrdreImputation = 'PENALITES_DABORD' | 'PRINCIPAL_DABORD';

/** L'ordre confirmé par le gérant, ou l'absence de choix. */
export type ChoixImputation = OrdreImputation | 'A_CONFIRMER';

export interface ImputationDuDecompte {
	/** L'ordre appliqué au décompte. */
	readonly ordre: OrdreImputation;
	/** `false` : le gérant n'a pas choisi, et c'est le total le plus bas qui est retenu. */
	readonly confirme: boolean;
	/** Le total de l'autre ordre, quand le gérant n'a pas choisi et qu'il diffère. */
	readonly totalAutreOrdre: Montant | null;
}
```

puis, dans `export interface DecompteCreance`, après `readonly convention: ConventionJours;`, ajouter :

```ts
	readonly imputation: ImputationDuDecompte;
```

- [ ] **Step 5 : Faire suivre l'ordre à `decompterFacture`**

Dans `decompterFacture`, remplacer la signature :

```ts
export function decompterFacture(
	facture: FacturePourDecompte,
	arreteAu: string,
	convention: ConventionJours
): LigneDecompte {
	// Lu pour être cité : la règle vit au registre, pas ici.
	exiger(PARAMETRES.imputationPaiementPartiel);
```

par :

```ts
export function decompterFacture(
	facture: FacturePourDecompte,
	arreteAu: string,
	convention: ConventionJours,
	ordre: OrdreImputation
): LigneDecompte {
	// Lus pour être cités : les règles vivent au registre, pas ici.
	exiger(PARAMETRES.imputationPaiementPartiel);
	exiger(PARAMETRES.pointDepartPenalitesRetard);
```

puis remplacer le corps de la fonction interne `imputer` :

```ts
	function imputer(reglement: Reglement) {
		// Seul un PAIEMENT (ou un acompte) s'impute sur les pénalités. Un avoir réduit
		// le prix ; un crédit de nature inconnue est traité comme lui. Et jamais
		// au-delà de ce qui a couru : un trop-perçu antérieur ne rend pas négative la
		// part d'un règlement suivant.
		const surInterets =
			reglement.nature === 'AVOIR' || reglement.nature === 'CREDIT' || (interetsDus as bigint) <= 0n
				? ZERO
				: plusPetit(reglement.montant, interetsDus);
		const surPrincipal = soustraire(reglement.montant, surInterets);
```

par :

```ts
	function imputer(reglement: Reglement) {
		// Seul un PAIEMENT (ou un acompte) s'impute sur les pénalités. Un avoir réduit
		// le prix ; un crédit de nature inconnue est traité comme lui. Et jamais
		// au-delà de ce qui a couru : un trop-perçu antérieur ne rend pas négative la
		// part d'un règlement suivant.
		const penalitesImputables =
			(reglement.nature === 'PAIEMENT' || reglement.nature === 'ACOMPTE') &&
			(interetsDus as bigint) > 0n
				? interetsDus
				: ZERO;

		let surInterets: Montant;
		if (ordre === 'PENALITES_DABORD') {
			surInterets = plusPetit(reglement.montant, penalitesImputables);
		} else {
			// Principal d'abord : ce qui dépasse le principal restant va aux pénalités.
			const principalImputable = (principal as bigint) > 0n ? principal : ZERO;
			const reste = soustraire(reglement.montant, plusPetit(reglement.montant, principalImputable));
			surInterets = plusPetit(reste, penalitesImputables);
		}
		const surPrincipal = soustraire(reglement.montant, surInterets);
```

(la suite de `imputer` — les deux affectations et le `imputations.push` — reste identique).

- [ ] **Step 6 : Faire choisir `decompterCreance`**

Remplacer toute la fonction `decompterCreance` par :

```ts
/**
 * Le décompte d'une créance entière — plusieurs factures d'un même débiteur.
 *
 * L'INDEMNITÉ FORFAITAIRE SE COMPTE PAR FACTURE, jamais par créance. C'est
 * l'erreur la plus facile à commettre en agrégeant, et elle se paie dans les
 * deux sens : comptée une fois sur dix factures, neuf indemnités sont
 * abandonnées ; comptée par créance sur une facture unique, rien ne change et
 * le bug reste invisible jusqu'au premier dossier groupé.
 *
 * ⚠️ SANS CHOIX DU GÉRANT, LES DEUX ORDRES D'IMPUTATION SONT CHIFFRÉS, et le plus
 * bas est retenu, avec l'autre total à côté. C'est ce qui permet à l'écran de
 * dire ce que le choix change, en euros, avant que le gérant le fasse.
 */
export function decompterCreance(
	factures: readonly FacturePourDecompte[],
	arreteAu: string,
	convention: ConventionJours,
	choix: ChoixImputation
): DecompteCreance {
	const selon = (ordre: OrdreImputation) =>
		assembler(
			factures.map((facture) => decompterFacture(facture, arreteAu, convention, ordre)),
			arreteAu,
			convention
		);

	if (choix !== 'A_CONFIRMER') {
		return { ...selon(choix), imputation: { ordre: choix, confirme: true, totalAutreOrdre: null } };
	}

	const penalites = selon('PENALITES_DABORD');
	const principal = selon('PRINCIPAL_DABORD');
	if ((principal.total as bigint) === (penalites.total as bigint)) {
		return {
			...penalites,
			imputation: { ordre: 'PENALITES_DABORD', confirme: false, totalAutreOrdre: null }
		};
	}
	return (principal.total as bigint) < (penalites.total as bigint)
		? {
				...principal,
				imputation: { ordre: 'PRINCIPAL_DABORD', confirme: false, totalAutreOrdre: penalites.total }
			}
		: {
				...penalites,
				imputation: { ordre: 'PENALITES_DABORD', confirme: false, totalAutreOrdre: principal.total }
			};
}

function assembler(
	lignes: readonly LigneDecompte[],
	arreteAu: string,
	convention: ConventionJours
): Omit<DecompteCreance, 'imputation'> {
	const principalRestantDu = additionner(...lignes.map((l) => l.principalRestantDu));
	const interets = additionner(...lignes.map((l) => l.interets));
	const indemniteForfaitaire = additionner(...lignes.map((l) => l.indemniteForfaitaire));

	return {
		lignes,
		principalRestantDu,
		interets,
		indemniteForfaitaire,
		total: additionner(principalRestantDu, interets, indemniteForfaitaire),
		arreteAu,
		convention
	};
}
```

- [ ] **Step 7 : Laisser le contrôle accepter un décompte figé sans imputation**

Dans `src/lib/verticales/recouvrement/controle.ts`, dans `interface ArgumentsControle`, remplacer :

```ts
	readonly decompte: DecompteCreance;
```

par :

```ts
	/**
	 * Sans `imputation` : le contrôle n'en a pas besoin, et un décompte figé avant
	 * le lot 1 de la page dossier n'en porte pas.
	 */
	readonly decompte: Omit<DecompteCreance, 'imputation'>;
```

- [ ] **Step 8 : Mettre à jour les autres appelants du calcul**

1. `src/lib/verticales/recouvrement/revelation.ts` — remplacer `const decompte = decompterFacture(facture, arreteAu, convention);` par :

```ts
			// ⚠️ L'ORDRE PRUDENT. La révélation couvre tout le portefeuille, sans choix du
			// gérant facture par facture : elle retient l'ordre qui réclame le moins.
			const decompte = decompterFacture(facture, arreteAu, convention, 'PRINCIPAL_DABORD');
```

2. `src/lib/convex/recouvrement/decompte.ts`, dans `projeterDecompte` — remplacer `return { decompte: decompterCreance(pourDecompte, arreteAu, convention), refus: null };` par :

```ts
		return {
			decompte: decompterCreance(pourDecompte, arreteAu, convention, 'A_CONFIRMER'),
			refus: null
		};
```

(la Task 6 remplace `'A_CONFIRMER'` par le choix stocké).

3. `src/marketing/etapes.tsx` — dans `const DECOMPTE: DecompteAffiche = decompterCreance(`, remplacer `	'ACT_365'\n);` par `	'ACT_365',\n	'PENALITES_DABORD'\n);`.

4. `src/routes/-salle/creance.tsx` — dans `const DECOMPTE_DEMO: DecompteAffiche = decompterCreance(`, ajouter `'A_CONFIRMER'` comme quatrième argument : la salle doit montrer l'état « à confirmer » et son choix.

5. `src/routes/-salle/piece.tsx` (deux appels) et `src/routes/-salle/revelation.ts` (deux appels) — ajouter `'PENALITES_DABORD'` comme quatrième argument de chaque `decompterCreance(`.

- [ ] **Step 9 : Lancer les tests et le typage**

Run : `bunx vitest run src/lib/verticales/recouvrement && bun run check`
Expected : PASS, et `tsc` sans erreur. Un test de `revelation.test.ts` qui porte un paiement peut changer d'attendu (l'ordre prudent) : recalculer l'attendu à la main en imputant le paiement sur le principal, et l'écrire en commentaire.

- [ ] **Step 10 : Commit**

```bash
git add src/lib/verticales/recouvrement src/lib/convex/recouvrement/decompte.ts src/marketing/etapes.tsx src/routes/-salle
git commit --no-verify -m "feat(decompte): l'ordre d'imputation devient un choix du gerant, les deux variantes chiffrees d'ici la" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6 : Le choix stocké, et figé avec chaque décompte

**Files:**
- Modify: `src/lib/convex/recouvrement/tables.ts` (validateurs ; tables `creances` et `decomptes`)
- Modify: `src/lib/convex/recouvrement/creances.ts` (nouvelle mutation)
- Modify: `src/lib/convex/recouvrement/decompte.ts` (`projeterDecompte`, `figerDecompte`, validateur de retour et deux retours)
- Modify: `src/lib/convex/recouvrement/arret.ts` (validateur et construction de `projection`)
- Test: `src/lib/convex/__tests__/decompteRecouvrement.test.ts`

**Interfaces:**
- Consumes : `ChoixImputation`, `ImputationDuDecompte` (Task 5).
- Produces :
  - `vOrdreImputation`, `vImputationDuDecompte` (exportés de `tables.ts`) ;
  - `creances.ordreImputation?: 'PENALITES_DABORD' | 'PRINCIPAL_DABORD'`, `creances.ordreImputationChoisiLe?: number`, `creances.ordreImputationChoisiPar?: string` ;
  - `decomptes.imputation?: { ordre; confirme: boolean; totalAutreOrdre?: bigint }` ;
  - `api.recouvrement.creances.choisirOrdreImputation({ creanceId, ordre }) → null` ;
  - la projection de `arret.ts` et le décompte rendu par `decompte.ts` portent `imputation` (même forme que `decomptes.imputation`).

- [ ] **Step 1 : Écrire le test qui échoue**

Dans `src/lib/convex/__tests__/decompteRecouvrement.test.ts`, dans le test `'réduit la base d’intérêts à compter d’un règlement'`, remplacer tout le bloc `await t.run(async (ctx) => { … });` qui suit `figerDecompte` par :

```ts
			await t.run(async (ctx) => {
				const decompte = (await ctx.db.get(decompteId))!;
				// Le gérant n'a pas choisi l'ordre : les deux sont chiffrés, et le plus bas
				// est retenu — principal d'abord, le paiement va entier au principal.
				expect(versEuros(depuisCentimes(decompte.principalRestantDu))).toBe('6 000,00');
				expect(decompte.imputation!.ordre).toBe('PRINCIPAL_DABORD');
				expect(decompte.imputation!.confirme).toBe(false);
				expect(decompte.imputation!.totalAutreOrdre! > decompte.total).toBe(true);
				// Trois segments : exigibilité, changement de taux ET règlement
				// tombent le 1er juillet, donc deux ruptures confondues en une.
				expect(decompte.lignes[0]!.segments).toHaveLength(2);
			});
```

puis, juste après ce test (dans le même `describe`), ajouter :

```ts
	it(
		'applique l’ordre que le gérant a choisi',
		async () => {
			const t = convexTest(schema, modules);
			const { creanceId } = await poserCreance(t, {
				reglement: { date: '2026-07-01', montant: 400_000n }
			});
			await t.run(async (ctx) => {
				await ctx.db.patch(creanceId, { ordreImputation: 'PENALITES_DABORD' });
			});

			const decompteId = await t.mutation(internal.recouvrement.decompte.figerDecompte, {
				creanceId,
				arreteAu: '2026-09-01',
				convention: 'ACT_365'
			});

			await t.run(async (ctx) => {
				const decompte = (await ctx.db.get(decompteId))!;
				// Le règlement éteint D'ABORD les pénalités courues depuis le 1er mai :
				// 61 j à 12,15 % sur 10 000,00 € = 20 305 c, puis 379 695 c de principal.
				expect(versEuros(depuisCentimes(decompte.principalRestantDu))).toBe('6 203,05');
				expect(decompte.imputation).toEqual({ ordre: 'PENALITES_DABORD', confirme: true });
			});
		},
		DELAI_CONVEX
	);
```

Enfin, supprimer de ce fichier l'ancien attendu `expect(decompte.lignes[0]!.imputations).toEqual([...])` écrit le 25/09 s'il est encore présent dans le test modifié (il supposait les pénalités d'abord).

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run : `bunx vitest run src/lib/convex/__tests__/decompteRecouvrement.test.ts`
Expected : FAIL — `decompte.imputation` est `undefined` (et `ordreImputation` refusé par le schéma).

- [ ] **Step 3 : Déclarer les validateurs et les champs**

Dans `src/lib/convex/recouvrement/tables.ts`, après `export const vImputation = v.object({ … });`, ajouter :

```ts
/** L'ordre dans lequel un paiement éteint ce qui est dû. Voir `OrdreImputation` au domaine. */
export const vOrdreImputation = v.union(v.literal('PENALITES_DABORD'), v.literal('PRINCIPAL_DABORD'));

/**
 * L'ordre appliqué à un décompte, figé avec lui. `totalAutreOrdre` n'existe que
 * quand le gérant n'avait pas choisi et que l'autre ordre donnait un autre total.
 */
export const vImputationDuDecompte = v.object({
	ordre: vOrdreImputation,
	confirme: v.boolean(),
	totalAutreOrdre: v.optional(v.int64())
});
```

Dans la table `creances`, juste avant `qualifieeLe: v.optional(v.number()),`, ajouter :

```ts
		/**
		 * L'ORDRE D'IMPUTATION CHOISI PAR LE GÉRANT, une fois par dossier.
		 *
		 * ⚠️ ABSENT, IL N'EST PAS « LES PÉNALITÉS D'ABORD ». Absent veut dire « pas
		 * choisi » : le décompte chiffre alors les deux ordres et retient le plus bas.
		 */
		ordreImputation: v.optional(vOrdreImputation),
		ordreImputationChoisiLe: v.optional(v.number()),
		ordreImputationChoisiPar: v.optional(v.string()),
```

Dans la table `decomptes`, juste avant `produitLe: v.number()`, ajouter :

```ts
		/**
		 * L'ordre d'imputation appliqué, figé avec le décompte. ⚠️ FACULTATIF : un
		 * décompte figé avant le lot 1 de la page dossier n'en porte pas.
		 */
		imputation: v.optional(vImputationDuDecompte),
```

- [ ] **Step 4 : Écrire la mutation**

Dans `src/lib/convex/recouvrement/creances.ts`, remplacer l'import `import { vCleFaitLitige, vEtatCritere, vReponseFait } from './tables';` par :

```ts
import { vCleFaitLitige, vEtatCritere, vOrdreImputation, vReponseFait } from './tables';
```

puis ajouter à la fin du fichier :

```ts
/**
 * Le gérant choisit l'ordre d'imputation de ses paiements, pour ce dossier.
 *
 * ⚠️ C'EST UNE QUALIFICATION, ET ELLE LUI REVIENT. Le logiciel montre la règle du
 * code civil et ce que chaque ordre donne en euros ; il ne choisit pas. Le choix
 * vaut pour les décomptes FUTURS : un décompte figé garde l'ordre de son jour.
 */
export const choisirOrdreImputation = authedMutation({
	args: { creanceId: v.id('creances'), ordre: vOrdreImputation },
	returns: v.null(),
	handler: async (ctx, { creanceId, ordre }) => {
		const { organizationId, user } = await getUserOrg(ctx);
		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) {
			throw new ConvexError('Créance introuvable');
		}
		await ctx.db.patch(creanceId, {
			ordreImputation: ordre,
			ordreImputationChoisiLe: Date.now(),
			ordreImputationChoisiPar: user._id
		});
		return null;
	}
});
```

- [ ] **Step 5 : Faire passer le choix au calcul et le figer**

Dans `src/lib/convex/recouvrement/decompte.ts` :

1. Remplacer l'import `import { vConventionJours, vImputation, vTaux } from './tables';` par :

```ts
import { vConventionJours, vImputation, vImputationDuDecompte, vTaux } from './tables';
```

2. Dans `projeterDecompte`, remplacer `decompterCreance(pourDecompte, arreteAu, convention, 'A_CONFIRMER')` par :

```ts
decompterCreance(pourDecompte, arreteAu, convention, creance.ordreImputation ?? 'A_CONFIRMER')
```

3. Dans `figerDecompte`, dans l'objet passé à `ctx.db.insert('decomptes', { … })`, juste après `total: enCentimes(decompte.total),`, ajouter :

```ts
			imputation: {
				ordre: decompte.imputation.ordre,
				confirme: decompte.imputation.confirme,
				...(decompte.imputation.totalAutreOrdre === null
					? {}
					: { totalAutreOrdre: enCentimes(decompte.imputation.totalAutreOrdre) })
			},
```

4. Dans le validateur de retour du décompte (l'objet qui contient `lignes: v.array(v.object({ … segments …, imputations: v.optional(v.array(vImputation)) }))`), juste avant `abandons: v.array(`, ajouter :

```ts
	imputation: v.optional(vImputationDuDecompte),
```

5. Dans les deux fonctions qui rendent ce décompte (les deux objets qui contiennent `lignes: dernier.lignes,` et `lignes: decompte.lignes,`), ajouter la ligne suivante juste après chacune :

```ts
		imputation: dernier.imputation,
```

(respectivement `imputation: decompte.imputation,` dans le second).

- [ ] **Step 6 : Rendre l'imputation avec la projection**

Dans `src/lib/convex/recouvrement/arret.ts` :

1. Remplacer l'import `import { vConventionJours, vImputation, vTaux } from './tables';` par :

```ts
import { vConventionJours, vImputation, vImputationDuDecompte, vTaux } from './tables';
```

2. Dans le validateur de `projection`, remplacer `			lignes: v.array(vLigneProjetee)\n		})\n	),` par :

```ts
			lignes: v.array(vLigneProjetee),
			imputation: vImputationDuDecompte
		})
	),
```

3. Dans la construction de `projection`, juste avant `lignes: projection.decompte.lignes.map((ligne) => ({`, ajouter :

```ts
							imputation: {
								ordre: projection.decompte.imputation.ordre,
								confirme: projection.decompte.imputation.confirme,
								...(projection.decompte.imputation.totalAutreOrdre === null
									? {}
									: { totalAutreOrdre: enCentimes(projection.decompte.imputation.totalAutreOrdre) })
							},
```

- [ ] **Step 7 : Lancer les tests Convex et le typage**

Run : `bunx vitest run src/lib/convex/__tests__ && bun run check`
Expected : PASS. Les écrans ne compilent peut-être pas encore (Task 7) : si `tsc` signale seulement des fichiers de `src/routes/app` ou `src/screens`, c'est attendu ici et réglé à la Task 7.

- [ ] **Step 8 : Commit**

```bash
git add src/lib/convex/recouvrement src/lib/convex/__tests__/decompteRecouvrement.test.ts
git commit --no-verify -m "feat(decompte): le choix de l'ordre d'imputation stocke sur le dossier, et fige avec chaque decompte" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7 : Montrer l'ordre, la variante, et laisser choisir

**Files:**
- Modify: `src/ui/decompte.tsx` (types, composant `Decompte`)
- Modify: `src/screens/creance.tsx` (`CreanceOuverte`, `SectionDecompte`)
- Modify: `src/routes/app/creance.$id.tsx` (mutation, `montantDuJour`, pièce)
- Modify: `src/routes/app/decompte.$id.tsx` (pièce)
- Modify: `src/routes/app/arret.$id.tsx` (projection)
- Modify: `src/routes/-salle/creance.tsx` (rappel de la salle)
- Modify: `src/lib/verticales/recouvrement/piece.ts` (type `DecompteFige`, fondements)
- Test: `src/lib/verticales/recouvrement/__tests__/piece.test.ts`

**Interfaces:**
- Consumes : `api.recouvrement.creances.choisirOrdreImputation` et `imputation` des retours (Task 6).
- Produces : `DecompteAffiche.imputation?: ImputationAffichee` ; `Decompte` accepte `onChoisirImputation?: (ordre: OrdreImputationAffichee) => void` ; `CreanceOuverte.onChoisirImputation?` ; `DecompteFige.imputation?: { ordre; confirme: boolean; totalAutreOrdre: Montant | null }`.

- [ ] **Step 1 : Écrire le test de la pièce qui échoue**

Dans `src/lib/verticales/recouvrement/__tests__/piece.test.ts` (qui importe déjà `PARAMETRES` et fournit l'assistant `decompte(surcharge)`), ajouter à la fin du fichier :

```ts
describe('l’ordre d’imputation, dit par la pièce', () => {
	// Le décompte de démonstration ne porte aucun règlement : on lui en donne un,
	// sans quoi la pièce n'a aucune raison de parler d'imputation.
	const AVEC_REGLEMENT = decompte().lignes.map((ligne) => ({
		...ligne,
		imputations: [
			{
				date: '2025-07-01',
				nature: 'PAIEMENT' as const,
				montant: depuisEuros('4000,00'),
				surInterets: depuisEuros('0,00'),
				surPrincipal: depuisEuros('4000,00')
			}
		]
	}));

	it('dit que l’ordre n’a pas été confirmé, et que le calcul le plus bas est retenu', () => {
		const piece = composerPiece(
			decompte({
				lignes: AVEC_REGLEMENT,
				imputation: { ordre: 'PRINCIPAL_DABORD', confirme: false, totalAutreOrdre: null }
			})
		);
		const fondements = piece.fondements.join(' ');
		expect(fondements).toMatch(/d’abord sur le principal/);
		expect(fondements).toMatch(/non confirmé par le créancier/);
	});

	it('dit l’ordre choisi par le créancier', () => {
		const piece = composerPiece(
			decompte({
				lignes: AVEC_REGLEMENT,
				imputation: { ordre: 'PENALITES_DABORD', confirme: true, totalAutreOrdre: null }
			})
		);
		expect(piece.fondements.join(' ')).toMatch(/Ordre choisi par le créancier/);
	});

	it('cite pour le « par facture » la source qui le dit', () => {
		const piece = composerPiece(decompte());
		expect(piece.fondements.join(' ')).toContain(PARAMETRES.indemniteParFacture.source);
	});
});
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run : `bunx vitest run src/lib/verticales/recouvrement/__tests__/piece.test.ts`
Expected : FAIL — `imputation` n'existe pas sur `DecompteFige`, et les fondements ne citent pas `indemniteParFacture`.

- [ ] **Step 3 : Faire dire l'ordre par la pièce**

Dans `src/lib/verticales/recouvrement/piece.ts` :

1. Dans `export interface DecompteFige`, après `readonly lignes: readonly LigneFigee[];`, ajouter :

```ts
	/**
	 * L'ordre d'imputation figé avec le décompte. Absent d'un décompte figé avant le
	 * lot 1 de la page dossier.
	 */
	readonly imputation?: {
		readonly ordre: 'PENALITES_DABORD' | 'PRINCIPAL_DABORD';
		readonly confirme: boolean;
		readonly totalAutreOrdre: Montant | null;
	};
```

2. Remplacer le fondement de l'indemnité :

```ts
			`Indemnité forfaitaire de recouvrement, ${euros(
				depuisCentimes(exiger(PARAMETRES.indemniteForfaitaire))
			)} par facture non réglée à son échéance : ${PARAMETRES.indemniteForfaitaire.source}.`,
```

par :

```ts
			`Indemnité forfaitaire de recouvrement, ${euros(
				depuisCentimes(exiger(PARAMETRES.indemniteForfaitaire))
			)} : ${PARAMETRES.indemniteForfaitaire.source}. Due une fois par facture non réglée à ` +
				`son échéance : ${PARAMETRES.indemniteParFacture.source}.`,
```

et, juste avant le `return {` de `composerPiece`, ajouter :

```ts
	// Lue pour être citée : le « par facture » vient d'elle, pas de l'article du montant.
	exiger(PARAMETRES.indemniteParFacture);
```

3. Remplacer le fondement conditionnel des règlements (le bloc `...(decompte.lignes.some((ligne) => (ligne.imputations ?? []).length > 0) ? [ … ] : [])`) par :

```ts
			...(decompte.lignes.some((ligne) => (ligne.imputations ?? []).length > 0)
				? [fondementImputation(decompte.imputation)]
				: [])
```

4. Ajouter, juste avant `export function composerPiece`, la fonction :

```ts
/**
 * Ce que la pièce dit de l'ordre d'imputation.
 *
 * ⚠️ UN DÉCOMPTE FIGÉ AVANT LE CHOIX DU GÉRANT n'a pas d'`imputation` : il
 * imputait les paiements d'abord sur les pénalités (25/09/2026) ou sur le
 * principal (avant), et ses règlements le montrent ligne par ligne.
 */
function fondementImputation(imputation: DecompteFige['imputation']): string {
	const avoirs =
		'Avoirs, et crédits dont la nature n’est pas détaillée, imputés sur le principal à leur date. ' +
		'Aucune clause d’imputation des conditions générales n’a été lue par ce logiciel.';
	if (imputation === undefined) {
		return `Règlements imputés comme le détaille le tableau de chaque facture. ${avoirs}`;
	}
	const ordre =
		imputation.ordre === 'PENALITES_DABORD'
			? `Paiements imputés d’abord sur les pénalités déjà courues, puis sur le principal : ${PARAMETRES.imputationPaiementPartiel.source}.`
			: 'Paiements imputés d’abord sur le principal, puis sur les pénalités déjà courues.';
	const choix = imputation.confirme
		? ' Ordre choisi par le créancier.'
		: ' Ordre non confirmé par le créancier : des deux ordres possibles, le calcul le plus bas est retenu.';
	return `${ordre}${choix} ${avoirs}`;
}
```

- [ ] **Step 4 : Lancer le test de la pièce**

Run : `bunx vitest run src/lib/verticales/recouvrement/__tests__/piece.test.ts`
Expected : PASS.

- [ ] **Step 5 : Montrer l'ordre et le choix à l'écran**

Dans `src/ui/decompte.tsx` :

1. Remplacer l'import Cladd par :

```ts
import {
	Surface,
	SurfaceCut,
	Button,
	CollapsibleRoot,
	CollapsibleTrigger,
	CollapsiblePanel,
	CollapsibleIndicator,
	Segmented,
	SegmentedButton
} from '@cladd-ui/react';
```

2. Juste avant `export interface DecompteAffiche`, ajouter :

```ts
export type OrdreImputationAffichee = 'PENALITES_DABORD' | 'PRINCIPAL_DABORD';

export interface ImputationDuDecompteAffichee {
	readonly ordre: OrdreImputationAffichee;
	readonly confirme: boolean;
	/** Le total de l'autre ordre, quand le gérant n'a pas choisi et qu'il diffère. */
	readonly totalAutreOrdre: bigint | null;
}

const ORDRE_LISIBLE: Record<OrdreImputationAffichee, string> = {
	PENALITES_DABORD: 'Pénalités d’abord',
	PRINCIPAL_DABORD: 'Principal d’abord'
};
```

et, dans `export interface DecompteAffiche`, après `readonly lignes: readonly LigneDecompteAffichee[];`, ajouter :

```ts
	/** Absent d'un décompte figé avant le lot 1 de la page dossier. */
	readonly imputation?: ImputationDuDecompteAffichee;
```

3. Remplacer la signature `export function Decompte({ decompte }: { decompte: DecompteAffiche }) {` par :

```tsx
export function Decompte({
	decompte,
	onChoisirImputation
}: {
	decompte: DecompteAffiche;
	/** Présent quand le gérant peut choisir ici ; absent sur un décompte figé. */
	onChoisirImputation?: (ordre: OrdreImputationAffichee) => void;
}) {
	const imputation = decompte.imputation;
	// ⚠️ ON NE DEMANDE RIEN QUAND LE CHOIX NE CHANGE RIEN : sans paiement imputable,
	// les deux ordres donnent le même total.
	const choixUtile =
		imputation !== undefined && (imputation.totalAutreOrdre !== null || imputation.confirme);
```

4. Juste après le paragraphe `Arrêté au {dateCourte(decompte.arreteAu)}, intérêts calculés en{' '}…</p>`, ajouter :

```tsx
				{choixUtile && imputation !== undefined ? (
					<div className="flex flex-col gap-cladd-3xs border-t border-cladd-outline pt-cladd-3xs">
						<p className="text-cladd-xs text-cladd-fg-soft">
							{imputation.ordre === 'PENALITES_DABORD'
								? 'Les paiements sont imputés d’abord sur les pénalités déjà courues, puis sur le principal'
								: 'Les paiements sont imputés d’abord sur le principal, puis sur les pénalités déjà courues'}
							{imputation.confirme ? ', comme vous l’avez choisi.' : '.'}
						</p>
						{imputation.confirme || imputation.totalAutreOrdre === null ? null : (
							<p className="text-cladd-xs text-cladd-fg-soft">
								Ordre à confirmer : c’est le calcul le plus bas qui est retenu. L’autre ordre
								donnerait {eurosCentimes(imputation.totalAutreOrdre)}.
							</p>
						)}
						{onChoisirImputation === undefined ? null : (
							<SurfaceCut outline className="w-fit rounded-full" contentClassName="p-1">
								{/* ⚠️ AUCUN BOUTON N'EST ACTIF TANT QUE LE GÉRANT N'A PAS CHOISI. Un
								    segment pré-sélectionné se lirait comme la réponse recommandée. */}
								<Segmented>
									{(['PENALITES_DABORD', 'PRINCIPAL_DABORD'] as const).map((ordre) => (
										<SegmentedButton
											key={ordre}
											active={imputation.confirme && imputation.ordre === ordre}
											onClick={() => onChoisirImputation(ordre)}
										>
											{ORDRE_LISIBLE[ordre]}
										</SegmentedButton>
									))}
								</Segmented>
							</SurfaceCut>
						)}
					</div>
				) : null}
```

5. Dans `src/ui/index.ts`, dans l'export de `./decompte`, ajouter `type OrdreImputationAffichee,` et `type ImputationDuDecompteAffichee,`.

- [ ] **Step 6 : Brancher le choix sur l'écran de la créance**

1. `src/screens/creance.tsx` — importer `type OrdreImputationAffichee` depuis `'../ui'` (dans l'import existant de `'../ui'`), ajouter dans `CreanceOuverte`, après `readonly onRepondreCondition: …;` :

```ts
	/** Le gérant choisit l'ordre d'imputation de ses paiements, pour ce dossier. */
	readonly onChoisirImputation?: (ordre: OrdreImputationAffichee) => void;
```

et dans `SectionDecompte`, remplacer `<Decompte decompte={montant} />` par :

```tsx
					<Decompte decompte={montant} onChoisirImputation={creance.onChoisirImputation} />
```

2. `src/routes/app/creance.$id.tsx` :
   - après `const repondre = useMutation(api.recouvrement.creances.repondre);`, ajouter :

```ts
	const choisirOrdreImputation = useMutation(api.recouvrement.creances.choisirOrdreImputation);
```

   - remplacer l'objet `montantDuJour` :

```ts
			: {
					arreteAu: preparation.arreteAu,
					convention: preparation.convention,
					principalRestantDu: projection.principalRestantDu,
					interets: projection.interets,
					indemniteForfaitaire: projection.indemniteForfaitaire,
					total: projection.total,
					lignes: projection.lignes
				};
```

   par :

```ts
			: {
					arreteAu: preparation.arreteAu,
					convention: preparation.convention,
					principalRestantDu: projection.principalRestantDu,
					interets: projection.interets,
					indemniteForfaitaire: projection.indemniteForfaitaire,
					total: projection.total,
					lignes: projection.lignes,
					imputation: {
						ordre: projection.imputation.ordre,
						confirme: projection.imputation.confirme,
						totalAutreOrdre: projection.imputation.totalAutreOrdre ?? null
					}
				};
```
   - après `onRepondreCondition: (condition, reponse) => void avec(() => repondre({ creanceId, reponses: { [condition]: reponse } })),`, ajouter :

```ts
		onChoisirImputation: (ordre) => void avec(() => choisirOrdreImputation({ creanceId, ordre })),
```

   - dans l'objet `DecompteFige` construit pour le PDF (bloc `lignes: dernier.lignes.map(…)`), juste avant `abandons:`, ajouter :

```ts
			imputation:
				dernier.imputation === undefined
					? undefined
					: {
							ordre: dernier.imputation.ordre,
							confirme: dernier.imputation.confirme,
							totalAutreOrdre:
								dernier.imputation.totalAutreOrdre === undefined
									? null
									: depuisCentimes(dernier.imputation.totalAutreOrdre)
						},
```

3. `src/routes/app/decompte.$id.tsx` — dans `decompteFige()`, juste avant `abandons:`, ajouter le même bloc en remplaçant `dernier` par `piece`.

4. `src/routes/app/arret.$id.tsx` — dans l'objet `projection`, remplacer la ligne :

```ts
													lignes: preparation.projection.lignes
```

par :

```ts
													lignes: preparation.projection.lignes,
													imputation: {
														ordre: preparation.projection.imputation.ordre,
														confirme: preparation.projection.imputation.confirme,
														totalAutreOrdre:
															preparation.projection.imputation.totalAutreOrdre ?? null
													}
```

5. `src/routes/-salle/creance.tsx` — après `onRepondreCondition: () => undefined,`, ajouter `onChoisirImputation: () => undefined,`.

- [ ] **Step 7 : Typage, lint, tests**

Run :

```bash
bunx prettier --write src/ui/decompte.tsx src/screens/creance.tsx 'src/routes/app/creance.$id.tsx' 'src/routes/app/decompte.$id.tsx' 'src/routes/app/arret.$id.tsx' src/routes/-salle/creance.tsx
bun run check
bunx vitest run src/lib src/ui src/marketing src/routes
bun run lint
```

Expected : `tsc` sans erreur ; tests PASS ; lint « 0 errors ».

- [ ] **Step 8 : Regarder à l'écran**

Lancer le frontal seul (`preview_start` avec `dev:frontend`), ouvrir `/showroom`, écran « créance », déplier « Le décompte, décomposé ». Vérifier aux largeurs 375, 768, 1024 et 1280 :
- la phrase « Les paiements sont imputés d’abord sur le principal… » ;
- « Ordre à confirmer : … L’autre ordre donnerait … € » ;
- le `Segmented` à deux boutons, **aucun actif**, qui ne déborde pas à 375 px ;
- la landing (`/`) : aucune phrase d'imputation sur la démo du décompte (ordre confirmé, pas de choix proposé).

- [ ] **Step 9 : Commit**

```bash
git add src/ui src/screens/creance.tsx src/routes src/lib/verticales/recouvrement/piece.ts src/lib/verticales/recouvrement/__tests__/piece.test.ts
git commit --no-verify -m "feat(decompte): le gerant voit l'ordre d'imputation, ce que l'autre donnerait, et choisit" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8 : Vérifier, livrer, vérifier ce qui est servi

**Files:** aucun nouveau.

- [ ] **Step 1 : La vérification complète du lot**

Run :

```bash
bun run check
bun run lint
bunx vitest run src/lib src/ui src/marketing src/routes
bun run build
```

Expected : `tsc` propre, lint « 0 errors », tous les tests PASS, build `✓ built`.

- [ ] **Step 2 : Mettre la spec à jour**

Dans `docs/superpowers/specs/2026-09-25-page-dossier-design.md`, § 5, remplacer la ligne `- **Lot 1 — le référentiel et le calcul** : …` par la même ligne précédée de `**LIVRÉ** (<sha>, <date>) —`, et committer :

```bash
git add docs/superpowers/specs/2026-09-25-page-dossier-design.md
git commit --no-verify -m "docs(dossier): lot 1 livre" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 3 : Demander au fondateur de pousser**

Lui donner la commande exacte, avec le sha du dernier commit :

```bash
git push origin <sha>:main
```

- [ ] **Step 4 : Vérifier le déploiement, puis le contenu servi**

Run :

```bash
curl -s "https://api.github.com/repos/julesdo/mycelium-os/commits/<sha>/status" | grep -oE '"(state|description)": "[^"]*"'
```

Répéter jusqu'à `"state": "success"` (ou `failure` : lire alors le journal Vercel). Puis l'empreinte : l'écran du décompte est derrière la connexion, mais son code est servi publiquement dans les fichiers JavaScript de l'application. On cherche la nouvelle phrase dans ce qui est servi :

```bash
curl -s -L --compressed "https://www.letikette.com/" -o "$TEMP/lk.html"
grep -a -c "377,92" "$TEMP/lk.html"
for f in $(grep -aoE '/assets/[^"]+\.js' "$TEMP/lk.html" | sort -u); do
  curl -s --compressed "https://www.letikette.com$f" | grep -a -c "Ordre à confirmer" | sed "s|^|$f : |"
done
```

Expected : `377,92` toujours présent (la démo publique garde l'ordre « pénalités d'abord », confirmé) ; au moins un fichier JavaScript servi qui contient « Ordre à confirmer ». Si aucun des fichiers liés depuis la page d'accueil ne le contient, l'écran est dans un morceau chargé plus tard : le chercher dans les fichiers cités par ceux-là (`grep -aoE 'assets/[^"]+\.js'` sur chacun).
