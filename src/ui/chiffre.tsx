import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { cn } from './cn';
import { partsEurosCentimes } from './format';

/**
 * LES MONTANTS DÉJÀ MONTÉS PENDANT CETTE VISITE.
 *
 * ⚠️ UN MONTANT NE DÉFILE QU'UNE FOIS. Revenir sur l'accueil ne recompte pas
 * depuis zéro ce qu'on a déjà vu : à la troisième fois, l'animation serait une
 * attente. Il défile de nouveau quand il CHANGE — d'un montant à l'autre, plus
 * depuis zéro.
 */
const DEJA_MONTES = new Set<string>();

/** L'écriture d'un montant, en deux morceaux : les unités, puis les centimes. */
function ecritures(centimes: bigint): { readonly unites: string; readonly cents: string } {
	const { signe, entiers, centimes: cents } = partsEurosCentimes(centimes);
	return { unites: `${signe}${entiers}`, cents: `,${cents}\u00a0€` };
}

/**
 * LE MONTANT QUI DÉFILE JUSQU'À SA VALEUR — le solde de Revolut à l'ouverture.
 *
 * ⚠️ REACT ÉCRIT LA VALEUR EXACTE ; L'ANIMATION NE FAIT QUE PASSER PAR-DESSUS.
 * Le rendu pose le montant juste, au centime, dans deux nœuds de texte. Cet
 * effet réécrit ces MÊMES nœuds pendant neuf dixièmes de seconde, puis leur
 * rend la valeur exacte. Il ne touche à aucun état React : un rendu par image
 * ferait saccader l'écran, et un état intermédiaire dans React pourrait finir
 * dans une copie, un lecteur d'écran, un test. Le lecteur d'écran lit d'ailleurs
 * la valeur exacte, dans un texte à part (`sr-only`).
 *
 * ⚠️ AVANT LA PEINTURE (`useLayoutEffect`) : posé après, la première image
 * montrerait le montant final, puis zéro, puis le défilement.
 *
 * ⚠️ IL REPART DE CE QUI EST À L'ÉCRAN, PAS DE CE QU'IL CROIT AVOIR FAIT. Un
 * effet peut être interrompu et relancé — React le fait exprès au montage en
 * développement, et le montant peut changer en plein défilement. La référence
 * `affiche` dit la valeur que les nœuds montrent en ce moment : on repart d'elle,
 * et chaque sortie sans animation y écrit la valeur exacte. La première version
 * repartait du montant « précédent » : interrompue au montage, elle laissait
 * « 0,00 € » à l'écran.
 *
 * ⚠️ RIEN SOUS `prefers-reduced-motion`.
 */
function useMontantQuiDefile(centimes: bigint, actif: boolean) {
	// Les deux morceaux du montant : le crochet les pose lui-même, et l'écran
	// les accroche à ses `span`.
	const unites = useRef<HTMLSpanElement>(null);
	const cents = useRef<HTMLSpanElement>(null);
	/** La valeur que les nœuds montrent en ce moment, `null` avant tout passage. */
	const affiche = useRef<bigint | null>(null);

	useLayoutEffect(() => {
		const noeudUnites = unites.current?.firstChild;
		const noeudCents = cents.current?.firstChild;
		if (!(noeudUnites instanceof Text) || !(noeudCents instanceof Text)) return;
		const poser = (valeur: bigint) => {
			const e = ecritures(valeur);
			noeudUnites.nodeValue = e.unites;
			noeudCents.nodeValue = e.cents;
			affiche.current = valeur;
		};

		const cle = centimes.toString();
		const depuis =
			affiche.current ?? (actif && !DEJA_MONTES.has(cle) ? 0n : centimes);
		if (actif) DEJA_MONTES.add(cle);
		if (
			!actif ||
			depuis === centimes ||
			window.matchMedia('(prefers-reduced-motion: reduce)').matches
		) {
			poser(centimes);
			return;
		}

		const a = Number(depuis);
		const b = Number(centimes);
		// Plus long depuis zéro que d'un montant à l'autre : une ouverture se
		// découvre, un changement se suit.
		const duree = depuis === 0n ? 900 : 500;
		const debut = performance.now();
		let image = 0;
		const pas = (maintenant: number) => {
			// ⚠️ BORNÉ À ZÉRO EN BAS : l'horodatage d'une image est celui de son
			// DÉBUT, qui peut précéder `debut`. Non borné, la première image
			// affichait un montant négatif (« −29 233,02 € », relevé au navigateur).
			const t = Math.min(1, Math.max(0, (maintenant - debut) / duree));
			if (t >= 1) {
				poser(centimes);
				return;
			}
			// Rapide au départ, lent à l'arrivée : l'œil se pose sur les derniers chiffres.
			const avance = 1 - (1 - t) ** 4;
			poser(BigInt(Math.round(a + (b - a) * avance)));
			image = requestAnimationFrame(pas);
		};
		poser(depuis);
		image = requestAnimationFrame(pas);
		// ⚠️ UN FILET : un onglet en arrière-plan suspend les images, et le montant
		// resterait à mi-chemin jusqu'au retour. Passé sa durée, il est exact.
		const filet = setTimeout(() => {
			cancelAnimationFrame(image);
			poser(centimes);
		}, duree + 250);
		// ⚠️ ON N'Y REMET PAS LA VALEUR FINALE : quand le montant change, React a
		// déjà écrit la nouvelle avant ce nettoyage, et l'effet suivant repart de
		// ce qui est affiché.
		return () => {
			cancelAnimationFrame(image);
			clearTimeout(filet);
		};
	}, [centimes, actif]);

	return { unites, cents };
}

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
	defile = false,
	className
}: {
	centimes: bigint;
	/** Ce dont on parle. Court : « Ce qui vous est dû ». */
	surTitre?: string;
	/** Ce qui qualifie le chiffre — la date d'arrêté, le nombre de créances. */
	legende?: ReactNode;
	/**
	 * Le montant défile jusqu'à sa valeur la première fois qu'on le voit.
	 *
	 * ⚠️ SUR DEMANDE, PAS PARTOUT : l'accueil, « Ce qui est dû », la feuille de
	 * réussite. Jamais sur la page où le client paie — un montant qui défile
	 * devant celui qui doit le régler ressemble à un compteur qui tourne.
	 */
	defile?: boolean;
	className?: string;
}) {
	const { unites, cents } = ecritures(centimes);
	const { unites: refUnites, cents: refCents } = useMontantQuiDefile(centimes, defile);

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
				{/* La valeur exacte, pour le lecteur d'écran : le chiffre visible défile. */}
				<span className="sr-only">{`${unites}${cents}`}</span>
				{/*
				  ⚠️ UNE SEULE EXPRESSION PAR SPAN : un seul nœud de texte, celui que
				  l'animation réécrit. `{signe}{entiers}` en faisait deux.
				*/}
				<span
					ref={refUnites}
					aria-hidden
					className="text-letikette-hero leading-none font-medium tracking-titre-section"
				>
					{unites}
				</span>
				<span
					ref={refCents}
					aria-hidden
					className="text-letikette-hero-centimes leading-none font-medium tracking-titre-section"
				>
					{cents}
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
