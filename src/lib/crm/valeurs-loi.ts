import { PARAMETRES, estUtilisable } from '../verticales/recouvrement/parametres';
import {
	periodesDeTauxParDefaut,
	tauxPenaliteParDefaut
} from '../verticales/recouvrement/pays/france/taux';
import {
	REGIMES_PRESCRIPTION,
	datePrescriptionQuadriennale
} from '../verticales/recouvrement/pays/france/prescription';
import { tauxInteretsMoratoires } from '../verticales/recouvrement/pays/france/commande-publique';
import { decompterFacture } from '../verticales/recouvrement/decompte';
import { tauxLisible } from '../verticales/recouvrement/taux-lisible';
import { depuisCentimes } from '../socle/montants';
import type { ValeursDeLaLoi } from './modeles';

/**
 * LES CHIFFRES DE LA LOI QU'ÉCRIVENT LES E-MAILS DE PROSPECTION (18/10/2026).
 *
 * Aucun n'est tapé dans un modèle : l'indemnité et les délais viennent du registre,
 * le taux du semestre de la série des taux BCE, et l'exemple chiffré du moteur du
 * produit (`decompterFacture`), comme dans les articles du blog. Le jour où une
 * valeur change, l'e-mail change avec elle ; un semestre absent de la série rend
 * `null`, et le modèle dit la règle au lieu d'un nombre.
 */

/** L'exemple de la phase manuelle : 100 factures de 2 000 €, réglées 30 jours en retard. */
const FACTURES = 100n;
const MONTANT_CENTIMES = 200_000n;
const JOURS_DE_RETARD = 30;

function joursAvant(jour: string, jours: number): string {
	const t = Date.parse(`${jour}T12:00:00Z`) - jours * 86_400_000;
	return new Date(t).toISOString().slice(0, 10);
}

/** « 6 000 € » : arrondi à la centaine, parce que c'est un ordre de grandeur. */
function centainesDEuros(centimes: bigint): string {
	const euros = Number((centimes + 5_000n) / 10_000n) * 100;
	return `${new Intl.NumberFormat('fr-FR').format(euros)} €`.replace(/\s/g, ' ');
}

function eurosRonds(centimes: bigint): string {
	return centimes % 100n === 0n
		? `${(centimes / 100n).toString()} €`
		: `${(centimes / 100n).toString()},${(centimes % 100n).toString().padStart(2, '0')} €`;
}

export function valeursDeLaLoi(jour: string): ValeursDeLaLoi {
	const indemnite = PARAMETRES.indemniteForfaitaire;
	const indemniteLisible =
		estUtilisable(indemnite) && typeof indemnite.valeur === 'bigint'
			? eurosRonds(indemnite.valeur)
			: null;

	const { taux, exemple } = tauxEtExemple(jour);
	return {
		indemnite: indemniteLisible,
		taux,
		delaiTransport: REGIMES_PRESCRIPTION.TRANSPORT_MARCHANDISES.dureeAnnees,
		delaiGeneral: REGIMES_PRESCRIPTION.GENERAL.dureeAnnees,
		publiques: valeursPubliques(jour),
		exemple
	};
}

function tauxEtExemple(jour: string): { taux: string | null; exemple: string | null } {
	try {
		const taux = tauxLisible(tauxPenaliteParDefaut(jour)).replace(/\s/g, ' ');
		const echeance = joursAvant(jour, JOURS_DE_RETARD);
		const ligne = decompterFacture(
			{
				reference: 'exemple',
				montantExigible: depuisCentimes(MONTANT_CENTIMES),
				dateExigibilite: echeance,
				reglements: [],
				taux: periodesDeTauxParDefaut(echeance, jour)
			},
			jour,
			'ACT_365',
			'PENALITES_DABORD'
		);
		const exemple = centainesDEuros(
			(BigInt(ligne.interets) + BigInt(ligne.indemniteForfaitaire)) * FACTURES
		);
		return { taux, exemple };
	} catch {
		// Un semestre que la série ne connaît pas : on ne l'extrapole pas.
		return { taux: null, exemple: null };
	}
}

/** Ce qu'un script ou un e-mail dit d'un acheteur public, lu au registre. */
export interface ValeursPubliques {
	/** « 10,40 % » pour un retard qui commence ce jour-là, ou `null` hors de la série. */
	readonly taux: string | null;
	/** « 40 € », ou `null`. */
	readonly indemnite: string | null;
	/** Les délais plafonds, en jours. */
	readonly delaiCollectivite: number;
	readonly delaiHopital: number;
	/** L'année dont les droits peuvent se prescrire à la fin de l'année en cours (lecture). */
	readonly anneeQuiSePrescrit: number;
	/** « 31 décembre 2026 » : le dernier jour pour réclamer les droits de cette année-là. */
	readonly dernierJour: string;
	/** Les jours laissés à l'acheteur pour payer les intérêts après le principal. */
	readonly joursPourLesAccessoires: number;
}

/**
 * Les chiffres du barème public d'aujourd'hui. L'année qui se prescrit est une LECTURE
 * (droits acquis l'année des prestations, `PARAMETRES.delaiPrescriptionQuadriennale`) :
 * qui la cite écrit « peuvent se prescrire ».
 */
export function valeursPubliques(jour: string): ValeursPubliques {
	const annee = Number(jour.slice(0, 4));
	const duree = Number(PARAMETRES.delaiPrescriptionQuadriennale.valeur);
	const anneeQuiSePrescrit = annee - duree;
	const { dernierJourPourAgir } = datePrescriptionQuadriennale(anneeQuiSePrescrit);
	const delais = PARAMETRES.delaisPaiementPublics.valeur;
	const indemnite = PARAMETRES.indemniteForfaitairePublique;
	return {
		taux: tauxPublicLisible(jour),
		indemnite:
			estUtilisable(indemnite) && typeof indemnite.valeur === 'bigint'
				? eurosRonds(indemnite.valeur)
				: null,
		delaiCollectivite: delais.POUVOIR_ADJUDICATEUR,
		delaiHopital: delais.SANTE,
		anneeQuiSePrescrit,
		dernierJour: dateEnLettres(dernierJourPourAgir),
		joursPourLesAccessoires: Number(PARAMETRES.paiementAccessoiresPublics.valeur)
	};
}

/** Le taux public du jour, ou `null` pour un semestre que la série ne connaît pas. */
function tauxPublicLisible(jour: string): string | null {
	try {
		return tauxLisible(tauxInteretsMoratoires(jour)).replace(/\s/g, ' ');
	} catch {
		return null;
	}
}

const MOIS = [
	'janvier',
	'février',
	'mars',
	'avril',
	'mai',
	'juin',
	'juillet',
	'août',
	'septembre',
	'octobre',
	'novembre',
	'décembre'
];

/** « 2026-12-31 » → « 31 décembre 2026 ». */
function dateEnLettres(jour: string): string {
	const [a, m, j] = jour.split('-').map(Number);
	return `${j} ${MOIS[(m ?? 1) - 1]} ${a}`;
}
