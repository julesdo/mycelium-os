# La trajectoire de l'audit : ce qu'on construit, dans quel ordre, et ce qu'on ne construit pas

> 19/10/2026. Le fondateur adopte l'audit stratégique du 18/10/2026
> (`docs/superpowers/recherches/2026-10-19-audit/audit-strategique.md`) : « ce document est hyper
> important et va nécessiter de nombreuses modifications côté site mais aussi côté CRM puisqu'on a
> des scénarios et parcours prospects totalement nouveaux ».
>
> Avant d'écrire une ligne, six cartes du code et six recherches sur sources primaires, chaque fait
> juridique contre-vérifié par un second lecteur
> (`docs/superpowers/recherches/2026-10-19-audit/`). Cette spec en tire les décisions et les lots.

---

## 1. Ce que l'audit demande, en une page

**Le modèle** : l'abonnement reste le socle ; s'y ajoutent des offres qui n'exigent aucun statut
(diagnostic, réclamation clé en main, pilote, offre fondateurs), puis, plus tard, une commission
d'agence (Mandat) et du courtage de financement. Pas de banque.

**Les 90 jours** (jusqu'au 17/01/2027) : deux niches où la loi travaille pour le créancier, les
**fournisseurs du secteur public** (intérêts moratoires automatiques, prescription de quatre ans,
date butoir du 31 décembre) et les **transporteurs** (un an pour agir, action directe), plus les
**experts-comptables** en distribution. Objectif : environ 47 000 € encaissés et 3 300 € de récurrent
mensuel fin janvier.

**Le catalogue** : estimation (gratuite, faite par nous avant l'appel), diagnostic express (gratuit,
trois mois, dix minutes), diagnostic complet (290 € HT, remboursé sous 2 900 € identifiés), réclamation
clé en main (5 % du montant calculé, de 290 à 2 000 €, payée d'avance), logiciel (Solo 12 €, Équipe
59 €, Pro 149 € par mois), offre fondateurs (Pro à 1 490 € par an, prix bloqué à vie, 50 places,
jusqu'au 31/12), pilote accompagné (2 500 € sur 90 jours, Sage, Cegid, EBP), Mandat (12 %, plus tard).

**Le site** : six changements, pas de refonte — prix et catalogue, accroche « Combien vous doit-on ? »,
calculateur « Client public », pages fournisseurs publics, transporteurs, experts-comptables et
procédure sans juge (liste d'attente), preuves (fondateur, hébergement), blog par piliers.

**Le CRM** : des parcours de prospection distincts, le téléphone d'abord, l'estimation chiffrée
avant l'appel, l'e-mail conforme.

**À arrêter** : la gratuité illimitée de Découverte, les artisans et professions libérales comme
cible du Mandat, le mot « banque », toute ouverture de pays avant la porte 1.

---

## 2. Ce que la vérification a changé

Tout ce qui suit a été relu sur la source primaire (Légifrance, BCE, CNIL, Paddle, data.gouv.fr) et
contre-vérifié. Détail et citations exactes dans les fichiers `verification-*.json`.

### 2.1 Le barème public — confirmé, avec un piège de calcul

| Règle | Valeur | Source relue |
|---|---|---|
| Taux des intérêts moratoires | BCE (opérations principales de refinancement) au 1er jour du semestre où les intérêts **commencent à courir**, + 8 points, **un seul taux pour toute la durée du retard** | R2192-31 CCP |
| Point de départ | Le lendemain de l'expiration du délai de paiement, jusqu'à la mise en paiement du principal **incluse** | R2192-32 CCP |
| Base | Montant TTC de l'acompte ou du solde, moins la retenue (de garantie), après révision et pénalités | R2192-33 CCP |
| De plein droit | Intérêts et indemnité, « sans autre formalité » ; le complément, lui, se demande sur justification | L2192-13 CCP |
| Renonciation | « réputée non écrite » (intérêts seulement) | L2192-14 CCP |
| Indemnité forfaitaire | 40 € — **le texte ne dit pas « par facture »** (unité à faire valider) | D2192-35 CCP |
| Paiement des accessoires | 45 jours après la mise en paiement du principal | R2192-36 CCP |
| Délais de paiement | 30 j (pouvoirs adjudicateurs), 50 j (établissements publics de santé), 60 j (entreprises publiques) ; courent de la réception de la demande de paiement | R2192-10, R2192-11, R2192-12 CCP |
| Taux de 2026 | 10,15 % (retard commencé au S1), 10,40 % (au S2) ; BCE 2,65 % depuis le 16/09/2026 | BCE, DILA F23386 |

**Piège** : `periodesDeTauxParDefaut` (taux.ts) découpe une période par semestre traversé — juste pour
L441-10, **faux** pour le public. Le barème public rend une seule période, ancrée au semestre du
lendemain de l'échéance (la DILA classe par « fin du délai » : elle diverge le 30 juin et le 31 décembre ;
suivre R2192-31).

**Mandatement d'office** : intérêts non mandatés dans les 30 jours du paiement du principal → sur
signalement, le préfet met en demeure dans les 15 jours, puis mandate d'office dans les 10 jours
(L1612-18 CGCT) ; pour un hôpital, le directeur de l'ARS (L6145-5 CSP). **Ces deux articles renvoient à
des textes qui n'existent plus** (L2192-8, loi 2013-100 art. 39-40) : on ne recopie jamais leurs
renvois dans un courrier, on cite L2192-13, R2192-31, D2192-35, R2192-36. La chambre régionale des
comptes est une **juridiction** : sa saisine relève de la ligne rouge n° 1.

### 2.2 La prescription de quatre ans — confirmée, la date butoir est une lecture

- Art. 1er loi 68-1250 : quatre ans « à partir du premier jour de l'année suivant celle au cours de
  laquelle les droits ont été **acquis** » (pas « nés ») ; vaut pour l'État, départements, communes
  et établissements publics **dotés d'un comptable public** (hôpitaux publics : oui, L6145-8 CSP ;
  EPIC : selon ses statuts ; SEM : non, sauf mandat d'une collectivité).
- Art. 2 : **une réclamation écrite interrompt** ; un nouveau délai de quatre ans court du 1er janvier
  suivant. Le cachet de la poste fait foi devant une administration (L112-1 CRPA ; pas pour un EPIC
  qui gère un service industriel ou commercial, L100-3).
- « Les intérêts de 2022 se perdent le 31 décembre 2026 » : **lecture** de deux arrêts inédits de la
  CAA de Lyon (2020) qui rattachent le délai à l'année des prestations ; aucune décision du Conseil
  d'État ne tranche, et un marché soldé par décompte fait partir le délai plus tard. On l'écrit donc
  « peuvent se prescrire », jamais « se prescrivent ».

### 2.3 La procédure du 23 avril — la voie n'est pas encore ouverte

Loi n° 2026-307 du 23/04/2026 (L126-1 à L126-6 CPCE) : facture entre commerçants, certaine, liquide,
exigible ; commandement par le commissaire de justice (monopole), un mois pour payer, procès-verbal de
non-contestation rendu exécutoire par le greffier, frais à la charge du débiteur, aucun plafond. **Le
décret de L126-6 n'est pas paru au 19/10/2026** (« publication envisagée en octobre 2026 »). Depuis le
25/04, la procédure des petites créances exclut les factures entre commerçants : aucune voie sans juge
n'est opérante entre commerçants. Le décret 2026-683 est une voie **judiciaire** distincte (défaut de
comparution). Les « six semaines » de l'audit sont un minimum théorique.

### 2.4 Transport, non-cumul

L132-8 C. com. : action directe du voiturier contre l'expéditeur et le destinataire, garants du prix ;
le transporteur substitué peut l'exercer (Cass. com., 13/06/2006) ; seul celui qui a effectué le
transport, et il doit prouver le prix (doctrine CMS). Cass. com., 24/04/2024, n° 22-24.275 :
pénalités L441-10 et intérêts légaux ne se cumulent pas. Le moteur ne calcule jamais d'intérêts légaux
en plus ; il doit savoir sortir le principal seul (règlements imputés sur le principal d'abord).

### 2.5 La CNIL — la phrase de l'audit est dépassée, notre pied d'e-mail est faux

La page CNIL de 2009 qu'il cite (« interdit » de prospecter à partir d'adresses des sites et annuaires)
est rendue caduque pour le B2B par les recommandations du 12/06/2024 et les fiches du 10/06/2026 :
l'intérêt légitime suffit si **(1)** l'objet est lié au métier de la personne, **(2)** elle peut
raisonnablement s'y attendre (pas de mention « pas de démarchage », pas de CGU qui l'interdisent),
**(3)** elle est **informée** (art. 14 RGPD) au plus tard au premier contact **et dans le mois qui suit
la collecte**, source comprise, **(4)** elle peut s'opposer simplement, **(5)** chaque message dit qui
l'envoie. Une adresse générique (contact@, info@) échappe à (3) et (4) mais pas à (5). Un appel B2B
exige aussi l'information.

