import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import { authedQuery, authedMutation } from '../functions';

// ─── Encryption helpers (Web Crypto — disponible dans actions Convex) ─────────

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
	const key = process.env.GOOGLE_ENCRYPTION_KEY;
	if (!key) throw new Error('[integrations/google] GOOGLE_ENCRYPTION_KEY not set');
	return key;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const getGoogleCalendarStatus = authedQuery({
	args: {},
	handler: async (ctx) => {
		const integration = await ctx.db
			.query('userIntegrations')
			.withIndex('by_user_and_type', (q) =>
				q.eq('userId', ctx.user._id).eq('type', 'google_calendar')
			)
			.unique();
		return {
			connected: !!integration,
			calendarId: integration?.calendarId
		};
	}
});

export const storeGoogleTokens = authedMutation({
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
				q.eq('userId', ctx.user._id).eq('type', 'google_calendar')
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
				type: 'google_calendar',
				encryptedAccessToken: args.encryptedAccessToken,
				encryptedRefreshToken: args.encryptedRefreshToken,
				accessTokenExpiresAt: args.accessTokenExpiresAt,
				calendarId: 'primary',
				createdAt: now,
				updatedAt: now
			});
		}
		return null;
	}
});

export const disconnectGoogleCalendar = authedMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const integration = await ctx.db
			.query('userIntegrations')
			.withIndex('by_user_and_type', (q) =>
				q.eq('userId', ctx.user._id).eq('type', 'google_calendar')
			)
			.unique();
		if (integration) {
			await ctx.db.delete(integration._id);
		}
		return null;
	}
});

// ─── Internal helpers (queries for action use) ────────────────────────────────

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
			googleCalendarEventId: reservation.googleCalendarEventId,
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
				q.eq('userId', userId).eq('type', 'google_calendar')
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
		googleCalendarEventId: v.string()
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await ctx.db.patch(args.reservationId, {
			googleCalendarEventId: args.googleCalendarEventId
		});
		return null;
	}
});

// ─── Sync action (HTTP calls vers Google Calendar API) ────────────────────────

export const syncCalendarEvent = internalAction({
	args: {
		reservationId: v.id('reservations'),
		action: v.union(v.literal('create'), v.literal('delete'))
	},
	returns: v.null(),
	handler: async (ctx, { reservationId, action }) => {
		const reservation = await ctx.runQuery(
			internal.integrations.google.getReservationForSync,
			{ reservationId }
		);
		if (!reservation) return null;

		const integration = await ctx.runQuery(internal.integrations.google.getUserIntegration, {
			userId: reservation.userId
		});
		if (!integration) return null; // user pas connecté, no-op silencieux

		const encryptionKey = requireEncryptionKey();

		let accessToken = await decryptToken(integration.encryptedAccessToken, encryptionKey);

		// Refresh si le token est expiré (ou expire dans moins de 60s)
		if (integration.accessTokenExpiresAt < Date.now() + 60_000) {
			const refreshToken = await decryptToken(integration.encryptedRefreshToken, encryptionKey);
			const clientId = process.env.GOOGLE_CLIENT_ID;
			const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
			if (!clientId || !clientSecret) {
				console.error('[google] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set');
				return null;
			}

			const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					client_id: clientId,
					client_secret: clientSecret,
					refresh_token: refreshToken,
					grant_type: 'refresh_token'
				})
			});
			const refreshData = (await refreshRes.json()) as {
				access_token?: string;
				expires_in?: number;
				error?: string;
			};
			if (!refreshRes.ok || !refreshData.access_token) {
				console.error('[google] Token refresh failed:', refreshData.error);
				return null;
			}
			accessToken = refreshData.access_token;
			const encryptedNew = await encryptToken(accessToken, encryptionKey);
			await ctx.runMutation(internal.integrations.google.updateTokens, {
				integrationId: integration._id,
				encryptedAccessToken: encryptedNew,
				accessTokenExpiresAt: Date.now() + (refreshData.expires_in ?? 3600) * 1000
			});
		}

		const calendarId = encodeURIComponent(integration.calendarId);
		const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;

		if (action === 'create') {
			const eventBody = {
				summary: `${reservation.vehicleBrand} ${reservation.vehicleModel} — ${reservation.purpose}`,
				description: [
					'Réservation Mycelium Fleet OS',
					`Immatriculation : ${reservation.vehicleRegistration}`,
					reservation.vehicleLocation ? `Lieu : ${reservation.vehicleLocation}` : null,
					reservation.notes ? `Notes : ${reservation.notes}` : null
				]
					.filter(Boolean)
					.join('\n'),
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
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(eventBody)
			});

			if (!res.ok) {
				console.error('[google] Calendar event creation failed:', res.status, await res.text());
				return null;
			}

			const event = (await res.json()) as { id: string };
			await ctx.runMutation(internal.integrations.google.storeEventId, {
				reservationId,
				googleCalendarEventId: event.id
			});
		} else {
			const eventId = reservation.googleCalendarEventId;
			if (!eventId) return null; // pas d'event créé, no-op

			const res = await fetch(`${baseUrl}/${encodeURIComponent(eventId)}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${accessToken}` }
			});

			// 410 Gone = déjà supprimé, on ignore
			if (!res.ok && res.status !== 410 && res.status !== 404) {
				console.error('[google] Calendar event deletion failed:', res.status);
			}
		}

		return null;
	}
});
