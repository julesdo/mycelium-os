/**
 * CE QU'IL FAUT POUR PARLER À PAPPERS, lu dans l'environnement (13/10/2026).
 *
 * `null` tant que la clé n'est pas posée : « La santé de vos clients » le dit
 * (« l'analyse s'active avec votre abonnement »), aucun bouton ne lance un appel
 * voué à l'échec. C'est l'état DORMANT dans lequel le module est livré.
 *
 *   · PAPPERS_API_KEY — la clé de l'API Pappers (espace membre, « Clé API »).
 *     Elle part dans l'en-tête `api-key`, jamais dans l'adresse : Pappers
 *     déconseille `api_token`, qui finirait dans les journaux.
 */
export interface ConfigPappers {
	readonly cle: string;
	readonly hote: string;
}

export function configPappers(): ConfigPappers | null {
	const cle = process.env.PAPPERS_API_KEY;
	if (!cle) return null;
	return { cle, hote: 'https://api.pappers.fr/v2' };
}
