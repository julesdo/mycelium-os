import { v, ConvexError } from 'convex/values';
import { internalAction, internalMutation, internalQuery, type ActionCtx } from '../_generated/server';
import { internal as _internal } from '../_generated/api';
import { authedQuery, authedMutation } from '../functions';
import { getUserOrg, requireOrgAdmin } from '../lib/auth';
import { decryptToken } from '../lib/crypto';
import type { Id } from '../_generated/dataModel';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const internal = _internal as any;

// ─── Key generation helpers ────────────────────────────────────────────────────

function generateSecureRandom(bytes = 24): string {
	const arr = new Uint8Array(bytes);
	crypto.getRandomValues(arr);
	return btoa(String.fromCharCode(...arr))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');
}

async function hashKey(key: string): Promise<string> {
	const data = new TextEncoder().encode(key);
	const hash = await crypto.subtle.digest('SHA-256', data);
	return btoa(String.fromCharCode(...new Uint8Array(hash)));
}

function buildApiKey(): { key: string; prefix: string } {
	const secret = generateSecureRandom(24);
	const key = `myc_live_${secret}`;
	const prefix = key.slice(0, 16); // 'myc_live_' + 7 chars
	return { key, prefix };
}

// ─── HMAC signing for webhooks ────────────────────────────────────────────────

