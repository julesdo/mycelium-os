/**
 * LES AVATARS QU'ON PEUT CHOISIR, ET COMMENT ILS SE DESSINENT.
 *
 * ⚠️ QUATRE STYLES, TOUS SOUS LICENCE CC0. DiceBear en propose une trentaine,
 * mais beaucoup portent un dessin sous CC BY, qui exige d'afficher l'auteur
 * partout où l'avatar paraît. Ces quatre-là n'exigent rien : le code est sous
 * MIT, et le dessin versé au domaine public (vérifié dans l'en-tête de chaque
 * paquet).
 *
 * ⚠️ UN AVATAR EST UNE DESCRIPTION, PAS UNE IMAGE. La base ne garde que le style
 * et la graine ; le même couple redonne le même dessin, ici, à chaque rendu.
 * D'où le cache : un dessin se calcule une fois par couple, pas à chaque rendu
 * de chaque avatar de la page.
 */
export const STYLES_AVATAR = ['notionists', 'lorelei', 'thumbs', 'shapes'] as const;
export type StyleAvatar = (typeof STYLES_AVATAR)[number];

export const LIBELLE_STYLE: Record<StyleAvatar, string> = {
	notionists: 'Croquis',
	lorelei: 'Portrait',
	thumbs: 'Bulle',
	shapes: 'Formes'
};

/**
 * LA BIBLIOTHÈQUE DE DÉPART — douze graines par style.
 *
 * Des prénoms plutôt que des chaînes au hasard : la graine n'est jamais montrée,
 * mais elle se relit dans la base, et « Camille » se comprend mieux qu'un
 * identifiant. « Proposer d'autres » les suffixe d'un numéro de série.
 */
export const GRAINES_DE_DEPART = [
	'Camille',
	'Louise',
	'Jules',
	'Hugo',
	'Alix',
	'Nina',
	'Paul',
	'Ines',
	'Leo',
	'Rose',
	'Victor',
	'Mila'
] as const;

/**
 * LES DESSINS DÉJÀ PROMIS, un par couple : chaque avatar se dessine une fois, et
 * le module de dessin ne se charge qu'au premier (`avatar-dessin.ts`).
 *
 * ⚠️ UNE PROMESSE STABLE PAR COUPLE, C'EST CE QUE `use()` EXIGE : une nouvelle
 * promesse à chaque rendu suspendrait l'avatar pour toujours.
 */
const promesses = new Map<string, Promise<string>>();

export function promesseImageAvatar(style: StyleAvatar, graine: string): Promise<string> {
	const cle = `${style}:${graine}`;
	const deja = promesses.get(cle);
	if (deja !== undefined) return deja;
	const promesse = import('./avatar-dessin').then(({ dessinerAvatar }) =>
		dessinerAvatar(style, graine)
	);
	promesses.set(cle, promesse);
	return promesse;
}
