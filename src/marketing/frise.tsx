import { eurosCentimes, tauxLisible } from '../ui/format';
import { PARAMETRES, estUtilisable } from '../lib/verticales/recouvrement/parametres';
import { tauxPenaliteParDefaut } from '../lib/verticales/recouvrement/pays/france/taux';
import { REGIMES_PRESCRIPTION } from '../lib/verticales/recouvrement/pays/france/prescription';
import { SectionMarketing } from './section';

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
 * zéro ET s'éteint. C'est l'inversion qui porte tout le sens : ce n'est pas une
 * courbe qui redescend, c'est une lumière qui s'arrête. Le mot « éteinte » est
 * d'ailleurs le terme juridique exact de l'extinction d'une créance.
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
			texte: 'Le principal, et rien d’autre. À ce stade, personne ne doit rien de plus.'
		},
		{
			quand: `31 mars ${ANNEE_ECHEANCE}`,
			titre: 'Échue',
			montant: eurosCentimes(PRINCIPAL + indemnite.valeur),
			texte: `L’indemnité forfaitaire est due le jour même. Les intérêts commencent à courir, au taux de ${tauxLisible(taux)}.`
		},
		{
			quand: `31 mars ${ANNEE_ECHEANCE + 1}`,
			titre: 'Un an plus tard',
			montant: eurosCentimes(total),
			texte:
				'Le principal, une année d’intérêts et l’indemnité. C’est ce que le décompte réclame, décomposé période par période.'
		},
		{
			quand: `31 mars ${finPrescription}`,
			titre: 'Éteinte',
			montant: eurosCentimes(0n),
			texte: `${REGIMES_PRESCRIPTION.GENERAL.dureeAnnees} ans après l’échéance, le droit est prescrit. Rien ne le rouvre, et rien ne prévient.`,
			eteinte: true
		}
	];
}

export function Frise() {
	// La date du jour sert UNIQUEMENT à choisir le semestre du taux. Les dates
	// de la frise, elles, sont figées : un exemple qui change de forme selon le
	// jour où on l'ouvre ne se vérifie jamais.
	const aujourdHui = new Date().toISOString().slice(0, 10);
	const etapes = stations(aujourdHui);
	if (etapes === null) return null;

	return (
		<SectionMarketing>
			<div className="flex items-center justify-between gap-cladd-2xs border-b border-dashed border-filet-nuit pb-cladd-3xs text-cladd-3xs font-medium tracking-widest text-craie-sourde uppercase">
				<span>La vie d’une facture</span>
				<span className="tabular-nums">FA-2026-0118</span>
			</div>

			<div className="flex flex-col gap-cladd-2xs">
				<h2 className="apparait max-w-4xl font-affiche text-titre-section leading-tight font-semibold tracking-titre-section text-balance">
					Elle ne meurt pas d’un coup.{' '}
					<span className="text-craie-claire">Elle grandit, puis elle tombe à zéro.</span>
				</h2>
				<p className="apparait max-w-2xl text-chapeau leading-relaxed font-normal text-craie-douce">
					Un exemple, calculé au taux du semestre en cours. Les quatre montants se refont à la
					main.
				</p>
			</div>

			{/*
			  LA FRISE. Quatre stations sur un rail qui se remplit au défilement.

			  ⚠️ ELLE BASCULE À LA VERTICALE SOUS 1024 PX, et ce n'est pas un repli par
			  défaut : quatre colonnes de cent-soixante pixels sur un téléphone
			  rendraient « 13 977,60 € » sur trois lignes, ce qui casse le seul geste
			  de la section — quatre montants qu'on compare d'un coup d'œil. À la
			  verticale, chaque montant garde sa ligne et le rail descend.
			*/}
			<div className="frise relative flex flex-col gap-cladd-sm lg:grid lg:grid-cols-4 lg:gap-cladd-2xs">
				{/* LE RAIL, sous les stations. Deux traits superposés : le gris qui
				    montre le chemin entier, et le clair qui le parcourt. Sans le
				    premier, on ne verrait pas ce qui reste à faire. */}
				<div
					aria-hidden
					className="pointer-events-none absolute top-0 bottom-0 left-2 w-px bg-filet-nuit lg:top-2 lg:right-0 lg:bottom-auto lg:left-0 lg:h-px lg:w-auto"
				>
					<div className="frise-rail-vertical size-full bg-craie lg:hidden" />
					<div className="frise-rail hidden size-full bg-craie lg:block" />
				</div>

				{etapes.map((station) => (
					<div
						key={station.titre}
						className="apparait relative flex flex-col gap-cladd-3xs pl-cladd-2xs lg:pt-cladd-2xs lg:pl-0"
					>
						{/* LA PASTILLE. Pleine sur les trois premières, creuse sur la
						    dernière : une station qu'on n'atteint pas se dessine en creux. */}
						<span
							aria-hidden
							className={
								station.eteinte
									? 'absolute top-1.5 left-0 size-4 rounded-full border border-craie-sourde bg-nuit lg:top-0 lg:left-0'
									: 'absolute top-1.5 left-0 size-4 rounded-full border border-craie bg-craie lg:top-0 lg:left-0'
							}
						/>

						<span className="text-cladd-3xs font-medium tracking-widest text-craie-sourde uppercase tabular-nums">
							{station.quand}
						</span>
						<span
							className={
								station.eteinte
									? 'text-intertitre leading-snug font-semibold text-craie-claire'
									: 'text-intertitre leading-snug font-semibold'
							}
						>
							{station.titre}
						</span>
						<span
							className={
								station.eteinte
									? 'font-affiche text-montant-frise leading-none font-semibold tracking-affiche text-craie-sourde tabular-nums'
									: 'font-affiche text-montant-frise leading-none font-semibold tracking-affiche tabular-nums'
							}
						>
							{station.montant}
						</span>
						<span className="text-cladd-sm leading-relaxed font-normal text-craie-douce">
							{station.texte}
						</span>
					</div>
				))}
			</div>

		</SectionMarketing>
	);
}
