import { v, ConvexError } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from './_generated/server';
import { authedQuery, authedMutation } from './functions';
import { getUserOrg, requireOrgAdmin } from './lib/auth';
import type { ActionCtx } from './_generated/server';
import { internal, components } from './_generated/api';
import { resend, assertResendApiKey } from './emails/resend';
import { requireEnv } from './env';
import type { Id } from './_generated/dataModel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(isoDate: string, nowMs: number): number {
	return Math.floor((new Date(isoDate).getTime() - nowMs) / (1000 * 60 * 60 * 24));
}

const THRESHOLDS = [
	{ days: 7, horizon: '7_DAYS' as const },
	{ days: 30, horizon: '30_DAYS' as const }
];

// ─── Internal queries ─────────────────────────────────────────────────────────

const alertTypeValidator = v.union(
	v.literal('INSURANCE_EXPIRING'),
	v.literal('INSURANCE_EXPIRED'),
	v.literal('CT_EXPIRING'),
	v.literal('CT_EXPIRED'),
	v.literal('LICENSE_EXPIRING'),
	v.literal('LICENSE_EXPIRED'),
	v.literal('REGISTRATION_EXPIRING'),
	v.literal('REGISTRATION_EXPIRED')
);

type AlertType =
	| 'INSURANCE_EXPIRING' | 'INSURANCE_EXPIRED'
	| 'CT_EXPIRING' | 'CT_EXPIRED'
	| 'LICENSE_EXPIRING' | 'LICENSE_EXPIRED'
	| 'REGISTRATION_EXPIRING' | 'REGISTRATION_EXPIRED';

type Horizon = '30_DAYS' | '7_DAYS' | 'EXPIRED';

export const getActiveAlert = internalQuery({
	args: {
		entityId: v.string(),
		alertType: alertTypeValidator,
		horizon: v.union(v.literal('30_DAYS'), v.literal('7_DAYS'), v.literal('EXPIRED'))
	},
	handler: async (ctx, { entityId, alertType, horizon }) => {
		return ctx.db
			.query('complianceAlerts')
			.withIndex('by_entity_type_horizon', (q) =>
				q.eq('entityId', entityId).eq('alertType', alertType).eq('horizon', horizon)
			)
			.filter((q) => q.eq(q.field('resolvedAt'), undefined))
			.first();
	}
});

export const getActiveAlertsForOrg = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		return ctx.db
			.query('complianceAlerts')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.eq(q.field('resolvedAt'), undefined))
			.collect();
	}
});

export const getDriverProfilesForOrg = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const members = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
			.collect();

		const profiles = await Promise.all(
			members.map((m) =>
				ctx.db
					.query('driverProfiles')
					.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
					.filter((q) => q.eq(q.field('userId'), m.userId))
					.first()
			)
		);
		return profiles.filter((p): p is NonNullable<typeof p> => p !== null);
	}
});

// ─── Internal mutations ────────────────────────────────────────────────────────

export const createAlert = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		entityType: v.union(v.literal('VEHICLE'), v.literal('DRIVER')),
		entityId: v.string(),
		alertType: alertTypeValidator,
		horizon: v.union(v.literal('30_DAYS'), v.literal('7_DAYS'), v.literal('EXPIRED')),
		expiryDate: v.string(),
		entityLabel: v.string()
	},
	handler: async (ctx, args) => {
		await ctx.db.insert('complianceAlerts', { ...args, createdAt: Date.now() });
	}
});

// ─── Cron: daily compliance check ────────────────────────────────────────────

export const checkComplianceForAllOrgs = internalAction({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const orgs = await ctx.runQuery(internal.optimizer.listActiveOrgs);
		for (const org of orgs) {
			try {
				await ctx.runAction(internal.compliance.checkComplianceForOrg, {
					organizationId: org._id
				});
			} catch {
				// org failure must not block others
			}
		}
		return null;
	}
});

