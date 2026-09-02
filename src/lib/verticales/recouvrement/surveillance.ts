import { ZERO, additionner, versEuros, type Montant } from '../../socle/montants';
import { joursEntre } from './decompte';
import { PARAMETRES, estUtilisable } from './parametres';
import { SEUIL_QUALIFICATION } from './scoring';
import type { SanteDebiteur } from './scoring';

/**
 * La surveillance — ce qui donne une raison d'ouvrir le produit chaque semaine,
 * et ce qui porte l'abonnement (§ 7 du brief).
 *
 * ELLE EST INDÉPENDANTE DE TOUTE PROCÉDURE. Un client qui n'engage jamais rien
 * doit quand même voir, chaque semaine, ce que le produit a repéré pour lui.
 * C'est la différence entre un outil qu'on paie et un outil qu'on ouvre.
 *
 * CHAQUE ÉVÉNEMENT PORTE UN MONTANT, et c'est structurel. Un gérant arbitre
 * entre 12 000 € et 300 €, pas entre « facture échue » et « échéance proche » :
 * une file d'alertes sans montants est une liste de tâches, et une liste de
 * tâches se referme.
 *
 * CHAQUE ÉVÉNEMENT PORTE UNE ACTION. Signaler sans dire quoi faire déplace la
 * charge sur le lecteur au lieu de la lui retirer.
 *
 * AUCUNE LECTURE D'HORLOGE ICI NON PLUS. La date du jour est un argument, ce
 * qui rend la détection rejouable et testable à n'importe quelle date.
 */

export type TypeEvenement =
	| 'FACTURE_ECHUE'
	| 'CREANCE_MURE'
	| 'ECHEANCE_PROCEDURE'
	| 'DEBITEUR_DEGRADE'
	| 'PRESCRIPTION_PROCHE';

export type Urgence = 'CRITIQUE' | 'HAUTE' | 'NORMALE';

export interface Evenement {
	readonly type: TypeEvenement;
	/** Ce que l'événement désigne : une facture, une créance, un débiteur. */
	readonly reference: string;
	/** Ce qui est en jeu. `null` seulement quand c'est réellement inconnu. */
	readonly montant: Montant | null;
	readonly urgence: Urgence;
	readonly explication: string;
	/** L'action au bout. Jamais vide. */
	readonly action: string;
}

/**
 * Le préavis, en jours, avant qu'une échéance de procédure ne remonte.
 *
 * TRENTE JOURS SUR UNE CADUCITÉ, QUINZE SUR LE RESTE. Ce n'est pas une règle de
 * droit mais un arbitrage produit : une caducité fait perdre le droit, et
 * signifier un acte demande de mobiliser un commissaire de justice, ce qui ne
 * se fait pas en deux jours. Une échéance informative structure la suite sans
 * rien éteindre — prévenir un mois à l'avance la noierait dans le bruit.
 */
export const PREAVIS = {
	CADUCITE: 30,
	INFORMATIVE: 15
} as const;

/** Au-delà, un débiteur est considéré comme dégradé. Du meilleur au pire. */
const ECHELLE_SANTE: Record<SanteDebiteur, number> = {
	SAINE: 0,
	INCONNUE: 1,
	PROCEDURE_COLLECTIVE: 2,
	RADIEE: 3
};

export interface FactureSurveillee {
	readonly reference: string;
	readonly montantExigible: Montant;
	readonly dateEcheance: string;
	readonly statutPaiement: 'IMPAYEE' | 'PARTIELLEMENT_PAYEE' | 'SOLDEE' | 'LITIGIEUSE';
}

export interface CreanceSurveillee {
	readonly reference: string;
	readonly total: Montant;
	readonly score: number;
	readonly statut: 'BROUILLON' | 'QUALIFIEE' | 'ENGAGEE' | 'CLOSE';
}

