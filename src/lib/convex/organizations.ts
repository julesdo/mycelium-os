import { v, ConvexError } from 'convex/values';
import { action, internalAction, query } from './_generated/server';
import { authedQuery, authedMutation } from './functions';
import { components, internal } from './_generated/api';
import { resend, assertResendApiKey } from './emails/resend';
import { requireEnv } from './env';
import { shouldSkipTestEmail } from './emails/helpers';

export const getMyOrg = authedQuery({
	args: {},
	handler: async (ctx) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();

		if (!profile?.currentOrganizationId) return null;
		return ctx.db.get(profile.currentOrganizationId);
	}
});

export const getMyOrgMembership = authedQuery({
	args: {},
	handler: async (ctx) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();

		if (!profile?.currentOrganizationId) return null;

		return ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', profile.currentOrganizationId!).eq('userId', ctx.user._id)
			)
			.unique();
	}
});

export const createOrganization = authedMutation({
	args: {
		name: v.string(),
		siren: v.optional(v.string()),
		sector: v.optional(v.string()),
		size: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		if (!args.name.trim()) throw new ConvexError('Le nom est obligatoire');

		const orgId = await ctx.db.insert('organizations', {
			name: args.name.trim(),
			siren: args.siren,
			sector: args.sector,
			size: args.size,
			plan: 'flat',
			createdAt: Date.now()
		});

		await ctx.db.insert('organizationMembers', {
			organizationId: orgId,
			userId: ctx.user._id,
			role: 'ORG_ADMIN',
			joinedAt: Date.now()
		});

		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();

		if (profile) {
			await ctx.db.patch(profile._id, { currentOrganizationId: orgId });
		} else {
			await ctx.db.insert('userProfiles', {
				userId: ctx.user._id,
				currentOrganizationId: orgId
			});
		}

		return orgId;
	}
});

export const listMyOrganizations = authedQuery({
	args: {},
	handler: async (ctx) => {
		const memberships = await ctx.db
			.query('organizationMembers')
			.withIndex('by_user', (q) => q.eq('userId', ctx.user._id))
			.collect();

		const orgs = await Promise.all(
			memberships.map(async (m) => {
				const org = await ctx.db.get(m.organizationId);
				return org ? { ...org, role: m.role } : null;
			})
		);
		return orgs.filter((o): o is NonNullable<typeof o> => o !== null);
	}
});

export const switchOrganization = authedMutation({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const membership = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', ctx.user._id)
			)
			.unique();

		if (!membership) {
			throw new ConvexError("Non autorisé : vous n'êtes pas membre de cette organisation");
		}

		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();

		if (profile) {
			await ctx.db.patch(profile._id, { currentOrganizationId: organizationId });
		} else {
			await ctx.db.insert('userProfiles', {
				userId: ctx.user._id,
				currentOrganizationId: organizationId
			});
		}
	}
});

export const updateOrganization = authedMutation({
	args: {
		name: v.string(),
		siren: v.optional(v.string()),
		sector: v.optional(v.string()),
		size: v.optional(v.string()),
		country: v.optional(v.string()),
		currency: v.optional(v.string()),
		distanceUnit: v.optional(v.union(v.literal('km'), v.literal('mile'))),
		timezone: v.optional(v.string()),
		locale: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		if (!args.name.trim()) throw new ConvexError('Le nom est obligatoire');

		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();

		if (!profile?.currentOrganizationId) throw new ConvexError("Aucune organisation active");

		const membership = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', profile.currentOrganizationId!).eq('userId', ctx.user._id)
			)
			.unique();

		if (!membership || membership.role !== 'ORG_ADMIN') {
			throw new ConvexError('Accès refusé : seul un ORG_ADMIN peut modifier l\'organisation');
		}

		await ctx.db.patch(profile.currentOrganizationId, {
			name: args.name.trim(),
			siren: args.siren,
			sector: args.sector,
			size: args.size,
			country: args.country,
			currency: args.currency,
			distanceUnit: args.distanceUnit,
			timezone: args.timezone,
			locale: args.locale
		});
	}
});