export const checkComplianceForOrg = internalAction({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const now = Date.now();

		// 1. Vehicles — CT, assurance, carte grise
		const vehicleList = await ctx.runQuery(internal.compliance.listVehiclesForCompliance, {
			organizationId
		});

		for (const vehicle of vehicleList) {
			const label = `${vehicle.brand} ${vehicle.model} (${vehicle.registration})`;

			// Contrôle technique
			if (vehicle.ctExpiryDate) {
				const d = daysUntil(vehicle.ctExpiryDate, now);
				await maybeAlert(ctx, {
					organizationId, entityType: 'VEHICLE', entityId: vehicle._id,
					baseType: 'CT', expiryDate: vehicle.ctExpiryDate, daysLeft: d, entityLabel: `CT — ${label}`
				});
			}

			// Assurance
			if (vehicle.insuranceExpiryDate) {
				const d = daysUntil(vehicle.insuranceExpiryDate, now);
				await maybeAlert(ctx, {
					organizationId, entityType: 'VEHICLE', entityId: vehicle._id,
					baseType: 'INSURANCE', expiryDate: vehicle.insuranceExpiryDate, daysLeft: d, entityLabel: `Assurance — ${label}`
				});
			}

			// Carte grise
			if (vehicle.registrationExpiryDate) {
				const d = daysUntil(vehicle.registrationExpiryDate, now);
				await maybeAlert(ctx, {
					organizationId, entityType: 'VEHICLE', entityId: vehicle._id,
					baseType: 'REGISTRATION', expiryDate: vehicle.registrationExpiryDate, daysLeft: d, entityLabel: `Carte grise — ${label}`
				});
			}
		}

		// 2. Drivers — permis
		const profiles = await ctx.runQuery(internal.compliance.getDriverProfilesForOrg, {
			organizationId
		});

		for (const profile of profiles) {
			if (!profile.licenseExpiryDate) continue;
			const d = daysUntil(profile.licenseExpiryDate, now);
			await maybeAlert(ctx, {
				organizationId, entityType: 'DRIVER', entityId: profile.userId,
				baseType: 'LICENSE', expiryDate: profile.licenseExpiryDate, daysLeft: d,
				entityLabel: `Permis conducteur (${profile.userId})`
			});
		}
	}
});

type BaseType = 'CT' | 'INSURANCE' | 'REGISTRATION' | 'LICENSE';

async function maybeAlert(
	ctx: ActionCtx,
	params: {
		organizationId: Id<'organizations'>;
		entityType: 'VEHICLE' | 'DRIVER';
		entityId: string;
		baseType: BaseType;
		expiryDate: string;
		daysLeft: number;
		entityLabel: string;
	}
) {
	const { organizationId, entityType, entityId, baseType, expiryDate, daysLeft, entityLabel } = params;

	let alertType: AlertType;
	let horizon: Horizon;

	if (daysLeft < 0) {
		alertType = `${baseType}_EXPIRED` as AlertType;
		horizon = 'EXPIRED';
	} else if (daysLeft <= 7) {
		alertType = `${baseType}_EXPIRING` as AlertType;
		horizon = '7_DAYS';
	} else if (daysLeft <= 30) {
		alertType = `${baseType}_EXPIRING` as AlertType;
		horizon = '30_DAYS';
	} else {
		return;
	}

	const existing = await ctx.runQuery(internal.compliance.getActiveAlert, {
		entityId, alertType, horizon
	});
	if (existing) return;

	await ctx.runMutation(internal.compliance.createAlert, {
		organizationId, entityType, entityId, alertType, horizon, expiryDate, entityLabel
	});
}

export const getAdminUserIdsForOrg = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const admins = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.eq(q.field('role'), 'ORG_ADMIN'))
			.collect();
		return admins.map((a) => a.userId);
	}
});

export const listVehiclesForCompliance = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		return ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.neq(q.field('status'), 'RETIRED'))
			.collect();
	}
});

// ─── Cron: weekly digest ──────────────────────────────────────────────────────

export const sendWeeklyComplianceDigest = internalAction({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		assertResendApiKey();
		const siteUrl = requireEnv('SITE_URL', { feature: 'compliance digest' });
		const authEmail = requireEnv('AUTH_EMAIL', { feature: 'compliance digest' });

		const orgs = await ctx.runQuery(internal.optimizer.listActiveOrgs);

		for (const org of orgs) {
			const alerts = await ctx.runQuery(internal.compliance.getActiveAlertsForOrg, {
				organizationId: org._id
			});
			if (alerts.length === 0) continue;

			const expired = alerts.filter((a) => a.horizon === 'EXPIRED');
			const critical = alerts.filter((a) => a.horizon === '7_DAYS');
			const warning = alerts.filter((a) => a.horizon === '30_DAYS');

			const adminUserIds = await ctx.runQuery(internal.compliance.getAdminUserIdsForOrg, {
				organizationId: org._id
			});

			const emails: string[] = [];
			for (const userId of adminUserIds) {
				const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
					model: 'user',
					where: [{ field: '_id', operator: 'eq', value: userId }]
				}) as { email?: string } | null;
				if (user?.email) emails.push(user.email);
			}
			if (emails.length === 0) continue;

			const urgentCount = expired.length + critical.length;
			const html = buildDigestHtml({
				orgName: org.name,
				expired,
				critical,
				warning,
				complianceUrl: `${siteUrl}/admin/compliance`
			});

			for (const email of emails) {
				await resend.sendEmail(ctx, {
					from: authEmail,
					to: email,
					subject: `[Compliance] ${urgentCount} alerte(s) urgente(s) — ${org.name}`,
					html
				});
			}
		}
		return null;
	}
});

