import { v } from 'convex/values';
import { salesQuery, salesMutation } from '../functions';
import { internalMutation, internalQuery } from '../_generated/server';

export const listMySignals = salesQuery({
	args: { onlyUnread: v.optional(v.boolean()) },
	handler: async (ctx, { onlyUnread }) => {
		let signals = await ctx.db
			.query('salesSignals')
			.withIndex('by_sales', (q) => q.eq('salesUserId', ctx.user._id))
			.order('desc')
			.collect();
		if (onlyUnread) {
			signals = signals.filter((s) => !s.readAt && !s.dismissedAt);
		}
		return signals;
	}
});

export const dismissSignal = salesMutation({
	args: { signalId: v.id('salesSignals') },
	handler: async (ctx, { signalId }) => {
		const signal = await ctx.db.get(signalId);
		if (!signal || signal.salesUserId !== ctx.user._id) return;
		await ctx.db.patch(signalId, { dismissedAt: Date.now() });
	}
});

export const markSignalRead = salesMutation({
	args: { signalId: v.id('salesSignals') },
	handler: async (ctx, { signalId }) => {
		const signal = await ctx.db.get(signalId);
		if (!signal || signal.salesUserId !== ctx.user._id) return;
		await ctx.db.patch(signalId, { readAt: Date.now() });
	}
});

// internalQuery : version pour l'Agent Commercial
export const getSignalsForUser = internalQuery({
	args: { salesUserId: v.string() },
	handler: async (ctx, { salesUserId }) => {
		return await ctx.db
			.query('salesSignals')
			.withIndex('by_sales', (q) => q.eq('salesUserId', salesUserId))
			.order('desc')
			.take(20);
	}
});

// Créer un signal depuis le système concierge (démo login, etc.)
export const createSignalFromConcierge = internalMutation({
	args: {
		salesUserId: v.string(),
		prospectId: v.optional(v.id('salesProspects')),
		organizationId: v.optional(v.id('organizations')),
		type: v.union(
			v.literal('demo_login'),
			v.literal('demo_expiring'),
			v.literal('demo_expired'),
			v.literal('upsell_seat_limit'),
			v.literal('upsell_feature_request'),
			v.literal('churn_risk'),
			v.literal('renewal_approaching')
		),
		title: v.string(),
		body: v.string(),
		priority: v.union(v.literal('low'), v.literal('medium'), v.literal('high'))
	},
	handler: async (ctx, args) => {
		await ctx.db.insert('salesSignals', {
			...args,
			createdAt: Date.now()
		});
	}
});

// internalQuery helper pour l'agent : prospects gagnés avec infos démo
export const getWonProspectsWithSales = internalQuery({
	args: { salesUserId: v.string() },
	handler: async (ctx, { salesUserId }) => {
		const prospects = await ctx.db
			.query('salesProspects')
			.withIndex('by_sales', (q) => q.eq('salesUserId', salesUserId))
			.collect();
		return prospects.filter((p) => p.stage === 'won');
	}
});

// internalQuery helper pour l'agent : infos plan d'une org
export const getOrgPlanInfo = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const org = await ctx.db.get(organizationId);
		if (!org) return null;
		return {
			name: org.name,
			plan: org.plan,
			seatsIncluded: org.seatsIncluded,
			freeTrialEndsAt: org.freeTrialEndsAt
		};
	}
});

// Cron : détecte les signaux upsell automatiques
export const detectUpsellSignals = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const DAY = 86400000;

		// Trouver les orgs démo proches de l'expiration (3j avant)
		const demoOrgs = await ctx.db
			.query('organizations')
			.filter((q) => q.eq(q.field('isDemo'), true))
			.collect();

		for (const org of demoOrgs) {
			if (!org.demoConfig?.expiresAt) continue;
			const daysLeft = Math.floor((org.demoConfig.expiresAt - now) / DAY);

			// Trouver quel commercial a ce prospect
			const prospect = await ctx.db
				.query('salesProspects')
				.filter((q) => q.eq(q.field('demoOrgId'), org._id))
				.first();
			if (!prospect) continue;

			if (daysLeft <= 3 && daysLeft > 0) {
				// Vérifier dédoublonnage : pas de signal demo_expiring dans les 24h
				const recent = await ctx.db
					.query('salesSignals')
					.withIndex('by_sales', (q) => q.eq('salesUserId', prospect.salesUserId))
					.order('desc')
					.collect();
				const alreadySent = recent.find(
					(s) =>
						s.type === 'demo_expiring' &&
						s.organizationId === org._id &&
						now - s.createdAt < DAY
				);
				if (!alreadySent) {
					await ctx.db.insert('salesSignals', {
						salesUserId: prospect.salesUserId,
						prospectId: prospect._id,
						organizationId: org._id,
						type: 'demo_expiring',
						title: `Démo ${org.name} expire dans ${daysLeft}j`,
						body: `La démo de ${org.name} expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}. Contacter le prospect maintenant pour convertir.`,
						priority: daysLeft <= 1 ? 'high' : 'medium',
						createdAt: now
					});
				}
			} else if (daysLeft <= 0) {
				const recentExpired = await ctx.db
					.query('salesSignals')
					.withIndex('by_sales', (q) => q.eq('salesUserId', prospect.salesUserId))
					.order('desc')
					.collect();
				const alreadySent = recentExpired.find(
					(s) =>
						s.type === 'demo_expired' &&
						s.organizationId === org._id &&
						now - s.createdAt < DAY * 7
				);
				if (!alreadySent) {
					await ctx.db.insert('salesSignals', {
						salesUserId: prospect.salesUserId,
						prospectId: prospect._id,
						organizationId: org._id,
						type: 'demo_expired',
						title: `Démo ${org.name} expirée`,
						body: `La démo de ${org.name} a expiré. Dernier appel pour convertir ou proposer une extension.`,
						priority: 'high',
						createdAt: now
					});
				}
			}
		}
	}
});
