# Politique de confidentialité

> **Version 2.0** — 23 septembre 2026. Rédigée au regard des articles 12 à 14 du règlement
> (UE) 2016/679 (RGPD) et de la loi n° 78-17 du 6 janvier 1978 modifiée.
>
> **Chaque fait de ce document a été relevé dans le logiciel lui-même**, et non déclaré.

---

## 1. Une précision liminaire : deux rôles, et une personne qui n'est pas notre client

Letikette intervient à **deux titres différents**, et la distinction commande tout le reste.

**En qualité de responsable de traitement**, pour les données de compte et de relation
commerciale : identité des utilisateurs, adresses électroniques, informations de l'établissement,
facturation, journaux techniques. Également pour l'annuaire professionnel décrit à la section 8.

**En qualité de sous-traitant**, pour tout ce qui concerne **les créances du client et ses
débiteurs**. Sur ces données, c'est le client qui détermine les finalités et les moyens — il
recouvre ses propres créances ; Letikette n'agit que sur son instruction. Ces traitements sont
régis par l'[accord de sous-traitance](./04-accord-de-sous-traitance.md).

**Et une troisième catégorie, qui mérite d'être nommée d'emblée.** Le Service traite des données
concernant des **débiteurs** : des entreprises, et parfois des personnes physiques, qui ne sont ni
nos clients, ni nos utilisateurs, qui n'ont consenti à rien et que nous ne contactons jamais. La
section 4 leur est consacrée. C'est la catégorie la plus exposée du Service, et la version
précédente de ce document ne la mentionnait pas.

---

## 2. Responsable de traitement

**Jules-Camille Doré**, entrepreneur individuel, exploitant sous le nom commercial Letikette.
SIREN 879 853 026, non inscrit au RCS, inscrit au RNE. Coordonnées aux
[mentions légales](./01-mentions-legales.md).

Une société par actions simplifiée unipersonnelle est envisagée. Tant qu'elle n'est pas
immatriculée, l'éditeur est l'entreprise individuelle ci-dessus, et c'est elle qui répond.

**Contact pour toute question relative aux données** : bonjour@letikette.com

Aucun délégué à la protection des données n'a été désigné, la désignation n'étant pas obligatoire
au regard de l'article 37 du RGPD.

---

## 3. Données traitées en qualité de responsable

| Catégorie | Données | Origine |
|---|---|---|
| Compte | nom, adresse électronique, état de vérification, langue, image | fournies par l'utilisateur |
| Authentification | mot de passe sous forme de condensat ; le cas échéant, clé publique de justificatif (*passkey*), nom d'appareil, type d'appareil | fournies par l'utilisateur |
| Session | **adresse IP**, agent utilisateur, jeton, expiration | générées à la connexion |
| Profil | établissement courant, photo téléversée **ou** avatar décrit par un style et une graine | fournies par l'utilisateur |
| Établissement | raison sociale, SIRET facultatif, volume de factures émises par an, logo, pays, devise, fuseau | fournies par le client |
| Invitations | adresse électronique de la personne invitée, rôle proposé, jeton de lien | fournies par le client |
| Abonnement | identifiants client et abonnement, palier, statut, fin de période | via Paddle |
| Acheminement des courriels | identifiant d'envoi, type d'événement, horodatage | générées par Resend |

**L'adresse IP n'est stockée qu'à un seul endroit du Service** : la table des sessions ouvertes.
Elle n'alimente aucune mesure d'audience et n'est jamais recoupée.

**L'avatar ne sort jamais du navigateur.** Il est redessiné localement par une bibliothèque
embarquée dans l'application ; aucune requête n'est faite à un tiers pour l'afficher.

**Aucune donnée sensible au sens de l'article 9 du RGPD n'est collectée.** Le client s'engage par
ailleurs à ne pas en déposer, conformément aux [conditions générales](./02-conditions-generales.md).

---

## 4. Les débiteurs : des personnes qui ne sont pas nos clients

C'est la section que la version précédente n'avait pas, et c'est la plus importante.

### 4.1 Ce qui est traité

