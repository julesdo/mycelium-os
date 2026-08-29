import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * Le cadre de tablette qui porte l'aperçu du produit.
 *
 * POURQUOI UNE TABLETTE, ET PAS UNE CAPTURE POSÉE À PLAT. Ce produit se tient
 * dans les mains, en cuisine, entre deux services : c'est écrit dans son cahier
 * des charges — « tablette d'abord, paysage privilégié ». Montrer l'écran dans
 * son objet dit en une image ce qu'un paragraphe met dix lignes à expliquer, et
 * c'est la seule chose de la page qui réponde à « à quoi ça ressemble, en
 * vrai ».
 *
 * PAYSAGE, ET CENTRÉE. Le format est celui d'une tablette de onze pouces
 * couchée : 1180 × 824, soit 1,43. C'est un rapport qu'on reconnaît sans le
 * mesurer ; un 16/9 lirait « moniteur », un 4/3 « vieille tablette ».
 *
 * CE QUI FAIT QU'ELLE A L'AIR D'UN OBJET, et pas d'un rectangle noir :
 *
 *   La coque a une ARÊTE. Un aplat unique lit « bordure » ; le liseré clair
 *   d'un pixel sur le haut de la tranche lit « aluminium ».
 *
 *   L'ombre est DOUBLE. Une ombre de contact courte sous le bord — c'est elle
 *   qui POSE l'objet — et une ombre longue et diffuse, qui le DÉCOLLE du fond.
 *   Une seule des deux donne toujours l'un ou l'autre, jamais les deux. Elles
 *   vivent dans `--shadow-tablette`, avec le reste des ombres du produit.
 *
 *   Le CADRE SE RESSERRE en descendant l'échelle. Douze pixels de coque autour
 *   d'une tablette de mille pixels sont un liseré ; les mêmes douze autour de
 *   trois cent quarante sont un encadrement de photo de famille. Ils tombent
 *   donc à quatre, et les rayons suivent.
 *
 * CE QU'ELLE N'A PAS. Pas de bouton d'accueil, pas d'encoche, pas de reflet
 * diagonal en travers de l'écran. Le reflet, en particulier, est le réflexe de
 * maquette le plus répandu et le plus coûteux : il rend illisible le tiers de
 * l'écran qu'on est précisément en train de montrer.
 *
 * L'INTÉRIEUR EST HORS DU PARCOURS. L'aperçu est une IMAGE du produit : ses
 * boutons ne mènent nulle part, et un visiteur au clavier qui traverse la page
 * ne doit pas se retrouver piégé quinze tabulations dans une capture. `inert`
 * le retire de l'ordre de tabulation ET de l'arbre d'accessibilité d'un seul
 * attribut ; le cadre, lui, se présente comme ce qu'il est — une image, avec sa
 * description.
 *
 * La mise à l'échelle de l'intérieur n'est pas ici : elle tient en deux règles
 * CSS, `.tablette-ecran` et `.tablette-toile`, dans `app.css`, où le
 * contournement qu'elle demande est expliqué.
 */
export function Tablette({
	description,
	className,
	children
}: {
	/** Ce que l'écran montre, pour qui ne le voit pas. */
	description: string;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div
			role="img"
			aria-label={description}
			className={cn(
				'relative mx-auto w-full bg-coque shadow-tablette',
				'rounded-[18px] p-1 sm:rounded-[26px] sm:p-2 md:rounded-[34px] md:p-3',
				className
			)}
		>
			<div className="tablette-ecran relative overflow-hidden rounded-[13px] bg-cladd-bg sm:rounded-[19px] md:rounded-[24px]">
				<div className="tablette-toile" inert>
					{children}
				</div>
			</div>
		</div>
	);
}
