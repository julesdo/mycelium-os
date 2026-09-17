import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranDepot } from '../../screens/import/depot';

export const Route = createFileRoute('/app/import-factures/$id')({
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

/** Le bilan d'un dépôt, branché sur la base ; le dessin vit dans `screens/import/`. */
function PageDepot() {
	const { id } = Route.useParams();
	const importId = id as Id<'importsRecouvrement'>;
	const depot = useQuery(api.recouvrement.depotMutations.suivreImport, { importId });

	/**
	 * LA DATE DE DÉPÔT, LUE SUR LA LISTE.
	 *
	 * ⚠️ `suivreImport` NE LA REND PAS, et cette page en a besoin pour une seule
	 * chose : dire depuis combien de temps une lecture n'a rien écrit. C'est le
	 * seul état du produit qui pouvait durer indéfiniment sans se distinguer
	 * d'un état normal — la tâche de lecture peut tomber entre son étape et son
	 * bilan, et plus rien ne la reprend.
	 *
	 * ⚠️ AUCUNE REQUÊTE DE PLUS EN PRATIQUE. `listerImports` est déjà souscrite
	 * par la route parente, qui reste montée ; Convex partage une souscription
	 * identique au lieu de la doubler.
	 *
	 * ⚠️ ET ELLE SE FABRIQUE ENCORE MOINS QU'AVANT. `Date.now()` afficherait la
	 * date du JOUR sur un dépôt de l'an dernier. Absente — un dépôt plus ancien
	 * que les vingt derniers — l'écran ne dit simplement rien sur l'ancienneté :
	 * il ne devine pas.
	 *
	 * Un dépôt terminé ou échoué n'en a aucun besoin : rien ne l'attend plus.
	 */
	const recents = useQuery(
		api.recouvrement.depotMutations.listerImports,
		depot !== undefined && depot.statut !== 'TERMINE' && depot.statut !== 'ECHOUE' ? {} : 'skip'
	);
	const deposeLe = recents?.find((ligne) => ligne._id === importId)?.deposeLe;

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
								bilan: depot.bilan,
								deposeLe
							}
						}
			}
		/>
	);
}
