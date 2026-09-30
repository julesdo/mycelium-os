# Les codes des références — Claude, Shop, Revolut, écran par écran

**Commandé le 30 septembre 2026 par le fondateur**, mot pour mot : « j'ai l'impression qu'il y a des
milliards de zones cliquables. La page qui affiche tous les dossiers est juste horrible, surtout avec
le tab de 50 mille items… Ce que je veux c'est que tu analyses l'expérience de ces applications une
par une, écran par écran, pour reprendre les mêmes codes au lieu d'essayer de tout faire en même
temps. […] Tous les éléments UI doivent être beaucoup plus petits ! Regarde la taille des éléments
sur l'app Claude iOS. »

La méthode change donc : une application à la fois, un écran à la fois, et **des mesures**, pas des
impressions. Ce document porte les relevés, la calibration qui en découle, et la refonte d'UN écran
— la liste des dossiers.

---

## 0. Comment les mesures ont été prises

Les captures Mobbin représentent un iPhone de 393 pt de large, rendu sur 299 px : **1 px de capture
= 1,314 pt**. Chaque longueur ci-dessous est relevée sur la capture puis convertie.

Pour le texte, la hauteur relevée sur une capture basse définition est trop imprécise. On mesure
donc la **largeur** d'une chaîne connue dans la capture, puis on cherche au navigateur la taille à
laquelle **notre** police — Plus Jakarta Sans — rend la même chaîne à la même largeur. C'est la
« taille équivalente » : elle compare ce que l'œil voit, polices différentes comprises.

---

## 1. Claude iOS

### 1.1 La liste des conversations (« Chats »)

