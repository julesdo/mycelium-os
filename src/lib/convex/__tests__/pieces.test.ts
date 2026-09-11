/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * LES PIÈCES JUSTIFICATIVES, ENFIN ÉCRITES — module 1.2.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE CES TESTS FIGENT, ET POURQUOI C'ÉTAIT TOTAL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La table `pieces` était LUE par les deux moteurs et ÉCRITE nulle part.
 * L'arithmétique rend la conséquence totale : les quatre conditions légales
 * valent 12 points sur 20, le seuil de qualification est à 0,75 — soit 15 — et
 * les points documentaires sont les seuls à combler l'écart.
 *
 * Une créance parfaite en droit plafonnait donc à 0,60. AUCUNE ne pouvait être
 * éligible, quoi que fasse le créancier. Le dernier test de ce fichier le
 * mesure, parce qu'un commentaire ne se vérifie pas.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;
const AUJOURDHUI = '2026-09-03';

interface Decor {
	organizationId: Id<'organizations'>;
	debiteurId: Id<'debiteurs'>;
	factureId: Id<'facturesVente'>;
	storageId: Id<'_storage'>;
}

async function poser(t: ReturnType<typeof convexTest>, nomOrg = 'Thumbbb Agency'): Promise<Decor> {
	const storageId = await t.run(async (ctx) =>
		ctx.storage.store(new Blob(['bon de livraison'], { type: 'application/pdf' }))
	);

	return await t.run(async (ctx) => {
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
		const factureId = await ctx.db.insert('facturesVente', {
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
		return { organizationId, debiteurId, factureId, storageId };
	});
}

describe('déposer une pièce', () => {
	it(
		'l’enregistre SANS la classer, et met sa lecture en attente',
		async () => {
			// ⚠️ « INDETERMINE » PLUTÔT QU'UN TYPE PAR DÉFAUT. Le type entre dans le
			// score de solidité, qui décide si une procédure s'engage. Poser
			// « BON_DE_LIVRAISON » au hasard ferait franchir un seuil sur un
			// document que personne n'a lu.
			const t = convexTest(schema, modules);
			const decor = await poser(t);

			const pieceId = await t.mutation(internal.recouvrement.pieces.enregistrerInterne, {
				organizationId: decor.organizationId,
				storageId: decor.storageId,
				filename: 'BL-118.pdf',
				mimeType: 'application/pdf',
				debiteurId: decor.debiteurId,
				factureIds: [decor.factureId]
			});

			const piece = await t.run(async (ctx) => (await ctx.db.get(pieceId))!);
			expect(piece.type).toBe('INDETERMINE');
			expect(piece.statut).toBe('EN_LECTURE');
			expect(piece.debiteurId).toBe(decor.debiteurId);
		},
		DELAI_CONVEX
	);

	it(
		'la relie aux factures qu’elle soutient',
		async () => {
			const t = convexTest(schema, modules);
			const decor = await poser(t);

			const pieceId = await t.mutation(internal.recouvrement.pieces.enregistrerInterne, {
				organizationId: decor.organizationId,
				storageId: decor.storageId,
				filename: 'BL-118.pdf',
				mimeType: 'application/pdf',
				factureIds: [decor.factureId]
			});

			const liaisons = await t.run(async (ctx) =>
				ctx.db
					.query('piecesFactures')
					.withIndex('by_piece', (q) => q.eq('pieceId', pieceId))
					.collect()
			);
			expect(liaisons).toHaveLength(1);
			expect(liaisons[0]!.factureId).toBe(decor.factureId);
		},
		DELAI_CONVEX
	);

	it(
		'refuse une facture d’un autre établissement',
		async () => {
			const t = convexTest(schema, modules);
			const mien = await poser(t);
			const autre = await poser(t, 'Clinique des Ormes');

			await expect(
				t.mutation(internal.recouvrement.pieces.enregistrerInterne, {
					organizationId: mien.organizationId,
					storageId: mien.storageId,
					filename: 'BL-118.pdf',
					mimeType: 'application/pdf',
					factureIds: [autre.factureId]
				})
			).rejects.toThrow();
		},
		DELAI_CONVEX
	);
});

describe('ce que la lecture en rend', () => {
	async function deposee(t: ReturnType<typeof convexTest>) {
		const decor = await poser(t);
		const pieceId = await t.mutation(internal.recouvrement.pieces.enregistrerInterne, {
			organizationId: decor.organizationId,
			storageId: decor.storageId,
			filename: 'BL-118.pdf',
			mimeType: 'application/pdf',
			debiteurId: decor.debiteurId,
			factureIds: [decor.factureId]
		});
		return { decor, pieceId };
	}

	it(
		'classe la pièce et garde le constat, mot pour mot',
		async () => {
			const t = convexTest(schema, modules);
			const { pieceId } = await deposee(t);

			await t.mutation(internal.recouvrement.pieces.consignerLectureInterne, {
				pieceId,
				type: 'BON_DE_LIVRAISON',
				reference: 'BL-2024-118',
				dateDocument: '2026-02-14',
				reserves: null,
				constat: 'Ce document est un bon de livraison, n° BL-2024-118, du 2026-02-14.'
			});

			const piece = await t.run(async (ctx) => (await ctx.db.get(pieceId))!);
			expect(piece.type).toBe('BON_DE_LIVRAISON');
			expect(piece.statut).toBe('LUE');
			expect(piece.constat).toMatch(/bon de livraison/i);
		},
		DELAI_CONVEX
	);

	it(
		'laisse INDETERMINE une pièce qu’elle n’a pas su lire',
		async () => {
			const t = convexTest(schema, modules);
			const { pieceId } = await deposee(t);

			await t.mutation(internal.recouvrement.pieces.consignerLectureInterne, {
				pieceId,
				type: null,
				reference: null,
				dateDocument: null,
				reserves: null,
				constat: 'Ce document n’a pas pu être lu.'
			});

			const piece = await t.run(async (ctx) => (await ctx.db.get(pieceId))!);
			expect(piece.type).toBe('INDETERMINE');
			expect(piece.statut).toBe('A_CLASSER');
		},
		DELAI_CONVEX
	);

	it(
		'garde la réserve trouvée sur un bon de livraison',
		async () => {
			// ⚠️ UNE RÉSERVE EST UN FAIT DE LITIGE. Le questionnaire de
			// qualification demande précisément « une réserve portée sur un bon de
			// livraison » : la lire et la jeter laisserait le gérant répondre
			// « non » de bonne foi sur un document qu'on a lu à sa place.
			const t = convexTest(schema, modules);
			const { pieceId } = await deposee(t);

			await t.mutation(internal.recouvrement.pieces.consignerLectureInterne, {
				pieceId,
				type: 'BON_DE_LIVRAISON',
				reference: 'BL-2024-118',
				dateDocument: '2026-02-14',
				reserves: 'Deux colis manquants, signalés à la livraison.',
				constat: 'Une réserve y est portée.'
			});

			const piece = await t.run(async (ctx) => (await ctx.db.get(pieceId))!);
			expect(piece.reserves).toBe('Deux colis manquants, signalés à la livraison.');
		},
		DELAI_CONVEX
	);

	it(
		'le gérant corrige un classement, et ça se voit',
		async () => {
			const t = convexTest(schema, modules);
			const { decor, pieceId } = await deposee(t);

			await t.mutation(internal.recouvrement.pieces.classerInterne, {
				organizationId: decor.organizationId,
				pieceId,
				type: 'BON_DE_COMMANDE'
			});

			const piece = await t.run(async (ctx) => (await ctx.db.get(pieceId))!);
			expect(piece.type).toBe('BON_DE_COMMANDE');
			// Classée à la main : le statut le dit, pour qu'on sache d'où vient le
			// classement quand on relit le dossier.
			expect(piece.statut).toBe('CLASSEE_MAIN');
		},
		DELAI_CONVEX
	);
});

describe('ce que la pièce change au dossier', () => {
	it(
		'fait franchir le seuil de qualification, qui était inatteignable',
		async () => {
			// ⚠️ LE TEST QUI MESURE LE DÉFAUT. Sans pièce, une créance parfaite en
			// droit vaut 12/20 = 0,60, sous un seuil à 0,75. Un bon de livraison
			// vaut 3 points : 15/20 = 0,75. C'est exactement la marche qui
			// manquait, et rien ne permettait de la franchir.
			const t = convexTest(schema, modules);
			const decor = await poser(t);

			const creanceId = await t.mutation(internal.recouvrement.creances.creerCreance, {
				organizationId: decor.organizationId,
				factureIds: [decor.factureId],
				aujourdHui: AUJOURDHUI
			});
			for (const cle of [
				'CONTESTATION_ECRITE',
				'REFUS_RECEPTION',
				'AVOIR_RECLAME',
				'PENALITES_OPPOSEES',
				'INSTANCE_EN_COURS'
			] as const) {
				await t.mutation(internal.recouvrement.creances.declarerFaitLitige, {
					creanceId,
					cle,
					reponse: 'NON',
					aujourdHui: AUJOURDHUI
				});
			}

			const avant = await t.run(async (ctx) => (await ctx.db.get(creanceId))!.score!);
			expect(avant).toBeCloseTo(0.6, 5);

			const pieceId = await t.mutation(internal.recouvrement.pieces.enregistrerInterne, {
				organizationId: decor.organizationId,
				storageId: decor.storageId,
				filename: 'BL-118.pdf',
				mimeType: 'application/pdf',
				factureIds: [decor.factureId]
			});
			await t.mutation(internal.recouvrement.pieces.consignerLectureInterne, {
				pieceId,
				type: 'BON_DE_LIVRAISON',
				reference: 'BL-2024-118',
				dateDocument: '2026-02-14',
				reserves: null,
				constat: 'Ce document est un bon de livraison.'
			});

			// Le score se recalcule à la lecture de l'écran ; on le reconstitue par
			// la même porte que lui.
			await t.mutation(internal.recouvrement.creances.declarerFaitLitige, {
				creanceId,
				cle: 'RECONNAISSANCE_ECRITE',
				reponse: 'NON',
				aujourdHui: AUJOURDHUI
			});

			const apres = await t.run(async (ctx) => (await ctx.db.get(creanceId))!.score!);
			expect(apres).toBeCloseTo(0.75, 5);
		},
		DELAI_CONVEX
	);

	it(
		'une pièce INDETERMINE ne compte dans aucun critère',
		async () => {
			// Elle est en base, visible, et ne pèse rien : c'est ce qui distingue
			// « déposée » de « lue ».
			const t = convexTest(schema, modules);
			const decor = await poser(t);

			const creanceId = await t.mutation(internal.recouvrement.creances.creerCreance, {
				organizationId: decor.organizationId,
				factureIds: [decor.factureId],
				aujourdHui: AUJOURDHUI
			});
			const avant = await t.run(async (ctx) => (await ctx.db.get(creanceId))!.score!);

			await t.mutation(internal.recouvrement.pieces.enregistrerInterne, {
				organizationId: decor.organizationId,
				storageId: decor.storageId,
				filename: 'mystere.pdf',
				mimeType: 'application/pdf',
				factureIds: [decor.factureId]
			});

			await t.mutation(internal.recouvrement.creances.declarerFaitLitige, {
				creanceId,
				cle: 'CONTESTATION_ECRITE',
				reponse: 'INCONNU',
				aujourdHui: AUJOURDHUI
			});
			const apres = await t.run(async (ctx) => (await ctx.db.get(creanceId))!.score!);
			expect(apres).toBe(avant);
		},
		DELAI_CONVEX
	);
});
