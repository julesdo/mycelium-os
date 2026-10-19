# CRM admin : où brancher les parcours de prospection (état au 19/10/2026)

Je n'ai modifié aucun fichier. Les numéros de ligne correspondent aux fichiers tels qu'ils sont aujourd'hui.

**Trois blocages à régler avant de coder :**
1. **Phrase de source contraire à la CNIL.** Le pied des e-mails et la phase manuelle écrivent « J'ai trouvé vos coordonnées sur l'annuaire public des entreprises ». L'audit rappelle que la CNIL proscrit les adresses collectées sur des annuaires ou des sites.
2. **Barème public absent du registre.** Ni le taux BCE + 8 points, ni l'indemnité publique, ni la prescription de quatre ans comptée depuis le 1er janvier suivant n'existent dans `parametres.ts`. L'estimation ne peut rien calculer tant qu'ils n'y sont pas, avec leur source.
3. **Scripts et e-mails hors des barrières de texte.** `src/lib/crm/` n'est balayé ni pour le mot interdit, ni pour les verdicts, ni pour le lexique.

---

## 0. Ce qui existe et se réutilise tel quel

**Tables** (`src/lib/convex/admin/tables.ts`)
- `prospects` (l. 98-129) : index `by_statut`, `by_email`, `by_siren`, `by_compte`, `by_cree`.
- `oppositions` (l. 131-135) : empreinte SHA-256 de l'adresse e-mail seulement.
- `evenementsCrm` (l. 137-146) : index `by_org` et `by_prospect` seulement.
- `tachesCrm` (l. 148-161) : origine limitée à `'MAIN' | 'SCORE'`.
- `importsProspects` (l. 163-171).
- Trois validateurs à côté : `vStatutProspect` (l. 69-78, huit statuts), `vCible` (l. 80, `PME | CABINET | AUTRE`), `vTypeEvenementCrm` (l. 82-88).

**Enveloppe** (`admin/enveloppe.ts`)
- `equipeQuery` / `equipeMutation` (l. 77-89), `equipeAction` dans `admin/action.ts`.
- `noterAuJournal` (l. 92-111). Son union d'actions doit rester alignée sur `journalEquipe.action` (`tables.ts` l. 48-60).

**Mutations des prospects** (`admin/prospects.ts`)
- `creer` (l. 192-217), `modifier`, `changerStatut` (l. 236-261, avec un événement `STATUT`), `remettreStatuts`.
- `stop` (l. 295-330) : efface les coordonnées, met l'empreinte sur la liste d'opposition, clôt les tâches, écrit au journal `PROSPECT_EFFACE`.

**Historique** (`admin/historique.ts`)
- `noter` (l. 51-95). Avance le statut sans jamais le reculer (l. 82-92).
- `emailEcrit` (l. 103-144). Refuse un prospect en STOP (l. 114) et pose la prochaine action via `SUITE_DES_ETAPES`.

**Modèle de la recherche externe** : le couple `annuaire.ts` + `annuaireLecture.ts`.
- `chercher` est une action (l. 94-127) ; `ajouter` revérifie les doublons par SIREN (l. 129-173).
- `sirensConnus` vit dans un fichier séparé, exprès, pour éviter le cycle `internal.<son module>` (`annuaireLecture.ts` l. 4-8).

**Précédent pour la désinscription** (`croissance/conseils.ts`)
- Jeton tiré au premier envoi (l. 141-146).
- `desinscrire` en `internalMutation` (l. 227-239).
- `desinscriptionConseils` en `httpAction` (l. 254-266) : un GET montre une page, seul le POST désinscrit (les antivirus ouvrent les liens).
- Routé dans `http.ts` l. 49-50.

---

## 1. Champ « parcours » et ses étapes

**Recommandation : garder les statuts communs et ajouter une étape propre à chaque parcours.**

Le statut est lu à environ 60 endroits répartis sur 12 fichiers :
- `entonnoirs.ts` : `RANG` (l. 52-61) ;
- `compteurs.ts`, `prospects.ts` (`liste`, `changerStatut`, `stop`) ;
- `import.ts` : `statutDe` (l. 81-92 du fichier) ;
- `historique.ts`, `croissance/releve.ts` : `rapprocher` pose INSCRIT (l. 154) ;
- `entretien.ts` : épargne INSCRIT (l. 17-19) ;
- `prospects.tsx` (24 occurrences).

