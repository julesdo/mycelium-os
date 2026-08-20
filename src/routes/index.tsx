import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * La racine renvoie sur l'application.
 *
 * Le site public (accueil, mentions, confidentialité) revient au chantier 4.
 * En attendant, la seule chose qui existe est le produit, et un gérant qui
 * tape le domaine doit y atterrir sans détour.
 */
export const Route = createFileRoute('/')({
	beforeLoad: () => {
		throw redirect({ to: '/app' });
	}
});
