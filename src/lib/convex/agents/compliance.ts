/**
 * Agent Compliance Officer — Agent #4 in the Mycelium Fleet OS 6-agent architecture.
 *
 * Surveillance réglementaire proactive :
 * - BiK UK (HMRC P11D) : calcul taxes employé + Class 1A NIC employeur
 * - CSRD / ESRS E1 nordiques : émissions Scope 1-2-3
 * - CT, assurances, carte grise : alertes expiration
 * - Permis conducteurs : expirations + catégories
 * - Contraventions non traitées
 *
 * Read-only, 6 tools. Namespaced `:compliance` dans conversations.
 */

import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery, httpAction } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { authComponent } from '../auth';
import { getBikRate, calculateBik, fuelTypeFromEnergy, currentTaxYear } from '../bikRates';

// ─── Shared types ─────────────────────────────────────────────────────────────

type TextBlock = { type: 'text'; text: string };
type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
type ToolResultBlock = { type: 'tool_result'; tool_use_id: string; content: string };
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

type AnthropicMessage = {
	role: 'user' | 'assistant';
	content: string | ContentBlock[];
};

// ─── Auth check ───────────────────────────────────────────────────────────────

export const getComplianceOrgProfile = internalQuery({
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
	},
});

// ─── Conversation persistence ──────────────────────────────────────────────────

export const getComplianceConversation = internalQuery({
	args: { conversationId: v.id('conversations') },
	handler: async (ctx, { conversationId }) => ctx.db.get(conversationId),
});

export const saveComplianceUserMessage = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		userId: v.string(),
		message: v.string(),
		conversationId: v.optional(v.id('conversations')),
	},
	handler: async (ctx, args) => {
		const complianceUserId = `${args.userId}:compliance`;
		let convId = args.conversationId;

		if (!convId) {
			const existing = await ctx.db
				.query('conversations')
				.withIndex('by_user_recent', (q) => q.eq('userId', complianceUserId))
				.order('desc')
				.first();
			if (existing && existing.organizationId === args.organizationId) {
				convId = existing._id;
			} else {
				const now = Date.now();
				convId = await ctx.db.insert('conversations', {
					organizationId: args.organizationId,
					userId: complianceUserId,
					messages: [],
					createdAt: now,
					updatedAt: now,
				});
			}
		}

		const conversation = await ctx.db.get(convId);
		if (!conversation) throw new ConvexError('Conversation introuvable');

		await ctx.db.patch(convId, {
			messages: [
				...conversation.messages,
				{ role: 'user' as const, content: args.message, timestamp: Date.now() },
			],
			updatedAt: Date.now(),
		});

		return convId;
	},
});

export const saveComplianceAssistantMessage = internalMutation({
	args: { conversationId: v.id('conversations'), text: v.string() },
	handler: async (ctx, { conversationId, text }) => {
		const conversation = await ctx.db.get(conversationId);
		if (!conversation) return;
		await ctx.db.patch(conversationId, {
			messages: [
				...conversation.messages,
				{ role: 'assistant' as const, content: text, timestamp: Date.now() },
			],
			updatedAt: Date.now(),
		});
	},
});

// ─── Tool: getVehicleDocumentStatus ───────────────────────────────────────────
// CT, assurance, carte grise, leasing — expirations passées et à venir

