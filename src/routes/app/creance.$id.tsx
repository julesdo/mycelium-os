import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * L'ANCIENNE ADRESSE D'UNE CRÉANCE, qui mène désormais à son dossier.
 *
 * ⚠️ GARDÉE POUR LES LIENS DÉJÀ PARTIS : courriels de notification, favoris,
 * historique du navigateur. Le dossier EST la créance (même identifiant) : la
 * redirection ne perd rien.
 */
export const Route = createFileRoute('/app/creance/$id')({
	beforeLoad: ({ params }) => {
		throw redirect({ to: '/app/dossier/$id', params: { id: params.id }, replace: true });
	}
});
