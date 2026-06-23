// Emission factors — versioned & hardcoded (never in DB).
// Sources: ADEME Base Carbone 2026, DEFRA GHG Conversion Factors 2024,
//          IEA Electricity Factors 2023, Nordpool 2023, GHG Protocol WTT guidance

// ─── Country-specific electricity emission factors ─────────────────────────────
// kg CO2e / kWh — location-based (grid average)
export const ELECTRICITY_FACTORS: Record<string, number> = {
	FR: 0.0511,   // RTE 2026 (nuclear-heavy)
	GB: 0.207,    // DEFRA 2024
	SE: 0.0082,   // Energimyndigheten 2023 (hydro + nuclear)
	NO: 0.0088,   // NVE 2023 (near-100% hydro)
	DK: 0.152,    // Energistyrelsen 2023 (wind + imports)
	DE: 0.380,    // UBA 2023
	DEFAULT: 0.233 // IEA World Average 2023
};

// ─── France (ADEME Base Carbone 2026) ─────────────────────────────────────────
export const ADEME_FACTORS_2026 = {
	year: 2026,
	fuels: {
		DIESEL:   2.640,  // kg CO2e / litre
		ESSENCE:  2.289,
		GNV:      2.180,
		GPL:      1.610,
		ELECTRIC: 0.0511  // kg CO2e / kWh — mix France
	},
	fuelPrices: {
		DIESEL:   1.82,   // €/L
		ESSENCE:  1.79,
		GNV:      1.35,
		GPL:      0.95,
		ELECTRIC: 0.18    // €/kWh
	}
} as const;

// ─── UK (DEFRA GHG Conversion Factors 2024) ───────────────────────────────────
export const DEFRA_FACTORS_2024 = {
	year: 2024,
	fuels: {
		DIESEL:   2.710,  // kg CO2e / litre (includes biofuel blend)
		ESSENCE:  2.310,  // petrol
		GNV:      2.000,  // CNG
		GPL:      1.630,  // LPG
		ELECTRIC: 0.207   // kg CO2e / kWh — UK grid 2024
	},
	fuelPrices: {
		DIESEL:   1.52,   // £/L 2024 avg
		ESSENCE:  1.48,
		GNV:      1.20,
		GPL:      0.80,
		ELECTRIC: 0.28    // £/kWh (domestic avg)
	},
	// Well-to-tank (WTT) uplift factors for upstream fuel production
	// Apply on top of combustion Scope 1 → gives Scope 3 Cat 3 (fuel & energy)
	wtt: {
		DIESEL:   0.636,  // kg CO2e / litre WTT
		ESSENCE:  0.536,
		GNV:      0.388,
		GPL:      0.231,
		ELECTRIC: 0       // WTT for electricity handled via grid factor
	}
} as const;

// ─── Nordic factors (IEA / national TSOs 2023) ────────────────────────────────
// All countries use DEFRA combustion factors for fuels; only electricity differs
export const NORDIC_FUEL_FACTORS = {
	DIESEL:   2.670,  // average Nordic (excl. biofuels)
	ESSENCE:  2.300,
	GNV:      2.100,
	GPL:      1.610,
	ELECTRIC: 0       // use ELECTRICITY_FACTORS[country] at runtime
} as const;

// ─── Spend-based Scope 3 emission factors (DEFRA 2024 EE factors) ─────────────
// kg CO2e per £ spent — used when only cost data is available
export const SPEND_BASED_FACTORS_GBP: Record<string, number> = {
	ENTRETIEN:  0.247,   // Motor vehicle repair & maintenance
	ASSURANCE:  0.112,   // Insurance services
	TAXES:      0.060,   // Public admin services
	PARKING:    0.190,   // Parking & supporting transport
	TELEPEAGE:  0.190,
	AUTRE:      0.190,
	LEASING:    0.330,   // Leasing / vehicle hire (manufacturing upstream)
	SINISTRE:   0.247
};

// EUR equivalent (rough: ÷0.85 for GBP→EUR, factors scale similarly)
export const SPEND_BASED_FACTORS_EUR: Record<string, number> = Object.fromEntries(
	Object.entries(SPEND_BASED_FACTORS_GBP).map(([k, v]) => [k, v * 0.85])
);

// ─── Vehicle end-of-life (Scope 3 Cat 12) ─────────────────────────────────────
// tCO2e per vehicle retired — average EU estimate (EV higher due to battery)
export const EOL_FACTORS_TCO2E: Record<string, number> = {
	ELECTRIC: 0.35,  // battery recycling processing
	HYBRID:   0.25,
	THERMAL:  0.18
};

// ─── Types ─────────────────────────────────────────────────────────────────────
export type FuelType = 'DIESEL' | 'ESSENCE' | 'GNV' | 'GPL' | 'ELECTRIC';
export type CountryCode = 'FR' | 'GB' | 'SE' | 'NO' | 'DK' | 'DE';

// ─── Country-aware helpers ─────────────────────────────────────────────────────

export function getFuelFactor(fuelType: FuelType, country: CountryCode = 'FR'): number {
	if (country === 'GB') return DEFRA_FACTORS_2024.fuels[fuelType] ?? 2.64;
	if (country === 'SE' || country === 'NO' || country === 'DK') {
		if (fuelType === 'ELECTRIC') return ELECTRICITY_FACTORS[country] ?? 0.1;
		return NORDIC_FUEL_FACTORS[fuelType] ?? 2.64;
	}
	return ADEME_FACTORS_2026.fuels[fuelType] ?? 2.64;
}

export function getFuelPrice(fuelType: FuelType, country: CountryCode = 'FR'): number {
	if (country === 'GB') return DEFRA_FACTORS_2024.fuelPrices[fuelType] ?? 1.5;
	return ADEME_FACTORS_2026.fuelPrices[fuelType] ?? 1.7;
}

export function getWttFactor(fuelType: FuelType, country: CountryCode = 'FR'): number {
	if (country === 'GB') return DEFRA_FACTORS_2024.wtt[fuelType] ?? 0;
	// For FR/Nordics use approximate WTT ratios from ADEME
	const WTT_ADEME: Record<string, number> = { DIESEL: 0.60, ESSENCE: 0.50, GNV: 0.35, GPL: 0.20, ELECTRIC: 0 };
	return WTT_ADEME[fuelType] ?? 0;
}

export function getElectricityFactor(country: CountryCode = 'FR'): number {
	return ELECTRICITY_FACTORS[country] ?? ELECTRICITY_FACTORS.DEFAULT;
}

export function getSpendFactor(category: string, currency: string = 'EUR'): number {
	const table = currency === 'GBP' ? SPEND_BASED_FACTORS_GBP : SPEND_BASED_FACTORS_EUR;
	return table[category] ?? (currency === 'GBP' ? 0.190 : 0.162);
}

export function estimateUnitsFromCost(amount: number, fuelType: FuelType, country: CountryCode = 'FR'): number {
	const price = getFuelPrice(fuelType, country);
	return amount / price;
}

export function calculateCO2e(units: number, fuelType: FuelType, country: CountryCode = 'FR'): number {
	return (units * getFuelFactor(fuelType, country)) / 1000; // tCO2e
}

export function vehicleFuelType(energy: string): FuelType {
	if (energy === 'ELECTRIC') return 'ELECTRIC';
	if (energy === 'HYBRID') return 'ESSENCE';
	return 'DIESEL';
}

// ─── Backward-compat exports (used by existing carbon.ts) ─────────────────────
export { estimateUnitsFromCost as estimateUnitsFromCostFR };
