# Politique de confidentialité

> **Version 2.7** du 16 octobre 2026 (la prospection de Letikette, l'équipe de Letikette et la double authentification, sections 5, 8 bis, 9, 10 et 11). **Version 2.6** du 16 octobre 2026 (l'accompagnement à l'utilisation et les conseils de Plume, sections 5 et 9). **Version 2.5** — 15 octobre 2026 (la mesure d'audience, sections 5 et 7). **Version 2.4** — 14 octobre 2026 (l'abonnement par formules, section 3). **Version 2.3** — 13 octobre 2026 (l'analyse de la santé des clients, sections 4.6, 5 et 7). **Version 2.2** — 13 octobre 2026 (la connexion des logiciels par Nango, section 7). **Version 2.1** — 12 octobre 2026 (le coffre-fort des documents, sections 9 et 10). Rédigée au regard des articles 12 à 14 du règlement
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
| Abonnement | identifiants client et abonnement, formule et rythme, statut, dates de l'essai et du prochain prélèvement, raison facultative d'une résiliation | via Paddle |
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

### 4.6 L'analyse de la santé des clients, et leurs dirigeants

À la demande du client, puis chaque mois tant qu'un débiteur lui doit de l'argent, le Service
analyse la santé de ce débiteur, ou d'une entreprise que le client s'apprête à servir.

- **Ce qui est lu** : des données publiques, relevées par **Pappers** (INSEE, registre du commerce,
  comptes déposés) et par le journal officiel des entreprises (BODACC) : l'état de l'entreprise,
  ses procédures collectives, ses comptes et leur confidentialité, ses dirigeants et les sociétés
  qu'ils dirigent ou ont dirigées, avec leurs jugements d'ouverture de procédure collective ; et
  l'historique de paiement du débiteur chez le client.
- **Les dirigeants sont des personnes** : leur nom, leur qualité, leur date de prise de poste et
  les sociétés qu'ils dirigent s'affichent. Leur **date de naissance** sert seulement à les
  rapprocher de leurs autres sociétés ; elle n'est pas conservée. Un rapprochement incertain
  (homonymes, date de naissance absente) n'attribue rien.
- **Ce qui n'est jamais lu** : aucune donnée relative aux condamnations, aux infractions ou aux
  sanctions personnelles (faillite personnelle, interdiction de gérer, listes de sanctions), dont
  l'article 46 de la loi Informatique et Libertés réserve le traitement à d'autres ; aucune liste
  tenue par d'autres créanciers. Rien n'est mutualisé : l'analyse d'un débiteur vit dans
  l'établissement qui l'a demandée.
- **Aucune décision automatique** (article 22 du RGPD) : l'indice résume des faits ; le client
  décide seul de livrer, de demander un acompte ou de fixer un plafond.
- **Base légale** : l'intérêt légitime du créancier à évaluer le risque de crédit qu'il prend (art.
  6.1.f). **Durée** : l'analyse est remplacée à chaque relecture (l'historique garde vingt-quatre
  indices au plus) et s'efface avec le compte du client.
- **Droit d'opposition** : comme pour toute donnée de ses débiteurs, Letikette agit ici pour le
  compte du créancier (section 1). Un dirigeant ou un débiteur adresse sa demande au créancier
  (section 11) ; Letikette l'aide à y répondre et efface l'analyse sur sa demande.

---

## 5. Finalités et bases légales

