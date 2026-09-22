/**
 * CE QU'IL FAUT POUR PARLER À QONTO, lu dans l'environnement.
 *
 * `null` quand l'application n'est pas encore déclarée chez Qonto : l'écran
 * n'affiche alors pas la carte, plutôt qu'un bouton qui échouerait.
 *
 * Les adresses sont celles de la documentation Qonto relevée le 21/09/2026.
 */
export interface ConfigQonto {
	readonly clientId: string;
	readonly clientSecret: string;
	readonly urlAutorisation: string;
	readonly urlJeton: string;
	readonly urlApi: string;
	readonly jetonStaging: string | undefined;
	readonly urlRetour: string;
	readonly urlWebhook: string;
	readonly urlApplication: string;
}

/** Lecture seule, plus le rafraîchissement et les webhooks. Aucun droit sensible. */
export const DROITS_QONTO = 'offline_access client_invoices.read webhook';

export function configQonto(): ConfigQonto | null {
	const clientId = process.env.QONTO_CLIENT_ID;
	const clientSecret = process.env.QONTO_CLIENT_SECRET;
	const site = process.env.CONVEX_SITE_URL;
	const application = process.env.SITE_URL;
	if (!clientId || !clientSecret || !site || !application) return null;

	const bacASable = process.env.QONTO_ENVIRONNEMENT === 'sandbox';
	return {
		clientId,
		clientSecret,
		urlAutorisation: bacASable
			? 'https://oauth-sandbox.staging.qonto.co/oauth2/auth'
			: 'https://oauth.qonto.com/oauth2/auth',
		urlJeton: bacASable
			? 'https://oauth-sandbox.staging.qonto.co/oauth2/token'
			: 'https://oauth.qonto.com/oauth2/token',
		urlApi: bacASable
			? 'https://thirdparty-sandbox.staging.qonto.co/v2'
			: 'https://thirdparty.qonto.com/v2',
		jetonStaging: bacASable ? process.env.QONTO_STAGING_TOKEN : undefined,
		urlRetour: `${site}/qonto/retour`,
		urlWebhook: `${site}/qonto/webhook`,
		urlApplication: application
	};
}

/** Le jeton d'accès, et l'en-tête du bac à sable quand on y est. */
export function entetesQonto(config: ConfigQonto, jeton?: string): Record<string, string> {
	return {
		...(jeton === undefined ? {} : { Authorization: `Bearer ${jeton}` }),
		...(config.jetonStaging === undefined ? {} : { 'X-Qonto-Staging-Token': config.jetonStaging })
	};
}
