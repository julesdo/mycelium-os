# Cycle de vie, e-mails automatiques et mesure : où brancher les trois demandes de l'audit

## 0. Ce qu'il faut savoir avant de commencer

- **Le diagnostic express n'existe pas dans le code.** Une recherche de « diagnostic » dans `src` ne renvoie que des commentaires sur EGalim. Aucune étape, aucune table, aucun événement Umami ne le représente. Il faut donc d'abord décider ce qu'est un diagnostic « lancé » et « rendu », et pouvoir le lire dans la base. Sans ça, ni la séquence ni le point du lundi n'ont de quoi compter.
- **Un FEC ou une lecture par connecteur, ce sont des données de client.** La règle multi-tenant interdit de les stocker sans `organizationId`. Le diagnostic se lance donc dans un compte, après `/inscription`. L'endroit naturel est `/bienvenue?etape=factures` (`src/routes/bienvenue.tsx:63`), et jamais un formulaire public.
- **L'hôte de la séquence existe déjà : les conseils de Plume.** On y retrouve la règle pure, le rendez-vous indexé, la tâche planifiée, le créneau, la cadence, la coupure par le profil et la désinscription par POST. Trois verrous de ce circuit bloqueraient toutefois une séquence qui démarre au diagnostic (détail au § 2).

## 1. Ce qui existe

### Tables (`src/lib/convex/croissance/tables.ts`)
- `vSourceVisite` (l.12-26) : canal, page d'entrée, référent, `utm_*`.
- `vEtapes` (l.29-41) : onze dates facultatives.
- `vCleConseil` (l.43-48) : **union fermée** de quatre littéraux.
- `parcoursComptes` (l.51-70) : `source`, `etapes`, `score`, `prochainConseilLe`, avec l'index `by_prochain_conseil`.
- `envoisCroissance` (l.72-77) : `{organizationId, userId, cle, le}`. **Pas d'`emailId` Resend.**
- Préférences du membre, dans `src/lib/convex/schema.ts:241-248` :
  - `conseilsParCourriel` (absent veut dire que les conseils partent) ;
  - `jetonConseils`, avec l'index `by_jeton_conseils` ;
  - `pointDuMatinParCourriel`.

### Étapes : où elles se lisent et ce qui les relève

| Étape | Lue sur (`releve.ts` `etatDuCompte` l.44-110 puis `etapes.ts` `deduireEtapes` l.76-124) | Date notée | Ce qui déclenche le relevé |
|---|---|---|---|
| `INSCRIT` | `org.createdAt` | réelle | `organizations.ts:150-165` (insertion plus `runAfter(0)`) |
| `ENTREPRISE` | SIREN dans `profilsCreancier` | jour du relevé | idem |
| `FACTURES_DEPOSEES` | **seulement** `importsRecouvrement` au statut `TERMINE` (l.56-65) | réelle | `depotMutations.ts` `marquerBilan` l.95-101 |
| `MONTANT_REVELE` | une facture échue non soldée (l.28-42) | jour du relevé | idem, plus la nuit |
| `RELANCES_ACTIVEES` | `pilote.activeLe` | réelle | `pilote.ts` `activerRelances` l.1357 |
| `ESSAI` / `ABONNE` / `RESILIE` / `RECONQUIS` / `MONTEE_EN_GAMME` / `A_RISQUE` | `paddleStatus`, `paddlePlanTier`, `paddleRythme` | jour du relevé | **la nuit seulement** : cron `releveCroissance` à 2 h 30 UTC (`crons.ts:41-45`) |

Les étapes sont consommées par :
- les libellés `LIBELLES_D_UNE_ETAPE` (`etapes.ts:31`) et `LIBELLES_DES_ETAPES` (`semaine.ts:38`), deux `Record<Etape>` exhaustifs : un oubli ne compile pas ;
- le score (`score.ts:26`) ;
- l'entonnoir (`lib/admin/entonnoirs.ts:88`) ;
- l'admin (`admin/comptes.ts:48,87,228`).

