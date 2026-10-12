// LE SERVEUR DE TRANSFERT DU COFFRE — Companion, d'Uppy (12/10/2026).
//
// Il relie Google Drive, Dropbox, OneDrive et Box au parcours de dépôt : il
// télécharge chez le service le fichier que le gérant a coché, et l'envoie à
// l'adresse d'envoi À USAGE UNIQUE que Convex a donnée pour ce fichier. Il voit
// donc le fichier en clair le temps du transfert, en flux, sans l'écrire ; puis
// le fichier est scellé au coffre comme les autres (`src/lib/convex/coffre/`).
//
// ⚠️ TOUT EST FERMÉ PAR DÉFAUT, ET CHAQUE OUVERTURE EST NOMMÉE :
//   · il n'envoie QUE vers l'adresse d'envoi de nos deux déploiements Convex
//     (`uploadUrls`) — jamais vers une adresse qu'un navigateur lui donnerait ;
//   · l'import « depuis une URL » est coupé : il ferait de ce serveur un relais
//     vers n'importe quelle adresse, réseau interne compris ;
//   · 20 Mo au plus, la borne du coffre ;
//   · une seule origine admise, le site.
//
// Voir LISEZMOI.md pour le déploiement et les comptes à créer.

import express from 'express';
import session from 'express-session';
import * as companion from '@uppy/companion';

function exiger(nom) {
	const valeur = process.env[nom];
	if (valeur === undefined || valeur === '') {
		throw new Error(`Variable ${nom} absente : le serveur de transfert ne démarre pas sans elle.`);
	}
	return valeur;
}

const secret = exiger('COMPANION_SECRET');
const domaine = exiger('COMPANION_DOMAIN');
const origine = process.env.COMPANION_CORS_ORIGIN ?? 'https://www.letikette.com';

// Les déploiements Convex vers lesquels un fichier peut partir : la production et
// le développement. Une adresse d'envoi Convex a toujours cette forme.
const deploiements = (process.env.CONVEX_DEPLOYMENTS ?? 'insightful-crow-128,knowing-bee-911')
	.split(',')
	.map((nom) => nom.trim())
	.filter((nom) => /^[a-z0-9-]+$/.test(nom));
const adressesDEnvoi = deploiements.map(
	(nom) => new RegExp(`^https://${nom}\\.convex\\.cloud/api/storage/upload\\?token=`)
);

function service(prefixe) {
	const key = process.env[`COMPANION_${prefixe}_KEY`];
	const cle = process.env[`COMPANION_${prefixe}_SECRET`];
	return key && cle ? { key, secret: cle } : undefined;
}

const providerOptions = Object.fromEntries(
	[
		['dropbox', service('DROPBOX')],
		['onedrive', service('ONEDRIVE')],
		['box', service('BOX')]
	].filter(([, options]) => options !== undefined)
);

const options = {
	secret,
	server: { host: domaine, protocol: 'https' },
	corsOrigins: [origine],
	uploadUrls: adressesDEnvoi,
	providerOptions,
	filePath: process.env.COMPANION_DATADIR ?? '/tmp/companion',
	// En flux : le fichier n'est pas écrit sur le disque de ce serveur.
	streamingUpload: true,
	maxFileSize: 20 * 1024 * 1024,
	enableUrlEndpoint: false,
	allowLocalUrls: false,
	// Le sélecteur de Google Drive : l'accès ne porte que sur les fichiers choisis.
	enableGooglePickerEndpoint: true
};

const app = express();
app.disable('x-powered-by');
app.use(express.json());
app.use(
	session({
		secret,
		resave: false,
		saveUninitialized: false,
		cookie: { secure: true, httpOnly: true, sameSite: 'none' }
	})
);
app.set('trust proxy', 1);

app.get('/sante', (_requete, reponse) => {
	reponse.json({ ok: true });
});

const { app: companionApp } = companion.app(options);
app.use(companionApp);

const port = Number(process.env.PORT ?? 3020);
const serveur = app.listen(port, () => {
	console.info(`Serveur de transfert prêt sur ${port} (services : ${Object.keys(providerOptions).join(', ') || 'aucun'})`);
});
companion.socket(serveur, options);
