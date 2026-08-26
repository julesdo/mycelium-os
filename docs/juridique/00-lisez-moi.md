# Dossier juridique Letikette

> Rédigé le 26 août 2026, à partir d'un audit du code et non d'un modèle générique.

---

## Ce que ces documents sont, et ce qu'ils ne sont pas

**Ce sont des projets rédigés, complets, et ancrés dans les flux de données réels du produit.**
Ils ne sortent pas d'un générateur : chaque durée de conservation, chaque sous-traitant, chaque
transfert hors UE a été vérifié dans le code et la référence du fichier est donnée.

**Ils ne sont pas validés par un avocat, et je n'en suis pas un.** Ils doivent être relus par un
professionnel avant publication. L'intérêt de ce dossier est de transformer sa mission : au lieu
de partir d'une page blanche et de vous interroger pendant deux heures sur votre architecture, il
relit un texte déjà spécifique et tranche les douze arbitrages listés plus bas. C'est la
différence entre une prestation de rédaction et une prestation de relecture.

**Trois éléments manquent et je ne peux pas les inventer**, ils sont marqués `⚠️ À COMPLÉTER`
dans les documents.

---

## Les faits établis par l'audit du code

### Ce qui est traité

| Donnée | Où | Nature |
|---|---|---|
| Adresse e-mail, nom, mot de passe haché | composant Better Auth | Personnelle, responsable de traitement |
| Nom de l'établissement, SIRET, type, couverts/jour | `organizations` | Professionnelle |
| Adresses invitées | `organizationInvitations` | Personnelle |
| Événements d'envoi d'e-mail (remis, rejeté) | `emailEvents` | Personnelle |
| **Fichiers de facture déposés** | stockage Convex | **Contenu client, sous-traitance** |
| **Lignes de facture** : libellé fournisseur, montant HT, date, fournisseur | `invoiceLines` | **Contenu client, sous-traitance** |
| Classifications, justifications, indices de confiance | `invoiceLines` | Produit du traitement |
| Bilans figés | `diagnostics` | Produit du traitement |
| Signatures électroniques de bilan | `bilanSignatures` | Personnelle (signataire) |
| Libellés normalisés et leur verdict | `productLabels` | **Anonyme, mutualisée** |

### La table `productLabels` mérite une mention explicite dans la politique

Elle est **globale et mutualisée entre tous les clients**, et c'est un choix d'architecture
assumé : un libellé confirmé par une cantine bénéficie aux suivantes. Elle ne contient qu'un
libellé et son verdict. **Jamais de montant, de quantité, de fournisseur, d'organisation ni
d'utilisateur.** Le compteur de confirmations est un entier nu.

C'est vérifiable dans `src/lib/convex/egalim/tables.ts` et c'est écrit noir sur blanc dans
`CLAUDE.md`. La politique doit le dire, parce qu'un client attentif verra qu'un traitement sort
de son périmètre, et mieux vaut qu'il l'apprenne de nous.

### Les sous-traitants ultérieurs, tous vérifiés dans le code

| Sous-traitant | Rôle | Ce qu'il reçoit | Localisation |
|---|---|---|---|
| **Anthropic** (`@anthropic-ai/sdk`) | Extraction et classification | **L'image entière de chaque facture, en base64**, puis les libellés produits | États-Unis ⚠️ |
| **Convex** | Base de données et stockage | Tout | ⚠️ À VÉRIFIER au tableau de bord |
| **Vercel** | Hébergement de l'application | Trafic, journaux | Région `fra1`, Paris |
| **Resend** | Envoi des e-mails | Adresse, contenu des e-mails | Région `eu-west-1`, Irlande |
| **Paddle** | Facturation, vendeur de registre | Identité de facturation, paiement | Royaume-Uni / Irlande |

**PostHog n'est branché nulle part** malgré sa présence dans les dépendances. Rien à déclarer
côté mesure d'audience, et aucun bandeau de cookies n'est nécessaire tant que c'est le cas.

### Le point le plus sensible, et il faut le regarder en face

`src/lib/convex/egalim/extracteurClaude.ts` envoie **les pages de la facture converties en
images base64** à l'API Anthropic. Ce n'est pas un extrait, c'est le document entier : raison
sociale du fournisseur, adresse, SIRET, coordonnées bancaires si elles y figurent, nom d'un
contact commercial, tout ce qui est imprimé.

Trois conséquences :

1. **C'est un transfert hors Union européenne** et il lui faut un fondement au titre du chapitre V
   du RGPD. Anthropic publie un DPA et des clauses contractuelles types : **il faut le signer**,
   et c'est un préalable, pas une formalité.
2. **La politique de confidentialité doit le dire clairement.** Le dissimuler derrière « nous
   utilisons des services d'intelligence artificielle » serait un défaut d'information.
