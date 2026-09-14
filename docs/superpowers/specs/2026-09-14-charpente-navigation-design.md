# Spec : la charpente de navigation

Statut : validé section par section le 14 septembre 2026, en attente de relecture.
Chantier 2 sur 3. Le chantier 1 (la voie de la procédure) est livré et poussé : voir
`docs/superpowers/specs/2026-09-12-voie-procedure-design.md`.

---

## 0. En une phrase

**Chaque écran du produit devient regardable tel que l'utilisateur le voit**, avec une attente
visible, deux volets là où il y a une liste et une preuve, un retour qui ramène d'où l'on vient,
et une recherche qui trouve un débiteur, une facture ou un dossier sans jamais sortir de
l'établissement.

---

## 1. Ce que l'audit a mesuré

Le point de départ était « des écrans bâclés ». L'audit des 31 écrans a montré que la cause
n'était pas là où on la cherchait.

**Le squelette est déjà uniforme.** 28 écrans sur 31 partagent `Page / en-tête / PageBody`, avec
deux en-têtes selon qu'on est sur un onglet (`PageHeader`) ou sur une page poussée
(`EnteteDetail`). Il n'y a pas de charpente à inventer.

**Onze routes dessinaient au lieu de déléguer à `src/screens/`.** Un écran qui vit dans
`src/routes/` ne peut pas s'ouvrir dans la salle d'exposition, qui rend sans backend ni
authentification. Ces écrans n'ont donc jamais pu être regardés aux quatre largeurs. Ce ne sont
pas des écrans mal faits, ce sont les écrans que personne ne pouvait voir.

**La salle d'exposition montre d'autres pages que celles du produit.** `DemoLitige` porte
`PageHeader` « Fournitures Durand » / « Ce que vous seul pouvez dire », alors que le vrai écran
porte `EnteteDetail` et « Ce que vous seul pouvez dire » / « Des faits, pas une appréciation
juridique. » `DemoHabitude` s'intitule « Son habitude de paiement », sous-titre « Les trois états
du module », là où le vrai écran dit « Comment il paie d'habitude ».

**L'attente est invisible sur onze fichiers et absente sur trois.** Les onze posent
`<p className="sr-only">Chargement…</p>`, lisible par un lecteur d'écran et invisible pour tous les
autres, y compris sur l'accueil, les débiteurs, les procédures et la créance. La règle d'écran
n° 2 est enfreinte sur quatorze écrans.

**La règle des deux volets est tenue par 2 écrans sur 31** (débiteurs, procédures). 21 fichiers
posent la même colonne `max-w-2xl` centrée.

**La recherche de la barre est décorative.** Dans `src/app/barre.tsx`, `terme` est déclaré
ligne 114, lu ligne 121 pour l'affichage, et nulle part ailleurs. Valider mène à `/app/debiteurs`
non filtré. Le marque-page « Rechercher un débiteur » ment déjà sur la portée voulue.

**Le retour ne revient pas d'où l'on vient.** Chaque `retourVers` est écrit en dur vers le
parent. Depuis l'onglet Procédures, « Le dossier complet » puis Retour mène à la créance. Et
l'écran de la créance n'a aucun retour : il porte `PageHeader`, alors qu'on y arrive depuis un
débiteur, le flux et les procédures.

**L'erreur n'offre pas de sortie.** Le `defaultErrorComponent` de `src/router.tsx` force la
hauteur de l'écran, n'a pas de retour, et « Rechargez la page » refait l'erreur à l'identique sur
un lien de créance périmé.

**Le vocabulaire d'avant le pivot survit sur quatre écrans**, en cinq lignes (détail en § 3). Les
gabarits d'e-mail sont propres : seize fichiers balayés, zéro occurrence.

---

## 2. Ce qu'on construit, en cinq tranches

Chaque tranche est livrable seule. L'ordre suit les dépendances.

| Tranche | Contenu | Pourquoi à cette place |
| --- | --- | --- |
| 1 | Les écrans de passage et le vocabulaire | Aucune dépendance, et l'offre d'abonnement est un écran de vente |
| 2 | La coquille, ses trois états, les 27 écrans migrés | Les deux volets et le retour vivent dans la coquille |
| 3 | Les deux volets des quatre écrans maîtres | Ils se posent dans la coquille |
| 4 | Le retour qui ramène d'où l'on vient | Il doit savoir quand le volet gauche montre déjà la destination |
| 5 | La recherche | Seule tranche qui dépend de toutes les autres : ses résultats s'ouvrent dans des écrans regardables, dans un volet droit, avec un retour qui revient sous la palette |