### Le circuit des conseils
- **Ce qu'on envoie et quand**, dans la logique pure `src/lib/croissance/conseils.ts` :
  - `REGLES` (l.43-60) définit chaque conseil par `{cle, depart, delai, validite, sauf?}` ;
  - `prochainConseil` (l.62-82) choisit le suivant ;
  - `ECART_MINIMAL_MS = 2 jours` (l.23) s'applique à tout l'établissement ;
  - **`PREMIERES_SEMAINES_MS = 30 j` (l.31)** est vérifié en tête de fonction (l.68) :
    ```ts
    if (inscrit === undefined || maintenant - inscrit > PREMIERES_SEMAINES_MS) return null;
    ```
- **L'envoi**, dans `src/lib/convex/croissance/conseils.ts` :
  - `envoyerLesConseils` (l.173-224) traite des lots de 50, appelé toutes les 15 min par le cron `conseilsCroissance` (`crons.ts:48-53`) ;
  - le créneau vient de `prochainCreneauDEnvoi` (l.204-208 ; défini dans `plan-relance.ts:175`, sur `HEURES_D_ENVOI = {de: 9, a: 18}` l.155, en semaine, heure de Paris) ;
  - sans envoi configuré (`envoiConfigure`, l.48-55), rien n'est noté envoyé et on réessaie dans une heure.
- **`envoyerUnConseil`** (l.98-171) :
  - les destinataires viennent de `destinatairesDesConseils` (l.36-46), qui **ne filtre pas sur le rôle** ;
  - le jeton est tiré au premier envoi (l.141-146) ;
  - l'en-tête `List-Unsubscribe` et `List-Unsubscribe-Post: One-Click` sont posés (l.163-167) ;
  - sans destinataire, le conseil est noté avec `userId: ''` pour que la cadence avance.
- **La désinscription** : `desinscriptionConseils` (l.254-265), branchée en GET et en POST dans `http.ts:49-50`. Un GET montre seulement une page ; seul le POST désinscrit, par `desinscrire` (l.227-239).
- **Le réglage dans le profil** : `croissance/reglage.ts` (`mesConseils`, `reglerMesConseils`), affiché dans `routes/app/compte.tsx:100-104,622`.

### Les modèles d'e-mail
- **La coquille commune** `emails/modeles/disposition.ts` :
  - `BlocEmail` (l.53-82) ;
  - le texte du lien de désinscription est **écrit en dur**, « Ne plus recevoir les conseils de Plume » (l.218 pour le HTML, l.299 pour le texte).
- **Les conseils**, `emails/modeles/conseils.ts` :
  - `OBJETS: Record<CleConseil>` (l.33-38) et le `switch` sans `default` de `corpsDuConseil` (l.44-125) : une clé ajoutée sans son texte ne compile pas ;
  - `ce-qui-vous-est-du` (l.78-110) donne le principal et l'indemnité, « hors pénalités de retard ».
- **Le point du lundi**, `emails/modeles/pointDuLundi.ts` : `DonneesPoint` (l.10-23), `bloc` (l.25-54).
- **L'essai de tous les e-mails** dans une vraie boîte, `emails/essai.ts` `lesEssais` : boucle sur `CLES_CONSEILS` (l.176-199) et point du lundi (l.201-219).
- **L'aperçu local**, `scripts/apercu-emails.ts` : boucle sur `CLES_CONSEILS` (l.124-142). **Le point du lundi en est absent.**

### Le point du lundi (`src/lib/convex/croissance/point.ts`)
- `vChiffres` (l.23-29) est le validateur de retour, **strict**.
- `chiffresDeLaSemaine` (l.33-78) lit `parcoursComptes.take(5000)` puis appelle `compterParSource` (`semaine.ts:13-35`). Il compte les étapes atteintes dans une fenêtre, par source du compte ; il ne fait **aucune cohorte**.
- `envoyerLePoint` (l.87-119) envoie à `FONDATEUR_EMAIL`, tous les lundis à 5 h UTC (`crons.ts:65-70`). Ça fait 6 h à Paris à partir du 25/10.

