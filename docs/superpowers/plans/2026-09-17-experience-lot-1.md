# Lot 1 : ce qui rapporte tout de suite

Spec : `docs/superpowers/specs/2026-09-17-experience-compagnon-design.md` (révisée, 468e5cd), et les cinq réponses de Jules du 17/09/2026.

Ce lot ne refond aucun écran. Il alimente ce que le produit sait déjà et jette, il répare la créance mûre, et il transforme en chemins les refus qui sont aujourd'hui du texte nu. La refonte de la file, les deux vues (D9), le suivi du dossier chez le conseil (D12) et le compagnon (D10) viennent après, en un seul coup.

## Décisions

1. **A2 ouvre le lot, D11 le suit, jamais l'inverse.** `debiteurs.estCommercant` n'est écrit qu'une fois dans tout le dépôt, avec la valeur littérale `'unknown'` (`convex/recouvrement/import.ts:119`), et `creances.ts:288` le lit : D11 seul remplacerait un seuil infranchissable par une condition inatteignable.
2. **La déduction n'écrase que ce qu'elle ne trouve pas déjà tranché.** Le patron est écrit et commenté à `screens/parametres/creancier.tsx:170-186` ; une réponse humaine l'emporte toujours.
3. **`eligible` se stocke à côté de `score` sur `creances`.** `aUnBloquant` ne se lit nulle part côté Convex, et recomposer `qualifier()` dans la boucle de nuit coûterait quatre lectures de plus par créance sur tout l'établissement.
4. **`SEUIL_QUALIFICATION` reste déclaré et exporté, sans lecteur de production, et son commentaire le dit.** Il porte l'hypothèse de calibrage que `scoring.ts:150-158` déclare ; l'effacer effacerait la seule trace de pourquoi un score existe encore.
5. **A1 propose, n'applique jamais.** `poserLeTaux` réécrit TOUTES les factures non soldées du débiteur (`tauxContractuel.ts:114-121`) et enregistre même sous le plancher légal, délibérément (`:110-113`) : appliqué en silence depuis une ligne lue par un modèle, il ferait baisser ce qu'on réclame sur tout un client.
6. **A5 est un affichage, pas un critère.** Aucune ligne de `scoring.ts` ne lit une signature : les critères de pièces se comptent par TYPE présent (`:225-238`). En faire un critère changerait le barème de 20 points et le score de toutes les créances en base, sans rejeu écrit.
7. **Les propositions du questionnaire sont DATÉES et jamais écrites d'office.** Un « oui » sur `CONTESTATION_ECRITE` produit un risque BLOQUANT (`scoring.ts:249-259`) qui éteint l'éligibilité ; D6 interdit le tap qui emporte une qualification.
8. **A10 n'a pas de délai d'expiration, et c'est le contraire d'un oubli.** Aucune source ne fonde un tel délai : il serait un arbitrage produit déguisé en règle, il n'a rien à faire dans `parametres.ts`, et il est sans objet puisque rien ne s'écrit sans une confirmation redatée par `declarerFaitLitige` (`creances.ts:370-397`).
9. **Le refus se dit en quatre parties là où c'est du TEXTE, pas là où il faut un écran.** `creerCreance` et `relance.ts` rendent déjà des chaînes affichées telles quelles ; les abandons de `controle.ts` n'ont aucun rendu avant le PDF, et leur en donner un est la refonte.
10. **Six automatismes sortent du lot**, chacun pour une raison relevée au code.

| Sorti du lot | Pourquoi, au code |
| --- | --- |
| A3, l'adresse du débiteur | Livré maintenant, il crée un champ écrit sans lecteur : ses lecteurs prévus sont les deux recherches d'intervenant, dont la spec vise la suppression. `champs-alimentes.test.ts:93` mord |
| A6, la composition d'une créance | `controlerDecompte` prend un `DecompteArrete` complet ; un aperçu avant arrêt composerait un décompte provisoire, la seconde vérité que `revelation.ts:20-24` interdit |
| A7, le rapprochement d'un virement | `enregistrerImport` jette les règlements orphelins (`import.ts:234-237`) : aucune ligne en base sur quoi accrocher une proposition. Table neuve, plus `rgpd.ts` et `tables.test.ts:59-92` |
| A8, l'avoir réclamé | `lettrage.ts:26-32` refuse toute tolérance et ne constate aucun écart ; `comportement.ts` ne mesure que des délais. Module de domaine neuf, pas un câblage |
| A9, l'instance en cours | `pays/france/bodacc.ts:120-122` ne garde que `collective` et `radiation`. Répondre OUI depuis un redressement serait une donnée FAUSSE sur un critère dont un oui éteint l'éligibilité |
| A13, les échéances illisibles | Aucun import n'est rejeté en bloc : `exportComptable.ts:210-231` et `import/factureVente.ts:140-149` posent déjà chaque ligne non lue dans `ignorees`. Le travail réel est un lot d'écran |

