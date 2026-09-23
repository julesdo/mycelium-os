import type { ReactNode } from 'react';
import { cn } from '../ui';

/**
 * Une section de la page d'accueil, avec son fond pleine largeur.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE FICHIER A PERDU LES DEUX TIERS DE SON CONTENU, ET C'EST LA FIN D'UNE
 *    MIGRATION, PAS UN NETTOYAGE OPPORTUNISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il portait le système visuel précédent : « papier, encre, filet ». Quatre
 * fonds clairs, une serif de presse sur les titres, un exergue, un cadre à
 * ombre portée, un inventaire à filets. Le tout était cohérent et défendable
 * pour une page qui se lisait comme un imprimé.
 *
 * Les sept sections sont passées au noir l'une après l'autre entre le 23 et le
 * 24 septembre 2026. Le jour où la dernière est passée, ces composants ne sont
 * plus appelés nulle part. La note laissée sur `FONDS` disait quoi faire ce
 * jour-là, mot pour mot : « il faudra le RETIRER au lieu de le laisser au cas
 * où ». C'est fait.
 *
 * Ce qui est parti, et ce qui le remplace :
 *
 *   `TitreSection`  →  chaque section écrit son rail technique et son titre.
 *                      Six lignes de JSX, et le titre peut enfin porter sa
 *                      coupure d'emphase, ce que la prop `titre` interdisait.
 *   `Exergue`       →  un `blockquote` à filet tireté, dans la section qui le
 *                      porte. Il était en serif, et la serif est partie.
 *   `Cadre`         →  `CadreNuit`, ci-dessous. Un panneau CLAIR sur du noir,
 *                      là où l'ancien était un panneau crème sur du crème.
 *   `Inventaire`    →  `Capacites`, ci-dessous, ou un `divide-y` sur place.
 *   les quatre fonds clairs et la prop `fond`  →  il n'en restait qu'un.
 *
 * ⚠️ LA SERIF NE VIT PLUS NULLE PART SUR CETTE PAGE. `--font-serif` reste
 * déclarée dans `tokens.css` et son import reste dans `app.css` : les quatre
 * documents juridiques (`document-legal.tsx`) la rendent toujours, et ce sont
 * des documents — c'est exactement l'endroit où une serif de presse est juste.
 * Le jour où ils passeraient eux aussi à la grotesque, l'import et le jeton
 * partiraient avec.
 *
 * ⚠️ `encre-tramee` DEVIENT DU CSS MORT. La classe est dans `app.css` et n'est
 * plus appelée par personne depuis que le pied de page est en noir vrai. Elle
 * n'est pas retirée dans le même geste parce qu'une suppression de CSS se
 * vérifie à l'œil et pas au compilateur : elle part au prochain passage sur la
 * feuille, avec le regard qui va avec.
 */

/**
 * LE VIDE, ET POURQUOI IL EST DOUBLE DE CE QU'IL ÉTAIT.
 *
 * Chaque section respirait soixante-douze pixels en haut et en bas, et ses
 * blocs internes vingt-huit. À ce régime, sept sections se touchent : la page
 * devient un mur de texte où rien n'a de place pour exister séparément. C'est
 * exactement le reproche qui lui a été fait.
 *
 * Cent-douze pixels autour, quarante entre les blocs d'une même section. Le
 * vide n'est pas de la place perdue : c'est lui qui dit qu'un bloc est fini et
 * qu'un autre commence, et c'est lui qui fait la différence entre un document
 * et une page où l'on a envie d'entrer.
 */
