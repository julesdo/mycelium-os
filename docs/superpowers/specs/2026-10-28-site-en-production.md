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
- **L'enveloppe de la sécurité se glisse aux événements de pointeur, sans GSAP ni dnd-kit** (décidé au lot 7). dnd-kit range des listes dans React ; il ne sait ni borner un objet libre au tableau, ni le faire résister au bord, ni l'incliner sous le doigt, et le moteur vit hors de React. Les mouvements de GSAP deviennent natifs, aux mêmes durées et aux mêmes courbes (`COURBES` dans `ui/site/securite.ts`). Aucune dépendance ajoutée.
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
| 1 | Barre (ton lu au défilement, capsule, menu « Logiciel » illustré, feuille au téléphone) et pied | livré |
| 2 | En-tête : le téléphone qu'on essaie | livré |
| 3 | Bande des preuves et calculateur (« La loi vous doit déjà de l’argent ») | livré |
| 4 | Plume : quatre scènes, barres en récit, balayage | livré |
| 5 | Tout ce qui va avec | livré |
| 6 | Métiers | livré |
| 7 | Sécurité : enveloppe, relevé, lettre | livré |
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

## Lot 1, mesuré

- **La barre se compare état par état** : sombre ou claire, au repos ou en verre. Elle prend le ton de la section dessous, et une barre isolée n'a rien dessous.
  - Les quatre états, aux cinq largeurs : de 0,00 à 0,18 %.
  - Le menu « Logiciel » ouvert, à 1440 px : 0,08 %, Plume compris. Il lit le registre (`fonctionnalites.ts`, champ `menu`, ordre `MENU_DU_SITE`).
  - La feuille du téléphone ouverte, à 375 px : 0,00 %.
- **Le pied est plus haut, exprès** (+69 px au bureau, +152 px à 375 px).
  - La maquette n'avait aucun lien légal. Le site garde visibles les cinq pages légales, sous la phrase qui borne le produit, dans son style (`styles/site/ajouts.css`).
  - Il mène aussi aux pages qu'aucune autre ne lie (la procédure sans juge, les experts-comptables, le fondateur), sans quoi elles deviendraient orphelines.
  - Le reste est le dessin de la maquette, vérifié à l'œil côte à côte.
- **Quitter la page la défait** : ni la couleur du haut (`--haut`), ni le menu ouvert ne restent sur le document.
- **Un défaut de la maquette est corrigé.** Un paysage qu'on demandait à peindre pendant qu'il était caché sortait de la file sans être peint, et ne se peignait plus jamais. Il attend maintenant d'être vu.

## Lot 2, mesuré

- **L'en-tête contre la maquette : de 0,06 à 0,12 %** aux cinq largeurs, Plume compris. L'écart restant est la date corrigée.
  - Le téléphone suit sa propre horloge. Même en mouvement réduit, les trois tâches de Plume arrivent (dépôt, virement, dossier). Le comparateur attend donc qu'elles soient passées des deux côtés.
  - Une mesure à 0,48 % est retombée à 0,12 % : une minute avait changé entre les deux captures, et le téléphone écrit l'heure de sa dernière veille.
- **Ses chiffres sont ceux du moteur** (`vitrine-demo.ts`), tenus au centime par `vitrine-demo.test.ts` contre `REVELATION_DEMO` de la salle :
  - 66 704,82 € dus sur 4 factures ;
  - les tranches 0,00 / 293,30 / 66 411,52 € ;
  - 18 443,92 € jamais réclamés.

  La maquette s'y trompait deux fois :
  - elle disait « au 28 oct. 2026 », alors que ces chiffres sont arrêtés au 9 sept. 2026 ;
  - elle détaillait « 17 803,92 € + 16 factures × 40 € », alors que le moteur donne 18 283,92 € + 4 × 40 €.

  Les 40 € se lisent au registre, les heures d'envoi à `HEURES_D_ENVOI`. Les montants par client restent une fiction qui s'additionne au total, et leurs dates suivent le 9 septembre.
- **La visite joue la même chose des deux côtés** : au bout de 34 s, même montant (64 244,32 €) et mêmes faits.
  - Un vrai toucher rend la main, la pastille relance la visite.
  - Plume répond au toucher d'un client.
  - L'interrupteur des relances agit.
- **Une phrase où s'insère une valeur s'écrit d'une seule chaîne** (`` {`${n} factures en retard`} ``). React la couperait sinon en deux nœuds de texte, et le dessin des lettres change à la jointure.
- Les couleurs des avatars de démonstration vivent dans `ui/site/avatars.ts`, la muselière les refusant dans `marketing/`.

## Lot 3, mesuré

- **La bande des preuves : 0,00 % avec le texte de la maquette.** Ses logos sont ceux du site (`public/connecteurs/`), les mêmes fichiers que la maquette, octet pour octet.
  - Puis 1,13 % à 1440 px et une ligne de plus à 375 px (+28 px), exprès : la maquette citait « BODACC », et le site dit « Journal officiel des entreprises », le mot de tous les jours (`lexique.test.ts`).
