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
 * ELLES SONT EMPILÉES SOUS UN FILET, sans numéros. C'étaient trois cartes, puis
 * trois colonnes numérotées 01/02/03 — et la numérotation était de l'ornement
 * déguisé en structure : ces trois limites ne forment aucune séquence, il n'y a
 * pas de « première » puis de « deuxième ». Un chiffre qui ne compte rien
 * n'apporte que l'air d'un gabarit.
 *
 * Ce qui reste, le filet et l'empilement pleine largeur, dit vrai : ce sont des
 * clauses, elles se lisent l'une après l'autre, et deux d'entre elles sont
 * littéralement des lignes rouges juridiques.
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
			'Le dossier est prêt, chiffres et justificatifs compris. La saisie sur « ma cantine » reste la vôtre : c’est une responsabilité qui ne se délègue pas à un logiciel.'
	},
	{
		titre: 'On ne vend aucune denrée et on n’organise aucune livraison.',
		texte:
			'Votre fournisseur vous facture et vous livre en direct, comme aujourd’hui. Nous ne nous interposons ni dans la commande, ni dans le camion, ni dans le règlement.'
	},
	{
		titre: 'On ne promet pas un résultat.',
		texte:
			'Votre taux dépend de ce que vous achetez, et cela n’appartient qu’à vous. Nous faisons plus modeste : mesurer, documenter, et vous montrer où quelques euros déplacés rapportent le plus de points.'
	}
] as const;

export function Limites() {
	return (
		<SectionMarketing fond="papier">
			<TitreSection
				titre="Ce que Letikette ne fait pas"
				chapeau="Trois choses que vous découvririez de toute façon. Autant les lire maintenant."
			/>

			{/*
			  TROIS CLAUSES EMPILÉES, ET NON TROIS COLONNES.

			  C'était une grille de trois, la même que celle des seuils légaux et
			  celle des raisons de l'abonnement : trois grilles de trois sur une seule
			  page, à quelques écrans d'intervalle. Au troisième passage l'œil ne lit
			  plus, il reconnaît une forme et saute.

			  Empilées et pleine largeur, avec le titre à gauche et le texte à droite,
			  elles se lisent comme les clauses d'un contrat — ce qu'elles sont
			  littéralement : deux lignes rouges juridiques et une limite de
			  responsabilité. La forme dit enfin la même chose que le fond.
			*/}
			<div className="flex flex-col">
				{LIMITES.map((l) => (
					<div
						key={l.titre}
						className="grid gap-cladd-3xs border-t border-plume py-cladd-xs md:grid-cols-12 md:gap-cladd-2xs"
					>
						<h3 className="font-serif text-intertitre leading-snug font-medium md:col-span-5">
							{l.titre}
						</h3>
						<p className="text-cladd-md leading-relaxed font-normal text-plume-douce md:col-span-7">
							{l.texte}
						</p>
					</div>
				))}
			</div>
		</SectionMarketing>
	);
}
