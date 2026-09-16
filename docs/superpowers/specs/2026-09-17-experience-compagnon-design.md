# Spec : l'expérience et le compagnon

Statut : direction écrite le 17 septembre 2026, à ratifier par Jules avant tout plan.
Chantier 3 sur 3. Le chantier 2 (la charpente de navigation) est livré : voir
`docs/superpowers/specs/2026-09-14-charpente-navigation-design.md`. Il se concluait sur une phrase
qui annonçait celui-ci : « ce chantier-ci rend les écrans visibles tels qu'ils sont, le suivant
corrige ce qu'on y voit ». Jules a regardé, et ce qu'il a vu est le point de départ de cette spec.

---

## 0. En une phrase

**Le produit cesse d'être un arbre de vingt-sept adresses et devient une file de travail, écrite
par un compagnon qui a déjà tout lu.** Une rangée nomme son obstacle en une phrase et porte son
geste ; elle s'ouvre en place, dans le volet de preuve, jamais vers un écran de plus. Rien de ce
qui engage ne disparaît : ce qui disparaît, ce sont les dix-sept champs sur vingt-six qu'on fait
remplir alors qu'une source du dépôt y répond, et les vingt-trois adresses qu'il fallait apprendre.

---

## 1. Ce que le gérant vient faire, et le temps qu'il a

Il fait trois choses, et rien d'autre.

1. **Voir ce qu'on lui doit.** Une fois par semaine, en deux minutes, entre deux chantiers, sur une
   tablette tenue à une main.
2. **Décider ce qu'il réclame.** Quelques minutes par client, quand il s'y met, et il ne s'y met
   que s'il voit d'avance combien de temps ça lui prend.
3. **Sortir une pièce.** Rarement, et c'est la seule fois où il accepte de s'asseoir, parce que
   c'est le moment où le produit lui rend quelque chose d'opposable.

Ce qu'il n'est jamais venu faire : apprendre une carte du domaine juridique, choisir un secteur
d'activité dans une liste de sept, retaper un taux que ses propres conditions générales stipulent,
ou remplir un profil pour débloquer un chiffre. Il ne connaît ni le taux BCE majoré de dix points,
ni l'indemnité de quarante euros, ni le fait qu'une créance de transport se prescrit par un an.
C'est exactement ce qu'il paie pour ne pas avoir à savoir, et c'est pour ça qu'un champ de
conversation vide lui demandant ce qu'il veut savoir est un impôt, pas un service.

**Le temps qu'il a, chiffré :** deux minutes pour le coup d'oeil hebdomadaire, cinq minutes par
session de travail, une demi-heure la seule fois où il produit une pièce. Toute fonctionnalité qui
suppose plus que ça suppose un utilisateur qui n'existe pas.

---

## 2. Ce que le produit demande aujourd'hui, mesuré

Le grief de Jules se mesure, mais pas là où on l'attend.

**Le produit ne fait pas trop SAISIR. Il fait trop NAVIGUER.** Trente-deux contrôles de saisie dans
tout le produit, et les deux parcours les plus longs se font entièrement au doigt, sans clavier.
En face : vingt-sept adresses sous `/app` pour quatre onglets, environ vingt-trois cibles tactiles
simultanées sur le seul accueil dont huit de chrome permanent, et vingt-quatre racines de feuilles
empilables réparties dans six fichiers (relevé : `choix-intervenant` 3, `feuille-voie` 5,
`palette-recherche` 5, `recherche-avocat` 4, `recherche-commissaire` 3, `analyses/procedure` 4).

