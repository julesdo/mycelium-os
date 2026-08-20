import type { ReactNode } from 'react';

/**
 * Règle 4 du contrat d'écran, matérialisée.
 *
 * « Le vide montre le chemin. Un écran sans données affiche l'amorçage,
 * jamais des cadrans à zéro. »
 *
 * Trois jauges vides sur un écran de conformité ne disent pas « vous n'avez
 * pas encore déposé de factures », elles disent « ce logiciel est cassé » ou
 * pire, « vous êtes à 0 % ». Sur un produit dont l'objet est un chiffre
 * réglementaire, c'est la première impression la plus coûteuse possible.
 */
export function EmptyState({
	titre,
	explication,
	etapes,
	action
}: {
	titre: string;
	explication: string;
	/** Les étapes du chemin. La première est celle que l'utilisateur peut faire tout de suite. */
	etapes?: readonly string[];
	action?: ReactNode;
}) {
	return (
		<div className="mx-auto flex max-w-xl flex-col items-start gap-cladd-2xs py-cladd-2xl">
			<h2 className="text-cladd-md font-semibold">{titre}</h2>
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">{explication}</p>

			{etapes ? (
				<ol className="flex flex-col gap-cladd-3xs">
					{etapes.map((etape, i) => (
						<li key={etape} className="flex items-start gap-cladd-3xs">
							<span className="flex size-cladd-xs shrink-0 items-center justify-center rounded-full bg-cladd-surface-plus text-cladd-2xs font-bold tabular-nums">
								{i + 1}
							</span>
							<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">{etape}</span>
						</li>
					))}
				</ol>
			) : null}

			{action}
		</div>
	);
}
