import { authedQuery } from '../functions';
import { getUserOrg, requireOrgAdmin } from '../lib/auth';

const JARGON: [RegExp, string][] = [
	[/\bINSURANCE\s+EXPIRING\b/gi, 'Assurance à renouveler'],
	[/\bINSURANCE\s+EXPIRED\b/gi, 'Assurance expirée'],
	[/\bCT\s+EXPIRING\b/gi, 'Contrôle technique à planifier'],
	[/\bCT\s+EXPIRED\b/gi, 'Contrôle technique expiré'],
	[/\bLICENSE\s+EXPIRING\b/gi, 'Permis à renouveler'],
	[/\bLICENSE\s+EXPIRED\b/gi, 'Permis expiré'],
	[/\bREGISTRATION\s+EXPIRING\b/gi, 'Carte grise à renouveler'],
	[/\bREGISTRATION\s+EXPIRED\b/gi, 'Carte grise expirée'],
];

function sanitize(text: string): string {
	let result = text;
	for (const [pattern, replacement] of JARGON) {
		result = result.replace(pattern, replacement);
	}
	return result;
}

// Score client : plus indulgent que le score interne concierge (P27/health.ts).
// Plancher à 60 — jamais afficher un chiffre anxiogène au client.
function calculateClientFacingScore(openTasks: Array<{ priority: string }>): number {
	if (openTasks.length === 0) return 100;
	const penalty = openTasks.reduce((sum, t) => {
		if (t.priority === 'CRITICAL') return sum + 15;
		if (t.priority === 'URGENT') return sum + 6;
		return sum + 1;
	}, 0);
	return Math.max(60, 100 - penalty);
}

export const getFleetCareSummary = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { user, org, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const now = Date.now();
		const year = new Date(now).getFullYear();
		const month = new Date(now).getMonth();

		const startOfMonth = new Date(year, month, 1).getTime();
		const startOfNextMonth = new Date(year, month + 1, 1).getTime();
		const endOfNextMonth = new Date(year, month + 2, 1).getTime();

		const allTasks = await ctx.db
			.query('concierge_tasks')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const openTasks = allTasks.filter((t) => t.status !== 'DONE');

		const completedThisMonth = allTasks
			.filter((t) => t.status === 'DONE' && t.completedAt && t.completedAt >= startOfMonth)
			.map((t) => ({
				title: sanitize(t.title),
				summary: sanitize(t.completionNotes ?? t.description)
			}));

		const upcomingNextMonth = allTasks
			.filter(
				(t) =>
					t.status !== 'DONE' &&
					t.dueDate &&
					t.dueDate >= startOfNextMonth &&
					t.dueDate < endOfNextMonth
			)
			.sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0))
			.map((t) => ({
				title: sanitize(t.title),
				summary: sanitize(t.description),
				dueDate: t.dueDate
			}));

		return {
			orgName: org.name,
			healthScore: calculateClientFacingScore(openTasks),
			completedThisMonth,
			upcomingNextMonth,
			openCount: openTasks.length,
			openCriticalCount: openTasks.filter((t) => t.priority === 'CRITICAL').length
		};
	}
});
