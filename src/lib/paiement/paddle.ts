/**
 * Paddle, côté logique pure : l'environnement, l'adresse de l'API, la
 * signature d'un rappel, ce que dit un événement reçu, le sceau qui lie un
 * paiement à son établissement, et le catalogue attendu.
 *
 * Aucun import Convex ni React : le serveur le lit, le navigateur aussi, et les
 * tests sans harnais. Les fonctions Convex vivent dans `convex/paddle.ts` et
 * `convex/paddleCatalogue.ts`.
 */
import { prixFondateursAttendu } from './offres';
import {
	DUREE_ESSAI_JOURS,
	FORMULES,
	GRILLE,
	RYTHMES,
	VERSION_GRILLE,
	montantDuRythme,
	type Formule,
	type Rythme
} from '../config/tarifs';

export type EnvironnementPaddle = 'sandbox' | 'production';

// ── L'environnement ─────────────────────────────────────────────────────────

/**
 * Bac à sable ou compte live, lu sur la clé elle-même.
 *
 * Une clé Paddle porte son environnement dans son préfixe (`pdl_sdbx_`,
 * `pdl_live_`). La lire évite le pire défaut possible ici : une clé live
 * envoyée à l'API du bac à sable, ou l'inverse, qui échoue en « non autorisé »
 * sans dire pourquoi. `PADDLE_ENVIRONMENT` reste lu quand il est posé, et s'il
 * contredit la clé, on le DIT au lieu de choisir l'un des deux.
 */
export function environnementPaddle(env: {
	readonly PADDLE_ENVIRONMENT?: string;
	readonly PADDLE_API_KEY?: string;
}): EnvironnementPaddle {
	const declare = env.PADDLE_ENVIRONMENT?.trim() || undefined;
	if (declare !== undefined && declare !== 'sandbox' && declare !== 'production') {
		throw new Error(
			`PADDLE_ENVIRONMENT vaut « ${declare} » : seuls « sandbox » et « production » sont compris.`
		);
	}
	const deLaCle = environnementDeLaCle(env.PADDLE_API_KEY ?? '');
	if (declare !== undefined && deLaCle !== null && declare !== deLaCle) {
		throw new Error(
			`PADDLE_ENVIRONMENT dit « ${declare} », mais la clé d'API est une clé ${nomDeLEnvironnement(deLaCle)}.`
		);
	}
	return declare ?? deLaCle ?? 'production';
}

function environnementDeLaCle(cle: string): EnvironnementPaddle | null {
	if (cle.startsWith('pdl_sdbx_')) return 'sandbox';
	if (cle.startsWith('pdl_live_')) return 'production';
	return null;
}

/**
 * L'environnement d'un jeton côté client : `test_` pour le bac à sable,
 * `live_` pour le compte live. `null` pour une forme inconnue.
 */
export function environnementDuJeton(jeton: string): EnvironnementPaddle | null {
	if (jeton.startsWith('test_')) return 'sandbox';
	if (jeton.startsWith('live_')) return 'production';
	return null;
}

export function nomDeLEnvironnement(environnement: EnvironnementPaddle): string {
	return environnement === 'sandbox' ? 'de bac à sable' : 'live';
}

export function baseDeLApi(environnement: EnvironnementPaddle): string {
	return environnement === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
}

// ── La signature d'un rappel ────────────────────────────────────────────────

/**
 * Paddle signe chaque rappel : `Paddle-Signature: ts=<secondes>;h1=<hex>`, où
 * `h1` est le HMAC-SHA256 de `<ts>:<corps brut>` sous le secret de la
 * destination. Un rappel plus vieux que la tolérance est refusé : c'est ce qui
 * empêche de rejouer un rappel intercepté. Cinq secondes, comme les SDK de
 * Paddle.
 */