Conséquences dans notre code :
- le pied de `crm/modeles.ts` attribue toute adresse à « l'annuaire public des entreprises », qui ne
  publie **aucune** adresse e-mail : faux ;
- un prospect ajouté par « Trouver » et laissé plus d'un mois sans information n'est plus en règle ;
- la durée de trois ans court de la collecte ou du **dernier contact venu du prospect** ; le code la
  repousse à chaque envoi (`historique.ts`, `prospects.ts`).

### 2.6 Paddle — deux clauses qui pèsent

- **Clause 11.1 (xv) du contrat** : aucun télémarketing sortant, « regardless of whether the relevant
  products or services are or will be resold through Paddle » ; 16.3 (iii) : résiliation sur simple
  soupçon. Le « téléphone d'abord » de l'audit est un risque pour le compte Paddle, quoi qu'en dise la
  CNIL. Le mot « consumer » de la définition laisse un doute pour le B2B, **à faire lever par écrit**.
- **AUP** : pas de « human services that are not related to a software offering » ; les catégories
  `implementation-services` et `professional-services` demandent l'approbation de Paddle ; un rapport
  sur mesure n'entre pas dans `digital-goods`. Techniquement, un prix calculé (transaction à prix hors
  catalogue) et des remises bornées dans le temps sont possibles.

