# Le parcours de l'habitude — le marketing dans l'application

21/10/2026. Validé par le fondateur sur la maquette du parcours (« c'est parfait, écris le
design et lance l'implémentation »), notifications push ajoutées le même jour (« j'aimerais
bien mettre en place le service worker et les notifications push aussi »).

## L'intention

Le fondateur : « automatiser à l'intérieur de l'app le marketing, […] respecter les codes
d'Apple en marketing, CX et UX, […] cohérent et pas envahissant, […] que nos utilisateurs
deviennent accros ». Et, au moment de lancer : « je ne veux pas que l'ajout vienne polluer
notre magnifique expérience actuelle ».

L'habitude se construit sur **l'argent qui rentre**, pas sur un jeu artificiel. La règle de
responsabilité d'Apple exclut les ressorts de manipulation : fausse urgence, culpabilisation,
badges qui s'accumulent, relances quand rien n'a changé. Trois choses font revenir :

1. un **rendez-vous fiable** qui montre ce qui a été récupéré ;
2. des **réussites célébrées au bon moment**, une fois chacune ;
3. une application qui ne parle **que quand elle a quelque chose d'utile à dire**.

## Les personnes servies

- **Le gérant de TPE** (artisan, transporteur, agence) : téléphone, le soir ou entre deux
  chantiers ; veut savoir combien on lui doit et ce qui est rentré.
- **L'administratif d'une PME** : bureau, tous les jours ; traite une file, veut voir qu'il
  avance.
- **Le dirigeant de PME** : un coup d'œil par semaine, des chiffres de synthèse.
- **Plus tard, l'expert-comptable partenaire** : recommande l'outil (hors de ce chantier,
  sauf la recommandation).

## Objectifs, non-objectifs, anti-objectifs

**Objectifs** : un parcours de huit moments (ci-dessous) servi par les surfaces qui existent
déjà ; un seul budget d'attention pour toutes les prises de parole non transactionnelles ;
des notifications push que le gérant choisit, par type.

**Non-objectifs** : un « Quoi de neuf » après chaque version ; le partenariat cabinet ; le
mode hors ligne du service worker (aucune mise en cache : il ne fait que le push).

**Anti-objectifs** — ce qui ferait échouer le chantier même s'il fonctionne :

