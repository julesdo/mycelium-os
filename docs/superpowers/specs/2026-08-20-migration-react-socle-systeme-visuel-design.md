# Migration React : socle et système visuel

Date : 2026-08-20
Statut : validé en brainstorm, à implémenter
Chantier : 1 sur 5

## Pourquoi ce chantier

L'interface actuelle échoue sur quatre plans à la fois : les écrans sont mal composés,
les composants font génériques, l'identité visuelle est absente, et le parcours ne coule
pas. Le tableau de bord en est l'exemple : une pile verticale de cartes en verre, aucune
densité, aucune hiérarchie, et 67 valeurs Tailwind arbitraires semées à la main dans
quatre écrans.

La décision prise est de reconstruire le frontend en React 19 pour adopter Cladd, un kit
d'interface dense et opinionné, et de repenser le produit dans la foulée. Le backend ne
bouge pas.

Il faut être lucide sur ce que le kit résout : Cladd corrige les composants et contribue
à l'identité. Il n'a aucune opinion sur la composition des écrans ni sur le parcours.
C'est pourquoi ce chantier livre, en plus du kit, deux artefacts qui n'existaient pas :
un contrat d'écran opposable en relecture, et une règle de lint qui transforme la
discipline en échec de compilation.

## Périmètre

### Ce qui disparaît

`src/routes`, `src/lib/components`, `src/lib/chat`, `src/blocks`, `src/lib/emails`,
`src/i18n`, soit environ 660 fichiers, ainsi que les dépendances Svelte, SvelteKit,
Tolgee, bits-ui et shadcn-svelte.

Dont 5 176 lignes de chat hérité de Fleet (`ai-elements`, `prompt-kit`, `lib/chat`) qui
n'étaient déjà routées nulle part, et le doublon `/app/parametres` et `/app/settings`,
deux écrans de réglages dont l'un en anglais.

### Ce qui ne bouge pas d'un octet

| Chemin | Poids | Rôle |
|---|---|---|
| `src/lib/convex/**` | 103 fichiers, 13 531 lignes | Le moteur de mesure EGalim entier |
| `src/lib/egalim/**` | 194 lignes | Les types partagés du barème |
| `src/lib/fixtures/**` | 6 fichiers | Les factures de test |
| Tests unitaires | 41 fichiers, 5 142 lignes | 562 tests verts, la preuve que la mesure est juste |
| `convex.json` | 1 ligne utile | Pointe sur `src/lib/convex/` |

**Déplacer le dossier Convex serait la faute la plus coûteuse de ce chantier.** Il reste
exactement où il est. `convex.json` n'est pas modifié.

Les sept emails transactionnels sont déjà pré-compilés en HTML pur dans
`src/lib/convex/emails/_generated/`, sans aucun import Svelte au runtime. Ils survivent
tels quels : l'authentification ne casse pas. Les ré-écrire en `react-email` est une
tâche cosmétique reportée au chantier 4.

### Prérequis bloquant

La branche `moulinette-v0` porte 38 commits et n'existe sur aucun dépôt distant. Elle est
poussée sur `origin` avant la première suppression de fichier.

## La pile

- React 19, TanStack Start sur Vite, TanStack Router en routage par fichiers
- Tailwind CSS v4, `@cladd-ui/react`
- `convex/react`, le client de référence de Convex
- `@convex-dev/better-auth/react-start`, exporté par le paquet officiel
- Déploiement Cloudflare
- Français écrit en dur dans les composants. Ni préfixe de route, ni couche i18n.

Le choix de TanStack Start n'est pas esthétique : `@convex-dev/better-auth` expose
nativement un point d'entrée `./react-start`. Le branchement de l'authentification, qui
est la partie la plus fragile de la migration, passe ainsi par une voie supportée en
amont plutôt que par un paquet communautaire.

## Le système visuel

### Posture

Clair par défaut, sombre disponible, préférence persistée. L'utilisateur est un gérant de
cantine, sur tablette, en bureau ou en cuisine, souvent en plein jour.

