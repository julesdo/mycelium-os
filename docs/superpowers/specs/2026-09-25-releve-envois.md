# Note de décision : l'app envoie les courriers, et le client valide chaque document avant

25 septembre 2026. Destinataires : Jules, et le design de la page « dossier » (le stepper de procédure).

Cette note n'est pas un avis juridique. Aucun texte et aucune décision ne traite exactement notre cas. L'analyse est construite à partir des textes et d'un seul précédent, l'affaire Demanderjustice. Il faut la faire relire par un avocat avant la mise en production.

J'ai relu chaque citation sur sa source aujourd'hui. Les numéros [n] renvoient à l'annexe, qui donne le lien et l'extrait.

---

## 1. La réponse en trois lignes

1. **Oui, l'app peut faire partir le courrier, à une condition : il doit rester juridiquement celui du client.** Il porte son seul nom et sa signature. Le client le valide document par document. Le nom et le logo de Letikette n'y figurent pas. Les réponses et les paiements vont chez lui [10][12].
2. **Non à « Letikette agit au nom du client ».** Réclamer en tant que son mandataire, c'est faire du recouvrement pour compte d'autrui. Il faudrait alors une déclaration au procureur, une assurance, un compte dédié, et chaque lettre devrait nommer Letikette [1][2][3]. C'est aussi ce qui a sauvé Demanderjustice : sa transmission n'était « pas accomplie au nom du mandant » [11].
3. **Le point dur est la rédaction, pas l'envoi.** Le précédent ne couvre que des modèles que l'utilisateur remplit lui-même [12]. Il faut des gabarits fixes, relus par un avocat, dans lesquels l'agent ne met que des faits et des calculs. Si le client a un avocat, tout part chez cet avocat sous forme de proposition, et c'est lui qui décide.

**Vocabulaire, partout (interface, CGU, landing).** On écrit « vous envoyez, avec Letikette », jamais « Letikette envoie en votre nom ». « Au nom de » s'applique au document, jamais à Letikette.

**Calendrier.** La décision du 21/09 (« pas d'avocat pour l'instant ») ne tient plus pour les gabarits. Qu'un éditeur relise et documente ne rend pas « matérielle » une lettre que l'IA remplit.

---

## 2. Ce qui fait basculer du mauvais côté

### A. Le recouvrement pour le compte d'autrui (code des procédures civiles d'exécution)

**Le déclencheur est large.** Il suffit de recouvrer à l'amiable « pour le compte d'autrui », même de façon occasionnelle, même à titre accessoire [1].
- Ni l'encaissement ni la commission ne sont nécessaires.
- Les lettres au débiteur sont le cœur du métier réglementé, pas seulement l'argent [5].
- Un abonnement n'en protège pas. Dans l'arrêt du 5 février 2026, la société de recouvrement travaillait sous « contrat d'abonnement » [6].

**Si on y entre, voici ce qu'il faut :**
- une assurance, un compte réservé aux fonds et une déclaration écrite au procureur, faite AVANT de commencer [2] ;
- chaque lettre nomme le recouvreur et indique qu'il fait du recouvrement amiable [3] ;
- à défaut, c'est une contravention de 5e classe [4].

Un envoi « au seul nom du client » devient alors impossible. La DGCCRF distingue la gestion interne du créancier et le recours à un tiers mandaté [7]. Letikette doit rester l'outil de la gestion interne.

**On bascule si** (ce sont des déductions, à valider) :
- un courrier part sans validation de CE document, par exemple avec une règle « relancer automatiquement à J+30 » ;
- Letikette encaisse, héberge un lien de paiement ou prend un pourcentage du recouvré ;
- les réponses du débiteur arrivent chez Letikette, ou Letikette discute un échéancier ;
- le nom, le logo ou l'adresse de Letikette apparaissent sur le courrier, y compris dans un e-mail parti de letikette.com.

### B. Le monopole des avocats (loi n° 71-1130 du 31 décembre 1971)

**Deux interdits :**
- donner des consultations ou rédiger des actes pour autrui « à titre habituel et rémunéré » (art. 54) [8]. Un abonnement remplit les deux critères ;
- représenter une partie devant une juridiction (art. 4) [9].

