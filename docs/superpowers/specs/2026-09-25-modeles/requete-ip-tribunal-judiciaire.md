# Requête en injonction de payer au président du tribunal judiciaire (débiteur non commerçant), avec son bordereau des pièces

**Destinataire** : Le président du tribunal judiciaire du lieu où le débiteur est établi, ou de son domicile pour une personne physique (CPC 1406 et 43), par son greffe. La notice 51156#10 renvoie aux adresses « des tribunaux judiciaires, des tribunaux de proximité » : selon la commune, le greffe peut être celui d'un tribunal de proximité, point non tranché. Les matières du juge des contentieux de la protection (loyers impayés, crédit à la consommation, selon la notice) sont hors gabarit. Si le client a désigné un avocat, le document part chez cet avocat comme projet, et c'est lui qui décide.  
**Canal** : Papier : service-public indique que la demande « doit être envoyée ou déposée au greffe du tribunal judiciaire ». Le client l'envoie par lettre recommandée avec avis de réception en courrier hybride, avec sa propre adresse d'expéditeur, ou la dépose lui-même au greffe. Il n'y a pas de frais de greffe (service-public F38156). Quand un avocat est désigné, le projet part chez lui, et c'est lui qui dépose. On ne joint jamais de pouvoir au nom de Letikette ; si un autre que le représentant légal signe, c'est un pouvoir spécial du représentant légal (notice 51156#10).

## Ce que lit le gérant avant de valider

Ce document demande au président {{juridiction.complementDuPresident}} d'ordonner à votre client de vous payer {{decompte.total}}{{#options.clausePenale}}, plus {{decompte.clausePenale.montant}} de clause pénale{{/options.clausePenale}}.
Il est à votre seul nom : vous le signez vous-même, comme représentant légal de votre entreprise, et votre client en recevra une copie.
Vérifiez les deux identités, les factures et le total. Ce qui n'y est pas écrit n'est pas réclamé, et le juge peut n'accorder qu'une partie.
Vérifiez aussi votre adresse : si votre client conteste, c'est là que le tribunal vous écrira, et vous aurez peu de temps pour réagir. Ce tribunal ne demande pas de frais.
Si le juge accorde la somme, sa décision ne vaut plus rien si un commissaire de justice ne la remet pas officiellement à votre client dans les {{param.delaiSignificationInjonction.valeur}} mois qui suivent.

## Texte du modèle

