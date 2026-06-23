import { v, ConvexError } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from './_generated/server';
import { authedQuery, authedMutation } from './functions';
import { getUserOrg, requireOrgAdmin } from './lib/auth';
import { internal, components } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { parseBetterAuthUsers } from './admin/types';

// ─── Queries ──────────────────────────────────────────────────────────────────

export const listDriversForOrg = authedQuery({
	args: {
		filter: v.optional(
			v.union(
				v.literal('all'),
				v.literal('blocked'),
				v.literal('expiring_soon'),
				v.literal('not_validated')
			)
		)
	},
	handler: async (ctx, { filter = 'all' }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const members = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
			.collect();

		const profiles = await ctx.db
			.query('driverProfiles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const profileByUser = new Map(profiles.map((p) => [p.userId, p]));
		const now = Date.now();
		const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

		const userIds = members.map((m) => m.userId).filter(Boolean);
		let userInfoMap = new Map<string, { name: string | null; email: string; image: string | null }>();

		if (userIds.length > 0) {
			const usersRaw = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
				model: 'user',
				where: [{ field: '_id', operator: 'in', value: userIds }],
				paginationOpts: { cursor: null, numItems: userIds.length + 10 }
			})) as { page: unknown[]; isDone: boolean; continueCursor: string | null };
			const parsed = parseBetterAuthUsers(usersRaw.page);
			userInfoMap = new Map(parsed.map((u) => [u._id, { name: u.name ?? null, email: u.email, image: u.image ?? null }]));
		}

		const result = members.map((member) => {
			const profile = profileByUser.get(member.userId) ?? null;
			const expiryTs = profile?.licenseExpiryDate
				? new Date(profile.licenseExpiryDate).getTime()
				: null;
			const isExpiringSoon = expiryTs !== null && expiryTs - now < thirtyDaysMs && expiryTs > now;
			const isExpired = expiryTs !== null && expiryTs < now;
			const user = userInfoMap.get(member.userId) ?? null;

			return { member, profile, isExpiringSoon, isExpired, user };
		});

		return result.filter(({ profile, isExpiringSoon }) => {
			if (filter === 'blocked') return profile?.isBlocked === true;
			if (filter === 'expiring_soon') return isExpiringSoon;
			if (filter === 'not_validated') return profile !== null && !profile.licenseValidated;
			return true;
		});
	}
});

export const getDriverProfile = authedQuery({
	args: { targetUserId: v.string() },
	handler: async (ctx, { targetUserId }) => {
		const { user, organizationId } = await getUserOrg(ctx);

		if (targetUserId !== user._id) {
			await requireOrgAdmin(ctx, organizationId, user._id);
		}

		return ctx.db
			.query('driverProfiles')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', targetUserId)
			)
			.unique();
	}
});

export const getDriverRestrictions = authedQuery({
	args: { targetUserId: v.string() },
	handler: async (ctx, { targetUserId }) => {
		const { user, organizationId } = await getUserOrg(ctx);

		if (targetUserId !== user._id) {
			await requireOrgAdmin(ctx, organizationId, user._id);
		}

		return ctx.db
			.query('driverRestrictions')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', targetUserId)
			)
			.collect();
	}
});

export const getDriverUserInfo = authedQuery({
	args: { targetUserId: v.string() },
	handler: async (ctx, { targetUserId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		if (targetUserId !== user._id) {
			await requireOrgAdmin(ctx, organizationId, user._id);
		}
		const result = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
			model: 'user',
			where: [{ field: '_id', operator: 'in', value: [targetUserId] }],
			paginationOpts: { cursor: null, numItems: 1 }
		})) as { page: unknown[] };
		const parsed = parseBetterAuthUsers(result.page);
		const u = parsed[0] ?? null;
		if (!u) return null;
		return { name: u.name ?? null, email: u.email, image: u.image ?? null };
	}
});

