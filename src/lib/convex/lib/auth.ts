import { ConvexError } from 'convex/values';
import type { GenericQueryCtx, GenericMutationCtx } from 'convex/server';
import type { DataModel, Id } from '../_generated/dataModel';
import { authComponent } from '../auth';

export async function getUserOrg(
	ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>
) {
	const user = await authComponent.getAuthUser(ctx);
	if (!user) throw new ConvexError('Not authenticated');

	const profile = await ctx.db
		.query('userProfiles')
		.withIndex('by_userId', (q) => q.eq('userId', user._id))
		.unique();

	const orgId = profile?.currentOrganizationId;
	if (!orgId) throw new ConvexError('No organization selected');

	const org = await ctx.db.get(orgId);
	if (!org) throw new ConvexError('Organization not found');

	return { user, org, organizationId: orgId };
}

export async function requireOrgAdmin(
	ctx: GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>,
	organizationId: Id<'organizations'>,
	userId: string
) {
	const membership = await ctx.db
		.query('organizationMembers')
		.withIndex('by_org_and_user', (q) =>
			q.eq('organizationId', organizationId).eq('userId', userId)
		)
		.unique();

	if (!membership || membership.role !== 'ORG_ADMIN') {
		throw new ConvexError('Acces refuse : seul un ORG_ADMIN peut effectuer cette action');
	}
}
