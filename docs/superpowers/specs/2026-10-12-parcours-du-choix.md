# Le parcours du choix — avocats et commissaires de justice (12/10/2026)

## La demande

Le fondateur, sur la feuille « Qui fait l'acte » livrée le 08/10 :

> Le système est encore trop complexe à manipuler, surtout avec des scrolls dans une popup ! Soit un
> tiroir qui s'étire en plein écran, soit une page dédiée en mode stepper que l'on peut fermer. Une
> barre de recherche, éviter d'afficher avocats et commissaires sur la même page, un infinite
> scroll, voir ceux qu'on a sélectionnés, puis un écran de fin avec le résumé et la confirmation.
> Le même flow dans les dossiers et dans le carnet d'adresses. Garder les fiches de détail, quitte
> à les améliorer.

## Ce qui n'allait pas

- Une feuille centrée de 512 px, qui défilait dans son cadre : le carnet, puis trente avocats et
  douze études mêlés, puis « Quelqu'un d'autre », puis la fiche qui REMPLAÇAIT la liste.
- Au-delà de trente avocats : une seconde feuille où l'on choisissait un barreau parmi cent
  soixante, puis une spécialité. Une troisième pour les études, par numéro de département.
- Un toucher sur « + » écrivait aussitôt au carnet ET au dossier : aucun récapitulatif, aucune
  confirmation.
- L'écran « Défense » avait ses propres feuilles (près d'un client, par département, par barreau,
  saisie à la main) : un autre parcours que celui du dossier.

## Les références (Mobbin)

- Création d'un groupe : Splitwise (« People to add » en portraits, puis « Review » et « Add
  members »), Chime, PayPal (« Who do you want to split with? »), Telegram, Luma (« 2 Selected »
  flottant), Bluesky (portraits empilés au-dessus de « Next »), Lex, Sora.
- Recherche d'un praticien : Alan (« Find a health professional », une spécialité, la fiche,
  l'ajout à « mes praticiens »), Zocdoc.
- Parcours en étapes qu'on quitte d'une croix : Nutmeg (barre d'étapes, « Continue »), Glassdoor.
- Résumé avant confirmation : Splitwise « Review », CVS « Review details ».

## Le parcours

`ui/parcours-professionnels.tsx`, nourri par `app/use-annuaire.ts`.

1. **Une page pleine**, qu'on ferme d'une croix. C'est une `Popup` de Cladd tirée sur tout
   l'écran : elle s'empile au-dessus d'une autre feuille (déclaration d'une voie, remise au
   conseil, courrier) en gardant son piège à focus.
2. **Une profession par étape** : « Quel avocat ? », puis « Quel commissaire de justice ? », puis
   le résumé. La barre d'étapes et « Étape 2 sur 3 » restent en tête, avec la croix et le retour.
3. **La recherche et le lieu collent en haut.** Le lieu est une rangée de pastilles : « Près de
   Durand » (le dossier), un client par pastille (l'équipe), « Toute la France ».
4. **La liste défile sans fin** : l'équipe d'abord (dans un dossier), puis l'annuaire.
   - Avocats : le département du client par ordre alphabétique, ceux qui ont DÉCLARÉ une
     spécialité proche à part ; avec un texte, une recherche sur le nom, le cabinet, la ville, le
     code postal et le barreau (index `search_texte`), dans le département ou toute la France.
   - Études : celles du département du client, filtrées à la frappe ; dans toute la France, la
     recherche par nom du registre, vingt-cinq par page.
   - Au bas : « Vous ne le trouvez pas ? Le saisir à la main », dans la profession de l'étape.
5. **Les choisis se voient en bas**, en portraits, au-dessus du seul bouton plein (« Continuer »).
6. **Le résumé** range les choisis par profession, chacun avec sa croix et un « Modifier » par
   groupe ; personne dans un dossier, c'est « Moi-même ». « Confirmer » écrit tout d'un coup : les
   fiches venues d'un annuaire entrent au carnet avec leur source et leur date, puis le dossier
   nomme la liste entière (`onNommer`).
7. **La fiche** se pousse par-dessus le parcours sous 1024 px, son geste collé en bas ; au-delà,
   elle s'ouvre à droite de la liste.

Le MÊME composant sert partout :

| Endroit                         | Professions          | Choix      | Personne              |
| ------------------------------- | -------------------- | ---------- | --------------------- |
| Dossier, « Qui fait l'acte »    | avocat, commissaire  | plusieurs  | « Moi-même »          |
| Déclaration d'une voie          | avocat, commissaire  | plusieurs  | « Moi-même »          |
| Remise au conseil               | avocat, commissaire  | un seul    | « Sans nommer personne » |
| Courrier à l'avocat / l'étude   | la sienne            | un seul    | interdit              |
| Défense, « Ajouter à mon équipe » | avocat, commissaire | plusieurs | sans objet            |

## Ce qui a disparu

`choix-intervenant.tsx` (ses types vivent dans `fiches-professionnels.ts`), `recherche-avocat.tsx`,
`recherche-commissaire.tsx`, `useProfessionnelsProposes`, et côté serveur
`professionnelsPresDuClient`, `avocatsPres`, `barreauxDuRepertoire`, `chercherUnAvocat`,
`chercherUnCommissaireDeJustice` et quatre index de l'annuaire. Remplacés par `secteurDuClient`,
`avocatsDuSecteur` (paginée), `sourceDesAvocats` et `etudesParNom`.

## Les règles qui tiennent

- Rien n'est présélectionné ; « Moi-même » reste un choix de premier rang ; l'ordre est celui des
  noms, sauf quand le gérant tape : les résultats suivent alors SA saisie.
- Une fiche venue d'un répertoire porte sa source et sa date de relevé (`ajouterIntervenant` la
  refuse sans elles) ; l'écran cite la source avec sa date (`source-citee.test.ts`).
- L'annuaire des avocats est un référentiel sans établissement : la barrière de la recherche
  cloisonnée l'exempte NOMMÉMENT, et vérifie qu'il ne porte aucun `organizationId`.
- Les fiches déjà en base deviennent cherchables par le rattrapage `completerUnLot` (cron de
  trente minutes, qui se relance tant qu'il trouve un lot plein) ; les livraisons suivantes
  arrivent complètes.
