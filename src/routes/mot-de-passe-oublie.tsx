import { createFileRoute, useHydrated, useRouterState } from '@tanstack/react-router';
import { FORME_D_ADRESSE } from '../lib/compte/regles';
import { PageMotDePasseOublie } from '../marketing/compte/mot-de-passe';
import feuilleDuSite from '../styles/site/site.css?url';

/**
 * LE MOT DE PASSE OUBLIÉ, dans la DA du site (28/10/2026) : `marketing/compte/mot-de-passe.tsx`.
 * L'adresse tapée à la connexion arrive par l'état de l'historique, jamais par l'URL.
 */
export const Route = createFileRoute('/mot-de-passe-oublie')({
	head: () => ({
		meta: [{ title: 'Mot de passe oublié · Letikette' }],
		links: [{ rel: 'stylesheet', href: feuilleDuSite }]
	}),
	component: MotDePasseOublie
});

function MotDePasseOublie() {
	const hydrate = useHydrated();
	const adresse = useRouterState({ select: (s) => s.location.state.adresseDInscription });
	const adresseConnue =
		hydrate && adresse !== undefined && FORME_D_ADRESSE.test(adresse) ? adresse : undefined;
	return <PageMotDePasseOublie key={adresseConnue ?? 'vide'} adresseConnue={adresseConnue} />;
}
