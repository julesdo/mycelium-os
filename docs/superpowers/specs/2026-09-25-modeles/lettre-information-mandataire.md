# Demande d'information au mandataire judiciaire ou au liquidateur, sans déclaration

**Destinataire** : Le mandataire judiciaire (sauvegarde, redressement judiciaire) ou le liquidateur (liquidation judiciaire) nommé dans l'annonce BODACC. Si le client a un avocat sur cette créance, le projet part chez l'avocat.  
**Canal** : Lettre simple (envoi hybride) ou courriel depuis la messagerie du client (« Ouvrir dans ma messagerie »), au seul nom du client. Aucun recommandé n'est requis : aucun texte lu n'attache d'effet ni de délai à ce courrier. Il ne remplace jamais la déclaration et n'arrête pas son délai.

## Ce que lit le gérant avant de valider

Ce courrier demande à {{procedureCollective.mandataire.nom}} si votre entreprise figure sur la liste des créanciers remise par votre client, et sous quelle référence le dossier est suivi.
Il ne déclare pas votre créance et ne donne aucun montant : la date limite pour déclarer continue de courir pendant que vous attendez la réponse.
Rien, dans les textes lus, n'oblige le mandataire à vous répondre, ni dans un délai donné.
La liste des créanciers est aussi déposée au greffe du tribunal.

## Texte du modèle

```text
{{creancier.denomination}}
{{creancier.formeJuridique}}, SIREN {{creancier.siren}}
{{creancier.adresseSiege}}
{{creancier.email}}{{#si creancier.telephone}}, {{creancier.telephone}}{{/si}}

{{procedureCollective.mandataire.nom}}
{{param.destinataireDeclarationCreance.libelle}}
{{procedureCollective.mandataire.adresse}}

{{signature.lieu}}, le {{signature.date}}

Objet : procédure de {{param.destinataireDeclarationCreance.procedure}} de {{debiteur.denomination}}, SIREN {{debiteur.siren}}, demande d'information

Madame, Monsieur,

Par jugement du {{procedureCollective.dateJugement}}{{#si procedureCollective.tribunal}}, rendu par le {{procedureCollective.tribunal}}{{/si}}, une procédure de {{param.destinataireDeclarationCreance.procedure}} a été ouverte à l'égard de {{debiteur.denomination}}, {{debiteur.formeJuridique}}, dont le siège est {{debiteur.adresseSiege}}.{{#si procedureCollective.dateParutionBodacc}} Ce jugement a été publié au Bulletin officiel des annonces civiles et commerciales le {{procedureCollective.dateParutionBodacc}}.{{/si}} Il désigne {{procedureCollective.mandataire.nom}} en qualité de {{param.destinataireDeclarationCreance.libelle}}.

{{creancier.denomination}} a entretenu des relations commerciales avec {{debiteur.denomination}}. Nous vous serions reconnaissants de bien vouloir nous indiquer :
- si {{creancier.denomination}} figure sur la liste des créanciers que le débiteur vous a remise ({{param.listeCreanciersDuDebiteur.source}}) et, dans ce cas, pour quel montant ;
- la référence sous laquelle vous suivez cette procédure ;
- lorsqu'elle aura été établie, la date de dépôt au greffe de la liste des créances déclarées ({{param.listeCreancesDeclarees.source}}).

Ce courrier est une demande d'information. Il ne constitue pas une déclaration de créance et ne contient aucune demande d'admission au passif.

Votre réponse peut nous être adressée à l'adresse figurant en tête de ce courrier ou par courriel à {{creancier.email}}.

Nous vous prions d'agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

{{signataire.nom}}
{{signataire.qualite}}
[signature]
```

## Variables

