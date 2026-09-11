import type { ComponentProps, ElementType, ReactNode } from 'react';
import { Button } from '@cladd-ui/react';
import { cn } from './cn';

/**
 * LES DEUX BOUTONS D'ACTION DU PRODUIT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ L'ACTION PRINCIPALE EST BLANCHE, PAS BLEUE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'était le manque central du système visuel, et il ne se voyait qu'une fois
 * le fond sombre en place. L'application posait ses actions principales en
 * aplat d'accent — `color="brand" variant="solid-fill"`, c'est-à-dire un
 * rectangle bleu. Sur un fond traversé par un shader bleu-violet, ce bleu ne
 * ressort pas : il se fond dans son propre décor, et l'action la plus
 * importante de l'écran devient la moins visible.
 *
 * La référence ne fait jamais ça. Sa couleur de marque sert aux LIENS et aux
 * accents de texte ; son action principale est une pilule blanche à texte noir.
 * Sur un écran sombre, le blanc est la seule valeur qui n'entre en concurrence
 * avec rien.
 *
 * ⚠️ ET ELLE NE PORTE JAMAIS DE COULEUR SÉMANTIQUE. Une pilule rouge pour
 * supprimer, verte pour valider : interdit. Le vert, l'ambre et le rouge ne
 * disent qu'une chose dans ce produit — au-dessus du seuil, tout près, en
 * dessous. Une action destructrice se signale par son LIBELLÉ et par une
 * confirmation, jamais en empruntant la couleur d'un verdict juridique.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI ON GARDE LE `Button` DU KIT DESSOUS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * On ne réimplémente pas un bouton : on lui retire son fond et on pose le
 * nôtre. Ce qu'on garde ainsi n'est pas cosmétique — l'anneau de focus au
 * clavier, l'état `loading` avec son `Spinner` dimensionné, `disabled` qui
 * coupe réellement les événements, le rendu polymorphe en `<a>` pour les liens
 * de routeur, et le dimensionnement automatique des icônes enfants.
 *
 * Trois props sont imposées et ne se surchargent pas :
 *   · `variant="transparent"` — sinon la surface du kit peint un fond opaque
 *     SOUS notre classe, et la pilule redevient grise ;
 *   · `outline={false}` — l'anneau du kit doublerait le nôtre ;
 *   · `hoverable={false}` — la surcouche de survol du kit est un voile foncé
 *     posé PAR-DESSUS le contenu ; sur une pilule blanche elle la fait virer au
 *     gris sale. Le survol est repris par la classe.
 */

type ProprietesBouton<C extends ElementType> = {
	as?: C;
	children: ReactNode;
	className?: string;
	/** Pleine largeur. Le défaut sur téléphone, où l'on vise au pouce. */
	pleineLargeur?: boolean;
} & Omit<ComponentProps<typeof Button>, 'as' | 'variant' | 'outline' | 'hoverable' | 'color'> &
	Omit<ComponentProps<C>, 'as' | 'children' | 'className'>;

/**
 * L'action qu'on veut faire faire. UNE SEULE par écran.
 *
 * Deux pilules blanches côte à côte, et il n'y a plus d'action principale —
 * seulement deux boutons clairs entre lesquels il faut choisir, ce qui est
 * exactement le travail qu'on prétendait éviter au lecteur.
 */
export function BoutonPrincipal<C extends ElementType = 'button'>({
	children,
	className,
	pleineLargeur = false,
	...reste
}: ProprietesBouton<C>) {
	return (
		<Button
			variant="transparent"
			outline={false}
			hoverable={false}
			rounded
			size="lg"
			className={cn('pilule-principale font-semibold', pleineLargeur && 'w-full', className)}
			{...reste}
		>
			{children}
		</Button>
	);
}

/**
 * L'alternative, sous la principale. En verre.
 *
 * Elle existe pour les écrans qui offrent DEUX chemins — « continuer avec un
 * e-mail » sous « créer un compte » — et pas pour mettre une deuxième action de
 * même poids à côté de la première.
 */
export function BoutonSecondaire<C extends ElementType = 'button'>({
	children,
	className,
	pleineLargeur = false,
	...reste
}: ProprietesBouton<C>) {
	return (
		<Button
			variant="transparent"
			outline={false}
			hoverable={false}
			rounded
			size="lg"
			className={cn('pilule-secondaire font-medium', pleineLargeur && 'w-full', className)}
			{...reste}
		>
			{children}
		</Button>
	);
}
