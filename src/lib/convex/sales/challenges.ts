import { v } from 'convex/values';
import { salesQuery } from '../functions';
import { internalMutation, internalQuery } from '../_generated/server';

interface Challenge {
	id: string;
	title: string;
	description: string;
	difficulty: 'easy' | 'medium' | 'hard';
	targetValue: number;
	currentValue: number;
	points: number;
	completed: boolean;
	completedAt?: number;
}

function currentWeekStart(): string {
	const now = new Date();
	const day = now.getUTCDay(); // 0=dimanche
	const diff = now.getUTCDate() - day + (day === 0 ? -6 : 1); // lundi
	const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
	return monday.toISOString().split('T')[0];
}

function buildWeeklyChallenges(wonCount: number, demoCount: number): Challenge[] {
	const challenges: Challenge[] = [
		{
			id: 'weekly_demo',
			title: '3 démos cette semaine',
			description: 'Créer au moins 3 nouvelles organisations démo',
			difficulty: 'easy',
			targetValue: 3,
			currentValue: Math.min(demoCount, 3),
			points: 150,
			completed: demoCount >= 3
		},
		{
			id: 'weekly_conversion',
			title: 'Première conversion',
			description: 'Faire passer un prospect au statut Gagné',
			difficulty: 'medium',
			targetValue: 1,
			currentValue: Math.min(wonCount, 1),
			points: 300,
			completed: wonCount >= 1
		},
		{
			id: 'weekly_pipeline',
			title: 'Pipeline actif',
			description: 'Avoir 5 prospects en cours simultanément',
			difficulty: 'hard',
			targetValue: 5,
			currentValue: 0, // calculé à la génération
			points: 500,
			completed: false
		}
	];
	return challenges;
}

export const getMyCurrentChallenges = salesQuery({
	args: {},
	handler: async (ctx) => {
		const weekStart = currentWeekStart();
		const entry = await ctx.db
			.query('salesChallenges')
			.withIndex('by_user_and_week', (q) =>
				q.eq('salesUserId', ctx.user._id).eq('weekStartDate', weekStart)
			)
			.first();
		return entry ?? null;
	}
});

// internalQuery : version non-authguardée pour l'Agent Commercial
export const getChallengesForUser = internalQuery({
	args: { salesUserId: v.string() },
	handler: async (ctx, { salesUserId }) => {
		const weekStart = currentWeekStart();
		return await ctx.db
			.query('salesChallenges')
			.withIndex('by_user_and_week', (q) =>
				q.eq('salesUserId', salesUserId).eq('weekStartDate', weekStart)
			)
			.first();
	}
});

// Génère les défis hebdo pour un utilisateur donné (appelé par le cron)
export const generateWeeklyChallengesForUser = internalMutation({
	args: { salesUserId: v.string() },
	handler: async (ctx, { salesUserId }) => {
		const weekStart = currentWeekStart();
		const existing = await ctx.db
			.query('salesChallenges')
			.withIndex('by_user_and_week', (q) =>
				q.eq('salesUserId', salesUserId).eq('weekStartDate', weekStart)
			)
			.first();
		if (existing) return; // déjà générés

		const [prospects] = await Promise.all([
			ctx.db
				.query('salesProspects')
				.withIndex('by_sales', (q) => q.eq('salesUserId', salesUserId))
				.collect()
		]);

		const wonCount = prospects.filter((p) => p.stage === 'won').length;
		const demoCount = prospects.filter((p) => p.demoOrgId).length;
		const activeCount = prospects.filter(
			(p) => p.stage !== 'won' && p.stage !== 'lost'
		).length;

		const challenges = buildWeeklyChallenges(wonCount, demoCount);
		// Mettre à jour le pipeline challenge avec la vraie valeur
		const pipelineChallenge = challenges.find((c) => c.id === 'weekly_pipeline');
		if (pipelineChallenge) {
			pipelineChallenge.currentValue = Math.min(activeCount, 5);
			pipelineChallenge.completed = activeCount >= 5;
		}

		await ctx.db.insert('salesChallenges', {
			salesUserId,
			weekStartDate: weekStart,
			challenges
		});
	}
});

// Entry point cron : génère les défis pour tous les sales
export const generateAllWeeklyChallenges = internalMutation({
	args: {},
	handler: async (ctx) => {
		const staff = await ctx.db
			.query('myceliumStaff')
			.filter((q) =>
				q.or(
					q.eq(q.field('staffRole'), 'sales'),
					q.eq(q.field('staffRole'), 'super_admin')
				)
			)
			.collect();

		const weekStart = currentWeekStart();

		for (const member of staff) {
			const existing = await ctx.db
				.query('salesChallenges')
				.withIndex('by_user_and_week', (q) =>
					q.eq('salesUserId', member.userId).eq('weekStartDate', weekStart)
				)
				.first();
			if (existing) continue;

			const prospects = await ctx.db
				.query('salesProspects')
				.withIndex('by_sales', (q) => q.eq('salesUserId', member.userId))
				.collect();

			const wonCount = prospects.filter((p) => p.stage === 'won').length;
			const demoCount = prospects.filter((p) => p.demoOrgId).length;
			const activeCount = prospects.filter(
				(p) => p.stage !== 'won' && p.stage !== 'lost'
			).length;

			const challenges = buildWeeklyChallenges(wonCount, demoCount);
			const pipelineChallenge = challenges.find((c) => c.id === 'weekly_pipeline');
			if (pipelineChallenge) {
				pipelineChallenge.currentValue = Math.min(activeCount, 5);
				pipelineChallenge.completed = activeCount >= 5;
			}

			await ctx.db.insert('salesChallenges', {
				salesUserId: member.userId,
				weekStartDate: weekStart,
				challenges
			});
		}
	}
});
