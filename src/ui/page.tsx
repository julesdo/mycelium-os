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
	titre: string;
	sousTitre?: string;
	actions?: ReactNode;
}) {
	return (
		<header className="flex shrink-0 flex-wrap items-end justify-between gap-cladd-2xs px-cladd-3xs pt-barre-app pb-cladd-3xs">
			<div className="min-w-0">
				<h1 className="text-letikette-titre leading-tight font-bold tracking-tight">{titre}</h1>
				{sousTitre ? <p className="mt-1 text-cladd-xs text-cladd-fg-soft">{sousTitre}</p> : null}
			</div>
			{actions ? <div className="flex shrink-0 items-center gap-cladd-3xs">{actions}</div> : null}
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
 * 7 rem = la barre (≈ 90 px) plus une carte de respiration. Franc plutôt
 * qu'ajusté au pixel : un calage exact se casse au premier changement de
 * taille de bouton, et le symptôme — la dernière carte à moitié cachée — ne se
 * voit qu'en faisant défiler jusqu'en bas.
 */
export function PageBody({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-0 flex-1 overflow-y-auto px-cladd-3xs pb-28 md:pb-cladd-xs">
			{children}
		</div>
	);
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