### Source et Umami
- **La source** :
  - l'amorce `AMORCE_SOURCE` (`app/source-visite.ts:18`, posée dans `__root.tsx:98`) note la première page de l'onglet dans `sessionStorage` ;
  - elle est lue par `lireSourceDeLaVisite` au moment de `createOrganization` (`bienvenue.tsx:334`), donc à l'étape « entreprise », pas à `/inscription` ;
  - le serveur la borne avec `lireSource` (`croissance/source.ts:35-67`) dans `organizations.ts:155`.
- **Umami** :
  - `suivre()` et la liste fermée `EvenementProduit` sont dans `app/analytique.ts:74-104` ;
  - **`'data-exclude-search': 'true'` (l.58)** : Umami ne voit jamais les paramètres `utm_*` et ne peut attribuer aucune campagne ;
  - `traficDuSite` (`croissance/umami.ts:22-41`) ne lit que `/stats` (visiteurs et pages vues) ;
  - **le calculateur public (`marketing/calcul.tsx`) n'émet aucun événement.**

### Le modèle à imiter pour un rappel daté : `abonnementRappels.ts`
- `rappelsDus` (`paiement/rappels.ts:52-85`) fabrique une clé datée, `essai-7:2026-11-13` (l.63), notée dans `org.rappelsAbonnement` : jamais deux fois.
- Le rappel ne part qu'aux `ORG_ADMIN` (l.95) et relit l'état au moment d'envoyer (l.85).
- Ce sont des e-mails transactionnels, sans lien de désinscription (`envoyerLesEmails`, l.147-177).

## 2. La séquence du diagnostic express

### 2.1 Rendre le diagnostic lisible dans l'état
1. **Une source de vérité dans la base.**
   - Le plus propre : une table `diagnostics` (`organizationId`, `lanceLe`, `renduLe`, la période, les montants), dans `src/lib/convex/recouvrement/tables.ts`.
   - Elle porte des montants, donc elle va dans `recouvrement/` : **l'admin ne doit pas la lire** (`admin-tables.test.ts:18-42`).
   - Autre option : un champ `genre: 'DIAGNOSTIC'` sur `importsRecouvrement`.
2. **Deux étapes**, `DIAGNOSTIC_LANCE` et `DIAGNOSTIC_RENDU`, à ajouter :
   - dans `ETAPES` (`etapes.ts:11`) et `vEtapes` (`tables.ts:29`) : ajouter un champ facultatif ne casse pas le déploiement ;
   - dans les deux tables de libellés ;
   - dans `EtatDuCompte` (`etapes.ts:49`), lu dans `etatDuCompte` (`releve.ts:44`) ;
   - éventuellement dans `ETAPES_DES_COMPTES` (`entonnoirs.ts:88`) et `POIDS_DES_ETAPES` (`score.ts:26`).
3. **`MONTANT_REVELE` n'est pas « diagnostic rendu ».** Il n'est noté que s'il existe une facture échue impayée. Un diagnostic qui trouve 0 € de principal, mais des pénalités sur des factures payées en retard, doit quand même produire son rapport.
4. **Relever à la fin d'une lecture par connecteur.** Aujourd'hui, `import.ts:415` ne programme que `pilote.relireApresImport`. Ni `qontoDonnees.terminerSynchro` (l.233) ni `nangoDonnees.noterPage` (l.270) n'appellent `releverLesEtapes`. Et `premierDepotLe` ignore les connecteurs. Conséquence actuelle : un compte branché seulement à Qonto ou Nango n'atteint jamais `FACTURES_DEPOSEES` et reçoit quand même « Il me manque vos factures ».

### 2.2 Le rapport immédiat : un e-mail transactionnel, hors du circuit des conseils
- **D'où il part** : de la mutation qui pose `renduLe`, comme `marquerBilan` le fait pour le relevé, par un `runAfter(0)` vers une `internalMutation` dédiée.
- **Il n'attend pas le créneau et ignore `conseilsParCourriel`** : c'est la réponse à un geste du gérant, comme l'e-mail de vérification. Il ne porte donc pas `desinscription`.
- **Il se note dans `envoisCroissance`** sous une nouvelle clé, par exemple `rapport-diagnostic`. `ECART_MINIMAL_MS` comptera alors les rappels à partir de lui.
- **Les chiffres viennent du moteur**, jamais du modèle : `revelationInterne` (`recouvrement/revelation.ts:324-329`) donne le principal, les intérêts, les indemnités et le total. Ils sont passés déjà formatés au modèle, comme `du` dans les conseils.
- **Le texte** vit dans un modèle nouveau, par exemple `emails/modeles/diagnostic.ts`, sur `coquilleHtml` et `coquilleTexte`. Il faut l'ajouter à `essai.ts` et `apercu-emails.ts`.
- **Il fait doublon avec `ce-qui-vous-est-du`**, qui part au même moment. Ajouter `sauf: 'DIAGNOSTIC_RENDU'` à cette règle.

