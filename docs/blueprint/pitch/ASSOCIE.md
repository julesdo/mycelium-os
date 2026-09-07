# Letikette — note à l'attention d'un futur associé

Écrite pour être lue en dix minutes, et pour ne rien cacher.
Si vous cherchez un document qui donne envie, ce n'est pas celui-là : c'est celui qui dit où en est
le projet, ce qui marche, ce qui n'existe pas encore, et où vous entreriez.

---

## 1. Le problème, en trois faits

**Fait 1.** Quand un client ne paie pas, trois choses sont dues **de plein droit** — sans clause dans
le contrat, sans négociation, sans même une mise en demeure : les intérêts de retard au taux de la
Banque centrale européenne majoré de dix points, une indemnité forfaitaire de **40 € par facture**,
et le droit d'agir jusqu'à la prescription.

**Fait 2.** Presque personne ne les réclame. Pas par négligence : parce que **le calcul est
infaisable à la main**. Le taux se réancre deux fois par an — une facture impayée depuis dix-huit
mois traverse trois taux différents. Ajoutez un acompte partiel au milieu, et il faut segmenter le
décompte période par période.

**Fait 3.** Une facture impayée **ne fait aucun bruit** le jour où elle devient irrécouvrable. C'est
le seul jour où il aurait fallu agir. Et le délai n'est pas toujours celui qu'on croit : cinq ans en
général, mais **un an** sur le transport de marchandises — et il court depuis la livraison, pas
depuis la dernière relance.

**Ce que ça donne concrètement.** Une entreprise avec 400 factures payées en retard sur trois ans a
laissé filer 16 000 € d'indemnités forfaitaires, avant même de compter les intérêts. Elle ne le sait
pas.

## 2. Ce que fait Letikette

Un logiciel qui lit les factures d'une entreprise, surveille les échéances et la prescription, et
calcule au centime ce qui est dû — de façon **décomposable** : quel principal, quel taux, sur combien
de jours, sur quelle base annuelle.

Pas un outil de relance. Pas un tableau de bord. **Le calcul que personne ne sait faire**, et la
surveillance de ce qui meurt en silence.

## 3. Où en est le projet, sans arrondir

### Ce qui est construit et vérifié

- **Le moteur de calcul.** Centimes entiers, jamais un flottant. Décompte segmenté à chaque rupture :
  exigibilité, règlement partiel, changement de taux, frontière d'année. C'est le cœur, et c'est le
  plus difficile.
- **La série de taux BCE** semestre par semestre depuis 2021, recoupée contre les planchers publiés
  indépendamment. Un semestre manquant fait lever une erreur en le nommant — jamais d'extrapolation.
- **La prescription par secteur**, avec le délai le plus court retenu quand le secteur est inconnu.
- **La qualification des créances**, le contrôle qui refuse un décompte incomplet en chiffrant ce qui
  serait abandonné, les modules de procédure avec leurs conditions.
- **534 tests.** Le produit est en ligne.

### Ce qui n'existe pas

Autant le dire franchement : **le produit n'a ni yeux, ni bras, ni pouls.**

- Aucun connecteur : tout entre à la main.
- Aucune boucle autonome : la surveillance se calcule quand on ouvre l'écran, elle ne réveille
  personne.
- Aucune donnée externe : ni annuaire des entreprises, ni registre des procédures collectives.
- Aucune sortie : pas de dossier généré, pas de relance rédigée.

### Et surtout

**Zéro client.** La production tourne à vide. Il n'y a aucune traction à vous montrer, et je ne vais
pas vous en inventer.

## 4. Pourquoi c'est le bon moment

**Le développement n'est plus le goulot.** Ce qui aurait demandé deux ans d'ingénierie il y a trois
ans se construit aujourd'hui en semaines, avec des garde-fous automatisés qui rendent l'erreur
bruyante au lieu de silencieuse — ce qui compte particulièrement quand un chiffre faux peut finir
dans une requête déposée au greffe.

**Conséquence directe : l'avantage ne se prend plus sur la vitesse de code.** Il se prend sur la
profondeur métier, l'accès aux clients, et la capacité à franchir des barrières réglementaires dans
le bon ordre. C'est exactement ce qui rend un associé décisif plutôt que confortable.

## 5. Où vous entrez

Deux profils sont utiles. Le premier est urgent.

### Profil A — Le commercial *(le besoin immédiat)*

**Le problème à résoudre :** le produit se construira plus vite qu'il ne se vendra. C'est le
déséquilibre du projet, et il est structurel.

Ce que vous porteriez :

- **Les premiers clients**, un par un, en prospection directe et documentée. La donnée d'entrée est
  publique : on peut estimer ce qu'une entreprise laisse filer **avant** de l'appeler.
- **Le réseau de prescripteurs.** Les experts-comptables voient passer les balances âgées de dizaines
  de clients et n'ont rien à leur proposer. C'est le canal le plus sous-estimé.
