# Spec — L'arbitrage équilibre et coût

> Statut : validé le 25 août 2026, en attente de relecture.
> Remplace l'orientation « logiciel de conformité EGalim » comme promesse centrale.
> EGalim n'est pas abandonné : il devient une section du rapport au lieu d'en être l'objet.

---

## 0. En une phrase

**Mieux manger à budget constant.** Chaque mois, Letikette lit les factures d'une cuisine
collective, mesure ce qu'elle dépense par couvert et par famille d'aliments, le compare à la
référence du métier, et transforme l'écart en meilleure qualité dans l'assiette. Le gérant ne
saisit rien, sauf un nombre par mois.

---

## 1. Pourquoi ce virage

### 1.1 Ce qui ne marchait pas

Le produit mesurait la conformité EGalim. Quatre défauts, constatés et non contestés :

1. **EGalim n'a pas de dents.** L'obligation porte sur la déclaration, pas sur le résultat. Un
   produit adossé à une peur molle obtient des hochements de tête polis.
2. **Le problème est annuel.** Une déclaration avant le 31 mars. Un logiciel ouvert une fois par
   an ne justifie pas un abonnement.
3. **La mesure est une autopsie.** Annoncer en 2026 le taux de 2025 ne change aucune décision
   d'achat. `OuAgir`, le seul écran qui tentait d'en sortir, admet dans son propre commentaire
   que son chiffre est un majorant inatteignable.
4. **Le directeur ne parle jamais d'EGalim à son chef gérant.** Il lui parle du coût au couvert.
   L'instrument mesurait une grandeur absente de la conversation qui compte.

### 1.2 Les chiffres qui ont décidé

| Donnée | Valeur | Source |
|---|---|---|
| Coût de revient moyen d'un repas | 8,40 € | secteur, 2025 |
| dont denrées, scolaire | 2,10 € | secteur, 2025 |
| dont denrées, entreprise | 3,30 € | secteur, 2025 |
| dont denrées, hospitalier | 3,80 € | secteur, 2025 |
| Part des denrées dans le coût complet | ~30 % | secteur |
| Gaspillage alimentaire, coût direct | **0,45 €/repas** | ADEME, oct. 2025, 400 relevés 2022-2024 |
| Gaspillage alimentaire, coût complet | 1,03 €/repas | ADEME, oct. 2025 |
| Taux durable moyen déclaré | **29,5 %** (obligation 50 %) | « ma cantine », campagne 2025 sur achats 2024 |
| Cantines atteignant le seuil durable | 34,4 % | idem |
| Taux bio moyen déclaré | 11,8 % (obligation 20 %) | idem |
| Taux viande et poisson | 36,2 % (obligation 60 %) | idem |
| Gain d'un audit de conformité contractuelle | jusqu'à 5 % de la dépense fournisseur | PRGX, marché américain |
| Optimisation d'achat atteignable | 10 à 25 % | sources achats, 2025-2026 |

**Le rapprochement qui fonde le produit :** un euro de denrées sur cinq est jeté, quand passer de
29,5 % à 50 % de durable coûte environ 0,04 € par repas. Récupérer un dixième de ce qui est jeté
finance la totalité de l'écart EGalim, et les neuf autres dixièmes restent à la cuisine.

### 1.3 Le levier structurel

**Letikette ne demande aucune saisie.** Les concurrents (Easilys, Salamandre, AidoMenu, Datameal,
Melba) sont des ERP complets à 200-500 €/mois qui exigent fiches techniques, stocks et menus
saisis. C'est pourquoi environ 70 % du parc n'est équipé de rien : ces cuisines ne refusent pas le
logiciel, elles refusent la saisie.

**Le 1er septembre 2026**, la réception de factures électroniques devient obligatoire pour toutes
les entreprises, et l'émission pour les grandes entreprises et les ETI, c'est-à-dire Pomona,
Transgourmet, Metro, Brake, Sysco. La majorité de la dépense denrées d'une cuisine bascule en
données structurées (Factur-X). Conséquence à assumer : **notre avantage n'est pas de savoir lire
des PDF mal scannés**, il fond en dix-huit mois. Notre avantage est de savoir ce que chaque ligne
veut dire et si elle est juste.

