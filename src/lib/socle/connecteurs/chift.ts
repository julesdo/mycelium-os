import { depuisEuros, enCentimes } from '../montants';
import type { FactureDepuisConnecteur } from './facture-connecteur';

/**
 * LE TRADUCTEUR CHIFT : une facture client lue, par l'API unifiée de Chift, dans
 * l'un des logiciels qu'elle relie — et traduite dans la forme que l'import
 * connaît déjà.
 *
 * Chift sert deux API pour ce qui nous intéresse, et un même logiciel n'en
 * parle souvent qu'une :
 *
 *   · la COMPTABILITÉ (Pennylane, Sage, Cegid Loop, Tiime, MyUnisoft, Inqom…) :
 *     des écritures de vente, avec leurs paiements rapprochés ;
 *   · la FACTURATION (Sellsy, Axonaut, EBP, Evoliz, Qonto…) : des factures, avec
 *     leur reste à payer.
 *
 * Pur, sans réseau ni base : c'est ce qui le rend testable, et c'est la seule
 * partie du connecteur qui porte de la logique (montants, dates, SIREN, état
 * de paiement, signature). Le reste, jeton, pagination et écriture, n'est que
 * plomberie, dans `convex/connexions/chift.ts`.
 *
 * Schémas relevés dans la spécification OpenAPI publiée par Chift
 * (https://docs.chift.eu/api-reference/openapi.json), le 06/10/2026.
 */

/** Un paiement rapproché d'une écriture de vente (API comptable). */
export interface PaiementChift {
	readonly amount: number;
	/**
	 * La part de ce paiement affectée à CETTE facture.
	 *
	 * ⚠️ ZÉRO VEUT AUSSI DIRE « INCONNU ». La spécification le dit : elle vaut 0
	 * quand le logiciel source ne sait pas répartir un paiement entre factures.
	 */
	readonly dedicated_amount?: number | null;
	readonly payment_date: string;
}

/** Le client d'une facture, tel que l'API comptable le rend (`Partner`, `ClientItemOut`). */
export interface PartenaireChift {
	readonly id?: string | null;
	readonly name?: string | null;
	readonly first_name?: string | null;
	readonly last_name?: string | null;
	readonly email?: string | null;
	readonly vat?: string | null;
	/** « National identification number of the company » : en France, un SIREN ou un SIRET. */
	readonly company_number?: string | null;
}

/** Une écriture de vente de l'API comptable (`InvoiceItemOutMonoAnalyticPlan`) — les champs lus, et eux seuls. */
export interface FactureComptableChift {
	readonly id?: string | null;
	readonly invoice_type: string;
	readonly invoice_number?: string | null;
	readonly currency: string;
	readonly total: number;
	readonly invoice_date: string;
	readonly due_date?: string | null;
	readonly status?: string | null;
	readonly payments?: readonly PaiementChift[] | null;
	readonly partner_id?: string | null;
	readonly partner?: PartenaireChift | null;
}

/** Un contact de l'API de facturation (`ContactItemOut`). */
export interface ContactChift {
	readonly id: string;
	readonly company_name?: string | null;
	readonly first_name?: string | null;
	readonly last_name?: string | null;
	readonly email?: string | null;
	readonly vat?: string | null;
	/** « Identification number different than the VAT (e.g. siret) ». */
	readonly company_number?: string | null;
}

/** Une facture de l'API de facturation (`InvoiceItemOut`). */
export interface FactureFacturationChift {
	readonly id: string;
	readonly invoice_type: string;
	readonly status: string;
	readonly invoice_number?: string | null;
	readonly currency: string;
	readonly total: number;
	readonly invoice_date: string;
	readonly due_date?: string | null;
	readonly partner_id?: string | null;
	/** « Amount left to be paid ». */
	readonly outstanding_amount?: number | null;
	readonly last_payment_date?: string | null;
}

/**
 * CE QU'EST DEVENUE UNE FACTURE LUE.
 *
 * ⚠️ « ILLISIBLE » N'EST PAS « HORS CHAMP ». Un brouillon, une facture annulée
 * ou un avoir ne sont pas des créances : on les laisse, sans rien dire. Une
 * facture en devise, sans numéro, sans client ou au montant illisible EST une
 * créance qu'on n'a pas pu lire : on la compte, et l'écran le dit. Un repli
 * silencieux ferait croire au gérant que tout est entré.
 */
