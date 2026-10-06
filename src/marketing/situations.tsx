import { cn } from '../ui';
import {
	Chapeau,
	SectionMarketing,
	SurTitre,
	TitreSection,
	fondDeTeinte,
	galetDeTeinte,
	type TeinteSite
} from './section';

/**
 * « VOUS VOUS RECONNAISSEZ ? » — LA CIBLE, EN TROIS PERSONNES (06/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ DES SITUATIONS TYPES, PAS DES TÉMOIGNAGES — ET LA PAGE LE DIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur a demandé de l'humanité et d'« intégrer notre cible ». La page ne
 * parlait que de la loi et du logiciel ; elle ne montrait jamais la personne
 * qui a les impayés. Ces trois cartes la montrent : un menuisier, une
 * grossiste, une agence, et ce qui les tient éveillés.
 *
 * Ce ne sont PAS des clients. Un faux témoignage serait une preuve fabriquée —
 * ce que ce produit ne s'autorise nulle part. Les prénoms sont des exemples, la
 * phrase sous le titre le dit, et aucune carte ne porte de guillemets ni de
 * note.
 *
 * Chaque carte prend la teinte de ce qui la concerne, comme dans le produit :
 * les papiers (des chantiers facturés), le temps (des dates qui approchent), ce
 * qu'on vous demande (une décision délicate).
 */

interface Situation {
	readonly initiales: string;
	readonly qui: string;
	readonly metier: string;
	readonly recit: string;
	/** Ce que Letikette lui montre, à la main, en bas de la carte. */
	readonly reponse: string;
	readonly teinte: TeinteSite;
}

const SITUATIONS: readonly Situation[] = [
	{
		initiales: 'KB',
		qui: 'Karim',
		metier: 'menuisier à Nantes',
		recit:
			'Trois chantiers livrés au printemps, trois clients qui « paient le mois prochain ». 18 400 € dehors depuis l’été, et pas une minute pour compter le reste.',
		reponse: 'ce qu’on lui doit vraiment, au centime',
		teinte: 'papiers'
	},
	{
		initiales: 'SL',
		qui: 'Sophie',
		metier: 'grossiste à Lyon',
		recit:
			'Deux cents factures par mois, et les relances le vendredi soir, quand il reste du temps. Elle ne sait jamais lesquelles approchent de leur date limite.',
		reponse: 'celles qui approchent, avant qu’il soit tard',
		teinte: 'temps'
	},
	{
		initiales: 'JM',
		qui: 'Julien',
		metier: 'agence de communication à Bordeaux',
		recit:
			'Son plus gros client a quatre mois de retard. Le relancer, c’est risquer la relation ; attendre, c’est risquer la facture.',
		reponse: 'une lettre prête, à son nom, s’il décide',
		teinte: 'question'
	}
];

export function Situations() {
	return (
		<SectionMarketing ton="creme" className="gap-cladd-lg">
			<div className="flex flex-col gap-cladd-2xs">
				<SurTitre teinte="argent">Pour qui</SurTitre>
				<TitreSection>Vous vous reconnaissez ?</TitreSection>
				<Chapeau>
					Trois situations types, avec des prénoms d’exemple. Si l’une d’elles est la vôtre,
					Letikette a été écrit pour vous.
				</Chapeau>
			</div>

			<div className="cascade grid gap-cladd-sm md:grid-cols-3 md:gap-cladd-2xs">
				{SITUATIONS.map((s) => (
					<article
						key={s.qui}
						className={cn(
							'relative isolate flex flex-col gap-cladd-2xs overflow-clip rounded-carte-site p-cladd-xs',
							fondDeTeinte(s.teinte)
						)}
					>
						<div
							aria-hidden
							className={cn(
								'galet galet-b -top-10 -right-12 -z-10 size-40',
								galetDeTeinte(s.teinte)
							)}
						/>
						<div className="flex items-center gap-cladd-3xs">
							<span
								aria-hidden
								className="flex size-12 shrink-0 items-center justify-center rounded-full bg-papier text-cladd-sm font-semibold"
							>
								{s.initiales}
							</span>
							<span className="flex flex-col">
								<span className="text-intertitre leading-tight font-semibold">{s.qui}</span>
								<span className="text-cladd-sm text-encre-site-douce">{s.metier}</span>
							</span>
						</div>
						<p className="text-cladd-md leading-relaxed text-encre-site-douce">{s.recit}</p>
						<p className="mt-auto flex items-start gap-1 border-t border-filet-creme pt-cladd-3xs">
							<span className="manuscrit text-intertitre leading-snug">
								→ Letikette lui montre {s.reponse}.
							</span>
						</p>
					</article>
				))}
			</div>
		</SectionMarketing>
	);
}
