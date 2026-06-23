import { v } from 'convex/values';
import { query, internalMutation } from './_generated/server';

const networkValidator = v.union(
	v.literal('NORAUTO'),
	v.literal('SPEEDY'),
	v.literal('MIDAS'),
	v.literal('INDEPENDENT')
);

export const listGarages = query({
	args: {
		city: v.optional(v.string()),
		network: v.optional(networkValidator),
		partnerOnly: v.optional(v.boolean())
	},
	handler: async (ctx, { city, network, partnerOnly }) => {
		let garages;

		if (city) {
			garages = await ctx.db
				.query('garages')
				.withIndex('by_city', (q) => q.eq('city', city))
				.collect();
		} else {
			garages = await ctx.db.query('garages').collect();
		}

		if (network) garages = garages.filter((g) => g.network === network);
		if (partnerOnly) garages = garages.filter((g) => g.isPartner);

		return garages;
	}
});

export const findNearbyGarages = query({
	args: {
		zipcode: v.string(),
		radius: v.optional(v.number())
	},
	handler: async (ctx, { zipcode }) => {
		const dept = zipcode.slice(0, 2);
		const garages = await ctx.db.query('garages').collect();

		return garages
			.filter((g) => g.zipcode.startsWith(dept))
			.sort((a, b) => Number(b.isPartner) - Number(a.isPartner))
			.slice(0, 10);
	}
});

const SEED_DATA = [
	{
		name: 'Norauto Paris Nation',
		network: 'NORAUTO' as const,
		address: '8 Place de la Nation',
		city: 'Paris',
		zipcode: '75011',
		phone: '01 43 73 00 00',
		email: 'paris-nation@norauto.fr',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS'],
		avgRating: 4.2,
		isPartner: true
	},
	{
		name: 'Speedy Paris Montparnasse',
		network: 'SPEEDY' as const,
		address: '15 Rue du Commandant Mouchotte',
		city: 'Paris',
		zipcode: '75014',
		phone: '01 45 38 00 00',
		email: 'montparnasse@speedy.fr',
		services: ['VIDANGE', 'FREINS', 'PNEUS'],
		avgRating: 4.0,
		isPartner: true
	},
	{
		name: 'Midas Lyon Part-Dieu',
		network: 'MIDAS' as const,
		address: '22 Cours Lafayette',
		city: 'Lyon',
		zipcode: '69003',
		phone: '04 72 00 00 00',
		email: 'lyon-partdieu@midas.fr',
		services: ['REVISION', 'VIDANGE', 'FREINS'],
		avgRating: 4.1,
		isPartner: true
	},
	{
		name: 'Norauto Lyon Confluence',
		network: 'NORAUTO' as const,
		address: '112 Cours Charlemagne',
		city: 'Lyon',
		zipcode: '69002',
		phone: '04 72 00 11 00',
		email: 'lyon-confluence@norauto.fr',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS'],
		avgRating: 4.3,
		isPartner: true
	},
	{
		name: 'Speedy Marseille Prado',
		network: 'SPEEDY' as const,
		address: '124 Avenue du Prado',
		city: 'Marseille',
		zipcode: '13008',
		phone: '04 91 00 00 00',
		email: 'marseille-prado@speedy.fr',
		services: ['VIDANGE', 'PNEUS'],
		avgRating: 3.9,
		isPartner: true
	},
	{
		name: 'Garage Indépendant Castellane',
		network: 'INDEPENDENT' as const,
		address: '5 Place Castellane',
		city: 'Marseille',
		zipcode: '13006',
		phone: '04 91 12 34 56',
		services: ['REVISION', 'VIDANGE', 'FREINS', 'AUTRE'],
		avgRating: 4.5,
		isPartner: false
	},
	{
		name: 'Norauto Bordeaux Mériadeck',
		network: 'NORAUTO' as const,
		address: '18 Rue Claude Bonnier',
		city: 'Bordeaux',
		zipcode: '33000',
		phone: '05 56 00 00 00',
		email: 'bordeaux@norauto.fr',
		services: ['REVISION', 'VIDANGE', 'PNEUS'],
		avgRating: 4.2,
		isPartner: true
	},
	{
		name: 'Midas Bordeaux Bacalan',
		network: 'MIDAS' as const,
		address: '40 Quai de Bacalan',
		city: 'Bordeaux',
		zipcode: '33300',
		phone: '05 56 11 00 00',
		email: 'bordeaux-bacalan@midas.fr',
		services: ['REVISION', 'VIDANGE', 'FREINS'],
		avgRating: 4.0,
		isPartner: false
	},
	{
		name: 'Speedy Lille Euralille',
		network: 'SPEEDY' as const,
		address: '20 Place François Mitterrand',
		city: 'Lille',
		zipcode: '59777',
		phone: '03 20 00 00 00',
		email: 'lille@speedy.fr',
		services: ['VIDANGE', 'PNEUS', 'FREINS'],
		avgRating: 4.1,
		isPartner: true
	},
	{
		name: 'Garage Auto Lille Wazemmes',
		network: 'INDEPENDENT' as const,
		address: '12 Rue Gambetta',
		city: 'Lille',
		zipcode: '59000',
		phone: '03 20 12 34 56',
		services: ['REVISION', 'VIDANGE', 'PNEUS', 'FREINS', 'AUTRE'],
		avgRating: 4.6,
		isPartner: false
	}
];

export const seedGarages = internalMutation({
	args: {},
	handler: async (ctx) => {
		const existing = await ctx.db.query('garages').first();
		if (existing) return 0;

		const now = Date.now();
		for (const garage of SEED_DATA) {
			await ctx.db.insert('garages', { ...garage, createdAt: now });
		}

		return SEED_DATA.length;
	}
});