| Finalité | Base légale | Référence |
|---|---|---|
| Créer et gérer le compte, fournir le Service | **Exécution du contrat** | art. 6.1.b |
| Envoyer les courriels de service : vérification d'adresse, réinitialisation de mot de passe, invitation d'un collègue, point quotidien | **Exécution du contrat** | art. 6.1.b |
| Facturer et encaisser | **Obligation légale** et exécution du contrat | art. 6.1.c et 6.1.b |
| Conserver les pièces comptables | **Obligation légale** | art. 6.1.c, art. L123-22 c. com. |
| Surveiller les échéances, la prescription et la solvabilité des débiteurs | **Intérêt légitime** du créancier | art. 6.1.f |
| Analyser la santé des débiteurs et le parcours de leurs dirigeants (section 4.6) | **Intérêt légitime** du créancier à évaluer son risque de crédit | art. 6.1.f |
| Assurer la sécurité et prévenir la fraude | **Intérêt légitime** | art. 6.1.f |
| Mesurer l'audience du site et l'usage du Service, en statistiques agrégées | **Intérêt légitime** à améliorer le Service | art. 6.1.f |
| Suivre où en est votre compte (provenance de l'inscription, étapes franchies, indice d'activité) pour vous accompagner | **Intérêt légitime** à faire réussir l'utilisation du Service | art. 6.1.f |
| Vous envoyer les conseils de Plume dans vos premières semaines (quatre au plus) | **Intérêt légitime**, avec opposition en un clic | art. 6.1.f |
| Permettre à l'équipe de Letikette d'accompagner les comptes, et journaliser ses accès | **Intérêt légitime** à assister les clients et à sécuriser l'administration du Service | art. 6.1.f |
| Prospecter des entreprises qui ne sont pas clientes, par leurs contacts professionnels (section 8 bis) | **Intérêt légitime** à présenter le Service, avec opposition à tout moment | art. 6.1.f |

**Les données des clients ne servent à aucune prospection commerciale ni à aucun profilage
publicitaire.** Letikette prospecte des entreprises qui ne sont pas encore clientes (section 8 bis) ;
elle ne prospecte jamais les débiteurs de ses clients, ni à partir de leurs données.

**Mesure d'audience.** Le site et le Service comptent leurs pages vues et quelques gestes d'usage
(une inscription, un dépôt de documents, l'activation des relances, une question posée à Plume, une
souscription) avec **Umami**, sans cookie ni identifiant de visiteur. Avant chaque envoi, les
identifiants de la base sont retirés de l'adresse de la page, les paramètres et le fragment de
l'adresse ne partent pas, et aucun événement ne porte de nom, de montant ni d'adresse. **La page où
un débiteur consulte ce qu'il doit et les coordonnées de virement n'est jamais mesurée** : le script
ne s'y charge pas. Le réglage « Ne pas me pister » du navigateur est respecté.

**Accompagnement.** Pour savoir ce qui vous a mené à Letikette et vous accompagner dans vos premières
semaines, le Service garde, pour chaque établissement : la page d'entrée et le site d'origine de
la visite qui a mené à l'inscription (avec ses éventuels paramètres de campagne), les étapes
franchies et leur date (entreprise renseignée, factures déposées, relances activées, abonnement),
et un indice d'activité de 0 à 100. **Jamais le contenu d'un dossier** : ni débiteur, ni facture,
ni montant. Ces informations ne sont vues que par Letikette ; elles servent à choisir le prochain
conseil de Plume et les comptes que l'équipe contacte, et ne produisent aucune décision qui vous
concerne juridiquement. La provenance de la visite est gardée dans l'onglet du navigateur le temps
de la visite, sans cookie, puis jointe à l'inscription ; elle n'est pas notée sur la page où un
débiteur consulte ce qu'il doit. Les conseils de Plume se coupent dans Votre compte, puis Votre
profil, ou par le lien présent en bas de chacun d'eux.

**Cookies.** Le Service dépose un **cookie de session d'authentification**, strictement nécessaire à
son fonctionnement et exempté de consentement au titre de l'article 82 de la loi Informatique et
Libertés. Aucun cookie de mesure d'audience, de publicité ou de réseau social. Des préférences
d'affichage peuvent être conservées dans le navigateur ; elles ne quittent pas l'appareil. La mesure
d'audience (ci-dessus) ne dépose aucun cookie.

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
| **Umami** (Umami Cloud) | Mesure d'audience, sans cookie (section 5) | Adresse de la page sans identifiant, page précédente, type d'appareil et de navigateur, langue, taille d'écran, adresse IP de la requête, gestes d'usage sans donnée de dossier ; jamais la page de paiement d'un débiteur | **États-Unis et Union européenne**, selon ses sous-traitants (ClickHouse, Hetzner, AWS) |
| **Opendatasoft / DILA** | Publication du BODACC, interrogé à la demande | Dénomination recherchée (section 4.4) | France |
| **Qonto** | Connexion comptable, à l'initiative du client | Factures de vente et identité de leurs destinataires | France |
| **Pappers** | Lecture des données publiques d'une entreprise pour l'analyse de sa santé (section 4.6) | SIREN interrogé ; nom, prénom et mois de naissance d'un dirigeant pour retrouver ses autres sociétés | France |
| **Nango Inc** | Connexion aux logiciels de facturation et de comptabilité (Pennylane, QuickBooks, Xero, Sellsy, Stripe, Zoho), à l'initiative du client | Accès au logiciel, conservés chiffrés ; factures de vente et identité de leurs destinataires, en transit seulement | **États-Unis** (société de droit américain, hébergement AWS) |

