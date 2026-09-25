import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * L'ANCIENNE ADRESSE DE LA LISTE DES CLIENTS. Gardée pour les liens déjà partis
 * (notifications, favoris) ; `?d=<id>` ouvre directement la page du client.
 */
export const Route = createFileRoute('/app/debiteurs')({
	validateSearch: (recherche: Record<string, unknown>): { d?: string } => {
		const d = recherche.d;
		return typeof d === 'string' && d.length > 0 ? { d } : {};
	},
	beforeLoad: ({ search }) => {
		if (search.d !== undefined) {
			throw redirect({ to: '/app/clients/$id', params: { id: search.d }, replace: true });
		}
		throw redirect({ to: '/app/clients', replace: true });
	}
});
