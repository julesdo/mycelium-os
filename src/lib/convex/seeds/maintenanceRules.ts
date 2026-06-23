type MaintenanceRuleEntry = {
	vehicleBrand: string;
	vehicleModel: string;
	maintenanceType: 'REVISION' | 'VIDANGE' | 'PNEUS' | 'FREINS';
	intervalKm: number;
	intervalMonths: number;
	estimatedCost: number;
};

type ModelSpec = { brand: string; model: string };

const FLEET_MODELS: ModelSpec[] = [
	// Renault
	{ brand: 'Renault', model: 'Clio' },
	{ brand: 'Renault', model: 'Captur' },
	{ brand: 'Renault', model: 'Mégane' },
	{ brand: 'Renault', model: 'Trafic' },
	{ brand: 'Renault', model: 'Master' },
	// Peugeot
	{ brand: 'Peugeot', model: '208' },
	{ brand: 'Peugeot', model: '308' },
	{ brand: 'Peugeot', model: '2008' },
	{ brand: 'Peugeot', model: '3008' },
	{ brand: 'Peugeot', model: 'Partner' },
	{ brand: 'Peugeot', model: 'Expert' },
	{ brand: 'Peugeot', model: 'Boxer' },
	// Citroën
	{ brand: 'Citroën', model: 'C3' },
	{ brand: 'Citroën', model: 'Berlingo' },
	{ brand: 'Citroën', model: 'Jumpy' },
	// Opel
	{ brand: 'Opel', model: 'Combo' },
	{ brand: 'Opel', model: 'Vivaro' },
	// Volkswagen
	{ brand: 'Volkswagen', model: 'Polo' },
	{ brand: 'Volkswagen', model: 'Golf' },
	{ brand: 'Volkswagen', model: 'Caddy' },
	// Ford
	{ brand: 'Ford', model: 'Transit' }
];

type RuleTemplate = {
	maintenanceType: 'REVISION' | 'VIDANGE' | 'PNEUS' | 'FREINS';
	intervalKm: number;
	intervalMonths: number;
	estimatedCost: number;
};

const STANDARD_RULES: RuleTemplate[] = [
	{ maintenanceType: 'REVISION', intervalKm: 30000, intervalMonths: 24, estimatedCost: 350 },
	{ maintenanceType: 'VIDANGE', intervalKm: 15000, intervalMonths: 12, estimatedCost: 180 },
	{ maintenanceType: 'PNEUS', intervalKm: 50000, intervalMonths: 36, estimatedCost: 600 },
	{ maintenanceType: 'FREINS', intervalKm: 60000, intervalMonths: 48, estimatedCost: 450 }
];

export const MAINTENANCE_RULES_SEED: MaintenanceRuleEntry[] = FLEET_MODELS.flatMap((model) =>
	STANDARD_RULES.map((rule) => ({
		vehicleBrand: model.brand,
		vehicleModel: model.model,
		...rule
	}))
);
