# ÉTAT DU REMODELAGE — au 3 septembre 2026

**Mise à jour du 3 septembre** : les trois points bloquants du 2 septembre sont levés.
Voir « Ce qui a changé le 3 septembre » en fin de document pour le détail.

Point d'arrivée de la session autonome. Ce document dit ce qui est fait, ce qui est **bloqué et sur
quoi**, et les décisions prises seul qui demandent une ratification.

À lire avec [le brief](00-brief-remodelage.md), [l'audit](AUDIT.md) et
[l'architecture](ARCHITECTURE.md).

---

## En un coup d'œil

| | Avant | 2 sept. | 3 sept. |
|---|---|---|---|
| Tests unitaires | 438 | 577 | **665** |
| Erreurs de lint | 0 | 0 | 0 (43 avertissements) |
| `bun run check` | vert | vert | vert |
| Tables Convex | 16 | 25 | 25 (9 ajoutées, **0 EGalim modifiée**) |

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
| — | Valeurs juridiques françaises | ✅ 3 sept. | `recouvrement/pays/france/` |
| — | Import (export comptable + dépôt) | ✅ 3 sept. | `recouvrement/import/`, `convex/recouvrement/import.ts` |
| — | Fonctions Convex de lecture | ⛔ non commencé | — |
| 9 | Interface | ⛔ non commencé (dernier, par construction) | — |

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

## ~~Ce qui bloquait au 2 septembre~~ — levé le 3 septembre

> **Cette section est conservée pour la trace du raisonnement.** Les deux points sont résolus :
> voir « Ce qui a changé le 3 septembre » en fin de document. Ce qui reste est plus étroit — il
> faut un avocat, pas du code.

### 1. ~~Deux valeurs juridiques manquantes~~ — relevées le 3 septembre

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

### 2. ~~Une question produit qu'il ne fallait pas trancher seul~~ — tranchée le 3 septembre

> **Par où entrent les factures de vente ?** → Les deux premiers chemins, sans le connecteur.

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

### 1. Les fonctions Convex d'EGalim n'ont pas été déplacées — **confirmé le 3 septembre**

`ARCHITECTURE.md` prévoyait `convex/socle/` et `convex/egalim/`. D'abord reporté par prudence
(le chemin d'un fichier Convex est son adresse d'API), puis **écarté sur le fond** une fois la
prudence levée : chaque verticale écrit dans ses propres tables, donc leurs mutations ne peuvent
pas être partagées. Ce qui est réellement commun est déjà dans `src/lib/socle/`, et déplacer les
fonctions ajouterait de l'indirection sans rien mutualiser.

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


---

## Ce qui a changé le 3 septembre 2026

Jules a levé les trois points en suspens. Voici ce qui a été fait, et ce que ça a révélé.

### 1. Les valeurs juridiques — relevées, et deux entrées du brief corrigées

Elles ne sont pas écrites de mémoire : relevées sur Légifrance et sources publiques concordantes,
chacune citant son article, dans `verticales/recouvrement/pays/france/`.

**Deux entrées du brief ne sont PAS des constantes**, et c'est la trouvaille de la journée.

| Le brief demandait | Ce que dit le texte |
|---|---|
| « le taux d'intérêt de retard par défaut » | Taux BCE de refinancement **+ 10 points**, réancré **deux fois par an** (L441-10 II). Une facture impayée depuis dix-huit mois traverse trois taux. |
| « le délai de prescription commerciale » | **Cinq ans** en régime général (L110-4), **mais** le texte réserve les prescriptions spéciales plus courtes et en énumère lui-même trois à un an. S'y ajoutent le transport (L133-6, un an) et la fourniture à un consommateur (L218-2 code conso, deux ans). |

Tu avais raison de dire « par secteur ».

**Face à un secteur indéterminé, le module retient le délai LE PLUS COURT**, pas le régime général.
Le sens de l'erreur n'est pas symétrique : annoncer cinq ans à qui en a un fait perdre la créance
en silence ; annoncer un an à qui en a cinq fait seulement agir trop tôt.

**Le contrôle croisé** : les douze taux d'intérêt légal sont recoupés contre les planchers publiés
indépendamment (3 × 3,71 = 11,13 ; 3 × 2,76 = 8,28 ; 3 × 2,62 = 7,86 ; 3 × 2,75 = 8,25). Une faute
de frappe casse la concordance. Un semestre absent de la série **lève en le nommant**, jamais
n'extrapole.

**Le booléen `verified` en confondait deux**, et il est maintenant dédoublé :

- `verifie` — la valeur est sourcée. Un logiciel sait le faire, et ça suffit à **calculer** :
  un chiffre affiché se corrige.
- `valideParAvocat` — un juriste a contrôlé la valeur **et son applicabilité**. C'est ce qu'exige
  `exigerPourActe()`, parce qu'un chiffre écrit dans une requête qui part au greffe ne se corrige
  pas.

Aucune protection n'est perdue : elle est déplacée là où elle mord. **Tous les paramètres sont
encore `valideParAvocat: false`** — c'est la seule case qui attend encore quelqu'un.

### 2. Les chemins d'entrée — les deux, sans le connecteur

**Import d'export comptable**, le bon chemin. Le FEC porte le plus : factures, règlements **et**
identité du débiteur par son compte auxiliaire, déjà rapprochés par la comptabilité.

Le piège y est le même que le doublon EGalim : une vente équilibrée s'écrit sur **trois** lignes —
débit client, crédit produit, crédit TVA — et additionner les trois doublerait le montant réclamé
en restant plausible. Seul le compte 411 porte ce que le client doit.

**Dépôt de fichiers**, en repli, avec son propre schéma et son propre prompt. Le TTC y est **lu**
sur la facture, jamais recomposé depuis les bases de TVA.

Les deux convergent sur une seule mutation Convex, testée par dix cas.

### 3. Les fonctions EGalim — la permission utilisée, le déplacement écarté

Le déplacement vers `convex/socle/` a été examiné puis **écarté**, parce qu'il n'apporte rien :
chaque verticale écrit dans ses propres tables (`invoiceLines` contre `facturesVente`), donc
leurs mutations ne peuvent pas être partagées. Ce qui est réellement commun est **déjà** dans
`src/lib/socle/`.

En revanche, la permission de **modifier** EGalim a servi, et pour la bonne raison :
**l'abstraction que `ARCHITECTURE.md` disait attendre du second exemple est arrivée.** L'audit
avait signalé que le schéma d'extraction disait `supplierName` et le prompt « facture
fournisseur » — une fuite du domaine dans le socle, sans moyen de la corriger utilement tant
qu'une seule verticale existait.

Le recouvrement tranche : sur une facture de vente, l'émetteur est le créancier lui-même, et le
CLIENT n'a aucun champ dans le schéma d'achat. Le socle garde donc la machinerie et la part
commune du schéma (la ligne, le pied de facture) ; l'en-tête descend dans chaque verticale.

Le verrou d'empreinte a fait son travail : **le prompt EGalim a survécu au déplacement à l'octet
près.**

### Où en sont les critères d'acceptation

Six sur sept étaient tenus le 2 septembre. Le septième — la traçabilité d'un montant jusqu'à sa
pièce — reste **partiel** : la structure est là, rien ne l'affiche encore. C'est l'interface.

### Ce qui reste

1. **Un avocat doit valider les valeurs.** Tout est sourcé, rien n'est validé : `exigerPourActe()`
   refuse encore de produire quoi que ce soit.
2. **Les mentions obligatoires de la requête** en injonction de payer restent introuvables. La
   procédure évalue, elle ne produit pas l'acte.
3. **Le décret L.126** n'est toujours pas publié.
4. **Les fonctions Convex de lecture** (listes, écrans) et l'**interface**.

---

## Les phases manquantes, terminées

Toutes les phases numérotées du brief sont livrées, interface comprise.

### Ce qui a été ajouté

| Couche | Contenu |
|---|---|
| Fonctions Convex | `depot` (import de fichiers, suivi visible), `creances`, `decompte`, `surveillance`, `lecture` |
| Écrans | `/app/recouvrement` (flux), `/app/debiteurs` (deux volets), `/app/creance/$id` (qualification + décompte), `/app/import-factures` |
| Composants | `FluxEvenements`, `Decompte` — plus deux entrées au showroom |

**714 tests**, 0 erreur de lint, `check` et `check:bundle` verts.

### Le septième critère d'acceptation est désormais tenu

> « Tout montant affiché est traçable jusqu'à sa pièce source. »

Le décompte affiche ses **périodes**, dépliables : pour chaque segment, le
principal, le taux, le nombre de jours, la base annuelle et les intérêts. Un total
qu'on ne peut pas décomposer est un chiffre qu'on demande de croire.

**Les sept critères du brief sont tenus.**

### Trois défauts trouvés en regardant, pas en testant

La règle « quatre largeurs avant de déclarer fini » a payé trois fois :

1. **`Surface` rend un conteneur interne.** Mes classes de mise en page tombaient
   sur l'enveloppe. Seize occurrences corrigées vers `contentClassName`.
2. **`gap-cladd-4xs` n'existe pas.** L'échelle s'arrête à `3xs`. Treize classes
   sans effet, exactement ce que les *pitfalls* de Cladd interdisent.
3. **La barre du showroom débordait à 768 px** depuis que j'y avais ajouté deux
   onglets.

Aucun n'était visible au typecheck ni aux tests.

### Un piège Convex qui mérite d'être connu

Une fonction appelant `internal.<son propre module>` crée un cycle d'inférence :
TypeScript retombe sur `any`, et cet `any` remonte dans le type d'`api` **tout
entier** — tous les écrans perdent leur inférence d'un coup. Dix-huit erreurs
sont apparues dans des routes EGalim qui n'avaient pas bougé. Le remède (une
annotation explicite du type de retour) est consigné dans `CLAUDE.md`.

### ⚠️ Une décision de produit reste ouverte

**La barre de navigation mélange les deux verticales** : quatre onglets EGalim,
trois de recouvrement. Un même gérant n'utilise normalement qu'un des deux, et
une barre à plat lui demande de trier sept icônes dont quatre ne le concernent
pas. La structure juste est un **sélecteur de verticale**, comme le sélecteur
d'établissement. C'est une décision de produit ; le provisoire est écrit comme
tel dans `src/app/barre.tsx`.

### Ce qui reste, et qui n'est pas du code

1. **Un avocat doit valider les valeurs relevées.** `valideParAvocat` vaut `false`
   partout, et `exigerPourActe()` refuse en conséquence de produire un acte.
2. **Les mentions obligatoires** de la requête en injonction de payer restent
   introuvables.
3. **Le décret L.126** n'est pas publié.
4. Le connecteur vers un logiciel de facturation, écarté comme « un plus ».

---

## 3 septembre 2026, second temps — EGalim est retiré

Décision de Jules : **on stoppe complètement EGalim.** Le remodelage cesse d'être une cohabitation
de verticales ; il devient un changement de produit.

### Ce qui a disparu

Soixante-dix fichiers : la verticale, ses fonctions Convex, ses sept écrans, ses composants
d'interface, ses trois e-mails, ses neuf tables. Le schéma ne garde que les tables transverses et
celles du recouvrement.

**La question du sélecteur de verticale — laissée ouverte la veille — s'est réglée toute seule.**
Il n'y a plus qu'un domaine, donc plus rien à sélectionner. La barre passe de sept onglets à trois,
et `/app` est désormais le flux de surveillance.

### Ce qui a demandé un vrai travail, pas une suppression

**La purge RGPD.** Elle visait les tables EGalim ; elle vise les onze du recouvrement, dans l'ordre
des dépendances, le fichier de stockage avant la ligne qui le référence. Son test est réécrit,
décor complet compris. Elle perd son exception : le produit épargnait `productLabels`, table
globale qui n'appartenait à personne — le recouvrement n'a pas d'équivalent, donc la purge est
totale, et un test le fige.

**La tarification.** Elle se mesurait en couverts par jour. Elle se mesure en factures émises par
an, avec les **mêmes seuils** et les **mêmes montants** : la transposition est mécanique et attend
une décision commerciale.

**La page d'accueil**, réécrite de bout en bout — héros, loi, quatre étapes, preuve, limites,
tarifs, appel, pied, métadonnées de partage. L'aperçu et les démonstrations restent les **vrais**
composants (`FluxEvenements`, `Decompte`), jamais des maquettes.

### Trois défauts que seul le regard a attrapés

Le fond du héros portait des **carottes et des poissons** — quatorze dessins OpenMoji choisis pour
un produit alimentaire. L'étape 01 montrait une cuisine professionnelle, la bande de coupure une
ligne de self.

**Rien ne les remplace, et c'est assumé.** Il n'existe pas d'imagerie du recouvrement qui ne soit
pas un cliché ; une page sans illustration vaut mieux qu'une page qui en porte une fausse. Le héros
tient par son lavis, la bande par sa typographie, et l'étape 01 montre le **bilan d'un import** —
y compris les deux lignes qu'il n'a pas su lire. `CREDITS.md` dit maintenant que rien n'est
emprunté, et pourquoi.

⚠️ **Si un jeu d'images propre au sujet est produit ou licencié, il revient dans
`marketing/bandeau.tsx` et dans le fond du héros.**

### Les trois lignes rouges ont changé avec le métier

1. On ne relance **jamais** le débiteur au nom du client (activité encadrée).
2. On ne manipule **jamais** de fonds.
3. On ne recommande **jamais** une procédure (ce serait du conseil juridique).

Le mot « garantie » reste interdit.

### Chiffres

**521 tests**, 0 erreur de lint, `check`, `check:bundle` et `build` verts. La baisse depuis 714 est
la suppression d'EGalim : aucun test survivant n'a été affaibli pour passer.

### Ce qui reste, et qui n'est toujours pas du code

1. **Un avocat doit valider les valeurs relevées** — `valideParAvocat` vaut `false` partout.
2. **Les mentions obligatoires** de la requête en injonction de payer restent introuvables.
3. **Le décret L.126** n'est pas publié.
4. **Les prix et les bornes de palier** ont été transposés, pas recalculés.
5. **L'imagerie** de la page d'accueil.

---

## Le déploiement de production, et ce qui le bloquait (3 septembre 2026)

Le premier envoi en production a échoué, et pas dans le code : dans les **données**.

`convex deploy` ne valide pas seulement ce qu'on lui pousse, il valide les documents **déjà en
base** contre le nouveau schéma, et refuse le déploiement entier si un seul ne correspond pas.

```
Document ... in table "organizations" does not match the schema:
Object contains extra field `couvertsJour` that is not in the validator.
```

Une ligne de démonstration écrite du temps de la cantine — « Chez Fernand », 1 250 couverts par
jour — a suffi à bloquer le remodelage entier.

**Ce qui ne bloquait pas, et c'est la bonne nouvelle :** les neuf tables EGalim retirées du schéma
gardent leurs documents sans gêner personne. Convex tolère une table absente du schéma ; il ne
tolère pas un champ absent du validateur.

**Le cycle est nécessairement en deux temps**, et ce n'est pas un raccourci : le nettoyage est du
code, et ce code ne peut tourner que sur un déploiement qui a réussi. Donc :

1. `schema.ts` déclare `couvertsJour` et `etablissementType` facultatifs, dans un bloc qui dit
   pourquoi et à quelle condition les retirer ;
2. `maintenance.purgerHeritageEgalim` les efface — la clé, pas seulement la valeur, et le test le
   vérifie avec `in` parce que la distinction décide si le déploiement suivant passe ;
3. une tâche planifiée l'appelle chaque jour, et elle se déclenche dès le déploiement.

Vérifié de bout en bout sur le déploiement de développement, qui portait la même ligne : poussée
acceptée, tâche déclenchée, champs disparus du document.

⚠️ **À retirer — schéma, mutation, tâche et test — dès que la mutation rapporte 0 sur deux
passages consécutifs.** C'est la seule dette de ce remodelage, et elle porte sa propre condition
d'extinction.

### La leçon, opposable au prochain changement de schéma

**Un schéma ne se relit pas contre le code, il se relit contre la base.** Retirer un champ d'un
validateur est un changement de données déguisé en changement de code : il passe `check`, `lint`,
les 521 tests et `build`, et casse au déploiement. Avant de retirer un champ, lire la forme
**inférée** des documents en production — le tableau de bord Convex la donne, table par table.
