# Les parcours d'impayés, scénario par scénario

_Analyse du 8 octobre 2026, livrée le soir même. Demande du fondateur : « voir et analyser le
parcours utilisateur pour tous les scénarios d'impayés possibles, voir si notre application a de
l'intérêt, où elle peine et où il y a de la friction, puis proposer des solutions et les mettre en
place », en s'inspirant au maximum de Mobbin._

## Verdict

L'application a de l'intérêt là où le travail est un CALCUL ou une SURVEILLANCE : ce qui est dû
de plein droit (pénalités, 40 € par facture), la date limite pour agir, la procédure collective
lue au BODACC, le décompte arrêté au centime, la page où le client paie. Aucun concurrent du
marché français ne le fait aussi bien.

Elle peinait là où le travail est une CONVERSATION avec le client. Le pilote relance seul depuis
le 8 octobre, mais il ne savait rien de ce que le client avait dit : il relançait quelqu'un qui
venait de promettre de payer, et la somme entière à quelqu'un qui payait en trois fois. Et un
dossier ne pouvait pas se fermer.

## Les scénarios

| #   | Scénario                                         | Avant le 08/10                                                                                         | Friction                                                     | Après                                                                                                                                      |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Simple oubli                                     | Plan de relance automatique, paiement rapproché, dossier « Réglé ».                                    | Aucune.                                                      | Inchangé.                                                                                                                                  |
| 2   | « Je paie le 20 »                                | Promesse notée dans l'historique (segment de quatre, texte libre, montant, date). Le pilote relançait. | **Critique** : relance à son nom deux jours après sa parole. | La promesse fait taire le plan jusqu'au jour promis + 3 jours ; la relance programmée est abandonnée ; Plume et la carte le disent.        |
| 3   | « Je paie en trois fois »                        | Seul l'accord écrit se composait. Rien ne suivait les versements ; le pilote relançait tout.           | **Critique**.                                                | Échéancier convenu en deux choix (Affirm), suivi en frise (Afterpay). Le plan se tait tant que les versements arrivent.                    |
| 4   | Un versement manque                              | Invisible.                                                                                             | Haute.                                                       | « Versement pas arrivé » remonte dans Aujourd'hui ; le plan reprend seul.                                                                  |
| 5   | Le client rappelle (cas le plus fréquent)        | Cinq chemins différents selon ce qu'il dit, aucun sous la main.                                        | Haute.                                                       | « Il vous a répondu ? » : une feuille, cinq issues (Cash App), chacune un geste confirmé d'un mot.                                         |
| 6   | Il conteste                                      | Ne bloque plus rien depuis le 08/10 ; le questionnaire vivait dans « Désaccord ».                      | Moyenne.                                                     | Une issue de « Il vous a répondu ? » y mène.                                                                                               |
| 7   | Il dit avoir déjà payé                           | Le règlement se note sur sa fiche ; rien ne le disait depuis le dossier.                               | Moyenne.                                                     | Une issue y mène ; « Classer » renvoie aussi vers la fiche.                                                                                |
| 8   | Paiement partiel                                 | Reste dû recalculé, plan maintenu.                                                                     | Faible.                                                      | Une promesse dit ce qui est arrivé depuis (un fait, jamais « tenue » à la place du gérant).                                                |
| 9   | Geste commercial, entreprise fermée, doublon     | **Impossible de classer** : la page savait dire « classé », rien n'écrivait le statut.                 | Haute.                                                       | « Classer ce dossier » (4 raisons), rien d'effacé, sort des alertes et de « ce qui vous est dû », se rouvre d'un toucher.                   |
| 10  | Silence après la lettre officielle               | « La remise à votre conseil, c'est vous qui la décidez », sans geste.                                  | Moyenne.                                                     | Plume dit les trois suites et ouvre les suites possibles, sans nommer de voie de droit.                                                    |
| 11  | Payé en retard, pénalités dues                   | « C'est réglé : tout est payé. » Les pénalités calculées disparaissaient.                              | Moyenne (argent laissé sur la table).                        | Plume dit le montant calculé et mène au détail ; réclamer ou classer.                                                                      |
| 12  | Procédure collective                             | Lue au BODACC, relances suspendues, déclaration préparée avec le mandataire.                           | Aucune.                                                      | Inchangé.                                                                                                                                  |
| 13  | Prescription proche                              | Surveillée, en tête de file.                                                                           | Aucune.                                                      | Inchangé.                                                                                                                                  |
| 14  | E-mail du client inconnu                         | Signalé une fois dans la boîte de réception, lien vers la fiche.                                       | Faible.                                                      | Inchangé.                                                                                                                                  |
| 15  | Tout cela, en langage naturel                    | Plume savait relancer, promesse, note, contestation, décompte, remise.                                 | Moyenne.                                                     | Plume convient aussi d'un échéancier et classe un dossier, au « Confirmer » du gérant.                                                     |

