import { depuisEuros, enCentimes } from '../montants';

/**
 * LE TRADUCTEUR QONTO : une facture client telle que l'API la rend, traduite
 * dans la forme que l'import connaît déjà.
 *
 * Pur, sans réseau ni base : c'est ce qui le rend testable, et c'est la seule
 * partie du connecteur qui porte de la logique (montants, dates, SIREN,
 * signature). Le reste, jetons, pagination et écriture, n'est que plomberie.
 */

export interface MontantQonto {
	readonly value: string;
	readonly currency: string;
}

export interface ClientQonto {
	readonly name?: string | null;
	readonly first_name?: string | null;
	readonly last_name?: string | null;
	readonly vat_number?: string | null;
	readonly tax_identification_number?: string | null;
	/**
	 * L'adresse du CLIENT, et pas celle de l'émetteur.
	 *
	 * ⚠️ NE PAS CONFONDRE AVEC `contact_email` DE LA FACTURE, qui est l'adresse
	 * de celui qui l'a émise — notre propre client. L'y brancher préparerait des
	 * relances adressées au créancier lui-même.
	 *
	 * ⚠️ ET `extra_emails` RESTE DEHORS. Qonto y accepte jusqu'à cent adresses en
	 * copie : on ne relance pas une liste de diffusion.
	 */
	readonly email?: string | null;
}

/** Les champs lus d'une facture client Qonto — et seulement eux. */
export interface FactureQonto {
	readonly id: string;
	readonly number?: string | null;
	readonly status: string;
	readonly issue_date?: string | null;
	readonly due_date?: string | null;
	readonly paid_at?: string | null;
	readonly total_amount_cents: number;
	readonly total_amount: MontantQonto;
	readonly amount_paid?: MontantQonto | null;
	readonly client?: ClientQonto | null;
}

export interface FactureDepuisQonto {
	readonly reference: string;
	readonly debiteur: string;
	readonly debiteurSiren?: string;
	/** Rendue TELLE QUELLE : le socle ne sait pas ce qu'est une adresse acceptable pour ce produit. */
	readonly debiteurEmail?: string;
	readonly montantTTC: bigint;
	readonly dateEmission: string;
	readonly dateEcheance?: string;
	/**
	 * Ce que Qonto dit avoir été réglé AU TOTAL, et le jour où on le constate.
	 * `null` : rien de réglé. Un cumul, jamais un règlement : voir
	 * `complementDeReglement`.
	 */
	readonly regleCumule: { readonly montant: bigint; readonly date: string } | null;
}

/**
 * LE SIREN, SEULEMENT QUAND IL SE LIT.
 *
 * Un SIRET en donne les neuf premiers chiffres ; un numéro de TVA français
 * s'écrit « FR », deux caractères de clé, puis le SIREN. Rien d'autre ne se
 * devine : un SIREN faux rattacherait des factures au mauvais débiteur.
 */
export function sirenDepuisClientQonto(client: ClientQonto): string | undefined {
	const identifiant = (client.tax_identification_number ?? '').replace(/\s/g, '');
	if (/^\d{9}$/.test(identifiant) || /^\d{14}$/.test(identifiant)) return identifiant.slice(0, 9);

	const tva = (client.vat_number ?? '').replace(/\s/g, '').toUpperCase();
	const trouve = /^FR[0-9A-Z]{2}(\d{9})$/.exec(tva);
	return trouve?.[1];
}

/** La raison sociale, sinon « prénom nom » pour un client particulier. */
export function nomDuClientQonto(client: ClientQonto): string | undefined {
	const societe = client.name?.trim();
	if (societe) return societe;
	const personne = [client.first_name, client.last_name]
		.map((part) => part?.trim() ?? '')
		.filter((part) => part !== '')
		.join(' ');
	return personne === '' ? undefined : personne;
}

/**
 * Une facture Qonto, prête pour l'import — ou `null` quand elle n'est pas une
 * créance : un brouillon ne l'est pas encore, une facture annulée ne l'est plus,
 * et une facture en devise n'entre pas plutôt que d'entrer fausse (le produit
 * compte en euros).
 */
