import { createFileRoute, useParams } from '@tanstack/react-router';
import { useQuery } from '../app/donnees';
import { api } from '../lib/convex/_generated/api';
import { PageRejoindre } from '../marketing/compte/rejoindre';
import feuilleDuSite from '../styles/site/site.css?url';

/**
 * L'acceptation d'une invitation dans une équipe, dans la DA du site (28/10/2026) :
 * `marketing/compte/rejoindre.tsx`.
 *
 * CETTE ROUTE MANQUAIT, ET C'ÉTAIT UN LIEN MORT DANS UN E-MAIL. Les invitations
 * partaient depuis des mois vers `/join/<jeton>` — une adresse qui n'a jamais
 * existé dans ce projet. Chaque personne invitée tombait donc sur une page
 * introuvable, et la seule façon de rejoindre un établissement était d'être
 * ajouté à la main. Le lien pointe désormais ici.
 */
export const Route = createFileRoute('/rejoindre/$token')({
	head: () => ({
		meta: [
			{ title: 'Rejoindre une équipe · Letikette' },
			// Une invitation est personnelle : elle n'a rien à faire dans un moteur de recherche.
			{ name: 'robots', content: 'noindex' }
		],
		links: [{ rel: 'stylesheet', href: feuilleDuSite }]
	}),
	component: Rejoindre
});

function Rejoindre() {
	const { token } = useParams({ from: '/rejoindre/$token' });
	const invitation = useQuery(api.organizations.getInvitationByToken, { token });
	return <PageRejoindre token={token} invitation={invitation} />;
}
