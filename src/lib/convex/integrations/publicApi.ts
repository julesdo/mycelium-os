import { v } from 'convex/values';
import { httpAction, internalQuery, internalMutation } from '../_generated/server';
import { internal as _internal } from '../_generated/api';
import { encryptToken, requireEncryptionKey } from '../lib/crypto';
import { apiV1RateLimiter } from './apiRateLimit';
import type { Id } from '../_generated/dataModel';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internal = _internal as any;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function hashKey(key: string): Promise<string> {
	const data = new TextEncoder().encode(key);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

type ActionCtx = Parameters<Parameters<typeof httpAction>[0]>[0];

async function verifyRequest(
	ctx: ActionCtx,
	request: Request,
	requiredScope: string
): Promise<{ organizationId: Id<'organizations'>; keyId: Id<'apiKeys'> } | Response> {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader?.startsWith('Bearer ')) {
		return apiJson({ error: 'Authorization header requis' }, 401);
	}
	const rawKey = authHeader.slice(7).trim();
	if (!rawKey.startsWith('myc_live_')) {
		return apiJson({ error: 'Format de clé invalide' }, 401);
	}
	const prefix = rawKey.slice(0, 16);
	const hashedKey = await hashKey(rawKey);

	const { ok: withinLimit } = await apiV1RateLimiter.limit(ctx, 'apiV1Request', { key: prefix });
	if (!withinLimit) {
		return apiJson({ error: 'Rate limit dépassé — 100 req/min par clé' }, 429);
	}

	const result = await ctx.runQuery(internal.integrations.apiKeys.verifyApiKeyAndGetOrg, {
		prefix,
		hashedKey
	});
	if (!result) return apiJson({ error: 'Clé API invalide ou révoquée' }, 401);
	if (!result.scopes.includes(requiredScope)) {
		return apiJson({ error: `Scope requis : ${requiredScope}` }, 403);
	}
	ctx.scheduler.runAfter(0, internal.integrations.apiKeys.markApiKeyUsed, { keyId: result.keyId });
	return { organizationId: result.organizationId, keyId: result.keyId };
}

function apiJson(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json', 'X-Mycelium-API-Version': '1.0' }
	});
}

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type'
};

// ─── GET /api/v1/costs ────────────────────────────────────────────────────────

export const listCostsHandler = httpAction(async (ctx, request) => {
	if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: new Headers(CORS_HEADERS) });
	const auth = await verifyRequest(ctx, request, 'costs:read');
	if (auth instanceof Response) return auth;
	const url = new URL(request.url);
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200);
	const category = url.searchParams.get('category') ?? undefined;
	const costs = await ctx.runQuery(internal.integrations.publicApi.queryCosts, {
		organizationId: auth.organizationId,
		limit,
		category
	});
	return apiJson({ data: costs, count: costs.length });
});

// ─── POST /api/v1/costs ───────────────────────────────────────────────────────

export const createCostHandler = httpAction(async (ctx, request) => {
	if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: new Headers(CORS_HEADERS) });
	const auth = await verifyRequest(ctx, request, 'costs:write');
	if (auth instanceof Response) return auth;
	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return apiJson({ error: 'Corps JSON invalide' }, 400);
	}
	if (!body.amount || !body.category || !body.description || !body.date) {
		return apiJson({ error: 'Champs requis : amount, category, description, date' }, 400);
	}
	const costId = await ctx.runMutation(internal.integrations.publicApi.insertCostFromApi, {
		organizationId: auth.organizationId,
		amount: Number(body.amount),
		category: String(body.category),
		description: String(body.description),
		date: typeof body.date === 'number' ? body.date : Date.parse(String(body.date)),
		vatAmount: body.vatAmount !== undefined ? Number(body.vatAmount) : undefined,
		vehicleRegistration: body.vehicleRegistration ? String(body.vehicleRegistration) : undefined
	});
	ctx.scheduler.runAfter(0, internal.integrations.apiKeys.emitWebhookEvent, {
		organizationId: auth.organizationId,
		event: 'cost.created',
		payload: { id: costId }
	});
	return apiJson({ id: costId }, 201);
});

