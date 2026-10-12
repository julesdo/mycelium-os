# Le coffre-fort des documents (12/10/2026)

## La demande

> Quand on upload un ou des fichiers, ça se fait de manière très dégueux au beau milieu de l'accueil
> et on n'a aucune sensation de sécurisation. Pareil depuis un dossier. Il faut partout le même flow
> d'upload et d'ingestion, entièrement sécurisé et chiffré, en mode coffre-fort, un stepper plein
> écran comme pour la recherche d'avocat. Plus de cartes d'échec ou de succès sur l'accueil. Ce sont
> des données extrêmement sensibles. On doit pouvoir relire et consulter les documents en détail.
> Aller jusqu'au bout de la réflexion.

## Ce qui existait

- **Quatre portes** : la zone de dépôt dépliée au milieu d'« Aujourd'hui », l'écran « Vos dépôts »,
  la rubrique « Pièces » d'un dossier, celle d'une fiche client. Trois implémentations de l'envoi.
- **Des cartes de bilan** (`BilanImport`) dans la file du matin, pour chaque dépôt en cours ou raté.
- **Aucune relecture possible** : un fichier déposé n'était consultable nulle part.
- **La sécurité réelle** : HTTPS ; chiffrement au repos par l'hébergeur (Convex, AES-256, SOC 2
  Type II, AWS `us-east-1`) ; cloisonnement par établissement. Mais les fichiers étaient stockés
  EN CLAIR pour nos propres fonctions, et rien ne le montrait à l'écran.

## Le modèle de menace, honnêtement

| Ce qu'on protège contre                                           | Comment                                         |
| ----------------------------------------------------------------- | ----------------------------------------------- |
| Une copie du stockage ou de la base                                | Chiffrement applicatif AES-256-GCM (ci-dessous)  |
| Un lien qui fuit (historique, capture, messagerie)                 | Aucun lien public : jeton à usage unique, 60 s   |
| Un membre d'un autre établissement                                 | Cloisonnement revérifié à chaque ouverture       |
| Un fichier modifié après le dépôt                                  | Empreinte SHA-256 + étiquette GCM vérifiées      |
| Un fichier piégé (exécutable renommé en .pdf, SVG à scripts)       | Type lu dans les premiers octets, liste fermée   |
| L'oubli : qui a consulté quoi                                      | Journal de chaque dépôt, ouverture, retrait      |
| La fin du contrat                                                  | Effacement de la clé de l'établissement          |

**Ce qu'on ne prétend pas** : un chiffrement « de bout en bout ». Nos serveurs détiennent la clé —
il le faut pour lire une facture et calculer un décompte. Les écrans ne disent jamais « personne
d'autre que vous ne peut le lire », ni « hébergé en France ». La lecture d'une facture non
structurée transmet son contenu à Anthropic (section 6.1 de la politique de confidentialité) : le
parcours le dit avant l'envoi.

## Le chiffrement

- **Une clé par établissement** (DEK, AES-256), tirée au premier dépôt, rangée dans `coffresCles`
  ENVELOPPÉE par une clé maîtresse qui ne vit pas en base (`COFFRE_CLE_MAITRESSE`, variable
  d'environnement Convex). La base seule ne suffit donc pas à ouvrir un document.
- **Chaque document** : AES-256-GCM, vecteur de 96 bits tiré à chaque fois, données associées =
  l'établissement (un document chiffré ne s'ouvre pas sous la clé d'un autre). Le stockage ne garde
  que le chiffré.
- **Le scellement** a lieu dès l'arrivée, dans une action Node : le fichier reçu (HTTPS, adresse
  d'envoi à usage unique) est lu, vérifié, chiffré, rangé, puis l'original est effacé. Il ne vit en
  clair que le temps de ce traitement, sans jamais avoir eu d'adresse publique.
- **L'ouverture** passe par une action HTTP : une mutation vérifie la session et l'établissement,
  note l'accès et rend un jeton (32 octets aléatoires, 60 s, usage unique) ; l'action HTTP le
  consomme, déchiffre, revérifie l'empreinte et renvoie les octets (`Cache-Control: no-store`).
  L'écran les montre depuis la mémoire (`blob:`), jamais depuis une adresse.
- **La purge RGPD** efface les documents ET la clé : même une sauvegarde ancienne du stockage
  devient illisible.

## Le parcours (un seul, partout)

`ui/parcours-depot.tsx`, ouvert depuis Aujourd'hui, le coffre, un dossier, une fiche client.

1. **Vos documents** — choisir (fichiers, photo ; glisser à la souris), formats et taille écrits ;
   chaque fichier se vérifie AVANT l'envoi (type, taille, empreinte : « déjà dans votre coffre
   depuis le 3 oct. »). La destination est dite, pas demandée (« Pièces du dossier Durand »). Ce
   qui protège le document est écrit, en quatre lignes vraies.
2. **Mise au coffre** — chaque fichier passe sous les yeux : Envoi (pourcentage réel), Chiffrement,
   Lecture, avec l'étape que le serveur publie.
3. **Résumé** — ce qui est au coffre, ce que la lecture a trouvé (factures entrées, nature de la
   pièce), ce qui a échoué et pourquoi, « Réessayer ». Fermer le parcours en route ne perd rien :
   la lecture continue, et le coffre montre où elle en est.

## Le coffre

`/app/coffre` remplace « Vos dépôts » : tous les documents de l'établissement (factures déposées et
pièces), groupés par mois, avec ce que chacun a produit. Un document s'ouvre en plein écran : le
document lui-même (PDF page par page via `unpdf`, images, texte), puis ses faits — déposé le, par,
taille, nature, empreinte, chiffrement —, ce que la lecture en a tiré, le client ou le dossier, le
journal des accès, « Télécharger » et « Retirer du coffre ».

## Ce qui disparaît

La zone de dépôt au milieu d'Aujourd'hui et les cartes de bilan de la file. La rangée « Vos dépôts »
devient « Coffre-fort ». Les quatre mutations d'envoi (`genererUrlDepot`, `enregistrerFichier`,
`genererUrlPiece`, `deposerPiece`) sont remplacées par celles du coffre.
