# Letikette — Contexte projet

## Vision produit

Letikette est le **logiciel de recouvrement de créances B2B**. Une facture impayée ne fait aucun
bruit le jour où elle devient irrécouvrable — et c'est le seul jour où il aurait fallu agir.

Trois choses sont dues de plein droit et presque jamais réclamées, faute de savoir les calculer :
les **intérêts de retard** au taux BCE majoré de dix points (L441-10 II du code de commerce),
l'**indemnité forfaitaire de 40 €** par facture (D441-5), et le respect du **délai de
prescription**, qui varie par secteur (L110-4 : cinq ans en général, un an sur le transport, deux
sur ce qu'on fournit à un consommateur).

**On vend un logiciel qui mesure, pas du temps humain.** L'import et le rapprochement sont
automatisés ; le dirigeant ne tranche que ce qu'aucune facture ne dit.

## Ce qu'on vend

Un abonnement : import de factures (export comptable ou dépôt de fichiers), surveillance des
échéances et de la prescription, tableau des conditions que le gérant qualifie, courriers préparés
à son nom, et décompte arrêté au centime,
explicable période par période.

## ⚠️ Les trois lignes rouges

1. **Rien ne part sans que le gérant ait validé ce document.** _(Fondement relevé le 29/09/2026 :
   le décret n° 96-1112, article 1er, vise quiconque « procède au recouvrement amiable des créances
   pour le compte d'autrui », « même à titre accessoire », SANS condition de manipulation de fonds ;
   son article 4 imposerait alors à la lettre de nommer l'agent de recouvrement. Un envoi
   automatique, même sur instruction préalable, ferait porter le nom de Letikette aux courriers du
   gérant. Le logiciel RAPPELLE, il n'envoie pas.)_ Il est à son seul nom et sous sa
   signature ; Letikette le prépare sans y figurer, sans être son mandataire, sans recevoir ni fonds
   ni réponse du débiteur (le recouvrement pour compte de tiers est une activité encadrée). Quand le
   gérant a un avocat, le projet part chez cet avocat, qui décide. Rien ne part vers un tribunal ou un
   greffe depuis l’app : ce qui va devant un tribunal passe par l’avocat que le gérant choisit. Seule
   exception : la déclaration de créance au mandataire, que la loi permet au créancier de faire
   lui-même. On ne remplace aucun métier réglementé.
2. **On ne manipule jamais de fonds.** Aucun encaissement, aucun séquestre, aucune commission sur
   ce qui rentre. _(Ce qui reste permis, vérifié auprès de l'ACPR le 29/09/2026 : TRANSMETTRE une
   information de paiement — afficher l'IBAN du créancier, un montant, une référence, un QR de
   virement européen. Un service de paiement suppose d'EXÉCUTER l'opération ou d'encaisser pour un
   tiers ; montrer où payer n'en est pas un, et ne demande aucun agrément. C'est ce que fait
   `/p/<jeton>`, livrée le 30/09/2026 : le client valide le virement dans SA banque.)_
3. **Le produit montre ce que dit la loi, ce qu’il y a dans le dossier et ce que le gérant a
   répondu.** Il ne dit jamais qu’une condition est remplie, ni qu’il faudrait engager une
   procédure : ce serait une consultation juridique (relecture du 25/09/2026). Le logiciel lit,
   calcule et montre ; le gérant qualifie, choisit et signe. Deux tests le tiennent :
   `aucun-verdict.test.ts` et `lexique.test.ts`.

**Trois surfaces partent vers un tiers, et chacune a sa barrière.** Le corps d'un courrier
(`gabarits/`, tenu par `relance.test.ts`), le décompte en PDF (`ui/courrier-pdf.ts`, qui vide ses
métadonnées d'auteur) et la page où le client paie (`/p/<jeton>`, tenue par
`page-de-paiement.test.ts`). Aucune ne nomme ce logiciel, aucune ne menace d'une procédure, et
aucune ne fait remonter quoi que ce soit du débiteur.

Et un mot interdit : **« garantie »**. On ne garantit aucun recouvrement. On **mesure**, on
**documente**, on **alerte**. La décision d'agir reste celle du client.

## Principe anti-dérive

**On ne construit que ce que le journal de friction du terrain désigne**, chronométré. Chaque
fonctionnalité doit répondre à deux questions : quelle tâche manuelle répétée elle supprime, et ce
qu'elle change pour le dirigeant qui paie l'abonnement. Sans réponse chiffrée aux deux, on ne la
construit pas.

**Exception, décidée par le fondateur le 25/09/2026 et bornée à un chantier** : la règle est levée pour
le chantier de la page dossier (`docs/superpowers/specs/2026-09-25-page-dossier-design.md`, lots 0 à 6).
Elle s'applique de nouveau à tout le reste.

**Et l'audit du 29/09/2026** (`docs/superpowers/specs/2026-09-29-etat-des-lieux-produit.md`) porte
les chantiers A à F, commandés par le fondateur le jour même. Chaque lot y nomme le geste manuel
qu'il supprime et ce qu'il change pour le dirigeant : la règle n'est pas levée, elle est
renseignée. F, B, C, D et E sont livrés ; A attend trois comptes chez des prestataires.

**La page dossier a été refondue le 30/09/2026**
(`docs/superpowers/specs/2026-09-30-page-dossier-refonte.md`). Mesuré, sections repliées :
6 479 px → 2 335 px à 375 px, 845 → 344 mots, 27 → 17 points de décision. La frise est devenue un
rail vertical où chaque bloc pend à l'étape à laquelle il appartient ; les neuf sections repliables
sont devenues six rangées qui portent leur valeur ; ce qui bloque MONTE en tête au lieu de « ne pas
se replier » au bas d'une colonne. **Deux règles y sont désormais exécutables**
(`src/screens/__tests__/page-dossier.test.ts`) : un titre de rangée est un NOM d'au plus cinq mots,
jamais une proposition relative, et il ne porte AUCUNE glose quand il est fermé — la glose descend
dans le panneau. Le test tient aussi la ligne rouge n° 3 sous sa forme nouvelle : **le geste mis en
avant ne nomme jamais une voie de droit.**

**Et refaite le soir même sur le détail d'une commande Shop** — verdict du fondateur : « on doit
cliquer partout, il n'y a rien de clair […] Less is more ». Relevé à 393 px : vingt cibles qui ne
faisaient que QUATRE choses (« Préparer », « Préparer un courrier » et « Courriers » ouvraient le
même panneau). Désormais **chaque question a une réponse, à un seul endroit** : le montant et la date
limite pour agir ; une ligne par situation, le détail au toucher ; l'état en toutes lettres
(« Pas encore relancé »), une barre de quatre étapes nommées et **un seul bouton** ; les trois
derniers faits puis « Tout l'historique » ; et cinq rangées plus la fiche du client. 20 → 11
cibles, 341 → 113 mots, 2 544 → 1 419 px. **Une colonne à toutes les largeurs**, et l'en-tête
s'aligne sur elle (`GOUTTIERE_ENTETE`, dans `page.tsx`). Un panneau qu'un bouton ouvre n'a pas de
rangée qui le double (`PanneauDuGeste`) : ajouter un geste, c'est d'abord chercher lequel il
remplace.

**L'écran « Aujourd'hui » a suivi le même soir, sur les files d'approbation de Remote et Wise.**
Pas de grand titre ni de date en sous-titre (« on s'en fout ») : une barre collante compacte —
établissement, recherche, dépôt —, la date en petit au-dessus du montant qu'elle date, et une
seule rangée vers « Ce qui est dû ». La file est faite de rangées TOUTES pareilles (avatar, client,
deux lignes, montant et date à droite), sans aucun bouton dedans : ce qui attend une réponse porte
un point et s'ouvre dans une feuille (`FeuilleDeDecision`, qui garde les règles des trois réponses
et du motif d'écart) ; le reste mène à son dossier. Les groupes ne se replient plus
(`EnTeteDeGroupe`, partagé avec les dossiers). Retirés : l'avatar (l'onglet « Compte » y mène), le
bandeau refermable, la rangée « De quoi c'est fait » (la page « Ce qui est dû » porte tout ce
détail), l'agrégat de prescription (chaque dossier est une rangée datée) et « Les écrans de
l'ancienne version ». 29 → 16 cibles, 3 001 → 1 813 px.

**La fiche client a suivi, sur Splitwise et Revolut Business** : ce qu'il doit et sa date limite ;
UN bouton, « Lancer un dossier », qui ouvre une feuille où les factures échues sont DÉJÀ cochées (le
logiciel propose, le gérant confirme) ; ce qui est grave en une ligne ; ses dossiers et ses
factures à régler en rangées qui se LISENT (`LigneFixe` : plus une seule case dans la liste) ; puis
identité, solvabilité, paiements, documents, virement et factures réglées en rangées qui portent
leur valeur (« SIREN à trouver », « non surveillée », « règle à 45 j »). 28 → 10 cibles.

**Et l'écran Compte, sur les Réglages d'iOS, bunq et Revolut Business** : l'identité centrée
sans aucun bouton ; deux cartes de rangées groupées au lieu de dix cartes (le profil absorbe
l'affichage, les données absorbent la mesure de la file) ; la déconnexion en dernière rangée. Le
bandeau « Ce qui presse », qui redisait les valeurs des rangées, est remplacé par un POINT sur la
rangée concernée et une valeur qui dit quoi (`RangeeDepliable.attention`). 14 → 9 cibles,
179 → 40 mots, 1 896 → 955 px. Et dans toute rangée dépliable, le titre prend sa largeur
(60 % au plus) et la valeur le reste — `basis-1/2` réservait la moitié à « Équipe ».

**Puis les Dépôts, sur Fi, Revolut Business, YouTube et Expensify** (01/10/2026). Au doigt, UN
bouton « Ajouter des factures » : le sélecteur d'iOS propose déjà photo, photothèque et fichiers,
et le creux « Déposez vos fichiers ici » (un geste qu'aucun téléphone ne permet) plus le bouton
photo doublaient ce geste. À la souris, un bandeau creux d'une ligne, cliquable en entier
(`AjoutDeFichiers`). Puis « En cours » en tête, et les dépôts lus groupés par mois : à gauche ce
qui s'est passé (« 2 lignes non lues » passe avant la provenance), à droite ce qui est entré, la
date dessous. Le bilan d'un dépôt pose le nombre de factures entrées en grand (`NombreHero`), le
reste en rangées, puis « Pas entré » ligne à ligne, et la phrase qui débloque le redépôt UNE fois.
La rangée « Vos dépôts » d'Aujourd'hui MÈNE à cet écran au lieu d'en redire les bilans dans une
feuille. 973 → 758 px, 96 → 78 mots.

**Puis l'arrêt du décompte, sur Mercury, Chime, Coinbase et World App** (01/10/2026). Le total
centré avec le client et la date, ses trois postes en rangées, ce qui est laissé de côté (et ses
deux sorties de même poids), puis TROIS CASES À COCHER — ce que le logiciel ne voit pas, écrit en
affirmations (« Aucun avoir à déduire ») au lieu de trois segments à deux choix —, et UN bouton
qui porte le montant, toujours visible, inerte tant qu'il reste quelque chose : la ligne dessous
dit quoi (« Reste 1 case à cocher. »). Une case vide ne franchit rien, comme avant. Le refus en
quatre parties (D0) reste entier, à l'endroit où le produit dit non : « Si l'un de ces points est
faux » et « Ce décompte ne se calcule pas ». Le détail par facture (`LignesDuDecompte`), les
valeurs de loi et le dernier décompte arrêté sont des rangées. 2 835 → 1 412 px, 469 → 168 mots.

**Et la page où le client paie (`/p/<jeton>`), sur Square, Stripe, OKX et Airwallex**
(01/10/2026). Les initiales et le nom du créancier centrés, le reste à régler en grand avec sa
date d'arrêté, puis les coordonnées du virement dans UNE carte — une rangée chacune, la copie au
bout (`LigneCopiable`) —, le détail facture par facture plus pénalités et frais (la somme se refait
à la main), et la main rendue au créancier par deux rangées qui sortent (`mailto:`, `tel:`,
`LigneLien`). **Le code QR ne s'affiche qu'à partir de 640 px** : sur un téléphone, il occupait le
haut du virement alors qu'aucune banque ne scanne l'écran qui l'affiche. Le montant se colle
« 6373,50 », pas « 6 373,50 € ». 1 656 → 1 083 px. Au passage, `Avatar` gagne `grand` (64 px) :
`className` ne dimensionnait que l'enveloppe, et l'en-tête du compte rendait un disque de 36 px.

## ⚠️ Aucune valeur juridique n'est écrite en dur

C'est la règle la plus stricte du projet, héritée du brief de remodelage.

Toute valeur juridique — taux, délai, montant, mention — vit dans
`src/lib/verticales/recouvrement/parametres.ts`, ou dans un module de pays qu'il référence
(`pays/france/`). Chaque entrée porte sa **valeur**, sa **source**, sa **date de relevé** et
**deux booléens** :

- `verifie` — la valeur a été relevée sur une source publique citable. Suffit à **calculer** : un
  chiffre affiché se corrige. `exiger()` l'exige.
- `valideParAvocat` — un juriste a contrôlé la valeur ET son applicabilité. Suffit à **produire un
  acte** : un chiffre écrit dans une requête qui part au greffe ne se corrige pas.
  `exigerPourActe()` l'exige. **Décision du 25/09/2026** : la lettre de relance officielle,
  l'accord d'échéancier et la déclaration de créance passent sous `exiger()` et la validation du
  gérant ; la barrière reste pour tout acte adressé à un tribunal ou à un greffe.

**Ne jamais deviner un article de loi, même de mémoire.** Un numéro inventé recopié dans un
courrier au débiteur est plus dangereux qu'une source absente, parce qu'il a l'air vérifiable.
Relever sur Légifrance, citer, et recouper — les douze taux d'intérêt légal sont vérifiés contre
les planchers publiés indépendamment, ce qui attrape une faute de frappe.

Un semestre absent de la série de taux fait **lever en le nommant**, jamais extrapoler.

## Stack technique

- Frontend : React 19 + TanStack Start (Vite) + TanStack Router
- Backend : Convex (fonctions dans `src/lib/convex/`)
- Auth : Better Auth (install Convex locale)
- UI : Tailwind CSS v4 + Cladd (`@cladd-ui/react`, version epinglee a l'exact)
- IA : Claude API via actions Convex
- Facturation : Paddle · Emails : Resend · Déploiement : Vercel
- Package manager : bun · Tests : Vitest (unit) + verification visuelle au navigateur

## Architecture

- **Multi-tenant strict par `organizationId`**, SANS AUCUNE EXCEPTION. Rien n'est mutualisé entre
  clients : un débiteur, un montant et une échéance sont des données client, toujours. La purge
  RGPD est donc totale, sans exception à justifier.
- Interface **en français uniquement** (le droit applicable est français).
- **Un seul espace : `/app/*`**. Une seule verticale, donc pas de sélecteur de domaine.
- Rôles : `ORG_ADMIN`, `ORG_MEMBER`. Aucun rôle staff.
- **Téléphone d'abord**, comme une application iOS native. _(Décision du fondateur, 30/09/2026 :
  « tout est trop petit et galère à manipuler, on doit être full mobile first, comme une app native
  iOS ». Elle remplace le « tablette d'abord » d'origine — la tablette reste servie, elle n'est plus
  la cible qui tranche.)_
- **Les tailles viennent des références, et elles sont MESURÉES**
  (`docs/superpowers/specs/2026-09-30-codes-des-references.md`). Le même jour, le fondateur :
  « tous les éléments UI doivent être beaucoup plus petits ! Regarde la taille des éléments sur l'app
  Claude iOS ». Relevé sur les captures de Claude, Shop et Revolut, et calibré au navigateur (la
  taille à laquelle NOTRE police rend les mêmes chaînes à la même largeur) : le corps du texte était
  juste, **tout le reste était 20 à 50 % trop gros**. Échelle en vigueur :
  - texte — 20 / 18 / **16** (corps, et texte des boutons) / **13** (sous-ligne) / 12 / 11 ;
  - contrôles — `md` **36 px** (le courant), `lg` **44 px** (l'action principale), pastille 28 px ;
  - rembourrage de carte 16 px, écart courant 12 px, **gouttière de page 16 px** (sur `2xs`, pas
    `3xs` — elle partageait ce jeton avec 433 écarts).
    Plancher tactile : **44 pt** (Apple) pour les rangées et l'action principale ; un contrôle
    secondaire compact peut faire 36 px, comme chez Claude, Revolut et Shop.
    `src/ui/__tests__/plancher-tactile.test.ts` refuse un `h-auto` sans `min-h-`, et tient le corps et
    la sous-ligne dans une FOURCHETTE — ni la légende, ni au-dessus de ce que rendent les références.
- **Contre les « milliards de zones cliquables »** (même relevé) : une rangée de CONTENU ne porte
  pas de chevron (`genre="contenu"`) — le chevron se réserve à la navigation, comme chez Shop ; le
  filtrage d'une liste est une FEUILLE ouverte par UN bouton rond, pas une rangée d'onglets ; une
  action d'en-tête est du TEXTE (`BoutonTexte`, le « Sélectionner » de Mail) ; un seul bouton plein
  par écran ; une liste longue se groupe, et chaque en-tête porte son compte et son total.
- **Une seule barre compacte, collante, sur TOUT le produit — et plus aucun grand titre.**
  (Décision du fondateur, 30/09/2026 : « fais la même barre compacte partout, less is more ».)
  Relevée sur les applications de notre métier (Revolut Business, Splitwise, bunq — voir
  `2026-09-30-codes-des-references.md`) : un onglet qui a des ACTIONS les met dans la barre, la
  recherche en tête (Aujourd'hui, Dossiers, Clients) ; un écran sans action y écrit son nom en
  petit, centré (Compte, Dépôts) ; une page poussée y pose un retour ROND et son nom centré
  (`PageHeader`, `EnteteDetail`). 64 px au lieu de 162. **Le titre reste publié** même quand il ne
  s'affiche pas : il nomme le retour de la page suivante. Le dégagement du haut suit la zone de
  l'horloge (`safe-area-inset-top`). Le montant principal d'un écran est centré dessous.
- **Sous 1024 px, un panneau se PRÉSENTE ; au-dessus, il se déplie.** Déplier deux mille pixels au
  milieu d'un défilement fait perdre sa place et oblige à remonter pour refermer : aucune
  application iOS ne le fait. `SectionDepliable` et `RangeeDepliable` rendent donc une **feuille**
  (`Popup`) en dessous de 1024 px et un panneau au-dessus, sur le MÊME état — `useSectionOuverte`.
  C'est la règle d'Apple elle-même (_Layout_) : même fonction, présentation adaptée à la place.
- **Le langage de tout le monde** : « votre client », « pénalités de retard », « date limite pour
  agir en justice » ; le mot du droit en second, entre parenthèses ou entre guillemets
  (`lexique.ts`). Le balayage couvre depuis le 29/09/2026 `src/ui`, `src/screens`,
  `src/routes/app`, `src/routes/-salle`, `src/app`, `src/marketing` ET `src/lib/verticales`.
  Gardent le mot du droit, chacun pour une raison écrite dans le test : le référentiel et
  `pays/`, `gabarits/`, `piece.ts`, `dossier.ts`, `relance.ts` (documents transmis),
  `termes-juridiques.ts` (la donnée elle-même), le prompt système et les motifs de refus du
  compagnon, et les lecteurs de formats comptables.

### Socle et verticales — la frontière est un test, pas une convention

Depuis le remodelage (voir `/docs/remodelage/`), le code se lit en trois zones :

- **`src/lib/socle/`** — le moteur. Ingestion multi-format, extraction ligne à ligne,
  normalisation de libellés, dédoublonnage, rapprochement, reprise et coût des appels modèle.
  **Il ne sait pas quelle loi il sert.**
- **`src/lib/verticales/<domaine>/`** — le référentiel, les règles de qualification, les calculs
  du domaine et ses formats de sortie. Seul `recouvrement/` existe ; `egalim/` a été retiré le
  3 septembre 2026. La frontière est maintenue quand même : elle a coûté peu et elle rend une
  seconde verticale possible sans rien défaire.
- **`src/lib/convex/`** — les `query` / `mutation` / `action`, et rien d'autre. La logique
  pure vit hors de ce dossier, ce qui la rend testable sans harnais de plateforme.

**Règle exécutable** : `src/lib/socle/__tests__/frontiere.test.ts` échoue si un fichier du socle
importe `verticales/` ou `convex/`. L'inverse est libre et voulu.

Un verrou d'empreinte protège le prompt système d'extraction : il part avec `cache_control`
`ephemeral`, et le cache Claude ne sert que sur un préfixe identique à l'octet. Un reformatage
innocent multiplie le coût par document sans qu'aucun autre test ne tombe.

## Auditabilité — non négociable

- **Tout montant réclamé est décomposable.** Un décompte porte ses SEGMENTS : quel principal, quel
  taux, sur combien de jours, sur quelle base annuelle. Un total qu'on ne peut pas décomposer est
  un chiffre qu'on demande de croire ; décomposé, il se refait à la main — ce que fera le débiteur
  qui le conteste.
- **Un décompte arrêté est figé, définitivement.** Rejouer produit un NOUVEAU décompte daté. La
  question n'est pas « combien réclame-t-on aujourd'hui » mais « qu'a-t-on réclamé le jour où on
  l'a réclamé ».
- **Les montants sont des entiers de centimes**, en `bigint` côté logique (`socle/montants.ts`) et
  en `v.int64()` côté Convex. Jamais un flottant, du parseur jusqu'à l'écran. La seule division
  arrondie de toute la chaîne est explicite, une par segment.
- **Le doute ne profite jamais au produit.** Un critère indéterminé compte comme absent, jamais
  comme acquis. L'absence de contestation CONNUE n'est pas une absence de contestation.
- **Un acte ne se produit pas sur un décompte incomplet.** `controle.ts` compare la créance à
  toutes les factures connues du débiteur et CHIFFRE ce qui serait abandonné. C'est le seul endroit
  du produit où un refus vaut mieux qu'un résultat : le titre exécutoire ne porte que sur les
  sommes qu'il chiffre, et ce qui n'y figure pas est perdu.
- **Ce que le logiciel ne voit pas s'affiche aussi.** La surveillance déclare ses hypothèses (un
  secteur indéterminé fait retenir le délai de prescription le plus court) et ses angles morts. Un
  utilisateur qui croit sa prescription surveillée ne la surveille pas lui-même.

## Le systeme visuel, et ce qui l'empeche de deriver

L'interface precedente a ete jugee « AI slop » sur quatre plans a la fois :
composition des ecrans, aspect des composants, absence d'identite, parcours.
Trois barrieres l'empechent de revenir, et elles sont cumulatives.

**1. Le kit.** Cladd fournit les controles. On n'en forke aucun, et surtout **on
n'en reinvente aucun** : un `<div>` avec `bg`, `border` et `rounded` est un
`Surface` ; une rangee de boutons est un `Toolbar` ; un choix unique est un
`Segmented` ; un choix multiple un `ToggleGroup` ; une liste verticale une
`List` avec des `ListButton` ; un intitule de section un `SectionTitle`. Les
comportements contextuels (taille propagee, chip qui s'ajuste a sa rangee,
profondeur de surface) n'existent QUE si le vrai composant est dans l'arbre.

**Source de verite : le serveur MCP de Cladd** (`https://cladd.io/mcp`).
`list_components` pour l'inventaire, `get_component` pour les props, et
`get_foundation` pour `quickstart`, `surfaces`, `colors`, `sizing` et surtout
`pitfalls`. **Lire `pitfalls` avant d'ecrire du Cladd non trivial.** Ne jamais
reconstituer l'API en lisant le code compile : c'est comme ca qu'on reinvente.

**L'echelle.** Cladd est dense (son `md` vaut 28px) ; ce produit est tactile
avec un plancher de 48px. On ne force PAS `size="lg"` partout — la doc
l'interdit (« Don't default to `lg` everywhere », « When in doubt, `md` »).
On decale l'echelle dans `src/styles/tokens.css` pour que `md` tombe sur 48px,
puis on suit les conventions du kit a la lettre. Les trois blocs `@theme`
(espacement, typographie, rayons) se modifient ENSEMBLE : les numerateurs de
rayon sont ecrits en dur sur la base `md`. Nos propres tokens vivent hors de
l'espace de noms `cladd-*`, que la doc interdit d'etendre.

**2. La museliere.** `src/ui/**` est la SEULE zone ou des classes Tailwind
s'ecrivent. Ailleurs, `bun run lint` refuse les valeurs arbitraires (`-[...]`),
les couleurs litterales et les tailles de police hors echelle. Ce n'est pas une
convention, c'est un echec de build.

**3. Le regard.** Chaque ecran s'ouvre dans le navigateur integre aux quatre
largeurs de reference (375, 768, 1024, 1280) AVANT d'etre declare fini. La route
`/showroom`, en developpement uniquement, rend chaque ecran avec des donnees de
demonstration sans backend ni authentification, precisement pour ca.

**Regles d'ecran**, courtes et opposables :

1. **Le logiciel decide, le gerant confirme.** Aucun ecran ne demande une saisie
   que le logiciel peut deduire. Un champ vide qu'il aurait pu remplir est un defaut.
   Exception : pour une qualification juridique, le gerant qualifie, le logiciel documente.
2. **Tout traitement se voit sans qu'on le demande.** Lecture en cours, echec,
   progression : chaque etat s'affiche de lui-meme, sans rechargement.
3. **Deux volets au-dela de 1024px** sur tout ecran de travail : liste a gauche,
   preuve a droite. En dessous, la liste seule et la preuve en feuille.
4. **Le vide montre le chemin**, jamais des cadrans a zero.
5. **Le mot « garantie » est interdit**, et un test balaie toute l'interface.

**Couleurs reservees.** Le vert, le rouge et l'ambre (`--color-seuil-*`, plus les accents
`green`, `lime`, `yellow`, `red` et l'`orange` du bandeau d'alerte) ne signifient qu'une chose :
au-dessus du seuil, tout pres, en dessous. Aucun element decoratif ne les porte. C'est pour ca que
l'accent de marque est un bleu d'encre et jamais un vert.

**Et six familles portent la couleur, depuis le 30/09/2026** (`src/ui/familles.tsx`). La regle qui
les rend possibles tient en une ligne : **la teinte dit DE QUOI il s'agit, jamais si c'est grave.**
De l'argent (`brand`), du temps (`purple`), des papiers (`cyan`), ce qui part (`blue`), ce qu'on
vous demande (`pink`), la machine (`neutral`) — six, prises hors des teintes de seuil, et chacune
donne a sa rangee un pictogramme du domaine dans une vignette de 40 px. Un client, lui, porte son
AVATAR : dans une liste de clients toutes les rangees sont de meme nature, donc une vignette les
peindrait toutes pareil et ne distinguerait rien.

_Pourquoi ce changement : l'ecran des dossiers portait SIX pictogrammes en tout, celui des clients
DEUX, et la carte de verre rendait un contraste de 1,09 pour 1 avec la page. Le produit se LISAIT
quand Shop et Revolut se BALAIENT — verdict du terrain : « ca manque d'intuitivite a mort partout,
je ne sais pas ce qui cloche mais ca cloche »._ Tenu par `src/ui/__tests__/familles.test.ts`, qui
refuse une teinte de seuil dans le registre ET une teinte forcee par un ecran.

## Conventions

- TypeScript strict, pas de `any`
- Composants React 19. Pas de `setState` dans un effet : on derive au rendu, ou on remet a zero avec une `key`
- Convex : `query` pour lire, `mutation` pour écrire, `action` pour les appels externes
- Composants PascalCase · fonctions Convex camelCase · routes kebab-case · tables au pluriel
- Pas de `console.log` en production
- Commits : `git commit --no-verify` (les hooks pre-commit dépassent 2 minutes)

### Le piège Convex qui casse TOUS les écrans d'un coup

Une fonction Convex qui appelle `internal.<son propre module>.<autre fonction>` crée un cycle
d'inférence : le type de `internal` contient celui du handler, qui dépend de `internal`.
TypeScript renonce et retombe sur `any` — et cet `any` remonte dans le type de `api` **tout
entier**, faisant perdre l'inférence à tous les écrans, y compris ceux d'une autre verticale.

Le symptôme est trompeur : des dizaines de `TS7006 implicitly has an 'any' type` apparaissent
dans des fichiers qui n'ont pas été touchés. Chercher la cause dans le dernier module Convex
écrit, pas dans les fichiers qui se plaignent.

**Le remède** : annoter explicitement le type de retour du handler.

```ts
handler: async (ctx, args): Promise<Id<'creances'>> => { … }
```

## Règles pour les subagents

Les agents custom dans `.claude/agents/*.md` tournent en mode « text generation only » : leurs tool
calls ne sont **pas** exécutés. L'agent `general-purpose` intégré, lui, exécute normalement.

## Liens utiles

- **⭐ Le blueprint** : `/docs/blueprint/` — la direction du projet, d'aujourd'hui à cinq ans.
  `00-MANIFESTE.md` est le document de référence ; `01-FRONTIERE-MVP.md` dit ce qui est dans le MVP
  et ce qui n'y est pas ; `02-ROADMAP.md` porte les jalons et les murs. Les annexes couvrent le
  business, le produit et la technique, le marketing, et le juridique.
  **En cas de doute sur ce qu'on construit et pourquoi, c'est là qu'on va.**
- **Le remodelage vers le recouvrement** : `/docs/remodelage/` — le brief, l'audit du code
  d'origine, l'architecture socle/verticales, et l'état d'avancement.
- Gabarits extraits de Fleet : `/docs/superpowers/references/`

Les documents `/docs/agri/` décrivent le modèle EGalim, retiré du produit le 3 septembre 2026.
Ils restent au dépôt comme archive : ils portent le raisonnement qui a mené au pivot, pas la
direction actuelle.

Ce projet utilise [Convex](https://convex.dev). Lire
`src/lib/convex/_generated/ai/guidelines.md` avant tout travail sur le backend.
