import { json } from '@sveltejs/kit';
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

function getJwtToken(cookies: { get: (name: string) => string | undefined }, request: Request): string | undefined {
	const isSecure = new URL(request.url).protocol === 'https:';
	const cookieName = isSecure ? '__Secure-better-auth.convex_jwt' : 'better-auth.convex_jwt';
	return cookies.get(cookieName);
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	const body = await request.json() as { provider: string; apiKey: string };

	if (!body.provider || !body.apiKey?.trim()) {
		return json({ error: 'Paramètres manquants' }, { status: 400 });
	}

	const encryptionKey = env.ACCOUNTING_ENCRYPTION_KEY ?? env.GOOGLE_ENCRYPTION_KEY;
	if (!encryptionKey) {
		return json({ error: 'Clé de chiffrement non configurée' }, { status: 500 });
	}

	const token = getJwtToken(cookies, request);
	if (!token) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	const encryptedApiKey = await encryptToken(body.apiKey.trim(), encryptionKey);

	const convex = createServerConvexHttpClient({ token });
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	await (convex as any).mutation((api as any).integrations.accounting.connectWithApiKey, {
		provider: body.provider,
		encryptedApiKey
	});

	return json({ ok: true });
};
