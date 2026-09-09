import { ZERO, additionner, soustraire, type Montant } from '../../socle/montants';
import { decompterFacture, joursEntre } from './decompte';
import { estDateReelle } from './calendrier';
import type { ConventionJours, FacturePourDecompte } from './decompte';

/**
 * LA RÉVÉLATION — ce que le gérant ne savait pas avoir le droit de réclamer.
 *
 * Le client dépose trois ans d'historique. Sa comptabilité lui dit ce qu'on lui
 * doit en PRINCIPAL — il le sait déjà, c'est le solde de ses comptes clients.
 * Ce que personne n'a jamais calculé, ce sont les intérêts de retard au taux
 * BCE majoré de dix points et l'indemnité forfaitaire de 40 € par facture.
 *
 * ⚠️ CE MODULE NE PROMET RIEN, IL CONSTATE. « Ces factures portent 12 480 € de
 * supplément jamais calculé » est un constat sur des données réelles. « Vous
 * allez récupérer 12 480 € » serait un mensonge, et le mot « garantie » est
 * interdit dans tout le produit. La décision d'agir reste celle du client, et
 * la somme reste à recouvrer.
 *
 * ⚠️ IL NE RECALCULE RIEN. `decompterFacture` porte les segments, la convention
 * de jours et l'unique division arrondie de toute la chaîne. Réécrire ce calcul
 * ici créerait une SECONDE VÉRITÉ sur le seul chiffre du produit qui coûte de
 * l'argent réel — et les deux divergeraient à la première correction.
 *
 * ⚠️ IL NE LÈVE JAMAIS. Une facture dont le semestre de taux manque, ou dont la
 * date de départ n'existe pas au calendrier, ferait autrement échouer la
 * révélation ENTIÈRE — et le premier import, celui qui décide de tout, ne
 * montrerait rien. Elle remonte NOMMÉE dans `nonChiffrees`. Un total
 * silencieusement amputé est pire qu'un total incomplet annoncé : le premier se
 * croit exact.
 */

export interface FacturePourRevelation extends FacturePourDecompte {
	readonly statutPaiement: 'IMPAYEE' | 'PARTIELLEMENT_PAYEE' | 'SOLDEE' | 'LITIGIEUSE';
	/**
	 * La date à laquelle la créance sera prescrite, calculée EN AMONT par le
	 * module du pays — comme pour `FactureSurveillee`, et pour la même raison :
	 * ce module n'a aucune raison de connaître un droit national.
	 *
	 * Absente, la facture n'est ni sauvée ni perdue : elle est NON SURVEILLÉE, et
	 * `bilanDesPertes` la nomme.
	 */
	readonly datePrescription?: string;
}

export interface LigneRevelee {
	readonly reference: string;
	/** Ce que la comptabilité affiche déjà. */
	readonly principalRestantDu: Montant;
	readonly interets: Montant;
	readonly indemniteForfaitaire: Montant;
	/** Ce que personne n'avait calculé : intérêts + indemnité. */
	readonly supplement: Montant;
}

/** Une facture que le calcul n'a pas pu chiffrer, et pourquoi. */
export interface FactureNonChiffree {
	readonly reference: string;
	readonly raison: string;
}

export interface Revelation {
	readonly nombreFactures: number;
	readonly principal: Montant;
	readonly interets: Montant;
	readonly indemnites: Montant;
	/** **Le chiffre de la révélation.** Intérêts + indemnités. */
	readonly supplement: Montant;
	readonly total: Montant;
	readonly lignes: readonly LigneRevelee[];
	readonly nonChiffrees: readonly FactureNonChiffree[];
}

/**
 * Cette facture entre-t-elle dans la révélation ?
 *
 * DEUX CONDITIONS, ET CHACUNE PROTÈGE D'UN CHIFFRE FAUX.
 *
 * 1. **Non soldée.** `docs/blueprint/01-FRONTIERE-MVP.md` laisse au juriste la
 *    question de savoir jusqu'où l'indemnité et les intérêts restent réclamables
 *    sur une facture dont le principal a DÉJÀ été payé. Tant qu'elle n'est pas
 *    tranchée, on retient le périmètre le plus étroit — les impayés — parce que
 *    c'est le seul défendable, et parce qu'il garde toute sa force.
 *
 * 2. **Effectivement en retard.** L'indemnité est due au premier jour de RETARD,
 *    pas à l'émission. Compter une facture à échoir ajouterait 40 € par ligne
 *    sur de l'argent qui n'est pas encore dû — un chiffre faux qui a l'air
 *    juste, et qui s'effondrerait au premier contrôle du débiteur.
 *
 * C'est un prédicat séparé, et pas une condition enfouie dans la boucle, pour
 * que l'élargir le jour où le juriste répond ne demande pas une refonte.
 */
