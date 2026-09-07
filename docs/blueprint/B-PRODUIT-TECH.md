# B — Produit et technique

Architecture cible, les cinq modules, ce qui existe déjà et ce qui manque.

---

## 1. L'état réel au 3 septembre 2026

Inventaire honnête, sans arrondir.

### Ce qui est construit, et qui est le plus difficile

| Domaine | Où | Ce que ça fait |
|---|---|---|
| **Arithmétique exacte** | `socle/montants.ts` | Centimes entiers en `bigint`, jamais un flottant. Arrondi commercial, symétrique sur les négatifs. Une seule division arrondie par segment, explicite. |
| **Décompte segmenté** | `verticales/recouvrement/decompte.ts` | Segments à chaque rupture : exigibilité, règlement, changement de taux, frontière d'année. Convention de jours sans valeur par défaut. |
| **Série de taux** | `pays/france/taux.ts` | Taux BCE par semestre 2021-S1 → 2026-S2, taux légal en deux catégories, planchers publiés en recoupement indépendant. **Lève en nommant le semestre manquant, n'extrapole jamais.** |
| **Prescription sectorielle** | `pays/france/prescription.ts` | Général 5 ans (L110-4), transport 1 an (L133-6), consommateur 2 ans (L218-2), plus trois cas à un an. Secteur indéterminé → délai le plus court. |
| **Registre juridique** | `verticales/recouvrement/parametres.ts` | Quinze entrées, chacune avec source, date de relevé, `verifie` et `valideParAvocat`. |
| **Qualification** | `scoring.ts`, `deduction.ts`, `procedures.ts` | Poids totalisant 20, seuil à 0,75, signaux de contestation bloquants quel que soit le score. `peutEvaluer()` vs `blocagesProductionActe()`. |
| **Contrôle** | `controle.ts` | Compare la créance à toutes les factures connues du débiteur et **chiffre ce qui serait abandonné**. Le seul endroit du produit où un refus vaut mieux qu'un résultat. |
| **Ingestion fichiers** | `import/exportComptable.ts`, `import/factureVente.ts` | FEC et CSV générique, extraction IA de factures de vente. Hors périmètre compté séparément des lignes ignorées. |

**534 tests.** La frontière socle/verticales est tenue par un test qui échoue si le socle importe une
verticale ou Convex.

### Ce qui manque, et que Jules a nommé justement

**Il n'y a ni yeux, ni bras, ni pouls.**

- **Aucun connecteur.** Tout entre à la main. La promesse « zéro saisie » n'existe pas.
- **Aucune boucle autonome.** `crons.ts` ne contient que du ménage de fichiers. La surveillance se
  calcule quand on ouvre l'écran — elle ne se réveille pas, elle n'alerte personne.
- **Aucune donnée externe.** Ni Sirene, ni BODACC, ni Infogreffe.
- **Aucune sortie vers le monde.** Pas de brief exécutoire, pas de routage, pas de relance rédigée.
- **Pas de solveur de lettrage**, pas de scoring comportemental.

Le moteur calcule juste et refuse de mentir. **Il ne fait rien tout seul.**

## 2. L'architecture, et la frontière qui la tient

Trois zones, et la frontière entre elles est un test, pas une convention.

```
src/lib/socle/          Le moteur. Ingestion multi-format, extraction ligne à ligne,
                        normalisation, dédoublonnage, rapprochement, coût des appels
                        modèle. IL NE SAIT PAS QUELLE LOI IL SERT.

src/lib/verticales/     Le référentiel, les règles de qualification, les calculs du
  recouvrement/         domaine et ses formats de sortie.
    pays/france/        Le droit national. A vocation à avoir des frères.

src/lib/convex/         Les query / mutation / action, et rien d'autre. La logique pure
                        vit hors de ce dossier, ce qui la rend testable sans harnais.
```

**Règle exécutable :** `socle/__tests__/frontiere.test.ts` échoue si un fichier du socle importe
`verticales/` ou `convex/`. L'inverse est libre et voulu.

**Ce que cette frontière achète, concrètement :** le jalon J8 (second pays) ne demande pas de
refactoring. On remplit `pays/espagne/`, on trouve un juriste espagnol, et le reste ne bouge pas.

## 3. Le battement — ce qui rend le produit agentique

**C'est la pièce manquante la plus importante du MVP.** Tout le reste en découle.

### Le principe

