import { ConvexError } from 'convex/values';
import type { GenericQueryCtx, GenericMutationCtx } from 'convex/server';
import type { DataModel, Doc, Id } from '../_generated/dataModel';
import { authComponent } from '../auth';

type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

export async function getUserOrg(ctx: Ctx) {
	const user = await authComponent.getAuthUser(ctx);
	if (!user) throw new ConvexError('Not authenticated');

	const organizationId = await organisationCourante(ctx, user._id);
	const org = await ctx.db.get(organizationId);
	if (!org) throw new ConvexError('Organization not found');

	return { user, org, organizationId };
}

/**
 * L'établissement sur lequel ce compte travaille.
 *
 * Un compte peut appartenir à plusieurs établissements — un groupe de cliniques,
 * un gestionnaire multi-sites — et `userProfiles.currentOrganizationId` dit
 * lequel est ouvert. Toutes les fonctions du domaine passent par ici, pour qu'il
 * n'existe qu'une seule façon de répondre à « de quelle organisation parle-t-on ».
 */
export async function organisationCourante(ctx: Ctx, userId: string): Promise<Id<'organizations'>> {
	const profile = await ctx.db
		.query('userProfiles')
		.withIndex('by_userId', (q) => q.eq('userId', userId))
		.unique();

	const orgId = profile?.currentOrganizationId;
	if (!orgId) throw new ConvexError('Aucun établissement actif');
	return orgId;
}

/**
 * L'appartenance à un établissement — la barrière du cloisonnement multi-tenant.
 *
 * Elle vient AVANT le rôle, et elle vaut pour la lecture comme pour l'écriture :
 * sans elle, connaître un identifiant d'organisation suffirait à lire les
 * factures d'un autre client.
 */
export async function requireOrgMember(
	ctx: Ctx,
	organizationId: Id<'organizations'>,
	userId: string
): Promise<Doc<'organizationMembers'>> {
	const membership = await ctx.db
		.query('organizationMembers')
		.withIndex('by_org_and_user', (q) =>
			q.eq('organizationId', organizationId).eq('userId', userId)
		)
		.unique();

	if (!membership) {
		throw new ConvexError("Accès refusé : vous n'êtes pas membre de cet établissement");
	}
	return membership;
}

/**
 * Le rôle d'administrateur, exigé.
 *
 * POURQUOI CETTE FONCTION EXISTE, ET POURQUOI ELLE EST APPELÉE PARTOUT DEPUIS.
 * Le contrôle était recopié à la main dans huit fonctions de `organizations.ts`,
 * en dix lignes identiques à chaque fois. Un contrôle recopié n'est pas un
 * contrôle : il suffit qu'une neuvième fonction soit écrite sans lui pour que la
 * séparation des rôles cesse d'exister, et rien dans le code ne le signalerait.
 * L'annexe de sécurité de l'accord de sous-traitance nomme cette dette ; elle
 * est soldée ici.
 *
 * Elle renvoie l'appartenance, pour que l'appelant n'ait pas à la relire.
 */
export async function requireOrgAdmin(
	ctx: Ctx,
	organizationId: Id<'organizations'>,
	userId: string
): Promise<Doc<'organizationMembers'>> {
	const membership = await requireOrgMember(ctx, organizationId, userId);

	if (membership.role !== 'ORG_ADMIN') {
		throw new ConvexError(
			'Accès refusé : seul un administrateur de l’établissement peut effectuer cette action'
		);
	}
	return membership;
}

/**
 * L'établissement courant ET le rôle d'administrateur, en un seul appel.
 *
 * C'est la forme qu'appellent presque toutes les mutations d'administration :
 * elles n'ont jamais besoin de l'organisation avant d'avoir vérifié le rôle.
 */
export async function requireAdminDeLOrgCourante(
	ctx: Ctx,
	userId: string
): Promise<Id<'organizations'>> {
	const organizationId = await organisationCourante(ctx, userId);
	await requireOrgAdmin(ctx, organizationId, userId);
	return organizationId;
}
