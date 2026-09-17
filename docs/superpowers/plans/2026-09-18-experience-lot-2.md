# Lot 2 : la file

Spec : `docs/superpowers/specs/2026-09-17-experience-compagnon-design.md`, décisions D0 à D16. Lot 1 livré aux commits `88f9589` et
`672e774` (commercialité déduite, D11, taux stipulé, signature de réception, propositions datées, refus en quatre parties). Ce lot ne les refait pas.

## Les décisions de livraison, d'abord

1. **La tension se tranche sur ce que l'UTILISATEUR voit, pas sur le nombre de fichiers** : tout le dessous de la file part au fil de l'eau sans qu'un gérant voie rien changer, et seule la bascule est un bloc.
2. **Le drapeau existe déjà, c'est la salle** : `showroom.tsx:70-76` lève `notFound()` hors de `import.meta.env.DEV`, donc un écran inscrit dans `-salle/` est en production, compilé et typé, et injoignable pour un client. On n'écrit aucune machinerie de drapeau.
3. **Les trois adresses neuves partent AVANT la bascule, dans l'arbre actuel**, chacune avec son lien entrant depuis un écran vivant : `destinations-existent.test.ts` balaie tout `src/`, salle comprise, donc la file ne peut pas écrire `to="/app/arret/$id"` avant que la route existe.
4. **`/app/compte` part AVANT la file, contre la suggestion de § 9** : `barre.tsx:288` est la SEULE entrée de `/app/parametres`, elle-même seul hub vers `/app/abonnement`, `/app/equipe` et `/app/donnees` (`reglages.tsx:203`, `:210`, `:217`), donc la barre ne peut pas mourir tant que la `Toolbar` n'a pas où pointer.
5. **Ce n'est pas une moitié de file avec une moitié d'arbre** : `/app/compte` remplace un arbre de réglages par une page de réglages, atteinte par le même avatar, et ne touche pas le travail quotidien ; ce que § 9 interdit est de couper les cinq écrans quotidiens en deux.
6. **La bascule est UN commit sans AUCUNE migration** (ni schéma, ni fonction Convex, ni champ : seize routes, la barre, les liens), et c'est cette discipline seule qui rend le `git revert` réel.
7. **Restent joignables pendant la bascule** : `/app/compte`, `/app/arret/$id`, `/app/decompte/$id`, et la palette (D16) réhébergée dans la `Toolbar` le jour même.
8. **La préférence de vue s'écrit `letikette-file-vue`, pas `letikette.file.vue`** : `use-theme.ts:10` pose déjà `letikette-theme` dans le même magasin, et deux conventions en font trois au prochain ajout.
9. **`remisesAuConseil` ne porte que l'état courant et les trois dates du FAIT ; la date de SAISIE de chaque transition vit dans `journal`**, parce qu'`evenementsProcedure` écrit déjà cette règle (`tables.ts:624-630`) et qu'une transition de remise EST une déclaration humaine. Contrepartie assumée : le journal devient une dépendance dure du suivi.
10. **Trois index de plus que la spec n'en nomme** : `propositions.by_org_and_jour` (D13 plafonne par jour ouvré, et compter sans index balaie la table à chaque rendu), `conversations.by_org_and_fil` et `by_org_and_mois` (le plafond de D14 se calcule par mois).
11. **`chatModel.ts` part avec T1, avant la première ligne du compagnon** : zéro importeur, deux modules cités qui n'existent pas, un identifiant OpenRouter étranger à la pile.
12. **La conversation part avec la file (D15), ses filtres avant elle** : si les filtres ne sont pas verts le jour de la bascule, c'est le CHAMP qui attend, pas le lot.

## Ce qu'on ne construit pas, et pourquoi la carte l'interdit

