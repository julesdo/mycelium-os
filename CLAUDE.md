# Letikette — Contexte projet

## Vision produit

Letikette est le **logiciel de conformité EGalim en restauration collective**. La loi impose à
toutes les cantines, publiques depuis 2022 et **privées depuis 2024**, de servir ≥ 50 % de produits
durables dont ≥ 20 % de bio (et ≥ 60 % de durable sur la viande et le poisson), et de le déclarer
chaque année avant le 31 mars sur « ma cantine ».

~85 % des cantines déclarantes n'y arrivent pas, et **la plupart ne connaissent même pas leur
chiffre**, parce qu'il se calcule en valeur d'achat, ligne à ligne, sur douze mois de factures.

**On vend un logiciel qui mesure, pas du temps humain.** L'extraction et la classification sont
automatisées ; le gérant confirme ce qui engage sa responsabilité. La charge est dégressive : un
libellé confirmé l'est définitivement, et le consensus entre clients en retire encore.

**Cible :** restauration collective privée en gestion directe, non équipée, Île-de-France Ouest.

## Ce qu'on vend

Un abonnement au logiciel de conformité : dépôt de factures, mesure des trois taux EGalim, file de
confirmation, certificats et courriers de demande d'attestation.

Les étages « opérateur » du modèle précédent (pilote substitution, abonnement opérateur,
orchestration logistique) n'ont plus de porteur : il n'y a plus d'opérateur.

## ⚠️ Les deux lignes rouges

1. **On ne prend jamais la propriété des denrées.** Le producteur facture et livre en direct.
2. **On n'organise jamais le transport en notre nom propre.** (statut de commissionnaire de
   transport, réglementé)

Et un mot interdit : **« garantie »**. On ne garantit jamais la conformité. On la **mesure**, on la
**fait progresser**, on la **prouve**. La déclaration reste signée par la cantine.

## Principe anti-dérive

**On ne construit que ce que le journal de friction du terrain désigne**, chronométré. Chaque
fonctionnalité doit répondre à deux questions : quelle tâche manuelle répétée elle supprime, et
ce qu'elle change pour le gérant qui paie l'abonnement. Sans réponse chiffrée aux deux, on ne la
construit pas.

Unique exception assumée : la **Moulinette Audit**, parce que c'est le produit facturé lui-même.

## Stack technique

- Frontend : React 19 + TanStack Start (Vite) + TanStack Router
- Backend : Convex (fonctions dans `src/lib/convex/`)
- Auth : Better Auth (install Convex locale)
- UI : Tailwind CSS v4 + Cladd (`@cladd-ui/react`, version epinglee a l'exact)
- IA : Claude API via actions Convex
- Facturation : Paddle · Emails : Resend · Déploiement : Vercel
- Package manager : bun · Tests : Vitest (unit) + verification visuelle au navigateur

## Architecture

- **Multi-tenant strict par `organizationId`** — une cantine = une organisation.
  Unique exception délibérée : `productLabels`, table globale de classification de
  libellés, qui ne contiendra jamais de montant, de quantité, de fournisseur ni de lien vers une
  organisation.
- Interface **en français uniquement** (EGalim est une loi française).
- **Un seul espace : `/app/*`**, celui de la cantine. Il n'y a pas d'espace opérateur.
- Rôles : `ORG_ADMIN`, `ORG_MEMBER`. Aucun rôle staff.
- **Tablette d'abord**, paysage privilégié, sans casser le téléphone. Cibles tactiles 48 px.

### Socle et verticales — la frontière est un test, pas une convention

Depuis le remodelage (voir `/docs/remodelage/`), le code se lit en trois zones :

- **`src/lib/socle/`** — le moteur. Ingestion multi-format, extraction ligne à ligne,
  normalisation de libellés, dédoublonnage, rapprochement, reprise et coût des appels modèle.
  **Il ne sait pas quelle loi il sert.**
- **`src/lib/verticales/<domaine>/`** — le référentiel, les règles de qualification, les calculs
  du domaine et ses formats de sortie. `egalim/` existe ; `recouvrement/` se construit.
- **`src/lib/convex/`** — les `query` / `mutation` / `action`, et rien d'autre. La logique
  pure vit hors de ce dossier, ce qui la rend testable sans harnais de plateforme.

**Règle exécutable** : `src/lib/socle/__tests__/frontiere.test.ts` échoue si un fichier du socle
importe `verticales/` ou `convex/`. L'inverse est libre et voulu.

Deux verrous d'empreinte protègent les prompts système : ils partent avec `cache_control`
`ephemeral`, et le cache Claude ne sert que sur un préfixe identique à l'octet. Un reformatage
innocent multiplie le coût par diagnostic sans qu'aucun autre test ne tombe.

## Le référentiel EGalim

`src/lib/verticales/egalim/referentiel.ts` est **du code, jamais des données**. Il
est versionné (`REFERENTIEL_VERSION`), passe en revue de code, et chaque classification enregistre
la version qui l'a produite. Le barème doit être revérifié **avant** toute production de rapport
client.

Rappel du barème : bio et conversion comptent dans les deux ratios ; Label Rouge, AOP/AOC/IGP/STG,
HVE 3, fermier, pêche durable, commerce équitable, RUP et coût du cycle de vie comptent en durable
seul ; **« local », « circuit court », « de saison », « fait maison » ne comptent pas**.

## Auditabilité — non négociable

- Chaque ligne de facture conserve son libellé source, sa classification, **sa justification** et un
  indice de confiance. Aucune classification sans phrase justificative.
- Les lignes sous le seuil de confiance, et **systématiquement** celles classées viande ou poisson,
  partent en file de confirmation, devant le gérant.
- **Un diagnostic livré est figé, définitivement.** Une nouvelle mesure produit un nouveau
  diagnostic daté.
- `productLabels` est **globale et anonyme**. Elle ne contient qu'un libellé et son verdict : jamais
  de montant, de quantité, de fournisseur, d'organisation **ni d'utilisateur**. Le compteur de
  confirmations est un entier nu ; la question « cette organisation a-t-elle déjà confirmé ? » se
  répond côté client, sur ses propres lignes.
- **Viande et poisson passent toujours devant un humain**, quel que soit le consensus atteint.

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

- Business plan : `/docs/agri/business-plan/00-README.md`
- Playbook 90 jours : `/docs/agri/playbook-90-jours-restauration-collective.md`
- Fiche EGalim (barème) : `/docs/agri/business-plan/10-fiche-egalim-1page.md`
- Spec du pivot full-logiciel : `/docs/superpowers/specs/2026-08-19-pivot-full-logiciel-ux-tablette-design.md`
- Gabarits extraits de Fleet : `/docs/superpowers/references/`

Ce projet utilise [Convex](https://convex.dev). Lire
`src/lib/convex/_generated/ai/guidelines.md` avant tout travail sur le backend.
