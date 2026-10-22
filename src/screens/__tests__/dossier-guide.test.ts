import { describe, expect, it } from 'vitest';
import {
	intentionsDuDossier,
	libelleDIntention,
	type DossierPourLesIntentions
} from '../dossier-guide/intentions';

/**
 * LA CONVERSATION DU DOSSIER PROPOSE CE QUI A UN SENS, ET NE RECOMMANDE RIEN
 * (22/10/2026, `docs/superpowers/specs/2026-10-22-dossier-guide.md`).
 */

const EN_COURS: DossierPourLesIntentions = {
	classe: false,
	regle: false,
	auTribunal: false,
	relancesSuspendues: false,
	questionsEnAttente: 0,
	classable: true,
	plumeJoignable: true
};

/** Les mots d'une voie de droit, les mêmes que `page-dossier.test.ts`. */
const VOIES_DE_DROIT =
	/injonction|assignation|référé|saisie|commandement|huissier|commissaire de justice|procédure/i;

describe('« Que voulez-vous faire ? »', () => {
	it('propose tout un dossier en cours, dans l’ordre d’un dossier', () => {
		expect(intentionsDuDossier(EN_COURS)).toEqual([
			'ECRIRE',
			'REPONSE',
			'DOCUMENT',
			'RAPPEL',
			'CONSEIL',
			'CLASSER',
			'PLUME'
		]);
	});

	it('pose les questions du gérant seulement quand il en reste', () => {
		expect(intentionsDuDossier({ ...EN_COURS, questionsEnAttente: 3 })).toContain('QUESTIONS');
		expect(libelleDIntention('QUESTIONS', { ...EN_COURS, questionsEnAttente: 3 }).ligne).toBe(
			'3 faits que vous seul pouvez dire'
		);
	});

	it('ne propose plus que de joindre un document et de parler à Plume sur un dossier classé', () => {
		expect(intentionsDuDossier({ ...EN_COURS, classe: true })).toEqual(['DOCUMENT', 'PLUME']);
	});

	it('ne demande pas ce qu’il a répondu quand tout est payé', () => {
		const regle = intentionsDuDossier({ ...EN_COURS, regle: true });
		expect(regle).not.toContain('REPONSE');
		expect(regle).not.toContain('CONSEIL');
		expect(libelleDIntention('ECRIRE', { ...EN_COURS, regle: true }).titre).toBe('Lui écrire');
	});

	it('ne parle pas de relancer un client que la loi protège', () => {
		expect(libelleDIntention('ECRIRE', { ...EN_COURS, relancesSuspendues: true }).titre).toBe(
			'Préparer un courrier'
		);
	});

	it('ne nomme jamais une voie de droit (ligne rouge n° 3)', () => {
		const toutes = [
			'ECRIRE',
			'REPONSE',
			'QUESTIONS',
			'DOCUMENT',
			'RAPPEL',
			'CONSEIL',
			'CLASSER',
			'PLUME'
		] as const;
		const fautifs = toutes.flatMap((intention) =>
			[false, true].flatMap((suspendues) => {
				const { titre, ligne } = libelleDIntention(intention, {
					...EN_COURS,
					relancesSuspendues: suspendues,
					questionsEnAttente: 2
				});
				return [titre, ligne].filter((texte) => VOIES_DE_DROIT.test(texte));
			})
		);
		expect(fautifs).toEqual([]);
	});
});
