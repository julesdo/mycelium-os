# Playbook 90 jours — Le logiciel de conformité EGalim

**Période : 15 août → 15 novembre 2026**
**Jules — serveur en restauration (Suresnes), ~15-20 h/semaine disponibles en journée, compétences digital/logiciel/vente, plateforme Mycelium déjà construite.**

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
> en euros, on montre les familles où le combler coûte le moins cher, et on en produit la
> preuve toute l'année. **Le logiciel fait le travail, le gérant confirme ce qui engage sa
> responsabilité.**

**On est un éditeur de logiciel qui vend une mesure :** « voilà où vous en êtes vraiment,
voilà ce qui manque, et voilà par où commencer. » On ne vend ni denrées, ni temps humain.

---

## Ce que tu vends pendant ces 90 jours

**Une seule chose : le diagnostic EGalim.** 690 € (< 250 couverts) / 1 190 € (250-800) / 1 900 € (> 800).

L'abonnement (190 / 290 / 390 €/mois) se vend **à la restitution du diagnostic**, jamais avant : le client vient de voir son chiffre, c'est le seul moment où l'abonnement se comprend tout seul.

> **Révision du 20 août 2026.** Le pilote de sourcing qui occupait le mois 3 est **supprimé** : il n'y a plus d'opérateur. Le mois 3 sert désormais à prouver que le produit s'utilise seul, ce qui est la question à laquelle tout le modèle économique est suspendu.

⚠️ **Le mot interdit : « garantie ».** On ne garantit jamais la conformité (elle dépend d'achats qu'on ne maîtrise pas). On **mesure**, on **fait progresser**, on **prouve**. La déclaration reste signée par le client. Voir [doc 06, section 8.3](business-plan/06-previsionnel-financier.md).

---

## Les règles du jeu (anti-dérive)

1. **On ne construit que ce que le journal de friction désigne**, chronométré. Unique exception : la Moulinette Audit, parce que c'est le produit vendu.
2. **Toute minute passée pour un client entre au journal de friction, avec sa cause.** C'est ce qui distingue un logiciel d'un service déguisé.
3. **On ne prend jamais la propriété des denrées, et on n'organise jamais de transport en son nom.** Ces lignes bornent ce qu'on s'autorise à devenir.
4. **On ne quitte pas le job.** Pas cette année.
5. **Le privé, en gestion directe, non équipé.** Le public et le concédé viendront avec des références.
6. **On ne passe à la preuve suivante que quand la précédente est faite** ([doc 07, section 1](business-plan/07-objectifs-court-long-terme.md)).

---

## MOIS 1 (15 août → 15 septembre) — ARMER
### Objectif : arriver au 15 septembre avec un outil qui marche, un fichier de 300 prospects et 15 rendez-vous calés. Zéro euro de chiffre d'affaires, et c'est normal : les cantines sont fermées.

### Semaine 1 (15-21 août) — Le fichier et la maîtrise du sujet

