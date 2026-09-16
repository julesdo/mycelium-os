# Défauts relevés au regard pendant la tranche 2

Ce que le navigateur montre et que la migration « à l'identique » ne corrige pas. À traiter : les défauts bon marché et sans ambiguïté à la tâche 10 (étape 2 : « tout défaut vu se corrige »), les autres au chantier 3.

## Tâche 2 (accueil, procédures, créance)

- Les rangées du squelette d'attente (`bg-cladd-fg/10`) sont très discrètes sur le verre sombre à 1280 px. Visibles, mais à la limite. À regarder en thème clair aussi.
- Les erreurs « Unauthenticated » de la console viennent des composants de la barre (`VeilleurPresent`, `SelecteurEtablissement`, `AvatarConnecte`) rendus sans session dans la salle ; avalées par `Facultatif`. Préexistant, sans effet.
- `SegmentedButton` (Cladd) pose `readOnly` sur le segment actif, qui sort de l'ordre de tabulation. Comportement du kit, tous les `Segmented` du produit ; on ne forke pas.

## Tâche 3 (les cinq analyses de la créance)

1. ~~Le lien de retour mesure 44 px~~ **CORRIGÉ avant la tâche 4** : `EnteteDetail` passe à `min-h-12`, mesuré à 48 px à 375 et 1280 px (décompte, litige). La même recherche a trouvé trois autres cibles à 44 px dans `src/ui/`, corrigées dans le même commit : le lien « Lire l’annonce au BODACC » (`identite-debiteur.tsx`), « Changer » et « Saisir le numéro moi-même » (`recherche-registre.tsx`). À mesurer au regard de la tâche 5, où la fiche du débiteur les rend.
2. ~~Le litige « sans données » rend un corps vide~~ **RETIRÉ : fausse observation.** Elle venait d'une donnée de salle impossible (`constats: []`) : `lireLitige` produit toujours au moins un constat (`litige.ts` 240-269), donc le produit ne rend jamais ce corps vide. Leçon : un regard sur une donnée inventée produit un défaut inventé. D'où le correctif de la tâche 3 : les données de la salle se calculent par le domaine.
3. ~~**Texte du domaine avec « — »**~~ **CORRIGÉ en `82b898d`** : les deux questions du litige et l'aveu sur une contestation prennent des deux-points (`litige.ts`). Le balayage du reste des textes affichés est fait dans le même commit ; ce qui reste ouvert est listé plus bas, fichier par fichier.
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
  - ~~dates ISO montrées au gérant dans des constats~~ **CORRIGÉ en `92948e9`** : `dateLisible` rejoint `calendrier.ts`, à côté de `estDateReelle`, et la copie privée de `piece.ts` disparaît. « constaté le 10 septembre 2026 », « du 6 mai 2026 ». La date ISO reste dans la donnée ; une chaîne qui ne désigne pas un jour réel ressort telle quelle, pour qu'un « 30 février » d'OCR se voie tel qu'il a été lu.
  - « Vide = taux légal, BCE majoré de dix points. » : un signe « = » dans une phrase d'interface. **Toujours ouvert** — le texte vit dans `src/ui/identite-debiteur.tsx:181`, confié à un autre agent au même moment.
  - ~~le refus d'un taux sous le plancher~~ **CORRIGÉ en `92948e9`** : « … est inférieur au plancher de 7,86 % constaté le 15 mars 2026 : trois fois le taux d’intérêt légal des « autres cas ». » Le « — » devient deux-points, la date passe en français, et « n’a donc PAS été contrôlé » cesse de crier. Aucune réserve retirée.
  - « Daté du 6 mai 2026 — n° BL-2026-0142 » dans la rangée d'une pièce. **Toujours ouvert** : `src/ui/pieces.tsx`, confié à un autre agent au même moment.
  - ~~« 0 document » en sous-titre des pièces vides~~ **déjà corrigé** : `src/screens/debiteur/pieces.tsx` dit « Aucun document ».
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
- ~~**Le champ de confirmation des deux suppressions parle anglais**~~ **CORRIGÉ par la tâche 8 bis** (`ConfirmationParSaisie`, sept tests jsdom à clics et saisies réels) ; le regard au navigateur reste à la tâche 10. Relevé d'origine : « Type c.beranger@thumbbb.fr to confirm », « Type Thumbbb Agency to confirm ». L'interface est en français uniquement (CLAUDE.md), et ces pages existent en production. **Origine relevée** : les deux écrans emploient le `Dialog` du kit avec `requireConfirmText`, qui rend son propre champ à l'invite anglaise. La documentation du `Dialog` n'offre aucune prop pour ce texte, et `CladdProvider` n'a ni langue ni messages (`defaults` ne couvre que les props exposées). Antérieur à la tâche 7, en production. → **tâche 8 bis** au plan : une primitive de `src/ui/` bâtie sur les emplacements documentés du `Dialog` (`children` pour un `Input` du kit à l'invite française, `buttons` pour « Annuler » et la confirmation désactivée tant que la saisie n'est pas exacte), avec des tests.
- **« Ses 0 facture, ses 0 débiteur, ses 0 décompte »** sur la suppression d'un établissement vide (variante « nouveau client ») : un cadran à zéro et un accord faux. → tour de correctifs de la tâche 7 si c'est une condition, sinon chantier 3.
- **« invitations en attente compris »** sur l'invitation d'une offre complète : l'accord est « comprises ». → tour de correctifs de la tâche 7.
- Regard de la tâche 7 terminé : à 1280 px, les six écrans, leurs états, leurs variantes, et les deux confirmations ouvertes sans être validées (bouton désactivé tant que rien n'est saisi, « Annuler » referme) ; à 375 px, aucun débordement ni cible sous 48 px.
- **« Claire Béranger · vous … arrivé le 11 février 2026 »** : l'accord du participe suppose un genre que le produit ne connaît pas. Une tournure neutre (« membre depuis le 11 février 2026 ») l'évite. → chantier 3.

## Tâche 8 bis (la confirmation d'une suppression), relevé en l'implémentant

- **Le reste de l'application n'est jamais rendu `inert` pendant un dialogue du kit.** La documentation du `Dialog` dit qu'il pose `inert` sur le conteneur que désigne `inertContainer`, `'.app-container'` par défaut. Aucun élément du produit ne porte cette classe, et aucun dialogue ne passe `inertContainer` (recherche sur `src/`, le 15/09). `aria-modal="true"` et le piège à focus restent. À mesurer au navigateur (tabulation derrière un dialogue ouvert, lecteur d'écran), puis poser la classe sur la coquille ou passer la prop. → tâche 10 si le correctif tient en une ligne, sinon tranche 3.

