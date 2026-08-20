import { Outlet, createFileRoute } from '@tanstack/react-router';
import { Shell } from '../../app/shell';

/** Le layout de l'espace authentifié : rail de navigation et canevas. */
export const Route = createFileRoute('/app')({
	component: LayoutApp
});

function LayoutApp() {
	return (
		<Shell>
			<Outlet />
		</Shell>
	);
}
