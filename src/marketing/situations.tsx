import { cn, PERSONNAGES, PortraitDessine, type Personnage } from '../ui';
import { SectionMarketing, SurTitre, TitreSection, fondDeTeinte, type TeinteSite } from './section';

/**
 * « VOUS VOUS RECONNAISSEZ ? » — LA CIBLE, EN TROIS VISAGES (06/10/2026).
 *
 * ⚠️ DES SITUATIONS TYPES, PAS DES TÉMOIGNAGES. Les prénoms sont des exemples,
 * la page le dit, et les visages sont DESSINÉS : un dessin se lit « exemple »,
 * une photographie de banque d'images se lirait « client ». Aucune carte ne
 * porte de guillemets ni de note.
 *
 * ⚠️ UNE PHRASE PAR CARTE. Sur téléphone, la section faisait 1 440 px et
 * 150 mots (« beaucoup de pâté de texte », le fondateur). Chaque carte dit
 * désormais une situation en une phrase, et ce que Letikette en fait à la
 * main ; elles défilent d'un geste au lieu de s'empiler.
 */

interface Situation {
	readonly qui: string;
	readonly metier: string;
	readonly personnage: Personnage;
	readonly recit: string;
	readonly reponse: string;
	readonly teinte: TeinteSite;
}

const SITUATIONS: readonly Situation[] = [
	{
		qui: 'Karim',
		metier: 'menuisier à Nantes',
		personnage: PERSONNAGES.karim,
		recit: 'Trois chantiers livrés, trois clients qui « paient le mois prochain ».',
		reponse: 'ce qu’on lui doit, au centime',
		teinte: 'papiers'
	},
	{
		qui: 'Sophie',
		metier: 'grossiste à Lyon',
		personnage: PERSONNAGES.sophie,
		recit: 'Deux cents factures par mois, et les relances le vendredi soir.',
		reponse: 'celles qui approchent de la date limite',
		teinte: 'temps'
	},
	{
		qui: 'Julien',
		metier: 'agence à Bordeaux',
		personnage: PERSONNAGES.julien,
		recit: 'Son plus gros client a quatre mois de retard, et il n’ose pas le relancer.',
		reponse: 'une lettre prête, à son nom',
		teinte: 'question'
	}
];

export function Situations() {
	return (
		<SectionMarketing id="pour-qui" ton="creme" className="gap-cladd-lg">
			<div className="flex flex-col gap-cladd-2xs">
				<SurTitre teinte="argent">Pour qui</SurTitre>
				<TitreSection>Vous vous reconnaissez ?</TitreSection>
				<p className="text-cladd-sm text-encre-site-claire">
					Trois situations types. Les prénoms sont des exemples.
				</p>
			</div>

			{/* LE CARROUSEL SUR TÉLÉPHONE, LA GRILLE AU-DELÀ. Les cartes débordent
			    jusqu'au bord de l'écran (marges négatives) : c'est ce qui dit qu'il y
			    en a d'autres à droite. */}
			<div className="carrousel -mx-cladd-2xs flex snap-x snap-mandatory gap-cladd-2xs overflow-x-auto px-cladd-2xs pb-cladd-3xs md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
				{SITUATIONS.map((s) => (
					<article
						key={s.qui}
						className={cn(
							'flex w-4/5 shrink-0 snap-center flex-col items-center gap-cladd-2xs rounded-carte-site px-cladd-xs py-cladd-sm text-center md:w-auto',
							fondDeTeinte(s.teinte)
						)}
					>
						<PortraitDessine
							personnage={s.personnage}
							fond="var(--color-papier)"
							className="size-28"
							titre={`${s.qui}, ${s.metier} (dessin)`}
						/>
						<div className="flex flex-col">
							<span className="font-serif text-titre-section leading-none font-medium">
								{s.qui}
							</span>
							<span className="text-cladd-sm text-encre-site-douce">{s.metier}</span>
						</div>
						<p className="text-cladd-md leading-relaxed text-balance">{s.recit}</p>
						<p className="manuscrit mt-auto text-intertitre leading-snug text-encre-site-douce">
							Letikette lui montre {s.reponse}.
						</p>
					</article>
				))}
			</div>
			<p
				aria-hidden
				className="manuscrit -mt-cladd-2xs self-end text-intertitre text-encre-site-claire md:hidden"
			>
				faites glisser →
			</p>
		</SectionMarketing>
	);
}
