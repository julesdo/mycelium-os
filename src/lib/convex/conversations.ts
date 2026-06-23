import { v, ConvexError } from 'convex/values';
import { internalMutation } from './_generated/server';
import { authedQuery, authedMutation } from './functions';

export const getCurrentConversation = authedQuery({
	args: {},
	handler: async (ctx) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile || !profile.currentOrganizationId) return null;

		const conversation = await ctx.db
			.query('conversations')
			.withIndex('by_user_recent', (q) => q.eq('userId', ctx.user._id))
			.order('desc')
			.first();

		if (!conversation || conversation.organizationId !== profile.currentOrganizationId) {
			return null;
		}

		return conversation;
	}
});

export const startNewConversation = authedMutation({
	args: {},
	handler: async (ctx) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile || !profile.currentOrganizationId) throw new ConvexError('Aucune organisation active');

		const now = Date.now();
		return ctx.db.insert('conversations', {
			organizationId: profile.currentOrganizationId,
			userId: ctx.user._id,
			messages: [],
			createdAt: now,
			updatedAt: now
		});
	}
});

export const appendMessage = internalMutation({
	args: {
		conversationId: v.id('conversations'),
		role: v.union(v.literal('user'), v.literal('assistant')),
		content: v.string(),
		toolCalls: v.optional(
			v.array(
				v.object({
					name: v.string(),
					input: v.string(),
					output: v.optional(v.string())
				})
			)
		)
	},
	handler: async (ctx, args) => {
		const conversation = await ctx.db.get(args.conversationId);
		if (!conversation) throw new ConvexError('Conversation introuvable');

		await ctx.db.patch(args.conversationId, {
			messages: [
				...conversation.messages,
				{
					role: args.role,
					content: args.content,
					timestamp: Date.now(),
					toolCalls: args.toolCalls
				}
			],
			updatedAt: Date.now()
		});
	}
});
