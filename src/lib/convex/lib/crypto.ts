// Shared AES-256-GCM helpers — usable in Convex actions (not mutations, which lack process.env)

export async function encryptToken(plaintext: string, keyBase64: string): Promise<string> {
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

export async function decryptToken(cipherBase64: string, keyBase64: string): Promise<string> {
	const combined = Uint8Array.from(atob(cipherBase64), (c) => c.charCodeAt(0));
	const iv = combined.slice(0, 12);
	const encrypted = combined.slice(12);
	const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
	const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
	const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
	return new TextDecoder().decode(plaintext);
}

export function requireEncryptionKey(envVar = 'ACCOUNTING_ENCRYPTION_KEY'): string {
	const key = process.env[envVar];
	if (!key) throw new Error(`[crypto] ${envVar} not set`);
	return key;
}
