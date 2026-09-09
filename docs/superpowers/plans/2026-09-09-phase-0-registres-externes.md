# Les registres externes — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended)
> or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Que le produit sache, chaque matin, qu'un débiteur est passé en procédure collective — et
qu'il le dise avant que le client n'engage des frais dessus.

**État au 9 septembre 2026.** Le prérequis est levé : `pays/france/siren.ts` valide la clé de contrôle,
le numéro est relevé à l'extraction et persisté à l'import. **Mais aucun débiteur déjà en base n'en
porte** — le champ n'a jamais été écrit avant ce jour. Le radar ne couvrira donc que ce qui entre
après, jusqu'à ce que le stock soit rattrapé (§ « Les deux blocages »).

---

## Les deux blocages, nommés avant tout le reste

**1. La clé API Sirene n'est pas obtenue.** La normalisation SIRET (1.3) l'exige. C'est gratuit et la
feuille de route la place en semaine 1 — mais c'est une démarche, pas une ligne de code, et rien ne
peut être écrit contre l'API sans elle. `SIRENE_API_KEY` n'existe pas dans `.env-convex.schema`.

> **Ce que ça bloque exactement :** rattraper le SIREN des débiteurs déjà en base à partir de leur
> raison sociale. Sans Sirene, le seul rattrapage possible est la saisie par le gérant.

**2. Le stock de débiteurs n'a pas de SIREN.** Trois voies, non exclusives :
- **La saisie par le gérant**, sur la fiche débiteur. Ne dépend de personne, et le gérant CONNAÎT ses
  clients. C'est la voie la plus rapide, et elle est dans ce plan (tâche 1).
- **Le prochain import**, qui relève désormais le numéro imprimé sur la facture.
- **Sirene**, quand la clé arrive.

**Aucun des deux blocages n'empêche la tâche 1 ni les tâches 3 à 5.**

## Ce que l'API BODACC rend, vérifié le 9 septembre 2026

Relevé en interrogeant l'API, pas recopié d'une documentation. Base ouverte, **sans clé**.

```
GET https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/
    annonces-commerciales/records
    ?where=familleavis%3D%22collective%22 AND dateparution%3D%222026-09-09%22
    &limit=100&offset=0
```

Champs utiles d'un enregistrement :

| Champ | Contenu | Remarque |
|---|---|---|
| `id` | `A202601721671` | Identifiant d'annonce, stable. Sert d'idempotence. |
| `dateparution` | `2026-09-09` | La date de PARUTION, pas celle du jugement. |
| `familleavis` | `collective` | Valeurs réelles : `dpc`, `modification`, `creation`, `radiation`, `collective`, `vente`, `immatriculation`, `divers`, `conciliation`, `retablissement_professionnel`, `inconnue`. |
| `registre` | `["853479236", "853 479 236"]` | **Le SIREN, en deux graphies.** C'est la clé de rapprochement. |
| `jugement` | **chaîne JSON** | `{type, famille, nature, date, complementJugement}`. À parser, et le parsing peut échouer. |
| `commercant` | `M.B FOOD` | Pour l'affichage, jamais pour le rapprochement. |
| `tribunal`, `url_complete` | | La source citable, à afficher telle quelle. |

**Volume :** 3,3 millions d'annonces `collective` au total, d'où la conception en **delta quotidien**
et non en balayage.

## La règle de classification, et pourquoi elle n'invente rien

⚠️ **Le produit ne lit pas le droit ; il cite la taxonomie du registre.** Toutes les annonces
`collective` ne disent pas qu'une entreprise est insolvable : un « Jugement d'interdiction de gérer »
vise une PERSONNE, pas la solvabilité de la société. Classer soi-même la `nature` en état de santé
serait une lecture juridique — exactement ce que `CLAUDE.md` interdit.

| Ce qu'on lit | Ce qu'on en fait |
|---|---|
| `familleavis === 'collective'` ET `jugement.famille === "Jugement d'ouverture"` | `santeFinanciere` → `PROCEDURE_COLLECTIVE` |
| `familleavis === 'radiation'` | `santeFinanciere` → `RADIEE` |
| Toute autre annonce `collective` | **Le constat est enregistré et affiché ; la santé ne bouge pas.** |

Dans les trois cas, le constat porte la `nature` VERBATIM, la date du jugement, le tribunal et
`url_complete`. Le gérant lit le registre, pas notre interprétation.

**Le doute ne profite jamais au produit** — mais ici il ne profite pas non plus au débiteur : une
annonce non classée s'affiche quand même, elle ne se traduit simplement pas en état.

## L'exception au multi-tenant qu'on ne prendra PAS

`docs/blueprint/B-PRODUIT-TECH.md` § 5 l'annonce : « Le radar de solvabilité tentera d'introduire la
première exception — mutualiser un cache BODACC entre clients serait efficace. »

**On ne le fait pas, et on n'en a pas besoin.** Le delta quotidien est récupéré UNE fois, appliqué aux
débiteurs concernés, puis jeté. La donnée publique atterrit uniquement là où elle est déjà pertinente :
sur la fiche débiteur du client, déjà cloisonnée. Aucune table hors organisation, aucune ligne à
ajouter à la purge RGPD, et la doctrine « rien n'est mutualisé, donc rien n'est épargné » tient
telle quelle.

