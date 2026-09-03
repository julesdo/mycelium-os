import { describe, it, expect } from 'vitest';
import { buildNotificationContent } from '../notifications';

/**
 * Le contenu des notifications.
 *
 * CE QU'ON VÉRIFIE : que la donnée passée arrive bien DANS le message. Une
 * notification qui dit « une créance est mûre » sans dire laquelle ni combien
 * oblige à ouvrir le produit pour savoir s'il faut s'en occuper — c'est-à-dire
 * exactement le travail qu'elle est censée épargner.
 */
describe('buildNotificationContent', () => {
	it('dit combien de factures un import a enregistrées', () => {
		const result = buildNotificationContent('IMPORT_TERMINE', { count: 312 });
		expect(result.title).toBe('Import terminé');
		expect(result.message).toContain('312');
	});

	it('nomme le débiteur et le montant d’une créance mûre', () => {
		const result = buildNotificationContent('CREANCE_MURE', {
			debiteur: 'Fournitures Durand',
			montant: '31 200,50 €'
		});
		expect(result.title).toBe('Une créance est mûre');
		expect(result.message).toContain('Fournitures Durand');
		expect(result.message).toContain('31 200,50 €');
	});

	it('chiffre les jours restants sur une échéance de procédure', () => {
		const result = buildNotificationContent('ECHEANCE_PROCHE', {
			libelle: 'Signification de l’ordonnance',
			jours: 9
		});
		expect(result.title).toBe('Échéance de procédure');
		expect(result.message).toContain('9');
	});

	it('dit ce qui se passe passée la date de prescription', () => {
		// La seule échéance qui éteint une créance sans que personne n'ait rien
		// fait : le message doit dire la conséquence, pas seulement la date.
		const result = buildNotificationContent('PRESCRIPTION_PROCHE', {
			reference: 'FA-2021-0087',
			date: '2026-11-01'
		});
		expect(result.title).toBe('Prescription proche');
		expect(result.message).toContain('FA-2021-0087');
		expect(result.message).toContain('éteinte');
	});
});
