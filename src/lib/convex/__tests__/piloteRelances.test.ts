/// <reference types="vite/client" />
import { afterEach, describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * LES RELANCES QUI PARTENT SEULES — leurs garde-fous, vérifiés sur la base.
 *
 * Le fondateur a décidé le 08/10/2026 que le pilote relance seul. Ce qui rend
 * cette décision tenable se vérifie ici :
 *
 * 1. RIEN SANS ACTIVATION. Un établissement qui n'a pas laissé le pilote
 *    relancer ne voit aucune relance se programmer.
 * 2. UNE RELANCE SE PROGRAMME, ELLE NE PART PAS D'EMBLÉE : elle attend au moins
 *    une heure, le temps de la retenir.
 * 3. UN PAIEMENT ARRIVÉ DANS L'HEURE ARRÊTE TOUT : rien ne part pour une facture
 *    soldée entre la programmation et le départ.
 * 4. SANS ENVOI CONFIGURÉ, LA RELANCE REDEVIENT UN COURRIER À VALIDER : elle ne
 *    reste pas « programmée » pour toujours, et elle n'est pas jetée.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;
const JOUR = new Date().toISOString().slice(0, 10);

/** Un établissement, un membre, un profil complet, un client en retard et son dossier. */
async function dossierEnRetard(t: ReturnType<typeof convexTest>) {
	return t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Ateliers Martin',
			createdAt: Date.now()
		});
		await ctx.db.insert('organizationMembers', {
			organizationId,
			userId: 'user_test_1',
			role: 'ORG_ADMIN',
			joinedAt: Date.now()
		});
		await ctx.db.insert('profilsCreancier', {
			organizationId,
			denomination: 'Ateliers Martin',
			email: 'compta@ateliers-martin.fr',
			estCommercant: 'ok',
			majLe: Date.now()
		});
		const debiteurId = await ctx.db.insert('debiteurs', {
			organizationId,
			denomination: 'Fournitures Durand',
			denominationNormalisee: 'FOURNITURES DURAND',
			denominationsBrutes: ['Fournitures Durand'],
			estCommercant: 'ok',
			santeFinanciere: 'SAINE',
			email: 'compta@durand.fr',
			creeLe: Date.now()
		});
		const factureId = await ctx.db.insert('facturesVente', {
			organizationId,
			debiteurId,
			reference: 'FA-2026-0042',
			montantHT: 0n,
			montantTTC: 1_200_00n,
			dateEmission: '2026-01-01',
			dateEcheance: '2026-02-01',
			statutPaiement: 'IMPAYEE',
			creeLe: Date.now()
		});
		return { organizationId, debiteurId, factureId };
	});
}

async function ouvrirLeDossier(
	t: ReturnType<typeof convexTest>,
	organizationId: Id<'organizations'>,
	factureId: Id<'facturesVente'>
): Promise<Id<'creances'>> {
	return t.mutation(internal.recouvrement.creances.creerCreance, {
		organizationId,
		factureIds: [factureId],
		aujourdHui: JOUR
	});
}

async function activer(t: ReturnType<typeof convexTest>, organizationId: Id<'organizations'>) {
	await t.run(async (ctx) => {
		await ctx.db.insert('pilotes', { organizationId, envoiAutomatique: true });
	});
}

/** Coche toutes les étapes d'un travail, comme le feraient les étapes programmées. */
async function tout(t: ReturnType<typeof convexTest>, travailId: Id<'travauxPilote'>) {
	for (let i = 0; i < 10; i++) {
		await t.mutation(internal.recouvrement.pilote.avancerTravail, { travailId });
	}
}

async function dernierTravail(
	t: ReturnType<typeof convexTest>,
	organizationId: Id<'organizations'>
) {
	return t.run(
		async (ctx) =>
			(await ctx.db.query('travauxPilote').order('desc').collect()).find(
				(travail) => travail.organizationId === organizationId
			) ?? null
	);
}

const secretE2E = process.env.AUTH_E2E_TEST_SECRET;
afterEach(() => {
	if (secretE2E === undefined) Reflect.deleteProperty(process.env, 'AUTH_E2E_TEST_SECRET');
	else process.env.AUTH_E2E_TEST_SECRET = secretE2E;
	Reflect.deleteProperty(process.env, 'RESEND_API_KEY');
	Reflect.deleteProperty(process.env, 'RELANCES_EMAIL');
});

