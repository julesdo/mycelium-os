# La page dossier — refonte de l'expérience

**Commandée le 30 septembre 2026 par le fondateur**, mot pour mot : « elle manque d'intuitivité ! Il
y a beaucoup trop de choses dans tous les sens ! […] On a encore l'impression que l'on a mis à plat
toutes les features dans cette page avec des sous-onglets ou des modales et ça je ne suis pas
d'accord ! »

Ce document porte la mesure du défaut, ce que les meilleures applications iOS de 2026 font à la
place, les quatre codes qu'on leur reprend, la structure cible, et six lots exécutables.

---

## 1. La mesure — ce que la page coûte aujourd'hui

Relevé dans la salle d'exposition, variante « principale », **sections repliées**, au navigateur
intégré :

|                                       | 375 px       | 1024 px      |
| ------------------------------------- | ------------ | ------------ |
| Hauteur de défilement                 | **6 479 px** | **4 130 px** |
| En écrans                             | **8,0**      | **5,4**      |
| Mots rendus                           | **845**      | —            |
| Lignes de texte                       | **129**      | —            |
| Phrases de plus de six mots           | **36**       | —            |
| Points de décision (titres + boutons) | **27**       | —            |

Huit écrans de défilement pour un dossier **fermé**. 845 mots : deux pages et demie de prose
dactylographiée, pour un écran qu'on ouvre le matin entre deux chantiers.

### Les cinq répétitions, nommées

1. **Le nom du client, trois fois** — titre de la page, bloc d'identité, sous-titre.
2. **L'étape en cours, deux fois** — la frise écrit « Prêt », la carte écrit « Maintenant / Prêt »
   200 px plus bas.
3. **La date limite pour agir, trois fois** — en-tête, « Si rien ne bouge », situation
   « paiement partiel ».
4. **Le montant, deux fois** — le chiffre en grand, puis la valeur de la section « Décompte ».
5. **« Ce que vous pouvez faire », deux listes à puces** — dont aucune n'est cliquable, par
   construction (ligne rouge n° 3).

---

## 2. Le diagnostic — trois défauts de structure

### D1. L'état du dossier est dit quatre fois, et n'est jamais le sujet de la page

Quatre blocs, ~90 mots, pour une seule chose : _on en est là, et voilà ce qui se passe si on ne
bouge pas._ Le titre de la page est le nom du client ; l'état, lui, est une ligne parmi d'autres.

Or le gérant n'ouvre pas un dossier pour savoir comment s'appelle son client. Il l'ouvre pour
savoir **où ça en est**.

### D2. Chaque conteneur est étiqueté d'une phrase, pas d'un nom

Neuf en-têtes repliés, chacun une proposition relative suivie d'une glose :

> « Ce qui s'est passé / Vos notes, vos échanges, et ce que le logiciel a constaté »
> « Ce que vous pouvez lui écrire / Des brouillons, à envoyer depuis votre messagerie »
> « Les valeurs juridiques employées / Leur source, leur date de relevé, et ce qu'on a le droit d'en faire »

Neuf en-têtes × ~14 mots = **126 mots de mobilier** avant le moindre contenu. C'est très exactement
« des milliards de textes partout ».

Apple, page _Writing_ des Human Interface Guidelines : « Check each word to be sure it needs to be
there. If you can use fewer words, do so. » Et, sur les possessifs : « "Favorites" conveys the same
message as "Your Favorites", and is more succinct. »

### D3. Les deux colonnes sont un organigramme, pas un ordre de lecture

`SECTIONS_GAUCHE = ['suivi','courriers','relances','voies','litige']` — « ce qu'on peut faire » ;
à droite, « ce que contient le dossier ». C'est la taxonomie du **logiciel**, pas celle du moment.

Le gérant ne se demande pas si ce qu'il cherche est une chose-à-faire ou une chose-à-savoir. Il
demande **où ça en est, et qu'est-ce que je fais**. La coupure l'oblige à tenir les deux colonnes
en tête, et c'est la sensation de « choses dans tous les sens ».

Aggravant : le bloc le plus lourd de la page (`SituationsDossier`, ~250 mots toujours ouverts) se
termine par une liste à puces « Ce que vous pouvez faire » dont **aucune puce n'est actionnable** —
la ligne rouge n° 3 l'interdit. La plus grosse masse de prose de l'écran est celle sur laquelle on
ne peut rien faire.

---

## 3. Le corpus — ce que font les meilleures applications iOS de 2026

