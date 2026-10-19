import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { api } from '../lib/convex/_generated/api';
import { EcranDesinscription } from '../screens/desinscription';

/**
 * `/desinscription/<jeton>` : le lien du pied des e-mails de prospection.
 *
 * ⚠️ `noindex` : l'adresse porte le jeton d'un prospect. Ni Umami ni la source de
 * visite ne s'y chargent (`__root.tsx`, `app/analytique.ts`, `app/source-visite.ts`).
 */
export const Route = createFileRoute('/desinscription/$jeton')({
	head: () => ({
		meta: [
			{ title: 'Désinscription · Letikette' },
			{ name: 'robots', content: 'noindex, nofollow' }
		]
	}),
	component: Desinscription
});

function Desinscription() {
	const { jeton } = Route.useParams();
	const seDesinscrire = useMutation(api.desinscription.seDesinscrire);
	return (
		<EcranDesinscription
			onConfirmer={async () => {
				await seDesinscrire({ jeton });
			}}
		/>
	);
}
