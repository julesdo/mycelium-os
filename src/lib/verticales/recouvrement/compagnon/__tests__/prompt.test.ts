import { describe, expect, it } from 'vitest';
import {
	AncreInconnue,
	ancresDuContexte,
	construireContexteDossier,
	construirePromptCompagnon,
	lireReponse,
	type ContexteDossier
} from '../prompt';

/**
 * LE VERROU D'EMPREINTE DU PROMPT DU COMPAGNON.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE TEST EXISTE, ALORS QUE RIEN D'AUTRE NE TOMBERAIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le prompt part avec `cache_control: ephemeral`, et le cache Claude ne sert
 * QUE sur un préfixe identique à l'octet. Un reformatage innocent — une date
 * glissée dans le texte, un identifiant interpolé, une reformulation — ne casse
 * rien, ne fait échouer aucune requête, et multiplie le coût par question.
 *
 * C'est exactement le mode de panne que ce dépôt traque : rien ne se signale.
 * Le même verrou existe déjà sur le prompt d'extraction
 * (`import/__tests__/preuve.test.ts`), et pour la même raison.
 *
 * La seconde moitié du fichier tient l'autre invariante que la conversation
 * introduit : une pastille qui cite une source qu'on ne lui a pas envoyée fait
 * tomber la réponse ENTIÈRE. Sans elle, un identifiant de décompte inventé
 * ancrerait un montant inventé, et `filtrerMontants` le laisserait passer en
 * trouvant la pastille couvrante.
 */

describe('le prompt du compagnon', () => {
	it('est déterministe, à l’octet', () => {
		expect(construirePromptCompagnon()).toBe(construirePromptCompagnon());
	});

	it('dépasse le minimum cacheable', () => {
		expect(construirePromptCompagnon().length).toBeGreaterThan(2000);
	});

	it('ne contient aucune date, qui invaliderait le cache', () => {
		expect(construirePromptCompagnon()).not.toMatch(/\d{4}-\d{2}-\d{2}/);
		expect(construirePromptCompagnon()).not.toMatch(/\b(19|20)\d{2}\b/);
	});

	it('ne porte aucune interpolation', () => {
		// Un `${…}` dans le préfixe est la forme la plus discrète du défaut : le
		// texte se lit comme figé et change à chaque appel.
		expect(construirePromptCompagnon()).not.toContain('${');
	});

	it('nomme les quatre genres de source que la réponse doit porter', () => {
		const prompt = construirePromptCompagnon();
		for (const genre of ['PARAMETRE', 'DECOMPTE', 'PIECE', 'AUCUNE']) {
			expect(prompt).toContain(genre);
		}
	});

	it('interdit de dire le droit sans source, et de classer une voie', () => {
		const prompt = construirePromptCompagnon();
		expect(prompt).toMatch(/jamais.{0,40}(fabriques|référence)/i);
		expect(prompt).toMatch(/conseil juridique/i);
	});
});

const CONTEXTE: ContexteDossier = {
	debiteur: 'Fournitures Durand',
	faits: ['Trois factures rattachées.'],
	pieces: [{ id: 'piece_1', libelle: 'bon de livraison BL-77' }],
	decomptes: [
		{ id: 'decompte_1', arreteAu: null, total: '12 480,33 €', segments: ['un segment'] }
	],
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

describe('le contexte du dossier', () => {
	it('porte la question APRÈS tout le dossier', () => {
		const texte = construireContexteDossier(CONTEXTE, 'Que reste-t-il dû ?');
		expect(texte.indexOf('Fournitures Durand')).toBeLessThan(texte.indexOf('Que reste-t-il dû ?'));
	});

	it('donne les identifiants à recopier, et pas seulement les libellés', () => {
		const texte = construireContexteDossier(CONTEXTE, 'Combien ?');
		expect(texte).toContain('piece_1');
		expect(texte).toContain('decompte_1');
		expect(texte).toContain('indemniteForfaitaire');
	});
});

describe('la lecture de la réponse', () => {
	const ancres = ancresDuContexte(CONTEXTE);

	it('rend une pastille par phrase sourcée, dont l’extrait est le texte exact', () => {
		const { sortie, phrases } = lireReponse(
			{
				phrases: [
					{ texte: 'J’ai relevé trois factures.', genreSource: 'AUCUNE', reference: '' },
					{ texte: 'Le total est de 12 480,33 €.', genreSource: 'DECOMPTE', reference: 'decompte_1' }
				]
			},
			ancres
		);

		expect(phrases).toHaveLength(2);
		expect(sortie.pastilles).toHaveLength(1);
		expect(sortie.texte).toContain(sortie.pastilles[0]!.extrait);
	});

	it('fait tomber la réponse entière sur un décompte que le dossier ne porte pas', () => {
		// ⚠️ C'EST LE CAS DANGEREUX. Sans cette vérification, la pastille serait
		// COUVRANTE au sens de `filtres.ts` : B4 la trouverait, et rendrait un
		// montant qu'aucun décompte ne porte.
		expect(() =>
			lireReponse(
				{
					phrases: [
						{ texte: 'Le total est de 99 999,00 €.', genreSource: 'DECOMPTE', reference: 'inventé' }
					]
				},
				ancres
			)
		).toThrow(AncreInconnue);
	});

	it('nomme la référence trouvée, et rend un refus en quatre parties', () => {
		try {
			lireReponse(
				{ phrases: [{ texte: 'Selon la pièce.', genreSource: 'PIECE', reference: 'piece_404' }] },
				ancres
			);
			expect.unreachable('la lecture devait lever');
		} catch (erreur) {
			expect(erreur).toBeInstanceOf(AncreInconnue);
			const levee = erreur as AncreInconnue;
			expect(levee.reference).toBe('piece_404');
			expect(levee.refus.peutFaire.trim()).not.toBe('');
			expect(levee.refus.constat).toContain('piece_404');
			expect(levee.refus.coutDeLAttente.trim()).not.toBe('');
		}
	});

	it('retombe sur « non sourcé » quand la référence est vide, sans lever', () => {
		// Une phrase sans pastille a le droit d'exister : elle s'affiche dégradée.
		// Ce sont le MONTANT et l'ÉNONCÉ JURIDIQUE que les filtres lui interdisent.
		const { phrases } = lireReponse(
			{ phrases: [{ texte: 'Je n’ai pas pu lire ce document.', genreSource: 'PIECE', reference: '' }] },
			ancres
		);
		expect(phrases[0]!.genreSource).toBe('AUCUNE');
	});
});
