import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import { BoutonAffiche, LienAffiche, Plume } from '../ui';
import { DUREE_ESSAI_JOURS } from '../lib/config/tarifs';
import { SectionMarketing } from './section';

/**
 * L'APPEL FINAL : une bande abricot pleine largeur, une phrase, un bouton
 * (06/10/2026), et Plume qui fait la fête (14/10/2026).
 *
 * Les sites du métier (Mercury, Midday, OpenPhone) finissent sur ce que le
 * visiteur obtient en essayant, et les levées de risque. « Votre bilan offert »
 * n'existe plus : Découverte le remplace, gratuite et sans carte.
 */
export function Appel() {
	return (
		<SectionMarketing ton="abricot" className="items-center text-center">
			<div className="apparait flex flex-col items-center gap-cladd-2xs">
				<span className="light">
					<Plume humeur="fete" taille={96} sol className="md:size-32" />
				</span>
				<h2 className="max-w-3xl font-serif text-affiche-colonne leading-tight font-medium tracking-titre-section text-balance">
					Montrez vos factures à Plume.
				</h2>
				<p className="max-w-xl text-chapeau leading-relaxed text-encre-site-douce">
					Il vous dit ce qu’on vous doit, au centime, et prépare vos relances. Rien ne part avant
					que vous l’ayez décidé.
				</p>
				<div className="flex w-full flex-col items-stretch gap-cladd-3xs pt-cladd-3xs sm:w-auto sm:flex-row sm:items-center">
					<BoutonAffiche as={Link} to="/inscription" fond="jour">
						Essayer gratuitement
						<ArrowRightIcon />
					</BoutonAffiche>
					<LienAffiche href="/tarifs" className="justify-center">
						Voir les tarifs
					</LienAffiche>
				</div>
				<p className="text-cladd-sm text-encre-site-douce">
					Diagnostic gratuit, sans carte. Puis {DUREE_ESSAI_JOURS} jours d’essai, 0 € aujourd’hui,
					sans engagement.
				</p>
			</div>
		</SectionMarketing>
	);
}
