# Le moteur de croissance, part gratuite — plan de construction

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Savoir d'où vient chaque établissement et où il en est, lui écrire les quatre conseils de Plume au bon moment, le noter de 0 à 100, et envoyer au fondateur un point chiffré chaque lundi — sans un euro de plus.

**Architecture:** La logique pure vit dans `src/lib/croissance/` (lecture de la source, déduction des étapes, score, choix du prochain conseil, comptes de la semaine), sans import de `verticales/` ni de `convex/` (test de frontière). Les fonctions Convex vivent dans `src/lib/convex/croissance/` : deux tables (`parcoursComptes`, `envoisCroissance`), un relevé des étapes appelé après trois mutations existantes et chaque nuit, une tâche qui envoie les conseils toutes les quinze minutes, et le point du lundi. La source de la visite est retenue dans `sessionStorage` par une amorce du `<head>` et jointe à la création de l'établissement.

**Tech Stack:** TypeScript strict, Convex (tables, `internalMutation`, `internalAction`, crons, `httpAction`), Resend (composant `@convex-dev/resend`), React 19 + Cladd (une rangée du profil), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-16-moteur-de-croissance-design.md` (§ 1 bis : la part gratuite) et la stratégie `docs/superpowers/specs/2026-10-16-strategie-de-croissance.md`.

## Global Constraints

- Interface et textes en français ; jamais « garantie » ; jamais de verdict juridique (« vous devriez agir ») ; jamais de tiret cadratin dans un texte lu par un client.
- Aucune valeur juridique écrite en dur : les 40 € viennent de `PARAMETRES.indemniteForfaitaire` (lu côté Convex, passé au gabarit).
- Montants en `bigint` de centimes côté logique ; `versEuros` pour l'affichage.
- Multi-tenant strict : chaque table porte `organizationId` et un index `by_org`, et entre dans la purge (`rgpd.ts`).
- Aucune donnée d'un débiteur ni d'une facture ne sort de l'établissement : le point du lundi ne porte que des noms d'établissements, des étapes, des scores et des comptes.
- Les e-mails de conseil : au plus un tous les deux jours par établissement, en semaine de 9 h à 18 h (heure de Paris, `prochainCreneauDEnvoi`), lien de désinscription et en-tête `List-Unsubscribe` (RFC 8058).
- Le code de facturation (`paddle.ts`, `billing.ts`) n'est pas modifié.
- Pas de `setState` dans un effet ; pas de `useQuery` de `convex/react` (passer par `app/donnees.ts`) ; classes Tailwind arbitraires seulement dans `src/ui`.
- Convex : annoter le type de retour de tout handler qui appelle `internal.<son propre module>`.
- Commits : `git commit --no-verify -F <fichier>`, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ; staging par chemin.

## Review Focus

1. **Un établissement créé avant la mise en service ne reçoit aucun conseil rétroactif** : chaque conseil a une fenêtre de validité courte après son étape de départ (Task 1, test « un compte ancien ne reçoit rien »).
2. **Une inscription le vendredi soir reçoit sa bienvenue le lundi matin, pas jamais** : la validité de la bienvenue couvre un week-end (Task 1, test « vendredi 19 h »).
3. **Un membre qui a coupé les conseils, ou un établissement sans e-mail de membre, ne reçoit rien et ne bloque pas les autres** (Task 5, test sur `destinatairesDesConseils`).
4. **Une adresse d'entrée piégée** (`utm_source` de 5 000 caractères, référent malformé, page `/p/<jeton>`) ne casse rien et ne stocke rien d'excessif (Task 1, tests de `lireSource` ; Task 3, l'amorce ignore `/p/`).
5. **Le lien de désinscription ouvert par un antivirus** (une requête GET automatique) ne désinscrit pas : seul un POST le fait (Task 5, test sur la route).

---

### Task 1: La logique pure de la croissance

**Files:**
- Create: `src/lib/croissance/source.ts`
- Create: `src/lib/croissance/etapes.ts`
- Create: `src/lib/croissance/score.ts`
- Create: `src/lib/croissance/conseils.ts`
- Create: `src/lib/croissance/semaine.ts`
- Create: `src/lib/croissance/__tests__/croissance.test.ts`
- Create: `src/lib/croissance/__tests__/frontiere.test.ts`

**Interfaces:**
- Produces:
  - `lireSource(brut: { url: string; referent: string }): SourceVisite`, `libelleDeSource(s: SourceVisite | null): string`, `type Canal`, `type SourceVisite`
  - `ETAPES`, `type Etape`, `type DatesDesEtapes`, `type EtatDuCompte`, `deduireEtapes(etat, memoire, maintenant): MemoireDuParcours`, `JOURS_SANS_VISITE_A_RISQUE`
  - `calculerScore(e: EntreeScore): { score: number; raisons: string[] }`, `SEUIL_APPELER`
  - `CLES_CONSEILS`, `type CleConseil`, `prochainConseil(etapes, envoyes, maintenant): { cle: CleConseil; des: number } | null`, `ECART_MINIMAL_MS`
  - `compterParSource(parcours, debut, fin)`, `ETAPES_DU_POINT`

- [ ] **Step 1: Écrire les tests** (`src/lib/croissance/__tests__/croissance.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { lireSource, libelleDeSource } from '../source';
import { deduireEtapes, type EtatDuCompte } from '../etapes';
import { calculerScore } from '../score';
import { prochainConseil, ECART_MINIMAL_MS } from '../conseils';
import { compterParSource } from '../semaine';

const JOUR = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 14, 10, 0); // un mercredi

describe('lireSource', () => {
	it('lit une campagne utm', () => {
		const s = lireSource({ url: 'https://www.letikette.com/?utm_source=manuel&utm_medium=email&utm_campaign=transport#calcul', referent: '' });
		expect(s).toEqual({ canal: 'campagne', pageEntree: '/', utmSource: 'manuel', utmMedium: 'email', utmCampaign: 'transport' });
		expect(libelleDeSource(s)).toBe('manuel · transport');
	});
	it('reconnaît une recherche, un réseau, un assistant, un site, et notre propre domaine', () => {
		expect(lireSource({ url: 'https://www.letikette.com/tarifs', referent: 'https://www.google.fr/' }).canal).toBe('recherche');
		expect(lireSource({ url: 'https://www.letikette.com/', referent: 'https://www.linkedin.com/feed' }).canal).toBe('social');
		expect(lireSource({ url: 'https://www.letikette.com/', referent: 'https://chatgpt.com/' }).canal).toBe('assistant');
		expect(lireSource({ url: 'https://www.letikette.com/', referent: 'https://blog.exemple.fr/article' })).toMatchObject({ canal: 'site', referent: 'blog.exemple.fr' });
		expect(lireSource({ url: 'https://www.letikette.com/', referent: 'https://www.letikette.com/blog' }).canal).toBe('direct');
	});
	it('résiste à une adresse piégée', () => {
		const long = 'x'.repeat(5000);
		const s = lireSource({ url: `https://www.letikette.com/?utm_source=${long}`, referent: 'pas une adresse' });
		expect(s.utmSource?.length).toBeLessThanOrEqual(120);
		expect(s.referent).toBeUndefined();
		expect(lireSource({ url: 'n’importe quoi', referent: '' })).toEqual({ canal: 'direct', pageEntree: '/' });
	});
});

function etat(partiel: Partial<EtatDuCompte> = {}): EtatDuCompte {
	return {
		creeLe: T0, sirenConnu: false, premierDepotLe: null, factureEchueImpayee: false,
		relancesActiveesLe: null, relancesActives: false, statutPaiement: null, formule: null,
		rythme: null, resiliationPrevue: false, derniereActivite: T0, ...partiel
	};
}

