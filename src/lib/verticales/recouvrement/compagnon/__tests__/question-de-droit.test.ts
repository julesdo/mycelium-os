import { describe, it, expect } from 'vitest';
import {
	VERDICTS_INTERDITS,
	estQuestionDeDroit,
	reponseAQuestionDeDroit
} from '../question-de-droit';
import { RefusDeRendu, filtrerAvantRendu } from '../filtres';
import { PARAMETRES } from '../../parametres';

describe('les questions de droit', () => {
	it('se reconnaissent, et les questions de faits passent', () => {
		expect(estQuestionDeDroit('Puis-je encore le poursuivre ?')).toBe(true);
		expect(estQuestionDeDroit('Est-ce que ma créance est prescrite ?')).toBe(true);
		expect(estQuestionDeDroit('Ai-je le droit de réclamer les 40 € ?')).toBe(true);
		expect(estQuestionDeDroit('Quelle procédure dois-je lancer ?')).toBe(true);
		expect(estQuestionDeDroit('Combien de pénalités ont couru depuis mars ?')).toBe(false);
		expect(estQuestionDeDroit('Quelles factures sont dans ce dossier ?')).toBe(false);
	});

	it('répondent par les textes du référentiel, puis par la main à l’avocat', () => {
		const phrases = reponseAQuestionDeDroit('Est-ce que ma créance est prescrite ?');
		const textes = phrases.map((p) => p.texte).join(' ');
		expect(textes).toContain(PARAMETRES.delaiPrescriptionCommerciale.source);
		expect(textes).toMatch(/un avocat peut vous le dire/);
		expect(
			phrases.some(
				(p) => p.genreSource === 'PARAMETRE' && p.reference === 'delaiPrescriptionCommerciale'
			)
		).toBe(true);
	});

	it('ne rendent jamais un verdict', () => {
		for (const question of [
			'Puis-je lancer une injonction de payer ?',
			'Ai-je droit aux frais de recouvrement ?',
			'Faut-il envoyer une mise en demeure ?',
			'Que dois-je faire, il est en redressement ?',
			'Puis-je refuser un paiement partiel ?'
		]) {
			const textes = reponseAQuestionDeDroit(question)
				.map((p) => p.texte)
				.join(' ');
			for (const verdict of VERDICTS_INTERDITS) expect(textes, question).not.toMatch(verdict);
		}
	});
});

describe('le filtre des verdicts, avant rendu', () => {
	it('retient une réponse qui dit qu’une condition est remplie', () => {
		expect(() =>
			filtrerAvantRendu({ texte: 'La condition d’exigibilité est remplie.', pastilles: [] })
		).toThrow(RefusDeRendu);
		expect(() =>
			filtrerAvantRendu({ texte: 'Vous devriez attendre la fin du mois.', pastilles: [] })
		).toThrow(RefusDeRendu);
	});

	it('laisse passer un constat sur les faits', () => {
		expect(() =>
			filtrerAvantRendu({ texte: 'Le dossier compte deux factures.', pastilles: [] })
		).not.toThrow();
	});
});
