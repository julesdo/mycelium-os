# La page dossier — design

**Date** : 25 septembre 2026 · **Statut** : décisions de principe prises ; relu par trois relecteurs
indépendants (74 points, tous traités) ; questions ouvertes au § 7
**Chantier** : 1 sur 7 de la refonte d'expérience (voir « Hors périmètre »)

**Relevés sur lesquels ce design s'appuie** (contre-vérifiés, aucun relu par un avocat) :
- [Le dernier mètre : envoyer au nom du client](2026-09-25-releve-envois.md) — 163 citations
- [Les exceptions du parcours](2026-09-25-releve-exceptions.md) — 185 citations, 7 corrigées
- [La relecture juridique](2026-09-25-relecture-juridique.md) — 57 questions, 8 modèles
- [Les modèles de documents](2026-09-25-modeles/README.md)

Là où un modèle contredit ce document, ce document l'emporte, et le modèle est corrigé avant d'être
codé. La relecture (§ 4) prime sur les tableaux « Paramètres à ajouter » des modèles.

**Vocabulaire de ce document** : le « gérant » est l'abonné de Letikette ; le « client débiteur » est
celui qui doit l'argent.

## Le problème

Verdict du fondateur sur l'app : « un Excel++ avec de l'IA », alors que Letikette doit être un service
grand public, facile à prendre en main. La cause est mesurable : un dossier est réparti sur quatre
routes (`/app/creance/$id`, `/app/procedures?p=`, `/app/decompte/$id`, `/app/arret/$id`), le gérant
compose lui-même sa créance facture par facture, l'annuaire des avocats et des commissaires de justice
vit sur la page créance plutôt qu'à l'étape où on en a besoin, et l'état `OPPOSITION` est terminal pour
le produit — l'app s'arrête là où le gérant a le plus besoin d'elle.

Une partie de la matière existe : la machine à états rejouée depuis `evenementsProcedure`
(`apres-procedure.ts`, `parcoursDeLaVoie`, branches comprises), mais seulement à partir de
l'engagement d'une procédure ; les propositions (`propositions`) ; le compagnon et ses refus ; les
annuaires ; le contrôle de complétude (`controle.ts`) ; les décomptes figés ; la remise au conseil
(`remisesAuConseil`, `conseil.ts`). Ce chantier assemble d'abord, et construit ce qui manque.

## Les décisions prises

| Question | Décision |
|---|---|
| Qu'est-ce qu'un dossier ? | **Un dossier ouvert par client**, avec toutes ses factures impayées. Un second dossier n'existe que pour les factures arrivées après la transmission à un professionnel (§ 4.1). On peut retirer une facture ; le produit chiffre ce qu'on abandonne. |
| Jusqu'où l'agent agit-il ? | **Il prépare, le gérant valide d'un geste.** Rien ne s'écrit sans un clic. |
| Qui envoie ? | **Le gérant, avec l'application, après sa validation.** Le document est à son seul nom et sous sa signature ; Letikette l'expédie sans y figurer et sans être son mandataire. Par l'app : au client débiteur, et au mandataire judiciaire. Par la messagerie du gérant, avec le paquet préparé par l'app : à son avocat et à son commissaire de justice (§ 3). **Jamais vers un tribunal ni un greffe.** |
| Qui fait les actes de justice ? | **Les professionnels.** Letikette ne remplace aucun métier réglementé et ne conseille pas. |
| Où est l'avocat ? | **Hors de l'app, dans sa messagerie.** Ses réponses arrivent chez le gérant (secret professionnel), qui les dépose dans le dossier. L'accès invité est un chantier ultérieur. |
| La déclaration de créance ? | **Le gérant choisit, dossier par dossier, au moment de la préparer** : l'envoyer lui-même avec l'app (présélectionné quand aucun avocat n'est désigné), ou la faire partir comme projet chez son avocat (présélectionné quand un avocat est désigné). La jurisprudence la tient pour l'équivalent d'une demande en justice : voir § 7, question 1. |
| La barrière `exigerPourActe()` ? | **Levée pour la lettre de relance officielle, l'accord d'échéancier et la déclaration de créance : la validation du gérant suffit.** `valideParAvocat` reste `false` ; chaque document le dit avant validation. C'est une décision de gestion, contre la recommandation du relevé des envois (des gabarits relus par un avocat avant la production). La barrière reste pour tout acte adressé à un tribunal ou à un greffe. |
| Pour qui écrit-on ? | **Monsieur tout le monde.** Quatre étapes, les mots du gérant, le terme juridique en second. Vaut pour toute l'app. |

Décisions stratégiques connexes, prises le même jour : le compte séquestre fait partie de la
trajectoire (« la néobanque n° 1 du business en Europe ») ; la facturation (devis, avoirs) et l'agent IA
« qui vit dans l'app » sont prioritaires après ce chantier.

## 0. La règle qui traverse tout : le logiciel montre, le gérant qualifie

Source : [relecture juridique](2026-09-25-relecture-juridique.md), § 2.

Un logiciel payant qui dit « cette créance remplit les conditions », attribue un score, choisit le
régime de prescription ou répond à « ai-je droit ? » donne très probablement une consultation juridique
(Cass. 1re civ., 15 nov. 2010 et 25 janv. 2017, publiés ; réponse ministérielle n° 3177, JO AN
8 avr. 2025). Un avertissement ne protège pas. Informer sur l'état du droit reste libre (loi 71-1130,
art. 66-1) ; calculer sur une formule publiée est probablement une opération matérielle ; les choix faits
AVANT le calcul (régime, taux des CGV, imputation, point de départ) sont juridiques, et reviennent au
gérant.

