// QuickBooks Online API connector
// Docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/bill
// OAuth2 with 1-hour access tokens + 100-day refresh tokens
// Scope: com.intuit.quickbooks.accounting

export const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
export const QB_API_BASE = 'https://quickbooks.api.intuit.com/v3/company';
// Sandbox: https://sandbox-quickbooks.api.intuit.com/v3/company
export const QB_MINOR_VERSION = '70';

// Default expense account names for QuickBooks Online (UK/international)
export const QB_DEFAULT_MAPPING: Record<string, { code: string; label: string }> = {
	LEASING:    { code: 'Equipment Rental', label: 'Equipment Rental' },
	CARBURANT:  { code: 'Motor Vehicle Expenses', label: 'Motor Vehicle Expenses' },
	ENTRETIEN:  { code: 'Repairs and Maintenance', label: 'Repairs and Maintenance' },
	ASSURANCE:  { code: 'Insurance', label: 'Insurance' },
	TAXES:      { code: 'Taxes & Licences', label: 'Taxes & Licences' },
	SINISTRE:   { code: 'Repairs and Maintenance', label: 'Repairs and Maintenance' },
	PARKING:    { code: 'Travel', label: 'Travel' },
	TELEPEAGE:  { code: 'Travel', label: 'Travel' },
	AUTRE:      { code: 'Other Business Expenses', label: 'Other Business Expenses' },
	IK:         { code: 'Travel', label: 'Staff Travel' }
};

export interface QBTokenResponse {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	x_refresh_token_expires_in: number;
	token_type: string;
}

export interface QBAccount {
	Id: string;
	Name: string;
	AccountType: string;
	AccountSubType: string;
	Active: boolean;
}

