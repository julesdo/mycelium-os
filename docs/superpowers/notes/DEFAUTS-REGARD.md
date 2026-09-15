# Défauts relevés au regard pendant la tranche 2

Ce que le navigateur montre et que la migration « à l'identique » ne corrige pas. À traiter : les défauts bon marché et sans ambiguïté à la tâche 10 (étape 2 : « tout défaut vu se corrige »), les autres au chantier 3.

## Tâche 2 (accueil, procédures, créance)

- Les rangées du squelette d'attente (`bg-cladd-fg/10`) sont très discrètes sur le verre sombre à 1280 px. Visibles, mais à la limite. À regarder en thème clair aussi.
- Les erreurs « Unauthenticated » de la console viennent des composants de la barre (`VeilleurPresent`, `SelecteurEtablissement`, `AvatarConnecte`) rendus sans session dans la salle ; avalées par `Facultatif`. Préexistant, sans effet.
- `SegmentedButton` (Cladd) pose `readOnly` sur le segment actif, qui sort de l'ordre de tabulation. Comportement du kit, tous les `Segmented` du produit ; on ne forke pas.

## Tâche 3 (les cinq analyses de la créance)

1. ~~Le lien de retour mesure 44 px~~ **CORRIGÉ avant la tâche 4** : `EnteteDetail` passe à `min-h-12`, mesuré à 48 px à 375 et 1280 px (décompte, litige). La même recherche a trouvé trois autres cibles à 44 px dans `src/ui/`, corrigées dans le même commit : le lien « Lire l’annonce au BODACC » (`identite-debiteur.tsx`), « Changer » et « Saisir le numéro moi-même » (`recherche-registre.tsx`). À mesurer au regard de la tâche 5, où la fiche du débiteur les rend.
2. ~~Le litige « sans données » rend un corps vide~~ **RETIRÉ : fausse observation.** Elle venait d'une donnée de salle impossible (`constats: []`) : `lireLitige` produit toujours au moins un constat (`litige.ts` 240-269), donc le produit ne rend jamais ce corps vide. Leçon : un regard sur une donnée inventée produit un défaut inventé. D'où le correctif de la tâche 3 : les données de la salle se calculent par le domaine.
3. **Texte du domaine avec « — »** : la question du litige « …contester cette facture — courrier, e-mail, ou réserve… », et le constat d'un litige déclaré « Le logiciel ne mesure pas si cette contestation est sérieuse — c'est une appréciation juridique, et il s'en abstient. » (`src/lib/verticales/recouvrement/litige.ts`, vu dans la variante « litigieux »). Conservés (décision D9). → chantier 3, avec le balayage des tirets longs dans les textes affichés (sous-titres premier bilan et suivi, rangée « Supprimer l’établissement », étapes de la révélation).
4. Dans la salle à 375 px, les libellés d'état « sans données », « en attente », « en erreur » passent sur deux lignes. Salle seulement, sans effet produit.
5. ~~La salle ment sur un texte~~ **CORRIGÉ en `10906e8`** : la condition à confirmer se calcule avec `LIBELLE_CONDITION.entreCommercants`, et la salle affiche « Pouvez-vous confirmer la qualité de commerçant des deux parties de cette créance ? ».
6. ~~« 2 relevé(s) »~~ **CORRIGÉ pendant la relecture de la tâche 4** : « 1 relevé », « 2 relevés », vérifié au navigateur. Même commit : « 20 barreaux » dans la recherche d'un avocat.

Regard des variantes après `10906e8`, à 375 et 1280 px : aucun débordement horizontal ; les variantes sont désactivées hors de l'état prêt, et la salle masque le groupe pour un écran sans variante (risques) ; chaque variante rend un corps différent (litige litigieux, relances suspendues, pyramide à 4 sur 4) ; la seule cible sous 48 px reste le lien de retour (défaut 1).

## Tâche 5 (les débiteurs), vu à 1280 px dans la salle (`a94c1b0`)

**Corrigés en `3d16935`, vérifiés au navigateur à 1280 px :**
- les cases des factures prennent toute leur carte (176 px) ;
- « Aucun document » au lieu de « 0 document » ;
- `SAINE` a disparu des démonstrations ;
- le plancher de `DemoIdentite` est calculé (« 7,86 % », plus aucun « 10,26 ») ;
- les pièces sont triées de la plus récente à la plus ancienne ;
- la fiche en lecture dit « Lecture de la fiche… » et devient une variante nommée ;
- la fiche se remonte par débiteur (`key`).

Les points ci-dessous restent ouverts sauf mention contraire.

