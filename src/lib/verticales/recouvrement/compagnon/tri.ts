import { filtrerAvantRendu, RefusDeRendu, type Pastille } from './filtres';
import type { PhraseSourcee } from './prompt';

/**
 * LES FILTRES AVANT RENDU, PHRASE PAR PHRASE (08/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UNE PHRASE QUI NE PASSE PAS NE FAIT PLUS TOMBER LA RÉPONSE ENTIÈRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les filtres refusaient la réponse ENTIÈRE dès qu'une phrase écrivait un mot du
 * droit sans sa source (« commerçant », « délai », « taux »). Le fondateur a reçu,
 * à « Où en est SOURCE PRIVATE ASSETS ? », un refus en quatre parties sur les
 * « pastilles » et les « deux booléens » de la valeur : une réponse de Claude
 * entière jetée pour un mot, et un mur à la place. « Pourquoi c'est générique
 * comme ça ? »
 *
 * La barrière garde son grain, qui est la PHRASE : chaque phrase passe les mêmes
 * filtres qu'avant, avec sa propre source. Celle qui affirme une règle sans source,
 * avance un montant sans décompte, qualifie le dossier ou nomme une voie n'est pas
 * rendue — exactement comme avant. Les autres le sont. Ce qui ne s'affiche toujours
 * pas, c'est une affirmation sans preuve ; ce qui s'affiche désormais, c'est tout
 * le reste.
 */

/** La pastille d'une phrase seule, telle que `lireReponse` la compose. */
function pastilleDe(phrase: PhraseSourcee): Pastille | null {
	if (phrase.genreSource === 'PARAMETRE') {
		return { genre: 'PARAMETRE', extrait: phrase.texte, cle: phrase.reference };
	}
	if (phrase.genreSource === 'DECOMPTE') {
		return { genre: 'DECOMPTE', extrait: phrase.texte, decompteId: phrase.reference };
	}
	if (phrase.genreSource === 'PIECE') {
		return { genre: 'PIECE', extrait: phrase.texte, pieceId: phrase.reference };
	}
	return null;
}

export interface PhraseRetenue {
	readonly texte: string;
	/** La barrière qui a mordu (« B3 »), et le terme trouvé : pour qu'on sache quoi relire. */
	readonly barriere: string;
	readonly terme: string | null;
}

/**
 * Les phrases qui passent les filtres, et celles qui ne passent pas.
 *
 * ⚠️ UNE ERREUR QUI N'EST PAS UN REFUS DU DOMAINE REMONTE : elle ne se déguise pas
 * en phrase écartée.
 */
export function trierLesPhrases(phrases: readonly PhraseSourcee[]): {
	readonly gardees: readonly PhraseSourcee[];
	readonly retenues: readonly PhraseRetenue[];
} {
	const gardees: PhraseSourcee[] = [];
	const retenues: PhraseRetenue[] = [];
	for (const phrase of phrases) {
		const pastille = pastilleDe(phrase);
		try {
			filtrerAvantRendu({ texte: phrase.texte, pastilles: pastille === null ? [] : [pastille] });
			gardees.push(phrase);
		} catch (erreur) {
			if (!(erreur instanceof RefusDeRendu)) throw erreur;
			retenues.push({ texte: phrase.texte, barriere: erreur.barriere, terme: erreur.terme });
		}
	}
	return { gardees, retenues };
}
