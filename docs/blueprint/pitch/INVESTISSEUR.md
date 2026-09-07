# Letikette — note à l'attention d'un investisseur

**Ce document ne contient aucun chiffre que nous n'avons pas construit ou relevé.** Là où une donnée
de marché nous manque, nous le disons et nous nommons la source à consulter, plutôt que de citer un
ordre de grandeur de mémoire. C'est la même discipline qui gouverne le produit, où aucune valeur
juridique n'est écrite sans sa source — et c'est, au fond, ce que nous vendons.

---

## 1. La thèse, en cinq lignes

Quand une entreprise française est payée en retard, la loi lui accorde **de plein droit** des
intérêts et une indemnité forfaitaire de 40 € **par facture**. Presque personne ne les réclame, parce
que le calcul est infaisable à la main. Et une créance non réclamée **s'éteint en silence** à une
date que la plupart ignorent.

Letikette fait ce calcul, surveille cette date, et transforme le résultat en une pièce opposable.
C'est un logiciel aujourd'hui ; c'est une infrastructure financière à cinq ans.

## 2. Le problème, et pourquoi il n'est pas servi

Trois obligations légales, toutes automatiques, toutes ignorées :

| Ce qui est dû | Pourquoi personne ne le réclame |
|---|---|
| Intérêts au taux BCE majoré de dix points | Le taux **se réancre deux fois par an**. Une facture impayée depuis dix-huit mois traverse trois taux. Avec un acompte partiel, il faut segmenter le décompte période par période. |
| Indemnité forfaitaire de 40 € **par facture** | Largement méconnue. Ceux qui la connaissent la croient due par client, pas par facture. |
| Le droit d'agir, jusqu'à la prescription | Cinq ans en général — mais **un an** sur le transport de marchandises, et le délai court depuis la livraison. |

**Le marché existant ne résout rien.** Les outils de relance envoient des courriels plus polis. Les
cabinets de recouvrement prennent une commission sur ce qu'ils récupèrent, sans que le client
comprenne la méthode. Aucun des deux ne répond à la question que se pose réellement le dirigeant :
*combien puis-je réclamer, et jusqu'à quand ?*

> **Dimensionnement du marché : à sourcer, pas à estimer.** L'Observatoire des délais de paiement et
> les études publiques sur les comportements de paiement inter-entreprises fournissent la base
> chiffrée. Nous ne citerons pas d'ordre de grandeur avant de l'avoir relevé — c'est un engagement de
> méthode, et il vaut aussi pour nos projections.

**Ce que nous pouvons chiffrer sans source externe, parce que c'est de l'arithmétique :** une
entreprise ayant 400 factures payées en retard sur trois ans a laissé filer **16 000 €** d'indemnités
forfaitaires, avant même de compter les intérêts. Ce nombre est exact et se vérifie sur les données
du client en soixante secondes.

## 3. L'idée centrale : la barrière est le calcul

Notre avantage n'est pas une fonctionnalité, c'est une **exactitude**.

Le moteur travaille en **centimes entiers**, jamais en nombres flottants — parce que
`0,1 + 0,2 = 0,30000000000000004`, et qu'un décompte qui ne tombe pas juste au centime se démonte en
une audience. Il segmente à chaque rupture : exigibilité, règlement partiel, changement de taux,
frontière d'année. Il **refuse** de produire une pièce sur un dossier incomplet, en chiffrant ce qui
serait abandonné — parce qu'un titre exécutoire ne porte que sur les sommes qu'il chiffre, et que ce
qui n'y figure pas est perdu.

Aucune valeur juridique n'est écrite en dur : tout vit dans un registre où chaque entrée porte sa
source, sa date de relevé, et deux niveaux de validation — l'un suffisant pour **afficher** un
chiffre, l'autre exigé pour **produire un acte**.

**C'est cette profondeur qui est difficile à cloner.** Elle représente des années de correction, pas
des semaines de code. Elle est aussi notre difficulté commerciale : elle ne se voit pas sur une page
d'accueil, et c'est pourquoi la démonstration se fait toujours sur les données du prospect.