---

## Task 1 : Le gérant renseigne le SIREN de son débiteur

**Files:** `src/lib/convex/recouvrement/debiteurs.ts` *(modifier ou créer)*,
`src/routes/app/debiteurs.tsx`, tests des deux côtés.

- [ ] **Step 1 : Tests qui échouent** — la mutation refuse un numéro dont la clé ne tombe pas, avec un
  message qui NOMME le numéro reçu ; elle accepte les graphies espacées ; elle refuse d'écrire sur un
  débiteur d'une autre organisation.
- [ ] **Step 2 : Écrire la mutation, en passant par `normaliserSiren`.** Ne jamais réimplémenter la clé.
- [ ] **Step 3 : Le champ à l'écran**, sur le volet de preuve du débiteur. Cladd `Input`, taille `lg`
  (c'est une saisie principale), et le refus s'affiche sous le champ — pas dans une alerte.

## Task 2 : Le delta quotidien du BODACC

**Files:** `src/lib/verticales/recouvrement/pays/france/bodacc.ts` *(créer)* + tests.

**Toute la règle est PURE ici, et ne fait aucun appel réseau.** Elle prend un enregistrement brut et
rend un constat, ou dit pourquoi elle n'a pas su le lire.

- [ ] **Step 1 : Tests qui échouent**, sur des enregistrements RÉELS copiés depuis l'API (voir le
  tableau ci-dessus). Couvrir : un jugement d'ouverture de liquidation ; une interdiction de gérer,
  qui ne change PAS la santé ; un `jugement` à `null` ; un `jugement` dont la chaîne JSON est
  invalide ; un `registre` vide ; un SIREN qui ne passe pas sa clé.
- [ ] **Step 2 : Écrire `lireAnnonce(brut): ConstatBodacc | null`.** ⚠️ **Ne lève jamais** —
  `JSON.parse` sur `jugement` échoue tôt ou tard, et une annonce illisible ne doit pas emporter le
  lot du jour.

## Task 3 : L'action qui interroge, et la mutation qui applique

**Files:** `src/lib/convex/recouvrement/radar.ts` *(créer)* + tests, `src/lib/convex/crons.ts`.

- [ ] **Step 1 : Tests qui échouent** — la mutation d'application, alimentée par des constats en
  mémoire (l'action réseau n'est pas testée ici). Vérifier : le rapprochement se fait par SIREN et
  JAMAIS par nom ; un débiteur d'une autre organisation n'est pas touché ; `santePrecedente` est
  conservée pour que `DEBITEUR_DEGRADE` puisse se déclencher ; rejouer le même jour n'écrit rien.
- [ ] **Step 2 : Ajouter `santePrecedente` à `debiteurs`** — et, dans la MÊME tâche, vérifier que la
  purge RGPD et l'export la couvrent (leçon de la tâche 4bis du plan 1 : aucune table ni aucun champ
  cloisonné n'échappe à la purge).
- [ ] **Step 3 : L'action.** Pagination par `offset`, borne dure sur le nombre de pages, et **une
  seule interrogation par jour pour tout le produit** — c'est le sens du delta.
- [ ] **Step 4 : Le cron**, décalé du battement de six heures : le radar doit avoir tourné AVANT que
  le briefing ne parte.

## Task 4 : Le constat à l'écran, et le coupe-circuit

**Files:** `src/ui/`, `src/routes/app/debiteurs.tsx`, `src/routes/showroom.tsx`.

- [ ] **Step 1** — le constat sur la fiche débiteur : la nature verbatim, la date du jugement, le
  tribunal, et le lien vers l'annonce. ⚠️ **Aucun verbe de recommandation.** Le produit écrit « ce
  débiteur fait l'objet d'une procédure collective depuis le 31 août 2026 », jamais « déclarez votre
  créance ».
- [ ] **Step 2** — le coupe-circuit. Aujourd'hui il n'y a aucune relance à suspendre : il se réduit
  donc à un CONSTAT visible sur la fiche et dans le flux. Le brancher sur les relances est le plan 6.
- [ ] **Step 3** — vérification visuelle aux quatre largeurs dans le navigateur intégré.

## Task 5 : Ce qui reste sans réponse s'affiche

- [ ] Un débiteur SANS SIREN ne peut pas être surveillé au registre. Le dire sur sa fiche, avec le
  geste qui lève l'angle mort — saisir le numéro. Un gérant qui croit son débiteur surveillé ne le
  surveille pas lui-même ; c'est la même règle que la prescription, et elle vaut ici mot pour mot.

---

## Ce que ce plan ne fait PAS

- **Aucune déclaration de créance.** C'est une PIÈCE, donc `exigerPourActe()`, donc verrouillé.
- **Aucune interrogation Sirene** tant que la clé n'est pas obtenue.
- **Aucun cache BODACC mutualisé** (voir ci-dessus).
- **Aucune suspension de relance**, faute de relances. Plan 6.
- **Aucun rapprochement par raison sociale**, jamais, à aucune condition.
