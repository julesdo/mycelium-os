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
 * SELLSY — les factures (`GET /v2/invoices`), leurs sociétés (`/v2/companies`)
 * et leurs particuliers (`/v2/individuals`).
 *
 * Schémas relevés dans la spécification OpenAPI publiée par Sellsy
 * (https://docs.sellsy.com/api/v2/dist/sellsy.v2.latest.yaml, version 2.305.0),
 * le 13/10/2026. La route des factures y est dite « en bêta ouverte » : un
 * changement de forme ferait tomber la lecture en ILLISIBLE plutôt qu'en faux.
 */
export interface FactureSellsy {
	readonly id: number;
	readonly number?: string | null;
	/** draft, due, payinprogress, paid, late, cancelled. */
	readonly status?: string | null;
	readonly date?: string | null;
	readonly due_date?: string | null;
	readonly currency?: string | null;
	readonly amounts?: {
		readonly total_incl_tax?: string | null;
		readonly total_remaining_due_incl_tax?: string | null;
	} | null;
	/** Les objets liés : la société ou le particulier facturé. */
	readonly related?: readonly { readonly id: number; readonly type: string }[] | null;
}

export interface SocieteSellsy {
	readonly id: number;
	readonly name?: string | null;
	readonly email?: string | null;
	readonly legal_france?: {
		readonly siren?: string | null;
		readonly siret?: string | null;
		readonly vat?: string | null;
	} | null;
}

export interface ParticulierSellsy {
	readonly id: number;
	readonly first_name?: string | null;
	readonly last_name?: string | null;
	readonly email?: string | null;
}

export function factureDepuisSellsy(
	facture: FactureSellsy,
	client:
		| { readonly genre: 'SOCIETE'; readonly societe: SocieteSellsy }
		| { readonly genre: 'PARTICULIER'; readonly particulier: ParticulierSellsy }
		| undefined,
	contexte: { readonly aujourdHui: string; readonly horizon: string }
): TraductionConnecteur {
	if (facture.status === 'draft') return { genre: 'HORS_CHAMP' };
	const reference = facture.number?.trim();
	if (facture.status === 'cancelled') {
		return reference ? { genre: 'ANNULEE', reference } : { genre: 'HORS_CHAMP' };
	}
	const restant = facture.amounts?.total_remaining_due_incl_tax;
	const reste = restant === null || restant === undefined ? undefined : centimesDecimaux(restant);

	const debiteur =
		client === undefined
			? undefined
			: client.genre === 'SOCIETE'
				? nomDuClient(client.societe.name)
				: nomDuClient(undefined, client.particulier.first_name, client.particulier.last_name);
	const legal = client?.genre === 'SOCIETE' ? client.societe.legal_france : undefined;

	return factureLue({
		reference,
		devise: facture.currency,
		debiteur,
		debiteurSiren: legal
			? (sirenLu(legal.siren ?? legal.siret, legal.vat) ?? undefined)
			: undefined,
		debiteurEmail: courrielLu(
			client?.genre === 'SOCIETE' ? client.societe.email : client?.particulier.email
		),
		montantTTC: centimesDecimaux(facture.amounts?.total_incl_tax),
		dateEmission: jourLu(facture.date),
		dateEcheance: jourLu(facture.due_date),
		reste,
		soldee: facture.status === 'paid',
		aujourdHui: contexte.aujourdHui,
		horizon: contexte.horizon
	});
}
