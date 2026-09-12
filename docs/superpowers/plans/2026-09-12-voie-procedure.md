# La voie de la procédure : plan d'implémentation

> **Pour les agents :** SOUS-SKILL REQUISE. Utiliser `superpowers:subagent-driven-development`
> (recommandé) ou `superpowers:executing-plans` pour exécuter ce plan tâche par tâche.
> Les étapes sont en cases à cocher (`- [ ]`).

**But :** une procédure engagée devient un objet visible, avec un rail qui montre toute la voie,
un compte à rebours sur ce qui s'éteint, un geste de déclaration qu'on ne peut pas manquer, et un
intervenant qu'on choisit sans quitter l'application.

**Architecture :** tout le calcul du rail vit dans `src/lib/verticales/recouvrement/`, en
fonctions pures, testables sans Convex ni navigateur. Convex n'expose que des `query` / `mutation`
/ `action` qui appellent le domaine. Les écrans vivent dans `src/screens/` (sans requête) et les
routes dans `src/routes/` (lecture et traduction seulement), pour que la salle d'exposition puisse
les rendre sans backend.

**Pile :** React 19, TanStack Start, TanStack Router, Convex, Cladd (`@cladd-ui/react`),
Tailwind v4, Vitest, bun.

**Spec :** `docs/superpowers/specs/2026-09-12-voie-procedure-design.md` (commit `5947d9c`).

**Commandes utiles**

```bash
bunx vitest --run <chemin-du-test> --reporter=dot
```

```bash
bun run check
```

Les commits se font avec `--no-verify` : les hooks de pré-commit dépassent deux minutes.

---

## Découpage et tranche livrable

Les tâches 1 à 9 forment une tranche complète et livrable : le rail, le carnet, l'onglet, le
déroulé d'une voie et la déclaration. Elles satisfont à elles seules les critères 1 et 2 de la
spec. Les tâches 10 et 11 ajoutent les deux répertoires publics et referment le critère 3. Ne pas
commencer 10 avant que 9 soit vert.

**Trois barrières passent volontairement au rouge entre deux tâches.** C'est le prix de tâches
petites, et c'est la barrière qui fait son travail. Aucune ne se désarme, aucune n'accepte de
dette « on verra plus tard » : chacune redevient verte d'elle-même à la tâche qui la referme.

| Barrière | Rouge à partir de | Verte à | Pourquoi |
| --- | --- | --- | --- |
| `champs-alimentes.test.ts` | tâche 4 | tâche 5 | la table `intervenants` est déclarée avant que la moindre mutation ne l'écrive |
| `declare-jamais-alimente.test.ts` | tâche 4 | tâche 5 | les cinq valeurs d'union (`AVOCAT`, `COMMISSAIRE_DE_JUSTICE`, `AUTRE`, `SAISI_A_LA_MAIN`, `RETENU_DEPUIS_UN_REPERTOIRE`) ne sont citées nulle part avant les validateurs de la tâche 5 |
| `fonctions-appelees.test.ts` | tâches 6 et 8 | tâches 8 et 9 | `dossiersEngages` puis `rattacherIntervenant` existent avant l'écran qui les appelle |

⚠️ Ne jamais refermer l'une d'elles en supprimant la fonction, en inscrivant le champ dans une
liste de tolérance, ni en affaiblissant le balayage. Si une barrière est encore rouge après la
tâche censée la refermer, c'est que la tâche est incomplète, pas que la barrière a tort.

| Fichier | Responsabilité |
| --- | --- |
| `src/lib/verticales/recouvrement/apres-procedure.ts` | ajout : la ligne principale de chaque machine, et le parcours daté |
| `src/lib/verticales/recouvrement/parametres.ts` | ajout : l'entrée `professionCompetenteParActe` |
| `src/lib/convex/recouvrement/tables.ts` | ajout : `intervenants`, un champ sur `creances`, puis `annuaireAvocats` |
| `src/lib/convex/rgpd.ts` | ajout : `intervenants` dans la purge |
| `src/lib/convex/recouvrement/intervenants.ts` | nouveau : le carnet |
| `src/lib/convex/recouvrement/annuaires.ts` | nouveau : recherche d'avocats et de commissaires |
| `src/lib/convex/recouvrement/apresProcedure.ts` | ajout : `dossiersEngages`, `rattacherIntervenant` |
| `src/lib/convex/recouvrement/lecture.ts` | ajout : le déroulé d'une voie sur `creanceComplete` |
| `src/ui/rail-procedure.tsx` | nouveau : le rail, et les branches |
| `src/ui/feuille-voie.tsx` | nouveau : une voie avant engagement, et le geste de déclaration |
| `src/ui/choix-intervenant.tsx` | nouveau : la feuille « qui fait l'acte » |
| `src/ui/navigation.tsx` | ajout : `LigneBouton`, la rangée qui ouvre une feuille au lieu de naviguer |
| `src/screens/procedures.tsx` | nouveau : l'écran de l'onglet, sans requête |
| `src/screens/accueil.tsx` | ajout : la section « Ce qui court » |
| `src/routes/app/procedures.tsx` | nouveau : la route `?p=` |
| `src/routes/app/creance_.$id.procedure.tsx` | refonte : rangées et feuilles au lieu de cartes de prose |
| `src/app/barre.tsx` | modification : quatrième onglet |
| `scripts/importer-annuaire-avocats.ts` | nouveau : l'ingestion mensuelle du fichier du CNB |

---

## Tâche 1 : la ligne principale, déclarée et non devinée

Une machine à états n'est pas une ligne. Pour dessiner un rail il faut savoir quels états sont
sur la voie principale et lesquels sont des branches. Ce n'est pas devinable : dans l'injonction,
`OPPOSITION` et `TITRE_EXECUTOIRE` sont tous deux terminaux et à la même profondeur, et tout
parcours automatique choisirait l'un pour l'autre une fois sur deux. On le déclare.

**Fichiers :**
- Modifier : `src/lib/verticales/recouvrement/apres-procedure.ts`
- Créer : `src/lib/verticales/recouvrement/__tests__/ligne-voie.test.ts`

- [ ] **Étape 1 : écrire le test qui échoue**

Créer `src/lib/verticales/recouvrement/__tests__/ligne-voie.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { MACHINES, etapesDeLaVoie } from '../apres-procedure';

describe('la ligne principale de chaque machine', () => {
	it('commence toujours par l’état d’entrée', () => {
		for (const [cle, machine] of Object.entries(MACHINES)) {
			expect(machine.ligne[0], `machine « ${cle} »`).toBe(machine.entree);
		}
	});

	it('ne nomme que des états qui existent', () => {
		for (const [cle, machine] of Object.entries(MACHINES)) {
			for (const etat of machine.ligne) {
				expect(machine.etats[etat], `« ${etat} » dans « ${cle} »`).toBeDefined();
			}
		}
	});

	/**
	 * La barrière qui compte. Un état atteignable qui ne serait ni sur la ligne
	 * ni rattaché à une étape de la ligne disparaîtrait du rail sans que rien ne
	 * casse : le gérant verrait une voie amputée d'une issue possible.
	 */
	it('rattache tout état hors ligne à une étape de la ligne', () => {
		for (const [cle, machine] of Object.entries(MACHINES)) {
			const surLaLigne = new Set(machine.ligne);
			const rattaches = new Set(
				etapesDeLaVoie(cle).flatMap((etape) => etape.branches.map((b) => b.etat))
			);
			for (const nom of Object.keys(machine.etats)) {
				if (surLaLigne.has(nom)) continue;
				expect(rattaches.has(nom), `« ${nom} » de « ${cle} » n’est sur aucun rail`).toBe(true);
			}
		}
	});

	it('décrit l’injonction de payer en quatre étapes et deux branches', () => {
		const etapes = etapesDeLaVoie('injonction-de-payer');
		expect(etapes.map((e) => e.etat)).toEqual([
			'REQUETE_DEPOSEE',
			'ORDONNANCE_RENDUE',
			'ORDONNANCE_SIGNIFIEE',
			'TITRE_EXECUTOIRE'
		]);
		expect(etapes[0]!.branches.map((b) => b.etat)).toEqual(['REQUETE_REJETEE']);
		expect(etapes[2]!.branches.map((b) => b.etat)).toEqual(['OPPOSITION']);
	});

	it('lève sur une procédure sans machine plutôt que de rendre une voie vide', () => {
		expect(() => etapesDeLaVoie('relance-amiable')).toThrow(/relance-amiable/);
	});
});
```

- [ ] **Étape 2 : lancer le test pour vérifier qu'il échoue**

```bash
bunx vitest --run src/lib/verticales/recouvrement/__tests__/ligne-voie.test.ts --reporter=dot
```

Attendu : ÉCHEC, `etapesDeLaVoie is not a function`.

- [ ] **Étape 3 : ajouter `ligne` à l'interface et aux deux machines**

Dans `src/lib/verticales/recouvrement/apres-procedure.ts`, remplacer l'interface
`MachineProcedure` par :

```ts
export interface MachineProcedure {
	readonly entree: string;
	readonly etats: Readonly<Record<string, EtatProcedure>>;
	/**
	 * LA LIGNE PRINCIPALE, DÉCLARÉE ET NON DEVINÉE.
	 *
	 * Un rail a besoin de savoir quels états sont sur la voie et lesquels sont
	 * des branches. Aucun parcours automatique ne peut le dire : dans
	 * l'injonction, `OPPOSITION` et `TITRE_EXECUTOIRE` sont tous deux terminaux
	 * et à la même profondeur depuis l'entrée. Un « plus long chemin » choisirait
	 * l'un pour l'autre selon l'ordre de déclaration des transitions, et le rail
	 * annoncerait l'opposition comme l'issue normale de la procédure.
	 *
	 * ⚠️ CE N'EST PAS UNE DÉCORATION D'ÉCRAN. `ligne-voie.test.ts` échoue si un
	 * état atteignable n'est ni sur la ligne ni rattaché à une de ses étapes :
	 * une issue oubliée disparaîtrait du rail sans que rien ne casse.
	 */
	readonly ligne: readonly string[];
}
```

Dans `const injonctionDePayer: MachineProcedure = {`, ajouter juste après `entree` :

```ts
	ligne: ['REQUETE_DEPOSEE', 'ORDONNANCE_RENDUE', 'ORDONNANCE_SIGNIFIEE', 'TITRE_EXECUTOIRE'],
```

Dans `const l126: MachineProcedure = {`, ajouter juste après `entree` :

```ts
	ligne: ['ENGAGEE', 'COMMANDEMENT_SIGNIFIE', 'TITRE_EXECUTOIRE'],
```

- [ ] **Étape 4 : écrire `etapesDeLaVoie`**

À la fin de `src/lib/verticales/recouvrement/apres-procedure.ts` :

```ts
/** Une étape de la voie, avec les issues qui s'en détachent. */
export interface EtapeVoie {
	readonly etat: string;
	readonly libelle: string;
	readonly constat: string;
	readonly terminal: boolean;
	/** Les états atteignables depuis celui-ci qui ne sont PAS sur la ligne. */
	readonly branches: readonly { readonly etat: string; readonly libelle: string; readonly constat: string }[];
}

/**
 * La voie entière, telle qu'elle se dessine AVANT d'être parcourue.
 *
 * ⚠️ ELLE LÈVE SUR UNE PROCÉDURE SANS MACHINE, comme `suivreProcedure`. Une
 * voie vide se lirait « cette procédure n'a pas d'étapes », alors que la vérité
 * est « ce logiciel ne les connaît pas ».
 */
export function etapesDeLaVoie(cleProcedure: string): readonly EtapeVoie[] {
	const machine = MACHINES[cleProcedure];
	if (machine === undefined) {
		throw new Error(
			`Aucune machine à états pour « ${cleProcedure} ». Cette procédure n’a pas d’après ` +
				'modélisé dans ce logiciel.'
		);
	}

	const surLaLigne = new Set(machine.ligne);

	return machine.ligne.map((nom) => {
		const etat = machine.etats[nom]!;
		return {
			etat: nom,
			libelle: etat.libelle,
			constat: etat.constat,
			terminal: etat.terminal,
			branches: etat.transitions
				.filter((t) => !surLaLigne.has(t.vers))
				.map((t) => ({
					etat: t.vers,
					libelle: machine.etats[t.vers]!.libelle,
					constat: machine.etats[t.vers]!.constat
				}))
		};
	});
}
```

- [ ] **Étape 5 : lancer le test pour vérifier qu'il passe**

```bash
bunx vitest --run src/lib/verticales/recouvrement/__tests__/ligne-voie.test.ts --reporter=dot
```

Attendu : 5 tests passent.

- [ ] **Étape 6 : commit**

```bash
git add src/lib/verticales/recouvrement/apres-procedure.ts src/lib/verticales/recouvrement/__tests__/ligne-voie.test.ts
git commit --no-verify -m "feat(procedure): la ligne principale d'une voie se declare, elle ne se devine pas"
```

---

## Tâche 2 : le parcours daté

Le rail doit dire, pour chaque étape, si elle est franchie, courante ou à venir, et à quelle date
elle a été atteinte. Le journal porte des clés d'événement, pas des noms d'état : la conversion
est un calcul du domaine, pas une gymnastique d'écran.

