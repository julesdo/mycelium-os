# Spec : la voie de la procédure

Statut : validé le 12 septembre 2026, en attente de relecture.
Chantier 1 sur 3. Les deux suivants (la charpente de navigation, puis la reprise écran par
écran) ont leur propre spec et ne sont pas traités ici.

---

## 0. En une phrase

**Une procédure engagée cesse d'être un écran et devient un objet** : elle a sa place dans la
navigation, un rail qui montre toute la voie, un compte à rebours sur ce qui s'éteint, un geste
de déclaration qu'on ne peut pas manquer, et un intervenant qu'on choisit sans quitter
l'application.

---

## 1. Le problème constaté

Le terrain, mot pour mot : « on n'a pas la sensation que l'on puisse voir les étapes de la
procédure ainsi que le déclenchement de la procédure », et « on n'a même pas d'étape de choix
qui affiche les avocats et les commissaires selon la procédure ».

Le constat est exact, et voici ce qui le produit dans le code d'aujourd'hui.

**Un dossier engagé n'existe nulle part dans la navigation.** Il faut cinq gestes pour
l'atteindre : accueil, débiteurs, le débiteur, la créance, procédure. Rien ne signale en chemin
qu'il y a quelque chose à voir. Une caducité tombe à trois mois.

**Les étapes ne se voient pas.** `apres-procedure.ts` porte deux machines à états complètes,
avec leurs libellés, leurs constats et leurs échéances. L'écran n'en affiche que l'état courant,
en une phrase. La voie entière, ce qui vient après, ce qui peut faire échouer : tout est écrit
en mémoire et rien n'est dessiné.

**Le geste d'engagement est noyé.** `DeclarerEngagement` est un champ de date et un bouton,
posés au bas d'une carte, parmi trois cartes de prose de hauteur égale. Rien ne le distingue
d'un paragraphe.

**Le choix de l'intervenant n'existe pas du tout.** Aucune table, aucun écran, aucun champ.

---

## 2. Ce qu'on construit, et ce qu'on ne construit pas

La forme retenue est **le dossier et ses feuilles** : le dossier est un objet permanent avec une
page à lui, et chaque geste s'ouvre en feuille par-dessus, une décision par feuille.

Deux formes ont été écartées, et il faut savoir pourquoi pour ne pas les reproposer dans six
mois.

**Le parcours guidé plein écran** a été écarté pour deux raisons. Un dossier de procédure dure
des mois, avec des trous de plusieurs semaines : un tunnel suppose qu'on finit d'un coup ce qui
ne se finit jamais d'un coup, et il manque toujours une pièce ou une réponse. Surtout, un tunnel
dont la sortie s'appelle « engager » ressemble à une recommandation, ce que la ligne rouge 3
interdit.

**La page unique où tout s'empile** a été écartée parce que c'est exactement le défaut déjà
corrigé sur l'écran de créance : sept cartes de prose, 6,1 écrans de défilement mesurés à
375 px, aucune hiérarchie.

---

## 3. Les écrans

### 3.1 D'où l'on entre

**Un quatrième onglet, « Procédures ».** La barre passe de trois à quatre entrées : Accueil,
Débiteurs, Procédures, Importer. L'onglet porte une pastille quand une échéance approche.

L'argument de `barre.tsx` contre l'encombrement visait huit cibles de même poids, pas quatre.
Quatre onglets tiennent à 375 px sans serrer, et un dossier doit être atteignable d'un doigt
depuis n'importe quel écran : c'est précisément le manque décrit.

**Le vide de cet onglet montre le chemin.** Tant que rien n'est engagé, il dit ce que le
logiciel comptera le jour où une voie le sera, et il offre une sortie vers les créances. Jamais
un cadran à zéro.

**Une section « Ce qui court » sur l'accueil**, sous le montant, en raccourci vers les mêmes
dossiers.

**Deux volets au-delà de 1024 px**, règle d'écran numéro 3 : la liste des dossiers à gauche, le
dossier ouvert à droite. La sélection vit dans l'adresse (`?p=<creanceId>`), même patron que
`/app/debiteurs`, donc rien de neuf à inventer.

### 3.2 La page d'un dossier

Quatre blocs, toujours dans cet ordre.

**Les étapes.** Un rail vertical qui montre **toute la voie**, pas seulement le chemin parcouru.
Les états passés portent leur date, l'état courant est marqué, les états à venir sont estompés.
Les états viennent de `MACHINES`, qui les décrit déjà.

Une machine à états n'est pas une ligne, et le rail ne fait pas semblant : la bifurcation vers
l'opposition est dessinée en branche pointillée, à sa place dans le temps, avec sa conséquence.
La faire passer pour une étape parmi d'autres mentirait sur le dossier.

**Ce qui court.** L'échéance la plus grave, avec sa date, son compte à rebours en gras, et sa
conséquence. Le geste est dessous, et il est une **déclaration** : « Je l'ai fait signifier »,
jamais « Faire signifier ». Le logiciel enregistre un fait passé et se met à compter ; il ne dit
pas quoi faire.

