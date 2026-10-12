import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

/**
 * « Vos dépôts » EST DEVENU LE COFFRE-FORT (12/10/2026) — voir `coffre.tsx`.
 *
 * L'adresse reste, parce que des liens la portent encore (une notification
 * ancienne, un favori) : elle mène au coffre. Le bilan d'un dépôt
 * (`import-factures/$id`) mène au document dans le coffre.
 */
export const Route = createFileRoute('/app/import-factures')({
	beforeLoad: ({ location }) => {
		if (location.pathname.replace(/\/$/, '') === '/app/import-factures') {
			throw redirect({ to: '/app/coffre', replace: true });
		}
	},
	component: Outlet
});
