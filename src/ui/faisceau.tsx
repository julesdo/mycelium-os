import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * LE FAISCEAU — l'anneau de lumière qui court autour de l'action à faire.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UN SEUL PAR ÉCRAN, ET JAMAIS SUR N'IMPORTE QUELLE ACTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un faisceau attire l'œil parce qu'il est le SEUL élément animé de l'écran.
 * Deux boutons qui brillent ne hiérarchisent plus rien : ils donnent une page
 * de casino, et le second annule le premier. C'est la seule règle d'usage de
 * ce composant, et elle n'est pas négociable.
 *
 * ⚠️ ET JAMAIS SUR UNE ACTION IRRÉVERSIBLE OU JURIDIQUE. On n'attire pas l'œil
 * vers « arrêter un décompte » ni vers « produire une pièce » : ces gestes
 * engagent le client vis-à-vis d'un tiers, et un ornement qui pousse à cliquer
 * y est exactement le contraire de ce que ce produit doit faire. Le faisceau
 * sert aux actions de mise en route — importer des factures, renseigner un
 * secteur — c'est-à-dire à celles dont l'absence bloque tout le reste.
 *
 * Le rayon est passé en `className` et non déduit : l'anneau hérite du rayon
 * de son porteur (`border-radius: inherit`), donc les deux doivent s'accorder.
 * Une pilule dans un cadre à angles droits laisserait voir les coins de
 * l'anneau dépasser.
 */
export function Faisceau({
	children,
	className,
	actif = true
}: {
	children: ReactNode;
	/** Le rayon, obligatoirement le même que celui de l'enfant. */
	className?: string;
	/**
	 * Permet d'éteindre le faisceau sans démonter l'arbre — pendant qu'une
	 * action est en cours, par exemple, où il continuerait de pousser à cliquer
	 * sur un bouton qui ne répond plus.
	 */
	actif?: boolean;
}) {
	return (
		<span className={cn('inline-flex', actif && 'faisceau', className)}>
			{/*
			  `relative` sur l'enfant : l'anneau est un pseudo-élément absolu du
			  parent, et la lueur vit en `z-index: -1`. Sans contexte propre,
			  l'enfant se retrouverait peint SOUS le halo, qui l'assombrirait.
			*/}
			<span className="relative inline-flex w-full">{children}</span>
		</span>
	);
}
