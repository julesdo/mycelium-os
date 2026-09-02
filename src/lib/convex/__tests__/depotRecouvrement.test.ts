/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';

/**
 * Le dépôt d'un export comptable, de bout en bout : un fichier entre, des
 * factures et des règlements en sortent, et l'écran voit ce qui se passe.
 *
 * CE QUI EST TESTÉ ICI ET NULLE PART AILLEURS : le raccordement. Le parseur est
 * couvert par ses propres tests, la mutation d'enregistrement aussi. Ce qui
 * reste — lire le fichier du stockage, choisir le bon parseur, publier un bilan
 * qui dit la vérité, échouer proprement — n'existe qu'ici.
 *
 * LE CHEMIN `FACTURE_DEPOSEE` N'EST PAS TESTÉ : il appelle le modèle. Comme les
 * deux tests d'intégration existants, il se vérifie à la main contre l'API
 * réelle, pas dans la suite.
 */

/**
 * Le premier appel à l'action charge le bundle Node (`"use node"`), ce qui
 * dépasse le délai par défaut de 5 s de Vitest. Les suivants sont instantanés.
 * Le délai porte donc sur chaque test qui invoque l'action, plutôt que d'être
 * relevé globalement — un test lent ailleurs doit rester un signal.
 */
const DELAI_ACTION = 30_000;

const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const ENTETE_FEC = [
	'JournalCode',
	'JournalLib',
	'EcritureNum',
	'EcritureDate',
	'CompteNum',
	'CompteLib',
	'CompAuxNum',
	'CompAuxLib',
	'PieceRef',
	'PieceDate',
	'EcritureLib',
	'Debit',
	'Credit',
	'EcritureLet',
	'DateLet',
	'ValidDate',
	'Montantdevise',
	'Idevise'
].join('\t');

/** Une vente équilibrée : la créance, le produit, la TVA. Puis un acompte. */
const FEC_REEL = [
	ENTETE_FEC,
	'VE\tVentes\tVE0001\t20260415\t411DURAND\tClients\t411DURAND\tFournitures Durand\tFA-2026-0042\t20260415\tFacture\t12000,00\t0,00\t\t\t20260415\t\t',
	'VE\tVentes\tVE0001\t20260415\t706000\tPrestations\t\t\tFA-2026-0042\t20260415\tFacture\t0,00\t10000,00\t\t\t20260415\t\t',
	'VE\tVentes\tVE0001\t20260415\t445710\tTVA\t\t\tFA-2026-0042\t20260415\tFacture\t0,00\t2000,00\t\t\t20260415\t\t',
	'BQ\tBanque\tBQ0007\t20260610\t411DURAND\tClients\t411DURAND\tFournitures Durand\tFA-2026-0042\t20260610\tReglement\t0,00\t4000,00\tA\t20260610\t20260610\t\t'
].join('\n');

async function deposer(
	t: ReturnType<typeof convexTest>,
	contenu: string,
	filename = 'export.txt'
): Promise<{ organizationId: Id<'organizations'>; importId: Id<'importsRecouvrement'> }> {
	const organizationId = await t.run(async (ctx) =>
		ctx.db.insert('organizations', { name: 'Thumbbb Agency', createdAt: Date.now() })
	);

	const storageId = await t.run(async (ctx) => ctx.storage.store(new Blob([contenu])));

	const importId = await t.run(async (ctx) =>
		ctx.db.insert('importsRecouvrement', {
			organizationId,
			storageId,
			filename,
			mimeType: 'text/plain',
			mode: 'EXPORT_COMPTABLE',
			statut: 'EN_ATTENTE',
			deposeLe: Date.now()
		})
	);

	return { organizationId, importId };
}