export interface EcheanceSurveillee {
	readonly cle: string;
	readonly libelle: string;
	readonly dateLimite: string;
	readonly gravite: 'CADUCITE' | 'INFORMATIVE';
	readonly traitee?: boolean;
}

export interface DossierSurveille {
	readonly reference: string;
	readonly montantEnJeu: Montant;
	readonly echeances: readonly EcheanceSurveillee[];
}

export interface DebiteurSurveille {
	readonly reference: string;
	readonly encoursTotal: Montant;
	readonly santePrecedente: SanteDebiteur;
	readonly santeActuelle: SanteDebiteur;
}

export interface EtatSurveille {
	readonly factures: readonly FactureSurveillee[];
	readonly creances: readonly CreanceSurveillee[];
	readonly dossiers: readonly DossierSurveille[];
	readonly debiteurs: readonly DebiteurSurveille[];
}

const RANG_URGENCE: Record<Urgence, number> = { CRITIQUE: 0, HAUTE: 1, NORMALE: 2 };

function detecter(etat: EtatSurveille, aujourdHui: string): Evenement[] {
	const evenements: Evenement[] = [];

	// ── Factures arrivées à échéance et non soldées ──────────────────────────
	for (const facture of etat.factures) {
		const echue = facture.dateEcheance <= aujourdHui;
		const restantDu =
			facture.statutPaiement === 'IMPAYEE' || facture.statutPaiement === 'PARTIELLEMENT_PAYEE';
		if (!echue || !restantDu) continue;

		evenements.push({
			type: 'FACTURE_ECHUE',
			reference: facture.reference,
			montant: facture.montantExigible,
			urgence: 'NORMALE',
			explication: `La facture ${facture.reference} est échue depuis le ${facture.dateEcheance} et reste due.`,
			action: 'Rattacher cette facture à une créance, ou enregistrer son règlement.'
		});
	}

	// ── Créances qui viennent d'atteindre le seuil ───────────────────────────
	for (const creance of etat.creances) {
		if (creance.statut !== 'QUALIFIEE' || creance.score < SEUIL_QUALIFICATION) continue;

		evenements.push({
			type: 'CREANCE_MURE',
			reference: creance.reference,
			montant: creance.total,
			urgence: 'HAUTE',
			explication:
				`La créance ${creance.reference} atteint le seuil de qualification ` +
				`(${creance.score.toFixed(2)} pour un seuil de ${SEUIL_QUALIFICATION}).`,
			action: 'Examiner les procédures envisageables pour cette créance.'
		});
	}

	// ── Échéances de procédure ───────────────────────────────────────────────
	for (const dossier of etat.dossiers) {
		for (const echeance of dossier.echeances) {
			if (echeance.traitee === true) continue;

			const critique = echeance.gravite === 'CADUCITE';
			const restant = joursEntre(aujourdHui, echeance.dateLimite);
			const depassee = echeance.dateLimite < aujourdHui;
			const preavis = critique ? PREAVIS.CADUCITE : PREAVIS.INFORMATIVE;

			// Une échéance dépassée remonte TOUJOURS : se taire une fois la date
			// passée serait le pire moment pour se taire.
			if (!depassee && restant > preavis) continue;

			evenements.push({
				type: 'ECHEANCE_PROCEDURE',
				reference: dossier.reference,
				montant: dossier.montantEnJeu,
				urgence: critique ? 'CRITIQUE' : 'HAUTE',
				explication: depassee
					? `${echeance.libelle} : la date limite du ${echeance.dateLimite} est DÉPASSÉE.`
					: `${echeance.libelle} : il reste ${restant} jour(s) avant le ${echeance.dateLimite}.`,
				action: critique
					? `Faire signifier sans délai — passée cette date, le droit est perdu et ` +
						`${versEuros(dossier.montantEnJeu)} € cessent d'être couverts par cette procédure.`
					: `Vérifier l'avancement du dossier ${dossier.reference}.`
			});
		}
	}

	// ── Débiteurs qui se dégradent ───────────────────────────────────────────
	for (const debiteur of etat.debiteurs) {
		if (ECHELLE_SANTE[debiteur.santeActuelle] <= ECHELLE_SANTE[debiteur.santePrecedente]) {
			continue;
		}

		evenements.push({
			type: 'DEBITEUR_DEGRADE',
			reference: debiteur.reference,
			montant: debiteur.encoursTotal,
			urgence: 'HAUTE',
			// Un constat. L'effet juridique n'est pas énoncé — il n'a pas été fourni.
			explication:
				`La situation de ${debiteur.reference} est passée de ${debiteur.santePrecedente} ` +
				`à ${debiteur.santeActuelle}.`,
			action: `Revoir l'encours de ${debiteur.reference} avant d'engager de nouveaux frais.`
		});
	}

	return evenements;
}

