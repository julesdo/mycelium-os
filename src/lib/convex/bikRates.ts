// HMRC Company Car Benefit-in-Kind rates — hardcoded & versioned.
// Sources: HMRC EIM23100, EIM23645, Finance Act 2024, Spring Budget 2024
// Rates apply to cars registered after April 2020 (WLTP CO2 figures)
// Cars registered before April 2020 use NEDC figures (same table applies in practice)

export type BikTaxYear = '2024-25' | '2025-26' | '2026-27' | '2027-28';

// Employer Class 1A NIC rate on BiK value
export const CLASS_1A_NIC_RATE = 0.138; // 13.8%

// UK income tax bands (2024/25)
export const UK_TAX_RATES = {
	basic: 0.20,
	higher: 0.40,
	additional: 0.45
} as const;

// ─── PHEV electric range bands (1-50 g/km CO2) ────────────────────────────────
// Range in miles → BiK percentage by tax year
const PHEV_RANGE_RATES: Record<BikTaxYear, Array<{ minMiles: number; rate: number }>> = {
	'2024-25': [
		{ minMiles: 130, rate: 2 },
		{ minMiles: 70,  rate: 5 },
		{ minMiles: 40,  rate: 8 },
		{ minMiles: 30,  rate: 12 },
		{ minMiles: 0,   rate: 14 }
	],
	'2025-26': [
		{ minMiles: 130, rate: 3 },
		{ minMiles: 70,  rate: 6 },
		{ minMiles: 40,  rate: 9 },
		{ minMiles: 30,  rate: 13 },
		{ minMiles: 0,   rate: 15 }
	],
	'2026-27': [
		{ minMiles: 130, rate: 4 },
		{ minMiles: 70,  rate: 7 },
		{ minMiles: 40,  rate: 10 },
		{ minMiles: 30,  rate: 14 },
		{ minMiles: 0,   rate: 16 }
	],
	'2027-28': [
		{ minMiles: 130, rate: 5 },
		{ minMiles: 70,  rate: 8 },
		{ minMiles: 40,  rate: 11 },
		{ minMiles: 30,  rate: 15 },
		{ minMiles: 0,   rate: 17 }
	]
};

// ─── CO2 band rates (51+ g/km) ─────────────────────────────────────────────────
// Each entry: [co2Min, co2Max, rate2024, rate2025, rate2026, rate2027]
// Max rate cap: 37%
const CO2_BAND_RATES: Array<[number, number, number, number, number, number]> = [
	[51,  54,  15, 16, 17, 18],
	[55,  59,  16, 17, 18, 19],
	[60,  64,  17, 18, 19, 20],
	[65,  69,  18, 19, 20, 21],
	[70,  74,  19, 20, 21, 22],
	[75,  79,  20, 21, 22, 23],
	[80,  84,  21, 22, 23, 24],
	[85,  89,  22, 23, 24, 25],
	[90,  94,  23, 24, 25, 26],
	[95,  99,  24, 25, 26, 27],
	[100, 104, 25, 26, 27, 28],
	[105, 109, 26, 27, 28, 29],
	[110, 114, 27, 28, 29, 30],
	[115, 119, 28, 29, 30, 31],
	[120, 124, 29, 30, 31, 32],
	[125, 129, 30, 31, 32, 33],
	[130, 134, 31, 32, 33, 34],
	[135, 139, 32, 33, 34, 35],
	[140, 144, 33, 34, 35, 36],
	[145, 149, 34, 35, 36, 37],
	[150, 154, 35, 36, 37, 37],
	[155, 159, 36, 37, 37, 37],
	[160, 999, 37, 37, 37, 37]
];

const YEAR_INDEX: Record<BikTaxYear, number> = {
	'2024-25': 2,
	'2025-26': 3,
	'2026-27': 4,
	'2027-28': 5
};

// ─── Core rate lookup ──────────────────────────────────────────────────────────

export interface BikRateInput {
	co2Gkm: number;            // WLTP CO2 in g/km
	fuelType: 'electric' | 'petrol' | 'diesel' | 'hybrid';
	electricRangeMiles?: number; // required for PHEV (fuelType === 'hybrid')
	isDieselRde2?: boolean;    // RDE2-compliant diesel — no 4% surcharge
	taxYear?: BikTaxYear;
}

