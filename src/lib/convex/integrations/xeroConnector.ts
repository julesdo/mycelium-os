// Xero Accounting API connector
// Docs: https://developer.xero.com/documentation/api/accounting/overview
// OAuth2 with 30-min access tokens + 60-day refresh tokens
// Requires scopes: accounting.transactions accounting.settings accounting.contacts offline_access

export const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token';
export const XERO_API = 'https://api.xero.com/api.xro/2.0';
export const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections';

// Default account codes for UK Xero (standard chart of accounts)
export const XERO_DEFAULT_MAPPING: Record<string, { code: string; label: string }> = {
	LEASING:    { code: '460', label: 'Hire of Plant & Machinery' },
	CARBURANT:  { code: '429', label: 'Motor Expenses' },
	ENTRETIEN:  { code: '469', label: 'Repairs & Maintenance' },
	ASSURANCE:  { code: '468', label: 'Insurance' },
	TAXES:      { code: '499', label: 'Taxes & Licences' },
	SINISTRE:   { code: '469', label: 'Repairs & Maintenance' },
	PARKING:    { code: '475', label: 'Travel & Accommodation' },
	TELEPEAGE:  { code: '475', label: 'Travel & Accommodation' },
	AUTRE:      { code: '404', label: 'Other Operating Costs' },
	IK:         { code: '475', label: 'Staff Travel' }
};

export interface XeroChartAccount {
	Code: string;
	Name: string;
	Type: string;
	Status: string;
}

export interface XeroTokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
}

export interface XeroTenant {
	tenantId: string;
	tenantName: string;
	tenantType: string;
}

async function xeroRequest(
	method: string,
	path: string,
	accessToken: string,
	tenantId: string,
	body?: unknown
): Promise<Response> {
	const res = await fetch(`${XERO_API}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Xero-tenant-id': tenantId,
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		...(body ? { body: JSON.stringify(body) } : {})
	});
	if (res.status === 429) throw new Error('RATE_LIMIT');
	return res;
}

// Exchange auth code for tokens
export async function xeroExchangeCode(
	code: string,
	redirectUri: string,
	clientId: string,
	clientSecret: string
): Promise<XeroTokenResponse> {
	const res = await fetch(XERO_TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`
		},
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri
		})
	});
	if (!res.ok) throw new Error(`XERO_TOKEN_${res.status}: ${await res.text()}`);
	return res.json() as Promise<XeroTokenResponse>;
}

// Refresh expired access token
export async function xeroRefreshToken(
	refreshToken: string,
	clientId: string,
	clientSecret: string
): Promise<XeroTokenResponse> {
	const res = await fetch(XERO_TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`
		},
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken
		})
	});
	if (!res.ok) throw new Error(`XERO_REFRESH_${res.status}: ${await res.text()}`);
	return res.json() as Promise<XeroTokenResponse>;
}

// Fetch connected Xero tenants after OAuth (first = primary org)
export async function xeroGetTenants(accessToken: string): Promise<XeroTenant[]> {
	const res = await fetch(XERO_CONNECTIONS_URL, {
		headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
	});
	if (!res.ok) throw new Error(`XERO_CONNECTIONS_${res.status}`);
	return res.json() as Promise<XeroTenant[]>;
}

// Fetch expense accounts for the mapping UI
export async function xeroGetChartOfAccounts(
	accessToken: string,
	tenantId: string
): Promise<XeroChartAccount[]> {
	const res = await xeroRequest('GET', '/Accounts?where=Class%3D%3D%22EXPENSE%22&Status=ACTIVE', accessToken, tenantId);
	if (!res.ok) return [];
	const data = (await res.json()) as { Accounts?: XeroChartAccount[] };
	return data.Accounts ?? [];
}

// Find or create a supplier contact named "Mycelium Fleet"
async function xeroEnsureContact(accessToken: string, tenantId: string): Promise<string> {
	const searchRes = await xeroRequest(
		'GET',
		'/Contacts?where=Name%3D%3D%22Mycelium%20Fleet%22&IsSupplier=true',
		accessToken,
		tenantId
	);
	if (searchRes.ok) {
		const data = (await searchRes.json()) as { Contacts?: Array<{ ContactID: string }> };
		const first = data.Contacts?.[0];
		if (first) return first.ContactID;
	}

	const createRes = await xeroRequest('POST', '/Contacts', accessToken, tenantId, {
		Contacts: [{ Name: 'Mycelium Fleet', IsSupplier: true, EmailAddress: '' }]
	});
	if (!createRes.ok) throw new Error(`XERO_CONTACT_${createRes.status}`);
	const created = (await createRes.json()) as { Contacts: Array<{ ContactID: string }> };
	const contact = created.Contacts[0];
	if (!contact) throw new Error('XERO_CONTACT_EMPTY_RESPONSE');
	return contact.ContactID;
}

export const xeroConnector = {
	async pushCost(
		accessToken: string,
		tenantId: string,
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
		const contactId = await xeroEnsureContact(accessToken, tenantId);
		const dateStr = new Date(payload.date).toISOString().slice(0, 10);
		const amountExVat = payload.vatAmount
			? payload.amountTtc - payload.vatAmount
			: payload.amountTtc;

		const invoice = {
			Type: 'ACCPAY',
			Contact: { ContactID: contactId },
			Date: dateStr,
			DueDate: dateStr,
			Reference: `mycelium:${payload.myceliumId}`,
			Status: 'SUBMITTED',
			LineItems: [
				{
					Description: payload.label,
					Quantity: 1,
					UnitAmount: amountExVat,
					TaxAmount: payload.vatAmount ?? 0,
					AccountCode: accountCode
				}
			]
		};

		if (payload.externalId) {
			const res = await xeroRequest('POST', '/Invoices', accessToken, tenantId, {
				Invoices: [{ ...invoice, InvoiceID: payload.externalId }]
			});
			if (!res.ok) throw new Error(`XERO_UPDATE_${res.status}: ${await res.text()}`);
			return { externalId: payload.externalId };
		}

		const res = await xeroRequest('PUT', '/Invoices', accessToken, tenantId, {
			Invoices: [invoice]
		});
		if (!res.ok) throw new Error(`XERO_CREATE_${res.status}: ${await res.text()}`);
		const data = (await res.json()) as { Invoices: Array<{ InvoiceID: string }> };
		const created = data.Invoices[0];
		if (!created) throw new Error('XERO_CREATE_EMPTY_RESPONSE');
		return { externalId: created.InvoiceID };
	},

	async pullPaymentStatuses(
		accessToken: string,
		tenantId: string,
		pairs: Array<{ costId: string; externalId: string }>
	): Promise<Array<{ externalId: string; isPaid: boolean; paidAt?: number }>> {
		const results: Array<{ externalId: string; isPaid: boolean; paidAt?: number }> = [];
		for (const { externalId } of pairs) {
			try {
				const res = await xeroRequest('GET', `/Invoices/${externalId}`, accessToken, tenantId);
				if (!res.ok) continue;
				const data = (await res.json()) as {
					Invoices?: Array<{ Status?: string; FullyPaidOnDate?: string }>
				};
				const inv = data.Invoices?.[0];
				if (!inv) continue;
				results.push({
					externalId,
					isPaid: inv.Status === 'PAID',
					paidAt: inv.FullyPaidOnDate ? Date.parse(inv.FullyPaidOnDate) : undefined
				});
			} catch { /* skip */ }
		}
		return results;
	}
};
