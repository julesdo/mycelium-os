/**
 * L'empreinte d'un fichier, calculée par le navigateur avant l'envoi.
 *
 * POURQUOI CÔTÉ NAVIGATEUR. Deux fichiers aux octets identiques sont le même
 * fichier — certitude absolue, sans lire le contenu ni interroger un modèle.
 * La calculer AVANT l'envoi permet de refuser le doublon avant de dépenser un
 * appel : sur un dossier de deux cents factures redéposé « pour être sûr »,
 * c'est deux cents appels économisés, et surtout deux cents factures qui ne
 * viennent pas fausser le dénominateur des trois taux.
 *
 * ELLE PEUT ÉCHOUER, ET CE N'EST PAS GRAVE. `crypto.subtle` n'existe que dans
 * un contexte sécurisé — HTTPS ou localhost. Un gérant derrière un proxy
 * d'entreprise en HTTP simple n'y a pas droit. On rend alors `undefined`, et le
 * dépôt continue : la détection retombe simplement sur le niveau suivant, celui
 * du numéro de facture, après extraction. Faire échouer un dépôt parce qu'une
 * optimisation n'est pas disponible serait le pire des échanges.
 */
export async function empreinte(fichier: File): Promise<string | undefined> {
	if (typeof globalThis.crypto?.subtle?.digest !== 'function') return undefined;
	try {
		const octets = await fichier.arrayBuffer();
		const condensat = await globalThis.crypto.subtle.digest('SHA-256', octets);
		return [...new Uint8Array(condensat)]
			.map((o) => o.toString(16).padStart(2, '0'))
			.join('');
	} catch {
		// Fichier illisible, mémoire insuffisante sur un très gros export : dans
		// tous les cas, l'envoi doit pouvoir se poursuivre sans empreinte.
		return undefined;
	}
}
