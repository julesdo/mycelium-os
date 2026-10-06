import { CheckIcon } from 'lucide-react';
import { cn } from '../ui';
import {
	EcranProduit,
	SectionMarketing,
	TitreSection,
	fondDeTeinte,
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
 *
 * ⚠️ DES TITRES D'ACTION, UNE PHRASE CHACUN (réécriture du 06/10 au soir, sur
 * Stripe et Sequence : « Create a link », « Share the link », « Get paid »).
 * Plus de note manuscrite collée sur l'écran.
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
		titre: 'Importez vos factures',
		texte: 'Depuis votre logiciel comptable, en Factur-X ou en PDF. Aucune ressaisie.',
		capacites: [
			'Export comptable (FEC) lu tel quel.',
			'Factures électroniques Factur-X et PDF.',
			'Doublons détectés et écartés.'
		],
		capture: 'depots',
		description:
			'Le bilan d’un dépôt dans Letikette : 198 factures entrées depuis un export comptable, 142 règlements rapprochés, 37 clients créés, et les lignes qui ne sont pas entrées, avec la raison.',
		teinte: 'papiers'
	},
	{
		numero: '02',
		titre: 'Suivez vos échéances',
		texte:
			'Chaque nuit, Letikette vérifie les délais de chaque facture et la situation de vos clients.',
		capacites: [
			'Date limite suivie facture par facture, selon le secteur.',
			'Procédures collectives relevées au journal officiel des entreprises (BODACC).',
			'Paiements rapprochés : pas de relance pour une facture réglée.'
		],
		capture: 'file',
		description:
			'La file du matin dans Letikette : les clients à traiter aujourd’hui, chacun avec son montant, sa date et ce qui se passe.',
		teinte: 'temps'
	},
	{
		numero: '03',
		titre: 'Validez chaque dossier',
		texte:
			'Vous confirmez ce que les factures ne disent pas, comme une contestation de votre client.',
		capacites: [
			'Un bouton par dossier, l’état écrit en clair.',
			'Les points à vérifier, une ligne chacun.',
			'Les sommes oubliées signalées avant tout courrier.'
		],
		capture: 'dossier',
		description:
			'Un dossier dans Letikette : 6 373,50 € dus aujourd’hui, pénalités comprises, la date limite pour agir, deux situations à lire, et un seul bouton, « Relire le courrier ».',
		teinte: 'question'
	},
	{
		numero: '04',
		titre: 'Envoyez une relance chiffrée',
		texte:
			'Le décompte détaille montant, pénalités et frais. Vous le relisez, le signez et l’envoyez.',
		capacites: [
			'Pénalités détaillées période par période.',
			'Décompte daté et figé une fois arrêté.',
			'Dossier prêt à transmettre à votre avocat ou commissaire de justice.'
		],
		capture: 'decompte',
		description:
			'L’arrêt d’un décompte dans Letikette : 20 044,54 € au 3 septembre 2026, décomposés en principal, pénalités de retard et frais de recouvrement, avec les factures laissées de côté.',
		teinte: 'argent'
	},
	{
		numero: '05',
		titre: 'Votre client paie directement',
		texte: 'Par virement sur votre compte, depuis une page à votre nom. Aucune commission.',
		capacites: [
			'Détail facture par facture.',
			'Code QR de virement reconnu par les banques.',
			'Aucun encaissement par Letikette.'
		],
		capture: 'paiement',
		description:
			'La page de paiement que reçoit votre client : votre nom, le reste à régler, 6 373,50 €, et les coordonnées du virement, chacune avec un bouton pour la copier.',
		teinte: 'abricot'
	}
];

export function Etapes() {
	return (
		<SectionMarketing id="comment" ton="profond" className="gap-cladd-lg md:gap-cladd-2xl">
			<div className="flex flex-col gap-cladd-2xs">
				<TitreSection suite="en cinq étapes.">De l’import au paiement,</TitreSection>
				<p className="text-cladd-sm text-encre-site-claire">
					Captures du logiciel, avec des données de démonstration.
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
							<EcranProduit
								capture={etape.capture}
								description={etape.description}
								className="w-52 self-start md:w-72"
							/>
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
		</SectionMarketing>
	);
}
