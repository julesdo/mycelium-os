# Reconnaissance de dette et accord d'échéancier

**Destinataire** : La société débitrice, par une personne qui a le pouvoir de l'engager. C'est le débiteur qui propose l'échéancier et le créancier qui l'accepte : Letikette ne négocie pas. Si un avocat est désigné, le projet part chez lui. Le gabarit ne se compose pas si le registre porte une procédure collective, une radiation ou une dissolution.  
**Canal** : Par défaut, signature électronique chez un prestataire paramétré au seul nom du créancier (e-mails, écrans, expéditeur). Le signataire du débiteur saisit lui-même la mention de la somme pendant la session de signature, et chaque partie reçoit le PDF signé sur support durable. Sinon, deux originaux papier envoyés par recommandé hybride, que le débiteur retourne signés à l'adresse du créancier, jamais à Letikette. Rien ne part avant la validation de CE document par le créancier. La mise en demeure du point 5, si elle devient nécessaire, est un document distinct, soumis à la même validation.

## Ce que lit le gérant avant de valider

Votre client reconnaît ce qu'il vous doit et s'engage à payer en plusieurs fois, à des dates fixées.
S'il manque un versement, vous pouvez lui écrire en recommandé. Sans paiement dans le délai que vous avez choisi, tout le reste devient dû.
Les pénalités continuent de courir, sauf si vous choisissez d'y renoncer.
Il écrit lui-même la somme en lettres et en chiffres, et il vous paie directement.
Cet accord ne permet pas à lui seul de faire saisir. Aucun avocat ne l'a relu.

## Texte du modèle

