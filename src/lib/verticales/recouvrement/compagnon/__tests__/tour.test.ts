import { describe, expect, it } from 'vitest';
import {
	ancresDuContexte,
	lireReponse,
	type ContexteDossier,
	type ReponseCompagnon
} from '../prompt';
import {
	pastillesAPersister,
	phrasesAPersister,
	relireTour,
	type PhrasePersistee,
	type PhraseRelue
} from '../tour';

/**
 * UN TOUR ÉCRIT PUIS RELU REND LES MÊMES PASTILLES SUR LES MÊMES PHRASES.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉFAUT QUE CE FICHIER ATTRAPE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Chaque phrase du compagnon porte SA source : c'est la barrière qui empêche le
 * produit d'affirmer quoi que ce soit qu'il ne peut pas relier à un décompte, à
 * une pièce ou au référentiel. La première écriture recollait pourtant les
 * phrases et n'indexait les pastilles que par RANG, ce qui obligeait la
 * relecture à REDÉCOUPER le texte sur la ponctuation pour retrouver ces rangs.
 *
 * Trois formes très ordinaires mettaient ce redécoupage en défaut, et la
 * dernière est la pire :
 *
 *   · une phrase sans point final se recollait à la suivante — le tour entier
 *     se rendait alors en une phrase sans aucune pastille, ce qui est une
 *     perte, mais une perte honnête ;
 *   · une abréviation (« art. D441-5 ») coupait une phrase en deux — et chaque
 *     pastille glissait d'un cran. La source du décompte se posait sur la
 *     phrase du référentiel, et la phrase qui portait le MONTANT se rendait
 *     « non sourcé » ;
 *   · et, avec DEUX phrases seulement, une phrase finale NON SOURCÉE recollée
 *     à la précédente laissait le compte exact. Le garde-fou ne tombait pas et
 *     la pastille du décompte recouvrait l'aveu d'ignorance du compagnon : le
 *     produit présentait comme sourcée la phrase qu'il avait explicitement
 *     laissée sans source. C'est le contraire exact de ce qu'il vend.
 *
 * Ces tests tiennent les deux bouts : ce que l'écriture enregistre se relit à
 * l'identique, et ce qui arrive SANS ses phrases ne reçoit AUCUNE pastille —
 * le redécoupage a été retiré, parce qu'aucun comptage ne peut prouver qu'une
 * pastille tombe sur la phrase qu'elle source.
 */

const CONTEXTE: ContexteDossier = {
	debiteur: 'Fournitures Durand',
	faits: ['Deux factures rattachées.'],
	pieces: [{ id: 'piece_1', libelle: 'bon de livraison BL-77' }],
	decomptes: [{ id: 'decompte_1', arreteAu: null, total: '120,00 €', segments: ['un segment'] }],
	valeurs: [
		{
			cle: 'indemniteForfaitaire',
			source: 'article D441-5 du code de commerce',
			verifieLe: '2026-01-04',
			verifie: true,
			valideParAvocat: false
		}
	],
	hypotheses: [],
	anglesMorts: [],
	echanges: []
};

/**
 * ⚠️ LA PREMIÈRE PHRASE PORTE UNE ABRÉVIATION, ET CE N'EST PAS DÉCORATIF.
 * « art. » se termine par un point suivi d'un espace : c'est la forme exacte
 * qui trompe un découpage sur la ponctuation, et le compagnon l'écrit dès qu'il
 * cite le texte que le référentiel lui donne.
 */
const REPONSE_DU_MODELE: ReponseCompagnon = {
	phrases: [
		{
			texte: 'L’indemnité forfaitaire est due au titre de l’art. D441-5 du code de commerce.',
			genreSource: 'PARAMETRE',
			reference: 'indemniteForfaitaire'
		},
		{
			texte: 'Le décompte du jour l’arrête à 120,00 €.',
			genreSource: 'DECOMPTE',
			reference: 'decompte_1'
		},
		{
			texte: 'Je n’ai pas pu lire à quelle page du contrat cette clause figure.',
			genreSource: 'AUCUNE',
			reference: ''
		}
	]
};

/**
 * Ce que la mutation écrit, et ce que la requête relit — sans la base.
 *
 * ⚠️ LE TEXTE RECOLLÉ N'EST PAS TRANSMIS QUAND LES PHRASES LE SONT, exactement
 * comme `filDuDossier` : le contenu ne traverse le réseau qu'une fois. Et les
 * pastilles ne sont plus transmises du tout — `relireTour` ne les accepte même
 * plus, ce qui rend le décalage impossible à écrire plutôt qu'improbable.
 */
