import { addDays, getDaysInMonth } from 'date-fns';

export type ViewMode = 'day' | 'week' | 'month';

export function getWindowStart(view: ViewMode, ref: Date = new Date()): Date {
	if (view === 'week') {
		const d = new Date(ref);
		d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
		d.setHours(0, 0, 0, 0);
		return d;
	}
	if (view === 'month') return new Date(ref.getFullYear(), ref.getMonth(), 1);
	const d = new Date(ref);
	d.setHours(0, 0, 0, 0);
	return d;
}

export function getColumnCount(view: ViewMode, windowStart: Date): number {
	if (view === 'day') return 1;
	if (view === 'week') return 7;
	return getDaysInMonth(windowStart);
}

export function getVisibleDays(view: ViewMode, windowStart: Date): Date[] {
	const count = getColumnCount(view, windowStart);
	return Array.from({ length: count }, (_, i) => addDays(windowStart, i));
}

export type ReservationForDay = {
	_id: string;
	vehicleId: string;
	startDate: number;
	endDate: number;
	status: string;
};

export function getReservationsForVehicleAndDay(
	reservations: ReservationForDay[],
	vehicleId: string,
	day: Date
): ReservationForDay[] {
	const dayStart = new Date(day).setHours(0, 0, 0, 0);
	const dayEnd = new Date(day).setHours(23, 59, 59, 999);
	return reservations.filter(
		(r) => r.vehicleId === vehicleId && r.startDate < dayEnd && r.endDate > dayStart
	);
}