// ─── GET /api/v1/vehicles ─────────────────────────────────────────────────────

export const listVehiclesHandler = httpAction(async (ctx, request) => {
	if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: new Headers(CORS_HEADERS) });
	const auth = await verifyRequest(ctx, request, 'vehicles:read');
	if (auth instanceof Response) return auth;
	const url = new URL(request.url);
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200);
	const status = url.searchParams.get('status') ?? undefined;
	const vehicles = await ctx.runQuery(internal.integrations.publicApi.queryVehicles, {
		organizationId: auth.organizationId,
		limit,
		status
	});
	return apiJson({ data: vehicles, count: vehicles.length });
});

// ─── GET /api/v1/expenses ─────────────────────────────────────────────────────

export const listExpensesHandler = httpAction(async (ctx, request) => {
	if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: new Headers(CORS_HEADERS) });
	const auth = await verifyRequest(ctx, request, 'expenses:read');
	if (auth instanceof Response) return auth;
	const url = new URL(request.url);
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200);
	const status = url.searchParams.get('status') ?? undefined;
	const expenses = await ctx.runQuery(internal.integrations.publicApi.queryExpenses, {
		organizationId: auth.organizationId,
		limit,
		status
	});
	return apiJson({ data: expenses, count: expenses.length });
});

// ─── GET /api/v1/webhooks ─────────────────────────────────────────────────────

export const listWebhooksHandler = httpAction(async (ctx, request) => {
	if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: new Headers(CORS_HEADERS) });
	const auth = await verifyRequest(ctx, request, 'costs:read');
	if (auth instanceof Response) return auth;
	const endpoints = await ctx.runQuery(internal.integrations.publicApi.queryWebhookEndpoints, {
		organizationId: auth.organizationId
	});
	return apiJson({ data: endpoints, count: endpoints.length });
});

// ─── POST /api/v1/webhooks ────────────────────────────────────────────────────

export const createWebhookHandler = httpAction(async (ctx, request) => {
	if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: new Headers(CORS_HEADERS) });
	const auth = await verifyRequest(ctx, request, 'costs:write');
	if (auth instanceof Response) return auth;
	let body: Record<string, unknown>;
	try {
		body = (await request.json()) as Record<string, unknown>;
	} catch {
		return apiJson({ error: 'Corps JSON invalide' }, 400);
	}
	if (!body.url || !Array.isArray(body.events)) {
		return apiJson({ error: 'Champs requis : url, events' }, 400);
	}
	if (!String(body.url).startsWith('https://')) {
		return apiJson({ error: 'HTTPS requis pour les webhooks' }, 400);
	}

	// Generate & encrypt secret in this action context (process.env available)
	const arr = new Uint8Array(32);
	crypto.getRandomValues(arr);
	const plaintextSecret = btoa(String.fromCharCode(...arr)).replace(/[+/=]/g, '');
	const encryptionKey = requireEncryptionKey();
	const encryptedSecret = await encryptToken(plaintextSecret, encryptionKey);

	const endpointId = await ctx.runMutation(internal.integrations.publicApi.insertWebhookFromApi, {
		organizationId: auth.organizationId,
		url: String(body.url),
		events: (body.events as unknown[]).filter((e): e is string => typeof e === 'string'),
		encryptedSecret
	});
	// Return plaintext secret ONCE so the caller can store it for HMAC verification
	return apiJson({ id: endpointId, secret: plaintextSecret }, 201);
});

// ─── Internal queries ─────────────────────────────────────────────────────────