**Ce que l'affaire Demanderjustice a protégé :**
- des modèles que l'utilisateur choisit et remplit lui-même [12] ;
- une transmission « purement matérielle », faite à son « seul nom » et sous sa « seule signature », sans le nom ni le logo de la plateforme [10] ;
- une signature électronique du requérant avant l'envoi [12].

L'arrêt pénal n'est pas publié au Bulletin et ne juge que la représentation (art. 4), pas l'art. 54.

**Ce qu'elle ne couvre pas.** La cour d'appel écarte le grief de rédaction d'acte parce que la mise en demeure « n'est pas remplie » par la société [12]. Une IA qui remplit la lettre sort de ce cadre. Aucune décision n'a jugé si la validation du client suffit à corriger cela.

**Ce qui pèse contre nous :**
- vérifier le bien-fondé de sommes réclamées au regard de la réglementation est déjà une prestation juridique. L'arrêt de 2010 portait sur des cotisations sociales [13] ;
- le Gouvernement estime que les plateformes « ne sont donc pas autorisées » à donner des consultations, et qu'un intitulé comme « aide » ou « information » ne protège pas [14].

**On bascule si :**
- l'agent choisit le fondement juridique ou rédige librement des motifs ;
- l'app recommande une étape, par exemple « vous devriez déposer une requête » (c'est la ligne rouge n° 3) ;
- l'app répond à des questions de droit ;
- Letikette dépose comme mandataire habituel, ou suit l'opposition.

**Deux risques valent pour tout le produit :**
- la fonction « qualification » (« remplit les conditions X, Y, Z », délai de prescription choisi selon le secteur) peut être lue comme une consultation [13][14] ;
- aucun courrier ne doit ressembler à un acte de commissaire de justice : c'est puni d'un an de prison et de 15 000 € d'amende [15].

---

## 3. Destinataire par destinataire

### Le débiteur : la mise en demeure

**Canal par défaut : le recommandé papier « hybride ».** Le prestataire imprime et La Poste distribue.
- Rien n'est demandé au débiteur.
- Une lettre recommandée non réclamée reste une mise en demeure valable. L'arrêt de 2021 qui le dit a été rendu sous l'ancien code civil [19].
- Les simples relances peuvent continuer à partir de la messagerie du client, avec le bouton « Ouvrir dans ma messagerie » qui existe déjà.

**Prestataire : Maileva (groupe La Poste).**
- Dans son API, l'envoi est créé en brouillon et ne part qu'après un appel « submit ». Cela correspond exactement au bouton « Valider et envoyer » [20].
- Piège : l'adresse de l'expéditeur n'est pas imprimée par défaut. Il faut l'activer, sinon le débiteur ne sait pas qui lui écrit.

**Second canal : la lettre recommandée électronique qualifiée (AR24, groupe Docaposte).** On l'utilise quand l'e-mail du débiteur est connu.
- Elle vaut lettre recommandée si le service est qualifié. Un débiteur professionnel n'a pas à donner son accord préalable [16].
- En revanche, il doit prouver son identité pour l'ouvrir [17].
- Il ne sait pas qui lui écrit avant d'accepter, et il dispose de 15 jours pour le faire [18].
- Je n'ai trouvé aucune décision sur une mise en demeure électronique refusée.

**Ce que le client fournit une fois :**
- l'identité de l'entreprise et du signataire, et l'adresse d'expéditeur ;
- pour l'électronique, un identifiant par représentant. Selon la documentation des prestataires, la clé arrive par courrier, puis un code est demandé à chaque envoi [21]. Ce code peut devenir le geste de validation.

**Ce qui revient dans le dossier :**
- en papier : la preuve de dépôt, la preuve de contenu, la date de première présentation, puis l'avis de réception numérique ou le pli non distribué [20] ;
- en électronique : le dépôt, puis l'acceptation, le refus ou la « négligence » au bout de 15 jours [21].

Il faut archiver chaque preuve chez nous dès qu'elle arrive : elle doit rester disponible aussi longtemps que la créance.

### Le greffe : la requête en injonction de payer

**La règle.** La requête est « remise ou adressée [...] par le créancier ou par tout mandataire » [22], sans qu'il faille prouver un mandat de représentation [23]. Mais le greffe du tribunal de commerce demande « le pouvoir du mandataire » quand celui-ci n'est pas avocat [24]. D'où la règle pour nous : **la requête est signée par le client et part comme son courrier. Jamais de pouvoir au nom de Letikette.**