---

## 3. Tranche 1 : les écrans de passage et le vocabulaire

**Les cinq lignes**, remplacées par le vocabulaire du recouvrement. En recouvrement, le seul taux
est celui de la BCE : on ne le « retrouve » pas et on ne le « mesure » pas. Ce sont des restes
d'EGalim.

| Fichier | Aujourd'hui | Demain |
| --- | --- | --- |
| `src/router.tsx`, page introuvable | « Revenez au tableau de bord pour retrouver vos taux. » | « Le lien est peut-être ancien. Revenez à l'accueil pour retrouver vos créances. » avec un vrai lien vers l'accueil, qui n'existe pas aujourd'hui |
| `src/router.tsx`, erreur | « Vos factures et vos taux sont intacts » | « Vos créances et vos décomptes sont intacts : c'est l'affichage qui a échoué, pas la mesure. » |
| `src/routes/app/route.tsx`, session expirée | « Reconnectez-vous pour retrouver vos taux et vos factures. » | « Reconnectez-vous pour retrouver vos créances et vos décomptes. » |
| `src/routes/nouveau-mot-de-passe.tsx` | « vous retrouverez vos taux et vos factures » | « vous retrouverez vos créances et vos décomptes » |
| `src/screens/abonnement/offre.tsx` | « déposez vos factures, mesurez vos taux » | « déposez vos factures, voyez ce qui vous est dû » ; le reste de la phrase ne change pas |

**L'écran d'erreur du routeur propose un chemin.** Il garde le français et le ton rassurant, et
offre un lien vers l'accueil en action principale. Le rechargement reste possible, en second :
sur un lien périmé, recharger ne répare rien.

**La barrière.** `src/ui/__tests__/lignes-rouges.test.ts`, qui interdit déjà « garantie », interdit
aussi « vos taux », « mesurez vos taux » et « tableau de bord » dans les chaînes lisibles.

⚠️ Ce balayage lit aujourd'hui `src/ui`, `src/routes`, `src/screens`, `src/app`,
`src/lib/verticales` et `src/lib/convex/emails`. **Il ne lit pas `src/router.tsx`**, qui vit à la
racine de `src/`. Deux des cinq lignes y sont. Le fichier est ajouté aux zones balayées, sans quoi
la barrière laisserait passer exactement ce qu'elle doit arrêter.

---

## 4. Tranche 2 : la coquille, ses états, et les 27 écrans

### 4.1 La coquille

Un composant unique, `PageEcran`, dans `src/ui/`. Il portait le nom de travail `PageDetail` en
conception ; il est renommé parce que la barrière validée (§ 4.3) couvre aussi les pages
d'onglet, et qu'il sert donc les deux genres d'en-tête.

Il porte trois choses, et aucun écran ne les réécrit à la main :

- **l'en-tête**, en genre onglet (titre, sous-titre, actions) ou en genre page poussée (retour,
  titre, sous-titre). L'accueil garde son hero et n'a pas d'en-tête ;
- **la largeur** : une colonne de lecture, ou deux volets (§ 5) ;
- **trois états visibles**, en plus de l'état prêt.

**L'attente** est un squelette de la vraie page : le même en-tête, des rangées de substitution à
la place des rangées. Elle est annoncée aux lecteurs d'écran par `aria-busy` sur la zone qui
charge, et jamais par un paragraphe `sr-only` seul.

**Le vide** passe par `EmptyState`, qui existe. Règle d'écran n° 4 : il montre le chemin.

**L'erreur** garde l'en-tête et son retour, dit en français ce qui s'est passé, et propose une
issue. Jamais « rechargez » comme seule sortie.

### 4.2 La migration

Les **27 fichiers** de `src/routes/app/` qui dessinent aujourd'hui leur squelette déplacent leur
dessin dans `src/screens/`. Seule `src/routes/app/route.tsx`, la coquille authentifiée, n'est pas
concernée.

Un écran de `src/screens/` ne sait pas interroger Convex : il reçoit ses données en props. La
route ne fait plus que lire et traduire. C'est le patron déjà éprouvé par
`src/routes/app/creance.$id.tsx` et `src/screens/creance.tsx`.

