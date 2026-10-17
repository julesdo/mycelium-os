import { createFileRoute } from '@tanstack/react-router';
import { Appel, Navbar, Pied } from '../marketing';
import { PageTaux } from '../marketing/page-taux';
import { SITE_CANONIQUE } from '../lib/config/legal';

/**
 * LE TAUX DES PÉNALITÉS DE RETARD, CE SEMESTRE (18/10/2026). Le titre de la page
 * porte le taux : c'est ce que cherche celui qui tape la question.
 *
 * ⚠️ LE CHARGEUR IMPORTE À LA DEMANDE, comme celui du blog : la série des taux n'a
 * rien à faire dans le paquet d'entrée.
 */
const URL_PAGE = `${SITE_CANONIQUE}/taux-des-penalites-de-retard`;

export const Route = createFileRoute('/taux-des-penalites-de-retard')({
	loader: async () => {
		const { semestreDe, tauxPenaliteParDefaut } =
			await import('../lib/verticales/recouvrement/pays/france/taux');
		const { tauxLisible } = await import('../lib/verticales/recouvrement/taux-lisible');
		const jour = new Date().toISOString().slice(0, 10);
		try {
			const [annee, moitie] = semestreDe(jour).split('-S');
			return {
				taux: tauxLisible(tauxPenaliteParDefaut(jour)),
				semestre: moitie === '1' ? `1er semestre ${annee}` : `2e semestre ${annee}`
			};
		} catch {
			return { taux: null, semestre: null };
		}
	},
	head: ({ loaderData }) => {
		const titre =
			loaderData?.taux == null
				? 'Le taux des pénalités de retard · Letikette'
				: `Taux des pénalités de retard : ${loaderData.taux} au ${loaderData.semestre} · Letikette`;
		const resume =
			loaderData?.taux == null
				? 'Le taux des pénalités de retard entre professionnels, le plancher d’un taux contractuel et l’indemnité forfaitaire, avec leurs sources.'
				: `Au ${loaderData.semestre}, les pénalités de retard entre professionnels courent à ${loaderData.taux} par an, sans clause contraire. Le plancher contractuel, l’indemnité forfaitaire et les semestres précédents, sourcés.`;
		return {
			meta: [
				{ title: titre },
				{ name: 'description', content: resume },
				{ property: 'og:title', content: titre },
				{ property: 'og:description', content: resume },
				{ property: 'og:url', content: URL_PAGE }
			],
			links: [{ rel: 'canonical', href: URL_PAGE }]
		};
	},
	component: Page
});

function Page() {
	return (
		<main className="flex w-full flex-col bg-creme">
			<Navbar />
			<PageTaux jour={new Date().toISOString().slice(0, 10)} />
			<Appel />
			<Pied />
		</main>
	);
}
