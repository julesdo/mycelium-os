import { v } from 'convex/values';
import { conciergeQuery, superAdminQuery } from '../functions';
import { calculateHealthScore } from './health';

export const getServiceDashboard = superAdminQuery({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const startOfDay = new Date();
		startOfDay.setHours(0, 0, 0, 0);
		const startOfMonth = new Date(now);
		startOfMonth.setDate(1);
		startOfMonth.setHours(0, 0, 0, 0);

		const allTickets = await ctx.db.query('conciergeTickets').collect();
		const activeTickets = allTickets.filter(
			(t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED'
		);
		const resolvedThisMonth = allTickets.filter(
			(t) => t.resolvedAt && t.resolvedAt >= startOfMonth.getTime()
		);
		const breachedSlaThisMonth = allTickets.filter(
			(t) =>
				t.slaBreachedAt &&
				t.slaBreachedAt >= startOfMonth.getTime() &&
				!t.firstResponseAt
		);
		const respondedOnTime = allTickets.filter(
			(t) =>
				t.firstResponseAt &&
				t.slaDeadline &&
				t.firstResponseAt <= t.slaDeadline &&
				t.createdAt >= startOfMonth.getTime()
		);
		const newSinceMidnight = allTickets.filter(
			(t) => t.createdAt >= startOfDay.getTime()
		);

		// Temps de réponse médian (ms)
		const responseTimes = allTickets
			.filter((t) => t.firstResponseAt && t.createdAt)
			.map((t) => t.firstResponseAt! - t.createdAt)
			.sort((a, b) => a - b);
		const medianMs =
			responseTimes.length > 0
				? responseTimes[Math.floor(responseTimes.length / 2)]
				: null;

		// Charge par concierge
		const byAssignee: Record<string, number> = {};
		for (const t of activeTickets) {
			const key = t.assignedTo ?? '__unassigned__';
			byAssignee[key] = (byAssignee[key] ?? 0) + 1;
		}
		const staffIds = Object.keys(byAssignee).filter((k) => k !== '__unassigned__');
		const staffDocs = await Promise.all(
			staffIds.map((uid) =>
				ctx.db
					.query('myceliumStaff')
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					.withIndex('by_userId', (q) => q.eq('userId', uid as any))
					.unique()
			)
		);
		const staffMap = new Map(
			staffDocs
				.filter(Boolean)
				.map((s) => [s!.userId, { name: s!.name, avatarUrl: s!.avatarUrl ?? null }])
		);

		const chargeParConcierge = Object.entries(byAssignee).map(([uid, count]) => ({
			name: uid === '__unassigned__' ? 'Non assigné' : (staffMap.get(uid)?.name ?? uid.slice(0, 8)),
			count,
			isUnassigned: uid === '__unassigned__'
		}));

		const slaRateThisMonth =
			respondedOnTime.length + breachedSlaThisMonth.length > 0
				? Math.round(
						(respondedOnTime.length /
							(respondedOnTime.length + breachedSlaThisMonth.length)) *
							100
					)
				: null;

		return {
			activeCount: activeTickets.length,
			urgentOrCritical: activeTickets.filter(
				(t) => t.priority === 'URGENT' || t.priority === 'HIGH'
			).length,
			breachedSlaCount: activeTickets.filter((t) => t.slaBreachedAt && !t.firstResponseAt).length,
			unassignedCount: activeTickets.filter((t) => !t.assignedTo).length,
			resolvedThisMonth: resolvedThisMonth.length,
			newToday: newSinceMidnight.length,
			slaRateThisMonth,
			medianResponseMin: medianMs !== null ? Math.round(medianMs / 60_000) : null,
			chargeParConcierge
		};
	}
});

// Cross-org — réservé au staff Mycelium (concierge ou super_admin)
// Jamais exposé via authedQuery/orgQuery qui scopent sur l'org courante

export const getAggregatedQueue = conciergeQuery({
	args: {
		statusFilter: v.optional(v.array(v.string())),
		organizationId: v.optional(v.id('organizations'))
	},
	handler: async (ctx, args) => {
		let tasks = await ctx.db.query('concierge_tasks').withIndex('by_status_and_priority').collect();

		tasks = tasks.filter((t) => t.status !== 'DONE');

		// Concierges : restreindre aux orgs assignées
		if (ctx.staffRole === 'concierge') {
			const accesses = await ctx.db
				.query('conciergeOrgAccess')
				.withIndex('by_concierge', (q) => q.eq('conciergeUserId', ctx.user._id))
				.collect();
			const allowedIds = new Set(accesses.map((a) => a.organizationId));
			tasks = tasks.filter((t) => allowedIds.has(t.organizationId));
		}

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
		let orgs = await ctx.db.query('organizations').collect();

		// Concierges : filtrer sur leurs orgs assignées uniquement
		if (ctx.staffRole === 'concierge') {
			const accesses = await ctx.db
				.query('conciergeOrgAccess')
				.withIndex('by_concierge', (q) => q.eq('conciergeUserId', ctx.user._id))
				.collect();
			const allowedIds = new Set(accesses.map((a) => a.organizationId));
			orgs = orgs.filter((o) => allowedIds.has(o._id));
		}

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
