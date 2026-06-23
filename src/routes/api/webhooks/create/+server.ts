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

function generateSecret(): string {
	const arr = new Uint8Array(32);
	crypto.getRandomValues(arr);
	return btoa(String.fromCharCode(...arr)).replace(/[+/=]/g, '');
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

export const POST: RequestHandler = async ({ request, cookies }) => {
	let body: { url?: string; events?: string[] };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Corps JSON invalide' }, { status: 400 });
	}

	if (!body.url?.startsWith('https://')) {
		return json({ error: 'URL HTTPS requise' }, { status: 400 });
	}
	if (!Array.isArray(body.events) || !body.events.length) {
		return json({ error: 'Au moins un événement requis' }, { status: 400 });
	}

	const encryptionKey = env.ACCOUNTING_ENCRYPTION_KEY;
	if (!encryptionKey) {
		return json({ error: 'Chiffrement non configuré — contacter le support' }, { status: 500 });
	}

	const token = getJwtToken(cookies, request);
	if (!token) {
		return json({ error: 'Non authentifié' }, { status: 401 });
	}

	const plaintextSecret = generateSecret();
	const encryptedSecret = await encryptToken(plaintextSecret, encryptionKey);

	const convex = createServerConvexHttpClient({ token });
	const id = await (convex as any).mutation(
		(api as any).integrations.apiKeys.createWebhookEndpointFromServer,
		{ url: body.url, events: body.events, encryptedSecret }
	);

	return json({ id, secret: plaintextSecret });
};
