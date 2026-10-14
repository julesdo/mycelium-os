# Le site Letikette, à la hauteur du produit (14/10/2026)

> **Statut : validée par le fondateur le 14/10/2026** (« A, ok pour le héros et le titre, vas-y »),
> construite le jour même en sept lots (`9afe545` à la page `/securite`). Il a tranché une question de plus le même jour : « affiche toutes les
> intégrations, elles vont être mises en place ». Le site montre donc les logiciels comptables,
> Qonto et les services de fichiers, bien qu'aucun ne soit encore configuré en production (section 3).
> Et un troisième : le sous-titre du héros décrit le produit entier, pas seulement Plume (« Letikette
> lit vos factures, calcule ce que chaque client vous doit, pénalités comprises, et le relance à
> votre nom. Du premier rappel au virement, vous gardez la main. »).

## 1. Ce que j'ai compris

Le fondateur, le 14/10/2026 : « le site internet n'est pas du tout à jour et à l'image de toutes
les features de l'app, et pas à la hauteur face à l'aboutissement de l'app ». Il demande de
s'inspirer des meilleurs sites relevés sur Mobbin.

- **Le but** : qu'un gérant qui arrive sur www.letikette.com voie le produit tel qu'il est
  aujourd'hui, Plume compris, et ressente le même soin que dans l'application.
- **Pour qui** : la même cible que le 06/10 : le gérant d'une TPE ou d'une PME qui facture
  d'autres entreprises, ni juriste ni directeur financier, qui n'aime pas relancer.
- **Réussi si** :
  - chaque fonction en service en production a sa place sur le site, et aucune qui ne l'est pas ;
  - le site ne paraît plus en retard sur l'application : mêmes écrans, même assistant, même
    finition ;
  - la page d'accueil n'est pas plus haute qu'aujourd'hui sur téléphone, malgré deux fois plus de
    choses à montrer.
- **Ce qui ne change pas**, parce que le fondateur l'a validé ou exigé :
  - la direction « papier chaud » du 06/10 : crème, encre bleue, serif Newsreader, teintes des
    familles, photos de métiers sans prénom ;
  - le ton des logiciels financiers (titre = ce que fait le produit, faits vérifiables) ;
  - aucun faux témoignage, logo de client ni chiffre d'usage inventé ;
  - jamais « garantie », « hébergé en France », « de bout en bout » ;
  - aucune promesse de résultat.

## 2. Le constat, mesuré sur la production (14/10, 482 px de large)

12 461 px, 1 009 mots, onze sections.

