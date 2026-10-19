# Carte du moteur de calcul et du registre juridique, pour y ajouter le barème public

Je n'ai modifié aucun fichier. Les chemins partent de `C:\Users\jules\Desktop\mycelium-chat\src\`.

**À relever avant d'écrire.** Plusieurs références sont citées de mémoire et n'ont pas été vérifiées : les articles du code de la commande publique (L2192-10 et suivants, R2192-10 et suivants, R2192-31, D2192-35), les articles 1 à 3 de la loi n° 68-1250, les codes INSEE 4110, 4120 et 7364, et la décision « Cass. com., 24 avril 2024 », que l'audit tient d'une analyse d'avocat. Le projet interdit d'écrire un article de mémoire : chacune doit être relevée sur Légifrance (ou sur la nomenclature INSEE) avant d'entrer au registre.

---

## 1. Le registre : `lib/verticales/recouvrement/parametres.ts`

- **Forme d'une entrée** (`ParametreLegalBase`, l. 66-112) : `cle`, `nature` (`'CONSTANTE' | 'SERIE'`), `valeur`, `unite`, `source`, `verifieLe`, `sourceValableJusqua?` (une date lue sur la source, jamais posée par prudence), `verifie`, `valideParAvocat`, `resoluPar?` (obligatoire pour une SERIE) et `note`. On type par `satisfies ParametreLegal<T>`.
- **Les trois portes :**
  - `estUtilisable` (l. 1067-1071) ;
  - `exiger` (l. 1079-1099) lève sur une SERIE, sur une valeur `null` ou sur `!verifie` ;
  - `exigerPourActe` (l. 1109-1119) exige en plus `valideParAvocat`.
- **Entrées du régime commercial qui servent de modèle :**
  - `tauxInteretLegalDefaut` (SERIE, l. 158-183, `resoluPar: 'pays/france/taux.ts → tauxPenaliteParDefaut(date)'`) ;
  - `delaiPrescriptionCommerciale` (SERIE, l. 211-226) ;
  - `indemniteForfaitaire` (`4000n`, D441-5, l. 336-353) ;
  - `pointDepartPenalitesRetard` (l. 470-487) ;
  - `imputationPaiementPartiel` (l. 903-918) ;
  - `miseEnDemeureNonInterruptive` (l. 920-935).
- **Entrées à créer**, toutes avec `valideParAvocat: false` :
  - `tauxInteretsMoratoiresPublics`, en SERIE, `resoluPar` vers le nouveau module ;
  - `indemniteForfaitairePublique`, une entrée séparée même si le montant est le même, parce que la lettre cite sa source ;
  - `delaisPaiementPublics` (30 j, 50 j pour les hôpitaux, en `unite: 'jours'`), qui courent de la réception de la demande de paiement ;
  - `pointDepartInteretsMoratoires` ;
  - `delaiPrescriptionQuadriennale`, en SERIE ;
  - `reclamationEcriteInterruptive` (art. 2 de la loi 68-1250), le pendant de `miseEnDemeureNonInterruptive` ;
  - éventuellement `categoriesJuridiquesPersonnesPubliques`, sur le modèle de `formeJuridiqueMuettePourPersonnePhysique` (l. 291-310).

## 2. Les taux : `pays/france/taux.ts`

