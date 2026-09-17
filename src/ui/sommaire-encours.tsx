import type { ReactNode } from 'react';
import { Surface } from '@cladd-ui/react';
import { partsEurosCentimes } from './format';

/**
 * LE SOMMAIRE D'UNE LISTE : CE QUE L'ENSEMBLE DOIT, ET CE QUE CE TOTAL RECOUVRE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE N'EST PAS `ChiffreHero`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `ChiffreHero` porte le chiffre d'un ÉCRAN — un décompte, l'encours d'une
 * créance — et son corps s'écrit `clamp(40px, 11.5vw, 72px)`. Le `vw` lit la
 * FENÊTRE, jamais la colonne : dans le volet gauche d'un maître-détail, large
 * de 26 rem, un total de onze caractères y serait rendu à 72 px et déborderait
 * de plus du double.
 *
 * Ici le chiffre qualifie une LISTE. Il doit dominer ses rangées sans prétendre
 * au rang du chiffre d'un écran, et tenir dans une colonne étroite : un corps
 * FIXE, `--text-letikette-chiffre`, et rien qui dépende de la fenêtre.
 *
 * ⚠️ LES CENTIMES SONT ÉCRITS, ET DANS UN CORPS PLUS PETIT. Même règle que le
 * hero, pour la même raison : le produit impose que tout montant s'affiche au
 * centime, et rien n'est arrondi. Ce n'est qu'un découpage typographique.
 *
 * ⚠️ JAMAIS UN CADRAN À ZÉRO (règle d'écran n° 4). Un total nul n'est pas un
 * chiffre à poser en grand, c'est un FAIT à écrire en toutes lettres — et c'est
 * l'appelant qui l'écrit, parce que lui seul sait ce que « rien » veut dire sur
 * son écran. `centimes` vaut alors `null`, et le sommaire ne rend que son
 * sur-titre et ses faits.
 *
 * ⚠️ ET IL N'EST JAMAIS COLORÉ, comme le hero : le vert, l'ambre et le rouge ne
 * disent qu'une chose dans ce produit — au-dessus du seuil, tout près, en
 * dessous. Une somme due n'est pas un verdict.
 */
export function SommaireEncours({
	surTitre,
	centimes,
	faits,
	angleMort
}: {
	/** Ce dont on parle. Court : « Encours total ». */
	surTitre: string;
	/** Le total, en centimes. `null` quand rien n'est dû : voir plus haut. */
	centimes: bigint | null;
	/** Ce que le total recouvre : combien de clients, et combien sont en retard. */
	faits: ReactNode;
	/**
	 * CE QUE LE LOGICIEL NE VOIT PAS DE CET ENSEMBLE, et ce que ça lui fait
	 * retenir. Absent quand il n'y en a pas — on n'écrit pas « aucun angle
	 * mort », qui se lirait comme une promesse.
	 *
	 * ⚠️ IL A SA PLACE ICI, ET PAS SUR CHAQUE RANGÉE. Une puce « SIREN
	 * manquant » posée sur une ligne dit le fait et jamais sa CONSÉQUENCE, et
	 * elle ne se voit qu'en faisant défiler jusqu'à la bonne ligne. Dit une
	 * fois, en haut, avec ce qu'il en découle, il se lit sans un geste.
	 */
	angleMort?: ReactNode;
}) {
	const parts = centimes === null ? null : partsEurosCentimes(centimes);

	return (
		<Surface
			as="section"
			aria-label={surTitre}
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-1 p-cladd-3xs"
		>
			<p className="text-cladd-xs font-medium text-cladd-fg-soft">{surTitre}</p>

			{parts === null ? null : (
				/*
				  `items-baseline` : les centimes s'alignent sur la ligne de pied des
				  unités, comme dans une composition typographique ordinaire. Centrés,
				  ils flotteraient au milieu et le montant lirait « 41 280 . 50 ».
				*/
				<p className="flex items-baseline tabular-nums">
					<span className="text-letikette-chiffre leading-none font-extrabold tracking-tight">
						{parts.signe}
						{parts.entiers}
					</span>
					<span className="text-cladd-md leading-none font-extrabold tracking-tight">
						,{parts.centimes}&nbsp;€
					</span>
				</p>
			)}

			<p className="text-cladd-xs text-cladd-fg-soft">{faits}</p>

			{angleMort === undefined ? null : (
				/*
				  ⚠️ NI ROUGE, NI AMBRE. Ces couleurs sont réservées aux trois états de
				  seuil, et un angle mort n'est pas un seuil : c'est une hypothèse que
				  le logiciel déclare. Ce qui le met à part, c'est un filet et de l'air,
				  pas une couleur d'alarme qui voudrait dire autre chose.
				*/
				<p className="mt-cladd-3xs border-t border-cladd-outline pt-cladd-3xs text-cladd-xs leading-relaxed text-cladd-fg-softer">
					{angleMort}
				</p>
			)}
		</Surface>
	);
}
