import { CheckIcon } from 'lucide-react';
import { cn } from '../ui';
import {
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
	/** La note collée sur l'écran, écrite à la main : ce qu'il faut y voir. */
	readonly note: string;
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
		teinte: 'papiers',
		note: '198 factures, lues d’un coup'
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
		teinte: 'temps',
		note: 'ce qui presse, en premier'
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
		teinte: 'question',
		note: 'un seul bouton'
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
		teinte: 'argent',
		note: 'au centime près'
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
		teinte: 'abricot',
		note: 'droit sur votre compte'
	}
];

export function Etapes() {
	return (
		<SectionMarketing id="comment" ton="profond" courbe className="gap-cladd-lg md:gap-cladd-2xl">
			<div className="flex flex-col gap-cladd-2xs">
				<SurTitre teinte="papiers">Comment ça marche</SurTitre>
				<TitreSection suite="un seul vous demande du temps.">Cinq gestes,</TitreSection>
				<p className="text-cladd-sm text-encre-site-claire">
					Les vrais écrans du logiciel, avec des données de démonstration.
				</p>
			</div>

			{/*
			  ⚠️ UN CARROUSEL SUR TÉLÉPHONE, DES RANGÉES AU-DELÀ. La section faisait
			  5 200 px sur téléphone : cinq cartes de 384 px, chacune suivie de son
			  titre, d'une phrase et de trois puces. Sur téléphone, les cinq écrans
			  défilent d'un geste, comme les captures d'une fiche d'application, avec
			  un titre et une phrase chacun ; les puces n'apparaissent qu'à partir de
			  la tablette, où elles ont la place d'être lues.
			*/}
			<div className="carrousel -mx-cladd-2xs flex snap-x snap-mandatory gap-cladd-2xs overflow-x-auto px-cladd-2xs pb-cladd-3xs md:mx-0 md:flex-col md:gap-cladd-2xl md:overflow-visible md:px-0">
				{ETAPES.map((etape, rang) => (
					<article
						key={etape.numero}
						className="flex w-4/5 shrink-0 snap-center flex-col gap-cladd-2xs md:grid md:w-auto md:grid-cols-2 md:items-center md:gap-cladd-xl"
					>
						{/* L'ÉCRAN, COUPÉ DANS SA CARTE : le bas du téléphone sort par le bord. */}
						<div
							className={cn(
								'relative isolate flex h-80 justify-center overflow-clip rounded-carte-site px-cladd-xs pt-cladd-xs md:h-120 md:px-cladd-sm md:pt-cladd-sm',
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
								className="w-52 self-start md:w-72"
							/>
							{/* LA NOTE COLLÉE — quelqu'un a regardé l'écran et vous dit quoi
							    y voir. Graza pour le geste. */}
							<span className="manuscrit autocollant absolute bottom-5 left-3 rounded-full bg-papier px-cladd-2xs py-1 text-intertitre whitespace-nowrap md:bottom-10 md:left-8">
								{etape.note}
							</span>
						</div>

						<div className="flex flex-col gap-cladd-3xs md:gap-cladd-2xs">
							<span className="flex items-center gap-cladd-3xs">
								<span
									className={cn(
										'flex size-9 shrink-0 items-center justify-center rounded-full font-serif text-cladd-md font-medium md:size-12 md:text-intertitre',
										fondDeTeinte(etape.teinte)
									)}
								>
									{etape.numero}
								</span>
								<h3 className="font-serif text-intertitre leading-tight font-medium text-balance md:text-titre-section md:tracking-titre-section">
									{etape.titre}
								</h3>
							</span>
							<p className="text-cladd-md leading-relaxed text-encre-site-douce md:text-chapeau">
								{etape.texte}
							</p>
							<ul className="hidden flex-col gap-cladd-3xs pt-cladd-3xs md:flex">
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
