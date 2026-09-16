# Spec : l'expérience et le compagnon

Statut : direction écrite le 17 septembre 2026, **révisée le même jour après critique**, à ratifier
par Jules avant tout plan.
Chantier 3 sur 3. Le chantier 2 (la charpente de navigation) est livré : voir
`docs/superpowers/specs/2026-09-14-charpente-navigation-design.md`. Il se concluait sur une phrase
qui annonçait celui-ci : « ce chantier-ci rend les écrans visibles tels qu'ils sont, le suivant
corrige ce qu'on y voit ». Jules a regardé, et ce qu'il a vu est le point de départ de cette spec.

### Ce que la révision a changé, pour qu'on puisse relire dans six mois

La première écriture supprimait des surfaces sans toujours dire où passait ce qu'elles portaient, et
posait une affirmation fausse en la présentant comme un fait relevé. Ce qui a bougé :

1. **Une affirmation fausse retirée.** « `exigerPourActe()` refuse partout aujourd'hui » était faux :
   cette fonction n'a **aucun site d'appel** dans le dépôt (définition `parametres.ts:431`, trois
   commentaires, un test). Le vrai défaut est nommé à sa place : **aucun verrou de niveau acte n'est
   câblé** (§ 3.2, Q2).
2. **Sept choses supprimées ont reçu une destination écrite** : le sélecteur d'établissement, la
   déconnexion et le thème, la correction de l'identité du créancier, la date d'un fait de procédure,
   le carnet d'intervenants, le bilan d'un dépôt, l'énumération des voies.
3. **Le verrou de `surveillance.ts:374` est nommé comme un bloquant**, et non plus enjambé : toute la
   classe `CREANCE_MURE` est aujourd'hui filtrée par un seuil que la spec démontre elle-même
   infranchissable (§ 4.1, Q8).
4. **Le coût est redit en dollars**, parce que `cout.ts:13-17` déclare le barème en dollars et refuse
   explicitement d'être une facture (§ 5.7).
5. **Trois barrières de ligne rouge ont changé de nature** : B4 et B6 étaient décrites comme des
   balayages de fichiers, elles deviennent des filtres AVANT RENDU au point d'usage ; B6 balaie
   désormais le CHAMP LEXICAL de la procédure et non un préfixe de phrase (§ 8).
6. **Le tap qui emportait trois qualifications est cassé en deux confirmations** (D6, § 4.1, § 7).
7. **Les objets nouvellement persistés sont décrits**, avec leur `organizationId` et leur purge
   (§ 5.8).

### Ce que les cinq réponses de Jules ont tranché, le 17 septembre 2026

Quatre des huit questions ouvertes ont reçu leur réponse le jour même, et un principe est venu par
dessus, qui prime sur les quatre. Chacun devient une décision numérotée en § 3.4, et la question
correspondante en § 10 porte désormais la phrase de Jules en une ligne.

| Ce qui est tranché | La décision | La phrase de Jules |
| --- | --- | --- |
| Le principe, au-dessus des autres | **D0** (§ 3.4, § 3.5) | « Il ne faut jamais couper l'expérience de l'outil pour l'utilisateur et toujours trouver des solutions plutôt que de bloquer » |
| Q1, l'axe de la file | **D9** (§ 4.1) | « Il faut isoler par créance et ou par client avoir le choix de la vue quoi » |
| Q2, le calendrier du compagnon | **D10** (§ 5.9) | « Le compagnon part avant la validation du juriste en s'assurant avec les textes de lois et en veillant à utiliser le système multi juridique déjà en place » |
| Q8, le sens de « mûre » | **D11** (§ 4.1) | « Une créance mûre c'est ça oui » |
| Q7, le dossier du conseil | **D12** (§ 4.4) | « Il faut qu'on puisse suivre aussi le dossier qui passe par le conseil » |

⚠️ **D0 est le point le plus délicat de toute cette spec, et il se lit de travers en une seconde.**
« Ne jamais bloquer » ne veut PAS dire produire un acte sur des valeurs non validées, relancer un
débiteur, ni recommander une procédure. Ça veut dire qu'un refus se transforme en chemin : ce que le
logiciel peut faire tout de suite, ce qui manque, ce qui le lève, et ce que coûte l'attente.
**Un mur muet est un défaut ; un acte irrégulier est une faute.** Les trois refus qui restent, et
qui resteront, sont écrits noir sur blanc en § 3.5.

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
s'affichent ; l'écran de procédure énumère les voies sans jamais en classer une
(`screens/analyses/procedure.tsx:337`, `<SectionEcran titre="Les voies envisageables">`). Ces quatre
propriétés sont la raison d'être du produit, pas son surpoids.