export const toolGetVehicleDocumentStatus = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		daysAhead: v.optional(v.number()),
	},
	handler: async (ctx, { organizationId, daysAhead = 60 }) => {
		const now = Date.now();
		const threshold = now + daysAhead * 24 * 60 * 60 * 1000;

		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.neq(q.field('status'), 'RETIRED'))
			.collect();

		function toMs(dateStr: string | undefined): number | null {
			if (!dateStr) return null;
			return new Date(dateStr).getTime();
		}

		function daysDiff(ms: number) {
			return Math.floor((ms - now) / (24 * 60 * 60 * 1000));
		}

		const expired: { vehicle: string; document: string; expiredDaysAgo: number }[] = [];
		const expiring: { vehicle: string; document: string; daysLeft: number; date: string }[] = [];

		for (const v of vehicles) {
			const label = `${v.brand} ${v.model} · ${v.registration}`;
			const docs: { name: string; date: string | undefined }[] = [
				{ name: 'Contrôle technique', date: v.ctExpiryDate },
				{ name: 'Assurance', date: v.insuranceExpiryDate },
				{ name: 'Carte grise', date: v.registrationExpiryDate },
				{ name: 'Leasing', date: v.leaseEndDate },
			];

			for (const doc of docs) {
				const ms = toMs(doc.date);
				if (!ms) continue;
				const days = daysDiff(ms);
				if (ms < now) {
					expired.push({ vehicle: label, document: doc.name, expiredDaysAgo: -days });
				} else if (ms <= threshold) {
					expiring.push({ vehicle: label, document: doc.name, daysLeft: days, date: doc.date! });
				}
			}
		}

		expired.sort((a, b) => b.expiredDaysAgo - a.expiredDaysAgo);
		expiring.sort((a, b) => a.daysLeft - b.daysLeft);

		return {
			expired,
			expiring,
			summary: {
				expiredCount: expired.length,
				expiringCount: expiring.length,
				checkedVehicles: vehicles.length,
				horizonDays: daysAhead,
			},
		};
	},
});

// ─── Tool: getDriverLicenseStatus ─────────────────────────────────────────────

export const toolGetDriverLicenseStatus = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		daysAhead: v.optional(v.number()),
	},
	handler: async (ctx, { organizationId, daysAhead = 90 }) => {
		const now = Date.now();
		const threshold = now + daysAhead * 24 * 60 * 60 * 1000;

		const drivers = await ctx.db
			.query('driverProfiles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const expired: { driver: string; expiredDaysAgo: number }[] = [];
		const expiring: { driver: string; daysLeft: number; date: string }[] = [];
		const blocked: { driver: string; reason: string }[] = [];
		const noLicense: { driver: string }[] = [];

		for (const d of drivers) {
			const name = d.licenseNumber ? `Conducteur ${d.licenseNumber.slice(-6)}` : d.userId.slice(-8);
			if (d.isBlocked) {
				blocked.push({ driver: name, reason: d.blockReason ?? 'Inconnu' });
			}
			if (!d.licenseExpiryDate) {
				noLicense.push({ driver: name });
				continue;
			}
			const ms = new Date(d.licenseExpiryDate).getTime();
			const days = Math.floor((ms - now) / (24 * 60 * 60 * 1000));
			if (ms < now) {
				expired.push({ driver: name, expiredDaysAgo: -days });
			} else if (ms <= threshold) {
				expiring.push({ driver: name, daysLeft: days, date: d.licenseExpiryDate });
			}
		}

		return {
			summary: {
				totalDrivers: drivers.length,
				expiredLicenses: expired.length,
				expiringLicenses: expiring.length,
				blockedDrivers: blocked.length,
				noLicenseData: noLicense.length,
			},
			expired,
			expiring,
			blocked,
		};
	},
});

// ─── Tool: getUnresolvedViolations ────────────────────────────────────────────

export const toolGetUnresolvedViolations = internalQuery({
	args: {
		organizationId: v.id('organizations'),
	},
	handler: async (ctx, { organizationId }) => {
		const violations = await ctx.db
			.query('trafficViolations')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const unresolved = violations.filter(
			(v) => v.status === 'RECEIVED' || v.status === 'IDENTIFIED' || v.status === 'NOTIFIED'
		);
		const totalFines = unresolved.reduce((s, v) => s + (v.amount ?? 0), 0);
		const byStatus: Record<string, number> = {};
		for (const v of unresolved) {
			byStatus[v.status] = (byStatus[v.status] ?? 0) + 1;
		}

		const recent = unresolved
			.sort((a, b) => b.violationDate - a.violationDate)
			.slice(0, 10)
			.map((v) => ({
				date: new Date(v.violationDate).toLocaleDateString('fr-FR'),
				description: v.description,
				amount: v.amount,
				status: v.status,
				paymentDecision: v.paymentDecision,
			}));

		return {
			summary: {
				total: unresolved.length,
				totalFinesAmount: Math.round(totalFines * 100) / 100,
				byStatus,
			},
			recent,
		};
	},
});

