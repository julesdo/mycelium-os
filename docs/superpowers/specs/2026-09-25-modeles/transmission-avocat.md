# Transmission du dossier à votre avocat

**Destinataire** : L'avocat choisi et désigné par le créancier. Si l'avocat vient d'un annuaire de Letikette, voir les points ouverts (RIN 19.4.2).  
**Canal** : E-mail envoyé depuis la messagerie du créancier, avec les pièces jointes ou un lien vers un espace partagé. Les réponses vont à l'adresse du créancier. Jamais depuis un domaine, une adresse ou un compte Letikette. Pas d'adresse de réponse par dossier tant que la question du secret n'est pas tranchée.

## Ce que lit le gérant avant de valider

Cette lettre envoie tout votre dossier à votre avocat : les projets de courrier, le calcul de ce que votre client vous doit, vos documents et les dates à surveiller.
Elle lui dit que rien n'est encore parti, que les projets ont été remplis par le logiciel, et qu'il peut tout changer ou tout écarter.
Ses honoraires se règlent entre vous et lui : Letikette n'y a aucune part.
Il vous répondra directement, à votre adresse.

## Texte du modèle

```text
{{#si mention.confidentiel}}Confidentiel : correspondance entre un client et son avocat

{{/si}}{{creancier.denomination}}
{{creancier.formeJuridique}}{{#si creancier.siren}}, SIREN {{creancier.siren}}{{/si}}
{{creancier.adresseSiege}}

{{avocat.nom}}{{#si avocat.cabinet}}, {{avocat.cabinet}}{{/si}}
{{#si avocat.adresse}}{{avocat.adresse}}
{{/si}}
À {{creancier.communeSiege}}, le {{envoi.date}}

Objet : créance de {{creancier.denomination}} sur {{debiteur.denomination}}, transmission du dossier pour examen

Maître,

Je vous transmets le dossier de la créance de la société {{creancier.denomination}} sur la société {{debiteur.denomination}}{{#si debiteur.formeJuridique}}, {{debiteur.formeJuridique}}{{/si}}{{#si debiteur.siren}}, SIREN {{debiteur.siren}}{{/si}}, dont le siège social inscrit au registre, relevé le {{debiteur.dateLectureRegistre}}, est situé {{debiteur.adresseSiege}}. Je vous remercie de bien vouloir l'examiner.

1. Les sommes en cause

{{#chaque factures}}- facture {{reference}} émise le {{dateEmission}}, exigible le {{dateExigibilite}} : {{montantTTC | euros}} TTC, reste dû {{resteDu | euros}}
{{/chaque}}
Décompte arrêté au {{decompte.arreteAu}} : principal {{decompte.principal | euros}}, intérêts de retard {{decompte.interets | euros}}, indemnités forfaitaires de recouvrement {{decompte.indemnites | euros}} (sur {{decompte.nombreIndemnites}} facture(s)), soit un total de {{decompte.total | euros}}. Le décompte joint détaille le calcul facture par facture et période par période, et cite ses fondements.

{{#chaque piece.horsDecompte}}{{.}}
{{/chaque}}
2. Les démarches accomplies

{{#si etapesAccomplies}}{{#chaque etapesAccomplies}}- le {{date}} : {{libelle}}{{#si preuve}} (preuve : {{preuve}}){{/si}}
{{/chaque}}{{#sinon}}Aucune démarche n'a été engagée à ce jour auprès du débiteur ni auprès d'une juridiction.
{{/si}}{{#si procedureCollective}}Le Bulletin officiel des annonces civiles et commerciales a publié le {{procedureCollective.dateParution}} une annonce concernant le débiteur, relative à un jugement du {{procedureCollective.dateJugement}}, sous l'intitulé « {{procedureCollective.type}} »{{#si procedureCollective.mandataire}} ; l'annonce nomme {{procedureCollective.mandataire.nom}}, {{procedureCollective.mandataire.adresse}}{{/si}}.
{{/si}}
Aucun des projets joints n'a été envoyé.

3. Les échéances relevées dans le dossier

Les dates ci-dessous ont été calculées automatiquement à partir des textes cités et des informations du dossier, selon {{param.computationDelaisMois.source}}, sans le report prévu par {{param.reportDelaiJourNonOuvrable.source}}. Aucun juriste ne les a contrôlées.

{{#si calcul.prescriptions}}- Date limite pour agir en justice, calculée pour chaque facture sans tenir compte d'aucun événement qui aurait pu interrompre ou suspendre ce délai :
{{#chaque calcul.prescriptions}}  - facture {{reference}} : {{date}}, calculée depuis le {{pointDeDepart}} ; {{#si regime.hypothese}}hypothèse : le secteur d'activité n'étant pas connu, le délai le plus court relevé ({{regime.dureeAnnees | annees}}) a été retenu{{#sinon}}fondement : {{regime.source}}{{/si}}
{{/chaque}}{{/si}}{{#si procedure.ordonnance}}- Ordonnance portant injonction de payer rendue le {{procedure.ordonnance.date}} par {{procedure.ordonnance.juridiction}}, n° {{procedure.ordonnance.numero}}{{#si procedure.signification}}.{{#sinon}} : non avenue si elle n'est pas signifiée dans les {{regime.delaiSignification.valeur}} mois de sa date ({{regime.delaiSignification.source}}), soit au plus tard le {{calcul.dateLimiteSignification}}.{{/si}}
{{/si}}{{#si procedure.signification}}- Signification effectuée le {{procedure.signification.date}} par {{procedure.signification.etude}} ({{procedure.signification.mode}}). Délai d'opposition : {{param.delaiOppositionInjonction.valeur}} mois à compter de la signification ({{param.delaiOppositionInjonction.source}}).
{{#si calcul.opposition.motif == 'CALCULABLE'}}  Ce délai ne s'achève pas avant le {{calcul.dateFinOpposition}}.
{{/si}}{{#si calcul.opposition.motif == 'PAS_A_PERSONNE'}}  La signification n'ayant pas été faite à personne, le délai peut courir au-delà ({{param.delaiOppositionInjonctionProrogee.source}}) : aucune date de fin n'est calculée.
{{/si}}{{#si calcul.opposition.motif == 'HORS_METROPOLE'}}  Le débiteur ou la juridiction n'étant pas situé en France métropolitaine, le délai peut être différent ({{param.augmentationDelaiOppositionOutreMer.source}}) : aucune date de fin n'est calculée.
{{/si}}{{#si calcul.opposition.motif == 'MODE_INCONNU'}}  Le mode de signification n'étant pas renseigné, aucune date de fin n'est calculée.
{{/si}}{{/si}}{{#si procedure.opposition}}- Opposition formée le {{procedure.opposition.date}}.
{{/si}}
4. Le contenu du dossier

{{#chaque projets}}- Projet non envoyé : {{titre}} (modèle « {{gabarit.cle}} », version {{gabarit.version}}, préparé le {{datePreparation}})
{{/chaque}}- Décompte de créance arrêté au {{decompte.arreteAu}}
- Bordereau des pièces
{{#chaque pieces}}- Pièce n° {{numero}} : {{intitule}}
{{/chaque}}{{#si registres}}- Relevés des registres publics : {{registres}}
{{/si}}
5. La préparation des projets

Les projets joints ont été établis avec un logiciel de gestion des créances, à partir de modèles de rédaction fixes. Seuls les faits et les calculs du dossier y ont été insérés automatiquement : identités, références des factures, montants, dates et calcul des intérêts. Ni ces modèles ni leur contenu n'ont été relus par un avocat. Vous êtes libre de les modifier, de les réécrire entièrement ou de ne pas les utiliser.

6. Ce qui reste à décider

Aucune des démarches ci-dessous n'est engagée. Elles sont présentées dans l'ordre où elles pourraient intervenir, sans ordre de préférence :
{{#chaque decisionsEnAttente}}- {{libelle}}
{{/chaque}}- ne donner aucune suite pour le moment.

Je souhaite connaître votre avis avant toute suite. Si vous acceptez de vous charger de ce dossier, l'étendue de votre mission et vos conditions d'intervention, notamment vos honoraires, sont à convenir directement entre nous.

Vous pouvez me joindre directement : {{creancier.representantLegal.nom}}, {{creancier.representantLegal.qualite}}, {{creancier.email}}{{#si creancier.telephone}}, {{creancier.telephone}}{{/si}}. Je vous remercie de me répondre à cette adresse.

Je vous prie d'agréer, Maître, l'expression de mes salutations distinguées.

{{creancier.representantLegal.nom}}
{{creancier.representantLegal.qualite}} de {{creancier.denomination}}
{{signature}}
```

