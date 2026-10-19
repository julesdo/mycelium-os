/**
 * LA SOURCE DE LA VISITE, GARDÉE LE TEMPS DE LA VISITE (16/10/2026).
 *
 * L'amorce tourne dans le `<head>`, avant l'application : la première page vue de
 * l'onglet note son adresse et son site d'origine dans `sessionStorage`, une fois.
 * Ni cookie ni identifiant : l'onglet fermé, il ne reste rien.
 *
 * ⚠️ JAMAIS SUR LA PAGE OÙ LE CLIENT PAIE (`/p/<jeton>`) : c'est le débiteur de
 * nos clients, et rien de lui n'est noté (ligne rouge des surfaces tierces). Ni sur
 * la page de désinscription d'un prospect (`/desinscription/<jeton>`) : son adresse
 * porte le jeton qui l'identifie.
 *
 * La lecture (`croissance/source.ts`, `lireSource`) se fait côté serveur, à la
 * création de l'établissement : une adresse se fabrique, le serveur la borne.
 */

const CLE = 'letikette.source';
const LONGUEUR_MAX = 2000;

export const AMORCE_SOURCE = `try{if(!/^\\/(p|desinscription)\\//.test(location.pathname)&&!sessionStorage.getItem('${CLE}')){sessionStorage.setItem('${CLE}',JSON.stringify({url:String(location.href).slice(0,${LONGUEUR_MAX}),referent:String(document.referrer||'').slice(0,${LONGUEUR_MAX})}))}}catch(e){}`;

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
