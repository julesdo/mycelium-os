import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Button } from '@cladd-ui/react';
import { UploadIcon, UsersIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import { Page, PageHeader, PageBody, EmptyState, FluxEvenements } from '../../ui';

export const Route = createFileRoute('/app/recouvrement')({ component: Recouvrement });

/**
 * Le flux de surveillance — l'écran d'accueil du recouvrement.
 *
 * IL EST EN PREMIER PARCE QU'IL RÉPOND À LA SEULE QUESTION QUI COMPTE en
 * ouvrant le produit : « qu'est-ce qui a bougé, et combien ça pèse ». Une liste
 * de débiteurs répondrait « qui me doit de l'argent », ce qu'un gérant sait
 * déjà. Ce qu'il ne sait pas, c'est laquelle de ses créances va s'éteindre dans
 * cinquante-neuf jours.
 *
 * LE VIDE MONTRE LE CHEMIN, jamais des cadrans à zéro (règle d'écran n° 4). Un
 * établissement sans facture ne voit pas « 0 € identifiés » : il voit par où
 * commencer.
 */
function Recouvrement() {
	const flux = useQuery(api.recouvrement.surveillance.flux, {});

	const actions = (
		<>
			<Button as={Link} to="/app/debiteurs" size="md" variant="transparent">
				<UsersIcon />
				Débiteurs
			</Button>
			<Button as={Link} to="/app/import-factures" size="md" color="brand" variant="solid-fill">
				<UploadIcon />
				Importer
			</Button>
		</>
	);

	if (flux === undefined) {
		return (
			<Page>
				<PageHeader titre="À traiter" actions={actions} />
				<PageBody>
					<p className="sr-only">Chargement…</p>
				</PageBody>
			</Page>
		);
	}

	const rienASurveiller = flux.evenements.length === 0;

	return (
		<Page>
			<PageHeader
				titre="À traiter"
				sousTitre={
					rienASurveiller
						? undefined
						: `${flux.evenements.length} point${flux.evenements.length > 1 ? 's' : ''} d’attention`
				}
				actions={actions}
			/>
			<PageBody>
				{rienASurveiller ? (
					<EmptyState
						illustration="📬"
						titre="Rien à surveiller pour l’instant"
						explication="Le logiciel repérera de lui-même les échéances passées, les créances mûres et les prescriptions qui approchent. Il lui faut d’abord vos factures."
						etapes={[
							'Importez un export comptable — c’est le plus complet : il porte vos factures, vos règlements et vos clients d’un coup.',
							'À défaut, déposez vos factures de vente en PDF ou en photo.',
							'Précisez le secteur de vos débiteurs : c’est lui qui détermine le délai de prescription.'
						]}
						action={
							<Button as={Link} to="/app/import-factures" size="lg" color="brand" variant="solid-fill">
								<UploadIcon />
								Importer mes factures
							</Button>
						}
					/>
				) : (
					<FluxEvenements
						evenements={flux.evenements}
						montantIdentifie={flux.montantIdentifie}
						hypotheses={flux.hypotheses}
						anglesMorts={flux.anglesMorts}
					/>
				)}
			</PageBody>
		</Page>
	);
}
