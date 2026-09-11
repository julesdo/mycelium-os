import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { Page, PageHeader, PageBody } from '../../ui';
import { EcranCreance } from '../../screens/creance';

export const Route = createFileRoute('/app/creance/$id')({ component: Creance });

/**
 * Une créance, branchée sur la base.
 *
 * Tout le dessin vit dans `screens/creance.tsx`, qui ne sait pas interroger
 * Convex — c'est ce qui permet de l'OUVRIR aux quatre largeurs de référence
 * depuis la salle d'exposition, sans backend ni authentification. Ce fichier-ci
 * ne fait que lire et traduire.
 *
 * ⚠️ LES ANALYSES VIVENT SUR LEURS PROPRES PAGES, sous `/app/creance/$id/…`.
 * Cet écran n'en porte plus que le RÉSUMÉ : une rangée par sujet, un chiffre,
 * un chevron. Les sept cartes de prose qu'il empilait faisaient 6,1 écrans de
 * défilement sur un téléphone.
 */
function Creance() {
	const { id } = Route.useParams();
	const creanceId = id as Id<'creances'>;

	const creance = useQuery(api.recouvrement.lecture.creanceComplete, { creanceId });
	const suivi = useQuery(api.recouvrement.apresProcedure.suiviDeLaCreance, { creanceId });
	const dernier = useQuery(api.recouvrement.decompte.dernierDecompte, { creanceId });

	if (creance === undefined) {
		return (
			<Page>
				<PageHeader titre="Créance" />
				<PageBody>
					<p className="sr-only">Chargement…</p>
				</PageBody>
			</Page>
		);
	}

	return (
		<EcranCreance
			creance={creance}
			identifiant={id}
			etatProcedure={suivi?.libelle ?? null}
			totalDecompte={dernier?.total ?? null}
		/>
	);
}
