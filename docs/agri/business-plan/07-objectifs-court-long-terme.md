# 07 — Objectifs, jalons & risques

*Révision du 15 août 2026 : les objectifs sont désormais organisés par étage de l'échelle de
valeur, chacun avec son déclencheur d'ouverture et son critère d'abandon.*

---

## 1. Les six étages : déclencheur, objectif, critère d'abandon

C'est le tableau de pilotage principal du projet. **On ne monte pas d'un étage tant que le précédent ne tourne pas**, et on redescend sans état d'âme si un critère d'abandon est atteint.

### Étage 0 — Diagnostic

| | |
|---|---|
| **Déclencheur** | La Moulinette Audit produit un rapport correct sur un vrai jeu de factures |
| **Objectif A1** | 14 diagnostics vendus et encaissés |
| **Signal de succès** | Le client dit « je ne connaissais pas ce chiffre » et demande la suite |
| **Critère d'abandon** | **< 2 diagnostics vendus fin octobre 2026.** Alors le problème est le discours ou la cible, pas le rythme d'appels. On change de segment (cliniques → crèches, ou l'inverse) avant de changer quoi que ce soit d'autre. |

### Étage 1 — Déclaration assistée

| | |
|---|---|
| **Déclencheur** | Janvier 2027, campagne de télédéclaration ouverte |
| **Objectif A1** | 8 déclarations vendues sur janvier-mars |
| **Signal de succès** | Des demandes entrantes non sollicitées en février-mars |
| **Critère d'abandon** | Aucun : le coût marginal est quasi nul quand le diagnostic existe. Si ça ne prend pas, c'est un produit d'appel qui n'a rien coûté. |

### Étage 2 — Abonnement Conformité

| | |
|---|---|
| **Déclencheur** | Le portail client V1 permet de tenir 10 abonnés sans y passer ses journées |
| **Objectif A1** | 7 abonnés en sortie · **taux de conversion diagnostic → abonnement ≥ 45 %** |
| **Signal de succès** | Un client renouvelle à 12 mois sans négocier |
| **Critère d'abandon** | **Conversion < 20 % sur 8 diagnostics consécutifs.** Alors soit le prix est faux, soit la restitution ne vend pas la suite. On corrige la restitution en premier (c'est gratuit), le prix ensuite. |

### Étage 3 — Pilote Substitution

| | |
|---|---|
| **Déclencheur** | 1 producteur qualifié qui livre lui-même + 1 client qui a acheté un diagnostic |
| **Objectif A1** | 1 pilote réussi avant fin décembre 2026 |
| **Signal de succès** | **+15 points de ratio mesurés, zéro rupture sur 6 semaines**, et le chef qui redemande la semaine suivante |
| **Critère d'abandon** | **≥ 2 incidents d'approvisionnement** sur le pilote. Alors le producteur n'est pas au niveau institutionnel : on en change avant d'accuser le modèle. |

### Étage 4 — Abonnement Opérateur

| | |
|---|---|
| **Déclencheur** | Le pilote validé + le client qui demande à continuer en payant |
| **Objectif A1** | 3 abonnés en sortie |
| **Signal de succès** | Le client élargit de lui-même à une 3ᵉ famille de produits |
| **Critère d'abandon** | **Plus de 90 min/semaine/client de coordination après 3 mois.** Alors le modèle ne scale pas à la main : on arrête d'en signer et on construit la V2 (prise de commande) avant de reprendre. |

### Étage 5 — Orchestration logistique

| | |
|---|---|
| **Déclencheur** | **Les 4 conditions cumulatives** : ≥ 6 cantines dans 25 km · ≥ 3 producteurs qui ne livrent pas · montage juridique validé par avocat · transporteur contractualisé avec SLA |
| **Objectif** | Aucun avant l'année 2. **C'est volontaire.** |
| **Signal de succès** | ≥ 97 % de ponctualité sur 3 mois, aucune rupture de chaîne du froid |
| **Critère d'abandon** | Toute exposition au statut de commissionnaire de transport, ou tout coût transport porté sur nos livres. **Ce sont des lignes rouges, pas des arbitrages.** Voir [doc 08](08-logistique-3pl-scouting.md). |

---

## 2. Objectifs à court terme (année 1)