function ecrireEtRelire(reponse: ReponseCompagnon): readonly PhraseRelue[] {
	const { phrases } = lireReponse(reponse, ancresDuContexte(CONTEXTE));
	return relireTour({ phrases: phrasesAPersister(phrases) });
}

describe('un tour du compagnon, écrit puis relu', () => {
	it('rend les mêmes phrases, aux mêmes sources', () => {
		const relues = ecrireEtRelire(REPONSE_DU_MODELE);

		expect(relues).toEqual([
			{
				texte: 'L’indemnité forfaitaire est due au titre de l’art. D441-5 du code de commerce.',
				genreSource: 'PARAMETRE',
				libelleSource: 'indemniteForfaitaire'
			},
			{
				texte: 'Le décompte du jour l’arrête à 120,00 €.',
				genreSource: 'DECOMPTE',
				libelleSource: 'décompte du dossier'
			},
			{
				texte: 'Je n’ai pas pu lire à quelle page du contrat cette clause figure.',
				genreSource: 'AUCUNE',
				libelleSource: ''
			}
		]);
	});

	it('ne perd pas ses pastilles sur une phrase sans point final', () => {
		// ⚠️ LE MODÈLE REND PARFOIS UNE DERNIÈRE PHRASE NON PONCTUÉE. Recollée à
		// la suivante par le redécoupage, elle faisait tomber les pastilles du
		// tour ENTIER — la barrière sautait sur un défaut de ponctuation.
		const relues = ecrireEtRelire({
			phrases: [
				{
					texte: 'Le taux retenu est celui du semestre en cours',
					genreSource: 'PARAMETRE',
					reference: 'indemniteForfaitaire'
				},
				{
					texte: 'Le décompte du jour l’arrête à 120,00 €.',
					genreSource: 'DECOMPTE',
					reference: 'decompte_1'
				}
			]
		});

		expect(relues.map((phrase) => phrase.genreSource)).toEqual(['PARAMETRE', 'DECOMPTE']);
	});

	it('n’attache jamais une source à la phrase d’à côté', () => {
		// La phrase qui porte le MONTANT doit porter le DÉCOMPTE, et elle seule.
		// C'est le décalage d'un cran que l'abréviation produisait.
		const relues = ecrireEtRelire(REPONSE_DU_MODELE);
		const duMontant = relues.find((phrase) => phrase.texte.includes('120,00 €'));

		expect(duMontant?.genreSource).toBe('DECOMPTE');
	});

	it('écrit encore ses pastilles, que plus personne ne relit', () => {
		// ⚠️ LE CHAMP EST REQUIS AU SCHÉMA, et une table qui porte déjà des
		// documents ne perd pas un champ requis sans casser son déploiement. Il
		// s'écrit donc, au rang de la phrase — et il ne sert plus à la relecture.
		const { phrases } = lireReponse(REPONSE_DU_MODELE, ancresDuContexte(CONTEXTE));

		expect(pastillesAPersister(phrases)).toEqual([
			{ phrase: 0, source: { nature: 'REFERENTIEL', cleParametre: 'indemniteForfaitaire' } },
			{ phrase: 1, source: { nature: 'DECOMPTE', decompteId: 'decompte_1' } }
		]);
	});
});

/**
 * LES TOURS ÉCRITS AVANT QUE LES PHRASES LE SOIENT.
 *
 * ⚠️ ILS SE RENDENT EN UNE PHRASE, SANS PASTILLE, ET C'EST UNE DÉCISION. Le
 * redécoupage sur la ponctuation a été retiré : la donnée écrite — un texte
 * recollé et des rangs — ne détermine pas la partition d'origine, donc aucun
 * comptage ne peut prouver qu'une pastille tombe sur la phrase qu'elle source.
 * Le raisonnement complet est au-dessus de `relireTour`.
 *
 * Les deux formes ci-dessous sont celles que l'ancien garde-fou traitait à
 * l'envers l'une de l'autre. Elles se rendent maintenant pareil, et aucune des
 * deux n'affirme quoi que ce soit.
 */
