import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery, httpAction } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { authComponent } from '../auth';
import { managerTools } from './managerTools';

// ─── Anthropic message types (shared with concierge) ─────────────────────────

type TextBlock = { type: 'text'; text: string };
type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
type ToolResultBlock = { type: 'tool_result'; tool_use_id: string; content: string };
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

type AnthropicMessage = {
	role: 'user' | 'assistant';
	content: string | ContentBlock[];
};

// ─── Period → timestamp range ────────────────────────────────────────────────

function resolvePeriod(period: string): { start: number; end: number } {
	const now = new Date();
	const end = now.getTime();

	switch (period) {
		case 'this_week': {
			const d = new Date(now);
			d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
			d.setHours(0, 0, 0, 0);
			return { start: d.getTime(), end };
		}
		case 'this_month':
			return { start: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), end };
		case 'last_month': {
			const s = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
			const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();
			return { start: s, end: e };
		}
		case 'this_quarter': {
			const q = Math.floor(now.getMonth() / 3);
			return { start: new Date(now.getFullYear(), q * 3, 1).getTime(), end };
		}
		case 'this_year':
			return { start: new Date(now.getFullYear(), 0, 1).getTime(), end };
		case 'last_90_days':
			return { start: end - 90 * 24 * 60 * 60 * 1000, end };
		default:
			return { start: end - 30 * 24 * 60 * 60 * 1000, end };
	}
}

function formatDateFr(ts: number): string {
	return new Date(ts).toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});
}

// ─── Internal: org + role check ──────────────────────────────────────────────

export const getManagerOrgProfile = internalQuery({
	args: { userId: v.string() },
	handler: async (ctx, { userId }) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', userId))
			.unique();
		if (!profile?.currentOrganizationId) return null;
		const org = await ctx.db.get(profile.currentOrganizationId);
		if (!org) return null;

		const membership = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', profile.currentOrganizationId!).eq('userId', userId)
			)
			.unique();

		if (!membership || membership.role === 'ORG_MEMBER') return null;

		return { org, organizationId: profile.currentOrganizationId };
	}
});

// ─── Internal: conversation persistence ─────────────────────────────────────
// Manager conversations are namespaced with `:manager` suffix on userId
// to isolate them from concierge conversations in the same table.

export const getManagerConversation = internalQuery({
	args: { conversationId: v.id('conversations') },
	handler: async (ctx, { conversationId }) => ctx.db.get(conversationId)
});

export const saveManagerUserMessage = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		userId: v.string(),
		message: v.string(),
		conversationId: v.optional(v.id('conversations'))
	},
	handler: async (ctx, args) => {
		const managerUserId = `${args.userId}:manager`;
		let convId = args.conversationId;

		if (!convId) {
			const existing = await ctx.db
				.query('conversations')
				.withIndex('by_user_recent', (q) => q.eq('userId', managerUserId))
				.order('desc')
				.first();
			if (existing && existing.organizationId === args.organizationId) {
				convId = existing._id;
			} else {
				const now = Date.now();
				convId = await ctx.db.insert('conversations', {
					organizationId: args.organizationId,
					userId: managerUserId,
					messages: [],
					createdAt: now,
					updatedAt: now
				});
			}
		}

		const conversation = await ctx.db.get(convId);
		if (!conversation) throw new ConvexError('Conversation introuvable');

		await ctx.db.patch(convId, {
			messages: [
				...conversation.messages,
				{ role: 'user' as const, content: args.message, timestamp: Date.now() }
			],
			updatedAt: Date.now()
		});

		return convId;
	}
});

export const saveManagerAssistantMessage = internalMutation({
	args: { conversationId: v.id('conversations'), text: v.string() },
	handler: async (ctx, { conversationId, text }) => {
		const conversation = await ctx.db.get(conversationId);
		if (!conversation) return;
		await ctx.db.patch(conversationId, {
			messages: [
				...conversation.messages,
				{ role: 'assistant' as const, content: text, timestamp: Date.now() }
			],
			updatedAt: Date.now()
		});
	}
});

