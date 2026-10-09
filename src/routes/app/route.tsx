import { Outlet, createFileRoute, Link, Navigate } from '@tanstack/react-router';
import { BoutonPrincipal, PageEcran } from '../../ui';
import { useConvexAuth } from 'convex/react';
import { useQuery } from '../../app/donnees';
import { api } from '../../lib/convex/_generated/api';
import { Shell } from '../../app/shell';

/**
 * Le layout de l'espace authentifié.
 *
 * La garde passe par `useConvexAuth` de `convex/react` plutôt que par une
 * redirection dans `beforeLoad` : l'état d'authentification n'est connu qu'une
 * fois le jeton vérifié côté client, et rediriger avant ça renverrait vers la
 * connexion un gérant déjà connecté, à chaque rechargement de page.
 */
export const Route = createFileRoute('/app')({
	component: LayoutApp
});

function LayoutApp() {
	const { isLoading, isAuthenticated } = useConvexAuth();

	if (!isLoading && !isAuthenticated) {
		return (
			<div className="flex h-dvh flex-col items-center justify-center gap-cladd-2xs p-cladd-xs text-center">
				<h1 className="text-cladd-md font-semibold">Votre session a expiré.</h1>
				<p className="max-w-sm text-cladd-xs text-cladd-fg-soft">
					Reconnectez-vous pour retrouver vos dossiers et vos calculs. Rien n&rsquo;est perdu.
				</p>
				<BoutonPrincipal as={Link} to="/connexion">
					Se connecter
				</BoutonPrincipal>
			</div>
		);
	}

	/*
	  ⚠️ UNE SEULE COQUILLE, DU PREMIER AFFICHAGE À LA FIN (09/10/2026). Elle était
	  montée après la session ET l'établissement : le fond, la barre et l'écran
	  apparaissaient d'un coup après deux lignes de texte. Elle est maintenant là
	  tout de suite ; seul son milieu passe du squelette à l'écran.
	*/
	return (
		<Shell sessionOuverte={!isLoading}>
			{isLoading ? <Ouverture /> : <AvecEtablissement />}
		</Shell>
	);
}

/**
 * Un compte sans établissement ne peut rien faire du produit : toutes les
 * requêtes du domaine sont cloisonnées par organisation. On l'envoie donc
 * créer le sien, plutôt que de lui montrer une suite d'écrans en erreur.
 */
function AvecEtablissement() {
	const org = useQuery(api.organizations.getMyOrg, {});

	if (org === undefined) return <Ouverture />;
	if (org === null) return <Navigate to="/bienvenue" replace />;

	return <Outlet />;
}

/** Le squelette d'un écran, le temps que la session et l'établissement s'ouvrent. */
function Ouverture() {
	return <PageEcran entete={{ genre: 'aucun', titre: 'Letikette' }} etat="attente" />;
}
