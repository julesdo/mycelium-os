# ARCHITECTURE — la frontière entre le socle et les verticales

**Livrable de la Phase 1** du [brief de remodelage](00-brief-remodelage.md), appuyé sur
l'[audit](AUDIT.md).

---

## Le constat qui commande tout le reste

L'audit a mesuré la frontière au lieu de la supposer, et il en ressort une chose : **elle existe
déjà, elle n'est simplement pas rangée.** Sur les dix-neuf modules du moteur examinés, **dix-huit
sont purs** — ils n'importent ni `_generated`, ni `convex/server`, ni `convex/values`. Un seul,
`lot.ts`, touche Convex.

Cela change la nature de la Phase 1. Ce n'est pas une extraction de logique enfouie dans des
mutations : c'est un **déplacement de fichiers** et l'introduction d'une couture là où il y a
aujourd'hui un appel en dur. Le risque de régression est donc de nature mécanique (imports cassés,
compilation) et non sémantique (comportement changé) — ce qui est exactement le genre de risque
que 438 tests et `tsc --noEmit` attrapent intégralement.

---

## 1. La frontière proposée

Le critère de rangement n'est **pas** « générique ou métier ». C'est :

> **Un module appartient au socle s'il peut être écrit sans savoir quelle loi on applique.**

Un module qui connaît le mot « bio », le seuil de 50 %, ou la notion d'exigibilité appartient à une
verticale, même s'il est purement fonctionnel.

Un second critère, orthogonal, décide de l'emplacement physique :

> **La logique pure sort de `src/lib/convex/`. Seules les `query` / `mutation` / `action` y restent.**

C'est ce qui rend la logique testable sans harnais Convex, et c'est déjà la convention que
`src/lib/egalim/` suit.

### L'arborescence cible

```
src/lib/
  socle/                        ← le moteur. Ne sait pas quelle loi il sert.
    documents/
      schema.ts                 ← LigneExtraite, DocumentExtrait
      prompt.ts                 ← prompt d'extraction d'une facture
      extracteur.ts             ← appel modèle, sortie structurée
      csv.ts                    ← chemin déterministe
      verification.ts           ← recoupement contre les totaux imprimés
    normalisation.ts            ← libellés et raisons sociales
    appariement.ts              ← rapprochement par clé, jamais par position
    doublons.ts                 ← réconciliation de document, 3 niveaux
    modele/
      reprise.ts                ← politique de reprise sur appel modèle
      cout.ts                   ← barème, plafond, transport d'usage
    montants.ts                 ← arithmétique décimale exacte        (Phase 3)
    verticale.ts                ← LE contrat qu'une verticale remplit
    registre.ts                 ← résolution d'une verticale par clé

  verticales/
    egalim/                     ← la verticale existante, inchangée en substance
      referentiel.ts  types.ts  empreinte.ts
      verdict.ts      consensus.ts   agregation.ts
      prompt.ts       schema.ts      classificateur.ts
      mentions.ts     courrier.ts
    recouvrement/                                                (Phases 2 à 6)
      ...

  convex/
    socle/                      ← les fonctions Convex du moteur
      ...                       (extraction.ts, classification.ts, mutations, batches…)
    egalim/                     ← les fonctions Convex propres à EGalim
      diagnostics.ts  produits.ts  attestations.ts  signature.ts …
```

### Ce qui NE bouge pas, et pourquoi

**Les noms de tables Convex ne sont pas renommés.** `invoiceBatches`, `invoiceLines`, `suppliers`
gardent leur nom, malgré le § 11.3 de l'audit qui relève que le socle parle « achat » là où le
recouvrement parlera « vente ».

Trois raisons, et la première suffit :

1. **On ne sait pas s'il y a des données de production** (inconnue n° 3 de l'audit). Renommer une
   table Convex est une migration, pas un `git mv`. Tant que la question n'est pas tranchée par
   Jules, le renommage est un risque pris pour du confort de lecture.
2. Le recouvrement n'a de toute façon **pas** besoin de réutiliser `invoiceLines` : ses factures
   sont des factures de vente, avec des champs propres (échéance, exigibilité, paiement partiel).
   Elles vivront dans leurs propres tables. La collision de vocabulaire est donc théorique.
3. Un renommage se fait bien **après** que la seconde verticale a montré ce dont elle a réellement
   besoin. Le faire maintenant, c'est deviner.

---

## 2. L'interface que le socle expose

C'est la pièce centrale, et c'est la seule vraie décision de conception de cette phase.

### Ce que le socle sait faire, et où il s'arrête

Le socle mène un document jusqu'à des **libellés distincts, normalisés, dédoublonnés**, puis
demande à un modèle de les **qualifier**. À partir de là, il ne sait plus rien : ce qu'est une
qualification valide, ce qu'elle implique en droit, et si elle doit passer devant un humain sont
trois questions de verticale.

D'où le contrat, dans `socle/verticale.ts` :

