import { v, ConvexError } from 'convex/values';
import { action, internalAction, query } from './_generated/server';
import { authedQuery, authedMutation, adminMutation } from './functions';
import { components, internal } from './_generated/api';
import { resend, assertResendApiKey } from './emails/resend';
import { invitationHtml, invitationTexte } from './emails/modeles';
import { assertSeatAvailable, resolveEffectivePlan, finDeLEssai } from './billing';
import { requireEnv } from './env';
import { shouldSkipTestEmail } from './emails/helpers';
import { requireOrgMember, requireAdminDeLOrgCourante } from './lib/auth';

/**
 * L'établissement, ses membres et ses invitations.
 *
 * LE CONTRÔLE DE RÔLE VIENT D'UN SEUL ENDROIT. Ce fichier recopiait le même bloc
 * de dix lignes — lire le profil, lire l'appartenance, comparer le rôle — dans
 * huit fonctions. Il vit maintenant dans `lib/auth.ts` et s'appelle
 * `requireOrgAdmin`. Un contrôle recopié finit par manquer quelque part, et
 * c'est exactement la dette que l'annexe de sécurité de l'accord de
 * sous-traitance nommait.
 */

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
		const orgId = profile.currentOrganizationId;

		return ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) => q.eq('organizationId', orgId).eq('userId', ctx.user._id))
			.unique();
	}
});