- `TAUX_BCE_PAR_SEMESTRE` (l. 74-87) donne le taux BCE en vigueur au premier jour de chaque semestre, de 2021-S1 à 2026-S2. **Le barème public peut réutiliser cette série telle quelle** ; aucune nouvelle série n'est nécessaire.
- `MAJORATION_L441_10 = 1000n` (l. 61) n'est **pas exportée**. `exigerSemestre` (l. 137-149), qui lève en nommant le semestre absent, est privée. Le nouveau module devra soit les exporter, soit vivre dans ce fichier.
- `tauxPenaliteParDefaut(date)` (l. 155-159) calcule BCE + 10 points.
- `periodesDeTauxParDefaut(debut, fin)` (l. 198-211) **pose une période par semestre traversé** (réancrage).
- **La différence d'ancrage.** D'après ma lecture de R2192-31, le taux public est le taux BCE au premier jour du semestre où les intérêts ont **commencé** à courir, majoré de 8 points, et il vaut pour **toute** la durée du retard. Le futur `periodesDeTauxPublics(debut)` doit donc rendre **une seule** `PeriodeDeTaux` : il ne faut pas copier `periodesDeTauxParDefaut`. C'est à confirmer au relevé.
- **Fichier proposé :** `pays/france/commande-publique.ts`, avec `tauxInteretsMoratoires(debutRetard)`, `periodesDeTauxPublics`, `echeanceLegalePublique(dateReception, categorieAcheteur)` et `estPersonnePublique(categorieJuridique)`. Le dossier `pays/` est exempté du test des articles (`valeurs-juridiques.test.ts`, l. 44-47) et du test du lexique (`lib/__tests__/lexique.test.ts`, `DOSSIERS_JURIDIQUES`).

## 3. La prescription : `pays/france/prescription.ts`

- `SecteurCreance` (l. 60-67) décrit la **relation commerciale**, pas le client. Ses valeurs sont recopiées dans `vSecteurCreance` (`lib/convex/recouvrement/tables.ts`, l. 77-85), qui circule entre le validateur Convex et la base.
- `RegimePrescription` (l. 69-77) et `REGIMES_PRESCRIPTION` (l. 79-152) n'ont pas de mode de point de départ.
- `dateDePrescription` (l. 210-212) vaut `ajouterMois(pointDeDepart, dureeAnnees*12)`.
  - **Piège :** un régime à 4 ans appliqué à l'échéance donnerait, pour une échéance au 2022-03-15, le 2026-03-15 au lieu du 2027-01-01.
  - Il faut un mode `PREMIER_JANVIER_SUIVANT`, c'est-à-dire `ajouterMois(`${Y+1}-01-01`, 48)`.
- **Ce que veut dire la date dans le produit.** La date rendue est le premier jour où la créance est prescrite : `estPrescrite` teste `>=` (l. 224-230), et `screens/debiteur.tsx:559` affiche « Agir avant le … ». La quadriennale doit donc rendre `Y+5-01-01`. Le calculateur affiche « Date limite pour agir : X » (`marketing/calcul.tsx`, l. 283-285), ce qui ne colle pas avec le « 31 décembre » de l'audit.
- **Le point de départ ne se résout pas encore.** `prescriptionDe(candidats, secteur)` (l. 261-282) prend `[exigibilité, échéance]` (appelée depuis `lib/convex/recouvrement/surveillance.ts:315`). Pour une personne publique, l'année de naissance du droit reste à trancher par un juriste : service fait, réception, ou paiement tardif pour les intérêts moratoires. Il faudra aussi une entrée « date de la dernière réclamation écrite », puisque l'interruption fait repartir le délai au 1er janvier suivant.
- `secteurLePlusCourt` (l. 188-190) ne bouge pas : le minimum reste 1 an, donc `INDETERMINE` reste prudent.
- **Je recommande un axe client plutôt qu'une valeur de secteur.** Une fonction `regimeApplicable(secteur, personnePublique)` retiendrait la date la plus proche et la marquerait `hypothese` quand la combinaison n'est pas tranchée (transport vers une commune, par exemple).
- **Si l'on ajoute quand même une valeur à `SecteurCreance` :** `LIBELLE_SECTEUR` (`ui/identite-debiteur.tsx`, l. 124-131) est un `Record<string, string>` avec repli `?? cle`, donc un oubli n'est pas une erreur de compilation. Et `secteursProposes` (l. 133-160) afficherait « 4 ans », ce qui serait faux.

## 4. Le décompte : `lib/verticales/recouvrement/decompte.ts`

- **Entrées :**
  - `FacturePourDecompte` (l. 76-96) : `montantExigible`, `dateExigibilite`, `reglements`, `taux: PeriodeDeTaux[]`, `jugementOuvertureLe?` ;
  - `ConventionJours` (l. 56) vaut `ACT_365` ou `ACT_ACT` ;
  - `OrdreImputation` et `ChoixImputation` (l. 151-154).
