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

describe('l’offre de bienvenue et le rapport (19/10/2026, audit, lot 7)', () => {
	function envoiPret(facturation: boolean) {
		vi.stubEnv('RESEND_API_KEY', 're_test');
		vi.stubEnv('AUTH_EMAIL', 'plume@exemple.fr');
		vi.stubEnv('SITE_URL', 'https://www.letikette.com');
		vi.stubEnv('CONVEX_SITE_URL', 'https://exemple.convex.site');
		vi.stubEnv('PADDLE_API_KEY', facturation ? 'pdl_sdbx_test' : '');
		vi.stubEnv('PADDLE_FACTURATION_OUVERTE', facturation ? 'oui' : '');
	}
	// Un diagnostic rendu il y a une semaine, le rapport parti : le premier rappel est dû.
	const etapes = { INSCRIT: MERCREDI_10H - 60 * JOUR, DIAGNOSTIC_RENDU: MERCREDI_10H - 7 * JOUR };

	async function avecRapport(t: Harnais, organizationId: Id<'organizations'>) {
		await t.run(async (ctx) => {
			await ctx.db.insert('envoisCroissance', {
				organizationId,
				userId: 'user_test_1',
				cle: 'rapport-diagnostic',
				le: MERCREDI_10H - 7 * JOUR
			});
		});
	}

	async function envois(t: Harnais) {
		return t.run(async (ctx) => ctx.db.query('envoisCroissance').collect());
	}

	it(
		'ne part pas à un établissement abonné entre-temps : consommée sans partir',
		async () => {
			envoiPret(true);
			const t = nouveau();
			const id = await compte(t, etapes, MERCREDI_10H - 1);
			await avecRapport(t, id);
			await t.run(async (ctx) => ctx.db.patch(id, { paddleStatus: 'active' }));
			await t.mutation(internal.croissance.conseils.envoyerLesConseils, {
				maintenant: MERCREDI_10H
			});
			const offre = (await envois(t)).find((e) => e.cle === 'offre-de-bienvenue');
			expect(offre?.userId).toBe('');
		},
		DELAI_CONVEX
	);

	it(
		'ne part pas tant que la facturation est fermée',
		async () => {
			envoiPret(false);
			const t = nouveau();
			const id = await compte(t, etapes, MERCREDI_10H - 1);
			await avecRapport(t, id);
			await t.mutation(internal.croissance.conseils.envoyerLesConseils, {
				maintenant: MERCREDI_10H
			});
			expect((await envois(t)).find((e) => e.cle === 'offre-de-bienvenue')?.userId).toBe('');
		},
		DELAI_CONVEX
	);

	it(
		'ne part qu’aux administrateurs : un simple membre ne la reçoit pas',
		async () => {
			envoiPret(true);
			const t = nouveau();
			const id = await compte(t, etapes, MERCREDI_10H - 1);
			await avecRapport(t, id);
			await t.run(async (ctx) => {
				const m = await ctx.db
					.query('organizationMembers')
					.withIndex('by_organization', (q) => q.eq('organizationId', id))
					.first();
				if (m !== null) await ctx.db.patch(m._id, { role: 'ORG_MEMBER' });
			});
			await t.mutation(internal.croissance.conseils.envoyerLesConseils, {
				maintenant: MERCREDI_10H
			});
			expect((await envois(t)).find((e) => e.cle === 'offre-de-bienvenue')?.userId).toBe('');
		},
		DELAI_CONVEX
	);

	it(
		'le rapport, sans envoi configuré, se reprogramme sans rien noter',
		async () => {
			vi.useFakeTimers();
			try {
				vi.stubEnv('RESEND_API_KEY', '');
				const t = nouveau();
				const id = await compte(t, etapes, MERCREDI_10H - 1);
				await t.mutation(internal.croissance.conseils.envoyerLeRapport, { organizationId: id });
				expect(await envois(t)).toEqual([]);
				const programmes = await t.run(async (ctx) =>
					ctx.db.system.query('_scheduled_functions').collect()
				);
				expect(programmes.some((f) => f.name.includes('envoyerLeRapport'))).toBe(true);
			} finally {
				vi.useRealTimers();
			}
		},
		DELAI_CONVEX
	);
});
