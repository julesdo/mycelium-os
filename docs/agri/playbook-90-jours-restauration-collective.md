# Playbook 90 jours — Opérateur de la conformité EGalim

**Période : 15 août → 15 novembre 2026**
**Jules — serveur au Pompon (Suresnes), ~15-20 h/semaine disponibles en journée, compétences digital/logiciel/vente, plateforme Mycelium déjà construite.**

> **Révision du 15 août 2026.** Le playbook de juillet visait « 1 pilote signé fin M1 ». Il
> supposait qu'on pouvait vendre du sourcing à un inconnu en trois semaines, en plein mois d'août,
> avec zéro référence. On corrige deux choses : **on entre par le diagnostic** (un « oui » à 690 €
> se décroche, un « oui » à 600 €/mois se mérite), et **on cale le calendrier sur la saison**
> (août = préparation, septembre = vente).
>
> Stratégie complète : [business-plan/00-README.md](business-plan/00-README.md).

---

## L'entreprise en une phrase

> On calcule le vrai taux EGalim des cantines à partir de leurs factures, on chiffre l'écart
> en euros, on le comble par du sourcing local, et on en produit la preuve chaque mois.
> 80 % humain (sourcing, coordination, relation), 20 % logiciel (la mesure et la preuve).

**On n'est pas un SaaS. On est un opérateur qui vend un résultat mesuré :**
« voilà où vous en êtes vraiment, voilà ce qui manque, et voilà comment on va le chercher. »

---

## Ce que tu vends pendant ces 90 jours

**Une seule chose : le diagnostic EGalim.** 690 € (< 250 couverts) / 1 190 € (250-800) / 1 900 € (> 800).

Le pilote de sourcing arrive en novembre, **chez un client qui a déjà payé un diagnostic**. Pas avant. C'est tout le changement par rapport au plan de juillet : on ne demande pas à un inconnu de nous confier son approvisionnement, on lui vend d'abord un chiffre qu'il ne connaît pas.

⚠️ **Le mot interdit : « garantie ».** On ne garantit jamais la conformité (elle dépend d'achats qu'on ne maîtrise pas). On **mesure**, on **fait progresser**, on **prouve**. La déclaration reste signée par le client. Voir [doc 06, section 8.3](business-plan/06-previsionnel-financier.md).

---

## Les règles du jeu (anti-dérive)

1. **Une seule brique logicielle sur les 90 jours : la Moulinette Audit.** Parce que c'est le produit vendu, pas de l'outillage. Tout le reste reste en tableur et en mail.
2. **On ne prend jamais la propriété des denrées.** Le producteur facture et livre en direct.
3. **On n'organise jamais de transport en notre nom.** Au pilote : uniquement des producteurs qui livrent eux-mêmes.
4. **On ne quitte pas le job.** Pas cette année.
5. **Le privé, en gestion directe, non équipé.** Le public et le concédé viendront avec des références.
6. **On ne monte pas d'étage tant que le précédent ne tourne pas.**

---

## MOIS 1 (15 août → 15 septembre) — ARMER
### Objectif : arriver au 15 septembre avec un outil qui marche, un fichier de 300 prospects et 15 rendez-vous calés. Zéro euro de chiffre d'affaires, et c'est normal : les cantines sont fermées.

### Semaine 1 (15-21 août) — Le fichier et la maîtrise du sujet

