import { z } from 'zod';
import { composerRefus, type Refus } from './refus';
import type { Pastille, SortieCompagnon } from './filtres';

/**
 * LE PROMPT SYSTÈME DU COMPAGNON, SON CONTEXTE DE DOSSIER, ET CE QU'IL REND.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE VERROU D'EMPREINTE : LE PRÉFIXE EST FIGÉ, À L'OCTET
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le prompt part en tête, dans le bloc système, avec `cache_control:
 * ephemeral`, et le cache Claude ne sert QUE sur un préfixe identique à
 * l'octet. Le contexte du dossier — qui change à chaque question — reste
 * APRÈS le point de coupure, dans `messages`.
 *
 * Aucune date, aucun identifiant, aucune interpolation ne doit entrer dans ce
 * texte : un reformatage innocent multiplie le coût par question sans qu'aucun
 * autre test ne tombe. C'est la même discipline que le prompt d'extraction
 * (`import/preuve.ts`), et elle porte le même genre de test.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL N'IMPORTE AUCUN MODULE DE PAYS (B15)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il reçoit des FAITS DÉJÀ RÉSOLUS — la clé, sa source, sa date de relevé et
 * ses deux booléens — et n'en résout aucun lui-même. Le pays est aujourd'hui
 * choisi par un chemin d'import, à dix-huit endroits du dépôt ; un compagnon
 * qui deviendrait le dix-neuvième serait un compagnon à réécrire phrase par
 * phrase le jour d'un second pays. `socle/__tests__/frontiere.test.ts` balaie
 * déjà ce dossier.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE GRAIN DE LA SOURCE EST LA PHRASE, JAMAIS LA RÉPONSE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le modèle ne rend pas un paragraphe : il rend une SUITE DE PHRASES, chacune
 * avec sa source. Une source posée sur la réponse entière laisserait passer la
 * phrase fausse au milieu de trois justes — et c'est celle-là que le gérant
 * recopierait dans un courrier.
 *
 * ⚠️ ET UNE RÉFÉRENCE QUE LE CONTEXTE NE PORTE PAS FAIT TOMBER LA RÉPONSE
 * ENTIÈRE. Sans cette vérification, un identifiant de décompte inventé ancrerait
 * un montant inventé : `filtrerMontants` verrait une pastille, la trouverait
 * couvrante, et rendrait le chiffre. L'ancre se vérifie donc ici, au point où
 * la réponse se lit, contre les identifiants qu'on a nous-mêmes envoyés.
 */

/**
 * Le préfixe figé. Aucune interpolation, aucune date, aucun exemple daté.
 *
 * ⚠️ IL NE NOMME PAS LE LEXIQUE DE LA PROMESSE, IL LE DÉCRIT. Ce fichier vit
 * sous `src/lib/verticales/`, que `ui/__tests__/lignes-rouges.test.ts` balaie :
 * écrire le radical interdit dans une chaîne rendrait rouge la barrière que ce
 * texte sert. Le filtre B2, lui, le reconnaît sur la sortie du modèle.
 */
