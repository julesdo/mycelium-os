import { createFileRoute } from '@tanstack/react-router';
import { suiteSure } from '../lib/compte/suite';
import { PageVerification } from '../marketing/compte/verification';
import feuilleDuSite from '../styles/site/site.css?url';

/**
 * LE CODE DE LA DOUBLE AUTHENTIFICATION, dans la DA du site (28/10/2026) :
 * `marketing/compte/verification.tsx`. L'invitation et la suite voyagent depuis la connexion.
 */
export const Route = createFileRoute('/connexion_/verification')({
	validateSearch: (search: Record<string, unknown>): { invitation?: string; suite?: string } => ({
		invitation: typeof search.invitation === 'string' ? search.invitation : undefined,
		suite: suiteSure(search.suite)
	}),
	head: () => ({
		meta: [{ title: 'Code de vérification · Letikette' }],
		links: [{ rel: 'stylesheet', href: feuilleDuSite }]
	}),
	component: Verification
});

function Verification() {
	const { invitation, suite } = Route.useSearch();
	return <PageVerification invitation={invitation} suite={suite} />;
}
