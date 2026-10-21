/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { jourDeParis } from '../../admin/dates';
import { champsDUnNouvelEtablissement } from '../organizations';
import { proposerLAnnee } from '../recouvrement/jalons';

/**
 * LES RÉUSSITES, RELEVÉES UNE FOIS CHACUNE (21/10/2026, le parcours de l'habitude). Un
 * compte ancien ne reçoit pas d'un coup ce qu'il a déjà franchi : au premier relevé, tout
 * s'inscrit vu de tous. Ce qui se franchit ensuite attend d'être fêté, et prévient.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);
const DELAI_CONVEX = 30_000;
const AUJOURDHUI = jourDeParis(Date.now());

async function unDossierPaye(
	t: ReturnType<typeof convexTest>,
	paye: bigint
): Promise<{ organizationId: Id<'organizations'>; factureId: Id<'facturesVente'> }> {
	return t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Garnier Bâtiment',
			createdAt: Date.now()
		});
		for (const [userId, role] of [
			['gerant', 'ORG_ADMIN'],
			['associe', 'ORG_MEMBER']
		] as const) {
			await ctx.db.insert('organizationMembers', {
				organizationId,
				userId,
				role,
				joinedAt: Date.now()
			});
		}
		const debiteurId = await ctx.db.insert('debiteurs', {
			organizationId,
			denomination: 'Garage Martin',
			denominationNormalisee: 'GARAGE MARTIN',
			denominationsBrutes: ['Garage Martin'],
			estCommercant: 'ok',
			santeFinanciere: 'SAINE',
			creeLe: Date.now()
		});
		const creanceId = await ctx.db.insert('creances', {
			organizationId,
			debiteurId,
			statut: 'QUALIFIEE',
			certaine: 'ok',
			liquide: 'ok',
			exigible: 'ok',
			entreCommercants: 'ok',
			creeLe: Date.now()
		});
		const factureId = await ctx.db.insert('facturesVente', {
			organizationId,
			debiteurId,
			creanceId,
			reference: 'FA-001',
			montantHT: 0n,
			montantTTC: 9_000_000n,
			dateEmission: '2026-01-01',
			dateEcheance: '2026-02-01',
			dateExigibilite: '2026-02-01',
			statutPaiement: 'PARTIELLEMENT_PAYEE',
			creeLe: Date.now()
		});
		await ctx.db.insert('reglements', {
			organizationId,
			factureId,
			date: AUJOURDHUI,
			montant: paye,
			nature: 'PAIEMENT',
			creeLe: Date.now()
		});
		return { organizationId, factureId };
	});
}

describe('le relevé des jalons', () => {
	it(
		'inscrit vu de tous ce qui est déjà franchi au premier relevé, sans prévenir',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId } = await unDossierPaye(t, 1_200_000n);
			await t.mutation(internal.recouvrement.jalons.relever, { organizationId });

			const { jalons, notifications } = await t.run(async (ctx) => ({
				jalons: await ctx.db.query('jalonsAtteints').collect(),
				notifications: await ctx.db.query('notifications').collect()
			}));
			expect(jalons.map((j) => j.cle).sort()).toEqual([
				'PREMIER_PAIEMENT',
				'RENTRE_1000',
				'RENTRE_10000'
			]);
			for (const j of jalons) expect([...j.vusPar].sort()).toEqual(['associe', 'gerant']);
			expect(notifications).toHaveLength(0);
		},
		DELAI_CONVEX
	);

	it(
		'fait attendre la réussite suivante, et prévient une fois',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, factureId } = await unDossierPaye(t, 1_200_000n);
			await t.mutation(internal.recouvrement.jalons.relever, { organizationId });
			await t.run(async (ctx) => {
				await ctx.db.insert('reglements', {
					organizationId,
					factureId,
					date: AUJOURDHUI,
					montant: 4_000_000n,
					nature: 'PAIEMENT',
					creeLe: Date.now()
				});
			});
			await t.mutation(internal.recouvrement.jalons.relever, { organizationId });
			await t.mutation(internal.recouvrement.jalons.relever, { organizationId });

			const { nouveau, notifications } = await t.run(async (ctx) => ({
				nouveau: (await ctx.db.query('jalonsAtteints').collect()).find(
					(j) => j.cle === 'RENTRE_50000'
				),
				notifications: await ctx.db.query('notifications').collect()
			}));
			expect(nouveau?.vusPar).toEqual([]);
			expect(nouveau?.clients).toBe(1);
			expect(notifications.map((n) => [n.userId, n.type]).sort()).toEqual([
				['associe', 'JALON'],
				['gerant', 'JALON']
			]);
			expect(notifications[0]?.title).toBe(
				`50 000${String.fromCharCode(160)}€ rentrés sur les dossiers suivis`
			);
		},
		DELAI_CONVEX
	);

	it(
		'fête la première réussite d’un établissement créé après la mise en service',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await t.run(async (ctx) => {
				const organizationId = await ctx.db.insert(
					'organizations',
					champsDUnNouvelEtablissement('Garnier Bâtiment', Date.now())
				);
				await ctx.db.insert('organizationMembers', {
					organizationId,
					userId: 'gerant',
					role: 'ORG_ADMIN',
					joinedAt: Date.now()
				});
				const debiteurId = await ctx.db.insert('debiteurs', {
					organizationId,
					denomination: 'Garage Martin',
					denominationNormalisee: 'GARAGE MARTIN',
					denominationsBrutes: ['Garage Martin'],
					estCommercant: 'ok',
					santeFinanciere: 'SAINE',
					creeLe: Date.now()
				});
				const creanceId = await ctx.db.insert('creances', {
					organizationId,
					debiteurId,
					statut: 'QUALIFIEE',
					certaine: 'ok',
					liquide: 'ok',
					exigible: 'ok',
					entreCommercants: 'ok',
					creeLe: Date.now()
				});
				await ctx.db.insert('envois', {
					organizationId,
					creanceId,
					modele: 'RAPPEL',
					destinataire: 'compta@garage-martin.fr',
					canal: 'MESSAGERIE',
					objet: 'Rappel',
					corps: 'Bonjour',
					resume: [],
					choix: '{}',
					etat: 'PARTI',
					preparePar: 'pilote',
					prepareLe: Date.now(),
					partiLe: AUJOURDHUI
				});
				return organizationId;
			});
			await t.mutation(internal.recouvrement.jalons.relever, { organizationId });
			const jalons = await t.run(async (ctx) => ctx.db.query('jalonsAtteints').collect());
			expect(jalons.map((j) => [j.cle, j.vusPar])).toEqual([['PREMIERE_RELANCE', []]]);
		},
		DELAI_CONVEX
	);

	it(
		'compte un paiement synchronisé, entré comme crédit daté',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, factureId } = await unDossierPaye(t, 50_000n);
			await t.run(async (ctx) => {
				await ctx.db.insert('reglements', {
					organizationId,
					factureId,
					date: AUJOURDHUI,
					montant: 1_000_000n,
					nature: 'CREDIT',
					creeLe: Date.now(),
					dateSource: 'REELLE'
				});
			});
			await t.mutation(internal.recouvrement.jalons.relever, { organizationId });
			const cles = await t.run(async (ctx) =>
				(await ctx.db.query('jalonsAtteints').collect()).map((j) => j.cle).sort()
			);
			expect(cles).toEqual(['PREMIER_PAIEMENT', 'RENTRE_1000', 'RENTRE_10000']);
		},
		DELAI_CONVEX
	);

	it(
		'ne compte pas un règlement daté du jour où il a été lu',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, factureId } = await unDossierPaye(t, 50_000n);
			await t.run(async (ctx) => {
				await ctx.db.insert('reglements', {
					organizationId,
					factureId,
					date: AUJOURDHUI,
					montant: 9_000_000n,
					nature: 'PAIEMENT',
					creeLe: Date.now(),
					dateSource: 'LECTURE'
				});
			});
			await t.mutation(internal.recouvrement.jalons.relever, { organizationId });
			const cles = await t.run(async (ctx) =>
				(await ctx.db.query('jalonsAtteints').collect()).map((j) => j.cle)
			);
			expect(cles).toEqual(['PREMIER_PAIEMENT']);
		},
		DELAI_CONVEX
	);
});

describe('l’année proposée sous une réussite', () => {
	const MENSUEL = { paddleRythme: 'mensuel', paddleStatus: 'active' } as const;
	it('se propose à l’administrateur d’un abonnement au mois', () => {
		expect(proposerLAnnee(MENSUEL, 'ORG_ADMIN')).toBe(true);
		expect(proposerLAnnee(MENSUEL, 'ORG_MEMBER')).toBe(false);
	});
	it('ne se propose pas à un abonnement résilié', () => {
		expect(proposerLAnnee({ ...MENSUEL, paddleResiliationLe: Date.now() }, 'ORG_ADMIN')).toBe(false);
	});
});
