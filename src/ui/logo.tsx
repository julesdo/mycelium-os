import { useId } from 'react';
import { cn } from './cn';

/**
 * Le nom, écrit à la main et en capitales.
 *
 * POURQUOI DES CAPITALES. Une cursive minuscule lit « signature » ou
 * « enseigne » ; des capitales manuscrites lisent « écrit sur une étiquette »,
 * ce qui est exactement le nom du produit. C'est aussi le seul des deux qui
 * reste lisible en petit : les déliés d'une anglaise se cassent sous une
 * vingtaine de pixels, et le logotype apparaît justement en petit dans la barre.
 *
 * LE MOT RESTE EN MINUSCULES DANS LE DOM, et les capitales sont posées par le
 * style. Un lecteur d'écran qui rencontre « LETIKETTE » l'épelle parfois lettre
 * par lettre ; « Letikette » se prononce.
 *
 * L'approche est POSITIVE, à l'inverse du reste de l'interface qui resserre.
 * Des capitales collées deviennent un bloc ; c'est la règle typographique la
 * plus ancienne et la plus ignorée.
 *
 * AUCUNE CLASSE DE GRAISSE, ET C'EST VOLONTAIRE. Caveat Brush n'existe qu'en
 * 400 : c'est une brosse, pas une fonte variable. Écrire `font-bold` dessus ne
 * chargerait rien de plus, ça déclencherait le GRAS SYNTHÉTIQUE du navigateur,
 * qui épaissit uniformément un tracé dont tout l'intérêt est de varier
 * d'épaisseur — le mot sortirait bavé.
 *
 * La brosse porte déjà sa masse. Si la marque doit peser plus lourd, la voie
 * propre est un contour de la même couleur (`paint-order: stroke fill`), qui
 * grossit le tracé sans le salir, ou la vectorisation, où l'épaisseur se
 * dessine vraiment.
 *
 * LA TAILLE EST DANS LE COMPOSANT, PAS DANS L'APPELANT. Un logotype a une
 * taille, comme il a une couleur : la laisser se régler écran par écran, c'est
 * la garantie qu'elle divergera. Le `className` ne sert qu'à la mise en page —
 * masquer le mot sous une largeur, l'aligner.
 */
export function MotLetikette({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				'font-manuscrit text-letikette-marque tracking-wide uppercase',
				className
			)}
		>
			Letikette
		</span>
	);
}

/**
 * La marque Letikette : une assiette vue de dessus.
 *
 * POURQUOI UNE ASSIETTE. Le mot dit le produit deux fois. C'est l'objet du
 * client, une cantine, et c'est aussi le terme comptable pour la base sur
 * laquelle un taux se calcule — l'assiette d'achats. Le taux EGalim se mesure
 * exactement là-dessus. Aucun autre objet ne porte les deux sens à la fois.
 *
 * Avant elle il y avait un L, et avant le L trois capsules qui formaient un M,
 * pour Mycelium. Le M ne voulait plus rien dire sous le nouveau nom, le L ne
 * disait que l'initiale.
 *
 * COMMENT LE CREUX SE LIT. Pas par une ombre ajoutée, par une inversion. Le
 * marli est bombé, donc son dégradé descend du clair au sombre. Le creux est
 * concave, donc le sien fait l'inverse : ombré en haut, lumineux en bas. C'est
 * cette contradiction entre les deux ombrages qui fabrique la profondeur ;
 * empiler des ombres dans le même sens ne fait qu'un disque sale.
 *
 * S'y ajoutent deux choses. Un liséré blanc en `inset` sur le bord supérieur,
 * la lumière que prend la lèvre relevée. Et un voile bleu qui ne mord que la
 * moitié haute du creux : la paroi de l'assiette qui se projette dedans. C'est
 * ce voile qui sépare un fond d'assiette d'un simple disque blanc.
 *
 * PAS D'OMBRE PORTÉE, ET C'EST DÉLIBÉRÉ. Une ombre projetée dans un logo se
 * paie longtemps : elle vire au halo sur fond sombre, elle mange deux pixels
 * sur seize dans le favicon, elle est fausse en impression et interdit de poser
 * la marque à plat sur une surface colorée. Le relief vit DANS la marque. Si un
 * écran veut faire flotter l'assiette, c'est au CSS du conteneur de le dire.
 *
 * LES IDENTIFIANTS SONT UNIQUES PAR INSTANCE, et ce n'est pas de la prudence
 * gratuite. Les `id` de dégradé sont globaux au document : deux marques rendues
 * sur le même écran, le rail et un en-tête, entreraient en collision et la
 * seconde piocherait les dégradés de la première. `useId` les sépare. Les
 * deux-points que React y met sont retirés, parce qu'ils rendent l'identifiant
 * inutilisable dans un sélecteur CSS le jour où quelqu'un voudra le viser.
 *
 * Le dessin n'est plus en `currentColor`. Une assiette bleu et blanc est une
 * couleur, pas une teinte héritée. C'est la seule primitive du produit dans ce
 * cas, et elle a le droit d'écrire ses couleurs en clair puisqu'elle vit dans
 * `src/ui`, la seule zone où la muselière ne s'applique pas.
 */