Le statut reste donc l'état de la relation (contacté, a répondu, perdu, STOP), qui alimente l'entonnoir global et l'opposition. L'avancement commercial propre à chaque parcours devient un champ à part.

**Module pur à créer : `src/lib/crm/parcours.ts`**, un registre sur le modèle de `SECTEURS` (`crm/annuaire.ts` l. 56-81).

```ts
export type Parcours = 'FOURNISSEUR_PUBLIC' | 'TRANSPORTEUR' | 'EXPERT_COMPTABLE' | 'PME_LOGICIEL' | 'PILOTE';
export const PARCOURS: Record<Parcours, {
  libelle: string;
  etapes: readonly { cle: string; libelle: string; rang: 0|1|2|3|4 }[]; // rang = colonne de ETAPES_DE_PROSPECTION
  emailPermis: boolean;      // PILOTE / PUBLIC : téléphone d'abord
  source: 'DECP' | 'ANNUAIRE' | 'MAIN';
}>;
export function parcoursParDefaut(cible: Cible, activite?: string): Parcours; // CABINET → EXPERT_COMPTABLE, 49.41 → TRANSPORTEUR, sinon PME_LOGICIEL
```

**Étapes proposées, à faire trancher par le fondateur :**

| Parcours | Étapes | Ce qui est vendu |
|---|---|---|
| Fournisseur public | Estimé → Appelé → Pièces demandées → Devis envoyé → Payé → Courriers remis | Réclamation clé en main |
| Transporteur | Appelé → Factures reçues → Calcul montré → Gagné | Réclamation ou abonnement |
| Expert-comptable | Appelé → Démo → Convention signée → Premier client apporté | Marque blanche, 20 % de la première année |
| PME logiciel | Routine actuelle (e-mails J+4, J+10) → Inscrit | Abonnement, offre fondateurs |
| Pilote | Qualifié (Sage / Cegid / EBP) → Rendez-vous → Proposition → Signé → Bilan à 90 jours | 2 500 € sur 90 jours |

**Branchements dans `tables.ts`**
- Ajouter `vParcours` à côté de `vCible` (l. 80).
- Sur `prospects` (l. 98-129), ajouter `parcours: v.optional(vParcours)` et `etapeParcours: v.optional(v.string())`. L'étape se valide contre le registre dans la mutation.
- Ajouter l'index `.index('by_parcours', ['parcours', 'creeLe'])`.
- **Champs optionnels obligatoires** : les prospects existants n'ont pas ces champs, et Convex valide la base au déploiement. Lire `parcours ?? parcoursParDefaut(cible)`, ou passer une reprise unique.
- Aligner `vParcours` sur les clés du registre par un `Record<Parcours, …>` témoin, comme `_secteurs` (`annuaire.ts` l. 33-46).

