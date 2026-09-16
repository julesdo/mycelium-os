/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * CE QUE LE GÉRANT SEUL PEUT DIRE DE SON DÉBITEUR.
 *
 * « Le logiciel décide, le gérant confirme » (règle d'écran n° 1) : aucun écran
 * ne demande une saisie que le logiciel peut déduire. Restent deux choses qu'il
 * ne peut PAS déduire, et que le gérant connaît :
 *
 * 1. **Le SIREN.** C'est la charnière vers les registres publics. Aucun débiteur
 *    en base n'en portait avant le 9 septembre 2026 — le champ existait, rien ne
 *    l'écrivait. Le rattraper par Sirene demande une clé API qui n'est pas
 *    obtenue ; le gérant, lui, connaît ses clients.
 *
 * 2. **Le secteur**, dont dépend le DÉLAI DE PRESCRIPTION : cinq ans en régime
 *    général, un an sur le transport de marchandises.
 *
 * ⚠️ LE SECOND EST UNE DETTE QU'ON SOLDE ICI. La surveillance déclare depuis des
 * mois l'hypothèse « le secteur de X n'est pas déterminé : la prescription est
 * calculée sur le délai le plus court. **Préciser le secteur lèvera cette
 * hypothèse** » — et AUCUNE mutation ne permettait de le préciser. Le produit
 * donnait une consigne impossible à suivre, ce qui est pire qu'aucune consigne :
 * le gérant cherche, ne trouve pas, et cesse de croire les autres.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;

/** La date est un argument, jamais une lecture d'horloge. */
const AUJOURDHUI = '2026-09-16';

async function poser(
	t: ReturnType<typeof convexTest>,
	nom = 'Ateliers Martin'
): Promise<{ organizationId: Id<'organizations'>; debiteurId: Id<'debiteurs'> }> {
	return await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: nom,
			createdAt: Date.now()
		});
		const debiteurId = await ctx.db.insert('debiteurs', {
			organizationId,
			denomination: 'Fournitures Durand',
			denominationNormalisee: 'FOURNITURES DURAND',
			denominationsBrutes: ['Fournitures Durand'],
			estCommercant: 'ok',
			santeFinanciere: 'INCONNUE',
			creeLe: Date.now()
		});
		return { organizationId, debiteurId };
	});
}

describe('le SIREN saisi par le gérant', () => {
	it(
		'accepte un numéro valide, quelle que soit la graphie',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t);

			await t.mutation(internal.recouvrement.debiteurs.renseignerSirenInterne, {
				organizationId,
				debiteurId,
				siren: '853 479 236',
				aujourdHui: AUJOURDHUI
			});

			const debiteur = await t.run(async (ctx) => ctx.db.get(debiteurId));
			expect(debiteur?.siren).toBe('853479236');
		},
		DELAI_CONVEX
	);

	it(
		'refuse un numéro dont la clé ne tombe pas, EN LE NOMMANT',
		async () => {
			// Le message doit porter ce qui a été reçu : « numéro invalide » sur un
			// champ qu'on vient de taper n'aide personne à voir sa faute de frappe.
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t);

			await expect(
				t.mutation(internal.recouvrement.debiteurs.renseignerSirenInterne, {
					organizationId,
					debiteurId,
					siren: '853479237',
					aujourdHui: AUJOURDHUI
				})
			).rejects.toThrow(/853479237/);
		},
		DELAI_CONVEX
	);

	it(
		'accepte un SIRET et n’en garde que le SIREN',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t);

			await t.mutation(internal.recouvrement.debiteurs.renseignerSirenInterne, {
				organizationId,
				debiteurId,
				siren: '853 479 236 00017',
				aujourdHui: AUJOURDHUI
			});

			const debiteur = await t.run(async (ctx) => ctx.db.get(debiteurId));
			expect(debiteur?.siren).toBe('853479236');
		},
		DELAI_CONVEX
	);

	it(
		'permet d’effacer un numéro saisi par erreur',
		async () => {
			// ⚠️ CELUI-CI COMPTE PLUS QU'IL N'EN A L'AIR. Un SIREN faux mais bien
			// formé désigne une AUTRE entreprise : il ferait interroger les registres
			// publics sur un tiers, et un « aucune procédure » sur le mauvais numéro
			// se lirait comme un feu vert. Le gérant doit pouvoir le retirer.
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t);

			await t.mutation(internal.recouvrement.debiteurs.renseignerSirenInterne, {
				organizationId,
				debiteurId,
				siren: '853479236',
				aujourdHui: AUJOURDHUI
			});
			await t.mutation(internal.recouvrement.debiteurs.renseignerSirenInterne, {
				organizationId,
				debiteurId,
				siren: '',
				aujourdHui: AUJOURDHUI
			});

			const debiteur = await t.run(async (ctx) => ctx.db.get(debiteurId));
			expect(debiteur?.siren).toBeUndefined();
		},
		DELAI_CONVEX
	);

	it(
		'refuse d’écrire sur le débiteur d’un autre établissement',
		async () => {
			const t = convexTest(schema, modules);
			const mien = await poser(t, 'Ateliers Martin');
			const autre = await poser(t, 'Clinique des Ormes');

			await expect(
				t.mutation(internal.recouvrement.debiteurs.renseignerSirenInterne, {
					organizationId: mien.organizationId,
					debiteurId: autre.debiteurId,
					siren: '853479236',
					aujourdHui: AUJOURDHUI
				})
			).rejects.toThrow();

			const intact = await t.run(async (ctx) => ctx.db.get(autre.debiteurId));
			expect(intact?.siren).toBeUndefined();
		},
		DELAI_CONVEX
	);
});

