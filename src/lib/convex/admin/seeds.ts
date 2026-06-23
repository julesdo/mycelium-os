import { ConvexError } from 'convex/values';
import { adminMutation } from '../functions';
import { GARAGES_SEED } from '../seeds/garages';
import { MAINTENANCE_RULES_SEED } from '../seeds/maintenanceRules';

export const seedDatabase = adminMutation({
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

		if (garagesInserted === 0 && rulesInserted === 0) {
			throw new ConvexError('La base est déjà peuplée. Supprimez les données existantes avant de re-seeder.');
		}

		return {
			garages: garagesInserted,
			rules: rulesInserted,
			message: `${garagesInserted} garages et ${rulesInserted} règles d'entretien insérés.`
		};
	}
});
