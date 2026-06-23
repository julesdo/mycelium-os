import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
	const clientId = env.QB_CLIENT_ID;
	if (!clientId) return new Response('QuickBooks not configured', { status: 500 });

	const state = crypto.randomUUID();
	cookies.set('qb_oauth_state', state, { path: '/', httpOnly: true, maxAge: 600, sameSite: 'lax' });

	const siteUrl = env.SITE_URL ?? url.origin;
	const redirectUri = `${siteUrl}/api/quickbooks/callback`;

	const params = new URLSearchParams({
		client_id: clientId,
		scope: 'com.intuit.quickbooks.accounting',
		redirect_uri: redirectUri,
		response_type: 'code',
		state
	});

	redirect(302, `https://appcenter.intuit.com/connect/oauth2?${params}`);
};
