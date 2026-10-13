/**
 * CE QU'IL FAUT POUR PARLER À NANGO, lu dans l'environnement (13/10/2026).
 *
 * `null` tant que le compte Nango n'est pas branché : l'écran n'affiche alors
 * pas les logiciels, plutôt qu'un bouton qui échouerait. C'est l'état DORMANT
 * dans lequel ce connecteur est livré : tout est écrit, rien n'est appelé.
 *
 * Variables, à poser sur le déploiement Convex (voir `serveurs/nango/LISEZMOI.md`) :
 *
 *   · NANGO_SECRET_KEY — une clé d'API d'ENVIRONNEMENT, créée en « Custom » avec
 *     ces seules portées :
 *       environment:connect_sessions:write   ouvrir une session de connexion
 *       environment:integrations:list        savoir quels logiciels sont configurés
 *       environment:connections:read         lire `realmId`, `tenant_id`… (SANS identifiants)
 *       environment:connections:delete       débrancher
 *       environment:proxy                    lire par le proxy
 *     ⚠️ JAMAIS `read_credentials` ni `list_credentials` : sans elles, aucun
 *     jeton d'accès d'un gérant ne peut transiter par nos serveurs, même par
 *     erreur. Nango les ajoute lui-même aux requêtes du proxy.
 *   · NANGO_WEBHOOK_SIGNING_KEY — la clé de signature des webhooks (Environment
 *     Settings > Webhooks > Signing key). Ce n'est PAS la clé d'API. Sans elle,
 *     les webhooks sont refusés et seule la lecture périodique tourne.
 *   · NANGO_HOST — facultatif : l'adresse d'une instance Nango auto-hébergée.
 *     Par défaut, Nango Cloud.
 */
export interface ConfigNango {
	readonly cleSecrete: string;
	readonly cleDeSignature: string | undefined;
	readonly hote: string;
}

export function configNango(): ConfigNango | null {
	const cleSecrete = process.env.NANGO_SECRET_KEY;
	if (!cleSecrete) return null;
	const hote = (process.env.NANGO_HOST || 'https://api.nango.dev').replace(/\/+$/, '');
	return {
		cleSecrete,
		cleDeSignature: process.env.NANGO_WEBHOOK_SIGNING_KEY || undefined,
		hote
	};
}