- **`decompterFacture`** (l. 306-422) ne choisit pas le taux : il le reçoit. Il code pourtant le régime commercial en dur :
  - `exiger(PARAMETRES.pointDepartPenalitesRetard)` (l. 313-314) ;
  - l'indemnité vient de `PARAMETRES.indemniteForfaitaire` (l. 408-411), sur la condition `enRetard` (l. 362-363). Une facture soldée en retard garde ses 40 €.
- Le choix du taux est **dupliqué à 7 endroits**, avec le motif « taux contractuel, sinon `periodesDeTauxParDefaut` » :
  - `lib/convex/recouvrement/decompte.ts:78-91` (`periodesDe`) ;
  - `lib/convex/recouvrement/revelation.ts:74-88` ;
  - `lib/convex/emails/essai.ts:263` ;
  - `lib/crm/valeurs-loi.ts:71` ;
  - `marketing/calcul.tsx:119` ;
  - `marketing/blog-illustrations.tsx:124` ;
  - `routes/-salle/*`.
- **Recommandation :** un seul `periodesApplicables({ tauxContractuel?, bareme }, debut, fin)` dans la verticale, et un champ **obligatoire** `bareme: 'COMMERCIAL' | 'COMMANDE_PUBLIQUE'` sur `FacturePourDecompte`, pour que le compilateur liste chaque appelant.
- **Piège des documents envoyés :** `lib/convex/recouvrement/envois.ts:149-160` (`tauxParDefaut`) et `:187-195` (`tauxConvenu`) **devinent après coup** le fondement en comparant le taux de chaque segment à BCE + 10. Un segment à BCE + 8 sortirait avec `tauxConvenu = true`, et la lettre écrirait « taux prévu par nos conditions de règlement » (`gabarits/lettre-relance-officielle.ts`, l. 190-192). Il faut écrire le barème dans `LigneDecompte`, puis le figer dans la table `decomptes` (`tables.ts`, l. 1434-1478, en champ `v.optional` parce que la base contient déjà des décomptes) via `enregistrementDe` (`lib/convex/recouvrement/decompte.ts`, l. 242-288) et `vDernierDecompte` (l. 547-607).
- `decompteDuJour` impose `ACT_365` en dur (l. 403). La base de calcul publique reste à vérifier : 365 j, ou jours exacts.
- **Décompte des jours :** le moteur compte de l'échéance incluse à l'arrêté exclu, et le jour du règlement n'est pas compté. Le texte public dirait « jusqu'à la date de mise en paiement du principal incluse » (à relever). Or la date de règlement importée est la date de crédit en banque, pas la date de mise en paiement.

## 5. Le client public dans le modèle de données : **absent aujourd'hui**

- La table `debiteurs` (`tables.ts`, l. 437-608) porte `siren`, `formeJuridique` (un **libellé** en texte, l. 459), `estCommercant` et `secteur` (l. 533). Elle ne porte **aucun code de catégorie juridique** et aucun drapeau « public ». Aucune mention de « moratoire », « Chorus » ou « personne publique » n'existe dans `src`.
- **Les sources ne suffisent pas :**
  - `chercherAuRegistre` (`lib/convex/recouvrement/debiteurs.ts`, l. 346-407) interroge le **BODACC**, où un hôpital ou une commune n'a pas d'annonce : la recherche reviendra vide ;
  - `lireFichePappers` (`pays/france/pappers.ts`, l. 197-230) ne lit que `forme_juridique`.
- **La bonne source est déjà branchée ailleurs.** L'API Recherche d'entreprises renvoie `nature_juridique`, déjà lu dans `lib/crm/annuaire.ts:273-285`, avec un filtre `/^[789]/`, pour écarter les organismes publics de la prospection. Il faut ajouter `categorieJuridique?: string` sur `debiteurs`, rempli à partir du SIREN.
- **Piège :** « 7xxx = public » ne recouvre pas le champ de la loi 68-1250, qui vise aussi les établissements publics « dotés d'un comptable public ». De mémoire, la nomenclature INSEE sépare justement 4110 (avec comptable public) et 4120 (sans), et les hôpitaux seraient en 7364. À relever.
- **La facture :** `facturesVente` (l. 614-706) n'a pas de date de réception de la demande de paiement. `dateExigibilite` est déduite de l'échéance à l'import (`lib/convex/recouvrement/import.ts:270-271`). Pour un acheteur public, l'échéance légale vaut réception + 30 ou 50 jours : il faut ce champ, ou une déduction marquée comme telle.
- **Le type d'acheteur** (hôpital, 50 j) se déduit peut-être du code, mais il vaut mieux le faire confirmer par le gérant.

