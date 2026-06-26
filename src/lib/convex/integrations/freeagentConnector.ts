// FreeAgent v2 connector
// Docs: https://dev.freeagent.com/docs/
// OAuth2 — access token 2h, refresh permanent until revoked
// API base: https://api.freeagent.com/v2

export const FA_API = 'https://api.freeagent.com/v2';
export const FA_AUTH_URL = 'https://api.freeagent.com/v2/approve_app';
export const FA_TOKEN_URL = 'https://api.freeagent.com/v2/token_endpoint';

export const FREEAGENT_DEFAULT_MAPPING: Record<string, { code: string; label: string }> = {
	LEASING: { code: '284', label: 'Motor Vehicle Leasing' },
	CARBURANT: { code: '284', label: 'Motor Expenses' },
	ENTRETIEN: { code: '284', label: 'Motor Repairs & Servicing' },
	ASSURANCE: { code: '471', label: 'Insurance' },
	TAXES: { code: '296', label: 'Vehicle Excise Duty' },
	SINISTRE: { code: '284', label: 'Motor Repairs (Insurance)' },
	PARKING: { code: '273', label: 'Parking & Tolls' },
	TELEPEAGE: { code: '273', label: 'Tolls' },
	AUTRE: { code: '477', label: 'General Admin' },
	IK: { code: '273', label: 'Staff Travel & Subsistence' }
};

export interface FATokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	token_type: string;
}

async function faRequest(
	method: string,
	path: string,
	accessToken: string,
	body?: unknown
): Promise<Response> {
	const res = await fetch(`${FA_API}${path}`, {
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

export async function faExchangeCode(
	code: string,
	redirectUri: string,
	clientId: string,
	clientSecret: string
): Promise<FATokenResponse> {
	const res = await fetch(FA_TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`
		},
		body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })
	});
	if (!res.ok) throw new Error(`FA_TOKEN_${res.status}: ${await res.text()}`);
	return res.json() as Promise<FATokenResponse>;
}

export async function faRefreshToken(
	refreshToken: string,
	clientId: string,
	clientSecret: string
): Promise<FATokenResponse> {
	const res = await fetch(FA_TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`
		},
		body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken })
	});
	if (!res.ok) throw new Error(`FA_REFRESH_${res.status}: ${await res.text()}`);
	return res.json() as Promise<FATokenResponse>;
}

// Get or create "Mycelium Fleet" contact for bill supplier
async function faEnsureContact(accessToken: string): Promise<string> {
	const search = await faRequest(
		'GET',
		'/contacts?contact_name_includes=Mycelium+Fleet',
		accessToken
	);
	if (search.ok) {
		const data = (await search.json()) as { contacts?: Array<{ url: string }> };
		const existing = data.contacts?.[0];
		if (existing) return existing.url;
	}
	const create = await faRequest('POST', '/contacts', accessToken, {
		contact: {
			first_name: 'Mycelium',
			last_name: 'Fleet',
			organisation_name: 'Mycelium Fleet OS',
			contact_type: 'Organisation',
			is_supplier: true
		}
	});
	if (!create.ok) throw new Error(`FA_CONTACT_${create.status}`);
	const created = (await create.json()) as { contact: { url: string } };
	return created.contact.url;
}

export const freeagentConnector = {
	async pushCost(
		accessToken: string,
		categoryCode: string,
		payload: {
			myceliumId: string;
			amountTtc: number;
			vatAmount?: number;
			date: number;
			label: string;
			externalId?: string;
		}
	): Promise<{ externalId: string }> {
		const contactUrl = await faEnsureContact(accessToken);
		const dateStr = new Date(payload.date).toISOString().slice(0, 10);
		// FreeAgent category URL format: /v2/categories/{id}
		const categoryUrl = categoryCode.startsWith('http')
			? categoryCode
			: `${FA_API}/categories/${categoryCode}`;

		const billBody = {
			bill: {
				contact: contactUrl,
				dated_on: dateStr,
				reference: `mycelium:${payload.myceliumId}`,
				bill_items: [
					{
						description: payload.label,
						gross_value: String(payload.amountTtc),
						category: categoryUrl,
						...(payload.vatAmount !== undefined
							? { sales_tax_rate: String((payload.vatAmount / payload.amountTtc) * 100) }
							: {})
					}
				]
			}
		};

		if (payload.externalId) {
			const res = await faRequest('PUT', `/bills/${payload.externalId}`, accessToken, billBody);
			if (!res.ok) throw new Error(`FA_BILL_UPDATE_${res.status}: ${await res.text()}`);
			return { externalId: payload.externalId };
		}

		const res = await faRequest('POST', '/bills', accessToken, billBody);
		if (!res.ok) throw new Error(`FA_BILL_CREATE_${res.status}: ${await res.text()}`);
		const data = (await res.json()) as { bill: { url: string } };
		// Extract ID from URL: .../bills/123 → '123'
		const id = data.bill.url.split('/').pop() ?? data.bill.url;
		return { externalId: id };
	},

	async pullPaymentStatuses(
		accessToken: string,
		pairs: Array<{ costId: string; externalId: string }>
	): Promise<Array<{ externalId: string; isPaid: boolean; paidAt?: number }>> {
		const results = [];
		for (const { externalId } of pairs) {
			try {
				const res = await faRequest('GET', `/bills/${externalId}`, accessToken);
				if (!res.ok) continue;
				const data = (await res.json()) as { bill: { status: string; dated_on: string } };
				results.push({
					externalId,
					isPaid: data.bill.status === 'paid',
					paidAt: data.bill.status === 'paid' ? Date.parse(data.bill.dated_on) : undefined
				});
			} catch {
				/* skip */
			}
		}
		return results;
	}
};
