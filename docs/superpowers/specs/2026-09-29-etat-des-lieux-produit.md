# État des lieux produit — 29 septembre 2026

> Audit de Letikette dans l'état livré le 25 septembre 2026 (page dossier, lots 0 à 6 en
> production). Écrit pour être déroulé ensuite en plan de chantiers.
> Mesures prises dans la salle d'exposition (`/showroom`) aux largeurs de référence, et dans le
> code du dépôt. Références de parcours : Mobbin, sélection 2026.

---

> **Suite donnée les 29 et 30 septembre 2026.** Les chantiers F, B, C, D et E ont été livrés en
> production le 29 (commits `cb7a9d2` à `62b3b9f`). **La page où le client paie** — le levier
> nommé au § 6.2 — a été livrée le 30 (`4057796`), après correction d'un défaut qui la bloquait :
> aucun IBAN ne pouvait être enregistré (`d2be9be`). Le chantier A reste bloqué sur trois comptes
> à ouvrir.

## 0. La réponse courte

**Le produit n'est pas sortable en l'état**, et ce n'est pas un problème de finition.

Letikette **mesure** remarquablement bien : le décompte au centime, la surveillance de la
prescription, le relevé nocturne du registre, l'honnêteté sur ses propres angles morts. Rien de
comparable n'existe sur le marché français.

Mais le gérant qui paie **290 € par mois plus 1 190 € de bilan** n'achète pas une mesure : il
achète *ne plus y penser, et voir l'argent rentrer*. Or :

1. **Rien ne part de l'application.** Le produit s'arrête exactement là où le client a besoin de
   lui : au moment d'envoyer. Il produit un PDF à imprimer et un brouillon dans sa messagerie.
2. **Le travail ne passe pas à l'échelle.** Tout est par dossier, aucune action groupée nulle
   part, et chaque dossier demande jusqu'à treize réponses au gérant.
3. **Le produit n'a aucune mémoire du travail humain.** Pas de note, pas de promesse de paiement,
   pas d'appel consigné, pas de rappel qu'on se pose soi-même. Le gérant garde son carnet à côté —
   donc l'application n'est pas le lieu du travail, c'est un rapport qu'on consulte.

Ces trois manques se soignent. Le reste — le moteur, le droit, le socle — est déjà là, et c'est la
partie qui coûte des années.

---

## 1. La cible, et ce qu'elle achète vraiment

| | |
|---|---|
| Qui | Le gérant d'une PME B2B, 250 à 800 factures par an au palier M. Pas de service comptable dédié, pas de juriste, pas de temps. |
| Ce qu'il paie | 190 / 290 / 390 € par mois selon le volume, plus un bilan d'entrée de 690 / 1 190 / 1 900 €. Trente jours d'essai, sans carte. |
| Ce qu'il croit acheter | « Je ne veux plus courir après mes clients. » |
| Ce qu'on lui vend aujourd'hui | Un relevé très précis de ce qu'on lui doit, et la liste de ce qu'il devrait faire lui-même. |

À ce prix, le produit doit rendre **du temps** et **de l'argent**, visiblement, dans le premier
mois. Aujourd'hui il rend surtout de la **lucidité** — ce qui est précieux, ce qui justifie le
bilan d'entrée, et ce qui ne justifie pas l'abonnement au douzième mois.

---

## 2. Les points forts — à ne casser sous aucun prétexte

1. **Le calcul.** Décompte décomposable période par période, en centimes entiers, arrêtable et
   figé. Un débiteur qui conteste peut le refaire à la main. Aucun concurrent ne le fait.
2. **La surveillance nocturne.** Radar BODACC à 4 h, battement à 6 h, prescription recalculée par
   secteur. Le produit travaille pendant que le gérant dort — c'est l'argument.
3. **L'honnêteté structurelle.** « Ce que le logiciel a supposé » / « Ce que le logiciel ne voit
   pas ». C'est un argument de vente, pas un aveu de faiblesse, et c'est unique.