```text
RECONNAISSANCE DE DETTE ET ACCORD D'ÉCHÉANCIER

Entre les soussignés :

{{creancier.denomination}} {{creancier.mentionForme}}{{#if creancier.capitalSocial}}, au capital de {{creancier.capitalSocial}} €{{/if}}, dont le siège est {{creancier.adresseSiege}}, SIREN {{creancier.siren}}{{#if creancier.immatriculeRcs}} – RCS {{creancier.villeGreffeRcs}}{{/if}}{{#if creancier.mentionLocataireGerant}}, {{creancier.mentionLocataireGerant}}{{/if}}, agissant par {{creancier.signataire.nom}}, {{creancier.signataire.qualite}},
ci-après « le Créancier »,

et

{{debiteur.denomination}}, {{debiteur.formeJuridique}}, dont le siège est {{debiteur.adresseSiege}}, SIREN {{debiteur.siren}}, agissant par {{debiteur.signataire.nom}}, {{debiteur.signataire.qualite}}, qui déclare disposer du pouvoir de l'engager,
ci-après « le Débiteur ».

1. Reconnaissance de dette

Le Débiteur reconnaît devoir au Créancier la somme de {{decompte.total}} €, arrêtée au {{decompte.arreteAu}}, au titre des factures suivantes :

{{#each decompte.lignes}}– facture n° {{reference}} du {{dateEmission}}, échue le {{dateExigibilite}} : principal restant dû {{principal}} € ; pénalités de retard {{interets}} € ; indemnité forfaitaire pour frais de recouvrement {{indemnite}} € ; total {{total}} €.
{{/each}}
Soit : principal {{decompte.principal}} € ; pénalités de retard {{decompte.interets}} € ; indemnités forfaitaires {{decompte.indemnites}} € ; total {{decompte.total}} €.

Le détail du calcul, facture par facture et période par période, figure dans le décompte annexé.

2. Échéancier

Le Créancier accepte que {{#if remiseConditionnelle}}la somme de {{echeancier.total}} €{{else}}cette somme{{/if}} lui soit réglée en {{echeancier.nombre}} versements, aux dates et pour les montants suivants :

{{#each echeancier.echeances}}– versement n° {{numero}} : {{montant}} €, au plus tard le {{date}} ;
{{/each}}
soit un total de {{echeancier.total}} €.

Chaque versement est effectué par virement sur le compte {{creancier.iban}} ouvert au nom du Créancier, en rappelant la référence {{creance.referenceInterne}}. Il est réputé effectué à la date à laquelle ce compte est crédité. Le Débiteur peut régler par anticipation tout ou partie des sommes restant dues.

3. Imputation des versements

Chaque versement s'impute sur les factures visées au point 1 dans l'ordre de leur date d'échéance, en commençant par la plus ancienne. Pour chaque facture, il s'impute d'abord sur les pénalités de retard, puis sur l'indemnité forfaitaire pour frais de recouvrement, puis sur le principal.

4. Pénalités de retard pendant l'échéancier

{{#if penalitesMaintenues}}Les pénalités de retard continuent de courir sur le principal restant dû de chaque facture, à compter du {{decompte.arreteAu}} et jusqu'à son paiement complet, au taux retenu pour cette facture dans le décompte annexé et selon les mêmes règles de calcul. Leur montant est arrêté par un décompte établi à la date du dernier versement. Il est réglé dans les {{accord.delaiSoldePenalitesJours}} jours suivant sa réception par le Débiteur.{{/if}}
{{#if renonciationPenalitesFutures}}Sous réserve que chaque versement soit payé à sa date, le Créancier renonce aux pénalités de retard qui courraient sur le principal restant dû après le {{decompte.arreteAu}}. Si le Débiteur perd le bénéfice du terme dans les conditions du point 5, cette renonciation est sans effet, et ces pénalités sont dues comme si elle n'avait pas été consentie.{{/if}}
{{#if remiseConditionnelle}}Sous la même réserve, le Créancier renonce en outre à la somme de {{remise.montant}} € au titre {{remise.objetLibelle}}, arrêtée au {{decompte.arreteAu}}. Cette renonciation prend effet au paiement complet du dernier versement. Si le Débiteur perd le bénéfice du terme dans les conditions du point 5, elle est sans effet.{{/if}}

5. Défaut de paiement

À défaut de paiement de tout ou partie d'un versement à sa date, le Créancier peut mettre le Débiteur en demeure de régulariser, par lettre recommandée avec demande d'avis de réception ou par lettre recommandée électronique. Si le versement n'est pas intégralement réglé dans les {{accord.delaiRegularisationJours}} jours suivant la réception de cette mise en demeure ou, à défaut, sa première présentation, le Débiteur perd le bénéfice du terme. La totalité des sommes restant dues au titre du présent accord devient alors immédiatement exigible, et le Créancier peut en poursuivre le recouvrement.

Le fait pour le Créancier de ne pas se prévaloir d'un retard ne vaut pas renonciation à s'en prévaloir ultérieurement.

6. Engagement du Créancier

Tant que les versements sont payés à leur date, le Créancier n'engage aucune action en paiement des sommes visées au point 1. Cet engagement ne l'empêche pas d'accomplir tout acte nécessaire à la conservation de ses droits.

7. Portée de l'accord

Le présent accord n'emporte pas novation : les factures visées au point 1 conservent leur nature et leurs accessoires. Le Créancier ne renonce à aucun droit autre que ceux expressément prévus au point 4.

8. Signature

{{#if signature.electronique}}Le présent accord est signé électroniquement par chacune des parties. Chacune en reçoit un exemplaire sur support durable.{{/if}}{{#if signature.papier}}Fait à {{signature.lieu}}, le {{signature.date}}, en deux exemplaires originaux, dont un pour chaque partie.{{/if}}

Pour le Créancier : {{creancier.signataire.nom}}, {{creancier.signataire.qualite}}
{{creancier.signature}}

Pour le Débiteur : {{debiteur.signataire.nom}}, {{debiteur.signataire.qualite}}
Mention à écrire par le signataire lui-même, à la main s'il signe sur papier, ou en la saisissant lui-même s'il signe électroniquement, la somme en toutes lettres puis en chiffres :
« Bon pour reconnaissance de dette de la somme de [somme en toutes lettres] euros ([somme en chiffres] €). »
{{debiteur.mentionSaisieParSignataire}}
{{debiteur.signature}}

Annexe : décompte de créance arrêté au {{decompte.arreteAu}}.

[Point 4 : penalitesMaintenues est coché par défaut. renonciationPenalitesFutures et remiseConditionnelle ne s'activent que sur un choix exprès du créancier, jamais par défaut ni sur proposition de l'agent. Quand remiseConditionnelle est active, le point 2 porte la somme à régler (le total diminué de la remise), et le point 1 garde le total reconnu. Contrôle bloquant : penalitesMaintenues ne peut pas être proposé tant que le moteur de décompte n'applique pas l'ordre d'imputation du point 3, parce que le décompte final contredirait l'accord signé. {{creancier.mentionForme}} : mêmes valeurs fermées que la mise en demeure.]
```

## Variables

