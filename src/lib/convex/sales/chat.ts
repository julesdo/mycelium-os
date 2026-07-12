import { v } from 'convex/values';
import { salesQuery, salesMutation, conciergeQuery, conciergeMutation } from '../functions';

export const listMyThreads = salesQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db
			.query('salesConciergeThreads')
			.withIndex('by_sales', (q) => q.eq('salesUserId', ctx.user._id))
			.order('desc')
			.collect();
	}
});

export const getThread = salesQuery({
	args: { threadId: v.id('salesConciergeThreads') },
	handler: async (ctx, { threadId }) => {
		const thread = await ctx.db.get(threadId);
		if (!thread) return null;
		if (thread.salesUserId !== ctx.user._id && ctx.staffRole !== 'super_admin') return null;
		return thread;
	}
});

export const listThreadMessages = salesQuery({
	args: { threadId: v.id('salesConciergeThreads') },
	handler: async (ctx, { threadId }) => {
		const thread = await ctx.db.get(threadId);
		if (!thread || (thread.salesUserId !== ctx.user._id && ctx.staffRole !== 'super_admin')) {
			return [];
		}
		return await ctx.db
			.query('salesConciergeMessages')
			.withIndex('by_thread_and_time', (q) => q.eq('threadId', threadId))
			.order('asc')
			.collect();
	}
});

export const createThread = salesMutation({
	args: {
		organizationId: v.optional(v.id('organizations')),
		prospectId: v.optional(v.id('salesProspects'))
	},
	handler: async (ctx, { organizationId, prospectId }) => {
		return await ctx.db.insert('salesConciergeThreads', {
			salesUserId: ctx.user._id,
			organizationId,
			prospectId,
			conciergeUserIds: [],
			lastMessageAt: Date.now(),
			unreadBySales: false,
			unreadByConcierge: true
		});
	}
});

export const sendMessage = salesMutation({
	args: {
		threadId: v.id('salesConciergeThreads'),
		content: v.string(),
		taggedEntityId: v.optional(v.string()),
		taggedEntityName: v.optional(v.string())
	},
	handler: async (ctx, { threadId, content, taggedEntityId, taggedEntityName }) => {
		const thread = await ctx.db.get(threadId);
		if (!thread || (thread.salesUserId !== ctx.user._id && ctx.staffRole !== 'super_admin')) {
			throw new Error('Thread non trouvé');
		}
		await ctx.db.insert('salesConciergeMessages', {
			threadId,
			authorId: ctx.user._id,
			authorRole: ctx.staffRole === 'super_admin' ? 'super_admin' : 'sales',
			content,
			taggedEntityId,
			taggedEntityName,
			createdAt: Date.now()
		});
		await ctx.db.patch(threadId, { lastMessageAt: Date.now(), unreadByConcierge: true });
	}
});

// ── Côté concierge (réponse aux commerciaux) ─────────────────────────────────

export const listConciergeThreads = conciergeQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query('salesConciergeThreads').order('desc').collect();
	}
});

export const replyToThread = conciergeMutation({
	args: {
		threadId: v.id('salesConciergeThreads'),
		content: v.string()
	},
	handler: async (ctx, { threadId, content }) => {
		const thread = await ctx.db.get(threadId);
		if (!thread) throw new Error('Thread non trouvé');
		await ctx.db.insert('salesConciergeMessages', {
			threadId,
			authorId: ctx.user._id,
			authorRole: ctx.staffRole === 'super_admin' ? 'super_admin' : 'concierge',
			content,
			createdAt: Date.now()
		});
		await ctx.db.patch(threadId, {
			lastMessageAt: Date.now(),
			unreadBySales: true,
			conciergeUserIds: [...new Set([...thread.conciergeUserIds, ctx.user._id])]
		});
	}
});

export const markThreadReadBySales = salesMutation({
	args: { threadId: v.id('salesConciergeThreads') },
	handler: async (ctx, { threadId }) => {
		const thread = await ctx.db.get(threadId);
		if (!thread || (thread.salesUserId !== ctx.user._id && ctx.staffRole !== 'super_admin')) return;
		await ctx.db.patch(threadId, { unreadBySales: false });
	}
});
