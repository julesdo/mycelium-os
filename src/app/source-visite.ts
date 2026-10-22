/**
 * LA SOURCE DE LA VISITE, GARDÉE LE TEMPS DE LA VISITE (16/10/2026).
 *
 * L'amorce tourne dans le `<head>`, avant l'application : la première page vue de
 * l'onglet note son adresse et son site d'origine dans `sessionStorage`, une fois.
 * Ni cookie ni identifiant : l'onglet fermé, il ne reste rien.
 *
 * ⚠️ JAMAIS SUR LA PAGE OÙ LE CLIENT PAIE (`/p/<jeton>`) : c'est le débiteur de
 * nos clients, et rien de lui n'est noté (ligne rouge des surfaces tierces). Ni sur
 * la page de désinscription d’un prospect (`/desinscription/<jeton>`), ni sur la
 * confirmation de la liste d’attente (`/attente/<jeton>`) : leur adresse
 * porte le jeton qui l'identifie.
 *
 * La lecture (`croissance/source.ts`, `lireSource`) se fait côté serveur, à la
 * création de l'établissement : une adresse se fabrique, le serveur la borne.
 */

const CLE = 'letikette.source';
const LONGUEUR_MAX = 2000;

/**
 * LE CODE D'UNE RECOMMANDATION (`/invitation/<code>`, ou l'ancien `/?parrain=<code>`,
 * 21/10/2026) : gardé à part, et même dans une visite déjà notée — un lien recommandé
 * ouvert dans un onglet qui a déjà vu le site ne doit pas se perdre. Le serveur en
 * vérifie la forme à l'inscription.
 */
const CLE_PARRAIN = 'letikette.parrain';

export const AMORCE_SOURCE = `try{if(!/^\\/(p|desinscription|attente)\\//.test(location.pathname)){if(!sessionStorage.getItem('${CLE}')){sessionStorage.setItem('${CLE}',JSON.stringify({url:String(location.href).slice(0,${LONGUEUR_MAX}),referent:String(document.referrer||'').slice(0,${LONGUEUR_MAX})}))}var m=/^\\/invitation\\/([^/?#]+)/.exec(location.pathname)||/[?&]parrain=([^&#]*)/.exec(location.search||'');if(m){sessionStorage.setItem('${CLE_PARRAIN}',decodeURIComponent(m[1]).slice(0,32).toUpperCase())}}}catch(e){}`;

/**
 * La page d'invitation note son code elle-même : ouverte par la navigation de
 * l'application, elle ne repasse pas par l'amorce du premier chargement.
 */
export function noterParrainDeLaVisite(code: string): void {
	try {
		sessionStorage.setItem(CLE_PARRAIN, code.slice(0, 32).toUpperCase());
	} catch {
		// Stockage refusé (navigation privée stricte) : l'invitation reste lisible, le
		// rattachement seul se perd.
	}
}

/** Le code de la recommandation qui a mené à l'inscription, s'il y en a un. */
export function lireParrainDeLaVisite(): string | undefined {
	try {
		const code = sessionStorage.getItem(CLE_PARRAIN);
		return code === null || code === '' ? undefined : code.slice(0, 32);
	} catch {
		return undefined;
	}
}

/** La source notée par l'amorce, pour la joindre à la création de l'établissement. */
export function lireSourceDeLaVisite(): { url: string; referent: string } | undefined {
	try {
		const brut = sessionStorage.getItem(CLE);
		if (brut === null) return undefined;
		const lu = JSON.parse(brut) as { url?: unknown; referent?: unknown };
		if (typeof lu.url !== 'string' || typeof lu.referent !== 'string') return undefined;
		return { url: lu.url.slice(0, LONGUEUR_MAX), referent: lu.referent.slice(0, LONGUEUR_MAX) };
	} catch {
		return undefined;
	}
}