**Fichiers :**
- Modifier : `src/lib/verticales/recouvrement/apres-procedure.ts`
- Modifier : `src/lib/verticales/recouvrement/__tests__/ligne-voie.test.ts`

- [ ] **Étape 1 : écrire le test qui échoue**

Ajouter à la fin de `src/lib/verticales/recouvrement/__tests__/ligne-voie.test.ts` :

```ts
import { parcoursDeLaVoie } from '../apres-procedure';

describe('le parcours daté de la voie', () => {
	it('marque l’entrée courante et date le reste à venir quand rien n’a bougé', () => {
		const etapes = parcoursDeLaVoie('injonction-de-payer', [], '2026-06-04');
		expect(etapes.map((e) => e.statut)).toEqual(['COURANTE', 'A_VENIR', 'A_VENIR', 'A_VENIR']);
		expect(etapes[0]!.atteinteLe).toBe('2026-06-04');
		expect(etapes[1]!.atteinteLe).toBeNull();
	});

	it('date chaque étape franchie par l’événement qui l’a atteinte', () => {
		const etapes = parcoursDeLaVoie(
			'injonction-de-payer',
			[{ cle: 'ordonnance-rendue', survenuLe: '2026-08-28' }],
			'2026-06-04'
		);
		expect(etapes.map((e) => e.statut)).toEqual(['FRANCHIE', 'COURANTE', 'A_VENIR', 'A_VENIR']);
		expect(etapes[0]!.atteinteLe).toBe('2026-06-04');
		expect(etapes[1]!.atteinteLe).toBe('2026-08-28');
	});

	/**
	 * Une sortie par une branche laisse la ligne inachevée, et le rail doit le
	 * montrer tel quel : les étapes suivantes ne sont pas « à venir », elles ne
	 * viendront plus. Les marquer `A_VENIR` ferait croire à un dossier qui avance.
	 */
	it('marque la branche prise et laisse la suite de la ligne hors d’atteinte', () => {
		const etapes = parcoursDeLaVoie(
			'injonction-de-payer',
			[
				{ cle: 'ordonnance-rendue', survenuLe: '2026-08-28' },
				{ cle: 'ordonnance-signifiee', survenuLe: '2026-09-02' },
				{ cle: 'opposition-formee', survenuLe: '2026-09-20' }
			],
			'2026-06-04'
		);
		expect(etapes.map((e) => e.statut)).toEqual([
			'FRANCHIE',
			'FRANCHIE',
			'FRANCHIE',
			'HORS_ATTEINTE'
		]);
		expect(etapes[2]!.brancheSuivie).toEqual({
			etat: 'OPPOSITION',
			survenuLe: '2026-09-20'
		});
	});
});
```

- [ ] **Étape 2 : lancer le test pour vérifier qu'il échoue**

```bash
bunx vitest --run src/lib/verticales/recouvrement/__tests__/ligne-voie.test.ts --reporter=dot
```

Attendu : ÉCHEC, `parcoursDeLaVoie is not a function`.

- [ ] **Étape 3 : écrire `parcoursDeLaVoie`**

À la fin de `src/lib/verticales/recouvrement/apres-procedure.ts` :

```ts
export type StatutEtape = 'FRANCHIE' | 'COURANTE' | 'A_VENIR' | 'HORS_ATTEINTE';

export interface EtapeParcourue extends EtapeVoie {
	readonly statut: StatutEtape;
	/** La date à laquelle cette étape a été atteinte, ou `null`. */
	readonly atteinteLe: string | null;
	/** La branche réellement prise depuis cette étape, si elle l'a été. */
	readonly brancheSuivie: { readonly etat: string; readonly survenuLe: string } | null;
}

/**
 * La voie, marquée de ce qui a été parcouru.
 *
 * ⚠️ `HORS_ATTEINTE` N'EST PAS `A_VENIR`. Quand le dossier est sorti par une
 * branche — une opposition, une contestation — les étapes suivantes de la ligne
 * ne viendront plus. Les afficher « à venir » ferait lire un dossier qui avance
 * là où il a quitté la voie.
 */
export function parcoursDeLaVoie(
	cleProcedure: string,
	evenements: readonly EvenementSurvenu[],
	engageeLe: string
): readonly EtapeParcourue[] {
	const machine = MACHINES[cleProcedure]!;
	const voie = etapesDeLaVoie(cleProcedure);

	// Rejoué comme dans `suivreProcedure` : même règle, un événement hors
	// séquence est ignoré et non refusé.
	const atteintes = new Map<string, string>([[machine.entree, engageeLe]]);
	let courant = machine.entree;
	for (const evenement of evenements) {
		const etat = machine.etats[courant];
		if (etat === undefined || etat.terminal) break;
		const transition = etat.transitions.find((t) => t.cle === evenement.cle);
		if (transition === undefined) continue;
		courant = transition.vers;
		atteintes.set(courant, evenement.survenuLe);
	}

	const surLaLigne = new Set(machine.ligne);
	const sortiParUneBranche = !surLaLigne.has(courant);
	const rangCourant = machine.ligne.indexOf(courant);

	return voie.map((etape, rang) => {
		const atteinteLe = atteintes.get(etape.etat) ?? null;
		const brancheSuivie = etape.branches
			.filter((b) => atteintes.has(b.etat))
			.map((b) => ({ etat: b.etat, survenuLe: atteintes.get(b.etat)! }))[0] ?? null;

		const statut: StatutEtape = sortiParUneBranche
			? atteinteLe === null
				? 'HORS_ATTEINTE'
				: 'FRANCHIE'
			: rang < rangCourant
				? 'FRANCHIE'
				: rang === rangCourant
					? 'COURANTE'
					: 'A_VENIR';

		return { ...etape, statut, atteinteLe, brancheSuivie };
	});
}
```

- [ ] **Étape 4 : lancer le test pour vérifier qu'il passe**

```bash
bunx vitest --run src/lib/verticales/recouvrement/__tests__/ligne-voie.test.ts --reporter=dot
```

Attendu : 8 tests passent.

- [ ] **Étape 5 : commit**

```bash
git add src/lib/verticales/recouvrement/apres-procedure.ts src/lib/verticales/recouvrement/__tests__/ligne-voie.test.ts
git commit --no-verify -m "feat(procedure): le rail sait ce qui est franchi, ce qui court, et ce qui ne viendra plus"
```

---

## Tâche 3 : l'entrée au référentiel juridique

`parametres.ts` est la seule source de vérité juridique. La correspondance acte vers profession
n'est pas relevée : on l'inscrit vide, sourcée comme absente, pour que l'écran puisse dire
pourquoi il ne présélectionne rien.

**Fichiers :**
- Modifier : `src/lib/verticales/recouvrement/parametres.ts`
- Modifier : `src/lib/verticales/recouvrement/__tests__/parametres.test.ts`

- [ ] **Étape 1 : écrire le test qui échoue**

Ajouter dans `src/lib/verticales/recouvrement/__tests__/parametres.test.ts` :

```ts
describe('la profession compétente par acte', () => {
	it('existe, et se déclare non relevée', () => {
		const entree = PARAMETRES.professionCompetenteParActe;
		expect(entree.valeur).toBeNull();
		expect(entree.verifie).toBe(false);
		expect(entree.valideParAvocat).toBe(false);
	});

	it('n’est pas utilisable, donc aucun écran ne peut présélectionner', () => {
		expect(estUtilisable(PARAMETRES.professionCompetenteParActe)).toBe(false);
	});
});
```

Vérifier que `PARAMETRES` et `estUtilisable` sont bien importés en tête du fichier ; les ajouter
à l'import existant sinon.

- [ ] **Étape 2 : lancer le test pour vérifier qu'il échoue**

```bash
bunx vitest --run src/lib/verticales/recouvrement/__tests__/parametres.test.ts --reporter=dot
```

Attendu : ÉCHEC, `Cannot read properties of undefined (reading 'valeur')`.

- [ ] **Étape 3 : ajouter l'entrée**

Dans `src/lib/verticales/recouvrement/parametres.ts`, juste avant la fermeture
`} as const;` de `PARAMETRES`, et après avoir ajouté une virgule à l'entrée qui précède :

```ts
	professionCompetenteParActe: {
		cle: 'professionCompetenteParActe',
		nature: 'CONSTANTE',
		valeur: null,
		unite: 'sans',
		source: 'Non fourni — ni par le brief, ni relevé',
		verifieLe: LE,
		verifie: false,
		valideParAvocat: false,
		note:
			'Quelle profession est compétente pour quel acte : déposer une requête, signifier une ' +
			'ordonnance, dresser un procès-verbal. Tant que cette entrée est vide, l’écran « qui ' +
			'fait l’acte » propose les professions à égalité, sans présélection, et dit pourquoi. ' +
			'Présélectionner sur une correspondance devinée enverrait un gérant chez un ' +
			'professionnel qui ne peut pas faire l’acte, et lui ferait perdre le temps que la ' +
			'caducité compte.'
	} satisfies ParametreLegal<readonly string[]>
```

- [ ] **Étape 4 : lancer le test pour vérifier qu'il passe**

```bash
bunx vitest --run src/lib/verticales/recouvrement/__tests__/parametres.test.ts --reporter=dot
```

Attendu : tous les tests du fichier passent.

- [ ] **Étape 5 : commit**

```bash
git add src/lib/verticales/recouvrement/parametres.ts src/lib/verticales/recouvrement/__tests__/parametres.test.ts
git commit --no-verify -m "feat(referentiel): la correspondance acte vers profession est nommee, et declaree absente"
```

---

## Tâche 4 : la table `intervenants`, et sa purge

La table porte `organizationId`, donc `purge-complete.test.ts` échouera tant que `rgpd.ts` ne la
cite pas. C'est voulu : la barrière fait le travail sans qu'on y pense.

**Fichiers :**
- Modifier : `src/lib/convex/recouvrement/tables.ts`
- Modifier : `src/lib/convex/rgpd.ts`

- [ ] **Étape 1 : déclarer la table**

Dans `src/lib/convex/recouvrement/tables.ts`, à l'intérieur de `recouvrementTables`, après le
bloc `evenementsProcedure` :

```ts
	/**
	 * LE CARNET D'INTERVENANTS — à qui le gérant confie un acte.
	 *
	 * ⚠️ C'EST SON CARNET, PAS UN ANNUAIRE QUE LE PRODUIT PROPOSE. Le
	 * recouvrement pour compte de tiers est encadré, et recommander une
	 * procédure est la troisième ligne rouge du projet. Ce que le logiciel fait
	 * ici est plus modeste et parfaitement licite : il retient qui travaille
	 * avec ce gérant.
	 *
	 * `origine` porte la traçabilité. Une fiche retenue depuis un répertoire
	 * public garde la SOURCE et la DATE du relevé : le fichier du CNB est une
	 * photographie à un instant T, et une fiche de deux ans peut décrire une
	 * situation périmée. Sans ces deux champs, rien ne distinguerait une saisie
	 * du gérant d'une donnée officielle.
	 */
	intervenants: defineTable({
		organizationId: v.id('organizations'),
		nom: v.string(),
		role: v.union(
			v.literal('AVOCAT'),
			v.literal('COMMISSAIRE_DE_JUSTICE'),
			v.literal('AUTRE')
		),
		/** Le barreau, le ressort, ou la ville. Libre : ce n'est pas du droit. */
		ressort: v.optional(v.string()),
		telephone: v.optional(v.string()),
		courriel: v.optional(v.string()),
		adresse: v.optional(v.string()),
		siren: v.optional(v.string()),
		origine: v.union(
			v.literal('SAISI_A_LA_MAIN'),
			v.literal('RETENU_DEPUIS_UN_REPERTOIRE')
		),
		/** Le répertoire d'où vient la fiche, et quand il a été relevé. */
		sourceRepertoire: v.optional(v.string()),
		sourceReleveeLe: v.optional(v.string()),
		creeLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_role', ['organizationId', 'role']),
```

- [ ] **Étape 2 : lancer la barrière de purge pour la voir échouer**

```bash
bunx vitest --run src/lib/convex/__tests__/purge-complete.test.ts --reporter=dot
```

Attendu : ÉCHEC, `intervenants` déclare `organizationId` et n'est pas citée dans `rgpd.ts`.

- [ ] **Étape 3 : brancher la purge**

Dans `src/lib/convex/rgpd.ts`, dans le type de `viderParIndexOrg`, ajouter `| 'intervenants'` à
l'union des tables (après `| 'evenementsProcedure'`).

Puis, dans `purgerEtablissement`, ajouter la ligne juste avant celle de `evenementsProcedure` :

```ts
		// `intervenants` ne référence aucune autre table du domaine : sa place dans
		// l'ordre est libre. Elle part en premier pour rester groupée avec le reste
		// de ce que porte une procédure.
		budget = await viderParIndexOrg(ctx, 'intervenants', organizationId, budget);
```

- [ ] **Étape 4 : relancer la barrière**

```bash
bunx vitest --run src/lib/convex/__tests__/purge-complete.test.ts --reporter=dot
```

Attendu : PASSE.

- [ ] **Étape 5 : vérifier les types**

```bash
bun run check
```

Attendu : aucune erreur.

- [ ] **Étape 6 : commit**

```bash
git add src/lib/convex/recouvrement/tables.ts src/lib/convex/rgpd.ts
git commit --no-verify -m "feat(intervenants): le carnet du gerant, cloisonne et purge comme le reste"
```