## Les références (Mobbin)

- **Afterpay**, « Payment schedule » : la frise des versements, « 1 of 4 · Paid », « Next payment ».
- **Affirm**, « Choose a payment plan » : le nombre de fois, puis le calendrier qui en découle.
- **Tabby**, « Pay in 6 schedule » : un versement par carte, « Extend due date ».
- **Cash App**, « What type of issue are you having? » : une carte par cas, titre et ligne.
- **Wise**, « Mark as paid / Close request » ; **Stripe**, « uncollectible » : fermer en disant pourquoi.
- **Slack** et **Turo**, mise en pause jusqu'à une date, et ce que la pause change.
- **Turo**, « Resolving damage » : le délai, puis l'action et les autres options.

## Ce qui a été livré (6 commits, en production)

1. `b307fb6` — la parole du client fait taire les relances (`verticales/recouvrement/parole.ts`).
2. `b98602e` — « Il vous a répondu ? » et le paiement en plusieurs fois suivi.
3. `ec195e3` — classer un dossier, et le rouvrir (`convex/recouvrement/classement.ts`).
4. `1c797a6` — la fin du plan et les pénalités restantes mènent quelque part.
5. `0710d7f` — un versement d'échéancier qui n'arrive pas remonte dans Aujourd'hui.
6. `89dba4e` — Plume convient d'un échéancier et classe un dossier.

## Les règles qui tiennent

- **« Tenue » reste le mot du gérant.** `suivi.trancherPromesse` le disait déjà : un virement du bon
  montant au bon jour ne dit pas que c'est celui qui était promis. Le logiciel affiche ce qui est
  arrivé depuis ; il ne tranche pas.
- **Une promesse fait taire le plan jusqu'à la fin de son délai de grâce, quoi qu'il arrive** :
  personne n'est relancé avant le jour qu'il a donné.
- **Un échéancier en retard rend la main au plan.** Il ne se « rompt » pas en droit : le logiciel
  ne prononce aucune déchéance du terme.
- **Classer n'efface rien** et n'est pas « il a payé » : un règlement se note sur la fiche.
- Les trois jours de grâce sont une cadence de produit, comme celles du plan de relance, pas une
  valeur juridique.

## Livré le 9 octobre

- `402d3de` : un dossier classé ne compte plus dans ce que le client doit (liste et fiche) ; ses
  factures se lisent à part, « Factures classées ».
- `429c1f0` : l'accord écrit s'ouvre rempli du calendrier convenu, depuis la feuille du paiement en
  plusieurs fois ou depuis la frise d'un échéancier qui court.
- `58143c7` : le rappel qui reprend après une promesse non couverte la rappelle : « Vous nous aviez
  annoncé un règlement de 1 200,00 € pour le 20/10/2026. Sauf erreur de notre part, il ne nous est
  pas parvenu… » (`parole.promesseACiter`). Un fait, jamais un reproche.
- `0ba5113` et `1d4a34e` : **le décompte ne s'arrête plus, il se date quand on le réclame.** Les
  pénalités courent jusqu'au paiement ; chaque document qui réclame un chiffre le fige au jour où
  il part (`decompte.daterLeDecompte`). L'écran d'arrêt et son pré-vol ont disparu, la lettre
  officielle du pilote n'attend plus le gérant, et la page de paiement s'ouvre d'un geste.

## Ce qui reste

- La lettre de relance officielle ne cite pas la promesse manquée : son texte est recopié au mot
  près d'un modèle, et ne se change qu'à la relecture.
