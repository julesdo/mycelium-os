# Diagnostic express : du dépôt à la somme en jeu

## Verdict

Le moteur du diagnostic existe déjà : c'est la « révélation » (`verticales/recouvrement/revelation.ts` et `convex/recouvrement/revelation.ts`). L'écran « Ce qui est dû » (`/app/revelation`), le héros de l'accueil et l'étape « J'ai compté » de `/bienvenue` l'affichent déjà. Trois écarts empêchent de l'utiliser tel quel :

1. Les factures soldées sont exclues volontairement, en attendant l'avis d'un juriste.
2. Plusieurs sources posent une date de paiement fausse : le jour de la lecture au lieu du jour du paiement.
3. Lu sur un FEC réel, le résultat est faussé : le lettrage est ignoré et le point de départ des pénalités est la date d'émission.

Côté offre, Découverte n'a pas le droit de brancher Pennylane. Aujourd'hui, seul le chemin FEC/CSV est gratuit et sans coût d'IA.

---

## 1. Le chemin actuel, étape par étape

| Étape | Fichier, symbole | Ce qui se passe |
|---|---|---|
| Inscription | `src/routes/inscription.tsx:78` `authClient.signUp.email`, `:92` `suivre('inscription')`, `:97` → `/bienvenue` | Deux écrans : l'adresse, puis le mot de passe. |
| `/bienvenue` | `src/routes/bienvenue.tsx:63` `ETAPES = ['plume','entreprise','factures','lettres','relances','pret']` | `?etape=`. Quatre écrans précèdent la première valeur : les deux de l'inscription, `plume` et `entreprise`. |
| Entreprise | `bienvenue.tsx:272` `EtapeEntreprise` → `api.organizations.createOrganization` | Crée `parcoursComptes` avec `etapes.INSCRIT` (`organizations.ts:150-162`). INSCRIT date donc la création de l'établissement, pas l'inscription du compte. |
| Factures | `bienvenue.tsx:397` `EtapeFactures`. Écran : `src/screens/premiers-pas/factures.tsx` | 4 états : `A_DEPOSER`, `EN_LECTURE`, `RIEN_D_ECHU`, `COMPTE`. `COMPTE` affiche `revelation.total` (principal + supplément) dans `ChiffreHero defile` avec `CompositionDue`. |
| Dépôt | `src/app/use-coffre.tsx:103-104` → `coffre/coffre.ts:245` `confierAuCoffre` | Insère dans `importsRecouvrement` (`deposeLe`), puis `mode: modeDeLecture(...)` (`import/mode.ts` : PDF, image ou XML donnent `FACTURE_DEPOSEE`, le reste `EXPORT_COMPTABLE`), puis `scheduler.runAfter(0, recouvrement.depot.traiterImport)`. |
| Scellement | `coffre/serrure.ts:117` `lireAuCoffre` | Vérification des octets, SHA-256, AES-GCM. L'original est effacé. Limite : 20 Mo (`socle/coffre/fichiers.ts:19`). |
| Lecture | `convex/recouvrement/depot.ts:185` `traiterImport` | Un FEC ou un CSV passe par `importerExportComptable` (`import/exportComptable.ts:385`), **sans modèle**. Un PDF passe par `lireFactureDeposee` (`depot.ts:112`) : Factur-X d'abord, sans modèle, sinon Claude. |
| Enregistrement | `convex/recouvrement/import.ts:181` `enregistrerImport` | Point de convergence unique : dépôt, Qonto et Nango. Dédoublonne par `by_org_and_reference`. Recalcule `statutPaiement` (`statutDe`, `:161`). Planifie `pilote.relireApresImport` (`:405`). |
| Fin du dépôt | `depotMutations.ts:84` `marquerBilan` | `termineLe`, puis `releverLesEtapes`. |
| Calcul | `convex/recouvrement/revelation.ts:118` `facturesPour` → `:234` `composerRevelation` → `reveler` (pur, `revelation.ts:120`) → `decompterFacture` (`decompte.ts:306`, ordre `PRINCIPAL_DABORD`) | Requête réactive : le chiffre apparaît dès que la mutation d'enregistrement est validée. |
| Affichage | Accueil : `routes/app/index.tsx:248` puis `screens/file.tsx:982` `ChiffreHero` (total) et `:1004` `BandeDAnciennete`. Le détail : `routes/app/revelation.tsx`, `screens/revelation.tsx`, puis `ui/ce-qui-est-du.tsx` et `ui/revelation.tsx:160` `ChocRevelation` (le héros = `supplement`, « Jamais réclamé »). | Le montant défile : `ui/chiffre.tsx:45` `useMontantQuiDefile`, 900 ms depuis zéro, une seule fois par valeur et par session (`DEJA_MONTES`). Rien ne défile sous `prefers-reduced-motion`. |
| Connecteurs | Qonto : `convex/connexions/qonto.ts:282` `synchroniser` et `socle/connecteurs/qonto.ts`. Nango : `convex/connexions/nango.ts:473` `lire`, `socle/connecteurs/nango/lecteurs.ts`, `pennylane.ts`, `commun.ts:178` `factureLue` | Lecture par pages de 100, chaque page enregistrée par `enregistrerImport`. Rattrapage toutes les 6 h (`crons.ts:92,97`). |

