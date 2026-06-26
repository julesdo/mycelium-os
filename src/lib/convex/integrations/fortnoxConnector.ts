// Fortnox connector — #1 cloud accounting Sweden (500 000+ companies)
// Docs: https://developer.fortnox.se/documentation/
// OAuth2 — access 1h, refresh permanent until revoked
// API base: https://api.fortnox.se/3/

export const FX_API = 'https://api.fortnox.se/3';
export const FX_AUTH_URL = 'https://apps.fortnox.se/oauth-v1/auth';
export const FX_TOKEN_URL = 'https://apps.fortnox.se/oauth-v1/token';

// Swedish standard chart of accounts (BAS-kontoplanen)
export const FORTNOX_DEFAULT_MAPPING: Record<string, { code: string; label: string }> = {
	LEASING: { code: '5610', label: 'Personbilsleasing' },
	CARBURANT: { code: '5613', label: 'Drivmedel personbilar' },
	ENTRETIEN: { code: '5615', label: 'Reparation och underhåll personbilar' },
	ASSURANCE: { code: '5660', label: 'Fordonsskatt och försäkring' },
	TAXES: { code: '5660', label: 'Fordonsskatt' },
	SINISTRE: { code: '5615', label: 'Reparation (försäkring)' },
	PARKING: { code: '5830', label: 'Parkering och trängselskatt' },
	TELEPEAGE: { code: '5830', label: 'Trängselskatt och vägtullar' },
	AUTRE: { code: '5699', label: 'Övriga kostnader transportmedel' },
	IK: { code: '7321', label: 'Skattefria traktamenten (SE)' }
};

export interface FortnoxTokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
}

async function fxRequest(
	method: string,
	path: string,
	accessToken: string,
	body?: unknown
): Promise<Response> {
	const res = await fetch(`${FX_API}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		...(body ? { body: JSON.stringify(body) } : {})
	});
	if (res.status === 429) throw new Error('RATE_LIMIT');
	return res;
}

export async function fxExchangeCode(
	code: string,
	redirectUri: string,
	clientId: string,
	clientSecret: string
): Promise<FortnoxTokenResponse> {
	const res = await fetch(FX_TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`
		},
		body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })
	});
	if (!res.ok) throw new Error(`FX_TOKEN_${res.status}: ${await res.text()}`);
	return res.json() as Promise<FortnoxTokenResponse>;
}

export async function fxRefreshToken(
	refreshToken: string,
	clientId: string,
	clientSecret: string
): Promise<FortnoxTokenResponse> {
	const res = await fetch(FX_TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`
		},
		body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
	});
	if (!res.ok) throw new Error(`FX_REFRESH_${res.status}: ${await res.text()}`);
	return res.json() as Promise<FortnoxTokenResponse>;
}

// Find or create "Mycelium Fleet" supplier
async function fxEnsureSupplier(accessToken: string): Promise<string> {
	const search = await fxRequest('GET', '/suppliers?filter=all&search=Mycelium+Fleet', accessToken);
	if (search.ok) {
		const data = (await search.json()) as { Suppliers?: Array<{ SupplierNumber: string }> };
		const existing = data.Suppliers?.[0];
		if (existing) return existing.SupplierNumber;
	}
	const create = await fxRequest('POST', '/suppliers', accessToken, {
		Supplier: {
			Name: 'Mycelium Fleet OS',
			City: '',
			CountryCode: 'SE',
			Email: ''
		}
	});
	if (!create.ok) throw new Error(`FX_SUPPLIER_${create.status}`);
	const created = (await create.json()) as { Supplier: { SupplierNumber: string } };
	return created.Supplier.SupplierNumber;
}

export const fortnoxConnector = {
	async pushCost(
		accessToken: string,
		accountCode: string,
		payload: {
			myceliumId: string;
			amountTtc: number;
			vatAmount?: number;
			date: number;
			label: string;
			externalId?: string;
		}
	): Promise<{ externalId: string }> {
		const supplierNumber = await fxEnsureSupplier(accessToken);
		const dateStr = new Date(payload.date).toISOString().slice(0, 10);
		const amountExVat = payload.vatAmount
			? payload.amountTtc - payload.vatAmount
			: payload.amountTtc;

		const invoiceBody = {
			SupplierInvoice: {
				SupplierNumber: supplierNumber,
				InvoiceDate: dateStr,
				DueDate: new Date(payload.date + 30 * 86400000).toISOString().slice(0, 10),
				ExternalInvoiceReference1: `mycelium:${payload.myceliumId}`,
				SupplierInvoiceRows: [
					{
						Account: parseInt(accountCode, 10),
						Debit: amountExVat,
						Description: payload.label
					}
				],
				...(payload.vatAmount ? { VAT: payload.vatAmount } : {})
			}
		};

		if (payload.externalId) {
			const res = await fxRequest(
				'PUT',
				`/supplierinvoices/${payload.externalId}`,
				accessToken,
				invoiceBody
			);
			if (!res.ok) throw new Error(`FX_INV_UPDATE_${res.status}: ${await res.text()}`);
			return { externalId: payload.externalId };
		}

		const res = await fxRequest('POST', '/supplierinvoices', accessToken, invoiceBody);
		if (!res.ok) throw new Error(`FX_INV_CREATE_${res.status}: ${await res.text()}`);
		const data = (await res.json()) as { SupplierInvoice: { GivenNumber: string } };
		return { externalId: data.SupplierInvoice.GivenNumber };
	},

	async pullPaymentStatuses(
		accessToken: string,
		pairs: Array<{ costId: string; externalId: string }>
	): Promise<Array<{ externalId: string; isPaid: boolean; paidAt?: number }>> {
		const results = [];
		for (const { externalId } of pairs) {
			try {
				const res = await fxRequest('GET', `/supplierinvoices/${externalId}`, accessToken);
				if (!res.ok) continue;
				const data = (await res.json()) as {
					SupplierInvoice: { Balance: number; FinalPayDate?: string };
				};
				const isPaid = data.SupplierInvoice.Balance === 0;
				results.push({
					externalId,
					isPaid,
					paidAt:
						isPaid && data.SupplierInvoice.FinalPayDate
							? Date.parse(data.SupplierInvoice.FinalPayDate)
							: undefined
				});
			} catch {
				/* skip */
			}
		}
		return results;
	}
};
