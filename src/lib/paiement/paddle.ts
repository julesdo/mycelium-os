/**
 * Paddle, côté logique pure : l'environnement, l'adresse de l'API, la
 * signature d'un rappel, ce que dit un événement reçu, le sceau qui lie un
 * paiement à son établissement, et le catalogue attendu.
 *
 * Aucun import Convex ni React : le serveur le lit, le navigateur aussi, et les
 * tests sans harnais. Les fonctions Convex vivent dans `convex/paddle.ts` et
 * `convex/paddleCatalogue.ts`.
 */
import { BORNES_PALIER, PALIERS, TARIFS, type PalierTaille } from '../config/tarifs';

export type EnvironnementPaddle = 'sandbox' | 'production';

/** Les deux offres de la grille, dans le vocabulaire de l'écran. */
export type OffrePaddle = 'bilan' | 'abonnement';

/**
 * Le nom de la variable qui porte un identifiant de prix.
 *
 * Les noms d'origine (`DIAGNOSTIC`, `CONFORMITE`) sont gardés : ils sont déjà
 * déclarés dans `.env-convex.schema`, et les renommer obligerait à reposer six
 * variables sur chaque déploiement pour rien.
 */
export function variableDePrix(offre: OffrePaddle, palier: PalierTaille): string {
	return `PADDLE_PRICE_${offre === 'bilan' ? 'DIAGNOSTIC' : 'CONFORMITE'}_${palier}`;
}

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
 * Le catalogue Paddle tel que la grille l'exige : deux produits, trois prix
 * chacun, tirés de `TARIFS`. C'est la seule façon d'être sûr que le montant
 * prélevé est celui que la page publique affiche.
 *
 * Chaque produit et chaque prix porte une ÉTIQUETTE dans ses données libres
 * (`custom_data.letikette`) : c'est ainsi qu'on les retrouve sans dépendre d'un
 * nom qu'on peut modifier dans le tableau de bord.
 */
export const CLE_ETIQUETTE = 'letikette';

export interface PrixAttendu {
	readonly etiquette: string;
	readonly offre: OffrePaddle;
	readonly palier: PalierTaille;
	readonly variable: string;
	readonly nom: string;
	/** En centimes, en texte, comme l'API de Paddle les attend. */
	readonly montant: string;
	readonly devise: 'EUR';
	/** `null` : un paiement unique. */
	readonly cycle: { readonly interval: 'month'; readonly frequency: 1 } | null;
}

export interface ProduitAttendu {
	readonly etiquette: OffrePaddle;
	readonly nom: string;
	readonly description: string;
	readonly prix: readonly PrixAttendu[];
}

export function catalogueAttendu(): readonly [ProduitAttendu, ProduitAttendu] {
	return [
		{
			etiquette: 'bilan',
			nom: 'Letikette, premier bilan',
			description:
				'Douze mois de factures lus en une fois : ce qui vous est dû, ce qui manque, en euros.',
			prix: PALIERS.map((palier) => ({
				etiquette: `bilan-${palier}`,
				offre: 'bilan',
				palier,
				variable: variableDePrix('bilan', palier),
				nom: `Premier bilan, ${BORNES_PALIER[palier]}`,
				montant: String(TARIFS[palier].bilan * 100),
				devise: 'EUR',
				cycle: null
			}))
		},
		{
			etiquette: 'abonnement',
			nom: 'Letikette, abonnement',
			description:
				'Vos factures suivies toute l’année : les échéances, les dates limites pour agir, les relances.',
			prix: PALIERS.map((palier) => ({
				etiquette: `abonnement-${palier}`,
				offre: 'abonnement',
				palier,
				variable: variableDePrix('abonnement', palier),
				nom: `Abonnement mensuel, ${BORNES_PALIER[palier]}`,
				montant: String(TARIFS[palier].abonnementMensuel * 100),
				devise: 'EUR',
				cycle: { interval: 'month', frequency: 1 }
			}))
		}
	];
}

/** Ce qu'un prix existant dit, lu dans la réponse de l'API. */
export interface PrixExistant {
	readonly id: string;
	readonly montant: string | null;
	readonly devise: string | null;
	readonly cycle: { readonly interval: string; readonly frequency: number } | null;
	readonly modeDeTaxe: string | null;
}

/**
 * Les écarts entre un prix existant et ce que la grille attend, en phrases.
 * Un prix Paddle ne se corrige pas une fois utilisé : un écart se règle en
 * créant un prix neuf et en y pointant la variable, jamais en éditant l'ancien.
 */
export function ecartsDuPrix(attendu: PrixAttendu, existant: PrixExistant): string[] {
	const ecarts: string[] = [];
	if (existant.montant !== attendu.montant || existant.devise !== attendu.devise) {
		ecarts.push(
			`montant ${existant.montant ?? '?'} ${existant.devise ?? '?'} au lieu de ${attendu.montant} ${attendu.devise} (en centimes)`
		);
	}
	const cycleAttendu = attendu.cycle === null ? 'paiement unique' : 'mensuel';
	const cycleExistant =
		existant.cycle === null
			? 'paiement unique'
			: existant.cycle.interval === 'month' && existant.cycle.frequency === 1
				? 'mensuel'
				: `${existant.cycle.frequency} ${existant.cycle.interval}`;
	if (cycleAttendu !== cycleExistant) ecarts.push(`${cycleExistant} au lieu de ${cycleAttendu}`);
	if (existant.modeDeTaxe !== 'external') {
		ecarts.push(
			`mode de taxe « ${existant.modeDeTaxe ?? '?'} » : la grille affiche des prix hors taxes (« external »)`
		);
	}
	return ecarts;
}
