# Les premiers pas (13/10/2026)

## La demande

Le fondateur : « il va falloir voir l'onboarding de l'application de façon à avoir l'UX la
plus incroyable et optimisée du marché […] Il faut qu'on ressente la fiabilité,
l'aboutissement du produit ! […] c'est quand même les premiers écrans d'un utilisateur sur
l'app, ça ne peut pas être n'importe quoi ».

## Ce qu'on trouvait en arrivant

1. **L'inscription** : trois champs sur un écran (nom, adresse, mot de passe). Au téléphone,
   le clavier cachait la moitié de l'écran et le bouton.
2. **« Votre entreprise »** : un champ, la recherche au registre, et de longs paragraphes
   d'explication. Personne ne disait qui allait faire le travail : Plume restait caché
   jusqu'au premier dossier.
3. **L'accueil vide** : « Commencez par vos factures ». Le signataire, l'adresse et l'IBAN se
   découvraient plus tard, sous un verrou de l'accueil, dans le formulaire du compte.
   L'activation des relances aussi, dans un bloc de l'accueil.

Un défaut caché dans l'écran 2 : un bouton du kit n'a pas de `type`, et posé dans un
formulaire il l'envoie. Toucher une entreprise proposée par le registre, « Changer » ou
« Chercher à nouveau » créait donc l'entreprise avant que le choix soit pris en compte, avec
le nom tapé et sans son numéro.

## Les références (Mobbin)

- **Une question par écran** : Revolut Business, Monzo et Copilot. Un grand titre aligné à
  gauche, un champ, et le bouton sous le pouce.
- **La jauge et « Plus tard »** : QuickBooks et Evernote (des traits), Mercury (« Skip »),
  QuickBooks (« Skip for now »).
- **Celui qui travaille se présente** : Claude (« Hello, I'm Claude », puis « Nice to meet
  you, I'm… ») et Copilot (« Nice to meet you, Sam »).
- **La confiance avant de confier** : l'écran Plaid de Cleo (« Your data belongs to you »),
  Apple Santé et Google Photos. Trois lignes avec une icône, avant de demander.
- **Le premier chiffre comme récompense** : Rocket Money et Monarch. On attend le temps de
  l'analyse, puis on voit ce qui a été trouvé.
- **L'aperçu de ce que verra le client** : Acctual (« Make it yours ») et QuickBooks (« Now,
  preview what your customer will see »).
- **Le résumé qui coche** : Stoic, Nibble et Discord (« 3 of 3 steps »).
- **La suite reste à portée** : Monarch (« Getting Started »), Mercury (« You're nearly
  there ») et Square (« Complete your setup »). Chez nous, c'est déjà `CeQuiManque` sur
  l'accueil.

## Le parcours

### L'inscription : deux écrans (`/inscription`)

1. **L'adresse.** En dessous, trois levées vraies du produit : 30 jours d'essai
   (`DUREE_ESSAI_JOURS`), sans carte bancaire, sans engagement.
2. **Le mot de passe**, avec :
   - l'œil pour le lire ;
   - sa longueur comptée en direct (douze caractères, la règle que le serveur tient aussi) ;
   - les conditions générales sous le bouton.

Le nom n'est plus demandé ici. Un invité, qui ne passe pas par Plume, le donne avec son mot
de passe.

### Les premiers pas : six étapes (`/bienvenue?etape=`)

Chaque étape a son adresse : le retour du navigateur revient d'une étape, et l'accueil peut
ramener à une étape.

1. **Plume se présente.** Il dit trois règles du produit :
   - les relances partent à votre nom, une fois que vous l'avez décidé ;
   - chacune s'affiche une heure avant de partir ;
   - rien ne part vers un tribunal.

   Puis il demande le nom (`authClient.updateUser`).
2. **L'entreprise.** Le registre propose et le gérant touche. Rien n'est retenu d'office, et
   une entreprise absente du registre s'inscrit avec son seul nom. Le formulaire ne porte plus
   que le champ.
3. **Les factures.**
   - **Avant le dépôt**, trois faits du coffre : le scellement sous une clé propre à
     l'entreprise, l'empreinte, le journal des ouvertures. Une note dit ce que ces faits ne
     couvrent pas : un PDF part au service de lecture.
   - **Puis la lecture**, qui se voit.
   - **Puis le chiffre** : le montant dû défile, avec sa composition. Ce sont les chiffres de
     l'accueil au même jour (`revelation`).
4. **Les lettres.**
   - Qui signe : le nom du compte, ou un dirigeant publié au registre (la lecture part à
     l'arrivée).
   - Sa fonction : remplie quand le signataire est un dirigeant publié.
   - L'adresse des réponses : celle du compte.
   - L'IBAN : facultatif.

   L'aperçu de la lettre se remplit pendant la saisie. `enregistrerEnTete` n'écrit que ces
   quatre valeurs. Pour une entreprise absente du registre, il crée le profil depuis son nom.
5. **Les relances.** Le plan et ses règles en entier, dans le même texte que la feuille de
   l'accueil (`CeQuiPartira`). Puis deux réponses : « Activer les relances » et « Pas
   maintenant ». Rien n'est coché d'avance. Un membre lit le plan mais ne peut pas activer.
6. **C'est prêt.** Ce qui est en place se coche, et ce qui reste se dit sans reproche. Le
   bouton mène à l'accueil.

Après l'entreprise, chaque étape a son « Plus tard ». Les deux premières étapes se ferment
une fois l'entreprise créée : un compte qui revient reprend aux factures.

### Ce qui suit sur l'accueil

La rangée « Ce qui s'imprime sur vos courriers » rouvre l'étape des lettres. Sa règle suit
enfin les gabarits : qui signe, sa fonction et l'adresse des réponses. Sans IBAN, la lettre
officielle renvoie aux factures (`SELON_FACTURES`) ; la rangée réclamait pourtant l'IBAN.

## Ce qui ne change pas

- Ligne rouge n° 1 : rien ne part sans activation par un administrateur, après lecture du
  plan, et sur les seuls dossiers démarrés.
- Aucune promesse :
  - les lignes de confiance sont des faits du code ;
  - jamais « de bout en bout » ;
  - jamais « personne d'autre que vous ».
- Aucune valeur juridique en dur : le montant des frais de recouvrement ne s’écrit nulle part
  dans le texte.

## Vérifié

- **Avec une vraie session, sur le déploiement de développement.** C'est un compte de test
  (adresse d'exemple) créé par erreur : l'œil du mot de passe, alors sans `type`, a envoyé le
  formulaire. Le parcours a été joué en entier, jusqu'à l'accueil : le nom, une entreprise
  fictive absente du registre, l'en-tête, l'activation, le résumé.
- **Dans la salle d'exposition**, pour chaque phase de chaque étape.
- **En partie seulement** : le dépôt de vraies factures n'a pas été joué. Le parcours de dépôt
  s'ouvre bien, mais aucun fichier n'a été envoyé.
