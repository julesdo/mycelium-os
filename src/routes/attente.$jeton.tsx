import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { api } from '../lib/convex/_generated/api';
import { EcranAttente } from '../screens/attente';

/**
 * `/attente/<jeton>` : le lien de l'e-mail de confirmation de la liste d'attente.
 *
 * ⚠️ `noindex` : l'adresse porte le jeton d'une inscription. Ni Umami ni la source de
 * visite ne s'y chargent (`__root.tsx`, `app/analytique.ts`, `app/source-visite.ts`).
 */
export const Route = createFileRoute('/attente/$jeton')({
	head: () => ({
		meta: [
			{ title: 'Liste d’attente · Letikette' },
			{ name: 'robots', content: 'noindex, nofollow' }
		]
	}),
	component: Attente
});

function Attente() {
	const { jeton } = Route.useParams();
	const confirmer = useMutation(api.attente.confirmer);
	const quitter = useMutation(api.attente.quitter);
	return (
		<EcranAttente
			onConfirmer={async () => {
				await confirmer({ jeton });
			}}
			onQuitter={async () => {
				await quitter({ jeton });
			}}
		/>
	);
}
