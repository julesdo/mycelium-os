import { v } from 'convex/values';
import { conciergeQuery, superAdminQuery } from '../functions';
import { calculateHealthScore } from './health';

// Cross-org — réservé au staff Mycelium (concierge ou super_admin)
// Jamais exposé via authedQuery/orgQuery qui scopent sur l'org courante

export const getAggregatedQueue = conciergeQuery({
	args: {
		statusFilter: v.optional(v.array(v.string())),
		organizationId: v.optional(v.id('organizations'))
	},
	handler: async (ctx, args) => {
		// ctx.user garanti role==='admin' par adminQuery
		let tasks = await ctx.db.query('concierge_tasks').withIndex('by_status_and_priority').collect();

		tasks = tasks.filter((t) => t.status !== 'DONE');

		if (args.statusFilter && args.statusFilter.length > 0) {
			tasks = tasks.filter((t) => args.statusFilter!.includes(t.status));
		}

		if (args.organizationId) {
			tasks = tasks.filter((t) => t.organizationId === args.organizationId);
		}

		// Tri décroissant par score de priorité
		tasks.sort((a, b) => b.priorityScore - a.priorityScore);

		// Enrichir avec le nom de l'organisation pour l'affichage
		const orgIds = [...new Set(tasks.map((t) => t.organizationId))];
		const orgs = await Promise.all(orgIds.map((id) => ctx.db.get(id)));
		const orgMap = new Map(orgs.filter(Boolean).map((o) => [o!._id, o!]));

		return tasks.map((t) => ({
			...t,
			organizationName: orgMap.get(t.organizationId)?.name ?? 'Organisation inconnue',
			organizationTier: orgMap.get(t.organizationId)?.paddlePlanTier ?? 'essential'
		}));
	}
});

export const getClientHealthGrid = conciergeQuery({
	args: {},
	handler: async (ctx) => {
		const orgs = await ctx.db.query('organizations').collect();

		return await Promise.all(
			orgs.map(async (org) => {
				const openTasks = await ctx.db
					.query('concierge_tasks')
					.withIndex('by_org_and_status', (q) => q.eq('organizationId', org._id))
					.filter((q) => q.neq(q.field('status'), 'DONE'))
					.collect();

				return {
					organizationId: org._id,
					name: org.name,
					logoUrl: org.logoUrl,
					tier: org.paddlePlanTier ?? 'essential',
					openTaskCount: openTasks.length,
					criticalCount: openTasks.filter((t) => t.priority === 'CRITICAL').length,
					urgentCount: openTasks.filter((t) => t.priority === 'URGENT').length,
					healthScore: calculateHealthScore(openTasks)
				};
			})
		);
	}
});

// Permet au frontend de connaître son propre staffRole pour afficher/masquer les sections
export const getMyStaffRole = conciergeQuery({
	args: {},
	handler: async (ctx) => {
		return { staffRole: ctx.staffRole };
	}
});

export const getClientDetail = conciergeQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const org = await ctx.db.get(organizationId);
		if (!org) return null;

		const tasks = await ctx.db
			.query('concierge_tasks')
			.withIndex('by_org_and_status', (q) => q.eq('organizationId', organizationId))
			.collect();

		const openTasks = tasks.filter((t) => t.status !== 'DONE');
		openTasks.sort((a, b) => b.priorityScore - a.priorityScore);

		return {
			organization: org,
			openTasks,
			healthScore: calculateHealthScore(openTasks),
			totalTaskCount: tasks.length,
			doneTaskCount: tasks.filter((t) => t.status === 'DONE').length
		};
	}
});
