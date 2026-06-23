// Barèmes fiscaux 2026 — hardcodés et versionnés. Ne jamais mettre en DB.
// Sources : arrêté du 2 janvier 2025 (AEN), article 1010 CGI + LFI 2026 (TVS).

// ─── Avantage en nature ───────────────────────────────────────────────────────

export const AEN_RATES_2026 = {
	year: 2026,
	forfaitaire: {
		// Véhicule appartenant à l'entreprise
		companyOwned: {
			withFuelPaid: 0.12,   // 12% du prix d'achat TTC
			withoutFuelPaid: 0.09 // 9% du prix d'achat TTC
		},
		// Véhicule loué / leasing
		leased: {
			withFuelPaid: 1.20,   // 120% du coût annuel (loyer + entretien + assurance)
			withoutFuelPaid: 1.00 // 100% du coût annuel
		}
	}
};

export function calculateAEN_Forfaitaire(
	vehicleAnnualCost: number,
	ownership: 'company' | 'leased',
	fuelPaidByCompany: boolean
): number {
	const rates = AEN_RATES_2026.forfaitaire;
	if (ownership === 'company') {
		return vehicleAnnualCost * (fuelPaidByCompany ? rates.companyOwned.withFuelPaid : rates.companyOwned.withoutFuelPaid);
	}
	return vehicleAnnualCost * (fuelPaidByCompany ? rates.leased.withFuelPaid : rates.leased.withoutFuelPaid);
}

export function calculateAEN_Reel(
	totalAnnualCost: number,
	totalKm: number,
	privateKm: number
): number {
	if (totalKm <= 0) return 0;
	return totalAnnualCost * (privateKm / totalKm);
}

// ─── TVS 2026 ────────────────────────────────────────────────────────────────

export const TVS_CO2_BANDS_2026 = [
	{ min: 0,   max: 20,       rate: 0 },
	{ min: 21,  max: 60,       rate: 1 },
	{ min: 61,  max: 100,      rate: 2 },
	{ min: 101, max: 120,      rate: 4.5 },
	{ min: 121, max: 140,      rate: 6.5 },
	{ min: 141, max: 160,      rate: 13 },
	{ min: 161, max: 200,      rate: 19.5 },
	{ min: 201, max: 250,      rate: 23.5 },
	{ min: 251, max: Infinity, rate: 29 }
] as const;

export function calculateTVS(co2Gkm: number): number {
	const band = TVS_CO2_BANDS_2026.find((b) => co2Gkm >= b.min && co2Gkm <= b.max);
	return band ? Math.round(co2Gkm * band.rate) : 0;
}

export function getTVSBand(co2Gkm: number): (typeof TVS_CO2_BANDS_2026)[number] | null {
	return TVS_CO2_BANDS_2026.find((b) => co2Gkm >= b.min && co2Gkm <= b.max) ?? null;
}

// ─── TVA récupérable 2026 (droit FR, VP tourisme) ────────────────────────────

export const TVA_RECOVERY_RATES_2026: Record<string, number> = {
	CARBURANT_DIESEL:   0.80,
	CARBURANT_ESSENCE:  0.00,
	CARBURANT_ELECTRIC: 1.00,
	CARBURANT_HYBRID:   0.80, // assimilé diesel pour VP hybride
	ENTRETIEN:          1.00,
	ASSURANCE:          0.00, // exonération légale
	LEASING:            0.00, // véhicule de tourisme
	PARKING:            1.00,
	TELEPEAGE:          1.00,
	TAXES:              0.00,
	SINISTRE:           0.00,
	AUTRE:              0.50  // taux conservateur par défaut
};

export function getTVARecoveryRate(
	category: string,
	energy: 'THERMAL' | 'HYBRID' | 'ELECTRIC'
): number {
	if (category === 'CARBURANT') {
		if (energy === 'ELECTRIC') return TVA_RECOVERY_RATES_2026.CARBURANT_ELECTRIC;
		if (energy === 'HYBRID')   return TVA_RECOVERY_RATES_2026.CARBURANT_HYBRID;
		return TVA_RECOVERY_RATES_2026.CARBURANT_DIESEL;
	}
	return TVA_RECOVERY_RATES_2026[category] ?? TVA_RECOVERY_RATES_2026.AUTRE;
}
