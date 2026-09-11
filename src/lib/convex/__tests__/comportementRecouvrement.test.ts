/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * LE SCORING COMPORTEMENTAL, BRANCHÉ SUR LA BASE.
 *
 * La règle — médiane, dispersion, plancher — est couverte par ses propres
 * tests, en mémoire. Ce qui n'existe QU'ICI :
 *
 *   · reconstituer l'historique depuis les règlements, en retenant le DERNIER
 *     versement et non le premier ;
 *   · ne jamais regarder les factures d'un autre débiteur, ni d'une autre
 *     organisation ;
 *   · écarter une facture sans date d'exigibilité — elle est FACULTATIVE au
 *     schéma, parce qu'un FEC n'en porte pas.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;

interface FactureFixture {
	reference: string;
	dateExigibilite?: string;
	/** Les dates des règlements. Vide ou absent : la facture reste impayée. */
	reglements?: string[];
}

async function poser(
	t: ReturnType<typeof convexTest>,
	factures: FactureFixture[],
	nomOrg = 'Ateliers Martin'
): Promise<{ organizationId: Id<'organizations'>; debiteurId: Id<'debiteurs'> }> {
	return await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: nomOrg,
			createdAt: Date.now()
		});
		const debiteurId = await ctx.db.insert('debiteurs', {
			organizationId,
			denomination: 'Fournitures Durand',
			denominationNormalisee: 'FOURNITURES DURAND',
			denominationsBrutes: ['Fournitures Durand'],
			estCommercant: 'ok',
			santeFinanciere: 'SAINE',
			creeLe: Date.now()
		});

		for (const f of factures) {
			const reglements = f.reglements ?? [];
			const factureId = await ctx.db.insert('facturesVente', {
				organizationId,
				debiteurId,
				reference: f.reference,
				montantHT: 0n,
				montantTTC: 100_000n,
				dateEmission: '2026-01-01',
				...(f.dateExigibilite === undefined ? {} : { dateExigibilite: f.dateExigibilite }),
				statutPaiement: reglements.length > 0 ? 'SOLDEE' : 'IMPAYEE',
				creeLe: Date.now()
			});
			for (const date of reglements) {
				await ctx.db.insert('reglements', {
					organizationId,
					factureId,
					date,
					montant: 100_000n,
					nature: 'PAIEMENT',
					creeLe: Date.now()
				});
			}
		}
		return { organizationId, debiteurId };
	});
}

/** Quatre factures réglées exactement à trente jours — une habitude nette. */
const HABITUDE_TRENTE: FactureFixture[] = [
	{ reference: 'H-1', dateExigibilite: '2026-01-01', reglements: ['2026-01-31'] },
	{ reference: 'H-2', dateExigibilite: '2026-02-01', reglements: ['2026-03-03'] },
	{ reference: 'H-3', dateExigibilite: '2026-03-01', reglements: ['2026-03-31'] },
	{ reference: 'H-4', dateExigibilite: '2026-04-01', reglements: ['2026-05-01'] }
];

