# 03 — Modèle, offre & pricing

*Révision du 20 août 2026 : l'échelle de valeur en six étages est ramenée à **deux offres**.
Les étages 3 (pilote substitution), 4 (abonnement opérateur) et 5 (orchestration logistique)
sont supprimés : il n'y a plus d'opérateur. La section 4 (« le modèle opérateur 80/20 ») est
supprimée. La section 5 est conservée mais change de nature : elle ne décrit plus un playbook
de sourcing, elle décrit **le calcul que le logiciel produit**.*

---

## 1. Ce qu'on vend

**On vend un abonnement à un logiciel qui mesure la conformité EGalim, la suit et la prouve.**
Pas des denrées, pas de la coordination, pas du temps humain.

| | Promesse au client | Prix | Ce qu'on porte comme risque |
|---|---|---|---|
| **Le premier diagnostic** | « Vous saurez enfin où vous en êtes, et ce qu'il manque, en euros. » | 690 / 1 190 / 1 900 € | Aucun |
| **L'abonnement** | « Votre chiffre est à jour toute l'année, et votre déclaration de mars est prête. » | 190 / 290 / 390 €/mois | Aucun |

Option saisonnière, janvier à mars, pour un non-abonné : **la télédéclaration seule, 290 €**.
C'est une porte d'entrée, pas une ligne de métier.

**On vend d'abord la mesure**, parce que c'est ce qui est le plus facile à acheter et le plus
difficile à contester.

---

## 2. Le détail des deux offres

### Le premier diagnostic

**C'est la porte d'entrée commerciale, et la première mesure du client.** Ce n'est pas une
prestation à part : c'est le produit qui tourne pour la première fois, sur douze mois
d'historique.

**Ce qu'on demande au client :** douze mois de factures fournisseurs, de préférence en export
comptable. Rien d'autre. Pas de changement d'outil, pas d'accès à son système.

**Ce qu'il obtient :**

1. **Les trois taux réels** : durable, bio, viande et poisson, en valeur d'achat HT sur
   l'année civile.
2. **La décomposition** par famille de produits et par fournisseur. C'est souvent la première
   fois qu'il voit ça.
3. **L'écart chiffré en euros** : *« pour atteindre 50/20, il faut basculer 41 000 € d'achats
   annuels, dont 28 000 € vers du bio. »*
4. **Le plan de comblement** : les trois familles prioritaires, classées par points de ratio
   gagnés par euro de surcoût (section 5).
5. **Une simulation à budget constant** (section 5.4).
6. **Les lignes qualifiantes non justifiées** : les achats dont le label n'est pas prouvé sur
   la facture, et **le courrier de demande d'attestation généré pour chaque fournisseur
   concerné**. Souvent 3 à 8 points de ratio récupérés sans rien changer aux achats. C'est ce
   qui rembourse la prestation à lui seul.
7. **Le fichier de saisie** prêt pour la télédéclaration « ma cantine ».

**Tarification :**

| Palier | Couverts/jour | Prix | Coût de production |
|---|---|---|---|
| S | < 250 | **690 €** | < 2 € d'API |
| M | 250–800 | **1 190 €** | < 2 € d'API |
| L / multi-sites | > 800 | **1 900 €** + 400 €/site | < 5 € d'API |

Le prix suit la taille de la cantine parce que c'est la valeur qui change, **pas le coût**. Le
coût de production est le même à quelques centimes près, et c'est exactement ce qui rend le
modèle logiciel supérieur au modèle opérateur : autrefois, un diagnostic L demandait 16 heures.

**Un diagnostic livré est figé, définitivement.** Une nouvelle mesure produit un nouveau
diagnostic daté. C'est une exigence d'auditabilité, pas un choix d'ergonomie.

---

### L'abonnement

**Le produit, et le seul revenu récurrent.**

**Contenu :** dépôt de factures au fil de l'eau · mesure des trois taux tenue à jour · file de
confirmation dégressive · alerte de dérive · certificats datés · courriers de demande
d'attestation · **télédéclaration incluse** · veille réglementaire du barème.

