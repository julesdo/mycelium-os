import { pluriel } from '../../../socle/francais';

/**
 * PENDANT VOTRE ABSENCE — le point de Plume quand vous revenez (14/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI : UN COLLABORATEUR FIABLE DIT CE QU'IL A FAIT EN VOTRE ABSENCE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur : « je veux qu'on sente le côté fiable du compagnon […] qu'il
 * rassure l'utilisateur ». Plume relance à votre nom pendant que vous n'êtes pas
 * là ; à votre retour, sa bulle ne disait que ce qui arrivait SOUS VOS YEUX (rien
 * de ce qui était fini avant l'ouverture de l'application ne s'annonçait). Ce qui
 * était parti cette nuit, ce qui était rentré ce matin : il fallait aller le
 * chercher, écran par écran.
 *
 * Désormais, la première chose qu'il dit à votre retour est son POINT : ce qui est
 * parti à votre nom, ce qui est rentré, ce qu'il a ouvert, ce qui vous attend, puis
 * ce qui part ensuite. Comme le relevé d'un comptable, chaque ligne est un fait
 * compté ; rien n'est interprété. Et quand rien n'a bougé, il le dit aussi : une
 * nuit calme est une information.
 *
 * ⚠️ CE MODULE NE LIT NI L'HORLOGE NI LA BASE : il reçoit les faits comptés
 * (`convex/recouvrement/journee.ts`, `ouvrirLaVisite`) et les heures formatées par
 * l'appelant.
 */

export interface FaitsDuRetour {
	/** La visite précédente. */
	readonly depuis: number;
	readonly maintenant: number;
	/** Les relances que le pilote a envoyées depuis, et le client de la première. */
	readonly relancesParties: { readonly nombre: number; readonly client: string | null };
	readonly paiements: { readonly nombre: number; readonly client: string | null };
	/** Les dossiers que Plume a ouverts seul pour des factures échues. */
	readonly dossiersOuverts: number;
	/** Les notifications arrivées depuis, encore non lues. */
	readonly aLire: number;
	/** Les relances encore programmées. */
	readonly programmees: { readonly nombre: number; readonly premiere: number | null };
	/** Ce qui attend le gérant : dossiers à démarrer, lettres à relire, questions. */
	readonly enAttente: number;
}

export type IconeDuRetour = 'ENVOI' | 'PAIEMENT' | 'DOSSIER' | 'A_LIRE' | 'CALME';

export interface LigneDuRetour {
	readonly icone: IconeDuRetour;
	readonly texte: string;
}

export interface PointDuRetour {
	/** Une par visite : le même point ne se redit pas. */
	readonly cle: string;
	/** « Bonjour Jules. Depuis hier, 18 h 40 : » */
	readonly texte: string;
	readonly lignes: readonly LigneDuRetour[];
	/** Ce qui vient ensuite, en pied de bulle. */
	readonly pied: string;
	readonly humeur: 'salue' | 'content' | 'attention';
	/** Le geste : les notifications s'il y en a à lire, sinon sa page. */
	readonly cible: 'NOTIFICATIONS' | 'CONVERSATION';
	readonly libelleDuGeste: string;
	/** Vrai quand le point dit bonjour : le bonjour d'Aujourd'hui se tait. */
	readonly ditBonjour: boolean;
}

/** Une simple recharge de page n'est pas une absence. */
export const ABSENCE_MINIMALE_MS = 20 * 60_000;
/** Une absence assez longue pour qu'une nuit calme vaille d'être dite. */
const ABSENCE_A_DIRE_MEME_CALME_MS = 6 * 60 * 60_000;

/**
 * LE POINT, OU RIEN.
 *
 * Rien quand on vient de recharger la page (moins de vingt minutes), ou quand
 * rien n'a bougé pendant une absence courte : Plume ne parle pas pour ne rien dire.
 */
