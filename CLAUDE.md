# Letikette — Contexte projet

## Vision produit

Letikette est le **logiciel de recouvrement de créances B2B**. Une facture impayée ne fait aucun
bruit le jour où elle devient irrécouvrable — et c'est le seul jour où il aurait fallu agir.

Trois choses sont dues de plein droit et presque jamais réclamées, faute de savoir les calculer :
les **intérêts de retard** au taux BCE majoré de dix points (L441-10 II du code de commerce),
l'**indemnité forfaitaire de 40 €** par facture (D441-5), et le respect du **délai de
prescription**, qui varie par secteur (L110-4 : cinq ans en général, un an sur le transport, deux
sur ce qu'on fournit à un consommateur).

**On vend un logiciel qui mesure, pas du temps humain.** L'import et le rapprochement sont
automatisés ; le dirigeant ne tranche que ce qu'aucune facture ne dit.

## Ce qu'on vend

Un abonnement : import de factures (export comptable ou dépôt de fichiers), surveillance des
échéances et de la prescription, qualification des créances, et décompte arrêté au centime,
explicable période par période.

## ⚠️ Les trois lignes rouges

1. **On ne relance jamais le débiteur au nom du client.** Le recouvrement pour compte de tiers est
   une activité encadrée.
2. **On ne manipule jamais de fonds.** Aucun encaissement, aucun séquestre, aucune commission sur
   ce qui rentre.
3. **On ne recommande jamais une procédure.** Ce serait du conseil juridique. Le produit énonce des
   CONSTATS — « cette créance remplit les conditions X, Y, Z » — jamais « vous devriez engager
   telle procédure ».

Et un mot interdit : **« garantie »**. On ne garantit aucun recouvrement. On **mesure**, on
**documente**, on **alerte**. La décision d'agir reste celle du client.

## Principe anti-dérive

**On ne construit que ce que le journal de friction du terrain désigne**, chronométré. Chaque
fonctionnalité doit répondre à deux questions : quelle tâche manuelle répétée elle supprime, et ce
qu'elle change pour le dirigeant qui paie l'abonnement. Sans réponse chiffrée aux deux, on ne la
construit pas.

## ⚠️ Aucune valeur juridique n'est écrite en dur

C'est la règle la plus stricte du projet, héritée du brief de remodelage.

Toute valeur juridique — taux, délai, montant, mention — vit dans
`src/lib/verticales/recouvrement/parametres.ts`, ou dans un module de pays qu'il référence
(`pays/france/`). Chaque entrée porte sa **valeur**, sa **source**, sa **date de relevé** et
**deux booléens** :

- `verifie` — la valeur a été relevée sur une source publique citable. Suffit à **calculer** : un
  chiffre affiché se corrige. `exiger()` l'exige.
- `valideParAvocat` — un juriste a contrôlé la valeur ET son applicabilité. Suffit à **produire un
  acte** : un chiffre écrit dans une requête qui part au greffe ne se corrige pas.
  `exigerPourActe()` l'exige.

**Ne jamais deviner un article de loi, même de mémoire.** Un numéro inventé recopié dans un
courrier au débiteur est plus dangereux qu'une source absente, parce qu'il a l'air vérifiable.
Relever sur Légifrance, citer, et recouper — les douze taux d'intérêt légal sont vérifiés contre
les planchers publiés indépendamment, ce qui attrape une faute de frappe.

Un semestre absent de la série de taux fait **lever en le nommant**, jamais extrapoler.

## Stack technique

- Frontend : React 19 + TanStack Start (Vite) + TanStack Router
- Backend : Convex (fonctions dans `src/lib/convex/`)
- Auth : Better Auth (install Convex locale)
- UI : Tailwind CSS v4 + Cladd (`@cladd-ui/react`, version epinglee a l'exact)
- IA : Claude API via actions Convex
- Facturation : Paddle · Emails : Resend · Déploiement : Vercel
- Package manager : bun · Tests : Vitest (unit) + verification visuelle au navigateur

## Architecture

- **Multi-tenant strict par `organizationId`**, SANS AUCUNE EXCEPTION. Rien n'est mutualisé entre
  clients : un débiteur, un montant et une échéance sont des données client, toujours. La purge
  RGPD est donc totale, sans exception à justifier.
- Interface **en français uniquement** (le droit applicable est français).
- **Un seul espace : `/app/*`**. Une seule verticale, donc pas de sélecteur de domaine.
- Rôles : `ORG_ADMIN`, `ORG_MEMBER`. Aucun rôle staff.
- **Tablette d'abord**, paysage privilégié, sans casser le téléphone. Cibles tactiles 48 px.

### Socle et verticales — la frontière est un test, pas une convention

Depuis le remodelage (voir `/docs/remodelage/`), le code se lit en trois zones :

- **`src/lib/socle/`** — le moteur. Ingestion multi-format, extraction ligne à ligne,
  normalisation de libellés, dédoublonnage, rapprochement, reprise et coût des appels modèle.
  **Il ne sait pas quelle loi il sert.**
- **`src/lib/verticales/<domaine>/`** — le référentiel, les règles de qualification, les calculs
  du domaine et ses formats de sortie. Seul `recouvrement/` existe ; `egalim/` a été retiré le
  3 septembre 2026. La frontière est maintenue quand même : elle a coûté peu et elle rend une
  seconde verticale possible sans rien défaire.
- **`src/lib/convex/`** — les `query` / `mutation` / `action`, et rien d'autre. La logique
  pure vit hors de ce dossier, ce qui la rend testable sans harnais de plateforme.

**Règle exécutable** : `src/lib/socle/__tests__/frontiere.test.ts` échoue si un fichier du socle
importe `verticales/` ou `convex/`. L'inverse est libre et voulu.

Un verrou d'empreinte protège le prompt système d'extraction : il part avec `cache_control`
`ephemeral`, et le cache Claude ne sert que sur un préfixe identique à l'octet. Un reformatage
innocent multiplie le coût par document sans qu'aucun autre test ne tombe.

## Auditabilité — non négociable

- **Tout montant réclamé est décomposable.** Un décompte porte ses SEGMENTS : quel principal, quel
  taux, sur combien de jours, sur quelle base annuelle. Un total qu'on ne peut pas décomposer est
  un chiffre qu'on demande de croire ; décomposé, il se refait à la main — ce que fera le débiteur
  qui le conteste.
- **Un décompte arrêté est figé, définitivement.** Rejouer produit un NOUVEAU décompte daté. La
  question n'est pas « combien réclame-t-on aujourd'hui » mais « qu'a-t-on réclamé le jour où on
  l'a réclamé ».
- **Les montants sont des entiers de centimes**, en `bigint` côté logique (`socle/montants.ts`) et
  en `v.int64()` côté Convex. Jamais un flottant, du parseur jusqu'à l'écran. La seule division
  arrondie de toute la chaîne est explicite, une par segment.
- **Le doute ne profite jamais au produit.** Un critère indéterminé compte comme absent, jamais
  comme acquis. L'absence de contestation CONNUE n'est pas une absence de contestation.
- **Un acte ne se produit pas sur un décompte incomplet.** `controle.ts` compare la créance à
  toutes les factures connues du débiteur et CHIFFRE ce qui serait abandonné. C'est le seul endroit
  du produit où un refus vaut mieux qu'un résultat : le titre exécutoire ne porte que sur les
  sommes qu'il chiffre, et ce qui n'y figure pas est perdu.
- **Ce que le logiciel ne voit pas s'affiche aussi.** La surveillance déclare ses hypothèses (un
  secteur indéterminé fait retenir le délai de prescription le plus court) et ses angles morts. Un
  utilisateur qui croit sa prescription surveillée ne la surveille pas lui-même.

## Le systeme visuel, et ce qui l'empeche de deriver

L'interface precedente a ete jugee « AI slop » sur quatre plans a la fois :
composition des ecrans, aspect des composants, absence d'identite, parcours.
Trois barrieres l'empechent de revenir, et elles sont cumulatives.

**1. Le kit.** Cladd fournit les controles. On n'en forke aucun, et surtout **on
n'en reinvente aucun** : un `<div>` avec `bg`, `border` et `rounded` est un
`Surface` ; une rangee de boutons est un `Toolbar` ; un choix unique est un
`Segmented` ; un choix multiple un `ToggleGroup` ; une liste verticale une
`List` avec des `ListButton` ; un intitule de section un `SectionTitle`. Les
comportements contextuels (taille propagee, chip qui s'ajuste a sa rangee,
profondeur de surface) n'existent QUE si le vrai composant est dans l'arbre.

**Source de verite : le serveur MCP de Cladd** (`https://cladd.io/mcp`).
`list_components` pour l'inventaire, `get_component` pour les props, et
`get_foundation` pour `quickstart`, `surfaces`, `colors`, `sizing` et surtout
`pitfalls`. **Lire `pitfalls` avant d'ecrire du Cladd non trivial.** Ne jamais
reconstituer l'API en lisant le code compile : c'est comme ca qu'on reinvente.

**L'echelle.** Cladd est dense (son `md` vaut 28px) ; ce produit est tactile
avec un plancher de 48px. On ne force PAS `size="lg"` partout — la doc
l'interdit (« Don't default to `lg` everywhere », « When in doubt, `md` »).
On decale l'echelle dans `src/styles/tokens.css` pour que `md` tombe sur 48px,
puis on suit les conventions du kit a la lettre. Les trois blocs `@theme`
(espacement, typographie, rayons) se modifient ENSEMBLE : les numerateurs de
rayon sont ecrits en dur sur la base `md`. Nos propres tokens vivent hors de
l'espace de noms `cladd-*`, que la doc interdit d'etendre.

