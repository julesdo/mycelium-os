# ÉTAT DU REMODELAGE — au 2 septembre 2026

Point d'arrivée de la session autonome. Ce document dit ce qui est fait, ce qui est **bloqué et sur
quoi**, et les décisions prises seul qui demandent une ratification.

À lire avec [le brief](00-brief-remodelage.md), [l'audit](AUDIT.md) et
[l'architecture](ARCHITECTURE.md).

---

## En un coup d'œil

| | Avant | Après |
|---|---|---|
| Tests unitaires | 438 | **577** |
| Erreurs de lint | 0 | 0 (42 avertissements, tous préexistants) |
| `bun run check` | vert | vert |
| Tables Convex | 16 | 25 (9 ajoutées, **0 modifiée**) |

**Aucune régression sur EGalim.** Aucun test n'a été réécrit pour accommoder un déplacement, aucune
table existante n'a été touchée, aucune migration n'est nécessaire.

---

## Ce qui est livré, phase par phase

| Phase | Objet | État | Où |
|---|---|---|---|
| 0 | Audit du code existant | ✅ | [AUDIT.md](AUDIT.md) |
| 1 | Séparation socle / verticale | ✅ | `src/lib/socle/`, `src/lib/verticales/` |
| 2 | Modèle de domaine | ✅ tables | `src/lib/convex/recouvrement/tables.ts` |
| 3 | Calcul financier | ✅ | `socle/montants.ts`, `recouvrement/decompte.ts` |
| 4 | Moteur de qualification | ✅ version simple | `recouvrement/scoring.ts` |
| 5 | Procédures modulaires | ✅ 3 modules | `recouvrement/procedures.ts` |
| 6 | Surveillance | ✅ | `recouvrement/surveillance.ts` |
| — | Fonctions Convex du recouvrement | ⛔ **non commencé** | voir § « Ce qui bloque » |
| 9 | Interface | ⛔ non commencé (dernier, par construction) | — |

Répartition des 577 tests : socle 90 · verticale EGalim 111 · verticale recouvrement 97 · schéma
Convex 22 · le reste (auth, e-mails, RGPD, facturation) inchangé.

---

## Les critères d'acceptation du brief, et ce qui les prouve

Le § 10 du brief liste sept critères. Six sont tenus et **vérifiés par un test qui échoue si la
propriété disparaît** — pas par une relecture.

| Critère | État | Ce qui le prouve |
|---|---|---|
| La verticale EGalim fonctionne toujours | ✅ | 111 tests EGalim, aucun réécrit ; 438 → 577 sans perte |
| Aucune valeur juridique en dur hors du fichier de paramètres | ✅ | `parametres.test.ts` — structure, source et date sur chaque entrée |
| Aucun paramètre `verified: false` utilisable sans erreur explicite | ✅ | `exiger()` lève ; 4 tests dédiés |
| Le même dossier rejoué donne le même résultat au centime | ✅ | `decompte.test.ts` — aucune lecture d'horloge, date d'arrêté en argument |
| Une créance incomplète bloque la génération de l'acte | ✅ | `controle.test.ts` — 8 tests, message qui chiffre l'abandon |
| Une procédure s'ajoute sans toucher au socle | ✅ | `frontiere.test.ts` — le socle ne peut importer ni `verticales/` ni `convex/` |
| Tout montant affiché est traçable jusqu'à sa pièce source | 🟡 **partiel** | Les `segments` portent la traçabilité et le contrôle la rend obligatoire ; **rien ne l'affiche encore** |

---

## ⛔ Ce qui bloque, et ce que ça empêche exactement

### 1. Deux valeurs juridiques manquantes rendent tout décompte réel impossible

C'est le blocage principal, et il ne se contourne pas.

| Paramètre | Sans lui |
|---|---|
| `tauxInteretLegalDefaut` | **Aucun décompte** n'est calculable sur une facture dont les CGV ne stipulent pas de taux — c'est-à-dire la majorité |
| `delaiPrescriptionCommerciale` | La prescription **n'est pas surveillée**. C'est la seule échéance qui éteint une créance sans que personne n'ait rien fait |
| `mentionsObligatoiresInjonction` | La requête en injonction de payer **ne peut pas être écrite** (l'évaluation, elle, fonctionne) |
| `tarifCommissaireJusticeL126` | Le module L.126 se déclare indisponible — attendu, le décret n'est pas publié |
| `tauxInteretMinimalLegal` | Impossible de refuser un taux contractuel inférieur au plancher légal |

Le code ne devine aucune de ces valeurs et **échoue bruyamment** plutôt que de retomber sur zéro.
La surveillance va plus loin : elle **déclare à l'utilisateur** que la prescription n'est pas
surveillée, parce qu'un utilisateur qui croit son délai surveillé ne le surveille pas lui-même.

### 2. Une question produit qu'il ne fallait pas trancher seul

> **Par où entrent les factures de vente ?**

Le socle sait lire des factures d'**achat** déposées en PDF ou en CSV — c'est le pipeline EGalim.
Les factures de **vente** d'un créancier ne suivent pas ce chemin : elles existent déjà dans son
logiciel de facturation ou son export comptable, propres et structurées.

Trois réponses possibles, qui donnent trois produits différents :

1. **Dépôt de fichiers**, comme EGalim — on réutilise le socle tel quel, mais on fait re-scanner à
   l'utilisateur des factures qu'il possède déjà sous forme structurée ;
2. **Import d'un export comptable** (CSV/FEC) — plus juste, très peu de travail sur le socle ;
3. **Connecteur** vers un logiciel de facturation — le plus confortable, le plus cher.

C'est cette réponse qui commande l'écriture des fonctions Convex, et c'est pourquoi elles ne sont
pas écrites. Les tables, elles, tiennent dans les trois cas.

---

## Les décisions prises seul, à ratifier

Chacune est documentée dans le code, à l'endroit où elle s'applique.

### 1. Les fonctions Convex d'EGalim n'ont pas été déplacées

`ARCHITECTURE.md` prévoyait `convex/socle/` et `convex/egalim/`. **Reporté.** Le chemin d'un fichier
Convex est son adresse d'API : le déplacer casse les tâches planifiées déjà en file, qui référencent
la fonction par son chemin, ainsi que les crons. Tant qu'on ignore s'il y a de la production, c'est
un risque pris pour du rangement. La logique pure, elle, a bien bougé — et c'est elle qui rend une
seconde verticale possible.

### 2. Aucune interface `Verticale` n'a été écrite

Elle serait taillée sur EGalim — qui classe des libellés distincts contre un référentiel mutualisé —
alors que le recouvrement qualifie une créance contre des conditions légales. Rien de commun à ce
stade. Le brief prévient lui-même contre le figeage prématuré (§ 5). En attendant, la frontière est
tenue par un **test**, pas par une convention.

### 3. Le brief se contredit sur quatre paramètres — j'ai suivi la seconde liste

L'indemnité forfaitaire, le délai de contestation L.126, le délai du procès-verbal et le délai de
signification apparaissent **à la fois** parmi les valeurs « à créer avec `value: null` » et parmi
celles « confirmées comme vérifiées ». J'ai retenu la seconde : plus spécifique, postérieure, et
porteuse d'une instruction explicite. **Un booléen suffit à revenir en arrière**, et tout ce qui en
dépend se déclarera indisponible tout seul.

### 4. Les articles sources ne sont pas cités, parce qu'ils n'ont pas été fournis

Le brief donne « 40 euros par facture » sans citer le texte. Je n'ai pas comblé de mémoire : un
numéro d'article inventé, recopié dans un courrier au débiteur, est **plus dangereux** qu'une source
absente, parce qu'il a l'air vérifiable. Chaque entrée réclame son article dans sa `note`.

### 5. La convention de calcul des intérêts n'a pas de défaut

`ACT_365` et `ACT_ACT` diffèrent de 2,74 € sur 10 000 € dès qu'une année bissextile est traversée.
L'appelant doit choisir, explicitement. Sur un portefeuille, l'écart devient une somme réclamée sans
fondement — ou abandonnée.

### 6. Les pondérations du scoring sont des hypothèses

Conditions légales 12/20, commande 3, livraison 3, CGV 1, mise en demeure 1. Seuil à 0,75, ce qui
place une facture isolée (0,60) sous la barre. Le brief demande explicitement de calibrer sur données
réelles : ces valeurs sont faites pour bouger.

### 7. Les montants du recouvrement sont des `int64`, ceux d'EGalim restent des `number`

Ce n'est pas une incohérence. EGalim produit un ratio, où l'erreur de représentation est très
inférieure au bruit de classification ; changer sa représentation maintenant serait une régression
déguisée en amélioration. Le recouvrement chiffre un acte exécutoire.

---

## Deux trouvailles hors périmètre, signalées sans être traitées

1. **`@convex-dev/agent` est un mort-vivant.** Enregistré dans `convex.config.ts`, il provisionne
   des tables et fait tourner une tâche horaire pour un support client qu'aucun écran ne consomme.
2. **`ai` et `@openrouter/ai-sdk-provider` sont mal classés.** Utilisés uniquement par
   `scripts/model-eval/**`, ils devraient être en `devDependencies`.

Ni l'un ni l'autre ne relève du remodelage. Ils sont notés ici pour ne pas se reperdre.

---

## Ce que je ferais ensuite, dans cet ordre

1. **Obtenir les deux valeurs bloquantes** — taux d'intérêt légal et délai de prescription. Sans
   elles, tout ce qui suit se construit sur un calcul qui refuse de s'exécuter.
2. **Trancher la question de l'entrée des factures** (§ 2 ci-dessus).
3. Écrire les fonctions Convex du recouvrement, une fois (2) tranché.
4. Répondre aux six inconnues restantes de l'audit — en particulier : **y a-t-il des données en
   production ?**, dont dépend le rangement des fonctions Convex d'EGalim.
5. L'interface, en dernier. Le brief a raison : un produit qui affiche joliment des dossiers
   contestables ne vaut rien.
