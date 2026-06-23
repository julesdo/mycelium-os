import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery, httpAction } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { authComponent } from '../auth';
import { buildSystemPrompt } from './prompts';
import { conciergeTools } from './tools';

// ─── Anthropic message types ───────────────────────────────────────────────

type TextBlock = { type: 'text'; text: string };
type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
type ToolResultBlock = { type: 'tool_result'; tool_use_id: string; content: string };
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

type AnthropicMessage = {
	role: 'user' | 'assistant';
	content: string | ContentBlock[];
};

// ─── Internal: org + conversation helpers ─────────────────────────────────

export const getUserOrgProfile = internalQuery({
	args: { userId: v.string() },
	handler: async (ctx, { userId }) => {
		const profile = await ctx.db
			.query('userProfiles')
			.withIndex('by_userId', (q) => q.eq('userId', userId))
			.unique();
		if (!profile?.currentOrganizationId) return null;
		const org = await ctx.db.get(profile.currentOrganizationId);
		if (!org) return null;
		return { org, organizationId: profile.currentOrganizationId };
	}
});

export const getConversationForAction = internalQuery({
	args: { conversationId: v.id('conversations') },
	handler: async (ctx, { conversationId }) => ctx.db.get(conversationId)
});

export const saveUserMessage = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		userId: v.string(),
		message: v.string(),
		conversationId: v.optional(v.id('conversations'))
	},
	handler: async (ctx, args) => {
		let convId = args.conversationId;

		if (!convId) {
			const existing = await ctx.db
				.query('conversations')
				.withIndex('by_user_recent', (q) => q.eq('userId', args.userId))
				.order('desc')
				.first();
			if (existing && existing.organizationId === args.organizationId) {
				convId = existing._id;
			} else {
				const now = Date.now();
				convId = await ctx.db.insert('conversations', {
					organizationId: args.organizationId,
					userId: args.userId,
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

export const saveAssistantMessage = internalMutation({
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

// ─── Internal tool runners ─────────────────────────────────────────────────

export const toolSearchVehicles = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		startDate: v.string(),
		endDate: v.string(),
		location: v.optional(v.string()),
		category: v.optional(v.union(v.literal('PASSENGER'), v.literal('UTILITY'), v.literal('TRUCK'))),
		energy: v.optional(v.union(v.literal('THERMAL'), v.literal('HYBRID'), v.literal('ELECTRIC')))
	},
	handler: async (ctx, args) => {
		const start = new Date(args.startDate).getTime();
		const end = new Date(args.endDate).getTime();

		let vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org_and_status', (q) =>
				q.eq('organizationId', args.organizationId).eq('status', 'AVAILABLE')
			)
			.collect();

		if (args.location) vehicles = vehicles.filter((v) => v.location === args.location);
		if (args.category) vehicles = vehicles.filter((v) => v.category === args.category);
		if (args.energy) vehicles = vehicles.filter((v) => v.energy === args.energy);

		const activeReservations = await ctx.db
			.query('reservations')
			.withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
			.collect();

		const blockedIds = new Set(
			activeReservations
				.filter(
					(r) =>
						r.status !== 'CANCELLED' &&
						r.status !== 'COMPLETED' &&
						r.startDate < end &&
						r.endDate > start
				)
				.map((r) => r.vehicleId)
		);

		const available = vehicles
			.filter((vehicle) => !blockedIds.has(vehicle._id))
			.map((vehicle) => ({
				id: vehicle._id,
				brand: vehicle.brand,
				model: vehicle.model,
				registration: vehicle.registration,
				year: vehicle.year,
				label: `${vehicle.brand} ${vehicle.model} (${vehicle.registration})`,
				category: vehicle.category,
				energy: vehicle.energy,
				location: vehicle.location ?? null
			}));

		// Limit to 8 vehicles sent to Claude to avoid token overflow
		return { vehicles: available.slice(0, 8), totalFound: available.length };
	}
});

export const toolCreateReservation = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		userId: v.string(),
		vehicleId: v.id('vehicles'),
		startDate: v.string(),
		endDate: v.string(),
		purpose: v.string()
	},
	handler: async (ctx, args) => {
		const start = new Date(args.startDate).getTime();
		const end = new Date(args.endDate).getTime();

		const vehicle = await ctx.db.get(args.vehicleId);
		if (!vehicle || vehicle.organizationId !== args.organizationId) {
			throw new ConvexError('Véhicule introuvable ou non autorisé');
		}

		const candidates = await ctx.db
			.query('reservations')
			.withIndex('by_vehicle_and_dates', (q) =>
				q.eq('vehicleId', args.vehicleId).lt('startDate', end)
			)
			.collect();

		const hasConflict = candidates.some(
			(r) => r.status !== 'CANCELLED' && r.status !== 'COMPLETED' && r.endDate > start
		);
		if (hasConflict) throw new ConvexError('VEHICLE_UNAVAILABLE');

		const now = Date.now();
		const id = await ctx.db.insert('reservations', {
			organizationId: args.organizationId,
			vehicleId: args.vehicleId,
			userId: args.userId,
			startDate: start,
			endDate: end,
			purpose: args.purpose,
			status: 'CONFIRMED',
			createdAt: now,
			updatedAt: now
		});

		return {
			id,
			vehicle: `${vehicle.brand} ${vehicle.model} (${vehicle.registration})`,
			startDate: args.startDate,
			endDate: args.endDate,
			status: 'CONFIRMED'
		};
	}
});

