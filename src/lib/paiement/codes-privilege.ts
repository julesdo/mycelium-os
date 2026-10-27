import { FORMULES, GRILLE, type Formule, type Rythme } from '../config/tarifs';

/**
 * LES CODES PRIVILÈGES (27/10/2026). Le fondateur : « des codes ultras secrets à usage
 * unique […] révocables en un clic », qui offrent une remise sur un ou plusieurs mois,
 * ou l'accès à vie. Relevé sur Mobbin : la création chez Stripe, Klaviyo et Whop, la clé
 * montrée une seule fois chez Vercel, Coinbase et Gamma, la saisie chez l'App Store,
 * Ahead et Forest.
 *
 * ⚠️ UN CODE N'EST JAMAIS GARDÉ EN CLAIR. Seize signes tirés au hasard (80 bits, l'alphabet
 * de Crockford, sans I, L, O ni U), montrés UNE fois à qui les crée ; la base n'en garde
 * que l'empreinte SHA-256 et les quatre derniers signes, pour qu'on le reconnaisse dans la
 * liste. 80 bits ne se devinent pas, ni en ligne (cinq essais par quart d'heure) ni sur une
 * base volée.
 */

/** L'alphabet de Crockford : 32 signes, sans les lettres qu'on confond (I, L, O) ni U. */
export const ALPHABET_DES_CODES = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const LONGUEUR_DES_CODES = 16;
/** 16 signes de 5 bits : dix octets d'aléa, exactement. */
export const OCTETS_D_UN_CODE = 10;

/** Le code que donnent dix octets d'aléa, cinq bits par signe. */
export function codeDepuisOctets(octets: Uint8Array): string {
	if (octets.length < OCTETS_D_UN_CODE) {
		throw new Error(`Un code se tire sur ${OCTETS_D_UN_CODE} octets.`);
	}
	let code = '';
	let valeur = 0;
	let bits = 0;
	for (const octet of octets.subarray(0, OCTETS_D_UN_CODE)) {
		valeur = (valeur << 8) | octet;
		bits += 8;
		while (bits >= 5) {
			bits -= 5;
			code += ALPHABET_DES_CODES.charAt((valeur >> bits) & 31);
		}
		valeur &= (1 << bits) - 1;
	}
	return code;
}

/** « ABCD-EFGH-JKMN-PQRS » : quatre groupes, comme une carte cadeau. */
export function formaterCode(code: string): string {
	return (code.match(/.{1,4}/g) ?? []).join('-');
}

/** Les quatre derniers signes : ce que la liste de l'admin montre d'un code. */
export function finDuCode(code: string): string {
	return code.slice(-4);
}

/** Les signes valides d'une saisie, dans l'ordre : O se lit 0, I et L se lisent 1. */
function signesValides(saisie: string): string {
	return [...saisie.toUpperCase()]
		.map((c) => (c === 'O' ? '0' : c === 'I' || c === 'L' ? '1' : c))
		.filter((c) => ALPHABET_DES_CODES.includes(c))
		.join('');
}

/** Le code qu'une saisie désigne, ou `null` quand elle n'a pas seize signes valides. */
export function normaliserCode(saisie: string): string | null {
	// Un signe hors de l'alphabet (U, une ponctuation glissée au milieu) rend la saisie
	// invalide ; seuls les espaces et les tirets s'ignorent.
	const nettoyee = saisie.toUpperCase().replace(/[\s-]/g, '');
	const signes = signesValides(nettoyee);
	if (signes.length !== nettoyee.length || signes.length !== LONGUEUR_DES_CODES) return null;
	return signes;
}

/** La saisie mise en forme pendant la frappe : majuscules, groupes de quatre, seize signes au plus. */
export function saisieDuCode(saisie: string): string {
	return formaterCode(signesValides(saisie).slice(0, LONGUEUR_DES_CODES));
}

/** L'empreinte SHA-256 du code, en hexadécimal : la seule chose que la base garde. */
export async function empreinteDuCode(code: string): Promise<string> {
	const normal = normaliserCode(code) ?? code;
	const octets = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normal));
	return Array.from(new Uint8Array(octets), (o) => o.toString(16).padStart(2, '0')).join('');
}

// ── Ce qu'il offre ──────────────────────────────────────────────────────────

export type AvantagePrivilege =
	| { readonly genre: 'REMISE'; readonly pourcent: number; readonly mois: number }
	| { readonly genre: 'A_VIE'; readonly formule: Formule };

