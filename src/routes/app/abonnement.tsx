import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EcranAbonnement } from '../../screens/abonnement/abonnement';

export const Route = createFileRoute('/app/abonnement')({
	component: Abonnement,
	errorComponent: AbonnementEnErreur
});

function AbonnementEnErreur() {
	return <EcranAbonnement donnees={{ etat: 'erreur' }} />;
}

/** L'abonnement, branché sur la base ; le dessin vit dans `screens/abonnement/abonnement.tsx`. */
function Abonnement() {
	const etat = useQuery(api.billing.etatAbonnement, {});

	return (
		<EcranAbonnement
			donnees={etat === undefined ? { etat: 'attente' } : { etat: 'pret', valeur: etat }}
		/>
	);
}
