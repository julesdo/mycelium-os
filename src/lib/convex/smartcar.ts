/**
 * Smartcar integration — zero-hardware telemetry via per-vehicle OAuth (v3 M2M).
 * Each vehicle is connected individually via Smartcar Connect.
 * Sync uses M2M client_credentials token + stored smartcarVehicleId.
 */

import { v } from 'convex/values';
import {
	internalMutation,
	internalAction,
	internalQuery,
	mutation,
	httpAction,
} from './_generated/server';
import { internal } from './_generated/api';
import { authedMutation, authedQuery } from './functions';
import { getUserOrg } from './lib/auth';
import type { Id } from './_generated/dataModel';

// ─── M2M token (v3) ───────────────────────────────────────────────────────────

async function getM2MToken(): Promise<string> {
	const clientId = process.env.SMARTCAR_CLIENT_ID!;
	const clientSecret = process.env.SMARTCAR_CLIENT_SECRET!;

	const res = await fetch('https://iam.smartcar.com/oauth2/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: clientId,
			client_secret: clientSecret,
		}).toString(),
	});
	if (!res.ok) throw new Error(`Smartcar M2M token failed: ${await res.text()}`);
	const data = await res.json() as { access_token: string };
	return data.access_token;
}

async function smartcarRequest(
	path: string,
	token: string,
	userId?: string,
): Promise<unknown> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`,
	};
	if (userId) headers['sc-user-id'] = userId;

	const base = 'https://vehicle.api.smartcar.com';
	const res = await fetch(`${base}${path}`, { headers });
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Smartcar ${path} → ${res.status}: ${text}`);
	}
	return res.json();
}

type SmartcarConnection = {
	attributes: { vehicle: { make: string; model: string; year: number } };
	relationships: { vehicle: { data: { id: string } } };
};

async function getConnections(token: string, userId: string): Promise<SmartcarConnection[]> {
	const mode = process.env.SMARTCAR_MODE ?? 'simulated';
	const params = new URLSearchParams({ 'filter[userId]': userId, 'filter[vehicle.mode]': mode });
	const data = await smartcarRequest(`/v3/connections?${params}`, token) as {
		data: SmartcarConnection[];
	};
	return data.data;
}

async function subscribeVehicleToWebhook(
	smartcarVehicleId: string,
	webhookId: string,
	token: string,
	userId: string,
): Promise<void> {
	const res = await fetch('https://management.api.smartcar.com/v3/subscriptions', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({
			data: {
				attributes: {
					webhookId,
					userId,
					vehicleId: smartcarVehicleId,
				},
			},
		}),
	});
	if (!res.ok && res.status !== 409) {
		const text = await res.text();
		throw new Error(`Smartcar webhook subscribe failed (${res.status}): ${text}`);
	}
}

// ─── Per-vehicle connect (called from OAuth callback) ─────────────────────────

export const connectVehicleToSmartcar = authedMutation({
	args: {
		vehicleId: v.id('vehicles'),
		scVehicleId: v.string(),
		smartcarUserId: v.string(),
	},
	handler: async (ctx, args) => {
		const { organizationId } = await getUserOrg(ctx);

		const vehicle = await ctx.db.get(args.vehicleId);
		if (!vehicle || vehicle.organizationId !== organizationId) {
			throw new Error('vehicle_not_found');
		}

		// Cross-org isolation: ensure no other Mycelium vehicle already holds this SC ID
		const conflict = await ctx.db
			.query('vehicles')
			.withIndex('by_smartcar', (q) => q.eq('smartcarVehicleId', args.scVehicleId))
			.first();
		if (conflict && conflict._id !== args.vehicleId) {
			throw new Error('already_linked');
		}

		await ctx.db.patch(args.vehicleId, {
			smartcarVehicleId: args.scVehicleId,
			smartcarUserId: args.smartcarUserId,
		});
	},
});

export const unlinkVehicleFromSmartcar = authedMutation({
	args: { vehicleId: v.id('vehicles') },
	handler: async (ctx, args) => {
		const { organizationId } = await getUserOrg(ctx);
		const vehicle = await ctx.db.get(args.vehicleId);
		if (!vehicle || vehicle.organizationId !== organizationId) {
			throw new Error('vehicle_not_found');
		}
		await ctx.db.patch(args.vehicleId, {
			smartcarVehicleId: undefined,
			smartcarUserId: undefined,
			smartcarOdometer: undefined,
			smartcarBatteryPercent: undefined,
			smartcarBatteryRange: undefined,
			smartcarLatitude: undefined,
			smartcarLongitude: undefined,
			smartcarLastSync: undefined,
		});
	},
});

// ─── Manual sync triggers ──────────────────────────────────────────────────────

