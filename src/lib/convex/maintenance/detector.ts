import { v, ConvexError } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { authedQuery } from '../functions';
import { internal } from '../_generated/api';
import { getUserOrg } from '../lib/auth';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAINTENANCE_TYPES = ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS'] as const;
type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_MONTH = 30 * MS_PER_DAY;

// Seuils d'alerte
const NORMAL_DAYS = 30;
const URGENT_DAYS = 7;
const NORMAL_KM = 2000;
const URGENT_KM = 500;

// ─── Types locaux (évite dépendance à _generated/dataModel non encore régénéré) ──

type Severity = 'NORMAL' | 'URGENT' | 'CRITIQUE';

type VehicleAlert = {
	maintenanceType: MaintenanceType;
	severity: Severity;
	daysUntilDue: number | null; // négatif = dépassé
	kmUntilDue: number | null; // négatif = dépassé
	estimatedCost: number | undefined;
};

type MaintenanceRule = {
	intervalKm: number;
	intervalMonths: number;
	estimatedCost?: number;
};

type VehicleConfig = {
	lastRevisionKm?: number;
	lastRevisionDate?: number;
	lastVidangeKm?: number;
	lastVidangeDate?: number;
	lastPneusDate?: number;
	lastFreinsDate?: number;
};

type VehicleData = {
	brand: string;
	model: string;
	registration: string;
	kilometers?: number;
	purchaseDate?: string;
};

// ─── Logique de calcul de sévérité ────────────────────────────────────────────

const SEVERITY_RANK: Record<Severity, number> = { NORMAL: 1, URGENT: 2, CRITIQUE: 3 };