## Carte des fichiers

**Domaine** (`src/lib/verticales/recouvrement/`) : `scoring.ts:300` et `:150-158` ; `surveillance.ts:4`, `:160-167`, `:374-386` ; `import/preuve.ts` après `:202` ; `controle.ts:101-118` ; `relance.ts:112-125`, `:137-167`, `:226-235`, `:265-300`. Inchangés et réutilisés : `pays/france/commercialite.ts:345`, `qualification.ts:48-63`, `litige.ts:84-94` et `:230-240`.

**Convex** (`src/lib/convex/recouvrement/`) : `tables.ts` (bloc `creances`, bloc `pieces` ~`:450-497`) ; `creances.ts:158-199`, `:230-258`, `:305`, `:341`, `:415`, plus une `internalMutation` neuve ; `debiteurs.ts:99-133` ; `pieces.ts:110-133`, `:272-284`, `:316-330` ; `preuve.ts:92-101` ; `surveillance.ts:286-292`. Inchangé et appelé : `tauxContractuel.ts:62-131`.

**Interface** : `src/ui/identite-debiteur.tsx` ; `src/ui/questionnaire-litige.tsx:50-66` ; `src/routes/app/creance.$id.litige.tsx:30-45` ; `src/ui/relances.tsx:83-121` ; `src/screens/creance.tsx:238-247` ; `src/routes/-salle/communes.ts:153-158` ; `src/marketing/apercu.tsx:74-83` et `src/marketing/etapes.tsx:66-75`.

## Les tâches

### T1. La qualité de commerçant se déduit, et les créances la reprennent (A2)

Dans `renseignerSirenInterne` (`debiteurs.ts:99-133`), après le patch : `qualiteCommercantDeLaForme(formeJuridique)` (`pays/france/commercialite.ts:345`, sourcée L210-1, qui ne lève jamais), et on n'écrit `estCommercant` que si `deduite.etat !== 'unknown'`. Puis un appel à une `internalMutation` neuve de `creances.ts`, `rejouerCommercialiteInterne({ organizationId, debiteurId })`, qui recompose `entreCommercants` sur les créances non CLOSE du débiteur **dont le critère vaut `unknown`**, cloisonnement revérifié en plus de l'index, et rappelle `recalculerScore`. Sans ce rejeu, le champ serait alimenté et jamais relu, et aucune barrière ne le verrait. Réserve à porter dans le code : `commercialite.ts:34-38` et la clé `qualiteCommercantParLaForme` (`parametres.ts:161-170`, `verifie: true`, `valideParAvocat: false`) disent que la forme relevée suffit à proposer et à remplir l'écran, pas à établir la qualité dans un acte.

**Acceptation.** Sur un débiteur dont le registre rend « SAS », la qualité de commerçant s'affiche sans avoir été demandée, et le questionnaire de ses créances ouvertes ne pose plus cette question.

### T2. La créance mûre (D11)

- `scoring.ts:300` : `eligible: conditionsToutesEtablies && !aUnBloquant`. Le troisième terme part, sinon le produit porte deux définitions de « mûre » et leur divergence est muette.
- `recalculerScore` (`creances.ts:158-199`) rend `{ score, eligible }` ; ses trois appelants (`:305`, `:341`, `:415`) patchent les deux ; `tables.ts` gagne `eligible: v.optional(v.boolean())` sur `creances`.
- `CreanceSurveillee` (`surveillance.ts:160-167`) troque `score: number` contre `eligible: boolean` ; `:374` filtre sur `statut !== 'QUALIFIEE'` puis `!creance.eligible` ; l'import de `SEUIL_QUALIFICATION` (`:4`) part.
- `:380-385` : l'explication nomme ce qui est établi en reprenant `LIBELLE_CONDITION` (`qualification.ts:58-63`) au lieu de citer le score, et le champ `action` cesse de porter « Examiner les procédures envisageables pour cette créance. », texte en production que la ligne rouge 3 interdit et que `lignes-rouges.test.ts:160-162` ne voit pas.
- L'adaptateur (`convex/recouvrement/surveillance.ts:286-292`) corrige deux défauts de production : `total` cesse d'être `ZERO` et somme les `montantTTC` non soldés de la créance (les factures sont déjà lues au-dessus), et `reference` cesse d'être `creance._id` pour porter la dénomination du débiteur (la table est en main à `:232-239`). C'est la seule consommatrice de ce champ.
- `screens/creance.tsx:238-247` : `pourcent(creance.score)` et la puce `color='green'` partent. Le vert ne dit qu'un seuil, et D11 vient d'en retirer un ; il reste l'état en teinte neutre.
- La phrase interdite se réécrit dans les trois fixtures : `routes/-salle/communes.ts:153-158`, `marketing/apercu.tsx:74-83`, `marketing/etapes.tsx:66-75`. Les deux dernières portent en plus « Faire signifier sans délai », motif littéral du test, dans `src/marketing/` que les ZONES de `lignes-rouges.test.ts:44-51` ne balaient pas.

