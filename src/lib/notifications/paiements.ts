import { depuisCentimes, versEuros } from '../socle/montants';

/**
 * UN IMPORT, UNE NOTIFICATION (21/10/2026, le parcours de l'habitude). Un relevé Qonto
 * qui rapproche vingt virements ne fait pas vingt notifications ni vingt push : une
 * seule, qui nomme le client quand il est seul, et compte les clients sinon. Le montant
 * est la somme de ce qui est rentré, en centimes jusqu'à l'écriture.
 */
export function regrouperLesPaiements(
	paiements: readonly { readonly client: string; readonly montant: bigint }[]
): { readonly titre: string; readonly message: string } | null {
	if (paiements.length === 0) return null;
	const total = paiements.reduce((somme, p) => somme + p.montant, 0n);
	const clients = new Set(paiements.map((p) => p.client));
	if (clients.size === 1) {
		return {
			titre: `${paiements[0]!.client} vous a payé`,
			message: `${enEuros(total)} rapprochés sur ses factures.`
		};
	}
	return {
		titre: `${clients.size} clients vous ont payé`,
		message: `${enEuros(total)} au total.`
	};
}

const INSECABLE = String.fromCharCode(160);

/** « 1 240 € », « 1 240,50 € » : les centimes seulement quand il y en a. */
function enEuros(centimes: bigint): string {
	return `${versEuros(depuisCentimes(centimes)).replace(/,00$/, '')}${INSECABLE}€`;
}
