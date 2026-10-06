import { createFileRoute } from '@tanstack/react-router';
import { articlesPublies } from '../marketing/blog';
import { SITE_CANONIQUE } from '../lib/config/legal';

/**
 * Le plan du site, pour les moteurs de recherche (06/10/2026).
 *
 * Les pages publiques seulement : l'accueil, le blog et ses articles, les
 * pages légales et l'inscription. Ni l'application (`/app`), ni les pages de
 * paiement d'un client (`/p/<jeton>`), qui sont privées par nature.
 */
const PAGES_FIXES = [
	'/',
	'/blog',
	'/inscription',
	'/mentions-legales',
	'/conditions-generales',
	'/politique-de-confidentialite',
	'/accord-de-sous-traitance'
];

function plan(): string {
	const fixes = PAGES_FIXES.map((chemin) => `<url><loc>${SITE_CANONIQUE}${chemin}</loc></url>`);
	const articles = articlesPublies().map(
		(article) =>
			`<url><loc>${SITE_CANONIQUE}/blog/${article.adresse}</loc><lastmod>${article.misAJour ?? article.date}</lastmod></url>`
	);
	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...fixes, ...articles].join('\n')}
</urlset>
`;
}

export const Route = createFileRoute('/sitemap.xml')({
	server: {
		handlers: {
			GET: () =>
				new Response(plan(), {
					headers: {
						'Content-Type': 'application/xml; charset=utf-8',
						'Cache-Control': 'public, max-age=3600'
					}
				})
		}
	}
});