4. **Les lignes rouges tenues par des tests.** Ne jamais se substituer à un métier réglementé,
   ne jamais manipuler de fonds, ne jamais rendre de verdict. C'est un fossé défensif réel face
   aux sociétés de recouvrement, et le jour où un concurrent se fera reprendre, c'est ce qui
   vaudra le plus cher.
5. **L'import multi-format.** FEC, CSV, Factur-X, PDF, photo. Rare, et bien fait.
6. **Le socle.** Multi-tenant strict, purge RGPD totale, frontière socle/verticale tenue par un
   test. Une seconde verticale ou un second pays ne demandera pas de tout défaire.

---

## 3. Les sept faiblesses qui empêchent de sortir

### F1 — La boucle n'est jamais fermée : rien ne part, rien ne revient

**Constat.** L'application compose six modèles de courrier, les fige après validation, et s'arrête
là. Le gérant imprime un PDF ou ouvre un brouillon `mailto` dans sa propre messagerie. Puis il
revient dans l'application déclarer lui-même que c'est parti.

Ce qui manque en conséquence :

- **Aucune preuve d'envoi.** Ni date certaine, ni accusé de réception, ni suivi. Or la date d'une
  mise en demeure a des effets de droit, et le produit la tient d'une déclaration du gérant.
- **Aucun retour.** Le client répond dans la boîte du gérant ; l'application ne le sait pas.
  Le dossier reste au même état pendant que la relation avance ailleurs.
- **Le `mailto` casse au-delà de ~14 factures** (mesuré dans `messagerie.ts`). Le dossier d'un
  client relancé depuis un an est précisément celui qu'on ne peut pas relancer.

**Pourquoi c'est le blocage n° 1.** Le produit s'interrompt au seul geste qui rapporte de
l'argent. Tout le reste — le calcul, la surveillance — ne sert qu'à préparer ce geste.

**Ce qui bloque.** Rien de technique : trois comptes à ouvrir (Maileva, AR24, un prestataire de
signature). C'est le chemin critique, et il n'est pas entre mes mains.

---

### F2 — Le travail ne passe pas à l'échelle

**Mesuré.**

- **Zéro action groupée** dans toute la file (`src/screens/file.tsx`). Un client à la fois.
- **Six questions de litige** par dossier, plus jusqu'à **sept conditions** à confirmer
  (« Oui, à confirmer » sur la page dossier), soit **jusqu'à treize réponses par dossier**.
- La démonstration montre un import réel : **198 factures, 37 débiteurs, 17 créances**.
  Treize réponses × 17 créances = **221 décisions** avant de pouvoir écrire à qui que ce soit.
- Au palier L (plus de 800 factures par an), le chiffre devient absurde.

**Ce qui manque.**

- Sélection multiple et relance de niveau 1 en lot.
- Une réponse qui vaut **pour tous les dossiers d'un même client** (« ce client n'a jamais rien
  contesté » se dit une fois, pas dix-sept).
- Une réponse qui vaut **par défaut pour toute l'entreprise** (« mes CGV prévoient les pénalités
  d'abord » est un réglage, pas une question par dossier).
- Un ordre de traitement qui commence par ce qui rapporte : aujourd'hui la file trie par urgence
  juridique, jamais par montant récupérable.

**Ce que ça supprime comme geste manuel** (règle anti-dérive) : 221 clics par import deviennent
une dizaine.

---

### F3 — Le produit n'a aucune mémoire du travail humain

**Vérifié dans le schéma** (`src/lib/convex/recouvrement/tables.ts`) : il n'existe

