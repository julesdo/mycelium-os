import { ZERO, additionner, versEuros, type Montant } from '../../socle/montants';
import { joursEntre } from './decompte';
import { estDateReelle } from './calendrier';
import { SEUIL_QUALIFICATION } from './scoring';
import type { SanteDebiteur } from './scoring';
import { pluriel } from '../../socle/francais';

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
	| 'PRESCRIPTION_PROCHE'
	| 'HABITUDE_ROMPUE';

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

/** Les deux seules raisons pour lesquelles une prescription n'est pas calculable. */
export type MotifPrescriptionInconnue = 'AUCUNE_DATE_DE_DEPART' | 'DATE_DE_DEPART_INEXPLOITABLE';

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
	/**
	 * Pourquoi `datePrescription` manque — il n'y a que deux raisons, et elles
	 * appellent deux gestes différents.
	 *
	 * ⚠️ CE N'EST PAS LE SECTEUR. Un secteur indéterminé ne produit PAS d'absence
	 * de date : il produit une date calculée sur le délai le plus court, hypothèse
	 * déclarée à l'appui. Le message d'angle mort a longtemps accusé le secteur,
	 * et il envoyait le gérant sur le mauvais écran.
	 *
	 *   · `AUCUNE_DATE_DE_DEPART` — ni exigibilité ni échéance. Le geste est de
	 *     saisir l'échéance.
	 *   · `DATE_DE_DEPART_INEXPLOITABLE` — une date est là, mais elle n'existe pas
	 *     au calendrier (un « 2026-02-30 » venu d'un OCR ou d'un export tiers). Le
	 *     geste est de la corriger.
	 *
	 * Absent, on retient le premier : c'est le constat qui n'affirme rien sur une
	 * donnée qu'on n'a pas relevée.
	 */
	readonly motifPrescriptionInconnue?: MotifPrescriptionInconnue;
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

/**
 * Une facture qui sort de l'habitude de paiement de son débiteur.
 *
 * Le `constat` est rendu par `comportement.ts` et repris MOT POUR MOT : la
 * surveillance ne le récrit pas. Troisième ligne rouge du produit — on ne
 * recommande jamais une démarche, et la seule façon de le garantir est que le
 * texte ne passe par aucune plume intermediaire.
 */
export interface RuptureSurveillee {
	readonly reference: string;
	readonly debiteur: string;
	readonly montantExigible: Montant;
	readonly habituelJours: number;
	readonly ecartJours: number;
	readonly constat: string;
}

export interface EtatSurveille {
	readonly factures: readonly FactureSurveillee[];
	readonly creances: readonly CreanceSurveillee[];
	readonly dossiers: readonly DossierSurveille[];
	readonly debiteurs: readonly DebiteurSurveille[];
	/**
	 * Les débiteurs qui portent un encours ET aucun identifiant public.
	 *
	 * Le radar des registres rapproche par identifiant, et jamais par raison
	 * sociale : sans lui, un débiteur est INVISIBLE au registre — une procédure
	 * collective ouverte à son encontre passerait inaperçue.
	 *
	 * ⚠️ CE MODULE NE SAIT PAS DE QUEL IDENTIFIANT IL S'AGIT, et c'est voulu : un
	 * SIREN est français, cette surveillance n'a aucune raison de connaître un
	 * pays. Elle reçoit des noms, elle les nomme.
	 */
	readonly debiteursSansIdentifiant?: readonly string[];

	/**
	 * Les factures dont le retard SORT de l'habitude de leur debiteur.
	 *
	 * ⚠️ FACULTATIF, parce que le calcul demande un historique de règlements
	 * que tous les appelants n'ont pas. Un appelant qui ne le fournit pas
	 * n'obtient simplement aucun événement de ce type — il n'obtient pas un
	 * flux faux.
	 *
	 * ⚠️ CE MODULE NE CALCULE PAS L'HABITUDE. Elle vit dans `comportement.ts`,
	 * avec sa médiane, sa dispersion et son plancher. La surveillance reçoit
	 * des CONSTATS déjà rédigés et se contente de les faire remonter — c'est ce
	 * qui garantit qu'elle ne peut pas les reformuler, donc qu'aucun verbe
	 * d'action ne s'y glisse.
	 */
	readonly ruptures?: readonly RuptureSurveillee[];
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

