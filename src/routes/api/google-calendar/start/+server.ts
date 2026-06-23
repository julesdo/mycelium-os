import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, url }) => {
	const clientId = env.GOOGLE_CLIENT_ID;
	if (!clientId) {
		return new Response('GOOGLE_CLIENT_ID not configured', { status: 500 });
	}

	const state = crypto.randomUUID();
	cookies.set('gc_oauth_state', state, {
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 600,
		path: '/'
	});

	const siteUrl = env.SITE_URL ?? url.origin;
	const redirectUri = `${siteUrl}/api/google-calendar/callback`;

	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'https://www.googleapis.com/auth/calendar',
		access_type: 'offline',
		prompt: 'consent',
		state
	});

	redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};