export function LogoLetikette({ className }: { className?: string }) {
	// Les deux-points de `useId` sont valides en HTML mais cassent tout
	// sélecteur CSS ; on les retire une fois pour toutes.
	const cle = useId().replaceAll(':', '');
	const marli = `marli-${cle}`;
	const creux = `creux-${cle}`;
	const voile = `voile-${cle}`;
	const lisere = `lisere-${cle}`;

	return (
		<svg
			viewBox="0 0 100 100"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="Letikette"
			className={className}
		>
			<defs>
				{/* Le marli, bombé : clair en haut à gauche, sombre en bas à droite. */}
				<linearGradient id={marli} x1="0.15" y1="0" x2="0.85" y2="1">
					<stop offset="0" stopColor="#3560d6" />
					<stop offset="1" stopColor="#122a72" />
				</linearGradient>
				{/* Le creux, concave : le point de lumière est BAS, l'ombre remonte. */}
				<radialGradient id={creux} cx="0.5" cy="0.8" r="0.85">
					<stop offset="0" stopColor="#ffffff" />
					<stop offset="0.45" stopColor="#fcf7f5" />
					<stop offset="1" stopColor="#d9c9c2" />
				</radialGradient>
				{/* La paroi qui se projette dans le fond, sur la moitié haute seulement. */}
				<linearGradient id={voile} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#1d3fa0" stopOpacity="0.3" />
					<stop offset="0.5" stopColor="#1d3fa0" stopOpacity="0" />
				</linearGradient>
				{/* La lumière prise par la lèvre relevée. */}
				<linearGradient id={lisere} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#ffffff" stopOpacity="0.62" />
					<stop offset="0.5" stopColor="#ffffff" stopOpacity="0.04" />
					<stop offset="1" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>

			<circle cx="50" cy="50" r="50" fill={`url(#${marli})`} />
			{/* Rayon 48,4 et trait de 3,2 : le bord extérieur tombe pile sur 50,
			    donc le liséré ne sort jamais de la boîte et ne se fait pas rogner. */}
			<circle cx="50" cy="50" r="48.4" fill="none" stroke={`url(#${lisere})`} strokeWidth="3.2" />
			{/* Le fond remonte de 1,5 : le marli fait 15,5 en haut contre 18,5 en
			    bas, et cette épaisseur inégale est ce qui se lit comme un creux. */}
			<circle cx="50" cy="48.5" r="33" fill={`url(#${creux})`} />
			<circle cx="50" cy="48.5" r="33" fill={`url(#${voile})`} />
		</svg>
	);
}
