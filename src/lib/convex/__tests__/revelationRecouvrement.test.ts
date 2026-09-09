/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * LA RÉVÉLATION, BRANCHÉE SUR LA BASE.
 *
 * La règle est couverte par ses propres tests, sur des données en mémoire. Ce
 * qui n'existe QU'ICI, c'est l'assemblage : lire les factures de la bonne
 * organisation, retrouver leurs règlements, choisir leurs périodes de taux, et
 * — pour le bilan des pertes — CROISER le résultat avec l'état du battement
 * quotidien.
 *
 * ⚠️ CE DERNIER POINT EST LE PLUS IMPORTANT DU FICHIER. « 0 € prescrit depuis
 * 214 jours » est une affirmation sur NOTRE travail, pas sur les données du
 * client. Si le battement a échoué un seul jour de la période, la phrase est
 * fausse — et une phrase fausse à cet endroit est pire que pas de compteur du
 * tout, parce qu'elle rassure exactement quand il ne faut pas.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;
const AUJOURDHUI = '2026-09-09';

interface OptionsFacture {
	readonly reference?: string;
	readonly montantTTC?: bigint;
	readonly dateEcheance?: string;
	readonly dateExigibilite?: string;
	readonly statutPaiement?: 'IMPAYEE' | 'PARTIELLEMENT_PAYEE' | 'SOLDEE' | 'LITIGIEUSE';
}

async function poser(
	t: ReturnType<typeof convexTest>,
	options: { nom?: string; creeLe?: number; factures?: OptionsFacture[] } = {}
): Promise<Id<'organizations'>> {
	return await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: options.nom ?? 'Ateliers Martin',
			createdAt: options.creeLe ?? Date.parse('2026-01-01T00:00:00Z')
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

		for (const facture of options.factures ?? [{}]) {
			await ctx.db.insert('facturesVente', {
				organizationId,
				debiteurId,
				reference: facture.reference ?? 'FA-2024-001',
				montantHT: 0n,
				montantTTC: facture.montantTTC ?? 1_000_000n,
				dateEmission: '2024-01-01',
				dateEcheance: facture.dateEcheance ?? '2024-02-01',
				dateExigibilite: facture.dateExigibilite ?? '2024-02-01',
				statutPaiement: facture.statutPaiement ?? 'IMPAYEE',
				creeLe: Date.now()
			});
		}
		return organizationId;
	});
}

describe('la révélation', () => {
	it(
		'sépare le principal du supplément sur les factures de l’organisation',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t);

			const revelation = await t.query(internal.recouvrement.revelation.revelationInterne, {
				organizationId,
				arreteAu: AUJOURDHUI
			});

			expect(revelation.nombreFactures).toBe(1);
			expect(revelation.principal).toBe(1_000_000n);
			// L'indemnité est une constante du registre : 40 €, par facture.
			expect(revelation.indemnites).toBe(4_000n);
			expect(revelation.interets > 0n).toBe(true);
			expect(revelation.supplement).toBe(revelation.interets + revelation.indemnites);
		},
		DELAI_CONVEX
	);

	it(
		'ne montre RIEN des factures d’un autre établissement',
		async () => {
			// La barrière du cloisonnement, vérifiée sur ce chemin comme sur tous
			// les autres : c'est le montant en gros d'un écran d'accueil, celui
			// qu'une fuite rendrait le plus visible.
			const t = convexTest(schema, modules);
			const premiere = await poser(t, { nom: 'Ateliers Martin' });
			await poser(t, {
				nom: 'Clinique des Ormes',
				factures: [{ reference: 'AUTRE-001', montantTTC: 9_999_900n }]
			});

			const revelation = await t.query(internal.recouvrement.revelation.revelationInterne, {
				organizationId: premiere,
				arreteAu: AUJOURDHUI
			});

			expect(revelation.nombreFactures).toBe(1);
			expect(revelation.lignes.map((l) => l.reference)).toEqual(['FA-2024-001']);
		},
		DELAI_CONVEX
	);

	it(
		'nomme une facture qu’elle ne sait pas chiffrer, sans faire échouer la requête',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, {
				factures: [
					{ reference: 'FA-SAINE' },
					{ reference: 'FA-ABIMEE', dateExigibilite: '2026-02-30' }
				]
			});

			const revelation = await t.query(internal.recouvrement.revelation.revelationInterne, {
				organizationId,
				arreteAu: AUJOURDHUI
			});

			expect(revelation.nombreFactures).toBe(1);
			expect(revelation.nonChiffrees.map((n) => n.reference)).toEqual(['FA-ABIMEE']);
		},
		DELAI_CONVEX
	);

	it(
		'retombe sur l’échéance quand l’exigibilité n’a pas été renseignée',
		async () => {
			// `dateExigibilite` est facultative en base : un FEC n'en porte pas.
			// Sans repli, toutes les factures venues d'un FEC seraient non chiffrées.
			const t = convexTest(schema, modules);
			const organizationId = await t.run(async (ctx) => {
				const orgId = await ctx.db.insert('organizations', {
					name: 'Ateliers Martin',
					createdAt: Date.parse('2026-01-01T00:00:00Z')
				});
				const debiteurId = await ctx.db.insert('debiteurs', {
					organizationId: orgId,
					denomination: 'Fournitures Durand',
					denominationNormalisee: 'FOURNITURES DURAND',
					denominationsBrutes: ['Fournitures Durand'],
					estCommercant: 'ok',
					santeFinanciere: 'SAINE',
					creeLe: Date.now()
				});
				await ctx.db.insert('facturesVente', {
					organizationId: orgId,
					debiteurId,
					reference: 'FA-SANS-EXIGIBILITE',
					montantHT: 0n,
					montantTTC: 1_000_000n,
					dateEmission: '2024-01-01',
					dateEcheance: '2024-02-01',
					statutPaiement: 'IMPAYEE',
					creeLe: Date.now()
				});
				return orgId;
			});

			const revelation = await t.query(internal.recouvrement.revelation.revelationInterne, {
				organizationId,
				arreteAu: AUJOURDHUI
			});

			expect(revelation.nombreFactures).toBe(1);
		},
		DELAI_CONVEX
	);

	it(
		'déduit les règlements enregistrés du principal restant dû',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t, {
				factures: [{ statutPaiement: 'PARTIELLEMENT_PAYEE' }]
			});
			await t.run(async (ctx) => {
				const facture = (await ctx.db.query('facturesVente').collect())[0]!;
				await ctx.db.insert('reglements', {
					organizationId,
					factureId: facture._id,
					date: '2024-06-01',
					montant: 400_000n,
					nature: 'PAIEMENT',
					creeLe: Date.now()
				});
			});

			const revelation = await t.query(internal.recouvrement.revelation.revelationInterne, {
				organizationId,
				arreteAu: AUJOURDHUI
			});

			expect(revelation.principal).toBe(600_000n);
		},
		DELAI_CONVEX
	);
});

