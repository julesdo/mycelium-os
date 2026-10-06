/**
 * L'ANCRE D'UN INTERTITRE DE BLOG : « Le point de départ » → `le-point-de-depart`.
 *
 * ⚠️ UNE SEULE FONCTION, DEUX USAGES. Le sommaire est calculé au build
 * (`content-collections.ts`) et l'`id` de l'intertitre au rendu (`mdx.tsx`).
 * S'ils ne passaient pas par la même fonction, un lien du sommaire pourrait
 * pointer vers une ancre qui n'existe pas, sans qu'aucune erreur ne le dise.
 */
export function ancreDe(texte: string): string {
	return texte
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
