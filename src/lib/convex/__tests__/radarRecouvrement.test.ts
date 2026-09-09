/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * LE RADAR DE SOLVABILITÉ, BRANCHÉ SUR LA BASE.
 *
 * La lecture d'une annonce est couverte par ses propres tests, sur des
 * enregistrements réels. Ce qui n'existe QU'ICI, c'est l'application : retrouver
 * les débiteurs concernés dans TOUTES les organisations en une passe, et changer
 * leur état sans perdre le précédent.
 *
 * ⚠️ LE RAPPROCHEMENT SE FAIT PAR SIREN, ET JAMAIS PAR NOM. Sur un flux national
 * de plusieurs millions d'annonces, une correspondance de raison sociale finit
 * par annoncer à un gérant que son client solvable est en liquidation. C'est la
 * faute symétrique de la relance d'un client qui a déjà payé, et elle coûte plus
 * cher : elle fait cesser des livraisons.
 *
 * ⚠️ ET L'INDEX QUI REND CE RAPPROCHEMENT POSSIBLE TRAVERSE LES ORGANISATIONS.
 * C'est le seul du produit dans ce cas. Un test ci-dessous balaie le code pour
 * qu'aucune fonction publique ne s'en serve : une convention tenue à N endroits
 * se perd au premier ajout, une règle exécutable non.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;

const CONSTAT_LIQUIDATION = {
	identifiantAnnonce: 'A202601721671',
	siren: '853479236',
	dateParution: '2026-09-09',
	nature: "Jugement d'ouverture de liquidation judiciaire",
	dateJugement: '2026-08-31',
	tribunal: "Greffe du Tribunal de Commerce d'Evry",
	url: 'https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:A202601721671',
	effetSurLaSante: 'PROCEDURE_COLLECTIVE' as const
};

async function poserDebiteur(
	t: ReturnType<typeof convexTest>,
	options: { nom?: string; siren?: string } = {}
): Promise<{ organizationId: Id<'organizations'>; debiteurId: Id<'debiteurs'> }> {
	return await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: options.nom ?? 'Ateliers Martin',
			createdAt: Date.now()
		});
		const debiteurId = await ctx.db.insert('debiteurs', {
			organizationId,
			denomination: 'M.B FOOD',
			denominationNormalisee: 'MB FOOD',
			denominationsBrutes: ['M.B FOOD'],
			siren: options.siren,
			estCommercant: 'ok',
			santeFinanciere: 'SAINE',
			creeLe: Date.now()
		});
		return { organizationId, debiteurId };
	});
}

