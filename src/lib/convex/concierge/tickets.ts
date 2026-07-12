import { v, ConvexError } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { conciergeQuery, conciergeMutation } from '../functions';

const SLA_FIRST_RESPONSE_MS: Record<string, number> = {
	URGENT: 15 * 60 * 1000,
	HIGH: 60 * 60 * 1000,
	NORMAL: 4 * 60 * 60 * 1000,
	LOW: 24 * 60 * 60 * 1000
};

export const listInboxTickets = conciergeQuery({
	args: {
		filter: v.union(v.literal('all'), v.literal('unassigned'), v.literal('mine')),
		status: v.optional(
			v.union(
				v.literal('NEW'),
				v.literal('IN_PROGRESS'),
				v.literal('WAITING_CLIENT'),
				v.literal('RESOLVED'),
				v.literal('CLOSED')
			)
		)
	},
	handler: async (ctx, { filter, status }) => {
		let allowedOrgIds: Set<string> | null = null;
		if (ctx.staffRole === 'concierge') {
			const accesses = await ctx.db
				.query('conciergeOrgAccess')
				.withIndex('by_concierge', (q) => q.eq('conciergeUserId', ctx.user._id))
				.collect();
			allowedOrgIds = new Set(accesses.map((a) => a.organizationId));
		}

		let tickets = await ctx.db
			.query('conciergeTickets')
			.filter((q) => q.neq(q.field('status'), 'CLOSED'))
			.collect();

		if (allowedOrgIds) {
			tickets = tickets.filter((t) => allowedOrgIds!.has(t.organizationId));
		}
		if (status) {
			tickets = tickets.filter((t) => t.status === status);
		}
		if (filter === 'unassigned') {
			tickets = tickets.filter((t) => !t.assignedTo);
		} else if (filter === 'mine') {
			tickets = tickets.filter((t) => t.assignedTo === ctx.user._id);
		}

		const orgIds = [...new Set(tickets.map((t) => t.organizationId))];
		const orgs = await Promise.all(orgIds.map((id) => ctx.db.get(id)));
		const orgMap = new Map(orgs.filter(Boolean).map((o) => [o!._id, o!.name]));

		const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };

		return tickets
			.sort((a, b) => {
				if (a.priority !== b.priority)
					return (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
				return b.createdAt - a.createdAt;
			})
			.map((t) => ({ ...t, orgName: orgMap.get(t.organizationId) ?? 'Organisation inconnue' }));
	}
});

export const getTicket = conciergeQuery({
	args: { ticketId: v.id('conciergeTickets') },
	handler: async (ctx, { ticketId }) => {
		const ticket = await ctx.db.get(ticketId);
		if (!ticket) return null;

		if (ctx.staffRole === 'concierge') {
			const access = await ctx.db
				.query('conciergeOrgAccess')
				.withIndex('by_concierge_and_org', (q) =>
					q.eq('conciergeUserId', ctx.user._id).eq('organizationId', ticket.organizationId)
				)
				.first();
			if (!access) return null;
		}

		const org = await ctx.db.get(ticket.organizationId);
		const messages = await ctx.db
			.query('conciergeTicketMessages')
			.withIndex('by_ticket_and_time', (q) => q.eq('ticketId', ticketId))
			.collect();

		return { ...ticket, orgName: org?.name, messages };
	}
});

export const getTicketContext = conciergeQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const org = await ctx.db.get(organizationId);
		if (!org) return null;

		// Concierges assignés à cette org
		const accesses = await ctx.db
			.query('conciergeOrgAccess')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const staffList = await Promise.all(
			accesses.map(async (a) => {
				const staff = await ctx.db
					.query('myceliumStaff')
					.withIndex('by_userId', (q) => q.eq('userId', a.conciergeUserId))
					.unique();
				return staff ? { name: staff.name, avatarUrl: staff.avatarUrl ?? null } : null;
			})
		);

		// Tickets ouverts pour info
		const openTickets = await ctx.db
			.query('conciergeTickets')
			.withIndex('by_org_and_status', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.neq(q.field('status'), 'CLOSED'))
			.collect();

		return {
			name: org.name,
			tier: org.paddlePlanTier ?? 'essential',
			country: org.country ?? null,
			assignedConcierges: staffList.filter(Boolean),
			openTicketCount: openTickets.filter((t) => t.status !== 'RESOLVED').length
		};
	}
});

