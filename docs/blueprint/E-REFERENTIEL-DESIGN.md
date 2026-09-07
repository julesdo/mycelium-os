# E — Référentiel design

Ce que font réellement les produits financiers qu'on admire, **mesuré** dans leur DOM le
3 septembre 2026 — pas décrit d'après souvenir. Et ce qu'on en retient pour Letikette.

---

## 1. Les mesures

| | Fond | Police | Titre principal | Graisse | Rayon des boutons |
|---|---|---|---|---|---|
| **Revolut Business** | `#000` pur | Inter | 54 px, interligne 1,0, interlettre −1,2 px | **500** | pilule (9999 px) |
| **Ramp** | blanc pur | Lausanne *(propriétaire)* | 40 px, interligne 42 px | **400** | — |
| **Mercury** | blanc | Arcadia *(propriétaire)* | 28 px, interligne 30,8 px | **480** | — |
| **Qonto** | blanc | QontoSans *(propriétaire)* | 72 px | 700 | 8 px |

## 2. Les quatre leçons, dont trois contre-intuitives

### Leçon 1 — Les produits financiers respectés n'écrivent PAS en gras

Trois sur quatre affichent leur titre principal entre **400 et 500**. Ramp, la référence du secteur,
est à **400 sur 40 px** — c'est-à-dire une graisse de texte courant sur un titre de héros.

Seul Qonto est à 700, et c'est l'outsider commercial du groupe.

**Pourquoi ça marche :** le gras est le registre de celui qui doit convaincre. La graisse normale est
celui de celui qui constate. Un produit qui manipule l'argent des autres a intérêt au second.

⚠️ **Notre page d'accueil affiche ses trois chiffres légaux en `font-medium` sur 124 px.** C'est
cohérent avec cette leçon — la taille crie, la graisse reste calme. **Ne pas passer en `bold` :** ce
serait quatre fois trop fort et ça ferait basculer la page dans le registre publicitaire.

### Leçon 2 — Ni gris doux, ni presque-noir : le noir pur ou le blanc pur

Revolut Business est en `rgb(0, 0, 0)`. Pas `#0a0a0a`, pas un gris ardoise. Ramp et Mercury sont en
blanc franc.

**Pourquoi :** le contraste maximal est ce qui rend un chiffre lisible d'un coup d'œil. Les gris
intermédiaires sont un réflexe de designer, pas un besoin de lecteur.

### Leçon 3 — Un seul accent, et uniquement sur l'action

Chez Ramp, le jaune apparaît **une fois** dans tout le premier écran : sur le bouton principal. Tout
le reste est noir sur blanc. Chez Revolut, le bouton est blanc sur noir — l'accent, c'est
l'inversion.

**C'est déjà notre règle**, et elle est plus stricte encore : le vert, le rouge et l'ambre
(`--color-seuil-*`) ne veulent dire qu'une chose — au-dessus du seuil, tout près, en dessous. Aucun
élément décoratif ne les porte. C'est pour ça que l'accent de marque est un bleu d'encre et jamais un
vert.

### Leçon 4 — Ils achètent leur identité, nous devons la construire

Trois sur quatre utilisent une **police propriétaire** (Lausanne, Arcadia, QontoSans). C'est comme ça
qu'on obtient une identité sans décoration : la lettre elle-même est la marque.

**Nous ne pouvons pas licencier ça aujourd'hui.** Notre identité vient donc d'ailleurs, et elle
existe déjà :

- **Le sérif éditorial** sur les titres de la page publique, là où tout le secteur est en sans-serif.
- **Les chiffres de la loi en très grand corps, sans boîte ni cadre.** Le seul contenu qui a le droit
  de crier est celui qui ne nous appartient pas.
- **Les montants en chasse fixe**, pour que les centimes s'alignent d'une ligne à l'autre.

## 3. Ce que « expérience type Revolut » veut dire ici — et ce que ça ne veut pas dire

Le manifeste demande un « brutalisme financier », un mode sombre, des montants en chasse fixe. Deux
précisions qui évitent un contresens.

### Le kit va déjà dans ce sens

