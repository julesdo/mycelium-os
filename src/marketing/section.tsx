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
 *   `papier`  une crème très pâle. Le fond par défaut, celui du texte courant.
 *   `chaud`   un sable, à peine plus soutenu. Il ne décore pas : il SÉPARE.
 *   `encre`   le bleu de nuit, texte inversé, avec sa trame. Réservé à ce qui
 *             doit faire autorité, jamais à ce qui doit séduire.
 *
 * ⚠️ LES DEUX FONDS CLAIRS SE SONT RÉCHAUFFÉS. Ils étaient blanc pur et gris
 * bleuté : corrects, et froids. Sur un produit dont le sujet est ce qu'on sert à
 * manger, la froideur est un contresens. Voir `tokens.css` pour la raison
 * complète, et pour pourquoi la chaleur ne vient pas d'un lavis vert.
 *
 * LE FILET SÉPARE LES SECTIONS, L'OMBRE POSE LES OBJETS. Une section se ferme
 * par une règle d'un pixel, ce qui la range dans le registre du document. Mais
 * ce qui est MONTRÉ à l'intérieur — un écran du logiciel, une photographie —
 * porte une ombre douce et des angles adoucis : un objet qu'on a envie de
 * toucher, pas une vignette collée sur une feuille.
 *
 * LES COULEURS SONT ABSOLUES, elles ne suivent pas le thème de l'application.
 * Chaque section peint son fond ET sa couleur de texte : voir l'en-tête du bloc
 * correspondant dans `tokens.css`.
 */

const FONDS = {
	papier: 'bg-papier text-plume',
	froid: 'bg-papier-chaud text-plume',
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
			{/*
			  ⚠️ LE VIDE A ÉTÉ DOUBLÉ, ET C'EST LA MOITIÉ DE LA CORRECTION.
			  L'autre moitié est l'échelle de corps, dans `tokens.css`.

			  Chaque section respirait soixante-douze pixels en haut et en bas, et
			  ses blocs internes vingt-huit. À ce régime, huit sections se touchent :
			  la page devient un mur de texte où rien n'a de place pour exister
			  séparément. C'est exactement le reproche qui lui a été fait.

			  Cent-douze pixels au-dessus de la tablette, et quarante entre les blocs
			  d'une même section. Le vide n'est pas de la place perdue : c'est lui
			  qui dit qu'un bloc est fini et qu'un autre commence, et c'est lui qui
			  fait la différence entre un document et une page où l'on a envie
			  d'entrer.
			*/}
			<div
				className={cn(
					'mx-auto flex w-full max-w-7xl flex-col gap-cladd-sm px-cladd-2xs py-cladd-2xl md:py-respiration',
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
			{/*
			  LE SUR-TITRE EST UNE PASTILLE, repris de la référence retenue. Posé nu
			  en capitales espacées, il se confondait avec le texte courant et
			  n'apportait rien ; dans un lit teinté, il redevient ce qu'il est — une
			  étiquette de section, qu'on lit avant le titre ou qu'on saute.

			  Elle est BLEUE et jamais verte : le vert de la référence est réservé
			  aux trois états de seuil, et les vraies jauges du produit sont sur
			  cette page. Voir `tokens.css`.
			*/}
			{sur ? (
				<span
					className={cn(
						'cladd-color-brand w-fit rounded-full px-cladd-3xs py-1 text-cladd-2xs font-semibold tracking-widest uppercase',
						inverse
							? 'bg-plume-inversee/12 text-plume-inversee-douce'
							: 'bg-cladd-primary/8 text-cladd-primary'
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
					'max-w-4xl font-serif text-titre-section leading-tight tracking-tight',
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
 * ⚠️ IL S'EST ADOUCI. Deux pixels de rayon et pas d'ombre, c'était une vignette
 * collée sur une feuille. Quatorze pixels, un fond crème et une ombre basse en
 * font un OBJET posé : c'est ce qui donne envie d'ouvrir le logiciel plutôt que
 * de lire la page. `haut` réserve l'ombre la plus marquée à la démonstration du
 * héros, qui est la seule à devoir attirer l'œil avant le texte.
 */
export function Cadre({
	haut = false,
	className,
	contentClassName,
	children
}: {
	/** L'ombre la plus marquée. Une seule par page, sinon plus rien ne se détache. */
	haut?: boolean;
	className?: string;
	contentClassName?: string;
	children: ReactNode;
}) {
	return (
		<div
			className={cn(
				'overflow-hidden rounded-net border border-trait bg-papier',
				haut ? 'shadow-pose-haute' : 'shadow-pose',
				className
			)}
		>
			<div className={contentClassName}>{children}</div>
		</div>
	);
}