**2. La museliere.** `src/ui/**` est la SEULE zone ou des classes Tailwind
s'ecrivent. Ailleurs, `bun run lint` refuse les valeurs arbitraires (`-[...]`),
les couleurs litterales et les tailles de police hors echelle. Ce n'est pas une
convention, c'est un echec de build.

**3. Le regard.** Chaque ecran s'ouvre dans le navigateur integre aux quatre
largeurs de reference (375, 768, 1024, 1280) AVANT d'etre declare fini. La route
`/showroom`, en developpement uniquement, rend chaque ecran avec des donnees de
demonstration sans backend ni authentification, precisement pour ca.

**Regles d'ecran**, courtes et opposables :

1. **Le logiciel decide, le gerant confirme.** Aucun ecran ne demande une saisie
   que le logiciel peut deduire. Un champ vide qu'il aurait pu remplir est un defaut.
2. **Tout traitement se voit sans qu'on le demande.** Lecture en cours, echec,
   progression : chaque etat s'affiche de lui-meme, sans rechargement.
3. **Deux volets au-dela de 1024px** sur tout ecran de travail : liste a gauche,
   preuve a droite. En dessous, la liste seule et la preuve en feuille.
4. **Le vide montre le chemin**, jamais des cadrans a zero.
5. **Le mot « garantie » est interdit**, et un test balaie toute l'interface.

