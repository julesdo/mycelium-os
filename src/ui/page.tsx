import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * La coquille d'un écran.
 *
 * Un seul endroit décide de la marge du canevas, donc il n'y a qu'une marge
 * dans tout le produit. C'est exactement ce qui manquait à la version
 * précédente, où chaque écran rejouait sa propre géométrie à la main.
 *
 * `Page` occupe toute la hauteur et ne défile jamais : c'est `PageBody` qui
 * défile. Sans ça, l'en-tête part vers le haut quand la liste est longue, et
 * le gérant perd le titre de l'écran sur lequel il travaille.
 */
export function Page({ children }: { children: ReactNode }) {
	return <div className="flex h-full min-h-0 flex-col">{children}</div>;
}

export function PageHeader({
	titre,
	sousTitre,
	actions
}: {
	titre?: string;
	sousTitre?: string;
	actions?: ReactNode;
}) {
	/*
	  ⚠️ SANS TITRE, LA BARRE REMONTE — et c'est tout l'intérêt. `pt-barre-app`
	  (64px) était le dégagement qui laissait respirer un titre d'écran. Quand il
	  n'y a plus de titre, ces 64px ne dégagent plus rien : ils repoussent la
	  rangée d'outils vers le bas de l'écran pour rien.
	*/
	const sansTitre = titre === undefined;
	return (
		<header
			className={cn(
				/*
				  LE FLOU SEUL REND LE DÉFILEMENT SOUS LA BARRE LISIBLE. Ni fond, ni
				  anneau, ni ombre (`verre-barre-haute`, voir `app.css`) : la barre est
				  le bord de l'écran, pas un bandeau posé dessus. Ce qui passe derrière
				  est étalé par un flou de 40px et une saturation à 2, jusqu'à ne plus
				  former de lettres — sans lui, on lirait deux textes l'un sur l'autre.

				  ⚠️ `sticky` NE TIENT QUE PARCE QUE L'EN-TÊTE EST DANS LE CONTENEUR QUI
				  DÉFILE. Remonté à côté de `PageBody`, il n'a plus d'ancêtre défilant et
				  redevient un bloc ordinaire : plus rien ne passe dessous, et le flou n'a
				  plus rien à flouter. Voir `page-ecran.tsx`.
				*/
				'verre-barre-haute sticky top-0 z-30 -mx-cladd-3xs flex shrink-0 flex-wrap items-end justify-between gap-cladd-2xs px-cladd-3xs pb-cladd-3xs',
				sansTitre ? 'pt-cladd-xs' : 'pt-barre-app'
			)}
		>
			{sansTitre ? null : (
				<div className="min-w-0">
					<h1 className="text-letikette-titre leading-tight font-bold tracking-tight">{titre}</h1>
					{sousTitre ? <p className="mt-1 text-cladd-xs text-cladd-fg-soft">{sousTitre}</p> : null}
				</div>
			)}
			{actions ? (
				<div
					className={cn(
						'flex min-w-0 items-center gap-cladd-3xs',
						// Seule sur la rangée, la barre prend toute la largeur : c'est elle
						// qui répartit ses propres groupes, et elle sait le faire.
						sansTitre ? 'w-full' : 'shrink-0'
					)}
				>
					{actions}
				</div>
			) : null}
		</header>
	);
}

/**
 * La zone qui défile.
 *
 * ⚠️ LE REMBOURRAGE BAS EST ICI, ET NULLE PART AILLEURS. La barre basse du
 * téléphone flotte au-dessus du contenu ; c'est ce rembourrage-là — À
 * L'INTÉRIEUR du conteneur qui défile — qui rend la dernière carte atteignable
 * tout en laissant les précédentes GLISSER DERRIÈRE la barre.
 *
 * Posé sur le cadre (`main`) au lieu du conteneur, comme il l'était, la zone
 * visible s'arrête au-dessus de la barre : plus rien ne passe derrière, le
 * flou n'a plus rien à flouter, et il ne reste qu'une bande noire morte. Le
 * verre ne tient qu'à ça.
 *
 * ⚠️ 9 REM, ET À TOUTES LES LARGEURS. Deux corrections d'un coup :
 *
 *   · la valeur. Mesurée au navigateur sur une fenêtre de 812 px : la barre
 *     occupe les 82 derniers pixels, et la capsule du compagnon flotte au-dessus
 *     d'elle jusqu'à 144 px du bord. 7 rem dégageaient la barre seule ; le
 *     compagnon coupait alors le coin bas droit de la dernière carte. À 9 rem,
 *     le bas du contenu et le haut de la capsule tombent tous deux à 668 — la
 *     dernière carte affleure le flottant sans jamais passer dessous.
 *   · la largeur. Le dégagement tombait à `cladd-xs` (28 px) au-delà de 768 px,
 *     parce que la barre basse y cédait la place à une capsule posée dans la
 *     barre HAUTE. Cette barre haute n'existe plus : la capsule est maintenant
 *     la barre du bas elle-même, centrée, et elle est là à TOUTES les largeurs.
 *     Le dégagement doit donc l'être aussi — sinon la dernière carte passe sous
 *     elle sur tablette et sur bureau, c'est-à-dire sur la largeur de référence
 *     du produit.
 *
 * Franc plutôt qu'ajusté au pixel : un calage exact se casse au premier
 * changement de taille de bouton, et le symptôme — la dernière carte à moitié
 * cachée — ne se voit qu'en faisant défiler jusqu'en bas.
 */
export function PageBody({ children }: { children: ReactNode }) {
	return <div className="min-h-0 flex-1 overflow-y-auto px-cladd-3xs pb-36">{children}</div>;
}

/**
 * LE HERO — le bloc qui porte le chiffre.
 *
 * ⚠️ IL NE PORTE PLUS LE FOND. Il l'a porté : un dégradé local, éteint par un
 * fondu avant la première carte. C'était une erreur d'architecture, et elle
 * expliquait à elle seule pourquoi l'écran ne ressemblait pas à sa référence.
 *
 * Chez elle, le drapé couvre TOUT l'écran et ne défile pas ; les cartes
 * glissent devant lui et changent ce qu'on voit au travers. Un fond confiné au
 * hero ne peut rien réfracter plus bas — donc les cartes en dessous ne
 * pouvaient pas être en verre, donc elles restaient des aplats opaques. Le
 * fond vit maintenant dans la coquille, une fois, pour tous les écrans : voir
 * `ui/fond.tsx`.
 *
 * Il ne reste ici que la géométrie : de l'air, le contenu centré, et le
 * dégagement de la barre flottante.
 */
export function PageHero({
	children,
	className
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'flex flex-col items-center gap-cladd-2xs pt-barre-app pb-cladd-xs text-center',
				className
			)}
		>
			{children}
		</div>
	);
}