**Un statut « gagné »**
- Aujourd'hui, seul INSCRIT veut dire gagné, et c'est la machine qui le pose. Une réclamation payée ou un pilote signé n'est pas une inscription.
- Il faudrait ajouter `GAGNE` dans : `vStatutProspect`, `STATUTS_PROSPECT` / `LIBELLES_DES_STATUTS` (`statuts.ts` l. 8-29), `statutClos` (l. 41-43), `RANG` (le `Record` fait échouer la compilation si on l'oublie), et le filtre d'`entretien.ts` l. 18.

**Côté serveur, dans `prospects.ts`**
- `vLigneProspect` (l. 26-39) et `ligne()` (l. 41-56) : ajouter `parcours`, `etapeParcours`, `dateButoir`, `montantEstimeCentimes`.
- `liste` (l. 58-87) : ajouter l'argument `parcours: v.optional(vParcours)`.
- `vChampsProspect` (l. 126-143) et `champsPropres` (l. 150-180) : ajouter `parcours`.
- Nouvelle mutation `changerEtape`, calquée sur `changerStatut` (l. 236-261), qui écrit un événement de type `ETAPE`.
  - Ajouter `ETAPE` à `vTypeEvenementCrm`.
  - Côté écran, `commun.tsx` : `TypeEvenementCrm` (l. 38), `ICONES` (l. 141-147), `TITRES` (l. 149-154), `evenementAffiche` (l. 157-178).

**Les trois endroits qui créent des prospects** doivent poser le parcours :
- `prospects.ts` l. 208 ;
- `importer.ts` l. 101-108, via `ProspectImporte` (`crm/import.ts`, interface l. 18-36 du fichier) et `CHAMPS_IMPORT` (`crm/colonnes.ts` l. 10-37) ;
- `annuaire.ts` l. 160-165, via `versProspect` (`crm/annuaire.ts` l. 353-364) : TRANSPORT donne Transporteur, CABINETS donne Expert-comptable.

---

## 2. La feuille « Appel » : script, issue de l'appel, 10 appels par jour

**Données**
- Ajouter à `evenementsCrm` (`tables.ts` l. 137-146) :
  - `issue: v.optional(vIssueAppel)` ;
  - l'index `.index('by_auteur_and_le', ['auteur', 'le'])`, sans lequel on ne peut pas compter les appels du jour.
- `vIssueAppel`, proposition : `PAS_DE_REPONSE | MESSAGE_LAISSE | BARRAGE | A_RAPPELER | PAS_INTERESSE | INTERESSE | EMAIL_ACCEPTE | RDV | STOP`.
- Ajouter à `prospects` `emailInformeLe: v.optional(v.number())`, posé par l'issue `EMAIL_ACCEPTE` (voir section 4).

**Modules purs à créer**
- `src/lib/crm/appels.ts` :
  - `APPELS_PAR_JOUR = 10` ;
  - `effetDeLIssue(issue, statut, maintenant)`, qui rend le statut suivant (jamais en recul, même règle que `historique.ts` l. 82-92), la prochaine action et sa date (`jourDeRelance`, `modeles.ts` l. 296-303).
  - Pas de tâche créée : les prospects vivent de `prochaineAction` / `prochaineActionLe`, comme le fait `emailEcrit`.
- `src/lib/crm/scripts.ts` : un script par parcours (ouverture, questions, phrase, demande, objections).
  - S'inspirer de `docs/croissance/phase-manuelle.md` §4-5.
  - Lire les chiffres de la loi via `valeurs-loi.ts` et les prix via `config/tarifs.ts` (`GRILLE`, l. 47). §5 cite encore « 12, 39 ou 119 € ».

**Serveur**
- Nouveau fichier `src/lib/convex/admin/appels.ts` :
  - `noterUnAppel` (`equipeMutation('SUPPORT')`) : insère l'événement `APPEL` avec son issue, applique `effetDeLIssue`, et pour `STOP` appelle l'aide partagée extraite de `stop` (section 4).
  - `fileDAppels` (`equipeQuery('LECTURE')`) : prospects non clos avec téléphone, à échéance avant la fin du jour, triés fournisseurs publics d'abord (date butoir croissante, puis montant), sans ceux déjà appelés aujourd'hui.
- **Garder `historique.noter` type APPEL pour les comptes** : la fiche d'un compte s'en sert.
- `compteurs.ts` (l. 13-77) : ajouter `appelsDuJour`, compté pour `ctx.equipier.email` depuis le début du jour à Paris (`bornesDuJourDeParis`).

**Écrans**
- Nouveau `src/screens/admin/appel.tsx` → `FeuilleDAppel`, sur `FeuillePleinEcran`, avec dans l'ordre :
  - un bouton `tel:` ;
  - le bloc d'estimation pour un fournisseur public ;
  - le script ;
  - les issues en `CarteBouton` ;
  - un `selecteur-date` pour « À rappeler » ;
  - le champ libre ;
  - un seul bouton plein dans le pied.
- Dans `screens/admin/fiche.tsx` :
  - l'action rapide « Appel noté » (l. 109-114) devient « Appeler » pour un prospect ;
  - ajouter les props `appeler?: ReactNode` et `onNoterAppel?`, sur le modèle de `ecrire` et `onNoterEmail` (l. 74-76) ;
  - remplacer `FeuilleDEchange type="APPEL"` (l. 183-188) quand elles sont fournies. La fiche d'un compte n'est pas touchée.
- Branchement dans `routes/admin/prospects.$id.tsx` (gestes l. 71-137) et `screens/admin/fiche-prospect.tsx` (appel de `CorpsDeFiche` l. 320-365).
- `EvenementCrm` (`commun.tsx` l. 40-46) et `deLaFiche` (`historique.ts` l. 19-27, 41-47) : renvoyer `issue` pour afficher « Appel : pas de réponse ».
- **File d'appels** : nouvelle route `src/routes/admin/appels.tsx` avec son écran `src/screens/admin/appels.tsx`.
  - Progression « 3 / 10 », une carte qui ouvre la feuille sur place, puis la suivante.
  - Au téléphone, une carte « Appels du jour » en tête de `EcranAujourdhuiAdmin` (`screens/admin/aujourdhui.tsx` l. 83-131) et un champ dans `admin/aujourdhui.ts` `resume` (l. 15-72).
  - **Ne pas réutiliser le nom `aAppeler`** : il désigne déjà les comptes à score ≥ 60 dans `aujourdhui.ts`, dans `compteurs.aAppeler` et dans la vue « À appeler » de la barre latérale.

---

## 3. Estimation chiffrée (fournisseurs publics) et sourçage par les DECP

**Champs sur `prospects`**
- À plat, pour trier et indexer : `montantEstimeCentimes: v.optional(v.int64())`, `dateButoir: v.optional(v.string())` (format AAAA-MM-JJ), `estimationSource: v.optional(v.string())`.
- Le détail : `estimation: v.optional(v.object({ segments: v.array(v.object({ acheteur, annee, montantMarcheCentimes: v.int64(), joursDeRetard, interetsCentimes: v.int64(), indemnitesCentimes: v.int64() })), hypotheses: v.array(v.string()), calculeeLe: v.number() }))`.
- Les montants en centimes `int64` partout, comme le reste du produit. L'estimation est décomposée par segment parce qu'elle sera refaite à la main par le prospect.
- Index `by_parcours_and_butoir`.
- `fiche` (l. 89-124) renvoie le détail ; `ligne()` renvoie montant et date butoir.

**Module pur à créer : `src/lib/crm/estimation.ts`**
- `estimerFournisseurPublic(marches, jour, bareme)`.
- **Il dépend de valeurs absentes du registre.** Aujourd'hui, `taux.ts` a `TAUX_BCE_PAR_SEMESTRE` (l. 74) et `MAJORATION_L441_10 = 1000n` (l. 61, non exportée, c'est la majoration de 10 points).
- Il manque, avec source, date et `verifie` (dans `parametres.ts` ou un nouveau `pays/france/commande-publique.ts`) :
  - la majoration publique de 8 points ;
  - l'indemnité publique ;
  - les délais de paiement plafonds ;
  - la prescription de quatre ans « à partir du 1er janvier suivant ». `dateDePrescription` (`prescription.ts` l. 210) ne la sait pas calculer.
