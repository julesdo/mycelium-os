import type { ReactNode } from 'react';
import { Surface } from '@cladd-ui/react';
import { cn } from './cn';

/**
 * Un tableau dense, posé dans une carte.
 *
 * QUAND UN TABLEAU, QUAND DES CARTES. Une pile de cartes coûte trois fois la
 * hauteur pour la même information et empêche de comparer deux lignes d'un coup
 * d'œil. Un tableau, lui, ne se parcourt pas : on y cherche une valeur qu'on
 * connaît déjà. La règle qui en découle, et qui vaut pour tout le produit :
 * **si on cherche « où est-ce que ça coince ? », c'est une comparaison, donc
 * un dessin** (voir `Repartition`, `OuAgir`) ; **si on cherche « combien pour
 * ce fournisseur ? », c'est une valeur, donc un tableau.**
 *
 * Le conteneur défile horizontalement pour lui seul : la page, elle, ne doit
 * jamais déborder, à aucune largeur. Le rembourrage vit sur le défilement et
 * non sur la carte, sinon la colonne de droite se coupe au ras du bord au lieu
 * de s'arrêter dans la marge.
 */

export function Tableau({ children, legende }: { children: ReactNode; legende?: string }) {
	return (
		<Surface
			outline
			className="rounded-cladd-2xl shadow-carte"
			contentClassName="w-full overflow-x-auto p-cladd-2xs"
		>
			<table className="w-full border-collapse text-cladd-xs">
				{legende ? <caption className="sr-only">{legende}</caption> : null}
				{children}
			</table>
		</Surface>
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
	return <tr className="border-b border-cladd-outline last:border-0">{children}</tr>;
}

export function TableauTitre({ children, aDroite }: { children: ReactNode; aDroite?: boolean }) {
	return (
		<th
			scope="col"
			className={cn(
				'py-cladd-3xs pr-cladd-3xs text-cladd-3xs font-semibold tracking-wide text-cladd-fg-softer uppercase last:pr-0',
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
				'py-cladd-3xs pr-cladd-3xs align-middle last:pr-0',
				aDroite ? 'text-right' : 'text-left',
				chiffre && 'tabular-nums'
			)}
		>
			{children}
		</td>
	);
}
