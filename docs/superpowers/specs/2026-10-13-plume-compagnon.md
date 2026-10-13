# Plume, un compagnon présent partout (13/10/2026)

Le fondateur, après un retour du terrain : « Plume doit être un vrai agent qui assiste
l'utilisateur partout dans l'App et présent partout et communiquer et aider l'utilisateur au lieu
de simplement être dans un chat ! Il doit être un réel compagnon. »

**Le geste supprimé** : ouvrir la conversation de Plume pour savoir ce qu'il a fait, ce qui lui
manque, ou ce qu'il propose ; chercher sur chaque écran ce qui bloque son travail (une adresse, un
numéro) ; lui réexpliquer de quel client on parle. **Ce que ça change pour le dirigeant** : Plume
lui parle là où il est, au moment où c'est utile, et s'ouvre en sachant de quoi on parle.

## Ce qui a été relevé (Mobbin, 13/10/2026)

- **Alan** : Mo est posé à droite de la barre d'onglets et dit bonjour depuis là, dans une bulle
  blanche dont la pointe le désigne.
- **Rocket Money**, **Credit Karma**, **Origin** : la recommandation se pose sur l'écran qu'elle
  concerne, avec un geste et un « Plus tard » ; jamais un écran à part.
- **Fabric**, **monday**, **ClickUp** : l'assistant ouvert depuis un élément le dit (« Ask about :
  cet élément », « 1 item »), propose des questions faites pour lui, et un ✕ l'oublie.
- **Linear**, **Notion Mail**, **Google Drive** : un geste se confirme en bas de l'écran, par un mot
  et un « Annuler ».

## Ce qui est livré

### 1. La bulle : Plume parle depuis la barre

Une bulle sort de Plume, au-dessus de la barre du bas, sa pointe sous lui (`ui/bulle-plume.tsx`).
Opaque, pas en verre : une phrase se lit. Un seul bouton, secondaire. Trois voix, dans cet ordre
(`app/parole-de-plume.tsx`) :

1. **Le mot après un geste** (`usePlumeDit`) : relancer, rappel, promesse, paiement en plusieurs
   fois, classer, rouvrir, reprendre un client. À la première personne, avec « Annuler » ou « La
   relire ». Sans bulle à l'écran (une conversation), il redevient un toast.
2. **Ce qu'il vient de finir** : un travail du pilote, ou une notification arrivée, annoncés sur
   l'écran où l'on est. Plusieurs travaux finis ensemble se disent en une bulle. Ni sur Aujourd'hui
   (le bloc du pilote les coche déjà), ni sur la boîte de réception, ni ce qui était fini avant
   l'ouverture de l'application.
3. **Ce qu'il a à dire de l'écran** : une remarque, une seule par visite.

### 2. Ce qu'il dit, écran par écran

Décidé par `verticales/recouvrement/compagnon/presence.ts` (pur, testé). L'écran lui donne ce qu'il
a déjà lu ; aucune requête de plus.

| Écran | Ce que Plume dit |
| --- | --- |
| Partout, la première fois | Sa présentation : ce qu'il fait ici. |
| Aujourd'hui | Les dossiers qu'il a préparés (« avant votre feu vert »), puis un bonjour par jour. |
| Dossiers | Les lettres qui attendent la relecture, et y mène. |
| Clients | L'e-mail ou le SIREN qui lui manquent pour un client en retard. |
| Fiche d'un client | Le reprendre s'il est retiré ; l'e-mail qui manque (la rangée s'ouvre) ; un retard qui sort de son habitude (il prépare la relance, à relire) ; sa santé à lire. |
| Coffre, Santé, Défense | Sa présentation. |
| Page d'un dossier | Rien : son bloc en tête dit déjà ce qu'il fait. |

**Les quatre règles de ce qu'il dit** :

1. Il ne redit pas l'écran : il dit ce qui lui manque, un lien entre deux faits, ce qu'il peut faire.
2. Ce qu'il propose, il sait le faire, et rien de plus que l'écran : il prépare, ouvre, reprend.
   Rien ne part sans le gérant.
