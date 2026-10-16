# Le service client : Plume d'abord, l'équipe dans le même fil (16/10/2026)

> Le fondateur, le 16/10/2026 : « un module de service client humain avec tout un système
> automatisé de chat bot qui utilise Plume puis ensuite qui renvoie vers un humain au service
> client […] Inspire-toi des meilleurs. » Ses choix, le même jour : **dans l'application et par
> e-mail entrant** ; **Plume support ne lit que le produit et le compte, jamais les dossiers** ;
> **Plume passe la main à la demande ou quand il bloque** ; spec puis construction d'une traite.

**Recherche** (orchestration de sept agents) : Mobbin sous quatre angles (145 motifs : Intercom Fin
et Inbox, Plain, Front, Help Scout, Zendesk, Gorgias, Monzo, Starling, Revolut, Alan, Linktree,
Wise, Deel…), la réception d'e-mails chez Resend sur sa documentation, la carte du code existant,
une critique de complétude (37 manques). **Relecture adverse** de la première version par trois
agents (lignes rouges et RGPD, expérience, faisabilité) : 4 bloquants et une cinquantaine de
constats, tous tranchés dans cette version 2. Recherches et relectures : `.superpowers/support/`.

## 1. Ce que le module fait

- **Le gérant** ouvre « Aide » et trouve la réponse tout de suite dans la base d'aide, ou pose sa
  question ; **Plume** répond en quelques secondes, sur le logiciel et son compte, avec l'écran qui
  règle la question ; s'il ne peut pas, si c'est une demande d'acte (rembourser, ses données, un
  accès perdu) ou si le gérant le demande, **la conversation passe à l'équipe, à l'instant, dans le
  même fil** ; la réponse humaine arrive dans le fil, et par e-mail si elle n'y a pas été lue.
- **L'équipe Letikette** a, dans `/admin`, une **boîte de réception** : ce que Plume lui a passé et
  ce qui arrive par e-mail, le résumé de ce que Plume a compris, le contexte du compte (jamais un
  dossier), un brouillon de réponse préparé par Plume, des réponses enregistrées, des notes
  internes, et la **mesure**.

## 2. Les règles qui ne se discutent pas

1. **Le produit ne donne jamais un dossier à l'équipe ni à Plume support ; ce que le gérant
   envoie, l'équipe le voit.** Le contexte de Plume support et la colonne de contexte de l'équipe
   passent par UNE requête interne au validateur de retour fait de scalaires (booléens, nombres,
   codes fermés), tenue par une barrière exécutable et par un test sentinelle (§ 12). Les
   conversations de support ont leurs propres tables, jamais `echangesCompagnon`.
2. **Le gérant sait qui lit, avant d'écrire**, à UN endroit (la présentation du fil vide) :
   « L'équipe Letikette peut lire cette conversation : n'y collez ni mot de passe ni données de
   vos clients. » Ce qui se détecte est **masqué côté serveur avant tout stockage et tout envoi au
   modèle** (IBAN à clé juste ; carte à 15 ou 16 chiffres, préfixe d'émetteur et Luhn, jamais un
   SIRET ; clés et jetons aux préfixes publiés), et le fil le dit.
3. **Plume se présente comme un assistant automatique** : la sous-ligne de l'en-tête du fil et la
   légende de chacun de ses messages, vérifiées par un test. Le texte de la loi n'est cité que
   relevé.
4. **Ni Plume ni l'équipe ne donnent d'avis juridique** (ligne rouge n° 3). Une question de droit
   est reconnue par le code (`questionDeDroit`, plus étroite que le détecteur du compagnon, qui
   prend « Comment puis-je activer les relances ? » pour du droit) **avant** le modèle et mène au
   Plume de l'espace ou à la Défense. Plume ne promet aucun geste commercial. Les messages de
   l'équipe et les réponses enregistrées passent par les mêmes filtres : refus net du mot interdit
   et des verdicts, avertissement à confirmer sur les modaux de conseil et les voies de justice.