- des points, des badges, un classement, une monnaie ;
- un compte à rebours, une « dernière chance », un prix barré ;
- une fenêtre qui s'ouvre au lancement hors des moments listés, ou pendant une tâche ;
- un reproche (« vous n'êtes pas venu depuis… ») : une série qui retombe ne se dit pas ;
- deux canaux pour le même message, ou deux célébrations pour le même paiement ;
- quoi que ce soit vers un débiteur : aucune surface tournée vers lui ne change, aucune ne
  nomme Letikette (ligne rouge existante) ;
- le mot « garantie », un verdict, une voie de droit mise en avant (lignes rouges existantes).

## Ce qui ne bouge pas

L'expérience actuelle reste telle quelle : la bulle et la capsule de Plume, sa journée
(défis, série, fêtes), le point du retour, les conseils de croissance et leur cadence, les
rappels d'abonnement (J-7, J-2), la file d'Aujourd'hui, les cartes. Le chantier **s'y
greffe** :

- la carte du moment se pose dans la tête d'Aujourd'hui, à la place qu'occupe déjà « Jamais
  réclamé », sous la bande d'ancienneté — jamais deux cartes du moment à la fois ;
- quand un paiement fait franchir un jalon, la célébration plein écran **remplace** la
  parole « X vient de vous payer » de Plume pour ce paiement (une seule fête) ;
- le lundi, l'e-mail « Votre semaine » **remplace** le point du matin de ce jour-là pour qui
  le reçoit (un seul e-mail) ;
- toute notification nouvelle passe par la boîte de réception existante.

## Le parcours

| # | Moment | Déclencheur | Surface | Ce qui se dit |
| - | ------ | ----------- | ------- | ------------- |
| 1 | Le premier chiffre | inscription → montant révélé | existant (révélation, conseils d'accueil) | inchangé |
| 2 | La première relance partie | première relance envoyée par le pilote | célébration à la visite suivante, puis proposition des notifications | « Votre première relance est partie, à votre nom. » + « Être prévenu quand un client paie » |
| 3 | Le rendez-vous | chaque lundi, semaine écoulée non vide | carte du moment (lundi → mercredi), écran « Votre semaine », e-mail du lundi | rentré, relances parties, clients qui ont payé, date limite la plus proche, meilleure semaine depuis… |
| 4 | Les réussites | jalons d'argent et de dossiers | célébration plein écran à la visite suivante, notification, push « Paiements » | le montant, depuis quand, sur combien de clients |
| 5 | Avant le prélèvement | existant (J-7 Plume, J-2 e-mail, TTC du 21/10) ; l'année proposée une fois sous un jalon à qui paie au mois | sous une célébration | « Passer à l'année : 2 mois offerts » |
| 6 | Au moment du besoin | une limite atteinte au geste (11e client suivi, analyse de trop ; les places : livré le 21/10) | feuille pleine qui garde l'intention | la formule du dessus, HT et TTC, et le geste qui se termine après |
| 7 | La recommandation | sous une célébration de jalon d'argent, à qui ne l'a pas coupée | ligne discrète sous le bouton ; rangée dans Compte | « Un confrère a des impayés ? Un mois offert pour vous deux. » |
| 8 | Le réveil utile | 14 jours sans visite ET quelque chose de vrai depuis | un e-mail, puis le point du retour à la visite | « Pendant votre absence : 2 clients ont payé, une date limite approche. » Rien de vrai : silence. |

### Les jalons (moments 2 et 4)

Clés fermées, une fois chacune par établissement, datées au jour où elles sont franchies :

- `PREMIERE_RELANCE` — la première relance que le pilote a envoyée ;
- `PREMIER_PAIEMENT` — le premier paiement ou acompte rapproché sur un dossier ;
- `RENTRE_1000`, `RENTRE_10000`, `RENTRE_50000`, `RENTRE_100000` — le cumul de ce qui est
  rentré sur les dossiers suivis depuis l'arrivée (même calcul que le bilan des rappels
  d'abonnement, « rentrés sur les dossiers suivis », jamais « grâce à Letikette ») ;
- `PREMIER_DOSSIER_SOLDE` — le premier dossier dont tout est réglé.

Un compte ancien à la mise en service ne reçoit pas d'un coup les jalons qu'il a déjà
franchis : au premier relevé, ce qui est déjà franchi s'inscrit **vu**, sans célébration.

La célébration (une page pleine, `FeuilleDeReussite` étendue) : la coche qui se trace, le
montant héros, une ligne de contexte, UN bouton « Continuer », et au plus UNE ligne
secondaire sous le bouton, dans cet ordre de priorité : notifications non activées (après
`PREMIERE_RELANCE`) → l'année (abonné au mois, jalon d'argent, jamais proposée) → la
recommandation (jalon d'argent). Elle se montre à la visite suivante, une fois par personne,
jamais pendant une feuille ouverte. Plusieurs jalons en attente : le plus haut seul, les
autres marqués vus.

### « Votre semaine » (moment 3)

La semaine est du lundi au dimanche, heure de Paris. Les chiffres, tous lus en base :

- **rentré** : paiements et acomptes rapprochés dans la semaine (centimes, `bigint`) ;
- **relances parties** : envois partis dans la semaine ;
- **clients qui ont payé** : débiteurs distincts des paiements ci-dessus ;
- **date limite la plus proche** : la plus proche des dates limites pour agir des dossiers
  ouverts, en jours ;
- **les huit dernières semaines** de « rentré », en barres à l'encre (jamais aux couleurs de
  seuil), la semaine écoulée foncée ;
- **meilleure semaine depuis** : quand la semaine écoulée dépasse toutes les précédentes
  d'au moins quatre semaines, la date de la dernière qui la dépassait (« depuis juin »), ou
  « depuis votre arrivée ».

Une semaine **vide** (rien rentré, rien parti, aucune date limite à moins de 30 jours) ne
fait ni carte, ni e-mail : le vide montre le chemin, jamais des cadrans à zéro.

L'écran `/app/semaine` (page poussée, `EnteteDetail`) : le montant héros centré, la ligne
« meilleure semaine », les barres, un relevé des autres chiffres, et « Cette semaine » : ce
que le pilote prévoit (relances programmées). La carte du moment y mène et disparaît une fois
l'écran ouvert, ou le jeudi. L'e-mail du lundi, à 9 h, reprend les mêmes chiffres en court,
signé Plume, et mène à l'écran ; il se coupe dans les réglages des notifications.

### Au moment du besoin (moment 6)

Le patron est celui des places (livré le 21/10, `equipe.tsx`) : on ne refuse pas, on garde
l'intention et on montre la formule du dessus. À étendre à :

- **les clients suivis** : démarrer le dossier d'un client au-delà de la limite (démarrage
  guidé, lot, « Lancer un dossier ») ouvre la feuille « Suivre {client} » : la formule du
  dessus et son nombre de clients, HT et TTC, « Passer à {formule} et suivre » ; le dossier
  démarre une fois la formule en place. Aujourd'hui ces clients sont « mesurés » en silence
  et le pilote écrit un message de limite : la feuille s'ajoute au geste, le message reste ;
