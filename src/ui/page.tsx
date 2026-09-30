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

/**
 * LA COLONNE SUR LAQUELLE L'EN-TÊTE S'ALIGNE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉFAUT QU'ELLE RETIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le corps d'un écran se centre dans une colonne de 672 px (`max-w-2xl`) ; son
 * en-tête, lui, partait du bord gauche de la fenêtre. À 1280 px, le grand titre
 * était à 16 px du bord et la première carte à 304 px : deux alignements sur le
 * même écran, et l'œil qui saute de l'un à l'autre. Relevé le 30/09/2026 ; la
 * page dossier, passée en une colonne le même soir, le rendait flagrant dès
 * 1024 px.
 *
 * ⚠️ LA BARRE RESTE BORD À BORD, SEUL SON CONTENU SE RANGE. Son verre floute ce
 * qui défile dessous sur toute la largeur — le rétrécir ferait apparaître deux
 * bandes nettes de part et d'autre. C'est donc le REMBOURRAGE qui grandit : la
 * gouttière, ou la moitié de ce qui dépasse la colonne, selon le plus grand.
 *
 * Le pourcentage d'un rembourrage se rapporte à la largeur du bloc CONTENANT —
 * le corps qui défile, sans sa gouttière —, d'où le `+ gouttière` : la barre,
 * elle, déborde d'une gouttière de chaque côté (`-mx-cladd-2xs`).
 */
export type ColonneEntete = 'normale' | 'large' | 'pleine';

export const GOUTTIERE_ENTETE: Record<ColonneEntete, string> = {
	normale: 'px-[max(var(--spacing-cladd-2xs),calc((100%_-_42rem)/2_+_var(--spacing-cladd-2xs)))]',
	large:
		'px-[max(var(--spacing-cladd-2xs),calc((100%_-_42rem)/2_+_var(--spacing-cladd-2xs)))] lg:px-[max(var(--spacing-cladd-2xs),calc((100%_-_72rem)/2_+_var(--spacing-cladd-2xs)))]',
	pleine: 'px-cladd-2xs'
};

export function PageHeader({
	titre,
	sousTitre,
	actions,
	colonne = 'pleine'
}: {
	titre?: string;
	sousTitre?: string;
	actions?: ReactNode;
	/** La colonne du corps, sur laquelle le titre s'aligne. Voir `GOUTTIERE_ENTETE`. */
	colonne?: ColonneEntete;
}) {
	/*
	  ═══════════════════════════════════════════════════════════════════════════
	  ⚠️ UNE BARRE COMPACTE, SUR TOUS LES ONGLETS — ET PLUS AUCUN GRAND TITRE
	  ═══════════════════════════════════════════════════════════════════════════

	  Décision du fondateur, le 30/09/2026 au soir : « fais la même barre compacte
	  partout, less is more ». Le grand titre de trente pixels et son sous-titre
	  coûtaient 78 px au-dessus du premier contenu, et renvoyaient les actions sur
	  une deuxième ligne. La barre du bas dit déjà où l'on est.

	  Relevé sur Mobbin le même soir, dans des applications qui font notre métier
	  ou s'en approchent :
	    · Revolut (accueil) et Splitwise (« qui me doit quoi ») — la barre porte la
	      recherche et une ou deux actions rondes, et aucun titre ;
	    · bunq (profil) — un petit titre centré, et c'est tout.

	  D'où la règle, tenue ici et nulle part ailleurs : quand l'écran a des
	  ACTIONS, elles occupent la barre seules ; quand il n'en a pas, son titre s'y
	  écrit en petit, centré. Dans les deux cas le titre reste PUBLIÉ par
	  `PageEcran` : c'est lui qui nomme le retour de la page suivante (« ‹
	  Aujourd'hui »), et l'effacer du rendu ne doit pas l'effacer de là.

	  ⚠️ `min-h-9` SUR LA RANGÉE : une barre de titre et une barre d'outils font la
	  même hauteur, sinon le contenu saute de quelques pixels d'un onglet à l'autre.
	*/
	const sansTitre = titre === undefined;
	return (
		<header
			className={cn(
				/*
				  LE FLOU SEUL REND LE DÉFILEMENT SOUS LA BARRE LISIBLE. Ni fond, ni
				  anneau, ni ombre (`verre-barre-haute`, voir `app.css`) : la barre est
				  le bord de l'écran, pas un bandeau posé dessus. Ce qui passe derrière
				  est brouillé par un flou léger qui naît avec le défilement, jusqu’à ne plus
				  former de lettres — sans lui, on lirait deux textes l'un sur l'autre.

				  ⚠️ `sticky` NE TIENT QUE PARCE QUE L'EN-TÊTE EST DANS LE CONTENEUR QUI
				  DÉFILE. Remonté à côté de `PageBody`, il n'a plus d'ancêtre défilant et
				  redevient un bloc ordinaire : plus rien ne passe dessous, et le flou n'a
				  plus rien à flouter. Voir `page-ecran.tsx`.
				*/
				'verre-barre-haute sticky top-0 z-30 -mx-cladd-2xs flex shrink-0 items-center pt-barre-app pb-cladd-3xs',
				GOUTTIERE_ENTETE[colonne]
			)}
		>
			{actions ? (
				<div className="flex min-h-9 w-full min-w-0 items-center gap-cladd-3xs">
					{sansTitre ? null : <h1 className="sr-only">{titre}</h1>}
					{actions}
				</div>
			) : sansTitre ? null : (
				<div className="flex min-h-9 w-full min-w-0 flex-col items-center justify-center text-center">
					{/* Un `h1` quand même : le lecteur d'écran y cherche le nom de la page. */}
					<h1 className="max-w-full truncate text-cladd-xs leading-tight font-semibold">{titre}</h1>
					{sousTitre ? (
						<p className="max-w-full truncate text-cladd-3xs text-cladd-fg-soft">{sousTitre}</p>
					) : null}
				</div>
			)}
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
	// `defilement-sans-barre` : sans elle, la gouttière de défilement coupe la barre
	// du haut à droite. Voir `app.css`.
	return (
		<div className="defilement-sans-barre min-h-0 flex-1 overflow-y-auto px-cladd-2xs pb-36">
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
export function PageHero({ children, className }: { children: ReactNode; className?: string }) {
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