export function pointDuRetour(
	faits: FaitsDuRetour,
	mots: {
		readonly prenom: string | null;
		/** « 14 h 02 » */
		readonly heure: (instant: number) => string;
		/** « hier, 18 h 40 », « lundi », « le 9 octobre » — `null` le jour même. */
		readonly jourDe: (instant: number) => string | null;
		/** « demain à 9 h » */
		readonly quand: (instant: number) => string;
		/** « 2 480,00 € » : le total des paiements, formaté par l'appelant. */
		readonly totalDesPaiements: string | null;
	}
): PointDuRetour | null {
	const absence = faits.maintenant - faits.depuis;
	if (absence < ABSENCE_MINIMALE_MS) return null;

	const lignes: LigneDuRetour[] = [];
	const parties = faits.relancesParties.nombre;
	if (parties > 0) {
		lignes.push({
			icone: 'ENVOI',
			texte:
				parties === 1 && faits.relancesParties.client !== null
					? `1 relance partie à votre nom, à ${faits.relancesParties.client}`
					: `${parties} relance${pluriel(parties)} partie${pluriel(parties)} à votre nom`
		});
	}
	const payes = faits.paiements.nombre;
	if (payes > 0) {
		const qui =
			payes === 1 && faits.paiements.client !== null ? ` de ${faits.paiements.client}` : '';
		lignes.push({
			icone: 'PAIEMENT',
			texte: `${payes} paiement${pluriel(payes)} reçu${pluriel(payes)}${qui}${mots.totalDesPaiements === null ? '' : ` : ${mots.totalDesPaiements}`}`
		});
	}
	if (faits.dossiersOuverts > 0) {
		const n = faits.dossiersOuverts;
		lignes.push({
			icone: 'DOSSIER',
			texte: `${n} dossier${pluriel(n)} ouvert${pluriel(n)} pour des factures échues`
		});
	}
	if (faits.aLire > 0) {
		const n = faits.aLire;
		lignes.push({ icone: 'A_LIRE', texte: `${n} notification${pluriel(n)} à lire` });
	}
	if (lignes.length === 0) {
		if (absence < ABSENCE_A_DIRE_MEME_CALME_MS) return null;
		lignes.push({
			icone: 'CALME',
			texte: 'Rien n’a bougé : aucune relance partie, aucun paiement reçu'
		});
	}

	const jour = mots.jourDe(faits.depuis);
	const ditBonjour = jour !== null;
	const salut = ditBonjour ? `Bonjour${mots.prenom === null ? '' : ` ${mots.prenom}`}. ` : '';
	const depuis =
		jour === null ? `Depuis votre passage de ${mots.heure(faits.depuis)} :` : `Depuis ${jour} :`;

	const programmees = faits.programmees;
	const pied =
		programmees.nombre > 0 && programmees.premiere !== null
			? programmees.nombre === 1
				? `Ensuite : une relance, ${mots.quand(programmees.premiere)}. Elle s’affichera au-dessus de la barre une heure avant.`
				: `Ensuite : ${programmees.nombre} relances, la première ${mots.quand(programmees.premiere)}. Chacune s’affichera au-dessus de la barre une heure avant.`
			: faits.enAttente > 0
				? `${faits.enAttente} chose${pluriel(faits.enAttente)} ${faits.enAttente > 1 ? 'attendent' : 'attend'} votre feu vert ; rien ne part sans vous.`
				: 'Je relis vos comptes toutes les quinze minutes, et je vous dis ici ce que je fais.';

	return {
		cle: `retour:${faits.depuis}`,
		texte: `${salut}${depuis}`,
		lignes,
		pied,
		humeur: faits.aLire > 0 ? 'attention' : ditBonjour ? 'salue' : 'content',
		cible: faits.aLire > 0 ? 'NOTIFICATIONS' : 'CONVERSATION',
		libelleDuGeste: faits.aLire > 0 ? 'Les lire' : 'Tout voir',
		ditBonjour
	};
}
