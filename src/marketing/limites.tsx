import { MinusIcon } from 'lucide-react';
import { SectionMarketing, TitreSection, Panneau } from './section';

/**
 * Ce qu'on ne fait pas.
 *
 * POURQUOI UNE PAGE COMMERCIALE DIT SES LIMITES. Parce que la cible est
 * méfiante et qu'elle a raison de l'être : elle s'est déjà fait vendre un
 * tableau de bord qui affichait un chiffre sans savoir d'où il venait. Une
 * limite énoncée franchement vaut trois arguments, et celles-ci sont vérifiables
 * en une minute.
 *
 * ELLES SONT EMPILÉES DANS UN SEUL PANNEAU, sans numéros. C'étaient trois cartes, puis
 * trois colonnes numérotées 01/02/03 — et la numérotation était de l'ornement
 * déguisé en structure : ces trois limites ne forment aucune séquence, il n'y a
 * pas de « première » puis de « deuxième ». Un chiffre qui ne compte rien
 * n'apporte que l'air d'un gabarit.
 *
 * Ce qui reste, l'empilement pleine largeur, dit vrai : ce sont des
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
		texte: 'Le dossier est prêt. La saisie sur « ma cantine » reste la vôtre.'
	},
	{
		titre: 'On ne vend aucune denrée et on n’organise aucune livraison.',
		texte: 'Nous ne nous interposons ni dans la commande, ni dans le camion, ni dans le règlement.'
	},
	{
		titre: 'On ne promet pas un résultat.',
		texte:
			'Votre taux dépend de vos achats. Nous mesurons, nous documentons, et nous montrons où quelques euros déplacés rapportent le plus.'
	}
] as const;

export function Limites() {
	return (
		<SectionMarketing fond="papier">
			<TitreSection titre="Ce que Letikette ne fait pas" chapeau="Autant les lire maintenant." />

			{/*
			  ⚠️ LES RÈGLES NOIRES ONT DISPARU. Chaque clause était ouverte par un
			  filet d'encre pleine sur toute la largeur : trois traits noirs empilés,
			  le vocabulaire le plus dur du site, à deux sections d'un héros fait
			  d'un lavis et d'un objet posé.

			  Un seul panneau divisé garde exactement la lecture voulue — des
			  clauses qui s'enchaînent, titre à gauche, portée à droite — sans le
			  trait qui faisait « conditions générales imprimées ». Et il garde la
			  correction d'origine : EMPILÉES, jamais en trois colonnes, puisque la
			  page portait déjà deux grilles de trois à quelques écrans d'ici.

			  L'ICÔNE DIT « CE N'EST PAS AU PROGRAMME » sans le répéter en mots. Une
			  croix serait un échec, une interdiction un panneau routier ; le trait
			  barré est ce qui reste, et il est en plume claire — pas en rouge, qui
			  ne veut dire qu'une chose dans ce produit.
			*/}
			<Panneau divise>
				{LIMITES.map((l) => (
					<div
						key={l.titre}
						className="grid items-start gap-cladd-3xs p-cladd-2xs md:grid-cols-12 md:gap-cladd-2xs md:p-cladd-xs"
					>
						<h3 className="flex items-start gap-cladd-3xs font-serif text-intertitre leading-snug font-medium md:col-span-5">
							<MinusIcon aria-hidden className="mt-2 size-4 shrink-0 text-plume-claire" />
							{l.titre}
						</h3>
						<p className="text-cladd-md leading-relaxed font-normal text-plume-douce md:col-span-7">
							{l.texte}
						</p>
					</div>
				))}
			</Panneau>
		</SectionMarketing>
	);
}