export type TraductionChift =
	| { readonly genre: 'FACTURE'; readonly facture: FactureDepuisConnecteur }
	| { readonly genre: 'HORS_CHAMP' }
	| { readonly genre: 'ILLISIBLE'; readonly raison: string };

/**
 * UN MONTANT CHIFT EN CENTIMES, SANS CALCUL EN FLOTTANT.
 *
 * Chift rend ses montants en nombres JSON. L'écriture la plus courte d'un nombre
 * qui a au plus deux décimales EST sa forme décimale exacte (« 1234.5 »), et
 * `depuisEuros` la lit sans arithmétique flottante. Tout le reste — trois
 * décimales, notation scientifique, infini — est refusé plutôt qu'arrondi : un
 * centime inventé se retrouverait dans un décompte que le débiteur refera.
 */
export function centimesChift(montant: number | null | undefined): bigint | null {
	if (typeof montant !== 'number' || !Number.isFinite(montant)) return null;
	try {
		return enCentimes(depuisEuros(montant));
	} catch {
		return null;
	}
}

/**
 * LE SIREN, SEULEMENT QUAND IL SE LIT — même règle que pour Qonto.
 *
 * Un SIRET en donne les neuf premiers chiffres ; un numéro de TVA français
 * s'écrit « FR », deux caractères de clé, puis le SIREN. Rien d'autre ne se
 * devine : un SIREN faux rattacherait des factures au mauvais client.
 */
export function sirenChift(numero?: string | null, tva?: string | null): string | undefined {
	const identifiant = (numero ?? '').replace(/[\s.]/g, '');
	if (/^\d{9}$/.test(identifiant) || /^\d{14}$/.test(identifiant)) return identifiant.slice(0, 9);
	const intracom = (tva ?? '').replace(/\s/g, '').toUpperCase();
	return /^FR[0-9A-Z]{2}(\d{9})$/.exec(intracom)?.[1];
}

/** La raison sociale, sinon « prénom nom » pour un client particulier. */
function nomDe(societe: string | null | undefined, prenom?: string | null, nom?: string | null) {
	const raison = societe?.trim();
	if (raison) return raison;
	const personne = [prenom, nom]
		.map((part) => part?.trim() ?? '')
		.filter((part) => part !== '')
		.join(' ');
	return personne === '' ? undefined : personne;
}

/**
 * L'ÉCHÉANCE, SEULEMENT QUAND ELLE EST DITE.
 *
 * ⚠️ LA SPÉCIFICATION RECOPIE LA DATE DE FACTURE QUAND L'ÉCHÉANCE MANQUE (« the
 * invoice date is used when this information is not available »). Une échéance
 * égale à la date d'émission peut donc être une vraie facture payable à
 * réception, ou une échéance absente. Le doute ne profite jamais au produit :
 * prise pour vraie, elle ferait courir des pénalités dès le premier jour. On la
 * laisse vide, et l'import applique le délai par défaut qu'il documente.
 */
function echeanceDite(emission: string, echeance: string | null | undefined): string | undefined {
	if (!echeance || echeance === emission) return undefined;
	return echeance;
}

function siPresent<K extends string, V>(cle: K, valeur: V | undefined): { [P in K]?: V } {
	return (valeur === undefined ? {} : { [cle]: valeur }) as { [P in K]?: V };
}

