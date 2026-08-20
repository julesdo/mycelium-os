import { createServerFileRoute } from '@tanstack/react-start/server';
import { convexBetterAuthReactStart } from '@convex-dev/better-auth/react-start';

/**
 * Le relais d'authentification.
 *
 * Better Auth ne tourne pas ici : il tourne dans Convex, monté sur son routeur
 * HTTP par `authComponent.registerRoutes(http, createAuth)`
 * (src/lib/convex/http.ts). Cette route est le remplaçant exact du proxy
 * SvelteKit qu'elle supplante ; seul le framework change, pas l'architecture.
 */
const { handler } = convexBetterAuthReactStart({
	convexUrl: process.env.PUBLIC_CONVEX_URL as string,
	convexSiteUrl: process.env.PUBLIC_CONVEX_SITE_URL as string
});

export const ServerRoute = createServerFileRoute('/api/auth/$').methods({
	GET: ({ request }) => handler(request),
	POST: ({ request }) => handler(request)
});
