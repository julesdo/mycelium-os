// Tripletex connector — #1 accounting Norway
// Docs: https://tripletex.no/v2/swagger.json / https://developer.tripletex.no/
// Auth: consumer token (env) + employee token (per org) → create session token on demand
// Session token TTL: 1 day (renewed automatically)
// API base: https://tripletex.no/v2

export const TX_API = 'https://tripletex.no/v2';

// Norwegian standard chart of accounts (Norsk kontoplan)
export const TRIPLETEX_DEFAULT_MAPPING: Record<string, { code: string; label: string }> = {
	LEASING: { code: '6000', label: 'Leasingleie personbil' },
	CARBURANT: { code: '7140', label: 'Drivstoff' },
	ENTRETIEN: { code: '6400', label: 'Leie/reparasjon driftsmidler' },
	ASSURANCE: { code: '7500', label: 'Forsikringer' },
	TAXES: { code: '7700', label: 'Skatter og avgifter' },
	SINISTRE: { code: '6400', label: 'Reparasjon (forsikring)' },
	PARKING: { code: '7400', label: 'Parkering og bompenger' },
	TELEPEAGE: { code: '7400', label: 'Bompenger' },
	AUTRE: { code: '7099', label: 'Diverse driftskostnader' },
	IK: { code: '7330', label: 'Kjøregodtgjørelse' }
};

export interface TripletexSession {
	token: string;
	expiresAt: number; // ms timestamp
}

// Creates a session token from consumer + employee tokens
// Tripletex requires both tokens to be sent as Basic Auth: consumer:employee
export async function tripletexCreateSession(
	consumerToken: string,
	employeeToken: string,
	expirationDate: string // ISO date string, e.g. "2026-06-27"
): Promise<TripletexSession> {
	const credentials = btoa(`${consumerToken}:${employeeToken}`);
	const url = `${TX_API}/token/session/:create?consumerToken=${consumerToken}&employeeToken=${employeeToken}&expirationDate=${expirationDate}`;
	const res = await fetch(url, {
		method: 'PUT',
		headers: {
			Authorization: `Basic ${credentials}`,
			Accept: 'application/json'
		}
	});
	if (!res.ok) throw new Error(`TX_SESSION_${res.status}: ${await res.text()}`);
	const data = (await res.json()) as { value: { token: string; expirationDate: string } };
	return {
		token: data.value.token,
		expiresAt: Date.parse(data.value.expirationDate)
	};
}

async function txRequest(
	method: string,
	path: string,
	sessionToken: string,
	body?: unknown
): Promise<Response> {
	// Tripletex session auth: Basic "0:<session_token>"
	const credentials = btoa(`0:${sessionToken}`);
	const res = await fetch(`${TX_API}${path}`, {
		method,
		headers: {
			Authorization: `Basic ${credentials}`,
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		...(body ? { body: JSON.stringify(body) } : {})
	});
	if (res.status === 429) throw new Error('RATE_LIMIT');
	return res;
}

// Get or create "Mycelium Fleet" supplier
async function txEnsureSupplier(sessionToken: string): Promise<number> {
	const search = await txRequest('GET', '/supplier?name=Mycelium+Fleet&count=1', sessionToken);
	if (search.ok) {
		const data = (await search.json()) as { values?: Array<{ id: number }> };
		const existing = data.values?.[0];
		if (existing) return existing.id;
	}
	const create = await txRequest('POST', '/supplier', sessionToken, {
		name: 'Mycelium Fleet OS',
		email: '',
		isSupplier: true
	});
	if (!create.ok) throw new Error(`TX_SUPPLIER_${create.status}`);
	const created = (await create.json()) as { value: { id: number } };
	return created.value.id;
}

export const tripletexConnector = {
	async pushCost(
		sessionToken: string,
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
		const supplierId = await txEnsureSupplier(sessionToken);
		const dateStr = new Date(payload.date).toISOString().slice(0, 10);
		const amountExVat = payload.vatAmount
			? payload.amountTtc - payload.vatAmount
			: payload.amountTtc;

		const invoiceBody = {
			supplier: { id: supplierId },
			invoiceDate: dateStr,
			paymentDueDate: new Date(payload.date + 30 * 86400000).toISOString().slice(0, 10),
			ourReference: `mycelium:${payload.myceliumId}`,
			orders: [
				{
					orderLines: [
						{
							description: payload.label,
							account: { number: parseInt(accountCode, 10) },
							amountExcludingVat: amountExVat,
							...(payload.vatAmount ? { vatAmount: payload.vatAmount } : {})
						}
					]
				}
			]
		};

		if (payload.externalId) {
			const res = await txRequest(
				'PUT',
				`/supplierInvoice/${payload.externalId}`,
				sessionToken,
				invoiceBody
			);
			if (!res.ok) throw new Error(`TX_INV_UPDATE_${res.status}: ${await res.text()}`);
			return { externalId: payload.externalId };
		}

		const res = await txRequest('POST', '/supplierInvoice', sessionToken, invoiceBody);
		if (!res.ok) throw new Error(`TX_INV_CREATE_${res.status}: ${await res.text()}`);
		const data = (await res.json()) as { value: { id: number } };
		return { externalId: String(data.value.id) };
	},

	async pullPaymentStatuses(
		sessionToken: string,
		pairs: Array<{ costId: string; externalId: string }>
	): Promise<Array<{ externalId: string; isPaid: boolean; paidAt?: number }>> {
		const results = [];
		for (const { externalId } of pairs) {
			try {
				const res = await txRequest('GET', `/supplierInvoice/${externalId}`, sessionToken);
				if (!res.ok) continue;
				const data = (await res.json()) as {
					value: { status: string; paymentDate?: string };
				};
				const isPaid = data.value.status === 'APPROVED';
				results.push({
					externalId,
					isPaid,
					paidAt: isPaid && data.value.paymentDate ? Date.parse(data.value.paymentDate) : undefined
				});
			} catch {
				/* skip */
			}
		}
		return results;
	}
};
