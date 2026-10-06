import { allArticles } from 'content-collections';

/**
 * LES ARTICLES DU BLOG, d'où qu'ils viennent (06/10/2026).
 *
 * Aujourd'hui, des fichiers MDX dans `content/blog/`, compilés au build par
 * content-collections (voir `content-collections.ts`) : aucun CMS, aucun
 * service, aucun coût. ⚠️ LES PAGES NE LISENT QUE CE MODULE. Le jour où un CMS
 * remplacera les fichiers, seul ce module change ; les routes, le flux RSS et le
 * plan du site suivent sans être retouchés.
 *
 * ⚠️ UN BROUILLON NE SORT JAMAIS EN PRODUCTION. Il se lit en local, pour la
 * relecture ; en ligne, il n'existe pas, ni dans la liste, ni à son adresse, ni
 * dans le flux, ni dans le plan du site.
 */
export type ArticleBlog = (typeof allArticles)[number];

export function articlesPublies(): readonly ArticleBlog[] {
	return allArticles
		.filter((article) => import.meta.env.DEV || !article.brouillon)
		.sort((a, b) => b.date.localeCompare(a.date));
}

export function articleParAdresse(adresse: string): ArticleBlog | undefined {
	return articlesPublies().find((article) => article.adresse === adresse);
}

/**
 * « 6 octobre 2026 », « 1er septembre 2026 », à partir d'une date `AAAA-MM-JJ`.
 * `Intl` écrit « 1 septembre » : le premier du mois prend son « er » à la main.
 */
export function dateLisible(iso: string): string {
	const [annee, mois, jour] = iso.split('-').map(Number);
	const texte = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'UTC'
	}).format(new Date(Date.UTC(annee ?? 1970, (mois ?? 1) - 1, jour ?? 1)));
	return jour === 1 ? texte.replace(/^1 /, '1er ') : texte;
}
