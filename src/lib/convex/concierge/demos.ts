import { v } from 'convex/values';
import { conciergeQuery, conciergeMutation } from '../functions';

export const listDemos = conciergeQuery({
	args: {},
	handler: async (ctx) => {
		const orgs = await ctx.db
			.query('organizations')
			.filter((q) => q.eq(q.field('isDemo'), true))
			.order('desc')
			.collect();

		// Concierge : filtre par orgs accessibles (super_admin voit tout)
		if (ctx.staffRole === 'concierge') {
			const accesses = await ctx.db
				.query('conciergeOrgAccess')
				.withIndex('by_concierge', (q) => q.eq('conciergeUserId', ctx.user._id))
				.collect();
			const allowedIds = new Set(accesses.map((a) => a.organizationId));
			return orgs.filter((o) => allowedIds.has(o._id));
		}

		return orgs;
	}
});

export const extendDemo = conciergeMutation({
	args: { organizationId: v.id('organizations'), extraDays: v.number() },
	handler: async (ctx, { organizationId, extraDays }) => {
		if (extraDays < 1 || extraDays > 14) {
			throw new Error('extraDays doit être entre 1 et 14');
		}

		const org = await ctx.db.get(organizationId);
		if (!org?.demoConfig) throw new Error("Pas une org démo");
		if (org.demoConfig.extendedCount >= 3) throw new Error('Maximum 3 prolongations atteint');

		await ctx.db.patch(organizationId, {
			demoConfig: {
				...org.demoConfig,
				expiresAt: org.demoConfig.expiresAt + extraDays * 24 * 60 * 60 * 1000,
				isExpired: false,
				extendedCount: org.demoConfig.extendedCount + 1
			}
		});
	}
});
