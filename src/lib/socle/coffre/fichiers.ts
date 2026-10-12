/**
 * CE QUI ENTRE AU COFFRE — une liste fermée, vérifiée dans les octets (12/10/2026).
 *
 * ⚠️ L'EXTENSION ET LE TYPE DÉCLARÉ NE PROUVENT RIEN. Un exécutable renommé en
 * « facture.pdf » porte l'extension et le type qu'on veut. Le serveur lit donc
 * les PREMIERS OCTETS (la « signature » du format) et refuse ce qui ne
 * correspond pas, en le disant. Le navigateur fait une première vérification
 * sur le nom et la taille, pour refuser avant l'envoi ; elle ne remplace pas
 * celle-ci.
 *
 * ⚠️ PAS DE SVG, PAS DE HTML, PAS D'ARCHIVE. Un SVG ou un HTML peut porter du
 * code qui s'exécuterait à l'affichage ; une archive cache ce qu'elle contient.
 * Rien de cela ne sert à prouver une créance.
 */

export type NatureDeFichier = 'PDF' | 'IMAGE' | 'TEXTE';

/** La taille au-delà de laquelle un fichier est refusé : 20 Mo. */
export const TAILLE_MAX_OCTETS = 20 * 1024 * 1024;

/** Ce que le sélecteur du système propose, et rien d'autre. */
export const FORMATS_ACCEPTES =
	'.pdf,.jpg,.jpeg,.png,.webp,.gif,.csv,.txt,.tsv,.xml,.eml,application/pdf,image/jpeg,image/png,image/webp,image/gif,text/csv,text/plain,text/xml,application/xml';

/** Les formats, en toutes lettres, pour l'écran. */
export const FORMATS_EN_CLAIR = 'PDF, photo (JPEG, PNG, WebP) ou export texte (FEC, CSV, XML)';

export type Verdict =
	| { readonly accepte: true; readonly nature: NatureDeFichier; readonly mime: string }
	| { readonly accepte: false; readonly raison: string };

const EXTENSIONS: Readonly<Record<string, { nature: NatureDeFichier; mime: string }>> = {
	pdf: { nature: 'PDF', mime: 'application/pdf' },
	jpg: { nature: 'IMAGE', mime: 'image/jpeg' },
	jpeg: { nature: 'IMAGE', mime: 'image/jpeg' },
	png: { nature: 'IMAGE', mime: 'image/png' },
	webp: { nature: 'IMAGE', mime: 'image/webp' },
	gif: { nature: 'IMAGE', mime: 'image/gif' },
	csv: { nature: 'TEXTE', mime: 'text/csv' },
	txt: { nature: 'TEXTE', mime: 'text/plain' },
	tsv: { nature: 'TEXTE', mime: 'text/tab-separated-values' },
	xml: { nature: 'TEXTE', mime: 'application/xml' },
	eml: { nature: 'TEXTE', mime: 'message/rfc822' }
};

function extensionDe(nom: string): string {
	const point = nom.lastIndexOf('.');
	return point < 0 ? '' : nom.slice(point + 1).toLowerCase();
}