```text
{{! GABARIT FIXE requete-ip-tribunal-judiciaire, version 2 du 25/09/2026, relu par l'IA seule, valideParAvocat false. Mêmes règles que requete-ip-tribunal-commerce : texte fixe hors des champs ; champs remplis de faits, du décompte figé ou de paramètres ; blocs conditionnels selon la seule présence d'une donnée ou d'un booléen déterministe ; aucun article, taux, délai ni montant légal écrit en dur. Une copie de cette requête et de son bordereau sera remise au débiteur (CPC 1411). L'adresse du créancier portée ici est celle où le greffe notifie une opposition (CPC 1418). Ordre fixe du bordereau : CONTRAT, DEVIS_SIGNE, BON_DE_COMMANDE, CGV, BON_DE_LIVRAISON, FACTURE, ECHANGES, MISE_EN_DEMEURE (avec leurs preuves), PREUVE_TENTATIVE_AMIABLE ou PREUVE_PETITES_CREANCES, DECOMPTE. Production refusée si decompte.totalDemande ne dépasse pas param.seuilTentativeAmiablePrealable sans tentative amiable ni dispense documentée. }}
{{creancier.denomination}}
{{creancier.formeJuridiqueEnToutesLettres}}{{#creancier.mentionCapitalRequise}} au capital de {{creancier.capitalSocial}}{{/creancier.mentionCapitalRequise}}
Siège social : {{creancier.adresseSiege}}
{{#creancier.villeGreffeRcs}}SIREN {{creancier.siren}}, RCS {{creancier.villeGreffeRcs}}{{/creancier.villeGreffeRcs}}{{^creancier.villeGreffeRcs}}SIREN {{creancier.siren}}{{/creancier.villeGreffeRcs}}
{{#creancier.enLiquidation}}Société en liquidation{{/creancier.enLiquidation}}
{{#creancier.qualiteLocataireGerant}}{{creancier.qualiteLocataireGerant}}{{/creancier.qualiteLocataireGerant}}
{{#creancier.adresseCorrespondance}}Adresse pour la correspondance : {{creancier.adresseCorrespondance}}{{/creancier.adresseCorrespondance}}
{{#creancier.email}}Courriel : {{creancier.email}}{{/creancier.email}}
{{#creancier.telephone}}Téléphone : {{creancier.telephone}}{{/creancier.telephone}}

À l'attention de Madame, Monsieur le Président {{juridiction.complementDuPresident}}
{{juridiction.intituleGreffe}}
{{juridiction.adresseGreffe}}

REQUÊTE EN INJONCTION DE PAYER

Madame, Monsieur le Président,

I. LE REQUÉRANT
{{creancier.denomination}}, {{creancier.formeJuridiqueEnToutesLettres}}{{#creancier.mentionCapitalRequise}} au capital de {{creancier.capitalSocial}}{{/creancier.mentionCapitalRequise}}, dont le siège social est situé {{creancier.adresseSiege}}, {{#creancier.villeGreffeRcs}}immatriculée au registre du commerce et des sociétés de {{creancier.villeGreffeRcs}} sous le numéro {{creancier.siren}}{{/creancier.villeGreffeRcs}}{{^creancier.villeGreffeRcs}}identifiée sous le numéro SIREN {{creancier.siren}}{{/creancier.villeGreffeRcs}}, représentée par {{creancier.representant.prenomNom}}, en sa qualité de {{creancier.representant.qualite}}, ci-après « le requérant ».

II. LE DÉBITEUR
{{#debiteur.estPersonneMorale}}{{debiteur.denomination}}, {{debiteur.formeJuridiqueEnToutesLettres}}, dont le siège social est situé {{debiteur.adresseSiege}}{{#debiteur.siren}}, identifiée sous le numéro SIREN {{debiteur.siren}}{{/debiteur.siren}}, représentée par son représentant légal, ci-après « le débiteur ».{{/debiteur.estPersonneMorale}}{{^debiteur.estPersonneMorale}}{{#debiteur.civilite}}{{debiteur.civilite}} {{/debiteur.civilite}}{{debiteur.prenoms}} {{debiteur.nom}}{{#debiteur.nomCommercial}}, exerçant sous le nom {{debiteur.nomCommercial}}{{/debiteur.nomCommercial}}, demeurant {{debiteur.domicile}}{{#debiteur.siren}}, SIREN {{debiteur.siren}}{{/debiteur.siren}}, ci-après « le débiteur ».{{/debiteur.estPersonneMorale}}

III. L'OBJET DE LA DEMANDE
Le requérant demande, en application de {{param.procedureInjonctionDePayer.source}}, qu'une ordonnance portant injonction de payer soit rendue à l'encontre du débiteur pour la somme de {{decompte.total}}, arrêtée au {{decompte.arreteAu}}, dont le décompte figure au point VI{{#options.clausePenale}}, et pour la somme de {{decompte.clausePenale.montant}} au titre de la clause pénale{{/options.clausePenale}}{{#options.interetsPosterieurs}}, outre les pénalités de retard courues après cette date{{/options.interetsPosterieurs}}.

IV. LES FAITS
Le requérant a fourni au débiteur {{creance.natureFournitures}} décrites dans la ou les factures énumérées au point VI{{#pieces.commandes}}, commandées par le débiteur selon {{pieces.commandes.designation}} ({{pieces.commandes.renvoi}}){{/pieces.commandes}}{{#pieces.contrat}}, en exécution de {{pieces.contrat.designation}} ({{pieces.contrat.renvoi}}){{/pieces.contrat}}.
{{#pieces.livraisons}}La livraison ou l'exécution est attestée par {{pieces.livraisons.designation}} ({{pieces.livraisons.renvoi}}).{{/pieces.livraisons}}
La ou les factures énumérées au point VI sont échues à la date du {{decompte.arreteAu}} et restent impayées en tout ou partie{{#decompte.aDesReglements}}, déduction faite des règlements reçus, portés au même tableau{{/decompte.aDesReglements}}.
{{#diligences}}Le requérant en a réclamé le paiement au débiteur, sans obtenir de règlement intégral :
{{#diligences.liste}}- le {{date}}, par {{modeLibelle}} ({{renvoi}}) ;
{{/diligences.liste}}{{/diligences}}
{{#tentativeAmiable}}Préalablement à la présente requête, le requérant a engagé, le {{tentativeAmiable.date}}, {{tentativeAmiable.modeLibelle}}, sans qu'un accord soit trouvé ({{tentativeAmiable.renvoi}}).
{{/tentativeAmiable}}{{#dispensePetitesCreances}}Préalablement à la présente requête, le requérant a engagé, le {{dispensePetitesCreances.date}}, une procédure simplifiée de recouvrement des petites créances, qui n'a pas abouti ({{dispensePetitesCreances.renvoi}}) ; il est à ce titre dispensé de la tentative prévue par {{param.seuilTentativeAmiablePrealable.source}}.
{{/dispensePetitesCreances}}
V. LE FONDEMENT DE LA CRÉANCE
La créance résulte des relations contractuelles entre les parties, établies par {{pieces.fondement.enumeration}}.
Le principal est le montant de ces factures, déduction faite des règlements reçus.
Les pénalités de retard sont calculées période par période au taux défini par {{decompte.fondementTaux}}.
{{#decompte.aDesIndemnites}}L'indemnité forfaitaire pour frais de recouvrement, de {{param.indemniteForfaitaire.valeurEuros}} par facture, est réclamée pour {{decompte.nombreIndemnitesTexte}}, en application de {{param.indemniteForfaitaire.citation}}.
{{/decompte.aDesIndemnites}}{{#options.clausePenale}}La clause pénale est stipulée {{#clausePenale.article}}à l'article {{clausePenale.article}} {{/clausePenale.article}}{{clausePenale.documentDesignation}} ({{clausePenale.renvoi}}) ; son montant, porté au décompte, s'élève à {{decompte.clausePenale.montant}}.
{{/options.clausePenale}}
VI. LE DÉCOMPTE, ARRÊTÉ AU {{decompte.arreteAu}}
Principal
Facture | Émise le | Échue le | Montant TTC | Règlements reçus | Reste dû
{{#factures}}{{reference}} | {{dateEmission}} | {{dateExigibilite}} | {{montantTTC}} | {{reglementsRecus}} | {{resteDu}}
{{/factures}}Principal restant dû : {{decompte.principal}}

Pénalités de retard
Facture | Du | Au | Jours | Principal | Taux annuel | Base annuelle | Montant
{{#decompte.segments}}{{facture}} | {{debut}} | {{fin}} | {{jours}} | {{principal}} | {{taux}} | {{baseAnnuelle}} jours | {{interets}}
{{/decompte.segments}}Chaque ligne se vérifie ainsi : principal × taux annuel × nombre de jours ÷ base annuelle, arrondi au centime le plus proche.
Total des pénalités de retard : {{decompte.interets}}

{{#decompte.aDesIndemnites}}Indemnités forfaitaires pour frais de recouvrement
{{decompte.nombreIndemnites}} × {{param.indemniteForfaitaire.valeurEuros}} = {{decompte.indemnites}}

{{/decompte.aDesIndemnites}}Total arrêté au {{decompte.arreteAu}} : {{decompte.total}}
{{#options.clausePenale}}Clause pénale, en sus de ce total : {{decompte.clausePenale.montant}}
{{/options.clausePenale}}
VII. LA DEMANDE
En conséquence, le requérant demande au président {{juridiction.complementDuPresident}} de rendre une ordonnance enjoignant au débiteur de lui payer :
- {{decompte.principal}} au titre du principal ;
- {{decompte.interets}} au titre des pénalités de retard arrêtées au {{decompte.arreteAu}} ;
{{#decompte.aDesIndemnites}}- {{decompte.indemnites}} au titre des indemnités forfaitaires pour frais de recouvrement ;
{{/decompte.aDesIndemnites}}{{#options.interetsPosterieurs}}- les pénalités de retard sur {{decompte.principal}}, au taux défini par {{decompte.fondementTaux}}, à compter du {{decompte.lendemainArrete}} et jusqu'au paiement ;
{{/options.interetsPosterieurs}}{{#options.clausePenale}}- {{decompte.clausePenale.montant}} au titre de la clause pénale ;
{{/options.clausePenale}}- les dépens.
{{#options.renvoiEnCasOpposition}}En cas d'opposition, le requérant demande, en application de {{param.renvoiOppositionInjonction.source}}, que l'affaire soit immédiatement renvoyée devant {{renvoi.juridiction}}{{#renvoi.articleClause}}, désignée à l'article {{renvoi.articleClause}} {{renvoi.documentDesignation}} ({{renvoi.renvoiPiece}}){{/renvoi.articleClause}}.
{{/options.renvoiEnCasOpposition}}
VIII. LES PIÈCES
Les pièces sur lesquelles la demande est fondée sont énumérées au bordereau ci-après, qui fait partie de la présente requête. Elles sont jointes en copie.

Fait à {{signature.lieu}}, le {{signature.date}}.

Pour {{creancier.denomination}},
{{creancier.representant.prenomNom}}, {{creancier.representant.qualite}}
{{signature.bloc}}

{{! saut de page }}
BORDEREAU DES PIÈCES
produites à l'appui de la requête en injonction de payer présentée par {{creancier.denomination}} contre {{debiteur.designationCourte}}, adressée au président {{juridiction.complementDuPresident}} et datée du {{signature.date}}

{{#pieces.liste}}Pièce n° {{numero}} : {{typeLibelle}}{{#reference}} n° {{reference}}{{/reference}}{{#date}} du {{date}}{{/date}}{{#nombrePagesTexte}}, {{nombrePagesTexte}}{{/nombrePagesTexte}}
{{/pieces.liste}}
Nombre de pièces : {{pieces.nombre}}
```

