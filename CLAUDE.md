# Mycelium — Contexte projet

## Vision produit

Mycelium est l'**opérateur de la conformité EGalim en restauration collective**. La loi impose à
toutes les cantines, publiques depuis 2022 et **privées depuis 2024**, de servir ≥ 50 % de produits
durables dont ≥ 20 % de bio (et ≥ 60 % de durable sur la viande et le poisson), et de le déclarer
chaque année avant le 31 mars sur « ma cantine ».

~85 % des cantines déclarantes n'y arrivent pas, et **la plupart ne connaissent même pas leur
chiffre**, parce qu'il se calcule en valeur d'achat, ligne à ligne, sur douze mois de factures.

**On vend un résultat mesuré, pas un SaaS.** 80 % humain, 20 % logiciel.

**Cible :** restauration collective privée en gestion directe, non équipée, Île-de-France Ouest.

## L'échelle de valeur en 6 étages

| Étage | Ce qu'on vend | Prix |
|---|---|---|
| 0 | Diagnostic EGalim | 690–1 900 € one-shot |
| 1 | Déclaration assistée | 290–690 € |
| 2 | Abonnement Conformité | 190–390 €/mois |
| 3 | Pilote Substitution | 0–500 € |
| 4 | Abonnement Opérateur | 450–900 €/mois + commission |
| 5 | Orchestration logistique | sous condition stricte |

On ne monte pas d'étage tant que le précédent ne tourne pas. Seuls les **étages 0 à 2** justifient
du code en année 1.

## ⚠️ Les deux lignes rouges

1. **On ne prend jamais la propriété des denrées.** Le producteur facture et livre en direct.
2. **On n'organise jamais le transport en notre nom propre.** (statut de commissionnaire de
   transport, réglementé)

Et un mot interdit : **« garantie »**. On ne garantit jamais la conformité. On la **mesure**, on la
**fait progresser**, on la **prouve**. La déclaration reste signée par la cantine.

## Principe anti-dérive

**On ne construit que ce que le journal de friction du terrain désigne**, chronométré. Chaque
fonctionnalité doit répondre à deux questions : quelle tâche manuelle répétée elle supprime, et
quel étage commercial déjà vendu elle débloque. Sans réponse chiffrée aux deux, on ne la construit
pas.

Unique exception assumée : la **Moulinette Audit**, parce que c'est le produit facturé lui-même.

## Stack technique

- Frontend : SvelteKit 2 + Svelte 5 (runes)
- Backend : Convex (fonctions dans `src/lib/convex/`)
- Auth : Better Auth (install Convex locale)
- UI : Tailwind CSS v4 + composants custom shadcn-style
- IA : Claude API via actions Convex
- Facturation : Paddle · Emails : Resend · Déploiement : Cloudflare Workers
- Package manager : bun · Tests : Vitest (unit), Playwright (E2E)

## Architecture

- **Multi-tenant strict par `organizationId`** — une cantine = une organisation.
  Unique exception délibérée à venir : `productLabels`, table globale de classification de
  libellés, qui ne contiendra jamais de montant, de quantité, de fournisseur ni de lien vers une
  organisation.
- Interface **en français uniquement** (EGalim est une loi française).
- Deux espaces : `/app/*` (la cantine) et `/ops/*` (l'opérateur Mycelium, vue multi-clients).
- Rôles client : `ORG_ADMIN`, `ORG_MEMBER`. Rôles staff : `SUPER_ADMIN`, `OPERATOR`.

## Le référentiel EGalim

`src/lib/egalim/referentiel.ts` (à construire en phase 1) est **du code, jamais des données**. Il
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
  partent en revue humaine.
- **Un diagnostic livré est figé, définitivement.** Une nouvelle mesure produit un nouveau
  diagnostic daté.

## Conventions

- TypeScript strict, pas de `any`
- Composants Svelte avec runes (`$state`, `$derived`, `$effect`)
- Convex : `query` pour lire, `mutation` pour écrire, `action` pour les appels externes
- Composants PascalCase · fonctions Convex camelCase · routes kebab-case · tables au pluriel
- Pas de `console.log` en production
- Commits : `git commit --no-verify` (les hooks pre-commit dépassent 2 minutes)

## Règles pour les subagents

Les agents custom dans `.claude/agents/*.md` tournent en mode « text generation only » : leurs tool
calls ne sont **pas** exécutés. L'agent `general-purpose` intégré, lui, exécute normalement.

## Liens utiles

- Business plan : `/docs/agri/business-plan/00-README.md`
- Playbook 90 jours : `/docs/agri/playbook-90-jours-restauration-collective.md`
- Fiche EGalim (barème) : `/docs/agri/business-plan/10-fiche-egalim-1page.md`
- Spec du pivot : `/docs/superpowers/specs/2026-08-15-pivot-egalim-tri-et-moulinette-design.md`
- Gabarits extraits de Fleet : `/docs/superpowers/references/`

Ce projet utilise [Convex](https://convex.dev). Lire
`src/lib/convex/_generated/ai/guidelines.md` avant tout travail sur le backend.
