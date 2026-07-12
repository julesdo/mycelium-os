import { internalAction, internalMutation, internalQuery } from '../_generated/server';
import { v } from 'convex/values';
import { makeFunctionReference } from 'convex/server';

// All cross-module function refs declared up front via makeFunctionReference to avoid
// circular type dependency through _generated/api.d.ts (api.d.ts → typeof demo_simulation
// → infers handler bodies → api.d.ts → circular TS7022/7023)
const _getActiveDemoOrgs = makeFunctionReference<'query'>('demo/simulation:getActiveDemoOrgs');
const _updateDemoOrgPositions = makeFunctionReference<'mutation'>('demo/simulation:updateDemoOrgPositions');
const _generateDailyDemoEvents = makeFunctionReference<'mutation'>('demo/simulation:generateDailyDemoEvents');
const _checkDemoExpirations = makeFunctionReference<'mutation'>('demo/simulation:checkDemoExpirations');
const _upsertTaskFromSource = makeFunctionReference<'mutation'>('concierge/tasks:upsertTaskFromSource');

// ─── Simulation algorithm ─────────────────────────────────────────────────────

const REGION_CENTERS: Record<string, { lat: number; lng: number }> = {
	FR: { lat: 48.85, lng: 2.35 },
	GB: { lat: 51.5, lng: -0.12 },
	SE: { lat: 57.71, lng: 11.97 },
	NO: { lat: 59.91, lng: 10.75 },
	DK: { lat: 55.68, lng: 12.57 },
	DE: { lat: 52.52, lng: 13.4 },
	NL: { lat: 52.37, lng: 4.89 }
};

const RADIUS_KM: Record<string, number> = {
	btp: 0.4,
	distribution: 0.3,
	vtc: 0.5,
	services: 0.6,
	commerce: 0.8,
	sante: 0.25,
	public: 0.2
};

function simulateVehiclePosition(params: {
	vehicleIndex: number;
	templateId: string;
	country: string;
	now: number;
	currentOdometer: number;
}) {
	const center = REGION_CENTERS[params.country] ?? REGION_CENTERS['FR'];
	const hour = new Date(params.now).getHours();
	const radiusKm = RADIUS_KM[params.templateId] ?? 0.4;

	// Déterministe : sin(index + heure) → même résultat pour un instant T donné
	const isBusinessHours = hour >= 7 && hour < 19;
	const isActive = isBusinessHours && Math.sin(params.vehicleIndex + hour) > 0;

	if (!isActive) {
		const depotOffset = params.vehicleIndex * 0.001;
		return {
			lat: center.lat + depotOffset,
			lng: center.lng + depotOffset * 0.5,
			speed: 0,
			heading: (params.vehicleIndex * 45) % 360,
			status: 'parked' as const,
			fuelOrSocPercent: Math.min(100, 70 + (params.vehicleIndex % 30)),
			odometerKm: params.currentOdometer
		};
	}

	// En mouvement : position sur un arc autour du dépôt
	const angle = ((params.now / 60000 + params.vehicleIndex * 37) % 360) * (Math.PI / 180);
	const dist = radiusKm * (0.3 + 0.7 * Math.abs(Math.sin(params.vehicleIndex)));
	const KM_TO_LAT = 1 / 111;
	const KM_TO_LNG = 1 / (111 * Math.cos((center.lat * Math.PI) / 180));

	const lat = center.lat + dist * Math.cos(angle) * KM_TO_LAT;
	const lng = center.lng + dist * Math.sin(angle) * KM_TO_LNG;
	const speed = 30 + Math.abs(Math.sin(params.vehicleIndex + hour)) * 80;
	const heading = ((angle * 180) / Math.PI + 90) % 360;
	const kmTraveled = (speed * 5) / 60;
	const consumptionFactor = params.templateId === 'vtc' ? 8 : 12;
	const socDrop = (kmTraveled * consumptionFactor) / 100;

	return {
		lat,
		lng,
		speed,
		heading,
		status: 'moving' as const,
		fuelOrSocPercent: Math.max(15, 80 - socDrop * (params.vehicleIndex % 10 + 1)),
		odometerKm: params.currentOdometer + kmTraveled
	};
}

// ─── Internal queries ─────────────────────────────────────────────────────────

export const getActiveDemoOrgs = internalQuery({
	args: {},
	handler: async (ctx): Promise<Array<{ _id: string; country?: string; demoConfig: { templateId: string } | null }>> => {
		const orgs = await ctx.db
			.query('organizations')
			.filter((q) => q.eq(q.field('isDemo'), true))
			.collect();
		const now = Date.now();
		return orgs
			.filter((o) => o.demoConfig && !o.demoConfig.isExpired && o.demoConfig.expiresAt > now)
			.map((o) => ({ _id: o._id, country: o.country, demoConfig: o.demoConfig ?? null }));
	}
});

