# Politique de confidentialité

> Projet du 26 août 2026. À relire par un professionnel avant publication.
> Rédigée au regard des articles 12 à 14 du règlement (UE) 2016/679 (RGPD) et de la loi
> n° 78-17 du 6 janvier 1978 modifiée.

---

## 1. Une précision liminaire : deux rôles distincts

Letikette intervient à **deux titres différents**, et la distinction commande tout le reste.

**En qualité de responsable de traitement**, pour les données de compte et de relation
commerciale : identité des utilisateurs, adresses électroniques, informations de l'établissement,
facturation, journaux techniques. Ces traitements sont décrits aux sections 3 à 8.

**En qualité de sous-traitant**, pour le **contenu des factures déposées** par le client et pour
tout ce qui en est dérivé. Sur ces données, c'est le client qui détermine les finalités et les
moyens ; Letikette n'agit que sur son instruction. Ces traitements sont régis par
l'[accord de sous-traitance](./04-accord-de-sous-traitance.md).

---

## 2. Responsable de traitement

**Jules-Camille Doré**, entrepreneur individuel, exploitant sous le nom commercial Letikette.
SIREN 879 853 026. Coordonnées aux [mentions légales](./01-mentions-legales.md).

**Contact pour toute question relative aux données** : bonjour@letikette.com

Aucun délégué à la protection des données n'a été désigné, la désignation n'étant pas obligatoire
au regard de l'article 37 du RGPD. ⚠️ *À réexaminer si l'activité s'étend à des données sensibles
ou change d'échelle.*

---

## 3. Données traitées en qualité de responsable

| Catégorie | Données | Origine |
|---|---|---|
| Identification | nom, adresse électronique, mot de passe haché | fournies par l'utilisateur |
| Établissement | raison sociale, SIRET, type d'établissement, nombre de couverts par jour | fournies par le client |
| Invitations | adresse électronique de la personne invitée, rôle proposé | fournies par le client |
| Distribution des courriels | identifiant d'envoi, statut de remise, rejet, plainte | générées par Resend |
| Signature de bilan | identité du signataire, horodatage, empreinte du document | générées à la signature |
| Facturation | identité et coordonnées de facturation, historique | via Paddle |
| Journaux techniques | adresse IP, horodatage, page consultée, agent utilisateur | générées automatiquement |

**Aucune donnée sensible au sens de l'article 9 du RGPD n'est collectée.** Le client s'engage par
ailleurs à ne pas en déposer, conformément à l'article 6 des
[conditions générales](./02-conditions-generales.md).

---

## 4. Finalités et bases légales

| Finalité | Base légale | Référence |
|---|---|---|
| Créer et gérer le compte, fournir le Service | **Exécution du contrat** | art. 6.1.b |
| Envoyer les courriels de service : vérification, mot de passe, bilan prêt, produits à confirmer, rappel de campagne | **Exécution du contrat** | art. 6.1.b |
| Facturer et encaisser | **Obligation légale** et exécution du contrat | art. 6.1.c et 6.1.b |
| Conserver les pièces comptables | **Obligation légale** | art. 6.1.c, art. L123-22 c. com. |
| Assurer la sécurité, prévenir la fraude, journaliser | **Intérêt légitime** | art. 6.1.f |
| Répondre à une demande de support | **Exécution du contrat** | art. 6.1.b |

**Aucune donnée n'est traitée à des fins de prospection commerciale, de profilage publicitaire ou
de mesure d'audience.** Le Service ne dépose aucun cookie autre que celui, strictement nécessaire,
qui porte la session d'authentification.

---

## 5. Le point le plus important : les traitements automatisés et le transfert vers les États-Unis

**Cette section mérite une lecture attentive.**

### 5.1 Ce qui est transmis

Pour lire une facture, le Service en transmet **les pages converties en images** au prestataire
**Anthropic PBC**, société de droit américain, via son interface de programmation.

Concrètement, **l'intégralité de ce qui est imprimé sur la facture est transmise** : raison sociale
et adresse du fournisseur, numéro de facture, libellés des produits, quantités, montants, et le
cas échéant le nom d'un contact ou toute autre mention figurant au document.

Dans un second temps, les **libellés de produits normalisés** sont transmis au même prestataire
pour être classés au regard du barème EGalim.

### 5.2 Pourquoi ce transfert existe

La lecture d'une facture scannée, souvent de travers, aux libellés abrégés et parfois altérés par
la reconnaissance de caractères, est précisément ce que le Service automatise. Sans ce traitement,
il n'existe pas.

### 5.3 Encadrement du transfert

Les États-Unis ne bénéficiant pas d'une décision d'adéquation générale, le transfert est encadré
par les **clauses contractuelles types** adoptées par la Commission européenne, complétées par
l'accord de traitement des données conclu avec Anthropic.

⚠️ **À COMPLÉTER — préalable au lancement.** L'accord de traitement d'Anthropic doit être **signé**,
et sa politique de conservation des données d'interface ainsi que l'exclusion d'utilisation à des
fins d'entraînement doivent être **vérifiées au contrat**, et non sur la foi d'une page d'aide.

### 5.4 Absence de décision automatisée

Aucune décision produisant des effets juridiques n'est prise de façon exclusivement automatisée au
sens de l'article 22 du RGPD.

La classification est **proposée**, assortie d'une justification écrite et d'un indice de
confiance. Elle est **confirmée par une personne**. Les lignes relevant des familles viande et
poisson passent systématiquement devant un humain, quel que soit l'indice de confiance. La
déclaration finale est établie et signée par le client.

---

## 6. Destinataires et sous-traitants ultérieurs