### 2.7 Les données de prospection

- **DECP** : API tabulaire de data.gouv.fr, ressource `22847056-61df-452d-837d-8b8ceadbfc52`, gratuite,
  sans clé, 3,3 M de lignes, à jour chaque matin ; « Établissement hospitalier » = catégorie juridique
  7364. **Le montant est un plafond attribué**, recopié par cotitulaire et par avenant : l'estimation
  est un **majorant**, à dédoublonner (uid), dater (modification_id = 0) et annualiser (dureeMois).
- **Retards des acheteurs** : hôpitaux 70,2 j en métropole (71,3 j national) pour 50 autorisés, 50,7 %
  des paiements au-delà de 50 j, de 53,7 à 85,1 j selon la taille ; collectivités en moyenne **dans
  les règles** (18,9 j) — mais le délai de **chaque budget de collectivité** est publié par la DGFiP
  (90 545 budgets, Licence Ouverte, jointure exacte par SIRET avec la DECP). Aucune donnée par hôpital.
- **Registre des transporteurs** : trois CSV nationaux (pas d'API), 47 392 transporteurs de
  marchandises, 9 777 commissionnaires ; ni adresse ni téléphone ni NAF ; licence de réutilisation
  inconnue ; le gestionnaire de transport y est nommé (donnée personnelle).

### 2.8 Hébergement

`vercel.json` déclare `"regions": ["fra1"]`, c'est-à-dire **Francfort**. Le site et quatre documents
juridiques écrivent « l'application s'exécute à Paris ». Le plus simple, et sans toucher aux documents :
passer la région à `cdg1` (Paris).

---

## 3. Les décisions

Chacune est prise pour avancer ; celles marquées **[fondateur]** sont à confirmer par lui, et le
travail est fait pour qu'il puisse les défaire.

1. **Grille 59 / 149 appliquée.** Les étiquettes de prix Paddle prennent une version (`@g2`) pour que
   le catalogue crée les nouveaux prix ; un abonné garde le prix qu'il paie, et l'écran comme les
   rappels lisent le montant **sur le prix souscrit** (`prixPaddle`), jamais recalculé depuis la grille.
   Relancer le catalogue en production reste un geste du fondateur.
2. **Découverte devient le diagnostic express : trois derniers mois, au calcul.** Tout est gardé en
   base ; seuls les chiffres de l'établissement sont bornés, et ce qui est plus ancien se **compte** («
   N factures plus anciennes : le diagnostic complet les chiffre »). La surveillance de la prescription
   n'est jamais bornée. L'essai montre tout. Pennylane s'ouvre à Découverte (Qonto, Pennylane, FEC).
   Tant que la facturation est fermée, le plan effectif est `dev` : rien ne change pour personne avant
   l'ouverture, dont le préavis dira les trois mois. La doctrine « une limite arrête ce qui part, jamais
   ce qui se lit » est amendée : elle arrête aussi ce que **calcule** Découverte, jamais ce qu'elle
   **surveille**.
