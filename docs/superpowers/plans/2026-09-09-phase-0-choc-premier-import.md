# Le choc du premier import — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended)
> or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Que le client dépose trois ans d'historique et voie, en moins d'une minute, un montant
qu'il ne savait pas avoir le droit de réclamer — sur ses propres données, décomposé au centime.

**Pourquoi ce plan maintenant.** C'est le produit d'appel : il se vend avant tout le reste, et il ne
dépend que du moteur de calcul, qui existe déjà et qui est le seul avantage qu'aucun concurrent ne
peut copier sans le refaire. Voir `docs/blueprint/01-FRONTIERE-MVP.md` § « Les cinq mécaniques
d'accroche », points 1, 2 et 4.

**Architecture.** Toute la règle est PURE, dans `verticales/recouvrement/revelation.ts`, et repose
sur `decompterFacture` sans le réécrire. La couche Convex ne fait qu'assembler et servir. Les écrans
consomment, ils ne calculent pas.

**Tech Stack:** TypeScript strict · Vitest + convex-test · Convex `authedQuery` · Cladd.

---

## Les quatre règles de conception, opposables

1. **La révélation est un CONSTAT, pas une promesse.** « Ces factures portent 12 480 € d'intérêts et
   d'indemnités jamais calculés » est un constat sur des données. « Vous allez récupérer 12 480 € »
   serait un mensonge, et « nous garantissons » un mot interdit. Le produit MESURE.

2. **Un montant qu'on ne peut pas décomposer est un montant qu'on demande de croire.** Chaque ligne
   de la révélation porte sa facture, son principal, ses intérêts et son indemnité. Le débiteur qui
   conteste refera le calcul ; le gérant doit pouvoir le refaire avant lui.

3. **Ce qu'on ne sait pas chiffrer s'affiche aussi.** Une facture dont le semestre de taux manque, ou
   dont la date de départ est inexploitable, ne disparaît pas du décompte : elle remonte NOMMÉE dans
   `nonChiffrees`. Un total silencieusement amputé est pire qu'un total incomplet annoncé.

4. **Le compteur de zéro perte ne ment jamais par omission.** « 0 € prescrit depuis 214 jours » est
   une affirmation sur NOTRE travail. Si le battement a échoué un seul jour de cette période, la
   phrase est fausse et ne doit pas s'afficher. La donnée existe déjà : `battements.statut`.

## La question laissée au juriste, et pourquoi elle ne bloque pas

`docs/blueprint/01-FRONTIERE-MVP.md` la pose : jusqu'où l'indemnité forfaitaire et les intérêts
restent réclamables sur une facture dont le principal a DÉJÀ été payé. Tant qu'elle n'est pas
tranchée, la révélation **ne compte que les factures non soldées**. C'est le périmètre le plus
étroit, donc le seul défendable, et il garde toute sa force : ce sont les impayés qui intéressent.

Élargir plus tard ne demandera qu'un prédicat, pas une refonte — c'est pour ça que le filtre est un
argument de `reveler`, pas une condition enfouie.

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `src/lib/verticales/recouvrement/revelation.ts` *(créer)* | **Toute la règle.** Révélation, montée du compteur, bilan des pertes. Pur. |
| `src/lib/verticales/recouvrement/__tests__/revelation.test.ts` *(créer)* | Les tests de la règle. |
| `src/lib/convex/recouvrement/revelation.ts` *(créer)* | L'assemblage : lire, composer, servir. Aucune règle. |
| `src/lib/convex/__tests__/revelationRecouvrement.test.ts` *(créer)* | Les tests de l'assemblage. |
| `src/ui/revelation.tsx` *(créer)* | Les trois blocs d'écran. |
| `src/routes/app/index.tsx` *(modifier)* | Le compteur vivant en tête du flux. |
| `src/routes/showroom.tsx` *(modifier)* | Les trois blocs, sans backend. |

---

## Task 1 : Ce qui est dû, et ce qu'on ne savait pas pouvoir réclamer

**Files:**
- Create: `src/lib/verticales/recouvrement/revelation.ts`
- Create: `src/lib/verticales/recouvrement/__tests__/revelation.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

Couvrir, dans cet ordre :

- Une facture échue non soldée produit un `supplement` = intérêts + 40 €, et un `principal` distinct.
- **L'indemnité se compte PAR FACTURE.** Trois factures du même débiteur donnent 120 €, pas 40.
- Une facture SOLDÉE est exclue (question juriste ouverte).
- Une facture non encore échue est exclue : aucun intérêt ne court, l'indemnité n'est pas due.
- Une facture dont le décompte LÈVE — semestre de taux absent — part dans `nonChiffrees` avec sa
  raison, et **les autres restent chiffrées**.
- Le total est la somme exacte des lignes : `principal + interets + indemnites === total`.
- Aucune ligne ne porte le mot « garantie » ni de verbe de recommandation.

- [ ] **Step 2 : Lancer les tests et vérifier qu'ils échouent**

```bash
bunx vitest run src/lib/verticales/recouvrement/__tests__/revelation.test.ts
```

Attendu : `FAIL`, `reveler` introuvable.

- [ ] **Step 3 : Écrire `reveler`**

Signature :

```ts
export function reveler(
	factures: readonly FacturePourRevelation[],
	arreteAu: string,
	convention: ConventionJours
): Revelation
```

`FacturePourRevelation` étend `FacturePourDecompte` d'un `statutPaiement`. `reveler` filtre, appelle
`decompterFacture` DANS UN `try`, et range les échecs dans `nonChiffrees`.

⚠️ **Ne pas réimplémenter le calcul.** `decompterFacture` porte les segments, la convention de jours
et l'unique division arrondie. Le refaire ici créerait une seconde vérité sur le seul chiffre du
produit qui coûte de l'argent réel.

- [ ] **Step 4 : Vérifier que les tests passent, puis lancer la suite entière**

## Task 2 : Le compteur vivant — il a monté cette nuit

**Files:**
- Modify: `src/lib/verticales/recouvrement/revelation.ts`
- Modify: `src/lib/verticales/recouvrement/__tests__/revelation.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

