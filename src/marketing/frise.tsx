import { eurosCentimes, tauxLisible } from '../ui/format';
import { PARAMETRES, estUtilisable } from '../lib/verticales/recouvrement/parametres';
import { tauxPenaliteParDefaut } from '../lib/verticales/recouvrement/pays/france/taux';
import { REGIMES_PRESCRIPTION } from '../lib/verticales/recouvrement/pays/france/prescription';
import { Chapeau, SectionMarketing, TitreSection } from './section';

/**
 * LA VIE D'UNE FACTURE IMPAYÉE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ C'EST L'IMAGE QUE LA PAGE N'AVAIT PAS, ET C'EST SON IDÉE CENTRALE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tout le produit tient dans une phrase : une créance GRANDIT, puis elle TOMBE
 * À ZÉRO, à une date précise. Le site le disait quatre fois en prose — dans
 * l'accroche, dans la loi, dans le manifeste, dans les raisons de l'abonnement
 * — et ne le MONTRAIT jamais. Un dirigeant qui lit « la prescription est
 * surveillée » hoche la tête ; celui qui voit treize mille neuf cents euros
 * devenir zéro comprend en deux secondes pourquoi on lui vend un abonnement.
 *
 * C'est aussi ce qui manquait au rythme de la page. Onze sections construites
 * de la même façon — un rail, un titre, un contenu — se lisent comme un
 * document bien tenu, jamais comme un objet. Une frise pleine largeur, qui
 * avance au défilement, est la seule rupture de rythme de tout le parcours.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ L'ARITHMÉTIQUE EST CALCULÉE, PAS ÉCRITE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Chaque euro montre d'où il vient » est la promesse de la section suivante.
 * Une frise qui porterait des montants tapés à la main la contredirait sur la
 * même page, et se périmerait au premier changement de semestre.
 *
 * Le taux vient donc de `tauxPenaliteParDefaut`, l'indemnité de `PARAMETRES`,
 * le délai de `REGIMES_PRESCRIPTION`. Les intérêts d'une année pleine sont le
 * produit du principal par le taux — une seule division arrondie, comme dans
 * `decompte.ts`. Un lecteur qui refait le calcul retombe sur le même nombre,
 * ce qui est exactement ce que le produit vend.
 *
 * ⚠️ ET SI LE TAUX N'EST PAS RELEVÉ, LA FRISE NE MENT PAS : elle ne s'affiche
 * pas du tout. Une frise dont la troisième station serait fausse détruirait la
 * section de preuve qui la suit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUE LA DERNIÈRE STATION FAIT, ET POURQUOI ELLE EST ÉTEINTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les trois premiers montants montent et s'éclaircissent ; le quatrième tombe à
 * zéro ET s'éteint : ce n'est pas une courbe qui redescend, c'est une valeur qui
 * cesse d'exister. Titres et textes en mots simples depuis la réécriture du
 * 06/10 au soir (« Délai dépassé » plutôt que « Éteinte »).
 */

/**
 * L'EXEMPLE. Douze mille quatre cents euros : assez gros pour qu'un dirigeant
 * s'y reconnaisse, assez rond pour que le calcul se refasse de tête.
 *
 * ⚠️ LES DATES SONT FIGÉES ET L'ANNÉE DE PRESCRIPTION EST DÉRIVÉE. Écrire
 * « 2031 » à la main ferait mentir la frise le jour où le régime général
 * changerait de durée — et personne ne relit un exemple.
 */
const PRINCIPAL = 1_240_000n;
const ANNEE_ECHEANCE = 2026;

interface Station {
	readonly quand: string;
	readonly titre: string;
	readonly montant: string;
	readonly texte: string;
	/** La dernière : le montant tombe, et la station s'éteint avec lui. */
	readonly eteinte?: boolean;
}

