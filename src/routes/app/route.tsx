import { Outlet, createFileRoute, Link, Navigate } from '@tanstack/react-router';
import { Authenticated, Unauthenticated, AuthLoading, useQuery } from 'convex/react';
import { Button } from '@cladd-ui/react';
import { api } from '../../lib/convex/_generated/api';
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
				<Attente message="Ouverture de votre espace…" />
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
				<AvecEtablissement />
			</Authenticated>
		</>
	);
}

/**
 * Un compte sans établissement ne peut rien faire du produit : toutes les
 * requêtes du domaine sont cloisonnées par organisation. On l'envoie donc
 * créer le sien, plutôt que de lui montrer une suite d'écrans en erreur.
 */
function AvecEtablissement() {
	const org = useQuery(api.organizations.getMyOrg, {});

	if (org === undefined) return <Attente message="Chargement de votre établissement…" />;
	if (org === null) return <Navigate to="/bienvenue" replace />;

	return (
		<Shell>
			<Outlet />
		</Shell>
	);
}

function Attente({ message }: { message: string }) {
	return (
		<div className="flex h-dvh items-center justify-center">
			<p className="text-cladd-xs text-cladd-fg-soft">{message}</p>
		</div>
	);
}
