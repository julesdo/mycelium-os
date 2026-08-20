import { ConvexReactClient } from 'convex/react';

const url = import.meta.env.PUBLIC_CONVEX_URL as string | undefined;

if (!url) {
	// Message explicite plutôt qu'un `undefined` qui remonterait en erreur
	// opaque au premier appel de requête, trente écrans plus loin.
	throw new Error(
		"PUBLIC_CONVEX_URL absente : le backend n'est pas joignable. Vérifier .env.local et que `bun run dev` a bien démarré Convex."
	);
}

export const convex = new ConvexReactClient(url);