La liste des 27, relevée et non estimée : `abonnement`, `abonnement_.premier-bilan`,
`abonnement_.suivi`, `creance.$id`, `creance_.$id.decompte`, `creance_.$id.litige`,
`creance_.$id.procedure`, `creance_.$id.relances`, `creance_.$id.risques`,
`creance_.$id.solidite`, `debiteurs`, `debiteurs_.$id.habitude`, `debiteurs_.$id.pieces`,
`donnees`, `donnees_.export`, `donnees_.supprimer-compte`, `donnees_.supprimer-etablissement`,
`equipe`, `equipe_.inviter`, `import-factures`, `import-factures_.$id`, `index`, `parametres`,
`parametres_.creancier`, `parametres_.etablissement`, `procedures`, `revelation`.

**La salle d'exposition rend ces écrans-là**, importés de `src/screens/`, dans chacun de leurs
états. `DemoLitige` et `DemoHabitude` sont supprimées : elles rendaient des pages que le produit
ne montre pas.

### 4.3 Les deux barrières

**Les routes lisent, les écrans dessinent.** Un test échoue si un fichier de `src/routes/app/`
contient `<Page`, `<PageHeader`, `<EnteteDetail` ou `<PageBody`.

**Aucune attente invisible.** Un test échoue si la chaîne `sr-only">Chargement` apparaît dans
`src/routes` ou `src/screens`.

Aucune des deux ne porte de liste d'exemptions. Une barrière qui exempte dix-sept pages est une
barrière qui exemptera la dix-huitième.

---

## 5. Tranche 3 : les deux volets

### 5.1 Quatre écrans maîtres

Au-delà de 1024 px, quatre écrans affichent la liste à gauche et la preuve à droite. Sous cette
largeur, rien ne change : les pages restent poussées.

**La créance.** Les analyses à gauche, l'analyse ouverte à droite. Les six analyses dont la route
est sous la créance (décompte, litige, procédure, relances, risques, solidité) s'ouvrent dans le
volet droit. Ce volet n'a pas de lien de retour : ce vers quoi il ramènerait est déjà à gauche.
Sur `/app/creance/$id` sans analyse ouverte, le volet droit n'est jamais vide : il ouvre la
première rangée marquée `attention`, celle qui demande une réponse, sinon le décompte, et
l'adresse n'est pas réécrite.

**Le débiteur** a déjà ses deux volets (`?d=`). Habitude et pièces **remplacent** le volet droit,
avec un lien de retour, parce que le détail qu'elles quittent n'est plus visible. Pas de troisième
colonne : elle ne tient pas à 1280 px.

**Les réglages.** Les cinq sections à gauche (établissement, créancier, abonnement, équipe,
données), la section ouverte à droite. Sur `/app/parametres` sans section ouverte, le volet droit
ouvre la première.

**Les imports.** Les dépôts à gauche, le bilan du dépôt ouvert à droite.

### 5.2 Le mécanisme : le segment d'adresse

**Aucune adresse ne change.** L'écran maître passe sa liste et un `<Outlet>` à la coquille, qui
les dispose en deux volets ; les enfants s'y rendent par imbrication de routes. La disposition
reste donc à un seul endroit, la coquille, et aucun écran maître ne réécrit la sienne. Tous les liens internes restent tels quels, et
`destinations-existent.test.ts` n'est pas touché.

La règle qui rend ce choix cohérent avec `?d=` et `?p=` : **choisir un élément dans une collection
se dit par paramètre ; ouvrir un enfant qui a son identité se dit par segment.**

Pour la créance et les imports, le soulignement final qui empêche aujourd'hui l'imbrication est
retiré (`creance_.$id.decompte.tsx` devient `creance.$id.decompte.tsx`). L'adresse reste
`/app/creance/$id/decompte`.

Pour les réglages, les cinq sections n'ont pas le même parent d'adresse : `/app/abonnement`,
`/app/equipe` et `/app/donnees` sont au premier niveau, à côté de `/app/parametres`. Une **route de
mise en page sans chemin** (`src/routes/app/_reglages.tsx`) les regroupe sous un même volet sans
changer leurs adresses.

Vérifié avant d'écrire :

- le générateur de routes installé (`@tanstack/router-generator` 1.167.32) réserve le soulignement
  initial aux routes sans chemin ;
- aucune adresse externe ne dépend de ces trois routes : aucun e-mail, aucune URL de retour de
  paiement Paddle, et le lien d'invitation pointe vers `/rejoindre/<jeton>`.

Deux nouveautés dans ce dépôt, nommées pour ne surprendre personne : un `<Outlet>` au niveau d'un
écran (il n'existe aujourd'hui que dans la coquille et la racine), et une première route de mise
en page sans chemin.

### 5.3 Ce qui garde une colonne de lecture

