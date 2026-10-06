import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import { BoutonAffiche, cn, LienAffiche } from '../ui';
import { Photo, SectionMarketing, type PhotoSite } from './section';

const POLAROIDS: readonly {
	photo: PhotoSite;
	legende: string;
	description: string;
	incline: string;
}[] = [
	{
		photo: 'entrepot',
		legende: 'l’entrepôt',
		description: 'Deux personnes qui marchent dans l’allée d’un entrepôt, un classeur à la main.',
		incline: '-rotate-6 translate-x-1 translate-y-3'
	},
	{
		photo: 'commercante',
		legende: 'la boutique',
		description: 'Une commerçante souriante dans sa boutique, devant ses rayonnages.',
		incline: 'rotate-4 -translate-x-1'
	}
];

/**
 * L'APPEL FINAL — un panneau abricot, une phrase, un bouton (06/10/2026).
 *
 * Le dernier écran avant le pied de page. Il redit la seule chose qui compte —
 * le temps joue contre le gérant — et ne propose qu'un geste. Hilos pour le
 * panneau arrondi et la serif ; deux galets pour qu'il ne soit pas un rectangle.
 */
export function Appel() {
	return (
		<SectionMarketing ton="creme" className="py-cladd-xl md:py-respiration">
			<div className="apparait relative isolate flex flex-col items-center gap-cladd-2xs overflow-clip rounded-carte-site bg-teinte-abricot px-cladd-sm py-cladd-xl text-center md:py-respiration">
				<div
					aria-hidden
					className="galet -top-20 -left-16 -z-10 size-56 bg-galet-abricot opacity-70"
				/>
				<div
					aria-hidden
					className="galet galet-b -right-20 -bottom-24 -z-10 size-72 bg-teinte-temps"
				/>

				{/* DEUX POLAROÏDS : une boutique, un entrepôt. Des métiers, jamais des
				    prénoms — un visage réel accolé à un nom se lirait comme un client
				    qui témoigne. */}
				<div className="flex justify-center pb-cladd-3xs">
					{POLAROIDS.map(({ photo, legende, description, incline }) => (
						<figure
							key={photo}
							className={cn(
								'flex w-32 flex-col gap-1 rounded-cladd-md bg-papier p-1.5 pb-2 shadow-carte-chaude md:w-44 md:p-2',
								incline
							)}
						>
							<Photo
								photo={photo}
								description={description}
								sizes="(min-width: 768px) 176px, 128px"
								className="aspect-4/5 rounded-cladd-sm"
							/>
							<figcaption className="manuscrit text-cladd-md leading-none text-encre-site-douce">
								{legende}
							</figcaption>
						</figure>
					))}
				</div>

				<span className="manuscrit autocollant rounded-full bg-papier px-cladd-2xs py-1 text-intertitre">
					le temps joue contre vous
				</span>
				<h2 className="max-w-3xl font-serif text-affiche-colonne leading-tight font-medium tracking-titre-section text-balance">
					Une facture impayée ne prévient pas. Elle expire.
				</h2>
				<p className="max-w-xl text-chapeau leading-relaxed text-encre-site-douce">
					Le mois d’avant, vous pouvez encore agir. Le lendemain, il ne reste qu’à constater.
				</p>
				<div className="flex w-full flex-col items-stretch gap-cladd-3xs pt-cladd-3xs sm:w-auto sm:flex-row sm:items-center">
					<BoutonAffiche as={Link} to="/inscription" fond="jour">
						Voir ce qu’on me doit
						<ArrowRightIcon />
					</BoutonAffiche>
					<LienAffiche href="#tarifs" className="justify-center">
						Voir le prix
					</LienAffiche>
				</div>
				<p className="text-cladd-sm text-encre-site-douce">
					Trente jours d’essai. Aucune carte bancaire. Vous voyez vos montants avant de décider.
				</p>
			</div>
		</SectionMarketing>
	);
}
