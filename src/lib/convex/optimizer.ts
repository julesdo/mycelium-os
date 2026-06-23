import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from './_generated/server';
import { components, internal } from './_generated/api';
import { resend, assertResendApiKey } from './emails/resend';
import { requireEnv } from './env';
import type { GenericMutationCtx } from 'convex/server';
import type { DataModel } from './_generated/dataModel';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Recommendation {
	type: string;
	vehicleId?: string | null;
	title: string;
	description: string;
	estimatedSaving?: number;
	priority: 'high' | 'medium' | 'low';
	actionLabel?: string;
}

interface OptimizerAnalysis {
	summary: string;
	recommendations: Recommendation[];
}

type BetterAuthUser = { _id: string; email: string; name?: string | null } | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekStart(): string {
	const now = new Date();
	const day = now.getUTCDay();
	const diff = day === 0 ? -6 : 1 - day;
	const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff));
	return monday.toISOString().slice(0, 10);
}

async function getUserEmail(
	ctx: GenericMutationCtx<DataModel>,
	userId: string
): Promise<{ email: string; name: string } | null> {
	const user = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
		model: 'user',
		where: [{ field: '_id', operator: 'eq', value: userId }]
	})) as BetterAuthUser;
	if (!user?.email) return null;
	return { email: user.email, name: user.name ?? 'Admin' };
}

// ─── Shared validator ─────────────────────────────────────────────────────────

const recommendationValidator = v.object({
	type: v.string(),
	vehicleId: v.optional(v.id('vehicles')),
	title: v.string(),
	description: v.string(),
	estimatedSaving: v.optional(v.number()),
	priority: v.union(v.literal('high'), v.literal('medium'), v.literal('low')),
	actionLabel: v.optional(v.string())
});

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getReportForWeek = internalQuery({
	args: { organizationId: v.id('organizations'), weekOf: v.string() },
	handler: async (ctx, { organizationId, weekOf }) =>
		ctx.db
			.query('optimizerReports')
			.withIndex('by_org_and_week', (q) =>
				q.eq('organizationId', organizationId).eq('weekOf', weekOf)
			)
			.unique()
});

export const listActiveOrgs = internalQuery({
	args: {},
	handler: async (ctx) => ctx.db.query('organizations').collect()
});

export const collectFleetDataForOrg = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const now = Date.now();
		const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
		const ninetyDaysAheadDate = new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.neq(q.field('status'), 'RETIRED'))
			.collect();

		const reservations = await ctx.db
			.query('reservations')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.gte(q.field('startDate'), ninetyDaysAgo))
			.collect();

		const activeReservations = reservations.filter((r) => r.status !== 'CANCELLED');

		const costs = await ctx.db
			.query('costs')
			.withIndex('by_org_date', (q) =>
				q.eq('organizationId', organizationId).gte('date', ninetyDaysAgo)
			)
			.collect();

		const overdueMaintenance = await ctx.db
			.query('maintenanceRecords')
			.withIndex('by_org_and_status', (q) =>
				q.eq('organizationId', organizationId).eq('status', 'SCHEDULED')
			)
			.filter((q) => q.lt(q.field('scheduledDate'), now))
			.collect();

		const vehicleStats = vehicles.map((v) => {
			const vReservations = activeReservations.filter((r) => r.vehicleId === v._id);
			const totalDaysBooked = vReservations.reduce((sum, r) => {
				const rStart = Math.max(r.startDate, ninetyDaysAgo);
				const rEnd = Math.min(r.endDate, now);
				return sum + Math.max(0, (rEnd - rStart) / (24 * 60 * 60 * 1000));
			}, 0);
			const utilizationPct = Math.round((totalDaysBooked / 90) * 100);

			const vCosts = costs.filter((c) => c.vehicleId === v._id);
			const totalCost90Days = Math.round(vCosts.reduce((sum, c) => sum + c.amount, 0) * 100) / 100;
			const leasingCost = Math.round(
				vCosts.filter((c) => c.category === 'LEASING').reduce((sum, c) => sum + c.amount, 0) * 100
			) / 100;

			return {
				label: `${v.brand} ${v.model} (${v.registration})`,
				registration: v.registration,
				status: v.status,
				utilizationPct,
				reservationCount: vReservations.length,
				totalCost90Days,
				leasingCost90Days: leasingCost,
				leaseEndDate: v.leaseEndDate ?? null,
				leaseExpiresSoon: !!v.leaseEndDate && v.leaseEndDate <= ninetyDaysAheadDate,
				hasOverdueMaintenance: overdueMaintenance.some((m) => m.vehicleId === v._id)
			};
		});

		const costsByCategory: Record<string, number> = {};
		for (const c of costs) {
			costsByCategory[c.category] = Math.round(
				((costsByCategory[c.category] ?? 0) + c.amount) * 100
			) / 100;
		}

		return {
			vehicleCount: vehicles.length,
			totalCosts90Days: Math.round(costs.reduce((sum, c) => sum + c.amount, 0) * 100) / 100,
			costsByCategory,
			overdueMaintenanceCount: overdueMaintenance.length,
			vehicleStats
		};
	}
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const saveReport = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		weekOf: v.string(),
		recommendations: v.array(recommendationValidator)
	},
	handler: async (ctx, args) =>
		ctx.db.insert('optimizerReports', { ...args, createdAt: Date.now() })
});

