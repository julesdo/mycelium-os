import { PictoInterdit } from '../ui';
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
		titre: 'On ne relance jamais votre client à votre place.',
		texte:
			'Le recouvrement pour compte de tiers est une activité encadrée. Nous préparons le dossier ; c’est vous, ou le professionnel que vous mandatez, qui agissez.'
	},
	{
		titre: 'On ne touche jamais à vos fonds.',
		texte:
			'Aucun encaissement, aucun compte séquestre, aucune commission sur ce qui rentre. Votre client vous paie directement, comme avant.'
	},
	{
		titre: 'On ne vous dit pas quelle procédure engager.',
		texte:
			'Ce serait du conseil juridique, et nous ne sommes pas avocats. Le logiciel énonce des constats — « cette créance remplit telles conditions » — et vous laisse décider.'
	}
] as const;

export function Limites() {
	return (
		<SectionMarketing>
			{/*
			  LE RAIL TECHNIQUE, et il porte le compte. « 3 lignes rouges » n'est pas
			  une formule : ce sont les trois interdits écrits en tête du `CLAUDE.md`,
			  et un test balaie toute l'interface pour le mot qui les résume.
			*/}
			<div className="flex items-center justify-between gap-cladd-2xs border-b border-dashed border-filet-nuit pb-cladd-3xs text-cladd-3xs font-medium tracking-widest text-craie-sourde uppercase">
				<span>Les limites</span>
				<span className="tabular-nums">3 lignes rouges</span>
			</div>

			<div className="flex flex-col gap-cladd-2xs">
				{/*
				  ⚠️ LE TITRE ANNONCE UN MANQUE, ET C'EST VOLONTAIREMENT LA SEULE
				  SECTION QUI LE FASSE. Une page commerciale qui énumère ce qu'elle ne
				  fait pas passe pour maladroite ; elle l'est beaucoup moins qu'un
				  dirigeant qui découvre au troisième mois qu'on ne relancera jamais
				  son client à sa place. Les trois interdits sont structurels — le
				  recouvrement pour compte de tiers est encadré — donc ils ne
				  tomberont jamais, et mieux vaut qu'ils se lisent ici.
				*/}
				<h2 className="apparait max-w-4xl font-affiche text-titre-section leading-tight font-semibold tracking-titre-section text-balance">
					Ce que Letikette{' '}
					<span className="text-craie-claire">ne fera jamais.</span>
				</h2>
				<p className="apparait max-w-2xl text-chapeau leading-relaxed font-normal text-craie-douce">
					Autant les lire maintenant. Aucune des trois ne changera.
				</p>
			</div>

			{/*
			  ⚠️ LES RÈGLES NOIRES ONT DISPARU, ET LA CARTE QUI LES A REMPLACÉES
			  AUSSI. Chaque clause était ouverte par un filet d'encre pleine sur toute
			  la largeur : trois traits noirs empilés, le vocabulaire le plus dur du
			  site. Les enfermer dans un panneau à ombre portée a corrigé la dureté
			  et introduit une carte de plus sur une page qui en comptait déjà cinq.

			  Le filet clair fait le travail des deux : il enchaîne les clauses sans
			  les enfermer. Et la correction d'origine tient toujours — EMPILÉES,
			  jamais en trois colonnes, puisque la page porte déjà deux grilles de
			  trois à quelques écrans d'ici.

			  L'ICÔNE DIT « CE N'EST PAS AU PROGRAMME » sans le répéter en mots. Une
			  croix serait un échec, une interdiction un panneau routier ; le trait
			  barré est ce qui reste, et il est en plume claire — pas en rouge, qui
			  ne veut dire qu'une chose dans ce produit.
			*/}
			<div className="flex flex-col divide-y divide-dashed divide-filet-nuit">
				{LIMITES.map((l) => (
					<div
						key={l.titre}
						className="apparait grid items-start gap-cladd-3xs py-cladd-xs md:grid-cols-12 md:gap-cladd-2xs"
					>
						<h3 className="flex items-start gap-cladd-3xs text-intertitre leading-snug font-semibold md:col-span-5">
							<PictoInterdit className="mt-0.5 size-6 text-craie-sourde" />
							{l.titre}
						</h3>
						<p className="text-cladd-md leading-relaxed font-normal text-craie-douce md:col-span-7">
							{l.texte}
						</p>
					</div>
				))}
			</div>
		</SectionMarketing>
	);
}