function entreDansLaRevelation(facture: FacturePourRevelation, arreteAu: string): boolean {
	if (facture.statutPaiement === 'SOLDEE') return false;
	return arreteAu > facture.dateExigibilite;
}

/**
 * ⚠️ LA VALIDITÉ DE LA DATE SE VÉRIFIE AVANT LE RETARD, ET C'EST UN TEST QUI
 * L'A IMPOSÉ.
 *
 * `arreteAu > facture.dateExigibilite` est une comparaison de CHAÎNES : elle ne
 * veut dire « plus tard que » que sur deux dates ISO réelles. Sur une date
 * abîmée — `'zzz'`, un `2026-02-30` venu d'un OCR — elle rend une réponse
 * arbitraire, et la facture était alors ÉCARTÉE EN SILENCE : ni chiffrée, ni
 * nommée dans `nonChiffrees`. Elle disparaissait purement et simplement de la
 * révélation, qui affichait un total plus petit que la réalité sans le dire.
 *
 * On ne peut pas répondre à « est-elle en retard ? » sur une date qu'on ne sait
 * pas lire. La seule réponse honnête est de le déclarer.
 */
function departLisible(facture: FacturePourRevelation): boolean {
	return estDateReelle(facture.dateExigibilite);
}

export function reveler(
	factures: readonly FacturePourRevelation[],
	arreteAu: string,
	convention: ConventionJours
): Revelation {
	const lignes: LigneRevelee[] = [];
	const nonChiffrees: FactureNonChiffree[] = [];

	for (const facture of factures) {
		if (!departLisible(facture)) {
			nonChiffrees.push({
				reference: facture.reference,
				raison:
					'Date d’exigibilité inexploitable, donc ni le retard ni les intérêts ne ' +
					`peuvent être établis : ${JSON.stringify(facture.dateExigibilite)}.`
			});
			continue;
		}
		if (!entreDansLaRevelation(facture, arreteAu)) continue;

		try {
			const decompte = decompterFacture(facture, arreteAu, convention);
			lignes.push({
				reference: decompte.reference,
				principalRestantDu: decompte.principalRestantDu,
				interets: decompte.interets,
				indemniteForfaitaire: decompte.indemniteForfaitaire,
				supplement: additionner(decompte.interets, decompte.indemniteForfaitaire)
			});
		} catch (erreur) {
			// Le message porte la cause — un semestre de taux absent, une date qui
			// n'existe pas — et il est montré tel quel : c'est lui qui dit au
			// gérant quoi corriger.
			nonChiffrees.push({
				reference: facture.reference,
				raison: erreur instanceof Error ? erreur.message : String(erreur)
			});
		}
	}

	const principal = sommeOuZero(lignes.map((l) => l.principalRestantDu));
	const interets = sommeOuZero(lignes.map((l) => l.interets));
	const indemnites = sommeOuZero(lignes.map((l) => l.indemniteForfaitaire));

	return {
		nombreFactures: lignes.length,
		principal,
		interets,
		indemnites,
		supplement: additionner(interets, indemnites),
		total: additionner(principal, interets, indemnites),
		lignes,
		nonChiffrees
	};
}

/** `additionner` exige au moins un terme ; un jeu vide vaut zéro, pas une erreur. */
function sommeOuZero(montants: readonly Montant[]): Montant {
	return montants.length > 0 ? additionner(...montants) : ZERO;
}

/**
 * Ce qui s'est accumulé entre deux dates, sur de l'argent DÉJÀ réclamable.
 *
 * ⚠️ LE NOM DIT CE QUE LE CHIFFRE MESURE, ET C'EST DÉLIBÉRÉ. Le plan l'appelait
 * `monteeEntre` ; une « montée » se lirait comme la variation du TOTAL, laquelle
 * inclut le principal d'une facture qui vient d'échoir — le compteur bondirait
 * de plusieurs milliers d'euros en donnant l'impression que ce sont des
 * intérêts. Une facture qui échoit dans l'intervalle est un ÉVÉNEMENT, elle
 * remonte dans le flux comme `FACTURE_ECHUE` ; ce n'est pas une accumulation
 * nocturne.
 *
 * ⚠️ L'INDEMNITÉ FORFAITAIRE N'EN EST JAMAIS. 40 € sont dus UNE FOIS, au premier
 * jour de retard, pas 40 € par nuit. Un compteur qui grimpe de 40 € toutes les
 * vingt-quatre heures s'effondre au premier contrôle du débiteur — et emporte
 * avec lui la crédibilité de tous les autres chiffres du produit.
 *
 * D'où les deux précautions : on ne retient que les factures DÉJÀ en retard à la
 * date de départ, et on ne soustrait que les `interets`.
 */
