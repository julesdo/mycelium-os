# Lot 2 : la file

Spec : `docs/superpowers/specs/2026-09-17-experience-compagnon-design.md`, décisions D0 à D16. Lot 1 livré aux commits `88f9589` et `672e774`. **Ce plan est une REPRISE** : la première écriture a été renvoyée par sa critique, et ce qu'elle corrige est écrit en clair au § « Ce que la reprise a démonté ».


## État d'avancement — 17/09/2026 au soir

**Les seize tâches sont livrées et en production, sauf T16.** `/app` rend la file
depuis le commit `8cadd57`, déploiement Vercel vérifié. La suite est à 1 188 tests
sur 100 fichiers, types et lint sans erreur.

| Tâches | Commit de production |
| --- | --- |
| T1 à T5, les fondations | `88f9589`, `672e774`, `9990c21` |
| T12, les filtres et le refus partagé | `2e88366` |
| T9, T10, T11 : l'arrêt, la pièce, `/app/compte` | `55b6294` |
| T6, T7, T8 : la file, ses deux vues, le volet | `d54ae9e` |
| T13, les propositions et leur mesure | `ca662a5` |
| T14, la conversation | `544547f` |
| **T15, la bascule** | **`8cadd57`** |

**T16 (le ménage) attend trente jours**, c'est sa condition : la porte de
transition en bas de la file doit avoir servi avant qu'on supprime l'ancien arbre.

**Trois dettes nommées, à ne pas perdre :**
1. Les deux verrous de `ce-qui-manque.tsx` mènent encore à `/app/import-factures`
   et `/app/debiteurs`. À T16 ils deviennent des GESTES (ouvrir le dépôt, basculer
   la vue), **pas** d'autres adresses — les pointer sur `/app` a été essayé et
   donne deux boutons morts.
2. Le bilan du dépôt de la section 8 du volet vaut `null` : aucune table ne relie
   une créance à l'import d'où viennent ses factures.
3. Les `parts` d'un client en vue Par client valent son encours en principal,
   intérêts et indemnités à zéro : `revelation` ne ventile pas par client, et un
   prorata rendrait trois chiffres plausibles et faux.

⚠️ **La table du compagnon s'appelle `echangesCompagnon`, pas `conversations`.**
Le nom `conversations` entre en collision avec une table héritée de Fleet dont le
déploiement de développement porte encore des documents sans le champ `cible`, ce
qui cassait `bunx convex dev`. Convex tolère une table orpheline, jamais un champ
requis manquant : on renomme, on ne purge pas.
## Les décisions de livraison, d'abord