**Le déséquilibre est net.** Douze écrans sur vingt-sept (44 %) et 3 334 lignes sur 8 660 (38,5 %
du code d'écran) servent une mise en route faite UNE FOIS. Cinq écrans portent le travail
quotidien.

**Constituer une créance coûte 13 à 17 appuis sur 5 surfaces** dans le cas favorable, et 16 à 20
quand le débiteur n'a ni SIREN ni secteur. Dont 6 à 10 appuis passés à répondre par oui ou non à
six questions posées une par une, chacune remontant le composant.

**Dix-sept champs sur vingt-six ont une source déjà présente au dépôt, et sont demandés quand
même.** Six d'entre eux ont leur réponse déjà DANS la main du produit, jetée avant d'arriver en
base. Trois sont des orphelins prouvés : `debiteurs.adresse` (déclarée au schéma, jamais écrite,
jamais lue), `tauxRetardPourcent` et `receptionSignee` (extraits par le modèle dans
`import/preuve.ts` aux lignes 102 et 86, écrits nulle part).

**La prescription n'a aucun écran sur vingt-sept.** C'est le seul des trois arguments de vente qui
fasse PERDRE un droit sans qu'on ait rien fait. Elle n'existe qu'en puce sous chaque facture, au
fond d'un volet sans adresse, et en notification plafonnée à trois lignes par
`MODE_COMPACT = { limite: 3, versDetail: '/app/revelation' }` (`accueil.tsx:164`). Le lien
« Voir N autres » mène à `/app/revelation`, qui ne rend pas le flux : au-delà de la troisième
alerte, les événements 4 à N ne sont atteignables NULLE PART dans l'application. Balayer un
portefeuille de quarante débiteurs à la main coûte quatre-vingts gestes, et aucun écran n'agrège.

**La révélation est inerte.** `vRevelation.lignes` porte `reference`, `principalRestantDu`,
`interets`, `indemniteForfaitaire`, `supplement`. Aucun identifiant de débiteur, aucune
dénomination, aucune cible tactile. L'argument de vente du produit est un mur de cartes sans nom
de client sur lesquelles rien ne s'appuie.

**Le score de solidité ne peut pas franchir son seuil.** `SEUIL_QUALIFICATION` vaut 0,75
(`scoring.ts:158`), les quatre conditions légales pèsent 12 points sur 20 : un document de fond est
obligatoire, et aucune ligne de l'écran qui affiche le score ne le dit. Le gérant répond, la note
ne bouge pas, il conclut que le logiciel ne veut pas de son dossier.

**Il n'y a aucun compagnon, et aucune prise de courant pour en brancher un.** Zéro composant
conversationnel dans `src/ui` et `src/screens`. Le seul usage de modèle est l'extraction
documentaire côté serveur. `src/lib/convex/utils/chatModel.ts` est du code mort hérité de Fleet :
son commentaire décrit « l'assistant de chat IA (`aiChat/agent.ts`) » et « l'agent de support Kai
(`support/agent.ts`) », deux modules qui n'existent plus, et il épingle
`google/gemma-4-26b-a4b-it`, un modèle OpenRouter étranger à la stack déclarée. C'est aujourd'hui
le seul endroit du dépôt qui parle d'un compagnon, et il ne décrit rien qui existe.

**Le veilleur est l'embryon, et il ne parle que dans un sens.** `src/ui/veilleur.tsx`, 485 lignes,
porte déjà le bon ton : un constat daté, sa raison mot pour mot, jamais une consigne. Rien ne
permet de lui répondre, ni de lui demander pourquoi, ni d'accepter ce qu'il propose, parce qu'il ne
propose rien.

**Ce qui marche déjà, et qu'aucune simplification n'a le droit de casser :** le parcours 1 tient en
un geste ; le montant est décomposable en segments ; les hypothèses et les angles morts
s'affichent ; l'écran de procédure énumère les voies sans jamais en classer une. Ces quatre
propriétés sont la raison d'être du produit, pas son surpoids.

---

## 3. Le jugement des trois thèses

Trois propositions concurrentes ont été instruites. Elles convergent sur le diagnostic et divergent
sur ce qui porte le produit.

### 3.1 Ce qu'on retient : le compagnon ÉCRIT LA FILE

**Thèse retenue : « un seul flux, et rien d'autre ».** Sa formulation centrale est la seule qui
réponde aux deux demandes de Jules en même temps (un flux fluide, ET un compagnon présent en
permanence) sans les opposer : *le compagnon ne vit pas à côté de la liste, il est ce qui la
produit.* Chaque rangée est un constat daté qu'il pose, avec son obstacle nommé au singulier, sa
source citée et le geste qui le lève. La conversation est le second geste, jamais le premier écran.

C'est aussi la seule thèse dont la mise en oeuvre ne crée pas de dépendance nouvelle. Les rangées
sortent de modules déterministes déjà écrits et déjà testés : `surveillance.ts` trie et produit les
événements, `briefing.ts` décide de parler ou de se taire, `controle.ts` chiffre ce qui serait
abandonné, `decompte.ts` segmente, `lettrage.ts` rapproche au centime, `litige.ts` sait quelles
questions restent. Le compagnon n'invente pas ce qu'il dit : il rend visible ce que le produit
calcule déjà et n'affiche nulle part.

### 3.2 Ce qu'on refuse à la thèse 2 (« le compagnon d'abord »)

**Écarté : le fil de conversation comme écran principal, en colonne de gauche.** Trois raisons, et
la thèse 2 en nomme elle-même deux.

- **Elle fait du modèle le chemin unique**, puis se rétracte dans son propre risque n° 2 en posant
  que « le fil doit se rendre sans aucun appel modèle ». Une fois cette contrainte acceptée, le fil
  est produit par du code déterministe, et la thèse ne s'appelle plus « compagnon d'abord » : elle
  s'appelle « la file d'abord, écrite par le compagnon ». C'est la thèse 1, avec un nom qui ment
  sur la dépendance.
- **Elle déplace la liste.** Mettre le fil à gauche met la preuve à droite, et il ne reste plus de
  place pour la liste. Or c'est la liste qui se travaille au doigt.
- **Elle appelle un clavier sur un produit tablette.** Son risque n° 8 l'écrit : « on aura remplacé
  32 contrôles de saisie par un seul, plus gros et plus exigeant, le contraire exact de la
  demande ». Le terrain mesuré confirme que le clavier n'est pas le problème du produit.

**Greffé de la thèse 2, en revanche, et c'est ce qu'elle a de meilleur :**

- **La contrainte « le fil se rend sans aucun appel modèle »**, promue en barrière exécutable
  (§ 8, B1). C'est elle qui sauve la file d'être un point de panne unique.
- **Le journal unique**, où se mêlent ce que la machine a fait et ce que l'humain a dit, avec
  l'état avant et après. C'est le seul point d'entrée possible d'une contestation reçue hors du
  logiciel, sans lequel la règle « l'absence de contestation CONNUE n'est pas une absence de
  contestation » n'a aucune prise dans le produit.
- **La conséquence de livraison** : tant que la barrière sur la sortie du modèle n'existe pas, le
  champ de saisie libre ne s'ouvre pas. On livre les propositions d'abord, la conversation ensuite.
- **Le fait mesuré à dire tout haut** : les quinze paramètres de `parametres.ts` portent
  `valideParAvocat: false` (relevé : 15 occurrences `false`, 0 `true`, 12 `verifie: true`). Donc
  `exigerPourActe()` refuse partout aujourd'hui, et le compagnon le nommera tous les jours.

### 3.3 Ce qu'on refuse à la thèse 3 (« trois gestes, trois écrans »)

**Écarté : le compagnon cantonné à une rangée d'accueil.** La thèse 3 le pose en « surcouche sur
une liste qui existe », ce qui est juste, mais elle le confine à trois surfaces dont la principale
est une rangée « Le veilleur a trouvé 4 choses, Relire ». C'est le veilleur actuel en un peu mieux,
et ça ne répond pas à « un compagnon en permanence qui suggère ». Dans la thèse retenue, le
compagnon n'a pas de rangée à lui : il a TOUTES les rangées.

**Greffé de la thèse 3, et c'est elle qui apporte le meilleur cadrage :**

- **Le diagnostic « trop naviguer, pas trop saisir »**, qui fonde toute la spec (§ 2).
- **L'arrêt du décompte comme seul écran plein cadre**, avec son pré-vol en deux étages : le
  contrôle de complétude chiffré, puis trois choses à écarter en un tap.
- **Les deux nombres en tête de file** plutôt qu'un seul, et la disparition des quatre totaux
  distincts affichés à deux gestes les uns des autres.
- **La réserve sur l'échéance** : le libellé nomme le FAIT et sa date (« Prescription dans 41
  jours, passé le 27/10/2026 cette créance ne se réclame plus »), jamais l'émotion.
- **Le risque qu'elle est seule à formuler**, et qui devient une question à Jules (§ 10, Q1) : la
  file est triée par `surveillance.ts`, c'est-à-dire par une règle de domaine. Si ce n'est pas
  l'ordre dans lequel un gérant pense son portefeuille (par client, le plus souvent), on aura
  remplacé une carte du droit par une autre, plus courte mais tout aussi étrangère.

### 3.4 Les décisions, numérotées

**D1. Une seule route de travail, `/app`.** Raison : la profondeur mesurée ne vient pas des routes
(le graphe est plat, maximum 3 depuis un onglet) mais de ce qui s'y ajoute, deux volets sans
adresse et vingt-quatre racines de feuilles. Une file ne peut pas empiler, parce qu'elle n'a nulle
part où aller.

**D2. Vingt-sept adresses deviennent quatre, pas trois.** Raison : la thèse 1 annonce trois et en
décrit quatre. Un décompte arrêté est figé, daté, imprimé et lu par un tiers qui refera le calcul à
la main : il lui faut une adresse citable, et le geste qui le produit a besoin d'un plein cadre.
Annoncer trois en en livrant quatre serait la même malhonnêteté que le lien « Voir N autres » qui
mène là où le flux n'est pas.

**D3. Le compagnon écrit la file, et n'a pas de surface à lui.** Raison : un point d'entrée sans
mission enseigne à ignorer l'icône, après quoi la vraie alerte passe inaperçue.

**D4. La file se rend sans aucun appel modèle.** Raison : sinon un quota épuisé ou une action
Convex en panne rend le produit inutilisable, et la seule route de travail devient le seul point de
panne.

**D5. Rien de ce qui engage ne disparaît de l'écran.** Raison : les segments, les hypothèses, les
angles morts et la source datée de chaque valeur juridique ne sont pas ce qui alourdit le parcours.
Ce sont des AFFICHAGES, et ils coûtent zéro navigation dès qu'ils se déplient là où le chiffre
s'affiche.

**D6. Aucun geste de lot sur une qualification juridique ni sur un arrêt de décompte.** Raison :
deux des trois thèses se contredisent sur ce point, en proposant un verbe de lot « Tout qualifier »
sur un en-tête de section tout en interdisant le lot sur une qualification dans leur contrat de
compagnon. On tranche : le lot n'existe que sur de l'homogène, du réversible et du non engageant
(rapprochement de règlements, normalisation de libellés), et le bouton porte toujours son compte,
« Retenir les 9 » et jamais « Tout accepter » nu.

**D7. Aucun cran d'autonomie réglable.** Raison : le plafond n'est pas un goût d'utilisateur, c'est
une frontière légale. Un curseur qui monte suggère des capacités qui ne doivent jamais exister, et
il n'y a rien à régler entre « on ne relance jamais le débiteur » et autre chose.