[Flux Mobbin](https://mobbin.com/flows/452dcc19-a390-4d80-80f0-5d01078c802e)

| Élément                       | Relevé                                            | Remarque                  |
| ----------------------------- | ------------------------------------------------- | ------------------------- |
| Titre de navigation « Chats » | ~16 px semi-gras, centré                          | pas de grand titre        |
| Boutons de barre              | cercles blancs ~44 pt, glyphe ~20 pt              | deux au plus              |
| Titre de rangée               | **16,4–16,8 px** équivalent, graisse normale      | pas gras                  |
| Sous-ligne (« 1 hour ago »)   | **13,3 px** équivalent, gris                      |                           |
| Pas des rangées               | ~62 pt pour deux lignes                           |                           |
| Séparateurs                   | **aucun**                                         | l'espacement suffit       |
| Cartes autour des rangées     | **aucune**                                        | texte posé sur le fond    |
| Chevron                       | petit, gris très clair                            | la rangée pousse une page |
| Action principale             | UNE capsule sombre « New chat » ~42 pt, flottante |                           |
| Recherche                     | pilule ~46 pt en bas d'écran                      |                           |

### 1.2 Les réglages

[Flux Mobbin](https://mobbin.com/flows/6db9d860-ba9b-4e54-8f89-c2c55a6327b6)

| Élément                | Relevé                                                              |
| ---------------------- | ------------------------------------------------------------------- |
| Libellé de rangée      | ~17 px équivalent, graisse normale                                  |
| Icône de rangée        | **~20 pt, au trait**, monochrome                                    |
| Pas des rangées        | **~51 pt**                                                          |
| Séparation des groupes | un **filet**, ou une carte groupée grise à rayon ~16 pt             |
| Valeur à droite        | gris, ~15 pt (« System ⌃⌄ », « EN › »)                              |
| Seul bouton plein      | « Upgrade », capsule sombre **~37 pt**, texte **~13 px** équivalent |

### 1.3 Ce que Claude dit, en une phrase

**Le texte n'est pas petit ; tout le reste est minuscule ou absent.** Pas de carte autour d'une
rangée, pas de pastille autour d'un libellé, des icônes au trait fin, un seul bouton plein par écran.

---

## 2. Shop

### 2.1 La liste des commandes

[Flux Mobbin](https://mobbin.com/flows/faec93a5-d105-48fd-a64a-21ddf725983b)

| Élément                                           | Relevé                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Recherche                                         | pilule grise ~40 pt, deux petits boutons carrés à côté                                                       |
| Boutons secondaires (« Add orders », « Archive ») | **~29 pt**, texte ~13 pt                                                                                     |
| Bouton dans un bandeau (« Connect account »)      | **~24 pt**, capsule sombre                                                                                   |
| Rangée de commande                                | vignette carrée **~63 pt**, marchand en gris, **statut en gros et gras** (~20 pt), barre de progression fine |
| Chevron                                           | **aucun**                                                                                                    |
| Carte autour des rangées                          | **aucune**                                                                                                   |

### 2.2 Le détail d'une commande

[Flux Mobbin](https://mobbin.com/flows/baea13e9-5554-4666-8d4b-1c05413509da)

| Élément                                                 | Relevé                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| Titre de l'écran                                        | **le statut** — « Delivered », « Order placed », ~28 pt gras |
| Retour                                                  | un chevron seul, sans cercle                                 |
| Actions produit (« Review », « Buy again »)             | capsules **~32 pt**, une grise, une pleine                   |
| Rangées de navigation (« Order receipt », « Message… ») | icône ~20 pt + libellé 17 pt, **chevron**, filet             |
| Bouton pleine largeur (« Visit store »)                 | ~42 pt, gris                                                 |

### 2.3 Ce que Shop dit

**Le chevron distingue la navigation du contenu.** Une commande n'en porte pas ; « Order receipt »
en porte un. Et le statut, pas le nom, est ce qu'on lit en gros.

---

## 3. Revolut

### 3.1 La liste des transactions — le modèle de notre liste des dossiers

[Flux Mobbin](https://mobbin.com/flows/1059701f-6ed0-4a63-a8eb-9d8b83422c45)

| Élément                       | Relevé                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Grand titre « Transactions »  | **~32 px** équivalent, gras, à gauche                                                                                     |
| Recherche                     | pilule **~34 pt**                                                                                                         |
| **Filtre**                    | **UN bouton rond ~32 pt**, qui ouvre une feuille. Au plus un segment à **deux** options (« Past / Upcoming »).            |
| En-tête de groupe (« Today ») | ~17 px semi-gras, **total du groupe à droite** en gris                                                                    |
| Rangées                       | dans **une seule carte groupée** par groupe, avatar **~42 pt**, titre ~15,7 px, sous-ligne **~12,3 px**, montant à droite |
| Chevron                       | **aucun**                                                                                                                 |
| Feuille de filtre             | titre ~20 pt, « Select all » en **texte bleu seul**, cases à cocher, un bouton plein pleine largeur ~52 pt                |

### 3.2 Ce que Revolut dit

**Le filtrage est une feuille, pas une rangée d'onglets.** Et une liste longue se lit par groupes,
chaque groupe annonçant son compte et son total.

---

## 4. La calibration — ce que les chiffres disent de Letikette

Tailles équivalentes relevées, comparées à l'échelle en production le 30/09/2026 au matin :

|                                 | Références                   | Letikette | Verdict         |
| ------------------------------- | ---------------------------- | --------- | --------------- |
| Titre de rangée                 | 15,7–17,1 px                 | 17 px     | juste           |
| **Sous-ligne**                  | **12,3–13,3 px**             | **15 px** | **+15 à +20 %** |
| **Texte de bouton**             | **~13 px**                   | **17 px** | **+30 %**       |
| **Hauteur de bouton courant**   | **32–37 pt**                 | **48 px** | **+30 à +50 %** |
| **Hauteur de bouton principal** | **42–46 pt** (52 en feuille) | **56 px** | **+20 à +30 %** |
| Pastille (chip)                 | 24–29 pt                     | 40 px     | +40 %           |
| Rembourrage de carte            | ~16 pt                       | 20 px     | +25 %           |
| Écart courant                   | 8–12 pt                      | 16 px     | +30 à +100 %    |
| Grand titre                     | ~32 px                       | 30 px     | juste           |

**Le corps du texte est juste ; tout ce qui l'entoure est 20 à 50 % trop gros.** C'est très
exactement « tous les éléments UI doivent être beaucoup plus petits », et c'est aussi pourquoi le
passage au corps d'iOS, la veille, n'avait pas suffi : il avait réglé le texte en laissant les
contrôles à leur taille de tablette.

### La nouvelle échelle

**Espacement — commande aussi la hauteur des contrôles** (le kit en dérive tout) :

| Jeton | Avant | Après  | Ce qu'il porte                                                 |
| ----- | ----- | ------ | -------------------------------------------------------------- |
| `3xs` | 16    | **12** | les écarts courants                                            |
| `2xs` | 20    | **16** | le rembourrage des cartes, **la gouttière de page**            |
| `xs`  | 28    | **20** | l'écart entre sections                                         |
| `sm`  | 40    | **28** | contrôles compacts                                             |
| `md`  | 48    | **36** | **le contrôle courant** (Claude « Upgrade » 37, Revolut 34)    |
| `lg`  | 56    | **44** | **le bouton principal** (Claude 46, Shop 42, plancher d'Apple) |
| `xl`  | 64    | 52     | le bouton plein d'une feuille (Revolut 52)                     |
| `2xl` | 72    | 60     |                                                                |

Pastille `md` (rampe imbriquée, −8) : 40 → **28** (Shop 29). Rayons recalés sur la base `md` = 36.

**Texte :** `xs` 17 → **16** (Revolut 15,7, Claude 16,8), `2xs` 15 → **13** (références 12,3–13,3),
`3xs` 13 → **12**, `sm` 20 → 18, `md` 22 → 20.

⚠️ **La gouttière de page est décrochée de `3xs`** avant la bascule : elle partageait ce jeton avec
433 écarts, et serait tombée à 12 px — plus serrée que toutes les références. Elle passe sur `2xs`
(16 px).

⚠️ **Le plancher tactile passe de 48 à 44 pt**, celui d'Apple. Il vaut pour les rangées et les
boutons principaux. Un contrôle secondaire compact peut faire 36 px, comme chez Claude, Revolut et
Shop.

---

## 5. Les règles d'interaction — contre les « milliards de zones cliquables »

Relevé sur la liste des dossiers le 30/09/2026 : cinq segments de filtre, un bouton « Sélectionner »
en pilule de 56 px, cinq rangées, chacune avec un chevron, une pilule flottante « Demander », quatre
onglets. **Seize cibles**, dont onze habillées en bouton.

Chez Revolut, sur le même écran : une recherche, un bouton filtre, les rangées. **Trois.**

- **I1 — Une rangée de contenu ne porte pas de chevron.** Le chevron se réserve aux rangées de
  navigation (« Fiche du client », un réglage). Shop et Revolut le font ; un chevron sur chaque
  rangée d'une liste de contenu dit « tout est un bouton ».
- **I2 — Le filtrage est une feuille**, ouverte par UN bouton rond. Le filtre actif se lit en une
  pastille qu'on retire d'un appui.
- **I3 — Une action secondaire d'en-tête est du texte**, pas une pilule. « Sélectionner » comme le
  « Select » de Mail.
- **I4 — Un seul bouton plein par écran.**
- **I5 — Une liste longue se groupe**, et chaque en-tête porte son compte et son total.

---

## 6. La liste des dossiers, refaite

```
┌──────────────────────────────────────┐
│ Dossiers                 Sélectionner │  grand titre, action en TEXTE
│ 54 211,50 € à recouvrer · 5 dossiers │
│ ┌──────────────────────────┐  ┌──┐   │
│ │ 🔍 Rechercher un client  │  │≡ │   │  recherche + UN filtre
│ └──────────────────────────┘  └──┘   │
│                                      │
│ Prêts                   2 · 38 191 € │  en-tête de groupe + total
│ ┌──────────────────────────────────┐ │
│ │ (AM) Ateliers Martin   31 991,00 €│ │  une carte par groupe
│ │      Remise… · 1 juin 2026        │ │  aucun chevron
│ │ (FD) Fournitures Durand 6 200,50 €│ │
│ │      Agir avant le 27 oct. 2026   │ │
│ └──────────────────────────────────┘ │
│ On lui écrit            1 · 12 840 € │
│ ┌──────────────────────────────────┐ │
│ │ (CL) Comptoir Lefèvre  12 840,00 €│ │
│ │ •    Un courrier à valider        │ │
│ └──────────────────────────────────┘ │
│ …                                    │
│ Réglés                           1   │  le groupe clos, en dernier
└──────────────────────────────────────┘
```

Ce qui part : les cinq segments, la pilule « Sélectionner », les chevrons. Ce qui arrive : une
recherche sur le nom du client, un bouton filtre et sa feuille, des groupes par étape qui disent
leur compte et leur total.

Le mode sélection garde les mêmes rangées : la case prend la place de l'avatar, comme dans Mail.

---

## Les applications de notre métier (relevé du 30/09/2026 au soir)

Demande du fondateur : « trouve sur Mobbin des apps qui font la même chose que nous, étudie leurs
parcours et prends exemple ». Relevé sur iOS : Revolut Business (factures), PayPal (facture,
relance), Jobber (facture d'artisan), Splitwise (qui me doit quoi), Afterpay (ce que je dois),
Wise (demandes de paiement), bunq et Revolut Business (profil).

| Parcours                                | Ce qu'ils font                                                                                                                      | Ce que Letikette en reprend                                                                           |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Liste des factures (Revolut Business)   | Groupes par date ; une rangée = client, état en quatre mots (« Due in 9 days · INV-4 »), montant                                    | Groupes avec compte et total (`EnTeteDeGroupe`), rangée partagée, état court                          |
| Détail d'une facture (Revolut Business) | Montant en grand, client, **un** bouton (« Mark as paid ») + « ··· », puis cartes courtes (statut, client, lignes, chronologie)     | Page dossier : montant, état, un bouton, trois derniers faits                                         |
| Relancer (PayPal)                       | « Send reminder » sous le montant dû → feuille de confirmation → écran « Reminder sent » → « Done »                                 | Le bouton de l'état ouvre la feuille « Courriers et e-mails » (rien ne part d'ici : ligne rouge n° 1) |
| Facture (Jobber)                        | L'état en tête (« Awaiting Payment »), puis Resend / Collect Payment / ···                                                          | L'état en toutes lettres avant le bouton                                                              |
| Onglet « Friends » (Splitwise)          | **Pas de grand titre** : une barre fine (loupe, un mot d'action), une ligne « Overall, you owe… », la liste avec le solde de chacun | Barre compacte sur tous les onglets ; la carte « Encours total » des clients retirée                  |
| « Your orders » (Afterpay)              | Le montant dû centré, trois petits chiffres dessous, la liste                                                                       | Montant centré sous la barre (« Aujourd'hui », page dossier)                                          |
| Profil (bunq)                           | Petit titre centré dans la barre, une icône                                                                                         | Barre d'un écran sans action : son nom en petit, centré (Compte, Dépôts)                              |
| Détail (Revolut Business)               | Retour **rond** sans libellé, nom centré                                                                                            | Barre des pages poussées : retour rond, nom centré, adresse en petit                                  |

**La règle qui en sort** (`PageHeader`, `EnteteDetail`) : une seule barre fine et collante sur
tout le produit. Un écran qui a des actions les met dans la barre (la recherche en tête) ; un écran
qui n'en a pas y écrit son nom en petit ; une page poussée y met un retour rond et son nom. Le titre
reste publié pour nommer le retour de la page suivante.
