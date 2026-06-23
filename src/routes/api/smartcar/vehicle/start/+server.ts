import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
	const vehicleId = url.searchParams.get('vehicleId');
	if (!vehicleId) error(400, 'vehicleId requis');

	const applicationId = env.SMARTCAR_APPLICATION_ID;
	if (!applicationId) redirect(302, `/admin/fleet/${vehicleId}?smartcar=error`);

	const nonce = crypto.randomUUID();
	const statePayload = JSON.stringify({ vehicleId, nonce });
	const stateCookie = btoa(statePayload);

	cookies.set('smartcar_vehicle_state', stateCookie, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 600,
	});

	const redirectUri = `${url.origin}/api/smartcar/vehicle/callback`;
	const scope = [
		'required:read_odometer',
		'required:read_vin',
		'read_battery',
		'read_location',
	].join(' ');

	const mode = env.SMARTCAR_MODE ?? 'simulated';

	const params = new URLSearchParams({
		response_type: 'code',
		application_id: applicationId,
		redirect_uri: redirectUri,
		scope,
		state: nonce,
		mode,
	});

	redirect(302, `https://connect.smartcar.com/oauth/authorize?${params}`);
};
