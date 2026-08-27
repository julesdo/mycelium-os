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
		<span className={cn('font-manuscrit text-letikette-marque tracking-wide uppercase', className)}>
			Letikette
		</span>
	);
}

/**
 * La marque Letikette : une assiette de porcelaine, vue de trois quarts.
 *
 * POURQUOI UNE ASSIETTE. Le mot dit le produit deux fois. C'est l'objet du
 * client, une cantine, et c'est aussi le terme comptable pour la base sur
 * laquelle un taux se calcule — l'assiette d'achats. Le taux EGalim se mesure
 * exactement là-dessus. Aucun autre objet ne porte les deux sens à la fois.
 *
 * ⚠️ CE QUI N'A PAS MARCHÉ, ET POURQUOI. La version précédente était un disque
 * BLEU PLEIN avec un disque blanc au centre. Verdict du terrain, et il était
 * juste : « on dirait l'œil de sainte Lucie ». Un opercule de coquillage, ou un
 * œil. La faute n'était ni la couleur ni le soin du dégradé, elle était
 * STRUCTURELLE — deux zones concentriques, très contrastées, radialement
 * symétriques, la sombre autour de la claire. C'est la définition d'un iris
 * avec sa pupille, et aucune finesse d'ombrage ne rattrape ça.
 *
 * TROIS CHANGEMENTS, DANS L'ORDRE DE CE QU'ILS RAPPORTENT.
 *
 * 1. LA VALEUR EST INVERSÉE. Le corps est en porcelaine, et le bleu n'est plus
 *    qu'un FILET au bord. C'est ce qu'est réellement une assiette bleu et
 *    blanc — de la vaisselle blanche à liseré bleu, pas un palet bleu. Le bleu
 *    cesse d'être une masse, donc l'objet cesse d'être un œil.
 *
 * 2. LA SYMÉTRIE RADIALE EST CASSÉE. Un léger écrasement vertical (0,88) donne
 *    la perspective d'un plat posé sur une table et regardé de trois quarts.
 *    C'est le seul geste qui fasse lire « objet » plutôt que « pictogramme
 *    concentrique », et c'est celui qui a fait la différence à l'essai.
 *
 * 3. IL Y A QUATRE ZONES, PLUS DEUX. Bord, marli, paroi, fond — la coupe réelle
 *    d'une assiette. Un œil n'a pas de paroi ; c'est cette annelure
 *    supplémentaire, ombrée à contresens, qui dit le creux.
 *
 * COMMENT LE CREUX SE LIT. Pas par une ombre ajoutée, par une contradiction. Le
 * marli est bombé, donc son dégradé descend du clair (en haut à gauche, d'où
 * vient la lumière) au sombre. La paroi est concave, donc le sien fait
 * l'inverse : ombrée en haut, lumineuse en bas. Empiler deux ombrages dans le
 * même sens ne fait qu'un disque sale ; les opposer fabrique la profondeur.
 *
 * LE FILET FIN N'EST PAS UN ORNEMENT. Le liseré bleu sur le marli, à l'intérieur
 * du bandeau, est LA signature de la vaisselle d'hôtel. Comparé à l'essai sans
 * lui, c'est ce détail-là qui fait basculer la lecture de « rondelle » à
 * « assiette ». Il disparaît sous vingt pixels, ce qui est sans importance :
 * l'icône d'onglet est un dessin distinct. Voir `public/favicon.svg`.
 *
 * PAS D'OMBRE PORTÉE, ET C'EST DÉLIBÉRÉ. Une ombre projetée dans un logo se
 * paie longtemps : elle vire au halo sur fond sombre, elle mange deux pixels
 * sur seize dans le favicon, elle est fausse en impression et interdit de poser
 * la marque à plat sur une surface colorée. Le relief vit DANS la marque. Si un
 * écran veut faire flotter l'assiette, c'est au CSS du conteneur de le dire.
 *
 * LES IDENTIFIANTS SONT UNIQUES PAR INSTANCE, et ce n'est pas de la prudence
 * gratuite. Les `id` de dégradé sont globaux au document : deux marques rendues
 * sur le même écran, la barre et un en-tête, entreraient en collision et la
 * seconde piocherait les dégradés de la première. `useId` les sépare. Les
 * deux-points que React y met sont retirés, parce qu'ils rendent l'identifiant
 * inutilisable dans un sélecteur CSS le jour où quelqu'un voudra le viser.
 *
 * Le dessin n'est pas en `currentColor`. Une assiette de porcelaine à filet bleu
 * est une couleur, pas une teinte héritée. C'est la seule primitive du produit
 * dans ce cas, et elle a le droit d'écrire ses couleurs en clair puisqu'elle vit
 * dans `src/ui`, la seule zone où la muselière ne s'applique pas.
 */