Pour chaque client de notre client — le **débiteur** — le Service conserve : la dénomination, les
différentes graphies rencontrées, le SIREN, la forme juridique, la qualité de commerçant, le
secteur de la relation commerciale, l'adresse postale, **l'adresse électronique** lorsqu'elle est
connue, les factures impayées et leurs montants, les échéances, les règlements observés et le délai
habituel de paiement.

S'y ajoutent deux données que **le Service produit lui-même** : un **état de santé financière** à
quatre valeurs (inconnue, saine, procédure collective, radiée) et l'**état précédemment connu**,
dont la comparaison permet de constater une dégradation.

**Un débiteur peut être une personne physique** — un entrepreneur individuel désigné par son nom.
Le Service ne distingue pas ce cas des sociétés : les mêmes données sont traitées.

### 4.2 Base légale et information

Ces données ne sont **pas collectées auprès de la personne concernée**. L'article 14 du RGPD
s'applique : la présente section vaut information.

Le traitement repose sur l'**intérêt légitime** (article 6.1.f) du créancier à recouvrer ses
créances et à connaître la solvabilité de ses cocontractants. Le client, responsable de ce
traitement, en assume la qualification.

### 4.3 Ce que Letikette ne fait pas, et qui limite le traitement

**Letikette n'écrit jamais au débiteur.** Le Service prépare des textes de relance que **le client**
envoie depuis **sa propre messagerie**, sous **sa propre signature**. Aucun courriel envoyé par
Letikette n'a jamais un débiteur pour destinataire — c'est vérifié dans le code : les six chemins
d'envoi du Service ne s'adressent qu'à des titulaires de compte.

Letikette **ne recommande aucune procédure** et ne porte aucune appréciation juridique. Le Service
énonce des constats vérifiables ; la décision d'agir appartient au client.

Letikette **ne manipule aucun fonds**.

### 4.4 Le registre public, et deux traitements qu'il ne faut pas confondre

**La surveillance quotidienne n'expose aucune donnée.** Chaque nuit, le Service télécharge le flux
national des annonces publiées la veille au Bulletin officiel des annonces civiles et commerciales
(BODACC) et le rapproche **localement**, par numéro SIREN. Aucun nom de client, aucun nom de
débiteur ne quitte le Service à cette occasion. C'est l'inverse de ce que l'on suppose
spontanément, et c'est vérifiable dans le code.

**La recherche à la demande, elle, transmet un nom.** Lorsque l'utilisateur demande d'identifier un
débiteur — ou son propre établissement — au registre, la dénomination recherchée est transmise en
clair au service qui publie le BODACC (Opendatasoft, pour la DILA). Ce traitement ne se déclenche
que sur son geste.

**Le constat du registre est recopié mot pour mot**, sans reformulation : identifiant de l'annonce,
date de parution, nature du jugement telle que le registre l'écrit, tribunal et lien. Le
reformuler serait en proposer une lecture juridique.

### 4.5 Les notifications nomment les débiteurs

Les messages affichés dans l'application portent le nom du débiteur et le montant dû — « la
situation de X a changé », « X, Y € restant dû ». Ce sont des données de tiers, conservées dans une
table rattachée à l'utilisateur destinataire, et effacées avec son compte.

---

## 5. Finalités et bases légales

| Finalité | Base légale | Référence |
|---|---|---|
| Créer et gérer le compte, fournir le Service | **Exécution du contrat** | art. 6.1.b |
| Envoyer les courriels de service : vérification d'adresse, réinitialisation de mot de passe, invitation d'un collègue, point quotidien | **Exécution du contrat** | art. 6.1.b |
| Facturer et encaisser | **Obligation légale** et exécution du contrat | art. 6.1.c et 6.1.b |
| Conserver les pièces comptables | **Obligation légale** | art. 6.1.c, art. L123-22 c. com. |
| Surveiller les échéances, la prescription et la solvabilité des débiteurs | **Intérêt légitime** du créancier | art. 6.1.f |
| Assurer la sécurité et prévenir la fraude | **Intérêt légitime** | art. 6.1.f |

**Aucune donnée n'est traitée à des fins de prospection commerciale, de profilage publicitaire ou
de mesure d'audience.**

