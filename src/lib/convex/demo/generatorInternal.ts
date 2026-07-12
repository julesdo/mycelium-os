import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import type { DemoTemplateId } from './templates';

export const createDemoOrgInternal = internalMutation({
	args: {
		name: v.string(),
		country: v.string(),
		templateId: v.string(),
		createdBy: v.string(),
		commercialName: v.string(),
		commercialPhone: v.string(),
		commercialCalendlyUrl: v.optional(v.string()),
		prospectName: v.string(),
		prospectEmail: v.optional(v.string()),
		prospectCity: v.optional(v.string()),
		notes: v.optional(v.string()),
		expiresAt: v.number()
	},
	handler: async (ctx, args) => {
		const isNordic = ['SE', 'NO', 'DK'].includes(args.country);
		const currency = args.country === 'GB' ? 'GBP' : 'EUR';
		const locale = args.country === 'GB' ? 'en-GB' : isNordic ? 'sv-SE' : 'fr-FR';
		const timezone = args.country === 'GB' ? 'Europe/London' : 'Europe/Paris';
		const distanceUnit = args.country === 'GB' ? ('mile' as const) : ('km' as const);

		return await ctx.db.insert('organizations', {
			name: args.name,
			plan: 'flat',
			country: args.country,
			currency,
			locale,
			timezone,
			distanceUnit,
			paddlePlanTier: 'professional',
			isDemo: true,
			demoConfig: {
				templateId: args.templateId as DemoTemplateId,
				createdBy: args.createdBy,
				commercialName: args.commercialName,
				commercialPhone: args.commercialPhone,
				commercialCalendlyUrl: args.commercialCalendlyUrl,
				prospectName: args.prospectName,
				prospectEmail: args.prospectEmail,
				prospectCity: args.prospectCity,
				notes: args.notes,
				expiresAt: args.expiresAt,
				extendedCount: 0,
				isExpired: false
			},
			createdAt: Date.now()
		});
	}
});

export const createDemoVehicleInternal = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		brand: v.string(),
		model: v.string(),
		registration: v.string(),
		year: v.number(),
		energy: v.union(v.literal('THERMAL'), v.literal('HYBRID'), v.literal('ELECTRIC')),
		category: v.union(v.literal('PASSENGER'), v.literal('UTILITY'), v.literal('TRUCK'))
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert('vehicles', {
			...args,
			status: Math.random() > 0.1 ? 'AVAILABLE' : 'MAINTENANCE',
			kilometers: Math.floor(20000 + Math.random() * 80000),
			createdAt: Date.now()
		});
	}
});

export const createDemoTokenInternal = internalMutation({
	args: { token: v.string(), organizationId: v.id('organizations') },
	handler: async (ctx, args) => {
		await ctx.db.insert('demoAccessTokens', {
			token: args.token,
			organizationId: args.organizationId,
			createdAt: Date.now(),
			usedCount: 0
		});
	}
});

export const generateDemoHistoryInternal = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		vehicleIds: v.array(v.string()),
		conductorFirstNames: v.array(v.string()),
		conductorLastNames: v.array(v.string())
	},
	handler: async (ctx, { organizationId, vehicleIds, conductorFirstNames, conductorLastNames }) => {
		const now = Date.now();
		const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
		const purposes = ['Visite client', 'Déplacement siège', 'Formation', 'Rendez-vous fournisseur'];

		for (const vehicleIdStr of vehicleIds) {
			const vehicleId = vehicleIdStr as any;
			const reservationCount = 4 + Math.floor(Math.random() * 5);

			for (let r = 0; r < reservationCount; r++) {
				const startOffset = Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000;
				const startDate = thirtyDaysAgo + startOffset;
				const duration = (2 + Math.floor(Math.random() * 6)) * 60 * 60 * 1000;
				const firstName = conductorFirstNames[Math.floor(Math.random() * conductorFirstNames.length)];
				const lastName = conductorLastNames[Math.floor(Math.random() * conductorLastNames.length)];

				await ctx.db.insert('reservations', {
					organizationId: organizationId as any,
					vehicleId,
					userId: `demo-user-${firstName.toLowerCase()}-${lastName.toLowerCase()}`,
					startDate,
					endDate: startDate + duration,
					purpose: purposes[Math.floor(Math.random() * purposes.length)],
					status: 'COMPLETED',
					createdAt: startDate - 3600000,
					updatedAt: startDate + duration
				});
			}

			await ctx.db.insert('costs', {
				organizationId: organizationId as any,
				vehicleId,
				category: 'CARBURANT',
				amount: 60 + Math.floor(Math.random() * 120),
				date: thirtyDaysAgo + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000,
				description: 'Carburant démo',
				source: 'MANUAL',
				createdBy: 'demo-system',
				createdAt: Date.now()
			});
		}
	}
});
