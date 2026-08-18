# Journal de décision — Le modèle initial abandonné (vente directe producteurs)

**Écrit le 22 juillet 2026 · Abandonné comme axe principal le 27 juillet 2026 · Révisé le 15 août 2026**

> **Statut : SUPERSÉDÉ.** Ce document décrivait le premier modèle envisagé : devenir apporteur
> d'affaires entre des producteurs (vin d'abord, puis épicerie) et des acheteurs professionnels
> (restaurants, bars à vin, cavistes, épiceries fines), rémunéré à la commission.
>
> Il est conservé pour trois raisons : **tracer la décision** (savoir pourquoi on a bifurqué évite
> d'y revenir par nostalgie dans six mois), **récupérer ce qui reste valable** (une bonne moitié
> du raisonnement se transpose tel quel), et **garder la porte ouverte** (c'est une adjacence
> crédible en année 3, pas une erreur).
>
> **Le plan en vigueur : [business-plan/00-README.md](business-plan/00-README.md).**

---

## 1. Ce que disait ce plan

> On donne aux producteurs français la capacité de vendre en direct, en leur fournissant
> l'infrastructure qu'ils n'ont pas : un commercial humain sur le terrain, et le digital qui va
> avec. On se rémunère à la commission sur les ventes qu'on apporte.

Trois phases : (1) un commercial humain qui vend pour le producteur · (2) le catalogue et la prise de commande en ligne · (3) l'**engagement d'achat garanti sur volume et prix**, qui devient un collatéral bancaire pour le producteur.

Cible d'entrée : les restaurants et cavistes de l'ouest parisien, en s'appuyant sur le fait que le fondateur travaille au Pompon et connaît le milieu.

---

## 2. Pourquoi on a bifurqué (les trois raisons, honnêtement)

**1. La demande était supposée, pas imposée.**
Un restaurateur *peut* vouloir une nouvelle cuvée. Une cantine *doit* atteindre 50 % de durable et le déclarer avant le 31 mars. Le premier modèle demandait de créer l'envie, le second répond à une obligation légale datée. **C'est la différence entre convaincre et être attendu.** À moyens égaux, c'est le facteur qui décide.

**2. La valeur d'un client était trop faible pour le temps investi.**
Le modèle prévoyait 600 à 900 € de panier mensuel par client, avec 15 % de commission : **90 à 135 € par client et par mois**. Il fallait 25 à 30 clients actifs pour remplacer un salaire, chacun demandant une visite, un réassort et un suivi. Une cantine sous abonnement Opérateur vaut **650 € par mois à elle seule**, et son cycle de vente n'est pas plus long. **Le rapport valeur/effort est cinq à sept fois meilleur.**

**3. Aucune barrière à l'entrée.**
Un agent commercial en vin est un métier vieux de deux siècles, sans verrou : le producteur ou l'acheteur peuvent court-circuiter dès que la relation existe. La clause contractuelle des 24 mois (section 5 ci-dessous) ne protège pas grand-chose en pratique. Sur EGalim, le verrou est réel : **l'historique de preuve accumulé chez un client ne se transfère pas**, et le référentiel de classification est un actif qui grossit.

**Ce qui n'était PAS une raison de bifurquer :** le marché du vin en direct existe et fonctionne. Ce plan n'était pas mauvais dans l'absolu. Il était moins bon **pour cette personne, à ce moment, avec ces contraintes** (temps limité, zéro capital, une plateforme logicielle déjà construite).

---

## 3. Ce qu'on garde et qui est passé dans le plan en vigueur

| Acquis du modèle initial | Où il vit maintenant |
|---|---|
| **Le montage apporteur d'affaires** (pas de stock, pas de trésorerie, le fournisseur facture et expédie) | Ligne rouge n° 1 du plan actuel : [doc 06, section 8.4](business-plan/06-previsionnel-financier.md) |
| **La règle « on ne code rien avant d'avoir fait dix fois à la main »** | Règle d'or du [doc 05](business-plan/05-produit-roadmap-tech.md), avec une exception assumée (la Moulinette) |
| **Le journal de friction** comme seul cahier des charges légitime | [Doc 05, section 5](business-plan/05-produit-roadmap-tech.md) et rythme hebdo du playbook |
| **La lecture saisonnière du calendrier** (août mort, septembre décisif) | Devenu le pilier du plan commercial : [doc 04, section 1](business-plan/04-go-to-market-closing.md) |
| **Le refus du frais fragile au démarrage** (la chaîne du froid tue avant que le modèle soit prouvé) | Devenu le critère de sélection des familles de produits du pilote : [doc 03, section 5](business-plan/03-modele-offre-pricing.md) |
| **La thèse du levier financier** (un débouché garanti est un collatéral bancaire pour le producteur) | Conservée intacte, décalée à l'étage 4 mûr. C'est toujours la vision de fond |
| **Les gates de décision** et les scénarios A/B/C | Généralisés en critères d'abandon par étage : [doc 07, section 1](business-plan/07-objectifs-court-long-terme.md) |
| **Le réseau** (Le Pompon, le contact producteur, la famille de la marraine) | Toujours le premier canal d'acquisition |
| **La règle « on ne quitte pas le job »** | Durcie et chiffrée : MRR ≥ 1,5 × seuil, 3 mois de suite ([doc 06, section 5](business-plan/06-previsionnel-financier.md)) |