export const listDriverReservations = authedQuery({
	args: { targetUserId: v.string() },
	handler: async (ctx, { targetUserId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const reservations = await ctx.db
			.query('reservations')
			.withIndex('by_user', (q) => q.eq('userId', targetUserId))
			.order('desc')
			.take(50);

		return reservations.filter((r) => r.organizationId === organizationId);
	}
});

export const getLicenseImageUrl = authedQuery({
	args: { storageId: v.string() },
	handler: async (ctx, { storageId }) => {
		await getUserOrg(ctx);
		return ctx.storage.getUrl(storageId as Id<'_storage'>);
	}
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const upsertDriverProfile = authedMutation({
	args: {
		targetUserId: v.optional(v.string()),
		licenseNumber: v.optional(v.string()),
		licenseCategories: v.optional(v.array(v.string())),
		licenseIssuedDate: v.optional(v.string()),
		licenseExpiryDate: v.optional(v.string()),
		licenseFrontStorageId: v.optional(v.string()),
		licenseBackStorageId: v.optional(v.string()),
		formations: v.optional(
			v.array(
				v.object({
					type: v.string(),
					obtainedDate: v.string(),
					expiryDate: v.optional(v.string()),
					certificateStorageId: v.optional(v.string())
				})
			)
		),
		notes: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);
		const targetUserId = args.targetUserId ?? user._id;

		if (args.targetUserId && args.targetUserId !== user._id) {
			await requireOrgAdmin(ctx, organizationId, user._id);
		}

		const existing = await ctx.db
			.query('driverProfiles')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', targetUserId)
			)
			.unique();

		const now = Date.now();
		const data = {
			organizationId,
			userId: targetUserId,
			licenseNumber: args.licenseNumber,
			licenseCategories: args.licenseCategories,
			licenseIssuedDate: args.licenseIssuedDate,
			licenseExpiryDate: args.licenseExpiryDate,
			licenseFrontStorageId: args.licenseFrontStorageId,
			licenseBackStorageId: args.licenseBackStorageId,
			formations: args.formations,
			notes: args.notes,
			updatedAt: now
		};

		if (existing) {
			const licenseChanged =
				args.licenseNumber !== existing.licenseNumber ||
				args.licenseExpiryDate !== existing.licenseExpiryDate;
			await ctx.db.patch(existing._id, {
				...data,
				licenseValidated: licenseChanged ? false : existing.licenseValidated,
				licenseValidatedBy: licenseChanged ? undefined : existing.licenseValidatedBy,
				licenseValidatedAt: licenseChanged ? undefined : existing.licenseValidatedAt
			});
			return existing._id;
		}

		return ctx.db.insert('driverProfiles', { ...data, createdAt: now });
	}
});

export const validateDriverLicense = authedMutation({
	args: { targetUserId: v.string() },
	handler: async (ctx, { targetUserId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const profile = await ctx.db
			.query('driverProfiles')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', targetUserId)
			)
			.unique();
		if (!profile) throw new ConvexError('Profil conducteur introuvable');

		await ctx.db.patch(profile._id, {
			licenseValidated: true,
			licenseValidatedBy: user._id,
			licenseValidatedAt: Date.now(),
			isBlocked: false,
			blockReason: undefined,
			updatedAt: Date.now()
		});
	}
});

export const addDriverRestriction = authedMutation({
	args: {
		targetUserId: v.string(),
		type: v.union(
			v.literal('NO_LONG_DISTANCE'),
			v.literal('NO_UTILITY'),
			v.literal('NO_TRUCK'),
			v.literal('MAX_KM_PER_MONTH'),
			v.literal('SITE_ONLY')
		),
		value: v.optional(v.string()),
		reason: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		return ctx.db.insert('driverRestrictions', {
			organizationId,
			userId: args.targetUserId,
			type: args.type,
			value: args.value,
			reason: args.reason,
			addedBy: user._id,
			createdAt: Date.now()
		});
	}
});

export const removeDriverRestriction = authedMutation({
	args: { restrictionId: v.id('driverRestrictions') },
	handler: async (ctx, { restrictionId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const restriction = await ctx.db.get(restrictionId);
		if (!restriction || restriction.organizationId !== organizationId) {
			throw new ConvexError('Restriction introuvable');
		}
		await ctx.db.delete(restrictionId);
	}
});

export const generateLicenseUploadUrl = authedMutation({
	args: {},
	handler: async (ctx) => {
		await getUserOrg(ctx);
		return ctx.storage.generateUploadUrl();
	}
});

// ─── Self-service queries (salarié) ──────────────────────────────────────────

export const getMyDriverProfile = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { user, organizationId } = await getUserOrg(ctx);
		return ctx.db
			.query('driverProfiles')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', user._id)
			)
			.unique();
	}
});

