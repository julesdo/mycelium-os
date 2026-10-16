/// <reference types="vite/client" />
import { describe, it, expect, vi, afterEach } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { destinatairesDesConseils } from '../croissance/conseils';
import type { DatesDesEtapes } from '../../croissance/etapes';

/**
 * L'ENVOI DES CONSEILS DE PLUME — qui les reçoit, quand la tâche attend, et la
 * désinscription qu'un antivirus qui ouvre le lien ne déclenche pas.
 *
 * L'envoi lui-même (Resend) se vérifie en production par `emails/essai.ts` ; ici,
 * les chemins où rien ne part, et ce qu'ils laissent dans la base.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);
const DELAI_CONVEX = 30_000;
const nouveau = () => convexTest(schema, modules);
type Harnais = ReturnType<typeof nouveau>;
const JOUR = 86_400_000;
/** Un mercredi, 10 h à Paris : dans le créneau d'envoi. */
const MERCREDI_10H = Date.UTC(2026, 9, 14, 8, 0);
/** Un samedi, 10 h à Paris : hors créneau. */
const SAMEDI_10H = Date.UTC(2026, 9, 17, 8, 0);

afterEach(() => {
	vi.unstubAllEnvs();
});

async function compte(
	t: Harnais,
	etapes: DatesDesEtapes,
	prochainConseilLe: number
): Promise<Id<'organizations'>> {
	return t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Ateliers Martin',
			createdAt: etapes.INSCRIT ?? MERCREDI_10H
		});
		await ctx.db.insert('organizationMembers', {
			organizationId,
			userId: 'user_test_1',
			role: 'ORG_ADMIN',
			joinedAt: MERCREDI_10H
		});
		await ctx.db.insert('parcoursComptes', { organizationId, etapes, prochainConseilLe });
		return organizationId;
	});
}

async function parcoursDe(t: Harnais, organizationId: Id<'organizations'>) {
	return t.run(async (ctx) =>
		ctx.db
			.query('parcoursComptes')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.unique()
	);
}

describe('destinatairesDesConseils', () => {
	it('écarte qui a coupé les conseils et qui n’a pas d’adresse', () => {
		const emails = new Map([
			['a', 'a@exemple.fr'],
			['b', 'b@exemple.fr']
		]);
		expect(
			destinatairesDesConseils(
				[{ userId: 'a' }, { userId: 'b', conseilsParCourriel: false }, { userId: 'c' }],
				emails
			)
		).toEqual([{ userId: 'a', email: 'a@exemple.fr' }]);
	});
});

describe('envoyerLesConseils', () => {
	it(
		'efface le rendez-vous quand plus aucun conseil n’est à venir',
		async () => {
			const t = nouveau();
			const id = await compte(t, { INSCRIT: MERCREDI_10H - 60 * JOUR }, MERCREDI_10H - 1);
			await t.mutation(internal.croissance.conseils.envoyerLesConseils, {
				maintenant: MERCREDI_10H
			});
			expect((await parcoursDe(t, id))?.prochainConseilLe).toBeUndefined();
		},
		DELAI_CONVEX
	);

	it(
		'attend le créneau du lundi quand le conseil tombe un samedi',
		async () => {
			const t = nouveau();
			const id = await compte(t, { INSCRIT: SAMEDI_10H - 1000 }, SAMEDI_10H - 1);
			await t.mutation(internal.croissance.conseils.envoyerLesConseils, {
				maintenant: SAMEDI_10H
			});
			const lundi9h = Date.UTC(2026, 9, 19, 7, 0);
			expect((await parcoursDe(t, id))?.prochainConseilLe).toBe(lundi9h);
		},
		DELAI_CONVEX
	);

	it(
		'sans envoi configuré, ne note rien envoyé et réessaie dans une heure',
		async () => {
			vi.stubEnv('RESEND_API_KEY', '');
			const t = nouveau();
			const id = await compte(t, { INSCRIT: MERCREDI_10H - 1000 }, MERCREDI_10H - 1);
			await t.mutation(internal.croissance.conseils.envoyerLesConseils, {
				maintenant: MERCREDI_10H
			});
			expect((await parcoursDe(t, id))?.prochainConseilLe).toBe(MERCREDI_10H + 60 * 60 * 1000);
			const envois = await t.run(async (ctx) => ctx.db.query('envoisCroissance').collect());
			expect(envois).toEqual([]);
		},
		DELAI_CONVEX
	);
});

describe('la désinscription des conseils', () => {
	it(
		'un GET montre la page sans rien changer ; un POST désinscrit',
		async () => {
			const t = nouveau();
			const membreId = await t.run(async (ctx) => {
				const organizationId = await ctx.db.insert('organizations', {
					name: 'Ateliers Martin',
					createdAt: MERCREDI_10H
				});
				return ctx.db.insert('organizationMembers', {
					organizationId,
					userId: 'user_test_1',
					role: 'ORG_ADMIN',
					joinedAt: MERCREDI_10H,
					jetonConseils: 'jeton-abc'
				});
			});

			const page = await t.fetch('/conseils/desinscription?j=jeton-abc', { method: 'GET' });
			expect(page.status).toBe(200);
			expect(await page.text()).toContain('<form');
			expect(
				(await t.run(async (ctx) => ctx.db.get(membreId)))?.conseilsParCourriel
			).toBeUndefined();

			const reponse = await t.fetch('/conseils/desinscription?j=jeton-abc', {
				method: 'POST',
				body: 'List-Unsubscribe=One-Click'
			});
			expect(reponse.status).toBe(200);
			expect((await t.run(async (ctx) => ctx.db.get(membreId)))?.conseilsParCourriel).toBe(false);
		},
		DELAI_CONVEX
	);

	it(
		'un jeton inconnu répond pareil, sans rien révéler',
		async () => {
			const t = nouveau();
			const reponse = await t.fetch('/conseils/desinscription?j=inconnu', { method: 'POST' });
			expect(reponse.status).toBe(200);
		},
		DELAI_CONVEX
	);
});