**C'est beaucoup.** Le pivot n'a pas jeté le raisonnement, il a changé de client.

---

## 4. Le script d'entretien producteur (toujours valable, à réutiliser tel quel)

Il fonctionne pour qualifier n'importe quel producteur, quel que soit le débouché. À poser en entretien, avec des notes, pas en discussion informelle.

1. Aujourd'hui, tu vends combien, et réparti comment (coopérative, négoce, grossiste, vente directe, marchés, collectivités) ?
2. **Quel prix net tu touches sur chaque canal ?** ← *la question la plus importante : elle détermine si notre commission est tenable pour lui*
3. Il te reste combien de stock ou de capacité non écoulée, là, maintenant ?
4. Tu voudrais vendre plus en direct ? Qu'est-ce qui t'en empêche exactement ?
5. Tu livres toi-même ? Sous quel délai, quel jour, quel minimum de commande, quel rayon ?
6. Tu as déjà livré des cantines ou des collectivités ? Qu'est-ce qui a bloqué ?
7. Un débouché garanti sur l'année, ça t'intéresse à quel point ?
8. Tes labels (bio, en conversion, Label Rouge, HVE, AOP/IGP) : où tu en es, et où tu veux aller ?

> **La question 5 est devenue éliminatoire dans le plan actuel.** Tant que l'étage 5 n'est pas
> ouvert, un producteur qui ne livre pas lui-même n'est pas enrôlable.
> La question 2 fixe la règle : son prix net, commission déduite, doit dépasser d'au moins 15 %
> son meilleur canal actuel.

---

## 5. La clause anti-court-circuit (conservée, avec sa limite)

> « Toute commande passée par un client présenté par [nous] au producteur donne lieu au versement
> de la commission convenue, pour une durée de 24 mois à compter de la première commande, que la
> commande transite ou non par [nous]. »

À faire figurer dans les contrats producteurs. **Mais il faut connaître sa vraie valeur : faible.** La protection réelle n'est pas juridique, elle est opérationnelle : être celui sans qui le réassort, la mesure et la preuve ne se font pas. C'est exactement pour ça que le plan actuel entre par la mesure et pas par le négoce.

⚠️ **[À CONFIRMER]** avant usage : la frontière entre apporteur d'affaires et **agent commercial** (statut protecteur, avec indemnité de fin de contrat due par le mandant) se qualifie sur les faits, pas sur l'intitulé du contrat. Voir [doc 06, section 8.7](business-plan/06-previsionnel-financier.md).

---

## 6. Ce qui est définitivement abandonné

- ❌ Le **vin** comme produit d'entrée. Loi Evin, accises, DAE, capsules CRD, cycle de décision long, aucun levier réglementaire côté acheteur. Beaucoup de complexité pour un panier modeste.
- ❌ La **cible restaurant / caviste / épicerie fine** comme marché principal. Valeur client trop faible, aucune obligation légale, aucune barrière à l'entrée.
- ❌ Le **test B2C** (soirée dégustation, collecte d'e-mails). Sympathique, hors sujet.
- ❌ Le **partage de matériel agricole**, déjà reporté à l'époque. Reste au parking.

---

## 7. Quand ce modèle pourrait revenir (l'adjacence, en année 3)

Il ne revient **jamais comme axe principal**. Mais il devient une extension naturelle une fois qu'un actif précis existe : **un réseau dense de producteurs qualifiés sur un bassin.**

À ce moment-là, le même réseau peut servir un second débouché — restaurants indépendants, épiceries, traiteurs — **sans coût d'acquisition côté producteur, qui est le poste le plus cher**. La commission d'apport devient un revenu marginal sur un actif déjà payé par l'activité EGalim.

**Conditions cumulatives pour rouvrir le sujet :**

1. ≥ 15 producteurs actifs et fiables sur un bassin.
2. L'activité EGalim rentable et outillée (le fondateur n'est plus dans l'opérationnel quotidien).
3. Une demande **entrante** de la part des producteurs eux-mêmes (« tu ne pourrais pas m'aider à placer le reste ? »). **Si la demande ne vient pas d'eux, on ne le fait pas.**

**Avant l'année 3, ce sujet ne se rouvre pas.** Il est ici pour être retrouvé, pas pour être relancé.