## 6. Le calculateur public : `marketing/calcul.tsx`

- Le type `Secteur` vaut `'GENERAL' | 'TRANSPORT_MARCHANDISES'` (l. 49) et ne choisit **que la prescription**.
- `calculer()` (l. 101-142) code tout le reste en dur : `periodesDeTauxParDefaut(echeance, jour)` (l. 119), `'ACT_365'` et `'PENALITES_DABORD'` (l. 122-123), l'indemnité tirée de `decompterFacture`, et `dateDePrescription(echeance, secteur)` (l. 125).
- Il y a une garde `tauxPenaliteParDefaut(jour)` (l. 162-166), le bouton à deux choix (l. 200-213) et le texte des durées (l. 215-218).
- Le pied de section (l. 334-339) cite `ARTICLES_DU_SOCLE` (`marketing/articles.ts:31-34`, soit L441-10 et L110-4) et écrit « majoré de dix points » **en dur**. La même phrase figure dans `marketing/secteurs.ts:114,140,149`, `marketing/mdx.tsx:53`, `marketing/faq.tsx:65` et `lib/crm/modeles.ts:195`, et aucun test ne la voit.
- **Types à étendre :** `secteurInitial` (l. 154), `PageDeSecteur.regime` (`secteurs.ts:43`) et `Regime` (`mdx.tsx:70`). `ArticleDuCode` (`mdx.tsx`) ne reconnaît que « code de la consommation ».

## 7. Le non-cumul (Cour de cassation) : principal et accessoires

- **Les sorties séparent déjà les deux.**
  - `LigneDecompte` (l. 129-139) porte `principalRestantDu`, `interets`, `indemniteForfaitaire`, `total`, `segments` et `imputations` ; `DecompteCreance` (l. 165-174) porte les mêmes totaux.
  - Ils sont figés dans `decomptes` et imprimés séparément : `lettre-relance-officielle.ts:193-201`, `accord-echeancier.ts:143-148`, `procedure-collective.ts:205`, `professionnels.ts:129`.
  - `revelation.ts` isole déjà `supplement = interets + indemnite`.
- **Le moteur ne calcule jamais d'intérêts au taux légal.** `tauxInteretLegal` ne sert qu'au plancher contractuel et à l'affichage (`taux-contractuel.ts:134`, `page-taux.tsx:93`). Le cumul ne peut donc naître qu'en aval : chez l'avocat, ou dans un futur dossier « prêt à signifier ».
- **Ce qui manque pour isoler un principal « incontestable » :** `principalRestantDu` **dépend de l'ordre d'imputation**. Avec `PENALITES_DABORD`, un paiement imputé sur les pénalités grossit le principal. `decompterCreance` (l. 437-471), en mode `A_CONFIRMER`, ne rend que `totalAutreOrdre`, pas l'autre principal. Il faut une sortie dédiée, à savoir le montant moins tous les règlements, soit le `principalRestantDu` calculé en `PRINCIPAL_DABORD`. La décision de cassation doit être relevée, avec son numéro, avant d'entrer au registre.

## 8. Autres pièges qui mordront

