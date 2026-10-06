import { PARAMETRES, estUtilisable } from '../lib/verticales/recouvrement/parametres';
import { tauxPenaliteParDefaut } from '../lib/verticales/recouvrement/pays/france/taux';
import { REGIMES_PRESCRIPTION } from '../lib/verticales/recouvrement/pays/france/prescription';
import { eurosCentimesCourts, tauxLisible } from '../ui/format';
import { cn, PictoInterets, PictoFacture, PictoPrescription } from '../ui';
import { ARTICLES_DU_SOCLE } from './articles';
import {
	Chapeau,
	Photo,
	SectionMarketing,
	SurTitre,
	TitreSection,
	fondDeTeinte,
	galetDeTeinte,
	type TeinteSite
} from './section';

/**
 * CE QUE LA LOI VOUS DOIT — trois chiffres, trois cartes (06/10/2026).
 *
 * ⚠️ AUCUN CHIFFRE N'EST ÉCRIT ICI. Le taux est réancré chaque semestre et se lit
 * sur la série relevée ; l'indemnité et les durées viennent des paramètres et du
 * module de prescription, chacun avec sa source. Une valeur non relevée se
 * replie sur la règle (« BCE + 10 pts »), jamais sur un nombre de mémoire.
 *
 * ⚠️ LA TEINTE DIT DE QUOI IL S'AGIT, comme dans le produit : le taux est de
 * l'argent (bleu), l'indemnité tient à chaque facture (les papiers, ciel), le
 * délai est du temps (lavande). Mural et Loom pour les grandes tuiles teintées.
 */
function seuilsDeLaLoi(aujourdHui: string) {
	let taux: string;
	try {
		taux = tauxLisible(tauxPenaliteParDefaut(aujourdHui));
	} catch {
		taux = 'BCE + 10 pts';
	}
	const indemnite = PARAMETRES.indemniteForfaitaire;
	const general = REGIMES_PRESCRIPTION.GENERAL;
	const transport = REGIMES_PRESCRIPTION.TRANSPORT_MARCHANDISES;
	const consommateur = REGIMES_PRESCRIPTION.CONSOMMATEUR;

	return [
		{
			valeur: taux,
			titre: 'de pénalités de retard',
			detail:
				'Taux de refinancement de la BCE majoré de dix points, dus sans avoir à réclamer. Réancré chaque semestre.',
			teinte: 'argent' as TeinteSite,
			Picto: PictoInterets
		},
		{
			valeur: estUtilisable(indemnite) ? eurosCentimesCourts(indemnite.valeur) : '40 €',
			titre: 'par facture en retard',
			detail:
				'Frais de recouvrement, dus de plein droit dès le premier jour. Par facture, jamais par client.',
			teinte: 'papiers' as TeinteSite,
			Picto: PictoFacture
		},
		{
			valeur: `${general.dureeAnnees} ans`,
			titre: 'et souvent bien moins',
			detail: `${transport.dureeAnnees} an sur le transport de marchandises, ${consommateur.dureeAnnees} sur ce qu’on fournit à un consommateur. Passé le délai, la somme ne se réclame plus.`,
			teinte: 'temps' as TeinteSite,
			Picto: PictoPrescription
		}
	] as const;
}

export function LaLoi() {
	const aujourdHui = new Date().toISOString().slice(0, 10);
	const seuils = seuilsDeLaLoi(aujourdHui);

	return (
		<SectionMarketing id="la-loi" ton="profond" courbe className="gap-cladd-lg">
			<div className="flex flex-col gap-cladd-2xs">
				<SurTitre teinte="argent">
					De plein droit
					{ARTICLES_DU_SOCLE.length > 0 ? ` · art. ${ARTICLES_DU_SOCLE.join(', ')}` : ''}
				</SurTitre>
				<TitreSection suite="et que personne ne réclame.">Ce que la loi vous doit,</TitreSection>
				<Chapeau>
					Ces sommes vous sont dues sans avoir à les réclamer et sans clause au contrat. Le délai,
					lui, court sans que personne ne vous prévienne.
				</Chapeau>
			</div>

			<dl className="cascade grid gap-cladd-sm md:grid-cols-3 md:gap-cladd-2xs">
				{seuils.map(({ valeur, titre, detail, teinte, Picto }) => (
					<div
						key={titre}
						className={cn(
							'relative isolate flex flex-col gap-cladd-2xs overflow-clip rounded-carte-site p-cladd-xs',
							fondDeTeinte(teinte)
						)}
					>
						<div
							aria-hidden
							className={cn('galet -right-10 -bottom-12 -z-10 size-44', galetDeTeinte(teinte))}
						/>
						<span className="flex size-11 items-center justify-center rounded-full bg-papier">
							<Picto className="size-6 text-encre-site" />
						</span>
						<dt className="font-serif text-seuil-colonne leading-none font-medium tracking-titre-section tabular-nums">
							{valeur}
						</dt>
						<dd className="flex flex-col gap-1">
							<span className="text-intertitre leading-snug font-semibold">{titre}</span>
							<span className="hidden text-cladd-md leading-relaxed text-encre-site-douce md:block">
								{detail}
							</span>
						</dd>
					</div>
				))}
			</dl>

			{/* LE CAS QUI SURPREND, POSÉ COMME UNE NOTE COLLÉE SUR UNE PHOTO. Un an
			    au lieu de cinq : c'est la phrase qui fait relire ses factures de
			    transport, et le chauffeur dit à qui elle s'adresse sans un mot de
			    plus. Un métier, pas une personne : aucun prénom à côté. */}
			<div className="grid items-center gap-cladd-sm md:grid-cols-2 md:gap-cladd-lg">
				<div className="apparait relative">
					<div className="overflow-hidden rounded-carte-site shadow-carte-chaude">
						<Photo
							photo="chauffeur"
							description="Un chauffeur souriant au volant de sa camionnette, vitre baissée."
							className="aspect-4/3"
						/>
					</div>
					<span className="manuscrit autocollant absolute -bottom-4 left-4 rounded-full bg-papier px-cladd-2xs py-1 text-intertitre shadow-carte-chaude">
						lui, il livre
					</span>
				</div>
				<aside className="apparait autocollant-droite flex flex-col gap-cladd-3xs rounded-carte-site bg-teinte-abricot p-cladd-xs max-md:mx-cladd-3xs">
					<p className="font-serif text-titre-section leading-tight font-medium text-balance">
						Pour une facture de transport, la date limite tombe à un an, pas à cinq.
					</p>
					<p className="text-cladd-md leading-relaxed text-encre-site-douce">
						Et le délai court depuis la livraison, pas depuis votre dernière relance.
					</p>
				</aside>
			</div>
		</SectionMarketing>
	);
}
