import { Outlet, createFileRoute, Link } from '@tanstack/react-router';
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { Button } from '@cladd-ui/react';
import { Shell } from '../../app/shell';

/**
 * Le layout de l'espace authentifié.
 *
 * La garde passe par les composants de `convex/react` plutôt que par une
 * redirection dans `beforeLoad` : l'état d'authentification n'est connu qu'une
 * fois le jeton vérifié côté client, et rediriger avant ça renverrait vers la
 * connexion un gérant déjà connecté, à chaque rechargement de page.
 */
export const Route = createFileRoute('/app')({
	component: LayoutApp
});

function LayoutApp() {
	return (
		<>
			<AuthLoading>
				<div className="flex h-dvh items-center justify-center">
					<p className="text-cladd-xs text-cladd-fg-soft">Ouverture de votre espace…</p>
				</div>
			</AuthLoading>

			<Unauthenticated>
				<div className="flex h-dvh flex-col items-center justify-center gap-cladd-2xs p-cladd-xs text-center">
					<h1 className="text-cladd-md font-semibold">Votre session a expiré.</h1>
					<p className="max-w-sm text-cladd-xs text-cladd-fg-soft">
						Reconnectez-vous pour retrouver vos taux et vos factures. Rien n&rsquo;est perdu.
					</p>
					<Button as={Link} to="/connexion" color="brand" variant="solid-fill">
						Se connecter
					</Button>
				</div>
			</Unauthenticated>

			<Authenticated>
				<Shell>
					<Outlet />
				</Shell>
			</Authenticated>
		</>
	);
}
