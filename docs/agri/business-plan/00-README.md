# Business plan — Le logiciel de conformité EGalim en restauration collective

**Nom : Mycelium**
**Révision : 20 août 2026 · Fondateur : Jules · Statut : bootstrap, budget < 1 000 €**

> **Révision majeure du 20 août 2026.** La stratégie abandonne le modèle « opérateur »
> (sourcing, coordination, logistique) et devient **un éditeur de logiciel**. Les étages 3, 4
> et 5 de l'échelle précédente — pilote substitution, abonnement opérateur, orchestration
> logistique — **n'ont plus de porteur** et sont supprimés du plan. Ce qui reste est ce qui
> se mesure, se prouve et s'automatise : **le papier**.
>
> Le renversement porte sur une phrase. L'ancien plan visait « 20 % logiciel, 80 % humain ».
> Le nouveau vise l'inverse : **le logiciel fait le travail, le gérant confirme ce qui engage
> sa responsabilité.**

---

## La thèse en 5 lignes

La loi EGalim oblige **toutes** les cantines (publiques depuis 2022, **privées depuis 2024**) à
servir ≥ 50 % de produits durables dont ≥ 20 % bio, et à le déclarer chaque année avant le
31 mars. **La grande majorité n'y arrive pas, et surtout : la plupart ne connaissent même pas
leur chiffre**, parce qu'il se calcule en valeur d'achat, ligne à ligne, sur douze mois de
factures. On vend **un abonnement à un logiciel qui mesure ce chiffre, le suit et le prouve**.
On ne vend ni denrées, ni temps humain.

---

## Le changement de stratégie en une image

**Avant (plan du 15 août) :** une échelle de valeur en six étages, où le papier finançait le
sourcing, qui finançait la logistique. Le revenu principal venait d'un abonnement opérateur à
650 €/mois, qui consommait une heure de coordination par semaine et par client. **Un fondateur
seul saturait à 8 ou 10 clients.**

**Maintenant :** un produit, un abonnement, une porte d'entrée. Le coût de livraison par client
tend vers zéro, et **il n'y a plus de plafond de délivrance**.

| | Ce qu'on vend | Prix | Ce qu'on porte comme risque |
|---|---|---|---|
| **La porte d'entrée** | **Le premier diagnostic** : 12 mois de factures, les trois taux, l'écart chiffré en euros | 690 / 1 190 / 1 900 € one-shot | Aucun |
| **Le produit** | **L'abonnement au logiciel** : mesure continue, file de confirmation, certificats, courriers de demande d'attestation, télédéclaration incluse | 190 / 290 / 390 €/mois | Aucun |

En option, pour un non-abonné pendant la campagne de janvier à mars : **la télédéclaration
seule, 290 €**. C'est une porte d'entrée saisonnière, pas une ligne de métier.

Détail et économie unitaire : [03](03-modele-offre-pricing.md).

---

## Ce que le changement d'axe déplace vraiment

C'est le point le plus important de cette révision, et il n'est pas comptable.

**Le plafond change de nature.** Dans le modèle opérateur, la contrainte était la
**livraison** : chaque client coûtait du temps humain récurrent, donc la croissance
supposait d'embaucher. Dans le modèle logiciel, livrer un client de plus ne coûte presque
rien. **La contrainte devient l'acquisition** : combien de cantines on atteint et on
convainc.

Trois conséquences directes :

1. **On n'embauche plus pour livrer, on investit pour distribuer.** L'embauche « ops/sourcing »
   de l'année 2 disparaît du plan.
2. **La charge marginale est dégressive.** Un libellé confirmé l'est définitivement, et le
   consensus entre clients en retire encore : le énième client coûte moins que le premier.
   C'est une économie que le modèle opérateur n'avait pas.
3. **Deux classes de risque juridique disparaissent** : plus de mandat de facturation, plus de
   question d'exploitant du secteur alimentaire, plus de statut de commissionnaire de
   transport. Avec elles disparaît la provision d'avocat de 800 à 1 500 €.

En échange, on accepte un revenu par client plus faible : 290 €/mois au lieu de 650 € plus
commission. **On échange de la marge par client contre de la capacité et de l'absence de
risque.** C'est un arbitrage assumé, chiffré dans le [06](06-previsionnel-financier.md).