### 2.3 Les deux rappels pendant les 14 jours : dans le circuit des conseils, avec trois verrous à lever
- **Verrou 1 : `PREMIERES_SEMAINES_MS` (l.31 et l.68).** Un compte Découverte inscrit en septembre qui lance un diagnostic en novembre n'aurait aucun rappel, parce que la fonction rend `null` d'entrée. Il faut passer d'une garde globale à une garde par règle : les règles d'accueil gardent la borne sur `INSCRIT`, celles du diagnostic sont bornées par leur propre `validite`.
- **Verrou 2 : `sauf` n'accepte qu'une étape (l.40 et l.75).** L'offre doit s'éteindre sur `ESSAI` **ou** `ABONNE` : sans essai, comme le permet `essaiUtilise`, on passe directement à `ABONNE`. Passer à `sauf?: readonly Etape[]`.
- **Verrou 3 : `releverLesEtapes` réécrit `prochainConseilLe` à chaque passage** (`releve.ts:205` et l.213), et l'envoi le recalcule aussi (`conseils.ts:194,215`). Toute nouvelle famille de règles doit donc passer par **la même fonction**, sinon le relevé de la nuit efface son rendez-vous.
- **La durée de l'offre est une constante**, par exemple `JOURS_OFFRE_DE_BIENVENUE = 14` dans `src/lib/config/tarifs.ts`, à côté de `DUREE_ESSAI_JOURS` (l.243). Les règles et le texte la lisent tous les deux. `src/lib/croissance` peut importer `config/` : le test de frontière n'interdit que `verticales/` et `convex/`.
- **Les délais** : départ sur `DIAGNOSTIC_RENDU`. Premier rappel avec `delai` de 7 j et `validite` de 11 j ; second avec `delai` de 11 j et `validite` de 13 j. Si le créneau repousse un rappel au-delà de `fin`, le passage suivant l'écarte (`maintenant > fin`, l.78) : **aucun rappel ne part le jour où l'offre a expiré ni après.**
- **Les destinataires** : les rappels parlent d'un achat. Les filtrer sur `ORG_ADMIN`, comme `abonnementRappels.ts:95`.
- **Ce qui est déjà en place pour ces rappels** :
  - le créneau ;
  - la cadence de 2 jours ;
  - la coupure par le profil ;
  - le lien qui ne désinscrit qu'en POST ;
  - `List-Unsubscribe` ;
  - l'expéditeur « Plume de Letikette » ;
  - le pied légal (`LEGAL_CONFIG`).

  Il reste à **relire l'état d'abonnement au moment d'envoyer** (piège n° 2).

### 2.4 Fichiers touchés, dans l'ordre
1. `croissance/etapes.ts`, `croissance/tables.ts` (`vEtapes`, `vCleConseil`).
2. `croissance/conseils.ts` : garde par règle, `sauf` en tableau, nouvelles règles.
3. `convex/croissance/releve.ts` : `etatDuCompte`.
4. `convex/croissance/conseils.ts` : données de chaque clé, filtre sur le rôle.
5. `emails/modeles/conseils.ts` : `OBJETS`, `corpsDuConseil`.
6. Nouveau `emails/modeles/diagnostic.ts`.
7. `screens/admin/fiche-compte.tsx:53-58` : `NOMS_DES_CONSEILS` est un `Record<string,string>`, **non exhaustif**. Sans ajout, l'admin affiche la clé brute (l.108).
8. `essai.ts`, `apercu-emails.ts`.
9. `docs/juridique/03-politique-de-confidentialite.md:184` : la politique annonce « quatre au plus ». Il faut une version 2.9 qui ajoute la finalité de l'offre de bienvenue avec opposition. La spécification du moteur (`2026-10-16-moteur-de-croissance-design.md:213-214`) disait aussi « aucune prospection ne part par ce moteur » : une offre commerciale élargit ce cadre, c'est à acter.
10. **Paddle n'a aucune gestion de remise** : une recherche de `discount` ne renvoie rien. Le bouton « Commencer » des rappels suppose une remise Paddle (`discountId` dans `Checkout.open`, `caisse-paddle.ts:125-127`) et le catalogue (`paddleCatalogue.ts`). C'est une dépendance, hors de cette mission.

