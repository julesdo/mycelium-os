/**
 * CE QU'IL FAUT POUR PARLER À CHIFT, lu dans l'environnement.
 *
 * `null` tant que le compte Chift n'est pas ouvert : l'écran n'affiche alors pas
 * la carte, plutôt qu'un bouton qui échouerait. C'est l'état DORMANT dans lequel
 * ce connecteur a été livré, le 06/10/2026 : tout est écrit, rien n'est appelé.
 *
 * ⚠️ UNE SEULE CLÉ POUR TOUS LES ÉTABLISSEMENTS, ET AUCUN JETON PAR CLIENT. Chift
 * garde lui-même l'accès au logiciel de chaque gérant (la « connexion ») ; nous
 * ne détenons que la clé de notre compte, échangée contre un jeton de trente
 * minutes à chaque lecture (`POST /token`, corps JSON, sans `grant_type`). Il n'y
 * a donc rien à chiffrer en base, contrairement à Qonto.
 *
 * Variables, à poser sur le déploiement Convex :
 *   · CHIFT_ACCOUNT_ID, CHIFT_CLIENT_ID, CHIFT_CLIENT_SECRET — la clé d'API, créée
 *     sur https://chift.app/api-keys. Une clé de bac à sable n'atteint que les
 *     consommateurs du bac à sable, et inversement : l'environnement suit la clé.
 *   · CHIFT_SECRET_WEBHOOK — le secret de signature des webhooks, choisi par nous.
 *     Sans lui, les webhooks sont ignorés et seule la lecture périodique tourne.
 *
 * Adresses et formats relevés dans la documentation Chift le 06/10/2026.
 */
export interface ConfigChift {
	readonly accountId: string;
	readonly clientId: string;
	readonly clientSecret: string;
	readonly secretWebhook: string | undefined;
	readonly urlApi: string;
	readonly urlWebhook: string;
	readonly urlApplication: string;
}

/**
 * Les deux API qui portent des factures clients. Le sélecteur de Chift ne
 * propose que les logiciels qui en parlent une, et seulement ceux de France.
 */
export const APIS_CHIFT = ['Accounting', 'Invoicing'] as const;
export const PAYS_CHIFT = 'FR';

/**
 * Les événements qui disent qu'un logiciel vient d'être branché, modifié ou
 * retiré. Chacun planifie une lecture, qui constate elle-même l'état.
 */
export const EVENEMENTS_CHIFT = [
	'account.connection.created',
	'account.connection.updated',
	'account.connection.deleted'
] as const;

export function configChift(): ConfigChift | null {
	const accountId = process.env.CHIFT_ACCOUNT_ID;
	const clientId = process.env.CHIFT_CLIENT_ID;
	const clientSecret = process.env.CHIFT_CLIENT_SECRET;
	const site = process.env.CONVEX_SITE_URL;
	const application = process.env.SITE_URL;
	if (!accountId || !clientId || !clientSecret || !site || !application) return null;
	return {
		accountId,
		clientId,
		clientSecret,
		secretWebhook: process.env.CHIFT_SECRET_WEBHOOK || undefined,
		urlApi: 'https://api.chift.eu',
		urlWebhook: `${site}/chift/webhook`,
		urlApplication: application
	};
}