- [ ] **Maîtriser EGalim pour de vrai (3 h).** Les seuils, le barème de qualification ligne par ligne, la mécanique de calcul en valeur, le calendrier de déclaration. Support : [fiche EGalim](business-plan/10-fiche-egalim-1page.md). Test de maîtrise : savoir répondre sans hésiter à *« est-ce que le HVE compte dans le bio ? »* (non) et *« est-ce que le local compte ? »* (non).
- [ ] **Construire le fichier de prospection (2 jours).** Open data « ma cantine » + SIRENE par code NAF. Cible : **300 lignes** sur Hauts-de-Seine, Yvelines Est, Paris Ouest. Colonnes : nom · type (clinique / EHPAD / crèche / RIE / école privée) · commune · couverts estimés · **a déclaré ? ratio déclaré ?** · gestion directe supposée · contact · statut · prochain pas.
- [ ] **Qualifier 60 lignes prioritaires** : privé, gestion directe probable, 150-800 couverts, et si possible avec un ratio déclaré sous les seuils (c'est le meilleur point d'entrée d'appel).
- [ ] **Veille concurrentielle (½ journée).** Qui vend quoi en IDF sur ce sujet, à quel prix. Ne jamais entrer en rendez-vous en croyant qu'on est seul.

### Semaine 2 (22-28 août) — La Moulinette Audit

- [x] **Le moteur est construit** (phases 0 à 2, doc 05) : extraction CSV et PDF, normalisation des libellés, classification par Claude avec le référentiel en cache, barème, agrégation, file de confirmation, consensus, plafond de coût. Ce qui reste à faire cette semaine n'est pas du code moteur, c'est **la vérification**.
- [ ] **Non négociable : chaque ligne conserve sa justification et son indice de confiance**, et les libellés douteux partent en confirmation. Un rapport non auditable est invendable.
- [ ] **Générer le rapport type anonymisé** (le document qu'on montre en rendez-vous). C'est ton meilleur outil de vente : les gens achètent ce qu'ils voient.

### Semaine 3 (29 août - 4 septembre) — Tester, et ouvrir la boutique

- [ ] **Tester la Moulinette sur un vrai jeu de factures.** Où en trouver : un restaurateur du réseau (un restaurant a les mêmes factures fournisseurs qu'une cantine), ou le premier prospect qui accepte de te confier un mois d'essai gratuit.
- [ ] **Vérifier le résultat à la main, ligne par ligne, sur 100 lignes.** Compter les erreurs. **🚪 Si le taux d'erreur dépasse 5 %, on ne prospecte pas : on corrige.** Un rapport faux détruit la crédibilité pour de bon, et engage la responsabilité de conseil.
- [ ] **Ouvrir la micro-entreprise.** Prestation de services.
- [ ] **Souscrire la RC pro**, en vérifiant qu'elle couvre **explicitement le conseil et l'audit**.
- [ ] **Consultation expert-comptable (~250 €)** : régime de TVA et seuils applicables, micro-BNC ou BIC, calendrier de bascule en société. Les 3 questions sont dans [doc 06, section 8.10](business-plan/06-previsionnel-financier.md).
- [ ] **Préparer les documents commerciaux** : proposition de diagnostic type (2 pages), contrat de prestation avec la clause d'obligation de moyens et la clause de confidentialité, e-mail de demande de factures.
- [ ] **Préparer la démonstration produit** : un compte de démonstration alimenté par le jeu de factures anonymisé, ouvert en 10 secondes en rendez-vous. Les gens achètent ce qu'ils voient fonctionner, pas ce qu'on leur décrit.

### Semaine 4 (5-11 septembre) — Remplir l'agenda

- [ ] **80 appels sur les 60 lignes prioritaires** (avec relances). Script : [doc 09](business-plan/09-script-appel-cantine.md). L'accroche démarre **par le chiffre du prospect**.
- [ ] **Objectif : 15 rendez-vous calés** sur la deuxième quinzaine de septembre.
- [ ] Activer le réseau : contacts restauration, contact producteur. La question à poser systématiquement : *« tu connais qui, qui gère une cantine ou une cuisine collective ? »*
- [ ] Premiers messages LinkedIn ciblés + une publication sur le barème EGalim (le « local ne compte pas » fait toujours réagir).

**🚪 Gate fin M1 (15 septembre)** : la Moulinette produit un rapport juste (< 5 % d'erreur vérifiée à la main) · 300 prospects dont 60 qualifiés · **15 rendez-vous calés** · la démonstration produit prête · structure ouverte et assurée.
*Si les rendez-vous ne se calent pas : le problème est l'accroche, pas le marché. On la réécrit et on rappelle.*

---

## MOIS 2 (15 septembre → 15 octobre) — VENDRE
### Objectif : 2 diagnostics vendus et encaissés.

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
- [ ] Proposer les deux suites : rien, ou l'abonnement à 290 €/mois qui inclut la déclaration de mars. Une seule décision à prendre, c'est ce qui la rend prenable.
- [ ] **Publier le simulateur gratuit en ligne** (2 jours de dev, même moteur en version dégradée). C'est l'aimant à prospects de janvier, il doit être en ligne et testé bien avant.

**🚪 Gate fin M2 (15 octobre)** : **2 diagnostics vendus et encaissés** · 1 restitution faite · au moins 1 client qui demande une suite.
*Si aucun diagnostic n'est vendu : on change de segment cible (clinique → crèche, ou l'inverse) avant de changer quoi que ce soit d'autre. Le produit n'est pas en cause tant que 15 rendez-vous n'ont pas été faits.*

---

## MOIS 3 (15 octobre → 15 novembre) — PROUVER QUE ÇA S'UTILISE SEUL
### Objectif : un client abonné se sert du produit sans nous. C'est la question à laquelle tout le modèle économique est suspendu.

### Semaines 9-10 (15-28 octobre) — Élargir et convertir

- [ ] **10 rendez-vous supplémentaires**, avec un vrai rapport client (anonymisé) à montrer.
- [ ] **Viser 1 à 2 diagnostics de plus.**
- [ ] **Convertir le premier abonnement.** Le bon moment est la restitution, pas une relance trois semaines après.
- [ ] **Ouvrir l'accès produit au premier abonné** et le regarder s'en servir, en silence. Chaque hésitation est une entrée du journal de friction.

### Semaine 11 (29 octobre - 4 novembre) — Le test d'autonomie

- [ ] **Ne rien faire pour lui pendant une semaine.** Pas de relance, pas de dépôt à sa place, pas de confirmation à sa place.
- [ ] **Mesurer :** a-t-il déposé des factures ? confirmé des libellés ? consulté son taux ? Si la réponse est non trois fois, ce n'est pas lui le problème, c'est le produit.
- [ ] **Chronométrer notre propre temps passé pour ce client.** Cible : **≤ 30 min sur le mois**, hors vente.

### Semaines 12-13 (5-15 novembre) — Corriger et mesurer

- [ ] **Corriger les trois frictions les plus chères** relevées au journal, dans le produit, pas dans nos habitudes.
- [ ] **Produire la première preuve mensuelle automatique** : les points de ratio gagnés, chiffrés, sans intervention manuelle. Si elle demande du travail à la main, elle n'est pas finie.
- [ ] **Bilan honnête des 90 jours** : diagnostics vendus, taux de transformation à chaque étape, **temps réel passé par client**, ce qui a marché, ce qui a coûté du temps pour rien.

**🚪 Gate fin M3 (15 novembre)** : 3 à 4 diagnostics vendus · **1 abonnement signé** · le client a déposé des factures et confirmé des libellés **de lui-même** · notre temps par client sur le mois ≤ 30 min · le journal de friction désigne clairement la prochaine brique.

*Si le client ne s'en sert pas seul, on ne prospecte pas davantage : on corrige le produit. Vendre un service déguisé rétablit le plafond qu'on vient de supprimer.*

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

- ❌ Faire à la place du client ce que le produit doit faire (déposer, confirmer, relancer)
- ❌ Prononcer ou écrire le mot « garantie » à propos de la conformité
- ❌ Construire autre chose que ce que le journal de friction désigne
- ❌ Vendre du sourcing, du transport, ou quoi que ce soit qui touche une denrée
- ❌ Démarcher le public ou le concédé
- ❌ Ouvrir un deuxième bassin géographique
- ❌ Quitter le job

---

## Les 3 actions de cette semaine (15-21 août)

1. **Monter le fichier de prospection** : open data « ma cantine » + SIRENE, 300 lignes, 60 qualifiées. C'est le livrable qui conditionne tout le reste.
2. **Récupérer un vrai jeu de factures fournisseurs** pour tester la Moulinette. Un restaurateur du réseau est le chemin le plus court.
3. **Vérifier la Moulinette à la main sur 100 lignes.** C'est la seule preuve qui conditionne tout le reste : tant qu'elle n'est pas faite, il n'y a rien à vendre.

---

*Le besoin vient de la loi, pas de notre imagination. On vend le chiffre, et le logiciel le
produit. Toute minute qu'on passe à la place du client est un défaut du produit, pas un service.
Et on ne passe à la preuve suivante que quand la précédente est faite.*
