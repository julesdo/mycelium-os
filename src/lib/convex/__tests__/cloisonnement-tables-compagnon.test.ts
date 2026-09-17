/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * LE CLOISONNEMENT DES QUATRE TABLES DU COMPAGNON, VÉRIFIÉ PAR L'EFFACEMENT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI UN TEST DE PLUS, ALORS QU'UNE BARRIÈRE BALAIE DÉJÀ LE SCHÉMA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `purge-complete.test.ts` vérifie la CITATION : il relève toute table qui
 * déclare `organizationId: v.id('organizations')` et échoue si son nom
 * n'apparaît pas dans `rgpd.ts`. C'est ce qu'il faut pour attraper l'oubli — et
 * **un commentaire suffit à le rendre vert**. Le mot `'remisesAuConseil'` écrit
 * dans une phrase de documentation lui convient.
 *
 * Ce test-ci vérifie l'EFFACEMENT : on peuple deux établissements, on en purge
 * un, et on regarde ce qui reste. Les deux sont nécessaires et aucun ne
 * remplace l'autre — la citation attrape la table qu'on a oublié d'inscrire,
 * l'effacement attrape celle qu'on a inscrite sans la brancher.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUE LE FIXTURE COUVRE, ET POURQUOI IL COUVRE TOUS LES ÉTATS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Deux de ces tables portent des lignes que le produit ne supprime JAMAIS de
 * lui-même : le `journal` est en append seul, et une proposition `ECARTEE` est
 * marquée, jamais retirée, parce que le cycle de vie de la proposition EST la
 * piste d'audit. Ce sont précisément les lignes qu'une purge écrite trop vite
 * épargnerait — « celles-là, on les garde » — et le manquement resterait
 * invisible, puisque l'établissement aurait déjà disparu de l'interface.
 *
 * Le fixture pose donc une ligne par état déclaré, terminaux compris, et
 * l'assertion est la même pour tous : après la purge, il ne reste rien.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

/**
 * Le harnais, typé PAR LE SCHÉMA et pas par le générique.
 *
 * Le type rendu par `convexTest` pris nu porte un modèle de données GÉNÉRIQUE :
 * les noms de table y sont des chaînes libres et `withIndex('by_org')` n'y
 * compile pas. Passer par une fabrique nommée garde l'inférence du schéma, et
 * un index mal orthographié redevient une erreur du compilateur plutôt qu'un
 * test qui balaie la table en silence.
 */
function harnais() {
	return convexTest(schema, modules);
}

type Harnais = ReturnType<typeof harnais>;

/** Ce que le fixture pose par établissement, dans les quatre tables neuves. */
const LIGNES_PAR_ETABLISSEMENT = {
	journal: 2,
	propositions: 3,
	conversations: 4,
	remisesAuConseil: 4
};

const RIEN = { journal: 0, propositions: 0, conversations: 0, remisesAuConseil: 0 };

