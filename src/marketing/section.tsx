import type { ReactNode } from 'react';
import { cn } from '../ui';

/**
 * Une section de la page d'accueil, avec son fond pleine largeur.
 *
 * POURQUOI CE COMPOSANT EXISTE. La première version posait toutes les sections
 * dans un unique conteneur centré, donc sur le même fond, du haut jusqu'au pied
 * de page. Le résultat était un mur beige de cinq mille pixels de haut où plus
 * rien ne se détachait : l'œil n'avait aucun repère pour savoir qu'il changeait
 * de sujet, et la page fatiguait avant d'avoir convaincu.
 *
 * Ici le fond est porté par la section elle-même, sur toute la largeur de la
 * fenêtre, et c'est un conteneur INTÉRIEUR qui borne la lecture. C'est la seule
 * structure qui permette un aplat de bord à bord ; le faire depuis un conteneur
 * déjà centré demanderait des marges négatives, c'est-à-dire des valeurs
 * arbitraires que le lint refuse à juste titre.
 *
 * LES QUATRE FONDS forment le rythme de la page, et ils ne sont pas
 * interchangeables :
 *
 *   `page`   le beige chaud du produit. Respiration, entrée et sortie.
 *   `claire` la surface haute, presque blanche. Pour les démonstrations, qui
 *            ont besoin du contraste maximal.
 *   `creuse` la surface enfoncée. Pour ce qui se met en retrait, les limites.
 *   `encre`  le bleu de la marque, texte inversé. Réservé à ce qui doit faire
 *            autorité, jamais à ce qui doit séduire.
 *
 * `encre` porte `cladd-color-brand`, sans quoi `--cladd-primary` retomberait sur
 * le neutre du kit et la section sortirait grise.
 */

const FONDS = {
	page: 'bg-cladd-bg',
	claire: 'bg-cladd-surface',
	creuse: 'bg-cladd-surface-cut',
	encre: 'cladd-color-brand bg-cladd-primary text-cladd-on-primary'
} as const;

export type FondSection = keyof typeof FONDS;

export function SectionMarketing({
	id,
	fond = 'page',
	className,
	children
}: {
	id?: string;
	fond?: FondSection;
	className?: string;
	children: ReactNode;
}) {
	return (
		<section id={id} className={cn('w-full', FONDS[fond])}>
			{/* Le rembourrage vertical double au-delà de la tablette. Soixante-douze
			    pixels en haut et en bas d'une section font une respiration sur un
			    écran large et un trou sur un téléphone. */}
			<div
				className={cn(
					'mx-auto flex w-full max-w-7xl flex-col gap-cladd-2xs px-cladd-2xs py-cladd-md md:py-cladd-2xl',
					className
				)}
			>
				{children}
			</div>
		</section>
	);
}
