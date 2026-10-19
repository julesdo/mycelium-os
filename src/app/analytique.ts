/**
 * LA MESURE D'AUDIENCE ET DU PRODUIT, PAR UMAMI (15/10/2026).
 *
 * Le fondateur : « analyser le trafic et le product analytics ». Umami Cloud, sans
 * cookie et sans identifiant de visiteur : il compte des pages vues et des
 * événements, rien qui suive une personne d'un site à l'autre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI NE PART JAMAIS CHEZ UMAMI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   · LA PAGE OÙ LE CLIENT PAIE (`/p/<jeton>`). C'est le débiteur de nos clients,
 *     pas notre utilisateur, et rien de lui ne remonte (ligne rouge des surfaces
 *     tierces, CLAUDE.md). Le script ne s'y charge même pas (`routes/__root.tsx`) ;
 *     et si l'on y arrive depuis l'application, l'envoi est annulé ici. De même pour
 *     la page de désinscription d’un prospect (`/desinscription/<jeton>`) et de la
 *     confirmation de la liste d’attente (`/attente/<jeton>`).
 *   · UN SECRET DANS UNE ADRESSE : le jeton d'une invitation (`/rejoindre/<jeton>`)
 *     est remplacé, les paramètres (`?token=`, `?_ptxn=`, `?document=`) et le
 *     fragment ne partent pas (`data-exclude-search`, `data-exclude-hash`).
 *   · UN IDENTIFIANT DE LA BASE : `/app/dossier/jd7…` devient `/app/dossier/:id`.
 *     On compte des écrans, pas des dossiers ; et les pages se regroupent.
 *   · UNE DONNÉE D'UN DOSSIER dans un événement : ni nom, ni montant, ni adresse.
 *     Un événement dit qu'un geste a eu lieu, et au plus sa forme (la formule
 *     choisie, combien de dossiers d'un coup).
 *
 * Le traceur ne tourne que sur le domaine de production (`data-domains`) : ni le
 * développement ni les aperçus de Vercel ne gonflent les chiffres. Il respecte
 * « Ne pas me pister » (`data-do-not-track`).
 */

export const SITE_UMAMI = 'a8539e74-7a3a-4f53-b2d6-5795346368b9';
export const SCRIPT_UMAMI = 'https://cloud.umami.is/script.js';
export const DOMAINES_MESURES = 'www.letikette.com,letikette.com';

/** Le nom de la fonction que le traceur appelle avant chaque envoi. */
const GARDE = '__gardeUmami';

/**
 * LE GARDE, POSÉ DANS LE `<head>` AVANT LE TRACEUR (la doc d'Umami l'exige : la
 * fonction doit exister quand le script se charge). Écrit en JavaScript simple,
 * sans dépendance : il tourne avant l'application.
 */
export const AMORCE_ANALYTIQUE = `window.${GARDE}=function(t,p){try{
var nu=function(u){if(!u)return u;var a;try{a=new URL(u,location.origin)}catch(e){return u}
if(a.origin!==location.origin)return u;
var s=a.pathname.split('/').map(function(x,i,l){return(l[1]==='rejoindre'&&i===2)?':jeton':(/^[a-z0-9]{20,}$/.test(x)?':id':x)}).join('/');
return /^https?:/.test(u)?a.origin+s:s};
var chemin=function(u){try{return new URL(u,location.origin).pathname}catch(e){return ''}};
var tu=/^\\/(p|desinscription|attente)\\//;
if(tu.test(chemin(p.url))||tu.test(location.pathname))return false;
p.url=nu(p.url);
if(p.referrer){p.referrer=tu.test(chemin(p.referrer))&&new URL(p.referrer,location.origin).origin===location.origin?'':nu(p.referrer)}
return p}catch(e){return false}};`;

/** Les attributs du traceur (`docs.umami.is/docs/tracker-configuration`). */
export const ATTRIBUTS_UMAMI = {
	'data-website-id': SITE_UMAMI,
	'data-domains': DOMAINES_MESURES,
	'data-before-send': GARDE,
	'data-exclude-search': 'true',
	'data-exclude-hash': 'true',
	'data-do-not-track': 'true',
	'data-performance': 'true'
} as const;

declare global {
	interface Window {
		umami?: { track: (nom: string, donnees?: Record<string, string | number | boolean>) => void };
	}
}

/**
 * LES ÉVÉNEMENTS DU PRODUIT — une liste fermée, pour que les tableaux d'Umami
 * gardent les mêmes noms d'une semaine à l'autre.
 */
export type EvenementProduit =
	| 'inscription'
	| 'premiers-pas-termines'
	| 'documents-deposes'
	| 'relances-activees'
	| 'relances-coupees'
	| 'dossier-demarre'
	| 'dossiers-demarres'
	| 'relance-retenue'
	| 'plume-question'
	| 'recherche-ouverte'
	| 'paiement-ouvert'
	| 'abonnement-souscrit'
	| 'installation-proposee'
	| 'installation-acceptee'
	| 'installation-refusee'
	// Le rapport du diagnostic express téléchargé (19/10/2026) : un geste, jamais un montant.
	| 'diagnostic-telecharge'
	// Le site (19/10/2026, audit) : un calcul fait par le visiteur, l'inscription pour le
	// diagnostic, une offre demandée, une inscription sur une liste d'attente.
	| 'calcul-fait'
	| 'diagnostic-lance'
	| 'offre-demandee'
	| 'attente-inscrite';

/**
 * Note qu'un geste a eu lieu. Sans traceur (développement, « Ne pas me pister »,
 * bloqueur), il ne se passe rien : la mesure ne casse jamais un geste.
 */
export function suivre(
	evenement: EvenementProduit,
	donnees?: Record<string, string | number | boolean>
): void {
	try {
		window.umami?.track(evenement, donnees);
	} catch {
		/* la mesure ne casse jamais un geste */
	}
}