- **La mesure de ce qui décide de tout** : le montant révélé au premier import, le taux de conversion
  du diagnostic vers l'abonnement, et surtout — les sommes effectivement récupérées par client. Cette
  dernière donnée est ce qui permettra de chiffrer et de vendre la phase suivante.

**Ce que ça demande vraiment :** vendre à des directeurs financiers un produit dont l'avantage — une
exactitude de calcul — ne se voit pas depuis l'extérieur. La démonstration n'est pas une
présentation : c'est le montant que le prospect découvre sur **ses propres données** en soixante
secondes.

### Profil B — L'opérationnel et le réglementaire *(le besoin de la phase 2)*

Letikette a vocation à obtenir le statut permettant d'agir au nom de ses clients, et à facturer une
commission sur les sommes récupérées. Ce basculement multiplie le revenu par client, et il change la
nature de l'entreprise : il faut alors des humains qui traitent des dossiers et négocient des
échéanciers.

Ce que vous porteriez : le dossier d'agrément, les partenariats avec les études de commissaires de
justice, et la conception d'une opération qui ne dilue pas la marge logicielle dans du service.

## 6. Le modèle, et où est le levier

| Étape | Ce qu'on facture | Ce qui plafonne le revenu |
|---|---|---|
| **Aujourd'hui** | Un diagnostic initial, puis un abonnement mensuel | Le **nombre de clients** |
| **Ensuite** | Abonnement + commission sur les sommes récupérées | Le **volume d'encours** confié |
| **Plus tard** | Flux financiers : cartes, assurance-crédit, avance de trésorerie | Le **montant qui transite** |

**Le point d'inflexion est le deuxième.** Tant qu'on facture un abonnement, le chiffre d'affaires est
plafonné par le nombre de clients qu'on arrive à signer. Dès qu'on facture au succès, il est plafonné
par l'encours — une grandeur cent fois plus grande, sur les mêmes clients.

C'est la seule chose à comprendre du modèle : **la question n'est pas « combien de clients », c'est
« le basculement fonctionne-t-il ».**

## 7. Pourquoi ça peut tenir face à un concurrent

**La profondeur, pas la fonctionnalité.** N'importe quel logiciel de gestion sait envoyer un e-mail à
trente jours. Aucun ne sait segmenter un décompte sur trois taux successifs avec un acompte partiel
au milieu, arbitrer une prescription sectorielle, ou **refuser** de produire une pièce sur un dossier
incomplet en chiffrant ce qui serait abandonné.

Cette profondeur représente une avance qui se compte en années de correction, pas en semaines de
code. Elle est notre protection — et notre difficulté commerciale, parce qu'elle ne se voit pas sur
une page d'accueil.

## 8. Ce qui peut échouer, nommé d'avance

1. **Le diagnostic ne choque pas.** Si les montants révélés au premier import sont trop faibles, le
   produit d'appel ne se vend pas. À mesurer sur les trois premiers pilotes, avant toute campagne.
2. **Le produit s'ouvre seulement en crise.** Un outil qu'on consulte en fin de trimestre ne devient
   jamais une infrastructure. C'est l'indicateur que nous surveillons dès le premier client.
3. **Le basculement vers la commission ne se fait pas** — et alors le plafond du modèle reste celui
   d'un abonnement. C'est le vrai risque, et il est devant nous.
4. **Le passage à l'opération dilue la marge** dans du service humain.

## 9. Ce qui n'est pas négociable

Trois limites encodées dans le produit et vérifiées par des tests automatisés. Elles ne sont pas des
scrupules : ce sont elles qui rendent l'entreprise possible sans agrément préalable, et chacune ne
tombe qu'avec l'autorisation correspondante.

1. **On ne relance jamais le débiteur au nom du client** tant que le statut requis n'est pas obtenu.
2. **On ne manie aucun fonds** tant que le statut requis n'est pas obtenu.
3. **On ne recommande jamais une procédure.** Le produit énonce des constats. Cette limite-là ne tombe
   jamais.

Et un mot proscrit : **« garantie »**. On ne garantit aucun recouvrement — on mesure, on documente,
on alerte. Un test balaie l'interface entière pour s'en assurer.

## 10. Ce qui est sur la table

À discuter de vive voix, mais avec deux principes annoncés d'emblée :

- **L'entreprise est autofinancée** et compte le rester jusqu'à ce qu'elle ait une preuve à montrer
  plutôt qu'une promesse à vendre. Concrètement : jusqu'au premier titre exécutoire obtenu grâce au
  logiciel.
- **Un associé n'est pas un premier salarié.** Ce qui se discute, c'est une part du capital et un
  périmètre de décision, pas une fiche de poste.

*Les modalités — part, vesting, calendrier — sont à définir avec Jules.*

---

**Ce qu'il y a à lire ensuite, si le sujet vous intéresse :** le blueprint complet du projet, sept
documents qui couvrent la vision, la frontière du produit minimum, la feuille de route à cinq ans
avec ses obstacles nommés, le modèle économique, l'architecture technique, le marketing et le
juridique. Rien n'y est enjolivé, y compris les projections financières — qui ne tombent
volontairement pas sur un chiffre rond.
