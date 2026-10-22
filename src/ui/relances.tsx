/**
 * LES E-MAILS DE RELANCE — ce que le dossier en sait, pour la conversation qui les
 * prépare (`screens/dossier-guide/fil-ecrire.tsx`, 22/10/2026).
 *
 * La liste des niveaux, leurs brouillons et leurs boutons « Copier » vivaient ici,
 * dans la rangée « Courriers et e-mails ». Ils vivent désormais dans la
 * conversation du dossier : Plume propose l'e-mail, le montre tel qu'il partira, et
 * l'ouvre dans la messagerie du gérant. Les règles n'ont pas changé :
 *
 * ⚠️ RIEN NE PART D'ICI. Le brouillon s'ouvre dans la messagerie du gérant, qui le
 * relit, le signe et l'envoie ; aucun libellé ne dit « Envoyer ».
 *
 * ⚠️ UN NIVEAU INDISPONIBLE EST MONTRÉ, PAS MASQUÉ, avec son constat.
 *
 * ⚠️ LA LONGUEUR SE MESURE AVANT D'OUVRIR (`verticales/recouvrement/messagerie.ts`) :
 * au-delà d'environ deux mille caractères, l'échec est muet.
 */

export interface NiveauAffiche {
	readonly niveau: number;
	readonly nom: string;
	readonly intention: string;
	readonly disponible: boolean;
	/** Le brouillon, quand il existe. */
	readonly objet?: string;
	readonly corps?: string;
	/**
	 * CE QUE LE PRODUIT FAIT TOUT DE SUITE, première des quatre parties d'un
	 * refus. Elle passe AVANT le constat, et ce n'est pas un détail de mise en
	 * page : un refus qui commence par ce qui manque est un mur, même quand la
	 * solution est écrite deux paragraphes plus bas.
	 */
	readonly peutFaire?: string;
	/** Pourquoi il n'y en a pas, et ce qui le lève. Un constat, jamais une consigne. */
	readonly constat?: string;
	readonly blocages?: readonly string[];
	/** Ce que l'attente coûte, en euros quand c'est chiffrable. */
	readonly coutDeLAttente?: string;
	/** Le geste qui lève ce refus, quand le produit en porte un. */
	readonly geste?: string;
}
