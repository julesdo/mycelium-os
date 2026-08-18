import { describe, it, expect } from 'vitest';
import { buildNotificationContent } from '../notifications';

describe('buildNotificationContent', () => {
	it('produit un titre et un message pour FACTURES_RECUES', () => {
		const result = buildNotificationContent('FACTURES_RECUES', { count: 12 });
		expect(result.title).toBe('Factures reçues');
		expect(result.message).toContain('12');
	});

	it('produit un titre et un message pour DIAGNOSTIC_PRET', () => {
		const result = buildNotificationContent('DIAGNOSTIC_PRET', { ratioDurable: 23.4 });
		expect(result.title).toBe('Votre diagnostic EGalim est prêt');
		expect(result.message).toContain('23.4');
	});

	it('produit un titre et un message pour LIGNES_A_ARBITRER', () => {
		const result = buildNotificationContent('LIGNES_A_ARBITRER', { count: 37 });
		expect(result.title).toBe('Lignes à arbitrer');
		expect(result.message).toContain('37');
	});
});
