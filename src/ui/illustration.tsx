import { cn } from './cn';
import { illustrer } from './lexique';
import type { Famille } from './format';

/**
 * La vignette d'un produit : un lit pastel, une illustration au centre.
 *
 * C'est l'élément qui fait qu'une file de quatre-vingts produits se parcourt à
 * l'œil au lieu de se lire. Le lit porte la FAMILLE, l'illustration porte le
 * PRODUIT : deux niveaux de reconnaissance, l'un périphérique et l'autre
 * central, ce qui permet de repérer « il y a de la viande là-dedans » avant
 * même d'avoir lu un mot.
 *
 * Ce que la vignette ne dit JAMAIS, c'est la conformité. Le lit est un lavis de
 * famille, pas un verdict ; le vert, le rouge et l'ambre restent réservés aux
 * seuils. Un produit bio et un produit conventionnel de la même famille portent
 * exactement le même lit — la mention se lit en toutes lettres, à côté.
 */

const TEINTES: Record<Famille, string> = {
	VIANDE: 'bg-famille-viande',
	POISSON: 'bg-famille-poisson',
	FRUITS_LEGUMES: 'bg-famille-fruits-legumes',
	LAITIERS: 'bg-famille-laitiers',
	EPICERIE_SECHE: 'bg-famille-epicerie-seche',
	EPICERIE_APPERTISEE: 'bg-famille-epicerie-appertisee',
	BOISSONS: 'bg-famille-boissons',
	AUTRE: 'bg-famille-autre'
};

/* Les trois formats, et trois seulement. Chaque ligne tient ensemble la taille
 * du lit, celle de l'illustration et l'arrondi : les découpler laisserait
 * dériver la proportion, qui est ce qui distingue une vignette d'un emoji
 * posé dans du texte. */
const FORMATS = {
	sm: 'size-vignette-sm rounded-cladd-sm text-vignette-sm',
	md: 'size-vignette-md rounded-cladd-lg text-vignette-md',
	lg: 'size-vignette-lg rounded-cladd-2xl text-vignette-lg'
} as const;

export type TailleVignette = keyof typeof FORMATS;

export function Illustration({
	libelle,
	famille,
	estAlimentaire,
	taille = 'md',
	className
}: {
	libelle: string;
	famille?: Famille | null;
	estAlimentaire?: boolean | null;
	taille?: TailleVignette;
	className?: string;
}) {
	const emoji = illustrer(libelle, famille, estAlimentaire);
	return (
		<span
			// `aria-hidden` : l'illustration est un doublon visuel du libellé, qui
			// est toujours écrit à côté. La lire à voix haute dirait « carotte »
			// une seconde fois, et « couvert et fourchette » quand on ne sait pas.
			aria-hidden
			className={cn(
				'flex shrink-0 select-none items-center justify-center leading-none',
				FORMATS[taille],
				TEINTES[famille ?? 'AUTRE'],
				className
			)}
		>
			{emoji}
		</span>
	);
}
