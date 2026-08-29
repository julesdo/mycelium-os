import type { ReactNode } from 'react';
import { cn } from '../ui';

/**
 * Une section de la page d'accueil, avec son fond pleine largeur.
 *
 * ⚠️ CE QUI A CHANGÉ EN DERNIER, ET POURQUOI. La page tenait sur un vocabulaire
 * d'imprimé : des filets d'un pixel, des angles droits, du texte à même le
 * papier. Cohérent, défendable, et daté — le héros refait, le contraste entre
 * les deux moitiés de la page devenait le vrai défaut : en haut un objet posé
 * sur un lavis, en dessous un formulaire.
 *
 * Le vocabulaire s'aligne donc sur le haut de page. Ce qui change :
 *
 *   LES RÈGLES NOIRES DISPARAISSENT. `border-plume` — l'encre pleine — servait
 *   à encadrer les seuils légaux et les clauses. C'est le trait le plus dur de
 *   la page, et c'est lui qui donnait l'aspect « document administratif ». Un
 *   filet clair suffit à séparer ; le reste se fait au VIDE.
 *
 *   LE LAVIS D'AZUR devient un fond de section à part entière, et plus
 *   seulement celui du héros. Il sépare deux sections claires bien mieux qu'un
 *   sable dont l'écart au crème se compte en points de clarté.
 *
 *   ⚠️ ET SURTOUT : LA SURFACE POSÉE RESTE L'EXCEPTION. Une première tentative
 *   a remplacé chaque règle noire par une carte — bordure, rayon, ombre — et
 *   s'est fait renvoyer d'un mot juste : « ce n'est pas du tout naturel ». Une
 *   carte dit « ceci se détache » ; quand tout se détache, plus rien ne se
 *   détache. La liste fermée de ce qui a le droit d'en être une est dans
 *   l'en-tête d'`Inventaire`, et elle tient en trois entrées.
 *
 * CE QUI NE CHANGE PAS. Le filet qui FERME une section : c'est encore lui qui
 * dit qu'un sujet s'arrête.
 *
 * LES QUATRE FONDS, et l'écart entre eux se voit de loin :
 *
 *   `papier`  une crème très pâle. Le fond par défaut, celui du texte courant.
 *   `azur`    le lavis bleu du héros, qui s'éteint vers le crème.
 *   `chaud`   un sable, à peine plus soutenu.
 *   `encre`   le bleu de nuit, texte inversé, avec sa trame. Réservé à ce qui
 *             doit faire autorité, jamais à ce qui doit séduire.
 *
 * LES COULEURS SONT ABSOLUES, elles ne suivent pas le thème de l'application.
 * Chaque section peint son fond ET sa couleur de texte : voir l'en-tête du bloc
 * correspondant dans `tokens.css`.
 */

