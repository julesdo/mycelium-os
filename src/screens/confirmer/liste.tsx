import { List, ListButton, Chip } from '@cladd-ui/react';
import { euros, pluriel } from '../../ui';
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
 * Bâtie sur `List` et `ListButton`, et non sur un `<ul>` stylé à la main. La
 * documentation de Cladd est explicite : « Don't build a vertical menu with
 * `<ul>` and per-row classes — that's a List with ListButton rows ». Le gain
 * n'est pas cosmétique : les rangées partagent leur rythme vertical par
 * contexte, et le `Chip` du motif s'ajuste tout seul à la hauteur de sa
 * rangée. La version précédente réglait les deux à la main, donc mal.
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
		<List className="w-full">
			{libelles.map((l) => {
				const motif = MOTIFS[l.motif];
				return (
					<ListButton
						key={l.normalizedLabel}
						selected={l.normalizedLabel === selection}
						onClick={() => onSelectionner(l.normalizedLabel)}
						after={
							<span className="shrink-0 font-semibold tabular-nums">
								{euros(l.montantCumuleHT)}
							</span>
						}
						footer={
							<span className="flex items-center gap-cladd-3xs">
								<Chip>{motif?.court ?? l.motif}</Chip>
								<span className="text-cladd-fg-softer tabular-nums">
									{l.occurrences} ligne{pluriel(l.occurrences)}
								</span>
							</span>
						}
					>
						{l.normalizedLabel}
					</ListButton>
				);
			})}
		</List>
	);
}
