import { v, ConvexError } from 'convex/values';
import { conciergeQuery } from '../functions';

async function assertAccess(ctx: any, organizationId: string) {
	if (ctx.staffRole === 'super_admin') return;
	const access = await ctx.db
		.query('conciergeOrgAccess')
		.withIndex('by_concierge_and_org', (q: any) =>
			q.eq('conciergeUserId', ctx.user._id).eq('organizationId', organizationId)
		)
		.first();
	if (!access) throw new ConvexError('Accès refusé à cette organisation');
}

export const getOrgVehicles = conciergeQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		await assertAccess(ctx, organizationId);
		return ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
	}
});

export const getOrgReservations = conciergeQuery({
	args: { organizationId: v.id('organizations'), limit: v.optional(v.number()) },
	handler: async (ctx, { organizationId, limit }) => {
		await assertAccess(ctx, organizationId);
		return ctx.db
			.query('reservations')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.take(limit ?? 30);
	}
});

export const getOrgFleetStats = conciergeQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		await assertAccess(ctx, organizationId);
		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		const total = vehicles.length;
		const available = vehicles.filter((v) => v.status === 'AVAILABLE').length;
		const inUse = vehicles.filter((v) => v.status === 'IN_USE').length;
		const maintenance = vehicles.filter((v) => v.status === 'MAINTENANCE').length;
		return {
			total,
			available,
			inUse,
			maintenance,
			utilizationRate: total > 0 ? Math.round((inUse / total) * 100) : 0
		};
	}
});

export const getOrgMaintenance = conciergeQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		await assertAccess(ctx, organizationId);
		return ctx.db
			.query('maintenanceRecords')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.eq(q.field('status'), 'SCHEDULED'))
			.order('asc')
			.take(20);
	}
});