- **La révélation** : un moment, pas un écran de travail.
- **Les suppressions de compte et d'établissement** : une confirmation destructrice se lit seule.
  Elles s'affichent en pleine largeur, hors de la mise en page des réglages.
- **Inviter, premier bilan, suivi, export** : des formulaires courts ou des lectures. Ils s'ouvrent
  dans le volet droit de leur maître, à leur propre largeur de lecture.

---

## 6. Tranche 4 : le retour qui ramène d'où l'on vient

**Le retour revient d'où l'on vient**, par l'historique de navigation, que `useCanGoBack` rend
lisible (exporté par `@tanstack/react-router` 1.170.31, installé).

**Et il dit où il mène.** Chaque écran publie son titre depuis la coquille ; les liens le
transmettent à la destination ; le retour le relit. Ouvert directement (un lien d'e-mail, un nouvel
onglet, un rechargement sans état), il retombe sur le parent de l'adresse, dont on connaît le nom.
**Jamais un nom qui pourrait être faux** : un retour qui annoncerait « Fournitures Durand » et
ramènerait aux Procédures mentirait sur le seul geste qu'on fait sans regarder.

**La créance reçoit un retour**, qu'elle n'a pas aujourd'hui.

**Au-delà de 1024 px**, la règle de § 5.1 s'applique : pas de retour quand le volet gauche montre
déjà la destination, un retour quand le volet droit a remplacé un détail devenu invisible.

---

## 7. Tranche 5 : la recherche

### 7.1 La forme

**Sur téléphone**, le champ prend tout l'écran, avec « Annuler » à droite : le clavier en mange
déjà la moitié, et entre la barre et lui il ne resterait sinon qu'environ 200 px.

**Au-delà de 1024 px**, il devient une palette centrée au-dessus d'un fond assombri. L'écran de
travail reste visible derrière : on ne perd pas son contexte pour chercher.

Un seul composant, deux rendus.

**Le marque-page apprend ce qui est cherchable** : `Rechercher « Durand, FA-2026-0311… »`.

**Avant la frappe**, la palette montre les trois débiteurs dont quelque chose a bougé, tirés de
`api.recouvrement.surveillance.flux`, que l'accueil interroge déjà. **Pas de `localStorage`** : il
survit à la déconnexion, et sur une tablette partagée le suivant lirait les noms des clients du
précédent.

### 7.2 Ce qui est cherché, et par quoi

Ce sont les premiers index de recherche plein texte du dépôt.

**Les débiteurs** : un index de recherche sur `debiteurs.denominationNormalisee`, filtré par
`organizationId`. Le terme saisi passe par `normaliserFournisseur`
(`src/lib/socle/normalisation.ts`), la fonction même que `src/lib/convex/recouvrement/import.ts`
utilise pour écrire ce champ. Sans elle, « Société Durand » tapé ne trouverait pas
« societe durand » stocké.

**Le SIREN** ne passe pas par la recherche plein texte : neuf chiffres se cherchent exactement, par
l'index `by_org_and_siren` qui existe, après `normaliserSiren`
(`src/lib/verticales/recouvrement/pays/france/siren.ts`). Un SIREN à un chiffre près désigne une
autre entreprise.

**Les factures** : un index de recherche sur `facturesVente.reference`, filtré par
`organizationId`. Une référence tapée en entier se résout aussi par l'index `by_org_and_reference`
qui existe.

**Les procédures** n'ont pas d'index : un dossier engagé se trouve par son débiteur. Les résultats
« débiteurs » sont croisés avec `dossiersEngages`. Zéro table et zéro index de plus.

### 7.3 Ce qui est rendu

**Trois sections, dans un ordre fixe** : débiteurs, factures, procédures. Pas de score de
pertinence entre types : comparer un débiteur et une facture demanderait un arbitrage qu'on ne
saurait pas justifier.

**Trois résultats par section, avec le total vrai** : « Débiteurs · 3 sur 17 ». Afficher trois
lignes quand il y en a quarante, sans le dire, serait un mensonge silencieux.

**« Voir tout » déplie la section dans la palette**, sans ouvrir d'écran de plus. ⚠️ C'est la seule
évolution par rapport à la conception validée, qui envoyait vers une liste filtrée. Elle est
imposée par un fait : **aucun écran ne liste les factures** (`/app/import-factures` liste des
dépôts de fichiers, pas des factures). Envoyer « voir tout » vers une liste filtrée aurait marché
pour les débiteurs et les procédures, et obligé à inventer un écran pour les factures. Déplier dans
la palette traite les trois sections de la même façon.