> **Le logiciel lit, calcule et montre. Le gérant qualifie, choisit et signe.**

Ce que ça impose :
- **Plus de verdict à l'écran** : ni « éligible », ni « remplit les conditions », ni « créance
  qualifiée », ni « mûre », ni score de solidité. À la place, trois colonnes : **ce que dit la loi ·
  ce qu'il y a dans votre dossier · ce que vous avez répondu**. Une réponse peut être pré-remplie ; elle
  est marquée « à confirmer ».
- **Le régime de prescription est choisi par le gérant, une fois par client**, par une question simple :
  ce qu'il lui vend, et s'il achète en professionnel ou en particulier. La réponse vit dans
  `debiteurs.secteur`, qui existe déjà. Celle d'un premier client est proposée « à confirmer » pour les
  suivants. Sans réponse, l'app surveille la date la plus proche et dit que c'est une hypothèse.
- **L'imputation des règlements est choisie par le gérant, une fois par dossier** : « pénalités d'abord
  (C. civ. 1343-1) », pré-rempli et marqué « à confirmer », ou « principal d'abord » si ses conditions
  générales le prévoient (une clause relevée s'affiche avec son extrait). Tant qu'il n'a pas répondu, les
  deux variantes sont chiffrées côte à côte, et un décompte figé retient la plus basse en le disant.
- **L'agent répond sur les faits et les calculs du dossier.** À « puis-je », « ai-je droit », « est-ce
  prescrit », il affiche les textes du référentiel et dit qu'un avocat peut répondre. Un test vérifie
  qu'aucune réponse ne dit d'une condition légale qu'elle « est remplie » ou « n'est pas remplie ».
- **Les modèles** : le gérant choisit le modèle dans une liste visible ; chaque variable affiche son
  origine (« facture F-102, importée le… ») ; chaque champ est modifiable ; l'IA n'écrit aucune phrase.
  L'écran dit « pré-rempli avec vos données », jamais « rédigé par l'IA ».
- **Les options d'un choix** ont toujours le même composant, la même taille et un ordre chronologique
  fixe ; aucune n'est principale ; jamais de « prochaine étape recommandée ».

## 1. L'organisation de la page

Route : `/app/dossier/$id`. Deux colonnes à partir de 1024 px inclus (`(min-width: 1024px)`, comme
`maitre-detail.tsx`), une seule en dessous. Sous 1024 px, le contenu du dossier s'empile sous le fil au
lieu de s'ouvrir en feuille : exception assumée à la règle d'écran n° 3, parce que cette page n'est pas
une liste.

**En-tête** — répond en trois secondes :
- le nom du client débiteur ;
- « vous doit 13 977,60 € au 25/09 » : le principal restant dû des factures échues du dossier, plus les
  pénalités et les frais de recouvrement calculés au jour de l'affichage ; « voir le calcul » ouvre le
  décompte du jour, non figé. Après un envoi : « réclamé le 12/09 : 13 802,10 € », avec un lien vers le
  décompte figé ;
- la date limite pour agir en justice, avec le délai choisi par le gérant (« délai de 5 ans, que vous
  avez indiqué ») ou l'hypothèse retenue, suivie de « calculée sans tenir compte d'une interruption »
  (`ANGLE_MORT_PRESCRIPTION`) ;
- la frise des quatre étapes.

**Colonne gauche — où j'en suis.**
- L'étape en cours, seule mise en avant : ce qui se passe, ce qui arrive si rien ne bouge (avec une
  date), et l'action. **Un seul bouton principal quand l'étape attend un seul geste** (valider un envoi
  dont le gérant a choisi le modèle, confirmer une proposition). **Quand elle pose un choix, aucune
  option n'est principale** (section 0). L'agent ne prépare un envoi qu'une fois le modèle choisi.
- Le fil des étapes : passées repliées avec leur date et leur preuve, à venir en gris.

**Colonne droite — ce que contient le dossier.**
- Ce qu'il vous doit : factures, pénalités de retard, frais de recouvrement, « voir le calcul ».
- Documents : ce qui est là, ce qui manque.
- La zone de dépôt unique : « Vous avez reçu un courrier ? Déposez-le ici ». C'est aussi là que le
  gérant dépose les réponses de son client débiteur et de ses professionnels.

**L'agent** est à trois endroits : la mention « pré-rempli avec vos données » avec ses sources dans
l'étape en cours, deux questions déjà écrites pour l'étape (sur les faits et les calculs), et la bulle
flottante bornée au dossier.

**Avant chaque validation**, le document s'affiche tel qu'il partira, avec son résumé en langage courant
(fourni par chaque modèle) et une ligne honnête : « Les chiffres suivent les textes cités dans le
calcul ; les lignes marquées « lecture » reposent sur une interprétation qu'aucun juge n'a confirmée.
Aucun avocat n'a relu ce modèle. »

Le décompte et le contrôle avant envoi s'ouvrent en panneau, désigné dans l'adresse (§ 4.9).