**Au tribunal de commerce** (créances entre commerçants [25]), trois voies :
- **Le papier.** Le client signe, et la requête part par le même recommandé hybride que la mise en demeure. Aucun identifiant n'est nécessaire.
- **Le Tribunal Digital.** On y accède avec l'identité numérique MonIdenum [26]. Le dirigeant peut désigner une personne physique, qui agit avec ses propres identifiants [27]. Il faut donc une personne dans la boucle : pas d'API pour un dépôt à l'unité.
- **L'API Infogreffe de dépôt en masse** (mai 2026). Elle vise notamment « les professionnels du recouvrement » [28], et ses conditions d'accès ne sont pas publiées. S'y inscrire à ce titre contredirait tout ce qui précède.

**Au tribunal judiciaire** (débiteur non commerçant), le créancier ne peut rien déposer en ligne : la requête est « envoyée ou déposée au greffe » [30]. Les canaux électroniques sont réservés au commissaire de justice et à l'avocat [31].

**Ce que le client fournit :**
- sa signature. Il faut faire confirmer par les greffes qu'une signature électronique est acceptée ;
- le paiement des frais. Devant le tribunal de commerce, ils doivent être consignés dans les 15 jours, sinon la demande est caduque [29]. Service Public indique 33,47 € [30] ; il faut relever le tarif officiel avant de le saisir dans `parametres.ts`. Le client paie lui-même, Letikette n'avance rien.

**Ce qui revient :** l'ordonnance. Elle est notifiée par voie électronique sur le Tribunal Digital [26], et par courrier au client dans les autres cas.

**Ce qui sort de l'app : l'opposition du débiteur.**
- Au tribunal judiciaire, le créancier doit en principe prendre un avocat dans les 15 jours [32].
- Au tribunal de commerce, l'avocat est obligatoire au-delà de 10 000 €. En dessous, un représentant non avocat doit justifier d'un « pouvoir spécial » [33].

Cette étape passe donc à l'avocat, ou au client lui-même.

### Le commissaire de justice : la signification

- **Lui seul peut signifier** [34], et c'est au créancier de le lui demander [35].
- **Le délai.** Pour les ordonnances rendues depuis le 1er septembre 2026, il reste trois mois pour signifier, sinon l'ordonnance tombe [35].
- **Le canal.** Un courrier ou un e-mail à une étude située dans le ressort de la cour d'appel du domicile du débiteur [36]. Le client la choisit dans l'annuaire officiel.
- **Les plateformes à API ne sont pas retenues** (iSignif, justice.cool). La première semble réservée aux avocats, la seconde met en avant la redistribution des fonds. Ce point vient d'un relevé vérifié une seconde fois, mais je ne l'ai pas relu aujourd'hui.
- **Ce que le client fournit :** le choix de l'étude et l'ordonnance. Il paie l'étude directement.
- **Ce qui revient :** l'acte de signification. Ensuite, si aucun avis d'opposition n'arrive dans les deux mois qui suivent la signification, l'exécution forcée est possible [37]. Le stepper peut décompter ces deux mois.

### L'avocat du client : des propositions, jamais d'envoi par-dessus lui

**Dès qu'un avocat est désigné sur une créance, chaque étape change de destinataire.**
- L'avocat est « le mandataire naturel » de son client, et il répond des actes qu'il rédige [38].
- Le projet (courrier, requête, décompte, bordereau, pièces) part donc chez lui.
- Il le modifie, le signe, le dépose avec ses propres accès [31] et mandate lui-même le commissaire de justice.
- L'app n'envoie au greffe ou au commissaire que s'il le demande. C'est un choix de conception prudent, pas une obligation écrite.

**Le canal :** un e-mail tracé ou un espace partagé. Je n'ai trouvé aucune forme d'envoi imposée.