// ─── Internal mutations ───────────────────────────────────────────────────────

export const updateDemoOrgPositions = internalMutation({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }): Promise<void> => {
		const org = await ctx.db.get(organizationId);
		if (!org?.demoConfig) return;

		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const now = Date.now();
		const templateId = org.demoConfig.templateId;
		const country = org.country ?? 'FR';

		for (let i = 0; i < vehicles.length; i++) {
			const vehicle = vehicles[i];
			if (!vehicle) continue;

			const currentPos = await ctx.db
				.query('demoVehiclePositions')
				.withIndex('by_vehicle', (q) => q.eq('vehicleId', vehicle._id))
				.first();

			const simResult = simulateVehiclePosition({
				vehicleIndex: i,
				templateId,
				country,
				now,
				currentOdometer: currentPos?.odometerKm ?? (vehicle.kilometers ?? 30000)
			});

			if (currentPos) {
				await ctx.db.patch(currentPos._id, { ...simResult, updatedAt: now });
			} else {
				await ctx.db.insert('demoVehiclePositions', {
					vehicleId: vehicle._id,
					organizationId,
					...simResult,
					updatedAt: now
				});
			}
		}
	}
});

export const generateDailyDemoEvents = internalMutation({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }): Promise<void> => {
		const org = await ctx.db.get(organizationId);
		if (!org?.demoConfig) return;

		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		if (vehicles.length === 0) return;

		// ~1/7 days → maintenance alert (déterministe par org + date)
		const day = new Date().getDate();
		const maintenanceSeed = (organizationId.charCodeAt(0) + day) % 7;
		if (maintenanceSeed === 0) {
			const vehicle = vehicles[day % vehicles.length];
			if (vehicle) {
				await ctx.db.insert('maintenanceRecords', {
					organizationId,
					vehicleId: vehicle._id,
					maintenanceType: 'REVISION',
					scheduledDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
					status: 'SCHEDULED',
					scheduledBy: 'demo-system',
					notes: 'Révision annuelle (démo simulée)',
					createdAt: Date.now(),
					updatedAt: Date.now()
				});
			}
		}

		// ~1/30 days → compliance task (déterministe par org + mois)
		const month = new Date().getMonth();
		const complianceSeed = (organizationId.charCodeAt(0) + month) % 30;
		if (complianceSeed === 0) {
			await ctx.scheduler.runAfter(0, _upsertTaskFromSource, {
				organizationId,
				sourceType: 'COMPLIANCE_ALERT',
				sourceId: `demo-compliance-${organizationId}-${month}`,
				title: 'Permis conducteur proche expiration (démo)',
				description: 'Un conducteur de la flotte démo a un permis expirant dans 30 jours.',
				dueDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
				isRegulatory: true
			});
		}
	}
});

export const checkDemoExpirations = internalMutation({
	args: {},
	handler: async (ctx): Promise<void> => {
		const now = Date.now();
		const orgs = await ctx.db
			.query('organizations')
			.filter((q) => q.eq(q.field('isDemo'), true))
			.collect();

		for (const org of orgs) {
			if (!org.demoConfig || org.demoConfig.isExpired) continue;
			if (org.demoConfig.expiresAt < now) {
				await ctx.db.patch(org._id, {
					demoConfig: { ...org.demoConfig, isExpired: true }
				});
			}
		}
	}
});

// ─── Internal actions (cron entry points) ────────────────────────────────────

export const updateAllDemoPositions = internalAction({
	args: {},
	handler: async (ctx): Promise<void> => {
		const orgs = (await ctx.runQuery(_getActiveDemoOrgs, {})) as Array<{ _id: string }>;
		for (const org of orgs) {
			try {
				await ctx.runMutation(_updateDemoOrgPositions, { organizationId: org._id });
			} catch {
				// Ne pas bloquer les autres orgs si une échoue
			}
		}
	}
});

export const generateAllDailyDemoEvents = internalAction({
	args: {},
	handler: async (ctx): Promise<void> => {
		const orgs = (await ctx.runQuery(_getActiveDemoOrgs, {})) as Array<{ _id: string }>;
		for (const org of orgs) {
			try {
				await ctx.runMutation(_generateDailyDemoEvents, { organizationId: org._id });
			} catch {
				// Ne pas bloquer les autres orgs si une échoue
			}
		}
		await ctx.runMutation(_checkDemoExpirations, {});
	}
});