**Ce qui n'est pas surveillé.** Les angles morts gardent leur carte, en pointillé, **avant** les
rangées et jamais après. Un délai dont le référentiel ignore la durée court quand même, et le
reléguer sous ce qui rassure revient à le cacher.

**Le dossier, puis le journal.** Quatre rangées au patron de `LigneAnalyse` : décompte arrêté,
qui fait l'acte, pièces, créance. Un chiffre ou trois mots à droite, jamais une phrase. Puis ce
qui s'est passé, daté, du plus récent au plus ancien.

### 3.3 Avant l'engagement

Quand rien n'est engagé, la même page montre les voies **envisageables**, en rangées.

**Une feuille par voie**, et c'est elle qui répond au reproche principal. Elle montre le déroulé
numéroté de la voie, tiré de la même `MACHINES` que le rail, puis ce qui la fait échouer, tiré
de `conditionsEchec`. On voit les étapes **avant** de s'engager.

**La liste énumère, elle ne classe pas.** Aucune pastille « recommandée », aucun ordre de
pertinence, aucune mise en avant. Ordonner reviendrait à conseiller la première.

### 3.4 Qui fait l'acte

Le terrain a tranché : selon le montant et le client, le gérant dépose lui-même ou passe par un
professionnel. Le parcours porte donc les deux, et **le logiciel ne choisit jamais**.

La question est posée dans la feuille de déclaration, à côté de la date, parce que c'est un fait
de plus sur un acte déjà fait, pas une étape à part. Les choix sont : moi-même, un intervenant
du carnet, en chercher un, ou « je le dirai plus tard ». Ce dernier ne bloque rien.

**Chercher un avocat** filtre l'annuaire du CNB sur deux champs du fichier lui-même : le
barreau, et les spécialités déclarées.

**Chercher un commissaire de justice** interroge le registre des entreprises, filtré sur la
convention collective de la profession et le département.

**On filtre, on ne classe pas.** Ordre alphabétique. Les filtres ne portent que sur des champs
présents dans la source, jamais sur un critère de notre invention. La source et sa date de
relevé s'affichent sous la liste.

---

## 4. Les sources externes, relevées le 12 septembre 2026

### 4.1 Les avocats : l'annuaire du CNB

Jeu de données « Annuaire des avocats de France » sur data.gouv.fr, producteur Conseil national
des barreaux, publié à la suite d'une injonction du Conseil d'État.

Quatorze champs, dont **le barreau**, le nom, le prénom, la raison sociale, le SIREN, l'adresse,
le code postal, la ville, **trois champs de spécialité**, la date de prestation de serment et
les langues parlées.

Licence Ouverte 2.0 (Etalab). CSV à séparateur point-virgule, 43 fichiers, mise à jour
mensuelle, dernier relevé annoncé le 17 juillet 2026. **Pas d'API.**

### 4.2 Les commissaires de justice : le registre des entreprises

Il n'existe **aucun répertoire public réutilisable** de la profession. L'annuaire de la Chambre
nationale recense 3 718 praticiens mais ne publie ni export, ni flux, ni conditions de
réutilisation. L'aspirer exposerait aux conditions d'utilisation du site et au droit du
producteur de base de données sur l'extraction substantielle. **On ne le fait pas.**

La voie légale est l'API Recherche d'entreprises (`recherche-entreprises.api.gouv.fr`), ouverte,
sans clé, CORS permissif, code source DINUM, adossée à Sirene et à data.gouv.fr.

La requête a été exécutée et vérifiée, pas supposée :

```
id_convention_collective=3250   (convention collective de la profession)
activite_principale=69.10Z      (activités juridiques)
departement=44
```

Rendu : 22 études en Loire-Atlantique, avec dénomination, adresse, code postal, commune et
coordonnées GPS.

**Deux limites relevées dans la réponse, à ne pas taire.**

Le filtre de département porte sur les **établissements** de l'unité légale : une étude dont le
siège est à Rennes remonte si elle a une antenne dans le 44, et la réponse donne alors l'adresse
du siège. L'écran doit afficher l'établissement qui correspond, pas le siège.

Et surtout : **ce n'est pas le tableau de la profession**, c'est le registre des entreprises. Une
étude qui n'a pas déclaré sa convention collective n'apparaît pas. Une radiation disciplinaire
n'y figure pas. L'écran l'écrit en toutes lettres. Un répertoire recopié qu'on laisserait passer
pour l'annuaire officiel serait un mensonge silencieux, et c'est le défaut que ce projet traque
en priorité.

### 4.3 Les juridictions

Jeu de données « Données géocodées des structures de la Justice », ministère de la Justice,
Licence Ouverte, CSV, dernier relevé annoncé le 19 mai 2026. Contient les tribunaux de commerce,
les tribunaux judiciaires et les cours d'appel, avec adresse, GPS, téléphone et courriel.

La fiche **n'annonce pas de champ de ressort**. Le routage vers le tribunal compétent n'est donc
pas promis ici, et il relève de toute façon de la phase 1.

---

## 5. Le modèle de données

