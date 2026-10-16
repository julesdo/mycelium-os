/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';

/**
 * LE CRM BRANCHÉ SUR LE RELEVÉ DES ÉTAPES : un prospect qui s'inscrit passe
 * « Inscrit » et pointe vers son compte ; un compte qui franchit le score de 60
 * reçoit une tâche « Appeler », une seule fois.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);
const DELAI_CONVEX = 30_000;

describe('le CRM et le relevé des étapes', () => {
	it(
		'rapproche le prospect par son SIREN, et crée la tâche « Appeler » une fois',
		async () => {
			const t = convexTest(schema, modules);
			const maintenant = Date.now();
			const { organizationId, prospectId } = await t.run(async (ctx) => {
				const organizationId = await ctx.db.insert('organizations', {
					name: 'Garnier Bâtiment',
					createdAt: maintenant - 60_000,
					paddleStatus: 'active',
					paddlePlanTier: 'equipe',
					paddleRythme: 'mensuel'
				});
				await ctx.db.insert('profilsCreancier', {
					organizationId,
					denomination: 'Garnier Bâtiment',
					siren: '123456789',
					estCommercant: 'ok',
					majLe: maintenant
				});
				await ctx.db.insert('pilotes', {
					organizationId,
					envoiAutomatique: true,
					activeLe: maintenant
				});
				const debiteurId = await ctx.db.insert('debiteurs', {
					organizationId,
					denomination: 'Client',
					denominationNormalisee: 'CLIENT',
					denominationsBrutes: ['Client'],
					estCommercant: 'ok',
					santeFinanciere: 'SAINE',
					creeLe: maintenant
				});
				await ctx.db.insert('facturesVente', {
					organizationId,
					debiteurId,
					reference: 'FA-1',
					montantHT: 0n,
					montantTTC: 100_00n,
					dateEmission: '2026-01-01',
					dateEcheance: '2026-02-01',
					statutPaiement: 'IMPAYEE',
					creeLe: maintenant
				});
				const prospectId = await ctx.db.insert('prospects', {
					entreprise: 'Garnier Bâtiment',
					siren: '123456789',
					cible: 'PME',
					statut: 'INTERESSE',
					creePar: 'jules@exemple.fr',
					creeLe: maintenant - 86_400_000
				});
				return { organizationId, prospectId };
			});

			await t.mutation(internal.croissance.releve.releverLesEtapes, { organizationId });
			await t.mutation(internal.croissance.releve.releverLesEtapes, { organizationId });

			const etat = await t.run(async (ctx) => ({
				prospect: await ctx.db.get(prospectId),
				parcours: await ctx.db
					.query('parcoursComptes')
					.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
					.unique(),
				taches: await ctx.db
					.query('tachesCrm')
					.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
					.take(10)
			}));
			expect(etat.prospect).toMatchObject({ statut: 'INSCRIT', compteId: organizationId });
			expect(etat.parcours?.prospectId).toBe(prospectId);
			expect(etat.parcours?.score).toBeGreaterThanOrEqual(60);
			expect(etat.taches.map((x) => ({ titre: x.titre, origine: x.origine }))).toEqual([
				{ titre: 'Appeler', origine: 'SCORE' }
			]);
		},
		DELAI_CONVEX
	);
});
