import { createFileRoute } from '@tanstack/react-router';
import { PageSite } from '../marketing/site/page';
import feuilleDuSite from '../styles/site/site.css?url';

/**
 * LE NOUVEAU SITE, EN CHANTIER (28/10/2026).
 *
 * La page d'accueil d'après la maquette V26 se construit ici, section par section, livrée en
 * production pour être vérifiée sur le vrai déploiement : ni indexée, ni liée nulle part, absente
 * du plan du site. Le jour où toutes les sections passent la comparaison au pixel, `/` la sert et
 * cette adresse disparaît. Voir `docs/superpowers/specs/2026-10-28-site-en-production.md`.
 */
export const Route = createFileRoute('/nouveau-site')({
	head: () => ({
		meta: [{ title: 'Letikette' }, { name: 'robots', content: 'noindex, nofollow' }],
		links: [{ rel: 'stylesheet', href: feuilleDuSite }]
	}),
	component: PageSite
});