3. **Les offres de service se vendent sur demande, hors Paddle.** Diagnostic complet, réclamation clé
   en main, pilote : le site montre l'offre et son prix, un formulaire crée le prospect au CRM avec son
   parcours, et le fondateur envoie devis et facture. Paddle n'est revendeur qu'à titre non exclusif.
   **[fondateur]** : soumettre ces produits à Paddle (30 jours de préavis) si l'on veut les encaisser
   en ligne.
4. **L'offre fondateurs et l'offre de bienvenue passent par Paddle**, puisque c'est de l'abonnement : un
   prix `pro-annuel-fondateurs` (compté, 50 places, jusqu'au 31/12 heure de Paris, jamais migré), et une
   remise à usage unique créée par l'API. Écrit « prix bloqué à vie », jamais le mot interdit.
5. **Le Mandat n'est pas construit.** Ligne rouge n° 2, SAS, déclaration, compte affecté : premier
   trimestre 2027, sur décision séparée.
6. **Le téléphone est outillé ; le risque Paddle est écrit à l'écran de la file d'appels.**
   **[fondateur]** : obtenir de Paddle, par écrit, que des appels B2B vers des professionnels n'entrent
   pas dans la clause 11.1 (xv) avant de lancer la file.
7. **LinkedIn est retiré du CRM** (la direction n'en veut pas).
8. **L'e-mail de prospection suit la CNIL de 2024-2026** : adresse générique, ou adresse nominative
   avec l'information de l'article 14 donnée au premier contact et dans le mois de la collecte ; le
   message nomme la **vraie source** (« sur votre site », « dans les données de la commande publique »),
   dit qui écrit, et porte un **lien de désinscription** ; jamais d'adresse reconstituée (prénom.nom
   deviné). La durée de trois ans part du dernier contact **venu du prospect**.
9. **La date butoir est une lecture, l'interruption est un texte.** « Les intérêts d'une prestation de
   2022 peuvent se prescrire le 31 décembre 2026 ; une réclamation écrite envoyée avant cette date
   interrompt la prescription (loi n° 68-1250, art. 2). » Jamais « vous allez perdre », jamais « il
   faut réclamer » (ligne rouge n° 3).
10. **Pas de compte à rebours visuel.** « Jusqu'au 31 décembre » et « valable 14 jours » s'écrivent en
    clair ; aucun minuteur, aucun prix barré.
11. **Le vocabulaire** : « pénalités de retard (intérêts moratoires) » côté public, le mot du droit en
    second ; « prix bloqué à vie » ; jamais « banque » pour parler de Letikette.
12. **Les CGV ne bougent pas maintenant.** Les services se vendent par devis (contrat séparé) ; la
    description de Découverte (7.1) et la rémunération (4.2) changeront avec l'ouverture de la
    facturation et la vente en ligne des services. **[fondateur]** : faire relire.
13. **La région Vercel passe à `cdg1`** (Paris), ce qui rend vraies les phrases déjà publiées.
14. **Page fondateur** : le texte, l'identité lue dans `LEGAL_CONFIG`, sans photo tant qu'il n'en a pas
    fourni une (aucun visage inventé).
15. **Experts-comptables** : une page partenaires honnête — le diagnostic à proposer à leurs clients,
    20 % de la première année, construit avec les cinq premiers cabinets ; la marque blanche n'est pas
    promise tant qu'elle n'existe pas. Le code partenaire se suit au CRM.
16. **Procédure sans juge** : une page d'attente, inscription avec double confirmation, l'état du
    décret lu au registre (`PROCEDURES['l126-…'].peutEvaluer()`), jamais écrit à la main.

---

## 4. Les lots

Chaque lot se livre seul, avec ses tests, et se commite. Les vagues disent ce qui peut avancer en
parallèle (fichiers disjoints) ; les dépendances sont nommées.

### Vague A — en parallèle

**Lot 1 — Le barème public dans le moteur** (aucune dépendance)
- `parametres.ts` : entrées `tauxInteretsMoratoiresPublics` (SERIE, `resoluPar` vers le module),
  `pointDepartInteretsMoratoires`, `baseInteretsMoratoires`, `indemniteForfaitairePublique` (D2192-35,
  note : unité « par facture » non écrite), `interetsMoratoiresDePleinDroit` (L2192-13),
  `delaisPaiementPublics` (R2192-10/11/12), `paiementAccessoiresPublics` (R2192-36),
  `delaiPrescriptionQuadriennale` (SERIE), `reclamationEcriteInterruptive` (art. 2),
  `mandatementDOffice` (L1612-18 CGCT, L6145-5 CSP, avec la note des renvois périmés) ; toutes
  `verifie: true`, `valideParAvocat: false`, citations de `verification-public.json` et
  `verification-prescription.json`.
- `pays/france/commande-publique.ts` (nouveau) : `tauxInteretsMoratoires(premierJourDInterets)`,
  `periodesDeTauxPublics(premierJourDInterets)` (**une seule période**), `echeanceLegalePublique(
  receptionDemande, categorieAcheteur)`, `categorieAcheteurPublic(categorieJuridique)` (7364 → santé,
  collectivités et EPA → 30 j ; inconnu → `null`, jamais deviné), `estPersonnePublique`.
  `MAJORATION_L441_10` et `exigerSemestre` exportés depuis `taux.ts` si besoin.
- `pays/france/prescription.ts` : un mode de point de départ `PREMIER_JANVIER_SUIVANT`, la fonction
  `datePrescriptionQuadriennale(anneeDesDroits, derniereInterruption?)` (rend le premier jour prescrit,
  `Y+5-01-01`, et la date à afficher, le 31/12 de `Y+4`), **sans** ajouter de valeur à `SecteurCreance`.
- `decompte.ts` : un champ `bareme: 'COMMERCIAL' | 'COMMANDE_PUBLIQUE'` porté par `LigneDecompte` et
  la base `ACT_365` (R2192-31 formule DILA : jours / 365) ; l'indemnité publique lue sur
  `indemniteForfaitairePublique` quand `bareme` est public.
- Lexique : « intérêts moratoires » et « prescription quadriennale » en second, entre parenthèses.
- `valeurs-juridiques.test.ts`, `marketing/articles.ts`, `compagnon/filtres.ts` : le motif d'article
  passe à quatre chiffres (`\d{3,4}`), « code de la commande publique » reconnu.
- `ANGLE_MORT_PRESCRIPTION` et `miseEnDemeureNonInterruptive` : dits régime par régime (une
  réclamation écrite interrompt la quadriennale), sans jamais dire « votre prescription est
  interrompue ».
- Tests : taux (BCE + 8, ancrage au lendemain de l'échéance, 30 juin → S2, une seule période, levée
  hors série), prescription (droits acquis en 2022 → 2027-01-01 ; interruption en 2026 → 2031-01-01),
  décompte public, registre.

**Lot 2 — Les parcours du CRM, la file d'appels et la conformité de l'e-mail** (aucune dépendance)
- `crm/parcours.ts` : `FOURNISSEUR_PUBLIC`, `TRANSPORTEUR`, `EXPERT_COMPTABLE`, `PME_LOGICIEL`,
  `PILOTE`, leurs étapes (rang dans l'entonnoir), l'e-mail permis ou non, la source ;
  `parcoursParDefaut(cible, activite)`.
- `admin/tables.ts` (champs optionnels seulement) : `parcours`, `etapeParcours`, `emailBase`
  (`GENERIQUE` | `INFORMEE`), `emailInformeLe`, `jetonDesinscription` (+ index),
  `dernierContactDuProspectLe`, `montantEstimeCentimes`, `dateButoir`, `estimation` (segments,
  hypothèses, calculée le), `codePartenaire`, `logicielComptable` ; sur `evenementsCrm`, `issue` et
  l'index `by_auteur_and_le` ; types d'événement `ETAPE`. Statut `GAGNE`.
- Les trois créations (`creer`, `importer`, `annuaire.ajouter`) posent le parcours et tirent le jeton.
- `changerEtape` (événement `ETAPE`), `liste` filtrée par parcours, vues « Parcours » dans la barre
  latérale avec leurs comptes, kanban en colonnes d'étapes, entonnoir du parcours.
- La feuille « Appeler » : `tel:`, l'estimation s'il y en a, le script du parcours (`crm/scripts.ts`,
  chiffres lus par `valeurs-loi.ts`, prix par `config/tarifs.ts`), les issues (`PAS_DE_REPONSE`,
  `MESSAGE_LAISSE`, `BARRAGE`, `A_RAPPELER`, `PAS_INTERESSE`, `INTERESSE`, `EMAIL_ACCEPTE`, `RDV`,
  `STOP`), `noterUnAppel` (`crm/appels.ts` : statut jamais en recul, prochaine action, l'information de
  l'article 14 dite à l'oral notée par `EMAIL_ACCEPTE` → `emailBase = INFORMEE`). La file
  `/admin/appels` (« 3 / 10 »), le compteur `appelsDuJour`, l'avertissement Paddle.
- L'e-mail : `crm/consentement.ts` (`adresseGenerique`, `emailPermis(prospect, maintenant)` : générique,
  ou informée, et collectée il y a moins d'un mois tant qu'aucune information n'a été donnée) ; le pied
  devient `piedLegal({ source, lienDesinscription })` ; `trouveOu` arrive jusqu'au modèle ; LinkedIn
  retiré ; `emailEcrit` refuse un e-mail non permis.
- La désinscription : `arreterLeProspect` extrait de `stop`, appelé par `stop`, par l'issue `STOP` et
  par la page publique `/desinscription/$jeton` (GET montre, POST désinscrit ; même réponse pour un jeton
  inconnu ; jamais mesurée par Umami ; `noindex`) ; un STOP n'est plus effacé au bout de trois ans.
- La durée : `dernierContactDuProspectLe` posé par une réponse, un rendez-vous, un intérêt, une
  désinscription ; la purge lit `dernierContactDuProspectLe ?? creeLe`.
- Barrières : `src/lib/crm` entre dans `mots-interdits` et `aucun-verdict`.

**Lot 3 — Le diagnostic express : le moteur** (aucune dépendance)
- `config/tarifs.ts` : `historiqueMois` dans `Limites` (3 pour Découverte, `null` ailleurs) ;
  `LIMITES.decouverte.logiciels` ouvre Pennylane.
- Une seule fonction qui donne la date plancher (`plancherDHistorique(org, maintenant)`), lue par la
  révélation (`facturesPour`) et « Ce qui est dû » ; `horsPeriode: { nombre, principal }` rendu et
  affiché (« calculé sur les trois mois au … ; N factures plus anciennes ») ; un test de balayage qui
  refuse une lecture des factures de l'établissement pour un chiffre sans passer par la fonction (liste
  d'exceptions nommées : surveillance, pilote).
- Les factures **payées en retard** : `diagnostiquer()` pur, à côté de `reveler()`, qui réutilise
  `decompterFacture` et sépare impayées, payées en retard (soldées avec un supplément positif),
  hors période et non chiffrées ; les payées en retard **hors** du « ce qu'on vous doit » de l'accueil.
  Le registre porte l'applicabilité (L441-10 II : pénalités jusqu'au paiement ; indemnité due par tout
  professionnel en retard de paiement), relevée et citée.
- Les dates de paiement : `reglements.dateSource` (`REELLE` | `LECTURE`) ; une soldée dont la date de
  paiement n'est pas sûre va dans « non chiffrées », avec sa raison ; Nango n'invente plus la date.
- Le FEC : le lettrage (`EcritureLet`) rattache l'encaissement à la facture ; le journal des à-nouveaux
  est écarté ; le séparateur `|` et la variante `Montant` + `Sens` sont lus ; sans échéance, le délai
  supplétif de L441-10 I (relevé, au registre) donne une échéance **marquée comme hypothèse**.
- Les étapes `DIAGNOSTIC_LANCE` et `DIAGNOSTIC_RENDU` (datées au moment réel), le relevé après une
  lecture Qonto ou Nango, la lecture « échu » unifiée.
- Le rapport : écran `/app/diagnostic`, PDF à la demande (`ui/rapport-diagnostic-pdf.ts`), sans
  aucune valeur écrite à la main.

**Lot 4 — La grille et Paddle** (aucune dépendance)
- `GRILLE` 59/590 et 149/1490 ; étiquettes versionnées ; montant lu sur `prixPaddle` dans
  `facturation.tsx` et `paiement/rappels.ts` ; `rappels.test.ts` et `paddle.test.ts` mis à jour.
- Prix écrits à la main corrigés (`CLAUDE.md`, `phase-manuelle.md`, salle).
- Les offres ponctuelles comme constantes de `config/tarifs.ts` (`OFFRES` : diagnostic complet,
  réclamation 5 % bornée 290-2 000 €, pilote, fondateurs), jamais dans `GRILLE`.
- La région Vercel `cdg1`.

### Vague B — après le lot 1

**Lot 5 — Les fournisseurs publics au CRM** (lots 1 et 2)
- `crm/decp.ts` : lecteur de l'API tabulaire (encodage UTF-8, `__in`, pagination reconstruite, valeurs
  non normalisées), dédoublonnage par `uid`, attribution initiale, annualisation, exclusion des
  personnes physiques non diffusibles ; `admin/decp.ts` (`chercherDecp`, `ajouterDecp`).