**D8. Aucun pourcentage, nulle part.** Raison : ni score de solidité, ni confiance du modèle. Le
code porte déjà le bon vocabulaire à trois états (`ok` / `ko` / `unknown`) et la règle qui va avec,
un critère indéterminé compte comme absent. Un pourcentage invente une nuance que le droit n'a pas.

---

## 4. La forme retenue, écran par écran

### 4.1 `/app` : la file

**Ce qu'elle est.** L'unique route de travail. « Ce qui compte aujourd'hui », triée par
`surveillance.ts`, l'échéance la plus proche d'abord, la prescription en tête. C'est le tri par
défaut, donc la prescription passe de zéro écran sur vingt-sept à l'écran d'accueil.

**En tête, deux nombres et pas quatre.** « Ce qu'on vous doit » et « Dont la prescription tombe
sous 90 jours » (`PREAVIS.PRESCRIPTION = 90`, `surveillance.ts:93`). Le premier se déplie sur place
en principal, intérêts et indemnités de quarante euros, ce qui rend `/app/revelation` inutile sans
rien perdre.

**Sous les deux nombres, une rangée de puces de PORTÉE**, qui refiltrent la même liste sans jamais
ouvrir de destination, chacune avec son compte : Aujourd'hui (défaut, nommé), Prescription,
À trancher, Décomptes, Débiteurs, Engagés, Tout. La position de défilement et le volet de preuve
survivent au changement de portée, ce qu'une navigation détruit.

**Une rangée n'est pas le résumé d'un enregistrement, c'est un ÉNONCÉ DE TRAVAIL.** Elle porte le
débiteur en titre, l'obstacle en une phrase au singulier, le montant à droite, et UN verbe visible
de 48 px :

- « Fournitures Durand, 3 factures, 31 200,50 €. Prescription dans 41 jours. Un seul fait manque :
  la facture a-t-elle été contestée par écrit ? » plus Oui / Non ;
- « Décompte arrêtable, 12 480,33 € dont 1 240,33 € d'intérêts » plus Arrêter ;
- « Échéance illisible sur 3 factures Durand » plus Relever l'échéance.

**Règle opposable.** Une rangée qui ne sait pas nommer son obstacle en une phrase n'entre pas dans
la file : elle devient une section du volet de preuve. C'est cette règle qui empêche de mentir sur
les cas durs (une procédure à trois échéances concurrentes, un débiteur en redressement avec une
déclaration à date fixe, une créance solidaire entre deux débiteurs).

**Le pli.** Ce qui n'appelle aucune décision se replie en rangées comptées et typées, à leur place,
jamais dans un dossier caché : « 142 factures payées dans les délais, rien à faire ». Règle
opposable, et elle est la moitié qui protège l'auditabilité : **on replie ce qui n'a PAS
d'hypothèse retenue, jamais ce qui en a une.** Une créance dont le secteur est indéterminé, donc
dont on retient le délai le plus court, est une rangée pleine qui le dit.

**Le dépôt de fichiers vit ici.** Zone de dépôt dans l'état vide de la file, avec trois rangées
fantômes de créances plausibles estompées (jamais des cadrans à zéro, règle d'écran 4), et bouton
permanent dans la `Toolbar` quand la file est pleine. Un lot en cours est une rangée qui porte sa
progression : « Lecture, 340 / 812 factures, 4 illisibles, Arrêter », et les factures lues entrent
dans la file au fil de l'eau.

**Ce qu'elle remplace :** `/app` et ses 23 cibles, `/app/debiteurs` et son volet `?d=`,
`/app/debiteurs/$id/pieces`, `/app/debiteurs/$id/habitude`, `/app/procedures` et son volet `?p=`,
`/app/revelation`, `/app/import-factures`, `/app/import-factures/$id`, et la barre à quatre onglets
(`src/app/barre.tsx`, `const ENTREES`).

### 4.2 `/app?ligne=<id>` : le volet de preuve

**Ce qu'il est.** Un ÉTAT de la file, pas une route. À droite au-delà de 1024 px, en feuille en
dessous, exactement comme la charpente du chantier 2 le pose déjà. Il est ADRESSABLE, donc
partageable, rechargeable et mettable en signet : c'est la correction directe du défaut le plus
étrange du dépôt, l'écran le plus lourd du produit (`debiteur-detail.tsx`, 568 lignes, atteint en
deux gestes) qui n'a pas d'adresse.

**Un seul flux vertical, ordonné par ce qui engage le plus, en sections dépliables et jamais en
onglets.** Un onglet force à savoir sous quel intitulé du domaine se range ce qu'on cherche, alors
qu'on le cherchait pour une raison qui ne porte pas ce nom.

1. **Le montant, décomposé en place.** Principal, indemnité forfaitaire de quarante euros par
   facture, puis un segment par période de taux, chacun rendant ses quatre termes tels que
   `SegmentInterets` les porte : base, taux, jours, base annuelle. Un « (i) » par segment ouvre la
   fiche du paramètre telle qu'il vit dans `parametres.ts` : valeur, source, date de relevé,
   `verifie`, `valideParAvocat`.
2. **Ce qui est ACQUIS et ce qui reste À CONFIRMER**, avec le nom de ce qui manque et le geste qui
   le lève. Jamais un pourcentage (D8).
3. **« Ce que le logiciel a supposé »**, jamais replié, chaque hypothèse adossée au fait qui l'a
   produite et corrigeable en place, la correction refaisant le total sous les yeux.
4. **« Ce que le logiciel ne voit pas »**, chiffré.
5. **Les pièces**, la page exacte du PDF cadrée en regard de la valeur qu'elle fonde.
6. **Le journal unique**, où se mêlent ce que la machine a fait et ce que le gérant a dit, avec
   l'état avant et après : « Qualité passée de indéterminée à commerçant, forme SAS relevée au
   registre, BODACC du 16/09 ». C'est le SEUL point d'entrée d'une contestation reçue hors du
   logiciel.
7. **Les brouillons de courrier**, étiquetés « Visible par vous seul, non envoyé », avec pour
   seules commandes Télécharger le PDF, Copier le texte, Écarter.
8. **La conversation**, troisième position d'un `Segmented` Cladd qui bascule le volet entre Pièce,
   Décompte et Conversation (§ 5).

**Ce qu'il remplace :** `/app/creance/$id` et ses six analyses (`decompte`, `litige`, `risques`,
`solidite`, `relances`, `procedure`), les deux volets sans adresse `?d=` et `?p=`, et les
vingt-quatre racines `Popup` en tant que pile. Une feuille reste légitime sous 1024 px ; empiler
trois feuilles par-dessus une route de profondeur 2 n'a plus de place.

**Conséquence à assumer publiquement : le volet de preuve sera RICHE.** La complexité du domaine ne
disparaît pas, elle se déplace. On supprime la navigation, pas le droit. Prétendre l'inverse nous
ramènerait dans six mois à des onglets dans le volet, et pour de bonnes raisons.

### 4.3 `/app/arret/$id` : le seul écran plein cadre

**Ce qu'il est.** Le seul geste irréversible du produit mérite le seul écran qui recouvre tout, et
c'est le seul endroit de la refonte où l'on AJOUTE un geste au parcours.

**Premier étage, le contrôle de complétude.** `controle.ts` est écrit, testé, se décrit lui-même
comme « le seul endroit du produit où un refus vaut mieux qu'un résultat », et n'a AUCUNE surface
aujourd'hui. Il en obtient une :

