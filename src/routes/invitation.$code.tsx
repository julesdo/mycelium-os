import { useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery } from '../app/donnees';
import { noterParrainDeLaVisite } from '../app/source-visite';
import { api } from '../lib/convex/_generated/api';
import { EcranInvitation } from '../screens/invitation';

export const Route = createFileRoute('/invitation/$code')({
	head: () => ({
		meta: [
			{ title: 'Un mois de Letikette vous est offert' },
			// Une invitation est personnelle : elle n'a rien à faire dans un moteur de recherche.
			{ name: 'robots', content: 'noindex' }
		]
	}),
	component: Invitation
});

/**
 * `/invitation/<code>` — le lien que partage la page « Recommander » (22/10/2026). Le
 * code se garde pour l'inscription (`noterParrainDeLaVisite`) et voyage aussi dans
 * l'adresse (`?cadeau=`), pour que l'inscription rappelle qui offre le mois.
 */
function Invitation() {
	const { code } = Route.useParams();
	const navigate = useNavigate();
	const invitation = useQuery(api.croissance.parrainage.invitation, { code });
	const valable = invitation !== undefined && invitation !== null;
	useEffect(() => {
		if (valable) noterParrainDeLaVisite(code);
	}, [valable, code]);

	return (
		<EcranInvitation
			invitation={invitation}
			onAccepter={() => void navigate({ to: '/inscription', search: { cadeau: code } })}
		/>
	);
}