/** Les choix que propose la création (l'admin), du plus courant au plus généreux. */
export const POURCENTS_PROPOSES = [20, 30, 50, 100] as const;
export const MOIS_PROPOSES = [1, 2, 3, 6, 12] as const;
export const NOMBRES_DE_CODES = [1, 5, 10] as const;
/** La validité d'un code avant usage, en jours ; `null` : sans limite. */
export const VALIDITES_PROPOSEES = [30, 90, null] as const;
export const MAX_CODES_PAR_CREATION = 20;

/** Le refus, ou `null` quand l'avantage se crée tel quel. */
export function avantageValide(avantage: AvantagePrivilege): string | null {
	if (avantage.genre === 'A_VIE') {
		return (FORMULES as readonly string[]).includes(avantage.formule)
			? null
			: 'Choisissez la formule offerte.';
	}
	if (!Number.isInteger(avantage.pourcent) || avantage.pourcent < 1 || avantage.pourcent > 100) {
		return 'La remise va de 1 à 100 %, en nombre entier.';
	}
	if (!Number.isInteger(avantage.mois) || avantage.mois < 1 || avantage.mois > 24) {
		return 'La remise court de 1 à 24 mois.';
	}
	return null;
}

/** « −50 % pendant 3 mois », « 3 mois offerts », « Accès Pro offert à vie ». */
export function libelleDeLAvantage(avantage: AvantagePrivilege): string {
	if (avantage.genre === 'A_VIE') return `Accès ${GRILLE[avantage.formule].nom} offert à vie`;
	const { pourcent, mois } = avantage;
	if (pourcent === 100) return `${mois} mois offert${mois > 1 ? 's' : ''}`;
	return `−${pourcent}\u00a0% pendant ${mois} mois`;
}

// ── Son état ────────────────────────────────────────────────────────────────

export type EtatDuCode = 'DISPONIBLE' | 'UTILISE' | 'REVOQUE' | 'EXPIRE';

/**
 * Révoqué d'abord (le geste du fondateur prime), puis utilisé (un code utilisé avant son
 * expiration garde son avantage), puis expiré.
 */
export function etatDuCode(
	code: { readonly utiliseLe?: number; readonly revoqueLe?: number; readonly expireLe?: number },
	maintenant: number
): EtatDuCode {
	if (code.revoqueLe !== undefined) return 'REVOQUE';
	if (code.utiliseLe !== undefined) return 'UTILISE';
	if (code.expireLe !== undefined && code.expireLe <= maintenant) return 'EXPIRE';
	return 'DISPONIBLE';
}

/**
 * ⚠️ UN SEUL REFUS POUR TOUT CODE QUI NE SERT PAS : inconnu, déjà utilisé, révoqué ou
 * expiré. Les distinguer dirait à qui essaie des codes lesquels existent.
 */
export const REFUS_DU_CODE =
	'Ce code n’est pas valable. Vérifiez-le, ou demandez-en un nouveau à qui vous l’a donné.';

// ── Les essais ──────────────────────────────────────────────────────────────

export const MAX_ESSAIS = 5;
export const FENETRE_DES_ESSAIS_MS = 15 * 60 * 1000;
export const REFUS_TROP_D_ESSAIS =
	'Trop d’essais pour ce quart d’heure. Réessayez dans quinze minutes.';

export interface EssaisDeCodes {
	readonly nombre: number;
	readonly depuis: number;
}

/** Compte un essai : cinq par quart d'heure et par établissement, puis il faut attendre. */
export function tenterUnCode(
	etat: EssaisDeCodes | undefined,
	maintenant: number
): { readonly autorise: boolean; readonly etat: EssaisDeCodes } {
	if (etat === undefined || maintenant - etat.depuis >= FENETRE_DES_ESSAIS_MS) {
		return { autorise: true, etat: { nombre: 1, depuis: maintenant } };
	}
	if (etat.nombre >= MAX_ESSAIS) return { autorise: false, etat };
	return { autorise: true, etat: { nombre: etat.nombre + 1, depuis: etat.depuis } };
}

// ── Pour un établissement ───────────────────────────────────────────────────

export const REFUS_SANS_ADMINISTRATEUR =
	'Seul un administrateur de l’établissement peut utiliser un code privilège.';

/** Ce qui compte d'un établissement pour utiliser un code. */
export interface EtablissementPourUnCode {
	readonly accesOffert: boolean;
	readonly remiseEnAttente: boolean;
	/** L'abonnement en cours (à l'essai ou payé), ou `null`. */
	readonly abonnement: {
		readonly statut: 'active' | 'trialing';
		readonly formule: Formule;
		readonly rythme: Rythme;
		/** Une résiliation déjà programmée. */
		readonly resilie: boolean;
	} | null;
}