describe('deduireEtapes', () => {
	it('note chaque étape une fois, à sa date, sans réécrire une date déjà notée', () => {
		const m1 = deduireEtapes(etat({ premierDepotLe: T0 + 1000, factureEchueImpayee: true }), { etapes: {} }, T0 + 2000);
		expect(m1.etapes).toEqual({ INSCRIT: T0, FACTURES_DEPOSEES: T0 + 1000, MONTANT_REVELE: T0 + 2000 });
		const m2 = deduireEtapes(etat({ premierDepotLe: T0 + 1000, factureEchueImpayee: true }), m1, T0 + 9000);
		expect(m2.etapes.MONTANT_REVELE).toBe(T0 + 2000);
	});
	it('mesure la montée en gamme contre la formule vue au premier abonnement', () => {
		const m1 = deduireEtapes(etat({ statutPaiement: 'active', formule: 'solo', rythme: 'mensuel' }), { etapes: {} }, T0);
		expect(m1.formuleVue).toBe('solo');
		const m2 = deduireEtapes(etat({ statutPaiement: 'active', formule: 'equipe', rythme: 'mensuel' }), m1, T0 + JOUR);
		expect(m2.etapes.MONTEE_EN_GAMME).toBe(T0 + JOUR);
	});
	it('lève « à risque » quand le compte revient, et note la reconquête', () => {
		const vieux = etat({ statutPaiement: 'active', formule: 'solo', rythme: 'mensuel', derniereActivite: T0 - 20 * JOUR });
		const m1 = deduireEtapes(vieux, { etapes: {} }, T0);
		expect(m1.etapes.A_RISQUE).toBe(T0);
		const m2 = deduireEtapes({ ...vieux, derniereActivite: T0 }, m1, T0 + 1);
		expect(m2.etapes.A_RISQUE).toBeUndefined();
		const m3 = deduireEtapes(etat({ statutPaiement: 'canceled' }), m2, T0 + 2);
		expect(m3.etapes.RESILIE).toBe(T0 + 2);
		const m4 = deduireEtapes(etat({ statutPaiement: 'active', formule: 'solo' }), m3, T0 + 3);
		expect(m4.etapes.RECONQUIS).toBe(T0 + 3);
	});
});

describe('calculerScore', () => {
	it('reste entre 0 et 100 et dit pourquoi', () => {
		const vide = calculerScore({ etapes: { INSCRIT: T0 }, derniereActivite: T0 - 30 * JOUR, maintenant: T0, factures: 0, interetFormuleLe: null, membres: 1 });
		expect(vide.score).toBe(0);
		const plein = calculerScore({
			etapes: { INSCRIT: T0, ENTREPRISE: T0, FACTURES_DEPOSEES: T0, MONTANT_REVELE: T0, RELANCES_ACTIVEES: T0, ESSAI: T0, ABONNE: T0, MONTEE_EN_GAMME: T0 },
			derniereActivite: T0, maintenant: T0, factures: 300, interetFormuleLe: T0, membres: 3
		});
		expect(plein.score).toBe(100);
		expect(plein.raisons).toContain('Relances activées');
	});
});

describe('prochainConseil', () => {
	it('souhaite la bienvenue tout de suite, puis attend deux jours', () => {
		expect(prochainConseil({ INSCRIT: T0 }, [], T0)).toEqual({ cle: 'bienvenue', des: T0 });
		const apres = prochainConseil({ INSCRIT: T0 }, [{ cle: 'bienvenue', le: T0 }], T0 + 1000);
		expect(apres).toEqual({ cle: 'il-manque-vos-factures', des: T0 + ECART_MINIMAL_MS });
	});
	it('ne relance pas les factures quand elles sont déposées', () => {
		const p = prochainConseil({ INSCRIT: T0, FACTURES_DEPOSEES: T0 + 1 }, [{ cle: 'bienvenue', le: T0 }], T0 + 3 * JOUR);
		expect(p).toBeNull();
	});
	it('dit ce qui est dû au montant révélé, puis ce qui partirait trois jours plus tard', () => {
		const e = { INSCRIT: T0, FACTURES_DEPOSEES: T0, MONTANT_REVELE: T0 };
		expect(prochainConseil(e, [{ cle: 'bienvenue', le: T0 - 3 * JOUR }], T0)).toEqual({ cle: 'ce-qui-vous-est-du', des: T0 });
		const suite = prochainConseil(e, [{ cle: 'bienvenue', le: T0 - 3 * JOUR }, { cle: 'ce-qui-vous-est-du', le: T0 }], T0 + JOUR);
		expect(suite).toEqual({ cle: 'ce-qui-partirait', des: T0 + 3 * JOUR });
		expect(prochainConseil({ ...e, RELANCES_ACTIVEES: T0 + 1 }, [{ cle: 'bienvenue', le: T0 - 3 * JOUR }, { cle: 'ce-qui-vous-est-du', le: T0 }], T0 + 3 * JOUR)).toBeNull();
	});
	it('un compte ancien ne reçoit rien', () => {
		expect(prochainConseil({ INSCRIT: T0 - 60 * JOUR, MONTANT_REVELE: T0 - 50 * JOUR }, [], T0)).toBeNull();
	});
	it('une inscription le vendredi à 19 h garde sa bienvenue jusqu’au lundi', () => {
		const vendredi = Date.UTC(2026, 9, 16, 17, 0);
		const lundi = Date.UTC(2026, 9, 19, 7, 0);
		expect(prochainConseil({ INSCRIT: vendredi }, [], lundi)).toEqual({ cle: 'bienvenue', des: vendredi });
	});
});

describe('compterParSource', () => {
	it('compte les étapes atteintes dans la fenêtre, par source', () => {
		const r = compterParSource(
			[
				{ source: { canal: 'recherche', pageEntree: '/', referent: 'www.google.fr' }, etapes: { INSCRIT: T0, FACTURES_DEPOSEES: T0 } },
				{ source: { canal: 'recherche', pageEntree: '/' }, etapes: { INSCRIT: T0 - 10 * JOUR } },
				{ source: null, etapes: { INSCRIT: T0 } }
			],
			T0 - 7 * JOUR,
			T0 + 1
		);
		expect(r.total.INSCRIT).toBe(2);
		expect(r.lignes.find((l) => l.source === 'Recherche')?.compte).toEqual({ INSCRIT: 1, FACTURES_DEPOSEES: 1 });
		expect(r.lignes.find((l) => l.source === 'Inconnue')?.compte.INSCRIT).toBe(1);
	});
});
```

- [ ] **Step 2: Lancer les tests, les voir échouer**

Run: `./node_modules/.bin/vitest run src/lib/croissance`
Expected: FAIL (modules introuvables).

- [ ] **Step 3: Écrire `source.ts`**

```ts
/**
 * D'OÙ VIENT UNE VISITE (16/10/2026) — la source qu'on joint à l'inscription.
 *
 * Lue sur l'adresse d'entrée (paramètres `utm_*`) et le site d'origine, gardés le
 * temps de la visite par l'amorce du `<head>` (`app/source-visite.ts`). Rien de
 * plus : ni identifiant de visiteur, ni cookie. Chaque champ est tronqué : une
 * adresse se fabrique, et rien de ce qu'elle porte ne doit gonfler la base.
 */

export type Canal = 'direct' | 'recherche' | 'assistant' | 'social' | 'campagne' | 'site';

export interface SourceVisite {
	readonly canal: Canal;
	readonly pageEntree: string;
	readonly referent?: string;
	readonly utmSource?: string;
	readonly utmMedium?: string;
	readonly utmCampaign?: string;
}

const LONGUEUR_MAX = 120;
const NOTRE_DOMAINE = /(^|\.)letikette\.com$|^localhost$/;
const ASSISTANTS = /(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com)$/;
const MOTEURS = /(^|\.)(google|bing|duckduckgo|qwant|ecosia|yahoo|startpage|search\.brave)\.[a-z.]+$/;
const RESEAUX = /(^|\.)(linkedin\.com|lnkd\.in|facebook\.com|fb\.com|instagram\.com|t\.co|x\.com|twitter\.com|youtube\.com|tiktok\.com)$/;

function propre(valeur: string | null): string | undefined {
	const t = valeur?.trim().slice(0, LONGUEUR_MAX);
	return t ? t : undefined;
}