## Variables

| Variable | Type | Source dans Letikette | Obligatoire |
|---|---|---|---|
| `creancier.denomination / formeJuridiqueEnToutesLettres / siren / adresseSiege` | texte | creancier.denomination, forme juridique (table fixe de libellés), SIREN, adresse du siege | oui |
| `creancier.mentionCapitalRequise / creancier.capitalSocial` | booleen / montant | déduit de la forme juridique (R123-238 3° et 4° b) / capital social MANQUANT, à ajouter au profil créancier | oui |
| `creancier.villeGreffeRcs` | texte | MANQUANT : ville du greffe RCS, à ajouter au profil (absente pour un inscrit au seul RNE) | oui |
| `creancier.enLiquidation / creancier.qualiteLocataireGerant` | booleen / texte | MANQUANTS : état au BODACC et location-gérance non stockés (R123-237 4° et 6°) | non |
| `creancier.adresseCorrespondance` | texte | saisie facultative du gérant, toujours une adresse du client. C'est l'adresse où le greffe notifiera l'opposition (1418) : le gérant la confirme expressément | non |
| `creancier.email / creancier.telephone` | texte | creancier.e-mail, creancier.telephone (ceux du client) | non |
| `creancier.representant.prenomNom / qualite` | texte | creancier.representant legal nom et qualite | oui |
| `juridiction.complementDuPresident` | texte | MANQUANT : annuaire des juridictions croisé avec debiteur.adresse du siege, ou avec le domicile pour une personne physique (ex. « du tribunal judiciaire de Nantes »). Le rattachement éventuel à un tribunal de proximité n'est pas tranché | oui |
| `juridiction.intituleGreffe / adresseGreffe` | texte | MANQUANT : annuaire | oui |
| `debiteur.estPersonneMorale / denomination / formeJuridiqueEnToutesLettres / adresseSiege / siren` | texte | debiteur.* (forme juridique, dénomination, adresse du siege lue au RCS/RNE, SIREN) | oui |
| `debiteur.prenoms / nom / nomCommercial / domicile` | texte | débiteur personne physique (profession libérale, entrepreneur individuel) : nom lu au RNE ; domicile MANQUANT, à fournir par le gérant, sinon la requête est bloquée | oui |
| `debiteur.civilite` | texte | MANQUANTE ; bloc facultatif | non |
| `debiteur.estProfessionnel` | booleen | MANQUANT : confirmation du gérant. L441-10 II ne rend l'indemnité due que par « tout professionnel en situation de retard ». Non professionnel ou non confirmé : requête bloquée (taux applicable non relevé) | oui |
| `debiteur.designationCourte` | texte | dérivé | oui |
| `garde.procedureCollective` | booleen | procedure collective et debiteur.sante (BODACC). Production refusée si une procédure est ouverte ou si le débiteur est radié | oui |
| `creance.natureFournitures` | enum | MANQUANT : liste fermée confirmée par le gérant (libellés de facture si importés) | oui |
| `factures[].reference / dateEmission / dateExigibilite / montantTTC / reglementsRecus / resteDu` | liste | factures | oui |
| `decompte.arreteAu / principal / interets / indemnites / nombreIndemnites / nombreIndemnitesTexte / total / aDesReglements / lendemainArrete / segments[]` | montant / date / liste | decompte fige, sans aucun recalcul | oui |
| `decompte.aDesIndemnites` | booleen | dérivé du décompte figé : nombreIndemnites > 0 (vrai seulement si debiteur.estProfessionnel a été confirmé avant l'arrêté) | oui |
| `decompte.clausePenale.montant` | montant | MANQUANT dans le moteur : ligne distincte du décompte figé, saisie par le gérant avant l'arrêté ; hors decompte.total | non |
| `decompte.totalDemande` | montant | MANQUANT dans le moteur : total figé + clause pénale. Sert seulement à la garde du seuil de tentative amiable, jamais imprimé | oui |
| `decompte.fondementTaux` | texte | {{param.tauxInteretLegalDefaut.source}} si le taux par défaut s'applique, sinon l'article des CGV confirmé par le gérant | oui |
| `pieces.liste[] / pieces.nombre / pieces.commandes / pieces.contrat / pieces.livraisons / pieces.fondement.enumeration` | liste | pieces, factures, preuves d'envoi, preuve de la tentative ou de la procédure petites créances, pièce de décompte (piece.ts), numérotées dans l'ordre fixe | oui |
| `diligences.liste[].date / modeLibelle / renvoi` | liste | historique des envois et pieces (MISE_EN_DEMEURE, ECHANGES) | non |
| `tentativeAmiable.modeLibelle / date / renvoi` | enum / date / texte | MANQUANT : saisi par le gérant avec sa preuve. Liste fermée reprenant les mots de 750-1 : « une tentative de conciliation menée par un conciliateur de justice », « une tentative de médiation », « une tentative de procédure participative » | non |
| `dispensePetitesCreances.date / renvoi` | date / texte | MANQUANT : saisi par le gérant avec la preuve que la procédure simplifiée de recouvrement des petites créances a été engagée sans succès (750-1 5°) | non |
| `options.interetsPosterieurs` | booleen | choix explicite du gérant, sans valeur par défaut | oui |
| `options.clausePenale / clausePenale.article / documentDesignation / renvoi` | booleen / texte | saisis par le gérant uniquement | non |
| `options.renvoiEnCasOpposition / renvoi.*` | booleen / texte | saisis par le gérant ou son avocat uniquement ; référence à une clause facultative | non |
| `signature.lieu / signature.date / signature.bloc` | texte / date / image | événement de validation du client ; signature du représentant légal (mode à confirmer avec le greffe) | oui |

## Mentions et leurs sources

| Mention | Obligatoire | Article | Extrait | Emplacement |
|---|---|---|---|---|
| Indication de la juridiction devant laquelle la demande est portée | oui | [CPC art. 54 1°, par renvoi des art. 57 et 1407](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042597347) | « « A peine de nullité, la demande initiale mentionne : 1° L'indication de la juridiction devant laquelle la demande est portée » » | En-tête et point VII |
| Objet de la demande | oui | [CPC art. 54 2°](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042597347) | « « 2° L'objet de la demande » » | Point III |
| Requérant personne morale : forme, dénomination, siège social, organe qui le représente légalement | oui | [CPC art. 54 3° b)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042597347) | « « b) Pour les personnes morales, leur forme, leur dénomination, leur siège social et l'organe qui les représente légalement » » | Point I et bloc de signature |
| Diligences en vue d'une résolution amiable, ou justification de la dispense, lorsque la demande doit être précédée d'une tentative. Au tribunal judiciaire, tentative exigée jusqu'à 5 000 €, sauf dispense | oui | [CPC art. 750-1 (en vigueur depuis le 13/05/2023, décret n° 2023-357 ; instances introduites à compter du 01/10/2023), « à peine d'irrecevabilité que le juge peut prononcer d'office » ; CPC art. 54 5°. Retenue par prudence : que l'art. 750-1 s'applique à une requête en injonction de payer n'est pas tranché](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039501708/) | « « au choix des parties, d'une tentative de conciliation menée par un conciliateur de justice, d'une tentative de médiation ou d'une tentative de procédure participative, lorsqu'elle tend au paiement d'une somme n'excédant pas 5 000 euros » ; « 5° Si le créancier a vainement engagé une procédure simplifiée de recouvrement des petites créances » » | Point IV, bloc tentativeAmiable ou dispensePetitesCreances ; exigé si decompte.totalDemande ≤ param.seuilTentativeAmiablePrealable |
| Débiteur : dénomination et siège social (personne morale), ou nom, prénoms et domicile (personne physique) | oui | [CPC art. 57, à peine de nullité](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039623150) | « « lorsqu'elle est formée par une seule partie, l'indication des nom, prénoms et domicile de la personne contre laquelle la demande est formée ou s'il s'agit d'une personne morale, de sa dénomination et de son siège social » » | Point II |
| Indication des pièces sur lesquelles la demande est fondée | oui | [CPC art. 57](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039623150) | « « dans tous les cas, l'indication des pièces sur lesquelles la demande est fondée. » » | Points IV, V et VIII, et bordereau |
| Requête datée et signée | oui | [CPC art. 57](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039623150) | « « Elle est datée et signée. » » | Bloc de signature |
| Montant précis et décompte des différents éléments de la créance | oui | [CPC art. 1407](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044200316) | « « Outre les mentions prescrites par l'article 57, la requête contient l'indication précise du montant de la somme réclamée avec le décompte des différents éléments de la créance » » | Points III, VI et VII |
| Fondement de la créance | oui | [CPC art. 1407](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044200316) | « « le fondement de celle-ci » » | Point V |
| Bordereau des documents justificatifs, et documents joints | oui | [CPC art. 1407 ; bordereau remis au débiteur avec la requête pour les ordonnances rendues à compter du 01/09/2026 (art. 1411)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044200316) | « « ainsi que le bordereau des documents justificatifs produits à l'appui de la requête. Elle est accompagnée de ces documents. » » | Bordereau en annexe ; point VIII |
| Conditions de la procédure : cause contractuelle, montant déterminé | oui | [CPC art. 1405](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006412552) | « « 1° La créance a une cause contractuelle ou résulte d'une obligation de caractère statutaire et s'élève à un montant déterminé ; en matière contractuelle, la détermination est faite en vertu des stipulations du contrat y compris, le cas échéant, la clause pénale » » | Points III, V et VI |
| Juge du lieu où demeure le débiteur (personne morale : lieu où elle est établie ; personne physique : domicile), règle d'ordre public | oui | [CPC art. 1406 et 43](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039624723) | « « Le juge territorialement compétent est celui du lieu où demeure le ou l'un des débiteurs poursuivis. Les règles prescrites aux alinéas précédents sont d'ordre public. Toute clause contraire est réputée non écrite. » » | Choix du destinataire |
| Président du tribunal judiciaire pour une créance de nature civile, quel qu'en soit le montant, hors matières du juge des contentieux de la protection | oui | [CPC art. 1406 al. 1 ; notice officielle 51156#10 (en partie périmée sur d'autres points)](https://www.formulaires.service-public.gouv.fr/gf/getNotice.do?cerfaNotice=51156&cerfaFormulaire=16040) | « « du président du tribunal judiciaire pour une demande si la créance est de nature civile et quel qu'en soit le montant. » » | Choix de la variante et du destinataire |
| Numéro unique d'identification, mention RCS et ville du greffe, siège social, liquidation et location-gérance le cas échéant (créancier) | oui | [C. com. R123-237 1° à 4° et 6°. Contravention de 4e classe, pas une condition de validité de la requête ; application à une requête = lecture](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006178891/) | « « Toute personne immatriculée indique sur ses factures, notes de commande, tarifs et documents publicitaires ainsi que sur toutes correspondances et tous récépissés concernant son activité et signés par elle ou en son nom » » | En-tête du créancier et point I |
| Forme juridique et capital social du créancier (capital pour la SARL et les sociétés par actions) | oui | [C. com. R123-238 (3° et 4° b pour le capital)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006178891/) | « « Les actes et documents émanant de la société et destinés aux tiers, notamment les lettres, factures, annonces et publications diverses, indiquent la dénomination sociale, précédée ou suivie immédiatement et lisiblement » » | En-tête du créancier et point I |
| Indemnité forfaitaire due par un professionnel en retard de paiement (condition des lignes d'indemnité) | non | [C. com. L441-10 II (version en vigueur du 26/04/2019 au 01/01/2027)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038414392) | « « Tout professionnel en situation de retard de paiement est de plein droit débiteur, à l'égard du créancier, d'une indemnité forfaitaire pour frais de recouvrement, dont le montant est fixé par décret. » » | Points V, VI et VII, lignes incluses seulement si decompte.aDesIndemnites |
| Adresse du créancier : c'est là que le greffe notifie l'opposition, et le délai pour prendre un avocat court de cette notification | non | [CPC art. 1418 (version en vigueur depuis le 01/04/2026, décret n° 2026-96), procédure écrite devant le tribunal judiciaire](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053497789) | « « Cette notification est régulièrement faite à l'adresse indiquée par le créancier lors du dépôt de la requête en injonction de payer. » » | En-tête du créancier (siège, et adresse de correspondance si le gérant en donne une) |
| Renvoi immédiat en cas d'opposition (facultatif) | non | [CPC art. 1408](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/) | « « Le créancier peut, dans la requête en injonction de payer, demander qu'en cas d'opposition, l'affaire soit immédiatement renvoyée devant la juridiction qu'il estime compétente. » » | Point VII, bloc rempli par le gérant ou son avocat |

## Paramètres à ajouter au référentiel

| Clé | Valeur | Article | Extrait |
|---|---|---|---|
| `mentionsObligatoiresInjonction` | voir la variante tribunal de commerce (même entrée, une seule fois dans le référentiel) | [CPC art. 1407](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044200316) | « « Outre les mentions prescrites par l'article 57, la requête contient l'indication précise du montant de la somme réclamée avec le décompte des différents éléments de la créance, le fondement de celle-ci ainsi que le bordereau des documents justificatifs » » |
| `mentionsObligatoiresRequete` | voir la variante tribunal de commerce | [CPC art. 57](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039623150) | « « ou s'il s'agit d'une personne morale, de sa dénomination et de son siège social ; dans tous les cas, l'indication des pièces sur lesquelles la demande est fondée. […] Elle est datée et signée. » » |
| `mentionsObligatoiresDemandeInitiale` | voir la variante tribunal de commerce ; ici le 5° peut être exigé (750-1) | [CPC art. 54 5°](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042597347) | « « 5° Lorsqu'elle doit être précédée d'une tentative de conciliation, de médiation ou de procédure participative, les diligences entreprises en vue d'une résolution amiable du litige ou la justification de la dispense d'une telle tentative. » » |
| `procedureInjonctionDePayer` | voir la variante tribunal de commerce | [CPC, livre III, titre IV, chapitre II, section I](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/) | « « Section I : L'injonction de payer. (Articles 1405 à 1422) » » |
| `seuilTentativeAmiablePrealable` | 500000n, unite 'centimes' (5 000 €), tribunal judiciaire, sanction : irrecevabilité ; instances introduites à compter du 01/10/2023 ; source affichée « article 750-1 du code de procédure civile » ; application à l'injonction de payer non tranchée | [CPC art. 750-1 al. 1, en vigueur depuis le 13/05/2023 (décret n° 2023-357)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039501708/) | « « à peine d'irrecevabilité que le juge peut prononcer d'office, la demande en justice est précédée, au choix des parties, d'une tentative de conciliation menée par un conciliateur de justice, d'une tentative de médiation ou d'une tentative de procédure participative » » |
| `dispensesTentativeAmiable` | CONSTANTE : ['homologation d'un accord', 'recours préalable imposé', 'motif légitime : urgence manifeste, impossibilité, décision non contradictoire, conciliateur indisponible plus de trois mois', 'tentative de conciliation par le juge prévue par un texte', 'procédure simplifiée des petites créances vainement engagée']. Seul le dernier cas a une phrase fixe dans le gabarit ; les autres relèvent de l'avocat | [CPC art. 750-1 al. 2, 1° à 5°](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039501708/) | « « 5° Si le créancier a vainement engagé une procédure simplifiée de recouvrement des petites créances, conformément à l'article L. 125-1 du code des procédures civiles d'exécution. » » |
| `conditionsInjonctionDePayer` | voir la variante tribunal de commerce | [CPC art. 1405](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006412552) | « « 1° La créance a une cause contractuelle ou résulte d'une obligation de caractère statutaire et s'élève à un montant déterminé ; en matière contractuelle, la détermination est faite en vertu des stipulations du contrat y compris, le cas échéant, la clause pénale » » |
| `juridictionsInjonction` | voir la variante tribunal de commerce | [CPC art. 1406 al. 1](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039624723) | « « La demande est portée, selon le cas, devant le juge des contentieux de la protection ou devant le président du tribunal judiciaire ou du tribunal de commerce, dans la limite de la compétence d'attribution de ces juridictions. » » |
| `competenceTerritorialeInjonction` | voir la variante tribunal de commerce | [CPC art. 1406](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039624723) | « « Le juge territorialement compétent est celui du lieu où demeure le ou l'un des débiteurs poursuivis. Les règles prescrites aux alinéas précédents sont d'ordre public. Toute clause contraire est réputée non écrite. » » |
| `lieuOuDemeureDefendeur` | voir la variante tribunal de commerce | [CPC art. 43](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006410141) | « « Le lieu où demeure le défendeur s'entend : - s'il s'agit d'une personne physique, du lieu où celle-ci a son domicile ou, à défaut, sa résidence ; - s'il s'agit d'une personne morale, du lieu où celle-ci est établie. » » |
| `fraisGreffeInjonctionTribunalJudiciaire` | 0n, unite 'centimes'. Source : service-public, fiche vérifiée le 01/09/2026 (aucun texte réglementaire lu) | [Service-public Entreprendre, fiche F38156](https://entreprendre.service-public.gouv.fr/vosdroits/F38156) | « « Il n'y a pas de frais de greffe devant le tribunal judiciaire. » » |
| `renvoiOppositionInjonction` | voir la variante tribunal de commerce | [CPC art. 1408](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/) | « « Le créancier peut, dans la requête en injonction de payer, demander qu'en cas d'opposition, l'affaire soit immédiatement renvoyée devant la juridiction qu'il estime compétente. » » |
| `seuilDispenseAvocatTribunalJudiciaire` | 1000000n, unite 'centimes' (10 000 €). Aussi proposé dans le relevé des exceptions : une seule entrée | [CPC art. 761 3°, version en vigueur depuis le 01/09/2025 (décret n° 2025-619)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039726277) | « « lorsque la demande porte sur un montant inférieur ou égal à 10 000 euros ou a pour objet une demande indéterminée ayant pour origine l'exécution d'une obligation dont le montant n'excède pas 10 000 euros. » » |
| `delaiConstitutionAvocatOpposition` | 15, unite 'jours', départ : la notification de la copie de l'opposition (date de présentation si l'avis revient non signé). Aussi proposé dans le relevé des exceptions : une seule entrée | [CPC art. 1418, version en vigueur depuis le 01/04/2026 (décret n° 2026-96)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053497789) | « « Le créancier doit constituer avocat dans un délai de quinze jours à compter de la notification. » » |
| `adresseNotificationOpposition` | CONSTANTE : 'adresse indiquée par le créancier lors du dépôt de la requête' (procédure écrite devant le tribunal judiciaire) | [CPC art. 1418, version en vigueur depuis le 01/04/2026](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053497789) | « « Cette notification est régulièrement faite à l'adresse indiquée par le créancier lors du dépôt de la requête en injonction de payer. » » |
| `mentionsPapiersAffairesImmatriculation` | voir la variante tribunal de commerce | [C. com. R123-237](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006178891/) | « « Toute personne immatriculée indique sur ses factures, notes de commande, tarifs et documents publicitaires ainsi que sur toutes correspondances et tous récépissés concernant son activité et signés par elle ou en son nom » » |
| `mentionsFormeEtCapital` | voir la variante tribunal de commerce | [C. com. R123-238](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006178891/) | « « Les actes et documents émanant de la société et destinés aux tiers, notamment les lettres, factures, annonces et publications diverses, indiquent la dénomination sociale, précédée ou suivie immédiatement et lisiblement » » |
| `arretPoursuitesProcedureCollective` | voir la variante tribunal de commerce | [C. com. L622-21 I 1°](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044052603) | « « Le jugement d'ouverture interrompt ou interdit toute action en justice de la part de tous les créanciers […] tendant : 1° A la condamnation du débiteur au paiement d'une somme d'argent » » |
| `indemniteForfaitaireDebiteurProfessionnel` | CONSTANTE : true. L'indemnité n'est due que par un professionnel en retard de paiement ; condition à vérifier avant d'arrêter un décompte avec indemnités | [C. com. L441-10 II, version en vigueur du 26/04/2019 au 01/01/2027](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038414392) | « « Tout professionnel en situation de retard de paiement est de plein droit débiteur, à l'égard du créancier, d'une indemnité forfaitaire pour frais de recouvrement, dont le montant est fixé par décret. » » |
| `indemniteForfaitaire.citation` | voir la variante tribunal de commerce (correction de source de D441-5 et champ citation) | [C. com. D441-5, en vigueur depuis le 27/02/2021](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043197457) | « « Le montant de l'indemnité forfaitaire pour frais de recouvrement prévue au II de l'article L. 441-10 est fixé à 40 euros. » » |
| `copieRequeteRemiseAuDebiteur` | voir la variante tribunal de commerce | [CPC art. 1411, version en vigueur depuis le 01/04/2026](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/) | « « Une copie certifiée conforme de la requête accompagnée du bordereau des documents justificatifs et de l'ordonnance revêtue de la formule exécutoire est signifiée, à l'initiative du créancier, à chacun des débiteurs. » » |
| `formulairesCerfaInjonction` | INFORMATIF : TJ 12948*06 (fiche R1465, vérifiée le 06/02/2026), notice 51156#10 ; usage non imposé par un texte lu (la notice dit « vous pouvez utiliser ») | [Service-public, fiche R1465](https://entreprendre.service-public.gouv.fr/vosdroits/R1465) | « « Toute personne n'ayant pas de titre exécutoire souhaitant obtenir une ordonnance d'injonction de payer du président du tribunal judiciaire » » |

## Interdits

- Le nom, le logo, l'adresse, le domaine, l'e-mail ou le téléphone de Letikette, où que ce soit, y compris comme adresse de correspondance (le greffe y notifierait l'opposition), dans le nom du fichier et les métadonnées du PDF.
- Toute formule de mandat au profit de Letikette et tout pouvoir à son nom ; aucune mention d'un représentant autre que le représentant légal, un salarié muni de son pouvoir spécial, ou l'avocat du client.
- Toute ressemblance avec un acte de commissaire de justice ou un acte judiciaire (code pénal 433-13 2°) : « exploit », « signification », « sommation », « commandement », « huissier », « étude », « acte extrajudiciaire », « formule exécutoire », « ordonnance » en titre, « Au nom du peuple français », « République française », Marianne, sceau, cachet.
- Toute phrase ajoutée par l'agent, tout raisonnement juridique libre, toute citation d'article, de taux, de délai ou de montant hors param. En particulier, pas d'argument rédigé sur la dispense de tentative amiable (750-1, 3°) : seule la dispense du 5°, prouvée par pièce, a une phrase fixe.
- Toute somme hors du décompte figé ; l'indemnité forfaitaire si la qualité de professionnel du débiteur n'est pas confirmée ; l'indemnisation complémentaire. La clause pénale n'entre que comme ligne distincte du décompte figé.
- « Incontestée », « non contestée », « certaine, liquide et exigible », ou toute affirmation d'absence de contestation.
- Écrire qu'une réclamation, une mise en demeure, une tentative amiable ou la requête interrompt la prescription.
- Toute recommandation ou annonce d'une suite, et le mot « garantie ».
- Choisir à la place du gérant une juridiction de renvoi, une clause pénale, un taux contractuel ou l'option des pénalités postérieures.
- Mentionner des frais de greffe (service-public F38156 : « Il n'y a pas de frais de greffe devant le tribunal judiciaire ») ou un délai de consignation.
- Produire la requête contre un débiteur en procédure collective ou radié (L622-21), dans une matière du juge des contentieux de la protection, contre un débiteur non professionnel, ou si decompte.totalDemande ne dépasse pas le seuil de 750-1 sans tentative amiable ni dispense du 5° documentée.
- Joindre une pièce non validée par le client, ou une correspondance entre avocats ; aucun libellé de pièce ne porte de commentaire.

## Points ouverts

- CORRECTIONS: (1) Point III : fondement procédural remplacé par {{param.procedureInjonctionDePayer.source}} (art. 1405 à 1422, section lue). (2) « intérêts de retard » remplacé par « pénalités de retard » (L441-10 II lu). (3) Les blocs {{#decompte.indemnites}} testaient un montant, toujours affiché même à « 0,00 € » : remplacés par le booléen decompte.aDesIndemnites. (4) Tentative amiable : « les parties ont eu recours à » remplacé par « le requérant a engagé » (une conciliation refusée par le débiteur n'est pas un recours des deux parties) ; ajout d'un bloc fixe pour la dispense du 5° de 750-1 (procédure des petites créances), lue. (5) Clause pénale : montant pris dans une ligne du décompte figé, affichée hors total ; decompte.totalDemande pour la garde du seuil de 5 000 €. (6) Renvoi 1408 : référence à une clause rendue facultative. (7) Ajout de l'effet de l'adresse du créancier (1418, lu) : mention, adresse de correspondance facultative, interdit et résumé. (8) Ajout du 6° de R123-237 ; civilité facultative ; « identifié » remplacé par « SIREN ». (9) justice.fr retiré des sources (page introuvable dans cette session) ; l'absence de frais repose sur service-public seul. (10) Nouveau BLOQUANT : procedures.ts exige « entreCommercants », ce qui rend cette variante inatteignable. (11) Interdits : 433-13 étendu aux actes judiciaires, prescription. (12) Résumé : copie reçue par le client, adresse, « officiellement ».
- BLOQUANT. valideParAvocat vaut false partout, donc exigerPourActe() refuse la production. Il faut une décision de Jules, comme pour la variante tribunal de commerce.
- BLOQUANT. La clé mentionsObligatoiresInjonction sert aussi au niveau 3 de relance.ts et à procedures.ts : il faut la découpler avant de la remplir.
- BLOQUANT. procedures.ts évalue l'injonction de payer sur CONDITIONS_LEGALES de qualification.ts, qui contient « entreCommercants » (« la qualité de commerçant des deux parties »). Un débiteur non commerçant rend donc la procédure inéligible, et cette variante ne peut jamais être atteinte. L'art. 1405 ne pose pas cette condition.
- Tentative amiable, art. 750-1. Jusqu'à 5 000 €, la demande en justice doit être précédée d'une conciliation, d'une médiation ou d'une procédure participative, « à peine d'irrecevabilité ». Le 3° dispense quand un motif légitime tient aux circonstances « nécessitant qu'une décision soit rendue non contradictoirement », et la requête saisit le juge sans que l'adversaire soit informé (art. 57). Aucune source lue ne dit si cela couvre l'injonction de payer ; la notice 51156#10, lue en entier, ne parle d'aucune tentative préalable. Règle du projet (le doute ne profite pas au produit) : production refusée sans tentative ni dispense du 5° documentée. Une mise en demeure n'est pas l'un des trois modes. Le seuil se compare à la somme demandée, clause pénale comprise (decompte.totalDemande) : lecture.
- Dispense du 5° de 750-1 : ouverte si le créancier a « vainement engagé » la procédure simplifiée de recouvrement des petites créances (L125-1 CPCE). Le texte de L125-1 et ses exclusions n'ont pas été relus dans cette session.
- Tribunal de proximité. La notice 51156#10 cite les adresses « des tribunaux de proximité » et parle du « tribunal judiciaire (incluant le tribunal de proximité) ». Aucune source lue ne dit quand la requête va à la chambre de proximité : il faut l'annuaire ou une confirmation du greffe.
- Choix de la variante. Un débiteur est non commerçant quand il n'est ni commerçant ni artisan et que l'acte n'est pas commercial pour lui (profession libérale, association, SCI ou autre société civile, exploitation agricole à caractère civil). La forme ne fait que proposer, et le gérant confirme. Le juge relève d'office son incompétence (1406). Le texte de l'art. 847-5 auquel renvoie l'art. 1406 n'a pas pu être lu.
- Qualité de professionnel du débiteur. L441-10 II rend l'indemnité due par « tout professionnel ». Le champ d'application du I et le taux applicable à un débiteur non professionnel n'ont pas été relevés. Sans confirmation, requête bloquée.
- Adresse de notification (1418) : en procédure écrite (au-delà de {{param.seuilDispenseAvocatTribunalJudiciaire}}), la copie de l'opposition est notifiée à l'adresse donnée dans la requête, et si l'avis revient non signé, la date de notification est celle de la présentation. Le créancier doit alors constituer avocat dans les {{param.delaiConstitutionAvocatOpposition.valeur}} jours. Le parcours doit afficher ce délai et avertir quand l'adresse du siège n'est pas relevée par le client.
- Débiteur personne physique : le domicile (art. 43 et 57) n'est pas stocké, et c'est lui qui fixe le tribunal compétent. Créancier personne physique : les données de l'art. 54 3° a) et la mention « EI » (R123-237 9°) ne sont pas stockées ; hors gabarit.
- Un seul débiteur par requête ; la solidarité (notice 51156#10) n'est pas couverte.
- Données absentes : capital social, ville du greffe RCS, état de liquidation et location-gérance du créancier, nature des fournitures, civilité, tentative amiable ou dispense, qualité de professionnel du débiteur, ligne de clause pénale et total de la demande dans le décompte, annuaire des juridictions.
- Opposition : cette étape sort de l'app. Au-delà de {{param.seuilDispenseAvocatTribunalJudiciaire}}, procédure écrite et avocat obligatoire (761, 1418, lus).
- Aucune décision lue ne montre que le président du tribunal judiciaire accorde l'indemnité et les pénalités de L441-10 dans une injonction de payer. S'il n'accorde qu'une partie, il n'y a pas de recours, sauf à ne pas remettre l'ordonnance au débiteur (1409 al. 3, lu).
- Formulaire : notice 51156#10 « vous pouvez utiliser » le Cerfa 12948*06 ; aucun texte lu ne l'impose. On ne sait pas si le greffe accepte une signature électronique sur une requête papier, ni combien d'exemplaires envoyer.
- Taux imprimé : piece.ts tronque le taux à deux décimales ; la phrase de vérification n'est exacte que pour un taux à deux décimales au plus. Libellé « pénalités de retard » à aligner avec piece.ts et relance.ts.
- Aucune source n'a été relevée sur l'effet de la requête sur la prescription (C. civ. 2241). L'écran ne l'affirme pas. Une tentative de médiation ou de conciliation la suspend (2238, relevé du 25/09, non relu ici) : ne jamais écrire qu'elle l'interrompt.
- Le décret n° 2026-96 ne touche pas au contenu de la requête : son art. 1er modifie les art. 510, 663, 1411, 1415, 1418 et 1422, pas 54, 57 ni 1407. Pour les ordonnances rendues à compter du 01/09/2026 (art. 9, lu) : trois mois pour la remise officielle, avec la requête et le bordereau (1411) ; acte de remise à produire à l'audience, à peine d'irrecevabilité (1418).
- L'absence de frais de greffe au tribunal judiciaire ne repose que sur service-public (F38156, vérifiée le 01/09/2026), pas sur un texte lu.
