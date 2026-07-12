import { v } from 'convex/values';
import { action } from '../_generated/server';
import { makeFunctionReference } from 'convex/server';
import { authComponent } from '../auth';
import type { BetterAuthUser } from '../admin/types';
import { DEMO_TEMPLATES, pickVehicleSpec, type DemoTemplateId } from './templates';

function generateDemoToken(): string {
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Use makeFunctionReference to avoid circular type dependency with _generated/api.d.ts
const _createDemoOrg = makeFunctionReference<'mutation'>('demo/generatorInternal:createDemoOrgInternal');
const _createDemoVehicle = makeFunctionReference<'mutation'>('demo/generatorInternal:createDemoVehicleInternal');
const _createDemoToken = makeFunctionReference<'mutation'>('demo/generatorInternal:createDemoTokenInternal');
const _generateDemoHistory = makeFunctionReference<'mutation'>('demo/generatorInternal:generateDemoHistoryInternal');

export const generateDemoOrg = action({
	args: {
		orgName: v.string(),
		templateId: v.string(),
		fleetSize: v.number(),
		country: v.string(),
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
	handler: async (ctx, args): Promise<{ orgId: string; token: string }> => {
		const user = (await authComponent.getAuthUser(ctx)) as BetterAuthUser | null;
		if (!user || user.role !== 'admin') {
			throw new Error('Unauthorized: Mycelium staff access required');
		}

		const template = DEMO_TEMPLATES[args.templateId as DemoTemplateId];
		if (!template) throw new Error(`Template inconnu : ${args.templateId}`);

		const orgId = (await ctx.runMutation(_createDemoOrg, {
			name: args.orgName,
			country: args.country,
			templateId: args.templateId,
			createdBy: args.createdBy,
			commercialName: args.commercialName,
			commercialPhone: args.commercialPhone,
			commercialCalendlyUrl: args.commercialCalendlyUrl,
			prospectName: args.prospectName,
			prospectEmail: args.prospectEmail,
			prospectCity: args.prospectCity,
			notes: args.notes,
			expiresAt: args.expiresAt
		})) as string;

		const vehicleIds: string[] = [];
		const clampedFleet = Math.max(
			template.fleetRange[0],
			Math.min(args.fleetSize, template.fleetRange[1])
		);

		for (let i = 0; i < clampedFleet; i++) {
			const spec = pickVehicleSpec(template.vehicleSpecs);
			const plateNum = String(Math.floor(Math.random() * 900) + 100);
			const plateSuffix =
				String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
				String.fromCharCode(65 + Math.floor(Math.random() * 26));
			const registration = `DM-${plateNum}-${plateSuffix}`;
			const year = 2021 + Math.floor(Math.random() * 4);

			const vehicleId = (await ctx.runMutation(_createDemoVehicle, {
				organizationId: orgId,
				brand: spec.brand,
				model: spec.model,
				registration,
				year,
				energy: spec.energy,
				category: spec.category
			})) as string;
			vehicleIds.push(vehicleId);
		}

		const token = generateDemoToken();
		await ctx.runMutation(_createDemoToken, { token, organizationId: orgId });

		await ctx.runMutation(_generateDemoHistory, {
			organizationId: orgId,
			vehicleIds,
			conductorFirstNames: template.conductorFirstNames,
			conductorLastNames: template.conductorLastNames
		});

		return { orgId, token };
	}
});
