// Visma eAccounting connector — 1M+ companies SE/NO/DK/FI
// Docs: https://eaccounting.vismaonline.com/api
// OAuth2 via Visma Identity — access 1h, refresh 90 days
// API base: https://eaccountingapi.vismaonline.com/v2

export const VISMA_API = 'https://eaccountingapi.vismaonline.com/v2';
export const VISMA_AUTH_URL = 'https://identity.vismaonline.com/connect/authorize';
export const VISMA_TOKEN_URL = 'https://identity.vismaonline.com/connect/token';

// Visma eAccounting uses Nordic chart of accounts (varies by country)
// Using Swedish BAS as default — admin can update via mapping UI
export const VISMA_DEFAULT_MAPPING: Record<string, { code: string; label: string }> = {
	LEASING: { code: '5610', label: 'Leasing av personbilar' },
	CARBURANT: { code: '5613', label: 'Drivmedel personbilar' },
	ENTRETIEN: { code: '5615', label: 'Reparation och underhåll' },
	ASSURANCE: { code: '5660', label: 'Fordonsskatt och försäkring' },
	TAXES: { code: '5660', label: 'Fordonsskatt' },
	SINISTRE: { code: '5615', label: 'Skadereparation' },
	PARKING: { code: '5830', label: 'Parkering' },
	TELEPEAGE: { code: '5830', label: 'Vägtullar' },
	AUTRE: { code: '5699', label: 'Övriga fordonskostnader' },
	IK: { code: '7321', label: 'Milersättning (skattefri)' }
};

export interface VismaTokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
}

async function vismaRequest(
	method: string,
	path: string,
	accessToken: string,
	body?: unknown
): Promise<Response> {
	const res = await fetch(`${VISMA_API}${path}`, {
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

export async function vismaExchangeCode(
	code: string,
	redirectUri: string,
	clientId: string,
	clientSecret: string
): Promise<VismaTokenResponse> {
	const res = await fetch(VISMA_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri,
			client_id: clientId,
			client_secret: clientSecret
		})
	});
	if (!res.ok) throw new Error(`VISMA_TOKEN_${res.status}: ${await res.text()}`);
	return res.json() as Promise<VismaTokenResponse>;
}

export async function vismaRefreshToken(
	refreshToken: string,
	clientId: string,
	clientSecret: string
): Promise<VismaTokenResponse> {
	const res = await fetch(VISMA_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
			client_id: clientId,
			client_secret: clientSecret
		})
	});
	if (!res.ok) throw new Error(`VISMA_REFRESH_${res.status}: ${await res.text()}`);
	return res.json() as Promise<VismaTokenResponse>;
}

// Find or create "Mycelium Fleet" supplier in Visma
async function vismaEnsureSupplier(accessToken: string): Promise<string> {
	const search = await vismaRequest('GET', '/suppliers?search=Mycelium+Fleet', accessToken);
	if (search.ok) {
		const data = (await search.json()) as { Data?: Array<{ Id: string }> };
		const existing = data.Data?.[0];
		if (existing) return existing.Id;
	}
	const create = await vismaRequest('POST', '/suppliers', accessToken, {
		Name: 'Mycelium Fleet OS',
		PostalAddress: { Country: 'Sweden' }
	});
	if (!create.ok) throw new Error(`VISMA_SUPPLIER_${create.status}`);
	const created = (await create.json()) as { Id: string };
	return created.Id;
}

export const vismaConnector = {
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
		const supplierId = await vismaEnsureSupplier(accessToken);
		const dateStr = new Date(payload.date).toISOString();
		const amountExVat = payload.vatAmount
			? payload.amountTtc - payload.vatAmount
			: payload.amountTtc;

		const invoiceBody = {
			SupplierId: supplierId,
			InvoiceDate: dateStr,
			DueDate: new Date(payload.date + 30 * 86400000).toISOString(),
			YourReference: `mycelium:${payload.myceliumId}`,
			Rows: [
				{
					AccountNumber: parseInt(accountCode, 10),
					DebitAmount: amountExVat,
					Description: payload.label,
					...(payload.vatAmount ? { VatAmount: payload.vatAmount } : {})
				}
			]
		};

		if (payload.externalId) {
			const res = await vismaRequest(
				'PUT',
				`/supplierinvoices/${payload.externalId}`,
				accessToken,
				invoiceBody
			);
			if (!res.ok) throw new Error(`VISMA_INV_UPDATE_${res.status}: ${await res.text()}`);
			return { externalId: payload.externalId };
		}

		const res = await vismaRequest('POST', '/supplierinvoices', accessToken, invoiceBody);
		if (!res.ok) throw new Error(`VISMA_INV_CREATE_${res.status}: ${await res.text()}`);
		const data = (await res.json()) as { Id: string };
		return { externalId: data.Id };
	},

	async pullPaymentStatuses(
		accessToken: string,
		pairs: Array<{ costId: string; externalId: string }>
	): Promise<Array<{ externalId: string; isPaid: boolean; paidAt?: number }>> {
		const results = [];
		for (const { externalId } of pairs) {
			try {
				const res = await vismaRequest('GET', `/supplierinvoices/${externalId}`, accessToken);
				if (!res.ok) continue;
				const data = (await res.json()) as { IsPaid: boolean; PaymentDate?: string };
				results.push({
					externalId,
					isPaid: data.IsPaid,
					paidAt: data.IsPaid && data.PaymentDate ? Date.parse(data.PaymentDate) : undefined
				});
			} catch {
				/* skip */
			}
		}
		return results;
	}
};