export interface OptionsDetection {
	/** Fait remonter ce que la surveillance NE PEUT PAS voir. */
	readonly avecAnglesMorts?: boolean;
}

export interface ResultatAvecAnglesMorts {
	readonly anglesMorts: readonly string[];
}

/**
 * Ce que la surveillance ne peut pas voir, faute de paramètre validé.
 *
 * LE DIRE EST PLUS IMPORTANT QUE DE LE COMBLER. Un utilisateur qui croit sa
 * prescription surveillée ne la surveille pas lui-même. C'est la seule échéance
 * qui éteint définitivement une créance sans que personne n'ait rien fait, et
 * une alerte fabriquée sur un délai deviné serait pire que pas d'alerte du
 * tout : elle rassurerait à tort.
 */
function anglesMorts(): string[] {
	const manques: string[] = [];
	if (!estUtilisable(PARAMETRES.delaiPrescriptionCommerciale)) {
		manques.push(
			"La prescription n'est PAS surveillée : le délai de prescription commerciale n'est pas " +
				'renseigné ni validé. Aucune alerte ne sera émise à son approche, et il faut donc la ' +
				'suivre par ailleurs.'
		);
	}
	return manques;
}

export function detecterEvenements(
	etat: EtatSurveille,
	aujourdHui: string,
	options?: { avecAnglesMorts?: false }
): Evenement[];
export function detecterEvenements(
	etat: EtatSurveille,
	aujourdHui: string,
	options: { avecAnglesMorts: true }
): Evenement[] & ResultatAvecAnglesMorts;
export function detecterEvenements(
	etat: EtatSurveille,
	aujourdHui: string,
	options: OptionsDetection = {}
): Evenement[] {
	const evenements = detecter(etat, aujourdHui);

	// Le plus urgent d'abord ; à urgence égale, le plus gros montant. Un tri par
	// date seule ferait remonter une broutille avant une caducité à 8 000 €.
	evenements.sort((a, b) => {
		const parUrgence = RANG_URGENCE[a.urgence] - RANG_URGENCE[b.urgence];
		if (parUrgence !== 0) return parUrgence;
		const montantA = a.montant ?? ZERO;
		const montantB = b.montant ?? ZERO;
		if (montantA === montantB) return a.reference.localeCompare(b.reference);
		return montantB > montantA ? 1 : -1;
	});

	if (options.avecAnglesMorts === true) {
		return Object.assign(evenements, { anglesMorts: anglesMorts() });
	}
	return evenements;
}

/**
 * Ce que le produit a permis d'identifier, en euros.
 *
 * C'est le compteur cumulé du brief. Il répond à la seule question qui décide
 * du renouvellement : « qu'est-ce que ça m'a rapporté ? »
 */
export function montantIdentifie(evenements: readonly Evenement[]): Montant {
	const montants = evenements
		.map((evenement) => evenement.montant)
		.filter((montant): montant is Montant => montant !== null);
	return montants.length > 0 ? additionner(...montants) : ZERO;
}