async function signPayload(payload: string, secret: string): Promise<string> {
	const keyBytes = new TextEncoder().encode(secret);
	const dataBytes = new TextEncoder().encode(payload);
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		keyBytes,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', cryptoKey, dataBytes);
	return `sha256=${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

// ─── Internal queries ─────────────────────────────────────────────────────────

export const findApiKeyByPrefix = internalQuery({
	args: { prefix: v.string() },
	handler: async (ctx, { prefix }) => {
		return ctx.db
			.query('apiKeys')
			.withIndex('by_prefix', (q) => q.eq('prefix', prefix))
			.filter((q) => q.eq(q.field('revokedAt'), undefined))
			.first();
	}
});

export const getActiveEndpointsForOrg = internalQuery({
	args: { organizationId: v.id('organizations'), event: v.string() },
	handler: async (ctx, { organizationId, event }) => {
		const all = await ctx.db
			.query('webhookEndpoints')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.eq(q.field('isActive'), true))
			.collect();
		return all.filter((e) => e.events.includes(event) || e.events.includes('*'));
	}
});

export const getWebhookDelivery = internalQuery({
	args: { deliveryId: v.id('webhookDeliveries') },
	handler: async (ctx, { deliveryId }) => ctx.db.get(deliveryId)
});

// ─── Internal mutations ────────────────────────────────────────────────────────

export const markApiKeyUsed = internalMutation({
	args: { keyId: v.id('apiKeys') },
	handler: async (ctx, { keyId }) => {
		await ctx.db.patch(keyId, { lastUsedAt: Date.now() });
	}
});

export const insertWebhookDelivery = internalMutation({
	args: {
		webhookEndpointId: v.id('webhookEndpoints'),
		organizationId: v.id('organizations'),
		event: v.string(),
		payload: v.string()
	},
	handler: async (ctx, args) => {
		return ctx.db.insert('webhookDeliveries', {
			...args,
			status: 'PENDING',
			attempts: 0,
			createdAt: Date.now()
		});
	}
});

export const updateWebhookDelivery = internalMutation({
	args: {
		deliveryId: v.id('webhookDeliveries'),
		status: v.union(v.literal('PENDING'), v.literal('SUCCESS'), v.literal('FAILED')),
		statusCode: v.optional(v.number()),
		error: v.optional(v.string()),
		attempts: v.number(),
		deliveredAt: v.optional(v.number())
	},
	handler: async (ctx, { deliveryId, ...patch }) => {
		await ctx.db.patch(deliveryId, patch);
	}
});

export const updateWebhookEndpointLastDelivery = internalMutation({
	args: {
		endpointId: v.id('webhookEndpoints'),
		lastDeliveredAt: v.number(),
		lastError: v.optional(v.string())
	},
	handler: async (ctx, { endpointId, lastDeliveredAt, lastError }) => {
		await ctx.db.patch(endpointId, { lastDeliveredAt, lastError });
	}
});

// ─── Internal actions ──────────────────────────────────────────────────────────

export const emitWebhookEvent = internalAction({
	args: {
		organizationId: v.id('organizations'),
		event: v.string(),
		payload: v.record(v.string(), v.any())
	},
	handler: async (ctx, { organizationId, event, payload }) => {
		const endpoints = await ctx.runQuery(
			internal.integrations.apiKeys.getActiveEndpointsForOrg,
			{ organizationId, event }
		);
		if (!endpoints.length) return;

		const payloadStr = JSON.stringify({ event, data: payload, timestamp: Date.now() });

		for (const endpoint of endpoints) {
			const deliveryId = await ctx.runMutation(
				internal.integrations.apiKeys.insertWebhookDelivery,
				{
					webhookEndpointId: endpoint._id,
					organizationId,
					event,
					payload: payloadStr
				}
			);
			await ctx.scheduler.runAfter(0, internal.integrations.apiKeys.deliverWebhook, {
				deliveryId,
				secret: endpoint.secret,
				url: endpoint.url,
				attempt: 1
			});
		}
	}
});

export const deliverWebhook = internalAction({
	args: {
		deliveryId: v.id('webhookDeliveries'),
		secret: v.string(),
		url: v.string(),
		attempt: v.number()
	},
	handler: async (ctx: ActionCtx, { deliveryId, secret, url, attempt }) => {
		const delivery = await ctx.runQuery(
			internal.integrations.apiKeys.getWebhookDelivery,
			{ deliveryId }
		);
		if (!delivery) return;

		const encryptionKey = process.env.ACCOUNTING_ENCRYPTION_KEY;
		if (!encryptionKey) throw new Error('[webhook] ACCOUNTING_ENCRYPTION_KEY not set');
		const plaintextSecret = await decryptToken(secret, encryptionKey);
		const signature = await signPayload(delivery.payload, plaintextSecret);

		let statusCode: number | undefined;
		let error: string | undefined;
		let success = false;

		try {
			const res = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Mycelium-Signature': signature,
					'X-Mycelium-Event': delivery.event,
					'X-Mycelium-Delivery': deliveryId,
					'User-Agent': 'Mycelium-Webhooks/1.0'
				},
				body: delivery.payload,
				signal: AbortSignal.timeout(10_000)
			});
			statusCode = res.status;
			success = res.ok;
			if (!success) error = `HTTP ${res.status}`;
		} catch (e) {
			error = String(e);
		}

		await ctx.runMutation(internal.integrations.apiKeys.updateWebhookDelivery, {
			deliveryId,
			status: success ? 'SUCCESS' : (attempt >= 5 ? 'FAILED' : 'PENDING'),
			statusCode,
			error,
			attempts: attempt,
			deliveredAt: success ? Date.now() : undefined
		});

		await ctx.runMutation(
			internal.integrations.apiKeys.updateWebhookEndpointLastDelivery,
			{
				endpointId: delivery.webhookEndpointId,
				lastDeliveredAt: Date.now(),
				lastError: success ? undefined : error
			}
		);

		if (!success && attempt < 5) {
			// Exponential backoff: 30s, 2m, 10m, 30m
			const delays = [30_000, 120_000, 600_000, 1_800_000];
			const delay = delays[attempt - 1] ?? 1_800_000;
			await ctx.scheduler.runAfter(delay, internal.integrations.apiKeys.deliverWebhook, {
				deliveryId,
				secret,
				url,
				attempt: attempt + 1
			});
		}
	}
});

// ─── Public API key mutations ──────────────────────────────────────────────────

export const createApiKey = authedMutation({
	args: {
		name: v.string(),
		scopes: v.array(v.string())
	},
	handler: async (ctx, { name, scopes }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const validScopes = ['costs:read', 'costs:write', 'vehicles:read', 'expenses:read'];
		const filteredScopes = scopes.filter((s) => validScopes.includes(s));
		if (!filteredScopes.length) throw new ConvexError('Au moins un scope requis');

		const { key, prefix } = buildApiKey();
		const hashedKey = await hashKey(key);

		await ctx.db.insert('apiKeys', {
			organizationId,
			name,
			hashedKey,
			prefix,
			scopes: filteredScopes,
			createdBy: user._id,
			createdAt: Date.now()
		});

		// Return the raw key ONCE — never stored in plaintext
		return { key, prefix };
	}
});

export const listApiKeys = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const keys = await ctx.db
			.query('apiKeys')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.collect();

		return keys.map(({ hashedKey: _h, ...k }) => k);
	}
});

export const revokeApiKey = authedMutation({
	args: { keyId: v.id('apiKeys') },
	handler: async (ctx, { keyId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const key = await ctx.db.get(keyId);
		if (!key || key.organizationId !== organizationId) {
			throw new ConvexError('Clé introuvable');
		}
		await ctx.db.patch(keyId, { revokedAt: Date.now() });
	}
});

// ─── Public webhook endpoint mutations ────────────────────────────────────────

// Called from /api/webhooks/create server route (encryption happens server-side)
export const createWebhookEndpointFromServer = authedMutation({
	args: {
		url: v.string(),
		events: v.array(v.string()),
		encryptedSecret: v.string()
	},
	handler: async (ctx, { url, events, encryptedSecret }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		try {
			new URL(url);
		} catch {
			throw new ConvexError('URL invalide');
		}
		if (!url.startsWith('https://')) {
			throw new ConvexError('HTTPS requis pour les webhooks');
		}

		const validEvents = [
			'cost.created', 'cost.updated', 'expense.approved',
			'reservation.created', '*'
		];
		const filteredEvents = events.filter((e) => validEvents.includes(e));
		if (!filteredEvents.length) throw new ConvexError('Au moins un événement requis');

		return ctx.db.insert('webhookEndpoints', {
			organizationId,
			url,
			secret: encryptedSecret,
			events: filteredEvents,
			isActive: true,
			createdAt: Date.now()
		});
	}
});

export const listWebhookEndpoints = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const rows = await ctx.db
			.query('webhookEndpoints')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.collect();

		// Never expose the encrypted secret to the client
		return rows.map(({ secret: _secret, ...rest }) => rest);
	}
});

export const updateWebhookEndpointMutation = authedMutation({
	args: {
		endpointId: v.id('webhookEndpoints'),
		isActive: v.optional(v.boolean()),
		events: v.optional(v.array(v.string()))
	},
	handler: async (ctx, { endpointId, ...patch }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const endpoint = await ctx.db.get(endpointId);
		if (!endpoint || endpoint.organizationId !== organizationId) {
			throw new ConvexError('Endpoint introuvable');
		}
		await ctx.db.patch(endpointId, patch as Partial<typeof endpoint>);
	}
});

export const deleteWebhookEndpoint = authedMutation({
	args: { endpointId: v.id('webhookEndpoints') },
	handler: async (ctx, { endpointId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const endpoint = await ctx.db.get(endpointId);
		if (!endpoint || endpoint.organizationId !== organizationId) {
			throw new ConvexError('Endpoint introuvable');
		}
		await ctx.db.delete(endpointId);
	}
});

export const getRecentDeliveries = authedQuery({
	args: { endpointId: v.id('webhookEndpoints'), limit: v.optional(v.number()) },
	handler: async (ctx, { endpointId, limit }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const endpoint = await ctx.db.get(endpointId);
		if (!endpoint || endpoint.organizationId !== organizationId) {
			throw new ConvexError('Endpoint introuvable');
		}

		return ctx.db
			.query('webhookDeliveries')
			.withIndex('by_endpoint', (q) => q.eq('webhookEndpointId', endpointId))
			.order('desc')
			.take(limit ?? 20);
	}
});

// ─── Internal verify (called from SvelteKit API routes) ───────────────────────

export const verifyApiKeyAndGetOrg = internalQuery({
	args: { prefix: v.string(), hashedKey: v.string() },
	handler: async (ctx, { prefix, hashedKey }) => {
		const keyRecord = await ctx.db
			.query('apiKeys')
			.withIndex('by_prefix', (q) => q.eq('prefix', prefix))
			.filter((q) => q.eq(q.field('revokedAt'), undefined))
			.first();

		if (!keyRecord) return null;
		if (keyRecord.hashedKey !== hashedKey) return null;

		return {
			keyId: keyRecord._id,
			organizationId: keyRecord.organizationId,
			scopes: keyRecord.scopes
		};
	}
});
