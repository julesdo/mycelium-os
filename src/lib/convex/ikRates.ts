export const IK_RATES_2026 = {
	year: 2026,
	bands: [
		{ cv: 3, d: 0.502, base: 0.273, excess: 2143 },
		{ cv: 4, d: 0.575, base: 0.323, excess: 2760 },
		{ cv: 5, d: 0.636, base: 0.359, excess: 3385 },
		{ cv: 6, d: 0.665, base: 0.374, excess: 3645 },
		{ cv: 7, d: 0.697, base: 0.394, excess: 4170 }
	]
} as const;

export function calculateIK(
	fiscalPower: number,
	km: number,
	yearKmTotal: number = 0,
	_year: number = 2026
): number {
	const cv = Math.min(Math.max(Math.floor(fiscalPower), 3), 7);
	const band = IK_RATES_2026.bands.find((b) => b.cv === cv) ?? IK_RATES_2026.bands[IK_RATES_2026.bands.length - 1];

	const totalKm = yearKmTotal + km;

	if (totalKm <= 5000) {
		return Math.round(km * band.d * 100) / 100;
	} else if (yearKmTotal >= 20000) {
		return Math.round(km * band.base * 100) / 100;
	} else if (yearKmTotal < 5000 && totalKm > 5000) {
		const kmAt5000 = 5000 - yearKmTotal;
		const kmAbove5000 = km - kmAt5000;
		const part1 = kmAt5000 * band.d;
		const part2 = kmAbove5000 * band.base + band.excess;
		return Math.round((part1 + part2) * 100) / 100;
	} else {
		return Math.round((km * band.base + band.excess) * 100) / 100;
	}
}

export function getRateLabel(fiscalPower: number, yearKmTotal: number = 0): string {
	const cv = Math.min(Math.max(Math.floor(fiscalPower), 3), 7);
	const band = IK_RATES_2026.bands.find((b) => b.cv === cv) ?? IK_RATES_2026.bands[IK_RATES_2026.bands.length - 1];

	if (yearKmTotal < 5000) {
		return `${band.d.toFixed(3)} €/km`;
	} else if (yearKmTotal < 20000) {
		return `${band.base.toFixed(3)} €/km + ${band.excess} €`;
	} else {
		return `${band.base.toFixed(3)} €/km`;
	}
}

export function getSliceLabel(yearKmTotal: number = 0): string {
	if (yearKmTotal < 5000) return 'Tranche ≤ 5 000 km/an';
	if (yearKmTotal < 20000) return 'Tranche 5 001–20 000 km/an';
	return 'Tranche > 20 000 km/an';
}
