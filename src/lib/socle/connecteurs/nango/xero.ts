import {
	centimesDecimaux,
	courrielLu,
	factureLue,
	jourLu,
	sirenLu,
	type TraductionConnecteur
} from './commun';

/**
 * XERO — les factures (`api.xro/2.0/Invoices`) et les contacts
 * (`api.xro/2.0/Contacts`) de l'API Accounting.
 *
 * Champs relevés dans la référence de Xero et dans la synchronisation de
 * référence de Nango (`integrations/xero/syncs/invoices.ts`), le 13/10/2026.
 *
 * ⚠️ DEUX SORTES DE FACTURES DANS LA MÊME LISTE : `ACCREC` (une facture émise,
 * une créance) et `ACCPAY` (une facture reçue, une dette). Seule la première
 * nous concerne.
 */
export interface FactureXero {
	readonly InvoiceID: string;
	readonly InvoiceNumber?: string | null;
	readonly Type?: string | null;
	readonly Status?: string | null;
	readonly Contact?: { readonly ContactID?: string | null; readonly Name?: string | null } | null;
	/** « 2026-10-13T00:00:00 » : la date lisible, quand Xero la joint. */
	readonly DateString?: string | null;
	/** « /Date(1760313600000+0000)/ » : l'écriture historique de Xero. */
	readonly Date?: string | null;
	readonly DueDateString?: string | null;
	readonly DueDate?: string | null;
	readonly FullyPaidOnDate?: string | null;
	readonly Total?: number | null;
	readonly AmountDue?: number | null;
	readonly CurrencyCode?: string | null;
}

export interface ContactXero {
	readonly ContactID: string;
	readonly Name?: string | null;
	readonly EmailAddress?: string | null;
	/** Le numéro d'immatriculation de la société : en France, un SIREN ou un SIRET. */
	readonly CompanyNumber?: string | null;
	readonly TaxNumber?: string | null;
}

/**
 * UNE DATE XERO EN JOUR « AAAA-MM-JJ ».
 *
 * L'écriture lisible d'abord ; sinon « /Date(ms±hhmm)/ », un instant UTC en
 * millisecondes (les dates antérieures à 1970 sont négatives).
 */
export function jourXero(lisible?: string | null, historique?: string | null): string | undefined {
	const direct = jourLu(lisible);
	if (direct !== undefined) return direct;
	const trouve = /^\/Date\((-?\d+)(?:[+-]\d{4})?\)\/$/.exec(historique?.trim() ?? '');
	if (trouve === null) return jourLu(historique);
	const instant = Number(trouve[1]);
	return Number.isFinite(instant) ? new Date(instant).toISOString().slice(0, 10) : undefined;
}

export function factureDepuisXero(
	facture: FactureXero,
	contact: ContactXero | undefined,
	contexte: { readonly aujourdHui: string; readonly horizon: string }
): TraductionConnecteur {
	if (facture.Type !== 'ACCREC') return { genre: 'HORS_CHAMP' };
	const reference = facture.InvoiceNumber?.trim();
	// Un brouillon ou une facture en attente d'approbation n'est pas encore envoyée.
	if (facture.Status === 'DRAFT' || facture.Status === 'SUBMITTED') return { genre: 'HORS_CHAMP' };
	if (facture.Status === 'VOIDED' || facture.Status === 'DELETED') {
		return reference ? { genre: 'ANNULEE', reference } : { genre: 'HORS_CHAMP' };
	}
	const nom = facture.Contact?.Name?.trim() || contact?.Name?.trim();
	const reste =
		facture.AmountDue === null || facture.AmountDue === undefined
			? undefined
			: centimesDecimaux(facture.AmountDue);
	return factureLue({
		reference,
		devise: facture.CurrencyCode,
		debiteur: nom ? nom : undefined,
		debiteurSiren:
			contact === undefined ? undefined : sirenLu(contact.CompanyNumber, contact.TaxNumber),
		debiteurEmail: courrielLu(contact?.EmailAddress),
		montantTTC: centimesDecimaux(facture.Total),
		dateEmission: jourXero(facture.DateString, facture.Date),
		dateEcheance: jourXero(facture.DueDateString, facture.DueDate),
		reste,
		datePaiement: jourXero(undefined, facture.FullyPaidOnDate),
		aujourdHui: contexte.aujourdHui,
		horizon: contexte.horizon
	});
}