export function lireSource(brut: { url: string; referent: string }): SourceVisite {
	let url: URL;
	try {
		url = new URL(brut.url);
	} catch {
		return { canal: 'direct', pageEntree: '/' };
	}
	let hote: string | undefined;
	try {
		hote = brut.referent ? new URL(brut.referent).hostname.toLowerCase() : undefined;
	} catch {
		hote = undefined;
	}
	if (hote !== undefined && NOTRE_DOMAINE.test(hote)) hote = undefined;

	const utmSource = propre(url.searchParams.get('utm_source'));
	const utmMedium = propre(url.searchParams.get('utm_medium'));
	const utmCampaign = propre(url.searchParams.get('utm_campaign'));
	const base = {
		pageEntree: url.pathname.slice(0, LONGUEUR_MAX) || '/',
		...(hote === undefined ? {} : { referent: hote.slice(0, LONGUEUR_MAX) }),
		...(utmSource === undefined ? {} : { utmSource }),
		...(utmMedium === undefined ? {} : { utmMedium }),
		...(utmCampaign === undefined ? {} : { utmCampaign })
	};

	if (utmSource !== undefined) return { canal: 'campagne', ...base };
	if (hote === undefined) return { canal: 'direct', ...base };
	if (ASSISTANTS.test(hote)) return { canal: 'assistant', ...base };
	if (MOTEURS.test(hote)) return { canal: 'recherche', ...base };
	if (RESEAUX.test(hote)) return { canal: 'social', ...base };
	return { canal: 'site', ...base };
}

const LIBELLES: Record<Canal, string> = {
	direct: 'Directe',
	recherche: 'Recherche',
	assistant: 'Assistant',
	social: 'Réseaux',
	campagne: 'Campagne',
	site: 'Autre site'
};

/** Le nom d'une source dans le point du lundi : la campagne nommée, sinon le canal. */
export function libelleDeSource(s: SourceVisite | null): string {
	if (s === null) return 'Inconnue';
	if (s.canal === 'campagne') {
		return s.utmCampaign === undefined ? (s.utmSource ?? 'Campagne') : `${s.utmSource} · ${s.utmCampaign}`;
	}
	return LIBELLES[s.canal];
}
```

- [ ] **Step 4: Écrire `etapes.ts`**

```ts
/**
 * LES ÉTAPES D'UN ÉTABLISSEMENT (16/10/2026), de l'inscription à la reconquête.
 *
 * ⚠️ ELLES SE DÉDUISENT DE L'ÉTAT, ELLES NE S'ÉCRIVENT PAS À LA MAIN. Le relevé
 * (`convex/croissance/releve.ts`) lit l'état courant et appelle cette fonction,
 * qui ne fait qu'ajouter les étapes nouvellement atteintes. Une date déjà notée
 * ne se réécrit jamais ; seule « à risque » se lève, parce que c'est un état et
 * non un passage.
 */

export const ETAPES = [
	'INSCRIT',
	'ENTREPRISE',
	'FACTURES_DEPOSEES',
	'MONTANT_REVELE',
	'RELANCES_ACTIVEES',
	'ESSAI',
	'ABONNE',
	'MONTEE_EN_GAMME',
	'A_RISQUE',
	'RESILIE',
	'RECONQUIS'
] as const;

export type Etape = (typeof ETAPES)[number];
export type DatesDesEtapes = Partial<Record<Etape, number>>;
export type FormuleVue = 'solo' | 'equipe' | 'pro';
export type RythmeVu = 'mensuel' | 'annuel';

/** Ce que le relevé lit dans la base, déjà réduit à ce qui compte. */
export interface EtatDuCompte {
	readonly creeLe: number;
	readonly sirenConnu: boolean;
	readonly premierDepotLe: number | null;
	readonly factureEchueImpayee: boolean;
	readonly relancesActiveesLe: number | null;
	readonly relancesActives: boolean;
	/** `paddleStatus` : `trialing`, `active`, `canceled`, `past_due`… ou rien. */
	readonly statutPaiement: string | null;
	readonly formule: FormuleVue | null;
	readonly rythme: RythmeVu | null;
	/** Une résiliation demandée qui n'a pas encore pris effet. */
	readonly resiliationPrevue: boolean;
	readonly derniereActivite: number;
}

export interface MemoireDuParcours {
	readonly etapes: DatesDesEtapes;
	readonly formuleVue?: FormuleVue;
	readonly rythmeVu?: RythmeVu;
}

/** Sans visite depuis quinze jours, un abonné est à risque. */
export const JOURS_SANS_VISITE_A_RISQUE = 14;
const JOUR = 24 * 60 * 60 * 1000;
const RANG: Record<FormuleVue, number> = { solo: 1, equipe: 2, pro: 3 };

export function deduireEtapes(
	etat: EtatDuCompte,
	memoire: MemoireDuParcours,
	maintenant: number
): MemoireDuParcours {
	const e: DatesDesEtapes = { ...memoire.etapes };
	const noter = (cle: Etape, le: number) => {
		if (e[cle] === undefined) e[cle] = le;
	};

	noter('INSCRIT', etat.creeLe);
	if (etat.sirenConnu) noter('ENTREPRISE', maintenant);
	if (etat.premierDepotLe !== null) noter('FACTURES_DEPOSEES', etat.premierDepotLe);
	if (etat.factureEchueImpayee) noter('MONTANT_REVELE', maintenant);
	if (etat.relancesActiveesLe !== null) noter('RELANCES_ACTIVEES', etat.relancesActiveesLe);

	const enEssai = etat.statutPaiement === 'trialing';
	const abonne = etat.statutPaiement === 'active';
	if (enEssai) noter('ESSAI', maintenant);
	if (abonne) noter('ABONNE', maintenant);
	if (etat.statutPaiement === 'canceled') noter('RESILIE', maintenant);
	if ((abonne || enEssai) && e.RESILIE !== undefined) noter('RECONQUIS', maintenant);

	let formuleVue = memoire.formuleVue;
	let rythmeVu = memoire.rythmeVu;
	if (abonne && formuleVue === undefined && etat.formule !== null) {
		formuleVue = etat.formule;
		rythmeVu = etat.rythme ?? undefined;
	}
	if (abonne && formuleVue !== undefined && etat.formule !== null) {
		const plusHaute = RANG[etat.formule] > RANG[formuleVue];
		const alAnnee = rythmeVu === 'mensuel' && etat.rythme === 'annuel';
		if (plusHaute || alAnnee) noter('MONTEE_EN_GAMME', maintenant);
	}

	const risque =
		(abonne || enEssai) &&
		(maintenant - etat.derniereActivite > JOURS_SANS_VISITE_A_RISQUE * JOUR ||
			(e.RELANCES_ACTIVEES !== undefined && !etat.relancesActives) ||
			etat.resiliationPrevue);
	if (risque) noter('A_RISQUE', maintenant);
	else delete e.A_RISQUE;

	return {
		etapes: e,
		...(formuleVue === undefined ? {} : { formuleVue }),
		...(rythmeVu === undefined ? {} : { rythmeVu })
	};
}
```

- [ ] **Step 5: Écrire `score.ts`**

```ts
import type { DatesDesEtapes, Etape } from './etapes';

/**
 * LE SCORE D'UN ÉTABLISSEMENT, DE 0 À 100 (16/10/2026).
 *
 * Il dit au fondateur qui appeler d'abord. Il part de zéro et chaque règle nommée
 * ajoute ou retire ; il n'est montré qu'au fondateur, dans le point du lundi.
 */

export interface EntreeScore {
	readonly etapes: DatesDesEtapes;
	readonly derniereActivite: number;
	readonly maintenant: number;
	/** Le nombre de factures connues. */
	readonly factures: number;
	/** La dernière ouverture du choix de formule, s'il y en a eu une. */
	readonly interetFormuleLe: number | null;
	readonly membres: number;
}

const JOUR = 24 * 60 * 60 * 1000;

/** À partir de ce score, le fondateur appelle (une tâche quand Twenty arrivera). */
export const SEUIL_APPELER = 60;