| Variable | Type | Source dans Letikette | Obligatoire |
|---|---|---|---|
| `creancier.denomination` | texte | Données Letikette : créancier (dénomination) | oui |
| `creancier.formeJuridique` | texte | Données Letikette : créancier (forme juridique) | oui |
| `creancier.siren` | texte | Données Letikette : créancier (SIREN/SIRET) | oui |
| `creancier.adresseSiege` | texte | Données Letikette : créancier (adresse du siège) | oui |
| `creancier.email` | texte | Données Letikette : créancier (e-mail) ; la réponse va au client | oui |
| `creancier.telephone` | texte | Données Letikette : créancier (téléphone) | non |
| `debiteur.denomination` | texte | Données Letikette : débiteur (dénomination) | oui |
| `debiteur.formeJuridique` | texte | Données Letikette : débiteur (forme juridique) | oui |
| `debiteur.siren` | texte | Données Letikette : débiteur (SIREN) | oui |
| `debiteur.adresseSiege` | texte | Données Letikette : débiteur (adresse du siège lue au RCS/RNE) | oui |
| `procedureCollective.type` | enum SAUVEGARDE | REDRESSEMENT | LIQUIDATION | Données Letikette : procédure collective (type). Non stocké aujourd'hui (seule constatRegistre.nature, texte cité, existe) ; table de correspondance fixe, nature inconnue : refus. Résout param.destinataireDeclarationCreance | oui |
| `procedureCollective.dateJugement` | date | Données Letikette : procédure collective (constatRegistre.dateJugement, optionnelle). Absente : refus | oui |
| `procedureCollective.dateParutionBodacc` | date | Données Letikette : date de parution de l'annonce du jugement d'ouverture (et non du dernier constat) | non |
| `procedureCollective.tribunal` | texte cité tel quel | constatRegistre.tribunal (stocké, optionnel) | non |
| `procedureCollective.mandataire.nom` | texte cité tel quel | Données Letikette annoncées : procédure collective (mandataire ou liquidateur, nom). Aucun champ de ce nom n'existe aujourd'hui dans ConstatBodacc ni dans tables.ts ; absent : refus | oui |
| `procedureCollective.mandataire.adresse` | texte | Données Letikette annoncées : procédure collective (adresse). Même réserve de stockage | oui |
| `signataire.nom / signataire.qualite` | texte | Représentant légal par défaut (données créancier) ; aucun pouvoir n'est exigé par un texte lu pour une demande d'information | oui |
| `signature.lieu` | texte | Dérivé : commune du siège du créancier | oui |
| `signature.date` | date | Date de validation par le client | oui |

## Mentions et leurs sources