describe('les relances du pilote', () => {
	it(
		'ne programme rien tant que le gérant ne l’a pas laissé relancer',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, factureId } = await dossierEnRetard(t);
			await ouvrirLeDossier(t, organizationId, factureId);

			await t.mutation(internal.recouvrement.pilote.programmerLesRelances, {
				organizationId,
				jour: JOUR
			});

			expect(await dernierTravail(t, organizationId)).toBeNull();
		},
		DELAI_CONVEX
	);

	it(
		'programme le rappel, qui attend au moins une heure avant de partir',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, factureId } = await dossierEnRetard(t);
			const creanceId = await ouvrirLeDossier(t, organizationId, factureId);
			await activer(t, organizationId);
			const avant = Date.now();

			await t.mutation(internal.recouvrement.pilote.programmerLesRelances, {
				organizationId,
				jour: JOUR
			});
			const travail = await dernierTravail(t, organizationId);
			expect(travail?.genre).toBe('RELANCES');
			await tout(t, travail!._id);

			const envois = await t.run(async (ctx) =>
				(await ctx.db.query('envois').collect()).filter((e) => e.creanceId === creanceId)
			);
			expect(envois).toHaveLength(1);
			expect(envois[0]?.etat).toBe('PROGRAMME');
			expect(envois[0]?.etapePlan).toBe('RAPPEL');
			expect(envois[0]?.destinataire).toBe('compta@durand.fr');
			expect(envois[0]?.partiraLe ?? 0).toBeGreaterThanOrEqual(avant + 60 * 60 * 1000);
			// Le premier contact ne menace jamais : ni pénalités, ni frais.
			expect(envois[0]?.corps).not.toMatch(/pénalit|indemnit|mise en demeure/i);
		},
		DELAI_CONVEX
	);

	it(
		'n’envoie rien pour une facture payée entre la programmation et le départ',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, factureId } = await dossierEnRetard(t);
			await ouvrirLeDossier(t, organizationId, factureId);
			await activer(t, organizationId);
			await t.mutation(internal.recouvrement.pilote.programmerLesRelances, {
				organizationId,
				jour: JOUR
			});
			await tout(t, (await dernierTravail(t, organizationId))!._id);
			const envoiId = (await t.run(async (ctx) => ctx.db.query('envois').first()))!._id;

			// Le client paie dans l'heure.
			await t.run(async (ctx) => {
				await ctx.db.insert('reglements', {
					organizationId,
					factureId,
					date: JOUR,
					montant: 1_200_00n,
					nature: 'PAIEMENT',
					creeLe: Date.now()
				});
				await ctx.db.patch(factureId, { statutPaiement: 'SOLDEE' });
			});

			// L'heure du départ : l'envoi est configuré, le pilote montre et envoie.
			Reflect.deleteProperty(process.env, 'AUTH_E2E_TEST_SECRET');
			process.env.RESEND_API_KEY = 're_test';
			process.env.RELANCES_EMAIL = 'relances@example.com';
			await t.mutation(internal.recouvrement.pilote.lancerEnvoi, { envoiId });
			await tout(t, (await dernierTravail(t, organizationId))!._id);

			const envoi = await t.run(async (ctx) => ctx.db.get(envoiId));
			expect(envoi?.etat).toBe('ABANDONNE');
		},
		DELAI_CONVEX
	);

	it(
		'rend la relance au gérant quand l’envoi des e-mails n’est pas configuré',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, factureId } = await dossierEnRetard(t);
			await ouvrirLeDossier(t, organizationId, factureId);
			await activer(t, organizationId);
			await t.mutation(internal.recouvrement.pilote.programmerLesRelances, {
				organizationId,
				jour: JOUR
			});
			await tout(t, (await dernierTravail(t, organizationId))!._id);
			const envoiId = (await t.run(async (ctx) => ctx.db.query('envois').first()))!._id;

			Reflect.deleteProperty(process.env, 'RESEND_API_KEY');
			await t.mutation(internal.recouvrement.pilote.lancerEnvoi, { envoiId });

			const envoi = await t.run(async (ctx) => ctx.db.get(envoiId));
			expect(envoi?.etat).toBe('A_VALIDER');
			const notifications = await t.run(async (ctx) => ctx.db.query('notifications').collect());
			expect(notifications.some((n) => n.type === 'PILOTE_BLOQUE')).toBe(true);
		},
		DELAI_CONVEX
	);

	it(
		'ne relance pas un client que le gérant a retiré du pilote',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId, factureId } = await dossierEnRetard(t);
			await ouvrirLeDossier(t, organizationId, factureId);
			await activer(t, organizationId);
			await t.run(async (ctx) => {
				await ctx.db.patch(debiteurId, { horsPilote: true });
			});

			await t.mutation(internal.recouvrement.pilote.programmerLesRelances, {
				organizationId,
				jour: JOUR
			});

			expect(await dernierTravail(t, organizationId)).toBeNull();
		},
		DELAI_CONVEX
	);
});