- Lire ces valeurs avec `exiger()` (`parametres.ts` l. 1079). Un semestre absent lève une erreur, sans extrapoler. Ne recopier aucun article de mémoire.
- Le retard moyen d'un acheteur (statistique de l'Observatoire des délais de paiement, par exemple 71 jours pour les hôpitaux) est une hypothèse sourcée et datée, pas une valeur juridique. Elle peut vivre dans `src/lib/crm/`.
- Ajouter le prix de la réclamation (5 %, 290 à 2 000 €) dans `config/tarifs.ts`. La grille ne doit vivre que là.

**Sourçage DECP**
- Fichiers à créer : `src/lib/crm/decp.ts` (lecture et validation, sur le modèle de `lireReponseDeLAnnuaire`, `crm/annuaire.ts` l. 310-344) et `src/lib/convex/admin/decp.ts`.
  - `chercherDecp` (`equipeAction`) : `fetch` avec `AbortSignal.timeout` et gestion du 429, comme `annuaire.ts` l. 65-90. Réutiliser `internal.admin.annuaireLecture.sirensConnus` avec les 9 premiers chiffres du SIRET.
  - `ajouterDecp` (`equipeMutation`) : écrit le prospect avec son estimation, une entrée dans `importsProspects` et une ligne au journal (motif `annuaire.ajouter`).