## 4. Où en est l'entreprise

**Construit et vérifié :** le moteur de calcul, la série de taux depuis 2021 recoupée contre des
sources indépendantes, la prescription sectorielle, la qualification des créances, les modules de
procédure. 534 tests. Le produit est en ligne.

**Pas encore construit :** les connecteurs, la boucle autonome quotidienne, l'accès aux registres
publics, la génération de dossiers.

**Traction : zéro client.** La production tourne à vide. Nous ne présentons aucune métrique
d'utilisation, parce qu'il n'y en a pas.

**Équipe :** un fondateur, une à trois personnes visées sur douze mois. Autofinancé.

## 5. Le modèle, et où est le levier

| Phase | Ce qu'on facture | Ce qui plafonne le revenu |
|---|---|---|
| **1. SaaS** | Diagnostic initial (690 à 1 900 €) puis abonnement (190 à 390 €/mois) | Le nombre de clients |
| **2. Agence** | Abonnement + **commission de 10 à 15 %** sur les sommes récupérées | Le **volume d'encours** confié |
| **3. Infrastructure** | Interchange, revenue share bancaire, courtage d'assurance | Le **montant qui transite** |

**Le point d'inflexion est la Phase 2**, et c'est la seule chose à sous-écrire dans ce dossier. Tant
qu'on facture un abonnement, le revenu est plafonné par le nombre de clients signés. Dès qu'on
facture au succès, il est plafonné par l'encours — une grandeur sans commune mesure, **sur les mêmes
clients**.

Le diagnostic initial mérite une note : encaissé avant le premier mois d'abonnement, il fait que
**le produit finance une partie de son propre coût d'acquisition dès la première vente**.

## 6. La trajectoire, et ce qu'elle ne dit pas

Hypothèses explicites : mix de paliers donnant un ARPU de **240 €/mois**, commission au succès de
**12 %**, montant récupéré par client actif en Phase 2 de **100 k€/an** — cette dernière étant
l'hypothèse la plus fragile, et la première que nous mesurerons.

| Année | Clients | SaaS | Commission | Flux financiers | **Total** |
|---|---|---|---|---|---|
| 2027 | 40 | 115 k€ | — | — | **≈ 0,1 M€** |
| 2028 | 200 | 576 k€ | premiers euros | — | **≈ 0,6 M€** |
| 2029 | 600 | 1,7 M€ | 1,5 M€ | — | **≈ 3,2 M€** |
| 2030 | 1 400 | 4 M€ | 8 M€ | 2 M€ | **≈ 14 M€** |
| 2031 | 2 800 | 8 M€ | 25 M€ | 15 M€ | **≈ 48 M€** |

**Ce que ce tableau dit, et que nous préférons dire nous-mêmes.** Un objectif de 65 M€ n'est pas
atteignable en logiciel pur : il faudrait 22 500 clients à 2 880 €/an, soit une part de marché
irréaliste à cinq ans. Notre projection n'y arrive pas non plus, et nous l'avons laissée telle quelle
plutôt que de l'ajuster pour tomber sur un chiffre rond.

**En 2031, la commission et les flux portent 83 % du revenu.** La question à sous-écrire n'est donc
pas « combien de clients peuvent-ils signer », c'est **« le basculement vers la commission
fonctionne-t-il »**. Si oui, la trajectoire est atteignable et dépassable. Si non, aucun effort
commercial sur le logiciel ne comblera l'écart.

C'est aussi ce qui gouverne nos priorités internes : nous mesurons les sommes récupérées par nos
clients **dès le premier**, alors même que nous n'en prenons aucune commission — parce que c'est cette
donnée qui permettra de chiffrer la Phase 2, de la vendre, et d'en construire le dossier d'agrément.

## 7. La séquence réglementaire est un atout, pas une contrainte

Trois limites sont **encodées dans le produit** et vérifiées par des tests automatisés qui font
échouer la construction du logiciel si elles sont franchies :