export const lookupSiren = action({
	args: { siren: v.string() },
	handler: async (_ctx, { siren }) => {
		const apiKey = process.env.PAPPERS_API_KEY;
		if (!apiKey) throw new ConvexError('PAPPERS_API_KEY non configuré');

		const res = await fetch(
			`https://api.pappers.fr/v2/entreprise?siren=${siren}&api_token=${apiKey}`
		);

		if (!res.ok) throw new ConvexError('SIREN non trouvé dans la base Pappers');

		const data = (await res.json()) as {
			nom_entreprise?: string;
			libelle_code_naf?: string;
		};

		return {
			name: data.nom_entreprise ?? null,
			naf: data.libelle_code_naf ?? null
		};
	}
});

export const listOrganizationMembers = authedQuery({
	args: {},
	handler: async (ctx) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) return [];
		const orgId = profile.currentOrganizationId;

		const callerMembership = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', orgId).eq('userId', ctx.user._id)
			)
			.unique();
		if (!callerMembership || callerMembership.role === 'ORG_MEMBER') {
			throw new ConvexError('Accès refusé : rôle ORG_ADMIN ou ORG_MANAGER requis');
		}

		const members = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', orgId))
			.collect();

		type BAUser = { id?: string; name?: string; email?: string; image?: string };
		type AdapterResult = { page: unknown[]; isDone: boolean; continueCursor: string | null };

		// Fetch each user individually with eq filter (more reliable than `in` operator)
		const membersWithUsers = await Promise.all(
			members.map(async (m) => {
				// Use ctx.user directly for the current user to avoid adapter ID mismatch
				if (m.userId === ctx.user._id) {
					return {
						_id: m._id,
						userId: m.userId,
						role: m.role,
						joinedAt: m.joinedAt,
						name: ctx.user.name ?? null,
						email: ctx.user.email ?? null,
						image: ctx.user.image ?? null
					};
				}

				const result = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
					model: 'user',
					where: [{ field: 'id', operator: 'eq' as const, value: m.userId }],
					paginationOpts: { cursor: null, numItems: 1 }
				})) as AdapterResult;

				const user = (result.page as BAUser[])[0] ?? null;
				return {
					_id: m._id,
					userId: m.userId,
					role: m.role,
					joinedAt: m.joinedAt,
					name: user?.name ?? null,
					email: user?.email ?? null,
					image: user?.image ?? null
				};
			})
		);

		return membersWithUsers;
	}
});

export const inviteOrganizationMember = authedMutation({
	args: {
		email: v.string(),
		role: v.union(
			v.literal('ORG_ADMIN'),
			v.literal('ORG_MANAGER'),
			v.literal('ORG_MEMBER')
		)
	},
	handler: async (ctx, { email, role }) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) throw new ConvexError('Aucune organisation active');
		const orgId = profile.currentOrganizationId;

		const callerMembership = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', orgId).eq('userId', ctx.user._id)
			)
			.unique();
		if (!callerMembership || callerMembership.role !== 'ORG_ADMIN') {
			throw new ConvexError('Accès refusé : rôle ORG_ADMIN requis');
		}

		const existing = await ctx.db
			.query('organizationInvitations')
			.withIndex('by_org_and_email', (q) => q.eq('organizationId', orgId).eq('email', email))
			.first();

		if (existing && !existing.acceptedAt && existing.expiresAt > Date.now()) {
			throw new ConvexError('Une invitation est déjà en attente pour cet email.');
		}

		const token = crypto.randomUUID();
		const now = Date.now();

		await ctx.db.insert('organizationInvitations', {
			organizationId: orgId,
			email,
			role,
			token,
			invitedBy: ctx.user._id,
			expiresAt: now + 7 * 24 * 60 * 60 * 1000,
			createdAt: now
		});

		const org = await ctx.db.get(orgId);
		const roleLabel = role === 'ORG_ADMIN' ? 'Administrateur'
			: role === 'ORG_MANAGER' ? 'Gestionnaire'
			: 'Membre';

		await ctx.scheduler.runAfter(0, internal.organizations.sendOrgInvitationEmail, {
			email,
			orgName: org?.name ?? '',
			roleLabel,
			token
		});

		return { token };
	}
});

