# La machine de croissance — le moteur et l'activation (16/10/2026)

> Demande du fondateur, le 16/10/2026 : « la meilleure growth machine pour Letikette avec les
> méthodes les plus efficaces, un système qui s'auto-améliore. Un CRM home made ou un CRM pas trop
> cher pour l'interface. »
>
> **Décisions du fondateur, le même jour :** l'interface est **Twenty** (en ligne) ; la machine agit
> **seule dans un cadre** (il valide chaque variante, elle promeut seule la gagnante) ; la conception
> ci-dessous est validée (« Oui, écris la spec »).

---

## 1. Ce que la recherche a établi

Relevé le 16/10/2026 ; les sources sont citées dans la conversation du jour et résumées ici.

1. **À 12-119 € par mois, un commercial ne se rembourse pas.** Sous environ 3 000 € de panier
   annuel, ce qui marche est l'essai qui convertit, le référencement, et la recommandation. Le taux
   d'activation (la part des inscrits qui franchissent le geste clé) est la métrique qui prédit le
   mieux la conversion, et seule une minorité d'éditeurs la suit.
2. **Les cabinets comptables sont le canal des TPE.** 80 à 90 % des petites entreprises clientes de
   Pennylane y sont venues par leur cabinet ; Qonto offre un an au cabinet et trois mois à ses
   clients, plus un annuaire. **Mais** l'Ordre a resserré en septembre 2026 la rémunération des
   cabinets par un tiers : pas d'apport d'affaires sans prestation réelle, information préalable du
   client. On les rétribue en outil, pas en commission.
3. **Personne ne propose un générateur de relance qui calcule.** Sur « mise en demeure facture
   impayée », la première page est faite de modèles Word (Legalstart, Indy, independant.io).
   Google sanctionne les pages produites en série sans donnée propre (mise à jour de mars 2026) :
   chaque page de Letikette porterait un vrai calcul.
4. **La facture électronique est le sujet de l'année.** Réception obligatoire pour toutes les
   entreprises depuis le 1er septembre 2026, émission pour les PME et TPE au 1er septembre 2027.
   Les catalogues d'applications des plateformes (Pennylane vise 500 applications en 2026) sont un
   canal.
5. **Aucune boucle virale ne passe par le débiteur** : nos courriers ne nomment pas Letikette (ligne
   rouge n° 1, surfaces vers un tiers). Les boucles viennent du gérant (parrainage), du cabinet (un
   cabinet → N clients) et du contenu.

Contraintes qui en découlent : Resend interdit les envois de prospection en masse (domaine séparé
et outil d'envoi dédié pour le sous-projet 4) ; en B2B, la prospection par e-mail se fait sans
consentement préalable mais avec information et lien de désinscription ; le produit est cloisonné
par établissement et n'a aucun rôle « équipe Letikette », donc **le CRM vit dehors et ne reçoit que
des données de compte, jamais un débiteur ni un montant**.

## 2. La machine entière, en quatre sous-projets

Chacun aura sa spec et son plan. Celui-ci ne porte que le premier.

| # | Sous-projet | Ce qu'il apporte |
|---|---|---|
| 1 | **Le moteur et l'activation** (ce document) | la mesure de chaque étape par source, les e-mails de Plume, le score, Twenty, les expériences, le point du lundi |
| 2 | Les outils gratuits et les pages sourcées | générateur de relance et de mise en demeure chiffrée, taux des pénalités du semestre, délai pour agir par secteur, pages par métier |
| 3 | Les cabinets, le parrainage, les catalogues | espace cabinet gratuit, un mois offert de chaque côté, Pennylane / Qonto / Xero / QuickBooks |
| 4 | La prospection documentée | cibles par code d'activité et taille (API Recherche d'entreprises), estimation de ce qu'elles laissent filer, domaine séparé |

**Pourquoi le moteur d'abord :** chaque levier suivant se mesure avec lui, et l'activation rend
rentable tout le trafic, existant comme à venir.

## 3. Le moteur et l'activation

### 3.1 Où ça vit

- **`src/lib/croissance/`** — la logique pure : les étapes, le score, la règle de décision des
  expériences, l'éligibilité des messages, la lecture de la source. Il n'importe ni `verticales/`
  ni `convex/` (même frontière que le socle, tenue par un test).