/**
 * LA RÈGLE DE DROIT, ET SA REPRISE PAR LES CRÉANCES.
 *
 * Deux moitiés, et aucune barrière du dépôt ne voit la seconde.
 *
 * 1. **La règle.** L'article L210-1, alinéa 2, du code de commerce ferme quatre
 *    familles commerciales par la forme, dont les sociétés par actions. Une SAS
 *    relevée au registre répond donc à la question, et le gérant n'a plus à y
 *    répondre — `qualiteCommercantDeLaForme` la porte, sourcée et testée.
 *
 * 2. **La reprise.** `estCommercant` n'est lu qu'à la CONSTITUTION d'une
 *    créance. Une déduction qui arrive après — et elle arrive presque toujours
 *    après, puisqu'on identifie le débiteur au registre une fois les factures
 *    importées — n'atteindrait aucune créance existante. Le champ serait
 *    alimenté et jamais relu : c'est exactement le défaut que le compilateur ne
 *    voit pas, et c'est pour ça que ce test relie les deux bouts.
 *
 * ⚠️ ET CE QUE LA DÉDUCTION N'ÉCRASE PAS COMPTE AUTANT. Une créance dont le
 * critère est déjà tranché n'est pas touchée : le logiciel remplit ce qui est
 * vide, il ne corrige pas ce qui est dit.
 */
