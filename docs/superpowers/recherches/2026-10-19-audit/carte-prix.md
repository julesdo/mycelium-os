# Carte : prix, formules, Paddle et limites (au 19/10/2026)

Je n'ai modifié aucun fichier. J'ai lu l'audit en entier et le code concerné, et j'ai interrogé la base de développement en lecture seule.

## 0. Ce qui existe aujourd'hui

- **Déploiement de développement (`knowing-bee-911`, bac à sable Paddle).** La table `prixPaddle` contient les 12 prix de la grille actuelle. Par exemple `equipe-annuel` vaut 39000 centimes et `pro-mensuel` 11900. Deux abonnements de test existent, tous deux en Équipe à l'année : l'un à l'essai sur `pri_01m4xj5r9jr1wby511kemvtj0k`, l'autre actif sur `pri_01m4xhya0j2htm11e74yev6b48`.
- **Production : non vérifié.** L'outil Convex refuse la lecture de la production. D'après `serveurs/paddle/LISEZMOI.md` (lignes 114-117) et la mémoire du 14/10, la facturation reste fermée tant que `PADDLE_FACTURATION_OUVERTE` n'est pas posée. Pour s'en assurer : `npx convex run --prod paddleCatalogue:catalogue` (lecture seule), puis compter les établissements qui portent un `paddleSubscriptionId`. **S'il n'y a aucun abonné en production, la question des anciens abonnés ne concerne que le bac à sable.**

## 1. Équipe à 59 €, Pro à 149 € (deux mois offerts)

### Où se change la grille

- `src/lib/config/tarifs.ts` lignes 47-66, `GRILLE` :
  - `equipe` passe de `mensuel: 39, annuel: 390` à `59 / 590` ;
  - `pro` passe de `119 / 1190` à `149 / 1490`.
- `moisOfferts()` (lignes 72-75) donne toujours 2.

### Ce qui suit tout seul (ces fichiers lisent `GRILLE`)

- Le site : `marketing/tarifs.tsx` (ligne 185), `marketing/secteurs.ts` (ligne 229), `routes/llms[.]txt.ts` (ligne 35).
- L'aide : `lib/support/articles.ts` (lignes 82 et 190).
- Le préavis d'ouverture : `ouvertureFacturation.ts`, `texteDuPreavis` (lignes 34-43).
- Les écrans : `ui/choix-formule.tsx` (lignes 89 et 200), `ui/gestion-formule.tsx` (lignes 88 et 242), `screens/compte/gestion-formule.tsx` (ligne 102), `screens/compte/facturation.tsx` (lignes 185-189).
- Les rappels : `paiement/rappels.ts` (ligne 113).
- Le catalogue attendu : `paiement/paddle.ts`, `catalogueAttendu` (lignes 365-386).

### Le piège principal : le catalogue ne crée rien, et la caisse vend l'ancien prix

1. Les étiquettes ne contiennent pas de version : `etiquetteDuPrix` renvoie ``${formule}-${rythme}${essai ? '-essai' : ''}`` (`paiement/paddle.ts` lignes 339-341).
2. Avec la nouvelle grille, le catalogue retrouve l'ancien prix sous la même étiquette et le classe en `ecart` (`paddleCatalogue.ts` lignes 117-127).
3. Il ne crée donc rien et ne range rien : seules les lignes `existant` ou `cree` sont rangées (lignes 159-175).
4. Les anciennes lignes restent dans `prixPaddle`, et `caisse` les sert, puisqu'elle cherche par étiquette (`convex/paddle.ts` lignes 156-167).

**Résultat : le site affiche 59 € et Paddle prélève 39 €.**

Il faut des étiquettes versionnées, par exemple `equipe-mensuel-essai@g2`. Le catalogue crée alors de nouveaux prix, et `rangerLesPrix` (lignes 231-243) garde les anciennes lignes : il ne supprime qu'une ligne de même étiquette.

**Il ne faut jamais supprimer une ancienne ligne de `prixPaddle`.** Trois lectures par identifiant de prix en dépendent :

- `upsertSubscription` y retrouve la formule (lignes 305-312) ;
- `rattacherLePaiement` aussi (lignes 399-405) ;
- `_abonnementCourant` y lit `prixAvecEssai` (lignes 806-817). Sans la ligne, un changement de formule pendant l'essai ferait perdre l'essai.

Ne jamais éditer un prix Paddle existant non plus (LISEZMOI lignes 155-158).

### Les anciens abonnés se verraient annoncer le mauvais montant

Le montant annoncé est recalculé depuis la grille, et non lu sur le prix souscrit :

- `screens/compte/facturation.tsx` lignes 252-255 : le montant du prochain prélèvement ;
- `paiement/rappels.ts` ligne 113, appelé par `abonnementRappels.ts` ligne 89 : les rappels à J-7 et J-2, et le préavis de renouvellement à l'année trente jours avant.

