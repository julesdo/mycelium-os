import { ajouterJours, estDateReelle } from './calendrier';
import { PARAMETRES, exiger } from './parametres';

/**
 * D'OÙ COURT LE RETARD D'UNE FACTURE (19/10/2026) — une seule lecture pour tout ce qui
 * MESURE : la révélation, le diagnostic, le relevé des étapes et le conseil « ce qui
 * vous est dû ». Avant, trois lectures coexistaient : un compte venu par un FEC (qui ne
 * porte pas d'échéance) n'atteignait jamais « factures échues trouvées », alors que la
 * révélation le chiffrait.
 *
 *   · l'exigibilité, quand le gérant ou le logiciel l'a posée ;
 *   · sinon l'échéance de la facture ;
 *   · sinon le délai supplétif de L441-10 I compté depuis la DATE DE LA FACTURE
 *     (`PARAMETRES.delaiDeReglementSuppletif`), marqué `supposee`.
 *
 * ⚠️ CE QUI AGIT VERS LE CLIENT N'EN USE PAS. Le pilote et le plan de relance exigent
 * une échéance connue (`plan.ts`) : on ne relance pas un client sur une hypothèse.
 *
 * Une date d'émission illisible part telle quelle : le décompte la nommera, au lieu
 * qu'une date fabriquée la cache.
 */
export function departDuRetard(facture: {
	readonly dateExigibilite?: string;
	readonly dateEcheance?: string;
	readonly dateEmission: string;
}): { depart: string; supposee: boolean } {
	if (facture.dateExigibilite !== undefined) {
		return { depart: facture.dateExigibilite, supposee: false };
	}
	if (facture.dateEcheance !== undefined) return { depart: facture.dateEcheance, supposee: false };
	const jours = exiger(PARAMETRES.delaiDeReglementSuppletif);
	return {
		depart: estDateReelle(facture.dateEmission)
			? ajouterJours(facture.dateEmission, jours)
			: facture.dateEmission,
		supposee: true
	};
}

/** Non soldée, et son retard a commencé avant `aujourdHui`. */
export function estEchue(
	facture: {
		readonly dateExigibilite?: string;
		readonly dateEcheance?: string;
		readonly dateEmission: string;
		readonly statutPaiement: string;
	},
	aujourdHui: string
): boolean {
	if (facture.statutPaiement === 'SOLDEE') return false;
	const { depart } = departDuRetard(facture);
	return estDateReelle(depart) && depart < aujourdHui;
}