function stations(aujourdHui: string): readonly Station[] | null {
	const indemnite = PARAMETRES.indemniteForfaitaire;
	if (!estUtilisable(indemnite) || indemnite.valeur === null) return null;

	let taux;
	try {
		taux = tauxPenaliteParDefaut(aujourdHui);
	} catch {
		// Un semestre absent de la série FAIT LEVER et ne s'extrapole jamais.
		// Ici, on préfère taire la frise plutôt que d'en publier une fausse.
		return null;
	}

	// Une année pleine, une seule division arrondie — la convention de
	// `decompte.ts`, où chaque segment en porte exactement une.
	const interets = (PRINCIPAL * taux.numerateur) / taux.denominateur;
	const total = PRINCIPAL + interets + indemnite.valeur;
	const finPrescription = ANNEE_ECHEANCE + REGIMES_PRESCRIPTION.GENERAL.dureeAnnees;

	return [
		{
			quand: `1er mars ${ANNEE_ECHEANCE}`,
			titre: 'Émise',
			montant: eurosCentimes(PRINCIPAL),
			texte: 'Le montant de la facture.'
		},
		{
			quand: `31 mars ${ANNEE_ECHEANCE}`,
			titre: 'Échue',
			montant: eurosCentimes(PRINCIPAL + indemnite.valeur),
			texte: `Les frais de recouvrement sont dus. Les pénalités courent au taux de ${tauxLisible(taux)} par an.`
		},
		{
			quand: `31 mars ${ANNEE_ECHEANCE + 1}`,
			titre: 'Un an plus tard',
			montant: eurosCentimes(total),
			texte: 'Le montant, un an de pénalités et les frais, détaillés période par période.'
		},
		{
			quand: `31 mars ${finPrescription}`,
			titre: 'Délai dépassé',
			montant: eurosCentimes(0n),
			texte: `${REGIMES_PRESCRIPTION.GENERAL.dureeAnnees} ans après l’échéance, la facture ne se réclame plus en justice.`,
			eteinte: true
		}
	];
}

export function Frise() {
	const aujourdHui = new Date().toISOString().slice(0, 10);
	const etapes = stations(aujourdHui);
	if (etapes === null) return null;

	return (
		<SectionMarketing ton="creme" className="gap-cladd-lg">
			<div className="flex flex-col gap-cladd-2xs">
				<TitreSection suite="jusqu’à la date limite.">
					Une facture impayée prend de la valeur
				</TitreSection>
				<Chapeau>Calculé au taux en vigueur ce semestre. Chaque montant se vérifie.</Chapeau>
			</div>

			{/*
			  LE RAIL QUI SE REMPLIT AU DÉFILEMENT — la seule animation de la page qui
			  RACONTE : le trait avance de l'émission vers l'extinction, au rythme où
			  l'on descend. Vertical sur téléphone, horizontal au-delà de 1024 px.
			*/}
			<div className="frise relative flex flex-col gap-cladd-sm lg:grid lg:grid-cols-4 lg:gap-cladd-2xs">
				<div
					aria-hidden
					className="pointer-events-none absolute top-0 bottom-0 left-2.5 w-0.5 rounded-full bg-filet-creme lg:top-2.5 lg:right-0 lg:bottom-auto lg:left-0 lg:h-0.5 lg:w-auto"
				>
					<div className="frise-rail-vertical size-full rounded-full bg-galet-temps lg:hidden" />
					<div className="frise-rail hidden size-full rounded-full bg-galet-temps lg:block" />
				</div>

				{etapes.map((station) => (
					<div
						key={station.titre}
						className="apparait relative flex flex-col gap-cladd-3xs pl-cladd-sm lg:pt-cladd-sm lg:pl-0"
					>
						<span
							aria-hidden
							className={
								station.eteinte
									? 'absolute top-1 left-0 size-5 rounded-full border-2 border-encre-site-claire bg-creme lg:top-0'
									: 'absolute top-1 left-0 size-5 rounded-full border-2 border-papier bg-galet-temps shadow-carte-chaude lg:top-0'
							}
						/>
						<span className="text-cladd-xs font-semibold text-encre-site-claire tabular-nums">
							{station.quand}
						</span>
						<span
							className={
								station.eteinte
									? 'text-intertitre leading-snug font-semibold text-encre-site-claire'
									: 'text-intertitre leading-snug font-semibold'
							}
						>
							{station.titre}
						</span>
						<span
							className={
								station.eteinte
									? 'font-serif text-montant-frise leading-none font-medium whitespace-nowrap text-encre-site-claire tabular-nums line-through'
									: 'font-serif text-montant-frise leading-none font-medium whitespace-nowrap tabular-nums'
							}
						>
							{station.montant}
						</span>
						<span className="hidden text-cladd-sm leading-relaxed text-encre-site-douce md:block">
							{station.texte}
						</span>
					</div>
				))}
			</div>
		</SectionMarketing>
	);
}