---

## 2. La promesse

> Mieux manger à budget constant.

Trois interdits de langage, opposables en revue :

- Jamais le mot **« garantie »**, ni aucune tournure qui promette un résultat. Un test balaie
  `src/**` pour l'attraper (`rapport.test.ts`, racines élargies à `src/marketing`).
- Jamais **« solution », « plateforme », « révolutionne », « en quelques clics »**.
- Jamais **« nous vous conseillons d'acheter chez X »**. On prépare une demande, le gérant
  décide.

---

## 3. La cible

### 3.1 Le périmètre

**Toute la restauration collective en gestion directe, tous segments, 150 à 800 couverts par
jour.** Public et privé.

Le filtre du business plan (privé, non équipé, Île-de-France, ~1 400 sites) était calibré pour une
porte d'entrée EGalim. Un rapport d'équilibre alimentaire n'en a plus besoin.

| Segment | Pourquoi il entre | Le discours |
|---|---|---|
| Scolaire | Le GEMRCN y est réglementairement obligatoire, pas seulement recommandé. Notre référence y est opposable de plein droit. | Excès et coût |
| Crèche | Exigences nutritionnelles les plus strictes, portions les plus surveillées. | Excès et justesse |
| Entreprise et administration | Coût au couvert sous pression permanente. | Excès et coût |
| EHPAD et médico-social | **40 % du secteur.** Le problème n'y est pas l'excès mais la **dénutrition**. | Suffisance et qualité de soin |
| Santé | Coût denrées le plus élevé (3,80 €), contrôle nutritionnel fort. | Suffisance et coût |

**La restauration commerciale est exclue, et la raison est structurelle** : la référence n'y
existe pas. Un restaurant n'a aucune obligation d'équilibre, sa carte est un choix commercial, il
n'y a rien à quoi comparer. Il resterait le contrôle de facture et le coût matière, où Coopeo,
Komia, Koust et Melba sont installés. À rouvrir plus tard comme produit séparé, jamais avec cette
promesse.

### 3.2 Qui utilise, qui signe

**Utilise :** le chef gérant ou le responsable de restauration.
**Signe :** le directeur d'établissement, ou le responsable d'exploitation pour un groupe.

**Le chef doit réclamer l'outil, pas le subir.** La plupart des logiciels de gestion en cuisine
sont vécus comme une surveillance venue d'en haut, et un chef surveillé sabote l'outil. Celui-ci
l'arme : il lui donne de quoi défendre un arbitrage devant son directeur, sur des références
opposables plutôt que sur son ressenti. Toute décision d'interface qui ferait basculer le produit
du côté du contrôle est à refuser.

### 3.3 Le moment de vérité

La revue de budget mensuelle. « Tu es à 2,34 € le couvert, l'objectif est 2,20. »

Sans instrument, le chef répond « je vais faire attention » et rogne sur la qualité, parce que
c'est la seule variable qu'il sait actionner dans l'urgence. Avec la feuille d'arbitrage, il
propose : réduire le poste en excès, en rendre une part au budget, et employer le reste à monter
en gamme.

---

## 4. Le service : la boucle mensuelle

C'est un **service**, pas seulement un logiciel. Décision assumée, qui corrige `CLAUDE.md`
(« On vend un logiciel qui mesure, pas du temps humain »). Au démarrage, une part du quatrième
temps est manuelle. Le service se dégrade en logiciel à mesure qu'on apprend ; l'inverse n'arrive
jamais. Le prix couvre ce temps dès le premier client.

| Temps | Ce qui se passe | Qui fait |
|---|---|---|
| 1. **Mesurer** | Les factures arrivent (dépôt ou comptabilité). Le gérant saisit **un nombre** : les couverts servis du mois. | Automatique + 1 saisie |
| 2. **Arbitrer** | Trois jours avant la revue de budget, la feuille d'arbitrage arrive d'elle-même. | Automatique |
| 3. **Choisir** | Le gérant retient un arbitrage, un seul, celui qu'il peut tenir. | Le gérant |
| 4. **Demander** | Letikette édite le dossier fournisseur : ses références, ses volumes annuels, la demande d'équivalents qualifiants et de prix. Le dossier part **au nom du gérant**. | Automatique |
| 5. **Comparer** | Les réponses reviennent, le comparatif est monté et rendu. **Manuel au démarrage.** | Nous, puis automatique |
| 6. **Vérifier** | Le mois suivant, les factures disent si l'arbitrage a été tenu. | Automatique |