async function qbRequest(
	method: string,
	path: string,
	accessToken: string,
	realmId: string,
	body?: unknown
): Promise<Response> {
	const url = `${QB_API_BASE}/${realmId}${path}${path.includes('?') ? '&' : '?'}minorversion=${QB_MINOR_VERSION}`;
	const res = await fetch(url, {
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

async function qbQuery<T>(
	accessToken: string,
	realmId: string,
	sql: string
): Promise<T[]> {
	const encoded = encodeURIComponent(sql);
	const res = await qbRequest('GET', `/query?query=${encoded}`, accessToken, realmId);
	if (!res.ok) return [];
	const data = (await res.json()) as {
		QueryResponse?: Record<string, T[]>
	};
	// QueryResponse has the entity name as key, e.g. { Account: [...] }
	const values = Object.values(data.QueryResponse ?? {});
	return (values[0] as T[]) ?? [];
}

// Exchange auth code for tokens
export async function qbExchangeCode(
	code: string,
	redirectUri: string,
	clientId: string,
	clientSecret: string
): Promise<QBTokenResponse> {
	const res = await fetch(QB_TOKEN_URL, {
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
	if (!res.ok) throw new Error(`QB_TOKEN_${res.status}: ${await res.text()}`);
	return res.json() as Promise<QBTokenResponse>;
}

// Refresh expired access token
export async function qbRefreshToken(
	refreshToken: string,
	clientId: string,
	clientSecret: string
): Promise<QBTokenResponse> {
	const res = await fetch(QB_TOKEN_URL, {
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
	if (!res.ok) throw new Error(`QB_REFRESH_${res.status}: ${await res.text()}`);
	return res.json() as Promise<QBTokenResponse>;
}

// Fetch expense accounts for mapping UI
export async function qbGetChartOfAccounts(
	accessToken: string,
	realmId: string
): Promise<QBAccount[]> {
	return qbQuery<QBAccount>(
		accessToken,
		realmId,
		"SELECT * FROM Account WHERE AccountType = 'Expense' AND Active = true MAXRESULTS 200"
	);
}

// Find or create a "Mycelium Fleet" vendor
async function qbEnsureVendor(accessToken: string, realmId: string): Promise<string> {
	const vendors = await qbQuery<{ Id: string; DisplayName: string }>(
		accessToken,
		realmId,
		"SELECT Id, DisplayName FROM Vendor WHERE DisplayName = 'Mycelium Fleet'"
	);
	const existing = vendors[0];
	if (existing) return existing.Id;

	const res = await qbRequest('POST', '/vendor', accessToken, realmId, {
		DisplayName: 'Mycelium Fleet'
	});
	if (!res.ok) throw new Error(`QB_VENDOR_${res.status}`);
	const data = (await res.json()) as { Vendor: { Id: string } };
	return data.Vendor.Id;
}

// Find account by name (returns Id or null)
async function qbFindAccount(
	accessToken: string,
	realmId: string,
	name: string
): Promise<string | null> {
	const accounts = await qbQuery<{ Id: string; Name: string }>(
		accessToken,
		realmId,
		`SELECT Id, Name FROM Account WHERE Name = '${name.replace(/'/g, "\\'")}' MAXRESULTS 1`
	);
	return accounts[0]?.Id ?? null;
}

export const quickbooksConnector = {
	async pushCost(
		accessToken: string,
		realmId: string,
		accountName: string,
		payload: {
			myceliumId: string;
			amountTtc: number;
			date: number;
			label: string;
			externalId?: string;
			externalSyncToken?: string;
		}
	): Promise<{ externalId: string; syncToken?: string }> {
		const vendorId = await qbEnsureVendor(accessToken, realmId);
		const accountId = await qbFindAccount(accessToken, realmId, accountName);

		const txnDate = new Date(payload.date).toISOString().slice(0, 10);
		const bill: Record<string, unknown> = {
			VendorRef: { value: vendorId },
			TxnDate: txnDate,
			DocNumber: `myc-${payload.myceliumId.slice(-8)}`,
			PrivateNote: `mycelium:${payload.myceliumId}`,
			Line: [
				{
					Amount: payload.amountTtc,
					DetailType: 'AccountBasedExpenseLineDetail',
					Description: payload.label,
					AccountBasedExpenseLineDetail: {
						AccountRef: accountId
							? { value: accountId, name: accountName }
							: { name: accountName }
					}
				}
			],
			TotalAmt: payload.amountTtc
		};

		// Update path: must include Id + SyncToken
		if (payload.externalId && payload.externalSyncToken) {
			bill.Id = payload.externalId;
			bill.SyncToken = payload.externalSyncToken;
			const res = await qbRequest('POST', '/bill', accessToken, realmId, bill);
			if (!res.ok) throw new Error(`QB_UPDATE_${res.status}: ${await res.text()}`);
			const data = (await res.json()) as { Bill: { Id: string; SyncToken: string } };
			return { externalId: data.Bill.Id, syncToken: data.Bill.SyncToken };
		}

		const res = await qbRequest('POST', '/bill', accessToken, realmId, bill);
		if (!res.ok) throw new Error(`QB_CREATE_${res.status}: ${await res.text()}`);
		const data = (await res.json()) as { Bill: { Id: string; SyncToken: string } };
		return { externalId: data.Bill.Id, syncToken: data.Bill.SyncToken };
	},

	async pullPaymentStatuses(
		accessToken: string,
		realmId: string,
		pairs: Array<{ costId: string; externalId: string }>
	): Promise<Array<{ externalId: string; isPaid: boolean; paidAt?: number }>> {
		const results: Array<{ externalId: string; isPaid: boolean; paidAt?: number }> = [];

		// QuickBooks: a Bill is "paid" when BillPayment entries reference it
		// We batch-query BillPayments linked to our bill IDs
		const ids = pairs.map((p) => `'${p.externalId}'`).join(', ');
		const payments = await qbQuery<{
			PayType: string;
			TxnDate: string;
			Line: Array<{ LinkedTxn?: Array<{ TxnId: string; TxnType: string }> }>;
		}>(
			accessToken,
			realmId,
			`SELECT * FROM BillPayment WHERE PayType IN ('Check', 'CreditCard') MAXRESULTS 100`
		);

		const paidBillIds = new Set<string>();
		const paidAtByBillId = new Map<string, number>();

		for (const payment of payments) {
			for (const line of payment.Line ?? []) {
				for (const linked of line.LinkedTxn ?? []) {
					if (linked.TxnType === 'Bill' && ids.includes(linked.TxnId)) {
						paidBillIds.add(linked.TxnId);
						paidAtByBillId.set(linked.TxnId, Date.parse(payment.TxnDate));
					}
				}
			}
		}

		for (const { externalId } of pairs) {
			results.push({
				externalId,
				isPaid: paidBillIds.has(externalId),
				paidAt: paidAtByBillId.get(externalId)
			});
		}

		return results;
	}
};