## Tâche 8 (l'import, le bilan d'un dépôt, la révélation), relevé en migrant

- **L'accueil de la salle se contredit sur FA-2021-0087** : son flux la dit « PRESCRITE depuis le 2026-08-14 » (`EVENEMENTS_DEMO`, `communes.ts`), et le veilleur du même écran annonce qu'elle « sera prescrite le 2026-10-14, dans 32 jours » (`ACCUEIL_DEMO.travaux`, `onglets.tsx`). Antérieur à la tâche 8 ; la révélation n'emploie plus cette référence ni FA-2026-0311. → tâche 10 (dériver l'une des deux dates de l'autre), ou chantier 3.
- **La révélation chiffre une facture que le bilan de la même page dit éteinte.** `reveler` ne retient que le statut et le retard (`entreDansLaRevelation`, `src/lib/verticales/recouvrement/revelation.ts`), jamais la prescription. Dans la salle, désormais calculée : FA-2024-0217, transport échu le 31 mars 2024, prescrit le 31 mars 2025, figure sous « Dus de plein droit… » avec 4 094,35 € d'intérêts, et sous « Éteint avant votre arrivée ». Question de domaine, avec une dimension juridique (ce qui reste réclamable sur une créance prescrite) : à poser à Jules, hors tranche 2.
- ~~**Le motif d'une facture non chiffrée parle au développeur**~~ **CORRIGÉ en `92948e9`, sauf la répétition de la référence.** Le motif se lit désormais « Facture FA-2020-0930 : aucun taux applicable le 30 novembre 2020. Ses intérêts ne peuvent donc pas être calculés, et ils ne sont pas comptés pour zéro : la créance les abandonnerait définitivement. » Le « — » et « il doit échouer » sont partis, la date est en français, et le refus de retenir zéro est intact.
  - **Reste ouvert : la référence est écrite deux fois.** `NonChiffrees` la pose déjà en gras avant le motif (`src/ui/revelation.tsx:103`), et le motif la reprend. Elle a été GARDÉE dans le message volontairement : `decompter` lève depuis une boucle sur toutes les factures d'une créance, où elle est le seul moyen de savoir laquelle a manqué. La lever proprement demande une erreur typée qui porte référence et motif séparément — un changement de code, pas de forme.
