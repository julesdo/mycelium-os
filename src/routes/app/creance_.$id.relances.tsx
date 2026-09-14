import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranRelances } from '../../screens/analyses/relances';

export const Route = createFileRoute('/app/creance_/$id/relances')({
	component: PageRelances,
	errorComponent: RelancesEnErreur
});

function RelancesEnErreur() {
	const { id } = Route.useParams();
	return <EcranRelances identifiant={id} donnees={{ etat: 'erreur' }} />;
}

/**
 * Branchée sur la base ; le dessin vit dans `screens/analyses/relances.tsx`.
 */
function PageRelances() {
	const { id } = Route.useParams();
	const creanceId = id as Id<'creances'>;
	const creance = useQuery(api.recouvrement.lecture.creanceComplete, { creanceId });

	return (
		<EcranRelances
			identifiant={id}
			donnees={
				creance === undefined
					? { etat: 'attente' }
					: { etat: 'pret', valeur: { debiteur: creance.debiteur, niveaux: creance.relances } }
			}
		/>
	);
}
