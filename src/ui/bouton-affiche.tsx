import type { ComponentProps, ElementType, ReactNode } from 'react';
import { Button } from '@cladd-ui/react';
import { cn } from './cn';

/**
 * LES ACTIONS DE LA PAGE PUBLIQUE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI UN SECOND JEU DE BOUTONS, ALORS QUE `bouton.tsx` EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `BoutonPrincipal` peint sa pilule en `var(--cladd-fg)` sur `var(--cladd-bg)`.
 * Dans l'application, c'est exactement ce qu'il faut : le gérant choisit son
 * thème et l'action principale suit.
 *
 * Sur la page publique, c'est un défaut qui ne se voit que chez le visiteur.
 * `<html>` porte `light` ou `dark` selon le réglage SYSTÈME du lecteur — voir
 * `AMORCE_THEME` — alors que la page peint ses fonds en absolu. Un prospect
 * sous macOS en mode sombre aurait donc reçu, sur le noir du premier écran,
 * une pilule noire à texte blanc : l'appel à l'action de toute la page,
 * invisible, et invisible uniquement chez lui.
 *
 * Ces deux-ci écrivent donc leurs deux valeurs, et ne les héritent pas. Elles
 * se choisissent par FOND et non par importance :
 *
 *   `BoutonAffiche` sur la nuit  — craie sur noir.
 *   `BoutonAffiche fond="jour"`  — encre sur papier.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ON GARDE LE `Button` DU KIT DESSOUS, POUR LES MÊMES RAISONS QU'AILLEURS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * On ne réimplémente pas un bouton : on lui retire son fond et on pose le
 * nôtre. Ce qu'on garde ainsi n'est pas cosmétique — l'anneau de focus au
 * clavier, `disabled` qui coupe réellement les événements, le rendu polymorphe
 * en `<a>` pour les liens de routeur, et le dimensionnement automatique des
 * icônes enfants.
 *
 * Trois props sont imposées et ne se surchargent pas : `variant="transparent"`
 * (sinon la surface du kit peint un fond opaque SOUS notre classe),
 * `outline={false}` (l'anneau du kit doublerait le nôtre) et
 * `hoverable={false}` (sa surcouche de survol est un voile foncé posé
 * PAR-DESSUS le contenu ; sur une pilule blanche elle la fait virer au gris).
 */

/** Le fond sur lequel le bouton est posé, pas son importance. */
export type FondBouton = 'nuit' | 'jour';

type ProprietesBoutonAffiche<C extends ElementType> = {
	as?: C;
	children: ReactNode;
	className?: string;
	fond?: FondBouton;
	/** Pleine largeur. Le défaut sur téléphone, où l'on vise au pouce. */
	pleineLargeur?: boolean;
} & Omit<ComponentProps<typeof Button>, 'as' | 'variant' | 'outline' | 'hoverable' | 'color'> &
	Omit<ComponentProps<C>, 'as' | 'children' | 'className'>;

export function BoutonAffiche<C extends ElementType = 'button'>({
	children,
	className,
	fond = 'nuit',
	pleineLargeur = false,
	...reste
}: ProprietesBoutonAffiche<C>) {
	return (
		<Button
			variant="transparent"
			outline={false}
			hoverable={false}
			rounded
			size="lg"
			className={cn(
				fond === 'nuit' ? 'pilule-craie' : 'pilule-encre',
				'px-cladd-2xs font-semibold',
				pleineLargeur && 'w-full',
				className
			)}
			{...reste}
		>
			{children}
		</Button>
	);
}

/**
 * L'ALTERNATIVE, ET C'EST UN LIEN, PAS UN SECOND BOUTON.
 *
 * ⚠️ DEUX PILULES CÔTE À CÔTE ANNULENT L'ACTION PRINCIPALE. C'est déjà écrit
 * dans `bouton.tsx` et ça vaut doublement ici : sur un premier écran, le
 * visiteur a UNE chose à faire, et le second chemin ne sert qu'à celui qui
 * n'est pas encore prêt à la faire. Un lien souligné le dit sans peser.
 *
 * Il prend `currentColor` : posé sur la nuit il est craie, sur le papier il est
 * encre, sans qu'aucune variante ait à exister.
 */
export function LienAffiche<C extends ElementType = 'a'>({
	as,
	children,
	className,
	...reste
}: { as?: C; children: ReactNode; className?: string } & Omit<
	ComponentProps<C>,
	'as' | 'children' | 'className'
>) {
	const Balise = (as ?? 'a') as ElementType;
	return (
		<Balise
			className={cn(
				'inline-flex items-center gap-cladd-3xs rounded-full px-cladd-2xs py-cladd-3xs',
				'text-cladd-sm font-medium opacity-70 transition-opacity hover:opacity-100',
				className
			)}
			{...reste}
		>
			{children}
		</Balise>
	);
}