// Sync a single vehicle (post-connect or manual refresh from vehicle detail page)
export const scheduleSyncForVehicle = authedMutation({
	args: { vehicleId: v.id('vehicles') },
	handler: async (ctx, args) => {
		const { organizationId } = await getUserOrg(ctx);
		const vehicle = await ctx.db.get(args.vehicleId);
		if (!vehicle || vehicle.organizationId !== organizationId) {
			throw new Error('vehicle_not_found');
		}
		if (!vehicle.smartcarVehicleId) throw new Error('not_linked');

		await ctx.scheduler.runAfter(0, internal.smartcar.syncVehicleInternal, {
			vehicleId: args.vehicleId,
			smartcarVehicleId: vehicle.smartcarVehicleId,
			smartcarUserId: vehicle.smartcarUserId,
		});
	},
});

// Sync all connected vehicles in the org
export const triggerSmartcarSync = authedMutation({
	args: {},
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		await ctx.scheduler.runAfter(0, internal.smartcar.syncOrgInternal, { organizationId });
	},
});

// ─── Internal sync logic (v3 M2M) ─────────────────────────────────────────────

export const syncVehicleInternal = internalAction({
	args: {
		vehicleId: v.id('vehicles'),
		smartcarVehicleId: v.string(),
		smartcarUserId: v.optional(v.string()),
	},
	handler: async (ctx, { vehicleId, smartcarVehicleId, smartcarUserId }) => {
		const token = await getM2MToken();

		type V3Wrap<T> = { data?: { attributes?: T } } & T;

		const [odoData, battData, locData] = await Promise.all([
			smartcarRequest(`/v3/vehicles/${smartcarVehicleId}/odometer`, token, smartcarUserId)
				.catch(() => null) as Promise<V3Wrap<{ distance?: number }> | null>,
			smartcarRequest(`/v3/vehicles/${smartcarVehicleId}/battery`, token, smartcarUserId)
				.catch(() => null) as Promise<V3Wrap<{ percentRemaining?: number; range?: number }> | null>,
			smartcarRequest(`/v3/vehicles/${smartcarVehicleId}/location`, token, smartcarUserId)
				.catch(() => null) as Promise<V3Wrap<{ latitude?: number; longitude?: number }> | null>,
		]);

		const getField = <T extends object, K extends keyof T>(
			res: (V3Wrap<T> & Record<string, unknown>) | null,
			key: K
		): T[K] | undefined =>
			(res?.data?.attributes?.[key] ?? res?.[key as string]) as T[K] | undefined;

		const distance = odoData ? getField(odoData, 'distance') : undefined;
		const percentRemaining = battData ? getField(battData, 'percentRemaining') : undefined;
		const range = battData ? getField(battData, 'range') : undefined;
		const latitude = locData ? getField(locData, 'latitude') : undefined;
		const longitude = locData ? getField(locData, 'longitude') : undefined;

		await ctx.runMutation(internal.smartcar.patchVehicleTelemetry, {
			vehicleId,
			smartcarVehicleId,
			odometer: distance !== undefined ? Math.round(distance) : undefined,
			batteryPercent: percentRemaining !== undefined ? Math.round(percentRemaining * 100) : undefined,
			batteryRange: range !== undefined ? Math.round(range) : undefined,
			latitude,
			longitude,
		});
	},
});

export const syncOrgInternal = internalAction({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const orgVehicles = await ctx.runQuery(internal.smartcar.listOrgVehiclesInternal, { organizationId });
		const connected = orgVehicles.filter((v) => v.smartcarVehicleId);

		for (const vehicle of connected) {
			try {
				await ctx.runAction(internal.smartcar.syncVehicleInternal, {
					vehicleId: vehicle._id,
					smartcarVehicleId: vehicle.smartcarVehicleId!,
					smartcarUserId: vehicle.smartcarUserId,
				});
			} catch {
				// Skip on error, continue with others
			}
		}
	},
});

export const syncSmartcarForAllOrgs = internalAction({
	args: {},
	handler: async (ctx) => {
		const orgIds = await ctx.runQuery(internal.smartcar.getAllConnectedOrgIdsInternal, {});
		for (const organizationId of orgIds) {
			await ctx.runAction(internal.smartcar.syncOrgInternal, { organizationId });
		}
	},
});

// ─── Internal queries ──────────────────────────────────────────────────────────

export const getAllConnectedOrgIdsInternal = internalQuery({
	args: {},
	handler: async (ctx) => {
		// Collect all vehicles with smartcarVehicleId set, extract distinct org IDs
		const vehicles = await ctx.db.query('vehicles').collect();
		const orgIds = new Set<Id<'organizations'>>();
		for (const vehicle of vehicles) {
			if (vehicle.smartcarVehicleId) orgIds.add(vehicle.organizationId);
		}
		return Array.from(orgIds);
	},
});

export const listOrgVehiclesInternal = internalQuery({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		return await ctx.db
			.query('vehicles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
	},
});

// ─── Internal telemetry mutations ──────────────────────────────────────────────