export function getBikRate(input: BikRateInput): number {
	const year = input.taxYear ?? '2025-26';

	// Pure electric
	if (input.fuelType === 'electric' || input.co2Gkm === 0) {
		const evRates: Record<BikTaxYear, number> = {
			'2024-25': 2,
			'2025-26': 3,
			'2026-27': 4,
			'2027-28': 5
		};
		return evRates[year];
	}

	// PHEV: 1–50 g/km
	if (input.co2Gkm >= 1 && input.co2Gkm <= 50) {
		const rangeMiles = input.electricRangeMiles ?? 0;
		const bands = PHEV_RANGE_RATES[year];
		for (const band of bands) {
			if (rangeMiles >= band.minMiles) return band.rate;
		}
		return bands[bands.length - 1]?.rate ?? 14;
	}

	// ICE / mild hybrid: 51+ g/km
	const idx = YEAR_INDEX[year];
	for (const row of CO2_BAND_RATES) {
		if (input.co2Gkm >= row[0] && input.co2Gkm <= row[1]) {
			let rate = row[idx] as number;
			// Diesel surcharge +4% (unless RDE2 compliant)
			if (input.fuelType === 'diesel' && !input.isDieselRde2) {
				rate = Math.min(rate + 4, 37);
			}
			return rate;
		}
	}

	return 37; // fallback max
}

// ─── Liability calculators ─────────────────────────────────────────────────────

export interface BikCalculation {
	bikRate: number;           // % (e.g. 3)
	bikValue: number;          // P11D × rate/100
	employeeBasicTax: number;  // bikValue × 20%
	employeeHigherTax: number; // bikValue × 40%
	employerNic: number;       // bikValue × 13.8%
}

export function calculateBik(
	p11dValue: number,
	rateInput: BikRateInput
): BikCalculation {
	const bikRate = getBikRate(rateInput);
	const bikValue = p11dValue * (bikRate / 100);
	return {
		bikRate,
		bikValue: Math.round(bikValue * 100) / 100,
		employeeBasicTax: Math.round(bikValue * UK_TAX_RATES.basic * 100) / 100,
		employeeHigherTax: Math.round(bikValue * UK_TAX_RATES.higher * 100) / 100,
		employerNic: Math.round(bikValue * CLASS_1A_NIC_RATE * 100) / 100
	};
}

// ─── Savings projection ────────────────────────────────────────────────────────

export interface BikSavingsProjection {
	currentBikValue: number;
	evBikValue: number;       // if replaced by EV with same P11D
	employerNicSaving: number;
	employeeBasicTaxSaving: number;
	yearsToBreakEven?: number; // rough estimate if EV costs more
}

export function projectEvSavings(
	p11dValue: number,
	currentRateInput: BikRateInput,
	taxYear: BikTaxYear = '2025-26'
): BikSavingsProjection {
	const current = calculateBik(p11dValue, { ...currentRateInput, taxYear });
	const ev = calculateBik(p11dValue, { co2Gkm: 0, fuelType: 'electric', taxYear });

	return {
		currentBikValue: current.bikValue,
		evBikValue: ev.bikValue,
		employerNicSaving: current.employerNic - ev.employerNic,
		employeeBasicTaxSaving: current.employeeBasicTax - ev.employeeBasicTax
	};
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function currentTaxYear(): BikTaxYear {
	const now = new Date();
	const year = now.getFullYear();
	const isAfterApril = now.getMonth() >= 3; // April = index 3
	const start = isAfterApril ? year : year - 1;
	const key = `${start}-${String(start + 1).slice(-2)}` as BikTaxYear;
	return (['2024-25', '2025-26', '2026-27', '2027-28'] as BikTaxYear[]).includes(key)
		? key
		: '2025-26';
}

export function fuelTypeFromEnergy(energy: string): BikRateInput['fuelType'] {
	if (energy === 'ELECTRIC') return 'electric';
	if (energy === 'HYBRID') return 'hybrid';
	return 'petrol'; // THERMAL — most common; diesel handled separately
}

export const ALL_TAX_YEARS: BikTaxYear[] = ['2024-25', '2025-26', '2026-27', '2027-28'];