### Août 2026 — Armer (aucune vente, c'est le plan)
- Fichier de prospection IDF Ouest : 300 lignes, 60 qualifiées.
- **Moulinette Audit V0 testée sur de vraies factures.**
- 1 producteur qualifié qui livre lui-même (épicerie sèche ou légumes de garde).
- 15 rendez-vous calés pour la première quinzaine de septembre.
- Micro-entreprise ouverte, RC pro souscrite, contrats types prêts.
- ✅ *Gate : la Moulinette sort un ratio juste sur un vrai jeu de factures, vérifié à la main.*

### Septembre–décembre 2026 — Prouver que ça se vend
- 4 diagnostics vendus, 1 pilote réussi, 1 abonnement Conformité signé.
- Simulateur public en ligne.
- ✅ *Gate fin octobre : 2 diagnostics encaissés.*
- ✅ *Gate fin décembre : 1 abonnement récurrent + le pilote validé par le chef.*

### Janvier–mars 2027 — Exploiter la fenêtre
- 8 diagnostics + 8 déclarations sur le trimestre.
- 3 abonnés Conformité, 1 abonné Opérateur.
- ✅ *Gate fin mars : 12 diagnostics cumulés, conversion ≥ 35 %.*

### Avril–août 2027 — Transformer le one-shot en récurrent
- 7 abonnés Conformité, 3 abonnés Opérateur, MRR 4 430 €.
- 4 à 6 producteurs actifs, tous livrant eux-mêmes.
- Préparation de la bascule en SASU.
- ✅ *Gate fin août : MRR ≥ 4 000 € et conversion diagnostic → abonnement ≥ 40 %.*

---

## 3. Objectifs à long terme

### Année 2 (sept. 2027 → août 2028) — Structurer
- **24 abonnés Conformité, 14 abonnés Opérateur, ~193 k€.**
- Sortie de l'emploi de serveur à l'automne 2027 (règle du MRR × 1,5, doc 06 section 5).
- Bascule en SASU, **première embauche** (ops/sourcing) à mi-année.
- Bassin Hauts-de-Seine saturé (≥ 15 clients, ≥ 8 producteurs), ouverture du 2ᵉ bassin.
- Premières références **publiques** (écoles, collectivités) grâce au track record privé.
- Chantier juridique : **mandat de facturation** (facture consolidée).
- Décision sur l'étage 5 : les 4 conditions sont-elles réunies ?

### Année 3 (sept. 2028 → août 2029) — Répliquer
- **60 abonnés Conformité, 40 abonnés Opérateur, ~541 k€**, équipe de 4 à 5.
- 2 à 3 bassins.
- Ouverture du **canal concédé** : proposer la couche mesure + preuve en marque blanche à un Sodexo/Elior/Api, qui ont exactement le même problème sur leurs milliers de sites.
- Agents IA en production (menus conformes, prévision de volumes).

### Vision (3 ans et plus)
Devenir **l'opérateur de référence de la mesure et du comblement de l'écart EGalim** en France, puis étendre aux **obligations sœurs** : anti-gaspillage, bilan carbone des repas, CSRD des groupes de restauration. Le sens : **des millions d'assiettes basculées vers du durable, et des centaines de fermes sécurisées financièrement.**

---

## 4. Tableau de bord du fondateur

**Les 5 indicateurs à tenir chaque semaine, sur une seule page :**

| KPI | Cible | Pourquoi c'est celui-là |
|---|---|---|
| **Conversations qualifiées / semaine** | ≥ 8 en période commerciale | Le seul indicateur d'entrée. Tout le reste en découle |
| **Taux de conversion diagnostic → abonnement** | **≥ 45 %** | **L'indicateur de santé n° 1.** En dessous de 20 %, on vend des rapports, pas une entreprise |
| **MRR** | Suivre la pente, pas le niveau | Le vrai actif. Un mois sans progression de MRR est un mois perdu |
| **Temps de coordination / client Opérateur** | ≤ 60 min/semaine | Le plafond de scalabilité. Au-delà de 90 min, on arrête de signer et on outille |
| **Producteurs actifs par bassin** | ≥ 4 en A1, ≥ 8 à saturation | La densité conditionne la marge, la fiabilité et l'étage 5 |