export const createOrganization = authedMutation({
	args: {
		name: v.string(),
		siret: v.optional(v.string()),
		etablissementType: v.optional(
			v.union(
				v.literal('RIE'),
				v.literal('CLINIQUE'),
				v.literal('EHPAD'),
				v.literal('CRECHE'),
				v.literal('ECOLE_PRIVEE'),
				v.literal('AUTRE')
			)
		),
		couvertsJour: v.optional(v.number()),
		gestionDirecte: v.optional(v.boolean())
	},
	handler: async (ctx, args) => {
		if (!args.name.trim()) throw new ConvexError('Le nom est obligatoire');

		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();

		// L'ESSAI S'OUVRE ICI, ET UNE SEULE FOIS PAR COMPTE. Le lire avant
		// d'insérer l'établissement est ce qui empêche de recommencer un essai en
		// créant un second établissement. Voir `DUREE_ESSAI_JOURS` dans
		// `billing.ts` pour la règle et ce qu'elle évite.
		const premierEssai = !profile?.hasUsedFreeTrial;

		const orgId = await ctx.db.insert('organizations', {
			name: args.name.trim(),
			siret: args.siret,
			etablissementType: args.etablissementType,
			couvertsJour: args.couvertsJour,
			gestionDirecte: args.gestionDirecte,
			country: 'FR',
			currency: 'EUR',
			timezone: 'Europe/Paris',
			locale: 'fr-FR',
			freeTrialEndsAt: premierEssai ? finDeLEssai() : undefined,
			createdAt: Date.now()
		});

		await ctx.db.insert('organizationMembers', {
			organizationId: orgId,
			userId: ctx.user._id,
			role: 'ORG_ADMIN',
			joinedAt: Date.now()
		});

		if (profile) {
			await ctx.db.patch(profile._id, {
				currentOrganizationId: orgId,
				hasUsedFreeTrial: true
			});
		} else {
			await ctx.db.insert('userProfiles', {
				userId: ctx.user._id,
				currentOrganizationId: orgId,
				hasUsedFreeTrial: true
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
		await requireOrgMember(ctx, organizationId, ctx.user._id);

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

export const platformSwitchOrganization = adminMutation({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const org = await ctx.db.get(organizationId);
		if (!org) throw new ConvexError('Organisation introuvable');

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
		siret: v.optional(v.string()),
		etablissementType: v.optional(
			v.union(
				v.literal('RIE'),
				v.literal('CLINIQUE'),
				v.literal('EHPAD'),
				v.literal('CRECHE'),
				v.literal('ECOLE_PRIVEE'),
				v.literal('AUTRE')
			)
		),
		couvertsJour: v.optional(v.number()),
		gestionDirecte: v.optional(v.boolean())
	},
	handler: async (ctx, args) => {
		if (!args.name.trim()) throw new ConvexError('Le nom est obligatoire');

		const orgId = await requireAdminDeLOrgCourante(ctx, ctx.user._id);

		await ctx.db.patch(orgId, {
			name: args.name.trim(),
			siret: args.siret,
			etablissementType: args.etablissementType,
			couvertsJour: args.couvertsJour,
			gestionDirecte: args.gestionDirecte
		});
	}
});

export const generateOrgLogoUploadUrl = authedMutation({
	args: {},
	handler: async (ctx) => {
		await requireAdminDeLOrgCourante(ctx, ctx.user._id);
		return ctx.storage.generateUploadUrl();
	}
});

export const saveOrgLogo = authedMutation({
	args: { storageId: v.id('_storage') },
	handler: async (ctx, { storageId }) => {
		const orgId = await requireAdminDeLOrgCourante(ctx, ctx.user._id);

		// L'ancien logo quitte le stockage avec le nouveau : sans ça, chaque
		// changement laisse un fichier que plus rien ne référence et que rien ne
		// vient ramasser.
		const org = await ctx.db.get(orgId);
		if (org?.logoStorageId && org.logoStorageId !== storageId) {
			await ctx.storage.delete(org.logoStorageId);
		}

		const logoUrl = await ctx.storage.getUrl(storageId);
		if (!logoUrl) throw new ConvexError('Fichier introuvable');

		await ctx.db.patch(orgId, { logoStorageId: storageId, logoUrl });
		return logoUrl;
	}
});

export const deleteOrgLogo = authedMutation({
	args: {},
	handler: async (ctx) => {
		const orgId = await requireAdminDeLOrgCourante(ctx, ctx.user._id);

		const org = await ctx.db.get(orgId);
		if (org?.logoStorageId) {
			await ctx.storage.delete(org.logoStorageId);
		}

		await ctx.db.patch(orgId, { logoStorageId: undefined, logoUrl: undefined });
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

type BAUser = {
	_id?: string;
	name?: string;
	email?: string;
	image?: string;
	emailVerified?: boolean;
};
type AdapterResult = { page: unknown[]; isDone: boolean; continueCursor: string | null };

/**
 * La liste des membres de l'établissement.
 *
 * ELLE EST LISIBLE PAR TOUT MEMBRE, ET PLUS SEULEMENT PAR L'ADMINISTRATEUR. Elle
 * refusait l'accès à un `ORG_MEMBER`, ce qui n'était pas une mesure de sécurité
 * mais une gêne : savoir qui d'autre travaille sur les mêmes factures est le
 * minimum pour ne pas confirmer deux fois la même ligne. Ce qui reste réservé à
 * l'administrateur, ce sont les ACTIONS — inviter, changer un rôle, retirer
 * quelqu'un — et chacune le vérifie côté serveur.
 *
 * La barrière qui compte ici est l'appartenance, pas le rôle : sans elle,
 * connaître un identifiant d'organisation suffirait à lister les employés d'un
 * autre client.
 */
export const listOrganizationMembers = authedQuery({
	args: {},
	handler: async (ctx) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();
		if (!profile?.currentOrganizationId) return [];
		const orgId = profile.currentOrganizationId;

		await requireOrgMember(ctx, orgId, ctx.user._id);

		const members = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', orgId))
			.collect();

		// Chaque compte est relu individuellement : l'opérateur `in` de l'adaptateur
		// Better Auth s'est révélé moins fiable que l'égalité sur `_id`.
		const membersWithUsers = await Promise.all(
			members.map(async (m) => {
				// Pour le compte courant, on lit `ctx.user` : l'adaptateur peut renvoyer
				// un identifiant de forme différente, et le membre se dédoublerait.
				if (m.userId === ctx.user._id) {
					return {
						_id: m._id,
						userId: m.userId,
						role: m.role,
						joinedAt: m.joinedAt,
						name: ctx.user.name ?? null,
						email: ctx.user.email ?? null,
						image: ctx.user.image ?? null,
						emailVerified: ctx.user.emailVerified ?? false,
						estMoi: true
					};
				}

				const result = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
					model: 'user',
					where: [{ field: '_id', operator: 'eq' as const, value: m.userId }],
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
					image: user?.image ?? null,
					emailVerified: user?.emailVerified ?? false,
					estMoi: false
				};
			})
		);

		return membersWithUsers;
	}
});

export const inviteOrganizationMember = authedMutation({
	args: {
		email: v.string(),
		role: v.union(v.literal('ORG_ADMIN'), v.literal('ORG_MEMBER')),
		skipEmail: v.optional(v.boolean())
	},
	handler: async (ctx, { email, role, skipEmail }) => {
		const orgId = await requireAdminDeLOrgCourante(ctx, ctx.user._id);

		// L'adresse est normalisée AVANT toute lecture : sans ça, « Jean@x.fr » et
		// « jean@x.fr » ouvrent deux invitations et deux comptes pour une personne.
		const adresse = email.trim().toLowerCase();
		if (!adresse.includes('@')) throw new ConvexError('Adresse e-mail invalide');

		await assertSeatAvailable(ctx, orgId);

		const existing = await ctx.db
			.query('organizationInvitations')
			.withIndex('by_org_and_email', (q) => q.eq('organizationId', orgId).eq('email', adresse))
			.first();

		if (existing && !existing.acceptedAt && existing.expiresAt > Date.now()) {
			throw new ConvexError('Une invitation est déjà en attente pour cette adresse.');
		}

		const token = crypto.randomUUID();
		const now = Date.now();

		await ctx.db.insert('organizationInvitations', {
			organizationId: orgId,
			email: adresse,
			role,
			token,
			invitedBy: ctx.user._id,
			expiresAt: now + 7 * 24 * 60 * 60 * 1000,
			createdAt: now
		});

		if (!skipEmail) {
			const org = await ctx.db.get(orgId);
			const roleLabel = role === 'ORG_ADMIN' ? 'Administrateur' : 'Membre';

			await ctx.scheduler.runAfter(0, internal.organizations.sendOrgInvitationEmail, {
				email: adresse,
				orgName: org?.name ?? '',
				roleLabel,
				token
			});
		}

		return { token };
	}
});

export const bulkInviteOrganizationMembers = authedMutation({
	args: {
		invites: v.array(
			v.object({
				email: v.string(),
				role: v.union(v.literal('ORG_ADMIN'), v.literal('ORG_MEMBER'))
			})
		),
		skipEmail: v.optional(v.boolean())
	},
	handler: async (ctx, { invites, skipEmail }) => {
		const orgId = await requireAdminDeLOrgCourante(ctx, ctx.user._id);

		const org = await ctx.db.get(orgId);
		if (!org) throw new ConvexError('Organisation introuvable');

		const { tier, seatsAllowed } = resolveEffectivePlan(org);
		if (tier === 'none') {
			throw new ConvexError('Aucun abonnement actif.');
		}
		const memberCount = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', orgId))
			.collect()
			.then((r) => r.length);

		const slotsLeft = seatsAllowed - memberCount;
		if (invites.length > slotsLeft) {
			throw new ConvexError(
				`Quota insuffisant : ${slotsLeft} siège(s) disponible(s) pour ${invites.length} invitation(s).`
			);
		}

		const now = Date.now();
		const results: { email: string; success: boolean; token?: string; error?: string }[] = [];

		for (const invite of invites) {
			const email = invite.email.trim().toLowerCase();
			try {
				const existing = await ctx.db
					.query('organizationInvitations')
					.withIndex('by_org_and_email', (q) => q.eq('organizationId', orgId).eq('email', email))
					.first();

				if (existing && !existing.acceptedAt && existing.expiresAt > now) {
					results.push({ email, success: false, error: 'Invitation déjà en attente' });
					continue;
				}

				const token = crypto.randomUUID();
				await ctx.db.insert('organizationInvitations', {
					organizationId: orgId,
					email,
					role: invite.role,
					token,
					invitedBy: ctx.user._id,
					expiresAt: now + 7 * 24 * 60 * 60 * 1000,
					createdAt: now
				});

				if (!skipEmail) {
					const roleLabel = invite.role === 'ORG_ADMIN' ? 'Administrateur' : 'Membre';
					await ctx.scheduler.runAfter(0, internal.organizations.sendOrgInvitationEmail, {
						email,
						orgName: org.name ?? '',
						roleLabel,
						token
					});
				}

				results.push({ email, success: true, token });
			} catch (err) {
				results.push({
					email,
					success: false,
					error: err instanceof ConvexError ? (err.data as string) : 'Erreur inconnue'
				});
			}
		}

		return { results };
	}
});

/**
 * Le changement de rôle, et le garde-fou du dernier administrateur.
 *
 * Un établissement sans administrateur ne s'administre plus : personne ne peut
 * y inviter, y régler l'abonnement, ni le supprimer. Ce n'est pas une erreur
 * qu'on rattrape depuis l'interface, c'est un ticket de support. On la rend donc
 * impossible ici, comme dans la suppression de compte.
 */
export const updateMemberRole = authedMutation({
	args: {
		memberId: v.id('organizationMembers'),
		role: v.union(v.literal('ORG_ADMIN'), v.literal('ORG_MEMBER'))
	},
	handler: async (ctx, { memberId, role }) => {
		const orgId = await requireAdminDeLOrgCourante(ctx, ctx.user._id);

		const member = await ctx.db.get(memberId);
		if (!member || member.organizationId !== orgId) {
			throw new ConvexError('Membre introuvable');
		}
		if (member.userId === ctx.user._id) {
			throw new ConvexError('Vous ne pouvez pas modifier votre propre rôle');
		}

		if (member.role === 'ORG_ADMIN' && role === 'ORG_MEMBER') {
			const membres = await ctx.db
				.query('organizationMembers')
				.withIndex('by_organization', (q) => q.eq('organizationId', orgId))
				.collect();
			const admins = membres.filter((m) => m.role === 'ORG_ADMIN').length;
			if (admins <= 1) {
				throw new ConvexError(
					'Cet établissement doit garder au moins un administrateur. Nommez quelqu’un d’autre avant de rétrograder celui-ci.'
				);
			}
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

		const membership = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) => q.eq('organizationId', orgId).eq('userId', ctx.user._id))
			.unique();
		// Une invitation en attente porte l'adresse personnelle d'un tiers : elle ne
		// se montre qu'à qui peut l'annuler. Un membre reçoit une liste vide, pas une
		// erreur — l'écran d'équipe lui reste ouvert en lecture.
		if (!membership || membership.role !== 'ORG_ADMIN') return [];

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
				token: inv.token,
				createdAt: inv.createdAt,
				expiresAt: inv.expiresAt
			}));
	}
});

export const cancelInvitation = authedMutation({
	args: { invitationId: v.id('organizationInvitations') },
	handler: async (ctx, { invitationId }) => {
		const orgId = await requireAdminDeLOrgCourante(ctx, ctx.user._id);

		const invitation = await ctx.db.get(invitationId);
		if (!invitation || invitation.organizationId !== orgId) {
			throw new ConvexError('Invitation introuvable');
		}

		await ctx.db.delete(invitationId);
	}
});

export const acceptInvitationDirect = authedMutation({
	args: { invitationId: v.id('organizationInvitations') },
	handler: async (ctx, { invitationId }) => {
		const orgId = await requireAdminDeLOrgCourante(ctx, ctx.user._id);

		const invitation = await ctx.db.get(invitationId);
		if (!invitation || invitation.organizationId !== orgId) {
			throw new ConvexError('Invitation introuvable dans cet établissement');
		}
		if (invitation.acceptedAt) throw new ConvexError('Invitation déjà utilisée');
		if (invitation.expiresAt < Date.now()) throw new ConvexError('Invitation expirée');

		const result = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
			model: 'user',
			where: [{ field: 'email', operator: 'eq' as const, value: invitation.email }],
			paginationOpts: { cursor: null, numItems: 1 }
		})) as AdapterResult;

		const user = (result.page as BAUser[])[0];
		if (!user?._id) {
			throw new ConvexError(
				"Aucun compte trouvé pour cette adresse. La personne doit d'abord créer son compte via le lien d'invitation."
			);
		}
		const userId = user._id;

		const existingMember = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) => q.eq('organizationId', orgId).eq('userId', userId))
			.unique();
		if (existingMember) {
			throw new ConvexError('Cette personne est déjà membre de l’établissement');
		}

		await ctx.db.insert('organizationMembers', {
			organizationId: orgId,
			userId,
			role: invitation.role,
			joinedAt: Date.now()
		});

		await ctx.db.patch(invitationId, { acceptedAt: Date.now() });

		const userProfile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', userId))
			.unique();

		if (userProfile) {
			await ctx.db.patch(userProfile._id, { currentOrganizationId: orgId });
		} else {
			await ctx.db.insert('userProfiles', { userId, currentOrganizationId: orgId });
		}
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
			orgName: org?.name ?? 'Établissement inconnu'
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