Le temps 6 est ce qui rend l'abonnement légitime. Sans vérification, on retombe sur le rapport
annuel qu'on cherche à quitter.

---

## 5. Le référentiel métier (le cœur)

### 5.1 Nature

`src/lib/nutrition/referentiel-metier.ts`. **Du code, jamais des données**, exactement comme
`src/lib/egalim/referentiel.ts`. Versionné par `REFERENTIEL_METIER_VERSION`, passé en revue de
code, et chaque feuille d'arbitrage enregistre la version qui l'a produite.

### 5.2 Les profils de convive

```ts
export const PROFILS_CONVIVE = [
  'JEUNE_ENFANT',        // crèche
  'ENFANT_MATERNELLE',
  'ENFANT_ELEMENTAIRE',
  'ADOLESCENT',
  'ADULTE',              // entreprise, administration
  'PERSONNE_AGEE',       // EHPAD, résidence
  'PATIENT'              // hospitalier
] as const;
```

Source : recommandations GEMRCN, version de juillet 2015, qui définit des repères différenciés par
population.

### 5.3 Le contenu

Pour chaque couple (profil, famille d'achat) :

```ts
type ReperMetier = {
  grammageParPortion: number;   // grammes
  portionsSur20Repas: number;   // fréquence GEMRCN
  precision: 'FORTE' | 'MOYENNE' | 'FAIBLE';
};
```

**La précision n'est pas uniforme, et le dire est obligatoire.** Le GEMRCN raisonne en catégories
de plats (entrées, plats protidiques, garnitures, produits laitiers, desserts), notre taxonomie
raisonne en familles d'achat (`VIANDE`, `POISSON`, `FRUITS_LEGUMES`, `LAITIERS`,
`EPICERIE_SECHE`, `EPICERIE_APPERTISEE`, `BOISSONS`, `AUTRE`). La correspondance est :

- **FORTE** sur `VIANDE`, `POISSON`, `LAITIERS` : le GEMRCN y est précis, c'est là que se
  concentre l'argent, et son texte dit lui-même que le calibrage des protéines animales importe
  « à la fois pour des raisons nutritionnelles et économiques, ce sont les postes les plus coûteux
  du repas ».
- **MOYENNE** sur `FRUITS_LEGUMES`.
- **FAIBLE** sur `EPICERIE_SECHE`, `EPICERIE_APPERTISEE`, `BOISSONS`, `AUTRE`.

Un écart sur une famille de précision FAIBLE est affiché pour information et **n'alimente jamais
le levier de portion**. Il alimente en revanche le levier de substitution (§ 7.4 bis), qui ne
dépend d'aucune référence nutritionnelle.

La table de correspondance GEMRCN → familles d'achat est écrite en clair dans le fichier, avec ses
approximations commentées. C'est une décision de conception, pas une donnée.

### 5.4 Les cotations RNM

Source : Réseau des Nouvelles des Marchés, FranceAgriMer, section **« panier restauration
collective »**. Cotations libres d'accès, gratuites 45 jours après publication, immédiates moyennant
un droit d'accès modeste. Ce sont les cotations officielles utilisées pour indexer les marchés
publics de restauration collective.

Ingestion par une action Convex planifiée, mensuelle. Stockage :

```ts
cotations: defineTable({
  famille: vFamille,
  periode: v.string(),            // 'AAAA-MM'
  prixMoyenKgHT: v.number(),
  prixMoyenKgHTBio: v.optional(v.number()),
  source: v.string(),             // 'RNM'
  releveLe: v.number()
}).index('by_famille_and_periode', ['famille', 'periode'])
```

Le champ `prixMoyenKgHTBio` sert au calcul de prime quand la prime observée chez le client est
indisponible (§ 7.4).

### 5.5 La référence, en euros par couvert

```
reference(profil, famille, periode) =
    grammageParPortion(profil, famille)
  × portionsSur20Repas(profil, famille) / 20
  × prixMoyenKgHT(famille, periode)
  / 1000
```

