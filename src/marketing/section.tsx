import type { ReactNode } from 'react';
import { cn } from '../ui';

/**
 * Une section de la page d'accueil, avec son fond pleine largeur.
 *
 * CE QUI A CHANGÉ, ET POURQUOI. La version précédente empruntait les surfaces
 * de l'application : un beige chaud, une surface haute, une surface creuse. Sur
 * une page commerciale, ces trois fonds se ressemblent trop pour découper quoi
 * que ce soit, et le tout se lisait comme un gabarit de logiciel — des cartes
 * arrondies qui flottent sur du beige, vues mille fois.
 *
 * Il ne reste que TROIS fonds, et l'écart entre eux se voit de loin :
 *
 *   `papier`  le blanc. Le fond par défaut, celui du texte courant.
 *   `froid`   un gris très pâle et très froid. Il ne décore pas : il SÉPARE,
 *             et c'est sa seule fonction.
 *   `encre`   le bleu de nuit, texte inversé, avec sa trame. Réservé à ce qui
 *             doit faire autorité, jamais à ce qui doit séduire.
 *
 * LE FILET REMPLACE L'OMBRE. Chaque section se ferme par une règle d'un pixel
 * plutôt que de flotter au-dessus de la suivante. Une ombre dit « objet posé »,
 * un filet dit « article, clause, paragraphe » — et c'est exactement le registre
 * qu'un logiciel de conformité doit tenir.
 *
 * LES COULEURS SONT ABSOLUES, elles ne suivent pas le thème de l'application.
 * Chaque section peint son fond ET sa couleur de texte : voir l'en-tête du bloc
 * correspondant dans `tokens.css`.
 */

const FONDS = {
	papier: 'bg-papier text-plume',
	froid: 'bg-papier-froid text-plume',
	encre: 'encre-tramee text-plume-inversee'
} as const;

export type FondSection = keyof typeof FONDS;

export function SectionMarketing({
	id,
	fond = 'papier',
	filet = true,
	className,
	children
}: {
	id?: string;
	fond?: FondSection;
	/** La règle de fermeture. On la retire quand deux sections d'encre se suivent. */
	filet?: boolean;
	className?: string;
	children: ReactNode;
}) {
	return (
		<section
			id={id}
			className={cn(
				'w-full',
				FONDS[fond],
				filet && (fond === 'encre' ? 'border-b border-trait-encre' : 'border-b border-trait')
			)}
		>
			{/* Le rembourrage vertical double au-delà de la tablette. Soixante-douze
			    pixels en haut et en bas d'une section font une respiration sur un
			    écran large et un trou sur un téléphone. */}
			<div
				className={cn(
					'mx-auto flex w-full max-w-7xl flex-col gap-cladd-xs px-cladd-2xs py-cladd-2xl md:py-cladd-2xl',
					className
				)}
			>
				{children}
			</div>
		</section>
	);
}

/**
 * Le titre d'une section, et son chapeau.
 *
 * ÉCRIT UNE FOIS PARCE QU'IL SE RÉPÈTE SIX FOIS. Chaque section rejouait à la
 * main la même grappe de classes — corps, graisse, interlignage, largeur du
 * paragraphe — et deux d'entre elles avaient déjà divergé d'un cran.
 *
 * LA SERIF EST ICI, ET NULLE PART AILLEURS. C'est ce composant, et lui seul, qui
 * décide qu'un titre de la page publique s'écrit en Newsreader. Si la serif
 * devait un jour changer, elle changerait à un seul endroit — et surtout, elle
 * ne peut pas s'échapper dans un paragraphe.
 *
 * LE TITRE N'EST PAS EN GRAISSE MAXIMALE. Une serif de presse poussée à 800
 * devient une serif d'affiche publicitaire ; à 500, elle garde son autorité
 * d'imprimé. C'est le contraire du réglage d'une grotesque, où la graisse fait
 * le titre.
 */
export function TitreSection({
	sur,
	titre,
	chapeau,
	inverse = false
}: {
	/** Le sur-titre en capitales, quand la section en porte un. */
	sur?: string;
	titre: ReactNode;
	chapeau?: ReactNode;
	/** Sur fond d'encre : les tons doux ne peuvent pas venir de la plume foncée. */
	inverse?: boolean;
}) {
	return (
		<div className="flex flex-col gap-cladd-3xs">
			{sur ? (
				<span
					className={cn(
						'text-cladd-2xs font-semibold tracking-widest uppercase',
						inverse ? 'text-plume-inversee-douce' : 'text-plume-claire'
					)}
				>
					{sur}
				</span>
			) : null}
			{/* Sur l'encre, la serif monte d'une graisse. Un texte clair sur fond
			    sombre paraît plus fin qu'il ne l'est — la lumière déborde sur les
			    contours et ronge les déliés, ce dont une serif souffre plus qu'une
			    grotesque. 600 sur l'encre rend le poids que 500 donne sur le papier. */}
			<h2
				className={cn(
					'max-w-4xl font-serif text-titre-section-etroite leading-tight tracking-tight md:text-titre-section',
					inverse ? 'font-semibold' : 'font-medium'
				)}
			>
				{titre}
			</h2>
			{chapeau ? (
				<p
					className={cn(
						'max-w-2xl text-chapeau leading-relaxed font-normal',
						inverse ? 'text-plume-inversee-douce' : 'text-plume-douce'
					)}
				>
					{chapeau}
				</p>
			) : null}
		</div>
	);
}

/**
 * Le cadre d'une preuve : une capture d'écran, une photographie, un document.
 *
 * C'EST LE SEUL ENDROIT DE LA PAGE OÙ UNE BORDURE ENTOURE QUELQUE CHOSE. Le
 * texte, lui, vit à même le fond — sortir chaque paragraphe de sa boîte est le
 * geste qui distingue une page éditoriale d'une grille de cartes. La bordure
 * n'encadre donc que ce qui est montré : un écran du logiciel, une photo.
 *
 * `overflow-hidden` avec un rayon de deux pixels : assez pour qu'une photo ne
 * coupe pas comme une lame, trop peu pour redevenir une carte.
 */
export function Cadre({
	className,
	contentClassName,
	children
}: {
	className?: string;
	contentClassName?: string;
	children: ReactNode;
}) {
	return (
		<div className={cn('overflow-hidden rounded-net border border-trait bg-papier', className)}>
			<div className={contentClassName}>{children}</div>
		</div>
	);
}
