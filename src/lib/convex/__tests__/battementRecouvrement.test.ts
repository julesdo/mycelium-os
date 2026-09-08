/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * LE BATTEMENT — la plomberie, et ce qu'elle doit garantir.
 *
 * Trois propriétés se vérifient ici et nulle part ailleurs, parce qu'elles
 * naissent de l'interaction avec la base et pas de la règle :
 *
 * 1. ON NE REJOUE PAS. Deux exécutions le même jour laissent un seul relevé.
 * 2. L'ÉCHEC LAISSE UNE TRACE. Un battement qui plante s'enregistre en `ECHEC`,
 *    pour que l'interface du client puisse le dire.
 * 3. LE SILENCE S'ENREGISTRE AUSSI. Se taire est un résultat : sans relevé, le
 *    lendemain croirait que rien n'a tourné et parlerait pour rien.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;

async function organisation(t: ReturnType<typeof convexTest>) {
	return t.run(async (ctx) =>
		ctx.db.insert('organizations', { name: 'Ateliers Martin', createdAt: Date.now() })
	);
}

/**
 * Une organisation portant une facture ILLISIBLE — pas au sens Convex (le
 * schéma ne contraint `dateEcheance` qu'à être une chaîne), mais au sens du
 * calcul de prescription : `pays/france/prescription.ts` → `ajouterMois` →
 * `decomposer` exige le format `AAAA-MM-JJ` et JETTE sinon.
 *
 * C'est le moyen honnête trouvé pour faire échouer `fluxInterne` : une facture
 * qui référence un débiteur INEXISTANT, elle, NE JETTE PAS — `assembler` la
 * cherche dans une `Map` construite en mémoire, qui rend simplement
 * `undefined` et retombe sur le secteur `INDETERMINE` sans lever la moindre
 * exception. Une date illisible, en revanche, traverse la validation Convex
 * (c'est une chaîne) puis fait exploser `ajouterMois` au moment de calculer la
 * date de prescription — un vrai échec du code, pas un mock qui le simulerait.
 */
async function organisationAvecFactureIllisible(
	t: ReturnType<typeof convexTest>
): Promise<{ organizationId: Id<'organizations'>; factureId: Id<'facturesVente'> }> {
	return t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Ateliers Martin',
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
		const factureId = await ctx.db.insert('facturesVente', {
			organizationId,
			debiteurId,
			reference: 'FA-ILLISIBLE',
			montantHT: 0n,
			montantTTC: 100_00n,
			dateEmission: '2026-01-01',
			dateEcheance: 'pas-une-date',
			statutPaiement: 'IMPAYEE',
			creeLe: Date.now()
		});
		return { organizationId, factureId };
	});
}

