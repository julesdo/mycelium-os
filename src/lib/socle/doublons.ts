/**
 * La détection de factures déposées deux fois.
 *
 * POURQUOI C'EST LE DÉFAUT LE PLUS GRAVE DU PRODUIT. Une facture comptée deux
 * fois gonfle le dénominateur des trois taux. Le chiffre ne devient ni négatif,
 * ni aberrant, ni supérieur à 100 % : il reste parfaitement crédible, et il est
 * faux. Aucun contrôle en aval ne peut le rattraper, parce qu'il n'y a rien
 * d'anormal à voir. C'est la seule catégorie de bug de ce produit qui fait
 * signer au gérant une déclaration inexacte sans que personne s'en aperçoive.
 *
 * TROIS NIVEAUX, du plus certain au plus faillible. On s'arrête au premier qui
 * répond, et chacun a un coût et un taux de faux positifs différents :
 *
 *   1. **L'empreinte du fichier.** Deux fichiers aux octets identiques sont le
 *      même fichier. Certitude absolue, coût nul, détecté AVANT tout appel au
 *      modèle. Couvre le cas le plus fréquent — redéposer un dossier entier
 *      « pour être sûr ».
 *
 *   2. **Fournisseur et numéro de facture.** Un fournisseur ne réutilise pas un
 *      numéro. C'est ce qui attrape la même facture arrivée sous deux formes :
 *      photographiée en mars, puis reçue en PDF par le comptable en avril.
 *
 *   3. **Fournisseur, date et total.** Le repli quand le numéro n'a pas été lu.
 *      Faillible : un fournisseur peut émettre deux factures le même jour pour
 *      le même montant. C'est rare, et l'arbitrage penche du bon côté — voir
 *      plus bas.
 *
 * DE QUEL CÔTÉ ON SE TROMPE. Un faux positif écarte une vraie facture : le taux
 * repose sur moins d'achats, mais reste juste sur ce qu'il mesure, et le gérant
 * VOIT la facture marquée « doublon » dans son facturier, avec un bouton pour
 * la rétablir. Un faux négatif compte deux fois : le taux est faux, et rien ne
 * le montre. Les deux erreurs ne se valent pas, donc on détecte largement.
 */

/** Ce qu'on sait d'un document déjà enregistré, pour le comparer. */
export interface FactureConnue {
	documentId: string;
	supplierId: string | null;
	invoiceNumber: string | null;
	invoiceDate: string | null;
	totalHT: number | null;
}

/**
 * Les numéros de facture se comparent sans leur ponctuation ni leur casse.
 *
 * « FA-2026-0318 », « FA 2026 0318 » et « fa20260318 » sont le même numéro. Le
 * même fournisseur peut l'écrire différemment sur son PDF et dans son export
 * comptable, et c'est précisément le cas qu'on cherche à attraper.
 */
export function numeroComparable(numero: string): string {
	return numero.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/**
 * Un numéro trop court ou purement générique ne prouve rien.
 *
 * Certaines extractions rendent « 1 », « 001 » ou « FACTURE » comme numéro. Les
 * traiter comme identifiants ferait fusionner des factures sans rapport — un
 * faux positif de masse, exactement ce qu'on ne veut pas au niveau 2, qui est
 * censé être le niveau de certitude.
 */
const NUMEROS_INEXPLOITABLES = new Set(['FACTURE', 'INVOICE', 'NA', 'NC', 'SANSNUMERO']);

export function numeroExploitable(numero: string | null): boolean {
	if (numero === null) return false;
	const propre = numeroComparable(numero);
	return propre.length >= 4 && !NUMEROS_INEXPLOITABLES.has(propre);
}

/** Tolérance sur le total : un centime d'arrondi n'est pas une facture différente. */
const TOLERANCE_EUROS = 0.02;

export type Motif = 'FICHIER_IDENTIQUE' | 'MEME_NUMERO' | 'MEME_DATE_ET_MONTANT';

export interface Verdict {
	documentId: string;
	motif: Motif;
}

/**
 * Cherche, parmi des factures déjà connues, celle dont `candidate` est le
 * doublon. Rend `null` si aucune ne correspond.
 *
 * Fonction pure : elle ne lit ni n'écrit la base. C'est ce qui permet de la
 * couvrir par des tests sur les cas qui comptent, y compris ceux qu'on ne
 * saurait pas fabriquer en base — deux factures du même jour au même montant,
 * un numéro écrit de deux façons, un total à un centime près.
 */
export function chercherDoublon(
	candidate: FactureConnue,
	connues: readonly FactureConnue[]
): Verdict | null {
	// Niveau 2 : fournisseur et numéro. Le fournisseur doit être identifié des
	// deux côtés — deux factures sans fournisseur connu partageant un numéro
	// « 2026-01 » n'ont aucune raison d'être la même.
	if (candidate.supplierId !== null && numeroExploitable(candidate.invoiceNumber)) {
		const numero = numeroComparable(candidate.invoiceNumber!);
		const trouve = connues.find(
			(c) =>
				c.documentId !== candidate.documentId &&
				c.supplierId === candidate.supplierId &&
				numeroExploitable(c.invoiceNumber) &&
				numeroComparable(c.invoiceNumber!) === numero
		);
		if (trouve) return { documentId: trouve.documentId, motif: 'MEME_NUMERO' };
	}

	// Niveau 3 : fournisseur, date et total. On exige les trois — une date et un
	// montant sans fournisseur identifié se recoupent trop facilement entre
	// grossistes.
	//
	// ET on écarte les paires dont les DEUX numéros sont lisibles et différents.
	// Un grossiste qui livre deux fois dans la journée émet deux factures du même
	// jour, souvent pour des montants proches : sans cette garde, la seconde
	// était systématiquement prise pour un doublon de la première. Quand les deux
	// numéros sont connus, ils font foi — c'est leur seul rôle.
	if (
		candidate.supplierId !== null &&
		candidate.invoiceDate !== null &&
		candidate.totalHT !== null
	) {
		const numeroCandidat = numeroExploitable(candidate.invoiceNumber)
			? numeroComparable(candidate.invoiceNumber!)
			: null;

		const trouve = connues.find((c) => {
			if (c.documentId === candidate.documentId) return false;
			if (c.supplierId !== candidate.supplierId) return false;
			if (c.invoiceDate !== candidate.invoiceDate) return false;
			if (c.totalHT === null) return false;
			if (Math.abs(c.totalHT - candidate.totalHT!) > TOLERANCE_EUROS) return false;

			const numeroConnu = numeroExploitable(c.invoiceNumber)
				? numeroComparable(c.invoiceNumber!)
				: null;
			// Deux numéros lisibles et distincts : deux factures distinctes.
			if (numeroCandidat !== null && numeroConnu !== null && numeroCandidat !== numeroConnu) {
				return false;
			}
			return true;
		});
		if (trouve) return { documentId: trouve.documentId, motif: 'MEME_DATE_ET_MONTANT' };
	}

	return null;
}

/** Ce que le gérant lit dans son facturier, en face d'un doublon. */
export function expliquerMotif(motif: Motif): string {
	switch (motif) {
		case 'FICHIER_IDENTIQUE':
			return 'Fichier identique à un fichier déjà déposé.';
		case 'MEME_NUMERO':
			return 'Même fournisseur et même numéro de facture qu’un fichier déjà lu.';
		case 'MEME_DATE_ET_MONTANT':
			return 'Même fournisseur, même date et même total qu’un fichier déjà lu.';
	}
}
