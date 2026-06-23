import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createServerConvexHttpClient } from '$lib/server/convex-http';
import { api } from '$lib/convex/_generated/api';
import type { RequestHandler } from './$types';

function getJwtToken(
	cookies: { get: (n: string) => string | undefined },
	request: Request
): string | undefined {
	const isSecure = new URL(request.url).protocol === 'https:';
	return cookies.get(
		isSecure ? '__Secure-better-auth.convex_jwt' : 'better-auth.convex_jwt'
	);
}

async function getM2MToken(): Promise<string> {
	const res = await fetch('https://iam.smartcar.com/oauth2/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: env.SMARTCAR_CLIENT_ID!,
			client_secret: env.SMARTCAR_CLIENT_SECRET!,
		}).toString(),
	});
	if (!res.ok) throw new Error(`Smartcar M2M token failed: ${await res.text()}`);
	const data = await res.json() as { access_token: string };
	return data.access_token;
}

type ScConnection = {
	attributes: { vehicle: { make: string; model: string; year: number } };
	relationships: { vehicle: { data: { id: string } } };
};

async function getConnectionsForUser(token: string, userId: string): Promise<ScConnection[]> {
	const mode = env.SMARTCAR_MODE ?? 'simulated';
	const params = new URLSearchParams({ 'filter[userId]': userId, 'filter[vehicle.mode]': mode });
	const res = await fetch(`https://vehicle.api.smartcar.com/v3/connections?${params}`, {
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
	});
	if (!res.ok) throw new Error(`SC connections failed: ${res.status}`);
	const data = await res.json() as { data: ScConnection[] };
	return data.data;
}

async function getVehicleVin(token: string, scVehicleId: string, userId: string): Promise<string> {
	const res = await fetch(`https://vehicle.api.smartcar.com/v3/vehicles/${scVehicleId}/vin`, {
		headers: { Authorization: `Bearer ${token}`, 'sc-user-id': userId },
	});
	if (!res.ok) return '';
	const data = await res.json() as { data?: { attributes?: { vin?: string } }; vin?: string };
	return data?.data?.attributes?.vin ?? data?.vin ?? '';
}

async function subscribeToWebhook(token: string, scVehicleId: string, userId: string): Promise<void> {
	const webhookId = env.SMARTCAR_WEBHOOK_ID;
	if (!webhookId) return;
	const res = await fetch('https://management.api.smartcar.com/v3/subscriptions', {
		method: 'POST',
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({
			data: { attributes: { webhookId, userId, vehicleId: scVehicleId } },
		}),
	});
	// 202 = in progress, 409 = already subscribed — both are fine
	if (!res.ok && res.status !== 409) {
		console.error(`[smartcar] webhook sub failed: ${res.status}`);
	}
}

export const GET: RequestHandler = async ({ url, cookies, request }) => {
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');
	const userId = url.searchParams.get('user_id') ?? url.searchParams.get('smartcar_user_id');

	// Read and delete state cookie
	const rawCookie = cookies.get('smartcar_vehicle_state');
	cookies.delete('smartcar_vehicle_state', { path: '/' });

	// Decode state cookie
	let vehicleId: string | undefined;
	let nonce: string | undefined;
	if (rawCookie) {
		try {
			const decoded = JSON.parse(atob(rawCookie)) as { vehicleId: string; nonce: string };
			vehicleId = decoded.vehicleId;
			nonce = decoded.nonce;
		} catch {
			// Invalid cookie
		}
	}

	// Fallback redirect if we can't find vehicleId
	const fallback = vehicleId ? `/admin/fleet/${vehicleId}` : '/admin/fleet';

	if (error) redirect(302, `${fallback}?smartcar=error`);
	if (!state || !nonce || state !== nonce) redirect(302, `${fallback}?smartcar=error`);
	if (!vehicleId) redirect(302, '/admin/fleet?smartcar=error');
	if (!userId) redirect(302, `${fallback}?smartcar=error`);

	const jwtToken = getJwtToken(cookies, request);
	if (!jwtToken) redirect(302, `/signin?redirectTo=/admin/fleet/${vehicleId}`);

	const convex = createServerConvexHttpClient({ token: jwtToken });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const anyConvex = convex as any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const anyApi = api as any;

	// Fetch the Mycelium vehicle to get its VIN
	let vehicleVin: string | undefined;
	try {
		const vehicle = await anyConvex.query(anyApi.vehicles.getVehicle, { vehicleId });
		vehicleVin = vehicle?.vin?.toUpperCase().trim();
	} catch {
		redirect(302, `${fallback}?smartcar=error`);
	}

	if (!vehicleVin) redirect(302, `/admin/fleet/${vehicleId}?smartcar=no_vin`);

	// Fetch SC vehicles for this user and find VIN match
	let matchedScVehicleId: string | undefined;
	let m2mToken: string;
	const isSimulated = (env.SMARTCAR_MODE ?? 'simulated') === 'simulated';
	try {
		m2mToken = await getM2MToken();
		const connections = await getConnectionsForUser(m2mToken, userId);

		if (isSimulated && connections.length > 0) {
			// In simulated mode, Smartcar assigns fake VINs that never match real records.
			// Accept the first connection so local testing works end-to-end.
			matchedScVehicleId = connections[0].relationships.vehicle.data.id;
		} else {
			for (const conn of connections) {
				const scVehicleId = conn.relationships.vehicle.data.id;
				const vin = (await getVehicleVin(m2mToken, scVehicleId, userId)).toUpperCase().trim();
				if (vin && vin === vehicleVin) {
					matchedScVehicleId = scVehicleId;
					break;
				}
			}
		}
	} catch {
		redirect(302, `/admin/fleet/${vehicleId}?smartcar=error`);
	}

	if (!matchedScVehicleId) redirect(302, `/admin/fleet/${vehicleId}?smartcar=no_match`);

	// Link vehicle in Convex (with cross-org isolation check)
	try {
		await anyConvex.mutation(anyApi.smartcar.connectVehicleToSmartcar, {
			vehicleId,
			scVehicleId: matchedScVehicleId,
			smartcarUserId: userId,
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (msg.includes('already_linked')) {
			redirect(302, `/admin/fleet/${vehicleId}?smartcar=already_linked`);
		}
		redirect(302, `/admin/fleet/${vehicleId}?smartcar=error`);
	}

	// Subscribe to webhook and schedule immediate sync (fire-and-forget)
	try {
		await subscribeToWebhook(m2mToken!, matchedScVehicleId, userId);
	} catch {
		// Non-blocking
	}

	try {
		await anyConvex.mutation(anyApi.smartcar.scheduleSyncForVehicle, { vehicleId });
	} catch {
		// Non-blocking — vehicle is linked, sync will happen on next cron
	}

	redirect(302, `/admin/fleet/${vehicleId}?smartcar=connected`);
};
