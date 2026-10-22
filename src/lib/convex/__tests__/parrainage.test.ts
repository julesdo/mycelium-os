/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { api, internal } from '../_generated/api';
import { attribuerLaRecommandation, lireLaRecommandation } from '../croissance/parrainage';

/**
 * LA RECOMMANDATION, EN BASE (21/10/2026, moment 7) : le lien rattache le nouvel
 * établissement à celui qui l'a recommandé ; sa première vraie échéance payée offre un
 * mois aux deux, une seule fois, douze par an au plus pour qui recommande.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);
const DELAI_CONVEX = 30_000;
const CODE = 'K7M2P9QRST';

async function deuxEtablissements(t: ReturnType<typeof convexTest>, recompensesDuParrain = 0) {
	return t.run(async (ctx) => {
		const parrain = await ctx.db.insert('organizations', {
			name: 'Garnier Bâtiment',
			createdAt: Date.now(),
			codeParrainage: CODE,
			paddleCustomerId: 'ctm_parrain',
			recompensesParrainage: Array.from({ length: recompensesDuParrain }, () => ({
				raison: 'PARRAIN' as const,
				gagneeLe: Date.now()
			}))
		});
		await ctx.db.insert('organizationMembers', {
			organizationId: parrain,
			userId: 'parrain',
			role: 'ORG_ADMIN',
			joinedAt: Date.now()
		});
		const filleul = await ctx.db.insert('organizations', {
			name: 'Menuiserie Dupont',
			createdAt: Date.now(),
			paddleSubscriptionId: 'sub_filleul',
			paddleCustomerId: 'ctm_filleul'
		});
		return { parrain, filleul };
	});
}

/** La facturation ouverte : la recommandation offre un mois chez Paddle, rien avant. */
function ouvrirLaFacturation() {
	const avant = {
		cle: process.env.PADDLE_API_KEY,
		ouverte: process.env.PADDLE_FACTURATION_OUVERTE
	};
	beforeEach(() => {
		process.env.PADDLE_API_KEY = 'pdl_sdbx_test';
		process.env.PADDLE_FACTURATION_OUVERTE = 'oui';
	});
	afterEach(() => {
		if (avant.cle === undefined) delete process.env.PADDLE_API_KEY;
		else process.env.PADDLE_API_KEY = avant.cle;
		if (avant.ouverte === undefined) delete process.env.PADDLE_FACTURATION_OUVERTE;
		else process.env.PADDLE_FACTURATION_OUVERTE = avant.ouverte;
	});
}

describe('la page publique de l’invitation', () => {
	ouvrirLaFacturation();

	it(
		'dit le nom de qui offre, et rien d’autre',
		async () => {
			const t = convexTest(schema, modules);
			await deuxEtablissements(t);
			expect(await t.query(api.croissance.parrainage.invitation, { code: 'k7m2p9qrst' })).toEqual({
				offertPar: 'Garnier Bâtiment'
			});
		},
		DELAI_CONVEX
	);

	it(
		'ne dit rien d’un code inconnu ni d’un code mal formé',
		async () => {
			const t = convexTest(schema, modules);
			await deuxEtablissements(t);
			expect(
				await t.query(api.croissance.parrainage.invitation, { code: 'ZZZZZZZZZZ' })
			).toBeNull();
			expect(await t.query(api.croissance.parrainage.invitation, { code: 'court' })).toBeNull();
		},
		DELAI_CONVEX
	);
});

describe('la page « Recommander »', () => {
	ouvrirLaFacturation();

	it(
		'lit chaque invitation, la valeur du mois de la formule et l’objectif de l’année',
		async () => {
			const t = convexTest(schema, modules);
			const { parrain, filleul } = await deuxEtablissements(t, 2);
			const maintenant = Date.now();
			await t.run(async (ctx) => {
				await ctx.db.patch(parrain, { paddlePlanTier: 'equipe' });
				await ctx.db.patch(filleul, {
					parrainePar: parrain,
					parrainageDeclencheLe: maintenant - 1000
				});
				await ctx.db.insert('organizations', {
					name: 'Plomberie Martin',
					createdAt: maintenant + 60_000,
					parrainePar: parrain
				});
			});
			const lu = await t.run((ctx) => lireLaRecommandation(ctx, parrain, maintenant));
			expect(lu.nomEtablissement).toBe('Garnier Bâtiment');
			expect(lu.inscrits).toBe(2);
			expect(lu.abonnes).toBe(1);
			expect(lu.moisCetteAnnee).toBe(2);
			expect(lu.moisParAn).toBe(12);
			// Équipe : le prix mensuel HT de la grille, en centimes.
			expect(lu.valeurDuMois).toBeGreaterThan(0);
			expect(lu.invitations.map((i) => i.abonneeLe === null)).toEqual([true, false]);
			// Jamais un nom d'établissement recommandé.
			expect(JSON.stringify(lu.invitations)).not.toContain('Martin');
			expect(JSON.stringify(lu.invitations)).not.toContain('Dupont');
			expect(lu.offertPar).toBeNull();
		},
		DELAI_CONVEX
	);

	it(
		'dit au recommandé qui lui offre son mois, tant qu’il ne l’a pas gagné',
		async () => {
			const t = convexTest(schema, modules);
			const { parrain, filleul } = await deuxEtablissements(t);
			await t.run((ctx) => ctx.db.patch(filleul, { parrainePar: parrain }));
			const lu = await t.run((ctx) => lireLaRecommandation(ctx, filleul, Date.now()));
			expect(lu.offertPar).toBe('Garnier Bâtiment');
			expect(lu.valeurDuMois).toBeNull();
		},
		DELAI_CONVEX
	);
});

