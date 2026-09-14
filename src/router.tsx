import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { EcranIntrouvable, EcranEnErreur } from './screens/passage';

/**
 * Le point d'entrée du routeur, appelé par TanStack Start côté serveur comme
 * côté client. `routeTree.gen.ts` est généré depuis `src/routes/**` : il n'est
 * jamais édité à la main et n'est pas relu en revue de code.
 */
export function getRouter() {
	return createRouter({
		routeTree,
		defaultPreload: 'intent',
		// Les deux écrans de passage vivent dans `src/screens/passage.tsx`, pour que
		// la salle d'exposition puisse les rendre. Écrits ici en ligne, ils étaient
		// impossibles à regarder. `ecrans-de-passage.test.ts` vérifie que le routeur
		// affiche bien ceux-là, et pas une copie.
		defaultNotFoundComponent: () => <EcranIntrouvable />,
		defaultErrorComponent: () => <EcranEnErreur />
	});
}

declare module '@tanstack/react-router' {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