5. **Un humain est toujours joignable, et le délai dit est vrai.** « Parler à l'équipe » (un seul
   libellé partout) est l'action d'en-tête tant que la conversation est chez Plume. Le délai se
   calcule (`HORAIRES_DU_SUPPORT`, jours fériés, `DELAI_VISE_HEURES_OUVREES`, ou la médiane mesurée
   si elle est plus longue et établie sur vingt réponses au moins) et s'affiche en UN chiffre ;
   passé, le fil et la carte disent « en retard » et la nouvelle estimation. Ni « 24/7 », ni
   position dans une file, ni « l'équipe regarde » (aucune présence n'est mesurée), ni vert.
6. **Aucune surface ne ment sur qui parle.** Les légendes viennent de l'identité vérifiée, jamais
   d'un nom affiché : « Plume · automatique », « Camille · équipe Letikette » (prénom choisi par le
   membre, jamais son adresse), « Vous · par e-mail ». Aucun visage inventé.
7. **Un message envoyé ne se modifie pas.** « Retirer ce contenu » laisse sa trace. Terminer est
   réversible ; écrire rouvre.

## 3. Côté gérant (`/app/aide`)

**Les entrées** : la rangée « Aide » du Compte (valeur « 1 réponse » et son point, déduits de
`luParAuteurLe`) ; « Aide » en **pied de la barre latérale** du bureau, au-dessus du compte (Melio),
avec le même point ; la notification `HUMAN_ASSIST_REPLY` (« Camille vous a répondu »), qui mène
enfin à `/app/aide/$id` ; le geste **« Parler à l'équipe »** du Plume de l'espace (§ 3.4) ;
`?depuis=<écran>` (liste fermée) pour dire d'où l'on vient. Toute la section `/app/aide*` fait
taire la bulle et la capsule du Plume de l'espace (deux Plume sur un écran se contrediraient) ; la
barre d'onglets s'efface sur une conversation (`/app/aide/`).

**L'accueil**, une page plate sous la barre compacte (Monzo, Starling, Rocket Money) :

1. **Un champ : « Demandez à Plume ou cherchez »** ; sous-ligne « Plume répond en quelques
   secondes. L'équipe prend le relais dans le même fil. » Pendant la frappe, les questions de la
   base d'aide qui correspondent ; un toucher **affiche la réponse tout de suite**
   (`/app/aide/question/$cle`, ou le volet droit au bureau), avec l'écran qui la règle et
   « Ce n'est pas ça ? Demander à Plume ». Entrée ouvre une conversation.
2. **Ce qui attend monte** : les conversations de l'auteur en cours, en cartes qui disent qui doit
   agir (« Camille vous a répondu · il y a 36 min » avec la pastille des questions ; « Transmis à
   l'équipe · réponse attendue avant 17 h » ; « Réponse en retard · nous visons demain 11 h »).
3. **Trois questions calculées** sur l'état du compte et le rôle (`questionsDuCompte`) : ce qui ne
   va pas monte (connexion en erreur, document pas entré, relances pas activées, essai pour un
   administrateur), sinon des questions de départ ; puis « Toutes les questions ».
4. **L'équipe** : prénoms et initiales (photo si le membre l'a posée), les horaires lus sur la
   constante, la réponse attendue en un chiffre, « Équipe absente jusqu'au… » si posé, et
   l'adresse e-mail **seulement quand la réception est ouverte** (« Ou écrivez à bonjour@…, depuis
   jules@… : même équipe, même fil »).
5. **Terminées** : les trois dernières, puis « Tout l'historique », par mois.

