/**
 * LA CLÉ D'UNE APPLICATION D'AUTHENTIFICATION, POUR QUI NE PEUT PAS SCANNER
 * (16/10/2026). Better Auth rend une adresse `otpauth://…?secret=…` ; le QR la
 * porte, et la clé se recopie à la main quand le QR ne passe pas (« Vous ne
 * pouvez pas le scanner ? »).
 */

export function cleDuTotp(uri: string): string | null {
	try {
		const adresse = new URL(uri);
		if (adresse.protocol !== 'otpauth:') return null;
		const cle = adresse.searchParams.get('secret');
		return cle === null || cle === '' ? null : cle;
	} catch {
		return null;
	}
}

/** Par groupes de quatre : « JBSW Y3DP EHPK 3PXP ». */
export function cleLisible(cle: string): string {
	return (cle.match(/.{1,4}/g) ?? []).join(' ');
}
