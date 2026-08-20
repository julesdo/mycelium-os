/**
 * Ce que l'extraction sait ouvrir, et ce qu'elle refuse.
 *
 * Le refus se fait **avant** l'envoi, dans le navigateur. Faire patienter
 * quelqu'un pendant un téléversement pour lui dire ensuite « ça n'a pas
 * marché » est la pire façon de traiter un format non supporté, surtout quand
 * le geste correctif tient en une phrase.
 */

const EXTENSIONS_ACCEPTEES = new Set(['csv', 'txt', 'pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp']);

/** Les classeurs : très fréquents, et jamais lisibles tels quels. */
const CLASSEURS = new Set(['xlsx', 'xls', 'xlsm', 'ods', 'numbers']);

export const ACCEPT_HTML = '.csv,.txt,.pdf,.jpg,.jpeg,.png,.gif,.webp';

export interface Refus {
	fichier: string;
	raison: string;
}

function extension(nom: string): string {
	const point = nom.lastIndexOf('.');
	return point === -1 ? '' : nom.slice(point + 1).toLowerCase();
}

/**
 * Trie les fichiers en acceptés et refusés, avec pour chaque refus la marche à
 * suivre plutôt qu'un simple constat d'échec.
 */
export function trierFichiers(fichiers: readonly File[]): {
	acceptes: File[];
	refuses: Refus[];
} {
	const acceptes: File[] = [];
	const refuses: Refus[] = [];

	for (const f of fichiers) {
		const ext = extension(f.name);
		if (EXTENSIONS_ACCEPTEES.has(ext)) {
			acceptes.push(f);
		} else if (CLASSEURS.has(ext)) {
			refuses.push({
				fichier: f.name,
				raison:
					'Un classeur ne se lit pas directement. Ouvrez-le, puis « Enregistrer sous » au format CSV, et redéposez-le.'
			});
		} else {
			refuses.push({
				fichier: f.name,
				raison:
					'Format non pris en charge. Nous lisons les exports comptables en CSV, les PDF et les photos.'
			});
		}
	}

	return { acceptes, refuses };
}
