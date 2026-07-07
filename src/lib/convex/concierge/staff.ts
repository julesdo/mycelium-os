import { v, ConvexError } from 'convex/values';
import { superAdminQuery, superAdminMutation, conciergeQuery, conciergeMutation, authedQuery, authedMutation } from '../functions';
import { components } from '../_generated/api';
import { query } from '../_generated/server';

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

// ─── Accès org par concierge ─────────────────────────────────────────────────

export const assignOrgToConcierge = superAdminMutation({
	args: {
		conciergeUserId: v.string(),
		organizationId: v.id('organizations')
	},
	handler: async (ctx, args) => {
		// Vérifie que c'est bien un concierge (pas super_admin)
		const staff = await ctx.db
			.query('myceliumStaff')
			.withIndex('by_userId', (q) => q.eq('userId', args.conciergeUserId))
			.unique();
		if (!staff) throw new ConvexError('Membre staff introuvable.');
		if (staff.staffRole !== 'concierge') {
			throw new ConvexError('Les super admins ont déjà accès à toutes les orgs.');
		}

		// Évite les doublons
		const existing = await ctx.db
			.query('conciergeOrgAccess')
			.withIndex('by_concierge_and_org', (q) =>
				q.eq('conciergeUserId', args.conciergeUserId).eq('organizationId', args.organizationId)
			)
			.unique();
		if (existing) return { success: true };

		await ctx.db.insert('conciergeOrgAccess', {
			conciergeUserId: args.conciergeUserId,
			organizationId: args.organizationId,
			assignedAt: Date.now(),
			assignedBy: ctx.user._id
		});
		return { success: true };
	}
});

export const removeOrgFromConcierge = superAdminMutation({
	args: {
		conciergeUserId: v.string(),
		organizationId: v.id('organizations')
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('conciergeOrgAccess')
			.withIndex('by_concierge_and_org', (q) =>
				q.eq('conciergeUserId', args.conciergeUserId).eq('organizationId', args.organizationId)
			)
			.unique();
		if (existing) await ctx.db.delete(existing._id);
		return { success: true };
	}
});

export const listConciergeOrgAccess = superAdminQuery({
	args: { conciergeUserId: v.string() },
	handler: async (ctx, args) => {
		const accesses = await ctx.db
			.query('conciergeOrgAccess')
			.withIndex('by_concierge', (q) => q.eq('conciergeUserId', args.conciergeUserId))
			.collect();

		const orgs = await Promise.all(
			accesses.map(async (a) => {
				const org = await ctx.db.get(a.organizationId);
				return org ? { ...a, orgName: org.name, country: org.country ?? null } : null;
			})
		);
		return orgs.filter(Boolean);
	}
});

// Retourne les orgs accessibles pour l'utilisateur courant :
// - super_admin → toutes les orgs
// - concierge → uniquement les orgs assignées
export const getMyAccessibleOrgs = authedQuery({
	args: {},
	handler: async (ctx) => {
		// Vérification rôle staff
		const allStaff = await ctx.db.query('myceliumStaff').collect();
		const record = allStaff.find((r) => r.userId === ctx.user._id);
		const staffRole = record?.staffRole ?? (allStaff.length === 0 ? 'super_admin' : null);

		if (!staffRole) return null; // Pas staff → pas d'accès

		if (staffRole === 'super_admin') {
			const orgs = await ctx.db.query('organizations').collect();
			return orgs.map((o) => ({ _id: o._id, name: o.name, country: o.country ?? null, tier: o.paddlePlanTier ?? 'essential' }));
		}

		// Concierge : orgs assignées seulement
		const accesses = await ctx.db
			.query('conciergeOrgAccess')
			.withIndex('by_concierge', (q) => q.eq('conciergeUserId', ctx.user._id))
			.collect();

		const orgs = await Promise.all(accesses.map((a) => ctx.db.get(a.organizationId)));
		return orgs
			.filter(Boolean)
			.map((o) => ({ _id: o!._id, name: o!.name, country: o!.country ?? null, tier: o!.paddlePlanTier ?? 'essential' }));
	}
});

// ─── Invitations staff ────────────────────────────────────────────────────────

