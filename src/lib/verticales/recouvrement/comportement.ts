import { ecartJours, estDateReelle } from './calendrier';

/**
 * LE SCORING COMPORTEMENTAL — la rupture d'habitude, pas le seuil absolu.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI UN SEUIL ABSOLU NE DIT RIEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Alerter au-delà de soixante jours de retard » traite de la même façon deux
 * situations opposées :
 *
 *   · un client qui paie TOUJOURS à soixante-cinq jours, depuis quatre ans,
 *     parce que c'est son cycle de trésorerie. Rien ne se passe. L'alerte est
 *     du bruit — et le bruit s'apprend : au troisième faux positif, le gérant
 *     cesse de lire les alertes, y compris celle qui comptait ;
 *   · un client qui paie TOUJOURS à huit jours et qui vient de passer à
 *     trente-cinq. Sous le seuil, donc muet. C'est pourtant le signal le plus
 *     fort qu'un produit de recouvrement puisse donner : une habitude qui
 *     casse précède souvent la difficulté de paiement.
 *
 * Le second cas est celui qui justifie ce module. Le seuil absolu le RATE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE MODULE NE PRÉDIT RIEN ET NE RECOMMANDE RIEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il ne dit pas « ce client va faire défaut » : ce serait une prédiction
 * invérifiable posée sur une douzaine d'observations, et le produit n'a aucune
 * donnée pour l'étayer. Il ne dit pas non plus « relancez » — recommander une
 * démarche est la troisième ligne rouge du produit.
 *
 * Il rend un CONSTAT arithmétique, refaisable à la main : « ce client règle
 * habituellement à N jours ; cette facture en est à M ». Le gérant en tire ce
 * qu'il veut. Un test vérifie que le constat ne contient aucun verbe d'action.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LES TROIS RÉGLAGES SONT DES HYPOTHÈSES, PAS DES VÉRITÉS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Comme pour `scoring.ts`, le brief laisse ces valeurs à calibrer sur données
 * réelles. Elles sont écrites ici, nommées et justifiées, pour être déplacées
 * quand on aura des chiffres — pas noyées dans le calcul.
 *
 * ⚠️ CE NE SONT PAS DES VALEURS JURIDIQUES. Aucune ne sort d'un texte, aucune
 * n'entre dans un montant réclamé : ce sont des paramètres de détection. Elles
 * n'ont donc rien à faire dans le registre `parametres.ts`, qui n'accueille que
 * ce qui se source sur Légifrance — y mettre un réglage statistique diluerait
 * précisément ce que ce registre garantit.
 */

/**
 * Un règlement observé, pour mesurer une habitude.
 *
 * Les deux dates suffisent : le MONTANT n'entre pas dans le calcul. Un client
 * qui règle toujours à trente jours a la même habitude sur une facture de cent
 * euros et sur une de cent mille ; pondérer par le montant ferait qu'une grosse
 * facture réglée tard écraserait douze petites réglées à l'heure.
 */
export interface PaiementObserve {
	readonly reference: string;
	/** Date à laquelle la somme devenait exigible, AAAA-MM-JJ. */
	readonly dateExigibilite: string;
	/** Date du règlement, AAAA-MM-JJ. */
	readonly datePaiement: string;
}

export type Habitude =
	| { readonly connue: false; readonly raison: string }
	| {
			readonly connue: true;
			/** Le délai habituel, en jours. Négatif si le client paie en avance. */
			readonly delaiMedianJours: number;
			/** Combien de règlements l'ont établi. */
			readonly echantillon: number;
			/** De combien ce client s'écarte habituellement de son habitude. */
			readonly dispersionJours: number;
	  };

export type LectureRupture =
	| { readonly etat: 'HABITUDE_INCONNUE'; readonly raison: string }
	| { readonly etat: 'CONFORME'; readonly ecartJours: number }
	| {
			readonly etat: 'RUPTURE';
			readonly habituelJours: number;
			readonly ecartJours: number;
			readonly constat: string;
	  };

/**
 * Combien de règlements il faut pour parler d'habitude.
 *
 * ⚠️ LE DOUTE NE PROFITE JAMAIS AU PRODUIT. Avec deux règlements, on ne tient
 * pas une habitude : on tient deux nombres. Une médiane calculée dessus
 * produirait des « ruptures » sur du hasard — et un module qui crie au hasard
 * est un module qu'on éteint.
 *
 * QUATRE, et pas dix : sur un client facturé au trimestre, dix règlements
 * demandent deux ans et demi d'historique. Le module ne dirait jamais rien
 * pour la plupart des débiteurs, ce qui revient au même que de ne pas exister.
 */
export const ECHANTILLON_MINIMAL = 4;

/**
 * L'écart minimal, en jours, sous lequel on ne parle jamais de rupture.
 *
 * Sans ce plancher, une habitude très serrée rend le module hystérique : un
 * client qui règle à trois jours passerait « en rupture » à cinq, c'est-à-dire
 * à chaque jour férié et à chaque départ en vacances.
 *
 * SEPT JOURS, soit une semaine pleine — la maille à laquelle un service
 * comptable fonctionne réellement.
 */
export const PLANCHER_RUPTURE_JOURS = 7;