const POIDS_DES_ETAPES: ReadonlyArray<readonly [Etape, number, string]> = [
	['ENTREPRISE', 5, 'Entreprise renseignée'],
	['FACTURES_DEPOSEES', 15, 'Factures déposées'],
	['MONTANT_REVELE', 20, 'Factures échues trouvées'],
	['RELANCES_ACTIVEES', 20, 'Relances activées'],
	['ESSAI', 10, 'Essai commencé'],
	['ABONNE', 10, 'Abonné'],
	['MONTEE_EN_GAMME', 5, 'Montée en gamme']
];

export function calculerScore(e: EntreeScore): { score: number; raisons: string[] } {
	let points = 0;
	const raisons: string[] = [];
	const ajouter = (n: number, raison: string) => {
		points += n;
		raisons.push(raison);
	};

	for (const [etape, poids, raison] of POIDS_DES_ETAPES) {
		if (e.etapes[etape] !== undefined) ajouter(poids, raison);
	}
	const absence = e.maintenant - e.derniereActivite;
	if (absence <= 3 * JOUR) ajouter(10, 'Venu ces trois derniers jours');
	else if (absence <= 7 * JOUR) ajouter(5, 'Venu cette semaine');
	else if (absence > 21 * JOUR) ajouter(-15, 'Absent depuis trois semaines');
	if (e.factures > 100) ajouter(10, 'Plus de 100 factures');
	else if (e.factures > 20) ajouter(5, 'Plus de 20 factures');
	if (e.interetFormuleLe !== null && e.maintenant - e.interetFormuleLe <= 14 * JOUR) {
		ajouter(10, 'A regardé les formules');
	}
	if (e.membres >= 2) ajouter(5, 'Équipe invitée');
	if (e.etapes.A_RISQUE !== undefined) ajouter(-10, 'À risque');

	return { score: Math.max(0, Math.min(100, points)), raisons };
}
```

- [ ] **Step 6: Écrire `conseils.ts`**

```ts
import type { DatesDesEtapes, Etape } from './etapes';

/**
 * LES CONSEILS DE PLUME : QUOI ENVOYER, ET QUAND (16/10/2026).
 *
 * Quatre messages, chacun attaché à une étape de départ, avec un délai et une
 * fenêtre de validité. ⚠️ LA FENÊTRE EST CE QUI PROTÈGE LES COMPTES ANCIENS : à la
 * mise en service, un établissement inscrit il y a deux mois ne reçoit pas une
 * « bienvenue ». La cadence (deux jours au moins entre deux conseils) se compte
 * pour tout l'établissement. Le créneau (semaine, 9 h-18 h) est appliqué par
 * l'appelant, qui connaît le calendrier.
 */

export const CLES_CONSEILS = [
	'bienvenue',
	'il-manque-vos-factures',
	'ce-qui-vous-est-du',
	'ce-qui-partirait'
] as const;
export type CleConseil = (typeof CLES_CONSEILS)[number];

const JOUR = 24 * 60 * 60 * 1000;
export const ECART_MINIMAL_MS = 2 * JOUR;

interface Regle {
	readonly cle: CleConseil;
	readonly depart: Etape;
	readonly delai: number;
	/** Au-delà de `départ + validité`, le conseil ne part plus. Couvre un week-end. */
	readonly validite: number;
	/** Une étape qui, franchie, rend le conseil inutile. */
	readonly sauf?: Etape;
}

const REGLES: readonly Regle[] = [
	{ cle: 'bienvenue', depart: 'INSCRIT', delai: 0, validite: 4 * JOUR },
	{ cle: 'il-manque-vos-factures', depart: 'INSCRIT', delai: JOUR, validite: 7 * JOUR, sauf: 'FACTURES_DEPOSEES' },
	{ cle: 'ce-qui-vous-est-du', depart: 'MONTANT_REVELE', delai: 0, validite: 4 * JOUR },
	{ cle: 'ce-qui-partirait', depart: 'MONTANT_REVELE', delai: 3 * JOUR, validite: 10 * JOUR, sauf: 'RELANCES_ACTIVEES' }
];

export function prochainConseil(
	etapes: DatesDesEtapes,
	envoyes: readonly { readonly cle: CleConseil; readonly le: number }[],
	maintenant: number
): { cle: CleConseil; des: number } | null {
	const dernier = envoyes.reduce((m, x) => Math.max(m, x.le), 0);
	let meilleur: { cle: CleConseil; des: number } | null = null;
	for (const r of REGLES) {
		if (envoyes.some((x) => x.cle === r.cle)) continue;
		const depart = etapes[r.depart];
		if (depart === undefined) continue;
		if (r.sauf !== undefined && etapes[r.sauf] !== undefined) continue;
		const fin = depart + r.validite;
		const des = Math.max(depart + r.delai, dernier === 0 ? 0 : dernier + ECART_MINIMAL_MS);
		if (maintenant > fin || des > fin) continue;
		if (meilleur === null || des < meilleur.des) meilleur = { cle: r.cle, des };
	}
	return meilleur;
}
```

- [ ] **Step 7: Écrire `semaine.ts`**

```ts
import { ETAPES, type DatesDesEtapes, type Etape } from './etapes';
import { libelleDeSource, type SourceVisite } from './source';

/** Les étapes que compte le point du lundi, dans l'ordre où il les montre. */
export const ETAPES_DU_POINT: readonly Etape[] = ETAPES.filter((e) => e !== 'A_RISQUE');

export interface LigneDeSource {
	readonly source: string;
	readonly compte: Partial<Record<Etape, number>>;
}

/** Combien d'établissements ont atteint chaque étape entre `debut` et `fin`, par source. */
export function compterParSource(
	parcours: readonly { readonly source: SourceVisite | null; readonly etapes: DatesDesEtapes }[],
	debut: number,
	fin: number
): { lignes: LigneDeSource[]; total: Partial<Record<Etape, number>> } {
	const parSource = new Map<string, Partial<Record<Etape, number>>>();
	const total: Partial<Record<Etape, number>> = {};
	for (const p of parcours) {
		const nom = libelleDeSource(p.source);
		for (const etape of ETAPES_DU_POINT) {
			const le = p.etapes[etape];
			if (le === undefined || le < debut || le >= fin) continue;
			const compte = parSource.get(nom) ?? {};
			compte[etape] = (compte[etape] ?? 0) + 1;
			parSource.set(nom, compte);
			total[etape] = (total[etape] ?? 0) + 1;
		}
	}
	const lignes = [...parSource.entries()]
		.map(([source, compte]) => ({ source, compte }))
		.sort((a, b) => (b.compte.INSCRIT ?? 0) - (a.compte.INSCRIT ?? 0));
	return { lignes, total };
}
```

- [ ] **Step 8: Écrire le test de frontière** (`src/lib/croissance/__tests__/frontiere.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * La croissance ne connaît ni la loi ni la plateforme : elle se teste en une
 * seconde, et la décision (étapes, score, conseils) ne dépend d'aucun backend.
 * Même règle que le socle (`socle/__tests__/frontiere.test.ts`).
 */
const RACINE = join(process.cwd(), 'src', 'lib', 'croissance');

function fichiers(dossier: string): string[] {
	return readdirSync(dossier).flatMap((nom) => {
		const chemin = join(dossier, nom);
		if (statSync(chemin).isDirectory()) return nom === '__tests__' ? [] : fichiers(chemin);
		return chemin.endsWith('.ts') ? [chemin] : [];
	});
}

