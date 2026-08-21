import type { ReactNode } from 'react';
import { Surface } from '@cladd-ui/react';

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
 *
 * L'illustration n'est pas un ornement : c'est ce qui distingue une page vide
 * d'une page cassée, avant même qu'un mot ne soit lu. Un écran de démarrage
 * qui n'est que du texte gris se lit comme une erreur.
 */
export function EmptyState({
	illustration = '📄',
	titre,
	explication,
	etapes,
	action
}: {
	/** Une seule illustration, au centre. Ce que l'écran attend, pas ce qu'il fait. */
	illustration?: string;
	titre: string;
	explication: string;
	/** Les étapes du chemin. La première est celle que l'utilisateur peut faire tout de suite. */
	etapes?: readonly string[];
	action?: ReactNode;
}) {
	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-cladd-2xs py-cladd-xl text-center">
			<span
				aria-hidden
				className="flex size-vignette-lg items-center justify-center rounded-cladd-2xl bg-famille-autre text-vignette-lg leading-none select-none"
			>
				{illustration}
			</span>

			<div className="flex flex-col gap-cladd-3xs">
				<h2 className="text-cladd-md font-semibold tracking-tight">{titre}</h2>
				<p className="text-cladd-xs leading-relaxed text-balance text-cladd-fg-soft">
					{explication}
				</p>
			</div>

			{etapes ? (
				<Surface
					outline
					className="w-full rounded-cladd-2xl shadow-carte"
					contentClassName="flex flex-col gap-cladd-2xs p-cladd-2xs"
				>
					{etapes.map((etape, i) => (
						<div key={etape} className="flex items-start gap-cladd-3xs text-left">
							<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cladd-primary/10 text-cladd-2xs font-bold text-cladd-primary tabular-nums">
								{i + 1}
							</span>
							<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">{etape}</span>
						</div>
					))}
				</Surface>
			) : null}

			{action}
		</div>
	);
}