---

## Tâche 5 : les fonctions du carnet

**Fichiers :**
- Créer : `src/lib/convex/recouvrement/intervenants.ts`
- Créer : `src/lib/convex/__tests__/intervenants.test.ts`

- [ ] **Étape 1 : écrire le test qui échoue**

Créer `src/lib/convex/__tests__/intervenants.test.ts` :

```ts
/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

async function unEtablissement(t: ReturnType<typeof convexTest>): Promise<Id<'organizations'>> {
	return await t.run(async (ctx) =>
		ctx.db.insert('organizations', { name: 'Ets de test', slug: 'ets-de-test' })
	);
}

describe('le carnet d’intervenants', () => {
	it('retient une fiche saisie à la main, et la rend', async () => {
		const t = convexTest(schema);
		const organizationId = await unEtablissement(t);

		await t.mutation(internal.recouvrement.intervenants.ajouterInterne, {
			organizationId,
			nom: 'Étude Sellier',
			role: 'COMMISSAIRE_DE_JUSTICE',
			ressort: 'Rennes',
			origine: 'SAISI_A_LA_MAIN'
		});

		const carnet = await t.query(internal.recouvrement.intervenants.listerInterne, {
			organizationId
		});
		expect(carnet).toHaveLength(1);
		expect(carnet[0]!.nom).toBe('Étude Sellier');
		expect(carnet[0]!.role).toBe('COMMISSAIRE_DE_JUSTICE');
	});

	/**
	 * La traçabilité n'est pas facultative. Une fiche venue d'un répertoire
	 * public sans sa source ni sa date devient indiscernable d'une donnée
	 * officielle et fraîche, alors que les deux fichiers sont des photographies
	 * datées.
	 */
	it('refuse une fiche venue d’un répertoire sans sa source ni sa date', async () => {
		const t = convexTest(schema);
		const organizationId = await unEtablissement(t);

		await expect(
			t.mutation(internal.recouvrement.intervenants.ajouterInterne, {
				organizationId,
				nom: 'Me Dubreuil',
				role: 'AVOCAT',
				origine: 'RETENU_DEPUIS_UN_REPERTOIRE'
			})
		).rejects.toThrow(/source/i);
	});

	it('cloisonne : le carnet d’un établissement ignore celui d’un autre', async () => {
		const t = convexTest(schema);
		const mien = await unEtablissement(t);
		const autre = await t.run(async (ctx) =>
			ctx.db.insert('organizations', { name: 'Autre', slug: 'autre' })
		);

		await t.mutation(internal.recouvrement.intervenants.ajouterInterne, {
			organizationId: autre,
			nom: 'Me Voisin',
			role: 'AVOCAT',
			origine: 'SAISI_A_LA_MAIN'
		});

		const carnet = await t.query(internal.recouvrement.intervenants.listerInterne, {
			organizationId: mien
		});
		expect(carnet).toHaveLength(0);
	});
});
```

- [ ] **Étape 2 : lancer le test pour vérifier qu'il échoue**

```bash
bunx vitest --run src/lib/convex/__tests__/intervenants.test.ts --reporter=dot
```

Attendu : ÉCHEC, le module `intervenants` n'existe pas.

- [ ] **Étape 3 : écrire le module**

Créer `src/lib/convex/recouvrement/intervenants.ts` :

```ts
import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';

/**
 * LE CARNET D'INTERVENANTS.
 *
 * Le gérant dit avec qui il travaille ; le logiciel le retient et le rattache à
 * un dossier quand un acte est fait. Il ne recommande personne, ne classe
 * personne, et n'écrit à personne.
 */

const vRole = v.union(
	v.literal('AVOCAT'),
	v.literal('COMMISSAIRE_DE_JUSTICE'),
	v.literal('AUTRE')
);

const vOrigine = v.union(
	v.literal('SAISI_A_LA_MAIN'),
	v.literal('RETENU_DEPUIS_UN_REPERTOIRE')
);

const vIntervenant = v.object({
	_id: v.id('intervenants'),
	nom: v.string(),
	role: vRole,
	ressort: v.optional(v.string()),
	telephone: v.optional(v.string()),
	courriel: v.optional(v.string()),
	adresse: v.optional(v.string()),
	siren: v.optional(v.string()),
	origine: vOrigine,
	sourceRepertoire: v.optional(v.string()),
	sourceReleveeLe: v.optional(v.string())
});

const argsAjout = {
	nom: v.string(),
	role: vRole,
	ressort: v.optional(v.string()),
	telephone: v.optional(v.string()),
	courriel: v.optional(v.string()),
	adresse: v.optional(v.string()),
	siren: v.optional(v.string()),
	origine: vOrigine,
	sourceRepertoire: v.optional(v.string()),
	sourceReleveeLe: v.optional(v.string())
};

type Ajout = {
	nom: string;
	role: 'AVOCAT' | 'COMMISSAIRE_DE_JUSTICE' | 'AUTRE';
	ressort?: string;
	telephone?: string;
	courriel?: string;
	adresse?: string;
	siren?: string;
	origine: 'SAISI_A_LA_MAIN' | 'RETENU_DEPUIS_UN_REPERTOIRE';
	sourceRepertoire?: string;
	sourceReleveeLe?: string;
};

/**
 * ⚠️ LA TRAÇABILITÉ EST UNE CONDITION, PAS UN CHAMP FACULTATIF. Une fiche venue
 * d'un répertoire public sans sa source ni sa date devient indiscernable d'une
 * donnée officielle et fraîche. Les deux fichiers utilisés sont des
 * photographies datées : le taire serait un repli silencieux.
 */
async function ajouter(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	fiche: Ajout
): Promise<Id<'intervenants'>> {
	if (
		fiche.origine === 'RETENU_DEPUIS_UN_REPERTOIRE' &&
		(fiche.sourceRepertoire === undefined || fiche.sourceReleveeLe === undefined)
	) {
		throw new ConvexError(
			'Une fiche retenue depuis un répertoire porte sa source et sa date de relevé, sans quoi ' +
				'rien ne la distingue d’une donnée officielle et fraîche.'
		);
	}

	return await ctx.db.insert('intervenants', {
		organizationId,
		...fiche,
		creeLe: Date.now()
	});
}

async function lister(ctx: QueryCtx, organizationId: Id<'organizations'>) {
	const lignes = await ctx.db
		.query('intervenants')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.collect();

	// Par ordre alphabétique, jamais par « pertinence ». Un ordre de pertinence
	// serait une mise en avant, et une mise en avant est une orientation.
	return lignes
		.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
		.map((l) => ({
			_id: l._id,
			nom: l.nom,
			role: l.role,
			ressort: l.ressort,
			telephone: l.telephone,
			courriel: l.courriel,
			adresse: l.adresse,
			siren: l.siren,
			origine: l.origine,
			sourceRepertoire: l.sourceRepertoire,
			sourceReleveeLe: l.sourceReleveeLe
		}));
}

export const ajouterInterne = internalMutation({
	args: { organizationId: v.id('organizations'), ...argsAjout },
	returns: v.id('intervenants'),
	handler: async (ctx, { organizationId, ...fiche }): Promise<Id<'intervenants'>> =>
		ajouter(ctx, organizationId, fiche)
});

export const listerInterne = internalQuery({
	args: { organizationId: v.id('organizations') },
	returns: v.array(vIntervenant),
	handler: async (ctx, { organizationId }) => lister(ctx, organizationId)
});

export const monCarnet = authedQuery({
	args: {},
	returns: v.array(vIntervenant),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		return await lister(ctx, organizationId);
	}
});

export const ajouterIntervenant = authedMutation({
	args: argsAjout,
	returns: v.id('intervenants'),
	handler: async (ctx, fiche): Promise<Id<'intervenants'>> => {
		const { organizationId } = await getUserOrg(ctx);
		return await ajouter(ctx, organizationId, fiche);
	}
});

export const oublierIntervenant = authedMutation({
	args: { intervenantId: v.id('intervenants') },
	returns: v.null(),
	handler: async (ctx, { intervenantId }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		const fiche = await ctx.db.get(intervenantId);
		if (fiche === null || fiche.organizationId !== organizationId) {
			throw new ConvexError('Intervenant introuvable');
		}
		await ctx.db.delete(intervenantId);
		return null;
	}
});
```

⚠️ Chaque `handler` porte un type de retour explicite. Sans lui, un module Convex qui se
référence par `internal.<lui-même>` crée un cycle d'inférence, le type de `api` retombe sur `any`,
et des dizaines de `TS7006` apparaissent dans des fichiers qui n'ont pas été touchés.

- [ ] **Étape 4 : lancer le test pour vérifier qu'il passe**

```bash
bunx vitest --run src/lib/convex/__tests__/intervenants.test.ts --reporter=dot
```

Attendu : 3 tests passent.

- [ ] **Étape 5 : commit**

```bash
git add src/lib/convex/recouvrement/intervenants.ts src/lib/convex/__tests__/intervenants.test.ts
git commit --no-verify -m "feat(intervenants): ajouter, lister, oublier, et refuser une fiche sans sa source"
```

---

## Tâche 6 : la liste des dossiers engagés, et le rattachement

**Fichiers :**
- Modifier : `src/lib/convex/recouvrement/tables.ts` (un champ sur `creances`)
- Modifier : `src/lib/convex/recouvrement/apresProcedure.ts`
- Modifier : `src/lib/convex/__tests__/apresProcedure.test.ts`

- [ ] **Étape 1 : ajouter le champ au dossier**

Dans `src/lib/convex/recouvrement/tables.ts`, dans `creances: defineTable({ … })`, à côté de
`engageeLe` :

```ts
		/**
		 * Qui a fait l'acte d'engagement.
		 *
		 * ⚠️ FACULTATIF, ET C'EST UNE DÉCISION. « Je le dirai plus tard » ne doit
		 * rien bloquer : le gérant déclare souvent l'engagement le jour même et
		 * ne sait pas encore par qui l'acte suivant passera. Rendre le champ
		 * obligatoire ferait retarder la déclaration elle-même, donc décaler
		 * l'origine de délais dont un à peine de caducité.
		 */
		intervenantId: v.optional(v.id('intervenants')),
```

- [ ] **Étape 2 : écrire le test qui échoue**

Ajouter dans `src/lib/convex/__tests__/apresProcedure.test.ts` :

```ts
describe('les dossiers engagés', () => {
	it('ne liste que les créances engagées, la plus urgente en tête', async () => {
		const t = convexTest(schema);
		const organizationId = await t.run(async (ctx) =>
			ctx.db.insert('organizations', { name: 'Ets', slug: 'ets' })
		);
		const debiteurId = await t.run(async (ctx) =>
			ctx.db.insert('debiteurs', {
				organizationId,
				denomination: 'Fournitures Durand',
				denominationNormalisee: 'fournitures durand'
			})
		);
		const engagee = await t.run(async (ctx) =>
			ctx.db.insert('creances', {
				organizationId,
				debiteurId,
				statut: 'ENGAGEE',
				procedureEngagee: 'injonction-de-payer',
				engageeLe: '2026-06-04'
			})
		);
		await t.run(async (ctx) =>
			ctx.db.insert('creances', { organizationId, debiteurId, statut: 'QUALIFIEE' })
		);

		const dossiers = await t.query(internal.recouvrement.apresProcedure.dossiersInterne, {
			organizationId
		});
		expect(dossiers).toHaveLength(1);
		expect(dossiers[0]!.creanceId).toBe(engagee);
		expect(dossiers[0]!.debiteur).toBe('Fournitures Durand');
		expect(dossiers[0]!.libelle).toBe('Requête déposée');
	});
});
```

Adapter les champs obligatoires de `debiteurs` et `creances` à ce que `tables.ts` déclare
réellement : ouvrir le fichier et compléter l'insertion si le test échoue sur un validateur.

- [ ] **Étape 3 : lancer le test pour vérifier qu'il échoue**

```bash
bunx vitest --run src/lib/convex/__tests__/apresProcedure.test.ts --reporter=dot
```

Attendu : ÉCHEC, `dossiersInterne` n'existe pas.

- [ ] **Étape 4 : écrire la requête**

Dans `src/lib/convex/recouvrement/apresProcedure.ts`, ajouter le validateur puis les deux
fonctions, à la fin du fichier :

