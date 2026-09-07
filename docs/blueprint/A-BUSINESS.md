# A — Business

Modèle, prix, unit economics, trajectoire, financement.
**Toutes les projections de ce document portent leurs hypothèses.** Un chiffre d'ARR sans le nombre
de clients et l'ARPU qui le produisent est un vœu.

---

## 1. Le modèle par phase

| Phase | Ce qu'on facture | Nature du revenu | Ce qui le fait croître |
|---|---|---|---|
| **1. SaaS autonome** | Abonnement mensuel + bilan initial | Récurrent + non récurrent | Le nombre de clients |
| **2. Agence** | Abonnement + **commission au succès** (10 à 15 % des sommes récupérées) | Récurrent + variable | Le **volume d'encours** confié, pas le nombre de clients |
| **3. Infrastructure** | Interchange, revenue share bancaire, courtage d'assurance | Sur flux | Le montant qui transite |

**Le basculement de la Phase 2 est le point d'inflexion du modèle.** Tant qu'on facture un
abonnement, le chiffre d'affaires est plafonné par le nombre de clients. Dès qu'on facture au succès,
il est plafonné par l'encours — c'est-à-dire par une grandeur cent fois plus grande.

## 2. La grille actuelle, et ce qui cloche

Ce qui est en production aujourd'hui (`src/lib/config/tarifs.ts`) :

| Palier | Volume | Bilan initial | Abonnement mensuel |
|---|---|---|---|
| S | moins de 250 factures/an | 690 € | 190 € |
| M | de 250 à 800 factures/an | 1 190 € | 290 € |
| L | plus de 800 factures/an | 1 900 € | 390 € |

Essai de 30 jours. Paddle facture en qualité de vendeur de référence (marchand de record).

### ⚠️ Le problème : les bornes ont été transposées, pas recalculées

Elles viennent du modèle précédent, où le palier suivait la taille d'un établissement de
restauration. Le nombre de factures a remplacé le nombre de couverts, mécaniquement.

**Or la valeur livrée ne suit pas le nombre de factures — elle suit le montant en jeu.** Une
entreprise avec 50 factures de 100 000 € reçoit infiniment plus de valeur qu'une entreprise avec
800 factures de 200 €. Aujourd'hui la première paie le palier S et la seconde le palier L. C'est
exactement à l'envers.

**Recommandation : indexer le palier sur l'encours client** — le montant total des créances suivies —
et non sur le nombre de factures. Trois conséquences :

1. Le prix suit la valeur, ce qui rend la hausse de prix acceptable quand l'encours grossit.
2. Le palier se **déduit** des données importées au lieu d'être déclaré, ce qui respecte la règle
   « le logiciel décide, le gérant confirme ».
3. Ça prépare la Phase 2 : la commission au succès s'exprime déjà en pourcentage d'un encours.

**Action :** recalculer les bornes sur les données des trois premiers pilotes, pas avant. On ne fixe
pas une grille sur une intuition.

## 3. Le bilan initial n'est pas un frais de mise en service

C'est le produit d'appel, et c'est un actif stratégique qu'on sous-estime.

Le bilan est le **choc du premier import transformé en produit**. Le client dépose trois ans
d'historique et reçoit un chiffre qu'il ignorait : ce qu'il aurait pu réclamer et ne l'a pas fait.
Il paie pour savoir, avant d'avoir à faire confiance sur la durée.

Trois vertus :

- **Il finance l'acquisition.** Entre 690 € et 1 900 € encaissés avant le premier mois d'abonnement,
  le produit paie une partie de son propre coût d'acquisition dès la première vente. Peu de SaaS ont
  ça.
- **Il qualifie.** Quelqu'un qui paie 690 € pour un diagnostic a un problème réel.
- **Il lève l'objection de confiance.** On ne demande pas un accès permanent à la comptabilité d'un
  inconnu ; on demande un export, une fois, contre un résultat.

## 4. Unit economics

### Ce qu'on connaît

**Le coût variable est faible et mesuré.** Le socle instrumente le coût des appels au modèle
(`src/lib/socle/modele/`). Un verrou d'empreinte protège le préfixe du prompt système d'extraction :
il part avec `cache_control` éphémère, et le cache ne sert que sur un préfixe identique à l'octet —
un reformatage innocent multiplie le coût par document sans qu'aucun test ne tombe.

**Marge brute attendue : élevée**, comme tout SaaS. Les coûts variables sont l'extraction documentaire
et l'hébergement Convex, tous deux proportionnels au volume.

### Ce qu'on ne connaît pas, et qu'il faut mesurer sur les trois premiers pilotes

