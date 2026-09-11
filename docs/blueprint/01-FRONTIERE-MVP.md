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
| 1.3 | **Normalisation SIRET** sur l'API Sirene, avec gestion de l'historique des statuts                                               | à construire                        |
| 1.4 | **Solveur de lettrage dégradé** : retrouver quelles factures composent un virement groupé                                        | à construire                        |

**Pourquoi l'e-mail dédié plutôt que Pennylane d'abord.** Pennylane et Dext exigent une validation de
partenariat dont le délai ne nous appartient pas. Miser le premier euro dessus, c'est mettre le
calendrier entre les mains d'un tiers. Une adresse `depot@<client>.letikette.com` donne la même
sensation de zéro saisie, marche avec **n'importe quel** outil comptable, et ne dépend de personne.
Les connecteurs arrivent en parallèle, sans bloquer la vente.

### Module 2 — Le cerveau préventif

|     | Fonction                                                                                                      | État                                      |
| --- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 2.1 | **Compteur de prescription qui se réveille seul** : recalcul quotidien, notification sans qu'on ouvre l'écran | le calcul existe, **le battement manque** |
| 2.2 | **Radar de solvabilité** : interrogation BODACC quotidienne, coupe-circuit sur procédure collective           | à construire                              |
| 2.3 | **Scoring comportemental** : rupture d'habitude de paiement plutôt que seuil absolu                           | à construire                              |

**Le battement est le cœur du MVP.** Aujourd'hui la surveillance se calcule quand on ouvre l'écran.
Un radar qui ne se réveille pas n'est pas un radar, c'est un rapport.

### Module 3 — Le cerveau de médiation

|     | Fonction                                                                                          | État                    |
| --- | ------------------------------------------------------------------------------------------------- | ----------------------- |
| 3.1 | **Relances asymétriques** en trois niveaux, du rappel administratif à la mise en demeure chiffrée | à construire            |
| 3.2 | **Questionnaire de qualification de litige** : recueillir le fait, pas conseiller                 | **existe** (11/09/2026) |

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