**Couleurs reservees.** Le vert, le rouge et l'ambre (`--color-seuil-*`) ne
signifient qu'une chose : au-dessus du seuil, tout pres, en dessous. Aucun
element decoratif ne les porte. C'est pour ca que l'accent de marque est un bleu
d'encre et jamais un vert.

## Conventions

- TypeScript strict, pas de `any`
- Composants React 19. Pas de `setState` dans un effet : on derive au rendu, ou on remet a zero avec une `key`
- Convex : `query` pour lire, `mutation` pour écrire, `action` pour les appels externes
- Composants PascalCase · fonctions Convex camelCase · routes kebab-case · tables au pluriel
- Pas de `console.log` en production
- Commits : `git commit --no-verify` (les hooks pre-commit dépassent 2 minutes)

### Le piège Convex qui casse TOUS les écrans d'un coup

Une fonction Convex qui appelle `internal.<son propre module>.<autre fonction>` crée un cycle
d'inférence : le type de `internal` contient celui du handler, qui dépend de `internal`.
TypeScript renonce et retombe sur `any` — et cet `any` remonte dans le type de `api` **tout
entier**, faisant perdre l'inférence à tous les écrans, y compris ceux d'une autre verticale.

Le symptôme est trompeur : des dizaines de `TS7006 implicitly has an 'any' type` apparaissent
dans des fichiers qui n'ont pas été touchés. Chercher la cause dans le dernier module Convex
écrit, pas dans les fichiers qui se plaignent.

**Le remède** : annoter explicitement le type de retour du handler.

```ts
handler: async (ctx, args): Promise<Id<'creances'>> => { … }
```

## Règles pour les subagents

Les agents custom dans `.claude/agents/*.md` tournent en mode « text generation only » : leurs tool
calls ne sont **pas** exécutés. L'agent `general-purpose` intégré, lui, exécute normalement.

## Liens utiles

- **Le remodelage vers le recouvrement** : `/docs/remodelage/` — le brief, l'audit du code
  d'origine, l'architecture socle/verticales, et l'état d'avancement.
- Gabarits extraits de Fleet : `/docs/superpowers/references/`

Les documents `/docs/agri/` décrivent le modèle EGalim, retiré du produit le 3 septembre 2026.
Ils restent au dépôt comme archive : ils portent le raisonnement qui a mené au pivot, pas la
direction actuelle.

Ce projet utilise [Convex](https://convex.dev). Lire
`src/lib/convex/_generated/ai/guidelines.md` avant tout travail sur le backend.