/** Les étapes communes aux deux API : nature, devise, numéro, client, montant. */
function lireLeCommun(
	facture: {
		readonly invoice_type: string;
		readonly status?: string | null;
		readonly currency: string;
		readonly invoice_number?: string | null;
		readonly total: number;
	},
	debiteur: string | undefined
):
	| {
			readonly genre: 'LU';
			readonly reference: string;
			readonly debiteur: string;
			readonly montantTTC: bigint;
	  }
	| Exclude<TraductionChift, { genre: 'FACTURE' }> {
	// Une facture fournisseur ou un avoir n'est pas une créance ; un brouillon ne
	// l'est pas encore, une facture annulée ne l'est plus.
	if (facture.invoice_type !== 'customer_invoice') return { genre: 'HORS_CHAMP' };
	if (facture.status === 'draft' || facture.status === 'cancelled') return { genre: 'HORS_CHAMP' };
	// Le produit compte en euros : une facture en devise n'entre pas plutôt que
	// d'entrer fausse.
	if (facture.currency !== 'EUR') {
		return { genre: 'ILLISIBLE', raison: `facture en devise (${facture.currency})` };
	}
	const reference = facture.invoice_number?.trim();
	if (!reference) return { genre: 'ILLISIBLE', raison: 'facture sans numéro' };
	if (debiteur === undefined) return { genre: 'ILLISIBLE', raison: 'facture sans client' };
	const montantTTC = centimesChift(facture.total);
	if (montantTTC === null) return { genre: 'ILLISIBLE', raison: 'montant illisible' };
	if (montantTTC <= 0n) return { genre: 'HORS_CHAMP' };
	return { genre: 'LU', reference, debiteur, montantTTC };
}

/**
 * UNE ÉCRITURE DE VENTE DE L'API COMPTABLE, prête pour l'import.
 *
 * `partenaire` sert quand Chift n'a pas joint le client à la facture : le
 * connecteur le cherche alors dans la liste des clients, par `partner_id`.
 *
 * LE RÉGLÉ, PAR ORDRE DE CERTITUDE :
 *   · « paid » : la comptabilité dit la facture soldée, on la solde ;
 *   · des paiements rapprochés : la somme des parts AFFECTÉES à cette facture,
 *     jamais au-delà de son montant ;
 *   · des paiements dont aucune part n'est affectée (0 partout) : le logiciel ne
 *     sait pas répartir, et nous non plus. Rien n'est enregistré plutôt qu'un
 *     règlement deviné.
 */
export function factureDepuisChiftComptable(
	facture: FactureComptableChift,
	partenaire: PartenaireChift | undefined,
	aujourdHui: string
): TraductionChift {
	const client = facture.partner ?? partenaire;
	const commun = lireLeCommun(
		facture,
		client === undefined ? undefined : nomDe(client.name, client.first_name, client.last_name)
	);
	if (commun.genre !== 'LU') return commun;

	const paiements = facture.payments ?? [];
	let regle = 0n;
	let derniere: string | undefined;
	for (const paiement of paiements) {
		const part = centimesChift(paiement.dedicated_amount ?? 0);
		if (part === null) return { genre: 'ILLISIBLE', raison: 'paiement illisible' };
		if (part <= 0n) continue;
		regle += part;
		if (derniere === undefined || paiement.payment_date > derniere)
			derniere = paiement.payment_date;
	}
	const cumul =
		facture.status === 'paid'
			? commun.montantTTC
			: regle > commun.montantTTC
				? commun.montantTTC
				: regle;
	const dernierPaiement =
		derniere ??
		paiements.reduce<string | undefined>(
			(plusTard, p) =>
				plusTard === undefined || p.payment_date > plusTard ? p.payment_date : plusTard,
			undefined
		);

	const siren = client === undefined ? undefined : sirenChift(client.company_number, client.vat);
	const courriel = client?.email?.trim() || undefined;
	return {
		genre: 'FACTURE',
		facture: {
			reference: commun.reference,
			debiteur: commun.debiteur,
			...siPresent('debiteurSiren', siren),
			...siPresent('debiteurEmail', courriel),
			montantTTC: commun.montantTTC,
			dateEmission: facture.invoice_date,
			...siPresent('dateEcheance', echeanceDite(facture.invoice_date, facture.due_date)),
			regleCumule:
				cumul > 0n ? { montant: cumul, date: (dernierPaiement ?? aujourdHui).slice(0, 10) } : null
		}
	};
}

/**
 * UNE FACTURE DE L'API DE FACTURATION, prête pour l'import.
 *
 * Le réglé se déduit du reste à payer : montant moins `outstanding_amount`,
 * borné entre zéro et le montant. Sans reste à payer renseigné, rien n'est
 * enregistré — sauf « paid », qui solde.
 */
