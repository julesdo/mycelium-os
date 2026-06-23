import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
	const clientId = env.MICROSOFT_CLIENT_ID;
	if (!clientId) {
		return new Response('MICROSOFT_CLIENT_ID not configured', { status: 500 });
	}

	const state = crypto.randomUUID();
	cookies.set('ms_oauth_state', state, {
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 600,
		path: '/'
	});

	const siteUrl = env.SITE_URL ?? url.origin;
	const redirectUri = `${siteUrl}/api/microsoft-calendar/callback`;

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access',
		response_mode: 'query',
		state
	});

	redirect(302, `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`);
};