function maxSeverity(a: Severity | null, b: Severity | null): Severity | null {
	if (!a) return b;
	if (!b) return a;
	return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

function calcDateSeverity(daysRemaining: number): Severity | null {
	if (daysRemaining <= 0) return 'CRITIQUE';
	if (daysRemaining <= URGENT_DAYS) return 'URGENT';
	if (daysRemaining <= NORMAL_DAYS) return 'NORMAL';
	return null;
}

function calcKmSeverity(kmRemaining: number): Severity | null {
	if (kmRemaining <= 0) return 'CRITIQUE';
	if (kmRemaining <= URGENT_KM) return 'URGENT';
	if (kmRemaining <= NORMAL_KM) return 'NORMAL';
	return null;
}

function getLastForType(
	config: VehicleConfig | null,
	type: MaintenanceType
): { lastKm: number | undefined; lastDate: number | undefined } {
	if (!config) return { lastKm: undefined, lastDate: undefined };
	switch (type) {
		case 'REVISION':
			return { lastKm: config.lastRevisionKm, lastDate: config.lastRevisionDate };
		case 'VIDANGE':
			return { lastKm: config.lastVidangeKm, lastDate: config.lastVidangeDate };
		case 'PNEUS':
			return { lastKm: undefined, lastDate: config.lastPneusDate };
		case 'FREINS':
			return { lastKm: undefined, lastDate: config.lastFreinsDate };
	}
}

// ─── Analyse d'un véhicule ────────────────────────────────────────────────────

export function analyzeVehicle(
	vehicle: VehicleData,
	config: VehicleConfig | null,
	rulesMap: Map<string, MaintenanceRule>,
	now: number
): VehicleAlert[] {
	const alerts: VehicleAlert[] = [];
	const purchaseDateMs = vehicle.purchaseDate ? new Date(vehicle.purchaseDate).getTime() : null;

	for (const type of MAINTENANCE_TYPES) {
		const rule = rulesMap.get(`${vehicle.brand}|${vehicle.model}|${type}`);
		if (!rule) continue;

		const { lastKm, lastDate } = getLastForType(config, type);

		// Fallback sur la date d'achat si aucun entretien enregistré
		const effectiveLastDate = lastDate ?? purchaseDateMs ?? null;
		const effectiveLastKm = lastKm ?? (purchaseDateMs !== null ? 0 : null);

		// Impossible de calculer sans référence
		if (effectiveLastDate === null && effectiveLastKm === null) continue;

		let severity: Severity | null = null;
		let daysUntilDue: number | null = null;
		let kmUntilDue: number | null = null;

		if (effectiveLastDate !== null) {
			const nextDueDateMs = effectiveLastDate + rule.intervalMonths * MS_PER_MONTH;
			const daysRemaining = (nextDueDateMs - now) / MS_PER_DAY;
			daysUntilDue = Math.round(daysRemaining);
			severity = maxSeverity(severity, calcDateSeverity(daysRemaining));
		}

		if (effectiveLastKm !== null && vehicle.kilometers !== undefined) {
			const nextDueKm = effectiveLastKm + rule.intervalKm;
			const kmRemaining = nextDueKm - vehicle.kilometers;
			kmUntilDue = Math.round(kmRemaining);
			severity = maxSeverity(severity, calcKmSeverity(kmRemaining));
		}

		if (severity !== null) {
			alerts.push({
				maintenanceType: type,
				severity,
				daysUntilDue,
				kmUntilDue,
				estimatedCost: rule.estimatedCost
			});
		}
	}

	// Tri par sévérité décroissante
	return alerts.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
}

// ─── Formatage de la notification ─────────────────────────────────────────────

const TYPE_LABELS: Record<MaintenanceType, string> = {
	REVISION: 'Révision',
	VIDANGE: 'Vidange',
	PNEUS: 'Pneus',
	FREINS: 'Freins'
};

function buildNotification(
	vehicleLabel: string,
	alerts: VehicleAlert[],
	topSeverity: Severity
): { title: string; message: string } {
	const parts = alerts.slice(0, 3).map((a) => {
		const label = TYPE_LABELS[a.maintenanceType];
		if (a.daysUntilDue !== null && a.daysUntilDue <= 0) {
			return `${label} en retard de ${Math.abs(a.daysUntilDue)} j`;
		}
		const bits: string[] = [];
		if (a.daysUntilDue !== null) bits.push(`${a.daysUntilDue} j`);
		if (a.kmUntilDue !== null) bits.push(`${a.kmUntilDue} km`);
		return bits.length > 0 ? `${label} dans ${bits.join(' / ')}` : label;
	});

	const prefix =
		topSeverity === 'CRITIQUE'
			? '⚠️ Entretien en retard'
			: topSeverity === 'URGENT'
				? 'Entretien urgent à prévoir'
				: 'Entretien à planifier';

	return {
		title: `${prefix} — ${vehicleLabel}`,
		message: parts.join(' · ')
	};
}

// ─── Cron handler ─────────────────────────────────────────────────────────────

export const runMaintenanceDetection = internalMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const now = Date.now();
		const oneDayAgo = now - MS_PER_DAY;

		// Chargement global des règles d'entretien (une seule fois pour toutes les orgs)
		const allRules = await ctx.db.query('maintenanceSchedules').collect();
		const rulesMap = new Map<string, MaintenanceRule>();
		for (const rule of allRules) {
			rulesMap.set(`${rule.vehicleBrand}|${rule.vehicleModel}|${rule.maintenanceType}`, {
				intervalKm: rule.intervalKm,
				intervalMonths: rule.intervalMonths,
				estimatedCost: rule.estimatedCost
			});
		}

		if (rulesMap.size === 0) return null; // Aucune règle seedée, skip

		const organizations = await ctx.db.query('organizations').collect();

		for (const org of organizations) {
			const orgId = org._id;

			const admins = await ctx.db
				.query('organizationMembers')
				.withIndex('by_organization', (q) => q.eq('organizationId', orgId))
				.filter((q) => q.eq(q.field('role'), 'ORG_ADMIN'))
				.collect();

			if (admins.length === 0) continue;

			const vehicles = await ctx.db
				.query('vehicles')
				.withIndex('by_org', (q) => q.eq('organizationId', orgId))
				.filter((q) => q.neq(q.field('status'), 'RETIRED'))
				.collect();

			if (vehicles.length === 0) continue;

			// Chargement batch des configs maintenance pour l'org
			const configs = await ctx.db
				.query('vehicleMaintenanceConfig')
				.withIndex('by_org', (q) => q.eq('organizationId', orgId))
				.collect();
			const configMap = new Map<string, VehicleConfig>();
			for (const c of configs) {
				configMap.set(c.vehicleId, c);
			}

			// Chargement batch des notifications MAINTENANCE_DUE non-lues pour le dédoublonnage
			const existingNotifs = await ctx.db
				.query('notifications')
				.withIndex('by_org', (q) => q.eq('organizationId', orgId))
				.filter((q) =>
					q.and(q.eq(q.field('type'), 'MAINTENANCE_DUE'), q.eq(q.field('isRead'), false))
				)
				.collect();

			// Map "vehicleId|userId" → createdAt de la notif la plus récente
			const dedupMap = new Map<string, number>();
			for (const n of existingNotifs) {
				if (!n.vehicleId) continue;
				const key = `${n.vehicleId}|${n.userId}`;
				const existing = dedupMap.get(key);
				if (existing === undefined || n.createdAt > existing) {
					dedupMap.set(key, n.createdAt);
				}
			}

			for (const vehicle of vehicles) {
				const config = configMap.get(vehicle._id) ?? null;
				const alerts = analyzeVehicle(vehicle, config, rulesMap, now);

				if (alerts.length === 0) continue;

				const topSeverity = alerts[0].severity;
				const vehicleLabel = `${vehicle.brand} ${vehicle.model} · ${vehicle.registration}`;
				const { title, message } = buildNotification(vehicleLabel, alerts, topSeverity);

				for (const admin of admins) {
					const dedupKey = `${vehicle._id}|${admin.userId}`;
					const existingCreatedAt = dedupMap.get(dedupKey);

					if (existingCreatedAt !== undefined) {
						// Alerte NORMALE : skip si déjà notifié (quelle que soit l'ancienneté)
						if (topSeverity === 'NORMAL') continue;
						// Alerte URGENTE/CRITIQUE : skip si la dernière notif date de < 24h (anti-spam)
						if (existingCreatedAt >= oneDayAgo) continue;
					}

					await ctx.scheduler.runAfter(0, internal.notifications.createNotification, {
						organizationId: orgId,
						userId: admin.userId,
						type: 'MAINTENANCE_DUE',
						title,
						message,
						link: `/admin/maintenance`,
						vehicleId: vehicle._id
					});
				}
			}
		}

		return null;
	}
});