export function factureDepuisQonto(
	facture: FactureQonto,
	aujourdHui: string
): FactureDepuisQonto | null {
	if (facture.status !== 'unpaid' && facture.status !== 'paid') return null;
	if (facture.total_amount.currency !== 'EUR') return null;

	const reference = facture.number?.trim();
	const dateEmission = facture.issue_date ?? undefined;
	const client = facture.client ?? undefined;
	const debiteur = client === undefined ? undefined : nomDuClientQonto(client);
	if (!reference || !dateEmission || client === undefined || !debiteur) return null;

	const montantTTC = BigInt(facture.total_amount_cents);
	const regle = facture.amount_paid ? enCentimes(depuisEuros(facture.amount_paid.value)) : 0n;
	// « paid » sans montant réglé renseigné : Qonto dit soldée, on la solde.
	const cumul = facture.status === 'paid' && regle === 0n ? montantTTC : regle;
	const siren = sirenDepuisClientQonto(client);
	// Rendue sans validation : c'est la verticale qui décide de ce qu'elle garde.
	const courriel = client.email?.trim() || undefined;

	return {
		reference,
		debiteur,
		...(siren === undefined ? {} : { debiteurSiren: siren }),
		...(courriel === undefined ? {} : { debiteurEmail: courriel }),
		montantTTC,
		dateEmission,
		...(facture.due_date ? { dateEcheance: facture.due_date } : {}),
		regleCumule:
			cumul > 0n ? { montant: cumul, date: facture.paid_at?.slice(0, 10) ?? aujourdHui } : null
	};
}

/**
 * CE QU'IL FAUT ENREGISTRER, ET PAS PLUS.
 *
 * Qonto rend un réglé CUMULÉ. L'enregistrer tel quel à chaque synchronisation
 * éteindrait deux fois la même dette. On n'ajoute que la différence avec ce qui
 * est déjà enregistré, et jamais un montant négatif.
 */
export function complementDeReglement(cumule: bigint, dejaRegle: bigint): bigint {
	return cumule > dejaRegle ? cumule - dejaRegle : 0n;
}

/** Au-delà, une signature est rejouée, pas fraîche. */
const TOLERANCE_SECONDES = 300;

/**
 * LA SIGNATURE D'UN WEBHOOK QONTO : `t=<horodatage>,v1=<signature>`, en
 * HMAC-SHA256 de `"<t>.<corps brut>"`.
 *
 * ⚠️ HEXADÉCIMAL OU BASE64 : la documentation ne dit pas l'encodage. Les deux
 * sont comparés, en temps constant ; accepter l'un ou l'autre ne relâche rien,
 * puisque les deux viennent du même secret.
 */
export async function signatureQontoValide(
	corps: string,
	entete: string | null,
	secret: string,
	maintenantSecondes: number
): Promise<boolean> {
	if (entete === null) return false;

	const parties = new Map<string, string>();
	for (const morceau of entete.split(',')) {
		const egal = morceau.indexOf('=');
		if (egal > 0) parties.set(morceau.slice(0, egal).trim(), morceau.slice(egal + 1).trim());
	}
	const t = parties.get('t');
	const v1 = parties.get('v1');
	if (t === undefined || v1 === undefined || !/^\d+$/.test(t)) return false;
	if (Math.abs(maintenantSecondes - Number(t)) > TOLERANCE_SECONDES) return false;

	const encodeur = new TextEncoder();
	const cle = await crypto.subtle.importKey(
		'raw',
		encodeur.encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const brut = new Uint8Array(
		await crypto.subtle.sign('HMAC', cle, encodeur.encode(`${t}.${corps}`))
	);
	const hex = Array.from(brut, (octet) => octet.toString(16).padStart(2, '0')).join('');
	const base64 = btoa(String.fromCharCode(...brut));
	return egalEnTempsConstant(v1, hex) || egalEnTempsConstant(v1, base64);
}

function egalEnTempsConstant(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let difference = 0;
	for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return difference === 0;
}