type AlertItem = { entityLabel: string; expiryDate: string };

function buildDigestHtml(params: {
	orgName: string;
	expired: AlertItem[];
	critical: AlertItem[];
	warning: AlertItem[];
	complianceUrl: string;
}): string {
	const { orgName, expired, critical, warning, complianceUrl } = params;

	const section = (title: string, color: string, items: AlertItem[]) => {
		if (!items.length) return '';
		return `
<h3 style="color:${color};font-size:14px;font-weight:700;margin:20px 0 8px;">${title} (${items.length})</h3>
<ul style="margin:0;padding-left:20px;font-size:13px;color:#374151;">
  ${items.map((a) => `<li style="margin-bottom:5px;"><strong>${a.entityLabel}</strong> — expire le ${new Date(a.expiryDate).toLocaleDateString('fr-FR')}</li>`).join('')}
</ul>`;
	};

	return `<!DOCTYPE html>
<html lang="fr">
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
  <div style="background:#0f0f0f;padding:20px 24px;display:flex;align-items:center;gap:10px;">
    <span style="color:#f5e642;font-size:16px;font-weight:700;">Mycelium</span>
    <span style="color:#666;font-size:13px;">Compliance Officer</span>
  </div>
  <div style="padding:24px;">
    <p style="margin:0 0 4px;font-size:13px;color:#6b7280;">Digest hebdomadaire</p>
    <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#111;">${orgName}</h1>
    ${section('🔴 Éléments expirés', '#dc2626', expired)}
    ${section('🟠 Expiration dans 7 jours', '#d97706', critical)}
    ${section('🟡 Expiration dans 30 jours', '#ca8a04', warning)}
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb;">
      <a href="${complianceUrl}" style="display:inline-block;background:#f5e642;color:#0f0f0f;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
        Gérer les alertes →
      </a>
    </div>
  </div>
  <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:11px;color:#9ca3af;">Mycelium Fleet OS — Compliance Officer automatique</p>
  </div>
</div>
</body>
</html>`;
}

// ─── Public queries / mutations ───────────────────────────────────────────────

export const listActiveAlerts = authedQuery({
	args: {
		entityType: v.optional(v.union(v.literal('VEHICLE'), v.literal('DRIVER'))),
		alertType: v.optional(v.string()),
		horizon: v.optional(v.union(v.literal('30_DAYS'), v.literal('7_DAYS'), v.literal('EXPIRED')))
	},
	handler: async (ctx, { entityType, alertType, horizon }) => {
		const { organizationId } = await getUserOrg(ctx);

		let alerts = await ctx.db
			.query('complianceAlerts')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.eq(q.field('resolvedAt'), undefined))
			.collect();

		if (entityType) alerts = alerts.filter((a) => a.entityType === entityType);
		if (alertType) alerts = alerts.filter((a) => a.alertType === alertType);
		if (horizon) alerts = alerts.filter((a) => a.horizon === horizon);

		// Sort: EXPIRED first, then 7_DAYS, then 30_DAYS
		const order = { EXPIRED: 0, '7_DAYS': 1, '30_DAYS': 2 };
		return alerts.sort((a, b) => (order[a.horizon] ?? 9) - (order[b.horizon] ?? 9));
	}
});

export const getComplianceStats = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const alerts = await ctx.db
			.query('complianceAlerts')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.eq(q.field('resolvedAt'), undefined))
			.collect();

		return {
			expired: alerts.filter((a) => a.horizon === 'EXPIRED').length,
			critical: alerts.filter((a) => a.horizon === '7_DAYS').length,
			warning: alerts.filter((a) => a.horizon === '30_DAYS').length,
			total: alerts.length
		};
	}
});

export const resolveAlert = authedMutation({
	args: { alertId: v.id('complianceAlerts') },
	handler: async (ctx, { alertId }) => {
		const { organizationId } = await getUserOrg(ctx);

		const alert = await ctx.db.get(alertId);
		if (!alert || alert.organizationId !== organizationId)
			throw new ConvexError('Alerte introuvable');

		await ctx.db.patch(alertId, { resolvedAt: Date.now() });
	}
});

export const resolveAllAlerts = authedMutation({
	args: {},
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, ctx.user._id);

		const alerts = await ctx.db
			.query('complianceAlerts')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.eq(q.field('resolvedAt'), undefined))
			.collect();

		await Promise.all(alerts.map((a) => ctx.db.patch(a._id, { resolvedAt: Date.now() })));
		return alerts.length;
	}
});
