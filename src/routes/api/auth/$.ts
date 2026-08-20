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
 */
const { handler } = convexBetterAuthReactStart({
	convexUrl: process.env.PUBLIC_CONVEX_URL as string,
	convexSiteUrl: process.env.PUBLIC_CONVEX_SITE_URL as string
});

export const Route = createFileRoute('/api/auth/$')({
	server: {
		handlers: {
			GET: ({ request }: { request: Request }) => handler(request),
			POST: ({ request }: { request: Request }) => handler(request)
		}
	}
});