	/**
	 * ⚠️ LES FACTURES DONT LA RUPTURE REMPLACERA L'ÉCHÉANCE.
	 *
	 * Défaut vu à l'écran, pas en test : la même facture sortait DEUX fois
	 * dans le flux — une rangée « échue depuis le 10 juin », une rangée « sort
	 * de son habitude ». Deux lignes pour une facture, avec deux textes
	 * différents, et le lecteur cherche laquelle est la vraie.
	 *
	 * La rupture est strictement PLUS informative : son constat porte déjà le
	 * retard en jours, et il dit en plus que ce retard est anormal POUR CE
	 * client. Elle prend donc la place de l'échéance au lieu de s'y ajouter.
	 *
	 * Rien n'est dégradé au passage : les deux événements sont en urgence
	 * NORMALE. Et le montant ne disparaît pas du compteur — `montantIdentifie`
	 * admet désormais ce type, voir la note là-bas.
	 */
	const referencesEnRupture = new Set((etat.ruptures ?? []).map((r) => r.reference));

	// ── Factures arrivées à échéance et non soldées ──────────────────────────
	for (const facture of etat.factures) {
		const echue = facture.dateEcheance <= aujourdHui;
		const restantDu =
			facture.statutPaiement === 'IMPAYEE' || facture.statutPaiement === 'PARTIELLEMENT_PAYEE';
		if (!echue || !restantDu) continue;
		// Voir `referencesEnRupture` : la rupture dit tout ce que dirait cette
		// ligne, et davantage. Deux rangées pour une facture sont une de trop.
		if (referencesEnRupture.has(facture.reference)) continue;

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
				: `La facture ${facture.reference} sera prescrite le ${facture.datePrescription}, dans ${restant} jour${pluriel(restant)}.`,
			// ⚠️ LIGNE ROUGE 3 : « On ne recommande jamais une procédure. Ce serait
			// du conseil juridique. » Cette action disait littéralement « Engager une
			// procédure avant le … », et le test qui gardait la règle ne regardait
			// qu'un seul événement, dans un seul cas, avec quatre mots interdits.
			//
			// LA CONSÉQUENCE JURIDIQUE N'EST PAS SUPPRIMÉE, elle CHANGE DE PLACE :
			// `explication` la porte, au présent de constat — « sera prescrite le X,
			// dans N jours ». Ce qui reste ici est un geste LOGICIEL, et il en faut
			// un : le briefing quotidien s'appuie sur ce champ, et un événement sans
			// prise se referme.
			// ⚠️ LA BRANCHE « ÉTEINTE » GARDE SON AVERTISSEMENT, et ce n'est pas une
			// exception à la règle : « ne plus engager de frais » ne recommande
			// aucune procédure — elle recommande de n'en engager AUCUNE. C'est le
			// seul sens dans lequel ce produit peut parler sans conseiller, et c'est
			// aussi l'avertissement qui protège le plus d'argent.
			action: eteinte
				? 'Ne plus engager de frais sur cette facture : la créance est éteinte.'
				: `Ouvrir la facture ${facture.reference} : ${versEuros(facture.montantExigible)} € y ` +
					`sont décomptés, avec les pièces qui les soutiennent.`
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

			// UNE DATE QUI N'EXISTE PAS NE PRODUIT AUCUN ÉVÉNEMENT, ET NE TUE PAS
			// LA BOUCLE. `joursEntre` lève dessus, et cette exception emportait la
			// détection ENTIÈRE — les factures échues comprises, qui n'y sont pour
			// rien. Annoncer « dans NaN jours » serait pire encore : le gérant
			// agirait sur un chiffre faux. On se tait ici, et `anglesMorts` le dit.
			if (!estDateReelle(echeance.dateLimite)) continue;

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
					: `${echeance.libelle} : il reste ${restant} jour${pluriel(restant)} avant le ${echeance.dateLimite}.`,
				// ⚠️ MÊME LIGNE ROUGE. « Faire signifier sans délai » est un impératif
				// sur un acte de procédure. La perte est dite dans `explication` ; ici
				// on ouvre un écran, ce qui est le seul geste que ce logiciel puisse
				// honnêtement demander.
				action: `Ouvrir ce dossier : la date limite et son journal y sont.`
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

	// ── LES HABITUDES ROMPUES ───────────────────────────────────────────────
	//
	// ⚠️ POURQUOI CE SIGNAL DOIT REMONTER ICI ET NE PAS RESTER DANS LA FICHE.
	// Une rupture ne se voit qu'en ouvrant le débiteur — c'est-à-dire si on le
	// soupçonne déjà. Or c'est précisément le signal qu'on ne PEUT pas
	// soupçonner : il vit sous tous les seuils de retard, sur un client réputé
	// bon payeur. Un radar qu'il faut penser à consulter n'est pas un radar.
	for (const rupture of etat.ruptures ?? []) {
		evenements.push({
			type: 'HABITUDE_ROMPUE',
			reference: rupture.reference,
			montant: rupture.montantExigible,
			// ⚠️ NORMALE, ET C'EST DÉLIBÉRÉ. Une rupture n'éteint rien. La monter
			// en CRITIQUE la mettrait au rang d'une prescription qui court, et
			// diluerait le seul signal du produit qui annonce une perte sèche.
			urgence: 'NORMALE',
			// Le constat du domaine, mot pour mot. Voir `RuptureSurveillee`.
			explication: rupture.constat,
			// ⚠️ ELLE PORTE LES DEUX INTENTIONS, parce qu'elle REMPLACE l'événement
			// d'échéance : sans la seconde phrase, le geste que cette ligne suggérait
			// — rattacher la facture, ou enregistrer son règlement — disparaîtrait
			// avec elle.
			action:
				`Ouvrir la fiche de ${rupture.debiteur} : son historique de règlements y est. ` +
				'Ou rattacher cette facture à une créance, ou enregistrer son règlement.'
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
 * ⚠️ CE MESSAGE A LONGTEMPS ACCUSÉ LE SECTEUR, ET C'ÉTAIT FAUX. Un secteur
 * indéterminé ne fait pas disparaître la date : `regimePrescription` retient
 * alors le délai le plus court et le déclare en hypothèse. La date manque pour
 * l'une des deux raisons de `MotifPrescriptionInconnue`, et chacune appelle un
 * geste différent — saisir une échéance n'est pas corriger une date fausse.
 *
 * UN MESSAGE PAR MOTIF, jamais une phrase qui les fond. Deux gestes différents
 * dans une même ligne, c'est une ligne dont on ne fait rien.
 */
const CONSIGNE_ANGLE_MORT: Record<MotifPrescriptionInconnue, string> = {
	AUCUNE_DATE_DE_DEPART:
		'Aucune date d’exigibilité ni d’échéance n’est connue sur ces factures, donc aucun point ' +
		'de départ ne peut être retenu. Saisir l’échéance lève cet angle mort.',
	DATE_DE_DEPART_INEXPLOITABLE:
		'Leur date de départ est renseignée mais n’existe pas au calendrier — un « 30 février » ' +
		'venu d’un OCR ou d’un export tiers. La corriger lève cet angle mort.'
};

function anglesMorts(etat: EtatSurveille): string[] {
	const parMotif = new Map<MotifPrescriptionInconnue, string[]>();

	for (const facture of etat.factures) {
		if (facture.datePrescription !== undefined) continue;
		if (facture.statutPaiement !== 'IMPAYEE' && facture.statutPaiement !== 'PARTIELLEMENT_PAYEE') {
			continue;
		}
		// Sans motif renseigné, on retient celui qui n'affirme rien sur une donnée
		// qu'on n'a pas relevée. Annoncer une date fausse là où il n'y a peut-être
		// aucune date enverrait corriger ce qui n'existe pas.
		const motif = facture.motifPrescriptionInconnue ?? 'AUCUNE_DATE_DE_DEPART';
		const deja = parMotif.get(motif);
		if (deja === undefined) parMotif.set(motif, [facture.reference]);
		else deja.push(facture.reference);
	}

	// L'ordre est celui de la déclaration du type, pas celui de rencontre : deux
	// exécutions sur le même état doivent rendre le même texte, sinon le briefing
	// quotidien paraîtrait changer alors que rien n'a bougé.
	const ORDRE: MotifPrescriptionInconnue[] = [
		'AUCUNE_DATE_DE_DEPART',
		'DATE_DE_DEPART_INEXPLOITABLE'
	];

	const surLesFactures = ORDRE.flatMap((motif) => {
		const references = parMotif.get(motif);
		if (references === undefined) return [];
		return [
			`Prescription non surveillée sur ${references.length} facture(s) : ` +
				`${references.join(', ')}. ${CONSIGNE_ANGLE_MORT[motif]}`
		];
	});

	// LES ÉCHÉANCES DE PROCÉDURE, ET SURTOUT LES CADUCITÉS. Une date qu'on ne
	// sait pas lire est une échéance qu'on ne surveille pas ; la taire ferait
	// croire au gérant qu'elle l'est. C'est le délai dont la perte est
	// irréversible : il se nomme, avec son dossier et son libellé, pour être
	// retrouvable à la main.
	const echeancesPerdues = etat.dossiers.flatMap((dossier) =>
		dossier.echeances
			.filter((echeance) => echeance.traitee !== true && !estDateReelle(echeance.dateLimite))
			.map((echeance) => `${dossier.reference} — ${echeance.libelle}`)
	);

	// LES DÉBITEURS INVISIBLES AU REGISTRE. Le radar rapproche par identifiant, et
	// jamais par raison sociale : sans identifiant, une procédure collective
	// ouverte contre ce débiteur passerait inaperçue. La fiche le dit déjà, à
	// l'endroit où l'on peut y remédier — mais un gérant qui n'ouvre jamais la
	// fiche d'un client qui « va bien » ne le saurait pas.
	const sansIdentifiant = etat.debiteursSansIdentifiant ?? [];

	return [
		...surLesFactures,
		...(echeancesPerdues.length === 0
			? []
			: [
					`Échéance(s) de procédure non surveillée(s) : ${echeancesPerdues.join(' ; ')}. ` +
						'Leur date limite est renseignée mais n’existe pas au calendrier, donc aucun compte ' +
						'à rebours ne peut être tenu. La corriger lève cet angle mort.'
				]),
		...(sansIdentifiant.length === 0
			? []
			: [
					`Non suivi(s) aux registres publics : ${sansIdentifiant.join(', ')}. ` +
						'Sans identifiant d’entreprise, une procédure collective ouverte à leur encontre ' +
						'passerait inaperçue. Saisir leur numéro sur leur fiche lève cet angle mort.'
				])
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
		// ⚠️ `HABITUDE_ROMPUE` Y EST ADMIS, ET C'EST LA CONTREPARTIE OBLIGATOIRE
		// DU REMPLACEMENT. Une rupture prend la place de l'événement d'échéance de
		// sa facture ; sans cette ligne, le montant de cette facture DISPARAÎTRAIT
		// du total identifié — un chiffre qui baisse parce qu'on a ajouté une
		// détection, c'est-à-dire le pire symptôme possible sur ce produit.
		//
		// La déduplication par référence, juste en dessous, garantit qu'aucune
		// facture n'est comptée deux fois — y compris si les deux types
		// remontaient un jour ensemble.
		if (
			evenement.type !== 'FACTURE_ECHUE' &&
			evenement.type !== 'PRESCRIPTION_PROCHE' &&
			evenement.type !== 'HABITUDE_ROMPUE'
		) {
			continue;
		}
		if (evenement.montant === null) continue;
		if (referencesVues.has(evenement.reference)) continue;

		referencesVues.add(evenement.reference);
		montants.push(evenement.montant);
	}

	return montants.length > 0 ? additionner(...montants) : ZERO;
}