---

## 2. Ce qui sert déjà au diagnostic

- **Le calcul** : `reveler()` renvoie `principal`, `interets`, `indemnites`, `supplement`, `total`, les lignes facture par facture et `nonChiffrees`. Les factures qu'il ne sait pas chiffrer sont nommées, jamais retirées du total en silence. `interetsCourusEntre` donne le compteur « depuis hier ».
- **Le moteur sait déjà traiter une facture payée en retard.** `decompte.ts:362-363` :
  ```ts
  const echue = arreteAu > facture.dateExigibilite;
  const enRetard = echue && (principal as bigint) > 0n;
  ```
  Les segments s'arrêtent au règlement (`bornes()`, `:226`), et les 40 € restent dus si le principal était dû à l'échéance (commentaire `:304` : « soldée depuis, elle doit toujours les 40 € »).
- **Le PDF** : le modèle à reprendre est `verticales/recouvrement/piece.ts`, qui produit une description pure et testée, rendue par `ui/piece-decompte.ts` (`rendrePieceEnPdf`, jspdf + autotable). Le chargement à la demande suit `routes/app/dossier.$id.tsx:310-368`.
- **L'e-mail** : le conseil `ce-qui-vous-est-du` (`lib/croissance/conseils.ts:52`, `convex/croissance/conseils.ts:70` `ceQuiEstDu`, `emails/modeles/conseils.ts:78`).
- **Les étapes de croissance** : `lib/croissance/etapes.ts` (`MONTANT_REVELE`), agrégées par source dans le point du lundi (`convex/croissance/point.ts:33`) et dans les entonnoirs de l'admin (`lib/admin/entonnoirs.ts:91-92`).

---

## 3. Les écarts qui bloquent, du plus grave au moins grave

**A. Les factures soldées sont exclues.** `verticales/recouvrement/revelation.ts:97-98` :
```ts
function entreDansLaRevelation(facture, arreteAu) {
	if (facture.statutPaiement === 'SOLDEE') return false;
```
C'est délibéré : `docs/blueprint/01-FRONTIERE-MVP.md:101` pose la question au juriste (« jusqu'où l'indemnité et les intérêts restent réclamables sur une facture dont le principal a déjà été payé »). Pourtant `decompte.ts:304` tranche déjà dans l'autre sens. La règle d'applicabilité doit entrer au registre (`parametres.ts`) avec `verifie`, `valideParAvocat: false` et une source relevée sur Légifrance, pas citée de mémoire. Deux tests verrouillent l'exclusion : `revelation.test.ts:107` et `:254`.