3. Il se tait quand on le lui dit : le ✕ fait taire une remarque pour de bon (table
   `silencesPlume`, par compte, purgée avec l'établissement) ; une présentation ne se dit qu'une
   fois. La clé porte la situation : un fait nouveau peut se redire.
4. Ligne rouge n° 3 : jamais « une condition est remplie », jamais une voie de droit.

**Contre le bavardage** : une remarque par visite, jamais deux fois la même dans la session, rangée
dès qu'on fait défiler, partie au bout de vingt secondes.

### 3. Le regard : Plume s'ouvre en sachant d'où l'on vient

Toucher Plume ailleurs que sur un dossier ouvre `/app/pilote?depuis=<écran>` (et `&client=<id>` sur
la fiche ou la santé d'un client). Une pastille au-dessus du compositeur le dit (« Sur la fiche de
Durand SARL »), son ✕ ramène à tout l'établissement ; les questions prêtes sont celles de l'écran,
offertes jusqu'à la première question de la visite ; le retour rond ramène d'où l'on vient. Le
modèle lit une ligne de plus, « D'où le dirigeant te parle », avec les identifiants du client et de
son dossier ouvert, relus contre l'établissement.

### 4. Chaque dossier se demande à Plume

L'appui long (ou le clic droit) sur une carte de dossier propose « Demander à Plume »
(`CarteGlissable.menuEnPlus`) : au menu seulement, un troisième disque sous le doigt aurait été de
trop.

## Ce qui est écarté, exprès

- **Une carte de Plume dans chaque écran.** Rocket Money en pose une ; ici, elle redirait ce que
  l'écran montre et ajouterait des cibles (« less is more »). La bulle parle d'UN endroit, toujours
  le même.
- **Une feuille de discussion par-dessus l'écran.** Jugée « horrible » le 08/10 ; la conversation
  reste en page pleine, elle s'ouvre seulement en sachant d'où l'on vient.
- **Des remarques écrites par le modèle.** Elles sont composées par du code, depuis des données
  lues : instantanées, gratuites, et jamais un chiffre inventé.

## Où le code vit

- `verticales/recouvrement/compagnon/presence.ts` : les remarques, le regard, les phrases des
  travaux et des notifications (testé : `__tests__/presence.test.ts`).
- `convex/recouvrement/presence.ts` : `silences`, `taire`, `travauxTermines`,
  `derniereNotification` ; table `silencesPlume` (`recouvrement/tables.ts`).
- `app/parole-de-plume.tsx` : le magasin hors de React, `useRemarquesDePlume`, `usePlumeDit`.
- `app/compagnon.tsx` : la bulle branchée, le défilement qui la range, où mène chaque cible, le
  regard à l'ouverture.
- `ui/bulle-plume.tsx`, `ui/fil-plume.tsx` (`PastilleDuRegard`) ; les routes qui donnent leurs
  remarques (`index`, `dossiers`, `clients`, `clients.$id`, `coffre`, `risque.*`, `defense`).

## Le soir même : Plume grand dans la barre, et la journée à la Duolingo

Le fondateur, sur cette première version : « il manque la figure de Plume animé qui fait plusieurs
têtes, gestes selon ce qu'il fait, comme réfléchir avec une bulle et trois petits points », « les
bulles se ferment très vite et ne sont pas assez utiles […] va voir sur Duolingo », puis « au lieu
d'avoir un gros Plume en plus du bouton […] mettre Plume en grand dans le bouton, et enlever le nom
en dessous ».

Relevé sur Duolingo (Mobbin) : Duo grand à côté de sa bulle, une tête par moment, rien ne part
avant « Continuer » ; trois défis du jour avec leur barre ; la série de jours et sa semaine en
coches ; une fête à chaque victoire.

**Cinq têtes de plus** (`ui/plume.tsx`) : il réfléchit (main à la joue, bulle de pensée et trois
points), il écrit (une feuille dont les lignes se tracent), il fait la fête (il bondit, bras levés,
confettis d'encre, aucune teinte de seuil), il salue, il dort (la nuit, des « z »). Elles suivent
l'état réel : il écrit quand le pilote prépare une relance, dort de 22 h à 7 h quand rien ne tourne,
réfléchit dans la conversation pendant qu'il répond (`PointsDeSuspension`).

**Plume dans la barre, grand, sans son nom** (`BoutonCompagnon`) : c'est là qu'il change de tête.
⚠️ Le bouton du kit ramène tout `svg` enfant à 16 px : Plume est dans une enveloppe.

**Sa bulle reste** (`ui/scene-plume.tsx`, magasin `app/parole-de-plume.tsx`) :
- il réfléchit avant chaque parole (trois points, sa tête qui réfléchit), puis la phrase, puis les
  gestes ;
- une pile, la plus pressante d'abord (geste, fête, nouvelle, défis, remarque d'écran), « 2 sur 4 »,
  « Suivant », puis « Lui parler » ;
- aucune minuterie : le ✕ et le défilement le renvoient dans la barre ; ce qu'il n'a pas dit se compte
  sur sa pastille, et toucher Plume le lui fait dire ;
- en tête, la journée ; en pied, ce qu'il fait en ce moment ou ensuite.

**La journée** (`compagnon/journee.ts`, `convex/recouvrement/journee.ts`, table `journeesPlume`) :
trois défis (démarrer les dossiers préparés, relire les lettres, répondre aux questions), le plus
haut relevé du jour gardé, la journée tenue quand plus rien n'attend, la série des jours tenus (le
week-end ne la casse pas, une série qui retombe ne se reproche pas), l'anneau de la journée autour
de Plume, et deux fêtes : la journée bouclée (sa semaine en coches) et l'argent qui rentre.

**Écarté exprès** : des points, des gemmes ou des récompenses. Le jeu est le travail lui-même ; la
barre dit ce qui est fait, rien de plus. Et Duo culpabilise quand la série casse : Plume, non.