/**
 * De combien de dispersions habituelles il faut s'écarter.
 *
 * TROIS. Un client régulier a une dispersion proche de zéro : c'est alors le
 * plancher qui décide. Un client erratique en a une large, et il faut sortir
 * franchement de sa fourchette habituelle pour que ça veuille dire quelque
 * chose — sinon on lui reproche d'être ce qu'il a toujours été.
 */
const MULTIPLICATEUR_DISPERSION = 3;

/**
 * La médiane d'une série. Rendue telle quelle, demi-jours compris.
 *
 * ⚠️ MÉDIANE ET NON MOYENNE, et c'est la décision qui porte tout le module.
 * Neuf règlements à trente jours et un à trois cents — un litige ancien, réglé
 * tard — donnent une moyenne de cinquante-sept jours. L'habitude réelle du
 * client aurait disparu derrière un seul incident, et sa vraie rupture serait
 * passée inaperçue. La médiane ne bouge pas d'un jour.
 */
function mediane(valeurs: readonly number[]): number {
	const triees = [...valeurs].sort((a, b) => a - b);
	const milieu = Math.floor(triees.length / 2);
	if (triees.length % 2 === 1) return triees[milieu] ?? 0;
	return ((triees[milieu - 1] ?? 0) + (triees[milieu] ?? 0)) / 2;
}

/**
 * L'écart absolu médian — la dispersion, mesurée comme le centre.
 *
 * L'écart-type serait le réflexe, et il aurait le défaut qu'on vient d'écarter
 * pour la moyenne : un seul règlement très tardif le ferait exploser, et le
 * seuil de rupture deviendrait si large que plus rien ne le franchirait. La
 * médiane des écarts à la médiane résiste au même incident.
 */
function ecartAbsoluMedian(valeurs: readonly number[], centre: number): number {
	return mediane(valeurs.map((v) => Math.abs(v - centre)));
}

export function habitudeDePaiement(paiements: readonly PaiementObserve[]): Habitude {
	/**
	 * ⚠️ ON ÉCARTE LES RÈGLEMENTS MAL DATÉS, ET C'EST INDISPENSABLE.
	 *
	 * `Date.parse('2026-02-30')` ne lève pas sur bun : il roule au 2 mars. Une
	 * date inexistante gardée dans l'échantillon décalerait donc la médiane sans
	 * qu'aucune assertion d'arithmétique ne tombe — le module rendrait un chiffre
	 * plausible et faux, ce qui est le pire des deux mondes.
	 */
	const delais = paiements
		.filter((p) => estDateReelle(p.dateExigibilite) && estDateReelle(p.datePaiement))
		.map((p) => ecartJours(p.dateExigibilite, p.datePaiement));

	if (delais.length < ECHANTILLON_MINIMAL) {
		return {
			connue: false,
			raison:
				`${delais.length} règlement${delais.length > 1 ? 's' : ''} daté${delais.length > 1 ? 's' : ''} ` +
				`connu${delais.length > 1 ? 's' : ''} : il en faut au moins ${ECHANTILLON_MINIMAL} ` +
				'pour parler d’une habitude.'
		};
	}

	const centre = mediane(delais);
	return {
		connue: true,
		delaiMedianJours: centre,
		echantillon: delais.length,
		dispersionJours: ecartAbsoluMedian(delais, centre)
	};
}

/**
 * Lit un retard à la lumière de l'habitude du débiteur.
 *
 * `retardJours` est le retard ACTUEL de la facture examinée, compté depuis son
 * exigibilité. L'appelant le fournit : ce module ne lit aucune horloge, ce qui
 * le rend rejouable à n'importe quelle date — la même propriété que le moteur
 * de décompte, et pour la même raison.
 */
export function lireRupture(habitude: Habitude, retardJours: number): LectureRupture {
	if (!habitude.connue) return { etat: 'HABITUDE_INCONNUE', raison: habitude.raison };

	const { delaiMedianJours, dispersionJours } = habitude;

	// Le seuil suit la régularité du client : serré sur un payeur régulier,
	// large sur un erratique. Le plancher empêche le premier cas de devenir
	// hystérique ; la dispersion empêche le second de crier pour rien.
	const marge = Math.max(PLANCHER_RUPTURE_JOURS, MULTIPLICATEUR_DISPERSION * dispersionJours);
	const seuil = delaiMedianJours + marge;

	if (retardJours <= seuil) return { etat: 'CONFORME', ecartJours: retardJours - delaiMedianJours };

	const habituel = Math.round(delaiMedianJours);
	const ecart = Math.round(retardJours - delaiMedianJours);

	return {
		etat: 'RUPTURE',
		habituelJours: habituel,
		ecartJours: ecart,
		/**
		 * ⚠️ UN CONSTAT, PAS UNE CONSIGNE. Ligne rouge 3 du produit : on ne
		 * recommande jamais une démarche. La phrase porte des nombres et un fait,
		 * et s'arrête là. Un test vérifie qu'aucun verbe d'action n'y entre.
		 *
		 * Elle dit aussi SUR COMBIEN de règlements l'habitude est établie : sans
		 * ça, un constat fondé sur quatre observations se lirait avec la même
		 * autorité qu'un fondé sur quarante.
		 */
		constat:
			`Ce débiteur règle habituellement à ${habituel} jour${Math.abs(habituel) > 1 ? 's' : ''} ` +
			`de son échéance, sur ${habitude.echantillon} règlements observés. ` +
			`Cette facture en est à ${Math.round(retardJours)}, soit ${ecart} de plus que son habitude.`
	};
}