```ts
export interface Verticale<Brute, Verdict> {
  /** La clé qui la désigne dans le registre, et qui voyage dans les arguments Convex. */
  readonly cle: string;

  /** Enregistrée sur CHAQUE classification produite. Une mesure sait quelle règle l'a produite. */
  readonly version: string;

  /** Le schéma de ce que le modèle doit rendre pour un libellé. Des constats, jamais des conclusions. */
  readonly schema: StandardSchemaV1<Brute>;

  /** Le prompt qui décrit au modèle ce qu'il doit RELEVER. */
  construirePrompt(): string;

  /** Le passage des constats du modèle aux conclusions du droit. Du code versionné, jamais un modèle. */
  deriverVerdict(brute: Brute, source: 'AUTO' | 'HUMAN'): Verdict;

  /** Pourquoi ce libellé attend un arbitrage humain, ou `null` s'il n'en attend pas. */
  motifRevue(ligne: LignePartielle): string | null;

  /** Faut-il redemander ce libellé à cette organisation, malgré le cache global ? */
  doitEtreDemande(cache: EntreeCache | null, brute: Brute): boolean;
}
```

### Les deux invariants que ce contrat protège

Ils ne sont pas décoratifs : ce sont eux qui rendent le produit opposable.

**Le modèle relève, le code conclut.** `schema` décrit des *constats* (« ce libellé porte la
mention AB »), jamais des *conclusions* (« ce produit est bio »). C'est `deriverVerdict` — du code
relu, versionné, testé — qui applique le barème. Un contrôleur remonte du chiffre au texte de loi
sans jamais repasser par un modèle. La verticale recouvrement héritera de la même discipline : le
modèle relèvera « la facture porte une date d'échéance au 12/03 », le code conclura sur
l'exigibilité.

**Le doute ne peut pas être silencieux.** `motifRevue` rend un motif, pas un booléen. La différence
compte : un opérateur qui voit `VIANDE_POISSON` à 0,97 confirme d'un coup d'œil, un
`CONFIANCE_BASSE` à 0,4 doit réfléchir. Sans le motif, les deux se ressemblent et il ralentit sur
les deux.

### Pourquoi un registre, et pas une injection

Une `action` Convex ne peut pas recevoir un objet avec des méthodes en argument : ses arguments
sont validés et sérialisés. La verticale est donc désignée par une **clé** (`'egalim'`), qui voyage
dans les arguments, et résolue à la portée module :

```ts
// socle/registre.ts
const VERTICALES = { egalim: verticaleEgalim } as const;
export type CleVerticale = keyof typeof VERTICALES;
export function resoudre(cle: CleVerticale) { return VERTICALES[cle]; }
```

C'est la contrainte de la plateforme qui dicte cette forme, pas une préférence. Elle a un effet
secondaire heureux : la clé étant stockée sur le lot, on sait toujours quelle verticale a produit
une mesure, des années après.

### Ce que le socle N'expose PAS, délibérément

- **Aucun hook de calcul.** Les ratios EGalim, le décompte de créance : ce sont des fonctions de
  verticale, appelées par des fonctions Convex de verticale. Le socle ne les orchestre pas.
- **Aucun format de sortie.** Ni PDF, ni courrier, ni CSV de déclaration.
- **Aucune notion de seuil.** `SEUIL_CONFIANCE = 0.85` descend dans la verticale : c'est un
  arbitrage de qualité propre à un domaine, pas une constante du moteur.

---

## 3. Liste des déplacements

### 3.1 Vers `src/lib/socle/` — 9 modules, purs, sans changement de comportement

| Depuis | Vers |
|---|---|
| `convex/egalim/extractionSchema.ts` | `socle/documents/schema.ts` |
| `convex/egalim/promptExtraction.ts` | `socle/documents/prompt.ts` |
| `convex/egalim/extracteurClaude.ts` | `socle/documents/extracteur.ts` |
| `convex/egalim/parsers/csv.ts` | `socle/documents/csv.ts` |
| `convex/egalim/verification.ts` | `socle/documents/verification.ts` |
| `convex/egalim/normalisation.ts` | `socle/normalisation.ts` |
| `convex/egalim/appariement.ts` | `socle/appariement.ts` |
| `convex/egalim/doublons.ts` | `socle/doublons.ts` |
| `convex/egalim/reprise.ts` | `socle/modele/reprise.ts` |
| `convex/egalim/cout.ts` | `socle/modele/cout.ts` |

**Une seule retouche de fond**, dans `verification.ts` : la constante
`TAUX_ALIMENTAIRES = {5.5, 10}` est une heuristique française et alimentaire. Elle devient un
paramètre de la fonction, fourni par la verticale. C'est le seul endroit du socle où une notion de
domaine s'était glissée.

### 3.2 Vers `src/lib/verticales/egalim/` — 11 modules