export function construirePromptCompagnon(): string {
	return `Tu es le compagnon d'un logiciel français de recouvrement de créances entre
entreprises. Tu réponds à la question d'un dirigeant sur SON dossier, à partir
du seul contexte qui t'est fourni après ces consignes.

CE QUE TU RENDS
Une suite de PHRASES. Chaque phrase porte sa source, et une seule :
- PARAMETRE : la phrase s'appuie sur une entrée du référentiel juridique du
  logiciel. « reference » porte la clé de l'entrée, recopiée à l'identique
  depuis le contexte.
- DECOMPTE : la phrase s'appuie sur un décompte du dossier. « reference » porte
  l'identifiant du décompte, recopié à l'identique.
- PIECE : la phrase s'appuie sur une pièce du dossier. « reference » porte
  l'identifiant de la pièce, recopié à l'identique.
- AUCUNE : la phrase ne s'appuie sur rien de tout cela. « reference » reste vide,
  et la phrase s'affichera visiblement dégradée, marquée comme non sourcée.

TU NE FABRIQUES JAMAIS UNE RÉFÉRENCE. Une clé, un identifiant de décompte ou de
pièce qui ne figure pas mot pour mot dans le contexte fait rejeter la réponse
ENTIÈRE, et le dirigeant lit un refus à la place. Si tu n'as pas la source sous
les yeux, la phrase est AUCUNE, ou elle ne s'écrit pas.

LES TROIS PHRASES QUI NE PEUVENT PAS ÊTRE « AUCUNE »
1. Toute phrase qui porte un MONTANT en euros. Un montant qu'aucun décompte ni
   aucune pièce ne porte est un chiffre qu'on demande de croire : il ne se
   refait pas à la main, et c'est exactement ce que fera le débiteur qui le
   conteste.
2. Toute phrase qui AFFIRME UNE RÈGLE DE DROIT — un délai, une prescription, un
   taux, une indemnité, une qualité, une condition d'exigibilité, un effet de
   droit —, qu'elle cite un article ou non. « Ce type de créance se prescrit par
   cinq ans » est une affirmation de droit sans source : elle n'a même pas l'air
   d'une citation qu'on irait vérifier, et elle est fausse dès que la créance
   relève d'un autre secteur.
3. Toute phrase qui cite un article, un code ou un texte. Tu ne dis jamais le
   droit de mémoire, même juste : une phrase juste sans source ne se vérifie
   pas, et ne se corrige pas le jour où la valeur change.

CE QUE TU N'ÉCRIS JAMAIS
- Une voie d'action à emprunter, son nom, son classement, son ordre de
  préférence, ni ce qui serait le plus court ou le plus efficace. Nommer une
  voie ou la classer est du conseil juridique, et ce logiciel n'en donne pas. Tu
  énonces des CONSTATS : ce que le dossier établit, jamais ce qu'on pourrait en
  faire. Sollicité là-dessus, tu le dis, et tu t'arrêtes là.
- Une promesse de résultat, sous aucune forme : ni ce qui rentrera, ni ce qui
  serait acquis d'avance, ni un adjectif de sûreté. Ce logiciel mesure,
  documente et alerte ; la décision d'agir appartient au dirigeant.
- Un courrier au débiteur, une phrase à lui adresser, ou quoi que ce soit qui
  parte au nom du dirigeant. Les brouillons de ce produit sont composés
  ailleurs, sans toi, et restent dans sa boîte.
- Un pourcentage de confiance, une note, un score, une étoile. Ce qui est
  indéterminé se dit « indéterminé », avec la raison et le fait qui manque.
- Ton raisonnement en prose. Ça ressemble à une justification et n'en est pas
  une, parce que ce n'est pas le calcul. Le calcul se déplie dans le décompte.

CE QUE TU DIS QUAND TU NE SAIS PAS, ET C'EST UNE RÉPONSE COMPLÈTE
Quatre temps, dans cet ordre, et jamais moins de quatre : ce que le dossier
permet de faire tout de suite, ce qui manque et son nom, ce qui lèverait le
manque — énoncé au CONSTAT, à la troisième personne, jamais à l'impératif —,
puis ce que l'attente coûte, chiffré quand c'est chiffrable et déclaré non
chiffrable sinon. Un « je ne sais pas » seul est un mur, et un mur est un défaut.

TA VOIX
Celle d'un relevé, à la première personne du logiciel : « j'ai relevé », « je
n'ai pas pu lire ». Pas de salutation, pas d'encouragement, pas de nom, pas de
personnalité. Sur un produit dont la sortie finit devant un tiers, une
personnalité fait entendre une recommandation là où un constat a été écrit.

TA PORTÉE
Le dossier du contexte, et rien d'autre. Une question qui en sort reçoit une
phrase qui le dit, plutôt qu'une réponse construite sur ce que tu crois savoir.
Tu es bref : les phrases utiles, et aucune de plus.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// LE CONTEXTE DU DOSSIER — APRÈS LE POINT DE COUPURE
// ═══════════════════════════════════════════════════════════════════════════

/** Une pièce du dossier, telle que le compagnon a le droit de la citer. */
export interface PieceDuContexte {
	readonly id: string;
	/** Ce qu'elle est, en toutes lettres : « bon de livraison BL-77 ». */
	readonly libelle: string;
}

/**
 * Un décompte du dossier, DÉJÀ RENDU EN TOUTES LETTRES par l'appelant.
 *
 * ⚠️ AUCUN CENTIME NE TRANSITE EN NOMBRE PAR ICI. Les montants sont des entiers
 * de centimes en `bigint` dans tout le produit ; les rendre lisibles est le
 * travail de l'appelant, qui le fait déjà pour l'écran. Refaire la conversion
 * ici ouvrirait un second chemin d'arrondi, et deux surfaces afficheraient deux
 * vérités sur la même somme.
 */
export interface DecompteDuContexte {
	readonly id: string;
	/** `null` quand c'est le calcul du jour, qui n'est pas arrêté. */
	readonly arreteAu: string | null;
	readonly total: string;
	/** Une ligne par segment : base, taux, jours, base annuelle. */
	readonly segments: readonly string[];
}

/**
 * Une valeur du référentiel, DÉJÀ RÉSOLUE (§ 5.9, condition 1).
 *
 * Le compagnon ne résout jamais une SERIE lui-même et ne nomme aucun module de
 * pays : il reçoit la clé, la source, la date du relevé et les deux booléens,
 * et il en fait une phrase et une pastille.
 */
export interface ValeurDuContexte {
	readonly cle: string;
	readonly source: string;
	readonly verifieLe: string;
	readonly verifie: boolean;
	readonly valideParAvocat: boolean;
}

/** Un tour déjà dit dans ce fil, tel qu'il a été RENDU au gérant. */
export interface TourDuContexte {
	readonly role: 'GERANT' | 'COMPAGNON';
	readonly texte: string;
}

/** Tout ce que le compagnon a le droit de voir du dossier, et rien de plus. */
export interface ContexteDossier {
	readonly debiteur: string;
	/** Les constats déjà composés par le domaine, en toutes lettres. */
	readonly faits: readonly string[];
	readonly pieces: readonly PieceDuContexte[];
	readonly decomptes: readonly DecompteDuContexte[];
	readonly valeurs: readonly ValeurDuContexte[];
	/** Ce que le logiciel a supposé, et le fait qui l'a produit. */
	readonly hypotheses: readonly string[];
	/** Ce que le logiciel ne voit pas, chiffré quand c'est chiffrable. */
	readonly anglesMorts: readonly string[];
	/**
	 * Les derniers tours du fil, bornés par l'appelant.
	 *
	 * ⚠️ CE QUI A ÉTÉ RENDU, JAMAIS CE QUE LE MODÈLE AVAIT ÉCRIT. Un tour refusé
	 * au rendu est persisté sous la forme de son REFUS ; réinjecter le texte
	 * retenu ferait rentrer par la fenêtre ce que les filtres ont sorti par la
	 * porte, et la phrase suivante repartirait du même endroit.
	 */
	readonly echanges: readonly TourDuContexte[];
}

function bloc(titre: string, lignes: readonly string[], vide: string): string {
	if (lignes.length === 0) return `${titre}\n${vide}`;
	return `${titre}\n${lignes.map((ligne) => `- ${ligne}`).join('\n')}`;
}

/**
 * Le contexte du dossier et la question, dans le message utilisateur.
 *
 * ⚠️ IL NE PART JAMAIS AVANT LE PROMPT. Placé avant le point de coupure, il
 * réécrirait le cache à chaque question au lieu de le lire — le coût par
 * question passerait de quatre centimes à cinq et demi sans qu'aucun test ne
 * tombe.
 */
export function construireContexteDossier(contexte: ContexteDossier, question: string): string {
	return [
		`DOSSIER : ${contexte.debiteur}`,
		'',
		bloc('CE QUE LE LOGICIEL A RELEVÉ', contexte.faits, 'Rien de relevé sur ce dossier.'),
		'',
		bloc(
			'LES PIÈCES, ET L’IDENTIFIANT À RECOPIER POUR LES CITER',
			contexte.pieces.map((piece) => `${piece.libelle} — identifiant PIECE : ${piece.id}`),
			'Aucune pièce au dossier.'
		),
		'',
		bloc(
			'LES DÉCOMPTES, ET L’IDENTIFIANT À RECOPIER POUR LES CITER',
			contexte.decomptes.flatMap((decompte) => [
				`${decompte.arreteAu === null ? 'Calcul du jour, non arrêté' : `Arrêté au ${decompte.arreteAu}`}, total ${decompte.total} — identifiant DECOMPTE : ${decompte.id}`,
				...decompte.segments.map((segment) => `  segment : ${segment}`)
			]),
			'Aucun décompte sur ce dossier.'
		),
		'',
		bloc(
			'LES VALEURS DU RÉFÉRENTIEL, ET LA CLÉ À RECOPIER POUR LES CITER',
			contexte.valeurs.map(
				(valeur) =>
					`${valeur.source}, relevé le ${valeur.verifieLe}, ` +
					`${valeur.verifie ? 'relevée sur une source publique' : 'non relevée'}, ` +
					`${valeur.valideParAvocat ? 'contrôlée par un juriste' : 'non contrôlée par un juriste'}` +
					` — clé PARAMETRE : ${valeur.cle}`
			),
			'Aucune valeur du référentiel n’entre dans ce dossier.'
		),
		'',
		bloc(
			'CE QUE LE LOGICIEL A SUPPOSÉ',
			contexte.hypotheses,
			'Aucune hypothèse retenue sur ce dossier.'
		),
		'',
		bloc('CE QUE LE LOGICIEL NE VOIT PAS', contexte.anglesMorts, 'Aucun angle mort déclaré.'),
		'',
		bloc(
			'CE QUI A DÉJÀ ÉTÉ DIT DANS CE FIL',
			contexte.echanges.map(
				(tour) => `${tour.role === 'GERANT' ? 'Le dirigeant' : 'Toi'} : ${tour.texte}`
			),
			'Rien : c’est la première question de ce fil.'
		),
		'',
		'QUESTION DU DIRIGEANT',
		question
	].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// CE QUE LE MODÈLE REND, ET COMMENT ON LE LIT
// ═══════════════════════════════════════════════════════════════════════════

export const GENRES_SOURCE = ['PARAMETRE', 'DECOMPTE', 'PIECE', 'AUCUNE'] as const;
export type GenreSource = (typeof GENRES_SOURCE)[number];

/**
 * La forme plate, et c'est délibéré.
 *
 * ⚠️ PAS D'UNION DISCRIMINÉE ICI. Le schéma part en format de sortie structurée
 * au modèle ; une union imbriquée y est nettement plus fragile qu'un couple
 * « genre + référence », et un échec de validation coûte un appel entier
 * facturé pour rien. La discrimination se refait à la lecture, où elle ne coûte
 * rien.
 *
 * ⚠️ ET PAS DE PAGE. Une pastille de pièce porte une page quand une LECTURE l'a
 * relevée ; ici le modèle ne lit pas la pièce, il la cite. Lui demander une page
 * reviendrait à lui demander de l'inventer, et une page inventée a exactement
 * l'air d'une page relevée.
 */
export const reponseCompagnonSchema = z.object({
	phrases: z.array(
		z.object({
			texte: z.string(),
			genreSource: z.enum(GENRES_SOURCE),
			/** La clé ou l'identifiant, recopié du contexte. Vide sur `AUCUNE`. */
			reference: z.string()
		})
	)
});

export type ReponseCompagnon = z.infer<typeof reponseCompagnonSchema>;

/** Une phrase telle qu'elle s'affichera : son texte, et sa source ou rien. */
export interface PhraseSourcee {
	readonly texte: string;
	readonly genreSource: GenreSource;
	readonly reference: string;
}

/** Les identifiants que la réponse a le droit de citer, et aucun autre. */
export interface AncresDuDossier {
	readonly parametres: ReadonlySet<string>;
	readonly decomptes: ReadonlySet<string>;
	readonly pieces: ReadonlySet<string>;
}

export function ancresDuContexte(contexte: ContexteDossier): AncresDuDossier {
	return {
		parametres: new Set(contexte.valeurs.map((valeur) => valeur.cle)),
		decomptes: new Set(contexte.decomptes.map((decompte) => decompte.id)),
		pieces: new Set(contexte.pieces.map((piece) => piece.id))
	};
}

/**
 * Une réponse dont une pastille cite une source qu'on ne lui a pas envoyée.
 *
 * ⚠️ ELLE PORTE UN REFUS, PAS UN MESSAGE. Une exception nue remontée jusqu'à
 * l'écran serait un mur, et B14 en fait un défaut de produit. Elle porte AUSSI
 * la référence trouvée, séparément : la première est faite pour l'écran, la
 * seconde pour qu'on sache quoi relire.
 */
export class AncreInconnue extends Error {
	readonly genre: GenreSource;
	readonly reference: string;
	readonly refus: Refus;

	constructor(genre: GenreSource, reference: string, refus: Refus) {
		super(`Ancre inconnue : ${genre} « ${reference} ». ${refus.constat}`);
		this.name = 'AncreInconnue';
		this.genre = genre;
		this.reference = reference;
		this.refus = refus;
	}
}

function refusAncreInconnue(genre: GenreSource, reference: string): Refus {
	return composerRefus({
		peutFaire:
			'Le dossier reste entièrement lisible et chiffrable sans cette réponse : le décompte ' +
			'et ses segments, les pièces classées, les hypothèses retenues et les échéances ' +
			'surveillées ne dépendent d’aucun texte composé par le compagnon.',
		constat:
			`La réponse retenue s’appuie sur une source que ce dossier ne porte pas : elle cite ` +
			`${genre === 'PARAMETRE' ? 'la clé de référentiel' : genre === 'DECOMPTE' ? 'le décompte' : 'la pièce'} ` +
			`« ${reference} », qui ne figure dans rien de ce qui lui a été transmis.`,
		blocages: [
			'Ce refus se lève par une réponse dont chaque phrase cite une source du dossier, ' +
				'recopiée telle qu’elle lui a été donnée.'
		],
		coutDeLAttente:
			'Ce que cette retenue coûte est chiffrable, et vaut zéro : aucune échéance, aucun ' +
			'délai et aucune somme réclamée ne dépendent de cette réponse.'
	});
}

/**
 * Lit ce que le modèle a rendu : les phrases, et la sortie que les filtres
 * prennent en entrée.
 *
 * ⚠️ LES ANCRES SE VÉRIFIENT AVANT TOUT AUTRE FILTRE, et l'ordre compte. Une
 * pastille dont l'identifiant est inventé est COUVRANTE au sens de `filtres.ts`
 * : elle ferait passer un montant que rien ne porte, en satisfaisant B4 au lieu
 * de le déclencher. Le doute ne profite jamais au produit.
 *
 * ⚠️ ET LE TEXTE EST LA CONCATÉNATION EXACTE DES PHRASES. `filtres.ts` retrouve
 * chaque pastille dans le texte par son extrait, mot pour mot : reformater, ré-
 * espacer ou ponctuer entre les phrases ferait tomber toutes les pastilles d'un
 * coup, et la réponse entière serait refusée pour une raison fausse.
 */
export function lireReponse(
	reponse: ReponseCompagnon,
	ancres: AncresDuDossier
): { readonly sortie: SortieCompagnon; readonly phrases: readonly PhraseSourcee[] } {
	const phrases: PhraseSourcee[] = [];
	const pastilles: Pastille[] = [];

	for (const brute of reponse.phrases) {
		const texte = brute.texte.trim();
		if (texte === '') continue;

		const reference = brute.reference.trim();
		const genreSource = reference === '' ? 'AUCUNE' : brute.genreSource;

		phrases.push({ texte, genreSource, reference: genreSource === 'AUCUNE' ? '' : reference });

		if (genreSource === 'PARAMETRE') {
			if (!ancres.parametres.has(reference)) {
				throw new AncreInconnue(
					genreSource,
					reference,
					refusAncreInconnue(genreSource, reference)
				);
			}
			pastilles.push({ genre: 'PARAMETRE', extrait: texte, cle: reference });
		} else if (genreSource === 'DECOMPTE') {
			if (!ancres.decomptes.has(reference)) {
				throw new AncreInconnue(
					genreSource,
					reference,
					refusAncreInconnue(genreSource, reference)
				);
			}
			pastilles.push({ genre: 'DECOMPTE', extrait: texte, decompteId: reference });
		} else if (genreSource === 'PIECE') {
			if (!ancres.pieces.has(reference)) {
				throw new AncreInconnue(
					genreSource,
					reference,
					refusAncreInconnue(genreSource, reference)
				);
			}
			pastilles.push({ genre: 'PIECE', extrait: texte, pieceId: reference });
		}
	}

	return { sortie: { texte: phrases.map((p) => p.texte).join(' '), pastilles }, phrases };
}
