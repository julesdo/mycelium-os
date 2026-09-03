/**
 * La bande qui coupe la page.
 *
 * ⚠️ ELLE A PERDU SA PHOTOGRAPHIE, ET C'EST UN AVEU. Elle portait une ligne de
 * self en pleine largeur, sous une phrase qui disait « chaque euro servi dans
 * ces bacs est une ligne dans une facture ». La photo était juste pour un
 * produit alimentaire ; elle ne l'est plus du tout, et il n'existe pas de
 * photographie du recouvrement qui ne soit pas un cliché — une poignée de main,
 * un marteau de juge, une pile de pièces.
 *
 * Plutôt qu'une image qui mentirait sur le sujet, la bande est devenue
 * TYPOGRAPHIQUE. Elle garde exactement ce qu'elle apportait à la page : une
 * respiration sombre, pleine largeur, entre deux sections claires. Ce qu'elle
 * perd, c'est une illustration qu'on ne sait pas remplacer honnêtement.
 *
 * Si un jeu d'images propre au sujet est un jour produit, c'est ici qu'il
 * revient.
 */
export function Bandeau() {
	return (
		<section className="relative w-full border-y border-trait-encre bg-encre-nuit">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-cladd-2xs px-cladd-2xs py-cladd-2xl">
				<p className="max-w-4xl font-serif text-titre-section leading-tight font-semibold text-plume-inversee">
					Une facture impayée ne fait aucun bruit le jour où elle devient irrécouvrable.
				</p>
				<p className="max-w-2xl text-chapeau leading-relaxed font-normal text-plume-inversee-douce">
					C’est le seul jour où il aurait fallu agir.
				</p>
			</div>
		</section>
	);
}
