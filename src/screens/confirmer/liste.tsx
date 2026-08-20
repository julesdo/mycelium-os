import { Chip } from '@cladd-ui/react';
import { cn, euros, pluriel } from '../../ui';
import { MOTIFS } from '../../ui/egalim';

export interface LibelleAConfirmer {
	normalizedLabel: string;
	rawLabelExemple: string;
	occurrences: number;
	montantCumuleHT: number;
	motif: string;
	proposition: {
		isFood: boolean;
		family: string;
		qualifyingLabels: string[];
		justification: string;
		confidence: number;
	} | null;
	documentId: string | null;
}

/**
 * La file d'attente, volet gauche.
 *
 * Triée par montant cumulé décroissant : le gérant traite d'abord ce qui pèse
 * le plus sur ses taux. Confirmer un libellé à 40 000 € et un libellé à 12 €
 * coûte le même geste, donc l'ordre est la seule chose qui protège son temps.
 *
 * Chaque ligne dit le montant en jeu et le nombre de lignes de facture
 * concernées : ce sont les deux informations qui font comprendre pourquoi la
 * question est posée.
 */
export function ListeAConfirmer({
	libelles,
	selection,
	onSelectionner
}: {
	libelles: readonly LibelleAConfirmer[];
	selection: string | null;
	onSelectionner: (normalizedLabel: string) => void;
}) {
	return (
		<ul className="flex flex-col">
			{libelles.map((l) => {
				const actif = l.normalizedLabel === selection;
				const motif = MOTIFS[l.motif];
				return (
					<li key={l.normalizedLabel}>
						<button
							type="button"
							onClick={() => onSelectionner(l.normalizedLabel)}
							aria-current={actif}
							className={cn(
								'flex w-full flex-col gap-1 border-b border-cladd-bg-outline px-cladd-3xs py-cladd-3xs text-left',
								'min-h-cladd-lg transition-colors',
								actif ? 'bg-cladd-surface-plus' : 'hover:bg-cladd-surface'
							)}
						>
							<div className="flex items-baseline justify-between gap-cladd-3xs">
								<span className="min-w-0 truncate text-cladd-xs font-medium">
									{l.normalizedLabel}
								</span>
								<span className="shrink-0 text-cladd-xs font-semibold tabular-nums">
									{euros(l.montantCumuleHT)}
								</span>
							</div>
							<div className="flex items-center gap-cladd-3xs">
								<Chip size="xs">{motif?.court ?? l.motif}</Chip>
								<span className="text-cladd-3xs text-cladd-fg-softer tabular-nums">
									{l.occurrences} ligne{pluriel(l.occurrences)}
								</span>
							</div>
						</button>
					</li>
				);
			})}
		</ul>
	);
}