- **les analyses de santé** : lancer une analyse au-delà du quota mensuel ouvre la même
  feuille, avec la date où le quota revient.

### La recommandation (moment 7)

- Chaque établissement a un **lien personnel** (`/?parrain=<code>`, code court non devinable).
  La source de la visite le garde (`app/source-visite.ts`), l'inscription l'inscrit sur le
  nouvel établissement.
- **La récompense** : un mois offert pour les deux, quand l'établissement recommandé paie sa
  première vraie échéance (une transaction Paddle d'un montant non nul, pas l'essai). Un mois
  offert = une remise Paddle unique égale au prix mensuel HT de la formule du bénéficiaire,
  appliquée à sa prochaine échéance. Le parrain sans abonnement payant garde sa récompense,
  appliquée à sa première échéance. Au plus douze récompenses par an et par parrain.
- La ligne sous une célébration ouvre une page pleine : le lien, « Copier », le partage du
  système (`navigator.share`), et les recommandations en cours (inscrits, abonnés). Une
  rangée « Recommander Letikette » dans Compte y mène aussi.
- Jamais sur une surface tournée vers un débiteur ; jamais dans un courrier de relance.

## Le budget d'attention — un seul chef d'orchestre

Toute prise de parole **non transactionnelle** (carte du moment, célébration, proposition
des notifications, ligne d'année ou de recommandation, e-mail « Votre semaine », e-mail de
réveil, conseils de croissance) demande la parole à un module pur unique,
`src/lib/croissance/attention.ts`, avant de se montrer ou de partir. Les messages
transactionnels (une relance partie, un paiement reçu, un rappel d'abonnement, une réponse du
support) ne lui demandent rien.

Les règles :

1. **Dans l'application** : au plus une prise de parole marketing par jour et par personne
   (la carte du moment ne compte qu'à sa première apparition de la semaine) ; jamais pendant
   une feuille, un formulaire ou une conversation ouverts.
2. **Par e-mail** : au plus un e-mail marketing tous les deux jours (la cadence des conseils
   existants, étendue à tous) et deux par semaine ; « Votre semaine » passe en premier le
   lundi.
3. **Le silence quand on l'ignore** : deux prises de parole marketing d'un même canal
   ignorées d'affilée (montrées sans être ouvertes ni suivies d'effet) font taire ce canal
   quatorze jours. Les e-mails n'ont pas d'ouverture mesurée (aucun suivi, règle des e-mails
   du 15/10) : la règle ne s'applique qu'à l'application.
4. **« Ne plus me le proposer »** sur chaque ligne secondaire et dans les réglages : définitif,
   rangé avec les silences de Plume (`silencesPlume`, clés `marketing:<genre>`).
5. **Le créneau** : le marketing par e-mail ou push part en semaine, de 9 h à 18 h, heure de
   Paris (`prochainCreneauDEnvoi`).

Chaque prise de parole s'inscrit dans une table `prisesDeParole` (établissement, personne,
canal, genre, clé, date, ouverte ou non). Le module pur décide ; les fonctions Convex lisent
l'historique, demandent, inscrivent.

## Les notifications push

- **Un service worker minimal**, `public/sw.js` : `push` affiche la notification (titre,
  texte, icône, `data.url`, `tag` pour regrouper), `notificationclick` ramène l'onglet ouvert
  sur l'adresse ou en ouvre un. **Aucun gestionnaire `fetch`, aucune mise en cache** :
  l'application servie reste celle de Vercel, un déploiement n'est jamais masqué. Il
  s'enregistre depuis la coquille de `/app` seulement, au repos, après le premier affichage.
- **Web Push standard, clés VAPID** : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (variables
  Convex, la publique servie par une requête), la bibliothèque `web-push` dans une action
  Node. **Dormant sans clés** : l'écran ne propose rien.
- **L'abonnement** d'un appareil se range dans `abonnementsPush` (personne, établissement,
  endpoint, clés, appareil lisible, date) ; un envoi refusé en 404/410 le retire.
- **Les types**, réglables un par un (Compte › Votre profil › Notifications), avec leurs
  défauts :
  - *Paiements reçus* (un client a payé, un jalon) — activé ;
  - *Ce qui attend votre réponse* (pilote bloqué, date limite proche, dossiers prêts) — activé ;
  - *Votre semaine* (le lundi) — activé ;
  - *Abonnement et compte* (rappels d'abonnement, réponse du support) — activé.
  Les mêmes types gouvernent l'e-mail « Votre semaine ».
- **La permission se demande au bon moment**, jamais au lancement : sous la célébration de
  la première relance (« Être prévenu quand un client paie »), et depuis les réglages. Une
  page pleine explique d'abord ce qui arrivera (patron ChatGPT, Strava), puis le geste
  déclenche la demande du système. Sur iPhone hors application installée, la page dit
  d'ajouter Letikette à l'écran d'accueil (l'invitation à installer existe).