- **La loi : de 0,23 à 0,27 % au bureau, 0,51 % à 375 px.** Les seuls écarts sont voulus :
  - la cassure de la courbe et les deux lignes par semestre suivent le moteur, 95 j à 392,13 € puis 119 j à 501,30 €, au lieu des 94 j à 404,12 € puis 120 j à 489,31 € de la maquette ;
  - la phrase des frais dit « Des frais forfaitaires » au lieu de « Une indemnité forfaitaire » (`lexique.test.ts`).
- **Tout ce que la section chiffre sort du moteur et du registre** (`loi-demo.ts`, calculé à l'import) :
  - les jours, les pénalités par semestre et leur total ;
  - les frais ;
  - la date limite pour agir et celle du transport ;
  - la durée qui reste (« 4 ans et 5 mois ») et les « dix points » ;
  - les articles cités (L441-10, D441-5, L110-4, lus dans les sources du registre).

  Le jour est figé au 28 octobre 2026 : la frise va de mars à octobre.
- **La mention de retard de la facture dessinée** vient de `pays/france/mention-de-facture.ts`. C'est le vocabulaire du document, dans la zone de droit, composé de `majorationEnChiffres()` et de l'indemnité du registre.
- **Deux pièges de la feuille, corrigés pour toute la page** :
  - **La remise à zéro de Tailwind** effaçait les valeurs par défaut du navigateur, dont la maquette dépend (1em autour d'un paragraphe : 28 px de moins sur les preuves). `styles/site/defauts.css` les rend sous `.site`, dans une couche placée après celles de Tailwind et sous la moindre règle de la maquette.
  - **Un nom de classe de la maquette peut être un utilitaire Tailwind** : la carte `.table` de la conclusion devenait `display: table` et disparaissait. Le nom est neutralisé dans `defauts.css`, et `feuille-du-site.test.ts` refuse un nom nouveau qui ne le serait pas.
- **Le pied : +93 px au bureau, tout entiers dans les liens ajoutés** (deux ressources, la rangée légale). Les +69 px d'avant cachaient la marge du paragraphe, effacée sur le site.

## Lot 4, mesuré

- **Plume contre la maquette : de 0,00 à 0,05 %**, aux cinq largeurs et scène par scène. En mouvement réduit, la section ne montre que sa première scène ; le comparateur touche donc chaque capacité des deux côtés et compare les quatre états finaux (`SCENES` dans `comparer-maquette.ts`).
- **La visite joue la même chose des deux côtés** : les quatre scènes aux mêmes instants (10, 22, 35, 46 s), le doigt fantôme, la reprise en main au premier vrai geste, la pastille qui relance.
- **Le balayage du téléphone** passe à la scène suivante et à la précédente comme dans la maquette (`ui/site/balayage.ts`, qui servira aussi au blog).
- **Ce que les scènes promettent se lit sur la règle qui le tient** (`plume-demo.ts`, tenu par `plume-demo.test.ts`) :
  - « dans 59:59 » et « une heure » : `DELAI_POUR_RETENIR_MS` ;
  - « jusqu’au 23 » : le jour promis plus `JOURS_DE_GRACE` ;
  - le paiement en trois fois de Vidal : `versements`, le calendrier de l'accord écrit (1 440,16 €, 1 440,16 €, 1 440,18 €, le reliquat sur le dernier) ;
  - l'heure du rappel, dans `HEURES_D_ENVOI`.
- Les clients sont ceux des autres démonstrations : Durand et sa facture de la loi (12 400,00 €, 214 jours), Rousseau et Vidal du téléphone. Le dépôt du matin (198 factures, 40 règlements) reste une fiction, la même que sur le téléphone.
- Plume est le composant du produit : au travail dans le coin de la plaque, content dans la conversation (la maquette dessinait un Plume sans bras ; le composant n'a pas cette tête).

## Lot 5, mesuré

- **Les six tuiles : 0,00 à 0,01 % aux cinq largeurs**, le décor de la tuile santé mis de côté (`--masquer '[data-tuile="sante"] .decor'`). Avec lui : de 0,46 à 1,12 %, tout entiers dans ce décor, exprès.
- **La santé d'un client est celle que calcule le produit** (`analyserLeRisque`, sur une entreprise de démonstration, dans `tout-demo.ts`). La maquette inventait ses poids (−14, −6, +2, soit 32). Le moteur dit :
  - −15, il paie à 75 jours de retard ;
  - −8, aucun compte déposé ;
  - +8, douze ans d'existence ;
  - soit 35 sur 100, prudence.

  L'aiguille part de 50 (`INDICE_DE_DEPART`) et passe par 35, 27, puis 35, fait après fait. `tout-demo.test.ts` tient le chemin.
- **Le nom, la phrase et le lien de chaque tuile se lisent au registre** : champ `carte` de `fonctionnalites.ts`, ordre `TUILES_DU_SITE`. La phrase de la santé cite `INDICE_DE_DEPART`. `fonctionnalites.test.ts` vérifie que le menu et les tuiles mènent à une section du nouveau site ; `#securite` y est admis jusqu'au lot 7.
- **Les coupons du paiement en trois fois suivent `versements`** (2 000 € le 1er de chaque mois, le deuxième « dans 4 jours » au 28 octobre). La page de paiement règle la facture de la loi.
- **Un écart de mesure, corrigé dans le comparateur.** Au doigt, une tuile joue sa scène une fois, à son entrée à l'écran, et la garde. Tant que le site n'a pas toutes ses sections, sa page est plus courte, et le passage du début ne montrait pas les mêmes tuiles des deux côtés. Le comparateur les fait maintenant toutes passer à l'écran avant de capturer.
- Au survol, chaque scène joue comme dans la maquette : le coffre scelle le devis à l'heure qu'il est, l'échéancier passe à 4 000 € reçus, les factures se comptent jusqu'à 198.

## Lot 6, mesuré

- **Les métiers : de 0,00 à 0,08 %**, aux cinq largeurs et panneau par panneau (le comparateur ouvre chacun des quatre, `SCENES`). Les photos sont celles du site (`public/photos/`), les mêmes fichiers que la maquette, octet pour octet.
- **La règle de chaque métier se lit au registre** (`metiers-demo.ts`, tenu par `metiers-demo.test.ts`) :
  - le transport : 1 an pour agir contre 5 ans (`regimePrescription`) ;
  - le bâtiment : 40 € de frais (`indemniteForfaitaire`) ;
  - les services : douze fois ces frais, 480 € ;
  - le secteur public : 50 jours pour un hôpital (`delaisPaiementPublics.SANTE`).
- **Le nom, le public et la page de chaque métier viennent de `secteurs.ts`**, et le lien mène à `/secteurs/<métier>` au lieu de l'ancre de la maquette.
- **La carte d'exemple est celle de la scène du métier** (`scenes-metiers.ts`), la même que sur sa capture d'écran. Elle suit le produit sur deux points où la maquette s'en écartait :
  - les initiales prennent les deux premiers mots, comme l'avatar (« SL », « CD », au lieu de « ST », « CV ») ;
  - la date se dit comme sur une carte du produit (`dateRelative`) : « aujourd’hui » pour les services, au lieu de « 10:00 ».
- **Deux écarts de mesure, corrigés dans le comparateur** : une photo en chargement différé pouvait n'être pas arrivée d'un côté (34 % à 1280 px), et le bouton d'un panneau ouvert se touche sous son contenu.
- Au survol, au clavier et au toucher, les panneaux s'ouvrent comme dans la maquette.

## Lot 7, mesuré

- **La sécurité contre la maquette : de 0,00 à 0,01 %** aux cinq largeurs.
  - Un premier essai donnait 0,09 à 0,28 %, au bord de la facture et de l'enveloppe. GSAP pose `translate3d` : la facture a son propre calque, et ses bords se lissent autrement. Le moteur fait de même, ce qui la fait aussi glisser sans repeindre la scène.
- **Sans GSAP, la scène joue comme la maquette**, relevé à 1, 2,5, 4,5 et 7 s :
  - la visite saisit la facture, la porte au-dessus de l'enveloppe, la scelle, puis l'étiquette tombe ;
  - un vrai glisser à la souris s'arrête au bord du tableau, allume l'enveloppe au-dessus et scelle au lâcher, à l'heure qu'il est ;
  - au doigt aussi, sans faire défiler la page ;
  - la touche Entrée scelle au clavier.
- **Ce que la section dit se lit sur le produit** :
  - l'algorithme du coffre (`ALGORITHME`, AES-256-GCM) ;
  - les heures d'envoi (`HEURES_D_ENVOI`, « de 9 h à 18 h ») ;
  - le délai pour retenir (« une heure », « dans 59:59 ») ;
  - l'heure du rappel (10:00, dans ces heures).
- **Le relevé reçoit ce que doivent les clients des autres démonstrations** (`securite-demo.ts`, tenu par `securite-demo.test.ts`) : Durand sa facture de la loi, Vidal et Bâti-Sud les montants du téléphone. Ce qui passe par Letikette reste à 0,00 € : la ligne rouge n° 2.
- Le lien « Toutes nos mesures de sécurité » mène à `/securite`. Le cachet de cire et le corps de l'enveloppe, en couleur, sont dessinés dans `ui/site/dessins-securite.tsx`.
- `#securite` sort de la liste d'attente de `fonctionnalites.test.ts` : le menu et les tuiles mènent tous à une section posée.