export const sendOptimizerReportEmail = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		reportId: v.id('optimizerReports'),
		summary: v.string(),
		recommendations: v.array(recommendationValidator)
	},
	handler: async (ctx, { organizationId, reportId, summary, recommendations }) => {
		assertResendApiKey();

		const admins = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.eq(q.field('role'), 'ORG_ADMIN'))
			.collect();

		if (admins.length === 0) return;

		const siteUrl = requireEnv('SITE_URL', { feature: 'optimizer email links' });
		const authEmail = requireEnv('AUTH_EMAIL', { feature: 'optimizer email delivery' });
		const dashboardUrl = `${siteUrl}/admin/dashboard`;
		const weekLabel = new Date().toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});

		const high = recommendations.filter((r) => r.priority === 'high');
		const medium = recommendations.filter((r) => r.priority === 'medium');
		const low = recommendations.filter((r) => r.priority === 'low');

		function renderRec(r: typeof recommendations[number]): string {
			const saving = r.estimatedSaving
				? `<div style="margin-top:6px;color:#16a34a;font-size:13px;font-weight:600;">Économie estimée : ${r.estimatedSaving.toLocaleString('fr-FR')} €/an</div>`
				: '';
			return `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:10px;background:#fff;">
  <div style="font-size:14px;font-weight:600;color:#111;">${r.title}</div>
  <div style="font-size:13px;color:#555;margin-top:4px;">${r.description}</div>${saving}
</div>`;
		}

		function section(title: string, color: string, recs: typeof recommendations): string {
			if (recs.length === 0) return '';
			return `<h2 style="color:${color};font-size:14px;font-weight:700;margin:20px 0 8px;">${title}</h2>${recs.map(renderRec).join('')}`;
		}

		const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:#0f0f0f;border-radius:12px;padding:24px;margin-bottom:20px;">
    <div style="font-size:20px;font-weight:700;color:#f5e642;">🌿 Mycelium Insights</div>
    <div style="color:#888;font-size:13px;margin-top:6px;">Rapport hebdomadaire flotte — ${weekLabel}</div>
  </div>
  <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
    <p style="font-size:15px;color:#333;margin:0 0 16px;">${summary}</p>
    ${section('⚠️ Actions prioritaires', '#dc2626', high)}
    ${section("💡 Opportunités d'optimisation", '#d97706', medium)}
    ${section('ℹ️ À surveiller', '#6b7280', low)}
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
      <a href="${dashboardUrl}" style="background:#f5e642;color:#0f0f0f;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">Voir le tableau de bord →</a>
    </div>
  </div>
  <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px;">
    Ces insights sont générés automatiquement par Mycelium Fleet OS.
  </p>
</div>
</body>
</html>`;

		const highCount = high.length;
		const subject =
			highCount > 0
				? `Mycelium Insights — ${highCount} action${highCount > 1 ? 's' : ''} prioritaire${highCount > 1 ? 's' : ''} cette semaine`
				: 'Mycelium Insights — Rapport hebdomadaire flotte';

		for (const admin of admins) {
			const userInfo = await getUserEmail(ctx, admin.userId);
			if (!userInfo) continue;

			await resend.sendEmail(ctx, {
				from: authEmail,
				to: userInfo.email,
				subject,
				html
			});
		}

		await ctx.db.patch(reportId, { emailSentAt: Date.now() });
	}
});

// ─── Actions ──────────────────────────────────────────────────────────────────

const OPTIMIZER_SYSTEM_PROMPT = `Tu es un analyste expert en optimisation de flotte d'entreprise française.
Tu analyses les données d'utilisation, de coûts et de maintenance pour identifier des opportunités d'économie concrètes.