// ─── Tool runners (all read-only) ─────────────────────────────────────────────

export const toolGetFleetUtilization = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		period: v.string(),
		sortBy: v.optional(v.string())
	},
	handler: async (ctx, { organizationId, period, sortBy }) => {
		const { start, end } = resolvePeriod(period);
		const periodDays = Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)));

		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const activeVehicles = vehicles.filter((v) => v.status !== 'RETIRED');

		const reservations = await ctx.db
			.query('reservations')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const periodReservations = reservations.filter(
			(r) =>
				r.status !== 'CANCELLED' &&
				r.startDate < end &&
				r.endDate > start
		);

		const stats = activeVehicles.map((v) => {
			const vReservations = periodReservations.filter((r) => r.vehicleId === v._id);
			const reservationCount = vReservations.length;
			const totalDays = vReservations.reduce((sum, r) => {
				const rStart = Math.max(r.startDate, start);
				const rEnd = Math.min(r.endDate, end);
				return sum + Math.max(0, (rEnd - rStart) / (24 * 60 * 60 * 1000));
			}, 0);
			const utilizationRate = Math.round((totalDays / periodDays) * 100 * 10) / 10;

			return {
				label: `${v.brand} ${v.model}`,
				registration: v.registration,
				status: v.status,
				reservationCount,
				totalDays: Math.round(totalDays * 10) / 10,
				utilizationRate
			};
		});

		const sorted =
			sortBy === 'most_used'
				? stats.sort((a, b) => b.utilizationRate - a.utilizationRate)
				: stats.sort((a, b) => a.utilizationRate - b.utilizationRate);

		return {
			period,
			periodDays,
			totalVehicles: activeVehicles.length,
			avgUtilizationRate:
				Math.round((sorted.reduce((s, v) => s + v.utilizationRate, 0) / Math.max(1, sorted.length)) * 10) / 10,
			vehicles: sorted.slice(0, 15)
		};
	}
});

export const toolGetCostBreakdown = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		period: v.string(),
		groupBy: v.string()
	},
	handler: async (ctx, { organizationId, period, groupBy }) => {
		const { start, end } = resolvePeriod(period);

		const costs = await ctx.db
			.query('costs')
			.withIndex('by_org_date', (q) =>
				q.eq('organizationId', organizationId).gte('date', start).lte('date', end)
			)
			.collect();

		const total = costs.reduce((s, c) => s + c.amount, 0);

		if (groupBy === 'category' || groupBy === 'both') {
			const byCategory: Record<string, number> = {};
			for (const c of costs) {
				byCategory[c.category] = (byCategory[c.category] ?? 0) + c.amount;
			}
			const categoryBreakdown = Object.entries(byCategory)
				.map(([category, amount]) => ({
					category,
					amount: Math.round(amount * 100) / 100,
					percentage: Math.round((amount / Math.max(1, total)) * 1000) / 10
				}))
				.sort((a, b) => b.amount - a.amount);

			if (groupBy === 'category') {
				return { period, total: Math.round(total * 100) / 100, byCategory: categoryBreakdown };
			}

			const vehicleIds = [...new Set(costs.filter((c) => c.vehicleId).map((c) => c.vehicleId!))];
			const byVehicle: Record<string, number> = {};
			for (const c of costs) {
				const key = c.vehicleId?.toString() ?? 'global';
				byVehicle[key] = (byVehicle[key] ?? 0) + c.amount;
			}
			const vehicleBreakdown = await Promise.all(
				Object.entries(byVehicle).map(async ([vehicleId, amount]) => {
					if (vehicleId === 'global') return { label: 'Coûts globaux', amount: Math.round(amount * 100) / 100 };
					const v = await ctx.db.get(vehicleId as Id<'vehicles'>);
					return {
						label: v ? `${v.brand} ${v.model} · ${v.registration}` : vehicleId,
						amount: Math.round(amount * 100) / 100
					};
				})
			);
			vehicleBreakdown.sort((a, b) => b.amount - a.amount);

			return {
				period,
				total: Math.round(total * 100) / 100,
				byCategory: categoryBreakdown,
				byVehicle: vehicleBreakdown.slice(0, 10)
			};
		}

		// groupBy === 'vehicle'
		const byVehicle: Record<string, number> = {};
		for (const c of costs) {
			const key = c.vehicleId?.toString() ?? 'global';
			byVehicle[key] = (byVehicle[key] ?? 0) + c.amount;
		}
		const vehicleBreakdown = await Promise.all(
			Object.entries(byVehicle).map(async ([vehicleId, amount]) => {
				if (vehicleId === 'global') return { label: 'Coûts globaux', amount: Math.round(amount * 100) / 100 };
				const v = await ctx.db.get(vehicleId as Id<'vehicles'>);
				return {
					label: v ? `${v.brand} ${v.model} · ${v.registration}` : vehicleId,
					amount: Math.round(amount * 100) / 100
				};
			})
		);

		return {
			period,
			total: Math.round(total * 100) / 100,
			byVehicle: vehicleBreakdown.sort((a, b) => b.amount - a.amount).slice(0, 10)
		};
	}
});

