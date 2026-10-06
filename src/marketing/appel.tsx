import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import { BoutonAffiche, LienAffiche } from '../ui';
import { SectionMarketing } from './section';

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