| Depuis | Vers |
|---|---|
| `lib/egalim/referentiel.ts` · `types.ts` · `empreinte.ts` | `verticales/egalim/` (identique) |
| `convex/egalim/verdict.ts` | `verticales/egalim/verdict.ts` |
| `convex/egalim/consensus.ts` | `verticales/egalim/consensus.ts` |
| `convex/egalim/agregation.ts` | `verticales/egalim/agregation.ts` |
| `convex/egalim/prompt.ts` | `verticales/egalim/prompt.ts` |
| `convex/egalim/classificationSchema.ts` | `verticales/egalim/schema.ts` |
| `convex/egalim/classificateurClaude.ts` | `verticales/egalim/classificateur.ts` |
| `convex/egalim/mentions.ts` · `courrier.ts` | `verticales/egalim/` |

Plus un fichier neuf, `verticales/egalim/index.ts`, qui assemble ces pièces en un objet
`Verticale` conforme au contrat.

### 3.3 Restent dans `src/lib/convex/` — les fonctions, jamais la logique

`extraction.ts`, `classification.ts`, `extractionMutations.ts`, `classificationMutations.ts`,
`batches.ts`, `lot.ts`, `confirmation.ts` passent sous `convex/socle/` ; `diagnostics.ts`,
`produits.ts`, `attestations.ts`, `signature.ts`, `rappels.ts`, `pilotage.ts`, `tables.ts` sous
`convex/egalim/`.

Les tests suivent leurs modules.

---

## 4. Risques de régression sur la verticale EGalim

Classés par gravité réelle, pas par probabilité.

### Risque 1 — La rupture d'un invariant dupliqué volontairement · **gravité haute**

`FAMILLES_VIANDE_POISSON` est lue à **deux** endroits (`verdict.ts:120` et `consensus.ts:36`), avec
un commentaire qui explique que le doublon est délibéré. Si le déplacement en casse un seul, de la
viande cesse de passer systématiquement devant un humain — ce que `CLAUDE.md` désigne comme non
négociable.

*Ce qui l'attrape :* `verdict.test.ts` et `consensus.test.ts` couvrent les deux gardes
séparément. Aucun des deux ne peut tomber en silence.

### Risque 2 — Le prompt de classification change, donc le cache Claude s'invalide · **gravité moyenne, coût réel**

`promptExtraction.ts` porte un avertissement explicite : le préfixe système est mis en cache
(`cache_control: 'ephemeral'`) et **toute variation multiplie le coût par diagnostic**. Un
déplacement qui reformaterait la chaîne — un `prettier` un peu zélé, une indentation de template
literal qui change — ne casse aucun test et coûte de l'argent à chaque lot.

*Ce qui l'attrape :* `prompt.test.ts` et `promptExtraction.test.ts` existent déjà. **À vérifier
qu'ils comparent bien la chaîne exacte** et pas seulement sa présence.

### Risque 3 — `'use node'` mal placé · **gravité moyenne, échec bruyant**

La directive ne vaut que dans un fichier du répertoire Convex, et un fichier qui exporte une
`query` ne peut pas la porter. En sortant `extracteur.ts` et `reprise.ts` de `convex/`, la
directive devient inutile chez eux mais reste **obligatoire** chez leurs appelants
(`convex/socle/extraction.ts`).

*Ce qui l'attrape :* `bun run check:convex` et le déploiement. Échec franc, jamais silencieux.

### Risque 4 — Les chemins relatifs profonds · **gravité basse, volume élevé**

Le backend n'utilise pas d'alias : `../../egalim/referentiel`. Chaque déplacement change la
profondeur. C'est le gros du travail, et c'est mécanique.

*Ce qui l'attrape :* `tsc --noEmit` sur les deux `tsconfig`, intégralement.

### Risque 5 — Le schéma Convex n'est pas touché · **aucun risque de données**

Aucune table renommée, aucun champ ajouté ou retiré, aucun index modifié. **Aucune migration.**
C'est la propriété qui rend cette phase réversible par `git revert`.

### Le filet, en un chiffre

**438 tests passent avant le déplacement** (relevé sur `3d0ccf4`). La condition d'acceptation de
la Phase 1 est : *438 tests passent après, et `bun run check` est vert.* Aucun test n'est réécrit
pour accommoder un déplacement — un test qui doit changer signale que le comportement a changé, ce
qui est précisément ce que cette phase interdit.

---

## 5. Ce que cette phase ne fait pas

- **Elle n'ajoute pas l'arithmétique décimale.** `socle/montants.ts` est déclaré dans
  l'arborescence mais construit en Phase 3, avec ses tests, là où il a un usage.
- **Elle ne crée pas la verticale recouvrement.** L'arborescence lui réserve sa place ; elle se
  remplit aux Phases 2 à 6.
- **Elle ne corrige pas les flottants d'EGalim.** `agregation.ts` continue de sommer des `number`.
  C'est acceptable pour un ratio, ça ne le sera pas pour un décompte — mais changer EGalim
  maintenant serait une régression déguisée en amélioration.
- **Elle ne touche pas à l'interface.** Aucun fichier de `src/routes/`, `src/screens/` ou
  `src/ui/` n'est déplacé.
