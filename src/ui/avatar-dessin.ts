import { createAvatar } from '@dicebear/core';
import * as lorelei from '@dicebear/lorelei';
import * as notionists from '@dicebear/notionists';
import * as shapes from '@dicebear/shapes';
import * as thumbs from '@dicebear/thumbs';
import type { StyleAvatar } from './avatar-dicebear';

/**
 * LE DESSIN D'UN AVATAR — chargé seulement quand un avatar dessiné s'affiche.
 *
 * ⚠️ À PART, ET C'EST UNE MESURE (09/10/2026). Les quatre styles pèsent un demi-
 * mégaoctet de JavaScript ; importés avec `Avatar`, ils partaient dans le paquet
 * de chaque page qui montre des initiales, c'est-à-dire presque toutes. Ils ne
 * servent qu'au profil de la personne connectée et à la bibliothèque où elle
 * choisit : `avatar-dicebear.ts` les charge à la demande.
 */

/** Des fonds doux, les mêmes pour tous les styles : la bibliothèque se lit d'un bloc. */
const FONDS = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'];

export function dessinerAvatar(style: StyleAvatar, graine: string): string {
	const options = { seed: graine, size: 96, backgroundColor: FONDS };
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
}