**Cookies.** Le Service dépose un **cookie de session d'authentification**, strictement nécessaire à
son fonctionnement et exempté de consentement au titre de l'article 82 de la loi Informatique et
Libertés. Aucun cookie de mesure d'audience, de publicité ou de réseau social. Des préférences
d'affichage peuvent être conservées dans le navigateur ; elles ne quittent pas l'appareil.

---

## 6. Le point le plus important : vos données sont hébergées aux États-Unis

**Cette section mérite une lecture attentive.** Elle porte sur deux transferts distincts, et le
premier concerne **toutes** les données, pas seulement les documents déposés.

### 6.0 L'hébergement lui-même

La base de données, le stockage des fichiers et l'exécution des fonctions du Service sont assurés
par **Convex, Inc.**, dans la région **`aws-us-east-1`**, c'est-à-dire **aux États-Unis**.

Cela concerne l'intégralité des données du Service : comptes, établissements, factures, créances,
décomptes, débiteurs, pièces déposées. Ce n'est pas un transfert accessoire — c'est le lieu
d'hébergement.

**Cette région se fixe à la création du déploiement et ne peut pas être modifiée.** En changer
supposerait une migration vers un nouveau déploiement. Convex propose également `aws-eu-west-1`.

Le transfert est encadré par les **clauses contractuelles types** adoptées par la Commission
européenne. L'application elle-même — la partie qui s'exécute à la réception d'une requête — est
hébergée par Vercel en région `fra1`, à Paris ; mais les données qu'elle lit et écrit sont aux
États-Unis.

Convex propose également une région européenne. Un changement supposerait une migration vers un
nouveau déploiement ; si elle est décidée, elle sera annoncée dans les conditions de la section 13.

### 6.1 Ce qui est transmis à un prestataire de lecture, et ce qui ne l'est plus

Pour lire un document que l'utilisateur dépose, le Service en transmet le **fichier entier** au
prestataire **Anthropic PBC**, société de droit américain, via son interface de programmation. Le
fichier part tel quel, sans rognage ni conversion en images : l'intégralité de ce qui y figure est
transmise — raison sociale et adresse, numéro de facture, libellés, quantités, montants, et le cas
échéant le nom d'un contact ou toute autre mention.

**Trois traitements empruntent ce chemin**, et aucun autre : la lecture d'un document déposé, la
lecture d'une pièce justificative rattachée à un dossier, et les échanges avec l'assistant intégré.

### 6.2 L'exception, et elle est récente

**Une facture électronique n'est pas transmise.** Depuis septembre 2026, lorsque le fichier déposé
porte une facture structurée — un PDF embarquant un Factur-X, ou un fichier XML au format CII — le
Service **la lit entièrement sur son propre serveur**. Aucun appel à un prestataire, aucune donnée
sortante, et des montants lus au centime exact plutôt qu'interprétés.

C'est un progrès pour la confidentialité autant que pour l'exactitude, et il s'étendra : à mesure
que la facturation électronique devient la norme, la part des documents qui doivent sortir diminue.

### 6.3 Pourquoi ce transfert existe encore

Lire une facture en PDF non structuré, un scan de travers, une photographie prise au téléphone, est
précisément ce que le Service automatise. Tant que des documents non structurés circulent, ce
traitement est nécessaire à l'exécution du Service.

### 6.4 Encadrement du transfert

Les États-Unis ne bénéficiant pas d'une décision d'adéquation générale applicable à ce prestataire,
le transfert est encadré par les **clauses contractuelles types** adoptées par la Commission
européenne, complétées par l'accord de traitement des données conclu avec le prestataire.

La durée de conservation des données transmises et les conditions de leur utilisation sont celles
de cet accord.

### 6.5 Absence de décision automatisée

Aucune décision produisant des effets juridiques n'est prise de façon exclusivement automatisée au
sens de l'article 22 du RGPD.

Le Service **mesure et constate** : il calcule un décompte décomposable période par période, il
relève des échéances, il cite un registre public. Il ne décide de rien. Il ne recommande aucune
procédure, n'envoie aucune relance, et affiche systématiquement ce qu'il ignore — un critère
indéterminé compte comme absent, jamais comme acquis. **Toute décision appartient au client.**