| Mention | Obligatoire | Article | Extrait | Emplacement |
|---|---|---|---|---|
| Phrase disant que le courrier n'est pas une déclaration de créance. Règle du produit, NON exigée par un texte, à ne jamais retirer : la preuve d'une déclaration pèse sur le créancier, et un écrit ambigu ne doit ni passer pour une déclaration ni faire croire au client qu'il a déclaré | non | [Cass. com., 4 février 2026, n° 24-21.337, publié au bulletin](https://www.legifrance.gouv.fr/juri/id/JURITEXT000053452204) | « « le créancier, sur qui pesait la charge de la preuve de sa déclaration de créance, ne rapportait pas cette preuve » » | Avant-dernier paragraphe |
| Liste des créanciers remise par le débiteur au mandataire (fonde la première question) | non | [C. com. L622-6 al. 2 (et non al. 4 ; version en vigueur depuis le 15/05/2022)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045178124) | « « Le débiteur remet à l'administrateur et au mandataire judiciaire, pour les besoins de l'exercice de leur mandat, la liste de ses créanciers, du montant de ses dettes et des principaux contrats en cours. » » | Première question |
| Contenu de cette liste (montant dû, sommes à échoir, nature, sûretés et privilèges) et dépôt au greffe | non | [C. com. R622-5 al. 1 et 2 (version en vigueur depuis le 01/10/2015)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031090723) | « « Dans les huit jours qui suivent le jugement d'ouverture, le débiteur remet la liste à l'administrateur et au mandataire judiciaire. Celui-ci la dépose au greffe. » » | Première question (source) |
| Liste des créances déclarées établie par le mandataire, puis déposée au greffe (fonde la dernière question) | non | [C. com. L624-1 al. 1 (version en vigueur depuis le 01/07/2014) ; R624-2 al. 1](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000028723981) | « « Dans le délai fixé par le tribunal, le mandataire judiciaire établit, après avoir sollicité les observations du débiteur, la liste des créances déclarées avec ses propositions d'admission, de rejet ou de renvoi devant la juridiction compétente. » » | Dernière question |
| Qualité du destinataire selon la procédure (exactitude du courrier, pas une obligation légale pour une demande d'information) | non | [C. com. L622-24 al. 1 ; L641-3 dernier al.](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038587562) | « « Les créanciers déclarent leurs créances au liquidateur selon les modalités prévues aux articles L. 622-24 à L. 622-27 et L. 622-31 à L. 622-33. » » | Bloc destinataire et premier paragraphe |
| Avertissement du mandataire aux créanciers connus dans les quinze jours du jugement, par courrier simple sauf sûreté publiée (information hors texte : le gérant peut l'avoir déjà reçu) | non | [C. com. R622-21 al. 1 ; CNAJMJ, page « informations procédure collective créancier »](https://www.cnajmj.fr/droits_obligations/informations-procedure-collective-creancier/) | « « Cet avertissement prend la forme d'un courrier simple sauf pour les créanciers « titulaires d'une sûreté publiée » où il prend la forme d'un courrier recommandé » » | Hors texte (stepper) |

## Paramètres à ajouter au référentiel

| Clé | Valeur | Article | Extrait |
|---|---|---|---|
| `listeCreanciersDuDebiteur` | Source seule, citée dans le texte : « article L622-6 du code de commerce » | [C. com. L622-6 al. 2 (version en vigueur depuis le 15/05/2022, loi n° 2022-172)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000045178124) | « « Le débiteur remet à l'administrateur et au mandataire judiciaire, pour les besoins de l'exercice de leur mandat, la liste de ses créanciers, du montant de ses dettes et des principaux contrats en cours. » » |
| `depotListeCreanciersAuGreffe` | 8 ; unite 'jours' pour la remise par le débiteur à compter du jugement ; puis dépôt au greffe par le mandataire | [C. com. R622-5 al. 2 (version en vigueur depuis le 01/10/2015)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031090723) | « « Dans les huit jours qui suivent le jugement d'ouverture, le débiteur remet la liste à l'administrateur et au mandataire judiciaire. Celui-ci la dépose au greffe. » » |
| `listeCreancesDeclarees` | Source seule, citée dans le texte : « articles L624-1 et R624-2 du code de commerce » | [C. com. L624-1 al. 1](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000028723981) | « « Dans le délai fixé par le tribunal, le mandataire judiciaire établit, après avoir sollicité les observations du débiteur, la liste des créances déclarées avec ses propositions d'admission, de rejet ou de renvoi devant la juridiction compétente. » » |
| `depotListeCreancesDeclareesAuGreffe` | true | [C. com. R624-2 al. 1 (version en vigueur depuis le 02/07/2014)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006161534/) | « « La liste des créances contenant les indications prévues à l'article L. 622-25 et à l'article R. 622-23 ainsi que les propositions du mandataire judiciaire et les observations du débiteur, avec indication de leur date, est déposée au greffe » » |
| `consultationEtatCreances` | true ; au greffe du tribunal, par toute personne | [C. com. R624-8 al. 2 (et non al. 3 ; version en vigueur depuis le 01/10/2021)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006178929/) | « « Cet état est déposé au greffe du tribunal, où toute personne peut en prendre connaissance. » » |
| `delaiReclamationEtatCreances` | 1 ; unite 'mois' ; départ : publication au BODACC de l'insertion annonçant le dépôt de l'état des créances (R624-8 al. 3) | [C. com. R624-8 al. 4 (et non al. 5)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006178929/) | « « Tout intéressé peut présenter une réclamation devant le juge-commissaire dans le délai d'un mois à compter de la publication. » » |
| `delaiAvertissementCreanciersConnus` | 15 ; unite 'jours' ; départ : jugement d'ouverture ; obligation du mandataire (information, pas une tâche du gérant) | [C. com. R622-21 al. 1 (version en vigueur depuis le 01/10/2015, décret n° 2015-1009)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006161533/) | « « Le mandataire judiciaire, dans le délai de quinze jours à compter du jugement d'ouverture, avertit les créanciers connus » » |

## Interdits

- Tout montant, toute référence de facture, tout décompte et toute pièce jointe.
- Les mots « déclarer », « réclamer », « requérir l'admission », « produire au passif », sauf dans la phrase qui dit que ce courrier n'est pas une déclaration.
- Toute question de droit posée au mandataire et toute argumentation (par exemple sur le rang ou le caractère privilégié de la créance).
- Toute question dont le logiciel connaît déjà la réponse par ses propres sources (date de parution au BODACC, que le logiciel lit lui-même).
- Le nom, le logo, l'adresse, le domaine, l'e-mail ou le téléphone de Letikette, y compris dans l'adresse d'expéditeur et les métadonnées.
- Le mot interdit du projet, toute promesse et toute recommandation.
- Présenter ce courrier au gérant comme un remplacement de la déclaration, ou comme un moyen d'arrêter ou de prolonger le délai de déclaration.
- Toute ressemblance avec un acte de commissaire de justice (C. pén. 433-13 2°).
- Toute copie au débiteur, et toute demande adressée au débiteur.

## Points ouverts

- CORRECTIONS : (1) alinéas corrigés après lecture : L622-6 al. 2 (pas al. 4) ; R624-8 al. 2 pour la consultation (pas al. 3) et al. 4 pour la réclamation d'un mois (pas al. 5). (2) Question sur la date de parution au BODACC retirée, avec la variable procedureCollective.parutionInconnue : le logiciel lit le BODACC lui-même (règle d'écran n° 1), et la question laissait croire que le délai dépendait de la réponse du mandataire. (3) Deux mentions passées à obligatoire: false, parce qu'aucun texte ne les impose pour une demande d'information (la phrase « ce n'est pas une déclaration » reste dans le texte comme règle du produit). (4) Données : le nom et l'adresse du mandataire et le type de procédure ne sont pas stockés aujourd'hui (tables.ts) ; le tribunal l'est. (5) Mention ajoutée : l'avertissement du mandataire (R622-21, CNAJMJ), que le gérant a pu recevoir. (6) resume_gerant : « Aucun texte relu » reformulé en français courant.
- Aucun texte lu n'oblige le mandataire ou le liquidateur à répondre à la demande d'information d'un créancier, ni dans un délai donné.
- Aucun texte lu ne dit qu'une demande d'information arrête ou prolonge le délai de déclaration (R622-24). Le stepper doit continuer d'afficher la date limite pendant l'attente.
- La liste des créanciers est déposée au greffe (R622-5 al. 2), mais aucun texte lu ne dit qui peut la consulter. L'état des créances, lui, est consultable par toute personne (R624-8 al. 2). La consultation au greffe est une autre option, présentée au même rang.
- Un écrit adressé au mandataire peut-il être pris pour une déclaration de créance ? Aucune décision n'a été lue en ce sens. La phrase explicite et l'absence de tout montant réduisent ce risque ; le vérifier en droit reste à faire.
- La réponse du mandataire peut indiquer que le débiteur a lui-même porté la créance à sa connaissance. Cela fait jouer la présomption de L622-24 al. 7, qui ne vaut que tant que le créancier n'a pas déclaré. Il faut décider comment l'écran affiche ce constat sans en tirer de conseil.
- Signataire : aucun texte lu n'exige de pouvoir pour une simple demande d'information. Le représentant légal est retenu par défaut.
- Données manquantes au stockage : nom et adresse du mandataire, type de procédure. Tant qu'ils ne sont pas écrits par l'extraction BODACC, le gabarit refuse.
