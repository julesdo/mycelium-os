import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EcranDonnees } from '../../screens/donnees/donnees';

export const Route = createFileRoute('/app/donnees')({
	component: PageDonnees,
	errorComponent: DonneesEnErreur
});

function DonneesEnErreur() {
	return <EcranDonnees donnees={{ etat: 'erreur' }} />;
}

/**
 * L'écran « Vos données ».
 *
 * Il tient les trois promesses de la section 10 de la politique de
 * confidentialité — accès, portabilité, effacement — qui n'étaient adossées à
 * aucun code. Voir l'en-tête de `src/lib/convex/rgpd.ts` pour les trois
 * décisions qui structurent le backend correspondant.
 *
 * ⚠️ LES TROIS GESTES VIVENT SUR LEURS PROPRES PAGES, sous `/app/donnees/…`.
 * Cet écran ne porte plus que l'INVENTAIRE — la réponse à la question qu'on
 * vient poser, « qu'est-ce que vous détenez sur moi ? » — et trois rangées.
 *
 * Deux d'entre eux sont DESTRUCTEURS. On les croisait en faisant défiler, entre
 * un inventaire et un autre bouton rouge : un geste irréversible ne doit pas
 * être atteignable par accident, et 3,2 écrans de défilement en faisaient
 * exactement ça.
 */
function PageDonnees() {
	const apercu = useQuery(api.rgpd.apercuDeMesDonnees, {});

	return (
		<EcranDonnees
			donnees={apercu === undefined ? { etat: 'attente' } : { etat: 'pret', valeur: apercu }}
		/>
	);
}