**Prix :** 190 € (S) / 290 € (M) / 390 € (L) par mois, engagement 12 mois.

**Ce qui a disparu du contenu par rapport au plan précédent :** le point trimestriel de trente
minutes. Ce n'était pas un service, c'était le symptôme d'un produit qu'on ne pouvait pas
utiliser seul.

**Argument de conversion, à la remise du diagnostic :** *« Le diagnostic vous a coûté 1 190 €.
L'abonnement, c'est 290 € par mois, et il inclut la déclaration de mars que vous auriez payée
séparément. Vous ne repayez jamais de diagnostic, et vous ne découvrez plus votre chiffre en
mars. »*

**Taux de conversion visé : 45 % des diagnostics.** C'est l'indicateur de santé numéro un du
modèle, et il l'est encore davantage qu'avant : il n'y a plus d'étage supérieur pour rattraper
un client qui ne s'abonne pas.

---

## 3. Qui paie quoi

| Flux | Qui paie | Qui encaisse | Passe-t-il par nos livres ? |
|---|---|---|---|
| Diagnostic, abonnement, télédéclaration | La cantine | Nous | ✅ Oui (c'est tout notre CA) |
| Les denrées | La cantine | Ses fournisseurs, sans nous | ❌ **Jamais** |

Le tableau tient en deux lignes, et c'est le meilleur résumé du changement d'axe. **Il n'y a
plus qu'un seul flux qui nous concerne.** Conséquences directes : pas de BFR, pas de stock,
pas de statut d'exploitant du secteur alimentaire, pas de statut de commissionnaire de
transport, pas de mandat de facturation à faire rédiger.

Les deux lignes rouges restent écrites — on ne prend jamais la propriété des denrées, on
n'organise jamais le transport en son nom propre — non pas parce qu'on frôle la limite, mais
parce qu'elles bornent ce qu'on s'autorise à devenir.

---

## 4. Le plan de comblement, calculé par le logiciel

*(Anciennement « par quelles familles démarrer le pilote ». Le calcul est le même ; ce n'est
plus un playbook de sourcing, c'est une sortie du produit.)*

Le critère n'est pas « quelle famille est la plus locale » mais :

> **Quelle famille rapporte le plus de points de ratio par euro de surcoût ?**

### 4.1 L'arithmétique que le diagnostic produit

Cas type : **cantine de 300 couverts/jour**, 20 jours ouvrés, coût matière 2,50 €/repas, soit
**180 000 €/an d'achats HT**. Répartition typique, que le diagnostic remplace par les chiffres
réels du client :

| Famille | Part | Montant annuel |
|---|---|---|
| Viandes & charcuterie | 28 % | 50 400 € |
| Épicerie appertisée & surgelés | 15 % | 27 000 € |
| Fruits & légumes frais | 16 % | 28 800 € |
| Produits laitiers & œufs | 14 % | 25 200 € |
| **Épicerie sèche** | **11 %** | **19 800 €** |
| Boissons & divers | 10 % | 18 000 € |
| Poisson | 6 % | 10 800 € |

Point de départ typique : **18 % de durable, dont 7 % de bio.**

| Action | Montant basculé | Gain |
|---|---|---|
| Épicerie sèche → bio | 19 800 € | **+11 points** de durable et de bio |
| Légumes bruts (10 % du budget) → bio | 18 000 € | **+10 points** de durable et de bio |
| **Cumul** | **37 800 €** | **+21 points** |

**Résultat : 18 % → 39 % de durable, et 7 % → 28 % de bio.**

> **Le seuil légal des 20 % de bio est franchi en basculant deux familles de produits, soit
> 21 % du budget.** Et on est à 39 sur les 50 % de durable.

Pour finir le chemin de 39 % à 50 % : basculer la moitié des produits laitiers en bio
(+7 points) puis un quart de la viande en Label Rouge (+7 points, à **53 %**). Le logiciel
montre cette trajectoire dès le premier diagnostic, pour que le gérant sache où il va.

**Pourquoi l'épicerie sèche et les légumes de garde arrivent en tête du calcul :** ce sont les
familles au meilleur rendement en points par euro, et ce sont aussi celles dont le changement
de fournisseur n'expose pas le service. Le logiciel classe par rendement ; le gérant arbitre
avec sa connaissance du terrain. C'est exactement le partage des rôles du produit.

### 4.2 Rester à budget matière constant

Le gérant va dire « le bio, c'est plus cher ». Il a raison sur le prix catalogue et tort sur le
résultat. Quatre leviers, que le diagnostic chiffre :

1. **Le circuit direct récupère la marge du grossiste** (–20 à –35 %). Sur l'épicerie sèche,
   l'achat direct est souvent au même prix, voire moins cher, que le conventionnel en gamme
   grossiste.
2. **Le levier légumineuses.** Remplacer une part de la protéine animale par des légumineuses
   bio fait **baisser** le coût matière (0,40 à 0,80 € par repas) **et monter** le ratio. C'est
   le seul levier qui améliore les deux.
3. **La saisonnalité.** Un légume acheté en pleine saison coûte structurellement moins cher.
4. **Le gaspillage.** 10 à 20 % des denrées sont jetées. Récupérer 5 points libère plus de
   budget que ne coûte le passage au bio sur deux familles.

> **Le message : « on ne vous demande pas d'augmenter votre budget, on vous demande de le
> dépenser autrement. »** Et le logiciel le prouve avec la simulation à budget constant.

---

## 5. Économie unitaire

| Situation du client | Revenu annuel | Coût direct annuel | Temps humain |
|---|---|---|---|
| Diagnostic seul | ~950 € | < 5 € d'API | ~2 h (vente et remise) |
| Diagnostic + abonnement | ~950 € + 3 480 € | < 30 € d'API | ~2 h la première année, puis ~0 |

**Il n'y a plus de point de vigilance sur le temps humain**, et c'est tout l'objet du
changement d'axe. Le modèle précédent saturait un fondateur seul à 8 ou 10 clients opérateur,
à raison d'une heure de coordination par semaine et par client. **Cette limite a disparu.**

Ce qui la remplace, et qu'il faut regarder en face : **le plafond est désormais commercial.**
Combien de cantines on atteint, combien acceptent un rendez-vous, combien signent. C'est une
contrainte qu'on lève avec de la distribution, pas avec de l'embauche.

**La marge s'améliore avec le temps, deux fois :**

1. Chez un client donné, la deuxième année demande une fraction du travail de confirmation de
   la première, parce qu'un libellé confirmé l'est définitivement.
2. Entre clients, le consensus de la table `productLabels` retire des libellés de la file de
   tout le monde. **Le centième client démarre sur un socle que les quatre-vingt-dix-neuf
   premiers ont construit.**

---

## 6. Ce qui nous défend, maintenant que c'est un logiciel

L'ancienne réponse était : le réseau de producteurs et la relation. Elle ne tient plus, et il
faut une réponse honnête, parce que **du code se copie en six mois**.

1. **Le corpus de classification.** `productLabels` accumule les libellés du marché et leur
   verdict, confirmés par des gérants qui engagent leur responsabilité. C'est un actif qui
   grossit avec chaque client, qui ne se scrape pas, et qui rend le produit meilleur pour le
   client suivant. Un concurrent qui démarre repart d'une page blanche sur la partie la plus
   pénible.
2. **L'historique de preuve.** Un client qui a trois exercices de ratios traçables, datés et
   justifiés chez nous ne change pas de prestataire à la légère : il perdrait la continuité de
   sa propre défense en cas de contrôle.
3. **Le référentiel tenu à jour.** Le barème EGalim évolue. Le tenir à jour, versionné, et
   pouvoir dire quelle version a produit quelle classification, est un travail d'éditeur
   continu, pas une fonctionnalité.
4. **L'auditabilité de bout en bout.** Chaque chiffre remonte à un libellé de facture, une
   justification et une confirmation humaine horodatée. C'est ce qui distingue un outil de
   conformité d'un tableur amélioré.

Ce qui ne nous défend pas, et qu'il ne faut pas se raconter : l'interface, le prix, et le fait
d'être arrivé tôt.
