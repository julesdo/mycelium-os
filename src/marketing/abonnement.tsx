import { SectionMarketing, TitreSection, Exergue } from './section';

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

/**
 * ⚠️ CES TROIS RAISONS SONT RESTÉES EN EGALIM PENDANT VINGT JOURS, EN LIGNE.
 *
 * Le titre et le chapeau de la section avaient été réécrits pour le
 * recouvrement, pas elles. Un visiteur lisait donc, sur letikette.com, « le
 * découvrir en mars, l'année est close », « une soirée en mars », et un
 * fournisseur qui « monte la volaille de 10 % » — le calendrier de la
 * déclaration annuelle d'une cantine, sur une page qui parle d'impayés.
 *
 * C'est le même défaut que les documents juridiques réécrits le 23 septembre :
 * on remplace le cadre et on oublie ce qu'il contient. Le balayage large d'une
 * réécriture de domaine ne doit pas s'arrêter aux titres.
 */
const RAISONS = [
	{
		titre: 'Une créance se prescrit un jour précis.',
		texte:
			'Pas à la fin du trimestre, pas quand vous y penserez : un jour, qui n’est pas le même selon le secteur. Le produit le surveille tous les jours, parce que c’est tous les jours qu’il se rapproche.'
	},
	{
		titre: 'Les intérêts courent pendant que vous attendez.',
		texte:
			'Ils se calculent période par période, et le taux change deux fois par an. Un décompte arrêté six mois trop tard ne rattrape pas les six mois : il les perd.'
	},
	{
		titre: 'Un client solvable en janvier ne l’est pas en juin.',
		texte:
			'Le registre publie les procédures collectives en continu. Le produit les relève chaque nuit, sur vos clients à vous, et vous le dit le lendemain.'
	}
] as const;

export function Abonnement() {
	return (
		<SectionMarketing id="abonnement" fond="froid">
			<TitreSection
				titre="Une procédure est ponctuelle. Le risque, lui, court tous les jours."
				chapeau="Pourquoi payer tous les mois pour des impayés qu’on traite deux fois par an ? Trois raisons."
			/>

			{/*
			  ⚠️ NI TROIS CARTES, NI UN PANNEAU : TROIS COLONNES SUR LE FOND. Trois
			  surfaces distinctes se compareraient, comme trois formules d'un tarif,
			  alors que ce sont trois RAISONS qui s'additionnent. Un panneau unique
			  disait bien l'addition, et posait une carte de plus sur une page qui en
			  avait déjà trop. Le vide entre les colonnes dit exactement la même
			  chose, et ne coûte rien.

			  LE NUMÉRO EST UNE PASTILLE D'ACCENT. La version précédente n'en avait
			  aucun : trois blocs de texte de même poids, que l'œil ne pouvait pas
			  ordonner alors qu'ils SONT ordonnés — du plus fort au plus faible pour
			  la cible. Un chiffre en tête rend cet ordre lisible sans une phrase de
			  plus. C'est la seule pastille tolérée ici, parce qu'elle porte une
			  information — le rang — et pas un effet.
			*/}
			<div className="cascade cladd-color-brand grid gap-cladd-sm md:grid-cols-3 md:gap-cladd-2xs">
				{RAISONS.map((r, i) => (
					<div key={r.titre} className="flex flex-col gap-cladd-3xs">
						<span className="flex size-8 items-center justify-center rounded-full bg-cladd-primary/10 text-cladd-2xs font-bold text-cladd-primary tabular-nums">
							{i + 1}
						</span>
						<span className="font-serif text-intertitre leading-snug font-medium">{r.titre}</span>
						<span className="text-cladd-md leading-relaxed font-normal text-plume-douce">
							{r.texte}
						</span>
					</div>
				))}
			</div>

			<Exergue
				phrase="C’est exactement votre cabinet comptable."
				appui="Votre bilan fiscal ne sort qu’une fois par an, et vous payez votre cabinet tous les mois. Letikette fait la même chose pour vos impayés."
			/>
		</SectionMarketing>
	);
}
