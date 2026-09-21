import { createAvatar } from '@dicebear/core';
import * as lorelei from '@dicebear/lorelei';
import * as notionists from '@dicebear/notionists';
import * as shapes from '@dicebear/shapes';
import * as thumbs from '@dicebear/thumbs';

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

/** Des fonds doux, les mêmes pour tous les styles : la bibliothèque se lit d'un bloc. */
const FONDS = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'];

const cache = new Map<string, string>();

export function imageAvatar(style: StyleAvatar, graine: string): string {
	const cle = `${style}:${graine}`;
	const deja = cache.get(cle);
	if (deja !== undefined) return deja;

	const options = { seed: graine, size: 96, backgroundColor: FONDS };
	const uri = (() => {
		switch (style) {
			case 'notionists':
				return createAvatar(notionists, options).toDataUri();
			case 'lorelei':
				return createAvatar(lorelei, options).toDataUri();
			case 'thumbs':
				return createAvatar(thumbs, options).toDataUri();
			case 'shapes':
				return createAvatar(shapes, options).toDataUri();
		}
	})();
	cache.set(cle, uri);
	return uri;
}
