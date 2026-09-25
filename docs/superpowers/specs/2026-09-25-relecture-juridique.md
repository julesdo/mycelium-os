# Relecture juridique de Letikette : synthèse

25 septembre 2026. Destinataires : Jules (dirigeant) et l'équipe produit.

**Ce que contient ce document.** Il résume cinq relevés juridiques contre-vérifiés le 25/09/2026 : l'injonction de payer, les procédures collectives, les paiements partiels et la prescription, les situations d'exception, et le risque de consultation juridique. Il résume aussi huit modèles de documents rédigés le même jour. Il s'appuie sur les deux notes du jour, `2026-09-25-releve-envois.md` et `2026-09-25-releve-exceptions.md`.

**Qui a relu.** Aucun avocat. C'est l'IA qui a fait la relecture, à la demande du fondateur. `valideParAvocat` reste à `false` partout, et ce document ne change rien à ce champ.

**Les sources.** Chaque réponse repose sur les pages citées dans les relevés, avec leur URL et un extrait mot pour mot. Pour cette synthèse, j'ai rouvert moi-même 16 des sources les plus importantes. Elles sont marquées « relue » dans l'annexe. Deux conflits entre les relevés sont réglés dans le texte :
- l'arrêté du 5 juillet 2024 qui désigne les tribunaux des activités économiques (TAE) a bien été lu ;
- pour une déclaration de créance envoyée par la poste, c'est la date d'expédition qui compte (Cass. com., 28/01/1997).

**La colonne « Tranchée par ».**
- **Texte** : un article en vigueur le dit en toutes lettres.
- **Décision publiée** : un arrêt ou un avis de la Cour de cassation publié au Bulletin le dit.
- **Décision non publiée** : un arrêt inédit le dit. Il pèse moins lourd.
- **Lecture** : la réponse est déduite de textes ou de décisions voisines. Aucun juge ne l'a dit pour ce cas.
- **Non tranché** : ni texte ni décision. Le produit adopte alors un comportement prudent.

---

## 1. L'essentiel en cinq points

1. **Ce qui peut ouvrir tout de suite : tous les calculs et toutes les échéances.** Cela couvre le décompte, les pénalités, les 40 € et les délais d'opposition, de signification, de consignation et de déclaration. Il suffit d'ajouter les paramètres de la partie 4 avec `verifie: true`, car `exiger()` n'en demande pas plus.
2. **Ce qui peut ouvrir sous conditions : l'envoi de courriers qui ne lancent aucune procédure.** Il s'agit du rappel, du compte arrêté, de la demande de signification à une étude, de la transmission à l'avocat et de la demande d'information au mandataire. Il faut que le courrier soit au seul nom du client, que le client ait validé ce document précis, que le gérant ait choisi le modèle et que l'IA n'y mette que des faits et des calculs. Le risque qui reste n'a jamais été jugé : le pré-remplissage lui-même.
3. **Ce qui reste bloqué tant que Jules n'a pas décidé : la mise en demeure, l'accord d'échéancier, les deux requêtes en injonction de payer et la déclaration de créance.** Ces documents passent par `exigerPourActe()`, qui les refuse tant que `valideParAvocat` vaut `false`. Lever cette barrière est une décision de gestion, pas une conclusion du relevé.
4. **Le vrai risque n'est pas l'envoi, c'est la qualification.** Un logiciel payant qui dit « cette créance remplit les conditions », qui choisit un régime de prescription, qui note un dossier ou qui répond à « ai-je droit ? » fait très probablement de la consultation juridique. La peine encourue est d'un an de prison et 15 000 € d'amende (loi n° 71-1130, art. 54, 66-2 et 72 ; code pénal, art. 433-17). La règle devient : **le logiciel montre, le gérant qualifie**.
5. **Quatre erreurs du code sont à corriger, quelle que soit la décision :**
   - le texte `ANGLE_MORT_PRESCRIPTION` dit qu'une mise en demeure agit sur la prescription, ce qui est faux (Cass. com., 18/05/2022, publié) ;
   - `principalAu` déduit chaque règlement du principal, alors que la loi l'impute d'abord sur les intérêts (C. civ. 1343-1) ;
   - `decompterFacture` compte les 40 € même avant l'exigibilité et même après l'ouverture d'une procédure collective (L441-10 II) ;
   - le niveau 3 des relances dépend de `mentionsObligatoiresInjonction`, qui décrit une requête en injonction de payer et non une mise en demeure.

---

## 2. Le risque qui touche tout le produit

### 2.1 La ligne à tenir

> **Le logiciel lit, calcule et montre. Le gérant qualifie, choisit et signe.**

**Ce qu'est une consultation juridique.** Aucun texte ne la définit. Les arrêts de la Cour de cassation dessinent quatre critères. C'est une lecture : aucune décision ne les réunit tous.
1. Une prestation personnalisée.
2. Une règle de droit appliquée à la situation de la personne.
3. Un avis, ou des éléments qui aident à décider.
4. Pour autrui, de façon habituelle et contre rémunération (art. 54).

Ce que disent les principales sources :
- vérifier des sommes « au regard de la réglementation en vigueur » est déjà une prestation juridique, même quand c'est simple (Cass. 1re civ., 15/11/2010, publié) ;
- qualifier la situation d'une personne « au regard du régime indemnitaire applicable » relève du conseil juridique (Cass. 1re civ., 25/01/2017, publié, rejet) ;
- le Gouvernement estime que les plateformes en ligne « ne sont donc pas autorisées » à donner des consultations. Il voit dans des intitulés comme « aide » ou « information » un risque de contourner l'interdiction (réponse à la question écrite n° 3177, JO AN du 08/04/2025, relue).

**Ce qui reste libre.** Diffuser une information documentaire est permis (art. 66-1) : afficher un texte, sa source et sa date, ou dire l'état du droit.

**Le calcul.** Faire le calcul lui-même est probablement une opération matérielle. La décision la plus proche est le jugement du TGI de Paris du 11/01/2017, lu sur Legalis et rendu sur un autre grief (l'assistance). Mais les choix faits AVANT le calcul sont juridiques :
- le régime du débiteur ;
- le taux prévu par les conditions générales de vente (CGV) ;
- l'imputation des paiements ;
- le point de départ.

C'est ce que suggèrent Cass. 1re civ., 20/12/2012 (inédit) et l'arrêt de 2010.

**Les modèles de documents.** Transmettre des modèles « sans les individualiser ni les adapter » n'est pas de la rédaction d'actes (Cass. 1re civ., 15/06/1999, publié). Dans l'affaire Demanderjustice, la plateforme ne remplissait pas elle-même la mise en demeure (CA Paris, 06/11/2018, texte lu sur Legalis). Letikette, elle, remplit. Aucun juge ne s'est prononcé sur ce cas, ni sur l'effet de la validation par le client.

**L'envoi.** Recouvrer à l'amiable « pour le compte d'autrui », même occasionnellement, est une activité réglementée (CPCE R124-1). Le relevé des envois pose donc quatre conditions :
- le document est au seul nom du client et porte sa signature ;
- rien de Letikette n'y figure ;
- les réponses et les paiements arrivent chez le client ;
- Letikette n'est jamais son mandataire.

**Les sanctions.**
- Consultation ou rédaction d'actes illicites : un an de prison et 15 000 € d'amende.
- Un contrat pour une activité illicite peut être annulé (Cass. 1re civ., 25/01/2017). Transposé à Letikette, cela vise les abonnements.
- Un document qui ressemble à un acte de justice est puni d'un an de prison et de 15 000 € d'amende (C. pén. 433-13, relu).

**Une mention en bas de page ne protège pas.** Le Conseil national des barreaux (CNB), qui est partie à ces procès, écrit que les juges n'accordent « pas de crédit » à ce type de clause.

### 2.2 Ce qui passe, et ce qui franchit la ligne

| Défendable (lecture) | Ligne franchie (lecture) |
|---|---|
| Afficher le texte d'une règle, avec son article, sa source et sa date, tirés de `parametres.ts` | Donner un verdict : « éligible », « remplit les conditions », « créance qualifiée », « dossier solide », un score |
| Calculer avec une formule publiée, sur les données du gérant, période par période | Affirmer une qualification : « votre client est commerçant », « votre créance se prescrit le… » |
| Recopier des faits mot pour mot : mention du registre, pièce présente, date | Laisser l'agent choisir le modèle, ajouter ou retirer un paragraphe, ou rédiger des motifs |
| Un tableau à trois colonnes : ce que prévoit le texte, ce que contient le dossier, ce que le gérant a répondu | Laisser le compagnon répondre à « puis-je », « ai-je droit », « est-ce prescrit » |
| Présenter toutes les options au même rang, y compris « ne rien faire » et « demander à un avocat » | Recommander ou classer une option, ou afficher une « prochaine étape » |
| Un modèle fixe choisi par le gérant, pré-rempli avec ses données, modifiable et signé par lui | Vendre de la « qualification », de l'« aide » ou de l'« assistance juridique », ou compter sur un avertissement |

### 2.3 Ce qu'il faut changer dans le produit

**Qualification et scoring**
1. `qualification.ts` : les « constats » deviennent un tableau à trois colonnes (texte, pièces, réponse du gérant). Les réponses peuvent être pré-remplies, mais elles sont marquées « proposition à confirmer ».
2. `scoring.ts` : retirer de l'écran le score de solidité, « éligible », « VERDICT » et « bon dossier ».
3. `pays/france/commercialite.ts` : la qualité de commerçant reste une proposition, que le gérant confirme.

**Prescription**
4. `pays/france/prescription.ts` : afficher tous les régimes avec leur condition, et laisser le gérant choisir. À défaut de choix, surveiller la date la plus proche en disant que c'est une hypothèse.
5. Corriger `ANGLE_MORT_PRESCRIPTION`. Texte proposé : « Une reconnaissance du débiteur, une demande en justice, une mesure conservatoire ou un acte d'exécution forcée interrompent la prescription ; une mise en demeure, même en recommandé, ne l'interrompt pas ({{param.miseEnDemeureNonInterruptive.source}}). »

**Compagnon**
6. `compagnon/prompt.ts` : le limiter aux faits et aux calculs du dossier. Retirer du point 2 l'autorisation d'affirmer une règle de droit. Prévoir un refus fixe qui affiche les textes du référentiel et dit qu'un avocat peut répondre. Ajouter un test : la réponse ne contient jamais « est remplie » ni « n'est pas remplie » après une condition légale.

**Procédures et courriers**
7. `procedures.ts` :
   - ne plus évaluer l'injonction de payer sur `entreCommercants`, puisque l'art. 1405 ne pose pas cette condition. Aujourd'hui, la variante « tribunal judiciaire » est inatteignable ;
   - retirer « trois mois » écrit en dur ;
   - écrire « non avenue » et non « caduque ».
8. `relance.ts` :
   - brancher le niveau 3 sur `modesMiseEnDemeure`, pas sur `mentionsObligatoiresInjonction` ;
   - ne plus affirmer que le niveau 2 « n'est pas une mise en demeure », mais écrire « ce courrier ne porte pas l'intitulé « mise en demeure » » ;
   - utiliser « pénalités de retard », le mot de L441-10 II.
9. `piece.ts` :
   - créer une variante « annexe » de l'avertissement (« ce n'est pas une mise en demeure… »), sans laquelle le décompte ne peut pas accompagner une lettre ;
   - imprimer le taux exact, que `tauxLisible()` tronque aujourd'hui à deux décimales.

**Calcul du décompte**
10. `decompte.ts` :
    - imputer chaque règlement d'abord sur les pénalités échues de la facture, avec un segment « imputation » par règlement, et chiffrer la variante actuelle à côté ;
    - ne compter les 40 € que sur les factures échues à la date d'arrêté ;
    - exclure l'indemnité quand l'échéance tombe le jour d'un jugement d'ouverture ou après.

**Modèles**
11. Le gérant choisit le modèle dans une liste visible. Chaque variable s'affiche avec son origine (« facture F-102, importée le… »). Chaque champ est modifiable, et le gérant valide puis signe. L'IA n'écrit aucune phrase. L'écran dit « pré-rempli avec vos données », jamais « rédigé par l'IA ». Aucune valeur juridique n'est écrite en dur : tout passe par `{{param.X}}` et `{{param.X.source}}`.
12. Tout courrier est au seul nom du client, y compris l'enveloppe et l'adresse d'expéditeur. Il ne porte jamais de nom, de logo, d'adresse ou d'e-mail de Letikette, ni de pouvoir au nom de Letikette. Aucune relance ne part automatiquement.
13. Un test balaie les gabarits pour refuser les formes qui imitent un acte de commissaire de justice (433-13).

**Parcours**
14. Le stepper montre ce qui est possible, toutes options au même rang, dans un ordre chronologique fixe. Il n'affiche jamais de « prochaine étape recommandée ».

**Marketing et règles du projet**
15. Reformuler trois textes :
    - `src/marketing/etapes.tsx` : « La créance est qualifiée. Les quatre conditions sont tranchées. » ;
    - `src/lib/config/tarifs.ts` : « Qualification des créances… » devient « Les conditions prévues par les textes, face aux pièces de votre dossier » ;
    - `src/marketing/limites.tsx`, clause 3 : « Le logiciel calcule et vous montre ce que disent vos pièces et les textes ; il ne dit pas si votre situation remplit une condition légale. »
