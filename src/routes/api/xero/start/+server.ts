import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
	const clientId = env.XERO_CLIENT_ID;
	if (!clientId) return new Response('Xero not configured', { status: 500 });

	const state = crypto.randomUUID();
	cookies.set('xero_oauth_state', state, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });

	const siteUrl = env.SITE_URL ?? url.origin;
	const redirectUri = `${siteUrl}/api/xero/callback`;

	const params = new URLSearchParams({
		response_type: 'code',
		client_id: clientId,
		redirect_uri: redirectUri,
		scope: 'accounting.transactions accounting.settings accounting.contacts offline_access',
		state
	});

	redirect(302, `https://login.xero.com/identity/connect/authorize?${params}`);
};
