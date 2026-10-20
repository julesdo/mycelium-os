/**
 * LES ÉCRANS DONT UNE CAPTURE EXISTE (`public/ecrans/`), pour `<Capture ecran="…" />`.
 *
 * Le MDX n'est pas typé : un article qui appelle un écran sans capture compile, et le site
 * montre une image cassée. La relecture du CMS le dit, et le formulaire de l'éditeur ne
 * propose que ceux-ci. Sans import du site : l'action Convex qui publie lit ce module.
 * `captures.test.ts` vérifie que chaque écran a ses deux images.
 */
export const ECRANS_DE_CAPTURE = [
	'aujourdhui',
	'part-bientot',
	'plume-maison',
	'plume-geste',
	'plume-travail',
	'echeancier',
	'logiciels',
	'depot',
	'coffre',
	'sante',
	'defense',
	'paiement',
	'metier-transport-routier',
	'metier-transport-routier-cartes',
	'metier-batiment',
	'metier-batiment-cartes',
	'metier-services-aux-entreprises',
	'metier-services-aux-entreprises-cartes',
	'metier-fournisseurs-publics',
	'metier-fournisseurs-publics-cartes'
] as const;

/** Les écrans qu'un corps appelle sans que leur capture existe. */
export function capturesInconnues(corps: string): string[] {
	const connues = new Set<string>(ECRANS_DE_CAPTURE);
	const inconnues: string[] = [];
	for (const trouve of corps.matchAll(/<Capture[^>]*?ecran="([^"]+)"/g)) {
		const ecran = trouve[1] ?? '';
		if (!connues.has(ecran) && !inconnues.includes(ecran)) inconnues.push(ecran);
	}
	return inconnues;
}