---

## 7. Destinataires et sous-traitants ultérieurs

| Destinataire | Rôle | Données | Localisation |
|---|---|---|---|
| **Convex, Inc.** | Base de données, stockage des fichiers, exécution des fonctions | **Toutes** | **États-Unis**, région `aws-us-east-1` (section 6.0) |
| **Vercel Inc.** | Hébergement de l'application | Trafic, journaux | Exécution en région `fra1`, Paris |
| **Anthropic PBC** | Lecture des documents non structurés | Contenu intégral des documents transmis (section 6) | **États-Unis** |
| **Resend, Inc.** | Acheminement des courriels de service | Adresse et contenu des courriels de service **uniquement** | **États-Unis** |
| **Paddle.com Market Ltd** | Facturation, vendeur de registre | Identité et moyens de paiement | Royaume-Uni |
| **Opendatasoft / DILA** | Publication du BODACC, interrogé à la demande | Dénomination recherchée (section 4.4) | France |
| **Qonto** | Connexion comptable, à l'initiative du client | Factures de vente et identité de leurs destinataires | France |

**Resend ne voit jamais un débiteur.** Les seuls courriels acheminés sont ceux qui s'adressent à un
titulaire de compte : vérification d'adresse, réinitialisation de mot de passe, invitation d'un
collègue, point quotidien. Aucune relance ne transite par ce prestataire, puisque aucune relance
n'est envoyée par Letikette.

**Better Auth** n'est pas un destinataire : l'authentification s'exécute dans notre propre
infrastructure, à partir d'une bibliothèque installée dans le dépôt.

**Aucune donnée n'est vendue, louée ou cédée à un tiers.**

Chaque sous-traitant ultérieur est tenu par contrat aux mêmes obligations que celles souscrites
par l'Éditeur, qui demeure responsable de leur exécution.

---

## 8. L'annuaire des auxiliaires de justice

Le Service tient un annuaire professionnel d'avocats, constitué à partir de sources publiques, et
**partagé entre tous les clients**.

Il porte, pour chaque personne : **nom, prénom**, barreau, le cas échéant raison sociale, SIREN,
adresse, code postal, ville, spécialités déclarées, et la date du relevé.

**Ce sont des données à caractère personnel concernant des personnes physiques**, collectées
auprès d'une source publique et non auprès des intéressés : l'article 14 du RGPD s'applique, et la
présente section vaut information. La base légale est l'**intérêt légitime** (article 6.1.f) à
permettre à un créancier de trouver un professionnel compétent près du tribunal concerné.

**Cet annuaire n'est rattaché à aucun établissement client**, et il ne suit donc pas la suppression
d'un compte : il n'est pas une donnée du client. Toute personne y figurant peut demander sa
rectification ou son effacement à bonjour@letikette.com.

> Cette section remplace celle qui décrivait un référentiel de libellés produits. Ce référentiel
> appartenait au produit précédent, et il était anonyme. **L'annuaire, lui, ne l'est pas.**

---

## 9. Durées de conservation

**Cette section dit ce qui est fait, pas ce qui serait souhaitable.** Les écarts sont nommés.

| Donnée | Durée appliquée aujourd'hui |
|---|---|
| Journal d'acheminement des courriels | **90 jours**, effacés automatiquement |
| Invitations | jusqu'à leur acceptation ou leur révocation ; le lien expire au bout de 7 jours |
| Compte utilisateur, établissement, et toutes les données du client | **jusqu'à la suppression de l'établissement**, qui les efface intégralement |
| Pièces comptables et factures d'abonnement | **10 ans** (art. L123-22 c. com.), détenues par le prestataire de facturation |

**Ce que la suppression d'un établissement efface** : la totalité des données cloisonnées par
établissement, **fichiers de stockage compris** — pièces déposées, documents importés, logo, photo
de profil. C'est vérifié par un test automatisé qui échoue si une table nouvelle échappe à la purge.

**QUATRE ÉCARTS, ÉNONCÉS PLUTÔT QUE MASQUÉS.** Les corriger relève du produit ; les taire serait
promettre ce qui n'est pas fait.

