import { v } from 'convex/values';
import { query, mutation } from '../_generated/server';

export const getByToken = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const record = await ctx.db
			.query('demoAccessTokens')
			.withIndex('by_token', (q) => q.eq('token', token))
			.unique();

		if (!record) return null;

		const org = await ctx.db.get(record.organizationId);
		if (!org || !org.isDemo) return null;

		const config = org.demoConfig;
		if (!config) return null;

		if (config.isExpired || config.expiresAt < Date.now()) return null;

		return {
			tokenId: record._id,
			organizationId: record.organizationId,
			orgName: org.name,
			expiresAt: config.expiresAt,
			commercialName: config.commercialName,
			commercialPhone: config.commercialPhone,
			commercialCalendlyUrl: config.commercialCalendlyUrl ?? null,
			templateId: config.templateId
		};
	}
});

export const markTokenUsed = mutation({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const record = await ctx.db
			.query('demoAccessTokens')
			.withIndex('by_token', (q) => q.eq('token', token))
			.unique();

		if (!record) return;

		await ctx.db.patch(record._id, {
			lastUsedAt: Date.now(),
			usedCount: record.usedCount + 1
		});
	}
});
