import { createFileRoute } from '@tanstack/react-router';
import { PageSecuriteDuSite } from '../marketing/site/page-securite';
import feuilleDuSite from '../styles/site/site.css?url';
import { SITE_CANONIQUE } from '../lib/config/legal';

/**
 * LA PAGE « SÉCURITÉ » (14/10/2026) : comment nous protégeons vos données.
 * Le contenu vit dans `marketing/site/page-securite.tsx` (les mesures, dans
 * `marketing/page-securite.tsx`) ; la politique de confidentialité fait foi.
 */
const TITRE = 'Sécurité · Letikette';
const RESUME =
	'Documents chiffrés dès leur arrivée sous une clé propre à votre entreprise, chaque accès noté, données cloisonnées : les mesures en place, et ce qu’elles ne font pas.';

export const Route = createFileRoute('/securite')({
	head: () => ({
		meta: [
			{ title: TITRE },
			{ name: 'description', content: RESUME },
			{ property: 'og:title', content: TITRE },
			{ property: 'og:description', content: RESUME },
			{ property: 'og:url', content: `${SITE_CANONIQUE}/securite` }
		],
		links: [
			{ rel: 'canonical', href: `${SITE_CANONIQUE}/securite` },
			{ rel: 'stylesheet', href: feuilleDuSite }
		]
	}),
	component: PageSecuriteDuSite
});