export const updateMemberRole = authedMutation({
	args: {
		memberId: v.id('organizationMembers'),
		role: v.union(
			v.literal('ORG_ADMIN'),
			v.literal('ORG_MANAGER'),
			v.literal('ORG_MEMBER')
		)
	},
	handler: async (ctx, { memberId, role }) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) throw new ConvexError('Aucune organisation active');
		const orgId = profile.currentOrganizationId;

		const callerMembership = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', orgId).eq('userId', ctx.user._id)
			)
			.unique();
		if (!callerMembership || callerMembership.role !== 'ORG_ADMIN') {
			throw new ConvexError('Accès refusé : rôle ORG_ADMIN requis');
		}

		const member = await ctx.db.get(memberId);
		if (!member || member.organizationId !== orgId) {
			throw new ConvexError('Membre introuvable');
		}
		if (member.userId === ctx.user._id) {
			throw new ConvexError('Vous ne pouvez pas modifier votre propre rôle');
		}

		await ctx.db.patch(memberId, { role });
	}
});

export const listOrgInvitations = authedQuery({
	args: {},
	handler: async (ctx) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) return [];
		const orgId = profile.currentOrganizationId;

		const callerMembership = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', orgId).eq('userId', ctx.user._id)
			)
			.unique();
		if (!callerMembership || callerMembership.role === 'ORG_MEMBER') return [];

		const now = Date.now();
		const invitations = await ctx.db
			.query('organizationInvitations')
			.withIndex('by_org', (q) => q.eq('organizationId', orgId))
			.collect();

		return invitations
			.filter((inv) => !inv.acceptedAt && inv.expiresAt > now)
			.map((inv) => ({
				_id: inv._id,
				email: inv.email,
				role: inv.role,
				createdAt: inv.createdAt,
				expiresAt: inv.expiresAt
			}));
	}
});

export const cancelInvitation = authedMutation({
	args: { invitationId: v.id('organizationInvitations') },
	handler: async (ctx, { invitationId }) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) throw new ConvexError('Aucune organisation active');
		const orgId = profile.currentOrganizationId;

		const callerMembership = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', orgId).eq('userId', ctx.user._id)
			)
			.unique();
		if (!callerMembership || callerMembership.role !== 'ORG_ADMIN') {
			throw new ConvexError('Accès refusé : rôle ORG_ADMIN requis');
		}

		const invitation = await ctx.db.get(invitationId);
		if (!invitation || invitation.organizationId !== orgId) {
			throw new ConvexError('Invitation introuvable');
		}

		await ctx.db.delete(invitationId);
	}
});

export const getInvitationByToken = query({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const invitation = await ctx.db
			.query('organizationInvitations')
			.withIndex('by_token', (q) => q.eq('token', token))
			.unique();

		if (!invitation) return null;

		const org = await ctx.db.get(invitation.organizationId);

		return {
			_id: invitation._id,
			email: invitation.email,
			role: invitation.role,
			expiresAt: invitation.expiresAt,
			acceptedAt: invitation.acceptedAt ?? null,
			isExpired: invitation.expiresAt < Date.now(),
			isAccepted: !!invitation.acceptedAt,
			orgName: org?.name ?? 'Organisation inconnue'
		};
	}
});

