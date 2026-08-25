import { Surface } from '@cladd-ui/react';

/**
 * La règle, avant l'outil.
 *
 * POURQUOI CETTE SECTION EXISTE. La cible ne connaît souvent pas le détail de
 * ce qu'on lui demande : les cantines privées ne sont soumises que depuis 2024,
 * et le barème n'est écrit nulle part de façon lisible. Un visiteur qui découvre
 * l'obligation ici comprend d'un coup pourquoi il lui manque un chiffre.
 *
 * LES TROIS NOMBRES NE SONT PAS COLORÉS. Le vert, l'ambre et le rouge du
 * produit veulent dire « au-dessus du seuil, tout près, en dessous » et rien
 * d'autre. Ce sont des seuils légaux, pas des mesures : les peindre en vert
 * dirait « c'est atteint », ce qui est exactement l'inverse du propos.
 *
 * LA DERNIÈRE LIGNE EST LA PLUS UTILE DE LA PAGE. « Local », « circuit court »,
 * « de saison » et « fait maison » ne comptent pas au barème. C'est la surprise
 * de presque tous les gérants, ça se vérifie en trente secondes, et ça établit
 * qu'on connaît le sujet mieux que celui qui vend un tableau de bord.
 */

const SEUILS = [
	{
		valeur: '50 %',
		titre: 'de produits durables',
		detail: 'Bio, Label Rouge, AOP, IGP, HVE 3, pêche durable, commerce équitable.'
	},
	{
		valeur: '20 %',
		titre: 'dont du bio',
		detail: 'Les produits en conversion comptent aussi, dans les deux taux à la fois.'
	},
	{
		valeur: '60 %',
		titre: 'sur la viande et le poisson',
		detail: 'Un seuil à part, calculé sur ces deux familles seulement.'
	}
] as const;

export function LaLoi() {
	return (
		<section className="flex flex-col gap-cladd-2xs px-cladd-2xs py-cladd-md">
			<h2 className="text-letikette-titre leading-tight font-bold tracking-tight md:text-letikette-chiffre">
				Ce que la loi demande
			</h2>
			<p className="max-w-2xl text-cladd-sm leading-relaxed text-cladd-fg-soft">
				En valeur d&rsquo;achat hors taxes, sur l&rsquo;année civile, et à déclarer chaque année sur
				« ma cantine ». Le public y est soumis depuis 2022, le privé depuis 2024.
			</p>

			<div className="grid gap-cladd-2xs md:grid-cols-3">
				{SEUILS.map((s) => (
					<Surface
						key={s.titre}
						outline
						className="rounded-cladd-2xl"
						contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
					>
						<span className="text-letikette-chiffre leading-none font-bold tabular-nums">
							{s.valeur}
						</span>
						<span className="text-cladd-sm font-semibold">{s.titre}</span>
						<span className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{s.detail}</span>
					</Surface>
				))}
			</div>

			<Surface
				outline
				className="rounded-cladd-2xl"
				contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
			>
				<span className="text-cladd-sm font-semibold">
					« Local », « circuit court », « de saison » et « fait maison » ne comptent pas.
				</span>
				<span className="max-w-3xl text-cladd-xs leading-relaxed text-cladd-fg-soft">
					C&rsquo;est la première surprise de presque tout le monde. Ces mentions sont sincères et
					elles ne figurent pas au barème : une carotte du maraîcher d&rsquo;à côté, sans label,
					pèse zéro dans votre taux. C&rsquo;est aussi pour ça que beaucoup de cantines qui
					achètent bien déclarent mal.
				</span>
			</Surface>
		</section>
	);
}