export function interetsCourusEntre(
	factures: readonly FacturePourRevelation[],
	depuis: string,
	jusqua: string,
	convention: ConventionJours
): Montant {
	const dejaReclamables = factures.filter(
		(facture) => departLisible(facture) && entreDansLaRevelation(facture, depuis)
	);
	if (dejaReclamables.length === 0) return ZERO;

	const avant = reveler(dejaReclamables, depuis, convention).interets;
	const apres = reveler(dejaReclamables, jusqua, convention).interets;

	// Jamais négatif. `jusqua` antérieur à `depuis` n'a pas de sens ici, et une
	// facture réglée entre-temps réduit le principal donc les intérêts à venir,
	// sans que le passé se rétracte.
	return apres > avant ? soustraire(apres, avant) : ZERO;
}

/**
 * Ce qui s'est éteint, avant nous et depuis.
 *
 * « Avant Letikette : 34 000 € éteints en silence. Depuis : 0 € prescrit,
 * 214 jours. » C'est le compteur qu'on ne veut pas casser, et il n'a de valeur
 * que parce qu'il PEUT se casser : un badge qui ne sait afficher que zéro ne dit
 * rien, et se lit comme une décoration en trois jours.
 *
 * ⚠️ LE SECOND CHIFFRE EST L'AVEU D'UN ÉCHEC DU PRODUIT. Une créance prescrite
 * pendant qu'on la surveillait est exactement ce que ce produit existe pour
 * empêcher. Il s'affiche quand même : le cacher ferait du premier chiffre une
 * publicité au lieu d'une mesure, et c'est la mesure qu'on vend.
 *
 * ⚠️ LE DOUTE NE PROFITE JAMAIS AU PRODUIT. Une facture sans date de
 * prescription, ou dont la date est inexploitable, n'est pas « sauvée » : elle
 * n'est PAS SURVEILLÉE, et elle est nommée comme telle. La ranger du bon côté
 * reviendrait à se donner raison sur une donnée qu'on n'a pas.
 *
 * ⚠️ CE MODULE NE SAIT PAS SI LA SURVEILLANCE A TOURNÉ. Le chiffre « 0 € perdu »
 * n'est vrai que si le battement quotidien n'a pas échoué dans la période, et
 * cette information vit dans la table `battements`. La couche Convex compose les
 * deux ; ici on ne rend que ce qui se déduit des factures.
 */
export interface BilanDesPertes {
	/** Éteintes avant l'arrivée du client — ce que le produit n'a pas pu empêcher. */
	readonly eteintesAvant: Montant;
	readonly nombreEteintesAvant: number;
	/** Éteintes SOUS surveillance. Doit rester à zéro, et doit pouvoir ne pas l'être. */
	readonly eteintesDepuis: Montant;
	readonly nombreEteintesDepuis: number;
	/** Les factures dont la prescription n'est pas surveillable. Ni sauvées, ni perdues. */
	readonly nonSurveillees: readonly string[];
	readonly joursSousSurveillance: number;
}

export function bilanDesPertes(
	factures: readonly FacturePourRevelation[],
	depuis: string,
	aujourdHui: string
): BilanDesPertes {
	const avant: Montant[] = [];
	const apres: Montant[] = [];
	const nonSurveillees: string[] = [];

	for (const facture of factures) {
		// Une facture payée n'est pas une perte : elle est payée. La compter
		// gonflerait le premier chiffre d'argent qui est rentré.
		if (facture.statutPaiement === 'SOLDEE') continue;

		const prescription = facture.datePrescription;
		if (prescription === undefined || !estDateReelle(prescription)) {
			nonSurveillees.push(facture.reference);
			continue;
		}

		// Prescrite dès que la date est ATTEINTE, pas seulement dépassée — même
		// convention que `estPrescrite` dans le module du pays.
		if (prescription > aujourdHui) continue;

		if (prescription <= depuis) avant.push(facture.montantExigible);
		else apres.push(facture.montantExigible);
	}

	return {
		eteintesAvant: sommeOuZero(avant),
		nombreEteintesAvant: avant.length,
		eteintesDepuis: sommeOuZero(apres),
		nombreEteintesDepuis: apres.length,
		nonSurveillees,
		// Depuis l'ARRIVÉE, jamais depuis la plus vieille facture : l'affirmation
		// porte sur notre période de travail, et la dater plus tôt s'attribuerait
		// des mois qu'on n'a pas surveillés.
		joursSousSurveillance: joursEntre(depuis, aujourdHui)
	};
}