export const toolGetReservationActivity = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		period: v.string(),
		groupBy: v.string()
	},
	handler: async (ctx, { organizationId, period, groupBy }) => {
		const { start, end } = resolvePeriod(period);

		const reservations = await ctx.db
			.query('reservations')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const filtered = reservations.filter((r) => r.startDate >= start && r.startDate <= end);
		const total = filtered.length;

		if (groupBy === 'status') {
			const byStatus: Record<string, number> = {};
			for (const r of filtered) {
				byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
			}
			return {
				period,
				total,
				breakdown: Object.entries(byStatus)
					.map(([status, count]) => ({ status, count }))
					.sort((a, b) => b.count - a.count)
			};
		}

		if (groupBy === 'vehicle') {
			const byVehicle: Record<string, number> = {};
			for (const r of filtered) {
				const key = r.vehicleId.toString();
				byVehicle[key] = (byVehicle[key] ?? 0) + 1;
			}
			const breakdown = await Promise.all(
				Object.entries(byVehicle).map(async ([vehicleId, count]) => {
					const v = await ctx.db.get(vehicleId as Id<'vehicles'>);
					return {
						label: v ? `${v.brand} ${v.model} · ${v.registration}` : vehicleId,
						count
					};
				})
			);
			return {
				period,
				total,
				breakdown: breakdown.sort((a, b) => b.count - a.count).slice(0, 10)
			};
		}

		if (groupBy === 'day_of_week') {
			const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
			const byDay: number[] = Array(7).fill(0);
			for (const r of filtered) {
				const day = new Date(r.startDate).getDay();
				byDay[day] = (byDay[day] ?? 0) + 1;
			}
			return {
				period,
				total,
				breakdown: DAY_LABELS.map((label, i) => ({ label, count: byDay[i] }))
			};
		}

		// groupBy === 'user'
		const byUser: Record<string, number> = {};
		for (const r of filtered) {
			byUser[r.userId] = (byUser[r.userId] ?? 0) + 1;
		}
		const breakdown = Object.entries(byUser)
			.sort((a, b) => b[1] - a[1])
			.slice(0, 10)
			.map(([userId, count]) => ({ userId: userId.slice(-8), count }));

		return { period, total, breakdown };
	}
});

