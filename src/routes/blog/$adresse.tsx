import { createFileRoute, notFound } from '@tanstack/react-router';
import { PageArticleBlog } from '../../marketing/blog-pages';
import { articleParAdresse } from '../../marketing/blog';
import { SITE_CANONIQUE } from '../../lib/config/legal';

/**
 * Un article du blog.
 *
 * ⚠️ LE CHARGEUR NE RENVOIE PAS L'ARTICLE, seulement ce que l'en-tête lit (titre,
 * description, dates, image). Le contenu compilé est déjà dans le paquet de la
 * page ; le renvoyer par le chargeur le recopierait une seconde fois dans le
 * HTML. Une adresse inconnue, ou celle d'un brouillon en production, donne la
 * page introuvable.
 *
 * ⚠️ ET LA LISTE DES ARTICLES S'IMPORTE À LA DEMANDE (09/10/2026). Le chargeur et
 * l'en-tête se chargent avec le routeur, donc avec CHAQUE page : importée en
 * tête de fichier, la liste compilée de tous les articles (162 ko) partait avec
 * l'application, jusque sur l'écran d'un dossier.
 */
export const Route = createFileRoute('/blog/$adresse')({
	loader: async ({ params }) => {
		const { articleParAdresse: trouver } = await import('../../marketing/blog');
		const article = trouver(params.adresse);
		if (article === undefined) throw notFound();
		return {
			adresse: article.adresse,
			titre: article.titre,
			description: article.description,
			brouillon: article.brouillon,
			date: article.date,
			misAJour: article.misAJour,
			auteur: article.auteur,
			couverture: article.couverture?.src
		};
	},
	head: ({ loaderData: article }) => {
		if (article === undefined) return { meta: [{ title: 'Article introuvable · Letikette' }] };
		const url = `${SITE_CANONIQUE}/blog/${article.adresse}`;
		const image = `${SITE_CANONIQUE}${article.couverture ?? '/partage.png'}`;
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
