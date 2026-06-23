type GarageEntry = {
	name: string;
	network: 'NORAUTO' | 'SPEEDY';
	address: string;
	city: string;
	zipcode: string;
	phone: string;
	services: string[];
	isPartner: boolean;
	avgRating?: number;
};

export const GARAGES_SEED: GarageEntry[] = [
	// ── Paris (13) ──────────────────────────────────────────────────────────
	{
		name: 'Norauto Paris Bercy',
		network: 'NORAUTO',
		address: '128 Quai de Bercy',
		city: 'Paris',
		zipcode: '75012',
		phone: '01 43 40 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.2
	},
	{
		name: 'Norauto Paris La Défense',
		network: 'NORAUTO',
		address: 'Centre Commercial Les Quatre Temps, 15 Parvis de La Défense',
		city: 'Puteaux',
		zipcode: '92800',
		phone: '01 47 73 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.0
	},
	{
		name: 'Norauto Paris Porte de la Chapelle',
		network: 'NORAUTO',
		address: 'Centre Commercial Europacity, 2 Rue de la Chapelle',
		city: 'Paris',
		zipcode: '75018',
		phone: '01 53 09 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'CARROSSERIE'],
		isPartner: true,
		avgRating: 4.1
	},
	{
		name: 'Norauto Rosny-sous-Bois',
		network: 'NORAUTO',
		address: 'Centre Commercial Rosny 2, 6 Voie Félix-Éboué',
		city: 'Rosny-sous-Bois',
		zipcode: '93110',
		phone: '01 48 94 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'CARROSSERIE', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.3
	},
	{
		name: 'Norauto Vélizy',
		network: 'NORAUTO',
		address: 'Centre Commercial Vélizy 2, 2 Avenue de l\'Europe',
		city: 'Vélizy-Villacoublay',
		zipcode: '78140',
		phone: '01 34 65 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.4
	},
	{
		name: 'Norauto Créteil',
		network: 'NORAUTO',
		address: 'Centre Commercial Créteil Soleil, 1 Place Salvador Allende',
		city: 'Créteil',
		zipcode: '94000',
		phone: '01 45 17 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'CARROSSERIE'],
		isPartner: true,
		avgRating: 4.0
	},
	{
		name: 'Speedy Paris Nation',
		network: 'SPEEDY',
		address: '8 Place de la Nation',
		city: 'Paris',
		zipcode: '75011',
		phone: '01 43 73 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 3.9
	},
	{
		name: 'Speedy Paris Montparnasse',
		network: 'SPEEDY',
		address: '35 Rue du Départ',
		city: 'Paris',
		zipcode: '75014',
		phone: '01 45 38 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 4.0
	},
	{
		name: 'Speedy Paris République',
		network: 'SPEEDY',
		address: '42 Boulevard du Temple',
		city: 'Paris',
		zipcode: '75003',
		phone: '01 42 71 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS'],
		isPartner: true,
		avgRating: 3.8
	},
	{
		name: 'Speedy Ivry-sur-Seine',
		network: 'SPEEDY',
		address: '117 Avenue de la République',
		city: 'Ivry-sur-Seine',
		zipcode: '94200',
		phone: '01 46 71 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 4.1
	},
	{
		name: 'Speedy Nanterre',
		network: 'SPEEDY',
		address: '56 Rue du Maréchal Joffre',
		city: 'Nanterre',
		zipcode: '92000',
		phone: '01 46 97 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 3.9
	},
	{
		name: 'Speedy Bobigny',
		network: 'SPEEDY',
		address: '5 Avenue Édouard Vaillant',
		city: 'Bobigny',
		zipcode: '93000',
		phone: '01 48 30 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS'],
		isPartner: true,
		avgRating: 3.7
	},
	{
		name: 'Speedy Versailles',
		network: 'SPEEDY',
		address: '28 Rue des États Généraux',
		city: 'Versailles',
		zipcode: '78000',
		phone: '01 39 51 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 4.2
	},

	// ── Lyon (7) ─────────────────────────────────────────────────────────────
	{
		name: 'Norauto Lyon Confluence',
		network: 'NORAUTO',
		address: '112 Cours Charlemagne',
		city: 'Lyon',
		zipcode: '69002',
		phone: '04 72 41 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.3
	},
	{
		name: 'Norauto Lyon Porte des Alpes',
		network: 'NORAUTO',
		address: 'Centre Commercial Porte des Alpes, Rue du Tremblay',
		city: 'Saint-Priest',
		zipcode: '69800',
		phone: '04 78 21 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'CARROSSERIE', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.4
	},
	{
		name: 'Norauto Vénissieux',
		network: 'NORAUTO',
		address: '220 Route de Vienne',
		city: 'Vénissieux',
		zipcode: '69200',
		phone: '04 78 76 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'CARROSSERIE'],
		isPartner: true,
		avgRating: 4.1
	},
	{
		name: 'Norauto Lyon Vaise',
		network: 'NORAUTO',
		address: '66 Rue Pierre Audry',
		city: 'Lyon',
		zipcode: '69009',
		phone: '04 78 83 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS'],
		isPartner: true,
		avgRating: 4.0
	},
	{
		name: 'Speedy Lyon Part-Dieu',
		network: 'SPEEDY',
		address: '66 Rue Servient',
		city: 'Lyon',
		zipcode: '69003',
		phone: '04 72 36 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 4.0
	},
	{
		name: 'Speedy Lyon Gerland',
		network: 'SPEEDY',
		address: '4 Avenue Tony Garnier',
		city: 'Lyon',
		zipcode: '69007',
		phone: '04 72 71 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS'],
		isPartner: true,
		avgRating: 3.9
	},
	{
		name: 'Speedy Bron',
		network: 'SPEEDY',
		address: '38 Avenue Franklin Roosevelt',
		city: 'Bron',
		zipcode: '69500',
		phone: '04 78 26 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 4.1
	},

	// ── Marseille (7) ────────────────────────────────────────────────────────
	{
		name: 'Norauto Marseille La Valentine',
		network: 'NORAUTO',
		address: 'Centre Commercial La Valentine, 348 Chemin du Littoral',
		city: 'Marseille',
		zipcode: '13011',
		phone: '04 91 43 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'CARROSSERIE', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.2
	},
	{
		name: 'Norauto Marseille Grand Littoral',
		network: 'NORAUTO',
		address: 'Centre Commercial Grand Littoral, 200 Avenue du Capitaine Gèze',
		city: 'Marseille',
		zipcode: '13015',
		phone: '04 91 90 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.0
	},
	{
		name: 'Norauto Aubagne',
		network: 'NORAUTO',
		address: 'Zone Commerciale La Toison d\'Or, Boulevard des Temps Modernes',
		city: 'Aubagne',
		zipcode: '13400',
		phone: '04 42 18 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'CARROSSERIE'],
		isPartner: true,
		avgRating: 4.3
	},
	{
		name: 'Speedy Marseille Prado',
		network: 'SPEEDY',
		address: '124 Avenue du Prado',
		city: 'Marseille',
		zipcode: '13008',
		phone: '04 91 25 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 3.9
	},
	{
		name: 'Speedy Marseille Saint-Loup',
		network: 'SPEEDY',
		address: '142 Boulevard de Saint-Loup',
		city: 'Marseille',
		zipcode: '13010',
		phone: '04 91 79 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS'],
		isPartner: true,
		avgRating: 3.8
	},
	{
		name: 'Speedy Marseille Baille',
		network: 'SPEEDY',
		address: '85 Boulevard Baille',
		city: 'Marseille',
		zipcode: '13005',
		phone: '04 91 94 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 4.0
	},
	{
		name: 'Speedy Aix-en-Provence',
		network: 'SPEEDY',
		address: '30 Rue Marcel Roncin',
		city: 'Aix-en-Provence',
		zipcode: '13100',
		phone: '04 42 27 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 4.2
	},

	// ── Toulouse (6) ─────────────────────────────────────────────────────────
	{
		name: 'Norauto Toulouse Blagnac',
		network: 'NORAUTO',
		address: 'Centre Commercial Leclerc Blagnac, 1 Avenue du Parc',
		city: 'Blagnac',
		zipcode: '31700',
		phone: '05 61 71 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.3
	},
	{
		name: 'Norauto Toulouse Saint-Agne',
		network: 'NORAUTO',
		address: 'Zone Commerciale Saint-Agne, 22 Boulevard de la Marquette',
		city: 'Toulouse',
		zipcode: '31500',
		phone: '05 61 54 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'CARROSSERIE'],
		isPartner: true,
		avgRating: 4.1
	},
	{
		name: 'Norauto Colomiers',
		network: 'NORAUTO',
		address: 'Zone Commerciale de la Piste, 3 Chemin du Pigeonnier',
		city: 'Colomiers',
		zipcode: '31770',
		phone: '05 61 78 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'CARROSSERIE', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.4
	},
	{
		name: 'Speedy Toulouse Purpan',
		network: 'SPEEDY',
		address: '18 Chemin de Purpan',
		city: 'Toulouse',
		zipcode: '31300',
		phone: '05 61 42 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 3.9
	},
	{
		name: 'Speedy Toulouse Rangueil',
		network: 'SPEEDY',
		address: '7 Avenue des Crêtes',
		city: 'Toulouse',
		zipcode: '31400',
		phone: '05 61 55 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS'],
		isPartner: true,
		avgRating: 3.8
	},
	{
		name: 'Speedy Labège',
		network: 'SPEEDY',
		address: '2 Rue Hermès',
		city: 'Labège',
		zipcode: '31670',
		phone: '05 61 00 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 4.0
	},

	// ── Bordeaux (6) ─────────────────────────────────────────────────────────
	{
		name: 'Norauto Bordeaux Mériadeck',
		network: 'NORAUTO',
		address: 'Centre Commercial Mériadeck, 18 Rue Claude Bonnier',
		city: 'Bordeaux',
		zipcode: '33000',
		phone: '05 56 44 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.2
	},
	{
		name: 'Norauto Bordeaux Lac',
		network: 'NORAUTO',
		address: 'Centre Commercial Bordeaux Lac, Avenue du Parc',
		city: 'Bordeaux',
		zipcode: '33300',
		phone: '05 56 43 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'CARROSSERIE', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.3
	},
	{
		name: 'Norauto Mérignac',
		network: 'NORAUTO',
		address: 'Zone Commerciale de la Galaxie, 5 Avenue du Médoc',
		city: 'Mérignac',
		zipcode: '33700',
		phone: '05 56 34 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'CARROSSERIE'],
		isPartner: true,
		avgRating: 4.1
	},
	{
		name: 'Speedy Bordeaux Bacalan',
		network: 'SPEEDY',
		address: '40 Quai de Bacalan',
		city: 'Bordeaux',
		zipcode: '33300',
		phone: '05 56 11 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 4.0
	},
	{
		name: 'Speedy Bordeaux Chartrons',
		network: 'SPEEDY',
		address: '27 Rue Notre-Dame',
		city: 'Bordeaux',
		zipcode: '33000',
		phone: '05 56 51 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS'],
		isPartner: true,
		avgRating: 3.9
	},
	{
		name: 'Speedy Pessac',
		network: 'SPEEDY',
		address: '65 Avenue Léon Blum',
		city: 'Pessac',
		zipcode: '33600',
		phone: '05 57 26 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 4.1
	},

	// ── Nantes (5) ───────────────────────────────────────────────────────────
	{
		name: 'Norauto Nantes Atlantis',
		network: 'NORAUTO',
		address: 'Centre Commercial Atlantis, 1 Rue du Moulin',
		city: 'Saint-Herblain',
		zipcode: '44800',
		phone: '02 40 92 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'CARROSSERIE', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.4
	},
	{
		name: 'Norauto Nantes Rezé',
		network: 'NORAUTO',
		address: 'Zone Commerciale Atout Sud, 3 Rue des Quatre Croix',
		city: 'Rezé',
		zipcode: '44400',
		phone: '02 40 75 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.2
	},
	{
		name: 'Norauto Nantes Carquefou',
		network: 'NORAUTO',
		address: 'Parc de Loisirs, 2 Rue des Fusains',
		city: 'Carquefou',
		zipcode: '44470',
		phone: '02 40 50 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS'],
		isPartner: true,
		avgRating: 4.0
	},
	{
		name: 'Speedy Nantes Bellevue',
		network: 'SPEEDY',
		address: '27 Boulevard de l\'Égalité',
		city: 'Nantes',
		zipcode: '44100',
		phone: '02 40 49 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 3.9
	},
	{
		name: 'Speedy Saint-Nazaire',
		network: 'SPEEDY',
		address: '6 Boulevard Albert de Mun',
		city: 'Saint-Nazaire',
		zipcode: '44600',
		phone: '02 40 22 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 4.0
	},

	// ── Lille (6) ────────────────────────────────────────────────────────────
	{
		name: 'Norauto Lille Euralille',
		network: 'NORAUTO',
		address: 'Centre Commercial Euralille, 20 Place François Mitterrand',
		city: 'Lille',
		zipcode: '59777',
		phone: '03 20 06 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.1
	},
	{
		name: 'Norauto Villeneuve-d\'Ascq',
		network: 'NORAUTO',
		address: 'Centre Commercial V2, Avenue De Gaulle',
		city: "Villeneuve-d'Ascq",
		zipcode: '59650',
		phone: '03 20 91 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'CARROSSERIE', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.3
	},
	{
		name: 'Norauto Lesquin',
		network: 'NORAUTO',
		address: 'Zone Commerciale, 3 Rue des Charmes',
		city: 'Lesquin',
		zipcode: '59810',
		phone: '03 20 87 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'CARROSSERIE'],
		isPartner: true,
		avgRating: 4.2
	},
	{
		name: 'Speedy Lille Moulins',
		network: 'SPEEDY',
		address: '168 Rue du Faubourg de Roubaix',
		city: 'Lille',
		zipcode: '59800',
		phone: '03 20 55 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 3.8
	},
	{
		name: 'Speedy Roubaix',
		network: 'SPEEDY',
		address: '22 Avenue Jean Jaurès',
		city: 'Roubaix',
		zipcode: '59100',
		phone: '03 20 73 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS'],
		isPartner: true,
		avgRating: 3.9
	},
	{
		name: 'Speedy Tourcoing',
		network: 'SPEEDY',
		address: '15 Rue de Gand',
		city: 'Tourcoing',
		zipcode: '59200',
		phone: '03 20 24 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 4.0
	},

	// ── Strasbourg (6) ───────────────────────────────────────────────────────
	{
		name: 'Norauto Strasbourg Hautepierre',
		network: 'NORAUTO',
		address: 'Centre Commercial Hautepierre, Allée Kastner',
		city: 'Strasbourg',
		zipcode: '67200',
		phone: '03 88 28 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.1
	},
	{
		name: 'Norauto Strasbourg La Vigie',
		network: 'NORAUTO',
		address: 'Zone Commerciale La Vigie, Route du Rhin',
		city: 'Strasbourg',
		zipcode: '67100',
		phone: '03 88 61 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'CARROSSERIE', 'ELECTRICITE'],
		isPartner: true,
		avgRating: 4.3
	},
	{
		name: 'Norauto Illkirch',
		network: 'NORAUTO',
		address: 'Centre Commercial Rivetoile, 8 Route du Rhin',
		city: 'Illkirch-Graffenstaden',
		zipcode: '67400',
		phone: '03 88 40 02 02',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS'],
		isPartner: true,
		avgRating: 4.2
	},
	{
		name: 'Speedy Strasbourg Meinau',
		network: 'SPEEDY',
		address: '87 Route de Colmar',
		city: 'Strasbourg',
		zipcode: '67100',
		phone: '03 88 34 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 3.9
	},
	{
		name: 'Speedy Strasbourg Neudorf',
		network: 'SPEEDY',
		address: '15 Rue de Wissembourg',
		city: 'Strasbourg',
		zipcode: '67100',
		phone: '03 88 40 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS'],
		isPartner: true,
		avgRating: 3.8
	},
	{
		name: 'Speedy Schiltigheim',
		network: 'SPEEDY',
		address: '24 Rue de la Paix',
		city: 'Schiltigheim',
		zipcode: '67300',
		phone: '03 88 62 50 50',
		services: ['VIDANGE', 'PNEUS', 'FREINS', 'REVISION'],
		isPartner: true,
		avgRating: 4.0
	}
];