Le résultat est un **euro par couvert**, pas une norme. C'est ce que coûte, au prix du marché du
mois, un repas conforme aux repères du métier pour ce profil.

---

## 6. Les entrées

### 6.1 Ce qu'on demande

| Entrée | Fréquence | Effort | Déjà collecté ? |
|---|---|---|---|
| Les factures | continu | dépôt ou comptabilité | oui |
| **Les couverts servis** | mensuelle | **un nombre** | non, à construire |
| Le profil de convive dominant | une fois | un choix | partiellement (`etablissementType`) |

**Les couverts servis sont la seule saisie manuelle du produit.** Le gérant les compte déjà pour
sa facturation. Toute tentation d'ajouter une deuxième saisie doit être refusée : c'est
l'engagement structurel qui nous sépare des ERP.

### 6.2 Ce qu'on ne demandera jamais

Fiches techniques, stocks, entrées et sorties, effectifs, plannings, allergènes, relevés HACCP,
pesées de gaspillage. Chacun de ces éléments, pris isolément, améliorerait la mesure. Ensemble,
ils font de nous un ERP, c'est-à-dire un produit que 70 % de la cible refuse.

### 6.3 Le profil multiple

Un site sert souvent plusieurs profils : un EHPAD avec un self pour le personnel, un collège avec
des adultes. **Version 1 : un profil dominant unique**, déclaré à l'inscription, modifiable par
mois. **Version 2 : une répartition en pourcentage.** L'approximation de la version 1 est affichée
sous le chiffre, comme toutes les autres hypothèses.

---

## 7. Les calculs

### 7.1 La dépense mesurée

```
depenseParCouvert(famille, periode) =
    Σ montantHT des invoiceLines alimentaires de la famille, dont invoiceDate ∈ periode
  / couvertsServis(periode)
```

Précisions non négociables :

- **Seules les lignes alimentaires** (`estAlimentaire === true`) entrent au numérateur.
- **Les avoirs et régularisations sont inclus**, avec leur signe. Ce sont de vrais euros. Un mois
  peut donc afficher une famille négative ; l'écran doit le supporter sans casser.
- **Les lignes non confirmées sont incluses** mais la part qu'elles représentent est affichée,
  comme le fait déjà `partNonConfirmee` pour les ratios EGalim.

### 7.2 Le décalage achat / consommation

Un mois où la cuisine a constitué du stock est faussé. C'est le principal défaut méthodologique du
produit et il se traite ainsi :

- **L'arbitrage se calcule sur une fenêtre glissante de trois mois**, par défaut.
- Le mois isolé est affiché pour information, avec un avertissement explicite quand il s'écarte de
  plus de 25 % de la moyenne des trois précédents.
- Aucun arbitrage n'est proposé sur moins de trois mois de factures.

### 7.3 L'écart

```
ecart(famille)        = depenseParCouvert(famille) - reference(profil, famille)
ecartRelatif(famille) = ecart(famille) / depenseParCouvert(famille)
```

Deux lectures selon le profil, et c'est la même arithmétique :

- **Profils ADULTE, ENFANT_*, ADOLESCENT** : un écart positif est un excès, donc une marge de
  manœuvre.
- **Profils PERSONNE_AGEE, PATIENT** : un écart **négatif** sur les familles protéiques est un
  signal de **sous-apport**, à remonter comme un risque de dénutrition, jamais comme une économie.

### 7.4 La prime qualifiante

Ce que coûte, en pourcentage, la version qualifiante d'un produit de cette famille. Trois sources,
dans cet ordre :

1. **Observée chez le client** : prix moyen au kilo de ses lignes qualifiantes de la famille,
   divisé par le prix moyen de ses lignes non qualifiantes. N'est retenue qu'à partir de 5 lignes
   de chaque côté sur la période.
2. **Cotation RNM** : `prixMoyenKgHTBio / prixMoyenKgHT`.
3. **Défaut du référentiel**, déclaré en code par famille, à défaut des deux précédentes.

La source employée est **affichée sous le chiffre**. Une prime observée chez le client est bien
plus convaincante qu'une moyenne nationale, et bien plus fragile ; le lecteur doit savoir laquelle
il regarde.