- Ne pas stocker le jeu de données entier (il est trop gros) : une requête par recherche.
- **La ressource et les noms de colonnes des DECP n'ont pas été vérifiés.** Les relever sur data.gouv.fr avant d'écrire le lecteur.
- Le montant d'un marché est un montant notifié, pas un montant facturé. L'écrire dans les hypothèses : un doute ne doit jamais gonfler le chiffre.
- Écran : ajouter une première étape « Quel parcours » à `ParcoursTrouver` (`screens/admin/trouver.tsx`, étapes l. 71) plutôt que créer une route. Les fournisseurs publics passent par les DECP, les autres par l'annuaire.
- Ajustements de `crm/annuaire.ts` selon le parcours :
  - Pilote : `TRANCHES_VISEES` (l. 39) et `categorie_entreprise=PME` (l. 136) excluent les ETI et les 50 salariés et plus ;
  - Transporteurs sous-traitants : on voudra sans doute les tranches 00 et 01 ;
  - `ZONES` (l. 87-109) ne couvre que l'Île-de-France.
  - Les valeurs exactes des paramètres de l'API restent à vérifier.

**Affichage de la date butoir** : compte à rebours à l'encre seulement, sans couleur de seuil (règle rappelée dans `ui/admin.tsx` l. 22-24).

---

## 4. E-mail seulement vers une adresse générique ou une personne informée, avec désinscription

**La règle, vérifiée côté serveur et côté écran**
- Champs sur `prospects` : `emailBase: v.optional(v.union(v.literal('GENERIQUE'), v.literal('INFORMEE')))`, plus `emailInformeLe` (section 2).
- Fonction pure `adresseGenerique(email)` dans `src/lib/crm/consentement.ts` (contact@, info@, accueil@…).
- Serveur : refuser dans `emailEcrit` (`historique.ts` l. 111-114) si la base est absente. Vérifier aussi dans `creer` / `modifier` quand une adresse est saisie.
- Écran : la condition `redaction` (`fiche-prospect.tsx` l. 135-147) gagne `&& emailPermis(fiche)`. Sinon, la feuille propose d'appeler d'abord.

**Textes à corriger**
- `PIED_LEGAL` (`crm/modeles.ts` l. 188-189) devient `piedLegal({ base, lienDesinscription, appeleLe })` dans `composerEmail` (l. 234-271).
- `redaction-email.tsx` l. 77-79 envoie chercher l'adresse « sur le site… ses mentions légales » : limiter à une adresse générique.
- `phase-manuelle.md` §2 (l. 40-41) répète la phrase de source.
- LinkedIn : `composerLinkedIn` (`modeles.ts` l. 274-287), `redaction-email.tsx` l. 104-110, `fiche-prospect.tsx` l. 144. La direction ne veut pas de LinkedIn : à retirer.

**Un jeton par prospect**
- `jetonDesinscription: v.optional(v.string())` et `.index('by_jeton_desinscription', ['jetonDesinscription'])`.
- Tiré par une aide commune aux trois créations (`prospects.ts` l. 208, `importer.ts` l. 102, `annuaire.ts` l. 160).
- Reprise des prospects existants par une `internalMutation`, par exemple dans `admin/entretien.ts`, lancée avec `npx convex run --prod`.
- Rendu par `fiche` pour que l'écran compose le lien. `composerEmail` s'exécute dans le navigateur (`fiche-prospect.tsx` l. 139).

**Extraire la logique de `stop`**
- Sortir de `prospects.ts` l. 295-330 une aide `arreterLeProspect(ctx, p, auteur)`, appelée par `stop`, par l'issue STOP de l'appel et par la page publique. Pour la page publique, `auteur = 'désinscription'` dans `noterAuJournal`.
- **Trou à combler** : un prospect sans e-mail ne laisse aucune empreinte dans `oppositions`. Et `entretien.ts` l. 17-19 efface aussi les STOP après trois ans. Le blocage par SIREN d'`annuaire.ajouter` (l. 143-147) disparaît alors et le prospect peut revenir. Épargner STOP dans `entretien.ts` (il ne garde déjà plus de coordonnées).