**Deux référentiels, sans `organizationId`.** `annuaireAvocats`, alimenté mensuellement depuis le
CSV du CNB. Les commissaires ne se stockent pas : l'API se consulte en direct depuis une action
Convex. Ni l'un ni l'autre n'est une donnée client, donc la barrière de purge n'est pas touchée
et l'effacement RGPD reste total sur ce qui appartient au gérant.

**Une table `intervenants`, cloisonnée par `organizationId`.** Le carnet du gérant : nom, rôle,
ressort, coordonnées, et l'origine de la fiche (saisie à la main, ou retenue depuis un
répertoire, avec la source et sa date). Parce qu'elle porte `organizationId`, `rgpd.ts` doit la
citer, sinon `purge-complete.test.ts` échoue. La barrière fait le travail sans qu'on y pense.

**Deux champs de plus sur le dossier.** La date d'engagement existe déjà. Le lien vers
l'intervenant est nouveau, et il est **facultatif** : « je le dirai plus tard » ne doit rien
bloquer.

**Une entrée de plus au référentiel juridique**, dans `parametres.ts` : quelle profession est
compétente pour quel acte. Non vérifiée, avec sa note.

Il faut distinguer deux choses qu'il serait facile de confondre. **Filtrer par barreau et par
spécialité déclarée est disponible tout de suite** : ces deux champs sont dans le fichier du
CNB, et les lire n'est pas dire le droit. Ce qui manque, c'est la correspondance en amont, celle
qui dirait « pour signifier une ordonnance, c'est un commissaire de justice » et présélectionnerait
la profession. Tant qu'elle n'est pas relevée, l'écran propose les deux professions à égalité et
dit pourquoi il ne présélectionne rien. Le jour où le juriste la relève, la présélection s'allume
sans une ligne de code, comme pour les douze taux.

**Attention au piège Convex.** Les nouvelles fonctions de `recouvrement/` qui appellent
`internal.<leur propre module>` doivent annoter explicitement leur type de retour, faute de quoi
le type de `api` entier retombe sur `any` et tous les écrans perdent leur inférence.

---

## 6. Les barrières exécutables

Une invariante tenue par convention se perd au premier ajout. Chacune de celles-ci s'exécute.

**La citation de la source.** Un test balaie l'interface et échoue si un écran affiche un
professionnel sans afficher la source du répertoire et sa date de relevé. Sans cette barrière,
un répertoire recopié devient indiscernable d'un annuaire officiel.

**La purge.** `purge-complete.test.ts` existe déjà et attrape `intervenants` tout seul, du fait
de son `organizationId`. Rien à ajouter, tout à ne pas contourner.

**Les destinations typées.** Les nouvelles routes passent par `LinkProps['to']`, jamais par une
chaîne littérale. C'est ce qui a transformé le bouton mort « Déposer » en erreur de compilation.

**L'atteignabilité.** L'onglet « Procédures » est une arête entrante réelle vers le dossier. Les
`retourVers` n'en sont pas, et ne comptent pas dans le balayage des écrans injoignables.

**Le mot interdit.** Le test qui balaie l'interface à la recherche de « garantie » couvre les
nouveaux écrans sans modification.

---

## 7. Ce qui manque, et qui le débloque

| Ce qui manque | Effet tant qu'il manque | Qui le débloque |
| --- | --- | --- |
| Quelle profession est compétente pour quel acte | Les deux professions sont proposées à égalité, sans présélection, et l'écran le dit | un juriste |
| La durée du délai d'opposition | Angle mort déclaré, déjà affiché | un juriste |
| La durée de vie d'un titre exécutoire | Angle mort déclaré, déjà affiché | un juriste |
| Le champ de ressort des juridictions | Pas de routage vers le tribunal compétent | vérifier le CSV du ministère |

---

## 8. Hors périmètre, et nommé pour qu'on ne le rediscute pas

**Transmettre le dossier au professionnel depuis l'application.** Le blueprint met la
transmission au commissaire de justice en phase 1, derrière `valideParAvocat`. Le produit monte
le dossier et le met à disposition ; il ne l'envoie pas. Ce n'est pas un arbitrage pris dans
cette spec.

**Recommander une voie.** Ligne rouge 3, jamais.

**Un annuaire que le produit sélectionne ou met en avant.** On filtre sur les champs de la
source, on affiche par ordre alphabétique, et on cite la source.

**Aspirer l'annuaire de la Chambre nationale des commissaires de justice.** Juridiquement
incertain, donc non.

**La charpente de navigation au-delà du quatrième onglet**, et la reprise des autres écrans.
Chantiers 2 et 3.

---

## 9. Comment on saura que c'est fini

Trois critères observables, pas une liste de cases.

1. **Depuis n'importe quel écran, un dossier engagé s'atteint d'un doigt**, et son échéance la
   plus grave se lit sans défiler.
2. **Un gérant qui n'a jamais engagé de procédure peut lire le déroulé complet d'une voie** avant
   de décider quoi que ce soit, et déclarer ensuite ce qu'il a fait sans chercher le bouton.
3. **Le choix d'un intervenant se fait sans quitter l'application**, et l'écran dit d'où vient la
   liste et quand elle a été relevée.
