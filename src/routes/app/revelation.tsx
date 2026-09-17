import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EcranRevelation } from '../../screens/revelation';
import { aujourdHuiISO } from '../../ui';

export const Route = createFileRoute('/app/revelation')({
	component: Revelation,
	errorComponent: RevelationEnErreur
});

function RevelationEnErreur() {
	return <EcranRevelation donnees={{ etat: 'erreur' }} />;
}

/**
 * La révélation, branchée sur la base ; le dessin vit dans `screens/revelation.tsx`.
 *
 * La date du jour est lue par `aujourdHuiISO`, seule lecture d'horloge de
 * l'interface — voir `ui/horloge.ts`, qui explique pourquoi elle est commune à
 * cet écran et à l'accueil.
 */
function Revelation() {
	const arreteAu = aujourdHuiISO();
	const revelation = useQuery(api.recouvrement.revelation.revelation, { arreteAu });
	const bilan = useQuery(api.recouvrement.revelation.bilan, { aujourdHui: arreteAu });

	return (
		<EcranRevelation
			donnees={
				// Les DEUX lectures entrent dans l'attente : « Ce qui s’est éteint » est
				// un texte de l'écran prêt, et il apparaissait après lui.
				revelation === undefined || bilan === undefined
					? { etat: 'attente' }
					: // ⚠️ `arreteAu` EST LA DATE PASSÉE À LA REQUÊTE, pas une seconde
						// lecture d'horloge. Deux appels à `aujourdHuiISO` peuvent tomber de
						// part et d'autre de minuit, et l'écran daterait alors le chiffre
						// d'un autre jour que celui où il a été calculé.
						{ etat: 'pret', valeur: { revelation, bilan, arreteAu } }
			}
		/>
	);
}
