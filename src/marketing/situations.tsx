import { REGIMES_PRESCRIPTION } from '../lib/verticales/recouvrement/pays/france/prescription';
import { cn } from '../ui';
import {
	Chapeau,
	Photo,
	SectionMarketing,
	SurTitre,
	TitreSection,
	type PhotoSite
} from './section';

/**
 * POUR QUI — trois métiers, trois photos (06/10/2026, réécrite le soir même).
 *
 * Remplace « Vous vous reconnaissez ? » : trois gérants dessinés aux prénoms
 * d'exemple. Le fondateur a jugé le ton peu rassurant ; les sites du métier
 * (Revolut Business, Squarespace, Wise) présentent leurs segments par leur
 * NOM, une photo et une ligne. Des métiers, jamais un prénom à côté d'un
 * visage réel.
 *
 * ⚠️ LA DURÉE DU TRANSPORT EST LUE, PAS ÉCRITE : `REGIMES_PRESCRIPTION`.
 */

function annees(n: number): string {
	return `${n} ${n > 1 ? 'ans' : 'an'}`;
}

const SEGMENTS: readonly {
	readonly metier: string;
	readonly texte: string;
	readonly photo: PhotoSite;
	readonly description: string;
	readonly cadrage?: string;
}[] = [
	{
		metier: 'Commerce et négoce',
		texte: 'Beaucoup de factures, et des relances faites à la main quand on a le temps.',
		photo: 'commercante',
		description: 'Une commerçante souriante dans sa boutique, devant ses rayonnages.',
		cadrage: 'object-top'
	},
	{
		metier: 'Transport et livraison',
		texte: `Une facture de transport se réclame pendant ${annees(REGIMES_PRESCRIPTION.TRANSPORT_MARCHANDISES.dureeAnnees)}, contre ${annees(REGIMES_PRESCRIPTION.GENERAL.dureeAnnees)} en général.`,
		photo: 'chauffeur',
		description: 'Un chauffeur souriant au volant de sa camionnette, vitre baissée.'
	},
	{
		metier: 'Industrie et logistique',
		texte: 'Des montants élevés, des clients réguliers, et des retards qui s’installent.',
		photo: 'entrepot',
		description: 'Deux personnes qui marchent dans l’allée d’un entrepôt, un classeur à la main.',
		cadrage: 'object-top'
	}
];

export function Situations() {
	return (
		<SectionMarketing id="pour-qui" ton="creme" className="gap-cladd-lg">
			<div className="flex flex-col gap-cladd-2xs">
				<SurTitre teinte="argent">Pour qui</SurTitre>
				<TitreSection>Pour les entreprises qui facturent d’autres entreprises.</TitreSection>
				<Chapeau>
					Artisans, commerçants, transporteurs, industriels, prestataires de services.
				</Chapeau>
			</div>

			{/* LE CARROUSEL SUR TÉLÉPHONE, LA GRILLE AU-DELÀ. Les cartes débordent
			    jusqu'au bord de l'écran : c'est ce qui dit qu'il y en a d'autres. */}
			<div className="carrousel -mx-cladd-2xs flex snap-x snap-mandatory gap-cladd-2xs overflow-x-auto px-cladd-2xs pb-cladd-3xs md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
				{SEGMENTS.map((s) => (
					<article
						key={s.metier}
						className="flex w-4/5 shrink-0 snap-center flex-col overflow-hidden rounded-carte-site bg-papier shadow-carte-chaude md:w-auto"
					>
						<Photo
							photo={s.photo}
							description={s.description}
							sizes="(min-width: 768px) 360px, 80vw"
							className={cn('aspect-4/3', s.cadrage)}
						/>
						<div className="flex flex-col gap-1 p-cladd-xs">
							<h3 className="text-intertitre leading-snug font-semibold">{s.metier}</h3>
							<p className="text-cladd-md leading-relaxed text-encre-site-douce">{s.texte}</p>
						</div>
					</article>
				))}
			</div>
		</SectionMarketing>
	);
}