export const toolGetMaintenanceOverview = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		includeUpcoming: v.optional(v.boolean()),
		includeOverdue: v.optional(v.boolean())
	},
	handler: async (ctx, { organizationId, includeUpcoming = true, includeOverdue = true }) => {
		const now = Date.now();
		const thirtyDays = 30 * 24 * 60 * 60 * 1000;

		const records = await ctx.db
			.query('maintenanceRecords')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const scheduled = records.filter((r) => r.status === 'SCHEDULED' || r.status === 'IN_PROGRESS');
		const completed = records.filter((r) => r.status === 'COMPLETED');

		const upcoming = includeUpcoming
			? scheduled
				.filter((r) => r.scheduledDate >= now && r.scheduledDate <= now + thirtyDays)
				.map(async (r) => {
					const v = await ctx.db.get(r.vehicleId);
					return {
						vehicle: v ? `${v.brand} ${v.model} · ${v.registration}` : 'Inconnu',
						type: r.maintenanceType,
						scheduledDate: formatDateFr(r.scheduledDate),
						costEstimate: r.costEstimate ?? null,
						status: r.status
					};
				})
			: [];

		const overdue = includeOverdue
			? scheduled
				.filter((r) => r.scheduledDate < now)
				.map(async (r) => {
					const v = await ctx.db.get(r.vehicleId);
					return {
						vehicle: v ? `${v.brand} ${v.model} · ${v.registration}` : 'Inconnu',
						type: r.maintenanceType,
						scheduledDate: formatDateFr(r.scheduledDate),
						daysOverdue: Math.floor((now - r.scheduledDate) / (24 * 60 * 60 * 1000)),
						status: r.status
					};
				})
			: [];

		const totalCostCompleted = completed.reduce((s, r) => s + (r.costActual ?? r.costEstimate ?? 0), 0);

		return {
			summary: {
				totalScheduled: scheduled.length,
				totalCompleted: completed.length,
				totalCostCompleted: Math.round(totalCostCompleted * 100) / 100
			},
			upcoming: await Promise.all(upcoming),
			overdue: await Promise.all(overdue)
		};
	}
});

export const toolGetComplianceStatus = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		daysAhead: v.optional(v.number())
	},
	handler: async (ctx, { organizationId, daysAhead = 30 }) => {
		const now = Date.now();
		const threshold = now + daysAhead * 24 * 60 * 60 * 1000;

		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const activeVehicles = vehicles.filter((v) => v.status !== 'RETIRED');

		const leaseExpiring = activeVehicles
			.filter((v) => {
				if (!v.leaseEndDate) return false;
				const end = new Date(v.leaseEndDate).getTime();
				return end > now && end <= threshold;
			})
			.map((v) => ({
				label: `${v.brand} ${v.model} · ${v.registration}`,
				leaseEndDate: v.leaseEndDate!,
				daysLeft: Math.floor((new Date(v.leaseEndDate!).getTime() - now) / (24 * 60 * 60 * 1000))
			}))
			.sort((a, b) => a.daysLeft - b.daysLeft);

		const leaseExpired = activeVehicles
			.filter((v) => {
				if (!v.leaseEndDate) return false;
				return new Date(v.leaseEndDate).getTime() <= now;
			})
			.map((v) => ({
				label: `${v.brand} ${v.model} · ${v.registration}`,
				leaseEndDate: v.leaseEndDate!,
				daysOverdue: Math.floor((now - new Date(v.leaseEndDate!).getTime()) / (24 * 60 * 60 * 1000))
			}));

		const maintenanceDue = activeVehicles
			.filter((v) => {
				if (!v.maintenanceDueDate) return false;
				const due = new Date(v.maintenanceDueDate).getTime();
				return due <= threshold;
			})
			.map((v) => ({
				label: `${v.brand} ${v.model} · ${v.registration}`,
				maintenanceDueDate: v.maintenanceDueDate!,
				isOverdue: new Date(v.maintenanceDueDate!).getTime() <= now,
				daysLeft: Math.floor((new Date(v.maintenanceDueDate!).getTime() - now) / (24 * 60 * 60 * 1000))
			}));

		return {
			daysAhead,
			leaseExpired,
			leaseExpiring,
			maintenanceDue,
			totalAlerts: leaseExpired.length + leaseExpiring.length + maintenanceDue.length
		};
	}
});

