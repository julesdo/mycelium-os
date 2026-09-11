/**
 * Ce que l'écran « Vos données » affiche, et ce qu'il rend.
 *
 * ⚠️ CES TYPES VIVENT SÉPARÉMENT DEPUIS QUE L'ÉCRAN S'EST DIVISÉ. L'inventaire
 * reste sur `/app/donnees` ; l'export et les deux suppressions ont chacun leur
 * page. Quatre fichiers ont besoin de la même forme, et la laisser dans l'un
 * d'eux aurait fait dépendre trois pages de l'écran qui les résume.
 *
 * LA POLITIQUE DE CONFIDENTIALITÉ PROMETTAIT CES TROIS CHOSES SANS QUE RIEN NE
 * LES TIENNE. Sa section 10 annonce l'accès, la portabilité et l'effacement ;
 * il aurait fallu répondre à la main, à la première demande. Un droit qui dépend
 * de la disponibilité de son opérateur n'est pas exerçable.
 */

export type ApercuDonnees = {
	nomEtablissement: string;
	estAdmin: boolean;
	creeLe: number;
	depots: number;
	factures: number;
	decomptes: number;
	debiteurs: number;
	membres: number;
};

export type FichierExport = { url: string; octets: number; lignes: number; nomFichier: string };

/** Un poids de fichier lisible. On ne fait pas lire des octets à un gérant. */
export function poids(octets: number): string {
	if (octets < 1024) return `${octets} octets`;
	if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
	return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}
