/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * LE DIAGNOSTIC EXPRESS, BRANCHÉ SUR LA BASE (19/10/2026) : l'échéance supposée d'une
 * facture sans échéance (le délai supplétif depuis sa date), la date de paiement qui
 * n'est qu'une date de lecture, et le plancher de trois mois de Découverte.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);
const DELAI_CONVEX = 30_000;
const AUJOURDHUI = '2026-10-19';

interface Facture {
	readonly reference: string;
	readonly dateEmission: string;
	readonly dateEcheance?: string;
	readonly statutPaiement?: 'IMPAYEE' | 'PARTIELLEMENT_PAYEE' | 'SOLDEE';
	readonly reglement?: { date: string; montant: bigint; dateSource?: 'REELLE' | 'LECTURE' };
}

async function poser(
	t: ReturnType<typeof convexTest>,
	factures: readonly Facture[],
	simulatedTier?: 'none'
): Promise<Id<'organizations'>> {
	return await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Ateliers Martin',
			createdAt: Date.parse('2026-01-01T00:00:00Z'),
			...(simulatedTier === undefined ? {} : { simulatedTier })
		});
		const debiteurId = await ctx.db.insert('debiteurs', {
			organizationId,
			denomination: 'Fournitures Durand',
			denominationNormalisee: 'FOURNITURES DURAND',
			denominationsBrutes: ['Fournitures Durand'],
			estCommercant: 'ok',
			santeFinanciere: 'SAINE',
			secteur: 'GENERAL',
			creeLe: Date.now()
		});
		for (const f of factures) {
			const factureId = await ctx.db.insert('facturesVente', {
				organizationId,
				debiteurId,
				reference: f.reference,
				montantHT: 0n,
				montantTTC: 1_000_000n,
				dateEmission: f.dateEmission,
				...(f.dateEcheance === undefined ? {} : { dateEcheance: f.dateEcheance }),
				statutPaiement: f.statutPaiement ?? 'IMPAYEE',
				creeLe: Date.now()
			});
			if (f.reglement !== undefined) {
				await ctx.db.insert('reglements', {
					organizationId,
					factureId,
					date: f.reglement.date,
					montant: f.reglement.montant,
					nature: 'PAIEMENT',
					creeLe: Date.now(),
					...(f.reglement.dateSource === undefined ? {} : { dateSource: f.reglement.dateSource })
				});
			}
		}
		return organizationId;
	});
}

describe('le diagnostic express', () => {
	it(
		'compte trente jours depuis la date d’une facture sans échéance, et le marque',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, [{ reference: 'FEC-1', dateEmission: '2026-08-01' }]);
			const d = await t.query(internal.recouvrement.revelation.diagnosticInterne, {
				organizationId,
				arreteAu: AUJOURDHUI
			});
			expect(d.echeancesSupposees).toBe(1);
			// Le retard court du 31 août (le 1er août plus trente jours), pas du 1er août.
			const ligne = d.impayees.lignes.find((l) => l.reference === 'FEC-1');
			expect(ligne?.exigibleDepuis).toBe('2026-08-31');
		},
		DELAI_CONVEX
	);

	it(
		'chiffre une facture payée en retard, et nomme celle dont la date n’est qu’une lecture',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, [
				{
					reference: 'PAYEE-TARD',
					dateEmission: '2026-07-01',
					dateEcheance: '2026-07-31',
					statutPaiement: 'SOLDEE',
					reglement: { date: '2026-09-15', montant: 1_000_000n, dateSource: 'REELLE' }
				},
				{
					reference: 'PAYEE-QUAND',
					dateEmission: '2026-07-01',
					dateEcheance: '2026-07-31',
					statutPaiement: 'SOLDEE',
					reglement: { date: '2026-10-13', montant: 1_000_000n, dateSource: 'LECTURE' }
				}
			]);
			const d = await t.query(internal.recouvrement.revelation.diagnosticInterne, {
				organizationId,
				arreteAu: AUJOURDHUI
			});
			expect(d.payeesEnRetard.lignes.map((l) => l.reference)).toEqual(['PAYEE-TARD']);
			expect(d.payeesEnRetard.lignes[0]!.indemniteForfaitaire).toBe(4_000n);
			expect(d.nonChiffrees.map((n) => n.reference)).toEqual(['PAYEE-QUAND']);
			// Les payées en retard ne gonflent pas « ce qu'on vous doit ».
			expect(d.impayees.nombreFactures).toBe(0);
		},
		DELAI_CONVEX
	);

	it(
		'borne Découverte aux trois derniers mois, et compte le reste',
		async () => {
			const t = convexTest(schema, modules);
			const factures: Facture[] = [
				{ reference: 'RECENTE', dateEmission: '2026-08-01', dateEcheance: '2026-08-31' },
				{ reference: 'ANCIENNE', dateEmission: '2026-01-01', dateEcheance: '2026-01-31' }
			];
			const decouverte = await poser(t, factures, 'none');
			const d = await t.query(internal.recouvrement.revelation.diagnosticInterne, {
				organizationId: decouverte,
				arreteAu: AUJOURDHUI
			});
			expect(d.du).toBe('2026-07-19');
			expect(d.impayees.lignes.map((l) => l.reference)).toEqual(['RECENTE']);
			expect(d.horsPeriode).toEqual({ nombre: 1, principal: 1_000_000n });

			// « Ce qui est dû » dit la même chose que le diagnostic.
			const r = await t.query(internal.recouvrement.revelation.revelationInterne, {
				organizationId: decouverte,
				arreteAu: AUJOURDHUI
			});
			expect(r.nombreFactures).toBe(1);
			expect(r.horsPeriode).toEqual({ nombre: 1, principal: 1_000_000n });
			expect(r.du).toBe('2026-07-19');

			// Sans formule simulée (facturation fermée), rien n'est borné.
			const ouvert = await poser(t, factures);
			const tout = await t.query(internal.recouvrement.revelation.diagnosticInterne, {
				organizationId: ouvert,
				arreteAu: AUJOURDHUI
			});
			expect(tout.du).toBeNull();
			expect(tout.impayees.nombreFactures).toBe(2);
		},
		DELAI_CONVEX
	);
});
