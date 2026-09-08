import { ZERO, additionner, versEuros, type Montant } from '../../socle/montants';
import { joursEntre } from './decompte';
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
	/**
	 * Le plus long des trois, et de loin. Une prescription eteint la creance
	 * SANS QUE PERSONNE N'AIT RIEN FAIT, et la seule facon de l'arreter est
	 * d'engager une procedure entiere — qualifier, reunir les pieces, mandater
	 * un commissaire de justice. Trente jours ne suffiraient pas a la lancer.
	 */
	PRESCRIPTION: 90,
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
	/**
	 * La date a laquelle la creance sera prescrite, calculee EN AMONT par le
	 * module du pays — `pays/france/prescription.ts` pour la France.
	 *
	 * Elle arrive toute faite plutot que d'etre calculee ici, et c'est
	 * deliberé : la surveillance resterait sinon prisonniere du droit francais,
	 * alors qu'elle n'a aucune raison de connaitre un pays. Absente, la facture
	 * remonte en angle mort au lieu d'etre silencieusement tenue pour sure.
	 */
	readonly datePrescription?: string;
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

/**
 * Compare deux événements : le plus urgent d'abord, puis le plus gros
 * montant, puis la référence.
 *
 * LE DÉPARTAGE PAR RÉFÉRENCE N'EST PAS DÉCORATIF. Sans lui, deux événements de
 * même urgence et même montant ressortent dans l'ordre d'arrivée — un ordre
 * que rien ne documente et qui dépend de la façon dont l'appelant a construit
 * son tableau. Un briefing composé sur ce tri changerait alors de titre,
 * d'intro et d'action au hasard d'une exécution à l'autre pour une situation
 * pourtant identique.
 *
 * SEUL COMPARATEUR AU MONDE : c'est en le dupliquant qu'on a un jour perdu ce
 * départage. `detecterEvenements` et `composerBriefing` s'en servent tous les
 * deux ; aucun des deux n'a sa propre copie.
 */