function generateToken(): string {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export const createStaffInvitation = superAdminMutation({
	args: {
		staffRole: v.union(v.literal('super_admin'), v.literal('concierge')),
		invitedEmail: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const token = generateToken();
		await ctx.db.insert('staffInvitations', {
			token,
			staffRole: args.staffRole,
			invitedBy: ctx.user._id,
			invitedByName: ctx.user.name ?? ctx.user.email ?? 'Super Admin',
			invitedEmail: args.invitedEmail?.toLowerCase().trim() || undefined,
			createdAt: Date.now(),
			expiresAt: Date.now() + SEVEN_DAYS
		});
		return { token };
	}
});

export const listStaffInvitations = superAdminQuery({
	args: {},
	handler: async (ctx) => {
		const all = await ctx.db
			.query('staffInvitations')
			.withIndex('by_inviter', (q) => q.eq('invitedBy', ctx.user._id))
			.order('desc')
			.collect();
		// Retourne uniquement les invitations valides (non utilisées, non expirées)
		const now = Date.now();
		return all.filter((i) => !i.usedAt && i.expiresAt > now);
	}
});

export const revokeStaffInvitation = superAdminMutation({
	args: { invitationId: v.id('staffInvitations') },
	handler: async (ctx, args) => {
		const inv = await ctx.db.get(args.invitationId);
		if (!inv) throw new ConvexError('Invitation introuvable.');
		await ctx.db.delete(args.invitationId);
	}
});

// Query publique — accessible sans authentification (page /staff-join/[token])
export const getStaffInvitationByToken = query({
	args: { token: v.string() },
	handler: async (ctx, args) => {
		if (!args.token || args.token.length !== 64) return null;
		const inv = await ctx.db
			.query('staffInvitations')
			.withIndex('by_token', (q) => q.eq('token', args.token))
			.unique();
		if (!inv) return null;
		if (inv.usedAt) return { status: 'used' as const };
		if (inv.expiresAt < Date.now()) return { status: 'expired' as const };
		return {
			status: 'valid' as const,
			staffRole: inv.staffRole,
			invitedByName: inv.invitedByName,
			invitedEmail: inv.invitedEmail ?? null,
			expiresAt: inv.expiresAt
		};
	}
});

export const acceptStaffInvitation = authedMutation({
	args: { token: v.string() },
	handler: async (ctx, args) => {
		const inv = await ctx.db
			.query('staffInvitations')
			.withIndex('by_token', (q) => q.eq('token', args.token))
			.unique();

		if (!inv) throw new ConvexError('Invitation introuvable ou invalide.');
		if (inv.usedAt) throw new ConvexError('Cette invitation a déjà été utilisée.');
		if (inv.expiresAt < Date.now()) throw new ConvexError('Cette invitation a expiré.');

		// Si l'invitation est restreinte à un email, vérifier la correspondance
		if (inv.invitedEmail && inv.invitedEmail !== ctx.user.email?.toLowerCase()) {
			throw new ConvexError(
				`Cette invitation est réservée à ${inv.invitedEmail}. Connectez-vous avec ce compte.`
			);
		}

		// Vérifier qu'il n'est pas déjà staff
		const existing = await ctx.db
			.query('myceliumStaff')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (existing) throw new ConvexError('Vous êtes déjà membre du staff Mycelium.');

		// Élever le rôle Better Auth à 'admin'
		await ctx.runMutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: 'user',
				where: [{ field: '_id', operator: 'eq', value: ctx.user._id }],
				update: { role: 'admin' }
			}
		});

		// Détacher des organisations clientes
		const memberships = await ctx.db
			.query('organizationMembers')
			.withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
			.collect();
		for (const m of memberships) await ctx.db.delete(m._id);

		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (profile?.currentOrganizationId) {
			await ctx.db.patch(profile._id, { currentOrganizationId: undefined });
		}

		// Créer la fiche staff
		await ctx.db.insert('myceliumStaff', {
			userId: ctx.user._id,
			staffRole: inv.staffRole,
			email: ctx.user.email ?? '',
			name: ctx.user.name ?? ctx.user.email ?? 'Staff Mycelium',
			addedBy: inv.invitedBy,
			addedAt: Date.now()
		});

		// Marquer l'invitation comme utilisée
		await ctx.db.patch(inv._id, {
			usedAt: Date.now(),
			usedByUserId: ctx.user._id
		});

		return { staffRole: inv.staffRole };
	}
});