| Destinataire | Rôle | Données | Localisation |
|---|---|---|---|
| **Convex, Inc.** | Base de données, stockage des fichiers, exécution | Toutes | ⚠️ À VÉRIFIER |
| **Vercel Inc.** | Hébergement de l'application | Trafic, journaux | Région `fra1`, Paris |
| **Anthropic PBC** | Lecture et classification | Contenu des factures, libellés | **États-Unis** |
| **Resend** | Acheminement des courriels | Adresse, contenu des courriels | Région `eu-west-1`, Irlande |
| **Paddle.com Market Ltd** | Facturation, vendeur de registre | Identité et moyens de paiement | Royaume-Uni |
| **Better Auth** | Authentification, exécutée dans l'infrastructure Convex | Identifiants | idem Convex |

**Aucune donnée n'est vendue, louée ou cédée à un tiers.**

⚠️ **À COMPLÉTER** — la région d'hébergement Convex doit être relevée au tableau de bord. Si elle
est située hors Union européenne, ce transfert doit être ajouté à la section 5 et encadré au même
titre.

---

## 7. Durées de conservation

| Donnée | Durée | Fondement |
|---|---|---|
| Compte utilisateur | Durée du contrat, puis **suppression sous 30 jours** | Minimisation |
| Établissement | Idem | Minimisation |
| Factures déposées et lignes extraites | Durée du contrat, puis **30 jours de réversibilité**, puis suppression | Voir la note ci-dessous |
| Bilans produits | Idem | Idem |
| Invitations non acceptées | **90 jours** | Minimisation |
| Événements de courriel | **12 mois** | Suivi de délivrabilité |
| Journaux de connexion | **12 mois** | art. 6-II LCEN |
| Pièces comptables et factures d'abonnement | **10 ans** | art. L123-22 c. com. |
| Empreintes et signatures de bilan | Durée du contrat, puis 30 jours | Auditabilité |

### Note sur les factures du client, et pourquoi la durée est courte

Il pourrait sembler prudent de conserver dix ans les factures déposées, par alignement sur
l'obligation comptable. **Ce serait une erreur de raisonnement.**

L'obligation décennale de conservation des pièces comptables pèse **sur le client**, sur ses
propres exemplaires. Letikette n'en détient qu'une copie de travail, nécessaire à l'exécution du
Service. Une fois le contrat terminé, cette copie n'a plus de fondement, et la conserver dix ans
contreviendrait au principe de minimisation.

Le client doit donc **exporter ses bilans pendant la période de réversibilité** et satisfaire ses
propres obligations d'archivage de son côté. Les conditions générales le rappellent à leur
article 8.5.

⚠️ **ARBITRAGE — voir le point 8 du [lisez-moi](./00-lisez-moi.md).**

---

## 8. Le référentiel mutualisé de libellés

Le Service tient un référentiel de libellés produits **partagé entre tous les clients**, qui
associe un libellé normalisé à son verdict de classification.

Ce référentiel **ne contient aucune donnée personnelle et aucune donnée rattachable à un client** :
ni montant, ni quantité, ni fournisseur, ni organisation, ni utilisateur. Le nombre de
confirmations y figure sous forme d'entier non rattaché, de sorte qu'il est impossible de savoir
quel client a confirmé quoi.

Il est donc **anonyme** au sens du considérant 26 du RGPD et sort du champ du règlement.

Cette caractéristique est décrite à l'article 9.3 des
[conditions générales](./02-conditions-generales.md), et elle est vérifiable dans le code, à
`src/lib/convex/egalim/tables.ts`.

⚠️ **ARBITRAGE — voir le point 2 du [lisez-moi](./00-lisez-moi.md).**

---

## 9. Sécurité

Les mesures suivantes sont **effectivement en place** et non déclaratives :

- chiffrement des échanges en transit, HTTPS strict avec en-tête HSTS ;
- mots de passe stockés sous forme de condensats, jamais en clair ;
- longueur minimale de douze caractères, imposée **côté serveur** et non seulement à la saisie ;
- cloisonnement strict des données par organisation, appliqué à chaque requête serveur ;
- accès nominatifs, sans compte partagé ;
- en-têtes de sécurité : `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy` ;
- secrets d'exploitation conservés hors du code source et hors du dépôt.

Aucun système n'étant infaillible, l'Éditeur s'engage à notifier toute violation de données dans
les conditions des articles 33 et 34 du RGPD, soit à la CNIL dans les soixante-douze heures et aux
personnes concernées lorsque le risque est élevé.

---

## 10. Vos droits

Toute personne dispose des droits d'**accès**, de **rectification**, d'**effacement**, de
**limitation**, d'**opposition** et de **portabilité**, ainsi que du droit de définir des
directives relatives au sort de ses données après son décès.

Ces droits s'exercent à **bonjour@letikette.com**. Une réponse est apportée dans un délai d'un
mois, prorogeable de deux mois en cas de complexité, conformément à l'article 12.3 du RGPD.

**Une précision utile** : lorsque la demande porte sur le contenu des factures d'un établissement,
Letikette agit comme sous-traitant. La demande doit alors être adressée au client, responsable de
ce traitement ; Letikette lui prête assistance sans se substituer à lui.

**Réclamation.** Toute personne peut introduire une réclamation auprès de la Commission nationale
de l'informatique et des libertés, 3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, ou sur
`www.cnil.fr`.

---

## 11. Caractère obligatoire des données

Les données marquées comme requises à l'inscription sont **nécessaires à l'exécution du contrat**.
À défaut, le Service ne peut être fourni.

Les données facultatives, notamment le SIRET au moment de l'inscription, peuvent être omises sans
conséquence sur l'accès au Service.

---

## 12. Modification

Toute modification substantielle est notifiée par courriel **trente jours** avant son entrée en
vigueur.

**Version 1.0** — ⚠️ date d'entrée en vigueur à compléter.
