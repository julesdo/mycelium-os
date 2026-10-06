import type { ReactNode } from 'react';
import { cn } from './cn';
import { partsEurosCentimes } from './format';

/**
 * LE MONTANT, EN GRAND.
 *
 * Un sur-titre discret, le chiffre, une légende. C'est la composition de la
 * référence, et elle tient pour une raison précise : elle répond dans l'ordre
 * aux trois questions qu'on se pose devant un montant — de quoi parle-t-on,
 * combien, et depuis quand.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ LES CENTIMES SONT ÉCRITS, TOUJOURS, ET DANS UN CORPS PLUS PETIT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Deux exigences se contredisaient. Le produit impose que tout montant réclamé
 * s'affiche au centime — c'est ce que le débiteur refera à la main, et un
 * arrondi à l'écran rend le décompte contestable. Et un écran d'accueil impose
 * que le chiffre se lise d'un bout à l'autre d'un bureau.
 *
 * « 48 320,00 € » en corps plein déborde un téléphone. Le rétrécir ferait
 * perdre au seul chiffre qui compte l'autorité qu'il doit avoir. La référence
 * tranche en posant les centimes à un peu plus de la moitié du corps des
 * unités : on lit le montant d'un coup d'œil, et le centime reste écrit pour
 * qui le cherche. RIEN N'EST ARRONDI — c'est un découpage typographique, pas
 * une simplification du chiffre.
 *
 * ⚠️ ET IL N'EST JAMAIS COLORÉ. Il serait tentant de peindre en rouge un
 * montant qui s'approche de la prescription. Le vert, l'ambre et le rouge ne
 * disent qu'une chose dans ce produit — au-dessus du seuil, tout près, en
 * dessous — et un montant dû n'est pas un verdict : c'est une somme. Le verdict
 * se pose à côté, dans un mot qu'on peut lire, jamais dans la couleur du
 * chiffre lui-même.
 *
 * ⚠️ EN NEWSREADER, LA SERIF DU SITE, ET NULLE PART AILLEURS DANS L'APP
 * (06/10/2026, choix du fondateur : « montants seulement »). C'est le marqueur
 * le plus fort de la DA publique, posé sur le seul chiffre de chaque écran ;
 * tout le reste de l'interface reste en sans-serif. Graisse moyenne comme les
 * titres du site, chiffres alignés et de largeur fixe (`lining-nums`,
 * `tabular-nums`) : la serif a des chiffres elzéviriens qui danseraient.
 */
export function ChiffreHero({
	centimes,
	surTitre,
	legende,
	className
}: {
	centimes: bigint;
	/** Ce dont on parle. Court : « Ce qui vous est dû ». */
	surTitre?: string;
	/** Ce qui qualifie le chiffre — la date d'arrêté, le nombre de créances. */
	legende?: ReactNode;
	className?: string;
}) {
	const { signe, entiers, centimes: cents } = partsEurosCentimes(centimes);

	/*
	  ⚠️ TOUJOURS CENTRÉ. Il a été aligné à gauche le 30/09/2026, sous le grand
	  titre d'une page ; le grand titre est parti le même soir (« la même barre
	  compacte partout »), et le fondateur a fait recentrer le montant. Sous une
	  barre compacte, c'est le solde de Revolut : rien n'impose plus le bord.
	*/
	return (
		<div className={cn('flex flex-col items-center gap-1 text-center', className)}>
			{surTitre ? <p className="text-cladd-xs font-medium text-cladd-fg-soft">{surTitre}</p> : null}

			{/*
			  `items-baseline` et non `items-center` : les centimes s'alignent sur la
			  LIGNE DE PIED des unités, comme dans une composition typographique
			  ordinaire. Centrés, ils flotteraient au milieu du chiffre et le
			  montant lirait « 48 320 . 00 » au lieu de « 48 320,00 ».

			  `tabular-nums` est déjà posé sur le body, mais on le répète ici : c'est
			  le seul endroit du produit où un chiffre qui change de largeur
			  déplacerait toute la mise en page sous lui.
			*/}
			<p className="flex items-baseline justify-center font-serif lining-nums tabular-nums">
				<span className="text-letikette-hero leading-none font-medium tracking-titre-section">
					{signe}
					{entiers}
				</span>
				<span className="text-letikette-hero-centimes leading-none font-medium tracking-titre-section">
					,{cents}&nbsp;€
				</span>
			</p>

			{legende ? <div className="text-cladd-xs text-cladd-fg-soft">{legende}</div> : null}
		</div>
	);
}

const NOMBRE = new Intl.NumberFormat('fr-FR');

/**
 * UN NOMBRE, EN GRAND — le même geste que le montant, pour ce qui se compte.
 *
 * Le bilan d'un dépôt répond d'abord à une question : combien de factures sont
 * entrées. C'est la composition d'Expensify après un import (« 20 categories
 * have been added ») et celle du montant de nos autres écrans : ce dont on
 * parle, le chiffre, puis ce qui le qualifie. Même corps, même centrage, pour
 * qu'un écran n'ait jamais deux façons de poser son chiffre principal.
 */
export function NombreHero({
	nombre,
	surTitre,
	legende,
	className
}: {
	nombre: number;
	/** Ce dont on parle : « Factures entrées ». */
	surTitre: string;
	/** Ce qui qualifie le chiffre : d'où il vient, quand. */
	legende?: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn('flex flex-col items-center gap-1 text-center', className)}>
			<p className="text-cladd-xs font-medium text-cladd-fg-soft">{surTitre}</p>
			<p className="font-serif text-letikette-hero leading-none font-medium tracking-titre-section lining-nums tabular-nums">
				{NOMBRE.format(nombre)}
			</p>
			{legende ? <div className="text-cladd-xs text-cladd-fg-soft">{legende}</div> : null}
		</div>
	);
}
