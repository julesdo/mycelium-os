/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { api, internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { depuisCentimes, versEuros } from '../../socle/montants';

/**
 * LE DÉCOMPTE D'UN CLIENT PUBLIC (19/10/2026, lot 1 bis) : un hôpital ou une commune
 * passe par le barème de la commande publique (BCE + 8 points, un seul taux pour tout
 * le retard, l'indemnité publique), et le règlement s'impute sur le principal d'abord.
 */
const DELAI_CONVEX = 30_000;
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

async function poser(
	t: ReturnType<typeof convexTest>,
	debiteur: { categorieJuridique?: string; acheteurPublic?: 'PRIVE' | 'SANTE' }
): Promise<{ creanceId: Id<'creances'>; debiteurId: Id<'debiteurs'> }> {
	return await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Nettoyage du Val',
			createdAt: Date.now()
		});
		const debiteurId = await ctx.db.insert('debiteurs', {
			organizationId,
			denomination: 'Centre hospitalier de Créteil',
			denominationNormalisee: 'CENTRE HOSPITALIER DE CRETEIL',
			denominationsBrutes: ['Centre hospitalier de Créteil'],
			estCommercant: 'ko',
			santeFinanciere: 'SAINE',
			creeLe: Date.now(),
			...debiteur
		});
		const creanceId = await ctx.db.insert('creances', {
			organizationId,
			debiteurId,
			statut: 'QUALIFIEE',
			certaine: 'ok',
			liquide: 'ok',
			exigible: 'ok',
			entreCommercants: 'ko',
			creeLe: Date.now()
		});
		await ctx.db.insert('facturesVente', {
			organizationId,
			debiteurId,
			creanceId,
			reference: 'FA-2026-118',
			montantHT: 0n,
			montantTTC: 1_000_000n,
			dateEmission: '2026-04-15',
			dateEcheance: '2026-05-01',
			dateExigibilite: '2026-05-01',
			statutPaiement: 'IMPAYEE',
			creeLe: Date.now()
		});
		return { creanceId, debiteurId };
	});
}

describe('le décompte d’un client public', () => {
	it(
		'passe par le barème public : un seul taux, BCE + 8, et l’indemnité publique',
		async () => {
			const t = convexTest(schema, modules);
			const { creanceId } = await poser(t, { categorieJuridique: '7364' });
			const decompteId = await t.mutation(internal.recouvrement.decompte.figerDecompte, {
				creanceId,
				arreteAu: '2026-09-01',
				convention: 'ACT_365'
			});
			await t.run(async (ctx) => {
				const decompte = (await ctx.db.get(decompteId))!;
				const ligne = decompte.lignes[0]!;
				expect(ligne.bareme).toBe('COMMANDE_PUBLIQUE');
				// 10 000 € à 10,15 % (BCE 2,15 % au 1er semestre 2026, plus huit points)
				// pendant 123 jours, en UNE période : 342,04 €.
				expect(ligne.segments).toHaveLength(1);
				expect(versEuros(depuisCentimes(decompte.interets))).toBe('342,04');
				expect(versEuros(depuisCentimes(decompte.indemniteForfaitaire))).toBe('40,00');
			});
		},
		DELAI_CONVEX
	);

	it(
		'suit la qualification du gérant : « privé » rend le barème commercial',
		async () => {
			const t = convexTest(schema, modules);
			const { creanceId } = await poser(t, { categorieJuridique: '7364', acheteurPublic: 'PRIVE' });
			const decompteId = await t.mutation(internal.recouvrement.decompte.figerDecompte, {
				creanceId,
				arreteAu: '2026-09-01',
				convention: 'ACT_365'
			});
			await t.run(async (ctx) => {
				const decompte = (await ctx.db.get(decompteId))!;
				expect(decompte.lignes[0]!.bareme).toBe('COMMERCIAL');
				expect(versEuros(depuisCentimes(decompte.interets))).toBe('413,68');
			});
		},
		DELAI_CONVEX
	);

	it(
		'note la catégorie juridique lue au registre, seulement pour le SIREN qu’elle concerne',
		async () => {
			const t = convexTest(schema, modules);
			const { debiteurId } = await poser(t, {});
			await t.run((ctx) => ctx.db.patch(debiteurId, { siren: '267500452' }));
			await t.mutation(internal.recouvrement.acheteurPublic.noterCategorieJuridique, {
				debiteurId,
				siren: '267500452',
				categorieJuridique: '7364'
			});
			await t.mutation(internal.recouvrement.acheteurPublic.noterCategorieJuridique, {
				debiteurId,
				siren: '999999999',
				categorieJuridique: '5710'
			});
			const debiteur = await t.run((ctx) => ctx.db.get(debiteurId));
			expect(debiteur?.categorieJuridique).toBe('7364');
			expect(typeof api.recouvrement.acheteurPublic.qualifierAcheteur).toBe('object');
		},
		DELAI_CONVEX
	);
});