export async function signatureValide(entree: {
	readonly corps: string;
	readonly entete: string;
	readonly secret: string;
	readonly maintenantS: number;
	readonly toleranceS?: number;
}): Promise<boolean> {
	const parties = new Map<string, string>();
	for (const morceau of entree.entete.split(';')) {
		const i = morceau.indexOf('=');
		if (i > 0) parties.set(morceau.slice(0, i).trim(), morceau.slice(i + 1).trim());
	}
	const ts = parties.get('ts');
	const h1 = parties.get('h1');
	if (!ts || !h1 || !/^\d+$/.test(ts)) return false;
	if (Math.abs(entree.maintenantS - Number(ts)) > (entree.toleranceS ?? 5)) return false;

	const calcule = await hmacHex(entree.secret, `${ts}:${entree.corps}`);
	return egauxEnTempsConstant(calcule, h1);
}

async function hmacHex(secret: string, message: string): Promise<string> {
	const cle = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', cle, new TextEncoder().encode(message));
	return Array.from(new Uint8Array(signature))
		.map((o) => o.toString(16).padStart(2, '0'))
		.join('');
}

function egauxEnTempsConstant(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let ecart = 0;
	for (let i = 0; i < a.length; i++) ecart |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return ecart === 0;
}

// ── Le sceau de l'établissement ─────────────────────────────────────────────

/**
 * Ce que le paiement emporte pour retrouver son établissement.
 *
 * ⚠️ SCELLÉ, PARCE QUE LE JETON CÔTÉ CLIENT EST PUBLIC. N'importe qui peut
 * ouvrir un paiement Paddle avec nos prix et y écrire l'identifiant d'un autre
 * établissement : sans sceau, son abonnement viendrait se poser sur un compte
 * qui n'est pas le sien. Le sceau est un HMAC de l'identifiant sous un secret
 * que seul le serveur connaît ; le rappel le recalcule avant d'écrire quoi que
 * ce soit.
 */
export const CLE_ORGANISATION = 'letikette_organisation';
export const CLE_SCEAU = 'letikette_sceau';

export async function sceller(secret: string, organisationId: string): Promise<string> {
	return hmacHex(secret, `organisation:${organisationId}`);
}

export async function sceauValide(
	secret: string,
	organisationId: string,
	sceau: string
): Promise<boolean> {
	return egauxEnTempsConstant(await sceller(secret, organisationId), sceau);
}

// ── Ce que dit un événement ────────────────────────────────────────────────

/**
 * Les événements à cocher sur la destination de notification, dans le
 * tableau de bord de Paddle. Tous les `subscription.*` passent par le même
 * chemin : chacun porte le statut courant de l'abonnement.
 */
export const EVENEMENTS_ECOUTES = [
	'subscription.created',
	'subscription.activated',
	'subscription.updated',
	'subscription.past_due',
	'subscription.paused',
	'subscription.resumed',
	'subscription.canceled',
	'transaction.completed'
] as const;

export interface LienDOrganisation {
	readonly organisationId: string;
	readonly sceau: string;
}

export type EvenementPaddle =
	| {
			readonly genre: 'abonnement';
			readonly abonnementId: string;
			readonly clientId: string;
			readonly statut: string;
			readonly prixId: string | null;
			readonly finDePeriode: number | null;
			/** Le prochain prélèvement ; pendant l'essai, c'est le premier. */
			readonly prochainPrelevementLe: number | null;
			/** La fin de l'essai, tant qu'il court. */
			readonly essaiFinLe: number | null;
			/** Une résiliation programmée : le jour où elle prend effet. */
			readonly resiliationLe: number | null;
			readonly lien: LienDOrganisation | null;
			readonly survenuLe: number;
	  }
	| {
			readonly genre: 'paiement';
			readonly transactionId: string;
			/** Présent quand le paiement règle un abonnement (le premier, ou un renouvellement). */
			readonly abonnementId: string | null;
			readonly clientId: string | null;
			readonly prixIds: readonly string[];
			readonly finDePeriode: number | null;
			readonly lien: LienDOrganisation | null;
			readonly survenuLe: number;
	  }
	| { readonly genre: 'ignore'; readonly type: string };

