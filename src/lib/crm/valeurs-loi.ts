import { PARAMETRES, estUtilisable } from '../verticales/recouvrement/parametres';
import {
	periodesDeTauxParDefaut,
	tauxPenaliteParDefaut
} from '../verticales/recouvrement/pays/france/taux';
import { REGIMES_PRESCRIPTION } from '../verticales/recouvrement/pays/france/prescription';
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