- **La rangée « rapprocher ce règlement » (A7)** n'a pas de source d'entrée : un règlement dont la référence ne tombe sur rien est compté puis JETÉ (`convex/recouvrement/import.ts:235`, `reglementsOrphelins++; continue;`), sans référence ni montant ni date conservés, et `lettrage.proposer` exige un `debiteurId` et un montant que rien ne fournit. Conserver les orphelins est une table de plus, et son lot.
- **Le pli « Sans débiteur identifié » (D9, cas 2)** ne peut pas exister : `facturesVente.debiteurId` est obligatoire au schéma (`tables.ts:325`). Ce qui manque est un SIREN, déjà relevé sous `debiteursSansIdentifiant` (`convex/recouvrement/surveillance.ts:437-444`), et le pli porte ce nom.
- **Les rangées cliquables sur `hypotheses` et `anglesMorts`** : ce sont des chaînes libres qui nomment factures et débiteurs sans aucun identifiant (`verticales/recouvrement/surveillance.ts:548-628`). Elles se rendent en pleine largeur dans la portée « Ce que vos factures portent », en TEXTE, et ne mènent nulle part tant qu'elles ne sont pas structurées.
- **`PARAMETRE_MANQUANT` de `controle.ts`** : `parametresRequis` n'est jamais passé par le seul appelant (`convex/recouvrement/decompte.ts:331`), l'étage ne s'exerce nulle part, et l'écran d'arrêt le dira au lieu de laisser croire à un verrou.
- **Le sélecteur de pays, le champ `pays`, `exigerPourActe()` câblé** : § 5.9 et § 10 Q2 les excluent nommément, le produit n'émet aucun acte.

## Carte des fichiers

**Domaine** (`src/lib/verticales/recouvrement/`) : `surveillance.ts:57-82` (interface `Evenement`), `:285-292`, `:126-167`, `:314-512` ; `briefing.ts:122-260`, `controle.ts:27-171`, `comportement.ts:102-230` (inchangés, enfin lus). Neufs : `compagnon/filtres.ts`, `refus.ts`, `prompt.ts`, `rangees.ts`.

**Convex** (`src/lib/convex/`) : `recouvrement/tables.ts:640` et `:838` ; `recouvrement/surveillance.ts:55-96`, `:262-280`, `:315-331`, `:383-386`, `:405-433`, `:504-541` ; `decompte.ts:287-294`, `:363-367`, `:385` ; `revelation.ts:100-174` ; `lecture.ts:71-176`, `:691-740` ; `pieces.ts:286` ; `comportement.ts:175` ; `battement.ts:257-261` ; `rgpd.ts:63-110`, `:186-243`, `:502-512`, `:716-725` ; `functions.ts:47-75` (`authedAction` neuf) ; `utils/chatModel.ts` (supprimé). Neufs : `recouvrement/propositions.ts`, `journal.ts`, `conversation.ts`, `remises.ts`.

**Socle** : `modele/cout.ts:11-63` (branché, pas réécrit) ; `documents/extracteur.ts:194-198`, dont l'usage cesse d'être jeté par `depot.ts:116` et `preuve.ts:84`.

**Interface** : `src/ui/facultatif.tsx` (neuf) ; `src/app/barre.tsx` (supprimé à T15) ; `selecteur-etablissement.tsx` (remonté) ; `ui/palette-recherche.tsx:93-96` (réhébergée) ; `ui/veilleur.tsx:173-185` ; `ui/relances.tsx:178-190` ; `ui/bilan-import.tsx`, `ui/suivi-procedure.tsx:160`, `ui/choix-intervenant.tsx`, `ui/recherche-avocat.tsx`, `ui/recherche-commissaire.tsx` (déplacés, pas réécrits). Neufs : `src/screens/file.tsx`, `volet.tsx`, `arret.tsx`, `piece.tsx`, `compte.tsx`, et leurs entrées dans `src/routes/-salle/`.

## Les tâches

### T1. Ce qui se fait avant la première rangée

`Facultatif` sort de `src/app/barre.tsx:93` vers `src/ui/facultatif.tsx`, et `barre.tsx` l'importe de là jusqu'à sa propre mort (B1) ; `src/lib/convex/utils/chatModel.ts` est supprimé.
**Acceptation.** La barre actuelle se rend à l'identique, et une recherche de `CHAT_MODEL_ID` dans `src/` ne rend plus rien.

### T2. L'événement porte la date de son fait, son montant et son nom