// ─── Tool: getBikComplianceSummary ────────────────────────────────────────────

export const toolGetBikComplianceSummary = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		taxYear: v.optional(v.string()),
	},
	handler: async (ctx, { organizationId, taxYear }) => {
		const org = await ctx.db.get(organizationId);
		if (!org) return null;

		// Only relevant for UK organisations
		const country = org.country ?? 'FR';

		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.neq(q.field('status'), 'RETIRED'))
			.collect();

		const year = taxYear ?? currentTaxYear();
		let totalBikValue = 0;
		let totalEmployerNic = 0;
		let totalEmployeeBasicTax = 0;
		let missingP11d = 0;
		const topBurdens: { vehicle: string; bikValue: number; nicCost: number }[] = [];

		for (const v of vehicles) {
			if (!v.p11dValue || !v.co2Gkm) { missingP11d++; continue; }

			const rateInput = {
				fuelType: fuelTypeFromEnergy(v.energy),
				co2Gkm: v.co2Gkm,
				electricRangeMiles: v.electricRangeMiles,
				taxYear: year as Parameters<typeof getBikRate>[0]['taxYear'],
			};
			const calc = calculateBik(v.p11dValue, rateInput);
			totalBikValue += calc.bikValue;
			totalEmployerNic += calc.employerNic;
			totalEmployeeBasicTax += calc.employeeBasicTax;
			topBurdens.push({
				vehicle: `${v.brand} ${v.model} · ${v.registration}`,
				bikValue: Math.round(calc.bikValue),
				nicCost: Math.round(calc.employerNic),
			});
		}

		topBurdens.sort((a, b) => b.nicCost - a.nicCost);

		return {
			country,
			relevantForBik: country === 'GB',
			taxYear: year,
			summary: {
				totalBikValue: Math.round(totalBikValue),
				totalEmployerNic: Math.round(totalEmployerNic),
				totalEmployeeBasicTax: Math.round(totalEmployeeBasicTax),
				vehiclesCalculated: vehicles.length - missingP11d,
				vehiclesMissingP11d: missingP11d,
			},
			top5Vehicles: topBurdens.slice(0, 5),
		};
	},
});

// ─── Tool: getMaintenanceComplianceStatus ─────────────────────────────────────

export const toolGetMaintenanceComplianceStatus = internalQuery({
	args: {
		organizationId: v.id('organizations'),
	},
	handler: async (ctx, { organizationId }) => {
		const now = Date.now();
		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.neq(q.field('status'), 'RETIRED'))
			.collect();

		const records = await ctx.db
			.query('maintenanceRecords')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const overdueRecords = records.filter(
			(r) => (r.status === 'SCHEDULED' || r.status === 'IN_PROGRESS') && r.scheduledDate < now
		);

		const vehiclesWithOverdueKm = vehicles.filter((v) => {
			if (!v.maintenanceKmThreshold || !v.kilometers) return false;
			return v.kilometers > v.maintenanceKmThreshold;
		});

		const vehiclesWithOverdueDates = vehicles.filter((v) => {
			if (!v.maintenanceDueDate) return false;
			return new Date(v.maintenanceDueDate).getTime() < now;
		});

		return {
			summary: {
				totalVehicles: vehicles.length,
				overdueRecords: overdueRecords.length,
				overdueKmThreshold: vehiclesWithOverdueKm.length,
				overdueDateThreshold: vehiclesWithOverdueDates.length,
			},
			overdueRecords: overdueRecords.slice(0, 10).map((r) => ({
				type: r.maintenanceType,
				scheduledDate: new Date(r.scheduledDate).toLocaleDateString('fr-FR'),
				daysOverdue: Math.floor((now - r.scheduledDate) / (24 * 60 * 60 * 1000)),
				status: r.status,
			})),
		};
	},
});