**Acceptation.** Une créance QUALIFIEE dont les quatre conditions valent `ok` et qui ne porte aucun risque bloquant apparaît dans le flux avec le nom de son client et son montant réel, et son explication nomme les quatre conditions sans citer un seul chiffre.

### T3. Le taux stipulé survit jusqu'à l'écran, et se propose (A1)

`tauxRetardStipule: v.optional(v.string())` sur `pieces` ; l'argument `v.union(v.string(), v.null())` sur `consignerLectureInterne` (`pieces.ts:110-133`) et son patch, à l'identique de ses voisins ; le passage depuis `convex/recouvrement/preuve.ts:96` ; le champ dans le validateur et le mapping de `listerPiecesDuDebiteur` (`pieces.ts:272-284`, `:316-330`). À l'écran, `ui/identite-debiteur.tsx` gagne une rangée au-dessus du champ de saisie : le taux lu, la pièce d'où il vient, et un bouton à 48 px qui appelle la mutation existante de `tauxContractuel.ts:62-131`. Rien ne s'écrit sans ce tap (décision 5), et le constat rendu est celui du serveur, mot pour mot.

⚠️ **Ne pas toucher `construirePromptPreuve`** ni réordonner le schéma zod : le prompt part avec `cache_control: ephemeral` et trois tests tiennent son empreinte à l'octet (`import/__tests__/preuve.test.ts:93-107`). Un reformatage innocent multiplie le coût par document sans qu'aucun autre test ne tombe.

**Acceptation.** Après le dépôt de CGV portant « 12 % », la fiche du débiteur affiche le taux lu et la pièce qui le porte, et le champ de saisie reste vide tant que personne n'a touché le bouton.

### T4. La signature de réception se dit (A5, chemin d'affichage seulement)

Quatre lignes dans `import/preuve.ts`, après `:202`, qui ajoutent une phrase au constat quand `brut.receptionSignee` est renseigné sur un bon de livraison ou de commande. Aucun schéma, aucune écriture, aucun poids de `scoring.ts:139-148` touché.

**Acceptation.** Le constat d'un bon de livraison signé le dit en toutes lettres sous la pièce, et le score de la créance ne bouge pas d'un point.

### T5. Les deux propositions du questionnaire (A4, A10)

Un champ optionnel `proposition` sur `QuestionLitige` (`ui/questionnaire-litige.tsx:50-53`) portant la réponse suggérée, sa source citée et sa date, rendu au-dessus des deux boutons sans en présélectionner aucun. Deux alimentations : la première pièce du débiteur portant `reserves` (déjà rendue par `listerPiecesDuDebiteur`) pour `CONTESTATION_ECRITE` (`litige.ts:84-94`) ; et une query neuve de `creances.ts` qui remonte les `faitsLitige` des AUTRES créances du même débiteur avec leur `declareLe` (`tables.ts:545-553`), par `by_debiteur`, cloisonnement revérifié en plus de l'index comme à `tauxContractuel.ts:76-78`. La réponse reste `INCONNU` tant qu'elle n'est pas confirmée : `lireLitige` traite déjà `INCONNU` comme une abstention (`litige.ts:230-240`), et `declarerFaitLitige` reste le seul chemin d'écriture.

**Acceptation.** Sur une deuxième créance chez un client dont une réserve a été lue et six faits déjà déclarés, le questionnaire affiche la réponse précédente avec sa date et la réserve avec son numéro de pièce, et aucune réponse n'est enregistrée avant un appui.

### T6. Les refus disent les quatre parties (D0)

