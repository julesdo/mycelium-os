import { createFileRoute } from '@tanstack/react-router';
import { Page, PageHeader, PageBody } from '../../ui';

export const Route = createFileRoute('/app/confirmer')({ component: Confirmer });

function Confirmer() {
	return (
		<Page>
			<PageHeader titre="À confirmer" sousTitre="Ce qui engage votre responsabilité." />
			<PageBody>
				<p className="text-cladd-xs text-cladd-fg-soft">
					La file de confirmation est en cours de construction.
				</p>
			</PageBody>
		</Page>
	);
}
