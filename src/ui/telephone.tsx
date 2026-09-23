import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * Le cadre de téléphone qui porte l'aperçu du produit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI UN TÉLÉPHONE À CÔTÉ DE LA TABLETTE, ET PAS À SA PLACE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le cahier des charges dit « tablette d'abord, paysage privilégié », et c'est
 * vrai de l'USAGE : un dirigeant traite ses créances assis, sur un grand écran.
 * Ce n'est pas vrai de la VISITE. La page d'accueil s'ouvre sur un téléphone,
 * dans une salle d'attente, entre deux rendez-vous — et l'objet qu'on montre à
 * quelqu'un devrait être celui qu'il a en main.
 *
 * Le second gain est de composition : un téléphone est VERTICAL. Une tablette
 * en paysage remplit la largeur et ne laisse rien à côté d'elle, ce qui oblige
 * le texte à passer au-dessus, centré. Un téléphone tient dans une colonne, et
 * c'est ce qui rend possible le premier écran en deux temps — la phrase d'un
 * côté, le logiciel de l'autre.
 *
 * ⚠️ 390 × 844, ET CE N'EST PAS UN CHOIX ESTHÉTIQUE. C'est la fenêtre d'un
 * iPhone 14/15 en points CSS, c'est-à-dire la largeur exacte à laquelle le
 * produit rend sa disposition téléphone. Toute autre valeur montrerait une mise
 * en page qui n'existe nulle part.
 *
 * LA MISE À L'ÉCHELLE N'EST PAS ICI : elle tient en deux règles CSS,
 * `.telephone-ecran` et `.maquette-toile` dans `app.css`, où le contournement
 * qu'elle demande est expliqué. La toile garde ses 390 px et se RÉDUIT
 * optiquement à la largeur de sa colonne — elle ne se redispose jamais, sans
 * quoi on montrerait une mise en page qui n'est pas celle du produit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUI FAIT QU'IL A L'AIR D'UN OBJET
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les mêmes trois pièces que la tablette, et elles ne sont pas décoratives :
 * une ARÊTE de lumière sur la tranche haute, qui fait l'aluminium ; une ombre
 * de CONTACT courte, qui le pose ; une ombre LONGUE et diffuse, qui le décolle
 * du fond. Retirer la deuxième le fait flotter, retirer la troisième l'aplatit.
 *
 * ⚠️ NI ENCOCHE, NI ÎLOT, NI BOUTONS LATÉRAUX. Un dessin d'encoche date la
 * maquette d'un modèle précis et se démode en dix-huit mois ; surtout, il fait
 * regarder le CADRE alors que la seule chose qu'on vienne voir est l'écran. Le
 * trait d'accueil en bas suffit à dire « téléphone » — c'est le seul détail que
 * tous les modèles partagent.
 *
 * L'INTÉRIEUR EST HORS DU PARCOURS. L'aperçu est une IMAGE du produit : ses
 * boutons ne mènent nulle part, et un visiteur au clavier ne doit pas se
 * retrouver piégé quinze tabulations dans une capture. `inert` le retire de
 * l'ordre de tabulation ET de l'arbre d'accessibilité d'un seul attribut ; le
 * cadre, lui, se présente comme ce qu'il est — une image, avec sa description.
 */
export function Telephone({
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
				'relative mx-auto w-full max-w-sm bg-coque p-2 shadow-tablette',
				// Le rayon du CADRE et celui de l'ÉCRAN diffèrent de l'épaisseur de
				// la coque, exactement. Deux rayons égaux donnent un liseré qui
				// s'épaissit dans les angles, et c'est le détail qui fait qu'une
				// maquette a l'air dessinée à la main.
				'rounded-[42px] sm:rounded-[48px] sm:p-2.5',
				className
			)}
		>
			<div className="telephone-ecran relative overflow-hidden rounded-[34px] bg-cladd-bg sm:rounded-[38px]">
				<div className="maquette-toile" inert>
					{children}
				</div>
			</div>

			{/* LE TRAIT D'ACCUEIL. Posé SUR l'écran, comme sur l'appareil réel, et
			    non dans la coque : c'est ce qui le fait lire comme une surcouche du
			    système plutôt que comme une gravure du cadre. */}
			<span
				aria-hidden
				className="absolute inset-x-0 bottom-3 mx-auto h-1 w-28 rounded-full bg-craie/35 sm:bottom-4"
			/>
		</div>
	);
}