**Ce qu'il faut pour qu'un avocat accepte de travailler ainsi :**
- **Le secret.** Il couvre tous les supports, y compris électroniques, et même le nom des clients [39]. L'app n'affiche donc jamais quel avocat travaille pour quel client.
- **Le contact direct.** L'avocat doit toujours pouvoir joindre son client directement [40]. L'app affiche leurs coordonnées directes.
- **Les lettres entre avocats.** Elles ne peuvent jamais être produites en justice, sauf si elles portent la mention « officielle » [39]. L'app les marque et ne les joint jamais à un bordereau.
- **Aucun argent lié à l'avocat.** Il n'est payé que par son client, il ne partage pas ses honoraires avec un non-avocat, et la rémunération d'un apport d'affaires est interdite [41][38]. Si un jour les avocats listés paient quelque chose, ce ne peut être qu'une participation forfaitaire aux frais de la plateforme, sans lien avec leurs honoraires [40].

**L'annuaire.** Il reste neutre et laisse le client choisir librement. Il porte la mention « Letikette n'est pas un cabinet d'avocats et se borne à mettre en relation ». La Cour de cassation a accepté cette présentation pour un site qui ne rédigeait rien [42]. Nous rédigeons des projets : le même raisonnement ne s'applique pas forcément à nous.

**La limite de ce canal.** Il ne protège que si l'avocat est vraiment l'auteur et celui qui décide. Selon le Conseil national des barreaux (qui est partie à ces contentieux), passer par un avocat ne régularise pas un gabarit rédigé en amont par quelqu'un qui n'est pas avocat.

### Ce que cela donne dans le stepper de la page « dossier »

**Une étape = un document.** Chaque document passe par les mêmes états :
1. **Projet** : préparé par l'agent, avec le nom et la version du gabarit.
2. **À valider** : l'aperçu exact de ce qui partira, avec le destinataire, le canal et le coût.
3. **Validé** : qui a validé, quand, et comment (signature ou code). Le document est alors figé.
4. **Parti** : la preuve de dépôt.
5. **Suivi** : présenté, reçu, non réclamé, refusé, ordonnance rendue, signifié.
6. **Délai en cours** : 15 jours pour consigner, 3 mois pour signifier, 2 mois pour l'opposition.

- **Quand un avocat est désigné**, les états deviennent : « Proposition envoyée », puis « Reprise par l'avocat », puis « Pièce versée par l'avocat ».
- **Les étapes qui se passent hors de l'app** (opposition, audience) restent affichées, avec la mention « chez votre avocat » ou « à vous ».
- **Le stepper montre ce qui est possible** et les conditions remplies. Il ne désigne jamais une « prochaine étape recommandée » (ligne rouge n° 3).

---

## 4. Réécritures proposées

**Ligne rouge n° 1 du CLAUDE.md**, qui remplace « On ne relance jamais le débiteur au nom du client » :

> **Rien ne part sans que le client ait validé CE document.** Le document est à son seul nom et sous sa signature ; Letikette l'expédie sans y figurer, sans être son mandataire et sans recevoir ni fonds ni réponse du débiteur, et quand le client a un avocat, le projet part chez cet avocat, qui décide.

**Landing, section « Limites », première clause** (`src/marketing/limites.tsx`) :

> **On n'envoie jamais rien sans votre accord.**
> Chaque courrier est à votre nom, sous votre signature, et ne part qu'après votre validation ; les réponses et les paiements vous arrivent directement. Si vous avez un avocat, le projet part chez lui, et c'est lui qui décide.

**Trois remarques :**
- La phrase « Aucune des trois ne changera » reste vraie : la clause change de forme, pas de nature.
- La troisième clause (« Le logiciel énonce des constats ») est exposée au risque décrit au point 2.B : un intitulé ne protège pas [14]. Il ne faut la garder que si les constats restent des calculs sur des règles publiques.
- Le commentaire en tête de `limites.tsx` décrit encore les lignes rouges d'EGalim (denrées, transport).

---

## 5. Ce qui reste ouvert

**À faire confirmer par un avocat :**
1. Un logiciel qui expédie, sur ordre exprès du créancier, un courrier validé par lui et à son nom, fait-il du « recouvrement pour le compte d'autrui » [1] ? Aucune source ne tranche la question.
2. Quand l'agent remplit une mise en demeure ou une requête à partir des pièces du client, est-ce « rédiger des actes pour autrui » [8], malgré la validation ? Et une mise en demeure est-elle un « acte sous seing privé » ?
3. La « qualification des créances » (constats, prescription selon le secteur) est-elle une consultation [13][14] ? Faut-il la réserver au canal avocat ?
4. Les gabarits : qui les relit, sous quelle forme, et que devient le champ `valideParAvocat` ?
5. Les greffes acceptent-ils une requête papier signée électroniquement ?
6. Une mise en demeure électronique refusée ou non réclamée est-elle valable ? Et un message qui prévient le débiteur en nommant l'expéditeur est-il compatible avec l'anonymat prévu par le texte [18] ?
7. Faut-il remettre une convention au Bâtonnier quand c'est le client qui invite son propre avocat ?

