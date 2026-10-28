import { createFileRoute } from '@tanstack/react-router';
import { PageTarifs } from '../marketing/site/page-tarifs';
import feuilleDuSite from '../styles/site/site.css?url';

/**
 * LA PAGE DES TARIFS DU NOUVEAU SITE, EN CHANTIER (28/10/2026). Comme `/nouveau-site` : ni
 * indexée, ni liée nulle part. Le jour de la bascule, `/tarifs` la sert.
 */
export const Route = createFileRoute('/nouveau-site_/tarifs')({
	head: () => ({
		meta: [{ title: 'Tarifs · Letikette' }, { name: 'robots', content: 'noindex, nofollow' }],
		links: [{ rel: 'stylesheet', href: feuilleDuSite }]
	}),
	component: PageTarifs
});