### 7.4 bis Les deux leviers, à ne jamais confondre

Le produit propose **deux** arbitrages de nature différente. Les mélanger produirait des
recommandations fausses.

**Levier de portion.** Réduire un excès de volume et réallouer l'argent libéré vers de la qualité.
Il suppose une référence nutritionnelle fiable, donc il n'est proposé **que sur les familles de
précision FORTE** : `VIANDE`, `POISSON`, `LAITIERS`. C'est le levier qui porte la promesse
« mieux manger à budget constant », et c'est celui qui parle au directeur.

**Levier de substitution.** À volume constant, basculer une part des achats vers leur version
qualifiante. Il ne suppose aucune référence nutritionnelle, seulement une prime et un montant, donc
il s'applique à **toutes les familles**, y compris celles de précision FAIBLE. Il est classé par
**points de taux gagnés par euro de surcoût**, ce que le doc 03 du business plan appelle le plan
de comblement, et ce que `OuAgir` approxime aujourd'hui par un majorant à l'échelle de la famille
entière.

C'est sur ce second levier que l'**épicerie sèche bio** est le meilleur rapport du marché : la
prime y est faible et le ratio se calcule en valeur d'achat, pas en volume. Un kilo de lentilles
bio pèse plus dans le taux qu'un kilo de pommes de terre conventionnelles.

Les deux leviers se cumulent et s'affichent séparément, avec leur coût net respectif : zéro pour
le premier, positif pour le second.

`OuAgir` est remplacé par la version fine du levier de substitution, calculée à la référence
plutôt qu'à la famille entière. Le majorant disparaît, et avec lui l'aveu inscrit dans son propre
commentaire.

### 7.5 L'arbitrage à budget constant, levier de portion

À dépense constante, réduire le volume de `r` permet de payer plus cher au kilo :

```
primeFinancable(famille) = ecartRelatif / (1 - ecartRelatif)
```

Vérification : 20 % d'excès financent 0,20 / 0,80 = **25 %** de prime. La prime Label Rouge se
situe entre 20 et 40 %.

```
partFinancable(famille) = min(1, primeFinancable / primeQualifiante)
```

### 7.6 Le gain de conformité

```
pointsDurable(famille)   = partFinancable × (montantFamille / totalAlimentaire) × 100
pointsViandePoisson      = partFinancable × (montantFamille / totalViandeEtPoisson) × 100
```

Le second n'est calculé que pour `VIANDE` et `POISSON`.

Ces points sont un **potentiel**, jamais un taux mesuré. Ils portent l'encre de la marque et
jamais le vert des seuils, règle déjà établie par `OuAgir`.

### 7.7 Les hypothèses affichées

Sous chaque chiffre d'arbitrage, en toutes lettres et sans repli :

- le profil de convive employé,
- la période de cotation employée,
- la version du référentiel métier,
- la source de la prime qualifiante,
- la fenêtre de calcul (trois mois glissants, du … au …),
- la part de dépense encore non confirmée.

### 7.8 Ce qu'on ne dit jamais en grammes

**Toute la restitution est en euros par couvert.** L'os, le parage, la variation de stock et les
rendements de cuisson rendent le gramme indéfendable devant un professionnel : il répondra « il y
a l'os » et il aura raison. L'euro sort de la facture, il ne se discute pas. Le grammage reste
dans le référentiel comme intermédiaire de calcul, il ne sort jamais à l'écran comme une mesure du
comportement du client.

Seule exception autorisée : la **fiche de grammages recommandés** (§ 9.4), qui affiche la
recommandation publique et jamais une mesure de ce que le client sert.

---

## 8. Le modèle de données

Multi-tenant strict par `organizationId`, sans exception. `cotations` et le référentiel sont
globaux mais ne contiennent aucune donnée client.

### 8.1 Tables nouvelles