| Variable | Type | Source dans Letikette | Obligatoire |
|---|---|---|---|
| `creancier.denomination / adresseSiege / siren` | texte | creancier (denomination, adresse du siege, SIREN) | oui |
| `creancier.mentionForme` | enum | Dérivé de creancier.forme juridique, valeurs fermées (R123-238 ; R123-237 8° et 9°) | oui |
| `creancier.capitalSocial` | montant (euros), si SARL ou société par actions | MANQUANT : non stocké (R123-238, SARL et sociétés par actions) | oui |
| `creancier.immatriculeRcs / creancier.villeGreffeRcs` | booléen / texte | MANQUANT : non stockés (R123-237 2°) | oui |
| `creancier.mentionLocataireGerant` | texte | MANQUANT (le cas échéant, R123-237 6°) | non |
| `creancier.signataire.nom / qualite` | texte | creancier.representant legal nom et qualite | oui |
| `creancier.signature` | signature | Signature électronique du représentant du créancier, ou signature manuscrite sur l'original papier | oui |
| `creancier.iban` | texte | MANQUANT : l'IBAN n'est pas stocké. Indispensable ici : le créancier le saisit à la validation, et les versements vont sur SON compte | oui |
| `debiteur.denomination / formeJuridique / adresseSiege / siren` | texte | debiteur (denomination, forme juridique, adresse du siege lue au RCS/RNE, SIREN) | oui |
| `debiteur.signataire.nom / qualite` | texte | MANQUANT : saisi par le signataire du débiteur dans la session de signature. À rapprocher des dirigeants inscrits au RNE, que le produit ne stocke pas encore | oui |
| `debiteur.mentionSaisieParSignataire` | texte | Tapée par le signataire du débiteur, jamais préremplie. Le produit refuse de finaliser si la somme en chiffres ou en lettres diffère de decompte.total | oui |
| `debiteur.signature` | signature | Signature électronique (niveau à choisir, voir point ouvert) ou signature manuscrite | oui |
| `decompte.arreteAu / principal / interets / indemnites / total` | date / montant | decompte fige (arrete au, principal, interets, indemnites forfaitaires x n, total) | oui |
| `decompte.lignes[] (reference, principal, interets, indemnite, total)` | liste (1 à N) | decompte fige par facture | oui |
| `decompte.lignes[].dateEmission / dateExigibilite` | date | MANQUANT AU DÉCOMPTE FIGÉ : la table decomptes ne garde que la référence. À joindre depuis factures par référence, avec contrôle que ces dates n'ont pas changé depuis l'arrêté, ou à figer avec le décompte | oui |
| `echeancier.nombre / echeancier.echeances[] (numero, date, montant)` | liste | MANQUANT : proposé par le débiteur, saisi et confirmé par le créancier | oui |
| `echeancier.total` | montant | Calculé. Contrôle bloquant : il vaut decompte.total, ou decompte.total moins remise.montant si remiseConditionnelle | oui |
| `penalitesMaintenues / renonciationPenalitesFutures / remiseConditionnelle` | enum | Choix du créancier. Maintien par défaut, une renonciation seulement sur choix exprès. Maintien bloqué tant que le moteur n'impute pas selon le point 3 | oui |
| `remise.montant / remise.objetLibelle` | montant / enum | Choix du créancier (par exemple « des indemnités forfaitaires »), seulement si remiseConditionnelle | non |
| `accord.delaiSoldePenalitesJours` | entier | MANQUANT : choix du créancier, seulement si penalitesMaintenues. Ce n'est pas une valeur juridique | non |
| `accord.delaiRegularisationJours` | entier | MANQUANT : choix du créancier. Aucune valeur légale trouvée | oui |
| `creance.referenceInterne` | texte | Dérivé : identifiant du dossier, sans nom du logiciel | oui |
| `signature.electronique / signature.papier / signature.lieu / signature.date` | booléen / texte / date | Canal choisi par le créancier ; lieu et date saisis sur l'original papier | oui |

## Mentions et leurs sources