export function LogoLetikette({ className }: { className?: string }) {
	// Les deux-points de `useId` sont valides en HTML mais cassent tout
	// sélecteur CSS ; on les retire une fois pour toutes.
	const cle = useId().replaceAll(':', '');
	const marli = `marli-${cle}`;
	const paroi = `paroi-${cle}`;
	const fond = `fond-${cle}`;
	const glacure = `glacure-${cle}`;

	return (
		<svg
			viewBox="0 0 100 100"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="Letikette"
			className={className}
		>
			<defs>
				{/* Le marli, bombé : la lumière vient du haut à gauche.
				    L'écart clair-sombre est franc (1,00 → 0,74 de clarté). Réglé plus
				    doux, la porcelaine se dissolvait dans la page blanche à 44 px et il
				    ne restait que l'anneau bleu — c'est-à-dire le défaut d'origine. */}
				<linearGradient id={marli} x1="0.18" y1="0" x2="0.82" y2="1">
					<stop offset="0" stopColor="#ffffff" />
					<stop offset="0.52" stopColor="#efebe5" />
					<stop offset="1" stopColor="#bcb3a6" />
				</linearGradient>
				{/* La paroi, concave : l'ombrage est à CONTRESENS du marli. */}
				<linearGradient id={paroi} x1="0.5" y1="0" x2="0.5" y2="1">
					<stop offset="0" stopColor="#9b9284" />
					<stop offset="0.55" stopColor="#e7e1d9" />
					<stop offset="1" stopColor="#ffffff" />
				</linearGradient>
				{/* Le fond, à peine creusé, éclairé en bas à gauche. */}
				<radialGradient id={fond} cx="0.42" cy="0.62" r="0.8">
					<stop offset="0" stopColor="#ffffff" />
					<stop offset="1" stopColor="#e5dfd7" />
				</radialGradient>
				{/* Le reflet de la glaçure sur le bandeau, en haut à gauche seulement.
				    Un reflet qui ferait le tour redeviendrait un anneau.
				    Il est retenu à 0,50 : à 0,90 il délavait le bleu sur tout le quart
				    supérieur, et le bandeau paraissait interrompu plutôt que verni. */}
				<linearGradient id={glacure} x1="0.12" y1="0.04" x2="0.58" y2="0.88">
					<stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
					<stop offset="0.38" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>

			{/* L'écrasement se fait sur le GROUPE, donc les traits s'écrasent avec.
			    C'est juste optiquement : sur un disque vu de biais, un bandeau
			    concentrique paraît plus mince en haut et en bas qu'aux flancs. */}
			<g transform="translate(50 50) scale(1 0.88) translate(-50 -50)">
				<circle cx="50" cy="50" r="50" fill={`url(#${marli})`} />
				{/* Le trait de bord. Sans lui, une assiette de porcelaine posée sur la
				    page blanche de l'accueil n'a plus de silhouette du côté éclairé. */}
				<circle
					cx="50"
					cy="50"
					r="49.4"
					fill="none"
					stroke="#16307a"
					strokeWidth="1.2"
					opacity="0.55"
				/>
				{/* Rayon 46,7 et trait de 6,6 : le bord extérieur tombe pile sur 50,
				    donc le bandeau ne sort jamais de la boîte et ne se fait pas rogner. */}
				<circle cx="50" cy="50" r="46.7" fill="none" stroke="#1d3fa0" strokeWidth="6.6" />
				<circle
					cx="50"
					cy="50"
					r="46.7"
					fill="none"
					stroke={`url(#${glacure})`}
					strokeWidth="6.6"
				/>
				<circle
					cx="50"
					cy="50"
					r="39.4"
					fill="none"
					stroke="#1d3fa0"
					strokeWidth="1.5"
					opacity="0.72"
				/>
				<circle cx="50" cy="50" r="36" fill={`url(#${paroi})`} />
				{/* Le fond remonte de 0,6 : la paroi est plus épaisse en bas qu'en
				    haut, et cette dissymétrie est ce qui se lit comme un creux. */}
				<circle cx="50" cy="49.4" r="26.5" fill={`url(#${fond})`} />
			</g>
		</svg>
	);
}
