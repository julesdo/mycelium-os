import type { GenreSource, PhraseSourcee } from './prompt';

/**
 * UN TOUR DU COMPAGNON : CE QU'ON EN ÉCRIT, ET CE QU'ON EN RELIT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LES BORNES DE PHRASE SONT UNE DONNÉE, PAS UNE DÉDUCTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Chaque phrase du compagnon porte SA source, et c'est la barrière qui empêche
 * le produit d'affirmer quoi que ce soit qu'il ne peut pas relier à un
 * décompte, à une pièce ou au référentiel. Une source posée sur la réponse
 * entière laisserait passer la phrase fausse au milieu de trois justes — et
 * c'est celle-là que le gérant recopierait dans un courrier.
 *
 * La première écriture recollait pourtant les phrases (`join(' ')`) et
 * n'indexait les pastilles que par RANG. La relecture devait alors REDÉCOUPER
 * le texte sur les fins de phrase pour retrouver ces rangs, et deux formes
 * très ordinaires le mettaient en défaut : une phrase rendue sans point final
 * se recollait à la suivante — le tour entier se rendait alors sans aucune
 * pastille —, et une abréviation (« l'art. D441-5 ») coupait une phrase en
 * deux, ce qui faisait glisser chaque pastille d'un cran.
 *
 * Le remède est ici, et il est en amont : ce qui a été rendu est ÉCRIT tel
 * quel, phrase par phrase, avec sa source à côté. Plus aucun rang, donc plus
 * aucun décalage possible entre une affirmation et la source qui la porte.
 *
 * ⚠️ ET LE REPLI RESTE, PARCE QU'IL RESTE VRAI. Les tours écrits avant ce
 * changement ne portent pas leurs phrases : ils se relisent par l'ancien
 * chemin, redécoupage compris, avec sa règle d'abandon — plutôt qu'une
 * pastille décalée, aucune pastille. Une source absente se voit ; une source
 * fausse a l'air d'une source.
 */

/**
 * D'où sort une phrase, à la forme exacte que la base persiste.
 *
 * ⚠️ LES IDENTIFIANTS SONT DES CHAÎNES ICI, ET C'EST LA FRONTIÈRE. Ce module
 * vit dans la verticale, qui ne connaît pas le harnais de plateforme ; c'est
 * `convex/recouvrement/tables.ts` qui déclare `v.id('pieces')` et
 * `v.id('decomptes')`, et l'appelant Convex constate la marque au passage.
 *
 * Les trois natures sont celles de `vSourceConstat`, et il n'y en a pas de
 * quatrième : une source libre en texte rouvrirait le chemin qu'une pastille
 * existe pour fermer — une affirmation sourcée par une phrase que rien ne
 * résout, donc que rien ne corrige le jour où la valeur change.
 */
export type SourceDeLaPhrase =
	| { readonly nature: 'PIECE'; readonly pieceId: string; readonly page?: number }
	| { readonly nature: 'DECOMPTE'; readonly decompteId: string }
	| { readonly nature: 'REFERENTIEL'; readonly cleParametre: string };

/**
 * Une phrase telle qu'elle est ÉCRITE : son texte, et sa source ou rien.
 *
 * `source` absente n'est pas un trou : c'est l'aveu qu'aucune source ne porte
 * cette phrase, et l'écran l'affiche visiblement dégradée. Ce sont les filtres
 * avant rendu qui lui interdisent un montant ou un énoncé de droit.
 */
export interface PhrasePersistee {
	readonly texte: string;
	readonly source?: SourceDeLaPhrase;
}

/** Une pastille au RANG de la phrase — l'ancienne forme, qu'on relit encore. */
export interface PastillePersistee {
	readonly phrase: number;
	readonly source: SourceDeLaPhrase;
}

/** Une phrase remise à l'écran : son texte, son genre, et ce que la pastille montre. */
export interface PhraseRelue {
	readonly texte: string;
	readonly genreSource: GenreSource;
	readonly libelleSource: string;
}

/** La source d'une phrase rendue, ou rien quand elle n'en porte aucune. */
function sourceDeLaPhrase(phrase: PhraseSourcee): SourceDeLaPhrase | undefined {
	if (phrase.genreSource === 'PARAMETRE') {
		return { nature: 'REFERENTIEL', cleParametre: phrase.reference };
	}
	if (phrase.genreSource === 'DECOMPTE') {
		return { nature: 'DECOMPTE', decompteId: phrase.reference };
	}
	if (phrase.genreSource === 'PIECE') {
		return { nature: 'PIECE', pieceId: phrase.reference };
	}
	return undefined;
}

/**
 * Ce qu'on écrit du tour : les phrases, chacune avec sa source.
 *
 * ⚠️ LA CLÉ EST ABSENTE PLUTÔT QUE VIDE quand la phrase n'est sourcée par
 * rien. « Pas de source » ne s'écrit donc que d'une seule façon, et aucun
 * lecteur n'a à trancher entre deux.
 */
export function phrasesAPersister(phrases: readonly PhraseSourcee[]): PhrasePersistee[] {
	return phrases.map((phrase) => {
		const source = sourceDeLaPhrase(phrase);
		return source === undefined ? { texte: phrase.texte } : { texte: phrase.texte, source };
	});
}

