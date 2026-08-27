import { SectionMarketing, TitreSection } from './section';

/**
 * Ce qu'on ne fait pas.
 *
 * POURQUOI UNE PAGE COMMERCIALE DIT SES LIMITES. Parce que la cible est
 * méfiante et qu'elle a raison de l'être : elle s'est déjà fait vendre un
 * tableau de bord qui affichait un chiffre sans savoir d'où il venait. Une
 * limite énoncée franchement vaut trois arguments, et celles-ci sont vérifiables
 * en une minute.
 *
 * ELLES SONT NUMÉROTÉES COMME DES CLAUSES, sous un filet chacune. C'était trois
 * cartes ; or une limite n'est pas une fonctionnalité, et lui donner la même
 * forme qu'à une fonctionnalité brouille exactement ce qu'elle vient dire. La
 * numérotation et le filet la rangent dans le registre du contrat, qui est le
 * bon.
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
		<SectionMarketing fond="papier">
			<TitreSection
				sur="Périmètre"
				titre="Ce que Letikette ne fait pas"
				chapeau="Trois choses que vous découvririez de toute façon. Autant les lire maintenant."
			/>

			<ol className="grid gap-cladd-xs md:grid-cols-3 md:gap-cladd-2xs">
				{LIMITES.map((l, i) => (
					<li
						key={l.titre}
						className="flex flex-col gap-cladd-3xs border-t border-plume pt-cladd-3xs"
					>
						<span className="font-serif text-cladd-md font-medium text-plume-claire tabular-nums">
							{String(i + 1).padStart(2, '0')}
						</span>
						<span className="font-serif text-intertitre leading-snug font-medium">{l.titre}</span>
						<span className="text-cladd-md leading-relaxed font-normal text-plume-douce">
							{l.texte}
						</span>
					</li>
				))}
			</ol>
		</SectionMarketing>
	);
}