**Page publique : deux options**
- **A (recommandée, précédent existant).**
  - Un `httpAction` dans un nouveau `src/lib/convex/prospection/desinscription.ts`, hors de `admin/` puisque toute fonction publique de `admin/` doit passer par l'enveloppe.
  - Une `internalMutation`, routée dans `http.ts` après la l. 50 (GET et POST).
  - GET montre la page, POST désinscrit. Même réponse pour un jeton inconnu.
  - Aucune nouvelle fonction dans `api`, aucune route TanStack. Inconvénient : le lien affiche le domaine `convex.site` dans un e-mail à froid.
- **B (lien sur letikette.com).**
  - Route `src/routes/desinscription.$jeton.tsx` et une `mutation` nue. Ce serait la deuxième exception publique après `pageDePaiement` (`recouvrement/paiement.ts` l. 104, dont l'en-tête dit « le seul endroit du produit qui l'est ») : à documenter.
  - Ajouts obligatoires :
    - une entrée `ATTEINTS_AUTREMENT` (`aucun-ecran-orphelin.test.ts` l. 47-121) ;
    - l'exclusion de la mesure d'audience : garde Umami (`app/analytique.ts` l. 45-47), `__root.tsx` l. 69-71, `source-visite.ts` l. 18 ;
    - aucune indexation par les moteurs.
- **Pas de `List-Unsubscribe`** : l'envoi passe par `mailto:` depuis la messagerie de l'équipier, donc le lien vit dans le corps du message.

**Experts-comptables** : pour les 20 %, `codePartenaire` sur le prospect cabinet. L'attribution passe par `utm_campaign` dans `parcoursComptes.source`, table déjà permise à l'admin. Le calcul de la commission est hors CRM.

---

## 5. Barre latérale et vues par parcours

**Barre latérale** (`src/app/coquille-admin.tsx`)
- Dans `GROUPES` (l. 151-309), insérer après « Fiches » (l. 158) un groupe `{ cle: 'parcours', titre: 'Parcours', destinations: [...] }`.
  - Cinq entrées `vers: '/admin/prospects'`, `recherche: { parcours: '<CLE>' }`, `compte: 'parcoursPublic'` (et ainsi de suite).
  - Dans « Travail » (l. 157), ajouter `{ cle: 'appels', libelle: 'Appels du jour', vers: '/admin/appels', compte: 'appelsRestants' }`.
- `vueAllumee` (l. 321-329) compare chaque clé de la recherche. Une vue `?vue=` et un parcours peuvent s'allumer ensemble : vider `vue` quand on choisit un parcours.
- `surUneFiche` (l. 366-371) : toute nouvelle sous-route sous `/admin/prospects/` doit entrer dans le `(?!importer|trouver)`. Sinon la barre du bas disparaît, la page étant prise pour une fiche.

**Compteurs**
- `compteurs.ts` : ajouter des champs plats, car `Destination.compte` est un `keyof Compteurs` affiché par `String()` (l. 352-361).
- `routes/-salle/admin.tsx` l. 582-595 passe un littéral `Compteurs` : il cessera de compiler. Les données de démonstration `PROSPECTS` (l. 250-300) ont aussi besoin d'un parcours.

**Route et écran des prospects**
- `routes/admin/prospects.index.tsx`, `validateSearch` (l. 28-38) : ajouter `parcours`. Le passer à `useQuery(api.admin.prospects.liste, { vue, parcours })` (l. 55), sur le modèle de l'optimiste existant (l. 58-71).
- `screens/admin/prospects.tsx` :
  - kanban (l. 457-490) : les colonnes deviennent les étapes du parcours, et le dépôt d'une carte appelle `changerEtape` ;
  - entonnoir (l. 492-524) : nouveau `entonnoirDuParcours` dans `lib/admin/entonnoirs.ts`, avec la règle « a atteint au moins » par `rang` ;
  - les vues `PME` / `CABINETS` (`prospects.ts` l. 22-23, `prospects.tsx` l. 74-75) font doublon avec les parcours.

