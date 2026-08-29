import { SectionMarketing, TitreSection } from './section';

/**
 * Pourquoi un abonnement, pour une obligation annuelle.
 *
 * C'EST LA PREMIÈRE OBJECTION, ET LA PAGE N'Y RÉPONDAIT PAS. Un gérant qui
 * perçoit Letikette comme une calculette de fin d'année ne paiera jamais tous
 * les mois. Il faut donc retourner la perception avant qu'elle se forme : on ne
 * vend pas un document annuel, on vend un suivi.
 *
 * Les trois arguments sont dans l'ordre de force décroissante pour la cible.
 * Le pilotage d'abord, parce que c'est le seul qui touche à la peur d'être en
 * infraction sans l'avoir vu venir. L'étalement ensuite, parce que c'est celui
 * qui parle au quotidien. La veille sur les prix en dernier, parce qu'elle
 * ouvre la suite sans rien promettre aujourd'hui.
 *
 * L'ANALOGIE COMPTABLE FERME LA SECTION, EN EXERGUE. C'est la seule qui fasse
 * comprendre l'abonnement en une phrase à quelqu'un qui n'a jamais acheté de
 * logiciel : le bilan fiscal sort une fois par an, et personne ne conteste de
 * payer son cabinet tous les mois pour autant. Elle était dans une carte de
 * plus, au même niveau que les trois arguments ; elle les conclut, donc elle
 * doit changer de registre — un filet épais, une serif, la voix qui se pose.
 */

const RAISONS = [
	{
		titre: 'Un GPS, pas un constat après l’accident.',
		texte:
			'Le découvrir en mars, l’année est close. Le voir en octobre, c’est deux mois de commandes pour rattraper.'
	},
	{
		titre: 'Cinq minutes par mois plutôt qu’une soirée en mars.',
		texte:
			'Vous validez à chaud, pendant que vous vous souvenez des livraisons. En mars, le bilan est déjà fait.'
	},
	{
		titre: 'Vos prix d’achat sous l’œil, toute l’année.',
		texte:
			'Un fournisseur monte la volaille de 10 % entre janvier et juin. Une fois par an, ça passe inaperçu et ça se paie douze mois.'
	}
] as const;

export function Abonnement() {
	return (
		<SectionMarketing fond="froid">
			<TitreSection
				titre="La déclaration est annuelle. Le suivi ne l’est pas."
				chapeau="Pourquoi payer tous les mois pour une obligation annuelle ? Trois raisons."
			/>

			<div className="grid divide-y divide-trait border-y border-trait md:grid-cols-3 md:divide-x md:divide-y-0">
				{RAISONS.map((r) => (
					<div key={r.titre} className="flex flex-col gap-cladd-3xs py-cladd-xs md:px-cladd-2xs">
						<span className="font-serif text-intertitre leading-snug font-medium">{r.titre}</span>
						<span className="text-cladd-md leading-relaxed font-normal text-plume-douce">
							{r.texte}
						</span>
					</div>
				))}
			</div>

			<blockquote className="max-w-4xl border-l-4 border-plume pl-cladd-2xs">
				<p className="font-serif text-titre-section leading-tight font-medium">
					C’est exactement votre cabinet comptable.
				</p>
				<p className="pt-cladd-3xs text-cladd-md leading-relaxed font-normal text-plume-douce">
					Votre bilan fiscal ne sort qu’une fois par an, et vous payez votre cabinet tous les mois.
					Letikette fait la même chose pour votre assiette.
				</p>
			</blockquote>
		</SectionMarketing>
	);
}