describe('la frontière de la croissance', () => {
	it('n’importe ni verticales/ ni convex/', () => {
		const fautifs = fichiers(RACINE).filter((f) =>
			/from\s+'[^']*(verticales\/|\/convex\/)/.test(readFileSync(f, 'utf8'))
		);
		expect(fautifs.map((f) => relative(process.cwd(), f))).toEqual([]);
	});
});
```

- [ ] **Step 9: Lancer les tests**

Run: `./node_modules/.bin/vitest run src/lib/croissance`
Expected: PASS.

- [ ] **Step 10: Commit** — `feat(croissance): la logique pure du moteur (source, étapes, score, conseils)`.

---

### Task 2: Les tables, la purge, et la source à la création de l'établissement

**Files:**
- Create: `src/lib/convex/croissance/tables.ts`
- Modify: `src/lib/convex/schema.ts` (spread `croissanceTables` ; deux champs sur `organizationMembers`)
- Modify: `src/lib/convex/rgpd.ts` (purge des deux tables, union de types)
- Modify: `src/lib/convex/__tests__/purge-complete.test.ts` (lire aussi `croissance/tables.ts`)
- Create: `src/app/source-visite.ts` (amorce du `<head>` + lecture)
- Modify: `src/routes/__root.tsx` (poser l'amorce)
- Modify: `src/lib/convex/organizations.ts` (`createOrganization` accepte `source`)
- Modify: `src/routes/bienvenue.tsx` (joindre la source)

**Interfaces:**
- Consumes: `lireSource`, `SourceVisite` (Task 1).
- Produces:
  - tables `parcoursComptes` (champs : `organizationId`, `source?`, `etapes`, `formuleVue?`, `rythmeVu?`, `score?`, `raisonsDuScore?`, `interetFormuleLe?`, `prochainConseilLe?`, `releveLe?` ; index `by_org`, `by_prochain_conseil`) et `envoisCroissance` (`organizationId`, `userId`, `cle`, `le` ; index `by_org`) ;
  - `vSourceVisite`, `vEtapes` (validateurs) ;
  - `organizationMembers.conseilsParCourriel?: boolean`, `organizationMembers.jetonConseils?: string` ;
  - `lireSourceDeLaVisite(): { url: string; referent: string } | undefined` (navigateur) ;
  - `createOrganization({ …, source?: { url, referent } })`.

- [ ] **Step 1:** Écrire `croissance/tables.ts` :

```ts
import { defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * LES TABLES DU MOTEUR DE CROISSANCE (16/10/2026).
 *
 * Ce que Letikette sait de ses propres clients — d'où ils viennent, où ils en
 * sont — et jamais rien de leurs débiteurs. Cloisonnées et purgées comme le
 * reste : un établissement effacé ne laisse pas sa trace ici.
 */

export const vSourceVisite = v.object({
	canal: v.union(
		v.literal('direct'),
		v.literal('recherche'),
		v.literal('assistant'),
		v.literal('social'),
		v.literal('campagne'),
		v.literal('site')
	),
	pageEntree: v.string(),
	referent: v.optional(v.string()),
	utmSource: v.optional(v.string()),
	utmMedium: v.optional(v.string()),
	utmCampaign: v.optional(v.string())
});

const date = v.optional(v.number());
export const vEtapes = v.object({
	INSCRIT: date,
	ENTREPRISE: date,
	FACTURES_DEPOSEES: date,
	MONTANT_REVELE: date,
	RELANCES_ACTIVEES: date,
	ESSAI: date,
	ABONNE: date,
	MONTEE_EN_GAMME: date,
	A_RISQUE: date,
	RESILIE: date,
	RECONQUIS: date
});

export const vCleConseil = v.union(
	v.literal('bienvenue'),
	v.literal('il-manque-vos-factures'),
	v.literal('ce-qui-vous-est-du'),
	v.literal('ce-qui-partirait')
);

export const croissanceTables = {
	parcoursComptes: defineTable({
		organizationId: v.id('organizations'),
		source: v.optional(vSourceVisite),
		etapes: vEtapes,
		formuleVue: v.optional(v.union(v.literal('solo'), v.literal('equipe'), v.literal('pro'))),
		rythmeVu: v.optional(v.union(v.literal('mensuel'), v.literal('annuel'))),
		score: v.optional(v.number()),
		raisonsDuScore: v.optional(v.array(v.string())),
		/** La dernière ouverture du choix de formule. */
		interetFormuleLe: v.optional(v.number()),
		/** Quand regarder de nouveau s'il y a un conseil à envoyer ; absent : rien en vue. */
		prochainConseilLe: v.optional(v.number()),
		releveLe: v.optional(v.number())
	})
		.index('by_org', ['organizationId'])
		.index('by_prochain_conseil', ['prochainConseilLe']),

	envoisCroissance: defineTable({
		organizationId: v.id('organizations'),
		userId: v.string(),
		cle: vCleConseil,
		le: v.number()
	}).index('by_org', ['organizationId'])
};
```

- [ ] **Step 2:** Dans `schema.ts`, importer `croissanceTables` et l'étaler après `...risqueTables` ; ajouter sur `organizationMembers` :

```ts
		/** Les conseils de Plume par e-mail (`croissance/conseils.ts`). Absent : ils partent. */
		conseilsParCourriel: v.optional(v.boolean()),
		/** Le jeton du lien de désinscription des conseils, tiré au premier envoi. */
		jetonConseils: v.optional(v.string())
```

et l'index `.index('by_jeton_conseils', ['jetonConseils'])` sur `organizationMembers`.

- [ ] **Step 3:** Dans `rgpd.ts`, après `journeesPlume` :

```ts
		// Ce que Letikette savait de ce compte : sa source, ses étapes, ses conseils.
		budget = await viderParIndexOrg(ctx, 'envoisCroissance', organizationId, budget);
		budget = await viderParIndexOrg(ctx, 'parcoursComptes', organizationId, budget);
```

et ajouter `| 'envoisCroissance' | 'parcoursComptes'` à l'union de `viderParIndexOrg`.

- [ ] **Step 4:** Dans `purge-complete.test.ts`, lire aussi `croissance/tables.ts` et `risque/tables.ts` :

```ts
	const sources = [
		lire('recouvrement/tables.ts'),
		lire('risque/tables.ts'),
		lire('croissance/tables.ts'),
		lire('schema.ts')
	].join('\n');
```

Run: `./node_modules/.bin/vitest run src/lib/convex/__tests__/purge-complete.test.ts` → PASS (si une table de `risque/` manque à la purge, l'ajouter à `rgpd.ts`).

- [ ] **Step 5:** Écrire `src/app/source-visite.ts` :

```ts
/**
 * LA SOURCE DE LA VISITE, GARDÉE LE TEMPS DE LA VISITE (16/10/2026).
 *
 * L'amorce tourne dans le `<head>`, avant l'application : la première page vue de
 * l'onglet note son adresse et son site d'origine dans `sessionStorage`, une fois.
 * Ni cookie ni identifiant : l'onglet fermé, il ne reste rien. ⚠️ JAMAIS SUR LA
 * PAGE OÙ LE CLIENT PAIE (`/p/<jeton>`) : c'est le débiteur de nos clients.
 * La lecture (`lireSource`) se fait côté serveur, à la création de l'établissement.
 */
const CLE = 'letikette.source';

export const AMORCE_SOURCE = `try{if(!/^\\/p\\//.test(location.pathname)&&!sessionStorage.getItem('${CLE}')){sessionStorage.setItem('${CLE}',JSON.stringify({url:location.href.slice(0,2000),referent:(document.referrer||'').slice(0,2000)}))}}catch(e){}`;

export function lireSourceDeLaVisite(): { url: string; referent: string } | undefined {
	try {
		const brut = sessionStorage.getItem(CLE);
		if (brut === null) return undefined;
		const lu = JSON.parse(brut) as { url?: unknown; referent?: unknown };
		if (typeof lu.url !== 'string' || typeof lu.referent !== 'string') return undefined;
		return { url: lu.url.slice(0, 2000), referent: lu.referent.slice(0, 2000) };
	} catch {
		return undefined;
	}
}
```

- [ ] **Step 6:** Dans `__root.tsx`, juste après l'amorce d'installation : `<script dangerouslySetInnerHTML={{ __html: AMORCE_SOURCE }} />` (import depuis `../app/source-visite`).

- [ ] **Step 7:** Dans `createOrganization` : arg `source: v.optional(v.object({ url: v.string(), referent: v.string() }))` ; après l'insertion du membre :

```ts
		// La source de l'inscription et la première étape (`croissance/`), lues côté
		// serveur : une adresse se fabrique, `lireSource` la borne.
		await ctx.db.insert('parcoursComptes', {
			organizationId: orgId,
			...(args.source === undefined
				? {}
				: { source: lireSource({ url: args.source.url.slice(0, 2000), referent: args.source.referent.slice(0, 2000) }) }),
			etapes: { INSCRIT: Date.now() },
			prochainConseilLe: Date.now()
		});
```

(import `lireSource` depuis `../croissance/source`). Le relevé complet est planifié en Task 3.

- [ ] **Step 8:** Dans `bienvenue.tsx`, à l'appel `creer({...})`, ajouter `...(lireSourceDeLaVisite() ? { source: lireSourceDeLaVisite() } : {})` (une variable locale pour ne lire qu'une fois).

- [ ] **Step 9:** `./node_modules/.bin/tsc -p src/lib/convex/tsconfig.json --noEmit && ./node_modules/.bin/tsc --noEmit` → OK ; tests de la purge et du cloisonnement → PASS.

- [ ] **Step 10: Commit** — `feat(croissance): la source de chaque inscription, et ses tables purgées`.

---

### Task 3: Le relevé des étapes et le score

**Files:**
- Create: `src/lib/convex/croissance/releve.ts`
- Modify: `src/lib/convex/organizations.ts` (planifier le relevé après la création)
- Modify: `src/lib/convex/recouvrement/depotMutations.ts` (`marquerBilan` : planifier le relevé)
- Modify: `src/lib/convex/recouvrement/pilote.ts` (`activerRelances` : planifier le relevé)
- Modify: `src/lib/convex/crons.ts` (relevé de tous, chaque nuit)
- Create: `src/lib/convex/croissance/interet.ts` (`noterInteretFormule`) et son appel là où part `suivre('paiement-ouvert')`

**Interfaces:**
- Consumes: `deduireEtapes`, `calculerScore`, `prochainConseil` (Task 1) ; tables (Task 2).
- Produces: `internal.croissance.releve.releverLesEtapes({ organizationId })`, `internal.croissance.releve.releverTous({})`, `api.croissance.interet.noterInteretFormule({})`.

- [ ] **Step 1:** Écrire `releve.ts` :

```ts
import { v } from 'convex/values';
import { internalMutation, type MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { deduireEtapes, type EtatDuCompte, type FormuleVue } from '../../croissance/etapes';
import { calculerScore } from '../../croissance/score';
import { prochainConseil } from '../../croissance/conseils';

/**
 * LE RELEVÉ DES ÉTAPES (16/10/2026) — l'état d'un établissement, lu tel qu'il est.
 *
 * Appelé après la création de l'établissement, la fin d'un dépôt et l'activation
 * des relances (sans rien bloquer : `runAfter(0)`), et chaque nuit pour tous, ce
 * qui rattrape les connexions et l'abonnement sans toucher au code de facturation.
 */

const FORMULES: readonly string[] = ['solo', 'equipe', 'pro'];

async function etatDuCompte(ctx: MutationCtx, organizationId: Id<'organizations'>, aujourdHui: string): Promise<EtatDuCompte & { factures: number; membres: number } | null> {
	const org = await ctx.db.get(organizationId);
	if (org === null) return null;
	const profil = await ctx.db.query('profilsCreancier').withIndex('by_org', (q) => q.eq('organizationId', organizationId)).first();
	const premierDepot = (
		await ctx.db.query('importsRecouvrement').withIndex('by_org', (q) => q.eq('organizationId', organizationId)).collect()
	)
		.filter((i) => i.statut === 'TERMINE')
		.reduce<number | null>((m, i) => (m === null || (i.termineLe ?? i._creationTime) < m ? (i.termineLe ?? i._creationTime) : m), null);
	const echue = await ctx.db
		.query('facturesVente')
		.withIndex('by_org_and_echeance', (q) => q.eq('organizationId', organizationId).lt('dateEcheance', aujourdHui))
		.filter((q) => q.and(q.neq(q.field('statutPaiement'), 'SOLDEE'), q.neq(q.field('dateEcheance'), undefined)))
		.first();
	const factures = (await ctx.db.query('facturesVente').withIndex('by_org', (q) => q.eq('organizationId', organizationId)).take(101)).length;
	const pilote = await ctx.db.query('pilotes').withIndex('by_org', (q) => q.eq('organizationId', organizationId)).first();
	const membres = await ctx.db.query('organizationMembers').withIndex('by_organization', (q) => q.eq('organizationId', organizationId)).collect();
	const visite = await ctx.db.query('journeesPlume').withIndex('by_org', (q) => q.eq('organizationId', organizationId)).order('desc').first();
	const tier = org.paddlePlanTier === 'suivi' ? 'solo' : org.paddlePlanTier === 'procedures' ? 'equipe' : org.paddlePlanTier;
	return {
		creeLe: org.createdAt ?? org._creationTime,
		sirenConnu: (profil?.siren ?? '') !== '',
		premierDepotLe: premierDepot,
		factureEchueImpayee: echue !== null,
		relancesActiveesLe: pilote?.activeLe ?? (pilote?.envoiAutomatique ? (pilote._creationTime) : null),
		relancesActives: pilote?.envoiAutomatique === true,
		statutPaiement: org.paddleStatus ?? null,
		formule: tier !== undefined && FORMULES.includes(tier) ? (tier as FormuleVue) : null,
		rythme: org.paddleRythme ?? null,
		resiliationPrevue: org.paddleResiliationLe !== undefined && org.paddleStatus === 'active',
		derniereActivite: Math.max(visite?.vueLe ?? 0, premierDepot ?? 0, org.createdAt ?? org._creationTime),
		factures,
		membres: membres.length
	};
}
```

(L'implémenteur vérifie les noms exacts : `org.createdAt`, `pilote.activeLe`, `org.paddleStatus`, `org.paddleResiliationLe`, et l'index `by_org` de `profilsCreancier`, `importsRecouvrement`, `pilotes` — ajuster aux noms réels relevés dans `schema.ts` et `recouvrement/tables.ts`.)

Puis la mutation :

```ts
export const releverLesEtapes = internalMutation({
	args: { organizationId: v.id('organizations') },
	returns: v.null(),
	handler: async (ctx, { organizationId }): Promise<null> => {
		const maintenant = Date.now();
		const etat = await etatDuCompte(ctx, organizationId, new Date(maintenant).toISOString().slice(0, 10));
		if (etat === null) return null;
		const parcours = await ctx.db.query('parcoursComptes').withIndex('by_org', (q) => q.eq('organizationId', organizationId)).first();
		const memoire = deduireEtapes(etat, parcours ?? { etapes: {} }, maintenant);
		const { score, raisons } = calculerScore({
			etapes: memoire.etapes,
			derniereActivite: etat.derniereActivite,
			maintenant,
			factures: etat.factures,
			interetFormuleLe: parcours?.interetFormuleLe ?? null,
			membres: etat.membres
		});
		const envoyes = (await ctx.db.query('envoisCroissance').withIndex('by_org', (q) => q.eq('organizationId', organizationId)).collect()).map((e) => ({ cle: e.cle, le: e.le }));
		const prochain = prochainConseil(memoire.etapes, envoyes, maintenant);
		const champs = {
			etapes: memoire.etapes,
			...(memoire.formuleVue === undefined ? {} : { formuleVue: memoire.formuleVue }),
			...(memoire.rythmeVu === undefined ? {} : { rythmeVu: memoire.rythmeVu }),
			score,
			raisonsDuScore: raisons,
			prochainConseilLe: prochain?.des,
			releveLe: maintenant
		};
		if (parcours === null) await ctx.db.insert('parcoursComptes', { organizationId, ...champs });
		else await ctx.db.patch(parcours._id, champs);
		return null;
	}
});

/** Chaque nuit : tous les établissements, par lots, pour rattraper ce qu'aucun geste n'a signalé. */
export const releverTous = internalMutation({
	args: { curseur: v.optional(v.union(v.string(), v.null())) },
	returns: v.null(),
	handler: async (ctx, { curseur }): Promise<null> => {
		const page = await ctx.db.query('organizations').paginate({ numItems: 50, cursor: curseur ?? null });
		for (const org of page.page) {
			await ctx.scheduler.runAfter(0, internal.croissance.releve.releverLesEtapes, { organizationId: org._id });
		}
		if (!page.isDone) await ctx.scheduler.runAfter(0, internal.croissance.releve.releverTous, { curseur: page.continueCursor });
		return null;
	}
});
```

- [ ] **Step 2:** Planifier `releverLesEtapes` (`ctx.scheduler.runAfter(0, internal.croissance.releve.releverLesEtapes, { organizationId })`) à la fin de `createOrganization`, de `marquerBilan` (après le `patch`, en relisant l'import pour son `organizationId`), et de `activerRelances`.

- [ ] **Step 3:** `crons.ts` : `crons.daily('releveCroissance', { hourUTC: 2, minuteUTC: 30 }, internal.croissance.releve.releverTous, {});`

- [ ] **Step 4:** `interet.ts` — une mutation de la personne connectée :

```ts
import { v } from 'convex/values';
import { authedMutation } from '../functions';
import { getUserOrg } from '../lib/auth';

/** Le gérant a ouvert le choix de formule : un signal d'intérêt pour le score. */
export const noterInteretFormule = authedMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		const parcours = await ctx.db.query('parcoursComptes').withIndex('by_org', (q) => q.eq('organizationId', organizationId)).first();
		if (parcours !== null) await ctx.db.patch(parcours._id, { interetFormuleLe: Date.now() });
		return null;
	}
});
```

L'appeler (sans attendre, `void`) à côté de `suivre('paiement-ouvert')`.

- [ ] **Step 5:** Types, tests Convex existants (`./node_modules/.bin/vitest run src/lib/convex`) → PASS.

- [ ] **Step 6: Commit** — `feat(croissance): les étapes se relèvent seules, et chaque compte a son score`.

---

### Task 4: Les quatre conseils de Plume (gabarits)

**Files:**
- Create: `src/lib/convex/emails/modeles/conseils.ts`
- Modify: `src/lib/convex/emails/modeles/index.ts`
- Modify: `src/lib/convex/emails/modeles/disposition.ts` (`BlocEmail.desinscription?: string` : une ligne de pied avec le lien)
- Test: `src/lib/convex/emails/__tests__/conseils.test.ts`
- Modify: `scripts/apercu-emails.ts` (les quatre conseils)

**Interfaces:**
- Produces: `conseilHtml(d: DonneesConseil): string`, `conseilTexte(d): string`, `objetDuConseil(cle): string`, `type DonneesConseil = { cle: CleConseil; prenom?: string; nomEtablissement: string; url: string; desinscription: string; du?: { montant: string; factures: number; indemnite: string; indemniteTotale: string } }`.

- [ ] **Step 1: Test** :

```ts
import { describe, it, expect } from 'vitest';
import { conseilHtml, conseilTexte, objetDuConseil } from '../modeles/conseils';
import { CLES_CONSEILS } from '../../../croissance/conseils';