`Evenement` (`surveillance.ts:57-82`) gagne `dateDuFait?: string` en AAAA-MM-JJ, recopié dans `vEvenement` (`convex/…/surveillance.ts:55-96`). Trois types la portent parce que la donnée existe en amont et n'est aujourd'hui récitée que dans la phrase : `FACTURE_ECHUE` (`facture.dateEcheance`), `PRESCRIPTION_PROCHE` (`datePrescription`, calculée à l'assemblage puis jetée, `:262-280`), `ECHEANCE_PROCEDURE` (`Echeance.dateLimite`). Les trois autres n'en ont pas, le module l'écrit lui-même pour `HABITUDE_ROMPUE`, et `comparerEvenements` (`:285-292`) les range après, sur l'urgence puis le montant. Deux défauts de production partent au passage : `ECHEANCE_PROCEDURE.montantEnJeu` cesse d'être `ZERO` écrit en dur et somme les restes dus, et `reference` cesse d'être `creance._id` pour porter la dénomination du débiteur (`:383-386`), correctif fait pour `CREANCE_MURE` au lot 1 douze lignes plus haut et non porté ici. `CibleEvenement` gagne le `debiteurId` sur les deux types à cible CREANCE.
**Acceptation.** La rangée de caducité affiche un montant en euros et le nom du client, et la file par défaut ouvre sur la prescription la plus proche, pas sur la plus grosse.

### T3. `eligible` cesse de mentir entre deux mutations de créance

`eligible` est un instantané stocké, rejoué sur quatre mutations seulement (`creances.ts:370`, `:405`, `:502`, `:573`) ; un dépôt de pièce (`pieces.ts`), une santé écrite par le radar BODACC (`radar.ts:71`) et une facture ajoutée ne le rejouent pas, donc la file annoncerait « toutes conditions établies et aucun bloquant » sur une créance devenue bloquante depuis. Les trois sites appellent `rejouerEligibiliteInterne({ organizationId, creanceId })`, cloisonnement revérifié en plus de l'index.
**Acceptation.** Un débiteur passé en liquidation au registre fait disparaître sa créance de la portée « À trancher » au battement suivant, sans qu'on ait touché la créance.

### T4. Les lectures d'établissement qui manquent

Cinq requêtes au grain que la file demande et qu'aucune ne rend : `decompte.listerDecomptes` (l'index `decomptes.by_org` n'est lu que par la purge, `tables.ts:799-800`), `pieces.listerPieces` (idem, `pieces.ts:286` exige un `debiteurId`), `comportement.lireParEtablissement` (le calcul en masse existe déjà dans le flux, `convex/…/surveillance.ts:150-214`, et n'en ressort que sous forme d'événements), `briefing.duJour` (aucun lecteur côté écran, seul appelant `battement.ts:166`), `controle.abandonsDeLEtablissement`. Trois transports avec elles : `nature` de l'abandon traverse enfin Convex (`controle.ts:36` le porte, `vDernierDecompte.abandons` ne le déclare pas, `decompte.ts:287-294`) ; `revelation.lignes` gagnent `_id` et le débiteur (`revelation.ts:100-174`, où la table des débiteurs est déjà en main) ; `listerCreances` rend `eligible` au lieu de `score` et trie enfin comme son commentaire l'annonce (`lecture.ts:691-740`).
**Acceptation.** Une portée « Décomptes » affiche un compte non nul sans qu'on ait ouvert une créance, et une ligne de la révélation s'ouvre au doigt sur son client.

### T5. Les quatre tables

`journal` après `evenementsProcedure` (`tables.ts:640`) ; `propositions`, `conversations`, `remisesAuConseil` en fin de `recouvrementTables` (`:838`), à la forme de § 5.8 et § 4.4, plus les index de la décision 10 et moins le `consigneLe` multiple de la décision 9. ⚠️ `organizationId: v.id('organizations')` s'écrit sur UNE ligne avec des apostrophes droites, sinon `purge-complete.test.ts:39-92` ne voit pas la table et cesse d'exiger sa purge. Les quatre noms entrent dans l'union de `viderParIndexOrg` (`rgpd.ts:716-725`) et dans `purgerEtablissement` (`:502-512`), AVANT `intervenants`, `evenementsProcedure`, `decomptes` et `creances` que `remisesAuConseil` référence. La liste littérale de `tables.test.ts:76-91` passe de treize à dix-sept noms. `journal` et `conversations` grossissent sans borne : l'export les lit par page sur le modèle de `_pageDeFactures` (`rgpd.ts:152-166`), et `apercuDeMesDonnees` (`:63-110`) les compte. `coutEstime` porte en commentaire qu'il est un budget de pilotage en dollars et non un montant opposable.
**Acceptation.** On supprime un établissement de démonstration, et l'aperçu qui précède compte ses conversations et ses propositions avant de les effacer.

### T6. La file, vue Par créance

`src/screens/file.tsx`, monté uniquement dans `-salle/` : la `Toolbar` (sélecteur d'établissement remonté de `barre.tsx:418`, `Segmented`, dépôt), les deux nombres de tête avec la règle d'amputation de `revelation.ts:28-29` sous eux et jamais repliée, les puces de portée (une puce à zéro ne se rend pas), les rangées, le pli compté et typé. Isolement PAR SOURCE DE RANGÉES avec `Facultatif` (B1). Le total de tête prend sa source dans `revelation.total` et non dans `montantIdentifie` : les deux comptent les mêmes factures et rendent deux nombres différents, et il faut en choisir un une fois pour toutes.
**Acceptation.** Aux quatre largeurs, la prescription du portefeuille se lit sans un geste, et une source qui lève laisse les autres rangées à l'écran en nommant celle qui manque.

### T7. La vue Par client

Le `Segmented` bascule sur `usePreference` (`src/app/use-preference.ts:35-56`), clé `letikette-file-vue`, valeurs `CREANCE` et `CLIENT`, défaut `CREANCE`. La colonne vertébrale est `listerDebiteurs` (`lecture.ts:71-176`), déjà triée par encours décroissant, à quoi T2 et T4 ajoutent l'échéance la plus proche, le compte typé d'obstacles, l'habitude de paiement et le portefeuille au sens de `controle.ts`. Les trois cas de bascule avec une ligne ouverte sont écrits ; le pli prend le nom `debiteursSansIdentifiant`.
**Acceptation.** On bascule avec une ligne ouverte : le volet ne se ferme pas, la rangée du client s'ouvre et défile à l'écran, et la ligne y est surlignée en teinte neutre.

### T8. Le volet de preuve, `?ligne=<id>`

`src/screens/volet.tsx`, état adressable et non route, dix sections dépliables en un seul flux vertical, jamais d'onglets. Trois surfaces migrent telles quelles : `ui/suivi-procedure.tsx:160` en section 6 (la seule saisie de date que le produit ne peut pas déduire, en date du FAIT), `ui/bilan-import.tsx` en section 8, et l'énumération de `screens/analyses/procedure.tsx:337` en section 6, disponible AVANT l'arrêt. Le brouillon de la section 9 reste produit par `relance.ts` sans appel modèle (B10), les trois refus s'affichent à sa place (B12), et `GesteRelance = 'ARRETER_DECOMPTE'` pointe vers `/app/arret/$id`, ce qui corrige `ui/relances.tsx:178-190` dont le `as never` efface le typage du routeur.
**Acceptation.** On recharge une URL portant `?ligne=`, le volet revient ouvert sur la même section, et un montant s'y déplie en segments portant base, taux, jours et base annuelle.

### T9. `/app/arret/$id`, le seul écran plein cadre

Route neuve, lien entrant depuis `/app/creance/$id/decompte` tant qu'elle existe. Trois étages : le contrôle de complétude chiffré de `controle.ts:76-90` avec ses deux sorties de même poids, le pré-vol en trois questions, et le bouton qui porte son montant, sa date et son irréversibilité en toutes lettres. Aucun « Annuler » cosmétique, aucun lot (D6, B7), et `PARAMETRE_MANQUANT` déclaré inopérant à l'écran plutôt que laissé à croire.
**Acceptation.** Un décompte qui écarte deux factures connues du débiteur affiche leurs références, leurs montants et le total abandonné en euros avant que le bouton ne soit atteignable.

### T10. `/app/decompte/$id` et le suivi de la remise (D12)

Route neuve, lien entrant depuis `/app/arret/$id`. Une ligne par segment, chaque valeur juridique avec son article, sa date de relevé et ses deux booléens, et la mention en tête qui compte les quinze paramètres ; le dossier pour le conseil vit sous `exiger()`. Le suivi s'écrit sur `remisesAuConseil` : quatre états, aucune transition automatique, `decompteId` figé pour toujours, et la rangée de la file reste PLEINE pendant la remise, avec l'écart entre le décompte figé et le montant du jour décomposé, et l'angle mort de `pays/france/prescription.ts` déclaré.
**Acceptation.** Un dossier remis affiche les deux montants et leur écart en intérêts courus, et la prescription continue de s'afficher avec la phrase qui dit que le logiciel ne sait pas ce que le conseil a engagé.

### T11. `/app/compte`

Route neuve, six sections dépliées, zéro sous-route. `barre.tsx:288` repointe son avatar vers elle, et les douze routes de réglages meurent le même jour, sinon elles sont orphelines à l'instant où l'avatar bouge. « Affichage et session » reprend le `Segmented` de thème (`reglages.tsx:236-249`) et `onSeDeconnecter` (`:61`) ; « Intervenants » reprend le carnet et ses deux recherches, sans quoi A3 débloque quelque chose qui n'existe plus ; « Établissement » garde les trois champs du créancier en édition (`creancier.tsx:333-345`), parce qu'une adresse périmée ne bloque aucun chiffre et ne produira donc jamais de rangée.
**Acceptation.** On change d'établissement, on se déconnecte, on corrige une adresse de créancier et on ouvre le carnet, sans passer par une adresse qui n'est plus déclarée.

### T12. Les filtres avant rendu, et le refus partagé

`compagnon/filtres.ts` : B2 (lexique de la garantie), B3 (tout ÉNONCÉ juridique résout vers `parametres.ts` ou n'est pas rendu, qu'il cite un article ou non), B4 (aucun montant sans pastille reliée à un décompte), B6 (champ lexical de la procédure, n'importe où dans la phrase), B11 (aucun nom de tiers dans un brouillon) ; chacun LÈVE en nommant le terme trouvé et ne remplace jamais en silence. `compagnon/refus.ts` sort de `relance.ts:120-142` le type de refus à quatre champs, `peutFaire` REQUIS, et le rend partageable (B14). ⚠️ `lignes-rouges.test.ts:44-63` ne balaie ni `src/lib/socle/` ni `src/lib/convex/recouvrement/` : si le prompt vit hors zone, il entre dans `FICHIERS_ISOLES` (ligne 63), et c'est un geste conscient.
**Acceptation.** On fait passer « la voie la plus rapide ici est l'injonction de payer » au filtre : rien ne s'affiche, et le refus nomme le terme trouvé.

### T13. Les propositions et leur plafond (D13)

`propositions.ts` : la pose, la rétention, l'écart avec son motif en toutes lettres, et jamais une suppression. Sept par jour ouvré et par établissement, trois au plus par rangée, comptés sur `by_org_and_jour`. Deux garde-fous : une échéance qui éteint un droit ne compte JAMAIS dans les sept, et ce qui dépasse est compté et nommé (« 7 aujourd'hui, 12 en attente, les voir »), jamais tronqué comme `MODE_COMPACT` le fait à `accueil.tsx:164`. `afficheeLe` et `decideeLe` s'écrivent tous les deux, leur écart EST la mesure, et une proposition non confirmée retombe sur `unknown`.
**Acceptation.** Sur un établissement qui en mériterait quarante, la file en propose sept et affiche le reste en compte nommé, et une rangée de prescription est proposée en plus des sept.

### T14. La conversation (D14, D15)

`functions.ts` gagne `authedAction` (il n'existe que `authedQuery:47` et `authedMutation:61`), avec annotation de type de retour explicite, sinon `internal.<son module>` crée le cycle d'inférence qui dégrade `api` tout entier ; le remède est documenté sur place à `rgpd.ts:280-286`. Le prompt système vit dans `compagnon/prompt.ts`, figé, en tête, avec `cache_control: ephemeral` sur le motif d'`extracteur.ts:83-93`, le contexte de dossier restant APRÈS le point de coupure. `ANTHROPIC_API_KEY` passe par `requireEnv` comme `SITE_URL`, sinon une clé absente rend une erreur de SDK au lieu du refus en quatre parties. ⚠️ La plomberie de coût s'écrit EN ENTIER : `estimerCout` et `CAP_EUR` (`socle/modele/cout.ts:11`, `:26`) n'ont aucun site d'appel dans le dépôt, `extraireAvecClaude` capture l'usage facturé (`:194-198`) et ses deux appelants le jettent (`depot.ts:116`, `preuve.ts:84`), et aucune table ne porte de champ d'usage ; D14 ne coûte donc pas « peu parce que `cout.ts` existe ». Avertissement à 20, arrêt de la conversation LIBRE seule à 30, et quand il mord, D0 s'applique.
**Acceptation.** Une question rend une réponse dont chaque phrase porte sa pastille, et le plafond de sécurité atteint affiche un refus en quatre parties pendant que la file continue de se rendre.

### T15. La bascule

Seize fichiers de route meurent (`index.tsx` devient la file ; `debiteurs.*` 3, `procedures`, `import-factures.*` 2, `revelation`, `creance.$id.*` 8), `src/app/barre.tsx` meurt, et les vingt-sept destinations littérales sous `/app` sont réécrites ou supprimées LE MÊME JOUR, sinon `destinations-existent.test.ts` est rouge d'un bloc. Les vingt-et-une fonctions Convex publiques dont le seul appelant était une route supprimée sont rebranchées ou retirées, jamais inscrites en masse dans `APPELEES_AUTREMENT`, ce que le commentaire du fichier interdit nommément. La palette change d'hôte pour la `Toolbar` et son `ouvrir` (`barre.tsx:169-178`) traduit vers `?ligne=<id>`. ⚠️ `veilleur.tsx:173-185` accepte les DEUX graphies de lien pendant une période datée, sinon chaque notification déjà en base s'affiche et ne s'ouvre plus, en silence, sans que le compilateur ni `destinations-existent` ne le voient (`:137` exclut nommément cette forme). La raison écrite pour `/app` dans `ATTEINTS_AUTREMENT` (`aucun-ecran-orphelin.test.ts:51`) devient fausse et se réécrit. Les dix fichiers de `-salle/` portent en dur les libellés `route:` des vingt-sept adresses, qu'aucun test ne regarde : ils se réécrivent ici.
**Acceptation.** On ouvre `/app` : une seule file, une `Toolbar`, aucune barre, et les trois adresses qui restent s'atteignent chacune par un lien écrit depuis elle.

## Les tests

Aucune étape de test rédigée, et aucun test neuf par défaut. **Cinq exceptions, une ligne chacune :**

1. **B3, l'énoncé juridique non résolu** (T12). Règle juridique : « ce type de créance se prescrit par cinq ans » ne cite aucun article et échappe à tout balayage existant.
2. **B6, le champ lexical de la procédure** (T12). Ligne rouge 3 : le balayage actuel est une liste d'impératifs et ne voit ni « la voie la plus rapide » ni « vous pourriez saisir le tribunal ».
3. **B4, le montant sans pastille** (T12). Calcul de montant : un montant en texte libre ne se refait pas à la main, et c'est ce que fera le débiteur qui le conteste.
4. **Le montant et la date de `ECHEANCE_PROCEDURE`** (T2). Calcul de montant : un `ZERO` écrit en dur sur l'échéance la plus dangereuse du produit se lit comme « sans enjeu ».
5. **Le cloisonnement des quatre tables neuves** (T5). Cloisonnement : `purge-complete.test.ts` vérifie la CITATION dans `rgpd.ts`, pas l'effacement, et un commentaire suffit à le rendre vert.

Les existants qui tombent se corrigent : la liste littérale de `tables.test.ts:76-91` (treize vers dix-sept, plus deux assertions par table neuve) ; `destinations-existent`, `aucun-ecran-orphelin` et `fonctions-appelees` à T15 ; `declare-jamais-alimente.test.ts:94-140` sur les dix-huit `v.literal` neufs, qui doivent apparaître en clair hors de `tables.ts` et `schema.ts`, et sur les optionnels du chemin le moins fréquent (`motifCloture`, `attendu`, `closLe`, `revenuLe`, `motifEcart`, `decideePar`, `avant`, `survenuLe`). ⚠️ Ce balayage ne lit les optionnels qu'à DEUX tabulations : un optionnel imbriqué dans `pastilles` lui est invisible, donc lisible et jamais écrit sans que rien ne tombe. Vérifier par `bun run test:unit` entier, jamais par dossier, parce que `recouvrement/__tests__/tables.test.ts` vit hors des deux dossiers qu'on relance d'habitude et que son propre commentaire dit qu'`intervenants` l'a laissé rouge sans lecteur. Reproduire les quatre tables contre `dev:cloud`, pas en local.

⚠️ **`salle-complete.test.ts` n'existe pas**, alors que `routes/-salle/ecrans.tsx:21` l'annonce. Rien n'oblige donc un écran neuf à entrer dans la salle : c'est à la main que T6 à T11 s'y inscrivent, et c'est exactement le commentaire faux dans une suite verte que ce dépôt combat ailleurs.

## L'ordre de livraison

| # | Tâche | Visible du gérant | Part en production |
| --- | --- | --- | --- |
| 1 | T1, `Facultatif` et `chatModel.ts` | Non | Seul, et en premier. Aucune dépendance |
| 2 | T2, la date et le montant de l'événement | Oui, le flux actuel s'améliore | Seul. Corrige deux défauts de production sans rien attendre |
| 3 | T3, `eligible` rejoué | Oui, en mieux | Seul |
| 4 | T4, les lectures d'établissement | Non, rien ne les lit encore | Seul. Cinq requêtes plus trois transports |
| 5 | T5, les quatre tables | Non | Seul, avant tout écran. Ajouts de tables : le déploiement passe |
| 6 | T9 puis T10, l'arrêt et la pièce | **Oui**, deux adresses de plus dans l'arbre actuel | Séparément, l'une après l'autre. Chacune vaut par elle-même |
| 7 | T11, `/app/compte` | **Oui**, douze écrans deviennent une page | Seul, en un commit avec la mort des douze routes (décision 4) |
| 8 | T6, T7, T8, la file et son volet | Non, salle seulement | Ensemble ou séparément, regardés aux quatre largeurs |
| 9 | T12, les filtres et le refus partagé | Non | Seul. Condition de T13 et T14 |
| 10 | T13, les propositions | Non, salle seulement | Seul |
| 11 | T14, la conversation | Non, salle seulement | Seul. Si T12 n'est pas vert, le CHAMP attend, pas le lot |
| 12 | **T15, la bascule** | **Oui, tout** | **Un commit, aucune migration, une journée** |

Chaque groupe vérifié part par `git push origin <sha>:main` depuis la branche, sans attendre la fin du lot.

## Revenir en arrière si la file déçoit

**Le seul commit à annuler est celui de T15**, et c'est la raison d'être de la décision 6 : il ne porte ni schéma, ni fonction Convex, ni champ. `git revert` le ramène entier, les seize routes et la barre reviennent, et **aucune donnée n'est orpheline**, parce que les quatre tables, les cinq lectures et les champs de T2 sont en production depuis des jours et ne sont lus que par la file. `/app/compte`, `/app/arret/$id` et `/app/decompte/$id` restent en place et restent atteignables : elles n'ont jamais dépendu de la file.

**Ce qu'un retour arrière ne rend pas :** `/app/parametres` et les douze routes de réglages sont mortes au point 7 et ne reviennent pas avec T15. C'est assumé, et c'est pour ça que `/app/compte` part sept livraisons avant la bascule : on la regarde à l'usage pendant tout ce temps.

**Ce qu'on regarde avant de décider.** Les trois nombres que `propositions` porte désormais (§ 10, Q3) : le taux de rétention, le délai entre l'affichage et le tap, et le taux de correction après coup, seul des trois à ne pas être auto-référentiel. Sept est une hypothèse datée, écrite pour être déplacée sur des nombres, exactement comme `SEUIL_QUALIFICATION` l'est dans son propre commentaire (`scoring.ts:150-158`).