- **aucune note libre** sur une créance ni sur un client (le seul champ `note` est sur une pièce) ;
- **aucune promesse de paiement** (« il a dit qu'il paie le 15 ») ;
- **aucun échange consigné** — un appel, un SMS, une réponse reçue ;
- **aucun rappel que le gérant se pose lui-même** ;
- **aucun fil chronologique du dossier** à l'endroit où on le cherche (le journal existe en base,
  il n'est pas sur la page dossier).

**Conséquence.** Le gérant garde son tableur, son carnet ou ses courriels à côté. L'application
n'est pas le lieu où le travail se fait : c'est un rapport qu'on vient consulter. C'est le motif de
résiliation le plus courant d'un outil B2B à 290 €.

**Ce que font les meilleurs.** Midday, Mercury et HoneyBook mettent, dans le panneau du dossier et
sans le quitter : une frise « Créé → Envoyé → Payé » avec les dates, et une **note interne** —
[Midday, envoi d'une relance](https://mobbin.com/flows/6eb73d1e-1072-4859-aae7-ef998207bf9b) ·
[Mercury, relance d'un retard](https://mobbin.com/flows/23dd05ef-f7d4-4395-8781-10e8798a07d4) ·
[HoneyBook, relance](https://mobbin.com/flows/8a2c4670-8a8b-48c8-b553-9b4d84163ae2).

---

### F4 — Les écrans sont trop longs, et ils expliquent plus qu'ils ne font

**Mesuré dans la salle d'exposition** (hauteur de défilement réelle) :

| Écran | à 1280 px | à 375 px | soit, sur téléphone |
|---|---|---|---|
| **Page dossier** | 4 109 px | **9 208 px** | ≈ 11 écrans |
| **Aujourd'hui** | 4 089 px | 4 873 px | ≈ 6 écrans |
| Dossiers | 1 423 px | 2 485 px | ≈ 3 écrans |
| Compte | 1 662 px | 1 879 px | ≈ 2 écrans |

La page dossier porte **30 contrôles**, la page client **40**.

**Ce qu'on y lit.** Le même article de loi est cité **quatre fois** de suite, mot pour mot, dans le
tableau des conditions. Sur la page d'un client, la phrase « Exigibilité déduite de l'échéance — à
confirmer si vos conditions contractuelles disent autre chose » est répétée **sur chaque ligne de
facture**. L'écran Dossiers explique : « Ce logiciel ne compte aucune date sur ces dossiers. Ce
n'est pas la même chose qu'aucun délai. »

**Le principe est juste, l'exécution est trop bavarde.** L'honnêteté du produit ne demande pas
qu'on répète l'avertissement à chaque ligne : elle demande qu'il soit **dit une fois, à sa place,
et retrouvable**.

**Ce que font les meilleurs.** Trois tuiles de chiffres, une liste, un panneau de détail — et le
raisonnement derrière un chevron. Voir
[Midday](https://mobbin.com/flows/6eb73d1e-1072-4859-aae7-ef998207bf9b) et
[Mercury](https://mobbin.com/flows/23dd05ef-f7d4-4395-8781-10e8798a07d4) : sur la même surface,
ils tiennent le statut, le montant, l'historique complet, la note et l'action principale.

---

### F5 — Le langage de tout le monde ne tient que sur la moitié de l'application

Le test `lexique.test.ts` ne balaie que `src/ui`, `src/screens`, `src/routes/app` et `src/app`.
Les phrases composées côté métier passent à travers. **Mesuré dans les chaînes de
`src/lib/verticales/`** :

| Terme juridique | Occurrences dans des textes affichés |
|---|---|
| « signifi… » (signification, signifié) | 35 |
| « prescription » | 34 |
| « mise en demeure » | 17 |
| « exigibilité » | 14 |
| « non avenue » | 4 |
| « forclusion » | 3 |

Ce sont des phrases que le gérant lit telles quelles, par exemple sur l'écran Dossiers :
« Signification de l'ordonnance · 30 nov. 2026 — Passé ce délai de 6 mois, l'ordonnance est non
avenue. »

**Et un défaut visible, à corriger tout de suite** : `src/ui/revelation.tsx:245` affiche
« 2 factures **hors délai pour agir en justices** » — un `pluriel()` oublié à la fin de la phrase,
resté de l'époque où on écrivait « prescrites ».

---

### F6 — Le premier jour ne produit rien

**Le parcours actuel.** Inscription (trois champs) → création de l'entreprise (un seul champ, le
nom, et le registre fait le reste : c'est excellent) → **écran vide**, jusqu'à ce qu'un fichier
soit déposé.

**Ce qui manque.**

- **Aucune liste de mise en route.** Le profil créancier — signataire, adresse, capital, ville du
  greffe, IBAN — est *obligatoire* pour composer une lettre, et il n'est demandé nulle part dans le
  parcours. On le découvre le jour où une lettre refuse de se composer.
- **Aucun avancement visible.** Rien ne dit « vous êtes à 3 étapes sur 5 ».
- **Aucun mode démonstration.** Un prospect ne peut pas voir le produit plein avant d'avoir donné
  ses données. Or `/showroom` fait déjà 80 % du travail : il rend chaque écran avec des données
  réalistes, sans backend.
- **Aucune première victoire.** L'écran « Ce qui est dû » est exactement ça — « 18 443,92 € dus de
  plein droit sur vos 4 factures en retard, et jamais calculés » — mais il faut le chercher.

**Ce que font les meilleurs.**

- [Xero](https://mobbin.com/flows/1ea31751-2d68-4090-8b01-e07eacba23a2) : un « Setup guide 0 of 5 »
  en cartes avec pourcentage par carte, **et un interrupteur « Preview with example data »** sur le
  tableau de bord, pour voir le produit plein avant que ses propres données n'arrivent.
- [Mercury](https://mobbin.com/flows/a554b71d-1a75-4bd5-9205-5e44e450449c) : un bandeau
  « Finalize setup » numéroté 1-2-3, chaque étape avec « Skip for now », et le bandeau se masque.
- [Origin](https://mobbin.com/flows/42d35802-321b-472f-880f-81943b82235e) : un panneau permanent
  « Complete onboarding — 33 % », qui ouvre la liste détaillée.
- [Causal](https://mobbin.com/flows/c26c8046-07e0-476b-a44a-ec58c94858b9) : « Quick start —
  Generate models in 1 click from your own data ».

---

### F7 — L'onglet « Dossiers » ne liste pas les dossiers

**Vérifié.** La barre du bas mène à quatre destinations. Le troisième onglet s'appelle
**« Dossiers »** et pointe vers `/app/procedures`, qui interroge `dossiersEngages` : il ne montre
que les dossiers **déjà engagés devant un tribunal** — quatre, dans la démonstration, sur dix-sept
créances.

**Conséquence.** Il n'existe, dans toute l'application, **aucun écran qui liste tous les dossiers**.
Les seules portes vers un dossier sont la file du jour — qui montre ce qui presse, pas ce qui
existe — et la page d'un client. Un gérant qui veut « tous mes dossiers ouverts, du plus gros au
plus petit » ne peut pas l'obtenir.

C'est d'autant plus dommage que le chantier du 25 septembre a fait de la page dossier le cœur du
produit : elle n'a pas d'index.

---

## 4. Ce qui manque, en fonctionnalités

Chaque ligne porte le geste manuel qu'elle supprime — la règle anti-dérive du projet s'applique de
nouveau hors du chantier page dossier.

| Manque | Geste manuel supprimé | Ce que ça change pour le gérant | Difficulté | Ligne rouge |
|---|---|---|---|---|
| **Envoi en recommandé (Maileva, AR24)** | Imprimer, mettre sous pli, aller à la poste, classer l'accusé | Une date certaine, opposable, sans sortir du bureau | Compte à ouvrir | Conforme : c'est lui qui valide, l'envoi est à son nom |
| **Signature électronique de l'échéancier** | Imprimer, faire signer, scanner, classer | Un accord signé le jour même | Prestataire à choisir | Conforme |
| **Connecteur de logiciel de facturation** (Pennylane, Sage, EBP, Cegid, Axonaut, Henrri) | Exporter un FEC et le déposer, tous les mois | Les factures arrivent seules ; c'est le frein d'adoption n° 1 | Moyenne, par connecteur | Conforme |
| **Actions groupées** | 221 clics par import (mesuré §F2) | Une matinée devient dix minutes | Faible | Conforme |
| **Note, promesse de paiement, échange consigné, rappel** | Le carnet et le tableur tenus à côté | L'application devient le lieu du travail | Faible | Conforme |
| **Frise du dossier** (« ce qui s'est passé, et quand ») | Rechercher dans ses courriels | On sait où on en est en trois secondes | Faible — le journal existe déjà en base | Conforme |
| ~~**Page de paiement du client**~~ **livrée le 30/09** | Retaper un RIB au téléphone, envoyer le décompte en pièce jointe | Le client voit ce qu'il doit et vire en deux gestes | — | Conforme, vérifié auprès de l'ACPR |
| **Relance de niveau 1 programmée** | Se souvenir de relancer à J+8 | Le premier rappel part sans qu'on y pense | Moyenne | À cadrer : c'est lui qui valide, une fois |
| **Tableau de bord dirigeant** : DSO, encours par âge (0-30 / 30-60 / 60-90 / 90+), taux de récupération | Reconstruire le calcul dans un tableur pour la banque ou l'expert-comptable | Le chiffre qu'on montre à son banquier | Faible | Conforme |
| **Écriture comptable des pénalités** | Ressaisir l'écriture chez le comptable | Ce qui est calculé se comptabilise | Faible | Conforme |
| **Mode démonstration** | — | Un prospect voit le produit plein en dix secondes | Faible — `/showroom` existe | Conforme |
| **Second pays** | — | La vision européenne ne tient pas avec un référentiel 100 % français | Élevée | À décider plus tard |

---

## 5. Le plan, en cinq chantiers

Chaque chantier est livrable seul, en production, et porte son critère de sortie.

### Chantier A — Fermer la boucle *(dépend de tes comptes)*

| Lot | Contenu | Critère de sortie |
|---|---|---|
| A1 | Envoi en recommandé papier (Maileva) depuis un courrier validé | Un courrier part de l'application, et sa preuve de dépôt revient dans le dossier |
| A2 | Recommandé électronique (AR24) | Idem, avec l'accusé de réception qualifié |
| A3 | Signature électronique de l'échéancier | Un accord signé des deux côtés est classé au dossier sans impression |
| A4 | Suivi d'envoi sur le dossier : déposé, présenté, retiré, refusé | L'état d'un envoi se lit sans ouvrir sa messagerie |
| A5 | Rupture du `mailto` au-delà de 14 factures : basculer sur le PDF joint | Un dossier de 40 factures s'envoie |

**Préalable, à toi :** ouvrir les trois comptes et choisir le type de contrat Maileva.

### Chantier B — Rendre le travail groupable

| Lot | Contenu | Critère de sortie |
|---|---|---|
| B1 | Sélection multiple dans la file et sur la page client | Dix dossiers se cochent |
| B2 | Relance de niveau 1 en lot (un seul écran de validation, une seule signature) | Dix relances se préparent en un geste, chacune à son nom |
| B3 | Réponses héritées : une réponse de qualification vaut pour tous les dossiers du même client, jusqu'à démenti | Le deuxième dossier d'un client ne repose pas les mêmes questions |
| B4 | Réglages d'entreprise : ordre d'imputation, taux contractuel, délai de relance par défaut | Trois questions par dossier disparaissent, une fois pour toutes |
| B5 | Tri de la file par montant récupérable, en plus de l'urgence | On commence par ce qui rapporte |
| B6 | **Un vrai index des dossiers** sous l'onglet « Dossiers » : tous, triables, filtrables, les procédures engagées n'étant qu'un filtre parmi d'autres | « Tous mes dossiers ouverts, du plus gros au plus petit » s'obtient en un geste |

### Chantier C — Donner une mémoire au produit

| Lot | Contenu | Critère de sortie |
|---|---|---|
| C1 | Note libre sur un dossier et sur un client, horodatée et signée | Ce qu'on a dit au téléphone est dans l'application |
| C2 | Promesse de paiement : montant, date, et rappel automatique la veille | Une promesse non tenue remonte d'elle-même dans la file |
| C3 | Échange consigné : appel, courriel reçu, réponse du client | Le dossier raconte son histoire |
| C4 | Rappel posé par le gérant, à une date qu'il choisit | Il n'écrit plus dans son agenda |
| C5 | Frise du dossier, en tête de page, à partir du journal existant | « Où j'en suis » se lit en trois secondes |

### Chantier D — Raccourcir et désencombrer

| Lot | Contenu | Critère de sortie |
|---|---|---|
| D1 | Page dossier : de 9 208 px à moins de 3 500 px à 375 px | Trois écrans de téléphone, pas onze |
| D2 | Le tableau des conditions : la source citée une fois, pas quatre | Une seule mention de l'article, en pied de tableau |
| D3 | Les avertissements répétés ligne à ligne remontent en tête de section | « Exigibilité déduite » se lit une fois |
| D4 | Aujourd'hui : de 4 873 px à moins de 2 500 px à 375 px | Ce qui presse tient sur le premier écran |
| D5 | Le méta-discours du produit va dans une section « Comment ce chiffre est fait », repliée | L'écran dit ce qu'il faut faire, pas comment il pense |

### Chantier E — Le premier jour

| Lot | Contenu | Critère de sortie |
|---|---|---|
| E1 | Liste de mise en route, avec avancement, masquable (modèle Xero / Mercury) | Le profil créancier est demandé avant qu'une lettre le réclame |
| E2 | Mode démonstration : les données de `/showroom` dans un vrai compte, effaçables en un geste | Un prospect voit le produit plein sans rien déposer |
| E3 | Première victoire mise en scène à la fin du premier import : « voilà ce qui vous est dû et n'a jamais été calculé » | Le montant apparaît sans qu'on le cherche |
| E4 | Connecteur de facturation, le premier (à choisir selon ta cible) | Les factures arrivent seules |

### Chantier F — Petites corrections, tout de suite

| | |
|---|---|
| F-a | `src/ui/revelation.tsx:245` — « hors délai pour agir en justices » |
| F-b | Étendre `lexique.test.ts` à `src/lib/verticales/` (107 occurrences à reprendre, §F5) |
| F-c | Les données de démonstration d'un client affichent « 0,00 € » sur chaque facture alors que le client doit 12 878,50 € : à vérifier |
| F-d | `src/marketing/apercu-telephone.tsx:73` et `src/routes/-salle/barre-et-compagnon.tsx:75` disent « Créances » ; la vraie barre (`src/app/barre.tsx:50`) dit « Dossiers ». La page d'accueil vend un onglet qui n'existe pas |

---

## 6. Ce qui a été tranché le 29/09, et ce qui reste à toi

### Tranché, et vérifié aux sources

1. **L'ordre des chantiers.** F, B, C, D, E — dans cet ordre, livrés le 29/09/2026. A reste
   bloqué sur les trois comptes à ouvrir.

2. **La page de paiement du client : OUI, et ce n'est pas réglementé.** Vérifié auprès de l'ACPR :
   un service de paiement suppose d'**exécuter** une opération — initier l'ordre à la place du
   payeur, ou encaisser des fonds pour un tiers. La simple **transmission d'informations de
   paiement** — afficher un IBAN, un montant, une référence, un QR de virement européen (EPC) —
   n'en est pas un, et ne demande donc aucun agrément. Le client scanne, sa banque pré-remplit le
   virement, il valide chez lui : aucun fonds ne passe par le logiciel, la ligne rouge n° 2 tient.
   C'est ce que fait Mercury avec sa page de facture publique, et c'est constructible.
   Source : [ACPR — de quel statut relève mon activité](https://acpr.banque-france.fr/fr/professionnels/lacpr-vous-accompagne/parcours-fintech/contenus-pedagogiques/de-quel-statut-releve-mon-activite/jouvre-des-comptes-je-fournis-des-cartes-de-paiement).

3. **Les relances automatiques : NON, et la ligne rouge 1 est mieux fondée que je ne le pensais.**
   Le décret n° 96-1112 vise, à son article 1er, quiconque « procède au recouvrement amiable des
   créances pour le compte d'autrui », *« d'une manière habituelle ou occasionnelle, même à titre
   accessoire »* — sans aucune condition de manipulation de fonds. Et son article 4 impose alors à
   la lettre de **nommer l'agent de recouvrement** et de dire qu'il exerce cette activité : une
   lettre envoyée par Letikette devrait donc porter le nom de Letikette, ce qui défait tout le
   modèle. Ce qui est livré est donc la seule forme défendable : le logiciel **rappelle**, il
   n'envoie pas. Quand une lettre part, il propose de rappeler le gérant au jour où son délai
   expire ; le dossier remonte dans la file, et c'est lui qui décide.
   Source : [décret n° 96-1112, article 1](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006498905/2025-08-13).

### Ce qui reste à toi

4. **Quel connecteur de facturation en premier ?** Pennylane et Sage couvrent le plus de PME
   françaises ; Axonaut et Henrri couvrent les plus petites. Le choix dépend de qui tu vises
   d'abord — je ne l'ai pas dans les documents du dépôt.

5. **Ouvrir les trois comptes du chantier A** : Maileva (et choisir le type de contrat), AR24, et
   un prestataire de signature électronique. C'est le seul chemin critique que je ne peux pas
   prendre à ta place.

6. **Le second pays.** La vision « néobanque numéro 1 pour le business en Europe » ne tient pas
   avec un référentiel 100 % français. Ce n'est pas urgent, mais le jour où ce sera décidé, il
   faudra un mois de travail sur `pays/` — et la frontière socle/verticale a été tenue exactement
   pour ça.

---

## 7. Références de parcours (Mobbin)

| Sujet | Application | Lien |
|---|---|---|
| Relance d'un impayé, panneau de dossier, frise et note | Midday | [flow](https://mobbin.com/flows/6eb73d1e-1072-4859-aae7-ef998207bf9b) |
| Relance d'un retard, page de paiement du client | Mercury | [flow](https://mobbin.com/flows/23dd05ef-f7d4-4395-8781-10e8798a07d4) |
| Relance en lot + relances automatiques | PayPal | [flow](https://mobbin.com/flows/a6c39118-8265-49e0-b205-5143aa67bfa3) |
| Relance depuis une ligne dépliable | HoneyBook | [flow](https://mobbin.com/flows/8a2c4670-8a8b-48c8-b553-9b4d84163ae2) |
| Liste de mise en route numérotée, masquable | Mercury | [flow](https://mobbin.com/flows/a554b71d-1a75-4bd5-9205-5e44e450449c) |
| Guide de mise en route + aperçu avec données d'exemple | Xero | [flow](https://mobbin.com/flows/1ea31751-2d68-4090-8b01-e07eacba23a2) |
| Avancement d'installation permanent | Origin | [flow](https://mobbin.com/flows/42d35802-321b-472f-880f-81943b82235e) |
| Démarrage guidé sur ses propres données | Causal | [flow](https://mobbin.com/flows/c26c8046-07e0-476b-a44a-ec58c94858b9) |
| Assistant : questions pré-écrites et sources citées | Sana AI | [flow](https://mobbin.com/flows/cd8997e3-ecb7-4474-b156-f0b0908c671e) |
| Assistant : réponse avec la liste des sources cliquables | Notion | [flow](https://mobbin.com/flows/139bc3b4-c3be-4c13-8e89-d3e9323cc919) |
| Assistant contextuel dans un panneau latéral | Supabase | [flow](https://mobbin.com/flows/24afff16-b6ee-4afe-a1a5-3fc2782d31bd) |
| Échéancier : acompte, solde, rappels par échéance | Square | [flow](https://mobbin.com/flows/d7049b65-3884-4c52-afc9-889abcfab3e4) |
| Échéance récurrente, récapitulatif en clair avant validation | Revolut Business | [flow](https://mobbin.com/flows/70d1f06b-a35e-4da5-b2bd-3f5466c6949d) |

---

## 8. Ce qui a servi à mesurer

- `/showroom`, aux largeurs 375 et 1280, hauteurs de défilement relevées au DOM.
- `src/lib/convex/recouvrement/tables.ts` pour l'absence de note, de promesse et d'échange.
- `src/screens/file.tsx` pour l'absence d'action groupée.
- `src/routes/app/procedures.tsx` et `src/app/barre.tsx` pour l'onglet « Dossiers ».
- `src/lib/__tests__/lexique.test.ts` pour le périmètre du test de vocabulaire, et un balayage de
  `src/lib/verticales/` pour ce qui lui échappe.
- `src/lib/config/tarifs.ts` pour la grille.
- `src/lib/convex/crons.ts` pour ce qui tourne la nuit.