const BASE = { nomEtablissement: 'Menuiserie Dupont', url: 'https://www.letikette.com/app', desinscription: 'https://x.test/conseils?j=abc' };

describe('les conseils de Plume', () => {
	it('chaque conseil a un objet, un bouton, et le lien de désinscription dans les deux versions', () => {
		for (const cle of CLES_CONSEILS) {
			const d = { ...BASE, cle, du: { montant: '2 462,40 €', factures: 2, indemnite: '40,00 €', indemniteTotale: '80,00 €' } };
			expect(objetDuConseil(cle).length).toBeGreaterThan(5);
			expect(conseilHtml(d)).toContain(BASE.desinscription);
			expect(conseilTexte(d)).toContain(BASE.desinscription);
			expect(conseilHtml(d)).toContain(BASE.url);
		}
	});
	it('ce qui est dû porte le montant et la loi lue au registre, jamais un verdict', () => {
		const d = { ...BASE, cle: 'ce-qui-vous-est-du' as const, du: { montant: '2 462,40 €', factures: 2, indemnite: '40,00 €', indemniteTotale: '80,00 €' } };
		const html = conseilHtml(d);
		expect(html).toContain('2 462,40 €');
		expect(html).toContain('80,00 €');
		expect(html).not.toMatch(/vous devriez|garanti/i);
	});
});
```

- [ ] **Step 2:** Écrire `conseils.ts` (coquille commune, `plume: true`, textes ci-dessous) :

| Clé | Objet | Titre | Intro | Bouton |
|---|---|---|---|---|
| `bienvenue` | Bienvenue sur Letikette | Bienvenue, {prénom} | Je suis Plume. Voici comment ça se passe : vous déposez vos factures, je lis ce qui reste dû et depuis quand, et vous décidez ce qui part, à votre nom. | Déposer mes factures (`/app/coffre?deposer=1`) |
| `il-manque-vos-factures` | Il me manque vos factures | Il me manque vos factures | Pour vous dire ce qui vous est dû, je dois les lire. Trois façons, au choix : | Déposer mes factures |
| `ce-qui-vous-est-du` | Ce qui vous est dû | Voici ce qu'on vous doit | J'ai lu vos factures : {n} sont échues et pas encore réglées. | Voir le détail (`/app`) |
| `ce-qui-partirait` | Ce qui partirait pour vous | Ce qui partirait si vous activez les relances | Rien ne part sans votre accord. Si vous activez les relances, voici ce que j'enverrais, à votre nom : | Voir le plan (`/app`) |

- `il-manque-vos-factures` : points « Un export de votre logiciel de facturation ou de comptabilité », « Une connexion à Qonto, Pennylane ou votre logiciel », « Une photo de vos factures ».
- `ce-qui-vous-est-du` : `montant` { libelle « Factures échues, à ce jour », valeur `du.montant`, precision « Le montant TTC encore dû, hors pénalités de retard. » } ; `rangees` [{ « Frais de recouvrement prévus par la loi », `${du.factures} × ${du.indemnite} = ${du.indemniteTotale}` }] ; `corps` « Les pénalités de retard s'y ajoutent, calculées jour par jour, facture par facture, dans Letikette. »
- `ce-qui-partirait` : points « Un premier rappel, trois jours après l'échéance », « Un second rappel, dix jours plus tard », « Une lettre officielle, dix jours après », puis corps « Chaque relance s'affiche une heure avant de partir, et se retient d'un geste. Un client qui paie entre-temps n'est plus relancé. » (délais lus dans `plan-relance.ts` côté appelant si exportés en constantes ; sinon ce texte reprend le plan documenté de CLAUDE.md, à vérifier à l'implémentation).
- Note commune : « Vous recevez ces conseils parce que vous utilisez Letikette pour {nomEtablissement}. » + `desinscription` : ligne « Ne plus recevoir les conseils de Plume » liée.

- [ ] **Step 3:** Ajouter `desinscription?: string` à `BlocEmail` ; `coquilleHtml` l'écrit sous la note (`<a href>` « Ne plus recevoir les conseils de Plume ») ; `coquilleTexte` ajoute « Ne plus recevoir les conseils de Plume : {url} ».

- [ ] **Step 4:** Tests → PASS ; `bun scripts/apercu-emails.ts <scratch>` montre les quatre conseils.

- [ ] **Step 5: Commit** — `feat(croissance): les quatre conseils de Plume`.

---

### Task 5: L'envoi des conseils, la désinscription, et le réglage du profil

**Files:**
- Create: `src/lib/convex/croissance/conseils.ts` (tâche d'envoi, destinataires, désinscription)
- Modify: `src/lib/convex/crons.ts` (toutes les quinze minutes)
- Modify: `src/lib/convex/http.ts` (route `/conseils/desinscription`, GET et POST)
- Modify: `src/lib/convex/recouvrement/briefing.ts` (ou nouveau `croissance/reglage.ts`) : `mesConseils`, `reglerMesConseils`
- Modify: `src/screens/compte/compte.tsx` (une seconde ligne dans « Notifications »)
- Modify: `src/routes/app/compte.tsx`, `src/routes/-salle/compte.tsx`
- Modify: `src/lib/convex/emails/essai.ts` (les quatre conseils dans l'essai)
- Test: `src/lib/convex/__tests__/conseilsCroissance.test.ts`

**Interfaces:**
- Consumes: `prochainConseil` (Task 1), `conseilHtml/Texte/objetDuConseil` (Task 4), `prochainCreneauDEnvoi` (`verticales/recouvrement/plan-relance.ts`), `PARAMETRES.indemniteForfaitaire` + `exiger`, `versEuros`, `resteDu` (`recouvrement/lecture.ts`).
- Produces: `internal.croissance.conseils.envoyerLesConseils({})`, `destinatairesDesConseils(membres, emails)` (pure, exportée pour le test), `desinscriptionConseils` (httpAction).

- [ ] **Step 1: Test** de `destinatairesDesConseils` (pure) : un membre coupé (`conseilsParCourriel: false`) est exclu ; un membre sans e-mail est exclu ; les autres restent.

- [ ] **Step 2:** `envoyerLesConseils` (internalMutation) : lit `parcoursComptes` par `by_prochain_conseil` avec `prochainConseilLe <= maintenant` (50 au plus) ; pour chacun : recalcule `prochainConseil` ; si `des > maintenant` → patch `prochainConseilLe = des` ; sinon si `prochainCreneauDEnvoi(maintenant) > maintenant` → patch au créneau ; sinon compose (pour `ce-qui-vous-est-du` : factures échues non soldées, `resteDu`, `exiger(PARAMETRES.indemniteForfaitaire)`), tire `jetonConseils` (`crypto.randomUUID()`) pour chaque destinataire qui n'en a pas, envoie par `resend.sendEmail` (expéditeur `expediteurNomme(AUTH_EMAIL, 'Plume de Letikette')`, en-têtes `List-Unsubscribe: <{CONVEX_SITE_URL}/conseils/desinscription?j=…>` et `List-Unsubscribe-Post: List-Unsubscribe=One-Click`), insère `envoisCroissance`, puis relève le prochain. Sans `RESEND_API_KEY` ou `AUTH_EMAIL` : rien n'est noté envoyé, on réessaie dans une heure.

- [ ] **Step 3:** La route : `GET /conseils/desinscription?j=` → page HTML minimale (« Ne plus recevoir les conseils de Plume ? » + un bouton qui POST) ; `POST` → cherche le membre par `by_jeton_conseils`, met `conseilsParCourriel: false`, répond « C'est noté. » (200 même si le jeton est inconnu, pour ne rien révéler). Test : un GET ne modifie rien.

- [ ] **Step 4:** Réglage du profil : `mesConseils` / `reglerMesConseils` sur le modèle de `monPointDuMatin` / `reglerPointDuMatin` ; `ContenuNotifications` devient générique (`libelle`, `aide`, `parCourriel`, `onRegler`) et la section « Notifications » en montre deux : « Le point du matin, par e-mail » et « Les conseils de Plume, par e-mail » (aide : « Quatre au plus, dans vos premières semaines, et jamais deux en deux jours. »).

- [ ] **Step 5:** `crons.ts` : `crons.interval('conseilsCroissance', { minutes: 15 }, internal.croissance.conseils.envoyerLesConseils, {});`

- [ ] **Step 6:** `essai.ts` : ajouter les quatre conseils (données de démonstration, lien de désinscription factice) ; l'essai passe de 12 à 16 e-mails.

- [ ] **Step 7:** Types, lint, tests → PASS. **Commit** — `feat(croissance): les conseils de Plume partent seuls, et se coupent d'un geste`.