/**
 * L'e-mail d'invitation.
 *
 * IL PARTAIT SUR LA COQUILLE DE L'ANCIEN PRODUIT — fond noir, accent jaune,
 * écrit en dur dans ce fichier — et son lien pointait vers `/join/<jeton>`,
 * c'est-à-dire vers une route qui n'existe pas. Une invitation menait donc à une
 * page 404, et personne ne pouvait rejoindre un établissement autrement qu'en
 * étant ajouté à la main. Les deux sont corrigés ici.
 */
export const sendOrgInvitationEmail = internalAction({
	args: {
		email: v.string(),
		orgName: v.string(),
		roleLabel: v.string(),
		token: v.string()
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		assertResendApiKey();
		if (shouldSkipTestEmail('sendOrgInvitationEmail', args.email)) return null;

		const siteUrl = requireEnv('SITE_URL', { feature: 'invitation email' });
		const donnees = {
			nomEtablissement: args.orgName,
			roleLibelle: args.roleLabel,
			url: `${siteUrl}/rejoindre/${args.token}`
		};

		await resend.sendEmail(ctx, {
			from: requireEnv('AUTH_EMAIL', { feature: 'invitation email' }),
			to: args.email,
			subject: `Rejoindre ${args.orgName} sur Letikette`,
			html: invitationHtml(donnees),
			text: invitationTexte(donnees),
			headers: [
				{ name: 'X-Email-Category', value: 'produit' },
				{ name: 'X-Email-Template', value: 'invitation' }
			]
		});
		return null;
	}
});

