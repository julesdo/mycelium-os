/**
 * UNE FACTURE LUE DANS UN LOGICIEL TIERS, dans la forme que l'import connaît
 * déjà — quelle que soit la source : Qonto en direct, ou l'un des logiciels que
 * Nango relie (Pennylane, QuickBooks, Xero, Zoho, Stripe, Sellsy…).
 *
 * Une seule forme pour toutes les sources : c'est ce qui permet à chaque
 * connecteur de n'être qu'un traducteur, et à l'écriture de rester un seul
 * chemin, qui dédoublonne déjà par référence.
 */
export interface FactureDepuisConnecteur {
	readonly reference: string;
	readonly debiteur: string;
	readonly debiteurSiren?: string;
	/** Rendue TELLE QUELLE : le socle ne sait pas ce qu'est une adresse acceptable pour ce produit. */
	readonly debiteurEmail?: string;
	readonly montantTTC: bigint;
	readonly dateEmission: string;
	readonly dateEcheance?: string;
	/**
	 * Ce que la source dit avoir été réglé AU TOTAL, et le jour où on le constate.
	 * `null` : rien de réglé, ou rien qu'on sache attribuer. Un cumul, jamais un
	 * règlement : voir `complementDeReglement`.
	 *
	 * ⚠️ `dateSure` À `false` : la source ne dit pas QUAND la facture a été payée, et la
	 * date est celle de la lecture. Elle sert à dater l'écriture, jamais à calculer des
	 * pénalités : le calcul nomme la facture au lieu de la chiffrer (19/10/2026).
	 */
	readonly regleCumule: {
		readonly montant: bigint;
		readonly date: string;
		readonly dateSure: boolean;
	} | null;
}
