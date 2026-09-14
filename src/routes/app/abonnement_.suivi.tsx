import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EcranSuiviOffre } from '../../screens/abonnement/suivi';

export const Route = createFileRoute('/app/abonnement_/suivi')({
	component: PageSuivi,
	errorComponent: SuiviOffreEnErreur
});

function SuiviOffreEnErreur() {
	return <EcranSuiviOffre donnees={{ etat: 'erreur' }} />;
}

/** L'offre d'abonnement, branchée sur la base ; le dessin vit dans `screens/abonnement/suivi.tsx`. */
function PageSuivi() {
	const etat = useQuery(api.billing.etatAbonnement, {});

	return (
		<EcranSuiviOffre
			donnees={etat === undefined ? { etat: 'attente' } : { etat: 'pret', valeur: etat }}
		/>
	);
}
