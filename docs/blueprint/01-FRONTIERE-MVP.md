# La frontière du MVP

**Ce qui est dedans, ce qui est dehors, et pourquoi la ligne passe là.**
Document opposable : si une fonctionnalité n'est pas listée dedans, elle n'est pas dans le MVP.

---

## 1. Où passe la ligne, et pourquoi

La frontière ne sépare pas « simple » de « compliqué ». Elle ne sépare pas non plus « rapide à
construire » de « long à construire » — avec les agents de code, la vitesse d'écriture n'est plus la
contrainte, et raisonner en semaines de développement conduirait à un découpage faux.

**Elle sépare ce qui se corrige de ce qui ne se corrige pas.**

Un chiffre affiché à l'écran se corrige au prochain rendu. Un chiffre écrit dans une requête déposée
au greffe, jamais. C'est exactement la distinction que le code encode déjà, sans qu'on l'ait fait
exprès :

| Barrière           | Ce qu'elle exige                                          | Ce qu'elle autorise                                                               |
| ------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `exiger()`         | La valeur est **sourcée** sur une source publique citable | Mesurer, surveiller, alerter, chiffrer, rédiger un brouillon que le client envoie |
| `exigerPourActe()` | Un **avocat** a validé la valeur ET son applicabilité     | Produire une pièce qui part au greffe ou chez un commissaire de justice           |

**Conséquence directe :** le MVP est tout ce qui vit sous `exiger()`. Aujourd'hui, `valideParAvocat`
vaut `false` sur les quinze entrées du registre — donc rien de ce qui produit un acte ne peut sortir,
quoi qu'on code. Ce n'est pas une lenteur, c'est une signature humaine, et c'est le plus long piquet
du plan.

## 2. Ce qui est dans le MVP

### Module 1 — Ingestion et normalisation

|     | Fonction                                                                                                                         | État                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1.1 | **Ingestion automatique** : adresse e-mail dédiée par organisation, connecteur ouvert self-service, dépôt de fichiers en secours | dépôt existe, le reste à construire |
| 1.2 | **Extracteur IA des preuves** : bons de livraison, bons de commande, CGV, annotations manuscrites                                | **existe** (11/09/2026)             |
| 1.3 | **Identification au registre** : retrouver le SIREN d'un débiteur à partir de son nom                                           | **existe** (11/09/2026), par le BODACC |
| 1.4 | **Solveur de lettrage dégradé** : retrouver quelles factures composent un virement groupé                                        | **existe** (03/09/2026)             |

**1.3 n'attendait pas la clé Sirene, et c'est une erreur de raisonnement qu'il faut garder
écrite.** Cette ligne a porté « à construire · bloqué par la clé INSEE » pendant des semaines, et le
code disait la même chose : « le rattraper par l'API Sirene demande une clé qui n'est pas obtenue ;
le gérant, lui, connaît ses clients. **C'est la seule voie qui ne dépend de personne.** »

Elle ne l'était pas. Le BODACC est branché depuis le radar de solvabilité (2.2), il est ouvert, sans
clé, et **il se cherche par nom** : chaque annonce porte la dénomination, le SIREN, la forme
juridique et l'adresse du siège. Une seule source avait été envisagée, et de son indisponibilité on
avait conclu qu'aucune n'existait — pendant que la bonne tournait déjà toutes les nuits dans le même
produit.

Ce que la clé Sirene apporterait en plus reste réel et reste dehors : **l'historique des statuts**
— actif, cessé, et depuis quand. Le BODACC donne l'identité, pas la chronologie de l'établissement.

**Pourquoi l'e-mail dédié plutôt que Pennylane d'abord.** Pennylane et Dext exigent une validation de
partenariat dont le délai ne nous appartient pas. Miser le premier euro dessus, c'est mettre le
calendrier entre les mains d'un tiers. Une adresse `depot@<client>.letikette.com` donne la même
sensation de zéro saisie, marche avec **n'importe quel** outil comptable, et ne dépend de personne.
Les connecteurs arrivent en parallèle, sans bloquer la vente.

### Module 2 — Le cerveau préventif

|     | Fonction                                                                                                      | État                    |
| --- | ------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 2.1 | **Compteur de prescription qui se réveille seul** : recalcul quotidien, notification sans qu'on ouvre l'écran | **existe** (03/09/2026) |
| 2.2 | **Radar de solvabilité** : interrogation BODACC quotidienne, coupe-circuit sur procédure collective           | **existe** (09/09/2026) |
| 2.3 | **Scoring comportemental** : rupture d'habitude de paiement plutôt que seuil absolu                           | **existe** (10/09/2026) |

**Le battement est le cœur du MVP.** Aujourd'hui la surveillance se calcule quand on ouvre l'écran.
Un radar qui ne se réveille pas n'est pas un radar, c'est un rapport.

### Module 3 — Le cerveau de médiation