**B. La date de paiement est fausse pour plusieurs connecteurs.** `socle/connecteurs/nango/commun.ts:207` :
```ts
const datePaiement = lu.datePaiement ?? lu.aujourdHui;
```
Pennylane (`pennylane.ts:85-101`), QuickBooks et Sellsy ne transmettent pas de date. Une facture payée reçoit donc un règlement daté du jour de la première lecture. Si les soldées entrent dans le calcul, les pénalités courraient jusqu'à ce jour sur toutes les factures payées. Le défaut existe **déjà** sur les factures partiellement payées, qui sont incluses aujourd'hui. Qonto n'a une vraie date (`paid_at`) que pour une facture entièrement payée (`socle/connecteurs/qonto.ts:118`). Stripe, Xero et Zoho transmettent une date. La table `reglements` (`tables.ts:717`) ne distingue pas une date réelle d'une date de lecture : il faut un champ, par exemple `dateSource`, écrit par `enregistrerImport` dans la boucle `reglementsCumules` (`import.ts:328`).

**C. Un FEC réel est mal lu.**
- **Le lettrage est ignoré.** Un crédit sur un compte 411 n'est rattaché à sa facture que si son `PieceRef` est le numéro de la facture (`exportComptable.ts:284-291`, puis `import.ts:300` `factureParReference`). Dans la plupart des comptabilités, l'encaissement porte la référence de la pièce de banque et se relie à la facture par `EcritureLet`. Le règlement devient alors orphelin, la facture reste impayée et le chiffre est gonflé. La fixture du test (`exportComptable.test.ts:104-121`) suppose le même `PieceRef` des deux côtés. Les colonnes `EcritureLet` et `DateLet` sont dans l'en-tête et ne sont jamais lues.
- **Pas d'échéance, donc départ à l'émission.** `import.ts:270` écrit `dateExigibilite: facture.dateEcheance` (vide pour un FEC). Puis `convex/recouvrement/revelation.ts:64-67` :
  ```ts
  return facture.dateEcheance ?? facture.dateEmission;
  ```
  Conséquence : sur un FEC, les pénalités courent depuis l'émission, et une facture pas encore échue porte déjà 40 €. Le registre ne contient aucun délai de paiement par défaut.
- **Les à-nouveaux** (journal `AN`) deviennent des factures datées de l'ouverture de l'exercice : aucun filtre sur `JournalCode` côté débit (`exportComptable.ts:299`).
- **Séparateurs et variantes** : seuls `['\t', ';', ',']` sont reconnus (`:156`). Un FEC séparé par `|` donne « Format d'export non reconnu ». La variante `Montant` + `Sens` n'est pas détectée (`COLONNES_FEC`, `:51`).

**D. Un FEC est invisible pour le suivi et les e-mails.** `convex/croissance/releve.ts:28-44` (`factureEchueImpayee`) et `convex/croissance/conseils.ts:70` (`ceQuiEstDu`) passent par l'index `by_org_and_echeance`. Un compte venu par FEC n'atteint donc jamais `MONTANT_REVELE` et ne reçoit jamais « Voici ce qu'on vous doit ». `pilote.ts:1459` lit `dateExigibilite ?? dateEcheance` et annonce « aucune facture échue », alors que la révélation compte. Trois lectures de « échu » coexistent.

**E. Découverte ne branche pas Pennylane.** `config/tarifs.ts`, `LIMITES.decouverte.logiciels: 'qonto'`. Refus dans `nango.ts:328-333` (`ouvrirSessionNango`).

**F. Les connecteurs restent à activer.** Nango est inactif sans `NANGO_SECRET_KEY`, Qonto attend sa configuration (`configQonto()`), d'après CLAUDE.md : à vérifier sur la prod. Qonto ne lit que `client_invoices` (le module de facturation de Qonto), pas les virements reçus (`qonto.ts:301`). Pennylane lit tout l'historique, trié par id croissant et sans filtre de date (`lecteurs.ts:187`, `sort: 'id'`). Les trois derniers mois arrivent donc en dernier, et l'horizon couvre six ans (`nango.ts:66` `horizonDeLecture`).