describe('les tours antérieurs, sans leurs phrases', () => {
	/**
	 * ⚠️ LE CAS QUI FAISAIT MENTIR LE PRODUIT. P0 est sourcée par le décompte et
	 * rendue SANS point final ; P1 est l'aveu d'ignorance, sans aucune source.
	 * `join(' ')` les recolle, le redécoupage n'en retrouvait qu'un morceau, et
	 * `rangMax + 1` valait 1 : le compte tombait juste, le garde-fou ne tombait
	 * pas, et la pastille « décompte du dossier » se posait sur TOUT le texte —
	 * l'aveu compris. La phrase que le produit avait explicitement laissée sans
	 * source était présentée au gérant comme sourcée par son décompte.
	 */
	const SANS_POINT_FINAL =
		'Le décompte du jour l’arrête à 120,00 € ' +
		'Je n’ai pas pu lire à quelle page du contrat cette clause figure.';

	/**
	 * ⚠️ ET LE CAS QUE L'ANCIEN GARDE-FOU ABANDONNAIT À TORT. Deux phrases bien
	 * ponctuées, la seconde sans source : deux morceaux contre `rangMax + 1`
	 * qui vaut 1, donc toutes les pastilles du tour tombaient. Une phrase finale
	 * non sourcée est pourtant la forme la plus ordinaire qui soit.
	 */
	const AVEC_POINT_FINAL =
		'Le décompte du jour l’arrête à 120,00 €. ' +
		'Je n’ai pas pu lire à quelle page du contrat cette clause figure.';

	/** ⚠️ L'ABRÉVIATION, qui faisait glisser chaque pastille d'un cran. */
	const AVEC_ABREVIATION =
		'L’indemnité forfaitaire est due au titre de l’art. D441-5 du code de commerce. ' +
		'Le décompte du jour l’arrête à 120,00 €.';

	it.each([
		['une phrase sans point final', SANS_POINT_FINAL],
		['une phrase finale non sourcée', AVEC_POINT_FINAL],
		['une abréviation au milieu', AVEC_ABREVIATION],
		['une phrase seule', 'Le décompte du jour l’arrête à 120,00 €.']
	])('rend le tour entier en une phrase sans source — %s', (_forme, texte) => {
		expect(relireTour({ texte })).toEqual([
			{ texte, genreSource: 'AUCUNE', libelleSource: '' }
		]);
	});

	it('n’attribue jamais une source à la phrase que le produit a laissée sans source', () => {
		// Le constat, énoncé comme une invariante plutôt que comme une forme :
		// aucun tour relu sans ses phrases ne porte de source, quelle qu'elle soit.
		for (const texte of [SANS_POINT_FINAL, AVEC_POINT_FINAL, AVEC_ABREVIATION]) {
			const relues = relireTour({ texte });
			expect(relues.every((phrase) => phrase.genreSource === 'AUCUNE')).toBe(true);
			expect(relues.map((phrase) => phrase.texte).join('')).toBe(texte);
		}
	});

	it('se reprend sur un tableau de phrases vide, qui n’est pas un tour sans phrase', () => {
		// Un tour du gérant et un refus n'ont jamais été découpés en phrases
		// sourcées : ils n'en portent aucune, et se rendent sur leur texte.
		const vide: readonly PhrasePersistee[] = [];
		const relues = relireTour({ texte: 'Combien reste-t-il dû ?', phrases: vide });

		expect(relues).toEqual([
			{ texte: 'Combien reste-t-il dû ?', genreSource: 'AUCUNE', libelleSource: '' }
		]);
	});
});

/**
 * CE QUE LA REQUÊTE TRANSPORTE, ET CE QU'ELLE NE TRANSPORTE PLUS.
 *
 * `filDuDossier` n'envoie `texte` que lorsque `phrases` ne porte pas déjà le
 * contenu : les deux ensemble faisaient traverser le réseau deux fois le même
 * texte, à chaque question posée, pour n'en lire qu'une moitié.
 */
describe('un tour reçu sans son texte recollé', () => {
	it('se relit entièrement sur ses phrases', () => {
		const relues = relireTour({
			phrases: [
				{
					texte: 'Le décompte du jour l’arrête à 120,00 €.',
					source: { nature: 'DECOMPTE', decompteId: 'decompte_1' }
				},
				{ texte: 'Je n’ai pas pu lire à quelle page cette clause figure.' }
			]
		});

		expect(relues).toEqual([
			{
				texte: 'Le décompte du jour l’arrête à 120,00 €.',
				genreSource: 'DECOMPTE',
				libelleSource: 'décompte du dossier'
			},
			{
				texte: 'Je n’ai pas pu lire à quelle page cette clause figure.',
				genreSource: 'AUCUNE',
				libelleSource: ''
			}
		]);
	});

	it('ne rend AUCUNE phrase quand il n’a ni texte ni phrases', () => {
		// Un trou se voit. Rendre une phrase vide le masquerait derrière une
		// bulle sans contenu, et personne ne saurait que le tour manque.
		expect(relireTour({})).toEqual([]);
	});
});
