# La machine de croissance — le moteur et l'activation (16/10/2026)

> Demande du fondateur, le 16/10/2026 : « la meilleure growth machine pour Letikette avec les
> méthodes les plus efficaces, un système qui s'auto-améliore. Un CRM home made ou un CRM pas trop
> cher pour l'interface. »
>
> **Décisions du fondateur, le même jour :** l'interface est **Twenty** (en ligne) ; la machine agit
> **seule dans un cadre** (il valide chaque variante, elle promeut seule la gagnante) ; la conception
> ci-dessous est validée (« Oui, écris la spec »), puis la stratégie complète qui l'englobe
> (« Oui, écris-la »).

---

## 1. Sa place dans la stratégie

La stratégie entière (la recherche, les sept étages, les outils, le budget, les cinq sous-projets)
vit dans `2026-10-16-strategie-de-croissance.md`. Ce document est le **sous-projet 1** : le cerveau
dans Convex, le cockpit dans Twenty, et l'activation.

**Pourquoi il passe en premier :** chaque étage se mesure avec lui, et l'activation rend rentable
tout le trafic, existant comme à venir. Le préchauffage des boîtes d'envoi (sous-projet 2) tourne
pendant qu'on le construit.

**Les contraintes qu'il tient :** le produit est cloisonné par établissement et n'a aucun rôle
« équipe Letikette », donc **le cockpit vit dehors et ne reçoit que des données de compte, jamais un
débiteur ni un montant** ; aucune prospection ne part par ce moteur (Resend l'interdit, et c'est le
sous-projet 2).

## 1 bis. Ce qui se construit maintenant, et ce qui attend son seuil

Décision du fondateur, le 16/10/2026 : **commencer à la main** (stratégie, § 0). Ce sous-projet se
construit en deux temps.

**Maintenant, à 0 € de plus :**

- la source de chaque inscription (§ 2.3) ;
- les étapes du gérant, déduites de l'état (§ 2.3) ;
- les e-mails de Plume (§ 2.4) ;
- le score (§ 2.5) ;
- **un point chiffré du lundi, sans IA** : les étapes de la semaine et des 28 derniers jours par
  source, les nouveaux inscrits, les dix meilleurs scores et le trafic Umami, envoyé à
  `FONDATEUR_EMAIL` sur la coquille commune ; il remplace provisoirement le point écrit par Claude
  (§ 2.8) et sert au fondateur pour ses relances manuelles.

**Plus tard, chacun à son seuil (stratégie, § 0) :**

- l'envoi vers Twenty (§ 2.6) : plus de 50 prospects actifs ;
- les expériences automatiques (§ 2.7) et le point écrit par Claude (§ 2.8) : environ 100 inscrits
  par mois.

Les tables `experiences` et `revuesHebdo`, et les champs Twenty de `parcoursComptes`, ne se
créent qu'avec leur partie.

## 2. Le moteur et l'activation

### 2.1 Où ça vit

- **`src/lib/croissance/`** — la logique pure : les étapes, le score, la règle de décision des
  expériences, l'éligibilité des messages, la lecture de la source. Il n'importe ni `verticales/`
  ni `convex/` (même frontière que le socle, tenue par un test).
- **`src/lib/convex/croissance/`** — les tables, les mutations internes, les tâches planifiées,
  l'envoi vers Twenty, les e-mails, le point du lundi.
- **Aucun écran dans le produit.** Ce qu'on regarde se lit dans Twenty et dans le point du lundi.
  Les fonctions sont `internal*`, sauf deux, liées au gérant lui-même : enregistrer la source de son
  inscription, et régler « Les conseils de Plume » dans son profil.

### 2.2 Les tables

Toutes portent `organizationId` et entrent dans le test de cloisonnement et dans la purge RGPD.

- **`parcoursComptes`** — un par établissement : la source (premier contact : `utm_source`,
  `utm_medium`, `utm_campaign`, site d'origine, page d'entrée, date), les étapes atteintes avec
  leur date, le score et sa date, l'identifiant Twenty de la société et de la personne, la date du
  dernier envoi vers Twenty.
