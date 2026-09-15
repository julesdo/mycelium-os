import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranDepot } from '../../screens/import/depot';

export const Route = createFileRoute('/app/import-factures_/$id')({
	component: PageDepot,
	errorComponent: DepotEnErreur
});

/**
 * Un dépôt d'un autre établissement, ou supprimé, fait lever `suivreImport`
 * (« Dépôt introuvable ») : l'écran en erreur garde son retour vers l'import.
 */
function DepotEnErreur() {
	return <EcranDepot donnees={{ etat: 'erreur' }} />;
}

/** Le bilan d'un dépôt, branché sur la base ; le dessin vit dans `screens/import/depot.tsx`. */
function PageDepot() {
	const { id } = Route.useParams();
	const importId = id as Id<'importsRecouvrement'>;
	const depot = useQuery(api.recouvrement.depotMutations.suivreImport, { importId });

	return (
		<EcranDepot
			donnees={
				depot === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								id,
								filename: depot.filename,
								statut: depot.statut,
								etape: depot.etape,
								erreur: depot.erreur,
								// ⚠️ PAS DE DATE DE DÉPÔT. Le suivi ne la rend pas : elle est déjà
								// sur la rangée d'où l'on vient. La fabriquer avec `Date.now()`
								// aurait affiché la date du JOUR sur un dépôt de l'an dernier.
								bilan: depot.bilan
							}
						}
			}
		/>
	);
}