/**
 * Lit un rappel déjà authentifié. Ce qui ne porte pas les champs attendus est
 * ignoré plutôt que deviné : un abonnement sans identifiant ne se range nulle
 * part.
 */
export function lireEvenement(brut: unknown): EvenementPaddle {
	const evenement = objet(brut);
	const type = texte(evenement?.event_type) ?? '';
	const data = objet(evenement?.data);
	const survenuLe = date(evenement?.occurred_at);
	if (data === null || survenuLe === null) return { genre: 'ignore', type };

	const lien = lienDe(objet(data.custom_data));

	if (type.startsWith('subscription.')) {
		const abonnementId = texte(data.id);
		const clientId = texte(data.customer_id);
		const statut = texte(data.status);
		if (abonnementId === null || clientId === null || statut === null) {
			return { genre: 'ignore', type };
		}
		return {
			genre: 'abonnement',
			abonnementId,
			clientId,
			statut,
			prixId: prixDes(data.items)[0] ?? null,
			finDePeriode: date(objet(data.current_billing_period)?.ends_at),
			prochainPrelevementLe: date(data.next_billed_at),
			essaiFinLe:
				statut === 'trialing'
					? (date(objet(objet(premier(data.items))?.trial_dates)?.ends_at) ??
						date(data.next_billed_at))
					: null,
			resiliationLe:
				texte(objet(data.scheduled_change)?.action) === 'cancel'
					? date(objet(data.scheduled_change)?.effective_at)
					: null,
			lien,
			survenuLe
		};
	}

	if (type === 'transaction.completed') {
		const transactionId = texte(data.id);
		if (transactionId === null) return { genre: 'ignore', type };
		return {
			genre: 'paiement',
			transactionId,
			abonnementId: texte(data.subscription_id),
			clientId: texte(data.customer_id),
			prixIds: prixDes(data.items),
			finDePeriode: date(objet(data.billing_period)?.ends_at),
			lien,
			survenuLe
		};
	}

	return { genre: 'ignore', type };
}

/** Les cinq statuts d'un abonnement Paddle, dans ceux que l'établissement retient. */
export function statutInterne(
	statut: string
): 'active' | 'trialing' | 'paused' | 'past_due' | 'canceled' {
	switch (statut) {
		case 'active':
		case 'trialing':
		case 'paused':
		case 'past_due':
			return statut;
		default:
			// `canceled`, et toute forme inconnue : rien n'est ouvert sur un statut
			// qu'on ne sait pas lire.
			return 'canceled';
	}
}

function lienDe(donnees: Record<string, unknown> | null): LienDOrganisation | null {
	const organisationId = texte(donnees?.[CLE_ORGANISATION]);
	const sceau = texte(donnees?.[CLE_SCEAU]);
	return organisationId === null || sceau === null ? null : { organisationId, sceau };
}

function premier(items: unknown): unknown {
	return Array.isArray(items) ? items[0] : undefined;
}

function prixDes(items: unknown): string[] {
	if (!Array.isArray(items)) return [];
	return items
		.map((item) => texte(objet(objet(item)?.price)?.id))
		.filter((id): id is string => id !== null);
}

function objet(valeur: unknown): Record<string, unknown> | null {
	return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
		? (valeur as Record<string, unknown>)
		: null;
}

function texte(valeur: unknown): string | null {
	return typeof valeur === 'string' && valeur !== '' ? valeur : null;
}

function date(valeur: unknown): number | null {
	const t = texte(valeur);
	if (t === null) return null;
	const ms = Date.parse(t);
	return Number.isNaN(ms) ? null : ms;
}

// ── Le catalogue attendu ────────────────────────────────────────────────────

