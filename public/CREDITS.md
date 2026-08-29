# Ce qui, sur ce site, ne vient pas de nous

Deux jeux d'éléments visuels sont empruntés. Les photographies ont leur propre
fiche, `public/photos/CREDITS.md`. Celle-ci porte les **dessins au trait**.

## Les dessins du fond

Les quatorze dessins qui habillent le fond du héros — carotte, tomate, salade,
brocoli, oignon, poisson, volaille, fromage, œuf, pain, épi, marmite, couvert,
ticket de caisse — sont tirés de la variante « black » d'**OpenMoji**, le projet
libre d'emoji et d'icônes de la Hochschule für Gestaltung Schwäbisch Gmünd.

> Tous les emoji sont conçus par [OpenMoji](https://openmoji.org/) — le projet
> libre d'emoji et d'icônes. Licence : **CC BY-SA 4.0**.

La licence [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) exige
l'attribution ci-dessus, et impose que **toute adaptation se partage sous la même
licence**. Nos adaptations sont celles que décrit
`scripts/telecharger-doodles.ts` : les attributs d'aspect répétés sur chaque
tracé sont hissés sur la racine, et la couleur devient `currentColor`. Elles
vivent dans `src/ui/dessins.tsx`, sous CC BY-SA 4.0 comme leur source.

Le partage à l'identique porte **sur ces dessins**, pas sur le reste du site :
les inclure dans une page n'en fait pas une œuvre dérivée.

## Ce qui a été écarté, et pourquoi

Le besoin était un jeu de dessins **au trait, dessinés à la main, alimentaires**,
posable en fond sans rien coûter en requêtes.

- **`streamline-freehand`** (1000 icônes, CC BY 4.0, sur Iconify) — le bon style,
  exactement. Mais son inventaire libre s'arrête aux catégories bureautiques :
  ni carotte, ni poisson, ni fromage. Le volet alimentaire est dans la version
  payante. Vérifié en listant la collection, pas supposé.
- **`pepicons-pencil`** (1275 icônes, CC BY 4.0) — quatre entrées alimentaires en
  tout, dont deux sont des icônes d'interface.
- **`doodle-icons`** (npm, MIT, d'après les Doodle Icons de Khushmeen Sidhu, CC0)
  — le bon style et une catégorie « Food ». Écarté sur la mécanique : le paquet
  déclare React 17 en dépendance de pair et n'a pas bougé depuis 2022. Un
  conflit d'installation sur React 19 pour quatorze dessins décoratifs.
- **`game-icons`** (CC BY 3.0) — inventaire alimentaire très riche, mais des
  silhouettes pleines. Posées en fond, ce sont des taches, pas des traits.

## Pourquoi ils sont copiés dans le dépôt

Même raison que pour les photographies, et elle est écrite en entier dans
`public/photos/CREDITS.md` : **aucune requête vers un tiers depuis la page
publique.** Appeler `api.iconify.design` à chaque visite ferait de son
hébergeur un destinataire de l'adresse IP de chaque visiteur, donc une ligne au
tableau des sous-traitants de la politique de confidentialité — laquelle affirme
que le service ne cède aucune donnée.

Les tracés sont donc figés dans `src/ui/dessins.tsx`, par
`bun scripts/telecharger-doodles.ts`, qu'on relance pour en ajouter un.
