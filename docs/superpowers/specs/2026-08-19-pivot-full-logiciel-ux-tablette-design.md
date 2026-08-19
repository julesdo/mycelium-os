# Pivot full-logiciel et refonte UX tablette

**Date :** 2026-08-19
**Statut :** validé
**Remplace :** le modèle opérateur décrit dans `2026-08-15-pivot-egalim-tri-et-moulinette-design.md`

---

## 1. Ce qui change, et pourquoi

Mycelium passait par un opérateur : « 80 % humain, 20 % logiciel ». L'app devient un
**logiciel de conformité destiné au seul gérant de cantine**, dont le travail de mesure est
automatisé par l'IA. Il n'y a plus d'espace opérateur.

### L'humain dans la boucle change de camp

Ce n'est plus Mycelium qui mesure pour la cantine, c'est un logiciel qui mesure et un gérant qui
confirme. La conséquence non évidente est que **la charge devient dégressive** : chaque libellé
confirmé est acquis définitivement, et le consensus entre clients en retire encore. Un gérant en
deuxième année n'a presque plus rien à faire, là où le modèle opérateur refacturait du temps
humain chaque année.

### Ce qui reste non négociable malgré l'automatisation

- **Viande et poisson passent toujours devant un humain.** Ces familles portent le seuil des 60 %,
  où une erreur coûte le plus cher. Le filet juridique ne se délègue pas à un seuil de confiance,
  ni à une statistique de consensus.
- **Le barème reste du code versionné**, jamais une sortie de modèle. Le modèle relève les labels
  que le libellé établit ; `referentiel.ts` en déduit `isBio` et `isDurable`. Un contrôleur doit
  pouvoir remonter du chiffre au texte de loi sans passer par une IA.
- **Aucune classification sans justification**, et l'indice de confiance est conservé.
- **Le mot « garantie » reste interdit.** La déclaration reste signée par la cantine.

L'automatisation change qui fait le geste, pas ce qu'on peut affirmer.

### Ce qui disparaît

L'espace `/ops` en entier : arbitrage, inbox de tickets, SLA, timeline client, gestion d'équipe.
Environ 2 400 lignes de Svelte et 1 300 lignes de Convex.

**Huit tables** quittent le schéma, qui passe de 23 à 15 :
`myceliumStaff`, `staffInvitations`, `conciergeOrgAccess`, `humanAssistRequests`,
`humanAssistMessages`, `clientTimelineEvents`, `conciergeTickets`, `conciergeTicketMessages`.

Les rôles `SUPER_ADMIN` et `OPERATOR` n'ont plus d'objet, ni le garde de périmètre par
organisation. Le support passe par un canal externe plutôt que par du code à maintenir.

### Ce que ça invalide dans `CLAUDE.md`

La phrase « 80 % humain, 20 % logiciel » devient fausse et doit sauter : elle oriente chaque
décision d'architecture du projet. L'échelle de valeur à six étages est bâtie sur un opérateur ;
les étages 3 à 5 (pilote substitution, abonnement opérateur, orchestration logistique) n'ont plus
de porteur. Le document se réduit à ce qui reste vrai : un logiciel de conformité vendu en
abonnement, et les deux lignes rouges juridiques conservées comme garde-fous.

**Point signalé, non tranché :** les documents de `docs/agri/` décrivent le modèle commercial
précédent. Ils ne sont pas modifiés par cette spec, et vont donc contredire le code.

---

## 2. Architecture de navigation

Tablette d'abord, paysage privilégié, sans casser le téléphone.

### Quatre entrées, plus les paramètres

**Pilotage · À confirmer · Factures · Certificats.** Chacune correspond à un moment réel du
travail : je regarde où j'en suis, je tranche ce qui bloque, je dépose, j'exporte. Les paramètres
sont détachés en bas.

« À confirmer » porte un compteur. C'est la seule entrée qui réclame quelque chose. À zéro, elle
s'atténue visuellement **sans disparaître** : un gérant doit pouvoir vérifier qu'il n'a rien
oublié, pas se demander où est passé le menu.

### Le geste de scan ne vit pas dans la navigation

