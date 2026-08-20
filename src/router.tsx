import { createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';

/**
 * Le point d'entrée du routeur, appelé par TanStack Start côté serveur comme
 * côté client. `routeTree.gen.ts` est généré depuis `src/routes/**` : il n'est
 * jamais édité à la main et n'est pas relu en revue de code.
 */
export function getRouter() {
	return createRouter({
		routeTree,
		defaultPreload: 'intent',
		// Le produit est en français : un écran d'erreur en anglais serait la
		// seule chose que le gérant verrait dans une autre langue, au pire moment.
		defaultNotFoundComponent: () => (
			<div className="p-cladd-xs">
				<h1 className="text-cladd-md font-semibold">Cette page n'existe pas.</h1>
				<p className="mt-1 text-cladd-xs text-cladd-fg-soft">
					Le lien est peut-être ancien. Revenez au tableau de bord pour retrouver vos taux.
				</p>
			</div>
		),
		/**
		 * L'écran d'erreur.
		 *
		 * Le message technique par défaut de TanStack (« Something went wrong! »
		 * suivi d'une trace Convex) est la pire chose qu'un gérant de cantine
		 * puisse lire : il est en anglais, il ne dit pas quoi faire, et il donne
		 * l'impression que sa mesure est perdue. Elle ne l'est jamais : les
		 * données sont dans Convex, l'écran seul a échoué.
		 */
		defaultErrorComponent: () => (
			<div className="flex h-dvh flex-col items-center justify-center gap-cladd-3xs p-cladd-xs text-center">
				<h1 className="text-cladd-md font-semibold">Cet écran n'a pas pu s'afficher.</h1>
				<p className="max-w-sm text-cladd-xs text-cladd-fg-soft">
					Vos factures et vos taux sont intacts : c'est l'affichage qui a échoué, pas la
					mesure. Rechargez la page pour les retrouver.
				</p>
			</div>
		)
	});
}

declare module '@tanstack/react-router' {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
