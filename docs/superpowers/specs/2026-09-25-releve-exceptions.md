# Parcours d'un dossier : les situations qui sortent des quatre étapes

Note de design, 25/09/2026. Le relevé juridique date du même jour. Il s'appuie sur Légifrance (version en vigueur), service-public, justice.fr, courdecassation.fr, les données ouvertes du BODACC et le CNAJMJ. Chaque point a ensuite été contre-vérifié un par un. N'est tenu pour établi que ce que la contre-vérification a confirmé, et ses corrections sont intégrées ici. Aucune valeur n'a été validée par un avocat : `valideParAvocat: false` partout. Le sujet technique (§3) n'a pas été contre-vérifié : c'est une recommandation, avec ses sources.

## 0. Règles communes aux quatre situations

- **Le parcours garde ses quatre étapes** : Prêt, On lui écrit, Le tribunal si besoin, Réglé. Une situation s'ajoute par-dessus sans les effacer. L'étape en cours reste visible. La situation dit ce qui se passe, quel délai court et quelles options existent.
- **Présentation des options** :
  - même composant et même taille pour toutes, sans badge ni couleur de seuil ;
  - liste à puces, jamais numérotée ;
  - ordre fixe (chronologique), qui n'est pas un classement ;
  - chaque option porte sa conséquence en une ligne ;
  - « Classer sans suite » et « Ne rien faire pour l'instant » figurent au même rang que les autres.
- **Couleurs de seuil** : elles servent au délai seulement. Quand un texte ne nomme pas le point de départ, l'écran calcule depuis l'événement connu le plus précoce et l'écrit : « départ non précisé par le texte, date calculée depuis… ».
- **Calcul des délais** (CPC 641 et 642 ; ils s'appliquent aussi aux procédures collectives par R662-1 C. com.) :
  - un délai en mois finit le même jour du mois ; si ce jour n'existe pas, le dernier jour du mois ;
  - pour un délai en jours, le jour de départ ne compte pas ;
  - tout délai finit à 24 h ;
  - s'il finit un samedi, un dimanche ou un jour férié ou chômé, il passe au premier jour ouvrable suivant ;
  - aucun texte lu ne parle de délai « franc » ;
  - la liste des jours fériés n'a pas été relevée.
- **Deux régimes d'injonction de payer coexistent**. C'est la date de l'ordonnance qui décide (décret n° 2026-96, art. 9 : les 3° à 6° de l'art. 1er ne visent que les ordonnances rendues à compter du 01/09/2026). La bascule touche les articles 1411, 1415, 1418 et 1422 du CPC, pas seulement le délai de signification. Le dossier doit donc stocker la date de l'ordonnance.
- **Une mise en demeure n'interrompt pas la prescription**, même envoyée en recommandé avec AR (Cass. com., 18 mai 2022, n° 20-23.204, publié) : la liste des actes qui l'interrompent est fermée. Aucun texte de l'étape « On lui écrit » ne doit laisser croire le contraire.
- **Vocabulaire** : les textes disent encore « huissier de justice ». L'écran dit « commissaire de justice », profession unique depuis le 01/07/2022 (ordonnance n° 2016-728, art. 25).

## 1. Les quatre situations

### 1.1 Votre client conteste (opposition à l'injonction de payer)

**Où** : étape « Le tribunal, si besoin », après la remise officielle de l'ordonnance (la « signification »).

**Ce que le dossier doit porter** : la date de l'ordonnance (pour le régime), la juridiction (tribunal de commerce, tribunal judiciaire ou juge des contentieux de la protection), le montant demandé (seuil de 10 000 €), le mode de remise (à la personne ou non), la date de signification et la date des courriers du greffe.

**À l'écran, dans tous les cas**
> Votre client conteste la décision du juge (l'ordonnance) : il a fait opposition, et le tribunal va rejuger toute l'affaire. En attendant, vous ne pouvez pas faire saisir ses biens.

**À l'écran, selon le tribunal**
- **Tribunal de commerce** : « Le greffe vous a écrit le [date] : les frais de l'opposition doivent être payés au greffe dans les 15 jours, sinon votre demande tombe. Une audience suivra, à laquelle le greffe vous convoquera. »
- **Audience** (tribunal de commerce ; tribunal judiciaire pour 10 000 € ou moins ; affaire du juge des contentieux de la protection) : « Le greffe vous convoque à l'audience du [date]. Si personne ne vient, l'ordonnance tombe ; si vous seul êtes absent, votre client peut demander au tribunal de juger l'affaire sans vous. »
- **Tribunal judiciaire, au-delà de 10 000 €** : « Pour ce montant, un avocat doit représenter votre entreprise, et il doit être désigné avant le [date]. Sinon l'affaire s'arrête et l'ordonnance tombe. »
- **Ordonnance rendue depuis le 01/09/2026, en plus** : « À l'audience, le tribunal refuse d'examiner votre demande si vous ne présentez pas l'acte par lequel le commissaire de justice a remis l'ordonnance à votre client. »

**Délais**
- **Pour contester** : 1 mois, à partir de la signification, quelle qu'en soit la forme (1416 al. 1).
  - Ce délai suspend l'exécution, et une opposition faite dans ce délai aussi (1422 al. 1).
  - Si l'ordonnance n'a pas été remise à la personne, l'opposition reste possible jusqu'à 1 mois après le premier acte remis à la personne ou, à défaut, après la première saisie qui bloque ses biens (1416 al. 2). Cette prolongation n'est pas dite suspensive.
  - Débiteur outre-mer : +1 mois ; à l'étranger : +2 mois, quand la juridiction siège en métropole (643). L'art. 645 étend ces allongements à tous les cas sans dérogation expresse, et les art. 1405 à 1422 n'en contiennent pas. Aucune décision n'a été lue sur ce point.
- **Frais d'opposition au tribunal de commerce** : 15 jours. Le texte ne dit pas s'ils partent de l'envoi ou de la réception de la lettre recommandée du greffe. Si les frais ne sont pas payés, la demande est caduque (1425 al. 2).
- **Avocat au tribunal judiciaire (procédure écrite)** : 15 jours à compter de la notification de la copie de l'opposition. Si l'accusé de réception revient non signé, la notification est datée du jour de présentation. Sans avocat dans ce délai, l'instance s'éteint et l'ordonnance devient non avenue (1418 ; 1419 al. 2 et 3).
- **Audience** :
  - si aucune partie ne vient, l'instance s'éteint et l'ordonnance devient non avenue (1419 al. 1 et 3) ;
  - si seul le créancier est absent sans motif légitime, le débiteur peut demander un jugement sur le fond, qui sera contradictoire. Le juge peut aussi renvoyer l'affaire, ou déclarer la citation caduque, même de lui-même (468) ;
  - la caducité est levée si un motif légitime est communiqué au greffe « dans un délai de quinze jours ». Le texte ne nomme pas le point de départ ;
  - la Cour de cassation applique l'art. 468 au créancier absent après une opposition. Ne pas avoir reçu les écritures adverses n'est pas un empêchement de venir (Cass. 2e civ., 28 juin 2012, n° 11-21.051, publié).
- **Avis du greffe** (ordonnances depuis le 01/09/2026, hors tribunal de commerce) : le greffe doit prévenir le créancier dans le mois qui suit la réception de l'opposition. Aucune sanction n'est prévue en cas de retard (1415 dernier al.). À afficher comme une information, pas comme une tâche du gérant.
- **À savoir** : le tribunal rejuge tout, y compris les demandes incidentes (1417), et son jugement remplace l'ordonnance (1420). L'appel est possible au-delà du taux du dernier ressort (1421), dont le montant n'a pas été relevé.

**Options, côte à côte**
- Aller soi-même à l'audience, dans les cas où l'avocat n'est pas obligatoire.
- Se faire représenter par quelqu'un qui n'est pas avocat, muni d'un pouvoir spécial :
  - au tribunal de commerce, toute personne de son choix (853) ;
  - au tribunal judiciaire, seulement : conjoint, concubin ou partenaire de Pacs ; parents ou alliés en ligne directe ; parents ou alliés en ligne collatérale jusqu'au 3e degré ; personnes exclusivement attachées à son service personnel ou à son entreprise (762).
- Confier le dossier à un avocat.
  - Il est obligatoire au tribunal de commerce au-delà de 10 000 €, sauf si la demande vient d'une obligation de 10 000 € ou moins, et sauf les autres cas de l'art. 853.
  - Il est obligatoire au tribunal judiciaire au-delà de 10 000 €, sauf dans les matières du juge des contentieux de la protection et les autres cas de l'art. 761.
  - En procédure écrite, il doit être désigné dans les 15 jours qui suivent la notification.
- Au tribunal de commerce : payer les frais d'opposition dans les 15 jours, ou ne pas les payer. La demande devient alors caduque.
- Ne pas poursuivre. Les suites diffèrent selon le cas :
  - frais non payés au tribunal de commerce : la demande est caduque ;
  - pas d'avocat quand il est obligatoire au tribunal judiciaire : l'ordonnance devient non avenue ;
  - personne à l'audience : l'ordonnance devient non avenue ;
  - créancier seul absent alors que le débiteur vient : le tribunal peut juger la créance sur le fond, et la rejeter.
- Discuter d'un règlement avec le client. S'il retire son opposition, les règles du désistement s'appliquent (1419-1 ; les art. 400 à 405 n'ont pas été lus).