/**
 * Le catalogue Paddle tel que la grille l'exige : un produit par formule, et
 * quatre prix chacun (au mois ou à l'année, avec ou sans les trente jours
 * d'essai), tirés de `GRILLE`. C'est la seule façon d'être sûr que le montant
 * prélevé est celui que la page publique affiche.
 *
 * ⚠️ POURQUOI DES PRIX SANS ESSAI. Chez Paddle, l'essai est porté par le PRIX,
 * pas par le paiement : un établissement qui a déjà eu son essai doit souscrire
 * un prix qui n'en a pas, sinon chaque résiliation suivie d'une nouvelle
 * souscription rouvrirait trente jours offerts.
 *
 * Chaque produit et chaque prix porte une ÉTIQUETTE dans ses données libres
 * (`custom_data.letikette`) : c'est ainsi qu'on les retrouve sans dépendre d'un
 * nom modifiable dans le tableau de bord. L'action du catalogue range ensuite
 * chaque identifiant dans la table `prixPaddle` : aucune variable à poser.
 */
export const CLE_ETIQUETTE = 'letikette';

/**
 * L'étiquette d'un prix : « equipe-mensuel-essai@g2 ». La version de la grille y
 * entre (`VERSION_GRILLE`) : un nouveau montant fait naître un nouveau prix au lieu
 * d'être signalé en écart, et les anciens prix restent lisibles pour qui les paie.
 */
export function etiquetteDuPrix(formule: Formule, rythme: Rythme, essai: boolean): string {
	return `${formule}-${rythme}${essai ? '-essai' : ''}@${VERSION_GRILLE}`;
}

/**
 * Ce que Paddle prélève vraiment à un abonné, en centimes : le montant du prix qu'il a
 * souscrit (`prixPaddle.montant`), et la grille seulement si ce prix est introuvable.
 *
 * ⚠️ JAMAIS LA GRILLE D'ABORD. Un abonné à 39 € reste à 39 € quand la grille passe à
 * 59 € : lui annoncer 59 € dans un rappel serait faux, et dans le sens qui inquiète.
 */
export function montantPreleve(
	montantDuPrixSouscrit: string | undefined | null,
	formule: Formule,
	rythme: Rythme
): number {
	const lu =
		montantDuPrixSouscrit === undefined || montantDuPrixSouscrit === null
			? Number.NaN
			: Number(montantDuPrixSouscrit);
	return Number.isInteger(lu) && lu > 0 ? lu : montantDuRythme(formule, rythme) * 100;
}

/**
 * CE QU'UNE TRANSACTION DE PADDLE PRÉLÈVE, en centimes (21/10/2026) : hors taxes,
 * remises déduites, et TVA comprise, tels que Paddle les a calculés pour CE client
 * (son pays, son numéro de TVA). Aucun taux n'est écrit ici : le hors taxes est le
 * total moins la taxe que Paddle annonce. `null` sans total ni taxe lisibles.
 */
export function montantsDeLaTransaction(
	transaction: unknown
): { readonly ht: number; readonly ttc: number } | null {
	if (typeof transaction !== 'object' || transaction === null) return null;
	const totaux = (transaction as { details?: { totals?: Record<string, unknown> } }).details
		?.totals;
	const lire = (valeur: unknown): number | null =>
		typeof valeur === 'string' && /^-?\d+$/.test(valeur) ? Number(valeur) : null;
	const total = lire(totaux?.total);
	const taxe = lire(totaux?.tax);
	if (total === null || taxe === null) return null;
	return { ht: total - taxe, ttc: total };
}

export interface PrixAttendu {
	readonly etiquette: string;
	readonly formule: Formule;
	readonly rythme: Rythme;
	readonly essai: boolean;
	/** Ce que le client lit au paiement et sur sa facture. */
	readonly nom: string;
	/** En centimes, en texte, comme l'API de Paddle les attend. */
	readonly montant: string;
	readonly devise: 'EUR';
	readonly cycle: { readonly interval: 'month' | 'year'; readonly frequency: 1 };
	/** Les jours d'essai, ou `null`. */
	readonly essaiJours: number | null;
	/** Le prix fondateurs (`offres.ts`) : compté, daté, jamais migré. */
	readonly fondateurs?: boolean;
}

