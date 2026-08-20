import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * Un bandeau d'information, en tête d'écran.
 *
 * Sert la règle 2 du contrat : « tout traitement se voit sans qu'on le
 * demande ». Une lecture en cours, un fichier illisible, une classification qui
 * bascule : le gérant ne doit jamais avoir à se demander si le logiciel
 * travaille, ni à recharger pour le savoir.
 *
 * Le ton `alerte` emprunte l'ambre des seuils. C'est le seul emprunt autorisé,
 * et il est cohérent : dans les deux cas il signifie « quelque chose demande
 * votre attention », jamais « joli ».
 */
export function Bandeau({
	ton = 'neutre',
	icone,
	children,
	action
}: {
	ton?: 'neutre' | 'alerte';
	icone?: ReactNode;
	children: ReactNode;
	action?: ReactNode;
}) {
	return (
		<div
			className={cn(
				'flex flex-wrap items-center justify-between gap-cladd-3xs rounded-cladd-md border px-cladd-3xs py-cladd-3xs',
				ton === 'alerte'
					? 'border-seuil-proche/40 bg-seuil-proche/10'
					: 'border-cladd-outline bg-cladd-surface'
			)}
		>
			<div className="flex min-w-0 items-center gap-cladd-3xs">
				{icone ? <span className="shrink-0 text-cladd-fg-soft">{icone}</span> : null}
				<div className="min-w-0 text-cladd-xs leading-snug">{children}</div>
			</div>
			{action ? <div className="shrink-0">{action}</div> : null}
		</div>
	);
}