## Variables

| Variable | Type | Source dans Letikette | Obligatoire |
|---|---|---|---|
| `mention.confidentiel` | booleen | Réglage du gabarit, activé par défaut (loi 71-1130 art. 66-5) | non |
| `creancier.denomination / formeJuridique / siren / adresseSiege / communeSiege` | texte | Profil créancier (la commune est tirée de l'adresse du siège) | oui |
| `creancier.representantLegal.nom / qualite` | texte | creancier.représentant légal, nom et qualité | oui |
| `creancier.email` | email | creancier.e-mail. Adresse de réponse (contact direct) | oui |
| `creancier.telephone` | texte | creancier.téléphone | non |
| `avocat.nom` | texte | MANQUANT : saisi par le gérant quand il désigne son avocat. Jamais affiché hors du dossier de ce client | oui |
| `avocat.cabinet` | texte | MANQUANT : saisi par le gérant | non |
| `avocat.adresse` | texte | MANQUANT : saisie par le gérant | non |
| `avocat.email` | email | MANQUANT : saisi par le gérant (destinataire de l'e-mail) | oui |
| `debiteur.denomination / formeJuridique / siren / adresseSiege` | texte | Débiteur, siège lu au RCS/RNE | oui |
| `debiteur.dateLectureRegistre` | date | MANQUANT : date de lecture du RCS/RNE, à stocker avec l'adresse | oui |
| `factures[]` | liste | factures : référence, date d'émission, date d'exigibilité, montant TTC, reste dû (centimes bigint) | oui |
| `decompte.arreteAu / principal / interets / indemnites / total` | montants | Décompte figé (DecompteFige de piece.ts), jamais recalculé | oui |
| `decompte.nombreIndemnites` | entier | Décompte figé : nombre de lignes dont indemniteForfaitaire est non nulle. Le montant unitaire n'est PAS relu dans parametres.ts : il pourrait différer de celui du décompte figé | oui |
| `piece.horsDecompte` | liste | composerPiece(decompte).horsDecompte (controle.ts). Jamais vide : dit « rien » quand rien n'est écarté | oui |
| `etapesAccomplies[]` | liste | evenementsProcedure et table envois (à créer) : date, libellé, preuve (dépôt, AR, acte) | non |
| `procedureCollective` | objet | Annonce lue au BODACC : type cité mot pour mot (jamais reformulé, comme relance.ts), date du jugement, date de parution, mandataire ou liquidateur (nom et adresse) | non |
| `calcul.prescriptions[] (reference, date, pointDeDepart, regime.source, regime.hypothese, regime.dureeAnnees)` | liste | pays/france/prescription.ts : prescriptionDe([exigibilité, échéance], secteur) et regimePrescription(secteur). pointDeDepart = le candidat effectivement retenu. Une facture sans date calculable est omise et le dit dans l'écran, pas dans la lettre | non |
| `procedure.ordonnance (date, juridiction, numero)` | objet | procedure.ordonnance | non |
| `regime.delaiSignification / calcul.dateLimiteSignification` | parametre+date | Même calcul que pour le gabarit demande-signification (bascule par la date de l'ordonnance, CPC 641 sans report). Affiché seulement si l'ordonnance n'est pas encore signifiée | non |
| `procedure.signification (date, etude, mode)` | objet | procedure.signification | non |
| `calcul.opposition.motif` | enum | Règle fixe : 'MODE_INCONNU' si mode absent ; 'PAS_A_PERSONNE' si la signification n'a pas été faite à personne (CPC 1416 al. 2) ; 'HORS_METROPOLE' si l'adresse du débiteur ou le siège de la juridiction n'est pas en France métropolitaine (CPC 643) ; sinon 'CALCULABLE' | non |
| `param.delaiOppositionInjonction / calcul.dateFinOpposition` | parametre+date | PARAMÈTRE À AJOUTER (CPC 1416 al. 1). Date selon CPC 641 al. 2, sans report de 642 : présentée comme « ne s'achève pas avant », car le vrai terme peut être plus tardif | non |
| `param.delaiOppositionInjonctionProrogee / param.augmentationDelaiOppositionOutreMer` | parametre | PARAMÈTRES À AJOUTER (CPC 1416 al. 2 ; CPC 643). Seule leur source est affichée | non |
| `param.computationDelaisMois / param.reportDelaiJourNonOuvrable` | parametre | PARAMÈTRES À AJOUTER, définis au gabarit demande-signification (CPC 641, 642). Seule leur source est affichée | oui |
| `procedure.opposition` | objet | procedure.opposition (date) | non |
| `projets[] (titre, gabarit.cle, gabarit.version, datePreparation)` | liste | Table envois (à créer), état « Projet » avec le nom et la version du gabarit | oui |
| `pieces[] (numero, intitule)` | liste | pièces : bons de commande, bons de livraison, CGV, échanges, numérotées comme au bordereau | oui |
| `registres` | texte | Relevés RCS/RNE et BODACC avec leur date de lecture | non |
| `decisionsEnAttente[]` | liste | Démarches préparées et non engagées, dans l'ordre chronologique fixe du parcours, sans classement (ligne rouge n° 3). La dernière ligne, « ne donner aucune suite pour le moment », est fixe | oui |
| `envoi.date / signature` | date+signature | Validation par le gérant (table envois, à créer) | oui |

## Mentions et leurs sources

| Mention | Obligatoire | Article | Extrait | Emplacement |
|---|---|---|---|---|
| [Projet] Identification précise du client et de son représentant légal. Obligation de l'avocat, non de la lettre : la lettre lui en donne les moyens | oui | [RIN (CNB), art. 1.5 (relu le 25/09/2026)](https://www.cnb.avocat.fr/rin/titre-premier-des-principes) | « « la prudence impose à l'avocat de ne pas conseiller à son client une solution s'il n'est pas en mesure [...] d'identifier précisément son client. » » | En-tête et signature |
| [Projet] Identité du débiteur, pour que l'avocat vérifie l'absence de conflit d'intérêts | oui | [Décret n° 2023-552 du 30 juin 2023, art. 7 (en vigueur depuis le 03/07/2023) ; RIN art. 4.1 (même phrase, relue)](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000047774060/) | « « L'avocat ne peut être ni le conseil ni le représentant ou le défenseur de plus d'un client dans une même affaire s'il y a conflit entre les intérêts de ses clients » » | Premier paragraphe |
| [Projet] Coordonnées directes du client, et réponse attendue à son adresse. L'art. 19.3 vise l'avocat qui fournit des prestations en ligne ; le gabarit le respecte dans tous les cas | oui | [RIN (CNB), art. 19.3 (relu)](https://www.cnb.avocat.fr/rin/titre-cinquieme-prestations-juridiques-en-ligne) | « « doit toujours être en mesure d'entrer personnellement et directement en relation avec l'internaute » » | Avant-dernier paragraphe |
| [Projet] Projets préparés par un logiciel, à partir de modèles fixes remplis de faits et de calculs, non relus par un avocat ; l'avocat peut tout modifier ou tout écarter | oui | [Décret n° 2023-552, art. 9 (en vigueur depuis le 03/07/2023)](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000047774060/) | « « L'avocat rédacteur d'un acte juridique assure la validité et la pleine efficacité de l'acte selon les prévisions des parties. » » | Section 5 |
| [Projet] Transparence sur le remplissage : c'est le logiciel, et non le client, qui a rempli les modèles | oui | [CA Paris, pôle 2 ch. 1, 6 novembre 2018, n° 17/04957. Texte publié par Legalis (presse juridique), non trouvé sur les bases officielles ; relu le 25/09/2026](https://www.legalis.net/jurisprudences/cour-dappel-de-paris-pole-2-ch-1-arret-du-6-novembre-2018/) | « « la lettre de mise en demeure n'est pas remplie par la société Demander Justice qui en fournit seulement un modèle, de sorte qu'il n'est pas possible de lui faire grief, ce faisant, de rédiger un acte juridique » » | Section 5 : dire que le remplissage est automatique, ne jamais le cacher |
| [Projet] Aucune des démarches préparées n'est engagée ; la mission de l'avocat est à définir entre lui et le client | oui | [Décret n° 2023-552, art. 8 (en vigueur depuis le 03/07/2023)](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000047774060/) | « « L'avocat est le mandataire naturel de son client, personne physique ou morale, en matière de conseil, de rédaction d'actes et de contentieux. L'avocat doit justifier d'un mandat écrit sauf dans les cas où la loi ou le règlement en présume l'existence. » » | Sections 2 et 6 |
| [Projet] Honoraires convenus directement entre l'avocat et le client. Même phrase lue à l'art. 10 al. 3 de la loi n° 71-1130 (version en vigueur depuis le 05/08/2026, loi n° 2026-725), avec des extractions discordantes : voir points ouverts | oui | [Décret n° 2023-552, art. 10 (en vigueur depuis le 03/07/2023)](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000047774060/) | « « l'avocat conclut par écrit avec son client une convention d'honoraires, qui précise, notamment, le montant ou le mode de détermination des honoraires couvrant les diligences prévisibles » » | Section 6 |
| [Projet, ligne rouge n° 2] Aucun lien financier entre l'avocat et un tiers. Voir aussi RIN 11.4 (relu) : « Il est interdit à l'avocat de partager un honoraire quelle qu'en soit la forme avec des personnes physiques ou morales qui ne sont pas avocats. » | oui | [RIN (CNB), art. 11.3 (relu) ; décret n° 2023-552, art. 10, dernière phrase](https://www.cnb.avocat.fr/rin/titre-deuxieme-des-activites) | « « L'avocat ne peut percevoir d'honoraires que de son client ou d'un mandataire de celui-ci. La rémunération d'apports d'affaires est interdite. » » | Section 6 (« directement entre nous ») et interdits |
| [Facultatif] Mention « Confidentiel : correspondance entre un client et son avocat ». Le secret s'applique que la mention figure ou non | non | [Loi n° 71-1130, art. 66-5 (version en vigueur depuis le 30/03/2011, loi n° 2011-331) ; RIN art. 2.2 (relu : « quels qu'en soient les supports, matériels ou immatériels »)](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000023780802) | « « les correspondances échangées entre le client et son avocat [...] et, plus généralement, toutes les pièces du dossier sont couvertes par le secret professionnel. » » | Première ligne |
| [Projet] Décompte détaillé des éléments de la créance et bordereau des pièces, réutilisables si une requête est déposée | oui | [CPC art. 1407 (en vigueur depuis le 01/03/2022)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/) | « « la requête contient l'indication précise du montant de la somme réclamée avec le décompte des différents éléments de la créance, le fondement de celle-ci ainsi que le bordereau des documents justificatifs » » | Sections 1 et 4 |
| [Projet] Échéances données avec leur source, présentées comme calculées et non contrôlées ; fin du délai d'opposition calculée seulement dans le cas simple (signification à personne, en métropole), et présentée comme un minimum | oui | [CPC art. 1416 al. 1 et 2 (en vigueur depuis le 01/01/1982) ; CPC art. 643 (en vigueur depuis le 11/05/2017) ; CPC art. 1411 (deux régimes)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/) | « « L'opposition est formée dans le mois qui suit la signification de l'ordonnance. Toutefois, si la signification n'a pas été faite à personne, l'opposition est recevable jusqu'à l'expiration du délai d'un mois suivant le premier acte signifié à personne » » | Section 3 |
| [Calcul] Dates calculées au même quantième, sans le report au premier jour ouvrable (jours fériés non relevés), et dites telles | oui | [CPC art. 641 al. 2 et 642 al. 2 (en vigueur depuis le 01/01/1976)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006135898/) | « « Le délai qui expirerait normalement un samedi, un dimanche ou un jour férié ou chômé est prorogé jusqu'au premier jour ouvrable suivant. » » | Section 3, premier paragraphe |
| [Projet] Date de prescription calculée sans aucune cause d'interruption ou de suspension, et jamais présentée comme repoussée par une mise en demeure. L'arrêt porte sur des loyers et juge la liste des causes d'interruption limitative | oui | [Cass. com., 18 mai 2022, n° 20-23.204 (publié au Bulletin, cassation partielle), relu le 25/09/2026](https://www.legifrance.gouv.fr/juri/id/JURITEXT000045822952) | « « Une mise en demeure, fût-elle envoyée par lettre recommandée avec demande d'avis de réception, n'interrompt pas le délai de prescription de l'action en paiement des loyers. » » | Section 3, ligne « Date limite pour agir en justice » |

## Paramètres à ajouter au référentiel

| Clé | Valeur | Article | Extrait |
|---|---|---|---|
| `delaiOppositionInjonction` | 1 (mois), nature CONSTANTE, unite 'mois', point de départ : la signification | [CPC art. 1416 al. 1 (en vigueur depuis le 01/01/1982)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/) | « « L'opposition est formée dans le mois qui suit la signification de l'ordonnance. » » |
| `delaiOppositionInjonctionProrogee` | 1 (mois), nature CONSTANTE, unite 'mois', point de départ : le premier acte signifié à personne ou, à défaut, la première mesure d'exécution rendant les biens indisponibles, quand la signification n'a pas été faite à personne | [CPC art. 1416 al. 2 (en vigueur depuis le 01/01/1982)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006149784/) | « « si la signification n'a pas été faite à personne, l'opposition est recevable jusqu'à l'expiration du délai d'un mois suivant le premier acte signifié à personne ou, à défaut, suivant la première mesure d'exécution » » |
| `augmentationDelaiOppositionOutreMer` | 1 (mois), nature CONSTANTE, unite 'mois'. Juridiction en métropole, personne qui demeure dans les territoires énumérés. Application à l'opposition à injonction de payer par l'art. 645, non relu | [CPC art. 643, 1 (en vigueur depuis le 11/05/2017)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006135898/) | « « Lorsque la demande est portée devant une juridiction qui a son siège en France métropolitaine, les délais de comparution, d'appel, d'opposition [...] sont augmentés de : 1. Un mois pour les personnes qui demeurent en Guadeloupe [...] » » |
| `augmentationDelaiOppositionEtranger` | 2 (mois), nature CONSTANTE, unite 'mois'. Juridiction en métropole, personne qui demeure à l'étranger. Même réserve sur l'art. 645 | [CPC art. 643, 2 (en vigueur depuis le 11/05/2017)](https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070716/LEGISCTA000006135898/) | « « 2. Deux mois pour celles qui demeurent à l'étranger. » » |

## Interdits

- Le nom, le logo, l'adresse, l'adresse e-mail ou le domaine de Letikette dans la lettre, l'expéditeur, l'adresse de réponse ou les métadonnées des pièces jointes (producteur du PDF compris).
- Le mot « garantie ».
- Toute recommandation ou tout classement : « nous vous recommandons », « il convient de », « la meilleure voie », « prochaine étape », un ordre de préférence, une option mise en avant (ligne rouge n° 3).
- Toute qualification juridique en texte libre : « la créance est certaine, liquide et exigible », « remplit les conditions de... », « le débiteur est commerçant », « la créance n'est pas prescrite ». Le logiciel donne des dates calculées avec leur hypothèse ; c'est l'avocat qui qualifie. Cass. 1re civ., 15 novembre 2010, n° 09-66.319 (publié, relu le 25/09) : « la vérification, au regard de la réglementation en vigueur, du bien-fondé des cotisations réclamées [...] constitue elle-même une prestation à caractère juridique ».
- Toute phrase selon laquelle une mise en demeure, une relance ou un courrier recommandé interromprait ou suspendrait la prescription (Cass. com. 18/05/2022, relu). En particulier, ne pas reprendre dans ce gabarit la constante ANGLE_MORT_PRESCRIPTION de pays/france/prescription.ts, qui écrit qu'« une mise en demeure » provoque suspension ou interruption.
- Toute date de fin du délai d'opposition quand la signification n'a pas été faite à personne (CPC 1416 al. 2) ou quand le débiteur ou la juridiction n'est pas en métropole (CPC 643) ; et toute date de fin présentée comme « au plus tard » : le vrai terme peut être plus tardif.
- Reformuler l'intitulé d'une annonce BODACC (« ouvrant une procédure de... ») : il est cité mot pour mot.
- Relire le montant unitaire de l'indemnité forfaitaire dans parametres.ts pour l'écrire à côté du total figé : ce serait une seconde vérité si le paramètre a changé depuis l'arrêté du décompte.
- Présenter un projet comme « validé », « conforme », « vérifié juridiquement » ou « prêt à déposer ».
- Toute mention d'honoraires, de commission, d'abonnement, de participation ou de partage liés à l'avocat (RIN 11.3 et 11.4, relus ; décret 2023-552 art. 10, relu : « La rémunération d'apports d'affaires est interdite. »).
- Toute demande à l'avocat de rendre compte à un tiers, ou d'agir pour une autre personne que le client.
- Cacher le remplissage automatique, ou présenter les projets comme écrits par le client.
- Écrire un numéro d'article, un délai ou un montant ailleurs qu'à travers un paramètre du référentiel, un module de pays qu'il référence, ou le décompte figé.

## Points ouverts

- CORRECTIONS : (1) la multiplication « nombre × {{param.indemniteForfaitaire.valeur}} » est retirée : elle relisait le paramètre du jour à côté d'un total figé, donc une seconde vérité possible ; (2) prescription : une date par facture, avec la source du régime lue dans pays/france/prescription.ts (et non la source générique de delaiPrescriptionCommerciale, qui aurait cité L110-4 pour un transporteur), l'hypothèse écrite en phrase fixe, et la mention « sans tenir compte d'aucun événement qui aurait pu interrompre ou suspendre ce délai » ; (3) opposition : date de fin affichée seulement si la signification a été faite à personne et en métropole, et formulée « ne s'achève pas avant » (le calcul sans report de l'art. 642 peut avancer la date, ce qui pousserait à exécuter trop tôt) ; sinon, la raison est dite avec sa source (CPC 1416 al. 2 et 643, relus) ; (4) la date limite de signification n'est affichée que si l'ordonnance n'est pas encore signifiée ; (5) « Rien n'est engagé » remplacé par « Aucune des démarches ci-dessous n'est engagée » : la première phrase était fausse dès qu'une requête avait été déposée ; (6) procédure collective : l'intitulé BODACC est cité mot pour mot au lieu de « ouvrant une procédure de » ; (7) mentions : source des honoraires portée sur le décret n° 2023-552 art. 10 (relu mot pour mot), URL de l'art. 66-5 remplacée par la page de l'article, Cass. 1re civ. 15/11/2010 et QE n° 3177 relues, étiquettes [Projet]/[Calcul]/[Facultatif] ajoutées (aucun texte n'impose de mention à une lettre d'un client à son avocat), deux mentions ajoutées (calcul des délais ; prescription et mise en demeure) ; (8) interdits ajoutés sur la mise en demeure et la prescription, la date d'opposition, l'intitulé BODACC, l'indemnité unitaire et les métadonnées des pièces jointes.
- AUCUN AVOCAT N'A RELU CE GABARIT : valideParAvocat reste false. La lettre le dit elle-même en section 5, et c'est voulu.
- DÉFAUT HORS GABARIT, À CORRIGER À PART : pays/france/prescription.ts exporte ANGLE_MORT_PRESCRIPTION, qui écrit « Une mise en demeure, une reconnaissance de dette ou une action en justice les provoquent » (suspension ou interruption). Cass. com., 18 mai 2022, n° 20-23.204 (publié, relu le 25/09) juge le contraire pour la mise en demeure. Ce texte s'affiche aujourd'hui à l'utilisateur ; il contredit aussi la règle du relevé des exceptions (« Une mise en demeure n'interrompt pas la prescription »).
- NOMMER OU NON LE LOGICIEL À L'AVOCAT. La règle du projet exclut le nom de Letikette de tout document. Si l'avocat vient d'un annuaire de Letikette, le RIN 19.4.2 (relu) l'oblige à s'assurer que « les prestations fournies par le site ou la plateforme » sont conformes au Titre II de la loi n° 71-1130. Il faudra alors une notice sur l'outil, hors de la lettre. À trancher.
- OÙ ARRIVENT LES RÉPONSES. Une adresse de réponse par dossier sur un sous-domaine Letikette ferait transiter chez Letikette des correspondances couvertes par le secret (loi 71-1130 art. 66-5 ; RIN 2.2, relus). Le gabarit renvoie donc à l'adresse du client. Reste à décider si et comment l'app archive les réponses de l'avocat (accès, purge RGPD).
- LOI N° 71-1130, ART. 10. Deux lectures automatiques de la même page (version en vigueur depuis le 05/08/2026, loi n° 2026-725, art. 13) ont rendu des troisièmes alinéas différents. La phrase citée est donc sourcée sur le décret n° 2023-552, art. 10, lu sans ambiguïté. Relire l'art. 10 de la loi à la main.
- ÉCHÉANCES. Les paramètres delaiOppositionInjonction, delaiOppositionInjonctionProrogee, augmentationDelaiOppositionOutreMer et augmentationDelaiOppositionEtranger n'existent pas encore au référentiel. Appliquer l'art. 643 à l'opposition à injonction de payer passe par l'art. 645, non relu dans cette session. L'attente de deux mois avant exécution (CPC 1422, version du 01/04/2026, relue) n'est pas reprise dans la lettre : à décider. Ni le seuil de représentation obligatoire ni le délai de constitution d'avocat après opposition ne sont cités.
- DATE DE PRESCRIPTION. L'afficher dans une lettre à un avocat est un constat assorti de son hypothèse. Mais la fonction « qualification » peut être lue comme une consultation : Cass. 1re civ. 15/11/2010 (relue) et la réponse ministérielle à la QE n° 3177 (JO AN du 08/04/2025, relue : « Les plateformes en ligne ne sont donc pas autorisées à délivrer des consultations juridiques aux internautes. »). À valider.
- LISTE « CE QUI RESTE À DÉCIDER ». L'ordre chronologique vient du parcours et non de l'agent. La ligne « ne donner aucune suite pour le moment » est fixe. Un test doit vérifier qu'aucun mot de préférence n'y figure.
- TAILLE ET CANAL. Un dossier complet peut dépasser la taille d'un e-mail. Un espace partagé hébergé par Letikette stockerait des pièces couvertes par le secret. Même décision que pour l'adresse de réponse.
- CONVENTION AU BÂTONNIER. Non relu dans cette session : faut-il une convention remise au Bâtonnier quand c'est le client qui invite son propre avocat ?
- POSITION DU CNB. Selon la note précédente, passer par un avocat ne régularise pas un gabarit rédigé en amont par un non-avocat. Aucune source n'a été relue pour cette affirmation : elle n'est pas sourcée.
- FORMATEUR {{... | annees}}. Le filtre qui écrit « 1 an » ou « 5 ans » est à créer ; il ne doit pas écrire la durée en dur.
