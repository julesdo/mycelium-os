# ÉTAT DU REMODELAGE — au 11 septembre 2026

> **Mise à jour du 11 septembre.** Le document qui suit portait l'état au 3 septembre et le
> reste ci-dessous, pour la trace du raisonnement. Ce qui a changé depuis est ici.

---

## Ce qui a changé entre le 3 et le 11 septembre

|                                   | 3 sept. | 11 sept.                       |
| --------------------------------- | ------- | ------------------------------ |
| Tests unitaires                   | 665     | **835**                        |
| Erreurs de lint                   | 0       | 0                              |
| `bun run check`                   | vert    | vert                           |
| Surfaces opaques dans l'interface | —       | **0**, et une barrière l'exige |

### Le système visuel, refait sur la référence Revolut

Le verdict du terrain était sans appel : « l'app ne vaut rien et est invendable ». La cause n'était
pas les composants — elle était **derrière** eux. Un fond plat, sur lequel aucune translucidité ne
peut rien réfracter.

- **Le fond** est un shader WebGL plein écran (`ui/line-waves.tsx`, porté de React Bits en
  TypeScript), fixe, derrière tous les écrans. Deux adaptations que l'original n'a pas : la boucle
  s'arrête sous `prefers-reduced-motion` et quand l'onglet est caché.
- **Le verre, partout** : cartes, barres, champs, creux. Les champs et les creux basculent par UNE
  règle chacun, en ciblant la couche de fond interne du kit — trente appels à ne pas oublier,
  c'est ce que ce projet a déjà payé plusieurs fois.
- **La pilule blanche** remplace l'aplat d'accent sur 22 boutons. Sur un fond traversé par un
  shader bleu, un bouton bleu se fond dans son propre décor.
- **L'accessibilité a été calculée, pas choisie.** Éclaircir un fond sombre BAISSE le contraste du
  texte clair. `--cladd-fg-softest` tenait 4,58:1 — huit centièmes au-dessus du seuil AA. Il passe
  à 0,635 et tient 4,75:1 sur la zone la plus relevée.

### Les écrans

L'accueil porte désormais **un seul total** au lieu de deux à un onglet l'un de l'autre, et il est
**le même à zéro qu'à cinquante mille** : le montant s'affiche toujours, la rangée d'actions reste
complète, et ce qui manque est dit par une carte.

L'import cesse de présenter ses deux chemins **à égalité** : l'export comptable est recommandé
noir sur blanc, parce que le dépôt de PDF fait passer chaque facture par le modèle.

### La marque

L'assiette de porcelaine a disparu. Elle illustrait EGalim — « l'assiette d'achats », la base du
taux — pour un produit retiré le 3 septembre. La nouvelle est une **étiquette au coin coupé**
portant un L, identique du favicon 16 px à l'icône iOS 180 px. Le logo **est** le bouton
d'accueil ; l'avatar prend sa place en haut à gauche.

### Module 2.3 — le scoring comportemental ✅

