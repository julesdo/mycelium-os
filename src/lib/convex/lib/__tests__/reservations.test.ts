import { describe, expect, it } from 'vitest';
import { hasConflict, type ConflictCandidate } from '../reservations';

const confirmed = (
	id: string,
	startDate: number,
	endDate: number
): ConflictCandidate => ({ _id: id, status: 'CONFIRMED', startDate, endDate });

const inProgress = (
	id: string,
	startDate: number,
	endDate: number
): ConflictCandidate => ({ _id: id, status: 'IN_PROGRESS', startDate, endDate });

const pending = (
	id: string,
	startDate: number,
	endDate: number
): ConflictCandidate => ({ _id: id, status: 'PENDING', startDate, endDate });

const cancelled = (
	id: string,
	startDate: number,
	endDate: number
): ConflictCandidate => ({ _id: id, status: 'CANCELLED', startDate, endDate });

describe('hasConflict', () => {
	it('returns false for an empty list', () => {
		expect(hasConflict([], 100, 200)).toBe(false);
	});

	it('detects overlap with a CONFIRMED reservation', () => {
		expect(hasConflict([confirmed('r1', 150, 300)], 100, 200)).toBe(true);
	});

	it('detects overlap with an IN_PROGRESS reservation', () => {
		expect(hasConflict([inProgress('r1', 50, 180)], 100, 200)).toBe(true);
	});

	it('ignores PENDING reservations', () => {
		expect(hasConflict([pending('r1', 100, 200)], 50, 300)).toBe(false);
	});

	it('ignores CANCELLED reservations', () => {
		expect(hasConflict([cancelled('r1', 100, 200)], 50, 300)).toBe(false);
	});

	it('does not flag adjacent (non-overlapping) reservations — end equals start', () => {
		// [100, 200] followed by [200, 300]: no overlap (exclusive boundary)
		expect(hasConflict([confirmed('r1', 100, 200)], 200, 300)).toBe(false);
	});

	it('does not flag reservations entirely before the window', () => {
		expect(hasConflict([confirmed('r1', 0, 100)], 100, 200)).toBe(false);
	});

	it('does not flag reservations entirely after the window', () => {
		expect(hasConflict([confirmed('r1', 200, 300)], 100, 200)).toBe(false);
	});

	it('detects overlap when candidate contains the window', () => {
		expect(hasConflict([confirmed('r1', 50, 300)], 100, 200)).toBe(true);
	});

	it('excludes the reservation being updated (excludeId)', () => {
		const candidates = [confirmed('r1', 100, 200)];
		expect(hasConflict(candidates, 100, 200, 'r1')).toBe(false);
	});

	it('still detects a conflict from a different reservation when excludeId is set', () => {
		const candidates = [confirmed('r1', 100, 200), confirmed('r2', 150, 250)];
		expect(hasConflict(candidates, 100, 200, 'r1')).toBe(true);
	});
});