export interface ProduitAttendu {
	readonly etiquette: Formule;
	readonly nom: string;
	readonly description: string;
	readonly prix: readonly PrixAttendu[];
}

export function catalogueAttendu(): readonly ProduitAttendu[] {
	return FORMULES.map((formule) => ({
		...produitDeLaGrille(formule),
		// Le prix fondateurs vit sous le produit Pro, à côté des prix de la grille.
		...(formule === prixFondateursAttendu().formule
			? { prix: [...produitDeLaGrille(formule).prix, prixFondateursAttendu()] }
			: {})
	}));
}

function produitDeLaGrille(formule: Formule): ProduitAttendu {
	return {
		etiquette: formule,
		nom: `Letikette ${GRILLE[formule].nom}`,
		description: `${GRILLE[formule].pour} : vos factures lues, vos relances envoyées à votre nom, ce qu’on vous doit calculé au centime.`,
		prix: RYTHMES.flatMap((rythme) =>
			[true, false].map(
				(essai): PrixAttendu => ({
					etiquette: etiquetteDuPrix(formule, rythme, essai),
					formule,
					rythme,
					essai,
					nom: `${GRILLE[formule].nom}, ${rythme === 'annuel' ? 'à l’année' : 'au mois'}`,
					montant: String(montantDuRythme(formule, rythme) * 100),
					devise: 'EUR',
					cycle: { interval: rythme === 'annuel' ? 'year' : 'month', frequency: 1 },
					essaiJours: essai ? DUREE_ESSAI_JOURS : null
				})
			)
		)
	};
}

/** Ce qu'un prix existant dit, lu dans la réponse de l'API. */
export interface PrixExistant {
	readonly id: string;
	readonly montant: string | null;
	readonly devise: string | null;
	readonly cycle: { readonly interval: string; readonly frequency: number } | null;
	readonly essai: { readonly interval: string; readonly frequency: number } | null;
	readonly modeDeTaxe: string | null;
}

/**
 * Les écarts entre un prix existant et ce que la grille attend, en phrases.
 * Un prix Paddle ne se corrige pas une fois utilisé : un écart se règle en
 * créant un prix neuf, jamais en éditant l'ancien.
 */
export function ecartsDuPrix(attendu: PrixAttendu, existant: PrixExistant): string[] {
	const ecarts: string[] = [];
	if (existant.montant !== attendu.montant || existant.devise !== attendu.devise) {
		ecarts.push(
			`montant ${existant.montant ?? '?'} ${existant.devise ?? '?'} au lieu de ${attendu.montant} ${attendu.devise} (en centimes)`
		);
	}
	const cycle = existant.cycle;
	if (
		cycle === null ||
		cycle.interval !== attendu.cycle.interval ||
		cycle.frequency !== attendu.cycle.frequency
	) {
		ecarts.push(
			`cycle ${cycle === null ? 'paiement unique' : `${cycle.frequency} ${cycle.interval}`} au lieu de 1 ${attendu.cycle.interval}`
		);
	}
	const jours =
		existant.essai === null
			? null
			: existant.essai.interval === 'day'
				? existant.essai.frequency
				: Number.NaN;
	if (jours !== attendu.essaiJours) {
		ecarts.push(
			`essai ${existant.essai === null ? 'absent' : `${existant.essai.frequency} ${existant.essai.interval}`} au lieu de ${attendu.essaiJours === null ? 'aucun' : `${attendu.essaiJours} jours`}`
		);
	}
	if (existant.modeDeTaxe !== 'external') {
		ecarts.push(
			`mode de taxe « ${existant.modeDeTaxe ?? '?'} » : la grille affiche des prix hors taxes (« external »)`
		);
	}
	return ecarts;
}