describe('traitement d’un export comptable', () => {
	it('crée les factures, les règlements et le débiteur', async () => {
		const t = convexTest(schema, modules);
		const { importId } = await deposer(t, FEC_REEL);

		await t.action(internal.recouvrement.depot.traiterImport, { importId });

		await t.run(async (ctx) => {
			expect(await ctx.db.query('facturesVente').collect()).toHaveLength(1);
			expect(await ctx.db.query('reglements').collect()).toHaveLength(1);
			expect(await ctx.db.query('debiteurs').collect()).toHaveLength(1);
		});
	}, DELAI_ACTION);

	it('publie un bilan qui dit ce qui a été écarté à bon droit', async () => {
		const t = convexTest(schema, modules);
		const { importId } = await deposer(t, FEC_REEL);

		await t.action(internal.recouvrement.depot.traiterImport, { importId });

		await t.run(async (ctx) => {
			const suivi = (await ctx.db.get(importId))!;
			expect(suivi.statut).toBe('TERMINE');
			expect(suivi.bilan!.format).toBe('FEC');
			expect(suivi.bilan!.facturesCreees).toBe(1);
			expect(suivi.bilan!.reglementsCrees).toBe(1);
			// Le produit et la TVA : écartés, et comptés.
			expect(suivi.bilan!.horsPerimetre).toBe(2);
			expect(suivi.termineLe).toBeTypeOf('number');
		});
	}, DELAI_ACTION);

	it('remonte les lignes illisibles au lieu de les taire', async () => {
		const t = convexTest(schema, modules);
		const avecErreur = [
			FEC_REEL,
			'VE\tVentes\tVE0002\t20260420\t411MARTIN\tClients\t411MARTIN\tAteliers Martin\tFA-2026-0043\t20260420\tFacture\tdouze mille\t0,00\t\t\t20260420\t\t'
		].join('\n');
		const { importId } = await deposer(t, avecErreur);

		await t.action(internal.recouvrement.depot.traiterImport, { importId });

		await t.run(async (ctx) => {
			const suivi = (await ctx.db.get(importId))!;
			expect(suivi.bilan!.ignoreesTotal).toBe(1);
			expect(suivi.bilan!.ignorees[0]!.raison).toMatch(/montant/i);
		});
	}, DELAI_ACTION);

	it('échoue proprement sur un fichier qui n’est pas un export', async () => {
		const t = convexTest(schema, modules);
		const { importId } = await deposer(t, 'bonjour, ceci n’est pas un export');

		await t.action(internal.recouvrement.depot.traiterImport, { importId });

		await t.run(async (ctx) => {
			const suivi = (await ctx.db.get(importId))!;
			expect(suivi.statut).toBe('ECHOUE');
			expect(suivi.erreur).toMatch(/format/i);
			// Un échec ne laisse rien derrière lui.
			expect(await ctx.db.query('facturesVente').collect()).toHaveLength(0);
		});
	}, DELAI_ACTION);

	it('ne fait rien deux fois si le même fichier est rejoué', async () => {
		const t = convexTest(schema, modules);
		const { importId } = await deposer(t, FEC_REEL);

		await t.action(internal.recouvrement.depot.traiterImport, { importId });
		await t.action(internal.recouvrement.depot.traiterImport, { importId });

		await t.run(async (ctx) => {
			expect(await ctx.db.query('facturesVente').collect()).toHaveLength(1);
			expect(await ctx.db.query('reglements').collect()).toHaveLength(1);
		});
	}, DELAI_ACTION);

	it('cloisonne : deux organisations déposant le même export ne se voient pas', async () => {
		const t = convexTest(schema, modules);
		const premier = await deposer(t, FEC_REEL);
		const second = await deposer(t, FEC_REEL);

		await t.action(internal.recouvrement.depot.traiterImport, { importId: premier.importId });
		await t.action(internal.recouvrement.depot.traiterImport, { importId: second.importId });

		await t.run(async (ctx) => {
			const factures = await ctx.db.query('facturesVente').collect();
			expect(factures).toHaveLength(2);
			expect(new Set(factures.map((f) => f.organizationId)).size).toBe(2);
		});
	}, DELAI_ACTION);
});

describe('ce que l’écran voit pendant le traitement', () => {
	it('passe par une étape lisible, pas seulement par un statut', async () => {
		const t = convexTest(schema, modules);
		const { importId } = await deposer(t, FEC_REEL);

		await t.action(internal.recouvrement.depot.traiterImport, { importId });

		await t.run(async (ctx) => {
			const suivi = (await ctx.db.get(importId))!;
			// L'étape finale reste affichée : un écran qui se vide à la fin
			// laisse croire qu'il ne s'est rien passé.
			expect(suivi.etape).toBeTruthy();
			expect(suivi.etape!.length).toBeGreaterThan(3);
		});
	}, DELAI_ACTION);
});