**Nango ne conserve pas les factures.** Il garde l'accès que le client lui a confié (un jeton
d'autorisation ou une clé en lecture seule, chiffrés en AES-256-GCM) et relaie nos lectures ; son
relais note l'adresse, la méthode et le statut de chaque requête, jamais leur contenu, et efface ces
journaux après quinze jours. Les factures lues ne sont enregistrées que chez Letikette. La clé dont
Letikette dispose chez Nango ne permet pas de lire l'accès du client. Débrancher un logiciel, ou
supprimer le compte, supprime cet accès chez Nango.

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

## 8 bis. La prospection de Letikette

Letikette présente son Service à des entreprises qui ne sont pas encore clientes. Elle est, pour ce
traitement, **responsable de traitement**.

**Ce qui est traité.** Pour chaque entreprise : sa dénomination, son SIREN, son activité, son
effectif et sa ville ; pour la personne contactée, **son nom, sa fonction, son adresse électronique
et son téléphone professionnels** ; la source du contact ; l'état de l'échange (contactée,
relancée, a répondu, intéressée, inscrite) et les notes de l'équipe sur ces échanges.

**D'où viennent ces données.** De sources publiques ou professionnelles (annuaires
professionnels, registre du commerce, site de l'entreprise, salon, recommandation), et la source
est **notée pour chaque contact** (« Trouvé où »). Les données n'étant pas collectées auprès de la personne,
l'article 14 du RGPD s'applique : la présente section vaut information, et le premier message
qu'elle reçoit dit qui écrit et comment s'y opposer.

**Base légale.** L'**intérêt légitime** de Letikette à présenter son Service à des professionnels
(article 6.1.f), pour un message en rapport avec leur activité.

**Qui y accède.** La seule équipe de Letikette. Ces données ne sont rattachées à aucun établissement
client, ne sont jamais montrées à un client et ne sont jamais croisées avec le contenu de ses
dossiers.

**Opposition.** Toute personne peut s'y opposer à tout moment, en répondant au message reçu ou à
bonjour@letikette.com. Ses coordonnées (nom, fonction, adresse électronique, téléphone) sont alors
**effacées**, et son adresse n'est plus conservée que sous une **empreinte irréversible**
(SHA-256), dans une liste d'opposition qui empêche qu'elle soit de nouveau importée ou contactée.

**Durée.** Un prospect est **effacé automatiquement trois ans après le dernier contact** (ou, à
défaut de contact, après son ajout), avec les notes et les tâches qui le concernent ; un contrôle
s'exécute chaque nuit.

---

## 9. Durées de conservation

**Cette section dit ce qui est fait, pas ce qui serait souhaitable.** Les écarts sont nommés.

