import {
	centimesEntiers,
	courrielLu,
	factureLue,
	jourDepuisUnix,
	nomDuClient,
	sirenLu,
	type TraductionConnecteur
} from './commun';

/**
 * STRIPE — les factures (`/v1/invoices`), lues avec une clé restreinte en lecture.
 *
 * Champs relevés dans la référence de Stripe (« The Invoice object ») et dans la
 * synchronisation de référence de Nango (`integrations/stripe/syncs/invoices.ts`),
 * le 13/10/2026.
 *
 * ⚠️ LES MONTANTS SONT DÉJÀ EN CENTIMES (la plus petite unité de la devise), et
 * les dates sont des instants Unix en secondes.
 */
export interface FactureStripe {
	readonly id: string;
	/** `null` tant que la facture est un brouillon. */
	readonly number?: string | null;
	/** draft, open, paid, uncollectible, void. */
	readonly status?: string | null;
	/** En minuscules : « eur ». */
	readonly currency?: string | null;
	readonly total?: number | null;
	readonly amount_remaining?: number | null;
	readonly created?: number | null;
	/** L'instant où la facture a été finalisée : sa vraie date d'émission. */
	readonly effective_at?: number | null;
	readonly due_date?: number | null;
	readonly customer_name?: string | null;
	readonly customer_email?: string | null;
	readonly customer_tax_ids?:
		| readonly { readonly type?: string | null; readonly value?: string | null }[]
		| null;
	readonly status_transitions?: { readonly paid_at?: number | null } | null;
}

export function factureDepuisStripe(
	facture: FactureStripe,
	contexte: { readonly aujourdHui: string; readonly horizon: string }
): TraductionConnecteur {
	if (facture.status === 'draft') return { genre: 'HORS_CHAMP' };
	const reference = facture.number?.trim();
	if (facture.status === 'void') {
		return reference ? { genre: 'ANNULEE', reference } : { genre: 'HORS_CHAMP' };
	}
	// « uncollectible » reste une créance : le marchand l'a passée en perte, pas éteinte.
	const tva = (facture.customer_tax_ids ?? []).find((id) => id.type === 'eu_vat')?.value;
	const reste =
		facture.amount_remaining === null || facture.amount_remaining === undefined
			? undefined
			: centimesEntiers(facture.amount_remaining);
	return factureLue({
		reference,
		devise: facture.currency,
		debiteur: nomDuClient(facture.customer_name),
		debiteurSiren: sirenLu(undefined, tva),
		debiteurEmail: courrielLu(facture.customer_email),
		montantTTC: centimesEntiers(facture.total),
		dateEmission: jourDepuisUnix(facture.effective_at ?? facture.created),
		dateEcheance: jourDepuisUnix(facture.due_date),
		reste,
		datePaiement: jourDepuisUnix(facture.status_transitions?.paid_at),
		aujourdHui: contexte.aujourdHui,
		horizon: contexte.horizon
	});
}
