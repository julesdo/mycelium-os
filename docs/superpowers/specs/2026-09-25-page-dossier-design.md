# La page dossier — design

**Date** : 25 septembre 2026 · **Statut** : toutes les décisions prises ; en relecture avant validation
du fondateur
**Chantier** : 1 sur 7 de la refonte d'expérience (voir « Hors périmètre »)

**Relevés sur lesquels ce design s'appuie** (tous contre-vérifiés, aucun relu par un avocat) :
- [Le dernier mètre : envoyer au nom du client](2026-09-25-releve-envois.md) — 163 citations
- [Les exceptions du parcours](2026-09-25-releve-exceptions.md) — 185 citations, 7 corrigées
- [La relecture juridique](2026-09-25-relecture-juridique.md) — 57 questions, 8 modèles
- [Les modèles de documents](2026-09-25-modeles/README.md)

## Le problème

Verdict du fondateur sur l'app : « un Excel++ avec de l'IA », alors que Letikette doit être un service
grand public, facile à prendre en main. La cause est mesurable : un dossier est réparti sur quatre
routes (`/app/creance/$id`, `/app/procedures?p=`, `/app/decompte/$id`, `/app/arret/$id`), le gérant
compose lui-même sa créance facture par facture, l'annuaire des avocats et des commissaires de justice
vit sur la page créance plutôt qu'à l'étape où on en a besoin, et l'état `OPPOSITION` est terminal pour
le produit — l'app s'arrête là où le gérant a le plus besoin d'elle.

La matière existe presque entièrement : la machine à états rejouée depuis le journal
(`apres-procedure.ts`, `parcoursDeLaVoie`, branches comprises), les propositions sourcées
(`propositions`), le compagnon et ses refus, les annuaires, le contrôle de complétude (`controle.ts`),
les décomptes figés. Ce chantier ASSEMBLE ; il construit peu.

## Les décisions prises

| Question | Décision |
|---|---|
| Qu'est-ce qu'un dossier ? | **Un dossier par client**, toutes ses factures impayées dedans. On peut en retirer une ; le produit chiffre ce qu'on abandonne. |
| Jusqu'où l'agent agit-il ? | **Il prépare, le gérant valide d'un geste.** Rien ne s'écrit sans un clic. |
| Qui envoie ? | **L'application, au nom du gérant, après sa validation**, vers son client débiteur, son avocat, son commissaire de justice, et le mandataire judiciaire pour la déclaration de créance. **Jamais vers la justice.** |
| Qui fait les actes de justice ? | **Les professionnels.** Letikette ne remplace aucun métier réglementé et ne conseille pas (section 3). |
| Où est l'avocat ? | **Hors de l'app, dans sa messagerie.** Ses réponses arrivent chez le client (secret professionnel), qui les dépose dans le dossier. L'accès invité est un chantier ultérieur. |
| La déclaration de créance ? | **Au choix, dossier par dossier** : par défaut l'app l'envoie au nom du client ; si un professionnel suit déjà le dossier, elle part chez lui. |
| La barrière `exigerPourActe()` ? | **Levée pour la lettre de relance officielle, l'accord d'échéancier et la déclaration de créance : la validation du client suffit.** `valideParAvocat` reste `false` ; chaque document le dit avant validation. |
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
AVANT le calcul (régime, taux des CGV, imputation, point de départ) sont juridiques.

> **Le logiciel lit, calcule et montre. Le gérant qualifie, choisit et signe.**

Ce que ça impose à la page et au reste de l'app :
- **Plus de verdict à l'écran** : ni « éligible », ni « remplit les conditions », ni « créance
  qualifiée », ni score de solidité. À la place, trois colonnes : **ce que dit la loi · ce qu'il y a dans
  votre dossier · ce que vous avez répondu**. Une réponse peut être pré-remplie ; elle est marquée
  « à confirmer ».