| Section           | Hauteur | Ce qui ne va plus                                                                                                                      |
| ----------------- | ------: | -------------------------------------------------------------------------------------------------------------------------------------- |
| Héros             |   1 236 | « Votre bilan offert » (le bilan n'existe plus) ; l'écran d'accueil du 06/10, sans Plume                                               |
| Pour qui          |     778 | Rien                                                                                                                                   |
| La loi            |     995 | Trois chiffres statiques                                                                                                               |
| La frise          |     822 | Démontre la loi sur un exemple figé                                                                                                    |
| Comment ça marche |     827 | « Chaque nuit » (le pilote vit en permanence) ; « Validez chaque dossier » (Plume prépare, le gérant démarre) ; cinq captures du 06/10 |
| Sécurité          |   1 669 | Ignore le coffre-fort (scellé, clé par entreprise, journal des accès)                                                                  |
| Tarifs            |   3 305 | Un quart de la page sur téléphone                                                                                                      |
| FAQ               |     802 | Rien sur Plume, les logiciels, les documents                                                                                           |
| Blog              |     768 | Seul accès au blog sur téléphone                                                                                                       |
| Appel             |     540 | « Votre bilan offert, sans carte »                                                                                                     |
| Pied              |     721 | Aucun lien vers le produit                                                                                                             |

**Absents du site**, alors qu'ils sont livrés et en service :

- Plume : la mascotte, la conversation qui agit, la capsule en direct, le point du retour, sa
  journée ;
- les relances automatiques et leur plan, chacune retenable une heure avant ;
- les dossiers qui naissent seuls ;
- la parole du client : promesses, échéanciers, classement ;
- le coffre-fort et sa visionneuse ;
- la santé des clients (indice, dirigeants, procédures) ;
- la défense (avocats et commissaires près du client) ;
- les logiciels branchés ;
- l'application installable sur téléphone.

**Et la barre n'a aucun lien sous 1024 px** : sur téléphone, on ne peut aller ni aux tarifs, ni à la
sécurité, ni au blog autrement qu'en descendant.

## 3. Ce qui est en service, et donc ce que le site peut montrer

Règle de la section Sécurité depuis le 06/10, étendue à tout le site : **rien qui ne soit en place**.
Relevé sur les noms des variables de production (sans leurs valeurs) le 14/10.

| Fonction                                                                | En production ?                                  | Sur le site                                                                                                            |
| ----------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Plume, conversation et gestes                                           | oui                                              | oui                                                                                                                    |
| Relances automatiques par e-mail                                        | oui                                              | oui                                                                                                                    |
| Coffre-fort                                                             | oui                                              | oui                                                                                                                    |
| Santé des clients (Pappers + BODACC)                                    | oui                                              | oui                                                                                                                    |
| Défense (annuaire, études)                                              | oui                                              | oui                                                                                                                    |
| Logiciels par Nango (Pennylane, QuickBooks, Xero, Sellsy, Stripe, Zoho) | clé posée                                        | oui, **seulement les intégrations configurées dans le tableau de bord Nango**, à vérifier logo par logo avant le lot 5 |
| Qonto                                                                   | **non** (`QONTO_CLIENT_ID` absent)               | non, tant que la clé n'est pas posée                                                                                   |
| Google Drive, Dropbox, OneDrive, Box (Companion)                        | **non** (dormant)                                | non                                                                                                                    |
| Paiement de l'abonnement (Paddle)                                       | **fermé** (`PADDLE_FACTURATION_OUVERTE` absente) | les prix oui, comme aujourd'hui                                                                                        |

Cette règle devient **exécutable** : un seul registre, `src/marketing/fonctionnalites.ts`, porte
chaque fonction avec :

- son nom ;
- sa phrase ;
- sa famille, donc sa teinte ;
- sa capture ;
- son ancre ;
- un champ `enService`.

Le menu, la grille « Tout ce qui va avec », le pied de page et la FAQ lisent ce registre. Ajouter
Qonto le jour où sa clé est posée, c'est changer un booléen.

## 4. Les références (Mobbin, 14/10/2026)

| Site                                                                                 | Section           | Ce qu'on en prend                                                                                       |
| ------------------------------------------------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------- |
| [Superpower](https://mobbin.com/sites/sections/a66c7229-39c5-4f24-b34c-c09db551575d) | Héros             | L'assistant DANS le téléphone, au centre du héros                                                       |
| [Jeton](https://mobbin.com/sites/sections/091299d9-899c-4a1b-9759-4892aadd2a99)      | Héros             | Le téléphone posé sur un grand aplat de couleur                                                         |
| [Cosmos](https://mobbin.com/sites/sections/966a22f5-3c8a-4a47-b013-ee4e277aceb9)     | Partout           | Le téléphone devant l'écran d'ordinateur : le produit existe aux deux tailles                           |
| [Wise](https://mobbin.com/sites/sections/5054f80e-818d-4bcf-8478-6251131c0107)       | Calculateur       | Un montant saisi, le détail ligne à ligne qui se calcule dessous                                        |
| [Whop](https://mobbin.com/sites/sections/4db0b302-8a31-4645-b1e1-21d72a3c3bea)       | Calculateur       | Le résultat en grand, en tête de la carte                                                               |
| [Calendly](https://mobbin.com/sites/sections/27a6b623-76a7-4d19-b068-7ab1f5ed94b5)   | L'assistant       | « Meet Callie » : l'assistant nommé, ses capacités en rangées qui se déplient, une barre de progression |
| [Zaro](https://mobbin.com/sites/sections/ff9629f3-1891-4294-9537-02f9a392179a)       | L'assistant       | « Watch your agents run in real time » : le travail visible, en cours                                   |
| [Lassie](https://mobbin.com/sites/sections/926d3a62-6a96-40d0-9c46-4965679df3c7)     | L'assistant       | « Lassie working… » : une carte d'état posée sur l'image                                                |
| [Superhuman](https://mobbin.com/sites/sections/0ceebdca-4901-4940-897d-14fef921e803) | L'assistant       | Les fragments d'interface qui flottent, une phrase chacun                                               |
| [Midday](https://mobbin.com/sites/sections/feaf92f2-1f1e-45bc-b9a0-39b2102c816e)     | Comment ça marche | Les étapes à gauche, l'écran qui change à droite au défilement                                          |
| [ClickUp](https://mobbin.com/sites/sections/ddc5a66d-9e0a-4186-8882-53940f608b03)    | Tout le reste     | Une grille de tuiles numérotées, chacune porte un fragment d'écran                                      |
| [Ramp](https://mobbin.com/sites/sections/c8c9661e-ffe2-4090-95f3-4b3ea4ae089a)       | Tout le reste     | Des tuiles calmes, un titre en haut, une phrase en bas                                                  |
| [Lattice](https://mobbin.com/sites/sections/2006d3b7-193b-4953-82c6-561f459bf832)    | Logiciels         | Les logos en tuiles autour du titre                                                                     |
| [Maze](https://mobbin.com/sites/sections/64309f92-4be0-4068-907a-c2a0f6861a39)       | Sécurité          | Six mesures en grille sur l'encre, un objet-coffre en tête                                              |
| [Wise](https://mobbin.com/sites/sections/b0f30855-bfdb-458b-97c8-b550c82c4d58)       | Sécurité          | Une page dédiée « comment on protège », liée depuis la section                                          |
| [Intercom](https://mobbin.com/sites/sections/650d948a-d6fe-47dc-8332-f3639148b176)   | Barre             | Le menu « Produit » : une icône, un nom, une demi-ligne                                                 |
| [Midday](https://mobbin.com/sites/sections/ec123707-04ca-4719-b2d4-d2aab5586d21)     | Pied, menu        | L'index des fonctions : une vignette, deux mots, une fonction                                           |
| [Cartesia](https://mobbin.com/sites/sections/f7fe4c69-1b50-448b-92f8-96f3bbae2568)   | /tarifs           | La formule recommandée d'après ce qu'on déclare                                                         |

## 5. Trois façons de faire

**A. L'accueil refait, plus deux pages (recommandée).** La page d'accueil raconte le produit en dix
sections. `/tarifs` et `/securite` deviennent des pages. Le menu « Logiciel » liste chaque fonction
et mène à sa place sur l'accueil.

- **Pour** : c'est ce que font Midday, Superpower ou Lassie, des produits d'un seul geste. Le gérant
  lit tout d'un défilement, et les deux questions qu'il se pose avant de payer (« combien ? »,
  « mes données ? ») ont leur page, citable et référencée.
- **Contre** : chaque fonction n'a pas sa page de référencement.

**B. Un site par fonction**, comme Qonto, Pennylane ou Ramp : une page pour Plume, une pour les
relances, une pour le coffre, et ainsi de suite.

- **Pour** : le meilleur référencement, mot clé par mot clé.
- **Contre** : huit pages à écrire et à tenir à jour avec le produit, qui bouge chaque semaine. Une
  page mince fait plus de tort qu'aucune page, et le blog porte déjà le référencement par question.

**C. Rafraîchir seulement** : nouvelles captures, textes corrigés, mêmes sections.

- **Pour** : une demi-journée.
- **Contre** : ne répond pas à « pas à la hauteur ». Le site resterait une suite de sections
  statiques, sans l'assistant qui fait la différence.

**Je recommande A**, et B plus tard, fonction par fonction, quand le blog dira laquelle est cherchée.

## 6. La page d'accueil, section par section

Dix sections au lieu de onze. La loi, la frise et le blog en sortent ; le calculateur, Plume et
« Tout ce qui va avec » y entrent.

### 6.1 La barre

- **Au-delà de 1024 px** :
  - à gauche, « Logiciel » ouvre un panneau à la manière d'Intercom : chaque fonction du registre
    avec sa vignette de famille, son nom et une demi-ligne, en deux colonnes ;
  - puis « Sécurité », « Tarifs », « Blog » ;
  - à droite, « Se connecter » et le seul bouton plein.
- **Sous 1024 px** : la marque, le bouton, et un bouton rond « Menu ». Il ouvre une page pleine,
  avec les mêmes entrées en cartes et la connexion. **C'est le manque le plus visible
  aujourd'hui.**

### 6.2 Le héros

- **Le titre dit ce que fait le produit maintenant** : il relance, pas seulement il calcule.
  Proposition :

  > **Vos factures impayées, relancées pour vous.**
  > Plume, l'assistant de Letikette, calcule ce qu'on vous doit au centime et relance vos clients à
  > votre nom. Chaque relance vous est montrée une heure avant de partir.

- **Les levées de risque, cochées** : « Découverte gratuite », « 30 jours d'essai, 0 €
  aujourd'hui », « Sans engagement ». Elles sont lues sur `config/tarifs.ts`, et « Votre bilan
  offert » disparaît.
- **La scène**, sur un aplat de couleur à la manière de Jeton :
  - au centre, le téléphone, avec l'écran d'accueil d'AUJOURD'HUI : Plume dans la barre, et la
    capsule « Part dans 42 min · Retenir » ;
  - à côté, Plume en grand, le vrai dessin de `ui/plume.tsx`, humeur « salue » ;
  - deux cartes posées : « 18 443,92 € de pénalités et de frais jamais réclamés » (l'écran de
    démonstration) et « Relance prête · Retenir ».
  - Au-delà de 1024 px, l'écran d'ordinateur en deux volets derrière le téléphone, comme chez
    Cosmos : l'application existe aux deux tailles.
- **La photo de l'artisan descend** dans « Pour qui » : le héros montre le produit.
- **Sous le héros, une bande** : « Se branche sur » et les logos des logiciels **en service**
  (section 3), puis « FEC, Factur-X, PDF, photo ».

### 6.3 Le calculateur : « Combien vous doit-on, vraiment ? »

Il remplace « La loi » et « La frise ». L'énoncé et sa démonstration deviennent UN geste que le
visiteur fait lui-même, à la manière de Wise et Whop.

- **Deux champs** : le montant de la facture et sa date d'échéance. Le secteur se choisit par un
  `Segmented` : « En général », « Transport ».
- **Dessous, calculé par le moteur du produit** (`decompterFacture`, comme les illustrations du
  blog le font déjà) :
  - les pénalités au taux du semestre ;
  - les frais forfaitaires ;
  - le total, en grand ;
  - la date limite pour agir en justice. L'idée de la frise tient en une ligne : « Après le
    31 mars 2031, cette facture ne se réclame plus. »
- **« Voir le calcul période par période »** déplie les segments : le chiffre se refait à la main.
- La source tient en une ligne (« Code de commerce, art. … », lue sur `ARTICLES_DU_SOCLE`), et le
  seul bouton dit « Faire ce calcul sur toutes mes factures ».
- **Aucune valeur tapée.** Un semestre de taux absent fait disparaître le calculateur plutôt que
  de mentir, comme la frise aujourd'hui.

### 6.4 Plume : « Plume fait le travail. Vous décidez. »

La section qui manque le plus, à la manière de Calendly (« Meet Callie »), Zaro et Lassie.

- **À gauche, quatre rangées qui se déplient** (une ouverte à la fois, une barre qui avance
  toutes les six secondes comme chez Calendly, arrêtée sous `prefers-reduced-motion`) :
  1. **Il ouvre vos dossiers.** Une facture échue entre seule dans le dossier de son client. Vous
     le démarrez d'un geste.
  2. **Il relance à votre nom.** Le plan lu sur `PLAN_PAR_DEFAUT` : rappel 3 jours après
     l'échéance, deuxième rappel 10 jours après, lettre officielle 10 jours après. En semaine, de
     9 h à 18 h (`HEURES_D_ENVOI`). Chacune se retient pendant l'heure qui précède
     (`DELAI_POUR_RETENIR_MS`).
  3. **Il écoute votre client.** Une promesse le fait taire jusqu'au jour promis plus 3 jours
     (`JOURS_DE_GRACE`). Un échéancier le fait taire tant que les versements arrivent.
  4. **Il répond, et il agit.** On lui pose une question, on lui joint un document ; il propose un
     geste, vous confirmez.
- **À droite, la scène de la rangée ouverte** : la capture du fil de Plume, de sa maison ou du
  dossier qui avance. Une **carte vivante** est posée dessus : les étapes d'un travail qui se
  cochent une à une, le vrai rythme du produit (0,7 s). C'est un fragment de CSS d'une
  quarantaine de nœuds, pas un écran rendu en composants.
- **Les limites, dites dans la section** : rien ne part vers un tribunal ; la remise à votre
  avocat, c'est vous qui la décidez.

### 6.5 Comment ça marche, en quatre étapes

À la manière de Midday : les étapes à gauche, le téléphone collé à droite, qui change d'écran au
défilement. Sur téléphone, le carrousel d'aujourd'hui.

1. **Branchez vos factures** : votre logiciel, ou un dépôt (FEC, Factur-X, PDF, photo). Capture :
   le parcours de dépôt ou « Logiciels ».
2. **Plume prépare** : les dossiers, les montants, les dates limites. Capture : Aujourd'hui.
3. **Les relances partent** : à votre nom, retenables. Capture : la carte « Part bientôt ».
4. **Votre client paie** : par virement sur votre compte, depuis une page à votre nom. Capture :
   la page de paiement.

### 6.6 Tout ce qui va avec

Une grille de six tuiles, à la manière de Ramp et ClickUp. Chacune porte un fragment d'écran
recadré, un titre de cinq mots au plus, une phrase, et la teinte de sa famille.

| Tuile                    | Phrase (proposition)                                                                | Capture                                        |
| ------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------- |
| Le coffre-fort           | Chaque document scellé à son arrivée, chaque ouverture notée.                       | `/app/coffre`                                  |
| La santé de vos clients  | Un indice, ses raisons, et les procédures de ses dirigeants, chacune à sa source.   | fiche santé                                    |
| Promesses et échéanciers | Le paiement en plusieurs fois se convient, puis se suit versement par versement.    | échéancier                                     |
| Votre défense            | Les avocats et commissaires de justice près de votre client, le jour où il le faut. | Défense                                        |
| La page de paiement      | Votre client paie par virement, sur votre compte. Aucune commission.                | `/p/<jeton>`                                   |
| Sur votre téléphone      | Elle s'installe depuis le navigateur, sans passer par un magasin d'applications.    | Aujourd'hui sur l'écran d'accueil du téléphone |

### 6.7 Pour qui

La section d'aujourd'hui, inchangée, avec la photo de l'artisan en plus. Trois métiers, trois
photos, sans prénom.

### 6.8 Sécurité

L'encre, six mesures en grille à la manière de Maze, toutes en place :

- scellé à l'arrivée, AES-256 avec une clé par entreprise ;
- chaque accès noté ;
- rien ne part sans vous ;
- aucun fonds ne transite par nous ;
- données cloisonnées par entreprise ;
- effacement total.

En tête, un coffre dessiné en CSS : pas de 3D, rien de lourd. Le lien mène à `/securite`.

### 6.9 Tarifs

Les trois cartes et la bascule mois/année. Sur téléphone, un carrousel au lieu de trois cartes
empilées, avec Découverte en une ligne dessous. Le tableau de tout ce qui est inclus part sur
`/tarifs`. Cible : 3 305 px → environ 1 000 px.

### 6.10 FAQ, puis l'appel

**Huit questions, refaites** :

- Plume envoie-t-il des e-mails tout seul ?
- Puis-je retenir une relance ?
- Letikette encaisse-t-il l'argent ?
- Comment les montants sont-ils calculés ?
- Quels logiciels se branchent ? (la réponse lit le registre)
- Où vont mes documents ?
- Letikette remplace-t-il un avocat ?
- Puis-je arrêter quand je veux ?

**L'appel final** : Plume (humeur « fête »), « Montrez vos factures à Plume. », un bouton, les
levées de risque. Le blog quitte l'accueil : le menu et le pied de page y mènent désormais.

### 6.11 Le pied

En plus de la phrase qui borne le produit et des liens légaux, trois colonnes, à la manière de
Midday :

- **Logiciel** : le registre ;
- **Ressources** : blog, sécurité, tarifs ;
- **Compte** : se connecter, créer un compte, contact.

## 7. Les deux pages

- **`/tarifs`** :
  - les cartes ;
  - le tableau complet de ce qui est inclus (`CE_QUI_EST_INCLUS`) ;
  - la formule conseillée d'après la forme juridique (`formuleRecommandee`, à la manière de
    Cartesia) ;
  - les questions de facturation : essai, rappels avant prélèvement, remboursement sous
    `JOURS_DE_REMBOURSEMENT` jours, résiliation en deux gestes ;
  - le lien vers la politique de remboursement.
- **`/securite`** : la page « comment on protège vos données », à la manière de Wise. Elle reprend
  la section Sécurité de la politique de confidentialité et le coffre-fort, sans un mot de plus
  que ce qui est en place : le chiffrement, la clé par entreprise et ce qui arrive si elle se
  perd, le jeton d'une minute, le journal, les prestataires et leur pays, la purge. Elle dit aussi
  ce qu'on n'écrit pas, et pourquoi : la base est chez Convex aux États-Unis, et un document part
  au prestataire de lecture.

Toutes deux entrent au plan du site (`sitemap.xml`).

## 8. Les captures

`scripts/capturer-ecrans.ts` reprend les écrans de la salle d'exposition.

- **À 393 px** :
  - aujourd'hui (avec Plume et la capsule) ;
  - le fil de Plume et sa maison ;
  - le dossier ;
  - « Part bientôt » ;
  - le dépôt ;
  - les logiciels ;
  - le coffre ;
  - la santé d'un client ;
  - la défense ;
  - l'échéancier ;
  - la page de paiement.
- **À 1280 px**, pour l'écran d'ordinateur du héros : aujourd'hui en deux volets.
- **L'image de partage** (`partage.png`) se régénère avec la nouvelle promesse.

Les six captures du 06/10 sont remplacées.

## 9. Ce qui reste au fondateur

1. **A, B ou C** (section 5). Je recommande A.
2. **Le héros** : Plume et le téléphone au centre, la photo de l'artisan descendue dans
   « Pour qui » (ma proposition) ; ou la photo garde le héros et Plume ouvre la section suivante.
3. **Le titre** : « Vos factures impayées, relancées pour vous. », ou un autre.

Et une vérification avant le lot 5 : quelles intégrations sont configurées dans le tableau de bord
Nango. Seules celles-là auront leur logo.

## 10. Les lots, chacun déployé et vérifié en production

| Lot | Contenu                                                                                   |
| --- | ----------------------------------------------------------------------------------------- |
| 1   | Le registre `fonctionnalites.ts` et les nouvelles captures                                |
| 2   | La barre : le menu « Logiciel » au-delà de 1024 px, la page pleine en dessous             |
| 3   | Le héros et la bande des logiciels                                                        |
| 4   | Le calculateur (loi et frise retirées)                                                    |
| 5   | Plume, puis « Comment ça marche »                                                         |
| 6   | « Tout ce qui va avec » et Sécurité                                                       |
| 7   | Tarifs compacts, `/tarifs`, `/securite`, FAQ, appel, pied, plan du site, image de partage |

**Mesuré avant et après** :

- hauteur et nombre de mots à 390 et 1280 px ;
- poids du code chargé par `/` (le site ne doit pas tirer l'application) ;
- aux quatre largeurs de référence, dans le navigateur intégré.

**Les tests qui tiennent** :

- le lexique et « garantie » balaient `src/marketing` ;
- un test refuse dans `fonctionnalites.ts` une entrée `enService` sans capture ni ancre ;
- le test des tarifs garde ses montants lus sur `GRILLE`.
