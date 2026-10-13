import {
	centimesDecimaux,
	courrielLu,
	factureLue,
	jourLu,
	nomDuClient,
	sirenLu,
	type TraductionConnecteur
} from './commun';

/**
 * PENNYLANE — les factures clients de l'API v2 (`/api/external/v2/customer_invoices`)
 * et leurs clients (`/api/external/v2/customers`).
 *
 * Schémas relevés dans la référence publiée par Pennylane
 * (https://pennylane.readme.io/reference/getcustomerinvoices, `getcustomers`),
 * le 13/10/2026. Les mêmes adresses servent l'intégration OAuth (`pennylane`,
 * réservée aux partenaires) et le jeton d'entreprise (`pennylane-company-api`).
 */

/** Une facture client v2 — les champs lus, et eux seuls. Les montants sont des chaînes. */
export interface FacturePennylane {
	readonly id: number;
	readonly invoice_number?: string | null;
	readonly status?: string | null;
	readonly draft?: boolean | null;
	readonly paid?: boolean | null;
	readonly currency?: string | null;
	/** « total value of the invoice in euros », taxes comprises. */
	readonly amount?: string | null;
	/** « The remaining amount with VAT to pay for the invoice to be considered paid ». */
	readonly remaining_amount_with_tax?: string | null;
	readonly date?: string | null;
	readonly deadline?: string | null;
	readonly customer?: { readonly id: number } | null;
}

/** Un client v2 : société (`company`, avec `reg_no`) ou particulier (`individual`). */
export interface ClientPennylane {
	readonly id: number;
	readonly name?: string | null;
	readonly customer_type?: string | null;
	readonly first_name?: string | null;
	readonly last_name?: string | null;
	/** Le SIREN (ou SIRET) d'une société française. */
	readonly reg_no?: string | null;
	readonly vat_number?: string | null;
	readonly emails?: readonly string[] | null;
}

/**
 * Ce qui n'est pas une créance : un brouillon, un devis, un bon de commande, une
 * proforma, un avoir. Le statut v2 les porte tous.
 */
const STATUTS_HORS_CHAMP = new Set([
	'draft',
	'proforma',
	'credit_note',
	'shipping_order',
	'purchasing_order',
	'estimate_pending',
	'estimate_accepted',
	'estimate_invoiced',
	'estimate_denied'
]);

export function factureDepuisPennylane(
	facture: FacturePennylane,
	client: ClientPennylane | undefined,
	contexte: { readonly aujourdHui: string; readonly horizon: string }
): TraductionConnecteur {
	if (facture.draft === true || STATUTS_HORS_CHAMP.has(facture.status ?? '')) {
		return { genre: 'HORS_CHAMP' };
	}
	const reference = facture.invoice_number?.trim();
	if (facture.status === 'cancelled') {
		return reference ? { genre: 'ANNULEE', reference } : { genre: 'HORS_CHAMP' };
	}

	const reste =
		facture.remaining_amount_with_tax === null || facture.remaining_amount_with_tax === undefined
			? undefined
			: centimesDecimaux(facture.remaining_amount_with_tax);

	return factureLue({
		reference,
		devise: facture.currency,
		debiteur:
			client === undefined
				? undefined
				: nomDuClient(client.name, client.first_name, client.last_name),
		debiteurSiren: client === undefined ? undefined : sirenLu(client.reg_no, client.vat_number),
		debiteurEmail: courrielLu(...(client?.emails ?? [])),
		montantTTC: centimesDecimaux(facture.amount),
		dateEmission: jourLu(facture.date),
		dateEcheance: jourLu(facture.deadline),
		reste,
		soldee: facture.paid === true,
		aujourdHui: contexte.aujourdHui,
		horizon: contexte.horizon
	});
}