export const toolListReservations = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		userId: v.string(),
		status: v.optional(
			v.union(v.literal('UPCOMING'), v.literal('PAST'), v.literal('CANCELLED'))
		)
	},
	handler: async (ctx, args) => {
		let reservations = await ctx.db
			.query('reservations')
			.withIndex('by_user', (q) => q.eq('userId', args.userId))
			.collect();

		reservations = reservations.filter((r) => r.organizationId === args.organizationId);

		if (args.status === 'UPCOMING') {
			reservations = reservations.filter(
				(r) =>
					r.status === 'PENDING' || r.status === 'CONFIRMED' || r.status === 'IN_PROGRESS'
			);
		} else if (args.status === 'PAST') {
			reservations = reservations.filter((r) => r.status === 'COMPLETED');
		} else if (args.status === 'CANCELLED') {
			reservations = reservations.filter((r) => r.status === 'CANCELLED');
		} else {
			// Default: upcoming only
			reservations = reservations.filter(
				(r) =>
					r.status === 'PENDING' || r.status === 'CONFIRMED' || r.status === 'IN_PROGRESS'
			);
		}

		return Promise.all(
			reservations.map(async (r) => {
				const vehicle = await ctx.db.get(r.vehicleId);
				return {
					id: r._id,
					vehicle: vehicle
						? `${vehicle.brand} ${vehicle.model} (${vehicle.registration})`
						: 'Véhicule inconnu',
					startDate: new Date(r.startDate).toLocaleString('fr-FR'),
					endDate: new Date(r.endDate).toLocaleString('fr-FR'),
					purpose: r.purpose,
					status: r.status
				};
			})
		);
	}
});

export const toolCancelReservation = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		userId: v.string(),
		reservationId: v.id('reservations')
	},
	handler: async (ctx, args) => {
		const reservation = await ctx.db.get(args.reservationId);
		if (!reservation || reservation.organizationId !== args.organizationId) {
			throw new ConvexError('Réservation introuvable');
		}
		if (reservation.userId !== args.userId) {
			throw new ConvexError('Vous ne pouvez annuler que vos propres réservations');
		}
		if (reservation.status !== 'PENDING' && reservation.status !== 'CONFIRMED') {
			throw new ConvexError(
				`Impossible d'annuler une réservation avec le statut ${reservation.status}`
			);
		}
		await ctx.db.patch(args.reservationId, { status: 'CANCELLED', updatedAt: Date.now() });
		return { success: true };
	}
});

// ─── SSE parser for Anthropic streaming ────────────────────────────────────

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
	callbacks: {
		onTextDelta: (text: string) => void;
		onToolCall: (name: string) => void;
	}
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
					activeBlocks.set(index, {
						index,
						type: block.type as 'text' | 'tool_use',
						text: '',
						id: block.id,
						name: block.name,
						inputJson: ''
					});
					if (block.type === 'tool_use' && block.name) callbacks.onToolCall(block.name);
				} else if (type === 'content_block_delta') {
					const index = event.index as number;
					const delta = event.delta as { type: string; text?: string; partial_json?: string };
					const block = activeBlocks.get(index);
					if (block) {
						if (delta.type === 'text_delta' && delta.text) {
							block.text += delta.text;
							callbacks.onTextDelta(delta.text);
						} else if (delta.type === 'input_json_delta' && delta.partial_json) {
							block.inputJson += delta.partial_json;
						}
					}
				} else if (type === 'content_block_stop') {
					const index = event.index as number;
					const block = activeBlocks.get(index);
					if (block) {
						completedBlocks.push(block);
						activeBlocks.delete(index);
					}
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
			if (block.inputJson) {
				try {
					input = JSON.parse(block.inputJson) as Record<string, unknown>;
				} catch {
					// keep empty input
				}
			}
			contentBlocks.push({ type: 'tool_use', id: block.id, name: block.name, input });
			toolUseBlocks.push({ id: block.id, name: block.name, input });
		}
	}

	return { contentBlocks, toolUseBlocks, stopReason };
}

// ─── CORS ─────────────────────────────────────────────────────────────────

const corsHeaders = {
	'Access-Control-Allow-Origin': process.env.SITE_URL ?? '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type'
};

// ─── Main httpAction ──────────────────────────────────────────────────────

