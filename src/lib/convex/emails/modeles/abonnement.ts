import { coquilleHtml, coquilleTexte, type BlocEmail } from './disposition';

export type RappelAbonnementData = {
	nomEntreprise: string;
	/** Le titre et le message du rappel, composés par `paiement/rappels.ts`. */
	titre: string;
	message: string;
	/** Compte › Abonnement, ouvert sur la rangée. */
	url: string;
};

/**
 * UN RAPPEL D'ABONNEMENT : le premier prélèvement après l'essai, ou un
 * renouvellement annuel. Il part vers les administrateurs de l'établissement,
 * jamais vers un client du gérant.
 *
 * Le texte vient de `texteDuRappel` : le même que la notification, mot pour
 * mot, pour que l'e-mail et l'écran ne disent jamais deux choses.
 */
function bloc(d: RappelAbonnementData): BlocEmail {
	return {
		titre: d.titre,
		intro: d.message,
		bouton: { libelle: 'Ouvrir mon abonnement', url: d.url },
		note: `Vous recevez ce message parce que vous administrez ${d.nomEntreprise} sur Letikette. Paddle, notre revendeur, encaisse et envoie la facture.`
	};
}

export function rappelAbonnementHtml(d: RappelAbonnementData): string {
	return coquilleHtml(bloc(d));
}

export function rappelAbonnementTexte(d: RappelAbonnementData): string {
	return coquilleTexte(bloc(d));
}
