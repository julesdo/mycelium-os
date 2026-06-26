import { v, ConvexError } from 'convex/values';
import { internalQuery, mutation } from './_generated/server';
import { authedMutation, authedQuery } from './functions';
import type { Doc } from './_generated/dataModel';

// ── Plan feature matrix ───────────────────────────────────────────────────────

export const PLAN_FEATURES = {
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
	| 'essential'
	| 'professional'
	| 'business'
	| 'enterprise'
	| 'dev'
	| 'trial'
	| 'none';

// Seat limits per tier
export const PLAN_SEATS: Record<string, number> = {
	essential: 50,
	professional: 150,
	business: 300,
	enterprise: 9999,
	dev: 9999,
	trial: 150
};

export const TRIAL_DAYS = 15;

// ── Core resolver ─────────────────────────────────────────────────────────────

// Returns the effective plan for an org, considering:
// 1. Dev bypass (PADDLE_API_KEY absent) → 'dev'
// 2. devPlan flag → 'dev'
// 3. Active Paddle subscription → paddlePlanTier
// 4. Active free trial → 'trial' (Professional features)
// 5. Nothing → 'none'
export function resolveEffectivePlan(org: Doc<'organizations'>): {
	tier: PlanTier;
	isDev: boolean;
	seatsAllowed: number;
	trialEndsAt: number | null;
} {
	const isDev = !process.env.PADDLE_API_KEY;

	// Dev bypass: no Paddle key configured at all
	if (isDev) {
		// Allow simulating a specific plan tier for feature-gating tests
		if (org.simulatedTier) {
			const tier = org.simulatedTier as PlanTier;
			return { tier, isDev: true, seatsAllowed: PLAN_SEATS[tier] ?? 50, trialEndsAt: null };
		}
		return { tier: 'dev', isDev: true, seatsAllowed: 9999, trialEndsAt: null };
	}

	// Explicit dev plan (only settable when PADDLE_API_KEY was absent at the time)
	if (org.devPlan) {
		return { tier: 'dev', isDev: false, seatsAllowed: 9999, trialEndsAt: null };
	}

	// Active Paddle subscription
	if (org.paddleStatus === 'active' || org.paddleStatus === 'trialing') {
		const tier = (org.paddlePlanTier ?? 'essential') as PlanTier;
		return {
			tier,
			isDev: false,
			seatsAllowed: org.seatsIncluded ?? PLAN_SEATS[tier] ?? 50,
			trialEndsAt: null
		};
	}

	// Free trial
	if (org.freeTrialEndsAt && org.freeTrialEndsAt > Date.now()) {
		return {
			tier: 'trial',
			isDev: false,
			seatsAllowed: PLAN_SEATS['trial'] ?? 150,
			trialEndsAt: org.freeTrialEndsAt
		};
	}

	return { tier: 'none', isDev: false, seatsAllowed: 0, trialEndsAt: null };
}

export function planHasFeature(tier: PlanTier, feature: PlanFeature): boolean {
	if (tier === 'dev') return true;
	if (tier === 'trial') return PLAN_FEATURES.professional[feature];
	if (tier === 'none') return false;
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

		const { tier, isDev, seatsAllowed, trialEndsAt } = resolveEffectivePlan(org);

		const memberCount = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', org._id))
			.collect()
			.then((r) => r.length);

		const trialDaysLeft = trialEndsAt
			? Math.max(0, Math.ceil((trialEndsAt - Date.now()) / 86400000))
			: null;

		return {
			tier,
			isDev,
			seatsUsed: memberCount,
			seatsAllowed,
			trialDaysLeft,
			trialEndsAt,
			paddleStatus: org.paddleStatus ?? null,
			paddlePlanTier: org.paddlePlanTier ?? null,
			paddleCurrentPeriodEnd: org.paddleCurrentPeriodEnd ?? null,
			hasUsedFreeTrial: profile.hasUsedFreeTrial ?? false
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

export const startFreeTrial = authedMutation({
	args: {},
	handler: async (ctx) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) throw new ConvexError('Aucune organisation active');

		// Anti-abus : un seul essai gratuit par utilisateur, toutes orgs confondues
		if (profile.hasUsedFreeTrial) {
			throw new ConvexError(
				"Vous avez déjà bénéficié d'un essai gratuit. Souscrivez un plan pour continuer."
			);
		}

		const org = await ctx.db.get(profile.currentOrganizationId);
		if (!org) throw new ConvexError('Organisation introuvable');

		// Already has an active subscription
		if (org.paddleStatus === 'active' || org.paddleStatus === 'trialing') {
			throw new ConvexError('Votre organisation a déjà un abonnement actif.');
		}

		// Already used a trial on this org
		if (org.freeTrialEndsAt) {
			throw new ConvexError("Cette organisation a déjà bénéficié de l'essai gratuit.");
		}

		const trialEnd = Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000;
		await ctx.db.patch(profile.currentOrganizationId, { freeTrialEndsAt: trialEnd });
		await ctx.db.patch(profile._id, { hasUsedFreeTrial: true });

		return { trialEndsAt: trialEnd };
	}
});

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
	if (tier === 'none') {
		throw new ConvexError(
			'Aucun abonnement actif. Démarrez un essai gratuit ou souscrivez un plan.'
		);
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
