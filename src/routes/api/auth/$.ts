import { createFileRoute } from '@tanstack/react-router';
import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start';

/**
 * Le relais d'authentification.
 *
 * Better Auth ne tourne pas ici : il tourne dans Convex, monté sur son routeur
 * HTTP par `authComponent.registerRoutes(http, createAuth)`
 * (src/lib/convex/http.ts). Cette route est le remplaçant exact du proxy
 * SvelteKit qu'elle supplante ; seul le framework change, pas l'architecture.
 *
 * Garder le relais côté serveur plutôt que d'appeler Convex directement depuis
 * le navigateur garde les cookies de session en same-origin, ce qui évite
 * d'avoir à passer Better Auth en mode cross-domain.
 *
 * **Les adresses viennent de `import.meta.env`, et surtout PAS de
 * `process.env`.** C'est la même source que le client Convex, et c'est la seule
 * qui soit juste en développement : l'orchestration Convex locale calcule des
 * ports par branche et les inline via le `define` de `vite.config.ts`, tandis
 * que `process.env` résout depuis `.env.local`, qui pointe sur le déploiement
 * cloud.
 *
 * Le symptôme quand on se trompe est déroutant : la connexion réussit, mais
 * contre le mauvais backend. L'application interroge ensuite le backend local,
 * qui n'a jamais entendu parler de cette session, et renvoie l'utilisateur sur
 * « votre session a expiré » en boucle.
 */
const convexUrl = import.meta.env.PUBLIC_CONVEX_URL as string;
const convexSiteUrl = import.meta.env.PUBLIC_CONVEX_SITE_URL as string;

if (!convexUrl || !convexSiteUrl) {
	throw new Error(
		"PUBLIC_CONVEX_URL ou PUBLIC_CONVEX_SITE_URL absente : le relais d'authentification ne sait pas à quel backend parler."
	);
}

// `vite.config.ts` injecte une URL bouchon en build de production quand la
// variable manque, pour que le prérendu aboutisse. Acceptée ici, elle
// produirait un déploiement où la connexion échoue en silence contre un hôte
// qui n'existe pas. On préfère un build qui refuse de sortir.
if (convexUrl.includes('prerender-placeholder')) {
	throw new Error(
		"PUBLIC_CONVEX_URL vaut l'URL bouchon de prérendu : le déploiement viserait un backend inexistant. Définir la vraie valeur avant de construire."
	);
}

const { handler } = convexBetterAuthReactStart({ convexUrl, convexSiteUrl });

export const Route = createFileRoute('/api/auth/$')({
	server: {
		handlers: {
			GET: ({ request }: { request: Request }) => handler(request),
			POST: ({ request }: { request: Request }) => handler(request)
		}
	}
});
