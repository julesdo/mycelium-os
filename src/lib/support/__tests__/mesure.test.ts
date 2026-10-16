import { describe, it, expect } from 'vitest';
import { calculerLaMesure, type ConversationPourLaMesure } from '../mesure';

const JOUR = 24 * 60 * 60 * 1000;
// Un jeudi, 15 h à Paris.
const MAINTENANT = Date.UTC(2026, 9, 15, 13, 0);

function conv(partiel: Partial<ConversationPourLaMesure> & { id: string }): ConversationPourLaMesure {
	return {
		titre: 'Question',
		creeeLe: MAINTENANT - 2 * JOUR,
		etat: 'TERMINEE',
		ouiPlume: 0,
		nonPlume: 0,
		...partiel
	};
}

describe('calculerLaMesure', () => {
	it('compte l’entonnoir des trente derniers jours, et la période d’avant à part', () => {
		const m = calculerLaMesure(
			[
				conv({ id: 'a', issue: 'RESOLUE_PAR_PLUME', ouiPlume: 1 }),
				conv({ id: 'b', passeeLe: MAINTENANT - 2 * JOUR, issue: 'RESOLUE_PAR_EQUIPE', raisonDePassage: 'ACTE' }),
				conv({ id: 'c', passeeLe: MAINTENANT - 2 * JOUR, etat: 'A_NOUS', raisonDePassage: 'LACUNE', sujet: 'CONNEXIONS' }),
				conv({ id: 'd', creeeLe: MAINTENANT - 40 * JOUR, issue: 'RESOLUE_PAR_PLUME', ouiPlume: 1 })
			],
			MAINTENANT
		);
		expect(m.entonnoir).toEqual({
			conversations: 3,
			resoluesParPlume: 1,
			passees: 2,
			resoluesParLEquipe: 1,
			sansNouvelles: 0
		});
		expect(m.precedent.conversations).toBe(1);
	});

	it('donne le taux de « Oui » de Plume, et rien sans avis', () => {
		expect(
			calculerLaMesure([conv({ id: 'a', ouiPlume: 3, nonPlume: 1 })], MAINTENANT).tauxDeOuiPlume
		).toBe(0.75);
		expect(calculerLaMesure([conv({ id: 'a' })], MAINTENANT).tauxDeOuiPlume).toBeNull();
	});

	it('masque la satisfaction sous dix avis', () => {
		const neuf = Array.from({ length: 9 }, (_, i) =>
			conv({ id: `n${i}`, issue: 'RESOLUE_PAR_EQUIPE', avis: { utile: true } })
		);
		expect(calculerLaMesure(neuf, MAINTENANT).satisfaction).toBeNull();
		const dix = [...neuf, conv({ id: 'x', issue: 'RESOLUE_PAR_EQUIPE', avis: { utile: false } })];
		expect(calculerLaMesure(dix, MAINTENANT).satisfaction).toBe(0.9);
	});

	it('médiane de la première réponse humaine, en heures ouvrées', () => {
		const m = calculerLaMesure(
			[
				conv({ id: 'a', premiereReponseOuvreeMin: 60 }),
				conv({ id: 'b', premiereReponseOuvreeMin: 180 }),
				conv({ id: 'c', premiereReponseOuvreeMin: 120 })
			],
			MAINTENANT
		);
		expect(m.medianes.premiereReponseH).toBe(2);
		expect(m.medianes.reponses).toBe(3);
	});

	it('liste ce que Plume n’a pas su, et range par sujet', () => {
		const m = calculerLaMesure(
			[
				conv({ id: 'c', passeeLe: MAINTENANT - JOUR, raisonDePassage: 'LACUNE', sujet: 'CONNEXIONS', titre: 'Qonto deux comptes' }),
				conv({ id: 'e', passeeLe: MAINTENANT - JOUR, raisonDePassage: 'REFUS', sujet: 'CONNEXIONS' }),
				conv({ id: 'f', passeeLe: MAINTENANT - JOUR, raisonDePassage: 'ACTE', sujet: 'ABONNEMENT' })
			],
			MAINTENANT
		);
		expect(m.lacunes.map((l) => l.id)).toEqual(['c', 'e']);
		expect(m.parSujet[0]).toEqual({ sujet: 'CONNEXIONS', conversations: 2, passees: 2 });
	});
});