- **Un seul point d'entrée** : `notifier()` (module Convex unique) insère la notification
  dans la boîte de réception ET programme le push selon le type et les réglages. Les cinq
  insertions directes d'aujourd'hui y passent.
- **Les heures** : un paiement reçu part tout de suite entre 8 h et 21 h, sinon à 8 h ; le
  reste suit le créneau du marketing ou part tout de suite s'il est transactionnel, dans les
  mêmes bornes.

## Les données nouvelles

- `prisesDeParole` — l'historique du budget d'attention (index par personne et date).
- `jalonsAtteints` — établissement, clé, `atteintLe`, montant éventuel, `vusPar` (personnes),
  `secondaire` (la ligne proposée sous la célébration).
- `abonnementsPush` — un appareil abonné.
- `organizationMembers` — les réglages de notification par type (champs optionnels, défaut
  activé), à côté de `pointDuMatinParCourriel`.
- `organizations` — `codeParrainage`, `parrainePar`, et les récompenses
  (`recompensesParrainage` : à appliquer, appliquées).
- `notifications.type` — trois types de plus : `PAIEMENT_RECU`, `JALON`, `SEMAINE`.

Tout porte un `organizationId` (multi-établissement strict) ; la purge RGPD efface ces
tables avec le reste.

## L'ordre des lots

Chaque lot se livre seul, en production, vérifié :

1. **`notifier()` et les notifications push** : le point d'entrée unique, le service
   worker, l'abonnement d'un appareil, les réglages, l'envoi.
2. **Le budget d'attention** : le module pur, la table, branché sur les conseils existants.
3. **Les jalons et leurs célébrations** : détection, célébration à la visite, la proposition
   des notifications, la ligne d'année ; la fête de Plume dédoublonnée.
4. **« Votre semaine »** : le calcul, l'écran, la carte du moment, l'e-mail du lundi.
5. **Au moment du besoin** : clients suivis et analyses.
6. **Le réveil utile**.
7. **La recommandation** : lien, attribution, récompense Paddle, page et rangée.

## Les décisions prises en écrivant (à relire)

Relu comme le ferait le constructeur ; ces points auraient été devinés, ils sont tranchés :

1. **Un import ne fait pas vingt notifications.** Les paiements d'un même import (Qonto,
   Nango, relevé) font UNE notification « Paiements reçus » : « 3 clients ont payé,
   4 120 € », et un push. Un paiement saisi à la main par le gérant n'en fait pas (il le
   sait) ; il peut faire franchir un jalon.
2. **« Ignorée », dans l'application** : une carte du moment qui expire sans avoir été
   ouverte, ou une ligne secondaire de célébration passée sans être touchée. Une célébration
   elle-même n'est jamais « ignorée » : elle se montre en entier.
3. **Le lundi, un seul e-mail** : le passage quotidien qui envoie le point du matin envoie,
   le lundi, « Votre semaine » à qui l'a activée et dont la semaine n'est pas vide, et le
   point du matin aux autres. Jamais les deux.
4. **La récompense ne remplace jamais une remise en cours.** Un abonnement Paddle ne porte
   qu'une remise : si la remise de bienvenue court encore, la récompense attend sa fin, puis
   s'applique à l'échéance suivante.
5. **Le réveil utile** : la dernière visite est lue sur la journée de Plume (`vueLe`) ;
   « quelque chose de vrai » = un paiement, une relance partie ou une date limite à moins de
   30 jours depuis cette visite. Un seul e-mail par absence : le suivant attend une visite.
6. **Le budget des e-mails** lit les conseils déjà envoyés là où ils sont inscrits
   aujourd'hui, plus `prisesDeParole` pour les nouveaux : l'historique des conseils n'est pas
   migré.
7. **Les clés VAPID** sont générées par nous (aucun compte tiers, aucun coût) et posées sur
   les déploiements Convex de développement et de production, sans jamais être affichées.

## Ce qui reste au constructeur

L'emplacement exact des fichiers dans les zones du projet (socle, verticales, convex, ui),
les noms de fonctions, le texte des célébrations dans le registre de ce produit (mots du
gérant, aucun superlatif creux), la forme des barres de la semaine dans le kit, et l'ordre
des tests. Les règles de `CLAUDE.md` tiennent : aucune valeur juridique en dur, les montants
en centimes, une seule action pleine par écran, toute modale en page pleine, la muselière
du lint, la vérification au navigateur aux quatre largeurs.