async function poserEtablissement(t: Harnais, nom: string): Promise<Id<'organizations'>> {
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

		const decompteId = await ctx.db.insert('decomptes', {
			organizationId,
			creanceId,
			arreteAu: '2026-09-16',
			convention: 'ACT_365',
			principalRestantDu: 1_248_033n,
			interets: 0n,
			indemniteForfaitaire: 4_000n,
			total: 1_252_033n,
			lignes: [],
			produitLe: Date.now()
		});

		const storageId = await ctx.storage.store(new Blob([String.fromCharCode(66)]));
		const pieceId = await ctx.db.insert('pieces', {
			organizationId,
			type: 'BON_DE_LIVRAISON',
			storageId,
			filename: 'bl-2024-77.pdf',
			debiteurId,
			ajouteeLe: Date.now()
		});

		const intervenantId = await ctx.db.insert('intervenants', {
			organizationId,
			nom: 'Maître Berger',
			role: 'AVOCAT',
			origine: 'SAISI_A_LA_MAIN',
			creeLe: Date.now()
		});

		// ── Le journal : les deux auteurs possibles ───────────────────────────
		await ctx.db.insert('journal', {
			organizationId,
			cible: debiteurId,
			cle: 'qualite-relevee-au-registre',
			avant: 'indéterminée',
			apres: 'commerçant',
			source: 'BODACC du 16/09/2026',
			auteur: 'MACHINE',
			consigneLe: Date.now()
		});
		await ctx.db.insert('journal', {
			organizationId,
			cible: creanceId,
			cle: 'contestation-recue-hors-du-logiciel',
			apres: 'contestation connue le 16/09/2026',
			auteur: 'GERANT',
			auteurUserId: 'user_gerant',
			consigneLe: Date.now()
		});

		// ── Les propositions : les trois états, et les deux formes de source ──
		await ctx.db.insert('propositions', {
			organizationId,
			cible: creanceId,
			champ: 'reserveALaLivraison',
			valeur: 'oui',
			source: { nature: 'PIECE', pieceId, page: 1 },
			etat: 'PROPOSEE',
			jour: '2026-09-18',
			afficheeLe: Date.now(),
			poseeLe: Date.now()
		});
		await ctx.db.insert('propositions', {
			organizationId,
			cible: creanceId,
			champ: 'secteur',
			valeur: 'TRANSPORT',
			source: { nature: 'REFERENTIEL', cleParametre: 'prescription.transport' },
			etat: 'RETENUE',
			jour: '2026-09-18',
			afficheeLe: Date.now(),
			decideeLe: Date.now(),
			decideePar: 'user_gerant',
			poseeLe: Date.now()
		});
		await ctx.db.insert('propositions', {
			organizationId,
			cible: debiteurId,
			champ: 'estCommercant',
			valeur: 'ok',
			source: { nature: 'REFERENTIEL', cleParametre: 'qualite.commercant' },
			etat: 'ECARTEE',
			jour: '2026-09-18',
			afficheeLe: Date.now(),
			decideeLe: Date.now(),
			decideePar: 'user_gerant',
			motifEcart: 'Ce n’est pas le bon débiteur.',
			poseeLe: Date.now()
		});

		// ── Les conversations : les trois portées, et les deux locuteurs ──────
		await ctx.db.insert('echangesCompagnon', {
			organizationId,
			fil: 'fil-1',
			portee: 'CREANCE',
			cible: creanceId,
			role: 'GERANT',
			texte: 'Sur quoi repose la date d’exigibilité ?',
			pastilles: [],
			mois: '2026-09',
			diteLe: Date.now()
		});
		await ctx.db.insert('echangesCompagnon', {
			organizationId,
			fil: 'fil-1',
			portee: 'CREANCE',
			cible: creanceId,
			role: 'COMPAGNON',
			texte: 'Elle est lue sur la facture, page 1.',
			// ⚠️ LES DEUX FORMES DU MÊME TOUR, ET C'EST DÉLIBÉRÉ. `pastilles` indexe
			// par RANG et `phrases` porte les bornes : les trois autres lignes de ce
			// fixture n'ont que la première, parce que les tours écrits avant que
			// les phrases le soient continuent de se lire. Le schéma doit valider
			// les deux, et un champ requis de plus les aurait rendus invalides.
			pastilles: [{ phrase: 0, source: { nature: 'PIECE', pieceId } }],
			phrases: [
				{ texte: 'Elle est lue sur la facture, page 1.', source: { nature: 'PIECE', pieceId } }
			],
			usage: { tokensIn: 8000, tokensOut: 600, cacheReadTokens: 3000, coutEstime: 0.04 },
			mois: '2026-09',
			diteLe: Date.now()
		});
		await ctx.db.insert('echangesCompagnon', {
			organizationId,
			fil: 'fil-2',
			portee: 'PORTEFEUILLE',
			cible: organizationId,
			role: 'GERANT',
			texte: 'Combien de clients sans SIREN ?',
			pastilles: [],
			mois: '2026-09',
			diteLe: Date.now()
		});
		await ctx.db.insert('echangesCompagnon', {
			organizationId,
			fil: 'fil-3',
			portee: 'DEBITEUR',
			cible: debiteurId,
			role: 'GERANT',
			texte: 'Que sait-on de son habitude de paiement ?',
			pastilles: [],
			mois: '2026-09',
			diteLe: Date.now()
		});

		// ── Les remises : les quatre états, terminaux compris ─────────────────
		await ctx.db.insert('remisesAuConseil', {
			organizationId,
			creanceId,
			decompteId,
			etat: 'PREPARE',
			consigneLe: Date.now()
		});
		await ctx.db.insert('remisesAuConseil', {
			organizationId,
			creanceId,
			decompteId,
			etat: 'REMIS',
			intervenantId,
			remisLe: '2026-09-22',
			attendu: 'Un avis sur ce que ces conditions ouvrent.',
			consigneLe: Date.now()
		});
		await ctx.db.insert('remisesAuConseil', {
			organizationId,
			creanceId,
			decompteId,
			etat: 'REVENU',
			intervenantId,
			remisLe: '2026-09-22',
			revenuLe: '2026-10-14',
			consigneLe: Date.now()
		});
		await ctx.db.insert('remisesAuConseil', {
			organizationId,
			creanceId,
			decompteId,
			etat: 'CLOS',
			remisLe: '2026-09-22',
			closLe: '2026-11-03',
			motifCloture: 'Le débiteur a payé.',
			consigneLe: Date.now()
		});

		return organizationId;
	});
}

