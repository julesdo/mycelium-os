import Uppy, { type AsyncStore } from '@uppy/core';
import XHRUpload from '@uppy/xhr-upload';
import { TAILLE_MAX_OCTETS } from '../lib/socle/coffre/fichiers';

/**
 * LE MOTEUR D'ENVOI DU COFFRE : Uppy (12/10/2026).
 *
 * Le fondateur : « ajouter Uppy à ce système d'upload sécurisé, afin que les
 * utilisateurs puissent aussi déposer depuis leur Drive et d'autres apps ».
 * Uppy envoie les fichiers de l'appareil ET ceux d'un service en ligne, par le
 * même chemin : l'adresse d'envoi à usage unique de Convex, posée sur CHAQUE
 * fichier juste avant son envoi (`file.xhrUpload.endpoint`).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI CHANGE POUR UN FICHIER D'UN SERVICE EN LIGNE, DIT EN CLAIR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il ne passe pas par le navigateur : Companion, le serveur de transfert d'Uppy
 * (`serveurs/companion/`), le télécharge chez Google, Dropbox ou Microsoft et
 * l'envoie à la même adresse à usage unique. Il le voit donc en clair, le temps
 * du transfert, sans le garder. Puis il est scellé au coffre comme les autres.
 *
 * ⚠️ AUCUN JETON NE S'ÉCRIT DANS LE NAVIGATEUR. Uppy garde par défaut les jetons
 * d'accès aux services dans `localStorage`, où un script injecté les lirait. Ici,
 * ils vivent en mémoire (`MEMOIRE_DES_JETONS`) : fermer l'onglet les oublie, et
 * il faudra se reconnecter — le prix, assumé, d'un accès qui ne traîne pas.
 */

/**
 * Ce que chaque fichier porte en plus : le type vérifié (envoyé en en-tête) et sa
 * destination au coffre (relue quand l'envoi réussit, jamais envoyée).
 */
export type MetaCoffre = { mimeVerifie?: string; destination?: string };
/** Ce que Convex répond à un envoi. */
export type CorpsCoffre = { storageId?: string };
export type UppyDuCoffre = Uppy<MetaCoffre, CorpsCoffre>;

/** Les extensions que le coffre accepte, pour griser le reste chez un service en ligne. */
const EXTENSIONS_ACCEPTEES = [
	'.pdf',
	'.jpg',
	'.jpeg',
	'.png',
	'.webp',
	'.gif',
	'.csv',
	'.txt',
	'.tsv',
	'.xml',
	'.eml'
];

const jetons = new Map<string, string>();
/** Les jetons d'accès aux services en ligne, en mémoire seulement. */
export const MEMOIRE_DES_JETONS: AsyncStore = {
	getItem: (cle) => Promise.resolve(jetons.get(cle) ?? null),
	setItem: (cle, valeur) => {
		jetons.set(cle, valeur);
		return Promise.resolve();
	},
	removeItem: (cle) => {
		jetons.delete(cle);
		return Promise.resolve();
	}
};

export function creerUppyDuCoffre(): UppyDuCoffre {
	const uppy = new Uppy<MetaCoffre, CorpsCoffre>({
		autoProceed: false,
		// Les mêmes bornes que le coffre : chez un service en ligne, ce qui ne
		// passerait pas est grisé au lieu d'être refusé après coup.
		restrictions: { maxFileSize: TAILLE_MAX_OCTETS, allowedFileTypes: EXTENSIONS_ACCEPTEES }
	});
	uppy.use(XHRUpload, {
		// L'adresse est posée sur chaque fichier avant son envoi ; celle-ci n'est
		// jamais lue, sauf oubli — et l'oubli se dit.
		endpoint: () => {
			throw new Error('Aucune adresse d’envoi : le fichier n’a pas été préparé.');
		},
		method: 'POST',
		// Le corps brut, comme l'attend l'adresse d'envoi de Convex.
		formData: false,
		// Aucune métadonnée ne part, ni à Convex ni à Companion : la destination
		// d'un document reste dans le navigateur.
		allowedMetaFields: [],
		headers: (fichier) => {
			const mime = fichier.meta.mimeVerifie;
			return {
				'Content-Type': typeof mime === 'string' ? mime : fichier.type || 'application/octet-stream'
			};
		},
		// UN FICHIER À LA FOIS : en 4G, la bande passante est la contrainte, et un
		// avancement à la fois se lit.
		limit: 1,
		timeout: 120_000,
		// Une adresse d'envoi ne sert qu'une fois : un nouvel essai en demande une autre.
		shouldRetry: () => false
	});
	return uppy;
}