Le seul module du MVP encore débloqué et non construit. Il détecte la **rupture d'habitude**
plutôt qu'un seuil absolu, parce qu'un seuil traite de la même façon deux situations opposées :
le client qui paie toujours à 65 jours (rien ne se passe, l'alerte est du bruit) et celui qui paie
toujours à 8 et vient de passer à 35 (sous le seuil, donc muet — alors que c'est le signal le plus
fort du produit).

Médiane et écart absolu médian, jamais moyenne ni écart-type : un seul litige ancien réglé à
300 jours écraserait l'habitude réelle. Quatre règlements minimum, sinon le module se tait.

Il remonte dans le flux, et **remplace** l'événement d'échéance de sa facture — défaut vu à
l'écran, pas en test : la même facture sortait deux fois.

---

## Ce qui reste, et ce qui bloque

| Module                             | État                      | Bloqué sur                              |
| ---------------------------------- | ------------------------- | --------------------------------------- |
| 1.1 Ingestion par e-mail dédié     | à construire              | **Jules** — choix du fournisseur et DNS |
| 1.2 Extracteur IA des preuves      | socle existant, à étendre | —                                       |
| 1.3 Normalisation SIRET (Sirene)   | à construire              | **la clé d'API**, une démarche          |
| 1.4 Lettrage dégradé               | ✅                        | —                                       |
| 2.1 Battement quotidien            | ✅                        | —                                       |
| 2.2 Radar BODACC                   | ✅                        | —                                       |
| 2.3 Scoring comportemental         | ✅                        | —                                       |
| 3.1 Relances asymétriques          | à construire              | **le juriste**                          |
| 3.2 Questionnaire de litige        | à construire              | —                                       |
| 4.2 Solidité documentaire          | partiel                   | —                                       |
| 4.5 Machine à états post-procédure | à construire              | —                                       |

**Et le plus long piquet n'a pas bougé** : `valideParAvocat` vaut toujours `false` sur les quinze
entrées du registre. Rien de ce qui produit un acte ne peut sortir, quoi qu'on code. Ce n'est pas
une lenteur, c'est une signature humaine.

### Les quatre points qui attendent une décision

1. Le plugin `admin()` de Better Auth reste monté : ses points d'entrée HTTP sont servis pour un
   compte `role: 'admin'`, et l'usurpation contournerait la vérification d'appartenance. Le
   retrait touche au schéma du composant — à faire avec quelqu'un présent.
2. La clé de l'API Sirene.
3. `valideParAvocat` sur les quinze entrées.
4. Jusqu'où l'indemnité forfaitaire et les intérêts restent réclamables sur une facture dont le
   principal a déjà été payé. Restreinte aux seuls impayés, la révélation garde sa force ; la
   réponse change son amplitude.

---

## L'état au 3 septembre — conservé pour la trace

Point d'arrivée de la session autonome. Ce document dit ce qui est fait, ce qui est **bloqué et sur
quoi**, et les décisions prises seul qui demandent une ratification.

À lire avec [le brief](00-brief-remodelage.md), [l'audit](AUDIT.md) et
[l'architecture](ARCHITECTURE.md).

---

## En un coup d'œil

|                 | Avant | 2 sept. | 3 sept.                                |
| --------------- | ----- | ------- | -------------------------------------- |
| Tests unitaires | 438   | 577     | **665**                                |
| Erreurs de lint | 0     | 0       | 0 (43 avertissements)                  |
| `bun run check` | vert  | vert    | vert                                   |
| Tables Convex   | 16    | 25      | 25 (9 ajoutées, **0 EGalim modifiée**) |

**Aucune régression sur EGalim.** Aucun test n'a été réécrit pour accommoder un déplacement, aucune
table existante n'a été touchée, aucune migration n'est nécessaire.

---

## Ce qui est livré, phase par phase

| Phase | Objet                             | État                                        | Où                                                      |
| ----- | --------------------------------- | ------------------------------------------- | ------------------------------------------------------- |
| 0     | Audit du code existant            | ✅                                          | [AUDIT.md](AUDIT.md)                                    |
| 1     | Séparation socle / verticale      | ✅                                          | `src/lib/socle/`, `src/lib/verticales/`                 |
| 2     | Modèle de domaine                 | ✅ tables                                   | `src/lib/convex/recouvrement/tables.ts`                 |
| 3     | Calcul financier                  | ✅                                          | `socle/montants.ts`, `recouvrement/decompte.ts`         |
| 4     | Moteur de qualification           | ✅ version simple                           | `recouvrement/scoring.ts`                               |
| 5     | Procédures modulaires             | ✅ 3 modules                                | `recouvrement/procedures.ts`                            |
| 6     | Surveillance                      | ✅                                          | `recouvrement/surveillance.ts`                          |
| —     | Valeurs juridiques françaises     | ✅ 3 sept.                                  | `recouvrement/pays/france/`                             |
| —     | Import (export comptable + dépôt) | ✅ 3 sept.                                  | `recouvrement/import/`, `convex/recouvrement/import.ts` |
| —     | Fonctions Convex de lecture       | ⛔ non commencé                             | —                                                       |
| 9     | Interface                         | ⛔ non commencé (dernier, par construction) | —                                                       |

---

## Les critères d'acceptation du brief, et ce qui les prouve

Le § 10 du brief liste sept critères. Six sont tenus et **vérifiés par un test qui échoue si la
propriété disparaît** — pas par une relecture.

| Critère                                                            | État           | Ce qui le prouve                                                                                        |
| ------------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------- |
| La verticale EGalim fonctionne toujours                            | ✅             | 111 tests EGalim, aucun réécrit ; 438 → 577 sans perte                                                  |
| Aucune valeur juridique en dur hors du fichier de paramètres       | ✅             | `parametres.test.ts` — structure, source et date sur chaque entrée                                      |
| Aucun paramètre `verified: false` utilisable sans erreur explicite | ✅             | `exiger()` lève ; 4 tests dédiés                                                                        |
| Le même dossier rejoué donne le même résultat au centime           | ✅             | `decompte.test.ts` — aucune lecture d'horloge, date d'arrêté en argument                                |
| Une créance incomplète bloque la génération de l'acte              | ✅             | `controle.test.ts` — 8 tests, message qui chiffre l'abandon                                             |
| Une procédure s'ajoute sans toucher au socle                       | ✅             | `frontiere.test.ts` — le socle ne peut importer ni `verticales/` ni `convex/`                           |
| Tout montant affiché est traçable jusqu'à sa pièce source          | 🟡 **partiel** | Les `segments` portent la traçabilité et le contrôle la rend obligatoire ; **rien ne l'affiche encore** |

---

## ~~Ce qui bloquait au 2 septembre~~ — levé le 3 septembre

> **Cette section est conservée pour la trace du raisonnement.** Les deux points sont résolus :
> voir « Ce qui a changé le 3 septembre » en fin de document. Ce qui reste est plus étroit — il
> faut un avocat, pas du code.

### 1. ~~Deux valeurs juridiques manquantes~~ — relevées le 3 septembre

| Paramètre                        | Sans lui                                                                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `tauxInteretLegalDefaut`         | **Aucun décompte** n'est calculable sur une facture dont les CGV ne stipulent pas de taux — c'est-à-dire la majorité       |
| `delaiPrescriptionCommerciale`   | La prescription **n'est pas surveillée**. C'est la seule échéance qui éteint une créance sans que personne n'ait rien fait |
| `mentionsObligatoiresInjonction` | La requête en injonction de payer **ne peut pas être écrite** (l'évaluation, elle, fonctionne)                             |
| `tarifCommissaireJusticeL126`    | Le module L.126 se déclare indisponible — attendu, le décret n'est pas publié                                              |
| `tauxInteretMinimalLegal`        | Impossible de refuser un taux contractuel inférieur au plancher légal                                                      |

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

| Le brief demandait                         | Ce que dit le texte                                                                                                                                                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| « le taux d'intérêt de retard par défaut » | Taux BCE de refinancement **+ 10 points**, réancré **deux fois par an** (L441-10 II). Une facture impayée depuis dix-huit mois traverse trois taux.                                                                                                           |
| « le délai de prescription commerciale »   | **Cinq ans** en régime général (L110-4), **mais** le texte réserve les prescriptions spéciales plus courtes et en énumère lui-même trois à un an. S'y ajoutent le transport (L133-6, un an) et la fourniture à un consommateur (L218-2 code conso, deux ans). |

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

| Couche           | Contenu                                                                                                                           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Fonctions Convex | `depot` (import de fichiers, suivi visible), `creances`, `decompte`, `surveillance`, `lecture`                                    |
| Écrans           | `/app/recouvrement` (flux), `/app/debiteurs` (deux volets), `/app/creance/$id` (qualification + décompte), `/app/import-factures` |
| Composants       | `FluxEvenements`, `Decompte` — plus deux entrées au showroom                                                                      |

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
   sans effet, exactement ce que les _pitfalls_ de Cladd interdisent.
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

**534 tests**, 0 erreur de lint, `check`, `check:bundle` et `build` verts. La baisse depuis 714 est
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

---

## Les restes d'EGalim que la relecture n'avait pas vus (3 septembre 2026)

Le premier passage avait réécrit les textes ; il en restait quatre, dont deux servis en
production.

**1. La page d'accueil parlait encore de carottes.** L'exergue de la section « Ce que la loi vous
doit » disait mot pour mot : « "Local", "circuit court", "de saison" et "fait maison" ne comptent
pas », suivi de « la carotte du maraîcher d'à côté ». C'était en ligne sur un site de recouvrement.
Le balayage de vérification du déploiement cherchait « EGalim », « cantine », « bio », « durable » —
pas « carotte ». Remplacé par le fait le plus surprenant du domaine : **une facture de transport se
prescrit en un an, pas en cinq** (L133-6, sourcé dans le module France).

**2. Les trois chiffres de la loi étaient recopiés à la main.** « 12,40 % », « 40 € », « 5 ans »
étaient écrits en dur dans le composant, à côté d'une citation « art. L441-10 et L110-4 » elle
aussi manuelle. Le taux se réancre DEUX FOIS PAR AN : la page annonçait un chiffre que le produit
aurait cessé de calculer, à l'endroit exact qu'on lit avant d'acheter. Les trois viennent
maintenant du registre et du module France, et la référence d'article est extraite de la source du
paramètre. Si le taux du semestre n'est pas publié, la page affiche la RÈGLE — « BCE + 10 pts » —
plutôt que de tomber.

**3. L'écran d'entrée demandait un type d'établissement et des couverts par jour… puis les
jetait.** Ni l'un ni l'autre n'était envoyé à `createOrganization`. Remplacés par le volume de
factures par an, qui part vraiment et détermine le palier d'abonnement.

**4. L'écran d'abonnement mentait sur son propre chiffre.** Il interpolait `facturesParAn` sous le
libellé « couverts par jour déclarés ».

### Deux garde-fous écrits, parce que deux règles n'existaient qu'en prose

`CLAUDE.md` affirmait depuis le premier jour qu'« un test balaie toute l'interface » à la recherche
du mot « garantie ». **Ce test n'existait pas.** Une règle qu'aucun code ne tient est pire que pas
de règle : on cesse de la vérifier à la relecture.

- `src/lib/__tests__/mots-interdits.test.ts` — balaie écrans, page publique et courriels.
- `src/lib/verticales/recouvrement/__tests__/valeurs-juridiques.test.ts` — interdit toute référence
  d'article hors du registre et des modules `pays/`. C'est ce test qui aurait attrapé le point 2.

Les deux retirent les commentaires avant de chercher (`source-lisible.ts`) : un test qui ne peut pas
se documenter finit contourné. Les deux portent une **contre-épreuve** — une chaîne délibérément
fautive qu'ils doivent signaler — parce que « aucune occurrence » et « le détecteur ne détecte
rien » sont autrement indiscernables. Et les deux disent ce qu'ils NE voient pas : un délai écrit
`5` sans citation leur échappe.

### Un défaut de mise en page qui durait depuis le début

Mesuré au navigateur : « 12,40 % » demandait 418 pixels dans une colonne de 395 et retombait en
deux lignes sous un `leading-none`, **à toutes les largeurs à trois colonnes**. Six pour cent de
trop, invisibles à la lecture du code. `--text-seuil-affiche` passe de `clamp(56px, 9vw, 132px)` à
`clamp(52px, 8.2vw, 124px)`, borne calculée sur 1024 px — la plus étroite des largeurs à trois
colonnes, donc celle qui décide. Vérifié à 375, 768, 1024 et 1280 : une ligne partout, aucun
débordement.

### Ce qui n'a PAS pu être vérifié à l'œil, et pourquoi

**`/bienvenue` est hors du showroom.** L'écran est derrière `<Authenticated>`, et le showroom ne
rend que des composants de `src/screens/`. Sa réécriture est couverte par les types et par la
relecture, pas par le regard — contrairement à la règle d'écran n° 3. Le porter dans
`src/screens/bienvenue/` le rendrait vérifiable ; ce n'est pas fait.

⚠️ **`bun run dev` ne démarre pas sur cette machine** : il lance un backend Convex local qui
échoue sur `spawn unzip ENOENT`. Sans backend, tout écran authentifié reste bloqué sur « Ouverture
de votre espace… ». **`bun run dev:cloud` fonctionne** — il vise le déploiement de développement
distant et n'a pas besoin du backend local.

### Ce qui reste EGalim et demande un arbitrage, pas une correction

**Le logo est une assiette de porcelaine.** `src/ui/logo.tsx` dessine un cercle de faïence avec son
trait de bord ; les commentaires du code parlent d'« assiette ». C'est la marque, pas un texte : ça
se décide, ça ne se corrige pas au passage.

### Le balayage à la main était trop étroit — les courriels parlaient encore de bio

Les deux passages précédents cherchaient « EGalim », « cantine », « bio », « durable » dans la page
servie. Un balayage **systématique** du code rendu — commentaires retirés, sur un lexique large — a
trouvé ce que l'œil avait laissé, et c'était le pire endroit :

**Le pied de page de TOUS les courriels** disait « Letikette mesure votre taux de produits durables
et biologiques […] La télédéclaration sur "ma cantine" reste établie et signée par votre
établissement ». Il énonce maintenant le métier et les trois lignes rouges : la mesure, la
surveillance, le décompte — et les relances, procédures et encaissements « conduits par votre
entreprise ou par le professionnel qu'elle mandate ».

**Le courriel d'invitation** portait une phrase à moitié réécrite, donc fausse des deux côtés :
« Letikette mesure les créances impayées d'une entreprise de restauration collective […] : la part
de produits durables, la part de bio ». C'est le premier texte que lit un nouvel utilisateur.

**L'écran de connexion** promettait « vos taux, vos factures et vos diagnostics ». **Le bandeau
d'essai** listait « les trois taux […] et le fichier de télédéclaration ».

Après correction, le balayage ne rend plus que sept lignes, toutes fausses positives du lexique :
« messageRIE », « REPASser en membre », et « couverts » au sens de couvrir.

⚠️ **La leçon, et elle vaut pour le prochain changement de nom** : vérifier une réécriture en
cherchant les mots qu'on se rappelle avoir écrits ne trouve que ceux-là. Il faut balayer le code
rendu sur un lexique large et trier les faux positifs — l'inverse laisse passer exactement ce qu'on
a oublié.

### La dette du déploiement est retirée le jour même

Le contournement décrit plus haut — deux champs déclarés facultatifs, une mutation de purge, une
tâche planifiée — **n'existe plus.** Sa condition d'extinction est remplie, et elle a été vérifiée
sur les données plutôt que sur un compteur :

- **Production** : `couvertsJour` et `etablissementType` sont absents de la forme inférée de
  `organizations`, c'est-à-dire de TOUS les documents de la table. Les tables de recouvrement y
  sont déclarées.
- **Développement** : mêmes constats, purge observée en direct.

La tâche planifiée s'était déclenchée dès le déploiement réussi, et avait nettoyé la ligne avant
même qu'on la lui demande. Les deux champs, `maintenance.ts`, la tâche et son test sont supprimés ;
`schema.ts` revient à un `organizations` qui ne décrit que le produit actuel.

**534 tests** — deux de moins, ceux du code retiré. Aucun test survivant n'a été affaibli.

---

## Le battement quotidien — le produit ne dort plus (3 septembre 2026)

Jusqu'ici le moteur calculait juste et refusait de mentir, mais **il ne faisait rien tout seul** : la
surveillance se calculait quand on ouvrait l'écran. Il n'avait ni yeux, ni bras, ni pouls.

Le pouls existe. Un cron quotidien à six heures UTC planifie **un travail par organisation**,
recalcule l'état des créances, décide s'il y a quelque chose à dire, envoie un briefing du matin —
ou se tait.

### Les quatre règles que le code tient, et qui sont des décisions produit

**Le silence est un résultat, pas une panne.** On parle sur un point critique, une nouveauté, ou
sept jours de silence. Sinon on se tait. Un outil qui crie tous les matins se fait filtrer en trois
semaines ; la rareté de l'alarme est ce qui la fait obéir.

**Un briefing envoyé deux fois détruit plus de confiance qu'un briefing manquant.** La clé
(organisation, jour) refuse le rejeu — vérifiée avant chaque écriture, l'index ne garantissant rien
par lui-même.

**Un échec silencieux est le pire état du produit.** Un gérant qui se croit surveillé alors que le
battement plante depuis six jours ne surveille pas lui-même, et perdra une créance en croyant être
couvert. L'échec s'affiche donc dans SON interface, pas dans un journal.

**Le briefing part vers le client, jamais vers le débiteur.** Les destinataires se lisent dans
`organizationMembers` et nulle part ailleurs.

### Ce que les revues ont trouvé, et qui valait le détour

Neuf tâches, chacune relue deux fois. Les revues n'ont pas produit du style, elles ont produit des
défauts.

**Le tri d'événements existait déjà.** `composerBriefing` en avait recopié un, et la copie avait
perdu le départage par référence. Deux factures de même montant et même urgence auraient fait
changer la tête du briefing au hasard de l'ordre d'arrivée. Il n'existe désormais qu'un
`comparerEvenements`, dans `surveillance.ts`.

**Une phrase pouvait se répéter dans le courriel.** La garde était posée sur la POSITION — prendre
le deuxième événement. Or c'est du TEXTE qui part : deux dossiers au même libellé d'étape et à la
même date limite produisent une explication identique au caractère près. La déduplication porte
maintenant sur le texte, et le relecteur l'a prouvé en construisant le cas.

**L'ordre envoi/insert n'était pas anodin.** `resend.sendEmail` écrit dans la même transaction. Avec
l'insert du succès en premier, un échec d'envoi laissait DEUX relevés pour le même jour — et le
`.unique()` du contrôle de non-rejeu cassait alors ce jour définitivement. On envoie avant
d'enregistrer : un échec laisse un seul relevé, ou aucun.

**Une lecture non bornée menait à un échec quotidien garanti.** `precedentDe` lisait tout
l'historique — 1 095 documents par nuit à trois ans, 3 650 à dix. L'index descendant borne la
lecture au nombre de nuits en échec consécutives, plus une.

### Deux trous venaient du plan, pas de l'exécution

**La purge RGPD.** Le mot « rgpd » n'apparaissait dans aucune des neuf tâches. La table `battements`
aurait survécu, orpheline, à la suppression d'un établissement — le produit violant sa propre règle,
écrite en tête de `rgpd.ts` : « rien n'est mutualisé, donc rien n'est épargné ». **Toute tâche qui
ajoute une table cloisonnée doit l'ajouter à la purge et à l'export DANS LA MÊME TÂCHE.**

**La liste des tables écrite en dur.** `tables.test.ts` refusait `battements` depuis la tâche 4, et
personne ne l'a vu parce qu'on ne lançait que les tests ciblés. Le test faisait exactement son
travail. **On lance la suite complète après chaque tâche.**

### Un courriel affirmait quelque chose de faux

Le gabarit annonçait le montant avec la précision « intérêts de retard courus inclus ». En remontant
la chaîne : `montantExigible` vaut `depuisCentimes(facture.montantTTC)` — **le principal, et rien
d'autre**. Ni intérêts, ni indemnité forfaitaire.

Sur un produit dont l'argument entier est l'exactitude, un chiffre juste sous une étiquette fausse
est pire qu'un chiffre absent. La précision dit maintenant « somme des montants en jeu sur les points
ci-dessous ».

⚠️ **Et ce chiffre a un défaut plus profond, non corrigé** : il additionne des grandeurs qui se
recouvrent. Une facture, la créance qui la contient et l'encours de son débiteur peuvent être comptés
trois fois. C'est le chiffre le plus visible du produit — il s'affiche en gros sur l'écran d'accueil
et part désormais par courriel. **À traiter avant tout usage commercial.**

### Chiffres

**588 tests**, 0 erreur de lint, `check`, `check:bundle`, `check:vercel` et `build` verts. Le cron
`battementQuotidien` est poussé sur le déploiement de développement.

### Ce qui reste ouvert

1. **Le montant identifié compte plusieurs fois la même somme** (ci-dessus).
2. **Les dates ne sont pas validées à l'import.** Une `dateEcheance` mal formée traverse la
   validation Convex et casse le calcul de prescription — une seule ligne abîmée met en échec la
   surveillance de toute l'organisation. Le battement l'attrape et l'affiche, mais la cause reste.
3. **Trois tables échappent à la purge RGPD** : `emailEvents` (peut contenir une adresse dans son
   payload), `adminAuditLogs` (reliquat du modèle de rôle staff), `passkey` (inerte aujourd'hui).

---

## 9 septembre 2026 — les trois points ouverts sont fermés, et le produit d'appel existe

### Les dates, durcies de bout en bout

`^\d{4}-\d{2}-\d{2}$` acceptait `2026-13-45` et `2026-02-30`. C'était la seule vérification faite sur
une date, à cinq endroits, et les conséquences allaient du silence à la panne générale.

- `ajouterMois('2026-13-01', 1)` rendait `2027-02-01` — le mois 13 reporté sur l'année suivante par
  l'arithmétique en mois absolus. Aucune erreur, une date fausse.
- `ajouterMois('2026-02-30', 0)` rendait `2026-02-28` — deux jours de prescription rabotés, sans un mot.
- `instant()` dans `decompte.ts` s'appuyait sur `Number.isNaN(Date.parse(…))`, **qui ne mord pas sur le
  moteur de bun** : `2026-02-30` y roule sur le 2 mars. C'est le seul endroit du produit où une date
  fausse se transforme en EUROS — deux jours d'intérêts en moins sur une somme réclamée.
- Et la panne : une date impossible traversait la validation Convex (c'est une chaîne) puis faisait
  lever le calcul de prescription. `assembler` boucle sur TOUTES les factures : **une seule ligne
  abîmée éteignait la surveillance entière.**

`estDateReelle` vit désormais dans `calendrier.ts`, une seule fois, avec la règle bissextile que
`decompte.ts` dupliquait. Les trois portes d'entrée la posent. `prescriptionDe` ne lève plus jamais et
choisit le meilleur point de départ exploitable. Une facture inexploitable devient un **angle mort
nommé**, et les autres continuent d'être surveillées.

Au passage, une erreur plus ancienne : le message d'angle mort accusait le secteur — « leur secteur
n'est pas déterminé, donc la date n'a pas pu être calculée ». C'était faux depuis le premier jour. Un
secteur indéterminé ne fait pas disparaître la date, il fait retenir le délai le plus court en le
déclarant. Il y a deux motifs, et ils appellent deux gestes différents.

### Quatre portes dormantes, fermées

Aucune n'était exploitée. Toutes étaient des capacités sans contrepartie sur un produit qui détient
les impayés de ses clients.

1. **Le cloisonnement multi-tenant reposait sur une convention.** `organisationCourante` relisait
   `userProfiles.currentOrganizationId` et le rendait tel quel — ce champ décidait à lui seul quelles
   factures un compte peut lire. `switchOrganization` vérifiait l'appartenance, mais
   `platformSwitchOrganization`, gardée par le rôle `admin` hérité de Fleet, la contournait EXPRÈS.
   L'appartenance se vérifie désormais **au point de lecture**, et un test balaie tous les fichiers
   Convex pour qu'aucun ne relise le champ à la main — même dispositif que `frontiere.test.ts`.
2. **La surface d'administration de Fleet était encore publique** : bannir, révoquer, changer un rôle,
   usurper une identité. Aucun écran ne les appelait ; `adminAuditLogs` était **vide en production**,
   vérifiée avant retrait. `admin/` part en entier, avec la table et les gardes.
3. **`passkey` survivait à son compte.** `oublierIdentite` retirait `session` et `account` seulement.
   Restaient une clé publique, un identifiant de justificatif et le nom de l'appareil. Le test ne
   vérifie pas la liste mais l'INVARIANT : tout modèle Better Auth portant un `userId` doit y figurer.
   Les vérifications en cours, qui portent l'ADRESSE, partent aussi.
4. **`emailEvents` gardait tout, pour personne.** La charge utile complète de chaque webhook Resend —
   destinataire, copies, objet, en-têtes — indéfiniment, dans une table que rien ne relisait. On
   n'écrit plus que l'envoi, le type et le moment ; un cron quotidien supprime au-delà de 90 jours.

**Et une fuite de revenu, trouvée en chemin.** `activateDevPlan` accordait le plan complet et 9 999
sièges, sans aucun garde : une simple mutation authentifiée, exposée en production.

### Le choc du premier import (plan 2)

`verticales/recouvrement/revelation.ts` — la règle pure, sans une ligne de calcul réécrite.

- **`reveler`** — le principal d'un côté, le SUPPLÉMENT de l'autre : intérêts de retard et indemnité
  de 40 € par facture, dus de plein droit et jamais calculés. L'indemnité se compte PAR FACTURE.
- **`interetsCourusEntre`** — le compteur vivant. Nommé ainsi délibérément : une « montée » se lirait
  comme la variation du total, qui inclut le principal d'une facture venant d'échoir.
- **`bilanDesPertes`** — ce qui s'est éteint avant nous, et sous surveillance. Le second chiffre est
  l'aveu d'un échec du produit et s'affiche quand même.

La couche Convex croise le bilan avec l'état du battement : **si le battement a échoué un seul jour de
la période, le compteur refuse d'affirmer quoi que ce soit.** Une phrase fausse à cet endroit est pire
que pas de compteur, parce qu'elle rassure exactement quand il ne faut pas.

L'écran vit sur sa propre route, « Ce qui est dû ». Le plan le posait en tête du flux ; le flux porte
déjà un total, et deux totaux côte à côte se lisent comme une contradiction.

### Chiffres

**686 tests**, 0 erreur de lint, `check` et `build` verts. Schéma validé sur le déploiement de
développement. Écrans relus aux quatre largeurs, mesures DOM à l'appui : aucun débordement.

### Ce qui reste ouvert

1. **Le greffon `admin()` de Better Auth est toujours monté.** Ses points d'entrée HTTP restent servis
   pour un compte portant `role: 'admin'`, et l'usurpation contourne alors la vérification
   d'appartenance — la session DEVIENT l'utilisateur cible. Plus aucun chemin du produit ne peut
   accorder ce rôle, mais un compte déjà seedé en production le garderait. Le retrait touche au schéma
   du composant Better Auth, dont la régénération est fragile : **à faire en présence de quelqu'un.**
2. **`valideParAvocat` vaut `false` sur les quinze entrées du registre.** Rien qui produise un acte ne
   peut sortir, quoi qu'on code. C'est une signature humaine, et le plus long piquet du plan.
3. **La question du juriste sur la révélation** : jusqu'où l'indemnité et les intérêts restent
   réclamables sur une facture dont le principal a déjà été payé. La révélation se limite aux impayés
   en attendant — le périmètre le plus étroit, donc le seul défendable.

---

## 9 septembre 2026, suite — les registres externes, et le prérequis qu'ils cachaient

### Ce que la lecture du plan 3 a révélé avant d'écrire une ligne

Le radar BODACC s'interroge **par SIREN**. La colonne existait en base depuis le premier jour, elle
était lue à l'écran — et **rien ne l'écrivait jamais**. Construire le radar d'abord aurait produit un
écran qui tourne dans le vide, et le défaut ne se serait vu qu'en production, sur les données d'un
client.

Et un rapprochement par raison sociale est hors de question : sur un flux national de plusieurs
millions d'annonces, il finit par annoncer à un gérant que son client solvable est en liquidation.
C'est la faute symétrique de la relance d'un client qui a déjà payé, et elle coûte plus cher — elle
fait cesser des livraisons.

### Le SIREN, de bout en bout

- `pays/france/siren.ts` — neuf chiffres, clé de Luhn, vérifiée contre **trois SIREN réels** relevés
  au BODACC. Un test permute les 81 altérations d'un chiffre et vérifie que la clé les attrape toutes.
- Relevé à l'extraction (schéma + prompt, avec la consigne explicite de ne jamais prendre celui de
  l'émetteur), et persisté à l'import.
- **Saisi par le gérant**, la seule voie qui ne dépend d'aucune clé API. Avec l'effacement, parce
  qu'un numéro faux mais bien formé désigne une AUTRE entreprise — et un « aucune procédure » sur le
  mauvais SIREN se lit comme un feu vert.

Deux décisions écrites dans le code : le rapprochement ne change **pas** de clé (basculer sur le SIREN
fusionnerait ou scinderait des débiteurs selon la couverture du champ), et un SIREN déjà connu ne se
fait **pas** écraser.

### Le secteur, enfin saisissable

La surveillance déclarait « préciser le secteur lèvera cette hypothèse » depuis des mois, la liste des
débiteurs affichait une puce « Secteur à préciser » — et **aucune mutation ne permettait de le
préciser**. Une consigne impossible à suivre est pire qu'aucune consigne. La durée de prescription
s'affiche sous chaque option, lue dans le registre juridique et jamais recopiée dans un libellé.

### Le radar de solvabilité

Quatre heures UTC, **avant** le battement de six heures : le briefing doit porter ce que la nuit a
trouvé. Il lit la veille, pas le jour même — le BODACC publie au fil de la journée.

**Il cite la taxonomie du registre, il ne lit pas le droit.** Toutes les annonces « Procédures
collectives » ne disent pas qu'une entreprise est insolvable : un jugement d'interdiction de gérer vise
une PERSONNE. On retient le champ que le BODACC remplit lui-même, `jugement.famille` ; pour tout le
reste le constat s'affiche VERBATIM sans que l'état ne bouge. Et **on ne classe que dans un sens** :
aucune annonce ne ramène un débiteur à `SAINE`.

`debiteurs.by_siren` est le **seul index du produit qui ne commence pas par `organizationId`**, parce
que le delta est national et que deux clients peuvent suivre le même débiteur. Un test balaie les
fichiers Convex et échoue si un fichier qui le nomme expose une fonction authentifiée.

**L'exception au multi-tenant que le blueprint annonçait n'a pas été prise.** Le delta est récupéré une
fois, appliqué, jeté. Aucune table hors organisation, aucune ligne à ajouter à la purge.

### Réparé au passage

`DEBITEUR_DEGRADE` était déclaré et testé depuis le premier jour, et l'assemblage rendait la liste
vide **en dur** : un type d'événement que rien ne pouvait déclencher. Le radar historise
`santePrecedente`, et la dégradation remonte enfin — avec l'encours en jeu, sans jamais entrer dans le
montant identifié.

### Chiffres

**745 tests**, 0 erreur de lint, `check` et `build` verts. Schéma validé sur le déploiement de
développement, production déployée et verte.

### Ce qui reste ouvert

1. **La clé API Sirene**, toujours pas obtenue. Elle ne bloque QUE le rattrapage automatique du SIREN
   des débiteurs déjà en base ; la saisie manuelle et l'extraction fonctionnent sans elle.
2. **Le greffon `admin()` de Better Auth** est toujours monté (voir la section du 9 septembre
   ci-dessus). À retirer en présence de quelqu'un.
3. **`valideParAvocat` vaut `false` sur les quinze entrées du registre.** Rien qui produise un acte ne
   peut sortir, quoi qu'on code.
4. **Le coupe-circuit ne coupe rien**, faute de relances à suspendre. C'est le plan 6.

---

## 9 septembre 2026, fin de journée — le décompte devient une pièce

### Le troisième critère de fin de MVP, celui qui était bloqué par du code

`01-FRONTIERE-MVP.md` en pose trois. Le premier est atteignable dès aujourd'hui avec le dépôt de
fichiers ; le deuxième demande un client réel qui reçoive sept briefings d'affilée. **Le troisième —
« un décompte sort du produit et part chez un tiers sans être retouché » — était le seul que du code
pouvait débloquer**, et le blueprint le dit « le plus dur et le plus important : celui qui prouve que
le décompte est une pièce, et pas un écran ».

La pièce porte :

- **les deux identités, FIGÉES avec le chiffre.** Sans ce gel, une pièce rééditée six mois plus tard
  porterait le nom que le débiteur a _aujourd'hui_ — après un changement de dénomination ou une
  fusion — et ne dirait plus ce qu'elle disait le jour de son émission. Elle ne serait pas opposable ;
- **les périodes d'intérêts**, avec taux, jours et base annuelle. C'est par elles que le destinataire
  refait le calcul, et c'est exactement ce que fera le débiteur qui conteste ;
- **les fondements tirés du registre.** Aucun numéro d'article n'est écrit dans le gabarit, et un test
  relève les articles cités dans la pièce pour les confronter à `PARAMETRES` ;
- **ce que le décompte NE COUVRE PAS**, chiffré — et dit même quand la réponse est « rien », le
  silence se lisant comme « on n'a pas regardé » ;
- **l'avertissement** : ce n'est pas une mise en demeure et ça ne fait courir aucun délai. Un avocat
  qui le prendrait pour un acte calculerait la suite de la procédure sur une date fausse.

La règle est pure et testée sans harnais PDF ; jsPDF ne fait que poser des lignes.

### Deux modules écrits, testés, et injoignables

C'est devenu un motif de la semaine, et il mérite d'être nommé.

1. **`controlerDecompte`** chiffrait les abandons depuis longtemps — aucune requête ne l'appelait.
2. **`profilsCreancier`** était lue par la production de décompte ET par la qualification de créance —
   rien ne l'écrivait. Et celui-là ne coûtait pas qu'un en-tête : `creancierCommercant` valait
   **toujours** `unknown`, donc `entreCommercants` aussi, donc **l'éligibilité à l'injonction de payer
   ne pouvait jamais être acquise**. Le produit annonçait une condition non remplie que rien ne
   permettait de remplir.

Avec `DEBITEUR_DEGRADE` et le SIREN du débiteur, cela fait **quatre** en une semaine. La leçon est
qu'un champ déclaré et lu n'est pas un champ alimenté, et que rien dans le typage ne le dit.

### Ce que seule la relecture du PDF a révélé

Le PDF a été rendu puis son texte **ré-extrait avec `unpdf`**, pas seulement testé unitairement. Deux
défauts qu'aucune assertion n'aurait attrapés :

- le titre disait « arrêté au 2026-09-01 » — un export de machine sur un document destiné à un avocat ;
- le nom du fichier tirait sa date du **titre**, par expression régulière. Tirer une donnée d'une
  chaîne d'affichage marche jusqu'au jour où l'on retouche l'affichage. Ce jour était le même.

### Chiffres

**782 tests**, 0 erreur de lint, `check` et `build` verts, schéma validé sur le déploiement de
développement, production déployée.

### Ce qui reste sur ce critère, et qu'aucun test ne dira

**Un expert-comptable lit-il cette pièce sans poser de question ?** Il faut la faire lire à un vrai.
C'est le genre de vérification qu'aucun agent ne remplace.

---

## 11 septembre 2026 — trois modules du blueprint, et dix défauts d'une même famille

### Ce qui a été construit

**3.2 — Questionnaire de qualification de litige.** L'écran de créance demandait
littéralement « Pouvez-vous confirmer le caractère certain de cette créance ? ».
C'est une notion de droit, posée à quelqu'un dont ce n'est pas le métier, et
dont la réponse ouvre des procédures sans débat où la moindre contestation met
fin à tout en laissant les frais engagés. On recueille désormais six **faits** —
le client a-t-il écrit pour contester, refusé la livraison, réclamé un avoir,
opposé des pénalités, une instance est-elle en cours, a-t-il reconnu la dette.
Le critère `certaine` s'en déduit.

**4.5 — Machine à états post-procédure.** Le produit savait dire qu'un dossier
était parti, et plus rien après. `statut: 'ENGAGEE'` ne disait ni quelle
procédure ni depuis quand. L'état se **rejoue** depuis un journal d'événements,
et chaque événement porte **deux dates** : celle du fait, qui fait courir les
délais, et celle de la saisie. Les confondre offrirait des jours sur une
caducité.

**4.2 — Pyramide de preuves.** L’écran affichait les pièces manquantes en
pastilles nues : deux étiquettes de même apparence dont l’une vaut trois points
sur vingt et l’autre un seul. Chaque étage porte désormais le FAIT qu’il
établit et ce qu’il pèse. Le constat est un **compte** — « trois des quatre
pièces attendues sont absentes » — jamais un verdict.

**1.2 — Extracteur de preuves.** Sept natures de pièce reconnues, prompt
déterministe à l'octet, PDF lu nativement par le socle. Une pièce entre
`INDETERMINE` et y reste si la lecture n'aboutit pas — le compilateur le tient,
`ClePiece` ne contient pas cette valeur.

### Le défaut qui revient : « déclaré, lu, jamais alimenté »

**Dix occurrences**, dont cinq trouvées ce jour. Aucune visible au compilateur :
le champ est optionnel, le calcul a son repli, tout fonctionne.

| Ce qui était mort               | Ce que ça coûtait                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `facturesVente.tauxContractuel` | les deux moteurs le lisaient : le produit **sous-réclamait**                                                            |
| `signauxContestation`           | « le risque produit numéro un », câblé à `[]` par ses deux appelants                                                    |
| table `pieces`                  | conditions légales 12/20, seuil à 15, points manquants tous documentaires : **aucune créance ne pouvait être éligible** |
| mode `FACTURE_DEPOSEE`          | l'écran promettait « relue par le modèle », le fichier partait au parseur CSV                                           |
| table `dossiers`                | la caducité d'une ordonnance n'apparaissait **ni** dans le flux **ni** dans le briefing                                 |

`dossiers` a été **retirée** : elle modélisait la même chose que la machine à
états du 4.5, en mort. Deux représentations auraient fini par diverger.

### Les trois barrières posées

1. `declare-jamais-alimente.test.ts` — deux balayages (champs optionnels lus et
   jamais écrits ; valeurs d'union déclarées et citées nulle part), listes
   d'exceptions **vides**.
2. `purge-complete.test.ts` — toute table portant un `organizationId` doit
   apparaître dans `rgpd.ts`. Elle a mordu sur `evenementsProcedure` avant
   l'oubli.
3. `lignes-rouges.test.ts` — le balayage que `CLAUDE.md` annonçait et qui
   n'existait pas.

### Ce que seule l'injection d'une violation a révélé

Les trois barrières ont été vérifiées **en les faisant échouer**, et deux
défauts de la dernière ne se voyaient pas autrement :

- le nettoyage des commentaires ouvrait un faux bloc sur `accept="image/*"` et
  avalait dix lignes ;
- la liste des formes interdites laissait passer « recouvrement **garanti** »,
  l'adjectif — la promesse dans sa formulation la plus commerciale.

**Un balayage qui sous-déclare est pire qu'aucun balayage : il rassure.**

Et une ligne rouge était franchie en production : le flux disait « Engager une
procédure avant le … » et « Faire signifier sans délai ». La conséquence
juridique n'a pas été supprimée, elle a changé de place — `explication` la porte
au présent de constat, `action` ne porte plus qu'un geste logiciel.

### Chiffres

**959 tests**, 0 erreur de lint, `check` et `build` verts, schéma poussé et
accepté par le déploiement de développement, 22 écrans du showroom vérifiés aux
quatre largeurs de référence : 0 bloc opaque, 0 débordement horizontal, 0 cible
tactile sous 44 px.

### Ce qui reste, et qu'aucun agent ne débloque

- l'ingestion e-mail (1.1) : fournisseur et DNS ;
- la clé API Sirene (1.3) ;
- les relances (3.1) : un juriste doit valider les trois niveaux ;
- `valideParAvocat` vaut toujours `false` sur les quinze entrées du registre —
  **rien ne peut produire un acte tant qu'une signature humaine manque.**

---

## 11 septembre 2026, suite — 4.2 et 3.1

**4.2 — Pyramide de preuves.** Chaque étage porte le FAIT qu'il établit et ce
qu'il pèse. Le constat est un **compte** — « trois des quatre pièces attendues
sont absentes » — jamais un verdict : « trop faible » serait une appréciation
des chances de succès, c'est-à-dire du conseil juridique.

**3.1 — Relances, niveaux 1 et 2.** Des **brouillons** que le créancier envoie
lui-même, depuis sa messagerie, sous sa signature. Aucun bouton « envoyer », un
bouton « copier », et la mention en tête de l'écran.

- Le niveau 1 suppose l'oubli : ni intérêts, ni indemnité, ni suite. **Chaque
  niveau garde une marche au-dessus de lui** — un premier rappel qui menace
  déjà n'a plus rien à annoncer.
- Le niveau 2 **reprend** les chiffres d'un décompte figé et refuse de composer
  s'il n'y en a pas. Un second calcul serait une seconde vérité, dans un texte
  qui part chez le débiteur.
- Le niveau 3 est **verrouillé et le dit** : les mentions obligatoires d'une
  mise en demeure ne sont pas au référentiel. Montré plutôt que masqué, comme
  la procédure L.126.
- Le **coupe-circuit** passe avant le niveau : un débiteur en procédure
  collective ne se relance à aucun niveau, et la nature vient du registre mot
  pour mot.

### Deux défauts trouvés à l'écran, invisibles en test

- L'état établi de la pyramide se composait depuis le fait, et sortait faux
  trois fois sur quatre : « Les conditions de paiement applicables **EST
  DOCUMENTÉ** ». L'accord d'un participe ne se dérive pas d'une chaîne.
- Les brouillons étaient coupés à 80 colonnes — convention du courrier en texte
  brut. Collés dans une messagerie moderne, ils produisent des lignes hachées
  que le créancier rejoint à la main, exactement ce qu'on prétendait épargner.

**978 tests.** 23 écrans vérifiés aux largeurs de référence.