describe('la qualité de commerçant déduite de la forme relevée au registre', () => {
	async function poserAvecCreances(
		t: ReturnType<typeof convexTest>,
		nom = 'Thumbbb Agency'
	): Promise<{
		organizationId: Id<'organizations'>;
		debiteurId: Id<'debiteurs'>;
		aReprendre: Id<'creances'>;
		dejaTranchee: Id<'creances'>;
	}> {
		return await t.run(async (ctx) => {
			const organizationId = await ctx.db.insert('organizations', {
				name: nom,
				createdAt: Date.now()
			});

			await ctx.db.insert('profilsCreancier', {
				organizationId,
				denomination: nom,
				estCommercant: 'ok',
				majLe: Date.now()
			});

			const debiteurId = await ctx.db.insert('debiteurs', {
				organizationId,
				denomination: 'Fournitures Durand',
				denominationNormalisee: 'FOURNITURES DURAND',
				denominationsBrutes: ['Fournitures Durand'],
				// Ce que l'import écrit, et la seule valeur qu'il ait jamais écrite.
				estCommercant: 'unknown',
				santeFinanciere: 'SAINE',
				creeLe: Date.now()
			});

			const aReprendre = await ctx.db.insert('creances', {
				organizationId,
				debiteurId,
				statut: 'BROUILLON',
				certaine: 'ok',
				liquide: 'ok',
				exigible: 'ok',
				entreCommercants: 'unknown',
				creeLe: Date.now()
			});

			const dejaTranchee = await ctx.db.insert('creances', {
				organizationId,
				debiteurId,
				statut: 'BROUILLON',
				certaine: 'unknown',
				liquide: 'ok',
				exigible: 'ok',
				// Le gérant a répondu « non » : la déduction ne revient pas dessus.
				entreCommercants: 'ko',
				creeLe: Date.now()
			});

			return { organizationId, debiteurId, aReprendre, dejaTranchee };
		});
	}

	it(
		'répond à la place du gérant sur une SAS, et les créances ouvertes la reprennent',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId, aReprendre, dejaTranchee } = await poserAvecCreances(t);

			await t.mutation(internal.recouvrement.debiteurs.renseignerSirenInterne, {
				organizationId,
				debiteurId,
				siren: '853479236',
				formeJuridique: 'Société par Actions Simplifiée',
				aujourdHui: AUJOURDHUI
			});

			const debiteur = await t.run(async (ctx) => ctx.db.get(debiteurId));
			expect(debiteur?.estCommercant).toBe('ok');

			// La créance dont le critère était vide le reprend, et devient
			// QUALIFIEE : ses quatre conditions sont désormais tranchées, et sans
			// cette bascule la déduction lèverait la dernière question sans jamais
			// faire avancer la créance.
			const reprise = await t.run(async (ctx) => ctx.db.get(aReprendre));
			expect(reprise?.entreCommercants).toBe('ok');
			expect(reprise?.statut).toBe('QUALIFIEE');

			// Celle que le gérant avait tranchée reste intacte, et reste BROUILLON :
			// il lui manque encore `certaine`.
			const intacte = await t.run(async (ctx) => ctx.db.get(dejaTranchee));
			expect(intacte?.entreCommercants).toBe('ko');
			expect(intacte?.statut).toBe('BROUILLON');

			// ── Et la forme qui NE TRANCHE PAS ne touche à rien ─────────────────
			//
			// Une association n'est dans aucune des quatre familles de L210-1, et la
			// commercialité par l'activité est une controverse. Écrire `ko`
			// fermerait une voie sur un débat ; le doute ne profite jamais au
			// produit, et rien n'est patché.
			const autre = await poserAvecCreances(t, 'Le Cercle des Ormes');

			await t.mutation(internal.recouvrement.debiteurs.renseignerSirenInterne, {
				organizationId: autre.organizationId,
				debiteurId: autre.debiteurId,
				siren: '853479236',
				formeJuridique: 'Association déclarée',
				aujourdHui: AUJOURDHUI
			});

			const sansConclusion = await t.run(async (ctx) => ctx.db.get(autre.debiteurId));
			expect(sansConclusion?.estCommercant).toBe('unknown');

			const inchangee = await t.run(async (ctx) => ctx.db.get(autre.aReprendre));
			expect(inchangee?.entreCommercants).toBe('unknown');
			expect(inchangee?.statut).toBe('BROUILLON');
		},
		DELAI_CONVEX
	);
});

describe('le secteur saisi par le gérant', () => {
	it(
		'enregistre le secteur, ce qui change le délai de prescription',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t);

			await t.mutation(internal.recouvrement.debiteurs.renseignerSecteurInterne, {
				organizationId,
				debiteurId,
				secteur: 'TRANSPORT_MARCHANDISES'
			});

			const debiteur = await t.run(async (ctx) => ctx.db.get(debiteurId));
			expect(debiteur?.secteur).toBe('TRANSPORT_MARCHANDISES');
		},
		DELAI_CONVEX
	);

	it(
		'lève l’hypothèse que la surveillance déclarait',
		async () => {
			// Le test qui relie la saisie à son effet : sans lui, on aurait une
			// mutation qui écrit un champ que personne ne relit.
			const t = convexTest(schema, modules);
			const { organizationId, debiteurId } = await poser(t);
			await t.run(async (ctx) => {
				await ctx.db.insert('facturesVente', {
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
			});

			const avant = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: '2026-09-09'
			});
			expect(avant.hypotheses.join(' ')).toMatch(/secteur/i);

			await t.mutation(internal.recouvrement.debiteurs.renseignerSecteurInterne, {
				organizationId,
				debiteurId,
				secteur: 'GENERAL'
			});

			const apres = await t.query(internal.recouvrement.surveillance.fluxInterne, {
				organizationId,
				aujourdHui: '2026-09-09'
			});
			expect(apres.hypotheses).toEqual([]);
		},
		DELAI_CONVEX
	);

	it(
		'refuse d’écrire sur le débiteur d’un autre établissement',
		async () => {
			const t = convexTest(schema, modules);
			const mien = await poser(t, 'Ateliers Martin');
			const autre = await poser(t, 'Clinique des Ormes');

			await expect(
				t.mutation(internal.recouvrement.debiteurs.renseignerSecteurInterne, {
					organizationId: mien.organizationId,
					debiteurId: autre.debiteurId,
					secteur: 'GENERAL'
				})
			).rejects.toThrow();
		},
		DELAI_CONVEX
	);
});