|     | Fonction                                                                                          | État                                                     |
| --- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 3.1 | **Relances asymétriques** en trois niveaux, du rappel administratif à la mise en demeure chiffrée | **niveaux 1 et 2** (11/09/2026) ; le 3 attend le juriste |
| 3.2 | **Questionnaire de qualification de litige** : recueillir le fait, pas conseiller                 | **existe** (11/09/2026)                                  |

Les relances sont des **brouillons dans la boîte du client**. Ligne rouge 1.

### Module 4 — Le cerveau légal

|     | Fonction                                                                                                            | État                    |
| --- | ------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 4.1 | **Moteur de calcul exact** : centimes entiers, segments à chaque rupture de taux, prorata temporis                  | **existe**              |
| 4.2 | **Évaluateur de solidité documentaire** : facture seule = fragile, + bon de commande + preuve de livraison = blindé | **existe** (11/09/2026) |
| 4.3 | **Vérificateur d'éligibilité procédurale** : chaque procédure est un module avec ses conditions                     | **existe**              |
| 4.5 | **Machine à états post-procédure** : surveiller les délais qui courent après une décision                           | **existe** (11/09/2026) |

### Les cinq mécaniques d'accroche

Elles ne sont pas du confort : **elles sont ce qui distingue un instrument d'un rapport.** Toutes
vivent sous `exiger()`.

**1. Le choc du premier import.** Le moment le plus important de toute la relation, et il dure
soixante secondes. Le client dépose trois ans d'historique ; le produit répond avec un montant qu'il
ne savait pas avoir le droit de réclamer — les 40 € par facture en retard, plus les intérêts jamais
calculés. Ce n'est pas une promesse : c'est de l'argent déjà dû, révélé sur ses propres données.
Aucun concurrent ne peut le faire sans le moteur de calcul.

> ⚠️ **Question ouverte pour le juriste**, à ne pas trancher de mémoire : jusqu'où l'indemnité
> forfaitaire et les intérêts restent réclamables sur une facture dont le principal a déjà été payé.
> Restreinte aux seuls impayés, la révélation garde sa force ; la réponse change son amplitude.

**2. Le compteur vivant.** Le montant en gros n'est pas un solde comptable figé, c'est ce qu'on vous
doit **aujourd'hui**, intérêts courus inclus. Il a monté cette nuit. Le moteur sait déjà le faire :
la date d'arrêt est un paramètre.

**3. Le briefing du matin.** Le produit vient au client avant que le client vienne au produit. Trois
lignes : ce qui a bougé, ce qui meurt bientôt, **la seule action du jour**. Un ordre de priorité, pas
un digest. E-mail vers le client, jamais vers le débiteur.

**4. Le compteur de zéro perte.** Montrer aussi ce qui a **déjà** été laissé mourir. « Avant
Letikette : 34 000 € éteints en silence. Depuis : 0 € prescrit, 214 jours. » Un compteur qu'on ne
veut pas casser, adossé à du réel et pas à un badge.

**5. Le décompte comme pièce officielle.** Le moment où le client ne peut plus partir, c'est quand le
décompte Letikette devient ce qu'il envoie à son expert-comptable, à son avocat, à son assureur.
L'export doit donc être irréprochable au point de devenir son format standard. Et l'historique des
décomptes arrêtés — figés, datés, opposables — devient un actif : partir, c'est perdre la preuve de
ce qu'on a réclamé et quand.

### Le contre-pied qui compte autant

**Le produit doit savoir dire « rien à faire aujourd'hui ».** Un outil qui crie tous les matins
devient du bruit et se fait filtrer en trois semaines. Un outil qui dit « tout va bien, et voici
pourquoi » trois jours de suite, puis « celle-là, aujourd'hui » le quatrième, garde son autorité.

**La rareté de l'alarme est ce qui la fait obéir.** C'est l'inverse du réflexe de croissance, et
c'est une contrainte de conception, pas une préférence.

## 3. Construit, testé, mais verrouillé

**4.4 — Le brief exécutoire et le routage.** Génération du dossier chronologique complet, détection
du tribunal de commerce territorialement compétent via le SIRET du débiteur, transmission au
commissaire de justice du ressort.

**Et la déclaration de créance au mandataire judiciaire** (2.2, second temps) : détecter une
liquidation au BODACC et couper les relances est une décision opérationnelle, donc `exiger()`.
Générer le formulaire de déclaration est une pièce, donc `exigerPourActe()`.

Le code est écrit, testé, et derrière le drapeau. **Il s'ouvre sans redéploiement le jour où
`valideParAvocat` passe à vrai** sur les entrées concernées. C'est tout l'intérêt d'avoir mis la
barrière dans le registre plutôt que dans le code métier.

## 4. Ce qui est dehors, et nommé pour qu'on ne le rediscute pas

- **Aucun e-mail envoyé au débiteur par Letikette.** Ligne rouge 1, jusqu'à l'agrément.
- **Aucun maniement de fonds.** Ligne rouge 2, jusqu'au statut d'agent PSP.
- **Aucune recommandation de procédure.** Ligne rouge 3, jamais.
- **Pas d'assurance-crédit, pas d'affacturage.** Phase 3.
- **Pas de second pays.** L'architecture le permet (`pays/france/` peut avoir un frère, le socle ne
  sait pas quelle loi il sert), mais chaque pays demande son propre juriste.
