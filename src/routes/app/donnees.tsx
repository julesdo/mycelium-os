import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { Page, PageHeader, PageBody } from '../../ui';
import { Donnees } from '../../screens/donnees/donnees';

export const Route = createFileRoute('/app/donnees')({ component: EcranDonnees });

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
function EcranDonnees() {
	const apercu = useQuery(api.rgpd.apercuDeMesDonnees, {});

	if (apercu === undefined) {
		return (
			<Page>
				<PageHeader titre="Vos données" />
				<PageBody>
					<p className="text-cladd-xs text-cladd-fg-soft">Chargement…</p>
				</PageBody>
			</Page>
		);
	}

	if (apercu === null) {
		return (
			<Page>
				<PageHeader titre="Vos données" />
				<PageBody>
					<p className="text-cladd-xs text-cladd-fg-soft">
						Aucun établissement actif. Créez-en un pour voir ce que nous détenons.
					</p>
				</PageBody>
			</Page>
		);
	}

	return (
		<Page>
			<PageHeader
				titre="Vos données"
				sousTitre="Ce que nous détenons, ce que vous pouvez en emporter, ce que vous pouvez en effacer."
			/>
			<PageBody>
				<Donnees apercu={apercu} />
			</PageBody>
		</Page>
	);
}
