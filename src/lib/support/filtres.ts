/**
 * CE QUI NE SORT PAS DE LA BOUCHE DE PLUME SUPPORT (16/10/2026).
 *
 * Les filtres du Plume de l'espace sont faits pour un dossier : ils couperaient « 12 € HT »,
 * « délai », « sécurisé », phrases ordinaires du support. Ceux-ci gardent ce qui protège
 * toujours : le mot interdit, les verdicts (ligne rouge n° 3), les modaux de conseil, toute
 * promesse de geste commercial (seule l'équipe en décide), toute voie de justice, et tout
 * montant qui ne s'appuie ni sur la base d'aide ni sur le compte. Une phrase retirée l'est
 * entière ; si tout est retiré, l'appelant passe la main.
 */

export type GenreSourceSupport = 'ARTICLE' | 'COMPTE' | 'AUCUNE';

export interface PhraseSupport {
	readonly texte: string;
	readonly source: { readonly genre: GenreSourceSupport; readonly cle?: string };
}

const INTERDITS: readonly RegExp[] = [
	// Le mot interdit et ses dérivés.
	/garanti/i,
	// Les verdicts : dire qu'une condition est remplie.
	// Sans `\b` : il ne connaît que l'ASCII, et ne voit aucun début de mot devant un « é ».
	/éligible/i,
	/\bvous (?:avez|aurez) droit\b/i,
	/\b(?:est|sont) (?:recevable|prescrite?s?|exigibles?)\b/i,
	/\bvous pouvez réclamer\b/i,
	// Les modaux de conseil.
	/\bvous devriez\b/i,
	/\bje vous (?:conseille|recommande)\b/i,
	/\bnous vous (?:conseillons|recommandons)\b/i,
	/\bil (?:faut|faudrait) (?:engager|lancer|saisir)\b/i,
	// Une promesse de geste commercial : seule l'équipe en décide.
	/\bje (?:vais|peux) vous (?:rembourser|offrir|accorder|prolonger)\b/i,
	/\bje vous (?:rembourse|offre|accorde)\b/i,
	/\b(?:remboursement|mois offert|geste commercial)\b.{0,40}\b(?:accordé|validé|effectué)\b/i,
	// Une voie de justice.
	/\b(?:tribunal|injonction|assignation|saisir le juge|mise en demeure)\b/i
];

/** Un montant en euros : « 12 € », « 1 250,00 euros », « 39 EUR ». */
const MONTANT = /\d[\d\s.,]*\s?(?:€|euros?\b|EUR\b)/i;

export function phraseAdmise(phrase: PhraseSupport): boolean {
	if (INTERDITS.some((motif) => motif.test(phrase.texte))) return false;
	if (MONTANT.test(phrase.texte) && phrase.source.genre === 'AUCUNE') return false;
	return true;
}

export function filtrerReponseSupport(phrases: readonly PhraseSupport[]): {
	gardees: PhraseSupport[];
	retirees: number;
} {
	const gardees = phrases.filter(phraseAdmise);
	return { gardees, retirees: phrases.length - gardees.length };
}

/** Le même filtre, pour un texte libre (le brouillon que Plume prépare à l'équipe). */
export function texteAdmis(texte: string): boolean {
	return !INTERDITS.some((motif) => motif.test(texte));
}
