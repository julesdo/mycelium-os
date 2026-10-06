# Le site Letikette — direction artistique (06/10/2026)

Demande du fondateur : reprendre le site section par section, « apporter des formes, de
l'humanité, un feeling, une vraie DA en intégrant notre cible », à partir des vingt meilleurs
sites relevés sur Mobbin. Et retirer le gros SVG du téléphone du héros, qui faisait saccader la
page sur mobile, au profit d'images PNG.

## La cible, et ce qu'elle doit ressentir

Le gérant d'une TPE ou d'une PME qui facture d'autres entreprises : un menuisier, un grossiste,
une agence, un transporteur. Il n'est ni juriste ni directeur financier. Il a des factures
impayées, il n'aime pas relancer (il a peur de perdre le client), et il ignore qu'une date
limite court sur chacune.

Ce qu'il doit ressentir en trois secondes : **quelqu'un est de son côté, calmement**. Pas une
salle des marchés noire, pas un cabinet d'huissier : un bureau d'atelier, du papier, un crayon,
et la loi qui joue pour lui.

## Le système

- **Le papier chaud.** Fond crème (`--color-creme`), sections alternées d'un crème plus profond,
  une seule section d'encre (le manifeste) et le pied de page. Le noir pur disparaît.
- **L'encre bleue.** Le texte et les surfaces sombres sont un bleu d'encre profond, la couleur de
  la marque. Aucun vert, ambre ni rouge décoratif : ils restent réservés aux seuils, dans le
  produit comme sur ses captures.
- **Les teintes des familles.** Les cartes du site prennent la teinte de la famille dont elles
  parlent dans l'application : l'argent en bleu, le temps en lavande, les papiers en ciel, ce
  qu'on vous demande en rose — la règle du produit, « la teinte dit de quoi il s'agit », portée
  sur sa vitrine. L'abricot pâle donne la chaleur du papier.
- **La serif d'affiche.** Les titres passent en Newsreader : éditoriale, humaine, lisible. Le
  texte courant reste la fonte du produit.
- **La main.** Des annotations à l'écriture manuscrite (Caveat Brush), des traits tirés à la
  main sous un mot, des flèches : quelqu'un a lu et souligné pour vous. Avec parcimonie.
- **Les formes.** Des galets (formes organiques à bords doux) derrière les objets, de grandes
  cartes très arrondies, des autocollants légèrement inclinés, des bords de section courbes.
  Tout en CSS : aucun SVG lourd.
- **Le vrai produit.** Les écrans montrés sont des captures PNG des vrais écrans
  (`scripts/capturer-ecrans.ts`), servis en deux largeurs par `srcset`.
- **L'honnêteté.** Aucun faux témoignage, aucun logo de client inventé. Les situations types
  portent des prénoms d'exemple, et le disent.

## Les vingt références retenues, et ce que chacune apporte

| # | Site | Section | Ce qu'on en prend |
|---|------|---------|-------------------|
| 1 | Podia | Héros | Fond pêche, galets organiques, bord de section courbe |
| 2 | Graza | Étapes | Annotations manuscrites dans des ovales tiretés, papier chaud, serif |
| 3 | Fruitful | Héros | Le téléphone qui flotte, une carte posée par-dessus |
| 4 | Mural | Fonctionnalités | Tuiles teintées, formes simples et ludiques |
| 5 | Typeform | Fonctionnalités | Cartes douces portant des fragments d'interface |
| 6 | Loom | Usages | Grandes cartes pastel très arrondies |
| 7 | Airtasker | Comment ça marche | Écran du produit coupé dans une carte de couleur franche |
| 8 | Braintrust | Comment ça marche | Étapes numérotées, carte pastel et capture |
| 9 | Intercom | Tarifs | Carte décalée sur un bord coloré, prix en serif, filet pointillé |
| 10 | Dovetail | Tarifs | Crème et cadres d'illustration |
| 11 | Hilos | Appel final | Panneau arrondi abricot, titre serif, une seule action |
| 12 | The Leap | Pied de page | Fond sombre chaud, grande marque, ruban de couleur |
| 13 | Daylight | Mot du fondateur | Lettre sur un aplat teinté, serif, signature |
| 14 | Handshake | Mot du fondateur | Carte blanche posée sur un dégradé, signature manuscrite |
| 15 | Ada | Mot du fondateur | La lettre qui se lit comme une lettre, colonne étroite |
| 16 | incident.io | Mot des fondateurs | Le texte et la signature côte à côte, sans emphase |
| 17 | Wise | Manifeste | Un bloc typographique plein cadre sur la couleur de marque |
| 18 | Mercury | Produit | La sérénité : beaucoup d'air autour d'un seul écran |
| 19 | Fluz | Offres | Grandes cartes teintées qui portent chacune un objet |
| 20 | Quicken | Héros | Des cartes de données flottantes autour d'un sujet humain |

## L'ordre de la page

Barre · Héros · Vous vous reconnaissez ? · La loi · La vie d'une facture · Comment ça marche ·
Manifeste · Le veilleur · Les limites · L'abonnement · Le prix · Le mot du fondateur · Appel ·
Pied de page.
