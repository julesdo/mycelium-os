import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranRisques } from '../../screens/analyses/risques';

export const Route = createFileRoute('/app/creance_/$id/risques')({
	component: PageRisques,
	errorComponent: RisquesEnErreur
});

function RisquesEnErreur() {
	const { id } = Route.useParams();
	return <EcranRisques identifiant={id} donnees={{ etat: 'erreur' }} />;
}

/**
 * Branchée sur la base ; le dessin vit dans `screens/analyses/risques.tsx`.
 */
function PageRisques() {
	const { id } = Route.useParams();
	const creanceId = id as Id<'creances'>;
	const creance = useQuery(api.recouvrement.lecture.creanceComplete, { creanceId });

	return (
		<EcranRisques
			identifiant={id}
			donnees={
				creance === undefined
					? { etat: 'attente' }
					: { etat: 'pret', valeur: { debiteur: creance.debiteur, risques: creance.risques } }
			}
		/>
	);
}
