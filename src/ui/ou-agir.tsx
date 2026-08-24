import { Surface } from '@cladd-ui/react';
import { Illustration } from './illustration';
import { euros, FAMILLES, type Famille } from './format';

/**
 * Où combler l'écart — la seule partie du diagnostic qui dise quoi faire.
 *
 * Le reste du rapport constate. Ceci arbitre : pour chaque famille, ce qu'il
 * reste d'achats non durables, et ce que basculer la famille entière
 * rapporterait au taux. C'est la question que le gérant pose à son directeur
 * en sortant de la réunion — « je commence par quoi ? » — et il n'y a qu'un
 * seul écran dans le produit qui y réponde.
 *
 * LE CHIFFRE EST LE POTENTIEL, PAS L'ÉTAT. « +18 points » n'est pas un taux
 * mesuré : c'est ce qu'on gagnerait. Il porte donc l'encre de la marque et
 * jamais le vert des seuils — confondre les deux ferait lire « vous êtes
 * bon » là où il faut lire « il y a de la marge ici ».
 *
 * L'HYPOTHÈSE EST DITE EN TOUTES LETTRES, sous le chiffre. Basculer une
 * famille entière en durable n'arrive jamais dans la vraie vie : le nombre est
 * un majorant, il sert à classer les familles entre elles, pas à promettre un
 * résultat. Une promesse implicite sur un chiffre de conformité est
 * exactement ce que ce produit ne doit pas faire.
 */

export type PisteAction = {
	family: Famille;
	montantNonDurableHT: number;
	pointsSiTotalementBascule: number;
};

export function OuAgir({ pistes }: { pistes: readonly PisteAction[] }) {
	// L'échelle est commune : c'est la comparaison entre familles qui porte
	// l'information, pas la valeur absolue d'une barre.
	const plafond = Math.max(...pistes.map((p) => p.pointsSiTotalementBascule), 1);

	return (
		<Surface
			outline
			className="rounded-cladd-2xl shadow-carte"
			contentClassName="flex flex-col divide-y divide-cladd-outline"
		>
			{pistes.map((p) => (
				<div key={p.family} className="flex items-center gap-cladd-2xs p-cladd-2xs">
					<Illustration libelle="" famille={p.family} taille="sm" />

					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<span className="truncate text-cladd-xs font-semibold">{FAMILLES[p.family]}</span>
						<div className="h-2 w-full overflow-hidden rounded-full bg-cladd-surface-cut">
							<div
								className="h-full rounded-full bg-cladd-primary transition-[width] duration-700 ease-out"
								style={{ width: `${(p.pointsSiTotalementBascule / plafond) * 100}%` }}
							/>
						</div>
						<span className="text-cladd-2xs text-cladd-fg-softer tabular-nums">
							{euros(p.montantNonDurableHT)} d&rsquo;achats non durables
						</span>
					</div>

					<div className="flex shrink-0 flex-col items-end">
						<span className="text-letikette-chiffre leading-none font-bold text-cladd-primary tabular-nums">
							+{Math.round(p.pointsSiTotalementBascule)}
						</span>
						<span className="text-cladd-3xs text-cladd-fg-softest">points au max</span>
					</div>
				</div>
			))}
		</Surface>
	);
}
