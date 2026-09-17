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
 * ⚠️ ET LE REDÉCOUPAGE A ÉTÉ RETIRÉ, PARCE QU'IL N'ÉTAIT PAS PROUVABLE. Les
 * tours écrits avant ce changement ne portent pas leurs phrases : ils se
 * rendent EN UNE PHRASE, sans aucune pastille. Le raisonnement est écrit en
 * entier au-dessus de `relireTour`, à l'endroit du choix. Une source absente
 * se voit ; une source fausse a l'air d'une source.
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
 * LE TOUR, REMIS EN PHRASES, EXACTEMENT COMME IL A ÉTÉ RENDU.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA DÉCISION : LE REDÉCOUPAGE EST RETIRÉ, IL N'EST PAS RÉPARÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les tours écrits avant que les phrases le soient ne portent que leur `texte`
 * — la concaténation par `join(' ')` — et des pastilles indexées par RANG. Ce
 * module redécoupait alors le texte sur la ponctuation pour retrouver ces
 * rangs, et n'acceptait le résultat que si le compte obtenu valait exactement
 * `rangMax + 1`, où `rangMax` est le rang de la DERNIÈRE PHRASE SOURCÉE.
 *
 * Ce garde-fou était faux dans les deux sens, et deux phrases suffisaient :
 *
 *   · P0 sourcée par le décompte et rendue SANS point final, P1 sans aucune
 *     source. Le redécoupage ne trouve qu'un morceau, `rangMax` vaut 0, et
 *     `1 === 0 + 1` LAISSE PASSER : la pastille « décompte du dossier » se
 *     posait sur tout le texte, l'aveu d'ignorance compris. Le produit
 *     présentait comme sourcée la phrase qu'il avait explicitement laissée
 *     sans source ;
 *   · P0 sourcée et P1 sans source, toutes deux ponctuées — la forme la plus
 *     ordinaire qui soit. Deux morceaux contre `rangMax + 1 === 1` : toutes
 *     les pastilles du tour étaient abandonnées, alors que le découpage était
 *     juste.
 *
 * ⚠️ ET AUCUN COMPTE NE PEUT RÉPARER ÇA, PARCE QUE LA DONNÉE NE PORTE PAS LA
 * RÉPONSE. Écrivons `N` le nombre vrai de phrases : les rangs n'en donnent
 * qu'une BORNE INFÉRIEURE, `N >= rangMax + 1`, puisque les phrases non
 * sourcées qui terminent le tour ne sont comptées nulle part. Et les bornes
 * trouvées ne sont ni incluses dans les vraies ni ne les incluent : une vraie
 * borne est manquée dès que la phrase ne finit pas par une ponctuation, une
 * fausse borne apparaît dès qu'une abréviation (« l'art. D441-5 ») met un
 * point suivi d'un espace au milieu d'une phrase. Une coupure manquée et une
 * coupure en trop se compensent au comptage tout en décalant les pastilles.
 * Aucune fonction de `(texte, pastilles)` ne distingue ces cas : la partition
 * d'origine n'est pas déterminée par ce qui a été écrit.
 *
 * ⚠️ DONC ON NE GARDE PAS UNE HEURISTIQUE QU'ON NE PEUT PAS PROUVER ALIGNÉE.
 * « Donnée ABSENTE : repli documenté légitime. Donnée FAUSSE : aucun repli. »
 * Une pastille décalée est pire qu'une pastille absente — elle a l'air d'une
 * vérification, et c'est celle-là que le gérant recopierait.
 *
 * ⚠️ CE QUE ÇA COÛTE, CHIFFRÉ. `conversation.repondre` est le seul écrivain de
 * la table, et son seul appelant est l'écran de la file, câblé par `2390412`
 * (17 septembre 2026, 12h44) ; les phrases se persistent depuis `6d8f47f`
 * (13h37 le même jour). La population des tours concernés est donc celle d'une
 * fenêtre de moins d'une heure sur une fonction que personne ne pouvait
 * atteindre avant — plus ce qui s'écrit tant que `6d8f47f` n'est pas déployé,
 * la production étant restée quelque temps sur le câblage sans les phrases.
 * Ces tours se rendent en UNE phrase sans pastille : leur texte reste lisible
 * en entier, et le produit n'affirme sur lui rien qu'il ne puisse prouver.
 *
 * ⚠️ UN TABLEAU DE PHRASES VIDE SE LIT COMME UNE ABSENCE, jamais comme un tour
 * sans aucune phrase. Le tour se rend alors sur son texte — ce qui est le cas
 * des tours du gérant et des refus, qui n'ont jamais été découpés en phrases
 * sourcées et n'en portent donc aucune.
 *
 * ⚠️ `texte` EST FACULTATIF PARCE QUE LA REQUÊTE NE L'ENVOIE PLUS POUR RIEN.
 * `filDuDossier` ne transporte le texte recollé que lorsque `phrases` ne le
 * porte pas déjà ; les deux ensemble faisaient traverser le réseau deux fois
 * le même contenu, à chaque question posée, pour n'en lire qu'une moitié. Les
 * deux absents à la fois ne rendent AUCUNE phrase plutôt qu'une phrase vide :
 * un tour sans texte est un trou, et un trou se voit.
 */
export function relireTour(tour: {
	readonly texte?: string;
	readonly phrases?: readonly PhrasePersistee[];
}): readonly PhraseRelue[] {
	if (tour.phrases !== undefined && tour.phrases.length > 0) {
		return tour.phrases.map((phrase) =>
			phrase.source === undefined
				? sansSource(phrase.texte)
				: { texte: phrase.texte, ...libelleDeLaSource(phrase.source) }
		);
	}
	if (tour.texte === undefined || tour.texte === '') return [];
	return [sansSource(tour.texte)];
}
