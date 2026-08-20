import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Button, Chip } from '@cladd-ui/react';
import { CameraIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import {
	Page,
	PageHeader,
	PageBody,
	EmptyState,
	Tableau,
	TableauEntete,
	TableauCorps,
	TableauLigne,
	TableauTitre,
	TableauCellule,
	pourcent
} from '../../ui';

export const Route = createFileRoute('/app/diagnostics')({ component: Diagnostics });

const DATE = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' });

/**
 * L'historique des mesures.
 *
 * Un diagnostic est une preuve datée. Celui de mars doit rester retrouvable en
 * juin, et celui de l'an dernier en cas de contrôle. C'est aussi le seul écran
 * où le gérant voit sa trajectoire : trois exercices côte à côte disent s'il
 * progresse, ce qu'aucun taux isolé ne dit.
 */
function Diagnostics() {
	const navigate = useNavigate();
	const liste = useQuery(api.egalim.diagnostics.listerDiagnostics, {});

	if (liste === undefined) {
		return (
			<Page>
				<PageHeader titre="Diagnostics" />
				<PageBody>
					<p className="text-cladd-xs text-cladd-fg-soft">Chargement de vos diagnostics…</p>
				</PageBody>
			</Page>
		);
	}

	if (liste.length === 0) {
		return (
			<Page>
				<PageHeader titre="Diagnostics" sousTitre="Vos mesures figées, exercice par exercice." />
				<PageBody>
					<EmptyState
						titre="Aucune mesure figée pour l'instant."
						explication="Un diagnostic se produit quand un dépôt est entièrement classé et confirmé. Il fixe vos trois taux à une date, et ne bouge plus : c'est ce qui en fait une preuve."
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

	return (
		<Page>
			<PageHeader
				titre="Diagnostics"
				sousTitre="Vos mesures figées, de la plus récente à la plus ancienne."
			/>
			<PageBody>
				<Tableau legende="Diagnostics produits">
					<TableauEntete>
						<TableauTitre>Exercice</TableauTitre>
						<TableauTitre>Mesuré le</TableauTitre>
						<TableauTitre aDroite>Durable</TableauTitre>
						<TableauTitre aDroite>Bio</TableauTitre>
						<TableauTitre aDroite>Viande et poisson</TableauTitre>
						<TableauTitre>État</TableauTitre>
					</TableauEntete>
					<TableauCorps>
						{liste.map((d) => (
							<TableauLigne key={d.diagnosticId}>
								<TableauCellule>
									<button
										type="button"
										onClick={() =>
											void navigate({
												to: '/app/diagnostic/$id',
												params: { id: d.diagnosticId }
											})
										}
										className="min-h-cladd-lg font-medium underline underline-offset-2"
									>
										{d.periodStart.slice(0, 4)}
									</button>
								</TableauCellule>
								<TableauCellule chiffre>{DATE.format(new Date(d.computedAt))}</TableauCellule>
								<TableauCellule aDroite chiffre>
									{pourcent(d.ratios.durable)}
								</TableauCellule>
								<TableauCellule aDroite chiffre>
									{pourcent(d.ratios.bio)}
								</TableauCellule>
								<TableauCellule aDroite chiffre>
									{pourcent(d.ratios.meatFishDurable)}
								</TableauCellule>
								<TableauCellule>
									<Chip size="sm">{d.status === 'DELIVERED' ? 'Remis' : 'Brouillon'}</Chip>
								</TableauCellule>
							</TableauLigne>
						))}
					</TableauCorps>
				</Tableau>
			</PageBody>
		</Page>
	);
}
