import { createFileRoute, notFound } from '@tanstack/react-router';
import { PageArticleBlog } from '../../marketing/blog-pages';
import { articleParAdresse } from '../../marketing/blog';
import { SITE_CANONIQUE } from '../../lib/config/legal';

/**
 * Un article du blog.
 *
 * ⚠️ LE CHARGEUR NE RENVOIE PAS L'ARTICLE, il vérifie seulement qu'il existe.
 * Le contenu compilé est déjà dans le paquet de la page ; le renvoyer par le
 * chargeur le recopierait une seconde fois dans le HTML. Une adresse inconnue,
 * ou celle d'un brouillon en production, donne la page introuvable.
 */
export const Route = createFileRoute('/blog/$adresse')({
	loader: ({ params }) => {
		if (articleParAdresse(params.adresse) === undefined) throw notFound();
	},
	head: ({ params }) => {
		const article = articleParAdresse(params.adresse);
		if (article === undefined) return { meta: [{ title: 'Article introuvable · Letikette' }] };
		const url = `${SITE_CANONIQUE}/blog/${article.adresse}`;
		const image = `${SITE_CANONIQUE}${article.couverture?.src ?? '/partage.png'}`;
		return {
			meta: [
				{ title: `${article.titre} · Letikette` },
				{ name: 'description', content: article.description },
				...(article.brouillon ? [{ name: 'robots', content: 'noindex' }] : []),
				{ property: 'og:type', content: 'article' },
				{ property: 'og:site_name', content: 'Letikette' },
				{ property: 'og:locale', content: 'fr_FR' },
				{ property: 'og:url', content: url },
				{ property: 'og:title', content: article.titre },
				{ property: 'og:description', content: article.description },
				{ property: 'og:image', content: image },
				{ property: 'article:published_time', content: article.date },
				...(article.misAJour === undefined
					? []
					: [{ property: 'article:modified_time', content: article.misAJour }]),
				{ name: 'twitter:card', content: 'summary_large_image' }
			],
			links: [{ rel: 'canonical', href: url }],
			scripts: [
				{
					type: 'application/ld+json',
					children: JSON.stringify({
						'@context': 'https://schema.org',
						'@type': 'BlogPosting',
						headline: article.titre,
						description: article.description,
						datePublished: article.date,
						dateModified: article.misAJour ?? article.date,
						author: { '@type': 'Organization', name: article.auteur },
						publisher: { '@type': 'Organization', name: 'Letikette', url: SITE_CANONIQUE },
						image,
						mainEntityOfPage: url,
						inLanguage: 'fr-FR'
					})
				}
			]
		};
	},
	component: Article
});

function Article() {
	const { adresse } = Route.useParams();
	const article = articleParAdresse(adresse);
	// Le chargeur a déjà levé `notFound` : ce cas ne se produit pas.
	if (article === undefined) return null;
	return <PageArticleBlog article={article} />;
}
