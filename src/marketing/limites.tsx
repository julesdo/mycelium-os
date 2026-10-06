import { PictoInterdit } from '../ui';
import { Chapeau, SectionMarketing, SurTitre, TitreSection } from './section';

/**
 * CE QUE LETIKETTE NE FERA JAMAIS — les trois lignes rouges, dites au client.
 *
 * Elles ne sont pas une clause : ce sont les limites du produit, et elles
 * rassurent la cible mieux qu'une promesse. Un gérant qui craint de « perdre le
 * client » doit lire, avant de payer, qu'on ne lui écrira jamais à sa place.
 *
 * Trois cartes de papier posées sur le crème profond, l'interdit dans une
 * pastille rose — la teinte de ce qu'on vous demande, puisque chaque refus
 * rend une décision au gérant.
 */
const LIMITES = [
	{
		titre: 'On ne relance jamais votre client à votre place.',
		texte:
			'Le recouvrement pour compte d’autrui est une activité encadrée. Le logiciel prépare ; c’est vous, ou le professionnel que vous choisissez, qui agissez.'
	},
	{
		titre: 'On ne touche jamais à votre argent.',
		texte:
			'Aucun encaissement, aucun compte séquestre, aucune commission sur ce qui rentre. Votre client vous paie directement, comme avant.'
	},
	{
		titre: 'On ne vous dit pas quelle procédure engager.',
		texte:
			'Ce serait du conseil juridique, et le logiciel n’est pas avocat. Il calcule, date et montre ses sources ; la décision d’agir, et comment, reste la vôtre.'
	}
] as const;

export function Limites() {
	return (
		<SectionMarketing ton="profond" courbe className="gap-cladd-lg">
			<div className="flex flex-col gap-cladd-2xs">
				<SurTitre teinte="question">Les limites</SurTitre>
				<TitreSection suite="ne fera jamais.">Ce que Letikette</TitreSection>
				<Chapeau>Autant les lire maintenant. Aucune des trois ne changera.</Chapeau>
			</div>

			<div className="cascade grid gap-cladd-sm md:grid-cols-3 md:gap-cladd-2xs">
				{LIMITES.map((l) => (
					<div
						key={l.titre}
						className="flex flex-col gap-cladd-2xs rounded-carte-site bg-papier p-cladd-xs shadow-carte-chaude"
					>
						<span className="flex size-11 items-center justify-center rounded-full bg-teinte-question">
							<PictoInterdit className="size-6 text-encre-site" />
						</span>
						<h3 className="font-serif text-intertitre leading-snug font-medium text-balance">
							{l.titre}
						</h3>
						<p className="text-cladd-md leading-relaxed text-encre-site-douce">{l.texte}</p>
					</div>
				))}
			</div>
		</SectionMarketing>
	);
}
