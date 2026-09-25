import { cn } from './cn';

/**
 * L'ATMOSPHÈRE DE LA NUIT — ce qui empêche un aplat noir d'être un trou.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE N'EST PAS `Brume`, ET LES DEUX NE SONT PAS INTERCHANGEABLES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `brume.tsx` pose de la MATIÈRE devant un fond clair : trois dégradés qui
 * épaississent l'air. C'est ce qui la distingue d'un halo, et son en-tête
 * l'écrit noir sur blanc — « elle ne brille pas, elle épaissit ».
 *
 * Sur du noir, ce geste-là n'existe pas : de la matière sur du noir est du
 * noir. La profondeur ne peut venir que de la LUMIÈRE, ce qui est exactement
 * ce que le dépôt bannit sous le nom de « glow orb ». D'où les deux couches
 * ci-dessous, et rien d'autre — chacune motivée par quelque chose de réel, pas
 * choisie pour faire joli :
 *
 *   L'HORIZON est une valeur qui varie sur la HAUTEUR. Aucun centre à situer,
 *   aucun rayon à reconnaître : ce n'est pas une forme, c'est un dégradé de
 *   profondeur, le même geste qu'un fond de studio.
 *
 *   LE GRAIN est ce qui fait qu'un aplat de mille pixels cesse d'être une zone
 *   morte. En `screen`, parce que sur une base noire un `overlay` ne rend rien
 *   du tout — c'est le piège qui a fait exister `.grain-nuit` à côté de
 *   `.fond-grain`.
 *
 * La troisième source de lumière, la seule qui soit vive, n'est pas ici : elle
 * est portée par `LueurProduit`, ancrée sur l'objet qui l'émet.
 */
export function AtmosphereNuit({ className }: { className?: string }) {
	return (
		<div
			aria-hidden
			className={cn('pointer-events-none absolute inset-0 overflow-clip', className)}
		>
			<div className="nuit-horizon absolute inset-0" />
			<div className="grain-nuit absolute inset-0" />
		</div>
	);
}

/**
 * LA LUMIÈRE QUE L'ÉCRAN DU PRODUIT RÉPAND SUR LE NOIR.
 *
 * ⚠️ ELLE EST MOTIVÉE, PAS DÉCORATIVE, ET C'EST TOUTE LA DIFFÉRENCE. L'aperçu
 * du produit est un écran CLAIR de mille pixels de large posé sur du noir. Un
 * écran allumé éclaire ce qui l'entoure. Retirer cette lumière ne rendrait pas
 * la page plus sobre : elle rendrait l'image FAUSSE, une dalle blanche
 * découpée au ciseau dans du noir.
 *
 * ⚠️ ELLE SE POSE DERRIÈRE L'OBJET, JAMAIS AILLEURS. Une lueur qui ne part pas
 * de ce qui l'émet est exactement le halo posé dans le vide que le dépôt
 * refuse. C'est pour ça que ce composant ne prend pas de position : il
 * s'emploie en frère immédiat de la tablette, dans le même conteneur relatif.
 *
 * `derive-lumiere` la fait monter un peu moins vite que la page au défilement,
 * ce qui met le produit DEVANT elle. Sans chronologie — Firefox aujourd'hui —
 * elle reste à sa place, qui est la bonne.
 */
export function LueurProduit({ className }: { className?: string }) {
	return (
		<div
			aria-hidden
			className={cn('pointer-events-none absolute inset-0 overflow-clip', className)}
		>
			{/* Elle DÉBORDE largement du cadre de la tablette, dans les quatre
			    directions : une lueur qui s'arrête au bord de l'objet est un
			    contour, pas une lumière. */}
			<div className="lueur-produit derive-lumiere absolute -inset-x-1/2 -top-1/4 -bottom-1/2" />
		</div>
	);
}
