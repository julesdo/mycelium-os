import { createFileRoute } from '@tanstack/react-router';
import { articlesPublies } from '../../marketing/blog';
import { SITE_CANONIQUE } from '../../lib/config/legal';

/**
 * Le flux RSS du blog, pour les lecteurs de flux et les agrégateurs.
 *
 * Construit à la demande à partir de la même liste que la page : un brouillon
 * n'y entre jamais en production.
 */
function echapper(texte: string): string {
	return texte
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function flux(): string {
	const articles = articlesPublies();
	const elements = articles
		.map((article) => {
			const url = `${SITE_CANONIQUE}/blog/${article.adresse}`;
			return [
				'<item>',
				`<title>${echapper(article.titre)}</title>`,
				`<link>${url}</link>`,
				`<guid isPermaLink="true">${url}</guid>`,
				`<description>${echapper(article.description)}</description>`,
				`<category>${echapper(article.categorie)}</category>`,
				`<pubDate>${new Date(`${article.date}T08:00:00Z`).toUTCString()}</pubDate>`,
				'</item>'
			].join('');
		})
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Le blog de Letikette</title>
<link>${SITE_CANONIQUE}/blog</link>
<atom:link href="${SITE_CANONIQUE}/blog/rss.xml" rel="self" type="application/rss+xml"/>
<description>Les règles qui s’appliquent aux factures entre entreprises, expliquées simplement.</description>
<language>fr-FR</language>
${elements}
</channel>
</rss>
`;
}

export const Route = createFileRoute('/blog/rss.xml')({
	server: {
		handlers: {
			GET: () =>
				new Response(flux(), {
					headers: {
						'Content-Type': 'application/rss+xml; charset=utf-8',
						'Cache-Control': 'public, max-age=3600'
					}
				})
		}
	}
});
