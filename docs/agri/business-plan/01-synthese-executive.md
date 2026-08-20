# 01 — Synthèse exécutive

*Révision du 20 août 2026 : Mycelium devient un éditeur de logiciel. L'échelle de valeur en six
étages est ramenée à deux offres, et le modèle « 80 % humain, 20 % logiciel » est renversé.*

## Le problème (documenté, pas supposé)

La loi EGalim impose à **toute** la restauration collective, publique comme privée, de servir
**≥ 50 % de produits durables et de qualité dont ≥ 20 % bio** (en valeur d'achat), et de le
**déclarer chaque année** sur la plateforme « ma cantine » avant le 31 mars.

La réalité, chiffres officiels 2024 (sur données d'achat 2023) :

- **15 %** seulement des établissements déclarants atteignent le seuil de 50 % de durable.
- **30 %** seulement atteignent les 20 % de bio.
- **21 %** seulement des sites concernés **déclarent** (les 79 % restants sont en défaut sur
  l'obligation même de déclaration).
- Sur l'ensemble du secteur, le bio représente **moins de 6 %** des achats (Agence Bio 2024).

Autrement dit : **~85 % des cantines déclarantes ne sont pas conformes**, et **79 % des sites ne
déclarent rien du tout**. Le privé n'est obligé que depuis le 1ᵉʳ janvier 2024 : c'est le segment
le plus neuf, le moins équipé, le plus accessible.

**Mais la vraie douleur est en amont de tout ça :**

> La plupart des gérants **ne connaissent pas leur propre chiffre**. Ils ne savent pas s'ils sont
> à 8 % ou à 34 % de durable, parce que le calcul se fait **en valeur d'achat, ligne à ligne, sur
> douze mois de factures fournisseurs**. Personne n'a le temps de faire ça à la main.

C'est cette ignorance, et pas le manque de produits locaux, qui est le point d'entrée
commercial. On ne vend pas d'abord une solution : on vend **la mesure**.

## La solution : un logiciel, un abonnement, une porte d'entrée

**Le premier diagnostic.** Le client dépose douze mois de factures, de préférence en export
comptable. Le logiciel extrait, normalise les libellés, classe chaque libellé contre le barème
légal avec une justification et un indice de confiance, fait confirmer au gérant ce qui engage
sa responsabilité, et sort les trois taux réels avec **l'écart chiffré en euros** : *« il vous
manque 41 000 € d'achats qualifiants par an, dont 28 000 € de bio, et voici les trois familles
où les combler coûte le moins cher. »* 690 à 1 900 €, produit pour quelques euros d'API.

**L'abonnement.** 190 à 390 €/mois. Le chiffre suivi toute l'année au fil des factures
déposées, la file de confirmation qui s'allège d'un exercice à l'autre, les alertes de dérive,
les certificats datés, les courriers de demande d'attestation aux fournisseurs, et la
télédéclaration incluse.

**En option, de janvier à mars :** la télédéclaration seule, 290 €, pour un non-abonné. C'est
une porte d'entrée saisonnière.

## Ce que le changement d'axe déplace

C'est le point central de cette révision, et il n'est pas comptable.

L'ancien plan montait vers un métier d'opérateur : sourcing de producteurs, coordination des
commandes, puis orchestration logistique. Le revenu principal venait d'un abonnement opérateur à
650 €/mois qui consommait **une heure de coordination par semaine et par client**. Un fondateur
seul y saturait à 8 ou 10 clients, et la croissance supposait d'embaucher pour livrer.

Dans le modèle logiciel, livrer un client de plus ne coûte presque rien, et **le coût décroît
avec la base installée** : un libellé confirmé l'est définitivement, et le consensus entre
clients retire des libellés de la file de tout le monde. Le centième client démarre sur un socle
que les quatre-vingt-dix-neuf premiers ont construit.

**Le plafond change donc de nature : il n'est plus dans la livraison, il est dans l'acquisition.**
On n'embauche plus pour livrer, on investit pour distribuer.

Le prix à payer est explicite : **un abonné rapporte 290 €/mois au lieu de 650 € plus
commission**, ce qui coûte 24 % du chiffre d'affaires de l'année 1 et repousse d'environ quatre
mois la sortie de l'emploi salarié. Le détail est chiffré au [doc 06](06-previsionnel-financier.md).

## Les deux lignes rouges, maintenues

Elles ne bornent plus une activité en cours, elles bornent ce qu'on s'autorise à devenir :

1. **On ne prend jamais la propriété des denrées.**
2. **On n'organise jamais le transport en son nom propre.** (statut de commissionnaire de
   transport, réglementé)

Et un mot interdit : **« garantie »**. On ne garantit jamais la conformité. On la **mesure**, on
la **fait progresser**, on la **prouve**. La déclaration reste signée par la cantine. Un test
automatisé vérifie que le mot n'apparaît pas dans le produit.

## Le marché

- **~3,6 milliards de repas/an**, **~19–21 Md€** de chiffre d'affaires secteur, **~75 000 sites**
  en France.
- Le cœur de cible n'est pas « toutes les cantines » mais **les non-équipées** : les 79 % qui ne
  déclarent pas, c'est-à-dire les petites et moyennes cantines privées sans logiciel de gestion
  (RIE, cliniques, crèches, EHPAD privés, écoles privées).
- Entrée : **restauration collective privée en gestion directe, Île-de-France Ouest**
  (Hauts-de-Seine / La Défense = la plus forte densité de cantines d'entreprise de France, à côté
  du fondateur).

## Le modèle économique et la trajectoire

| | Fin Année 1<br>(août 2027) | Fin Année 2<br>(août 2028) | Fin Année 3<br>(août 2029) |
|---|---|---|---|
| Diagnostics vendus (cumul annuel) | 14 | 35 | 80 |
| Abonnés | 10 | 38 | 110 |
| **Chiffre d'affaires** | **~29 k€** | **~120 k€** | **~338 k€** |
| Équipe | Fondateur seul | +1 (acquisition) | 3 à 4 |

L'année 1 démarre en **septembre 2026** : les cantines sont fermées en août, et le calendrier
commercial du secteur est saisonnier (voir doc 04). Le pic de vente est **janvier–mars**, pendant
la campagne de télédéclaration.

## Le seuil de sortie du job (dit honnêtement)

Le revenu one-shot franchit le seuil de remplacement du salaire de serveur dès février-mars 2027.
Mais un one-shot ne se reproduit pas tout seul.

> **Règle : on ne quitte le job que quand le RÉCURRENT seul couvre 1,5 fois le seuil, trois mois
> de suite** (soit ≥ 4 800 €/mois de MRR), c'est-à-dire **17 abonnés**. Attendu au **premier
> trimestre 2028 (M17–M19)**.
>
> Le facteur 1,5 absorbe un churn, un mois creux et un impayé : c'est ce qui évite de se remettre
> sous pression de trésorerie au pire moment.

C'est quatre mois plus tard que dans l'ancien plan. En contrepartie, 17 abonnés logiciel tiennent
tout seuls, là où 13 clients dont quatre en coordination hebdomadaire ne tiennent que tant que le
fondateur tient.

## Le besoin de financement

**Quasi nul au démarrage : ~970 €** (détail doc 06). Modèle asset-light, besoin en fonds de
roulement structurellement négatif, revenu dès le deuxième mois. Bootstrap via le revenu de
serveur. Aides mobilisables (ACRE, prêt d'honneur, PAT, ADEME) au passage à l'échelle, sans
dilution obligatoire.

## Pourquoi ça marche

1. La demande est **imposée par la loi**, pas à créer, et elle a un **calendrier annuel** qui
   crée un pic de besoin prévisible, chaque année, à vie.
2. Le produit ne coûte **que quelques euros d'API** à livrer et ne fait courir **aucun risque
   opérationnel** : c'est du calcul sur des factures.
3. **Le coût marginal décroît avec la base installée**, grâce au consensus de classification.
   C'est une économie que le modèle de service n'avait pas.
4. Le diagnostic **qualifie le prospect mieux qu'un commercial** : on sort du rendez-vous en
   connaissant son budget, ses fournisseurs et son écart en euros. Et le client l'a payé.
5. Trois classes de risque juridique lourdes (exploitant du secteur alimentaire, commissionnaire
   de transport, mandat de facturation) **ont disparu du plan** avec l'activité qui les portait.
6. Le fondateur a les compétences clés (logiciel, produit, vente) et un **avantage géographique**
   (La Défense).
