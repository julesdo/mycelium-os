import { useEffect } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useQuery } from '../../app/donnees';
import { precharger } from '../../app/prechargement';
import { api } from '../../lib/convex/_generated/api';
import { EcranSemaine } from '../../screens/semaine';

export const Route = createFileRoute('/app/semaine')({
	// La semaine part au toucher de la carte du lundi (`app/prechargement.ts`).
	loader: () => {
		precharger(api.recouvrement.semaine.votreSemaine, {});
	},
	component: PageSemaine,
	errorComponent: () => <EcranSemaine donnees={{ etat: 'erreur' }} />
});

/**
 * `/app/semaine` — « VOTRE SEMAINE », poussée depuis la carte du lundi ou l'e-mail.
 * L'ouvrir fait disparaître la carte (`semaineVue`).
 */
function PageSemaine() {
	const lecture = useQuery(api.recouvrement.semaine.votreSemaine, {});
	const semaineVue = useMutation(api.recouvrement.semaine.semaineVue);
	useEffect(() => {
		void semaineVue({}).catch(() => undefined);
	}, [semaineVue]);

	if (lecture === undefined) return <EcranSemaine donnees={{ etat: 'attente' }} />;
	if (lecture === null) return <EcranSemaine donnees={{ etat: 'erreur' }} />;
	return <EcranSemaine donnees={{ etat: 'pret', valeur: lecture }} />;
}