export function SectionMarketing({
	id,
	filet = true,
	className,
	children
}: {
	id?: string;
	/** La règle de fermeture. On la retire sur la dernière section avant le pied. */
	filet?: boolean;
	className?: string;
	children: ReactNode;
}) {
	return (
		<section
			id={id}
			className={cn(
				'w-full bg-nuit text-craie',
				// LA BARRE EST EN `fixed`, DONC ELLE MASQUE LES ANCRES. Un saut vers
				// `#la-loi` amène le haut de la section au haut de la FENÊTRE,
				// c'est-à-dire sous la barre : le rail et la première ligne du titre
				// disparaissent. `scroll-margin-top` est la seule propriété qui corrige
				// ça, et elle ne se pose que là où il y a une ancre à viser.
				id && 'scroll-mt-barre-publique',
				filet && 'border-b border-filet-nuit'
			)}
		>
			<div
				className={cn(
					'mx-auto flex w-full max-w-7xl flex-col gap-cladd-sm px-cladd-2xs py-cladd-2xl md:px-cladd-sm md:py-respiration',
					className
				)}
			>
				{children}
			</div>
		</section>
	);
}

/**
 * LE CADRE D'UN ÉCRAN DE PRODUIT, SUR LA NUIT.
 *
 * ⚠️ IL EST CLAIR SUR DU NOIR, ET C'EST LE SEUL ENDROIT DE LA PAGE OÙ UNE
 * SURFACE A LE DROIT D'ÊTRE LUMINEUSE. La raison est la même que pour le
 * téléphone du premier écran : l'application est montrée en thème CLAIR, donc
 * un écran de produit posé sur le noir est une source de lumière. C'est ce qui
 * le fait regarder avant le texte, et c'est exactement ce qu'on veut d'une
 * démonstration.
 *
 * ⚠️ LE THÈME EST ÉCRIT SUR LE CADRE, PAS HÉRITÉ. `<html>` porte `light` ou
 * `dark` selon le réglage SYSTÈME du visiteur. Sans `light` posé ici, un
 * prospect sous macOS en mode sombre verrait des démonstrations sombres sur un
 * fond noir, c'est-à-dire presque rien — et personne ne s'en apercevrait depuis
 * un poste en clair.
 *
 * ⚠️ PAS D'OMBRE PORTÉE. Sur du noir, une ombre ne se voit pas ; ce qui détache
 * le cadre est son ARÊTE de lumière, un liseré d'un pixel. C'est la même pièce
 * que celle qui fait l'aluminium du téléphone, et la seule qui fonctionne sur
 * un fond sombre.
 */
export function CadreNuit({
	className,
	contentClassName,
	children
}: {
	className?: string;
	contentClassName?: string;
	children: ReactNode;
}) {
	return (
		<div
			className={cn(
				'light cladd-color-brand overflow-hidden rounded-panneau bg-cladd-bg text-cladd-fg ring-1 ring-filet-nuit-vif',
				className
			)}
		>
			<div className={contentClassName}>{children}</div>
		</div>
	);
}

/**
 * LA LISTE DES CAPACITÉS D'UNE ÉTAPE.
 *
 * ⚠️ CHAQUE ENTRÉE COMMENCE PAR UN VERBE ET PORTE UN CHIFFRE, UN FORMAT OU UN
 * NOM PROPRE. Ce n'est pas une préférence de style : c'est la grammaire relevée
 * le 23 septembre 2026 dans la page de Revolut Business, où aucune puce n'est
 * abstraite. « Exchange 25+ currencies at the interbank rate », « Integrate
 * with Pennylane, Sage, Odoo, and 45+ other tools ». Jamais « des paiements
 * simplifiés » ni « une gestion optimisée ».
 *
 * La raison tient debout : un dirigeant qui lit « surveillance intelligente »
 * ne sait pas ce qu'il achète, et il a raison de ne pas le croire. « Relever
 * chaque nuit au BODACC les procédures ouvertes sur vos débiteurs » se vérifie.
 *
 * Le filet tireté sépare, comme partout ailleurs sur la page. Jamais une puce
 * ronde : elle ajouterait un objet décoratif par ligne, et il y en a douze.
 */
export function Capacites({
	items,
	className
}: {
	items: readonly string[];
	className?: string;
}) {
	return (
		<ul className={cn('flex flex-col', className)}>
			{items.map((item) => (
				<li
					key={item}
					className="border-b border-dashed border-filet-nuit py-cladd-3xs text-cladd-sm leading-relaxed font-normal text-craie-douce last:border-b-0"
				>
					{item}
				</li>
			))}
		</ul>
	);
}