describe('executerPourOrganisation', () => {
	it(
		'enregistre un relevé même quand il n’y a rien à dire',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await organisation(t);

			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-03'
			});

			const releves = await t.run(async (ctx) => ctx.db.query('battements').collect());
			expect(releves).toHaveLength(1);
			expect(releves[0]!.jour).toBe('2026-09-03');
		},
		DELAI_CONVEX
	);

	it(
		'refuse de rejouer le même jour',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await organisation(t);

			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-03'
			});
			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-03'
			});

			const releves = await t.run(async (ctx) => ctx.db.query('battements').collect());
			expect(releves).toHaveLength(1);
		},
		DELAI_CONVEX
	);

	it(
		'se tait le lendemain quand rien n’a bougé, et l’enregistre',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await organisation(t);

			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-03'
			});
			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-04'
			});

			const releve = await t.run(async (ctx) =>
				ctx.db
					.query('battements')
					.withIndex('by_org_and_jour', (q) =>
						q.eq('organizationId', organizationId).eq('jour', '2026-09-04')
					)
					.unique()
			);
			expect(releve?.statut).toBe('TU');
		},
		DELAI_CONVEX
	);

	it(
		'cloisonne par organisation',
		async () => {
			// Le multi-tenant est strict, sans exception. Le battement d'une
			// organisation ne doit rien lire ni écrire chez une autre.
			const t = convexTest(schema, modules);
			const premiere = await organisation(t);
			const seconde = await organisation(t);

			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId: premiere,
				jour: '2026-09-03'
			});

			const chezLaSeconde = await t.run(async (ctx) =>
				ctx.db
					.query('battements')
					.withIndex('by_org', (q) => q.eq('organizationId', seconde))
					.collect()
			);
			expect(chezLaSeconde).toEqual([]);
		},
		DELAI_CONVEX
	);

	it(
		'un échec laisse une trace, avec le message d’erreur',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId } = await organisationAvecFactureIllisible(t);

			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-03'
			});

			const releve = await t.run(async (ctx) =>
				ctx.db
					.query('battements')
					.withIndex('by_org_and_jour', (q) =>
						q.eq('organizationId', organizationId).eq('jour', '2026-09-03')
					)
					.unique()
			);
			expect(releve?.statut).toBe('ECHEC');
			expect(releve?.erreur).toContain('AAAA-MM-JJ');
		},
		DELAI_CONVEX
	);

	it(
		'un relevé en ÉCHEC ne compte pas comme précédent pour le jour suivant',
		async () => {
			// `precedentDe` écarte les relevés en ÉCHEC — c'est écrit dans son
			// commentaire, mais rien ne l'exerçait avant ce test.
			const t = convexTest(schema, modules);
			const { organizationId, factureId } = await organisationAvecFactureIllisible(t);

			// Nuit 1 : échoue à cause de la facture illisible.
			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-03'
			});

			// On répare avant la nuit suivante. `SOLDEE` écarte la facture de
			// l'assemblage AVANT qu'il ne lise sa date d'échéance (voir
			// `assembler` dans `surveillance.ts`), donc le battement du 04 ne peut
			// plus planter sur elle, et son flux d'événements est vide.
			await t.run(async (ctx) => {
				await ctx.db.patch(factureId, { statutPaiement: 'SOLDEE' });
			});

			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-04'
			});

			const releveDuLendemain = await t.run(async (ctx) =>
				ctx.db
					.query('battements')
					.withIndex('by_org_and_jour', (q) =>
						q.eq('organizationId', organizationId).eq('jour', '2026-09-04')
					)
					.unique()
			);

			// Le flux du 04 est vide. Si `precedentDe` traitait à tort le relevé
			// ÉCHEC du 03 comme un précédent valable (`cles: []`), `decider`
			// comparerait un flux vide à des clés vides, ne trouverait rien de
			// nouveau ni de critique, et se tairait (`SE_TAIRE`). En l'écartant
			// correctement, `precedentDe` ne trouve AUCUN précédent : c'est comme
			// si c'était le premier relevé exploitable de l'organisation, donc
			// `decider` PARLE avec la raison « premier briefing » — quel que soit
			// le contenu du flux.
			expect(releveDuLendemain?.statut).toBe('PARLE');
			expect(releveDuLendemain?.raison).toBe('premier briefing');
		},
		DELAI_CONVEX
	);

	it(
		'ne tente aucun envoi quand l’organisation n’a aucun membre',
		async () => {
			// Une organisation sans membre est un cas NORMAL, pas une erreur : elle
			// vient d'être créée. Le battement doit s'exécuter et s'enregistrer
			// quand même, au lieu de se marquer en échec pour une situation saine.
			const t = convexTest(schema, modules);
			const organizationId = await organisation(t);

			await t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
				organizationId,
				jour: '2026-09-03'
			});

			const releve = await t.run(async (ctx) =>
				ctx.db
					.query('battements')
					.withIndex('by_org_and_jour', (q) =>
						q.eq('organizationId', organizationId).eq('jour', '2026-09-03')
					)
					.unique()
			);
			expect(releve?.statut).toBe('PARLE');
			expect(releve?.erreur).toBeUndefined();
		},
		DELAI_CONVEX
	);

	it(
		'deux battements concurrents sur le même jour ne laissent qu’un relevé',
		async () => {
			// ⚠️ CE QUE CE TEST PROUVE : que lancer deux `executerPourOrganisation`
			// sur le même couple organisation/jour, y compris en parallèle côté
			// appelant, n'aboutit jamais à deux relevés dans ce harnais.
			//
			// ⚠️ CE QU'IL NE PROUVE PAS : l'atomicité en production. `convex-test`
			// simule le backend en mémoire et, à l'observation, exécute chaque
			// `t.mutation()` jusqu'au bout avant de commencer le suivant — il n'y a
			// pas ici de vraie exécution concurrente de deux transactions qui
			// liraient toutes les deux « rien à ce jour » avant que l'une des deux
			// n'écrive. `Promise.all` ne fait donc que lancer les deux promesses
			// sans garantir un entrelacement réel des lectures et écritures. Une
			// preuve d'atomicité véritable demanderait un déploiement Convex réel
			// (ou local), hors de portée d'un test unitaire.
			const t = convexTest(schema, modules);
			const organizationId = await organisation(t);

			await Promise.all([
				t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
					organizationId,
					jour: '2026-09-03'
				}),
				t.mutation(internal.recouvrement.battement.executerPourOrganisation, {
					organizationId,
					jour: '2026-09-03'
				})
			]);

			const releves = await t.run(async (ctx) => ctx.db.query('battements').collect());
			expect(releves).toHaveLength(1);
		},
		DELAI_CONVEX
	);
});