| Limite | Ce qu'elle nous évite aujourd'hui | Quand elle tombe |
|---|---|---|
| Aucune relance envoyée au nom du client | Le régime de l'activité réglementée de recouvrement pour compte d'autrui | Phase 2, avec le statut requis |
| Aucun maniement de fonds | Les obligations liées à la détention de fonds de tiers, et le capital correspondant | Phase 3, sous statut d'agent d'un établissement de paiement |
| Aucune recommandation de procédure | Le champ du conseil juridique | **Jamais** |

**Chaque barrière tombe avec l'autorisation correspondante, jamais par accident.** C'est ce qui
permet de lancer sans capital réglementaire, puis de monter les marches dans l'ordre. Nous
n'anticipons aucune autorisation et nous n'en contournons aucune.

## 8. Ce qui peut échouer

Nommé ici plutôt qu'attendu en question.

1. **Le diagnostic ne choque pas.** Si le montant révélé au premier import est trop faible, le produit
   d'appel ne se vend pas. Mesuré sur les trois premiers pilotes, avant toute dépense marketing.
2. **La Phase 2 ne se fait pas** — et le plafond du modèle reste celui d'un abonnement. C'est le
   risque principal, et c'est celui que ce dossier demande de sous-écrire.
3. **Le passage de logiciel à opérateur dilue la marge** dans du service humain. Notre parade :
   n'ouvrir la délégation qu'au-dessus d'un seuil de montant calculé, et laisser le reste en
   self-service.
4. **Contestation du positionnement** au regard du conseil juridique. Notre parade : l'architecture
   est déterministe — le logiciel n'apprécie rien, il applique des grilles de lecture publiques et se
   retient là où un conseil pousserait. Nous sollicitons un avis écrit **avant** d'être visibles.
5. **Un éditeur de logiciel comptable coupe notre accès** pour développer son propre module. Notre
   parade : la profondeur du calcul, inclonable par une équipe généraliste — et à terme, leur vendre
   notre moteur en marque blanche plutôt que de les concurrencer.
6. **Dépendance à une validation juridique externe** pour ouvrir la production d'actes. Atténuée par
   conception : la totalité du produit minimum fonctionne et se vend **sans** cette validation ; elle
   ne débloque qu'un étage supplémentaire.

## 9. Le point de preuve

Nous ne demandons pas de croire une projection à cinq ans. Nous désignons **un événement observable**
qui change la nature du dossier :

> **Le premier titre exécutoire obtenu grâce à Letikette.**
> De l'argent rentre dans une entreprise à cause d'un dossier monté par le logiciel.

Avant lui, nous vendons une promesse. Après lui, nous montrons une mécanique — avec le décompte, la
pièce et le résultat. C'est le seuil que nous considérons comme la bonne fenêtre d'entrée.

## 10. Ce que nous demandons

**L'entreprise est autofinancée et peut le rester.** Le diagnostic payant finance l'acquisition, et
les coûts réglementaires n'arrivent qu'en Phase 2, quand le volume les justifie. Nous n'avons pas
besoin de lever pour exister.

Ce qu'un financement achèterait, dans cet ordre — **parce que chacun débloque le suivant** :

1. **Le temps humain de la Phase 2.** Le passage à l'opération demande des personnes avant de demander
   du code. C'est le premier poste, et le plus déterminant.
2. **Les coûts fixes de l'agrément** — assurance de responsabilité civile professionnelle et garantie
   financière — qui tombent avant le premier euro de commission.
3. **L'expansion internationale.** L'architecture du produit sépare déjà le moteur du droit national :
   ouvrir un pays consiste à remplir un module et à trouver un juriste de ce ressort, pas à réécrire
   le logiciel.

Nous sommes à disposition pour une démonstration sur vos propres données de facturation, ou sur
celles d'une entreprise de votre portefeuille. C'est la seule présentation qui vaut quelque chose :
le montant apparaît en soixante secondes, et il est exact.