- **Le régime de prescription est choisi par le gérant**, une fois, par une question simple sur ce qu'il
  vend. Sans réponse, l'app surveille la date la plus proche et dit que c'est une hypothèse.
- **L'agent répond sur les faits et les calculs du dossier.** À « puis-je », « ai-je droit », « est-ce
  prescrit », il affiche les textes du référentiel et dit qu'un avocat peut répondre. Un test vérifie
  qu'aucune réponse ne dit d'une condition légale qu'elle « est remplie » ou « n'est pas remplie ».
- **Les modèles** : le gérant choisit le modèle dans une liste visible ; chaque variable affiche son
  origine (« facture F-102, importée le… ») ; chaque champ est modifiable ; l'IA n'écrit aucune phrase.
  L'écran dit « pré-rempli avec vos données », jamais « rédigé par l'IA ».
- **Les options** sont toujours au même rang, ordre chronologique fixe, jamais de « prochaine étape
  recommandée ».

## 1. L'organisation de la page

Route : `/app/dossier/$id`. Deux colonnes au-delà de 1024 px, une seule en dessous.

**En-tête** — répond en trois secondes : le nom du client, « vous doit 13 977,60 € », la date limite
pour réclamer avec le délai choisi par le gérant (« délai de 5 ans, que vous avez indiqué »), et la
frise des quatre étapes.

**Colonne gauche — où j'en suis.**
- L'étape en cours, seule mise en avant : ce qui se passe, ce qui arrive si rien ne bouge (avec une
  date), et l'action — un envoi prêt à partir, une proposition à confirmer, ou une attente. Un seul
  bouton principal.
- Le fil des étapes : passées repliées avec leur date et leur preuve, à venir en gris.

**Colonne droite — ce que contient le dossier.**
- Ce qu'il vous doit : factures, pénalités de retard, frais de recouvrement, « voir le calcul ».
- Documents : ce qui est là, ce qui manque.
- La zone de dépôt unique : « Vous avez reçu un courrier ? Déposez-le ici ». C'est aussi là que le
  gérant dépose les réponses de son client et de ses professionnels.

**L'agent** est à trois endroits : la mention « pré-rempli avec vos données » avec ses sources dans
l'étape en cours, deux questions déjà écrites pour l'étape (sur les faits et les calculs), et la bulle
flottante bornée au dossier.

**Avant chaque validation**, le document s'affiche tel qu'il partira, avec son résumé en langage courant
(fourni par chaque modèle) et une ligne honnête : « Les chiffres suivent les textes cités dans le
calcul. Aucun avocat n'a relu ce modèle. »

Sous 1024 px : étape en cours, puis fil, puis contenu du dossier. Le décompte et le contrôle avant envoi
s'ouvrent en panneau, sans changer d'adresse.

