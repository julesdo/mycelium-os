import { v, ConvexError } from 'convex/values';
import {
	action,
	internalAction,
	internalMutation,
	internalQuery,
	type ActionCtx
} from '../_generated/server';
import { internal } from '../_generated/api';
import { authedQuery, authedMutation } from '../functions';
import { getUserOrg, requireOrgAdmin } from '../lib/auth';
import { authComponent } from '../auth';
import type { Id } from '../_generated/dataModel';
import {
	xeroConnector,
	xeroRefreshToken,
	xeroGetChartOfAccounts,
	XERO_DEFAULT_MAPPING
} from './xeroConnector';
import {
	quickbooksConnector,
	qbRefreshToken,
	qbGetChartOfAccounts,
	QB_DEFAULT_MAPPING
} from './quickbooksConnector';
import {
	freeagentConnector,
	faRefreshToken,
	FREEAGENT_DEFAULT_MAPPING
} from './freeagentConnector';
import { fortnoxConnector, fxRefreshToken, FORTNOX_DEFAULT_MAPPING } from './fortnoxConnector';
import { vismaConnector, vismaRefreshToken, VISMA_DEFAULT_MAPPING } from './vismaConnector';
import {
	tripletexConnector,
	tripletexCreateSession,
	TRIPLETEX_DEFAULT_MAPPING
} from './tripletexConnector';
import { economicConnector, ECONOMIC_DEFAULT_MAPPING } from './economicConnector';

// ─── Encryption (AES-256-GCM, Web Crypto) ────────────────────────────────────

async function encryptToken(plaintext: string, keyBase64: string): Promise<string> {
	const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
	const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		new TextEncoder().encode(plaintext)
	);
	const combined = new Uint8Array(12 + ciphertext.byteLength);
	combined.set(iv, 0);
	combined.set(new Uint8Array(ciphertext), 12);
	return btoa(String.fromCharCode(...combined));
}

async function decryptToken(cipherBase64: string, keyBase64: string): Promise<string> {
	const combined = Uint8Array.from(atob(cipherBase64), (c) => c.charCodeAt(0));
	const iv = combined.slice(0, 12);
	const encrypted = combined.slice(12);
	const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
	const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
	const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
	return new TextDecoder().decode(plaintext);
}

function requireEncryptionKey(): string {
	const key = process.env.ACCOUNTING_ENCRYPTION_KEY ?? process.env.GOOGLE_ENCRYPTION_KEY;
	if (!key) throw new Error('[accounting] ACCOUNTING_ENCRYPTION_KEY not set');
	return key;
}

// ─── Default category mappings per provider ───────────────────────────────────

export {
	XERO_DEFAULT_MAPPING,
	QB_DEFAULT_MAPPING,
	FREEAGENT_DEFAULT_MAPPING,
	FORTNOX_DEFAULT_MAPPING,
	VISMA_DEFAULT_MAPPING,
	TRIPLETEX_DEFAULT_MAPPING,
	ECONOMIC_DEFAULT_MAPPING
};

export const DEFAULT_PCG_MAPPING: Record<string, { code: string; label: string }> = {
	LEASING: { code: '6132', label: 'Locations mobilières (leasing)' },
	CARBURANT: { code: '6061', label: 'Carburants' },
	ENTRETIEN: { code: '6155', label: 'Entretien et réparations véhicules' },
	ASSURANCE: { code: '6162', label: 'Assurance flotte' },
	TAXES: { code: '6354', label: 'Taxes sur véhicules (TVS)' },
	SINISTRE: { code: '6155', label: 'Réparations sinistres' },
	PARKING: { code: '6251', label: 'Frais de stationnement' },
	TELEPEAGE: { code: '6251', label: 'Péages' },
	AUTRE: { code: '6068', label: 'Autres frais flotte' },
	IK: { code: '6251', label: 'Indemnités kilométriques' }
};

// ─── Connector port (shared interface) ────────────────────────────────────────

interface CategoryMapping {
	externalAccountCode: string;
	analyticAxis?: string;
	vatRate?: number;
}

interface CostPushPayload {
	myceliumId: string;
	category: string;
	amountTtc: number;
	vatAmount?: number;
	date: number;
	label: string;
	vehicleRegistration?: string;
	externalId?: string;
	// QB needs SyncToken for updates
	externalSyncToken?: string;
}

interface AccountingConnector {
	pushCost(
		token: string,
		mapping: CategoryMapping,
		payload: CostPushPayload,
		tenantId?: string
	): Promise<{ externalId: string; syncToken?: string }>;
	pullPaymentStatuses(
		token: string,
		pairs: Array<{ costId: string; externalId: string }>,
		tenantId?: string
	): Promise<Array<{ externalId: string; isPaid: boolean; paidAt?: number }>>;
}

// ─── Pennylane connector ──────────────────────────────────────────────────────

const PL_API = 'https://app.pennylane.com/api/external/v1';