**G. Un gros import se bloque en silence.** `depot.ts:299` appelle `enregistrerImport` en une seule transaction, hors du `try`. Un FEC annuel volumineux peut dépasser les plafonds de Convex : l'import reste figé sur « N factures lues, enregistrement… ».

**H. Un PDF ou une photo n'apporte aucun règlement** (`factureVente.ts:269,280`) : tout ce qui est déposé reste impayé, et chaque lecture coûte de l'IA (section 6). Ce chemin ne convient pas à un diagnostic.

---

## 4. Mesurer le délai avant la première valeur

- **Départ** : `user.createdAt` de Better Auth (lisible par `components.betterAuth.adapter.findOne`, comme dans `croissance/conseils.ts:113`), et `etapes.INSCRIT` pour l'établissement.
- **Arrivée** : à poser là où les données sont connues.
  - Créer une étape `DIAGNOSTIC` dans `lib/croissance/etapes.ts:11` (attention : les entonnoirs dépendent de l'ordre de la liste). La dater **au moment réel**, jamais à `maintenant` : `termineLe` du dépôt (`depotMutations.ts:89`) ou dernière page lue (`nangoDonnees.noterPage`, `qontoDonnees.avancerSynchro`). Aujourd'hui `etapes.ts:89` note `MONTANT_REVELE` « maintenant », et aucun relevé ne part après un import Qonto ou Nango : il faut attendre le cron de 2 h 30 UTC (`crons.ts:40`). Ajouter `releverLesEtapes` à la fin d'`enregistrerImport`.
  - Corriger `factureEchueImpayee` pour lire `dateExigibilite ?? dateEcheance`, puis la règle de départ retenue.
  - Côté navigateur, compléter : ajouter `'diagnostic-affiche'` à `EvenementProduit` (`app/analytique.ts:74-89`, liste fermée), avec une durée en tranches et jamais un montant. À émettre dans `EtapeFactures` au premier passage à `COMPTE`.
- **Lecture des chiffres** : `croissance/point.ts` (le point du lundi) et `lib/croissance/semaine.ts` reprennent les étapes par source sans autre travail. L'audit demande « diagnostics lancés par source » et les ventes qui en découlent. Le délai médian reste à ajouter.

---

## 5. Borner à trois mois pour Découverte

- **La limite** : ajouter `historiqueMois: 3 | null` à `Limites` et à `LIMITES` (`config/tarifs.ts`), la lire par `limitesDeLOrganisation` (`convex/limites.ts:27`).
- **Où l'appliquer** : à la lecture, dans `facturesPour` (`convex/recouvrement/revelation.ts:118`). Remplacer `withIndex('by_org')` par `by_org_and_emission` avec une borne basse élargie d'une marge, puis filtrer en mémoire sur le départ (`departDe`) **ou** un règlement dans la fenêtre (`reglements.by_org_and_date`). On stocke tout (FEC et connecteurs ne coûtent rien) et on borne le calcul. Passer au diagnostic complet ouvre alors le reste sans nouvel import.
- **Ce qui ne se borne pas** : `bilanDesPertes` et la surveillance de la prescription (`surveillance.ts`). Une vieille facture impayée doit continuer d'alerter (CLAUDE.md, auditabilité).
- **Annoncer ce qui est hors période** : un champ `horsPeriode: { nombre, principal }` rendu comme `FacturesNonChiffrees` (règle d'amputation), avec la phrase « calculé sur les trois mois au… ».
- **Horizon des connecteurs pour Découverte** : `horizonDeLecture` (`nango.ts:66`) peut dépendre du palier. Au changement de palier, il faut remettre `connexion.depuis` à zéro pour relire.
- **Lectures payantes** : borner au moment de l'appel au modèle, `depot.ts:169-182`, après l'échec de la lecture Factur-X. Utiliser un compteur par établissement et par mois (`@convex-dev/rate-limiter`, recommandé par `_generated/ai/guidelines.md:320`).
- **Piège du palier** : tant que `PADDLE_FACTURATION_OUVERTE` n'est pas posé, `resolveEffectivePlan` rend `dev`, sans aucune limite (`billing.ts:100`), et un essai rend `equipe` (`:102`). La borne reste invisible jusqu'à l'ouverture de la facturation. Pour la tester : `org.simulatedTier = 'none'`, sans `PADDLE_API_KEY` (`:85-89`).
- **Cohérence entre écrans** : les montants par dossier ou par client viennent d'ailleurs (`convex/recouvrement/lecture.ts`, `decompte.ts`). Si seule la révélation est bornée, l'accueil et l'écran Dossiers afficheront deux totaux différents. Il faut le dire à l'écran ou borner partout.

---

## 6. Ce qui coûte de l'IA par document

| Source | Modèle ? | Où |
|---|---|---|
| FEC, CSV | **Non** | `importerExportComptable`, pur |
| PDF Factur-X, XML CII | **Non** | `socle/documents/facturx.ts:306` (`unpdf`), `:251` |
| XML UBL | Refusé, sans modèle | `depot.ts:154-166` |
| PDF sans Factur-X, photo | **Oui** : `claude-opus-5`, `effort: 'low'`, `MAX_TOKENS = 16_000`, jusqu'à 3 essais sur erreur passagère | `socle/documents/extracteur.ts:36-37,169` ; `modele/reprise.ts:11` |
| Connecteurs | Non | traducteurs purs |

**Piège** : l'usage de l'appel est jeté dans `depot.ts:176` (`const { doc } = await extraireAvecClaude(...)`). Il n'est ni enregistré ni plafonné : `CAP_EUR = 10` (`modele/cout.ts`) ne vaut que pour l'ancien circuit EGalim. Rien ne limite non plus le nombre de dépôts en Découverte. Les pièces (`preuve.ts`) et Plume consomment aussi de l'IA, mais hors du chemin du diagnostic.

---

## 7. Produire le rapport (écran, PDF, e-mail)

**Le calcul**
- **Pur** : une fonction, par exemple `diagnostiquer(factures, { du, au }, arreteAu, convention)`, dans `verticales/recouvrement/revelation.ts` ou un fichier voisin. Elle **réutilise `decompterFacture`** (le module interdit une seconde vérité, voir son en-tête) et sépare `impayees`, `payeesEnRetard` (soldées dont le supplément est positif), `horsPeriode` et `nonChiffrees`. Les payées en retard **hors** de `lignes` : sinon `BandeDAnciennete` et le héros de l'accueil (`file.tsx:930`) rangeraient de l'argent déjà encaissé dans « ce qu'on vous doit ».
- **Une soldée sans date de paiement sûre** (voir 3.B) va dans `nonChiffrees`, avec sa raison.
- **Côté Convex** : `authedQuery diagnostic({ du, au, arreteAu })` qui réutilise `facturesPour`, à exporter ou à déplacer. Attention au N+1 : une lecture de `reglements` par facture (`revelation.ts:165`).

**L'écran**
- `src/routes/app/diagnostic.tsx`, `src/screens/diagnostic.tsx`, composants dans `src/ui/`. Le lint n'accepte de classes Tailwind que là.
- Réutiliser `ChiffreHero defile`, `ListeDeReleve`/`LigneDeReleve`, `EnTeteDeGroupe`, `FacturesNonChiffrees`. Ajouter une démo à `routes/-salle/revelation.ts` et `onglets.tsx`, un nom de retour à `screens/titres.ts` et un loader à `app/prechargement.ts`.
- Lire les données par `app/donnees.ts`, jamais par `convex/react` (`donnees-vivantes.test.ts`).
- Dans `/bienvenue`, l'état `COMPTE` (`factures.tsx`) peut mener au rapport.

**Le PDF**
- Une description pure, sur le modèle de `piece.ts` (les fondements lus par `exiger(PARAMETRES…)`, aucun article écrit à la main), et un rendu `ui/rapport-diagnostic-pdf.ts` calqué sur `piece-decompte.ts`, importé à la demande.

**L'e-mail**
- Le conseil `ce-qui-vous-est-du` ne peut pas servir de « rapport immédiat » : `ECART_MINIMAL_MS = 2 * JOUR` (`lib/croissance/conseils.ts:23`) le repousse d'au moins deux jours après `bienvenue`, et le créneau d'envoi (semaine, 9 h à 18 h) s'applique.
- Le rapport doit être un e-mail **transactionnel** : nouveau modèle dans `emails/modeles/` (coquille `disposition.ts`, export dans `index.ts`), envoyé par `resend.sendEmail` depuis la mutation qui clôt le diagnostic ou sur « M'envoyer le rapport ».
- Les deux rappels sur les 14 jours de l'offre de bienvenue passent par `REGLES` (`lib/croissance/conseils.ts:43`) et la liste de valeurs de `convex/croissance/tables.ts:46`.
- `@convex-dev/resend@0.2.3` n'a **pas** de pièces jointes : l'e-mail porte les totaux et un lien, et le PDF se télécharge depuis l'écran.

---

## 8. Fichiers à toucher

- **Calcul** : `verticales/recouvrement/revelation.ts`, `parametres.ts` (applicabilité aux soldées, éventuel délai par défaut), `convex/recouvrement/revelation.ts` (`facturesPour`, `departDe`, nouvelle requête).
- **Lecture du FEC** : `import/exportComptable.ts` (`EcritureLet`, journal `AN`, séparateur `|`, variante `Montant` + `Sens`), `convex/recouvrement/import.ts` (`dateSource` des règlements, relevé des étapes en fin d'import), `depot.ts` (découpage en lots, usage du modèle conservé et plafonné).
- **Connecteurs** : `socle/connecteurs/nango/commun.ts:207`, `pennylane.ts`, `lecteurs.ts:187`, `convex/connexions/nango.ts:66` et `:328`.
- **Offre** : `config/tarifs.ts` (`LIMITES`, `CE_QUI_EST_INCLUS`), `convex/limites.ts`.
- **Mesure** : `lib/croissance/etapes.ts`, `convex/croissance/releve.ts:28`, `convex/croissance/conseils.ts:70`, `app/analytique.ts`, `convex/croissance/point.ts`.
- **Interface** : `routes/bienvenue.tsx:397`, `screens/premiers-pas/factures.tsx`, nouvelle route, écran et composants, `ui/rapport-diagnostic-pdf.ts`, `emails/modeles/`.
- **Schéma** : `convex/recouvrement/tables.ts` (`reglements`, `importsRecouvrement` pour les dates). Un champ facultatif s'ajoute sans risque ; en retirer un casse le déploiement.

## 9. Tests concernés

- **À changer** : `verticales/recouvrement/__tests__/revelation.test.ts` (`:107`, `:254`), `convex/__tests__/revelationRecouvrement.test.ts`, `import/__tests__/exportComptable.test.ts` (fixture de lettrage), `socle/__tests__/connecteurs-nango.test.ts`, `connecteur-qonto.test.ts`, `convex/__tests__/importRecouvrement.test.ts`, `depotRecouvrement.test.ts`, `releveCroissance.test.ts`, `conseilsCroissance.test.ts`, `croissance/__tests__/croissance.test.ts`, `billing.test.ts` (limites).
- **Garde-fous à repasser** : `lib/__tests__/lexique.test.ts` et `aucun-verdict.test.ts` (« dus de plein droit », jamais « à récupérer », jamais « garantie »), `valeurs-juridiques.test.ts`, `app/__tests__/donnees-vivantes.test.ts`, `ui/__tests__/modales-plein-ecran.test.ts`, `plancher-tactile.test.ts`, `socle/__tests__/frontiere.test.ts`.
- **Convex** : annoter le type de retour de toute fonction qui planifie son propre module. Sinon tout `api` retombe en `any`.