- **Lu au code, pas montré par la salle** : le bilan compte parmi les pertes une facture dont le débiteur n'a pas de secteur, sur l'hypothèse du délai le plus court (`facturesPour` retient `INDETERMINE`, donc un an). Prudente pour une alerte, cette hypothèse devient un fait sous « Éteint avant votre arrivée, en silence », sans être déclarée. → même question de domaine que le point précédent.

## Décision produit à demander à Jules (vue par la seconde revue de la tâche 3)

- Pour un débiteur en procédure collective, la rangée de la créance affiche des relances « Suspendues » à côté de « 1 voie », et cette voie est la relance amiable. `proceduresEnvisageables` l'inclut toujours, et `creanceComplete` ignore la santé du débiteur en listant les procédures (`src/lib/convex/recouvrement/lecture.ts`, lignes 516-517 et 606-609). Le produit offre donc une relance que son propre module de relances suspend, et il offrirait l'injonction si les quatre critères étaient acquis. Deux lectures possibles : la liste des voies reste un constat indépendant de la santé, ou la santé compte (aucune voie offerte, avec le constat du registre). C'est une question de domaine, avec une dimension juridique à faire valider : hors tranche 2, à poser dans le compte rendu.

## Tâche 4 (la procédure), à regarder

- Vu à 1280 px dans la salle (`38e0f8a`), textes affichés au gérant, tous du domaine ou d'un composant existant, conservés par la migration (décision D9) → **balayage fait en `82b898d`** :
  - ~~l'échéance du suivi se lit « 10 avr. 2026 — Passé ce délai de 3 mois… »~~ **CORRIGÉ** : « 10 avr. 2026 : Passé ce délai… » (`src/ui/suivi-procedure.tsx:248`) ;
  - ~~le nom d'une voie : « Procédure L.126 — créances commerciales »~~ **CORRIGÉ** : « Procédure L.126, créances commerciales » ;
  - ~~l'angle mort du titre exécutoire écrit « il n’est PAS surveillé » en capitales~~ **CORRIGÉ** : « il n’est pas surveillé », comme l'angle mort du délai d'opposition juste au-dessus. La phrase dit déjà que la durée n'est pas relevée au référentiel ;
  - ~~la recherche d'un commissaire écrit « Deux caractères — 44, 09, 2A — ou trois outre-mer. »~~ **CORRIGÉ** : « Deux caractères (44, 09, 2A), ou trois outre-mer. » ;
  - le retrait d'un taux contractuel répond « Les intérêts repartent sur le taux légal — BCE majoré de dix points, recalculé à chaque semestre. » (`src/lib/convex/recouvrement/tauxContractuel.ts`, ligne 94). **Toujours ouvert** : hors du périmètre de l'agent des textes, qui ne touchait pas à `src/lib/convex/`. Correctif d'un caractère.
- Même balayage, non relevés jusqu'ici et **corrigés en `82b898d`** : l'angle mort d'une date impossible (« n’existe pas au calendrier : un « 30 février »… », `surveillance.ts`), l'échéance perdue d'un dossier (« DOSSIER : libellé »), la ligne d'une facture écartée du décompte et les deux fondements de la pièce (`piece.ts`), et le titre de section du PDF (`src/ui/piece-decompte.ts`).
- **Restes de « — » laissés volontairement** : les puces d'une relance (`relance.ts:190` et `249`) — un tiret de liste, pas une ponctuation de phrase ; `plancherLisible: '—'` (`taux-contractuel.ts`), qui marque une absence et non un texte ; les sources du registre (`parametres.ts`), qui ne se touchent pas.
- ~~« 20 barreaus dans cette livraison »~~ **CORRIGÉ en `a876c54`** : « 20 barreaux », vérifié au navigateur.
- Regard de la tâche 4 terminé (`38e0f8a`) : à 1280 px, les quatre états, la variante « voie terminée », la feuille d'une voie, « Je l’ai engagée », le carnet, la recherche d'un commissaire (résultats compris) et celle d'un avocat ; à 375 px, la page et chaque feuille empilée à pleine largeur. Aucun débordement, aucune cible sous 48 px.

