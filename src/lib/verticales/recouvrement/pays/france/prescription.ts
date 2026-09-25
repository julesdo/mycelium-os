import { ajouterMois, estDateReelle } from '../../calendrier';
import type { MotifPrescriptionInconnue } from '../../surveillance';
import { joursEntre } from '../../decompte';

/**
 * La prescription des créances, secteur par secteur.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI CE N'EST PAS UN SEUL CHIFFRE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le brief demandait « le délai de prescription commerciale », au singulier.
 * L'article L110-4 du code de commerce pose bien cinq ans entre commerçants —
 * mais il réserve dans la même phrase les créances « soumises à des
 * prescriptions spéciales plus courtes », et il énumère lui-même trois cas à
 * un an. D'autres textes en ajoutent : un an pour le transport de marchandises
 * (L133-6 du code de commerce), deux ans pour ce qu'un professionnel fournit à
 * un consommateur (L218-2 du code de la consommation).
 *
 * Un transporteur à qui l'on annoncerait cinq ans perdrait sa créance quatre
 * ans avant de s'en apercevoir.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE SENS DE L'ERREUR N'EST PAS SYMÉTRIQUE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * C'est ce qui commande le traitement du secteur INDÉTERMINÉ. Face à
 * l'inconnu, ce module retient **le délai le plus court connu**, pas le régime
 * général, et le déclare comme une hypothèse.
 *
 *   · Annoncer cinq ans à quelqu'un qui en a un : la créance s'éteint en
 *     silence, sans que personne n'ait rien fait. Irréversible.
 *   · Annoncer un an à quelqu'un qui en a cinq : il agit trop tôt. Ça ne coûte
 *     rien.
 *
 * C'est le même raisonnement que la détection de doublons d'EGalim : on se
 * trompe du côté qui se voit et se répare.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUE CE MODULE NE FAIT PAS
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Il ne détermine pas le POINT DE DÉPART. Celui-ci varie — jour où le créancier
 * a connu ou aurait dû connaître les faits, remise de la marchandise,
 * acceptation de l'ouvrage — et relève de l'appréciation des faits, pas du
 * calcul. Il est donc fourni en argument, et le régime documente lequel
 * s'applique pour que l'utilisateur sache quelle date lui est demandée.
 *
 * Il ne gère ni suspension ni interruption. Une reconnaissance du débiteur, une
 * demande en justice, une mesure conservatoire ou un acte d'exécution forcée
 * interrompent ; une mise en demeure, elle, n'interrompt pas (voir
 * `ANGLE_MORT_PRESCRIPTION` plus bas, et la correction du 25/09/2026). Les
 * suivre demanderait de consigner ces faits, ce que le produit ne fait pas
 * encore.
 *
 * Sources relevées le 2026-09-03 sur legifrance.gouv.fr. Relevé par le
 * logiciel, pas validé par un avocat — voir `parametres.ts`.
 */

export type SecteurCreance =
	| 'GENERAL'
	| 'TRANSPORT_MARCHANDISES'
	| 'CONSOMMATEUR'
	| 'NOURRITURE_MARINS'
	| 'FOURNITURE_NAVIRE'
	| 'OUVRAGE_ACCEPTE'
	| 'INDETERMINE';

export interface RegimePrescription {
	readonly dureeAnnees: number;
	readonly source: string;
	/** La date que l'utilisateur doit fournir, en clair. */
	readonly pointDeDepart: string;
	/** `true` quand le régime est une hypothèse conservatrice, pas un constat. */
	readonly hypothese: boolean;
	readonly note: string;
}

export const REGIMES_PRESCRIPTION: Record<
	Exclude<SecteurCreance, 'INDETERMINE'>,
	RegimePrescription