- **Pas d'application mobile.** Le produit est tablette-d'abord en paysage, sans casser le téléphone.
- **Pas de Pennylane ni de Dext** tant que la validation de partenariat n'est pas arrivée. La demande
  part le jour 1 ; elle ne bloque rien.
- **Pas d'Infogreffe.** Payant. Sirene et BODACC sont ouverts et suffisent au coupe-circuit.

## 5. Les deux jugements limites

Deux fonctions sont **près du bord** de la ligne rouge 3. Elles sont dedans, et voici le
raisonnement — à faire confirmer par le juriste avec le reste.

**4.2, l'évaluateur de solidité.** Dire « ce dossier est fragile » est un **constat sur les pièces
présentes**, pas un conseil sur la conduite à tenir. La formulation compte : « trois des quatre
pièces attendues sont absentes » est un constat ; « ce dossier est trop faible pour être engagé » est
un conseil. Le produit écrit la première forme.

**2.2, le coupe-circuit.** Bloquer les relances sur une entreprise en procédure collective est une
décision **opérationnelle** — c'est inutile autant qu'inapproprié. Le produit ne dit pas « déclarez
votre créance », il dit « les relances sont suspendues : ce débiteur est en liquidation depuis le
14 mars ». Le constat, pas la conduite.

## 6. La promesse vendable, en une phrase

> **Chaque matin, vous savez ce que vos clients vous doivent au centime, ce qui est encore
> récupérable, et ce qui meurt cette semaine. Le logiciel a travaillé pendant la nuit.**

## 7. Comment on saura que le MVP est fini

Pas « toutes les cases sont cochées ». Trois critères observables :

1. **Un client dépose son historique et voit un montant qu'il ignorait**, sans qu'on l'aide.
2. **Le produit envoie un briefing du matin exact**, sept jours de suite, sans intervention.
3. **Un décompte sort du produit et part chez un tiers** — expert-comptable, avocat, assureur — sans
   être retouché.

Le troisième est le plus dur et le plus important : c'est celui qui prouve que le décompte est une
pièce, et pas un écran.

---

## Où en est réellement le MVP — 11 septembre 2026

**Treize fonctions sur treize existent**, dont deux partiellement. Ce qui manque ne se code pas :

|     | Ce qui bloque                                                   | Qui le débloque |
| --- | --------------------------------------------------------------- | --------------- |
| 1.1 | Le fournisseur d'ingestion e-mail et les enregistrements DNS    | Jules           |
| 3.1 | Les mentions obligatoires de la mise en demeure — niveau 3 seul | un juriste      |

**1.3 a quitté ce tableau le 11 septembre 2026.** Elle y figurait comme bloquée par la clé INSEE ;
elle ne l'était pas. Voir le module 1 — la source qui la débloque tournait déjà toutes les nuits dans
le produit. Ce qui reste dehors, c'est l'historique des statuts, et lui attend bien la clé.

**Et le plus long piquet n'a pas bougé.** `valideParAvocat` vaut toujours
`false` sur les quinze entrées du registre juridique : **rien ne peut produire
un acte** tant qu'une signature humaine manque, quel que soit l'état du code.
Ce n'est pas une lenteur d'ingénierie, et aucun agent ne la remplace.

⚠️ **« Existe » veut dire consommé, pas écrit.** Chaque ligne ci-dessus a été
vérifiée sur trois points : un module de domaine, une fonction Convex, et un
consommateur réel — un écran ou une tâche planifiée. Un module sans
consommateur ne compte pas comme livré : c'est exactement le défaut
« déclaré, lu, jamais alimenté » qui s'est produit **douze fois** dans ce dépôt,
et dont deux occurrences étaient des fonctionnalités entières que la table
disait pourtant construites.

⚠️ **Et cette vérification ne se fait plus à la main.** Les deux dernières
occurrences — `debiteurs.formeJuridique`, `facturesVente.documentId` — ont été
trouvées en travaillant sur autre chose, ce qui veut dire qu'on ne les cherchait
pas. `convex/__tests__/champs-alimentes.test.ts` balaie désormais le schéma
entier et échoue sur tout champ que rien n'alimente ou que personne ne lit ;
chaque exception y porte sa raison, et un second test refuse celles qui ont
survécu à leur champ.

Deux autres défauts de la même famille, trouvés le même jour, ne portent pas sur
un champ mais sur une **arête** — d'où deux barrières de plus, dans `ui/__tests__` :
`listerCreances` était complète, testée, et appelée par personne ; et l'écran
d'une créance n'avait qu'une seule entrée, la redirection qui suit sa création.
Une fonction sans appelant et un écran sans lien entrant sont le même défaut que
ce paragraphe décrit, vus depuis le graphe plutôt que depuis la table.
