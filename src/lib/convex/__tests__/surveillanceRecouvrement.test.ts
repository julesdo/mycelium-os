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
	it(
		'signale une facture échue, avec son montant',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			const echue = flux.evenements.find((e) => e.type === 'FACTURE_ECHUE');
			expect(echue).toBeDefined();
			expect(echue!.reference).toBe('FA-2021-001');
		},
		DELAI_CONVEX
	);

	it(
		'calcule la prescription depuis le secteur du débiteur',
		async () => {
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
		},
		DELAI_CONVEX
	);

	it(
		'prescrit bien plus tôt une créance de transport',
		async () => {
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
		},
		DELAI_CONVEX
	);

	it(
		'traite un secteur absent comme indéterminé, sans planter',
		async () => {
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
		},
		DELAI_CONVEX
	);

	it(
		'ne déclare aucune hypothèse quand tous les secteurs sont connus',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(flux.hypotheses).toEqual([]);
		},
		DELAI_CONVEX
	);

	it(
		'cumule ce que le produit a permis d’identifier, sans compter deux fois la même facture',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			// Une facture échue + une prescription proche, sur la MÊME facture de
			// 9 000 € : ce sont deux raisons distinctes d'agir, donc deux lignes dans
			// `evenements`, mais une seule dette. `montantIdentifie` déduplique par
			// facture — sommer les deux ferait passer 9 000 € identifiés à
			// 18 000 € affichés.
			expect(flux.evenements.filter((e) => e.montant !== null)).toHaveLength(2);
			expect(flux.montantIdentifie).toBe(900_000n);
		},
		DELAI_CONVEX
	);

	it(
		'cloisonne : une organisation ne voit pas les factures de l’autre',
		async () => {
			const t = convexTest(schema, modules);
			const premiere = await poser(t, { secteur: 'GENERAL' });
			await poser(t, { secteur: 'GENERAL' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId: premiere,
				aujourdHui: AUJOURDHUI
			});

			const echues = flux.evenements.filter((e) => e.type === 'FACTURE_ECHUE');
			expect(echues).toHaveLength(1);
		},
		DELAI_CONVEX
	);

	it(
		'ignore une facture soldée',
		async () => {
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
		},
		DELAI_CONVEX
	);
});

/**
 * UNE FACTURE ABÎMÉE NE DOIT PAS ÉTEINDRE LA SURVEILLANCE DE TOUT
 * L'ÉTABLISSEMENT.
 *
 * `dateEcheance` est une CHAÎNE côté Convex : `2026-02-30` et `pas-une-date`
 * traversent la validation du schéma sans un mot. Elles atteignaient ensuite
 * `dateDePrescription` → `ajouterMois` → `decomposer`, qui LÈVE. Or `assembler`
 * boucle sur TOUTES les factures de l'organisation : une seule ligne abîmée
 * faisait échouer la requête entière.
 *
 * ⚠️ CE N'EST PAS UN ÉCRAN VIDE, C'EST LE PIRE ÉTAT DU PRODUIT. Le gérant ne
 * voit plus RIEN — ni ses factures échues, ni ses prescriptions — et le
 * battement quotidien s'enregistre en ÉCHEC chaque matin. Il se croit surveillé
 * pendant que rien ne l'est, ce que ce produit existe précisément pour empêcher.
 *
 * La règle : une facture dont le point de départ est inexploitable devient un
 * ANGLE MORT nommé. Les autres continuent d'être surveillées.
 */
describe('résistance à une facture abîmée', () => {
	async function ajouterFactureAbimee(
		t: ReturnType<typeof convexTest>,
		organizationId: Id<'organizations'>,
		dates: { dateEcheance: string; dateExigibilite?: string }
	): Promise<void> {
		await t.run(async (ctx) => {
			const debiteurId = (await ctx.db.query('debiteurs').collect())[0]!._id;
			await ctx.db.insert('facturesVente', {
				organizationId,
				debiteurId,
				reference: 'FA-ABIMEE',
				montantHT: 0n,
				montantTTC: 100_00n,
				dateEmission: '2021-10-01',
				dateEcheance: dates.dateEcheance,
				dateExigibilite: dates.dateExigibilite,
				statutPaiement: 'IMPAYEE',
				creeLe: Date.now()
			});
		});
	}

	it(
		'continue de surveiller les autres factures malgré une date qui n’existe pas',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });
			await ajouterFactureAbimee(t, organizationId, { dateEcheance: '2026-02-30' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			// La facture saine est toujours là, avec sa prescription.
			const saine = flux.evenements.find((e) => e.reference === 'FA-2021-001');
			expect(saine).toBeDefined();
		},
		DELAI_CONVEX
	);

	it(
		'nomme la facture abîmée en angle mort, et dit qu’il faut corriger la date',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });
			await ajouterFactureAbimee(t, organizationId, { dateEcheance: '2026-02-30' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			const dit = flux.anglesMorts.join(' ');
			expect(dit).toMatch(/FA-ABIMEE/);
			expect(dit).toMatch(/calendrier|corriger/i);
			// La facture saine n'est PAS un angle mort : sa prescription est calculée.
			expect(dit).not.toMatch(/FA-2021-001/);
		},
		DELAI_CONVEX
	);

	it(
		'tient aussi sur une chaîne qui n’a rien d’une date',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });
			await ajouterFactureAbimee(t, organizationId, { dateEcheance: 'pas-une-date' });

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(flux.anglesMorts.join(' ')).toMatch(/FA-ABIMEE/);
		},
		DELAI_CONVEX
	);

	it(
		'écarte une exigibilité abîmée sans écarter l’échéance qui, elle, est bonne',
		async () => {
			// `dateExigibilite` prime sur `dateEcheance` comme point de départ. Si
			// elle est inexploitable et que l'échéance ne l'est pas, retomber sur
			// l'échéance vaut mieux que déclarer un angle mort : la surveillance
			// reprend, avec la meilleure date disponible.
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, { secteur: 'GENERAL' });
			await ajouterFactureAbimee(t, organizationId, {
				dateEcheance: '2021-11-01',
				dateExigibilite: '2026-02-30'
			});

			const flux = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(flux.anglesMorts.join(' ')).not.toMatch(/FA-ABIMEE/);
		},
		DELAI_CONVEX
	);
});