**À demander aux prestataires, pas à un avocat :**
- Infogreffe : qui peut souscrire à l'API de dépôt, et peut-on déposer pour plusieurs créanciers [28] ?
- Maileva : que voit le débiteur (enveloppe, preuve de dépôt) ? Faut-il un contrat unique pour tous nos clients, ou un contrat par client ?

---

## Annexe : sources relues le 25/09/2026

Pour les extraits, les textes de loi et les décisions ont été lus sur leur page source. Les documentations des prestataires sont résumées, pas citées.

1. CPCE, art. R124-1 (en vigueur depuis le 01/06/2012). https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000025938362 : « d'une manière habituelle ou occasionnelle, même à titre accessoire, procèdent au recouvrement amiable des créances pour le compte d'autrui »
2. CPCE, art. R124-2 (en vigueur depuis le 01/01/2020). https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000025024948/LEGISCTA000025938360/ : « déclaration écrite des intéressés, remise ou adressée, avant tout exercice de l'activité, au procureur de la République »
3. CPCE, art. R124-4 (en vigueur depuis le 02/02/2013). https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000027015026 : « Les nom ou dénomination sociale de la personne chargée du recouvrement amiable, son adresse ou son siège social, l'indication qu'elle exerce une activité de recouvrement amiable »
4. CPCE, art. R124-7. Même URL que [2] : « Est puni de l'amende prévue par le 5° de l'article 131-13 du code pénal pour les contraventions de la cinquième classe »
5. Question écrite n° 21119, réponse publiée au JO AN le 15/09/2003. https://www.assemblee-nationale.fr/dyn/12/questions/QANR5L12QE21119.pdf : « réglemente le mandat de recouvrement ainsi que les démarches, essentiellement épistolaires, accomplies auprès du débiteur pour obtenir le paiement volontaire »
6. Cass. 2e civ., 5 février 2026, n° 23-22.049 (F-B, rejet). https://www.courdecassation.fr/decision/69843d22cdc6046d47fb461c : « De telles dispositions n'exigent pas que le contrat soit établi sous la forme d'un acte écrit unique » ; « liée à la société Carec Ain Jura par un contrat d'abonnement »
7. DGCCRF, fiche du 24/10/2025. https://www.economie.gouv.fr/dgccrf/les-fiches-pratiques/recouvrement-amiable-de-creances-les-regles-connaitre : « le créancier peut choisir la gestion interne du recouvrement [...] ou alors mandater un tiers pour le faire (société de recouvrement ou commissaire de justice) »
8. Loi n° 71-1130, art. 54 (en vigueur depuis le 01/01/2020). https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000039280601 : « Nul ne peut, directement ou par personne interposée, à titre habituel et rémunéré, donner des consultations juridiques ou rédiger des actes sous seing privé, pour autrui »
9. Loi n° 71-1130, art. 4 (en vigueur depuis le 01/01/2012). https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000026220972 : « Nul ne peut, s'il n'est avocat, assister ou représenter les parties, postuler et plaider devant les juridictions »
10. Cass. crim., 21 mars 2017, n° 16-82.437. https://www.legifrance.gouv.fr/juri/id/JURITEXT000034282986/ : « son rôle est purement matériel » ; « qu'elles sont à leur seul nom et comportent leur seule signature » ; « le nom de cette société n'apparaît nulle part dans ce document, ni même d'ailleurs, son logo »
11. TGI Paris, 11 janvier 2017 (texte publié sur Legalis). https://www.legalis.net/jurisprudences/tribunal-de-grande-instance-de-paris-jugement-du-11-janvier-2017/ : « une prestation purement matérielle qui n'est pas accomplie au nom du mandant par une personne désignée par celui-ci pour le représenter »
12. CA Paris, pôle 2 ch. 1, 6 novembre 2018, n° 17/04957 (texte publié sur Legalis). https://www.legalis.net/jurisprudences/cour-dappel-de-paris-pole-2-ch-1-arret-du-6-novembre-2018/ : « la lettre de mise en demeure n'est pas remplie par la société Demander Justice » ; « c'est l'internaute-justiciable qui fait seul ce travail en choisissant parmi les modèles proposés » ; « la déclaration de saisine, signée électroniquement au préalable par le requérant »
13. Cass. 1re civ., 15 novembre 2010, n° 09-66.319 (Bulletin I n° 230). https://www.legifrance.gouv.fr/juri/id/JURITEXT000023113684/ : « la vérification, au regard de la réglementation en vigueur, du bien-fondé des cotisations réclamées [...] constitue elle-même une prestation à caractère juridique »
14. Question écrite n° 3177, réponse publiée au JO AN le 08/04/2025. https://www.assemblee-nationale.fr/dyn/17/questions/QANR5L17QE3177.pdf : « Les plateformes en ligne ne sont donc pas autorisées à délivrer des consultations juridiques aux internautes. » ; « intitulés ambigus comme aide, information ou assistance juridique »
15. Code pénal, art. 433-13 (en vigueur depuis le 01/01/2002). https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006418574 : « un an d'emprisonnement et de 15 000 euros d'amende » ; « une ressemblance de nature à provoquer une méprise dans l'esprit du public »
16. CPCE (postes), art. L100 (en vigueur depuis le 09/10/2016). https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033207397/ : « équivalent à l'envoi par lettre recommandée, dès lors qu'il satisfait aux exigences de l'article 44 du règlement (UE) n° 910/2014 » ; « Dans le cas où le destinataire n'est pas un professionnel »
17. CPCE (postes), art. R53-1 (en vigueur depuis le 01/01/2019). https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036899764 : « La vérification initiale de l'identité du destinataire doit être assurée au minimum dans les conditions prévues » (niveau « substantiel »)
18. CPCE (postes), art. R53-3 (en vigueur depuis le 01/01/2019). https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036899789 : « pendant un délai de quinze jours [...] d'accepter ou non sa réception » ; « Le destinataire n'est pas informé de l'identité de l'expéditeur de la lettre recommandée électronique. »
19. Cass. 1re civ., 20 janvier 2021, n° 19-20.680 (publié). https://www.legifrance.gouv.fr/juri/id/JURITEXT000043087384 : « le défaut de réception effective par le débiteur de la mise en demeure, adressée par lettre recommandée, n'affecte pas sa validité »
20. Maileva, spécification de l'API registered_mail v4.10 (documentation du prestataire, résumée). https://www.maileva.com/app/uploads/2023/09/api-registered_mail-v4-10.yaml. L'envoi est en brouillon (DRAFT) jusqu'à l'appel /sendings/{id}/submit ; un statut « avis de réception numérique disponible » existe ; print_sender_address vaut false par défaut.
21. AR24, documentation de l'API (documentation du prestataire, résumée). https://developers.ar24.fr/doc/. Sans authentification de l'expéditeur, la lettre passe en brouillon « to_valid » ; des événements existent pour le dépôt, l'acceptation, le refus et la négligence.
22. CPC, art. 1407. https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/ : « La demande est formée par requête remise ou adressée, selon le cas, au greffe par le créancier ou par tout mandataire. »
23. Cass. 2e civ., 27 juin 2002, n° 98-17.028 (Bulletin II n° 147). https://www.legifrance.gouv.fr/juri/id/JURITEXT000007045124 : « le dépôt d'une requête en injonction de payer n'exige pas, à défaut d'introduction de l'instance, la preuve d'un mandat de représentation en justice »
24. Infogreffe, guide des formalités. https://www.infogreffe.fr/guide-des-formalites/fond--referes--requetes/injonction-de-payer/demande-en-injonction-de-payer : « du pouvoir du mandataire, sauf si celui-ci est avocat ou huissier de justice »
25. Code de commerce, art. L721-3 (en vigueur depuis le 01/01/2022). https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044078679 : « Des contestations relatives aux engagements entre commerçants »
26. Tribunal Digital, CGU (résumées). https://www.tribunaldigital.fr/informations-utiles/cgu/. L'accès passe par l'identité numérique MonIdenum ; l'utilisateur accepte d'être notifié par voie électronique.
27. MonIdenum, FAQ sur le mandat « personne morale » (résumée). https://support.monidenum.fr/hc/fr/articles/15958232874012. Le dirigeant mandate une personne qui agit à titre personnel pour représenter la société.
28. Infogreffe, annonce de l'API de dépôt en masse, publiée le 20/05/2026. https://www.infogreffe.fr/actualites/infogreffe-lance-une-api-de-depot-en-masse-des-injonctions-de-payer. Elle vise notamment « les professionnels du recouvrement ».
29. CPC, art. 1425 (en vigueur depuis le 20/12/2008). https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006135968/ : « consignés au greffe au plus tard dans les quinze jours de la demande, faute de quoi celle-ci sera caduque »
30. Service Public Entreprendre, fiche F38156 (vérifiée le 01/09/2026). https://entreprendre.service-public.gouv.fr/vosdroits/F38156 : « la demande en injonction de payer doit être envoyée ou déposée au greffe du tribunal ». Frais de greffe au tribunal de commerce affichés : 33,47 €.
31. Arrêté du 29 août 2025, annexe. https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000052157777. IPNET : « Entre le commissaire de justice et le tribunal judiciaire ou le juge des contentieux de la protection. » e-Barreau : « Entre les avocats ou entre les avocats et la juridiction. »
32. CPC, art. 1418. Même URL que [22] : « Le créancier doit constituer avocat dans un délai de quinze jours à compter de la notification. »
33. CPC, art. 853 (en vigueur depuis le 01/11/2021). https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044200291 : « lorsque la demande porte sur un montant inférieur ou égal à 10 000 euros » ; « Le représentant, s'il n'est avocat, doit justifier d'un pouvoir spécial. »
34. Ordonnance n° 2016-728, art. 1er (en vigueur depuis le 25/04/2026). https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000048447300 : « ont seuls qualité [...] pour : [...] 3° Signifier les actes et les exploits »
35. CPC, art. 1411. Même URL que [22] : « signifiée, à l'initiative du créancier, à chacun des débiteurs » ; « trois mois de sa date » ; « applicables aux ordonnances rendues à compter du 1er septembre 2026 »
36. Chambre nationale des commissaires de justice (résumé). https://commissaire-justice.fr/faire-executer-une-decision-de-justice/. On contacte une étude située dans le ressort de la cour d'appel du domicile de la partie adverse.
37. CPC, art. 1422. Même URL que [22] : « le créancier peut en poursuivre l'exécution forcée » (faute d'avis d'opposition dans les deux mois qui suivent la signification).
38. Décret n° 2023-552, art. 8, 9 et 10. https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000047774060 : « L'avocat est le mandataire naturel de son client » ; « L'avocat rédacteur d'un acte juridique assure la validité et la pleine efficacité de l'acte » ; « La rémunération d'apports d'affaires est interdite. »
39. RIN (CNB), art. 2.2 et 3.1. https://www.cnb.avocat.fr/rin/titre-premier-des-principes : « quels qu'en soient les supports, matériels ou immatériels (papier, télécopie, voie électronique …) » ; « le nom des clients » ; « Les correspondances entre avocats, quel qu'en soit le support, ne peuvent en aucun cas être produites en justice »
40. RIN (CNB), art. 19.3 et 19.4.2. https://www.cnb.avocat.fr/rin/titre-cinquieme-prestations-juridiques-en-ligne : « doit toujours être en mesure d'entrer personnellement et directement en relation avec l'internaute » ; « participer de façon forfaitaire aux frais de fonctionnement [...] à l'exclusion de toute rémunération établie en fonction des honoraires »
41. RIN (CNB), art. 11.3 et 11.4. https://www.cnb.avocat.fr/rin/titre-deuxieme-des-activites : « L'avocat ne peut percevoir d'honoraires que de son client ou d'un mandataire de celui-ci. » ; « Il est interdit à l'avocat de partager un honoraire quelle qu'en soit la forme avec des personnes physiques ou morales qui ne sont pas avocats. »
42. Cass. 1re civ., 8 février 2023, n° 21-22.828 (non publié au Bulletin). https://www.legifrance.gouv.fr/juri/id/JURITEXT000047128397 : « se bornait à proposer une mise en relation avec un avocat partenaire sans assurer de consultation » ; « ne représentait pas un cabinet d'avocat »