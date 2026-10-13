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
 * ZOHO BOOKS ET ZOHO INVOICE — la même forme de facture et de contact, servie
 * sous `/books/v3/` ou `/invoice/v3/`, toujours avec `organization_id`.
 *
 * Champs relevés dans les références de Zoho (« List invoices », « List
 * contacts ») et dans les synchronisations de référence de Nango
 * (`integrations/zoho-books/syncs/invoices.ts`, `zoho-invoice/…`), le 13/10/2026.
 */
export interface FactureZoho {
	readonly invoice_id: string | number;
	readonly invoice_number?: string | null;
	/** draft, sent, viewed, overdue, unpaid, partially_paid, paid, void… */
	readonly status?: string | null;
	readonly customer_id?: string | number | null;
	readonly customer_name?: string | null;
	readonly company_name?: string | null;
	readonly email?: string | null;
	readonly date?: string | null;
	readonly due_date?: string | null;
	readonly currency_code?: string | null;
	readonly total?: number | null;
	/** Le reste à payer. */
	readonly balance?: number | null;
	readonly last_payment_date?: string | null;
}

export interface ContactZoho {
	readonly contact_id: string | number;
	readonly contact_name?: string | null;
	readonly company_name?: string | null;
	readonly email?: string | null;
	/** Le numéro de TVA intracommunautaire, dans les éditions européennes. */
	readonly vat_reg_no?: string | null;
}

export function factureDepuisZoho(
	facture: FactureZoho,
	contact: ContactZoho | undefined,
	contexte: { readonly aujourdHui: string; readonly horizon: string }
): TraductionConnecteur {
	const statut = (facture.status ?? '').toLowerCase();
	if (statut === 'draft' || statut === 'pending_approval' || statut === 'approved') {
		return { genre: 'HORS_CHAMP' };
	}
	const reference = facture.invoice_number?.trim();
	if (statut === 'void') {
		return reference ? { genre: 'ANNULEE', reference } : { genre: 'HORS_CHAMP' };
	}
	const nom =
		nomDuClient(facture.company_name) ??
		nomDuClient(contact?.company_name) ??
		nomDuClient(facture.customer_name) ??
		nomDuClient(contact?.contact_name);
	const reste =
		facture.balance === null || facture.balance === undefined
			? undefined
			: centimesDecimaux(facture.balance);
	return factureLue({
		reference,
		devise: facture.currency_code,
		debiteur: nom,
		debiteurSiren: sirenLu(undefined, contact?.vat_reg_no),
		debiteurEmail: courrielLu(facture.email, contact?.email),
		montantTTC: centimesDecimaux(facture.total),
		dateEmission: jourLu(facture.date),
		dateEcheance: jourLu(facture.due_date),
		reste,
		datePaiement: jourLu(facture.last_payment_date),
		aujourdHui: contexte.aujourdHui,
		horizon: contexte.horizon
	});
}
