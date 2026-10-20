import { ConvexError } from 'convex/values';

/**
 * LIRE UNE SOURCE PUBLIQUE, EN REPRENANT CE QUI ÉCHOUE PAR À-COUPS (20/10/2026).
 *
 * L'API des données de la commande publique répond en huit à dix secondes, et sa passerelle
 * rend parfois 504 quand elle est chargée ; l'annuaire demande parfois de ralentir (429).
 * Une erreur passagère se reprend deux fois, après deux puis six secondes ; une erreur
 * durable (400, 404) se dit tout de suite. Ces lectures tournent dans les travaux de
 * l'équipe, en arrière-plan : attendre quelques secondes de plus ne bloque personne.
 */

const PASSAGERES = new Set([429, 500, 502, 503, 504]);
const ATTENTES_MS = [2_000, 6_000] as const;

const attendre = (ms: number) => new Promise((fin) => setTimeout(fin, ms));

export async function lireJson(
	adresse: string,
	quoi: string,
	{ delaiMs = 30_000 }: { readonly delaiMs?: number } = {}
): Promise<unknown> {
	let derniere = `${quoi} ne répond pas.`;
	for (let essai = 0; essai <= ATTENTES_MS.length; essai += 1) {
		if (essai > 0) await attendre(ATTENTES_MS[essai - 1] ?? 0);
		let reponse: Response;
		try {
			reponse = await fetch(adresse, {
				headers: { accept: 'application/json' },
				signal: AbortSignal.timeout(delaiMs)
			});
		} catch {
			derniere = `${quoi} ne répond pas.`;
			continue;
		}
		if (reponse.ok) return reponse.json();
		if (!PASSAGERES.has(reponse.status)) {
			throw new ConvexError(`${quoi} a refusé la demande (erreur ${reponse.status}).`);
		}
		derniere =
			reponse.status === 429
				? `${quoi} demande de ralentir.`
				: `${quoi} est surchargé (erreur ${reponse.status}).`;
	}
	throw new ConvexError(`${derniere} Trois essais en vain : relancez dans quelques minutes.`);
}
