import { createFileRoute, Outlet, useChildMatches } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { ANALYSES, EcranCreance, type CleAnalyse } from '../../screens/creance';

export const Route = createFileRoute('/app/creance/$id')({
	component: Creance,
	errorComponent: CreanceEnErreur
});

/** L'erreur de la créance emporte son volet droit : rien de ce qu'il montrerait ne se lirait. */
function CreanceEnErreur() {
	return <EcranCreance donnees={{ etat: 'erreur' }} detail={null} analyseOuverte={null} />;
}

/**
 * L'analyse que l'adresse ouvre, lue sur la feuille des routes enfants.
 *
 * L'index (`/app/creance/$id/`) n'en ouvre aucune : son `routeId` finit par une
 * barre, son dernier segment est vide, et il rend `null`.
 */
function analyseDeLaFeuille(routeId: string | undefined): CleAnalyse | null {
	const segment = routeId?.split('/').pop();
	return ANALYSES.find((cle) => cle === segment) ?? null;
}

/**
 * Une créance, branchée sur la base.
 *
 * Tout le dessin vit dans `screens/creance.tsx`, qui ne sait pas interroger
 * Convex — c'est ce qui permet de l'OUVRIR aux quatre largeurs de référence
 * depuis la salle d'exposition, sans backend ni authentification. Ce fichier-ci
 * ne fait que lire et traduire.
 *
 * ⚠️ LES ANALYSES SONT SES ROUTES ENFANTS, sous `/app/creance/$id/…`. Cet écran
 * en porte le RÉSUMÉ à gauche, et l'`Outlet` les rend à droite à partir de
 * 1024 px. En dessous, l'analyse ouverte remplace la liste.
 */
function Creance() {
	const { id } = Route.useParams();
	const creanceId = id as Id<'creances'>;
	const feuille = useChildMatches({ select: (enfants) => enfants[enfants.length - 1]?.routeId });

	const creance = useQuery(api.recouvrement.lecture.creanceComplete, { creanceId });
	const suivi = useQuery(api.recouvrement.apresProcedure.suiviDeLaCreance, { creanceId });
	const dernier = useQuery(api.recouvrement.decompte.dernierDecompte, { creanceId });

	/**
	 * ⚠️ ON ATTEND AUSSI LE SUIVI ET LE DERNIER DÉCOMPTE. L'écran s'affichait dès
	 * la créance lue, et pendant l'aller-retour des deux autres il annonçait
	 * « Aucune voie » et un décompte « À produire » qui existaient peut-être.
	 */
	return (
		<EcranCreance
			detail={<Outlet />}
			analyseOuverte={analyseDeLaFeuille(feuille)}
			donnees={
				creance === undefined || suivi === undefined || dernier === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								identifiant: id,
								creance,
								etatProcedure: suivi?.libelle ?? null,
								totalDecompte: dernier?.total ?? null
							}
						}
			}
		/>
	);
}
