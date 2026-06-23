export type ConflictCandidate = {
	_id: string;
	status: string;
	startDate: number;
	endDate: number;
};

/**
 * Returns true if any candidate reservation overlaps [startDate, endDate].
 * Only CONFIRMED and IN_PROGRESS reservations are considered active.
 * Pass excludeId to ignore a specific reservation (e.g. the one being updated).
 */
export function hasConflict(
	candidates: ReadonlyArray<ConflictCandidate>,
	startDate: number,
	endDate: number,
	excludeId?: string
): boolean {
	return candidates.some(
		(r) =>
			r._id !== excludeId &&
			(r.status === 'CONFIRMED' || r.status === 'IN_PROGRESS') &&
			r.startDate < endDate &&
			r.endDate > startDate
	);
}

/**
 * Returns true if any SCHEDULED or IN_PROGRESS maintenance record overlaps [startDate, endDate].
 * Maintenance blocks the full UTC day of its scheduledDate.
 */
export function hasMaintenanceConflict(
	records: ReadonlyArray<{ scheduledDate: number; status: string }>,
	startDate: number,
	endDate: number
): boolean {
	const dayMs = 24 * 60 * 60 * 1000;
	return records.some((m) => {
		if (m.status !== 'SCHEDULED' && m.status !== 'IN_PROGRESS') return false;
		const dayStart = Math.floor(m.scheduledDate / dayMs) * dayMs;
		const dayEnd = dayStart + dayMs;
		return dayStart < endDate && dayEnd > startDate;
	});
}
