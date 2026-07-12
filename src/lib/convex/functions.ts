/**
 * Custom Convex function builders with built-in authorization
 *
 * These wrappers provide type-safe authentication and authorization
 * following the official Convex pattern from convex-helpers.
 *
 * @see https://stack.convex.dev/custom-functions
 */
import { customQuery, customMutation, customCtx } from 'convex-helpers/server/customFunctions';
import { ConvexError } from 'convex/values';
import { query, mutation } from './_generated/server';
import { authComponent } from './auth';
import type { BetterAuthUser } from './admin/types';

/**
 * Query that requires any authenticated user
 *
 * Usage:
 * ```ts
 * export const myQuery = authedQuery({
 *   args: { ... },
 *   handler: async (ctx, args) => {
 *     // ctx.user is typed as BetterAuthUser
 *   }
 * });
 * ```
 */
export const authedQuery = customQuery(
	query,
	customCtx(async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as BetterAuthUser | null;
		if (!user) {
			throw new ConvexError('Authentication required');
		}
		return { user };
	})
);

/**
 * Mutation that requires any authenticated user
 */
export const authedMutation = customMutation(
	mutation,
	customCtx(async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as BetterAuthUser | null;
		if (!user) {
			throw new ConvexError('Authentication required');
		}
		return { user };
	})
);

/**
 * Query that requires admin role
 *
 * Usage:
 * ```ts
 * export const adminOnlyQuery = adminQuery({
 *   args: { ... },
 *   handler: async (ctx, args) => {
 *     // ctx.user is typed as BetterAuthUser with role='admin'
 *   }
 * });
 * ```
 */
export const adminQuery = customQuery(
	query,
	customCtx(async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as BetterAuthUser | null;
		if (!user || user.role !== 'admin') {
			throw new ConvexError('Unauthorized: Admin access required');
		}
		return { user };
	})
);

/**
 * Mutation that requires admin role
 */
export const adminMutation = customMutation(
	mutation,
	customCtx(async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as BetterAuthUser | null;
		if (!user || user.role !== 'admin') {
			throw new ConvexError('Unauthorized: Admin access required');
		}
		return { user };
	})
);

// ─── Mycelium internal staff guards ──────────────────────────────────────────
//
// Two-level security:
//   Level 1 — JWT role='admin'  : "vous êtes staff Mycelium"        (sans DB)
//   Level 2 — myceliumStaff row : "votre niveau d'accès interne"    (1 DB lookup)
//
// Bootstrap : si myceliumStaff est vide et role='admin' → super_admin implicite
// (cas du tout premier fondateur avant que le système soit initialisé).
//
// Jamais accessible aux ORG_ADMIN clients — role Better Auth 'admin' leur est
// strictement interdit (seuls les comptes Mycelium l'obtiennent via setUserRole).

// Lookup dans myceliumStaff — cast any nécessaire jusqu'à ce que `convex dev`
// régénère les types après l'ajout de la table dans schema.ts.
// Table intentionnellement petite (<50 lignes) : collect+find est acceptable.
async function resolveStaffRole(
	ctx: any,
	user: BetterAuthUser
): Promise<'super_admin' | 'concierge' | 'sales' | null> {
	const allStaff = (await ctx.db.query('myceliumStaff').collect()) as Array<{
		userId: string;
		staffRole: 'super_admin' | 'concierge' | 'sales';
	}>;

	const record = allStaff.find((r) => r.userId === user._id);
	if (record) return record.staffRole;

	// Bootstrap : table vide → premier admin fondateur = super_admin implicite
	if (allStaff.length === 0) return 'super_admin';

	return null; // admin Better Auth sans fiche staff = accès refusé
}

/**
 * Query réservée aux super admins Mycelium (fondateurs, direction technique).
 * Donne accès à toutes les données et actions sensibles cross-org.
 */
export const superAdminQuery = customQuery(
	query,
	customCtx(async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as BetterAuthUser | null;
		if (!user || user.role !== 'admin') {
			throw new ConvexError('Unauthorized: Mycelium staff access required');
		}
		const staffRole = await resolveStaffRole(ctx, user);
		if (staffRole !== 'super_admin') {
			throw new ConvexError('Unauthorized: Super Admin access required');
		}
		return { user, staffRole };
	})
);

/**
 * Mutation réservée aux super admins Mycelium.
 */
export const superAdminMutation = customMutation(
	mutation,
	customCtx(async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as BetterAuthUser | null;
		if (!user || user.role !== 'admin') {
			throw new ConvexError('Unauthorized: Mycelium staff access required');
		}
		const staffRole = await resolveStaffRole(ctx, user);
		if (staffRole !== 'super_admin') {
			throw new ConvexError('Unauthorized: Super Admin access required');
		}
		return { user, staffRole };
	})
);

/**
 * Query accessible aux concierges ET aux super admins Mycelium.
 * Usage : dashboard concierge, gestion tâches clients.
 */
export const conciergeQuery = customQuery(
	query,
	customCtx(async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as BetterAuthUser | null;
		if (!user || user.role !== 'admin') {
			throw new ConvexError('Unauthorized: Mycelium staff access required');
		}
		const staffRole = await resolveStaffRole(ctx, user);
		if (!staffRole) {
			throw new ConvexError('Unauthorized: Concierge or Super Admin access required');
		}
		return { user, staffRole };
	})
);

/**
 * Mutation accessible aux concierges ET aux super admins Mycelium.
 */
export const conciergeMutation = customMutation(
	mutation,
	customCtx(async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as BetterAuthUser | null;
		if (!user || user.role !== 'admin') {
			throw new ConvexError('Unauthorized: Mycelium staff access required');
		}
		const staffRole = await resolveStaffRole(ctx, user);
		if (!staffRole) {
			throw new ConvexError('Unauthorized: Concierge or Super Admin access required');
		}
		return { user, staffRole };
	})
);

/**
 * Query accessible aux commerciaux ET aux super admins Mycelium.
 * Usage : pipeline prospects, chat sales↔concierge.
 */
export const salesQuery = customQuery(
	query,
	customCtx(async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as BetterAuthUser | null;
		if (!user || user.role !== 'admin') {
			throw new ConvexError('Unauthorized: Mycelium staff access required');
		}
		const staffRole = await resolveStaffRole(ctx, user);
		if (staffRole !== 'sales' && staffRole !== 'super_admin') {
			throw new ConvexError("Accès réservé à l'équipe commerciale");
		}
		return { user, staffRole };
	})
);

/**
 * Mutation accessible aux commerciaux ET aux super admins Mycelium.
 */
export const salesMutation = customMutation(
	mutation,
	customCtx(async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as BetterAuthUser | null;
		if (!user || user.role !== 'admin') {
			throw new ConvexError('Unauthorized: Mycelium staff access required');
		}
		const staffRole = await resolveStaffRole(ctx, user);
		if (staffRole !== 'sales' && staffRole !== 'super_admin') {
			throw new ConvexError("Accès réservé à l'équipe commerciale");
		}
		return { user, staffRole };
	})
);
