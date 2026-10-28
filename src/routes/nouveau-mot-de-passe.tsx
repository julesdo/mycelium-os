import { createFileRoute } from '@tanstack/react-router';
import { PageNouveauMotDePasse } from '../marketing/compte/mot-de-passe';
import feuilleDuSite from '../styles/site/site.css?url';

/**
 * LE NOUVEAU MOT DE PASSE, dans la DA du site (28/10/2026) : `marketing/compte/mot-de-passe.tsx`.
 * Le jeton vient du lien reçu par e-mail ; sans lui, la page dit d'en demander un autre.
 */
export const Route = createFileRoute('/nouveau-mot-de-passe')({
	validateSearch: (search: Record<string, unknown>) => ({
		token: typeof search.token === 'string' ? search.token : ''
	}),
	head: () => ({
		meta: [{ title: 'Nouveau mot de passe · Letikette' }],
		links: [{ rel: 'stylesheet', href: feuilleDuSite }]
	}),
	component: NouveauMotDePasse
});

function NouveauMotDePasse() {
	const { token } = Route.useSearch();
	return <PageNouveauMotDePasse token={token} />;
}
