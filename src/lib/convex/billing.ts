import { v, ConvexError } from 'convex/values';
import { internalQuery, mutation } from './_generated/server';
import { authedMutation, authedQuery } from './functions';
import type { Doc } from './_generated/dataModel';

// ── Plan feature matrix ───────────────────────────────────────────────────────

export const FREE_VEHICLE_LIMIT = 10;

export const PLAN_FEATURES = {
	free: {
		fleet: true,
		reservations: true,
		concierge: false,
		notifications: true,
		expenses: false,
		drivers: false,
		incidents: false,
		maintenance: true,
		bik: false,
		csrd: false,
		optimizer: false,
		compliance: false,
		xero: false,
		quickbooks: false,
		coach: false,
		negotiator: false,
		finance: false,
		violations: false,
		support: false
	},
	essential: {
		fleet: true,
		reservations: true,
		concierge: true,
		notifications: true,
		expenses: true,
		drivers: true,
		incidents: true,
		maintenance: true,
		bik: false,
		csrd: false,
		optimizer: false,
		compliance: false,
		xero: false,
		quickbooks: false,
		coach: false,
		negotiator: false,
		finance: true,
		violations: true,
		support: true
	},
	professional: {
		fleet: true,
		reservations: true,
		concierge: true,
		notifications: true,
		expenses: true,
		drivers: true,
		incidents: true,
		maintenance: true,
		bik: true,
		csrd: true,
		optimizer: false,
		compliance: true,
		xero: true,
		quickbooks: true,
		coach: false,
		negotiator: false,
		finance: true,
		violations: true,
		support: true
	},
	business: {
		fleet: true,
		reservations: true,
		concierge: true,
		notifications: true,
		expenses: true,
		drivers: true,
		incidents: true,
		maintenance: true,
		bik: true,
		csrd: true,
		optimizer: true,
		compliance: true,
		xero: true,
		quickbooks: true,
		coach: true,
		negotiator: true,
		finance: true,
		violations: true,
		support: true
	},
	enterprise: {
		fleet: true,
		reservations: true,
		concierge: true,
		notifications: true,
		expenses: true,
		drivers: true,
		incidents: true,
		maintenance: true,
		bik: true,
		csrd: true,
		optimizer: true,
		compliance: true,
		xero: true,
		quickbooks: true,
		coach: true,
		negotiator: true,
		finance: true,
		violations: true,
		support: true
	}
} as const;

export type PlanFeature = keyof (typeof PLAN_FEATURES)['business'];
export type PlanTier =
	| 'free'
	| 'essential'
	| 'professional'
	| 'business'
	| 'enterprise'
	| 'dev'
	| 'none';

// Seat limits per tier (vehicle limit for free is enforced separately)
export const PLAN_SEATS: Record<string, number> = {
	free: 9999,
	essential: 50,
	professional: 150,
	business: 300,
	enterprise: 9999,
	dev: 9999
};

// ── Core resolver ─────────────────────────────────────────────────────────────

// Returns the effective plan for an org, considering:
// 1. Dev bypass (PADDLE_API_KEY absent) → 'dev'
// 2. devPlan flag → 'dev'
// 3. Active Paddle subscription → paddlePlanTier
// 4. Nothing → 'free' (open core, permanent, limited features)
export function resolveEffectivePlan(org: Doc<'organizations'>): {
	tier: PlanTier;
	isDev: boolean;
	seatsAllowed: number;
} {
	const isDev = !process.env.PADDLE_API_KEY;

	// Dev bypass: no Paddle key configured at all
	if (isDev) {
		// Allow simulating a specific plan tier for feature-gating tests
		if (org.simulatedTier) {
			const tier = org.simulatedTier as PlanTier;
			return { tier, isDev: true, seatsAllowed: PLAN_SEATS[tier] ?? 50 };
		}
		return { tier: 'dev', isDev: true, seatsAllowed: 9999 };
	}

	// Explicit dev plan (only settable when PADDLE_API_KEY was absent at the time)
	if (org.devPlan) {
		return { tier: 'dev', isDev: false, seatsAllowed: 9999 };
	}

	// Active Paddle subscription
	if (org.paddleStatus === 'active' || org.paddleStatus === 'trialing') {
		const tier = (org.paddlePlanTier ?? 'essential') as PlanTier;
		return {
			tier,
			isDev: false,
			seatsAllowed: org.seatsIncluded ?? PLAN_SEATS[tier] ?? 50
		};
	}

	return { tier: 'free', isDev: false, seatsAllowed: PLAN_SEATS.free };
}