- Textes à reprendre au chantier 3 :
  - dates ISO montrées au gérant dans des constats : « plancher de 8,25 % constaté au 2026-09-10 » (`controlerTauxContractuel`), « Ce document est un bon de livraison, n° BL-2026-0142, du 2026-05-06 » (constat de lecture des pièces) ;
  - « Vide = taux légal, BCE majoré de dix points. » : un signe « = » dans une phrase d'interface ;
  - le refus d'un taux sous le plancher : « … inférieur au plancher de 7,86 % constaté au 2026-03-15 — trois fois le taux d’intérêt légal des « autres cas ». » (`controlerTauxContractuel`), un « — » et une date ISO dans la même phrase ;
  - « Daté du 6 mai 2026 — n° BL-2026-0142 » dans la rangée d'une pièce ;
  - « 0 document » en sous-titre des pièces vides : un cadran à zéro (règle d'écran n° 4), là où « Aucun document » dirait la même chose. Correctif d'une ligne → tâche 10.
- **Les cases de sélection des factures mesurent 20 × 20 px**, en production aujourd'hui : un `Checkbox` du kit, sans libellé visible, posé dans la carte d'une facture (`src/screens/debiteur-detail.tsx`, lignes 405 à 410). Sélectionner des factures pour constituer une créance est LE geste de cet écran, et sa cible est à moins de la moitié du plancher de 48 px. **Correctif relevé dans la documentation du kit** (`get_component('checkbox')`) : le `Checkbox` rend un `<label>` par défaut, et « pair it with text inside the same label to extend the clickable target ». La carte ne contient aucun autre élément interactif (référence, montants, textes, puces), donc toute la carte devient le libellé, et la case passe en `as="span"`. Une facture déjà dans une créance garde sa case `disabled`, et un clic sur son libellé ne fait rien. → tour de correctifs de la tâche 5.
- Même carte : « Exigibilité déduite de l’échéance — à confirmer si vos conditions contractuelles disent autre chose. » (`debiteur-detail.tsx`, ligne 427). → chantier 3, balayage des tirets longs.
- **Une pièce reclassée à la main garde le constat de sa lecture** : un contrat reclassé en CGV affiche encore « Ce document est un contrat », parce que `classer` ne touche jamais `constat` (`src/lib/convex/recouvrement/pieces.ts`, lignes 159-162). Relevé par la revue de la tâche 5 ; la salle le montre fidèlement. → chantier 3 (le constat dit ce que la lecture a vu, et la classification du gérant se lit à côté), ou une tâche du domaine.
- **La feuille mobile de `TwoPane` n'est pas un dialogue** : un `div` `fixed inset-0` sans `role="dialog"`, sans `aria-modal` ni piège à focus (`src/ui/two-pane.tsx`, lignes 37 à 50). Un lecteur d'écran continue de lire la liste dessous. → tranche 3, qui refait la disposition maître/détail.
- **`SAINE` n'est écrite par aucun code du produit** (`'SAINE'` n'apparaît que dans les types et les validateurs) : le radar n'écrit que la procédure collective et la radiation, et l'absence d'annonce n'est pas une preuve de santé. Aucune démonstration ne doit donc la montrer. À corriger dans la salle : la forme principale des relances de la famille créance (santé `SAINE`), le commentaire de la famille procédure (« déclaré sain »), et `DemoIdentite` qui écrit « plancher de 10,26 % constaté au 2026-03-15 », valeur juridique fausse (le plancher calculé de ce semestre est 7,86 %).

## Tâche 5 bis (les états d'un débiteur), relevé par sa revue

- **Le lettrage enregistre une date que l'écran ne montre plus.** Revenir sur A par le retour du navigateur restaure le montant et la date posés pour A, alors que la fiche remontée affiche ses champs vides : « Solder ces factures » réapparaît et enregistre un règlement à une date invisible (`src/ui/lettrage.tsx`, lignes 63-64 et 139-166). Un clic sur un débiteur vide désormais ces saisies ; le retour du navigateur, non. Correctif complet : montrer dans `Lettrage` le montant et la date sur lesquels porte la proposition. → chantier 3.
- **Un refus de SIREN restauré rouvre le champ vide** sous un message qui nomme un numéro qu'on ne voit plus (`recherche-registre.tsx`, lignes 108-109 et 256-259). Même chemin (retour du navigateur), cosmétique. → chantier 3, avec le point précédent.

## Tâche 6 (réglages et abonnement), relevé par son implémenteur (`363472b`)