`CladdProvider` reçoit `theme` et `accentColor` à la racine.

### L'accent et les couleurs réservées

L'accent est un bleu d'encre, posé dans l'emplacement `cladd-color-brand` dont Cladd
dérive la rampe OKLCH.

**Le vert, le rouge et l'ambre sont réservés à la lecture des seuils** : au-dessus,
en dessous, tout près. Aucun élément décoratif ne les porte. Un accent vert rendrait
illisible d'un coup d'oeil le seul chiffre qui compte, celui qui dit si la cantine passe.

### L'échelle retunée pour le tactile

Cladd est réglé pour un éditeur de bureau piloté à la souris, ce qu'il annonce lui-même.
Sa taille par défaut donne un contrôle de 28px, et seule sa taille `2xl` atteint 48px. Le
texte des boutons est figé à 12px quelle que soit la taille. Or ce produit est tactile et
son plancher est de 48px.

Les échelles sont de simples blocs `@theme`. On les retune une fois, dans un fichier
unique relu comme du code, et l'interdiction d'en sortir reste entière.

Espacement, qui commande les hauteurs de contrôle :

| pas | 3xs | 2xs | xs | sm | md | lg | xl | 2xl |
|---|---|---|---|---|---|---|---|---|
| Cladd | 12 | 16 | 20 | 24 | 28 | 32 | 40 | 48 |
| Mycelium | 16 | 20 | 24 | 32 | 40 | **48** | 56 | 64 |

Le pas `lg` vaut 48px et devient la taille par défaut des contrôles, posée une fois via
`CladdProvider defaults`. Les surfaces qu'on lit sans les toucher, lignes de tableau et
puces, gardent `sm` ou `md`.

Typographie, remontée d'un cran :

| pas | 4xs | 3xs | 2xs | xs | sm | md |
|---|---|---|---|---|---|---|
| Cladd | 6 | 8 | 10 | 12 | 14 | 16 |
| Mycelium | 8 | 10 | 12 | **14** | 16 | 18 |

Le texte des boutons, figé sur `xs` par la bibliothèque, passe ainsi à 14px.

Rayons : attention, `radius.css` calcule chaque pas avec des numérateurs écrits en dur
rapportés à la base `md` de 28px. **Retuner l'espacement sans réécrire ces numérateurs
désaccorderait les arrondis de l'échelle.** Les trois blocs se retunent ensemble. La base
`--cladd-radius` passe de 8px à 10px, à confirmer par un examen visuel.

Aucun composant de Cladd n'est forké. Les défauts produit passent par
`CladdProvider defaults`, que la bibliothèque expose pour cet usage.

## Le contrat d'écran

C'est l'artefact qui manquait, et c'est lui qui traite les deux griefs que le kit ne
couvre pas. Sept règles, écrites pour être opposables en relecture.

1. **Une question par écran.** Le pilotage répond « où j'en suis », le dépôt « comment je
   fournis mes données », la confirmation « que dois-je trancher », la restitution « que
   puis-je montrer ». Un écran qui répond à deux questions se scinde.

2. **Tableau par défaut, carte par exception.** Au-delà de trois éléments homogènes,
   c'est un tableau dense. La carte est réservée à un objet unique et hétérogène. Cette
   règle interdit à elle seule la pile de cartes du tableau de bord actuel.

3. **Deux volets au-delà de 1024px.** Tout écran de travail se lit liste à gauche, preuve
   à droite. En dessous de cette largeur, la liste seule et la preuve en feuille
   glissante.

4. **Le chiffre occupe la surface, pas le cadre.** Une carte dont le contenu tient en une
   ligne est interdite.

5. **Pas d'effet sans fonction.** L'ombre, le dégradé et le relief ne disent qu'une
   chose, la profondeur d'une surface, et c'est le rôle de la primitive `Surface` de
   Cladd. Jamais de décor.