describe('l’application d’un constat', () => {
	it(
		'bascule l’état du débiteur dont le SIREN correspond',
		async () => {
			const t = convexTest(schema, modules);
			const { debiteurId } = await poserDebiteur(t, { siren: '853479236' });

			await t.mutation(internal.recouvrement.radar.appliquerConstats, {
				constats: [CONSTAT_LIQUIDATION]
			});

			const debiteur = await t.run(async (ctx) => ctx.db.get(debiteurId));
			expect(debiteur?.santeFinanciere).toBe('PROCEDURE_COLLECTIVE');
			expect(debiteur?.santePrecedente).toBe('SAINE');
		},
		DELAI_CONVEX
	);

	it(
		'garde le constat VERBATIM, avec sa source citable',
		async () => {
			const t = convexTest(schema, modules);
			const { debiteurId } = await poserDebiteur(t, { siren: '853479236' });

			await t.mutation(internal.recouvrement.radar.appliquerConstats, {
				constats: [CONSTAT_LIQUIDATION]
			});

			const debiteur = await t.run(async (ctx) => ctx.db.get(debiteurId));
			expect(debiteur?.constatRegistre?.nature).toBe(
				"Jugement d'ouverture de liquidation judiciaire"
			);
			expect(debiteur?.constatRegistre?.url).toMatch(/bodacc\.fr/);
			expect(debiteur?.constatRegistre?.dateJugement).toBe('2026-08-31');
		},
		DELAI_CONVEX
	);

	it(
		'touche TOUS les établissements qui suivent ce débiteur',
		async () => {
			// Deux clients peuvent avoir le même débiteur. Le delta est national :
			// n'en servir qu'un laisserait l'autre engager des frais sur une
			// entreprise en liquidation.
			const t = convexTest(schema, modules);
			const premier = await poserDebiteur(t, { nom: 'Ateliers Martin', siren: '853479236' });
			const second = await poserDebiteur(t, { nom: 'Clinique des Ormes', siren: '853479236' });

			await t.mutation(internal.recouvrement.radar.appliquerConstats, {
				constats: [CONSTAT_LIQUIDATION]
			});

			const etats = await t.run(async (ctx) => [
				(await ctx.db.get(premier.debiteurId))?.santeFinanciere,
				(await ctx.db.get(second.debiteurId))?.santeFinanciere
			]);
			expect(etats).toEqual(['PROCEDURE_COLLECTIVE', 'PROCEDURE_COLLECTIVE']);
		},
		DELAI_CONVEX
	);

	it(
		'ne touche PAS un débiteur au nom identique mais sans SIREN',
		async () => {
			// ⚠️ LE TEST LE PLUS IMPORTANT DU FICHIER. Le débiteur porte le MÊME nom
			// que l'entreprise en liquidation. Un rapprochement par raison sociale le
			// déclarerait insolvable, et le gérant cesserait de le livrer.
			const t = convexTest(schema, modules);
			const { debiteurId } = await poserDebiteur(t, { siren: undefined });

			await t.mutation(internal.recouvrement.radar.appliquerConstats, {
				constats: [CONSTAT_LIQUIDATION]
			});

			const debiteur = await t.run(async (ctx) => ctx.db.get(debiteurId));
			expect(debiteur?.santeFinanciere).toBe('SAINE');
			expect(debiteur?.constatRegistre).toBeUndefined();
		},
		DELAI_CONVEX
	);

	it(
		'enregistre le constat sans changer l’état quand l’annonce n’est pas une ouverture',
		async () => {
			// Une interdiction de gérer vise une PERSONNE. Le gérant doit la voir ;
			// elle ne dit rien de la solvabilité de la société.
			const t = convexTest(schema, modules);
			const { debiteurId } = await poserDebiteur(t, { siren: '853479236' });

			await t.mutation(internal.recouvrement.radar.appliquerConstats, {
				constats: [
					{
						...CONSTAT_LIQUIDATION,
						nature: "Jugement d'interdiction de gérer",
						effetSurLaSante: 'AUCUN' as const
					}
				]
			});

			const debiteur = await t.run(async (ctx) => ctx.db.get(debiteurId));
			expect(debiteur?.santeFinanciere).toBe('SAINE');
			expect(debiteur?.constatRegistre?.nature).toBe("Jugement d'interdiction de gérer");
		},
		DELAI_CONVEX
	);

	it(
		'ne rejoue pas la même annonce',
		async () => {
			// Le delta peut être rejoué après un incident. `santePrecedente` doit
			// garder l'état d'AVANT le premier passage, pas celui d'après — sinon la
			// dégradation disparaît du flux au second passage.
			const t = convexTest(schema, modules);
			const { debiteurId } = await poserDebiteur(t, { siren: '853479236' });

			await t.mutation(internal.recouvrement.radar.appliquerConstats, {
				constats: [CONSTAT_LIQUIDATION]
			});
			await t.mutation(internal.recouvrement.radar.appliquerConstats, {
				constats: [CONSTAT_LIQUIDATION]
			});

			const debiteur = await t.run(async (ctx) => ctx.db.get(debiteurId));
			expect(debiteur?.santePrecedente).toBe('SAINE');
		},
		DELAI_CONVEX
	);

	it(
		'ne restaure JAMAIS un état sain',
		async () => {
			// Décider qu'une entreprise va de nouveau bien est une LECTURE JURIDIQUE,
			// et elle irait dans le sens qui fait engager des frais. Le constat de
			// clôture s'affiche ; l'état reste où il est.
			const t = convexTest(schema, modules);
			const { debiteurId } = await poserDebiteur(t, { siren: '853479236' });
			await t.run(async (ctx) => {
				await ctx.db.patch(debiteurId, { santeFinanciere: 'PROCEDURE_COLLECTIVE' });
			});

			await t.mutation(internal.recouvrement.radar.appliquerConstats, {
				constats: [
					{
						...CONSTAT_LIQUIDATION,
						identifiantAnnonce: 'A-CLOTURE',
						nature: 'Jugement de clôture pour insuffisance d’actif',
						effetSurLaSante: 'AUCUN' as const
					}
				]
			});

			const debiteur = await t.run(async (ctx) => ctx.db.get(debiteurId));
			expect(debiteur?.santeFinanciere).toBe('PROCEDURE_COLLECTIVE');
		},
		DELAI_CONVEX
	);
});