## Format de réponse OBLIGATOIRE
Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans \`\`\`json) de ce format exact :
{
  "summary": "Résumé en 1-2 phrases de l'état général de la flotte",
  "recommendations": [
    {
      "type": "underutilized_vehicle | cost_anomaly | maintenance_overdue | lease_renewal | fleet_right_sizing | fuel_efficiency",
      "vehicleId": null,
      "title": "Titre court max 80 chars",
      "description": "Explication détaillée avec chiffres précis tirés des données",
      "estimatedSaving": 4200,
      "priority": "high | medium | low",
      "actionLabel": "Texte bouton max 30 chars"
    }
  ]
}

## Règles strictes
- Maximum 5 recommandations, minimum 1
- Citer UNIQUEMENT des chiffres issus des données fournies
- Ne pas inventer des économies — les calculer depuis les coûts réels
- Véhicule sous-utilisé (<20%) : estimatedSaving = (coûts leasing 90j × 4) + 1200 (assurance estimée)
- vehicleId doit toujours être null (champ non utilisé)
- Toujours répondre en français`;

export const runFleetOptimizerForOrg = internalAction({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const weekOf = getWeekStart();

		const existing = await ctx.runQuery(internal.optimizer.getReportForWeek, {
			organizationId,
			weekOf
		});
		if (existing) return;

		const fleetData = await ctx.runQuery(internal.optimizer.collectFleetDataForOrg, {
			organizationId
		});

		if (fleetData.vehicleCount === 0) return;

		const apiKey = process.env.ANTHROPIC_API_KEY;
		if (!apiKey) return;

		let analysis: OptimizerAnalysis;
		try {
			const res = await fetch('https://api.anthropic.com/v1/messages', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-api-key': apiKey,
					'anthropic-version': '2023-06-01'
				},
				body: JSON.stringify({
					model: 'claude-sonnet-4-6',
					max_tokens: 2048,
					system: [
						{
							type: 'text',
							text: OPTIMIZER_SYSTEM_PROMPT,
							cache_control: { type: 'ephemeral' }
						}
					],
					messages: [
						{
							role: 'user',
							content: `Analyse cette flotte et génère les recommandations d'optimisation.\n\n${JSON.stringify(fleetData, null, 2)}`
						}
					]
				})
			});

			if (!res.ok) return;
			const json = (await res.json()) as { content: { type: string; text: string }[] };
			const textBlock = json.content.find((b) => b.type === 'text');
			if (!textBlock) return;
			analysis = JSON.parse(textBlock.text) as OptimizerAnalysis;
		} catch {
			return;
		}

		if (!analysis.recommendations?.length) return;

		const recs = analysis.recommendations.slice(0, 5).map((r) => ({
			type: r.type,
			title: r.title.slice(0, 120),
			description: r.description,
			estimatedSaving: typeof r.estimatedSaving === 'number' ? r.estimatedSaving : undefined,
			priority: (['high', 'medium', 'low'].includes(r.priority)
				? r.priority
				: 'low') as 'high' | 'medium' | 'low',
			actionLabel: r.actionLabel?.slice(0, 40)
		}));

		const reportId = await ctx.runMutation(internal.optimizer.saveReport, {
			organizationId,
			weekOf,
			recommendations: recs
		});

		await ctx.scheduler.runAfter(0, internal.optimizer.sendOptimizerReportEmail, {
			organizationId,
			reportId,
			summary: analysis.summary,
			recommendations: recs
		});
	}
});

export const runFleetOptimizerForAllOrgs = internalAction({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const orgs = await ctx.runQuery(internal.optimizer.listActiveOrgs);
		for (const org of orgs) {
			try {
				await ctx.runAction(internal.optimizer.runFleetOptimizerForOrg, {
					organizationId: org._id
				});
			} catch {
				// Org failure must not block others
			}
		}
		return null;
	}
});