> « Ce décompte ne porte pas 2 factures connues de Dupont SAS : F-2023-908, 740,00 € ; F-2024-021,
> 500,00 €. 1 240,00 € ne seraient pas réclamés, et ce qui ne figure pas au titre est perdu. »

Deux sorties de même poids : les inclure et refaire le décompte, ou arrêter sans elles et
l'inscrire au journal.

**Deuxième étage, le pré-vol.** Trois choses à écarter, chacune répondable en un tap : un avoir non
rapproché, un règlement partiel non importé, une contestation reçue hors du logiciel.

**Troisième étage, le bouton**, qui porte son montant, sa date et son irréversibilité en toutes
lettres : « Arrêter le décompte au 16/09/2026, 3 567,40 €, définitif. Rejouer produira un nouveau
décompte daté. » Aucun « Annuler » cosmétique : un retour arrière sur ce qui ne s'annule pas est un
mensonge d'interface.

**Ce geste n'entre jamais dans un lot** (D6).

### 4.4 `/app/decompte/$id` : la pièce arrêtée

**Ce qu'elle est.** Un document, pas un état. Figée définitivement, datée, imprimée, lue par un
tiers qui refera le calcul à la main : il lui faut une adresse à elle. Une ligne par segment,
« Intérêts du 12/03 au 30/06, taux 12,25 %, 110 jours, base 365 » à gauche et « 412,08 € » à
droite, chaque valeur juridique portant son article, sa date de relevé et son état `verifie` /
`valideParAvocat`. Le journal y est en lecture seule : c'est une archive, pas une conversation.

**Elle porte aussi « Dossier à remettre à votre conseil » :** un PDF figé et daté qui reprend le
décompte segment par segment, les sources et leurs dates, les hypothèses retenues, les angles
morts, et l'énumération des voies que ces conditions ouvrent, SANS ORDRE. Pas un modèle de requête,
pas un courrier au débiteur : le dossier que l'avocat lit.

**C'est la seule concession de la refonte à « un seul flux », et on la revendique** plutôt que de
la masquer. Déplier une pièce citable dans une file produirait une pièce non citable.

### 4.5 `/app/compte` : la mise en route, à plat

**Ce qu'elle est.** Une page, quatre sections dépliées, zéro sous-route : Établissement,
Facturation, Équipe, Données. Les quatre gestes engageants (inviter un membre, exporter, supprimer
un établissement, supprimer le compte) se règlent EN LIGNE, avec la confirmation par saisie exacte
qui existe déjà (`src/ui/confirmation-par-saisie.tsx`).

**L'identité du créancier n'y figure plus comme formulaire.** Elle devient une rangée de la file,
le jour où elle bloque un chiffre, chiffrée (« sans elle, aucun décompte ne peut servir de pièce »),
et elle se lève en trois taps par le patron `retenir()` déjà écrit et testé dans
`screens/parametres/creancier.tsx`.

**Ce qu'elle remplace :** les douze écrans derrière l'avatar sans libellé visible, soit 44 % des
écrans et 3 334 lignes sur 8 660.

**Frontière déclarée.** Paddle impose son parcours de facturation, Better Auth impose le sien pour
l'invitation et la récupération. Ces deux-là ne se plieront pas à la grammaire du produit. On
l'accepte et on l'écrit (« ce qui appartient au prestataire sort de notre grammaire ») plutôt que
de réimplémenter un tunnel qu'on ne contrôle pas.

### 4.6 Le compte, honnête

Vingt-sept adresses deviennent **quatre** : `/app`, `/app/arret/$id`, `/app/decompte/$id`,
`/app/compte`. Plus un état adressable, `?ligne=<id>`. Les vingt-quatre racines `Popup` tombent à
ce qui confirme et à ce qui fige.

---

## 5. Le compagnon

### 5.1 Son rôle

**Il écrit la file.** C'est la seule formulation qui unifie « un seul flux » et « un compagnon
permanent ». Chaque rangée est un constat daté qu'il pose : l'obstacle nommé au singulier, la
source citée, le geste qui le lève. La conversation est le second geste, quand on veut savoir
pourquoi.

**Sa règle de parole existe déjà au dépôt et n'a jamais atteint l'écran.** `decider()` dans
`src/lib/verticales/recouvrement/briefing.ts:122` rend `PARLER` ou `SE_TAIRE`, et
`composerBriefing()` n'est consommé que par `battement.ts`, c'est-à-dire par une notification,
jamais par une surface. Quand il rend `SE_TAIRE`, le compagnon se tait : pas de rangée, pas de
pastille. **Un jour sans rien à dire produit une file courte, jamais une file remplie de bruit pour
prouver qu'il travaille.**

**Sa voix est celle d'un relevé**, à la première personne du logiciel : « j'ai relevé », « je n'ai
pas pu lire ». Aucun nom, aucun visage, aucun encouragement. Sur un produit dont la sortie finit
devant un greffe, une personnalité fait entendre une recommandation là où un constat a été écrit.

### 5.2 Où il vit

Trois endroits, et nulle part ailleurs.

1. **Dans les rangées de la file**, sa résidence principale. Il ne commente pas la liste, il la
   produit.
2. **Dans la troisième position du `Segmented` du volet de preuve**, à côté de Pièce et Décompte,
   sur une surface qui existait déjà et qui portait déjà la preuve. L'ouvrir ne ferme rien et ne
   coûte aucune profondeur de navigation. Quand il cite un segment, le segment se surligne dans la
   position voisine, **en teinte neutre** : le vert, le rouge et l'ambre (`--color-seuil-*`) ne
   signifient que au-dessus du seuil, tout près, en dessous, et un doute n'est pas un seuil.
3. **En feuille sous 1024 px**, exactement comme la preuve, ce qui évite d'inventer un comportement
   téléphone séparé.

Plus deux surfaces passives, non modales : un **bandeau refermable** en tête de file pour ce qui
s'est terminé pendant que le gérant était ailleurs (« 812 factures lues, 17 créances entrent dans
la surveillance, Voir »), et une **rangée unique et comptée** pour ce qu'il a trouvé cette nuit
(« Le veilleur a trouvé 4 choses, Relire »). Jamais un badge rouge réparti sur plusieurs onglets :
il n'y a plus d'onglets. L'interruption poussée reste bornée à ce que `aNotifier()`
(`briefing.ts:56`) prévoit déjà, c'est-à-dire ce qui fait perdre un droit sans qu'on ait rien fait.

**Ce qu'il n'est jamais :** une bulle flottante en coin, une étoile posée dans chaque coin, un
cinquième item de navigation, une modale qui coupe, un avatar, un écran à lui.

### 5.3 Ce qu'il propose

- **Il pose chaque rangée de la file** : un constat daté, son obstacle en une phrase, son geste à
  48 px.
- **Il PRÉ-RÉPOND aux questions dont une source existe**, et pose sa proposition SOUS la question,
  avec sa provenance : « Proposé : oui, réserve lue sur BL-2024-77, page 1. » Un tap la retient, un
  tap la refuse. **Une proposition non confirmée retombe sur `unknown`, jamais sur `ok`.**
- **Il propose la créance CONSTITUÉE** au lieu de faire cocher quatorze cases : « Fournitures
  Durand, 3 factures, 31 200,50 €, vous confirmez ? », avec ce qui en est exclu et chiffré par
  `controle.ts`.
- **Il déplie tout montant EN PLACE**, en segments, partout où il s'affiche.
- **Il DÉCLARE SES HYPOTHÈSES avant de calculer**, pas après : « secteur indéterminé sur 4
  débiteurs, je retiens le délai de prescription le plus court » ; « 2 débiteurs sans SIREN, je ne
  peux pas les surveiller ». Chaque hypothèse est adossée au fait qui l'a produite et corrigeable
  d'un tap, et la correction refait le décompte sous les yeux.
