import { v } from 'convex/values';
import { salesQuery, salesMutation } from '../functions';
import { internalMutation } from '../_generated/server';

const LEVEL_THRESHOLDS = [0, 1000, 5000, 15000, 40000]; // seuils niveaux 1–5

function computeLevel(totalPoints: number): number {
	let level = 1;
	for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
		if (totalPoints >= LEVEL_THRESHOLDS[i]) level = i + 1;
	}
	return Math.min(level, 5);
}

function todayStr(): string {
	return new Date().toISOString().split('T')[0];
}

export const getMyGamification = salesQuery({
	args: {},
	handler: async (ctx) => {
		const gam = await ctx.db
			.query('salesGamification')
			.withIndex('by_user', (q) => q.eq('salesUserId', ctx.user._id))
			.first();
		if (!gam) {
			return {
				totalPoints: 0, level: 1, currentStreakDays: 0, longestStreakDays: 0,
				weeklyPoints: 0, monthlyPoints: 0, lastActivityDate: ''
			};
		}
		return gam;
	}
});

export const getMyBadges = salesQuery({
	args: {},
	handler: async (ctx) => {
		return await ctx.db
			.query('salesBadges')
			.withIndex('by_user', (q) => q.eq('salesUserId', ctx.user._id))
			.collect();
	}
});

export const getLeaderboard = salesQuery({
	args: {},
	handler: async (ctx) => {
		const allGam = await ctx.db
			.query('salesGamification')
			.withIndex('by_weekly_points')
			.order('desc')
			.take(20);
		return allGam.map((g, i) => ({
			rank: i + 1,
			salesUserId: g.salesUserId,
			weeklyPoints: g.weeklyPoints,
			level: g.level,
			isMe: g.salesUserId === ctx.user._id
		}));
	}
});

export const recordActivity = salesMutation({
	args: { activityType: v.string() },
	handler: async (ctx, { activityType: _activityType }) => {
		const today = todayStr();
		const gam = await ctx.db
			.query('salesGamification')
			.withIndex('by_user', (q) => q.eq('salesUserId', ctx.user._id))
			.first();

		if (!gam) {
			await ctx.db.insert('salesGamification', {
				salesUserId: ctx.user._id,
				totalPoints: 0, level: 1,
				currentStreakDays: 1, longestStreakDays: 1,
				lastActivityDate: today,
				weeklyPoints: 0, monthlyPoints: 0,
				weekResetAt: Date.now(), monthResetAt: Date.now()
			});
			return;
		}

		const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
		let newStreak = gam.currentStreakDays;
		if (gam.lastActivityDate === yesterday) {
			newStreak += 1;
		} else if (gam.lastActivityDate !== today) {
			newStreak = 1; // reset silencieux
		}

		await ctx.db.patch(gam._id, {
			currentStreakDays: newStreak,
			longestStreakDays: Math.max(newStreak, gam.longestStreakDays),
			lastActivityDate: today
		});
	}
});

// ── Mutations internes (crons + système) ─────────────────────────────────────

export const addPoints = internalMutation({
	args: { salesUserId: v.string(), points: v.number(), reason: v.string() },
	handler: async (ctx, { salesUserId, points }) => {
		const gam = await ctx.db
			.query('salesGamification')
			.withIndex('by_user', (q) => q.eq('salesUserId', salesUserId))
			.first();
		if (!gam) return;
		const newTotal = gam.totalPoints + points;
		await ctx.db.patch(gam._id, {
			totalPoints: newTotal,
			level: computeLevel(newTotal),
			weeklyPoints: gam.weeklyPoints + points,
			monthlyPoints: gam.monthlyPoints + points
		});
	}
});

export const checkAndAwardBadges = internalMutation({
	args: { salesUserId: v.string() },
	handler: async (ctx, { salesUserId }) => {
		const [gam, badges, prospects] = await Promise.all([
			ctx.db.query('salesGamification').withIndex('by_user', (q) => q.eq('salesUserId', salesUserId)).first(),
			ctx.db.query('salesBadges').withIndex('by_user', (q) => q.eq('salesUserId', salesUserId)).collect(),
			ctx.db.query('salesProspects').withIndex('by_sales', (q) => q.eq('salesUserId', salesUserId)).collect()
		]);
		if (!gam) return;

		const earnedIds = new Set(badges.map((b) => b.badgeId));
		const toAward: Array<{ id: string; context?: string }> = [];

		const wonCount = prospects.filter((p) => p.stage === 'won').length;
		if (wonCount >= 1 && !earnedIds.has('first_conversion')) {
			toAward.push({ id: 'first_conversion', context: 'Première conversion !' });
		}
		const demoCount = prospects.filter((p) => p.demoOrgId).length;
		if (demoCount >= 10 && !earnedIds.has('demo_launcher')) {
			toAward.push({ id: 'demo_launcher', context: `${demoCount} démos créées` });
		}
		if (gam.currentStreakDays >= 42 && !earnedIds.has('unstoppable')) {
			toAward.push({ id: 'unstoppable', context: '42 jours de streak !' });
		}
		if (wonCount >= 5 && !earnedIds.has('pipeline_pro')) {
			toAward.push({ id: 'pipeline_pro', context: `${wonCount} conversions` });
		}

		for (const badge of toAward) {
			await ctx.db.insert('salesBadges', {
				salesUserId, badgeId: badge.id, earnedAt: Date.now(), context: badge.context
			});
		}
	}
});

// Vérifie et remet à 0 les streaks brisés (silencieux, pas de notification)
export const checkDailyStreaks = internalMutation({
	args: {},
	handler: async (ctx) => {
		const today = todayStr();
		const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

		const allGam = await ctx.db.query('salesGamification').collect();
		for (const gam of allGam) {
			if (gam.lastActivityDate !== today && gam.lastActivityDate !== yesterday) {
				if (gam.currentStreakDays > 0) {
					// Reset silencieux — pas de notification
					await ctx.db.patch(gam._id, { currentStreakDays: 0 });
				}
			}
			// Vérification badges après chaque mise à jour
			await ctx.db.query('salesBadges')
				.withIndex('by_user', (q) => q.eq('salesUserId', gam.salesUserId))
				.collect();
		}
	}
});

// Reset points hebdomadaires chaque lundi à minuit UTC
export const resetWeeklyPoints = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const allGam = await ctx.db.query('salesGamification').collect();
		for (const gam of allGam) {
			await ctx.db.patch(gam._id, { weeklyPoints: 0, weekResetAt: now });
		}
	}
});