---

### Task 6: Le point chiffré du lundi

**Files:**
- Create: `src/lib/convex/croissance/point.ts` (requête des chiffres, action d'envoi)
- Create: `src/lib/convex/croissance/umami.ts` (lecture des visiteurs de la semaine)
- Create: `src/lib/convex/emails/modeles/pointDuLundi.ts`
- Modify: `src/lib/convex/crons.ts` (lundi 5 h UTC)
- Modify: `src/lib/convex/emails/essai.ts` (le point dans l'essai)
- Test: `src/lib/convex/emails/__tests__/pointDuLundi.test.ts`

**Interfaces:**
- Consumes: `compterParSource`, `ETAPES_DU_POINT`, `libelleDeSource` (Task 1).
- Produces: `internal.croissance.point.chiffresDeLaSemaine({ maintenant })` (internalQuery), `internal.croissance.point.envoyerLePoint({})` (internalAction), `pointDuLundiHtml/Texte(d: DonneesPoint)`.

- [ ] **Step 1:** `chiffresDeLaSemaine` : tous les `parcoursComptes` (avec le nom de l'établissement) ; `compterParSource` sur 7 et 28 jours ; les dix meilleurs scores (nom, score, dernière étape atteinte) ; le nombre d'abonnés et d'essais en cours.

- [ ] **Step 2:** `umami.ts` : `GET https://api.umami.is/v1/websites/${SITE_UMAMI}/stats?startAt=…&endAt=…` avec l'en-tête `x-umami-api-key` ; rend `{ visiteurs, pagesVues } | null` (null sans `UMAMI_API_KEY` ou en cas d'erreur).

- [ ] **Step 3:** Le gabarit (coquille commune) : titre « Le point du lundi », intro « Semaine du {lundi} au {dimanche}. » ; `rangees` : Visiteurs du site, Inscrits, Factures déposées, Factures échues trouvées, Relances activées, Essais, Abonnés, Résiliés (valeur « 3 · 28 j : 9 ») ; `points` : une ligne par source (« Recherche : 3 inscrits, 1 dépôt ») ; un second `points` titré dans `corps` « À appeler » avec les meilleurs scores (« Menuiserie Dupont, 72, relances activées »). Sans visiteurs : « Umami n'est pas branché : posez UMAMI_API_KEY. » Test : les chiffres passés apparaissent dans les deux versions ; aucun montant.

- [ ] **Step 4:** `envoyerLePoint` : lit `FONDATEUR_EMAIL` (absent : retour silencieux), la requête, Umami, envoie par Resend (expéditeur `expediteurNomme(AUTH_EMAIL, 'Plume de Letikette')`).

- [ ] **Step 5:** `crons.weekly('pointDuLundi', { dayOfWeek: 'monday', hourUTC: 5, minuteUTC: 0 }, internal.croissance.point.envoyerLePoint, {});`

- [ ] **Step 6:** Types, lint, tests → PASS. **Commit** — `feat(croissance): le point chiffré du lundi`.

---

### Task 7: La politique de confidentialité, les barrières de vocabulaire, la livraison

**Files:**
- Modify: `src/lib/__tests__/mots-interdits.test.ts` (ajouter `join('src', 'lib', 'croissance')`)
- Modify: `src/lib/__tests__/lexique.test.ts` (ajouter `join('src', 'lib', 'croissance')`)
- Modify: la politique de confidentialité (`src/routes/politique-de-confidentialite.tsx` et sa source `docs/juridique/03-politique-de-confidentialite.md`) : nouvelle version ; finalités « accompagnement à l'utilisation (étapes, score) » et « conseils par e-mail », durée (celle du compte), opposition (réglage du profil, lien de chaque e-mail).
- Modify: `CLAUDE.md` (un paragraphe « Le moteur de croissance »)

- [ ] **Step 1:** Barrières → `./node_modules/.bin/vitest run src/lib/__tests__` → PASS.
- [ ] **Step 2:** Politique de confidentialité, version incrémentée ; `vite build` → OK.
- [ ] **Step 3:** Suite complète des tests touchés, `tsc` (deux projets), `eslint` sur les fichiers modifiés.
- [ ] **Step 4: Commit et livraison** : `git push -q origin HEAD:main`, statut du déploiement par l'API GitHub, puis `npx convex run --prod emails/essai:envoyerTout '{"a":"<fondateur>"}'` pour voir les nouveaux e-mails.