export const toolGetFleetSummary = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const now = Date.now();
		const todayStart = new Date();
		todayStart.setHours(0, 0, 0, 0);
		const weekStart = new Date(todayStart);
		weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const reservations = await ctx.db
			.query('reservations')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const activeReservations = reservations.filter(
			(r) => r.status === 'CONFIRMED' || r.status === 'PENDING' || r.status === 'IN_PROGRESS'
		);

		const todayReservations = reservations.filter(
			(r) =>
				r.status !== 'CANCELLED' &&
				r.startDate < now &&
				r.endDate > todayStart.getTime()
		);

		const weekReservations = reservations.filter(
			(r) =>
				r.status !== 'CANCELLED' &&
				r.startDate >= weekStart.getTime() &&
				r.startDate <= now + 7 * 24 * 60 * 60 * 1000
		);

		return {
			fleet: {
				total: vehicles.filter((v) => v.status !== 'RETIRED').length,
				available: vehicles.filter((v) => v.status === 'AVAILABLE').length,
				inUse: vehicles.filter((v) => v.status === 'IN_USE').length,
				maintenance: vehicles.filter((v) => v.status === 'MAINTENANCE').length,
				retired: vehicles.filter((v) => v.status === 'RETIRED').length
			},
			reservations: {
				activeTotal: activeReservations.length,
				todayActive: todayReservations.length,
				thisWeekTotal: weekReservations.length
			},
			date: new Date().toLocaleDateString('fr-FR', {
				weekday: 'long',
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			})
		};
	}
});

// ─── System prompt ────────────────────────────────────────────────────────────

function buildManagerSystemPrompt(orgName: string, fleetSize: number): string {
	const currentDate = new Date().toLocaleDateString('fr-FR', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	return `Tu es l'Assistant Gestionnaire de ${orgName}, un analyste IA spécialisé dans la gestion de flotte d'entreprise.

## Contexte
- Entreprise : ${orgName}
- Taille de la flotte : ${fleetSize} véhicules
- Date : ${currentDate}

## Règles ABSOLUES
1. Tu ne crées, modifies ou supprimes RIEN. Tu es en lecture seule.
2. Tout chiffre que tu cites DOIT venir d'un tool call. Jamais d'estimation inventée.
3. Si la question est hors périmètre flotte, réponds : "Cette question dépasse mon périmètre d'analyse flotte. Je peux vous aider sur l'utilisation, les coûts, les réservations et la conformité."

## Style de réponse
- Commence par les chiffres clés, pas par une introduction
- Utilise des listes à puces pour les données comparatives
- Ajoute une recommandation actionnable quand c'est pertinent
- Sois précis : "73,4%" pas "environ 70%"
- Utilise le markdown (listes, **gras** pour les chiffres importants)
- Toujours en français, vouvoiement`;
}

// ─── SSE parser (identique au concierge) ─────────────────────────────────────

type ParsedBlock = {
	index: number;
	type: 'text' | 'tool_use';
	text: string;
	id?: string;
	name?: string;
	inputJson: string;
};

type StreamResult = {
	contentBlocks: ContentBlock[];
	toolUseBlocks: Array<{ id: string; name: string; input: Record<string, unknown> }>;
	stopReason: string;
};

async function parseAnthropicStream(
	body: ReadableStream<Uint8Array>,
	callbacks: { onTextDelta: (text: string) => void; onToolCall: (name: string) => void }
): Promise<StreamResult> {
	const decoder = new TextDecoder();
	const reader = body.getReader();
	const activeBlocks = new Map<number, ParsedBlock>();
	const completedBlocks: ParsedBlock[] = [];
	let stopReason = 'end_turn';
	let buffer = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';

			for (const line of lines) {
				if (!line.startsWith('data: ')) continue;
				const json = line.slice(6).trim();
				if (!json) continue;
				let event: Record<string, unknown>;
				try {
					event = JSON.parse(json) as Record<string, unknown>;
				} catch {
					continue;
				}
				const type = event.type as string;
				if (type === 'content_block_start') {
					const index = event.index as number;
					const block = event.content_block as { type: string; id?: string; name?: string };
					activeBlocks.set(index, { index, type: block.type as 'text' | 'tool_use', text: '', id: block.id, name: block.name, inputJson: '' });
					if (block.type === 'tool_use' && block.name) callbacks.onToolCall(block.name);
				} else if (type === 'content_block_delta') {
					const index = event.index as number;
					const delta = event.delta as { type: string; text?: string; partial_json?: string };
					const block = activeBlocks.get(index);
					if (block) {
						if (delta.type === 'text_delta' && delta.text) { block.text += delta.text; callbacks.onTextDelta(delta.text); }
						else if (delta.type === 'input_json_delta' && delta.partial_json) { block.inputJson += delta.partial_json; }
					}
				} else if (type === 'content_block_stop') {
					const index = event.index as number;
					const block = activeBlocks.get(index);
					if (block) { completedBlocks.push(block); activeBlocks.delete(index); }
				} else if (type === 'message_delta') {
					const delta = event.delta as { stop_reason?: string };
					if (delta.stop_reason) stopReason = delta.stop_reason;
				} else if (type === 'error') {
					const err = event.error as { message?: string };
					throw new ConvexError(`Anthropic streaming error: ${err?.message ?? 'Unknown'}`);
				}
			}
		}
	} finally {
		reader.releaseLock();
	}

	completedBlocks.sort((a, b) => a.index - b.index);
	const contentBlocks: ContentBlock[] = [];
	const toolUseBlocks: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

	for (const block of completedBlocks) {
		if (block.type === 'text' && block.text) {
			contentBlocks.push({ type: 'text', text: block.text });
		} else if (block.type === 'tool_use' && block.id && block.name) {
			let input: Record<string, unknown> = {};
			if (block.inputJson) { try { input = JSON.parse(block.inputJson) as Record<string, unknown>; } catch { /* keep empty */ } }
			contentBlocks.push({ type: 'tool_use', id: block.id, name: block.name, input });
			toolUseBlocks.push({ id: block.id, name: block.name, input });
		}
	}

	return { contentBlocks, toolUseBlocks, stopReason };
}