// ─── Tool: getFullComplianceDashboard ─────────────────────────────────────────
// Single call to get a complete compliance picture

export const toolGetFullComplianceDashboard = internalQuery({
	args: {
		organizationId: v.id('organizations'),
	},
	handler: async (ctx, { organizationId }) => {
		const now = Date.now();
		const thirtyDays = 30 * 24 * 60 * 60 * 1000;

		const vehicles = await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.neq(q.field('status'), 'RETIRED'))
			.collect();

		const violations = await ctx.db
			.query('trafficViolations')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		const drivers = await ctx.db
			.query('driverProfiles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		let expiredDocs = 0, expiring30Days = 0;
		for (const v of vehicles) {
			const docs = [v.ctExpiryDate, v.insuranceExpiryDate, v.registrationExpiryDate, v.leaseEndDate];
			for (const d of docs) {
				if (!d) continue;
				const ms = new Date(d).getTime();
				if (ms < now) expiredDocs++;
				else if (ms <= now + thirtyDays) expiring30Days++;
			}
		}

		const pendingViolations = violations.filter((v) => v.status === 'RECEIVED' || v.status === 'IDENTIFIED' || v.status === 'NOTIFIED');
		const expiredLicenses = drivers.filter((d) => {
			if (!d.licenseExpiryDate) return false;
			return new Date(d.licenseExpiryDate).getTime() < now;
		});
		const blockedDrivers = drivers.filter((d) => d.isBlocked);

		const riskScore =
			expiredDocs * 10 +
			expiring30Days * 3 +
			expiredLicenses.length * 8 +
			blockedDrivers.length * 5 +
			pendingViolations.length * 2;

		const riskLevel =
			riskScore === 0 ? 'COMPLIANT' :
			riskScore < 15 ? 'LOW' :
			riskScore < 40 ? 'MEDIUM' :
			'HIGH';

		return {
			riskLevel,
			riskScore,
			summary: {
				expiredDocuments: expiredDocs,
				documentsExpiringIn30Days: expiring30Days,
				pendingViolations: pendingViolations.length,
				expiredLicenses: expiredLicenses.length,
				blockedDrivers: blockedDrivers.length,
				vehiclesChecked: vehicles.length,
				driversChecked: drivers.length,
			},
			currentDate: new Date().toLocaleDateString('fr-FR', {
				weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
			}),
		};
	},
});

// ─── Tool definitions for Claude ──────────────────────────────────────────────

const complianceTools = [
	{
		name: 'getFullComplianceDashboard',
		description: "Vue d'ensemble compliance : niveau de risque global, documents expirés, permis, contraventions, conducteurs bloqués. À appeler en premier pour avoir la vue globale.",
		input_schema: {
			type: 'object',
			properties: {},
			required: [],
		},
	},
	{
		name: 'getVehicleDocumentStatus',
		description: 'Statut détaillé des documents véhicules : CT, assurance, carte grise, leasing. Retourne la liste des documents expirés et ceux expirant dans N jours.',
		input_schema: {
			type: 'object',
			properties: {
				daysAhead: { type: 'number', description: 'Horizon en jours pour les alertes à venir (défaut: 60)' },
			},
			required: [],
		},
	},
	{
		name: 'getDriverLicenseStatus',
		description: 'Statut des permis conducteurs : expirations, conducteurs bloqués, données manquantes.',
		input_schema: {
			type: 'object',
			properties: {
				daysAhead: { type: 'number', description: "Horizon d'alerte en jours (défaut: 90)" },
			},
			required: [],
		},
	},
	{
		name: 'getUnresolvedViolations',
		description: 'Liste des contraventions en attente de traitement (PENDING / PROCESSING) avec montants totaux.',
		input_schema: {
			type: 'object',
			properties: {},
			required: [],
		},
	},
	{
		name: 'getBikComplianceSummary',
		description: "Résumé BiK UK (Benefit in Kind) : valeur taxable totale, NIC Class 1A employeur, taxe employé, véhicules sans P11D. Pertinent uniquement pour les entreprises UK.",
		input_schema: {
			type: 'object',
			properties: {
				taxYear: { type: 'string', description: 'Année fiscale UK ex: "2025-26" (défaut: année courante)' },
			},
			required: [],
		},
	},
	{
		name: 'getMaintenanceComplianceStatus',
		description: "Suivi maintenance : entretiens en retard, véhicules dépassant le seuil kilométrique ou la date d'entretien.",
		input_schema: {
			type: 'object',
			properties: {},
			required: [],
		},
	},
];