**Cladd est sombre par défaut.** Le mode sombre n'est donc pas un combat contre le kit, c'est son
terrain naturel. Et Cladd est *dense* — son `md` vaut 28 px, ce qui est plus serré que ce que la
plupart des kits proposent. C'est exactement le registre « information-rich » de Ramp et Mercury.

⚠️ **Notre échelle est décalée dans `src/styles/tokens.css`** pour que `md` tombe sur 48 px, parce que
le produit est tactile et que la cible tactile minimale est de 48 px. **Ça ne veut pas dire forcer
`size="lg"` partout** — la doc du kit l'interdit explicitement (« Don't default to `lg` everywhere »,
« When in doubt, `md` »). On décale l'échelle, puis on suit les conventions du kit à la lettre.

### Deux identités, délibérément séparées

| | Registre | Pourquoi |
|---|---|---|
| **La page publique** | Papier, encre, filet. Sérif éditorial, fond crème, bleu d'encre. | Elle doit lire *institution*, pas *startup*. C'est là qu'on demande de la confiance avant d'avoir rien prouvé. |
| **Le produit** | Dense, sombre, tactile. Chasse fixe sur les montants. | C'est un instrument de travail qu'on ouvre tous les matins. |

**Ne pas unifier les deux.** Un produit qui ressemble à sa page de vente perd son autorité
d'instrument ; une page de vente qui ressemble au produit ne rassure personne.

## 4. Les quatre doctrines du manifeste, traduites en instructions

### 4.1 Le logiciel décide, le gérant confirme

Aucun écran ne demande une saisie que le logiciel peut déduire. **Un champ vide qu'il aurait pu
remplir est un défaut, pas une option.**

*Contre-exemple corrigé le 3 septembre :* l'écran d'entrée demandait un type d'établissement et un
nombre de couverts par jour, puis les **jetait** — ni l'un ni l'autre n'était envoyé à la mutation. Un
champ qu'on remplit pour rien apprend au lecteur que ses réponses ne servent à rien.

### 4.2 L'éradication du jargon

| Ce qu'on n'écrit jamais | Ce qu'on écrit |
|---|---|
| « Signification de l'ordonnance d'injonction » | « Faire signifier le jugement par commissaire de justice — il reste 9 jours » |
| « Créance exigible non prescrite entre commerçants » | « Ce dossier remplit les quatre conditions » |
| « Score de solidité : 0,62 » | « Trois des quatre pièces attendues sont absentes » |

⚠️ **La troisième ligne n'est pas qu'une question de style : c'est la ligne rouge n° 3.** « Ce dossier
est trop faible pour être engagé » serait un conseil ; « trois des quatre pièces sont absentes » est
un constat. Voir `D-JURIDIQUE.md`.

### 4.3 La friction positive

Les actions légales engagent. Valider l'envoi d'un dossier à un commissaire de justice **n'est pas un
clic**.

**Composants Cladd à utiliser :** `Slider` pour un glissement à confirmer, `Dialog` pour un confirme
modal, `OTP Field` si on veut un code. Ne pas construire un bouton `<div>` qui simule un glissement.

**Où l'appliquer, et seulement là :** toute action qui produit une pièce partant à l'extérieur, ou
qui engage des frais. Pas sur un enregistrement de règlement, pas sur un filtre. La friction perd
tout son sens si elle est partout.

### 4.4 L'explicabilité absolue

**Chaque montant affiché est cliquable** et ouvre sa décomposition : la formule, le taux en vigueur à
la date, le nombre de jours exact, la base annuelle, et le lien vers la pièce source.

**Composant Cladd :** `Popup` (« full-screen overlay for task editors, settings panels, and detail
sheets ») pour le panneau latéral, ou `Popover` pour une décomposition courte ancrée au chiffre.

C'est le reçu de transaction de Letikette, et c'est ce qui distingue le produit d'un tableau de bord.

## 5. Les règles Cladd, non négociables

Tirées de `get_foundation('pitfalls')`. **À lire avant d'écrire du Cladd non trivial.**

**On ne réinvente aucun composant.** Un `<div>` avec `bg`, `border` et `rounded` est une `Surface`.
Une rangée de boutons est un `Toolbar`. Un choix unique est un `Segmented`, un choix multiple un
`ToggleGroup`. Une liste verticale est une `List` avec des `ListButton`. Un intitulé de section est
un `SectionTitle`. Les comportements contextuels — taille propagée, chip qui s'ajuste à sa rangée,
profondeur de surface — **n'existent que si le vrai composant est dans l'arbre**.

