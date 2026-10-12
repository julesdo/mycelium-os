/**
 * LE CHIFFREMENT DU COFFRE — AES-256-GCM, en Web Crypto (12/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE CE MODULE FAIT, ET CE QU'IL NE PRÉTEND PAS FAIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Deux étages, le schéma classique de l'« enveloppe » :
 *
 *   · une CLÉ PAR ÉTABLISSEMENT (256 bits, tirée au hasard) chiffre ses documents ;
 *   · cette clé n'est jamais rangée en clair : elle est ENVELOPPÉE par une clé
 *     maîtresse qui ne vit pas dans la base (une variable d'environnement). Une
 *     copie de la base, ou du stockage, ne suffit donc pas à ouvrir un document.
 *
 * Chaque scellement tire un vecteur d'initialisation neuf (96 bits) et lie le
 * chiffré à un CONTEXTE (l'établissement) par les données associées de GCM :
 * un document scellé pour un établissement ne s'ouvre pas sous un autre, même
 * avec la bonne clé. L'étiquette d'authentification de GCM fait échouer
 * l'ouverture d'un chiffré modifié d'un seul bit — c'est une garde d'intégrité,
 * pas seulement de confidentialité.
 *
 * ⚠️ CE N'EST PAS UN CHIFFREMENT DE BOUT EN BOUT. Les serveurs détiennent les
 * clés : il le faut pour lire une facture et calculer un décompte. Aucun écran
 * ne doit dire le contraire.
 *
 * Web Crypto seulement : le même code tourne dans une action Node, dans le
 * moteur par défaut de Convex (actions HTTP) et dans Vitest.
 */

export const ALGORITHME = 'AES-256-GCM' as const;

/** Des octets posés sur un `ArrayBuffer` ordinaire : ce que Blob, Response et Web Crypto acceptent. */
export type Octets = Uint8Array<ArrayBuffer>;

/** La version du schéma de chiffrement : elle se lit sur chaque document scellé. */
export const VERSION_DU_SCEAU = 1;

const OCTETS_CLE = 32;
const OCTETS_IV = 12;

/** Une clé maîtresse absente ou mal formée : nommée, jamais contournée. */
export class CleMaitresseInvalide extends Error {
	constructor(raison: string) {
		super(
			`La clé maîtresse du coffre (COFFRE_CLE_MAITRESSE) ${raison}. ` +
				'Elle se tire avec « openssl rand -base64 32 » et se pose dans les variables ' +
				'd’environnement du déploiement Convex. Sans elle, aucun document ne se scelle ni ne s’ouvre.'
		);
		this.name = 'CleMaitresseInvalide';
	}
}

export function enBase64(octets: Uint8Array): string {
	let binaire = '';
	for (const octet of octets) binaire += String.fromCharCode(octet);
	return btoa(binaire);
}

export function depuisBase64(texte: string): Octets {
	const binaire = atob(texte);
	const octets = new Uint8Array(binaire.length);
	for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
	return octets;
}

/** La clé maîtresse, lue dans son texte base64 ; elle LÈVE plutôt que de deviner. */
export function cleMaitresseDepuis(texte: string | undefined): Octets {
	if (texte === undefined || texte.trim() === '') throw new CleMaitresseInvalide('n’est pas posée');
	let octets: Octets;
	try {
		octets = depuisBase64(texte.trim());
	} catch {
		throw new CleMaitresseInvalide('n’est pas un texte base64');
	}
	if (octets.length !== OCTETS_CLE) {
		throw new CleMaitresseInvalide(`fait ${octets.length} octets au lieu de ${OCTETS_CLE}`);
	}
	return octets;
}

async function importer(cle: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> {
	return await crypto.subtle.importKey(
		'raw',
		cle as BufferSource,
		{ name: 'AES-GCM' },
		false,
		usages
	);
}

/** Une clé d'établissement neuve : 256 bits tirés par le générateur du système. */
export function tirerUneCle(): Octets {
	return crypto.getRandomValues(new Uint8Array(OCTETS_CLE));
}

/** Les octets scellés, et le vecteur qu'il faudra pour les rouvrir. */
export interface Scelle {
	readonly chiffre: Octets;
	/** Le vecteur d'initialisation, en base64. Il n'est pas secret ; il est unique. */
	readonly iv: string;
}

/**
 * SCELLER : chiffrer des octets sous une clé, liés à un contexte.
 *
 * Le contexte (l'établissement) entre dans les données associées : il n'est pas
 * chiffré, il est AUTHENTIFIÉ. Rouvrir sous un autre contexte échoue.
 */
export async function sceller(
	octets: Uint8Array,
	cle: Uint8Array,
	contexte: string
): Promise<Scelle> {
	const iv = crypto.getRandomValues(new Uint8Array(OCTETS_IV));
	const chiffre = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv, additionalData: new TextEncoder().encode(contexte) },
		await importer(cle, ['encrypt']),
		octets as BufferSource
	);
	return { chiffre: new Uint8Array(chiffre), iv: enBase64(iv) };
}

/**
 * DESCELLER : rouvrir. LÈVE si la clé, le contexte ou le moindre octet du chiffré
 * ne sont pas ceux du scellement — l'étiquette de GCM ne pardonne rien.
 */
export async function desceller(
	chiffre: Uint8Array,
	iv: string,
	cle: Uint8Array,
	contexte: string
): Promise<Octets> {
	const clair = await crypto.subtle.decrypt(
		{
			name: 'AES-GCM',
			iv: depuisBase64(iv) as BufferSource,
			additionalData: new TextEncoder().encode(contexte)
		},
		await importer(cle, ['decrypt']),
		chiffre as BufferSource
	);
	return new Uint8Array(clair);
}

/** Envelopper une clé d'établissement sous la clé maîtresse : « iv.chiffré », en base64. */
export async function envelopper(cle: Uint8Array, maitresse: Uint8Array): Promise<string> {
	const { chiffre, iv } = await sceller(cle, maitresse, 'coffre:cle-etablissement');
	return `${iv}.${enBase64(chiffre)}`;
}

export async function desenvelopper(enveloppe: string, maitresse: Uint8Array): Promise<Octets> {
	const [iv, chiffre] = enveloppe.split('.');
	if (iv === undefined || chiffre === undefined) {
		throw new Error('La clé de l’établissement est mal rangée : son enveloppe est illisible.');
	}
	return await desceller(depuisBase64(chiffre), iv, maitresse, 'coffre:cle-etablissement');
}

/** L'empreinte SHA-256 d'un fichier, en hexadécimal : ce qui prouve qu'il n'a pas bougé. */
export async function empreinteDe(octets: Uint8Array): Promise<string> {
	const condensat = new Uint8Array(await crypto.subtle.digest('SHA-256', octets as BufferSource));
	return Array.from(condensat, (o) => o.toString(16).padStart(2, '0')).join('');
}
