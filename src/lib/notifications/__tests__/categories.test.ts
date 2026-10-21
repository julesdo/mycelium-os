import { describe, expect, it } from 'vitest';
import { categorieDuType, estTransactionnel, heureDEnvoi } from '../categories';
import { prochainCreneauDEnvoi } from '../../verticales/recouvrement/plan-relance';

describe('les catégories du push', () => {
	it('range chaque type de notification dans une des quatre catégories', () => {
		expect(categorieDuType('PAIEMENT_RECU')).toBe('PAIEMENTS');
		expect(categorieDuType('JALON')).toBe('PAIEMENTS');
		for (const type of [
			'PILOTE_BLOQUE',
			'PRESCRIPTION_PROCHE',
			'ECHEANCE_PROCHE',
			'IMPORT_TERMINE',
			'RISQUE_EN_BAISSE'
		] as const) {
			expect(categorieDuType(type)).toBe('REPONSES');
		}
		expect(categorieDuType('SEMAINE')).toBe('SEMAINE');
		expect(categorieDuType('ABONNEMENT')).toBe('COMPTE');
		expect(categorieDuType('HUMAN_ASSIST_REPLY')).toBe('COMPTE');
	});

	it('ne tient pour marketing que « Votre semaine »', () => {
		expect(estTransactionnel('SEMAINE')).toBe(false);
		expect(estTransactionnel('PAIEMENT_RECU')).toBe(true);
		expect(estTransactionnel('ABONNEMENT')).toBe(true);
	});
});

describe('l’heure d’envoi d’un push', () => {
	// Octobre 2026, avant le passage à l'heure d'hiver : Paris = UTC+2.
	const mardi14h = Date.parse('2026-10-20T12:00:00Z');
	const mardi23h30 = Date.parse('2026-10-20T21:30:00Z');
	const mercredi8h = Date.parse('2026-10-21T06:00:00Z');
	const samedi10h = Date.parse('2026-10-24T08:00:00Z');

	it('part tout de suite entre 8 h et 21 h, heure de Paris, pour un paiement', () => {
		expect(heureDEnvoi('PAIEMENT_RECU', mardi14h)).toBe(mardi14h);
	});

	it('attend 8 h le lendemain quand il arrive la nuit', () => {
		expect(heureDEnvoi('PAIEMENT_RECU', mardi23h30)).toBe(mercredi8h);
	});

	it('suit le créneau des relances pour le marketing', () => {
		expect(heureDEnvoi('SEMAINE', samedi10h)).toBe(prochainCreneauDEnvoi(samedi10h));
	});
});