⚠️ **La quatrième a failli se perdre dans la première écriture de cette spec.** Elle rangeait
l'énumération des voies parmi les propriétés intouchables, puis supprimait l'écran qui la porte, et
ne la faisait resurgir que dans un PDF produit APRÈS l'arrêt d'un décompte. Une propriété qui ne
survit qu'en aval du seul geste irréversible du produit n'est pas conservée, elle est déplacée
derrière le point de non-retour. **L'énumération est une section du volet de preuve, disponible avant
l'arrêt** (§ 4.2, section 6).

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
- **Le fait mesuré à dire tout haut, et sa correction.** Les quinze paramètres de `parametres.ts`
  portent `valideParAvocat: false` (relevé le 17/09 : 15 occurrences `false`, 0 `true`, et pour
  l'autre booléen 12 `verifie: true`, 3 `verifie: false`). La première écriture en tirait que
  « `exigerPourActe()` refuse partout aujourd'hui ». **C'était faux, et c'est la correction la plus
  importante de cette révision.** `exigerPourActe()` ne refuse nulle part, parce qu'elle n'est
  **appelée nulle part** : le dépôt n'en porte que la définition (`parametres.ts:431`), trois
  commentaires qui la citent (`parametres.ts:28`, `pays/france/commercialite.ts:38`,
  `piece.ts:19`) et son test (`__tests__/parametres.test.ts:107-111`).

  **Le vrai défaut, à nommer et à réparer : aucun verrou de niveau acte n'est câblé.** Le produit ne
  distingue aujourd'hui « calculer » de « produire un acte » qu'en commentaire. Tant que le seul
  artefact sortant est le décompte, qui vit délibérément sous `exiger()` (`piece.ts:19`), l'absence
  ne se voyait pas. **Le compagnon change ça** : il introduit un artefact neuf, le dossier à remettre
  au conseil (§ 4.4), et c'est la première fois qu'il faut trancher de quel côté de la frontière il
  tombe (Q7). Le compagnon ne « nommera pas `exigerPourActe()` tous les jours » : il ne le nommera
  que le jour où on aura câblé le premier appel.

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

**D0. On ne coupe jamais l'expérience : un refus devient un chemin.** Décidé par Jules le
17 septembre 2026 : « Il ne faut jamais couper l'expérience de l'outil pour l'utilisateur et
toujours trouver des solutions plutôt que de bloquer. » Cette décision porte le numéro zéro parce
qu'elle **prime sur toutes les autres** : quand une décision ci-dessous ferait apparaître un mur,
c'est le mur qui se réécrit, pas D0.

**Ce qu'elle exige, en quatre parties, et elles ne sont pas négociables.** Partout où le produit dit
non, il dit dans cet ordre :

1. **Ce qu'il peut faire tout de suite.** Jamais vide. Un refus dont la première ligne est vide est
   un mur, quel que soit ce qui suit.
2. **Ce qui manque**, nommé, jamais « une erreur est survenue ».
3. **Ce qui lève le manque**, énoncé au CONSTAT et jamais à l'impératif. Le produit dit « ce verrou
   se lève par le contrôle d'un juriste sur la valeur et son applicabilité » ; il ne dit pas
   « faites valider par un avocat », qui est une conduite à tenir. C'est la discipline déjà tenue
   par `comportement.ts`, qui « ne dit pas relancez », et par le constat de suspension de
   `relance.ts:160-165`, dont le commentaire écarte explicitement « déclarer la créance, saisir qui
   que ce soit » comme « une conduite à tenir, donc hors de ce que ce produit écrit ».
4. **Ce que coûte l'attente**, CHIFFRÉ quand c'est chiffrable, et déclaré non chiffrable sinon.
   Jamais tu. C'est la règle de `revelation.ts:28-29` appliquée aux refus : « un total
   silencieusement amputé est pire qu'un total incomplet annoncé ».

**Le précédent au dépôt, qui montre que ce n'est pas une nouveauté théorique.** `Relance` porte déjà
deux champs quand elle refuse, `constat` ET `blocages` (`relance.ts:121-124`), au lieu d'un message
d'erreur unique. D0 porte cette forme de deux champs à quatre, et l'applique partout (B14).

**Trois refus restent, et ils ne bougeront pas** : un acte sur des valeurs non validées, une relance
au nom du client, une recommandation de procédure. § 3.5 les écrit, dit ce que chacun protège, et
dit ce que le produit propose à la place.

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

**D8. Aucun pourcentage sur un CRITÈRE JURIDIQUE ni sur une confiance de modèle.** Raison : ni score
de solidité, ni confiance du modèle. Le code porte déjà le bon vocabulaire à trois états
(`ok` / `ko` / `unknown`) et la règle qui va avec, un critère indéterminé compte comme absent. Un
pourcentage invente une nuance que le droit n'a pas.

⚠️ **La première écriture disait « aucun pourcentage, nulle part », et se contredisait douze lignes
plus loin** : § 4.4 rend « taux 12,25 % » sur chaque segment d'intérêts, et il le faut, puisque c'est
la valeur juridique elle-même. **Un TAUX est un pourcentage légitime ; un SCORE n'en est pas un.** La
formulation exécutable est celle de B8, et D8 s'y aligne.

**D9. La file s'isole par créance OU par client, et c'est un choix de vue, pas un filtre caché.**
Tranché par Jules le 17 septembre 2026 : « Il faut isoler par créance et ou par client avoir le
choix de la vue quoi. » Raison : la file est triée par `surveillance.ts`, c'est-à-dire par une règle
de domaine, et un gérant pense souvent son portefeuille par client. Deux vues au choix coûtent un
`Segmented` de deux positions dans la `Toolbar` ; elles n'ajoutent ni écran, ni adresse, ni
profondeur. Le défaut reste **Par créance**, parce que la prescription est le seul des trois
arguments de vente qui fasse perdre un droit sans que personne n'ait rien fait, et qu'un défaut par
client l'enterrerait derrière un client qui doit peu. Détail en § 4.1.

**D10. Le compagnon part AVANT la validation juriste, et une valeur non validée ne bloque pas
l'outil : elle nomme ce qu'elle interdit.** Tranché par Jules le 17 septembre 2026 : « Oui le
compagnon part avant la validation du juriste en s'assurant avec les textes de lois et en veillant à
utiliser le système multi juridique déjà en place (partie France). » Deux conditions, et elles sont
la décision autant que le « oui » :

1. **Toute référence légale se résout par le registre.** `parametres.ts` et le module de pays qu'il
   nomme dans `resoluPar`. Une affirmation de droit sans article résolu ne se rend pas (B3).
2. **Une valeur `verifie` mais non `valideParAvocat` autorise à CALCULER, à EXPLIQUER et à
   PRÉPARER, jamais à produire un acte.** Elle ne fait pas taire le compagnon : elle lui fait
   nommer ce qu'elle interdit, dans la forme en quatre parties de D0.

Détail, formulations exactes et règle de second pays en § 5.9.

**D11. Une créance mûre, c'est toutes conditions établies et aucun bloquant. Pas un score au-dessus
d'un seuil.** Tranché par Jules le 17 septembre 2026, sur la proposition de Q8 : « Une créance mûre
c'est ça oui. » Raison : le seuil est infranchissable sans pièce de fond (§ 2), aucune ligne d'écran
ne le dit, et le gérant en conclut que le logiciel ne veut pas de son dossier. Le critère
déterministe existe déjà, calculé à côté du score (`scoring.ts:294-297`). Détail et budget de
réécriture en § 4.1.

**D12. Le dossier remis au conseil se SUIT dans le produit.** Tranché par Jules le 17 septembre
2026 : « Il faut qu'on puisse suivre aussi le dossier qui passe par le conseil bien évidemment ! »
Raison : un PDF téléchargé sort du produit et emporte avec lui la seule chose qui continue de
courir, la prescription. ⚠️ Le produit **ne pilote pas le conseil et ne recommande aucune
procédure** : il suit une REMISE et attend un RETOUR, et rien n'avance sans une déclaration humaine
datée. Détail, états et table en § 4.4.

**Le budget de réécriture, chiffré, parce qu'il n'était pas posé.** Quatre sites rendent aujourd'hui
le score ou son seuil, et chacun se réécrit. D11 les tranche tous :

- `surveillance.ts:374` filtre sur `creance.statut !== 'QUALIFIEE' || creance.score <
  SEUIL_QUALIFICATION`, ce qui n'est pas un libellé mais le verrou lui-même. Il devient
  `conditionsToutesEtablies && !aUnBloquant`.
- `surveillance.ts:383` compose l'explication de `CREANCE_MURE` : « atteint le seuil de qualification
  (0.62 pour un seuil de 0.75) ». La phrase part entière.
- `scoring.ts:300` rend `eligible: conditionsToutesEtablies && !aUnBloquant && score >=
  SEUIL_QUALIFICATION`. Le troisième terme part, sans quoi le produit porterait deux définitions de
  « mûre » et leur divergence serait muette.
- `screens/creance.tsx:240` rend `pourcent(creance.score)`, seul usage de ce rendu dans tout
  l'écran ; l'écran disparaît avec les six analyses (§ 4.2).

⚠️ **Et un cinquième site, que la première écriture n'avait pas relevé : la COULEUR.**
`screens/creance.tsx:244` rend `<Chip size="md" color={creance.eligible ? 'green' : 'neutral'}>`,
c'est-à-dire un vert sur un état de qualification. Le vert, le rouge et l'ambre ne signifient qu'une
chose dans ce produit, au-dessus du seuil, tout près, en dessous. Un vert sur « Mûre pour une
procédure » fait exactement lire un seuil là où D11 vient d'en retirer un. La teinte part avec
l'écran, et aucune rangée de la file ne la reprend.

`ui/composition.tsx:118` rend un pourcentage dans un `title`, mais il décrit une composition de
règlements observée, pas un critère juridique : **il reste**. Le taux stipulé saisi dans
`ui/identite-debiteur.tsx` reste lui aussi un taux.

### 3.5 Les refus du produit, un par un, et ce que chacun devient

D0 ne s'applique pas en gros. Il s'applique à chaque endroit du dépôt qui dit non aujourd'hui, et
chacun a été relevé. Trois d'entre eux restent, et c'est écrit plus bas avec ce qu'ils protègent.

#### Les refus qui deviennent des chemins

| Le refus, au code | Ce qu'il fait aujourd'hui | Ce qu'il devient sous D0 |
| --- | --- | --- |
| **`exiger()` sur un paramètre non `verifie` ou sans valeur** (`parametres.ts:407-421`) | Lève. Le message nomme la clé et recopie sa `note`. Trois paramètres sur quinze portent `verifie: false` (relevé le 17/09 : 12 `true`, 3 `false`) | Le segment n'est PAS chiffré et il est nommé, à sa place dans le décompte. **Peut faire :** le principal, l'indemnité forfaitaire et les autres segments se chiffrent et s'impriment. **Manque :** la clé et sa note, telles que `exiger()` les écrit déjà. **Levé par :** un relevé daté sur une source publique citable. **Coût de l'attente :** le montant du segment est déclaré non chiffrable, et le total de tête le porte dans sa liste de non chiffrées (`revelation.ts:71`) |
| **`exiger()` sur une SERIE** (`parametres.ts:402-406`) | Lève en nommant le module à utiliser : « Utiliser pays/france/taux.ts → tauxPenaliteParDefaut(date) plutôt que exiger() » | **Ce refus n'atteint jamais l'écran, et c'est voulu.** C'est une erreur de développement, attrapée par `parametres.test.ts:103`. D0 porte sur ce qu'un gérant voit ; transformer celui-ci en chemin d'interface reviendrait à rendre rattrapable une faute qui doit casser le build |
| **`controle.ts`, abandon `FACTURE_ECARTEE`** (`controle.ts:76-90`) | Chiffre ce qui serait abandonné, facture par facture. Aucune surface aujourd'hui | Devient le premier étage de `/app/arret/$id` (§ 4.3), avec **deux sorties de même poids** : inclure et refaire, ou arrêter sans elles et l'inscrire au journal. Le chemin est déjà là ; ce qui manquait était l'écran |
| **`controle.ts`, abandon `INTERETS_INEXPLIQUES`** (`controle.ts:102-118`, `montantEnJeu: null`) | Constate que les segments n'expliquent pas les intérêts annoncés | **Peut faire :** le décompte se rend, segment par segment, et l'écart s'affiche. **Manque :** la période qui justifierait l'écart. **Levé par :** le relevé du taux du semestre absent, ou la correction de la date d'exigibilité. **Coût :** l'écart en euros, qui est chiffrable même quand `montantEnJeu` vaut `null`, parce que c'est la différence entre `ligne.interets` et la somme des segments |
| **`relance.ts`, niveau 2 sans décompte arrêté** (`relance.ts:226-235`) | `disponible: false`, avec le constat « aucun décompte n'a été produit pour cette créance » | **C'est le meilleur exemple du dépôt d'un refus déjà à moitié chemin**, et il ne lui manque qu'un geste. La rangée porte « Arrêter le décompte » à 48 px, et le niveau 2 devient disponible au retour. Le refus garde sa raison, qui est bonne : « les chiffres d'une relance ne se recalculent pas à la volée » |
| **Les écrans qui montrent un vide** (règle d'écran 4) | L'état vide de la file reçoit déjà la zone de dépôt et trois rangées fantômes (§ 4.1) | Trois vides que la première écriture ne couvrait pas reçoivent le même traitement : **une portée dont le compte est zéro ne se rend pas du tout** (une puce qui affiche 0 est un cadran à zéro) ; **un client sans rien à traiter n'apparaît pas dans la vue par client**, il est dans le pli compté ; **un volet de preuve sans pièce** nomme ce qui le remplirait et porte le bouton de dépôt |
| **`revelation.ts`, les factures non chiffrées** (`revelation.ts:71`, `:126`, `:149`) | Remonte chaque facture qu'il n'a pas pu chiffrer, avec sa raison en toutes lettres | Sa règle devient celle du total de tête (§ 4.1), et chaque non chiffrée devient une rangée, parce qu'elle porte un obstacle nommable en une phrase. C'est le modèle que D0 généralise, pas une exception |
| **`surveillance.ts`, les angles morts** (`surveillance.ts:523`, attachés ligne 617) | Composés, attachés aux événements, jamais rendus en entier | Rendus en pleine largeur dans la portée « Ce que vos factures portent » (§ 4.1). Ce n'est pas un refus, c'est le précédent : **le produit affiche déjà ce qu'il ne voit pas, il ne l'affiche nulle part** |

#### ⚠️ Les trois refus qui restent, et pourquoi

Un refus qui reste **nomme ce qu'il protège et propose autre chose**. Aucun des trois ne se
contourne, ne se règle, ni ne s'atténue avec le temps ou l'insistance.

**1. Un acte sur des valeurs non validées.** `exigerPourActe()` (`parametres.ts:431-441`) refuse
tout paramètre dont `valideParAvocat` vaut `false`, ce qui est le cas des quinze (relevé le 17/09 :
15 `false`, 0 `true`).

- **Ce qu'il protège :** un chiffre affiché se corrige au rafraîchissement suivant ; le même chiffre
  écrit dans une requête signifiée au débiteur ne se corrige plus, et ce qui ne figure pas au titre
  est perdu.
- **Ce qu'on propose à la place :** le décompte sous `exiger()`, décomposé en segments, imprimable
  et refaisable à la main, et le dossier à remettre au conseil avec la mention en tête qui nomme
  l'état de chaque valeur (§ 4.4).
- ⚠️ **L'honnêteté de ce refus : il ne s'exerce nulle part aujourd'hui, parce que le produit
  n'émet aucun acte.** `exigerPourActe()` n'a aucun site d'appel (§ 3.2). Il n'est pas câblé dans
  cette tranche, et **c'est écrit ici** pour que personne ne relise `parametres.ts` dans six mois en
  croyant qu'un verrou est en place. Le jour où un module émet un acte, c'est lui la porte, et il
  refuse.

**2. Une relance au nom du client.** Ligne rouge 1 : le recouvrement pour compte de tiers est une
activité encadrée.

- **Ce qu'il protège :** l'activité même. Et, en dessous, le client : un débiteur qui lit le nom
  d'un tiers dans le courrier y voit un mandat de chaîne (`__tests__/relance.test.ts:82`, `:217`).
- **Ce qu'on propose à la place :** un brouillon étiqueté « Visible par vous seul, non envoyé »,
  composé par `relance.ts` sans aucun appel modèle (B10), avec Télécharger le PDF, Copier le texte,
  Écarter, et le filtre des noms de tiers avant rendu (B11). Aucun composant d'envoi n'existe dans
  le sous-arbre (B5) : une commande absente ne s'active jamais par accident, une commande grisée si.
- **Et les deux refus déjà codés s'affichent, ils ne se contournent pas** (B12) : la suspension sur
  un débiteur en procédure collective ou radié (`relance.ts:144-168`, constat cité mot pour mot du
  registre) et la mise en demeure indisponible tant que ses mentions obligatoires ne sont pas
  relevées (`relance.ts:273-300`). ⚠️ **Sur la suspension, ce qu'on propose est étroit, et il faut
  le dire :** la surveillance continue, le décompte se chiffre, le dossier pour le conseil se
  produit. Le produit ne dit PAS ce qu'il faudrait faire d'une créance sur une entreprise en
  liquidation, parce qu'il ne le sait pas et que le dire serait le refus numéro 3. Il déclare cet
  angle mort au lieu de le taire.

**3. Une recommandation de procédure.** Ligne rouge 3 : ce serait du conseil juridique.

- **Ce qu'il protège :** le gérant, d'abord. Une voie recommandée par un logiciel et engagée de
  bonne foi ne se rattrape pas.
- **Ce qu'on propose à la place :** l'énumération des voies SANS ORDRE, produite par du code
  déterministe, **disponible avant l'arrêt du décompte** (§ 4.2, section 6, depuis
  `screens/analyses/procedure.tsx:337`), et le dossier que le conseil lit. La frontière est celle
  que B6 pose déjà : le produit a le droit d'ÉNUMÉRER sans ordre ce que du code écrit ; le
  compagnon n'a pas le droit d'en PARLER.

**La règle qui sort de ces trois.** Un refus qui reste s'écrit dans la forme en quatre parties de
D0, exactement comme un refus qui devient un chemin. La différence n'est pas dans la forme : elle
est que sa troisième partie, « ce qui le lève », nomme une condition que le produit ne franchira pas
seul, et sa quatrième dit ce que l'attente coûte, y compris quand la réponse est « rien, sur ce
document ».

---

## 4. La forme retenue, écran par écran

### 4.1 `/app` : la file

**Ce qu'elle est.** L'unique route de travail. « Ce qui compte aujourd'hui », triée par
`surveillance.ts`, l'échéance la plus proche d'abord, la prescription en tête. C'est le tri par
défaut, donc la prescription passe de zéro écran sur vingt-sept à l'écran d'accueil.

#### Le bloquant `CREANCE_MURE`, et sa réparation (D11)

**Toute la classe d'événements `CREANCE_MURE` n'entrait jamais dans la file en l'état.**
`surveillance.ts:374` la filtre ainsi :

```ts
if (creance.statut !== 'QUALIFIEE' || creance.score < SEUIL_QUALIFICATION) continue;
```

Or `SEUIL_QUALIFICATION` vaut 0,75 (`scoring.ts:158`) et § 2 démontre que ce seuil ne se franchit pas
sans pièce de fond. **La file est bâtie sur le module qui porte le verrou, et la première écriture de
cette spec ne le réparait pas : elle chiffrait le gain d'une classe d'événements qui ne se produit
pas.** C'est le même défaut, à l'envers, que le lien « Voir N autres » qui mène là où le flux n'est
pas.

**Tranché le 17 septembre 2026 (D11).** Une créance mûre, c'est **toutes conditions établies et
aucun bloquant**, et rien d'autre. Jules, sur la proposition de Q8 : « Une créance mûre c'est ça
oui. »

**Ce que le critère est déjà, au code.** `scoring.ts:294-297` le calcule à côté du score, sans que
rien ne le consomme seul :

```ts
const conditionsToutesEtablies = CONDITIONS_LEGALES.every(
    (condition) => elements[condition as ConditionLegale] === 'ok'
);
const aUnBloquant = risques.some((risque) => risque.gravite === 'BLOQUANTE');
```

Les quatre conditions sont nommées en un seul endroit, `qualification.ts:48-55` : `certaine`,
`liquide`, `exigible`, `entreCommercants`, et leurs libellés de lecture vivent juste en dessous
(`LIBELLE_CONDITION`, `qualification.ts:58-63`). Chacune vaut `ok`, `ko` ou `unknown`
(`qualification.ts:17`), et **`unknown` ne compte jamais comme établie** : le doute ne profite pas
au produit, et c'est déjà la règle du module.

**Les quatre gestes de la réparation**, dans cet ordre :

1. **`surveillance.ts:374`** ne filtre plus sur le score. Il filtre sur `creance.statut !==
   'QUALIFIEE'`, puis sur `conditionsToutesEtablies && !aUnBloquant`. `SEUIL_QUALIFICATION` cesse
   d'être importé par ce module.
2. **`scoring.ts:300`** perd son troisième terme et devient `eligible: conditionsToutesEtablies &&
   !aUnBloquant`. ⚠️ **Ce geste n'est pas facultatif, et Q8 le sous-estimait.** Option 1 de Q8 ne
   touchait que `surveillance.ts`, ce qui aurait laissé le produit avec DEUX définitions de
   « mûre » : celle de la file et celle d'`eligible`, lu par `lecture.ts:528` et rendu tel quel par
   `screens/creance.tsx:245` sous le libellé « Mûre pour une procédure ». Deux vérités dont la
   divergence serait muette, ce qui est exactement le défaut que `tables.ts` interdit ailleurs en
   refusant de stocker un état à côté des événements qui le produisent.
3. **`surveillance.ts:383`** cesse de citer le score. L'explication devient un constat qui NOMME ce
   qui est établi, en reprenant `LIBELLE_CONDITION` : « Sur la créance F-2024-114, le caractère
   certain, le caractère liquide, le caractère exigible et la qualité de commerçant des deux parties
   sont établis, et aucun risque bloquant n'est relevé. »
4. **`surveillance.ts:384`** se réécrit dans la même tranche (B6) : son champ `action` porte
   aujourd'hui « Examiner les procédures envisageables pour cette créance. », c'est-à-dire du texte
   EN PRODUCTION que la ligne rouge 3 interdit et que le balayage actuel ne voit pas.

**Ce que devient le score.** Il **reste au calcul** et **disparaît de l'écran** (D8). Il reste parce
qu'il sert encore à deux choses : ordonner `criteres` et `piecesManquantes` dans la sortie de
`scoring.ts`, et porter l'hypothèse de calibrage que son propre commentaire déclare, « une hypothèse
de départ, à recalibrer sur le taux de contestation réellement observé, c'est-à-dire quand il y aura
des données » (`scoring.ts:150-158`). Il disparaît de l'écran parce qu'un pourcentage invente une
nuance que le droit n'a pas, et parce que la jauge que le gérant regardait ne pouvait pas monter.
**`SEUIL_QUALIFICATION` reste déclaré, et cesse d'avoir un lecteur.** Le laisser exporté sans lecteur
serait un orphelin : soit il retrouve un usage de calibrage écrit, soit il part avec le score de
l'écran, et la tranche tranche à ce moment-là, pas dans cette spec.

**Ce que la réparation ne fait pas.** Elle ne baisse aucun seuil juridique et n'en déplace aucun.
Elle retire un seuil PRODUIT de la définition d'un état juridique, ce qui n'est pas la même
opération.

#### Deux vues au choix, et toujours une seule file (D9)

**Ce que Jules a demandé, le 17 septembre 2026 :** « Il faut isoler par créance et ou par client
avoir le choix de la vue quoi. »

**La forme retenue : un `Segmented` Cladd de deux positions dans la `Toolbar` de `/app`**, à côté du
sélecteur d'établissement, toujours visible, jamais dans un menu. **Par créance** (défaut) et
**Par client**. Ce n'est pas une puce de portée de plus, et la distinction est opposable :

- **une portée FILTRE** ce qui est dans la liste (Prescription, À trancher, Décomptes, Engagés) ;
- **une vue GROUPE** ce que la portée a laissé passer.

Les deux se composent : toute portée se lit dans les deux vues, et le compte de la puce ne change
pas quand on bascule, puisque ce sont les mêmes rangées. **Aucune adresse n'est ajoutée, aucune
feuille, aucune profondeur.**

**Vue Par créance, le défaut.** C'est la file décrite dans tout le reste de ce document : une rangée
par obstacle, triée par `surveillance.ts`, l'échéance la plus proche d'abord, la prescription en
tête. C'est pour ça qu'elle est appelée ailleurs le tri par échéance : l'ordre est l'échéance, le
grain est la créance. Le compte de tête reste « Ce qu'on vous doit » et « Dont la prescription tombe
sous 90 jours » (`PREAVIS.PRESCRIPTION = 90`, `surveillance.ts:93`).

**Vue Par client.** Une rangée par débiteur, qui porte :

- **la dénomination**, telle qu'elle est retenue, ou le libellé brut quand le SIREN n'est pas
  confirmé (A11), et la rangée le dit ;
- **l'encours**, somme de ce que ce client doit, déplié sur place en principal, intérêts et
  indemnités de quarante euros ;
- **l'échéance la plus proche parmi ses lignes**, nommée avec son fait et sa date, jamais son
  émotion : « Prescription dans 41 jours, passé le 27/10/2026 cette créance ne se réclame plus » ;
- **le compte de ses obstacles**, typés : « 3 à trancher, 1 décompte arrêtable ».

Elle s'ouvre EN PLACE sur ses rangées, qui sont exactement celles de la vue Par créance, inchangées,
avec leur verbe à 48 px. **Rien n'est reformulé pour la vue : un obstacle a une seule phrase dans
tout le produit.**

**Le compte de tête, dans chaque vue.** Le premier nombre ne bouge pas : « Ce qu'on vous doit » est
le même argent des deux côtés, et deux totaux différents selon la vue seraient le défaut que
`revelation.ts` interdit. **C'est le second nombre qui change de grain**, parce que c'est lui qui
dit « où faut-il regarder » :

- Par créance : « Dont la prescription tombe sous 90 jours », en euros.
- Par client : « Répartis sur N clients, dont M portent une échéance sous 90 jours. »

**Et la règle d'amputation tient identiquement dans les deux** (§ 4.1, plus bas) : le nombre de tête
affiche le total qu'il sait chiffrer, et sous lui, toujours visible et jamais replié, la liste nommée
de ce qu'il n'a pas chiffré et pourquoi. En vue Par client, une facture non chiffrée est nommée sous
le total de tête ET comptée sur la rangée de son client ; elle n'est jamais absorbée par un encours
qui ne la compte pas.

**La bascule avec une ligne ouverte.** Le volet de preuve est un ÉTAT adressable, `?ligne=<id>`, pas
une route. **Il ne se ferme pas** : la preuve porte sur une créance ou une facture, et le groupement
de la liste ne la concerne pas. Ce qui change est la liste à gauche, et trois cas sont écrits, parce
que c'est là que les vues mentent d'habitude :

1. **La ligne ouverte a un débiteur.** En passant en vue Par client, sa rangée client est ouverte et
   défilée à l'écran, la ligne ouverte surlignée dedans, **en teinte neutre** (le vert, le rouge et
   l'ambre ne disent que le seuil).
2. **La ligne ouverte n'a pas de débiteur identifié.** Elle tombe dans une rangée nommée « Sans
   débiteur identifié, N factures », qui existe toujours quand elle a un contenu, et qui porte son
   geste, la recherche BODACC par nom (A11). ⚠️ **Elle n'est jamais silencieusement omise :** une
   vue qui fait disparaître une facture dont personne ne sait à qui elle est, est exactement le
   mur que D0 interdit.
3. **La portée courante ne contient pas la ligne ouverte** (elle a été traitée, la portée a changé).
   Le volet reste ouvert et la liste affiche une rangée « La ligne ouverte n'est pas dans cette
   portée, l'afficher », qui reprend la portée qui la contient. Jamais un volet orphelin sans
   explication.

**Où le choix se retient.** Dans `usePreference` (`src/app/use-preference.ts`), le mécanisme déjà
écrit pour le thème : `useSyncExternalStore` sur `localStorage`, pas de `setState` dans un effet, et
deux onglets ouverts sur Letikette restent d'accord. Clé `letikette.file.vue`, valeurs `CREANCE` et
`CLIENT`, défaut `CREANCE`. ⚠️ **C'est une préférence d'affichage de NAVIGATEUR, pas une donnée
client :** elle ne porte aucun `organizationId`, elle ne vit pas en base Convex, et
`purge-complete.test.ts` ne la réclame donc pas. Corollaire : **le changement d'établissement rejoue
la file entière et ne remet PAS la vue à zéro.** La vue dit comment ce gérant pense ; l'établissement
dit ce qu'il lit. Ce sont deux choses.

**Ce que la vue Par client rend possible, et que la vue Par créance ne rend pas.** Trois choses,
toutes déjà calculées au dépôt, et aucune n'a d'écran qui les agrège aujourd'hui :

1. **Le portefeuille, et ce qu'un décompte abandonnerait.** `controle.ts` compare la créance à
   **toutes** les factures connues du débiteur et chiffre ce qui serait perdu (`controle.ts:76-90`).
   C'est un fait PAR CLIENT. En vue Par créance il n'apparaît qu'au pré-vol de l'arrêt, c'est-à-dire
   au dernier moment ; en vue Par client la rangée le porte dès qu'on la lit : « 5 factures connues,
   3 au décompte en cours, 1 240,00 € hors décompte. »
2. **L'encours.** La somme de ce qu'un client doit n'est agrégée nulle part dans le produit actuel :
   `debiteur-detail.tsx` rend un débiteur à la fois, atteint en deux gestes, et sans adresse. Un
   gérant qui veut savoir « combien Durand me doit en tout » ne peut pas le lire aujourd'hui.
3. **L'habitude de paiement, et sa rupture.** `habitudeDePaiement()` et `lireRupture()`
   (`comportement.ts:154`, `:194`) rendent un constat arithmétique refaisable à la main, « ce client
   règle habituellement à N jours ; cette facture en est à M », à partir de `ECHANTILLON_MINIMAL = 4`
   paiements observés (`comportement.ts:102`). Le module existe, il est testé, et il n'est rendu que
   par `/app/debiteurs/$id/habitude`, une adresse par client. ⚠️ **Et c'est le cas qui prouve la
   nécessité de la vue :** une rupture d'habitude n'a PAS d'échéance. Elle ne peut donc pas être
   triée par `surveillance.ts` au milieu des prescriptions, et elle n'a aucune place naturelle dans
   la vue Par créance. C'est pourtant, dit le module lui-même, « le signal le plus fort qu'un produit
   de recouvrement puisse donner ». Il se rend sur la rangée du client, et nulle part ailleurs.

⚠️ **Ce que la vue Par client ne fait PAS.** Elle ne classe pas les clients par risque, elle ne pose
aucun score de débiteur, et elle ne dit pas « ce client va faire défaut » : `comportement.ts` refuse
déjà explicitement cette prédiction, « invérifiable posée sur une douzaine d'observations ». Elle
trie par encours décroissant, ce qui est de l'arithmétique, et elle le dit.

#### En tête, deux nombres et pas quatre

« Ce qu'on vous doit » et « Dont la prescription tombe sous 90 jours »
(`PREAVIS.PRESCRIPTION = 90`, `surveillance.ts:93`). Le premier se déplie sur place en principal,
intérêts et indemnités de quarante euros.

**Le total de tête porte sa règle d'amputation, et elle n'est pas négociable.** `revelation.ts` la
pose déjà pour son propre total : « un total silencieusement amputé est pire qu'un total incomplet
annoncé » (`revelation.ts:28-29`), et il remonte dans `nonChiffrees` (`revelation.ts:71`, alimenté
aux lignes 126 et 149) chaque facture qu'il n'a pas pu chiffrer, avec sa raison en toutes lettres.
La première écriture de cette spec posait deux nombres en tête sans dire ce qu'ils font de ce qu'ils
ne savent pas compter.

**La règle : le nombre de tête affiche le total qu'il sait chiffrer, et sous lui, toujours visible et
jamais replié, la liste nommée de ce qu'il n'a pas chiffré et pourquoi.** « 31 200,50 € sur
14 factures. 2 factures ne sont pas chiffrées : date d'exigibilité inexploitable sur F-2024-114 et
F-2024-118. » Zéro non chiffrée produit zéro ligne, pas une ligne qui dit zéro (règle d'écran 4).
C'est aussi une rangée de la file, puisque chacune de ces factures porte un obstacle nommable en une
phrase.

**Sous les deux nombres, une rangée de puces de PORTÉE**, qui refiltrent la même liste sans jamais
ouvrir de destination, chacune avec son compte : Aujourd'hui (défaut, nommé), Prescription,
À trancher, Décomptes, Engagés, **Chez le conseil** (§ 4.4), **Ce que vos factures portent**, Tout.
La position de défilement et le volet de preuve survivent au changement de portée, ce qu'une
navigation détruit. **Une portée dont le compte vaut zéro ne se rend pas** : une puce qui affiche 0
est un cadran à zéro (règle d'écran 4, D0).

⚠️ **La puce « Débiteurs » disparaît de cette liste, et c'est D9 qui l'emporte.** Elle était une
portée qui faisait en réalité un GROUPEMENT, c'est-à-dire la vue Par client déguisée en filtre. Deux
mécanismes pour la même chose auraient divergé au premier ajout. Ce qu'elle portait est maintenant
le `Segmented` de deux positions décrit plus haut, et il s'applique à TOUTES les portées au lieu
d'être l'une d'elles.

**Une rangée n'est pas le résumé d'un enregistrement, c'est un ÉNONCÉ DE TRAVAIL.** Elle porte le
débiteur en titre, l'obstacle en une phrase au singulier, le montant à droite, et UN verbe visible
de 48 px :

- « Fournitures Durand, 3 factures, 31 200,50 €. Prescription dans 41 jours. » plus Retenir la
  créance ;
- « Fournitures Durand : une réserve est lue sur BL-2024-77, p. 1. La facture a-t-elle été contestée
  par écrit ? » plus Oui / Non ;
- « Décompte arrêtable, 12 480,33 € dont 1 240,33 € d'intérêts » plus Arrêter ;
- « Échéance illisible sur 3 factures Durand » plus Relever l'échéance.

⚠️ **Les deux premières rangées étaient une seule dans la première écriture, et c'était un lot que
D6 interdit.** « 3 factures, 31 200,50 €, la facture a-t-elle été contestée ? » plus Oui / Non fait
emporter par un tap unique trois qualifications de nature différente : la COMPOSITION de la créance,
la RÉPONSE de litige, et par ricochet la qualité de commerçant. Un tap qui emporte trois
qualifications est un lot sur une qualification juridique, exactement ce que D6 refuse, et la piste
d'audit qu'il produit ne distingue plus ce que le gérant a confirmé de ce qu'il a subi.

**La règle qui en sort :**

1. **Le verbe d'une rangée ne confirme qu'UNE chose**, et son libellé nomme laquelle.
2. **La réponse de litige se confirme séparément**, dans sa propre rangée ou dans le volet, et
   **reste `unknown` tant qu'elle n'a pas été confirmée explicitement** : `lireLitige()` traite déjà
   `INCONNU` comme une abstention, et le doute ne profite jamais au produit.
3. **La qualité de commerçant ne se confirme pas du tout** : elle se déduit de la forme relevée au
   registre (A2), ou elle reste `unknown` et la rangée le dit.

**Le sélecteur d'établissement reste, et il reste PERMANENT.** Il vit aujourd'hui dans la barre
(`src/app/barre.tsx:418` monte `<SelecteurEtablissement />`), que cette spec supprime, et la première
écriture ne lui donnait aucune destination. Sur un produit dont le cloisonnement est **strict par
`organizationId`, sans aucune exception**, un gérant à deux établissements aurait perdu le second
sans qu'aucun test ne tombe. Il se réinstalle dans la `Toolbar` de la file, toujours affiché, y
compris sur un compte mono-site, et son menu ne s'ouvre que s'il y a effectivement plusieurs
établissements. C'est le comportement déjà écrit et commenté dans
`src/app/selecteur-etablissement.tsx`, qui pose que « toutes les données de l'écran sont cloisonnées
par établissement, et un gérant qui reprend sa tablette après une réunion doit lire sur QUELLE
cantine il travaille sans avoir à cliquer ». Le changement d'établissement rejoue la file entière :
il ne conserve ni la portée, ni le volet de preuve, ni la position de défilement.

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

**Et le bilan d'un dépôt TERMINÉ reste une rangée, pas un bandeau refermable.** La première écriture
n'en gardait qu'un bandeau refermable en tête de file (§ 5.2), ce qui donnait aux cinq chiffres
écartés une durée de vie d'un geste. Or `src/ui/bilan-import.tsx` porte la règle du produit mot pour
mot dans son propre en-tête : « un import qui annonce 198 factures sans mentionner les deux lignes
écartées ment par omission, et l'omission porte sur l'argent qu'on ne réclamera pas ». Les cinq
comptes qu'il rend (`facturesDejaConnues`, `horsPerimetre`, `reglementsOrphelins`,
`reglementsCrees`, `ignoreesTotal` avec leurs raisons ligne à ligne) n'avaient aucune destination
après fermeture du bandeau.

**La forme retenue :** le dépôt terminé devient une **rangée permanente et datée** de la file,
« Dépôt du 16/09, 198 factures entrées, 2 illisibles, 3 déjà connues », qui s'ouvre dans le volet de
preuve sur le bilan complet (§ 4.2, section 8). `BilanImport` y est réemployé tel quel : il sait déjà
garder ses nombres toujours à l'écran et déplier les raisons de lui-même quand quelque chose a été
écarté. La rangée se replie dans le pli le jour où RIEN n'a été écarté ; dès qu'une ligne l'a été,
elle reste pleine, parce que le pli ne mange jamais une hypothèse ni une perte chiffrée (B9).

**Ce qu'elle remplace :** `/app` et ses 23 cibles, `/app/debiteurs` et son volet `?d=`,
`/app/debiteurs/$id/pieces`, `/app/debiteurs/$id/habitude`, `/app/procedures` et son volet `?p=`,
`/app/import-factures`, `/app/import-factures/$id`, et la barre à quatre onglets
(`src/app/barre.tsx`, `const ENTREES`).

#### ⚠️ `/app/revelation` ne se supprime PAS « sans rien perdre »

La première écriture l'écrivait, et c'était faux. L'écran argumente lui-même l'inverse dans son
propre en-tête (`src/screens/revelation.tsx:20-36`) : le plan précédent avait déjà voulu poser ce
compteur en tête du flux, et la raison écrite de ne pas le faire tient toujours. **Deux totaux sur le
même écran coûtent plus qu'ils n'apportent sur un produit dont l'argument entier est l'exactitude** :
le flux dit ce qui a bougé, la révélation dit ce que ça pèse, intérêts compris.

Ce que le dépliement d'un total en principal / intérêts / indemnités ne porte pas, et qui doit
atterrir quelque part :

1. **Le SUPPLÉMENT.** `revelation.ts` le calcule par ligne et en total (`supplement`, lignes 53, 68,
   143, 165) : les intérêts et l'indemnité forfaitaire que le gérant n'a **jamais** calculés. Ce
   n'est pas un sous-total, c'est **le livrable vendu du « Premier bilan »** (`convex/billing.ts:30`,
   « on dépose, on mesure, on obtient un bilan »). Un total déplié montre une décomposition ; il ne
   montre pas ce qui n'existait pas avant qu'on le calcule.
2. **`BilanPertes`.** Rendu uniquement par `screens/revelation.tsx:96` et la salle d'exposition. Il
   dit ce qui s'est ÉTEINT, y compris quand la surveillance a été interrompue.
3. **Le texte complet des angles morts.** `surveillance.ts:523` compose `anglesMorts`, attaché aux
   événements ligne 617. Une puce sous une facture n'est pas un angle mort déclaré.

**La forme retenue : la révélation devient la PORTÉE « Ce que vos factures portent » de la file**,
une puce de plus dans la rangée de portées, qui rend le supplément, le `BilanPertes` et les angles
morts en pleine largeur, dans la liste, sans route à elle. Elle n'est PAS un deuxième total en tête :
la tête garde ses deux nombres, et la révélation reste un récit à part, atteint par une puce. C'est
la seule façon de tenir à la fois « un seul flux » et l'argument écrit de l'écran qu'on retire.

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
6. **Les voies envisageables, ÉNUMÉRÉES SANS ORDRE, et ce qui court.** C'est la section qui sauve la
   quatrième propriété intouchable de § 2. Elle reprend ce que
   `screens/analyses/procedure.tsx:337` rend déjà sous `<SectionEcran titre="Les voies
   envisageables">`, sans en classer une, sans en recommander une, et **disponible avant l'arrêt du
   décompte** et non seulement dans le PDF qui le suit.

   Elle porte aussi **le suivi d'une procédure engagée et ses échéances**, avec **la seule saisie de
   date que le produit ne peut pas déduire**. `ui/suivi-procedure.tsx:160` est aujourd'hui le seul
   champ du dépôt où s'inscrit la date d'un fait de procédure, et il n'est monté que par
   `screens/analyses/procedure.tsx:314`, c'est-à-dire par un écran que cette spec supprime. **La
   première écriture le supprimait sans destination**, tout en rangeant cette même date parmi
   l'irréductible en § 6. Le champ migre ici tel quel, avec sa règle et son commentaire : c'est **la
   date du FAIT, pas celle de la saisie**, parce qu'un gérant qui enregistre le 20 mars une
   ordonnance signifiée le 3 verrait ses trois mois partir du 20, soit dix-sept jours offerts en
   silence sur l'échéance la plus dangereuse du produit. Il part sur la date du jour et se corrige
   d'un geste.
7. **Le journal unique**, où se mêlent ce que la machine a fait et ce que le gérant a dit, avec
   l'état avant et après : « Qualité passée de indéterminée à commerçant, forme SAS relevée au
   registre, BODACC du 16/09 ». C'est le SEUL point d'entrée d'une contestation reçue hors du
   logiciel.
8. **Le bilan du dépôt d'où viennent ces factures**, rendu par `BilanImport` tel qu'il existe :
   factures créées, règlements, débiteurs, doublons, hors périmètre, orphelins, et les lignes
   illisibles une par une avec leur raison (§ 4.1).
9. **Les brouillons de courrier**, étiquetés « Visible par vous seul, non envoyé », avec pour
   seules commandes Télécharger le PDF, Copier le texte, Écarter. Ce qui suit était absent de la
   première écriture et n'est pas négociable :

   - **Le brouillon reste produit par `relance.ts`, sans aucun appel modèle.** Le seul garde-fou qui
     empêche aujourd'hui un débiteur de lire le nom d'un tiers dans un courrier est un test sur ce
     composeur DÉTERMINISTE (`__tests__/relance.test.ts:82` et `:217` : « un débiteur qui lit le nom
     d'un tiers y voit un mandat de chaîne »). Faire écrire le brouillon par le modèle rendrait ce
     test vert et le produit faux. Le compagnon **choisit le niveau et rassemble les éléments** ; il
     n'écrit pas la phrase.
   - **Un balayage « aucun nom de tiers » s'applique AVANT RENDU** (B11), au point d'usage, et pas
     seulement sur les fichiers.
   - **Les refus déjà codés s'affichent, ils ne se contournent pas.** ⚠️ **Ils sont TROIS, pas deux**
     (B12) : le troisième est le niveau 2 sans décompte arrêté (`relance.ts:226-235`), et c'est le
     seul qui se lève d'un geste, « Arrêter le décompte ». Les deux autres suivent.
     `composerRelance()`
     appelle `suspension()` AVANT de regarder le niveau : un débiteur en procédure collective ou
     radié ne se relance pas, et le constat est celui du registre, cité mot pour mot : « Les
     relances sont suspendues : le registre public porte "liquidation judiciaire" pour Durand SAS
     depuis le 14 mars ». Et **la mise en demeure, niveau 3, se déclare INDISPONIBLE en nommant ce
     qui lui manque** : ses mentions obligatoires ne sont pas relevées au référentiel, et la règle
     interdit de les deviner. Une mise en demeure irrégulière est pire qu'aucune, parce que le
     créancier calcule la suite sur un délai qui n'a jamais couru. **Un compagnon qui préparerait un
     brouillon sans ces deux refus produirait une mise en demeure irrégulière, ou relancerait un
     débiteur en liquidation.**
10. **La conversation**, troisième position d'un `Segmented` Cladd qui bascule le volet entre Pièce,
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

**Son verrou, tranché.** C'est la frontière calculer / produire un acte, et c'est un artefact NEUF.
`exiger()` suffit à calculer, parce qu'un chiffre affiché se corrige ; `exigerPourActe()` est exigé
quand un chiffre part au greffe et ne se corrige plus. Le décompte, lui, est déjà arbitré :
`piece.ts:19` pose qu'il « vit sous `exiger()` », et jamais sous `exigerPourActe()`. **Le dossier
n'est ni l'un ni l'autre : il n'est pas un acte, mais il est lu par quelqu'un qui en produira un.**

**Il vit sous `exiger()`, et il porte en tête la mention qui nomme l'état de chaque valeur** : par
exemple « douze valeurs relevées sur une source publique citable, trois non relevées, zéro validée
par un juriste, relevé du 04/01/2026 complété le 16/09/2026 » (compte réel au 17/09 : 12 `verifie:
true`, 3 `verifie: false`, 15 `valideParAvocat: false`). C'est D0 et D10 ensemble : refuser le
document à un avocat au motif qu'un avocat ne l'a pas validé serait un mur circulaire, et le lui
donner sans dire ce qu'il tient serait pire. **Le refus dur se garde pour le jour où le produit
émettra un acte** (§ 3.5, refus 1) ; ce jour-là, `exigerPourActe()` est la porte.

#### Le suivi du dossier chez le conseil (D12)

**Ce que Jules a demandé, le 17 septembre 2026 :** « Il faut qu'on puisse suivre aussi le dossier
qui passe par le conseil bien évidemment ! »

**Pourquoi ça ne peut pas être un PDF téléchargé.** Un dossier qui sort du produit emporte avec lui
la seule chose qui continue de courir. La prescription ne s'arrête pas parce qu'un dossier est parti
chez un avocat, et un gérant qui a « transmis » croit avoir agi. **C'est le mode de panne le plus
cher du produit** : celui où l'utilisateur croit sa prescription surveillée alors qu'elle ne l'est
plus.

⚠️ **La ligne rouge d'abord, parce qu'elle cadre tout le reste.** Le produit **ne pilote pas le
conseil**. Il ne lui écrit pas, ne lui fixe aucun délai, ne le relance pas, ne note pas son
efficacité, et ne recommande aucune procédure à personne. Il suit une REMISE faite par le gérant et
attend un RETOUR déclaré par le gérant. Tout le reste serait du recouvrement pour compte de tiers ou
du conseil juridique.

**Quatre états, et rien de plus.** Ils décrivent la REMISE, jamais la procédure :

| État | Ce qu'il dit | Ce qui y mène |
| --- | --- | --- |
| `PREPARE` | Le dossier est figé et daté, il n'est pas parti | La production du dossier depuis un décompte arrêté |
| `REMIS` | Le gérant déclare l'avoir remis, à une date | Une déclaration humaine, avec la date du FAIT |
| `REVENU` | Le conseil a rendu quelque chose, et le gérant l'a consigné | Une déclaration humaine, avec la date du FAIT |
| `CLOS` | Le gérant met fin au suivi, avec son motif en toutes lettres | Une déclaration humaine. **Sans cet état, un dossier sans retour resterait ouvert pour toujours**, et un suivi dont on ne peut pas sortir est un mur (D0) |

**Ce qui le fait avancer : uniquement une déclaration humaine, jamais le produit.** Aucune
transition automatique, aucune échéance imposée au conseil, aucun rappel formulé comme « votre
avocat n'a pas répondu ». ⚠️ **Et chaque transition porte deux dates, pas une**, exactement comme
`evenementsProcedure` le fait déjà et pour la raison écrite dans son commentaire (`tables.ts`) : la
date du FAIT fait courir les délais, la date de SAISIE ne sert jamais à un calcul. « Un gérant qui
enregistre le 20 mars une ordonnance signifiée le 3 doit voir ses trois mois partir du 3 ; les
confondre en offrirait dix-sept de plus, sur l'échéance la plus dangereuse du produit. »

**À qui : facultatif, et depuis SON carnet.** `intervenantId` est optionnel et se choisit dans
`intervenants` (§ 4.5), dont la table rappelle elle-même que « c'est son carnet, pas un annuaire que
le produit propose ». Un dossier peut être remis sans nommer personne, et le produit ne propose
jamais de nom.

**Ce que le gérant voit dans sa file pendant que le dossier est chez le conseil.** C'est la partie
qui compte, et elle tient en une règle : **rien ne se replie.**

- **La puce de portée « Chez le conseil »** porte son compte, dans les deux vues (D9).
- **Les rangées de la créance restent pleines.** `surveillance.ts` ne sait rien d'une remise et
  continue de produire ses événements, ce qui est la bonne architecture : la remise est un fait du
  produit, pas un fait du droit. La rangée le dit d'une phrase : « Fournitures Durand, dossier remis
  à votre conseil le 22/09. La prescription tombe le 27/10/2026, dans 41 jours, et elle ne s'arrête
  pas parce que le dossier est parti. »
- ⚠️ **L'angle mort se déclare, il ne se devine pas.** `pays/france/prescription.ts` écrit qu'il
  « ne gère ni suspension ni interruption », et qu'une mise en demeure, une reconnaissance de dette
  ou une action en justice les provoquent. Le produit **ne sait donc pas** si le conseil a
  interrompu quoi que ce soit, et il l'écrit : « Si votre conseil a engagé une action, ce logiciel
  ne le sait pas tant qu'un fait de procédure n'est pas consigné. » Il ne dit pas d'en consigner un ;
  il dit ce qu'il ignore, comme partout ailleurs.
- **Les deux montants, et leur écart, décomposé.** Le dossier porte un décompte FIGÉ ; la file
  continue de compter au jour le jour. Ils divergent, et le taire serait offrir un chiffre qu'on
  demande de croire. La rangée porte les deux : « Dossier du 16/09 : 12 480,33 €. Aujourd'hui :
  12 612,80 €. L'écart est de 132,47 € d'intérêts courus depuis, décomposables en segments. »
- **Le temps écoulé, en constat arithmétique.** « Dossier remis il y a 34 jours. Aucun fait de
  procédure consigné depuis. » C'est la discipline de `comportement.ts` : un constat refaisable à
  la main, aucun verbe d'action, aucune insinuation sur le conseil.

**Ce qui revient, et où ça atterrit.** Trois choses, et chacune a déjà sa destination :

1. **Un fait de procédure**, avec sa date de survenance : dans `evenementsProcedure`, rendu au volet
   de preuve, section 6, par le champ de `ui/suivi-procedure.tsx:160` qui y migre (§ 4.2). C'est la
   seule saisie de date que le produit ne peut pas déduire.
2. **Une contestation reçue hors du logiciel** : dans le journal, volet section 7, qui en est le
   SEUL point d'entrée. C'est ce qui donne prise à la règle « l'absence de contestation CONNUE n'est
   pas une absence de contestation ».
3. **Rien.** Le conseil n'a pas encore répondu. L'état reste `REMIS`, la rangée continue de compter,
   et **le produit ne relance personne**. La seule chose qui change est le nombre de jours dans le
   constat.

**La table, son cloisonnement et sa purge.**

| Table | Ce qu'elle porte | Cloisonnement | Purge |
| --- | --- | --- | --- |
| `remisesAuConseil` | `creanceId`, `decompteId` (le décompte figé que le dossier emporte), `etat` (`PREPARE` / `REMIS` / `REVENU` / `CLOS`), `intervenantId` optionnel vers le carnet, `remisLe` / `revenuLe` / `closLe` en date du FAIT au format AAAA-MM-JJ, `consigneLe` en horodatage de saisie, `motifCloture` et `attendu` optionnels, en toutes lettres | `organizationId: v.id('organizations')`, index `by_org`, `by_org_and_etat`, `by_creance` | citée dans `rgpd.ts` |

⚠️ **Elle porte des données client, sans exception à justifier :** à qui ce gérant confie ses
dossiers est sa relation, pas une information du domaine, et l'intervenant vient de son carnet
privé. `src/lib/convex/__tests__/purge-complete.test.ts` lit la SOURCE de `recouvrement/tables.ts`,
relève toute table qui déclare `organizationId: v.id('organizations')`, et **échoue si la chaîne
`'remisesAuConseil'` n'apparaît pas dans `rgpd.ts`** (test, lignes 80-91). C'est la seule barrière
de cette spec qu'on ne peut pas oublier sans qu'un test rouge le dise le jour même.

**Et une règle de gel, pour la même raison que les décomptes.** Un dossier `REMIS` fige ce qu'il a
emporté : son `decompteId` ne change jamais, et une proposition corrigée après coup ne réécrit pas
ce qui est parti chez le conseil. La question n'est pas « que dirait le dossier aujourd'hui » mais
« qu'a lu le conseil le jour où on le lui a remis ». Produire un dossier à jour crée un NOUVEAU
dossier daté, avec sa propre remise.

**C'est la seule concession de la refonte à « un seul flux », et on la revendique** plutôt que de
la masquer. Déplier une pièce citable dans une file produirait une pièce non citable.

### 4.5 `/app/compte` : la mise en route, à plat

**Ce qu'elle est.** Une page, **six** sections dépliées, zéro sous-route : Établissement,
Facturation, Équipe, Données, **Intervenants**, **Affichage et session**. Les quatre gestes
engageants (inviter un membre, exporter, supprimer un établissement, supprimer le compte) se règlent
EN LIGNE, avec la confirmation par saisie exacte qui existe déjà
(`src/ui/confirmation-par-saisie.tsx`).

**« Affichage et session » existe parce que deux choses livrées n'avaient plus d'adresse.** La
première écriture supprimait `src/screens/parametres/reglages.tsx` sans reprendre ni le
`Segmented` Automatique / Sombre / Clair (`reglages.tsx:236-249`, livré il y a trois jours au commit
`7be61f1`), ni `onSeDeconnecter` (`reglages.tsx:61`, monté ligne 257). **Une application dont on ne
peut pas sortir n'est pas une simplification.** Les deux se posent ici, tels quels : le `Segmented`
garde ses trois états exclusifs et `Automatique` reste le défaut.

**« Intervenants » est le carnet, et il ne disparaît pas non plus.** `intervenants` est une table
réelle, cloisonnée et indexée (`convex/recouvrement/tables.ts:634`, `by_org` et `by_org_and_role`),
qui porte nom, rôle, ressort, coordonnées, origine (`SAISI_A_LA_MAIN` /
`RETENU_DEPUIS_UN_REPERTOIRE`) et la date de relevé de sa source. Les trois composants qui la
servent (`ui/choix-intervenant.tsx`, `ui/recherche-avocat.tsx`, `ui/recherche-commissaire.tsx`)
n'étaient montés que par l'écran de procédure, que cette spec supprime, et **la première écriture les
supprimait avec lui alors que l'automatisme A3 s'appuie explicitement dessus** : c'est le carnet que
l'adresse du débiteur débloque, en donnant le département du commissaire et le barreau. Le carnet vit
ici, en liste ; les deux recherches restent des feuilles ouvertes depuis cette section ET depuis la
section 6 du volet de preuve, là où on en a besoin. Le carnet part fermé, comme aujourd'hui.

**L'identité du créancier ne se demande plus en formulaire d'entrée, mais elle reste CORRIGEABLE.**
Elle devient une rangée de la file le jour où elle bloque un chiffre, chiffrée (« sans elle, aucun
décompte ne peut servir de pièce »), et elle se lève en trois taps par le patron `retenir()` déjà
écrit et testé dans `screens/parametres/creancier.tsx:175`.

⚠️ **Mais une rangée de file ne suffit pas, et la première écriture s'arrêtait là.** La dénomination,
le SIREN et l'adresse du créancier **s'impriment sur chaque décompte**, c'est-à-dire sur la pièce que
lit un tiers. Une adresse change quand l'entreprise déménage, un SIREN change quand elle se
restructure, et **ni l'un ni l'autre ne « bloque un chiffre »** : le décompte continue de se produire,
avec une identité périmée, sans qu'aucune rangée n'apparaisse jamais. La section Établissement garde
donc les trois champs en édition (`creancier.tsx:333-345`), avec la recherche au registre et le
`retenir()` par comparaison côte à côte. **La file est le chemin PROACTIF, la section est le chemin
CORRECTIF, et un produit dont la sortie est opposable a besoin des deux.**

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

**Et le compte de ce qui SURVIT, qui manquait à la première écriture.** Un décompte d'adresses qui ne
dit pas où passent les surfaces supprimées est le même défaut que le total silencieusement amputé de
`revelation.ts` : il flatte en omettant. Les sept destinations que cette révision a dû écrire :

| Ce qui disparaissait sans destination | Où ça vit après |
| --- | --- |
| Le sélecteur d'établissement (`barre.tsx:418`) | `Toolbar` de `/app`, permanent (§ 4.1) |
| La déconnexion et le thème (`reglages.tsx:61`, `:236-249`) | `/app/compte`, section Affichage et session |
| La correction de l'identité du créancier | `/app/compte`, section Établissement, en édition |
| La date d'un fait de procédure (`suivi-procedure.tsx:160`) | Volet de preuve, section 6 |
| Le carnet d'intervenants et ses deux recherches | `/app/compte`, section Intervenants, et volet section 6 |
| Le bilan d'un dépôt terminé (`ui/bilan-import.tsx`) | Rangée permanente de la file, volet section 8 |
| Le supplément, `BilanPertes`, les angles morts (`/app/revelation`) | Portée « Ce que vos factures portent » (§ 4.1) |

Aucune de ces sept destinations n'ajoute une adresse : quatre tiennent dans `/app/compte`, deux dans
le volet de preuve, une dans une portée de la file. **Le compte de quatre tient, et il tient
honnêtement.**

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

**Il part AVANT la validation juriste, et c'est une décision de Jules, pas une tolérance** (D10,
17 septembre 2026). Elle vient avec deux conditions qui sont la décision autant que le « oui » :
toute référence légale se résout par le registre, et une valeur non validée par un avocat ne bloque
pas l'outil, elle nomme ce qu'elle interdit. **§ 5.9 écrit exactement ce qu'il dit quand il touche
cette limite, et la règle qui fait qu'un second pays n'obligera à rien réécrire.**

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
(« Le veilleur a trouvé 4 choses, Relire »).

⚠️ **Le bandeau ANNONCE, il ne PORTE pas.** Il est refermable, donc rien de chiffré ne peut vivre là
et nulle part ailleurs. Le bilan du dépôt (doublons, hors périmètre, orphelins, règlements,
illisibles) vit dans une rangée permanente et dans la section 8 du volet (§ 4.1, § 4.2). Un bandeau
qui serait le seul support d'un chiffre écarté ferait exactement ce que `ui/bilan-import.tsx`
interdit : mentir par omission, d'un geste de fermeture. Jamais un badge rouge réparti sur plusieurs onglets :
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
  `controle.ts`. **Cette confirmation porte sur la COMPOSITION et sur rien d'autre** : elle n'emporte
  aucune réponse de litige et aucune qualité de commerçant (D6, § 4.1).
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
- **Il REFUSE en le nommant, et le refus est un CHEMIN** (D0). Quand une valeur juridique n'a pas
  passé `exiger()`, il ne chiffre pas le segment et dit lequel manque (« 2e semestre 2026 absent de
  la série, ce segment n'est pas chiffré »), puis il dit ce qu'il a chiffré quand même, ce qui
  lèverait le manque et ce que l'attente coûte. Le refus est un résultat affichable en quatre
  parties, jamais une erreur technique et jamais une phrase seule.
- **Il prépare des artefacts privés** : un brouillon de courrier étiqueté « Visible par vous seul,
  non envoyé », et le dossier à remettre au conseil, figé et daté. **Le brouillon sort de
  `relance.ts`, sans appel modèle**, et le compagnon en RELAYE les deux refus au lieu de les
  contourner : relances suspendues sur un débiteur en procédure collective ou radié, et mise en
  demeure indisponible tant que ses mentions obligatoires ne sont pas relevées au référentiel
  (§ 4.2, section 9).
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
dégradée, porte la mention « non sourcé », et **ne peut jamais porter ni un MONTANT ni un ÉNONCÉ
JURIDIQUE.** Le compagnon a le droit de dire qu'il ne sait pas d'où sort quelque chose ; il n'a pas
le droit de le dire silencieusement.

⚠️ **La première écriture n'interdisait que le montant, et c'était le trou le plus dangereux de la
spec.** « Ce type de créance se prescrit par cinq ans » ne porte aucun chiffre en euros, ne cite
aucun article, et échappait à tout : ni B3 (qui ne mord que sur une référence légale ÉCRITE), ni B4
(qui ne mord que sur un montant). C'est pourtant exactement la phrase qui fait perdre un droit quand
elle est fausse, et c'est celle qu'un gérant recopiera dans un courrier.

**L'interdit porte donc sur l'ÉNONCÉ, pas sur le chiffre.** Est un énoncé juridique toute phrase qui
affirme un délai, une prescription, un taux, une indemnité, une qualité, une condition d'exigibilité
ou un effet de droit, qu'elle nomme un article ou non. Un tel énoncé **résout vers une entrée de
`parametres.ts`, ou il n'est pas rendu** (B3, réécrite en ce sens). Le compagnon n'a pas le droit de
dire le droit de mémoire, même juste, parce qu'une phrase juste sans source ne se vérifie pas et ne
se corrige pas le jour où la valeur change.

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

Le barème est déjà écrit dans `src/lib/socle/modele/cout.ts:13-17` : 5 **dollars** par million de
tokens d'entrée, 25 **dollars** par million en sortie, facteur 0,1 sur les tokens lus en cache, et un
plafond dur `CAP_EUR` de 10 **par lot d'extraction**.

⚠️ **L'unité est un dollar, et le module le dit lui-même.** Son commentaire pose que ce sont des
« Prix Opus 5 (liste), en dollars ; traités comme des euros dans `costEur` », et que c'est « un
budget indicatif de pilotage, pas une facture, donc pas de conversion de change ici ». **La
première écriture de cette spec chiffrait tout en euros sans le signaler**, ce qui transformait un
ordre de grandeur assumé en ligne de coût, sur un produit dont l'argument entier est qu'un chiffre porte son
unité et sa source. Tous les chiffres qui suivent sont des **dollars lus comme des euros**, à la
convention du module : ce sont des ordres de grandeur de pilotage, et **aucun d'eux n'est
opposable**. Le jour où l'un d'eux entre dans une décision de prix, il passe par une conversion
datée, et `CAP_EUR` change de nom.

**L'ordre de grandeur d'une question de conversation**, contexte de dossier compris : environ
8 000 tokens en entrée, 600 en sortie. Soit 0,040 plus 0,015, **environ 5,5 centimes par question**
sans cache. Avec un préfixe système de 3 000 tokens servi en cache, environ 4 centimes.

**Ce qu'il faut en tirer, et qui n'est pas réglé aujourd'hui :**

- **Il n'existe aucun plafond côté conversation.** `CAP_EUR` borne un lot d'extraction, pas un
  gérant bavard. Dix questions par jour ouvré font environ 200 questions par mois, soit **8 à 11 par
  mois et par établissement**, à la même convention d'unité, en coût variable adossé à un prix
  d'abonnement fixe.
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

### 5.8 Ce qu'il PERSISTE, et ce que ça coûte au cloisonnement

La première écriture décrivait trois objets neufs (la proposition et son cycle de vie, le journal,
la conversation) **sans nommer une seule table, un seul `organizationId`, une seule ligne de
purge.** Sur un produit dont le cloisonnement est strict et la purge totale, c'est la moitié du
travail qui manquait, et c'est aussi celle qu'aucun écran ne rappelle.

**La barrière qui mord :** `src/lib/convex/__tests__/purge-complete.test.ts` lit la SOURCE de
`recouvrement/tables.ts` et de `schema.ts`, relève toute table qui déclare
`organizationId: v.id('organizations')`, et **échoue si son nom ne figure pas dans `rgpd.ts`**. Son
critère est « mécanique et sans échappatoire ». Les trois tables ci-dessous s'y soumettent.

| Table | Ce qu'elle porte | Cloisonnement | Purge |
| --- | --- | --- | --- |
| `propositions` | Un constat posé par le compagnon : sa cible, son champ, la valeur proposée, sa SOURCE (pièce et page, ou entrée de `parametres.ts`), son état (`PROPOSEE` / `RETENUE` / `ECARTEE`), l'auteur et l'horodatage de chaque transition, et le motif d'un écart | `organizationId`, index `by_org` et `by_org_and_etat` | citée dans `rgpd.ts` |
| `journal` | Une entrée par fait : ce que la machine a fait ou ce que le gérant a dit, l'état AVANT et APRÈS, la source, l'auteur, l'horodatage | `organizationId`, index `by_org` et `by_org_and_cible` | citée dans `rgpd.ts` |
| `conversations` | Les tours de parole d'un fil, leur portée, les pastilles de source par phrase, et l'usage modèle consommé | `organizationId`, index `by_org` et `by_org_and_cible` | citée dans `rgpd.ts` |
| `remisesAuConseil` | Le suivi d'un dossier remis : la créance, le décompte figé qu'il emporte, son état, l'intervenant du carnet s'il est nommé, et les dates du FAIT de chaque transition (D12, § 4.4) | `organizationId`, index `by_org`, `by_org_and_etat` et `by_creance` | citée dans `rgpd.ts` |

**Quatre règles de persistance, et chacune a une raison opposable :**

1. **Une proposition ÉCARTÉE n'est jamais supprimée**, seulement marquée. § 5.6 pose que « le cycle
   de vie de la proposition EST la piste d'audit » : il faudra pouvoir dire ce qu'on n'a PAS retenu,
   et quand. Une suppression physique rend la question sans réponse.
2. **Le journal est en APPEND seul.** Aucune entrée ne se modifie ni ne se supprime, hors purge
   RGPD totale. C'est le seul point d'entrée d'une contestation reçue hors du logiciel, donc le seul
   endroit qui peut dire quand on a su.
3. **Un décompte arrêté fige les propositions qu'il a consommées.** Il est figé définitivement ;
   rejouer produit un NOUVEAU décompte daté. Une proposition corrigée après coup ne doit pas
   réécrire ce qu'on a réclamé le jour où on l'a réclamé.
4. **Une remise fige le décompte qu'elle emporte.** Son `decompteId` ne change jamais. La question
   n'est pas « que dirait le dossier aujourd'hui » mais « qu'a lu le conseil le jour où on le lui a
   remis » (§ 4.4).

⚠️ **Ces quatre tables portent des données client, sans aucune exception à justifier** : ce qu'un
gérant a répondu sur son débiteur, la question qu'il a tapée, le montant qu'il a confirmé, à qui il
a confié son dossier. Rien n'y est mutualisé, et l'annuaire national des avocats reste le
contre-exemple qui confirme la règle : il n'a pas d'`organizationId` parce qu'un fichier public sous
Licence Ouverte n'appartient à personne, et `purge-complete.test.ts` ne le réclame donc pas.

### 5.9 Le compagnon avant le juriste, et le second pays (D10)

**La décision, mot pour mot.** Jules, le 17 septembre 2026 : « Oui le compagnon part avant la
validation du juriste en s'assurant avec les textes de lois et en veillant à utiliser le système
multi juridique déjà en place (partie France). » Ce n'est pas un feu vert nu : c'est un feu vert
assorti de deux conditions, et les conditions sont la décision.

#### Condition 1 : toute référence légale se résout par le registre

**Aucune affirmation de droit ne se rend sans article résolu.** Le registre est
`src/lib/verticales/recouvrement/parametres.ts`, et le module de pays qu'il nomme lui-même. La règle
exécutable est B3, déjà écrite et déjà élargie : elle porte sur l'ÉNONCÉ, pas sur le chiffre. Le
compagnon n'a pas le droit de dire le droit de mémoire, même juste, parce qu'une phrase juste sans
source ne se vérifie pas et ne se corrige pas le jour où la valeur change.

#### Condition 2 : `verifie` autorise à calculer, `valideParAvocat` seul autorise l'acte

**L'état réel, relevé le 17 septembre 2026 :** 12 paramètres `verifie: true`, 3 `verifie: false`,
et **15 `valideParAvocat: false`, 0 `true`**. Donc, aujourd'hui, `exiger()` passe sur douze valeurs
et refuse sur trois ; `exigerPourActe()` refuserait sur les quinze, et il n'est appelé nulle part.

**Une valeur `verifie` mais non `valideParAvocat` autorise trois choses et en interdit une :**

| Autorisé | Interdit |
| --- | --- |
| **Calculer.** Un chiffre affiché se corrige au rafraîchissement suivant | **Produire un acte.** Un chiffre écrit dans une requête signifiée ne se corrige plus |
| **Expliquer.** Segment par segment, avec l'article, la date de relevé et les deux booléens | |
| **Préparer.** Le brouillon privé, le dossier pour le conseil, le pré-vol de l'arrêt | |

#### Ce que le compagnon DIT quand il rencontre cette limite

Quatre parties, dans cet ordre, et jamais moins de quatre (D0, B14). Exemple complet, sur
l'indemnité forfaitaire :

> **Ce que je peux faire maintenant.** Je chiffre ce décompte : 12 480,33 €, dont 400,00 €
> d'indemnités forfaitaires sur 10 factures et 1 240,33 € d'intérêts en 3 segments. Chaque segment
> porte sa base, son taux, ses jours et sa base annuelle. Il s'imprime, il se refait à la main, et il
> se remet à votre conseil.
>
> **Ce qui manque.** L'indemnité de 40 € vient de l'article D441-5 du code de commerce, relevée sur
> Légifrance le 04/01/2026. Elle est relevée par le logiciel ; aucun juriste n'a contrôlé qu'elle
> s'applique à votre cas.
>
> **Ce qui le lève.** Le contrôle par un juriste de la valeur ET de son applicabilité au cas
> d'espèce. C'est le champ `valideParAvocat` du référentiel, et c'est le seul que le logiciel ne peut
> pas remplir seul.
>
> **Ce que coûte l'attente.** Rien sur ce décompte : il ne part à aucun greffe, et ce produit n'émet
> aucun acte. Sur ce dossier, ce qui court est la prescription : le 27/10/2026, dans 41 jours.

⚠️ **Trois choses que cette formulation évite, et qui sont les trois façons de la rater.**

1. **Elle ne dit pas « faites valider par un avocat ».** Ce serait une conduite à tenir. Elle nomme
   ce qui lève le verrou au constat, à la troisième personne. C'est la discipline déjà tenue par
   `relance.ts:160-165`, dont le commentaire écarte « déclarer la créance, saisir qui que ce soit »
   pour cette raison exacte.
2. **Elle ne met pas le coût de l'attente à zéro pour rassurer.** Le décompte ne risque rien, la
   créance si, et ce sont deux phrases différentes. Un « rien ne presse » global serait faux.
3. **Elle ne se répète pas à chaque tour de parole.** Les quinze paramètres portent le même état ;
   le dire quinze fois par écran serait du bruit, et le bruit s'apprend. **Le constat se rend une
   fois par surface, à l'endroit où le chiffre s'affiche**, et le « (i) » de chaque segment ouvre la
   fiche complète du paramètre (§ 4.2, section 1).

#### Comment le pays est choisi aujourd'hui, et la règle pour le second

⚠️ **Vérifié au code, et il faut le dire franchement : il n'existe aucun sélecteur de pays.** Aucune
table ne porte de champ `pays`, aucun code pays ne circule, et rien ne choisit à l'exécution. La
France est choisie **par le chemin d'import**, relevé le 17/09 à **18 fichiers et 27 lignes
d'import** hors du module de pays et hors tests :

- **10 modules Convex** (`recouvrement/debiteurs.ts:8`, `:10`, `:11`, `decompte.ts:16`,
  `lecture.ts:23`, `monEtablissement.ts:9`, `profil.ts:6`, `radar.ts:4`, `:5`, `recherche.ts:8`,
  `revelation.ts:15-17`, `surveillance.ts:24`) ;
- **2 modules de la verticale** (`taux-contractuel.ts:3`, `import/factureVente.ts:3`) ;
- **2 écrans** (`screens/debiteur-detail.tsx:27`, `screens/parametres/creancier.tsx:22`) ;
- **4 fichiers de salle d'exposition** et **1 page marketing** (`marketing/la-loi.tsx:3-4`).

**Ce qui EXISTE, en revanche, et qui est le vrai système multi-juridique**, c'est la frontière que
`parametres.ts` tient déjà :

- une valeur qui varie par date ou par secteur est déclarée `nature: 'SERIE'`, `valeur: null`, et
  porte **`resoluPar`**, qui NOMME le module de pays et sa fonction (`parametres.ts:119`, `:136`,
  `:152`, `:171`) ;
- **`exiger()` REFUSE une SERIE** et son message dit quoi faire à la place : « Utiliser
  pays/france/taux.ts → tauxPenaliteParDefaut(date) plutôt que exiger() » (`parametres.ts:402-406`).
  Un test le vérifie (`__tests__/parametres.test.ts:103`).

Autrement dit : le registre sait déjà qu'une valeur appartient à un pays, et il refuse déjà de la
rendre lui-même. Ce qui manque n'est pas la frontière, c'est le choix.

**La règle pour que le compagnon n'oblige à rien réécrire le jour d'un second pays**, et elle tient
en une phrase : **le compagnon ne lit aucune valeur juridique, ne nomme aucun module et n'importe
aucun pays.**

1. Il reçoit des **faits déjà résolus**, produits par les modules de domaine, sous une forme unique :
   la clé, la valeur, la source, la date de relevé, `verifie`, `valideParAvocat`, et `resoluPar`
   quand c'en est un. Il en fait une phrase et une pastille.
2. Il ne résout jamais une SERIE lui-même. S'il reçoit une entrée non résolue, il ne la rend pas
   (B3) et le refus nomme la clé.
3. **Barrière exécutable, B15** : un test échoue si le module qui compose les phrases du compagnon
   importe quoi que ce soit sous `verticales/recouvrement/pays/`. Modèle :
   `src/lib/socle/__tests__/frontiere.test.ts`, qui tient déjà la frontière socle / verticales.

**Conséquence, écrite pour dans six mois.** Le jour où un second pays existe, ce sont les dix-huit
fichiers ci-dessus qui choisissent, et eux seuls. **Le compagnon ne doit pas devenir le
dix-neuvième**, parce qu'un compagnon qui connaît la France est un compagnon qu'il faudra réécrire
en entier, phrase par phrase, pour un second pays. Il ne saura jamais qu'il y en a un.

⚠️ **Et ce qui n'est PAS demandé dans cette tranche, pour qu'on ne le lise pas entre les lignes :**
on ne construit pas le sélecteur de pays, on n'ajoute aucun champ `pays`, et on ne rend aucun des
dix-huit sites générique. Le principe anti-dérive s'applique : aucune tâche manuelle répétée du
terrain ne le désigne aujourd'hui. Ce qu'on fait ici est plus modeste et coûte un test : on
s'assure que le compagnon n'ajoutera pas un dix-neuvième site à défaire.

## 6. Les automatismes, et leur source

Chaque ligne nomme la source qui existe DÉJÀ au dépôt, et ce qu'elle supprime. Aucun automatisme de
cette liste ne repose sur une source à inventer.

| # | Ce qui n'est plus demandé | La source, au dépôt | Ce que ça supprime |
| --- | --- | --- | --- |
| A1 | **Le taux de retard stipulé** | `tauxRetardPourcent`, lu par le modèle dans les CGV déposées (`import/preuve.ts:102`, appel facturé) et déjà composé en constat affiché (`preuve.ts:206`). Il meurt parce que `consignerLectureInterne` (`convex/recouvrement/pieces.ts`) ne prend pas l'argument. | 4 à 5 frappes par débiteur, et surtout une SOUS-RÉCLAMATION, l'inverse exact de la raison d'être du produit |
| A2 | **La qualité de commerçant du débiteur** | `qualiteCommercantDeLaForme()` (`pays/france/commercialite.ts`, sourcée sur L210-1, testée, livrée aux commits `bd5ca8a` et `a4ba936`) appliquée à `debiteurs.formeJuridique`, écrite depuis le BODACC. Aujourd'hui `debiteurs.estCommercant` n'est écrit qu'une fois dans tout le dépôt, avec la valeur littérale `'unknown'` (`convex/recouvrement/import.ts:119`), et `creances.ts:288` le lit : `entreCommercants` ne peut donc JAMAIS valoir `ok`. | 1 question par créance, indéfiniment |
| A3 | **L'adresse du débiteur** | `EtablissementPropose.adresse`, rendue par le BODACC et déjà affichée sous chaque candidat. `renseignerSirenInterne` (`convex/recouvrement/debiteurs.ts:129`) ne patche que `siren` et `formeJuridique` ; `debiteurs.adresse` (`tables.ts:286`) est un orphelin complet. | Les deux paragraphes d'excuse que `RechercheCommissaire` et `RechercheAvocat` écrivent sur une prémisse fausse, et débloque le département du commissaire et le barreau. ⚠️ **Cet automatisme SUPPOSE le carnet** : les deux recherches et `ui/choix-intervenant.tsx` doivent avoir une destination, sans quoi A3 débloque quelque chose qui n'existe plus (§ 4.5, section Intervenants) |
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

**Ce qui reste irréductible, et qu'on ne cherche pas à automatiser.** ⚠️ **Chaque ligne porte
désormais l'écran qui l'accueille** : la première écriture listait cet irréductible sans dire où il
se saisit, alors qu'elle supprimait par ailleurs les écrans qui portaient deux de ces champs.

| Ce qui reste à saisir | Pourquoi | Où, après la refonte |
| --- | --- | --- |
| L'adresse e-mail d'un invité et son rôle | Ça engage | `/app/compte`, section Équipe, en ligne |
| **La date d'un fait de procédure** | Elle court depuis le FAIT, pas depuis la saisie | **Volet de preuve, section 6**, où le champ de `ui/suivi-procedure.tsx:160` migre tel quel, avec sa règle |
| Le choix entre deux combinaisons de lettrage de même total | Deux réponses également vraies : le logiciel ne peut pas trancher | Rangée de la file, deux boutons de même poids |
| La saisie exacte qui confirme une suppression | C'est le geste qui prouve l'intention | `/app/compte`, `ui/confirmation-par-saisie.tsx` |
| Une contestation reçue hors du logiciel | Aucune source ne la porte | Volet de preuve, section 7, où le journal en est le SEUL point d'entrée |
| Le choix d'une voie de procédure | Le produit n'a pas le droit de le recommander | Volet de preuve, section 6, énumérées sans ordre, jamais classées |
| **Une coordonnée d'intervenant saisie à la main** | Un carnet privé n'est pas un registre public | `/app/compte`, section Intervenants (`origine: 'SAISI_A_LA_MAIN'`) |

---

## 7. Les parcours, avant et après

### Parcours A : constituer une créance jusqu'à qualification

⚠️ **Le cas mesuré a été renommé, parce que la première écriture se contredisait en trois lignes.**
Elle annonçait « cas favorable, aucune contestation », puis faisait confirmer une réserve lue sur le
bon de livraison, c'est-à-dire **une contestation écrite**, le fait `CONTESTATION_ECRITE` de
`litige.ts:85`. Le chiffre vedette « 13 à 17 appuis vers 2 » était donc mesuré sur une créance
CONTESTÉE, et présenté comme le cas favorable. Le cas est le bon ; c'est son nom qui était faux.

**Cas mesuré :** débiteur déjà identifié, 3 factures, **un bon de livraison qui porte une réserve**.

**Avant, mesuré :** 4 routes plus 1 volet, soit **5 surfaces**, et **13 à 17 appuis**, 0 saisie
clavier. Onglet Débiteurs (1), appui sur le débiteur pour ouvrir le volet sans adresse (1), 3 cases
cochées une par une (3, `debiteur-detail.tsx:470`), « Constituer une créance » (1), rangée Litige
(1), 6 questions posées UNE À UNE (6, `ui/questionnaire-litige.tsx:71` rend `questions[0]` seule), 0
à 4 conditions légales. Débiteur sans SIREN ni secteur : 16 à 20 appuis.

**Après :** **1 surface, 2 appuis, et les deux confirment des choses DIFFÉRENTES** (D6, § 4.1).

- **Appui 1, la COMPOSITION :** « Retenir la créance, 3 factures, 31 200,50 € », avec ce que
  `controle.ts` chiffre comme exclu. Il n'emporte rien d'autre.
- **Appui 2, la RÉPONSE DE LITIGE :** la proposition est sous la question avec sa source (A4),
  « Proposé : oui, réserve lue sur BL-2024-77, p. 1 ». Un tap la retient. **Sans ce tap, le fait
  reste `unknown`** et la qualification le dit.
- **Zéro appui pour la qualité de commerçant :** elle se déduit de la forme relevée au registre
  (A2), elle ne se confirme pas.
- Les cinq autres questions ne se posent pas : `questionsRestantes()` rend `[]` dès qu'un fait de
  litige vaut `OUI` (`litige.ts:307-308`).

**Gain : 5 surfaces vers 1 (moins 80 %), 13 à 17 appuis vers 2 (moins 85 %).** Sur un portefeuille
de 30 créances : 390 à 510 appuis deviennent 60.

⚠️ **Le cas VRAIMENT favorable coûte plus cher, et il faut le dire.** Quand aucune pièce ne porte de
réserve, `questionsRestantes()` ne s'arrête sur rien : les six questions restent ouvertes. Deux
sorties honnêtes, et aucune ne se cache : soit le gérant répond aux six (2 + 6 appuis), soit il n'y
répond pas et **les six faits restent `unknown`**, ce que la rangée écrit en toutes lettres avec sa
conséquence. `lireLitige()` traite déjà l'indéterminé comme une abstention, et **l'absence de
contestation connue n'est pas une absence de contestation**. Le produit n'a aucune source qui dise
qu'une facture n'est pas contestée, et il ne l'inventera pas pour faire baisser un compteur d'appuis.

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
même quand une source lève, isolée PAR SOURCE DE RANGÉES.

⚠️ **Le motif d'isolement doit DÉMÉNAGER avant que son fichier ne parte.** La première écriture le
prenait pour modèle « dans `barre.tsx` », qui est précisément le fichier que cette spec supprime :
`Facultatif` n'est défini qu'à `src/app/barre.tsx:93`, et nulle part ailleurs dans le dépôt. Livrer
la file en supprimant la barre emporterait donc le motif avec elle, et la file se rendrait sans
isolement du tout, c'est-à-dire avec le défaut exact que B1 existe pour empêcher. **Premier geste de
la tranche : extraire `Facultatif` dans `src/ui/`, avant toute suppression**, et laisser `barre.tsx`
l'importer de là jusqu'à sa propre disparition.

**B2. Le lexique interdit est balayé SUR LA SORTIE DU MODÈLE, au point d'usage.** `lignes-rouges`
balaie l'interface ; il ne balaie pas ce que le modèle vient d'écrire. Le filtre s'applique avant
rendu, sur le lexique entier (« garantie », « garanti », « assuré de », « récupérez ce qui vous est
dû », « ne perdez plus un euro », « sécurisé », « maximum »), **lève en nommant le terme trouvé, et
ne remplace jamais en silence.**

**B3. Aucun ÉNONCÉ JURIDIQUE non résolu n'est rendu.** ⚠️ **Élargie : elle ne portait que sur une
référence légale écrite, et laissait passer le droit dit sans article.** Le filtre s'applique AVANT
RENDU, au point d'usage, sur toute phrase qui affirme un délai, une prescription, un taux, une
indemnité, une qualité, une condition d'exigibilité ou un effet de droit, **qu'elle cite un article
ou non**. Elle résout vers une entrée de `parametres.ts`, ou elle n'est pas rendue, et le refus est
affiché en nommant ce qui manque. Raison : un numéro inventé recopié dans un courrier au débiteur est
plus dangereux qu'une source absente, parce qu'il a l'air vérifiable, et « ce type de créance se
prescrit par cinq ans » est plus dangereux encore, parce qu'il n'a même pas l'air d'une citation.

**B4. Aucun montant sans pastille de source, et le contrôle est un FILTRE, pas un test de fichiers.**
⚠️ **Sa nature a changé.** La première écriture la décrivait comme « un test qui parcourt les rendus
du compagnon », c'est-à-dire un balayage de code, qui ne peut rien voir d'une phrase qu'un modèle
compose à l'exécution. **Le contrôle s'applique AVANT RENDU, au point d'usage** : la sortie du modèle
passe par une fonction qui refuse de rendre tout montant non relié à un décompte, **lève en nommant
le montant trouvé, et ne remplace jamais en silence.** Le test de fichiers reste, en second rideau,
pour vérifier qu'aucun chemin de rendu ne contourne ce filtre. C'est la leçon déjà écrite au dépôt :
une invariante tenue à N endroits se perd au premier ajout, donc on la tient au point d'usage ET on
balaie les contournements.

**B5. Aucun bouton d'envoi dans le sous-arbre d'un brouillon.** Un test balaie `src/ui/` et échoue
si un composant d'envoi cohabite avec un objet de type projet-de-courrier. Raison : une commande
absente ne s'active jamais par accident ; une commande grisée, si.

**B6. Aucune phrase ne porte le CHAMP LEXICAL de la procédure, et le balayage s'applique à la sortie
du modèle, au point d'usage.**

⚠️ **C'est la correction la plus importante de cette révision sur une ligne rouge.** La première
écriture faisait de B6 un contrôle de PRÉFIXE : « un test échoue si une puce COMMENCE PAR "Faut-il",
"Que faire", "Quelle procédure", "Devez-vous", "Engagez", "Je vous conseille" ». Un contrôle de
préfixe laisse passer tout ce qui ne commence pas par la formule surveillée :

- « Vous pourriez saisir le tribunal » : passe.
- « La voie la plus rapide ici est l'injonction de payer » : passe, et classe une voie, ce que même
  l'écran actuel ne fait pas.
- « Examiner les procédures envisageables pour cette creance. » : **passe, et c'est du texte DÉJÀ EN
  PRODUCTION** (`surveillance.ts:384`, champ `action` de `CREANCE_MURE`). Le balayage existant
  (`src/ui/__tests__/lignes-rouges.test.ts`) ne le voit pas non plus : son motif est une liste
  d'impératifs (`engager une procédure`, `engagez `, `faire signifier`, `assignez`, `mettez en
  demeure`, `saisissez le tribunal`, `vous devriez`, `nous vous recommandons`), et « Examiner les
  procédures envisageables » n'en contient aucun.

**La forme qui tient :** le contrôle porte sur le CHAMP LEXICAL de la procédure, n'importe où dans la
phrase : le lexique des actes (assignation, injonction, référé, requête, commandement, mise en
demeure, signification, saisie, tribunal, greffe, mandataire), celui des modaux de conseil (pourriez,
devriez, faudrait, conviendrait, recommandé, conseillé, il est préférable, le plus rapide, le mieux)
et celui des comparatifs qui CLASSENT une voie. Il s'applique **avant rendu, au point d'usage**, sur
ce que le modèle vient d'écrire, **lève en nommant le terme trouvé, et ne remplace jamais en
silence**, exactement comme B2.

**Deux conséquences à assumer :**

1. Le lexique est LARGE, donc il mordra sur des phrases légitimes. **C'est voulu** : une suggestion
   refusée se réécrit, une recommandation de procédure rendue ne se rattrape pas. Le refus est
   affiché, jamais avalé.
2. **L'énumération des voies du volet de preuve (§ 4.2, section 6) est déterministe et ne passe pas
   par ce filtre**, parce qu'elle ne sort pas du modèle. C'est la frontière : le produit a le droit
   d'ÉNUMÉRER sans ordre ce que du code écrit ; le compagnon n'a pas le droit d'en PARLER.
3. `surveillance.ts:384` se réécrit dans la même tranche, en constat : ce que la créance établit, et
   rien sur ce qu'on pourrait en faire.

**B7. Aucun lot sur une qualification ni sur un arrêt de décompte** (D6). Un test échoue si un
bouton de lot est monté dans le sous-arbre d'une qualification ou de l'écran d'arrêt.

**B8. Aucun pourcentage sur un critère juridique** (D8). Un test échoue sur un `%` rendu à côté
d'un état de qualification ou d'une sortie de modèle.

**B9. Le pli ne mange jamais une hypothèse, ni une perte chiffrée.** Un test échoue si une rangée
portant une hypothèse retenue, une facture `nonChiffree` ou une ligne écartée d'un dépôt entre dans
une rangée comptée.

**B10. Le brouillon de courrier ne passe par aucun appel modèle.** Un test échoue si le module qui
produit un projet de courrier importe un client de modèle. Raison : le seul garde-fou qui empêche
aujourd'hui un débiteur de lire le nom d'un tiers est un test sur le composeur DÉTERMINISTE
(`__tests__/relance.test.ts:82`, `:217`). Une phrase composée par le modèle rendrait ce test vert et
le courrier faux.

**B11. Aucun nom de tiers dans un brouillon, vérifié AVANT RENDU.** Le texte du brouillon passe par
un filtre au point d'usage qui refuse tout nom d'intervenant du carnet et tout nom d'organisation
autre que le créancier et le débiteur de la créance, **et lève en nommant celui qu'il a trouvé.**
Raison : ligne rouge 1 : un débiteur qui lit le nom d'un tiers dans le courrier y voit un mandat de
chaîne, c'est-à-dire du recouvrement pour compte de tiers.

**B12. Les TROIS refus de `relance.ts` sont rendus, jamais contournés.** Un test échoue si un chemin
d'interface produit un brouillon alors que `composerRelance()` a rendu `disponible: false`, quelle
qu'en soit la cause : la suspension sur un débiteur en procédure collective ou radié
(`relance.ts:144-168`), le niveau 3 indisponible faute de mentions obligatoires relevées
(`relance.ts:273-300`), et **le niveau 2 sans décompte arrêté** (`relance.ts:226-235`). Le constat du
refus s'affiche à la place du brouillon, avec ce qui lui manque, nommé.

⚠️ **Le troisième n'était pas relevé dans la première écriture**, qui n'en comptait que deux. C'est
pourtant celui qui compte le plus pour D0, parce que c'est le seul des trois qui **se lève** : la
rangée porte « Arrêter le décompte » à 48 px, et le niveau 2 devient disponible au retour. Un refus
qui a un geste et qu'on rend sans le geste est le pire des deux mondes.

**B13. Toute table neuve portant `organizationId` est citée dans `rgpd.ts`.** Ce n'est pas une
barrière à écrire : `src/lib/convex/__tests__/purge-complete.test.ts` existe et mord déjà. Elle est
citée ici parce que les **quatre** tables de § 5.8 tombent dessus, `remisesAuConseil` comprise, et
qu'elle est la seule barrière de cette liste qu'on ne peut pas oublier sans qu'un test rouge le dise
le jour même. Son critère exact : la chaîne `'<nom de table>'`, guillemets compris, doit apparaître
dans `rgpd.ts` (test, lignes 80-91).

**B14. Aucun refus muet** (D0). Toute fonction qui refuse un résultat DESTINÉ À L'ÉCRAN rend un
objet de refus à quatre champs : ce qu'on peut faire tout de suite, ce qui manque, ce qui le lève,
ce que coûte l'attente. Un test échoue si un chemin de rendu affiche un refus dont le premier champ
est vide, ou qui n'est qu'une chaîne. Raison : un mur muet est un défaut. Le modèle existe au dépôt,
à mi-chemin : `Relance` porte déjà `constat` ET `blocages` quand elle refuse (`relance.ts:121-124`)
au lieu d'un message unique. B14 porte cette forme de deux champs à quatre, et l'applique partout.

⚠️ **Ce que B14 ne couvre PAS, et c'est délibéré :** les erreurs de développement. `exiger()` sur une
SERIE (`parametres.ts:402-406`) n'atteint jamais l'écran, et transformer ce refus-là en chemin
d'interface rendrait rattrapable une faute qui doit casser le build.

**B15. Le compagnon n'importe aucun module de pays** (D10, § 5.9). Un test échoue si le module qui
compose les phrases du compagnon importe quoi que ce soit sous `verticales/recouvrement/pays/`.
Modèle : `src/lib/socle/__tests__/frontiere.test.ts`. Raison : le pays est aujourd'hui choisi par le
chemin d'import, à dix-huit endroits. Un compagnon qui devient le dix-neuvième est un compagnon à
réécrire phrase par phrase le jour d'un second pays.

**Les barrières existantes restent vertes :** `destinations-existent`, `aucun-ecran-orphelin`,
`fonctions-appelees`, `purge-complete`, `champs-alimentes`, `declare-jamais-alimente`,
`source-citee`, `lignes-rouges`, `frontiere`, `page-ecran`, et
`src/lib/convex/recouvrement/__tests__/tables.test.ts`.

⚠️ **Deux d'entre elles vont mordre pendant la refonte, et c'est normal.**
`destinations-existent` et `aucun-ecran-orphelin` sont exactement les tests qui auraient attrapé les
sept suppressions sans destination que cette révision corrige, à condition que les composants
concernés soient retirés en même temps que leurs écrans, et non laissés en place sans arête
entrante. **Un composant qui survit sans être monté nulle part n'est pas conservé, il est orphelin**,
et c'est la même erreur que celle qu'on vient de réparer, avec un test vert en prime.

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

⚠️ **Trois choses se font AVANT la première rangée, et la première écriture n'en nommait aucune.**
Ce ne sont pas des finitions : chacune rend faux quelque chose que la spec annonce.

1. **Extraire `Facultatif` de `barre.tsx:93` vers `src/ui/`** (B1). Sinon l'isolement par source de
   rangées part avec la barre qu'on supprime.
2. **Réparer `surveillance.ts:374` et `scoring.ts:300` ensemble** (D11, § 4.1). Sinon toute la
   classe `CREANCE_MURE` est annoncée dans les maquettes et ne se produit jamais. ⚠️ **Les deux
   lignes partent dans la même tranche** : ne réparer que `surveillance.ts` laisserait deux
   définitions de « mûre », celle de la file et celle d'`eligible` que `screens/creance.tsx:245`
   rend sous le libellé « Mûre pour une procédure ».
3. **Réécrire `surveillance.ts:384` en constat** (B6). Sinon la file naît en portant, dès sa première
   rangée, une phrase que la ligne rouge 3 interdit et que le balayage actuel ne voit pas.

**On ne supprime pas `chatModel.ts` plus tard.** Il part AVANT la première ligne du compagnon.
Raison : c'est le seul endroit du dépôt qui parle d'un compagnon, il ne décrit rien qui existe, et
le laisser en place pendant qu'on en construit un vrai est la meilleure façon de brancher le
mauvais modèle.

---

## 10. Les questions qui restent à Jules

**Quatre des huit sont tranchées, le 17 septembre 2026.** Elles restent écrites ici, avec la phrase
de Jules et le renvoi vers la décision, parce qu'une question effacée est une question qu'on repose
dans six mois.

### Q1. TRANCHÉE le 17/09/2026, décision D9 (§ 4.1)

> « Il faut isoler par créance et ou par client avoir le choix de la vue quoi. »

La question était : par quoi un gérant pense-t-il son portefeuille, par échéance ou par client ? La
réponse est **les deux, au choix explicite du gérant**. Un `Segmented` de deux positions dans la
`Toolbar`, Par créance en défaut, Par client à un tap, retenu par `usePreference`. Le défaut reste
l'échéance parce que la prescription est le seul argument de vente qui fasse perdre un droit sans
que personne n'ait rien fait. **Reste vrai, et reste la première chose à faire :** vérifier les deux
vues au navigateur, aux quatre largeurs, avec des données réelles, avant d'écrire une ligne d'écran.

### Q2. TRANCHÉE le 17/09/2026, décision D10 (§ 5.9)

> « Oui le compagnon part avant la validation du juriste en s'assurant avec les textes de lois et en
> veillant à utiliser le système multi juridique déjà en place (partie France). »

Le compagnon part maintenant, sous deux conditions qui sont la décision : toute référence légale se
résout par le registre (B3), et une valeur `verifie` non `valideParAvocat` autorise à calculer, à
expliquer et à préparer, jamais à produire un acte. **Réponse aux deux sous-questions :**

1. **Le premier `exigerPourActe()` n'est PAS câblé dans cette tranche**, parce que le produit
   n'émet aucun acte : le décompte est arbitré sous `exiger()` (`piece.ts:19`) et le dossier du
   conseil aussi (D12, § 4.4). **Et c'est écrit noir sur blanc en § 3.5**, pour que personne ne
   relise `parametres.ts` dans six mois en croyant qu'un verrou est en place. Le jour où un module
   émet un acte, c'est lui la porte, et il refuse sur les quinze paramètres.
2. **Les paramètres ne sont PAS validés avant la livraison du compagnon.** Ce que le gérant verra en
   premier n'est donc pas un refus, mais un constat en quatre parties à l'endroit où le chiffre
   s'affiche, une fois par surface (§ 5.9). ⚠️ **La réserve de la question tient toujours et se
   transforme en point de vérification :** il faut le regarder à l'écran avant de le montrer à
   quelqu'un, parce qu'une mention honnête mal placée se lit comme un produit qui doute de lui.

### Q3. Combien de propositions par jour, au maximum ? OUVERTE

C'est le risque numéro un de la refonte : quarante propositions par jour produisent quarante
« Retenir » à l'aveugle et une piste d'audit qui MENT, ce qui est strictement pire que l'état actuel
où le gérant sait au moins qu'il a coché lui-même. Le remède est un plafond, pas une meilleure mise
en page.

**Le défaut chiffré que je propose : SEPT propositions par jour ouvré et par établissement**, plus
une règle de grain, **jamais plus de trois sur une même rangée ouverte**.

**D'où sort le sept.** Du budget de temps mesuré en § 1, pas d'une intuition : cinq minutes par
session de travail, et une proposition se LIT avant d'être tapée (sa phrase, sa source, sa page).
Sept propositions lues et décidées tiennent dans cinq minutes au rythme mesuré au parcours A, et
laissent intactes les deux minutes du coup d'oeil hebdomadaire. Au-delà, le gérant ne décide plus,
il acquitte.

⚠️ **Deux garde-fous, sans lesquels le plafond devient le défaut qu'il devait empêcher :**

1. **Le plafond ne s'applique JAMAIS à une échéance qui éteint un droit.** Une rangée de
   prescription ne compte pas dans les sept. Un plafond qui avale la seule chose pour laquelle le
   produit existe est pire que pas de plafond.
2. **Ce qui dépasse est COMPTÉ et NOMMÉ, jamais tronqué en silence.** « 7 propositions aujourd'hui,
   12 autres en attente, les voir. » C'est exactement le défaut de
   `MODE_COMPACT = { limite: 3, versDetail: '/app/revelation' }` (`accueil.tsx:164`), où les alertes
   4 à N ne sont atteignables nulle part, et il ne se refait pas.

**Comment on le mesurera, avec trois nombres que `propositions` porte déjà** (§ 5.8) :

1. **Le taux de rétention.** Retenues / (retenues + écartées), par jour de file. S'il monte au-dessus
   de 95 % **pendant que le nombre de propositions par jour monte**, ce n'est pas de la justesse,
   c'est du « Retenir » à l'aveugle. Les deux courbes se lisent ensemble ou ne disent rien.
2. **Le délai entre l'affichage et le tap.** Deux horodatages sur la même ligne. Une médiane sous
   deux secondes sur une proposition qui porte une source et une page est un tap, pas une lecture.
3. **Le taux de correction APRÈS coup.** Une proposition retenue puis corrigée, que le journal
   enregistre avec son état avant et après (§ 5.6). **C'est le seul des trois qui ne soit pas
   auto-référentiel**, parce que la correction vient du monde réel et pas de l'interface.

**Comment le plafond bouge.** Il DESCEND quand 1 monte et 2 descend ensemble. Il ne monte que si 3
reste à zéro sur un mois plein, chez plusieurs établissements. ⚠️ **Aucun de ces trois nombres
n'existe avant les premiers utilisateurs : sept est une HYPOTHÈSE DATÉE**, écrite ici pour être
déplacée, exactement comme `SEUIL_QUALIFICATION` l'est dans son propre commentaire
(`scoring.ts:150-158`, « une hypothèse de départ, à recalibrer sur le taux de contestation
réellement observé »).

**Ce qui reste à ratifier :** on préfère une file courte et vraie à une file complète et fausse, et
on l'assume commercialement.

### Q4. Un plafond mensuel de conversation par établissement ? OUVERTE

Environ 5,5
centimes par question, aucun plafond côté conversation aujourd'hui (§ 5.7). 8 à 11 € par mois pour
un gérant bavard, en coût variable adossé à un prix fixe. Faut-il un plafond dur, un plafond mou
qui prévient, ou rien pour l'instant ?

### Q5. Le champ de saisie libre part-il avec la file ? OUVERTE

La position tenue
dans cette spec est non : les propositions d'abord, la conversation quand B2, B3 et B4 sont vertes.
Une thèse « compagnon en permanence » livrée sans sa muselière met le produit hors la loi. À
confirmer, parce que c'est ce qui décale la partie la plus visible de la demande.

### Q6. Que devient la palette de recherche du chantier 2 ? OUVERTE

Elle vient d'être livrée, elle porte 5
racines `Popup`, et une file avec des puces de portée recouvre une partie de son usage. Elle reste
utile pour trouver une facture par sa référence. Faut-il la garder telle quelle, ou la fondre dans
la file ? **Non tranché dans cette spec, à dessein : elle a coûté une tranche entière et elle n'a
pas encore été regardée à l'usage.**

### Q7. TRANCHÉE le 17/09/2026, décision D12 (§ 4.4)

> « Il faut qu'on puisse suivre aussi le dossier qui passe par le conseil bien évidemment ! »

La question posée était étroite (sous quel verrou vit le dossier) ; la réponse de Jules a déplacé le
sujet, et elle a raison de le déplacer. **Le dossier ne finit pas en PDF téléchargé : son état vit
dans le produit**, en quatre états, avec les dates du FAIT, et la file continue de compter pendant
qu'il est parti. § 4.4 écrit le cycle de vie, la table `remisesAuConseil` et sa purge.

**Et le verrou suit de D0 et D10 : `exiger()`, avec la mention en tête qui nomme l'état de chaque
valeur.** Refuser le document à un avocat au motif qu'un avocat ne l'a pas validé serait un mur
circulaire, et c'est exactement ce que D0 interdit ; le lui donner sans dire ce qu'il tient serait
pire. La mention porte les chiffres réels : douze valeurs relevées sur une source publique citable,
trois non relevées, zéro validée par un juriste. **Le refus dur se garde pour le jour où le produit
émettra un acte** (§ 3.5, refus 1).

### Q8. TRANCHÉE le 17/09/2026, décision D11 (§ 4.1)

> « Une créance mûre c'est ça oui. »

Réponse à la proposition 1 des trois : **une créance mûre, c'est toutes conditions établies et aucun
bloquant**, pas un score au-dessus d'un seuil. Le critère déterministe est déjà calculé
(`scoring.ts:294-297`), il ne déplace aucun seuil juridique, et il est cohérent avec D8 qui sort le
score de l'écran.

⚠️ **Une chose que Q8 sous-estimait, et qui est réparée en § 4.1 :** la proposition 1, telle qu'elle
était écrite, ne touchait que `surveillance.ts:374`. Elle aurait laissé `eligible` inchangé dans
`scoring.ts:300`, donc DEUX définitions de « mûre » dans le produit, celle de la file et celle que
`screens/creance.tsx:245` rend sous le libellé « Mûre pour une procédure ». **Les deux lignes partent
dans la même tranche**, et `SEUIL_QUALIFICATION` reste déclaré en perdant son dernier lecteur, ce qui
est une décision de tranche à prendre le jour même (§ 4.1).

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
9. **Aucune des sept destinations du tableau de § 4.6 n'est vide.** On change d'établissement, on se
   déconnecte, on corrige une adresse de créancier, on date un fait de procédure, on ouvre le carnet,
   on relit le bilan d'un dépôt d'il y a trois semaines, et on lit le supplément.
10. **Un total de tête qui ne sait pas tout chiffrer nomme ce qu'il n'a pas chiffré**, sous lui, sans
    geste.
11. **Une confirmation ne confirme qu'une chose**, et son libellé nomme laquelle. Aucun tap
    n'emporte deux qualifications juridiques.
12. **Une sortie de modèle qui porte un terme du champ lexical de la procédure, un montant sans
    source ou un énoncé juridique non résolu ne s'affiche pas**, et le refus nomme le terme trouvé.
    Vérifié en faisant ÉCHOUER le filtre, pas en le regardant passer.
13. **Les quatre tables neuves sont citées dans `rgpd.ts`**, `remisesAuConseil` comprise, et
    `purge-complete.test.ts` est vert.
14. **Aucun refus n'est muet** (D0). On ouvre chacun des refus de § 3.5 et on lit quatre parties :
    ce qu'on peut faire, ce qui manque, ce qui le lève, ce que l'attente coûte. ⚠️ **Vérifié en
    PROVOQUANT les refus**, pas en relisant le code : un paramètre `verifie: false` sur un segment,
    un décompte qui écarte une facture connue, un niveau 2 sans décompte arrêté, un débiteur en
    liquidation au registre.
15. **Les trois refus qui restent refusent toujours**, et chacun nomme ce qu'il protège : aucun acte
    sur valeur non validée, aucune relance au nom du client, aucune recommandation de procédure.
16. **On bascule entre les deux vues avec une ligne ouverte, et le volet ne se ferme pas** (D9). On
    le fait dans les trois cas de § 4.1, y compris sur une facture sans débiteur identifié, qui
    apparaît dans sa rangée nommée et jamais nulle part. On recharge la page : la vue est celle
    qu'on avait choisie.
17. **Une rupture d'habitude de paiement se lit sans ouvrir un client**, dans la vue Par client, et
    son constat est arithmétique, sans verbe d'action.
18. **Une créance dont les quatre conditions sont établies et qui ne porte aucun bloquant entre dans
    la file** (D11), et aucun pourcentage ni aucune teinte de seuil ne l'accompagne.
19. **Un dossier remis au conseil se suit sans quitter la file** (D12) : la puce porte son compte,
    la rangée reste pleine, la prescription continue de s'afficher avec son angle mort déclaré, et
    l'écart entre le décompte figé et le montant du jour est décomposé.
20. **Le compagnon n'importe aucun module de pays** (B15), et une valeur non validée par un avocat
    produit un constat en quatre parties, une fois par surface, jamais un blocage.
