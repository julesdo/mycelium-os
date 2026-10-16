# L'interface admin — le socle et le CRM (16/10/2026)

> Demande du fondateur, le 16/10/2026 : « on va juste développer l'admin » (Twenty abandonné), puis
> « spec puis construction et inspire-toi sur Mobbin des meilleurs CRM et admin pour produire la
> meilleure UX possible ».
>
> **Décisions du fondateur, le même jour :** l'admin porte, en plus du CRM, les abonnements et
> revenus, le support client, le pilotage de la machine, la santé technique et les coûts ; **une
> équipe avec des rôles** ; **`/admin` dans l'application** (approche A) ; la conception ci-dessous
> est validée (« Oui, spec puis construction »).
>
> Ce document est le **sous-projet 1 de l'admin** : le socle (accès, rôles, double
> authentification, coquille, journal) et le CRM. Les modules suivants (revenus, support, pilotage,
> santé et coûts) auront chacun leur spec ; ils se branchent sur ce socle sans le modifier.

---

## 1. Ce qui change dans les règles du projet

CLAUDE.md disait : « Rôles : `ORG_ADMIN`, `ORG_MEMBER`. **Aucun rôle staff.** » Il dira : **une
équipe Letikette à rôles (`FONDATEUR`, `SUPPORT`, `LECTURE`), hors des établissements, qui ne voit
jamais le contenu d'un dossier.**

- **Ce que l'équipe voit d'un client :** l'établissement (nom, SIREN, ville, date de création), la
  formule et le statut de paiement, les membres (nom, e-mail, rôle, dernière visite), le parcours
  (source, étapes, score) et les conseils envoyés.
- **Ce qu'elle ne voit jamais :** les débiteurs, les factures, les montants, les documents, les
  courriers, les conversations avec Plume. **Une barrière exécutable** le tient (§ 8).
- **Chaque ouverture d'une fiche client est notée** dans un journal que le fondateur lit.
- **Les prospects sont des données de Letikette**, pas d'un établissement : leurs tables sont
  exemptées nommément du cloisonnement, comme l'annuaire des avocats, et portent leur propre cadre
  légal (source notée, opposition, effacement après trois ans sans réponse).

## 2. Ce que Mobbin a appris (relevé du 16/10/2026)