export const takeTicket = conciergeMutation({
	args: { ticketId: v.id('conciergeTickets') },
	handler: async (ctx, { ticketId }) => {
		const ticket = await ctx.db.get(ticketId);
		if (!ticket) throw new ConvexError('Ticket introuvable');
		await ctx.db.patch(ticketId, {
			assignedTo: ctx.user._id,
			status: ticket.status === 'NEW' ? 'IN_PROGRESS' : ticket.status,
			updatedAt: Date.now()
		});
	}
});

export const sendTicketMessage = conciergeMutation({
	args: {
		ticketId: v.id('conciergeTickets'),
		content: v.string(),
		isInternal: v.boolean()
	},
	handler: async (ctx, { ticketId, content, isInternal }) => {
		const ticket = await ctx.db.get(ticketId);
		if (!ticket) throw new ConvexError('Ticket introuvable');

		if (!ticket.firstResponseAt && !isInternal) {
			await ctx.db.patch(ticketId, {
				firstResponseAt: Date.now(),
				status: 'IN_PROGRESS',
				updatedAt: Date.now()
			});
		}

		await ctx.db.insert('conciergeTicketMessages', {
			ticketId,
			authorId: ctx.user._id,
			authorRole: ctx.staffRole === 'super_admin' ? 'super_admin' : 'concierge',
			content,
			isInternal,
			createdAt: Date.now()
		});
	}
});

export const resolveTicket = conciergeMutation({
	args: {
		ticketId: v.id('conciergeTickets'),
		closingNote: v.optional(v.string())
	},
	handler: async (ctx, { ticketId, closingNote }) => {
		await ctx.db.patch(ticketId, {
			status: 'RESOLVED',
			resolvedAt: Date.now(),
			updatedAt: Date.now()
		});
		if (closingNote) {
			await ctx.db.insert('conciergeTicketMessages', {
				ticketId,
				authorId: ctx.user._id,
				authorRole: ctx.staffRole === 'super_admin' ? 'super_admin' : 'concierge',
				content: closingNote,
				isInternal: true,
				createdAt: Date.now()
			});
		}
	}
});

export const listTicketsForOrg = conciergeQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		if (ctx.staffRole === 'concierge') {
			const access = await ctx.db
				.query('conciergeOrgAccess')
				.withIndex('by_concierge_and_org', (q) =>
					q.eq('conciergeUserId', ctx.user._id).eq('organizationId', organizationId)
				)
				.first();
			if (!access) return [];
		}

		const org = await ctx.db.get(organizationId);
		const tickets = await ctx.db
			.query('conciergeTickets')
			.withIndex('by_org_and_status', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.neq(q.field('status'), 'CLOSED'))
			.collect();

		const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
		return tickets
			.sort((a, b) => {
				if (a.priority !== b.priority)
					return (PRIORITY_ORDER[a.priority] ?? 3) - (PRIORITY_ORDER[b.priority] ?? 3);
				return b.createdAt - a.createdAt;
			})
			.map((t) => ({ ...t, orgName: org?.name ?? '' }));
	}
});

// Appelé uniquement en interne via ctx.scheduler.runAfter
export const upsertTicketFromSource = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		sourceType: v.union(
			v.literal('HUMAN_ASSIST'),
			v.literal('SUPPORT_TICKET'),
			v.literal('CONCIERGE_TASK'),
			v.literal('SALES_MESSAGE'),
			v.literal('MANUAL')
		),
		sourceId: v.string(),
		title: v.string(),
		summary: v.string(),
		priority: v.union(
			v.literal('URGENT'),
			v.literal('HIGH'),
			v.literal('NORMAL'),
			v.literal('LOW')
		)
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('conciergeTickets')
			.withIndex('by_source', (q) =>
				q.eq('sourceType', args.sourceType).eq('sourceId', args.sourceId)
			)
			.filter((q) => q.neq(q.field('status'), 'CLOSED'))
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				title: args.title,
				summary: args.summary,
				updatedAt: Date.now()
			});
			return existing._id;
		}

		const slaMs = SLA_FIRST_RESPONSE_MS[args.priority] ?? SLA_FIRST_RESPONSE_MS.NORMAL;
		return await ctx.db.insert('conciergeTickets', {
			...args,
			status: 'NEW',
			slaDeadline: Date.now() + slaMs,
			createdAt: Date.now(),
			updatedAt: Date.now()
		});
	}
});