| Mention | Obligatoire | Article | Extrait | Emplacement |
|---|---|---|---|---|
| La somme reconnue, écrite par le signataire du débiteur lui-même, en toutes lettres et en chiffres, à côté de sa signature ; les lettres l'emportent en cas de différence. Gardée par prudence : 1376 vise l'engagement d'« une seule partie », alors que cet accord engage aussi le créancier (1375 régit alors les originaux). La mention protège la partie « reconnaissance ». | oui | [Code civil, art. 1376 (en vigueur depuis le 01/10/2016), règle de preuve](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032037827/) | « « ne fait preuve que s'il comporte la signature de celui qui souscrit cet engagement ainsi que la mention, écrite par lui-même, de la somme ou de la quantité en toutes lettres et en chiffres » » | Bloc de signature du Débiteur |
| La mention n'a pas à être manuscrite si le procédé permet de s'assurer que le signataire en est l'auteur. Arrêt rendu sous l'ancien art. 1326 ; l'étendre à 1376 est une lecture de continuité | oui | [Cass. 1re civ., 13 mars 2008, n° 06-17.534 (publié, cassation, visa de l'ancien art. 1326)](https://www.legifrance.gouv.fr/juri/id/JURITEXT000018339458/) | « « n'est plus nécessairement manuscrite, elle doit alors résulter, selon la nature du support, d'un des procédés d'identification conforme aux règles qui gouvernent la signature électronique ou de tout autre procédé permettant de s'assurer que le signataire est le scripteur » » | Session de signature électronique : le débiteur tape la mention lui-même |
| Une mention exigée « de la main même » peut être apposée électroniquement si seul le signataire peut l'apposer. Ce texte vise les écrits exigés pour la validité, alors que 1376 est une règle de preuve : c'est un appui, pas le fondement. L'exception de 1175 ne vise que le droit de la famille et des successions | non | [Code civil, art. 1174 al. 2 (en vigueur depuis le 01/10/2016) ; art. 1175 (version en vigueur depuis le 01/01/2022)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032008860/) | « « Lorsqu'est exigée une mention écrite de la main même de celui qui s'oblige, ce dernier peut l'apposer sous forme électronique si les conditions de cette apposition sont de nature à garantir qu'elle ne peut être effectuée que par lui-même. » » | Session de signature électronique |
| Entre commerçants, pour un acte de commerce, la preuve est libre et la mention n'est pas exigée. Le gabarit la demande quand même, parce que le débiteur peut ne pas être commerçant | non | [Cass. 1re civ., 2 mai 2001, n° 98-23.080 (publié) ; C. com. L110-3 (en vigueur depuis le 21/09/2000) : « A l'égard des commerçants, les actes de commerce peuvent se prouver par tous moyens »](https://www.legifrance.gouv.fr/juri/id/JURITEXT000007044354) | « « l'article 1326 du Code civil ne s'applique pas lorsqu'il s'agit à l'égard de commerçants de prouver des actes de commerce » » | Justifie de garder la mention dans tous les cas |
| Contrat synallagmatique : sur papier, autant d'originaux que de parties, chaque original indiquant leur nombre ; en électronique, un exemplaire sur support durable pour chaque partie, avec un acte établi et conservé conformément aux art. 1366 et 1367 | oui | [Code civil, art. 1375 al. 2 et 4 (en vigueur depuis le 01/10/2016)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042416) | « « Chaque original doit mentionner le nombre des originaux qui en ont été faits. » ; « le procédé permet à chaque partie de disposer d'un exemplaire sur support durable ou d'y avoir accès. » » | Point 8 « Signature » |
| La signature électronique doit être un procédé fiable d'identification garantissant son lien avec l'acte. Seule la signature qualifiée est présumée fiable ; pour une signature avancée, la fiabilité se prouve | oui | [Décret n° 2017-1416 du 28/09/2017, art. 1 ; C. civ. 1367 al. 2 (en vigueur depuis le 01/10/2016, https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042456)](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000035676246) | « « La fiabilité d'un procédé de signature électronique est présumée, jusqu'à preuve du contraire, lorsque ce procédé met en œuvre une signature électronique qualifiée. » » | Choix du prestataire de signature |
| Ce qui se passe en cas d'échéance manquée doit être écrit dans l'accord : hors accord, la loi ne fait perdre le terme que pour des sûretés non fournies ou diminuées | oui | [Code civil, art. 1305-4 (en vigueur depuis le 01/10/2016)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032030675/) | « « Le débiteur ne peut réclamer le bénéfice du terme s'il ne fournit pas les sûretés promises au créancier ou s'il diminue celles qui garantissent l'obligation. » » | Point 5 « Défaut de paiement » |
| La perte du terme et le retour des pénalités ne jouent qu'après une mise en demeure restée sans effet, qui indique le délai pour régulariser. Pour une pénalité convenue, c'est la loi ; pour la perte du terme, c'est une prudence tirée d'un arrêt rendu sur un prêt à un emprunteur non commerçant | oui | [Code civil, art. 1231-5 al. 5 (en vigueur depuis le 01/10/2016) ; Cass. 1re civ., 22 juin 2017, n° 16-18.418 (publié, https://www.legifrance.gouv.fr/juri/id/JURITEXT000035005017/) : « sans la délivrance d'une mise en demeure restée sans effet, précisant le délai dont dispose le débiteur pour y faire obstacle »](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032009929/) | « « Sauf inexécution définitive, la pénalité n'est encourue que lorsque le débiteur est mis en demeure. » » | Point 5, et point 4 (renonciation privée d'effet) |
| Le créancier accepte expressément des paiements partiels, qu'il pourrait refuser | oui | [Code civil, art. 1342-4 (en vigueur depuis le 01/10/2016)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032035233/) | « « Le créancier peut refuser un paiement partiel même si la prestation est divisible. » » | Point 2 « Le Créancier accepte… » |
| L'ordre d'imputation des versements. La loi impute d'abord sur les intérêts, et le débiteur peut désigner la dette qu'il paie ; l'accord fixe l'ordre par écrit | non | [Code civil, art. 1343-1 et 1342-10 (en vigueur depuis le 01/10/2016)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032035233/) | « « Le paiement partiel s'impute d'abord sur les intérêts. » ; « Le débiteur de plusieurs dettes peut indiquer, lorsqu'il paie, celle qu'il entend acquitter. » » | Point 3 |
| Le paiement anticipé est ouvert au débiteur, qui bénéficie du terme | non | [Code civil, art. 1305-3 (en vigueur depuis le 01/10/2016)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032030675/) | « « La partie au bénéfice exclusif de qui le terme a été fixé peut y renoncer sans le consentement de l'autre. » » | Point 2, dernière phrase |
| Absence de novation : les factures d'origine subsistent, avec leurs accessoires | non | [Code civil, art. 1330 (en vigueur depuis le 01/10/2016)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042100) | « « La novation ne se présume pas ; la volonté de l'opérer doit résulter clairement de l'acte. » » | Point 7 |
| Mentions du créancier (numéro unique, RCS et ville du greffe, siège, forme, capital, EI le cas échéant), par prudence : document émanant du créancier et destiné à un tiers | oui | [Code de commerce, art. R123-237 (en vigueur depuis le 15/05/2022) et R123-238 (en vigueur depuis le 27/03/2007)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000005634379/LEGISCTA000006178891/) | « « Les actes et documents émanant de la société et destinés aux tiers, notamment les lettres, factures, annonces et publications diverses, indiquent la dénomination sociale, précédée ou suivie immédiatement et lisiblement » » | Comparution du Créancier |
| Pour information, jamais dans le texte : la reconnaissance interrompt la prescription, et l'interruption fait courir un nouveau délai de même durée. L'écran peut l'afficher comme un constat daté de la signature | non | [Code civil, art. 2240 (en vigueur depuis le 19/06/2008) ; art. 2231 (en vigueur depuis le 19/06/2008, https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000019017290) : « Elle fait courir un nouveau délai de même durée que l'ancien. »](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000019016790/) | « « La reconnaissance par le débiteur du droit de celui contre lequel il prescrivait interrompt le délai de prescription. » » | Écran de suivi, pas le document |

## Paramètres à ajouter au référentiel

| Clé | Valeur | Article | Extrait |
|---|---|---|---|
| `mentionSommeEcriteParLeSouscripteur` | true (somme en toutes lettres et en chiffres ; les lettres l'emportent en cas de différence) | [Code civil, art. 1376 (en vigueur depuis le 01/10/2016)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032037827/) | « « la mention, écrite par lui-même, de la somme ou de la quantité en toutes lettres et en chiffres » » |
| `mentionSommeNonManuscriteAdmise` | true, si le procédé établit que le signataire en est l'auteur | [Cass. 1re civ., 13 mars 2008, n° 06-17.534 (publié ; ancien art. 1326)](https://www.legifrance.gouv.fr/juri/id/JURITEXT000018339458/) | « « n'est plus nécessairement manuscrite, elle doit alors résulter […] de tout autre procédé permettant de s'assurer que le signataire est le scripteur de ladite mention » » |
| `mentionElectroniqueDeLaMainMeme` | true | [Code civil, art. 1174 al. 2 (en vigueur depuis le 01/10/2016)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032008860/) | « « ce dernier peut l'apposer sous forme électronique si les conditions de cette apposition sont de nature à garantir qu'elle ne peut être effectuée que par lui-même » » |
| `preuveLibreEntreCommercants` | true (actes de commerce, à l'égard des commerçants) | [Code de commerce, art. L110-3 (en vigueur depuis le 21/09/2000) ; Cass. 1re civ., 2 mai 2001, n° 98-23.080](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006219127) | « « A l'égard des commerçants, les actes de commerce peuvent se prouver par tous moyens à moins qu'il n'en soit autrement disposé par la loi. » » |
| `pluraliteOriginauxElectronique` | true : un exemplaire sur support durable par partie ; sur papier, nombre d'originaux mentionné | [Code civil, art. 1375 (en vigueur depuis le 01/10/2016)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042416) | « « Chaque original doit mentionner le nombre des originaux qui en ont été faits. » » |
| `presomptionFiabiliteSignatureQualifiee` | 'signature électronique qualifiée' | [Décret n° 2017-1416 du 28 septembre 2017, art. 1 ; C. civ. 1367 al. 2](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000035676246) | « « La fiabilité d'un procédé de signature électronique est présumée, jusqu'à preuve du contraire, lorsque ce procédé met en œuvre une signature électronique qualifiée. » » |
| `reconnaissanceInterromptPrescription` | true ; nouveau délai de même durée (URL corrigée : l'ancienne pointait vers la section 2250-2253) | [Code civil, art. 2240 (en vigueur depuis le 19/06/2008) ; art. 2231 sur https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000019017290 : « L'interruption efface le délai de prescription acquis. Elle fait courir un nouveau délai de même durée que l'ancien. »](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000019016790/) | « « La reconnaissance par le débiteur du droit de celui contre lequel il prescrivait interrompt le délai de prescription. » » |
| `decheanceTermeLegaleLimiteeAuxSuretes` | true : aucune perte du terme légale pour une échéance impayée | [Code civil, art. 1305-4 (en vigueur depuis le 01/10/2016)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032030675/) | « « Le débiteur ne peut réclamer le bénéfice du terme s'il ne fournit pas les sûretés promises au créancier ou s'il diminue celles qui garantissent l'obligation. » » |
| `penaliteConvenueApresMiseEnDemeure` | true ; modérable par le juge | [Code civil, art. 1231-5 al. 5 (en vigueur depuis le 01/10/2016)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032009929/) | « « Sauf inexécution définitive, la pénalité n'est encourue que lorsque le débiteur est mis en demeure. » » |
| `decheanceTermeApresMiseEnDemeure` | true, sauf clause expresse et non équivoque (arrêt rendu sur un prêt à un emprunteur non commerçant ; appliqué ici par prudence) | [Cass. 1re civ., 22 juin 2017, n° 16-18.418 (publié ; visa des anciens art. 1134 et 1184)](https://www.legifrance.gouv.fr/juri/id/JURITEXT000035005017/) | « « celle-ci ne peut, sauf disposition expresse et non équivoque, être déclarée acquise au créancier, sans la délivrance d'une mise en demeure restée sans effet, précisant le délai dont dispose le débiteur pour y faire obstacle » » |
| `clauseAbusiveContratAdhesion` | true | [Code civil, art. 1171 (en vigueur depuis le 01/10/2018) ; définition à l'art. 1110 al. 2 (https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036829815)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036829836) | « « Dans un contrat d'adhésion, toute clause non négociable, déterminée à l'avance par l'une des parties, qui crée un déséquilibre significatif entre les droits et obligations des parties au contrat est réputée non écrite. » » |
| `desequilibreSignificatifEntreProfessionnels` | true | [Code de commerce, art. L442-1 I 2° (version en vigueur depuis le 20/08/2026, loi n° 2026-796 du 18 août 2026, art. 54)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000047381704) | « « De soumettre ou de tenter de soumettre l'autre partie à des obligations créant un déséquilibre significatif dans les droits et obligations des parties » » |
| `refusPaiementPartielPossible` | true | [Code civil, art. 1342-4 (en vigueur depuis le 01/10/2016)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032035233/) | « « Le créancier peut refuser un paiement partiel même si la prestation est divisible. » » |
| `imputationPaiementPartiel` | intérêts d'abord (1343-1) ; entre plusieurs dettes : désignation par le débiteur, sinon dettes échues, plus d'intérêt à acquitter, plus ancienne, prorata (1342-10) | [Code civil, art. 1343-1 et 1342-10 (en vigueur depuis le 01/10/2016)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000032035233/) | « « Le paiement partiel s'impute d'abord sur les intérêts. » ; « A défaut d'indication par le débiteur, l'imputation a lieu comme suit : d'abord sur les dettes échues » » |
| `novationNonPresumee` | true | [Code civil, art. 1330 (en vigueur depuis le 01/10/2016)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042100) | « « La novation ne se présume pas ; la volonté de l'opérer doit résulter clairement de l'acte. » » |
| `transactionEcriteEtEffet` | écrit exigé ; fait obstacle à une action ayant le même objet | [Code civil, art. 2044 et 2052 (en vigueur depuis le 20/11/2016)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000006118164/) | « « La transaction est un contrat par lequel les parties, par des concessions réciproques, terminent une contestation née, ou préviennent une contestation à naître. Ce contrat doit être rédigé par écrit. » » |
| `remiseDeDette` | contrat (accord des deux parties) | [Code civil, art. 1350 (en vigueur depuis le 01/10/2016)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032042217) | « « La remise de dette est le contrat par lequel le créancier libère le débiteur de son obligation. » » |
| `titresExecutoiresListeFermee` | liste fermée ; un accord sous signature privée n'y figure pas | [Code des procédures civiles d'exécution, art. L111-3 (en vigueur depuis le 25/04/2026, loi n° 2026-307, art. 2)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000036891163) | « « Seuls constituent des titres exécutoires : 1° Les décisions des juridictions de l'ordre judiciaire ou de l'ordre administratif lorsqu'elles ont force exécutoire, ainsi que les accords auxquels ces juridictions ont conféré force exécutoire » » |
| `renonciationPrescriptionAcquise` | seule une prescription acquise peut faire l'objet d'une renonciation ; renonciation tacite si elle est sans équivoque | [Code civil, art. 2250 et 2251 (en vigueur depuis le 19/06/2008)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070721/LEGISCTA000006118187/) | « « Seule une prescription acquise est susceptible de renonciation. » ; « La renonciation tacite résulte de circonstances établissant sans équivoque la volonté de ne pas se prévaloir de la prescription. » » |
| `amendePenalitesNonConformes` | amende administrative plafonnée à 75 000 € (personne physique) et 2 000 000 € (personne morale) | [Code de commerce, art. L441-16 c) (en vigueur depuis le 01/11/2021, ordonnance n° 2021-859)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043750778) | « « Est passible d'une amende administrative dont le montant ne peut excéder 75 000 € pour une personne physique et deux millions d'euros pour une personne morale, le fait de : » » |
| `interdictionPaiementProcedureCollective` | true : suspend le suivi de l'échéancier dès l'ouverture | [Code de commerce, art. L622-7 I (en vigueur depuis le 01/10/2021)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044052577) | « « Le jugement ouvrant la procédure emporte, de plein droit, interdiction de payer toute créance née antérieurement au jugement d'ouverture, à l'exception du paiement par compensation de créances connexes. » » |
| `arretPoursuitesProcedureCollective` | true | [Code de commerce, art. L622-21 I (en vigueur depuis le 01/10/2021)](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044052603) | « « Le jugement d'ouverture interrompt ou interdit toute action en justice de la part de tous les créanciers […] tendant : 1° A la condamnation du débiteur au paiement d'une somme d'argent » » |

## Interdits

- Préremplir la mention de la somme, ou la faire valider par une case à cocher : elle doit être écrite par le signataire (C. civ. 1376 ; Cass. 1re civ., 13/03/2008). Finaliser un accord dont la somme en lettres, la somme en chiffres et le total reconnu ne concordent pas.
- Faire perdre le terme automatiquement dès le premier retard, sans mise en demeure indiquant un délai (C. civ. 1231-5 al. 5 ; Cass. 1re civ., 22/06/2017, n° 16-18.418, par prudence). Envoyer la mise en demeure du point 5 sans validation de CE document par le créancier.
- Ajouter une clause pénale, une indemnité forfaitaire par versement manqué, une capitalisation des intérêts ou tout autre montant absent du décompte figé. Une pénalité convenue est modérable par le juge (1231-5 al. 2).
- Toute clause déséquilibrée dans un texte non négociable : elle serait « réputée non écrite » (C. civ. 1171, contrat d'adhésion au sens de 1110) et exposerait à L442-1 I 2° du code de commerce (version en vigueur depuis le 20/08/2026 : « De soumettre ou de tenter de soumettre l'autre partie à des obligations créant un déséquilibre significatif »).
- Ajouter une caution, une sûreté, une clause attributive de juridiction ou d'arbitrage, ou toute autre clause rédigée hors du gabarit fixe : ce serait rédiger un acte au-delà des faits et des calculs (loi 71-1130, art. 54).
- Qualifier l'accord de « transaction », ou faire renoncer le débiteur « à toute contestation » ou « à toute action » : la transaction « fait obstacle à l'introduction ou à la poursuite entre les parties d'une action en justice ayant le même objet » (C. civ. 2044, 2052).
- Présenter l'accord comme un titre exécutoire, ou dire qu'il permet de saisir sans jugement (CPCE L111-3, version en vigueur depuis le 25/04/2026, liste fermée).
- Énoncer dans le texte les effets juridiques de l'accord (prescription, interruption, renonciation) : le texte constate, il ne raisonne pas.
- Activer une renonciation aux pénalités ou une remise par défaut, ou sur suggestion de l'agent : seul un choix exprès du créancier les active (règle du projet ; voir le point ouvert sur L441-16 c).
- Continuer le suivi des échéances, envoyer la mise en demeure du point 5 ou compter un versement comme libératoire après un jugement d'ouverture : C. com. L622-7 I (« interdiction de payer toute créance née antérieurement au jugement d'ouverture ») et L622-21 I (« interrompt ou interdit toute action en justice ») ; suspension de relance.ts.
- Écrire une valeur juridique en dur (taux, montant de 40 €, délai, article) : tout passe par {{param.*}} ou par le décompte figé.
- Toute mention de Letikette, tout versement ou retour de document vers un autre destinataire que le créancier, toute négociation menée par Letikette (note du 25/09, § 2.A).
- Le mot « garantie » dans le texte du gabarit ou à l'écran.

## Points ouverts

- CORRECTIONS: (1) le paramètre reconnaissanceInterromptPrescription pointait vers LEGISCTA000006118187, la section « De la renonciation à la prescription » (2250 à 2253), qui ne contient ni 2231 ni 2240. URL corrigées : 2240 sur LEGISCTA000019016790, 2231 sur LEGIARTI000019017290, relus ce jour ; (2) la mention « pour information » citait 2231 sans URL qui le contienne : URL ajoutée ; (3) point 3 : l'ordre d'imputation était ambigu (toutes les pénalités d'abord, ou facture par facture ?). Il est précisé : facture par facture, de la plus ancienne à la plus récente ; (4) point 4 A : {{decompte.fondementTaux}} n'existe pas au décompte figé, remplacé par « le taux retenu pour cette facture dans le décompte annexé » ; (5) comparution : « soussignées » devient « soussignés », « représentée par » devient « agissant par », forme et EI selon R123-237 et R123-238, RCS seulement si immatriculé, locataire-gérant ; (6) interdit ajouté sur la procédure collective ouverte pendant l'échéancier (L622-7 I, L622-21 I, lus ce jour) ; (7) la mention 1376 est gardée « par prudence » : 1376 vise l'engagement d'une seule partie, et cet accord est bilatéral ; (8) dates des factures absentes du décompte figé : marquées MANQUANT ; (9) contrôle bloquant ajouté : l'option « pénalités maintenues » attend un moteur qui impute selon le point 3 ; (10) résumé : « vous le relancez » devient « vous pouvez lui écrire en recommandé », pour ne rien prescrire.
- Vérifié dans cette session le 25/09/2026, sur la page source : C. civ. 1110, 1171, 1174, 1175, 1231-5, 1305-3, 1305-4, 1305-5, 1330, 1342-4, 1342-10, 1343-1, 1350, 1367, 1372 à 1377, 2044, 2052, 2231, 2240, 2250 à 2253 ; décret n° 2017-1416 ; C. com. L110-3, L441-16 (version du 01/11/2021, ordonnance n° 2021-859), L442-1 (version du 20/08/2026, loi n° 2026-796 du 18/08/2026, art. 54), L622-7 et L622-21 (versions du 01/10/2021) ; CPCE L111-3 ; Cass. 1re civ. 02/05/2001, 13/03/2008, 22/06/2017. Tous les extraits cités sont présents sur leur page.
- Imputation : le moteur (`principalAu` dans decompte.ts) déduit chaque règlement du principal, alors que le point 3 impute d'abord sur les pénalités. Tant que l'écart demeure, le décompte final de l'option A contredirait l'accord signé. Il faut choisir : aligner le moteur sur le point 3, ou réécrire le point 3 sur le moteur, ce qui est une renonciation du créancier à 1343-1.
- Renoncer aux pénalités (options B et C) : L441-16 c) punit d'une amende administrative (75 000 € pour une personne physique, deux millions d'euros pour une personne morale) le fait de « Fixer un taux ou des conditions d'exigibilité des pénalités de retard non conformes aux prescriptions du II de l'article L. 441-10 ». Aucune source lue ne dit si une renonciation conditionnelle consentie après le retard revient à « fixer un taux ». Les fiches de la DGCCRF n'ont pas pu être lues.
- Pour la mention de la somme en électronique, l'appui est un arrêt de 2008 rendu sur l'ancien art. 1326. L'appliquer à 1376 est une lecture de continuité. Le niveau de signature reste à choisir : l'avancée n'a pas de présomption de fiabilité, la qualifiée l'a (décret n° 2017-1416, art. 1). L'art. 1366 n'a pas été relu dans cette session.
- L'ordre d'imputation du point 3 déroge à 1342-10 (le débiteur désigne « lorsqu'il paie ») : l'accord signé suffit-il à le désigner d'avance ? L'indemnité de 40 € est-elle un « intérêt » au sens de 1343-1 ? Ces deux questions restent ouvertes.
- Si le créancier renonce à une partie des sommes et que le débiteur reconnaît le reste, l'accord pourrait être requalifié en transaction (2044), avec l'effet de 2052 sur les sommes abandonnées. Rendre la renonciation conditionnelle limite ce risque sans le trancher.
- Un accord signé après la date limite pour agir en justice relève de la renonciation à la prescription (2250 : « Seule une prescription acquise est susceptible de renonciation » ; 2251). Il faut décider si le produit affiche un constat, bloque, ou laisse faire.
- Les pénalités futures (option A) ne se projettent pas : le taux des semestres à venir n'est pas publié, et la règle du projet interdit d'extrapoler. Elles se règlent donc par un décompte final à la date du dernier versement.
- Le gabarit est déterminé à l'avance par le créancier : c'est un contrat d'adhésion (1110 al. 2), et chaque clause doit rester équilibrée (1171). Aucune source lue ne dit si un échéancier conclu après un retard relève de L442-1 (« de la conclusion ou de l'exécution d'un contrat »).
- Le prestataire de signature électronique doit envoyer ses e-mails et afficher ses écrans au seul nom du créancier. C'est à vérifier auprès du prestataire, pas d'un avocat.
- Le pouvoir du signataire du débiteur n'est pas vérifié : les dirigeants inscrits au RNE ne sont pas stockés. Il faut les lire au RNE et comparer, sans rien inventer.
- Les extraits de 1174, 1367 et 1305-4 contiennent « garantir », « garantissant » et « garantissent ». S'ils sont recopiés dans parametres.ts, le test anti-« garantie » ne doit balayer que l'interface et les gabarits.
- Les mêmes lacunes du profil créancier que pour la mise en demeure s'appliquent : capital, RCS et ville du greffe, EI, locataire-gérant, créancier inscrit au RNE sans RCS.
- `valideParAvocat` reste à false : ni ce gabarit ni aucune de ses sources n'a été relu par un juriste. Le choix entre `exiger()` et `exigerPourActe()` se pose ici plus nettement encore : c'est un acte sous signature privée.
