// Comms integrations — Slack & Microsoft Teams via Incoming Webhooks
// Slack: https://api.slack.com/messaging/webhooks
// Teams: https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook

import { v, ConvexError } from 'convex/values';
import {
	action,
	internalAction,
	internalMutation,
	internalQuery,
	mutation,
	query
} from './_generated/server';
import { internal } from './_generated/api';
import { authedMutation, authedQuery } from './functions';
import { authComponent } from './auth';
import { getUserOrg, requireOrgAdmin } from './lib/auth';
import type { Id } from './_generated/dataModel';

// ─── Encryption (AES-256-GCM, Web Crypto) — same key as accounting ───────────

async function encryptToken(plaintext: string, keyBase64: string): Promise<string> {
	const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
	const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		new TextEncoder().encode(plaintext)
	);
	const combined = new Uint8Array(12 + ciphertext.byteLength);
	combined.set(iv, 0);
	combined.set(new Uint8Array(ciphertext), 12);
	return btoa(String.fromCharCode(...combined));
}

async function decryptToken(cipherBase64: string, keyBase64: string): Promise<string> {
	const combined = Uint8Array.from(atob(cipherBase64), (c) => c.charCodeAt(0));
	const iv = combined.slice(0, 12);
	const encrypted = combined.slice(12);
	const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
	const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
	const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
	return new TextDecoder().decode(plaintext);
}

function requireEncryptionKey(): string {
	const key = process.env.ACCOUNTING_ENCRYPTION_KEY;
	if (!key) throw new ConvexError('ACCOUNTING_ENCRYPTION_KEY non configuré dans Convex dashboard');
	return key;
}

// ─── URL validation ───────────────────────────────────────────────────────────

function validateWebhookUrl(provider: 'slack' | 'teams', url: string): void {
	if (provider === 'slack' && !url.startsWith('https://hooks.slack.com/services/')) {
		throw new ConvexError(
			'URL Slack invalide — elle doit commencer par https://hooks.slack.com/services/'
		);
	}
	if (provider === 'teams' && !url.includes('webhook.office.com')) {
		throw new ConvexError('URL Teams invalide — elle doit contenir webhook.office.com');
	}
}

// ─── Message formatters ───────────────────────────────────────────────────────

type CommsPayload = {
	title: string;
	message: string;
	type: string;
	link?: string;
};

function buildSlackMessage(payload: CommsPayload): object {
	const emoji =
		{
			MAINTENANCE_DUE: ':wrench:',
			LEASE_EXPIRING: ':calendar:',
			LICENSE_EXPIRING: ':id:',
			LICENSE_EXPIRED: ':no_entry:',
			VIOLATION_RECEIVED: ':rotating_light:',
			CONFLICT_DETECTED: ':warning:'
		}[payload.type] ?? ':bell:';

	return {
		blocks: [
			{
				type: 'section',
				text: {
					type: 'mrkdwn',
					text: `${emoji} *${payload.title}*\n${payload.message}`
				},
				...(payload.link
					? {
							accessory: {
								type: 'button',
								text: { type: 'plain_text', text: 'Voir dans Mycelium' },
								url: payload.link,
								action_id: 'open_mycelium'
							}
						}
					: {})
			},
			{
				type: 'context',
				elements: [
					{
						type: 'mrkdwn',
						text: `Mycelium Fleet OS · ${new Date().toLocaleDateString('fr-FR')}`
					}
				]
			}
		]
	};
}

function buildTeamsMessage(payload: CommsPayload): object {
	const card: Record<string, unknown> = {
		'@type': 'MessageCard',
		'@context': 'http://schema.org/extensions',
		summary: payload.title,
		themeColor: 'e8df00',
		title: payload.title,
		text: payload.message
	};
	if (payload.link) {
		card.potentialAction = [
			{
				'@type': 'OpenUri',
				name: 'Voir dans Mycelium',
				targets: [{ os: 'default', uri: payload.link }]
			}
		];
	}
	return card;
}

async function sendWebhook(url: string, body: object): Promise<void> {
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`WEBHOOK_${res.status}: ${text.slice(0, 100)}`);
	}
}

// ─── Internal mutation: upsert ────────────────────────────────────────────────

export const upsertCommsIntegration = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		userId: v.string(),
		provider: v.union(v.literal('slack'), v.literal('teams')),
		encryptedWebhookUrl: v.string(),
		label: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, { organizationId, userId, provider, encryptedWebhookUrl, label }) => {
		const existing = await ctx.db
			.query('commsIntegrations')
			.withIndex('by_org_and_provider', (q) =>
				q.eq('organizationId', organizationId).eq('provider', provider)
			)
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				encryptedWebhookUrl,
				label,
				isActive: true,
				lastError: undefined,
				lastUsedAt: undefined
			});
		} else {
			await ctx.db.insert('commsIntegrations', {
				organizationId,
				provider,
				encryptedWebhookUrl,
				label,
				isActive: true,
				connectedBy: userId,
				connectedAt: Date.now()
			});
		}
		return null;
	}
});

// ─── Public action: connect ───────────────────────────────────────────────────

