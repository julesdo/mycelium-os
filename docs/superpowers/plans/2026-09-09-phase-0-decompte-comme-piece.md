# Le décompte comme pièce officielle — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended)
> or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Qu'un décompte sorte du produit et parte chez un expert-comptable, un avocat ou un assureur
**sans être retouché**.

**Pourquoi celui-ci, et maintenant.** C'est le **troisième critère de fin de MVP** de
`01-FRONTIERE-MVP.md` — « le plus dur et le plus important : c'est celui qui prouve que le décompte
est une pièce, et pas un écran ». Et c'est le **seul des trois** qui soit bloqué par du code : le
premier est atteignable dès aujourd'hui avec le dépôt de fichiers, le deuxième demande un client réel.

C'est aussi la cinquième mécanique d'accroche : *« le moment où le client ne peut plus partir, c'est
quand le décompte Letikette devient ce qu'il envoie à son expert-comptable »*.

---

## Les cinq règles de conception, opposables

1. **Ce n'est PAS un acte.** Ni mise en demeure, ni requête, ni commandement. Un décompte est un
   CONSTAT de compte arrêté. Il vit sous `exiger()`, jamais `exigerPourActe()`, et **le document le
   dit lui-même** — un tiers qui le reçoit doit savoir ce qu'il tient.

2. **Aucune valeur juridique n'est écrite dans le document.** Les articles cités viennent du registre
   via `exiger()`. Recopier « article L441-10 » dans un gabarit créerait une seconde vérité qui ne
   serait pas corrigée le jour où la première change. Un test le fait respecter.

3. **La pièce reflète ce qu'on réclamait CE JOUR-LÀ.** Le décompte est figé ; les identités du
   créancier et du débiteur doivent l'être aussi. Regénérée dans six mois, la pièce doit dire la même
   chose — sinon elle n'est pas opposable, elle est une vue.

4. **Ce que le décompte NE couvre PAS figure dessus.** `controlerDecompte` chiffre déjà ce qui serait
   abandonné. Un tiers qui lit la pièce doit voir ce qui n'y est pas : c'est la différence entre un
   document professionnel et un extrait.

5. **La règle est pure, le rendu est bête.** Le contenu de la pièce se compose et se teste sans
   harnais PDF ; jsPDF ne fait que poser des lignes. C'est la même séparation que partout ailleurs,
   et elle évite qu'un test de mise en page se prétende test de contenu.

## Ce qui existe déjà, et qu'on ne refait pas

- Le décompte figé porte **tout le numérique** : totaux, lignes, segments avec taux en fraction exacte.
- `controlerDecompte` chiffre les abandons.
- `jspdf` et `jspdf-autotable` sont **déjà des dépendances** (reliquat d'EGalim, jamais utilisées dans
  `src/`).
- `COULEURS_IMPRESSION` convertit la palette en sRGB — un PDF n'a pas de variables CSS.

---

## Task 1 : Les identités, figées avec le décompte

**Files:** `src/lib/convex/recouvrement/tables.ts`, `decompte.ts`, ses tests.

- [ ] **Step 1 : Test qui échoue** — produire un décompte, renommer le débiteur, relire le décompte :
  il porte l'ancien nom. C'est la règle 3, et sans test elle se perd au premier refactor.
- [ ] **Step 2 : Ajouter `creancier` et `debiteur` en `v.optional()`** sur `decomptes`.
  ⚠️ **Optionnels, pas obligatoires** : Convex valide la BASE, et les décomptes déjà produits n'en
  portent pas. Le rendu doit savoir se passer d'eux.
- [ ] **Step 3 : Les écrire dans `figerDecompte`**, lus sur `profilsCreancier` et `debiteurs`.

## Task 2 : La pièce, en règle pure

**Files:** `src/lib/verticales/recouvrement/piece.ts` *(créer)* + tests.

- [ ] **Step 1 : Tests qui échouent.** Couvrir :
  - le document porte la date d'arrêté, les deux identités, et le total ;
  - **les articles cités viennent du registre** — un test qui lit `PARAMETRES` et vérifie que la
    source citée est exactement celle du registre, jamais une chaîne écrite dans le gabarit ;
  - le document dit **ce qu'il n'est pas** (« ce document n'est pas une mise en demeure ») ;
  - les abandons figurent, chiffrés ;
  - aucun verbe de recommandation, aucun mot interdit ;
  - le total affiché est la somme exacte des lignes.
- [ ] **Step 2 : Lancer, vérifier l'échec, écrire `composerPiece`, revérifier.**

`composerPiece` rend une **description ordonnée de blocs** — titre, identités, tableau, notes — pas du
PDF. C'est ce qui la rend testable sans harnais, et c'est ce qui garantit qu'un second format (HTML
imprimable, courriel) dira exactement la même chose.

## Task 3 : Le rendu, et le bouton

**Files:** `src/ui/piece-decompte.ts` *(créer)*, `src/routes/app/creance.$id.tsx`, showroom.

- [ ] **Step 1 : Le rendu jsPDF**, qui ne fait que poser les blocs. Aucune règle, aucun calcul,
  aucune chaîne juridique.
- [ ] **Step 2 : Le bouton sur l'écran de créance**, et le nom de fichier — il compte : c'est ce que
  le destinataire verra en pièce jointe.
- [ ] **Step 3 : Vérification visuelle** aux quatre largeurs, et **relecture du PDF produit**.

---

## Ce que ce plan ne fait PAS

- **Aucun envoi.** Le produit ne poste rien : il produit un fichier que le client attache lui-même.
  Ligne rouge 1.
- **Aucune mise en demeure.** Le niveau 3 des relances est le plan 6, et il demande le juriste.
- **Aucun décompte recalculé.** La pièce se compose depuis le décompte FIGÉ, jamais depuis les données
  du jour.
