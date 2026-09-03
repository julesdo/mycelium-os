/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * La surveillance, branchée sur la base.
 *
 * La détection elle-même est couverte par ses propres tests, sur des données en
 * mémoire. Ce qui n'existe qu'ici, c'est l'ASSEMBLAGE : lire les factures, les
 * créances et les dossiers, et surtout **calculer la date de prescription de
 * chaque facture depuis le secteur de son débiteur**.
 *
 * C'est le raccordement qui rend la prescription sectorielle réelle. Sans lui,
 * le module France resterait une bibliothèque que rien n'appelle.
 */

/**
 * Le premier test paie le chargement du graphe de modules Convex, ce qui
 * dépasse le délai par défaut de 5 s. Le délai est posé test par test plutôt
 * que relevé globalement : un test lent ailleurs doit rester un signal.
 */
const DELAI_CONVEX = 30_000;

const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const AUJOURDHUI = '2026-09-03';

type Secteur = 'GENERAL' | 'TRANSPORT_MARCHANDISES' | 'CONSOMMATEUR' | 'INDETERMINE';

async function poser(
	t: ReturnType<typeof convexTest>,
	options: { secteur?: Secteur; dateEcheance?: string; montantTTC?: bigint } = {}
): Promise<Id<'organizations'>> {
	return await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Thumbbb Agency',
			createdAt: Date.now()
		});
		const debiteurId = await ctx.db.insert('debiteurs', {
			organizationId,
			denomination: 'Fournitures Durand',
			denominationNormalisee: 'FOURNITURES DURAND',
			denominationsBrutes: ['Fournitures Durand'],
			estCommercant: 'ok',
			santeFinanciere: 'SAINE',
			secteur: options.secteur,
			creeLe: Date.now()
		});
		await ctx.db.insert('facturesVente', {
			organizationId,
			debiteurId,
			reference: 'FA-2021-001',
			montantHT: 0n,
			montantTTC: options.montantTTC ?? 900_000n,
			dateEmission: '2021-10-01',
			dateEcheance: options.dateEcheance ?? '2021-11-01',
			dateExigibilite: options.dateEcheance ?? '2021-11-01',
			exigibiliteDeduite: true,
			statutPaiement: 'IMPAYEE',
			creeLe: Date.now()
		});
		return organizationId;
	});
}

describe('assemblage de l’état surveillé', () => {
	it('signale une facture échue, avec son montant', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poser(t, { secteur: 'GENERAL' });

		const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
			organizationId,
			aujourdHui: AUJOURDHUI
		});

		const echue = flux.evenements.find((e) => e.type === 'FACTURE_ECHUE');
		expect(echue).toBeDefined();
		expect(echue!.reference).toBe('FA-2021-001');
	}, DELAI_CONVEX);

	it('calcule la prescription depuis le secteur du débiteur', async () => {
		// Régime général : cinq ans depuis le 1er novembre 2021 → 1er novembre
		// 2026. Au 3 septembre 2026, il reste 59 jours : sous le préavis de 90.
		const t = convexTest(schema, modules);
		const organizationId = await poser(t, { secteur: 'GENERAL' });

		const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
			organizationId,
			aujourdHui: AUJOURDHUI
		});

		const prescription = flux.evenements.find((e) => e.type === 'PRESCRIPTION_PROCHE');
		expect(prescription).toBeDefined();
		expect(prescription!.urgence).toBe('CRITIQUE');
		expect(prescription!.explication).toMatch(/2026-11-01/);
	}, DELAI_CONVEX);

	it('prescrit bien plus tôt une créance de transport', async () => {
		// Un an depuis le 1er novembre 2021 : la créance est éteinte depuis 2022.
		const t = convexTest(schema, modules);
		const organizationId = await poser(t, { secteur: 'TRANSPORT_MARCHANDISES' });

		const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
			organizationId,
			aujourdHui: AUJOURDHUI
		});

		const prescription = flux.evenements.find((e) => e.type === 'PRESCRIPTION_PROCHE');
		expect(prescription!.explication).toMatch(/PRESCRITE/);
		expect(prescription!.action).toMatch(/ne plus engager/i);
	}, DELAI_CONVEX);

	it('traite un secteur absent comme indéterminé, sans planter', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poser(t, {});

		const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
			organizationId,
			aujourdHui: AUJOURDHUI
		});

		// Délai le plus court retenu : la facture de 2021 est prescrite.
		const prescription = flux.evenements.find((e) => e.type === 'PRESCRIPTION_PROCHE');
		expect(prescription).toBeDefined();
		expect(flux.hypotheses.join(' ')).toMatch(/secteur/i);
	}, DELAI_CONVEX);

	it('ne déclare aucune hypothèse quand tous les secteurs sont connus', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poser(t, { secteur: 'GENERAL' });

		const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
			organizationId,
			aujourdHui: AUJOURDHUI
		});

		expect(flux.hypotheses).toEqual([]);
	}, DELAI_CONVEX);

	it('cumule ce que le produit a permis d’identifier', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poser(t, { secteur: 'GENERAL' });

		const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
			organizationId,
			aujourdHui: AUJOURDHUI
		});

		// Une facture échue + une prescription proche, sur la même facture de
		// 9 000 € : le cumul les compte toutes les deux, parce que ce sont deux
		// raisons distinctes d'agir.
		expect(flux.montantIdentifie).toBe(1_800_000n);
	}, DELAI_CONVEX);

	it('cloisonne : une organisation ne voit pas les factures de l’autre', async () => {
		const t = convexTest(schema, modules);
		const premiere = await poser(t, { secteur: 'GENERAL' });
		await poser(t, { secteur: 'GENERAL' });

		const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
			organizationId: premiere,
			aujourdHui: AUJOURDHUI
		});

		const echues = flux.evenements.filter((e) => e.type === 'FACTURE_ECHUE');
		expect(echues).toHaveLength(1);
	}, DELAI_CONVEX);

	it('ignore une facture soldée', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poser(t, { secteur: 'GENERAL' });

		await t.run(async (ctx) => {
			const facture = (await ctx.db.query('facturesVente').collect())[0]!;
			await ctx.db.patch(facture._id, { statutPaiement: 'SOLDEE' });
		});

		const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
			organizationId,
			aujourdHui: AUJOURDHUI
		});

		expect(flux.evenements).toEqual([]);
	}, DELAI_CONVEX);
});