```ts
// La seule saisie manuelle du produit.
couvertsMensuels: defineTable({
  organizationId: v.id('organizations'),
  annee: v.number(),
  mois: v.number(),                       // 1-12
  couvertsServis: v.number(),
  profilConvive: vProfilConvive,          // dominant, hérité du profil de l'organisation
  saisiPar: v.string(),
  saisiLe: v.number()
})
  .index('by_org_and_periode', ['organizationId', 'annee', 'mois'])
  .index('by_org', ['organizationId']),

// Une feuille d'arbitrage, figée à sa date.
arbitrages: defineTable({
  organizationId: v.id('organizations'),
  periodeDebut: v.string(),               // 'AAAA-MM'
  periodeFin: v.string(),
  profilConvive: vProfilConvive,
  couvertsTotal: v.number(),
  referentielMetierVersion: v.string(),
  referentielEgalimVersion: v.string(),
  periodeCotation: v.string(),
  lignes: v.array(v.object({
    famille: vFamille,
    depenseParCouvert: v.number(),
    reference: v.number(),
    ecart: v.number(),
    precision: v.union(v.literal('FORTE'), v.literal('MOYENNE'), v.literal('FAIBLE')),
    primeQualifiante: v.optional(v.number()),
    sourcePrime: v.optional(v.string()),
    partFinancable: v.optional(v.number()),
    pointsDurable: v.optional(v.number()),
    pointsViandePoisson: v.optional(v.number())
  })),
  partNonConfirmee: v.number(),
  avertissementStock: v.boolean(),
  produitLe: v.number()
}).index('by_org_and_periode', ['organizationId', 'periodeDebut']),

// La demande d'équivalents qualifiants, éditée au nom du client.
dossiersFournisseur: defineTable({
  organizationId: v.id('organizations'),
  arbitrageId: v.id('arbitrages'),
  supplierId: v.id('suppliers'),
  famille: vFamille,
  references: v.array(v.object({
    normalizedLabel: v.string(),
    rawLabelExemple: v.string(),
    montantAnnuelHT: v.number(),
    occurrencesAnnuelles: v.number()
  })),
  statut: v.union(
    v.literal('EDITE'),
    v.literal('ENVOYE'),
    v.literal('REPONSE_RECUE'),
    v.literal('SANS_SUITE')
  ),
  editeLe: v.number(),
  reponseLe: v.optional(v.number())
})
  .index('by_org', ['organizationId'])
  .index('by_arbitrage', ['arbitrageId']),

// Référence publique, sans aucune donnée client.
cotations: defineTable({ /* voir § 5.4 */ })
```

### 8.2 Champs ajoutés

`organizations` :

```ts
profilConvive: v.optional(vProfilConvive),   // le dominant, déclaré à l'inscription
```

`couvertsJour` reste, comme estimation d'inscription et pour la tarification. Il ne sert **jamais**
au calcul de l'arbitrage : seul `couvertsMensuels` fait foi.

---

## 9. Les écrans

Toutes les règles d'écran du projet s'appliquent sans exception : tablette d'abord, cibles
tactiles à 48 px, deux volets au-delà de 1024 px, le vide montre le chemin, couleurs de seuil
réservées.

### 9.1 `/app` — L'arbitrage du mois

Devient l'écran d'accueil de l'espace, à la place du tableau de bord des taux.

- En tête : le coût par couvert du mois, l'écart au mois précédent, et les couverts servis.
- Le corps : une ligne par famille, dépense contre référence, en euros par couvert. Les familles
  de précision FAIBLE sont regroupées en bas, repliées.
- Pour chaque famille en écart exploitable : l'arbitrage en une phrase, avec son gain de points.
- Les hypothèses, dépliables, sous le tableau.
- Un seul appel à l'action : **retenir un arbitrage**.

### 9.2 `/app/arbitrage/$id` — Une feuille figée

Comme un diagnostic : une fois produite, elle ne bouge plus. Export PDF, réutilisant
`src/screens/diagnostic/pdf.ts`.

### 9.3 `/app/couverts` — La saisie

Un nombre par mois. Douze champs sur une page pour l'année. Rien d'autre. Rappel automatique si le
mois précédent manque.

### 9.4 La fiche de grammages

Un PDF imprimable des grammages recommandés pour le profil du site, à poser sur la ligne de self.
Données publiques rendues utilisables. Ne contient **aucune** mesure du client.

### 9.5 Les écrans conservés