/**
 * Le refus d'un code DISPONIBLE pour cet établissement, ou `null`. Le code n'est pas
 * consommé : il reste à qui saura s'en servir.
 */
export function refusPourLEtablissement(
	avantage: AvantagePrivilege,
	etablissement: EtablissementPourUnCode
): string | null {
	if (etablissement.accesOffert) {
		return avantage.genre === 'A_VIE'
			? 'Votre établissement a déjà un accès offert à vie.'
			: 'Votre accès est déjà offert à vie : cette remise ne servirait à rien.';
	}
	if (avantage.genre === 'REMISE' && etablissement.remiseEnAttente) {
		return 'Une remise privilège attend déjà votre abonnement.';
	}
	return null;
}

function euros(centimes: number): string {
	return `${(centimes / 100).toLocaleString('fr-FR', { minimumFractionDigits: centimes % 100 === 0 ? 0 : 2 })}\u00a0€`;
}

/** Ce que le code va changer, dit avant de l'utiliser, puis redit sur la coche. */
export function consequencesDuCode(
	avantage: AvantagePrivilege,
	etablissement: EtablissementPourUnCode
): readonly string[] {
	const usageUnique = 'Le code ne servira plus : il ne s’utilise qu’une fois.';
	const abonnement = etablissement.abonnement;
	if (avantage.genre === 'A_VIE') {
		const nom = GRILLE[avantage.formule].nom;
		return [
			`Toutes les fonctions de ${nom}, sans aucun prélèvement.`,
			...(abonnement === null || abonnement.resilie
				? []
				: [
						abonnement.statut === 'trialing'
							? 'Votre essai s’arrête : rien ne sera prélevé.'
							: `Votre abonnement ${GRILLE[abonnement.formule].nom} s’arrête à son échéance : plus rien n’est prélevé ensuite.`
					]),
			usageUnique
		];
	}
	const { pourcent, mois } = avantage;
	let effet: string;
	if (abonnement === null || abonnement.resilie) {
		effet = 'La remise s’appliquera à votre abonnement dès que vous aurez choisi une formule.';
	} else if (abonnement.rythme === 'mensuel') {
		effet =
			pourcent === 100
				? mois > 1
					? `Vos ${mois} prochains prélèvements sont offerts.`
					: 'Votre prochain prélèvement est offert.'
				: `−${pourcent}\u00a0% sur ${mois > 1 ? `vos ${mois} prochains prélèvements` : 'votre prochain prélèvement'}.`;
	} else {
		effet = `${euros(remiseAnnuelleCentimes(abonnement.formule, pourcent, mois))} HT déduits de votre prochaine échéance annuelle.`;
	}
	return [effet, usageUnique];
}

// ── Chez Paddle ─────────────────────────────────────────────────────────────

/** La remise d'un abonnement à l'année : la part du prix mensuel HT, sur les mois offerts. */
export function remiseAnnuelleCentimes(formule: Formule, pourcent: number, mois: number): number {
	return Math.round((GRILLE[formule].mensuel * 100 * pourcent * mois) / 100);
}

/**
 * Le corps de `POST /discounts` (Paddle Billing). Au mois : un pourcentage sur les N
 * prochains prélèvements. À l'année, un pourcentage récurrent courrait N ANS : la remise
 * devient un montant fixe, déduit une fois de la prochaine échéance, comme le mois offert
 * d'une recommandation. Jamais proposée au paiement, une seule fois.
 */
export function corpsDeLaRemisePrivilege({
	organisationId,
	avantage,
	formule,
	rythme
}: {
	readonly organisationId: string;
	readonly avantage: Extract<AvantagePrivilege, { genre: 'REMISE' }>;
	readonly formule: Formule;
	readonly rythme: Rythme;
}): Record<string, unknown> {
	const commun = {
		description: `Code privilège · ${libelleDeLAvantage(avantage)}`,
		enabled_for_checkout: false,
		usage_limit: 1,
		custom_data: { letikette_organisation: organisationId }
	};
	if (rythme === 'mensuel') {
		return {
			...commun,
			amount: String(avantage.pourcent),
			type: 'percentage',
			recur: true,
			maximum_recurring_intervals: avantage.mois
		};
	}
	return {
		...commun,
		amount: String(remiseAnnuelleCentimes(formule, avantage.pourcent, avantage.mois)),
		type: 'flat',
		currency_code: 'EUR',
		recur: false
	};
}