**Corrigés en `645391b` et dans le commit qui suit, vérifiés au navigateur à 1280 px :**
- le lien « Modifier » mesure 48 px (et aux quatre largeurs, mesuré par l'implémenteur) ;
- l'offre de suivi et la rangée de l'abonnement parlent de recouvrement : « Vos échéances surveillées toute l’année » ; plus aucun « déclaration de mars » ni « Votre chiffre reste » à l'écran ;
- l'encart de développement ne promet plus qu'il disparaîtra en production ;
- le premier enregistrement du créancier se confirme (sonde jsdom de l'implémenteur) ;
- les réglages attendent le profil, sans « — » ;
- la variante « volume non renseigné » existe.

Reste ouvert : montrer ou non l'encart de développement sur un déploiement sans clé Paddle (décision produit), et les restes d'EGalim hors des écrans migrés (page publique d'abonnement, commentaires, chaînes i18n), confiés à une tâche de fond d'inventaire.

- **L'encart de développement promet ce qu'il ne tient pas** : « Cet encart n’apparaîtra pas en production ». Il apparaît sur tout déploiement sans `PADDLE_API_KEY`, à côté de la carte « ouverture » (`isDev` et `paddleConfigure` lisent la même clé, `src/lib/convex/billing.ts`, vers les lignes 104 et 235). À vérifier : la production a-t-elle la clé ? Si non, le gérant voit un encart de développement. → à poser dans le compte rendu, et texte à corriger.
- **Le lien « Modifier » de la page d'abonnement mesure 18 px** à 1280 px, sous le plancher de 48 px. Il vient du code déplacé à l'identique (`EtatCourant`, désormais dans `src/screens/abonnement/abonnement.tsx`). Même correctif que le lien « Lire l’annonce au BODACC » : `inline-flex min-h-12 items-center`. → tour de correctifs de la tâche 6.
- **L'offre parle encore d'EGalim** : « Votre chiffre reste à jour toute l’année, et votre déclaration de mars est prête avant mars. » (`src/screens/abonnement/suivi.tsx:35`, conservé par la décision D9). Le produit est un logiciel de recouvrement ; cette promesse ne veut rien dire pour un créancier. Texte de remplacement déjà écrit par la salle avant la tâche 6 (démo d'abonnement supprimée) : « Vos échéances surveillées toute l’année : ce qui arrive à terme, ce qui devient mûr, ce qui approche de la prescription. » → tour de correctifs de la tâche 6.
- **Texte de l'encart de développement** (`src/screens/abonnement/abonnement.tsx:155-156`) : retirer « Cet encart n’apparaîtra pas en production. », la seule phrase fausse. Montrer ou non l'encart sur un déploiement sans clé Paddle reste une décision produit (à poser à Jules). → tour de correctifs de la tâche 6.

## Tâche 7 (équipe et données), vu à 1280 px dans la salle

- **« 3 sur 9999 places »** sur l'équipe d'un déploiement sans clé Paddle : le plan de développement donne 9 999 places (`billing.ts`), et l'écran les compte comme une limite réelle. Fidèle au produit, mais un chiffre qui ne veut rien dire. → chantier 3 : « places illimitées » en mode de développement, ou rien.
- **Le champ de confirmation des deux suppressions parle anglais** : « Type c.beranger@thumbbb.fr to confirm », « Type Thumbbb Agency to confirm ». L'interface est en français uniquement (CLAUDE.md), et ces pages existent en production. **Origine relevée** : les deux écrans emploient le `Dialog` du kit avec `requireConfirmText`, qui rend son propre champ à l'invite anglaise. La documentation du `Dialog` n'offre aucune prop pour ce texte, et `CladdProvider` n'a ni langue ni messages (`defaults` ne couvre que les props exposées). Antérieur à la tâche 7, en production. → **tâche 8 bis** au plan : une primitive de `src/ui/` bâtie sur les emplacements documentés du `Dialog` (`children` pour un `Input` du kit à l'invite française, `buttons` pour « Annuler » et la confirmation désactivée tant que la saisie n'est pas exacte), avec des tests.
- **« Ses 0 facture, ses 0 débiteur, ses 0 décompte »** sur la suppression d'un établissement vide (variante « nouveau client ») : un cadran à zéro et un accord faux. → tour de correctifs de la tâche 7 si c'est une condition, sinon chantier 3.
- **« invitations en attente compris »** sur l'invitation d'une offre complète : l'accord est « comprises ». → tour de correctifs de la tâche 7.
- Regard de la tâche 7 terminé : à 1280 px, les six écrans, leurs états, leurs variantes, et les deux confirmations ouvertes sans être validées (bouton désactivé tant que rien n'est saisi, « Annuler » referme) ; à 375 px, aucun débordement ni cible sous 48 px.
- **« Claire Béranger · vous … arrivé le 11 février 2026 »** : l'accord du participe suppose un genre que le produit ne connaît pas. Une tournure neutre (« membre depuis le 11 février 2026 ») l'évite. → chantier 3.

## Décision produit à demander à Jules (vue par la seconde revue de la tâche 3)

- Pour un débiteur en procédure collective, la rangée de la créance affiche des relances « Suspendues » à côté de « 1 voie », et cette voie est la relance amiable. `proceduresEnvisageables` l'inclut toujours, et `creanceComplete` ignore la santé du débiteur en listant les procédures (`src/lib/convex/recouvrement/lecture.ts`, lignes 516-517 et 606-609). Le produit offre donc une relance que son propre module de relances suspend, et il offrirait l'injonction si les quatre critères étaient acquis. Deux lectures possibles : la liste des voies reste un constat indépendant de la santé, ou la santé compte (aucune voie offerte, avec le constat du registre). C'est une question de domaine, avec une dimension juridique à faire valider : hors tranche 2, à poser dans le compte rendu.

## Tâche 4 (la procédure), à regarder

- Vu à 1280 px dans la salle (`38e0f8a`), textes affichés au gérant, tous du domaine ou d'un composant existant, conservés par la migration (décision D9) → chantier 3, balayage des textes :
  - l'échéance du suivi se lit « 10 avr. 2026 — Passé ce délai de 3 mois, l’ordonnance est caduque… » : un « — » entre la date et la conséquence (`src/ui/suivi-procedure.tsx` ou le texte de `apres-procedure.ts`) ;
  - le nom d'une voie : « Procédure L.126 — créances commerciales » (`PROCEDURES`, `src/lib/verticales/recouvrement/procedures.ts`) ;
  - l'angle mort du titre exécutoire écrit « il n’est PAS surveillé » en capitales : l'emphase des commentaires du code passée dans l'interface ;
  - la recherche d'un commissaire écrit « Deux caractères — 44, 09, 2A — ou trois outre-mer. » (`src/ui/recherche-commissaire.tsx`) ;
  - le retrait d'un taux contractuel répond « Les intérêts repartent sur le taux légal — BCE majoré de dix points, recalculé à chaque semestre. » (`src/lib/convex/recouvrement/tauxContractuel.ts`, ligne 94), relevé en lisant le code pour la tâche 5.
- ~~« 20 barreaus dans cette livraison »~~ **CORRIGÉ en `a876c54`** : « 20 barreaux », vérifié au navigateur.
- Regard de la tâche 4 terminé (`38e0f8a`) : à 1280 px, les quatre états, la variante « voie terminée », la feuille d'une voie, « Je l’ai engagée », le carnet, la recherche d'un commissaire (résultats compris) et celle d'un avocat ; à 375 px, la page et chaque feuille empilée à pleine largeur. Aucun débordement, aucune cible sous 48 px.

- **CONFIRMÉ AU REGARD, et en production aujourd'hui** : la feuille d'une voie affiche le blocage tel que le domaine le rend, « « mentionsObligatoiresInjonction » : Les mentions que doit porter une requête en injonction de payer. Une requête aux mentions inventées est PIRE que pas de requête : elle se fait rejeter… Tant que cette entrée est vide, la procédure peut évaluer une créance mais pas produire l'acte. » C'est la note du registre des paramètres, écrite pour le code : une clé technique, des capitales, « cette entrée ». La salle le cachait (`VOIE_DEMO` avec `blocages: []`) ; calculée, elle le montre.
  - **Analyse (pas un correctif d'une ligne)** :
    - le texte se fabrique à deux endroits, `« ${cle} » : ${p.note}` (`procedures.ts:104-108` et `relance.ts:298`) ;
    - il s'affiche à deux endroits : la feuille d'une voie (`src/ui/feuille-voie.tsx:66-70`), et le niveau 3 des relances (`src/ui/relances.tsx:120-124`, en tout petit sous un `constat` qui le dit déjà en mots de gérant) ;
    - deux tests exigent la clé dans la chaîne (`procedures.test.ts:102`, `relance.test.ts:159`).
  - **Proposition pour le chantier 3** : un motif en mots de gérant à côté de la `note` de chaque paramètre (la note reste pour le code et les tests). La feuille d'une voie montre ce motif, en distinguant « évalue mais ne produit pas l'acte » (disponible avec blocage) de « indisponible ». Les relances cessent d'afficher la ligne brute, redondante avec leur constat. La formulation touche au juridique : la faire relire.
- **« Les délais de Injonction de payer courront depuis le 14 sept. 2026. »** dans la feuille « Je l’ai engagée » : le nom de la voie est collé derrière « de » sans élision ni minuscule (`FeuilleDeclaration`, texte d'origine de la route). → chantier 3, balayage des textes, ou tâche 10.
