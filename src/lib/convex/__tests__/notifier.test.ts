/// <reference types="vite/client" />
import { afterEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';

/**
 * UNE NOTIFICATION, UN SEUL POINT D'ENTRÉE (21/10/2026). `notifier()` range la
 * notification dans la boîte de réception et programme son push ; le push se tait quand
 * la catégorie est coupée, et un appareil refusé par son service de push est retiré.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);
const DELAI_CONVEX = 30_000;

afterEach(() => {
	vi.unstubAllEnvs();
});

async function unEtablissement(t: ReturnType<typeof convexTest>, categoriesCoupees?: string[]) {
	return t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Garnier Bâtiment',
			createdAt: Date.now()
		});
		await ctx.db.insert('organizationMembers', {
			organizationId,
			userId: 'gerant',
			role: 'ORG_ADMIN',
			joinedAt: Date.now(),
			...(categoriesCoupees === undefined ? {} : { categoriesCoupees })
		});
		await ctx.db.insert('abonnementsPush', {
			organizationId,
			userId: 'gerant',
			endpoint: 'https://push.exemple/abc',
			p256dh: 'cle',
			auth: 'secret',
			appareil: 'iPhone',
			creeLe: Date.now()
		});
		return organizationId;
	});
}

const NOTIFICATION = {
	userId: 'gerant',
	type: 'PAIEMENT_RECU' as const,
	title: 'Garage Martin vous a payé',
	message: '1 240 € rapprochés sur sa facture.'
};

describe('notifier()', () => {
	it(
		'range la notification et programme son push quand les clés VAPID sont posées',
		async () => {
			vi.stubEnv('VAPID_PUBLIC_KEY', 'publique');
			const t = convexTest(schema, modules);
			const organizationId = await unEtablissement(t);
			await t.mutation(internal.notifications.createNotification, {
				organizationId,
				...NOTIFICATION
			});
			const { notifications, programmes } = await t.run(async (ctx) => ({
				notifications: await ctx.db.query('notifications').collect(),
				programmes: await ctx.db.system.query('_scheduled_functions').collect()
			}));
			expect(notifications).toHaveLength(1);
			expect(programmes.map((p) => p.name)).toContain('push/envoi:envoyer');
		},
		DELAI_CONVEX
	);

	it(
		'ne programme aucun push sans clés VAPID',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await unEtablissement(t);
			await t.mutation(internal.notifications.createNotification, {
				organizationId,
				...NOTIFICATION
			});
			const programmes = await t.run((ctx) =>
				ctx.db.system.query('_scheduled_functions').collect()
			);
			expect(programmes.map((p) => p.name)).not.toContain('push/envoi:envoyer');
		},
		DELAI_CONVEX
	);

	it(
		'se tait quand la catégorie est coupée, et parle sinon',
		async () => {
			const t = convexTest(schema, modules);
			for (const [coupees, attendu] of [
				[['PAIEMENTS'], null],
				[[], 1]
			] as const) {
				const organizationId = await unEtablissement(t, [...coupees]);
				const notificationId = await t.run((ctx) =>
					ctx.db.insert('notifications', {
						organizationId,
						...NOTIFICATION,
						isRead: false,
						createdAt: Date.now()
					})
				);
				const envoi = await t.query(internal.push.abonnements._pourEnvoi, { notificationId });
				if (attendu === null) expect(envoi).toBeNull();
				else expect(envoi?.abonnements.length).toBeGreaterThanOrEqual(attendu);
			}
		},
		DELAI_CONVEX
	);

	it(
		'retire un appareil que son service de push refuse',
		async () => {
			const t = convexTest(schema, modules);
			await unEtablissement(t);
			await t.mutation(internal.push.abonnements._retirer, {
				endpoint: 'https://push.exemple/abc'
			});
			const restants = await t.run((ctx) => ctx.db.query('abonnementsPush').collect());
			expect(restants).toHaveLength(0);
		},
		DELAI_CONVEX
	);
});
