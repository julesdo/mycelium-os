import { v, ConvexError } from 'convex/values';
import { conciergeQuery, conciergeMutation } from '../functions';

export const getOrgTimeline = conciergeQuery({
	args: { organizationId: v.id('organizations'), limit: v.optional(v.number()) },
	handler: async (ctx, { organizationId, limit }) => {
		if (ctx.staffRole === 'concierge') {
			const access = await ctx.db
				.query('conciergeOrgAccess')
				.withIndex('by_concierge_and_org', (q) =>
					q.eq('conciergeUserId', ctx.user._id).eq('organizationId', organizationId)
				)
				.first();
			if (!access) return [];
		}
		return ctx.db
			.query('clientTimelineEvents')
			.withIndex('by_org_and_time', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.take(limit ?? 50);
	}
});

export const addConciergeNote = conciergeMutation({
	args: { organizationId: v.id('organizations'), note: v.string() },
	handler: async (ctx, { organizationId, note }) => {
		if (!note.trim()) throw new ConvexError('La note ne peut pas être vide.');
		await ctx.db.insert('clientTimelineEvents', {
			organizationId,
			type: 'CONCIERGE_NOTE',
			title: 'Note concierge',
			description: note.trim(),
			createdBy: ctx.user._id,
			occurredAt: Date.now()
		});
	}
});