export const chat = httpAction(async (ctx, req) => {
	// CORS preflight
	if (req.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' }
		});
	}

	// Auth — requires Authorization: Bearer <convex-session-token>
	const user = await authComponent.getAuthUser(ctx);
	if (!user) return new Response('Unauthorized', { status: 401 });

	// Parse body
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

	// Org context
	const orgProfile = await ctx.runQuery(internal.agents.concierge.getUserOrgProfile, {
		userId: user._id
	});
	if (!orgProfile) return new Response('Aucune organisation active', { status: 403 });
	const { org, organizationId } = orgProfile;

	// Save user message + get/create conversation
	const convId = await ctx.runMutation(internal.agents.concierge.saveUserMessage, {
		organizationId,
		userId: user._id,
		message,
		conversationId
	});

	// Load history (includes the message we just saved)
	const conversation = await ctx.runQuery(internal.agents.concierge.getConversationForAction, {
		conversationId: convId
	});
	if (!conversation) return new Response('Conversation introuvable', { status: 500 });

	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) return new Response('ANTHROPIC_API_KEY non configuré', { status: 500 });

	const systemPrompt = buildSystemPrompt({
		orgName: org.name,
		userName: user.name ?? user.email
	});

	// Keep only last 10 messages to cap token usage on long conversations
	const recentMessages = conversation.messages.slice(-10);
	const initialMessages: AnthropicMessage[] = recentMessages.map((m) => ({
		role: m.role,
		content: m.content
	}));

	const enc = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			const push = (obj: object) =>
				controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

			try {
				let fullText = '';
				const messages = [...initialMessages];

				for (let step = 0; step < 10; step++) {
					const res = await fetch('https://api.anthropic.com/v1/messages', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'x-api-key': apiKey,
							'anthropic-version': '2023-06-01'
						},
						body: JSON.stringify({
							model: 'claude-sonnet-4-6',
							max_tokens: 1024,
							stream: true,
							system: systemPrompt,
							tools: conciergeTools,
							messages
						})
					});

					if (!res.ok || !res.body) {
						const errorText = await res.text().catch(() => `HTTP ${res.status}`);
						push({ type: 'error', message: `Anthropic API ${res.status}: ${errorText}` });
						controller.close();
						return;
					}

					const { contentBlocks, toolUseBlocks, stopReason } = await parseAnthropicStream(
						res.body,
						{
							onTextDelta: (text) => {
								fullText += text;
								push({ type: 'text', text });
							},
							onToolCall: (name) => push({ type: 'tool_call', name })
						}
					);

					if (stopReason === 'end_turn') {
						await ctx.runMutation(internal.agents.concierge.saveAssistantMessage, {
							conversationId: convId,
							text: fullText
						});
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
									case 'searchAvailableVehicles':
										result = await ctx.runQuery(
											internal.agents.concierge.toolSearchVehicles,
											{
												organizationId,
												startDate: input.startDate as string,
												endDate: input.endDate as string,
												location: input.location as string | undefined,
												category: input.category as
													| 'PASSENGER'
													| 'UTILITY'
													| 'TRUCK'
													| undefined,
												energy: input.energy as
													| 'THERMAL'
													| 'HYBRID'
													| 'ELECTRIC'
													| undefined
											}
										);
										{
											const r = result as { vehicles: unknown[]; totalFound: number };
											if (r.vehicles.length > 0) {
												push({
													type: 'widget',
													widget: 'vehicle_proposal',
													vehicle: r.vehicles[0],
													totalFound: r.totalFound,
													startDate: input.startDate as string,
													endDate: input.endDate as string
												});
											}
										}
										break;
									case 'createReservation':
										result = await ctx.runMutation(
											internal.agents.concierge.toolCreateReservation,
											{
												organizationId,
												userId: user._id,
												vehicleId: input.vehicleId as Id<'vehicles'>,
												startDate: input.startDate as string,
												endDate: input.endDate as string,
												purpose: input.purpose as string
											}
										);
										push({
											type: 'widget',
											widget: 'reservation_confirmed',
											reservation: result
										});
										break;
									case 'listMyReservations':
										result = await ctx.runQuery(
											internal.agents.concierge.toolListReservations,
											{
												organizationId,
												userId: user._id,
												status: input.status as
													| 'UPCOMING'
													| 'PAST'
													| 'CANCELLED'
													| undefined
											}
										);
										break;
									case 'cancelReservation':
										result = await ctx.runMutation(
											internal.agents.concierge.toolCancelReservation,
											{
												organizationId,
												userId: user._id,
												reservationId: input.reservationId as Id<'reservations'>
											}
										);
										break;
									default:
										result = { error: `Outil inconnu : ${tool.name}` };
								}
							} catch (e) {
								result = {
									error: e instanceof Error ? e.message : "Erreur lors de l'exécution"
								};
							}

							toolResults.push({
								type: 'tool_result',
								tool_use_id: tool.id,
								content: JSON.stringify(result)
							});
						}

						messages.push({ role: 'user', content: toolResults });
						continue;
					}

					// max_tokens or unexpected stop_reason
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
		headers: {
			...corsHeaders,
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache'
		}
	});
});
