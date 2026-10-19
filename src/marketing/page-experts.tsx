import { useState } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { BoutonAffiche } from '../ui';
import { PARTENARIAT_CABINET, historiqueDeDecouverte } from '../lib/config/tarifs';
import { Chapeau, SectionMarketing } from './section';
import { FeuilleDeDemande } from './offres';

/**
 * LA PAGE DES EXPERTS-COMPTABLES (19/10/2026, audit stratégique, décision 15).
 *
 * Une page partenaires HONNÊTE : le diagnostic à proposer aux clients du cabinet, la part
 * de la première année des clients qui s'abonnent, et un espace qui se construit avec les
 * premiers cabinets. La marque blanche n'est pas promise tant qu'elle n'existe pas.
 * « Devenir cabinet partenaire » crée le prospect au CRM, cible cabinet.
 */
export function PageExpertsComptables() {
	const [ouverte, setOuverte] = useState(false);
	const points = [
		{
			titre: 'Le diagnostic, gratuit pour vos clients',
			texte: `Sur ${historiqueDeDecouverte()}, lues depuis un FEC ou Pennylane : ce qui reste dû, les pénalités de retard et les frais de recouvrement, facture par facture, payées en retard comprises, et un rapport en PDF.`
		},
		{
			titre: `${PARTENARIAT_CABINET.commissionPourcent} % de la première année`,
			texte:
				'Pour chaque client qui s’abonne après le diagnostic. Un code partenaire suit ce que le cabinet apporte, sans rien demander à vos clients.'
		},
		{
			titre: `Construit avec les ${PARTENARIAT_CABINET.premiersCabinets} premiers cabinets`,
			texte:
				'L’espace cabinet se construit avec vous, à partir de ce que vous voyez chez vos clients. Rien d’autre n’est promis tant que ce n’est pas en place.'
		}
	];
	return (
		<>
			<SectionMarketing ton="creme" className="gap-cladd-lg pt-36 md:pt-44">
				<div className="flex max-w-3xl flex-col gap-cladd-2xs">
					<p className="text-cladd-sm font-semibold text-encre-site-douce">Experts-comptables</p>
					<h1 className="font-serif text-affiche-colonne leading-tight font-medium tracking-titre-section text-balance">
						Proposez le diagnostic des impayés à vos clients.
					</h1>
					<Chapeau>
						Vos clients voient ce que la loi ajoute à leurs factures payées en retard, et ce qu’on
						leur doit encore. Le cabinet reçoit {PARTENARIAT_CABINET.commissionPourcent} % de la
						première année des clients qui s’abonnent.
					</Chapeau>
					<div className="pt-cladd-3xs">
						<BoutonAffiche as="button" type="button" fond="jour" onClick={() => setOuverte(true)}>
							Devenir cabinet partenaire
							<ArrowRightIcon />
						</BoutonAffiche>
					</div>
				</div>
			</SectionMarketing>
			<SectionMarketing ton="creme" className="gap-cladd-sm pt-0 md:pt-0">
				<div className="grid gap-cladd-sm md:grid-cols-3">
					{points.map((point) => (
						<article
							key={point.titre}
							className="flex flex-col gap-cladd-2xs rounded-carte-site bg-papier p-cladd-xs shadow-carte-chaude md:row-span-2 md:grid md:grid-rows-subgrid md:p-cladd-sm"
						>
							<h2 className="text-intertitre leading-snug font-semibold">{point.titre}</h2>
							<p className="text-cladd-md leading-relaxed text-encre-site-douce">{point.texte}</p>
						</article>
					))}
				</div>
			</SectionMarketing>
			<FeuilleDeDemande
				key={ouverte ? 'ouverte' : 'fermee'}
				offre={ouverte ? 'partenariat' : null}
				onFermer={() => setOuverte(false)}
			/>
		</>
	);
}