export const acceptInvitation = authedMutation({
	args: { token: v.string() },
	handler: async (ctx, { token }) => {
		const invitation = await ctx.db
			.query('organizationInvitations')
			.withIndex('by_token', (q) => q.eq('token', token))
			.unique();

		if (!invitation) throw new ConvexError('Invitation introuvable');
		if (invitation.acceptedAt) throw new ConvexError('Invitation déjà utilisée');
		if (invitation.expiresAt < Date.now()) throw new ConvexError('Invitation expirée');

		const existing = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', invitation.organizationId).eq('userId', ctx.user._id)
			)
			.unique();

		if (!existing) {
			await ctx.db.insert('organizationMembers', {
				organizationId: invitation.organizationId,
				userId: ctx.user._id,
				role: invitation.role,
				joinedAt: Date.now()
			});
		}

		await ctx.db.patch(invitation._id, { acceptedAt: Date.now() });

		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();

		if (profile) {
			await ctx.db.patch(profile._id, { currentOrganizationId: invitation.organizationId });
		} else {
			await ctx.db.insert('userProfiles', {
				userId: ctx.user._id,
				currentOrganizationId: invitation.organizationId
			});
		}

		return { organizationId: invitation.organizationId };
	}
});

export const sendOrgInvitationEmail = internalAction({
	args: {
		email: v.string(),
		orgName: v.string(),
		roleLabel: v.string(),
		token: v.string()
	},
	handler: async (ctx, args) => {
		assertResendApiKey();
		if (shouldSkipTestEmail('sendOrgInvitationEmail', args.email)) return;

		const siteUrl = requireEnv('SITE_URL', { feature: 'invitation email' });
		const joinUrl = `${siteUrl}/join/${args.token}`;

		const html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; background: #0a0a0a; margin: 0; padding: 32px 16px;">
  <div style="max-width: 480px; margin: 0 auto; background: #111; border: 1px solid #222; border-radius: 16px; overflow: hidden;">
    <div style="padding: 24px; border-bottom: 1px solid #1a1a1a;">
      <span style="color: #f5e642; font-size: 15px; font-weight: 700; letter-spacing: -0.01em;">Mycelium Fleet OS</span>
    </div>
    <div style="padding: 32px 24px;">
      <h1 style="color: #fff; font-size: 20px; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.02em;">
        Invitation à rejoindre ${args.orgName}
      </h1>
      <p style="color: #888; font-size: 14px; margin: 0 0 24px; line-height: 1.6;">
        Vous avez été invité en tant que <strong style="color: #bbb;">${args.roleLabel}</strong>.
        Cliquez sur le bouton ci-dessous pour créer votre compte et rejoindre la flotte.
      </p>
      <a href="${joinUrl}" style="display: inline-block; background: #f5e642; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
        Rejoindre l'organisation
      </a>
      <p style="color: #555; font-size: 12px; margin: 24px 0 0; line-height: 1.5;">
        Ce lien expire dans 7 jours. Si vous n'attendiez pas cette invitation, ignorez cet email.
      </p>
    </div>
  </div>
</body>
</html>`;

		await resend.sendEmail(ctx, {
			from: requireEnv('AUTH_EMAIL', { feature: 'invitation email' }),
			to: args.email,
			subject: `Invitation à rejoindre ${args.orgName} sur Mycelium`,
			html
		});
	}
});

export const removeOrganizationMember = authedMutation({
	args: { memberId: v.id('organizationMembers') },
	handler: async (ctx, { memberId }) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) throw new ConvexError('Aucune organisation active');
		const orgId = profile.currentOrganizationId;

		const callerMembership = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', orgId).eq('userId', ctx.user._id)
			)
			.unique();
		if (!callerMembership || callerMembership.role !== 'ORG_ADMIN') {
			throw new ConvexError('Accès refusé : rôle ORG_ADMIN requis');
		}

		const member = await ctx.db.get(memberId);
		if (!member || member.organizationId !== orgId) {
			throw new ConvexError('Membre introuvable');
		}
		if (member.userId === ctx.user._id) {
			throw new ConvexError('Vous ne pouvez pas vous retirer vous-même');
		}

		await ctx.db.delete(memberId);
	}
});