describe('l’habitude reconstituée depuis la base', () => {
	it(
		'retient le DERNIER règlement, pas le premier',
		async () => {
			// ⚠️ LE TEST QUI PORTE LA RÈGLE. Une facture réglée en trois fois n'est
			// acquittée qu'au troisième versement. Retenir le premier ferait passer
			// un paiement étalé sur quatre mois pour un paiement à l'heure — et le
			// client qui échelonne, précisément celui qu'on veut voir, deviendrait
			// invisible.
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t, [
				...HABITUDE_TRENTE,
				{
					reference: 'ETALEE',
					dateExigibilite: '2026-05-01',
					reglements: ['2026-05-10', '2026-06-10', '2026-09-01']
				}
			]);

			const lu = await t.query(internal.recouvrement.comportement.lireInterne, {
				organizationId,
				debiteurId,
				aujourdHui: '2026-09-10'
			});

			expect(lu.habitude.connue).toBe(true);
			if (!lu.habitude.connue) return;
			// Cinq règlements : quatre à 30 jours, un à 123. La médiane reste à 30,
			// mais l'échantillon compte bien la cinquième.
			expect(lu.habitude.echantillon).toBe(5);
			expect(lu.habitude.delaiMedianJours).toBe(30);
		},
		DELAI_CONVEX
	);

	it(
		'écarte une facture sans date d’exigibilité',
		async () => {
			// La date est FACULTATIVE au schéma : un FEC n'a pas de colonne
			// d'échéance. Une facture sans point de départ ne dit rien sur une
			// habitude, et lui en inventer un décalerait la médiane en silence.
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t, [
				...HABITUDE_TRENTE,
				{ reference: 'SANS-DATE', reglements: ['2026-06-15'] }
			]);

			const lu = await t.query(internal.recouvrement.comportement.lireInterne, {
				organizationId,
				debiteurId,
				aujourdHui: '2026-09-10'
			});

			expect(lu.habitude.connue).toBe(true);
			if (!lu.habitude.connue) return;
			expect(lu.habitude.echantillon).toBe(4);
		},
		DELAI_CONVEX
	);

	it(
		'ne regarde JAMAIS les factures d’un autre établissement',
		async () => {
			// Le cloisonnement est la règle du produit, sans exception. Une habitude
			// calculée sur les factures d'un autre client serait un chiffre juste
			// posé sur les mauvaises données — invisible, et faux.
			const t = convexTest(schema, modules);
			const mien = await poser(t, [{ reference: 'SEULE', dateExigibilite: '2026-01-01' }]);
			await poser(t, HABITUDE_TRENTE, 'Clinique des Ormes');

			const lu = await t.query(internal.recouvrement.comportement.lireInterne, {
				organizationId: mien.organizationId,
				debiteurId: mien.debiteurId,
				aujourdHui: '2026-09-10'
			});

			expect(lu.habitude.connue).toBe(false);
		},
		DELAI_CONVEX
	);
});

describe('les ruptures lues sur les impayés', () => {
	it(
		'signale la facture qui sort de l’habitude, et elle seule',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t, [
				...HABITUDE_TRENTE,
				// 20 jours de retard au 10 septembre : dans l'habitude (30 ± 7).
				{ reference: 'DANS-LES-CLOUS', dateExigibilite: '2026-08-21' },
				// 132 jours de retard : franchement dehors.
				{ reference: 'DEHORS', dateExigibilite: '2026-05-01' }
			]);

			const lu = await t.query(internal.recouvrement.comportement.lireInterne, {
				organizationId,
				debiteurId,
				aujourdHui: '2026-09-10'
			});

			expect(lu.ruptures.map((r) => r.reference)).toEqual(['DEHORS']);
			expect(lu.ruptures[0]?.habituelJours).toBe(30);
		},
		DELAI_CONVEX
	);

	it(
		'ne dit rien tant que l’habitude n’est pas établie',
		async () => {
			// ⚠️ LE DOUTE NE PROFITE JAMAIS AU PRODUIT. Deux règlements ne font pas
			// une habitude : sans historique suffisant, aucune rupture n'est
			// annoncée, même sur une facture très en retard.
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t, [
				{ reference: 'P-1', dateExigibilite: '2026-01-01', reglements: ['2026-01-31'] },
				{ reference: 'P-2', dateExigibilite: '2026-02-01', reglements: ['2026-03-03'] },
				{ reference: 'TRES-EN-RETARD', dateExigibilite: '2026-01-15' }
			]);

			const lu = await t.query(internal.recouvrement.comportement.lireInterne, {
				organizationId,
				debiteurId,
				aujourdHui: '2026-09-10'
			});

			expect(lu.habitude.connue).toBe(false);
			expect(lu.ruptures).toEqual([]);
		},
		DELAI_CONVEX
	);

	it(
		'ignore une facture pas encore exigible',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t, [
				...HABITUDE_TRENTE,
				{ reference: 'A-VENIR', dateExigibilite: '2026-12-01' }
			]);

			const lu = await t.query(internal.recouvrement.comportement.lireInterne, {
				organizationId,
				debiteurId,
				aujourdHui: '2026-09-10'
			});

			expect(lu.ruptures).toEqual([]);
		},
		DELAI_CONVEX
	);

	it(
		'classe les écarts les plus francs en premier',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t, [
				...HABITUDE_TRENTE,
				{ reference: 'MOYENNE', dateExigibilite: '2026-06-01' },
				{ reference: 'PIRE', dateExigibilite: '2026-01-05' }
			]);

			const lu = await t.query(internal.recouvrement.comportement.lireInterne, {
				organizationId,
				debiteurId,
				aujourdHui: '2026-09-10'
			});

			expect(lu.ruptures.map((r) => r.reference)).toEqual(['PIRE', 'MOYENNE']);
		},
		DELAI_CONVEX
	);
});
