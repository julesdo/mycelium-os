export type VehicleCategory = 'ELECTRIC' | 'HYBRID' | 'THERMAL' | 'UTILITY';
export type DistanceUnit = 'km' | 'mile';
export type SupportedCurrency = 'EUR' | 'GBP' | 'SEK' | 'NOK' | 'DKK';

export interface MileageRate {
	category: VehicleCategory;
	ratePerUnit: number;
	label: string;
}

// Default rates by country (ISO alpha-2 → rates)
// Sources: URSSAF 2026 (FR), HMRC Advisory 2025-26 (GB), Skatteverket 2025 (SE), Skatteetaten 2025 (NO), SKAT 2025 (DK)
export const DEFAULT_RATES_BY_COUNTRY: Record<string, { unit: DistanceUnit; currency: SupportedCurrency; rates: MileageRate[] }> = {
	FR: {
		unit: 'km',
		currency: 'EUR',
		rates: [
			{ category: 'ELECTRIC', ratePerUnit: 0.636, label: 'Électrique (≤5 000 km/an, 5 CV)' },
			{ category: 'HYBRID', ratePerUnit: 0.575, label: 'Hybride (≤5 000 km/an, 4 CV)' },
			{ category: 'THERMAL', ratePerUnit: 0.636, label: 'Thermique (≤5 000 km/an, 5 CV)' },
			{ category: 'UTILITY', ratePerUnit: 0.518, label: 'Utilitaire' }
		]
	},
	GB: {
		unit: 'mile',
		currency: 'GBP',
		rates: [
			{ category: 'ELECTRIC', ratePerUnit: 0.09, label: 'Electric (HMRC Advisory Rate)' },
			{ category: 'HYBRID', ratePerUnit: 0.45, label: 'Hybrid (HMRC Advisory Rate)' },
			{ category: 'THERMAL', ratePerUnit: 0.45, label: 'Petrol/Diesel (HMRC Advisory Rate ≤10 000 mi)' },
			{ category: 'UTILITY', ratePerUnit: 0.25, label: 'Van/Utility (HMRC Advisory Rate)' }
		]
	},
	SE: {
		unit: 'km',
		currency: 'SEK',
		rates: [
			{ category: 'ELECTRIC', ratePerUnit: 1.50, label: 'Elbil (Skatteverket)' },
			{ category: 'HYBRID', ratePerUnit: 1.85, label: 'Laddhybrid (Skatteverket)' },
			{ category: 'THERMAL', ratePerUnit: 2.50, label: 'Bensin/Diesel (Skatteverket)' },
			{ category: 'UTILITY', ratePerUnit: 2.50, label: 'Transportbil (Skatteverket)' }
		]
	},
	NO: {
		unit: 'km',
		currency: 'NOK',
		rates: [
			{ category: 'ELECTRIC', ratePerUnit: 2.00, label: 'Elbil (Skatteetaten)' },
			{ category: 'HYBRID', ratePerUnit: 3.50, label: 'Hybridbil (Skatteetaten)' },
			{ category: 'THERMAL', ratePerUnit: 3.50, label: 'Bensin/Diesel (Skatteetaten)' },
			{ category: 'UTILITY', ratePerUnit: 3.50, label: 'Varebil (Skatteetaten)' }
		]
	},
	DK: {
		unit: 'km',
		currency: 'DKK',
		rates: [
			{ category: 'ELECTRIC', ratePerUnit: 2.19, label: 'Elbil (SKAT)' },
			{ category: 'HYBRID', ratePerUnit: 2.19, label: 'Hybridbil (SKAT)' },
			{ category: 'THERMAL', ratePerUnit: 2.19, label: 'Benzin/Diesel (SKAT)' },
			{ category: 'UTILITY', ratePerUnit: 2.19, label: 'Varevogn (SKAT)' }
		]
	}
};

export const FALLBACK_RATES = DEFAULT_RATES_BY_COUNTRY['FR'];

export function getDefaultRates(country?: string | null): typeof FALLBACK_RATES {
	if (!country) return FALLBACK_RATES;
	return DEFAULT_RATES_BY_COUNTRY[country.toUpperCase()] ?? FALLBACK_RATES;
}

export function calculateMileageAmount(distance: number, ratePerUnit: number): number {
	return Math.round(distance * ratePerUnit * 100) / 100;
}

export function getRateForCategory(
	rates: MileageRate[],
	category: VehicleCategory
): MileageRate | undefined {
	return rates.find((r) => r.category === category);
}

export const CATEGORY_LABELS: Record<VehicleCategory, string> = {
	ELECTRIC: 'Électrique / Electric',
	HYBRID: 'Hybride / Hybrid',
	THERMAL: 'Thermique / Petrol-Diesel',
	UTILITY: 'Utilitaire / Van'
};

export const CURRENCY_SYMBOLS: Record<SupportedCurrency, string> = {
	EUR: '€',
	GBP: '£',
	SEK: 'kr',
	NOK: 'kr',
	DKK: 'kr'
};