export const connectCommsProvider = action({
	args: {
		provider: v.union(v.literal('slack'), v.literal('teams')),
		webhookUrl: v.string(),
		label: v.optional(v.string())
	},
	handler: async (ctx, { provider, webhookUrl, label }) => {
		const user = await authComponent.getAuthUser(ctx as any);
		if (!user) throw new ConvexError('Non authentifié');

		const orgProfile = await ctx.runQuery(internal.integrations.accounting.getUserOrgForAction, {
			userId: user._id
		});
		if (!orgProfile?.isAdmin) throw new ConvexError('Accès réservé aux administrateurs');

		const trimmed = webhookUrl.trim();
		validateWebhookUrl(provider, trimmed);

		// Test the webhook with a real message before storing
		const testPayload: CommsPayload = {
			title: 'Mycelium Fleet OS connecté',
			message:
				provider === 'slack'
					? 'Votre workspace Slack est maintenant connecté. Vous recevrez les alertes flotte ici.'
					: 'Votre canal Teams est maintenant connecté. Vous recevrez les alertes flotte ici.',
			type: 'TEST'
		};

		try {
			const body =
				provider === 'slack' ? buildSlackMessage(testPayload) : buildTeamsMessage(testPayload);
			await sendWebhook(trimmed, body);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Webhook inaccessible';
			throw new ConvexError(`Test de connexion échoué : ${msg}`);
		}

		const encKey = requireEncryptionKey();
		const encrypted = await encryptToken(trimmed, encKey);

		await ctx.runMutation(internal.comms.upsertCommsIntegration, {
			organizationId: orgProfile.organizationId,
			userId: user._id,
			provider,
			encryptedWebhookUrl: encrypted,
			label
		});
	}
});

// ─── Public queries ───────────────────────────────────────────────────────────

export const getMyCommsIntegrations = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		return ctx.db
			.query('commsIntegrations')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
	}
});

// ─── Public mutation: disconnect ──────────────────────────────────────────────

export const disconnectCommsProvider = authedMutation({
	args: { provider: v.union(v.literal('slack'), v.literal('teams')) },
	returns: v.null(),
	handler: async (ctx, { provider }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const existing = await ctx.db
			.query('commsIntegrations')
			.withIndex('by_org_and_provider', (q) =>
				q.eq('organizationId', organizationId).eq('provider', provider)
			)
			.first();

		if (existing) await ctx.db.delete(existing._id);
		return null;
	}
});

// ─── Internal: list active channels for an org ────────────────────────────────

export const listActiveCommsForOrg = internalQuery({
	args: { organizationId: v.id('organizations') },
	returns: v.array(
		v.object({
			_id: v.id('commsIntegrations'),
			provider: v.union(v.literal('slack'), v.literal('teams')),
			encryptedWebhookUrl: v.string(),
			label: v.optional(v.string()),
			isActive: v.boolean()
		})
	),
	handler: async (ctx, { organizationId }) => {
		const all = await ctx.db
			.query('commsIntegrations')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		return all
			.filter((c) => c.isActive)
			.map((c) => ({
				_id: c._id,
				provider: c.provider,
				encryptedWebhookUrl: c.encryptedWebhookUrl,
				label: c.label,
				isActive: c.isActive
			}));
	}
});

// ─── Internal mutation: mark last used / error ────────────────────────────────

export const markCommsResult = internalMutation({
	args: {
		integrationId: v.id('commsIntegrations'),
		error: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, { integrationId, error }) => {
		await ctx.db.patch(integrationId, {
			lastUsedAt: Date.now(),
			lastError: error
		});
		return null;
	}
});

// ─── Internal action: fan-out to all active channels ─────────────────────────

// Admin-relevant notification types that warrant a channel alert
const COMMS_ALERT_TYPES = new Set([
	'MAINTENANCE_DUE',
	'LEASE_EXPIRING',
	'LICENSE_EXPIRING',
	'LICENSE_EXPIRED',
	'VIOLATION_RECEIVED',
	'CONFLICT_DETECTED'
]);

export const sendCommsNotification = internalAction({
	args: {
		organizationId: v.id('organizations'),
		type: v.string(),
		title: v.string(),
		message: v.string(),
		link: v.optional(v.string())
	},
	handler: async (ctx, { organizationId, type, title, message, link }) => {
		if (!COMMS_ALERT_TYPES.has(type)) return;

		const channels = await ctx.runQuery(internal.comms.listActiveCommsForOrg, { organizationId });
		if (!channels.length) return;

		const encKey = process.env.ACCOUNTING_ENCRYPTION_KEY;
		if (!encKey) return; // no-op in dev without key

		const payload: CommsPayload = { title, message, type, link };

		await Promise.allSettled(
			channels.map(async (ch) => {
				try {
					const url = await decryptToken(ch.encryptedWebhookUrl, encKey);
					const body =
						ch.provider === 'slack' ? buildSlackMessage(payload) : buildTeamsMessage(payload);
					await sendWebhook(url, body);
					await ctx.runMutation(internal.comms.markCommsResult, {
						integrationId: ch._id,
						error: undefined
					});
				} catch (err) {
					const msg = err instanceof Error ? err.message : 'Unknown error';
					await ctx.runMutation(internal.comms.markCommsResult, {
						integrationId: ch._id,
						error: msg
					});
				}
			})
		);
	}
});
