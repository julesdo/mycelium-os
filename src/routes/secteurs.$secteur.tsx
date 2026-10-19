import { createFileRoute, notFound } from '@tanstack/react-router';
import { Appel, Navbar, Pied } from '../marketing';
import { PageSecteur } from '../marketing/page-secteur';
import { estSecteurPublic, pageDuSecteur } from '../marketing/secteurs';
import { SITE_CANONIQUE } from '../lib/config/legal';

/**
 * UNE PAGE PAR MÉTIER (18/10/2026) : `/secteurs/transport-routier`, `/batiment`,
 * `/services-aux-entreprises`. Les e-mails de prospection y mènent.
 *
 * ⚠️ LE CHARGEUR IMPORTE À LA DEMANDE : il part avec le routeur, donc avec chaque
 * page, et le registre juridique n'a rien à faire sur l'écran d'un dossier (voir
 * `blog/$adresse.tsx`).
 */
export const Route = createFileRoute('/secteurs/$secteur')({
	loader: async ({ params }) => {
		const secteurs = await import('../marketing/secteurs');
		if (!secteurs.estSecteurPublic(params.secteur)) throw notFound();
		const page = secteurs.pageDuSecteur(params.secteur, new Date().toISOString().slice(0, 10));
		return { secteur: page.secteur, nom: page.nom, titre: page.titre, chapeau: page.chapeau };
	},
	head: ({ loaderData: page }) => {
		if (page === undefined) return { meta: [{ title: 'Page introuvable · Letikette' }] };
		const url = `${SITE_CANONIQUE}/secteurs/${page.secteur}`;
		const titre = `${page.nom} : vos factures payées en retard · Letikette`;
		return {
			meta: [
				{ title: titre },
				{ name: 'description', content: page.chapeau },
				{ property: 'og:title', content: page.titre },
				{ property: 'og:description', content: page.chapeau },
				{ property: 'og:url', content: url }
			],
			links: [{ rel: 'canonical', href: url }]
		};
	},
	component: Page
});

function Page() {
	const { secteur } = Route.useParams();
	// Le chargeur a déjà levé `notFound` : ce cas ne se produit pas.
	if (!estSecteurPublic(secteur)) return null;
	const jour = new Date().toISOString().slice(0, 10);
	return (
		<main className="flex w-full flex-col bg-creme">
			<Navbar />
			<PageSecteur page={pageDuSecteur(secteur, jour)} jour={jour} />
			<Appel />
			<Pied />
		</main>
	);
}
