import { v, ConvexError } from 'convex/values';
import { superAdminQuery, superAdminMutation } from '../functions';
import { components } from '../_generated/api';

// Gestion du staff interne Mycelium — super_admin seulement.
// Ces fonctions ne sont jamais accessibles aux clients.

export const listMyceliumStaff = superAdminQuery({
	args: {},
	handler: async (ctx) => {
		const staff = await ctx.db.query('myceliumStaff').collect();
		return staff.sort((a, b) => {
			// super_admin en premier, puis par date d'ajout
			if (a.staffRole === 'super_admin' && b.staffRole !== 'super_admin') return -1;
			if (a.staffRole !== 'super_admin' && b.staffRole === 'super_admin') return 1;
			return a.addedAt - b.addedAt;
		});
	}
});

export const addStaffMember = superAdminMutation({
	args: {
		email: v.string(),
		staffRole: v.union(v.literal('super_admin'), v.literal('concierge'))
	},
	handler: async (ctx, args) => {
		// Cherche l'utilisateur par email dans la table Better Auth
		const usersResult = await ctx.runQuery(components.betterAuth.adapter.findMany, {
			model: 'user',
			paginationOpts: { cursor: null, numItems: 1 },
			where: [{ field: 'email', operator: 'eq', value: args.email.toLowerCase().trim() }]
		});

		const user = (
			usersResult as {
				page: Array<{ _id: string; email: string; name: string; role?: string | null }>;
			}
		).page[0];
		if (!user) {
			throw new ConvexError(
				"Aucun compte trouvé avec cet email. L'utilisateur doit d'abord créer son compte."
			);
		}

		// Vérifie qu'il n'est pas déjà staff
		const existing = await ctx.db
			.query('myceliumStaff')
			.withIndex('by_userId', (q) => q.eq('userId', user._id))
			.unique();
		if (existing) {
			throw new ConvexError('Cet utilisateur est déjà membre du staff Mycelium.');
		}

		// Empêche d'agir sur son propre compte
		if (user._id === ctx.user._id) {
			throw new ConvexError('Vous ne pouvez pas vous ajouter vous-même via cette interface.');
		}

		// Élève le rôle Better Auth à 'admin' (premier filtre JWT)
		await ctx.runMutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: 'user',
				where: [{ field: '_id', operator: 'eq', value: user._id }],
				update: { role: 'admin' }
			}
		});

		// Crée la fiche staff (deuxième filtre)
		await ctx.db.insert('myceliumStaff', {
			userId: user._id,
			staffRole: args.staffRole,
			email: user.email,
			name: user.name ?? user.email,
			addedBy: ctx.user._id,
			addedAt: Date.now()
		});

		return { success: true };
	}
});

export const updateStaffRole = superAdminMutation({
	args: {
		userId: v.string(),
		staffRole: v.union(v.literal('super_admin'), v.literal('concierge'))
	},
	handler: async (ctx, args) => {
		if (args.userId === ctx.user._id) {
			throw new ConvexError('Vous ne pouvez pas modifier votre propre rôle.');
		}

		const record = await ctx.db
			.query('myceliumStaff')
			.withIndex('by_userId', (q) => q.eq('userId', args.userId))
			.unique();
		if (!record) {
			throw new ConvexError('Membre staff introuvable.');
		}

		await ctx.db.patch(record._id, { staffRole: args.staffRole });
		return { success: true };
	}
});

export const removeStaffMember = superAdminMutation({
	args: { userId: v.string() },
	handler: async (ctx, args) => {
		if (args.userId === ctx.user._id) {
			throw new ConvexError('Vous ne pouvez pas vous retirer vous-même.');
		}

		const record = await ctx.db
			.query('myceliumStaff')
			.withIndex('by_userId', (q) => q.eq('userId', args.userId))
			.unique();
		if (!record) {
			throw new ConvexError('Membre staff introuvable.');
		}

		// Supprime la fiche staff
		await ctx.db.delete(record._id);

		// Rétrograde le rôle Better Auth à 'user'
		await ctx.runMutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: 'user',
				where: [{ field: '_id', operator: 'eq', value: args.userId }],
				update: { role: 'user' }
			}
		});

		return { success: true };
	}
});
