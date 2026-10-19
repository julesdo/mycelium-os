import { createFileRoute } from '@tanstack/react-router';
import { Appel, Navbar, PageFondateur, Pied } from '../marketing';
import { SITE_CANONIQUE } from '../lib/config/legal';

/**
 * QUI EST DERRIÈRE LETIKETTE (19/10/2026, audit stratégique, décision 14). Le contenu vit
 * dans `marketing/page-fondateur.tsx` ; l'identité y est lue dans `LEGAL_CONFIG`.
 */
const TITRE = 'Qui sommes-nous · Letikette';
const RESUME =
	'Qui édite Letikette, ce que le logiciel s’interdit, et comment joindre son fondateur.';

export const Route = createFileRoute('/fondateur')({
	head: () => ({
		meta: [
			{ title: TITRE },
			{ name: 'description', content: RESUME },
			{ property: 'og:title', content: TITRE },
			{ property: 'og:description', content: RESUME },
			{ property: 'og:url', content: `${SITE_CANONIQUE}/fondateur` }
		],
		links: [{ rel: 'canonical', href: `${SITE_CANONIQUE}/fondateur` }]
	}),
	component: Page
});

function Page() {
	return (
		<main className="flex w-full flex-col bg-creme">
			<Navbar />
			<PageFondateur />
			<Appel />
			<Pied />
		</main>
	);
}
