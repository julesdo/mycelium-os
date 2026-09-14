import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { aujourdHuiISO } from '../../ui';
import { EcranHabitude } from '../../screens/debiteur/habitude';

export const Route = createFileRoute('/app/debiteurs_/$id/habitude')({
	component: PageHabitude,
	errorComponent: HabitudeEnErreur
});

function HabitudeEnErreur() {
	const { id } = Route.useParams();
	return <EcranHabitude identifiant={id} donnees={{ etat: 'erreur' }} />;
}

/**
 * Branchée sur la base ; le dessin vit dans `screens/debiteur/habitude.tsx`.
 */
function PageHabitude() {
	const { id } = Route.useParams();
	const debiteurId = id as Id<'debiteurs'>;

	const debiteurs = useQuery(api.recouvrement.lecture.listerDebiteurs, {});
	const comportement = useQuery(api.recouvrement.comportement.lire, {
		debiteurId,
		aujourdHui: aujourdHuiISO()
	});

	const debiteur = debiteurs?.find((d) => d._id === debiteurId);

	return (
		<EcranHabitude
			identifiant={id}
			donnees={
				comportement === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								denomination: debiteur?.denomination ?? null,
								habitude: comportement.habitude,
								ruptures: comportement.ruptures
							}
						}
			}
		/>
	);
}