## 3. Le compte à rebours jusqu'au 31 décembre

### Deux publics, deux circuits
- **Les prospects, fournisseurs publics trouvés dans les DECP : aucun envoi automatique.** La stratégie le dit noir sur blanc (`2026-10-16-strategie-de-croissance.md:265`) : « Envoyer de la prospection par Resend ou depuis letikette.com » fait partie de ce que la machine ne fera jamais. Tout passe par le CRM, qui n'envoie rien :
  - un `Modele` `'PUBLIC'` dans `crm/modeles.ts:32`, avec sa campagne dans `campagneDe` et `PAGES_DES_CAMPAGNES` (l.97-102) ;
  - `SUITE_DES_ETAPES` (l.48-55) recalé sur la date butoir ;
  - `emailEcrit` (`admin/historique.ts:103-143`) refuse déjà un prospect au statut `STOP` (l.114).
  - `PIED_LEGAL` (l.188-189) dit « annuaire public des entreprises » ; une source DECP demande un autre pied et un `trouveOu`. L'audit relève aussi la réserve de la CNIL sur les adresses tirées d'annuaires : ce n'est pas de mon ressort de trancher, mais à faire valider.
- **Les comptes clients : préférer l'alerte produit à un e-mail de croissance.**
  - Repérer un « fournisseur public » à partir de ses débiteurs, c'est se servir des données d'un client pour cibler une offre. La politique l'exclut : « Les données des clients ne servent à aucune prospection commerciale ni à aucun profilage publicitaire » (l.192-194).
  - La voie propre est la surveillance : `surveillance.ts` émet déjà `PRESCRIPTION_PROCHE` (l.473) avec `PREAVIS.PRESCRIPTION = 90` (l.160), qui alimente le point du matin et les notifications.
  - Il manque deux choses : un régime « personne publique » dans `REGIMES_PRESCRIPTION` (`pays/france/prescription.ts:79`), et la surveillance des **intérêts sur des factures déjà soldées**. Aujourd'hui, seules les factures dont le principal reste dû remontent (l.463-465).
  - Un e-mail de croissance « compte à rebours » vers un compte ne doit partir que sur un signal **déclaré** : une réponse dans `/bienvenue`, ou une campagne d'inscription (`source.utmCampaign === 'public'`).

### La date butoir est calculée, jamais tapée
- **Rien n'existe encore pour les acheteurs publics** : une recherche de `68-1250`, `moratoire` ou `quadriennal` dans `parametres.ts` et `pays/france/` ne renvoie rien. Il faut y relever la prescription de quatre ans et le taux des intérêts moratoires, avec leur source, puis **calculer** le 31/12.
- **Le piège de la frontière** : `src/lib/croissance/` ne peut pas importer `verticales/` (`croissance/__tests__/frontiere.test.ts:23`). La date se calcule dans `convex/croissance/` et se passe en paramètre à la règle pure, comme `etapes`.

### Une famille de règles au calendrier
- Elle a un `depart` absolu (la butoir moins N jours) au lieu d'une étape. Exemples : `butoir-6-semaines`, `butoir-2-semaines`, `butoir-derniere-semaine`.
- **Ces clés reviennent chaque année** (le 31/12/2027 vaudra pour les intérêts de 2023). Or `envoyes.some(x => x.cle === r.cle)` (l.72) bloque une clé pour toujours. Deux solutions : un champ `butoir` ou `annee` dans `envoisCroissance`, ou des clés datées comme `rappelsAbonnement`. Mais `vCleConseil` est une union fermée.
- Elle doit, elle aussi, passer par la fonction unique appelée par `releve.ts:205` (verrou 3).