```ts
const vDossier = v.object({
	creanceId: v.id('creances'),
	debiteur: v.string(),
	procedure: v.string(),
	engageeLe: v.string(),
	etat: v.string(),
	libelle: v.string(),
	terminal: v.boolean(),
	/** L'échéance la plus proche, celle qui commande. `null` s'il n'y en a pas. */
	prochaineEcheance: v.union(vEcheance, v.null()),
	intervenant: v.union(v.string(), v.null()),
	anglesMorts: v.array(v.string()),
	/**
	 * ⚠️ LE JOURNAL VOYAGE AVEC LE DOSSIER, et ce n'est pas du confort. Le rail
	 * se calcule par `parcoursDeLaVoie(procedure, journal, engageeLe)` : sans le
	 * journal, il rend toujours l'état d'entrée. L'écran afficherait « requête
	 * déposée » sur un dossier dont l'ordonnance est rendue depuis deux mois,
	 * aucun test ne tomberait, et le rail mentirait exactement là où ce produit
	 * ne peut pas se le permettre.
	 */
	journal: v.array(v.object({ cle: v.string(), survenuLe: v.string() }))
});

/**
 * Les dossiers engagés, le plus pressé en tête.
 *
 * ⚠️ L'ORDRE EST CELUI DU DANGER, PAS CELUI DE LA SAISIE. Une caducité passe
 * devant une échéance informative, et une échéance proche devant une lointaine.
 * Un dossier sans échéance ferme la marche : il n'y a rien à y perdre
 * aujourd'hui.
 */
async function listerDossiers(ctx: QueryCtx, organizationId: Id<'organizations'>) {
	const creances = await ctx.db
		.query('creances')
		.withIndex('by_org_and_statut', (q) =>
			q.eq('organizationId', organizationId).eq('statut', 'ENGAGEE')
		)
		.collect();

	const dossiers = [];
	for (const creance of creances) {
		if (creance.procedureEngagee === undefined || creance.engageeLe === undefined) continue;

		const suivi = await lireSuivi(ctx, creance);
		const debiteur = await ctx.db.get(creance.debiteurId);
		const intervenant =
			creance.intervenantId === undefined ? null : await ctx.db.get(creance.intervenantId);

		dossiers.push({
			creanceId: creance._id,
			debiteur: debiteur?.denomination ?? 'Débiteur inconnu',
			procedure: creance.procedureEngagee,
			engageeLe: creance.engageeLe,
			etat: suivi.etat,
			libelle: suivi.libelle,
			terminal: suivi.terminal,
			prochaineEcheance: suivi.echeances[0] ?? null,
			intervenant: intervenant?.nom ?? null,
			anglesMorts: suivi.anglesMorts,
			journal: suivi.journal.map((e) => ({ cle: e.cle, survenuLe: e.survenuLe }))
		});
	}

	return dossiers.sort((a, b) => {
		const rang = (d: (typeof dossiers)[number]) =>
			d.prochaineEcheance === null ? 2 : d.prochaineEcheance.gravite === 'CADUCITE' ? 0 : 1;
		if (rang(a) !== rang(b)) return rang(a) - rang(b);
		if (a.prochaineEcheance === null || b.prochaineEcheance === null) return 0;
		return a.prochaineEcheance.dateLimite < b.prochaineEcheance.dateLimite ? -1 : 1;
	});
}

export const dossiersInterne = internalQuery({
	args: { organizationId: v.id('organizations') },
	returns: v.array(vDossier),
	handler: async (ctx, { organizationId }) => listerDossiers(ctx, organizationId)
});

export const dossiersEngages = authedQuery({
	args: {},
	returns: v.array(vDossier),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		return await listerDossiers(ctx, organizationId);
	}
});

export const rattacherIntervenant = authedMutation({
	args: {
		creanceId: v.id('creances'),
		intervenantId: v.union(v.id('intervenants'), v.null())
	},
	returns: v.null(),
	handler: async (ctx, { creanceId, intervenantId }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		await mienne(ctx, creanceId, organizationId);

		if (intervenantId !== null) {
			const fiche = await ctx.db.get(intervenantId);
			if (fiche === null || fiche.organizationId !== organizationId) {
				throw new ConvexError('Intervenant introuvable');
			}
		}

		await ctx.db.patch(creanceId, {
			intervenantId: intervenantId ?? undefined
		});
		return null;
	}
});
```

- [ ] **Étape 5 : lancer le test pour vérifier qu'il passe**

```bash
bunx vitest --run src/lib/convex/__tests__/apresProcedure.test.ts --reporter=dot
```

Attendu : tous les tests du fichier passent.

- [ ] **Étape 6 : vérifier les types et la barrière des fonctions appelées**

```bash
bun run check
```

```bash
bunx vitest --run src/lib/convex/__tests__/fonctions-appelees.test.ts --reporter=dot
```

Attendu : `fonctions-appelees` échoue sur `dossiersEngages` et `rattacherIntervenant`, qui ne sont
encore appelées par aucun écran. C'est normal et voulu : la barrière tient. Elle repassera au vert
à la tâche 8. Noter l'échec et continuer.

- [ ] **Étape 7 : commit**

```bash
git add src/lib/convex/recouvrement/tables.ts src/lib/convex/recouvrement/apresProcedure.ts src/lib/convex/__tests__/apresProcedure.test.ts
git commit --no-verify -m "feat(procedure): les dossiers engages se listent par urgence, et portent leur intervenant"
```

---

## Tâche 7 : le rail, en composant

**Fichiers :**
- Créer : `src/ui/rail-procedure.tsx`
- Modifier : `src/ui/index.ts`
- Modifier : `src/routes/showroom.tsx`

- [ ] **Étape 1 : écrire le composant**

Créer `src/ui/rail-procedure.tsx` :

```tsx
import { CheckIcon } from 'lucide-react';
import { cn } from './cn';
import { dateCourte } from './format';

/**
 * LE RAIL D'UNE VOIE — ce qui manquait le plus à ce produit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL MONTRE TOUTE LA VOIE, PAS LE CHEMIN PARCOURU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le domaine décrivait déjà deux machines à états complètes, avec leurs
 * libellés, leurs échéances et leurs conséquences. L'écran n'en affichait que
 * l'état courant, en une phrase. Tout ce qui vient après existait en mémoire et
 * n'était dessiné nulle part : « voir les étapes » veut dire savoir ce qui
 * vient, avant d'y être.
 *
 * ⚠️ ET LES BRANCHES SONT DESSINÉES. Une machine à états n'est pas une ligne.
 * L'opposition du débiteur est une issue réelle, à sa place dans le temps : la
 * noyer dans une liste de boutons ferait passer la voie pour un couloir.
 *
 * ⚠️ AUCUNE COULEUR DE SEUIL. Le vert, l'ambre et le rouge ne disent qu'une
 * chose dans ce produit : au-dessus du seuil, tout près, en dessous. Une étape
 * franchie n'est pas un seuil. Elle se marque par un disque plein.
 */

export type StatutEtapeAffiche = 'FRANCHIE' | 'COURANTE' | 'A_VENIR' | 'HORS_ATTEINTE';

export interface EtapeAffichee {
	readonly etat: string;
	readonly libelle: string;
	readonly statut: StatutEtapeAffiche;
	readonly atteinteLe: string | null;
	readonly branches: readonly { readonly etat: string; readonly libelle: string; readonly constat: string }[];
	readonly brancheSuivie: { readonly etat: string; readonly survenuLe: string } | null;
}

export function RailProcedure({ etapes }: { etapes: readonly EtapeAffichee[] }) {
	return (
		<ol className="flex flex-col">
			{etapes.map((etape, rang) => (
				<li key={etape.etat} className="flex gap-cladd-3xs">
					<Piste statut={etape.statut} dernier={rang === etapes.length - 1} />
					<div className="min-w-0 flex-1 pb-cladd-2xs">
						<p
							className={cn(
								'text-cladd-xs font-semibold',
								etape.statut === 'A_VENIR' || etape.statut === 'HORS_ATTEINTE'
									? 'text-cladd-fg-softest'
									: 'text-cladd-fg'
							)}
						>
							{etape.libelle}
						</p>
						<p className="text-cladd-2xs text-cladd-fg-softer">
							{etape.atteinteLe !== null
								? dateCourte(etape.atteinteLe)
								: etape.statut === 'HORS_ATTEINTE'
									? 'le dossier a quitté cette voie'
									: 'pas encore'}
						</p>

						{etape.branches.map((branche) => {
							const prise = etape.brancheSuivie?.etat === branche.etat;
							return (
								<div
									key={branche.etat}
									className={cn(
										'mt-cladd-3xs border-l-2 border-dashed pl-cladd-3xs',
										prise ? 'border-cladd-fg-soft' : 'border-cladd-outline'
									)}
								>
									<p
										className={cn(
											'text-cladd-2xs',
											prise ? 'font-semibold text-cladd-fg' : 'text-cladd-fg-softest'
										)}
									>
										{branche.libelle}
										{prise ? ` · ${dateCourte(etape.brancheSuivie!.survenuLe)}` : null}
									</p>
									<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softest">
										{branche.constat}
									</p>
								</div>
							);
						})}
					</div>
				</li>
			))}
		</ol>
	);
}

/**
 * Le disque et le trait.
 *
 * Le trait s'arrête sur la dernière étape : un trait qui dépasse suggère une
 * suite qu'aucune machine ne décrit.
 */
function Piste({ statut, dernier }: { statut: StatutEtapeAffiche; dernier: boolean }) {
	return (
		<div className="flex w-cladd-2xs shrink-0 flex-col items-center pt-1">
			{statut === 'FRANCHIE' ? (
				<span className="flex size-4 items-center justify-center rounded-full bg-cladd-fg">
					<CheckIcon className="size-2.5 text-cladd-bg" aria-hidden />
				</span>
			) : statut === 'COURANTE' ? (
				<span className="size-4 rounded-full border-4 border-cladd-fg" />
			) : (
				<span className="size-4 rounded-full border-2 border-cladd-outline" />
			)}
			{dernier ? null : <span className="w-0.5 flex-1 bg-cladd-outline" />}
		</div>
	);
}
```

- [ ] **Étape 2 : exporter le composant**

Dans `src/ui/index.ts`, à côté de la ligne `export { SuiviProcedure, … } from './suivi-procedure';` :

```ts
export {
	RailProcedure,
	type EtapeAffichee,
	type StatutEtapeAffiche
} from './rail-procedure';
```

- [ ] **Étape 3 : ajouter l'écran à la salle d'exposition**

Dans `src/routes/showroom.tsx`, ajouter `'rail'` au tableau `ECRANS`, et rendre le cas
correspondant avec ces données de démonstration :

```tsx
const RAIL_DEMO: EtapeAffichee[] = [
	{
		etat: 'REQUETE_DEPOSEE',
		libelle: 'Requête déposée',
		statut: 'FRANCHIE',
		atteinteLe: '2026-06-04',
		branches: [
			{
				etat: 'REQUETE_REJETEE',
				libelle: 'Requête rejetée',
				constat:
					'Le juge n’a pas fait droit à la requête, ou pas entièrement. La créance n’est pas ' +
					'éteinte ; cette voie-ci est fermée.'
			}
		],
		brancheSuivie: null
	},
	{
		etat: 'ORDONNANCE_RENDUE',
		libelle: 'Ordonnance rendue',
		statut: 'COURANTE',
		atteinteLe: '2026-08-28',
		branches: [],
		brancheSuivie: null
	},
	{
		etat: 'ORDONNANCE_SIGNIFIEE',
		libelle: 'Ordonnance signifiée',
		statut: 'A_VENIR',
		atteinteLe: null,
		branches: [
			{
				etat: 'OPPOSITION',
				libelle: 'Opposition formée',
				constat:
					'L’affaire bascule en procédure contradictoire. Les procédures que ce logiciel ' +
					'évalue se déroulent toutes sans débat : ce dossier sort de ce qu’il sait mesurer.'
			}
		],
		brancheSuivie: null
	},
	{
		etat: 'TITRE_EXECUTOIRE',
		libelle: 'Titre exécutoire',
		statut: 'A_VENIR',
		atteinteLe: null,
		branches: [],
		brancheSuivie: null
	}
];
```

- [ ] **Étape 4 : regarder l'écran aux quatre largeurs**

Ouvrir `http://localhost:20173/showroom`, choisir `rail`, et vérifier à 375, 768, 1024 et 1280 px
que le trait relie bien les disques, qu'aucune étape ne déborde, et que la branche pointillée se
lit sans se confondre avec la ligne. La règle du regard n'est pas facultative : aucun test
n'attrape un trait désaligné.

- [ ] **Étape 5 : commit**

```bash
git add src/ui/rail-procedure.tsx src/ui/index.ts src/routes/showroom.tsx
git commit --no-verify -m "feat(rail): la voie entiere se voit, branches comprises"
```

---

## Tâche 8 : l'onglet, l'écran, et le carnet en feuille

C'est la tâche qui rend tout le reste atteignable : sans elle, le rail de la tâche 7 n'est
affiché nulle part.

**Fichiers :**
- Créer : `src/screens/procedures.tsx`
- Créer : `src/routes/app/procedures.tsx`
- Créer : `src/ui/choix-intervenant.tsx`
- Modifier : `src/app/barre.tsx`
- Modifier : `src/ui/index.ts`
- Modifier : `src/routes/showroom.tsx`

- [ ] **Étape 1 : ajouter le quatrième onglet**

Dans `src/app/barre.tsx`, importer `GavelIcon` depuis `lucide-react` et remplacer `ENTREES` :

```ts
/**
 * ⚠️ QUATRE ONGLETS, ET LE QUATRIÈME A SA RAISON. L'argument qui a ramené cette
 * barre de huit cibles à trois visait huit choix de même poids, dont aucun ne
 * disait quoi faire. Un dossier engagé n'est pas un huitième choix : c'est le
 * seul endroit du produit où un droit s'éteint à date fixe, et il n'était
 * atteignable qu'au bout de cinq gestes.
 */
const ENTREES = [
	{ to: '/app', label: 'Accueil', Icone: HomeIcon },
	{ to: '/app/debiteurs', label: 'Débiteurs', Icone: UsersIcon },
	{ to: '/app/procedures', label: 'Procédures', Icone: GavelIcon },
	{ to: '/app/import-factures', label: 'Importer', Icone: UploadIcon }
] as const;
```