describe('le bilan des pertes', () => {
	it(
		'compte séparément ce qui s’est éteint avant l’arrivée et depuis',
		async () => {
			const t = convexTest(schema, modules);
			// Régime général : cinq ans. Échéance 2020-02-01 → prescrite 2025-02-01,
			// donc AVANT l'arrivée du 1er janvier 2026.
			const organizationId = await poser(t, {
				factures: [
					{ reference: 'FA-VIEILLE', dateEcheance: '2020-02-01', dateExigibilite: '2020-02-01' },
					{ reference: 'FA-RECENTE', dateEcheance: '2024-02-01', dateExigibilite: '2024-02-01' }
				]
			});

			const bilan = await t.query(internal.recouvrement.revelation.bilanInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(bilan.nombreEteintesAvant).toBe(1);
			expect(bilan.nombreEteintesDepuis).toBe(0);
			expect(bilan.joursSousSurveillance).toBe(251);
		},
		DELAI_CONVEX
	);

	it(
		'refuse d’affirmer quoi que ce soit si le battement a échoué dans la période',
		async () => {
			// ⚠️ LE TEST QUI COMPTE. Sans lui, le produit afficherait « 0 € perdu »
			// pendant que sa surveillance était à l'arrêt — c'est-à-dire qu'il
			// rassurerait exactement au moment où il ne faut pas.
			const t = convexTest(schema, modules);
			const organizationId = await poser(t);
			await t.run(async (ctx) => {
				await ctx.db.insert('battements', {
					organizationId,
					jour: '2026-05-14',
					statut: 'ECHEC',
					raison: 'le flux a leve',
					cles: [],
					montantIdentifie: 0n,
					erreur: 'quelque chose a casse',
					termineLe: Date.now()
				});
			});

			const bilan = await t.query(internal.recouvrement.revelation.bilanInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(bilan.surveillanceInterrompueLe).toBe('2026-05-14');
		},
		DELAI_CONVEX
	);

	it(
		'n’est pas gêné par un échec ANTÉRIEUR à l’arrivée du client',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t);
			await t.run(async (ctx) => {
				await ctx.db.insert('battements', {
					organizationId,
					jour: '2025-11-02',
					statut: 'ECHEC',
					raison: 'releve de test',
					cles: [],
					montantIdentifie: 0n,
					termineLe: Date.now()
				});
			});

			const bilan = await t.query(internal.recouvrement.revelation.bilanInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(bilan.surveillanceInterrompueLe).toBeUndefined();
		},
		DELAI_CONVEX
	);

	it(
		'ne dit rien d’un battement qui a bien tourné',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poser(t);
			await t.run(async (ctx) => {
				await ctx.db.insert('battements', {
					organizationId,
					jour: '2026-05-14',
					statut: 'PARLE',
					raison: 'releve de test',
					cles: [],
					montantIdentifie: 1_000_000n,
					termineLe: Date.now()
				});
			});

			const bilan = await t.query(internal.recouvrement.revelation.bilanInterne, {
				organizationId,
				aujourdHui: AUJOURDHUI
			});

			expect(bilan.surveillanceInterrompueLe).toBeUndefined();
		},
		DELAI_CONVEX
	);

	it(
		'ne regarde que les battements de son propre établissement',
		async () => {
			const t = convexTest(schema, modules);
			const premiere = await poser(t, { nom: 'Ateliers Martin' });
			const autre = await poser(t, { nom: 'Clinique des Ormes' });
			await t.run(async (ctx) => {
				await ctx.db.insert('battements', {
					organizationId: autre,
					jour: '2026-05-14',
					statut: 'ECHEC',
					raison: 'releve de test',
					cles: [],
					montantIdentifie: 0n,
					termineLe: Date.now()
				});
			});

			const bilan = await t.query(internal.recouvrement.revelation.bilanInterne, {
				organizationId: premiere,
				aujourdHui: AUJOURDHUI
			});

			expect(bilan.surveillanceInterrompueLe).toBeUndefined();
		},
		DELAI_CONVEX
	);
});
