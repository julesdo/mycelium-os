/**
 * Le taux annuel en pourcentage, pour l'œil.
 *
 * ⚠️ LA SEULE IMPLÉMENTATION DU PRODUIT. La pièce et l'écran avaient chacun la
 * leur, et les deux tronquaient à deux décimales : un taux de 12,345 %
 * s'imprimait 12,34 %, et le débiteur qui refaisait le calcul ne retrouvait pas
 * les intérêts réclamés. Le taux reste une fraction exacte partout ailleurs ; la
 * division n'a lieu qu'ici.
 */

const DECIMALES_MINIMUM = 2;
const DECIMALES_MAXIMUM = 6;

export function tauxLisible(taux: { numerateur: bigint; denominateur: bigint }): string {
	const centieme = taux.numerateur * 100n;
	const entier = centieme / taux.denominateur;
	let reste = centieme % taux.denominateur;

	let decimales = '';
	while (
		decimales.length < DECIMALES_MAXIMUM &&
		(reste !== 0n || decimales.length < DECIMALES_MINIMUM)
	) {
		reste *= 10n;
		decimales += (reste / taux.denominateur).toString();
		reste %= taux.denominateur;
	}

	return `${entier},${decimales}${reste === 0n ? '' : '…'} %`;
}
