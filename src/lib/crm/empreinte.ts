/**
 * L'ADRESSE D'UN PROSPECT, RAMENÉE À UNE SEULE FORME (16/10/2026) : c'est elle qui
 * reconnaît un doublon, et dont l'empreinte entre dans la liste d'opposition.
 */
export function normaliserEmail(email: string): string {
	return email.trim().toLowerCase();
}

/** L'empreinte SHA-256 d'une adresse normalisée, en hexadécimal : l'opposition ne garde qu'elle. */
export async function empreinteDEmail(email: string): Promise<string> {
	const octets = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(normaliserEmail(email))
	);
	return [...new Uint8Array(octets)].map((o) => o.toString(16).padStart(2, '0')).join('');
}
