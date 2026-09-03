/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { requireOrgAdmin, requireOrgMember } from '../lib/auth';

/**
 * L'EFFACEMENT, ET LA BARRIÈRE DES RÔLES.
 *
 * Deux choses sont testées ici, et une seule d'entre elles est visible à
 * l'écran.
 *
 * 1. LA PURGE VIDE VRAIMENT, ET DANS LE BON ORDRE. Une suppression partielle est
 *    le pire des résultats : elle rend le manquement au règlement invisible —
 *    l'établissement a disparu de l'interface, donc tout a l'air fait — pendant
 *    que les lignes de facture restent en base. On vérifie table par table.
 *
 * 2. LE RÔLE EST UNE BARRIÈRE, PAS UNE ÉTIQUETTE. `requireOrgAdmin` n'était
 *    appelé nulle part ; il l'est maintenant depuis toutes les fonctions
 *    d'administration. Ces tests le tiennent en échec délibérément, parce qu'un
 *    contrôle qu'on n'a jamais vu refuser est un contrôle dont on ignore s'il
 *    fonctionne.
 *
 * Comme dans `cheminArgent.test.ts`, on teste les mutations INTERNES et les
 * fonctions de domaine : monter le composant Better Auth pour les mutations
 * authentifiées coûterait plus cher que ce que ça rapporterait.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

/**
 * Un établissement peuplé : un import, un débiteur, deux factures, un
 * règlement, une pièce et sa liaison, une créance, un décompte, un dossier.
 *
 * TOUTES LES TABLES CLOISONNÉES Y SONT REPRÉSENTÉES, et c'est le point : une
 * purge partielle est le pire des résultats, parce qu'elle rend le manquement
 * INVISIBLE — l'établissement a disparu de l'interface, donc tout a l'air fait,
 * pendant que les factures restent en base.
 */
async function poserEtablissement(t: ReturnType<typeof convexTest>) {
	return await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Thumbbb Agency',
			createdAt: Date.now()
		});

		await ctx.db.insert('profilsCreancier', {
			organizationId,
			denomination: 'Thumbbb Agency',
			estCommercant: 'ok',
			majLe: Date.now()
		});

		const storageId = await ctx.storage.store(new Blob([String.fromCharCode(65)]));
		await ctx.db.insert('importsRecouvrement', {
			organizationId,
			storageId,
			filename: 'export-2026.txt',
			mimeType: 'text/plain',
			mode: 'EXPORT_COMPTABLE',
			statut: 'TERMINE',
			deposeLe: Date.now()
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

		let premiereFacture: Id<'facturesVente'> | null = null;
		for (const reference of ['FA-2026-001', 'FA-2026-002']) {
			const factureId = await ctx.db.insert('facturesVente', {
				organizationId,
				debiteurId,
				creanceId,
				reference,
				montantHT: 0n,
				montantTTC: 1_000_000n,
				dateEmission: '2026-03-01',
				dateEcheance: '2026-04-01',
				dateExigibilite: '2026-04-01',
				exigibiliteDeduite: true,
				statutPaiement: 'IMPAYEE',
				creeLe: Date.now()
			});
			premiereFacture ??= factureId;
		}

		await ctx.db.insert('reglements', {
			organizationId,
			factureId: premiereFacture!,
			date: '2026-06-01',
			montant: 400_000n,
			nature: 'PAIEMENT',
			creeLe: Date.now()
		});

		const pieceStorageId = await ctx.storage.store(new Blob([String.fromCharCode(66)]));
		const pieceId = await ctx.db.insert('pieces', {
			organizationId,
			type: 'BON_DE_LIVRAISON',
			storageId: pieceStorageId,
			filename: 'bl-001.pdf',
			debiteurId,
			ajouteeLe: Date.now()
		});
		await ctx.db.insert('piecesFactures', {
			organizationId,
			pieceId,
			factureId: premiereFacture!
		});

		await ctx.db.insert('decomptes', {
			organizationId,
			creanceId,
			arreteAu: '2026-09-03',
			convention: 'ACT_365',
			principalRestantDu: 1_600_000n,
			interets: 41_368n,
			indemniteForfaitaire: 8_000n,
			total: 1_649_368n,
			lignes: [],
			produitLe: Date.now()
		});

		await ctx.db.insert('dossiers', {
			organizationId,
			creanceId,
			procedureCle: 'injonction-de-payer',
			etat: 'PREPARATION',
			echeances: [],
			creeLe: Date.now()
		});

		await ctx.db.insert('notifications', {
			organizationId,
			userId: 'user_admin',
			type: 'CREANCE_MURE',
			title: 'Une créance est mûre',
			message: 'Fournitures Durand',
			isRead: false,
			createdAt: Date.now()
		});

		return { organizationId, debiteurId };
	});
}