3. **Il faut vérifier la politique de rétention d'Anthropic** sur les entrées d'API, et l'opt-out
   d'entraînement. À la connaissance disponible, les données d'API commerciales ne servent pas à
   l'entraînement par défaut, mais **c'est à confirmer au contrat**, pas sur la foi d'une page
   d'aide.

---

## Les douze arbitrages pour le juriste

Chacun est un choix, pas une évidence, et chacun a une conséquence chiffrable.

1. **Le rôle RGPD dual.** Letikette est responsable de traitement pour les comptes, et
   sous-traitant pour le contenu des factures. Le découpage proposé est-il le bon, ou faut-il
   retenir une responsabilité conjointe sur les classifications produites ?

2. **Le statut de `productLabels`.** Un libellé produit est-il une donnée du client ? La
   mutualisation anonyme est-elle licite sans consentement, au titre de l'intérêt légitime, ou
   faut-il une clause d'autorisation expresse dans le contrat de sous-traitance ?

3. **Paddle vendeur de registre.** La vente est-elle conclue entre le client et Paddle, ou entre
   le client et Letikette avec Paddle comme simple encaisseur ? Cela change qui doit fournir les
   CGV, qui émet la facture, et qui porte la TVA.

4. **La durée d'engagement.** Mensuel sans engagement, ou annuel ? Le produit est saisonnier
   autour du 31 mars : un abonnement mensuel invite à souscrire en février et résilier en avril.

5. **Le droit de rétractation.** La cible est professionnelle, donc en principe exclu. Mais
   l'article L221-3 du code de la consommation protège les professionnels de moins de six
   salariés dont le contrat sort de leur activité principale. La conformité EGalim relève-t-elle
   de l'activité principale d'une cantine ? Un délai de quatorze jours accordé volontairement
   coûte peu et éteint le débat.

6. **La limitation de responsabilité.** Le plafond proposé est de douze mois d'abonnement. La
   jurisprudence *Chronopost* et *Faurecia* invalide une clause qui viderait l'obligation
   essentielle de sa substance. Le plafond tient-il face à un client qui invoquerait une
   déclaration erronée ?

7. **L'obligation de moyens.** Elle est le cœur du produit et figure partout dans l'interface. La
   rédaction proposée est-elle suffisamment ferme pour écarter toute obligation de résultat sur la
   conformité ?

8. **La conservation des factures et des bilans.** Dix ans est proposé, par alignement sur
   l'article L123-22 du code de commerce. Trop long au regard de la minimisation ? Faut-il
   distinguer le fichier source du bilan produit ?

9. **La réversibilité.** Sous quel format et sous quel délai restituer les données en fin de
   contrat, et quand les effacer chez le sous-traitant ultérieur ?

10. **La signature électronique.** Le produit produit une empreinte SHA-256 et une signature au
    sens du règlement eIDAS, mais **ce n'est pas une signature qualifiée** : il n'y a pas de
    prestataire de service de confiance qualifié. La mention proposée le dit. Est-elle assez
    explicite pour écarter une confusion ?

11. **La sous-traitance à Anthropic.** Faut-il une autorisation spécifique du client, ou
    l'autorisation générale avec information préalable des changements suffit-elle ?

12. **L'assurance responsabilité civile professionnelle.** Non souscrite à ce jour. Indispensable
    avant le premier client sur un produit qui touche à la conformité réglementaire.

---

## Ce qui manque et que je ne peux pas écrire

- **L'adresse du siège.** Le registre officiel donne toujours Bordeaux au 6 décembre 2025. Le
  transfert vers Suresnes doit être déclaré au greffe **avant** que le site l'affiche, sinon le
  site contredit le registre. Voir le commentaire dans `src/lib/config/legal.ts`.
- **Le directeur de la publication.** Article 6-III de la LCEN. C'est nominatif.
- **L'hébergeur au sens de la LCEN**, avec sa raison sociale et son adresse : Vercel Inc. et
  Convex, dont les mentions exactes doivent être reprises de leurs conditions.
- **La région d'hébergement Convex**, à lire au tableau de bord. Si elle est aux États-Unis, un
  second transfert hors UE s'ajoute à celui d'Anthropic, et la politique doit le dire.

---

## L'ordre dans lequel je m'y prendrais

1. Déclarer le transfert de siège au greffe. Tout le reste en dépend.
2. Signer le DPA d'Anthropic et vérifier la région Convex.
3. Faire relire les quatre documents, en donnant ce fichier au juriste en première pièce.
4. Souscrire la responsabilité civile professionnelle.
5. Ouvrir le compte marchand Paddle, qui exige les CGV et la politique publiées.
