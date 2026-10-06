import { createFileRoute } from '@tanstack/react-router';
import { PageListeBlog } from '../../marketing/blog-pages';
import { SITE_CANONIQUE } from '../../lib/config/legal';

/** La liste des articles. Le contenu vit dans `content/blog/`, voir son README. */
const DESCRIPTION =
	'Pénalités de retard, frais de recouvrement, délais pour agir : les règles qui s’appliquent aux factures entre entreprises, expliquées simplement.';

export const Route = createFileRoute('/blog/')({
	head: () => ({
		meta: [
			{ title: 'Blog · Letikette' },
			{ name: 'description', content: DESCRIPTION },
			{ property: 'og:type', content: 'website' },
			{ property: 'og:site_name', content: 'Letikette' },
			{ property: 'og:locale', content: 'fr_FR' },
			{ property: 'og:url', content: `${SITE_CANONIQUE}/blog` },
			{ property: 'og:title', content: 'Blog · Letikette' },
			{ property: 'og:description', content: DESCRIPTION },
			{ property: 'og:image', content: `${SITE_CANONIQUE}/partage.png` },
			{ name: 'twitter:card', content: 'summary_large_image' }
		],
		links: [
			{ rel: 'canonical', href: `${SITE_CANONIQUE}/blog` },
			{
				rel: 'alternate',
				type: 'application/rss+xml',
				title: 'Le blog de Letikette',
				href: `${SITE_CANONIQUE}/blog/rss.xml`
			}
		]
	}),
	component: PageListeBlog
});