`factures`, `confirmer`, `produits`, `diagnostics`. Le diagnostic EGalim devient une **section du
rapport**, accessible depuis l'arbitrage, et non plus la destination du produit.

---

## 10. Le dossier fournisseur

Réutilise la machinerie de `src/lib/convex/egalim/courrier.ts`, avec une autre question.

**Contenu**, groupé par fournisseur :

- l'identité de l'établissement,
- ses références réelles de la famille visée, avec le libellé source du fournisseur,
- **le volume annuel, en euros HT et en occurrences** — l'élément qui change tout,
- la demande : équivalents qualifiants disponibles, leurs prix, leurs conditionnements,
- la mention légale d'obligation de moyens.

**Le levier :** un chef achète semaine par semaine et ne voit jamais son année. Un commercial à qui
l'on présente « 34 000 € de bœuf par an, voici mes douze références principales » ne répond pas
comme à une demande de catalogue. C'est du pouvoir de négociation sans centrale, sans masse, sans
aucun autre client. Il existait déjà, il était invisible.

**Précision juridique, non négociable :** le dossier est édité **au nom du client et signé par
lui**. Letikette est l'éditeur du document, jamais une partie à la relation commerciale. Aucune
commission, aucun référencement, aucune préconisation de fournisseur. C'est ce qui nous tient hors
du statut d'intermédiaire.

---

## 11. L'auditabilité

Les règles existantes s'étendent au nouveau périmètre :

- **Une feuille d'arbitrage livrée est figée, définitivement.** Une nouvelle mesure produit une
  nouvelle feuille, datée.
- Chaque feuille enregistre : version du référentiel métier, version du référentiel EGalim,
  période de cotation, profil de convive, fenêtre de calcul, part non confirmée.
- Chaque ligne de facture conserve son libellé source, sa classification, **sa justification** et
  son indice de confiance. Inchangé.
- Viande et poisson passent toujours devant un humain. Inchangé.
- `productLabels` reste globale et anonyme : un libellé, un verdict, un compteur. Jamais de
  montant, de fournisseur, d'organisation ni d'utilisateur. `cotations` obéit à la même règle.

---

## 12. Le prix

| | Prix | Ce qu'il couvre |
|---|---|---|
| Le premier arbitrage | **890 €** | 12 mois d'historique, la première feuille, le premier dossier fournisseur |
| L'abonnement | **290 €/mois** | La boucle mensuelle, les dossiers fournisseurs, les comparatifs, la vérification |
| Site supplémentaire | **140 €/mois** | Au-delà du troisième site |

Un écart de 0,18 € par couvert sur 300 couverts et 220 jours fait **11 880 € par an**. La
discussion de prix ne dure pas.

Le prix couvre le temps humain du cinquième temps de la boucle dès le premier client.

**Cette grille remplace celle du doc 03 du business plan** (diagnostic à 690 / 1 190 / 1 900 €,
abonnement à 190 / 290 / 390 €/mois). Deux raisons : le livrable n'est plus un diagnostic de
conformité mais un arbitrage récurrent, et le palier par taille de cantine disparaît au profit
d'un prix unique par site, la valeur produite dépendant du montant d'achats et non du nombre de
couverts. Le doc 03 est à mettre à jour, ainsi que le doc 02 dont le filtre de marché
(privé, non équipé, Île-de-France) ne correspond plus à la cible du § 3.

---

## 13. Ce qu'on ne construit pas

- Pas d'ERP : ni fiches techniques, ni stocks, ni production, ni allergènes, ni HACCP.
- Pas de centrale d'achat, sous aucune forme.
- Pas de place de marché, pas de mise en relation rémunérée.
- Pas de pesée de gaspillage, qui demande du matériel et un protocole.
- Pas de suivi multi-sites en phase 1.
- Pas de restauration commerciale.

---

## 14. Les lignes rouges et le vocabulaire

Inchangées et renforcées :

1. **On ne prend jamais la propriété des denrées.** Le producteur facture et livre en direct.
2. **On n'organise jamais le transport en nom propre**, statut réglementé de commissionnaire de
   transport.
3. **On ne choisit jamais le fournisseur.** On prépare une demande, le gérant décide.
4. **Le mot « garantie » est interdit**, et un test balaie toute l'interface.

---