6. **Le vide montre le chemin.** Un écran sans données affiche l'amorçage, jamais des
   cadrans à zéro, qui donnent à un outil de conformité l'air d'être cassé.

7. **Le mot « garantie » est interdit.** On mesure, on fait progresser, on prouve. Règle
   déjà en vigueur, déjà vérifiée par un test, reconduite telle quelle.

## La muselière

Trois interdits, en échec de `bun run lint`, jamais en pre-commit puisque les hooks
dépassent déjà deux minutes :

- toute valeur Tailwind arbitraire de la forme `-[...]` hors de `src/ui/**` ;
- toute couleur littérale, hexadécimale ou `rgb()`, hors du fichier de tokens ;
- tout utilitaire de taille de police hors de `src/ui/**`, ce qui force l'échelle Cladd.

L'arborescence rend ces règles lisibles et vérifiables :

```
convex.json              inchangé, pointe sur src/lib/convex/
src/lib/convex/**        intact, le moteur
src/lib/egalim/**        intact, les types du barème
src/lib/fixtures/**      intact
src/styles/tokens.css    les blocs @theme retunés, l'accent bleu d'encre
src/ui/**                les primitives. SEULE zone où des classes Tailwind s'écrivent
src/screens/**           un dossier par écran. Composition uniquement
src/routes/**            TanStack Router, arborescence plate, français en dur
```

## La coquille

Rail de navigation à gauche, 72px replié et 240px déplié, état persisté. Trois entrées,
avec le dépôt en action primaire placée au-dessus de la navigation. En dessous de 768px
le rail devient une barre basse. Canevas à 24px.

Format de référence : tablette en paysage, 1024 par 768.

## Vérification

Trois pieds, dont le troisième est nouveau.

1. **Le kit** contraint les contrôles.
2. **Le contrat et le lint** contraignent la composition.
3. **Le regard.** Chaque écran est ouvert dans le panneau navigateur intégré aux quatre
   largeurs de référence, 375, 768, 1024 et 1280, avant d'être déclaré fini. C'est ce qui
   aurait attrapé la pile de cartes du tableau de bord, qu'aucune des deux premières
   barrières n'aurait vue.

À quoi s'ajoutent, repris de l'existant : le test de non-débordement horizontal aux
quatre largeurs, et les 562 tests unitaires du moteur, qui doivent rester verts de bout
en bout puisque rien de ce qu'ils couvrent n'est touché.

## Ce que ce chantier ne fait pas

Il ne redessine aucun écran produit. Il livre un socle qui démarre, s'authentifie, se
déploie, et rend la coquille de l'application dans le langage visuel arrêté ici, avec les
barrières en place.

Les écrans viennent ensuite, dans cet ordre : la boucle centrale (dépôt, confirmation,
pilotage), la restitution (diagnostic figé, certificats, courriers), la périphérie
(onboarding, paramètres, site public, emails en `react-email`), puis le harnais E2E.

## Risques assumés

**Cladd est en version 0.18.5 et compte 392 téléchargements par semaine.** C'est une
bibliothèque jeune et peu adoptée. Le jour où l'un de ses composants casse sur Safari iOS
en tablette, le format de référence de ce produit, il est probable qu'on soit les
premiers à le découvrir. Atténuation : la version est épinglée à l'exact, aucun composant
n'est forké, et le contrat d'écran ne dépend d'aucune API de Cladd, donc il survivrait à
un remplacement du kit.

**La bascule est sèche.** Le produit est inutilisable et non testable pendant la durée du
chantier. C'est acceptable parce qu'aucun utilisateur ni aucune démonstration n'est
attendu avant plusieurs mois, et parce que le harnais E2E est de toute façon reconstruit.

**Huit pannes du harnais E2E ont été déminées une à une** sur la version Svelte. Ce
travail est perdu, et les mêmes classes de pannes se représenteront : chauffe du
frontend, attente d'hydratation, redirection d'onboarding, résolution de l'URL de test.
Le chantier 5 part de ce constat plutôt que de le redécouvrir.
