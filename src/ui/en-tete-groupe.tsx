import { eurosCentimes } from './format';

/**
 * L'EN-TÊTE D'UN GROUPE — son nom, puis son compte et son total à droite.
 *
 * ⚠️ C'EST L'EN-TÊTE « TODAY … +$18 » DE REVOLUT. Il dit, avant la moindre
 * rangée, combien d'éléments et combien d'argent vivent dans ce groupe : la
 * question qu'on se pose en balayant une liste n'est pas « lequel », c'est
 * « où est l'argent ».
 *
 * ⚠️ IL NE SE REPLIE PAS, ET C'EST VOULU. Les groupes de l'écran du matin
 * portaient un chevron chacun : trois cibles de plus, pour replier ce qu'on était
 * justement venu voir. Un en-tête est un intitulé, pas une commande. Né dans
 * l'écran des dossiers, partagé avec « Aujourd'hui » le 30/09/2026 : deux listes
 * du même produit qui ne se groupent pas de la même façon se lisent comme deux
 * produits.
 */
export function EnTeteDeGroupe({
	libelle,
	nombre,
	total
}: {
	readonly libelle: string;
	readonly nombre: number;
	readonly total: bigint | null;
}) {
	return (
		<div className="flex items-baseline justify-between gap-cladd-3xs px-1">
			<h2 className="text-cladd-sm font-semibold">{libelle}</h2>
			<span className="text-cladd-2xs text-cladd-fg-soft tabular-nums">
				{nombre}
				{total === null ? null : <> · {eurosCentimes(total)}</>}
			</span>
		</div>
	);
}
