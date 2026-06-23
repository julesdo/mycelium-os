import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import { authedQuery, authedMutation } from '../functions';

// ─── Encryption helpers (Web Crypto) ─────────────────────────────────────────

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
	const key = process.env.MICROSOFT_ENCRYPTION_KEY ?? process.env.GOOGLE_ENCRYPTION_KEY;
	if (!key) throw new Error('[integrations/microsoft] MICROSOFT_ENCRYPTION_KEY not set');
	return key;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const getMicrosoftCalendarStatus = authedQuery({
	args: {},
	handler: async (ctx) => {
		const integration = await ctx.db
			.query('userIntegrations')
			.withIndex('by_user_and_type', (q) =>
				q.eq('userId', ctx.user._id).eq('type', 'microsoft_calendar')
			)
			.unique();
		return { connected: !!integration };
	}
});

export const storeMicrosoftTokens = authedMutation({
	args: {
		encryptedAccessToken: v.string(),
		encryptedRefreshToken: v.string(),
		accessTokenExpiresAt: v.number()
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query('userIntegrations')
			.withIndex('by_user_and_type', (q) =>
				q.eq('userId', ctx.user._id).eq('type', 'microsoft_calendar')
			)
			.unique();

		const now = Date.now();
		if (existing) {
			await ctx.db.patch(existing._id, {
				encryptedAccessToken: args.encryptedAccessToken,
				encryptedRefreshToken: args.encryptedRefreshToken,
				accessTokenExpiresAt: args.accessTokenExpiresAt,
				updatedAt: now
			});
		} else {
			await ctx.db.insert('userIntegrations', {
				userId: ctx.user._id,
				type: 'microsoft_calendar',
				encryptedAccessToken: args.encryptedAccessToken,
				encryptedRefreshToken: args.encryptedRefreshToken,
				accessTokenExpiresAt: args.accessTokenExpiresAt,
				calendarId: 'default',
				createdAt: now,
				updatedAt: now
			});
		}
		return null;
	}
});

export const disconnectMicrosoftCalendar = authedMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const integration = await ctx.db
			.query('userIntegrations')
			.withIndex('by_user_and_type', (q) =>
				q.eq('userId', ctx.user._id).eq('type', 'microsoft_calendar')
			)
			.unique();
		if (integration) {
			await ctx.db.delete(integration._id);
		}
		return null;
	}
});

// ─── Internal helpers ─────────────────────────────────────────────────────────

export const getReservationForSync = internalQuery({
	args: { reservationId: v.id('reservations') },
	handler: async (ctx, { reservationId }) => {
		const reservation = await ctx.db.get(reservationId);
		if (!reservation) return null;
		const vehicle = await ctx.db.get(reservation.vehicleId);
		return {
			_id: reservation._id,
			userId: reservation.userId,
			startDate: reservation.startDate,
			endDate: reservation.endDate,
			purpose: reservation.purpose,
			notes: reservation.notes,
			microsoftCalendarEventId: reservation.microsoftCalendarEventId,
			vehicleBrand: vehicle?.brand ?? '',
			vehicleModel: vehicle?.model ?? '',
			vehicleRegistration: vehicle?.registration ?? '',
			vehicleLocation: vehicle?.location ?? null
		};
	}
});

export const getUserIntegration = internalQuery({
	args: { userId: v.string() },
	handler: async (ctx, { userId }) => {
		return ctx.db
			.query('userIntegrations')
			.withIndex('by_user_and_type', (q) =>
				q.eq('userId', userId).eq('type', 'microsoft_calendar')
			)
			.unique();
	}
});

export const updateTokens = internalMutation({
	args: {
		integrationId: v.id('userIntegrations'),
		encryptedAccessToken: v.string(),
		accessTokenExpiresAt: v.number()
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.integrationId, {
			encryptedAccessToken: args.encryptedAccessToken,
			accessTokenExpiresAt: args.accessTokenExpiresAt,
			updatedAt: Date.now()
		});
		return null;
	}
});