Relevé sur Mobbin (iOS), quatorze applications, six recherches.

**Le dossier administratif, chez ceux qui le font bien**
[Alan](https://mobbin.com/screens/751decaa-80b3-4dfd-bb78-4f39c3718578) (assurance santé, France) ·
[Vestiaire Collective](https://mobbin.com/screens/a1064e36-1dbe-4daf-a43d-86bc2e23081f) ·
[StubHub](https://mobbin.com/screens/b3c71fe5-884d-4f57-85a2-8b39192d46d8) ·
[Cash App](https://mobbin.com/screens/bae4b8ae-c9f3-419f-a980-6b093639b4aa) (litige) ·
[Hers](https://mobbin.com/screens/9f679962-e78b-4571-bc08-525f78842506)

**La facture et le règlement**
[Revolut Business](https://mobbin.com/flows/4cc81f51-4d41-4621-9595-32fa87bbf5ed) ·
[Remote](https://mobbin.com/flows/67c444cc-5898-4295-b1f8-bb8e1b4bef38) ·
[Jobber](https://mobbin.com/screens/d581d1cf-9f9c-4aa5-8cf3-d9185b9f5e81) ·
[PayPal](https://mobbin.com/flows/66d918eb-310e-4de1-907b-9c8b61c56f26)

**Ce qui bloque, et comment on le dit**
[Turo](https://mobbin.com/flows/f7dcec44-c1d5-4510-99e6-84d5e5f67734) ·
[Fresha](https://mobbin.com/screens/5ef9f1bf-25b5-487c-b347-2dd30dc2d263) ·
[Warby Parker](https://mobbin.com/flows/e4846c97-948e-44bd-80f2-d0cd97b2b71d)

**L'état et l'action au même endroit**
[Ro](https://mobbin.com/flows/a09d3841-d746-47e5-8ad6-f84ad38568e5) ·
[Docusign](https://mobbin.com/screens/54193e9f-1a76-460e-9294-21de76db07e6)

**Les faits compacts, les rangées qui portent leur valeur**
[Linear](https://mobbin.com/screens/37137a91-09bd-4d3d-af38-e993f9841d2d) ·
[Apple Wallet](https://mobbin.com/screens/56f5fe00-69ba-4a5f-9b28-8ccca6315cbc) ·
[Lyft](https://mobbin.com/screens/ca7b9b32-af64-4e84-b491-186c2f7ab160)

### Les quatre codes qu'on reprend

**C1 — La frise EST la page.**
Chez Alan, Vestiaire Collective, StubHub et Hers, la frise n'est pas une décoration posée au-dessus
du contenu : c'est un rail vertical, et **chaque bloc du dossier pend à l'étape à laquelle il
appartient**. L'étape passée porte ce qu'elle a produit. L'étape en cours est une carte surélevée
qui contient son explication _et_ son geste. L'étape à venir est une ligne grise qui dit ce qui s'y
passera.

C'est le seul patron du corpus qui répond à « on ne comprend pas où on en est » **sans ajouter un
bloc de plus** : il en supprime sept.

**C2 — Une action, et une seule.**
Ro donne à l'écran le titre de son état (« Shipped »), une phrase d'explication, **un** bouton.
Remote met un bouton unique en bas, collé. Docusign coupe la barre du bas en deux : à gauche l'état
(« Needs to Sign »), à droite le geste (« Sign »). Revolut Business met une pastille d'action sous
le montant et pousse tout le reste dans un « ⋯ ».

La page dossier propose aujourd'hui trois boutons de même poids, plus deux questions, plus neuf
en-têtes cliquables : **quatorze gestes concurrents**.

**C3 — Une rangée porte sa réponse.**
Apple Wallet, Revolut, Lyft : « Status — Approved », « Due — Dec 2 ». Le nom à gauche, la valeur à
droite. On lit la réponse **sans ouvrir** ; on ouvre pour vérifier, pas pour savoir.
Linear va plus loin : un fait qui tient en trois mots devient une **pastille**, pas une rangée —
six faits en trois lignes.

**C4 — Ce qui bloque monte en haut, en ambre, avec son geste dedans.**
Turo : pastille « Action required », un titre à l'impératif, une ligne. Fresha : carte ambre,
« Complete consultation form before your appointment », lien « Complete now → » **dans la carte**.
Warby Parker : l'erreur en tête, le bouton dans le cadre rouge.

Aucun ne consacre 250 mots à expliquer la situation avant de dire quoi faire.

### Ce qu'Apple écrit, à la source

Page _Layout_ des Human Interface Guidelines, **révisée le 9 septembre 2026** :

> « Use progressive disclosure to make layouts cleaner and easier to interact with. An interface
> with too much content and too many choices makes it harder to find information quickly, and
> harder to understand the choices that are available. »

Et, pour la tablette — ce qui règle la question des deux colonnes :

> « Keep functionality the same as size classes change. […] you can change the amount of
> functionality that's visible onscreen as the amount of space changes. Consider taking advantage
> of larger spaces to […] expose functionality that might otherwise be grouped into an overflow
> menu. »

Autrement dit : **la même architecture aux quatre largeurs**, et la largeur ne fait que décider ce
qui est déjà déplié. Pas deux organisations différentes.

---

## 4. La cible — le gérant, et le moment où il ouvre ce dossier

Le persona du blueprint : **dirigeant de PME, 10 à 50 salariés**, « la trésorerie, et le temps qu'il
n'a pas », et — mot pour mot — « Rien de juridique. Il fuit. »

Les trois moments où il ouvre un dossier :

1. **Le matin, sur alerte.** Quelque chose a bougé : un courrier est prêt, une promesse est échue,
   une date approche. Il vient faire **un geste**, et repartir. Durée voulue : moins d'une minute.
2. **Le client au téléphone.** Il lui faut un chiffre et une date, tout de suite, à voix haute.
   Durée voulue : cinq secondes.
3. **La revue du mois.** Il veut comprendre pourquoi ce montant, et ce qui manque. C'est le seul
   moment où il lit.

La page actuelle est écrite pour le troisième, exclusivement. Les deux premiers — qui sont
**l'usage quotidien** — paient huit écrans de défilement pour un geste.

---

## 5. La structure cible

Du haut vers le bas, à 375 px.

```
┌──────────────────────────────────────┐
│ ‹  Fournitures Durand            ⋯   │  la barre : retour, nom, menu
├──────────────────────────────────────┤
│  6 373,50 €                          │  LE CHIFFRE, seul
│  dû aujourd'hui, et il monte         │  une ligne de légende
│  ⟨1 facture⟩ ⟨à payer le 1 mai 2026⟩ │  LES FAITS EN PASTILLES
│  ⟨agir avant le 1 mai 2031⟩          │  (Linear) — six faits, deux lignes
│  ⟨procédure collective⟩ ⟨payé 4 000⟩ │
├──────────────────────────────────────┤
│ ▲ Déclarer ce qu'il vous doit        │  CE QUI BLOQUE — ambre, et
│   La date limite part de la parution │  seulement s'il y a quelque chose
│   au journal officiel.   Voir ›      │  (Turo / Fresha)
├──────────────────────────────────────┤
│ ✓━ Prêt                              │  LA FRISE, ET ELLE EST LA PAGE
│ ┃   1 facture, 3 documents           │  étape faite : une ligne
│ ┃                                    │
│ ◉━ On lui écrit                      │  étape en cours : carte surélevée
│ ┃  ┌────────────────────────────────┐│
│ ┃  │ Il n'a pas payé. Les pénalités ││  UNE phrase
│ ┃  │ continuent de courir.          ││
│ ┃  │ ▸ 1 courrier à valider         ││  les objets vivants de l'étape
│ ┃  │ ▸ 2 promesses à trancher       ││
│ ┃  │ ┌────────────────────────────┐ ││
│ ┃  │ │   Préparer un courrier     │ ││  UNE action principale
│ ┃  │ └────────────────────────────┘ ││
│ ┃  │  Lui écrire · Les autres choix ││  le reste, en liens
│ ┃  └────────────────────────────────┘│
│ ┃                                    │
│ ○  Le tribunal, si besoin            │  étape à venir : une ligne grise
│ ┃   2 voies, si vous le décidez      │
│ ○  Réglé                             │
├──────────────────────────────────────┤
│ Le dossier                           │  LA MATIÈRE — une seule liste
│  Décompte              6 373,50 €  › │  chaque rangée porte sa valeur
│  Documents                      3  › │  (Apple Wallet)
│  Vos réponses        7 à confirmer › │
│  Solidité                 1 sur 4  › │
│  Les chiffres de la loi  42 sur 45 › │
│  Historique          2 à trancher  › │
├──────────────────────────────────────┤
│  Poser une question sur ce dossier › │  le compagnon, en pied (Alan)
└──────────────────────────────────────┘
```

**À partir de 1024 px** : deux colonnes, et la coupure change de nature. Elle ne sépare plus
« faire » de « savoir » — elle sépare **le temps** de **la matière**.

- **À gauche, le fil** : le chiffre, les pastilles, ce qui bloque, la frise. C'est ce qu'on lit.
- **À droite, la matière** : les six rangées, celle qu'on a ouverte dépliée au-dessous d'elle.

La rangée ouverte ne pousse plus le fil vers le bas — ce qui est, aujourd'hui, la raison pour
laquelle on perd sa place en ouvrant le décompte.

### Ce que la frise absorbe

Sept blocs disparaissent en entrant dans le rail :

| Bloc d'aujourd'hui              | Où il va                                                           |
| ------------------------------- | ------------------------------------------------------------------ |
| `FriseDossier` (horizontale)    | devient le rail                                                    |
| `EtapeEnCours`                  | devient la carte de l'étape en cours                               |
| `SituationsDossier` (~250 mots) | ce qui presse → « Ce qui bloque » ; le reste → la pastille du fait |
| `SectionCourriers`              | objet vivant de l'étape « On lui écrit »                           |
| `SectionRelances`               | idem                                                               |
| `SectionVoies`                  | ligne de l'étape « Le tribunal, si besoin »                        |
| `SectionRisques`                | → « Ce qui bloque »                                                |
| `SectionAnglesMorts`            | → « Ce qui bloque », et **rien** quand il n'y en a pas             |
| `SectionHypotheses`             | → une pastille teintée, qui s'explique d'un appui                  |
| `QuestionsPreecrites`           | une rangée en pied                                                 |

---

## 6. Les six règles de texte, et elles sont opposables

Une convention se perd au troisième ajout. Celles-ci sont tenues par
`src/screens/__tests__/page-dossier.test.ts`.

- **R1 — Un titre est un nom, pas une phrase.** Trois mots au plus. Aucun titre ne commence par
  « Ce que », « Ce qui », « Les choses que ».
- **R2 — Pas de possessif qui n'ajoute rien.** « Vos courriers » → « Courriers ». Apple, _Writing_ :
  « "Favorites" conveys the same message as "Your Favorites". »
- **R3 — Une rangée repliée porte sa valeur.** Un nom seul oblige à ouvrir les six rangées pour
  savoir laquelle parle.
- **R4 — Une étape s'explique en UNE phrase.** Pas deux, pas un paragraphe.
- **R5 — Rien ne dit que rien ne s'est passé.** « Aucun angle mort relevé sur ce dossier » suivi de
  trente mots est du bruit pur : quand il n'y a rien, on n'écrit rien. C'est la règle d'écran n° 4
  du projet (« le vide montre le chemin, jamais des cadrans à zéro »), appliquée aux blocs.
- **R6 — Un fait qui tient en trois mots est une pastille, pas une rangée.**

### Ce que ça donne, titre par titre

| Aujourd'hui                                                                           | Demain                     | Valeur repliée |
| ------------------------------------------------------------------------------------- | -------------------------- | -------------- |
| « Ce qui s'est passé / Vos notes, vos échanges, et ce que le logiciel a constaté »    | **Historique**             | 2 à trancher   |
| « Vos courriers / À votre nom, relus et validés par vous, envoyés par vous »          | **Courriers**              | 1 à valider    |
| « Ce que vous pouvez lui écrire / Des brouillons, à envoyer depuis votre messagerie » | **Relances**               | 3 prêtes       |
| « Les voies envisageables / Énumérées, jamais classées. Aucune n'est mise en avant. » | **Les suites**             | 2 voies        |
| « Ce que vous seul pouvez dire / Des faits, pas une appréciation juridique »          | **Vos réponses**           | 7 à confirmer  |
| « Le décompte, décomposé / Au jour d'aujourd'hui, et il bouge chaque jour »           | **Décompte**               | 6 373,50 €     |
| « Les documents / Déposées ici, lues et classées toutes seules »                      | **Documents**              | 3              |
| « Ce que vos documents montrent / Ce qu'un tiers pourrait lire du dossier »           | **Solidité**               | 1 sur 4        |
| « Les valeurs juridiques employées / Leur source, leur date de relevé… »              | **Les chiffres de la loi** | 42 sur 45      |

Les gloses ne disparaissent pas : elles descendent **à l'intérieur**, en tête du contenu, où elles
se lisent une fois au lieu de neuf.

---

## 7. Ce qui ne bouge pas — les lignes rouges, vérifiées une à une

Cette refonte ne touche à aucune des trois. Elle les rend **plus** lisibles.

1. **Rien ne part sans validation du gérant.** Le bouton principal de l'étape en cours prépare ; il
   n'envoie pas. Une commande d'envoi absente ne s'active jamais par accident.
2. **Aucun fonds.** Rien n'y touche.
3. **Aucun verdict, aucune recommandation.** ⚠️ **Le point de vigilance de cette refonte.** Une
   « action principale » unique sur l'étape en cours ne doit pas devenir une recommandation
   déguisée. La règle : **le bouton principal ne nomme jamais une voie de droit.** Il nomme un geste
   de bureau — « Préparer un courrier », « Voir les suites » — et l'étape « Le tribunal, si besoin »
   reste une ligne grise qui **énumère** sans classer. `aucun-verdict.test.ts` et `lexique.test.ts`
   continuent de balayer l'écran.

Et le mot « garantie » reste interdit.

---

## 8. Les lots

Chaque lot est livrable seul, vérifié aux quatre largeurs, et poussé en production.

### Lot 1 — La frise devient le rail, et elle porte la page

`src/ui/etapes-dossier.tsx` : `FriseDossier` + `EtapeEnCours` → `FilDuDossier`, un rail vertical.
Étape faite : disque plein, titre, une ligne de résultat. Étape en cours : carte surélevée, une
phrase, ses objets vivants, une action principale, le reste en liens. Étape à venir : ligne grise.
**Supprime : la frise horizontale, la carte « Maintenant », et la répétition du titre d'étape.**

### Lot 2 — Les faits deviennent des pastilles

`src/ui/faits-dossier.tsx`. L'en-tête garde le chiffre et sa légende ; tout le reste — nombre de
factures, échéance, date limite pour agir, procédure collective, paiement partiel, hypothèse de
délai — devient une pastille. Une pastille qui porte une nuance s'appuie et révèle sa phrase.
**Supprime : le bloc d'identité, les deux rangées de dates, la répétition du nom du client.**

### Lot 3 — Ce qui bloque monte

`src/ui/ce-qui-bloque.tsx`. Absorbe `SectionRisques`, `SectionAnglesMorts` et l'urgence des
situations. Ambre, un titre à l'impératif, une phrase, un lien. **Rien quand il n'y a rien.**

### Lot 4 — « Le dossier », une seule liste de six rangées

`src/ui/liste-dossier.tsx` remplace les deux `SectionsDepliables` et les neuf `SectionDepliable`.
Une rangée = un nom, une valeur, un chevron ; elle s'ouvre **en place**. À partir de 1024 px, la
liste est la colonne de droite et la rangée ouverte ne pousse pas le fil.

### Lot 5 — La réécriture, et la barrière qui la tient

Les neuf titres, les gloses descendues à l'intérieur, les phrases d'étape ramenées à une.
`src/screens/__tests__/page-dossier.test.ts` tient R1 à R6.

### Lot 6 — Le regard, la mesure, la production

Quatre largeurs dans la salle d'exposition, dans chacune des quinze variantes. Cible : **moins de
3 000 px à 375 px** (contre 6 479), **moins de 400 mots** (contre 845), **moins de 10 points de
décision** (contre 27).

---

## 9. Ce que chaque lot supprime, et ce que ça change pour le gérant

Le principe anti-dérive du projet demande les deux, chiffrés.

| Lot | Le geste manuel supprimé                                     | Ce que ça change                                                                         |
| --- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 1   | Lire quatre blocs pour savoir où en est le dossier           | L'état se lit en tête, une fois. Moment n° 1 : le geste du matin passe sous la minute.   |
| 2   | Faire défiler pour retrouver la date limite pendant un appel | Les six faits tiennent au-dessus de la ligne de flottaison. Moment n° 2 : cinq secondes. |
| 3   | Chercher dans 250 mots ce qui presse                         | Ce qui bloque est en haut, ou n'existe pas.                                              |
| 4   | Ouvrir six sections pour savoir laquelle parle               | Chaque rangée répond repliée.                                                            |
| 5   | Lire 126 mots de mobilier                                    | Les titres se balaient en un regard.                                                     |
| 6   | —                                                            | 8 écrans → moins de 4.                                                                   |