---

## Les documents (à lire dans l'ordre)

| # | Document | Ce qu'il contient |
|---|---|---|
| 00 | **README** (ce fichier) | Vue d'ensemble, thèse, offre, index |
| 01 | [Synthèse exécutive](01-synthese-executive.md) | Le pitch complet en 2 pages |
| 02 | [Marché & EGalim documenté](02-marche-egalim-documente.md) | Chiffres officiels sourcés, taille du marché, **concurrence réelle et honnête** |
| 03 | [Modèle, offre & pricing](03-modele-offre-pricing.md) | Les deux offres en détail, prix, économie unitaire |
| 04 | [Go-to-market & plan commercial](04-go-to-market-closing.md) | **Calendrier saisonnier** (la fenêtre janv.–mars), tunnel, ciblage, objectifs |
| 05 | [Produit & roadmap tech](05-produit-roadmap-tech.md) | La Moulinette Audit, l'automatisation, la boucle de confirmation |
| 06 | [Prévisionnel financier](06-previsionnel-financier.md) | Budget de départ, P&L 3 ans par ligne de revenu, seuil de sortie du job, cadrage juridique et fiscal |
| 07 | [Objectifs, jalons & risques](07-objectifs-court-long-terme.md) | OKR, gates go/no-go, risques et parades |
| 09 | [Script d'appel & de rendez-vous](09-script-appel-cantine.md) | Outil terrain : accroche « diagnostic », qualification, objections, closing |
| 10 | [Fiche EGalim (1 page)](10-fiche-egalim-1page.md) | Outil terrain : la conformité résumée + le barème de calcul |

> Le document 08 (logistique 3PL, montage juridique du transport, scouting transporteurs) a été
> **supprimé** le 20 août 2026 : sans opérateur, il n'y a ni tournée, ni transporteur, ni
> commissionnaire.

Complément opérationnel : [playbook 90 jours](../playbook-90-jours-restauration-collective.md).
Journal de décision : [le modèle initial abandonné](../business-plan-90-jours.md).

---

## Les principes non négociables

1. **On répond à une obligation légale existante**, pas à une demande imaginée.
2. **On vend le chiffre.** La mesure se vend seule, sans denrée, sans camion, sans risque.
3. **On vend un logiciel qui mesure, pas du temps humain.** L'extraction et la classification
   sont automatisées ; le gérant confirme ce qui engage sa responsabilité, et rien d'autre.
4. **Le gérant est autonome.** Aucune tâche du produit ne suppose qu'on décroche le téléphone
   à sa place. S'il a besoin de nous pour s'en servir, le produit est raté.
5. **La charge est dégressive.** Un libellé confirmé l'est définitivement ; le consensus entre
   clients en retire encore. Le travail demandé au gérant décroît à chaque exercice.
6. **On ne construit que ce que le journal de friction du terrain désigne**, chronométré.
   Unique exception assumée : la Moulinette Audit, parce que c'est le produit facturé lui-même.
7. **On ne prend jamais la propriété des denrées, et on n'organise jamais le transport en son
   nom propre.** Ces deux lignes rouges restent écrites même sans activité de sourcing : elles
   bornent ce qu'on s'autorise à devenir.
8. **Obligation de moyens, jamais de résultat.** On ne « garantit » pas la conformité : on la
   **mesure**, on la **fait progresser**, on la **prouve**. La déclaration reste signée par la
   cantine. Le mot « garantie » est interdit, et un test automatisé le vérifie dans le produit.
9. **Le privé d'abord** (obligé depuis 2024, décision rapide), le public ensuite.

---

## Avertissement honnête

Le prévisionnel (doc 06) repose sur des hypothèses explicites, **re-dérivées le 20 août 2026**
après la suppression des étages opérateur, et à affiner avec les premiers vrais deals.

Le passage au modèle logiciel **retire** du plan les points juridiques les plus lourds
(exploitant du secteur alimentaire, commissionnaire de transport, mandat de facturation).
Restent à confirmer avec un expert-comptable, avant le premier encaissement : le statut, la
franchise de TVA et les seuils. Ce sont désormais des questions de routine, plus des questions
à 50 000 €.
