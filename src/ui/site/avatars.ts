import type { CSSProperties } from 'react';

/**
 * Les avatars des clients de démonstration, dans le téléphone de l'en-tête (maquette V26). Ici
 * parce que ce sont des couleurs : la muselière les refuse dans `marketing/`.
 */
const degrade = (a: string, b: string): CSSProperties => ({
	background: `linear-gradient(135deg,${a},${b})`
});

export const AVATARS_DE_LA_VITRINE = {
	roux: degrade('#7ec4c9', '#3d8f9e'),
	durand: degrade('#5b80f7', '#2a46c8'),
	vidal: degrade('#ffb79a', '#d9739a'),
	bati: degrade('#f2c27c', '#c98a3c'),
	rousseau: degrade('#8f7cf2', '#5b3fd4'),
	/** L'établissement de la démonstration, sur l'onglet Compte. */
	laurent: degrade('#8f7cf2', '#5b3fd4')
} as const;
