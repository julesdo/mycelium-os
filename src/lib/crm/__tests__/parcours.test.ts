import { describe, expect, it } from 'vitest';
import {
	PARCOURS,
	REGISTRE_DES_PARCOURS,
	atteintsParEtape,
	etapeInitiale,
	etapeValide,
	libelleDeLEtape,
	parcoursDe,
	parcoursParDefaut,
	rangDeLEtape
} from '../parcours';
import { effetDeLIssue, ISSUES_APPEL, LIBELLES_DES_ISSUES } from '../appels';

const JEUDI = Date.UTC(2026, 9, 15, 8);

describe('les parcours', () => {
	it('ont chacun des étapes, sans doublon', () => {
		for (const p of PARCOURS) {
			const cles = REGISTRE_DES_PARCOURS[p].etapes.map((e) => e.cle);
			expect(cles.length).toBeGreaterThanOrEqual(4);
			expect(new Set(cles).size).toBe(cles.length);
		}
	});

	it('se déduisent pour un prospect d’avant : cabinet, transporteur, sinon PME', () => {
		expect(parcoursParDefaut('CABINET')).toBe('EXPERT_COMPTABLE');
		expect(parcoursParDefaut('PME', 'Transports routiers de fret interurbains (49.41A)')).toBe(
			'TRANSPORTEUR'
		);
		expect(parcoursParDefaut('PME', 'Travaux (43.21A)')).toBe('PME_LOGICIEL');
		// Jamais un fournisseur public ni un pilote par défaut : ceux-là se décident.
		expect(parcoursDe({ cible: 'PME' })).toBe('PME_LOGICIEL');
		expect(parcoursDe({ cible: 'PME', parcours: 'PILOTE' })).toBe('PILOTE');
	});

	it('valident une étape contre leur registre', () => {
		expect(etapeInitiale('FOURNISSEUR_PUBLIC')).toBe('ESTIME');
		expect(etapeValide('FOURNISSEUR_PUBLIC', 'DEVIS')).toBe(true);
		expect(etapeValide('FOURNISSEUR_PUBLIC', 'DEMO')).toBe(false);
		// Une étape inconnue compte comme la première, jamais comme une étape avancée.
		expect(rangDeLEtape('PILOTE', 'INCONNUE')).toBe(0);
		expect(libelleDeLEtape('PILOTE', undefined)).toBe('Qualifié');
	});

	it('comptent ce qui a atteint AU MOINS chaque étape', () => {
		const comptes = atteintsParEtape('TRANSPORTEUR', ['A_APPELER', 'APPELE', 'CALCUL', undefined]);
		expect(comptes.map((c) => c.nombre)).toEqual([4, 2, 1, 1, 0]);
	});
});

describe('l’issue d’un appel', () => {
	it('a un libellé pour chaque issue', () => {
		for (const i of ISSUES_APPEL) expect(LIBELLES_DES_ISSUES[i].length).toBeGreaterThan(3);
	});

	it('ne fait jamais reculer un prospect', () => {
		expect(effetDeLIssue('PAS_DE_REPONSE', 'INTERESSE', JEUDI).statut).toBe('INTERESSE');
		expect(effetDeLIssue('PAS_DE_REPONSE', 'A_CONTACTER', JEUDI).statut).toBe('CONTACTE');
	});

	it('note l’information de la personne quand elle accepte un e-mail', () => {
		const effet = effetDeLIssue('EMAIL_ACCEPTE', 'A_CONTACTER', JEUDI);
		expect(effet.informee).toBe(true);
		expect(effet.contactDuProspect).toBe(true);
		expect(effet.statut).toBe('A_REPONDU');
	});

	it('ne compte pas un appel sans réponse comme un contact venu du prospect', () => {
		expect(effetDeLIssue('PAS_DE_REPONSE', 'CONTACTE', JEUDI).contactDuProspect).toBe(false);
		expect(effetDeLIssue('MESSAGE_LAISSE', 'CONTACTE', JEUDI).contactDuProspect).toBe(false);
	});

	it('arrête tout sur un « Stop »', () => {
		const effet = effetDeLIssue('STOP', 'INTERESSE', JEUDI);
		expect(effet.arreter).toBe(true);
		expect(effet.statut).toBe('STOP');
	});

	it('rappelle le jour choisi, ou deux jours ouvrés plus tard', () => {
		const choisi = Date.UTC(2026, 9, 22, 12);
		expect(effetDeLIssue('A_RAPPELER', 'CONTACTE', JEUDI, choisi).prochaineActionLe).toBe(choisi);
		// Jeudi 15 + 2 = samedi 17 → lundi 19.
		expect(
			new Date(effetDeLIssue('BARRAGE', 'CONTACTE', JEUDI).prochaineActionLe!).toISOString()
		).toBe('2026-10-19T12:00:00.000Z');
	});
});