> 1. **Aucune durée de conservation automatique ne s'applique au contenu du client.** Factures,
>    créances, décomptes et débiteurs vivent tant que l'établissement vit. L'effacement se demande ;
>    il ne survient pas de lui-même.
> 2. **La résiliation de l'abonnement ne déclenche aucun effacement.** Il n'existe pas aujourd'hui
>    de lien automatique entre la fin du contrat et la purge.
> 3. **L'effacement d'un débiteur ou d'une facture pris isolément n'est pas outillé.** Une demande
>    visant une seule personne ne peut recevoir, à ce jour, d'autre réponse technique que la
>    suppression de l'établissement entier. C'est l'écart le plus gênant, et il est nommé comme tel.
> 4. **Les sessions expirées et les invitations expirées ne sont pas purgées.** Les premières
>    portent une adresse IP et un agent utilisateur.

### Pourquoi la durée est courte sur les documents du client, quand elle s'applique

L'obligation décennale de conservation des pièces comptables pèse **sur le client**, sur ses propres
exemplaires. Letikette n'en détient qu'une copie de travail, nécessaire à l'exécution du Service.
Une fois le contrat terminé, cette copie n'a plus de fondement, et la conserver dix ans
contreviendrait au principe de minimisation. Le client doit donc **exporter ce dont il a besoin**
et satisfaire ses propres obligations d'archivage de son côté.

---

## 10. Sécurité

Les mesures suivantes sont **effectivement en place** et vérifiables :

- chiffrement des échanges en transit, HTTPS strict avec en-tête `Strict-Transport-Security`
  (`max-age=63072000; includeSubDomains`) ;
- mots de passe stockés sous forme de condensats, jamais en clair ;
- longueur minimale de douze caractères, imposée **côté serveur** et non seulement à la saisie ;
- authentification par clé d'accès (*passkey*) disponible ;
- cloisonnement strict des données par établissement, appliqué à chaque requête serveur et vérifié
  par des tests automatisés ;
- jetons des connexions bancaires **chiffrés en base** (AES-256-GCM) ;
- accès nominatifs, sans compte partagé ;
- en-têtes de sécurité : `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` fermant caméra,
  microphone et géolocalisation ;
- secrets d'exploitation conservés hors du code source et hors du dépôt.

Aucun système n'étant infaillible, l'Éditeur s'engage à notifier toute violation de données dans les
conditions des articles 33 et 34 du RGPD, soit à la CNIL dans les soixante-douze heures et aux
personnes concernées lorsque le risque est élevé.

---

## 11. Vos droits

Toute personne dispose des droits d'**accès**, de **rectification**, d'**effacement**, de
**limitation**, d'**opposition** et de **portabilité**, ainsi que du droit de définir des directives
relatives au sort de ses données après son décès.

Ces droits s'exercent à **bonjour@letikette.com**. Une réponse est apportée dans un délai d'un mois,
prorogeable de deux mois en cas de complexité, conformément à l'article 12.3 du RGPD.

**Si vous êtes un débiteur** et que vous exercez un droit sur des données vous concernant : Letikette
agit comme **sous-traitant** de son client, qui est le créancier. Votre demande doit être adressée à
ce client, responsable du traitement. Nous lui prêtons assistance sans nous substituer à lui, et
nous pouvons vous indiquer à qui vous adresser.

**Si vous figurez à l'annuaire des auxiliaires de justice** (section 8), Letikette est responsable de
ce traitement et répond directement.

**Réclamation.** Toute personne peut introduire une réclamation auprès de la Commission nationale de
l'informatique et des libertés, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, ou sur
`www.cnil.fr`.

---

## 12. Caractère obligatoire des données

Les données marquées comme requises à l'inscription sont **nécessaires à l'exécution du contrat**.
À défaut, le Service ne peut être fourni.

Les données facultatives — le numéro d'identification de l'établissement, le volume de factures
émises par an, une photo de profil — peuvent être omises sans conséquence sur l'accès au Service.

---

## 13. Modification

Toute modification substantielle est notifiée par courriel **trente jours** avant son entrée en
vigueur.

**Version 2.0** — réécrite le 23 septembre 2026, en vigueur à la date de sa mise en ligne.