- **`experiences`** — une par expérience déclarée dans le code : son état (`EN_COURS`, `GAGNANTE`,
  `SANS_ECART`, `ARRETEE`), la variante promue, les dates, le dernier bilan chiffré.
- **`envoisCroissance`** — chaque e-mail de conseil parti : la clé du message, l'établissement, le
  membre, la variante, la date. Un message ne part jamais deux fois au même membre.
- **`revuesHebdo`** — chaque point du lundi : la semaine, les chiffres fournis au modèle, le texte,
  les trois propositions.

### 2.3 La mesure

**La source.** Sur le site public, la provenance de la visite (paramètres `utm_*`, site d'origine,
page d'entrée) est gardée le temps de la visite dans `sessionStorage` (aucun cookie, lecture et
écriture sous `try/catch`), puis jointe à l'inscription. Une visite sans source se note « directe ».

**Les étapes**, dans l'ordre :

| Étape | Lue sur |
|---|---|
| `INSCRIT` | la création de l'établissement (`createOrganization`) |
| `ENTREPRISE` | le SIREN posé sur l'établissement |
| `FACTURES_DEPOSEES` | un dépôt `TERMINE` (`depotMutations.ts`) ou une connexion qui a importé des factures |
| `MONTANT_REVELE` | au moins une facture échue non réglée : **l'activation**, le choc du premier dépôt |
| `RELANCES_ACTIVEES` | l'activation des relances automatiques (`activerRelances`) |
| `ESSAI` / `ABONNE` / `RESILIE` | `paddleStatus` de l'établissement (`trialing`, `active`, résiliation) |
| `MONTEE_EN_GAMME` | une formule supérieure ou le passage à l'année (`paddlePlanTier`, `paddleRythme`) |
| `A_RISQUE` | le score de santé sous son seuil (dernière connexion, relances en pause) ; se lève quand il remonte |
| `RECONQUIS` | un abonnement repris après `RESILIE` |

**Les étapes se DÉDUISENT de l'état, elles ne s'écrivent pas à la main.** Une seule fonction,
`releverLesEtapes(organizationId)`, lit l'état courant et note la date de chaque étape nouvellement
atteinte. Elle est appelée après les mutations ci-dessus (par `ctx.scheduler.runAfter(0, …)`, sans
rien bloquer) et par une tâche horaire sur les établissements actifs. Le code de facturation
(`paddle.ts`, `billing.ts`) **n'est pas modifié** : les étapes d'abonnement se lisent sur
l'établissement.

Umami continue de mesurer le trafic anonyme ; la croissance ne lui envoie rien de plus.

**Les étages hors du produit** se mesurent là où ils vivent, et le moteur les lit par des
**sources de chiffres** branchables, une par fichier : Umami pour la notoriété et le trafic (ici),
Instantly pour la prospection (sous-projet 2), la Search Console pour le contenu (sous-projet 3).
Une source absente se dit dans le point du lundi, elle ne fait pas échouer le reste. La source
d'un compte venu d'un e-mail froid se lit par ses paramètres `utm_*` (`utm_source=froid`,
`utm_campaign=<campagne>`), comme toute autre.

### 2.4 Les e-mails de Plume

Cinq messages, sur la coquille commune (`emails/modeles/disposition.ts`), signés « Plume de
Letikette » :

| Clé | Quand | Ce qu'il dit | Bouton |
|---|---|---|---|
| `bienvenue` | à `INSCRIT` | ce qui va se passer, en trois temps | Déposer mes factures |
| `il-manque-vos-factures` | un jour après `INSCRIT`, sans `FACTURES_DEPOSEES` | les trois façons de déposer (export, connexion, photo) | Déposer mes factures |
| `ce-qui-vous-est-du` | à `MONTANT_REVELE` | ce qui reste dû et ce que la loi y ajoute, chiffré par le moteur du produit | Voir le détail |
| `ce-qui-partirait` | trois jours après `MONTANT_REVELE`, sans `RELANCES_ACTIVEES` | le plan de relance, étape par étape (`CeQuiPartira`) | Voir le plan |
| rappels d'essai | inchangés (`abonnementRappels.ts`) | — | — |