- `crm/estimation.ts` : majorant décomposé par segment (acheteur, année, montant annualisé, retard
  retenu, intérêts au barème public, indemnités), hypothèses écrites (montant plafond, retard moyen de
  la catégorie ou du budget, part des paiements en retard), date butoir par la quadriennale ; retards :
  ODP par tranche pour les hôpitaux (sourcé, daté), DGFiP par budget pour les collectivités (jointure
  SIRET, données téléchargées à la demande).
- « Trouver » gagne une première étape « Quel parcours » ; les fournisseurs publics passent par la DECP.
- Modèles d'e-mail et script « fournisseur public » (date butoir, interruption, jamais d'injonction).

**Lot 6 — Le site** (lots 1 et 4)
- Accroche : « Combien vous doit-on ? » mène à `/inscription?pour=diagnostic` ; le calculateur juste
  sous le héros, renommé.
- Calculateur : un troisième choix « Client public » (barème public, quadriennale, la date butoir de
  l'année) ; les « majoré de dix points » écrits à la main remplacés par une lecture du registre.
- Le catalogue des offres sur `/tarifs` ; formulaire « Demander » (diagnostic complet, réclamation,
  pilote) → prospect au CRM avec parcours et source ; offre fondateurs affichée.
- Pages : `/secteurs/fournisseurs-publics` (le gabarit des métiers, régime public), `/experts-comptables`,
  `/procedure-sans-juge` (liste d'attente, double confirmation, table d'inscriptions, limiteur, empreinte
  d'opposition), `/fondateur`.
- Le blog : champ `pilier`, publication datée (un article à date future attend son jour, à Paris).
- Mesure : événements Umami `calcul-fait`, `diagnostic-lance`, `offre-demandee`, `attente-inscrite`.

### Vague C — après le lot 3

**Lot 7 — Le cycle de vie**
- Le rapport du diagnostic par e-mail transactionnel ; deux rappels pendant les 14 jours de l'offre de
  bienvenue (garde par règle, `sauf` multiple, relecture de l'abonnement avant l'envoi, `ORG_ADMIN`
  seulement).
- Le point du lundi : diagnostics lancés par source, ventes qui suivent un diagnostic.
- Le relevé des étapes au webhook Paddle.

**Lot 8 — Les offres Paddle** (lot 4)
- Le prix fondateurs (50 places, 31/12, jamais migré, protégé dans `changerDeFormule`) ; la remise de
  bienvenue à usage unique ; politique de remboursement à compléter.

---

## 5. Ce qui reste au fondateur

1. Écrire à Paddle : appels B2B sortants (clause 11.1 xv) ; vente des services (catégories à faire
   approuver) ; préavis de 30 jours (9.5).
2. Les trois devis d'avocat de l'audit, en y ajoutant : l'unité de l'indemnité publique (« par
   facture » ?), l'année d'acquisition des intérêts moratoires pour la quadriennale, la réclamabilité des
   pénalités sur une facture soldée, la rédaction de réclamations pour le compte des clients.
3. Relancer le catalogue Paddle en production après le lot 4 (`npx convex run --prod
   paddleCatalogue:catalogue`).
4. Une photo pour la page fondateur.
5. Vérifier la licence de réutilisation des CSV du registre des transporteurs avant tout import.
6. Faire relire les CGV quand les services se vendront en ligne.
