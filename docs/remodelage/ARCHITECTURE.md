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
    __tests__/frontiere.test.ts ← interdit au socle d'importer une verticale

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

Le socle mène un document jusqu'à des **libellés distincts, normalisés, dédoublonnés**. À partir de
là, il ne sait plus rien : ce qu'est une qualification valide, ce qu'elle implique en droit, et si
elle doit passer devant un humain sont trois questions de verticale.

### L'interface est un jeu de fonctions pures, pas un objet à implémenter

C'est un arbitrage, et il mérite d'être défendu parce qu'il va contre le réflexe habituel.

La forme attendue serait une interface `Verticale` que chaque domaine implémente, plus un registre
qui la résout par clé. Je ne l'ai **pas** écrite, pour une raison de fond : **elle serait taillée
sur EGalim, et le recouvrement n'a pas cette forme.**

EGalim classe des **libellés distincts** contre un référentiel, avec un cache mutualisé entre
clients et un consensus. Le recouvrement ne fait rien de tel : il qualifie une **créance** — une
agrégation de factures, de pièces et de dates — contre des conditions légales. Il n'y a pas de
libellé à mutualiser, pas de cache inter-clients, pas de consensus. Forcer les deux dans une même
signature `qualifier(entrée) → verdict` produirait une abstraction que les deux côtés
contourneraient dès la première difficulté réelle.

Le brief lui-même prévient contre ce geste, en Phase 4 : « ce sont des choix à calibrer sur données
réelles, pas à figer maintenant ».

**Ce que le socle expose donc, ce sont des fonctions pures, importables librement :**

| Module | Ce qu'il offre | Qui s'en sert |
|---|---|---|
| `socle/documents/*` | `parseCsv`, `extraireAvecClaude`, `verifierExtraction`, les schémas | Les deux verticales, tel quel |
| `socle/normalisation.ts` | `normaliserLibelle`, `normaliserFournisseur` | Les deux |
| `socle/doublons.ts` | `chercherDoublon`, 3 niveaux | Les deux |
| `socle/appariement.ts` | `rapprocher` par clé, jamais par position | Les deux |
| `socle/modele/*` | `avecReprise`, `estimerCout`, `CAP_EUR`, `ErreurAppelClaude` | Les deux |
| `socle/montants.ts` | arithmétique décimale exacte *(Phase 3)* | Recouvrement surtout |

Une verticale « se branche » en important ce dont elle a besoin, et en gardant chez elle son
référentiel, ses règles et ses formats de sortie. C'est plus faible qu'un contrat — et c'est
honnête tant qu'une seule verticale existe.

**L'abstraction viendra du second exemple, pas du premier.** Quand le recouvrement sera écrit
(Phases 2 à 6), ce qui se répétera réellement entre les deux se verra, et pourra être extrait. Une
interface écrite aujourd'hui serait une supposition ; extraite demain, ce sera un constat.

### Ce qui tient la frontière en l'absence de contrat

Une convention ne survit pas à une semaine de travail. La règle est donc **exécutable**, dans
`socle/__tests__/frontiere.test.ts` :

> Aucun fichier de `src/lib/socle/` n'importe `verticales/` ni `convex/`.

Le premier interdit *est* la définition du socle. Le second le garde testable sans harnais de
plateforme — c'est ce qui fait tourner ses tests en 3 secondes, et ce qui le rendrait réutilisable
si le backend changeait.

Le test a été vérifié dans les deux sens : il passe sur le code déplacé, et il tombe en nommant le
fichier et la ligne fautive dès qu'on glisse un `import { SEUILS } from
'../verticales/egalim/referentiel'` dans le socle.

C'est le critère d'acceptation n° 7 du brief — « un nouveau pays ou une nouvelle procédure s'ajoute
sans toucher au socle » — rendu vérifiable par la machine plutôt que par la discipline.

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

### La contrainte à connaître le jour où le contrat s'écrira

Quand l'abstraction viendra, elle ne pourra pas prendre la forme d'une injection de dépendance
classique : **une `action` Convex ne peut pas recevoir un objet porteur de méthodes en argument**,
puisque ses arguments sont validés et sérialisés.

La verticale devra donc être désignée par une **clé** (`'egalim'`, `'recouvrement'`) qui voyage
dans les arguments, et résolue à la portée module. C'est la plateforme qui dicte cette forme, pas
une préférence — autant le savoir avant de concevoir le contrat.

Effet secondaire heureux, dont il faudra profiter : la clé stockée sur le lot fait qu'on sait
toujours quelle verticale a produit une mesure, des années après.

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

### 3.3 Les fonctions Convex ne bougent pas — et c'est une décision, pas un oubli

L'arborescence du § 1 montrait `convex/socle/` et `convex/egalim/`. **Ce découpage est reporté**,
et les fichiers qui exportent des `query` / `mutation` / `action` restent où ils sont.

La raison est que **le chemin d'un fichier Convex EST son adresse d'API**. Déplacer
`convex/egalim/classification.ts` vers `convex/socle/` transforme
`internal.egalim.classification.classifierLot` en `internal.socle.classification.classifierLot`,
et ce nom n'est pas seulement lu par le compilateur :

- il est **écrit dans les tâches planifiées déjà en file** (`ctx.scheduler.runAfter`), qui
  référencent la fonction par son chemin. Une classification en cours au moment du déploiement
  cherche une fonction qui n'existe plus ;
- il est écrit dans `crons.ts` (`internal.egalim.rappels.rappelerLaCampagne`) ;
- il survit dans `_generated/api.d.ts`, régénéré au déploiement.

Tant que l'inconnue n° 3 de l'audit — *y a-t-il des données et des traitements en production ?* —
n'est pas tranchée par Jules, ce déplacement est un risque pris pour du confort de rangement.

**Ce report ne coûte rien à l'objectif.** Ce qui rend une seconde verticale possible, c'est que la
*logique* soit pure et réutilisable, pas que les *fonctions* soient dans un joli dossier. La
verticale recouvrement écrira ses propres fonctions Convex, dans son propre dossier, en important
le même socle. Le rangement des fonctions EGalim pourra suivre plus tard, sous forme de migration
assumée.

Les tests, eux, suivent leurs modules.

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
