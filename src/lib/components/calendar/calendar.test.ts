import { describe, it, expect } from 'vitest';
import {
	getWindowStart,
	getColumnCount,
	getVisibleDays,
	getReservationsForVehicleAndDay
} from './utils';

describe('calendar utils', () => {
	describe('vue semaine affiche les 7 jours', () => {
		it('week view has 7 columns', () => {
			const windowStart = getWindowStart('week', new Date('2025-01-13'));
			expect(getColumnCount('week', windowStart)).toBe(7);
		});

		it('week view generates exactly 7 day objects', () => {
			const windowStart = getWindowStart('week', new Date('2025-01-13'));
			const days = getVisibleDays('week', windowStart);
			expect(days).toHaveLength(7);
		});

		it('day view has 1 column', () => {
			const windowStart = getWindowStart('day', new Date('2025-01-13'));
			expect(getColumnCount('day', windowStart)).toBe(1);
		});
	});

	describe('réservation apparaît sur le bon créneau', () => {
		it('returns reservation when it spans the given day', () => {
			const day = new Date('2025-01-13T00:00:00');
			const reservation = {
				_id: 'r1',
				vehicleId: 'v1',
				startDate: new Date('2025-01-13T08:00:00').getTime(),
				endDate: new Date('2025-01-13T18:00:00').getTime(),
				status: 'CONFIRMED'
			};
			const result = getReservationsForVehicleAndDay([reservation], 'v1', day);
			expect(result).toHaveLength(1);
			expect(result[0]?._id).toBe('r1');
		});

		it('does not return reservation for a different vehicle', () => {
			const day = new Date('2025-01-13T00:00:00');
			const reservation = {
				_id: 'r1',
				vehicleId: 'v1',
				startDate: new Date('2025-01-13T08:00:00').getTime(),
				endDate: new Date('2025-01-13T18:00:00').getTime(),
				status: 'CONFIRMED'
			};
			const result = getReservationsForVehicleAndDay([reservation], 'v2', day);
			expect(result).toHaveLength(0);
		});

		it('does not return reservation on a different day', () => {
			const tuesday = new Date('2025-01-14T00:00:00');
			const reservation = {
				_id: 'r1',
				vehicleId: 'v1',
				startDate: new Date('2025-01-13T08:00:00').getTime(),
				endDate: new Date('2025-01-13T18:00:00').getTime(),
				status: 'CONFIRMED'
			};
			const result = getReservationsForVehicleAndDay([reservation], 'v1', tuesday);
			expect(result).toHaveLength(0);
		});

		it('returns multi-day reservation for each day it spans', () => {
			const monday = new Date('2025-01-13T00:00:00');
			const tuesday = new Date('2025-01-14T00:00:00');
			const reservation = {
				_id: 'r1',
				vehicleId: 'v1',
				startDate: new Date('2025-01-13T08:00:00').getTime(),
				endDate: new Date('2025-01-15T18:00:00').getTime(),
				status: 'CONFIRMED'
			};
			expect(getReservationsForVehicleAndDay([reservation], 'v1', monday)).toHaveLength(1);
			expect(getReservationsForVehicleAndDay([reservation], 'v1', tuesday)).toHaveLength(1);
		});
	});

	describe('navigation semaine précédente/suivante', () => {
		it('week window always starts on Monday', () => {
			// Test with Monday
			expect(getWindowStart('week', new Date('2025-01-13')).getDay()).toBe(1);
			// Test with Wednesday
			expect(getWindowStart('week', new Date('2025-01-15')).getDay()).toBe(1);
			// Test with Sunday
			expect(getWindowStart('week', new Date('2025-01-19')).getDay()).toBe(1);
		});

		it('previous week is 7 days before current window start', () => {
			const windowStart = getWindowStart('week', new Date('2025-01-13'));
			const prevWeekStart = new Date(windowStart);
			prevWeekStart.setDate(prevWeekStart.getDate() - 7);
			const expected = getWindowStart('week', new Date('2025-01-06'));
			expect(prevWeekStart.getTime()).toBe(expected.getTime());
		});

		it('today navigation returns a window containing today', () => {
			const today = new Date();
			const windowStart = getWindowStart('week', today);
			const days = getVisibleDays('week', windowStart);
			const hasToday = days.some(
				(d) =>
					d.getFullYear() === today.getFullYear() &&
					d.getMonth() === today.getMonth() &&
					d.getDate() === today.getDate()
			);
			expect(hasToday).toBe(true);
		});
	});
});