16. CLAUDE.md : ajouter à la règle d'écran n° 1 l'exception « pour une qualification juridique, le gérant qualifie, le logiciel documente ». Réécrire la ligne rouge n° 1 comme le propose le relevé des envois (« Rien ne part sans que le client ait validé CE document… »). Partout, écrire « vous envoyez, avec Letikette », jamais « Letikette envoie en votre nom ».

---

## 3. Les réponses, thème par thème

### 3.1 Injonction de payer

| Question | Réponse courte | Tranchée par | Conséquence produit |
|---|---|---|---|
| Les 15 jours pour payer les frais d'opposition (CPC 1425 al. 2) partent-ils de l'envoi ou de la réception de la lettre du greffe ? | Le texte ne le dit pas. Les règles générales font partir un délai de la réception pour celui qui reçoit la lettre (CPC 668, 669). La sanction est certaine : la demande devient caduque et le créancier doit repasser par une procédure ordinaire. Une seule cour d'appel ajoute que l'ordonnance tombe aussi, et elle a annulé la saisie faite sur cette base. | Lecture. La sanction est tranchée par une décision publiée (Cass. 2e civ., 21/09/2000). | Stocker la date d'envoi (cachet), la première présentation et la remise. Calculer depuis le cachet, la date la plus précoce, avec la mention « départ non précisé par le texte ». Créer `delaiConsignationFraisOpposition`. Ne jamais écrire de montant de frais en dur. |
| Après une caducité, d'où partent les 15 jours pour faire valoir un motif légitime (CPC 468) ? | Le texte ne le dit pas et aucun arrêt ne le tranche. Refaire une nouvelle demande est admis en matière prud'homale : l'appliquer ici est une analogie. Seule la décision qui refuse de revenir sur la caducité peut faire l'objet d'un appel (2e civ., 20/04/2017, publié). | Non tranché | Calculer depuis la décision de caducité, en le disant. Présenter trois options au même rang : faire valoir un motif légitime, déposer une nouvelle demande, ne rien faire. Créer `delaiMotifLegitimeCaducite`. |
| Le TAE suit-il les règles du tribunal de commerce (avis du greffe, 1415 ; frais, 1425) ? | Probablement. La loi dit que le tribunal de commerce « est renommé » TAE, et c'est son greffier qui tient le greffe. Le greffe du TAE de Paris demande bien la consignation des frais. Aucun juge ne l'a dit. L'arrêté du 5/07/2024 (relu) désigne 12 TAE pour quatre ans à partir du 01/01/2025. | Lecture | Le champ « juridiction » prend trois valeurs : TC, TAE, TJ. Le TAE est traité comme un TC, et l'écran le présente comme une hypothèse. La liste des TAE va dans `parametres.ts`. Stocker la date de la requête. |
| Opposition faite à temps, mais l'avis du greffe arrive en retard : que vaut une exécution lancée au bout de deux mois (ordonnances rendues depuis le 01/09/2026) ? | Le texte permet d'exécuter si aucun avis n'a été REÇU dans les deux mois (1422 al. 3). Mais une opposition faite à temps suspend l'exécution (al. 1). Par analogie avec un avis de 1996, la saisie-attribution tiendrait, sans que le créancier soit payé avant le jugement. | Non tranché | Stocker la date de réception de chaque courrier du greffe. Afficher « le texte permet d'exécuter », avec sa réserve. Ne jamais déclencher ni proposer l'exécution. Créer `attenteExecutionInjonction`. |
| Une saisie rouvre le délai d'opposition (1416 al. 2) : qu'arrive-t-il à cette saisie ? | Une saisie-attribution n'est pas levée, mais les sommes saisies ne sont pas versées au créancier avant le jugement (avis de la Cour de cassation du 08/03/1996). Pour les autres saisies : non relevé. Le jugement remplace ensuite l'ordonnance (1420). | Décision publiée (avis) | Avant toute saisie, afficher un constat si l'ordonnance n'a pas été remise en main propre. État affiché : « maintenue, paiement suspendu ». Créer `delaiOppositionInjonctionProrogee`. |
| Si l'ordonnance tombe, si l'instance s'éteint ou si la demande devient caduque, l'interruption de la prescription tient-elle ? | Un seul cas est jugé : instance éteinte faute d'avocat au tribunal judiciaire, l'interruption est effacée (2e civ., 19/11/2020, publié). Pour la caducité, même solution par lecture, tirée d'un arrêt publié rendu sur un appel. Désistement, péremption ou rejet : l'interruption est effacée par le texte (2243). | Lecture (un cas tranché par une décision publiée) | Donner six statuts à l'interruption dans `prescription.ts`. Tout statut incertain retire l'interruption et recalcule la date, avec la mention « retrait par prudence, non jugé ». |
| Déposer la requête arrête-t-il la prescription (C. civ. 2241) ? | Non. Seule la signification de l'ordonnance par un commissaire de justice l'arrête. | Décision non publiée (1re civ., 09/09/2020). Décision publiée sous l'ancien texte (1re civ., 10/07/1990). | Ne jamais dire que la requête « protège » la créance. Afficher : « seule la signification par un commissaire de justice arrête la prescription, avant le [date] ». |
| À partir de quel montant peut-on faire appel du jugement sur opposition (1421) ? | Pas d'appel jusqu'à 5 000 € au tribunal de commerce (« jusqu'à », R721-6) et au tribunal judiciaire (« inférieur ou égal », R211-3-24). Les demandes liées aux mêmes faits s'additionnent (CPC 35). Non relevé : si les intérêts et les indemnités comptent dans ce montant. | Texte | Créer deux paramètres. Si le principal seul et le principal avec accessoires tombent de part et d'autre du seuil, afficher « indéterminé ». Ne jamais écrire « 5 000 € » en dur. |
| Combien de temps peut-on faire exécuter l'ordonnance (L111-4 CPCE) ? | Dix ans pour les titres des 1° à 3° de L111-3. Personne n'a tranché si l'ordonnance relève du 1° ou du 6°, que ce délai ne couvre pas. La règle est écartée après une opposition (2e civ., 29/09/2022, publié). Le point de départ n'est pas relevé. | Lecture | N'afficher aucune date de fin des dix ans. Surveiller uniquement la prescription de la créance. Créer `delaiExecutionTitreExecutoire` pour la durée seulement. |
| Le débiteur retire son opposition (1419-1, renvoi aux art. 400 à 405) : quels effets ? | Sans réserve, ce retrait vaut acceptation de la décision (404). L'accord du créancier n'est nécessaire que s'il a ajouté une demande (402). Les frais restent à la charge de celui qui retire, sauf accord contraire (399). | Texte | Afficher ce constat dans l'option « Discuter d'un règlement ». Ne rédiger aucun acte de désistement. Garder l'interruption de la prescription en cours, par lecture. |
| Ordonnances rendues avant le 01/03/2022 : l'ancien art. 1423 s'applique-t-il ? | Sous l'ancien régime, l'ordonnance tombait si la formule exécutoire n'était pas demandée dans le mois suivant la fin du délai d'opposition (appliqué par 2e civ., 03/11/2005, publié). Non tranché si ce mois courait encore au 01/03/2022. | Lecture | Gérer un troisième régime. Créer `basculeReformeInjonction2022` et `delaiDemandeFormuleExecutoireAncien`. Afficher l'état « peut-être non avenue » et ne jamais présenter l'ordonnance comme exécutoire. |
| Un procès-verbal de recherches (CPC 659) irrégulier est-il nul ? | Pour un défaut de forme, la nullité suppose que le débiteur prouve un préjudice (CPC 114 et 694 ; 2e civ., 11/10/1989, publié). Dressé ailleurs qu'à la dernière adresse connue, il ne vaut pas notification (2e civ., 02/07/2020, publié). Pour une société, assimiler le siège au RCS à la dernière adresse connue est une lecture. | Décision publiée | Stocker l'adresse du procès-verbal, l'extrait RCS du jour et la date d'envoi de la copie. Distinguer deux constats : « nullité possible si préjudice prouvé » et « remise possiblement inexistante ». |
| Un greffe accepte-t-il une requête papier signée électroniquement ? | Aucune source officielle ne répond. La requête doit être « datée et signée » (CPC 57). | Non tranché | Pas de requête par recommandé hybride tant qu'un greffe n'a pas confirmé par écrit. Présenter trois voies sans en choisir : signature à la main puis envoi par le client, Tribunal Digital, ou avocat. Remplir `mentionsObligatoiresInjonction` à partir des art. 54, 57 et 1407. |

### 3.2 Procédures collectives (sauvegarde, redressement, liquidation)

| Question | Réponse courte | Tranchée par | Conséquence produit |
|---|---|---|---|
| Existe-t-il un portail pour déclarer une créance en ligne ? | Aucun portail n'est en service au 25/09/2026, d'après le rapport annuel 2025 du Conseil national des administrateurs et mandataires judiciaires (CNAJMJ). L'ancien « Creditors Services » est fermé depuis le 31/08/2021. Son adresse affiche aujourd'hui des contenus sans rapport, mais certaines annonces du BODACC la citent encore. | Lecture (constat officiel, pas un texte) | Ne donner aucun lien de portail. Ne jamais recopier une adresse lue dans une annonce. Afficher « portail fermé depuis 2021 ». Un seul canal : le recommandé au mandataire, signé par le client. `urlPortailDeclarationCreances` = null. |
| Le délai de déclaration s'apprécie-t-il à l'envoi ou à la réception ? | À l'envoi : c'est la date du cachet de La Poste qui compte (CPC 668 et 669, appliqués par Cass. com., 28/01/1997, publié). Le créancier doit prouver l'envoi ET son contenu (Cass. com., 04/02/2026, publié). | Décision publiée | Afficher une « date limite de dépôt à La Poste ». Archiver la preuve de dépôt, le PDF exact et son empreinte. Jamais par simple courriel. Si le prestataire dépose le lendemain, le dernier clic utile est la veille. |
| Au jour du jugement d'ouverture, l'ordonnance était signifiée mais sans opposition : que devient la créance ? | Elle se déclare dans tous les cas, et l'exécution s'arrête (L622-21). Trois cas selon le délai d'opposition au jour du jugement : (a) expiré, l'ordonnance vaut titre et la déclaration n'a pas à être certifiée sincère ; (b) encore ouvert, la créance est vérifiée comme si elle n'avait pas de titre, par lecture ; (c) opposition déjà faite, l'instance est suspendue puis reprend pour fixer le montant (arrêt non publié du 01/07/2026). Si l'ordonnance n'a pas été remise en main propre, le délai d'opposition reste ouvert. | Lecture | Stocker la date et le mode de signification. Afficher le cas comme un constat, et le cas (b) comme « non tranché ». Créer `delaiOppositionInjonction`. |
| Les intérêts courus avant le jugement peuvent-ils être déclarés ? | Oui jusqu'au jugement, non après (L622-25 ; L622-28 ; L641-3 en liquidation). Les textes ne disent pas si le jour même du jugement produit des intérêts. | Texte | Arrêter un nouveau décompte figé à la date du jugement. Arrêter les intérêts la veille, par prudence. Classer les factures non échues en « sommes à échoir ». |
| L'indemnité de 40 € d'une facture échue avant le jugement peut-elle être déclarée ? | Probablement oui. Elle est exclue quand c'est la procédure qui empêche de payer à l'échéance (L441-10 II, dernière phrase), donc pour les échéances qui tombent le jour du jugement ou après. | Lecture | La déclarer sur une ligne distincte marquée « lecture », puisqu'une somme omise est perdue. Le gérant la voit avant de valider. Créer `exclusionIndemnitesProcedureCollective`. |
| Créances nées après le jugement (L622-24 al. 6) : dans quel délai les déclarer ? | Il faut d'abord trier. Une prestation fournie pendant la période d'observation ne se déclare pas : elle se signale dans l'année qui suit la fin de cette période (L622-17). Pour les autres créances, la lecture combine deux mois (fixés par décret) et un départ à l'exigibilité (fixé par la loi). Aucun juge n'a confirmé cette combinaison. | Lecture | Le gérant confirme un seul point : la prestation a-t-elle été fournie pendant la période d'observation ? Deux gabarits distincts : l'information, et la déclaration. |
| En liquidation, que deviennent les créances nées après le jugement (L641-13) ? | Dans quatre cas, elles sont payées à l'échéance. Impayées, elles perdent leur privilège si elles ne sont pas signalées dans les 6 mois de la publication, ou dans l'année du plan de cession. Leur liste peut être contestée dans le mois de sa publication (R641-39, relu). Cela vaut pour les liquidations ouvertes après le 23/10/2023. | Texte | Prévoir un gabarit « information du liquidateur », distinct de la déclaration. Le lecteur BODACC repère l'avis de dépôt de la liste et affiche la date limite de contestation. |
| Dans quel délai le jugement d'ouverture est-il publié (R621-8), et que change cette publication ? | Le greffier doit le publier dans les 15 jours, en redressement (R631-7) comme en liquidation (R641-7). C'est une obligation du greffe, sans sanction. Le délai de déclaration part de la parution, sauf avertissement personnel (sûreté ou contrat publiés). | Texte | Afficher « annonce attendue vers le [date] ». Ne calculer aucune date limite avant la parution. |
| Que juge Cass. com., 10/03/2021 ? | Le créancier peut ratifier jusqu'à la décision d'admission, sans forme et même implicitement, une déclaration faite en son nom par quelqu'un dont le pouvoir était imparfait. | Décision publiée | L'arrêt couvre un salarié du client, pas Letikette. Donnée manquante : la délégation de signature (nom, qualité, pièce). |
| Un éditeur peut-il transmettre une déclaration signée par le créancier sans être son mandataire ? | Probablement, si la déclaration reste celle du créancier : sa signature, son seul nom, aucun en-tête de Letikette. C'est une analogie avec Demanderjustice (crim., 21/03/2017, non publié). Contre-exemple : une déclaration faite sur l'en-tête d'une société de recouvrement a été jugée irrégulière (com., 27/01/2015, non publié). Reste le risque lié à l'art. 54 pour la préparation du document. | Lecture | Signature du représentant légal ou d'un salarié délégué. Aucune trace de Letikette, y compris sur l'enveloppe. La déclaration est un acte de procédure : elle passe par `exigerPourActe()`. |
| Quel pouvoir faut-il au « mandataire de son choix » (L622-24) ? | Un pouvoir écrit, spécial à cette procédure, donné avant la fin du délai (Ass. plén., 04/02/2011, publié ; com., 01/02/2000, publié). La ratification est admise depuis 2014. L'avocat n'a pas besoin de ce pouvoir. | Décision publiée | Letikette n'est jamais ce mandataire. La délégation d'un salarié le nomme, vise la procédure, est datée avant la date limite et jointe au dossier. |
| Quelles mentions la déclaration doit-elle porter ? | L622-25 : montant au jour du jugement, sommes à échoir, sûreté, conversion en euros, certification de sincérité (sauf titre exécutoire). R622-23 : preuves ou évaluation, intérêts qui continuent de courir, juridiction déjà saisie, sûreté non publiée, bordereau de pièces en copie. Ces règles valent pour les procédures ouvertes depuis le 01/10/2021. Aucune forme n'est imposée. | Texte | Le gabarit refuse une procédure antérieure au 01/10/2021. Données manquantes : le tribunal et le numéro de rôle (lisibles au BODACC), les sûretés, la délégation. |

### 3.3 Paiements partiels, échéanciers et prescription

| Question | Réponse courte | Tranchée par | Conséquence produit |
|---|---|---|---|
| Comment s'articulent les art. 1343-1 et 1342-10 du code civil ? | L'art. 1342-10 désigne la facture sur laquelle va le paiement. L'art. 1343-1 impute ensuite le paiement, dans cette facture, d'abord sur les intérêts (relu). Ces règles cèdent devant les CGV ou un accord. Le débiteur ne peut choisir une facture qu'en la payant entièrement, sauf accord du créancier (1re civ., 27/11/2019, publié). | Lecture | Corriger `principalAu`. Ajouter un segment « imputation » par règlement. Chiffrer à côté la variante « principal d'abord » tant que la règle n'est pas validée. Lire la clause d'imputation des CGV. |
| Que veut dire « la dette que le débiteur avait le plus d'intérêt d'acquitter » ? | Les juges du fond l'apprécient librement, au cas par cas. Ce peut être la dette assortie d'une sûreté (com., 04/11/1986, publié). | Décision publiée | Afficher ce critère comme « indéterminé ». Montrer l'hypothèse « facture la plus ancienne ». Le logiciel ne recommande aucune imputation. |
| L'indemnité de 40 € compte-t-elle comme des « intérêts » pour l'imputation ? | Au sens strict, non : la directive 2011/7/UE la distingue des intérêts et la destine aux frais de recouvrement. Un arrêt non publié range pourtant les frais de recouvrement parmi les sommes payées avant le principal (2e civ., 07/02/2019). Les pénalités de L441-10, elles, sont très probablement des intérêts. | Lecture | Imputer dans cet ordre : pénalités, puis principal. Garder les 40 € sur une ligne distincte. Ne pas les réclamer pour une indemnité d'assurance (2e civ., 17/09/2026, publié) ni en procédure collective. |
| Un e-mail du débiteur qui demande un délai vaut-il reconnaissance de dette (2240) ? | Il peut, à condition d'être sans ambiguïté (3e civ., 07/01/2021, publié). Des courriels ont déjà été retenus (1re civ., 26/04/2017, non publié). Toutes ces affaires concernent des crédits bancaires. | Décision non publiée | La date limite affichée ne change jamais. Une « date possible » s'affiche à côté. Conserver l'e-mail complet (.eml) avec son empreinte. |
| Un échéancier conclu après l'exigibilité fait-il courir la prescription échéance par échéance (2233) ? | Aucune décision publiée entre professionnels. Chaque versement peut interrompre la prescription (1re civ., 25/01/2017, publié, crédit bancaire). Le délai ne peut pas dépasser 20 ans (2232), sauf exceptions. | Lecture | Garder la date d'origine. Afficher les dates possibles, étiquetées comme telles. Une seule question au gérant : existe-t-il un accord écrit signé ? Créer `delaiButoirPrescription`. |
| Les pénalités courent-elles pendant un délai de grâce accordé par le juge (1343-5) ? | À la lettre, non : elles ne sont pas dues pendant ce délai (al. 4, relu). Mais le juge peut maintenir un intérêt réduit (al. 2). Aucune décision de la Cour de cassation sur L441-10. | Lecture | Mettre le segment à zéro, étiqueté « 1343-5 al. 4 ». Chiffrer la variante « taux légal maintenu » à côté. Si le jugement fixe un taux, c'est lui qui s'applique. |
| Les pénalités courent-elles pendant un échéancier amiable ? | Aucun texte français ne les suspend : elles courent, sauf si l'accord les abandonne. La directive (art. 5) ne compte les intérêts d'un échéancier que sur les sommes échues, mais L441-10 ne reprend pas cette règle. | Non tranché | Le client choisit une fois entre deux clauses fixes. Sans clause, le segment des échéances non encore dues est isolé et n'apparaît pas par défaut dans les courriers. |
| Qui peut demander au juge des délais de paiement (1343-5) ? | Le débiteur. Une clause contraire est réputée non écrite. Le débiteur perd ces délais si d'autres créanciers saisissent ses biens (CPC 512). | Texte | Un constat, jamais un conseil. Une clause des CGV qui écarte ces délais est traitée comme sans effet. |
| L'art. 2254 al. 3 (paiements périodiques) vise-t-il un échéancier mensuel ? | Non tranché. Répondre « non » paraît plus conforme au texte : ses exemples sont des créances périodiques par nature. | Non tranché | Aucun gabarit ne contient de clause sur la prescription. Une clause d'allongement lue dans des CGV n'allonge jamais la date affichée. |
| Existe-t-il une décision publiée selon laquelle un paiement partiel isolé, entre professionnels, vaut reconnaissance de dette ? | Aucune. Un arrêt non publié entre professionnels juge qu'une reconnaissance, même partielle, interrompt la prescription pour toute la créance (3e civ., 14/05/2020). | Décision non publiée | Garder la formule « pourrait la repousser ». Conserver le nom de celui qui a payé : un versement venu d'un tiers ne crée pas de date possible. Ne jamais étendre l'effet aux autres factures. |

### 3.4 Situations d'exception : débiteur introuvable, radié, entrepreneur individuel, jours fériés, lettre électronique

| Question | Réponse courte | Tranchée par | Conséquence produit |
|---|---|---|---|
| Une société radiée du registre doit-elle encore sa dette ? | Oui. Elle continue d'exister tant que ses dettes ne sont pas réglées (Cass. com., 20/09/2023, publié, relu). Il faut faire désigner par le tribunal un « mandataire ad hoc » pour la représenter (com., 01/10/2025, non publié ; com., 11/07/1988, publié). La fiche justice.fr qui dit le contraire n'est pas une source de droit. | Décision publiée | Écran fondé sur l'arrêt. Aucune mise en demeure à une société radiée : c'est un choix du produit, parce que personne n'a qualité pour la recevoir. Créer `survieSocieteRadiee`. |
| Comment obtenir ce mandataire ad hoc ? | Par une requête au président du tribunal de commerce. Les frais de greffe affichés vont de 11,52 € (Infogreffe) à 17,15 € (greffe de Nantes). Aucun barème pour la rémunération du mandataire. Non tranché : faut-il un avocat ? | Lecture | Letikette ne rédige pas cette requête, qui demande un raisonnement juridique. C'est une option au même rang que les autres. Montants dans des paramètres. |
| Procès-verbal de recherches dressé à l'ancien siège alors que le transfert n'est pas encore publié : est-il régulier ? | Un transfert de siège doit être inscrit au registre dans le mois (R123-66). Tant qu'il n'est pas publié, la société ne peut pas l'opposer aux tiers, sauf à ceux qui le connaissaient (L123-9). Le procès-verbal dressé au siège inscrit est donc régulier en principe. | Lecture | Transmettre toutes les adresses connues, avec leur source et leur date. Afficher un constat si une autre adresse était connue. Archiver l'extrait RCS du jour. |
| Peut-on remettre un acte à un établissement secondaire (CPC 690) ? | Oui, sans avoir d'abord essayé au siège (2e civ., 10/01/2019, non publié). Jamais à une autre société du groupe (2e civ., 15/04/2021, publié). | Décision non publiée | Lister les établissements actifs du débiteur lui-même. C'est le commissaire de justice qui choisit. |
| L'arrêt du 18/01/2023, rendu sur L631-5, vaut-il pour L640-5 ? | Très probablement : les deux textes sont identiques. Le délai d'un an part de la date à laquelle la radiation est inscrite au RCS. | Lecture | Toujours afficher la date la plus proche. Créer `delaiAssignationLiquidationApresRadiation`. |
| Entrepreneur individuel radié ou décédé : que devient la créance ? | Radié : c'est toujours la même personne, et ses patrimoines professionnel et personnel sont réunis (L526-22) pour les créances nées après le 15/05/2022. Décédé : un créancier peut demander une liquidation dans l'année du décès (L640-3). Sinon, les héritiers répondent selon leur choix d'accepter ou non (C. civ. 768 et suivants). | Texte | Déduire le régime de la date de la facture. Calculer les dates. La sommation faite aux héritiers est un acte de commissaire de justice, jamais un courrier de l'app. |
| Quels jours fériés comptent pour prolonger un délai (CPC 642) ? | Les 11 fêtes légales du code du travail (L3133-1), selon 3e civ., 21/01/2021 (publié). Les jours propres à l'Alsace-Moselle et à l'outre-mer : leur effet n'a pas été jugé. | Décision publiée | Trois paramètres. Règle asymétrique : ne pas prolonger un délai que le client doit tenir, prolonger une attente avant d'agir. |
| Une mise en demeure par lettre recommandée électronique refusée ou non réclamée est-elle valable ? | Probablement. La mise en demeure n'exige aucune forme (1344). Une lettre papier non réclamée reste valable (1re civ., 20/01/2021, publié, relu). La lettre électronique qualifiée vaut une lettre recommandée (L100). Mais le destinataire ne sait pas qui lui écrit avant d'accepter (R53-3, relu). | Lecture | Envoyer en papier par défaut. Copier chez nous la preuve de refus, que le prestataire ne garde qu'un an. Ne jamais écrire « à compter de la présente ». |

### 3.5 Consultation juridique et rédaction d'actes (loi n° 71-1130)

| Question | Réponse courte | Tranchée par | Conséquence produit |
|---|---|---|---|
| Qu'est-ce qu'une consultation juridique ? | Aucune définition légale. Ce sont les quatre critères du § 2.1. La complexité ne compte pas. | Lecture (critères tirés de décisions publiées) | Passer chaque fonction du produit au crible des quatre critères. |
| Où s'arrête l'information et où commence la consultation ? | Informer sur l'état du droit est libre (66-1). Donner un avis sur la situation de quelqu'un, non. Une étiquette « information » ne protège pas. | Lecture | Afficher les textes, jamais leur application sous forme d'avis. |
| Que risque Letikette ? | Un an de prison et 15 000 € d'amende (66-2, 72, C. pén. 433-17). Un abonnement pourrait être annulé, par transposition de l'arrêt du 25/01/2017. | Texte | Reformuler le marketing (§ 2.3, point 15). |
| Une exception (activité principale, gratuité) peut-elle couvrir Letikette ? | Non. L'art. 60 exige une qualification reconnue par l'État. Une fonction comprise dans un abonnement est rémunérée. | Texte | Aucun montage d'offre ne sort Letikette du périmètre. |
| Calculer les intérêts et les 40 €, est-ce une prestation juridique ? | Le calcul lui-même, probablement pas. Les choix faits avant (régime, taux des CGV, imputation, point de départ), oui. | Lecture | Le gérant déclare ou confirme ces choix, et l'écran les affiche comme tels. |
| Les « constats », le score et le régime de prescription choisi par le logiciel, est-ce de la consultation ? | Très probablement : c'est qualifier juridiquement une situation (1re civ., 25/01/2017, publié, relu). | Lecture | Tableau à trois colonnes. Retirer le score et le verdict. Le gérant choisit le régime. |
| Le compagnon IA fait-il de la consultation ? | C'est la fonction la plus exposée : il applique des règles de droit au dossier du dirigeant. | Lecture | Le limiter aux faits et aux calculs, avec un refus fixe et un test. |
| Que dit la jurisprudence sur les legaltech ? | Une seule affaire, Demanderjustice : c'est l'utilisateur qui raisonne et qui choisit le modèle. Rien depuis 2018 sur un outil qui applique lui-même les règles. | Non tranché | Le questionnaire de litige n'enregistre que des faits, ou il passe par l'avocat. |
| Une IA qui remplit un modèle fixe avec des faits rédige-t-elle un acte ? | Aucune décision. Des modèles transmis « sans les individualiser ni les adapter » ne sont pas de la rédaction d'actes (1re civ., 15/06/1999, publié). Letikette individualise sans adapter : cette distinction n'a jamais été jugée. | Non tranché | Le gérant choisit le modèle. Les champs sont visibles et modifiables. L'IA n'écrit aucune phrase. |
| Existe-t-il d'autres décisions sur les générateurs de documents ? | Presque rien : l'arrêt de 1999, et un arrêt inédit de 2023 sur un site de simple mise en relation. | Non tranché | C'est le point le plus incertain. Il vient en tête des questions pour un avocat. |
| Une mise en demeure est-elle un « acte sous seing privé » ? | Très probablement (C. civ. 1100-1 et 1344 ; effet de 1344-1). Selon son contenu, une lettre de niveau 2 (« compte arrêté ») peut aussi valoir mise en demeure. | Lecture | Appliquer au niveau 2 les mêmes précautions qu'au niveau 3. |
| La mise en demeure a-t-elle des mentions obligatoires, et arrête-t-elle la prescription ? | Aucune liste de mentions : le texte exige une « interpellation suffisante » (1344), laissée à l'appréciation du juge. Elle n'arrête pas la prescription (com., 18/05/2022, publié, relu). | Décision publiée | Corriger `ANGLE_MORT_PRESCRIPTION`. Brancher le niveau 3 sur `modesMiseEnDemeure`. |

### 3.6 Les huit modèles de documents : où ils en sont

| Modèle | Barrière | Ce qui bloque | Données manquantes |
|---|---|---|---|
| Mise en demeure (une ou plusieurs factures) | `exigerPourActe()` si c'est un acte (voir 3.5) | La décision sur la barrière. La variante « annexe » de l'avertissement de `piece.ts`. L'origine du taux (contrat ou taux légal), qui n'est pas figée par ligne dans le décompte. Les 40 € comptés avant l'exigibilité. | Capital social, RCS et ville du greffe, locataire-gérant, IBAN ou mode de paiement. Le modèle refuse un créancier inscrit au RNE sans RCS, et les formes non couvertes par R123-238. |
| Reconnaissance de dette et échéancier | Acte sous signature privée, donc `exigerPourActe()` | Aligner le moteur d'imputation sur le point 3 du modèle. Abandonner les pénalités pourrait exposer à l'amende de L441-16 : non tranché. Risque de requalification en transaction (2044). Un accord signé après la date limite relève de la renonciation (2250). | Dirigeants du débiteur au RNE, pour vérifier le pouvoir du signataire. |
| Requête en injonction de payer : tribunal de commerce, TAE ou Alsace-Moselle | `exigerPourActe()` | Séparer `mentionsObligatoiresInjonction` de `relance.ts` et de `procedures.ts`. La contribution pour la justice économique devant un TAE (au-delà de 50 000 €, sauf moins de 250 salariés). | Effectif, capital, ville du greffe, annuaire des juridictions, domicile d'un entrepreneur individuel. |
| Requête en injonction de payer : tribunal judiciaire | `exigerPourActe()` | Variante inatteignable à cause de `entreCommercants`. Jusqu'à 5 000 €, tentative amiable préalable (750-1) : le modèle refuse sans tentative ni dispense documentée. | Qualité de professionnel du débiteur, tentative amiable. |
| Demande de signification à une étude | `exiger()` proposé : la lettre ne produit pas d'effet de droit | La profession demande l'original de l'ordonnance. Un lien « Ouvrir dans ma messagerie » ne peut pas joindre de pièces. | Date de dépôt de la requête. Un seul débiteur par lettre. |
| Transmission à l'avocat | `exiger()` | Secret professionnel : les réponses doivent arriver chez le client, pas chez Letikette. Faut-il nommer l'outil à l'avocat (règlement intérieur national de la profession d'avocat, art. 19.4.2) ? | Aucune |
| Déclaration de créance, avec pouvoir spécial | Acte de procédure, donc `exigerPourActe()` | Nom et adresse du mandataire et type de procédure non stockés. La date de parution est écrasée par la dernière annonce. `decompterFacture` ajoute les 40 € à chaque ligne. Il peut y avoir un jour d'intérêts en trop. Le point « envoi ou réception » est réglé : c'est l'envoi (§ 3.2). | Mandataire, type de procédure, numéro de rôle, sûretés, délégation de signature. |
| Demande d'information au mandataire | `exiger()` | Aucun texte n'oblige le mandataire à répondre, et la demande ne suspend pas le délai de déclaration. | Mandataire, type de procédure. |

