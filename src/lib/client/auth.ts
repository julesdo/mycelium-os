import { createAuthClient } from 'better-auth/react';
import { convexClient } from '@convex-dev/better-auth/client/plugins';

/**
 * Le client Better Auth.
 *
 * Better Auth ne tourne pas ici : il tourne **dans Convex**, monté sur son
 * routeur HTTP par `authComponent.registerRoutes(http, createAuth)`
 * (src/lib/convex/http.ts). Le frontend ne fait que relayer, via la route
 * serveur `/api/auth/$`. C'était déjà le cas avec SvelteKit ; seul le proxy
 * change de framework.
 */
export const authClient = createAuthClient({
	plugins: [convexClient()]
});
