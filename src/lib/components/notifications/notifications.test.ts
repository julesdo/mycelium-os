import { describe, it, expect } from 'vitest';
import { buildNotificationContent, deriveUnreadCount } from './utils';

describe('badge count', () => {
	it("s'incrémente quand une nouvelle notification non-lue est ajoutée", () => {
		const before: { isRead: boolean }[] = [];
		const after = [...before, { isRead: false }];
		expect(deriveUnreadCount(before)).toBe(0);
		expect(deriveUnreadCount(after)).toBe(1);
	});

	it('marquer comme lu décrémente le badge', () => {
		const notifications = [
			{ _id: 'n1', isRead: false },
			{ _id: 'n2', isRead: false }
		];
		expect(deriveUnreadCount(notifications)).toBe(2);

		const afterRead = notifications.map((n) => (n._id === 'n1' ? { ...n, isRead: true } : n));
		expect(deriveUnreadCount(afterRead)).toBe(1);
	});

	it('ignore les notifications déjà lues', () => {
		const notifications = [
			{ isRead: true },
			{ isRead: true },
			{ isRead: false }
		];
		expect(deriveUnreadCount(notifications)).toBe(1);
	});

	it('retourne 0 pour une liste vide', () => {
		expect(deriveUnreadCount([])).toBe(0);
	});
});

describe('buildNotificationContent', () => {
	it('RESERVATION_CONFIRMED retourne le bon titre et message', () => {
		const result = buildNotificationContent('RESERVATION_CONFIRMED', {
			vehicleLabel: 'Peugeot 308 · AB-123-CD',
			start: '13 jan. 2025',
			end: '14 jan. 2025'
		});
		expect(result.title).toBe('Réservation confirmée');
		expect(result.message).toContain('Peugeot 308 · AB-123-CD');
		expect(result.message).toContain('13 jan. 2025');
	});

	it('RESERVATION_CANCELLED retourne le bon titre', () => {
		const result = buildNotificationContent('RESERVATION_CANCELLED', {
			start: '15 jan. 2025'
		});
		expect(result.title).toBe('Réservation annulée');
		expect(result.message).toContain('15 jan. 2025');
	});

	it('RESERVATION_REMINDER retourne le bon titre et mentionne le véhicule', () => {
		const result = buildNotificationContent('RESERVATION_REMINDER', {
			vehicleLabel: 'Renault Kangoo',
			time: '08:00'
		});
		expect(result.title).toBe('Rappel — Demain');
		expect(result.message).toContain('Renault Kangoo');
		expect(result.message).toContain('08:00');
	});

	it('MAINTENANCE_DUE inclut le nombre de jours restants', () => {
		const result = buildNotificationContent('MAINTENANCE_DUE', {
			vehicleLabel: 'Citroën Berlingo',
			daysLeft: '7'
		});
		expect(result.title).toBe('Entretien planifié');
		expect(result.message).toContain('7 jours');
	});

	it('LEASE_EXPIRING inclut le nombre de jours restants', () => {
		const result = buildNotificationContent('LEASE_EXPIRING', {
			vehicleLabel: 'Ford Transit',
			daysLeft: '30'
		});
		expect(result.title).toBe('Leasing expirant');
		expect(result.message).toContain('Ford Transit');
		expect(result.message).toContain('30 jours');
	});

	it('UNDERUTILIZED_VEHICLE mentionne les jours sans utilisation', () => {
		const result = buildNotificationContent('UNDERUTILIZED_VEHICLE', {
			vehicleLabel: 'Volkswagen Polo',
			daysSince: '14'
		});
		expect(result.title).toBe('Véhicule sous-utilisé');
		expect(result.message).toContain('14 jours');
	});
});
