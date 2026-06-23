import { v, ConvexError } from 'convex/values';
import { internal } from './_generated/api';
import { authedQuery, authedMutation } from './functions';
import { getUserOrg, requireOrgAdmin } from './lib/auth';
import { requireEnv } from './env';

const maintenanceTypeValidator = v.union(
	v.literal('REVISION'),
	v.literal('VIDANGE'),
	v.literal('PNEUS'),
	v.literal('FREINS'),
	v.literal('AUTRE')
);

const statusValidator = v.union(
	v.literal('SCHEDULED'),
	v.literal('IN_PROGRESS'),
	v.literal('COMPLETED'),
	v.literal('CANCELLED')
);

export const listScheduledMaintenance = authedQuery({
	args: { status: v.optional(statusValidator) },
	handler: async (ctx, { status }) => {
		const { organizationId } = await getUserOrg(ctx);

		let records;
		if (status) {
			records = await ctx.db
				.query('maintenanceRecords')
				.withIndex('by_org_and_status', (q) =>
					q.eq('organizationId', organizationId).eq('status', status)
				)
				.collect();
		} else {
			records = await ctx.db
				.query('maintenanceRecords')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.collect();
		}

		return records.sort((a, b) => a.scheduledDate - b.scheduledDate);
	}
});

export const getMaintenanceRecord = authedQuery({
	args: { recordId: v.id('maintenanceRecords') },
	handler: async (ctx, { recordId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const record = await ctx.db.get(recordId);
		if (!record) throw new ConvexError('Entretien introuvable');
		if (record.organizationId !== organizationId) throw new ConvexError('Accès refusé');
		return record;
	}
});

export const getUpcomingMaintenance = authedQuery({
	args: { daysAhead: v.optional(v.number()) },
	handler: async (ctx, { daysAhead }) => {
		const { organizationId } = await getUserOrg(ctx);
		const cutoff = Date.now() + (daysAhead ?? 30) * 24 * 60 * 60 * 1000;

		const records = await ctx.db
			.query('maintenanceRecords')
			.withIndex('by_org_and_status', (q) =>
				q.eq('organizationId', organizationId).eq('status', 'SCHEDULED')
			)
			.filter((q) => q.lte(q.field('scheduledDate'), cutoff))
			.collect();

		return records.sort((a, b) => a.scheduledDate - b.scheduledDate);
	}
});

const TYPE_LABELS: Record<string, string> = {
	REVISION: 'Révision',
	VIDANGE: 'Vidange',
	PNEUS: 'Pneumatiques',
	FREINS: 'Freins',
	AUTRE: 'Autre'
};

export const listMaintenanceWithDetails = authedQuery({
	args: { status: v.optional(statusValidator) },
	handler: async (ctx, { status }) => {
		const { organizationId } = await getUserOrg(ctx);

		let records;
		if (status) {
			records = await ctx.db
				.query('maintenanceRecords')
				.withIndex('by_org_and_status', (q) =>
					q.eq('organizationId', organizationId).eq('status', status)
				)
				.collect();
		} else {
			records = await ctx.db
				.query('maintenanceRecords')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.collect();
		}

		const enriched = await Promise.all(
			records.map(async (r) => {
				const vehicle = await ctx.db.get(r.vehicleId);
				const garage = r.garageId ? await ctx.db.get(r.garageId) : null;
				return {
					...r,
					vehicleRegistration: vehicle?.registration ?? '—',
					vehicleBrand: vehicle?.brand ?? '—',
					vehicleModel: vehicle?.model ?? '—',
					garageName: garage?.name ?? null,
					garageEmail: garage?.email ?? null
				};
			})
		);

		return enriched.sort((a, b) => a.scheduledDate - b.scheduledDate);
	}
});

export const getMaintenanceWithDetails = authedQuery({
	args: { recordId: v.id('maintenanceRecords') },
	handler: async (ctx, { recordId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const record = await ctx.db.get(recordId);
		if (!record) throw new ConvexError('Entretien introuvable');
		if (record.organizationId !== organizationId) throw new ConvexError('Accès refusé');

		const vehicle = await ctx.db.get(record.vehicleId);
		const garage = record.garageId ? await ctx.db.get(record.garageId) : null;

		return {
			...record,
			vehicle,
			garage
		};
	}
});

export const listMaintenanceForCalendar = authedQuery({
	args: {
		dateFrom: v.optional(v.number()),
		dateTo: v.optional(v.number())
	},
	handler: async (ctx, { dateFrom, dateTo }) => {
		const { organizationId } = await getUserOrg(ctx);
		const dayMs = 24 * 60 * 60 * 1000;

		const [scheduled, inProgress] = await Promise.all([
			ctx.db
				.query('maintenanceRecords')
				.withIndex('by_org_and_status', (q) =>
					q.eq('organizationId', organizationId).eq('status', 'SCHEDULED')
				)
				.collect(),
			ctx.db
				.query('maintenanceRecords')
				.withIndex('by_org_and_status', (q) =>
					q.eq('organizationId', organizationId).eq('status', 'IN_PROGRESS')
				)
				.collect()
		]);

		const records = [...scheduled, ...inProgress].filter((r) => {
			const dayStart = Math.floor(r.scheduledDate / dayMs) * dayMs;
			const dayEnd = dayStart + dayMs;
			if (dateFrom !== undefined && dayEnd < dateFrom) return false;
			if (dateTo !== undefined && dayStart > dateTo) return false;
			return true;
		});

		return Promise.all(
			records.map(async (r) => {
				const vehicle = await ctx.db.get(r.vehicleId);
				return {
					_id: r._id as string,
					vehicleId: r.vehicleId as string,
					maintenanceType: r.maintenanceType,
					scheduledDate: r.scheduledDate,
					status: r.status as 'SCHEDULED' | 'IN_PROGRESS',
					vehicleRegistration: vehicle?.registration ?? '—',
					vehicleBrand: vehicle?.brand ?? '—',
					vehicleModel: vehicle?.model ?? '—'
				};
			})
		);
	}
});

export const scheduleMaintenance = authedMutation({
	args: {
		vehicleId: v.id('vehicles'),
		maintenanceType: maintenanceTypeValidator,
		scheduledDate: v.number(),
		garageId: v.optional(v.id('garages')),
		costEstimate: v.optional(v.number()),
		notes: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const vehicle = await ctx.db.get(args.vehicleId);
		if (!vehicle || vehicle.organizationId !== organizationId) {
			throw new ConvexError('Véhicule introuvable');
		}

		const now = Date.now();
		return ctx.db.insert('maintenanceRecords', {
			organizationId,
			vehicleId: args.vehicleId,
			maintenanceType: args.maintenanceType,
			scheduledDate: args.scheduledDate,
			garageId: args.garageId,
			costEstimate: args.costEstimate,
			notes: args.notes,
			status: 'SCHEDULED',
			scheduledBy: user._id,
			createdAt: now,
			updatedAt: now
		});
	}
});

export const updateMaintenanceStatus = authedMutation({
	args: {
		recordId: v.id('maintenanceRecords'),
		status: statusValidator,
		notes: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);
		const record = await ctx.db.get(args.recordId);
		if (!record) throw new ConvexError('Entretien introuvable');
		if (record.organizationId !== organizationId) throw new ConvexError('Accès refusé');
		await requireOrgAdmin(ctx, organizationId, user._id);

		const updates: { status: typeof args.status; updatedAt: number; notes?: string } = {
			status: args.status,
			updatedAt: Date.now()
		};
		if (args.notes !== undefined) updates.notes = args.notes;

		await ctx.db.patch(args.recordId, updates);
		return null;
	}
});

export const completeMaintenance = authedMutation({
	args: {
		recordId: v.id('maintenanceRecords'),
		completedDate: v.number(),
		costActual: v.number(),
		invoiceStorageId: v.optional(v.string()),
		invoiceUrl: v.optional(v.string()),
		notes: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);
		const record = await ctx.db.get(args.recordId);
		if (!record) throw new ConvexError('Entretien introuvable');
		if (record.organizationId !== organizationId) throw new ConvexError('Accès refusé');
		await requireOrgAdmin(ctx, organizationId, user._id);

		if (record.status !== 'SCHEDULED' && record.status !== 'IN_PROGRESS') {
			throw new ConvexError('Seul un entretien planifié ou en cours peut être complété');
		}

		const now = Date.now();
		const recordUpdates: {
			status: 'COMPLETED';
			completedDate: number;
			costActual: number;
			invoiceStorageId?: string;
			invoiceUrl?: string;
			notes?: string;
			updatedAt: number;
		} = {
			status: 'COMPLETED',
			completedDate: args.completedDate,
			costActual: args.costActual,
			updatedAt: now
		};
		if (args.invoiceStorageId !== undefined) recordUpdates.invoiceStorageId = args.invoiceStorageId;
		if (args.invoiceUrl !== undefined) recordUpdates.invoiceUrl = args.invoiceUrl;
		if (args.notes !== undefined) recordUpdates.notes = args.notes;

		await ctx.db.patch(args.recordId, recordUpdates);

		const config = await ctx.db
			.query('vehicleMaintenanceConfig')
			.withIndex('by_vehicle', (q) => q.eq('vehicleId', record.vehicleId))
			.unique();

		if (config) {
			if (record.maintenanceType === 'REVISION') {
				await ctx.db.patch(config._id, { lastRevisionDate: args.completedDate, updatedAt: now });
			} else if (record.maintenanceType === 'VIDANGE') {
				await ctx.db.patch(config._id, { lastVidangeDate: args.completedDate, updatedAt: now });
			} else if (record.maintenanceType === 'PNEUS') {
				await ctx.db.patch(config._id, { lastPneusDate: args.completedDate, updatedAt: now });
			} else if (record.maintenanceType === 'FREINS') {
				await ctx.db.patch(config._id, { lastFreinsDate: args.completedDate, updatedAt: now });
			} else {
				await ctx.db.patch(config._id, { updatedAt: now });
			}
		} else {
			const base = { vehicleId: record.vehicleId, organizationId, updatedAt: now };
			if (record.maintenanceType === 'REVISION') {
				await ctx.db.insert('vehicleMaintenanceConfig', { ...base, lastRevisionDate: args.completedDate });
			} else if (record.maintenanceType === 'VIDANGE') {
				await ctx.db.insert('vehicleMaintenanceConfig', { ...base, lastVidangeDate: args.completedDate });
			} else if (record.maintenanceType === 'PNEUS') {
				await ctx.db.insert('vehicleMaintenanceConfig', { ...base, lastPneusDate: args.completedDate });
			} else if (record.maintenanceType === 'FREINS') {
				await ctx.db.insert('vehicleMaintenanceConfig', { ...base, lastFreinsDate: args.completedDate });
			} else {
				await ctx.db.insert('vehicleMaintenanceConfig', base);
			}
		}

		return null;
	}
});