Le segment glissant de la barre basse dérive sa largeur de `ENTREES.length` : il suit
automatiquement. Vérifier tout de même à 375 px après l'étape 6.

- [ ] **Étape 2 : écrire la feuille « qui fait l'acte »**

Créer `src/ui/choix-intervenant.tsx` :

```tsx
import { Popup, PopupContent, Button, SectionTitle } from '@cladd-ui/react';
import { cn } from './cn';

/**
 * QUI FAIT L'ACTE — en feuille, une décision à la fois.
 *
 * ⚠️ LE LOGICIEL NE PRÉSÉLECTIONNE RIEN. Quelle profession est compétente pour
 * quel acte est une valeur juridique, et `parametres.ts` la déclare non relevée.
 * Présélectionner sur une correspondance devinée enverrait un gérant chez un
 * professionnel qui ne peut pas faire l'acte, et lui ferait perdre le temps que
 * la caducité compte. Tant que l'entrée est vide, les fiches sont proposées
 * dans l'ordre alphabétique et l'écran dit pourquoi.
 *
 * ⚠️ « MOI-MÊME » EST UN CHOIX DE PREMIER RANG. Selon le montant et le client,
 * un gérant dépose lui-même ou passe par un professionnel. Le produit pose la
 * question ; il n'y répond jamais.
 */

export interface FicheIntervenant {
	readonly _id: string;
	readonly nom: string;
	readonly role: 'AVOCAT' | 'COMMISSAIRE_DE_JUSTICE' | 'AUTRE';
	readonly ressort?: string;
}

const LIBELLE_ROLE = {
	AVOCAT: 'Avocat',
	COMMISSAIRE_DE_JUSTICE: 'Commissaire de justice',
	AUTRE: 'Autre'
} as const;

export function ChoixIntervenant({
	ouvert,
	onFermer,
	carnet,
	choisiId,
	onChoisir,
	onChercher
}: {
	ouvert: boolean;
	onFermer: () => void;
	carnet: readonly FicheIntervenant[];
	/** `null` vaut « moi-même ». */
	choisiId: string | null;
	onChoisir: (intervenantId: string | null) => void;
	onChercher: () => void;
}) {
	return (
		<Popup
			open={ouvert}
			onOpenChange={(o) => {
				if (!o) onFermer();
			}}
			headerLeft={<span className="px-2 pb-1 text-cladd-sm font-semibold">Qui fait l’acte</span>}
			contentClassName="max-w-md"
		>
			<PopupContent>
				<SectionTitle>Vos intervenants</SectionTitle>
				<div className="mt-cladd-3xs grid grid-cols-2 gap-cladd-3xs">
					<Carte
						titre="Moi-même"
						pris={choisiId === null}
						onClick={() => onChoisir(null)}
					/>
					{carnet.map((fiche) => (
						<Carte
							key={fiche._id}
							titre={fiche.nom}
							sousTitre={
								fiche.ressort === undefined
									? LIBELLE_ROLE[fiche.role]
									: `${LIBELLE_ROLE[fiche.role]} · ${fiche.ressort}`
							}
							pris={choisiId === fiche._id}
							onClick={() => onChoisir(fiche._id)}
						/>
					))}
				</div>

				<Button className="mt-cladd-2xs w-full" size="md" rounded onClick={onChercher}>
					Chercher dans les répertoires publics
				</Button>

				<p className="mt-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-softer">
					La profession compétente pour cet acte n’est pas relevée dans le référentiel juridique
					de ce logiciel : rien n’est présélectionné, et cette liste n’est pas triée.
				</p>
			</PopupContent>
		</Popup>
	);
}

function Carte({
	titre,
	sousTitre,
	pris,
	onClick
}: {
	titre: string;
	sousTitre?: string;
	pris: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={pris}
			className={cn(
				'verre-bouton flex min-h-cladd-lg flex-col justify-center rounded-cladd-lg px-cladd-3xs py-cladd-3xs text-left',
				pris && 'ring-2 ring-cladd-primary'
			)}
		>
			<span className="text-cladd-xs font-semibold">{titre}</span>
			{sousTitre === undefined ? null : (
				<span className="text-cladd-2xs text-cladd-fg-softer">{sousTitre}</span>
			)}
		</button>
	);
}
```

Exporter dans `src/ui/index.ts` :

```ts
export { ChoixIntervenant, type FicheIntervenant } from './choix-intervenant';
```

- [ ] **Étape 3 : écrire l'écran, sans requête**

Créer `src/screens/procedures.tsx`. L'écran ne sait pas interroger Convex : c'est ce qui permet
de l'ouvrir depuis la salle d'exposition sans backend ni authentification.

```tsx
import { Chip } from '@cladd-ui/react';
import { Link } from '@tanstack/react-router';
import { EyeOffIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	EmptyState,
	LigneAnalyse,
	ListeAnalyses,
	Page,
	PageHeader,
	PageBody,
	RailProcedure,
	TwoPane,
	dateCourte,
	type EtapeAffichee
} from '../ui';

export interface DossierAffiche {
	readonly creanceId: string;
	readonly debiteur: string;
	readonly libelle: string;
	readonly engageeLe: string;
	readonly intervenant: string | null;
	readonly prochaineEcheance: {
		readonly libelle: string;
		readonly dateLimite: string;
		readonly gravite: 'CADUCITE' | 'INFORMATIVE';
		readonly consequence: string;
	} | null;
	readonly anglesMorts: readonly string[];
	readonly etapes: readonly EtapeAffichee[];
}

/**
 * L'ONGLET DES PROCÉDURES.
 *
 * ⚠️ LE VIDE MONTRE LE CHEMIN, JAMAIS UN CADRAN À ZÉRO. Un gérant qui n'a rien
 * engagé est le cas courant, et de loin. L'écran lui dit ce que le logiciel
 * comptera le jour où il engagera, et il offre une sortie. Il ne lui propose
 * aucune voie : ce serait recommander une procédure.
 */
export function EcranProcedures({
	dossiers,
	ouvertId,
	onOuvrir,
	onFermer
}: {
	dossiers: readonly DossierAffiche[];
	ouvertId: string | null;
	onOuvrir: (creanceId: string) => void;
	onFermer: () => void;
}) {
	const ouvert = dossiers.find((d) => d.creanceId === ouvertId) ?? null;

	if (dossiers.length === 0) {
		return (
			<Page>
				<PageHeader titre="Procédures" />
				<PageBody>
					{/*
					  ⚠️ AUCUNE VOIE N'EST PROPOSÉE ICI. Un écran vide qui suggérerait
					  « engagez une injonction de payer » recommanderait une procédure,
					  et c'est la troisième ligne rouge. Il dit ce que le logiciel
					  COMPTERA, et il rend la main.
					*/}
					<EmptyState
						illustration="⚖️"
						titre="Rien d’engagé aujourd’hui"
						explication="Le jour où vous engagerez une voie, c’est ici que seront comptés les délais qui en découlent, et ceux dont l’oubli fait tout reprendre."
						etapes={[
							'Vous déclarez ce que vous avez engagé, et à quelle date.',
							'Le logiciel compte les délais qui en découlent, et nomme ceux qu’il ne sait pas compter.',
							'Vous consignez ce qui se passe ; le rail avance tout seul.'
						]}
						action={
							<BoutonPrincipal as={Link} to="/app/debiteurs">
								Voir mes débiteurs
							</BoutonPrincipal>
						}
					/>
				</PageBody>
			</Page>
		);
	}

	return (
		<Page>
			<PageHeader
				titre="Procédures"
				sousTitre={`${dossiers.length} engagée${dossiers.length > 1 ? 's' : ''}`}
			/>
			<TwoPane
				preuveOuverte={ouvert !== null}
				onFermerPreuve={onFermer}
				liste={
					<PageBody>
						<ListeAnalyses>
							{dossiers.map((dossier) => (
								<LigneAnalyse
									key={dossier.creanceId}
									vers="/app/procedures"
									recherche={{ p: dossier.creanceId }}
									titre={dossier.debiteur}
									precision={dossier.libelle}
									valeur={
										dossier.prochaineEcheance === null
											? undefined
											: dateCourte(dossier.prochaineEcheance.dateLimite)
									}
									attention={dossier.prochaineEcheance?.gravite === 'CADUCITE'}
								/>
							))}
						</ListeAnalyses>
					</PageBody>
				}
				preuve={ouvert === null ? null : <VoletDossier dossier={ouvert} onOuvrir={onOuvrir} />}
			/>
		</Page>
	);
}

function VoletDossier({
	dossier,
	onOuvrir
}: {
	dossier: DossierAffiche;
	onOuvrir: (creanceId: string) => void;
}) {
	return (
		<div className="flex flex-col gap-cladd-xs p-cladd-2xs">
			<div>
				<h2 className="text-cladd-md font-bold tracking-tight">{dossier.debiteur}</h2>
				<p className="text-cladd-xs text-cladd-fg-soft">
					engagée le {dateCourte(dossier.engageeLe)}
					{dossier.intervenant === null ? null : ` · ${dossier.intervenant}`}
				</p>
			</div>

			{/* L'ordre des blocs est celui de la spec : où j'en suis, ce qui court,
			    ce qui n'est PAS surveillé, puis le dossier. */}
			<div className="verre-carte rounded-cladd-xl p-cladd-2xs">
				<RailProcedure etapes={dossier.etapes} />
			</div>

			{dossier.prochaineEcheance === null ? null : (
				<div className="verre-carte rounded-cladd-xl p-cladd-2xs">
					<div className="flex items-center justify-between gap-cladd-3xs">
						<span className="text-cladd-sm font-bold">
							{dossier.prochaineEcheance.libelle}
						</span>
						<Chip
							size="md"
							color={dossier.prochaineEcheance.gravite === 'CADUCITE' ? 'red' : 'neutral'}
						>
							{dateCourte(dossier.prochaineEcheance.dateLimite)}
						</Chip>
					</div>
					<p className="mt-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						{dossier.prochaineEcheance.consequence}
					</p>
				</div>
			)}

			{/*
			  ⚠️ LES ANGLES MORTS AVANT LES RANGÉES, JAMAIS APRÈS. Un délai dont le
			  référentiel ignore la durée court quand même. Le reléguer sous ce qui
			  rassure le ferait lire après coup, donc souvent pas du tout, et un
			  gérant qui croit sa procédure surveillée ne la surveille pas lui-même.
			*/}
			{dossier.anglesMorts.map((angle) => (
				<p
					key={angle}
					className="flex items-start gap-cladd-3xs rounded-cladd-xl border border-dashed border-cladd-outline p-cladd-2xs text-cladd-2xs leading-relaxed text-cladd-fg-soft"
				>
					<EyeOffIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
					{angle}
				</p>
			))}

			<ListeAnalyses>
				<LigneAnalyse
					vers="/app/creance/$id/procedure"
					parametres={{ id: dossier.creanceId }}
					titre="Le dossier complet"
					valeur="Ouvrir"
				/>
			</ListeAnalyses>
		</div>
	);
}
```

⚠️ Vérifier la signature réelle de `EmptyState` dans `src/ui/empty-state.tsx` et adapter les noms
de props si elles diffèrent. Ne pas inventer une prop qui n'existe pas.

- [ ] **Étape 4 : écrire la route**

Créer `src/routes/app/procedures.tsx` :

```tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EcranProcedures, type DossierAffiche } from '../../screens/procedures';
import { Page, PageHeader, PageBody } from '../../ui';
import { parcoursDeLaVoie } from '../../lib/verticales/recouvrement/apres-procedure';

/**
 * ⚠️ LA SÉLECTION VIT DANS L'ADRESSE, comme sur `/app/debiteurs`. La liste et le
 * dossier sont le MÊME écran au-dessus de 1024 px : un segment de chemin
 * suggérerait deux pages là où il y en a une, et le retour perdrait la
 * sélection à chaque aller-retour.
 */
export const Route = createFileRoute('/app/procedures')({
	component: Procedures,
	validateSearch: (recherche: Record<string, unknown>): { p?: string } => {
		const p = recherche.p;
		return typeof p === 'string' && p.length > 0 ? { p } : {};
	}
});

function Procedures() {
	const { p } = Route.useSearch();
	const navigate = useNavigate();
	const dossiers = useQuery(api.recouvrement.apresProcedure.dossiersEngages, {});

	if (dossiers === undefined) {
		return (
			<Page>
				<PageHeader titre="Procédures" />
				<PageBody>
					<p className="sr-only">Chargement…</p>
				</PageBody>
			</Page>
		);
	}

	return (
		<EcranProcedures
			dossiers={dossiers.map(
				(d): DossierAffiche => ({
					creanceId: d.creanceId,
					debiteur: d.debiteur,
					libelle: d.libelle,
					engageeLe: d.engageeLe,
					intervenant: d.intervenant,
					prochaineEcheance: d.prochaineEcheance,
					anglesMorts: d.anglesMorts,
					// Le rail se calcule ici, par la fonction du domaine, à partir du
					// journal que la requête a rapporté. Rien de l'état n'est réécrit à
					// l'écran : un second calcul du même parcours finirait par diverger,
					// et le plus dangereux des deux serait celui que personne ne relit.
					etapes: parcoursDeLaVoie(d.procedure, d.journal, d.engageeLe).map((e) => ({
						etat: e.etat,
						libelle: e.libelle,
						statut: e.statut,
						atteinteLe: e.atteinteLe,
						branches: e.branches,
						brancheSuivie: e.brancheSuivie
					}))
				})
			)}
			ouvertId={p ?? null}
			onOuvrir={(creanceId) => void navigate({ to: '/app/procedures', search: { p: creanceId } })}
			onFermer={() => void navigate({ to: '/app/procedures', search: {} })}
		/>
	);
}
```

