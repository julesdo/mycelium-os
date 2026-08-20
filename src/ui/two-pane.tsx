import type { ReactNode } from 'react';

/**
 * Règle 3 du contrat d'écran, matérialisée.
 *
 * « Deux volets au-delà de 1024px. Tout écran de travail se lit liste à
 * gauche, preuve à droite. En dessous de cette largeur, la liste seule et la
 * preuve en feuille glissante. »
 *
 * La règle vit ici, dans un composant, et non dans la tête de celui qui écrit
 * l'écran. C'est la différence entre une convention qu'on oublie et une
 * contrainte qu'on ne peut pas contourner sans le faire exprès.
 *
 * 1024px n'est pas une largeur arbitraire : c'est la tablette en paysage, le
 * format de référence du produit.
 */
export function TwoPane({
	liste,
	preuve,
	preuveOuverte = false,
	onFermerPreuve
}: {
	liste: ReactNode;
	preuve: ReactNode;
	/** Sous 1024px seulement : ouvre la preuve en feuille par-dessus la liste. */
	preuveOuverte?: boolean;
	onFermerPreuve?: () => void;
}) {
	return (
		<div className="flex h-full min-h-0 w-full">
			<div className="min-w-0 flex-1 overflow-y-auto">{liste}</div>

			<aside className="hidden min-h-0 w-2/5 max-w-2xl shrink-0 overflow-y-auto border-l border-cladd-outline lg:block">
				{preuve}
			</aside>

			{preuveOuverte ? (
				<div className="fixed inset-0 z-50 flex flex-col bg-cladd-bg lg:hidden">
					<div className="shrink-0 px-cladd-3xs pt-cladd-3xs">
						<button
							type="button"
							onClick={onFermerPreuve}
							className="h-cladd-lg px-cladd-xs text-cladd-xs font-semibold"
						>
							Fermer
						</button>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto">{preuve}</div>
				</div>
			) : null}
		</div>
	);
}