Un cron quotidien qui, pour chaque organisation :

1. **Recalcule** les décomptes à la date du jour — les intérêts ont couru cette nuit.
2. **Réévalue** les délais de prescription et de procédure.
3. **Interroge** les registres externes pour les débiteurs suivis.
4. **Détecte** les ruptures d'habitude de paiement.
5. **Décide** s'il y a matière à un briefing, et l'envoie — ou décide qu'il n'y a rien à dire.

### Les décisions de conception à prendre

**L'ordonnancement.** Un cron unique qui balaie toutes les organisations ne tient pas à l'échelle et
mélange les tenants. Le cron quotidien doit **planifier un travail par organisation** via le
planificateur Convex, chacun isolé et reprenable.

**L'idempotence.** Un briefing envoyé deux fois détruit la confiance plus vite qu'un briefing non
envoyé. Chaque exécution porte sa date et refuse de rejouer.

**Le silence est un résultat.** Le battement doit pouvoir conclure « rien à signaler » et ne rien
envoyer. C'est une décision produit autant que technique : la rareté de l'alarme est ce qui la fait
obéir (voir `01-FRONTIERE-MVP.md` §2).

**La visibilité de l'échec.** Un battement qui plante en silence laisse le client croire qu'il est
surveillé alors qu'il ne l'est plus. **C'est le pire état du produit.** Un échec doit être visible
dans l'interface du client, pas seulement dans un journal.

## 4. Les cinq modules — ce qui reste à construire

### Module 1 — Ingestion

**1.1 Ingestion automatique.** Trois chemins, par ordre d'indépendance :

| Chemin | Dépendance externe | Décision à prendre |
|---|---|---|
| **Adresse e-mail dédiée** par organisation | Un fournisseur d'e-mail entrant | Lequel. Resend est utilisé en sortie ; l'entrant est un autre produit. À arbitrer entre le fournisseur en place, un service dédié, et un point d'entrée HTTP Convex recevant un webhook. |
| **Connecteur ouvert** (QuickBooks, Sage, Odoo) | Compte développeur self-service | Lequel en premier — dépend du segment servi en premier. |
| **Dépôt de fichiers** | Aucune | **Existe.** |
| Pennylane, Dext | **Validation de partenariat** | Demande déposée jour 1. N'entre pas dans le chemin critique. |

**1.2 Extracteur de preuves.** Le socle est déjà générique : `extracteur.ts` prend un schéma Zod et un
prompt. Étendre aux bons de livraison, bons de commande et CGV, c'est ajouter des schémas — pas
réécrire le moteur. ⚠️ **Le verrou d'empreinte du prompt système** doit être respecté : le cache ne
sert que sur un préfixe identique à l'octet.

**1.3 Normalisation SIRET.** API Sirene (INSEE), clé gratuite. Deux difficultés réelles : les quotas
d'appel, et **l'historique des statuts** — si une entreprise change de forme juridique entre
l'émission de la facture et le recouvrement, c'est la bonne entité qu'il faut viser. Poursuivre un
ancien SIRET annule une procédure et fait perdre les frais de greffe.

**1.4 Solveur de lettrage dégradé.** Un virement de 4 820 € sans référence : trouver la combinaison de
factures qui donne ce total. C'est un problème de somme de sous-ensembles. Deux garde-fous
indispensables :

- **Borner l'espace de recherche** (nombre de factures candidates, fenêtre temporelle) — le problème
  est exponentiel dans le cas général.
- **Ne jamais lettrer automatiquement sur une solution ambiguë.** Si deux combinaisons donnent le même
  total, on propose les deux et on demande. Relancer agressivement un client qui a déjà payé est la
  pire erreur possible d'un logiciel de recouvrement.

### Module 2 — Préventif

**2.1 Le compteur qui se réveille** → voir §3, le battement.

**2.2 Radar de solvabilité.** BODACC, données ouvertes. Concevoir en **delta quotidien** plutôt qu'en
balayage complet. Le coupe-circuit suspend les relances et l'affiche ; il ne produit pas de pièce.

**2.3 Scoring comportemental.** Statistique pure sur l'historique de paiement du débiteur. Un client
qui paie toujours à J+15 ne doit pas déclencher d'alerte à J+2 ; le même à J+25 est une rupture, même
si aucun délai légal n'est franchi. ⚠️ **Nécessite un historique** : inopérant sur un client nouveau,
et le produit doit le dire au lieu de faire semblant.

