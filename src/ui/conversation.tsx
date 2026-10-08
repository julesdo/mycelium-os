/**
 * LES TYPES D'UNE CONVERSATION AVEC PLUME.
 *
 * ⚠️ LE FIL EN FEUILLE A ÉTÉ RETIRÉ LE 08/10/2026. Il vivait ici : chaque tour dans
 * une carte titrée « Vous » ou « Le logiciel », un champ et un bouton « Demander »,
 * dans une feuille ouverte par la capsule. Le fondateur l'a jugé « horrible » ; la
 * conversation est désormais plein écran, sur les codes de Claude (`fil-plume.tsx`,
 * `screens/conversation-pilote.tsx`). Restent ici les formes que le fil échange
 * avec le domaine, qui n'ont pas changé.
 *
 * ⚠️ LA CITATION RESTE AU GRAIN DE LA PHRASE. Chaque phrase de Plume porte SA
 * source ; une phrase sans source s'affiche dégradée, marquée « non sourcé ».
 */

export type GenreSourcePhrase = 'PARAMETRE' | 'DECOMPTE' | 'PIECE' | 'AUCUNE';

/** Une phrase, et la source qui l'ancre — ou l'aveu qu'elle n'en a pas. */
export interface PhraseAffichee {
	readonly texte: string;
	readonly genreSource: GenreSourcePhrase;
	/**
	 * Ce que la source montre, en toutes lettres : « relevé le 04/01 »,
	 * « décompte du 12/09 », « BL-77 ». Vide sur `AUCUNE`.
	 */
	readonly libelleSource: string;
}

/** Le refus en quatre parties, tel que le domaine le compose. */
export interface RefusAffiche {
	readonly peutFaire: string;
	readonly constat: string;
	readonly blocages: readonly string[];
	readonly coutDeLAttente: string;
}