Références Mobbin : Vestiaire Collective (l'étape en cours porte sa date, sa conséquence et son bouton),
Turo (résumé en une ligne ; les voies en cartes côte à côte, SANS l'étiquette « meilleure option »),
Mercury (le fil séparé des tâches), Alan (choisir un professionnel dans le flux), Superpower (l'agent
posé dans la page, questions préécrites).

## 1 bis. Le langage

Les quatre étapes, côté gérant : **Prêt → On lui écrit → Le tribunal, si besoin → Réglé.** Le détail
juridique vit à l'intérieur de l'étape 3 et ne se déplie que si on y arrive, en phrases courantes
(« le juge a dit oui », « l'huissier lui remet la décision »). Un choix est une question simple :
« Il n'a pas payé. Que voulez-vous faire ? »

| Mot du droit | Mot de l'interface |
|---|---|
| Débiteur | Votre client |
| Créance | Ce qu'il vous doit |
| Mise en demeure | Lettre de relance officielle |
| Intérêts de retard | Pénalités de retard |
| Indemnité forfaitaire | Frais de recouvrement |
| Prescription | Date limite pour réclamer |
| Injonction de payer | Demander au tribunal de le faire payer |
| Commissaire de justice | Huissier |
| Signification | L'huissier lui remet la décision |
| Opposition | Votre client conteste |
| Titre exécutoire | Le droit de faire saisir |
| Pièces | Documents |

Le mot du droit reste disponible en second (« Le mot du droit : mise en demeure »), jamais en titre ni
sur un bouton. Les documents ENVOYÉS gardent le vocabulaire juridique exact : ils s'adressent au client
débiteur, aux professionnels et au mandataire. Dans les courriers et les documents légaux, la profession
s'écrit « commissaire de justice » (profession unique depuis le 1er juillet 2022).

**Barrière exécutable** : un lexique unique, et un test qui balaie toute l'interface — comme celui du
mot « garantie » — et refuse un mot du droit affiché hors du composant « mot du droit » et des gabarits
de documents. Le test porte sur toute l'app dès ce chantier (environ 200 lignes de texte affiché à
reprendre) ; la reprise fait partie du chantier. Les routes suivent : `/app/debiteurs` devient
`/app/clients`, avec redirection. La landing est exclue du test : sa section sur la loi cite les
articles à dessein.

## 2. Le parcours complet

Source : [relevé des exceptions](2026-09-25-releve-exceptions.md) et [relecture](2026-09-25-relecture-juridique.md), § 3.

**La règle.** Les quatre étapes ne disparaissent jamais. Une situation se pose PAR-DESSUS et dit trois
choses : ce qui se passe, la date limite, ce que le gérant peut faire. Les options ont le même
composant et la même taille, un ordre fixe qui n'est pas un classement, une conséquence d'une ligne
chacune ; « Ne rien faire pour l'instant » et « Classer » sont au même rang. Les couleurs de seuil ne
servent qu'au délai. Un point de départ que le texte ne nomme pas se calcule depuis l'événement connu
le plus précoce, et l'écran le dit.

**Calcul des délais** (CPC 641, 642) : un délai en mois finit le même quantième ; le jour de départ ne
compte pas pour un délai en jours ; un délai qui finit un samedi, un dimanche ou un jour férié passe au
premier jour ouvrable. Les jours fériés sont les onze fêtes légales (C. trav. L3133-1). **Règle
asymétrique** : on ne prolonge jamais un délai que le client doit tenir ; on prolonge une attente avant
d'agir.

| Situation | Ce que lit le gérant | Délai | Options |
|---|---|---|---|
| Il conteste | Le tribunal va rejuger l'affaire ; pas de saisie en attendant | 1 mois pour contester après la remise (CPC 1416) ; puis selon le tribunal, 15 jours pour les frais (1425) ou pour l'avocat (1418) | Le professionnel qui porte le dossier poursuit ; chercher un arrangement ; arrêter |
| Entreprise en difficulté | Poursuites et pénalités arrêtées au jugement ; seuls ceux qui déclarent ont une part | 2 mois après la parution au BODACC (R622-24), apprécié à la date du dépôt à La Poste (Cass. com., 28 janv. 1997) ; relevé de forclusion 6 mois (L622-26) | Déclarer, confier à un professionnel, s'informer auprès du mandataire, ne pas déclarer |
| Paiement partiel, échéancier | Ce qui a été versé, ce qui reste ; rien n'oblige à accepter | La date limite pour réclamer reste celle d'origine ; une date prolongée n'est affichée que comme possible | Accepter, refuser (1342-4), échéancier écrit, confier à un professionnel quand même |
| Introuvable, déménagé, fermé | Ce que le commissaire a constaté ; qui représente l'entreprise dissoute ; une société radiée doit toujours sa dette (Cass. com., 20 sept. 2023) | Selon le cas, tous relevés | Remise au siège inscrit au RCS, s'adresser au liquidateur, faire désigner un mandataire ad hoc (par un professionnel), attendre, classer |

**Constats qui changent le produit :**
1. Une mise en demeure n'interrompt pas la prescription (Cass. com., 18 mai 2022, n° 20-23.204).
   Déposer une requête en injonction de payer non plus : seule la signification l'interrompt. Aucun
   texte ne laisse croire le contraire.
2. La procédure collective se détecte seule (BODACC relevé chaque nuit) : type, date du jugement, date
   de parution, mandataire. Aucune date limite n'est calculée avant la parution (« annonce attendue vers
   le… »). Il n'existe aucun portail de déclaration en service : ne jamais recopier une adresse lue dans
   une annonce. Un paiement reçu après le jugement peut être annulé pendant 3 ans (L622-7) : le dossier
   ne passe pas en « Réglé » sans le signaler.
3. Trois régimes d'injonction de payer coexistent selon la date de l'ordonnance (avant le 1er mars 2022,
   jusqu'au 31 août 2026, depuis le 1er septembre 2026 — décret n° 2026-96). Le dossier stocke la date
   de l'ordonnance et celle de réception de chaque courrier du greffe.
4. Aucune lettre de relance n'est préparée pour une société radiée : personne n'a qualité pour la
   recevoir.

Le référentiel reçoit environ 180 entrées nouvelles ou corrigées (relecture, § 4), `verifie: true` pour les confirmées dont
l'extrait exact est recopié, `valideParAvocat: false` partout. Le type `Unite` s'étend aux jours
ouvrables et aux fractions.

## 3. Les envois

Sources : [relevé du dernier mètre](2026-09-25-releve-envois.md), [relecture](2026-09-25-relecture-juridique.md), § 3.6.

**Le principe, fixé par le fondateur : Letikette ne remplace aucun métier réglementé.** Rien ne part
à la justice depuis l'app. Avocats et commissaires de justice font leur métier ; l'app rend la
procédure simple et en suit chaque étape. Elle ne rédige pas leurs actes.

**Les huit modèles**, rédigés et contre-vérifiés, dans [`2026-09-25-modeles/`](2026-09-25-modeles/README.md) :

| Modèle | Destinataire | Canal | Barrière |
|---|---|---|---|
| Lettre de relance officielle | Le client débiteur | Recommandé papier hybride (Maileva) ; recommandé électronique qualifié (AR24) en option | `exiger()` + validation du client (décision C) |
| Accord d'échéancier | Le client débiteur, qui signe | Signature électronique au seul nom du créancier, le débiteur tape lui-même la somme (C. civ. 1376, 1174) ; sinon deux originaux papier | `exiger()` + validation du client (décision C) |
| Déclaration de créance, avec pouvoir | Le mandataire ou le liquidateur nommé au BODACC | Recommandé papier hybride uniquement ; date limite de dépôt à La Poste | `exiger()` + validation du client (décision C) |
| Lettre d'information au mandataire | Le mandataire | Recommandé papier ou courrier | `exiger()` |
| Demande de signification | L'étude choisie dans l'annuaire officiel | Courrier ou e-mail avec pièces jointes | `exiger()` |
| Transmission à l'avocat | L'avocat du client | E-mail tracé ; ses réponses arrivent chez le client | `exiger()` |
| Requête en injonction de payer, deux variantes | Aucun envoi | — | Sert de **liste de contrôle** : ce que le dossier doit contenir pour qu'un professionnel n'ait rien à redemander |

**L'étape « Le tribunal, si besoin » : un professionnel prend le relais.** Le client choisit un avocat ou
un commissaire de justice (l'un comme l'autre peut déposer une requête en injonction de payer :
CPC 1407, « par tout mandataire »). L'app lui transmet le dossier en un geste : faits, décompte figé,
pièces, bordereau. Il écrit l'acte, le signe et le dépose. Les étapes qui se jouent chez lui restent
affichées (« chez votre avocat ») et se mettent à jour par ce que le client dépose.

**Conditions tenues sur chaque document envoyé :** à son seul nom et sous sa signature, y compris
l'enveloppe et l'adresse d'expéditeur imprimée (option Maileva `print_sender_address`) ; ni le nom, ni
le logo, ni l'adresse, ni l'e-mail de Letikette ; aucun pouvoir au nom de Letikette ; les réponses et
les paiements arrivent chez le client ; aucune relance ne part automatiquement ; rien ne ressemble à un
acte de commissaire de justice (C. pén. 433-13) ; quand un avocat est désigné sur le dossier, tout
document part chez lui comme projet et c'est lui qui décide. Vocabulaire : « vous envoyez, avec
Letikette », jamais « Letikette envoie en votre nom ».

**Chaque envoi passe par les mêmes états** : projet → à valider (aperçu exact, destinataire, canal,
coût) → validé (qui, quand, comment ; le document est figé) → parti (preuve de dépôt) → suivi (présenté,
reçu, non réclamé, refusé) → délai en cours. Chaque preuve est archivée chez nous dès son arrivée, avec
l'empreinte du PDF exact : le prestataire ne la garde pas aussi longtemps que la créance.

**Ligne rouge n° 1, réécrite :** « Rien ne part sans que le client ait validé ce document. Il est à
son seul nom et sous sa signature ; Letikette l'expédie sans y figurer, sans être son mandataire,
sans recevoir ni fonds ni réponse du débiteur. Rien ne part à la justice depuis l'app : ce qui va
devant un tribunal passe par l'avocat ou le commissaire de justice que le client choisit. »

**CLAUDE.md** : la règle `valideParAvocat` / `exigerPourActe()` décrit ce que le fondateur a décidé le
25/09 — les trois documents ci-dessus passent sous `exiger()` et la validation du client ; la barrière
reste pour tout futur acte judiciaire. La règle d'écran n° 1 gagne l'exception « pour une qualification
juridique, le gérant qualifie, le logiciel documente ».

## 4. Sous le capot

1. **Un dossier = la créance d'un client, remplie d'office.** « Lancer » rattache toutes les factures
   impayées du client. Une nouvelle facture impayée rejoint le dossier tant qu'aucun professionnel n'a
   déposé de requête ; après, elle s'affiche « hors procédure » et propose un second dossier. Une
   facture n'appartient toujours qu'à un dossier. Nouveau geste : retirer une facture, avec le montant
   abandonné chiffré par `controle.ts`.
2. **Table `envois`** : destinataire, modèle et version, document figé une fois validé, canal, coût,
   qui a validé et quand, identifiant chez le prestataire, preuves archivées ; états de la section 3.
   Rien ne se réécrit.
3. **Un seul chemin pour tout ce qui arrive** (dépôt du gérant, preuve renvoyée par le prestataire) :
   l'agent lit → pose une `proposition` sourcée → le gérant confirme → l'événement entre dans
   `evenementsProcedure`, qui fait courir les délais.
4. **L'agent** reprend le compagnon (phrases sourcées, refus tracés) avec une portée `DOSSIER`, limité
   aux faits et aux calculs (section 0). Ses capacités — préparer un envoi, lire un document déposé,
   proposer un événement — aboutissent toutes à une proposition, jamais à une écriture directe.
5. **Qualification** : `qualification.ts` rend le tableau à trois colonnes ; `scoring.ts` ne sort plus
   de score ni de verdict à l'écran ; `pays/france/commercialite.ts` rend une proposition à confirmer ;
   `pays/france/prescription.ts` expose tous les régimes et le choix du gérant ; `procedures.ts` cesse
   d'évaluer l'injonction de payer sur `entreCommercants` (art. 1405 ne le pose pas), retire « trois
   mois » écrit en dur, écrit « non avenue » et non « caduque ».
6. **Décompte** (`decompte.ts`) : un segment « imputation » par règlement (pénalités d'abord,
   C. civ. 1343-1, sauf clause des CGV lue ; la variante « principal d'abord » chiffrée à côté tant que
   la règle n'est pas confirmée) ; l'indemnité seulement sur les factures échues à la date d'arrêté ;
   aucune indemnité pour une échéance au jour ou après un jugement d'ouverture ; `tauxLisible()`
   n'arrondit plus le taux imprimé.
7. **Référentiel** : les entrées de la relecture (§ 4), la liste des tribunaux des activités
   économiques, les jours fériés, `Unite` étendu.
8. **Prestataires** : Maileva (recommandé papier hybride : brouillon, puis `submit` au clic), AR24
   (recommandé électronique qualifié), un prestataire de signature électronique pour l'échéancier. Un
   contrat par client ou un contrat unique : à demander à Maileva avant le lot envois.
9. **Routes** : `/app/dossier/$id` ; `creance/$id` et `procedures?p=` redirigent ; décompte et
   contrôle avant envoi deviennent des panneaux ; l'écran de composition disparaît ;
   `/app/debiteurs` devient `/app/clients`.
10. **Lexique** : un fichier source et son test (section 1 bis).

## 5. Découpage en lots

Chaque lot est livrable et mis en production seul, vérifié sur le déploiement servi.

- **Lot 0 — corrections en production, préalable** (proposé au fondateur, à part du chantier) :
  `ANGLE_MORT_PRESCRIPTION` ; les 40 € avant l'exigibilité ; l'imputation des règlements ; le niveau 3
  des relances branché sur le mauvais paramètre ; les textes de la landing (`etapes.tsx` : « La créance
  est qualifiée. Les quatre conditions sont tranchées. ») et de la grille tarifaire.
- **Lot 1 — le référentiel et le calcul** : entrées nouvelles, `decompte.ts`, calcul des délais.
- **Lot 2 — montrer, pas qualifier** : section 0 appliquée à la qualification, au score, à la
  prescription et au compagnon.
- **Lot 3 — la page dossier et le lexique** : route, deux colonnes, fil, rattachement automatique,
  retrait d'une facture, redirections, reprise du vocabulaire et son test.
- **Lot 4 — les situations** : les quatre situations de la section 2 sur la machine à états, la
  détection BODACC de la procédure collective.
- **Lot 5 — les envois** : table `envois`, les modèles, Maileva puis AR24 puis la signature
  électronique, les preuves archivées, la transmission aux professionnels.
- **Lot 6 — l'agent dans le dossier** : lecture des documents déposés, propositions d'événements,
  questions préécrites, bulle bornée au dossier.

## 6. Vérification

Mode rapide, conformément à la consigne du projet :
- un dossier de démonstration dans le showroom à chacune des quatre étapes et dans chaque situation
  d'exception, regardé aux quatre largeurs de référence ;
- des tests seulement là où une erreur coûte de l'argent, un délai ou une ligne rouge : l'imputation,
  l'indemnité, le calcul des délais, le rattachement automatique, les états d'un envoi, le lexique,
  les gabarits (aucune mention de Letikette, aucune forme qui imite un acte de commissaire de justice),
  le refus du compagnon sur « est remplie » ;
- vérification du déploiement Vercel et de l'empreinte du contenu servi, pas seulement du push.

## Hors périmètre de ce chantier

- Le compte séquestre (décidé ; chantier dédié ; le jour de son annonce, la section « Limites » de la
  landing et la ligne rouge n° 2 changent le même jour ; il fera de Letikette un recouvreur déclaré, ce
  qui change le modèle « au seul nom du client »).
- L'accès invité de l'avocat au dossier.
- La connexion de la messagerie du client (lecture des réponses dans SA boîte).
- La page « Mes clients » au-delà du bouton « Lancer » et du renommage.
- L'accueil dégraissé.
- Les connecteurs (Pennylane et suivants).
- La facturation : devis, avoirs, prestations livrées.