- [ ] **Étape 5 : brancher la section « Ce qui court » sur l'accueil**

L'onglet rend le dossier atteignable depuis partout ; l'accueil garde un raccourci, parce que
c'est l'écran où l'on atterrit. Dans `src/screens/accueil.tsx`, sous le montant et AVANT le
journal du veilleur, ajouter une section qui n'apparaît que s'il y a quelque chose :

```tsx
{vue.dossiers.length === 0 ? null : (
	<SectionEcran titre="Ce qui court">
		<ListeAnalyses>
			{vue.dossiers.map((dossier) => (
				<LigneAnalyse
					key={dossier.creanceId}
					vers="/app/procedures"
					recherche={{ p: dossier.creanceId }}
					titre={dossier.debiteur}
					precision={dossier.libelle}
					valeur={
						dossier.prochaineEcheance === null
							? undefined
							: dateCourte(dossier.prochaineEcheance.dateLimite)
					}
					attention={dossier.prochaineEcheance?.gravite === 'CADUCITE'}
				/>
			))}
		</ListeAnalyses>
	</SectionEcran>
)}
```

Ajouter `dossiers: readonly DossierAffiche[]` au type `AccueilAffiche`, et le remplir dans
`src/routes/app/index.tsx` depuis la même requête `dossiersEngages`. Convex sert la seconde
lecture depuis son cache : l'accueil ne paie pas d'aller-retour supplémentaire.

⚠️ La section ne s'affiche pas quand la liste est vide. Une section « Ce qui court » vide sur
l'accueil serait un cadran à zéro, ce que la règle d'écran n° 4 interdit.

- [ ] **Étape 6 : lancer les tests et les types**

```bash
bun run check
```

```bash
bunx vitest --run src/lib/convex/__tests__/fonctions-appelees.test.ts src/ui/__tests__/aucun-ecran-orphelin.test.ts src/ui/__tests__/destinations-existent.test.ts src/ui/__tests__/lignes-rouges.test.ts --reporter=dot
```

Attendu : tout passe. `fonctions-appelees` est refermée par l'appel à `dossiersEngages` depuis la
route ; `aucun-ecran-orphelin` l'est par l'onglet de la barre, qui est une vraie arête entrante.

⚠️ `rattacherIntervenant` n'est toujours appelée par personne à ce stade : `fonctions-appelees`
échouera dessus. C'est la tâche 9 qui la referme. Noter l'échec, ne pas le contourner en
supprimant la fonction.

- [ ] **Étape 7 : regarder les écrans aux quatre largeurs**

Ouvrir `http://localhost:20173/app/procedures` et vérifier à 375, 768, 1024 et 1280 px :
la barre basse à quatre onglets ne serre pas et son segment glissant reste aligné sur le
quatrième ; les deux volets apparaissent bien à 1024 px ; sous 1024 px le dossier s'ouvre en
feuille et le bouton « Fermer » revient à la liste.

Vérifier aussi l'écran vide en ouvrant `/showroom` sur un compte sans procédure engagée.

- [ ] **Étape 8 : commit**

```bash
git add src/screens/procedures.tsx src/routes/app/procedures.tsx src/ui/choix-intervenant.tsx src/ui/index.ts src/app/barre.tsx src/routes/showroom.tsx src/screens/accueil.tsx src/routes/app/index.tsx
git commit --no-verify -m "feat(procedures): un dossier engage s'atteint d'un doigt, depuis n'importe quel ecran"
```

---

## Tâche 9 : voir la voie AVANT de s'y engager, et déclarer

C'est la tâche qui répond au reproche d'origine. Aujourd'hui l'écran d'une créance non engagée
montre trois cartes de prose avec une pastille « Envisageable », et le geste de déclaration est
un champ de date noyé au bas de l'une d'elles. Le déroulé de la voie existe dans `MACHINES` et
n'est dessiné nulle part.

**Fichiers :**
- Créer : `src/ui/feuille-voie.tsx`
- Modifier : `src/routes/app/creance_.$id.procedure.tsx`
- Modifier : `src/ui/index.ts`
- Modifier : `src/routes/showroom.tsx`

- [ ] **Étape 1 : écrire la feuille d'une voie**

Créer `src/ui/feuille-voie.tsx` :

```tsx
import { Popup, PopupContent, Chip, Button, SectionTitle } from '@cladd-ui/react';

/**
 * UNE VOIE, AVANT DE S'Y ENGAGER.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉROULÉ SE LIT AVANT LA DÉCISION, PAS APRÈS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est le manque que le terrain a nommé en premier : « on ne voit pas les
 * étapes de la procédure ». Elles étaient là, dans `MACHINES`, complètes, avec
 * leurs libellés et leurs conséquences. L'écran affichait une pastille et trois
 * phrases de blocage.
 *
 * ⚠️ ET RIEN ICI N'EST UN CONSEIL. Les étapes sont numérotées parce qu'elles se
 * suivent, pas parce qu'il faudrait les faire. « Ce qui la fait échouer » vient
 * de `conditionsEchec`, qui énonce des faits. Le bouton dit « Je l'ai engagée »,
 * au passé : le gérant déclare, le logiciel compte.
 */

export interface VoieAffichee {
	readonly cle: string;
	readonly nom: string;
	readonly disponible: boolean;
	/** Ce qui empêche, quand quelque chose empêche. */
	readonly blocages: readonly string[];
	/** Le déroulé, tiré de la machine à états. Vide si la voie n'en a pas. */
	readonly etapes: readonly { readonly etat: string; readonly libelle: string; readonly constat: string }[];
	readonly conditionsEchec: readonly string[];
}

export function FeuilleVoie({
	voie,
	ouverte,
	onFermer,
	onDeclarer
}: {
	voie: VoieAffichee | null;
	ouverte: boolean;
	onFermer: () => void;
	onDeclarer: () => void;
}) {
	if (voie === null) return null;

	return (
		<Popup
			open={ouverte}
			onOpenChange={(o) => {
				if (!o) onFermer();
			}}
			headerLeft={<span className="px-2 pb-1 text-cladd-sm font-semibold">{voie.nom}</span>}
			contentClassName="max-w-lg"
		>
			<PopupContent>
				<div className="flex items-center justify-between gap-cladd-3xs">
					<span className="text-cladd-sm font-bold tracking-tight">{voie.nom}</span>
					<Chip size="md" color={voie.disponible ? 'green' : 'neutral'}>
						{voie.disponible ? 'Envisageable' : 'Indisponible'}
					</Chip>
				</div>
				{voie.blocages.map((blocage) => (
					<p key={blocage} className="mt-cladd-3xs text-cladd-2xs text-cladd-fg-soft">
						{blocage}
					</p>
				))}
			</PopupContent>

			{voie.etapes.length === 0 ? null : (
				<PopupContent>
					<SectionTitle>Comment elle se déroule</SectionTitle>
					<ol className="mt-cladd-3xs flex flex-col gap-cladd-2xs">
						{voie.etapes.map((etape, rang) => (
							<li key={etape.etat} className="flex gap-cladd-3xs">
								<span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-cladd-outline text-cladd-2xs font-bold tabular-nums">
									{rang + 1}
								</span>
								<div className="min-w-0">
									<p className="text-cladd-xs font-semibold">{etape.libelle}</p>
									<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
										{etape.constat}
									</p>
								</div>
							</li>
						))}
					</ol>
				</PopupContent>
			)}

			{voie.conditionsEchec.length === 0 ? null : (
				<PopupContent>
					<SectionTitle>Ce qui la fait échouer</SectionTitle>
					<ul className="mt-cladd-3xs flex flex-col gap-cladd-3xs">
						{voie.conditionsEchec.map((condition) => (
							<li key={condition} className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
								{condition}
							</li>
						))}
					</ul>
				</PopupContent>
			)}

			{voie.etapes.length === 0 ? null : (
				<PopupContent>
					{/*
					  ⚠️ « JE L'AI ENGAGÉE », AU PASSÉ. « Engager cette procédure »
					  ferait du logiciel l'auteur de l'acte et du bouton une
					  recommandation. Troisième ligne rouge du projet.
					*/}
					<Button className="w-full" size="md" rounded color="brand" onClick={onDeclarer}>
						Je l’ai engagée
					</Button>
				</PopupContent>
			)}
		</Popup>
	);
}
```

Exporter dans `src/ui/index.ts` :

```ts
export { FeuilleVoie, type VoieAffichee } from './feuille-voie';
```

- [ ] **Étape 2 : exposer le déroulé côté lecture**

Dans `src/lib/convex/recouvrement/lecture.ts`, là où `creanceComplete` compose déjà le tableau
`procedures`, ajouter à chaque entrée le déroulé et les conditions d'échec, tirés du domaine :

```ts
import { MACHINES, etapesDeLaVoie } from '../../verticales/recouvrement/apres-procedure';

// … dans la composition de chaque procédure :
etapes:
	MACHINES[procedure.cle] === undefined
		? []
		: etapesDeLaVoie(procedure.cle).map((e) => ({
				etat: e.etat,
				libelle: e.libelle,
				constat: e.constat
			})),
conditionsEchec: [...procedure.conditionsEchec],
```

Ajouter les deux champs au validateur de retour de `creanceComplete` :

```ts
etapes: v.array(v.object({ etat: v.string(), libelle: v.string(), constat: v.string() })),
conditionsEchec: v.array(v.string()),
```

- [ ] **Étape 3 : refaire l'écran de procédure d'une créance**

Dans `src/routes/app/creance_.$id.procedure.tsx`, remplacer les cartes de prose par des rangées
qui ouvrent la feuille, et déplacer la déclaration dans sa propre feuille avec la date et
l'intervenant. La liste devient :

```tsx
<SectionEcran titre="Les voies, et ce qu’elles impliquent">
	<ListeAnalyses>
		{creance.procedures.map((procedure) => (
			<LigneAnalyse
				key={procedure.cle}
				vers="/app/creance/$id/procedure"
				parametres={{ id }}
				titre={procedure.nom}
				precision={
					procedure.etapes.length === 0
						? 'aucun délai n’en découle'
						: `${procedure.etapes.length} étapes`
				}
				valeur={procedure.disponible ? 'Envisageable' : 'Indisponible'}
			/>
		))}
	</ListeAnalyses>
	<p className="mt-cladd-3xs text-cladd-2xs text-cladd-fg-softer">
		Énumérées, jamais classées. Aucune n’est mise en avant.
	</p>
</SectionEcran>
```

⚠️ Un `LigneAnalyse` navigue ; ici on veut ouvrir une feuille. Ajouter à `src/ui/navigation.tsx`
une variante `LigneBouton` qui prend `onClick` au lieu de `vers`, bâtie sur le même `ListButton`
du kit, avec les mêmes fentes `footer` et `after`. Ne pas réimplémenter la rangée avec un `div` :
c'est exactement ce que la muselière du projet interdit.

La déclaration, elle, s'ouvre en feuille depuis `FeuilleVoie`, porte le champ de date déjà écrit
dans `DeclarerEngagement`, puis appelle `engagerProcedure` et, si un intervenant a été choisi,
`rattacherIntervenant`. `ChoixIntervenant` de la tâche 8 s'imbrique dedans : Cladd empile les
feuilles comme les feuilles natives d'iOS.

- [ ] **Étape 4 : ajouter les deux feuilles à la salle d'exposition**

Ajouter `'voie'` et `'intervenant'` au tableau `ECRANS` de `src/routes/showroom.tsx`, rendus avec
les données de démonstration de l'injonction de payer (quatre étapes, trois conditions d'échec) et
un carnet de deux fiches.

- [ ] **Étape 5 : vérifier**

```bash
bun run check
```

```bash
bunx vitest --run src/lib/convex/__tests__/fonctions-appelees.test.ts src/ui/__tests__/lignes-rouges.test.ts src/ui/__tests__/destinations-existent.test.ts --reporter=dot
```

Attendu : tout passe. `rattacherIntervenant` est désormais appelée, donc `fonctions-appelees` est
refermée. `lignes-rouges` doit rester verte : vérifier qu'aucune chaîne neuve ne dit « engager une
procédure » ni « faire signifier ».

- [ ] **Étape 6 : regarder aux quatre largeurs**

Ouvrir `/showroom`, écrans `voie` et `intervenant`, à 375, 768, 1024 et 1280 px. Vérifier qu'une
feuille imbriquée dans une feuille reste lisible à 375 px, et que le bouton « Je l'ai engagée »
n'est jamais sous la ligne de flottaison sans qu'on puisse défiler jusqu'à lui.

- [ ] **Étape 7 : commit**

```bash
git add src/ui/feuille-voie.tsx src/ui/navigation.tsx src/ui/index.ts src/routes/app/creance_.\$id.procedure.tsx src/lib/convex/recouvrement/lecture.ts src/routes/showroom.tsx
git commit --no-verify -m "feat(voie): le deroule d'une procedure se lit avant de s'y engager, pas apres"
```