| Motif | Référence | Ce qu'on en garde |
|---|---|---|
| Une fiche en deux colonnes : l'identité et les champs groupés à gauche, l'historique à droite | [Twenty](https://mobbin.com/screens/4b51a4dc-265c-44bb-9c58-7e85e3731258), [Attio](https://mobbin.com/screens/cf4f2b49-652f-4c76-8a7c-1ea4f57c10cf) | la fiche d'un compte et d'un prospect au bureau |
| Les tâches dues **épinglées en tête** de l'historique (« Focus ») | [Pipedrive](https://mobbin.com/screens/88631280-beda-4e91-b556-6c4a7630bf4a) | « À faire » au-dessus de l'historique |
| Des **gestes rapides** sous le nom : note, appel, e-mail, tâche | [HubSpot](https://mobbin.com/screens/344a79cd-4663-471c-b710-dd920abd0718), [Mesh](https://mobbin.com/screens/b0801735-2da0-4e1d-b325-68114d7d99c0) | quatre gestes, comme `ActionsRapides` de la fiche client |
| Au téléphone : l'identité, ses faits en rangées, deux segments « Historique / Détails », le composeur collé en bas | [Linktree](https://mobbin.com/screens/6ee4c663-f1ab-45b7-af70-9fe1934c7dec), [Attio iOS](https://mobbin.com/screens/83ca81e1-1d87-432a-b862-8ee43f7ed0e1), [Shopify](https://mobbin.com/screens/a8c48554-1b59-4a4a-8e5d-e0a4446a16c8) | la fiche sous 1024 px |
| Des **vues prédéfinies en pastilles** au-dessus d'un tableau | [Calendly](https://mobbin.com/screens/222efb40-20b0-4c1c-9736-2e73661e420a), [HubSpot](https://mobbin.com/screens/a190c9b3-0b08-496f-b45d-aac65e94423b) | « À appeler », « Sans prochaine action », « Inscrits cette semaine » |
| Le **statut changé dans la ligne**, puis « Changé · Annuler » | [Juicebox](https://mobbin.com/screens/4370b80b-b6e5-4404-8343-72a57659a9a9), [HubSpot](https://mobbin.com/screens/a190c9b3-0b08-496f-b45d-aac65e94423b) | le mot de Plume après un geste, avec « Annuler » |
| Une **barre d'actions groupées** en bas quand des lignes sont cochées | [Attio](https://mobbin.com/screens/1a0a43ec-94de-408f-b53a-338c4674a124), [ClickUp](https://mobbin.com/screens/dd452938-3574-42ae-8c31-963b42d3b390) | changer le statut ou le responsable de plusieurs prospects |
| Un **pipeline en colonnes** avec leur compte, et une carte qui signale « aucune prochaine action » | [Attio](https://mobbin.com/screens/e275641a-a3e8-440a-b53e-983bb9cec7c7), [HubSpot](https://mobbin.com/screens/924adecd-ba3c-4bbf-82e9-36a972e5eeaf), [Pipedrive](https://mobbin.com/screens/fa0efe82-ea90-4864-ae99-ca3dd822c77b) | le pipeline des prospects au bureau ; au téléphone, une liste groupée par statut |
| Des tâches **groupées avec leur compte** | [Linear](https://mobbin.com/screens/610d34b6-6ad8-45ab-80fb-2107b31ed01e), [Wrike](https://mobbin.com/screens/285661c3-e29a-4576-80dc-5fa66a7dcb27) | « En retard », « Aujourd'hui », « Plus tard », « Faites » |
| Inviter par e-mail avec le rôle **dans la même ligne**, et chaque rôle **décrit** dans son menu | [Lyssna](https://mobbin.com/screens/249efdbd-e4f4-4fc7-a442-97f80c2c9a68), [Profound](https://mobbin.com/screens/9e3c1d33-2363-40fe-b581-fb72fafabb00) | l'écran Équipe |
| Un journal **groupé par jour**, en phrases, filtrable par auteur | [Toggl](https://mobbin.com/screens/2deef352-1f6b-4757-a4c9-dcce106b0e6a), [PlanetScale](https://mobbin.com/screens/d7448333-6400-49dd-b11f-e48e4e229200) | le journal de l'équipe |
| La double authentification **sur place** : le QR, « Vous ne pouvez pas le scanner ? », le code à six chiffres, puis les codes de secours | [Braintrust](https://mobbin.com/flows/e7c9eacd-5388-4e3d-a25d-092da52b1131), [Docusign](https://mobbin.com/flows/8b94661f-96d5-47b1-952e-50408ec8dd18) | la rangée « Double authentification » du profil |
| L'import en étapes : le fichier, les colonnes associées seules avec un aperçu des valeurs, la vérification, l'import ; un historique des imports | [Intercom](https://mobbin.com/flows/c7c65d83-e2e9-4de0-85a4-aebf6b295b79), [Rox](https://mobbin.com/flows/3d307696-63db-486b-91e8-10d5f7f85b77) | l'import du tableur de prospection |

**Ce qu'on n'en garde pas :** les champs vides en rangées infinies (Attio : « Set Description… »),
les quarante colonnes, les pipelines de devis et de prévisions, l'IA qui résume tout : la règle du
produit reste « chaque question, un seul endroit », un bouton plein par écran, et aucune couleur de
seuil pour dire qu'une tâche est en retard (« En retard de 2 j », à l'encre).

## 3. L'accès, les rôles, la double authentification

### 3.1 L'équipe

- **Table `equipe`** : `email` (en minuscules), `userId` (posé quand la personne se connecte),
  `role` (`FONDATEUR`, `SUPPORT`, `LECTURE`), `invitePar`, `inviteLe`, `rejointLe`, `retireLe`.
- **Les droits :**

| Rôle | Voir | Écrire au CRM (notes, tâches, prospects, import) | Gérer l'équipe, lire le journal |
|---|---|---|---|
| `LECTURE` | oui | non | non |
| `SUPPORT` | oui | oui | non |
| `FONDATEUR` | oui | oui | oui |

- **Le premier fondateur** s'amorce par une commande interne :
  `npx convex run --prod admin/equipe:amorcer '{"email":"…"}'` (refusée s'il existe déjà un
  fondateur).
- **Inviter** : le fondateur saisit un e-mail et un rôle ; un e-mail part (« Rejoindre l'équipe de
  Letikette », coquille commune) avec un lien vers l'inscription ou la connexion. La personne se
  connecte avec un compte dont **l'adresse est vérifiée** et qui correspond : le serveur la
  rattache (`userId`, `rejointLe`). Une invitation se retire tant qu'elle n'est pas acceptée.
- **Retirer** un membre pose `retireLe` ; son accès tombe au prochain appel. Le dernier fondateur
  ne peut ni se retirer ni changer son rôle.

### 3.2 L'enveloppe côté serveur

Toutes les fonctions de `src/lib/convex/admin/` passent par `equipeQuery`, `equipeMutation` ou
`equipeAction`, avec le rôle minimal exigé. L'enveloppe vérifie, dans l'ordre, et refuse en nommant
ce qui manque :

1. une session (sinon : « Connectez-vous. ») ;
2. une adresse vérifiée appartenant à l'équipe, non retirée (sinon : « Réservé à l'équipe de
   Letikette. ») ;
3. la double authentification active sur le compte (sinon : « Activez la double authentification
   dans votre profil. ») ;
4. le rôle suffisant (sinon : « Votre rôle ne permet pas ce geste. »).

Une requête `admin/acces:monAcces` (sans enveloppe) dit au navigateur où en est la personne :
`{ etat: 'HORS_EQUIPE' | 'DOUBLE_AUTH_REQUISE' | 'OK', role? }`.

### 3.3 La double authentification

- **Le module `twoFactor` de Better Auth** (application d'authentification, codes à six chiffres,
  dix codes de secours), émetteur « Letikette ». Le schéma du composant Better Auth gagne
  `user.twoFactorEnabled` et la table `twoFactor`, ajoutés à la main comme l'a été la table des clés
  d'accès (le générateur se bloque sur `passkey`).
- **L'activer**, dans Votre compte, puis Votre profil, rangée « Double authentification », sur
  place : le mot de passe, le QR, « Vous ne pouvez pas le scanner ? » (la clé en clair), le code à
  six chiffres, puis les codes de secours à copier.
- **À la connexion**, un compte qui l'a activée passe par une page « Code de vérification »
  (`/connexion/verification`) : le code de l'application, ou un code de secours.
- Elle est offerte à tous les comptes ; elle n'est **obligatoire que pour l'équipe**.

### 3.4 Le journal de l'équipe

- **Table `journalEquipe`** : `userId`, `action`, une `cible` (type, identifiant, libellé lisible),
  `organizationId` quand l'action touche un établissement, `le`.
- **Notées :** l'ouverture d'une fiche client, l'ajout, le changement de rôle et le retrait d'un
  membre, un import de prospects, l'effacement d'un prospect.
- **Lu par le fondateur**, groupé par jour, en phrases (« Camille a ouvert la fiche de Menuiserie
  Dupont »), filtrable par membre.
- Les lignes qui portent un établissement partent avec lui à la purge.

## 4. La coquille

- **Des routes `/admin/*`** chargées à part : rien de l'admin n'entre dans le paquet de
  l'application.
- **La garde** lit `monAcces` : hors équipe, une page sobre « Réservé à l'équipe de Letikette » ;
  double authentification manquante, une page qui mène à la rangée du profil.
- **Au bureau** (`lg:`), la barre latérale de la coquille existante (`ui/coquille-bureau.tsx`), avec
  ses groupes : **Aujourd'hui**, **Comptes**, **Prospects**, **Tâches** ; puis **Équipe** et
  **Journal** (fondateur). Les modules suivants y ajouteront leur entrée. La barre du haut porte le
  titre, la recherche (`⌘K` / `Ctrl K` : comptes et prospects) et « Ajouter un prospect ».
- **Au téléphone**, une barre du bas à quatre onglets (Aujourd'hui, Comptes, Prospects, Tâches) ;
  Équipe et Journal sont dans le menu de l'en-tête.
- **L'entrée** : une rangée « Admin » dans Votre compte, pour les seuls membres de l'équipe.

## 5. Les écrans

### 5.1 Aujourd'hui

Le premier écran : **les tâches du jour** (en retard d'abord), **les comptes à appeler** (score ≥ 60,
sans tâche faite depuis sept jours), **les derniers inscrits** avec leur source. Trois groupes,
chacun avec son compte ; une ligne mène à sa fiche.

### 5.2 Comptes

- **La liste** : tous les établissements. Vues en pastilles : **Tous**, **À appeler** (score ≥ 60),
  **En essai**, **Abonnés**, **À risque**, **Inscrits cette semaine**. Recherche par nom ou SIREN.
  Au bureau, un tableau (nom, formule, étape atteinte, score, source, inscrit le) ; au téléphone,
  des cartes (`CarteLien` : avatar, nom et score, étape et date).
- **La fiche** (au bureau, deux colonnes ; au téléphone, une page) :
  - en tête, l'avatar, le nom, la formule, et les quatre gestes rapides : **Note**, **Appel noté**,
    **E-mail** (la messagerie, à l'adresse du premier administrateur), **Tâche** ;
  - à gauche (au téléphone, le segment « Détails ») : l'établissement, l'abonnement, le parcours
    (les étapes sur une frise, le score et ses raisons, la source), les membres et leur dernière
    visite ;
  - à droite (le segment « Historique ») : **À faire** épinglé, puis l'historique groupé par jour :
    notes, appels, e-mails notés, étapes franchies, conseils de Plume envoyés ;
  - le composeur de note est collé en bas.
- **L'ouverture d'une fiche s'inscrit au journal.**

### 5.3 Prospects

- **Deux présentations sur le même état** : la **liste** (tableau au bureau, cartes au téléphone)
  et, au bureau seulement, le **pipeline** en colonnes par statut, avec leur compte ; on glisse une
  carte pour changer son statut. Au téléphone, la liste se groupe par statut.
- **Statuts** : À contacter, Contacté, Relancé, A répondu, Intéressé, Inscrit, Perdu, Stop.
- **Vues en pastilles** : **Tous**, **Sans prochaine action**, **À relancer** (prochaine action
  due), **Intéressés**, et une par cible (**PME**, **Cabinets**).
- **Une carte** porte l'entreprise, la ville et l'activité, le responsable, et sa prochaine action
  avec sa date, ou « Aucune prochaine action » (le signal qui manque le plus, selon Pipedrive et
  HubSpot).
- **Changer un statut** se fait dans la ligne, puis le mot de Plume « Statut changé · Annuler ». Des
  lignes cochées font paraître une barre en bas : changer le statut, le responsable.
- **La fiche** suit la forme de celle d'un compte (gestes, À faire, historique, composeur), avec
  les champs du tableur et la source légale du contact (« Trouvé où »).
- **Ajouter un prospect** : une page pleine (`FeuillePleinEcran`) ; le SIREN se cherche au registre
  (la recherche par nom de l'inscription) et remplit l'entreprise, l'activité, la ville et le
  dirigeant.
- **Stop** (le prospect ne veut plus être contacté) : une confirmation, puis les coordonnées
  personnelles (dirigeant, fonction, e-mail, téléphone) sont effacées, l'empreinte de l'e-mail entre
  dans la liste d'opposition (`oppositions`), et le prospect reste en « Stop » sans coordonnées.

### 5.4 L'import du tableur

En étapes, sur `PleinEcran` comme le dépôt au coffre : **le fichier** (le CSV de
`docs/croissance/prospection.csv`, séparateur `;` ou `,`, encodage UTF-8 avec ou sans BOM) → **les
colonnes** (associées seules par leur titre, chacune avec trois valeurs d'exemple, modifiables) →
**la vérification** (les lignes qui entreront, les doublons par e-mail ou SIREN, les lignes en
opposition, les lignes sans entreprise) → **le résumé**. Rien ne s'écrit avant « Importer ». Chaque
import est gardé (`importsProspects` : fichier, comptes, auteur, date).

### 5.5 Tâches

Groupées **En retard**, **Aujourd'hui**, **Plus tard**, **Faites (7 derniers jours)**, chacune avec
son compte. Une ligne : la case, le titre, la fiche liée, la date relative, le responsable. Une
tâche se coche d'un toucher ; « Faite · Annuler ». Une tâche « Appeler » se crée seule quand un
compte atteint le score de 60 (`SEUIL_APPELER`), une fois par compte.

### 5.6 Équipe et journal (fondateur)

- **Équipe** : une ligne d'invitation (e-mail, rôle, « Inviter ») ; les membres avec leur rôle,
  changeable dans un menu qui décrit chaque rôle ; les invitations en attente, retirables. Chaque
  membre montre si sa double authentification est active.
- **Journal** : groupé par jour, en phrases, filtrable par membre.

## 6. Les données

| Table | Contenu | Cloisonnée par établissement |
|---|---|---|
| `equipe` | les membres de l'équipe et les invitations | non, exemptée nommément |
| `journalEquipe` | ce que l'équipe a fait | `organizationId` facultatif, purgé avec l'établissement |
| `prospects` | les prospects | non, exemptée nommément (données de Letikette) |
| `oppositions` | les empreintes des e-mails qui ne veulent plus être contactés | non, exemptée nommément |
| `evenementsCrm` | notes, appels, e-mails notés, changements de statut | `organizationId` facultatif (fiche d'un compte), purgé avec lui |
| `tachesCrm` | les tâches | `organizationId` facultatif, purgé avec lui |
| `importsProspects` | l'historique des imports | non, exemptée nommément |

- **Le rapprochement** : au relevé des étapes (`croissance/releve.ts`), un établissement qui n'a pas
  encore de prospect lié cherche un prospect par l'e-mail de ses administrateurs ou par son SIREN ;
  trouvé, le prospect passe « Inscrit » et pointe vers le compte, une fois.
- **L'effacement légal** : chaque nuit, les prospects sans contact depuis trois ans (hors
  « Inscrit ») partent, avec leurs notes et leurs tâches.

## 7. Ce que ce sous-projet ne fait pas

- Ni revenus, ni support, ni pilotage, ni santé et coûts (sous-projets 2 à 5 de l'admin).
- Ni lecture de Gmail, ni envoi d'e-mails depuis l'admin (un « E-mail » ouvre la messagerie), ni
  séquences (le métier d'Instantly, à son seuil).
- Ni connexion à la place d'un client. Le module `admin` de Better Auth hérité du gabarit n'est
  utilisé par rien ici.

## 8. Les tests et les barrières

- **L'enveloppe** : refuse sans session, hors équipe, membre retiré, adresse non vérifiée, double
  authentification inactive, rôle insuffisant ; accepte un fondateur valide.
- **La barrière des tables** (`admin-tables.test.ts`) : les fonctions de `src/lib/convex/admin/` ne
  lisent qu'une liste fermée de tables (`organizations`, `organizationMembers`, `profilsCreancier`,
  `parcoursComptes`, `envoisCroissance`, `journeesPlume`, `pilotes`, et les tables de l'admin) ; un
  `query('facturesVente')` ou toute autre table de contenu fait échouer le test.
- **Le cloisonnement et la purge** : les tables exemptées le sont nommément ; `journalEquipe`,
  `evenementsCrm` et `tachesCrm` sont purgées avec l'établissement.
- **La lecture du CSV** (pure) : séparateurs, guillemets, BOM, colonnes reconnues par leur titre.
- **L'import** : doublons, oppositions, lignes sans entreprise.
- **Le rapprochement** d'un prospect avec un compte.
- **L'opposition** : efface les coordonnées et bloque la réimportation.
- **Le lexique et le mot interdit** balaient les écrans de l'admin.

## 9. Ce que le fondateur fait

1. Après la livraison : `npx convex run --prod admin/equipe:amorcer '{"email":"julescamilledore@gmail.com"}'`.
2. Activer la double authentification dans Votre compte, puis Votre profil.
3. Ouvrir `/admin`.

## 10. Un vrai CRM : la barre latérale, les vues, le glisser-déposer, les entonnoirs (16/10/2026, le soir)

Le fondateur, sur le premier jet : « un vrai CRM avec la sidebar spécifique du CRM […] du drag &
drop, des funnels, plusieurs types de vue […] le plus pratique », puis « utilise la meilleure
bibliothèque la plus UX pour le D&D ». Second relevé Mobbin :

| Motif | Référence | Ce qu'on en garde |
|---|---|---|
| Une barre latérale de CRM : les fiches avec leur compte, des vues enregistrées en favoris | [Attio](https://mobbin.com/screens/8415dcfb-b1f0-46b2-adf3-278d1aa56b3f), [Twenty](https://mobbin.com/screens/68c2f8c3-60b2-4294-9e73-b674998b0713), [Lightfield](https://mobbin.com/screens/f980c294-2702-4919-b6c1-502ab6f66e75) | Travail (Aujourd'hui, Tâches et ce qui est dû), Fiches (Comptes, Prospects), Vues (À appeler, En essai, Sans prochaine action, À relancer, Intéressés), Analyse (les deux entonnoirs), L'équipe |
| Le type de vue se choisit au-dessus de la liste : Tableau, Kanban | [folk](https://mobbin.com/screens/52fc6a41-6623-4e5f-9df0-86fe982abf0f), [Salesforce](https://mobbin.com/screens/cba24f64-2916-451d-af96-27b50f63ced6), [Lightfield](https://mobbin.com/screens/286453a7-c2c7-49cc-903c-37b80361b351) | Tableau (colonnes triables), Kanban, Liste, Entonnoir ; le choix se garde et se partage par l'adresse (`?affichage=`) |
| Le kanban : une colonne par étape avec son compte, des cartes qu'on glisse | [Pipedrive](https://mobbin.com/screens/2ff3c977-7902-48b5-8361-0c89710e5c2e), [HubSpot](https://mobbin.com/screens/fedd9c09-b271-46a7-819c-956f51723a30), [Attio](https://mobbin.com/screens/a2b97705-be0b-44a3-84ec-522316c873bf), [Attio iOS](https://mobbin.com/screens/a84efb46-b3c6-45c2-a707-edfdf6654ab7) | prospects : on glisse pour changer le statut, à la souris, au doigt (appui long) et au clavier ; comptes : en lecture, leurs étapes se déduisent |
| L'entonnoir : des barres, le taux de passage entre deux étapes, la liste de l'étape choisie | [Pipedrive](https://mobbin.com/screens/4da10f16-370a-44ad-9c53-ccaff0346bc9), [Squarespace](https://mobbin.com/screens/1fb0830e-e657-4cba-bcdd-6c8bf12b51d7), [Zoho](https://mobbin.com/screens/1e4a6562-64ce-4fd3-b084-dbca596cc589) | prospection (ajoutés → contactés → ont répondu → intéressés → inscrits) et parcours des comptes (inscrits → … → abonnés), sur la vue en pastilles choisie |

- **Le glisser-déposer passe par dnd-kit** (`@dnd-kit/core`, `@dnd-kit/sortable`, versions
  épinglées) : capteurs souris, doigt (appui long, pour ne pas voler le défilement) et clavier,
  défilement automatique au bord, copie de la carte qui suit le pointeur, animation à la pose.
  Changer de statut reste possible sans glisser (le menu de la carte, celui de la ligne).
- **Un entonnoir compte ce qui a ATTEINT AU MOINS une étape** (`lib/admin/entonnoirs.ts`) : un
  compte abonné sans avoir activé ses relances a passé l'étape des relances, un prospect perdu a
  répondu. Aucune couleur de seuil : les barres sont à l'encre.
- **Au téléphone** : Liste, Kanban (colonnes qui défilent, comme Attio iOS) et Entonnoir ; le
  tableau est réservé au bureau.