- **`src/lib/convex/croissance/`** — les tables, les mutations internes, les tâches planifiées,
  l'envoi vers Twenty, les e-mails, le point du lundi.
- **Aucun écran dans le produit.** Ce qu'on regarde se lit dans Twenty et dans le point du lundi.
  Les fonctions sont `internal*`, sauf deux, liées au gérant lui-même : enregistrer la source de son
  inscription, et régler « Les conseils de Plume » dans son profil.

### 3.2 Les tables

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

### 3.3 La mesure

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

**Les étapes se DÉDUISENT de l'état, elles ne s'écrivent pas à la main.** Une seule fonction,
`releverLesEtapes(organizationId)`, lit l'état courant et note la date de chaque étape nouvellement
atteinte. Elle est appelée après les mutations ci-dessus (par `ctx.scheduler.runAfter(0, …)`, sans
rien bloquer) et par une tâche horaire sur les établissements actifs. Le code de facturation
(`paddle.ts`, `billing.ts`) **n'est pas modifié** : les étapes d'abonnement se lisent sur
l'établissement.

Umami continue de mesurer le trafic anonyme ; la croissance ne lui envoie rien de plus.

### 3.4 Les e-mails de Plume

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

### 3.5 Le score

Un indice de 0 à 100, calculé par une fonction pure aux règles nommées (comme
`risque/regles.ts`) :

- les étapes atteintes (le plus fort poids : `MONTANT_REVELE`, `RELANCES_ACTIVEES`) ;
- la fraîcheur de la dernière activité ;
- la taille, en tranches (nombre de factures déposées : 1-20, 21-100, plus de 100) ;
- l'intérêt montré pour une formule (ouverture de la page de paiement) ;
- l'équipe (un membre invité).

Le score se recalcule avec les étapes. Il n'est montré qu'au fondateur, dans Twenty et dans le
point du lundi.

### 3.6 Twenty

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

### 3.7 Les expériences

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

### 3.8 Le point du lundi

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

### 3.9 Le cadre légal

- **La politique de confidentialité** passe à une nouvelle version : l'accompagnement à
  l'utilisation (étapes, score) et les conseils par e-mail comme finalités, Twenty comme
  prestataire, la durée de conservation (celle du compte), le droit d'opposition (le réglage du
  profil et le lien de chaque e-mail).
- **Les conseils sont des communications relationnelles** sur le service souscrit, avec opposition
  simple ; aucune prospection ne part par ce moteur.
- **La purge RGPD** efface `parcoursComptes`, `envoisCroissance` et la société dans Twenty.

### 3.10 Les erreurs

- Twenty absent ou en panne : file d'attente, aucune erreur visible du gérant.
- Resend absent : les conseils ne partent pas et rien n'est noté envoyé (ils partiront au créneau
  suivant).
- Claude absent ou en échec : le point brut part.
- Une étape mal déduite se corrige d'elle-même au relevé suivant ; une date déjà notée ne se
  réécrit pas.

### 3.11 Les tests

- Fonctions pures : la lecture de la source, la déduction des étapes, l'éligibilité de chaque
  message (créneau, cadence, étape franchie, réglage coupé), le score, la règle de décision.
- Barrières : la frontière de `src/lib/croissance/`, le cloisonnement des nouvelles tables, le
  lexique et le mot interdit sur les textes des messages et des variantes, et un test qui vérifie
  que la charge envoyée à Twenty ne porte aucun champ de montant ni de débiteur.

### 3.12 Ce que le fondateur aura à faire

1. Créer le compte Twenty, puis une clé d'API : `npx convex env set TWENTY_API_KEY …` et
   `TWENTY_API_URL` (en production comme en développement).
2. Créer une clé de lecture Umami : `npx convex env set UMAMI_API_KEY …`.
3. Donner l'adresse du point du lundi : `npx convex env set FONDATEUR_EMAIL …`.
4. Demander à Twenty la région d'hébergement de son offre en ligne (non publiée), pour la
   politique de confidentialité.

## 4. Ce qui n'est pas dans ce sous-projet

- Aucun écran de tableau de bord dans le produit.
- Aucune prospection (sous-projet 4), aucun outil gratuit (sous-projet 2), aucun parrainage ni
  espace cabinet (sous-projet 3).
- La Search Console arrive avec le sous-projet 2, avec les pages qu'elle mesure.
