/**
 * LA SIGNATURE D'UN WEBHOOK RESEND (Svix), VÉRIFIÉE EN WEB CRYPTO (16/10/2026).
 *
 * Resend signe chaque webhook avec Svix : trois en-têtes (`svix-id`, `svix-timestamp` en
 * secondes, `svix-signature`), un secret `whsec_…` propre à chaque point de terminaison.
 * Le contenu signé est `id.timestamp.corps` — le corps BRUT, jamais un JSON reparsé —, la
 * clé est le secret sans son préfixe, décodé en base64, et l'en-tête porte une ou plusieurs
 * signatures `v1,<base64>` séparées par des espaces. Un horodatage à plus de cinq minutes,
 * dans un sens ou dans l'autre, est refusé (la bibliothèque de référence fait de même).
 *
 * Sources : docs.svix.com/receiving/verifying-payloads/how-manual,
 * resend.com/docs/webhooks/verify-webhooks-requests. Aucun SDK : le runtime Convex fournit
 * `crypto.subtle`, `atob` et `btoa`.
 */

const TOLERANCE_S = 5 * 60;

function versOctets(base64: string): Uint8Array<ArrayBuffer> {
	return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function versBase64(octets: Uint8Array): string {
	let binaire = '';
	for (const o of octets) binaire += String.fromCharCode(o);
	return btoa(binaire);
}

/** Comparaison en temps constant : la durée ne dit pas où deux signatures diffèrent. */
function egalEnTempsConstant(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let difference = 0;
	for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return difference === 0;
}

export async function signatureSvixValide(entree: {
	readonly secret: string;
	readonly id: string | null;
	readonly timestamp: string | null;
	readonly signatures: string | null;
	readonly corps: string;
	readonly maintenant?: number;
}): Promise<boolean> {
	const { secret, id, timestamp, signatures, corps } = entree;
	if (!id || !timestamp || !signatures) return false;
	const ts = Number(timestamp);
	const maintenantS = Math.floor((entree.maintenant ?? Date.now()) / 1000);
	if (!Number.isInteger(ts) || Math.abs(maintenantS - ts) > TOLERANCE_S) return false;

	let cle: CryptoKey;
	try {
		cle = await crypto.subtle.importKey(
			'raw',
			versOctets(secret.replace(/^whsec_/, '')),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign']
		);
	} catch {
		return false;
	}
	const attendue = versBase64(
		new Uint8Array(
			await crypto.subtle.sign('HMAC', cle, new TextEncoder().encode(`${id}.${timestamp}.${corps}`))
		)
	);
	return signatures
		.split(' ')
		.some((entreeSig) => {
			const [version, signature] = entreeSig.split(',');
			return version === 'v1' && signature !== undefined && egalEnTempsConstant(signature, attendue);
		});
}
