import { httpAction, internalQuery } from '../_generated/server';
import { makeFunctionReference } from 'convex/server';
import { authComponent } from '../auth';
import { v } from 'convex/values';

// References sans circular import (évite TS7022/TS7023)
const getProspectsForUser = makeFunctionReference<'query'>('sales/prospects:getProspectsForUser');
const addProspectNoteInternal = makeFunctionReference<'mutation'>('sales/prospects:addProspectNoteInternal');
const getSignalsForUser = makeFunctionReference<'query'>('sales/signals:getSignalsForUser');
const getChallengesForUser = makeFunctionReference<'query'>('sales/challenges:getChallengesForUser');

// ── Staff role lookup ─────────────────────────────────────────────────────────

export const getSalesStaffRole = internalQuery({
	args: { userId: v.string() },
	handler: async (ctx, { userId }) => {
		const allStaff = (await ctx.db.query('myceliumStaff').collect()) as Array<{
			userId: string;
			staffRole: 'super_admin' | 'concierge' | 'sales';
		}>;
		const record = allStaff.find((r) => r.userId === userId);
		if (record) return record.staffRole;
		if (allStaff.length === 0) return 'super_admin'; // bootstrap
		return null;
	}
});

// ── Anthropic types ───────────────────────────────────────────────────────────

type TextBlock = { type: 'text'; text: string };
type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
type ToolResultBlock = { type: 'tool_result'; tool_use_id: string; content: string };
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

// ── Tools définis pour l'agent commercial ─────────────────────────────────────

const TOOLS = [
	{
		name: 'list_prospects',
		description: 'Lister les prospects du commercial, avec leur stade dans le pipeline',
		input_schema: { type: 'object', properties: {}, required: [] }
	},
	{
		name: 'add_prospect_note',
		description: 'Ajouter une note à un prospect (next step, résultat appel, etc.)',
		input_schema: {
			type: 'object',
			properties: {
				prospectId: { type: 'string', description: 'ID du prospect' },
				note: { type: 'string', description: 'Note à ajouter (texte libre)' }
			},
			required: ['prospectId', 'note']
		}
	},
	{
		name: 'get_upsell_signals',
		description: 'Obtenir les signaux upsell/churn actifs et leur priorité',
		input_schema: { type: 'object', properties: {}, required: [] }
	},
	{
		name: 'get_weekly_challenges',
		description: "Voir les défis de la semaine et l'avancement du commercial",
		input_schema: { type: 'object', properties: {}, required: [] }
	}
];

const SYSTEM_PROMPT = `Tu es l'Agent Commercial Mycelium, un assistant IA dédié aux commerciaux de Mycelium Fleet OS.

Ton rôle :
- Aider les commerciaux à gérer leur pipeline de prospects
- Analyser les signaux d'opportunité (démos, upsell, risques churn)
- Coacher sur les prochaines actions à fort impact
- Encourager la progression sur les défis hebdomadaires

Mycelium Fleet OS est un Fleet Operating System pour PME/ETI (50-500 salariés, 15-150 véhicules).
Pricing : Essential £420/mois, Professional £750/mois, Business £1250/mois.
Marchés prioritaires : UK + pays nordiques (SE, NO, DK). France secondaire.

Pipeline : discovery → demo → negotiation → won → lost.

Sois concis et orienté action. Tu parles en français. Tu ne hallucines pas — tu t'appuies uniquement sur les données réelles via tes outils.`;

// ── SSE ───────────────────────────────────────────────────────────────────────

function sse(data: object): string {
	return `data: ${JSON.stringify(data)}\n\n`;
}

// ── CORS ──────────────────────────────────────────────────────────────────────

const corsHeaders = {
	'Access-Control-Allow-Origin': process.env.SITE_URL ?? '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type'
};

// ── httpAction principal ──────────────────────────────────────────────────────

