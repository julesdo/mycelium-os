import { createFileRoute } from '@tanstack/react-router';
import { Navbar, PageExpertsComptables, Pied } from '../marketing';
import { SITE_CANONIQUE } from '../lib/config/legal';

/**
 * LA PAGE DES EXPERTS-COMPTABLES (19/10/2026, audit stratégique, décision 15) : le
 * diagnostic à proposer aux clients du cabinet, et le partenariat. Le contenu vit dans
 * `marketing/page-experts.tsx`.
 */
const TITRE = 'Experts-comptables · Letikette';
const RESUME =
	'Proposez à vos clients le diagnostic de leurs factures payées en retard et de ce qu’on leur doit encore. Le cabinet reçoit une part de la première année des clients qui s’abonnent.';

export const Route = createFileRoute('/experts-comptables')({
	head: () => ({
		meta: [
			{ title: TITRE },
			{ name: 'description', content: RESUME },
			{ property: 'og:title', content: TITRE },
			{ property: 'og:description', content: RESUME },
			{ property: 'og:url', content: `${SITE_CANONIQUE}/experts-comptables` }
		],
		links: [{ rel: 'canonical', href: `${SITE_CANONIQUE}/experts-comptables` }]
	}),
	component: Page
});

function Page() {
	return (
		<main className="flex w-full flex-col bg-creme">
			<Navbar />
			<PageExpertsComptables />
			<Pied />
		</main>
	);
}