export const verifyMemberEmail = authedMutation({
	args: { memberId: v.id('organizationMembers') },
	handler: async (ctx, { memberId }) => {
		const orgId = await requireAdminDeLOrgCourante(ctx, ctx.user._id);

		const member = await ctx.db.get(memberId);
		if (!member || member.organizationId !== orgId) {
			throw new ConvexError('Membre introuvable dans cet établissement');
		}

		// On ne se vérifie pas soi-même : l'administrateur est déjà authentifié.
		if (member.userId === ctx.user._id) {
			throw new ConvexError('Action non autorisée sur votre propre compte');
		}

		const result = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
			model: 'user',
			where: [{ field: '_id', operator: 'eq' as const, value: member.userId }],
			paginationOpts: { cursor: null, numItems: 1 }
		})) as AdapterResult;

		const user = (result.page as BAUser[])[0];
		if (!user) throw new ConvexError('Compte utilisateur introuvable');

		if (user.emailVerified === true) {
			throw new ConvexError('L’adresse de ce membre est déjà vérifiée');
		}

		await ctx.runMutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: 'user',
				where: [{ field: '_id', operator: 'eq', value: member.userId }],
				update: { emailVerified: true }
			}
		});
	}
});

export const removeOrganizationMember = authedMutation({
	args: { memberId: v.id('organizationMembers') },
	handler: async (ctx, { memberId }) => {
		const orgId = await requireAdminDeLOrgCourante(ctx, ctx.user._id);

		const member = await ctx.db.get(memberId);
		if (!member || member.organizationId !== orgId) {
			throw new ConvexError('Membre introuvable');
		}
		if (member.userId === ctx.user._id) {
			throw new ConvexError('Vous ne pouvez pas vous retirer vous-même');
		}

		await ctx.db.delete(memberId);

		// Le compte retiré ne doit plus rouvrir cet établissement à la reconnexion.
		// Sans ce recalage, il retrouve un espace dont toutes les requêtes lui
		// répondent « accès refusé », ce qui se lit comme une panne.
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', member.userId))
			.unique();
		if (profile?.currentOrganizationId === orgId) {
			const autre = await ctx.db
				.query('organizationMembers')
				.withIndex('by_user', (q) => q.eq('userId', member.userId))
				.first();
			await ctx.db.patch(profile._id, {
				currentOrganizationId: autre?.organizationId ?? undefined
			});
		}
	}
});