**S'il ne conteste pas** (même étape)
> Votre client n'a pas contesté dans le délai. Vous pouvez confier l'ordonnance à un commissaire de justice pour faire saisir ses biens à partir du [date].

- **Date d'exécution possible** :
  - ordonnance rendue avant le 01/09/2026 : à la fin du mois qui suit la signification (1422, version 2022) ;
  - ordonnance rendue depuis : il faut en plus que 2 mois aient passé depuis la signification sans que le créancier ait reçu l'avis d'opposition (1415) ni l'invitation à payer les frais (1425) (1422 al. 2 et 3). Appliquer les art. 641 et 642 à cette attente est une lecture prudente, pas une règle écrite.
- Si l'ordonnance n'a pas été remise à la personne, la première saisie rouvre un mois pendant lequel le client peut encore contester (1416 al. 2).
- **Options** : faire exécuter par un commissaire de justice ; attendre (le délai pour exécuter un titre n'a pas été relevé) ; chercher un règlement ; classer sans suite.

### 1.2 Son entreprise est en difficulté (sauvegarde, redressement, liquidation)

**Où** : à n'importe quelle étape. L'ouverture de la procédure met le parcours en pause.

**Ce que le logiciel lit seul dans l'annonce BODACC** : le type de procédure, la date du jugement, la date de parution, le nom et l'adresse du mandataire judiciaire ou du liquidateur. Ce champ est du texte libre dont la forme varie : l'extraction doit le tolérer. La résidence hors métropole se déduit de l'adresse de l'organisation. Le gérant ne confirme que ce qu'aucune annonce ne dit : une sûreté publiée, un contrat en cours.

**À l'écran**
- **Procédure publiée** :
  > L'entreprise de votre client est en [redressement judiciaire] depuis le [date du jugement] : les poursuites et les intérêts de retard s'arrêtent à cette date. Seules les créances déclarées avant le [date limite] à [Me X, la personne nommée par le tribunal pour recevoir les créances] ont une part de ce qui sera réparti.
- **Jugement connu, annonce pas encore parue** :
  > Le tribunal a ouvert une procédure le [date], mais l'annonce officielle n'est pas encore parue. Le délai pour déclarer votre créance ne commencera qu'à cette parution.
- **Paiement reçu après le jugement** :
  > Ce paiement est arrivé après l'ouverture de la procédure, alors que la loi interdit à votre client de payer ses dettes antérieures. Il peut être annulé pendant 3 ans.
  (Ce dossier ne passe pas en « Réglé » sans cette réserve. Exception : le paiement par compensation de créances connexes, L622-7.)
- **Clôture pour insuffisance d'actif** (état final, distinct de « Réglé ») :
  > Le tribunal a clos la liquidation de votre client faute d'argent. Sauf exceptions prévues par la loi, vous ne pouvez plus le poursuivre.
- **Rétablissement professionnel** (entrepreneur individuel) :
  > La procédure de votre client s'est close par un rétablissement professionnel. Ses dettes antérieures sont effacées lorsque les conditions de la loi sont remplies.

**Délais**
- **Déclarer la créance** : 2 mois à compter de la parution au BODACC, pas de la date du jugement (R622-24 ; en liquidation, R641-25).
  - 4 mois pour un créancier qui ne demeure pas en métropole, quand le tribunal y siège.
  - Sûreté ou contrat publiés : 2 mois à compter de l'avertissement personnel du mandataire (L622-24).
  - Si le délai est manqué, le créancier ne participe pas aux répartitions. Sa créance est aussi inopposable au débiteur pendant le plan, et après si le plan est tenu, ainsi qu'aux cautions personnes physiques (L622-26).
- **Relevé de forclusion** (demander au juge de rattraper une déclaration tardive) : 6 mois à compter de la parution.
  - Sûreté publiée : à compter de la réception de l'avis.
  - Exception : à compter du jour où le créancier ne pouvait plus ignorer sa créance, s'il prouve qu'il ne pouvait pas la connaître avant.
  - Si le juge l'accorde, le délai de déclaration est réduit de moitié et part de la notification de sa décision (L622-24). La moitié se calcule : 1 mois sur 2, 2 mois sur 4.
- **Contrat résilié pendant la procédure** : 1 mois à compter de la résiliation de plein droit, ou de la notification de la décision qui la prononce (R622-21 al. 2).
- **Annulation d'un paiement interdit** : 3 ans à compter du paiement (L622-7 III).
- **Créance née après le jugement** :
  - si elle naît pour les besoins de la procédure, ou en contrepartie d'une prestation fournie pendant la période d'observation, elle est payable à son échéance ;
  - impayée, elle perd son privilège si elle n'est pas signalée à l'administrateur ou au mandataire dans l'année qui suit la fin de la période d'observation (L622-17 I et IV) ;
  - les autres créances nées après le jugement se déclarent, et le délai part de leur exigibilité (L622-24 al. 6) ;
  - le critère est la date de la livraison ou de la prestation, pas celle de la facture.

**Constats pour le décompte et la déclaration**
- Les intérêts et majorations de retard s'arrêtent à la date du jugement (L622-28 al. 1). Exceptions : prêts d'un an ou plus, contrats à paiement différé d'un an ou plus.
- La déclaration porte le montant dû au jour du jugement, avec les sommes à échoir (L622-25).
- Elle se fait même sans titre, sur une évaluation si le montant n'est pas encore fixé (L622-24). Les justificatifs sont joints sous bordereau, en copie (R622-23).
- La déclaration est un acte de procédure (CNAJMJ). Sa production passe donc par `exigerPourActe()`.
- **Instance en cours** : elle est suspendue jusqu'à la déclaration, puis reprend seulement pour fixer le montant (L622-22). Une opposition à injonction de payer formée avant le jugement compte comme instance en cours (Cass. com., 1er juillet 2026, n° 25-15.354, formation restreinte, rejet).
- Les saisies s'arrêtent, sauf celles qui avaient déjà produit un effet attributif (L622-21 II).
- **Liquidation** : les créances sans privilège peuvent ne jamais être vérifiées (L641-4), et la procédure simplifiée ne vérifie que les créances qui viennent en rang utile (L644-3).
- **Portail électronique** : il est prévu par L814-2 et L814-13 et cité dans chaque annonce, mais sans URL. Aucune URL officielle n'a été trouvée. Ne jamais faire de lien vers creditors-services.com : l'ancien portail a fermé le 31/08/2021, et le domaine héberge aujourd'hui un blog sans rapport.

**Options, côte à côte**
- Déclarer soi-même, comme représentant légal, au mandataire judiciaire (sauvegarde, redressement) ou au liquidateur (liquidation) nommé dans l'annonce, avant la date affichée.
- Faire signer la déclaration par un salarié, en joignant le pouvoir donné par le représentant légal.
- Confier la déclaration à un mandataire de son choix (avocat, commissaire de justice), qui agit avec un pouvoir.
- L'envoyer en lettre recommandée avec AR à l'adresse de l'annonce, ou par le portail que cite l'annonce. La preuve de l'envoi et de son contenu est à la charge du créancier : un courriel dont on ne prouve pas le contenu ne suffit pas (Cass. com., 4 février 2026, n° 24-21.337, publié).
- Ne pas déclarer. Pas de part dans les répartitions, et une créance inopposable dans les conditions de L622-26. Si le client a lui-même signalé la créance au mandataire, il est présumé l'avoir fait pour le compte du créancier, tant que celui-ci n'a pas déclaré (L622-24 al. 3).
- Après la date limite : déposer au greffe une requête adressée au juge-commissaire pour être relevé de la forclusion, dans les 6 mois. Il faut établir que le retard n'est pas de son fait, ou qu'il vient d'une omission du débiteur sur sa liste. Le créancier relevé ne participe qu'aux répartitions postérieures à sa demande.
- Écrire au mandataire ou au liquidateur pour s'informer (liste des créances, vérification).
- Si une personne physique s'est portée caution :
  - en sauvegarde, les poursuites contre elle sont suspendues jusqu'au plan ou à la liquidation, mais une mesure conservatoire reste possible (L622-28 al. 2 et 3) ;
  - après un jugement de liquidation, les poursuites suspendues reprennent (R641-26) ;
  - en redressement, L631-14 renvoie à ces règles « sous réserve des dispositions qui suivent », qui n'ont pas été lues.
  - Choix possibles : agir quand la loi le permet, prendre une mesure conservatoire, ou attendre.
- Classer sans suite.

### 1.3 Il paie une partie, ou propose de payer en plusieurs fois

**Où** : à n'importe quelle étape. Le rapprochement bancaire fournit la date et le montant de chaque versement. Le gérant confirme la facture visée si le client l'a indiquée.

**À l'écran**
- **Versement reçu** :
  > Votre client a versé [1 200 €] le [date] ; il reste [2 950 €], intérêts compris. La date limite pour agir en justice reste le [date d'origine] : ce versement pourrait la repousser, mais seul un juge peut le dire.
- **Versement reçu après cette date limite** :
  > Ce versement est arrivé après la date limite pour agir en justice : il ne la repousse pas. Votre client ne peut pas le réclamer au seul motif que la date était passée.
- **Échéancier proposé** :
  > Votre client propose de payer en [4] fois. Rien ne vous oblige à accepter un paiement partiel, et ce qui se passe quand une échéance manque dépend de ce que dit l'accord écrit, pas de la loi.
- **Délais accordés par un juge** :
  > Le juge a donné à votre client jusqu'au [date] pour payer. D'ici là, les saisies sont suspendues et les majorations et pénalités prévues en cas de retard ne sont pas dues.

**Constats**
- **Imputation d'un versement** :
  - sur une dette qui porte intérêt, un paiement partiel va d'abord sur les intérêts (C. civ. 1343-1) ;
  - avec plusieurs dettes, le débiteur peut dire laquelle il paie. S'il ne dit rien, le versement va sur les dettes échues, puis sur celle qu'il avait « le plus d'intérêt d'acquitter », puis sur la plus ancienne, puis au prorata (1342-10) ;
  - comment ces deux règles s'articulent n'a pas été relevé. Le critère du « plus d'intérêt » n'est défini par aucun texte lu : l'écran le montre comme indéterminé au lieu de trancher.
- **Prescription** :
  - une reconnaissance par le débiteur interrompt le délai, qui repart pour la même durée (2240, 2231) ;
  - un paiement partiel « peut » valoir reconnaissance, pour toute la créance, s'il arrive avant l'expiration (Cass. 1re civ., 19 mai 2021, n° 19-26.253 ; 3e civ., 14 mai 2020, n° 19-16.210 ; tous deux inédits) ;
  - le seul arrêt publié juge chaque prélèvement d'un échéancier interruptif (1re civ., 25 janvier 2017, n° 15-25.759), mais il porte sur un crédit à la consommation ;
  - l'écran garde donc la date d'origine comme limite et n'affiche la date prolongée que comme possible, conformément à la règle du projet : le doute ne profite jamais au produit.
- **Preuve d'un engagement** : un engagement signé par le seul débiteur prouve la somme s'il porte sa signature et le montant « écrit par lui-même » en lettres et en chiffres. En cas de différence, les lettres l'emportent (1376).
- **Échéance manquée** : aucune règle générale lue ne rend le solde exigible. Le débiteur ne perd le bénéfice du terme que s'il ne fournit pas les sûretés promises ou les diminue (1305-4).
- **Médiation et conciliation** : elles suspendent la prescription au lieu de la remettre à zéro (2238). La procédure « petites créances » de L125-1 CPCE exclut, depuis le 25/04/2026, les créances facturées entre commerçants.
- **Client en conciliation** : il peut demander au juge des délais (1343-5) contre un créancier qui l'a mis en demeure ou poursuivi, ou qui a refusé la suspension demandée par le conciliateur. Dans ce dernier cas seulement, le juge peut aussi échelonner les créances non échues (L611-7).

**Délais**
- **Nouvelle prescription après une reconnaissance** : même durée que la précédente. Retenir le jour de la reconnaissance comme départ est une lecture de l'art. 2231, qui ne le nomme pas.
- **Médiation ou conciliation** :
  - la suspension part du jour où les parties conviennent d'y recourir, ou de la première réunion à défaut d'accord écrit ;
  - le délai reprend pour au moins 6 mois à compter de la déclaration de fin (2238).
- **Délais du juge** :
  - 2 ans au plus (1343-5) ;
  - à compter du jugement s'il est contradictoire, sinon de sa notification (CPC 511) ;
  - ils sont perdus si d'autres créanciers saisissent les biens du débiteur, ou s'il réduit lui-même ce qu'il avait donné par contrat pour assurer le paiement (CPC 512) ;
  - une mesure conservatoire reste possible pendant ce temps (CPC 513).
- **Intérêts sur intérêts** : seulement sur des intérêts dus pour au moins une année entière, et si le contrat ou une décision de justice le prévoit (1343-2).

**Options, côte à côte**
- Accepter le versement tel quel. Les deux règles d'imputation (1343-1, 1342-10) s'appliquent séparément.
- Refuser le versement partiel, ce que la loi permet même si la somme est divisible (1342-4).
- Convenir d'un échéancier écrit.
  - La loi ne prévoit pas ce qui se passe quand une échéance manque : c'est à l'accord de le dire.
  - Un accord conclu après la date limite n'interrompt rien ; il relève de la renonciation à la prescription (2250, 2251).
  - S'il abandonne une partie de la somme en échange de concessions réciproques, il peut constituer une transaction, qui ferme l'action sur ce qui a été abandonné (2044, 2052).
- Faire constater l'accord dans un titre qui permet la saisie sans nouveau jugement (L111-3 CPCE) : acte notarié revêtu de la formule exécutoire ; transaction contresignée par les avocats des deux parties puis revêtue de la formule exécutoire par le greffe ; procès-verbal de conciliation signé par le juge et les parties ; accord auquel un juge a donné force exécutoire.
- Convenir avec le client d'une médiation ou d'une conciliation. La prescription est suspendue à partir de cet accord.
- Convenir d'allonger ou de raccourcir le délai de prescription, entre 1 et 10 ans (2254). La loi n'exige pas d'écrit. Qu'un échéancier mensuel tombe sous l'exclusion de l'al. 3 n'a pas été tranché.
- Saisir le tribunal malgré les versements. Le juge peut alors accorder jusqu'à 2 ans de délais. Une demande en justice interrompt la prescription (2241) ; qu'une requête en injonction de payer en soit une n'a pas été relevé.
- Si un juge a accordé des délais : attendre les échéances. Une mesure conservatoire reste possible.
- Ne rien faire pour l'instant. La date limite affichée reste celle d'origine.

### 1.4 Introuvable, déménagé ou radié

**Où** : aux étapes « On lui écrit » et « Le tribunal », au moment de la remise des actes, et à tout moment par le registre. Le logiciel lit seul le RCS et le RNE (siège, forme juridique), le BODACC (transfert, dissolution, clôture, radiation) et Sirene. Il consulte ces sources lui-même : ce n'est pas une option proposée au gérant.

**À l'écran**
- **Introuvable** :
  > Le commissaire de justice n'a trouvé votre client ni à son siège ni ailleurs, et il a dressé un compte rendu officiel de ses recherches. L'acte compte quand même comme remis à cette date, mais votre client pourra le contester plus longtemps que prévu.
- **Adresse différente** :
  > L'adresse de votre client a changé dans nos sources. Pour un acte officiel, le commissaire de justice part du siège inscrit au registre du commerce (extrait Kbis) ; l'adresse de l'Insee n'a aucune valeur juridique.
- **Dissoute** :
  > L'entreprise de votre client a été dissoute : elle existe encore le temps de régler ses dettes. Son liquidateur, [nom lu au BODACC], la représente et peut payer les créanciers.
- **Radiée** :
  > L'entreprise de votre client a été radiée du registre du commerce. Pour la Cour de cassation, une société radiée continue d'exister pour une dette qui n'est pas réglée, mais la décision ne dit pas qui la représente.
- **Jugée en son absence** :
  > Le tribunal a jugé en l'absence de votre client. Ce jugement tombe s'il ne lui est pas remis officiellement avant le [date], 6 mois après sa date.

**Constats**
- **Compte rendu de recherches (« PV 659 »)** :
  - il s'applique à une société qui n'a plus d'établissement connu au siège inscrit au RCS (659 al. 4) ;
  - la signification prend la date de ce procès-verbal (664-1, « sous réserve de l'article 647-1 », qui n'a pas été lu) ;
  - dressé ailleurs qu'à la dernière adresse connue, il ne vaut pas notification (Cass. 2e civ., 2 juillet 2020, n° 19-14.893, publié) ;
  - il doit décrire précisément les recherches (2e civ., 12 septembre 2024, n° 22-15.572) ;
  - le dossier doit donc garder l'adresse utilisée et la preuve qu'elle était la dernière connue.
- **Personne ne veut recevoir l'acte**, mais le destinataire demeure bien à l'adresse : ce n'est pas un PV 659. La remise est faite « à domicile », et la copie reste 3 mois à l'étude (656).
- **Registres** : l'extrait Kbis a la valeur d'un acte authentique ; l'attestation RNE fait foi jusqu'à preuve du contraire (service-public, 04/06/2026).
- **Société dissoute** : pour une société commerciale, la personnalité subsiste jusqu'à la clôture (L237-2) ; pour une société civile, jusqu'à la publication de la clôture (1844-8).
- **Société radiée** : sa personnalité subsiste tant que ses dettes ne sont pas liquidées, malgré la radiation (Cass. com., 20 septembre 2023, n° 21-14.252, publié). La fiche justice.fr dit le contraire, et un juriste doit trancher.
- **Pénalités de retard** : elles restent exigibles sans rappel, même si le débiteur est injoignable (L441-10).

**Délais**
- **Copie du PV 659** : le commissaire de justice l'envoie en recommandé AR le jour même ou au plus tard le premier jour ouvrable suivant, sinon l'acte est nul (659).
- **Opposition** : prolongée d'un mois après le premier acte remis à la personne, ou la première saisie (1416 al. 2).
- **Signification de l'ordonnance** : 3 mois, ou 6 mois pour une ordonnance antérieure au 01/09/2026. Ces délais sont déjà au référentiel.
- **Jugement par défaut**, ou réputé contradictoire au seul motif qu'il est susceptible d'appel : il est non avenu s'il n'est pas notifié dans les 6 mois de sa date (478). La procédure peut reprendre en délivrant à nouveau la citation.
- **Liquidation amiable non close** 3 ans après la dissolution : tout intéressé peut saisir le tribunal (1844-8).
- **Assignation en liquidation judiciaire** :
  - 1 an à compter de la radiation qui suit la publication de la clôture (L640-5) ;
  - une radiation antérieure à la clôture ne fait pas courir ce délai (Cass. com., 12 juillet 2016, n° 14-19.694, publié) ;
  - le délai part de la mention de la radiation au RCS (Cass. com., 18 janvier 2023, n° 21-21.748, rendu sur L631-5 ; son extension à L640-5 reste ouverte).
- **Responsabilité du liquidateur** : 3 ans (L237-12, L225-254). Pour un créancier, ces 3 ans partent du jour où ses droits sont reconnus par une décision passée en force de chose jugée (Cass. com., 25 juin 2013, n° 12-19.173, publié), et non du jour de la faute.
- **Associés non liquidateurs** : 5 ans à compter de la publication de la dissolution (L237-13 pour une société commerciale ; 1859 pour une société civile).

**Options, côte à côte**
- Faire remettre l'acte par un commissaire de justice au siège inscrit au RCS. S'il n'y trouve personne et aucune autre adresse, il dresse un compte rendu de recherches.
- Laisser la créance en l'état. Les pénalités de retard restent dues sans rappel, et la date limite pour agir en justice continue de courir.
- Saisir le tribunal (assignation, requête en injonction de payer). Une demande en justice interrompt la prescription (2241) ; l'effet d'une requête en injonction de payer n'a pas été relevé.
- Société dissoute dont la liquidation est en cours : s'adresser au liquidateur, ou demander en justice, comme créancier de la société, que la liquidation suive les règles judiciaires (L237-14 II 3°).
- Liquidation non close 3 ans après la dissolution : saisir le tribunal pour qu'il la fasse faire ou achever.
- Société radiée avec une dette non réglée : demander la nomination d'un administrateur ad hoc pour la représenter, lorsque le liquidateur ne peut pas être mis en cause (Cass. com., 11 juillet 1988, n° 87-11.927, publié). Le tribunal compétent, la forme et le coût n'ont pas été relevés.
- Assigner en liquidation judiciaire dans l'année qui suit la radiation consécutive à la clôture. Deux conditions : aucune conciliation en cours, et une société en cessation des paiements dont le redressement est manifestement impossible (L640-5, L640-1).
- Rechercher la responsabilité du liquidateur pour une faute commise dans ses fonctions, dans les 3 ans qui suivent la décision définitive reconnaissant la créance.
- Poursuivre les associés, selon la forme de la société :
  - SNC : tous, solidairement, après une mise en demeure de la société restée sans effet, par acte extrajudiciaire (L221-1) ;
  - société civile : chacun à proportion de sa part du capital, après avoir poursuivi la société sans résultat (1857, 1858) ;
  - SARL et SAS : les associés ne supportent les pertes qu'à hauteur de leurs apports (L223-1, L227-1).
- Classer sans suite.
- Demander l'avis d'un avocat ou d'un commissaire de justice.

## 2. Paramètres à ajouter au référentiel

Format : `ParametreLegal`, unités du type `Unite`, et `valideParAvocat: false` partout. Seules les lignes « confirmé » peuvent porter `verifie: true`.

Déjà présents, à ne pas dupliquer : `delaiSignificationInjonction` (3 mois), `delaiSignificationInjonctionAncien` (6 mois), `basculeDelaiSignificationInjonction` (2026-09-01), `delaiPrescriptionCommerciale`, `indemniteForfaitaire`, `delaiContestationL126`, `delaiProcesVerbalNonContestation`.

À élargir : la note de `basculeDelaiSignificationInjonction` ne vise que l'art. 1411. Or la même date gouverne aussi 1415, 1418 et 1422. Il faut réutiliser cette entrée pour les quatre articles au lieu de créer une seconde date.

| Clé | Valeur | Unité | Point de départ | Article | URL | Extrait | Statut |
|---|---|---|---|---|---|---|---|
| `delaiOppositionInjonction` | 1 | mois | la signification de l'ordonnance, quelle qu'en soit la forme | CPC 1416 al. 1 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/ | « L'opposition est formée dans le mois qui suit la signification de l'ordonnance. » | confirmé |
| `delaiOppositionInjonctionProrogee` | 1 | mois | si la remise n'a pas été faite à la personne : le premier acte signifié à personne, à défaut la première mesure d'exécution rendant les biens indisponibles | CPC 1416 al. 2 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/ | « si la signification n'a pas été faite à personne, l'opposition est recevable jusqu'à l'expiration du délai d'un mois suivant le premier acte signifié à personne ou, à défaut, suivant la première mesure d'exécution » | confirmé |
| `augmentationDelaiOppositionOutreMer` / `augmentationDelaiOppositionEtranger` | 1 / 2 | mois | s'ajoute au délai d'opposition quand la juridiction siège en métropole | CPC 643, 645 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006135898/ | « les délais de comparution, d'appel, d'opposition, de tierce opposition dans l'hypothèse prévue à l'article 586 alinéa 3, de recours en révision et de pourvoi en cassation sont augmentés de » | confirmé ¹ ² |
| `delaiAvisOppositionGreffe` | 1 | mois | la réception de l'opposition par le greffe (ordonnances depuis le 01/09/2026, hors tribunal de commerce ; obligation du greffe, sans sanction) | CPC 1415 dernier al. | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/ | « Excepté devant le tribunal de commerce, le greffe avise le créancier ou son mandataire, par tout moyen conférant date certaine, de l'opposition formée par le débiteur, dans un délai d'un mois à compter de sa réception. » | confirmé |
| `delaiConsignationFraisOpposition` | 15 | jours | non précisé par le texte (invitation du greffier par lettre recommandée AR) | CPC 1425 al. 2 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006412584 | « Celui-ci invite sans délai le demandeur, par lettre recommandée avec demande d'avis de réception, à consigner les frais de l'opposition au greffe dans le délai de quinze jours à peine de caducité de la demande. » | confirmé ³ |
| `delaiConstitutionAvocatOpposition` | 15 | jours | la notification de la copie de l'opposition (jour de présentation si l'AR revient non signé) | CPC 1418 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/ | « Le créancier doit constituer avocat dans un délai de quinze jours à compter de la notification. » | confirmé |
| `delaiMotifLegitimeCaducite` | 15 | jours | non nommé par le texte (lecture : la déclaration de caducité) | CPC 468 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006410724 | « dans un délai de quinze jours » | confirmé ³ |
| `seuilDispenseAvocatTribunalCommerce` | 1 000 000 (10 000 €) | centimes | montant de la demande (apprécié selon CPC 35 à 37, non lus) | CPC 853 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006117253/ | « Les parties sont dispensées de l'obligation de constituer avocat dans les cas prévus par la loi ou le règlement, lorsque la demande porte sur un montant inférieur ou égal à 10 000 euros » | confirmé |
| `seuilDispenseAvocatTribunalJudiciaire` | 1 000 000 (10 000 €) | centimes | montant de la demande, hors compétence exclusive du tribunal judiciaire | CPC 761 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039726277 | « A l'exclusion des matières relevant de la compétence exclusive du tribunal judiciaire, lorsque la demande porte sur un montant inférieur ou égal à 10 000 euros » | confirmé |
| `attenteExecutionInjonction` | 2 | mois | la signification de l'ordonnance (ordonnances depuis le 01/09/2026) | CPC 1422 al. 2 et 3 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053497793 | « L'ordonnance ne constitue un titre exécutoire […] qu'à l'expiration des causes suspensives d'exécution prévues au premier alinéa et à l'expiration d'un délai de deux mois suivant la signification de l'ordonnance d'injonction de payer. » | confirmé ⁴ |
| `seuilDernierRessort` | non relevée | centimes | montant de la demande | CPC 1421 (renvoi au taux du dernier ressort) | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/ | aucun | non vérifiable |
| `delaiExecutionTitreExecutoire` | non relevée | annees | non relevé | non relevé (code des procédures civiles d'exécution) | aucune | aucun | non vérifiable |
| `delaiDeclarationCreance` | 2 | mois | la publication du jugement d'ouverture au BODACC | C. com. R622-24 (R641-25 en liquidation) | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000029175247 | « Le délai de déclaration fixé en application de l'article L. 622-26 est de deux mois à compter de la publication du jugement d'ouverture au Bulletin officiel des annonces civiles et commerciales. » | confirmé |
| `augmentationDelaiDeclarationHorsMetropole` | 2 | mois | s'ajoute au délai de déclaration pour un créancier qui ne demeure pas en métropole, tribunal en métropole (règle symétrique pour l'outre-mer) | C. com. R622-24 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000029175247 | même extrait que ci-dessus | confirmé ¹ |
| `delaiDeclarationSuretePubliee` | 2 | mois | la notification de l'avertissement personnel (sûreté ou contrat publiés) | C. com. L622-24 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038587553 | « Le délai de déclaration court à l'égard de ceux-ci à compter de la notification de cet avertissement. » | confirmé |
| `delaiReleveForclusion` | 6 | mois | la publication au BODACC (sûreté publiée : réception de l'avis ; exception : date où le créancier ne pouvait plus ignorer sa créance) | C. com. L622-26 al. 3 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044052612 | « L'action en relevé de forclusion ne peut être exercée que dans le délai de six mois. Ce délai court à compter de la publication du jugement d'ouverture » | confirmé |
| `reductionDelaiApresReleve` | 1/2 | sans | la notification de la décision de relevé | C. com. L622-24 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038587553 | « Lorsque le créancier a été relevé de forclusion conformément à l'article L. 622-26, les délais ne courent qu'à compter de la notification de cette décision ; ils sont alors réduits de moitié. » | confirmé ⁶ |
| `delaiDeclarationApresResiliation` | 1 | mois | la résiliation de plein droit, ou la notification de la décision qui la prononce | C. com. R622-21 al. 2 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006161533/ | « […] bénéficient d'un délai d'un mois à compter de la date de la résiliation de plein droit ou de la notification de la décision prononçant la résiliation pour déclarer au passif la créance résultant de cette résiliation » | confirmé |
| `delaiAnnulationPaiementInterdit` | 3 | annees | le paiement (pour un acte soumis à publicité : la publicité) | C. com. L622-7 III | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044052577 | « Tout acte ou tout paiement passé en violation des dispositions du présent article est annulé […] dans un délai de trois ans à compter de la conclusion de l'acte ou du paiement de la créance. » | confirmé |
| `dureeContratMaintienInterets` | 1 | annees | durée du prêt, ou du paiement différé, au-delà de laquelle les intérêts ne s'arrêtent pas | C. com. L622-28 al. 1 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042779 | « à moins qu'il ne s'agisse des intérêts résultant de contrats de prêt conclus pour une durée égale ou supérieure à un an » | confirmé |
| `delaiInformationCreancePosterieure` | 1 | annees | la fin de la période d'observation | C. com. L622-17 IV | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044052591 | (I) « Les créances nées régulièrement après le jugement d'ouverture pour les besoins du déroulement de la procédure ou de la période d'observation, ou en contrepartie d'une prestation fournie au débiteur pendant cette période, sont payées à leur échéance. » | confirmé ¹ |
| `delaiPublicationJugementOuverture` | 15 | jours | la date du jugement (obligation du greffe) | C. com. R621-8 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041563929 | « Le greffier procède d'office à ces publicités dans les quinze jours de la date du jugement. » | confirmé ⁵ |
| `delaiDeclarationCreancePosterieure` | non relevée | mois | l'exigibilité de la créance | C. com. L622-24 al. 6 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038587553 | « Les créances nées régulièrement après le jugement d'ouverture, autres que celles mentionnées au I de l'article L. 622-17 sont soumises aux dispositions du présent article. Les délais courent à compter de la date d'exigibilité de la créance. » | non vérifiable (durée) |
| `urlPortailDeclarationCreances` | non relevée | sans | sans objet | C. com. L814-2, L814-13 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033461854 | « Le conseil national met en place un portail électronique qui permet l'envoi et la réception des actes de procédure, des pièces, avis, avertissements ou convocations et des rapports par les administrateurs, les mandataires judiciaires » | non vérifiable |
| `delaiGraceMaximal` | 2 | annees | le jugement s'il est contradictoire, sinon sa notification (CPC 511) | C. civ. 1343-5 al. 1 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032035267 | « Le juge peut, compte tenu de la situation du débiteur et en considération des besoins du créancier, reporter ou échelonner, dans la limite de deux années, le paiement des sommes dues. » | confirmé |
| `dureeMinimaleRepriseApresMediation` | 6 | mois | la déclaration de fin de médiation ou de conciliation | C. civ. 2238 al. 2 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042671 | « Le délai de prescription recommence à courir, pour une durée qui ne peut être inférieure à six mois, à compter de la date à laquelle soit l'une des parties ou les deux, soit le médiateur ou le conciliateur déclarent […] » | confirmé |
| `dureeMinimalePrescriptionConventionnelle` / `dureeMaximalePrescriptionConventionnelle` | 1 / 10 | annees | l'accord des parties (le texte ne fixe pas de départ) | C. civ. 2254 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000019017063 | « La durée de la prescription peut être abrégée ou allongée par accord des parties. Elle ne peut toutefois être réduite à moins d'un an ni étendue à plus de dix ans. » | confirmé |
| `dureeCapitalisationInterets` | 1 | annees | non nommé par le texte | C. civ. 1343-2 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032035261 | « Les intérêts échus, dus au moins pour une année entière, produisent intérêt si le contrat l'a prévu ou si une décision de justice le précise. » | confirmé |
| `delaiEnvoiCopieProcesVerbalRecherches` | 1 | jours (ouvrables) | le jour du procès-verbal : le jour même ou, au plus tard, le premier jour ouvrable suivant | CPC 659 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006411032 | « Le même jour ou, au plus tard, le premier jour ouvrable suivant, à peine de nullité, l'huissier de justice envoie au destinataire, à la dernière adresse connue, par lettre recommandée avec demande d'avis de réception, une copie du procès-verbal » | confirmé ⁶ |
| `delaiNotificationJugementDefaut` | 6 | mois | la date du jugement | CPC 478 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006165203/ | « Le jugement rendu par défaut ou le jugement réputé contradictoire au seul motif qu'il est susceptible d'appel est non avenu s'il n'a pas été notifié dans les six mois de sa date. » | confirmé |
| `delaiSaisineTribunalLiquidationNonClose` | 3 | annees | la dissolution | C. civ. 1844-8 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006444186 | « Si la clôture de la liquidation n'est pas intervenue dans un délai de trois ans à compter de la dissolution, le ministère public ou tout intéressé peut saisir le tribunal […] » | confirmé |
| `delaiAssignationLiquidationApresRadiation` | 1 | annees | la radiation qui suit la publication de la clôture de la liquidation (date de sa mention au RCS, selon l'arrêt rendu sur L631-5) | C. com. L640-5 | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006133199/ | « La radiation du registre du commerce et des sociétés. S'il s'agit d'une personne morale, le délai court à compter de la radiation consécutive à la publication de la clôture des opérations de liquidation » | confirmé ¹ |
| `delaiActionResponsabiliteLiquidateur` | 3 | annees | pour un créancier : la décision passée en force de chose jugée qui reconnaît ses droits | C. com. L237-12, L225-254 ; Cass. com., 25/06/2013 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006226359 ; https://www.legifrance.gouv.fr/juri/id/JURITEXT000027632378 | « se prescrit par trois ans » ; « commence à courir le jour où les droits du créancier ont été reconnus par une décision de justice passée en force de chose jugée » | confirmé |
| `delaiActionAssociesNonLiquidateurs` | 5 | annees | la publication de la dissolution au RCS | C. com. L237-13 | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006230091 | « Toutes actions contre les associés non liquidateurs ou leur conjoint survivant, héritiers ou ayants cause, se prescrivent par cinq ans à compter de la publication de la dissolution de la société au registre du commerce et des sociétés. » | confirmé |
| `delaiActionAssociesSocieteCivile` | 5 | annees | la publication de la dissolution | C. civ. 1859 (poursuite préalable : 1858) | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000006150305/ | (1858) « Les créanciers ne peuvent poursuivre le paiement des dettes sociales contre un associé qu'après avoir préalablement et vainement poursuivi la personne morale. » | confirmé ¹ |
| `joursFeriesCalculDelais` | non relevée | sans | sans objet | CPC 642 (report au premier jour ouvrable) | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006135898/ | aucun | non vérifiable |

¹ Le chiffre a été lu dans l'article et confirmé par la contre-vérification, mais le relevé n'en garde pas la phrase exacte. Il faut la recopier dans `note` avant de poser `verifie: true`.
² Appliquer ce texte à l'opposition à injonction de payer est une lecture de l'art. 645, sans décision lue. C'est précisément ce que couvre `valideParAvocat`.
³ Le point de départ n'est pas précisé par le texte. L'écran calcule depuis l'événement le plus précoce connu et le dit.
⁴ Appliquer les art. 641 et 642 à une attente, et non à un délai pour agir, est une lecture prudente.
⁵ C'est l'article de la sauvegarde. Les renvois pour le redressement et la liquidation n'ont pas été lus.
⁶ Le type `Unite` n'a ni jour ouvrable ni fraction. Il faut l'étendre (par exemple `joursOuvrables`, `fraction`).

**Jurisprudence citée** (toutes confirmées) :
- Cass. 2e civ., 28/06/2012 : https://www.legifrance.gouv.fr/juri/id/JURITEXT000026094603/
- Cass. com., 01/07/2026 : https://www.courdecassation.fr/decision/6a44adefcdc6046d476b83b3
- Cass. com., 04/02/2026 : https://www.legifrance.gouv.fr/juri/id/JURITEXT000053452204
- Cass. com., 18/05/2022 : https://www.legifrance.gouv.fr/juri/id/JURITEXT000045822952
- Cass. 1re civ., 19/05/2021 : https://www.legifrance.gouv.fr/juri/id/JURITEXT000043565945
- Cass. 3e civ., 14/05/2020 : https://www.legifrance.gouv.fr/juri/id/JURITEXT000041914646
- Cass. 1re civ., 25/01/2017 : https://www.legifrance.gouv.fr/juri/id/JURITEXT000033943937/
- Cass. 2e civ., 02/07/2020 : https://www.legifrance.gouv.fr/juri/id/JURITEXT000042113128
- Cass. 2e civ., 12/09/2024 : https://www.legifrance.gouv.fr/juri/id/JURITEXT000050251096
- Cass. com., 20/09/2023 : https://www.legifrance.gouv.fr/juri/id/JURITEXT000048104616
- Cass. com., 11/07/1988 : https://www.legifrance.gouv.fr/juri/id/JURITEXT000007021008/
- Cass. com., 12/07/2016 : https://www.legifrance.gouv.fr/juri/id/JURITEXT000032902782
- Cass. com., 18/01/2023 : https://www.legifrance.gouv.fr/juri/id/JURITEXT000047023494
- Cass. com., 25/06/2013 : https://www.legifrance.gouv.fr/juri/id/JURITEXT000027632378

## 3. Adresse de réponse par dossier (recommandation technique, sans contre-vérification)

1. **Resend Inbound**, déjà utilisé pour l'envoi. On active la réception sur un sous-domaine dédié (par exemple `dossiers.letikette.com`) avec un seul MX, sans toucher au MX du domaine principal. Toutes les adresses du sous-domaine arrivent sur un même webhook (https://resend.com/docs/dashboard/receiving/custom-domains).
2. **Une route Convex distincte**, `/resend-inbound`, avec son propre abonnement `email.received` et son propre secret Svix. Le composant `@convex-dev/resend` 0.2.3 ignore `email.received`. La route vérifie la signature sur le corps brut, insère une ligne idempotente par `email_id`, répond 200, puis planifie une action (https://resend.com/docs/webhooks/verify-webhooks-requests).
3. **Le webhook ne porte que des métadonnées**, donc il ne bute pas sur la limite de 20 Mo des HTTP actions. Postmark, SendGrid et Mailgun mettent les pièces jointes dans le corps du POST et peuvent la dépasser. L'action lit le message par `fetch` direct, car le SDK 6.6.0 ne déclare ni `authentication` ni `raw`. Elle copie le `.eml` et les pièces jointes dans `ctx.storage` dans l'heure : les liens valent 1 h, et Resend ne garde les messages que 30 jours (https://docs.convex.dev/functions/http-actions ; https://resend.com/docs/dashboard/receiving/attachments).
4. **L'adresse porte un jeton aléatoire** d'au moins 128 bits, généré dans une action avec `crypto` : jamais l'`_id`, jamais `Math.random` dans une mutation. Il est écrit en base32 minuscule, pour une adresse sous 64 octets. Une table indexée mène du jeton à `{organizationId, creanceId}`, avec un statut qui permet de le révoquer. Un jeton inconnu ne rattache le message à aucune organisation (https://docs.convex.dev/functions/runtimes ; https://www.rfc-editor.org/rfc/rfc5321.txt).
5. **Chaque réponse affiche en constat** le résultat SPF, DKIM et DMARC calculé par Resend. Contreparties : stockage aux États-Unis, et taille maximale d'un e-mail entrant non documentée. Si la résidence dans l'UE devient une exigence, Mailgun en région UE est la seule option dont la documentation lue garde les messages dans la région (https://resend.com/docs/dashboard/domains/regions).

## 4. Questions restantes

**Injonction de payer**
- Art. 1425 : les 15 jours partent-ils de l'envoi ou de la réception de l'invitation du greffe ?
- Art. 468 : quel événement fait courir les 15 jours ?
- Les tribunaux des activités économiques relèvent-ils de l'exception « tribunal de commerce » des art. 1415 et 1425 ?
- Opposition faite à temps mais avis du greffe envoyé en retard : que devient une exécution lancée au bout de 2 mois ?
- Une saisie qui rouvre le délai d'opposition (1416 al. 2) : quel effet sur cette saisie ?
- Ordonnance non avenue, instance éteinte ou demande caduque : l'interruption de la prescription tient-elle ?
- Une requête en injonction de payer est-elle une « demande en justice » au sens de l'art. 2241 ?
- Montant du taux du dernier ressort (1421) ; délai pour exécuter un titre ; art. 35 à 37 et 400 à 405 : non relevés.
- Ordonnances antérieures au 01/03/2022 : l'ancien art. 1423 s'applique-t-il encore ?
- Art. 647-1 (réserve de l'art. 664-1) et art. 114 (nullité d'un PV 659 irrégulier) : non lus.

**Procédures collectives**
- URL, mode d'identification et tarif du portail actuel du CNAJMJ.
- Letikette peut-elle être « mandataire » pour déclarer ? Cela touche la ligne rouge n° 1 : avis de juriste nécessaire.
- Le délai de déclaration s'apprécie-t-il à l'envoi ou à la réception ?
- Ordonnance d'injonction de payer signifiée mais sans opposition au jour du jugement : quel sort ?
- L'indemnité de 40 € et les intérêts échus avant le jugement se déclarent-ils ?
- Durée propre du délai de déclaration d'une créance postérieure (L622-24 al. 6) ; art. L641-13 ; renvois de R621-8 pour le redressement et la liquidation ; Cass. com., 10/03/2021, n° 19-22.385 : non lus.

**Paiement partiel**
- Comment s'articulent les art. 1343-1 et 1342-10 ?
- Quel critère pour la dette que le débiteur avait « le plus d'intérêt d'acquitter » ?
- L'indemnité de 40 € compte-t-elle comme des « intérêts » pour l'imputation ?
- Un courriel qui demande des délais vaut-il reconnaissance de dette ?
- Un échéancier conclu après l'exigibilité reporte-t-il la prescription échéance par échéance (2233 3°) ?
- Les pénalités de L441-10 sont-elles suspendues pendant les délais du juge (1343-5 al. 4) ? Continuent-elles pendant un échéancier amiable ?
- Qui peut demander les délais de l'art. 1343-5 ?
- L'exclusion de l'art. 2254 al. 3 s'applique-t-elle à un échéancier mensuel ?
- Existe-t-il un arrêt publié sur un paiement partiel isolé, entre professionnels ?

**Introuvable ou radiée**
- justice.fr ou Cass. com. 20/09/2023 : quelle formulation afficher ? Un juriste doit trancher.
- Administrateur ad hoc : tribunal compétent, forme de la demande, coût.
- Un PV 659 dressé à l'ancien siège quand le transfert n'est pas publié est-il régulier ? Qu'un transfert de siège soit un fait à mentionner au registre (L123-9) n'est pas sourcé.
- Peut-on signifier à un établissement secondaire (690) ?
- L'arrêt du 18/01/2023 (rendu sur L631-5) vaut-il pour L640-5 ?
- Action contre les associés d'une SARL ou d'une SAS qui ont reçu le boni de liquidation ?
- Entrepreneurs individuels (radiation, décès) : non couverts.
- Liste des types d'annonces BODACC : non relevée.

**Adresse de réponse**
- Taille maximale d'un e-mail entrant chez Resend.
- Limite de taille de requête d'une HTTP action Convex : la documentation se contredit.
- Région du déploiement Convex de production.
- DPA et clauses contractuelles types de Resend (RGPD).
- MX existants de letikette.com, et nom du sous-domaine.
- Une adresse @letikette.com visible par le débiteur pose-t-elle problème au regard de la ligne rouge n° 1 ?
- Envoyer une copie de chaque réponse au client ?
- Extraire la réponse sans la citation ?
- `crypto.getRandomValues` est-il « seedé » dans une mutation ?

**Transverse**
- Liste des jours fériés pour l'art. 642.
- Aucune valeur n'est validée par un avocat.