Un abonné resté à 39 € recevrait « 590 € HT ». Il faut lire `prixPaddle.montant` à partir de `org.paddlePrixId`, via l'index `by_prix`.

Faire passer ces abonnés au nouveau prix demande un appel à l'API Paddle (PATCH de l'abonnement) et un préavis de trente jours (article 16 des conditions générales, `docs/juridique/02-conditions-generales.md` lignes 415-421). Les conditions ne contiennent aucun montant (article 7.1, lignes 210-212) : elles n'ont pas à changer pour le prix lui-même.

### Tests

| Test | Ce qui se passe |
| --- | --- |
| `src/lib/paiement/__tests__/rappels.test.ts` ligne 69, `toContain('390 € HT')` | Casse : le montant devient 590 € |
| `src/lib/paiement/__tests__/paddle.test.ts` ligne 228, `'equipe-annuel-essai'` | Casse si les étiquettes sont versionnées |
| Même fichier, ligne 221, `toHaveLength(12)` | Casse si des offres entrent dans `catalogueAttendu` |
| `src/lib/convex/__tests__/paddleInscription.test.ts` lignes 28-36 | Jeu d'essai à compléter si `prixPaddle` gagne un champ obligatoire |
| `billing.test.ts` lignes 14-29 | Reste vert |
| `paddle.test.ts` lignes 212-218 | Reste vert |
| `lib/support/__tests__/articles.test.ts` lignes 20-21 | Reste vert |

### Prix écrits à la main

- `CLAUDE.md` ligne 544 ;
- `docs/croissance/phase-manuelle.md` ligne 173 ;
- `src/routes/-salle/compte.tsx` ligne 688 (valeur de démonstration `ensuite: 11900`) ;
- la mémoire `project_paiement_paddle.md`.

### Droits de la clé d'API Paddle

LISEZMOI lignes 50-52 ne cite que la lecture des abonnements. Or `changerDeFormule` fait déjà un PATCH sur l'abonnement : la clé doit pouvoir écrire les abonnements. La section 3 ajoute aussi l'écriture des transactions et des remises.

## 2. Découverte limitée à trois mois d'historique

### Textes à reprendre

- `marketing/tarifs.tsx` lignes 117-120 et 154-157 : « sans limite de temps » ;
- `tarifs.ts` lignes 173-176, première ligne de `CE_QUI_EST_INCLUS` : `decouverte: true` doit devenir « 3 derniers mois » ;
- `faq.tsx` ligne 88 ;
- `appel.tsx` ligne 39, `hero.tsx` ligne 40, `page-secteur.tsx` ligne 17, `secteurs.ts` ligne 229 ;
- `routes/tarifs.tsx` ligne 13 ;
- `inscription.tsx` ligne 118 : « Votre bilan offert » ;
- `support/articles.ts` lignes 102 et 190 ;
- conditions générales, article 7.1 (lignes 200-201) : « déposer et lire ses factures et voir ce qui est dû » ;
- `docs/juridique/05-remboursement.md`, section 3.

**La doctrine écrite dans le code dit le contraire.** `limites.ts` lignes 23-24 : « Une limite atteinte arrête ce qui PART, jamais ce qui se LIT ». Cette phrase doit changer, et le fondateur doit le décider.

### Le mécanisme

Ajouter `historiqueMois: number | null` à `Limites` (`tarifs.ts` lignes 94-112) : 3 pour Découverte, `null` pour les formules et pour `limitesDe('dev')` (lignes 147-158). On le lit par `limitesDeLOrganisation` (`limites.ts` lignes 27-34).

### Où appliquer la limite

**A. À l'entrée des factures : déconseillé.** Toutes les factures passent par un seul point, `recouvrement/import.ts` (`enregistrerImport`, lignes 173-288 ; l'insertion est à la ligne 258). Ses trois appelants sont `depot.ts` (ligne 299), `connexions/qonto.ts` (ligne 320) et `connexions/nango.ts` (ligne 162).

Le problème : les connecteurs ne relisent que ce qui a changé depuis leur dernier passage.

- Qonto : `filter[updated_at_from]` posé sur le curseur (`qonto.ts` lignes 304-305 et 364) ;
- QuickBooks et Xero : `socle/connecteurs/nango/lecteurs.ts` lignes 239-241 et 302-305.

Une facture écartée à l'entrée ne reviendrait jamais, même après souscription, à moins de remettre les curseurs à zéro. Et ce serait effacer des données.

**B. Au calcul : recommandé.** On garde tout en base, et on écarte en lecture ce qui précède une date plancher, en le comptant. Le compte sert d'argument de vente : « N factures plus anciennes : le diagnostic complet les chiffre ».

