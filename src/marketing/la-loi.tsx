import { Surface } from '@cladd-ui/react';
import { SectionMarketing } from './section';

/**
 * La règle, avant l'outil.
 *
 * POURQUOI CETTE SECTION EXISTE. La cible ne connaît souvent pas le détail de
 * ce qu'on lui demande : les cantines privées ne sont soumises que depuis 2024,
 * et le barème n'est écrit nulle part de façon lisible. Un visiteur qui découvre
 * l'obligation ici comprend d'un coup pourquoi il lui manque un chiffre.
 *
 * LES TROIS NOMBRES SONT LE SUJET, DONC ILS SONT ÉNORMES. Ils portent le corps
 * du taux, celui qui vaut cinquante-six pixels dans l'application, en graisse
 * maximale. Une obligation légale qu'on lit en corps de paragraphe ne se
 * mémorise pas ; celle-ci doit rester en tête jusqu'au bas de la page.
 *
 * ILS PORTENT L'ENCRE DE LA MARQUE, JAMAIS LE VERT. Le vert, l'ambre et le rouge
 * du produit veulent dire « au-dessus du seuil, tout près, en dessous », et rien
 * d'autre. Ce sont des seuils légaux, pas des mesures : les peindre en vert
 * dirait « c'est atteint », ce qui est l'inverse du propos.
 *
 * LES CARTES SONT SUR LA SURFACE HAUTE, la section sur le beige. C'est ce
 * décollement qui les fait exister ; posées sur le même fond, les trois nombres
 * flotteraient dans le vide.
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
		<SectionMarketing fond="page">
			<h2 className="text-letikette-titre leading-tight font-extrabold tracking-tight md:text-letikette-chiffre">
				Ce que la loi demande
			</h2>
			<p className="max-w-2xl text-cladd-md leading-relaxed font-normal text-cladd-fg-soft">
				En valeur d&rsquo;achat hors taxes, sur l&rsquo;année civile, et à déclarer chaque année sur
				« ma cantine ». Le public y est soumis depuis 2022, le privé depuis 2024.
			</p>

			<div className="grid gap-cladd-2xs md:grid-cols-3">
				{SEUILS.map((s) => (
					<Surface
						key={s.titre}
						outline
						className="rounded-cladd-2xl shadow-carte transition-shadow hover:shadow-carte-levee"
						contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
					>
						<span className="cladd-color-brand text-letikette-taux leading-none font-extrabold text-cladd-primary tabular-nums">
							{s.valeur}
						</span>
						<span className="text-cladd-md leading-snug font-bold">{s.titre}</span>
						<span className="text-cladd-sm leading-relaxed font-normal text-cladd-fg-soft">
							{s.detail}
						</span>
					</Surface>
				))}
			</div>

			<Surface
				outline
				className="rounded-cladd-2xl"
				contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
			>
				<span className="text-cladd-md leading-snug font-bold">
					« Local », « circuit court », « de saison » et « fait maison » ne comptent pas.
				</span>
				<span className="max-w-3xl text-cladd-sm leading-relaxed font-normal text-cladd-fg-soft">
					C&rsquo;est la première surprise de presque tout le monde. Ces mentions sont sincères et
					elles ne figurent pas au barème : une carotte du maraîcher d&rsquo;à côté, sans label,
					pèse zéro dans votre taux. C&rsquo;est aussi pour ça que beaucoup de cantines qui
					achètent bien déclarent mal.
				</span>
			</Surface>
		</SectionMarketing>
	);
}
