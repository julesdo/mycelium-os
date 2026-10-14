import { createFileRoute } from '@tanstack/react-router';
import { Appel, Faq, Navbar, Pied, Tarifs, questionsDeFacturation } from '../marketing';
import { SITE_CANONIQUE } from '../lib/config/legal';
import { DUREE_ESSAI_JOURS } from '../lib/config/tarifs';

/**
 * LA PAGE DES TARIFS (14/10/2026). L'accueil montre les trois formules en
 * carrousel et mène ici : la liste entière de chaque formule, Découverte, le sur
 * mesure, et les questions qu'on se pose avant de payer. Les montants viennent
 * de `config/tarifs.ts`, comme partout.
 */
const TITRE = 'Tarifs · Letikette';
const RESUME = `Découverte gratuite, puis Solo, Équipe ou Pro, au mois ou à l’année. ${DUREE_ESSAI_JOURS} jours d’essai, 0 € aujourd’hui, sans engagement.`;

export const Route = createFileRoute('/tarifs')({
	head: () => ({
		meta: [
			{ title: TITRE },
			{ name: 'description', content: RESUME },
			{ property: 'og:title', content: TITRE },
			{ property: 'og:description', content: RESUME },
			{ property: 'og:url', content: `${SITE_CANONIQUE}/tarifs` }
		],
		links: [{ rel: 'canonical', href: `${SITE_CANONIQUE}/tarifs` }]
	}),
	component: Page
});

function Page() {
	return (
		<main className="flex w-full flex-col bg-creme pt-barre-publique">
			<Navbar />
			<Tarifs complet />
			<Faq
				id="questions-facturation"
				titre="Avant de payer."
				questions={questionsDeFacturation()}
			/>
			<Appel />
			<Pied />
		</main>
	);
}