- **CONFIRMÉ AU REGARD, et en production aujourd'hui** : la feuille d'une voie affiche le blocage tel que le domaine le rend, « « mentionsObligatoiresInjonction » : Les mentions que doit porter une requête en injonction de payer. Une requête aux mentions inventées est PIRE que pas de requête : elle se fait rejeter… Tant que cette entrée est vide, la procédure peut évaluer une créance mais pas produire l'acte. » C'est la note du registre des paramètres, écrite pour le code : une clé technique, des capitales, « cette entrée ». La salle le cachait (`VOIE_DEMO` avec `blocages: []`) ; calculée, elle le montre.
  - **Analyse (pas un correctif d'une ligne)** :
    - le texte se fabrique à deux endroits, `« ${cle} » : ${p.note}` (`procedures.ts:104-108` et `relance.ts:298`) ;
    - il s'affiche à deux endroits : la feuille d'une voie (`src/ui/feuille-voie.tsx:66-70`), et le niveau 3 des relances (`src/ui/relances.tsx:120-124`, en tout petit sous un `constat` qui le dit déjà en mots de gérant) ;
    - deux tests exigent la clé dans la chaîne (`procedures.test.ts:102`, `relance.test.ts:159`).
  - **Proposition pour le chantier 3** : un motif en mots de gérant à côté de la `note` de chaque paramètre (la note reste pour le code et les tests). La feuille d'une voie montre ce motif, en distinguant « évalue mais ne produit pas l'acte » (disponible avec blocage) de « indisponible ». Les relances cessent d'afficher la ligne brute, redondante avec leur constat. La formulation touche au juridique : la faire relire.
- ~~**« Les délais de Injonction de payer courront depuis le 14 sept. 2026. »**~~ **déjà corrigé** : `FeuilleDeclaration` écrit « Les délais de cette procédure courront depuis le … » (`src/screens/analyses/procedure.tsx:137`).

## Balayage des textes du chantier 3 (`ux/textes`, `92948e9` et `82b898d`)

Ce que l'agent des textes n'a PAS pu reprendre, et pourquoi. Aucun de ces points n'est réglé.

- Trois textes vivent dans des fichiers confiés à d'autres agents au même moment : « Vide = taux légal, BCE majoré de dix points. » (`src/ui/identite-debiteur.tsx:181`), « Daté du 6 mai 2026 — n° BL-2026-0142 » (`src/ui/pieces.tsx:117`), « Exigibilité déduite de l’échéance — à confirmer… » (`src/screens/debiteur-detail.tsx:427`).
- Hors périmètre : « Les intérêts repartent sur le taux légal — … » (`src/lib/convex/recouvrement/tauxContractuel.ts:94`), et le « — » qui sépare la référence du motif dans `NonChiffrees` (`src/ui/revelation.tsx:103`, voisin des écrans d'import).
- `src/routes/-salle/onglets.tsx:57` recopie mot pour mot l'angle mort du délai d'opposition, et garde donc son « PAS ». La salle rend toujours ; la démonstration est seulement en retard d'un mot.
- La ligne de blocage brute de la feuille d'une voie (« « mentionsObligatoiresInjonction » : … PIRE que pas de requête… ») n'est pas un défaut de forme : elle demande un motif en mots de gérant à côté de la `note` du paramètre, et la formulation touche au juridique. Voir la proposition ci-dessus, inchangée.
- `src/lib/convex/__tests__/battementRecouvrement.test.ts` échoue avant ce travail comme après : il attend `AUTH_EMAIL` dans la trace d'échec, et c'est `RESEND_API_KEY` qui manque en premier. Fixture d'échec accidentel, sans rapport avec les textes.

## Regard du 16 septembre 2026, après les tranches 3, 4 et 5 et l'audit UX

Ouvert dans la salle d'exposition : les 27 écrans et la palette, à 375, 768, 1023, 1024 et 1280 px, en sombre et en clair.

**Corrigé dans la foulée**

- `c0760b7` — Équipe, à 375 px : la colonne d'identité tombait à 42 px (37 px sur une invitation) pendant que les puces gardaient 198 px, parce qu'un `flex-1` part d'une base nulle. Base de 16 rem, puces à la ligne, bouton d'actions de 36 × 48 à 48 × 48 px.
- `4bf34cf` — « Oui » et « Non » du litige et du créancier mesuraient 43,9 px de large. Plancher à 48.
- Le thème : « Automatique » avait été fait défaut le matin même, le sombre le redevient (voir ci-dessous).
- `b5793f6` — Point 3 ci-dessous. Quatre constats de `surveillance.ts` sortaient des dates ISO et un « PRESCRITE » en capitales. `dateLisible` les écrit en français, et la prescription en minuscules : la phrase dit déjà ce qu'elle a de grave. La donnée garde son ISO ; seul le texte affiché change. Deux assertions et trois textes de la salle suivent.
- `03cdf71` — Point 2 ci-dessous. Sous 1024 px, le marque-page n'affiche plus que « Rechercher », entier ; au-dessus, l'exemple revient, et il tient (261 px de texte dans 320 px de pilule). Vérifié à 375, 768, 1023, 1024 et 1280 px : `scrollWidth` égale `clientWidth` partout.
- `aceaa47` puis `5ed0ea3` — Point 4 ci-dessous. Le disque portait `verre`, écrit en dur en sombre, dans un creux lui-même en verre sombre : 2,03:1 en thème clair. `bg-cladd-surface` suit le thème, `text-cladd-fg-soft` tient le glyphe au rang d'indication, `shadow-cladd-outline` reprend l'arête du verre. Mesuré après : 6,3:1 en clair, 9,8:1 en sombre. Pas un `<Surface>` : `ui/__tests__/verre.test.ts` les exige transparentes, et une surface transparente ne peint aucun disque (c'est `aceaa47` qui l'a appris, `5ed0ea3` qui le corrige).

**Ouvert, et qui demande une décision**

1. ~~**Le thème clair n'existe pas.** Les quatre classes `verre-*`, employées à 95 endroits, portent des couleurs sombres écrites en dur, et `app.css` ne contient aucune règle `.light`. Mesuré sur la liste des débiteurs, en clair, à 375 px : nom du débiteur et montant à 1,92:1, titre de section à 1,24:1, puce ambre « 4 échues » à 1,10:1, là où il faut 4,5:1.~~ **ÉCRIT ET MESURÉ** — voir la section « Le thème clair » plus bas. « Automatique » est redevenu le défaut.
2. ~~**Le marque-page de la recherche est tronqué à 768 px** exactement (133 px disponibles, 261 nécessaires), sur tous les écrans.~~ **Corrigé** par `03cdf71`.
3. ~~**`surveillance.ts` sort encore des dates ISO** et un « PRESCRITE » en capitales dans des constats lus par le gérant (lignes 310, 341, 342, 417).~~ **Corrigé** par `b5793f6`.
4. ~~**Le glyphe du cercle de dépôt**, sur l'import, porte la même encre que le titre sur un fond plus sombre : c'est l'élément le moins lisible de l'écran.~~ **Corrigé** par `aceaa47` puis `5ed0ea3`.
5. Une ligne secondaire de la palette est tronquée à 375 px : 271 px disponibles pour 280 nécessaires.

**Ce que la correction du point 4 a montré, et qui reste ouvert**

Le point 1 est plus large qu'il n'en avait l'air : le creux de la zone de dépôt
est lui aussi du verre sombre dans les deux thèmes, et le titre « Déposez vos
fichiers ici » y mesure 3,07:1 en clair pour 19,27:1 en sombre. Le glyphe n'était
que le cas le plus visible. Les trois autres disques du même motif
(`ui/carte-demarrage.tsx`, `ui/habitude.tsx`, `ui/actions.tsx`) portent encore
`verre` et la même encre : ils tomberont avec la décision du point 1, pas avant.

## Le thème clair, écrit le 16 septembre 2026

Le point 1 ci-dessus est fermé. La palette claire existe, elle est mesurée écran
par écran, et « Automatique » est redevenu le défaut de `src/app/use-theme.ts`.

**Ce qui a été écrit, et où**

- `src/styles/app.css` — la jumelle `.light` de chacune des règles de verre. Le
  verre clair est un presque-blanc à 0,78 d'alpha (repère relevé au navigateur :
  la barre d'apple.com sert `rgba(245,245,247,0.8)`), le flou et la saturation ne
  bougent pas, l'arête devient une ombre sous l'objet, et le survol assombrit —
  même règle qu'en sombre (« le survol augmente le contraste avec le fond »),
  autre sol. Cinq sélecteurs qu'on ne trouve pas en cherchant « verre » y
  passent : `.pilule-secondaire` (du blanc à 14 %, strictement invisible sur fond
  clair), la règle des champs et celle des creux, plus le faisceau.
- `src/styles/tokens.css` — la palette. La teinte passe de 44 (chaud, hérité
  d'EGalim) à 258, celle de l'encre de marque : le 44 faisait vibrer l'ambre du
  seuil « tout près ». La rampe de surfaces retrouve le sens de Cladd — vers le
  noir, 3 % — parce que mélangée vers le blanc depuis 0,995 elle rendait 1,00:1
  entre chaque niveau, soit quatre niveaux identiques. Les trois couleurs de
  seuil et les trois parts sont recalculées ; `--color-veille` remplace sept
  copies d'un même bleu.
- `src/ui/fond.tsx` — en clair, ni les ondes ni le voile ne sont rendus. Le
  shader est additif : sur du papier, il assombrit au lieu de se fondre, et le
  voile ne couvre que le haut et le bas de l'écran. `.fond-releve` devient un
  lavis immobile dont chaque ton est PLUS CLAIR que la page, ce qui garde
  `--cladd-bg` comme plancher mesurable.
- `src/screens/import/depots.tsx` — le disque de dépôt revient à `verre` : la
  rustine de `aceaa47`/`5ed0ea3` n'a plus de raison d'être, et elle coûtait
  l'arête du verre.

**Mesuré au navigateur, sur les huit écrans de la salle, à 375 et 1280 px**

| Écran     | Clair AVANT                               | Clair APRÈS    | Sombre avant → après |
| --------- | ----------------------------------------- | -------------- | -------------------- |
| accueil   | 1,02:1 (nom de débiteur)                  | 5,27:1         | 5,53:1 → 5,53:1      |
| débiteurs | 1,01:1 (initiales) ; 1,10:1 (puce ambre)  | 5,27:1         | 5,53:1 → 5,53:1      |
| créance   | 1,01:1 (« Oui »/« Non »)                  | 5,93:1         | 7,12:1 → 7,12:1      |
| décompte  | 1,24:1 (« Principal »)                    | 5,93:1         | 7,12:1 → 7,12:1      |
| import    | 3,07:1 (titre du dépôt) ; 2,03:1 (glyphe) | 13,9:1 ; 8,9:1 | 19,3:1 ; 9,8:1       |
| réglages  | 1,24:1 (« Apparence »)                    | 5,93:1         | 7,12:1 → 7,12:1      |
| équipe    | 1,02:1 (« Claire Béranger »)              | 6,33:1         | 7,06:1 → 7,06:1      |
| recherche | (palette, non relevée avant)              | 6,29:1         | 7,72:1 → 7,72:1      |

Aucun texte sous 4,5:1 en clair, aux deux largeurs. Le sombre garde ses pires
valeurs au centième près.

**Ce qui reste, et pourquoi ce n'est pas un défaut**

- Les disques de verre rendent 1,08:1 contre la page (1,04:1 en sombre). Ce sont
  des conteneurs : leur glyphe tient 5,3 à 8,9:1 et chacun porte un libellé, donc
  l'exception de WCAG 1.4.11 (« if a control has visible content ») s'applique.
  Le jour où l'un d'eux perd son libellé, il lui faudra un trait à 3:1.
- Le « L » du logotype et la coche d'une case Cladd ressortent à 1:1 dans une
  mesure DOM : leur vrai fond est peint par une couche sœur, que remonter les
  parents ne voit pas. Faux positifs, présents à l'identique dans les deux
  thèmes.

**Ce qui n'a PAS été fait, et qu'il faudra regarder**

- La page commerciale (`src/marketing/**`) garde sa palette absolue, par décision
  écrite. Sa tablette (`marketing/apercu.tsx`) rend l'application avec `.light`
  imbriqué : la liste de sélecteurs de `tokens.css` gagne désormais `.dark .light`
  et `:root .light` pour battre Cladd, mais cette page n'a pas été relevée.
- `src/ui/couleurs-impression.ts` fige douze hexadécimaux sur les ANCIENNES
  valeurs claires. Le papier est toujours blanc, donc la table reste légitime —
  mais son vert et son ambre ne sont plus ceux de l'écran, et les commentaires
  qui citent les jetons d'origine sont désormais faux.

Et `marketing/apercu.tsx` comme `marketing/etapes.tsx` recopient « est PRESCRITE
depuis le … » en capitales. Hors du périmètre de `b5793f6`, qui s'est tenu au
produit et à la salle.
