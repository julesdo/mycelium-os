import { describe, expect, it } from 'vitest';
import { trierLesPhrases } from '../tri';

/**
 * UNE PHRASE QUI NE PASSE PAS NE FAIT PLUS TOMBER LA RÉPONSE ENTIÈRE — et elle
 * n'est toujours pas rendue.
 */
describe('le tri des phrases de Plume', () => {
	it('retient la phrase qui affirme une règle sans source, et garde les autres', () => {
		const { gardees, retenues } = trierLesPhrases([
			{ texte: 'Le rappel part mardi, à votre nom.', genreSource: 'AUCUNE', reference: '' },
			{ texte: 'Votre client est commerçant.', genreSource: 'AUCUNE', reference: '' },
			{ texte: 'Son adresse e-mail est connue.', genreSource: 'AUCUNE', reference: '' }
		]);
		expect(gardees.map((p) => p.texte)).toEqual([
			'Le rappel part mardi, à votre nom.',
			'Son adresse e-mail est connue.'
		]);
		expect(retenues).toHaveLength(1);
		expect(retenues[0]?.barriere).toBe('B3');
	});

	it('retient un montant que rien ne source', () => {
		const { gardees } = trierLesPhrases([
			{ texte: 'Il vous doit 1 200,00 €.', genreSource: 'AUCUNE', reference: '' }
		]);
		expect(gardees).toEqual([]);
	});
});
