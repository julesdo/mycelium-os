import { useCallback, useSyncExternalStore } from 'react';

/**
 * OÙ EN EST LA LECTURE D'UN ARTICLE (06/10/2026) : la section que l'œil lit, et
 * si le fil d'Ariane est collé sous la barre.
 *
 * Le fondateur : « le fil d'Ariane doit être dynamique et suivre là où on est dans
 * le contenu de l'article ». Le fil porte donc un troisième maillon, la section
 * en cours, et le sommaire la marque ; les deux lisent ce module.
 *
 * ⚠️ UN MAGASIN EXTERNE, PAS UN ÉTAT POSÉ DANS UN EFFET : la position de lecture
 * appartient au navigateur. `useSyncExternalStore` la relit à chaque défilement,
 * et rend `null` côté serveur, où rien n'est lu.
 */

/** La respiration sous le fil : un intertitre la franchit avant de devenir « la section lue ». */
const MARGE_DE_LECTURE = 24;

function sAbonner(prevenir: () => void): () => void {
	window.addEventListener('scroll', prevenir, { passive: true });
	window.addEventListener('resize', prevenir);
	return () => {
		window.removeEventListener('scroll', prevenir);
		window.removeEventListener('resize', prevenir);
	};
}

/**
 * La dernière section dont le titre est passé sous le fil d'Ariane, ou `null`
 * avant la première et une fois l'article fini : le fil ne nomme pas une section
 * que le lecteur a quittée pour « À lire ensuite ».
 */
export function useSectionLue(
	ancres: readonly string[],
	ids: { readonly fil: string; readonly article: string }
): string | null {
	const cle = ancres.join(' ');
	const lire = useCallback((): string | null => {
		const fil = document.getElementById(ids.fil);
		const ligne = (fil?.getBoundingClientRect().bottom ?? 0) + MARGE_DE_LECTURE;
		const article = document.getElementById(ids.article);
		if (article !== null && article.getBoundingClientRect().bottom < ligne) return null;
		let lue: string | null = null;
		for (const ancre of cle.split(' ')) {
			const titre = document.getElementById(ancre);
			if (titre === null) continue;
			if (titre.getBoundingClientRect().top > ligne) break;
			lue = ancre;
		}
		return lue;
	}, [cle, ids.fil, ids.article]);
	return useSyncExternalStore(sAbonner, lire, () => null);
}

/**
 * Le fil est-il collé sous la barre ? Un repère de hauteur nulle le précède : au
 * repos, ils partagent le même haut ; collé, le fil reste en place et le repère
 * monte avec la page.
 */
export function useFilColle(ids: { readonly fil: string; readonly repere: string }): boolean {
	const lire = useCallback((): boolean => {
		const fil = document.getElementById(ids.fil);
		const repere = document.getElementById(ids.repere);
		if (fil === null || repere === null) return false;
		return fil.getBoundingClientRect().top - repere.getBoundingClientRect().top > 0.5;
	}, [ids.fil, ids.repere]);
	return useSyncExternalStore(sAbonner, lire, () => false);
}
