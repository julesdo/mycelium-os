import type { ReactNode } from 'react';
import { List, ListItem, ListTitle, Surface } from '@cladd-ui/react';
import { cn } from './cn';

/**
 * LA CARTE À LIGNES.
 *
 * Une surface sombre, un intitulé discret, des lignes dedans. C'est l'unité de
 * composition de toute la référence : son écran d'accueil, son détail
 * d'opération et ses réglages sont faits de ça et de rien d'autre.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ CE COMPOSANT N'INVENTE RIEN, IL ASSEMBLE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `Surface` + `List` + `ListButton` existent déjà dans le kit, et
 * `ListButton` porte nativement les quatre fentes dont une ligne de la
 * référence a besoin : `icon` pour la pastille de gauche, `header` pour la
 * date en sur-titre, le corps pour l'intitulé, `after` pour le montant à
 * droite. Il n'y avait donc rien à écrire — seulement à cesser de le
 * réécrire à la main, ce que faisaient trois écrans du produit.
 *
 * Ce fichier ne fixe qu'une chose : le RAYON et l'ABSENCE DE CONTOUR.
 *
 * ⚠️ PAS DE CONTOUR, ET C'EST UN CHOIX MESURÉ. Sur fond sombre, la référence
 * ne dessine aucun trait autour de ses cartes et ne pose aucune ombre : la
 * séparation se fait uniquement par la clarté, six points au-dessus du fond.
 * Un anneau ajouté par-dessus redonne immédiatement l'écran quadrillé qu'on
 * corrige — c'est le défaut le plus visible de la version précédente, où
 * chaque bloc portait son cadre.
 *
 * Le contour reste disponible (`contour`) pour le mode clair, où l'écart de
 * clarté seul ne suffit plus à séparer une carte blanche d'un fond presque
 * blanc.
 */
export function CarteListe({
	titre,
	actions,
	contour = false,
	className,
	children
}: {
	/** L'intitulé du groupe. Court, discret : il nomme, il ne titre pas. */
	titre?: string;
	/** Un contrôle propre au groupe, aligné à droite de son intitulé. */
	actions?: ReactNode;
	/** Voir plus haut : réservé au mode clair, où la clarté seule ne sépare plus. */
	contour?: boolean;
	className?: string;
	children: ReactNode;
}) {
	return (
		<Surface
			as="section"
			outline={contour}
			// ⚠️ `variant="transparent"` EST CE QUI REND LE VERRE POSSIBLE. La
			// surface du kit peint sa propre couche de fond opaque, sous le contenu ;
			// tant qu'elle est là, `backdrop-filter` n'a rien à échantillonner et la
			// classe de verre ne produit qu'un aplat un peu plus clair. On garde donc
			// le composant — pour sa géométrie, son contexte de niveau et son anneau
			// de focus — et on lui retire son fond, que `.verre-carte` remplace.
			variant="transparent"
			// `rounded-cladd-xl` — 21 px. La référence tient ses cartes entre 16 et
			// 20 ; l'échelle du produit ne passe pas par là, et le cran du dessous
			// (`lg`, 18,7) lisait « boîte de dialogue » à pleine largeur de tablette.
			className={cn('verre-carte rounded-cladd-xl', className)}
			contentClassName="p-cladd-3xs"
		>
			{titre !== undefined || actions !== undefined ? (
				// `ListTitle` porte déjà le corps, la casse et la couleur de l'intitulé
				// de groupe du kit. On ne lui ajoute qu'une rangée, pour l'action.
				<div className="flex items-center justify-between gap-cladd-3xs">
					{titre !== undefined ? <ListTitle>{titre}</ListTitle> : <span />}
					{actions}
				</div>
			) : null}

			<List className="p-0">{children}</List>
		</Surface>
	);
}

/**
 * UNE LIGNE CLÉ / VALEUR.
 *
 * Le libellé en gris à gauche, la valeur en blanc à droite. C'est la ligne du
 * panneau de détail de la référence — statut, date, taux, référence de facture.
 *
 * Elle est statique par construction (`ListItem`, pas `ListButton`) : une ligne
 * qui a l'air cliquable et ne l'est pas est un défaut qu'on ne mesure jamais et
 * qui coûte un geste à chaque lecture.
 */
export function LigneValeur({
	libelle,
	valeur,
	className
}: {
	libelle: ReactNode;
	valeur: ReactNode;
	className?: string;
}) {
	return (
		<ListItem className={className}>
			<span className="text-cladd-fg-soft">{libelle}</span>
			{/* `ml-auto` pousse la valeur au bord droit — c'est le motif du kit,
			    montré tel quel dans sa documentation de `ListItem`. `tabular-nums`
			    aligne les montants d'une ligne à l'autre, à la virgule. */}
			<span className="ml-auto pl-cladd-3xs text-right font-medium tabular-nums">{valeur}</span>
		</ListItem>
	);
}
