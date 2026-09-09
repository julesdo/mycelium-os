/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { requireOrgAdmin, requireOrgMember, organisationCourante } from '../lib/auth';
import { tables as tablesBetterAuth } from '../betterAuth/schema';
import { MODELES_BETTER_AUTH_PAR_UTILISATEUR } from '../rgpd';

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

		await ctx.db.insert('battements', {
			organizationId,
			jour: '2026-09-03',
			statut: 'PARLE',
			raison: 'premier briefing',
			cles: ['FACTURE_ECHUE:FA-1'],
			montantIdentifie: 100_000n,
			termineLe: Date.now()
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
				'notifications',
				'battements'
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

/**
 * L'IDENTITÉ, EFFACÉE JUSQU'AU DERNIER MODÈLE.
 *
 * `oublierIdentite` retirait les sessions et les comptes, puis l'utilisateur.
 * Il laissait derrière lui la table `passkey` — c'est-à-dire, pour chaque
 * appareil enregistré, une clé publique, un identifiant de justificatif, le nom
 * que l'utilisateur a donné à son téléphone, et son `userId`.
 *
 * ⚠️ CE N'EST PAS SEULEMENT UNE DONNÉE PERSONNELLE QUI SURVIT, C'EST UN
 * JUSTIFICATIF D'AUTHENTIFICATION QUI SURVIT À SON COMPTE. Un secret dont le
 * titulaire a demandé l'effacement ne doit rester nulle part.
 *
 * Le composant Better Auth n'est pas monté dans ces tests — le faire coûterait
 * plus cher que ça ne rapporte. Ce qui se vérifie ici est donc la DÉCLARATION,
 * et c'est justement ce qui a manqué : personne n'avait de raison de relire la
 * liste des modèles le jour où le greffon `passkey` a été ajouté.
 */
describe('l’identité, effacée jusqu’au dernier modèle', () => {
	function modelesPorteursDeUserId(): string[] {
		return Object.entries(tablesBetterAuth)
			.filter(([nom]) => nom !== 'user') // supprimé à part, par son `_id`
			.filter(([, table]) => {
				const champs = (table as { validator: { fields?: Record<string, unknown> } }).validator
					.fields;
				return champs !== undefined && 'userId' in champs;
			})
			.map(([nom]) => nom);
	}

	it('purge TOUT modèle Better Auth qui rattache une ligne à un utilisateur', () => {
		// L'invariant, et non la liste : c'est lui qui fera tomber ce test le jour
		// où un greffon ajoutera un modèle par utilisateur — deux facteurs, jetons
		// d'application, appareils de confiance — sans que personne n'y pense.
		expect([...MODELES_BETTER_AUTH_PAR_UTILISATEUR].sort()).toEqual(
			modelesPorteursDeUserId().sort()
		);
	});

	it('nomme `passkey`, parce qu’un justificatif ne survit pas à son compte', () => {
		expect(MODELES_BETTER_AUTH_PAR_UTILISATEUR).toContain('passkey');
	});

	it('n’oublie ni les sessions ni les comptes', () => {
		expect(MODELES_BETTER_AUTH_PAR_UTILISATEUR).toContain('session');
		expect(MODELES_BETTER_AUTH_PAR_UTILISATEUR).toContain('account');
	});

	it('retire les sessions EN PREMIER', () => {
		// Tant qu'une session vit, le compte répond encore, et une fenêtre ouverte
		// ailleurs continuerait de travailler sur une identité en cours
		// d'effacement.
		expect(MODELES_BETTER_AUTH_PAR_UTILISATEUR[0]).toBe('session');
	});
});

/**
 * L'ÉTABLISSEMENT COURANT SE VÉRIFIE, IL NE SE CROIT PAS.
 *
 * `organisationCourante` lisait `userProfiles.currentOrganizationId` et le
 * rendait tel quel. Toutes les fonctions du domaine passent par là : ce champ
 * décidait donc, à lui seul, quelles factures un compte peut lire.
 *
 * ⚠️ LA BARRIÈRE MULTI-TENANT REPOSAIT SUR LA CORRECTION DE CHAQUE ÉCRIVAIN DE
 * CE CHAMP, ET PAS SUR UNE VÉRIFICATION AU POINT D'USAGE. `switchOrganization`
 * appelait bien `requireOrgMember` — mais `platformSwitchOrganization`, réservée
 * au rôle `admin` hérité de Fleet, le contournait EXPRÈS : elle posait
 * n'importe quelle organisation dans le profil, et toutes les lectures
 * suivaient. Une convention tenue à N endroits n'est pas une barrière ; une
 * vérification au point de lecture en est une.
 *
 * Le coût est d'une lecture d'index par requête, sur `by_org_and_user`. C'est le
 * prix de l'invariant le plus lourd du produit : « multi-tenant strict par
 * organizationId, SANS AUCUNE EXCEPTION ».
 */
describe('l’établissement courant', () => {
	async function poserDeuxEtablissements(t: ReturnType<typeof convexTest>) {
		return await t.run(async (ctx) => {
			const sien = await ctx.db.insert('organizations', {
				name: 'Ateliers Martin',
				createdAt: Date.now()
			});
			const autre = await ctx.db.insert('organizations', {
				name: 'Clinique des Ormes',
				createdAt: Date.now()
			});
			await ctx.db.insert('organizationMembers', {
				organizationId: sien,
				userId: 'user_gerant',
				role: 'ORG_ADMIN',
				joinedAt: Date.now()
			});
			await ctx.db.insert('userProfiles', {
				userId: 'user_gerant',
				currentOrganizationId: sien
			});
			return { sien, autre };
		});
	}

	it('rend l’établissement dont le compte est membre', async () => {
		const t = convexTest(schema, modules);
		const { sien } = await poserDeuxEtablissements(t);
		await t.run(async (ctx) => {
			expect(await organisationCourante(ctx, 'user_gerant')).toBe(sien);
		});
	});

	it('refuse un établissement posé dans le profil sans appartenance', async () => {
		// Le scénario exact que `platformSwitchOrganization` permettait : poser
		// l'organisation d'un autre client dans son propre profil, puis lire.
		const t = convexTest(schema, modules);
		const { autre } = await poserDeuxEtablissements(t);
		await t.run(async (ctx) => {
			const profil = await ctx.db
				.query('userProfiles')
				.withIndex('by_userId', (q) => q.eq('userId', 'user_gerant'))
				.unique();
			await ctx.db.patch(profil!._id, { currentOrganizationId: autre });
		});

		await t.run(async (ctx) => {
			await expect(organisationCourante(ctx, 'user_gerant')).rejects.toThrow();
		});
	});

	it('refuse aussi un compte qui a été retiré de l’établissement depuis', async () => {
		// Le profil n'est recalé que sur les chemins qui pensent à le faire. Si
		// l'un d'eux l'oublie, la lecture doit refuser d'elle-même.
		const t = convexTest(schema, modules);
		await poserDeuxEtablissements(t);
		await t.run(async (ctx) => {
			const appartenance = await ctx.db.query('organizationMembers').first();
			await ctx.db.delete(appartenance!._id);
		});

		await t.run(async (ctx) => {
			await expect(organisationCourante(ctx, 'user_gerant')).rejects.toThrow();
		});
	});
});

/**
 * IL N'Y A PAS DE RÔLE STAFF, DONC IL N'Y A PAS DE FONCTION QUI EN DÉPENDE.
 *
 * `CLAUDE.md` l'écrit depuis le remodelage : « Rôles : ORG_ADMIN, ORG_MEMBER.
 * Aucun rôle staff. » Le code, lui, portait encore tout le tableau de bord
 * d'administration de Fleet — bannir, révoquer les sessions, changer un rôle,
 * et SE FAIRE PASSER POUR UN AUTRE — sous forme de fonctions Convex PUBLIQUES.
 * Aucun écran ne les appelait, aucune route ne les servait, et la table d'audit
 * qui les tracait était vide en production : personne ne s'en est jamais servi.
 *
 * ⚠️ UNE CAPACITÉ QUE PERSONNE N'UTILISE ET QUE PERSONNE NE SURVEILLE N'EST PAS
 * NEUTRE. Sur un produit qui détient les impayés de ses clients, un chemin
 * d'usurpation dormant est une surface d'attaque sans contrepartie. Il est
 * retiré ; ce test empêche qu'il revienne par distraction.
 */
describe('aucune surface d’administration', () => {
	it('n’expose aucune fonction gardée par un rôle de plateforme', async () => {
		const fonctions = await import('../functions');
		expect('adminQuery' in fonctions).toBe(false);
		expect('adminMutation' in fonctions).toBe(false);
	});

	it('n’ouvre aucun contournement du cloisonnement par le profil', async () => {
		const organisations = await import('../organizations');
		expect('platformSwitchOrganization' in organisations).toBe(false);
	});

	it('ne déclare plus de journal d’audit d’administration', () => {
		// La table est retirée du schéma. Convex tolère une table orpheline en
		// base — elle était vide en production — mais plus rien ne peut y écrire.
		expect(Object.keys(schema.tables)).not.toContain('adminAuditLogs');
	});
});