export function factureDepuisChiftFacturation(
	facture: FactureFacturationChift,
	contact: ContactChift | undefined,
	aujourdHui: string
): TraductionChift {
	const commun = lireLeCommun(
		facture,
		contact === undefined
			? undefined
			: nomDe(contact.company_name, contact.first_name, contact.last_name)
	);
	if (commun.genre !== 'LU') return commun;

	let cumul = 0n;
	if (facture.status === 'paid') {
		cumul = commun.montantTTC;
	} else if (facture.outstanding_amount !== null && facture.outstanding_amount !== undefined) {
		const reste = centimesChift(facture.outstanding_amount);
		if (reste === null) return { genre: 'ILLISIBLE', raison: 'reste à payer illisible' };
		const paye = commun.montantTTC - reste;
		cumul = paye < 0n ? 0n : paye > commun.montantTTC ? commun.montantTTC : paye;
	}

	const siren = contact === undefined ? undefined : sirenChift(contact.company_number, contact.vat);
	const courriel = contact?.email?.trim() || undefined;
	return {
		genre: 'FACTURE',
		facture: {
			reference: commun.reference,
			debiteur: commun.debiteur,
			...siPresent('debiteurSiren', siren),
			...siPresent('debiteurEmail', courriel),
			montantTTC: commun.montantTTC,
			dateEmission: facture.invoice_date,
			...siPresent('dateEcheance', echeanceDite(facture.invoice_date, facture.due_date)),
			regleCumule:
				cumul > 0n
					? { montant: cumul, date: (facture.last_payment_date ?? aujourdHui).slice(0, 10) }
					: null
		}
	};
}

/**
 * LE PREMIER JOUR DE LA PREMIÈRE LECTURE.
 *
 * Sans curseur, on ne relit pas toute l'histoire d'une entreprise : seulement ce
 * qui peut encore se réclamer. `annees` est le plus long délai pour agir du
 * registre — passé par l'appelant, puisque le socle ne sait pas quelle loi il
 * sert —, et on remonte au 1er janvier de l'année d'avant, par prudence : une
 * facture émise juste avant la borne peut avoir une échéance juste après.
 */
export function debutDePremiereLecture(aujourdHui: string, annees: number): string {
	return `${Number(aujourdHui.slice(0, 4)) - annees - 1}-01-01`;
}

/**
 * LA SIGNATURE D'UN WEBHOOK CHIFT : `X-Chift-Signature`, un HMAC-SHA256 en
 * hexadécimal du corps JSON, avec le secret déclaré à la création du webhook.
 *
 * ⚠️ LE CORPS BRUT, OU SA FORME COMPACTE. La documentation signe le corps
 * resérialisé (`JSON.stringify` en Node, `separators=(',', ':')` en Python), ce
 * qui doit être le corps reçu à l'octet près. Les deux sont comparés, en temps
 * constant : accepter l'un ou l'autre ne relâche rien, puisque les deux exigent
 * le même secret.
 *
 * ⚠️ AUCUN HORODATAGE N'EST SIGNÉ À PART. Un webhook rejoué ne fait que
 * replanifier une lecture, qui est idempotente : il n'ouvre rien de plus.
 */
export async function signatureChiftValide(
	corps: string,
	entete: string | null,
	secret: string
): Promise<boolean> {
	if (entete === null || secret === '') return false;
	const attendue = entete.trim().toLowerCase();

	const compact = formeCompacte(corps);
	if (compact === null) return false;

	const encodeur = new TextEncoder();
	const cle = await crypto.subtle.importKey(
		'raw',
		encodeur.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	for (const texte of compact === corps ? [corps] : [corps, compact]) {
		const brut = new Uint8Array(await crypto.subtle.sign('HMAC', cle, encodeur.encode(texte)));
		const hex = Array.from(brut, (octet) => octet.toString(16).padStart(2, '0')).join('');
		if (egalEnTempsConstant(attendue, hex)) return true;
	}
	return false;
}

/** Le JSON resérialisé sans espace, ou `null` si ce n'est pas du JSON. */
function formeCompacte(corps: string): string | null {
	try {
		return JSON.stringify(JSON.parse(corps));
	} catch {
		return null;
	}
}

function egalEnTempsConstant(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let difference = 0;
	for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return difference === 0;
}
