# Le dossier se gère comme il se démarre

_22/10/2026. Retour du fondateur après une démonstration à un prospect._

> « Quand je lui ai montré l'application, j'ai vu que l'on se sentait vite perdu avec tous les
> onglets du dossier, alors que côté flow du dossier avec Plume dans le chat c'est hyper fluide !
> […] On se sent perdu quand on gère nous-même alors que j'aimerais justement qu'on ait la même
> impression qu'avec le flow guidé avec Plume dans le chat. »

## Ce qui fait la différence, mesuré

**Le démarrage avec Plume** (`/app/demarrer/$id`, `screens/demarrage.tsx`) :

- Plume parle le premier, et dit ce qu'il a déjà trouvé (« J'ai trouvé 3 factures échues »).
- UNE question à la fois. Ses réponses sont de gros boutons en bas, sous le pouce ; on ne tape
  presque jamais.
- La réponse revient dans le fil, en bulle, avec un crayon pour la changer.
- Une barre d'étapes dit où l'on en est.
- Le travail se voit (les étapes se cochent), puis une fin dit ce qui va se passer et quand.
- Rien ne s'écrit avant le dernier geste.

**La page du dossier** (`/app/dossier/$id`, `screens/creance.tsx`), relevée à 375 px dans la salle :

- Dix-sept cibles. Six rangées nommées dans la taxonomie du logiciel : « Courriers et e-mails »,
  « Pénalités et frais », « Documents », « Vos réponses », « Les suites possibles ». Il faut savoir
  ce qu'il y a dedans AVANT de les ouvrir.
- Chaque rangée ouvre une page qui mêle ce qu'on lit et ce qu'on remplit. « Relancer » mène au
  milieu de « Courriers et e-mails » : une section E-mails, une section Lettres, six modèles, leurs
  formulaires. « Vos réponses » empile un questionnaire et un tableau juridique. « Les suites
  possibles » ouvre une feuille, qui ouvre une feuille de déclaration, qui ouvre le choix des
  professionnels.
- Deux cerveaux se font concurrence : la carte de Plume (un champ libre et quatre pastilles) et
  les rangées.

Ce n'est pas un problème de nombre de cibles : c'est que **sur la page, c'est le gérant qui
conduit** ; dans le fil, c'est Plume.

## Le principe

**Gérer soi-même, c'est encore être guidé.** Tout geste sur un dossier est une conversation avec
Plume, faite des pièces du démarrage : une question à la fois, les réponses sous le pouce, la bulle
et son crayon, le résumé avant d'écrire, le travail qui se voit, une fin qui dit la suite. Rien ne
s'écrit avant la dernière réponse.

La page du dossier redevient une page qu'on **lit** : combien, ce que fait Plume, la suite, ce qui
s'est passé, le détail. Les rangées ne sont plus des endroits où l'on fait quelque chose.

Références (Mobbin) : Lemonade (« File a claim » : la page de la police porte « File a claim » et
« More actions », la déclaration est une conversation avec Maya, les réponses en liste en bas,
la réponse en bulle avec un crayon) ; Whatnot (« Get help with this purchase » : la carte d'état de
la commande porte les gestes en verbes, chacun ouvre « What's the issue? ») ; DoorDash et Careem
(« What do you need help with? », une ligne par cas, dans les mots du client).

## La page

1. **Le montant et la date limite pour agir** : inchangés. C'est la réponse au téléphone.
2. **Ce qui bloque** : inchangé (ce que dit la loi passe avant ce qu'on peut faire).
3. **Plume** : une seule carte. Sa phrase à la première personne, ce qui arrive si rien ne bouge,
   ce qui est récupéré ; puis les **réponses du moment** : un bouton plein, la proposition du
   moment (« Relire le courrier », « Le relancer », « Voir le calcul »… lue dans `gesteDuDossier`,
   jamais une voie de droit), et deux boutons de verre : « Il m'a répondu » et « Autre chose ». Le
   champ libre et les pastilles quittent la carte : « Le dire à Plume avec mes mots » est la
   dernière réponse d'« Autre chose ».
4. **Où en est le dossier** : la barre des quatre étapes, sans bouton (le bouton est passé chez
   Plume).
5. **La suite** et **Ce qui s'est passé** : inchangés.
6. **Le détail** : les rangées de lecture. « Vos réponses » en sort : ses questions se posent dans
   la conversation.

## La conversation du dossier

Une page pleine qu'on ferme d'une croix (`PleinEcran`), le client en sous-titre. Sa première
question : **« Que voulez-vous faire ? »**, et ses réponses en liste, dans les mots du gérant :

| Réponse                       | Ce qui suit                                                                                                                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Le relancer                   | Ce que je prépare (un e-mail ou une lettre), ce qu'il y a dedans, la lettre telle qu'elle partira, la préparer ; puis la relire, la valider, dire qu'elle est partie.                                                                      |
| Il m'a répondu                | Il va payer (un jour, un montant) · en plusieurs fois (combien de fois, à partir de quand, le calendrier) · il conteste (ce qu'il dit, par écrit ou non) · il dit avoir payé (le règlement se note sur sa fiche) · autre chose (une note). |
| Répondre à vos questions      | Les faits que vous seul pouvez dire, un par un, Oui / Non / Je ne sais pas ; puis les conditions à confirmer.                                                                                                                              |
| Ajouter un document           | Le parcours de dépôt au coffre, le même partout.                                                                                                                                                                                           |
| Me le rappeler                | Un jour (proposés, ou au choix), et pourquoi.                                                                                                                                                                                              |
| Le confier à un professionnel | Je l'ai déjà remis (quand, à qui) ou je cherche quelqu'un (le parcours du choix).                                                                                                                                                          |
| Classer le dossier            | Pourquoi (les quatre raisons), une note, ce que ça change, puis classer.                                                                                                                                                                   |
| Le dire à Plume avec mes mots | La conversation libre du dossier.                                                                                                                                                                                                          |

Les boutons de la carte de Plume ouvrent la même conversation **déjà répondue** à sa première
question : la bulle « Il m'a répondu » est là, avec son crayon.

Chaque fin propose « Revenir au dossier », « Annuler » quand le geste se défait (une note
s'efface, un dossier classé se rouvre), et « Autre chose » pour enchaîner.

## Les lignes rouges, dans la conversation

- **Rien ne part vers un client depuis la conversation** sans le chemin d'aujourd'hui : une lettre
  se prépare, se valide par un administrateur, et le gérant dit qu'elle est partie. Un e-mail
  s'ouvre dans SA messagerie.
- **Aucune réponse ne nomme une voie de droit**, et aucune n'est mise en avant parmi les suites :
  « Le confier à un professionnel » est un geste de bureau, au même rang que les autres.
  `page-dossier.test.ts` continue de lire `gesteDuDossier`.
- **Une contestation ne bloque rien** : elle se note, et la fin le dit.

## Lots

1. La coquille de conversation (`ui/parcours-guide.tsx`), la carte de Plume et ses réponses,
   « Que voulez-vous faire ? », « Il m'a répondu », « Me le rappeler », « Classer », « Ajouter un
   document », « Le dire à Plume ».
2. « Le relancer » et « Relire le courrier ».
3. « Répondre à vos questions », et « Vos réponses » quitte les rangées.
4. « Le confier à un professionnel », et le détail en rangées de lecture.

Chaque lot part en production vérifié dans la salle à 375 et 1280 px.

## Ce qui reste au constructeur

Les formulations exactes de Plume, dans le ton du démarrage ; l'ordre des réponses ; la forme des
cartes dans le fil (on reprend celles qui existent : le courrier, le calendrier, les factures).
