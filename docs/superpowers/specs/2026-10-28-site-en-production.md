# Le site d'après la maquette V26, en production au pixel près

_28/10/2026. Demande du fondateur, après la V26 de la maquette : « comment on met ça en place sur le vrai site au pixel près ». Plan validé le même jour (« Ok let's go »)._

## Le principe

On ne retape pas la maquette, on la **transplante**. Son style et ses moteurs passent tels quels dans le vrai code ; seuls les chiffres se branchent sur leurs vraies sources. Chaque section se compare ensuite à la maquette, au pixel, avant d'être déclarée finie.

- **La référence est au dépôt** : `docs/superpowers/maquettes/2026-10-28-site/` (la page, les quatre photos des métiers, les logos). Elle vivait dans un dossier temporaire de session.
  - Un doctype lui a été ajouté. La publication enveloppe la page dans un document standard ; le fichier ouvert seul se rendait en mode de compatibilité, avec une marge de 1em sous chaque formulaire. C'est ce qui donnait 8 px de trop à l'appel.
- **Le style est transplanté**, pas retraduit en classes Tailwind : c'est en retraduisant qu'on perd des pixels.
  - Il est découpé en un fichier par section, `src/styles/site/`, dans l'ordre de la maquette.
  - Il est chargé par le `head` des pages publiques. **TanStack ne le retire pas quand on navigue vers l'application**, et c'est mesuré : après l'appel du site, `/inscription` prenait la police et le fond du site.
  - La feuille est donc **cloisonnée** :
    - chaque règle vise l'intérieur de `.site` ;
    - la page entière n'est touchée que quand le site est affiché (`:root:has(.site)`, `body:has(.site)`) ;
    - chaque animation porte le préfixe `site-` (douze noms de Plume étaient communs avec l'application).
    - `src/marketing/__tests__/feuille-du-site.test.ts` refuse une règle ou une animation qui sortirait de ce cloisonnement.
  - Deux règles d'ergonomie du projet s'y appliquent : aucun survol hors de `(hover: hover)`, aucune hauteur en `vh`. Le menu du téléphone passe en `svh`, sans effet visible.
  - Il ne se reformate pas (`.prettierignore`).
- **Les moteurs vivent dans `src/ui/site/`** : la peinture des paysages, les visites guidées, les pendules, le balayage.
  - Ils sont dans `src/ui/` parce que leurs palettes sont des couleurs, et que la muselière les refuse ailleurs.
  - Ils écrivent sur les éléments, hors de React, comme la lentille liquide de l'application.
  - Chacun rend de quoi se défaire : on peut quitter la page et y revenir sans rechargement.
- **Les sections vivent dans `src/marketing/site/`**, une par fichier. C'est là que les chiffres se branchent.
- **Les polices sont hébergées chez nous** : Newsreader avec son axe de taille optique, Hanken Grotesk et IBM Plex Mono. Aucun appel à Google Fonts.

## Ce qui diffère exprès de la maquette

- **Aucun chiffre tapé à la main.** La maquette en avait, et c'était dit. Chaque chiffre vient de sa source :
  - les prix viennent de `config/tarifs.ts` ;
  - les valeurs de loi viennent du registre (`parametres.ts`) ;
  - le calculateur tourne sur le moteur du produit ;
  - les métiers viennent de `secteurs.ts` et `scenes-metiers.ts` ;
  - le menu « Logiciel » et les tuiles viennent de `fonctionnalites.ts` ;
  - la durée d'essai vient de `DUREE_ESSAI_JOURS`.
- **Le blog montre les quatre derniers articles parus.**
  - Chaque article porte son « En bref » (`enBref`).
  - Chaque article porte aussi son étiquette : un champ qui nomme une valeur du registre, jamais un nombre.
- **Plume est le composant du produit.**
  - En mouvement réduit, le produit le pose autrement que la copie de la maquette : en fête, il lève les bras.
  - Le comparateur exclut donc le trait des `svg.plume`, mais exige leur place et leur taille au pixel près.
  - Son enveloppe dans l'appel s'appelle `plume-fete-cadre`. Le composant porte déjà la classe `plume-fete`, et la mise en page de l'enveloppe se serait appliquée au dessin.
- **Le champ d'inscription mène à l'inscription.**
  - L'adresse est portée par l'état de l'historique (`adresseDInscription`), jamais par l'URL.
  - `/inscription` s'ouvre au mot de passe, seulement après l'hydratation.
  - Le bloc « C'est noté » de la maquette a disparu.
- **L'enveloppe de la sécurité se glisse avec dnd-kit**, déjà dans le projet. Les autres animations GSAP deviennent natives, aux mêmes durées et aux mêmes courbes. Aucune dépendance ajoutée.
- **Le téléphone de l'en-tête reste dessiné.** Une capture ne se touche pas. Ses textes et ses chiffres se lisent sur les constantes du produit (`HEURES_D_ENVOI`, `DELAI_POUR_RETENIR_MS`, les données de démonstration de la salle).

## Ce qui sort de l'accueil actuel

- Situations, « Comment ça marche » et la bande des logiciels (remplacée par celle des preuves) sortent.
- La FAQ part sur `/tarifs`.
- `/tarifs` et `/securite` restent (l'app, les e-mails et Google y mènent) et reprennent les nouvelles sections.
- Le blog revient sur l'accueil.

## Livrer sans casser le site en ligne

- La page se construit sur `/nouveau-site` : `noindex`, liée nulle part, absente du plan du site.
- Elle est livrée sur `main` lot par lot et vérifiée sur le vrai déploiement.
- Le jour où toutes les sections passent, `/` la sert en une ligne, et l'adresse disparaît.

## La preuve, à chaque lot

```bash
node --experimental-strip-types scripts/comparer-maquette.ts --sections appel --sortie <dossier>
```

- **Le comparateur** confronte la maquette et la page, aux largeurs du projet (375, 768, 1024, 1280) et à 1440, en mouvement réduit, animations arrêtées. Le seuil est de 0,5 % des pixels, à taille égale.
  - Chaque section est isolée en haut de page des deux côtés. Sinon elle tombe à une fraction de pixel différente, et tous ses contours se décalent d'un pixel : un écart de mesure.
  - `--sortie` écrit les deux captures et l'image des écarts.
- **La démo jouée** : doigt fantôme, reprise en main au premier geste, balayage.
- **Les tests du projet** : lexique, aucun verdict, mot interdit, chaque fonctionnalité menant à sa section.
- **Les mesures de fluidité de la V26**, refaites sur la vraie page : pas moins bonnes que la maquette.

## Les lots

| Lot | Contenu | État |
|---|---|---|
| 0 | Socle : référence, polices, peinture, gestes communs, champ d'inscription, comparateur, adresse cachée ; l'appel en premier essai | livré |
| 1 | Barre (ton lu au défilement, capsule, menu « Logiciel » illustré, feuille au téléphone) et pied | |
| 2 | En-tête : le téléphone qu'on essaie | |
| 3 | Bande des preuves et calculateur (« La loi vous doit déjà de l'argent ») | |
| 4 | Plume : quatre scènes, barres en récit, balayage | |
| 5 | Tout ce qui va avec | |
| 6 | Métiers | |
| 7 | Sécurité : enveloppe, relevé, lettre | |
| 8 | Tarifs, puis la page `/tarifs` (comparatif, FAQ) | |
| 9 | Blog : les champs des articles, puis la section | |
| 10 | Appel définitif, bascule de `/`, `/securite`, plan du site, `llms.txt` | |

## Lot 0, mesuré

L'appel contre la maquette, 0,5 % au plus :

| Largeur | Écart |
|---|---|
| 375 px | 0,00 % |
| 768 px | 0,01 % |
| 1024 px | 0,10 % |
| 1280 px | 0,00 % |
| 1440 px | 0,00 % |

La taille est identique à toutes les largeurs, et Plume est à sa place.