Références Mobbin : Vestiaire Collective (l'étape en cours porte sa date, sa conséquence et son bouton),
Turo (résumé en une ligne ; les voies en cartes côte à côte, SANS l'étiquette « meilleure option »),
Mercury (le fil séparé des tâches), Alan (choisir un professionnel dans le flux : liste alphabétique,
jamais par pertinence, source et date affichées), Superpower (l'agent posé dans la page, questions
préécrites).

## 1 bis. Le langage

Les quatre étapes, côté gérant : **Prêt → On lui écrit → Le tribunal, si besoin → Réglé.** Le détail
juridique vit à l'intérieur de l'étape 3 et ne se déplie que si on y arrive, en phrases courantes. Un
choix est une question simple : « Il n'a pas payé. Que voulez-vous faire ? »

| Mot du droit | Mot de l'interface |
|---|---|
| Débiteur | Votre client |
| Créance | Ce qu'il vous doit |
| Mise en demeure | Lettre de relance officielle |
| Intérêts de retard | Pénalités de retard |
| Indemnité forfaitaire | Frais de recouvrement |
| Prescription | Date limite pour agir en justice |
| Injonction de payer | Demander au tribunal de le faire payer |
| Requête en injonction de payer | Demande au tribunal |
| Commissaire de justice | Commissaire de justice (l'ancien huissier) |
| Signification | Le commissaire de justice lui remet la décision |
| Demande de signification | Demander au commissaire de justice de lui remettre la décision |
| Opposition | Votre client conteste |
| Titre exécutoire | Le droit de faire saisir |
| Déclaration de créance | Déclarer ce qu'il vous doit |
| Mandataire judiciaire, liquidateur | La personne nommée par le tribunal |
| Relevé de forclusion | Rattrapage après le délai |
| BODACC | Le journal officiel des entreprises |
| Pièces | Documents |

La prescription éteint l'action en justice ; elle n'interdit pas de réclamer, et un versement reçu
après la date reste acquis : d'où « date limite pour agir en justice », jamais « pour réclamer ».

Le mot du droit reste disponible en second (« Le mot du droit : mise en demeure »), jamais en titre ni
sur un bouton. Le **résumé** d'un modèle est du texte d'interface et suit le lexique ; seul le **corps**
du document envoyé garde le vocabulaire juridique exact.

**Où en est le dossier** — ce qui le place dans chaque étape :

| Étape | Le dossier y est quand |
|---|---|
| Prêt | il est lancé et aucun envoi n'est validé (ne dépend ni de `eligible` ni du score) |
| On lui écrit | au moins un envoi au client débiteur est validé, sans professionnel désigné ni événement de procédure |
| Le tribunal, si besoin | un professionnel est désigné (`intervenantId`) ou un événement de procédure est consigné |
| Réglé | toutes les factures du dossier sont soldées |

Classer n'est pas une étape : la frise reste affichée, grisée, avec « Classé le JJ/MM par X » ; le
dossier sort des listes actives et peut être rouvert. `creances.statut` et `eligible` cessent de piloter
l'affichage.

**Barrière exécutable** : un lexique unique (`src/lib/verticales/recouvrement/lexique.ts`) et un test
qui balaie `src/ui`, `src/app`, `src/routes`, `src/screens`, `src/lib/verticales`,
`src/lib/convex/emails` et `src/lib/convex/notifications.ts`, hors `src/marketing` (la section sur la loi
de la landing cite les articles à dessein). Les textes destinés au client débiteur et aux professionnels
déménagent dans un dossier unique de gabarits (`src/lib/verticales/recouvrement/gabarits/`), seul exclu
du test ; un module qui mélange les deux est scindé. Le volume de reprise se mesure sur ce périmètre
avant d'être annoncé. Les routes suivent : `/app/debiteurs` devient `/app/clients`, avec redirection.

## 1 ter. Les états de la page

- **Chargement** : squelette des deux colonnes, jamais de montant à zéro.
- **Dossier introuvable ou d'une autre organisation** : « Ce dossier n'existe pas ou plus », avec un
  lien vers Mes clients.
- **Ancienne créance fusionnée** : redirection vers le dossier qui l'a reprise.
- **Dossier vide** : « Toutes les factures ont été retirées ou payées », avec deux gestes (rattacher à
  nouveau, classer).
- **« Lancer » sans facture impayée** : pas de bouton, et « Rien d'impayé chez ce client ».
- **Document déposé** : « lecture en cours », puis la proposition ; ou « illisible : dites-nous ce que
  c'est », avec la saisie.
- **Envoi** : « soumis, en attente de la preuve de dépôt », « refusé par le prestataire : <motif> »,
  « pli non distribuable : <motif> ».
- **Paramètre manquant ou modèle qui refuse** : le document ne s'affiche pas, et la raison est nommée
  (« taux du 2e semestre 2026 absent du référentiel »).
- **Registre** : date du dernier relevé BODACC réussi, et « relevé en échec depuis le JJ/MM » en cas
  d'échec.

## 2. Le parcours complet

Source : [relevé des exceptions](2026-09-25-releve-exceptions.md) et [relecture](2026-09-25-relecture-juridique.md), § 3.

**La règle.** Les quatre étapes ne disparaissent jamais. Une situation se pose PAR-DESSUS et dit trois
choses : ce qui se passe, la date limite, ce que le gérant peut faire. Les options suivent la section 0 ;
« Ne rien faire pour l'instant » et « Classer » sont au même rang que les autres. Les couleurs de seuil
ne servent qu'au délai. Un point de départ que le texte ne nomme pas se calcule depuis l'événement connu
le plus précoce, et l'écran le dit.

**Calcul des délais** (CPC 641, 642) : un délai en mois finit le même quantième ; à défaut d'un
quantième identique, le dernier jour du mois (641 al. 2), jamais par report sur le mois suivant. Le jour
de départ ne compte pas pour un délai en jours. Un délai qui finit un samedi, un dimanche ou un jour
férié passe au premier jour ouvrable ; les jours fériés sont les onze fêtes légales (C. trav. L3133-1).
**Règle asymétrique**, pour les jours fériés locaux dont l'effet n'est pas jugé (Alsace-Moselle,
abolition de l'esclavage outre-mer) : on ne s'en sert jamais pour prolonger un délai que le gérant doit
tenir ; on s'en sert pour prolonger une attente avant d'agir.

| Situation | Ce que lit le gérant | Délai | Options |
|---|---|---|---|
| Il conteste | Le tribunal va rejuger l'affaire ; pas de saisie en attendant | 1 mois pour contester après la remise (CPC 1416) ; puis 15 jours pour payer les frais au tribunal de commerce (1425) ou pour désigner un avocat au tribunal judiciaire (1418) | Confier la suite à un avocat (obligatoire au-delà de 10 000 € au tribunal de commerce et au tribunal judiciaire, sauf exceptions des art. 853 et 761 ; au tribunal judiciaire, à désigner dans les 15 jours de la notification) ; en dessous de ce seuil, aller soi-même à l'audience ou s'y faire représenter avec un pouvoir spécial (toute personne au tribunal de commerce, art. 853 ; liste de l'art. 762 au tribunal judiciaire) ; au tribunal de commerce, payer ou non les frais d'opposition dans les 15 jours ; chercher un arrangement ; arrêter |
| Entreprise en difficulté | Poursuites et pénalités arrêtées au jugement ; seuls ceux qui déclarent ont une part | 2 mois après la parution de l'annonce d'ouverture au BODACC (R622-24), apprécié à la date du dépôt à La Poste (Cass. com., 28 janv. 1997) ; rattrapage possible 6 mois (L622-26) | Déclarer ce qu'il vous doit, confier à un avocat, s'informer auprès de la personne nommée par le tribunal, ne pas déclarer |
| Paiement partiel, échéancier | Ce qui a été versé, ce qui reste ; rien n'oblige à accepter | La date limite reste celle d'origine ; une date prolongée n'est affichée que comme possible | Accepter, refuser (1342-4), échéancier écrit, confier à un professionnel quand même |
| Introuvable, déménagé, fermé | Ce que le commissaire de justice a constaté ; qui représente l'entreprise dissoute (le liquidateur nommé dans l'annonce BODACC de dissolution, lu comme au § 4.11 ; sinon « inconnu : le greffe du tribunal de commerce peut vous le dire », jamais deviné) ; une société radiée doit toujours sa dette (Cass. com., 20 sept. 2023) | Selon le cas, tous relevés | Remise au siège inscrit au RCS, s'adresser au liquidateur, faire désigner un mandataire ad hoc par un professionnel, attendre, classer |

**Constats qui changent le produit :**
1. Une mise en demeure n'interrompt pas la prescription (Cass. com., 18 mai 2022, n° 20-23.204).
   Déposer une requête en injonction de payer non plus : seule la signification l'interrompt (Cass. 1re
   civ., 9 sept. 2020, n° 19-12.006, non publié ; 10 juil. 1990, publié, sous l'ancien texte). Cette
   interruption tombe si l'ordonnance devient non avenue ou si la demande est caduque : six statuts
   d'interruption dans `prescription.ts`, et tout statut incertain retire l'interruption en le disant.
2. La procédure collective se détecte au BODACC, relevé chaque nuit. **Aujourd'hui, ni le type, ni le
   nom et l'adresse du mandataire ne sont stockés, et `constatRegistre.dateParution` est celle du DERNIER
   constat** (plan, conversion, clôture). Le lot 4 stocke l'annonce d'ouverture à part (§ 4.11) ; la date
   limite de déclaration ne se calcule que sur elle, et sans elle aucune date n'est affichée (« annonce
   attendue vers le… »). Au 25/09/2026, aucun portail de déclaration n'est en service, d'après le rapport
   annuel 2025 du CNAJMJ : ne jamais recopier ni proposer l'adresse **web** d'un portail citée dans une
   annonce (`urlPortailDeclarationCreances` = null). L'adresse **postale** du mandataire ou du
   liquidateur, elle, se lit dans l'annonce d'ouverture et s'affiche avec sa source (numéro et date de
   l'annonce), à confirmer par le gérant. Un paiement reçu après le jugement peut être annulé pendant
   3 ans (L622-7) : le dossier ne passe pas en « Réglé » sans le signaler.
3. Trois régimes d'injonction de payer coexistent selon la date de l'ordonnance. Avant la bascule de
   2022 (décret n° 2021-1322, art. 8 II 2°, « au plus tard le 1er mars 2022 » ; l'arrêté qui fixe la date
   n'a pas été lu), l'application de l'ancien art. 1423 est une lecture. Jusqu'au 31 août 2026 s'applique
   le régime intermédiaire ; depuis le 1er septembre 2026, le régime du décret n° 2026-96 (art. 1411,
   1415, 1418, 1422). Le dossier stocke la date de l'ordonnance et, pour chaque courrier du greffe, la
   date du courrier et la date de réception (§ 4.3). Les 15 jours de consignation des frais d'opposition
   (1425 al. 2) se calculent depuis la date la plus précoce connue, avec « départ non précisé par le
   texte » ; la date de réception sert à l'attente de deux mois (1422 al. 3).
4. Aucune lettre de relance n'est préparée pour une société radiée : c'est un choix du produit
   (relecture § 3.4), personne n'ayant qualité pour la recevoir tant qu'un mandataire ad hoc n'est pas
   désigné.

Le référentiel reçoit environ 180 entrées nouvelles ou corrigées (relecture, § 4), `verifie: true` pour
les confirmées dont l'extrait exact est recopié, `valideParAvocat: false` partout. On ne crée que les
clés de la relecture. Le type `Unite` s'étend aux jours ouvrables (`joursOuvrables`), aux fractions
(`fraction`) et aux effectifs (`salaries`).

## 3. Les envois

Sources : [relevé du dernier mètre](2026-09-25-releve-envois.md), [relecture](2026-09-25-relecture-juridique.md), § 3.6.

**Le principe, fixé par le fondateur : Letikette ne remplace aucun métier réglementé.** Rien ne part
vers un tribunal ou un greffe depuis l'app. Avocats et commissaires de justice font leur métier ; l'app
rend la procédure simple et en suit chaque étape. Elle ne rédige pas leurs actes.

**Les modèles**, rédigés et contre-vérifiés, dans [`2026-09-25-modeles/`](2026-09-25-modeles/README.md) :

| Modèle | Destinataire | Canal | Barrière |
|---|---|---|---|
| Lettre de relance officielle | Le client débiteur | Recommandé papier hybride (Maileva) ; recommandé électronique qualifié (AR24) en option | `exiger()` + validation du gérant (était candidate à `exigerPourActe()`, levée le 25/09) |
| Accord d'échéancier | Le client débiteur, qui signe | Signature électronique au seul nom du créancier : le débiteur tape lui-même la somme en lettres et en chiffres (C. civ. 1376 ; admis par Cass. 1re civ., 13 mars 2008, sous l'ancien art. 1326 : lecture de continuité ; 1174 al. 2 en appui) ; niveau de signature à choisir (§ 7). Sinon, deux originaux papier | `exiger()` + validation du gérant (levée le 25/09) |
| Déclaration de créance, avec pouvoir | La personne nommée par le tribunal, à l'adresse lue dans l'annonce d'ouverture | Recommandé papier hybride uniquement ; « date limite de dépôt à La Poste » (c'est l'envoi qui compte) ; si Maileva dépose le lendemain, le dernier clic utile est la veille | `exiger()` + validation du gérant (levée le 25/09 ; voir § 7, question 1) |
| Lettre d'information au mandataire | La personne nommée par le tribunal | Recommandé papier ou courrier | `exiger()` + validation du gérant |
| Demande de signification | L'étude choisie par le gérant dans son carnet (`intervenants`), saisie à la main ou retenue depuis le registre des entreprises, qui n'est pas le tableau de la profession (l'écran le dit, avec la date du relevé) | Paquet préparé par l'app (lettre en PDF, ordonnance, pièces) et brouillon « Ouvrir dans ma messagerie » ; ou lettre que le gérant envoie ou remet lui-même avec l'original de l'ordonnance si l'étude le demande | `exiger()` + validation du gérant |
| Transmission à l'avocat | L'avocat du gérant | Paquet préparé par l'app (lettre, décompte figé, pièces, bordereau, en une archive) et brouillon « Ouvrir dans ma messagerie » : le gérant joint le paquet et envoie depuis sa propre messagerie ; l'état « parti » est déclaré par lui, avec sa date | `exiger()` + validation du gérant |
| Requête en injonction de payer, deux variantes | Aucun envoi | — | Sert de **liste de contrôle** : ce que le dossier doit contenir pour qu'un avocat n'ait rien à redemander. Le canal « recommandé au greffe » des deux modèles est caduc. |

Dans les modèles, l'interdit « Toute sortie de ce gabarit par `exiger()` au lieu d'`exigerPourActe()` »
et les notes « BARRIÈRE BLOQUANTE » sont caducs ; le résumé de la déclaration dit « date limite de dépôt
à La Poste » et non plus la date d'arrivée. Ces corrections sont faites avant le lot 5.

**Pourquoi le paquet et la messagerie du gérant pour les professionnels.** Les modèles et le relevé
imposent que ces courriers partent de la messagerie du gérant, jamais d'une adresse Letikette : les
réponses doivent arriver chez lui (secret professionnel). Tant que la messagerie du gérant n'est pas
connectée (hors périmètre), l'app prépare tout en un geste et le gérant envoie. Avec la connexion, ce
sera un seul clic.

**L'étape « Le tribunal, si besoin » : un avocat prend le relais.** Le gérant choisit un avocat pour
déposer la requête ; l'app lui prépare le paquet de la transmission. Le commissaire de justice
intervient après l'ordonnance, par la demande de signification. Lui confier le dépôt de la requête est
possible (CPC 1407), mais aucun modèle n'a été relevé pour cela : hors périmètre. Si le gérant désigne
un commissaire de justice, l'écran dit dès ce choix qu'en cas d'opposition la suite revient à un avocat
ou au gérant lui-même. Les étapes qui se jouent chez le professionnel restent affichées (« chez votre
avocat ») et se mettent à jour par ce que le gérant dépose.

**Conditions tenues sur chaque document** : à son seul nom et sous sa signature, y compris l'enveloppe
et l'adresse d'expéditeur imprimée (option Maileva `print_sender_address`) ; ni le nom, ni le logo, ni
l'adresse, ni l'e-mail de Letikette ; aucun pouvoir au nom de Letikette ; les réponses et les paiements
arrivent chez le gérant ; aucune relance ne part automatiquement ; rien ne ressemble à un acte de
commissaire de justice (C. pén. 433-13) ; quand un avocat est désigné sur le dossier, tout document part
chez lui comme projet et c'est lui qui décide. Vocabulaire : « vous envoyez, avec Letikette », jamais
« Letikette envoie en votre nom ».

**Qui valide.** Seul un `ORG_ADMIN` valide un envoi ; un `ORG_MEMBER` le prépare. Le document porte le
nom et la qualité du signataire, déclarés une fois dans le profil créancier (champ nouveau). Si le
signataire n'est pas le représentant légal, le pouvoir est joint (déclaration de créance), ou l'envoi
est refusé en disant pourquoi.

**Chaque envoi passe par les mêmes états** : projet → à valider (aperçu exact, destinataire, canal,
coût) → validé (qui, quand, comment ; le document est figé) → parti (preuve de dépôt, ou date déclarée
par le gérant pour un envoi par sa messagerie) → suivi (présenté, reçu, non réclamé, refusé) → délai en
cours. Chaque preuve est archivée chez nous dès son arrivée, avec l'empreinte du PDF exact : le
prestataire ne la garde pas aussi longtemps que la créance.

**Ligne rouge n° 1, réécrite** : « Rien ne part sans que le gérant ait validé ce document. Il est à
son seul nom et sous sa signature ; Letikette l'expédie sans y figurer, sans être son mandataire, sans
recevoir ni fonds ni réponse du débiteur. Quand le gérant a un avocat, le projet part chez cet avocat,
qui décide. Rien ne part vers un tribunal ou un greffe depuis l'app : ce qui va devant un tribunal passe
par l'avocat que le gérant choisit. »

**CLAUDE.md**, mis à jour au lot qui le rend vrai :
- la ligne rouge n° 1 ci-dessus ;
- la ligne rouge n° 3 devient : « Le produit montre ce que dit la loi, ce qu'il y a dans le dossier et
  ce que le gérant a répondu. Il ne dit jamais qu'une condition est remplie, ni qu'il faudrait engager
  une procédure. » ;
- dans « Ce qu'on vend », « qualification des créances » devient « tableau des conditions, que le gérant
  qualifie » ;
- la règle `valideParAvocat` / `exigerPourActe()` décrit la décision du 25/09 : les trois documents
  passent sous `exiger()` et la validation du gérant ; la barrière reste pour tout acte adressé à un
  tribunal ou à un greffe ;
- la règle d'écran n° 1 gagne l'exception « pour une qualification juridique, le gérant qualifie, le
  logiciel documente ».

## 4. Sous le capot

1. **Le dossier, et ce qui y entre.** « Lancer » rattache les factures `IMPAYEE` et
   `PARTIELLEMENT_PAYEE` du client débiteur, échues ou non ; les `LITIGIEUSE` s'affichent à part, avec
   un geste pour les ajouter. Une facture à échoir s'affiche « pas encore due » et n'entre dans aucun
   montant réclamé avant son échéance. Ensuite, **rien ne s'ajoute d'office** : une nouvelle facture
   impayée s'affiche « pas encore dans le dossier », avec le geste « l'ajouter ». Après une lettre de
   relance officielle, une facture ajoutée est marquée « non couverte par la lettre du JJ/MM » et ne
   modifie aucun document figé. Après une transmission à un professionnel, elle propose un second
   dossier. Retirer une facture écrit `retireeLe` et `retireePar` sur la facture ; le contrôle de
   complétude chiffre ce qu'on abandonne. **Reprise des données** (lot 3) : pour un client qui a
   plusieurs créances non closes, la plus ancienne devient le dossier ; les factures des autres y sont
   rattachées si ces créances n'ont aucun événement de procédure, sinon elles restent un second dossier.
2. **Table `envois`** : `organizationId`, `creanceId`, `decompteId` (le décompte figé que le document
   chiffre, jamais modifié), `remiseId` le cas échéant, destinataire, modèle et version, document figé
   une fois validé (`_storage` et empreinte), canal, coût en centimes (`v.int64()`), qui a validé et
   quand, identifiant chez le prestataire, preuves archivées (`_storage` et empreinte) ; index `by_org`
   et `by_creance`. Rien ne se réécrit, sauf la purge RGPD, qui efface aussi les fichiers stockés.
3. **Deux chemins pour ce qui arrive.** (a) Une preuve renvoyée par le prestataire (dépôt, présentation,
   distribution) est un fait certain : elle entre dans le suivi de l'envoi dès réception, sans modèle,
   et l'événement qu'elle porte est proposé au gérant avec la date du fait. (b) Un document déposé par le
   gérant est lu par le modèle, qui pose une proposition d'une nature nouvelle (source : le document lu,
   avec l'extrait), hors du plafond quotidien, et qui compte comme `unknown` tant qu'elle n'est pas
   confirmée. D4 (« aucun appel modèle ») reste la règle des propositions posées par la surveillance ; la
   date du fait et la clé de transition vont dans `propositions` ou dans une table dédiée. Dans les deux
   cas, le délai s'affiche dès l'arrivée, compté depuis la date du fait, marqué « à confirmer ». La
   saisie manuelle existante (`consignerEvenement`) reste, comme recours. **Un événement issu d'un
   courrier du greffe porte deux dates** : `survenuLe`, la date du courrier ou de l'ordonnance, lue sur
   le document ; `recuLe`, champ nouveau et facultatif, demandée au gérant en une ligne (« Quand
   l'avez-vous reçu ? »). Sans réponse, le délai part de `survenuLe` et l'écran le dit ; quand un avocat
   porte le dossier : « Demandez à votre avocat la date de réception. »
4. **L'agent** reprend le compagnon (phrases sourcées, refus tracés) avec la portée `CREANCE` existante,
   puisque le dossier est la créance, limité aux faits et aux calculs (section 0). Ses capacités — lire
   un document déposé, préparer un envoi dont le gérant a choisi le modèle — aboutissent toutes à une
   proposition du type (b), jamais à une écriture directe.
5. **Qualification.** Le verdict disparaît partout où il s'écrit : `qualification.ts` rend le tableau à
   trois colonnes ; `scoring.ts` et `solidite.ts` ne sortent plus de score ni de niveau à l'écran
   (`solidite.ts` montre les pièces présentes et absentes, sans poids) ; aucun écran ni aucune alerte ne
   lit plus `creances.eligible` ; le statut `QUALIFIEE` ne s'affiche plus comme tel ; `surveillance.ts`
   cesse d'émettre `CREANCE_MURE`, ce qui retire la notification « Une créance est mûre », sa ligne du
   briefing et son libellé à l'accueil ; `procedures.ts` n'écrit plus « remplit » ni « n'est pas
   rempli » et cesse d'évaluer l'injonction de payer sur `entreCommercants` (l'art. 1405 ne le pose pas) ;
   `dossier.ts` reprend le tableau à trois colonnes ; `pays/france/commercialite.ts` rend une proposition
   à confirmer ; `pays/france/prescription.ts` expose tous les régimes et le choix du gérant. « Trois
   mois » n'est plus écrit en dur ; `procedures.ts`, `apres-procedure.ts` et la démo `-salle/file.tsx`
   écrivent « non avenue » et non « caduque ». Les conditions générales (`docs/juridique/02-conditions-
   generales.md`, art. 3 point 5 et art. 4.3) cessent de vendre la « qualification » et le « remplit ou
   ne remplit pas » le même jour.
6. **Décompte** (`decompte.ts`). Le lot 0 a introduit l'imputation (un segment par règlement, pénalités
   d'abord pour un paiement, principal pour un avoir ou un crédit non détaillé) et l'indemnité réservée
   aux factures en retard. Restent : l'ordre d'imputation choisi par le gérant (section 0) ; avec
   plusieurs factures, d'abord la facture visée (celle indiquée par le client débiteur, sinon l'ordre de
   l'art. 1342-10 : dettes échues, « plus d'intérêt d'acquitter » affiché comme indéterminé, hypothèse
   « la plus ancienne » confirmée par le gérant), puis dans cette facture l'ordre choisi ; aucune
   indemnité pour une échéance au jour ou après un jugement d'ouverture (L441-10 II, dernière phrase) ;
   en procédure collective, un décompte figé à la date du jugement, intérêts arrêtés la veille par
   prudence, et l'indemnité d'une facture échue avant le jugement sur une ligne distincte marquée
   « lecture » ; le premier jour de pénalités est le lendemain de la date de règlement (L441-10 II),
   vérifié pour qu'aucun jour ne soit compté en trop ; `tauxLisible()` ne tronque plus le taux imprimé,
   avec une seule implémentation dans la verticale, réexportée par `ui/format.ts`.
7. **Référentiel** : les entrées de la relecture (§ 4), la liste des tribunaux des activités
   économiques, les jours fériés, `Unite` étendu.
8. **Prestataires** : Maileva (recommandé papier hybride : brouillon, puis `submit` au clic), AR24
   (recommandé électronique qualifié), un prestataire de signature électronique pour l'échéancier (§ 7).
9. **Routes** : `/app/dossier/$id` ; `creance/$id` et `procedures?p=` y redirigent ; `/app/decompte/$id`
   redirige vers `/app/dossier/<créance du décompte>?panneau=decompte&d=<id>` ; `/app/arret/$id` vers
   `/app/dossier/$id?panneau=controle` ; `/app/debiteurs/$id` vers `/app/clients/$id`. `/app/procedures`
   devient la liste « Dossiers », tous les dossiers ouverts, toutes étapes confondues. L'écran de
   composition facture par facture disparaît.
10. **Lexique** : un fichier source et son test (section 1 bis).
11. **Procédure collective** : un enregistrement par annonce d'ouverture, jamais écrasé par les
    annonces suivantes : type (sauvegarde, redressement, liquidation), date du jugement, date de parution
    de CETTE annonce, tribunal, nom et adresse du mandataire ou du liquidateur, identifiant et URL de
    l'annonce. L'extraction tolère un texte libre dont la forme varie ; une extraction incertaine est
    confirmée par le gérant.
12. **La machine du dossier.** Une clé de procédure dédiée dans `evenementsProcedure` porte les étapes
    1, 2 et 4, et passe la main aux machines existantes à l'étape 3. Les quatre étapes se déduisent de ce
    seul journal ; `creances.statut` n'en décide plus et reste lu pour les données existantes.
13. **Transmission à un professionnel.** Elle reste une `remisesAuConseil` (décompte figé, états de la
    remise), reprise et non doublée. L'envoi qui l'expédie y renvoie par `remiseId` et ne porte que
    l'état de l'expédition. Le commentaire « Le produit n'écrit pas au conseil » devient « le produit
    prépare ce que le gérant valide ; il ne relance pas le conseil, ne lui fixe aucun délai et ne note
    pas son travail ».

## 5. Découpage en lots

Chaque lot est livrable et mis en production seul, vérifié sur le déploiement servi.

**Jusqu'au lot 6**, un document déposé est rangé dans « Documents » sans lecture, et le gérant consigne
l'événement lui-même avec la saisie existante (`consignerEvenement`, date du fait comprise). Une preuve
structurée renvoyée par un prestataire pose directement une proposition, sans lecture (§ 4.3 a).
**Jusqu'au lot 5**, l'action de l'étape « On lui écrit » est le brouillon de relance existant (« Ouvrir
dans ma messagerie »). **Au lot 4**, les options qui supposent un envoi ouvrent le modèle en aperçu PDF à
télécharger ; le bouton d'envoi arrive au lot 5.

- **Lot 0 — corrections en production — LIVRÉ** (`1b275b6`, 25/09/2026, déploiement vérifié sur le
  contenu servi) : imputation des règlements (pénalités d'abord pour un paiement ; principal pour un
  avoir ou un crédit non détaillé, classés par journal à l'import) ; indemnité réservée aux factures en
  retard ; `ANGLE_MORT_PRESCRIPTION` ; plus de « est prescrite » ni de consigne d'abandon dans la
  surveillance ; niveau 3 des relances branché sur `modesMiseEnDemeure` ; lettre « compte arrêté » sur
  le principal figé ; révélation partie du solde comptable ; règlements transmis au compagnon ; textes
  publics (`etapes.tsx`, `tarifs.ts`, `limites.tsx`). Restent au lot 1 : l'exclusion de l'indemnité après
  un jugement d'ouverture et le choix de l'ordre d'imputation.
- **Lot 1 — le référentiel et le calcul** : entrées nouvelles, calcul des délais, § 4.6.
- **Lot 2 — montrer, pas qualifier** : section 0 et § 4.5, conditions générales comprises.
- **Lot 3 — la page dossier et le lexique** : route, deux colonnes, états (§ 1 ter), frise et machine du
  dossier (§ 4.12), rattachement et retrait (§ 4.1), reprise des données, redirections, reprise du
  vocabulaire et son test.
- **Lot 4 — les situations** : les quatre situations du § 2 ; la procédure collective avec l'extraction
  et le stockage du § 4.11 ; les dates d'ordonnance et de réception (§ 4.3).
- **Lot 5a — les envois sans prestataire** : table `envois`, états, aperçu exact, validation par
  `ORG_ADMIN`, document figé avec empreinte, les six modèles, sortie en PDF à imprimer et paquet pour la
  messagerie du gérant.
- **Lot 5b — Maileva** : recommandé hybride, preuves archivées.
- **Lot 5c — AR24.**
- **Lot 5d — signature électronique de l'échéancier.**
- **Lot 6 — l'agent dans le dossier** : lecture des documents déposés, propositions du type (b),
  questions préécrites, bulle bornée au dossier.

Les lots 5b à 5d démarrent chacun quand leur question du § 7 est tranchée.

## 6. Vérification

Mode rapide, conformément à la consigne du projet :
- un dossier de démonstration dans le showroom à chacune des quatre étapes, dans chaque situation
  d'exception et dans chacun des états du § 1 ter, regardé aux quatre largeurs de référence ;
- des tests seulement là où une erreur coûte de l'argent, un délai ou une ligne rouge : l'imputation,
  l'indemnité, le calcul des délais, le rattachement et le retrait, les états d'un envoi, la validation
  par `ORG_ADMIN`, le lexique, les gabarits (aucune mention de Letikette, aucune forme qui imite un acte
  de commissaire de justice), le refus du compagnon sur « est remplie » ;
- vérification du déploiement Vercel et de l'empreinte du contenu servi, pas seulement du push.

## 7. Questions ouvertes

1. **La déclaration de créance « équivaut à une demande en justice »** (Ass. plén., 4 févr. 2011,
   n° 09-14.619). Le fondateur a choisi qu'elle puisse partir avec l'app, au nom du gérant, sans avocat —
   ce que la loi permet au créancier. À confirmer en connaissance de cette qualification : elle touche la
   règle « rien vers la justice ». Si elle est confirmée, la règle se lit « rien vers un tribunal ni un
   greffe ; seule exception, la déclaration de créance au mandataire ». Bloque le lot 5a pour ce seul
   modèle.
2. **Contrat Maileva par client ou unique** : réponse à obtenir de Maileva. Bloque le lot 5b.
3. **Qui paie l'affranchissement** : avec un contrat unique, Letikette le refacture-t-il (Paddle) ou
   l'inclut-il dans l'abonnement ? Décision du fondateur. Bloque le lot 5b.
4. **Prestataire et niveau de signature électronique** (qualifiée ou avancée). Bloque le lot 5d.
5. **Le principe anti-dérive** (CLAUDE.md) demande, pour chaque fonctionnalité, deux chiffres tirés du
   journal de friction : la tâche manuelle supprimée avec son temps mesuré, et ce que ça change pour le
   dirigeant. Ce design ne les porte pas. Le fondateur les fournit, ou lève la règle pour ce chantier,
   et c'est écrit ici et dans CLAUDE.md.

## Hors périmètre de ce chantier

- Le compte séquestre (décidé ; chantier dédié ; le jour de son annonce, la section « Limites » de la
  landing et la ligne rouge n° 2 changent le même jour ; il fera de Letikette un recouvreur déclaré, ce
  qui change le modèle « au seul nom du client »).
- La connexion de la messagerie du gérant (Gmail, Outlook) : lecture des réponses dans SA boîte, et
  envoi en un clic aux professionnels.
- Le dépôt de la requête confié à un commissaire de justice (aucun modèle relevé).
- L'accès invité de l'avocat au dossier.
- La page « Mes clients » au-delà du bouton « Lancer » et du renommage.
- L'accueil dégraissé.
- Les connecteurs (Pennylane et suivants).
- La facturation : devis, avoirs, prestations livrées.
