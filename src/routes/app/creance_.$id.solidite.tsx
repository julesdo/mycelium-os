import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranSolidite } from '../../screens/analyses/solidite';

export const Route = createFileRoute('/app/creance_/$id/solidite')({
	component: PageSolidite,
	errorComponent: SoliditeEnErreur
});

function SoliditeEnErreur() {
	const { id } = Route.useParams();
	return <EcranSolidite identifiant={id} donnees={{ etat: 'erreur' }} />;
}

/**
 * Branchée sur la base ; le dessin vit dans `screens/analyses/solidite.tsx`.
 */
function PageSolidite() {
	const { id } = Route.useParams();
	const creanceId = id as Id<'creances'>;
	const creance = useQuery(api.recouvrement.lecture.creanceComplete, { creanceId });

	return (
		<EcranSolidite
			identifiant={id}
			donnees={
				creance === undefined
					? { etat: 'attente' }
					: { etat: 'pret', valeur: { debiteur: creance.debiteur, solidite: creance.solidite } }
			}
		/>
	);
}