- **Il annonce son plan avant tout travail long**, en trois à cinq lignes de français simple, avec
  sa durée estimée, un « Modifier » et un « Lancer ». C'est l'endroit sobre où il dit aussi ce
  qu'il ne fera pas.
- **Il NOMME SES ÉCHECS** à leur place chronologique : « Lecture échouée, le montant TTC n'est pas
  identifiable page 2 », daté, avec son geste de reprise. Jamais escamoté, jamais deviné, jamais
  réessayé en silence.
- **Il REFUSE en le nommant** : quand une valeur juridique n'a pas passé `exiger()`, il ne chiffre
  pas le segment et dit lequel manque (« 2e semestre 2026 absent de la série, ce segment n'est pas
  chiffré »). Le refus est un résultat affichable, pas une erreur technique.
- **Il prépare des artefacts privés** : un brouillon de courrier étiqueté « Visible par vous seul,
  non envoyé », et le dossier à remettre au conseil, figé et daté.
- **Il répond dans la conversation**, borné à la portée nommée dans sa puce, avec une pastille de
  source par phrase et le changement de portée inscrit dans le fil.

### 5.4 Ce qu'il ne fait JAMAIS

1. **Il ne contacte jamais le débiteur.** Aucun composant d'envoi n'est monté dans le même
   sous-arbre qu'un projet de courrier, et aucune adresse de débiteur n'est reliée à un transport
   sortant. Une commande grisée s'active un jour par accident de code ; une commande ABSENTE ne
   s'active jamais.
2. **Il ne touche jamais à des fonds.** Aucun encaissement, aucun séquestre, aucune commission. Le
   rapprochement lit des règlements DÉJÀ arrivés dans l'export comptable ; il n'en déclenche aucun.
3. **Il ne recommande jamais une procédure.** Son catalogue de suggestions est FERMÉ : chaque puce
   commence par un verbe de constat, aucune ne commence par « Faut-il », « Que faire », « Quelle
   procédure », « Devez-vous », « Je vous conseille ». Sollicité malgré tout, il refuse en
   l'expliquant et renvoie au dossier à remettre au conseil.
4. **Il n'écrit jamais le mot « garantie »**, ni son lexique (« récupérez ce qui vous est dû »,
   « ne perdez plus un euro », « sécurisé », « maximum »).
5. **Il n'invente jamais un article de loi**, même de mémoire. Toute phrase portant une référence
   légale doit résoudre vers une entrée de `parametres.ts` ou n'est pas rendue.
6. **Il ne tranche jamais seul une qualification juridique**, et n'offre aucun lot dessus (D6).
7. **Il n'arrête jamais un décompte.** Il le prépare, chiffre le pré-vol, et s'arrête là.
8. **Il ne déroule jamais son raisonnement en prose.** C'est du théâtre d'auditabilité : ça
   ressemble à une justification et n'en est pas une, parce que ce n'est pas le calcul. On replie
   le raisonnement, on déplie le décompte.
9. **Il n'affiche jamais de pourcentage de confiance** (D8). À l'écran : « Indéterminé », la
   raison, et le geste qui lèverait le doute.
10. **Il ne s'ouvre jamais vide** et ne s'allume pas pour ne rien dire. Pas de « Comment puis-je
    vous aider ? ».
11. **Il ne dépense jamais les couleurs réservées.** `--color-seuil-*` ne disent que le seuil.

### 5.5 Comment il montre ses sources

**La citation est au grain de l'AFFIRMATION, pas de la réponse.** Chaque phrase porte sa pastille :
soit une pièce du client avec sa page (« F-2024-114, p. 1 »), soit une valeur du référentiel avec
son article, sa date de relevé et ses deux booléens (« art. L441-10 II, Légifrance, relevé le
04/01/2026 »). Un tap ouvre la pièce à la bonne page dans la position voisine du volet.

**La règle dure, celle qui distingue ce produit :** une phrase SANS pastille s'affiche visiblement
dégradée, porte la mention « non sourcé », et **ne peut jamais porter un montant**. Le compagnon a
le droit de dire qu'il ne sait pas d'où sort quelque chose ; il n'a pas le droit de le dire
silencieusement.

**Tout montant qu'il énonce est une carte reliée à son décompte**, qui déplie ses segments. Un
montant en texte libre est un défaut de rendu, pas un choix de style. Raison : un montant noyé dans
un paragraphe est un montant qu'on demande de croire ; il ne se refait pas à la main, il ne se
conteste pas, et c'est précisément ce que fera le débiteur.

### 5.6 Comment on le corrige

**La correction se fait au point de l'erreur**, jamais dans un écran de réglages : « Ce n'est pas
le bon débiteur, Corriger », et le journal note « Corrigé par vous le 16/09 ».

**Trois états, trois verbes.** Proposé (Retenir, Corriger, Écarter), Retenu (Corriger, Annuler,
Ouvrir), Écarté (replié en « 3 constats écartés », toujours annulable, jamais supprimé, parce qu'il
faudra pouvoir dire ce qu'on n'a pas retenu et quand). **Le cycle de vie de la proposition EST la
piste d'audit.**

**Pas de pouce haut ni de pouce bas, pas d'étoiles.** On ne note pas un montant : il est juste ou
faux. Le seul retour qui vaut est la correction elle-même, journalisée avec son auteur, son
horodatage et son motif, et c'est aussi le seul qui produise une trace opposable si le débiteur
conteste.

**Toute proposition retenue s'inscrit au journal avec sa source**, de sorte que le jour où le
débiteur conteste, on sait que le modèle a lu et que le gérant a confirmé.

### 5.7 Ce qu'il coûte par appel

Le barème est déjà écrit dans `src/lib/socle/modele/cout.ts` : 5 $ par million de tokens d'entrée,
25 $ par million en sortie, facteur 0,1 sur les tokens lus en cache, et un plafond dur `CAP_EUR`
de 10 € **par lot d'extraction**.

**L'ordre de grandeur d'une question de conversation**, contexte de dossier compris : environ
8 000 tokens en entrée, 600 en sortie. Soit 0,040 € plus 0,015 €, **environ 5,5 centimes par
question** sans cache. Avec un préfixe système de 3 000 tokens servi en cache, environ 4 centimes.

**Ce qu'il faut en tirer, et qui n'est pas réglé aujourd'hui :**

- **Il n'existe aucun plafond côté conversation.** `CAP_EUR` borne un lot d'extraction, pas un
  gérant bavard. Dix questions par jour ouvré font environ 200 questions par mois, soit **8 à 11 €
  par mois et par établissement**, en coût variable adossé à un prix d'abonnement fixe.
- **Le verrou d'empreinte ne protège pas la conversation.** Il protège le préfixe du prompt
  d'extraction, qui part avec `cache_control: ephemeral` (`extracteur.ts:90`) et dont le cache ne
  sert que sur un préfixe identique à l'octet. Une question de conversation porte un contexte de
  dossier différent à chaque fois : seul le préfixe système est cachable, et il faut donc le poser
  en tête, figé, et le verrouiller par empreinte comme l'autre.
- **Conséquence de conception, pas d'optimisation :** la file et les propositions ne coûtent RIEN
  (D4, elles sortent de code déterministe). Le modèle ne sert qu'à deux choses, la lecture d'un
  document déposé et la formulation d'une réponse à une question tapée. C'est ce qui rend le coût
  proportionnel à l'usage volontaire, et non au nombre d'ouvertures de l'application.