describe("la purge d'un établissement", () => {
	it('vide toutes les tables cloisonnées, puis retire l’établissement', async () => {
		const t = convexTest(schema, modules);
		const { organizationId } = await poserEtablissement(t);

		await t.mutation(internal.rgpd.purgerEtablissement, { organizationId, passe: 0 });

		await t.run(async (ctx) => {
			expect(await ctx.db.get(organizationId)).toBeNull();
			for (const table of [
				'reglements',
				'facturesVente',
				'piecesFactures',
				'pieces',
				'importsRecouvrement',
				'decomptes',
				'dossiers',
				'creances',
				'debiteurs',
				'profilsCreancier',
				'notifications'
			] as const) {
				const restant = await ctx.db.query(table).collect();
				expect(restant, `${table} devrait être vide`).toHaveLength(0);
			}
		});
	});

	it('n’épargne aucune table : rien n’est mutualisé entre clients', async () => {
		// Le produit a un temps porté un référentiel global de libellés,
		// expressément exclu de la purge parce qu'il n'appartenait à personne. Le
		// recouvrement n'a pas d'équivalent : un débiteur, un montant et une
		// échéance sont des données client, toujours. La purge est donc totale,
		// et ce test le fige.
		const t = convexTest(schema, modules);
		const { organizationId } = await poserEtablissement(t);

		await t.mutation(internal.rgpd.purgerEtablissement, { organizationId, passe: 0 });

		await t.run(async (ctx) => {
			expect(await ctx.db.query('debiteurs').collect()).toHaveLength(0);
			expect(await ctx.db.query('facturesVente').collect()).toHaveLength(0);
		});
	});

	it('ne touche pas aux données d’un autre établissement', async () => {
		const t = convexTest(schema, modules);
		const a = await poserEtablissement(t);
		const b = await poserEtablissement(t);

		await t.mutation(internal.rgpd.purgerEtablissement, {
			organizationId: a.organizationId,
			passe: 0
		});

		await t.run(async (ctx) => {
			expect(await ctx.db.get(b.organizationId)).not.toBeNull();
			const factures = await ctx.db
				.query('facturesVente')
				.withIndex('by_org', (q) => q.eq('organizationId', b.organizationId))
				.collect();
			expect(factures).toHaveLength(2);
		});
	});

	it('s’arrête sans erreur sur un établissement déjà vide', async () => {
		// La purge se replanifie : la dernière passe retombe forcément sur un
		// établissement dont il ne reste rien. Elle ne doit ni boucler ni lever.
		const t = convexTest(schema, modules);
		const { organizationId } = await poserEtablissement(t);

		await t.mutation(internal.rgpd.purgerEtablissement, { organizationId, passe: 0 });
		await expect(
			t.mutation(internal.rgpd.purgerEtablissement, { organizationId, passe: 1 })
		).resolves.toBeNull();
	});
});

describe('la barrière des rôles', () => {
	async function poserMembres(t: ReturnType<typeof convexTest>) {
		return await t.run(async (ctx) => {
			const organizationId = await ctx.db.insert('organizations', {
				name: 'Clinique des Ormes',
				createdAt: Date.now()
			});
			await ctx.db.insert('organizationMembers', {
				organizationId,
				userId: 'user_admin',
				role: 'ORG_ADMIN',
				joinedAt: Date.now()
			});
			await ctx.db.insert('organizationMembers', {
				organizationId,
				userId: 'user_membre',
				role: 'ORG_MEMBER',
				joinedAt: Date.now()
			});
			return organizationId;
		});
	}

	it('laisse passer un administrateur', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserMembres(t);
		await t.run(async (ctx) => {
			const m = await requireOrgAdmin(ctx, organizationId, 'user_admin');
			expect(m.role).toBe('ORG_ADMIN');
		});
	});

	it('refuse un membre simple', async () => {
		const t = convexTest(schema, modules);
		const organizationId = await poserMembres(t);
		await t.run(async (ctx) => {
			await expect(requireOrgAdmin(ctx, organizationId, 'user_membre')).rejects.toThrow();
		});
	});

	it('refuse un étranger, même sur la simple appartenance', async () => {
		// C'est la barrière du cloisonnement multi-tenant, et elle compte plus que
		// celle du rôle : sans elle, connaître un identifiant d'organisation
		// suffirait à lire les factures d'un autre client.
		const t = convexTest(schema, modules);
		const organizationId = await poserMembres(t);
		await t.run(async (ctx) => {
			await expect(requireOrgMember(ctx, organizationId, 'user_inconnu')).rejects.toThrow();
			await expect(requireOrgAdmin(ctx, organizationId, 'user_inconnu')).rejects.toThrow();
		});
	});
});
