import type { DocumentExtrait } from './schema';

const TOLERANCE_EUR = 0.01;

/** En France, l'alimentaire est à 5,5 % ou 10 %, le non-alimentaire à 20 %. */
export const TAUX_ALIMENTAIRES: ReadonlySet<number> = new Set([5.5, 10]);

export type NatureEcart = 'TOTAL_HT' | 'BASE_TVA' | 'NON_VERIFIABLE' | 'ILLISIBLE';

export interface Ecart {
	nature: NatureEcart;
	attendu: number | null;
	obtenu: number;
	ecart: number;
	detail: string;
}

export interface ResultatVerification {
	ok: boolean;
	ecarts: Ecart[];
	/** Message prêt à renvoyer au modèle pour une relance d'extraction. */
	messageRelance: string;
}

function formaterEur(montant: number): string {
	return montant.toFixed(2).replace('.', ',');
}

function sansMessage(ecarts: Ecart[]): ResultatVerification {
	return { ok: ecarts.length === 0, ecarts, messageRelance: construireMessageRelance(ecarts) };
}

function construireMessageRelance(ecarts: Ecart[]): string {
	if (ecarts.length === 0) return '';

	const lignes = ecarts.map((e) => `- ${e.detail}`);
	const premiereNature = ecarts[0]!.nature;

	let conseil: string;
	switch (premiereNature) {
		case 'ILLISIBLE':
			conseil = 'Le document a été déclaré illisible. Demande un document plus net ou plus complet.';
			break;
		case 'NON_VERIFIABLE':
			conseil =
				'Aucun total exploitable n’a été extrait. Relis le document et retrouve le total HT ou les bases de TVA imprimées.';
			break;
		case 'BASE_TVA':
			conseil =
				'Le total tombe juste mais la ventilation par taux de TVA ne correspond pas. Une ligne a probablement un taux de TVA mal lu.';
			break;
		default:
			conseil = 'Relis le document et corrige. Une ligne a probablement été omise.';
	}

	return [
		'Ta précédente extraction ne retombe pas sur les totaux de la facture :',
		...lignes,
		conseil
	].join('\n');
}

/**
 * Vérifie une extraction (déterministe ou Claude) contre les invariants
 * imprimés sur la facture elle-même : total HT et bases de TVA par taux.
 * Une extraction qui ne retombe pas dessus n'est pas fiable — trois niveaux
 * de contrôle, du plus fort au plus faible.
 */
export function verifierExtraction(doc: DocumentExtrait): ResultatVerification {
	if (doc.illisible) {
		const ecart: Ecart = {
			nature: 'ILLISIBLE',
			attendu: null,
			obtenu: 0,
			ecart: 0,
			detail: doc.raisonIllisible
				? `Document déclaré illisible : ${doc.raisonIllisible}.`
				: 'Document déclaré illisible.'
		};
		return sansMessage([ecart]);
	}

	const sommeLignes = doc.lignes.reduce((s, l) => s + l.amountHT, 0);

	if (doc.totaux.totalHT === null) {
		const ecart: Ecart = {
			nature: 'NON_VERIFIABLE',
			attendu: null,
			obtenu: sommeLignes,
			ecart: 0,
			detail: 'Aucun total HT n’a pu être lu sur le document : l’extraction ne peut pas être vérifiée.'
		};
		return sansMessage([ecart]);
	}

	const ecarts: Ecart[] = [];

	const ecartTotal = Math.abs(sommeLignes - doc.totaux.totalHT);
	if (ecartTotal > TOLERANCE_EUR) {
		ecarts.push({
			nature: 'TOTAL_HT',
			attendu: doc.totaux.totalHT,
			obtenu: sommeLignes,
			ecart: ecartTotal,
			detail: `Somme des lignes : ${formaterEur(sommeLignes)} € — total HT imprimé : ${formaterEur(doc.totaux.totalHT)} € — écart : ${formaterEur(ecartTotal)} €`
		});
	}

	for (const base of doc.totaux.basesParTaux) {
		const sommeTaux = doc.lignes
			.filter((l) => l.vatRate === base.taux)
			.reduce((s, l) => s + l.amountHT, 0);
		const ecartBase = Math.abs(sommeTaux - base.baseHT);
		if (ecartBase > TOLERANCE_EUR) {
			ecarts.push({
				nature: 'BASE_TVA',
				attendu: base.baseHT,
				obtenu: sommeTaux,
				ecart: ecartBase,
				detail: `Base TVA à ${base.taux} % : somme des lignes ${formaterEur(sommeTaux)} € — base imprimée ${formaterEur(base.baseHT)} € — écart : ${formaterEur(ecartBase)} €`
			});
		}
	}

	return sansMessage(ecarts);
}