- **Un plafond mensuel par établissement est à trancher** (§ 10, Q4).

---

## 6. Les automatismes, et leur source

Chaque ligne nomme la source qui existe DÉJÀ au dépôt, et ce qu'elle supprime. Aucun automatisme de
cette liste ne repose sur une source à inventer.

| # | Ce qui n'est plus demandé | La source, au dépôt | Ce que ça supprime |
| --- | --- | --- | --- |
| A1 | **Le taux de retard stipulé** | `tauxRetardPourcent`, lu par le modèle dans les CGV déposées (`import/preuve.ts:102`, appel facturé) et déjà composé en constat affiché (`preuve.ts:206`). Il meurt parce que `consignerLectureInterne` (`convex/recouvrement/pieces.ts`) ne prend pas l'argument. | 4 à 5 frappes par débiteur, et surtout une SOUS-RÉCLAMATION, l'inverse exact de la raison d'être du produit |
| A2 | **La qualité de commerçant du débiteur** | `qualiteCommercantDeLaForme()` (`pays/france/commercialite.ts`, sourcée sur L210-1, testée, livrée aux commits `bd5ca8a` et `a4ba936`) appliquée à `debiteurs.formeJuridique`, écrite depuis le BODACC. Aujourd'hui `debiteurs.estCommercant` n'est écrit qu'une fois dans tout le dépôt, avec la valeur littérale `'unknown'` (`convex/recouvrement/import.ts:119`), et `creances.ts:288` le lit : `entreCommercants` ne peut donc JAMAIS valoir `ok`. | 1 question par créance, indéfiniment |
| A3 | **L'adresse du débiteur** | `EtablissementPropose.adresse`, rendue par le BODACC et déjà affichée sous chaque candidat. `renseignerSirenInterne` (`convex/recouvrement/debiteurs.ts:129`) ne patche que `siren` et `formeJuridique` ; `debiteurs.adresse` (`tables.ts:286`) est un orphelin complet. | Les deux paragraphes d'excuse que `RechercheCommissaire` et `RechercheAvocat` écrivent sur une prémisse fausse, et débloque le département du commissaire et le barreau |
| A4 | **La première question de litige** (la contestation écrite) | `piece.reserves`, lue sur le bon de livraison et déjà affichée par `ui/pieces.tsx`, dont le commentaire dit que la lire sans la montrer laisserait le gérant répondre non de bonne foi. | Jusqu'à 6 questions, puisqu'une réponse positive arrête le questionnaire à elle seule |
| A5 | **La signature de réception** | `receptionSignee`, extraite par `import/preuve.ts:86` (« le document porte-t-il une signature, un tampon ou une mention d'acceptation ? »), écrite nulle part. | 1 question, et débloque l'un des critères de pièces qui valent 12 points sur 20 quand le seuil est à 15 |
| A6 | **La composition d'une créance** | `creerCreance` impose déjà un seul débiteur et refuse une facture déjà rattachée ; `controle.ts` compare déjà la créance à toutes les factures connues et CHIFFRE ce qui serait abandonné. | 15 taps sur un débiteur à 14 factures, ramenés à 1 |
| A7 | **Le rapprochement d'un virement** | L'export comptable porte déjà les règlements (l'écran d'import l'écrit noir sur blanc), et `lettrage.ts` propose déjà des combinaisons au centime. Aujourd'hui `ui/lettrage.tsx` demande le montant à la frappe et la date au calendrier, rangée repliée par défaut. | Sur 30 virements groupés : 210 frappes et 150 taps deviennent 30 confirmations, groupables (seul lot légitime, D6) |
| A8 | **L'avoir réclamé** | `lettrage.ts` détecte déjà l'écart de règlement au centime près. Un client qui règle systématiquement 3 % de moins réclame un avoir : le fait est observable dans les données, pas dans la mémoire du gérant. | 1 question de litige |
| A9 | **L'instance en cours** | `convex/recouvrement/radar.ts` relève le BODACC chaque nuit et y lit les annonces de jugement. | 1 question de litige, avec une source publique, relevée et datée |
| A10 | **Les six faits de litige d'une deuxième créance chez le même client** | `creances.faitsLitige` est porté par la créance et non par le débiteur (`creances.ts:208`), ce qui fait revenir les six questions à chaque nouvelle créance. | 6 questions par créance supplémentaire. ⚠️ Garde obligatoire : la reprise est une proposition DATÉE (« vous aviez répondu le 12/09 »), elle retombe sur `unknown` passé un délai ou dès qu'une pièce la contredit, et la confirmation est datée à son tour |
| A11 | **L'identité d'un débiteur** | La recherche BODACC par nom, sans clé d'API, rend SIREN, forme juridique et adresse. Le patron `retenir()` de `screens/parametres/creancier.tsx` est écrit et testé, et appliqué à deux écrans sur trente. | 5 à 19 frappes ramenées à 3 taps. La confirmation se fait par COMPARAISON côte à côte, deux boutons de même poids. ⚠️ Tant qu'elle n'est pas confirmée, la créance reste rattachée au LIBELLÉ BRUT et pas au SIREN, et le décompte le dit |
| A12 | **L'identité du créancier** | Le même `retenir()`, déjà écrit. La qualité de commerçant du créancier ne se demande déjà plus (`bd5ca8a`, `a4ba936`) ; l'écran doit en être la conséquence visible. | 47 frappes, et le verrou le plus silencieux du produit cesse de se cacher derrière un avatar sans libellé |
| A13 | **Les échéances illisibles ne bloquent plus l'import** | L'extraction ligne à ligne du socle sait déjà nommer ce qu'elle n'a pas tranché, et `socle/modele/reprise.ts` sait reprendre. | Un import rejeté en bloc. 308 créances lues valent mieux, et les 4 illisibles deviennent 4 rangées « à trancher » portant la RAISON et la vignette de la page en regard |

**Le secteur d'activité n'est PAS dans cette liste, et c'est délibéré.** Aucune source du dépôt ne
le donne aujourd'hui : on ne l'invente donc pas, et on ne le demande pas non plus d'entrée. Le
logiciel retient le délai de prescription le PLUS COURT, l'écrit dans la rangée (« secteur
indéterminé, je retiens 1 an, art. L110-4 »), et ne demande la correction QUE le jour où cette
hypothèse fait franchir le seuil de 90 jours. **Un champ qu'aucune source ne remplit ne devient
jamais un formulaire : il devient une rangée de la file, au moment où il change un chiffre.** Le
`Select` de sept options dont « Nourriture des marins » et « Fourniture de navire » disparaît.

**Ce qui reste irréductible, et qu'on ne cherche pas à automatiser :** l'adresse e-mail d'un invité
et son rôle (ça engage), la date d'un fait de procédure (elle court depuis le fait, pas depuis la
saisie), le choix entre deux combinaisons de lettrage de même total, la saisie exacte qui confirme
une suppression, une contestation reçue hors du logiciel, et le choix d'une voie de procédure, que
le produit n'a de toute façon pas le droit de recommander.

---

## 7. Les parcours, avant et après

### Parcours A : constituer une créance jusqu'à qualification

Cas favorable : débiteur déjà identifié, 3 factures, aucune contestation.

**Avant, mesuré :** 4 routes plus 1 volet, soit **5 surfaces**, et **13 à 17 appuis**, 0 saisie
clavier. Onglet Débiteurs (1), appui sur le débiteur pour ouvrir le volet sans adresse (1), 3 cases
cochées une par une (3, `debiteur-detail.tsx:470`), « Constituer une créance » (1), rangée Litige
(1), 6 questions posées UNE À UNE (6, `ui/questionnaire-litige.tsx` rend `questions[0]` seule), 0 à
4 conditions légales. Débiteur sans SIREN ni secteur : 16 à 20 appuis.