export const getMyDriverRestrictions = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { user, organizationId } = await getUserOrg(ctx);
		return ctx.db
			.query('driverRestrictions')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', user._id)
			)
			.collect();
	}
});

// ─── Internal ─────────────────────────────────────────────────────────────────

export const getAllProfilesForExpiry = internalQuery({
	args: {},
	handler: async (ctx) => {
		return ctx.db.query('driverProfiles').collect();
	}
});

export const blockDriver = internalMutation({
	args: {
		profileId: v.id('driverProfiles'),
		reason: v.string()
	},
	returns: v.null(),
	handler: async (ctx, { profileId, reason }) => {
		await ctx.db.patch(profileId, {
			isBlocked: true,
			blockReason: reason,
			updatedAt: Date.now()
		});
		return null;
	}
});

export const checkLicenseExpiry = internalAction({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

		const allProfiles = await ctx.runQuery(internal.drivers.getAllProfilesForExpiry, {});

		for (const profile of allProfiles) {
			if (!profile.licenseExpiryDate) continue;
			const expiryTs = new Date(profile.licenseExpiryDate).getTime();
			const daysUntilExpiry = (expiryTs - now) / (24 * 60 * 60 * 1000);

			if (expiryTs < now) {
				if (!profile.isBlocked) {
					await ctx.runMutation(internal.drivers.blockDriver, {
						profileId: profile._id,
						reason: `Permis expiré le ${new Date(expiryTs).toLocaleDateString('fr-FR')}`
					});
				}
				await ctx.runMutation(internal.notifications.createNotification, {
					organizationId: profile.organizationId,
					userId: profile.userId,
					type: 'LICENSE_EXPIRED',
					title: 'Permis de conduire expiré',
					message: 'Votre permis a expiré. Mettez-le à jour pour pouvoir réserver à nouveau.',
					link: '/app/profile'
				});
			} else if (daysUntilExpiry <= 7) {
				await ctx.runMutation(internal.notifications.createNotification, {
					organizationId: profile.organizationId,
					userId: profile.userId,
					type: 'LICENSE_EXPIRING',
					title: `Permis expire dans ${Math.ceil(daysUntilExpiry)} jour(s)`,
					message: 'Renouvelez votre permis en urgence.',
					link: '/app/profile'
				});
			} else if (daysUntilExpiry <= 30) {
				const recentAlerts = await ctx.runQuery(internal.notifications.getRecentByType, {
					userId: profile.userId,
					type: 'LICENSE_EXPIRING',
					since: now - sevenDaysMs
				});
				if (recentAlerts.length === 0) {
					await ctx.runMutation(internal.notifications.createNotification, {
						organizationId: profile.organizationId,
						userId: profile.userId,
						type: 'LICENSE_EXPIRING',
						title: `Permis expire dans ${Math.ceil(daysUntilExpiry)} jours`,
						message: "Pensez à renouveler votre permis avant qu'il expire.",
						link: '/app/profile'
					});
				}
			}
		}
	}
});