- **Le chiffre principal** : `revelation.ts`, `facturesPour` (lignes 119-175). Il y a déjà un filtre au même endroit, celui des dossiers classés. Ce chiffre alimente l'accueil (`routes/app/index.tsx` ligne 248), la page `/app/revelation` (lignes 26-27) et les premiers pas (`bienvenue.tsx` lignes 407 et 806).
- **« Ce qui est dû »** : `lecture.ts`, `facturesDe` (lignes 174-179), `listerDebiteurs` (ligne 188), `listerFacturesDuDebiteur` (lignes 245-260).
- **Ce que lisent les assistants** : la conversation de Plume (`conversationEtablissement.ts`, `conversationLecture.ts`) et Plume support (`support/contexte.ts`).
- **Ampleur** : la table est lue à une cinquantaine d'endroits dans une trentaine de fichiers, dont 7 dans `pilote.ts`. Il faut une seule fonction qui donne la date plancher, et un test de balayage, sinon on en oubliera.
- **Date de référence** : `dateEmission`, qui a déjà l'index `by_org_and_emission` (`recouvrement/tables.ts` ligne 688).

### Ce que coûte la lecture par le modèle

Seul le PDF ou l'image sans Factur-X part au modèle : `depot.ts` lignes 172-182 (`extraireAvecClaude`), appelé aux lignes 270-280. La date de la facture n'est connue qu'après cette lecture. Le FEC, le CSV, le Factur-X et les connecteurs ne coûtent rien.

Pour limiter le coût, il faut une autre limite (un nombre de lectures par mois pour Découverte), vérifiée dans `traiterImport` avant la ligne 270.

### Trois décisions à prendre

1. **L'essai peut tuer le diagnostic payant.** Un compte à l'essai compte comme une formule (`billing.ts` lignes 96-98). Sans changement, trente jours d'essai gratuits montrent les cinq ans d'historique, ce que le diagnostic complet vend 290 €. C'est le même défaut que la spec du 14/10 reprochait au « premier bilan » (spec ligne 39).
2. **Le diagnostic express par Pennylane est fermé à Découverte.** `LIMITES.decouverte.logiciels` vaut `'qonto'` (`tarifs.ts` ligne 120), et la connexion le refuse (`nango.ts` lignes 328-333). L'audit veut « Pennylane ou Qonto, sinon un FEC ».
3. **Les comptes Découverte existants perdraient la vue de leurs factures plus anciennes.** C'est une modification substantielle : préavis de trente jours (article 16), sur le modèle de `ouvertureFacturation:prevenir`.

## 3. Achats ponctuels et offres

### Le code sait-il gérer un achat ponctuel ?

**Il sait le lire, mais l'écarte aussitôt.**

- `lireEvenement` lit un paiement sans abonnement (`paiement/paddle.ts` lignes 250-263, testé dans `paddle.test.ts` lignes 169-186).
- Le rappel ne le traite que s'il porte un abonnement (`convex/paddle.ts` lignes 512-526) : un achat ponctuel est donc ignoré.
- L'ancien chemin du « premier bilan » payé une fois (`enregistrerBilan`, `estUnPrixDeBilan`) a été retiré dans le commit `1007a40`. On peut le relire avec `git show 1007a40^:src/lib/convex/paddle.ts`.

Ce qui bloque, point par point :

- **Le catalogue n'accepte que des abonnements.** Le cycle est obligatoire dans `PrixAttendu` (ligne 353), et `ecartsDuPrix` signale un « paiement unique » comme un écart (lignes 410-419).
- **La table des prix exige une formule.** `prixPaddle` exige `formule` et `rythme` (`schema.ts` lignes 126-137), comme le validateur de `rangerLesPrix` (`convex/paddle.ts` lignes 219-230). Le type `CleDePrix` (ligne 94) ne connaît que formule et rythme.
- **Un abonné ne pourrait rien acheter en plus.** `caisse` répond « pas prêt » dès qu'un abonnement est vivant (lignes 143-148). Il faut une autre caisse pour les achats, par exemple `caisseAchat`.

### Et une remise Paddle ?

**Rien n'existe.** Aucune remise dans le code, et `Checkout.open` (`app/caisse-paddle.ts` lignes 125-135) ne transmet que les articles, les données scellées et le client. Paddle.js 1.6.5, déjà installé, accepte `discountId`, `discountCode` et `transactionId` (`node_modules/@paddle/paddle-js/types/checkout/checkout.d.ts` lignes 74-108).

La remise d'un abonnement n'est pas lue non plus. Les rappels et l'écran Abonnement annonceraient donc 59 € pendant que Paddle prélève 47,20 €.

### Diagnostic complet à 290 €