1. **La bascule visible tient en TROIS fichiers, et la suppression de l'ancien arbre est un lot séparé.** Raison : un commit qui supprime seize routes, la barre, vingt écrans et rebranche soixante-six fonctions publiques n'est pas révocable, et c'est la révocabilité qu'on achetait.
2. **La bascule, c'est exactement ceci** : `routes/app/index.tsx` rend la file, `src/app/barre.tsx` meurt, `src/screens/accueil.tsx` meurt. Raison : c'est tout ce que l'utilisateur voit, et c'est le seul périmètre qu'un `git revert` rend.
3. **`accueil.tsx` et `barre.tsx` meurent AVEC la bascule, pas au ménage.** Raison : leurs quarante liens littéraux tiennent aujourd'hui `aucun-ecran-orphelin` vert ; les laisser sur disque sans montage garderait la barrière verte pour une raison fausse, ce que ce dépôt combat partout.
4. **L'ancien arbre reste joignable par UNE porte nommée et datée, en bas de la file**, cinq liens vers cinq têtes de sous-arbre : `/app/debiteurs`, `/app/procedures`, `/app/import-factures`, `/app/revelation`, `/app/parametres`. Raison : `aucun-ecran-orphelin.test.ts:114-126` exige une arête entrante par route, et une route gardée sans lien ne rend pas le test rouge, elle le rend menteur. **Elle se ferme trente jours après la bascule**, parce qu'une transition sans date est un état permanent qu'on n'a pas décidé.
5. **Le ménage se mesure sur les barrières déjà au dépôt**, pas à la main : `fonctions-appelees` sans AUCUNE entrée neuve dans `APPELEES_AUTREMENT`, `destinations-existent`, `aucun-ecran-orphelin`, et `bun run check`, que `routes/-salle/demo.ts:17` fait mordre sur chaque libellé `route:` périmé.
6. **`/app/compte` part AVANT la file.** Raison : `barre.tsx:288` est la seule entrée de `/app/parametres`, elle-même seul hub vers `/app/abonnement`, `/app/equipe` et `/app/donnees` (`reglages.tsx:203`, `:210`, `:217`).
7. **`remisesAuConseil` porte `consigneLe`, comme `evenementsProcedure`.** Raison : `tables.ts:648-650` porte `survenuLe` ET `consigneLe` sur la même table, et le tableau de § 5.8 le redit ; la première écriture avait lu la ligne à l'envers.
8. **La conversation a une surface écrite : la troisième position du `Segmented` du volet** (Pièce / Décompte / Conversation, § 4.2 section 10). Raison : la spec se contredit entre « dix sections, jamais d'onglets » et trois positions de `Segmented` ; on tranche pour le `Segmented`, qui BASCULE le volet et n'onglette pas ses dix sections, lesquelles restent le flux vertical de la position Pièce.
9. **Les propositions sont posées par le BATTEMENT, jamais par un rendu.** Raison : une `query` n'écrit pas, et une mutation déclenchée sur un chemin de lecture réactif est une boucle. `battement.ts` tourne déjà une fois par jour et par établissement, ce qui est exactement le grain du plafond.
10. **Le plafond compte en jours CALENDAIRES, pas ouvrés.** Raison : aucun calendrier de jours ouvrés ni de fériés n'existe au dépôt (zéro occurrence dans `src/lib` ; `calendrier.ts` ne fait que le quantième à quantième), et en inventer un poserait une règle de date hors de `parametres.ts`. Le garde-fou de D13 rend le week-end inoffensif : une échéance qui éteint un droit ne compte jamais dans les sept.
11. **T13 ne dépend PAS de T12.** Raison : D4 et B1 posent que la file et ses propositions se rendent sans aucun appel modèle, et les filtres B2, B3, B4 mordent sur une SORTIE DE MODÈLE qu'une proposition déterministe n'a pas. Seule T14 attend.
12. **Trois détails qui se décident une fois** : la préférence de vue s'écrit `letikette-file-vue` (`use-theme.ts:10` pose déjà `letikette-theme` dans le même magasin) ; trois index de plus que la spec n'en nomme (`propositions.by_org_and_jour`, `conversations.by_org_and_fil` et `by_org_and_mois`, parce que compter sans index balaie la table) ; `chatModel.ts` part avec T1, avant la première ligne du compagnon (zéro importeur vérifié, deux modules cités qui n'existent pas, un identifiant OpenRouter étranger à la pile).

## Ce que la reprise a démonté, avec la preuve

- **La décision 9 lisait sa propre citation à l'envers.** `tables.ts:626-638` est le commentaire « on enregistre des événements, pas un état » ; les CHAMPS sont à `:648-650` et portent les DEUX dates. `consigneLe` revient.
- **« Les libellés `route:` qu'aucun test ne regarde » est faux.** `routes/-salle/demo.ts:17` type `route` par `Extract<RouteIds<…>, '/app/${string}'>` : le compilateur les tient, et les vingt-sept y sont déjà.
- **« `organizationId: v.id('organizations')` s'écrit sur UNE ligne » est faux.** Le motif de `purge-complete.test.ts:75` est `/organizationId:\s*v\.id\('organizations'\)/`, et `\s*` traverse les retours à la ligne. Ce qui compte, ce sont les apostrophes DROITES autour de `organizations`.
- **Les comptes étaient faux d'un facteur trois.** Douze routes de réglages : treize en FICHIERS (onze `_reglages.*` dont la mise en page qui porte la liste et le `useChildMatches`, plus les deux `donnees_.supprimer-*`) ; 16 + 13 + `route.tsx` = 30, le compte exact. Vingt-et-une fonctions publiques : **soixante-six** (relevé mécanique 63, plus `revelation.bilan`, `recherche.recherche` et `billing.etatAbonnement` que le motif textuel manque). Vingt-sept destinations : ce sont 27 ADRESSES, pour **84 sites littéraux** sous `/app`, dont 76 visent une adresse qui meurt.
- **L'avertissement sur `lignes-rouges` visait à côté.** `ZONES` (`lignes-rouges.test.ts:44-51`) contient `src/lib/verticales` : `verticales/recouvrement/compagnon/` est balayé sans rien ajouter, et aucune entrée dans `FICHIERS_ISOLES` n'est nécessaire. Le vrai trou est `src/lib/convex/`, où vivra l'action de conversation.
- **Le risque 7 de la critique ne tient pas, et c'est le seul point qu'on refuse.** `recalculerScore` est une fonction de module ordinaire (`creances.ts:190`, non exportée), pas une fonction Convex : l'importer dans `pieces.ts` et `radar.ts` ne crée aucune référence `internal.<son module>`, donc aucun cycle d'inférence. Le coût de rejeu nocturne, lui, reste, et T3 le borne.

## Les vingt-sept adresses, une par une

| Adresse | Ce qu'elle porte | Où ça va |
| --- | --- | --- |
| `/app/` | Accueil, veilleur, `CeQuiManque`, `MODE_COMPACT` | **DEVIENT la file** (T6) |
| `/app/debiteurs` | Liste, volet `?d=`, `ui/identite-debiteur.tsx` (taux stipulé, lot 1), secteur, registre, lettrage | Vue Par client (T7), volet et rangée de lettrage (T8) |
| `/app/debiteurs/$id/habitude` | Habitude de paiement et sa rupture | Rangée du client, vue Par client (T7) |
| `/app/debiteurs/$id/pieces` | Dépôt, classement, retrait de pièces | Volet section 5 (T8) |
| `/app/procedures` | Dossiers engagés et leurs échéances | Portée « Engagés » (T6) |
| `/app/revelation` | Révélation, supplément, `BilanPertes`, angles morts | Portée « Ce que vos factures portent » (T6) |
| `/app/import-factures` | Dépôt de fichiers, liste des dépôts | `Toolbar` et état vide de la file (T6) |
| `/app/import-factures/$id` | Suivi d'import, `BilanImport` | Rangée datée (T6), volet section 8 (T8) |
| `/app/creance/$id` | Fiche créance, score, teinte verte | Volet sections 1 à 3 (T8). Le score et la teinte partent (D8, D11) |
| `/app/creance/$id/decompte` | Produire un décompte | `/app/arret/$id` (T9) puis `/app/decompte/$id` (T10) |
| `/app/creance/$id/litige` | Six questions, `repondre`, `declarerFait`, `propositionsLitige` | Rangée de litige (T6), volet section 2 (T8) |
| `/app/creance/$id/procedure` | Voies, `engagerProcedure`, suivi, échéances, carnet | Volet section 6 (T8), carnet dans `/app/compte` (T11) |
| `/app/creance/$id/relances` | Brouillons et leurs trois refus | Volet section 9 (T8) |
| `/app/creance/$id/risques` | Risques relevés et leur gravité | Volet section 4 (T8) |
| `/app/creance/$id/solidite` | Conditions légales, pièces manquantes | Volet section 2 (T8) |
| `/app/parametres` | Le hub des réglages | `/app/compte` (T11) |
| `/app/parametres/creancier` | Identité du créancier, recherche au registre, `retenir()` | `/app/compte`, section Établissement, en édition (T11) |
| `/app/parametres/etablissement` | Nom de l'établissement, volume émis | `/app/compte`, section Établissement (T11) |
| `/app/abonnement` | `billing.etatAbonnement`, essai, paliers | `/app/compte`, section Facturation (T11) |
| `/app/abonnement/premier-bilan` | L'offre « Premier bilan » | `/app/compte`, section Facturation (T11) |
| `/app/abonnement/suivi` | L'offre « Suivi » | `/app/compte`, section Facturation (T11) |
| `/app/equipe` | Membres, rôles, invitations, les onze `organizations.*` | `/app/compte`, section Équipe (T11) |
| `/app/equipe/inviter` | Inviter par adresse et rôle | `/app/compte`, section Équipe, en ligne (T11) |
| `/app/donnees` | `apercuDeMesDonnees` | `/app/compte`, section Données (T11) |
| `/app/donnees/export` | `exporterMesDonnees` | `/app/compte`, section Données (T11) |
| `/app/donnees/supprimer-compte` | `supprimerMonCompte`, confirmation par saisie | `/app/compte`, section Données (T11) |
| `/app/donnees/supprimer-etablissement` | `supprimerEtablissement` | `/app/compte`, section Données (T11) |

## Les trente-trois fichiers de `src/screens/`

| Fichier | Où ça va | Quand il meurt |
| --- | --- | --- |
| `accueil.tsx` | Remplacé par `screens/file.tsx` | **T15**, avec la bascule |
| `debiteurs.tsx`, `debiteur-detail.tsx` | Vue Par client (T7), volet de preuve (T8) | T16 |
| `creance.tsx` | Volet sections 1 à 3 (T8) | T16 |
| `procedures.tsx` | Portée « Engagés » (T6) | T16 |
| `revelation.tsx` | Portée « Ce que vos factures portent », `BilanPertes` compris (T6) | T16 |
| `analyses/decompte.tsx` | `/app/arret/$id` et `/app/decompte/$id` (T9, T10) | T16 |
| `analyses/litige.tsx` | Rangée de litige (T6) et volet section 2 (T8) | T16 |
| `analyses/procedure.tsx` | Volet section 6 (T8) | T16 |
| `analyses/relances.tsx` | Volet section 9 (T8) | T16 |
| `analyses/risques.tsx`, `analyses/solidite.tsx` | Volet sections 4 et 2 (T8) | T16 |
| `debiteur/habitude.tsx`, `debiteur/pieces.tsx` | Rangée du client (T7), volet section 5 (T8) | T16 |
| `import/depots.tsx`, `import/depot.tsx` | `Toolbar`, rangée datée, volet section 8 (T6, T8) | T16 |
| `parametres/reglages.tsx` | `/app/compte`, thème et déconnexion (T11) | T11 |
| `parametres/creancier.tsx`, `parametres/etablissement.tsx` | `/app/compte`, section Établissement (T11) | T11 |
| `abonnement/abonnement.tsx`, `offre.tsx`, `premier-bilan.tsx`, `suivi.tsx` | `/app/compte`, section Facturation (T11) | T11 |
| `equipe/equipe.tsx`, `equipe/inviter.tsx` | `/app/compte`, section Équipe (T11) | T11 |
| `donnees/donnees.tsx`, `export.tsx`, `supprimer-compte.tsx`, `supprimer-etablissement.tsx`, `types.ts` | `/app/compte`, section Données (T11) | T11 |
| `passage.tsx`, `sans-etablissement.tsx`, `titres.ts` | **Restent.** Montés par `router.tsx` et par cinq écrans | Jamais |

## Ce qu'on ne construit pas, et pourquoi la carte l'interdit

- **La proposition AUTOMATIQUE de rapprochement (A7)** n'a pas de source : un règlement orphelin est compté puis JETÉ (`import.ts:234-237`). ⚠️ **La surface MANUELLE reste** : `ui/lettrage.tsx`, `lettrage.proposer` et `lettrage.appliquer` migrent en rangée de la file, deux boutons de même poids, le seul lot légitime de D6 (§ 6). Conserver les orphelins est une table de plus, et son lot.
- **Le pli « Sans débiteur identifié »** ne peut pas exister : `facturesVente.debiteurId` est obligatoire (`tables.ts:325`). Le pli porte le nom `debiteursSansIdentifiant` (`surveillance.ts:442-447`). ⚠️ Cette liste ne rend aujourd'hui que des DÉNOMINATIONS : T7 lui ajoute l'identifiant, sans quoi son geste (A11) n'a pas de cible.
- **Les rangées cliquables sur `hypotheses` et `anglesMorts`** : chaînes libres sans identifiant (`verticales/recouvrement/surveillance.ts:548-628`), rendues en TEXTE pleine largeur.
- **`PARAMETRE_MANQUANT` de `controle.ts`** : `parametresRequis` n'est jamais passé par son seul appelant (`decompte.ts:331`), l'écran d'arrêt le DIT au lieu de laisser croire à un verrou. **Le sélecteur de pays, le champ `pays`, `exigerPourActe()` câblé** : § 5.9 et § 10 Q2 les excluent nommément, le produit n'émet aucun acte.

## Les tâches

### T1. Ce qui se fait avant la première rangée

`Facultatif` sort de `src/app/barre.tsx:93` vers `src/ui/facultatif.tsx` (B1), `barre.tsx` l'importe de là jusqu'à sa mort ; `src/lib/convex/utils/chatModel.ts` est supprimé.
**Acceptation.** La barre se rend à l'identique, et une recherche de `CHAT_MODEL_ID` dans `src/` ne rend plus rien.

### T2. L'événement porte la date de son fait, son montant et son nom

`Evenement` (`verticales/…/surveillance.ts:57-82`) gagne `dateDuFait?: string` en AAAA-MM-JJ, recopié dans `vEvenement` (`convex/…/surveillance.ts:55-96`). Trois types la portent, la donnée existant déjà en amont : `FACTURE_ECHUE`, `PRESCRIPTION_PROCHE` (calculée à l'assemblage puis jetée, `:262-280`), `ECHEANCE_PROCEDURE`. `comparerEvenements` (`:285-292`) range sur l'urgence puis le montant. Deux défauts de production partent : `ECHEANCE_PROCEDURE.montantEnJeu` (`convex/…/surveillance.ts:385`) cesse d'être `ZERO` écrit en dur et somme les restes dus, et `reference` (`:383`) cesse d'être `creance._id` pour porter la dénomination du débiteur. `CibleEvenement` gagne le `debiteurId` sur les deux types à cible CREANCE.
**Acceptation.** La rangée de caducité affiche un montant en euros et un nom de client, et la file par défaut ouvre sur la prescription la plus proche, pas sur la plus grosse.

### T3. `eligible` cesse de mentir entre deux mutations

`recalculerScore` (`creances.ts:190`) est EXPORTÉ et appelé par les trois sites qui le sautent aujourd'hui : dépôt de pièce (`pieces.ts`), santé écrite par le radar (`radar.ts:71`), facture ajoutée. Import de module, aucune référence `internal.`, donc aucun cycle d'inférence. ⚠️ Le rejeu nocturne est BORNÉ : le radar ne rejoue que les créances des débiteurs dont la santé a CHANGÉ cette nuit, jamais tout le portefeuille, cloisonnement revérifié en plus de l'index.
**Acceptation.** Un débiteur passé en liquidation au registre fait disparaître sa créance de la portée « À trancher » au battement suivant, sans qu'on ait touché la créance.

### T4. Les cinq lectures d'établissement qui manquent

`decompte.listerDecomptes` (l'index `decomptes.by_org`, `tables.ts:800`, n'est lu que par `rgpd.ts:85` et `:210`), `pieces.listerPieces` (`pieces.ts:286` exige un `debiteurId`), `comportement.lireParEtablissement`, `briefing.duJour` (seul appelant `battement.ts:194`), `controle.abandonsDeLEtablissement`. Trois transports avec elles : `nature` de l'abandon traverse enfin Convex (`controle.ts:35` le porte, `decompte.ts:286-293` ne le déclare pas) ; `revelation.lignes` gagnent `_id` et le débiteur (`revelation.ts:100-174`, où la table des débiteurs est déjà en main) ; `listerCreances` rend `eligible` au lieu de `score` et trie comme son commentaire l'annonce (`lecture.ts:691-740`).
**Acceptation.** Une portée « Décomptes » affiche un compte non nul sans qu'on ait ouvert une créance, et une ligne de la révélation s'ouvre au doigt sur son client.

### T5. Les quatre tables

`journal` après `evenementsProcedure` (`tables.ts:640`) ; `propositions`, `conversations`, `remisesAuConseil` en fin de `recouvrementTables` (`:838`), à la forme de § 5.8 et § 4.4, **`consigneLe` compris** (décision 7), plus les index de la décision 12. ⚠️ `organizationId: v.id('organizations')` s'écrit avec des apostrophes DROITES, sinon `purge-complete.test.ts:75` ne voit pas la table. Les quatre noms entrent dans `viderParIndexOrg` (`rgpd.ts:716-725`) et dans `purgerEtablissement` (`:502-512`), AVANT `intervenants`, `evenementsProcedure`, `decomptes` et `creances` que `remisesAuConseil` référence. La liste littérale de `tables.test.ts:76-89` passe de treize à dix-sept noms. `journal` et `conversations` grossissent sans borne : l'export les lit par page sur le modèle de `_pageDeFactures` (`rgpd.ts:152-166`), et `apercuDeMesDonnees` (`:63-110`) les compte. `coutEstime` porte en commentaire qu'il est un budget de pilotage en dollars, jamais un montant opposable.
**Acceptation.** On supprime un établissement de démonstration, et l'aperçu qui précède compte ses conversations et ses propositions avant de les effacer.

### T6. La file, vue Par créance

`src/screens/file.tsx`, monté d'abord dans `-salle/` : la `Toolbar` (sélecteur remonté de `barre.tsx:418`, `Segmented`, dépôt, palette réhébergée), les deux nombres de tête avec la règle d'amputation de `revelation.ts:28-30` sous eux et jamais repliée, les puces de portée (une puce à zéro ne se rend pas), les rangées, le pli compté et typé. Isolement PAR SOURCE DE RANGÉES avec `Facultatif` (B1). Le total de tête sort de `revelation.total` et non de `montantIdentifie` : les deux comptent les mêmes factures et rendent deux nombres différents. Entrent ici, et c'est la liste complète de ce que la première écriture perdait en silence : la rangée unique du veilleur et le bandeau refermable (§ 5.2), la rangée datée d'un dépôt terminé, la rangée de lettrage à deux boutons, la rangée de litige avec sa proposition sous la question (`propositionsLitige`, `repondre`, `declarerFait` rebranchées), la portée « Ce que vos factures portent » **avec le supplément, `BilanPertes` ET les angles morts en texte**, et `CeQuiManque` dont les deux destinations (`ce-qui-manque.tsx:102` et `:114`) sont réécrites. **B9 se tient ici, au point d'usage** : le pli ne prend que des rangées sans hypothèse retenue, sans facture `nonChiffree` et sans ligne écartée d'un dépôt.
**Acceptation.** Aux quatre largeurs, la prescription du portefeuille se lit sans un geste, le bilan des pertes se lit dans sa portée, et une source qui lève laisse les autres rangées à l'écran en nommant celle qui manque.

### T7. La vue Par client

Le `Segmented` bascule sur `usePreference` (`use-preference.ts:34-56`), clé `letikette-file-vue`, valeurs `CREANCE` et `CLIENT`, défaut `CREANCE`. La colonne vertébrale est `listerDebiteurs` (`lecture.ts:71-176`), déjà triée par encours décroissant, à quoi T2 et T4 ajoutent l'échéance la plus proche, le compte typé d'obstacles, l'habitude de paiement (`comportement.lire`) et le portefeuille au sens de `controle.ts`. Les trois cas de bascule avec une ligne ouverte sont écrits. Le pli `debiteursSansIdentifiant` gagne l'identifiant du débiteur et **son geste, la recherche BODACC par nom** : `debiteurs.chercherAuRegistre`, `renseignerSiren` et `renseignerSecteur` y sont rebranchées, sans quoi un débiteur non identifié devient définitivement non identifiable et l'hypothèse de prescription la plus courte devient incorrigible.
**Acceptation.** On bascule avec une ligne ouverte : le volet ne se ferme pas, la rangée du client s'ouvre et défile à l'écran, la ligne y est surlignée en teinte neutre, et un débiteur sans SIREN se cherche au registre depuis son pli.

### T8. Le volet de preuve, `?ligne=<id>`

`src/screens/volet.tsx`, état adressable et non route. Un `Segmented` Cladd de trois positions le BASCULE (Pièce, Décompte, Conversation, décision 8) ; la position Pièce reste un seul flux vertical de dix sections dépliables, jamais d'onglets. Migrent telles quelles : `ui/suivi-procedure.tsx:160` en section 6 (la seule saisie de date que le produit ne peut pas déduire, en date du FAIT), `ui/bilan-import.tsx` en section 8, l'énumération de `analyses/procedure.tsx:337` et `ui/feuille-voie.tsx` en section 6 disponibles AVANT l'arrêt, `ui/solidite.tsx` et `ui/questionnaire-litige.tsx` en section 2, `ui/pieces.tsx` en section 5, `ui/choix-intervenant.tsx` en section 6. ⚠️ **`apresProcedure.engagerProcedure` est rebranchée ici**, avec `consignerEvenement`, `suiviDeLaCreance` et `rattacherIntervenant` : sans elle aucune créance ne passe à `ENGAGEE`, donc aucun `ECHEANCE_PROCEDURE` ne se produit, donc la portée « Engagés » naîtrait vide pour toujours et le montant que T2 vient de réparer ne s'afficherait jamais. C'est le défaut fondateur de `fonctions-appelees.test.ts:16-22`, et le refaire serait le refaire en connaissance de cause. Le brouillon de la section 9 reste produit par `relance.ts` sans appel modèle (B10), les trois refus s'affichent à sa place (B12), et `GesteRelance = 'ARRETER_DECOMPTE'` pointe vers `/app/arret/$id`, ce qui retire le `as never` de `ui/relances.tsx:187`. **B5 se tient par l'absence** : aucun composant d'envoi n'existe dans `src/ui/` aujourd'hui, et le volet n'en introduit aucun.

**⚠️ Trois corrections relevées AU CODE pendant T8.**
1. **Le `as never` de `ui/relances.tsx:187` NE PART PAS avec la route.** Il ne tenait pas à la
   destination — déjà déclarée — mais à `as={Lien}` sur un `Button` : passer `Lien` en élément
   d'un bouton efface le générique du routeur, donc le typage des paramètres avec lui. Le retirer
   ne compile pas, quelle que soit la route visée. La DESTINATION, elle, reste vérifiée contre
   l'arbre des routes et par `destinations-existent`. `ui/veilleur.tsx:415-416` porte la même
   assertion pour la même raison.
2. **`surveillance.ts:548-628` ne porte ni `hypotheses` ni `anglesMorts`.** Il n'existe AUCUN
   `hypotheses` dans ce fichier ; `anglesMorts()` est à `:675-745`, et l'hypothèse du délai le
   plus court vient de `regimePrescription()` (`pays/france/prescription.ts:179-194`), qui la
   porte avec sa note. C'est de là que la section 3 du volet la tire.
3. **Le « (i) par segment » de § 4.2 section 1 est rendu UNE FOIS PAR SURFACE, délibérément.** La
   fiche est attachée à un PARAMÈTRE, pas à un segment : douze segments d'une même créance
   renverraient douze fois aux deux mêmes fiches. `referentiel.ts` a déjà tranché cette question
   dans ces termes — « le répéter à chaque segment serait du bruit, et le bruit s'apprend ». Le
   tableau sous le décompte porte exactement ce que le « (i) » aurait ouvert : valeur, source,
   date de relevé, `verifie`, `valideParAvocat`.

**Acceptation.** On recharge une URL portant `?ligne=`, le volet revient ouvert sur la même section, un montant s'y déplie en segments portant base, taux, jours et base annuelle, et une voie déclarée engagée fait apparaître ses échéances dans la file au battement suivant.

### T9. `/app/arret/$id`, le seul écran plein cadre

Route neuve, lien entrant depuis `/app/creance/$id/decompte` tant qu'elle existe, puis depuis la file. Trois étages : le contrôle de complétude chiffré de `controle.ts:76-90` avec ses deux sorties de même poids, le pré-vol en trois questions, et le bouton qui porte son montant, sa date et son irréversibilité en toutes lettres. Aucun « Annuler » cosmétique, aucun lot (D6, B7), et `PARAMETRE_MANQUANT` déclaré inopérant à l'écran plutôt que laissé à croire.
**Acceptation.** Un décompte qui écarte deux factures connues du débiteur affiche leurs références, leurs montants et le total abandonné en euros avant que le bouton ne soit atteignable.

### T10. `/app/decompte/$id` et le suivi de la remise (D12)

Route neuve, lien entrant depuis `/app/arret/$id`. Une ligne par segment, chaque valeur juridique avec son article, sa date de relevé et ses deux booléens, et la mention en tête qui compte les quinze paramètres ; le dossier pour le conseil vit sous `exiger()`. Le suivi s'écrit sur `remisesAuConseil` : quatre états, aucune transition automatique, deux dates par transition (décision 7), `decompteId` figé pour toujours. La rangée de la file reste PLEINE pendant la remise, avec l'écart entre le décompte figé et le montant du jour décomposé, et l'angle mort de `pays/france/prescription.ts` déclaré.
**Acceptation.** Un dossier remis affiche les deux montants et leur écart en intérêts courus, et la prescription continue de s'afficher avec la phrase qui dit que le logiciel ne sait pas ce que le conseil a engagé.

### T11. `/app/compte`, six sections et treize fichiers

Route neuve, six sections dépliées, zéro sous-route, et **treize fichiers de route meurent le même jour** (onze `_reglages.*` dont la mise en page, plus les deux `donnees_.supprimer-*`), sinon ils sont orphelins à l'instant où `barre.tsx:288` repointe l'avatar. Les six sections, chacune avec son contenu, parce que la première écriture en passait trois sous silence : **Établissement** garde les trois champs du créancier en édition (`creancier.tsx:333-345`), la recherche au registre et `retenir()`, plus le nom et le volume émis d'`etablissement.tsx` ; **Facturation** reprend `billing.etatAbonnement` et les deux offres, frontière Paddle assumée (§ 4.5) ; **Équipe** reprend les onze `organizations.*` et l'invitation en ligne, frontière Better Auth assumée ; **Données** reprend les quatre `rgpd.*` avec `ui/confirmation-par-saisie.tsx` ; **Intervenants** reprend le carnet et ses deux recherches, sans quoi A3 débloque quelque chose qui n'existe plus ; **Affichage et session** reprend le `Segmented` de thème (`reglages.tsx:236-249`) et `onSeDeconnecter` (`:61`).
**Acceptation.** On change d'établissement, on se déconnecte, on corrige une adresse de créancier, on lit son état d'abonnement, on invite un membre, on exporte ses données et on ouvre le carnet, sans passer par une adresse qui n'est plus déclarée.

### T12. Les filtres avant rendu, et le refus partagé

`verticales/recouvrement/compagnon/filtres.ts` : B2 (lexique de la garantie), B3 (tout ÉNONCÉ juridique résout vers `parametres.ts` ou n'est pas rendu, qu'il cite un article ou non), B4 (aucun montant sans pastille reliée à un décompte), B6 (champ lexical de la procédure, n'importe où dans la phrase), B11 (aucun nom de tiers dans un brouillon) ; chacun LÈVE en nommant le terme trouvé et ne remplace jamais en silence. `compagnon/refus.ts` sort de `relance.ts:120-142` le type de refus, le porte à quatre champs, `peutFaire` REQUIS, et le rend partageable (B14). `compagnon/` vivant sous `verticales/`, `lignes-rouges.test.ts:44-51` le balaie déjà.
**Acceptation.** On fait passer « la voie la plus rapide ici est l'injonction de payer » au filtre : rien ne s'affiche, et le refus nomme le terme trouvé.

### T13. Les propositions, leur plafond et leur mesure (D13)

`convex/recouvrement/propositions.ts` : la pose, la rétention, l'écart avec son motif en toutes lettres, jamais une suppression. **La pose se fait dans `battement.ts`**, une fois par jour et par établissement (décision 9) ; la file LIT, et n'écrit que sur un tap. Sept par jour calendaire et par établissement (décision 10), trois au plus par rangée, comptés sur `by_org_and_jour`. Deux garde-fous : une échéance qui éteint un droit ne compte JAMAIS dans les sept, et ce qui dépasse est compté et nommé (« 7 aujourd'hui, 12 en attente, les voir »), jamais tronqué comme `accueil.tsx:164` le fait. `afficheeLe` et `decideeLe` s'écrivent tous les deux, et une proposition non confirmée retombe sur `unknown`. ⚠️ **L'instrumentation part ICI, pas plus tard** : `propositions.mesures` rend les trois nombres de § 10 Q3 par établissement et par jour (taux de rétention, médiane du délai entre l'affichage et le tap, taux de correction après coup lu dans `journal`), et une section repliée de `/app/compte` les affiche. Sans elle, la seule réponse possible à une file décevante est le revert entier, jamais le déplacement du sept.
**Acceptation.** Sur un établissement qui en mériterait quarante, la file en propose sept et affiche le reste en compte nommé, une rangée de prescription est proposée en plus des sept, et les trois nombres se lisent le lendemain.

### T14. La conversation (D14, D15)

`functions.ts` gagne `authedAction` (il n'a que `authedQuery:47` et `authedMutation:61`), avec annotation de type de retour explicite, sinon `internal.<son module>` crée le cycle qui dégrade `api` tout entier ; le remède est documenté sur place à `rgpd.ts:280-286`. Le prompt système vit dans `compagnon/prompt.ts`, figé, en tête, avec `cache_control: ephemeral` sur le motif d'`extracteur.ts:83-93`, le contexte de dossier restant APRÈS le point de coupure. `ANTHROPIC_API_KEY` passe par `requireEnv`, sinon une clé absente rend une erreur de SDK au lieu du refus en quatre parties. ⚠️ La plomberie de coût s'écrit EN ENTIER : `estimerCout` et `CAP_EUR` (`socle/modele/cout.ts`) n'ont AUCUN site d'appel dans le dépôt, `extraireAvecClaude` capture l'usage facturé (`:194-198`) et ses deux appelants le jettent (`depot.ts:116`, `preuve.ts:84`), et aucune table ne porte de champ d'usage ; D14 ne coûte donc pas « peu parce que `cout.ts` existe ». Avertissement à 20, arrêt de la conversation LIBRE seule à 30, et quand il mord, D0 s'applique.
**Acceptation.** Une question rend une réponse dont chaque phrase porte sa pastille, et le plafond de sécurité atteint affiche un refus en quatre parties pendant que la file continue de se rendre.

### T15. La bascule, et elle est petite

`routes/app/index.tsx` rend `screens/file.tsx` ; `src/app/barre.tsx` et `src/screens/accueil.tsx` sont supprimés (décision 3) ; la `Toolbar` réhéberge le sélecteur, la palette (D16) dont l'`ouvrir` (`barre.tsx:169-178`) traduit vers `?ligne=<id>`, l'avatar vers `/app/compte`, le veilleur avec `notifications.listMyNotifications`, `markAsRead` et `getUnreadCount`, plus `users.viewer` et `recherche.recherche`. Une porte nommée et datée en bas de la file porte les cinq liens de la décision 4. ⚠️ **Les deux graphies de notification se traitent des DEUX côtés** : `ui/veilleur.tsx:173-186` accepte l'ancienne et la neuve pendant trente jours, ET `battement.ts:255-261` cesse d'écrire `/app/creance/<id>` et `/app/debiteurs?d=<id>` pour écrire `?ligne=<id>`, sans quoi chaque notification créée APRÈS la bascule naîtrait morte, en silence, `destinations-existent.test.ts:141` excluant nommément la forme `lien:` du balayage. La raison de `/app` dans `ATTEINTS_AUTREMENT` (`aucun-ecran-orphelin.test.ts:51`) se réécrit : ce n'est plus une coquille de mise en page, c'est l'écran de travail, atteint par huit liens.

**⚠️ Trois corrections relevées AU CODE pendant T6 et T7, et qui mordent ici.**
1. **Toutes les références `barre.tsx:NNN` de ce plan sont décalées de onze lignes** : il a été écrit sur l'état d'avant T1, qui a retiré la définition de `Facultatif` du fichier. Le sélecteur d'établissement est à `:407` et non `:418`, l'avatar à `:277` et non `:288`. Rouvrir avant de citer.
2. **`listerDebiteurs` est à `lecture.ts:136-176`**, pas `:71-176` : les lignes 71 à 135 sont les validateurs et deux fonctions d'aide.
3. **Les deux destinations de `ce-qui-manque.tsx` (`:102` et `:114`) N'ONT PAS PU être réécrites en T6, et le travail retombe ICI.** `Verrou.vers` est typé `LinkProps['to']` contre l'arbre des routes : tant que la file n'a pas d'adresse, les repointer échoue à `bun run check`. C'est la bascule qui leur donne leur cible.

**Acceptation.** On ouvre `/app` : une seule file, une `Toolbar`, aucune barre, aucune notification ancienne qui ne s'ouvre plus, et l'ancien arbre ne s'atteint que par une porte nommée qui dit sa date de fermeture.

### T16. Le ménage, et sa mesure

Les vingt-neuf fichiers de route restants, les vingt fichiers d'écran du tableau ci-dessus et les soixante-six fonctions publiques partent PAR SOUS-ARBRE, un commit par famille (créance, débiteurs, import, révélation, procédures, réglages), chacun supprimant ENSEMBLE la route, l'écran, l'entrée de `-salle/` et les fonctions devenues injoignables. ⚠️ **Aucune inscription en masse dans `APPELEES_AUTREMENT`**, ce que le commentaire du fichier interdit nommément : une fonction sans appelant est supprimée ou rebranchée. `knip.config.ts` se répare d'abord : ses `entry` visent encore `src/routes/**/+page.svelte` et le dépôt ne porte plus un seul `.svelte`, donc `bun run knip` ne nomme aujourd'hui aucun écran orphelin. C'est lui qui mesure les FICHIERS d'écran, que ni `aucun-ecran-orphelin` (qui ne lit que des routes) ni le compilateur ne voient.
**Acceptation.** `bun run knip` ne nomme plus aucun fichier de `src/screens/` sans importeur, `fonctions-appelees` est vert sans entrée neuve, et la porte de transition a disparu de la file.

## Les tests

Aucune étape de test rédigée, et aucun test neuf par défaut. **Cinq exceptions, une ligne chacune :**

1. **B3, l'énoncé juridique non résolu** (T12). Règle juridique : « ce type de créance se prescrit par cinq ans » ne cite aucun article et échappe à tout balayage existant.
2. **B6, le champ lexical de la procédure** (T12). Ligne rouge 3 : le balayage actuel est une liste d'impératifs et ne voit ni « la voie la plus rapide » ni « vous pourriez saisir le tribunal ».
3. **B4, le montant sans pastille** (T12). Calcul de montant : un montant en texte libre ne se refait pas à la main, et c'est ce que fera le débiteur qui le conteste.
4. **Le montant et la date de `ECHEANCE_PROCEDURE`** (T2). Calcul de montant : un `ZERO` écrit en dur sur l'échéance la plus dangereuse du produit se lit comme « sans enjeu ».
5. **Le cloisonnement des quatre tables neuves** (T5). Cloisonnement : `purge-complete.test.ts` vérifie la CITATION dans `rgpd.ts`, pas l'effacement, et un commentaire suffit à le rendre vert.

**B15 s'ajoute comme un CAS de `src/lib/socle/__tests__/frontiere.test.ts`, pas comme un fichier neuf**, et se justifie au titre de la règle juridique : un compagnon qui importe `verticales/recouvrement/pays/` devient le dix-neuvième site qui choisit la France, et il faudra le réécrire phrase par phrase au second pays. **B5, B8, B9 et B13 n'appellent aucun test neuf** : B5 est tenue par l'absence de tout composant d'envoi dans `src/ui/`, B8 par la disparition du score et de sa teinte avec `screens/creance.tsx` au T16, B9 au point d'usage dans le pli de T6, B13 par `purge-complete.test.ts` qui mord déjà.

Les existants qui tombent se corrigent : `tables.test.ts:76-89` (treize vers dix-sept, plus deux assertions par table neuve) ; `destinations-existent`, `aucun-ecran-orphelin` et `fonctions-appelees` à T15 puis à chaque commit de T16 ; `declare-jamais-alimente.test.ts:94-140` sur les dix-huit `v.literal` neufs et sur les optionnels du chemin le moins fréquent (`motifCloture`, `attendu`, `closLe`, `revenuLe`, `motifEcart`, `decideePar`, `avant`, `survenuLe`). ⚠️ Ce balayage ne lit les optionnels qu'à DEUX tabulations : un optionnel imbriqué dans `pastilles` lui est invisible, donc lisible et jamais écrit sans que rien ne tombe. Vérifier par `bun run test:unit` ENTIER, jamais par dossier, parce que `recouvrement/__tests__/tables.test.ts` vit hors des deux dossiers qu'on relance d'habitude et que son propre commentaire dit qu'`intervenants` l'a laissé rouge sans lecteur. Reproduire les quatre tables contre `dev:cloud`, pas en local.

⚠️ **`salle-complete.test.ts` n'existe pas**, alors que `routes/-salle/ecrans.tsx:21` l'annonce. Rien n'oblige donc un écran neuf à entrer dans la salle : T6 à T11 s'y inscrivent à la main, et `demo.ts:17` tient les libellés une fois qu'ils y sont.

## L'ordre de livraison

| # | Tâche | Visible du gérant | Part en production |
| --- | --- | --- | --- |
| 1 | T1, `Facultatif` et `chatModel.ts` | Non | Seul, et en premier. Aucune dépendance |
| 2 | T2, la date et le montant de l'événement | Oui, le flux actuel s'améliore | Seul. Corrige deux défauts de production |
| 3 | T3, `eligible` rejoué | Oui, en mieux | Seul |
| 4 | T4, les cinq lectures | Non, rien ne les lit encore | Seul, plus trois transports |
| 5 | T5, les quatre tables | Non | Seul, avant tout écran. Le déploiement passe |
| 6 | T9 puis T10, l'arrêt et la pièce | **Oui**, deux adresses de plus | Séparément. Chacune vaut par elle-même |
| 7 | T11, `/app/compte` | **Oui**, treize écrans deviennent une page | Seul, avec la mort des treize routes |
| 8 | T6, T7, T8, la file et son volet | Non, salle seulement | Regardés aux quatre largeurs |
| 9 | T12, les filtres et le refus partagé | Non | Seul. Condition de T14 SEULEMENT |
| 10 | T13, les propositions et leur mesure | Non, salle seulement | Seul. Ne dépend pas de T12 |
| 11 | T14, la conversation | Non, salle seulement | Seul. Si T12 n'est pas vert, le CHAMP attend |
| 12 | **T15, la bascule** | **Oui, tout** | **Trois fichiers, une journée, révocable** |
| 13 | T16, le ménage | Non | Six commits par sous-arbre, trente jours |

Chaque groupe vérifié part par `git push origin <sha>:main` depuis la branche, sans attendre la fin du lot.

## La sortie de secours de la chaîne T12, T13, T14

**Si T12 glisse, T13 part quand même**, et la bascule aussi. D4 et B1 posent que la file et ses propositions se rendent sans aucun appel modèle, et les filtres B2, B3 et B4 mordent sur une sortie de modèle qu'une proposition déterministe n'a pas. **Seule T14 attend.** Ce jour-là : le `Segmented` du volet a DEUX positions au lieu de trois (Pièce, Décompte), les rangées portent leurs propositions et leurs sources, et une ligne le dit en toutes lettres, « le compagnon répond aux questions le jour où ses filtres sont posés ». Ce n'est pas moins que l'arbre qu'elle remplace : c'est la prescription lisible sans un geste, deux vues, un volet adressable et un décompte décomposable, dont aucun n'existait.

## Revenir en arrière si la file déçoit

**Le seul commit à annuler est celui de T15**, et c'est la raison d'être des décisions 1 à 3 : il ne porte ni schéma, ni fonction Convex, ni champ, et touche trois fichiers. `git revert` ramène la barre et l'accueil, aucune donnée n'est orpheline puisque les quatre tables, les cinq lectures et les champs de T2 sont en production depuis des jours et ne sont lus que par la file, et **l'ancien arbre n'a jamais cessé d'exister** : c'est ce que la porte de transition achète, et c'est pour ça que T16 ne part pas le même jour.

**Ce qu'un retour arrière ne rend PAS, écrit sans détour.** L'état auquel on revient n'est pas `672e774` : c'est un état intermédiaire où `/app/parametres` et les treize routes de réglages sont mortes depuis le point 7, où `barre.tsx:288` pointe sur `/app/compte`, où `ce-qui-manque.tsx:102` et `:114` ont été repointées, et où `battement.ts` écrit la graphie neuve. Chacune de ces surfaces se regarde à l'usage pendant les cinq livraisons qui séparent le point 7 de la bascule, précisément pour que cet état intermédiaire ne soit pas découvert le jour du revert.

**Ce qu'on regarde avant de décider.** Les trois nombres que `propositions.mesures` rend depuis T13, et pas depuis une tâche future : le taux de rétention, le délai entre l'affichage et le tap, et le taux de correction après coup, seul des trois à ne pas être auto-référentiel. Sept est une hypothèse datée, écrite pour être déplacée sur des nombres, exactement comme `SEUIL_QUALIFICATION` l'est dans son propre commentaire (`scoring.ts:150-158`).