/** Ce que les quatre tables détiennent encore pour cet établissement. */
async function compter(
	t: Harnais,
	organizationId: Id<'organizations'>
): Promise<Record<string, number>> {
	return await t.run(async (ctx) => {
		const journal = await ctx.db
			.query('journal')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		const propositions = await ctx.db
			.query('propositions')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		const conversations = await ctx.db
			.query('echangesCompagnon')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		const remises = await ctx.db
			.query('remisesAuConseil')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();
		return {
			journal: journal.length,
			propositions: propositions.length,
			conversations: conversations.length,
			remisesAuConseil: remises.length
		};
	});
}

/**
 * ⚠️ DÉLAI EXPLICITE, ET IL N'EST PAS COSMÉTIQUE.
 *
 * Chaque cas monte une instance ` + '`convex-test`' + ` complète — le schéma entier et
 * tous les modules Convex — puis pose une trentaine de lignes avant de purger.
 * Les cinq secondes par défaut de vitest n'y suffisent pas, et le symptôme est
 * trompeur : le test échoue en EXPIRANT, pas en trouvant une purge incomplète.
 * Quelqu'un qui le voit rouge cherche une régression qui n'existe pas, et finit
 * par désactiver la garde. C'est le même raisonnement, et le même chiffre, que
 * le balayage de ` + '`rgpd.test.ts`' + `.
 */
const DELAI = 30_000;

describe('les quatre tables du compagnon, cloisonnées et purgées', () => {
	it(
		'les vide entièrement, quel que soit l’état des lignes',
		async () => {
			const t = harnais();
			const organizationId = await poserEtablissement(t, 'Ateliers Martin');

			// Le fixture pose bien ce qu'il annonce. Sans cette vérification, une
			// purge qui efface tout d'un établissement VIDE passerait au vert : c'est
			// le mode de panne d'un test d'effacement.
			expect(await compter(t, organizationId)).toEqual(LIGNES_PAR_ETABLISSEMENT);

			await t.mutation(internal.rgpd.purgerEtablissement, { organizationId, passe: 0 });

			expect(await compter(t, organizationId)).toEqual(RIEN);
		},
		DELAI
	);

	it(
		'ne touche à rien chez l’établissement voisin',
		async () => {
			// C'est la barrière du cloisonnement, et elle compte plus que celle de
			// l'effacement : ce qu'un gérant a tapé dans une conversation, la valeur
			// qu'il a confirmée et le nom du conseil à qui il a confié son dossier
			// sont à lui seul. Rien n'est mutualisé entre clients, sans exception à
			// justifier.
			const t = harnais();
			const purge = await poserEtablissement(t, 'Ateliers Martin');
			const voisin = await poserEtablissement(t, 'Clinique des Ormes');

			await t.mutation(internal.rgpd.purgerEtablissement, { organizationId: purge, passe: 0 });

			expect(await compter(t, purge)).toEqual(RIEN);
			expect(await compter(t, voisin)).toEqual(LIGNES_PAR_ETABLISSEMENT);
			await t.run(async (ctx) => {
				expect(await ctx.db.get(voisin)).not.toBeNull();
			});
		},
		DELAI
	);

	it(
		'n’épargne pas les lignes que le produit ne supprime jamais',
		async () => {
			// Le journal est en APPEND SEUL et une proposition ÉCARTÉE est marquée,
			// jamais retirée : ce sont les deux seules lignes de ces quatre tables
			// qu'aucun geste du produit n'efface. Une purge écrite trop vite les
			// épargnerait, et le manquement serait invisible — l'établissement a
			// disparu de l'interface, donc tout a l'air fait.
			const t = harnais();
			const organizationId = await poserEtablissement(t, 'Ateliers Martin');

			await t.mutation(internal.rgpd.purgerEtablissement, { organizationId, passe: 0 });

			await t.run(async (ctx) => {
				const journal = await ctx.db
					.query('journal')
					.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
					.collect();
				expect(journal).toHaveLength(0);
				const ecartees = await ctx.db
					.query('propositions')
					.withIndex('by_org_and_etat', (q) =>
						q.eq('organizationId', organizationId).eq('etat', 'ECARTEE')
					)
					.collect();
				expect(ecartees).toHaveLength(0);
			});
		},
		DELAI
	);
});
