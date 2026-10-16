# La stratégie de croissance de Letikette — la machine marketing automatisée (16/10/2026)

> Demande du fondateur, le 16/10/2026 : « la meilleure growth machine pour Letikette avec les
> méthodes les plus efficaces, un système qui s'auto-améliore », puis : « une réelle stratégie de
> growth avec l'utilisation des meilleurs outils du marché et les mieux en rapport qualité-prix
> pour les bases d'email froids […] toutes les étapes de l'acquisition à la conversion en passant
> par l'upselling, la notoriété […] notre machine marketing automatisée ».
>
> **Décisions du fondateur, le même jour :** l'interface est **Twenty** ; la machine agit **seule
> dans un cadre** (il valide chaque texte, elle promeut seule la variante gagnante) ; cette
> stratégie et son découpage en cinq sous-projets sont validés (« Oui, écris-la »).
>
> **Puis, le même jour, Twenty est abandonné** (le fondateur : « Je pense qu'on va juste développer
> l'admin »). Raccorder Twenty à l'application, à Umami et à Instantly demandait d'écrire tous les
> connecteurs nous-mêmes, pour une donnée tenue en double ; Umami ne mesurant personne, il n'y aurait
> apporté que des totaux. **Le cockpit est l'interface admin**, dont le CRM est le premier module
> (sous-projet 6, spec à écrire). Ce qui suit dit « l'admin » là où il disait Twenty.
>
> **Puis, le même jour, la décision qui ordonne tout le reste :** commencer **à la main** (« est-ce
> qu'il faut pas que je commence à la main au lieu d'exploser un budget que je n'ai pas dans une
> growth machine ? »). Une machine automatise un processus qui marche ; il n'existe pas encore. La
> phase manuelle vient d'abord (`docs/croissance/phase-manuelle.md`), avec seulement ce qui ne
> coûte rien parce que c'est du code ; chaque dépense se débloque par un seuil mesuré (§ 0).
>
> Le premier sous-projet a sa spec : `2026-10-16-moteur-de-croissance-design.md`.

---

## 0. D'abord à la main

**Pourquoi :** une expérience demande au moins 100 personnes par variante et un point du lundi a
besoin de chiffres ; avec quelques inscrits par semaine, la machine tournerait à vide. Le message
n'est pas validé : 2 400 e-mails par mois sur un message non testé brûlent des domaines et des
contacts, quand 50 e-mails écrits à la main disent en deux semaines quelle phrase fait répondre.
Les dix premiers clients viennent de conversations, et chaque objection entendue devient un texte
de la machine.

**Ce qui se fait tout de suite, à 0 € de plus :**

- **À la main (le fondateur)** : la routine de `docs/croissance/phase-manuelle.md` (30 cibles le
  lundi, 10 e-mails, 5 messages LinkedIn et 2 appels à des cabinets chaque jour, un tableur, un
  journal des objections). Objectif : 10 abonnés payants et une phrase qui fait répondre.
- **En code (gratuit : Resend est déjà payé)** : la source de chaque inscription et les étapes du
  gérant, les e-mails de Plume pour l'activation, le score, un point chiffré du lundi sans IA
  (sous-projet 1 réduit) ; puis les outils gratuits et les pages par secteur (sous-projet 3), qui
  travaillent seuls pendant qu'on prospecte.

**Ce qui attend son seuil :**

| Dépense | On l'engage quand… |
|---|---|
| Instantly, domaines, boîtes (~100 € par mois) | 50 e-mails écrits à la main obtiennent au moins 10 % de réponses positives, **et** le fondateur n'arrive plus à suivre à la main |
| Icypeas ou FullEnrich, MillionVerifier | en même temps qu'Instantly |
| Le CRM de l'admin (0 €, du code) | quand le tableur ne suffit plus (plus de 50 prospects actifs), avec l'interface admin |
| Expériences automatiques, point du lundi écrit par Claude | environ 100 inscrits par mois |
| Publicité | le coût d'acquisition des autres canaux est connu |

Le reste de ce document décrit la machine **à son régime de croisière** : c'est la cible, atteinte
étage par étage, chacun débloqué par son seuil.

## 1. Ce que la recherche a établi

Les prix et chiffres ci-dessous ont été relevés le 16/10/2026, le plus souvent chez des
comparateurs tiers ; ils sont à reconfirmer chez l'éditeur au moment de souscrire.

1. **À 12-119 € par mois, un commercial ne se rembourse pas.** Sous environ 3 000 € de panier
   annuel, ce qui marche est l'essai qui convertit, le référencement et la recommandation.
   L'activation est la métrique qui prédit le mieux la conversion.
2. **Les cabinets comptables sont le canal des TPE.** 80 à 90 % des petites entreprises clientes de
   Pennylane y sont venues par leur cabinet ; Qonto offre un an au cabinet et trois mois à ses
   clients. L'Ordre a resserré en septembre 2026 la rémunération des cabinets par un tiers : on les
   rétribue en outil, pas en commission.
3. **Personne ne propose un générateur de relance qui calcule** : la première page de « mise en
   demeure facture impayée » n'a que des modèles Word. Google sanctionne les pages en série sans
   donnée propre (mars 2026) : chaque page de Letikette porte un vrai calcul.
4. **La facture électronique** : réception obligatoire depuis le 1er septembre 2026, émission pour
   les PME et TPE au 1er septembre 2027. Les catalogues d'applications des plateformes sont un
   canal.
5. **Aucune boucle virale par le débiteur** (nos courriers ne nomment pas Letikette). Les boucles
   viennent du gérant, du cabinet et du contenu.
6. **La donnée d'entreprise est gratuite, l'e-mail ne l'est pas.** L'API Recherche d'entreprises
   (data.gouv.fr, sans clé) donne les entreprises par activité, taille et lieu, avec leurs
   dirigeants ; ni e-mail ni site. Societeinfo annonce 1,2 million de SIREN avec un site web et des
   millions d'e-mails génériques ; Pharow réconcilie données légales, site et LinkedIn.
7. **L'envoi à froid a ses règles** : SPF, DKIM et DMARC alignés, désinscription en un clic,
   moins de 0,3 % de plaintes ; 20 à 50 envois par boîte préchauffée et par jour, 30 à 75 par
   domaine ; trois semaines de préchauffage ; des domaines secondaires pour protéger le domaine du
   produit. Resend interdit la prospection en masse. L'automatisation de LinkedIn viole ses
   conditions d'utilisation.
8. **Le cadre légal B2B** : prospection par e-mail sans consentement préalable si le message porte
   sur l'activité du destinataire, avec information, émetteur identifié et opposition simple dans
   chaque message ; traçabilité de la source ; une adresse nominative reste une donnée personnelle.
9. **La publicité en France**, en ordre de grandeur : environ 18 € par lead sur Meta, 180 € sur
   LinkedIn ; le juridique et la finance coûtent 2,50 à 10 € le clic sur Google.
10. **Les abonnés PME partent vite** : 3 à 5 % de churn mensuel est la norme ; l'expansion pèse
    autant que l'acquisition. Une proposition de formule supérieure se fait vers 80-90 % d'une
    limite, aux comptes activés seulement, sans insister.

## 2. Le principe : un cerveau, un cockpit, des bras

- **Le cerveau, c'est Convex.** Tout ce qui touche aux données du produit et aux décisions vit
  dans notre code : les étapes, le score, les expériences, les listes de prospection, la
  répartition des contacts entre outils, le point du lundi.
- **Le cockpit, c'est l'interface admin** (`/admin`, réservée à l'équipe de Letikette). On y lit les sociétés, les personnes, les tâches, les notes et les
  points du lundi. Il ne reçoit que des données de compte et de prospection, jamais un débiteur ni
  un montant d'un client.
- **Les bras sont loués** quand ils sont un métier à part : l'envoi à froid, la recherche d'e-mails,
  la vérification. Chaque outil retenu a une API, pour que la machine le pilote sans vous.
- **Le cadre** : vous validez chaque texte ; la machine répartit, mesure, décide et promeut seule la
  variante gagnante ; elle propose les idées nouvelles chaque lundi.

## 3. Les sept étages

| Étage | Ce que fait la machine | Outils | Sous-projet |
|---|---|---|---|
| **Notoriété** | outils gratuits qui calculent ; une page par secteur ; « le taux des pénalités du semestre » ; un **baromètre mensuel des procédures collectives par secteur** tiré du BODACC ; un `llms.txt` ; des brouillons de posts LinkedIn du fondateur | le site, la Search Console | 3 |
| **Acquisition par le contenu** | chaque lundi, des sujets d'articles sur les recherches où l'on est en page 2 | la Search Console, Claude | 3 |
| **Acquisition à froid** | listes construites seules, e-mails trouvés et vérifiés, séquences, réponses rapatriées dans l'admin | API Recherche d'entreprises, Icypeas ou FullEnrich, MillionVerifier, Instantly | 2 |
| **Activation** | les e-mails de Plume selon les étapes du gérant | Resend (en place) | 1 |
| **Conversion** | une fin d'essai qui dit ce qui a été fait ; une tâche « Appeler » quand le score est haut | Resend, l'admin | 1 puis 4 |
| **Expansion** | la formule supérieure proposée à 80 % d'une limite ; le passage à l'année après trois mois payés ; l'équipe | `limites.ts`, Paddle | 4 |
| **Fidélisation et parrainage** | un score de santé des abonnés ; la reconquête trente jours après une résiliation ; une demande d'avis quand de l'argent rentre ; un mois offert de chaque côté pour un parrainage | Resend, Paddle, Capterra / Appvizer | 4 |

### 3.1 La notoriété et le contenu

- **Les outils gratuits** : un générateur de relance et de mise en demeure chiffrée (le montant,
  les pénalités, les 40 € par facture, calculés par le moteur du produit) ; le calculateur de la
  page d'accueil ; le délai pour agir par secteur. Un compte n'est demandé que pour télécharger le
  document ou le suivre. Le document produit part chez un tiers : il ne nomme pas Letikette.
- **Les pages sourcées** : une par métier (le transport et sa prescription d'un an, le bâtiment,
  les services), une par question juridique fréquente, « le taux des pénalités du semestre » mise
  à jour à chaque publication de la BCE. Aucune valeur juridique écrite à la main : elles lisent le
  registre, comme le blog.
- **Le baromètre BODACC** : chaque mois, les ouvertures de procédures collectives par secteur et par
  région, tirées des annonces publiques que le produit lit déjà. Une donnée qui intéresse la presse
  et les fédérations, et qui ne touche à aucune donnée client.
- **Être cité par les assistants** : un `llms.txt`, des réponses structurées en tête de page, une
  présence sur les annuaires de logiciels.
- **LinkedIn** : la machine prépare chaque semaine trois brouillons de posts du fondateur (un fait de
  la loi, un chiffre du baromètre, un cas), qu'il publie à la main.

### 3.2 La prospection à froid

**Deux cibles, dans cet ordre :**

1. **Les PME des secteurs pointe** : transport, bâtiment, services aux entreprises, 10 à 49
   salariés. Le message porte un ordre de grandeur calculé par le moteur sur des moyennes
   publiques (ce que laisse filer une entreprise de cette taille), jamais une affirmation sur
   leurs comptes, jamais une donnée d'un client de Letikette.
2. **Les cabinets comptables** (code d'activité 69.20Z, environ 20 000 en France), une fois
   l'espace cabinet construit (sous-projet 5) : un cabinet amène plusieurs clients.

**La chaîne :**

| Maillon | Outil retenu | Prix relevé | Pourquoi |
|---|---|---|---|
| La liste | API Recherche d'entreprises | gratuit | activité, taille, lieu, dirigeants ; Pharow ou Societeinfo (~99 €/mois) seulement si le site web manque trop souvent |
| Le site et l'e-mail générique | Societeinfo (plus tard, si besoin) | ~99 €/mois | 1,2 million de SIREN avec un site |
| L'e-mail du dirigeant | **Icypeas** ou **FullEnrich**, départagés sur les mêmes 200 entreprises | 19-39 $/mois ; 29-55 $/mois | Icypeas ne facture que les trouvés ; FullEnrich interroge une vingtaine de fournisseurs (~80 % trouvés) |
| La vérification | **MillionVerifier** | ~0,2-0,4 centime l'e-mail | le moins cher, crédits sans expiration |
| L'envoi | **Instantly**, offre avec API | ~78 $/mois à l'année | boîtes et préchauffage illimités, API v2 et déclencheurs (réponses, désinscriptions, rebonds) |

Écartés : lemlist (87 à 109 $ par siège), La Growth Machine (facturée par compte LinkedIn),
Smartlead (équivalent, moins d'intégrations), Apollo, Lusha et Kaspr (pensés pour LinkedIn et les
grandes entreprises), l'automatisation de LinkedIn (conditions d'utilisation).

**L'infrastructure :** les **boîtes « clés en main » d'Instantly** (5 $ par boîte Google et par
mois, 15 $ par domaine et par an) : Instantly achète les domaines, règle SPF, DKIM et DMARC, et les
boîtes vivent dans un compte Google séparé de celui de Letikette. **Jamais le Google Workspace de
`bonjour@letikette.com` ni un alias** (le fondateur, 16/10/2026 : « J'en ai déjà un avec
bonjour@letikette.com ») : un alias envoie par le même compte, Instantly le déconseille, et une
suspension emporterait la boîte principale ; une prospection depuis `letikette.com` abîmerait aussi
la réputation du domaine qui envoie les e-mails du produit. **On commence à 2 domaines × 2 boîtes**
(environ 30 envois par boîte et par jour une fois préchauffées : ~2 400 e-mails par mois), et l'on
passe à 6 boîtes quand les premières semaines tiennent leurs chiffres. Écarté : Google Workspace
en propre (6,80 € par boîte et par mois), Mailforge (2-3 $, serveurs partagés, préchauffage en sus).
Le préchauffage prend trois semaines : les boîtes s'ouvrent le premier jour.

**Le cadre :** l'émetteur est Letikette, identifié avec ses mentions ; chaque e-mail porte un lien
de désinscription en un clic ; une liste d'opposition commune à tous les outils, tenue dans
Convex ; la source de chaque contact notée ; suppression après trois ans sans réponse ; jamais par
Resend ; les textes passent sous le lexique et le mot interdit.

### 3.3 L'activation, la conversion, l'expansion, la fidélisation

- **Activation** : les cinq e-mails de Plume du sous-projet 1.
- **Conversion** : la fin d'essai (déjà prévenue à J-7 et J-2) dit ce que le pilote a fait et ce
  qui est rentré ; au-delà d'un score de 60, une tâche « Appeler » dans l'admin.
- **Expansion** : à 80 % d'une limite de formule, Plume le dit dans l'application et par un e-mail,
  une fois ; après trois mois payés au mois, le passage à l'année (dix mois payés) proposé une fois ;
  un membre invité sur Solo propose Équipe. Jamais pendant l'activation, jamais deux fois.
- **Fidélisation** : un score de santé des abonnés (dernière connexion, relances en pause, dossiers
  ouverts) ; sous un seuil, Plume relance le gérant et une tâche se crée pour le fondateur ; trente
  jours après une résiliation, un e-mail de reconquête qui dit ce qui a changé depuis la raison
  donnée.
- **Avis** : au moment où de l'argent rentre sur un dossier (la fête de Plume), une demande d'avis
  sur Capterra ou Appvizer, une fois par compte.
- **Parrainage** : un mois offert de chaque côté, par une remise Paddle ; proposé au même moment.
  Rewardful ou Tolt (49 à 69 $/mois, compatibles Paddle) seulement si un programme d'affiliés
  s'ouvre (consultants, DAF à temps partagé ; jamais une commission à un cabinet comptable).

### 3.4 La publicité

En test borné, plus tard : 300 à 500 € par mois, sur Google (recherches à forte intention) et Meta
(audiences importées de prospects), **sans traceur publicitaire** : la source se lit dans notre
base par les paramètres utm. Elle ne s'ouvre que si le coût d'acquisition des autres canaux est
connu.

## 4. Le budget

| Poste | Prix mensuel relevé |
|---|---|
| Instantly, offre avec API, à l'année | ~72 € |
| 4 boîtes clés en main et 2 domaines (Instantly) | ~20 € |
| Icypeas ou FullEnrich | ~35-50 € |
| MillionVerifier | ~15 € |
| Claude (point du lundi, brouillons) | ~20 € |
| **Total de base** | **~160-175 €** |
| Societeinfo, si le site manque | +99 € |
| Publicité, en test | +300-500 € |

## 5. L'économie, en hypothèse à mesurer

2 400 e-mails par mois au départ (3 700 à six boîtes), 1 à 2 % de clics, 20 % d'inscription parmi eux, 20 à 25 % de passage au
payant : 1 à 3 abonnés par mois au départ, 2 à 4 à six boîtes, un coût d'acquisition de 60 à 110 €, remboursé en deux à trois
mois sur Équipe. **Ce n'est pas une promesse** : le moteur mesure chaque taux dès la première
semaine, et si la prospection ne tient pas ces chiffres en six semaines, le point du lundi le dit et
le budget va au contenu.

## 6. Les cinq sous-projets

| # | Sous-projet | Contenu | Spec |
|---|---|---|---|
| 1 | **Le moteur et l'activation** | mesure des sept étages par source, e-mails de Plume, score, expériences, point du lundi | `2026-10-16-moteur-de-croissance-design.md` |
| 2 | **La prospection automatisée** | listes, enrichissement, vérification, Instantly, opposition commune, réponses dans l'admin | à écrire |
| 3 | **La notoriété et le contenu** | outils gratuits, pages sourcées, taux semestriel, baromètre BODACC, `llms.txt`, brouillons LinkedIn, Search Console | à écrire |
| 4 | **La conversion et l'expansion** | fin d'essai, montée en gamme, passage à l'année, santé, reconquête, avis, parrainage | à écrire |
| 5 | **Les partenaires** | espace cabinet, catalogues d'applications (Pennylane, Qonto, Xero, QuickBooks), fédérations ; puis la prospection des cabinets | à écrire |
| 6 | **L'interface admin** | le cockpit de l'équipe : le CRM (comptes, prospects, historique, tâches) en premier module, puis ce que l'admin doit porter d'autre | à écrire |

**L'ordre** : 1 réduit au gratuit (source, étapes, e-mails de Plume, score, point chiffré du lundi), puis 3 (outils gratuits, pages par secteur), puis 4 ; 2 et la part payante de 1 (expériences, point écrit par Claude) attendent leur seuil (§ 0) ; 5 commence par les cabinets rencontrés à la main.

## 7. Ce que le fondateur fait, et quand

**Tout de suite :** la phase manuelle (`docs/croissance/phase-manuelle.md`). Rien à acheter.

**Quand le seuil d'Instantly est franchi (le préchauffage prend alors trois semaines) :**

1. Ouvrir un compte Instantly (offre avec API).
2. Y commander deux domaines secondaires proches de la marque (jamais `letikette.com`) et deux
   boîtes « clés en main » par domaine, au prénom du fondateur ; Instantly règle SPF, DKIM et
   DMARC. Chaque domaine redirige son site vers `www.letikette.com`.
3. Lancer le préchauffage des quatre boîtes.

**Pour le sous-projet 1 :** une clé de lecture Umami ; l'adresse
du point du lundi (`FONDATEUR_EMAIL`).

**Pour le sous-projet 2 :** les clés Instantly, Icypeas ou FullEnrich, et MillionVerifier.

Chaque clé se pose par `npx convex env set` ; aucune n'est écrite dans le code.

## 8. Ce que la machine ne fera jamais

- Écrire ou lancer un texte que le fondateur n'a pas validé.
- Envoyer de la prospection par Resend ou depuis `letikette.com`.
- Utiliser une donnée d'un client de Letikette (un débiteur, un montant, une facture) pour
  prospecter ou pour une statistique publique.
- Automatiser LinkedIn.
- Promettre un recouvrement, écrire « garantie », ou dire à un prospect qu'il devrait engager une
  procédure.
