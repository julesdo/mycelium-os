import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@cladd-ui/react';
import { CameraIcon } from 'lucide-react';
import { Page, PageHeader, PageBody, EmptyState } from '../../ui';

export const Route = createFileRoute('/app/')({ component: Pilotage });

/**
 * Le tableau de bord.
 *
 * Chantier 1 : seul l'état d'amorçage existe. Les trois taux, la répartition
 * par famille et le sélecteur d'exercice arrivent au chantier 2, quand ils
 * seront branchés sur `api.egalim.pilotage.tableauDeBord`.
 */
function Pilotage() {
	return (
		<Page>
			<PageHeader titre="Tableau de bord" sousTitre="Vos trois taux EGalim sur l'année civile." />
			<PageBody>
				<EmptyState
					titre="Commençons par vos factures."
					explication="Douze mois d'achats suffisent à calculer vos trois taux. Vous n'avez rien d'autre à préparer."
					etapes={[
						"Déposez vos factures. Un export comptable en CSV va le plus vite ; à défaut, les PDF et les photos conviennent.",
						'Nous lisons et classons chaque ligne contre le barème EGalim.',
						"Vous confirmez la viande, le poisson et ce dont nous doutons. Vos taux s'affichent."
					]}
					action={
						<Button as={Link} to="/app/factures" color="brand" variant="solid-fill">
							<CameraIcon />
							Déposer mes factures
						</Button>
					}
				/>
			</PageBody>
		</Page>
	);
}