async function pennylaneRequest(
	method: string,
	path: string,
	token: string,
	body?: unknown
): Promise<Response> {
	const res = await fetch(`${PL_API}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			Accept: 'application/json'
		},
		...(body ? { body: JSON.stringify(body) } : {})
	});
	if (res.status === 429) throw new Error('RATE_LIMIT');
	return res;
}

const pennylaneConnector: AccountingConnector = {
	async pushCost(token, mapping, payload) {
		const invoiceBody = {
			date: new Date(payload.date).toISOString().slice(0, 10),
			label: payload.label,
			currency_amount: payload.amountTtc,
			...(mapping.externalAccountCode ? { ledger_account_code: mapping.externalAccountCode } : {}),
			...(mapping.analyticAxis ? { analytic_code: mapping.analyticAxis } : {}),
			...(payload.vatAmount !== undefined ? { vat_amount: payload.vatAmount } : {}),
			external_reference: `mycelium:${payload.myceliumId}`
		};
		if (payload.externalId) {
			const res = await pennylaneRequest(
				'PUT',
				`/supplier_invoices/${payload.externalId}`,
				token,
				invoiceBody
			);
			if (!res.ok) throw new Error(`PENNYLANE_UPDATE_${res.status}:${await res.text()}`);
			return { externalId: payload.externalId };
		}
		const res = await pennylaneRequest('POST', '/supplier_invoices', token, invoiceBody);
		if (!res.ok) throw new Error(`PENNYLANE_CREATE_${res.status}:${await res.text()}`);
		const data = (await res.json()) as { id: number | string };
		return { externalId: String(data.id) };
	},
	async pullPaymentStatuses(token, pairs) {
		const results = [];
		for (const { externalId } of pairs) {
			try {
				const res = await pennylaneRequest('GET', `/supplier_invoices/${externalId}`, token);
				if (!res.ok) continue;
				const inv = (await res.json()) as { status?: string; paid_at?: string };
				results.push({
					externalId,
					isPaid: inv.status === 'paid',
					paidAt: inv.paid_at ? Date.parse(inv.paid_at) : undefined
				});
			} catch {
				/* skip */
			}
		}
		return results;
	}
};

// ─── Sage connector ───────────────────────────────────────────────────────────

const SAGE_API = 'https://api.accounting.sage.com/v3.1';

const sageConnector: AccountingConnector = {
	async pushCost(token, mapping, payload) {
		const body = {
			purchase_invoice: {
				date: new Date(payload.date).toISOString().slice(0, 10),
				reference: `mycelium:${payload.myceliumId}`,
				invoice_lines: [
					{
						ledger_account_id: mapping.externalAccountCode,
						total_amount: payload.amountTtc,
						tax_amount: payload.vatAmount ?? 0,
						description: payload.label,
						...(mapping.analyticAxis ? { analytics_codes: [mapping.analyticAxis] } : {})
					}
				]
			}
		};
		const method = payload.externalId ? 'PUT' : 'POST';
		const url = payload.externalId
			? `${SAGE_API}/purchase_invoices/${payload.externalId}`
			: `${SAGE_API}/purchase_invoices`;
		const res = await fetch(url, {
			method,
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		if (res.status === 429) throw new Error('RATE_LIMIT');
		if (!res.ok) throw new Error(`SAGE_${res.status}`);
		if (payload.externalId) return { externalId: payload.externalId };
		const data = (await res.json()) as { id: number | string };
		return { externalId: String(data.id) };
	},
	async pullPaymentStatuses(token, pairs) {
		const results = [];
		for (const { externalId } of pairs) {
			try {
				const res = await fetch(`${SAGE_API}/purchase_invoices/${externalId}`, {
					headers: { Authorization: `Bearer ${token}` }
				});
				if (!res.ok) continue;
				const inv = (await res.json()) as { status?: { id?: string }; paid_on?: string };
				results.push({
					externalId,
					isPaid: inv.status?.id === 'paid',
					paidAt: inv.paid_on ? Date.parse(inv.paid_on) : undefined
				});
			} catch {
				/* skip */
			}
		}
		return results;
	}
};

// ─── EBP connector ────────────────────────────────────────────────────────────

// EBP Open Line REST API (cloud edition). Classic/local editions use a different path.
const EBP_API = 'https://api.myebpcompta.com/v1';

const ebpConnector: AccountingConnector = {
	async pushCost(token, mapping, payload) {
		const body = {
			reference: `mycelium:${payload.myceliumId}`,
			date: new Date(payload.date).toISOString().slice(0, 10),
			accountCode: mapping.externalAccountCode,
			analyticCode: mapping.analyticAxis ?? 'FLOTTE',
			totalAmount: payload.amountTtc,
			vatAmount: payload.vatAmount ?? 0,
			label: payload.label,
			...(payload.vehicleRegistration ? { vehicleRegistration: payload.vehicleRegistration } : {})
		};
		const method = payload.externalId ? 'PUT' : 'POST';
		const url = payload.externalId
			? `${EBP_API}/purchase_invoices/${payload.externalId}`
			: `${EBP_API}/purchase_invoices`;
		const res = await fetch(url, {
			method,
			headers: {
				'X-API-Key': token,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});
		if (res.status === 429) throw new Error('RATE_LIMIT');
		if (!res.ok) throw new Error(`EBP_${res.status}`);
		if (payload.externalId) return { externalId: payload.externalId };
		const data = (await res.json()) as { id: string };
		return { externalId: data.id };
	},
	async pullPaymentStatuses(_token, _pairs) {
		// EBP pull not yet supported — status must be reconciled manually
		return [];
	}
};

// ─── Xero adapter (wraps xeroConnector to match AccountingConnector interface) ─

const xeroAdapter: AccountingConnector = {
	async pushCost(token, mapping, payload, tenantId = '') {
		return xeroConnector.pushCost(token, tenantId, mapping.externalAccountCode, {
			myceliumId: payload.myceliumId,
			amountTtc: payload.amountTtc,
			vatAmount: payload.vatAmount,
			date: payload.date,
			label: payload.label,
			externalId: payload.externalId
		});
	},
	async pullPaymentStatuses(token, pairs, tenantId = '') {
		return xeroConnector.pullPaymentStatuses(token, tenantId, pairs);
	}
};

// ─── QuickBooks adapter ────────────────────────────────────────────────────────

const quickbooksAdapter: AccountingConnector = {
	async pushCost(token, mapping, payload, tenantId = '') {
		return quickbooksConnector.pushCost(token, tenantId, mapping.externalAccountCode, {
			myceliumId: payload.myceliumId,
			amountTtc: payload.amountTtc,
			date: payload.date,
			label: payload.label,
			externalId: payload.externalId,
			externalSyncToken: payload.externalSyncToken
		});
	},
	async pullPaymentStatuses(token, pairs, tenantId = '') {
		return quickbooksConnector.pullPaymentStatuses(token, tenantId, pairs);
	}
};

// ─── FreeAgent adapter ────────────────────────────────────────────────────────

const freeagentAdapter: AccountingConnector = {
	async pushCost(token, mapping, payload) {
		return freeagentConnector.pushCost(token, mapping.externalAccountCode, {
			myceliumId: payload.myceliumId,
			amountTtc: payload.amountTtc,
			vatAmount: payload.vatAmount,
			date: payload.date,
			label: payload.label,
			externalId: payload.externalId
		});
	},
	async pullPaymentStatuses(token, pairs) {
		return freeagentConnector.pullPaymentStatuses(token, pairs);
	}
};

// ─── Fortnox adapter ──────────────────────────────────────────────────────────

const fortnoxAdapter: AccountingConnector = {
	async pushCost(token, mapping, payload) {
		return fortnoxConnector.pushCost(token, mapping.externalAccountCode, {
			myceliumId: payload.myceliumId,
			amountTtc: payload.amountTtc,
			vatAmount: payload.vatAmount,
			date: payload.date,
			label: payload.label,
			externalId: payload.externalId
		});
	},
	async pullPaymentStatuses(token, pairs) {
		return fortnoxConnector.pullPaymentStatuses(token, pairs);
	}
};

// ─── Visma eAccounting adapter ────────────────────────────────────────────────

const vismaAdapter: AccountingConnector = {
	async pushCost(token, mapping, payload) {
		return vismaConnector.pushCost(token, mapping.externalAccountCode, {
			myceliumId: payload.myceliumId,
			amountTtc: payload.amountTtc,
			vatAmount: payload.vatAmount,
			date: payload.date,
			label: payload.label,
			externalId: payload.externalId
		});
	},
	async pullPaymentStatuses(token, pairs) {
		return vismaConnector.pullPaymentStatuses(token, pairs);
	}
};

// ─── Tripletex adapter — creates a daily session from employee + consumer tokens

const tripletexAdapter: AccountingConnector = {
	async pushCost(employeeToken, mapping, payload) {
		const consumerToken = process.env.TRIPLETEX_CONSUMER_TOKEN;
		if (!consumerToken)
			throw new Error('TRIPLETEX_CONSUMER_TOKEN not configured in Convex dashboard');
		const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
		const { token: sessionToken } = await tripletexCreateSession(
			consumerToken,
			employeeToken,
			tomorrow
		);
		return tripletexConnector.pushCost(sessionToken, mapping.externalAccountCode, {
			myceliumId: payload.myceliumId,
			amountTtc: payload.amountTtc,
			vatAmount: payload.vatAmount,
			date: payload.date,
			label: payload.label,
			externalId: payload.externalId
		});
	},
	async pullPaymentStatuses(employeeToken, pairs) {
		const consumerToken = process.env.TRIPLETEX_CONSUMER_TOKEN;
		if (!consumerToken) return [];
		const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
		const { token: sessionToken } = await tripletexCreateSession(
			consumerToken,
			employeeToken,
			tomorrow
		);
		return tripletexConnector.pullPaymentStatuses(sessionToken, pairs);
	}
};

// ─── e-conomic adapter — appSecretToken from env, grant token from storage ─────

const economicAdapter: AccountingConnector = {
	async pushCost(agreementGrantToken, mapping, payload) {
		const appSecretToken = process.env.ECONOMIC_APP_SECRET_TOKEN;
		if (!appSecretToken)
			throw new Error('ECONOMIC_APP_SECRET_TOKEN not configured in Convex dashboard');
		return economicConnector.pushCost(
			appSecretToken,
			agreementGrantToken,
			parseInt(mapping.externalAccountCode, 10),
			{
				myceliumId: payload.myceliumId,
				amountTtc: payload.amountTtc,
				vatAmount: payload.vatAmount,
				date: payload.date,
				label: payload.label,
				externalId: payload.externalId
			}
		);
	},
	async pullPaymentStatuses(agreementGrantToken, pairs) {
		const appSecretToken = process.env.ECONOMIC_APP_SECRET_TOKEN;
		if (!appSecretToken) return [];
		return economicConnector.pullPaymentStatuses(appSecretToken, agreementGrantToken, pairs);
	}
};

// ─── Connector registry ────────────────────────────────────────────────────────

const connectors: Record<string, AccountingConnector> = {
	pennylane: pennylaneConnector,
	sage: sageConnector,
	ebp: ebpConnector,
	xero: xeroAdapter,
	quickbooks: quickbooksAdapter,
	freeagent: freeagentAdapter,
	fortnox: fortnoxAdapter,
	visma: vismaAdapter,
	tripletex: tripletexAdapter,
	economic: economicAdapter
};

// ─── API key connect (action — encryption dans Convex, clé en clair jamais dans SvelteKit) ──

export const getUserOrgForAction = internalQuery({
	args: { userId: v.string() },
	handler: async (ctx, { userId }) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', userId))
			.unique();
		if (!profile?.currentOrganizationId) return null;
		const membership = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', profile.currentOrganizationId!).eq('userId', userId)
			)
			.unique();
		return {
			organizationId: profile.currentOrganizationId,
			isAdmin: membership?.role === 'ORG_ADMIN'
		};
	}
});

export const connectWithApiKeyInternal = internalMutation({
	args: {
		provider: v.union(
			v.literal('pennylane'),
			v.literal('sage'),
			v.literal('ebp'),
			v.literal('tripletex'),
			v.literal('economic')
		),
		organizationId: v.id('organizations'),
		encryptedApiKey: v.string(),
		connectedBy: v.string()
	},
	handler: async (ctx, { provider, organizationId, encryptedApiKey, connectedBy }) => {
		const existing = await ctx.db
			.query('accountingIntegrations')
			.withIndex('by_org_and_provider', (q) =>
				q.eq('organizationId', organizationId).eq('provider', provider)
			)
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				encryptedAccessToken: encryptedApiKey,
				status: 'CONNECTED',
				lastSyncError: undefined
			});
			await ctx.scheduler.runAfter(0, internal.integrations.accounting.seedDefaultMappings, {
				integrationId: existing._id,
				organizationId
			});
			return;
		}

		const integrationId = await ctx.db.insert('accountingIntegrations', {
			organizationId,
			provider,
			status: 'CONNECTED',
			encryptedAccessToken: encryptedApiKey,
			syncCosts: true,
			syncVehicles: false,
			syncExpenses: true,
			connectedBy,
			connectedAt: Date.now()
		});
		await ctx.scheduler.runAfter(0, internal.integrations.accounting.seedDefaultMappings, {
			integrationId,
			organizationId
		});
	}
});

// Public action — called directly from the wizard, auth token auto-inclus par le client Convex
export const connectApiKeyProvider = action({
	args: {
		provider: v.union(
			v.literal('pennylane'),
			v.literal('sage'),
			v.literal('ebp'),
			v.literal('tripletex'),
			v.literal('economic')
		),
		apiKey: v.string()
	},
	handler: async (ctx, { provider, apiKey }) => {
		const trimmed = apiKey.trim();
		if (!trimmed) throw new ConvexError('Clé API requise');

		const user = await authComponent.getAuthUser(ctx as any);
		if (!user) throw new ConvexError('Non authentifié');

		const orgData = await ctx.runQuery(internal.integrations.accounting.getUserOrgForAction, {
			userId: user._id
		});
		if (!orgData) throw new ConvexError('Aucune organisation sélectionnée');
		if (!orgData.isAdmin) throw new ConvexError('Accès réservé aux administrateurs');

		const encryptionKey = process.env.ACCOUNTING_ENCRYPTION_KEY;
		if (!encryptionKey)
			throw new ConvexError('ACCOUNTING_ENCRYPTION_KEY non configuré dans Convex dashboard');

		const encryptedApiKey = await encryptToken(trimmed, encryptionKey);

		await ctx.runMutation(internal.integrations.accounting.connectWithApiKeyInternal, {
			provider,
			organizationId: orgData.organizationId,
			encryptedApiKey,
			connectedBy: user._id
		});
	}
});

// ─── OAuth state management ───────────────────────────────────────────────────

export const lookupOAuthState = internalQuery({
	args: { state: v.string() },
	handler: async (ctx, { state }) =>
		ctx.db
			.query('oauthStates')
			.withIndex('by_state', (q) => q.eq('state', state))
			.first()
});

export const consumeOAuthState = internalMutation({
	args: { stateId: v.id('oauthStates') },
	handler: async (ctx, { stateId }) => ctx.db.delete(stateId)
});

// Called from the frontend — stores CSRF state + returns the provider OAuth URL
export const createOAuthStart = authedMutation({
	args: {
		provider: v.union(
			v.literal('xero'),
			v.literal('quickbooks'),
			v.literal('freeagent'),
			v.literal('fortnox'),
			v.literal('visma')
		)
	},
	handler: async (ctx, { provider }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const convexSiteUrl = process.env.CONVEX_SITE_URL;
		if (!convexSiteUrl)
			throw new ConvexError('CONVEX_SITE_URL non configuré dans Convex dashboard');

		const state = crypto.randomUUID();
		await ctx.db.insert('oauthStates', {
			state,
			provider,
			organizationId,
			userId: user._id,
			createdAt: Date.now()
		});

		const redirectUri = `${convexSiteUrl}/${provider}/callback`;

		if (provider === 'xero') {
			const clientId = process.env.XERO_CLIENT_ID;
			if (!clientId) throw new ConvexError('XERO_CLIENT_ID manquant dans Convex dashboard');
			return `https://login.xero.com/identity/connect/authorize?${new URLSearchParams({
				response_type: 'code',
				client_id: clientId,
				redirect_uri: redirectUri,
				scope: 'accounting.transactions accounting.settings accounting.contacts offline_access',
				state
			})}`;
		}
		if (provider === 'quickbooks') {
			const clientId = process.env.QB_CLIENT_ID;
			if (!clientId) throw new ConvexError('QB_CLIENT_ID manquant dans Convex dashboard');
			return `https://appcenter.intuit.com/connect/oauth2?${new URLSearchParams({
				client_id: clientId,
				scope: 'com.intuit.quickbooks.accounting',
				redirect_uri: redirectUri,
				response_type: 'code',
				state
			})}`;
		}
		if (provider === 'freeagent') {
			const clientId = process.env.FA_CLIENT_ID;
			if (!clientId) throw new ConvexError('FA_CLIENT_ID manquant dans Convex dashboard');
			return `https://api.freeagent.com/v2/approve_app?${new URLSearchParams({
				response_type: 'code',
				client_id: clientId,
				redirect_uri: redirectUri,
				state
			})}`;
		}
		if (provider === 'fortnox') {
			const clientId = process.env.FX_CLIENT_ID;
			if (!clientId) throw new ConvexError('FX_CLIENT_ID manquant dans Convex dashboard');
			return `https://apps.fortnox.se/oauth-v1/auth?${new URLSearchParams({
				client_id: clientId,
				redirect_uri: redirectUri,
				scope: 'supplierinvoice',
				response_type: 'code',
				state,
				access_type: 'offline'
			})}`;
		}
		// visma
		const clientId = process.env.VISMA_CLIENT_ID;
		if (!clientId) throw new ConvexError('VISMA_CLIENT_ID manquant dans Convex dashboard');
		return `https://identity.vismaonline.com/connect/authorize?${new URLSearchParams({
			client_id: clientId,
			redirect_uri: redirectUri,
			scope: 'ea:purchase ea:accounting offline_access',
			response_type: 'code',
			state
		})}`;
	}
});

// Internal version of connectWithOAuth — called by httpAction callbacks (no auth context)
export const connectWithOAuthInternal = internalMutation({
	args: {
		provider: v.union(
			v.literal('xero'),
			v.literal('quickbooks'),
			v.literal('freeagent'),
			v.literal('fortnox'),
			v.literal('visma')
		),
		organizationId: v.id('organizations'),
		encryptedAccessToken: v.string(),
		encryptedRefreshToken: v.string(),
		tokenExpiresAt: v.number(),
		externalCompanyId: v.string(),
		externalCompanyName: v.optional(v.string()),
		connectedByUserId: v.string()
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('accountingIntegrations')
			.withIndex('by_org_and_provider', (q) =>
				q.eq('organizationId', args.organizationId).eq('provider', args.provider)
			)
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				encryptedAccessToken: args.encryptedAccessToken,
				encryptedRefreshToken: args.encryptedRefreshToken,
				tokenExpiresAt: args.tokenExpiresAt,
				externalCompanyId: args.externalCompanyId,
				status: 'CONNECTED',
				lastSyncError: undefined
			});
			await ctx.scheduler.runAfter(0, internal.integrations.accounting.seedDefaultMappings, {
				integrationId: existing._id,
				organizationId: args.organizationId
			});
			return existing._id;
		}

		const integrationId = await ctx.db.insert('accountingIntegrations', {
			organizationId: args.organizationId,
			provider: args.provider,
			status: 'CONNECTED',
			encryptedAccessToken: args.encryptedAccessToken,
			encryptedRefreshToken: args.encryptedRefreshToken,
			tokenExpiresAt: args.tokenExpiresAt,
			externalCompanyId: args.externalCompanyId,
			syncCosts: true,
			syncVehicles: false,
			syncExpenses: true,
			connectedBy: args.connectedByUserId,
			connectedAt: Date.now()
		});
		await ctx.scheduler.runAfter(0, internal.integrations.accounting.seedDefaultMappings, {
			integrationId,
			organizationId: args.organizationId
		});
		return integrationId;
	}
});

// ─── Internal queries ─────────────────────────────────────────────────────────

export const getIntegrationById = internalQuery({
	args: { integrationId: v.id('accountingIntegrations') },
	handler: async (ctx, { integrationId }) => ctx.db.get(integrationId)
});

export const listMappingsForIntegration = internalQuery({
	args: { integrationId: v.id('accountingIntegrations') },
	handler: async (ctx, { integrationId }) =>
		ctx.db
			.query('accountingCategoryMappings')
			.withIndex('by_integration', (q) => q.eq('integrationId', integrationId))
			.collect()
});

export const patchMappingLabel = internalMutation({
	args: { mappingId: v.id('accountingCategoryMappings'), label: v.string() },
	handler: async (ctx, { mappingId, label }) =>
		ctx.db.patch(mappingId, { externalAccountLabel: label })
});

export const getIntegrationForOrg = internalQuery({
	args: { organizationId: v.id('organizations'), provider: v.optional(v.string()) },
	handler: async (ctx, { organizationId, provider }) => {
		const query = ctx.db
			.query('accountingIntegrations')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId));
		const integrations = await query.collect();
		const active = integrations.filter((i) => i.status === 'CONNECTED');
		if (provider) return active.find((i) => i.provider === provider) ?? null;
		return active[0] ?? null;
	}
});

export const listAllConnectedIntegrations = internalQuery({
	args: {},
	handler: async (ctx) => {
		return ctx.db
			.query('accountingIntegrations')
			.filter((q) => q.eq(q.field('status'), 'CONNECTED'))
			.collect();
	}
});

export const getSyncLogForEntity = internalQuery({
	args: {
		integrationId: v.id('accountingIntegrations'),
		entityType: v.union(v.literal('COST'), v.literal('EXPENSE')),
		entityId: v.string()
	},
	handler: async (ctx, args) => {
		return ctx.db
			.query('accountingSyncLogs')
			.withIndex('by_entity', (q) =>
				q.eq('entityType', args.entityType).eq('entityId', args.entityId)
			)
			.filter((q) => q.eq(q.field('integrationId'), args.integrationId))
			.first();
	}
});

export const listFailedLogs = internalQuery({
	args: {},
	handler: async (ctx) => {
		const integrations = await ctx.db
			.query('accountingIntegrations')
			.filter((q) => q.eq(q.field('status'), 'CONNECTED'))
			.collect();

		const logs = [];
		for (const integ of integrations) {
			const failed = await ctx.db
				.query('accountingSyncLogs')
				.withIndex('by_status', (q) => q.eq('integrationId', integ._id).eq('status', 'FAILED'))
				.filter((q) => q.lt(q.field('attempts'), 5))
				.collect();
			logs.push(...failed);
		}
		return logs;
	}
});

export const getCostForSync = internalQuery({
	args: { costId: v.id('costs'), integrationId: v.id('accountingIntegrations') },
	handler: async (ctx, { costId, integrationId }) => {
		const cost = await ctx.db.get(costId);
		if (!cost) return null;

		const vehicle = cost.vehicleId ? await ctx.db.get(cost.vehicleId) : null;
		const mapping = await ctx.db
			.query('accountingCategoryMappings')
			.withIndex('by_integration_and_category', (q) =>
				q.eq('integrationId', integrationId).eq('myceliumCategory', cost.category)
			)
			.first();

		const existingLog = await ctx.db
			.query('accountingSyncLogs')
			.withIndex('by_entity', (q) => q.eq('entityType', 'COST').eq('entityId', costId))
			.filter((q) => q.eq(q.field('integrationId'), integrationId))
			.first();

		return { cost, vehicle, mapping, existingLog };
	}
});

export const getExpenseForSync = internalQuery({
	args: { expenseId: v.id('mileageExpenses'), integrationId: v.id('accountingIntegrations') },
	handler: async (ctx, { expenseId, integrationId }) => {
		const expense = await ctx.db.get(expenseId);
		if (!expense) return null;

		const mapping = await ctx.db
			.query('accountingCategoryMappings')
			.withIndex('by_integration_and_category', (q) =>
				q.eq('integrationId', integrationId).eq('myceliumCategory', 'IK')
			)
			.first();

		const existingLog = await ctx.db
			.query('accountingSyncLogs')
			.withIndex('by_entity', (q) => q.eq('entityType', 'EXPENSE').eq('entityId', expenseId))
			.filter((q) => q.eq(q.field('integrationId'), integrationId))
			.first();

		return { expense, mapping, existingLog };
	}
});

// ─── Internal mutations ───────────────────────────────────────────────────────

export const upsertSyncLog = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		integrationId: v.id('accountingIntegrations'),
		entityType: v.union(v.literal('COST'), v.literal('EXPENSE')),
		entityId: v.string(),
		attempts: v.number(),
		existingLogId: v.optional(v.id('accountingSyncLogs'))
	},
	handler: async (ctx, args) => {
		if (args.existingLogId) {
			await ctx.db.patch(args.existingLogId, {
				status: 'PENDING',
				attempts: args.attempts,
				error: undefined
			});
			return args.existingLogId;
		}
		return ctx.db.insert('accountingSyncLogs', {
			organizationId: args.organizationId,
			integrationId: args.integrationId,
			entityType: args.entityType,
			entityId: args.entityId,
			direction: 'PUSH',
			status: 'PENDING',
			attempts: args.attempts,
			createdAt: Date.now()
		});
	}
});

export const markSyncSuccess = internalMutation({
	args: { logId: v.id('accountingSyncLogs'), externalId: v.string() },
	handler: async (ctx, { logId, externalId }) => {
		await ctx.db.patch(logId, {
			status: 'SUCCESS',
			externalId,
			syncedAt: Date.now(),
			error: undefined
		});
	}
});

export const markSyncFailed = internalMutation({
	args: { logId: v.id('accountingSyncLogs'), error: v.string() },
	handler: async (ctx, { logId, error }) => {
		const log = await ctx.db.get(logId);
		if (!log) return;
		await ctx.db.patch(logId, { status: 'FAILED', error });
	}
});

export const updateTokensAfterRefresh = internalMutation({
	args: {
		integrationId: v.id('accountingIntegrations'),
		encryptedAccessToken: v.string(),
		encryptedRefreshToken: v.optional(v.string()),
		tokenExpiresAt: v.number()
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.integrationId, {
			encryptedAccessToken: args.encryptedAccessToken,
			...(args.encryptedRefreshToken ? { encryptedRefreshToken: args.encryptedRefreshToken } : {}),
			tokenExpiresAt: args.tokenExpiresAt
		});
	}
});

export const setIntegrationStatus = internalMutation({
	args: {
		integrationId: v.id('accountingIntegrations'),
		status: v.union(v.literal('CONNECTED'), v.literal('DISCONNECTED'), v.literal('ERROR')),
		error: v.optional(v.string())
	},
	handler: async (ctx, { integrationId, status, error }) => {
		await ctx.db.patch(integrationId, {
			status,
			lastSyncError: error,
			lastSyncAt: status === 'ERROR' ? undefined : Date.now()
		});
	}
});

export const seedDefaultMappings = internalMutation({
	args: {
		integrationId: v.id('accountingIntegrations'),
		organizationId: v.id('organizations')
	},
	handler: async (ctx, { integrationId, organizationId }) => {
		const integration = await ctx.db.get(integrationId);
		if (!integration) return;

		const mappingTable =
			integration.provider === 'xero'
				? XERO_DEFAULT_MAPPING
				: integration.provider === 'quickbooks'
					? QB_DEFAULT_MAPPING
					: integration.provider === 'freeagent'
						? FREEAGENT_DEFAULT_MAPPING
						: integration.provider === 'fortnox'
							? FORTNOX_DEFAULT_MAPPING
							: integration.provider === 'visma'
								? VISMA_DEFAULT_MAPPING
								: integration.provider === 'tripletex'
									? TRIPLETEX_DEFAULT_MAPPING
									: integration.provider === 'economic'
										? ECONOMIC_DEFAULT_MAPPING
										: DEFAULT_PCG_MAPPING;

		for (const [category, defaults] of Object.entries(mappingTable)) {
			const existing = await ctx.db
				.query('accountingCategoryMappings')
				.withIndex('by_integration_and_category', (q) =>
					q.eq('integrationId', integrationId).eq('myceliumCategory', category)
				)
				.first();
			if (!existing) {
				await ctx.db.insert('accountingCategoryMappings', {
					organizationId,
					integrationId,
					myceliumCategory: category,
					externalAccountCode: defaults.code,
					externalAccountLabel: defaults.label,
					analyticAxis: 'Fleet',
					vatRate:
						category === 'CARBURANT' &&
						integration.provider !== 'xero' &&
						integration.provider !== 'quickbooks'
							? 20
							: undefined
				});
			}
		}
	}
});

// ─── Public queries ───────────────────────────────────────────────────────────

export const getMyAccountingIntegrations = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		return ctx.db
			.query('accountingIntegrations')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
	}
});

export const getCategoryMappings = authedQuery({
	args: { integrationId: v.id('accountingIntegrations') },
	handler: async (ctx, { integrationId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const integration = await ctx.db.get(integrationId);
		if (!integration || integration.organizationId !== organizationId) {
			throw new ConvexError('Intégration introuvable');
		}
		return ctx.db
			.query('accountingCategoryMappings')
			.withIndex('by_integration', (q) => q.eq('integrationId', integrationId))
			.collect();
	}
});

export const getRecentSyncLogs = authedQuery({
	args: { integrationId: v.id('accountingIntegrations'), limit: v.optional(v.number()) },
	handler: async (ctx, { integrationId, limit }) => {
		const { organizationId } = await getUserOrg(ctx);
		const integration = await ctx.db.get(integrationId);
		if (!integration || integration.organizationId !== organizationId) {
			throw new ConvexError('Intégration introuvable');
		}
		const logs = await ctx.db
			.query('accountingSyncLogs')
			.withIndex('by_integration', (q) => q.eq('integrationId', integrationId))
			.order('desc')
			.take(limit ?? 20);
		return logs;
	}
});

// ─── Public mutations ─────────────────────────────────────────────────────────

export const connectWithOAuth = authedMutation({
	args: {
		provider: v.union(v.literal('xero'), v.literal('quickbooks')),
		encryptedAccessToken: v.string(),
		encryptedRefreshToken: v.string(),
		tokenExpiresAt: v.number(),
		externalCompanyId: v.string(),
		externalCompanyName: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const existing = await ctx.db
			.query('accountingIntegrations')
			.withIndex('by_org_and_provider', (q) =>
				q.eq('organizationId', organizationId).eq('provider', args.provider)
			)
			.first();

		const now = Date.now();

		if (existing) {
			await ctx.db.patch(existing._id, {
				encryptedAccessToken: args.encryptedAccessToken,
				encryptedRefreshToken: args.encryptedRefreshToken,
				tokenExpiresAt: args.tokenExpiresAt,
				externalCompanyId: args.externalCompanyId,
				status: 'CONNECTED',
				lastSyncError: undefined
			});
			await ctx.scheduler.runAfter(0, internal.integrations.accounting.seedDefaultMappings, {
				integrationId: existing._id,
				organizationId
			});
			return existing._id;
		}

		const integrationId = await ctx.db.insert('accountingIntegrations', {
			organizationId,
			provider: args.provider,
			status: 'CONNECTED',
			encryptedAccessToken: args.encryptedAccessToken,
			encryptedRefreshToken: args.encryptedRefreshToken,
			tokenExpiresAt: args.tokenExpiresAt,
			externalCompanyId: args.externalCompanyId,
			syncCosts: true,
			syncVehicles: false,
			syncExpenses: true,
			connectedBy: user._id,
			connectedAt: now
		});
		await ctx.scheduler.runAfter(0, internal.integrations.accounting.seedDefaultMappings, {
			integrationId,
			organizationId
		});
		return integrationId;
	}
});

export const connectWithApiKey = authedMutation({
	args: {
		provider: v.union(v.literal('pennylane'), v.literal('sage'), v.literal('ebp')),
		encryptedApiKey: v.string()
	},
	handler: async (ctx, { provider, encryptedApiKey }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const existing = await ctx.db
			.query('accountingIntegrations')
			.withIndex('by_org_and_provider', (q) =>
				q.eq('organizationId', organizationId).eq('provider', provider)
			)
			.first();

		const now = Date.now();

		if (existing) {
			await ctx.db.patch(existing._id, {
				encryptedAccessToken: encryptedApiKey,
				status: 'CONNECTED',
				lastSyncError: undefined
			});
			await ctx.scheduler.runAfter(0, internal.integrations.accounting.seedDefaultMappings, {
				integrationId: existing._id,
				organizationId
			});
			return existing._id;
		}

		const integrationId = await ctx.db.insert('accountingIntegrations', {
			organizationId,
			provider,
			status: 'CONNECTED',
			encryptedAccessToken: encryptedApiKey,
			syncCosts: true,
			syncVehicles: false,
			syncExpenses: true,
			connectedBy: user._id,
			connectedAt: now
		});
		await ctx.scheduler.runAfter(0, internal.integrations.accounting.seedDefaultMappings, {
			integrationId,
			organizationId
		});
		return integrationId;
	}
});

export const disconnectIntegration = authedMutation({
	args: { integrationId: v.id('accountingIntegrations') },
	handler: async (ctx, { integrationId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const integration = await ctx.db.get(integrationId);
		if (!integration || integration.organizationId !== organizationId) {
			throw new ConvexError('Intégration introuvable');
		}
		await ctx.db.patch(integrationId, { status: 'DISCONNECTED' });
	}
});

export const updateCategoryMapping = authedMutation({
	args: {
		mappingId: v.id('accountingCategoryMappings'),
		externalAccountCode: v.string(),
		externalAccountLabel: v.optional(v.string()),
		analyticAxis: v.optional(v.string()),
		vatRate: v.optional(v.number())
	},
	handler: async (ctx, { mappingId, ...fields }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const mapping = await ctx.db.get(mappingId);
		if (!mapping || mapping.organizationId !== organizationId) {
			throw new ConvexError('Mapping introuvable');
		}
		await ctx.db.patch(mappingId, fields);
	}
});

export const updateIntegrationFlags = authedMutation({
	args: {
		integrationId: v.id('accountingIntegrations'),
		syncCosts: v.optional(v.boolean()),
		syncExpenses: v.optional(v.boolean())
	},
	handler: async (ctx, { integrationId, ...flags }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const integration = await ctx.db.get(integrationId);
		if (!integration || integration.organizationId !== organizationId) {
			throw new ConvexError('Intégration introuvable');
		}
		const patch: Partial<{ syncCosts: boolean; syncExpenses: boolean }> = {};
		if (flags.syncCosts !== undefined) patch.syncCosts = flags.syncCosts;
		if (flags.syncExpenses !== undefined) patch.syncExpenses = flags.syncExpenses;
		await ctx.db.patch(integrationId, patch);
	}
});

export const triggerManualSync = authedMutation({
	args: { integrationId: v.id('accountingIntegrations') },
	handler: async (ctx, { integrationId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const integration = await ctx.db.get(integrationId);
		if (
			!integration ||
			integration.organizationId !== organizationId ||
			integration.status !== 'CONNECTED'
		) {
			throw new ConvexError('Intégration non disponible');
		}
		await ctx.scheduler.runAfter(0, internal.integrations.accounting.processRetryQueue, {});
	}
});

// ─── Internal actions ─────────────────────────────────────────────────────────

// Returns decrypted access token, refreshing first if expired (Xero/QB OAuth providers)
async function getDecryptedToken(
	ctx: ActionCtx,
	integration: {
		_id: Id<'accountingIntegrations'>;
		provider: string;
		encryptedAccessToken: string;
		encryptedRefreshToken?: string;
		tokenExpiresAt?: number;
	}
): Promise<string | null> {
	const key = requireEncryptionKey();

	// Refresh 5 min before expiry for OAuth providers
	const needsRefresh =
		integration.encryptedRefreshToken &&
		integration.tokenExpiresAt &&
		integration.tokenExpiresAt < Date.now() + 5 * 60 * 1000;

	if (needsRefresh) {
		try {
			const refreshToken = await decryptToken(integration.encryptedRefreshToken!, key);
			let newTokens: { access_token: string; refresh_token?: string; expires_in: number } | null =
				null;

			if (integration.provider === 'xero') {
				const clientId = process.env.XERO_CLIENT_ID;
				const clientSecret = process.env.XERO_CLIENT_SECRET;
				if (clientId && clientSecret) {
					const res = await xeroRefreshToken(refreshToken, clientId, clientSecret);
					newTokens = {
						access_token: res.access_token,
						refresh_token: res.refresh_token,
						expires_in: res.expires_in
					};
				}
			} else if (integration.provider === 'quickbooks') {
				const clientId = process.env.QB_CLIENT_ID;
				const clientSecret = process.env.QB_CLIENT_SECRET;
				if (clientId && clientSecret) {
					const res = await qbRefreshToken(refreshToken, clientId, clientSecret);
					newTokens = {
						access_token: res.access_token,
						refresh_token: res.refresh_token,
						expires_in: res.expires_in
					};
				}
			} else if (integration.provider === 'freeagent') {
				const clientId = process.env.FA_CLIENT_ID;
				const clientSecret = process.env.FA_CLIENT_SECRET;
				if (clientId && clientSecret) {
					const res = await faRefreshToken(refreshToken, clientId, clientSecret);
					newTokens = {
						access_token: res.access_token,
						refresh_token: res.refresh_token,
						expires_in: res.expires_in
					};
				}
			} else if (integration.provider === 'fortnox') {
				const clientId = process.env.FX_CLIENT_ID;
				const clientSecret = process.env.FX_CLIENT_SECRET;
				if (clientId && clientSecret) {
					const res = await fxRefreshToken(refreshToken, clientId, clientSecret);
					newTokens = {
						access_token: res.access_token,
						refresh_token: res.refresh_token,
						expires_in: res.expires_in
					};
				}
			} else if (integration.provider === 'visma') {
				const clientId = process.env.VISMA_CLIENT_ID;
				const clientSecret = process.env.VISMA_CLIENT_SECRET;
				if (clientId && clientSecret) {
					const res = await vismaRefreshToken(refreshToken, clientId, clientSecret);
					newTokens = {
						access_token: res.access_token,
						refresh_token: res.refresh_token,
						expires_in: res.expires_in
					};
				}
			}

			if (newTokens) {
				const encryptedAccessToken = await encryptToken(newTokens.access_token, key);
				const encryptedRefreshToken = newTokens.refresh_token
					? await encryptToken(newTokens.refresh_token, key)
					: undefined;
				await ctx.runMutation(internal.integrations.accounting.updateTokensAfterRefresh, {
					integrationId: integration._id,
					encryptedAccessToken,
					encryptedRefreshToken,
					tokenExpiresAt: Date.now() + newTokens.expires_in * 1000
				});
				return newTokens.access_token;
			}
		} catch (err) {
			console.error('[accounting] Token refresh failed:', err);
			await ctx.runMutation(internal.integrations.accounting.setIntegrationStatus, {
				integrationId: integration._id,
				status: 'ERROR',
				error: 'Token refresh failed'
			});
			return null;
		}
	}

	try {
		return await decryptToken(integration.encryptedAccessToken, key);
	} catch {
		await ctx.runMutation(internal.integrations.accounting.setIntegrationStatus, {
			integrationId: integration._id,
			status: 'ERROR',
			error: 'Token decrypt failed'
		});
		return null;
	}
}

// Fetch chart of accounts from Xero or QuickBooks for the mapping UI
export const getChartOfAccounts = authedMutation({
	args: { integrationId: v.id('accountingIntegrations') },
	handler: async (ctx, { integrationId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const integration = await ctx.db.get(integrationId);
		if (!integration || integration.organizationId !== organizationId) {
			throw new ConvexError('Intégration introuvable');
		}

		// Schedule the actual fetch as an action (mutations can't do fetch)
		await ctx.scheduler.runAfter(0, internal.integrations.accounting.fetchAndCacheChartOfAccounts, {
			integrationId,
			organizationId
		});
	}
});

export const fetchAndCacheChartOfAccounts = internalAction({
	args: {
		integrationId: v.id('accountingIntegrations'),
		organizationId: v.id('organizations')
	},
	handler: async (ctx, { integrationId }) => {
		const integration = await ctx.runQuery(internal.integrations.accounting.getIntegrationById, {
			integrationId
		});
		if (!integration) return;

		const token = await getDecryptedToken(ctx, integration);
		if (!token) return;

		const tenantId = integration.externalCompanyId ?? '';
		let accounts: Array<{ code: string; name: string }> = [];

		if (integration.provider === 'xero') {
			const xeroAccounts = await xeroGetChartOfAccounts(token, tenantId);
			accounts = xeroAccounts.map((a) => ({ code: a.Code, name: a.Name }));
		} else if (integration.provider === 'quickbooks') {
			const qbAccounts = await qbGetChartOfAccounts(token, tenantId);
			accounts = qbAccounts.map((a) => ({ code: a.Name, name: a.Name }));
		}

		// Update mapping labels to match live account names
		if (accounts.length) {
			const mappings = await ctx.runQuery(
				internal.integrations.accounting.listMappingsForIntegration,
				{ integrationId }
			);
			for (const mapping of mappings) {
				const match = accounts.find((a) => a.code === mapping.externalAccountCode);
				if (match && match.name !== mapping.externalAccountLabel) {
					await ctx.runMutation(internal.integrations.accounting.patchMappingLabel, {
						mappingId: mapping._id,
						label: match.name
					});
				}
			}
		}
	}
});

export const pushEntityToAccounting = internalAction({
	args: {
		entityType: v.union(v.literal('COST'), v.literal('EXPENSE')),
		entityId: v.string(),
		organizationId: v.id('organizations')
	},
	handler: async (ctx, { entityType, entityId, organizationId }) => {
		const integration = await ctx.runQuery(internal.integrations.accounting.getIntegrationForOrg, {
			organizationId
		});
		if (!integration) return;
		if (entityType === 'COST' && !integration.syncCosts) return;
		if (entityType === 'EXPENSE' && !integration.syncExpenses) return;

		const token = await getDecryptedToken(ctx, integration);
		if (!token) return;

		if (entityType === 'COST') {
			const data = await ctx.runQuery(internal.integrations.accounting.getCostForSync, {
				costId: entityId as Id<'costs'>,
				integrationId: integration._id
			});
			if (!data) return;
			const { cost, vehicle, mapping, existingLog } = data;

			const attempts = (existingLog?.attempts ?? 0) + 1;
			const logId = await ctx.runMutation(internal.integrations.accounting.upsertSyncLog, {
				organizationId,
				integrationId: integration._id,
				entityType: 'COST',
				entityId,
				attempts,
				existingLogId: existingLog?._id
			});

			const categoryMapping: CategoryMapping = {
				externalAccountCode:
					mapping?.externalAccountCode ?? DEFAULT_PCG_MAPPING[cost.category]?.code ?? '6068',
				analyticAxis: mapping?.analyticAxis ?? 'Flotte',
				vatRate: mapping?.vatRate
			};
			const payload: CostPushPayload = {
				myceliumId: entityId,
				category: cost.category,
				amountTtc: cost.amount,
				vatAmount: cost.vatAmount,
				date: cost.date,
				label: `${cost.category} — ${cost.description}${vehicle ? ` [${vehicle.registration}]` : ''}`,
				vehicleRegistration: vehicle?.registration,
				externalId: existingLog?.externalId
			};

			const connector = connectors[integration.provider];
			if (!connector) return;

			try {
				const result = await connector.pushCost(
					token,
					categoryMapping,
					payload,
					integration.externalCompanyId
				);
				await ctx.runMutation(internal.integrations.accounting.markSyncSuccess, {
					logId,
					externalId: result.externalId
				});
			} catch (err) {
				await ctx.runMutation(internal.integrations.accounting.markSyncFailed, {
					logId,
					error: String(err)
				});
			}
		} else {
			// EXPENSE (IK)
			const data = await ctx.runQuery(internal.integrations.accounting.getExpenseForSync, {
				expenseId: entityId as Id<'mileageExpenses'>,
				integrationId: integration._id
			});
			if (!data) return;
			const { expense, mapping, existingLog } = data;

			const attempts = (existingLog?.attempts ?? 0) + 1;
			const logId = await ctx.runMutation(internal.integrations.accounting.upsertSyncLog, {
				organizationId,
				integrationId: integration._id,
				entityType: 'EXPENSE',
				entityId,
				attempts,
				existingLogId: existingLog?._id
			});

			const categoryMapping: CategoryMapping = {
				externalAccountCode:
					mapping?.externalAccountCode ?? DEFAULT_PCG_MAPPING['IK']?.code ?? '6251',
				analyticAxis: mapping?.analyticAxis ?? 'Fleet',
				vatRate: undefined
			};
			const payload: CostPushPayload = {
				myceliumId: entityId,
				category: 'IK',
				amountTtc: expense.calculatedAmount,
				date: new Date(expense.date).getTime(),
				label: `Mileage — ${expense.purpose} (${expense.distance} ${expense.distanceUnit})`,
				externalId: existingLog?.externalId
			};

			const connector = connectors[integration.provider];
			if (!connector) return;

			try {
				const result = await connector.pushCost(
					token,
					categoryMapping,
					payload,
					integration.externalCompanyId
				);
				await ctx.runMutation(internal.integrations.accounting.markSyncSuccess, {
					logId,
					externalId: result.externalId
				});
			} catch (err) {
				await ctx.runMutation(internal.integrations.accounting.markSyncFailed, {
					logId,
					error: String(err)
				});
			}
		}
	}
});

export const processRetryQueue = internalAction({
	args: {},
	handler: async (ctx) => {
		const failedLogs = await ctx.runQuery(internal.integrations.accounting.listFailedLogs, {});
		for (const log of failedLogs) {
			await ctx.scheduler.runAfter(0, internal.integrations.accounting.pushEntityToAccounting, {
				entityType: log.entityType,
				entityId: log.entityId,
				organizationId: log.organizationId
			});
		}
	}
});

// ─── Payment status pull ──────────────────────────────────────────────────────

export const listSyncedCostIds = internalQuery({
	args: { integrationId: v.id('accountingIntegrations') },
	handler: async (ctx, { integrationId }) => {
		const logs = await ctx.db
			.query('accountingSyncLogs')
			.withIndex('by_integration', (q) => q.eq('integrationId', integrationId))
			.filter((q) =>
				q.and(
					q.eq(q.field('entityType'), 'COST'),
					q.eq(q.field('status'), 'SUCCESS'),
					q.neq(q.field('externalId'), undefined)
				)
			)
			.collect();
		return logs.map((l) => ({ costId: l.entityId, externalId: l.externalId! }));
	}
});

export const updateCostPaymentStatus = internalMutation({
	args: {
		costId: v.string(),
		isPaid: v.boolean(),
		paidAt: v.optional(v.number())
	},
	handler: async (ctx, { costId, isPaid, paidAt }) => {
		const cost = await ctx.db.get(costId as Id<'costs'>);
		if (!cost) return;
		await ctx.db.patch(cost._id, {
			paidInAccounting: isPaid,
			...(isPaid && paidAt ? { paidInAccountingAt: paidAt } : {})
		});
	}
});

export const pullPaymentStatuses = internalAction({
	args: {},
	handler: async (ctx) => {
		const connected = await ctx.runQuery(
			internal.integrations.accounting.listAllConnectedIntegrations,
			{}
		);

		for (const integration of connected) {
			const connector = connectors[integration.provider];
			if (!connector) continue;

			const token = await getDecryptedToken(ctx, integration);
			if (!token) continue;

			const pairs = await ctx.runQuery(internal.integrations.accounting.listSyncedCostIds, {
				integrationId: integration._id
			});
			if (!pairs.length) continue;

			// Batch into groups of 20 to respect rate limits
			for (let i = 0; i < pairs.length; i += 20) {
				const batch = pairs.slice(i, i + 20);
				try {
					const statuses = await connector.pullPaymentStatuses(
						token,
						batch,
						integration.externalCompanyId
					);
					for (const s of statuses) {
						const pair = batch.find((p) => p.externalId === s.externalId);
						if (!pair) continue;
						await ctx.runMutation(internal.integrations.accounting.updateCostPaymentStatus, {
							costId: pair.costId,
							isPaid: s.isPaid,
							paidAt: s.paidAt
						});
					}
				} catch {
					// Partial failure — continue with next batch
				}
			}
		}
	}
});