/**
 * L'INDEX QUI TRAVERSE LES ORGANISATIONS, ET LA RÈGLE QUI LE GARDE.
 *
 * `debiteurs.by_siren` est le seul index du produit qui ne commence pas par
 * `organizationId`. Il existe pour une raison mesurée : le delta BODACC est
 * national, et interroger organisation par organisation multiplierait les
 * lectures par le nombre de clients pour chaque annonce du jour.
 *
 * ⚠️ UNE REQUÊTE AUTHENTIFIÉE QUI S'EN SERVIRAIT RENDRAIT LES DÉBITEURS
 * D'AUTRES CLIENTS. Le commentaire du schéma le dit ; ce test le fait respecter.
 */
describe('l’index inter-organisations reste interne', () => {
	function fichiersConvex(dossier: string): string[] {
		const trouves: string[] = [];
		for (const entree of readdirSync(dossier)) {
			const chemin = join(dossier, entree);
			if (statSync(chemin).isDirectory()) {
				if (entree === '_generated' || entree === '__tests__') continue;
				trouves.push(...fichiersConvex(chemin));
				continue;
			}
			if (entree.endsWith('.ts')) trouves.push(chemin);
		}
		return trouves;
	}

	it('n’est nommé que par des fonctions internes', () => {
		const racine = join(process.cwd(), 'src', 'lib', 'convex');
		const fautifs: string[] = [];

		for (const chemin of fichiersConvex(racine)) {
			const source = readFileSync(chemin, 'utf8');
			if (!source.includes("'by_siren'")) continue;

			// Le fichier nomme l'index : il ne doit exposer AUCUNE fonction
			// authentifiée, sans quoi rien ne garantit qu'elles ne s'en servent pas.
			if (/\b(authedQuery|authedMutation)\s*\(/.test(source)) {
				fautifs.push(relative(process.cwd(), chemin));
			}
		}

		expect(fautifs).toEqual([]);
	});

	it('le balayage voit bien les fichiers Convex', () => {
		// Garde-fou du garde-fou : sur une liste vide, l'assertion ci-dessus
		// passerait toujours et ce test deviendrait un mensonge silencieux.
		const racine = join(process.cwd(), 'src', 'lib', 'convex');
		expect(fichiersConvex(racine).length).toBeGreaterThan(15);
	});
});

/**
 * UN RADAR QUE PERSONNE N'APPELLE N'EST PAS UN RADAR.
 *
 * C'est le défaut le plus facile à commettre : écrire l'action, la tester, et
 * oublier de la déclencher. Le produit afficherait alors « aucune procédure
 * connue » sur des débiteurs qu'il n'a jamais interrogés — avec, en plus, la
 * conviction écrite que la surveillance tourne.
 */
describe('le déclenchement du radar', () => {
	it('est branché sur un cron quotidien', async () => {
		const crons = (await import('../crons')).default as unknown as {
			crons: Record<string, unknown>;
		};
		const declare = Object.values(crons.crons).some((job) =>
			JSON.stringify(job).includes('radarQuotidien')
		);
		expect(declare).toBe(true);
	});

	it('tourne AVANT le battement, pas après', async () => {
		// Le briefing du matin doit porter ce que le radar a trouvé la nuit. S'il
		// partait d'abord, la procédure collective découverte à six heures
		// n'atteindrait le gérant que le lendemain — vingt-quatre heures pendant
		// lesquelles il peut engager des frais.
		const crons = (await import('../crons')).default as unknown as {
			crons: Record<string, { schedule?: { hourUTC?: number }; name?: string }>;
		};
		// ⚠️ ON CHERCHE SUR LA CLÉ ET SUR LA VALEUR. Le nom du cron est la CLÉ
		// (« battementQuotidien ») ; la valeur ne porte que le nom de la fonction
		// appelée (« recouvrement/battement:planifierBattements »). Ne fouiller que
		// la valeur faisait échouer ce test sur le cron qui existait déjà.
		const entrees = Object.entries(crons.crons);
		const heureDe = (nom: string) =>
			entrees.find(([cle, job]) => cle === nom || JSON.stringify(job).includes(nom))?.[1]?.schedule
				?.hourUTC;

		const radar = heureDe('radarQuotidien');
		const battement = heureDe('battementQuotidien');
		expect(radar).toBeDefined();
		expect(battement).toBeDefined();
		expect(radar!).toBeLessThan(battement!);
	});
});