/**
 * Les pastilles au rang, écrites EN PLUS des phrases.
 *
 * ⚠️ ELLES NE SONT PLUS LE CHEMIN DE RELECTURE, ET ELLES RESTENT ÉCRITES. Le
 * champ est requis au schéma, et une table qui porte déjà des documents ne
 * perd pas un champ requis sans casser son déploiement. Les deux tableaux
 * sortent d'ailleurs de la MÊME liste de phrases, dans la même transaction :
 * ils ne peuvent pas diverger sans que ce module mente.
 */
export function pastillesAPersister(phrases: readonly PhraseSourcee[]): PastillePersistee[] {
	const posees: PastillePersistee[] = [];
	phrases.forEach((phrase, rang) => {
		const source = sourceDeLaPhrase(phrase);
		if (source !== undefined) posees.push({ phrase: rang, source });
	});
	return posees;
}

/**
 * CE QU'UNE PASTILLE MONTRE, en toutes lettres.
 *
 * ⚠️ UN IDENTIFIANT N'EST PAS UNE SOURCE. Le gérant qui relit six mois plus
 * tard, devant une contestation, a besoin de l'entrée du référentiel ou du
 * décompte daté, pas d'une chaîne de vingt caractères.
 */
function libelleDeLaSource(source: SourceDeLaPhrase): Omit<PhraseRelue, 'texte'> {
	if (source.nature === 'REFERENTIEL') {
		return { genreSource: 'PARAMETRE', libelleSource: source.cleParametre };
	}
	if (source.nature === 'DECOMPTE') {
		return { genreSource: 'DECOMPTE', libelleSource: 'décompte du dossier' };
	}
	return {
		genreSource: 'PIECE',
		libelleSource:
			source.page === undefined ? 'pièce du dossier' : `pièce du dossier, page ${source.page}`
	};
}

function sansSource(texte: string): PhraseRelue {
	return { texte, genreSource: 'AUCUNE', libelleSource: '' };
}

/**
 * L'ANCIEN CHEMIN, POUR LES TOURS ÉCRITS AVANT QUE LES PHRASES LE SOIENT.
 *
 * Ce qu'il fait, et ce qu'il refuse de faire :
 *
 *   · il redécoupe sur une fin de phrase, ce qui retrouve le découpage
 *     d'origine dans le cas courant — le modèle rend des phrases ponctuées ;
 *   · il n'accepte le résultat que si le compte obtenu est EXACTEMENT celui
 *     que les rangs attestent, et rend sinon le tour en UNE phrase sans
 *     pastille. Une pastille posée sur la mauvaise phrase désignerait une
 *     source qui ne dit pas ce qu'on lui fait dire, et c'est exactement ce
 *     que les pastilles existent pour empêcher.
 *
 * ⚠️ LE COMPTE SE VÉRIFIE DANS LES DEUX SENS, ET LA PREMIÈRE ÉCRITURE N'EN
 * VÉRIFIAIT QU'UN. Elle n'abandonnait que sur un découpage TROP COURT — une
 * pastille serait tombée hors du texte, donc rien ne s'affichait. Un découpage
 * TROP LONG passait : « L'indemnité est due au titre de l'art. D441-5. » se
 * coupe après « art. », et chaque pastille glisse alors d'un cran — la source
 * du décompte se posait sur la phrase du référentiel, et la phrase qui portait
 * le MONTANT se rendait « non sourcé ». C'est le défaut que le garde-fou
 * annonçait empêcher.
 *
 * ⚠️ ET UN EXCÉDENT NE SE DISTINGUE PAS D'UNE PHRASE FINALE NON SOURCÉE. Les
 * deux rendent le même compte, et rien dans la ligne ne dit lequel des deux
 * s'est produit. Le doute ne profite jamais au produit : on abandonne les
 * pastilles du tour plutôt que d'en poser une sur une phrase qu'elle ne
 * source peut-être pas.
 */
function relireParRedecoupage(
	texte: string,
	pastilles: readonly PastillePersistee[]
): readonly PhraseRelue[] {
	if (pastilles.length === 0) return [sansSource(texte)];

	const morceaux = texte
		.split(/(?<=[.!?…])\s+/)
		.map((phrase) => phrase.trim())
		.filter((phrase) => phrase !== '');

	const rangMax = Math.max(...pastilles.map((pastille) => pastille.phrase));
	if (morceaux.length !== rangMax + 1) return [sansSource(texte)];

	return morceaux.map((morceau, rang): PhraseRelue => {
		const pastille = pastilles.find((p) => p.phrase === rang);
		if (pastille === undefined) return sansSource(morceau);
		return { texte: morceau, ...libelleDeLaSource(pastille.source) };
	});
}

/**
 * Le tour, remis en phrases, exactement comme il a été rendu.
 *
 * ⚠️ UN TABLEAU DE PHRASES VIDE SE LIT COMME UNE ABSENCE, jamais comme un tour
 * sans aucune phrase. Le repli le reprend alors et le tour se rend sur son
 * texte — ce qui est le cas des tours du gérant et des refus, qui n'ont jamais
 * été découpés en phrases sourcées et n'en portent donc aucune.
 */
export function relireTour(tour: {
	readonly texte: string;
	readonly pastilles: readonly PastillePersistee[];
	readonly phrases?: readonly PhrasePersistee[];
}): readonly PhraseRelue[] {
	if (tour.phrases !== undefined && tour.phrases.length > 0) {
		return tour.phrases.map((phrase) =>
			phrase.source === undefined
				? sansSource(phrase.texte)
				: { texte: phrase.texte, ...libelleDeLaSource(phrase.source) }
		);
	}
	return relireParRedecoupage(tour.texte, tour.pastilles);
}