| Donnée | Durée appliquée aujourd'hui |
|---|---|
| Journal d'acheminement des courriels | **90 jours**, effacés automatiquement |
| Invitations | jusqu'à leur acceptation ou leur révocation ; le lien expire au bout de 7 jours |
| Compte utilisateur, établissement, et toutes les données du client | **jusqu'à la suppression de l'établissement**, qui les efface intégralement |
| Pièces comptables et factures d'abonnement | **10 ans** (art. L123-22 c. com.), détenues par le prestataire de facturation |
| Journal des accès aux documents (dépôt, ouverture, téléchargement, retrait) | **jusqu'à la suppression de l'établissement** |
| Jetons d'ouverture d'un document | **une minute**, à usage unique ; les jetons expirés sont effacés chaque nuit |
| Parcours du compte (provenance, étapes, indice d'activité) et journal des conseils envoyés | **jusqu'à la suppression de l'établissement**, qui les efface |
| Notes, tâches et journal de l'équipe de Letikette portant sur un établissement | **jusqu'à la suppression de l'établissement**, qui les efface |
| Prospects (section 8 bis) | **trois ans après le dernier contact**, effacés automatiquement ; la liste d'opposition ne garde que des empreintes |

**Ce que la suppression d'un établissement efface** : la totalité des données cloisonnées par
établissement, **fichiers de stockage compris** — pièces déposées, documents importés, logo, photo
de profil. C'est vérifié par un test automatisé qui échoue si une table nouvelle échappe à la purge.

**SIX ÉCARTS, ÉNONCÉS PLUTÔT QUE MASQUÉS.** Les corriger relève du produit ; les taire serait
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
> 5. **Un prospect devenu client n'est pas effacé par le délai de trois ans**, et sa fiche de
>    prospection n'est pas effacée avec l'établissement : seul le lien vers le compte l'est. Elle
>    s'efface sur demande.
> 6. **Les entrées du journal de l'équipe qui ne portent sur aucun établissement** (une invitation,
>    un import de prospects) n'ont pas de durée automatique.

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
- authentification par clé d'accès (*passkey*) disponible, et **double authentification** par code
  à usage unique (application d'authentification, avec codes de secours) disponible pour tout
  compte ;
- **accès de l'équipe de Letikette à l'administration du Service réservé à des membres nommés**,
  chacun avec un rôle, une adresse vérifiée et la double authentification obligatoire ; l'équipe
  voit l'établissement, son abonnement, ses membres et son parcours, **jamais le contenu des
  dossiers** (débiteurs, factures, montants, documents, courriers), et une barrière automatisée
  borne ce que l'administration peut lire ; **chaque ouverture de la fiche d'un client par l'équipe est
  journalisée** ;
- cloisonnement strict des données par établissement, appliqué à chaque requête serveur et vérifié
  par des tests automatisés ;
- jetons des connexions bancaires **chiffrés en base** (AES-256-GCM) ;
- **documents déposés chiffrés au repos dès leur arrivée** — factures importées et pièces des
  dossiers — en AES-256-GCM, sous une clé propre à chaque établissement, elle-même chiffrée par
  une clé maîtresse conservée hors de la base de données ; le fichier d'origine, en clair, est
  effacé une fois le document scellé ;
- format de chaque document vérifié dans son contenu à l'arrivée (un fichier dont le contenu ne
  correspond pas à son extension est refusé), et empreinte SHA-256 relevée au dépôt puis
  revérifiée à chaque ouverture ;
- **aucun lien public durable vers un document** : il s'ouvre par la session de l'utilisateur,
  au moyen d'un jeton à usage unique valable une minute ; chaque dépôt, ouverture, téléchargement
  et retrait est inscrit dans un journal que l'établissement consulte depuis l'application ;
- à la suppression de l'établissement, sa clé de chiffrement est effacée **en premier** : ses
  documents deviennent illisibles avant même que leurs fichiers soient effacés ;
- accès nominatifs, sans compte partagé ;
- en-têtes de sécurité : `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` fermant caméra,
  microphone et géolocalisation ;
- secrets d'exploitation conservés hors du code source et hors du dépôt.

**Ce que ce chiffrement ne fait pas, dit en clair.** Les clés sont détenues par les serveurs du
Service : le chiffrement protège les fichiers stockés (une copie du stockage, une adresse de
fichier qui fuiterait), il ne met pas les documents hors de portée de l'exploitant du Service. Ce
n'est pas un chiffrement « de bout en bout ». Pour être lu, un document est déchiffré en mémoire,
le temps de sa lecture, et son contenu peut être transmis au prestataire de lecture (section 6.1).

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

**Si Letikette vous a contacté pour vous présenter le Service** (section 8 bis), Letikette est
responsable de ce traitement et répond directement ; votre opposition prend effet dès sa réception.

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
