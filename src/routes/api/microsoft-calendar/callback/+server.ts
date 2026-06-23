import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createServerConvexHttpClient } from '$lib/server/convex-http';
import { api } from '$lib/convex/_generated/api';
import type { RequestHandler } from './$types';

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

function getJwtToken(
	cookies: { get: (name: string) => string | undefined },
	request: Request
): string | undefined {
	const isSecure = new URL(request.url).protocol === 'https:';
	const cookieName = isSecure
		? '__Secure-better-auth.convex_jwt'
		: 'better-auth.convex_jwt';
	return cookies.get(cookieName);
}

export const GET: RequestHandler = async ({ url, cookies, request }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');

	const storedState = cookies.get('ms_oauth_state');
	cookies.delete('ms_oauth_state', { path: '/' });

	if (error) {
		redirect(302, '/app/settings?tab=integrations&ms_error=access_denied');
	}

	if (!code || !state || !storedState || state !== storedState) {
		redirect(302, '/app/settings?tab=integrations&ms_error=invalid_state');
	}

	const clientId = env.MICROSOFT_CLIENT_ID;
	const clientSecret = env.MICROSOFT_CLIENT_SECRET;
	const encryptionKey = env.MICROSOFT_ENCRYPTION_KEY ?? env.GOOGLE_ENCRYPTION_KEY;
	const siteUrl = env.SITE_URL ?? url.origin;

	if (!clientId || !clientSecret || !encryptionKey) {
		return new Response('Microsoft integration not configured', { status: 500 });
	}

	const tokenRes = await fetch(
		'https://login.microsoftonline.com/common/oauth2/v2.0/token',
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code,
				client_id: clientId,
				client_secret: clientSecret,
				redirect_uri: `${siteUrl}/api/microsoft-calendar/callback`,
				grant_type: 'authorization_code',
				scope: 'https://graph.microsoft.com/Calendars.ReadWrite offline_access'
			})
		}
	);

	if (!tokenRes.ok) {
		console.error('[microsoft/callback] Token exchange failed:', await tokenRes.text());
		redirect(302, '/app/settings?tab=integrations&ms_error=token_exchange');
	}

	const tokenData = (await tokenRes.json()) as {
		access_token: string;
		refresh_token?: string;
		expires_in: number;
	};

	if (!tokenData.access_token || !tokenData.refresh_token) {
		redirect(302, '/app/settings?tab=integrations&ms_error=missing_tokens');
	}

	const [encryptedAccessToken, encryptedRefreshToken] = await Promise.all([
		encryptToken(tokenData.access_token, encryptionKey),
		encryptToken(tokenData.refresh_token, encryptionKey)
	]);

	const token = getJwtToken(cookies, request);
	if (!token) {
		redirect(302, '/signin?redirectTo=/app/settings?tab=integrations');
	}

	const convex = createServerConvexHttpClient({ token });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await (convex as any).mutation((api as any).integrations.microsoft.storeMicrosoftTokens, {
		encryptedAccessToken,
		encryptedRefreshToken,
		accessTokenExpiresAt: Date.now() + tokenData.expires_in * 1000
	});

	redirect(302, '/app/settings?tab=integrations&ms_connected=true');
};