---

## 6. Pièges et tests concernés

**`admin-tables.test.ts` l. 18-42**
- Toute nouvelle table lue dans `convex/admin/` doit figurer dans `TABLES_AUTORISEES` ; la regex est `query\(\s*'(\w+)'`.
- Le plus simple : aucune nouvelle table, tout passe par des champs de `prospects` et `evenementsCrm`.

**`recherche-cloisonnee.test.ts` l. 212-215**
- Un index de recherche sur `prospects` exige une entrée dans `REFERENTIELS`, avec sa raison.
- Le test des l. 338-346 passe : `prospects` n'a pas d'`organizationId`, seulement `compteId`.

**`fonctions-appelees.test.ts` l. 175-177**
- Le rapprochement se fait sur le seul nom : `api.[\w.]*\bnom\b`.
- Une nouvelle `noter` paraîtrait appelée grâce à `api.admin.historique.noter` sans l'être. Choisir des noms uniques (`noterUnAppel`, `fileDAppels`, `changerEtape`, `chercherDecp`) et les appeler depuis une route.

**`aucun-ecran-orphelin.test.ts`**
- `/admin/appels` est atteint par la clé `vers:` de la coquille (l. 199-204).
- Une page publique (option B) a besoin d'une entrée dans `ATTEINTS_AUTREMENT`.

**`purge-complete.test.ts` l. 80-100** : ne mord que si une table nouvelle porte un `organizationId`. Il faudrait alors l'ajouter à `rgpd.ts`.

**`champs-alimentes.test.ts` l. 146** : ne lit que `recouvrement/tables.ts`. Les nouveaux champs de `prospects` ne sont pas vérifiés : chercher leurs écritures à la main.

**`mots-interdits.test.ts` l. 29-38, `aucun-verdict.test.ts` l. 21-28, `lexique.test.ts` l. 19-50**
- `src/lib/crm` n'est dans aucun. Ajouter `join('src','lib','crm')` au moins aux deux premiers.
- Aujourd'hui, seul `modeles.test.ts` l. 106-120 protège les textes envoyés aux prospects.

**Tests à mettre à jour**
- `modeles.test.ts` l. 82 : vérifie la phrase « répondez « stop » ». À changer avec le nouveau pied.
- `crm.test.ts` l. 29 : vérifie 26 colonnes. Une colonne `parcours` change ce compte ; mettre aussi à jour `docs/croissance/prospection.csv`.
- `annuaire.test.ts` l. 188-215 (`versProspect`), `entonnoirs.test.ts`, `crmReleve.test.ts` (INSCRIT posé par `rapprocher`).

**Pièges Convex**
- Annoter le type de retour d'un handler qui appelle `internal` de son propre module, et isoler les `internalQuery` dans un fichier à part (comme `annuaireLecture.ts`). Sinon tout `api` retombe sur `any`.
- Nouveaux champs en `v.optional` seulement.

**Pièges écran**
- `useQuery` doit venir de `app/donnees`, jamais de `convex/react`.
- Un bouton Cladd posé dans un `<form>` l'envoie : lui donner `type="button"`.
- Les valeurs Tailwind arbitraires ne s'écrivent que dans `src/ui/`.
- Aucune couleur de seuil pour le compte à rebours de la date butoir.

---

## 7. Ordre de livraison suggéré

1. **Le parcours** : registre, champ `parcours` et étapes, statut `GAGNE`, création aux trois endroits, vues de la barre latérale, compteurs, salle de démonstration.
2. **La feuille « Appel »** : issues, scripts, `noterUnAppel`, index, file des 10 appels.
3. **E-mail et désinscription** : `emailBase`, le jeton, l'extraction de `arreterLeProspect`, le nouveau pied, la page publique, STOP épargné par l'effacement.
4. **Fournisseurs publics** : barème public dans le registre (prérequis, sources à relever), `estimation.ts`, `decp.ts`, étape « Quel parcours » dans `trouver`.
5. **Pilote et experts-comptables** : `logicielComptable`, tranches ETI, `codePartenaire`.