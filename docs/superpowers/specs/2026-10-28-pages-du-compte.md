# Les pages du compte, dans la DA du site

_28/10/2026. Demande du fondateur, le soir de la bascule du site : « les pages login, inscription etc., qu'elles collent complètement à la nouvelle DA, avec une expérience de fou hyper travaillée »._

## Ce qui change

Cinq pages quittent le cadre sombre de l'application (`CadreAuth`) pour la page du site :
- la connexion (`/connexion`) ;
- l'inscription en deux étapes (`/inscription`) ;
- le mot de passe oublié (`/mot-de-passe-oublie`) ;
- le nouveau mot de passe (`/nouveau-mot-de-passe`) ;
- le code de la double authentification (`/connexion/verification`).

Leur logique ne bouge pas. Elle reste dans les routes et dans les pages de `marketing/compte/` :
- l'invitation transportée et la suite bornée (`suiteSure`) ;
- la double authentification ;
- l'adresse venue du site par l'état de l'historique ;
- le mois offert d'une recommandation ;
- la mesure (`suivre`).

## Le cadre (`marketing/compte/cadre.tsx`, `styles/site/compte.css`)

- **À gauche**, la marque, l'autre porte (« Pas encore de compte ? Créer un compte »), puis une seule question par écran :
  - le titre en Newsreader et son « ton » ;
  - un chapeau ;
  - au plus trois champs ;
  - un bouton plein.
- **À droite**, un tableau du massif où Plume se tient, avec une carte de papier qui dit ce qui vient. Chaque page a son heure :
  - la connexion, un matin (ce que Plume promet, lu sur les constantes qui le tiennent) ;
  - l'inscription, un lever (les trois étapes qui suivent) ;
  - le mot de passe, la nuit bleue (le lien, valable une heure) ;
  - le code, la nuit (le compte gardé deux fois).
- **Sous 1024 px**, le tableau devient une bande en tête. La carte se tait et le formulaire reste sous le pouce. L'en-tête s'écrit à l'encre sur un ciel clair, en blanc sur un ciel sombre (`ciel`). Sous 520 px, l'autre porte ne garde que son lien.
- La feuille reste cloisonnée sous `.site`, et les paysages et le regard de Plume sont ceux du site.

## Le champ et le bouton (`marketing/compte/champ.tsx`)

- **Le champ** est la pilule de l'appel, seule :
  - l'icône à gauche, le libellé qui monte quand on écrit ;
  - le liseré d'aube au focus ;
  - une coche qui se trace quand la valeur tient, une secousse quand elle ne tient pas.
- **Le bouton** est celui d'encre de l'appel, pleine largeur. Pendant l'envoi, il garde sa place et tourne, sans se griser : rien n'est invalide, on attend.

## Ce qui aide sans rien demander

- **Une faute de domaine courante** (« gmial.com ») propose sa correction d'un toucher : c'est la `suggestionDAdresse` du champ du site.
- **La touche des majuscules bloquée** se dit sous le mot de passe, avant l'erreur.
- **L'œil du mot de passe** le montre sans quitter le champ.
- **La longueur se lit au fil de la frappe**, en douze traits (`JaugeDuMotDePasse`). La longueur vient de `lib/compte/regles.ts`, la même que le serveur exige (\`minPasswordLength\` dans `convex/auth.ts` la lit ; `regles.test.ts` le tient).
- **À l'étape du mot de passe**, l'adresse reste visible en pastille, et « Modifier » y ramène.
- **« Mot de passe oublié ? »** emporte l'adresse déjà tapée, par l'état de l'historique.
- **Une fois le lien envoyé** :
  - un bouton ouvre la messagerie de l'adresse quand on la connaît (Gmail, Outlook, Yahoo, iCloud, Orange, Free, SFR, La Poste ; `messagerieDe`) ;
  - « Renvoyer » attend trente secondes.
- **Un nouveau mot de passe enregistré** ramène à la connexion, qui le dit en tête.
- **Le code à six chiffres** :
  - ne garde que les chiffres, se colle ou se remplit seul (`one-time-code`) ;
  - part de lui-même au sixième chiffre ;
  - se vide et secoue s'il ne correspond pas.
- **Les erreurs restent neutres** : « l'adresse ou le mot de passe ne correspond pas », et la même réponse au mot de passe oublié, que le compte existe ou non.

## Ce qui reste

- **Trois écrans gardent le cadre d'avant** :
  - l'acceptation d'une invitation dans une équipe (`/rejoindre/$token`) ;
  - la page de l'invité d'une recommandation (`/invitation/$code`) ;
  - les premiers pas (`/bienvenue`, `ui/premiers-pas.tsx`), qui relèvent de l'application.
- **La connexion par Google** est prévue au serveur (`socialProviders`), mais n'a pas de bouton. Sa mise en service en production n'a pas pu être vérifiée.
- **Les clés d'accès** : le serveur porte le greffon (\`passkey\`), mais le client ne l'utilise pas encore.