**Après :** **1 surface, 2 appuis.** La rangée est déjà dans la file, écrite par le compagnon. Le
bon de livraison déposé porte une réserve, donc la proposition est sous la question avec sa source
(A4). Appui 1 : « C'est ça ». Appui 2 : « Retenir la créance ». Les cinq autres questions ne se
posent pas, `questionsRestantes()` les arrête déjà dès qu'une contestation est connue, et la
qualité de commerçant se déduit de la forme relevée au registre (A2).

**Gain : 5 surfaces vers 1 (moins 80 %), 13 à 17 appuis vers 2 (moins 85 %).** Sur un portefeuille
de 30 créances : 390 à 510 appuis deviennent 60.

### Parcours B : surveiller la prescription sur 40 débiteurs

C'est le parcours qui décide de la thèse, parce que c'est le seul des trois arguments de vente qui
fasse PERDRE un droit sans qu'on ait rien fait.

**Avant :** **0 écran dédié sur 27.** Balayage manuel à 2 gestes par débiteur, soit **80 gestes**,
et aucun écran n'agrège. Le seuil de 90 jours n'est rendu qu'à un seul endroit, plafonné à 3 lignes
(`accueil.tsx:164`), et les alertes 4 à N ne sont montrées nulle part.

**Après : 0 geste.** C'est le tri par défaut de la file. Il n'y a plus d'accueil à ne pas
encombrer, donc plus de plafond : la file EST l'accueil. La portée « Prescription » porte son
compte, et chaque rangée dit le fait, sa date et sa conséquence. Une créance sous hypothèse ne se
replie JAMAIS.

**Gain : 80 gestes vers 0**, et un argument de vente qui passe de zéro écran à l'écran par défaut.
C'est le plus gros écart de la refonte, et c'est aussi celui qui protège le client contre
lui-même : un utilisateur qui croit sa prescription surveillée alors qu'elle ne l'est pas est le
pire défaut possible de ce produit.

### Parcours C : arrêter un décompte et obtenir la pièce

**Avant :** **6 surfaces et 16 à 20 gestes** depuis l'accueil à froid (le parcours A est un
prérequis, pas une option), dont 3 gestes une fois arrivé. **Aucun pré-vol :** `controle.ts` existe,
sait chiffrer ce qui serait abandonné, et n'a aucun écran. Le gérant reçoit ensuite un tableau à
sept colonnes qu'il ne sait pas relire, et rien ne l'emmène vers la suite.

**Après :** **2 surfaces, 3 gestes**, dont un qui vaut de l'argent. Le total se déplie EN PLACE en
segments dans le volet de preuve. Geste 1 : « Arrêter le décompte ». Geste 2 : le PRÉ-VOL, l'écran
que `controle.ts` n'a jamais eu, avec ses deux sorties honnêtes. Geste 3 : la pièce, plus le
dossier à remettre au conseil.

**Gain : 6 surfaces vers 2, 16 à 20 gestes vers 3.** Mais le vrai gain n'est pas là : c'est qu'un
contrôle déjà écrit, qui évite une perte définitive et chiffrée, cesse d'être invisible. **Le geste
ajouté est le seul de toute la refonte qui ALLONGE un parcours, et c'est le plus défendable du
produit.**

### Agrégat : le premier mois d'un gérant

40 clients, 12 en impayé, 3 créances, 8 virements groupés.

**Avant :** environ **245 frappes et 155 taps**, dont 120 frappes et 50 taps (environ 45 %) portent
sur des champs qu'une source déjà présente au dépôt renseigne.

**Après :** environ **125 frappes et 60 taps.**

⚠️ **Honnêteté du chiffre.** Les 120 frappes et 50 taps supprimés sont MESURÉS : ce sont exactement
les champs des automatismes A1 à A13. La baisse de taps au-delà de 50 vient de la navigation
supprimée et reste une **estimation**. Elle est annoncée comme telle, et elle est la première chose
à vérifier au navigateur avec des données réelles.

---

## 8. Les barrières qui empêchent la dérive

Une barrière s'exécute, elle ne se convient pas. Chacune est un test qui échoue, sur le modèle de
`src/lib/socle/__tests__/frontiere.test.ts` et de `src/ui/__tests__/lignes-rouges.test.ts`.

**B1. La file se rend sans appel modèle.** Un test échoue si le module qui compose les rangées
importe l'extracteur ou un client de modèle. Raison : une seule route de travail est un seul point
de panne, et un flux qui affiche une page d'erreur parce que le radar BODACC n'a pas répondu serait
une régression majeure. Corollaire à respecter dans le code : la file rend les rangées qu'elle a
même quand une source lève, isolée PAR SOURCE DE RANGÉES, sur le motif déjà appliqué dans
`barre.tsx` au sélecteur d'établissement.

**B2. Le lexique interdit est balayé SUR LA SORTIE DU MODÈLE, au point d'usage.** `lignes-rouges`
balaie l'interface ; il ne balaie pas ce que le modèle vient d'écrire. Le filtre s'applique avant
rendu, sur le lexique entier (« garantie », « garanti », « assuré de », « récupérez ce qui vous est
dû », « ne perdez plus un euro », « sécurisé », « maximum »), **lève en nommant le terme trouvé, et
ne remplace jamais en silence.**

**B3. Aucune référence légale non résolue n'est rendue.** Toute phrase du compagnon portant une
référence légale doit résoudre vers une entrée de `parametres.ts`, ou la phrase n'est pas rendue.
Raison : un numéro inventé recopié dans un courrier au débiteur est plus dangereux qu'une source
absente, parce qu'il a l'air vérifiable.

**B4. Aucun montant sans pastille de source.** Un test parcourt les rendus du compagnon et échoue
si un montant apparaît en texte libre, sans carte reliée à son décompte.

**B5. Aucun bouton d'envoi dans le sous-arbre d'un brouillon.** Un test balaie `src/ui/` et échoue
si un composant d'envoi cohabite avec un objet de type projet-de-courrier. Raison : une commande
absente ne s'active jamais par accident ; une commande grisée, si.

**B6. Le catalogue de suggestions est fermé.** Un test échoue si une puce de suggestion commence
par « Faut-il », « Que faire », « Quelle procédure », « Devez-vous », « Engagez », « Je vous
conseille ».

**B7. Aucun lot sur une qualification ni sur un arrêt de décompte** (D6). Un test échoue si un
bouton de lot est monté dans le sous-arbre d'une qualification ou de l'écran d'arrêt.

**B8. Aucun pourcentage sur un critère juridique** (D8). Un test échoue sur un `%` rendu à côté
d'un état de qualification ou d'une sortie de modèle.

**B9. Le pli ne mange jamais une hypothèse.** Un test échoue si une rangée portant une hypothèse
retenue entre dans une rangée comptée.

**Les barrières existantes restent vertes :** `destinations-existent`, `aucun-ecran-orphelin`,
`fonctions-appelees`, `purge-complete`, `champs-alimentes`, `declare-jamais-alimente`,
`source-citee`, `lignes-rouges`, `frontiere`, `page-ecran`, et
`src/lib/convex/recouvrement/__tests__/tables.test.ts`.

⚠️ **Chaque tâche se vérifie par `bun run test:unit`**, pas par deux dossiers de tests. C'est la
leçon du chantier 1, rappelée au chantier 2, et elle vaut encore ici.

