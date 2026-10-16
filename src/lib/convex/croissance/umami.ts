/**
 * LE TRAFIC DU SITE, LU CHEZ UMAMI (16/10/2026) — pour le point du lundi.
 *
 * L'API d'Umami Cloud, en lecture seule, avec une clé (`UMAMI_API_KEY`). Sans clé,
 * ou si Umami ne répond pas, `null` : le point le dit et s'en passe.
 *
 * L'identifiant du site est celui du traceur (`app/analytique.ts`), recopié ici
 * parce que Convex n'embarque pas le code du navigateur ; un test vérifie qu'ils
 * restent égaux.
 */

export const SITE_UMAMI_MESURE = 'a8539e74-7a3a-4f53-b2d6-5795346368b9';

function valeur(x: unknown): number | null {
	if (typeof x === 'number') return x;
	if (typeof x === 'object' && x !== null && typeof (x as { value?: unknown }).value === 'number') {
		return (x as { value: number }).value;
	}
	return null;
}

export async function traficDuSite(
	debut: number,
	fin: number
): Promise<{ visiteurs: number; pagesVues: number } | null> {
	const cle = process.env.UMAMI_API_KEY;
	if (!cle) return null;
	try {
		const reponse = await fetch(
			`https://api.umami.is/v1/websites/${SITE_UMAMI_MESURE}/stats?startAt=${debut}&endAt=${fin}`,
			{ headers: { 'x-umami-api-key': cle, Accept: 'application/json' } }
		);
		if (!reponse.ok) return null;
		const corps = (await reponse.json()) as { visitors?: unknown; pageviews?: unknown };
		const visiteurs = valeur(corps.visitors);
		const pagesVues = valeur(corps.pageviews);
		return visiteurs === null || pagesVues === null ? null : { visiteurs, pagesVues };
	} catch {
		return null;
	}
}