const FONDS = {
	papier: 'bg-papier text-plume',
	azur: 'bg-linear-to-b from-azur-clair via-papier to-papier text-plume',
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
				// LA BARRE EST EN `fixed`, DONC ELLE MASQUE LES ANCRES. Un saut vers
				// `#la-loi` amène le haut de la section au haut de la FENÊTRE, c'est-à-dire
				// sous la barre : le sur-titre et la première ligne du titre disparaissent.
				// `scroll-margin-top` est la seule propriété qui corrige ça, et elle ne se
				// pose que là où il y a une ancre à viser.
				id && 'scroll-mt-barre-publique',
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
 * L'inventaire : une suite d'entrées, séparées par un filet clair.
 *
 * ⚠️ CE N'EST PLUS UN PANNEAU, ET C'EST LA CORRECTION LA PLUS IMPORTANTE DE LA
 * PAGE. Il y a eu ici un composant `Panneau` — surface crème, bordure, rayon,
 * ombre — appliqué aux seuils légaux, aux formats acceptés, aux clauses et aux
 * raisons de l'abonnement. Verdict du terrain, et il est juste : « des effets de
 * cartes partout, ce n'est pas du tout naturel ».
 *
 * L'erreur de raisonnement est identifiable. Les règles d'encre pleine qu'il
 * remplaçait étaient bien un défaut ; j'en ai conclu qu'il fallait mettre une
 * SURFACE, alors qu'il fallait seulement adoucir le TRAIT. Une carte n'est pas
 * la version moderne d'une règle noire : c'est un objet, et un objet dit « ceci
 * se détache du reste ». Quand tout se détache, plus rien ne se détache, et la
 * page redevient une grille de vignettes — exactement ce qu'on passe six mois
 * à fuir.
 *
 * CE QUI A LE DROIT D'ÊTRE UNE SURFACE, SUR TOUTE LA PAGE, et la liste est
 * fermée :
 *
 *   la tablette du héros, qui EST le produit ;
 *   les trois écrans de démonstration et la photographie, dans `Cadre` ;
 *   le document de la section « preuve », parce qu'il est blanc sur l'encre et
 *     qu'il doit se lire comme une pièce qu'on sort d'un dossier.
 *
 * Tout le reste — texte, listes, chiffres, y compris les trois seuils de la
 * loi — vit À MÊME LE FOND. Ce qui sépare est un filet clair, ou du vide.
 */
export function Inventaire({
	as: Balise = 'div',
	className,
	children
}: {
	/** La balise portée, quand le contenu a une sémantique — `dl` pour une liste
	 *  de définitions. Un lecteur d'écran ne voit pas les filets, il voit la
	 *  nature de la liste. */
	as?: 'div' | 'dl' | 'ul';
	className?: string;
	children: ReactNode;
}) {
	// `divide-*` ne dessine qu'ENTRE les enfants : jamais de trait qui pend au
	// premier ni au dernier, donc jamais de boîte implicite.
	return <Balise className={cn('divide-y divide-trait', className)}>{children}</Balise>;
}

/**
 * L'exergue : la phrase qui doit rester quand tout le reste est oublié.
 *
 * IL Y EN A DEUX SUR LA PAGE, et pas une de plus. « Local ne compte pas », et
 * « c'est exactement votre cabinet comptable ». Ce sont les deux phrases qui
 * retournent une conviction ; les mettre au même niveau typographique que le
 * reste, c'est parier qu'elles seront lues, ce qui est perdu d'avance.
 *
 * ⚠️ IL N'EST PAS DANS UNE CARTE. Il en a porté une — surface, bordure, ombre —
 * et c'était une faute du même ordre que les autres : ce qui fait qu'une phrase
 * ressort n'est pas le contenant, c'est le CORPS et le VIDE autour. Une citation
 * de cinquante-six pixels n'a besoin d'aucune boîte pour qu'on la voie.
 *
 * Ce qui reste est le strict nécessaire : une barre arrondie en accent, qui dit
 * « citation » en un trait. Elle a remplacé un filet noir de quatre pixels, la
 * citation de bloc du web de 2010. La couleur est celle de la marque, la seule
 * autorisée hors des jauges : ni verte, ni ambre, ni rouge, qui ne veulent dire
 * qu'une chose dans tout le produit.
 */
export function Exergue({
	phrase,
	appui,
	inverse = false,
	className
}: {
	phrase: ReactNode;
	/** La ligne qui explique, sous la phrase. */
	appui?: ReactNode;
	/** Sur fond d'encre. */
	inverse?: boolean;
	className?: string;
}) {
	return (
		<blockquote className={cn('cladd-color-brand flex max-w-4xl gap-cladd-2xs', className)}>
			<span
				aria-hidden
				className={cn(
					'w-1 shrink-0 rounded-full',
					inverse ? 'bg-plume-inversee/40' : 'bg-cladd-primary'
				)}
			/>
			<div className="flex flex-col gap-cladd-3xs">
				<p
					className={cn(
						'font-serif text-titre-section leading-tight font-medium',
						inverse ? 'text-plume-inversee' : 'text-plume'
					)}
				>
					{phrase}
				</p>
				{appui ? (
					<p
						className={cn(
							'text-cladd-md leading-relaxed font-normal',
							inverse ? 'text-plume-inversee-douce' : 'text-plume-douce'
						)}
					>
						{appui}
					</p>
				) : null}
			</div>
		</blockquote>
	);
}

/**
 * Le cadre d'une preuve : une capture d'écran, une photographie, un document.
 *
 * C'EST LA SEULE SURFACE POSÉE DE LA PAGE, avec la tablette du héros et le
 * document de la section « preuve ». Le texte, les listes et les chiffres vivent
 * à même le fond ; le cadre, c'est pour ce qui est MONTRÉ. Voir l'en-tête
 * d'`Inventaire` pour ce que cette règle a coûté à apprendre.
 *
 * ⚠️ IL S'EST ADOUCI. Deux pixels de rayon et pas d'ombre, c'était une vignette
 * collée sur une feuille. Le rayon de panneau, un fond crème et une ombre basse
 * en font un OBJET posé : c'est ce qui donne envie d'ouvrir le logiciel plutôt
 * que de lire la page. `haut` réserve l'ombre la plus marquée à ce qui doit
 * attirer l'œil avant le texte.
 */
export function Cadre({
	haut = false,
	className,
	contentClassName,
	children
}: {
	/** L'ombre la plus marquée. Une seule par section, sinon plus rien ne se détache. */
	haut?: boolean;
	className?: string;
	contentClassName?: string;
	children: ReactNode;
}) {
	return (
		<div
			className={cn(
				'overflow-hidden rounded-panneau border border-trait bg-papier',
				haut ? 'shadow-pose-haute' : 'shadow-pose',
				className
			)}
		>
			<div className={contentClassName}>{children}</div>
		</div>
	);
}
