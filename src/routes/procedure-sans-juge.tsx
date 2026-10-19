import { createFileRoute } from '@tanstack/react-router';
import { Navbar, PageSansJuge, Pied } from '../marketing';
import { SITE_CANONIQUE } from '../lib/config/legal';

/**
 * LA PROCÉDURE SANS JUGE ET SA LISTE D'ATTENTE (19/10/2026, audit stratégique, décision 16).
 * Le contenu vit dans `marketing/page-sans-juge.tsx` ; l'état de la voie y est lu au registre.
 */
const TITRE = 'Procédure sans juge entre entreprises · Letikette';
const RESUME =
	'La voie sans tribunal pour une facture entre commerçants que le client ne conteste pas : ce qu’elle demande, comment elle se déroule, et quand elle s’ouvre.';

export const Route = createFileRoute('/procedure-sans-juge')({
	head: () => ({
		meta: [
			{ title: TITRE },
			{ name: 'description', content: RESUME },
			{ property: 'og:title', content: TITRE },
			{ property: 'og:description', content: RESUME },
			{ property: 'og:url', content: `${SITE_CANONIQUE}/procedure-sans-juge` }
		],
		links: [{ rel: 'canonical', href: `${SITE_CANONIQUE}/procedure-sans-juge` }]
	}),
	component: Page
});

function Page() {
	return (
		<main className="flex w-full flex-col bg-creme">
			<Navbar />
			<PageSansJuge />
			<Pied />
		</main>
	);
}