export function planHasFeature(tier: PlanTier, feature: PlanFeature): boolean {
	if (tier === 'dev') return true;
	if (tier === 'free' || tier === 'none') return PLAN_FEATURES.free[feature];
	return PLAN_FEATURES[tier]?.[feature] ?? false;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const getBillingStatus = authedQuery({
	args: {},
	handler: async (ctx) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) return null;

		const org = await ctx.db.get(profile.currentOrganizationId);
		if (!org) return null;

		const { tier, isDev, seatsAllowed } = resolveEffectivePlan(org);

		const memberCount = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', org._id))
			.collect()
			.then((r) => r.length);

		return {
			tier,
			isDev,
			seatsUsed: memberCount,
			seatsAllowed,
			paddleStatus: org.paddleStatus ?? null,
			paddlePlanTier: org.paddlePlanTier ?? null,
			paddleCurrentPeriodEnd: org.paddleCurrentPeriodEnd ?? null
		};
	}
});

// Internal version for use by other Convex functions
export const _getOrgBillingStatus = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const org = await ctx.db.get(organizationId);
		if (!org) return null;
		const resolved = resolveEffectivePlan(org);

		const memberCount = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
			.collect()
			.then((r) => r.length);

		return { ...resolved, seatsUsed: memberCount, org };
	}
});

// ── Mutations ─────────────────────────────────────────────────────────────────

// Set a simulated plan tier in dev mode (no PADDLE_API_KEY) for testing feature gating.
// Pass undefined/null to reset back to full 'dev' access.
export const setSimulatedTier = authedMutation({
	args: { tier: v.optional(v.string()) },
	handler: async (ctx, { tier }) => {
		if (process.env.PADDLE_API_KEY) {
			throw new ConvexError("setSimulatedTier n'est disponible qu'en mode dev (sans clé Paddle).");
		}
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) throw new ConvexError('Aucune organisation active');

		await ctx.db.patch(profile.currentOrganizationId, {
			simulatedTier: tier ?? undefined
		});
		return { ok: true };
	}
});

// Activate dev plan (full access, no limits)
export const activateDevPlan = authedMutation({
	args: {},
	handler: async (ctx) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) throw new ConvexError('Aucune organisation active');

		await ctx.db.patch(profile.currentOrganizationId, {
			devPlan: true,
			seatsIncluded: 9999
		});

		return { ok: true };
	}
});

// ── Backend guard helper (use in other Convex mutations/queries) ──────────────

// Call this at the top of any gated mutation to enforce plan access.
// Usage: await assertFeatureAccess(ctx, orgId, 'bik')
export async function assertFeatureAccess(
	ctx: { db: { get: (id: any) => Promise<any>; query: any } },
	organizationId: string,
	feature: PlanFeature
): Promise<void> {
	const org = await ctx.db.get(organizationId as any);
	if (!org) throw new ConvexError('Organisation introuvable');

	const { tier } = resolveEffectivePlan(org);
	if (!planHasFeature(tier, feature)) {
		throw new ConvexError(
			`Cette fonctionnalité nécessite un plan supérieur. Plan actuel : ${tier}. ` +
				`Mettez à niveau votre abonnement sur /admin/settings/plans.`
		);
	}
}

// Call this before inserting a new member to enforce seat quota.
export async function assertSeatAvailable(
	ctx: { db: { get: (id: any) => Promise<any>; query: any } },
	organizationId: string
): Promise<void> {
	const org = await ctx.db.get(organizationId as any);
	if (!org) throw new ConvexError('Organisation introuvable');

	const { tier, seatsAllowed } = resolveEffectivePlan(org);
	if (tier === 'free') return; // free tier = membres illimités
	if (tier === 'none') {
		throw new ConvexError('Aucun abonnement actif. Souscrivez un plan pour continuer.');
	}

	const memberCount = await ctx.db
		.query('organizationMembers')
		.withIndex('by_organization', (q: any) => q.eq('organizationId', organizationId))
		.collect()
		.then((r: any[]) => r.length);

	if (memberCount >= seatsAllowed) {
		throw new ConvexError(
			`Quota de conducteurs atteint (${memberCount}/${seatsAllowed}). ` +
				`Mettez à niveau votre plan pour ajouter des membres supplémentaires.`
		);
	}
}
