import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';

export const cleanupExport = internalMutation({
	args: { storageId: v.id('_storage') },
	handler: async (ctx, { storageId }) => {
		try {
			await ctx.storage.delete(storageId);
		} catch {
			// File may already be deleted — ignore
		}
	}
});
