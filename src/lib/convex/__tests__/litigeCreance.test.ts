/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * LE QUESTIONNAIRE DE QUALIFICATION DE LITIGE, ÉCRIT EN BASE — module 3.2.
 *
 * La lecture des faits est couverte par `verticales/recouvrement/litige`, en
 * mémoire et sans harnais. Ce qui n'existe QU'ICI :
 *
 *   · la déclaration atteint RÉELLEMENT la créance, et `certaine` en découle
 *     au lieu d'être écrit à la main ;
 *   · une contestation déclarée FERME l'éligibilité, quel que soit le score ;
 *   · écarter les cinq faits fait passer la créance en QUALIFIEE — c'est le
 *     seul chemin du produit qui y mène ;
 *   · une réponse se corrige sans se dupliquer ;
 *   · rien ne franchit la frontière d'un autre établissement.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;
const AUJOURDHUI = '2026-09-03';

const TOUS_ECARTES = [
	'CONTESTATION_ECRITE',
	'REFUS_RECEPTION',
	'AVOIR_RECLAME',
	'PENALITES_OPPOSEES',
	'INSTANCE_EN_COURS'
] as const;

async function poserCreance(
	t: ReturnType<typeof convexTest>,
	nomOrg = 'Thumbbb Agency'
): Promise<{ organizationId: Id<'organizations'>; creanceId: Id<'creances'> }> {
	const organizationId = await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: nomOrg,
			createdAt: Date.now()
		});
		await ctx.db.insert('profilsCreancier', {
			organizationId,
			denomination: nomOrg,
			estCommercant: 'ok',
			majLe: Date.now()
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
		await ctx.db.insert('facturesVente', {
			organizationId,
			debiteurId,
			reference: 'FA-1',
			montantHT: 0n,
			montantTTC: 1_200_000n,
			dateEmission: '2026-04-15',
			dateEcheance: '2026-05-15',
			dateExigibilite: '2026-05-15',
			exigibiliteDeduite: true,
			statutPaiement: 'IMPAYEE',
			creeLe: Date.now()
		});
		return organizationId;
	});

	const factureIds = await t.run(async (ctx) =>
		(await ctx.db.query('facturesVente').collect())
			.filter((f) => f.organizationId === organizationId)
			.map((f) => f._id)
	);

	const creanceId = await t.mutation(internal.recouvrement.creances.creerCreance, {
		organizationId,
		factureIds,
		aujourdHui: AUJOURDHUI
	});

	return { organizationId, creanceId };
}

async function declarer(
	t: ReturnType<typeof convexTest>,
	creanceId: Id<'creances'>,
	cle: (typeof TOUS_ECARTES)[number] | 'RECONNAISSANCE_ECRITE',
	reponse: 'OUI' | 'NON' | 'INCONNU'
) {
	return await t.mutation(internal.recouvrement.creances.declarerFaitLitige, {
		creanceId,
		cle,
		reponse,
		aujourdHui: AUJOURDHUI
	});
}

describe('déclarer un fait de litige', () => {
	it(
		'l’écrit sur la créance et en DÉDUIT le caractère certain',
		async () => {
			// ⚠️ LE TEST QUI PORTE LE MODULE. `certaine` ne s'écrit plus à la main :
			// il est la lecture des faits déclarés. Si cette assertion tombe, on est
			// revenu à demander au gérant une qualification juridique.
			const t = convexTest(schema, modules);
			const { creanceId } = await poserCreance(t);

			await declarer(t, creanceId, 'CONTESTATION_ECRITE', 'OUI');

			const creance = await t.run(async (ctx) => (await ctx.db.get(creanceId))!);
			expect(creance.certaine).toBe('ko');
			expect(creance.faitsLitige).toEqual([
				{ cle: 'CONTESTATION_ECRITE', reponse: 'OUI', declareLe: expect.any(Number) }
			]);
		},
		DELAI_CONVEX
	);

	it(
		'une contestation déclarée FERME l’éligibilité',
		async () => {
			// C'est la moitié du module 3.2 : « une réponse positive marque le
			// dossier comme litigieux et ferme les procédures simplifiées ».
			const t = convexTest(schema, modules);
			const { creanceId } = await poserCreance(t);

			const avant = await declarer(t, creanceId, 'CONTESTATION_ECRITE', 'NON');
			const apres = await declarer(t, creanceId, 'CONTESTATION_ECRITE', 'OUI');

			expect(avant.litigieux).toBe(false);
			expect(apres.litigieux).toBe(true);
			expect(apres.certaine).toBe('ko');
		},
		DELAI_CONVEX
	);

	it(
		'écarter les cinq faits fait passer la créance en QUALIFIEE',
		async () => {
			// ⚠️ C'EST LE SEUL CHEMIN DU PRODUIT QUI Y MÈNE. `deduction.ts` pose
			// `certaine: 'unknown'` en toutes circonstances ; sans ce questionnaire,
			// aucune créance ne pouvait sortir de BROUILLON.
			const t = convexTest(schema, modules);
			const { creanceId } = await poserCreance(t);

			for (const cle of TOUS_ECARTES) await declarer(t, creanceId, cle, 'NON');

			const creance = await t.run(async (ctx) => (await ctx.db.get(creanceId))!);
			expect(creance.certaine).toBe('ok');
			expect(creance.statut).toBe('QUALIFIEE');
			expect(creance.qualifieeLe).toEqual(expect.any(Number));
		},
		DELAI_CONVEX
	);

	it(
		'corrige une réponse sans la dupliquer',
		async () => {
			// Un gérant qui se reprend ne doit pas laisser deux vérités en base :
			// la lecture prendrait la première trouvée, donc peut-être la fausse.
			const t = convexTest(schema, modules);
			const { creanceId } = await poserCreance(t);

			await declarer(t, creanceId, 'AVOIR_RECLAME', 'OUI');
			await declarer(t, creanceId, 'AVOIR_RECLAME', 'NON');

			const creance = await t.run(async (ctx) => (await ctx.db.get(creanceId))!);
			expect(creance.faitsLitige?.filter((f) => f.cle === 'AVOIR_RECLAME')).toHaveLength(1);
			expect(creance.faitsLitige?.[0]?.reponse).toBe('NON');
			expect(creance.certaine).not.toBe('ko');
		},
		DELAI_CONVEX
	);

	it(
		'rend les questions qui restent, et s’arrête sur un litige établi',
		async () => {
			const t = convexTest(schema, modules);
			const { creanceId } = await poserCreance(t);

			const depart = await declarer(t, creanceId, 'CONTESTATION_ECRITE', 'NON');
			expect(depart.questionsRestantes.length).toBe(5);

			const apres = await declarer(t, creanceId, 'REFUS_RECEPTION', 'OUI');
			expect(apres.questionsRestantes).toEqual([]);
		},
		DELAI_CONVEX
	);

	it(
		'ne franchit jamais la frontière d’un autre établissement',
		async () => {
			const t = convexTest(schema, modules);
			const mien = await poserCreance(t);
			const autre = await poserCreance(t, 'Clinique des Ormes');

			await declarer(t, mien.creanceId, 'CONTESTATION_ECRITE', 'OUI');

			const voisine = await t.run(async (ctx) => (await ctx.db.get(autre.creanceId))!);
			expect(voisine.faitsLitige ?? []).toEqual([]);
			expect(voisine.certaine).toBe('unknown');
		},
		DELAI_CONVEX
	);
});