**Les règles d'envoi :**

- au plus un message de conseil tous les deux jours par membre, en semaine de 9 h à 18 h, heure de
  Paris (`prochainCreneauDEnvoi`, celui du pilote) ;
- un message dont l'étape est franchie ne part plus ;
- seuls les administrateurs et membres qui n'ont pas coupé « Les conseils de Plume » dans leur
  profil (champ `conseilsParCourriel`, comme `pointDuMatinParCourriel`) ; chaque e-mail porte un
  lien de désinscription en un clic et l'en-tête `List-Unsubscribe` ;
- **aucun verdict** (ligne rouge n° 3) : on montre ce que dit la loi et ce qu'il y a dans le
  dossier, jamais « vous devriez agir » ni « vous allez récupérer » ; jamais « garantie » ;
- **aucune valeur juridique écrite dans un texte** : les montants viennent du moteur, les mentions
  du registre ;
- les textes vivent dans le code et passent sous les balayages du lexique et du mot interdit.

### 2.5 Le score

Un indice de 0 à 100, calculé par une fonction pure aux règles nommées (comme
`risque/regles.ts`) :

- les étapes atteintes (le plus fort poids : `MONTANT_REVELE`, `RELANCES_ACTIVEES`) ;
- la fraîcheur de la dernière activité ;
- la taille, en tranches (nombre de factures déposées : 1-20, 21-100, plus de 100) ;
- l'intérêt montré pour une formule (ouverture de la page de paiement) ;
- l'équipe (un membre invité).

Le score se recalcule avec les étapes. Il n'est montré qu'au fondateur, dans Twenty et dans le
point du lundi.

### 2.6 Twenty

- **Un seul sens : du produit vers Twenty**, par l'API REST de Twenty.
- **Ce qui part :** la société (nom de l'établissement, SIREN, ville, code d'activité quand il est connu, formule,
  rythme, source, score, étapes et leurs dates, tranche de taille) et la personne (nom, e-mail,
  rôle de chaque administrateur).
- **Ce qui ne part jamais :** un débiteur, un montant, une facture, un document. Ce sont des
  données de nos clients, pas les nôtres.
- **Quand :** à chaque changement d'étape ou de score, mis en file dans `parcoursComptes` et
  rejoué par une tâche toutes les quinze minutes ; une réconciliation complète chaque nuit.
- **Les tâches :** à partir d'un score de 60, une tâche « Appeler » se crée sur la société, une
  seule fois par établissement. Le seuil est une constante nommée, relue après les premières semaines.
- **Une panne de Twenty ne bloque jamais le produit** : l'envoi reste en file, l'erreur est notée.
- **Dormant sans `TWENTY_API_KEY`** (et `TWENTY_API_URL`), comme Nango et Pappers.

### 2.7 Les expériences

- **Déclarées dans le code** (`src/lib/croissance/experiences.ts`) : la clé, la surface (l'objet ou
  l'introduction d'un e-mail de conseil, un titre de page du site), les variantes avec leur texte,
  l'étape visée (par exemple `FACTURES_DEPOSEES` sous 7 jours). Le fondateur valide chaque variante
  au commit ; les tests du lexique et du mot interdit les balaient.
