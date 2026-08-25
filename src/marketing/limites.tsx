import { Surface } from '@cladd-ui/react';
import { SectionMarketing } from './section';

/**
 * Ce qu'on ne fait pas.
 *
 * POURQUOI UNE PAGE COMMERCIALE DIT SES LIMITES. Parce que la cible est
 * méfiante et qu'elle a raison de l'être : elle s'est déjà fait vendre un
 * tableau de bord qui affichait un chiffre sans savoir d'où il venait. Une
 * limite énoncée franchement vaut trois arguments, et celles-ci sont vérifiables
 * en une minute.
 *
 * ELLE EST SUR LA SURFACE ENFONCÉE, avec un filet. C'est la seule section qui se
 * met volontairement en retrait : elle vient juste après le bleu d'encre de la
 * preuve, et elle doit se lire comme une mise au point, pas comme un argument de
 * vente de plus. Le creux dit « on baisse la voix ».
 *
 * Les deux premières ne sont pas des choix commerciaux, ce sont les DEUX LIGNES
 * ROUGES juridiques du projet : ne jamais prendre la propriété des denrées, ne
 * jamais organiser le transport en nom propre — ce dernier relève du statut
 * réglementé de commissionnaire de transport.
 *
 * La troisième tient au vocabulaire du produit tout entier. On mesure, on
 * documente, on fait progresser. On ne promet pas un résultat qui dépend
 * entièrement des achats du gérant, et un test balaie l'interface pour vérifier
 * qu'aucun écran ne le laisse croire.
 */

const LIMITES = [
	{
		titre: 'On ne déclare pas à votre place.',
		texte:
			'Le dossier est prêt, les chiffres sont là, les justificatifs aussi. La télédéclaration sur « ma cantine » reste faite et signée par vous. C’est votre responsabilité, elle ne se délègue pas à un logiciel.'
	},
	{
		titre: 'On ne vend aucune denrée et on n’organise aucune livraison.',
		texte:
			'Votre fournisseur reste votre fournisseur : il vous facture en direct et il vous livre en direct. Letikette ne s’interpose ni dans la commande, ni dans le camion, ni dans le règlement.'
	},
	{
		titre: 'On ne promet pas un résultat.',
		texte:
			'Votre taux dépend de ce que vous achetez, et cela n’appartient qu’à vous. Ce que fait le logiciel est plus modeste et plus utile : il mesure, il documente, et il montre où quelques euros déplacés rapportent le plus de points.'
	}
] as const;

export function Limites() {
	return (
		<SectionMarketing fond="creuse">
			<h2 className="text-letikette-titre leading-tight font-extrabold tracking-tight md:text-letikette-chiffre">
				Ce que Letikette ne fait pas
			</h2>
			<p className="max-w-2xl text-cladd-md leading-relaxed font-normal text-cladd-fg-soft">
				Trois choses que vous découvririez de toute façon. Autant les lire maintenant.
			</p>

			<div className="grid gap-cladd-2xs md:grid-cols-3">
				{LIMITES.map((l) => (
					<Surface
						key={l.titre}
						outline
						className="rounded-cladd-2xl border border-cladd-bg-outline"
						contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
					>
						<span className="text-cladd-md leading-snug font-bold">{l.titre}</span>
						<span className="text-cladd-sm leading-relaxed font-normal text-cladd-fg-soft">
							{l.texte}
						</span>
					</Surface>
				))}
			</div>
		</SectionMarketing>
	);
}
