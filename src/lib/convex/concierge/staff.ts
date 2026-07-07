import { v, ConvexError } from 'convex/values';
import { superAdminQuery, superAdminMutation, conciergeQuery, conciergeMutation, authedQuery } from '../functions';
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

		// ── Détacher l'utilisateur de toutes les organisations clientes ───────
		// Un membre du staff Mycelium ne doit appartenir à aucune org client.
		const memberships = await ctx.db
			.query('organizationMembers')
			.withIndex('by_user', (q) => q.eq('userId', user._id))
			.collect();
		for (const m of memberships) {
			await ctx.db.delete(m._id);
		}

		// Effacer currentOrganizationId dans userProfile s'il existe
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', user._id))
			.unique();
		if (profile?.currentOrganizationId) {
			await ctx.db.patch(profile._id, { currentOrganizationId: undefined });
		}

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

// ─── Profil concierge ─────────────────────────────────────────────────────────

export const getMyStaffProfile = conciergeQuery({
	args: {},
	handler: async (ctx) => {
		return ctx.db
			.query('myceliumStaff')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
	}
});

export const updateMyProfile = conciergeMutation({
	args: {
		specialty: v.optional(v.union(
			v.literal('fleet_ops'),
			v.literal('compliance'),
			v.literal('finance'),
			v.literal('generalist')
		)),
		availabilityStatus: v.optional(v.union(
			v.literal('online'),
			v.literal('busy'),
			v.literal('offline')
		)),
		bio: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const record = await ctx.db
			.query('myceliumStaff')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!record) throw new ConvexError('Profil staff introuvable.');

		const patch: Record<string, unknown> = {};
		if (args.specialty !== undefined) patch.specialty = args.specialty;
		if (args.availabilityStatus !== undefined) patch.availabilityStatus = args.availabilityStatus;
		if (args.bio !== undefined) patch.bio = args.bio;

		await ctx.db.patch(record._id, patch);
		return { success: true };
	}
});

export const generateAvatarUploadUrl = conciergeMutation({
	args: {},
	handler: async (ctx) => ctx.storage.generateUploadUrl()
});

export const saveAvatarUrl = conciergeMutation({
	args: { storageId: v.id('_storage') },
	handler: async (ctx, args) => {
		const record = await ctx.db
			.query('myceliumStaff')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!record) throw new ConvexError('Profil staff introuvable.');

		// Supprime l'ancien avatar si existant
		if (record.avatarStorageId) {
			await ctx.storage.delete(record.avatarStorageId).catch(() => null);
		}

		const avatarUrl = await ctx.storage.getUrl(args.storageId);
		await ctx.db.patch(record._id, { avatarStorageId: args.storageId, avatarUrl: avatarUrl ?? undefined });
		return { avatarUrl };
	}
});

// ─── Query client-facing : concierge disponible pour une org ─────────────────
// Utilisée par le CopilotPanel pour afficher la carte concierge humain.

export const getAvailableConciergeForOrg = authedQuery({
	args: {},
	handler: async (ctx) => {
		// Priorité : online > busy > offline
		const allStaff = await ctx.db.query('myceliumStaff').collect();

		const priorityOrder = { online: 0, busy: 1, offline: 2, undefined: 3 };
		const sorted = allStaff
			.filter((s) => s.availabilityStatus !== 'offline')
			.sort((a, b) => {
				const pa = priorityOrder[a.availabilityStatus ?? 'undefined'];
				const pb = priorityOrder[b.availabilityStatus ?? 'undefined'];
				return pa - pb;
			});

		const best = sorted[0] ?? null;
		if (!best) return null;

		return {
			name: best.name,
			avatarUrl: best.avatarUrl ?? null,
			specialty: best.specialty ?? 'generalist',
			availabilityStatus: best.availabilityStatus ?? 'offline',
			bio: best.bio ?? null
		};
	}
});
