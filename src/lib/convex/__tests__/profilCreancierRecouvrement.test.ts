/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * LE PROFIL CRÉANCIER — déclaré, lu à deux endroits, et JAMAIS écrit.
 *
 * La table existe depuis le remodelage. Elle est purgée par le RGPD, lue par la
 * production de décompte et par la qualification de créance — et **aucun chemin
 * du produit ne l'écrivait**. C'est le troisième « déclaré, jamais renseigné »
 * de la semaine, après le SIREN du débiteur et `santePrecedente`.
 *
 * ⚠️ ET CELUI-CI NE COÛTAIT PAS QU'UN EN-TÊTE MANQUANT. `deduireConditions`
 * reçoit `creancierCommercant: profil?.estCommercant ?? 'unknown'`. Sans profil,
 * ce critère vaut TOUJOURS `unknown` — donc `entreCommercants` aussi, et
 * l'éligibilité à l'injonction de payer ne pouvait **jamais** être acquise.
 * Le produit annonçait une condition non remplie que rien ne permettait de
 * remplir.
 *
 * Le doute ne profite jamais au produit : `unknown` est le bon défaut. Ce qui
 * était faux, c'est qu'il n'y avait aucun moyen d'en sortir.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;

async function poserOrganisation(
	t: ReturnType<typeof convexTest>,
	nom = 'Thumbbb Agency'
): Promise<Id<'organizations'>> {
	return await t.run(async (ctx) =>
		ctx.db.insert('organizations', { name: nom, createdAt: Date.now() })
	);
}

describe('l’enregistrement du profil créancier', () => {
	it(
		'crée le profil quand il n’existe pas',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poserOrganisation(t);

			await t.mutation(internal.recouvrement.profil.enregistrerInterne, {
				organizationId,
				denomination: 'Thumbbb Agency',
				siren: '502 592 959',
				adresse: '12 rue des Ateliers, 75011 Paris',
				estCommercant: 'ok'
			});

			const profil = await t.run(async (ctx) => ctx.db.query('profilsCreancier').first());
			expect(profil?.denomination).toBe('Thumbbb Agency');
			// Le SIREN est normalisé, comme partout ailleurs dans le produit.
			expect(profil?.siren).toBe('502592959');
			expect(profil?.estCommercant).toBe('ok');
		},
		DELAI_CONVEX
	);

	it(
		'met à jour le profil existant au lieu d’en créer un second',
		async () => {
			// Un établissement n'a qu'un profil créancier. En créer un second
			// laisserait `first()` en choisir un au hasard, et le décompte porterait
			// une identité différente d'une production à l'autre.
			const t = convexTest(schema, modules);
			const organizationId = await poserOrganisation(t);

			for (const denomination of ['Thumbbb Agency', 'Thumbbb Agency SAS']) {
				await t.mutation(internal.recouvrement.profil.enregistrerInterne, {
					organizationId,
					denomination,
					estCommercant: 'ok'
				});
			}

			const profils = await t.run(async (ctx) => ctx.db.query('profilsCreancier').collect());
			expect(profils).toHaveLength(1);
			expect(profils[0]!.denomination).toBe('Thumbbb Agency SAS');
		},
		DELAI_CONVEX
	);

	it(
		'refuse un SIREN dont la clé ne tombe pas, EN LE NOMMANT',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poserOrganisation(t);

			await expect(
				t.mutation(internal.recouvrement.profil.enregistrerInterne, {
					organizationId,
					denomination: 'Thumbbb Agency',
					siren: '502592958',
					estCommercant: 'ok'
				})
			).rejects.toThrow(/502592958/);
		},
		DELAI_CONVEX
	);

	it(
		'refuse une dénomination vide — c’est ce qui s’imprime sur la pièce',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poserOrganisation(t);

			await expect(
				t.mutation(internal.recouvrement.profil.enregistrerInterne, {
					organizationId,
					denomination: '   ',
					estCommercant: 'ok'
				})
			).rejects.toThrow();
		},
		DELAI_CONVEX
	);

	it(
		'reste cloisonné : deux établissements, deux profils',
		async () => {
			const t = convexTest(schema, modules);
			const premier = await poserOrganisation(t, 'Ateliers Martin');
			const second = await poserOrganisation(t, 'Clinique des Ormes');

			await t.mutation(internal.recouvrement.profil.enregistrerInterne, {
				organizationId: premier,
				denomination: 'Ateliers Martin',
				estCommercant: 'ok'
			});
			await t.mutation(internal.recouvrement.profil.enregistrerInterne, {
				organizationId: second,
				denomination: 'Clinique des Ormes',
				estCommercant: 'unknown'
			});

			const profils = await t.run(async (ctx) => ctx.db.query('profilsCreancier').collect());
			expect(profils).toHaveLength(2);
			expect(profils.find((p) => p.organizationId === premier)?.estCommercant).toBe('ok');
			expect(profils.find((p) => p.organizationId === second)?.estCommercant).toBe('unknown');
		},
		DELAI_CONVEX
	);
});

/**
 * L'EFFET QUI COMPTE : la qualification cesse d'être bloquée.
 *
 * Sans ce test, on aurait une mutation qui écrit un champ que personne ne relit
 * — exactement le défaut que ce lot répare.
 */
describe('ce que le profil débloque', () => {
	it(
		'fait passer « entre commerçants » de indéterminé à établi',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await poserOrganisation(t);

			const { debiteurId, factureIds } = await t.run(async (ctx) => {
				const debiteurId = await ctx.db.insert('debiteurs', {
					organizationId,
					denomination: 'Fournitures Durand',
					denominationNormalisee: 'FOURNITURES DURAND',
					denominationsBrutes: ['Fournitures Durand'],
					estCommercant: 'ok',
					santeFinanciere: 'SAINE',
					creeLe: Date.now()
				});
				const factureId = await ctx.db.insert('facturesVente', {
					organizationId,
					debiteurId,
					reference: 'FA-2024-001',
					montantHT: 0n,
					montantTTC: 1_000_000n,
					dateEmission: '2024-01-01',
					dateEcheance: '2024-02-01',
					dateExigibilite: '2024-02-01',
					statutPaiement: 'IMPAYEE',
					creeLe: Date.now()
				});
				return { debiteurId, factureIds: [factureId] };
			});
			void debiteurId;

			// AVANT : aucun profil, donc le créancier est indéterminé.
			const avant = await t.mutation(internal.recouvrement.creances.creerCreance, {
				organizationId,
				factureIds,
				aujourdHui: '2026-09-09'
			});
			expect((await t.run(async (ctx) => ctx.db.get(avant)))?.entreCommercants).toBe('unknown');

			// APRÈS : le gérant a déclaré sa qualité de commerçant.
			await t.mutation(internal.recouvrement.profil.enregistrerInterne, {
				organizationId,
				denomination: 'Thumbbb Agency',
				estCommercant: 'ok'
			});

			const apres = await t.run(async (ctx) => {
				const facture = (await ctx.db.query('facturesVente').collect())[0]!;
				await ctx.db.patch(facture._id, { creanceId: undefined });
				return facture._id;
			});
			const creanceId = await t.mutation(internal.recouvrement.creances.creerCreance, {
				organizationId,
				factureIds: [apres],
				aujourdHui: '2026-09-09'
			});

			expect((await t.run(async (ctx) => ctx.db.get(creanceId)))?.entreCommercants).toBe('ok');
		},
		DELAI_CONVEX
	);
});
