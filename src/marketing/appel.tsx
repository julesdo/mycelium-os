import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import { AtmosphereNuit, BoutonAffiche, LienAffiche, ScenePointeur } from '../ui';
import { SectionMarketing } from './section';

/**
 * LE DERNIER APPEL.
 *
 * ⚠️ IL NE RÉSUME PAS LA PAGE, ET C'EST DÉLIBÉRÉ. La tentation d'une dernière
 * section est de reprendre les trois arguments en trois puces, « au cas où ».
 * Quelqu'un qui est descendu jusqu'ici les a lus ; les lui répéter dit qu'on ne
 * croit pas qu'il ait lu, et lui donne une quatrième occasion d'hésiter.
 *
 * Elle ne porte qu'une chose : l'URGENCE, qui est le seul argument que la page
 * n'a pas encore formulé comme une raison d'agir MAINTENANT plutôt qu'un jour.
 * Une créance ne prévient pas qu'elle expire.
 *
 * ⚠️ PAS DE FILET DE FERMETURE, ET PAS DE RAIL TECHNIQUE. Les rails ouvrent des
 * sections qui expliquent ; celle-ci ne s'ouvre pas, elle conclut. Et le filet
 * de fermeture dirait qu'il y a encore quelque chose après, alors qu'il ne
 * reste que le pied de page.
 *
 * ⚠️ LA LEVÉE DE RISQUE EST À CÔTÉ DU BOUTON, comme dans le premier écran et
 * pour la même raison : une objection se lève à l'endroit où elle naît. Elle
 * est ici plus longue qu'en haut, parce que le lecteur qui hésite à ce
 * moment-là hésite sur le prix, pas sur le principe.
 */
export function Appel() {
	return (
		<SectionMarketing filet={false} className="relative isolate gap-cladd-2xs">
			{/* L'atmosphère seule, sans le ciel : les deux nébuleuses de la page sont
			    réservées au premier écran et à la respiration du milieu. Voir
			    l'en-tête de `bandeau.tsx` — une atmosphère qu'on retrouve toutes les
			    deux sections est un papier peint. */}
			<AtmosphereNuit className="-z-10" />

			<ScenePointeur className="flex flex-col gap-cladd-2xs">
				<span className="w-fit rounded-full border border-filet-nuit px-cladd-3xs py-2 text-cladd-2xs font-medium tracking-widest text-craie-douce uppercase">
					Le temps joue contre vous
				</span>

				<h2 className="suit-pointeur-loin apparait max-w-4xl font-affiche text-affiche-colonne leading-affiche font-semibold tracking-affiche text-balance">
					Une créance ne prévient pas qu’elle expire.{' '}
					<span className="text-craie-claire">Elle expire.</span>
				</h2>

				<p className="apparait max-w-2xl text-chapeau leading-relaxed font-normal text-craie-douce">
					Le mois d’avant, vous pouvez encore agir. Le lendemain, il ne reste qu’à constater.
				</p>

				<div className="flex w-full flex-col items-stretch gap-cladd-3xs pt-cladd-3xs sm:w-auto sm:flex-row sm:items-center">
					<BoutonAffiche as={Link} to="/inscription">
						Voir mes créances
						<ArrowRightIcon />
					</BoutonAffiche>
					<LienAffiche href="#tarifs" className="justify-center sm:justify-start">
						Voir le prix
					</LienAffiche>
				</div>

				<p className="text-cladd-sm font-normal text-craie-claire">
					Trente jours d’essai. Aucune carte bancaire. Vous voyez vos montants avant de décider
					quoi que ce soit.
				</p>
			</ScenePointeur>
		</SectionMarketing>
	);
}
