import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createServerConvexHttpClient } from '$lib/server/convex-http';
import { api } from '$lib/convex/_generated/api';
import { qbExchangeCode } from '$lib/convex/integrations/quickbooksConnector';
import type { RequestHandler } from './$types';

async function encryptToken(plaintext: string, keyBase64: string): Promise<string> {
	const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
	const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
	const combined = new Uint8Array(12 + ciphertext.byteLength);
	combined.set(iv, 0);
	combined.set(new Uint8Array(ciphertext), 12);
	return btoa(String.fromCharCode(...combined));
}

function getJwtToken(cookies: { get: (n: string) => string | undefined }, request: Request): string | undefined {
	const isSecure = new URL(request.url).protocol === 'https:';
	return cookies.get(isSecure ? '__Secure-better-auth.convex_jwt' : 'better-auth.convex_jwt');
}

export const GET: RequestHandler = async ({ url, cookies, request }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const realmId = url.searchParams.get('realmId'); // QB sends companyId here
	const error = url.searchParams.get('error');

	const storedState = cookies.get('qb_oauth_state');
	cookies.delete('qb_oauth_state', { path: '/' });

	if (error) redirect(302, '/admin/settings/integrations?error=access_denied&provider=quickbooks');
	if (!code || !state || !storedState || state !== storedState || !realmId) {
		redirect(302, '/admin/settings/integrations?error=invalid_state&provider=quickbooks');
	}

	const clientId = env.QB_CLIENT_ID;
	const clientSecret = env.QB_CLIENT_SECRET;
	const encryptionKey = env.ACCOUNTING_ENCRYPTION_KEY ?? env.GOOGLE_ENCRYPTION_KEY;
	const siteUrl = env.SITE_URL ?? url.origin;

	if (!clientId || !clientSecret || !encryptionKey) {
		return new Response('QuickBooks not configured', { status: 500 });
	}

	let tokens;
	try {
		tokens = await qbExchangeCode(code, `${siteUrl}/api/quickbooks/callback`, clientId, clientSecret);
	} catch (err) {
		console.error('[quickbooks/callback] Token exchange failed:', err);
		redirect(302, '/admin/settings/integrations?error=token_exchange&provider=quickbooks');
	}

	const [encryptedAccessToken, encryptedRefreshToken] = await Promise.all([
		encryptToken(tokens.access_token, encryptionKey),
		encryptToken(tokens.refresh_token, encryptionKey)
	]);

	const jwtToken = getJwtToken(cookies, request);
	if (!jwtToken) redirect(302, '/signin?redirectTo=/admin/settings/integrations');

	const convex = createServerConvexHttpClient({ token: jwtToken });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await (convex as any).mutation((api as any).integrations.accounting.connectWithOAuth, {
		provider: 'quickbooks',
		encryptedAccessToken,
		encryptedRefreshToken,
		tokenExpiresAt: Date.now() + tokens.expires_in * 1000,
		externalCompanyId: realmId,
		externalCompanyName: `QuickBooks Company (${realmId})`
	});

	redirect(302, '/admin/settings/integrations?connected=quickbooks');
};