export const cancelMaintenance = authedMutation({
	args: {
		recordId: v.id('maintenanceRecords'),
		reason: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);
		const record = await ctx.db.get(args.recordId);
		if (!record) throw new ConvexError('Entretien introuvable');
		if (record.organizationId !== organizationId) throw new ConvexError('Accès refusé');
		await requireOrgAdmin(ctx, organizationId, user._id);

		if (record.status === 'COMPLETED') {
			throw new ConvexError('Un entretien complété ne peut pas être annulé');
		}

		const updates: { status: 'CANCELLED'; updatedAt: number; notes?: string } = {
			status: 'CANCELLED',
			updatedAt: Date.now()
		};
		if (args.reason !== undefined) updates.notes = args.reason;

		await ctx.db.patch(args.recordId, updates);
		return null;
	}
});

export const scheduleMaintenanceAndNotify = authedMutation({
	args: {
		vehicleId: v.id('vehicles'),
		maintenanceType: maintenanceTypeValidator,
		scheduledDate: v.number(),
		garageId: v.optional(v.id('garages')),
		costEstimate: v.optional(v.number()),
		notes: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { user, organizationId, org } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const vehicle = await ctx.db.get(args.vehicleId);
		if (!vehicle || vehicle.organizationId !== organizationId) {
			throw new ConvexError('Véhicule introuvable');
		}

		const garage = args.garageId ? await ctx.db.get(args.garageId) : null;

		const now = Date.now();
		const recordId = await ctx.db.insert('maintenanceRecords', {
			organizationId,
			vehicleId: args.vehicleId,
			maintenanceType: args.maintenanceType,
			scheduledDate: args.scheduledDate,
			garageId: args.garageId,
			costEstimate: args.costEstimate,
			notes: args.notes,
			status: 'SCHEDULED',
			scheduledBy: user._id,
			createdAt: now,
			updatedAt: now
		});

		const vehicleLabel = `${vehicle.brand} ${vehicle.model} · ${vehicle.registration}`;
		const typeLabel = TYPE_LABELS[args.maintenanceType] ?? args.maintenanceType;
		const scheduledDateStr = new Intl.DateTimeFormat('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}).format(new Date(args.scheduledDate));

		const siteUrl = requireEnv('SITE_URL', { feature: 'maintenance detail links' });
		const adminUrl = `${siteUrl}/admin/maintenance/${recordId}`;

		if (garage?.email) {
			const contactEmail = (user as { email?: string }).email ?? org.name;
			await ctx.scheduler.runAfter(0, internal.emails.send.sendMaintenanceScheduledEmail, {
				garageEmail: garage.email,
				garageName: garage.name,
				vehicleLabel,
				maintenanceType: typeLabel,
				scheduledDate: scheduledDateStr,
				organizationName: org.name,
				contactEmail,
				notes: args.notes,
				adminUrl
			});
		}

		if (vehicle.assignedDriverId) {
			await ctx.db.insert('notifications', {
				organizationId,
				userId: vehicle.assignedDriverId,
				type: 'MAINTENANCE_DUE',
				title: 'Entretien planifié pour votre véhicule',
				message: `Un ${typeLabel.toLowerCase()} est planifié le ${scheduledDateStr}${garage ? ` chez ${garage.name}` : ''}.`,
				link: adminUrl,
				vehicleId: args.vehicleId,
				isRead: false,
				createdAt: now
			});
		}

		return recordId;
	}
});
