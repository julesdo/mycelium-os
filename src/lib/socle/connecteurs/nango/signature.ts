/**
 * LA SIGNATURE D'UN WEBHOOK NANGO : l'en-tête `X-Nango-Hmac-Sha256`, un
 * HMAC-SHA256 en hexadécimal du corps BRUT, sous la clé de signature de
 * l'environnement (Environment Settings > Webhooks > Signing key).
 *
 * Relevé dans « Webhooks from Nango » (https://nango.dev/docs/guides/platform/webhooks-from-nango),
 * le 13/10/2026.
 *
 * ⚠️ LE CORPS BRUT, À L'OCTET : le relire en JSON puis le resérialiser casserait
 * la signature. L'appelant passe `await requete.text()`.
 *
 * ⚠️ JAMAIS L'ANCIEN EN-TÊTE `X-Nango-Signature` : un SHA-256 sans clé, que
 * n'importe qui peut fabriquer. Nango l'envoie encore par compatibilité.
 *
 * ⚠️ AUCUN HORODATAGE N'EST SIGNÉ. Un webhook rejoué ne fait que rattacher une
 * connexion déjà vérifiée chez Nango, ou planifier une lecture idempotente : il
 * n'ouvre rien de plus.
 */
export async function signatureNangoValide(
	corps: string,
	entete: string | null,
	cle: string
): Promise<boolean> {
	if (entete === null || cle === '') return false;
	const attendue = entete.trim().toLowerCase();
	if (!/^[0-9a-f]{64}$/.test(attendue)) return false;
	const encodeur = new TextEncoder();
	const cleHmac = await crypto.subtle.importKey(
		'raw',
		encodeur.encode(cle),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const brut = new Uint8Array(await crypto.subtle.sign('HMAC', cleHmac, encodeur.encode(corps)));
	const calculee = Array.from(brut, (octet) => octet.toString(16).padStart(2, '0')).join('');
	return egalEnTempsConstant(attendue, calculee);
}

/** Comparer sans s'arrêter au premier écart : la durée ne dit rien de la signature. */
function egalEnTempsConstant(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let difference = 0;
	for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return difference === 0;
}