⚠️ **Le verrou d'empreinte du prompt d'extraction ne bouge pas**, et le prompt système du compagnon
en reçoit un à lui : il part avec `cache_control: ephemeral`, et le cache Claude ne sert que sur un
préfixe identique à l'octet. Un reformatage innocent multiplie le coût par question sans qu'aucun
autre test ne tombe.

---

## 9. Ce qu'on ne fait pas, et pourquoi

**Pas de chat plein écran, ni de porte d'entrée conversationnelle.** Raison : un champ vide transfère
au dirigeant le travail de formuler la question, et il ne connaît ni le taux, ni l'indemnité, ni le
délai. C'est ce qu'il paie pour ne pas savoir.

**Pas d'avatar, pas de nom, pas de personnalité.** Raison : une personnalité fait entendre une
recommandation là où un constat a été écrit.

**Pas de cran d'autonomie réglable** (D7).

**Pas de score de solidité en pourcentage.** Raison : il ne peut pas franchir son seuil sans pièce
et l'écran ne le dit pas. Remplacé par le fait manquant, nommé et actionnable : « il manque une
pièce de fond, un bon de commande ou un bon de livraison ». ⚠️ **C'est un pari, et il faut le dire :
la jauge est ce que le gérant REGARDE**, c'est le seul retour de progression du produit actuel. Sa
place est prise par le compteur qui décroît en tête de file, avec sa conséquence chiffrée : « 14
factures à confirmer, 12 480,00 € qui ne seraient pas réclamés ». Jamais un badge nu.

**Pas de raisonnement déroulé, pas de « j'ai réfléchi 5 secondes ».**

**Pas de balayage comme seul chemin.** Le geste principal d'une rangée est un bouton visible de
48 px : on est sur tablette, en paysage, avec la place. Le balayage reste un accélérateur.

**Pas de toast de trois secondes.** Sur une tablette en paysage, il est hors du champ visuel.
L'annulation est une pilule flottante persistante qui nomme ce qu'elle annule.

**Pas de canevas de noeuds pour régler un automatisme.** Si une règle ne se lit pas en une phrase,
elle ne doit pas exister.

**On ne redécoupe pas les modules du domaine.** Le découpage litige / risques / solidité / relances
/ procédure / décompte est un excellent découpage du DOMAINE : c'est lui qui a permis d'écrire
`litige.ts`, `solidite.ts`, `procedures.ts` séparément et de les tester. **Le code garde ces
modules ; c'est l'ÉCRAN seul qui les fond en sections.** Si on confond les deux, on refera des
écrans dans six mois, pour de bonnes raisons de code.

**On ne livre pas une moitié de file cohabitant avec une moitié d'arbre.** Raison : ce serait plus
confus que l'état actuel. Il faut basculer les cinq écrans quotidiens d'un coup, et laisser les
douze écrans de réglage vivre tels quels jusqu'à la bascule finale : ils ne gênent personne, ils
sont ouverts une fois. Corollaire de livraison : **A1 à A13 se livrent AVANT la refonte d'écran**,
parce que ce sont des arguments qui manquent à des mutations existantes, que ce sont des jours et
non des semaines, et qu'ils rapportent immédiatement.

**On ne supprime pas `chatModel.ts` plus tard.** Il part AVANT la première ligne du compagnon.
Raison : c'est le seul endroit du dépôt qui parle d'un compagnon, il ne décrit rien qui existe, et
le laisser en place pendant qu'on en construit un vrai est la meilleure façon de brancher le
mauvais modèle.

---

## 10. Les questions qui restent à Jules

**Q1. Par quoi un gérant pense-t-il son portefeuille : par échéance, ou par client ?** La file est
triée par `surveillance.ts`, c'est-à-dire par une règle de domaine. Si un gérant pense d'abord
« Durand me doit de l'argent » et non « quelque chose s'éteint le 27/10 », on aura remplacé une
carte du droit par une autre, plus courte mais tout aussi étrangère. La portée « Débiteurs » existe
pour ça, mais le DÉFAUT est un choix, et c'est le tien. **C'est la première chose à vérifier au
navigateur, aux quatre largeurs, avec des données réelles, avant d'écrire une ligne d'écran.**

**Q2. Livre-t-on le compagnon avant la validation juriste des paramètres ?** Les quinze paramètres
portent `valideParAvocat: false`, donc `exigerPourActe()` refuse partout. Un compagnon qui prépare
un dossier va buter là-dessus à chaque tour de parole et le nommer à haute voix. C'est excellent
pour l'honnêteté du produit et mauvais pour une démonstration commerciale. Deux options, et il faut
trancher explicitement : livrer le fil et assumer un refus quotidien affiché, ou faire valider les
paramètres d'abord. **Ce n'est pas un détail de calendrier : c'est ce que le gérant verra en
premier.**

**Q3. Combien de propositions par jour, au maximum ?** C'est le risque numéro un de la refonte :
quarante propositions par jour produisent quarante « Retenir » à l'aveugle et une piste d'audit qui
MENT, ce qui est strictement pire que l'état actuel où le gérant sait au moins qu'il a coché
lui-même. Le remède est un plafond, pas une meilleure mise en page. Je ne sais pas le mesurer avant
d'avoir des utilisateurs. **Proposition à ratifier : on préfère une file courte et vraie à une file
complète et fausse, et on l'assume commercialement.**

**Q4. Un plafond mensuel de conversation par établissement, et à quel niveau ?** Environ 5,5
centimes par question, aucun plafond côté conversation aujourd'hui (§ 5.7). 8 à 11 € par mois pour
un gérant bavard, en coût variable adossé à un prix fixe. Faut-il un plafond dur, un plafond mou
qui prévient, ou rien pour l'instant ?

**Q5. Le champ de saisie libre part-il dans la même livraison que la file ?** La position tenue
dans cette spec est non : les propositions d'abord, la conversation quand B2, B3 et B4 sont vertes.
Une thèse « compagnon en permanence » livrée sans sa muselière met le produit hors la loi. À
confirmer, parce que c'est ce qui décale la partie la plus visible de la demande.

**Q6. Que devient la palette de recherche du chantier 2 ?** Elle vient d'être livrée, elle porte 5
racines `Popup`, et une file avec des puces de portée recouvre une partie de son usage. Elle reste
utile pour trouver une facture par sa référence. Faut-il la garder telle quelle, ou la fondre dans
la file ? **Non tranché dans cette spec, à dessein : elle a coûté une tranche entière et elle n'a
pas encore été regardée à l'usage.**

---

## 11. Comment on saura que c'est fini

1. Depuis l'accueil, la prescription de tout le portefeuille se lit sans un geste.
2. Constituer une créance coûte deux appuis sur une surface, et zéro frappe.
3. Aucun écran ne demande un champ dont une source du dépôt porte la réponse. Un test le vérifie.
4. Arrêter un décompte passe obligatoirement par le contrôle de complétude chiffré, et la
   confirmation dit en toutes lettres que rejouer produira un nouveau décompte daté.
5. Tout montant affiché se déplie en segments là où il s'affiche, et chaque valeur juridique porte
   sa source, sa date de relevé et ses deux booléens.
6. Le compagnon se tait le jour où `decider()` rend `SE_TAIRE`, et la file est courte ce jour-là.
7. Une panne du radar, du modèle ou d'une source ne blanchit pas la file : elle rend les rangées
   qu'elle a, et nomme celle qui manque.
8. Les quatre écrans s'ouvrent dans la salle d'exposition, aux quatre largeurs de référence, dans
   chacun de leurs états.