describe('les courriers d’un client public', () => {
	it(
		'composent la demande sur les factures payées en retard, et nomment celles qu’ils laissent',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await t.run(async (ctx) => {
				const organizationId = await ctx.db.insert('organizations', {
					name: 'Nettoyage du Val',
					createdAt: Date.now()
				});
				await ctx.db.insert('profilsCreancier', {
					organizationId,
					denomination: 'Nettoyage du Val',
					formeJuridique: 'SAS',
					siren: '552100554',
					adresse: '12 rue des Forges, 94000 Créteil',
					email: 'compta@nettoyage-du-val.fr',
					signataireNom: 'Karim Benali',
					signataireQualite: 'Président',
					iban: 'FR7630006000011234567890189',
					estCommercant: 'ok',
					majLe: Date.now()
				});
				const debiteurId = await ctx.db.insert('debiteurs', {
					organizationId,
					denomination: 'Centre hospitalier de Créteil',
					denominationNormalisee: 'CENTRE HOSPITALIER DE CRETEIL',
					denominationsBrutes: ['Centre hospitalier de Créteil'],
					adresse: '40 avenue de Verdun, 94000 Créteil',
					categorieJuridique: '7364',
					estCommercant: 'ko',
					santeFinanciere: 'SAINE',
					creeLe: Date.now()
				});
				const poserFacture = async (
					reference: string,
					echeance: string | undefined,
					paiement: { date: string; dateSource?: 'LECTURE' }
				) => {
					const factureId = await ctx.db.insert('facturesVente', {
						organizationId,
						debiteurId,
						reference,
						montantHT: 0n,
						montantTTC: 1_000_000n,
						dateEmission: '2026-03-01',
						...(echeance === undefined ? {} : { dateEcheance: echeance }),
						statutPaiement: 'SOLDEE',
						creeLe: Date.now()
					});
					await ctx.db.insert('reglements', {
						organizationId,
						factureId,
						date: paiement.date,
						montant: 1_000_000n,
						nature: 'PAIEMENT',
						creeLe: Date.now(),
						...(paiement.dateSource === undefined ? {} : { dateSource: paiement.dateSource })
					});
				};
				await poserFacture('CHU-1', '2026-05-01', { date: '2026-09-01' });
				await poserFacture('CHU-2', undefined, { date: '2026-09-01' });
				await poserFacture('CHU-3', '2026-05-01', { date: '2026-09-01', dateSource: 'LECTURE' });
				return { organizationId, debiteurId };
			});
			const r = await t.query(internal.recouvrement.courriersPublics.courriersPublicsInterne, {
				organizationId,
				debiteurId,
				aujourdHui: '2026-10-19'
			});
			expect(r?.reclamation.ok).toBe(true);
			if (r?.reclamation.ok !== true) return;
			expect(r.reclamation.corps).toContain('facture n° CHU-1');
			expect(r.reclamation.corps).toContain('342,04 €');
			expect(r.reclamation.corps).not.toContain('CHU-2');
			expect(r.laissees.map((l) => l.reference).sort()).toEqual(['CHU-2', 'CHU-3']);
			// L'hôpital a payé le 1er septembre : plus de trente jours, le signalement se compose.
			expect(r.signalement.ok).toBe(true);
		},
		DELAI_CONVEX
	);
});