> = {
	GENERAL: {
		dureeAnnees: 5,
		source: 'Article L110-4 du code de commerce',
		pointDeDepart:
			'Le jour où le créancier a connu ou aurait dû connaître les faits lui permettant d’agir.',
		hypothese: false,
		note:
			'Régime général des obligations nées à l’occasion de leur commerce, entre commerçants ' +
			'ou entre commerçants et non-commerçants. S’efface devant toute prescription spéciale ' +
			'plus courte.'
	},
	TRANSPORT_MARCHANDISES: {
		dureeAnnees: 1,
		source: 'Article L133-6 du code de commerce',
		pointDeDepart:
			'Le jour où la marchandise a été remise ou offerte au destinataire ; en cas de perte ' +
			'totale, le jour où la remise aurait dû être effectuée.',
		hypothese: false,
		note:
			'Vise TOUTES les actions nées du contrat de transport, pas seulement celles pour ' +
			'avaries, pertes ou retards — donc aussi l’action en paiement du prix. Deux réserves que ' +
			'le logiciel ne détecte pas : la fraude et l’infidélité écartent la prescription annale, ' +
			'et ce régime suppose le transport terrestre intérieur — le routier international, le ' +
			'maritime et l’aérien relèvent de leurs propres textes, qui n’ont pas été relevés.'
	},
	CONSOMMATEUR: {
		dureeAnnees: 2,
		source: 'Article L218-2 du code de la consommation',
		pointDeDepart: 'Selon le droit commun, la fourniture du bien ou du service.',
		hypothese: false,
		note:
			'Action d’un professionnel pour les biens ou services fournis à un consommateur, au ' +
			'sens de l’article liminaire du code de la consommation, donc à une PERSONNE PHYSIQUE. ' +
			'Une personne morale non professionnelle — une association, par exemple — relève du ' +
			'régime général. L’article L218-1 interdit d’en modifier la durée, même d’un commun accord.'
	},
	NOURRITURE_MARINS: {
		dureeAnnees: 1,
		source: 'Article L110-4 du code de commerce',
		// Le texte dit « un an après LA LIVRAISON », pas après la fourniture. Le
		// mot affiché commande la date que le gérant va saisir.
		pointDeDepart: 'La livraison.',
		hypothese: false,
		note: 'Nourriture fournie aux matelots par ordre du capitaine.'
	},
	FOURNITURE_NAVIRE: {
		dureeAnnees: 1,
		source: 'Article L110-4 du code de commerce',
		pointDeDepart: 'La fourniture.',
		hypothese: false,
		note:
			'Matériaux et fournitures nécessaires aux constructions, équipements et ravitaillements ' +
			'du navire.'
	},
	OUVRAGE_ACCEPTE: {
		dureeAnnees: 1,
		source: 'Article L110-4 du code de commerce',
		/*
		  ⚠️ LA RÉCEPTION, PAS L'ACCEPTATION. Le texte dit « un an après la
		  réception des ouvrages ». En droit de la construction, les deux mots ne
		  sont pas synonymes, et c'est le mot affiché qui commande la date que le
		  gérant saisit : une échéance se décale de la distance entre les deux.
		  La clé du régime, elle, traverse le validateur Convex et la base : la
		  renommer est une décision produit, pas une correction de relevé.
		*/
		pointDeDepart: 'La réception des ouvrages.',
		hypothese: false,
		note: 'Ouvrages faits, à compter de leur réception.'
	}
};

/**
 * L'ANGLE MORT DE CE MODULE, ÉCRIT POUR ÊTRE AFFICHÉ.
 *
 * ⚠️ IL ÉTAIT EN COMMENTAIRE, DONC INVISIBLE À L'UTILISATEUR. L'en-tête de ce
 * fichier dit depuis le premier jour que ni suspension ni interruption ne sont
 * gérées ; un gérant qui croit sa prescription surveillée ne la surveille pas
 * lui-même, et c'est le mode de panne le plus cher du produit.
 *
 * Il devient une constante EXPORTÉE parce qu'un dossier parti chez un conseil
 * est exactement la situation où l'angle mort se paie : le compteur continue de
 * courir à l'écran, et le logiciel ne sait rien de ce que le conseil a fait.
 *
 * Il énonce un CONSTAT et ne prescrit aucune conduite : il dit ce que le
 * logiciel ignore, pas ce qu'il faudrait faire.
 *
 * ⚠️ IL A DIT FAUX PENDANT DES SEMAINES, ET DANS LE SENS LE PLUS CHER. Il
 * rangeait la mise en demeure parmi ce qui interrompt la prescription. Elle ne
 * l'interrompt pas, même par lettre recommandée (Cass. com., 18 mai 2022,
 * n° 20-23.204, publié — `PARAMETRES.miseEnDemeureNonInterruptive`) : la liste
 * des actes interruptifs est fermée (C. civ. 2240, 2241, 2244). Un gérant qui
 * nous croyait laissait passer sa date en pensant sa lettre protectrice.
 * « Peuvent l'interrompre » et non « l'interrompent » : une requête en
 * injonction de payer, par exemple, n'interrompt qu'une fois signifiée.
 */