Il est au-dessus, en tête de barre latérale, en bouton plein. Un bouton flottant persistant
deviendrait redondant avec une barre fixe, et recouvrirait du contenu. En tête de barre, il est
atteignable en permanence sans jamais masquer l'écran de travail.

### Trois régimes, un seul composant

| Largeur | Régime | Barre |
|---|---|---|
| ≥ 1024 px | tablette paysage, desktop | latérale fixe, 72 px repliée, 240 px dépliable, état mémorisé |
| 768 à 1023 px | tablette portrait | latérale figée à 72 px, icônes seules |
| < 768 px | téléphone | barre **basse**, scan au centre |

Sous 768 px, un rail à gauche consommerait la dimension la plus rare et éloignerait les cibles du
pouce. La barre basse place le scan là où on l'atteint sans regarder.

### Mesures

- Cibles tactiles **48 px minimum** partout, pas 44 : sur tablette le doigt est posé à plat.
- Canvas à 24 px de marge minimum, 32 px à partir de 1280 px.
- Retour visuel immédiat au tap sur toute cible, sans exception.
- Aucun débordement horizontal du document, à aucune largeur.

Le `navMode="app-topbar"` actuel est remplacé par un mode `app-rail` dans `AuthenticatedLayout`.
`/ops` n'utilise pas ce composant — il porte son propre en-tête — donc sa suppression ne le
simplifie pas : `AuthenticatedLayout` n'a plus qu'un seul consommateur, et les modes de navigation
inutilisés peuvent être retirés.

---

## 3. Les quatre écrans

### 3.1 Pilotage

**Sans données**, l'écran est un parcours d'amorçage en trois étapes, la première en avant :
déposer douze mois de factures. **Les jauges n'apparaissent pas tant qu'elles ne veulent rien
dire.** Trois jauges à 0 % sur un écran de conformité donnent l'impression d'un produit cassé.

**Avec données**, trois jauges : durable, bio, viande-poisson. Chacune porte son seuil et, en
dessous, **l'écart en euros** plutôt qu'en points. « Il manque 41 000 € d'achats à basculer » se
comprend et s'actionne ; « il manque 13,45 points » ne se comprend pas.

**Période : l'année civile uniquement**, avec accès aux années précédentes. EGalim se déclare par
année civile, et un pourcentage sur un mois d'achats ne se compare à aucun seuil légal. Afficher
« 38 % en mars » inviterait à conclure quelque chose de faux.

Puis un bloc « À confirmer » avec le montant en jeu, et la répartition par label sur les mois
écoulés.

### 3.2 Scan et dépôt

Flux caméra plein écran, cadre de guidage, gros déclencheur, miniatures empilées en bas, compteur
de pile, bouton « Terminer et analyser (n) ». Un swipe vers le haut sur une miniature la supprime.
Bouton d'import de fichier en secours.

**Pas de détection de bords ni d'auto-capture.** L'extraction envoie l'image à Claude, qui encaisse
la perspective, l'inclinaison et un cadrage approximatif : la détection de bords améliorerait le
confort, pas la justesse, au prix d'une dépendance WebAssembly lourde au démarrage.

**La consigne sur l'export comptable ne vit pas sur l'écran caméra.** Elle vaut 80 % du travail
d'extraction — un CSV comptable se lit sans appel d'IA, instantanément et sans erreur. Elle va sur
l'écran Factures et dans l'état d'amorçage, avant que le gérant n'attrape son téléphone pour
photographier quarante pages.

### 3.3 À confirmer

**L'unité de travail est le libellé distinct, jamais la ligne ni la facture.** Une cantine achète
les mêmes 300 à 500 produits toute l'année : valider par facture ferait revoir le même cabillaud
quarante fois.

En paysage, l'écran est **en deux volets** :