describe('l’attribution', () => {
	it(
		'rattache le nouvel établissement à celui dont il a suivi le lien',
		async () => {
			const t = convexTest(schema, modules);
			const { parrain, filleul } = await deuxEtablissements(t);
			await t.run((ctx) => attribuerLaRecommandation(ctx, filleul, 'nouveau', 'k7m2p9qrst'));
			expect((await t.run((ctx) => ctx.db.get(filleul)))?.parrainePar).toBe(parrain);
		},
		DELAI_CONVEX
	);

	it(
		'ne rattache ni à soi-même, ni sur un code qui n’existe pas',
		async () => {
			const t = convexTest(schema, modules);
			const { filleul } = await deuxEtablissements(t);
			await t.run(async (ctx) => {
				await attribuerLaRecommandation(ctx, filleul, 'parrain', CODE);
				await attribuerLaRecommandation(ctx, filleul, 'nouveau', 'ZZZZZZZZZZ');
			});
			expect((await t.run((ctx) => ctx.db.get(filleul)))?.parrainePar).toBeUndefined();
		},
		DELAI_CONVEX
	);

	it(
		'prévient qui recommande qu’une entreprise s’est inscrite, sans la nommer',
		async () => {
			const t = convexTest(schema, modules);
			const { parrain, filleul } = await deuxEtablissements(t);
			await t.run((ctx) => attribuerLaRecommandation(ctx, filleul, 'nouveau', CODE));
			const notes = await t.run((ctx) =>
				ctx.db
					.query('notifications')
					.filter((q) => q.eq(q.field('organizationId'), parrain))
					.collect()
			);
			expect(notes).toHaveLength(1);
			expect(notes[0]?.type).toBe('RECOMMANDATION');
			expect(notes[0]?.userId).toBe('parrain');
			expect(notes[0]?.link).toBe('/app/recommander');
			expect(`${notes[0]?.title} ${notes[0]?.message}`).not.toContain('Dupont');
		},
		DELAI_CONVEX
	);
});

describe('la première vraie échéance payée', () => {
	it(
		'offre un mois aux deux, une seule fois, et rien pour l’essai à 0 €',
		async () => {
			const t = convexTest(schema, modules);
			const { parrain, filleul } = await deuxEtablissements(t);
			await t.run((ctx) => ctx.db.patch(filleul, { parrainePar: parrain }));
			const payee = { paddleSubscriptionId: 'sub_filleul', paddleCustomerId: 'ctm_filleul' };
			await t.mutation(internal.croissance.parrainage.noterUneEcheancePayee, { ...payee, ttc: 0 });
			expect((await t.run((ctx) => ctx.db.get(filleul)))?.recompensesParrainage).toBeUndefined();
			await t.mutation(internal.croissance.parrainage.noterUneEcheancePayee, {
				...payee,
				ttc: 7_080
			});
			await t.mutation(internal.croissance.parrainage.noterUneEcheancePayee, {
				...payee,
				ttc: 7_080
			});
			const [f, p] = await t.run(async (ctx) => [
				await ctx.db.get(filleul),
				await ctx.db.get(parrain)
			]);
			expect(f?.recompensesParrainage?.map((r) => r.raison)).toEqual(['FILLEUL']);
			expect(f?.recompenseEnAttente).toBe(true);
			expect(p?.recompensesParrainage?.map((r) => r.raison)).toEqual(['PARRAIN']);
			expect(p?.recompenseEnAttente).toBe(true);
			// Qui recommande l'apprend : un mois lui est offert.
			const notes = await t.run((ctx) =>
				ctx.db
					.query('notifications')
					.filter((q) => q.eq(q.field('organizationId'), parrain))
					.collect()
			);
			expect(notes.map((n) => n.type)).toEqual(['RECOMMANDATION']);
		},
		DELAI_CONVEX
	);

	it(
		'garde le mois du recommandé quand celui qui recommande a déjà ses douze',
		async () => {
			const t = convexTest(schema, modules);
			const { parrain, filleul } = await deuxEtablissements(t, 12);
			await t.run((ctx) => ctx.db.patch(filleul, { parrainePar: parrain }));
			await t.mutation(internal.croissance.parrainage.noterUneEcheancePayee, {
				paddleSubscriptionId: 'sub_filleul',
				paddleCustomerId: 'ctm_filleul',
				ttc: 7_080
			});
			const [f, p] = await t.run(async (ctx) => [
				await ctx.db.get(filleul),
				await ctx.db.get(parrain)
			]);
			expect(f?.recompensesParrainage).toHaveLength(1);
			expect(p?.recompensesParrainage).toHaveLength(12);
		},
		DELAI_CONVEX
	);
});