- **Interruption de la prescription.** `ANGLE_MORT_PRESCRIPTION` (`prescription.ts`, l. 178-185, affiché par `lib/convex/recouvrement/conseil.ts:374`), `miseEnDemeureNonInterruptive` et les thèmes de Plume (`compagnon/question-de-droit.ts`, l. 48 et 76) disent qu'une lettre n'interrompt pas. C'est **faux** pour un débiteur public, puisque l'art. 2 de la loi 68-1250 admet une réclamation écrite. Ces textes doivent dépendre du régime, sans jamais dire « votre prescription est interrompue » (ligne rouge n° 3, test `aucun-verdict`).
- **Factures soldées.** Tout le cas d'usage public (un hôpital qui a payé en retard sans régler les intérêts) porte sur des factures **SOLDEE**. Or elles sont exclues partout :
  - la révélation (`revelation.ts:97-100`), exclusion **renvoyée exprès à un juriste**, l. 83-87 ;
  - la surveillance (`lib/convex/recouvrement/surveillance.ts:191, 280, 345, 469`) ;
  - le pilote (`pilote.ts:311, 360, 749, 1461`).

  Le moteur, lui, sait déjà les chiffrer (`__tests__/decompte.test.ts:94`, et les dates de règlement du FEC dans `import/exportComptable.ts:238-323`).
- **Procédures inadaptées.** `injonctionDePayer.peutEvaluer: () => true` (`procedures.ts:125`) proposerait une voie civile contre une personne publique. La procédure L126 exige des commerçants.
- **La lettre officielle** est titrée « mise en demeure », cite L441-10 (l. 190-203) et exige la forme juridique du client (`gabarits/commun.ts:183`). Un débiteur public demande son propre gabarit, tenu par `gabarits.test.ts` et `relance.test.ts`.
- **`tauxContractuel`** prime sur le taux légal (`lib/convex/recouvrement/decompte.ts:81-88`). Je ne sais pas si une clause du marché public peut y déroger, ni si le plancher contractuel (trois fois le taux légal) s'applique.
- **Imputation :** un payeur public indique ce qu'il paie (art. 1342-10 du code civil). `PRINCIPAL_DABORD` est probablement le bon défaut, à faire valider.
- **Lexique :** `lexique.ts:37` refuse le motif `/int[ée]r[êe]ts/` dans l'interface et le marketing. « Intérêts moratoires » y sera refusé tant qu'aucune entrée de lexique ne sera ajoutée.
- **Convex :** n'ajouter que des champs optionnels (le validateur relit la base existante). Annoter le type de retour d'un handler qui appelle `internal.<son propre module>`, pour éviter le cycle d'inférence.

## 9. Tests à étendre

| Test | Ce qu'il faut faire |
|---|---|
| `pays/france/__tests__/taux.test.ts` | BCE + 8 ; ancrage au semestre de départ ; une seule période ; levée hors série. |
| `pays/france/__tests__/prescription.test.ts` | Quadriennale : droit né en 2022, prescription au 2027-01-01 ; cas d'interruption ; le minimum reste 1 an. |
| `__tests__/parametres.test.ts` | Les nouvelles entrées doivent passer l. 41-45 (source, date, note), l. 59-66 (`resoluPar` pour une SERIE) et l. 86-88 (aucune validée par avocat). |
| `__tests__/sources-encore-en-vigueur.test.ts` | Les listes exactes des l. 77-89 et 103-124 sont à compléter **seulement** si une date de fin a été lue sur la page. |
| `__tests__/decompte.test.ts` | Indemnité et barème portés ligne par ligne. |
| `__tests__/valeurs-juridiques.test.ts`, `marketing/articles.ts:20`, `compagnon/filtres.ts:348-349` | Le motif `[LRD]\.? ?\d{3}-\d+` **ne voit pas** un article à 4 chiffres comme `R2192-31` ou `L2192-13`. La garde ne protégerait pas les références publiques, et `articleDe` rendrait `null`. Passer à `\d{3,4}`, ajouter un contre-exemple, et ajouter « code de la commande publique » au filtre de `filtres.ts`. |
| `lib/__tests__/lexique.test.ts` | Nouvelle entrée de lexique pour « intérêts moratoires ». |
| `lib/convex/__tests__/debiteursRecouvrement.test.ts`, `surveillanceRecouvrement.test.ts` | Si `vSecteurCreance` change, ou si un champ est ajouté. |
| `lib/crm/__tests__/annuaire.test.ts` | Couvre déjà `nature_juridique`. |