| Métrique | Pourquoi elle décide | Comment la mesurer |
|---|---|---|
| **Le montant révélé au premier import** | C'est l'amplitude du choc. Sous un certain seuil, le bilan ne se vend pas. | Sur les trois premiers historiques réels. |
| **Le coût d'acquisition** | Il détermine si le bilan couvre le CAC ou seulement une partie. | Coût total de prospection ÷ clients signés. |
| **Le taux de conversion bilan → abonnement** | C'est le vrai moteur : le bilan sans l'abonnement n'est qu'un service. | Rapport direct. |
| **La rétention à 6 mois** | Voir « l'indicateur qui décide de tout » dans `02-ROADMAP.md`. | Et surtout : ouvrent-ils un matin calme ? |
| **Le montant récupéré par client et par an** | C'est l'assiette de la commission Phase 2. Sans elle, la Phase 2 ne se chiffre pas. | À suivre dès la Phase 1, même sans commission. |

**La dernière ligne est la plus importante et la plus négligée.** Il faut mesurer les sommes
récupérées dès le premier client, alors même qu'on n'en prend aucune commission — parce que c'est
cette donnée qui permettra de chiffrer la Phase 2, de la vendre, et de construire le dossier
d'agrément.

## 5. La trajectoire

**Hypothèses de base**, à réviser dès les premières données réelles :

- Mix des paliers : 60 % S, 30 % M, 10 % L → **ARPU mensuel ≈ 240 €**, soit **2 880 €/an**
- Bilan initial moyen ≈ 900 €, non récurrent
- Commission au succès : **12 %** des sommes récupérées (milieu de la fourchette 10–15 %)
- Montant récupéré par client actif en Phase 2 : **100 k€/an** (hypothèse à valider, cf. §4)

| Année | Clients | SaaS | Commission | Finance | **Total** | Ce qui porte la marche |
|---|---|---|---|---|---|---|
| **2027** | 40 | 115 k€ | — | — | **≈ 115 k€** | Les premiers clients, un par un. |
| **2028** | 200 | 576 k€ | premiers euros | — | **≈ 0,6 M€** | La preuve J2 rend la vente répétable. |
| **2029** | 600 | 1,7 M€ | 1,5 M€ | — | **≈ 3,2 M€** | L'agrément Phase 2. La commission démarre. |
| **2030** | 1 400 | 4 M€ | 8 M€ | 2 M€ | **≈ 14 M€** | L'ARPU se décorrèle du prix du logiciel. |
| **2031** | 2 800 | 8 M€ | 25 M€ | 15 M€ | **≈ 48 M€** | Les flux financiers dépassent le logiciel. |

### Ce que ce tableau dit, et qu'il faut regarder en face

**L'objectif de 65 M€ n'est pas atteignable en SaaS pur.** Il faudrait 22 500 clients à 2 880 €/an,
soit une part de marché irréaliste à cinq ans. La ligne 2031 ci-dessus n'y arrive pas non plus, et
c'est volontaire : elle est construite, pas ajustée pour tomber sur un chiffre rond.

**Les 65 M€ sont un objectif de Phase 3, pas de Phase 1.** Ils supposent que la commission au succès
et les flux financiers portent 80 % du revenu. Autrement dit : **la question n'est pas « combien de
clients faut-il », c'est « la Phase 2 fonctionne-t-elle ».** Si elle fonctionne, le chiffre est
atteignable et même dépassable ; si elle ne fonctionne pas, aucun effort commercial en Phase 1 ne
comblera l'écart.

C'est ce qui doit gouverner l'allocation d'effort : **tout ce qui prépare la Phase 2 vaut plus que
tout ce qui optimise la Phase 1.** En pratique — mesurer les sommes récupérées dès le premier client,
et lancer la démarche d'agrément dès que le volume le permet.

## 6. Financement

**Position retenue : autofinancement, une à trois personnes sur les douze prochains mois.**

Ce que ça impose :

- **Le bilan initial finance la croissance.** C'est la raison pour laquelle il n'est pas négociable et
  ne doit pas devenir gratuit pour « faciliter la vente ».
- **Retarder tout ce qui coûte du capital fixe** : agrément, séquestre, assurance et garantie
  financière n'arrivent qu'en Phase 2, quand le volume les justifie.
- **Ne jamais porter de risque financier.** Phase 3, on est apporteur ; la banque partenaire porte.

### Quand une levée devient pertinente

Pas avant le jalon **J2** (le premier titre exécutoire obtenu). Avant lui, on vend une promesse et la
valorisation s'en ressent. Après lui, on vend une mécanique prouvée, et le récit change de nature :
« nous transformons des créances mortes en trésorerie, voici le premier cas, voici le décompte, voici
le titre ».

**Ce qu'une levée servirait à acheter, dans l'ordre :** le temps humain de la Phase 2 (mur M8), les
coûts fixes d'agrément (M10), puis l'expansion internationale (J8) — dans cet ordre, parce que chacun
débloque le suivant.

## 7. Ce que Letikette ne facturera jamais

- **Aucune commission sur ce qui rentre en Phase 1.** Ligne rouge 2. Ce n'est pas une posture : c'est
  ce qui nous dispense de l'agrément et du séquestre, donc ce qui rend le lancement possible.
- **Aucun succès facturé sans agrément.** Y compris déguisé en « prime de performance ».
- **Aucun honoraire de conseil.** Ligne rouge 3.