// ─── Helper debug / trigger manuel ───────────────────────────────────────────

export const checkMaintenanceForVehicle = authedQuery({
	args: { vehicleId: v.id('vehicles') },
	handler: async (ctx, { vehicleId }) => {
		const { organizationId } = await getUserOrg(ctx);

		// requireOrgAdmin est mutation-only ; vérification inline pour la query
		const membership = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', ctx.user._id)
			)
			.unique();
		if (!membership || membership.role !== 'ORG_ADMIN') {
			throw new ConvexError('Accès refusé : rôle ORG_ADMIN requis');
		}

		const vehicle = await ctx.db.get(vehicleId);
		if (!vehicle || vehicle.organizationId !== organizationId) {
			throw new ConvexError('Véhicule introuvable');
		}

		const rules = await ctx.db
			.query('maintenanceSchedules')
			.withIndex('by_brand_model', (q) =>
				q.eq('vehicleBrand', vehicle.brand).eq('vehicleModel', vehicle.model)
			)
			.collect();

		const rulesMap = new Map<string, MaintenanceRule>();
		for (const r of rules) {
			rulesMap.set(`${r.vehicleBrand}|${r.vehicleModel}|${r.maintenanceType}`, {
				intervalKm: r.intervalKm,
				intervalMonths: r.intervalMonths,
				estimatedCost: r.estimatedCost
			});
		}

		const configDoc = await ctx.db
			.query('vehicleMaintenanceConfig')
			.withIndex('by_vehicle', (q) => q.eq('vehicleId', vehicleId))
			.unique();

		const config: VehicleConfig | null = configDoc
			? {
					lastRevisionKm: configDoc.lastRevisionKm,
					lastRevisionDate: configDoc.lastRevisionDate,
					lastVidangeKm: configDoc.lastVidangeKm,
					lastVidangeDate: configDoc.lastVidangeDate,
					lastPneusDate: configDoc.lastPneusDate,
					lastFreinsDate: configDoc.lastFreinsDate
				}
			: null;

		const alerts = analyzeVehicle(vehicle, config, rulesMap, Date.now());

		return {
			vehicle: {
				id: vehicle._id,
				label: `${vehicle.brand} ${vehicle.model} · ${vehicle.registration}`,
				kilometers: vehicle.kilometers ?? null,
				purchaseDate: vehicle.purchaseDate ?? null
			},
			hasConfig: configDoc !== null,
			rulesFound: rules.length,
			alerts
		};
	}
});