export function comparerEvenements(a: Evenement, b: Evenement): number {
	const parUrgence = RANG_URGENCE[a.urgence] - RANG_URGENCE[b.urgence];
	if (parUrgence !== 0) return parUrgence;
	const montantA = a.montant ?? ZERO;
	const montantB = b.montant ?? ZERO;
	if (montantA === montantB) return a.reference.localeCompare(b.reference);
	return montantB > montantA ? 1 : -1;
}

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

	// ── Prescriptions qui approchent ─────────────────────────────────────────
	//
	// La seule échéance qui éteint une créance SANS QUE PERSONNE N'AIT RIEN
	// FAIT. Une facture déjà prescrite remonte quand même : le pire moment pour
	// se taire est celui où l'argent vient d'être perdu, parce que c'est aussi
	// celui où l'on continuerait à dépenser dessus.
	for (const facture of etat.factures) {
		if (facture.datePrescription === undefined) continue;
		const restantDu =
			facture.statutPaiement === 'IMPAYEE' || facture.statutPaiement === 'PARTIELLEMENT_PAYEE';
		if (!restantDu) continue;

		const restant = joursEntre(aujourdHui, facture.datePrescription);
		const eteinte = facture.datePrescription <= aujourdHui;
		if (!eteinte && restant > PREAVIS.PRESCRIPTION) continue;

		evenements.push({
			type: 'PRESCRIPTION_PROCHE',
			reference: facture.reference,
			montant: facture.montantExigible,
			urgence: 'CRITIQUE',
			explication: eteinte
				? `La facture ${facture.reference} est PRESCRITE depuis le ${facture.datePrescription}.`
				: `La facture ${facture.reference} sera prescrite le ${facture.datePrescription}, dans ${restant} jour(s).`,
			action: eteinte
				? 'Ne plus engager de frais sur cette facture : la créance est éteinte.'
				: `Engager une procédure avant le ${facture.datePrescription} — passée cette date, ` +
					`${versEuros(facture.montantExigible)} € sont perdus sans recours.`
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
 * Ce que la surveillance NE VOIT PAS, dit explicitement.
 *
 * LE DIRE EST PLUS IMPORTANT QUE DE LE COMBLER. Un utilisateur qui croit sa
 * prescription surveillee ne la surveille pas lui-meme. C'est la seule echeance
 * qui eteint definitivement une creance sans que personne n'ait rien fait.
 *
 * Une facture sans `datePrescription` est une facture dont le secteur n'a pas
 * ete determine en amont : le module du pays n'a donc pas pu calculer sa date.
 * La passer sous silence reviendrait a la declarer sure.
 */
function anglesMorts(etat: EtatSurveille): string[] {
	const sansDate = etat.factures
		.filter(
			(facture) =>
				facture.datePrescription === undefined &&
				(facture.statutPaiement === 'IMPAYEE' || facture.statutPaiement === 'PARTIELLEMENT_PAYEE')
		)
		.map((facture) => facture.reference);

	if (sansDate.length === 0) return [];

	return [
		`Prescription non surveillee sur ${sansDate.length} facture(s) : ${sansDate.join(', ')}. ` +
			"Leur secteur n'est pas determine, donc la date de prescription n'a pas pu etre calculee. " +
			'Preciser le secteur leve cet angle mort.'
	];
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
	// Voir `comparerEvenements` pour le départage par référence.
	evenements.sort(comparerEvenements);

	if (options.avecAnglesMorts === true) {
		return Object.assign(evenements, { anglesMorts: anglesMorts(etat) });
	}
	return evenements;
}

/**
 * Ce que le produit a permis d'identifier, en euros.
 *
 * C'est le compteur cumulé du brief. Il répond à la seule question qui décide
 * du renouvellement : « qu'est-ce que ça m'a rapporté ? »
 *
 * ⚠️ NE SOMME QUE LES FACTURES, JAMAIS LEURS AGRÉGATS. `detecter()` émet cinq
 * types d'événements, mais deux seulement portent une somme réellement
 * distincte : FACTURE_ECHUE et PRESCRIPTION_PROCHE, tous deux au montant d'UNE
 * facture. CREANCE_MURE (le total d'une créance), ECHEANCE_PROCEDURE (le
 * montant en jeu d'un dossier) et DEBITEUR_DEGRADE (l'encours d'un débiteur)
 * ne sont PAS de l'argent supplémentaire : ce sont des VUES AGRÉGÉES de la
 * MÊME monnaie que celle déjà portée par les factures qui les composent — une
 * créance additionne des factures, un dossier porte une créance, un encours
 * additionne toutes les factures d'un débiteur. Additionner un agrégat à ses
 * propres composants est un double compte PAR CONSTRUCTION, pas un cas limite :
 * une facture de 10 000 € échue ET proche de prescription ET portée par une
 * créance mûre ET comprise dans l'encours d'un débiteur dégradé produit QUATRE
 * événements sur LA MÊME somme, et les additionner ferait passer 10 000 €
 * identifiés à 40 000 € affichés.
 *
 * La facture est l'unité atomique de ce qui est dû : rien de plus petit n'a de
 * sens à additionner, et rien n'est perdu à s'y limiter — une créance mûre ou
 * un dossier en procédure reposent sur des factures échues, qui produisent
 * déjà leur propre événement.
 *
 * DÉDUPLIQUÉ PAR RÉFÉRENCE. Une même facture échue ET proche de sa
 * prescription produit un FACTURE_ECHUE et un PRESCRIPTION_PROCHE — deux
 * événements légitimes, dont le gérant doit voir les deux lignes — mais une
 * seule dette : ne garder que la première référence rencontrée après le tri
 * par urgence évite de la compter deux fois.
 *
 * NE PAS « SIMPLIFIER » EN RÉINTRODUISANT LES AUTRES TYPES : c'est exactement
 * ce qui a produit le double compte que cette fonction corrige.
 */
export function montantIdentifie(evenements: readonly Evenement[]): Montant {
	const referencesVues = new Set<string>();
	const montants: Montant[] = [];

	for (const evenement of evenements) {
		if (evenement.type !== 'FACTURE_ECHUE' && evenement.type !== 'PRESCRIPTION_PROCHE') continue;
		if (evenement.montant === null) continue;
		if (referencesVues.has(evenement.reference)) continue;

		referencesVues.add(evenement.reference);
		montants.push(evenement.montant);
	}

	return montants.length > 0 ? additionner(...montants) : ZERO;
}