---

## Tâche 10 : les commissaires de justice, dans l'écran

**Fichiers :**
- Créer : `src/lib/convex/recouvrement/annuaires.ts`
- Créer : `src/ui/__tests__/source-citee.test.ts`

- [ ] **Étape 1 : écrire la barrière qui manquerait**

Créer `src/ui/__tests__/source-citee.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * UN RÉPERTOIRE RECOPIÉ DIT D'OÙ IL VIENT, ET QUAND.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CETTE BARRIÈRE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le produit affiche des professionnels tirés de deux fichiers publics. Aucun
 * des deux n'est le tableau de sa profession : le fichier du CNB est une
 * photographie mensuelle, et le registre des entreprises ne connaît ni les
 * radiations disciplinaires ni les études qui n'ont pas déclaré leur convention
 * collective.
 *
 * Un écran qui montrerait ces listes sans dire d'où elles viennent serait
 * indiscernable d'un annuaire officiel. C'est le défaut que ce projet traque en
 * priorité : pas une donnée absente, une donnée FAUSSE qu'on laisse croire
 * vraie.
 *
 * ⚠️ LE CRITÈRE EST MÉCANIQUE. Un fichier d'interface qui nomme un répertoire
 * doit aussi porter le mot « relevé » ou « relevée » — la date du relevé. Ni
 * plus, ni moins.
 */

const RACINE = join(process.cwd(), 'src');
const ZONES = [join(RACINE, 'ui'), join(RACINE, 'screens'), join(RACINE, 'routes')];

const NOMS_DE_REPERTOIRE = [
	'Conseil national des barreaux',
	'annuaire national des avocats',
	'registre des entreprises'
];

function fichiers(dossier: string, acc: string[] = []): string[] {
	let entrees;
	try {
		entrees = readdirSync(dossier, { withFileTypes: true });
	} catch {
		return acc;
	}
	for (const entree of entrees) {
		const chemin = join(dossier, entree.name);
		if (entree.isDirectory()) fichiers(chemin, acc);
		else if (/\.tsx?$/.test(entree.name)) acc.push(chemin);
	}
	return acc;
}

describe('la source d’un répertoire public', () => {
	it('est citée avec sa date partout où le répertoire est nommé', () => {
		const fautifs: string[] = [];

		for (const zone of ZONES) {
			for (const chemin of fichiers(zone)) {
				const source = readFileSync(chemin, 'utf8');
				const nomme = NOMS_DE_REPERTOIRE.some((nom) =>
					source.toLowerCase().includes(nom.toLowerCase())
				);
				if (!nomme) continue;
				if (!/relev[ée]/i.test(source)) fautifs.push(chemin);
			}
		}

		expect(fautifs, `ces écrans nomment un répertoire sans dater son relevé`).toEqual([]);
	});
});
```

- [ ] **Étape 2 : lancer le test pour vérifier qu'il passe à vide**

```bash
bunx vitest --run src/ui/__tests__/source-citee.test.ts --reporter=dot
```

Attendu : PASSE (aucun écran ne nomme encore de répertoire). La barrière est en place avant ce
qu'elle garde, ce qui est l'ordre voulu.

- [ ] **Étape 3 : écrire l'action de recherche**

Créer `src/lib/convex/recouvrement/annuaires.ts` :

```ts
import { v } from 'convex/values';
import { action } from '../_generated/server';

/**
 * LES RÉPERTOIRES PUBLICS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE N'EST PAS LE TABLEAU DE LA PROFESSION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il n'existe aucun répertoire public réutilisable des commissaires de justice.
 * Leur annuaire national ne publie ni export, ni flux, ni conditions de
 * réutilisation : l'aspirer exposerait aux conditions du site et au droit du
 * producteur de base de données. On ne le fait pas.
 *
 * Ce qu'on interroge est le REGISTRE DES ENTREPRISES, ouvert, sans clé, adossé
 * à Sirene, filtré sur la convention collective de la profession. Une étude qui
 * ne l'a pas déclarée n'y figure pas, et une radiation disciplinaire non plus.
 * Les écrans le disent, et `source-citee.test.ts` échoue s'ils l'oublient.
 *
 * ⚠️ LE FILTRE DE DÉPARTEMENT PORTE SUR LES ÉTABLISSEMENTS, pas sur le siège :
 * une étude dont le siège est ailleurs remonte si elle a une antenne dans le
 * département. On affiche donc l'établissement du siège avec sa commune réelle,
 * jamais une adresse recomposée qui laisserait croire à une implantation locale.
 */

const IDCC_COMMISSAIRES_DE_JUSTICE = '3250';
const NAF_ACTIVITES_JURIDIQUES = '69.10Z';
const BASE = 'https://recherche-entreprises.api.gouv.fr/search';

const vEtude = v.object({
	siren: v.string(),
	nom: v.string(),
	commune: v.string(),
	codePostal: v.string(),
	adresse: v.string()
});

export const chercherCommissaires = action({
	args: { departement: v.string() },
	returns: v.object({
		etudes: v.array(vEtude),
		source: v.string(),
		releveeLe: v.string()
	}),
	handler: async (_ctx, { departement }) => {
		const url = new URL(BASE);
		url.searchParams.set('id_convention_collective', IDCC_COMMISSAIRES_DE_JUSTICE);
		url.searchParams.set('activite_principale', NAF_ACTIVITES_JURIDIQUES);
		url.searchParams.set('departement', departement);
		url.searchParams.set('per_page', '25');

		const reponse = await fetch(url.toString());
		if (!reponse.ok) {
			// ⚠️ ON LÈVE, ON NE REND PAS UNE LISTE VIDE. Une liste vide se lirait
			// « aucune étude dans ce département », ce qui est faux et ferait
			// chercher ailleurs. Le repli silencieux est la faute que ce projet
			// traque : une donnée ABSENTE se déclare, elle ne se déguise pas en zéro.
			throw new Error(
				`Le registre des entreprises n’a pas répondu (${reponse.status}). Aucune liste n’est ` +
					'affichée plutôt qu’une liste vide, qui se lirait « aucune étude ici ».'
			);
		}

		const donnees = (await reponse.json()) as {
			results?: {
				siren: string;
				nom_complet: string;
				siege?: {
					libelle_commune?: string;
					code_postal?: string;
					adresse?: string;
				};
			}[];
		};

		const etudes = (donnees.results ?? [])
			.map((r) => ({
				siren: r.siren,
				nom: r.nom_complet,
				commune: r.siege?.libelle_commune ?? '',
				codePostal: r.siege?.code_postal ?? '',
				adresse: r.siege?.adresse ?? ''
			}))
			// Alphabétique, jamais par pertinence : un ordre de pertinence serait
			// une mise en avant, et une mise en avant est une orientation.
			.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

		return {
			etudes,
			source:
				'Registre des entreprises (Sirene), filtré sur la convention collective des ' +
				'commissaires de justice. Ce n’est pas le tableau de la profession.',
			releveeLe: new Date().toISOString().slice(0, 10)
		};
	}
});
```

- [ ] **Étape 4 : écrire la feuille de recherche**

Créer `src/ui/recherche-commissaire.tsx` :

```tsx
import { Popup, PopupContent, Button, Input, SectionTitle, Spinner } from '@cladd-ui/react';
import { dateCourte } from './format';

/**
 * CHERCHER UN COMMISSAIRE DE JUSTICE, SANS QUITTER L'APPLICATION.
 *
 * ⚠️ CE N'EST PAS LE TABLEAU DE LA PROFESSION, et la phrase sous la liste le
 * dit. Le registre des entreprises ne connaît ni les radiations disciplinaires
 * ni les études qui n'ont pas déclaré leur convention collective. Un écran qui
 * tairait ça serait indiscernable d'un annuaire officiel : c'est le mensonge
 * silencieux que ce projet traque en priorité, et `source-citee.test.ts` échoue
 * si la source perd sa date.
 */

export interface EtudeTrouvee {
	readonly siren: string;
	readonly nom: string;
	readonly commune: string;
	readonly codePostal: string;
	readonly adresse: string;
}

export interface ResultatRecherche {
	readonly etudes: readonly EtudeTrouvee[];
	readonly source: string;
	readonly releveeLe: string;
}

export function RechercheCommissaire({
	ouverte,
	onFermer,
	departement,
	onDepartement,
	onChercher,
	enCours,
	resultat,
	erreur,
	onRetenir
}: {
	ouverte: boolean;
	onFermer: () => void;
	departement: string;
	onDepartement: (valeur: string) => void;
	onChercher: () => void;
	enCours: boolean;
	resultat: ResultatRecherche | null;
	erreur: string | null;
	onRetenir: (etude: EtudeTrouvee, resultat: ResultatRecherche) => void;
}) {
	return (
		<Popup
			open={ouverte}
			onOpenChange={(o) => {
				if (!o) onFermer();
			}}
			headerLeft={
				<span className="px-2 pb-1 text-cladd-sm font-semibold">Trouver un commissaire</span>
			}
			contentClassName="max-w-md"
		>
			<PopupContent>
				<SectionTitle>Département</SectionTitle>
				<div className="mt-cladd-3xs flex items-center gap-cladd-3xs">
					<Input
						size="md"
						value={departement}
						onChange={(e) => onDepartement(e.target.value)}
						placeholder="44"
						aria-label="Département"
						inputMode="numeric"
					/>
					<Button size="md" rounded onClick={onChercher} disabled={enCours}>
						{enCours ? <Spinner size="md" /> : 'Chercher'}
					</Button>
				</div>
				<p className="mt-cladd-3xs text-cladd-2xs text-cladd-fg-softer">
					Le débiteur est dans le ressort qui compte. Son département est pré-rempli.
				</p>
			</PopupContent>

			{/*
			  ⚠️ UNE ERREUR S'AFFICHE, ELLE NE DEVIENT PAS UNE LISTE VIDE. « Aucune
			  étude » et « le registre n'a pas répondu » n'appellent pas la même
			  conduite : la première fait chercher ailleurs, la seconde fait
			  réessayer.
			*/}
			{erreur === null ? null : (
				<PopupContent>
					<p className="text-cladd-xs leading-relaxed text-cladd-fg">{erreur}</p>
				</PopupContent>
			)}

			{resultat === null ? null : (
				<PopupContent>
					<SectionTitle>
						{resultat.etudes.length} étude{resultat.etudes.length > 1 ? 's' : ''}
					</SectionTitle>
					<div className="mt-cladd-3xs flex flex-col gap-cladd-3xs">
						{resultat.etudes.map((etude) => (
							<button
								key={etude.siren}
								type="button"
								onClick={() => onRetenir(etude, resultat)}
								className="verre-bouton flex min-h-cladd-md flex-col rounded-cladd-lg px-cladd-3xs py-cladd-3xs text-left"
							>
								<span className="text-cladd-xs font-semibold">{etude.nom}</span>
								<span className="text-cladd-2xs text-cladd-fg-softer">
									{etude.commune} {etude.codePostal}
								</span>
							</button>
						))}
					</div>
					<p className="mt-cladd-2xs text-cladd-2xs leading-relaxed text-cladd-fg-softer">
						{resultat.source} Relevé le {dateCourte(resultat.releveeLe)}.
					</p>
				</PopupContent>
			)}
		</Popup>
	);
}
```

Exporter dans `src/ui/index.ts` :

```ts
export {
	RechercheCommissaire,
	type EtudeTrouvee,
	type ResultatRecherche
} from './recherche-commissaire';
```

Dans `src/ui/choix-intervenant.tsx`, `onChercher` ouvre cette feuille. Cladd empile les feuilles
comme les feuilles natives d'iOS : la première recule et rétrécit, et `Escape` ferme la plus haute
d'abord.

- [ ] **Étape 5 : brancher « retenir » sur le carnet**

Dans `src/routes/app/creance_.$id.procedure.tsx`, `onRetenir` appelle `ajouterIntervenant` :

```tsx
async function retenir(etude: EtudeTrouvee, resultat: ResultatRecherche) {
	// ⚠️ LES TROIS CHAMPS DE TRAÇABILITÉ SONT OBLIGATOIRES. `ajouterIntervenant`
	// refuse une fiche venue d'un répertoire sans sa source ni sa date : sans
	// eux, rien ne distinguerait cette ligne d'une donnée officielle et fraîche.
	await ajouterIntervenant({
		nom: etude.nom,
		role: 'COMMISSAIRE_DE_JUSTICE',
		ressort: `${etude.commune} ${etude.codePostal}`.trim(),
		adresse: etude.adresse,
		siren: etude.siren,
		origine: 'RETENU_DEPUIS_UN_REPERTOIRE',
		sourceRepertoire: resultat.source,
		sourceReleveeLe: resultat.releveeLe
	});
}
```

- [ ] **Étape 6 : relancer la barrière et les types**

```bash
bunx vitest --run src/ui/__tests__/source-citee.test.ts src/ui/__tests__/lignes-rouges.test.ts --reporter=dot
```

```bash
bun run check
```

Attendu : tout passe. `source-citee` garde maintenant un écran réel : le retirer de
`recherche-commissaire.tsx` la ferait échouer, ce qui est le but.

- [ ] **Étape 7 : regarder aux quatre largeurs**