### Module 3 — Médiation

**3.1 Relances asymétriques.** Trois niveaux. Le niveau 3 cite les articles et porte le décompte
chiffré — donc **chaque valeur citée doit passer par `exiger()`**, et le test des valeurs juridiques
interdit d'écrire un article ailleurs que dans le registre.

**3.2 Questionnaire de qualification de litige.** Recueille un fait — « le client a-t-il émis une
réserve par écrit ? » — et ne conseille rien. Une réponse positive marque le dossier comme litigieux
et **ferme** les procédures simplifiées. C'est le filtre humain qui empêche d'envoyer au mur un
dossier qui exigerait une assignation au fond.

### Module 4 — Légal

**4.1** existe. **4.3** existe.

**4.2 Évaluateur de solidité.** Étendre le scoring existant vers une pyramide de preuves. ⚠️ La
formulation est juridiquement structurante : « trois des quatre pièces attendues sont absentes » est
un constat ; « ce dossier est trop faible » est un conseil. Le produit écrit la première forme.

**4.4 Brief exécutoire et routage.** `exigerPourActe()`. Construit et verrouillé. Le routage suppose
une table de compétence territoriale des tribunaux de commerce — **donnée à sourcer, pas à deviner**.

**4.5 Machine à états post-procédure.** Surveiller les délais qui courent après une décision.
Structurellement identique au compteur de prescription, avec d'autres bornes.

### Module 5 — Embedded finance

Phase 3. Hors périmètre de ce document au-delà de sa mention.

## 5. Les décisions d'ingénierie structurantes

**Le multi-tenant est strict, sans aucune exception.** Rien n'est mutualisé entre clients : un
débiteur, un montant et une échéance sont des données client, toujours. La purge RGPD est donc
totale, sans exception à justifier. ⚠️ **Le radar de solvabilité tentera d'introduire la première
exception** — mutualiser un cache BODACC entre clients serait efficace. La donnée BODACC est publique
et n'appartient à personne ; **mais le fait qu'un client suive tel débiteur est une donnée client.**
La ligne à tenir : on peut mutualiser le contenu du registre public, jamais la liste de qui
s'y intéresse.

**Le piège Convex qui casse tous les écrans d'un coup.** Une fonction qui appelle
`internal.<son propre module>` crée un cycle d'inférence : le type `api` entier retombe à `any` et
des dizaines d'erreurs apparaissent dans des fichiers non touchés. Le remède est d'annoter
explicitement le type de retour du handler.

**Le schéma se relit contre la base, pas contre le code.** `convex deploy` valide les documents
**déjà en base** contre le schéma poussé. Retirer un champ d'un validateur est un changement de
données déguisé en changement de code : il passe tous les tests locaux et casse au déploiement.

## 6. Les dettes connues

| Dette | Impact | Quand la traiter |
|---|---|---|
| **La série de taux s'arrête à 2026-S2** | Le produit lèvera en nommant le semestre manquant dès janvier 2027. Ce n'est pas un bug, c'est le comportement voulu — mais il faut alimenter la série. | Avant janvier 2027 |
| **`valideParAvocat` vaut `false` partout** | Aucun acte ne peut sortir. | Chemin critique, jour 1 |
| **Mentions obligatoires de la requête en injonction : introuvables** | Bloque 4.4 même après validation du reste. | Avec le juriste |
| **Décret L.126 non publié** | La procédure reste indisponible. | Hors de notre contrôle — surveiller |
| **Les bornes de palier ont été transposées, pas recalculées** | Le prix ne suit pas la valeur. Voir `A-BUSINESS.md` §2. | Après trois pilotes |
| **`/bienvenue` est hors du showroom** | Échappe à la vérification visuelle aux quatre largeurs. | Quand on y retouche |
| **Le logo est une assiette de porcelaine** | Héritage du modèle précédent. Décision de marque. | Arbitrage Jules |

## 7. La pile

React 19 · TanStack Start (Vite) et TanStack Router · Convex · Better Auth · Tailwind CSS v4 et
Cladd · Claude API via actions Convex · Paddle · Resend · Vercel · bun · Vitest.

**Tablette d'abord**, paysage privilégié, sans casser le téléphone. Cibles tactiles 48 px. Interface
en français uniquement — le droit applicable est français, et il le restera jusqu'au jalon J8.
