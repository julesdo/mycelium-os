# La phase manuelle : les dix premiers clients, à la main

> Décision du fondateur, le 16/10/2026 : commencer à la main plutôt qu'engager un budget dans une
> machine (« est-ce qu'il faut pas que je commence à la main au lieu d'exploser un budget que je
> n'ai pas ? »). La machine viendra automatiser ce qui aura marché ici. Stratégie complète :
> `docs/superpowers/specs/2026-10-16-strategie-de-croissance.md`.

**L'objectif :** 10 abonnés payants, et une phrase d'accroche qui fait répondre.
**Le coût :** 0 € de plus. Environ une heure par jour.
**Le tableur :** `prospection.csv` (ouvrez-le dans Excel ou importez-le dans Google Sheets ; effacez
la ligne d'exemple).

---

## 1. La routine

| Quand | Quoi | Combien |
|---|---|---|
| **Lundi, 30 min** | Lister des entreprises cibles sur [annuaire-entreprises.data.gouv.fr](https://annuaire-entreprises.data.gouv.fr) (filtres : activité, département, effectif ; le dirigeant est sur la fiche). L'e-mail se trouve sur le site de l'entreprise, sa page de contact ou ses mentions légales. | 30 lignes |
| **Chaque jour, 40 min** | E-mails écrits à la main (modèles ci-dessous, une phrase personnalisée chaque fois) | 10 |
| | Messages LinkedIn, à la main | 5 |
| | Appels à des cabinets comptables de Gironde | 2 |
| **Chaque jour, 10 min** | Relances (J+4, puis J+10), et noter chaque réponse et chaque objection dans le tableur | — |
| **Vendredi, 15 min** | Relire la semaine : quelle phrase a fait répondre, quelle objection revient. Ajuster un seul élément du modèle pour la semaine suivante. | — |

**Les cibles, dans cet ordre :**

1. **Transport routier de marchandises** (code 49.41A), 3 à 49 salariés : la prescription d'un an
   est l'argument le plus fort.
2. **Bâtiment** (codes 41 à 43) et **services aux entreprises** (agences, conseil, nettoyage,
   sécurité), 3 à 49 salariés.
3. **Cabinets comptables** (69.20Z) de Gironde, par téléphone : un cabinet amène plusieurs clients.

## 2. Les règles

- **Une phrase écrite pour la personne** dans chaque e-mail (son activité, sa ville, une actualité
  de l'entreprise). Jamais d'envoi groupé, jamais de pixel de suivi.
- **Depuis votre adresse `@letikette.com`**, dix par jour au plus : à ce volume, c'est une
  correspondance, pas une campagne. On s'arrête dès qu'il y a des rebonds.
- **Le cadre légal B2B** : le message porte sur l'activité de la personne ; il dit qui vous êtes et
  où vous avez trouvé son contact (l'annuaire public des entreprises) ; il offre un moyen simple de
  ne plus être contacté. Une personne qui répond « stop » passe en « stop » dans le tableur et ne
  reçoit plus rien. On n'écrit qu'à une adresse professionnelle. On efface après trois ans sans
  réponse.
- **Les lignes rouges** valent ici aussi : jamais « garantie », jamais de promesse de
  recouvrement, jamais « vous devriez engager une procédure ». On montre ce que dit la loi et ce
  que le logiciel calcule.
- **Les chiffres de la loi** viennent du registre du produit
  (`src/lib/verticales/recouvrement/parametres.ts`, `pays/france/taux.ts`) : **40 € par facture**
  payée en retard ; pénalités au taux de la BCE majoré de dix points, soit **12,40 % par an au
  second semestre 2026** (BCE 2,40 % au 1er juillet). **Le taux change au 1er janvier : à vérifier
  dans le registre avant d'envoyer en 2027.**
- **Les liens portent leur source**, pour savoir d'où vient chaque inscription :
  `https://www.letikette.com/?utm_source=manuel&utm_medium=email&utm_campaign=transport#calcul`
  (remplacer `transport` par `batiment`, `services` ou `cabinet`, et `email` par `linkedin`).

## 3. Les e-mails

L'exemple chiffré de chaque modèle est un calcul fait sur des hypothèses rondes : 100 factures de
2 000 € réglées avec 30 jours de retard donnent 100 × 40 € = 4 000 € d'indemnités et 100 × 2 000 € ×
12,40 % × 30/365 ≈ 2 040 € de pénalités, soit environ 6 000 €. Ce n'est pas une affirmation sur les
comptes du prospect.

### Modèle 1 — Transport

> **Objet :** Vos factures de transport et le délai d'un an
>
> Bonjour {Prénom},
>
> {Phrase personnelle : ce que vous avez vu de l'entreprise.}
>
> Une facture de transport ne se réclame en justice que pendant un an, contre cinq ans pour la
> plupart des factures, et ce délai court depuis la livraison. Passé ce délai, la somme est perdue.
>
> Je développe Letikette, à Bordeaux : un logiciel qui lit vos factures, surveille ces délais et
> calcule ce que la loi ajoute à chaque facture payée en retard, 40 € par facture et des pénalités
> à 12,40 % par an ce semestre. Par exemple, 100 factures de 2 000 € réglées avec 30 jours de
> retard, c'est environ 6 000 € dus en plus, que presque personne ne réclame.
>
> Vous pouvez faire le calcul sur vos propres chiffres, sans inscription : {lien}
>
> Est-ce un sujet chez {Entreprise} ?
>
> Jules
> Fondateur de Letikette · www.letikette.com
>
> J'ai trouvé vos coordonnées sur l'annuaire public des entreprises. Si vous préférez que je ne vous
> écrive plus, répondez « stop ».

### Modèle 2 — Bâtiment et services

> **Objet :** Les 40 € de chaque facture payée en retard
>
> Bonjour {Prénom},
>
> {Phrase personnelle.}
>
> Quand un client professionnel paie en retard, la loi vous accorde automatiquement 40 € par
> facture, plus des pénalités au taux de 12,40 % par an ce semestre. Presque personne ne les
> réclame, faute de savoir les calculer.
>
> Je développe Letikette, à Bordeaux : le logiciel lit vos factures, chiffre ce qui vous est dû au
> centime, et envoie les relances à votre nom quand vous l'avez décidé. Sans commission sur ce qui
> rentre : tout est à vous.
>
> Le calcul sur vos chiffres prend une minute, sans inscription : {lien}
>
> Avez-vous en ce moment des factures qui tardent à être payées ?
>
> Jules
> Fondateur de Letikette · www.letikette.com
>
> J'ai trouvé vos coordonnées sur l'annuaire public des entreprises. Si vous préférez que je ne vous
> écrive plus, répondez « stop ».

### Modèle 3 — Cabinet comptable

> **Objet :** Les impayés de vos clients
>
> Bonjour {Prénom},
>
> Vous voyez passer les retards de paiement de vos clients dans leurs balances, sans avoir grand-chose
> à leur proposer. Je développe Letikette, à Bordeaux : le logiciel lit leurs factures, chiffre ce
> que la loi y ajoute (40 € par facture payée en retard et les pénalités), surveille les délais
> pour agir et envoie les relances au nom de votre client, sans commission sur ce qui rentre.
>
> Je cherche cinq cabinets de Gironde pour construire avec eux l'espace qui leur permettra de suivre
> les impayés de leurs clients. Accès gratuit pour le cabinet.
>
> Auriez-vous vingt minutes cette semaine ou la suivante ?
>
> Jules
> Fondateur de Letikette · www.letikette.com
>
> J'ai trouvé vos coordonnées sur l'annuaire public des entreprises. Si vous préférez que je ne vous
> écrive plus, répondez « stop ».

### Les relances

> **J+4 :** Bonjour {Prénom}, je me permets de remonter mon message de lundi. Une question simple :
> {Entreprise} a-t-elle des factures payées en retard en ce moment ?
>
> **J+10 (la dernière) :** Bonjour {Prénom}, je ne vous relancerai plus après ce message. Si le
> sujet devient d'actualité, le calcul reste là : {lien}. Bonne fin de semaine.

### LinkedIn (300 caractères)

> Bonjour {Prénom}, je développe Letikette à Bordeaux : un logiciel qui chiffre ce que la loi
> ajoute aux factures payées en retard (40 € par facture, plus les pénalités) et relance à votre
> nom. Je serais curieux d'avoir votre avis de dirigeant, sans engagement.

## 4. L'appel aux cabinets (deux minutes)

1. **Qui vous êtes :** « Bonjour, Jules, je développe Letikette à Bordeaux, un logiciel pour les
   impayés des TPE. Je ne vous vends rien aujourd'hui : je cherche l'avis de cabinets. Vous avez
   deux minutes ? »
2. **Trois questions, puis écouter :**
   - « Parmi vos clients, combien ont des impayés qui reviennent ? »
   - « Que leur proposez-vous aujourd'hui quand une facture traîne ? »
   - « Est-ce qu'ils réclament les 40 € et les pénalités de retard ? »
3. **Ce que fait Letikette, en une phrase :** « Il lit les factures du client, chiffre ce qui est
   dû au centime, surveille les délais pour agir et relance à son nom. »
4. **La demande :** « Je construis l'espace cabinet avec cinq cabinets de Gironde, gratuit pour
   vous. Je peux vous le montrer vingt minutes ? »
5. **Noter** dans le tableur : la réponse, l'objection, la prochaine action.

## 5. Les objections, et ce qu'on répond

| Objection | Réponse |
|---|---|
| « J'ai déjà les relances de Pennylane / Qonto. » | Elles relancent ; Letikette ajoute le calcul des 40 € et des pénalités, la date limite pour agir, et le suivi jusqu'à l'avocat si besoin. Les deux se branchent ensemble. |
| « Je ne veux pas froisser mes clients. » | Vous choisissez qui est relancé. Rien ne part sans que vous l'ayez décidé ; chaque relance s'affiche une heure avant de partir et se retient d'un geste. |
| « Combien ça coûte ? » | Découverte est gratuite (on voit ce qui est dû). Ensuite 12, 39 ou 119 € HT par mois, trente jours d'essai, aucune commission sur ce qui rentre. |
| « Réclamer 40 €, c'est légal ? » | Oui : c'est dû par tout professionnel qui paie en retard (code de commerce, D441-5), sans démarche préalable. Le logiciel cite la source sur chaque décompte. |
| « Je n'ai pas le temps. » | Le logiciel lit un export ou une photo de vos factures ; le reste se fait seul. Dix minutes pour voir ce qui vous est dû. |
| « Mes données ? » | Chaque document est chiffré à son arrivée, sous une clé propre à votre entreprise ; détail sur www.letikette.com/securite. |

## 6. Quand passer à la machine

Chaque dépense se débloque par un seuil mesuré ici, pas par une date.

| Dépense | On l'engage quand… |
|---|---|
| Instantly, domaines, boîtes (~100 € par mois) | 50 e-mails écrits à la main obtiennent au moins 10 % de réponses positives, **et** vous n'arrivez plus à suivre à la main |
| Icypeas ou FullEnrich, MillionVerifier | en même temps qu'Instantly |
| Le CRM de l'interface admin (du code, 0 €) | plus de 50 prospects actifs dans le tableur |
| Expériences automatiques, point du lundi écrit par Claude | environ 100 inscrits par mois |
| Publicité | le coût d'acquisition des autres canaux est connu |
