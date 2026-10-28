import { createFileRoute, useHydrated, useRouterState } from '@tanstack/react-router';
import { suiteSure } from '../lib/compte/suite';
import { PageConnexion } from '../marketing/compte/connexion';
import feuilleDuSite from '../styles/site/site.css?url';

/**
 * LA CONNEXION, dans la DA du site (28/10/2026) : `marketing/compte/connexion.tsx`.
 *
 * `invitation` porte le jeton d'une invitation en cours.
 *
 * SANS LUI, UNE INVITATION SE PERD À LA CONNEXION. L'invité clique le lien reçu
 * par courriel, découvre qu'il a déjà un compte, se connecte — et atterrit sur
 * son espace habituel, l'invitation oubliée, sans aucun moyen de la retrouver
 * puisque le jeton n'était que dans l'URL précédente. On le transporte donc, et
 * on revient sur l'écran d'acceptation une fois la session ouverte.
 */
export const Route = createFileRoute('/connexion')({
	validateSearch: (search: Record<string, unknown>): { invitation?: string; suite?: string } => ({
		invitation: typeof search.invitation === 'string' ? search.invitation : undefined,
		// Le retour après connexion (l'invitation dans l'équipe mène à l'admin), borné
		// à l'admin et à l'application : jamais une redirection ouverte.
		suite: suiteSure(search.suite)
	}),
	head: () => ({
		meta: [{ title: 'Connexion · Letikette' }],
		links: [{ rel: 'stylesheet', href: feuilleDuSite }]
	}),
	component: Connexion
});

function Connexion() {
	const { invitation, suite } = Route.useSearch();
	// Le message « mot de passe enregistré » vient de l'état de l'historique : seulement après
	// l'hydratation, que le serveur, qui ne le voit pas, dessine la même page.
	const hydrate = useHydrated();
	const change = useRouterState({ select: (s) => s.location.state.motDePasseChange === true });
	return (
		<PageConnexion invitation={invitation} suite={suite} motDePasseChange={hydrate && change} />
	);
}