- [ ] **Maîtriser EGalim pour de vrai (3 h).** Les seuils, le barème de qualification ligne par ligne, la mécanique de calcul en valeur, le calendrier de déclaration. Support : [fiche EGalim](business-plan/10-fiche-egalim-1page.md). Test de maîtrise : savoir répondre sans hésiter à *« est-ce que le HVE compte dans le bio ? »* (non) et *« est-ce que le local compte ? »* (non).
- [ ] **Construire le fichier de prospection (2 jours).** Open data « ma cantine » + SIRENE par code NAF. Cible : **300 lignes** sur Hauts-de-Seine, Yvelines Est, Paris Ouest. Colonnes : nom · type (clinique / EHPAD / crèche / RIE / école privée) · commune · couverts estimés · **a déclaré ? ratio déclaré ?** · gestion directe supposée · contact · statut · prochain pas.
- [ ] **Qualifier 60 lignes prioritaires** : privé, gestion directe probable, 150-800 couverts, et si possible avec un ratio déclaré sous les seuils (c'est le meilleur point d'entrée d'appel).
- [ ] **Veille concurrentielle (½ journée).** Qui vend quoi en IDF sur ce sujet, à quel prix. Ne jamais entrer en rendez-vous en croyant qu'on est seul.

### Semaine 2 (22-28 août) — La Moulinette Audit

- [ ] **Construire la V0 (3 à 5 jours).** Extraction des lignes (CSV et PDF texte d'abord, OCR plus tard) → classification par Claude avec le référentiel en cache → agrégation des ratios → rapport. Spécification complète : [doc 05, section 1](business-plan/05-produit-roadmap-tech.md).
- [ ] **Non négociable : chaque ligne conserve sa justification et son indice de confiance**, et les lignes douteuses partent en revue humaine. Un rapport non auditable est invendable.
- [ ] **Générer le rapport type anonymisé** (le document qu'on montre en rendez-vous). C'est ton meilleur outil de vente : les gens achètent ce qu'ils voient.

### Semaine 3 (29 août - 4 septembre) — Tester, et ouvrir la boutique

- [ ] **Tester la Moulinette sur un vrai jeu de factures.** Où en trouver : le patron du Pompon (un restaurant a les mêmes factures fournisseurs qu'une cantine), ou le premier prospect qui accepte de te confier un mois d'essai gratuit.
- [ ] **Vérifier le résultat à la main, ligne par ligne, sur 100 lignes.** Compter les erreurs. **🚪 Si le taux d'erreur dépasse 5 %, on ne prospecte pas : on corrige.** Un rapport faux détruit la crédibilité pour de bon, et engage la responsabilité de conseil.
- [ ] **Ouvrir la micro-entreprise.** Prestation de services.
- [ ] **Souscrire la RC pro**, en vérifiant qu'elle couvre **explicitement le conseil et l'audit**.
- [ ] **Consultation expert-comptable (~250 €)** : régime de TVA et seuils applicables, micro-BNC ou BIC, calendrier de bascule en société. Les 3 questions sont dans [doc 06, section 8.10](business-plan/06-previsionnel-financier.md).
- [ ] **Préparer les documents commerciaux** : proposition de diagnostic type (2 pages), contrat de prestation avec la clause d'obligation de moyens et la clause de confidentialité, e-mail de demande de factures.
- [ ] **Qualifier 1 producteur** (épicerie sèche bio ou légumes de garde bio) **qui livre déjà lui-même**. Questions : volumes disponibles, prix départ ferme, labels effectifs, capacité à tenir une livraison hebdomadaire régulière, ce qu'il touche aujourd'hui sur son meilleur canal. **Cette dernière question est la plus importante : elle détermine si notre commission est tenable pour lui.**

### Semaine 4 (5-11 septembre) — Remplir l'agenda

- [ ] **80 appels sur les 60 lignes prioritaires** (avec relances). Script : [doc 09](business-plan/09-script-appel-cantine.md). L'accroche démarre **par le chiffre du prospect**.
- [ ] **Objectif : 15 rendez-vous calés** sur la deuxième quinzaine de septembre.
- [ ] Activer le réseau : patron du Pompon, contacts restauration, contact producteur. La question à poser systématiquement : *« tu connais qui, qui gère une cantine ou une cuisine collective ? »*
- [ ] Premiers messages LinkedIn ciblés + une publication sur le barème EGalim (le « local ne compte pas » fait toujours réagir).

**🚪 Gate fin M1 (15 septembre)** : la Moulinette produit un rapport juste (< 5 % d'erreur vérifiée à la main) · 300 prospects dont 60 qualifiés · **15 rendez-vous calés** · 1 producteur qualifié · structure ouverte et assurée.
*Si les rendez-vous ne se calent pas : le problème est l'accroche, pas le marché. On la réécrit et on rappelle.*

---

## MOIS 2 (15 septembre → 15 octobre) — VENDRE
### Objectif : 2 diagnostics vendus et encaissés. Toujours zéro sourcing.

### Semaines 5-6 (15-28 septembre) — Les rendez-vous

- [ ] **15 rendez-vous de 30 minutes.** Objectif de chacun : vendre un diagnostic, pas expliquer le modèle.
- [ ] Toujours apporter **le rapport type anonymisé**. Le montrer dans les 5 premières minutes.
- [ ] Après chaque rendez-vous : noter l'objection principale dans le fichier. Au bout de 10 rendez-vous, **les objections se répètent** : c'est le script commercial qui se corrige tout seul.
- [ ] **Viser 2 signatures.** Taux attendu : environ 1 diagnostic vendu pour 5 rendez-vous au début, mieux ensuite.

### Semaine 7 (29 septembre - 5 octobre) — Produire le premier diagnostic

- [ ] Récupérer les factures. **Demander en priorité l'export comptable ou l'accès au portail du grossiste** : ça économise 80 % du travail d'extraction.
- [ ] Passer la Moulinette, **arbitrer à la main les lignes douteuses**, identifier les **points gratuits** (produits probablement labellisés sans justificatif sur la facture).
- [ ] Rédiger le rapport : ratio réel · décomposition par famille et par fournisseur · écart en euros · **les courriers d'attestation à envoyer aux fournisseurs** · le plan de comblement par les 2 familles prioritaires · la simulation à budget constant · le fichier de saisie « ma cantine ».
- [ ] **Chronométrer chaque étape.** C'est la première entrée du journal de friction, et c'est ce qui dira quoi automatiser ensuite.

### Semaine 8 (6-12 octobre) — La restitution, et le simulateur

- [ ] **Restitution sur site, 1 heure**, dans l'ordre exact du [doc 09, section 7](business-plan/09-script-appel-cantine.md) : le chiffre → d'où ça vient → les points gratuits → la trajectoire vers 50/20 → les trois portes de sortie.
- [ ] **Les points gratuits avant toute proposition commerciale.** La réciprocité fait le reste.
- [ ] Proposer les trois suites : rien / abonnement Conformité 290 € / pilote de sourcing 6 semaines.
- [ ] **Publier le simulateur gratuit en ligne** (2 jours de dev, même moteur en version dégradée). C'est l'aimant à prospects de janvier, il doit être en ligne et testé bien avant.

**🚪 Gate fin M2 (15 octobre)** : **2 diagnostics vendus et encaissés** · 1 restitution faite · au moins 1 client qui demande une suite.
*Si aucun diagnostic n'est vendu : on change de segment cible (clinique → crèche, ou l'inverse) avant de changer quoi que ce soit d'autre. Le produit n'est pas en cause tant que 15 rendez-vous n'ont pas été faits.*

---

## MOIS 3 (15 octobre → 15 novembre) — PROUVER
### Objectif : le premier pilote de sourcing tourne, chez un client qui a déjà payé un diagnostic.

### Semaines 9-10 (15-28 octobre) — Élargir et cadrer

- [ ] **10 rendez-vous supplémentaires**, avec un vrai rapport client (anonymisé) à montrer. L'argument devient nettement plus fort.
- [ ] **Viser 1 à 2 diagnostics de plus.**
- [ ] **Cadrer le pilote** avec le client le plus chaud :
  - **Deux familles seulement** : épicerie sèche bio + légumes de garde bio. Rationnel complet : [doc 03, section 5](business-plan/03-modele-offre-pricing.md).
  - **Un producteur qui livre lui-même.** Aucun transporteur tiers.
  - Durée : **6 semaines**. Objectif chiffré : **+15 points de ratio, à budget matière constant, zéro rupture**.
  - Le producteur **facture et livre la cantine en direct**. On coordonne, on mesure, on ne touche jamais la marchandise.
  - Accord d'une page de chaque côté.
- [ ] **Vérifier la règle producteur** : son prix net, commission déduite, doit dépasser d'au moins 15 % son meilleur canal actuel. Sinon on renégocie le prix de vente, ou on ne le prend pas.

### Semaine 11 (29 octobre - 4 novembre) — Démarrer

- [ ] **Premier cycle réel** : le chef envoie ses besoins → tu passes commande au producteur → il livre la cuisine → tu contrôles la réception et tu enregistres les lignes.
- [ ] **Être présent physiquement à la première livraison.** C'est là qu'on apprend tout : les horaires réels de la cuisine, les contenants, le quai, qui réceptionne, ce qui coince.
- [ ] Ouvrir le suivi du pilote : produit, quantité, prix, label, montant HT, date. **Ce sont les lignes qui alimenteront la preuve.**

### Semaines 12-13 (5-15 novembre) — Faire tourner et mesurer

- [ ] **Cycles hebdomadaires**, à la main, sans exception.
- [ ] **Journal de friction** tenu chaque semaine : chaque tâche répétitive et le temps qu'elle prend. C'est le seul cahier des charges légitime pour la suite du logiciel.
- [ ] **Produire la première preuve mensuelle** : les points de ratio gagnés grâce au pilote, chiffrés, remis en main propre.
- [ ] **Bilan honnête des 90 jours** : diagnostics vendus, taux de transformation à chaque étape, temps réel passé, ce qui a marché, ce qui a coûté du temps pour rien.

**🚪 Gate fin M3 (15 novembre)** : 3 à 4 diagnostics vendus · le pilote tourne sans incident · au moins **1 abonnement Conformité signé ou en négociation** · le journal de friction désigne clairement la prochaine brique logicielle.

---

## Le rythme hebdomadaire (à tenir, c'est la seule discipline qui compte)

| Quand | Quoi |
|---|---|
| **Lundi matin** | Commandes du pilote · relances de la semaine · mise à jour du fichier |
| **Mardi et jeudi après-midi** | **Rendez-vous et appels.** Créneaux bloqués, non négociables |
| **Mercredi** | Production (diagnostics, rapports) |
| **Vendredi matin** | Journal de friction · tableau de bord (5 indicateurs, [doc 07 section 4](business-plan/07-objectifs-court-long-terme.md)) · préparation de la semaine suivante |

**15-20 h par semaine suffisent si elles sont protégées.** Ce qui tue ce genre de projet, ce n'est pas le manque d'heures, c'est leur dispersion.

---

## Ce qu'on NE fait PAS pendant ces 90 jours

- ❌ Vendre du sourcing à quelqu'un qui n'a pas payé de diagnostic
- ❌ Toucher à la logistique, à un transporteur, à un montage de prix livré
- ❌ Prendre la propriété d'une seule denrée
- ❌ Prononcer ou écrire le mot « garantie » à propos de la conformité
- ❌ Construire autre chose que la Moulinette et le simulateur
- ❌ Démarcher le public ou le concédé
- ❌ Ajouter une troisième famille de produits au pilote
- ❌ Quitter le job

---

## Les 3 actions de cette semaine (15-21 août)

1. **Monter le fichier de prospection** : open data « ma cantine » + SIRENE, 300 lignes, 60 qualifiées. C'est le livrable qui conditionne tout le reste.
2. **Récupérer un vrai jeu de factures fournisseurs** pour tester la Moulinette. Le patron du Pompon est le chemin le plus court.
3. **Appeler le contact producteur** avec une seule question qui compte : *« aujourd'hui, tu touches combien au kilo sur ton meilleur canal, et tu livres toi-même ou pas ? »*

---

*Le besoin vient de la loi, pas de notre imagination. On vend d'abord le chiffre, ensuite la
solution. On ne code que ce qu'on a déjà fait dix fois à la main — sauf la Moulinette, qui est
le produit lui-même. Et on ne monte pas d'étage tant que le précédent ne tourne pas.*
