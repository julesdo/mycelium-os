import { internalMutation } from '../_generated/server';
import { GARAGES_SEED } from './garages';
import { MAINTENANCE_RULES_SEED } from './maintenanceRules';

export const seedAll = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();

		const existingGarage = await ctx.db.query('garages').first();
		let garagesInserted = 0;
		if (!existingGarage) {
			for (const garage of GARAGES_SEED) {
				await ctx.db.insert('garages', { ...garage, createdAt: now });
				garagesInserted++;
			}
		}

		const existingRule = await ctx.db.query('maintenanceSchedules').first();
		let rulesInserted = 0;
		if (!existingRule) {
			for (const rule of MAINTENANCE_RULES_SEED) {
				await ctx.db.insert('maintenanceSchedules', { ...rule, createdAt: now });
				rulesInserted++;
			}
		}

		return { garages: garagesInserted, rules: rulesInserted };
	}
});