- **L'affectation** est déterministe : par établissement pour les e-mails, par visite pour le site
  (hachage d'un identifiant de visite tenu en `sessionStorage`).
- **La règle de décision** (fonction pure) : modèle bêta-binomial ; la variante B est déclarée
  gagnante quand la probabilité qu'elle batte A dépasse **95 %**, avec au moins **100 personnes par
  variante**. Au bout de **six semaines** sans écart, l'expérience s'arrête en `SANS_ECART` et la
  variante A reste.
- **Ce que la machine fait seule :** répartir, compter, décider, promouvoir la gagnante, couper la
  perdante. **Ce qu'elle ne fait jamais seule :** écrire une variante, lancer une expérience.

### 2.8 Le point du lundi

- **Une tâche Convex chaque lundi à 7 h**, heure de Paris.
- **Ce qu'elle rassemble :** les étapes par source sur 7 et 28 jours, les expériences et leurs
  bilans, les nouveaux inscrits, les dix meilleurs scores, et le trafic du site par l'API d'Umami
  (`UMAMI_API_KEY`, lecture seule ; sans elle, le point le dit et s'en passe).
- **Ce qu'écrit Claude** (action Convex, comme le compagnon) : ce qui a bougé, ce qui est une
  hypothèse et non un constat, et trois expériences proposées, chacune avec son impact attendu, sa
  confiance et son effort.
- **Aucun chiffre n'est inventé :** chaque nombre du texte doit figurer dans les données fournies ;
  sinon le point est refusé et un point brut (les seuls chiffres) part à la place.
- **Où il arrive :** par e-mail à l'adresse `FONDATEUR_EMAIL`, sur la coquille commune, et en note
  dans Twenty. Il est gardé dans `revuesHebdo`. Rien ne se lance à partir de lui sans le fondateur.

### 2.9 Le cadre légal

- **La politique de confidentialité** passe à une nouvelle version : l'accompagnement à
  l'utilisation (étapes, score) et les conseils par e-mail comme finalités, Twenty comme
  prestataire quand il arrive, la durée de conservation (celle du compte), le droit d'opposition (le réglage du
  profil et le lien de chaque e-mail).
- **Les conseils sont des communications relationnelles** sur le service souscrit, avec opposition
  simple ; aucune prospection ne part par ce moteur.
- **La purge RGPD** efface `parcoursComptes`, `envoisCroissance` et la société dans Twenty.

### 2.10 Les erreurs

- Twenty absent ou en panne : file d'attente, aucune erreur visible du gérant.
- Resend absent : les conseils ne partent pas et rien n'est noté envoyé (ils partiront au créneau
  suivant).
- Claude absent ou en échec : le point brut part.
- Une étape mal déduite se corrige d'elle-même au relevé suivant ; une date déjà notée ne se
  réécrit pas.

### 2.11 Les tests

- Fonctions pures : la lecture de la source, la déduction des étapes, l'éligibilité de chaque
  message (créneau, cadence, étape franchie, réglage coupé), le score, la règle de décision.
- Barrières : la frontière de `src/lib/croissance/`, le cloisonnement des nouvelles tables, le
  lexique et le mot interdit sur les textes des messages et des variantes, et un test qui vérifie
  que la charge envoyée à Twenty ne porte aucun champ de montant ni de débiteur.

### 2.12 Ce que le fondateur aura à faire

**Maintenant :**

1. Donner l'adresse du point du lundi : `npx convex env set FONDATEUR_EMAIL …` (en production).
2. Créer une clé de lecture Umami : `npx convex env set UMAMI_API_KEY …` (facultatif : sans elle,
   le point du lundi le dit et s'en passe).

**Au seuil de Twenty :**

3. Créer le compte Twenty, puis une clé d'API : `npx convex env set TWENTY_API_KEY …` et
   `TWENTY_API_URL`.
4. Demander à Twenty la région d'hébergement de son offre en ligne (non publiée), pour la
   politique de confidentialité.

## 3. Ce qui n'est pas dans ce sous-projet

- Aucun écran de tableau de bord dans le produit.
- Aucune prospection (sous-projet 2), aucun outil gratuit ni page sourcée (sous-projet 3), aucune
  montée en gamme, reconquête ni parrainage en action (sous-projet 4 : ce moteur les mesure
  seulement), aucun espace cabinet (sous-projet 5).
- La Search Console arrive avec le sous-projet 3, avec les pages qu'elle mesure.