## 4. Le point du lundi : diagnostics lancés par source, et les ventes qu'ils produisent

- **La logique pure**, dans `src/lib/croissance/semaine.ts` : une fonction à côté de `compterParSource`, par exemple `diagnosticsParSource(parcours, debut, fin)`, qui rend par source :
  - les diagnostics lancés, c'est-à-dire `DIAGNOSTIC_LANCE` dans `[debut, fin)` ;
  - les **ventes rattachées**, c'est-à-dire `ESSAI` ou `ABONNE` dans la fenêtre **et** postérieurs à `DIAGNOSTIC_RENDU`. Il faut une cohorte, ce que `compterParSource` ne sait pas faire.
- **Le branchement** :
  - `point.ts` : étendre `vChiffres` (l.23-29), sinon la requête échoue sur un champ en trop, puis `chiffresDeLaSemaine` (l.33-78) ;
  - `pointDuLundi.ts` : `DonneesPoint` (l.10-23) et `bloc`, avec deux rangées (« Diagnostics express lancés », « Ventes après un diagnostic ») et une phrase par source ;
  - `essai.ts:202-219` : les données de démonstration, que le compilateur réclamera.
- **Quelle source compter** :
  - `parcoursComptes.source` est celle de l'**inscription**. Pour un compte ancien qui lance un diagnostic, elle sera vieille.
  - Mieux : un champ `sourceDuDiagnostic: v.optional(vSourceVisite)`, rempli au lancement par `lireSourceDeLaVisite()` puis `lireSource` côté serveur, avec repli sur `source`.
- **La date des ventes est approximative** :
  - `ESSAI` et `ABONNE` sont datés au relevé de la nuit ; le webhook Paddle ne relève rien.
  - Un `runAfter(0, internal.croissance.releve.releverLesEtapes)` juste après le `patch` de `paddle.ts` `upsertSubscription` (l.316-330) donne la vraie date. Il coupe aussi les rappels le jour même de l'achat.
- **Les ventes hors Paddle sont invisibles** : réclamation clé en main, diagnostic complet, pilote. Seuls `paddleStatus` et `prixPaddle` sont lus. Il faudrait des prix Paddle dédiés ou une marque dans le CRM.
- **Le point du lundi refuse tout « € »** (`pointDuLundi.test.ts:98`, `expect(html).not.toMatch(/€/)`). Des ventes exprimées en euros feraient tomber ce test : soit on reste en nombres, soit on relâche le test en le décidant.
- **Umami ne peut pas compter par source** : `data-exclude-search` retire les `utm_*`. La source viendra donc du produit.
  - On peut ajouter `'diagnostic-lance'`, `'diagnostic-rendu'` et `'calcul-fait'` (ce dernier dans `marketing/calcul.tsx`) à `EvenementProduit`, sans montant ;
  - et les lire dans `umami.ts` par l'API des métriques d'événements, pour compter aussi les diagnostics commencés par des visiteurs qui n'ont pas fini.

## 5. Pièges