- La montée entre deux dates est strictement positive sur une facture qui porte des intérêts.
- Elle est NULLE sur une facture soldée, et nulle si les deux dates sont égales.
- Elle ne compte JAMAIS l'indemnité forfaitaire : 40 € sont dus une fois, pas 40 € par nuit. C'est
  l'erreur qui ferait grimper le compteur de 40 € toutes les vingt-quatre heures et détruirait la
  crédibilité du chiffre au premier contrôle.

- [ ] **Step 2 : Lancer, vérifier l'échec, écrire `monteeEntre`, revérifier**

```ts
export function monteeEntre(
	factures: readonly FacturePourRevelation[],
	hier: string,
	aujourdHui: string,
	convention: ConventionJours
): Montant
```

Implémentation : `reveler(…, aujourdHui).interets − reveler(…, hier).interets`. **Les intérêts
seuls.** Le test de l'indemnité fait tomber toute autre version.

## Task 3 : Le compteur de zéro perte

**Files:**
- Modify: `src/lib/verticales/recouvrement/revelation.ts`
- Modify: `src/lib/verticales/recouvrement/__tests__/revelation.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

- Une facture dont la prescription est atteinte AVANT l'arrivée du client compte dans `eteintesAvant`.
- Une facture prescrite APRÈS compte dans `eteintesDepuis` — et c'est le chiffre qui doit rester à
  zéro. **Il n'est pas décoratif : c'est l'aveu d'un échec du produit, et il doit pouvoir s'afficher.**
- Une facture sans `datePrescription` ne compte NI dans l'une NI dans l'autre, et remonte en angle
  mort. Le doute ne profite jamais au produit.
- Le nombre de jours sous surveillance se compte depuis l'arrivée, jamais depuis la première facture.

- [ ] **Step 2 : Lancer, vérifier l'échec, écrire `bilanDesPertes`, revérifier**

## Task 4 : L'assemblage Convex

**Files:**
- Create: `src/lib/convex/recouvrement/revelation.ts`
- Create: `src/lib/convex/__tests__/revelationRecouvrement.test.ts`

- [ ] **Step 1 : Écrire les tests qui échouent**

- La révélation ne porte QUE les factures de l'organisation demandée. Deux établissements peuplés,
  et le second ne voit rien du premier.
- Une facture dont la date est inexploitable ne fait pas échouer la requête : elle est `nonChiffree`.
- **Le bilan des pertes refuse d'affirmer si le battement a échoué.** Poser un relevé `ECHEC` dans la
  période et vérifier que la réponse porte `surveillanceInterrompueLe`.

- [ ] **Step 2 : Lancer, vérifier l'échec, écrire les requêtes, revérifier**

```ts
export const revelation = authedQuery({ args: { arreteAu: v.string() }, … });
export const bilan = authedQuery({ args: { aujourdHui: v.string() }, … });
```

⚠️ **Rappel du piège Convex** : toute fonction appelant `internal.<son propre module>` doit annoter
son type de retour, sinon le type `api` ENTIER retombe à `any`.

⚠️ **Rappel de la leçon de la tâche 4bis du plan 1** : ce plan n'ajoute AUCUNE table. Si cela change,
la purge RGPD et l'export se modifient DANS LA MÊME TÂCHE.

## Task 5 : Les écrans

**Files:**
- Create: `src/ui/revelation.tsx`
- Modify: `src/routes/app/index.tsx`, `src/routes/showroom.tsx`

- [ ] **Step 1 : Consulter le MCP Cladd AVANT d'écrire**

`get_foundation('pitfalls')`, puis `get_component` pour chaque composant employé. Ne jamais
reconstituer l'API en lisant le code compilé.

- [ ] **Step 2 : Écrire les trois blocs**

- **La révélation** — le `supplement` en très gros, le principal en second, la décomposition par
  facture dessous, et `nonChiffrees` en clair. Jamais de cadran à zéro : sans facture échue, l'écran
  montre le chemin.
- **Le compteur vivant** — le total du jour, et la montée depuis hier.
- **Le bilan des pertes** — les deux nombres, et le refus d'affirmer quand la surveillance a été
  interrompue.

- [ ] **Step 3 : Vérification visuelle**

Ouvrir `/showroom` dans le navigateur intégré aux quatre largeurs (375, 768, 1024, 1280). Pas de
Chrome réel, pas de capture Playwright. Compléter par des mesures du DOM.

- [ ] **Step 4 : Suite entière, `bun run check`, `bun run lint`, `bun run build`**

---

## Vérification finale du plan

- [ ] `bunx vitest run` — tout vert
- [ ] `bun run check` et `bun run lint`
- [ ] `bun run build`
- [ ] `bunx convex dev --once` — le schéma passe sur des données réelles
- [ ] Les quatre largeurs relues à l'écran

## Ce que ce plan ne fait PAS

Nommé pour qu'on ne le croie pas fait.

- **Aucune relance, aucun courrier au débiteur.** Ligne rouge 1.
- **Aucun acte.** Tout vit sous `exiger()`, jamais `exigerPourActe()`.
- **Aucune donnée externe.** Sirene et BODACC sont le plan 3.
- **Aucune extension de la révélation aux factures soldées** tant que le juriste n'a pas répondu.
- **Aucun décompte figé.** La révélation est une VUE, recalculée à chaque ouverture. Le décompte
  arrêté et opposable reste `decompte.ts`, et lui seul.
