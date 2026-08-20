import type { ReactNode } from 'react';

/**
 * La coquille d'un écran.
 *
 * Un seul endroit décide de la marge du canevas, donc il n'y a qu'une marge
 * dans tout le produit. C'est exactement ce qui manquait à la version
 * précédente, où chaque écran rejouait sa propre géométrie à la main.
 *
 * `Page` occupe toute la hauteur et ne défile jamais : c'est `PageBody` qui
 * défile. Sans ça, l'en-tête part vers le haut quand la liste est longue, et
 * le gérant perd le titre de l'écran sur lequel il travaille.
 */
export function Page({ children }: { children: ReactNode }) {
	return <div className="flex h-full min-h-0 flex-col">{children}</div>;
}

export function PageHeader({
	titre,
	sousTitre,
	actions
}: {
	titre: string;
	sousTitre?: string;
	actions?: ReactNode;
}) {
	return (
		<header className="flex shrink-0 flex-wrap items-end justify-between gap-cladd-xs px-cladd-xs pt-cladd-xs pb-cladd-3xs">
			<div className="min-w-0">
				<h1 className="text-cladd-md font-semibold tracking-tight">{titre}</h1>
				{sousTitre ? <p className="mt-0.5 text-cladd-xs text-cladd-fg-soft">{sousTitre}</p> : null}
			</div>
			{actions ? <div className="flex shrink-0 items-center gap-cladd-3xs">{actions}</div> : null}
		</header>
	);
}

export function PageBody({ children }: { children: ReactNode }) {
	return <div className="min-h-0 flex-1 overflow-y-auto px-cladd-xs pb-cladd-xs">{children}</div>;
}
