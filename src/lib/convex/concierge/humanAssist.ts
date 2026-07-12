import { v, ConvexError } from 'convex/values';
import { authedQuery, authedMutation, conciergeQuery, conciergeMutation } from '../functions';
import { getUserOrg } from '../lib/auth';
import { internal } from '../_generated/api';

// ─── Côté client ─────────────────────────────────────────────────────────────

export const createRequest = authedMutation({
	args: {
		summary: v.optional(v.string()) // contexte des derniers messages IA
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);

		// Vérifie si une demande pending/in_progress existe déjà pour cet utilisateur
		const existing = await ctx.db
			.query('humanAssistRequests')
			.withIndex('by_requester', (q) => q.eq('requesterId', user._id))
			.filter((q) => q.neq(q.field('status'), 'closed'))
			.first();

		if (existing) return existing._id;

		const requestId = await ctx.db.insert('humanAssistRequests', {
			organizationId,
			requesterId: user._id,
			requesterName: user.name ?? user.email ?? 'Utilisateur',
			status: 'pending',
			summary: args.summary,
			createdAt: Date.now()
		});

		await ctx.scheduler.runAfter(0, internal.concierge.tickets.upsertTicketFromSource, {
			organizationId,
			sourceType: 'HUMAN_ASSIST',
			sourceId: requestId,
			title: `Human Assist — ${user.name ?? user.email ?? 'Utilisateur'}`,
			summary: args.summary?.slice(0, 150) ?? "Demande d'assistance",
			priority: 'HIGH'
		});

		return requestId;
	}
});

export const getMyActiveRequest = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { user } = await getUserOrg(ctx);

		const request = await ctx.db
			.query('humanAssistRequests')
			.withIndex('by_requester', (q) => q.eq('requesterId', user._id))
			.filter((q) => q.neq(q.field('status'), 'closed'))
			.order('desc')
			.first();

		if (!request) return null;

		const messages = await ctx.db
			.query('humanAssistMessages')
			.withIndex('by_request', (q) => q.eq('requestId', request._id))
			.order('asc')
			.collect();

		return { request, messages };
	}
});

export const sendClientMessage = authedMutation({
	args: {
		requestId: v.id('humanAssistRequests'),
		content: v.string()
	},
	handler: async (ctx, args) => {
		const { user } = await getUserOrg(ctx);
		const request = await ctx.db.get(args.requestId);
		if (!request || request.requesterId !== user._id) {
			throw new ConvexError('Demande introuvable.');
		}
		if (request.status === 'closed') {
			throw new ConvexError('Cette conversation est fermée.');
		}

		await ctx.db.insert('humanAssistMessages', {
			requestId: args.requestId,
			organizationId: request.organizationId,
			senderType: 'client',
			senderName: user.name ?? user.email ?? 'Utilisateur',
			content: args.content,
			createdAt: Date.now()
		});
	}
});

export const closeMyRequest = authedMutation({
	args: { requestId: v.id('humanAssistRequests') },
	handler: async (ctx, args) => {
		const { user } = await getUserOrg(ctx);
		const request = await ctx.db.get(args.requestId);
		if (!request || request.requesterId !== user._id) {
			throw new ConvexError('Demande introuvable.');
		}
		await ctx.db.patch(args.requestId, { status: 'closed' });
	}
});

// ─── Côté concierge Mycelium ──────────────────────────────────────────────────

export const listRequestsForOrg = conciergeQuery({
	args: {
		organizationId: v.id('organizations'),
		statusFilter: v.optional(v.union(v.literal('pending'), v.literal('in_progress'), v.literal('closed')))
	},
	handler: async (ctx, args) => {
		let requests = await ctx.db
			.query('humanAssistRequests')
			.withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
			.order('desc')
			.collect();

		if (args.statusFilter) {
			requests = requests.filter((r) => r.status === args.statusFilter);
		} else {
			// Par défaut : non fermées seulement
			requests = requests.filter((r) => r.status !== 'closed');
		}

		// Enrichir avec le dernier message + count
		return await Promise.all(requests.map(async (req) => {
			const messages = await ctx.db
				.query('humanAssistMessages')
				.withIndex('by_request', (q) => q.eq('requestId', req._id))
				.order('desc')
				.take(1);
			return {
				...req,
				lastMessage: messages[0] ?? null
			};
		}));
	}
});

export const getRequestWithMessages = conciergeQuery({
	args: { requestId: v.id('humanAssistRequests') },
	handler: async (ctx, args) => {
		const request = await ctx.db.get(args.requestId);
		if (!request) return null;

		const messages = await ctx.db
			.query('humanAssistMessages')
			.withIndex('by_request', (q) => q.eq('requestId', args.requestId))
			.order('asc')
			.collect();

		return { request, messages };
	}
});

export const replyAsConciege = conciergeMutation({
	args: {
		requestId: v.id('humanAssistRequests'),
		content: v.string()
	},
	handler: async (ctx, args) => {
		const request = await ctx.db.get(args.requestId);
		if (!request) throw new ConvexError('Demande introuvable.');

		// Assigne le concierge si pas encore fait
		if (!request.assignedConciergeId) {
			await ctx.db.patch(args.requestId, {
				status: 'in_progress',
				assignedConciergeId: ctx.user._id
			});
		}

		// Récupère le profil concierge pour l'avatar
		const staffProfile = await ctx.db
			.query('myceliumStaff')
			.withIndex('by_userId', (q) => q.eq('userId', ctx.user._id))
			.unique();

		await ctx.db.insert('humanAssistMessages', {
			requestId: args.requestId,
			organizationId: request.organizationId,
			senderType: 'concierge',
			senderName: ctx.user.name ?? ctx.user.email ?? 'Concierge Mycelium',
			senderAvatarUrl: staffProfile?.avatarUrl,
			content: args.content,
			createdAt: Date.now()
		});
	}
});

export const closeByConcierge = conciergeMutation({
	args: { requestId: v.id('humanAssistRequests') },
	handler: async (ctx, args) => {
		const request = await ctx.db.get(args.requestId);
		if (!request) throw new ConvexError('Demande introuvable.');
		await ctx.db.patch(args.requestId, { status: 'closed' });
	}
});
