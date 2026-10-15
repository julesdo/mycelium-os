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
> Le premier sous-projet a sa spec : `2026-10-16-moteur-de-croissance-design.md`.

---

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
- **Le cockpit, c'est Twenty.** On y lit les sociétés, les personnes, les tâches, les notes et les
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
| **Acquisition à froid** | listes construites seules, e-mails trouvés et vérifiés, séquences, réponses rapatriées dans Twenty | API Recherche d'entreprises, Icypeas ou FullEnrich, MillionVerifier, Instantly | 2 |
| **Activation** | les e-mails de Plume selon les étapes du gérant | Resend (en place) | 1 |
| **Conversion** | une fin d'essai qui dit ce qui a été fait ; une tâche « Appeler » quand le score est haut | Resend, Twenty | 1 puis 4 |
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

**L'infrastructure :** trois domaines secondaires (jamais `letikette.com`), deux boîtes chacun,
SPF, DKIM et DMARC alignés, environ 30 envois par boîte et par jour une fois préchauffées : **3 500
à 4 000 e-mails par mois**. Le préchauffage prend trois semaines : les domaines s'achètent le
premier jour.

**Le cadre :** l'émetteur est Letikette, identifié avec ses mentions ; chaque e-mail porte un lien
de désinscription en un clic ; une liste d'opposition commune à tous les outils, tenue dans
Convex ; la source de chaque contact notée ; suppression après trois ans sans réponse ; jamais par
Resend ; les textes passent sous le lexique et le mot interdit.

### 3.3 L'activation, la conversion, l'expansion, la fidélisation

- **Activation** : les cinq e-mails de Plume du sous-projet 1.
- **Conversion** : la fin d'essai (déjà prévenue à J-7 et J-2) dit ce que le pilote a fait et ce
  qui est rentré ; au-delà d'un score de 60, une tâche « Appeler » dans Twenty.
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
| Twenty, 2 sièges à l'année | ~18 € |
| Instantly, offre avec API, à l'année | ~72 € |
| 6 boîtes d'envoi et 3 domaines | ~45 € |
| Icypeas ou FullEnrich | ~35-50 € |
| MillionVerifier | ~15 € |
| Claude (point du lundi, brouillons) | ~20 € |
| **Total de base** | **~200-220 €** |
| Societeinfo, si le site manque | +99 € |
| Publicité, en test | +300-500 € |

## 5. L'économie, en hypothèse à mesurer

3 700 e-mails par mois, 1 à 2 % de clics, 20 % d'inscription parmi eux, 20 à 25 % de passage au
payant : 2 à 4 abonnés par mois, un coût d'acquisition de 60 à 110 €, remboursé en deux à trois
mois sur Équipe. **Ce n'est pas une promesse** : le moteur mesure chaque taux dès la première
semaine, et si la prospection ne tient pas ces chiffres en six semaines, le point du lundi le dit et
le budget va au contenu.

## 6. Les cinq sous-projets

| # | Sous-projet | Contenu | Spec |
|---|---|---|---|
| 1 | **Le moteur et l'activation** | mesure des sept étages par source, e-mails de Plume, score, Twenty, expériences, point du lundi | `2026-10-16-moteur-de-croissance-design.md` |
| 2 | **La prospection automatisée** | listes, enrichissement, vérification, Instantly, opposition commune, réponses dans Twenty | à écrire |
| 3 | **La notoriété et le contenu** | outils gratuits, pages sourcées, taux semestriel, baromètre BODACC, `llms.txt`, brouillons LinkedIn, Search Console | à écrire |
| 4 | **La conversion et l'expansion** | fin d'essai, montée en gamme, passage à l'année, santé, reconquête, avis, parrainage | à écrire |
| 5 | **Les partenaires** | espace cabinet, catalogues d'applications (Pennylane, Qonto, Xero, QuickBooks), fédérations ; puis la prospection des cabinets | à écrire |

**L'ordre** : 1, puis 2 (le préchauffage tourne pendant qu'on construit 1), puis 3, 4 et 5.

## 7. Ce que le fondateur fait, et quand

**Tout de suite (le préchauffage prend trois semaines) :**

1. Acheter trois domaines secondaires proches de la marque (par exemple sur OVH ou Gandi), aucun
   n'étant `letikette.com`.
2. Ouvrir deux boîtes par domaine (Google Workspace, au prénom du fondateur), avec SPF, DKIM et
   DMARC ; chaque domaine redirige son site vers `www.letikette.com`.
3. Ouvrir un compte Instantly (offre avec API), y brancher les six boîtes et lancer le
   préchauffage.

**Pour le sous-projet 1 :** le compte Twenty et sa clé d'API ; une clé de lecture Umami ; l'adresse
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
