export type FinancePeriod = 'month' | 'quarter' | 'year' | 'custom';

export function periodToRange(p: FinancePeriod, from: string, to: string): { from: number; to: number } {
	const now = new Date();
	if (p === 'month') {
		const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
		return { from: start.getTime(), to: end.getTime() };
	}
	if (p === 'quarter') {
		const q = Math.floor(now.getMonth() / 3);
		const start = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0, 0);
		const end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
		return { from: start.getTime(), to: end.getTime() };
	}
	if (p === 'year') {
		const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
		const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
		return { from: start.getTime(), to: end.getTime() };
	}
	const f = from ? new Date(from).getTime() : new Date(now.getFullYear(), now.getMonth(), 1).getTime();
	const t = to ? new Date(to).setHours(23, 59, 59, 999) : Date.now();
	return { from: f, to: t };
}

export function prevPeriodRange(p: FinancePeriod, from: string, to: string): { from: number; to: number } {
	const current = periodToRange(p, from, to);
	const duration = current.to - current.from;
	return { from: current.from - duration - 1, to: current.from - 1 };
}
