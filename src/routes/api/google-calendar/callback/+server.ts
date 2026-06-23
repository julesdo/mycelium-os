import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createServerConvexHttpClient } from '$lib/server/convex-http';
import { api } from '$lib/convex/_generated/api';
import type { RequestHandler } from './$types';

// AES-256-GCM encryption using Web Crypto (Node.js 18+)
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

function getJwtToken(cookies: { get: (name: string) => string | undefined }, request: Request): string | undefined {
	const isSecure = new URL(request.url).protocol === 'https:';
	const cookieName = isSecure ? '__Secure-better-auth.convex_jwt' : 'better-auth.convex_jwt';
	return cookies.get(cookieName);
}

export const GET: RequestHandler = async ({ url, cookies, request }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');

	// Nettoyage du cookie dans tous les cas
	const storedState = cookies.get('gc_oauth_state');
	cookies.delete('gc_oauth_state', { path: '/' });

	if (error) {
		redirect(302, '/app/settings?tab=integrations&error=access_denied');
	}

	if (!code || !state || !storedState || state !== storedState) {
		redirect(302, '/app/settings?tab=integrations&error=invalid_state');
	}

	const clientId = env.GOOGLE_CLIENT_ID;
	const clientSecret = env.GOOGLE_CLIENT_SECRET;
	const encryptionKey = env.GOOGLE_ENCRYPTION_KEY;
	const siteUrl = env.SITE_URL ?? url.origin;

	if (!clientId || !clientSecret || !encryptionKey) {
		return new Response('Google integration not configured', { status: 500 });
	}

	// Échange code → tokens
	const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: clientId,
			client_secret: clientSecret,
			redirect_uri: `${siteUrl}/api/google-calendar/callback`,
			grant_type: 'authorization_code'
		})
	});

	if (!tokenRes.ok) {
		console.error('[google/callback] Token exchange failed:', await tokenRes.text());
		redirect(302, '/app/settings?tab=integrations&error=token_exchange');
	}

	const tokenData = (await tokenRes.json()) as {
		access_token: string;
		refresh_token?: string;
		expires_in: number;
	};

	if (!tokenData.access_token || !tokenData.refresh_token) {
		redirect(302, '/app/settings?tab=integrations&error=missing_tokens');
	}

	// Chiffrement AES-256-GCM
	const [encryptedAccessToken, encryptedRefreshToken] = await Promise.all([
		encryptToken(tokenData.access_token, encryptionKey),
		encryptToken(tokenData.refresh_token, encryptionKey)
	]);

	// Stockage via Convex (authedMutation avec le JWT de l'utilisateur connecté)
	const token = getJwtToken(cookies, request);
	if (!token) {
		redirect(302, '/signin?redirectTo=/app/settings?tab=integrations');
	}

	const convex = createServerConvexHttpClient({ token });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await (convex as any).mutation((api as any).integrations.google.storeGoogleTokens, {
		encryptedAccessToken,
		encryptedRefreshToken,
		accessTokenExpiresAt: Date.now() + tokenData.expires_in * 1000
	});

	redirect(302, '/app/settings?tab=integrations&connected=true');
};