- Un prix à paiement unique dans le catalogue, avec une catégorie fiscale adaptée : les produits sont créés en `tax_category: 'saas'` (`paddleCatalogue.ts` ligne 102).
- Une table d'achats avec `organizationId`. Elle doit alors figurer dans `rgpd.ts`, sinon `purge-complete.test.ts` échoue.
- Une branche dans le rappel, qui ne compte jamais deux fois le même achat (clé : l'identifiant de transaction).
- Ce que l'achat débloque : un champ sur l'établissement (historique complet), lu par la fonction de date plancher de la section 2.
- **« Remboursé sous 2 900 € identifiés » n'est pas géré.** Aucun événement `adjustment.*` n'est écouté (`EVENEMENTS_ECOUTES`, lignes 161-170) : le remboursement se ferait à la main dans Paddle.
- La politique de remboursement (30 jours sur tout paiement) contredit un diagnostic livré immédiatement. Il faut un article pour les services ponctuels dans les conditions (7.1 et 7.2 ne parlent que de l'abonnement) et dans `05-remboursement.md`.

### Réclamation clé en main : 5 % entre 290 et 2 000 €

- Le montant varie : aucun prix du catalogue ne convient. Le serveur crée la transaction avec un prix calculé (POST `/transactions`, via `appelerPaddle`, lignes 603-625), avec les données scellées. Le navigateur ouvre ensuite `Checkout.open({ transactionId })`.
- La base de calcul doit être un décompte daté : `daterLeDecompte` (`decompte.ts` ligne 440). On garde l'identifiant du décompte, on calcule en centimes `bigint`, et on borne entre 29000 et 200000.
- Le barème public (taux BCE majoré de 8 points) n'existe pas encore dans le moteur.
- À vérifier auprès de Paddle : sa politique d'usage pour un service fait à la main.

### Offre fondateurs : Pro à l'année, 1 490 €

- **1 490 €, c'est exactement le nouveau Pro à l'année.** Lancée avant le changement de grille, l'offre coûterait plus cher que le Pro à l'année affiché (1 190 €). Sa seule valeur réelle est le prix bloqué et la mise en route.
- Il faut un prix distinct, par exemple `pro-annuel-fondateurs`, pour compter les fondateurs et ne jamais les faire migrer.
- La caisse vérifie la date (31/12, heure de Paris) et les 50 places. Rien n'indexe `paddlePrixId` : on compte en parcourant l'index `by_paddle_status` (`schema.ts` ligne 116).
- **Le prix bloqué peut se perdre.** `changerDeFormule` et `prixCible` (lignes 653-716) feraient quitter ce prix sans retour possible.
- **Mot interdit.** `mots-interdits.test.ts` ligne 41 refuse `/garanti/i` dans `lib/config`, `marketing`, `ui`, `routes` et `emails`. Écrire « bloqué à vie », jamais « garanti ».

### Offre de bienvenue : −20 % sur trois mois, valable 14 jours

- Une remise Paddle en pourcentage, récurrente sur trois périodes, réservée aux prix au mois. Sur un prix à l'année, trois périodes font trois ans.
- La réserve porte sur des identifiants de prix : elle est à refaire à chaque version du catalogue. Le catalogue n'ajoute que ce qui manque ; il ne sait pas créer de remise.
- L'éligibilité se note sur l'établissement (fin d'offre fixée au paiement du diagnostic). Le champ doit être écrit quelque part, sinon `champs-alimentes.test.ts` échoue.
- **Le jeton côté client est public.** Une remise ouverte au paiement peut être utilisée par n'importe qui. Deux parades : un code à usage unique créé par l'API, ou une remise appliquée par le serveur à l'abonnement à la réception de `subscription.created`.
- « Non cumulable » se vérifie dans la caisse.
- Les montants tombent sur des centimes (47,20 €, 119,20 €), ce que refuse `tarifs.ts` lignes 77-82.

### Doctrine à trancher avant de construire

- `choix-formule.tsx` lignes 45-46 : « Ni compte à rebours, ni offre « dernière chance » » ;
- `marketing/tarifs.tsx` lignes 42-45 : « pas de prix barré, pas de compte à rebours » ;
- la spec du 14/10, lignes 250-252, dit la même chose.

Une offre limitée au 31 décembre et une remise de 14 jours vont contre ces trois textes.

## 4. Ordre proposé

1. Lire l'état réel de la production : catalogue en lecture seule, nombre d'abonnés.
2. Versionner les étiquettes ; lire le montant prélevé sur `prixPaddle` par `paddlePrixId` à l'écran et dans les rappels.
3. Changer `GRILLE`, lancer le catalogue en création, corriger `rappels.test.ts` ligne 69.
4. Ajouter `historiqueMois` et l'appliquer au calcul (section 2, option B), après avoir tranché l'essai, les logiciels de Découverte et le préavis.
5. Réactiver les achats ponctuels : schéma, rappel, purge RGPD, caisse séparée.
6. Les offres et les remises, en dernier, après décision du fondateur sur la doctrine.