**Les classes de mise en page vont sur `contentClassName`**, jamais sur `className`, pour `Surface` et
`SurfaceCut`. L'erreur est muette : elle ne casse rien, ne déclenche aucun avertissement, et ne se
voit qu'à l'écran. Seize occurrences ont dû être corrigées lors du remodelage.

**On ne niche pas un `SurfaceCut` dans un `SurfaceCut`.** Creusé sur creusé ne produit aucune
profondeur. Pour remonter un panneau au-dessus d'un parent creusé : `Surface` avec
`surfaceLevel="+1"`.

**On n'invente aucun suffixe de token.** `bg-cladd-surface-2` et `text-cladd-fg-2` n'existent pas.
L'échelle d'espacement s'arrête à `3xs` — `gap-cladd-4xs` est silencieusement inerte.

**On ne dimensionne pas une icône dans un `Button` ou un `Chip`.** Le parent applique déjà une taille
appariée ; un `size-3.5` sur l'icône est un no-op.

**Il n'y a pas de composant Tableau dans Cladd.** Le nôtre vit dans `src/ui/tableau.tsx`.

**Source de vérité : le serveur MCP de Cladd** (`https://cladd.io/mcp`). `list_components` pour
l'inventaire, `get_component` pour les props, `get_foundation` pour `quickstart`, `surfaces`,
`colors`, `sizing` et `pitfalls`. **Ne jamais reconstituer l'API en lisant le code compilé** — c'est
comme ça qu'on réinvente.

## 6. La muselière

`src/ui/**` est la **seule** zone où des classes Tailwind s'écrivent librement. Ailleurs,
`bun run lint` refuse les valeurs arbitraires (`-[...]`), les couleurs littérales et les tailles de
police hors échelle. Ce n'est pas une convention, c'est un échec de construction.

## 7. Le regard

Chaque écran s'ouvre dans le navigateur intégré **aux quatre largeurs de référence — 375, 768, 1024
et 1280 px — AVANT** d'être déclaré fini. La route `/showroom`, en développement uniquement, rend
chaque écran avec des données de démonstration sans backend ni authentification, précisément pour ça.

⚠️ **`bun run dev` ne démarre pas de backend sur cette machine** (`spawn unzip ENOENT`). Utiliser
`bun run dev:cloud`.

⚠️ **Ce que le regard seul ne voit pas.** Un chiffre qui déborde sa colonne de 6 % retombe en deux
lignes sous un `leading-none` et ça se remarque à peine. Compléter par des **mesures DOM** :
`scrollWidth` contre `clientWidth`, et le nombre de lignes calculé depuis la hauteur divisée par la
taille de police. C'est comme ça qu'un défaut présent depuis le premier jour a été trouvé.

## 8. Les règles d'écran, courtes et opposables

1. **Le logiciel décide, le gérant confirme.**
2. **Tout traitement se voit sans qu'on le demande.** Lecture en cours, échec, progression : chaque
   état s'affiche de lui-même, sans rechargement.
3. **Deux volets au-delà de 1024 px** sur tout écran de travail : liste à gauche, preuve à droite. En
   dessous, la liste seule et la preuve en feuille.
4. **Le vide montre le chemin**, jamais des cadrans à zéro.
5. **Le mot « garantie » est interdit**, et un test balaie toute l'interface.

## 9. Ce qui reste à trancher

- **Le logo est une assiette de porcelaine**, héritée du modèle précédent. C'est une décision de
  marque.
- **L'imagerie de la page d'accueil.** Il n'existe pas d'imagerie du recouvrement qui ne soit pas un
  cliché ; la page tient aujourd'hui par sa typographie, et c'est assumé. Les quatre références
  mesurées ci-dessus confirment que c'est tenable : aucune ne s'appuie sur de la photographie.
- **Une police sous licence.** C'est ce qui sépare notre identité de la leur. À reconsidérer quand le
  budget le permet — c'est un des rares achats qui change durablement la perception d'un produit
  financier.