- **Gauche** : la file des libellés à confirmer, triée par montant cumulé en jeu, en valeur
  absolue (un avoir de −400 € se trompe aussi cher qu'un achat de 400 €).
- **Droite** : le détail du libellé sélectionné **avec la facture qui le porte**, ligne surlignée,
  pinch-to-zoom.

C'est là que le split-screen trouve sa place : appliqué à la bonne unité de travail, il montre la
preuve du produit qu'on est en train de trancher plutôt que de rejouer la même facture.

Chaque entrée porte la proposition de l'IA déjà remplie, son motif de remontée et sa confiance. Un
tap confirme et descend d'un cran. Un tap sur la proposition ouvre un sélecteur tactile large pour
corriger. Code couleur : ambre pour ce qui appelle un regard, **jamais rouge** — l'app constate,
elle n'accuse pas.

Sous 1024 px : un seul volet, la preuve s'ouvre en dessous de la ligne sélectionnée.

### 3.4 Certificats

Segments de période, aperçu A4 au centre, génération PDF, partage natif.

**Deux documents distincts, jamais confondus :**

1. **La saisie « ma cantine »** — les montants agrégés à recopier dans la télédéclaration. Ce
   n'est pas un certificat, c'est un pense-bête chiffré.
2. **Le rapport de mesure daté et figé**, avec sa méthode et son barème, celui qu'on présente en
   contrôle.

Les confondre ferait croire qu'on délivre une attestation officielle, ce que nous ne faisons pas.

Les courriers de demande d'attestation aux fournisseurs vivent aussi ici : ce sont des points de
ratio récupérables sans changer un seul achat, et souvent ce qui rembourse la prestation.

---

## 4. Modèle de données

### Les ratios changent d'unité : du lot vers l'année

Aujourd'hui ils se calculent par lot de dépôt et se figent dans un `diagnostics`. Avec un dashboard
vivant, ils se calculent par **année civile**, sur toutes les lignes de l'organisation dont la date
de facture tombe dans l'année, quel que soit le lot qui les a apportées. C'est ce qui permet de
déposer en trois fois sans que le chiffre soit faux entre-temps.

L'index `by_org_and_date` sur `invoiceLines`, jusqu'ici déclaré et jamais utilisé, devient la clé
de lecture principale.

**`invoiceBatches` survit** mais redescend à ce qu'il est : un dépôt de fichiers, l'unité de suivi
du traitement. Plus l'unité de mesure.

**`diagnostics` change de rôle** : plus produit automatiquement à la fin de chaque lot, il devient
le **certificat figé**, produit à la demande pour une période choisie.

### Le consensus, sans jamais savoir qui

`productLabels` est globale et ne doit contenir aucun lien vers une organisation, aucun montant,
aucune quantité, aucun fournisseur. Compter « combien de clients distincts ont confirmé » semble
exiger de savoir lesquels. Ça se résout ainsi :

- On ne stocke qu'un **compteur nu** sur le libellé global.
- La question « cette organisation a-t-elle déjà confirmé ce libellé ? » se répond **entièrement
  côté client**, en regardant ses propres `invoiceLines`.
- La file ne demandant un libellé qu'une fois par organisation, le compteur vaut bien un compte de
  clients distincts, **sans que la table globale n'apprenne l'identité d'aucun**.

Le désaccord se traite symétriquement : une correction qui contredit le verdict global marque le
libellé comme contesté, et il redevient une question posée à tous au lieu d'écraser silencieusement.
Deux verdicts concurrents stockés côte à côte ne révèlent rien de personne.

**Le seuil, explicitement :** un libellé cesse d'être demandé quand **trois organisations
indépendantes l'ont confirmé et qu'aucune ne l'a contredit**. Trois plutôt que deux parce que deux
confirmations peuvent venir de deux gérants qui cliquent vite sur la même proposition ; à trois, le
hasard devient improbable. C'est une constante nommée, revue à la mesure du taux de correction, pas
une vérité.

**Ce que le consensus n'autorise pas :** ce seuil est un paramètre de qualité, pas une certitude.
**Viande et poisson restent demandés quel que soit le consensus.**

---

## 5. États limites

### Le chiffre affiché pendant que tout n'est pas confirmé

C'est le point le plus important de cette spec.

- Le **dashboard affiche le ratio complet**, IA comprise, avec à côté la part encore à confirmer.
  C'est le sens de l'automatisation : un chiffre tout de suite. Mais on ne le maquille pas.
  Cette part s'exprime **en pourcentage du montant d'achats alimentaires**, pas en nombre de
  libellés : « 12 % de vos achats reposent encore sur une classification non confirmée » dit ce
  qui est en jeu, là où « 37 libellés à confirmer » ne dit pas si ça pèse 200 € ou 40 000 €.
- Le **certificat figé refuse de se produire** tant que viande et poisson ne sont pas confirmés.
  Le seuil juridique est là, pas dans le pilotage quotidien. Un gérant peut piloter avec une mesure
  approchée ; il ne peut pas présenter une pièce en contrôle sur du non-relu.

### La caméra dans une vraie cuisine

- `getUserMedia` exige une origine sécurisée : HTTPS ou localhost.
- Permission refusée ou absence de caméra : l'écran **bascule sur l'import de fichier**, sans
  culpabiliser l'utilisateur.
- **Les captures survivent à un envoi raté.** Le wifi d'un économat est mauvais et quarante photos
  c'est beaucoup : elles restent côté client tant que l'upload n'est pas confirmé, et se rejouent.
  Refaire quarante photos parce que le wifi a lâché à la trente-huitième, c'est le genre de chose
  après laquelle on n'ouvre plus l'app.
- **Envoi séquentiel**, un fichier à la fois. Quarante uploads en parallèle saturent la connexion
  et font échouer des envois pour une raison étrangère à leur contenu.

### Ce qui ne change pas

Le pipeline extraction-classification reste tel quel : validé face à de vraies factures, et durci
par les correctifs d'échelle. Seule sa **sortie** change : elle alimente la file du gérant au lieu
d'une file opérateur.

### Défauts déjà corrigés, à ne pas perdre dans la refonte

- Un lot dont tout échoue **ne produit pas de mesure à 0 %**.
- Une ligne non classée est **exclue** du calcul et son montant affiché à part, jamais comptée
  comme non qualifiante.
- Une remise globale hors alimentaire **part en confirmation** : sortie du calcul, son montant
  négatif cesserait de réduire les achats alimentaires et les trois ratios baisseraient sans raison.

### Migration

Il n'y a pas de production. Les données locales sont du test et se purgent. Aucun script de
migration à écrire — ce qui est une chance, le changement d'unité de mesure en aurait demandé un.

---

## 6. Vérification

### Tests unitaires

Couvrent ce qui se raisonne sans navigateur : agrégation par année civile, compteur de consensus et
sa règle d'incrément, routage des verdicts. Les 540 tests actuels restent, notamment les 29 du
barème et le test du mot interdit, qui s'étend aux nouveaux écrans.

### E2E

Parcours complet : état d'amorçage, dépôt, confirmation d'un libellé, certificat.

Pour la caméra, Playwright accorde la permission et injecte un **flux vidéo factice** via les
options de lancement de Chromium. Ça ne teste pas la qualité d'image, mais ça teste ce qui casse :
permission refusée, pile de miniatures, reprise après envoi raté.

**Aucun débordement horizontal** à 375, 768, 1024 et 1280 px, mesuré sur la géométrie rendue.

### Gate

Dépendance non levable : **100 lignes vérifiées à la main sur un jeu de factures réelles**, moins
de 5 % d'erreur. Trois ou quatre jeux sur des mois différents.

---

## 7. Ordre de livraison

**On transplante avant de supprimer.** `revue.ts` contient la logique qui fait la valeur de la file
— regroupement par libellé, tri par montant en jeu, motif de remontée. Elle se transplante, elle ne
se réécrit pas de mémoire.

1. Socle : `CLAUDE.md` remis d'équerre, shell de navigation tablette
2. Backend : ratios par année, file de confirmation, consensus
3. Écran À confirmer, deux volets, avec la preuve
4. Pilotage
5. Suppression de `/ops`, des huit tables et du code concierge
6. Scan caméra
7. Certificats
8. Gate finale

**Les étapes 1 à 4 forment un produit utilisable** : un gérant peut déposer un export comptable,
confirmer, et lire son chiffre. Le scan caméra est du confort d'acquisition, les certificats de la
restitution. Importants, mais après que la boucle centrale tourne.
