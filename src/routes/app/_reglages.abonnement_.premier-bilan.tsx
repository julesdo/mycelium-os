import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EcranPremierBilan } from '../../screens/abonnement/premier-bilan';

export const Route = createFileRoute('/app/_reglages/abonnement_/premier-bilan')({
	component: PageBilan,
	errorComponent: PremierBilanEnErreur
});

function PremierBilanEnErreur() {
	return <EcranPremierBilan donnees={{ etat: 'erreur' }} />;
}

/** Le premier bilan, branché sur la base ; le dessin vit dans `screens/abonnement/premier-bilan.tsx`. */
function PageBilan() {
	const etat = useQuery(api.billing.etatAbonnement, {});

	return (
		<EcranPremierBilan
			donnees={etat === undefined ? { etat: 'attente' } : { etat: 'pret', valeur: etat }}
		/>
	);
}
