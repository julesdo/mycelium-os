import { CheckIcon } from 'lucide-react';
import { cn } from '../ui';
import {
	Chapeau,
	EcranProduit,
	SectionMarketing,
	SurTitre,
	TitreSection,
	fondDeTeinte,
	galetDeTeinte,
	type CaptureProduit,
	type TeinteSite
} from './section';

/**
 * COMMENT ÇA MARCHE — cinq gestes, cinq vrais écrans (06/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ DES CAPTURES, PLUS DES DÉMONSTRATIONS EN COMPOSANTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La section rendait quatre composants du produit en direct — le bilan d'un
 * import, la file des événements, une question jouable, un décompte complet —
 * chacun dans un cadre. C'était exact et lourd : des centaines de nœuds et
 * d'icônes sur la page qu'un prospect ouvre sur son téléphone, pour des écrans
 * réduits au tiers de leur taille. Les captures PNG montrent les MÊMES écrans,
 * pris dans la salle d'exposition (`scripts/capturer-ecrans.ts`), pour le prix
 * d'une image chacun.
 *
 * Chaque étape porte la teinte de sa famille dans le produit, et l'écran est
 * coupé dans une grande carte de couleur — Airtasker et Braintrust.
 */

interface Etape {
	readonly numero: string;
	readonly titre: string;
	readonly texte: string;
	readonly capacites: readonly string[];
	readonly capture: CaptureProduit;
	readonly description: string;
	readonly teinte: TeinteSite;
}

const ETAPES: readonly Etape[] = [
	{
		numero: '01',
		titre: 'Vos factures sont déjà écrites',
		texte: 'On les lit là où elles sont, plutôt que de vous les faire ressaisir.',
		capacites: [
			'L’export de votre logiciel comptable (le FEC), tel quel.',
			'Vos factures électroniques Factur-X, et vos PDF.',
			'Les doublons écartés, et comptés, plutôt que perdus.'
		],
		capture: 'depots',
		description:
			'Le bilan d’un dépôt dans Letikette : 198 factures entrées depuis un export comptable, 142 règlements rapprochés, 37 clients créés, et les lignes qui ne sont pas entrées, avec la raison.',
		teinte: 'papiers'
	},
	{
		numero: '02',
		titre: 'Le logiciel regarde toutes les nuits',
		texte: 'Ce qui arrive à échéance, et ce qui approche de sa date limite pour agir en justice.',
		capacites: [
			'Le journal officiel des entreprises relevé chaque nuit, sur vos clients à vous.',
			'La date limite suivie facture par facture, au régime de son secteur.',
			'Les règlements rapprochés, pour ne pas relancer un client qui a payé.'
		],
		capture: 'file',
		description:
			'La file du matin dans Letikette : les clients à traiter aujourd’hui, chacun avec son montant, sa date et ce qui se passe.',
		teinte: 'temps'
	},
	{
		numero: '03',
		titre: 'Vous ne tranchez que ce qui ne se lit pas',
		texte:
			'Le montant, l’échéance et la qualité des parties se lisent. Une contestation de votre client, non : c’est vous qui la connaissez.',
		capacites: [
			'Un seul bouton par dossier, et l’état écrit en toutes lettres.',
			'Les situations qui changent tout, en une ligne chacune.',
			'Ce qu’un acte laisserait de côté, chiffré avant qu’il soit préparé.'
		],
		capture: 'dossier',
		description:
			'Un dossier dans Letikette : 6 373,50 € dus aujourd’hui, pénalités comprises, la date limite pour agir, deux situations à lire, et un seul bouton, « Relire le courrier ».',
		teinte: 'question'
	},
	{
		numero: '04',
		titre: 'Un décompte qui se refait à la main',
		texte:
			'Arrêté, il ne bouge plus. C’est ce qui prouve ce que vous réclamiez le jour où vous l’avez réclamé.',
		capacites: [
			'Les pénalités décomposées période par période : taux, jours, principal.',
			'Ce qui est laissé de côté, dit avant d’arrêter.',
			'Les documents réunis pour votre avocat ou votre commissaire de justice.'
		],
		capture: 'decompte',
		description:
			'L’arrêt d’un décompte dans Letikette : 20 044,54 € au 3 septembre 2026, décomposés en principal, pénalités de retard et frais de recouvrement, avec les factures laissées de côté.',
		teinte: 'argent'
	},
	{
		numero: '05',
		titre: 'Votre client vous paie, directement',
		texte:
			'Une page de paiement à votre nom : votre IBAN, le montant, la référence. L’argent va de son compte au vôtre, sans passer par nous.',
		capacites: [
			'Le détail du montant, facture par facture, que votre client peut refaire.',
			'Un code de virement que sa banque reconnaît.',
			'Aucun encaissement, aucune commission sur ce qui rentre.'
		],
		capture: 'paiement',
		description:
			'La page de paiement que reçoit votre client : votre nom, le reste à régler, 6 373,50 €, et les coordonnées du virement, chacune avec un bouton pour la copier.',
		teinte: 'abricot'
	}
];

export function Etapes() {
	return (
		<SectionMarketing id="comment" ton="profond" courbe className="gap-cladd-2xl">
			<div className="flex flex-col gap-cladd-2xs">
				<SurTitre teinte="papiers">Comment ça marche</SurTitre>
				<TitreSection suite="un seul vous demande du temps.">Cinq gestes,</TitreSection>
				<Chapeau>
					Les écrans ci-dessous sont ceux du logiciel, pris tels quels, avec des données de
					démonstration.
				</Chapeau>
			</div>

			{ETAPES.map((etape, rang) => (
				<article
					key={etape.numero}
					className="grid items-center gap-cladd-sm md:grid-cols-2 md:gap-cladd-xl"
				>
					{/* L'ÉCRAN, COUPÉ DANS SA CARTE. Le bas du téléphone sort par le bord :
					    on voit ce qui compte, la carte garde une hauteur raisonnable sur
					    téléphone. */}
					<div
						className={cn(
							'relative isolate flex h-96 justify-center overflow-clip rounded-carte-site px-cladd-sm pt-cladd-sm md:h-120',
							fondDeTeinte(etape.teinte),
							rang % 2 === 1 && 'md:order-2'
						)}
					>
						<div
							aria-hidden
							className={cn(
								'galet galet-c -top-16 -left-14 -z-10 size-56',
								galetDeTeinte(etape.teinte)
							)}
						/>
						<EcranProduit
							capture={etape.capture}
							description={etape.description}
							className="apparait w-60 self-start md:w-72"
						/>
					</div>

					<div className="flex flex-col gap-cladd-2xs">
						<span
							className={cn(
								'flex size-12 items-center justify-center rounded-full font-serif text-intertitre font-medium',
								fondDeTeinte(etape.teinte)
							)}
						>
							{etape.numero}
						</span>
						<h3 className="font-serif text-titre-section leading-tight font-medium tracking-titre-section text-balance">
							{etape.titre}
						</h3>
						<p className="text-chapeau leading-relaxed text-encre-site-douce">{etape.texte}</p>
						<ul className="flex flex-col gap-cladd-3xs pt-cladd-3xs">
							{etape.capacites.map((capacite) => (
								<li key={capacite} className="flex items-start gap-cladd-3xs">
									<span
										aria-hidden
										className={cn(
											'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full',
											fondDeTeinte(etape.teinte)
										)}
									>
										<CheckIcon size={14} />
									</span>
									<span className="text-cladd-md leading-relaxed">{capacite}</span>
								</li>
							))}
						</ul>
					</div>
				</article>
			))}
		</SectionMarketing>
	);
}
