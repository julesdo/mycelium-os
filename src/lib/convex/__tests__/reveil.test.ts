/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { preparerLesReveilsPour } from '../recouvrement/reveil';
import { jourDeParis } from '../../admin/dates';

/**
 * LE RÉVEIL UTILE, PRÉPARÉ EN BASE (21/10/2026, moment 8) : une personne absente depuis
 * quatorze jours, à qui il est arrivé quelque chose de vrai, reçoit l'e-mail du créneau ;
 * les autres, rien.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);
const DELAI_CONVEX = 30_000;
const JOUR = 24 * 60 * 60 * 1000;
// Mardi 3 novembre 2026, 1 h à Paris : le passage de la nuit, avant le créneau de 9 h.
const MARDI = Date.UTC(2026, 10, 3, 0, 0);

async function unEtablissement(
	t: ReturnType<typeof convexTest>,
	options: { visiteIlYA: number; paiement: boolean; conseilsCoupes?: boolean }
) {
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
			...(options.conseilsCoupes ? { conseilsParCourriel: false } : {})
		});
		const vueLe = MARDI - options.visiteIlYA;
		await ctx.db.insert('journeesPlume', {
			organizationId,
			userId: 'gerant',
			jour: jourDeParis(vueLe),
			max: { demarrer: 0, relire: 0, repondre: 0 },
			tenue: true,
			vueLe
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
		const factureId = await ctx.db.insert('facturesVente', {
			organizationId,
			debiteurId,
			reference: 'FA-001',
			montantHT: 0n,
			montantTTC: 300_000n,
			dateEmission: '2026-01-01',
			dateEcheance: '2026-02-01',
			dateExigibilite: '2026-02-01',
			statutPaiement: 'SOLDEE',
			creeLe: Date.now()
		});
		if (options.paiement) {
			await ctx.db.insert('reglements', {
				organizationId,
				factureId,
				date: '2026-10-30',
				montant: 300_000n,
				nature: 'PAIEMENT',
				creeLe: MARDI - JOUR
			});
		}
		return organizationId;
	});
}

async function programmes(t: ReturnType<typeof convexTest>) {
	return t.run(async (ctx) =>
		(await ctx.db.system.query('_scheduled_functions').collect()).filter(
			(f) => f.name === 'recouvrement/reveil:envoyerLeReveil'
		)
	);
}

describe('le réveil utile', () => {
	it(
		'programme l’e-mail de 9 h pour une absence de quatorze jours où un client a payé',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await unEtablissement(t, { visiteIlYA: 20 * JOUR, paiement: true });
			await t.run((ctx) => preparerLesReveilsPour(ctx, organizationId, [], MARDI));
			const envois = await programmes(t);
			expect(envois).toHaveLength(1);
			expect(envois[0]?.scheduledTime).toBe(Date.UTC(2026, 10, 3, 8, 0));
		},
		DELAI_CONVEX
	);

	it(
		'se tait pour une visite récente, une absence sans rien de vrai, ou les e-mails coupés',
		async () => {
			const t = convexTest(schema, modules);
			const recente = await unEtablissement(t, { visiteIlYA: 3 * JOUR, paiement: true });
			const vide = await unEtablissement(t, { visiteIlYA: 20 * JOUR, paiement: false });
			const coupee = await unEtablissement(t, {
				visiteIlYA: 20 * JOUR,
				paiement: true,
				conseilsCoupes: true
			});
			await t.run(async (ctx) => {
				for (const id of [recente, vide, coupee]) await preparerLesReveilsPour(ctx, id, [], MARDI);
			});
			expect(await programmes(t)).toHaveLength(0);
		},
		DELAI_CONVEX
	);
});