---

## 4. Paramètres à ajouter au référentiel (sans doublons)

**Déjà présents, à ne pas recréer :** `tauxInteretLegalDefaut`, `tauxInteretMinimalLegal`, `delaiPrescriptionCommerciale`, `qualiteCommercantParLaForme`, `formesCommercialesParLaForme`, `caractereCivilActivitesAgricoles`, `formeJuridiqueMuettePourPersonnePhysique`, `conditionsCreanceL126`, `indemniteForfaitaire`, `delaiContestationL126`, `delaiProcesVerbalNonContestation`, `delaiSignificationInjonction`, `delaiSignificationInjonctionAncien`, `basculeDelaiSignificationInjonction`, `tarifCommissaireJusticeL126`, `mentionsObligatoiresInjonction`, `professionCompetenteParActe`.

**Règles communes à toutes les entrées :**
- `valideParAvocat: false` sur chacune.
- Le type `Unite` doit accepter trois nouvelles unités : `joursOuvrables`, `fraction`, `salaries`.
- Quand plusieurs relevés proposaient la même règle sous des noms différents, un seul nom est retenu, indiqué ci-dessous.
- La colonne « verifie » indique la valeur proposée. « Relue » veut dire que la source a été rouverte pour cette synthèse.
- Les frais de greffe d'une injonction de payer au tribunal de commerce ne sont jamais écrits en dur, car les sources se contredisent : 25,19 € selon l'arrêté tarifaire du 25/02/2026, 33,47 € selon Service-Public, 30,23 € selon Infogreffe.

