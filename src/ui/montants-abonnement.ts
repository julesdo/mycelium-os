import { prixAffiche } from './format';

/**
 * LES MONTANTS DE L'ABONNEMENT, HT ET TTC, PARTOUT (21/10/2026).
 *
 * Le fondateur, après la case de Paddle qui faisait accepter 14,40 € quand notre page
 * disait 12 € : « partout dans l'app tu affiches les montants HT et TTC, que ce soit
 * clair ». Un seul endroit dit comment on les écrit :
 *
 *   · ce qui sera PRÉLEVÉ se lit TTC d'abord, le hors taxes entre parenthèses :
 *     « 70,80 € TTC (59 € HT) » — c'est le chiffre du relevé bancaire ;
 *   · un PRIX de la grille se lit HT d'abord (la grille est hors taxes) et son TTC
 *     entre parenthèses : « 59 € HT (70,80 € TTC) ».
 *
 * Le TTC vient TOUJOURS de Paddle, jamais d'un taux écrit ici : `PricePreview` pour qui
 * choisit, le prochain prélèvement calculé pour qui est abonné, et le même rapport
 * TTC/HT pour ses autres prix (son pays, son numéro de TVA). Tant qu'il n'est pas lu, on
 * écrit « HT, TVA en plus » : jamais un hors taxes seul, que la case de Paddle
 * contredirait.
 *
 * HT et TTC tiennent à leur montant (espace insécable) : « (12 € » et « HT) » se
 * séparaient en fin de ligne.
 */

export const INSECABLE = '\u00a0';

/** « 70,80 € TTC (59 € HT) », ou « 59 € HT, TVA en plus » sans TTC lu. */
export function ceQuiEstPreleve(
	htCentimes: number,
	ttcCentimes: number | null | undefined
): string {
	return ttcCentimes === undefined || ttcCentimes === null
		? `${prixAffiche(htCentimes)}${INSECABLE}HT, TVA en plus`
		: `${prixAffiche(ttcCentimes)}${INSECABLE}TTC (${prixAffiche(htCentimes)}${INSECABLE}HT)`;
}

/**
 * « 59 € HT par mois (70,80 € TTC) », ou « 59 € HT par mois, TVA en plus » sans TTC lu.
 * La cadence (« par mois ») suit le hors taxes, avant la parenthèse.
 */
export function prixHTetTTC(
	htCentimes: number,
	ttcCentimes: number | null | undefined,
	cadence?: string
): string {
	const ht = `${prixAffiche(htCentimes)}${INSECABLE}HT${cadence === undefined ? '' : ` ${cadence}`}`;
	return ttcCentimes === undefined || ttcCentimes === null
		? `${ht}, TVA en plus`
		: `${ht} (${prixAffiche(ttcCentimes)}${INSECABLE}TTC)`;
}

/** « 70,80 € TTC » seul, pour une colonne de montants ; « 59 € HT » sans TTC lu. */
export function montantCourt(htCentimes: number, ttcCentimes: number | null | undefined): string {
	return ttcCentimes === undefined || ttcCentimes === null
		? `${prixAffiche(htCentimes)}${INSECABLE}HT`
		: `${prixAffiche(ttcCentimes)}${INSECABLE}TTC`;
}

/** « 59 € HT » : la ligne sous un montant TTC. */
export function montantHT(htCentimes: number): string {
	return `${prixAffiche(htCentimes)}${INSECABLE}HT`;
}

/**
 * Le TTC d'un autre prix pour le même client, au rapport TTC/HT que Paddle a calculé sur
 * son prochain prélèvement (sa TVA, ou son absence avec un numéro intracommunautaire).
 * `undefined` sans référence lisible.
 */
export function ttcAuMemeTaux(
	htCentimes: number,
	reference: { readonly ht: number | null; readonly ttc: number | null } | null | undefined
): number | undefined {
	if (reference === null || reference === undefined) return undefined;
	const { ht, ttc } = reference;
	if (ht === null || ttc === null || ht <= 0 || ttc < ht) return undefined;
	return Math.round((htCentimes * ttc) / ht);
}