export const storeEventId = internalMutation({
	args: {
		reservationId: v.id('reservations'),
		microsoftCalendarEventId: v.string()
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.reservationId, {
			microsoftCalendarEventId: args.microsoftCalendarEventId
		});
		return null;
	}
});

// ─── Sync action (Microsoft Graph API) ───────────────────────────────────────

export const syncCalendarEvent = internalAction({
	args: {
		reservationId: v.id('reservations'),
		action: v.union(v.literal('create'), v.literal('delete'))
	},
	returns: v.null(),
	handler: async (ctx, { reservationId, action }) => {
		const reservation = await ctx.runQuery(
			internal.integrations.microsoft.getReservationForSync,
			{ reservationId }
		);
		if (!reservation) return null;

		const integration = await ctx.runQuery(internal.integrations.microsoft.getUserIntegration, {
			userId: reservation.userId
		});
		if (!integration) return null; // user pas connecté, no-op silencieux

		const encryptionKey = requireEncryptionKey();

		let accessToken = await decryptToken(integration.encryptedAccessToken, encryptionKey);

		// Refresh si le token est expiré (ou expire dans moins de 60s)
		if (integration.accessTokenExpiresAt < Date.now() + 60_000) {
			const refreshToken = await decryptToken(integration.encryptedRefreshToken, encryptionKey);
			const clientId = process.env.MICROSOFT_CLIENT_ID;
			const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
			if (!clientId || !clientSecret) {
				console.error('[microsoft] MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET not set');
				return null;
			}

			const refreshRes = await fetch(
				'https://login.microsoftonline.com/common/oauth2/v2.0/token',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
					body: new URLSearchParams({
						client_id: clientId,
						client_secret: clientSecret,
						refresh_token: refreshToken,
						grant_type: 'refresh_token',
						scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access'
					})
				}
			);
			const refreshData = (await refreshRes.json()) as {
				access_token?: string;
				expires_in?: number;
				error?: string;
			};
			if (!refreshRes.ok || !refreshData.access_token) {
				console.error('[microsoft] Token refresh failed:', refreshData.error);
				return null;
			}
			accessToken = refreshData.access_token;
			const encryptedNew = await encryptToken(accessToken, encryptionKey);
			await ctx.runMutation(internal.integrations.microsoft.updateTokens, {
				integrationId: integration._id,
				encryptedAccessToken: encryptedNew,
				accessTokenExpiresAt: Date.now() + (refreshData.expires_in ?? 3600) * 1000
			});
		}

		const baseUrl = 'https://graph.microsoft.com/v1.0/me/events';
		const headers = {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		};

		if (action === 'create') {
			const eventBody = {
				subject: `${reservation.vehicleBrand} ${reservation.vehicleModel} — ${reservation.purpose}`,
				body: {
					contentType: 'text',
					content: [
						'Réservation Mycelium Fleet OS',
						`Immatriculation : ${reservation.vehicleRegistration}`,
						reservation.vehicleLocation ? `Lieu : ${reservation.vehicleLocation}` : null,
						reservation.notes ? `Notes : ${reservation.notes}` : null
					]
						.filter(Boolean)
						.join('\n')
				},
				start: {
					dateTime: new Date(reservation.startDate).toISOString(),
					timeZone: 'Europe/Paris'
				},
				end: {
					dateTime: new Date(reservation.endDate).toISOString(),
					timeZone: 'Europe/Paris'
				}
			};

			const res = await fetch(baseUrl, {
				method: 'POST',
				headers,
				body: JSON.stringify(eventBody)
			});

			if (!res.ok) {
				console.error('[microsoft] Calendar event creation failed:', res.status, await res.text());
				return null;
			}

			const event = (await res.json()) as { id: string };
			await ctx.runMutation(internal.integrations.microsoft.storeEventId, {
				reservationId,
				microsoftCalendarEventId: event.id
			});
		} else {
			const eventId = reservation.microsoftCalendarEventId;
			if (!eventId) return null;

			const res = await fetch(`${baseUrl}/${encodeURIComponent(eventId)}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			if (!res.ok && res.status !== 404) {
				console.error('[microsoft] Calendar event deletion failed:', res.status);
			}
		}

		return null;
	}
});