/** « 2,4 Mo », « 840 Ko ». */
export function tailleLisible(octets: number): string {
	if (octets < 1024) return `${octets} o`;
	if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
	return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

/**
 * UN NOM DE FICHIER PROPRE : sans chemin, sans caractère de contrôle, borné.
 * Le nom s'affiche et part dans un en-tête de téléchargement : un « ../ » ou un
 * retour à la ligne n'ont rien à y faire.
 */
export function nomPropre(nom: string): string {
	const sansChemin = nom.split(/[/\\]/).pop() ?? '';
	// eslint-disable-next-line no-control-regex
	const propre = sansChemin.replace(/[\u0000-\u001f\u007f]/g, '').trim();
	if (propre === '') return 'document';
	return propre.length > 180 ? `${propre.slice(0, 170)}…${propre.slice(-8)}` : propre;
}

/**
 * LA PREMIÈRE VÉRIFICATION, DANS LE NAVIGATEUR : le nom et la taille. Elle
 * refuse avant d'envoyer quoi que ce soit ; le serveur revérifie dans les octets.
 */
export function verdictAvantEnvoi(nom: string, taille: number): Verdict {
	if (taille === 0) return { accepte: false, raison: 'Ce fichier est vide.' };
	if (taille > TAILLE_MAX_OCTETS) {
		return {
			accepte: false,
			raison: `Ce fichier fait ${tailleLisible(taille)} : le coffre accepte ${tailleLisible(TAILLE_MAX_OCTETS)} par fichier.`
		};
	}
	const connu = EXTENSIONS[extensionDe(nom)];
	if (connu === undefined) {
		if (/\.(heic|heif)$/i.test(nom)) {
			return {
				accepte: false,
				raison:
					'Photo au format HEIC : choisissez « Le plus compatible » dans les réglages de l’appareil photo, ou envoyez-la en JPEG.'
			};
		}
		return { accepte: false, raison: `Ce format n’est pas accepté : ${FORMATS_EN_CLAIR}.` };
	}
	return { accepte: true, ...connu };
}

function commencePar(octets: Uint8Array, signature: readonly number[], decalage = 0): boolean {
	return signature.every((valeur, i) => octets[decalage + i] === valeur);
}

function ascii(texte: string): number[] {
	return Array.from(texte, (c) => c.charCodeAt(0));
}

/** Les octets d'un PDF : « %PDF- » dans le premier kilo-octet, comme la norme le tolère. */
function estUnPdf(octets: Uint8Array): boolean {
	const signature = ascii('%PDF-');
	const borne = Math.min(octets.length - signature.length, 1024);
	for (let i = 0; i <= borne; i++) if (commencePar(octets, signature, i)) return true;
	return false;
}

function imageDesOctets(octets: Uint8Array): string | null {
	if (commencePar(octets, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
	if (commencePar(octets, [0xff, 0xd8, 0xff])) return 'image/jpeg';
	if (commencePar(octets, ascii('GIF87a')) || commencePar(octets, ascii('GIF89a')))
		return 'image/gif';
	if (commencePar(octets, ascii('RIFF')) && commencePar(octets, ascii('WEBP'), 8))
		return 'image/webp';
	return null;
}

/** Du texte : aucun octet nul, et aucune signature binaire connue en tête. */
function estDuTexte(octets: Uint8Array): boolean {
	const debut = octets.subarray(0, 8192);
	if (debut.includes(0)) return false;
	if (commencePar(octets, ascii('MZ')) || commencePar(octets, ascii('PK'))) return false;
	return estUnPdf(octets) === false && imageDesOctets(octets) === null;
}

/**
 * LA VÉRIFICATION QUI COMPTE, SUR LE SERVEUR : la nature lue dans les octets, et
 * qui doit RECOUPER le nom. Un fichier qui se dit PDF sans en être un est
 * refusé — c'est le cas exact d'un fichier piégé.
 */
export function verdictDesOctets(octets: Uint8Array, nom: string): Verdict {
	const avant = verdictAvantEnvoi(nom, octets.length);
	if (!avant.accepte) return avant;

	if (avant.nature === 'PDF') {
		return estUnPdf(octets)
			? { accepte: true, nature: 'PDF', mime: 'application/pdf' }
			: {
					accepte: false,
					raison: 'Ce fichier porte l’extension .pdf mais n’est pas un PDF : il est refusé.'
				};
	}
	if (avant.nature === 'IMAGE') {
		const mime = imageDesOctets(octets);
		return mime === null
			? {
					accepte: false,
					raison: 'Ce fichier se présente comme une photo mais n’en est pas une : il est refusé.'
				}
			: { accepte: true, nature: 'IMAGE', mime };
	}
	return estDuTexte(octets)
		? { accepte: true, nature: 'TEXTE', mime: avant.mime }
		: {
				accepte: false,
				raison:
					'Ce fichier se présente comme un texte mais contient des données binaires : il est refusé.'
			};
}