**Secondaires, revus mensuellement :** points de ratio gagnés en moyenne chez nos clients (notre preuve d'impact et notre meilleur argument commercial) · churn · délai moyen de production d'un diagnostic · part des lignes de facture en revue humaine (doit baisser).

---

## 5. Risques & parades

| Risque | Impact | Parade |
|---|---|---|
| **Personne n'achète un diagnostic** | Le modèle entier s'écroule | C'est le pari central, et il est testé **dès octobre 2026 pour 970 €**. Le simulateur gratuit sert de rattrapage : s'il ramène du volume sans que personne ne convertisse en payant, le problème est le prix, pas l'appétence |
| **Le diagnostic ne convertit pas en abonnement** | On vend des rapports, pas une entreprise | Surveillé chaque mois. La restitution est le levier n° 1 (gratuit à corriger). Le prix, le levier n° 2 |
| **Concurrence des éditeurs de gestion** (Easilys et consorts) | Cible rognée par le haut | On ne les affronte pas : on prend **les non-équipés**, que leur modèle ne rentabilise pas. Et on comble l'écart, ce qu'ils ne font pas. Veille concurrentielle à faire avant le premier rendez-vous (doc 02, section 5) |
| **Enforcement EGalim faible** (peu de sanctions) | Moins d'urgence client | Vendre la **fenêtre de déclaration** (échéance datée, elle, bien réelle), le **temps gagné**, le **local désiré** et l'**image**, pas la peur du gendarme |
| **Producteurs incapables de tenir un volume institutionnel** | Rupture d'appro, crédibilité perdue | Démarrage sur **2 familles non critiques** (doc 03, section 5), sélection stricte, densité de producteurs par bassin, et **jamais de produit sur le chemin critique du chef au pilote** |
| **Requalification en exploitant du secteur alimentaire** | Obligations sanitaires, traçabilité, responsabilité produit | **Ligne rouge n° 1** : ne jamais prendre la propriété des denrées. Validation avocat avant le 1ᵉʳ contrat Opérateur (doc 06, 8.4) |
| **Requalification en commissionnaire de transport** | Statut réglementé non détenu, responsabilité de plein droit | **Ligne rouge n° 2** : montage franco de port ou mandat transparent, jamais d'achat-revente de transport (doc 06, 8.5 et doc 08) |
| **Erreur dans un rapport de diagnostic** | Responsabilité de conseil engagée | Traçabilité ligne à ligne, revue humaine des lignes douteuses, clause d'obligation de moyens, RC pro couvrant **explicitement** le conseil |
| **Court-circuitage** (cantine ↔ producteur en direct) | Perte de commission | Le verrou n'est pas le contrat mais **l'historique de preuve** : trois ans de ratios traçables ne se transfèrent pas. Et le producteur n'a ni le temps ni l'envie de gérer six cantines |
| **Saturation du fondateur** (job + 8-10 clients Opérateur) | Plafond de croissance | Plafond **connu et chiffré** (doc 03, section 6). On arrête de signer de l'Opérateur et on construit la V2. L'abonnement Conformité, lui, continue de scaler |
| **Trou d'été** (juillet-août sans revenu one-shot) | Trésorerie | Anticipé dans le prévisionnel (M11-M12 à zéro diagnostic). Le MRR couvre. C'est aussi la fenêtre d'outillage |
| **Dépendance à la plateforme Mycelium** (dette technique fleet) | Ralentit le produit | Ne remanier que le nécessaire, parker proprement le cœur véhicule. La réutilisation réelle est modeste et assumée (doc 05, section 2) |

---

## 6. Les gates de décision (go / no-go)

| Échéance | Condition de passage | Si non |
|---|---|---|
| **Fin août 2026** | La Moulinette sort un ratio juste, vérifié à la main | On ne prospecte pas avec un outil faux. On corrige d'abord |
| **Fin octobre 2026** | 2 diagnostics encaissés | On change de segment cible, pas de modèle |
| **Fin décembre 2026** | 1 abonnement récurrent + pilote validé | Le prix ou la restitution est faux. On corrige avant janvier, pas après |
| **Fin mars 2027** | 12 diagnostics cumulés, conversion ≥ 35 % | Si le pic de la fenêtre n'a pas produit, le canal est mauvais. On réoriente vers les prescripteurs et les réseaux |
| **Fin août 2027** | MRR ≥ 4 000 €, conversion ≥ 40 % | On ne quitte pas l'emploi. On tient un an de plus en parallèle, sans honte |

**Règle fondatrice : on avance par preuves, pas par foi. Chaque gate franchi débloque l'investissement suivant, et jamais avant.**