1. **Le suivi des clics de Resend, s'il était activé sur le domaine d'`AUTH_EMAIL`.** Les relances au débiteur partent de ce domaine tant que `RELANCES_EMAIL` n'est pas posé. Activer le suivi suivrait des débiteurs, en violation de la règle des surfaces qui partent vers un tiers. Pour mesurer, stocker l'`emailId` que rend `resend.sendEmail` dans `envoisCroissance` (nouveau champ facultatif), et compter les conversions par étapes.
2. **L'envoi lit les étapes figées du parcours** (`conseils.ts:194`). Un rappel peut partir l'après-midi même d'un abonnement si le relevé n'a pas eu lieu. Il faut le hook Paddle (§ 4), ou relire `paddleStatus` de l'établissement avant d'envoyer, comme `abonnementRappels.rappeler` l.85.
3. **« Offre fondateurs : prix garanti à vie » ne peut pas s'écrire.** `/garanti/i` est balayé dans `src/lib/convex/emails` et `src/lib/croissance` (`mots-interdits.test.ts:29-41`). De même, `/éligible/i` est interdit dans tout `src/lib/convex` (`aucun-verdict.test.ts:37`, périmètre l.22-28) : « vous êtes éligible à l'offre » ne passe pas.
4. **`lexique.test.ts` ne balaie pas `src/lib/convex/emails/modeles`** (périmètre l.19-51). Un « prescription » ou un « intérêts moratoires » écrit dans un rappel passerait sans alerte. Il faut l'étendre en exemptant nommément `modeles/relance.ts` (document transmis), ou poser les phrases dans `src/lib/croissance`, qui est balayé.
5. **Une nouvelle table hors des six fichiers lus par `purge-complete.test.ts:43-50`** (`recouvrement/`, `risque/`, `croissance/`, `admin/`, `support/tables.ts`, `schema.ts`) échappe au contrôle de la purge. Il faut aussi l'ajouter dans `rgpd.ts`, à l'appel `viderParIndexOrg` (vers l.735) et au type union (vers l.999).
6. **`crons.ts`** :
   - `rappelsAbonnement` est déclaré **après** `export default crons` (l.151 puis l.158-163) : ça marche parce que le même objet est modifié, mais c'est à ne pas recopier ;
   - le commentaire du point du lundi (l.55-56) est collé au-dessus d'`effacementProspects` ;
   - **aucun cron nouveau n'est nécessaire** : `conseilsCroissance` (toutes les 15 min) et `releveCroissance` (la nuit) suffisent si tout passe par `prochainConseilLe`.
7. **Le texte de désinscription est en dur dans la coquille** (`disposition.ts:218,299`). Si l'offre ou le compte à rebours ont leur propre opposition, il faut paramétrer ce libellé dans `BlocEmail`.
8. **`SECTEURS_PUBLICS` (`marketing/secteurs.ts:23`) veut dire « pages publiées »**, pas « secteur public ». Une page « fournisseurs publics » prête à confusion avec ce nom.
9. **La source est saisie à la création de l'établissement** (deuxième étape de `/bienvenue`), dans le `sessionStorage` de l'onglet. Un inscrit qui revient plus tard dans un nouvel onglet est compté en « Directe ».

## 6. Tests concernés

- **À étendre** :
  - `src/lib/croissance/__tests__/croissance.test.ts` : garde par règle (un compte ancien qui lance un diagnostic reçoit ses rappels, mais pas « bienvenue ») ; `sauf` multiple ; aucun rappel après J+14 même repoussé par un week-end ; la fonction de cohorte du point.
  - `src/lib/convex/__tests__/conseilsCroissance.test.ts` : un `ORG_MEMBER` ne reçoit pas l'offre ; le rapport part hors créneau ; un compte abonné entre-temps ne reçoit rien.
  - `src/lib/convex/emails/__tests__/conseils.test.ts` : chaque clé a son objet, son bouton et son lien de désinscription ; pour le rapport, aucun lien de désinscription.
  - `src/lib/convex/__tests__/pointDuLundi.test.ts` : compte des diagnostics et des ventes par source ; garder ou relâcher le test « pas d'€ ».
  - `src/lib/convex/__tests__/releveCroissance.test.ts` et `crmReleve.test.ts` : les nouvelles étapes, et le relevé après une lecture Qonto ou Nango.
  - `src/lib/crm/__tests__/modeles.test.ts` : le modèle `PUBLIC`.
- **Barrières qui tomberont si on se trompe** :
  - `croissance/__tests__/frontiere.test.ts` (calcul de la butoir hors de `croissance/`) ;
  - `purge-complete.test.ts` et `rgpd.test.ts` ;
  - `admin-tables.test.ts` (ne pas faire lire `diagnostics` par l'admin) ;
  - `mots-interdits.test.ts` et `aucun-verdict.test.ts` ;
  - `lexique.test.ts`, une fois son périmètre étendu ;
  - `emails/__tests__/produit.test.ts` (échappement, couleurs de seuil).
- **À ne pas oublier** : `app/__tests__/source-visite.test.ts` si l'amorce change, et `paiement/__tests__/rappels.test.ts` comme modèle pour des clés datées.