import { cn } from './cn';
import { LineWaves } from './line-waves';

/**
 * LE FOND — les ondes, sur lesquelles tout le reste est posé.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI IL COUVRE TOUT L'ÉCRAN, ET PLUS SEULEMENT LE HAUT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La première version ne peignait qu'un dégradé derrière le montant, éteint
 * avant la première carte. Comparée à la référence, l'écart ne venait pas des
 * composants : il venait de ce qu'il y a DERRIÈRE eux.
 *
 * Un verre n'a d'effet que s'il a quelque chose à réfracter. Posé sur un aplat
 * uniforme, il est indiscernable d'un aplat un peu plus clair. Il faut donc que
 * le fond soit à la fois PRÉSENT PARTOUT et VARIÉ — sans quoi toutes les
 * translucidités de l'interface retombent en aplats.
 *
 * ⚠️ IL EST `fixed`, ET C'EST UN RENVERSEMENT ASSUMÉ. Le dégradé précédent
 * défilait avec le contenu, ce qui était juste tant qu'il appartenait au hero.
 * Un fond d'écran, lui, ne défile pas : c'est ce qui permet aux cartes de
 * GLISSER DEVANT lui et de changer ce qu'on voit au travers pendant qu'on fait
 * défiler. Un fond solidaire du contenu donnerait un verre figé, donc invisible.
 *
 * ⚠️ ET IL NE PORTE AUCUNE INFORMATION, JAMAIS. Il serait tentant de le faire
 * virer au rouge quand une prescription approche. Les trois couleurs de seuil —
 * vert, ambre, rouge — sont les seules du produit qui portent un verdict, et un
 * verdict doit se lire sur un élément qu'on peut désigner du doigt, pas sur un
 * écran entier de lavis. D'où ces bleus : la seule famille que le produit
 * n'emploie pour rien d'autre.
 */
export function Fond({ className }: { className?: string }) {
	return (
		<div
			aria-hidden
			// `-z-10` place la couche DERRIÈRE le contenu de la coquille sans lui
			// disputer le flux. C'est la condition pour que `backdrop-filter`
			// fonctionne : il échantillonne ce qui est peint derrière l'élément, et
			// une carte rendue À L'INTÉRIEUR de cette couche ne floute rien du tout,
			// en silence.
			className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}
		>
			{/*
			  LES ONDES.

			  ⚠️ LES TROIS COULEURS SONT DES BLEUS, ET C'EST LA SEULE CONTRAINTE
			  NON NÉGOCIABLE DE CE COMPOSANT. Le shader d'origine cycle sur ses trois
			  canaux et produit, en blanc, des irisations qui passent par le vert et
			  le rouge. Sur ce produit-là, ces deux teintes ne veulent dire qu'une
			  chose — au-dessus du seuil, en dessous — et un fond qui les traverse
			  en permanence apprend à l'œil à les ignorer. En les tenant toutes les
			  trois dans la famille bleu-indigo, le cycle ne fait plus varier que la
			  nuance, jamais le sens.

			  `enableMouseInteraction` reste FAUX. Sur un fond plein écran, la
			  déformation au curseur donne l'impression que l'interface réagit à
			  autre chose qu'à ce qu'on vise — et elle coûte un écouteur de souris
			  global plus un rendu à chaque mouvement, sur un écran qu'on utilise
			  huit heures par jour.

			  `brightness` à 0,26 : au-delà, les lignes passent devant le montant au
			  lieu de rester derrière. Mesuré à l'écran sur le chiffre le plus long.
			*/}
			<LineWaves
				className="size-full"
				speed={0.22}
				innerLineCount={30}
				outerLineCount={38}
				warpIntensity={1.05}
				rotation={-45}
				edgeFadeWidth={0}
				colorCycleSpeed={0.55}
				brightness={0.26}
				color1="#5a7fd4"
				color2="#7b6ad8"
				color3="#4a9ad4"
				enableMouseInteraction={false}
			/>

			{/*
			  LE VOILE. Il assombrit le haut et le bas, là où vivent les deux barres
			  de verre et le montant.

			  ⚠️ SANS LUI, LES ONDES PASSENT DERRIÈRE LE CHIFFRE ET LE RENDENT
			  ILLISIBLE à certaines phases de l'animation — c'est-à-dire par
			  intermittence, ce qui est le pire cas : le défaut n'apparaît pas sur
			  une capture d'écran, seulement à l'usage. Le voile garantit un plancher
			  de contraste quelle que soit la position des lignes.
			*/}
			<div className="absolute inset-0 bg-[linear-gradient(to_bottom,var(--cladd-bg)_0%,transparent_28%,transparent_62%,var(--cladd-bg)_100%)] opacity-80" />

			{/*
			  LE RELÈVEMENT. Il vient APRÈS le voile, et cet ordre est le réglage.

			  Le voile garantit le contraste en écrasant le haut et le bas vers la
			  couleur de page ; mesuré, il y tombait à 0,154 de clarté — un
			  quasi-noir où le verre des barres n'a plus rien à réfracter et où
			  l'écran paraît éteint. Ce lavis les relève à 0,240.

			  ⚠️ ET IL N'EST PAS RÉGLABLE SEUL. Sur un thème sombre, éclaircir le
			  fond BAISSE le contraste du texte clair — le contre-sens exact qu'on
			  fait en croyant améliorer la lisibilité. `--cladd-fg-softest` a dû
			  être remonté en même temps, de 0,58 à 0,635, faute de quoi tout le
			  texte secondaire passait sous 4,5:1. Les deux valeurs sont calculées
			  l'une pour l'autre ; `.fond-releve` porte le détail des mesures.

			  Posé AVANT le voile, il serait écrasé par lui et ne servirait à rien.
			*/}
			<div className="fond-releve absolute inset-0" />

			{/*
			  LE GRAIN. Deux pour cent de bruit, en surimpression.

			  C'est la couche qu'on est tenté de sauter et celle qui fait la
			  différence entre « matière » et « rectangle calculé ». Elle masque au
			  passage les bandes de quantification qu'un grand dégradé sombre produit
			  sur une dalle 8 bits. Voir `.fond-grain`.
			*/}
			<div className="fond-grain absolute inset-0" />
		</div>
	);
}