### 4.1 Entrées existantes à corriger

| Clé | Valeur | Texte | URL | Extrait | verifie |
|---|---|---|---|---|---|
| `indemniteForfaitaire` | 4000n inchangé. Source à remplacer par « D441-5, version en vigueur depuis le 27/02/2021 (décret n° 2021-211, art. 3) » | C. com. D441-5 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043197457 | « prévue au II de l'article L. 441-10 est fixé à 40 euros » | true (relue) |
| `mentionsObligatoiresInjonction` | Liste tirée des art. 54, 57 et 1407 du CPC. À remplir APRÈS avoir séparé cette clé de `relance.ts` et de `procedures.ts` | CPC 1407 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044200316 | « Outre les mentions prescrites par l'article 57, la requête contient l'indication précise du montant » | true |
| `basculeDelaiSignificationInjonction` | '2026-09-01' inchangé. Note élargie aux art. 1411, 1415, 1418 et 1422. Source : « I de l'art. 9 du décret n° 2026-96 » | Note sous CPC 1411 et suivants | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/ | « applicables aux ordonnances rendues à compter du 1er septembre 2026 » | true (relue) |
| `delaiSignificationInjonctionAncien` | Source à compléter par la bascule : la version citée n'était plus en vigueur pour une ordonnance rendue entre avril et août 2026 | idem | idem | idem | à corriger |
| `professionCompetenteParActe` | { signifierOrdonnanceInjonction: 'COMMISSAIRE_DE_JUSTICE' }. Le reste reste null | Ordonnance n° 2016-728, art. 1er I 3° | https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000048447300 | « ont seuls qualité [...] pour : [...] 3° Signifier les actes et les exploits » | true (partiel) |

### 4.2 Mise en demeure, pénalités et indemnité

