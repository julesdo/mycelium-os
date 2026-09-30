import { describe, it, expect } from 'vitest';
import {
	QUESTIONS_PAR_ETAPE,
	etapeDuDossier,
	lireEtapes,
	type FaitsDuDossierPourEtape
} from '../etapes-dossier';
import { estQuestionDeDroit } from '../compagnon/question-de-droit';

function faits(surcharge: Partial<FaitsDuDossierPourEtape> = {}): FaitsDuDossierPourEtape {
	return {
		nombreFactures: 2,
		resteDuCentimes: 500_000n,
		lettresValidees: [],
		professionnelDesigne: false,
		procedureEngageeLe: null,
		classe: false,
		dateLimiteAgir: '2030-01-15',
		aujourdHui: '2026-09-25',
		...surcharge
	};
}

describe('les quatre étapes d’un dossier', () => {
	it('se déduisent des faits, dans l’ordre', () => {
		expect(etapeDuDossier(faits())).toBe('PRET');
		expect(etapeDuDossier(faits({ lettresValidees: ['2026-09-12'] }))).toBe('ON_LUI_ECRIT');
		expect(etapeDuDossier(faits({ professionnelDesigne: true }))).toBe('TRIBUNAL');
		expect(etapeDuDossier(faits({ resteDuCentimes: 0n, professionnelDesigne: true }))).toBe(
			'REGLE'
		);
	});

	it('marque les étapes passées, celle en cours et celles à venir', () => {
		const lecture = lireEtapes(faits({ lettresValidees: ['2026-09-12'] }));
		expect(lecture.etapes.map((e) => e.etat)).toEqual(['FAITE', 'EN_COURS', 'A_VENIR', 'A_VENIR']);
		expect(lecture.ceQuiSePasse).toContain('12 septembre 2026');
	});

	/**
	 * ⚠️ LA DATE LIMITE NE S'ÉCRIT QUE QUAND ELLE EST PASSÉE, et ce test tient
	 * les DEUX branches.
	 *
	 * À VENIR, elle est une pastille en tête de la page dossier ; la réécrire
	 * ici la posait une troisième fois sur le même écran (relevé du 30/09/2026 :
	 * en-tête, « Si rien ne bouge », situation « paiement partiel »).
	 *
	 * PASSÉE, elle se répète quand même : c'est le seul état du produit où l'on
	 * perd tout sans que personne n'ait rien fait, et une pastille seule y serait
	 * trop discrète. Une redite se juge à ce qu'elle coûte de ne pas la faire.
	 */
	it('ne réécrit la date limite que lorsqu’elle est passée', () => {
		const aVenir = lireEtapes(faits({ lettresValidees: ['2026-09-12'] }));
		expect(aVenir.siRienNeBouge).toContain('pénalités');
		expect(aVenir.siRienNeBouge).not.toContain('2030');

		const passee = lireEtapes(
			faits({ lettresValidees: ['2026-09-12'], dateLimiteAgir: '2026-01-15' })
		);
		expect(passee.siRienNeBouge).toContain('15 janvier 2026');
		expect(passee.siRienNeBouge).toContain('passée');
	});

	it('ne recommande rien', () => {
		for (const f of [
			faits(),
			faits({ lettresValidees: ['2026-09-12'] }),
			faits({ professionnelDesigne: true })
		]) {
			const l = lireEtapes(f);
			expect(`${l.ceQuiSePasse} ${l.siRienNeBouge}`).not.toMatch(/recommand|vous devriez|il faut/i);
		}
	});
});

describe('les questions déjà écrites', () => {
	it('portent sur les faits et les calculs, jamais sur le droit', () => {
		for (const questions of Object.values(QUESTIONS_PAR_ETAPE)) {
			for (const question of questions) expect(estQuestionDeDroit(question), question).toBe(false);
		}
	});
});
