import { Surface } from '@cladd-ui/react';
import { Illustration } from './illustration';
import { euros, pourcent, FAMILLES, type Famille } from './format';

/**
 * D'où viennent les achats, et ce que chaque famille rapporte au barème.
 *
 * C'ÉTAIT UN TABLEAU. Cinq colonnes, huit lignes, des nombres alignés à
 * droite. Correct, dense, et illisible pour ce qu'on en attend : personne ne
 * lit un tableau pour répondre à « où est-ce que ça coince ? ». On lit un
 * tableau quand on cherche une valeur précise qu'on connaît déjà.
 *
 * Ce que le gérant cherche ici tient en une phrase : quelle famille pèse
 * lourd ET traîne. La réponse est une comparaison de deux grandeurs, ce qui se
 * dessine — les barres se comparent d'un coup d'œil, les colonnes de chiffres
 * se comparent en les lisant l'une après l'autre.
 *
 * La barre ne porte AUCUNE couleur de seuil, et c'est délibéré : les 50 %
 * s'apprécient sur l'ensemble des achats, jamais famille par famille. Peindre
 * une famille en rouge parce qu'elle est sous 50 % inventerait une obligation
 * qui n'existe pas dans la loi — et un gérant qui la croirait vraie
 * arbitrerait ses achats sur une règle fausse.
 */

export type LigneFamille = {
	family: Famille;
	totalHT: number;
	durableHT: number;
	bioHT: number;
};

export function Repartition({ lignes }: { lignes: readonly LigneFamille[] }) {
	// L'échelle est commune à toutes les barres, sinon la plus petite famille
	// aurait la même longueur que la plus grosse et la comparaison — le seul
	// objet de cet écran — ne voudrait plus rien dire.
	const plafond = Math.max(...lignes.map((l) => Math.abs(l.totalHT)), 1);

	return (
		<Surface
			outline
			className="rounded-cladd-2xl shadow-carte"
			contentClassName="flex flex-col divide-y divide-cladd-outline"
		>
			{lignes.map((l) => {
				// Borné entre 0 et 1 : une famille dont les avoirs dépassent les
				// achats rendrait une part négative.
				const partDurable =
					l.totalHT > 0 ? Math.min(1, Math.max(0, l.durableHT / l.totalHT)) : 0;
				const largeur = Math.min(1, Math.abs(l.totalHT) / plafond);

				return (
					<div key={l.family} className="flex items-center gap-cladd-2xs p-cladd-2xs">
						<Illustration libelle="" famille={l.family} taille="sm" />

						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<div className="flex items-baseline justify-between gap-cladd-3xs">
								<span className="truncate text-cladd-xs font-semibold">
									{FAMILLES[l.family]}
								</span>
								<span className="shrink-0 text-cladd-xs font-semibold tabular-nums">
									{euros(l.totalHT)}
								</span>
							</div>

							<div className="h-2 w-full overflow-hidden rounded-full bg-cladd-surface-cut">
								{/* Deux barres emboîtées : la longueur dit le POIDS de la
								    famille dans les achats, la portion pleine dit ce qui y
								    est durable. Une seule barre ne pourrait pas dire les
								    deux, et c'est leur croisement qui désigne la famille
								    sur laquelle agir. */}
								<div
									className="h-full rounded-full bg-cladd-primary/20"
									style={{ width: `${largeur * 100}%` }}
								>
									<div
										className="h-full rounded-full bg-cladd-primary transition-[width] duration-700 ease-out"
										style={{ width: `${partDurable * 100}%` }}
									/>
								</div>
							</div>

							<span className="text-cladd-2xs text-cladd-fg-softer tabular-nums">
								{pourcent(partDurable)} durable
								{l.bioHT > 0 ? ` · ${euros(l.bioHT)} de bio` : ''}
							</span>
						</div>
					</div>
				);
			})}
		</Surface>
	);
}