export const chat = httpAction(async (ctx, req) => {
	if (req.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' }
		});
	}

	// Auth via Better Auth — même pattern que manager.ts
	const user = await authComponent.getAuthUser(ctx);
	if (!user) return new Response('Unauthorized', { status: 401 });

	// Vérifier staffRole
	const getSalesStaffRoleFn = makeFunctionReference<'query'>('agents/salesAgent:getSalesStaffRole');
	const staffRole = await ctx.runQuery(getSalesStaffRoleFn, { userId: user._id });
	if (staffRole !== 'sales' && staffRole !== 'super_admin') {
		return new Response('Forbidden: accès réservé au staff Sales', { status: 403 });
	}

	let body: { message?: string; history?: Array<{ role: string; content: string }> };
	try {
		body = await req.json();
	} catch {
		return new Response('Invalid JSON', { status: 400 });
	}

	const message = (body.message ?? '').trim();
	if (!message || message.length > 2000) {
		return new Response('Message invalide (max 2000 caractères)', { status: 400 });
	}

	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) return new Response('ANTHROPIC_API_KEY non configuré', { status: 500 });

	const enc = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			const push = (data: object) => controller.enqueue(enc.encode(sse(data)));

			try {
				const messages: Array<{ role: 'user' | 'assistant'; content: string | ContentBlock[] }> = [
					...(body.history ?? []).map((m) => ({
						role: m.role as 'user' | 'assistant',
						content: m.content
					})),
					{ role: 'user', content: message }
				];

				for (let step = 0; step < 8; step++) {
					const res = await fetch('https://api.anthropic.com/v1/messages', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'x-api-key': apiKey,
							'anthropic-version': '2023-06-01'
						},
						body: JSON.stringify({
							model: 'claude-sonnet-5-20251101',
							max_tokens: 2048,
							system: SYSTEM_PROMPT,
							tools: TOOLS,
							messages
						})
					});

					if (!res.ok) {
						const err = await res.text();
						push({ type: 'error', content: `Erreur API: ${err}` });
						break;
					}

					const result = (await res.json()) as {
						stop_reason: string;
						content: ContentBlock[];
					};

					const toolUses: ToolUseBlock[] = [];

					for (const block of result.content) {
						if (block.type === 'text') {
							push({ type: 'text', content: block.text });
						} else if (block.type === 'tool_use') {
							toolUses.push(block);
							push({ type: 'tool_call', name: block.name });
						}
					}

					if (result.stop_reason === 'end_turn' || toolUses.length === 0) break;

					// Exécuter les outils
					const toolResults: ToolResultBlock[] = [];

					for (const tool of toolUses) {
						let content = '';
						try {
							if (tool.name === 'list_prospects') {
								const prospects = await ctx.runQuery(getProspectsForUser, {
									salesUserId: user._id
								});
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								content = JSON.stringify((prospects as any[]).map((p) => ({
									id: p._id,
									company: p.companyName,
									stage: p.stage,
									contact: p.contactName,
									country: p.country,
									fleetSize: p.estimatedFleetSize,
									lastActivity: p.lastActivityAt
										? new Date(p.lastActivityAt).toLocaleDateString('fr-FR')
										: null
								})));
							} else if (tool.name === 'add_prospect_note') {
								const input = tool.input as { prospectId: string; note: string };
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								await ctx.runMutation(addProspectNoteInternal as any, {
									salesUserId: user._id,
									prospectId: input.prospectId,
									note: input.note
								});
								content = JSON.stringify({ success: true });
							} else if (tool.name === 'get_upsell_signals') {
								const signals = await ctx.runQuery(getSignalsForUser, {
									salesUserId: user._id
								});
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								content = JSON.stringify((signals as any[]).map((s) => ({
									type: s.type,
									title: s.title,
									body: s.body,
									priority: s.priority,
									read: !!s.readAt
								})));
							} else if (tool.name === 'get_weekly_challenges') {
								const challenges = await ctx.runQuery(getChallengesForUser, {
									salesUserId: user._id
								});
								content = challenges
									? JSON.stringify(challenges.challenges)
									: JSON.stringify({ message: 'Pas de défis générés cette semaine' });
							}
						} catch (e) {
							content = JSON.stringify({ error: String(e) });
						}

						toolResults.push({ type: 'tool_result', tool_use_id: tool.id, content });
					}

					messages.push({ role: 'assistant', content: result.content });
					messages.push({ role: 'user', content: toolResults });
				}
			} catch (e) {
				push({ type: 'error', content: String(e) });
			}

			push({ type: 'done', content: '' });
			controller.close();
		}
	});

	return new Response(stream, {
		headers: {
			...corsHeaders,
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
});
