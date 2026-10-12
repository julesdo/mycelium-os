/**
 * PAR OÙ SE LIT UNE FACTURE DÉPOSÉE — l'export comptable, ou la facture document.
 *
 * Le fichier répond seul à la question : un `.csv` n'est jamais une facture en
 * PDF, et un PDF n'est jamais un FEC. Règle d'écran n° 1 — on ne demande pas une
 * saisie que le logiciel peut déduire.
 *
 * ⚠️ LE XML EST UNE FACTURE, PAS UN EXPORT. Un Factur-X ou une facture CII
 * arrive en XML ; l'envoyer au parseur d'export comptable faisait répondre
 * « Format d'export non reconnu » — un échec qui mentait sur sa cause.
 *
 * Déplacée de l'écran des dépôts le 12/10/2026 : le coffre décide désormais sur
 * le serveur, d'après la nature VÉRIFIÉE du fichier (`socle/coffre/fichiers.ts`),
 * plus d'après le type que le navigateur déclare.
 */
export type ModeDeLecture = 'EXPORT_COMPTABLE' | 'FACTURE_DEPOSEE';

export function modeDeLecture(nature: 'PDF' | 'IMAGE' | 'TEXTE', mime: string): ModeDeLecture {
	if (nature === 'PDF' || nature === 'IMAGE') return 'FACTURE_DEPOSEE';
	if (mime === 'application/xml' || mime === 'text/xml') return 'FACTURE_DEPOSEE';
	return 'EXPORT_COMPTABLE';
}
