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
	type PastillePersistee,
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
 * Deux cas très ordinaires le mettaient en défaut, et le second est le pire :
 *
 *   · une phrase sans point final se recollait à la suivante — le tour entier
 *     se rendait alors en une phrase sans aucune pastille, ce qui est une
 *     perte, mais une perte honnête ;
 *   · une abréviation (« art. D441-5 ») coupait une phrase en deux — et chaque
 *     pastille glissait d'un cran. La source du décompte se posait sur la
 *     phrase du référentiel, et la phrase qui portait le MONTANT se rendait
 *     « non sourcé ». C'est exactement ce que les pastilles existent pour
 *     empêcher, et le garde-fou d'alors annonçait l'empêcher.
 *
 * Ces tests tiennent les deux bouts : ce que l'écriture enregistre se relit à
 * l'identique, et ce qui arrive SANS ses phrases ne reçoit jamais une pastille
 * qu'on ne peut pas prouver.
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

/** Ce que la mutation écrit, et ce que la requête relit — sans la base. */
function ecrireEtRelire(reponse: ReponseCompagnon): readonly PhraseRelue[] {
	const { sortie, phrases } = lireReponse(reponse, ancresDuContexte(CONTEXTE));
	return relireTour({
		texte: sortie.texte,
		pastilles: pastillesAPersister(phrases),
		phrases: phrasesAPersister(phrases)
	});
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
});

/**
 * LE REPLI, POUR LES TOURS ÉCRITS AVANT QUE LES PHRASES LE SOIENT.
 *
 * ⚠️ IL RESTE, ET IL RESTE HONNÊTE. Ce qui arrive sans ses phrases se relit par
 * l'ancien chemin : le redécoupage quand il est PROUVABLE, et rien du tout
 * sinon. Une source absente se voit ; une source fausse a l'air d'une source.
 */
describe('le repli des tours antérieurs', () => {
	const ANCIEN = {
		texte:
			'L’indemnité forfaitaire est due au titre de l’art. D441-5 du code de commerce. ' +
			'Le décompte du jour l’arrête à 120,00 €.',
		pastilles: [
			{ phrase: 0, source: { nature: 'REFERENTIEL', cleParametre: 'indemniteForfaitaire' } },
			{ phrase: 1, source: { nature: 'DECOMPTE', decompteId: 'decompte_1' } }
		] as readonly PastillePersistee[]
	};

	it('abandonne toutes les pastilles plutôt que d’en décaler une', () => {
		const relues = relireTour(ANCIEN);

		expect(relues).toHaveLength(1);
		expect(relues[0]!.genreSource).toBe('AUCUNE');
		expect(relues[0]!.texte).toBe(ANCIEN.texte);
	});

	it('rend encore ses pastilles quand le découpage est prouvable', () => {
		const relues = relireTour({
			texte: 'J’ai relevé deux factures. Le décompte du jour l’arrête à 120,00 €.',
			pastilles: [{ phrase: 1, source: { nature: 'DECOMPTE', decompteId: 'decompte_1' } }]
		});

		expect(relues.map((phrase) => phrase.genreSource)).toEqual(['AUCUNE', 'DECOMPTE']);
	});

	it('se reprend sur un tableau de phrases vide, qui n’est pas un tour sans phrase', () => {
		// Un tour du gérant et un refus n'ont jamais été découpés en phrases
		// sourcées : ils n'en portent aucune, et se rendent sur leur texte.
		const vide: readonly PhrasePersistee[] = [];
		const relues = relireTour({ texte: 'Combien reste-t-il dû ?', pastilles: [], phrases: vide });

		expect(relues).toEqual([
			{ texte: 'Combien reste-t-il dû ?', genreSource: 'AUCUNE', libelleSource: '' }
		]);
	});
});
