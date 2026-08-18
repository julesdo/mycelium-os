import { conciergeQuery, superAdminQuery } from '../functions';

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
			medianResponseMin: typeof medianMs === 'number' ? Math.round(medianMs / 60_000) : null,
			chargeParConcierge
		};
	}
});

// Permet au frontend de connaître son propre staffRole pour afficher/masquer les sections
export const getMyStaffRole = conciergeQuery({
	args: {},
	handler: async (ctx) => {
		return { staffRole: ctx.staffRole };
	}
});
