import { cn, PictoEcheance, PictoInterets, PictoRegistre } from '../ui';
import {
	Chapeau,
	SectionMarketing,
	SurTitre,
	TitreSection,
	fondDeTeinte,
	type TeinteSite
} from './section';

/**
 * POURQUOI UN ABONNEMENT — l'objection levée avant le prix (06/10/2026).
 *
 * « Pourquoi payer tous les mois pour des impayés qu'on traite deux fois par
 * an ? » est la question que se pose tout gérant devant la grille. Elle reçoit
 * trois raisons, chacune dans la teinte de ce qu'elle surveille, puis la
 * comparaison qui la règle : le cabinet comptable, payé tous les mois pour un
 * bilan par an.
 */
const RAISONS: readonly {
	readonly titre: string;
	readonly texte: string;
	readonly teinte: TeinteSite;
	readonly Signe: typeof PictoEcheance;
}[] = [
	{
		titre: 'Ce qu’on vous doit a une date limite précise.',
		texte:
			'Pas à la fin du trimestre, pas quand vous y penserez : un jour, qui n’est pas le même selon le secteur. Le logiciel la surveille tous les jours, parce que c’est tous les jours qu’elle se rapproche.',
		teinte: 'temps',
		Signe: PictoEcheance
	},
	{
		titre: 'Les pénalités de retard courent pendant que vous attendez.',
		texte:
			'Elles se calculent période par période, et le taux change deux fois par an. Un décompte arrêté six mois trop tard ne rattrape pas les six mois : il les perd.',
		teinte: 'argent',
		Signe: PictoInterets
	},
	{
		titre: 'Un client solvable en janvier ne l’est pas toujours en juin.',
		texte:
			'Le registre publie les procédures collectives en continu. Le logiciel les relève chaque nuit, sur vos clients à vous, et vous le dit le lendemain.',
		teinte: 'papiers',
		Signe: PictoRegistre
	}
];

export function Abonnement() {
	return (
		<SectionMarketing id="abonnement" ton="creme" courbe className="gap-cladd-lg">
			<div className="flex flex-col gap-cladd-2xs">
				<SurTitre teinte="temps">L’abonnement</SurTitre>
				<TitreSection suite="Le risque court tous les jours.">
					Une procédure est ponctuelle.
				</TitreSection>
				<Chapeau>
					Pourquoi payer tous les mois pour des impayés qu’on traite deux fois par an ?
				</Chapeau>
			</div>

			<div className="cascade grid gap-cladd-sm md:grid-cols-3 md:gap-cladd-2xs">
				{RAISONS.map(({ titre, texte, teinte, Signe }, rang) => (
					<div
						key={titre}
						className={cn(
							'flex flex-col gap-cladd-2xs rounded-carte-site p-cladd-xs',
							fondDeTeinte(teinte)
						)}
					>
						<span className="flex items-center gap-cladd-3xs">
							<span className="flex size-10 items-center justify-center rounded-full bg-papier">
								<Signe className="size-6 text-encre-site" />
							</span>
							<span className="font-serif text-intertitre font-medium tabular-nums opacity-60">
								{`0${rang + 1}`}
							</span>
						</span>
						<span className="text-intertitre leading-snug font-semibold">{titre}</span>
						<span className="hidden text-cladd-md leading-relaxed text-encre-site-douce md:block">
							{texte}
						</span>
					</div>
				))}
			</div>

			{/* LA COMPARAISON QUI RÈGLE L'OBJECTION, en note posée de travers. */}
			<aside className="apparait autocollant-droite flex max-w-2xl flex-col gap-cladd-3xs self-end rounded-carte-site bg-papier p-cladd-xs shadow-carte-chaude">
				<p className="manuscrit text-titre-section leading-tight">
					C’est exactement votre cabinet comptable.
				</p>
				<p className="text-cladd-md leading-relaxed text-encre-site-douce">
					Votre bilan ne sort qu’une fois par an, et vous payez votre cabinet tous les mois.
					Letikette fait la même chose pour vos impayés.
				</p>
			</aside>
		</SectionMarketing>
	);
}
