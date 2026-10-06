import { SectionMarketing } from './section';

/**
 * LE MANIFESTE — la seule section d'encre de la page (06/10/2026).
 *
 * La phrase la plus juste du projet, posée en pleine largeur sur la couleur de
 * la marque, comme le bloc typographique de Wise. Elle ne vend rien : elle dit
 * pourquoi le produit existe. La seconde phrase est écrite à la main — c'est
 * la remarque que quelqu'un a griffonnée dans la marge, et c'est celle qu'on
 * retient.
 *
 * ⚠️ PLUS DE NÉBULEUSE. Le ciel en SVG animé qui peignait ce bandeau pesait sur
 * le téléphone ; deux galets en CSS donnent la profondeur sans un nœud de plus.
 */
export function Bandeau() {
	return (
		<SectionMarketing ton="encre" courbe className="items-start gap-cladd-sm">
			<div
				aria-hidden
				className="galet -top-24 -right-24 -z-10 size-96 bg-encre-site-douce opacity-60"
			/>
			<div
				aria-hidden
				className="galet galet-b -bottom-32 -left-20 -z-10 size-80 bg-encre-site-douce opacity-40"
			/>
			<p className="apparait max-w-5xl font-serif text-affiche-colonne leading-tight font-medium tracking-titre-section text-balance">
				Une facture impayée ne fait aucun bruit le jour où elle devient irrécouvrable.
			</p>
			<p className="apparait manuscrit -rotate-1 text-titre-section leading-tight text-galet-abricot">
				C’est pourtant le seul jour où il aurait fallu agir.
			</p>
		</SectionMarketing>
	);
}
