import { Link } from '@tanstack/react-router';
import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import { BoutonAffiche, LienAffiche } from '../ui';
import { DUREE_ESSAI_JOURS } from '../lib/config/tarifs';
import { Calcul } from './calcul';
import { Faq } from './faq';
import { Chapeau, EcranProduit, SectionMarketing } from './section';
import type { PageDeSecteur } from './secteurs';

/**
 * UNE PAGE PAR MÉTIER (18/10/2026) : l'argument du métier en titre, ce que dit la
 * loi en trois points sourcés, le calculateur ouvert sur le bon régime, trois
 * questions de ce métier. Le contenu vit dans `secteurs.ts`, lu au registre.
 */

const LEVEES = [
	'Découverte gratuite',
	`${DUREE_ESSAI_JOURS} jours d’essai, 0 € aujourd’hui`,
	'Sans engagement'
];

export function PageSecteur({ page }: { page: PageDeSecteur }) {
	return (
		<>
			<SectionMarketing ton="creme" className="gap-cladd-lg pt-36 md:pt-44">
				<div className="grid items-center gap-cladd-lg md:grid-cols-5">
					<div className="flex flex-col gap-cladd-2xs md:col-span-3">
						<p className="text-cladd-sm font-semibold text-encre-site-douce">{page.nom}</p>
						<h1 className="font-serif text-affiche-colonne leading-tight font-medium tracking-titre-section text-balance">
							{page.titre}
						</h1>
						<Chapeau>{page.chapeau}</Chapeau>
						<div className="flex w-full flex-col items-stretch gap-cladd-3xs pt-cladd-3xs sm:w-auto sm:flex-row sm:items-center">
							<BoutonAffiche as={Link} to="/inscription" fond="jour">
								Essayer gratuitement
								<ArrowRightIcon />
							</BoutonAffiche>
							<LienAffiche href="#calcul" className="justify-center text-encre-site">
								Faire le calcul
							</LienAffiche>
						</div>
						<ul className="flex flex-wrap gap-x-cladd-xs gap-y-1 text-cladd-sm text-encre-site-douce">
							{LEVEES.map((levee) => (
								<li key={levee} className="flex items-center gap-1.5">
									<CheckIcon aria-hidden size={16} className="text-encre-site" />
									{levee}
								</li>
							))}
						</ul>
					</div>
					{/* L'écran coupé dans sa carte, comme sur la page Sécurité : au bureau seulement,
				    le téléphone a déjà son titre et son bouton à lire. */}
					<div className="hidden h-96 justify-center overflow-clip rounded-carte-site bg-teinte-argent px-cladd-xs pt-cladd-xs md:col-span-2 md:flex">
						<EcranProduit
							capture="part-bientot"
							description="Le bloc de Plume dans Letikette : ce qu’il fait en ce moment, puis « Part bientôt », un rappel et un deuxième rappel, chacun avec son bouton « Retenir »."
							className="w-56 self-start"
						/>
					</div>
				</div>
			</SectionMarketing>

			<SectionMarketing ton="creme" className="gap-cladd-sm pt-0 md:pt-0">
				<h2 className="font-serif text-intertitre leading-snug font-medium">Ce que dit la loi</h2>
				<div className="grid gap-cladd-sm md:grid-cols-3">
					{page.points.map((point) => (
						<article
							key={point.titre}
							className="flex flex-col gap-cladd-2xs rounded-carte-site bg-papier p-cladd-xs shadow-carte-chaude md:row-span-3 md:grid md:grid-rows-subgrid md:p-cladd-sm"
						>
							<h3 className="text-intertitre leading-snug font-semibold">{point.titre}</h3>
							<p className="text-cladd-md leading-relaxed text-encre-site-douce">{point.texte}</p>
							<p className="text-cladd-sm text-encre-site-douce opacity-80">{point.source}</p>
						</article>
					))}
				</div>
			</SectionMarketing>

			<Calcul secteurInitial={page.regime} />

			<Faq id="questions" titre={`${page.nom} : vos questions.`} questions={page.questions} />
		</>
	);
}