export const patchVehicleTelemetry = internalMutation({
	args: {
		vehicleId: v.id('vehicles'),
		smartcarVehicleId: v.string(),
		odometer: v.optional(v.number()),
		batteryPercent: v.optional(v.number()),
		batteryRange: v.optional(v.number()),
		latitude: v.optional(v.number()),
		longitude: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const { vehicleId, ...telemetry } = args;
		await ctx.db.patch(vehicleId, {
			smartcarVehicleId: telemetry.smartcarVehicleId,
			smartcarOdometer: telemetry.odometer,
			smartcarBatteryPercent: telemetry.batteryPercent,
			smartcarBatteryRange: telemetry.batteryRange,
			smartcarLatitude: telemetry.latitude,
			smartcarLongitude: telemetry.longitude,
			smartcarLastSync: Date.now(),
			...(telemetry.odometer ? { kilometers: telemetry.odometer } : {}),
		});
	},
});

export const patchVehicleTelemetryBySmartcarId = internalMutation({
	args: {
		smartcarVehicleId: v.string(),
		odometer: v.optional(v.number()),
		batteryPercent: v.optional(v.number()),
		batteryRange: v.optional(v.number()),
		latitude: v.optional(v.number()),
		longitude: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const vehicle = await ctx.db
			.query('vehicles')
			.withIndex('by_smartcar', (q) => q.eq('smartcarVehicleId', args.smartcarVehicleId))
			.first();
		if (!vehicle) return;

		await ctx.db.patch(vehicle._id, {
			smartcarOdometer: args.odometer ?? vehicle.smartcarOdometer,
			smartcarBatteryPercent: args.batteryPercent ?? vehicle.smartcarBatteryPercent,
			smartcarBatteryRange: args.batteryRange ?? vehicle.smartcarBatteryRange,
			smartcarLatitude: args.latitude ?? vehicle.smartcarLatitude,
			smartcarLongitude: args.longitude ?? vehicle.smartcarLongitude,
			smartcarLastSync: Date.now(),
			...(args.odometer ? { kilometers: args.odometer } : {}),
		});
	},
});

// ─── Webhook handler ───────────────────────────────────────────────────────────

export const handleSmartcarWebhook = httpAction(async (ctx, req) => {
	const rawBody = await req.text();

	const token = process.env.SMARTCAR_APP_MANAGEMENT_TOKEN;
	if (!token) {
		return new Response('Webhook not configured', { status: 500 });
	}

	const encoder = new TextEncoder();

	let body: {
		eventId: string;
		eventType: 'VERIFY' | 'VEHICLE_STATE' | 'VEHICLE_ERROR';
		vehicleId?: string;
		data: Record<string, unknown>;
	};
	try {
		body = JSON.parse(rawBody);
	} catch {
		return new Response('Bad Request', { status: 400 });
	}

	// One-time verification challenge
	if (body.eventType === 'VERIFY') {
		const challenge = (body.data as { challenge: string }).challenge;
		const key = await crypto.subtle.importKey(
			'raw',
			encoder.encode(token),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);
		const hmacBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(challenge));
		const hmac = Array.from(new Uint8Array(hmacBytes))
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');
		return new Response(JSON.stringify({ challenge: hmac }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// Verify SC-Signature for all other events
	const signature = req.headers.get('sc-signature') ?? req.headers.get('SC-Signature') ?? '';
	const sigKey = await crypto.subtle.importKey(
		'raw',
		encoder.encode(token),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sigBytes = await crypto.subtle.sign('HMAC', sigKey, encoder.encode(rawBody));
	const expected = Array.from(new Uint8Array(sigBytes))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	if (expected !== signature) {
		return new Response('Unauthorized', { status: 401 });
	}

	// Push telemetry from VEHICLE_STATE
	if (body.eventType === 'VEHICLE_STATE' && body.vehicleId) {
		type Signal = { code: string; body: Record<string, unknown> };
		const signals: Signal[] = (body.data as { signals?: Signal[] }).signals ?? [];

		const sig = (code: string) => signals.find((s) => s.code === code)?.body;

		const locBody  = sig('location-preciselocation');
		const odoBody  = sig('odometer');
		const battBody = sig('battery-state-of-charge') ?? sig('battery');

		await ctx.runMutation(internal.smartcar.patchVehicleTelemetryBySmartcarId, {
			smartcarVehicleId: body.vehicleId,
			odometer: odoBody?.value !== undefined ? Math.round(Number(odoBody.value)) : undefined,
			batteryPercent: battBody?.value !== undefined ? Math.round(Number(battBody.value) * 100) : undefined,
			batteryRange: battBody?.range !== undefined ? Math.round(Number(battBody.range)) : undefined,
			latitude: locBody?.latitude !== undefined ? Number(locBody.latitude) : undefined,
			longitude: locBody?.longitude !== undefined ? Number(locBody.longitude) : undefined,
		});
	}

	return new Response(null, { status: 200 });
});