// ─── System prompt ─────────────────────────────────────────────────────────────

function buildComplianceSystemPrompt(orgName: string, country: string): string {
	const date = new Date().toLocaleDateString('fr-FR', {
		weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
	});

	return `Tu es le Compliance Officer IA de ${orgName}, spécialisé dans la conformité réglementaire des flottes d'entreprise.

## Contexte
- Entreprise : ${orgName}
- Pays : ${country}
- Date : ${date}

## Ton rôle
Tu surveilles en permanence :
1. **Documents véhicules** : CT, assurance, carte grise, fin de leasing
2. **Permis conducteurs** : expirations, catégories, conducteurs bloqués
3. **Contraventions** : en attente de traitement, imputations
4. **BiK UK** : Benefit in Kind (HMRC P11D) — uniquement pour ${country === 'GB' ? "votre flotte UK" : "les entreprises UK — non applicable ici"}
5. **CSRD / ESRS E1** : obligations de reporting carbone (Scope 1-2-3) pour les nordiques
6. **Maintenance** : entretiens en retard (risque sécurité + conformité)

## Règles ABSOLUES
1. Tu ne modifies RIEN. Tu es en lecture seule.
2. Tout chiffre vient d'un tool call. Jamais d'invention.
3. Commence TOUJOURS par appeler \`getFullComplianceDashboard\` pour avoir le niveau de risque global, sauf si la question est très spécifique.
4. Priorise les urgences : documents expirés > permis expirés > contraventions non traitées > documents expirant < 30j.

## Style
- Commence par le niveau de risque global (COMPLIANT / LOW / MEDIUM / HIGH)
- Utilise des listes ordonnées par urgence décroissante
- Cite les délais précis en jours
- Recommande des actions concrètes (ex: "Renouveler le CT de la Peugeot Partner AB-123-CD avant le 15/07")
- Réponse en français, vouvoiement`;
}

// ─── SSE stream parser (réutilisé verbatim du manager) ────────────────────────

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
				try { event = JSON.parse(json) as Record<string, unknown>; } catch { continue; }

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

// ─── CORS ─────────────────────────────────────────────────────────────────────