**Aucun résultat** : la palette dit ce qui a été cherché et dans quelles familles, jamais un
« aucun résultat » sec.

**Toucher un résultat referme la palette et ouvre** :

- un débiteur, sur `/app/debiteurs?d=<id du débiteur>` ;
- une facture, sur le débiteur qui la porte, `/app/debiteurs?d=<id de son débiteur>`, puisqu'une
  facture n'a pas d'écran à elle ;
- un dossier de procédure, sur `/app/procedures?p=<id de la créance>`.

### 7.4 La barrière du cloisonnement

Un index de recherche sans filtre d'établissement rendrait les débiteurs de **tous** les clients.
C'est le seul endroit du produit où l'oubli du cloisonnement serait à la fois silencieux et total,
et aujourd'hui rien ne le vérifie.

Un test échoue si un `searchIndex` du schéma ne déclare pas `organizationId` dans ses
`filterFields`, ou si un appel `withSearchIndex` n'appelle pas `.eq('organizationId', …)`.

---

## 8. Les barrières, récapitulées

| Barrière | Tranche | Ce qu'elle interdit |
| --- | --- | --- |
| `lignes-rouges.test.ts`, étendue | 1 | Le vocabulaire d'avant le pivot, `src/router.tsx` compris |
| Les routes lisent, les écrans dessinent | 2 | `<Page`, `<PageHeader`, `<EnteteDetail`, `<PageBody` dans `src/routes/app/` |
| Aucune attente invisible | 2 | `sr-only">Chargement` dans `src/routes` et `src/screens` |
| Cloisonnement de la recherche | 5 | Un index ou une requête de recherche sans filtre d'établissement |

Les barrières existantes restent vertes : `destinations-existent`, `aucun-ecran-orphelin`,
`fonctions-appelees`, `purge-complete`, `champs-alimentes`, `declare-jamais-alimente`,
`source-citee`, `lignes-rouges`, et `src/lib/convex/recouvrement/__tests__/tables.test.ts`.

⚠️ **Chaque tâche se vérifie par `bun run test:unit`, pas par deux dossiers de tests.** Au chantier
1, `recouvrement/__tests__/tables.test.ts` est resté rouge pendant une tâche entière parce qu'il
vit hors des deux dossiers qu'on relançait.

---

## 9. Ce que le plan doit vérifier au code, et non supposer

Quatre comportements de framework dont la spec fixe l'intention sans pouvoir garantir la forme :

1. Comment le générateur déclare l'imbrication de `/app/debiteurs/$id/habitude` sous
   `/app/debiteurs`, qui n'a pas de route `$id` puisque la sélection y passe par `?d=`.
2. Comment les confirmations destructrices sous `/app/donnees/…` sortent de la mise en page
   `_reglages` en gardant leur adresse.
3. Que `<Link state>` et l'état de la location transportent bien le titre de l'écran quitté, dans
   la version 1.170.31.
4. Comment la recherche plein texte de Convex découpe une référence comme `FA-2026-0311`, pour
   décider si la résolution exacte par `by_org_and_reference` passe en premier.

Chacun se relève dans le paquet installé ou par un essai, avant d'écrire le code qui en dépend.

---

## 10. Hors périmètre, nommé pour qu'on ne le rediscute pas

- **L'onglet d'origine qui reste allumé pendant la navigation en profondeur.** Non discuté.
- **Un raccourci clavier pour ouvrir la palette.** Non discuté.
- **Chercher dans les pièces, les relances ou les décomptes.** La recherche couvre débiteurs,
  factures et procédures.
- **Renommer l'onglet Importer.** Décidé : il reste. `/app/import-factures` est un lieu,
  l'historique des dépôts et de leurs bilans, et devient un écran maître à deux volets.
- **Juger et corriger chaque écran une fois qu'il est regardable.** Ce qui reste du chantier 3 :
  ce chantier-ci rend les écrans visibles tels qu'ils sont, le suivant corrige ce qu'on y voit.

---

## 11. Comment on saura que c'est fini

1. Chaque écran du produit s'ouvre dans la salle d'exposition, dans chacun de ses états, tel que
   l'utilisateur le voit.
2. Aucun écran n'affiche un corps vide pendant un chargement.
3. À 1280 px, une créance, un débiteur, les réglages et les imports montrent la liste et la preuve
   côte à côte.
4. Taper « Durand » ou « FA-2026-0311 » dans la barre trouve le débiteur, la facture et le dossier,
   et ne montre jamais les données d'un autre établissement.
5. Depuis n'importe quel écran, le retour ramène là d'où l'on vient, et dit où.
