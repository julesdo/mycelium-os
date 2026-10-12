# Le serveur de transfert du coffre (Companion)

Le parcours de dépôt propose Google Drive, Dropbox, OneDrive et Box **dès que ce serveur est
déployé et que son adresse est donnée au site** (`VITE_COMPANION_URL`). D'ici là, rien ne change :
le dépôt propose l'appareil et la photo.

## Ce qu'il fait, et ce qu'il voit

Quand un gérant coche un fichier dans son Dropbox, son navigateur ne le télécharge pas : ce serveur
le récupère chez Dropbox et l'envoie à l'adresse d'envoi à usage unique que Convex a donnée pour
ce fichier. **Il voit le fichier en clair le temps du transfert**, en flux, sans l'écrire sur son
disque ; puis le fichier est scellé au coffre comme les autres.

Il n'envoie que vers l'adresse d'envoi de nos deux déploiements Convex (`CONVEX_DEPLOYMENTS`),
refuse l'import « depuis une URL », borne les fichiers à 20 Mo et n'accepte que l'origine du site.

Côté navigateur, les jetons d'accès aux services restent **en mémoire** : fermer l'application les
oublie (`src/app/uppy-coffre.ts`).

## Déployer (Fly.io, région de Paris)

Companion est un processus qui reste allumé (les websockets d'avancement l'exigent) : ni Vercel ni
Convex ne peuvent l'héberger. Fly.io le fait pour quelques euros par mois.

```bash
cd serveurs/companion
fly launch --no-deploy --copy-config      # crée l'application ; reporter son nom dans fly.toml
fly secrets set COMPANION_SECRET="$(openssl rand -hex 32)" COMPANION_DOMAIN=<nom>.fly.dev
fly deploy
curl https://<nom>.fly.dev/sante          # {"ok":true}
```

Un sous-domaine à nous (`transfert.letikette.com`) vaut mieux qu'un `fly.dev` : `fly certs add`,
puis `COMPANION_DOMAIN` à cette valeur. Les adresses de retour des services ci-dessous suivent.

## Les comptes à créer chez chaque service

Chaque service demande une application OAuth à notre nom. L'adresse de retour est toujours
`https://<COMPANION_DOMAIN>/<service>/redirect`.

| Service | Où | Adresse de retour | Secrets à poser |
|---|---|---|---|
| Dropbox | App Console de Dropbox, en lecture seule (métadonnées et contenu des fichiers) | `/dropbox/redirect` | `COMPANION_DROPBOX_KEY`, `COMPANION_DROPBOX_SECRET` |
| OneDrive | Portail Azure, inscription d'application (comptes personnels et professionnels) | `/onedrive/redirect` | `COMPANION_ONEDRIVE_KEY`, `COMPANION_ONEDRIVE_SECRET` |
| Box | Box Developer Console, application OAuth 2.0 | `/box/redirect` | `COMPANION_BOX_KEY`, `COMPANION_BOX_SECRET` |

```bash
fly secrets set COMPANION_DROPBOX_KEY=… COMPANION_DROPBOX_SECRET=…
```

Un service sans ses secrets n'est pas activé côté serveur ; côté site, sa carte s'afficherait et
échouerait à la connexion : ne donner `VITE_COMPANION_URL` au site qu'une fois les trois posés.

### Google Drive, à part

Google Drive passe par **le sélecteur de Google** : le gérant choisit ses fichiers dans une fenêtre
de Google, et l'accès accordé ne porte que sur ces fichiers (portée `drive.file`). C'est ce qui
évite la vérification de sécurité annuelle que Google impose aux applications qui lisent tout un
Drive. Dans un projet Google Cloud :

1. activer **Google Picker API** et **Google Drive API** ;
2. configurer l'écran de consentement OAuth (nom : Letikette, domaine letikette.com) ;
3. créer un **identifiant client OAuth « Application Web »**, origine JavaScript autorisée
   `https://www.letikette.com` → `VITE_GOOGLE_PICKER_CLIENT_ID` ;
4. créer une **clé d'API** restreinte aux référents `https://www.letikette.com/*` et à la Picker
   API → `VITE_GOOGLE_PICKER_API_KEY` ;
5. le **numéro** du projet (pas son identifiant) → `VITE_GOOGLE_PICKER_APP_ID`.

## Brancher le site

Dans Vercel (production), poser `VITE_COMPANION_URL=https://<COMPANION_DOMAIN>` et, pour Google,
les trois `VITE_GOOGLE_PICKER_*`, puis redéployer. Les cartes apparaissent sous les deux tuiles du
dépôt.

**Avant d'ouvrir le service, mettre à jour la politique de confidentialité** : l'hébergeur de ce
serveur devient un sous-traitant (section 7), et le passage en clair des fichiers venus d'un
service en ligne doit y être dit (section 10).
