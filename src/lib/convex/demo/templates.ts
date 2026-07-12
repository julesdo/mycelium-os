export type DemoTemplateId =
	| 'services'
	| 'btp'
	| 'distribution'
	| 'sante'
	| 'commerce'
	| 'vtc'
	| 'public';

export type VehicleSpec = {
	brand: string;
	model: string;
	category: 'PASSENGER' | 'UTILITY' | 'TRUCK';
	energy: 'THERMAL' | 'HYBRID' | 'ELECTRIC';
	weight: number;
};

export type DemoTemplate = {
	id: DemoTemplateId;
	label: string;
	emoji: string;
	description: string;
	fleetRange: [number, number];
	vehicleSpecs: VehicleSpec[];
	conductorFirstNames: string[];
	conductorLastNames: string[];
	utilizationRate: number;
	avgKmPerVehiclePerMonth: number;
	avgCostPerKm: number;
};

export const DEMO_TEMPLATES: Record<DemoTemplateId, DemoTemplate> = {
	services: {
		id: 'services',
		label: 'Services B2B / Conseil',
		emoji: '💼',
		description: 'ESN, cabinets de conseil, agences, assureurs',
		fleetRange: [20, 80],
		vehicleSpecs: [
			{ brand: 'Peugeot', model: '408', category: 'PASSENGER', energy: 'HYBRID', weight: 25 },
			{ brand: 'Renault', model: 'Mégane E-Tech', category: 'PASSENGER', energy: 'ELECTRIC', weight: 20 },
			{ brand: 'Peugeot', model: '3008', category: 'PASSENGER', energy: 'HYBRID', weight: 20 },
			{ brand: 'Renault', model: 'Arkana', category: 'PASSENGER', energy: 'HYBRID', weight: 15 },
			{ brand: 'Renault', model: 'Express Van', category: 'UTILITY', energy: 'THERMAL', weight: 10 },
			{ brand: 'BMW', model: 'Série 3', category: 'PASSENGER', energy: 'HYBRID', weight: 5 },
			{ brand: 'Tesla', model: 'Model 3', category: 'PASSENGER', energy: 'ELECTRIC', weight: 5 }
		],
		conductorFirstNames: ['Thomas', 'Sophie', 'Lucas', 'Emma', 'Hugo', 'Camille', 'Nicolas', 'Léa', 'Antoine', 'Marie'],
		conductorLastNames: ['Martin', 'Bernard', 'Dubois', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefevre', 'Garcia', 'David'],
		utilizationRate: 0.72,
		avgKmPerVehiclePerMonth: 2800,
		avgCostPerKm: 0.42
	},
	btp: {
		id: 'btp',
		label: 'BTP / Construction',
		emoji: '🏗️',
		description: 'Entreprises générales, électriciens, HVAC',
		fleetRange: [25, 120],
		vehicleSpecs: [
			{ brand: 'Renault', model: 'Master', category: 'UTILITY', energy: 'THERMAL', weight: 40 },
			{ brand: 'Mercedes', model: 'Sprinter', category: 'UTILITY', energy: 'THERMAL', weight: 20 },
			{ brand: 'Renault', model: 'Express', category: 'UTILITY', energy: 'THERMAL', weight: 25 },
			{ brand: 'Toyota', model: 'Hilux', category: 'UTILITY', energy: 'THERMAL', weight: 10 },
			{ brand: 'Peugeot', model: '308', category: 'PASSENGER', energy: 'HYBRID', weight: 5 }
		],
		conductorFirstNames: ['Franck', 'David', 'Julien', 'Pierre', 'Sébastien', 'Laurent', 'Christophe', 'Stéphane'],
		conductorLastNames: ['Petit', 'Robert', 'Richard', 'Durand', 'Girard', 'Bonneau', 'Lambert', 'Fontaine'],
		utilizationRate: 0.84,
		avgKmPerVehiclePerMonth: 4200,
		avgCostPerKm: 0.38
	},
	distribution: {
		id: 'distribution',
		label: 'Distribution / Livraison',
		emoji: '📦',
		description: 'Logistique last-mile, e-commerce, grossistes',
		fleetRange: [30, 150],
		vehicleSpecs: [
			{ brand: 'Renault', model: 'Master', category: 'UTILITY', energy: 'ELECTRIC', weight: 30 },
			{ brand: 'Citroën', model: 'Jumper', category: 'UTILITY', energy: 'THERMAL', weight: 25 },
			{ brand: 'Renault', model: 'Kangoo E-Tech', category: 'UTILITY', energy: 'ELECTRIC', weight: 30 },
			{ brand: 'VW', model: 'Caddy', category: 'UTILITY', energy: 'THERMAL', weight: 10 },
			{ brand: 'Toyota', model: 'Yaris Cross', category: 'PASSENGER', energy: 'HYBRID', weight: 5 }
		],
		conductorFirstNames: ['Mehdi', 'Kevin', 'Théo', 'Samy', 'Bryan', 'Romain', 'Alexis', 'Kévin'],
		conductorLastNames: ['Dupont', 'Leroy', 'Moreau', 'Chevalier', 'Perrin', 'Colin', 'Mercier', 'Roux'],
		utilizationRate: 0.91,
		avgKmPerVehiclePerMonth: 5100,
		avgCostPerKm: 0.31
	},
	sante: {
		id: 'sante',
		label: 'Santé / Médico-social',
		emoji: '🏥',
		description: 'Cliniques, SSIAD, HAD, aide à domicile',
		fleetRange: [15, 60],
		vehicleSpecs: [
			{ brand: 'Renault', model: 'Clio E-Tech', category: 'PASSENGER', energy: 'HYBRID', weight: 35 },
			{ brand: 'Peugeot', model: '208', category: 'PASSENGER', energy: 'ELECTRIC', weight: 25 },
			{ brand: 'Renault', model: 'Kangoo Maxi', category: 'UTILITY', energy: 'HYBRID', weight: 25 },
			{ brand: 'Toyota', model: 'Yaris Cross', category: 'PASSENGER', energy: 'HYBRID', weight: 15 }
		],
		conductorFirstNames: ['Isabelle', 'Nathalie', 'Sylvie', 'Valérie', 'Christine', 'Sandrine', 'Laure', 'Julie'],
		conductorLastNames: ['Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Lefèvre', 'Simon', 'Michel'],
		utilizationRate: 0.68,
		avgKmPerVehiclePerMonth: 1900,
		avgCostPerKm: 0.29
	},
	commerce: {
		id: 'commerce',
		label: 'Commerce / VRP',
		emoji: '🤝',
		description: 'Représentants, négoce, distribution non-alimentaire',
		fleetRange: [20, 80],
		vehicleSpecs: [
			{ brand: 'Peugeot', model: '308', category: 'PASSENGER', energy: 'HYBRID', weight: 30 },
			{ brand: 'VW', model: 'Passat', category: 'PASSENGER', energy: 'HYBRID', weight: 20 },
			{ brand: 'VW', model: 'Tiguan', category: 'PASSENGER', energy: 'HYBRID', weight: 20 },
			{ brand: 'Renault', model: 'Kangoo', category: 'UTILITY', energy: 'ELECTRIC', weight: 20 },
			{ brand: 'Renault', model: 'Express', category: 'UTILITY', energy: 'THERMAL', weight: 10 }
		],
		conductorFirstNames: ['Marc', 'Philippe', 'François', 'Jean-Pierre', 'Éric', 'Olivier', 'Pascal', 'Thierry'],
		conductorLastNames: ['Lambert', 'Rousseau', 'Morin', 'Girard', 'André', 'Lefebvre', 'Simon', 'Blanc'],
		utilizationRate: 0.76,
		avgKmPerVehiclePerMonth: 3600,
		avgCostPerKm: 0.44
	},
	vtc: {
		id: 'vtc',
		label: 'VTC Premium / Chauffeurs',
		emoji: '🚗',
		description: "VTC B2B, chauffeurs d'affaires, shuttles aéroport",
		fleetRange: [10, 50],
		vehicleSpecs: [
			{ brand: 'Tesla', model: 'Model 3', category: 'PASSENGER', energy: 'ELECTRIC', weight: 30 },
			{ brand: 'BMW', model: 'i5', category: 'PASSENGER', energy: 'ELECTRIC', weight: 20 },
			{ brand: 'Mercedes', model: 'Classe E PHEV', category: 'PASSENGER', energy: 'HYBRID', weight: 25 },
			{ brand: 'Mercedes', model: 'Classe V', category: 'UTILITY', energy: 'THERMAL', weight: 15 },
			{ brand: 'BMW', model: 'X5', category: 'PASSENGER', energy: 'HYBRID', weight: 10 }
		],
		conductorFirstNames: ['Karim', 'Samir', 'Youssef', 'Mohamed', 'Ali', 'Hassan', 'Rachid', 'Nabil'],
		conductorLastNames: ['Benali', 'Kader', 'Mansouri', 'Bouali', 'Hamdi', 'Saidani', 'Bouzid', 'Lazreg'],
		utilizationRate: 0.89,
		avgKmPerVehiclePerMonth: 7200,
		avgCostPerKm: 0.52
	},
	public: {
		id: 'public',
		label: 'Secteur Public / Collectivités',
		emoji: '🏛️',
		description: 'Mairies, intercommunalités, offices HLM',
		fleetRange: [15, 60],
		vehicleSpecs: [
			{ brand: 'Peugeot', model: 'Partner', category: 'UTILITY', energy: 'ELECTRIC', weight: 30 },
			{ brand: 'Renault', model: 'Express', category: 'UTILITY', energy: 'ELECTRIC', weight: 20 },
			{ brand: 'Renault', model: 'Clio', category: 'PASSENGER', energy: 'ELECTRIC', weight: 20 },
			{ brand: 'Peugeot', model: '208', category: 'PASSENGER', energy: 'HYBRID', weight: 15 },
			{ brand: 'Peugeot', model: '3008', category: 'PASSENGER', energy: 'HYBRID', weight: 15 }
		],
		conductorFirstNames: ['Alain', 'Michel', 'Gérard', 'Bernard', 'Claude', 'Jean', 'Pierre', 'Paul'],
		conductorLastNames: ['Gilles', 'Adam', 'Renard', 'Charpentier', 'Chevallier', 'Brun', 'Colin', 'Denis'],
		utilizationRate: 0.65,
		avgKmPerVehiclePerMonth: 1800,
		avgCostPerKm: 0.33
	}
};

export function pickVehicleSpec(specs: VehicleSpec[]): VehicleSpec {
	const total = specs.reduce((sum, s) => sum + s.weight, 0);
	let rand = Math.random() * total;
	for (const spec of specs) {
		rand -= spec.weight;
		if (rand <= 0) return spec;
	}
	return specs[specs.length - 1];
}
