import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * Un tableau dense.
 *
 * Au-delà de trois éléments homogènes, une pile de cartes coûte trois fois la
 * hauteur pour la même information et empêche de comparer deux lignes d'un coup
 * d'œil. C'est le défaut le plus visible de l'interface précédente, où la
 * répartition par famille était une succession de cartes en verre.
 *
 * Le conteneur défile horizontalement pour lui seul : la page, elle, ne doit
 * jamais déborder, à aucune largeur.
 */

export function Tableau({ children, legende }: { children: ReactNode; legende?: string }) {
	return (
		<div className="w-full overflow-x-auto">
			<table className="w-full border-collapse text-cladd-xs">
				{legende ? <caption className="sr-only">{legende}</caption> : null}
				{children}
			</table>
		</div>
	);
}

export function TableauEntete({ children }: { children: ReactNode }) {
	return (
		<thead>
			<tr className="border-b border-cladd-outline">{children}</tr>
		</thead>
	);
}

export function TableauCorps({ children }: { children: ReactNode }) {
	return <tbody>{children}</tbody>;
}

export function TableauLigne({ children }: { children: ReactNode }) {
	return <tr className="border-b border-cladd-bg-outline last:border-0">{children}</tr>;
}

export function TableauTitre({
	children,
	aDroite
}: {
	children: ReactNode;
	aDroite?: boolean;
}) {
	return (
		<th
			scope="col"
			className={cn(
				'py-cladd-3xs pr-cladd-3xs text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase',
				aDroite ? 'text-right' : 'text-left'
			)}
		>
			{children}
		</th>
	);
}

export function TableauCellule({
	children,
	aDroite,
	chiffre
}: {
	children: ReactNode;
	aDroite?: boolean;
	/** Aligne les chiffres colonne par colonne, ce qui les rend comparables. */
	chiffre?: boolean;
}) {
	return (
		<td
			className={cn(
				'py-cladd-3xs pr-cladd-3xs align-middle',
				aDroite ? 'text-right' : 'text-left',
				chiffre && 'tabular-nums'
			)}
		>
			{children}
		</td>
	);
}
