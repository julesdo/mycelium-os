import { createFileRoute } from '@tanstack/react-router';
import { Page, PageHeader, PageBody } from '../../ui';

export const Route = createFileRoute('/app/factures')({ component: Factures });

function Factures() {
	return (
		<Page>
			<PageHeader titre="Factures" sousTitre="Déposez vos achats, nous les lisons." />
			<PageBody>
				<p className="text-cladd-xs text-cladd-fg-soft">
					Le dépôt est en cours de construction.
				</p>
			</PageBody>
		</Page>
	);
}
