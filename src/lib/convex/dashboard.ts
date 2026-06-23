import { v } from 'convex/values';
import { authedQuery } from './functions';
import { getUserOrg } from './lib/auth';

export const getFleetStats = authedQuery({
	args: {
		sites: v.optional(v.array(v.string()))
	},
	handler: async (ctx, { sites }) => {
		const { organizationId } = await getUserOrg(ctx);

		let vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		if (sites && sites.length > 0) {
			vehicles = vehicles.filter((v) => v.location && sites.includes(v.location));
		}

		const total = vehicles.length;
		const available = vehicles.filter((v) => v.status === 'AVAILABLE').length;
		const inUse = vehicles.filter((v) => v.status === 'IN_USE').length;
		const maintenance = vehicles.filter((v) => v.status === 'MAINTENANCE').length;
		const retired = vehicles.filter((v) => v.status === 'RETIRED').length;

		return { total, available, inUse, maintenance, retired };
	}
});

export const getUsageOverTime = authedQuery({
	args: {
		days: v.optional(v.number()),
		sites: v.optional(v.array(v.string()))
	},
	handler: async (ctx, { days = 14, sites }) => {
		const { organizationId } = await getUserOrg(ctx);
		const clampedDays = Math.min(Math.max(days, 1), 365);
		const now = Date.now();
		const windowStart = now - clampedDays * 24 * 60 * 60 * 1000;

		let reservations = await ctx.db
			.query('reservations')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		reservations = reservations.filter(
			(r) => r.status !== 'CANCELLED' && r.startDate >= windowStart
		);

		if (sites && sites.length > 0) {
			const vehicles = await ctx.db
				.query('vehicles')
				.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
				.collect();
			const siteVehicleIds = new Set(
				vehicles.filter((v) => v.location && sites.includes(v.location)).map((v) => v._id)
			);
			reservations = reservations.filter((r) => siteVehicleIds.has(r.vehicleId));
		}

		if (clampedDays > 60) {
			const weeks = Math.ceil(clampedDays / 7);
			const buckets = new Map<string, number>();
			for (let i = 0; i < weeks; i++) {
				const d = new Date(now);
				d.setDate(d.getDate() - (weeks - 1 - i) * 7);
				buckets.set(d.toISOString().slice(0, 10), 0);
			}
			const bucketKeys = Array.from(buckets.keys()).sort();
			for (const r of reservations) {
				const rDate = new Date(r.startDate).toISOString().slice(0, 10);
				const bucket = [...bucketKeys].reverse().find((k: string) => k <= rDate);
				if (bucket) buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
			}
			return bucketKeys.map((date) => ({ date, count: buckets.get(date) ?? 0 }));
		}

		const buckets = new Map<string, number>();
		for (let i = 0; i < clampedDays; i++) {
			const d = new Date(now);
			d.setDate(d.getDate() - (clampedDays - 1 - i));
			buckets.set(d.toISOString().slice(0, 10), 0);
		}
		for (const r of reservations) {
			const date = new Date(r.startDate).toISOString().slice(0, 10);
			if (buckets.has(date)) buckets.set(date, (buckets.get(date) ?? 0) + 1);
		}
		return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
	}
});

export const getAttentionNeeded = authedQuery({
	args: {
		sites: v.optional(v.array(v.string()))
	},
	handler: async (ctx, { sites }) => {
		const { organizationId } = await getUserOrg(ctx);

		let vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		if (sites && sites.length > 0) {
			vehicles = vehicles.filter((v) => v.location && sites.includes(v.location));
		}

		const now = Date.now();
		const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

		const leaseEndingSoon = vehicles
			.filter((v) => {
				if (!v.leaseEndDate) return false;
				const end = new Date(v.leaseEndDate).getTime();
				return end > now && end - now < ninetyDaysMs;
			})
			.sort((a, b) => {
				const aEnd = new Date(a.leaseEndDate!).getTime();
				const bEnd = new Date(b.leaseEndDate!).getTime();
				return aEnd - bEnd;
			})
			.slice(0, 5);

		const configs = await ctx.db
			.query('vehicleMaintenanceConfig')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		const configByVehicle = new Map(configs.map((c) => [c.vehicleId.toString(), c]));

		const twelveMonthsAgo = now - 365 * 24 * 60 * 60 * 1000;
		const KM_THRESHOLD = 15_000;

		const maintenanceDue = vehicles
			.filter((v) => {
				const config = configByVehicle.get(v._id.toString());
				if (!config) return false;
				const kmSinceLast = (v.kilometers ?? 0) - (config.lastRevisionKm ?? 0);
				const overdue =
					(config.lastRevisionDate !== undefined && config.lastRevisionDate < twelveMonthsAgo) ||
					kmSinceLast > (config.customIntervalKm ?? KM_THRESHOLD);
				return overdue;
			})
			.slice(0, 5);

		return { leaseEndingSoon, maintenanceDue };
	}
});

export const getRecentActivity = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);

		const reservations = await ctx.db
			.query('reservations')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.take(15);

		return Promise.all(
			reservations.map(async (r) => {
				const vehicle = await ctx.db.get(r.vehicleId);
				const vehicleLabel = vehicle
					? `${vehicle.brand} ${vehicle.model} · ${vehicle.registration}`
					: 'Véhicule inconnu';

				let type: string;
				let description: string;

				switch (r.status) {
					case 'CONFIRMED':
					case 'PENDING':
						type = 'reservation_created';
						description = `Réservation confirmée — ${vehicleLabel}`;
						break;
					case 'IN_PROGRESS':
						type = 'reservation_created';
						description = `En cours — ${vehicleLabel}`;
						break;
					case 'COMPLETED':
						type = 'reservation_returned';
						description = `Retour véhicule — ${vehicleLabel}`;
						break;
					case 'CANCELLED':
						type = 'status_changed';
						description = `Annulée — ${vehicleLabel}`;
						break;
					default:
						type = 'reservation_created';
						description = vehicleLabel;
				}

				return {
					id: r._id as string,
					type,
					description,
					timestamp: r.updatedAt
				};
			})
		);
	}
});

export const getVehicleLocations = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		return vehicles.map((v) => ({
			_id: v._id as string,
			brand: v.brand,
			model: v.model,
			registration: v.registration,
			status: v.status,
			site: v.location?.trim() ?? null,
			latitude: v.smartcarLatitude ?? null,
			longitude: v.smartcarLongitude ?? null,
			lastSync: v.smartcarLastSync ?? null,
			smartcarLinked: !!v.smartcarVehicleId,
		}));
	}
});

export const getSiteDistribution = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);

		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const siteMap = new Map<
			string,
			{ total: number; available: number; inUse: number; maintenance: number; retired: number }
		>();

		for (const v of vehicles) {
			const site = v.location?.trim() || '(Non assigné)';
			const entry = siteMap.get(site) ?? { total: 0, available: 0, inUse: 0, maintenance: 0, retired: 0 };
			entry.total++;
			if (v.status === 'AVAILABLE') entry.available++;
			else if (v.status === 'IN_USE') entry.inUse++;
			else if (v.status === 'MAINTENANCE') entry.maintenance++;
			else if (v.status === 'RETIRED') entry.retired++;
			siteMap.set(site, entry);
		}

		return Array.from(siteMap.entries())
			.map(([site, counts]) => ({ site, ...counts }))
			.sort((a, b) => b.total - a.total);
	}
});

export const getAvailableSites = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);

		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const sites = new Set<string>();
		for (const v of vehicles) {
			if (v.location?.trim()) sites.add(v.location.trim());
		}

		return Array.from(sites).sort();
	}
});