- `creerCreance` (`creances.ts:230-258`) : les trois `ConvexError` nues portent ce qu'on peut faire, ce qui manque, ce qui le lève, ce que coûte l'attente. La facture déjà rattachée cite la créance qui la porte ; les plusieurs débiteurs disent qu'une créance par débiteur se compose depuis la même sélection. Le message de cloisonnement reste identique à celui d'un objet inexistant.
- `Relance` (`relance.ts:112-125`) : la branche `disponible: false` gagne `peutFaire` et `coutDeLAttente`, **requis** pour qu'aucun refus ne les oublie, à côté de `constat` et `blocages`. Ses trois sites de construction (`:137-167`, `:226-235`, `:265-300`) les remplissent, et `ui/relances.tsx:83-121` rend les deux paragraphes de plus. Sur la suspension, `coutDeLAttente` DÉCLARE l'angle mort au lieu de le taire, comme le commentaire de `:151-156` l'écrit déjà : le produit ne dit pas quoi faire d'une créance sur une entreprise en liquidation.
- `controle.ts:101-118` : `INTERETS_INEXPLIQUES` cesse de poser `montantEnJeu: null` ; l'écart est la différence entre `ligne.interets` et la somme des segments, les deux à portée de main à `:102-104`. `PARAMETRE_MANQUANT` (`:119-125`) reste sans effet et on le dit ici : `controlerDecompte` est appelé sans `parametresRequis` (`convex/recouvrement/decompte.ts:331-357`), et il n'y a aucun acte à protéger tant qu'`exigerPourActe()` n'a aucun site d'appel.

**Acceptation.** Le refus du niveau 2 nomme ce qui se produit quand même avant de dire ce qui manque, et l'abandon `INTERETS_INEXPLIQUES` porte un montant en euros au lieu d'un blanc.

## Les tests

Aucune étape de test rédigée, et aucun test neuf par défaut. **Deux exceptions, et elles sont dites :** un test pour le calcul de montant de l'écart `INTERETS_INEXPLIQUES` (T6), et un test pour la règle juridique de T1, qui relie la forme relevée à sa reprise par les créances, parce qu'aucune barrière ne voit un champ alimenté et jamais relu.

Les existants qui tombent se corrigent : `scoring.test.ts:196-203` (sa prémisse disparaît, il se réécrit en « une facture seule suffit, et le dossier reste fragile en preuve ») ; les quatre fixtures `score: 0.9` de `surveillance.test.ts:208`, `:223`, `:479` et `surveillance-cible.test.ts:93` ; les quatre appels à `consignerLectureInterne` de `convex/__tests__/pieces.test.ts:183, 206, 232, 310` ; `litigeCreance.test.ts` ; et `convex/__tests__/surveillanceRecouvrement.test.ts:604-605`, à relire ligne à ligne parce qu'il ne pose pas de score. `notifiables.test.ts:86` construit un `CREANCE_MURE` à la main : il reste vert quoi qu'il arrive, donc il ne prouve rien sur T2.

Vérifier par `bun run test:unit`, jamais par un dossier : `champs-alimentes`, `declare-jamais-alimente` et `recouvrement/__tests__/tables.test.ts` vivent hors des deux dossiers qu'on relance d'habitude. Reproduire les deux ajouts de schéma contre `dev:cloud`, pas en local.

## L'ordre de livraison

| # | Tâche | Part en production |
| --- | --- | --- |
| 1 | T6, les refus | Seul, et en premier si on veut : il ne dépend d'aucun autre et ne touche aucun schéma |
| 2 | T1, la commercialité | Seul. Aucun champ neuf, effet visible sur un débiteur |
| 3 | T2, la créance mûre | Après T1 et pas avant (décision 1). Ajoute `creances.eligible` : ajout optionnel, le déploiement passe |
| 4 | T3, le taux stipulé | Seul. `poserLeTaux` existe déjà, donc rien à monter le même jour pour `fonctions-appelees.test.ts:156` |
| 5 | T4, la signature | Avec T3 (même famille de fichiers) ou seul. Quatre lignes |
| 6 | T5, les propositions | Seul |

Chaque groupe vérifié part par `git push origin <sha>:main` depuis la branche, sans attendre la fin du lot.

**Ce qui reste pour le lot 2, en une ligne chacun.** Les deux vues de la file (D9), le suivi du dossier remis au conseil (D12), le compagnon et son verrou de niveau acte (D10), l'écran des abandons avant l'arrêt, les règlements non rapprochés (A7), et le lien « Voir N autres » qui mène à `/app/revelation` où le flux n'est pas rendu.
