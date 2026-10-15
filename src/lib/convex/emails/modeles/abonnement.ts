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
 *
 * LE PRÉLÈVEMENT NE SURPREND JAMAIS : le titre porte la date, le message le
 * montant, et le bouton mène à l'endroit où l'on change ou résilie. Rien ici ne
 * pousse à rester.
 */
function bloc(d: RappelAbonnementData): BlocEmail {
	return {
		apercu: d.message,
		titre: d.titre,
		intro: d.message,
		bouton: { libelle: 'Voir mon abonnement', url: d.url },
		note: `Vous recevez ce message parce que vous administrez ${d.nomEntreprise} sur Letikette. Le paiement est encaissé par Paddle, notre revendeur, qui vous envoie la facture.`
	};
}

export function rappelAbonnementHtml(d: RappelAbonnementData): string {
	return coquilleHtml(bloc(d));
}

export function rappelAbonnementTexte(d: RappelAbonnementData): string {
	return coquilleTexte(bloc(d));
}
