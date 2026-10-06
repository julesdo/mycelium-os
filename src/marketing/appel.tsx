import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import { BoutonAffiche, LienAffiche } from '../ui';
import { DUREE_ESSAI_JOURS } from '../lib/config/tarifs';
import { SectionMarketing } from './section';

/**
 * L'APPEL FINAL : une bande abricot pleine largeur, une phrase, un bouton
 * (06/10/2026). Le panneau arrondi et ses deux galets sont devenus une bande
 * droite, comme les aplats de couleur de Mailchimp.
 *
 * Réécrit le soir même : « Une facture impayée ne prévient pas. Elle expire. »
 * dramatisait. Les sites du métier (Mercury, Midday, OpenPhone) finissent sur
 * ce que le visiteur obtient en essayant, et les levées de risque.
 */
export function Appel() {
	return (
		<SectionMarketing ton="abricot" className="items-center text-center">
			<div className="apparait flex flex-col items-center gap-cladd-2xs">
				<h2 className="max-w-3xl font-serif text-affiche-colonne leading-tight font-medium tracking-titre-section text-balance">
					Faites le point sur vos impayés.
				</h2>
				<p className="max-w-xl text-chapeau leading-relaxed text-encre-site-douce">
					Importez vos factures : Letikette vous montre ce qui vous est dû et les délais à
					surveiller.
				</p>
				<div className="flex w-full flex-col items-stretch gap-cladd-3xs pt-cladd-3xs sm:w-auto sm:flex-row sm:items-center">
					<BoutonAffiche as={Link} to="/inscription" fond="jour">
						Essayer gratuitement
						<ArrowRightIcon />
					</BoutonAffiche>
					<LienAffiche href="/#tarifs" className="justify-center">
						Voir les tarifs
					</LienAffiche>
				</div>
				<p className="text-cladd-sm text-encre-site-douce">
					{DUREE_ESSAI_JOURS} jours d’essai, sans carte bancaire, sans engagement.
				</p>
			</div>
		</SectionMarketing>
	);
}