Quand le budget de Plume est atteint ou que Plume support est fermé (§ 4), la page le dit **avant**
la saisie (« Ce mois-ci, vos questions vont directement à l'équipe »). Au-delà de 1024 px, deux
volets : la page à gauche, la conversation ou la réponse à droite (`/app/aide/$id` rend les deux,
sans route imbriquée).

### 3.1 Le fil (`/app/aide/$id`)

- **Une conversation est privée à son auteur** et lisible par l'équipe Letikette (rôle SUPPORT et
  au-dessus). Elle se lit par son identifiant, l'auteur et son appartenance à l'établissement de
  la conversation étant revérifiés (jamais l'établissement courant).
- **En-tête** : Plume, « Assistant automatique · l'équipe peut aussi répondre » ; l'action texte
  « Parler à l'équipe » tant que la conversation est chez Plume ; puis l'état écrit (« Transmis ·
  réponse attendue avant 17 h », « Avec Camille », « Terminée »).
- **Le fil vide** présente les deux interlocuteurs et la phrase de la règle n° 2, une seule fois ;
  il dit aussi « Ici je connais Letikette et votre compte ; vos dossiers, c'est dans votre espace ».
- **Plume répond sans bulle** ; pendant qu'il réfléchit, les trois points du fil existant. Ses
  phrases portent leur source ; ses écrans sont des cartes qui y mènent (Alan). Une phrase chiffrée
  sans source est retirée.
- **Sous sa dernière réponse seulement** : « Ça répond à votre question ? » — « Oui, merci » (la
  conversation se termine, issue confirmée : c'est l'avis sur Plume) / « Pas vraiment » (Plume
  reformule une fois ; au second, la conversation passe à l'équipe, raison `REFUS`).
- **Le passage a lieu à l'instant** (état `A_NOUS`), quelle que soit sa raison, sans geste à
  confirmer : une carte déjà envoyée, « Transmis à 14 h 02 » — la question en une phrase, ce que
  Plume a répondu, pourquoi il passe la main, l'écran d'où l'on vient — puis « Réponse attendue
  aujourd'hui avant 17 h, ici et par e-mail si vous ne l'avez pas lue. Vous pouvez fermer. »
- **Dès le passage, Plume se tait.** Un nouveau message du gérant reçoit une ligne système
  (« Ajouté à votre demande »), jamais une parole de Plume.
- **L'humain arrive** (Linktree) : « Camille, de l'équipe Letikette, a rejoint la conversation ·
  14 h 10 » (annoncé, `aria-live`), l'en-tête bascule, ses messages en bulles avec son avatar.
- **Terminée** est un fait du fil, jamais un mur : écrire rouvre. Après sept jours, le choix se
  pose au-dessus du compositeur, avant l'envoi : « Écrire ici rouvre ce sujet » / « Nouveau sujet ».
- **L'avis** ne se demande qu'après une conversation terminée par l'équipe, une fois, dans le fil :
  « Vous avez eu la réponse qu'il vous fallait ? » Oui / Non, motifs fermés sur un Non, un mot.
  Jamais après une conversation terminée « sans nouvelles ».

### 3.2 Quand la conversation passe à l'équipe

Liste fermée (`src/lib/support/passage.ts`, testée), appliquée **par le code avant le modèle**,
sauf `LACUNE` et `PANNE` :

| Raison | Déclencheur |
|---|---|
| `DEMANDE` | « Parler à l'équipe », ou une demande écrite d'humain ancrée (« parler à quelqu'un », « un conseiller »), jamais « mon conseil » (l'avocat) |
| `ACTE` | une **demande d'acte** : rembourser, contester un prélèvement, changer l'adresse ou le titulaire du compte, accès perdu (double authentification, codes), droits sur les données personnelles (au FONDATEUR, horloge d'un mois calendaire) |
| `REFUS` | le second « Pas vraiment » |
| `INSISTANCE` | trois messages du gérant d'affilée qui redisent la même chose (similarité mécanique, testée) |
| `LACUNE` | Plume répond qu'il ne peut pas (champ de sa réponse) |
| `PANNE` | l'appel au modèle échoue, dépasse 45 s, ou ses phrases sont toutes retirées par les filtres |
| `PLAFOND` | le budget de Plume du mois est atteint (un seul passage par conversation) ; au-delà du débit d'un gérant, un refus daté, sans passage |
| `FERME` | Plume support est fermé (§ 4) : tout va à l'équipe |
| `EMAIL` | la conversation est née d'un e-mail (§ 5.2) : Plume ne répond pas par e-mail |

**Une question d'information n'est pas un acte** : « Quand serai-je prélevé ? », « Comment
résilier ? », « Ma connexion ne lit plus rien », « J'ai un bug au dépôt » restent chez Plume, qui
répond avec le compte et l'écran qui règle la question ; l'équipe reste à un toucher. Deux
réponses déterministes, sans modèle : **une question de droit** (§ 2.4), et **« arrêtez l'envoi »**
(`ARRETER_LES_ENVOIS`), à laquelle Plume répond tout de suite par deux cartes, « Part bientôt ·
Retenir » et « Couper les relances automatiques », avec le nom des administrateurs à un membre.

### 3.3 Les pièces jointes

**Reportées au lot 8**, avec la serrure du coffre (scellement sous la clé de l'établissement,
format vérifié dans les octets, EXIF retiré, ouverture par un jeton d'une minute journalisée). En
attendant, le fil ne propose pas de joindre, et l'e-mail entrant ne reprend pas les pièces (le fil
le dit). Une capture d'écran de ce produit montre presque toujours des clients et des montants :
c'est le point qui demande le plus de soin, il n'est pas bâclé.

### 3.4 Le pont entre les deux Plume

- Plume support, sur une question de dossier, répond en une phrase et propose « Demander dans
  votre espace », qui ouvre le Plume de l'espace avec la question **dans l'état du routeur**
  (jamais dans l'adresse).
- Le geste **« Parler à l'équipe »** du Plume de l'espace (nouveau genre de geste, ajouté sans rien
  retirer) **navigue** vers `/app/aide` avec la question pré-remplie dans le compositeur, non
  envoyée, sous la ligne « Relisez : l'équipe ne doit lire aucun nom de client. » Rien ne s'écrit
  dans les tables du support avant l'envoi (testé).

## 4. Plume support

- **Ouvert par une variable** (`PLUME_SUPPORT_OUVERT=oui`) : la politique de confidentialité
  promet un préavis de trente jours pour une modification substantielle, et Plume support est un
  traitement nouveau. Fermé, l'Aide fonctionne entière, et toute conversation va à l'équipe
  (raison `FERME`).
- **Ce qu'il lit** : la base d'aide (`src/lib/support/articles.ts`, valeurs lues sur les
  constantes, aucun droit) ; et le **contexte du compte**, scalaires seulement : formule, état de
  l'abonnement, fin d'essai et prochain prélèvement (au seul administrateur), rôle, nombre de
  membres, relances activées, **dossiers à démarrer, relances programmées et l'heure de la
  prochaine, relances bloquées par cause** (e-mail du client, votre e-mail) — des nombres, sans un
  nom —, l'état de chaque logiciel branché en **code fermé** (`A_JOUR`, `LECTURE_ECHOUEE`,
  `ACCES_PERDU`, `REVOQUEE`, jamais le texte brut d'une erreur), le nombre de documents en échec.
- **Comment il répond** : `support.fil.envoyer` (mutation) masque, applique le débit, décide le
  passage par le code, insère le message et, si la conversation est chez Plume, pose
  `plumeReflechitDepuis` et planifie `support.plume.repondre` (action) ; celle-ci lit le contexte,
  appelle le modèle par `extraireAvecClaude` (prompt figé en cache, sortie structurée), filtre, puis
  écrit par `consignerReponse`, qui **revérifie** que la conversation est toujours chez Plume et
  qu'aucun message plus récent du gérant n'est arrivé — sinon la réponse est jetée, son coût compté.
- **Ses filtres** : le mot interdit, les verdicts, les modaux de conseil, les promesses de geste
  commercial, les voies de justice, tout montant sans source `ARTICLE` ou `COMPTE`.
- **Son budget** : par établissement et par mois (`PLAFOND_SUPPORT_MENSUEL`), un plafond global
  (`PLAFOND_SUPPORT_GLOBAL`), un débit par gérant (`MESSAGES_PAR_HEURE`) ; l'usage de chaque appel
  est noté sur son message.

## 5. L'e-mail

### 5.1 Sortant

- **Au gérant** : la réponse de l'équipe, programmée dix minutes plus tard et **annulée si elle a
  été lue dans le fil** (Intercom) ; le rappel d'une conversation qui attend sa réponse (J+3).
  Aucun accusé de passage par e-mail (le fil le dit), aucun lien d'avis, ni pixel ni suivi. Une
  réponse ne part que vers une **adresse vérifiée** (`emailVerified`), sinon elle reste dans le fil.
  Reply-To `fil-<jeton>@<domaine de réception>` et délimiteur « Répondez au-dessus de cette ligne »
  **seulement quand la réception est ouverte** ; sinon « Pour répondre, ouvrez la conversation ».
- **À l'équipe** : « Une conversation vous attend », un lien, jamais le contenu ; au FONDATEUR, à
  75 % du délai sans réponse, et pour un message entrant classé « compromission ».

### 5.2 Entrant

- **La réception s'ouvre par le code, pas par la configuration** (`receptionOuverte()`) : secret du
  webhook posé, domaine de réception posé, et **`RELANCES_EMAIL` sur un domaine distinct** de celui
  d'`AUTH_EMAIL` — sinon des débiteurs écriraient à `bonjour@`, et Letikette « ne reçoit ni […]
  réponse du débiteur » (ligne rouge n° 1). Fermée, la route `POST /resend/reception` répond 200
  sans rien traiter.
- `letikette.com` a ses MX chez Google : la réception se pose sur un sous-domaine (`aide.…`), et
  une règle de routage de la console Google Workspace transfère `bonjour@` vers lui.
- **La route** : signature Svix sur le corps brut (`src/lib/support/svix.ts`), ligne idempotente
  par `email_id`, 200, puis une action lit le message ; un échec laisse la ligne en reprise
  (l'entretien la relance, cinq essais, puis `ECHEC` visible du FONDATEUR).
- **Le tri** (`src/lib/support/tri-entrant.ts`, table de vérité testée) :
  1. seules `bonjour@` et `fil-…@` sont lues ; toute autre adresse est ignorée ;
  2. une réponse automatique (`Auto-Submitted`, `X-Autoreply`, `Precedence`) est ignorée ;
  3. **vérifié** si et seulement si l'adresse est celle, vérifiée, d'un titulaire (l'auteur du fil,
     ou un administrateur de son établissement) **et** DMARC vaut `pass` ; une forme
     d'authentification inconnue vaut « non vérifié » ;
  4. `fil-<jeton>@` vérifié → le message entre dans le fil ; non vérifié → il entre **pour
     l'équipe seule** (« Expéditeur non vérifié · adresse »), jamais montré au gérant ;
  5. un titulaire vérifié sans jeton → sa conversation ouverte de moins de sept jours, sinon une
     nouvelle, **directement à l'équipe** (Plume ne répond pas par e-mail), et un accusé daté,
     marqué automatique (`Auto-Submitted: auto-replied`), une fois par conversation ;
  6. un titulaire non vérifié → une conversation à l'équipe, « non vérifié », sans contexte du
     compte, sans accusé ;
  7. un prospect du CRM → un événement `REPONSE` sur sa fiche ; une demande d'opposition se propose
     à l'équipe en un geste ;
  8. un inconnu → « À trier », **pour le FONDATEUR seul**, corps replié, ouverture journalisée,
     conservé 30 jours, **aucune réponse automatique** (ni rétrodiffusion, ni quatrième surface
     vers un tiers) ;
  9. quel que soit l'expéditeur, une demande sur des **données personnelles** prend l'horloge d'un
     mois, et un signalement de **compromission** alerte le FONDATEUR.
- Rien n'est jeté : un message dont SPF, DKIM et DMARC échouent va en « Indésirables »
  (métadonnées seules, 30 jours, FONDATEUR).
- **Le corps** : le texte, ou le HTML converti en texte sans DOM ; jamais le HTML stocké ; coupé
  à la citation (délimiteur, formules d'en-tête, lignes `>`), le message entier gardé et plafonné à
  100 Ko ; seuls les en-têtes utiles sont gardés (message-id, in-reply-to, references,
  auto-submitted, authentification).

## 6. Côté équipe (`/admin/support`)

- **Barre latérale** : un groupe **Support** (À vous, Ouvertes, En attente du client, Terminées,
  Plume, À trier, Réponses enregistrées, Mesure), chacun avec son compte (`admin.support.compteurs`,
  requête à part). **Au téléphone**, un onglet Support remplace Tâches (les tâches restent dans
  Aujourd'hui), et Aujourd'hui gagne un groupe « À vous » en tête.
- **La file** : des cartes groupées, « À vous » d'abord, le plus ancien en tête : l'établissement
  (ou « Expéditeur non vérifié »), le sujet, le canal, « attend depuis », « réponse promise avant »
  ou « en retard de 20 min » (calculés à l'écran). Au bureau, le tableau triable. Le rôle LECTURE
  voit la file et la mesure, **jamais les messages**.
- **Une conversation** : le fil à quatre voix (gérant, Plume et ses sources, équipe, note interne
  sur fond papier « Le gérant ne verra pas cette note ») ; « Ce que Plume a compris » au point du
  passage ; le compositeur Répondre / Note, **« Brouillon de Plume »** (`equipeAction`, jamais pour
  un fil qui porte un message non vérifié ou d'inconnu), réponses enregistrées et variables, le seul
  bouton plein « Envoyer », « Envoyer et terminer », attribuer, prioritaire, terminer, rouvrir,
  retirer un contenu ; la colonne de contexte (scalaires du § 4, auteur, fiche CRM, conversations
  précédentes) ; le **coupe-circuit** « Suspendre les relances automatiques », sur demande écrite
  d'un administrateur vérifié dans le fil, qui **abandonne aussi les relances déjà programmées**,
  noté au journal, annoncé au gérant ; l'équipe ne réactive jamais. Ouverture journalisée
  (`CONVERSATION_OUVERTE`, libellé neutre pour un inconnu).
- **La mesure** (trente jours, comparés aux trente précédents datés), matérialisée chaque heure
  dans un document global : l'entonnoir, trois médianes en heures ouvrées (première réponse,
  **reprise après Plume**, résolution), le taux de « Oui » de Plume, la satisfaction après l'équipe
  (masquée sous dix avis), le tableau par sujet, et **« Ce que Plume n'a pas su »** (lacunes et
  refus), chacun avec « Créer une tâche » (le sujet et le lien, jamais le texte du gérant).
- **Équipe** : chaque membre choisit son **prénom affiché** et peut poser une photo ; « Équipe
  absente jusqu'au… » (FONDATEUR).

## 7. Les états

`PLUME` → `A_NOUS` (l'horloge court) ⇄ `EN_ATTENTE_CLIENT` → `TERMINEE`. Écrire rouvre. Les
bascules liées au temps passent par l'entretien (toutes les 15 min) : chez Plume, terminée « sans
nouvelles » 24 h après sa dernière RÉPONSE (jamais après un passage) ; en attente du gérant, un
rappel à J+3, terminée à J+7. La première réponse humaine fige sa durée en heures ouvrées.

## 8. Les données (`src/lib/convex/support/tables.ts`)

- `conversationsSupport` { organizationId?, auteurUserId?, adresse?, canal, etat, issue?,
  raisonDePassage?, sujet?, depuis?, assigneA?, prioritaire?, verifiee, jeton, plumeReflechitDepuis?,
  passeeLe?, premiereReponseHumaineLe?, premiereReponseOuvreeMin?, termineeLe?, dernierMessageLe,
  luParAuteurLe?, luParEquipeLe?, nonsConsecutifs, avis?, rappelLe? } — index `by_org`,
  `by_auteur_and_etat`, `by_jeton`, `by_etat_and_dernier`.
- `messagesSupport` { conversationId, organizationId?, auteur, auteurNom?, canal, genre (MESSAGE,
  NOTE, EVENEMENT, NON_VERIFIE), texte, texteEntier?, sources?, ecrans?, evenement?, masques?,
  retireLe?, retirePar?, usage?, mois, le } — index `by_conversation`, `by_org`, `by_org_and_mois`.
- `emailsEntrants` { emailId, organizationId?, etat (A_LIRE, LU, ECHEC, IGNORE, INDESIRABLE),
  essais, prochainEssaiLe?, classement?, conversationId?, de?, objet?, authentification?, recuLe }
  — index `by_email_id`, `by_etat`, `by_org`.
- `reponsesEnregistrees`, `reglagesSupport` (absence), `mesuresSupport` (document global).
- **Purge** : chaque table du support porte `organizationId` et un index `by_org` ;
  `purge-complete.test.ts` lit ce fichier et reconnaît enfin `v.optional(v.id('organizations'))`.
  **Suppression d'un compte** : ses conversations sans établissement partent, l'auteur des autres
  devient « Ancien membre », ses e-mails entrants perdent adresse et en-têtes. **Export** : les
  conversations de l'utilisateur qui exporte, notes de l'équipe comprises. **Rétention** : « À
  trier » et indésirables 30 jours, journal des e-mails entrants 90 jours.
- **Exemption nommée** du multi-tenant : les conversations sans établissement (inconnus, à
  rattacher), 30 jours, jamais lues par Plume.

## 9. Ce que ce module ne fait pas (et pourquoi)

- Aucun accès de l'équipe aux dossiers, même temporaire (« accès de dépannage ») : à décider à part.
- Les pièces jointes : lot 8 (§ 3.3).
- Pas de bulle sur le site public, pas de téléphone, pas de WhatsApp ; pas d'état du service, de
  « problème connu », de fusion, de présence ; pas d'éditeur d'articles (la base d'aide est dans le
  code, sous les barrières) ; pas de réponse automatique aux inconnus.

## 10. Le juridique

**Politique de confidentialité 2.8**, et l'exception dite dans la spec admin : ce que le client
écrit au support, l'équipe le voit. Sections touchées : § 3 (adresse IP : seuls les en-têtes utiles
sont gardés), § 4.3 (les chemins d'envoi vers des tiers : aucun nouveau), § 5 (finalités :
assistance par contrat pour les titulaires, intérêt légitime pour les non-clients et la mesure,
obligation légale pour les demandes de droits), § 6.1 (Plume support et le brouillon de l'équipe
chez Anthropic), § 7 (Resend **reçoit** des e-mails et achemine les relances depuis le 08/10 ;
Google Workspace pour `bonjour@`), § 9 (durées, et deux écarts : la copie gardée 30 jours par
Resend, la copie Gmail si la règle ne la supprime pas), § 10 (l'équipe et le support). **Préavis de
trente jours** avant d'ouvrir Plume support et la réception : c'est le fondateur qui l'envoie.

## 11. Ce que le fondateur fait

1. Poser `RELANCES_EMAIL` sur un domaine neutre (la réception ne s'ouvre pas avant).
2. Envoyer le préavis de la politique 2.8 ; trente jours plus tard,
   `npx convex env set PLUME_SUPPORT_OUVERT oui`.
3. Resend : activer la réception sur `aide.letikette.com`, poser
   `RESEND_RECEPTION_WEBHOOK_SECRET` et `SUPPORT_RECEPTION_DOMAINE` **avant** de créer le webhook
   `email.received` vers `https://<déploiement>.convex.site/resend/reception`.
4. Google Workspace : une règle de routage (console d'administration, sans code de confirmation)
   de `bonjour@` vers `bonjour@aide.letikette.com`, copie supprimée.
5. Vérifier le quota Resend (100 e-mails par jour partagés sur le plan gratuit).
6. Dans `/admin/equipe`, poser son prénom affiché.

## 12. Les tests et les barrières

- Logique pure (`src/lib/support/`) testée d'abord, et sa frontière (ni `convex/`, ni `ui/`).
- **Barrière du contexte** : les fichiers du support sous `convex/` ne lisent que leurs tables et
  une liste fermée de requêtes internes étroites ; pas de `ctx.db.get` hors de la liste ; et un test
  sentinelle sème un client « DURAND-SENTINELLE » et un montant, puis vérifie qu'aucun des deux
  n'apparaît dans le contexte sérialisé.
- `purge-complete` étendu (motif facultatif, fichier lu) ; `rgpd.test` purge un établissement qui
  a des conversations ; `piloteRelances.test` : suspendre le pilote, rien ne part.
- Vocabulaire (`lexique`, `mots-interdits`, `lignes-rouges`) étendu aux écrans et au module, avec
  les exemptions nommées des fichiers qui contiennent exprès ce qu'ils interdisent (`filtres.ts`,
  `passage.ts`, `prompt-support.ts`) ; « régl* » refusé dans le vocabulaire du support (dans ce
  produit, « réglé » veut dire payé).
- Les fonctions publiques ont leur appelant (`equipeAction` ajoutée au motif) ; `destinationDe
  Notification` mène à `/app/aide/$id` ; la salle montre chaque écran ; `Composeur` et
  `PageConversation` paramétrés sont vérifiés à 375 px par empreinte des positions.

## 13. L'ordre de construction

0. **Le pilote et les barrières** : `suspendreLePilote` (abandonne les relances programmées,
   appelée par `activerRelances(false)` et par l'équipe ; `envoyerMaintenant` revérifie), les
   barrières étendues, les variables au schéma.
1. La logique pure du support et ses tests.
2. Les tables, `envoyer`, Plume planifié, la purge, l'export, l'entretien.
3. Les écrans du gérant et leurs entrées.
4. La boîte de l'équipe, les e-mails sortants.
5. `equipeAction`, le brouillon, la mesure.
6. L'entrant, fermé tant que les conditions du § 5.2 ne sont pas réunies.
7. Le pont entre les deux Plume.
8. Les pièces jointes, avec la serrure du coffre.