export const queryCosts = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		limit: v.number(),
		category: v.optional(v.string())
	},
	handler: async (ctx, { organizationId, limit, category }) => {
		const all = await ctx.db
			.query('costs')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.take(limit * 3);
		const filtered = category ? all.filter((c) => c.category === category) : all;
		return filtered.slice(0, limit).map((c) => ({
			id: c._id,
			category: c.category,
			amount: c.amount,
			vatAmount: c.vatAmount,
			date: c.date,
			description: c.description,
			vehicleId: c.vehicleId,
			source: c.source,
			paidInAccounting: c.paidInAccounting,
			createdAt: c.createdAt
		}));
	}
});

export const queryVehicles = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		limit: v.number(),
		status: v.optional(v.string())
	},
	handler: async (ctx, { organizationId, limit, status }) => {
		const all = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		const filtered = status ? all.filter((v) => v.status === status) : all;
		return filtered.slice(0, limit).map((v) => ({
			id: v._id,
			registration: v.registration,
			brand: v.brand,
			model: v.model,
			year: v.year,
			category: v.category,
			energy: v.energy,
			status: v.status,
			location: v.location
		}));
	}
});

export const queryExpenses = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		limit: v.number(),
		status: v.optional(v.string())
	},
	handler: async (ctx, { organizationId, limit, status }) => {
		const all = await ctx.db
			.query('mileageExpenses')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.take(limit * 2);
		const filtered = status ? all.filter((e) => e.status === status) : all;
		return filtered.slice(0, limit).map((e) => ({
			id: e._id,
			date: e.date,
			distance: e.distance,
			distanceUnit: e.distanceUnit,
			vehicleCategory: e.vehicleCategory,
			purpose: e.purpose,
			calculatedAmount: e.calculatedAmount,
			status: e.status,
			userId: e.userId
		}));
	}
});

export const queryWebhookEndpoints = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const all = await ctx.db
			.query('webhookEndpoints')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		return all.map((e) => ({
			id: e._id,
			url: e.url,
			events: e.events,
			isActive: e.isActive,
			createdAt: e.createdAt,
			lastDeliveredAt: e.lastDeliveredAt
		}));
	}
});

// ─── Internal mutations ────────────────────────────────────────────────────────

const VALID_CATEGORIES = ['LEASING', 'CARBURANT', 'ENTRETIEN', 'ASSURANCE', 'TAXES', 'SINISTRE', 'PARKING', 'TELEPEAGE', 'AUTRE'] as const;
type CostCategory = typeof VALID_CATEGORIES[number];

export const insertCostFromApi = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		amount: v.number(),
		category: v.string(),
		description: v.string(),
		date: v.number(),
		vatAmount: v.optional(v.number()),
		vehicleRegistration: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		if (!VALID_CATEGORIES.includes(args.category as CostCategory)) {
			throw new Error(`Catégorie invalide: ${args.category}. Valeurs : ${VALID_CATEGORIES.join(', ')}`);
		}
		let vehicleId: Id<'vehicles'> | undefined;
		if (args.vehicleRegistration) {
			const found = await ctx.db
				.query('vehicles')
				.withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
				.filter((q) => q.eq(q.field('registration'), args.vehicleRegistration!))
				.first();
			vehicleId = found?._id;
		}
		return ctx.db.insert('costs', {
			organizationId: args.organizationId,
			vehicleId,
			category: args.category as CostCategory,
			amount: args.amount,
			vatAmount: args.vatAmount,
			date: args.date,
			description: args.description,
			source: 'API',
			createdBy: 'api',
			createdAt: Date.now()
		});
	}
});

export const insertWebhookFromApi = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		url: v.string(),
		events: v.array(v.string()),
		encryptedSecret: v.string()
	},
	handler: async (ctx, { organizationId, url, events, encryptedSecret }) => {
		const validEvents = ['cost.created', 'cost.updated', 'expense.approved', 'reservation.created', '*'];
		return ctx.db.insert('webhookEndpoints', {
			organizationId,
			url,
			secret: encryptedSecret,
			events: events.filter((e) => validEvents.includes(e)),
			isActive: true,
			createdAt: Date.now()
		});
	}
});