## 15. Les risques, et ce qu'on en fait

| Risque | Décision |
|---|---|
| Le décalage achat / consommation fausse un mois | Fenêtre glissante de trois mois, avertissement au-delà de 25 % d'écart, aucun arbitrage sous trois mois de données |
| La correspondance GEMRCN → familles d'achat est approximative | Trois niveaux de précision déclarés, aucun arbitrage proposé sur les familles FAIBLE |
| Un chef conteste le grammage (« il y a l'os ») | On ne parle jamais en grammes, seulement en euros par couvert |
| Le GEMRCN est un guide volontaire hors scolaire | Présenté comme « la référence du métier », jamais comme une obligation, sauf en scolaire |
| Un site sert plusieurs profils | Profil dominant en V1, hypothèse affichée, répartition en V2 |
| La facture électronique dissout l'avantage OCR | L'avantage se déplace sur le sens de la ligne et la référence, pas sur la lecture |
| Les éditeurs comptables voient les mêmes factures | Ils n'ont ni le barème EGalim, ni la normalisation des libellés, ni les repères GEMRCN. Avance de savoir, à entretenir |
| Le temps humain du 5ᵉ temps ne passe pas à l'échelle | Assumé et facturé. Automatisé après une trentaine de réponses observées |
| Le chef vit l'outil comme une surveillance | Règle d'écran opposable : l'outil arme, il ne note pas. Aucun classement, aucun score, aucune alerte au directeur sans le chef |

---

## 16. Périmètre de cette spec et ordre de construction

**Cette spec couvre la phase 1 et elle seule.** Les phases 2 et 3 sont décrites pour la cohérence
d'ensemble et recevront chacune leur propre spec.

### Phase 1 — L'arbitrage (périmètre de cette spec)

1. `vProfilConvive` et le champ sur `organizations`
2. `couvertsMensuels` et son écran de saisie
3. `src/lib/nutrition/referentiel-metier.ts` et ses tests
4. L'ingestion des cotations RNM et la table `cotations`
5. Le calcul des **deux leviers** (§ 7) et leurs tests, portion et substitution
6. L'écran `/app` d'arbitrage et la feuille figée, `OuAgir` remplacé par le levier de
   substitution calculé à la référence
7. Le dossier fournisseur
8. La fiche de grammages imprimable
9. Le rapport mensuel envoyé trois jours avant la fin de mois

### Phase 2 — Les menus (spec séparée)

Le plan alimentaire entre **comme les factures : un document qu'on lit, jamais un formulaire**. Le
gérant dépose son cycle une fois, on le rapproche de ses achats réels et de ses prix réels.

Le livrable n'est **pas** une suggestion de recette, c'est le **plan d'exécution de l'arbitrage** :
sur quels plats du cycle le poste en excès apparaît, ce qu'ils coûtent, ce qu'ils coûteraient, et
où une variante aux légumineuses passe sous le coût actuel tout en prenant le repas végétarien
hebdomadaire.

Dépendance stricte : sans les achats, rien n'est chiffrable, et un menu non chiffré aux vrais prix
ne vaut rien. La phase 2 ne peut pas précéder la phase 1.

### Phase 3 — Le contrôle de facture et le multi-sites (spec séparée)

Prix facturé contre cotation et contre tarif négocié, doublons (déjà construit), anomalies de
conditionnement. Puis la consolidation multi-sites pour les groupes.

---

## 17. Ce qui reste ouvert

Nommé plutôt que caché. Aucun de ces points ne bloque la phase 1.

- **Le droit d'accès RNM immédiat** : coût exact et conditions à confirmer auprès de FranceAgriMer.
  À défaut, les cotations à 45 jours suffisent, avec un décalage assumé et affiché.
- **La granularité des cotations** : le RNM cote des produits, notre référentiel raisonne en
  familles. La règle d'agrégation produit → famille est à écrire et à faire relire.
- **Le canal d'envoi du dossier fournisseur** : courrier édité que le gérant transmet lui-même, ou
  envoi par e-mail en son nom. La seconde option demande son autorisation explicite.
- **Les CGU et la politique de confidentialité**, toujours à rédiger, toujours bloquantes pour
  ouvrir un compte marchand Paddle.
