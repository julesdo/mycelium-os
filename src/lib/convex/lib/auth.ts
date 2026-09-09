import { ConvexError } from 'convex/values';
import type { GenericQueryCtx, GenericMutationCtx } from 'convex/server';
import type { DataModel, Doc, Id } from '../_generated/dataModel';
import { authComponent } from '../auth';

type MutationCtx = GenericMutationCtx<DataModel>;
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
 * L'établissement sur lequel ce compte travaille — **vérifié, pas cru**.
 *
 * Un compte peut appartenir à plusieurs établissements — un groupe de cliniques,
 * un gestionnaire multi-sites — et `userProfiles.currentOrganizationId` dit
 * lequel est ouvert. Toutes les fonctions du domaine passent par ici, pour qu'il
 * n'existe qu'une seule façon de répondre à « de quelle organisation parle-t-on ».
 *
 * ⚠️ ET C'EST EXACTEMENT POUR ÇA QUE L'APPARTENANCE SE REVÉRIFIE ICI. Ce champ
 * décidait à lui seul quelles factures un compte peut lire, et la barrière
 * multi-tenant reposait donc sur la correction de chaque écrivain du champ, pas
 * sur une vérification au point d'usage. `switchOrganization` appelait bien
 * `requireOrgMember` — mais `platformSwitchOrganization`, réservée au rôle
 * `admin` hérité de Fleet, le contournait EXPRÈS : elle posait n'importe quelle
 * organisation dans le profil, et toutes les lectures suivaient. Cette fonction
 * a été retirée ; la vérification reste, parce qu'une convention tenue à N
 * endroits n'est pas une barrière.
 *
 * Elle couvre aussi le compte RETIRÉ de l'établissement depuis : `recalerProfil`
 * ne passe que sur les chemins qui pensent à l'appeler.
 *
 * Le coût est d'UNE lecture d'index, sur `by_org_and_user`. C'est le prix de
 * l'invariant le plus lourd du produit.
 */
export async function organisationCourante(ctx: Ctx, userId: string): Promise<Id<'organizations'>> {
	const profile = await ctx.db
		.query('userProfiles')
		.withIndex('by_userId', (q) => q.eq('userId', userId))
		.unique();

	const orgId = profile?.currentOrganizationId;
	if (!orgId) throw new ConvexError('Aucun établissement actif');

	await requireOrgMember(ctx, orgId, userId);
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

/**
 * Le même établissement, mais `null` plutôt qu'une exception.
 *
 * Pour les écrans qui doivent afficher quelque chose de sensé à un compte qui
 * n'a pas encore d'établissement — l'accueil après inscription, l'écran
 * d'équipe. La VÉRIFICATION D'APPARTENANCE EST LA MÊME : ce qui change est la
 * façon d'en rendre compte, pas la barrière.
 */
export async function organisationCouranteOuNull(
	ctx: Ctx,
	userId: string
): Promise<Id<'organizations'> | null> {
	const profile = await ctx.db
		.query('userProfiles')
		.withIndex('by_userId', (q) => q.eq('userId', userId))
		.unique();

	const orgId = profile?.currentOrganizationId;
	if (!orgId) return null;

	const appartenance = await ctx.db
		.query('organizationMembers')
		.withIndex('by_org_and_user', (q) => q.eq('organizationId', orgId).eq('userId', userId))
		.unique();
	return appartenance === null ? null : orgId;
}

/**
 * Un compte qui perd son établissement courant doit en retrouver un autre, ou
 * aucun — jamais celui qui vient de disparaître.
 *
 * ⚠️ C'EST LE SEUL ENDROIT DU PRODUIT QUI LIT `currentOrganizationId` SANS
 * VÉRIFIER L'APPARTENANCE, et il le fait pour la RETIRER. Vérifier ici serait
 * absurde : l'appartenance vient précisément d'être supprimée. Le test
 * « une seule façon de savoir de quel établissement on parle » exempte donc ce
 * fichier, et lui seul.
 *
 * Sans ce recalage, le compte retrouve un espace dont toutes les requêtes lui
 * répondent « accès refusé », ce qui se lit comme une panne.
 */
export async function recalerProfil(
	ctx: MutationCtx,
	userId: string,
	quitte: Id<'organizations'>
): Promise<void> {
	const profile = await ctx.db
		.query('userProfiles')
		.withIndex('by_userId', (q) => q.eq('userId', userId))
		.unique();
	if (!profile || profile.currentOrganizationId !== quitte) return;

	const autre = await ctx.db
		.query('organizationMembers')
		.withIndex('by_user', (q) => q.eq('userId', userId))
		.first();
	await ctx.db.patch(profile._id, {
		currentOrganizationId: autre?.organizationId ?? undefined
	});
}
