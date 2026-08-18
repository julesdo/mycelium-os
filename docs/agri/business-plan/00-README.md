# Business plan — Opérateur de la conformité EGalim en restauration collective

**Nom de travail : Mycelium (à renommer, la marque « Fleet » ne colle plus)**
**Révision : 15 août 2026 · Fondateur : Jules · Statut : bootstrap, budget < 1 000 €**

> **Révision majeure du 15 août 2026.** La stratégie passe d'un modèle « opérateur du local »
> lancé d'un bloc à une **échelle de valeur progressive en 6 étages**, où chaque étage se vend
> seul, finance le suivant et dé-risque celui d'après. On ne démarre plus par les denrées et la
> logistique : on démarre par **le papier**.

---

## La thèse en 5 lignes

La loi EGalim oblige **toutes** les cantines (publiques depuis 2022, **privées depuis 2024**) à servir ≥50 % de produits durables dont ≥20 % bio, et à le déclarer chaque année. **La grande majorité n'y arrive pas, et surtout : la plupart ne connaissent même pas leur chiffre.** On entre par le **diagnostic** (on calcule leur ratio réel à partir de leurs factures, on chiffre l'écart), puis on **comble l'écart** par du sourcing local, puis seulement on orchestre la logistique. On vend un **résultat mesuré**, pas un SaaS, et pas une promesse.

---

## Le changement de stratégie en une image

**Avant (plan du 27 juillet) :** vendre un abonnement 600 €/mois « conformité garantie + sourcing + livraison » à une cantine qui ne nous connaît pas, dès le mois 4. Un seul gros « oui » à obtenir, qui embarque d'un coup le sourcing, la logistique, la responsabilité sanitaire et la promesse de résultat.

**Maintenant :** une **suite de petits « oui »**, chacun autonome et rentable.

| Étage | Ce qu'on vend | Prix | Risque porté | Fenêtre |
|---|---|---|---|---|
| **0** | **Diagnostic EGalim** (leurs factures → leur ratio réel → l'écart chiffré) | 690–1 900 € one-shot | **Nul** (aucune denrée) | Dès sept. 2026 |
| **1** | **Déclaration assistée** sur « ma cantine » | 390–690 € | Nul | Janv.–mars |
| **2** | **Abonnement Conformité** (preuve mensuelle + veille + déclaration) | 190–390 €/mois | Nul | Dès nov. 2026 |
| **3** | **Pilote Substitution** (2 familles, 1 producteur qui livre déjà) | Gratuit / 500 € | Faible | Dès nov. 2026 |
| **4** | **Abonnement Opérateur** (sourcing multi-producteurs + preuve) | 450–900 €/mois + commission | Moyen | Dès janv. 2027 |
| **5** | **Orchestration logistique 3PL** | Marge d'orchestration | Élevé, **sous condition** | Si densité (M15+) |

Chaque étage a un **déclencheur explicite** et un **critère d'abandon**. On ne monte pas d'un étage tant que le précédent ne tourne pas. Détail : [03](03-modele-offre-pricing.md) et [07](07-objectifs-court-long-terme.md).

---

## Les documents (à lire dans l'ordre)

| # | Document | Ce qu'il contient |
|---|---|---|
| 00 | **README** (ce fichier) | Vue d'ensemble, thèse, échelle de valeur, index |
| 01 | [Synthèse exécutive](01-synthese-executive.md) | Le pitch complet en 2 pages, version progressive |
| 02 | [Marché & EGalim documenté](02-marche-egalim-documente.md) | Chiffres officiels sourcés, taille du marché, **concurrence réelle et honnête** |
| 03 | [Modèle, offre & pricing](03-modele-offre-pricing.md) | Les 6 étages en détail, prix, **quelles familles de produits au pilote**, économie unitaire |
| 04 | [Go-to-market & plan commercial](04-go-to-market-closing.md) | **Calendrier saisonnier** (la fenêtre janv.–mars), tunnel, ciblage, objectifs |
| 05 | [Produit & roadmap tech](05-produit-roadmap-tech.md) | La Moulinette Audit (le seul code de l'année 1), réutilisation Mycelium recalibrée |
| 06 | [Prévisionnel financier](06-previsionnel-financier.md) | Budget de départ, P&L 3 ans par ligne de revenu, seuil de sortie du job, **cadrage juridique et fiscal** |
| 07 | [Objectifs, jalons & risques](07-objectifs-court-long-terme.md) | OKR par étage, gates go/no-go, risques et parades |
| 08 | [Logistique 3PL : montage juridique & scouting](08-logistique-3pl-scouting.md) | **Le piège du statut de commissionnaire de transport**, les 3 montages possibles, le déclencheur, les questions au transporteur |
| 09 | [Script d'appel & de rendez-vous](09-script-appel-cantine.md) | Outil terrain : accroche « diagnostic », qualification, objections, closing |
| 10 | [Fiche EGalim (1 page)](10-fiche-egalim-1page.md) | Outil terrain : la conformité résumée + le barème de calcul |

Complément opérationnel : [playbook 90 jours](../playbook-90-jours-restauration-collective.md) (15 août → 15 novembre 2026).
Journal de décision : [le modèle initial abandonné](../business-plan-90-jours.md) (vente directe producteurs, ce qu'on en garde).

---

## Les principes non négociables

1. **On répond à une obligation légale existante**, pas à une demande imaginée.
2. **On vend le chiffre avant de vendre la carotte.** Le diagnostic se vend seul, sans denrée, sans camion, sans risque.
3. **On ne code que ce que le terrain a déjà fait dix fois à la main.** Une seule exception en année 1 : la Moulinette Audit, parce que c'est le produit lui-même.
4. **80 % humain, 20 % logiciel.** On est opérateur, pas éditeur.
5. **On ne prend jamais la propriété des denrées.** Ni le transport en notre nom. Ces deux lignes rouges sont ce qui garde le modèle à budget nul et hors du risque sanitaire et réglementaire. Voir [08](08-logistique-3pl-scouting.md).
6. **Obligation de moyens, jamais de résultat.** On ne « garantit » pas la conformité : on la mesure, on la fait progresser, on la prouve. La déclaration reste signée par la cantine.
7. **Le privé d'abord** (obligé depuis 2024, décision rapide), le public ensuite (avec des références en poche).
8. **On monte d'un étage seulement quand le précédent tourne.**

---

## Avertissement honnête

Le prévisionnel (doc 06) repose sur des hypothèses explicites, à affiner avec les premiers vrais deals. Plusieurs points juridiques et fiscaux (statut d'intermédiaire alimentaire, commissionnaire de transport, franchise de TVA, mandat de facturation) sont signalés « **à confirmer** » : ils doivent l'être avec un expert-comptable et un avocat **avant** le premier contrat concerné, pas après. Ce sont les seuls endroits où une erreur coûte cher.