const corsHeaders = {
	'Access-Control-Allow-Origin': process.env.SITE_URL ?? '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

// ─── Main httpAction ───────────────────────────────────────────────────────────

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
	const iCo = (internal as any).agents.compliance;

	const orgProfile = await ctx.runQuery(iCo.getComplianceOrgProfile, { userId: user._id });
	if (!orgProfile) return new Response('Accès refusé : rôle ORG_ADMIN ou ORG_MANAGER requis', { status: 403 });
	const { org, organizationId } = orgProfile;

	const convId = await ctx.runMutation(iCo.saveComplianceUserMessage, {
		organizationId,
		userId: user._id,
		message,
		conversationId,
	});

	const conversation = await ctx.runQuery(iCo.getComplianceConversation, { conversationId: convId });
	if (!conversation) return new Response('Conversation introuvable', { status: 500 });

	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) return new Response('ANTHROPIC_API_KEY non configuré', { status: 500 });

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const orgDoc = await ctx.runQuery((internal as any).agents.compliance.getComplianceOrgProfile, { userId: user._id });
	const country = (orgDoc?.org as { country?: string })?.country ?? 'FR';

	const systemPrompt = buildComplianceSystemPrompt(org.name, country);
	const recentMessages = conversation.messages.slice(-10);
	const initialMessages: AnthropicMessage[] = (recentMessages as { role: string; content: string }[]).map((m) => ({
		role: m.role as 'user' | 'assistant',
		content: m.content,
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
							'anthropic-version': '2023-06-01',
						},
						body: JSON.stringify({
							model: 'claude-sonnet-4-6',
							max_tokens: 2048,
							stream: true,
							system: systemPrompt,
							tools: complianceTools,
							messages,
						}),
					});

					if (!res.ok || !res.body) {
						const errorText = await res.text().catch(() => `HTTP ${res.status}`);
						push({ type: 'error', message: `Anthropic API ${res.status}: ${errorText}` });
						controller.close();
						return;
					}

					const { contentBlocks, toolUseBlocks, stopReason } = await parseAnthropicStream(res.body, {
						onTextDelta: (text) => { fullText += text; push({ type: 'text', text }); },
						onToolCall: (name) => push({ type: 'tool_call', name }),
					});

					if (stopReason === 'end_turn') {
						await ctx.runMutation(iCo.saveComplianceAssistantMessage, { conversationId: convId, text: fullText });
						push({ type: 'done', conversationId: convId });
						controller.close();
						return;
					}

					if (stopReason === 'tool_use' && toolUseBlocks.length > 0) {
						messages.push({ role: 'assistant', content: contentBlocks });
						const toolResults: ToolResultBlock[] = [];

						for (const tool of toolUseBlocks) {
							let result: unknown;
							const input = tool.input;
							try {
								switch (tool.name) {
									case 'getFullComplianceDashboard':
										result = await ctx.runQuery(iCo.toolGetFullComplianceDashboard, { organizationId });
										push({ type: 'widget', widget: 'compliance_dashboard', ...result as object });
										break;
									case 'getVehicleDocumentStatus':
										result = await ctx.runQuery(iCo.toolGetVehicleDocumentStatus, {
											organizationId,
											daysAhead: input.daysAhead as number | undefined,
										});
										push({ type: 'widget', widget: 'document_status', ...result as object });
										break;
									case 'getDriverLicenseStatus':
										result = await ctx.runQuery(iCo.toolGetDriverLicenseStatus, {
											organizationId,
											daysAhead: input.daysAhead as number | undefined,
										});
										push({ type: 'widget', widget: 'license_status', ...result as object });
										break;
									case 'getUnresolvedViolations':
										result = await ctx.runQuery(iCo.toolGetUnresolvedViolations, { organizationId });
										push({ type: 'widget', widget: 'violations', ...result as object });
										break;
									case 'getBikComplianceSummary':
										result = await ctx.runQuery(iCo.toolGetBikComplianceSummary, {
											organizationId,
											taxYear: input.taxYear as string | undefined,
										});
										push({ type: 'widget', widget: 'bik_summary', ...result as object });
										break;
									case 'getMaintenanceComplianceStatus':
										result = await ctx.runQuery(iCo.toolGetMaintenanceComplianceStatus, { organizationId });
										push({ type: 'widget', widget: 'maintenance_compliance', ...result as object });
										break;
									default:
										result = { error: `Outil inconnu: ${tool.name}` };
								}
							} catch (err) {
								result = { error: err instanceof Error ? err.message : 'Erreur interne' };
							}

							toolResults.push({
								type: 'tool_result',
								tool_use_id: tool.id,
								content: JSON.stringify(result),
							});
						}

						messages.push({ role: 'user', content: toolResults });
						continue;
					}

					// Unexpected stop — save what we have
					await ctx.runMutation(iCo.saveComplianceAssistantMessage, { conversationId: convId, text: fullText });
					push({ type: 'done', conversationId: convId });
					controller.close();
					return;
				}

				// Max steps reached
				push({ type: 'error', message: 'Analyse trop complexe — veuillez reformuler votre question.' });
				controller.close();
			} catch (err) {
				push({ type: 'error', message: err instanceof Error ? err.message : 'Erreur interne' });
				controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: {
			...corsHeaders,
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		},
	});
});