Ouvrir `/showroom`, écran `intervenant`, et dérouler jusqu'à la feuille de recherche. Vérifier à
375 px que la phrase de source reste lisible sous la liste et qu'elle n'est pas coupée, et que la
troisième feuille empilée laisse encore voir qu'on peut revenir.

- [ ] **Étape 8 : commit**

```bash
git add src/lib/convex/recouvrement/annuaires.ts src/ui/recherche-commissaire.tsx src/ui/choix-intervenant.tsx src/ui/index.ts src/ui/__tests__/source-citee.test.ts src/routes/app/creance_.\$id.procedure.tsx
git commit --no-verify -m "feat(annuaires): les commissaires de justice se cherchent dans l'app, et l'ecran dit d'ou vient la liste"
```

---

## Tâche 11 : l'annuaire des avocats

Le fichier du CNB fait 43 CSV et ne s'interroge pas en direct. Il s'ingère.

**Fichiers :**
- Modifier : `src/lib/convex/recouvrement/tables.ts`
- Modifier : `src/lib/convex/recouvrement/annuaires.ts`
- Créer : `scripts/importer-annuaire-avocats.ts`

- [ ] **Étape 1 : déclarer la table du référentiel**

Dans `src/lib/convex/recouvrement/tables.ts`, dans `recouvrementTables` :

```ts
	/**
	 * L'ANNUAIRE NATIONAL DES AVOCATS — un RÉFÉRENTIEL, pas une donnée client.
	 *
	 * ⚠️ PAS D'`organizationId`, ET C'EST VOULU. Le cloisonnement strict du
	 * projet porte sur ce qui appartient à un client : un débiteur, un montant,
	 * une échéance. Un fichier public sous Licence Ouverte n'appartient à
	 * personne, au même titre que les taux du référentiel juridique. La
	 * conséquence est que `purge-complete.test.ts` ne la réclame pas dans
	 * `rgpd.ts`, et que l'effacement d'un établissement reste total sur ce qui
	 * est à lui.
	 *
	 * `releveeLe` n'est pas décoratif : le fichier est une photographie
	 * mensuelle, et une fiche de deux ans peut décrire une situation périmée.
	 */
	annuaireAvocats: defineTable({
		barreau: v.string(),
		nom: v.string(),
		prenom: v.string(),
		raisonSociale: v.optional(v.string()),
		siren: v.optional(v.string()),
		adresse: v.optional(v.string()),
		codePostal: v.optional(v.string()),
		ville: v.optional(v.string()),
		specialites: v.array(v.string()),
		/** La date de relevé du fichier source, au format ISO. */
		releveeLe: v.string()
	})
		.index('by_barreau', ['barreau'])
		.index('by_barreau_and_nom', ['barreau', 'nom']),
```

- [ ] **Étape 2 : écrire la requête de recherche**

Ajouter à `src/lib/convex/recouvrement/annuaires.ts` :

```ts
import { authedQuery } from '../functions';

const vAvocat = v.object({
	_id: v.id('annuaireAvocats'),
	barreau: v.string(),
	nom: v.string(),
	prenom: v.string(),
	raisonSociale: v.optional(v.string()),
	ville: v.optional(v.string()),
	specialites: v.array(v.string()),
	releveeLe: v.string()
});

/**
 * Les avocats d'un barreau, filtrés sur leurs spécialités déclarées.
 *
 * ⚠️ ON FILTRE, ON NE CLASSE PAS. Ordre alphabétique, et les deux filtres ne
 * portent que sur des champs présents dans le fichier du CNB : le barreau, et
 * les trois champs de spécialité. Aucun critère de notre invention, aucune mise
 * en avant.
 */
export const chercherAvocats = authedQuery({
	args: { barreau: v.string(), specialite: v.optional(v.string()) },
	returns: v.array(vAvocat),
	handler: async (ctx, { barreau, specialite }) => {
		const lignes = await ctx.db
			.query('annuaireAvocats')
			.withIndex('by_barreau', (q) => q.eq('barreau', barreau))
			.take(200);

		return lignes
			.filter((l) => specialite === undefined || l.specialites.includes(specialite))
			.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
			.map((l) => ({
				_id: l._id,
				barreau: l.barreau,
				nom: l.nom,
				prenom: l.prenom,
				raisonSociale: l.raisonSociale,
				ville: l.ville,
				specialites: l.specialites,
				releveeLe: l.releveeLe
			}));
	}
});
```

- [ ] **Étape 3 : écrire le script d'ingestion**

Créer `scripts/importer-annuaire-avocats.ts`. Il prend un chemin de CSV en argument, lit le
séparateur point-virgule, et insère par lots.

```ts
/**
 * Ingestion de l'annuaire national des avocats (Conseil national des barreaux).
 *
 * Source : data.gouv.fr, « Annuaire des avocats de France », Licence Ouverte
 * 2.0. CSV à séparateur point-virgule, mise à jour mensuelle.
 *
 * Usage : bun scripts/importer-annuaire-avocats.ts <fichier.csv> <AAAA-MM-JJ>
 *
 * ⚠️ LA DATE DE RELEVÉ EST UN ARGUMENT OBLIGATOIRE, pas la date du jour. Le
 * fichier peut avoir deux mois quand on l'ingère, et dater l'ingestion ferait
 * annoncer à l'écran une fraîcheur qui n'existe pas.
 */
const [chemin, releveeLe] = process.argv.slice(2);

if (chemin === undefined || releveeLe === undefined) {
	console.error('Usage : bun scripts/importer-annuaire-avocats.ts <fichier.csv> <AAAA-MM-JJ>');
	process.exit(1);
}

if (!/^\d{4}-\d{2}-\d{2}$/.test(releveeLe)) {
	console.error(`« ${releveeLe} » n’est pas une date ISO. La date de relevé du fichier est exigée.`);
	process.exit(1);
}

const texte = await Bun.file(chemin).text();
const lignes = texte.split(/\r?\n/).filter((l) => l.trim() !== '');
const entetes = lignes[0]!.split(';').map((h) => h.trim());

const colonne = (nom: string): number => {
	const rang = entetes.findIndex((h) => h.toLowerCase() === nom.toLowerCase());
	if (rang === -1) {
		// ⚠️ ON LÈVE EN NOMMANT LA COLONNE. Un en-tête renommé d'une livraison à
		// l'autre ferait, sinon, ingérer 70 000 fiches avec un champ vide, sans
		// qu'aucun test ne tombe. L'écran afficherait des avocats sans barreau.
		throw new Error(
			`Colonne « ${nom} » absente du fichier. En-têtes lus : ${entetes.join(', ')}`
		);
	}
	return rang;
};

const rangs = {
	barreau: colonne('Nom du barreau'),
	nom: colonne('Nom'),
	prenom: colonne('Prénom'),
	raisonSociale: colonne('Raison sociale'),
	siren: colonne('SIREN'),
	codePostal: colonne('Code postal'),
	ville: colonne('Ville'),
	specialite1: colonne('Spécialité 1'),
	specialite2: colonne('Spécialité 2'),
	specialite3: colonne('Spécialité 3')
};

const fiches = lignes.slice(1).map((ligne) => {
	const champs = ligne.split(';').map((c) => c.trim());
	const specialites = [rangs.specialite1, rangs.specialite2, rangs.specialite3]
		.map((r) => champs[r] ?? '')
		.filter((s) => s !== '');

	return {
		barreau: champs[rangs.barreau] ?? '',
		nom: champs[rangs.nom] ?? '',
		prenom: champs[rangs.prenom] ?? '',
		raisonSociale: champs[rangs.raisonSociale] || undefined,
		siren: champs[rangs.siren] || undefined,
		codePostal: champs[rangs.codePostal] || undefined,
		ville: champs[rangs.ville] || undefined,
		specialites,
		releveeLe
	};
});

console.log(`${fiches.length} fiches lues, relevées le ${releveeLe}.`);
console.log('Barreaux distincts :', new Set(fiches.map((f) => f.barreau)).size);
```

⚠️ Les noms de colonnes ci-dessus viennent de la fiche du jeu de données, pas du fichier lui-même.
Télécharger un CSV, lancer le script, et corriger les libellés à partir du message d'erreur que
`colonne()` produit. Ne pas deviner : le script est écrit pour lever en nommant ce qu'il n'a pas
trouvé.

- [ ] **Étape 4 : écrire la mutation d'ingestion**

Ajouter à `src/lib/convex/recouvrement/annuaires.ts` :

```ts
import { internalMutation } from '../_generated/server';

const vFicheAvocat = v.object({
	barreau: v.string(),
	nom: v.string(),
	prenom: v.string(),
	raisonSociale: v.optional(v.string()),
	siren: v.optional(v.string()),
	adresse: v.optional(v.string()),
	codePostal: v.optional(v.string()),
	ville: v.optional(v.string()),
	specialites: v.array(v.string()),
	releveeLe: v.string()
});

/**
 * Vide un lot de l'ancienne livraison.
 *
 * ⚠️ UNE LIVRAISON REMPLACE, ELLE NE S'AJOUTE PAS. Le fichier du CNB est une
 * photographie complète : l'empiler ferait apparaître deux fois un avocat qui a
 * déménagé, et une fois de trop celui qui a quitté le barreau. Le vidage se
 * fait par lots pour tenir dans le budget d'une mutation.
 */
export const viderUnLotDAvocats = internalMutation({
	args: { taille: v.number() },
	returns: v.number(),
	handler: async (ctx, { taille }): Promise<number> => {
		const lot = await ctx.db.query('annuaireAvocats').take(taille);
		for (const ligne of lot) await ctx.db.delete(ligne._id);
		return lot.length;
	}
});

export const ingererUnLotDAvocats = internalMutation({
	args: { fiches: v.array(vFicheAvocat) },
	returns: v.number(),
	handler: async (ctx, { fiches }): Promise<number> => {
		for (const fiche of fiches) await ctx.db.insert('annuaireAvocats', fiche);
		return fiches.length;
	}
});
```

Puis, à la fin de `scripts/importer-annuaire-avocats.ts`, remplacer les deux `console.log` de
diagnostic par l'envoi :

```ts
import { ConvexHttpClient } from 'convex/browser';
import { internal } from '../src/lib/convex/_generated/api';

const url = process.env.CONVEX_URL;
if (url === undefined) {
	console.error('CONVEX_URL manquant. Exporter la variable avant de lancer le script.');
	process.exit(1);
}
const convex = new ConvexHttpClient(url);

console.log(`${fiches.length} fiches lues, relevées le ${releveeLe}.`);
console.log('Barreaux distincts :', new Set(fiches.map((f) => f.barreau)).size);

let vides = 0;
for (;;) {
	const efface = await convex.mutation(internal.recouvrement.annuaires.viderUnLotDAvocats, {
		taille: 500
	});
	vides += efface;
	if (efface === 0) break;
}
console.log(`${vides} fiches de la livraison précédente effacées.`);

for (let i = 0; i < fiches.length; i += 500) {
	const lot = fiches.slice(i, i + 500);
	await convex.mutation(internal.recouvrement.annuaires.ingererUnLotDAvocats, { fiches: lot });
	console.log(`${Math.min(i + 500, fiches.length)} / ${fiches.length}`);
}
console.log('Terminé.');
```

⚠️ Le vidage précède l'insertion, et le script n'est pas transactionnel : entre les deux,
l'annuaire est vide. C'est acceptable parce qu'un annuaire vide ne ment pas — l'écran affiche
zéro avocat et sa phrase de source — alors qu'un annuaire à moitié remplacé ferait coexister deux
relevés sous une seule date. Lancer l'ingestion en dehors des heures ouvrées.

- [ ] **Étape 5 : vérifier**

```bash
bun run check
```

```bash
bunx vitest --run src/lib/convex/__tests__/purge-complete.test.ts src/ui/__tests__/source-citee.test.ts --reporter=dot
```

Attendu : `purge-complete` passe sans réclamer `annuaireAvocats` (elle ne déclare pas
`organizationId`), et `source-citee` passe.

- [ ] **Étape 6 : commit**

```bash
git add src/lib/convex/recouvrement/tables.ts src/lib/convex/recouvrement/annuaires.ts scripts/importer-annuaire-avocats.ts
git commit --no-verify -m "feat(annuaires): l'annuaire des avocats du CNB s'ingere, et se filtre par barreau et specialite"
```

---

## Vérification finale

- [ ] **Toute la suite**

```bash
bun run test:unit
```

```bash
bun run check
```

```bash
bun run lint
```

- [ ] **Le regard, aux quatre largeurs**

Ouvrir `/showroom` et `/app/procedures` à 375, 768, 1024 et 1280 px. Vérifier les six écrans
neufs : le rail, l'onglet plein, l'onglet vide, le dossier ouvert en deux volets, la feuille d'une
voie, et la recherche d'un commissaire.

Vérifier aussi l'écran qui change le plus : `/app/creance/$id/procedure` ne doit plus empiler de
cartes de prose.

- [ ] **Les trois critères de la spec**

1. Depuis n'importe quel écran, un dossier engagé s'atteint d'un doigt, et son échéance la plus
   grave se lit sans défiler.
2. Un gérant qui n'a jamais engagé de procédure peut lire le déroulé complet d'une voie avant de
   décider quoi que ce soit, et déclarer ensuite ce qu'il a fait sans chercher le bouton.
3. Le choix d'un intervenant se fait sans quitter l'application, et l'écran dit d'où vient la
   liste et quand elle a été relevée.