export const ANGLE_MORT_PRESCRIPTION =
	'Ce logiciel ne gère ni suspension ni interruption de la prescription. Une reconnaissance ' +
	'par votre client de ce qu’il doit (un paiement partiel ou une demande de délai peuvent en ' +
	'être une), une demande en justice, une mesure conservatoire ou un acte ' +
	'd’exécution peuvent l’interrompre ; une mise en demeure, même envoyée en recommandé, ne ' +
	'l’interrompt pas. Si votre conseil a saisi une juridiction, ce logiciel ne le sait pas tant qu’un ' +
	'fait de procédure n’est pas consigné ici : la date affichée reste celle du calcul, pas celle ' +
	'de votre dossier.';

/** Le délai le plus court de tous les régimes connus, en années. */
export function secteurLePlusCourt(): number {
	return Math.min(...Object.values(REGIMES_PRESCRIPTION).map((r) => r.dureeAnnees));
}

export function regimePrescription(secteur: SecteurCreance): RegimePrescription {
	if (secteur !== 'INDETERMINE') return REGIMES_PRESCRIPTION[secteur];

	const duree = secteurLePlusCourt();
	return {
		dureeAnnees: duree,
		source: 'Aucune — hypothèse du logiciel',
		pointDeDepart: 'À déterminer avec le secteur.',
		hypothese: true,
		note:
			`Le secteur n’est pas déterminé. Le délai LE PLUS COURT connu (${duree} an) est retenu, ` +
			'volontairement : annoncer cinq ans à une créance qui en a un la ferait s’éteindre en ' +
			'silence, alors qu’annoncer un an à une créance qui en a cinq fait seulement agir trop ' +
			'tôt. Préciser le secteur lèvera cette hypothèse conservatrice.'
	};
}

/** La date à laquelle la créance est prescrite, bornes de quantième à quantième. */
export function dateDePrescription(pointDeDepart: string, secteur: SecteurCreance): string {
	return ajouterMois(pointDeDepart, regimePrescription(secteur).dureeAnnees * 12);
}

/** Les jours restants. Jamais négatif. */
export function joursAvantPrescription(
	pointDeDepart: string,
	secteur: SecteurCreance,
	aujourdHui: string
): number {
	return joursEntre(aujourdHui, dateDePrescription(pointDeDepart, secteur));
}

/** Prescrite dès que la date est ATTEINTE, pas seulement dépassée. */
export function estPrescrite(
	pointDeDepart: string,
	secteur: SecteurCreance,
	aujourdHui: string
): boolean {
	return aujourdHui >= dateDePrescription(pointDeDepart, secteur);
}

/**
 * Ce qu'on sait de la prescription d'une facture — la date, ou la raison de son
 * absence.
 */
export interface PrescriptionCalculee {
	readonly datePrescription?: string;
	readonly motifPrescriptionInconnue?: MotifPrescriptionInconnue;
}

/**
 * La date de prescription depuis le MEILLEUR point de départ disponible, ou le
 * motif nommé de son absence. **Ne lève jamais.**
 *
 * ⚠️ POURQUOI CETTE PORTE EXISTE. `dateDePrescription` lève sur une date qui
 * n'existe pas, et c'est juste : calculer sur un « 30 février » serait pire que
 * refuser. Mais ses appelants bouclent sur TOUTES les factures d'un
 * établissement, et une exception y éteint la surveillance ENTIÈRE — le gérant
 * ne voit plus rien, le battement s'enregistre en échec chaque matin, et il se
 * croit surveillé pendant que rien ne l'est.
 *
 * `dateEcheance` est une CHAÎNE côté Convex : `2026-02-30` traverse la
 * validation du schéma sans un mot, et l'import n'est pas le seul chemin
 * d'entrée en base. Le calcul doit donc résister, pas seulement la saisie.
 *
 * LES CANDIDATS SONT ORDONNÉS, DU MEILLEUR AU MOINS BON — exigibilité, puis
 * échéance. Un candidat abîmé ne doit pas emporter le suivant : retomber sur
 * l'échéance vaut mieux que déclarer un angle mort sur une facture qu'on sait
 * encore dater.
 */
export function prescriptionDe(
	candidats: readonly (string | undefined)[],
	secteur: SecteurCreance
): PrescriptionCalculee {
	let unCandidatEtaitLa = false;

	for (const candidat of candidats) {
		if (candidat === undefined) continue;
		unCandidatEtaitLa = true;
		if (!estDateReelle(candidat)) continue;
		return { datePrescription: dateDePrescription(candidat, secteur) };
	}

	// La distinction porte le geste : saisir une échéance absente n'est pas
	// corriger une date fausse, et un gérant envoyé au mauvais écran ne lève pas
	// son angle mort.
	return {
		motifPrescriptionInconnue: unCandidatEtaitLa
			? 'DATE_DE_DEPART_INEXPLOITABLE'
			: 'AUCUNE_DATE_DE_DEPART'
	};
}