| Clé | Valeur | Texte | URL | Extrait | verifie |
|---|---|---|---|---|---|
| `pointDepartPenalitesRetard` | « le jour suivant la date de règlement figurant sur la facture ». Relire à partir du 2027-01-01 (`sourceValableJusqua`) | C. com. L441-10 II | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038414392 | « exigibles le jour suivant la date de règlement figurant sur la facture » | true |
| `penalitesExigiblesSansRappel` | true. Relire à partir du 2027-01-01 | L441-10 II | idem | « Les pénalités de retard sont exigibles sans qu'un rappel soit nécessaire. » | true (relue) |
| `indemniteDuePleinDroit` (reprend aussi `indemniteForfaitaireDebiteurProfessionnel`) | true, due par tout débiteur professionnel | L441-10 II | idem | « Tout professionnel en situation de retard de paiement est de plein droit débiteur » | true (relue) |
| `indemnisationComplementaireSurJustification` | true | L441-10 II | idem | « le créancier peut demander une indemnisation complémentaire, sur justification » | true |
| `exclusionIndemnitesProcedureCollective` (reprend cinq noms proposés) | Pas d'indemnité quand l'échéance tombe le jour du jugement d'ouverture ou après (lu avec R621-4). Ne vise pas les pénalités. Relire à partir du 2027-01-01 | L441-10 II, dernière phrase | idem | « ne peut invoquer le bénéfice de ces indemnités lorsque l'ouverture d'une procédure [...] interdit le paiement à son échéance » | true (relue) |
| `indemniteParFacture` | true : une indemnité par facture payée en retard, une seule fois. Lecture de l'administration | Service-Public, fiche F23211 | https://entreprendre.service-public.gouv.fr/vosdroits/F23211 | « Elle s'applique à chaque facture qui n'a pas été payée dans les délais. » | true |
| `imputationIndemniteForfaitaire` | null (non tranché) | Directive 2011/7/UE, art. 6 § 2 ; 2e civ., 07/02/2019 | https://eur-lex.europa.eu/legal-content/FR/TXT/HTML/?uri=CELEX:32011L0007 | « vise à indemniser le créancier pour les frais de recouvrement qu'il a encourus » | false |
| `modesMiseEnDemeure` (reprend `exigenceMiseEnDemeure` et `mentionsObligatoiresMiseEnDemeure`) | ['sommation', 'acte portant interpellation suffisante', 'seule exigibilité si le contrat le prévoit'] | C. civ. 1344 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032035271/ | « soit par une sommation ou un acte portant interpellation suffisante » | true |
| `miseEnDemeureFaitCourirInteretLegal` (reprend `effetMiseEnDemeureSommeArgent`) | true. Règle du projet : ne pas le réclamer en plus des pénalités | C. civ. 1344-1 | idem | « fait courir l'intérêt moratoire, au taux légal » | true |
| `appreciationInterpellationSouveraine` | true : aucune liste légale de mentions | Cass. com., 09/06/2015, n° 14-15.342 (inédit) | https://www.legifrance.gouv.fr/juri/id/JURITEXT000030726999 | « relève du pouvoir souverain du juge du fond » | true |
| `miseEnDemeureNonInterruptive` (remplace `miseEnDemeureInterromptPrescription`) | true | Cass. com., 18/05/2022, n° 20-23.204 (publié) | https://www.legifrance.gouv.fr/juri/id/JURITEXT000045822952 | « n'interrompt pas le délai de prescription » | true (relue) |
| `miseEnDemeureNonReclameeValable` | true (arrêt rendu sous l'ancien code civil) | Cass. 1re civ., 20/01/2021, n° 19-20.680 (publié) | https://www.legifrance.gouv.fr/juri/id/JURITEXT000043087384 | « le défaut de réception effective [...] n'affecte pas sa validité » | true (relue) |
| `delaiRaisonnableMiseEnDemeure` | null. Le texte ne fixe aucun nombre : la valeur par défaut est un choix du produit, et l'écran le dit | C. civ. 1231 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032009929/ | « mis en demeure de s'exécuter dans un délai raisonnable » | false |
| `ressemblanceActeOfficielInterdite` | Liste des mots et des formes que le test refuse dans les gabarits | C. pén. 433-13 2° | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006418574 | « une ressemblance de nature à provoquer une méprise dans l'esprit du public » | true (relue) |

### 4.3 Lettre recommandée électronique, mentions sur les courriers et registre

| Clé | Valeur | Texte | URL | Extrait | verifie |
|---|---|---|---|---|---|
| `lreEquivalentRecommande` | true. Le consentement préalable n'est exigé que d'un destinataire non professionnel | CPCE (postes) L100 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033207397/ | « Dans le cas où le destinataire n'est pas un professionnel » | true |
| `delaiAcceptationLre` (un seul nom retenu) | 15 jours, à partir du lendemain de l'envoi de l'information au destinataire | R53-3 I | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036899789 | « pendant un délai de quinze jours à compter du lendemain de l'envoi de cette information » | true (relue) |
| `dureeConservationPreuveLre` | 1 an au minimum ; l'expéditeur y a accès pendant 1 an | R53-3 III et IV | idem | « pour une durée qui ne peut être inférieure à un an » | true |
| `mentionsPapiersAffairesImmatriculation` (reprend `mentionsCorrespondanceCommerciale`) | Liste des 1° à 9° : numéro d'identification, RCS et ville du greffe, siège, liquidation, locataire-gérant, entrepreneur individuel (EI)… | C. com. R123-237 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006178891/ | « ainsi que sur toutes correspondances et tous récépissés concernant son activité » | true |
| `mentionsFormeEtCapital` (reprend `mentionsFormeEtCapitalSociete`) | Forme sociale juste avant ou juste après la dénomination ; capital social pour la SARL et les sociétés par actions | C. com. R123-238 | idem | « indiquent la dénomination sociale, précédée ou suivie immédiatement et lisiblement » | true |
| `delaiInscriptionModificativeRCS` | 1 mois après le fait à inscrire | C. com. R123-66 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006197037/ | « une inscription modificative dans le mois de tout fait ou acte » | true |

### 4.4 Imputation, prescription et délais de grâce

| Clé | Valeur | Texte | URL | Extrait | verifie |
|---|---|---|---|---|---|
| `imputationPaiementPartiel` | 'INTERETS_PUIS_PRINCIPAL'. Règle qui cède devant le contrat. L'appliquer aux pénalités de L441-10 est une lecture | C. civ. 1343-1 al. 1 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032035257/2026-09-25 | « Le paiement partiel s'impute d'abord sur les intérêts. » | true (relue) |
| `ordreImputationPlusieursDettes` | ['INDICATION_DEBITEUR', 'ECHUES', 'PLUS_INTERET_ACQUITTER', 'PLUS_ANCIENNE', 'PRORATA'] | C. civ. 1342-10 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032035235/2026-09-25 | « d'abord sur les dettes échues ; parmi celles-ci, sur les dettes que le débiteur avait le plus d'intérêt d'acquitter » | true |
| `refusPaiementPartielPossible` | true | C. civ. 1342-4 | idem | « Le créancier peut refuser un paiement partiel même si la prestation est divisible. » | true |
| `causesInterruptionPrescription` | ['reconnaissance', 'demande en justice, même en référé', 'mesure conservatoire', 'acte d'exécution forcée'] | C. civ. 2240, 2241, 2244 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000019016790/ | « également interrompu par une mesure conservatoire [...] ou un acte d'exécution forcée » | true |
| `reconnaissanceInterromptPrescription` | true | C. civ. 2240 | idem | « La reconnaissance par le débiteur du droit de celui contre lequel il prescrivait interrompt le délai » | true |
| `dureeNouveauDelaiApresInterruption` | 'MEME_DUREE' | C. civ. 2231 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000019017290 | « Elle fait courir un nouveau délai de même durée que l'ancien. » | true |
| `delaiButoirPrescription` | 20 ans à partir de la naissance du droit. La note liste les exceptions de l'al. 2 : 2226, 2226-1, 2227, 2233, 2236, 2241 al. 1, 2244 | C. civ. 2232 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000006118187/2026-09-25 | « au-delà de vingt ans à compter du jour de la naissance du droit » | true |
| `renonciationPrescriptionAcquise` | Une renonciation n'est possible qu'une fois la prescription acquise. Tacite, elle doit être sans ambiguïté | C. civ. 2250 et 2251 | idem | « Seule une prescription acquise est susceptible de renonciation. » | true |
| `dureeMinimalePrescriptionConventionnelle` / `dureeMaximalePrescriptionConventionnelle` | 1 an / 10 ans. La note cite l'al. 3 : application aux échéanciers non tranchée | C. civ. 2254 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000019017063 | « ne peut toutefois être réduite à moins d'un an ni étendue à plus de dix ans » | true |
| `dureeMinimaleRepriseApresMediation` | 6 mois après la déclaration de fin de médiation ou de conciliation | C. civ. 2238 al. 2 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042671 | « pour une durée qui ne peut être inférieure à six mois » | true |
| `dureeCapitalisationInterets` | 1 an | C. civ. 1343-2 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032035261 | « dus au moins pour une année entière » | true |
| `delaiGraceMaximal` | 2 ans | C. civ. 1343-5 al. 1 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032035257/2026-09-25 | « dans la limite de deux années, le paiement des sommes dues » | true (relue) |
| `suspensionPenalitesDelaiGrace` | true | C. civ. 1343-5 al. 4 | idem | « ne sont pas encourues pendant le délai fixé par le juge » | true (relue) |
| `pointDepartDelaiGrace` | Le jugement s'il est contradictoire, sinon sa notification | CPC 511 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006135983/2026-09-25 | « Le délai court du jour du jugement lorsque celui-ci est contradictoire » | true |
| `jugesCompetentsDelaiGrace` | Le juge qui rend la décision, le juge des référés, ou le juge de l'exécution après un commandement ou une saisie. CPC 510, version du 01/04/2026 ; CPCE R121-1 | CPC 510 | idem | « le juge de l'exécution a compétence pour accorder un délai de grâce » | true |

### 4.5 Accord d'échéancier

| Clé | Valeur | Texte | URL | Extrait | verifie |
|---|---|---|---|---|---|
| `mentionSommeEcriteParLeSouscripteur` | true : la somme en lettres et en chiffres ; en cas de différence, les lettres l'emportent | C. civ. 1376 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032037827/ | « la mention, écrite par lui-même, de la somme ou de la quantité en toutes lettres et en chiffres » | true |
| `mentionSommeNonManuscriteAdmise` | true, si le procédé montre que c'est bien le signataire qui l'a écrite (arrêt rendu sous l'ancien art. 1326) | Cass. 1re civ., 13/03/2008 (publié) | https://www.legifrance.gouv.fr/juri/id/JURITEXT000018339458/ | « n'est plus nécessairement manuscrite » | true |
| `mentionElectroniqueDeLaMainMeme` | true | C. civ. 1174 al. 2 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032008860/ | « ne peut être effectuée que par lui-même » | true |
| `preuveLibreEntreCommercants` | true | C. com. L110-3 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006219127 | « les actes de commerce peuvent se prouver par tous moyens » | true |
| `pluraliteOriginauxElectronique` | Un exemplaire par partie sur support durable ; sur papier, le nombre d'originaux est mentionné | C. civ. 1375 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042416 | « Chaque original doit mentionner le nombre des originaux qui en ont été faits. » | true |
| `presomptionFiabiliteSignatureQualifiee` | 'signature électronique qualifiée' | Décret n° 2017-1416, art. 1 | https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000035676246 | « est présumée [...] lorsque ce procédé met en œuvre une signature électronique qualifiée » | true |
| `decheanceTermeLegaleLimiteeAuxSuretes` | true : une échéance impayée ne rend pas à elle seule tout le solde exigible | C. civ. 1305-4 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032030675/ | « ne peut réclamer le bénéfice du terme s'il ne fournit pas les sûretés promises au créancier » | true |
| `penaliteConvenueApresMiseEnDemeure` | true ; le juge peut la réduire | C. civ. 1231-5 al. 5 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032009929/ | « la pénalité n'est encourue que lorsque le débiteur est mis en demeure » | true |
| `decheanceTermeApresMiseEnDemeure` | true, sauf clause expresse. Arrêt rendu sur un prêt, retenu ici par prudence | Cass. 1re civ., 22/06/2017 (publié) | https://www.legifrance.gouv.fr/juri/id/JURITEXT000035005017/ | « sauf disposition expresse et non équivoque » | true |
| `clauseAbusiveContratAdhesion` | true | C. civ. 1171 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036829836 | « qui crée un déséquilibre significatif [...] est réputée non écrite » | true |
| `desequilibreSignificatifEntreProfessionnels` | true (version du 20/08/2026) | C. com. L442-1 I 2° | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000047381704 | « des obligations créant un déséquilibre significatif » | true |
| `novationNonPresumee` | true | C. civ. 1330 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042100 | « La novation ne se présume pas » | true |
| `transactionEcriteEtEffet` | Écrit obligatoire ; la transaction ferme l'action sur le même objet | C. civ. 2044 et 2052 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000006118164/ | « Ce contrat doit être rédigé par écrit. » | true |
| `remiseDeDette` | C'est un contrat, qui suppose l'accord des deux parties | C. civ. 1350 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042217 | « le contrat par lequel le créancier libère le débiteur de son obligation » | true |
| `titresExecutoiresListeFermee` | Liste fermée : un accord signé entre les parties n'y figure pas | CPCE L111-3 (version du 25/04/2026) | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036891163 | « Seuls constituent des titres exécutoires » | true |
| `amendePenalitesNonConformes` | 75 000 € pour une personne physique, 2 000 000 € pour une personne morale | C. com. L441-16 c) | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043750778 | « ne peut excéder 75 000 € pour une personne physique et deux millions d'euros » | true |

### 4.6 Injonction de payer : la requête

| Clé | Valeur | Texte | URL | Extrait | verifie |
|---|---|---|---|---|---|
| `procedureInjonctionDePayer` | Source affichée : « articles 1405 à 1422 du code de procédure civile » | CPC, section « L'injonction de payer » | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/ | « Section I : L'injonction de payer. (Articles 1405 à 1422) » | true |
| `conditionsInjonctionDePayer` | Cause contractuelle ou statutaire, et montant déterminé (clause pénale comprise) ; ou effet de commerce | CPC 1405 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006412552 | « La créance a une cause contractuelle [...] et s'élève à un montant déterminé » | true |
| `mentionsObligatoiresRequete` | Dénomination et siège du débiteur, indication des pièces, date, signature, à peine de nullité | CPC 57 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039623150 | « Elle est datée et signée. » | true |
| `mentionsObligatoiresDemandeInitiale` | Juridiction, objet, forme, dénomination, siège et représentant du créancier, démarches amiables le cas échéant | CPC 54 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042597347 | « A peine de nullité, la demande initiale mentionne » | true |
| `juridictionsInjonction` | Juge des contentieux de la protection, président du tribunal judiciaire, président du tribunal de commerce | CPC 1406 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039624723 | « ou devant le président du tribunal judiciaire ou du tribunal de commerce » | true |
| `competenceTerritorialeInjonction` | Tribunal du lieu où demeure le débiteur. Règle d'ordre public : toute clause contraire est réputée non écrite | CPC 1406 | idem | « celui du lieu où demeure le ou l'un des débiteurs poursuivis » | true |
| `lieuOuDemeureDefendeur` | Pour une personne morale : le lieu où elle est établie | CPC 43 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006410141 | « du lieu où celle-ci est établie » | true |
| `competenceTribunalCommerce` | Litiges entre commerçants, sur les sociétés commerciales, sur les actes de commerce | C. com. L721-3 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044078679 | « Des contestations relatives aux engagements entre commerçants » | true |
| `chambresCommercialesAlsaceMoselle` | Départements 57, 67 et 68 | C. com. L731-1 et L731-2 | https://www.legifrance.gouv.fr/codes/id/LEGISCTA000006146134 | « La compétence de la chambre commerciale est celle des tribunaux de commerce. » | true |
| `tribunauxActivitesEconomiques` | 12 ressorts (Avignon couvre aussi Carpentras), à partir du 01/01/2025, pour 4 ans. La fin de l'expérimentation est calculée, pas lue | Arrêté du 5/07/2024 | https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000049889657 | « débute le 1er janvier 2025, pour une durée de quatre ans » | true (relue) |
| `renvoiOppositionInjonction` | Faculté ouverte au créancier | CPC 1408 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/ | « l'affaire soit immédiatement renvoyée devant la juridiction qu'il estime compétente » | true |
| `modeSaisineInjonction` | Requête remise ou envoyée au greffe par le créancier ou par tout mandataire | CPC 1407 al. 1 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044200316 | « par requête remise ou adressée, selon le cas, au greffe par le créancier ou par tout mandataire » | true |
| `delaiConsignationFraisInjonction` | 15 jours à partir de la demande (envoi ou réception : non tranché) ; au tribunal de commerce, et au TAE par lecture | CPC 1425 al. 1 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006135968/ | « au plus tard dans les quinze jours de la demande, faute de quoi celle-ci sera caduque » | true |
| `fraisGreffeInjonctionTribunalCommerce` | null : trois montants contradictoires (voir le début de la partie 4) | Arrêté du 25/02/2026 | https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000053593881 | « Diligences relatives à l'ordonnance d'injonction de payer » | false |
| `fraisGreffeInjonctionTribunalJudiciaire` | 0n. Source administrative seulement | Service-Public, fiche F38156 | https://entreprendre.service-public.gouv.fr/vosdroits/F38156 | « Il n'y a pas de frais de greffe devant le tribunal judiciaire. » | true |
| `contributionJusticeEconomique` | true, devant un TAE seulement | Loi n° 2023-1059, art. 27 | https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000048430545 | « à peine d'irrecevabilité que le juge peut prononcer d'office » | true |
| `seuilContributionJusticeEconomique` | 5000000n (50 000 €) | Décret n° 2024-1225, art. 1 I | https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000050870748 | « supérieure à un montant de 50 000 euros » | true |
| `effectifExonerationContributionJusticeEconomique` | 250 salariés | Décret n° 2024-1225, art. 2 I 3° | idem | « employant moins de 250 salariés » | true |
| `justificatifsContributionJusticeEconomique` | true ; le texte ne précise pas la forme du justificatif | Décret n° 2024-1225, art. 4 | idem | « joint à l'acte introductif d'instance les documents justifiant de sa situation » | true |
| `seuilTentativeAmiablePrealable` | 500000n (5 000 €), au tribunal judiciaire. Application à l'injonction de payer non tranchée | CPC 750-1 al. 1 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039501708/ | « n'excédant pas 5 000 euros » | true (relue) |
| `dispensesTentativeAmiable` | 1° à 5°. Seul le 5° a une phrase fixe dans le modèle | CPC 750-1 al. 2 | idem | « Si le créancier a vainement engagé une procédure simplifiée de recouvrement des petites créances » | true (relue) |
| `formulairesCerfaInjonction` | Pour information : tribunal de commerce 12946*02, tribunal judiciaire 12948*06. Aucun texte lu n'impose ces formulaires | Notice n° 51156#10 | https://www.formulaires.service-public.gouv.fr/gf/getNotice.do?cerfaNotice=51156&cerfaFormulaire=16040 | « vous pouvez utiliser » | true |

### 4.7 Injonction de payer : après l'ordonnance

| Clé | Valeur | Texte | URL | Extrait | verifie |
|---|---|---|---|---|---|
| `remiseGreffeOrdonnance` | Copie certifiée de la requête et de l'ordonnance ; restitution des pièces | CPC 1410 al. 2 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/ | « le greffe remet au requérant une copie certifiée conforme de la requête et de l'ordonnance » | true |
| `piecesSignificationInjonction` (reprend `copieRequeteRemiseAuDebiteur`) | Requête, bordereau et ordonnance signifiés au débiteur ; pièces mises à sa disposition en ligne | CPC 1411 | idem | « Une copie certifiée conforme de la requête accompagnée du bordereau [...] est signifiée » | true |
| `plateformeMiseADispositionPieces` | 'MES_PIECES' ; consultation gratuite | Arrêté du 24/02/2022, art. 2 | https://www.legifrance.gouv.fr/loda/id/JORFTEXT000045243701/ | « dénommée « Mes Pièces » » | true |
| `delaiOppositionInjonction` | 1 mois après la signification | CPC 1416 al. 1 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/ | « L'opposition est formée dans le mois qui suit la signification de l'ordonnance. » | true (relue) |
| `delaiOppositionInjonctionProrogee` | 1 mois après le premier acte remis en main propre ou, à défaut, après la première saisie qui bloque des biens | CPC 1416 al. 2 | idem | « suivant le premier acte signifié à personne ou, à défaut, suivant la première mesure d'exécution » | true (relue) |
| `augmentationDelaiOppositionOutreMer` / `augmentationDelaiOppositionEtranger` | 1 mois / 2 mois, quand la juridiction siège en métropole. Application à l'opposition (par l'art. 645) : lecture | CPC 643 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006135898/ | « Deux mois pour celles qui demeurent à l'étranger. » | true |
| `delaiAvisOppositionGreffe` | 1 mois (ordonnances rendues depuis le 01/09/2026, hors tribunal de commerce) ; obligation du greffe, sans sanction | CPC 1415 dernier al. | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/ | « dans un délai d'un mois à compter de sa réception » | true |
| `delaiConsignationFraisOpposition` | 15 jours ; point de départ non précisé ; calcul depuis le cachet de la lettre | CPC 1425 al. 2 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006135968/ | « dans le délai de quinze jours à peine de caducité de la demande » | true |
| `juridictionOpposition` | La juridiction dont le juge a rendu l'ordonnance | CPC 1415 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/ | « devant la juridiction dont le juge ou le président a rendu l'ordonnance » | true |
| `delaiConstitutionAvocatOpposition` | 15 jours après la notification (ou après la présentation si l'avis de réception revient non signé) | CPC 1418 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053497789 | « Le créancier doit constituer avocat dans un délai de quinze jours à compter de la notification. » | true |
| `adresseNotificationOpposition` | L'adresse donnée dans la requête | CPC 1418 | idem | « à l'adresse indiquée par le créancier lors du dépôt de la requête » | true |
| `productionActeSignificationAudience` | true pour les ordonnances rendues depuis la bascule. Portée (toutes juridictions ou seulement la procédure écrite) à confirmer | CPC 1418, dernière phrase | idem | « A peine d'irrecevabilité de ses demandes, le créancier communique à l'audience l'acte de signification » | true |
| `seuilDispenseAvocatTribunalJudiciaire` | 1000000n (10 000 €) | CPC 761 3° | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039726277 | « inférieur ou égal à 10 000 euros » | true |
| `seuilDispenseAvocatTribunalCommerce` | 1000000n (10 000 €) | CPC 853 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006117253/ | « lorsque la demande porte sur un montant inférieur ou égal à 10 000 euros » | true |
| `delaiMotifLegitimeCaducite` | 15 jours ; point de départ non tranché ; calcul depuis la décision de caducité | CPC 468 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006410724 | « dans un délai de quinze jours le motif légitime » | true |
| `attenteExecutionInjonction` | 2 mois après la signification (ordonnances rendues depuis le 01/09/2026) | CPC 1422 al. 2 et 3 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053497793 | « à l'expiration d'un délai de deux mois suivant la signification » | true (relue) |
| `tauxDernierRessortTribunalCommerce` | 500000n (5 000 €), seuil inclus | C. com. R721-6 | https://www.legifrance.gouv.fr/codes/id/LEGISCTA000006161576/ | « en dernier ressort des demandes jusqu'à la valeur de 5 000 euros » | true |
| `tauxDernierRessortTribunalJudiciaire` | 500000n (5 000 €), seuil inclus | COJ R211-3-24 | https://www.legifrance.gouv.fr/codes/id/LEGISCTA000039013363 | « inférieur ou égal à la somme de 5 000 euros » | true |
| `delaiExecutionTitreExecutoire` | 10 ans. Point de départ et application à l'ordonnance non tranchés | CPCE L111-4 | https://www.legifrance.gouv.fr/codes/id/LEGISCTA000025026751/ | « ne peut être poursuivie que pendant dix ans » | true (durée seule) |
| `basculeReformeInjonction2022` | '2022-03-01' ; l'arrêté qui fixe la date n'a pas été lu | Décret n° 2021-1322, art. 8 II 2° | https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000044194093 | « au plus tard le 1er mars 2022 » | true |
| `delaiDemandeFormuleExecutoireAncien` | 1 mois (ancien art. 1423). Application aux ordonnances de la transition : lecture | Ancien CPC 1423 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/2022-02-01/ | « non avenue si la demande du créancier n'a pas été présentée dans le délai d'un mois » | true |

### 4.8 Commissaire de justice et remise des actes

| Clé | Valeur | Texte | URL | Extrait | verifie |
|---|---|---|---|---|---|
| `mentionsRequerantPersonneMorale` | Forme, dénomination, siège, représentant légal | CPC 648 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006135899/ | « sa forme, sa dénomination, son siège social et l'organe qui la représente légalement » | true |
| `mentionsDestinatairePersonneMorale` | Dénomination et siège | CPC 648, 4 | idem | « sa dénomination et son siège social » | true |
| `lieuNotificationPersonneMorale` | 'LIEU_DE_SON_ETABLISSEMENT' | CPC 690 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006411100 | « est faite au lieu de son établissement » | true |
| `ressortCompetenceCommissaireJustice` | Le ressort de la cour d'appel du siège de l'étude | Décret n° 2021-1625, art. 1 | https://www.legifrance.gouv.fr/loda/id/JORFTEXT000044472061/ | « dans le ressort de la cour d'appel du siège de leur office » | true |
| `ressortObligationConcoursCommissaire` | Le ressort du tribunal judiciaire de l'étude | Décret n° 2021-1625, art. 4 | idem | « dans le ressort du tribunal judiciaire au sein duquel leur office est établi » | true |
| `provisionCommissaireJustice` | Payée d'avance par celui qui demande l'acte | C. com. R444-52 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000032130781/ | « lui verse une provision suffisante » | true |
| `emolumentSignificationInjonction` | 2579n (25,79 €) ; relire au 2028-02-29 (`sourceValableJusqua`) | C. com. A444-11, prestation n° 4 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000032127742/ | « Signification de requête et d'ordonnance d'injonction de payer 25,79 € » | true |
| `coefficientsEmolumentObligationPecuniaire` | 0,5 jusqu'à 128 € ; 1 jusqu'à 1 280 € ; 2 au-delà | C. com. A444-46 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032127958 | « S'il est supérieur à 1 280 euros : coefficient 2 » | true |
| `forfaitDeplacementSignificationElectronique` | 880n (8,80 €) | C. com. A444-48 2° | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049906124 | « Egal à 8,80 € pour les significations réalisées exclusivement par voie électronique » | true |
| `forfaitDeplacementSignificationPapier` | null : dépend d'un barème fiscal non relevé | C. com. A444-48 1° | idem | « vingt fois la valeur mentionnée à l'article 6 B de l'annexe IV » | false |
| `equivalenceHuissierCommissaireJustice` | true, dans les textes réglementaires | Décret n° 2022-949, art. 67 | https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000045981413/ | « La référence aux huissiers de justice et aux huissiers désigne les commissaires de justice » | true |
| `expeditionActeSansFrais` | true | Décret n° 2021-1625, art. 14 | https://www.legifrance.gouv.fr/loda/id/JORFTEXT000044472061/ | « délivre sans frais à la partie » | true |
| `delaiEnvoiCopieProcesVerbalRecherches` | 1 jour ouvrable (le jour même ou le premier jour ouvrable suivant) | CPC 659 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006411032 | « Le même jour ou, au plus tard, le premier jour ouvrable suivant, à peine de nullité » | true |
| `delaiNotificationJugementDefaut` | 6 mois après la date du jugement | CPC 478 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006165203/ | « est non avenu s'il n'a pas été notifié dans les six mois de sa date » | true |

### 4.9 Calcul des délais

| Clé | Valeur | Texte | URL | Extrait | verifie |
|---|---|---|---|---|---|
| `computationDelaisMois` | Le même jour du mois, sinon le dernier jour du mois | CPC 641 al. 2 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006135898/ | « A défaut d'un quantième identique, le délai expire le dernier jour du mois. » | true |
| `reportDelaiJourNonOuvrable` | true. Inapplicable tant que la liste des jours fériés n'est pas dans le référentiel | CPC 642 | idem | « est prorogé jusqu'au premier jour ouvrable suivant » | true |
| `joursFeriesLegaux` (remplace `joursFeriesCalculDelais`) | Les 11 fêtes légales. Lien avec l'art. 642 : 3e civ., 21/01/2021 | C. trav. L3133-1 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000006189644/ | « Les fêtes légales ci-après désignées sont des jours fériés » | true |
| `joursFeriesAlsaceMoselle` | Vendredi saint (selon la commune) et 26 décembre. Effet sur l'art. 642 non jugé | C. trav. L3134-13 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006902635 | « Le Vendredi Saint dans les communes ayant un temple protestant ou une église mixte » | true |
| `joursFeriesAbolitionEsclavage` | Une date par collectivité. La loi et le décret ne listent pas les mêmes territoires (Saint-Barthélemy, Saint-Martin) | Loi n° 83-550 ; décret n° 83-1003 | https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000336997/ | « Guadeloupe : 27 mai. Guyane : 10 juin. Martinique : 22 mai. » | true |

### 4.10 Procédures collectives

| Clé | Valeur | Texte | URL | Extrait | verifie |
|---|---|---|---|---|---|
| `effetJugementOuverture` | 'A_COMPTER_DE_SA_DATE' ; applicable aussi au redressement (R631-7) et à la liquidation (R641-1), renvois lus | C. com. R621-4 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000029175157 | « prend effet à compter de sa date » | true |
| `arretPoursuitesProcedureCollective` (reprend `effetsJugementOuverture`) | Les actions et les exécutions sont arrêtées ; les délais de déchéance sont interrompus | C. com. L622-21 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044052603 | « interrompt ou interdit toute action en justice de la part de tous les créanciers » | true |
| `interdictionPaiementCreancesAnterieures` (reprend `interdictionPaiementProcedureCollective`) | true, sauf compensation entre créances connexes | C. com. L622-7 I | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044052577 | « interdiction de payer toute créance née antérieurement au jugement d'ouverture » | true |
| `delaiAnnulationPaiementInterdit` | 3 ans après le paiement | C. com. L622-7 III | idem | « dans un délai de trois ans à compter de la conclusion de l'acte ou du paiement » | true |
| `arretCoursInterets` (reprend `arretCoursInteretsJugementOuverture`) | true ; en liquidation par L641-3 | C. com. L622-28 al. 1 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042779 | « arrête le cours des intérêts légaux et conventionnels, ainsi que de tous intérêts de retard » | true |
| `dureeContratMaintienInterets` | 1 an (prêt, ou paiement différé d'un an ou plus) | L622-28 al. 1 | idem | « contrats assortis d'un paiement différé d'un an ou plus » | true |
| `interdictionCapitalisationProcedureCollective` | Sauvegarde et redressement seulement : L641-3 ne reprend pas cette phrase pour la liquidation | L622-28 al. 1, dernière phrase | idem | « les intérêts échus de ces créances ne peuvent produire des intérêts » | true |
| `delaiPublicationJugementOuverture` | 15 jours ; obligation du greffier | C. com. R621-8 ; R631-7 ; R641-7 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041563929 | « dans les quinze jours de la date du jugement » | true |
| `destinataireDeclarationCreance` | Mandataire judiciaire (sauvegarde, redressement) ; liquidateur (liquidation) | L622-24 ; L631-14 ; L641-3 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038587562 | « Les créanciers déclarent leurs créances au liquidateur » | true |
| `delaiDeclarationCreance` | 2 mois après la parution au BODACC ; en liquidation par R641-25 | C. com. R622-24 al. 1 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000029175247 | « deux mois à compter de la publication du jugement d'ouverture au Bulletin officiel » | true (relue) |
| `augmentationDelaiDeclarationHorsTerritoire` (remplace `...HorsMetropole`) | 2 mois, en métropole (al. 2) et outre-mer (al. 3) | R622-24 al. 2 et 3 | idem | « augmenté de deux mois pour les créanciers qui ne demeurent pas sur ce territoire » | true (relue) |
| `delaiDeclarationSuretePubliee` | 2 mois après l'avertissement personnel | C. com. L622-24 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038587553 | « à compter de la notification de cet avertissement » | true |
| `dateDeclarationPostale` | 'EXPEDITION' : c'est le cachet de La Poste qui fait foi | CPC 668 et 669 ; Cass. com., 28/01/1997 (publié) | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006411047 | « à l'égard de celui qui y procède, celle de l'expédition » | true |
| `mentionsDeclarationCreance` (reprend `contenuDeclarationCreanceLegal` et `...Reglementaire`) | Liste de L622-25 et de R622-23 | C. com. L622-25 ; R622-23 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044052608 | « La déclaration porte le montant de la créance due au jour du jugement d'ouverture » | true |
| `applicationReformeDeclaration2021` | '2021-10-01' : le modèle refuse une procédure plus ancienne | Note sous L622-25 | idem | « Elles ne sont pas applicables aux procédures en cours » | true |
| `mentionCertificationSincerite` | { formule: 'certifie sincère' }, sauf titre exécutoire | L622-25, dernier alinéa | idem | « Sauf si elle résulte d'un titre exécutoire, la créance déclarée est certifiée sincère » | true |
| `conversionMonnaieEtrangere` | Sert à refuser toute facture hors euro | L622-25 al. 2 | idem | « selon le cours du change à la date du jugement d'ouverture » | true |
| `visaDeclarationSurDemande` | Pour information du gérant | L622-25, dernier alinéa | idem | « peut être demandé par le juge-commissaire » | true |
| `declarantsAutorises` | ['créancier', 'préposé', 'mandataire de son choix']. Citer la phrase, car la numérotation des alinéas varie selon les sources | C. com. L622-24 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038587553 | « peut être faite par le créancier ou par tout préposé ou mandataire de son choix » | true |
| `ratificationDeclaration` | true, jusqu'à l'admission, sans forme (com., 10/03/2021, publié) | L622-24 | idem | « peut ratifier la déclaration faite en son nom jusqu'à ce que le juge statue » | true |
| `pouvoirDeclarationTiers` (reprend `formePouvoirDeclarant` et `ratificationSansForme`) | Écrit, spécial à la procédure, au nom de celui qui déclare, donné avant la fin du délai | Ass. plén., 04/02/2011 (publié) | https://www.legifrance.gouv.fr/juri/id/JURITEXT000023574135/ | « être munie d'un pouvoir spécial, donné par écrit, avant l'expiration du délai de déclaration » | true |
| `chargePreuveDeclaration` | 'creancier' | Cass. com., 04/02/2026 (publié) | https://www.legifrance.gouv.fr/juri/id/JURITEXT000053452204 | « sur qui pesait la charge de la preuve de sa déclaration de créance » | true |
| `declarationSansTitreSurEvaluation` | true | L622-24 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038587553 | « alors même qu'elles ne sont pas établies par un titre » | true |
| `presomptionDeclarationParDebiteur` | true, jusqu'à la déclaration du créancier | L622-24 | idem | « il est présumé avoir agi pour le compte du créancier » | true |
| `interruptionPrescriptionParDeclaration` | Jusqu'à la clôture de la procédure. Information pour l'écran, jamais dans le courrier | C. com. L622-25-1 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000028721903 | « interrompt la prescription jusqu'à la clôture de la procédure » | true |
| `delaiReponseDiscussionCreance` | 30 jours après réception de la lettre du mandataire (R624-1 al. 2) | C. com. L622-27 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006236729 | « Le défaut de réponse dans le délai de trente jours interdit toute contestation ultérieure » | true |
| `repriseInstanceApresDeclaration` | L'instance reprend à l'initiative du créancier. Étape hors de l'app | C. com. R622-20 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006161532/ | « dès que celui-ci a produit à la juridiction saisie de l'instance une copie de la déclaration » | true |
| `delaiReleveForclusion` | 6 mois après la parution | C. com. L622-26 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044052612 | « ne peut être exercée que dans le délai de six mois » | true |
| `reductionDelaiApresReleve` | 1/2 (unité `fraction`) | L622-24 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038587553 | « ils sont alors réduits de moitié » | true |
| `delaiDeclarationApresResiliation` | 1 mois après la résiliation | C. com. R622-21 al. 2 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006161533/ | « d'un délai d'un mois à compter de la date de la résiliation de plein droit » | true |
| `delaiDeclarationContratExecutionSuccessive` | 2 mois : depuis la parution (contrat antérieur au jugement) ou la première échéance impayée (contrat postérieur) | C. com. R622-22 al. 1 et 2 | idem | « dans un délai de deux mois à compter de la première échéance impayée » | true |
| `pointDepartDelaiCreancePosterieure` (remplace `delaiDeclarationCreancePosterieure`) | 'EXIGIBILITE'. La durée reprend `delaiDeclarationCreance` : combinaison non jugée | L622-24 al. 6 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038587553 | « Les délais courent à compter de la date d'exigibilité de la créance. » | true |
| `delaiInformationCreancePosterieure` | 1 an après la fin de la période d'observation | C. com. L622-17 IV | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044052591 | « dans le délai d'un an à compter de la fin de la période d'observation » | true |
| `delaiInformationCreancePosterieureLiquidation` | 6 mois après la publication (liquidations ouvertes après le 23/10/2023) | C. com. L641-13 III | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000048248754 | « dans le délai de six mois à compter de la publication du jugement ouvrant ou prononçant la liquidation » | true |
| `delaiInformationCreancePosterieurePlanCession` | 1 an après la publication du plan de cession | L641-13 III | idem | « dans le délai d'un an à compter de celle du jugement arrêtant le plan de cession » | true |
| `delaiContestationListeCreancesPosterieures` | 1 mois après la publication. Note : le texte renvoie encore au « IV » de L641-13, devenu « III » | C. com. R641-39 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006133270/ | « dans un délai d'un mois à compter de la publication » | true (relue) |
| `delaiRevendicationMeubles` | 3 mois après la publication (acte distinct, non couvert par les modèles) | C. com. L624-9 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000019984033 | « dans le délai de trois mois suivant la publication du jugement ouvrant la procédure » | true |
| `actesPortailElectronique` | La déclaration fait partie des actes prévus pour le portail | C. com. D814-58-3 ; R814-58-4 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031079165 | « par lettre recommandée électronique adressée par la voie du portail électronique » | true |
| `urlPortailDeclarationCreances` | null. Ne jamais reprendre l'adresse citée dans une annonce | C. com. L814-2 ; rapport annuel 2025 du CNAJMJ | https://www.cnajmj.fr/wp-content/uploads/2026/09/Rapport-annuel-2025-du-CNAJMJ.pdf | « n'est plus en fonction depuis 2021 » | false |
| `formulaireOfficielDeclarationCreance` | Pour information : Cerfa 10021*01 (1998), repère de structure seulement | Cerfa 10021*01 | https://www.greffe-tae-paris.fr/uploads/paris/TDE/creances.pdf | « DÉCLARATION DE CRÉANCES » | true |
| `listeCreanciersDuDebiteur` | Remise par le débiteur au mandataire | C. com. L622-6 al. 2 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045178124 | « la liste de ses créanciers, du montant de ses dettes » | true |
| `depotListeCreanciersAuGreffe` | 8 jours après le jugement, puis dépôt au greffe | C. com. R622-5 al. 2 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031090723 | « Dans les huit jours qui suivent le jugement d'ouverture » | true |
| `listeCreancesDeclarees` | Établie par le mandataire | C. com. L624-1 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000028723981 | « la liste des créances déclarées avec ses propositions » | true |
| `depotListeCreancesDeclareesAuGreffe` | true | C. com. R624-2 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006161534/ | « est déposée au greffe » | true |
| `consultationEtatCreances` | true, par toute personne | C. com. R624-8 al. 2 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006178929/ | « où toute personne peut en prendre connaissance » | true |
| `delaiReclamationEtatCreances` | 1 mois après la publication | R624-8 al. 4 | idem | « dans le délai d'un mois à compter de la publication » | true |
| `delaiAvertissementCreanciersConnus` | 15 jours après le jugement ; obligation du mandataire | C. com. R622-21 al. 1 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006161533/ | « dans le délai de quinze jours à compter du jugement d'ouverture, avertit les créanciers connus » | true |

### 4.11 Société dissoute ou radiée, entrepreneur individuel, succession

| Clé | Valeur | Texte | URL | Extrait | verifie |
|---|---|---|---|---|---|
| `survieSocieteRadiee` | true. Arrêt isolé, rendu sur une dissolution amiable | Cass. com., 20/09/2023 (publié) | https://www.legifrance.gouv.fr/juri/id/JURITEXT000048104616 | « en dépit de sa radiation du registre du commerce et des sociétés » | true (relue) |
| `fraisGreffeOrdonnanceSurRequete` | 1152n (11,52 €). Page non datée | Tarif affiché par Infogreffe | https://www.infogreffe.fr/guide-des-formalites/fond--referes--requetes/tarifs/ordonnances-sur-requetes--autres-que-referes-et-injonctions-de-payer- | « Ordonnance sur requête (avec 1 notif. au requérant) 11.52 € » | false |
| `fraisGreffeDesignationMandataireAdHocNantes` | 1715n (17,15 €). Les deux montants diffèrent | Greffe du tribunal de commerce de Nantes | https://www.greffe-tc-nantes.fr/procedure/autres_requetes_president | « règlement de 17,15 € (mandataire ad' hoc ou administrateur judiciaire) » | false |
| `delaiAssignationLiquidationApresRadiation` | 1 an à partir de la date à laquelle la radiation est inscrite au RCS | C. com. L640-5 al. 2 1° | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006133199/ | « la radiation consécutive à la publication de la clôture des opérations de liquidation » | true |
| `delaiSaisineTribunalLiquidationNonClose` | 3 ans après la dissolution | C. civ. 1844-8 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006444186 | « dans un délai de trois ans à compter de la dissolution » | true |
| `delaiActionResponsabiliteLiquidateur` | 3 ans à partir de la décision définitive qui reconnaît les droits du créancier | C. com. L237-12 et L225-254 ; Cass. com., 25/06/2013 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006226359 | « se prescrit par trois ans » | true |
| `delaiActionAssociesNonLiquidateurs` | 5 ans après la publication de la dissolution | C. com. L237-13 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006230091 | « se prescrivent par cinq ans à compter de la publication de la dissolution » | true |
| `delaiActionAssociesSocieteCivile` | 5 ans. Recopier la phrase de l'art. 1859 dans `note` avant de passer à `verifie: true` | C. civ. 1859 (poursuite préalable de la société : 1858) | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000006150305/ | « qu'après avoir préalablement et vainement poursuivi la personne morale » | false |
| `dateEntreeVigueurStatutEI` | '2022-05-15'. Une facture émise ce jour-là est « non couverte » | Loi n° 2022-172, art. 19 | https://www.legifrance.gouv.fr/jorf/article_jo/JORFARTI000045167551 | « s'appliquent aux créances nées après l'entrée en vigueur des articles 1er à 5 » | true |
| `reunionPatrimoinesEI` | true, à la cessation de toute activité ou au décès | C. com. L526-22 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000049048964 | « le patrimoine professionnel et le patrimoine personnel sont réunis » | true |
| `delaiAssignationApresDecesEI` | 1 an après le décès | C. com. L640-3 al. 2 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006133199/ | « dans le délai d'un an à compter de la date du décès » | true |
| `delaiAssignationApresCessationNonCommercant` | 1 an après la cessation d'activité | C. com. L640-5 al. 2 2° | idem | « La cessation de l'activité, s'il s'agit d'une personne exerçant une activité artisanale » | true |
| `delaiAvantSommationOption` | 4 mois après le décès. La sommation est faite par acte de commissaire de justice | C. civ. 771 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000006136273/ | « A l'expiration de ce délai, il peut être sommé, par acte extrajudiciaire » | true |
| `delaiReponseSommationOption` | 2 mois après la sommation | C. civ. 772 | idem | « A défaut d'avoir pris parti à l'expiration du délai de deux mois » | true |
| `delaiDeclarationSuccessionActifNet` | 15 mois à partir de la publicité de la déclaration de l'héritier (art. 788) | C. civ. 792 | idem | « Faute de déclaration dans un délai de quinze mois à compter de la publicité » | true |
| `delaiPrescriptionOption` | 10 ans après l'ouverture de la succession | C. civ. 780 | idem | « La faculté d'option se prescrit par dix ans » | true |
| `delaiExecutionTitreContreHeritier` | 8 jours après la signification à l'héritier | C. civ. 877 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006433050 | « huit jours après que la signification lui en a été faite » | true |

**Ce qui manque encore, sans source aujourd'hui :**
- la liste des jours chômés propres aux juridictions ;
- le taux du dernier ressort devant le juge des contentieux de la protection ;
- le point de départ du délai de dix ans de L111-4 ;
- le barème de l'art. 6 B de l'annexe IV du code général des impôts, pour le forfait papier ;
- la version de L641-13 antérieure à 2023 ;
- les renvois de L631-14 pour les cautions en redressement.

---

## 5. Ce qu'un juge ou un avocat devra trancher, et ce que le produit fait en attendant

1. **Pré-remplir un modèle avec les données du client, est-ce « rédiger un acte pour autrui » (art. 54) ?** En attendant :
   - le gérant choisit le modèle ;
   - il voit chaque champ et son origine, et peut tout modifier ;
   - l'IA n'écrit aucune phrase ;
   - les actes restent derrière `exigerPourActe()`.
2. **Une mise en demeure, et une lettre de « compte arrêté », sont-elles des actes sous seing privé ?** En attendant, les niveaux 2 et 3 suivent les mêmes précautions. Le niveau 3 attend la décision sur la barrière.
3. **Qualifier une créance (constats, qualité de commerçant, régime de prescription, score), est-ce de la consultation ?** En attendant, le logiciel montre les textes et les pièces, et c'est le gérant qui répond. Score et verdict sont retirés de l'écran.
4. **Expédier, sur ordre exprès du client, un courrier validé et à son nom, est-ce du recouvrement pour autrui (CPCE R124-1) ?** En attendant :
   - chaque document est validé un par un ;
   - rien ne porte le nom de Letikette ;
   - Letikette ne reçoit ni fonds ni réponses ;
   - aucune relance ne part automatiquement.
5. **D'où partent les délais que le texte ne date pas ?** Cela vise les frais d'opposition, le motif légitime après une caducité et le jour du jugement pour les intérêts. En attendant, le calcul part de l'événement le plus précoce, et l'écran le dit.
6. **Un versement, un e-mail ou un échéancier repousse-t-il la prescription ?** En attendant, la date d'origine reste la limite. La date repoussée n'est affichée que comme possible.
7. **Pour l'imputation d'un paiement, les pénalités, et les 40 €, comptent-ils comme des « intérêts » ?** En attendant, le paiement va d'abord sur les pénalités, puis sur le principal. Les 40 € restent sur une ligne à part. L'autre lecture est chiffrée à côté.
8. **Les pénalités courent-elles pendant un échéancier amiable ou un délai de grâce du juge ?** En attendant, ce segment est isolé et exclu par défaut des courriers. Si la décision du juge fixe un taux, c'est elle qui s'applique.
9. **Les 40 € d'une facture échue avant le jugement d'ouverture peuvent-ils être déclarés ?** En attendant, ils sont déclarés sur une ligne distincte marquée « lecture ». Le gérant la voit avant de valider.
10. **Le TAE suit-il les règles du tribunal de commerce (1415, 1425) ?** En attendant, oui, et l'écran l'affiche comme une hypothèse.
11. **Peut-on faire exécuter après deux mois sans avis du greffe, alors qu'une opposition a été faite à temps ?** En attendant, l'app ne déclenche ni ne propose l'exécution, et affiche la réserve.
12. **L'ordonnance d'injonction de payer relève-t-elle des dix ans de L111-4 ?** En attendant, aucune date de fin n'est affichée. Seule la prescription de la créance est surveillée.
13. **Faut-il une tentative amiable (750-1) avant une injonction de payer au tribunal judiciaire ?** En attendant, le modèle refuse de se remplir sans tentative ni dispense documentée.
14. **Une lettre recommandée électronique refusée vaut-elle mise en demeure ?** En attendant, le papier est le canal par défaut.
15. **Un jour férié local prolonge-t-il un délai ?** En attendant, la règle asymétrique s'applique : les délais que le client doit tenir ne sont pas prolongés, les attentes avant d'agir le sont.

**Ce qui bloque sans relever d'un juge ni d'un avocat :**
- **Décisions de Jules :**
  - le sort de la barrière `exigerPourActe()`. Le projet n'a pas d'avocat, et l'écran doit le dire au lieu de lever la barrière en silence ;
  - faut-il nommer l'outil à l'avocat du client ;
  - où arrivent et où sont archivées les réponses de l'avocat ;
  - comment envoyer un e-mail avec des pièces jointes depuis la messagerie du client.
- **Questions aux greffes :**
  - acceptent-ils une signature électronique sur une requête papier ?
  - une requête libre ou le formulaire Cerfa ?
  - combien d'exemplaires ?
  - comment payer les frais ?
- **Questions aux études de commissaires de justice :** faut-il l'original de l'ordonnance, ou une copie suffit-elle ?
- **Questions aux prestataires (Maileva, AR24, prestataire de signature) :** peuvent-ils tout envoyer et afficher au seul nom du créancier, et que voit le débiteur ?

---

## Annexe : sources principales

**Relues pour cette synthèse (16 sources) :**
- Cass. com., 18/05/2022, n° 20-23.204, publié. https://www.legifrance.gouv.fr/juri/id/JURITEXT000045822952 : « une mise en demeure, fût-elle envoyée par lettre recommandée avec demande d'avis de réception, n'interrompt pas le délai de prescription » ; « Cette énumération est limitative. »
- C. com. L441-10 (version du 26/04/2019 au 01/01/2027). https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038414392 : « Les pénalités de retard sont exigibles sans qu'un rappel soit nécessaire. »
- Loi n° 71-1130, art. 54. https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000039280601 : « Nul ne peut, directement ou par personne interposée, à titre habituel et rémunéré, donner des consultations juridiques ou rédiger des actes sous seing privé, pour autrui »
- C. com. D441-5 (depuis le 27/02/2021, décret n° 2021-211). https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043197457 : « prévue au II de l'article L. 441-10 est fixé à 40 euros »
- C. com. R622-24. https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000029175247 : « deux mois à compter de la publication du jugement d'ouverture au Bulletin officiel des annonces civiles et commerciales »
- CPC 1405 à 1422. https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/ : « non avenue si elle n'a pas été signifiée dans les trois mois de sa date »
- Cass. com., 20/09/2023, n° 21-14.252 et 22-21.718, publié. https://www.legifrance.gouv.fr/juri/id/JURITEXT000048104616 : « en dépit de sa radiation du registre du commerce et des sociétés »
- Cass. 1re civ., 25/01/2017, n° 15-26.353, publié, rejet. https://www.legifrance.gouv.fr/juri/id/JURITEXT000033943957 : « au regard du régime indemnitaire applicable »
- CPCE (postes) R53-3. https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036899789 : « Le destinataire n'est pas informé de l'identité de l'expéditeur de la lettre recommandée électronique. »
- C. civ. 1343-1 et 1343-5. https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032035257/2026-09-25 : « Le paiement partiel s'impute d'abord sur les intérêts. »
- Réponse à la question écrite n° 3177, JO AN du 08/04/2025. https://www.assemblee-nationale.fr/dyn/17/questions/QANR5L17QE3177.pdf : « Les plateformes en ligne ne sont donc pas autorisées à délivrer des consultations juridiques aux internautes. »
- C. pén. 433-13. https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006418574 : « une ressemblance de nature à provoquer une méprise dans l'esprit du public »
- Cass. 1re civ., 20/01/2021, n° 19-20.680, publié. https://www.legifrance.gouv.fr/juri/id/JURITEXT000043087384 : « le défaut de réception effective par le débiteur de la mise en demeure, adressée par lettre recommandée, n'affecte pas sa validité »
- CPC 750-1 (depuis le 13/05/2023). https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039501708/ : « Si le créancier a vainement engagé une procédure simplifiée de recouvrement des petites créances »
- Arrêté du 5/07/2024 relatif au TAE. https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000049889657 : « débute le 1er janvier 2025, pour une durée de quatre ans »
- C. com. R641-39 et R641-25. https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006133270/ : « Tout intéressé peut contester cette liste devant le juge-commissaire dans un délai d'un mois à compter de la publication. »

**Tirées des relevés contre-vérifiés du 25/09/2026 (non rouvertes pour cette synthèse) :**
- Cass. 1re civ., 15/11/2010, n° 09-66.319, publié. https://www.legifrance.gouv.fr/juri/id/JURITEXT000023113684/ : « constitue elle-même une prestation à caractère juridique, peu important le niveau de complexité des problèmes posés »
- Cass. 1re civ., 15/06/1999, n° 96-21.415, publié. https://www.legifrance.gouv.fr/affichJuriJudi.do?idTexte=JURITEXT000007041947 : « sans les individualiser ni les adapter à la situation spécifique de chacun »
- Cass. crim., 21/03/2017, n° 16-82.437, non publié. https://www.legifrance.gouv.fr/juri/id/JURITEXT000034282986/ : « qu'elles sont à leur seul nom et comportent leur seule signature » ; « son rôle est purement matériel »
- CA Paris, 06/11/2018, n° 17/04957 (presse juridique). https://www.legalis.net/jurisprudences/cour-dappel-de-paris-pole-2-ch-1-arret-du-6-novembre-2018/ : « la lettre de mise en demeure n'est pas remplie par la société Demander Justice »
- Loi n° 71-1130, art. 66-1 et 66-2. https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000508793/LEGISCTA000006112891/ : « ne fait pas obstacle à la diffusion en matière juridique de renseignements et informations à caractère documentaire »
- C. pén. 433-17. https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000021342951 : « est puni d'un an d'emprisonnement et de 15 000 euros d'amende »
- CPCE R124-1. https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000025938362 : « d'une manière habituelle ou occasionnelle, même à titre accessoire, procèdent au recouvrement amiable des créances pour le compte d'autrui »
- Cass. 1re civ., 09/09/2020, n° 19-12.006, non publié. https://www.courdecassation.fr/decision/5fca46d9fd0c9f9c649109b3 : « la présentation d'une requête en injonction de payer ne constitue pas une telle demande » (cette page ne s'affiche pas sans JavaScript et n'a pas pu être rouverte)
- Cass. com., 28/01/1997, n° 94-21.125, publié. https://juricaf.org/arret/FRANCE-COURDECASSATION-19970128-9421125 : « celle de l'expédition »
- Cass. com., 04/02/2026, n° 24-21.337, publié. https://www.legifrance.gouv.fr/juri/id/JURITEXT000053452204 : « sur qui pesait la charge de la preuve de sa déclaration de créance »
- Ass. plén., 04/02/2011, n° 09-14.619. https://www.legifrance.gouv.fr/juri/id/JURITEXT000023574135/ : « la déclaration des créances équivaut à une demande en justice »
- Cass. com., 10/03/2021, n° 19-22.385, publié. https://www.legifrance.gouv.fr/juri/id/JURITEXT000043253293 : « aucune forme particulière n'est prévue pour cette ratification, qui peut être implicite »
- Cass. 2e civ., 19/11/2020, n° 19-20.238. https://www.courdecassation.fr/decision/5fca277ce35a255d41ca739a : « l'interruption de la prescription [...] est non avenue »
- Cass. 3e civ., 21/01/2021, n° 19-24.799, publié. https://www.legifrance.gouv.fr/juri/id/JURITEXT000043087389 : « soit jusqu'au mardi lorsque le lundi est un jour férié »
- Avis de la Cour de cassation, 08/03/1996. https://www.legifrance.gouv.fr/juri/id/JURITEXT000007035310 : « fait obstacle [...] au paiement au créancier des sommes rendues indisponibles »
- Cass. 1re civ., 27/11/2019, n° 18-21.570, publié. https://www.courdecassation.fr/decision/5fca61cbeb012b49a0aa041e : « implique, sauf accord de son créancier, qu'il procède au paiement intégral de cette dette »
- Cass. 3e civ., 14/05/2020, n° 19-16.210, non publié. https://www.legifrance.gouv.fr/juri/id/JURITEXT000041914646 : « la reconnaissance, même partielle [...] entraîne pour la totalité de la créance un effet interruptif »
- Cass. 1re civ., 25/01/2017, n° 15-25.759, publié. https://www.legifrance.gouv.fr/juri/id/JURITEXT000033943937/ : « était interruptif de la prescription de la créance litigieuse, chaque paiement »
- Cass. com., 15/04/2021 et 10/01/2019, sur l'art. 690. https://www.legifrance.gouv.fr/juri/id/JURITEXT000043473469 et https://www.legifrance.gouv.fr/juri/id/JURITEXT000038069909 : « sans avoir à rechercher si une signification avait préalablement été tentée au siège social »
- Rapport annuel 2025 du CNAJMJ. https://www.cnajmj.fr/wp-content/uploads/2026/09/Rapport-annuel-2025-du-CNAJMJ.pdf : « Le portail en question, appelé « Creditors Services », n'est plus en fonction depuis 2021. »
- Doctrine du CNB, vade-mecum de l'exercice du droit (2023), partie aux contentieux. https://cnb.avocat.fr/medias/cnb-vademecum-exercice-du-droit-2023-68f77e825bf8f7.74522639.pdf : « les juges n'accordent pas de crédit à ce type de stipulations contractuelles »