// ─── CORS ────────────────────────────────────────────────────────────────────

const corsHeaders = {
	'Access-Control-Allow-Origin': process.env.SITE_URL ?? '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type'
};

// ─── Main httpAction ──────────────────────────────────────────────────────────

export const chat = httpAction(async (ctx, req) => {
	if (req.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' } });
	}

	const user = await authComponent.getAuthUser(ctx);
	if (!user) return new Response('Unauthorized', { status: 401 });

	let message: string;
	let conversationId: Id<'conversations'> | undefined;
	try {
		const body = (await req.json()) as { message?: string; conversationId?: string };
		message = (body.message ?? '').trim();
		conversationId = body.conversationId as Id<'conversations'> | undefined;
	} catch {
		return new Response('Invalid JSON body', { status: 400 });
	}

	if (!message || message.length > 2000) {
		return new Response('Message invalide (max 2000 caractères)', { status: 400 });
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const iMgr = (internal as any).agents.manager;

	const orgProfile = await ctx.runQuery(iMgr.getManagerOrgProfile, { userId: user._id });
	if (!orgProfile) return new Response('Accès refusé : rôle ORG_ADMIN ou ORG_MANAGER requis', { status: 403 });
	const { org, organizationId } = orgProfile;

	// Fleet size for system prompt
	const fleetSummary = await ctx.runQuery(iMgr.toolGetFleetSummary, { organizationId });
	const fleetSize = fleetSummary.fleet.total;

	const convId = await ctx.runMutation(iMgr.saveManagerUserMessage, {
		organizationId,
		userId: user._id,
		message,
		conversationId
	});

	const conversation = await ctx.runQuery(iMgr.getManagerConversation, { conversationId: convId });
	if (!conversation) return new Response('Conversation introuvable', { status: 500 });

	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) return new Response('ANTHROPIC_API_KEY non configuré', { status: 500 });

	const systemPrompt = buildManagerSystemPrompt(org.name, fleetSize);
	const recentMessages = conversation.messages.slice(-10);
	const initialMessages: AnthropicMessage[] = (recentMessages as { role: string; content: string }[]).map((m) => ({
		role: m.role as 'user' | 'assistant',
		content: m.content
	}));

	const enc = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			const push = (obj: object) => controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

			try {
				let fullText = '';
				const messages = [...initialMessages];

				for (let step = 0; step < 8; step++) {
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
							stream: true,
							system: systemPrompt,
							tools: managerTools,
							messages
						})
					});

					if (!res.ok || !res.body) {
						const errorText = await res.text().catch(() => `HTTP ${res.status}`);
						push({ type: 'error', message: `Anthropic API ${res.status}: ${errorText}` });
						controller.close();
						return;
					}

					const { contentBlocks, toolUseBlocks, stopReason } = await parseAnthropicStream(res.body, {
						onTextDelta: (text) => { fullText += text; push({ type: 'text', text }); },
						onToolCall: (name) => push({ type: 'tool_call', name })
					});

					if (stopReason === 'end_turn') {
						await ctx.runMutation(iMgr.saveManagerAssistantMessage, { conversationId: convId, text: fullText });
						push({ type: 'done', conversationId: convId });
						controller.close();
						return;
					}

					if (stopReason === 'tool_use' && toolUseBlocks.length > 0) {
						messages.push({ role: 'assistant', content: contentBlocks });
						const toolResults: ToolResultBlock[] = [];

						for (const tool of toolUseBlocks) {
							let result: unknown;
							try {
								const input = tool.input;
								switch (tool.name) {
									case 'getFleetUtilizationStats':
										result = await ctx.runQuery(iMgr.toolGetFleetUtilization, {
											organizationId,
											period: input.period as string,
											sortBy: input.sortBy as string | undefined
										});
										push({ type: 'widget', widget: 'fleet_utilization', ...result as object });
										break;
									case 'getCostBreakdown':
										result = await ctx.runQuery(iMgr.toolGetCostBreakdown, {
											organizationId,
											period: input.period as string,
											groupBy: input.groupBy as string
										});
										push({ type: 'widget', widget: 'cost_breakdown', ...result as object });
										break;
									case 'getReservationActivity':
										result = await ctx.runQuery(iMgr.toolGetReservationActivity, {
											organizationId,
											period: input.period as string,
											groupBy: input.groupBy as string
										});
										push({ type: 'widget', widget: 'reservation_activity', ...result as object });
										break;
									case 'getMaintenanceOverview':
										result = await ctx.runQuery(iMgr.toolGetMaintenanceOverview, {
											organizationId,
											includeUpcoming: input.includeUpcoming as boolean | undefined,
											includeOverdue: input.includeOverdue as boolean | undefined
										});
										push({ type: 'widget', widget: 'maintenance_overview', ...result as object });
										break;
									case 'getComplianceStatus':
										result = await ctx.runQuery(iMgr.toolGetComplianceStatus, {
											organizationId,
											daysAhead: input.daysAhead as number | undefined
										});
										push({ type: 'widget', widget: 'compliance_status', ...result as object });
										break;
									case 'getFleetSummary':
										result = await ctx.runQuery(iMgr.toolGetFleetSummary, { organizationId });
										push({ type: 'widget', widget: 'fleet_summary', ...result as object });
										break;
									default:
										result = { error: `Outil inconnu : ${tool.name}` };
								}
							} catch (e) {
								result = { error: e instanceof Error ? e.message : "Erreur lors de l'exécution" };
							}

							toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content: JSON.stringify(result) });
						}

						messages.push({ role: 'user', content: toolResults });
						continue;
					}

					push({ type: 'error', message: `Arrêt inattendu : ${stopReason}` });
					controller.close();
					return;
				}

				push({ type: 'error', message: "Nombre maximum d'étapes atteint" });
				controller.close();
			} catch (e) {
				push({ type: 'error', message: e instanceof Error ? e.message : 'Erreur interne' });
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
	});
});
