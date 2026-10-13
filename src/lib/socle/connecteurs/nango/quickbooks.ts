import {
	centimesDecimaux,
	courrielLu,
	factureLue,
	jourLu,
	type TraductionConnecteur
} from './commun';

/**
 * QUICKBOOKS ONLINE — l'entité `Invoice`, lue par la requête
 * `/v3/company/{realmId}/query` (« SELECT * FROM Invoice … »).
 *
 * Champs relevés dans la référence d'Intuit (Accounting API, Invoice) et dans la
 * synchronisation de référence de Nango (`integrations/quickbooks/syncs/invoices.ts`),
 * le 13/10/2026.
 *
 * ⚠️ LA DEVISE PEUT MANQUER. `CurrencyRef` n'est rendu que si la société a activé
 * le multidevise ; sinon la facture est dans la devise de la société, que le
 * lecteur lit une fois dans ses préférences (`CurrencyPrefs.HomeCurrency`). Elle
 * arrive ici en `deviseDeLaSociete` : sans elle, le doute ne profite pas au
 * produit, et la facture n'entre pas.
 */
export interface FactureQuickBooks {
	readonly Id: string;
	readonly DocNumber?: string | null;
	readonly TxnDate?: string | null;
	readonly DueDate?: string | null;
	readonly TotalAmt?: number | null;
	readonly Balance?: number | null;
	readonly CurrencyRef?: { readonly value?: string | null } | null;
	readonly CustomerRef?: { readonly value?: string | null; readonly name?: string | null } | null;
	readonly BillEmail?: { readonly Address?: string | null } | null;
}

export function factureDepuisQuickBooks(
	facture: FactureQuickBooks,
	contexte: {
		readonly deviseDeLaSociete: string | undefined;
		readonly aujourdHui: string;
		readonly horizon: string;
	}
): TraductionConnecteur {
	const reference = facture.DocNumber?.trim();
	/*
	  UNE FACTURE ANNULÉE (« Void ») GARDE SON NUMÉRO, ET SON MONTANT TOMBE À ZÉRO.
	  Une facture à zéro n'est pas une créance ; si on la connaît déjà avec un
	  montant, c'est qu'elle a été annulée depuis : l'écran le signalera.
	*/
	if (facture.TotalAmt === 0) {
		return reference ? { genre: 'ANNULEE', reference } : { genre: 'HORS_CHAMP' };
	}
	const reste =
		facture.Balance === null || facture.Balance === undefined
			? undefined
			: centimesDecimaux(facture.Balance);
	const nom = facture.CustomerRef?.name?.trim();
	return factureLue({
		reference,
		devise: facture.CurrencyRef?.value ?? contexte.deviseDeLaSociete,
		debiteur: nom ? nom : undefined,
		debiteurEmail: courrielLu(facture.BillEmail?.Address),
		montantTTC: centimesDecimaux(facture.TotalAmt),
		dateEmission: jourLu(facture.TxnDate),
		dateEcheance: jourLu(facture.DueDate),
		reste,
		aujourdHui: contexte.aujourdHui,
		horizon: contexte.horizon
	});
}
