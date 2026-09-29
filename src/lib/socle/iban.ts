/**
 * L'IBAN — sa forme, et sa clé de contrôle.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE MODULE EXISTE, ET CE QU'IL CORRIGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La vérification vivait dans `convex/recouvrement/profil.ts`, et elle était
 * CASSÉE en production : ses deux expressions régulières avaient perdu leurs
 * barres obliques inverses.
 *
 *   · `saisi.replace(/s+/g, '')` retirait la lettre « s », pas les espaces ;
 *   · `/^[A-Z]{2}d{2}[A-Z0-9]{11,30}$/` exigeait deux « d » littéraux après le
 *     code pays, ce qu'aucun IBAN ne porte.
 *
 * Conséquence : AUCUN IBAN ne pouvait être enregistré, et le refus annonçait
 * « sa clé de contrôle ne tombe pas » — un message faux, puisque la clé n'était
 * jamais calculée. La lettre de relance avec virement ne pouvait donc jamais se
 * composer, et rien ne le disait. C'est le piège du dépôt (voir la mémoire
 * « heredoc et backticks ») : une barre oblique inverse avalée par un outil
 * d'écriture ne casse aucune compilation, ne fait tomber aucun test, et change
 * le sens de l'expression.
 *
 * ⚠️ IL VIT DANS LE SOCLE, PAS DANS LA VERTICALE. Un IBAN est un identifiant
 * bancaire européen : il ne sait pas quelle loi il sert. Et deux endroits du
 * produit en dépendent désormais — l'en-tête des courriers, et la page où le
 * client paie.
 */

/** Le motif d'un IBAN, une fois les espaces retirés. ISO 13616. */
const FORME = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/;

export type LectureIban =
	| { readonly ok: true; readonly iban: string }
	/**
	 * ⚠️ DEUX MOTIFS DE REFUS, PAS UN. « Ce n'est pas la forme d'un IBAN » et
	 * « sa clé de contrôle ne tombe pas » ne se corrigent pas de la même façon :
	 * la première vient d'une saisie tronquée, la seconde d'un chiffre faux. Les
	 * confondre faisait annoncer une clé fausse sur une saisie vide.
	 */
	| { readonly ok: false; readonly motif: 'FORME' | 'CLE' };

/**
 * L'IBAN normalisé — sans espaces, en majuscules — et sa clé vérifiée.
 *
 * ⚠️ LE RESTE SE CALCULE CHIFFRE PAR CHIFFRE, jamais sur le nombre entier. Un
 * IBAN de 34 caractères transposé fait jusqu'à 68 chiffres : `Number` le
 * perdrait bien avant, et la clé tomberait juste une fois sur mille.
 */
export function lireIban(saisi: string): LectureIban {
	const iban = saisi.replace(/\s+/g, '').toUpperCase();
	if (!FORME.test(iban)) return { ok: false, motif: 'FORME' };

	// ISO 13616 : les quatre premiers caractères passent à la fin, puis chaque
	// lettre devient sa position dans l'alphabet plus neuf (A = 10).
	const deplace = iban.slice(4) + iban.slice(0, 4);
	const chiffres = deplace.replace(/[A-Z]/g, (lettre) => String(lettre.charCodeAt(0) - 55));

	let reste = 0;
	for (const chiffre of chiffres) reste = (reste * 10 + Number(chiffre)) % 97;

	return reste === 1 ? { ok: true, iban } : { ok: false, motif: 'CLE' };
}

/** L'IBAN groupé par quatre, comme on le lit sur un relevé. Pour l'écran, jamais pour un calcul. */
export function ibanLisible(iban: string): string {
	return iban.replace(/(.{4})/g, '$1 ').trim();
}
