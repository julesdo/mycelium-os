import { SectionMarketing } from './section';

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
 * L'ANALOGIE COMPTABLE FERME LA SECTION. C'est la seule qui fasse comprendre
 * l'abonnement en une phrase à quelqu'un qui n'a jamais acheté de logiciel : le
 * bilan fiscal sort une fois par an, et personne ne conteste de payer son
 * cabinet tous les mois pour autant. Elle conclut les trois arguments, donc
 * elle change de registre : un filet tireté sur le côté, le corps d'un titre de
 * section, la voix qui se pose.
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
		<SectionMarketing id="abonnement">
			<div className="flex items-center justify-between gap-cladd-2xs border-b border-dashed border-filet-nuit pb-cladd-3xs text-cladd-3xs font-medium tracking-widest text-craie-sourde uppercase">
				<span>L’abonnement</span>
				<span className="tabular-nums">3 raisons</span>
			</div>

			<div className="flex flex-col gap-cladd-2xs">
				<h2 className="apparait max-w-4xl font-affiche text-titre-section leading-tight font-semibold tracking-titre-section text-balance">
					Une procédure est ponctuelle.{' '}
					<span className="text-craie-claire">Le risque court tous les jours.</span>
				</h2>
				<p className="apparait max-w-2xl text-chapeau leading-relaxed font-normal text-craie-douce">
					Pourquoi payer tous les mois pour des impayés qu’on traite deux fois par an ? Trois
					raisons.
				</p>
			</div>

			{/*
			  ⚠️ NI TROIS CARTES, NI UN PANNEAU : TROIS COLONNES SUR LE FOND. Trois
			  surfaces distinctes se compareraient, comme trois formules d'un tarif,
			  alors que ce sont trois RAISONS qui s'additionnent. Un panneau unique
			  disait bien l'addition, et posait une carte de plus sur une page qui en
			  avait déjà trop. Le vide entre les colonnes dit exactement la même
			  chose, et ne coûte rien.

			  LE NUMÉRO PORTE UNE INFORMATION, PAS UN EFFET. La version d'origine n'en
			  avait aucun : trois blocs de texte de même poids, que l'œil ne pouvait
			  pas ordonner alors qu'ils SONT ordonnés, du plus fort au plus faible
			  pour la cible. Un chiffre en tête rend cet ordre lisible sans une
			  phrase de plus.

			  ⚠️ MAIS LA PASTILLE D'ACCENT A DISPARU AVEC LE PASSAGE À LA NUIT. Trois ronds
			  bleus posés sur du noir étaient les trois premières choses que l'œil
			  trouvait, avant les trois titres qu'ils numérotent. Le rang se lit aussi
			  bien dans un chiffre nu, en petites capitales et dans le ton le plus
			  sourd de la page : c'est l'ORDRE qu'il porte, pas une décoration, et un
			  ordre n'a pas besoin de crier.

			  Le filet tireté au-dessus du chiffre remplace le fond de la pastille :
			  il ouvre la colonne au lieu d'y poser un objet.
			*/}
			<div className="cascade grid gap-cladd-sm md:grid-cols-3 md:gap-cladd-2xs">
				{RAISONS.map((r, i) => (
					<div
						key={r.titre}
						className="flex flex-col gap-cladd-3xs border-t border-dashed border-filet-nuit pt-cladd-3xs"
					>
						<span className="text-cladd-3xs font-medium tracking-widest text-craie-sourde uppercase tabular-nums">
							{`0${i + 1}`}
						</span>
						<span className="text-intertitre leading-snug font-semibold">{r.titre}</span>
						<span className="text-cladd-md leading-relaxed font-normal text-craie-douce">
							{r.texte}
						</span>
					</div>
				))}
			</div>

			{/*
			  L'ANALOGIE FERME LA SECTION, et c'est la seule qui fasse comprendre
			  l'abonnement en une phrase à quelqu'un qui n'a jamais acheté de
			  logiciel : le bilan fiscal sort une fois par an, et personne ne conteste
			  de payer son cabinet tous les mois pour autant.

			  Elle remplace `Exergue`, qui est en serif — voir l'en-tête de
			  `la-loi.tsx` pour ce que la serif fait sur du noir.
			*/}
			<blockquote className="apparait flex max-w-4xl gap-cladd-2xs border-l border-dashed border-filet-nuit-vif pl-cladd-2xs">
				<div className="flex flex-col gap-cladd-3xs">
					<p className="font-affiche text-titre-section leading-tight font-medium tracking-titre-section text-balance">
						C’est exactement votre cabinet comptable.
					</p>
					<p className="text-cladd-md leading-relaxed font-normal text-craie-douce">
						Votre bilan fiscal ne sort qu’une fois par an, et vous payez votre cabinet tous les
						mois. Letikette fait la même chose pour vos impayés.
					</p>
				</div>
			</blockquote>
		</SectionMarketing>
	);
}
