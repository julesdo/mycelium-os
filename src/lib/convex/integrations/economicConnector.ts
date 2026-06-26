// e-conomic connector — #1 cloud accounting Denmark (Visma subsidiary)
// Docs: https://restdocs.e-conomic.com/
// Auth: dual-header — X-AppSecretToken (env) + X-AgreementGrantToken (per org, from OAuth grant)
// No refresh needed — agreement grant tokens are long-lived
// API base: https://restapi.e-conomic.com

export const EC_API = 'https://restapi.e-conomic.com';
// OAuth grant flow (to get the agreement grant token)
export const EC_AUTH_URL = 'https://secure.e-conomic.com/secure/api1/requestaccess.aspx';

// Danish standard chart of accounts (Dansk kontoplan)
export const ECONOMIC_DEFAULT_MAPPING: Record<string, { code: string; label: string }> = {
	LEASING: { code: '2210', label: 'Leasing af personbiler' },
	CARBURANT: { code: '2220', label: 'Brændstof' },
	ENTRETIEN: { code: '2230', label: 'Vedligeholdelse af biler' },
	ASSURANCE: { code: '2250', label: 'Forsikring, biler' },
	TAXES: { code: '2260', label: 'Vægtafgift, biler' },
	SINISTRE: { code: '2230', label: 'Reparation (forsikring)' },
	PARKING: { code: '2270', label: 'Parkering og bro/vejafgift' },
	TELEPEAGE: { code: '2270', label: 'Broafgift' },
	AUTRE: { code: '2290', label: 'Diverse biludgifter' },
	IK: { code: '4230', label: 'Kørselsgodtgørelse' }
};

async function ecRequest(
	method: string,
	path: string,
	appSecretToken: string,
	agreementGrantToken: string,
	body?: unknown
): Promise<Response> {
	const res = await fetch(`${EC_API}${path}`, {
		method,
		headers: {
			'X-AppSecretToken': appSecretToken,
			'X-AgreementGrantToken': agreementGrantToken,
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		...(body ? { body: JSON.stringify(body) } : {})
	});
	if (res.status === 429) throw new Error('RATE_LIMIT');
	return res;
}

// Get or create "Mycelium Fleet" supplier
async function ecEnsureSupplier(
	appSecretToken: string,
	agreementGrantToken: string
): Promise<number> {
	// e-conomic supplier search by name
	const search = await ecRequest(
		'GET',
		'/suppliers?filter=name$eq:Mycelium Fleet OS',
		appSecretToken,
		agreementGrantToken
	);
	if (search.ok) {
		const data = (await search.json()) as { collection?: Array<{ supplierNumber: number }> };
		const existing = data.collection?.[0];
		if (existing) return existing.supplierNumber;
	}

	// Get a default supplier group (required field)
	const groupsRes = await ecRequest('GET', '/supplier-groups', appSecretToken, agreementGrantToken);
	const groups = groupsRes.ok
		? ((await groupsRes.json()) as { collection?: Array<{ supplierGroupNumber: number }> })
		: { collection: undefined };
	const groupNumber = groups.collection?.[0]?.supplierGroupNumber ?? 1;

	const create = await ecRequest('POST', '/suppliers', appSecretToken, agreementGrantToken, {
		name: 'Mycelium Fleet OS',
		supplierGroup: { supplierGroupNumber: groupNumber },
		currency: 'DKK'
	});
	if (!create.ok) throw new Error(`EC_SUPPLIER_${create.status}`);
	const created = (await create.json()) as { supplierNumber: number };
	return created.supplierNumber;
}

export const economicConnector = {
	// agreementGrantToken stored encrypted in accountingIntegrations.encryptedAccessToken
	async pushCost(
		appSecretToken: string,
		agreementGrantToken: string,
		accountCode: number | string,
		payload: {
			myceliumId: string;
			amountTtc: number;
			vatAmount?: number;
			date: number;
			label: string;
			externalId?: string;
		}
	): Promise<{ externalId: string }> {
		const supplierNumber = await ecEnsureSupplier(appSecretToken, agreementGrantToken);
		const dateStr = new Date(payload.date).toISOString().slice(0, 10);
		const dueStr = new Date(payload.date + 30 * 86400000).toISOString().slice(0, 10);
		const amountExVat = payload.vatAmount
			? payload.amountTtc - payload.vatAmount
			: payload.amountTtc;

		const invoiceBody = {
			supplier: { supplierNumber },
			date: dateStr,
			dueDate: dueStr,
			supplierInvoiceNumber: `mycelium:${payload.myceliumId}`,
			lines: [
				{
					lineNumber: 1,
					account: { accountNumber: accountCode },
					description: payload.label,
					netAmount: amountExVat,
					...(payload.vatAmount ? { vatAmount: payload.vatAmount } : {})
				}
			]
		};

		if (payload.externalId) {
			const res = await ecRequest(
				'PUT',
				`/supplier-invoices/drafts/${payload.externalId}`,
				appSecretToken,
				agreementGrantToken,
				invoiceBody
			);
			if (!res.ok) throw new Error(`EC_INV_UPDATE_${res.status}: ${await res.text()}`);
			return { externalId: payload.externalId };
		}

		const res = await ecRequest(
			'POST',
			'/supplier-invoices/drafts',
			appSecretToken,
			agreementGrantToken,
			invoiceBody
		);
		if (!res.ok) throw new Error(`EC_INV_CREATE_${res.status}: ${await res.text()}`);
		const data = (await res.json()) as { draftInvoiceNumber: number };
		return { externalId: String(data.draftInvoiceNumber) };
	},

	async pullPaymentStatuses(
		appSecretToken: string,
		agreementGrantToken: string,
		pairs: Array<{ costId: string; externalId: string }>
	): Promise<Array<{ externalId: string; isPaid: boolean; paidAt?: number }>> {
		const results = [];
		for (const { externalId } of pairs) {
			try {
				// Check both drafts and booked invoices
				const bookedRes = await ecRequest(
					'GET',
					`/supplier-invoices/booked?filter=supplierInvoiceNumber$eq:${externalId}`,
					appSecretToken,
					agreementGrantToken
				);
				if (bookedRes.ok) {
					const data = (await bookedRes.json()) as {
						collection?: Array<{ paymentDate?: string; dueDate: string }>;
					};
					const invoice = data.collection?.[0];
					if (invoice) {
						results.push({
							externalId,
							isPaid: !!invoice.paymentDate,
							paidAt: invoice.paymentDate ? Date.parse(invoice.paymentDate) : undefined
						});
						continue;
					}
				}
				// Still draft = not yet booked = not paid
				results.push({ externalId, isPaid: false });
			} catch {
				/* skip */
			}
		}
		return results;
	}
};
