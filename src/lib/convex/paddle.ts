import { v } from 'convex/values';
import { httpAction, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

// Plan tier → seats mapping (matches CLAUDE.md pricing)
const PLAN_SEATS: Record<string, number> = {
	essential: 50,
	professional: 150,
	business: 300,
	enterprise: 9999
};

// Price ID → plan tier (configured via env PADDLE_PRICE_<TIER>)
// Resolved at call time so env vars can differ per deployment
function resolvePlanTier(priceId: string): 'essential' | 'professional' | 'business' | 'enterprise' | null {
	const env = process.env;
	if (priceId === env.PADDLE_PRICE_ESSENTIAL) return 'essential';
	if (priceId === env.PADDLE_PRICE_PROFESSIONAL) return 'professional';
	if (priceId === env.PADDLE_PRICE_BUSINESS) return 'business';
	if (priceId === env.PADDLE_PRICE_ENTERPRISE) return 'enterprise';
	return null;
}

// Map Paddle subscription status → internal status
function mapPaddleStatus(
	status: string
): 'active' | 'trialing' | 'paused' | 'past_due' | 'canceled' {
	switch (status) {
		case 'active': return 'active';
		case 'trialing': return 'trialing';
		case 'paused': return 'paused';
		case 'past_due': return 'past_due';
		case 'canceled':
		case 'cancelled': return 'canceled';
		default: return 'active';
	}
}

// Called by webhook on subscription.activated / subscription.updated
export const upsertSubscription = internalMutation({
	args: {
		paddleSubscriptionId: v.string(),
		paddleCustomerId: v.string(),
		paddleStatus: v.string(),
		priceId: v.string(),
		currentPeriodEnd: v.number(), // Unix timestamp ms
		// From Paddle custom_data on the checkout
		organizationId: v.optional(v.string()), // existing org upgrade
		userId: v.optional(v.string()),         // new customer signup
		orgName: v.optional(v.string()),        // used when creating a new org
	},
	handler: async (ctx, args) => {
		const tier = resolvePlanTier(args.priceId);
		const seats = tier ? PLAN_SEATS[tier] : 50;
		const status = mapPaddleStatus(args.paddleStatus);

		// Try to find existing org by subscription ID first, then by organizationId arg
		const existing = await ctx.db
			.query('organizations')
			.withIndex('by_paddle_subscription', (q) =>
				q.eq('paddleSubscriptionId', args.paddleSubscriptionId)
			)
			.unique();

		if (existing) {
			await ctx.db.patch(existing._id, {
				paddleSubscriptionId: args.paddleSubscriptionId,
				paddleCustomerId: args.paddleCustomerId,
				paddlePlanTier: tier ?? undefined,
				paddleStatus: status,
				paddleCurrentPeriodEnd: args.currentPeriodEnd,
				seatsIncluded: seats
			});
			return { action: 'updated', organizationId: existing._id };
		}

		// Upgrade path — org already exists, link subscription
		if (args.organizationId) {
			const orgId = args.organizationId as Id<'organizations'>;
			const org = await ctx.db.get(orgId);
			if (org) {
				await ctx.db.patch(orgId, {
					paddleSubscriptionId: args.paddleSubscriptionId,
					paddleCustomerId: args.paddleCustomerId,
					paddlePlanTier: tier ?? undefined,
					paddleStatus: status,
					paddleCurrentPeriodEnd: args.currentPeriodEnd,
					seatsIncluded: seats
				});
				return { action: 'linked', organizationId: orgId };
			}
		}

		// New customer — find org by paddle customer ID (previous sub or trial)
		const byCustomer = await ctx.db
			.query('organizations')
			.withIndex('by_paddle_customer', (q) =>
				q.eq('paddleCustomerId', args.paddleCustomerId)
			)
			.first();

		if (byCustomer) {
			await ctx.db.patch(byCustomer._id, {
				paddleSubscriptionId: args.paddleSubscriptionId,
				paddlePlanTier: tier ?? undefined,
				paddleStatus: status,
				paddleCurrentPeriodEnd: args.currentPeriodEnd,
				seatsIncluded: seats
			});
			return { action: 'updated', organizationId: byCustomer._id };
		}

		// Brand new org — provision from userId passed in custom_data
		if (args.userId) {
			const profile = await ctx.db
				.query('userProfiles')
				.withIndex('by_userId', (q) => q.eq('userId', args.userId!))
				.unique();

			const orgId = await ctx.db.insert('organizations', {
				name: args.orgName ?? 'Mon entreprise',
				plan: 'flat',
				paddleSubscriptionId: args.paddleSubscriptionId,
				paddleCustomerId: args.paddleCustomerId,
				paddlePlanTier: tier ?? undefined,
				paddleStatus: status,
				paddleCurrentPeriodEnd: args.currentPeriodEnd,
				seatsIncluded: seats,
				createdAt: Date.now()
			});

			await ctx.db.insert('organizationMembers', {
				organizationId: orgId,
				userId: args.userId,
				role: 'ORG_ADMIN',
				joinedAt: Date.now()
			});

			if (profile) {
				await ctx.db.patch(profile._id, { currentOrganizationId: orgId });
			} else {
				await ctx.db.insert('userProfiles', {
					userId: args.userId,
					currentOrganizationId: orgId
				});
			}

			return { action: 'created', organizationId: orgId };
		}

		return { action: 'noop', organizationId: null };
	}
});

// Called by webhook on subscription.canceled
export const cancelSubscription = internalMutation({
	args: { paddleSubscriptionId: v.string() },
	handler: async (ctx, { paddleSubscriptionId }) => {
		const org = await ctx.db
			.query('organizations')
			.withIndex('by_paddle_subscription', (q) =>
				q.eq('paddleSubscriptionId', paddleSubscriptionId)
			)
			.unique();

		if (!org) return { action: 'noop' };

		await ctx.db.patch(org._id, { paddleStatus: 'canceled' });
		return { action: 'canceled', organizationId: org._id };
	}
});

// Called by webhook on subscription.past_due
export const markPastDue = internalMutation({
	args: { paddleSubscriptionId: v.string() },
	handler: async (ctx, { paddleSubscriptionId }) => {
		const org = await ctx.db
			.query('organizations')
			.withIndex('by_paddle_subscription', (q) =>
				q.eq('paddleSubscriptionId', paddleSubscriptionId)
			)
			.unique();

		if (!org) return { action: 'noop' };

		await ctx.db.patch(org._id, { paddleStatus: 'past_due' });
		return { action: 'past_due', organizationId: org._id };
	}
});

// Webhook httpAction — registered in http.ts at /paddle-webhook
// Verifies Paddle HMAC-SHA256 signature then dispatches to internal mutations
export const webhookHandler = httpAction(async (ctx, req) => {
	const secret = process.env.PADDLE_WEBHOOK_SECRET;
	if (!secret) {
		return new Response('Webhook secret not configured', { status: 500 });
	}

	const signatureHeader = req.headers.get('Paddle-Signature') ?? '';
	const rawBody = await req.text();

	const valid = await verifyPaddleSignature(rawBody, signatureHeader, secret);
	if (!valid) {
		return new Response('Invalid signature', { status: 401 });
	}

	let event: { event_type: string; data: PaddleSubscriptionData };
	try {
		event = JSON.parse(rawBody);
	} catch {
		return new Response('Invalid JSON', { status: 400 });
	}

	const { event_type, data } = event;

	if (event_type === 'subscription.activated' || event_type === 'subscription.updated') {
		const priceId = data.items?.[0]?.price?.id ?? '';
		const periodEnd = data.current_billing_period?.ends_at
			? new Date(data.current_billing_period.ends_at).getTime()
			: Date.now() + 30 * 24 * 60 * 60 * 1000;

		await ctx.runMutation(internal.paddle.upsertSubscription, {
			paddleSubscriptionId: data.id,
			paddleCustomerId: data.customer_id,
			paddleStatus: data.status,
			priceId,
			currentPeriodEnd: periodEnd,
			organizationId: data.custom_data?.organization_id,
			userId: data.custom_data?.user_id,
			orgName: data.custom_data?.org_name
		});
	} else if (event_type === 'subscription.canceled') {
		await ctx.runMutation(internal.paddle.cancelSubscription, {
			paddleSubscriptionId: data.id
		});
	} else if (event_type === 'subscription.past_due') {
		await ctx.runMutation(internal.paddle.markPastDue, {
			paddleSubscriptionId: data.id
		});
	}

	return new Response(JSON.stringify({ received: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
});

// HMAC-SHA256 verification for Paddle webhook signature
// Header format: "ts=<timestamp>;h1=<hex_digest>"
async function verifyPaddleSignature(body: string, header: string, secret: string): Promise<boolean> {
	const parts = Object.fromEntries(
		header.split(';').map((p) => {
			const idx = p.indexOf('=');
			return [p.slice(0, idx), p.slice(idx + 1)] as [string, string];
		})
	);
	const ts = parts['ts'];
	const h1 = parts['h1'];
	if (!ts || !h1) return false;

	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}:${body}`));
	const computed = Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	if (computed.length !== h1.length) return false;
	let diff = 0;
	for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ h1.charCodeAt(i);
	return diff === 0;
}

type PaddleSubscriptionData = {
	id: string;
	customer_id: string;
	status: string;
	items: Array<{ price: { id: string } }>;
	current_billing_period?: { ends_at: string };
	custom_data?: { organization_id?: string; user_id?: string; org_name?: string };
};

// Read subscription status for billing page
export const getSubscriptionStatus = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const org = await ctx.db.get(organizationId);
		if (!org) return null;
		return {
			paddleSubscriptionId: org.paddleSubscriptionId ?? null,
			paddleCustomerId: org.paddleCustomerId ?? null,
			paddlePlanTier: org.paddlePlanTier ?? null,
			paddleStatus: org.paddleStatus ?? null,
			paddleCurrentPeriodEnd: org.paddleCurrentPeriodEnd ?? null,
			seatsIncluded: org.seatsIncluded ?? null
		};
	}
});
