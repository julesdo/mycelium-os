import { v, ConvexError } from 'convex/values';
import { authedMutation } from '../functions';

export const connectUserToDemoOrg = authedMutation({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const record = await ctx.db
			.query('demoAccessTokens')
			.withIndex('by_token', (q) => q.eq('token', token))
			.unique();

		if (!record) throw new ConvexError('Token invalide ou expiré');

		const org = await ctx.db.get(record.organizationId);
		if (!org || !org.isDemo) throw new ConvexError('Organisation démo introuvable');

		const config = org.demoConfig;
		if (!config || config.isExpired || config.expiresAt < Date.now()) {
			throw new ConvexError('Cette démo a expiré');
		}

		// Idempotent: already a member → just update currentOrg
		const existingMember = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', record.organizationId).eq('userId', ctx.user._id)
			)
			.unique();

		if (!existingMember) {
			await ctx.db.insert('organizationMembers', {
				organizationId: record.organizationId,
				userId: ctx.user._id,
				role: 'ORG_ADMIN',
				joinedAt: Date.now()
			});
		}

		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();

		if (profile) {
			await ctx.db.patch(profile._id, { currentOrganizationId: record.organizationId });
		} else {
			await ctx.db.insert('userProfiles', {
				userId: ctx.user._id,
				currentOrganizationId: record.organizationId
			});
		}

		await ctx.db.patch(record._id, {
			lastUsedAt: Date.now(),
			usedCount: record.usedCount + 1
		});

		return { organizationId: record.organizationId };
	}
});
